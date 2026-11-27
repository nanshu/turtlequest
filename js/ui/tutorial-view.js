import { escapeHtml, formatInlineText } from "./format.js";
import { soundFX } from "./sound.js";

export function renderVisualDiagram(kind) {
  if (kind === "anatomy") {
    return `
      <div class="tutorial-diagram-card">
        <div class="anatomy-row">
          <div class="anatomy-pill pill-green"><code>t</code><span>Who (your turtle)</span></div>
          <div class="anatomy-dot">.</div>
          <div class="anatomy-pill pill-blue"><code>forward</code><span>Action (command)</span></div>
          <div class="anatomy-pill pill-purple"><code>(100)</code><span>How much (input)</span></div>
        </div>
      </div>
    `;
  }

  if (kind === "exterior-angle") {
    return `
      <div class="tutorial-diagram-card">
        <svg viewBox="0 0 340 155" class="tutorial-svg" role="img" aria-label="Interior 60 degree angle vs Exterior 120 degree turn">
          <line x1="35" y1="120" x2="215" y2="120" stroke="#ef4444" stroke-width="4" stroke-linecap="round" />
          <line x1="215" y1="120" x2="310" y2="120" stroke="#94a3b8" stroke-width="2.5" stroke-dasharray="6,6" />
          <line x1="215" y1="120" x2="125" y2="25" stroke="#3b82f6" stroke-width="4" stroke-linecap="round" />
          <line x1="125" y1="25" x2="35" y2="120" stroke="#cbd5e1" stroke-width="2.5" stroke-dasharray="5,5" />
          <!-- Interior 60 deg arc -->
          <path d="M 183 120 A 32 32 0 0 1 193 97" fill="none" stroke="#16a34a" stroke-width="3" />
          <text x="150" y="106" font-size="13" font-weight="800" fill="#15803d">60° inside</text>
          <!-- Exterior 120 deg arc -->
          <path d="M 250 120 A 35 35 0 0 0 191 94" fill="none" stroke="#f59e0b" stroke-width="3.5" />
          <text x="225" y="72" font-size="13" font-weight="900" fill="#b45309">120° turtle turn!</text>
          <text x="222" y="140" font-size="11" font-weight="700" fill="#64748b">straight ahead (180°)</text>
          <circle cx="215" cy="120" r="6" fill="#22c55e" stroke="#14532d" stroke-width="2" />
        </svg>
      </div>
    `;
  }

  if (kind === "loop-compare") {
    return `
      <div class="tutorial-diagram-card compare-grid">
        <div>
          <div class="compare-label bad">😓 Without a Loop (8 lines)</div>
          <pre class="mini-code-block"><code>t.forward(100)
t.right(90)
t.forward(100)
t.right(90)
t.forward(100)
t.right(90)
t.forward(100)
t.right(90)</code></pre>
        </div>
        <div>
          <div class="compare-label good">⚡ With a for Loop (3 lines!)</div>
          <pre class="mini-code-block"><code>for i in range(4):
    t.forward(100)
    t.right(90)</code></pre>
        </div>
      </div>
    `;
  }

  if (kind === "variable-boxes") {
    return `
      <div class="tutorial-diagram-card var-boxes-row">
        <div class="var-box">
          <div class="var-box-label">sides</div>
          <div class="var-box-val">5</div>
        </div>
        <div class="var-box">
          <div class="var-box-label">length</div>
          <div class="var-box-val">90</div>
        </div>
        <div class="var-box accent">
          <div class="var-box-label">angle = 360 / sides</div>
          <div class="var-box-val">72.0</div>
        </div>
      </div>
    `;
  }

  return "";
}

