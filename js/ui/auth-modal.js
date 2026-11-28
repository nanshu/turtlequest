import { escapeHtml } from "./format.js";
import { closeAllModals, registerModalCleanup, unregisterModalCleanup } from "./modals.js";

export function showAuthModal({
  initialTab = "login",
  signupRequiresInvite = false,
  recentUsernames = [],
  allowGuest = true,
  canClose = false,
  currentUser = null,
  guestHasProgress = false,
  onLogin,
  onRegister,
  onContinueGuest,
  onLogout,
}) {
  const root = document.getElementById("modal-root");
  closeAllModals();

  let activeTab = initialTab === "register" ? "register" : "login";
  let busy = false;
  let errorText = "";
  let showPin = false;

  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop";

  function closeModal() {
    unregisterModalCleanup(closeModal);
    document.removeEventListener("keydown", onEsc);
    wrap.remove();
  }

  function onEsc(e) {
    if (e.key === "Escape" && (canClose || allowGuest) && !busy) {
      closeModal();
      if (!currentUser && allowGuest && !canClose) {
        onContinueGuest?.();
      }
    }
  }
  registerModalCleanup(closeModal);
  document.addEventListener("keydown", onEsc);

  function render() {
    const recentChips =
      activeTab === "login" && recentUsernames.length > 0
        ? `
          <div class="auth-recent-row">
            <span class="auth-recent-label">Quick pick:</span>
            ${recentUsernames
              .map(
                (name) =>
                  `<button type="button" class="auth-chip-btn" data-user="${escapeHtml(name)}">🐢 ${escapeHtml(
                    name
                  )}</button>`
              )
              .join("")}
          </div>
        `
        : "";

    const inviteRow =
      activeTab === "register" && signupRequiresInvite
        ? `
          <label class="auth-field">
            <span>🎟️ Family / Class Invite Code</span>
            <input id="auth-invite" class="text-input" type="text" autocomplete="off" required placeholder="Ask your parent or teacher..." />
          </label>
        `
        : "";

    const activeBanner = currentUser
      ? `
        <div class="auth-signed-banner">
          <span>Signed in as <strong>@${escapeHtml(currentUser.username)}</strong></span>
          <button id="auth-logout-btn" class="btn btn-ghost btn-sm" type="button">Sign Out</button>
        </div>
      `
      : "";

    wrap.innerHTML = `
      <div class="modal-card auth-modal-card" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px;">
          <h2 id="auth-modal-title" style="margin:0;">🐢 Explorer Accounts</h2>
          ${
            canClose
              ? `<button id="auth-close-btn" class="btn btn-ghost btn-sm" type="button">Close</button>`
              : ""
          }
        </div>
        <p style="color:var(--text-muted); font-size:0.9rem; margin:0 0 14px;">
          Save your XP, turtle avatars, and Python art across any computer or tablet!
        </p>

        ${activeBanner}

        <div class="mission-tabs" role="tablist">
          <button id="auth-tab-login" class="mission-tab-btn ${activeTab === "login" ? "active" : ""}" role="tab" aria-selected="${activeTab === "login"}" type="button">
            🔑 Sign In
          </button>
          <button id="auth-tab-register" class="mission-tab-btn ${activeTab === "register" ? "active" : ""}" role="tab" aria-selected="${activeTab === "register"}" type="button">
            ✨ Create Account
          </button>
        </div>

        ${recentChips}

        <form id="auth-form" class="auth-form">
          <label class="auth-field">
            <span>Explorer Username</span>
            <input id="auth-username" class="text-input" type="text" autocomplete="username" minlength="3" maxlength="24" required placeholder="e.g. maya_coder (letters, numbers, _ -)" />
          </label>

          <label class="auth-field">
            <span>${activeTab === "register" ? "Choose a PIN or Secret Word (4+ chars)" : "PIN or Secret Word"}</span>
            <div class="auth-pin-row">
              <input id="auth-pin" class="text-input" type="${showPin ? "text" : "password"}" autocomplete="${
                activeTab === "register" ? "new-password" : "current-password"
              }" minlength="4" maxlength="64" required placeholder="${
                activeTab === "register" ? "4+ characters (easy for you to remember!)" : "Enter your PIN or passcode"
              }" />
              <button id="auth-pin-toggle" class="btn btn-ghost btn-sm" type="button" title="Show or hide PIN" aria-label="Show or hide PIN">
                ${showPin ? "🙈" : "👁️"}
              </button>
            </div>
          </label>

          ${inviteRow}

          <div id="auth-error" class="auth-error" style="display:${errorText ? "block" : "none"};">${escapeHtml(errorText)}</div>

          <button id="auth-submit-btn" class="btn btn-green" type="submit" ${busy ? "disabled" : ""}>
            ${
              busy
                ? "Connecting..."
                : activeTab === "register"
                  ? "🚀 Create Account & Start"
                  : "🔑 Sign In & Load Progress"
            }
          </button>
        </form>

        ${
          allowGuest
            ? `
            <div class="auth-guest-divider"><span>or</span></div>
            <button id="auth-guest-btn" class="btn btn-ghost" style="width:100%;" type="button" ${busy ? "disabled" : ""}>
              🎮 ${
                currentUser
                  ? "Switch to Guest (This Browser Only)"
                  : guestHasProgress
                    ? "Continue Local Guest Progress"
                    : "Play as Guest (This Browser Only)"
              }
            </button>
          `
            : ""
        }
      </div>
    `;

    const usernameInput = wrap.querySelector("#auth-username");
    const pinInput = wrap.querySelector("#auth-pin");
    const inviteInput = wrap.querySelector("#auth-invite");
    const errorEl = wrap.querySelector("#auth-error");
    const submitBtn = wrap.querySelector("#auth-submit-btn");

    wrap.querySelector("#auth-close-btn")?.addEventListener("click", () => {
      if (!busy) closeModal();
    });

    wrap.querySelector("#auth-logout-btn")?.addEventListener("click", async () => {
      if (busy) return;
      busy = true;
      render();
      try {
        await onLogout?.();
        closeModal();
      } catch (err) {
        busy = false;
        errorText = err?.message || "Could not sign out.";
        render();
      }
    });

    wrap.querySelector("#auth-tab-login").addEventListener("click", () => {
      if (busy || activeTab === "login") return;
      activeTab = "login";
      errorText = "";
      render();
    });

    wrap.querySelector("#auth-tab-register").addEventListener("click", () => {
      if (busy || activeTab === "register") return;
      activeTab = "register";
      errorText = "";
      render();
    });

    wrap.querySelectorAll(".auth-chip-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        usernameInput.value = btn.dataset.user || "";
        pinInput.focus();
      });
    });

    const pinToggleBtn = wrap.querySelector("#auth-pin-toggle");
    pinToggleBtn.addEventListener("click", () => {
      if (busy) return;
      showPin = !showPin;
      pinInput.type = showPin ? "text" : "password";
      pinToggleBtn.textContent = showPin ? "🙈" : "👁️";
      pinInput.focus();
    });

    wrap.querySelector("#auth-guest-btn")?.addEventListener("click", async () => {
      if (busy) return;
      busy = true;
      submitBtn.disabled = true;
      try {
        await onContinueGuest?.();
        closeModal();
      } catch (err) {
        busy = false;
        errorText = err?.message || "Could not switch to Guest mode.";
        render();
      }
    });

    wrap.querySelector("#auth-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (busy) return;
      const username = usernameInput.value.trim();
      const pin = pinInput.value;
      const inviteCode = inviteInput ? inviteInput.value.trim() : "";

      busy = true;
      errorEl.style.display = "none";
      submitBtn.disabled = true;
      submitBtn.textContent = "Connecting...";

      try {
        if (activeTab === "register") {
          await onRegister({ username, pin, inviteCode });
        } else {
          await onLogin({ username, pin });
        }
        closeModal();
      } catch (err) {
        busy = false;
        submitBtn.disabled = false;
        submitBtn.textContent =
          activeTab === "register"
            ? "🚀 Create Account & Start"
            : "🔑 Sign In & Load Progress";
        errorEl.textContent = err?.message || "Could not complete request.";
        errorEl.style.display = "block";
        if (err?.status === 401 || err?.status === 429) {
          pinInput.select();
        }
      }
    });

    if (!currentUser && recentUsernames.length > 0 && activeTab === "login") {
      usernameInput.value = recentUsernames[0];
      pinInput.focus();
    } else {
      usernameInput.focus();
    }
  }

  if (canClose) {
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap && !busy) closeModal();
    });
  }

  render();
  root.appendChild(wrap);
}

