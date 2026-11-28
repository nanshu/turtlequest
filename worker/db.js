import { ALL_NODES, getNodeById, ORDERED_NODE_IDS } from "../js/curriculum/index.js";
import {
  buyOrEquipSkin,
  isLessonUnlocked,
  recordLessonCompletion,
  refreshDailyCounters,
  TURTLE_SKINS,
} from "../js/state/progress.js";
import { sanitizeState } from "../js/state/store.js";

export const MAX_CODE_CHARS = 32768;
export const MAX_GALLERY_ITEMS = 30;
const MAX_SANDBOX_NAME_CHARS = 60;
const VALID_SKIN_IDS = new Set(TURTLE_SKINS.map((s) => s.id));
const NODE_BY_ID = new Map(ALL_NODES.map((n) => [n.id, n]));

export function getAuthoritativeRewards(node) {
  if (!node) return { xpReward: 0, bonusReward: 0 };
  if (node.type === "tutorial") {
    return { xpReward: node.xp || 15, bonusReward: 0 };
  }
  if (node.type === "quiz") {
    return { xpReward: node.xp || 20, bonusReward: 5 };
  }
  return { xpReward: node.xp || 20, bonusReward: node.bonusXp || 0 };
}

function parseCalendarDateUtc(dateStr) {
  if (typeof dateStr !== "string") return null;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== m - 1 ||
    probe.getUTCDate() !== d
  ) {
    return null;
  }
  return {
    normalized: `${match[1]}-${match[2]}-${match[3]}`,
    utcMs: probe.getTime(),
  };
}

export function sanitizeClientDate(clientDate, now = new Date()) {
  const serverToday = now.toISOString().slice(0, 10);
  const parsed = parseCalendarDateUtc(clientDate);
  if (!parsed) return serverToday;

  const serverMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (Math.abs(parsed.utcMs - serverMidnight) > 86400000) {
    return serverToday;
  }
  return parsed.normalized;
}

function sanitizeImportedDate(rawDate, maxDateStr) {
  const parsed = parseCalendarDateUtc(rawDate);
  if (!parsed) return null;
  const maxParsed = parseCalendarDateUtc(maxDateStr);
  if (!maxParsed || parsed.utcMs > maxParsed.utcMs) return null;
  return parsed.normalized;
}

function normalizeIsoTimestamp(rawIso, fallbackIso) {
  if (typeof rawIso !== "string" || !rawIso.trim()) return fallbackIso;
  const ms = Date.parse(rawIso);
  if (!Number.isFinite(ms)) return fallbackIso;
  const maxMs = Date.parse(fallbackIso) + 86400000;
  const minMs = Date.UTC(2020, 0, 1);
  if (ms < minMs || ms > maxMs) return fallbackIso;
  return new Date(ms).toISOString();
}

function parseUnlockedSkins(rawJson) {
  try {
    const parsed = JSON.parse(rawJson || '["turtle"]');
    if (Array.isArray(parsed)) {
      return Array.from(new Set(["turtle", ...parsed.filter((s) => VALID_SKIN_IDS.has(s))]));
    }
  } catch {
    // Ignore malformed JSON and fall back to default skin
  }
  return ["turtle"];
}

function buildStateFromRows(userRow, progressRows, draftRows, galleryRows, todayStr) {
  const completedLessons = {};
  for (const row of progressRows || []) {
    if (!row || !row.passed || !NODE_BY_ID.has(row.node_id)) continue;
    completedLessons[row.node_id] = {
      passed: true,
      bonus: Boolean(row.bonus),
      stars: row.bonus ? 2 : 1,
      completedAt: row.completed_at,
    };
  }

  const draftCode = {};
  for (const row of draftRows || []) {
    if (!row || !NODE_BY_ID.has(row.node_id) || typeof row.code !== "string") continue;
    draftCode[row.node_id] = row.code;
  }

  const sandboxGallery = (galleryRows || []).map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    savedAt: row.saved_at,
  }));

  const unlockedSkins = parseUnlockedSkins(userRow.unlocked_skins);
  const activeSkin = unlockedSkins.includes(userRow.active_skin) ? userRow.active_skin : "turtle";

  const baseState = sanitizeState({
    version: 1,
    xp: userRow.xp,
    gems: userRow.gems,
    streak: userRow.streak,
    lastActiveDate: userRow.last_active_date,
    dailyXp: userRow.daily_xp,
    dailyDate: userRow.daily_date,
    dailyGoal: userRow.daily_goal,
    completedLessons,
    draftCode,
    sandboxCode: userRow.sandbox_code || "",
    sandboxGallery,
    unlockedSkins,
    activeSkin,
    rainbowTrail: Boolean(userRow.rainbow_trail),
    soundMuted: Boolean(userRow.sound_muted),
  });

  return refreshDailyCounters(baseState, todayStr);
}

