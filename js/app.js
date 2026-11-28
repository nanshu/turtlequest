import { getNextNodeId, getNodeById, SANDBOX_TEMPLATES } from "./curriculum/index.js";
import { PythonRunner } from "./runtime/runner.js";
import {
  buyOrEquipCloudSkin,
  completeCloudLesson,
  deleteCloudGalleryItem,
  fetchAuthMe,
  fetchCloudState,
  importCloudState,
  loginAccount,
  logoutAccount,
  registerAccount,
  saveCloudDraft,
  saveCloudGalleryItem,
  saveCloudSandboxCode,
  setExpectedUserId,
  updateCloudPreferences,
} from "./state/api-client.js";
import {
  buyOrEquipSkin,
  recordLessonCompletion,
  refreshDailyCounters,
  toggleRainbowTrail,
} from "./state/progress.js";
import {
  clearStoredState,
  getRecentUsernames,
  getScopedStorageKey,
  hasMeaningfulProgress,
  importStateJSON,
  loadState,
  rememberUsername,
  saveState,
  STORAGE_KEY,
  updateState,
} from "./state/store.js";
import { showAuthModal, showMigrateGuestModal } from "./ui/auth-modal.js";
import { renderLessonView } from "./ui/lesson-view.js";
import { showBackupModal, showCheatSheetModal, showShopModal, showVictoryModal } from "./ui/modals.js";
import { renderQuizView } from "./ui/quiz-view.js";
import { renderSandboxView } from "./ui/sandbox-view.js";
import { renderSkillMap } from "./ui/skill-map.js";
import { soundFX } from "./ui/sound.js";
import { renderTutorialView } from "./ui/tutorial-view.js";

let cloudInfo = { cloudEnabled: false, signupRequiresInvite: false };
let currentUser = null;
let sessionEpoch = 0;
let activeStorageKey = STORAGE_KEY;
let appState = refreshDailyCounters(loadState(undefined, activeStorageKey));
saveState(appState, undefined, activeStorageKey);
soundFX.setMuted(appState.soundMuted);

let currentView = { name: "path", nodeId: null };
let activeViewHandle = null;
let hasUserNavigated = false;

// Serialized debounced cloud draft/sandbox sync + single source of truth for sync badge
const draftTimers = new Map();
const pendingDrafts = new Map();
const inFlightDraftPromises = new Map();
let sandboxTimer = null;
let pendingSandboxCode = null;
let inFlightSandboxPromise = null;
let inFlightSyncCount = 0;
let syncWarning = null; // { code: "expired"|"mismatch"|"offline"|"too_large"|"error", text: string }

const appRoot = document.getElementById("app-root");
const navPathBtn = document.getElementById("nav-path");
const navSandboxBtn = document.getElementById("nav-sandbox");
const navShopBtn = document.getElementById("nav-shop");
const navGuideBtn = document.getElementById("nav-guide");
const soundToggleBtn = document.getElementById("sound-toggle-btn");
const backupBtn = document.getElementById("backup-btn");
const accountBtn = document.getElementById("account-btn");
const cloudSyncPill = document.getElementById("cloud-sync-pill");
const pyBadge = document.getElementById("py-status-badge");
const pyStatusText = document.getElementById("py-status-text");

const runner = new PythonRunner({
  onStatusChange(status, label) {
    pyBadge.className = `py-status-badge ${status}`;
    pyStatusText.textContent = label;
  },
});

function setSyncStatus(mode, text) {
  if (!cloudSyncPill) return;
  if (!cloudInfo.cloudEnabled || !currentUser) {
    cloudSyncPill.style.display = "none";
    return;
  }
  cloudSyncPill.style.display = "inline-flex";
  cloudSyncPill.className = `sync-pill ${mode === "saving" ? "saving" : mode === "error" ? "error" : ""}`;
  cloudSyncPill.textContent = text;
}