function mountTurtleTapWidget(mountEl) {
  const state = {
    x: 0,
    y: 0,
    heading: 0,
    color: "#3b82f6",
    lines: ["import turtle", "t = turtle.Turtle()"],
    segments: [],
  };

  mountEl.innerHTML = `
    <div class="widget-box turtle-tap-widget">
      <div class="widget-controls">
        <button class="btn btn-green btn-sm" data-act="fwd" type="button">⬆️ t.forward(60)</button>
        <button class="btn btn-blue btn-sm" data-act="right" type="button">↪️ t.right(90)</button>
        <button class="btn btn-blue btn-sm" data-act="left" type="button">↩️ t.left(90)</button>
        <button class="btn btn-purple btn-sm" data-act="color" type="button">🎨 Change Color</button>
        <button class="btn btn-ghost btn-sm" data-act="reset" type="button">↺ Clear</button>
      </div>
      <div class="widget-split">
        <canvas class="mini-turtle-canvas" width="260" height="190"></canvas>
        <pre class="mini-code-block live-code-preview"></pre>
      </div>
    </div>
  `;

  const canvas = mountEl.querySelector(".mini-turtle-canvas");
  const ctx = canvas.getContext("2d");
  const codePre = mountEl.querySelector(".live-code-preview");
  const palette = [
    { name: "blue", hex: "#3b82f6" },
    { name: "coral", hex: "#fb7185" },
    { name: "green", hex: "#22c55e" },
    { name: "purple", hex: "#a855f7" },
    { name: "orange", hex: "#f97316" },
  ];
  let colorIdx = 0;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle origin cross
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 95);
    ctx.lineTo(260, 95);
    ctx.moveTo(130, 0);
    ctx.lineTo(130, 190);
    ctx.stroke();

    for (const s of state.segments) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(130 + s.x1, 95 - s.y1);
      ctx.lineTo(130 + s.x2, 95 - s.y2);
      ctx.stroke();
    }

    // Mini turtle arrow
    ctx.save();
    ctx.translate(130 + state.x, 95 - state.y);
    ctx.rotate((-state.heading * Math.PI) / 180);
    ctx.fillStyle = "#16a34a";
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.lineTo(-7, -7);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    codePre.textContent = state.lines.slice(-9).join("\n");
  }

  mountEl.querySelectorAll("[data-act]").forEach((btn) => {
    btn.addEventListener("click", () => {
      soundFX.playStep();
      const act = btn.dataset.act;
      if (act === "fwd") {
        const rad = (state.heading * Math.PI) / 180;
        const nx = Math.max(-110, Math.min(110, state.x + 60 * Math.cos(rad)));
        const ny = Math.max(-75, Math.min(75, state.y + 60 * Math.sin(rad)));
        state.segments.push({ x1: state.x, y1: state.y, x2: nx, y2: ny, color: state.color });
        state.x = nx;
        state.y = ny;
        state.lines.push("t.forward(60)");
      } else if (act === "right") {
        state.heading = (state.heading - 90 + 360) % 360;
        state.lines.push("t.right(90)");
      } else if (act === "left") {
        state.heading = (state.heading + 90) % 360;
        state.lines.push("t.left(90)");
      } else if (act === "color") {
        colorIdx = (colorIdx + 1) % palette.length;
        state.color = palette[colorIdx].hex;
        state.lines.push(`t.pencolor("${palette[colorIdx].name}")`);
      } else if (act === "reset") {
        state.x = 0;
        state.y = 0;
        state.heading = 0;
        state.segments = [];
        state.lines = ["import turtle", "t = turtle.Turtle()"];
      }
      draw();
    });
  });

  draw();
}

