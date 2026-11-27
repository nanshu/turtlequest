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

  if (kind === "def-anatomy") {
    return `
      <div class="tutorial-diagram-card">
        <div class="anatomy-row">
          <div class="anatomy-pill pill-purple"><code>def</code><span>Define new command</span></div>
          <div class="anatomy-pill pill-blue"><code>draw_star</code><span>Your command name</span></div>
          <div class="anatomy-pill pill-green"><code>(size):</code><span>Input dial + colon</span></div>
        </div>
      </div>
    `;
  }

  if (kind === "recursion-diagram") {
    return `
      <div class="tutorial-diagram-card var-boxes-row">
        <div class="var-box">
          <div class="var-box-label">Level 1</div>
          <div class="var-box-val">80 px</div>
        </div>
        <div class="anatomy-dot">→</div>
        <div class="var-box">
          <div class="var-box-label">× 0.7</div>
          <div class="var-box-val">56 px</div>
        </div>
        <div class="anatomy-dot">→</div>
        <div class="var-box">
          <div class="var-box-label">× 0.7</div>
          <div class="var-box-val">39 px</div>
        </div>
        <div class="anatomy-dot">→</div>
        <div class="var-box accent">
          <div class="var-box-label">&lt; 15 px</div>
          <div class="var-box-val">STOP!</div>
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
        colorIdx = 0;
        state.color = palette[0].hex;
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

  mountEl.innerHTML = `
    <div class="widget-box">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:10px;">
        <label style="font-weight:900;">
          Sides: <span id="poly-sides-val" style="color:var(--blue-dark); font-size:1.1rem;"></span>
          <span id="poly-sides-name" style="color:var(--text-muted); font-weight:700;"></span>
        </label>
        <input id="poly-slider" type="range" min="3" max="12" value="${sides}" style="flex:1; min-width:150px;" />
        <span id="poly-angle-badge" class="xp-badge"></span>
      </div>
      <div class="widget-split">
        <svg viewBox="0 0 190 170" class="mini-turtle-canvas">
          <polygon id="poly-shape" points="" fill="rgba(28, 176, 246, 0.16)" stroke="#1cb0f6" stroke-width="3.5" stroke-linejoin="round" />
        </svg>
        <pre class="mini-code-block live-code-preview"><code id="poly-code"></code></pre>
      </div>
    </div>
  `;

  const sidesValEl = mountEl.querySelector("#poly-sides-val");
  const sidesNameEl = mountEl.querySelector("#poly-sides-name");
  const angleBadgeEl = mountEl.querySelector("#poly-angle-badge");
  const polyShapeEl = mountEl.querySelector("#poly-shape");
  const polyCodeEl = mountEl.querySelector("#poly-code");
  const sliderEl = mountEl.querySelector("#poly-slider");

  function update() {
    const angle = Number((360 / sides).toFixed(1));
    const r = 64;
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
      pts.push(`${(95 + r * Math.cos(a)).toFixed(1)},${(85 + r * Math.sin(a)).toFixed(1)}`);
    }
    sidesValEl.textContent = String(sides);
    sidesNameEl.textContent = `(${names[sides] || `${sides}-gon`})`;
    angleBadgeEl.textContent = `360 ÷ ${sides} = ${angle}°`;
    polyShapeEl.setAttribute("points", pts.join(" "));
    polyCodeEl.textContent = `for i in range(${sides}):\n    t.forward(70)\n    t.right(360 / ${sides})  # ${angle}°`;
  }

  sliderEl.addEventListener("input", (e) => {
    sides = Number(e.target.value);
    soundFX.playStep();
    update();
  });

  update();
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
      let sx;
      let sy;
      const ctm = typeof svg.getScreenCTM === "function" ? svg.getScreenCTM() : null;
      if (ctm && typeof svg.createSVGPoint === "function") {
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgPt = pt.matrixTransform(ctm.inverse());
        sx = svgPt.x;
        sy = svgPt.y;
      } else {
        const rect = svg.getBoundingClientRect();
        sx = ((e.clientX - rect.left) / rect.width) * 260;
        sy = ((e.clientY - rect.top) / rect.height) * 190;
      }
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