function syncAccountHeader() {
  if (!accountBtn) return;
  if (!cloudInfo.cloudEnabled) {
    accountBtn.style.display = "none";
    setSyncStatus("hidden", "");
    return;
  }
  accountBtn.style.display = "inline-flex";
  if (currentUser) {
    accountBtn.className = "account-pill signed-in";
    accountBtn.textContent = `🐢 @${currentUser.username}`;
    accountBtn.title = `Signed in as @${currentUser.username} — Click to switch or sign out`;
    if (inFlightSyncCount > 0) {
      setSyncStatus("saving", "☁️ Saving...");
    } else if (syncWarning) {
      setSyncStatus("error", syncWarning.text);
    } else if (pendingDrafts.size > 0 || pendingSandboxCode !== null) {
      setSyncStatus("error", "⚠️ Offline (cached)");
    } else {
      setSyncStatus("saved", "☁️ Saved");
    }
  } else {
    accountBtn.className = "account-pill";
    accountBtn.textContent = syncWarning?.code === "offline" ? "⚠️ Cloud Offline" : "👤 Guest • Sign In";
    accountBtn.title =
      syncWarning?.code === "offline"
        ? "Could not reach cloud server — Click to retry sign-in"
        : "Playing as Guest — Sign in to save across devices";
    setSyncStatus("hidden", "");
  }
}

function syncHeaderStats() {
  appState = refreshDailyCounters(appState);
  document.getElementById("stat-streak").textContent = String(appState.streak);
  document.getElementById("stat-xp").textContent = String(appState.xp);
  document.getElementById("stat-gems").textContent = String(appState.gems);

  const pct = Math.min(100, Math.round((appState.dailyXp / appState.dailyGoal) * 100));
  document.getElementById("daily-xp-text").textContent = `${appState.dailyXp} / ${appState.dailyGoal} XP today`;
  document.getElementById("daily-xp-fill").style.width = `${pct}%`;

  soundToggleBtn.textContent = appState.soundMuted ? "🔇" : "🔊";

  navPathBtn.classList.toggle("active", currentView.name === "path" || currentView.name === "node");
  navSandboxBtn.classList.toggle("active", currentView.name === "sandbox");
  syncAccountHeader();
}

function classifyCloudError(err) {
  if (err?.status === 401) {
    return { code: "expired", text: "⚠️ Session expired", retryable: false };
  }
  if (err?.status === 409 && err?.data?.code === "USER_MISMATCH") {
    return { code: "mismatch", text: "⚠️ Account changed", retryable: false };
  }
  if (err?.status === 400 || err?.status === 413) {
    return { code: "too_large", text: "⚠️ Too big to sync", retryable: false };
  }
  return { code: "offline", text: "⚠️ Offline (cached)", retryable: true };
}

async function withCloudSync(fn, expectedEpoch = sessionEpoch) {
  inFlightSyncCount += 1;
  syncAccountHeader();
  try {
    const result = await fn();
    if (sessionEpoch === expectedEpoch) {
      syncWarning = null;
    }
    return result;
  } catch (err) {
    if (sessionEpoch === expectedEpoch) {
      syncWarning = classifyCloudError(err);
    }
    throw err;
  } finally {
    inFlightSyncCount = Math.max(0, inFlightSyncCount - 1);
    if (sessionEpoch === expectedEpoch) {
      syncAccountHeader();
    }
  }
}

function clearPendingSyncState() {
  for (const timer of draftTimers.values()) clearTimeout(timer);
  draftTimers.clear();
  pendingDrafts.clear();
  inFlightDraftPromises.clear();
  clearTimeout(sandboxTimer);
  sandboxTimer = null;
  pendingSandboxCode = null;
  inFlightSandboxPromise = null;
  inFlightSyncCount = 0;
  syncWarning = null;
}

// Serialized per-node draft flusher prevents out-of-order PUT overwrites and lets callers await in-flight syncs
function flushDraftKey(nodeId, expectedEpoch, { keepalive = false } = {}) {
  if (!currentUser || sessionEpoch !== expectedEpoch) return Promise.resolve();
  const existing = inFlightDraftPromises.get(nodeId);
  if (existing) return existing;

  const task = (async () => {
    try {
      while (currentUser && sessionEpoch === expectedEpoch && pendingDrafts.has(nodeId)) {
        const codeToSend = pendingDrafts.get(nodeId);
        inFlightSyncCount += 1;
        syncAccountHeader();
        try {
          await saveCloudDraft(nodeId, codeToSend, { keepalive });
          if (sessionEpoch === expectedEpoch) {
            if (pendingDrafts.get(nodeId) === codeToSend) {
              pendingDrafts.delete(nodeId);
            }
            if (syncWarning && syncWarning.code !== "too_large") {
              syncWarning = null;
            }
          }
        } catch (err) {
          if (sessionEpoch === expectedEpoch) {
            const classified = classifyCloudError(err);
            syncWarning = classified;
            if (!classified.retryable) {
              pendingDrafts.delete(nodeId);
            }
          }
          break;
        } finally {
          inFlightSyncCount = Math.max(0, inFlightSyncCount - 1);
          if (sessionEpoch === expectedEpoch) syncAccountHeader();
        }
      }
    } finally {
      if (inFlightDraftPromises.get(nodeId) === task) {
        inFlightDraftPromises.delete(nodeId);
      }
    }
  })();

  inFlightDraftPromises.set(nodeId, task);
  return task;
}

