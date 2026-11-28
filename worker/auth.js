import {
  generateSessionToken,
  hashPin,
  normalizeUsername,
  sha256Hex,
  timingSafeEqualStrings,
  validatePin,
  verifyPin,
} from "./crypto.js";
import { hydrateUserState, sanitizeClientDate } from "./db.js";

const SESSION_COOKIE_NAME = "tq_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LOCKOUT_WINDOW_MS = 10 * 60 * 1000;
const MAX_USER_FAILURES = 5;
const MAX_IP_FAILURES = 60;
const MAX_INVITE_FAILURES = 10;
const MAX_REGISTRATIONS_PER_IP = 30;

export function isInviteRequired(env) {
  return Boolean(env?.SIGNUP_CODE && String(env.SIGNUP_CODE).trim().length > 0);
}

export function getClientIp(request) {
  // Trust only Cloudflare's verified edge header; fall back to "local" during local dev
  const cfIp = request.headers.get("CF-Connecting-IP");
  if (cfIp && cfIp.trim()) return cfIp.trim();
  return "local";
}

export function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (key) out[key] = val;
  }
  return out;
}

export function buildSessionCookie(token, requestUrl, maxAgeSeconds = Math.floor(SESSION_TTL_MS / 1000)) {
  const isHttps = String(requestUrl || "").startsWith("https://");
  const attrs = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isHttps) attrs.push("Secure");
  return attrs.join("; ");
}

export function buildClearSessionCookie(requestUrl) {
  return buildSessionCookie("", requestUrl, 0);
}

async function getPreviousSessionHash(request) {
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token || token.length < 16) return null;
  return sha256Hex(token);
}

async function checkThrottle(db, keys) {
  const now = Date.now();
  let longestWaitMs = 0;

  const stmts = keys.map((key) =>
    db
      .prepare("SELECT fail_count, window_start, locked_until FROM login_attempts WHERE key = ?")
      .bind(key)
  );
  const results = await db.batch(stmts);

  for (const res of results) {
    const row = res?.results?.[0];
    if (row && row.locked_until > now) {
      longestWaitMs = Math.max(longestWaitMs, row.locked_until - now);
    }
  }
  return longestWaitMs;
}

function buildAtomicAttemptStmt(db, key, maxFailures, now) {
  const lockTarget = now + LOCKOUT_WINDOW_MS;
  return db
    .prepare(
      `INSERT INTO login_attempts (key, fail_count, window_start, locked_until)
       VALUES (?, 1, ?, CASE WHEN 1 >= ? THEN ? ELSE 0 END)
       ON CONFLICT(key) DO UPDATE SET
         fail_count = CASE
           WHEN ? - login_attempts.window_start > ? THEN 1
           ELSE login_attempts.fail_count + 1
         END,
         window_start = CASE
           WHEN ? - login_attempts.window_start > ? THEN ?
           ELSE login_attempts.window_start
         END,
         locked_until = CASE
           WHEN (
             CASE
               WHEN ? - login_attempts.window_start > ? THEN 1
               ELSE login_attempts.fail_count + 1
             END
           ) >= ? THEN ?
           WHEN ? - login_attempts.window_start > ? THEN 0
           ELSE login_attempts.locked_until
         END`
    )
    .bind(
      key,
      now,
      maxFailures,
      lockTarget,
      now,
      LOCKOUT_WINDOW_MS,
      now,
      LOCKOUT_WINDOW_MS,
      now,
      now,
      LOCKOUT_WINDOW_MS,
      maxFailures,
      lockTarget,
      now,
      LOCKOUT_WINDOW_MS
    );
}

export async function getAuthenticatedSession(request, env) {
  const tokenHash = await getPreviousSessionHash(request);
  if (!tokenHash) return null;

  const row = await env.DB.prepare(
    `SELECT s.token_hash, s.expires_at, u.id AS user_id, u.username AS username
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?`
  )
    .bind(tokenHash)
    .first();

  if (!row) return null;

  const nowIso = new Date().toISOString();
  if (row.expires_at <= nowIso) {
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
    return null;
  }

  return {
    tokenHash,
    user: {
      id: row.user_id,
      username: row.username,
    },
  };
}

