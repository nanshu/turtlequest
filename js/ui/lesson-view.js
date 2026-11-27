import { CodeEditor } from "../editor/code-editor.js";
import { translatePythonError } from "../runtime/error-helper.js";
import { TurtlePlayer } from "../turtle/player.js";
import { TurtleRenderer } from "../turtle/renderer.js";
import { verifyMission } from "../verifier/checker.js";
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

export function renderLessonView(
  container,
  lesson,
  { state, runner, onSaveDraft, onBack, onPass }
) {
  const savedDraft = state.draftCode?.[lesson.id];
  const initialCode = typeof savedDraft === "string" && savedDraft.length > 0
    ? savedDraft
    : lesson.starterCode;

  let hintsRevealed = 0;
  let showGrid = Boolean(lesson.showGridDefault);
  let showBlueprint = Boolean(lesson.blueprint && lesson.blueprint.length > 0);
  let isRunning = false;
  let disposed = false;
  let inputAbortController = null;
  let pendingVictory = null;
  let saveTimer = null;

  container.innerHTML = `
    <div class="workspace-header">
      <div class="workspace-title-group">
        <button id="ws-back-btn" class="btn btn-ghost btn-sm" type="button">← Skill Path</button>
        <h2>${lesson.icon} ${escapeHtml(lesson.title)}</h2>
        <span class="xp-badge">⚡ +${lesson.xp} XP${lesson.bonusXp ? ` (+${lesson.bonusXp} Bonus)` : ""}</span>
      </div>
    </div>

    <div class="workspace-grid">
      <div class="workspace-col">
        <section class="card mission-card">
          <p class="mission-story">${formatInlineText(lesson.story)}</p>
          ${
            lesson.mathTip
              ? `<div class="math-tip-box">📐 <strong>Math Power:</strong> ${formatInlineText(lesson.mathTip)}</div>`
              : ""
          }
          <ul class="goals-list" id="ws-goals-list">
            ${lesson.goals
              .map(
                (g) => `<li class="goal-item"><span>⬜</span><span>${formatInlineText(g)}</span></li>`
              )
              .join("")}
          </ul>
          ${
            lesson.bonusGoal
              ? `<div class="goal-item bonus" id="ws-bonus-goal" style="margin-top:8px;"><span>⭐</span><span>${formatInlineText(
                  lesson.bonusGoal
                )}</span></div>`
              : ""
          }

          <div class="hints-bar">
            <div class="hints-actions">
              <button id="ws-hint-btn" class="btn btn-ghost btn-sm" type="button">
                💡 Need a Hint? (0/${lesson.hints.length})
              </button>
              <button id="ws-reset-btn" class="btn btn-ghost btn-sm" type="button">↺ Reset Code</button>
            </div>
            <div id="ws-hints-list" style="display:flex; flex-direction:column; gap:6px;"></div>
          </div>
        </section>

        <section class="card editor-card">
          <div class="editor-toolbar">
            <div class="editor-toolbar-left">
              <span class="editor-label">🐍 Python Editor</span>
              <span style="font-size:0.76rem; color:var(--text-soft);">Cmd/Ctrl + Enter to run</span>
            </div>
            <div class="editor-toolbar-right">
              <button id="ws-stop-btn" class="btn btn-coral btn-sm" type="button" style="display:none;">⏹ Stop</button>
              <button id="ws-run-btn" class="btn btn-green btn-sm" type="button">▶ Run Code</button>
            </div>
          </div>
          <div id="ws-editor-mount" class="editor-mount"></div>
          <div id="ws-trace-strip" class="trace-status-strip"></div>
        </section>
      </div>

      <div class="workspace-col">
        <section class="card canvas-card">
          <div class="canvas-controls">
            <div class="speed-group" role="group" aria-label="Animation Speed">
              ${SPEEDS.map(
                (s) =>
                  `<button class="speed-btn ${s.id === "normal" ? "active" : ""}" data-speed="${
                    s.id
                  }" type="button">${s.label}</button>`
              ).join("")}
            </div>
            <div class="canvas-toggles">
              <button id="ws-step-next-btn" class="btn btn-gold btn-sm" type="button" style="display:none;">
                Next Step ⏭
              </button>
              <button id="ws-replay-btn" class="btn btn-ghost btn-sm" type="button" disabled>🔁 Replay</button>
              <button id="ws-grid-btn" class="toggle-chip ${showGrid ? "active" : ""}" type="button">
                # Grid
              </button>
              ${
                lesson.blueprint
                  ? `<button id="ws-bp-btn" class="toggle-chip ${showBlueprint ? "active" : ""}" type="button">
                      👻 Blueprint
                    </button>`
                  : ""
              }
            </div>
          </div>

          <div class="canvas-stage-wrap">
            <canvas id="ws-canvas" class="turtle-canvas"></canvas>
            <div id="ws-hud" class="turtle-hud">X: 0 • Y: 0 • Heading: 0° • Pen: Down</div>
          </div>
        </section>

        <section class="card feedback-card">
          <div id="ws-mission-result"></div>
          <div id="ws-error-box"></div>
          <div>
            <div style="font-size:0.8rem; font-weight:900; color:var(--text-muted); margin-bottom:5px;">
              📟 Console Output (print)
            </div>
            <div id="ws-console" class="console-box">Ready! Click Run Code to start your turtle.</div>
          </div>
        </section>
      </div>
    </div>
  `;

  const editorMount = container.querySelector("#ws-editor-mount");
  const traceStrip = container.querySelector("#ws-trace-strip");
  const runBtn = container.querySelector("#ws-run-btn");
  const stopBtn = container.querySelector("#ws-stop-btn");
  const stepNextBtn = container.querySelector("#ws-step-next-btn");
  const replayBtn = container.querySelector("#ws-replay-btn");
  const hudEl = container.querySelector("#ws-hud");
  const consoleEl = container.querySelector("#ws-console");
  const errorBoxEl = container.querySelector("#ws-error-box");
  const resultEl = container.querySelector("#ws-mission-result");
  const goalsListEl = container.querySelector("#ws-goals-list");
  const bonusGoalEl = container.querySelector("#ws-bonus-goal");
  const hintBtn = container.querySelector("#ws-hint-btn");
  const hintsListEl = container.querySelector("#ws-hints-list");

  const canvasEl = container.querySelector("#ws-canvas");
  const renderer = new TurtleRenderer(canvasEl, {
    skin: state.activeSkin,
    rainbowTrail: state.rainbowTrail,
  });
  renderer.setShowGrid(showGrid);
  renderer.setShowBlueprint(showBlueprint);
  if (lesson.blueprint) renderer.setBlueprint(lesson.blueprint);

  let editor;
  const player = new TurtlePlayer(renderer, {
    onStep({ line, index, total }) {
      if (editor) editor.setActiveLine(line || null);
      if (player.speedMode === "step" && total > 0) {
        traceStrip.classList.add("visible");
        traceStrip.textContent = line
          ? `Step ${index}/${total} — Running line ${line}`
          : `Step ${index}/${total} — Finished!`;
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
      if (pendingVictory) {
        const v = pendingVictory;
        pendingVictory = null;
        onPass(v);
      }
    },
  });

  editor = new CodeEditor(editorMount, {
    initialCode,
    onChange(code) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => onSaveDraft(lesson.id, code), 280);
    },
    onRunShortcut() {
      runCode();
    },
  });

  function renderHints() {
    hintBtn.textContent =
      hintsRevealed >= lesson.hints.length
        ? `💡 All Hints Shown (${hintsRevealed}/${lesson.hints.length})`
        : `💡 Need a Hint? (${hintsRevealed}/${lesson.hints.length})`;
    hintBtn.disabled = hintsRevealed >= lesson.hints.length;
    hintsListEl.innerHTML = lesson.hints
      .slice(0, hintsRevealed)
      .map(
        (h, i) =>
          `<div class="hint-box"><strong>Hint ${i + 1}:</strong> ${formatInlineText(h)}</div>`
      )
      .join("");
  }

  function renderGoals(goals, bonusPassed) {
    goalsListEl.innerHTML = goals
      .map(
        (g) =>
          `<li class="goal-item ${g.passed ? "passed" : ""}"><span>${
            g.passed ? "✅" : "⬜"
          }</span><span>${formatInlineText(g.label)}</span></li>`
      )
      .join("");
    if (bonusGoalEl && lesson.bonusGoal) {
      bonusGoalEl.className = `goal-item ${bonusPassed ? "passed" : "bonus"}`;
      bonusGoalEl.innerHTML = `<span>${bonusPassed ? "🌟" : "⭐"}</span><span>${formatInlineText(
        lesson.bonusGoal
      )}</span>`;
    }
  }

  function renderError(errInfo) {
    if (!errInfo) {
      errorBoxEl.innerHTML = "";
      return;
    }
    errorBoxEl.innerHTML = `
      <div class="error-panel">
        <h4>🐛 ${formatInlineText(errInfo.title)}</h4>
        <p>${formatInlineText(errInfo.explanation)}</p>
        <div class="error-tip">💡 Tip: ${formatInlineText(errInfo.tip)}</div>
        <details class="raw-trace-details">
          <summary>Peek at Python's original error</summary>
          <pre>${escapeHtml(errInfo.rawTraceback)}</pre>
        </details>
      </div>
    `;
  }

  async function runCode() {
    if (isRunning || disposed) return;
    soundFX.playClick();

    const code = editor.getCode();
    onSaveDraft(lesson.id, code);
    editor.clearHighlights();
    errorBoxEl.innerHTML = "";
    resultEl.innerHTML = "";
    pendingVictory = null;

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
            consoleEl.textContent = liveStdout || "(no print output)";
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
        : "(Program ran with no print() output)";

      if (!res.ok) {
        soundFX.playError();
        const errInfo = translatePythonError(res.error, code);
        if (errInfo.line) editor.setErrorLine(errInfo.line);
        renderError(errInfo);
        return;
      }

      const commands = res.turtleData?.commands || [];
      const bgcolor = res.turtleData?.bgcolor || "#ffffff";
      replayBtn.disabled = commands.length === 0;

      const checkRes = verifyMission(lesson, res);
      renderGoals(checkRes.goals, checkRes.bonusPassed);

      resultEl.innerHTML = `
        <div class="mission-feedback ${checkRes.passed ? "pass" : "retry"}">
          ${checkRes.passed ? "🎉 " : "🧭 "}${formatInlineText(checkRes.feedback)}
        </div>
      `;

      if (checkRes.passed) {
        pendingVictory = {
          xpReward: lesson.xp,
          bonusReward: lesson.bonusXp || 0,
          bonusEarned: checkRes.bonusPassed,
          bonusFeedback: checkRes.bonusFeedback,
          feedback: checkRes.feedback,
        };
      } else {
        soundFX.playStep();
      }

      if (tapeInitialized) {
        const remaining = commands.slice(streamedCount);
        if (remaining.length > 0) {
          player.appendCommands(remaining, { final: true });
        } else {
          player.finishStream();
        }
        if (pendingVictory && player.isFinished()) {
          const v = pendingVictory;
          pendingVictory = null;
          onPass(v);
        }
      } else {
        player.loadTape(commands, bgcolor, { autoPlay: true, final: true });
      }
    } catch (err) {
      if (disposed) return;
      soundFX.playError();
      consoleEl.textContent = "Could not run Python right now.";
      renderError({
        title: "Python Engine Offline",
        explanation: err && err.message ? err.message : "Could not start the Python runtime.",
        tip: "Check your internet connection (first load downloads Python) and try clicking Run again!",
        line: null,
        rawTraceback: err && err.stack ? err.stack : String(err),
      });
    } finally {
      inputAbortController = null;
      isRunning = false;
      if (!disposed) {
        runBtn.disabled = false;
        stopBtn.style.display = "none";
      }
    }
  }

  // Event wiring
  container.querySelector("#ws-back-btn").addEventListener("click", onBack);
  runBtn.addEventListener("click", runCode);
  stopBtn.addEventListener("click", () => {
    runner.stop("user");
  });

  hintBtn.addEventListener("click", () => {
    soundFX.playClick();
    if (hintsRevealed < lesson.hints.length) {
      hintsRevealed += 1;
      renderHints();
    }
  });

  container.querySelector("#ws-reset-btn").addEventListener("click", () => {
    soundFX.playClick();
    editor.setCode(lesson.starterCode);
    onSaveDraft(lesson.id, lesson.starterCode);
    errorBoxEl.innerHTML = "";
    resultEl.innerHTML = "";
    player.reset();
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
    pendingVictory = null;
    player.replay();
  });

  const gridBtn = container.querySelector("#ws-grid-btn");
  gridBtn.addEventListener("click", () => {
    soundFX.playClick();
    showGrid = !showGrid;
    gridBtn.classList.toggle("active", showGrid);
    renderer.setShowGrid(showGrid);
  });

  const bpBtn = container.querySelector("#ws-bp-btn");
  if (bpBtn) {
    bpBtn.addEventListener("click", () => {
      soundFX.playClick();
      showBlueprint = !showBlueprint;
      bpBtn.classList.toggle("active", showBlueprint);
      renderer.setShowBlueprint(showBlueprint);
    });
  }

  return {
    updateAppearance({ skin, rainbowTrail }) {
      if (skin) renderer.setSkin(skin);
      if (typeof rainbowTrail === "boolean") renderer.setRainbowTrail(rainbowTrail);
    },
    cleanup({ saveDraft = true } = {}) {
      disposed = true;
      clearTimeout(saveTimer);
      if (saveDraft) {
        onSaveDraft(lesson.id, editor.getCode());
      }
      inputAbortController?.abort();
      if (isRunning) runner.stop("cleanup");
      player.reset();
      renderer.destroy();
      editor.destroy();
    },
  };
}