function flushSandboxKey(expectedEpoch, { keepalive = false } = {}) {
  if (!currentUser || sessionEpoch !== expectedEpoch) return Promise.resolve();
  if (inFlightSandboxPromise) return inFlightSandboxPromise;

  const task = (async () => {
    try {
      while (currentUser && sessionEpoch === expectedEpoch && pendingSandboxCode !== null) {
        const codeToSend = pendingSandboxCode;
        inFlightSyncCount += 1;
        syncAccountHeader();
        try {
          await saveCloudSandboxCode(codeToSend, { keepalive });
          if (sessionEpoch === expectedEpoch) {
            if (pendingSandboxCode === codeToSend) {
              pendingSandboxCode = null;
            }
            if (syncWarning && syncWarning.code !== "too_large") {
              syncWarning = null;
            }
          }
        } catch (err) {
          if (sessionEpoch === expectedEpoch) {
            const classified = classifyCloudError(err);
            syncWarning = classified;
            if (!classified.retryable) {
              pendingSandboxCode = null;
            }
          }
          break;
        } finally {
          inFlightSyncCount = Math.max(0, inFlightSyncCount - 1);
          if (sessionEpoch === expectedEpoch) syncAccountHeader();
        }
      }
    } finally {
      if (inFlightSandboxPromise === task) {
        inFlightSandboxPromise = null;
      }
    }
  })();

  inFlightSandboxPromise = task;
  return task;
}

async function flushAllPendingSync({ keepalive = false } = {}) {
  const expectedEpoch = sessionEpoch;
  if (!currentUser) return;
  const tasks = [];
  for (const [nodeId, timer] of draftTimers.entries()) {
    clearTimeout(timer);
    draftTimers.delete(nodeId);
  }
  const allDraftKeys = new Set([...pendingDrafts.keys(), ...inFlightDraftPromises.keys()]);
  for (const nodeId of allDraftKeys) {
    tasks.push(flushDraftKey(nodeId, expectedEpoch, { keepalive }));
  }
  if (sandboxTimer) {
    clearTimeout(sandboxTimer);
    sandboxTimer = null;
  }
  if (pendingSandboxCode !== null || inFlightSandboxPromise) {
    tasks.push(flushSandboxKey(expectedEpoch, { keepalive }));
  }
  await Promise.allSettled(tasks);
}

window.addEventListener("online", () => {
  if (currentUser && (pendingDrafts.size > 0 || pendingSandboxCode !== null)) {
    flushAllPendingSync();
  }
});

function handlePageHideFlush() {
  if (!currentUser) return;
  activeViewHandle?.flushDraft?.();
  if (pendingDrafts.size > 0 || pendingSandboxCode !== null) {
    flushAllPendingSync({ keepalive: true });
  }
}

window.addEventListener("pagehide", handlePageHideFlush);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    handlePageHideFlush();
  }
});

function queueDraftCloudSync(lessonId, code) {
  if (!currentUser) return;
  const expectedEpoch = sessionEpoch;
  pendingDrafts.set(lessonId, code);
  clearTimeout(draftTimers.get(lessonId));
  setSyncStatus("saving", "☁️ Saving...");
  const timer = setTimeout(() => {
    draftTimers.delete(lessonId);
    flushDraftKey(lessonId, expectedEpoch);
  }, 1100);
  draftTimers.set(lessonId, timer);
}

function queueSandboxCloudSync(code) {
  if (!currentUser) return;
  const expectedEpoch = sessionEpoch;
  pendingSandboxCode = code;
  clearTimeout(sandboxTimer);
  setSyncStatus("saving", "☁️ Saving...");
  sandboxTimer = setTimeout(() => {
    sandboxTimer = null;
    flushSandboxKey(expectedEpoch);
  }, 1100);
}

