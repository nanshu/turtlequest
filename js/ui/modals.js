import { TURTLE_SKINS } from "../state/progress.js";
import { exportStateJSON } from "../state/store.js";
import { escapeHtml, formatInlineText } from "./format.js";

const activeModalCleanups = new Set();

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
      <h2 style="margin-bottom:8px;">${escapeHtml(title)} Complete!</h2>
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
            : `<button id="victory-next-btn" class="btn btn-purple" type="button">🎉 You Finished Units 1–3! Back to Path</button>`
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
      </div>
    `;

    wrap.querySelector("#shop-close-btn").addEventListener("click", closeShop);
    wrap.querySelector("#shop-rainbow-btn").addEventListener("click", () => {
      const updated = onToggleRainbow();
      renderContent(updated);
    });
    wrap.querySelectorAll(".shop-action-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const res = onBuyOrEquip(btn.dataset.skin);
        if (res && res.state) {
          renderContent(res.state);
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

export function showBackupModal({ state, onImportState }) {
  const root = getModalRoot();
  closeAllModals();

  const jsonStr = exportStateJSON(state);
  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop";
  wrap.innerHTML = `
    <div class="modal-card" style="max-width:560px;" role="dialog" aria-modal="true">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px;">
        <h2 style="margin:0;">💾 Save &amp; Backup Progress</h2>
        <button id="backup-close-btn" class="btn btn-ghost btn-sm" type="button">Close</button>
      </div>
      <p style="color:var(--text-muted); font-size:0.9rem; margin-top:0;">
        Your progress saves automatically in this browser. Download a JSON backup anytime to move to another computer!
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

  wrap.querySelector("#backup-file-input").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = onImportState(text);
    if (res.ok) {
      showStatus(true, "Progress restored! Updating screen...");
      setTimeout(closeBackup, 700);
    } else {
      showStatus(false, res.error || "Could not load that file.");
    }
  });

  wrap.querySelector("#backup-paste-import").addEventListener("click", () => {
    const text = wrap.querySelector("#backup-json-box").value;
    const res = onImportState(text);
    if (res.ok) {
      showStatus(true, "Progress restored!");
      setTimeout(closeBackup, 700);
    } else {
      showStatus(false, res.error || "Invalid JSON save text.");
    }
  });
}
