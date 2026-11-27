import { getNextNodeId, getNodeById } from "./curriculum/index.js";
import { PythonRunner } from "./runtime/runner.js";
import {
  buyOrEquipSkin,
  recordLessonCompletion,
  refreshDailyCounters,
  toggleRainbowTrail,
} from "./state/progress.js";
import { importStateJSON, loadState, saveState, updateState } from "./state/store.js";
import { renderLessonView } from "./ui/lesson-view.js";
import { showBackupModal, showCheatSheetModal, showShopModal, showVictoryModal } from "./ui/modals.js";
import { renderQuizView } from "./ui/quiz-view.js";
import { renderSandboxView } from "./ui/sandbox-view.js";
import { renderSkillMap } from "./ui/skill-map.js";
import { soundFX } from "./ui/sound.js";
import { renderTutorialView } from "./ui/tutorial-view.js";

let appState = refreshDailyCounters(loadState());
saveState(appState);
soundFX.setMuted(appState.soundMuted);

let currentView = { name: "path", nodeId: null };
let activeViewHandle = null;

const appRoot = document.getElementById("app-root");
const navPathBtn = document.getElementById("nav-path");
const navSandboxBtn = document.getElementById("nav-sandbox");
const navShopBtn = document.getElementById("nav-shop");
const navGuideBtn = document.getElementById("nav-guide");
const soundToggleBtn = document.getElementById("sound-toggle-btn");
const backupBtn = document.getElementById("backup-btn");
const pyBadge = document.getElementById("py-status-badge");
const pyStatusText = document.getElementById("py-status-text");

const runner = new PythonRunner({
  onStatusChange(status, label) {
    pyBadge.className = `py-status-badge ${status}`;
    pyStatusText.textContent = label;
  },
});

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
  unmountCurrentView();
  currentView = { name: "sandbox", nodeId: null };
  syncHeaderStats();
  activeViewHandle = renderSandboxView(appRoot, {
    state: appState,
    runner,
    onSaveCode(code) {
      appState = updateState((s) => {
        s.sandboxCode = code;
      });
    },
    onSaveGalleryItem(item) {
      appState = updateState((s) => {
        s.sandboxGallery = [item, ...(s.sandboxGallery || [])].slice(0, 30);
      });
      return appState.sandboxGallery;
    },
    onDeleteGalleryItem(id) {
      appState = updateState((s) => {
        s.sandboxGallery = (s.sandboxGallery || []).filter((g) => g.id !== id);
      });
      return appState.sandboxGallery;
    },
    onBack: navigateToPath,
  });
}

function navigateToNode(nodeId) {
  const node = getNodeById(nodeId);
  if (!node) {
    navigateToPath();
    return;
  }

  unmountCurrentView();
  currentView = { name: "node", nodeId };
  syncHeaderStats();

  const handleComplete = ({ xpReward, bonusReward, bonusEarned, bonusFeedback, feedback }) => {
    const res = recordLessonCompletion(appState, node.id, {
      xpReward,
      bonusReward,
      bonusEarned,
    });
    appState = saveState(res.state);
    syncHeaderStats();

    if (res.newBonus) soundFX.playBonus();
    else soundFX.playWin();

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
      appState = updateState((s) => {
        s.draftCode[lessonId] = code;
      });
    },
    onBack: navigateToPath,
    onPass: handleComplete,
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
    onBuyOrEquip(skinId) {
      const res = buyOrEquipSkin(appState, skinId);
      if (res.ok) {
        appState = saveState(res.state);
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
    onToggleRainbow() {
      soundFX.playClick();
      appState = saveState(toggleRainbowTrail(appState));
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

soundToggleBtn.addEventListener("click", () => {
  appState = updateState((s) => {
    s.soundMuted = !s.soundMuted;
  });
  soundFX.setMuted(appState.soundMuted);
  if (!appState.soundMuted) soundFX.playClick();
  syncHeaderStats();
});

backupBtn.addEventListener("click", () => {
  soundFX.playClick();
  showBackupModal({
    state: appState,
    onImportState(jsonText) {
      const res = importStateJSON(jsonText);
      if (res.ok) {
        // Unmount active editor without flushing stale pre-import draft back over imported state
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

// Boot UI immediately and warm up Pyodide in background
navigateToPath();
runner.init().catch((err) => {
  console.warn("Pyodide background warmup warning:", err);
});