function mountStarExplorerWidget(mountEl) {
  const presets = [
    { label: "5-Point Star (144°)", points: 5, skip: 2 },
    { label: "7-Point Gentle (102.9°)", points: 7, skip: 2 },
    { label: "7-Point Sharp (154.3°)", points: 7, skip: 3 },
    { label: "9-Point Sharp (160°)", points: 9, skip: 4 },
  ];
  let selected = 0;

  function renderWidget() {
    const p = presets[selected];
    const angle = Number(((360 * p.skip) / p.points).toFixed(1));
    const r = 68;
    const pts = [];
    for (let i = 0; i < p.points; i++) {
      const vertexIdx = (i * p.skip) % p.points;
      const a = -Math.PI / 2 + (vertexIdx * 2 * Math.PI) / p.points;
      pts.push(`${(95 + r * Math.cos(a)).toFixed(1)},${(85 + r * Math.sin(a)).toFixed(1)}`);
    }

    mountEl.innerHTML = `
      <div class="widget-box">
        <div class="widget-controls">
          ${presets
            .map(
              (pr, idx) =>
                `<button class="btn ${idx === selected ? "btn-gold" : "btn-ghost"} btn-sm" data-star="${idx}" type="button">${escapeHtml(
                  pr.label
                )}</button>`
            )
            .join("")}
        </div>
        <div class="widget-split">
          <svg viewBox="0 0 190 170" class="mini-turtle-canvas" style="height:170px;">
            <polygon points="${pts.join(" ")}" fill="rgba(255, 200, 0, 0.25)" stroke="#f59e0b" stroke-width="3" stroke-linejoin="round" />
          </svg>
          <div>
            <div style="font-weight:900; font-size:0.86rem; color:var(--orange-dark); margin-bottom:6px;">
              ${p.skip} × 360° ÷ ${p.points} = ${angle}°
            </div>
            <pre class="mini-code-block live-code-preview"><code>def draw_star(size):
    for i in range(${p.points}):
        t.forward(size)
        t.right(${p.skip} * 360 / ${p.points})</code></pre>
          </div>
        </div>
      </div>
    `;

    mountEl.querySelectorAll("[data-star]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selected = Number(btn.dataset.star);
        soundFX.playStep();
        renderWidget();
      });
    });
  }

  renderWidget();
}

function mountModuloRandomWidget(mountEl) {
  let mod = 2;
  const palette = ["#14b8a6", "#f59e0b", "#a855f7", "#ef4444"];
  let rolled = { x: 110, y: -60, color: "gold", size: 12 };

  function renderWidget() {
    const tiles = Array.from({ length: 8 }, (_, i) => {
      const rem = i % mod;
      return `
        <div style="background:${palette[rem]}; color:#fff; border-radius:10px; padding:8px 6px; text-align:center; font-weight:900; font-size:0.82rem;">
          <div>i=${i}</div>
          <div style="font-size:0.72rem; opacity:0.92;">${i}%${mod}=${rem}</div>
        </div>
      `;
    }).join("");

    mountEl.innerHTML = `
      <div class="widget-box">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
          <div style="display:flex; gap:6px;">
            ${[2, 3, 4]
              .map(
                (m) =>
                  `<button class="btn ${m === mod ? "btn-blue" : "btn-ghost"} btn-sm" data-mod="${m}" type="button">i % ${m}</button>`
              )
              .join("")}
          </div>
          <button id="roll-rand-btn" class="btn btn-purple btn-sm" type="button">🎲 Roll Random Star!</button>
        </div>
        <div class="modulo-grid">
          ${tiles}
        </div>
        <pre class="mini-code-block"><code># Rolled with random.randint() &amp; random.choice():
t.goto(${rolled.x}, ${rolled.y})
t.dot(${rolled.size}, "${rolled.color}")</code></pre>
      </div>
    `;

    mountEl.querySelectorAll("[data-mod]").forEach((btn) => {
      btn.addEventListener("click", () => {
        mod = Number(btn.dataset.mod);
        soundFX.playStep();
        renderWidget();
      });
    });

    mountEl.querySelector("#roll-rand-btn").addEventListener("click", () => {
      const names = ["gold", "skyblue", "coral", "lime", "magenta"];
      rolled = {
        x: Math.floor(Math.random() * 401) - 200,
        y: Math.floor(Math.random() * 301) - 150,
        size: Math.floor(Math.random() * 11) + 6,
        color: names[Math.floor(Math.random() * names.length)],
      };
      soundFX.playCorrect();
      renderWidget();
    });
  }

  renderWidget();
}