function mountPolygonSliderWidget(mountEl) {
  let sides = 5;
  const names = {
    3: "Equilateral Triangle",
    4: "Square",
    5: "Pentagon",
    6: "Hexagon",
    7: "Heptagon",
    8: "Octagon",
    9: "Nonagon",
    10: "Decagon",
    12: "Dodecagon",
  };

  function renderWidget() {
    const angle = Number((360 / sides).toFixed(1));
    const r = 64;
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
      pts.push(`${(95 + r * Math.cos(a)).toFixed(1)},${(85 + r * Math.sin(a)).toFixed(1)}`);
    }

    mountEl.innerHTML = `
      <div class="widget-box">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:10px;">
          <label style="font-weight:900;">
            Sides: <span style="color:var(--blue-dark); font-size:1.1rem;">${sides}</span>
            <span style="color:var(--text-muted); font-weight:700;">(${names[sides] || `${sides}-gon`})</span>
          </label>
          <input id="poly-slider" type="range" min="3" max="12" value="${sides}" style="flex:1; min-width:150px;" />
          <span class="xp-badge">360 ÷ ${sides} = ${angle}°</span>
        </div>
        <div class="widget-split">
          <svg viewBox="0 0 190 170" class="mini-turtle-canvas" style="height:170px;">
            <polygon points="${pts.join(" ")}" fill="rgba(28, 176, 246, 0.16)" stroke="#1cb0f6" stroke-width="3.5" stroke-linejoin="round" />
          </svg>
          <pre class="mini-code-block live-code-preview"><code>for i in range(${sides}):
    t.forward(70)
    t.right(360 / ${sides})  # ${angle}°</code></pre>
        </div>
      </div>
    `;

    mountEl.querySelector("#poly-slider").addEventListener("input", (e) => {
      sides = Number(e.target.value);
      soundFX.playStep();
      renderWidget();
    });
  }

  renderWidget();
}

function mountCoordPickerWidget(mountEl) {
  let px = 100;
  let py = 60;

  function quadrantLabel(x, y) {
    if (x > 0 && y > 0) return "Quadrant I (+x, +y)";
    if (x < 0 && y > 0) return "Quadrant II (-x, +y)";
    if (x < 0 && y < 0) return "Quadrant III (-x, -y)";
    if (x > 0 && y < 0) return "Quadrant IV (+x, -y)";
    return "On an Axis";
  }

  function renderWidget() {
    const cx = 130 + (px / 200) * 110;
    const cy = 95 - (py / 150) * 75;

    mountEl.innerHTML = `
      <div class="widget-box">
        <div class="widget-controls" style="margin-bottom:8px;">
          <button class="btn btn-ghost btn-sm" data-pt="100,80" type="button">Q1 (100, 80)</button>
          <button class="btn btn-ghost btn-sm" data-pt="-100,80" type="button">Q2 (-100, 80)</button>
          <button class="btn btn-ghost btn-sm" data-pt="-100,-80" type="button">Q3 (-100, -80)</button>
          <button class="btn btn-ghost btn-sm" data-pt="100,-80" type="button">Q4 (100, -80)</button>
        </div>
        <div class="widget-split">
          <svg id="coord-svg" viewBox="0 0 260 190" class="mini-turtle-canvas" style="cursor:crosshair;">
            <rect x="0" y="0" width="260" height="190" fill="#ffffff" />
            <line x1="0" y1="95" x2="260" y2="95" stroke="#64748b" stroke-width="1.5" />
            <line x1="130" y1="0" x2="130" y2="190" stroke="#64748b" stroke-width="1.5" />
            <text x="195" y="22" font-size="10" fill="#94a3b8" font-weight="800">Q1 (+, +)</text>
            <text x="14" y="22" font-size="10" fill="#94a3b8" font-weight="800">Q2 (-, +)</text>
            <text x="14" y="180" font-size="10" fill="#94a3b8" font-weight="800">Q3 (-, -)</text>
            <text x="195" y="180" font-size="10" fill="#94a3b8" font-weight="800">Q4 (+, -)</text>
            <line x1="130" y1="95" x2="${cx}" y2="${cy}" stroke="#a855f7" stroke-width="2.5" stroke-dasharray="4,4" />
            <circle cx="${cx}" cy="${cy}" r="7" fill="#22c55e" stroke="#14532d" stroke-width="2" />
          </svg>
          <div>
            <div style="font-weight:900; font-size:0.86rem; color:var(--purple-dark); margin-bottom:6px;">
              ${quadrantLabel(px, py)}
            </div>
            <pre class="mini-code-block live-code-preview"><code>t.goto(${px}, ${py})
t.dot(14, "gold")</code></pre>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-top:6px;">
              Click anywhere on the grid to move the turtle!
            </div>
          </div>
        </div>
      </div>
    `;

    mountEl.querySelectorAll("[data-pt]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const [x, y] = btn.dataset.pt.split(",").map(Number);
        px = x;
        py = y;
        soundFX.playStep();
        renderWidget();
      });
    });

    const svg = mountEl.querySelector("#coord-svg");
    svg.addEventListener("click", (e) => {
      const rect = svg.getBoundingClientRect();
      const sx = ((e.clientX - rect.left) / rect.width) * 260;
      const sy = ((e.clientY - rect.top) / rect.height) * 190;
      px = Math.round((((sx - 130) / 110) * 200) / 10) * 10;
      py = Math.round((((95 - sy) / 75) * 150) / 10) * 10;
      px = Math.max(-200, Math.min(200, px));
      py = Math.max(-150, Math.min(150, py));
      soundFX.playStep();
      renderWidget();
    });
  }

  renderWidget();
}

