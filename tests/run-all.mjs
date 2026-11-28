import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { ALL_NODES, ORDERED_NODE_IDS, UNITS } from "../js/curriculum/index.js";
import { isLessonUnlocked, recordLessonCompletion } from "../js/state/progress.js";
import {
  clearStoredState,
  createDefaultState,
  getRecentUsernames,
  getScopedStorageKey,
  hasMeaningfulProgress,
  loadState,
  rememberUsername,
  saveState,
  STORAGE_KEY,
} from "../js/state/store.js";
import { verifyMission } from "../js/verifier/checker.js";
import { buildResetPinSql, parseResetPinArgs } from "../scripts/reset-pin.mjs";
import { validatePin } from "../worker/crypto.js";
import workerDefault, { handleApiRequest } from "../worker/index.js";

// Lightweight Cloudflare D1 adapter backed by real SQLite (node:sqlite)
class SqliteD1Statement {
  constructor(sqlite, sql, params = []) {
    this.sqlite = sqlite;
    this.sql = sql;
    this.params = params;
  }
  bind(...params) {
    return new SqliteD1Statement(this.sqlite, this.sql, params);
  }
  _execSelect() {
    const stmt = this.sqlite.prepare(this.sql);
    return stmt.all(...this.params);
  }
  async first(colName) {
    const rows = this._execSelect();
    if (!rows || rows.length === 0) return null;
    if (colName) return rows[0][colName];
    return rows[0];
  }
  async all() {
    const results = this._execSelect();
    return { results, success: true, meta: {} };
  }
  async run() {
    const stmt = this.sqlite.prepare(this.sql);
    const info = stmt.run(...this.params);
    return {
      success: true,
      meta: {
        changes: Number(info.changes || 0),
        last_row_id: Number(info.lastInsertRowid || 0),
      },
    };
  }
}

class SqliteD1Database {
  constructor(schemaSql) {
    this.sqlite = new DatabaseSync(":memory:");
    this.sqlite.exec("PRAGMA foreign_keys = ON;");
    this.sqlite.exec(schemaSql);
  }
  prepare(sql) {
    return new SqliteD1Statement(this.sqlite, sql);
  }
  async batch(statements) {
    this.sqlite.exec("BEGIN");
    try {
      const out = [];
      for (const s of statements) {
        const trimmed = s.sql.trim().toUpperCase();
        if (trimmed.startsWith("SELECT")) {
          out.push(await s.all());
        } else {
          out.push(await s.run());
        }
      }
      this.sqlite.exec("COMMIT");
      return out;
    } catch (err) {
      this.sqlite.exec("ROLLBACK");
      throw err;
    }
  }
}

const schemaSql = fs.readFileSync(
  path.resolve(import.meta.dirname, "../migrations/0001_initial.sql"),
  "utf8"
);

function makeMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function extractSessionCookie(res) {
  const raw = res.headers.get("Set-Cookie");
  if (!raw) return "";
  return raw.split(";")[0];
}

async function callApi(
  env,
  pathname,
  { method = "GET", body = undefined, cookie = "", headers = {}, rawBody = undefined } = {}
) {
  const reqHeaders = { ...headers };
  if (cookie) reqHeaders.Cookie = cookie;
  let bodyStr = rawBody;
  if (body !== undefined) {
    if (!("Content-Type" in reqHeaders)) {
      reqHeaders["Content-Type"] = "application/json";
    }
    bodyStr = JSON.stringify(body);
  }
  const req = new Request(`https://turtlequest.example${pathname}`, {
    method,
    headers: reqHeaders,
    body: bodyStr,
  });
  const res = await handleApiRequest(req, env);
  const data = await res.json();
  return { res, data };
}

function isoDateOffset(daysDelta) {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysDelta));
  return d.toISOString().slice(0, 10);
}

let passed = 0;
async function runTest(name, fn) {
  await fn();
  passed++;
  console.log(`PASS: ${name}`);
}

await runTest("Curriculum structure sanity & PIN whitespace validation", async () => {
  assert.equal(UNITS.length, 6);
  assert.equal(ORDERED_NODE_IDS.length, 36);
  assert.equal(isLessonUnlocked(createDefaultState(), ORDERED_NODE_IDS[0], ORDERED_NODE_IDS), true);
  assert.equal(isLessonUnlocked(createDefaultState(), "nonexistent", ORDERED_NODE_IDS), false);
  const u1 = ALL_NODES.find((n) => n.id === "u1-l1");
  assert.equal(verifyMission(u1, { ok: false }).passed, false);

  assert.equal(validatePin("    ").ok, false);
  assert.equal(validatePin(" 1234").ok, false);
  assert.equal(validatePin("1234 ").ok, false);
  assert.equal(validatePin("1234").ok, true);
});