function unmountCurrentView({ saveDraft = true } = {}) {
  if (typeof activeViewHandle === "function") {
    activeViewHandle();
  } else if (activeViewHandle && typeof activeViewHandle.cleanup === "function") {
    activeViewHandle.cleanup({ saveDraft });
  }
  activeViewHandle = null;
}

function navigateToPath({ saveDraft = true } = {}) {
  unmountCurrentView({ saveDraft });
  currentView = { name: "path", nodeId: null };
  syncHeaderStats();
  renderSkillMap(appRoot, appState, {
    onOpenNode: navigateToNode,
    onOpenSandbox: navigateToSandbox,
  });
}

function navigateToSandbox() {
  hasUserNavigated = true;
  unmountCurrentView();
  currentView = { name: "sandbox", nodeId: null };
  syncHeaderStats();
  activeViewHandle = renderSandboxView(appRoot, {
    state: appState,
    runner,
    onSaveCode(code) {
      const prev = appState.sandboxCode;
      if (prev === code) return;
      if (!prev && code === SANDBOX_TEMPLATES[0].code) return;
      appState = updateState(
        (s) => {
          s.sandboxCode = code;
        },
        undefined,
        activeStorageKey
      );
      queueSandboxCloudSync(code);
    },
    async onSaveGalleryItem(item) {
      if (currentUser) {
        const expectedEpoch = sessionEpoch;
        const res = await withCloudSync(
          () => saveCloudGalleryItem({ name: item.name, code: item.code }),
          expectedEpoch
        );
        if (sessionEpoch !== expectedEpoch) return res.gallery;
        appState = updateState(
          (s) => {
            s.sandboxGallery = res.gallery;
          },
          undefined,
          activeStorageKey
        );
        return appState.sandboxGallery;
      }
      appState = updateState(
        (s) => {
          s.sandboxGallery = [item, ...(s.sandboxGallery || [])].slice(0, 30);
        },
        undefined,
        activeStorageKey
      );
      return appState.sandboxGallery;
    },
    async onDeleteGalleryItem(id) {
      if (currentUser) {
        const expectedEpoch = sessionEpoch;
        const res = await withCloudSync(() => deleteCloudGalleryItem(id), expectedEpoch);
        if (sessionEpoch !== expectedEpoch) return res.gallery;
        appState = updateState(
          (s) => {
            s.sandboxGallery = res.gallery;
          },
          undefined,
          activeStorageKey
        );
        return appState.sandboxGallery;
      }
      appState = updateState(
        (s) => {
          s.sandboxGallery = (s.sandboxGallery || []).filter((g) => g.id !== id);
        },
        undefined,
        activeStorageKey
      );
      return appState.sandboxGallery;
    },
    onBack: navigateToPath,
  });
}