export async function registerUser(request, env, body) {
  const ip = getClientIp(request);
  const inviteThrottleKey = `reg_invite:${ip}`;
  const regRateKey = `reg_rate:${ip}`;

  const waitMs = await checkThrottle(env.DB, [inviteThrottleKey, regRateKey]);
  if (waitMs > 0) {
    const mins = Math.max(1, Math.ceil(waitMs / 60000));
    return {
      ok: false,
      status: 429,
      retryAfterSeconds: Math.ceil(waitMs / 1000),
      error: `Too many sign-up tries! Wait about ${mins} minute${mins === 1 ? "" : "s"} and try again.`,
    };
  }

  const userCheck = normalizeUsername(body?.username);
  if (!userCheck.ok) {
    return { ok: false, status: 400, error: userCheck.error };
  }

  const pinCheck = validatePin(body?.pin);
  if (!pinCheck.ok) {
    return { ok: false, status: 400, error: pinCheck.error };
  }

  if (isInviteRequired(env)) {
    const validInvite = await timingSafeEqualStrings(
      String(env.SIGNUP_CODE).trim(),
      String(body?.inviteCode || "").trim()
    );
    if (!validInvite) {
      await buildAtomicAttemptStmt(env.DB, inviteThrottleKey, MAX_INVITE_FAILURES, Date.now()).run();
      return {
        ok: false,
        status: 403,
        error: "Invalid family/class invite code. Ask your parent or teacher for the invite code!",
      };
    }
  }

  const existing = await env.DB.prepare(
    "SELECT id FROM users WHERE username_lower = ?"
  )
    .bind(userCheck.usernameLower)
    .first();
  if (existing) {
    return {
      ok: false,
      status: 409,
      error: "That username is already taken! Try adding a number or nickname.",
    };
  }

  const userId = crypto.randomUUID();
  const { hashHex, saltHex, iterations } = await hashPin(pinCheck.pin);
  const sessionToken = generateSessionToken();
  const sessionTokenHash = await sha256Hex(sessionToken);
  const prevSessionHash = await getPreviousSessionHash(request);

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + SESSION_TTL_MS).toISOString();
  const todayStr = sanitizeClientDate(body?.clientDate);

  const stmts = [
    env.DB.prepare(
      `INSERT INTO users (
         id, username, username_lower, pin_hash, pin_salt, pin_iterations,
         daily_date, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      userId,
      userCheck.username,
      userCheck.usernameLower,
      hashHex,
      saltHex,
      iterations,
      todayStr,
      nowIso,
      nowIso
    ),
    env.DB.prepare(
      "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
    ).bind(sessionTokenHash, userId, nowIso, expiresAt),
    buildAtomicAttemptStmt(env.DB, regRateKey, MAX_REGISTRATIONS_PER_IP, nowMs),
    env.DB.prepare("DELETE FROM login_attempts WHERE key = ?").bind(inviteThrottleKey),
    env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(nowIso),
  ];

  if (prevSessionHash) {
    stmts.push(env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(prevSessionHash));
  }

  try {
    await env.DB.batch(stmts);
  } catch (err) {
    const msg = String(err?.message || err);
    if (msg.toLowerCase().includes("unique")) {
      return {
        ok: false,
        status: 409,
        error: "That username is already taken! Try adding a number or nickname.",
      };
    }
    throw err;
  }

  const hydrated = await hydrateUserState(env.DB, userId, todayStr);
  return {
    ok: true,
    sessionToken,
    user: hydrated.user,
    state: hydrated.state,
  };
}

export async function loginUser(request, env, body) {
  const userCheck = normalizeUsername(body?.username);
  if (!userCheck.ok) {
    return { ok: false, status: 400, error: userCheck.error };
  }

  const pinCheck = validatePin(body?.pin);
  if (!pinCheck.ok) {
    return { ok: false, status: 400, error: pinCheck.error };
  }

  const ipKey = `ip:${getClientIp(request)}`;
  const userKey = `user:${userCheck.usernameLower}`;
  const waitMs = await checkThrottle(env.DB, [userKey, ipKey]);
  if (waitMs > 0) {
    const mins = Math.max(1, Math.ceil(waitMs / 60000));
    return {
      ok: false,
      status: 429,
      retryAfterSeconds: Math.ceil(waitMs / 1000),
      error: `Too many wrong PIN guesses! Wait about ${mins} minute${mins === 1 ? "" : "s"} and try again.`,
    };
  }

  const userRow = await env.DB.prepare(
    "SELECT id, username, pin_hash, pin_salt, pin_iterations FROM users WHERE username_lower = ?"
  )
    .bind(userCheck.usernameLower)
    .first();

  let valid = false;
  if (userRow) {
    valid = await verifyPin(
      pinCheck.pin,
      userRow.pin_hash,
      userRow.pin_salt,
      userRow.pin_iterations
    );
  } else {
    // Perform equivalent PBKDF2 work so non-existent usernames don't short-circuit visibly
    await hashPin(pinCheck.pin);
  }

  const nowMs = Date.now();
  if (!valid || !userRow) {
    await env.DB.batch([
      buildAtomicAttemptStmt(env.DB, userKey, MAX_USER_FAILURES, nowMs),
      buildAtomicAttemptStmt(env.DB, ipKey, MAX_IP_FAILURES, nowMs),
    ]);
    return {
      ok: false,
      status: 401,
      error: "Wrong username or PIN! Double-check both and try again.",
    };
  }

  // Re-check throttle atomically right after PBKDF2 to close concurrent burst windows
  const postWaitMs = await checkThrottle(env.DB, [userKey, ipKey]);
  if (postWaitMs > 0) {
    const mins = Math.max(1, Math.ceil(postWaitMs / 60000));
    return {
      ok: false,
      status: 429,
      retryAfterSeconds: Math.ceil(postWaitMs / 1000),
      error: `Too many wrong PIN guesses! Wait about ${mins} minute${mins === 1 ? "" : "s"} and try again.`,
    };
  }

  const sessionToken = generateSessionToken();
  const sessionTokenHash = await sha256Hex(sessionToken);
  const prevSessionHash = await getPreviousSessionHash(request);
  const nowIso = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + SESSION_TTL_MS).toISOString();

  const loginStmts = [
    env.DB.prepare("DELETE FROM login_attempts WHERE key = ?").bind(userKey),
    env.DB.prepare(
      "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
    ).bind(sessionTokenHash, userRow.id, nowIso, expiresAt),
    env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(nowIso),
    env.DB.prepare(
      "DELETE FROM login_attempts WHERE locked_until <= ? AND (? - window_start) > ?"
    ).bind(nowMs, nowMs, LOCKOUT_WINDOW_MS),
  ];
  if (prevSessionHash) {
    loginStmts.push(env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(prevSessionHash));
  }
  await env.DB.batch(loginStmts);

  const todayStr = sanitizeClientDate(body?.clientDate);
  const hydrated = await hydrateUserState(env.DB, userRow.id, todayStr);

  return {
    ok: true,
    sessionToken,
    user: hydrated.user,
    state: hydrated.state,
  };
}

export async function logoutSession(request, env) {
  const tokenHash = await getPreviousSessionHash(request);
  if (tokenHash) {
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
  }
}