async function fetchUserRows(db, userId) {
  const results = await db.batch([
    db.prepare("SELECT * FROM users WHERE id = ?").bind(userId),
    db
      .prepare(
        "SELECT node_id, passed, bonus, stars, completed_at FROM lesson_progress WHERE user_id = ?"
      )
      .bind(userId),
    db
      .prepare("SELECT node_id, code FROM lesson_drafts WHERE user_id = ?")
      .bind(userId),
    db
      .prepare(
        "SELECT id, name, code, saved_at FROM sandbox_projects WHERE user_id = ? ORDER BY saved_at DESC, rowid DESC LIMIT ?"
      )
      .bind(userId, MAX_GALLERY_ITEMS),
  ]);

  const userRow = results[0]?.results?.[0] || null;
  if (!userRow) return null;

  return {
    userRow,
    progressRows: results[1]?.results || [],
    draftRows: results[2]?.results || [],
    galleryRows: results[3]?.results || [],
  };
}

export async function hydrateUserState(db, userId, clientDate = null) {
  const rows = await fetchUserRows(db, userId);
  if (!rows) return null;

  const todayStr = sanitizeClientDate(clientDate);
  return {
    user: {
      id: rows.userRow.id,
      username: rows.userRow.username,
    },
    state: buildStateFromRows(
      rows.userRow,
      rows.progressRows,
      rows.draftRows,
      rows.galleryRows,
      todayStr
    ),
    stateVersion: rows.userRow.state_version,
  };
}

export async function completeLessonForUser(db, userId, { nodeId, bonusEarned = false, clientDate = null }) {
  const node = getNodeById(nodeId);
  if (!node) {
    return { ok: false, status: 400, error: "Unknown lesson or node ID." };
  }

  const todayStr = sanitizeClientDate(clientDate);

  for (let attempt = 0; attempt < 3; attempt++) {
    const hydrated = await hydrateUserState(db, userId, todayStr);
    if (!hydrated) {
      return { ok: false, status: 404, error: "User account not found." };
    }

    if (!isLessonUnlocked(hydrated.state, node.id, ORDERED_NODE_IDS)) {
      return {
        ok: false,
        status: 403,
        error: "Complete the previous mission first to unlock this one!",
      };
    }

    const { xpReward, bonusReward } = getAuthoritativeRewards(node);
    const res = recordLessonCompletion(hydrated.state, node.id, {
      xpReward,
      bonusReward,
      bonusEarned: Boolean(bonusEarned),
      todayStr,
    });
    const nowIso = new Date().toISOString();
    const entry = res.state.completedLessons[node.id];

    // Atomic transaction: guard progress upsert on matching state_version, then bump state_version
    const batchResults = await db.batch([
      db
        .prepare(
          `INSERT INTO lesson_progress (user_id, node_id, passed, bonus, stars, completed_at)
           SELECT ?, ?, 1, ?, ?, ?
           FROM users
           WHERE id = ? AND state_version = ?
           ON CONFLICT(user_id, node_id) DO UPDATE SET
             passed = 1,
             bonus = CASE WHEN excluded.bonus = 1 THEN 1 ELSE lesson_progress.bonus END,
             stars = CASE WHEN excluded.bonus = 1 OR lesson_progress.bonus = 1 THEN 2 ELSE 1 END,
             completed_at = excluded.completed_at`
        )
        .bind(
          userId,
          node.id,
          entry.bonus ? 1 : 0,
          entry.stars,
          entry.completedAt,
          userId,
          hydrated.stateVersion
        ),
      db
        .prepare(
          `UPDATE users
           SET xp = ?, gems = ?, streak = ?, last_active_date = ?,
               daily_xp = ?, daily_date = ?,
               state_version = state_version + 1, updated_at = ?
           WHERE id = ? AND state_version = ?`
        )
        .bind(
          res.state.xp,
          res.state.gems,
          res.state.streak,
          res.state.lastActiveDate,
          res.state.dailyXp,
          res.state.dailyDate,
          nowIso,
          userId,
          hydrated.stateVersion
        ),
    ]);

    if ((batchResults[1]?.meta?.changes || 0) === 1) {
      return {
        ok: true,
        state: res.state,
        earnedXp: res.earnedXp,
        earnedGems: res.earnedGems,
        firstTime: res.firstTime,
        newBonus: res.newBonus,
      };
    }
  }

  return { ok: false, status: 409, error: "Could not save progress due to concurrent update. Please try again." };
}

