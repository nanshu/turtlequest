import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { ALL_NODES, CHEAT_SHEET_SECTIONS, ORDERED_NODE_IDS, SANDBOX_TEMPLATES, UNITS } from "../js/curriculum/index.js";
import { LESSON_TUTORIALS } from "../js/curriculum/tutorials.js";
import { onRequest as pagesApiOnRequest } from "../functions/api/[[path]].js";
import { translatePythonError } from "../js/runtime/error-helper.js";
import { TurtlePlayer } from "../js/turtle/player.js";
import { formatInlineText } from "../js/ui/format.js";
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

await runTest("Curriculum structure sanity, CSS themes, & PIN whitespace validation", async () => {
  assert.equal(UNITS.length, 9);
  assert.equal(ORDERED_NODE_IDS.length, 54);
  assert.equal(CHEAT_SHEET_SECTIONS.length, 7);
  assert.ok(SANDBOX_TEMPLATES.length >= 8);
  assert.equal(isLessonUnlocked(createDefaultState(), ORDERED_NODE_IDS[0], ORDERED_NODE_IDS), true);
  assert.equal(isLessonUnlocked(createDefaultState(), "nonexistent", ORDERED_NODE_IDS), false);
  const u1 = ALL_NODES.find((n) => n.id === "u1-l1");
  assert.equal(verifyMission(u1, { ok: false }).passed, false);

  const layoutCss = fs.readFileSync(
    path.resolve(import.meta.dirname, "../css/layout.css"),
    "utf8"
  );
  for (const unit of UNITS) {
    assert.ok(layoutCss.includes(`.unit-banner.theme-${unit.theme}`), `Missing theme-${unit.theme}`);
    assert.ok(layoutCss.includes(`.node-btn.unit-${unit.theme}`), `Missing unit-${unit.theme}`);
  }

  for (const node of ALL_NODES) {
    if (node.type === "code") {
      assert.ok(Array.isArray(LESSON_TUTORIALS[node.id]) && LESSON_TUTORIALS[node.id].length >= 1, `Missing Learn First tutorial for ${node.id}`);
    } else if (node.type === "quiz") {
      assert.equal(node.questions.length, 4, `Expected 4 questions in ${node.id}`);
      for (const q of node.questions) {
        assert.ok(Array.isArray(q.options) && q.options.length === 3, `Invalid options in ${node.id}`);
        assert.ok(q.correctIndex >= 0 && q.correctIndex < q.options.length, `Invalid correctIndex in ${node.id}`);
        assert.ok(typeof q.explanation === "string" && q.explanation.length > 0, `Missing explanation in ${node.id}`);
      }
    }
  }

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

await runTest("Worker & Pages Function entrypoints & scripts/reset-pin.mjs CLI parsing", async () => {
  const db = new SqliteD1Database(schemaSql);
  const env = { DB: db };
  const res = await workerDefault.fetch(new Request("https://turtlequest.example/api/auth/me"), env);
  assert.equal(res.status, 200);

  const pagesRes = await pagesApiOnRequest({
    request: new Request("https://turtlequest.pages.dev/api/auth/me"),
    env,
  });
  assert.equal(pagesRes.status, 200);
  const pagesData = await pagesRes.json();
  assert.equal(pagesData.cloudEnabled, true);

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

await runTest("Error helper translations (IndexError, KeyError, custom class vs Turtle, class colon)", async () => {
  const idxErr = translatePythonError('File "<user_code>", line 4\nIndexError: list index out of range', "a = [1]\nprint(a[5])");
  assert.ok(idxErr.title.includes("Index Out of Range"));
  assert.ok(idxErr.tip.includes("0"));

  const keyErr = translatePythonError('File "<user_code>", line 3\nKeyError: \'dragon\'', 'd = {"a": 1}\nd["dragon"]');
  assert.ok(keyErr.title.includes("Missing Dictionary Key"));
  assert.ok(keyErr.tip.includes("in my_dict"));

  const classAttrErr = translatePythonError('File "<user_code>", line 5\nAttributeError: \'StampBot\' object has no attribute \'drw\'', "");
  assert.ok(classAttrErr.title.includes("StampBot"), JSON.stringify(classAttrErr));
  assert.ok(!classAttrErr.title.includes("Turtle Doesn't Know"));

  const turtleAttrErr = translatePythonError('File "<user_code>", line 3\nAttributeError: \'Turtle\' object has no attribute \'forwrd\'', "");
  assert.ok(turtleAttrErr.title.includes("Turtle Doesn't Know"));
  assert.ok(turtleAttrErr.tip.includes("t.forward"));

  const classColonErr = translatePythonError('File "<user_code>", line 1\nSyntaxError: expected \':\'', "class StampBot");
  assert.ok(classColonErr.title.includes("Missing Colon"));
});

function runPythonCurriculumBatch(jobs) {
  const workerSrc = fs.readFileSync(
    path.resolve(import.meta.dirname, "../js/runtime/pyodide-worker.js"),
    "utf8"
  );
  const helperStart = workerSrc.indexOf("def _tq_sanitize_json(obj):");
  const helperEnd = workerSrc.indexOf("class _TQNeedInputFallback");
  assert.ok(helperStart !== -1 && helperEnd !== -1, "Could not locate AST helpers in pyodide-worker.js");
  const astHelpers = workerSrc.slice(helperStart, helperEnd);
  const shimPath = path.resolve(import.meta.dirname, "../js/turtle/py-turtle-shim.py");

  const pyDriver = `
import ast, builtins, io, json, math, random, sys, traceback, types, importlib.util

spec = importlib.util.spec_from_file_location("turtle", ${JSON.stringify(shimPath)})
_turtle_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(_turtle_mod)
sys.modules["turtle"] = _turtle_mod

${astHelpers}

jobs = json.loads(sys.stdin.read())
results = []
for job in jobs:
    code = job["code"]
    pre_inputs = list(job.get("preInputs", []))
    _turtle_mod._reset_runtime()
    random.seed(42)
    out_buf = io.StringIO()
    err_lines = []
    old_out, old_err, old_in = sys.stdout, sys.stderr, builtins.input
    ast_info = None
    ok = True
    err_text = None

    def fake_input(prompt=""):
        val = str(pre_inputs.pop(0)) if pre_inputs else ""
        out_buf.write(f"{prompt}{val}\\n")
        return val

    try:
        tree = ast.parse(code, filename="<user_code>", mode="exec")
        ast_info = _tq_analyze_ast(tree)
        compiled = compile(tree, "<user_code>", "exec")
        sys.stdout = out_buf
        sys.stderr = io.StringIO()
        builtins.input = fake_input
        ns = {"__name__": "__main__"}
        exec(compiled, ns, ns)
    except BaseException:
        ok = False
        err_text = traceback.format_exc()
    finally:
        sys.stdout = old_out
        sys.stderr = old_err
        builtins.input = old_in

    results.append({
        "id": job["id"],
        "kind": job["kind"],
        "ok": ok,
        "stdout": out_buf.getvalue(),
        "error": err_text,
        "astInfo": ast_info,
        "turtleData": _turtle_mod._export_state(),
    })

print(json.dumps(_tq_sanitize_json(results), allow_nan=False))
`;

  const proc = spawnSync("python3", ["-c", pyDriver], {
    input: JSON.stringify(jobs),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(proc.status, 0, `Python runner failed: ${proc.stderr || proc.error?.message}`);
  return JSON.parse(proc.stdout);
}

const REFERENCE_SOLUTIONS = {
  "u1-l1": `import turtle
t = turtle.Turtle()
t.pencolor("blue")
t.pensize(5)
t.forward(100)
t.right(90)
t.forward(100)`,
  "u1-l2": `import turtle
t = turtle.Turtle()
t.pencolor("green"); t.forward(100); t.right(90)
t.pencolor("orange"); t.forward(100); t.right(90)
t.forward(100); t.right(90); t.forward(100); t.right(90)`,
  "u1-l3": `import turtle
t = turtle.Turtle()
t.fillcolor("gold")
t.begin_fill()
t.forward(120); t.right(120)
t.forward(120); t.right(120)
t.forward(120); t.right(120)
t.end_fill()`,
  "u1-l4": `import turtle
t = turtle.Turtle()
t.pencolor("purple")
for _ in range(4):
    t.forward(70); t.right(90)
t.penup(); t.forward(120); t.pendown()
t.pencolor("coral")
for _ in range(3):
    t.forward(70); t.left(120)`,
  "u2-l1": `import turtle
t = turtle.Turtle()
for i in range(4):
    t.forward(140)
    t.right(90)`,
  "u2-l2": `import turtle
t = turtle.Turtle()
t.fillcolor("lightblue")
t.begin_fill()
for i in range(6):
    t.forward(75)
    t.right(360 / 6)
t.end_fill()`,
  "u2-l3": `import turtle
t = turtle.Turtle()
t.pensize(4)
for i in range(36):
    t.forward(12)
    t.right(10)`,
  "u2-l4": `import turtle
t = turtle.Turtle()
colors = ["blue", "teal"]
for j in range(12):
    t.pencolor(colors[j % 2])
    for i in range(4):
        t.forward(80)
        t.right(90)
    t.right(30)`,
  "u3-l1": `import turtle
t = turtle.Turtle()
sides = 5
length = 90
angle = 360 / sides
print("Turn angle:", angle)
print("Perimeter:", sides * length)
for i in range(sides):
    t.forward(length)
    t.right(angle)`,
  "u3-l2": `import turtle
t = turtle.Turtle()
for i in range(30):
    t.forward(8 + i * 4)
    t.right(91)`,
  "u3-l3": `import turtle
t = turtle.Turtle()
small = 60
big = small * 2
t.penup(); t.goto(-160, 40); t.pendown()
for _ in range(4):
    t.forward(small); t.right(90)
t.penup(); t.goto(10, 60); t.pendown()
for _ in range(4):
    t.forward(big); t.right(90)
print("Small area:", small * small, "Big area:", big * big)`,
  "u3-l4": `import turtle
t = turtle.Turtle()
pts = [(100, 80), (-100, 80), (-100, -80), (100, -80)]
t.penup(); t.goto(pts[0]); t.pendown()
for x, y in pts[1:]:
    t.goto(x, y)
    t.dot(14, "gold")
t.goto(pts[0])
t.dot(14, "gold")`,
  "u4-l1": `import turtle
t = turtle.Turtle()
def draw_square(size):
    for _ in range(4):
        t.forward(size); t.right(90)
t.pencolor("orange"); draw_square(50)
t.pencolor("blue"); draw_square(85)
draw_square(120)`,
  "u4-l2": `import turtle
t = turtle.Turtle()
t.fillcolor("gold")
def draw_star(size):
    for _ in range(5):
        t.forward(size); t.right(144)
t.penup(); t.goto(-75, 20); t.pendown()
t.begin_fill()
draw_star(150)
t.end_fill()`,
  "u4-l3": `import turtle
t = turtle.Turtle()
def draw_polygon(sides, size):
    for _ in range(sides):
        t.forward(size); t.right(360 / sides)
t.penup(); t.goto(-160, 40); t.pendown(); draw_polygon(3, 70)
t.penup(); t.goto(-20, 40); t.pendown(); draw_polygon(4, 65)
t.penup(); t.goto(110, 40); t.pendown(); draw_polygon(6, 50)`,
  "u4-l4": `import turtle
t = turtle.Turtle()
def draw_tile(x, y, size):
    t.penup(); t.goto(x, y); t.pendown()
    for _ in range(4):
        t.forward(size); t.right(90)
colors = ["orange", "teal", "purple"]
for row in range(3):
    for col in range(3):
        t.pencolor(colors[(row + col) % 3])
        draw_tile(-90 + col * 65, 60 - row * 65, 50)`,
  "u5-l1": `import turtle
t = turtle.Turtle()
t.pensize(6)
for i in range(9):
    t.penup(); t.goto(-160 + i * 40, 100); t.pendown(); t.setheading(270)
    if i % 3 == 0:
        t.pencolor("teal")
    elif i % 3 == 1:
        t.pencolor("gold")
    else:
        t.pencolor("coral")
    t.forward(200)`,
  "u5-l2": `import turtle
t = turtle.Turtle()
t.fillcolor("lightblue")
sides = int(input("How many sides? "))
if sides < 3:
    sides = 3
t.begin_fill()
for _ in range(sides):
    t.forward(65)
    t.right(360 / sides)
t.end_fill()`,
  "u5-l3": `import turtle, random
turtle.bgcolor("navy")
t = turtle.Turtle()
t.hideturtle(); t.penup()
colors = ["gold", "yellow", "white", "skyblue"]
for _ in range(18):
    t.goto(random.randint(-220, 220), random.randint(-170, 170))
    t.dot(random.randint(6, 16), random.choice(colors))`,
  "u5-l4": `import turtle, random
t = turtle.Turtle()
colors = ["teal", "dodgerblue", "purple", "orange"]
for _ in range(45):
    t.pencolor(random.choice(colors))
    t.setheading(random.choice([0, 90, 180, 270]))
    t.forward(25)
    if t.distance(0, 0) > 150:
        t.setheading(t.towards(0, 0))
        t.forward(40)
print("Dist:", round(t.distance(0, 0), 1))`,
  "u6-l1": `import turtle
t = turtle.Turtle()
for hour in range(12):
    t.penup(); t.home(); t.setheading(90 - hour * 30); t.forward(115); t.pendown(); t.dot(10, "navy")
t.penup(); t.home(); t.pendown(); t.pencolor("coral"); t.setheading(0); t.forward(65)
t.penup(); t.home(); t.pendown(); t.pencolor("blue"); t.setheading(90); t.forward(95)
t.penup(); t.goto(0, -135); t.setheading(0); t.pendown(); t.pencolor("navy"); t.circle(135)`,
  "u6-l2": `import turtle
t = turtle.Turtle()
def draw_branch(length):
    if length < 15:
        return
    t.pencolor("green" if length < 28 else "brown")
    t.forward(length)
    t.left(28)
    draw_branch(length * 0.7)
    t.right(56)
    draw_branch(length * 0.7)
    t.left(28)
    t.penup(); t.backward(length); t.pendown()
t.penup(); t.goto(0, -150); t.setheading(90); t.pendown()
draw_branch(80)`,
  "u6-l3": `import turtle, random
secret = random.randint(1, 10)
guess = 0
while guess != secret:
    guess = int(input("Guess: "))
    if guess < secret:
        print("low")
print("WIN")
t = turtle.Turtle()
t.pencolor("gold")
for _ in range(5):
    t.forward(100); t.right(144)
t.penup(); t.goto(0, -80); t.pencolor("purple")
t.write("YOU WIN!", align="center")`,
  "u6-l4": `import turtle
t = turtle.Turtle()
def badge():
    t.pencolor("gold"); t.fillcolor("dodgerblue")
    t.begin_fill()
    for _ in range(4):
        t.forward(70); t.right(90)
    t.end_fill()
for pos in [(60, 80), (-130, 80), (-130, -20), (60, -20)]:
    t.penup(); t.goto(pos); t.pendown(); badge(); t.dot(12, "coral")
t.penup(); t.goto(0, -135); t.pencolor("purple"); t.write("CREST")`,
  "u7-l1": `import turtle
t = turtle.Turtle()
total = 0
for i in range(12):
    row = i // 4
    col = i % 4
    total += 1
    t.penup(); t.goto(-110 + col * 70, 75 - row * 70); t.pendown()
    t.dot(28, "indigo" if row % 2 == 0 else "dodgerblue")
print("Total:", total, "2^4:", 2 ** 4)`,
  "u7-l2": `import turtle, random
t = turtle.Turtle()
t.penup(); t.goto(-140, 100); t.pendown()
for w, h in [(280, 90), (200, 90), (280, 90), (200, 90)]:
    t.forward(w); t.right(h)
t.penup(); t.home(); t.pendown()
for _ in range(28):
    t.setheading(random.randint(0, 359)); t.forward(40)
    x, y = t.xcor(), t.ycor()
    if x < -130 or x > 130 or y < -90 or y > 90:
        t.dot(10, "red"); t.setheading(t.towards(0, 0)); t.forward(45)
    else:
        t.dot(8, "teal")`,
  "u7-l3": `import turtle
t = turtle.Turtle()
raw = input("Name: ")
clean = raw.strip().lower()
w = max(160, len(clean) * 20 + 80)
if clean[0] == "m":
    t.pencolor("indigo")
else:
    t.pencolor("teal")
t.fillcolor("gold")
t.penup(); t.goto(-w / 2, 40); t.pendown()
t.begin_fill()
for side in [w, 80, w, 80]:
    t.forward(side); t.right(90)
t.end_fill()
t.penup(); t.goto(0, -10)
t.write(f"Hello, {clean}!", align="center")`,
  "u7-l4": `import turtle
t = turtle.Turtle()
def turn_angle(sides):
    return 360 / sides
def ring_color(step):
    if step % 3 == 0:
        return "indigo"
    elif step % 3 == 1:
        return "dodgerblue"
    return "coral"
for idx, s in enumerate([3, 4, 6]):
    t.penup(); t.goto(-150 + idx * 120, 40); t.pendown()
    t.pencolor(ring_color(idx))
    ang = turn_angle(s)
    for _ in range(s):
        t.forward(55); t.right(ang)
print(f"Hexagon angle: {turn_angle(6)}")`,
  "u8-l1": `import turtle
t = turtle.Turtle()
colors = ["red", "orange", "gold", "green"]
colors.append("dodgerblue")
print("Len:", len(colors), colors[0], colors[-1])
for i in range(8):
    t.pencolor(colors[i % len(colors)])
    for _ in range(4):
        t.forward(70); t.right(90)
    t.right(45)`,
  "u8-l2": `import turtle
turtle.bgcolor("navy")
t = turtle.Turtle()
stars = [(-150, 70), (-60, 110), (30, 50), (120, -40), (-50, -90), (-150, 70)]
t.penup(); t.goto(stars[0]); t.pendown()
for x, y in stars:
    t.goto(x, y)
    t.dot(14, "gold")`,
  "u8-l3": `import turtle
t = turtle.Turtle()
shapes = {"triangle": 3, "square": 4, "hexagon": 6}
cmap = {"triangle": "coral", "square": "amber", "hexagon": "teal"}
orders = ["triangle", "dragon", "square", "hexagon"]
x = -160
for name in orders:
    if name in shapes:
        t.penup(); t.goto(x, 40); t.pendown()
        t.pencolor(cmap[name])
        s = shapes[name]
        for _ in range(s):
            t.forward(55); t.right(360 / s)
        x += 120`,
  "u8-l4": `import turtle, random
t = turtle.Turtle()
visited = set()
steps = 0
while True:
    steps += 1
    x = random.randint(-180, 180)
    y = random.randint(-140, 140)
    t.penup(); t.goto(x, y); t.pendown()
    if x > 15 and y > 15:
        zone = "Q1"
    elif x < -15 and y > 15:
        zone = "Q2"
    elif x < -15 and y < -15:
        zone = "Q3"
    elif x > 15 and y < -15:
        zone = "Q4"
    else:
        zone = "Q1"
    if zone not in visited:
        t.dot(18, "gold")
    else:
        t.dot(10, "skyblue")
    visited.add(zone)
    if len(visited) == 4 or steps >= 80:
        break`,
  "u9-l1": `import turtle
leo = turtle.Turtle()
maya = turtle.Turtle()
leo.pencolor("dodgerblue"); maya.pencolor("coral")
leo.penup(); leo.goto(-140, 40); leo.pendown()
maya.penup(); maya.goto(60, 40); maya.pendown()
for _ in range(4):
    leo.forward(70); leo.right(90)
    maya.forward(70); maya.right(90)`,
  "u9-l2": `import turtle
t = turtle.Turtle()
class StampBot:
    def __init__(self, pen, color, size):
        self.pen = pen
        self.color = color
        self.size = size
    def draw_square(self, x, y):
        self.pen.penup(); self.pen.goto(x, y); self.pen.pendown()
        self.pen.pencolor(self.color)
        for _ in range(4):
            self.pen.forward(self.size); self.pen.right(90)
    def draw_triangle(self, x, y):
        self.pen.penup(); self.pen.goto(x, y); self.pen.pendown()
        self.pen.pencolor(self.color)
        for _ in range(3):
            self.pen.forward(self.size); self.pen.right(120)
b1 = StampBot(t, "crimson", 65)
b2 = StampBot(t, "dodgerblue", 95)
b1.draw_square(-140, 40)
b2.draw_square(20, 60)
b1.draw_triangle(-40, -60)`,
  "u9-l3": `import turtle
turtle.bgcolor("navy")
t = turtle.Turtle()
class Planet:
    def __init__(self, name, x, y, radius, color):
        self.name = name; self.x = x; self.y = y; self.radius = radius; self.color = color
    def draw(self, pen):
        pen.penup(); pen.goto(self.x, self.y)
        pen.dot(self.radius * 2, self.color)
        pen.goto(self.x, self.y - self.radius - 16); pen.pencolor("white"); pen.write(self.name, align="center")
planets = [
    Planet("Sun", -150, 0, 26, "gold"),
    Planet("Earth", -30, 35, 14, "dodgerblue"),
    Planet("Mars", 60, -35, 12, "coral"),
    Planet("Saturn", 145, 30, 18, "orange"),
]
for p in planets:
    p.draw(t)`,
  "u9-l4": `import turtle
turtle.bgcolor("#0f172a")
t = turtle.Turtle()
class Firework:
    def __init__(self, x, y, size, spokes, color):
        self.x = x; self.y = y; self.size = size; self.spokes = spokes; self.color = color
    def launch(self, pen):
        pen.pencolor(self.color)
        for i in range(self.spokes):
            pen.penup(); pen.goto(self.x, self.y); pen.setheading(i * (360 / self.spokes)); pen.pendown()
            pen.forward(self.size)
            if self.size >= 55:
                pen.dot(6, "white")
show = [
    Firework(-130, 80, 65, 12, "gold"),
    Firework(120, 75, 55, 10, "coral"),
    Firework(-60, -70, 48, 8, "cyan"),
]
for fw in show:
    fw.launch(t)
t.penup(); t.goto(0, -165); t.pencolor("white"); t.write("ARCHITECT", align="center")`,
};

await runTest("All 36 coding lessons: starterCode NEVER auto-passes, solutions + bonuses PASS cleanly, goal counts match", async () => {
  const codeNodes = ALL_NODES.filter((n) => n.type === "code");
  assert.equal(codeNodes.length, 36);

  const preInputsByLesson = {
    "u5-l2": ["6"],
    "u6-l3": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    "u7-l3": ["  MAYA  "],
  };

  const jobs = [];
  for (const node of codeNodes) {
    assert.ok(REFERENCE_SOLUTIONS[node.id], `Missing reference solution for ${node.id}`);
    const preInputs = preInputsByLesson[node.id] || [];
    jobs.push({ id: node.id, kind: "starter", code: node.starterCode, preInputs });
    jobs.push({ id: node.id, kind: "solution", code: REFERENCE_SOLUTIONS[node.id], preInputs });
  }
  for (const tpl of SANDBOX_TEMPLATES) {
    jobs.push({ id: `sandbox:${tpl.id}`, kind: "sandbox", code: tpl.code, preInputs: [] });
  }

  const results = runPythonCurriculumBatch(jobs);
  const nodeById = new Map(codeNodes.map((n) => [n.id, n]));

  for (const res of results) {
    if (res.kind === "sandbox") {
      assert.equal(res.ok, true, `Sandbox template ${res.id} failed: ${res.error}`);
      assert.ok(
        (res.turtleData?.commands?.length || 0) >= 4,
        `Sandbox template ${res.id} drew too little`
      );
      continue;
    }
    const lesson = nodeById.get(res.id);
    if (res.kind === "starter") {
      if (res.ok) {
        const v = verifyMission(lesson, res);
        assert.equal(v.passed, false, `Starter code for ${res.id} unexpectedly auto-passed!`);
        assert.equal(
          v.goals.length,
          lesson.goals.length,
          `Starter check goal count mismatch on ${res.id}: expected ${lesson.goals.length}, got ${v.goals.length}`
        );
      }
    } else {
      assert.equal(res.ok, true, `Reference solution crashed on ${res.id}: ${res.error}`);
      const v = verifyMission(lesson, res);
      assert.equal(
        v.goals.length,
        lesson.goals.length,
        `Solution check goal count mismatch on ${res.id}: expected ${lesson.goals.length}, got ${v.goals.length}`
      );
      assert.equal(v.passed, true, `Reference solution failed ${res.id}: ${v.feedback} (${JSON.stringify(v.goals)})`);
      assert.equal(v.bonusPassed, true, `Reference solution missed Bonus Star on ${res.id}: ${JSON.stringify(v)}`);
    }
  }
});

await runTest("D1 completion sequence reaches all the way through Unit 9 capstone", async () => {
  const db = new SqliteD1Database(schemaSql);
  const env = { DB: db };
  const today = isoDateOffset(0);

  const reg = await callApi(env, "/api/auth/register", {
    method: "POST",
    body: { username: "architect_10yo", pin: "7777", clientDate: today },
  });
  const cookie = extractSessionCookie(reg.res);

  for (const nodeId of ORDERED_NODE_IDS) {
    const r = await callApi(env, "/api/progress/complete", {
      method: "POST",
      cookie,
      body: { nodeId, bonusEarned: true, clientDate: today },
    });
    assert.equal(r.res.status, 200, `Failed completing ${nodeId}: ${JSON.stringify(r.data)}`);
  }

  const finalState = await callApi(env, `/api/state?date=${today}`, { cookie });
  assert.equal(Object.keys(finalState.data.state.completedLessons).length, 54);
  assert.equal(finalState.data.state.completedLessons["u9-l4"].stars, 2);
});

await runTest("Regression checks: formatInlineText ** inside backticks, TurtlePlayer screen reset/clear, OOP loop/multi-class", async () => {
  // 1. formatInlineText preserves ** exponent inside inline code while keeping surrounding **bold**
  const formatted = formatInlineText("• **`**`** computes **powers** (`2 ** 3 == 8`)!");
  assert.equal(
    formatted,
    '• <strong><code class="inline-code">**</code></strong> computes <strong>powers</strong> (<code class="inline-code">2 ** 3 == 8</code>)!'
  );

  // 2. TurtlePlayer never spawns phantom "all" turtle on clearscreen() / resetscreen()
  let lastScene = null;
  const fakeRenderer = {
    setShowHeadingPointer() {},
    setScene(scene) {
      lastScene = scene;
    },
    render() {},
  };
  const player = new TurtlePlayer(fakeRenderer);
  player.loadTape(
    [
      { cmd: "spawn", id: "t1", x: 0, y: 0 },
      { cmd: "move", id: "t1", x1: 0, y1: 0, x2: 50, y2: 0, penDown: true, color: "#1e293b", width: 3 },
      { cmd: "clear", id: "all" },
      { cmd: "reset_screen", id: "all" },
    ],
    "#ffffff",
    { autoPlay: false, final: false }
  );
  player.skipToEnd({ emitFinish: false });
  assert.equal(lastScene.turtles.length, 1);
  assert.equal(lastScene.turtles[0].id, "t1");
  assert.equal(lastScene.turtles[0].x, 0);

  // 3. Unit 9 verifiers pass with secondary earlier-sorted helper class AND loop instantiation
  const multiClassCode = `import turtle
turtle.bgcolor("#0f172a")
t = turtle.Turtle()
class Asteroid:
    def __init__(self, x):
        self.x = x
class Firework:
    def __init__(self, x, y, size, spokes, color):
        self.x = x; self.y = y; self.size = size; self.spokes = spokes; self.color = color
    def launch(self, pen):
        pen.pencolor(self.color)
        for i in range(self.spokes):
            pen.penup(); pen.goto(self.x, self.y); pen.setheading(i * (360 / self.spokes)); pen.pendown()
            pen.forward(self.size)
            if self.size >= 50:
                pen.dot(6, "white")
specs = [(-130, 80, 65, 10, "gold"), (120, 75, 55, 8, "coral"), (-60, -70, 50, 8, "cyan")]
show = []
for x, y, sz, sp, col in specs:
    show.append(Firework(x, y, sz, sp, col))
for fw in show:
    fw.launch(t)
t.penup(); t.goto(0, -165); t.pencolor("white"); t.write("LOOPED", align="center")`;

  const u9l4 = ALL_NODES.find((n) => n.id === "u9-l4");
  const [res] = runPythonCurriculumBatch([{ id: "u9-l4", kind: "solution", code: multiClassCode }]);
  assert.equal(res.ok, true, res.error);
  const v = verifyMission(u9l4, res);
  assert.equal(v.passed, true, JSON.stringify(v));
  assert.equal(v.bonusPassed, true, JSON.stringify(v));
});

console.log(`\nALL ${passed} TEST SUITES PASSED!`);
