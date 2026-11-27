export const TURTLE_SKINS = [
  {
    id: "turtle",
    name: "Emerald Turtle",
    emoji: "🐢",
    cost: 0,
    description: "Classic shell explorer, steady and sharp.",
  },
  {
    id: "rocket",
    name: "Astro Rocket",
    emoji: "🚀",
    cost: 30,
    description: "Blasts through loops at supersonic speed.",
  },
  {
    id: "dragon",
    name: "Pixel Dragon",
    emoji: "🐉",
    cost: 60,
    description: "Breaths geometric fire and crisp corners.",
  },
  {
    id: "robot",
    name: "Bot-9000",
    emoji: "🤖",
    cost: 90,
    description: "Precision angle calculator on wheels.",
  },
  {
    id: "racecar",
    name: "Turbo Racer",
    emoji: "🏎️",
    cost: 120,
    description: "Built for fast spirals and victory laps.",
  },
];

export function formatLocalDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function diffDays(prevDateStr, nextDateStr) {
  if (typeof prevDateStr !== "string" || typeof nextDateStr !== "string") return null;
  const pParts = prevDateStr.split("-").map(Number);
  const nParts = nextDateStr.split("-").map(Number);
  if (pParts.length !== 3 || nParts.length !== 3) return null;
  if ([...pParts, ...nParts].some((n) => !Number.isFinite(n))) return null;
  const [py, pm, pd] = pParts;
  const [ny, nm, nd] = nParts;
  const prevUtc = Date.UTC(py, pm - 1, pd);
  const nextUtc = Date.UTC(ny, nm - 1, nd);
  if (!Number.isFinite(prevUtc) || !Number.isFinite(nextUtc)) return null;
  return Math.round((nextUtc - prevUtc) / 86400000);
}

export function refreshDailyCounters(state, todayStr = formatLocalDate()) {
  const next = structuredClone(state);
  if (next.dailyDate !== todayStr) {
    next.dailyDate = todayStr;
    next.dailyXp = 0;
  }
  const gap = diffDays(next.lastActiveDate, todayStr);
  // 2-day weekend freeze: Fri -> Mon is gap === 3 (Sat + Sun skipped)
  if (gap !== null && gap > 3) {
    next.streak = 0;
  }
  return next;
}

export function recordLessonCompletion(
  state,
  lessonId,
  { xpReward = 20, bonusReward = 10, bonusEarned = false, todayStr = formatLocalDate() } = {}
) {
  const next = refreshDailyCounters(state, todayStr);
  const prevEntry = next.completedLessons[lessonId];
  const firstTime = !prevEntry || !prevEntry.passed;
  const newBonus = Boolean(bonusEarned && (!prevEntry || !prevEntry.bonus));

  let earnedXp = 0;
  let earnedGems = 0;

  if (firstTime) {
    earnedXp += xpReward;
    earnedGems += Math.max(5, Math.round(xpReward / 2));
  } else {
    // Repeat practice gives a small XP nudge without infinite gem farming
    earnedXp += 5;
  }

  if (newBonus && bonusReward > 0) {
    earnedXp += bonusReward;
    earnedGems += Math.max(5, Math.round(bonusReward / 2));
  }

  next.xp += earnedXp;
  next.gems += earnedGems;
  next.dailyXp += earnedXp;
  next.dailyDate = todayStr;

  // Forgiving streak: automatic 2-day weekend freeze (survives up to 2 missed days, gap <= 3)
  const gap = diffDays(next.lastActiveDate, todayStr);
  if (next.lastActiveDate === null || gap === null) {
    next.streak = 1;
  } else if (gap === 0) {
    next.streak = Math.max(1, next.streak);
  } else if (gap > 0 && gap <= 3) {
    next.streak = Math.max(1, next.streak) + 1;
  } else if (gap > 3) {
    next.streak = 1;
  }
  next.lastActiveDate = todayStr;

  const hadBonus = Boolean(prevEntry && prevEntry.bonus);
  const finalBonus = hadBonus || Boolean(bonusEarned);

  next.completedLessons[lessonId] = {
    passed: true,
    bonus: finalBonus,
    stars: finalBonus ? 2 : 1,
    completedAt: new Date().toISOString(),
  };

  return {
    state: next,
    earnedXp,
    earnedGems,
    firstTime,
    newBonus,
  };
}

export function isLessonUnlocked(state, lessonId, orderedLessonIds) {
  const idx = orderedLessonIds.indexOf(lessonId);
  if (idx === -1) return false;
  if (idx === 0) return true;
  if (state.completedLessons?.[lessonId]?.passed) return true;
  const prevId = orderedLessonIds[idx - 1];
  if (state.completedLessons?.[prevId]?.passed) return true;
  // Backwards compatibility: if a later lesson is already completed (e.g. after inserting new tutorial nodes), keep earlier nodes unlocked
  for (let i = idx + 1; i < orderedLessonIds.length; i++) {
    if (state.completedLessons?.[orderedLessonIds[i]]?.passed) return true;
  }
  return false;
}

export function buyOrEquipSkin(state, skinId) {
  const skin = TURTLE_SKINS.find((s) => s.id === skinId);
  if (!skin) {
    return { ok: false, state, message: "Unknown skin.", newlyUnlocked: false };
  }
  const next = structuredClone(state);
  if (next.unlockedSkins.includes(skinId)) {
    next.activeSkin = skinId;
    return { ok: true, state: next, message: `Equipped ${skin.name}!`, newlyUnlocked: false };
  }
  if (next.gems < skin.cost) {
    return {
      ok: false,
      state,
      message: `Need ${skin.cost - next.gems} more Shell Gems to unlock ${skin.name}!`,
      newlyUnlocked: false,
    };
  }
  next.gems -= skin.cost;
  next.unlockedSkins.push(skinId);
  next.activeSkin = skinId;
  return { ok: true, state: next, message: `Unlocked and equipped ${skin.name}!`, newlyUnlocked: true };
}

export function toggleRainbowTrail(state) {
  const next = structuredClone(state);
  next.rainbowTrail = !next.rainbowTrail;
  return next;
}