export function renderTutorialView(container, node, { onBack, onComplete }) {
  const steps = node.steps || [];
  let idx = 0;

  function render() {
    const step = steps[idx];
    const pct = Math.round(((idx + 1) / steps.length) * 100);
    const isLast = idx >= steps.length - 1;

    container.innerHTML = `
      <div class="card tutorial-container">
        <div class="quiz-progress-row">
          <button id="tut-back-btn" class="btn btn-ghost btn-sm" type="button">← Path</button>
          <div class="quiz-progress-track">
            <div class="quiz-progress-fill" style="width:${pct}%"></div>
          </div>
          <span style="font-weight:900; font-size:0.85rem; color:var(--text-muted);">
            Step ${idx + 1} / ${steps.length}
          </span>
        </div>

        <div class="xp-badge" style="display:inline-block; margin-bottom:10px;">
          ${escapeHtml(step.badge || node.title)}
        </div>

        <h2 style="margin:0 0 10px; font-size:1.4rem; font-weight:900;">${escapeHtml(step.title)}</h2>
        <p class="tutorial-body">${formatInlineText(step.body)}</p>

        ${step.diagram ? renderVisualDiagram(step.diagram) : ""}
        ${step.code ? `<pre class="quiz-code-block"><code>${escapeHtml(step.code)}</code></pre>` : ""}
        ${step.widget ? `<div id="tut-widget-mount"></div>` : ""}

        ${
          step.callout
            ? `<div class="math-tip-box" style="margin-top:12px;">💡 ${formatInlineText(step.callout)}</div>`
            : ""
        }

        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:18px;">
          <button id="tut-prev-btn" class="btn btn-ghost" type="button" ${idx === 0 ? "disabled" : ""}>
            ← Previous
          </button>
          <button id="tut-next-btn" class="btn btn-green" type="button">
            ${isLast ? "Got It! Unlock Coding Mission ➜" : "Next Step ➜"}
          </button>
        </div>
      </div>
    `;

    const widgetMount = container.querySelector("#tut-widget-mount");
    if (widgetMount) {
      if (step.widget === "turtle-tap") mountTurtleTapWidget(widgetMount);
      else if (step.widget === "polygon-slider") mountPolygonSliderWidget(widgetMount);
      else if (step.widget === "coord-picker") mountCoordPickerWidget(widgetMount);
    }

    container.querySelector("#tut-back-btn").addEventListener("click", onBack);
    container.querySelector("#tut-prev-btn").addEventListener("click", () => {
      if (idx > 0) {
        soundFX.playClick();
        idx -= 1;
        render();
      }
    });
    container.querySelector("#tut-next-btn").addEventListener("click", () => {
      soundFX.playClick();
      if (!isLast) {
        idx += 1;
        render();
      } else {
        onComplete({
          xpReward: node.xp || 15,
          bonusReward: 0,
          bonusEarned: false,
          bonusFeedback: "",
          feedback: "Awesome! Now you're ready to write real Python code.",
        });
      }
    });
  }

  render();
}