export async function buyOrEquipSkinForUser(db, userId, { skinId, clientDate = null }) {
  if (typeof skinId !== "string" || !VALID_SKIN_IDS.has(skinId)) {
    return { ok: false, status: 400, error: "Unknown avatar skin." };
  }

  const todayStr = sanitizeClientDate(clientDate);

  for (let attempt = 0; attempt < 3; attempt++) {
    const hydrated = await hydrateUserState(db, userId, todayStr);
    if (!hydrated) {
      return { ok: false, status: 404, error: "User account not found." };
    }

    const res = buyOrEquipSkin(hydrated.state, skinId);
    if (!res.ok) {
      return {
        ok: true,
        result: res,
      };
    }

    const nowIso = new Date().toISOString();
    const updateUser = await db
      .prepare(
        `UPDATE users
         SET gems = ?, unlocked_skins = ?, active_skin = ?,
             state_version = state_version + 1, updated_at = ?
         WHERE id = ? AND state_version = ?`
      )
      .bind(
        res.state.gems,
        JSON.stringify(res.state.unlockedSkins),
        res.state.activeSkin,
        nowIso,
        userId,
        hydrated.stateVersion
      )
      .run();

    if ((updateUser?.meta?.changes || 0) === 1) {
      return {
        ok: true,
        result: res,
      };
    }
  }

  return { ok: false, status: 409, error: "Shop purchase conflicted with another request. Please try again." };
}

export async function updatePreferencesForUser(db, userId, patch, clientDate = null) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return { ok: false, status: 400, error: "Invalid preferences payload." };
  }

  const setClauses = [];
  const params = [];

  if ("rainbowTrail" in patch) {
    setClauses.push("rainbow_trail = ?");
    params.push(Boolean(patch.rainbowTrail) ? 1 : 0);
  }
  if ("soundMuted" in patch) {
    setClauses.push("sound_muted = ?");
    params.push(Boolean(patch.soundMuted) ? 1 : 0);
  }
  if ("dailyGoal" in patch) {
    const parsedGoal = Math.floor(Number(patch.dailyGoal));
    if (!Number.isFinite(parsedGoal) || parsedGoal < 10 || parsedGoal > 500) {
      return { ok: false, status: 400, error: "Daily goal must be between 10 and 500 XP." };
    }
    setClauses.push("daily_goal = ?");
    params.push(parsedGoal);
  }

  const wantsSkinChange = "activeSkin" in patch;
  if (!wantsSkinChange && setClauses.length === 0) {
    const hydrated = await hydrateUserState(db, userId, clientDate);
    if (!hydrated) return { ok: false, status: 404, error: "User account not found." };
    return { ok: true, state: hydrated.state };
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const userRow = await db
      .prepare("SELECT unlocked_skins, state_version FROM users WHERE id = ?")
      .bind(userId)
      .first();
    if (!userRow) {
      return { ok: false, status: 404, error: "User account not found." };
    }

    const clauses = [...setClauses];
    const bindParams = [...params];

    if (wantsSkinChange) {
      const unlockedSkins = parseUnlockedSkins(userRow.unlocked_skins);
      if (typeof patch.activeSkin !== "string" || !unlockedSkins.includes(patch.activeSkin)) {
        return { ok: false, status: 400, error: "That turtle skin is not unlocked yet." };
      }
      clauses.push("active_skin = ?");
      bindParams.push(patch.activeSkin);
    }

    clauses.push("state_version = state_version + 1", "updated_at = ?");
    bindParams.push(new Date().toISOString(), userId, userRow.state_version);

    const updateRes = await db
      .prepare(`UPDATE users SET ${clauses.join(", ")} WHERE id = ? AND state_version = ?`)
      .bind(...bindParams)
      .run();

    if ((updateRes?.meta?.changes || 0) === 1) {
      const hydrated = await hydrateUserState(db, userId, clientDate);
      return { ok: true, state: hydrated.state };
    }
  }

  return { ok: false, status: 409, error: "Preferences conflicted with another update. Please try again." };
}

