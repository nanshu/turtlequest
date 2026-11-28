import { CHEAT_SHEET_SECTIONS, UNITS } from "../curriculum/index.js";
import { TURTLE_SKINS } from "../state/progress.js";
import { exportStateJSON } from "../state/store.js";
import { escapeHtml, formatInlineText } from "./format.js";

const activeModalCleanups = new Set();

export function registerModalCleanup(fn) {
  if (typeof fn === "function") activeModalCleanups.add(fn);
}

export function unregisterModalCleanup(fn) {
  activeModalCleanups.delete(fn);
}

function getModalRoot() {
  return document.getElementById("modal-root");
}

export function closeAllModals() {
  for (const cleanup of Array.from(activeModalCleanups)) {
    cleanup();
  }
  activeModalCleanups.clear();
  const root = getModalRoot();
  if (root) root.innerHTML = "";
}

function launchConfetti() {
  const root = getModalRoot();
  if (!root) return;
  const canvas = document.createElement("canvas");
  canvas.className = "confetti-canvas";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  root.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const colors = ["#58cc02", "#1cb0f6", "#ffc800", "#ff4b4b", "#a568cc"];
  const pieces = Array.from({ length: 75 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * 120,
    vx: (Math.random() - 0.5) * 5,
    vy: 3 + Math.random() * 4.5,
    size: 6 + Math.random() * 6,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.2,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  let frames = 0;
  function tick() {
    if (!canvas.isConnected || frames > 130) {
      canvas.remove();
      return;
    }
    frames += 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of pieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export function showInputModal(promptText, { signal } = {}) {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(null);
      return;
    }

    const root = getModalRoot();
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true">
        <h3>💬 Python is asking you...</h3>
        <p style="font-weight:700; margin-bottom:12px;">${escapeHtml(promptText || "Type an answer:")}</p>
        <form id="py-input-form" style="display:flex; flex-direction:column; gap:12px;">
          <input id="py-input-field" class="text-input" type="text" autocomplete="off" placeholder="Type here..." />
          <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button type="button" id="py-input-cancel" class="btn btn-ghost">Cancel</button>
            <button type="submit" class="btn btn-green">Send</button>
          </div>
        </form>
      </div>
    `;
    root.appendChild(wrap);

    const inputEl = wrap.querySelector("#py-input-field");
    const form = wrap.querySelector("#py-input-form");
    const cancelBtn = wrap.querySelector("#py-input-cancel");
    inputEl.focus();

    let settled = false;
    const onAbort = () => finish(null);
    const finish = (val) => {
      if (settled) return;
      settled = true;
      activeModalCleanups.delete(onAbort);
      signal?.removeEventListener("abort", onAbort);
      wrap.remove();
      resolve(val);
    };

    activeModalCleanups.add(onAbort);
    signal?.addEventListener("abort", onAbort, { once: true });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      finish(inputEl.value);
    });
    cancelBtn.addEventListener("click", () => finish(null));
    wrap.addEventListener("keydown", (e) => {
      if (e.key === "Escape") finish(null);
    });
  });
}

export function showVictoryModal({
  title,
  earnedXp,
  earnedGems,
  bonusEarned,
  bonusFeedback,
  feedback,
  hasNext,
  onNext,
  onKeepTinkering,
  onBackToPath,
}) {
  const root = getModalRoot();
  closeAllModals();

  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop";
  wrap.innerHTML = `
    <div class="modal-card" style="text-align:center;" role="dialog" aria-modal="true">
      <div style="font-size:3.2rem; margin-bottom:6px;">${bonusEarned ? "🌟" : "🎉"}</div>
      <h2 style="margin-bottom:8px;">${formatInlineText(title)} Complete!</h2>
      <p style="color:var(--text-muted); margin-top:0;">${formatInlineText(feedback)}</p>

      <div style="display:flex; justify-content:center; gap:12px; margin:16px 0;">
        <div class="stat-pill xp-pill" style="font-size:1.05rem; padding:10px 16px;">⚡ +${earnedXp} XP</div>
        <div class="stat-pill gem-pill" style="font-size:1.05rem; padding:10px 16px;">💎 +${earnedGems} Gems</div>
      </div>

      ${
        bonusEarned
          ? `<div class="goal-item bonus" style="justify-content:center; margin-bottom:16px;">⭐ Bonus Star Earned! ${formatInlineText(
              bonusFeedback || ""
            )}</div>`
          : ""
      }

      <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px;">
        ${
          hasNext
            ? `<button id="victory-next-btn" class="btn btn-green" type="button">Next Mission ➜</button>`
            : `<button id="victory-next-btn" class="btn btn-purple" type="button">🏆 You Mastered All ${UNITS.length} Units! Back to Path</button>`
        }
        <div style="display:flex; gap:10px; justify-content:center;">
          <button id="victory-tinker-btn" class="btn btn-ghost btn-sm" type="button">Keep Tinkering</button>
          <button id="victory-path-btn" class="btn btn-ghost btn-sm" type="button">Skill Path</button>
        </div>
      </div>
    </div>
  `;
  root.appendChild(wrap);
  launchConfetti();

  wrap.querySelector("#victory-next-btn").addEventListener("click", () => {
    closeAllModals();
    if (hasNext && onNext) onNext();
    else if (onBackToPath) onBackToPath();
  });
  wrap.querySelector("#victory-tinker-btn").addEventListener("click", () => {
    closeAllModals();
    onKeepTinkering?.();
  });
  wrap.querySelector("#victory-path-btn").addEventListener("click", () => {
    closeAllModals();
    onBackToPath?.();
  });
}

export function showShopModal({ state, onBuyOrEquip, onToggleRainbow }) {
  const root = getModalRoot();
  closeAllModals();

  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop";

  const renderContent = (currentState) => {
    const cardsHtml = TURTLE_SKINS.map((skin) => {
      const unlocked = currentState.unlockedSkins.includes(skin.id);
      const equipped = currentState.activeSkin === skin.id;
      const canAfford = currentState.gems >= skin.cost;

      let btnHtml = "";
      if (equipped) {
        btnHtml = `<button class="btn btn-green btn-sm" disabled>Equipped ✓</button>`;
      } else if (unlocked) {
        btnHtml = `<button class="btn btn-blue btn-sm shop-action-btn" data-skin="${skin.id}">Equip</button>`;
      } else {
        btnHtml = `<button class="btn btn-gold btn-sm shop-action-btn" data-skin="${skin.id}" ${
          canAfford ? "" : "disabled"
        }>Unlock 💎 ${skin.cost}</button>`;
      }

      return `
        <div class="card shop-card ${equipped ? "equipped" : ""}">
          <div class="shop-emoji">${skin.emoji}</div>
          <div style="font-weight:900;">${escapeHtml(skin.name)}</div>
          <div style="font-size:0.8rem; color:var(--text-muted); flex:1;">${escapeHtml(skin.description)}</div>
          ${btnHtml}
        </div>
      `;
    }).join("");

    wrap.innerHTML = `
      <div class="modal-card" style="max-width:660px;" role="dialog" aria-modal="true">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
          <h2 style="margin:0;">🛍️ Turtle Avatar Shop</h2>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="stat-pill gem-pill">💎 ${currentState.gems} Gems</div>
            <button id="shop-close-btn" class="btn btn-ghost btn-sm" type="button">Close</button>
          </div>
        </div>
        <p style="color:var(--text-muted); margin-bottom:12px;">
          Earn Shell Gems by completing missions &amp; bonus stars!
        </p>

        <div class="card" style="padding:12px 14px; display:flex; align-items:center; justify-content:space-between; gap:12px; background:var(--purple-soft); border-color:#dfc0fa;">
          <div>
            <div style="font-weight:900;">🌈 Rainbow Pen Trail (Free Toy!)</div>
            <div style="font-size:0.82rem; color:var(--text-muted);">Cycles pen strokes through rainbow colors as your turtle draws.</div>
          </div>
          <button id="shop-rainbow-btn" class="btn ${currentState.rainbowTrail ? "btn-purple" : "btn-ghost"} btn-sm" type="button">
            ${currentState.rainbowTrail ? "ON 🌈" : "OFF"}
          </button>
        </div>

        <div class="shop-grid">${cardsHtml}</div>
        <div id="shop-msg" style="margin-top:10px; font-weight:800; font-size:0.86rem; color:var(--coral-dark);"></div>
      </div>
    `;

    const msgEl = wrap.querySelector("#shop-msg");
    const rainbowBtn = wrap.querySelector("#shop-rainbow-btn");
    const actionBtns = wrap.querySelectorAll(".shop-action-btn");
    let shopBusy = false;

    wrap.querySelector("#shop-close-btn").addEventListener("click", closeShop);
    rainbowBtn.addEventListener("click", async () => {
      if (shopBusy) return;
      shopBusy = true;
      rainbowBtn.disabled = true;
      try {
        const updated = await onToggleRainbow();
        if (updated) {
          renderContent(updated);
          return;
        }
        msgEl.textContent = "Could not update rainbow trail.";
      } catch (err) {
        msgEl.textContent = err?.message || "Could not update rainbow trail.";
      } finally {
        shopBusy = false;
        if (rainbowBtn.isConnected) rainbowBtn.disabled = false;
      }
    });
    actionBtns.forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (shopBusy) return;
        shopBusy = true;
        actionBtns.forEach((b) => {
          b.disabled = true;
        });
        try {
          const res = await onBuyOrEquip(btn.dataset.skin);
          if (res && res.state) {
            renderContent(res.state);
            if (!res.ok && res.message) {
              const newMsg = wrap.querySelector("#shop-msg");
              if (newMsg) newMsg.textContent = res.message;
            }
            return;
          }
          renderContent(currentState);
          const newMsg = wrap.querySelector("#shop-msg");
          if (newMsg) newMsg.textContent = res?.message || "Could not complete shop update.";
        } catch (err) {
          renderContent(currentState);
          const newMsg = wrap.querySelector("#shop-msg");
          if (newMsg) newMsg.textContent = err?.message || "Could not complete shop update.";
        } finally {
          shopBusy = false;
        }
      });
    });
  };

  const onEsc = (e) => {
    if (e.key === "Escape") closeShop();
  };
  function closeShop() {
    activeModalCleanups.delete(closeShop);
    document.removeEventListener("keydown", onEsc);
    wrap.remove();
  }

  activeModalCleanups.add(closeShop);
  renderContent(state);
  document.addEventListener("keydown", onEsc);
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) closeShop();
  });
  root.appendChild(wrap);
}

export function showBackupModal({ state, isCloudAccount = false, username = "", onImportState }) {
  const root = getModalRoot();
  closeAllModals();

  const jsonStr = exportStateJSON(state);
  const introText = isCloudAccount
    ? `Your progress syncs automatically to <strong>@${escapeHtml(username)}</strong>. You can still download a JSON backup anytime—restoring a save file replaces your cloud progress with that backup.`
    : `Your progress saves automatically in this browser. Download a JSON backup anytime to move to another computer!`;

  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop";
  wrap.innerHTML = `
    <div class="modal-card" style="max-width:560px;" role="dialog" aria-modal="true">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px;">
        <h2 style="margin:0;">💾 Save &amp; Backup Progress</h2>
        <button id="backup-close-btn" class="btn btn-ghost btn-sm" type="button">Close</button>
      </div>
      <p style="color:var(--text-muted); font-size:0.9rem; margin-top:0;">
        ${introText}
      </p>

      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:16px;">
        <button id="backup-download-btn" class="btn btn-green btn-sm" type="button">⬇️ Download Save (.json)</button>
        <label class="btn btn-blue btn-sm" style="cursor:pointer;">
          ⬆️ Load Save File
          <input id="backup-file-input" type="file" accept=".json,application/json" style="display:none;" />
        </label>
      </div>

      <details>
        <summary style="cursor:pointer; font-weight:800; font-size:0.86rem; color:var(--text-muted);">
          Or paste backup JSON manually
        </summary>
        <textarea id="backup-json-box" class="text-input" rows="7" style="margin-top:8px; font-family:var(--font-mono); font-size:0.76rem;">${escapeHtml(
          jsonStr
        )}</textarea>
        <div style="display:flex; justify-content:flex-end; margin-top:8px;">
          <button id="backup-paste-import" class="btn btn-purple btn-sm" type="button">Restore From Text</button>
        </div>
      </details>

      <div id="backup-msg" style="margin-top:10px; font-weight:800; font-size:0.86rem;"></div>
    </div>
  `;
  root.appendChild(wrap);

  const msgEl = wrap.querySelector("#backup-msg");
  const showStatus = (ok, text) => {
    msgEl.style.color = ok ? "var(--green-dark)" : "var(--coral-dark)";
    msgEl.textContent = text;
  };

  const onEsc = (e) => {
    if (e.key === "Escape") closeBackup();
  };
  function closeBackup() {
    activeModalCleanups.delete(closeBackup);
    document.removeEventListener("keydown", onEsc);
    wrap.remove();
  }
  activeModalCleanups.add(closeBackup);
  document.addEventListener("keydown", onEsc);

  wrap.querySelector("#backup-close-btn").addEventListener("click", closeBackup);
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) closeBackup();
  });

  wrap.querySelector("#backup-download-btn").addEventListener("click", () => {
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `turtlequest-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus(true, "Backup file downloaded!");
  });

  const fileInput = wrap.querySelector("#backup-file-input");
  const pasteBtn = wrap.querySelector("#backup-paste-import");
  let backupBusy = false;

  const setBackupControlsDisabled = (disabled) => {
    fileInput.disabled = disabled;
    pasteBtn.disabled = disabled;
  };

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || backupBusy) return;
    backupBusy = true;
    setBackupControlsDisabled(true);
    showStatus(true, "Restoring save file...");
    try {
      const text = await file.text();
      const res = await onImportState(text);
      if (res && res.ok) {
        showStatus(true, "Progress restored! Updating screen...");
        setTimeout(closeBackup, 700);
        return;
      }
      showStatus(false, res?.error || "Could not load that file.");
    } catch (err) {
      showStatus(false, err?.message || "Could not load that file.");
    } finally {
      backupBusy = false;
      if (wrap.isConnected) setBackupControlsDisabled(false);
    }
  });

  pasteBtn.addEventListener("click", async () => {
    if (backupBusy) return;
    const text = wrap.querySelector("#backup-json-box").value;
    backupBusy = true;
    setBackupControlsDisabled(true);
    showStatus(true, "Restoring progress...");
    try {
      const res = await onImportState(text);
      if (res && res.ok) {
        showStatus(true, "Progress restored!");
        setTimeout(closeBackup, 700);
        return;
      }
      showStatus(false, res?.error || "Invalid JSON save text.");
    } catch (err) {
      showStatus(false, err?.message || "Could not restore save.");
    } finally {
      backupBusy = false;
      if (wrap.isConnected) setBackupControlsDisabled(false);
    }
  });
}