await runTest("Store scoping & guest progress detection", async () => {
  const mem = makeMemoryStorage();
  assert.equal(getScopedStorageKey(null), STORAGE_KEY);
  assert.equal(getScopedStorageKey("user-123"), "turtlequest_v1:user:user-123");

  const empty = loadState(mem, STORAGE_KEY);
  assert.equal(hasMeaningfulProgress(empty), false);

  saveState(
    { ...empty, xp: 20, completedLessons: { "u1-l1": { passed: true, bonus: false } } },
    mem,
    STORAGE_KEY
  );
  assert.equal(hasMeaningfulProgress(loadState(mem, STORAGE_KEY)), true);
  assert.equal(hasMeaningfulProgress(loadState(mem, getScopedStorageKey("user-123"))), false);

  clearStoredState(mem, STORAGE_KEY);
  assert.equal(hasMeaningfulProgress(loadState(mem, STORAGE_KEY)), false);

  rememberUsername("Maya", mem);
  rememberUsername("Leo", mem);
  rememberUsername("maya", mem);
  assert.deepEqual(getRecentUsernames(mem), ["maya", "Leo"]);
});

await runTest("Streak oscillation protection in progress.js", async () => {
  const today = isoDateOffset(0);
  const yesterday = isoDateOffset(-1);
  let state = createDefaultState();

  state = recordLessonCompletion(state, "u1-t0", { xpReward: 15, bonusReward: 0, todayStr: today }).state;
  assert.equal(state.streak, 1);
  assert.equal(state.lastActiveDate, today);

  // Replaying with yesterday must NOT rewind lastActiveDate or allow inflating streak
  state = recordLessonCompletion(state, "u1-t0", { xpReward: 15, bonusReward: 0, todayStr: yesterday }).state;
  assert.equal(state.lastActiveDate, today);
  assert.equal(state.streak, 1);

  state = recordLessonCompletion(state, "u1-t0", { xpReward: 15, bonusReward: 0, todayStr: today }).state;
  assert.equal(state.streak, 1);
});