export function showMigrateGuestModal({
  username,
  localState,
  onMoveToAccount,
  onDiscardGuest,
  onKeepSeparate,
}) {
  return new Promise((resolve) => {
    const root = document.getElementById("modal-root");
    closeAllModals();

    const completedCount = Object.keys(localState?.completedLessons || {}).length;
    const galleryCount = (localState?.sandboxGallery || []).length;

    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" style="max-width:480px;">
        <h2 style="margin-bottom:8px;">📦 Found Progress on This Browser!</h2>
        <p style="color:var(--text-muted); margin-top:0; line-height:1.5;">
          This browser already has local Guest progress:
          <strong>${completedCount} mission${completedCount === 1 ? "" : "s"}</strong>
          and <strong>⚡ ${localState?.xp || 0} XP</strong>${
            galleryCount > 0 ? `, plus <strong>${galleryCount} Sandbox drawing${galleryCount === 1 ? "" : "s"}</strong>` : ""
          }.
        </p>
        <p style="color:var(--text-muted); font-size:0.9rem;">
          Would you like to merge it into <strong>@${escapeHtml(username)}</strong>'s cloud account, keep it in Guest mode, or discard it?
        </p>
        <div id="mig-error" class="auth-error" style="display:none; margin-bottom:10px;"></div>
        <div style="display:flex; flex-direction:column; gap:10px; margin-top:14px;">
          <button id="mig-merge-btn" class="btn btn-green" type="button">
            ☁️ Merge Into @${escapeHtml(username)} (Keep Both!)
          </button>
          <button id="mig-skip-btn" class="btn btn-ghost btn-sm" type="button">
            Keep Separate in Guest Mode
          </button>
          <button id="mig-discard-btn" class="btn btn-ghost btn-sm" type="button" style="color:var(--coral-dark);">
            🗑️ Discard Browser Guest Progress
          </button>
        </div>
      </div>
    `;
    root.appendChild(wrap);

    const mergeBtn = wrap.querySelector("#mig-merge-btn");
    const skipBtn = wrap.querySelector("#mig-skip-btn");
    const discardBtn = wrap.querySelector("#mig-discard-btn");
    const errEl = wrap.querySelector("#mig-error");
    let busy = false;
    let settled = false;

    const finish = (outcome) => {
      if (settled) return;
      settled = true;
      unregisterModalCleanup(forceCancel);
      document.removeEventListener("keydown", onEsc);
      wrap.remove();
      resolve(outcome);
    };

    const forceCancel = () => finish("skipped");
    const onEsc = (e) => {
      if (e.key === "Escape" && !busy) {
        onKeepSeparate?.();
        finish("skipped");
      }
    };

    registerModalCleanup(forceCancel);
    document.addEventListener("keydown", onEsc);

    mergeBtn.addEventListener("click", async () => {
      if (busy) return;
      busy = true;
      mergeBtn.disabled = true;
      skipBtn.disabled = true;
      discardBtn.disabled = true;
      mergeBtn.textContent = "Merging progress...";
      try {
        await onMoveToAccount?.();
        finish("merged");
      } catch (err) {
        busy = false;
        mergeBtn.disabled = false;
        skipBtn.disabled = false;
        discardBtn.disabled = false;
        mergeBtn.textContent = `☁️ Merge Into @${username} (Keep Both!)`;
        errEl.textContent = err?.message || "Could not merge progress right now.";
        errEl.style.display = "block";
      }
    });

    skipBtn.addEventListener("click", () => {
      if (busy) return;
      onKeepSeparate?.();
      finish("skipped");
    });

    discardBtn.addEventListener("click", () => {
      if (busy) return;
      onDiscardGuest?.();
      finish("discarded");
    });
  });
}