export function showCheatSheetModal({ onInsertSnippet = null } = {}) {
  const root = getModalRoot();
  closeAllModals();

  let activeTab = CHEAT_SHEET_SECTIONS[0].id;
  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop";

  const onEsc = (e) => {
    if (e.key === "Escape") closeSheet();
  };
  function closeSheet() {
    activeModalCleanups.delete(closeSheet);
    document.removeEventListener("keydown", onEsc);
    wrap.remove();
  }
  activeModalCleanups.add(closeSheet);
  document.addEventListener("keydown", onEsc);

  function render() {
    const section = CHEAT_SHEET_SECTIONS.find((s) => s.id === activeTab) || CHEAT_SHEET_SECTIONS[0];

    const tabsHtml = CHEAT_SHEET_SECTIONS.map(
      (s) =>
        `<button class="cheat-tab-btn ${s.id === activeTab ? "active" : ""}" data-tab="${
          s.id
        }" type="button">${escapeHtml(s.label)}</button>`
    ).join("");

    const swatchesHtml = section.colors
      ? `
        <div class="color-swatch-row">
          ${section.colors
            .map(
              (c) => `
            <button class="color-swatch-chip" data-color="${escapeHtml(c.name)}" type="button" title='${
                onInsertSnippet ? "Click to insert" : "Click to copy"
              } t.pencolor("${escapeHtml(c.name)}")'>
              <span class="swatch-dot" style="background:${c.hex};"></span>
              <span>"${escapeHtml(c.name)}"</span>
            </button>
          `
            )
            .join("")}
        </div>
      `
      : "";

    const itemsHtml = section.items
      .map(
        (item, idx) => `
        <div class="cheat-item">
          <div class="cheat-item-main">
            <pre class="cheat-code"><code>${escapeHtml(item.code)}</code></pre>
            <div class="cheat-desc">${formatInlineText(item.desc)}</div>
          </div>
          <div class="cheat-item-actions">
            ${
              onInsertSnippet
                ? `<button class="btn btn-green btn-sm cheat-insert-btn" data-idx="${idx}" type="button">➕ Insert</button>`
                : ""
            }
            <button class="btn btn-ghost btn-sm cheat-copy-btn" data-idx="${idx}" type="button">📋 Copy</button>
          </div>
        </div>
      `
      )
      .join("");

    wrap.innerHTML = `
      <div class="modal-card" style="max-width:700px;" role="dialog" aria-modal="true">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px;">
          <h2 style="margin:0;">🧰 Python &amp; Turtle Cheat Sheet</h2>
          <button id="cheat-close-btn" class="btn btn-ghost btn-sm" type="button">Close</button>
        </div>
        <div class="cheat-tabs">${tabsHtml}</div>
        ${swatchesHtml}
        <div class="cheat-items-list">${itemsHtml}</div>
      </div>
    `;

    wrap.querySelector("#cheat-close-btn").addEventListener("click", closeSheet);
    wrap.querySelectorAll(".cheat-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tab;
        render();
      });
    });

    wrap.querySelectorAll(".color-swatch-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const snippet = `t.pencolor("${btn.dataset.color}")`;
        if (onInsertSnippet) {
          onInsertSnippet(snippet);
          closeSheet();
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(snippet).catch(() => {});
          btn.style.borderColor = "var(--green)";
        }
      });
    });

    wrap.querySelectorAll(".cheat-insert-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = section.items[Number(btn.dataset.idx)];
        if (item && onInsertSnippet) {
          onInsertSnippet(item.code);
          closeSheet();
        }
      });
    });

    wrap.querySelectorAll(".cheat-copy-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const item = section.items[Number(btn.dataset.idx)];
        if (!item) return;
        let ok = false;
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          try {
            await navigator.clipboard.writeText(item.code);
            ok = true;
          } catch {
            ok = false;
          }
        }
        btn.textContent = ok ? "Copied ✓" : "Copy blocked";
        setTimeout(() => {
          if (btn.isConnected) btn.textContent = "📋 Copy";
        }, 1200);
      });
    });
  }

  render();
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) closeSheet();
  });
  root.appendChild(wrap);
}
