export const STORAGE_KEY = "turtlequest_v1";

export function createDefaultState() {
  return {
    version: 1,
    xp: 0,
    gems: 0,
    streak: 0,
    lastActiveDate: null,
    dailyXp: 0,
    dailyDate: null,
    dailyGoal: 50,
    completedLessons: {},
    draftCode: {},
    sandboxCode: "",
    sandboxGallery: [],
    unlockedSkins: ["turtle"],
    activeSkin: "turtle",
    rainbowTrail: false,
    soundMuted: false,
  };
}

function getStorage(customStorage) {
  if (customStorage) return customStorage;
  if (typeof globalThis !== "undefined" && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return null;
}

export function sanitizeState(raw) {
  const defaults = createDefaultState();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return defaults;
  }

  const unlocked = Array.isArray(raw.unlockedSkins)
    ? Array.from(new Set(["turtle", ...raw.unlockedSkins.filter((s) => typeof s === "string")]))
    : ["turtle"];

  const activeSkin =
    typeof raw.activeSkin === "string" && unlocked.includes(raw.activeSkin)
      ? raw.activeSkin
      : "turtle";

  const gallery = Array.isArray(raw.sandboxGallery)
    ? raw.sandboxGallery
        .filter((item) => item && typeof item.id === "string" && typeof item.name === "string" && typeof item.code === "string")
        .slice(0, 50)
    : [];

  const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

  const completed = {};
  if (raw.completedLessons && typeof raw.completedLessons === "object" && !Array.isArray(raw.completedLessons)) {
    for (const [id, entry] of Object.entries(raw.completedLessons)) {
      if (FORBIDDEN_KEYS.has(id)) continue;
      if (entry && typeof entry === "object" && entry.passed) {
        completed[id] = {
          passed: true,
          bonus: Boolean(entry.bonus),
          stars: entry.bonus ? 2 : 1,
          completedAt: typeof entry.completedAt === "string" ? entry.completedAt : new Date().toISOString(),
        };
      }
    }
  }

  const draftCode = {};
  if (raw.draftCode && typeof raw.draftCode === "object" && !Array.isArray(raw.draftCode)) {
    for (const [id, code] of Object.entries(raw.draftCode)) {
      if (FORBIDDEN_KEYS.has(id)) continue;
      if (typeof code === "string") {
        draftCode[id] = code;
      }
    }
  }

  return {
    version: 1,
    xp: Number.isFinite(raw.xp) && raw.xp >= 0 ? Math.floor(raw.xp) : 0,
    gems: Number.isFinite(raw.gems) && raw.gems >= 0 ? Math.floor(raw.gems) : 0,
    streak: Number.isFinite(raw.streak) && raw.streak >= 0 ? Math.floor(raw.streak) : 0,
    lastActiveDate: typeof raw.lastActiveDate === "string" ? raw.lastActiveDate : null,
    dailyXp: Number.isFinite(raw.dailyXp) && raw.dailyXp >= 0 ? Math.floor(raw.dailyXp) : 0,
    dailyDate: typeof raw.dailyDate === "string" ? raw.dailyDate : null,
    dailyGoal: Number.isFinite(raw.dailyGoal) && raw.dailyGoal > 0 ? Math.floor(raw.dailyGoal) : 50,
    completedLessons: completed,
    draftCode,
    sandboxCode: typeof raw.sandboxCode === "string" ? raw.sandboxCode : "",
    sandboxGallery: gallery,
    unlockedSkins: unlocked,
    activeSkin,
    rainbowTrail: Boolean(raw.rainbowTrail),
    soundMuted: Boolean(raw.soundMuted),
  };
}

export function loadState(customStorage) {
  const storage = getStorage(customStorage);
  if (!storage) return createDefaultState();
  try {
    const rawText = storage.getItem(STORAGE_KEY);
    if (!rawText) return createDefaultState();
    return sanitizeState(JSON.parse(rawText));
  } catch {
    return createDefaultState();
  }
}

export function saveState(state, customStorage) {
  const clean = sanitizeState(state);
  const storage = getStorage(customStorage);
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } catch {
      // Ignore quota errors cleanly
    }
  }
  return clean;
}

export function updateState(mutator, customStorage) {
  const current = loadState(customStorage);
  const draft = structuredClone(current);
  const next = mutator(draft) || draft;
  return saveState(next, customStorage);
}

export function exportStateJSON(state) {
  return JSON.stringify(sanitizeState(state), null, 2);
}

export function importStateJSON(jsonText, customStorage) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Save file does not look like a TurtleQuest backup." };
  }
  const hasKnownKey =
    "xp" in parsed || "completedLessons" in parsed || "unlockedSkins" in parsed || "draftCode" in parsed;
  if (!hasKnownKey) {
    return { ok: false, error: "Save file is missing TurtleQuest progress fields." };
  }
  const clean = saveState(sanitizeState(parsed), customStorage);
  return { ok: true, state: clean };
}