export async function upsertDraftForUser(db, userId, nodeId, code) {
  if (!NODE_BY_ID.has(nodeId)) {
    return { ok: false, status: 400, error: "Unknown lesson ID." };
  }
  if (typeof code !== "string") {
    return { ok: false, status: 400, error: "Code must be a string." };
  }
  if (code.length > MAX_CODE_CHARS) {
    return { ok: false, status: 400, error: `Draft code exceeds ${MAX_CODE_CHARS} characters.` };
  }

  await db
    .prepare(
      `INSERT INTO lesson_drafts (user_id, node_id, code, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, node_id) DO UPDATE SET
         code = excluded.code,
         updated_at = excluded.updated_at`
    )
    .bind(userId, nodeId, code, new Date().toISOString())
    .run();

  return { ok: true };
}

export async function updateSandboxCodeForUser(db, userId, code) {
  if (typeof code !== "string") {
    return { ok: false, status: 400, error: "Sandbox code must be a string." };
  }
  if (code.length > MAX_CODE_CHARS) {
    return { ok: false, status: 400, error: `Sandbox code exceeds ${MAX_CODE_CHARS} characters.` };
  }

  await db
    .prepare("UPDATE users SET sandbox_code = ?, updated_at = ? WHERE id = ?")
    .bind(code, new Date().toISOString(), userId)
    .run();

  return { ok: true };
}

function mapGalleryRows(rows) {
  return (rows || []).map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    savedAt: row.saved_at,
  }));
}

export async function saveSandboxProjectForUser(db, userId, { name, code }) {
  if (typeof code !== "string" || code.trim().length === 0) {
    return { ok: false, status: 400, error: "Cannot save empty sandbox code." };
  }
  if (code.length > MAX_CODE_CHARS) {
    return { ok: false, status: 400, error: `Sandbox code exceeds ${MAX_CODE_CHARS} characters.` };
  }

  const cleanName = String(name || "").trim().slice(0, MAX_SANDBOX_NAME_CHARS) || "Untitled Art";
  const cleanId = `art-${crypto.randomUUID()}`;
  const savedAt = new Date().toISOString();

  const batchResults = await db.batch([
    db
      .prepare(
        "INSERT INTO sandbox_projects (id, user_id, name, code, saved_at) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(cleanId, userId, cleanName, code, savedAt),
    db
      .prepare(
        `DELETE FROM sandbox_projects
         WHERE user_id = ? AND id NOT IN (
           SELECT id FROM sandbox_projects
           WHERE user_id = ?
           ORDER BY saved_at DESC, rowid DESC
           LIMIT ?
         )`
      )
      .bind(userId, userId, MAX_GALLERY_ITEMS),
    db
      .prepare(
        "SELECT id, name, code, saved_at FROM sandbox_projects WHERE user_id = ? ORDER BY saved_at DESC, rowid DESC LIMIT ?"
      )
      .bind(userId, MAX_GALLERY_ITEMS),
  ]);

  return { ok: true, id: cleanId, gallery: mapGalleryRows(batchResults[2]?.results) };
}

export async function deleteSandboxProjectForUser(db, userId, projectId) {
  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return { ok: false, status: 400, error: "Missing gallery item ID." };
  }

  const batchResults = await db.batch([
    db
      .prepare("DELETE FROM sandbox_projects WHERE id = ? AND user_id = ?")
      .bind(projectId, userId),
    db
      .prepare(
        "SELECT id, name, code, saved_at FROM sandbox_projects WHERE user_id = ? ORDER BY saved_at DESC, rowid DESC LIMIT ?"
      )
      .bind(userId, MAX_GALLERY_ITEMS),
  ]);

  return { ok: true, gallery: mapGalleryRows(batchResults[1]?.results) };
}