function navigateToNode(nodeId) {
  hasUserNavigated = true;
  const node = getNodeById(nodeId);
  if (!node) {
    navigateToPath();
    return;
  }

  unmountCurrentView();
  currentView = { name: "node", nodeId };
  syncHeaderStats();

  const handleComplete = async ({ xpReward, bonusReward, bonusEarned, bonusFeedback, feedback }) => {
    const expectedEpoch = sessionEpoch;
    let res;

    if (currentUser) {
      try {
        const cloudRes = await withCloudSync(
          () =>
            completeCloudLesson({
              nodeId: node.id,
              bonusEarned: Boolean(bonusEarned),
            }),
          expectedEpoch
        );
        if (sessionEpoch !== expectedEpoch) return;
        appState = saveState(cloudRes.state, undefined, activeStorageKey);
        res = cloudRes;
      } catch (err) {
        if (sessionEpoch !== expectedEpoch) return;
        if (err?.status === 401) {
          openAccountModal({
            canClose: true,
            initialTab: "login",
          });
        } else {
          alert(
            `Could not save your victory to the cloud server: ${err?.message || "Network error"}. Please try again when connected!`
          );
        }
        return false;
      }
    } else {
      res = recordLessonCompletion(appState, node.id, {
        xpReward,
        bonusReward,
        bonusEarned,
      });
      appState = saveState(res.state, undefined, activeStorageKey);
    }

    syncHeaderStats();

    if (res.newBonus) soundFX.playBonus();
    else soundFX.playWin();

    if (currentView.name !== "node" || currentView.nodeId !== node.id) return true;

    const nextId = getNextNodeId(node.id);
    showVictoryModal({
      title: node.title,
      earnedXp: res.earnedXp,
      earnedGems: res.earnedGems,
      bonusEarned: Boolean(bonusEarned),
      bonusFeedback,
      feedback,
      hasNext: Boolean(nextId),
      onNext: () => {
        if (nextId) navigateToNode(nextId);
        else navigateToPath();
      },
      onKeepTinkering: () => {},
      onBackToPath: navigateToPath,
    });
    return true;
  };

  if (node.type === "tutorial") {
    renderTutorialView(appRoot, node, {
      onBack: navigateToPath,
      onComplete: handleComplete,
    });
    return;
  }

  if (node.type === "quiz") {
    renderQuizView(appRoot, node, {
      onBack: navigateToPath,
      onComplete: handleComplete,
    });
    return;
  }

  activeViewHandle = renderLessonView(appRoot, node, {
    state: appState,
    runner,
    onSaveDraft(lessonId, code) {
      const prev = appState.draftCode?.[lessonId];
      if (prev === code) return;
      if (prev === undefined && code === node.starterCode) return;
      appState = updateState(
        (s) => {
          s.draftCode[lessonId] = code;
        },
        undefined,
        activeStorageKey
      );
      queueDraftCloudSync(lessonId, code);
    },
    onBack: navigateToPath,
    onPass: handleComplete,
  });
}

// Flush current user's dirty editor drafts WHILE their session cookie is still active
async function flushBeforeAccountSwitch() {
  activeViewHandle?.flushDraft?.();
  if (currentUser) {
    await flushAllPendingSync();
  }
}

async function applyAuthenticatedUser(user, serverState, { offerGuestMigration = false } = {}) {
  // Never flush stale editor drafts after the cookie has already switched to the new user!
  unmountCurrentView({ saveDraft: false });
  clearPendingSyncState();
  sessionEpoch += 1;

  const guestStateBeforeSwitch = loadState(undefined, STORAGE_KEY);
  const canOfferMigration =
    offerGuestMigration && hasMeaningfulProgress(guestStateBeforeSwitch);

  currentUser = user;
  setExpectedUserId(user.id);
  activeStorageKey = getScopedStorageKey(user.id);
  rememberUsername(user.username);

  let effectiveState = serverState;
  if (canOfferMigration) {
    const migAction = await showMigrateGuestModal({
      username: user.username,
      localState: guestStateBeforeSwitch,
      onMoveToAccount: async () => {
        const migRes = await importCloudState({
          state: guestStateBeforeSwitch,
          mode: "merge",
        });
        effectiveState = migRes.state;
        clearStoredState(undefined, STORAGE_KEY);
      },
      onDiscardGuest: () => {
        clearStoredState(undefined, STORAGE_KEY);
      },
      onKeepSeparate: () => {},
    });
    if (migAction === "merged" && !effectiveState) {
      effectiveState = serverState;
    }
  }

  appState = refreshDailyCounters(saveState(effectiveState, undefined, activeStorageKey));
  soundFX.setMuted(appState.soundMuted);
  navigateToPath({ saveDraft: false });
}

async function switchToGuestMode() {
  if (currentUser) {
    await flushBeforeAccountSwitch();
    unmountCurrentView({ saveDraft: false });
    await logoutAccount().catch(() => {});
  } else {
    unmountCurrentView({ saveDraft: true });
  }

  clearPendingSyncState();
  sessionEpoch += 1;
  currentUser = null;
  setExpectedUserId(null);
  activeStorageKey = STORAGE_KEY;
  appState = refreshDailyCounters(loadState(undefined, STORAGE_KEY));
  soundFX.setMuted(appState.soundMuted);
  navigateToPath({ saveDraft: false });
}

