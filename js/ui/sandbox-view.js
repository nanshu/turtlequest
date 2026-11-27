import { SANDBOX_TEMPLATES } from "../curriculum/index.js";
import { CodeEditor } from "../editor/code-editor.js";
import { translatePythonError } from "../runtime/error-helper.js";
import { TurtlePlayer } from "../turtle/player.js";
import { TurtleRenderer } from "../turtle/renderer.js";
import { escapeHtml, formatInlineText } from "./format.js";
import { showInputModal } from "./modals.js";
import { soundFX } from "./sound.js";

const SPEEDS = [
  { id: "step", label: "Step" },
  { id: "slow", label: "Slow" },
  { id: "normal", label: "Normal" },
  { id: "fast", label: "Fast" },
  { id: "instant", label: "Instant" },
];

export function renderSandboxView(
  container,
  { state, runner, onSaveCode, onSaveGalleryItem, onDeleteGalleryItem, onBack }
) {
  const initialCode =
    state.sandboxCode && state.sandboxCode.trim().length > 0
      ? state.sandboxCode
      : SANDBOX_TEMPLATES[0].code;

  let showGrid = false;
  let isRunning = false;
  let activeRunPromise = null;
  let disposed = false;
  let inputAbortController = null;
  let saveTimer = null;

  function renderGalleryList(gallery) {
    if (!gallery || gallery.length === 0) {
      return `<p style="color:var(--text-muted); font-size:0.86rem; margin:6px 0 0;">No saved creations yet. Write cool code and click Save to Gallery!</p>`;
    }
    return `
      <div class="gallery-list">
        ${gallery
          .map(
            (item) => `
          <div class="gallery-item">
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              <span style="font-size:0.76rem; color:var(--text-muted); margin-left:6px;">
                ${new Date(item.savedAt).toLocaleDateString()}
              </span>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-blue btn-sm gallery-load-btn" data-id="${escapeHtml(
                item.id
              )}" type="button">Load</button>
              <button class="btn btn-ghost btn-sm gallery-del-btn" data-id="${escapeHtml(
                item.id
              )}" type="button">🗑️</button>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  container.innerHTML = `
    <div class="workspace-header">
      <div class="workspace-title-group">
        <button id="sb-back-btn" class="btn btn-ghost btn-sm" type="button">← Skill Path</button>
        <h2>🎨 Free-Draw Sandbox</h2>
        <span class="xp-badge" style="background:var(--blue-soft); color:var(--blue-dark); border-color:#b6e3fc;">
          Unlimited Experiments!
        </span>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <select id="sb-template-select" class="text-input" style="width:auto; padding:7px 10px; font-weight:700;">
          <option value="">✨ Load a Starter Idea...</option>
          ${SANDBOX_TEMPLATES.map((t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("")}
        </select>
        <button id="sb-png-btn" class="btn btn-purple btn-sm" type="button">📸 Save PNG</button>
      </div>
    </div>

    <div class="workspace-grid">
      <div class="workspace-col">
        <section class="card editor-card">
          <div class="editor-toolbar">
            <div class="editor-toolbar-left">
              <span class="editor-label">🐍 Sandbox Python</span>
              <span style="font-size:0.76rem; color:var(--text-soft);">Try colors, loops, circle(), dot(), input()!</span>
            </div>
            <div class="editor-toolbar-right">
              <button id="sb-stop-btn" class="btn btn-coral btn-sm" type="button" style="display:none;">⏹ Stop</button>
              <button id="sb-run-btn" class="btn btn-green btn-sm" type="button">▶ Run Art</button>
            </div>
          </div>
          <div id="sb-editor-mount" class="editor-mount"></div>
          <div id="sb-trace-strip" class="trace-status-strip"></div>
        </section>

        <section class="card" style="padding:14px 16px;">
          <div class="sandbox-toolbar-row" style="margin-bottom:8px;">
            <strong style="font-size:0.95rem;">🖼️ My Saved Gallery</strong>
            <div style="display:flex; gap:8px; align-items:center;">
              <input id="sb-save-name" class="text-input" type="text" placeholder="Drawing name..." style="width:165px; padding:6px 10px; font-size:0.86rem;" />
              <button id="sb-save-btn" class="btn btn-blue btn-sm" type="button">💾 Save</button>
            </div>
          </div>
          <div id="sb-gallery-mount">${renderGalleryList(state.sandboxGallery)}</div>
        </section>
      </div>

      <div class="workspace-col">
        <section class="card canvas-card">
          <div class="canvas-controls">
            <div class="speed-group" role="group">
              ${SPEEDS.map(
                (s) =>
                  `<button class="speed-btn ${s.id === "normal" ? "active" : ""}" data-speed="${
                    s.id
                  }" type="button">${s.label}</button>`
              ).join("")}
            </div>
            <div class="canvas-toggles">
              <button id="sb-step-next-btn" class="btn btn-gold btn-sm" type="button" style="display:none;">Next Step ⏭</button>
              <button id="sb-replay-btn" class="btn btn-ghost btn-sm" type="button" disabled>🔁 Replay</button>
              <button id="sb-grid-btn" class="toggle-chip" type="button"># Grid</button>
            </div>
          </div>

          <div class="canvas-stage-wrap">
            <canvas id="sb-canvas" class="turtle-canvas"></canvas>
            <div id="sb-hud" class="turtle-hud">X: 0 • Y: 0 • Heading: 0° • Pen: Down</div>
          </div>
        </section>

        <section class="card feedback-card">
          <div id="sb-error-box"></div>
          <div>
            <div style="font-size:0.8rem; font-weight:900; color:var(--text-muted); margin-bottom:5px;">
              📟 Console Output
            </div>
            <div id="sb-console" class="console-box">Experiment freely! Click Run Art to draw.</div>
          </div>
        </section>
      </div>
    </div>
  `;

  const editorMount = container.querySelector("#sb-editor-mount");
  const traceStrip = container.querySelector("#sb-trace-strip");
  const runBtn = container.querySelector("#sb-run-btn");
  const stopBtn = container.querySelector("#sb-stop-btn");
  const stepNextBtn = container.querySelector("#sb-step-next-btn");
  const replayBtn = container.querySelector("#sb-replay-btn");
  const hudEl = container.querySelector("#sb-hud");
  const consoleEl = container.querySelector("#sb-console");
  const errorBoxEl = container.querySelector("#sb-error-box");
  const galleryMount = container.querySelector("#sb-gallery-mount");

  const renderer = new TurtleRenderer(container.querySelector("#sb-canvas"), {
    skin: state.activeSkin,
    rainbowTrail: state.rainbowTrail,
  });

  let editor;
  const player = new TurtlePlayer(renderer, {
    onStep({ line, index, total }) {
      if (editor) editor.setActiveLine(line || null);
      if (player.speedMode === "step" && total > 0) {
        traceStrip.classList.add("visible");
        traceStrip.textContent = line
          ? `Step ${index}/${total} — Running line ${line}`
          : `Step ${index}/${total} — Done!`;
      } else {
        traceStrip.classList.remove("visible");
      }
    },
    onStateChange(ts) {
      hudEl.textContent = `X: ${Math.round(ts.x)} • Y: ${Math.round(ts.y)} • Heading: ${Math.round(
        ((ts.heading % 360) + 360) % 360
      )}° • Pen: ${ts.penDown ? "Down" : "Up"}`;
    },
    onFinish() {
      if (editor) editor.setActiveLine(null);
    },
  });

  editor = new CodeEditor(editorMount, {
    initialCode,
    onChange(code) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => onSaveCode(code), 280);
    },
    onRunShortcut() {
      runSandbox();
    },
  });

  function bindGalleryEvents() {
    galleryMount.querySelectorAll(".gallery-load-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        soundFX.playClick();
        const item = (state.sandboxGallery || []).find((g) => g.id === btn.dataset.id);
        if (item) {
          loadAndRun(item.code);
        }
      });
    });
    galleryMount.querySelectorAll(".gallery-del-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        soundFX.playClick();
        const nextGallery = onDeleteGalleryItem(btn.dataset.id);
        state.sandboxGallery = nextGallery;
        galleryMount.innerHTML = renderGalleryList(nextGallery);
        bindGalleryEvents();
      });
    });
  }
  bindGalleryEvents();

  async function loadAndRun(code) {
    editor.setCode(code);
    onSaveCode(code);
    if (isRunning) {
      runner.stop("superseded");
      if (activeRunPromise) {
        await activeRunPromise.catch(() => {});
      }
    }
    if (!disposed) {
      runSandbox();
    }
  }

  function runSandbox() {
    if (isRunning || disposed) return activeRunPromise;
    const p = executeSandboxRun().finally(() => {
      if (activeRunPromise === p) activeRunPromise = null;
    });
    activeRunPromise = p;
    return p;
  }

  async function executeSandboxRun() {
    if (isRunning || disposed) return;
    soundFX.playClick();

    const code = editor.getCode();
    onSaveCode(code);
    editor.clearHighlights();
    errorBoxEl.innerHTML = "";

    isRunning = true;
    runBtn.disabled = true;
    stopBtn.style.display = "inline-flex";
    replayBtn.disabled = true;
    consoleEl.textContent = "Running Python...";

    let liveStdout = "";
    let streamedCount = 0;
    let tapeInitialized = false;
    inputAbortController = new AbortController();
    player.reset();

    try {
      const res = await runner.run(code, {
        onStream({ stdoutDelta, commandsDelta }) {
          if (disposed) return;
          if (stdoutDelta) {
            liveStdout += stdoutDelta;
            consoleEl.textContent = liveStdout;
          }
          if (commandsDelta && commandsDelta.length > 0) {
            if (!tapeInitialized) {
              tapeInitialized = true;
              player.loadTape(commandsDelta, "#ffffff", { autoPlay: true, final: false });
            } else {
              player.appendCommands(commandsDelta, { final: false });
            }
            streamedCount += commandsDelta.length;
          }
        },
        onInputRequest: async (promptText) => {
          if (disposed) return null;
          return showInputModal(promptText, { signal: inputAbortController.signal });
        },
      });

      if (disposed) return;

      const finalStdout = res.stdout || liveStdout;
      consoleEl.textContent = finalStdout.trim()
        ? finalStdout
        : "(Program finished with no print() output)";

      if (!res.ok) {
        soundFX.playError();
        const errInfo = translatePythonError(res.error, code);
        if (errInfo.line) editor.setErrorLine(errInfo.line);
        errorBoxEl.innerHTML = `
          <div class="error-panel">
            <h4>🐛 ${formatInlineText(errInfo.title)}</h4>
            <p>${formatInlineText(errInfo.explanation)}</p>
            <div class="error-tip">💡 Tip: ${formatInlineText(errInfo.tip)}</div>
          </div>
        `;
        return;
      }

      const commands = res.turtleData?.commands || [];
      const bgcolor = res.turtleData?.bgcolor || "#ffffff";
      replayBtn.disabled = commands.length === 0;

      if (tapeInitialized) {
        const remaining = commands.slice(streamedCount);
        if (remaining.length > 0) player.appendCommands(remaining, { final: true });
        else player.finishStream();
      } else {
        player.loadTape(commands, bgcolor, { autoPlay: true, final: true });
      }
    } catch (err) {
      if (disposed) return;
      soundFX.playError();
      consoleEl.textContent = "Could not run Python right now.";
      errorBoxEl.innerHTML = `
        <div class="error-panel">
          <h4>🐛 Python Engine Offline</h4>
          <p>${escapeHtml(err && err.message ? err.message : "Could not start Python.")}</p>
          <div class="error-tip">💡 Tip: Check your internet connection and click Run Art again!</div>
        </div>
      `;
    } finally {
      inputAbortController = null;
      isRunning = false;
      if (!disposed) {
        runBtn.disabled = false;
        stopBtn.style.display = "none";
      }
    }
  }

  container.querySelector("#sb-back-btn").addEventListener("click", onBack);
  runBtn.addEventListener("click", runSandbox);
  stopBtn.addEventListener("click", () => runner.stop("user"));

  container.querySelector("#sb-template-select").addEventListener("change", (e) => {
    const tpl = SANDBOX_TEMPLATES.find((t) => t.id === e.target.value);
    if (!tpl) return;
    soundFX.playClick();
    e.target.value = "";
    loadAndRun(tpl.code);
  });

  container.querySelector("#sb-png-btn").addEventListener("click", () => {
    soundFX.playCorrect();
    renderer.exportPNG(`turtlequest-${Date.now()}.png`);
  });

  container.querySelector("#sb-save-btn").addEventListener("click", () => {
    const nameInput = container.querySelector("#sb-save-name");
    const name = nameInput.value.trim() || `Creation ${(state.sandboxGallery?.length || 0) + 1}`;
    soundFX.playCorrect();
    const nextGallery = onSaveGalleryItem({
      id: `art-${Date.now()}`,
      name,
      code: editor.getCode(),
      savedAt: new Date().toISOString(),
    });
    state.sandboxGallery = nextGallery;
    nameInput.value = "";
    galleryMount.innerHTML = renderGalleryList(nextGallery);
    bindGalleryEvents();
  });

  container.querySelectorAll(".speed-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      soundFX.playClick();
      const mode = btn.dataset.speed;
      container.querySelectorAll(".speed-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      stepNextBtn.style.display = mode === "step" ? "inline-flex" : "none";
      player.setSpeed(mode);
    });
  });

  stepNextBtn.addEventListener("click", () => {
    soundFX.playStep();
    player.stepNext();
  });

  replayBtn.addEventListener("click", () => {
    soundFX.playClick();
    player.replay();
  });

  const gridBtn = container.querySelector("#sb-grid-btn");
  gridBtn.addEventListener("click", () => {
    soundFX.playClick();
    showGrid = !showGrid;
    gridBtn.classList.toggle("active", showGrid);
    renderer.setShowGrid(showGrid);
  });

  return {
    updateAppearance({ skin, rainbowTrail }) {
      if (skin) renderer.setSkin(skin);
      if (typeof rainbowTrail === "boolean") renderer.setRainbowTrail(rainbowTrail);
    },
    cleanup({ saveDraft = true } = {}) {
      disposed = true;
      clearTimeout(saveTimer);
      if (saveDraft) {
        onSaveCode(editor.getCode());
      }
      inputAbortController?.abort();
      if (isRunning) runner.stop("cleanup");
      player.reset();
      renderer.destroy();
      editor.destroy();
    },
  };
}