function recomputeRewardsFromProgress(
  completedLessons,
  prioritizedSkins,
  secondarySkins,
  requestedActiveSkin,
  requestedXp
) {
  let earnedXp = 0;
  let earnedGems = 0;
  let completedCount = 0;

  for (const [nodeId, entry] of Object.entries(completedLessons)) {
    const node = NODE_BY_ID.get(nodeId);
    if (!node || !entry || !entry.passed) continue;
    completedCount += 1;
    const { xpReward, bonusReward } = getAuthoritativeRewards(node);
    earnedXp += xpReward;
    earnedGems += Math.max(5, Math.round(xpReward / 2));
    if (entry.bonus && bonusReward > 0) {
      earnedXp += bonusReward;
      earnedGems += Math.max(5, Math.round(bonusReward / 2));
    }
  }

  const skinById = new Map(TURTLE_SKINS.map((s) => [s.id, s]));
  const unlockedSkins = ["turtle"];
  const unlockedSet = new Set(unlockedSkins);
  let remainingGems = earnedGems;

  // Preserve already-owned cloud skins first so merging Guest progress never revokes an existing unlock
  const orderedCandidates = [
    ...(Array.isArray(prioritizedSkins) ? prioritizedSkins : []),
    ...(Array.isArray(secondarySkins) ? secondarySkins : []),
  ];
  for (const skinId of orderedCandidates) {
    if (unlockedSet.has(skinId)) continue;
    const skin = skinById.get(skinId);
    if (!skin) continue;
    if (remainingGems >= skin.cost) {
      unlockedSkins.push(skin.id);
      unlockedSet.add(skin.id);
      remainingGems -= skin.cost;
    }
  }

  const activeSkin = unlockedSet.has(requestedActiveSkin) ? requestedActiveSkin : "turtle";
  const safeXp =
    Number.isFinite(requestedXp) && requestedXp >= earnedXp
      ? Math.min(Math.floor(requestedXp), earnedXp + completedCount * 25)
      : earnedXp;

  return {
    xp: safeXp,
    gems: remainingGems,
    unlockedSkins,
    activeSkin,
  };
}