function openAccountModal({ canClose = true, initialTab = "login" } = {}) {
  const guestHasProgress = hasMeaningfulProgress(loadState(undefined, STORAGE_KEY));
  showAuthModal({
    initialTab,
    signupRequiresInvite: cloudInfo.signupRequiresInvite,
    recentUsernames: getRecentUsernames(),
    allowGuest: true,
    canClose,
    currentUser,
    guestHasProgress,
    onLogin: async ({ username, pin }) => {
      const wasGuest = !currentUser;
      // Flush current user's drafts BEFORE loginAccount() replaces the browser session cookie
      await flushBeforeAccountSwitch();
      const res = await loginAccount({ username, pin });
      await applyAuthenticatedUser(res.user, res.state, {
        offerGuestMigration: wasGuest,
      });
    },
    onRegister: async ({ username, pin, inviteCode }) => {
      const wasGuest = !currentUser;
      await flushBeforeAccountSwitch();
      const res = await registerAccount({ username, pin, inviteCode });
      await applyAuthenticatedUser(res.user, res.state, {
        offerGuestMigration: wasGuest,
      });
    },
    onContinueGuest: async () => {
      if (currentUser) {
        await switchToGuestMode();
      }
    },
    onLogout: async () => {
      await switchToGuestMode();
    },
  });
}

// Header controls
document.getElementById("brand-home-btn").addEventListener("click", () => {
  soundFX.playClick();
  navigateToPath();
});
navPathBtn.addEventListener("click", () => {
  soundFX.playClick();
  navigateToPath();
});
navSandboxBtn.addEventListener("click", () => {
  soundFX.playClick();
  navigateToSandbox();
});

navShopBtn.addEventListener("click", () => {
  soundFX.playClick();
  showShopModal({
    state: appState,
    async onBuyOrEquip(skinId) {
      if (currentUser) {
        const expectedEpoch = sessionEpoch;
        const res = await withCloudSync(() => buyOrEquipCloudSkin({ skinId }), expectedEpoch);
        if (sessionEpoch !== expectedEpoch) return res;
        if (res.ok && res.state) {
          appState = saveState(res.state, undefined, activeStorageKey);
          syncHeaderStats();
          if (res.newlyUnlocked) soundFX.playUnlock();
          else soundFX.playClick();
          if (currentView.name === "path") {
            navigateToPath();
          } else {
            activeViewHandle?.updateAppearance?.({
              skin: appState.activeSkin,
              rainbowTrail: appState.rainbowTrail,
            });
          }
        } else {
          if (res.state) {
            appState = saveState(res.state, undefined, activeStorageKey);
            syncHeaderStats();
          }
          soundFX.playError();
        }
        return res;
      }

      const res = buyOrEquipSkin(appState, skinId);
      if (res.ok) {
        appState = saveState(res.state, undefined, activeStorageKey);
        syncHeaderStats();
        if (res.newlyUnlocked) soundFX.playUnlock();
        else soundFX.playClick();
        if (currentView.name === "path") {
          navigateToPath();
        } else {
          activeViewHandle?.updateAppearance?.({
            skin: appState.activeSkin,
            rainbowTrail: appState.rainbowTrail,
          });
        }
      } else {
        soundFX.playError();
      }
      return res;
    },
    async onToggleRainbow() {
      soundFX.playClick();
      if (currentUser) {
        const expectedEpoch = sessionEpoch;
        const res = await withCloudSync(
          () => updateCloudPreferences({ rainbowTrail: !appState.rainbowTrail }),
          expectedEpoch
        );
        if (sessionEpoch !== expectedEpoch) return appState;
        appState = saveState(res.state, undefined, activeStorageKey);
      } else {
        appState = saveState(toggleRainbowTrail(appState), undefined, activeStorageKey);
      }
      syncAccountHeader();
      activeViewHandle?.updateAppearance?.({
        skin: appState.activeSkin,
        rainbowTrail: appState.rainbowTrail,
      });
      return appState;
    },
  });
});

navGuideBtn.addEventListener("click", () => {
  soundFX.playClick();
  showCheatSheetModal({
    onInsertSnippet: activeViewHandle?.insertSnippet || null,
  });
});