await runTest("Auth: invite code throttling, duplicate check, login lockout, session expiry & old-session revocation", async () => {
  const db = new SqliteD1Database(schemaSql);
  const env = { DB: db, SIGNUP_CODE: "TURTLE2026" };

  let r = await callApi(env, "/api/auth/me");
  assert.equal(r.res.status, 200);
  assert.equal(r.res.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(r.res.headers.get("Cross-Origin-Resource-Policy"), "same-origin");
  assert.equal(r.data.cloudEnabled, true);
  assert.equal(r.data.signupRequiresInvite, true);
  assert.equal(r.data.user, null);

  // 10 bad invite guesses from one IP trigger 429 lockout on register
  for (let i = 0; i < 10; i++) {
    const badInv = await callApi(env, "/api/auth/register", {
      method: "POST",
      headers: { "CF-Connecting-IP": "198.51.100.9" },
      body: { username: `bot_${i}`, pin: "1234", inviteCode: "WRONG" },
    });
    assert.equal(badInv.res.status, 403);
  }
  const lockedInv = await callApi(env, "/api/auth/register", {
    method: "POST",
    headers: { "CF-Connecting-IP": "198.51.100.9" },
    body: { username: "bot_real", pin: "1234", inviteCode: "TURTLE2026" },
  });
  assert.equal(lockedInv.res.status, 429);
  assert.ok(lockedInv.res.headers.get("Retry-After"));

  // Valid registration from clean IP succeeds and sets HttpOnly+Secure cookie
  const today = isoDateOffset(0);
  const reg1 = await callApi(env, "/api/auth/register", {
    method: "POST",
    headers: { "CF-Connecting-IP": "198.51.100.10" },
    body: { username: "MayaCoder", pin: "1234", inviteCode: "TURTLE2026", clientDate: today },
  });
  assert.equal(reg1.res.status, 201);
  assert.equal(reg1.data.user.username, "MayaCoder");
  const cookieHeader = reg1.res.headers.get("Set-Cookie");
  assert.ok(cookieHeader.includes("HttpOnly"));
  assert.ok(cookieHeader.includes("Secure"));
  const cookieMaya1 = extractSessionCookie(reg1.res);

  // Case-insensitive duplicate blocked
  r = await callApi(env, "/api/auth/register", {
    method: "POST",
    headers: { "CF-Connecting-IP": "198.51.100.10" },
    body: { username: "mayacoder", pin: "9999", inviteCode: "TURTLE2026" },
  });
  assert.equal(r.res.status, 409);

  // Switching account via login while presenting Maya's cookie revokes Maya's old session
  const reg2 = await callApi(env, "/api/auth/register", {
    method: "POST",
    cookie: cookieMaya1,
    headers: { "CF-Connecting-IP": "198.51.100.10" },
    body: { username: "LeoCoder", pin: "5678", inviteCode: "TURTLE2026", clientDate: today },
  });
  assert.equal(reg2.res.status, 201);
  const revokedCheck = await callApi(env, "/api/state", { cookie: cookieMaya1 });
  assert.equal(revokedCheck.res.status, 401);

  // Expired session rejected & cleaned up
  const cookieLeo = extractSessionCookie(reg2.res);
  db.sqlite.prepare("UPDATE sessions SET expires_at = '2020-01-01T00:00:00.000Z'").run();
  const expiredRes = await callApi(env, "/api/state", { cookie: cookieLeo });
  assert.equal(expiredRes.res.status, 401);
  const remSessions = db.sqlite.prepare("SELECT COUNT(*) AS c FROM sessions").get().c;
  assert.equal(remSessions, 0);

  // 5 wrong PIN guesses trigger 429 lockout
  for (let i = 0; i < 5; i++) {
    const bad = await callApi(env, "/api/auth/login", {
      method: "POST",
      body: { username: "mayacoder", pin: "0000" },
    });
    assert.equal(bad.res.status, 401);
  }
  const locked = await callApi(env, "/api/auth/login", {
    method: "POST",
    body: { username: "mayacoder", pin: "1234" },
  });
  assert.equal(locked.res.status, 429);
  assert.ok(locked.res.headers.get("Retry-After"));
});

await runTest("CSRF checks, X-TQ-User-Id guard, malformed URI 400, unlock order, atomic completion, shop & gallery cap", async () => {
  const db = new SqliteD1Database(schemaSql);
  const env = { DB: db };
  const today = isoDateOffset(0);
  const yesterday = isoDateOffset(-1);

  const regA = await callApi(env, "/api/auth/register", {
    method: "POST",
    body: { username: "alice", pin: "1111", clientDate: today },
  });
  const cookieA = extractSessionCookie(regA.res);
  const userIdA = regA.data.user.id;

  const regB = await callApi(env, "/api/auth/register", {
    method: "POST",
    body: { username: "bob_k", pin: "2222", clientDate: today },
  });
  const cookieB = extractSessionCookie(regB.res);
  const userIdB = regB.data.user.id;

  // CSRF: cross-origin Origin, same-site Sec-Fetch-Site, cross-origin Referer, and non-JSON Content-Type
  assert.equal(
    (
      await callApi(env, "/api/progress/complete", {
        method: "POST",
        cookie: cookieA,
        headers: { Origin: "https://evil.example" },
        body: { nodeId: "u1-t0" },
      })
    ).res.status,
    403
  );
  assert.equal(
    (
      await callApi(env, "/api/progress/complete", {
        method: "POST",
        cookie: cookieA,
        headers: { "Sec-Fetch-Site": "same-site" },
        body: { nodeId: "u1-t0" },
      })
    ).res.status,
    403
  );
  assert.equal(
    (
      await callApi(env, "/api/progress/complete", {
        method: "POST",
        cookie: cookieA,
        headers: { Referer: "https://evil.example/form" },
        body: { nodeId: "u1-t0" },
      })
    ).res.status,
    403
  );
  assert.equal(
    (
      await callApi(env, "/api/progress/complete", {
        method: "POST",
        cookie: cookieA,
        headers: { "Content-Type": "text/plain" },
        rawBody: '{"nodeId":"u1-t0"}',
      })
    ).res.status,
    415
  );

  // X-TQ-User-Id mismatch returns 409 USER_MISMATCH (multi-tab account switch guard)
  const mismatch = await callApi(env, "/api/drafts/u1-l1", {
    method: "PUT",
    cookie: cookieB,
    headers: { "X-TQ-User-Id": userIdA },
    body: { code: "t.fd(99)" },
  });
  assert.equal(mismatch.res.status, 409);
  assert.equal(mismatch.data.code, "USER_MISMATCH");

  // Malformed percent-encoding returns 400 instead of 500
  const badUri = await callApi(env, "/api/drafts/%ZZ", {
    method: "PUT",
    cookie: cookieA,
    body: { code: "t.fd(10)" },
  });
  assert.equal(badUri.res.status, 400);

  // Locked node rejected with 403
  const skipAhead = await callApi(env, "/api/progress/complete", {
    method: "POST",
    cookie: cookieA,
    body: { nodeId: "u6-l4", bonusEarned: true, clientDate: today },
  });
  assert.equal(skipAhead.res.status, 403);

  // Progress through Unit 1 in order: u1-t0 -> u1-l1 -> u1-l2 -> u1-l3 -> u1-q1
  const sequence = [
    ["u1-t0", false],
    ["u1-l1", true],
    ["u1-l2", false],
    ["u1-l3", false],
    ["u1-q1", true],
  ];
  let lastComp;
  for (const [nodeId, bonusEarned] of sequence) {
    lastComp = await callApi(env, "/api/progress/complete", {
      method: "POST",
      cookie: cookieA,
      headers: { "X-TQ-User-Id": userIdA },
      body: { nodeId, bonusEarned, clientDate: today },
    });
    assert.equal(lastComp.res.status, 200, JSON.stringify(lastComp.data));
  }
  assert.equal(lastComp.data.state.streak, 1);

  // Alternating yesterday/today cannot inflate streak
  const osc1 = await callApi(env, "/api/progress/complete", {
    method: "POST",
    cookie: cookieA,
    body: { nodeId: "u1-l1", bonusEarned: true, clientDate: yesterday },
  });
  assert.equal(osc1.data.state.streak, 1);
  assert.equal(osc1.data.state.lastActiveDate, today);

  const osc2 = await callApi(env, "/api/progress/complete", {
    method: "POST",
    cookie: cookieA,
    body: { nodeId: "u1-l1", bonusEarned: true, clientDate: today },
  });
  assert.equal(osc2.data.state.streak, 1);

  // Buy rocket (30 gems) & confirm partial PATCH /api/preferences preserves activeSkin
  const buyRocket = await callApi(env, "/api/shop/buy", {
    method: "POST",
    cookie: cookieA,
    headers: { "X-TQ-User-Id": userIdA },
    body: { skinId: "rocket" },
  });
  assert.equal(buyRocket.data.ok, true);
  assert.equal(buyRocket.data.state.activeSkin, "rocket");

  const prefSound = await callApi(env, "/api/preferences", {
    method: "PATCH",
    cookie: cookieA,
    headers: { "X-TQ-User-Id": userIdA },
    body: { soundMuted: true },
  });
  assert.equal(prefSound.res.status, 200);
  assert.equal(prefSound.data.state.soundMuted, true);
  assert.equal(prefSound.data.state.activeSkin, "rocket");

  // Sandbox code & 30-item gallery cap + cross-user delete isolation
  const sbCode = await callApi(env, "/api/sandbox/code", {
    method: "PUT",
    cookie: cookieA,
    headers: { "X-TQ-User-Id": userIdA },
    body: { code: "t.circle(75)" },
  });
  assert.equal(sbCode.res.status, 200);

  let lastArtId = "";
  for (let i = 1; i <= 32; i++) {
    const g = await callApi(env, "/api/sandbox/gallery", {
      method: "POST",
      cookie: cookieA,
      headers: { "X-TQ-User-Id": userIdA },
      body: { name: `Art ${i}`, code: `t.fd(${i})` },
    });
    assert.equal(g.res.status, 200);
    lastArtId = g.data.id;
  }
  const stateA = await callApi(env, `/api/state?date=${today}`, { cookie: cookieA });
  assert.equal(stateA.data.state.sandboxGallery.length, 30);
  assert.equal(stateA.data.state.sandboxCode, "t.circle(75)");

  // Bob cannot delete Alice's creation
  await callApi(env, `/api/sandbox/gallery/${lastArtId}`, {
    method: "DELETE",
    cookie: cookieB,
    headers: { "X-TQ-User-Id": userIdB },
  });
  const stateAAfter = await callApi(env, `/api/state?date=${today}`, { cookie: cookieA });
  assert.equal(stateAAfter.data.state.sandboxGallery.length, 30);
});

await runTest("Import hardening: rejects future lastActiveDate freeze, preserves existing cloud skins on merge", async () => {
  const db = new SqliteD1Database(schemaSql);
  const env = { DB: db };
  const today = isoDateOffset(0);

  const reg = await callApi(env, "/api/auth/register", {
    method: "POST",
    body: { username: "dragon_kid", pin: "4321", clientDate: today },
  });
  const cookie = extractSessionCookie(reg.res);

  // Earn 66 gems legitimately across Unit 1 (u1-t0=8, u1-l1+b=15, u1-l2+b=18, u1-l3+b=23 -> 64 gems) and buy dragon (60 gems)
  for (const [nodeId, bonus] of [
    ["u1-t0", false],
    ["u1-l1", true],
    ["u1-l2", true],
    ["u1-l3", true],
  ]) {
    const r = await callApi(env, "/api/progress/complete", {
      method: "POST",
      cookie,
      body: { nodeId, bonusEarned: bonus, clientDate: today },
    });
    assert.equal(r.res.status, 200);
  }
  const buyDragon = await callApi(env, "/api/shop/buy", {
    method: "POST",
    cookie,
    body: { skinId: "dragon" },
  });
  assert.equal(buyDragon.data.ok, true);
  assert.equal(buyDragon.data.state.activeSkin, "dragon");

  // Merge Guest progress that unlocked rocket (30) + attempted future date freeze & forged streak
  const merged = await callApi(env, "/api/progress/import", {
    method: "POST",
    cookie,
    body: {
      mode: "merge",
      clientDate: today,
      state: {
        xp: 999999,
        gems: 999999,
        streak: 3650,
        lastActiveDate: "2099-12-31",
        unlockedSkins: ["turtle", "rocket"],
        activeSkin: "rocket",
        completedLessons: {
          "u1-t0": { passed: true, bonus: false, completedAt: "not-a-date" },
        },
        sandboxGallery: [{ id: "g1", name: "Star", code: "t.fd(10)", savedAt: "2099-01-01" }],
      },
    },
  });
  assert.equal(merged.res.status, 200);
  // Existing cloud skin "dragon" MUST be preserved, NOT revoked for "rocket"!
  assert.ok(merged.data.state.unlockedSkins.includes("dragon"), JSON.stringify(merged.data.state.unlockedSkins));
  assert.equal(merged.data.state.activeSkin, "dragon");
  // Future lastActiveDate rejected (keeps real today), streak clamped cleanly
  assert.equal(merged.data.state.lastActiveDate, today);
  assert.ok(merged.data.state.streak <= 4, `Unexpected inflated streak: ${merged.data.state.streak}`);
  assert.ok(!Number.isNaN(Date.parse(merged.data.state.sandboxGallery[0].savedAt)));
});

await runTest("Worker default fetch routing & scripts/reset-pin.mjs CLI parsing", async () => {
  const db = new SqliteD1Database(schemaSql);
  const env = { DB: db };
  const res = await workerDefault.fetch(new Request("https://turtlequest.example/api/auth/me"), env);
  assert.equal(res.status, 200);

  // CLI argument parsing tests
  assert.equal(parseResetPinArgs(["--prod", "maya", "1234"]).ok, false);
  assert.equal(parseResetPinArgs(["maya", "   "]).ok, false);
  const localArgs = parseResetPinArgs(["Maya_1", "5678"]);
  assert.equal(localArgs.ok, true);
  assert.equal(localArgs.targetFlag, "--local");
  assert.equal(localArgs.usernameLower, "maya_1");

  const remoteArgs = parseResetPinArgs(["--remote", "Maya_1", "9999"]);
  assert.equal(remoteArgs.ok, true);
  assert.equal(remoteArgs.targetFlag, "--remote");

  const sql = buildResetPinSql({
    usernameLower: "maya_1",
    hashHex: "aa",
    saltHex: "bb",
    iterations: 100000,
    nowIso: "2026-11-27T00:00:00.000Z",
  });
  assert.ok(sql.includes("RETURNING id, username;"));
  assert.ok(sql.includes("DELETE FROM sessions"));
  assert.ok(sql.includes("DELETE FROM login_attempts"));
});

console.log(`\nALL ${passed} TEST SUITES PASSED!`);