export async function importStateForUser(
  db,
  userId,
  rawState,
  { mode = "merge", clientDate = null } = {}
) {
  if (!rawState || typeof rawState !== "object" || Array.isArray(rawState)) {
    return { ok: false, status: 400, error: "Save file does not look like a TurtleQuest backup." };
  }
  const hasKnownKey =
    "xp" in rawState ||
    "completedLessons" in rawState ||
    "unlockedSkins" in rawState ||
    "draftCode" in rawState;
  if (!hasKnownKey) {
    return { ok: false, status: 400, error: "Save file is missing TurtleQuest progress fields." };
  }

  const todayStr = sanitizeClientDate(clientDate);
  const imported = sanitizeState(rawState);
  const isMerge = mode !== "replace";

  for (let attempt = 0; attempt < 3; attempt++) {
    const existingHydrated = await hydrateUserState(db, userId, todayStr);
    if (!existingHydrated) {
      return { ok: false, status: 404, error: "User account not found." };
    }

    const existing = existingHydrated.state;
    const expectedVersion = existingHydrated.stateVersion;
    const nowIso = new Date().toISOString();

    const finalCompleted = {};
    if (isMerge) {
      for (const [id, entry] of Object.entries(existing.completedLessons)) {
        if (NODE_BY_ID.has(id) && entry?.passed) {
          finalCompleted[id] = { ...entry };
        }
      }
    }
    for (const [id, entry] of Object.entries(imported.completedLessons)) {
      if (!NODE_BY_ID.has(id) || !entry?.passed) continue;
      const prev = finalCompleted[id];
      const bonus = Boolean(prev?.bonus || entry.bonus);
      finalCompleted[id] = {
        passed: true,
        bonus,
        stars: bonus ? 2 : 1,
        completedAt: prev?.completedAt || normalizeIsoTimestamp(entry.completedAt, nowIso),
      };
    }

    const finalDrafts = {};
    if (isMerge) {
      for (const [id, code] of Object.entries(existing.draftCode)) {
        if (NODE_BY_ID.has(id) && typeof code === "string") {
          finalDrafts[id] = code.slice(0, MAX_CODE_CHARS);
        }
      }
    }
    for (const [id, code] of Object.entries(imported.draftCode)) {
      if (!NODE_BY_ID.has(id) || typeof code !== "string") continue;
      if (!isMerge || !finalDrafts[id] || finalDrafts[id].trim().length === 0) {
        finalDrafts[id] = code.slice(0, MAX_CODE_CHARS);
      }
    }

    const combinedGallery = [];
    const seenGalleryKeys = new Set();
    const addGalleryItem = (item, preserveId = false) => {
      if (!item || typeof item.code !== "string" || item.code.trim().length === 0) return;
      const code = item.code.slice(0, MAX_CODE_CHARS);
      const name = String(item.name || "").trim().slice(0, MAX_SANDBOX_NAME_CHARS) || "Untitled Art";
      const key = `${name}\0${code}`;
      if (seenGalleryKeys.has(key)) return;
      seenGalleryKeys.add(key);
      combinedGallery.push({
        id: preserveId && typeof item.id === "string" && item.id ? item.id : `art-${crypto.randomUUID()}`,
        name,
        code,
        savedAt: normalizeIsoTimestamp(item.savedAt, nowIso),
      });
    };
    if (isMerge) {
      for (const item of existing.sandboxGallery) addGalleryItem(item, true);
    }
    for (const item of imported.sandboxGallery) addGalleryItem(item, false);
    const finalGallery = combinedGallery
      .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))
      .slice(0, MAX_GALLERY_ITEMS);

    const prioritizedSkins = isMerge ? existing.unlockedSkins : imported.unlockedSkins;
    const secondarySkins = isMerge ? imported.unlockedSkins : [];
    const requestedActiveSkin = isMerge
      ? existing.activeSkin !== "turtle"
        ? existing.activeSkin
        : imported.activeSkin
      : imported.activeSkin;
    const requestedXp = isMerge ? Math.max(existing.xp, imported.xp) : imported.xp;

    const rewards = recomputeRewardsFromProgress(
      finalCompleted,
      prioritizedSkins,
      secondarySkins,
      requestedActiveSkin,
      requestedXp
    );

    const finalSandboxCode = isMerge
      ? (existing.sandboxCode && existing.sandboxCode.trim().length > 0
          ? existing.sandboxCode
          : imported.sandboxCode
        ).slice(0, MAX_CODE_CHARS)
      : imported.sandboxCode.slice(0, MAX_CODE_CHARS);

    const safeImportedLastActive = sanitizeImportedDate(imported.lastActiveDate, todayStr);
    const safeExistingLastActive = sanitizeImportedDate(existing.lastActiveDate, todayStr);
    const finalLastActive = isMerge
      ? safeImportedLastActive &&
        (!safeExistingLastActive || safeImportedLastActive > safeExistingLastActive)
        ? safeImportedLastActive
        : safeExistingLastActive
      : safeImportedLastActive;

    const completedCount = Object.keys(finalCompleted).length;
    let rawStreak = isMerge
      ? Math.max(existing.streak, imported.streak)
      : imported.streak;
    if (completedCount === 0 || !finalLastActive) {
      rawStreak = 0;
    } else {
      rawStreak = Math.min(rawStreak, Math.max(existing.streak, completedCount));
    }

    const probeForDaily = refreshDailyCounters(
      {
        dailyDate: finalLastActive === todayStr ? todayStr : existing.dailyDate,
        dailyXp:
          finalLastActive === todayStr
            ? Math.min(
                rewards.xp,
                isMerge ? Math.max(existing.dailyXp, imported.dailyXp) : imported.dailyXp
              )
            : isMerge && existing.dailyDate === todayStr
              ? existing.dailyXp
              : 0,
        lastActiveDate: finalLastActive,
        streak: rawStreak,
      },
      todayStr
    );

    const finalDailyGoal =
      Number.isFinite(imported.dailyGoal) && imported.dailyGoal >= 10 && imported.dailyGoal <= 500
        ? imported.dailyGoal
        : existing.dailyGoal;

    // Guard child mutations on matching state_version, then bump state_version last inside one atomic batch
    const stmts = [];
    const versionGuard = "EXISTS (SELECT 1 FROM users WHERE id = ? AND state_version = ?)";

    if (!isMerge) {
      stmts.push(
        db
          .prepare(`DELETE FROM lesson_progress WHERE user_id = ? AND ${versionGuard}`)
          .bind(userId, userId, expectedVersion)
      );
      stmts.push(
        db
          .prepare(`DELETE FROM lesson_drafts WHERE user_id = ? AND ${versionGuard}`)
          .bind(userId, userId, expectedVersion)
      );
    }
    stmts.push(
      db
        .prepare(`DELETE FROM sandbox_projects WHERE user_id = ? AND ${versionGuard}`)
        .bind(userId, userId, expectedVersion)
    );

    for (const [nodeId, entry] of Object.entries(finalCompleted)) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO lesson_progress (user_id, node_id, passed, bonus, stars, completed_at)
             SELECT ?, ?, 1, ?, ?, ?
             FROM users
             WHERE id = ? AND state_version = ?
             ON CONFLICT(user_id, node_id) DO UPDATE SET
               passed = 1,
               bonus = CASE WHEN excluded.bonus = 1 THEN 1 ELSE lesson_progress.bonus END,
               stars = CASE WHEN excluded.bonus = 1 OR lesson_progress.bonus = 1 THEN 2 ELSE 1 END,
               completed_at = excluded.completed_at`
          )
          .bind(
            userId,
            nodeId,
            entry.bonus ? 1 : 0,
            entry.stars,
            entry.completedAt,
            userId,
            expectedVersion
          )
      );
    }

    for (const [nodeId, code] of Object.entries(finalDrafts)) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO lesson_drafts (user_id, node_id, code, updated_at)
             SELECT ?, ?, ?, ?
             FROM users
             WHERE id = ? AND state_version = ?
             ON CONFLICT(user_id, node_id) DO UPDATE SET
               code = excluded.code,
               updated_at = excluded.updated_at`
          )
          .bind(userId, nodeId, code, nowIso, userId, expectedVersion)
      );
    }

    for (const item of finalGallery) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO sandbox_projects (id, user_id, name, code, saved_at)
             SELECT ?, ?, ?, ?, ?
             FROM users
             WHERE id = ? AND state_version = ?`
          )
          .bind(item.id, userId, item.name, item.code, item.savedAt, userId, expectedVersion)
      );
    }

    stmts.push(
      db
        .prepare(
          `UPDATE users
           SET xp = ?, gems = ?, streak = ?, last_active_date = ?,
               daily_xp = ?, daily_date = ?, daily_goal = ?,
               unlocked_skins = ?, active_skin = ?, rainbow_trail = ?,
               sound_muted = ?, sandbox_code = ?,
               state_version = state_version + 1, updated_at = ?
           WHERE id = ? AND state_version = ?`
        )
        .bind(
          rewards.xp,
          rewards.gems,
          probeForDaily.streak,
          finalLastActive,
          probeForDaily.dailyXp,
          probeForDaily.dailyDate,
          finalDailyGoal,
          JSON.stringify(rewards.unlockedSkins),
          rewards.activeSkin,
          (isMerge ? existing.rainbowTrail || imported.rainbowTrail : imported.rainbowTrail) ? 1 : 0,
          (isMerge ? existing.soundMuted : imported.soundMuted) ? 1 : 0,
          finalSandboxCode,
          nowIso,
          userId,
          expectedVersion
        )
    );

    const batchRes = await db.batch(stmts);
    const lastRes = batchRes[batchRes.length - 1];
    if ((lastRes?.meta?.changes || 0) === 1) {
      const refreshed = await hydrateUserState(db, userId, todayStr);
      return { ok: true, state: refreshed.state };
    }
  }

  return { ok: false, status: 409, error: "Import conflicted with another update. Please try again." };
}