soundToggleBtn.addEventListener("click", async () => {
  const nextMuted = !appState.soundMuted;
  appState = updateState(
    (s) => {
      s.soundMuted = nextMuted;
    },
    undefined,
    activeStorageKey
  );
  soundFX.setMuted(appState.soundMuted);
  if (!appState.soundMuted) soundFX.playClick();
  syncHeaderStats();

  if (currentUser) {
    const expectedEpoch = sessionEpoch;
    try {
      const res = await withCloudSync(
        () => updateCloudPreferences({ soundMuted: nextMuted }),
        expectedEpoch
      );
      if (sessionEpoch === expectedEpoch) {
        appState = saveState(res.state, undefined, activeStorageKey);
        syncAccountHeader();
      }
    } catch {
      // Keep local preference toggle smooth even if offline
    }
  }
});

backupBtn.addEventListener("click", () => {
  soundFX.playClick();
  showBackupModal({
    state: appState,
    isCloudAccount: Boolean(currentUser),
    username: currentUser?.username || "",
    async onImportState(jsonText) {
      if (currentUser) {
        const expectedEpoch = sessionEpoch;
        const res = await withCloudSync(
          () => importCloudState({ jsonText, mode: "replace" }),
          expectedEpoch
        );
        if (sessionEpoch !== expectedEpoch) {
          return { ok: false, error: "Account changed during restore." };
        }
        clearPendingSyncState();
        unmountCurrentView({ saveDraft: false });
        appState = saveState(res.state, undefined, activeStorageKey);
        soundFX.setMuted(appState.soundMuted);
        syncHeaderStats();
        navigateToPath({ saveDraft: false });
        return { ok: true, state: appState };
      }

      const res = importStateJSON(jsonText, undefined, activeStorageKey);
      if (res.ok) {
        unmountCurrentView({ saveDraft: false });
        appState = res.state;
        soundFX.setMuted(appState.soundMuted);
        syncHeaderStats();
        navigateToPath({ saveDraft: false });
      }
      return res;
    },
  });
});

if (accountBtn) {
  accountBtn.addEventListener("click", () => {
    soundFX.playClick();
    openAccountModal({ canClose: true });
  });
}

// Boot UI immediately, warm up Pyodide, and detect Cloudflare multi-user backend
navigateToPath();
runner.init().catch((err) => {
  console.warn("Pyodide background warmup warning:", err);
});

(async function bootstrapCloudSession() {
  const bootEpoch = sessionEpoch;
  const me = await fetchAuthMe();
  if (sessionEpoch !== bootEpoch) return;

  cloudInfo = {
    cloudEnabled: me.cloudEnabled,
    signupRequiresInvite: me.signupRequiresInvite,
  };
  if (!me.cloudEnabled) {
    syncAccountHeader();
    return;
  }

  if (me.transientError) {
    syncWarning = { code: "offline", text: "⚠️ Cloud Offline" };
    syncAccountHeader();
    return;
  }

  if (me.user) {
    const viewBeforeHydrate = { ...currentView };
    const hadNavigatedOnGuest = hasUserNavigated && currentView.name !== "path";

    let nextState;
    try {
      const res = await fetchCloudState();
      if (sessionEpoch !== bootEpoch) return;
      nextState = res.state;
    } catch {
      if (sessionEpoch !== bootEpoch) return;
      nextState = loadState(undefined, getScopedStorageKey(me.user.id));
      syncWarning = { code: "offline", text: "⚠️ Offline (cached)" };
    }

    // If user clicked a Guest view before auth hydrated, discard Guest editor cleanly without saving to cloud user
    unmountCurrentView({ saveDraft: false });
    clearPendingSyncState();
    currentUser = me.user;
    setExpectedUserId(me.user.id);
    activeStorageKey = getScopedStorageKey(me.user.id);
    rememberUsername(me.user.username);
    appState = refreshDailyCounters(saveState(nextState, undefined, activeStorageKey));
    soundFX.setMuted(appState.soundMuted);
    syncHeaderStats();

    if (hadNavigatedOnGuest) {
      if (viewBeforeHydrate.name === "sandbox") navigateToSandbox();
      else if (viewBeforeHydrate.name === "node" && viewBeforeHydrate.nodeId) {
        navigateToNode(viewBeforeHydrate.nodeId);
      } else {
        navigateToPath({ saveDraft: false });
      }
    } else {
      navigateToPath({ saveDraft: false });
    }
    return;
  }

  // Logged-out visitor on Cloudflare: show account picker modal right away unless they already started playing
  syncAccountHeader();
  if (!hasUserNavigated && currentView.name === "path") {
    openAccountModal({ canClose: true, initialTab: "login" });
  }
})();