function mountTreeExplorerWidget(mountEl) {
  let depth = 5;
  let angle = 28;

  function buildTreeLines(x, y, len, deg, level, out) {
    if (level <= 0) return;
    const rad = (deg * Math.PI) / 180;
    const nx = x + len * Math.cos(rad);
    const ny = y - len * Math.sin(rad);
    const color = level <= 2 ? "#22c55e" : "#92400e";
    const width = Math.max(1.2, level * 0.9);
    out.push(`<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" />`);
    buildTreeLines(nx, ny, len * 0.72, deg + angle, level - 1, out);
    buildTreeLines(nx, ny, len * 0.72, deg - angle, level - 1, out);
  }

  mountEl.innerHTML = `
    <div class="widget-box">
      <div style="display:flex; gap:14px; flex-wrap:wrap; align-items:center; margin-bottom:10px;">
        <label style="font-weight:800; font-size:0.86rem;">
          Levels: <strong id="tree-depth-val"></strong>
          <input id="tree-depth" type="range" min="1" max="6" value="${depth}" style="vertical-align:middle;" />
        </label>
        <label style="font-weight:800; font-size:0.86rem;">
          Spread Angle: <strong id="tree-angle-val"></strong>
          <input id="tree-angle" type="range" min="15" max="48" value="${angle}" style="vertical-align:middle;" />
        </label>
        <span id="tree-count-badge" class="xp-badge"></span>
      </div>
      <div class="widget-split">
        <svg id="tree-svg" viewBox="0 0 220 180" class="mini-turtle-canvas"></svg>
        <pre class="mini-code-block live-code-preview"><code id="tree-code"></code></pre>
      </div>
    </div>
  `;

  const depthValEl = mountEl.querySelector("#tree-depth-val");
  const angleValEl = mountEl.querySelector("#tree-angle-val");
  const countBadgeEl = mountEl.querySelector("#tree-count-badge");
  const treeSvgEl = mountEl.querySelector("#tree-svg");
  const treeCodeEl = mountEl.querySelector("#tree-code");

  function update() {
    const lines = [];
    buildTreeLines(110, 168, 44, 90, depth, lines);
    depthValEl.textContent = String(depth);
    angleValEl.textContent = `${angle}°`;
    countBadgeEl.textContent = `${lines.length} branches!`;
    treeSvgEl.innerHTML = lines.join("");
    treeCodeEl.textContent = `def draw_branch(length):\n    if length < 15:\n        return\n    t.forward(length)\n    t.left(${angle})\n    draw_branch(length * 0.7)\n    t.right(${angle * 2})\n    draw_branch(length * 0.7)\n    t.left(${angle})\n    t.penup(); t.backward(length); t.pendown()`;
  }

  mountEl.querySelector("#tree-depth").addEventListener("input", (e) => {
    depth = Number(e.target.value);
    soundFX.playStep();
    update();
  });
  mountEl.querySelector("#tree-angle").addEventListener("input", (e) => {
    angle = Number(e.target.value);
    soundFX.playStep();
    update();
  });

  update();
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
          ${formatInlineText(step.badge || node.title)}
        </div>

        <h2 style="margin:0 0 10px; font-size:1.4rem; font-weight:900;">${formatInlineText(step.title)}</h2>
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
      else if (step.widget === "star-explorer") mountStarExplorerWidget(widgetMount);
      else if (step.widget === "modulo-random") mountModuloRandomWidget(widgetMount);
      else if (step.widget === "tree-explorer") mountTreeExplorerWidget(widgetMount);
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
