export const WORLD_W = 520;
export const WORLD_H = 400;

export class TurtleRenderer {
  constructor(canvas, { skin = "turtle", rainbowTrail = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.skin = skin;
    this.rainbowTrail = rainbowTrail;
    this.showGrid = false;
    this.showBlueprint = true;
    this.showHeadingPointer = false;
    this.blueprint = null;

    this.scene = {
      bgcolor: "#ffffff",
      drawables: [],
      activeStroke: null,
      turtles: [
        {
          id: "t1",
          x: 0,
          y: 0,
          heading: 0,
          penDown: true,
          penColor: "#1e293b",
          penSize: 3,
          visible: true,
        },
      ],
    };

    this._dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    this._bindResizeObserver();
    this.resize();
  }

  _bindResizeObserver() {
    if (typeof ResizeObserver === "undefined") return;
    this._ro = new ResizeObserver(() => {
      this.resize();
      this.render();
    });
    this._ro.observe(this.canvas);
  }

  destroy() {
    if (this._ro) {
      this._ro.disconnect();
      this._ro = null;
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(120, Math.round(rect.width || WORLD_W));
    const h = rect.height
      ? Math.max(92, Math.round(rect.height))
      : Math.round((w * WORLD_H) / WORLD_W);
    this._dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    this.canvas.width = Math.round(w * this._dpr);
    this.canvas.height = Math.round(h * this._dpr);
  }

  setSkin(skin) {
    this.skin = skin || "turtle";
    this.render();
  }

  setRainbowTrail(enabled) {
    this.rainbowTrail = Boolean(enabled);
    this.render();
  }

  setShowGrid(enabled) {
    this.showGrid = Boolean(enabled);
    this.render();
  }

  setShowBlueprint(enabled) {
    this.showBlueprint = Boolean(enabled);
    this.render();
  }

  setBlueprint(segments) {
    this.blueprint = Array.isArray(segments) && segments.length > 0 ? segments : null;
    this.render();
  }

  setShowHeadingPointer(enabled) {
    this.showHeadingPointer = Boolean(enabled);
    this.render();
  }

  setScene(scene) {
    this.scene = scene;
    this.render();
  }

  worldToCanvas(x, y) {
    return {
      cx: WORLD_W / 2 + x,
      cy: WORLD_H / 2 - y,
    };
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;

    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const scaleX = cw / WORLD_W;
    const scaleY = ch / WORLD_H;

    ctx.save();
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

    // 1. Background
    ctx.fillStyle = this.scene.bgcolor || "#ffffff";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // 2. Coordinate Grid
    if (this.showGrid) {
      this._drawGrid(ctx);
    }

    // 3. Ghost Blueprint
    if (this.showBlueprint && this.blueprint) {
      this._drawBlueprint(ctx, this.blueprint);
    }

    // 4. Committed drawables in sequential z-order (player splices fills before each shape's strokes)
    let segCounter = 0;
    for (const item of this.scene.drawables) {
      if (item.kind === "fill" && item.points && item.points.length >= 3) {
        ctx.save();
        ctx.fillStyle = item.color || "#1cb0f6";
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        item.points.forEach((pt, idx) => {
          const { cx, cy } = this.worldToCanvas(pt[0], pt[1]);
          if (idx === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        });
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (item.kind === "segment") {
        const color = this.rainbowTrail
          ? `hsl(${(segCounter * 24) % 360}, 85%, 52%)`
          : item.color || "#1e293b";
        segCounter += 1;
        this._drawSegment(ctx, item.x1, item.y1, item.x2, item.y2, color, item.width || 3);
      } else if (item.kind === "dot") {
        const { cx, cy } = this.worldToCanvas(item.x, item.y);
        ctx.save();
        ctx.fillStyle = item.color || "#1e293b";
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(2, (item.size || 8) / 2), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (item.kind === "stamp") {
        this._drawAvatar(ctx, item.x, item.y, item.heading || 0, this.skin, 0.5, item.color);
      } else if (item.kind === "write") {
        const { cx, cy } = this.worldToCanvas(item.x, item.y);
        ctx.save();
        ctx.fillStyle = item.color || "#1e293b";
        ctx.font = `${item.fontWeight || "bold"} ${item.fontSize || 14}px ${
          item.fontFamily || "sans-serif"
        }`;
        ctx.textAlign = item.align || "left";
        ctx.textBaseline = "bottom";
        ctx.fillText(item.text || "", cx, cy);
        ctx.restore();
      }
    }

    // 5. Active animated stroke
    if (this.scene.activeStroke) {
      const s = this.scene.activeStroke;
      const color = this.rainbowTrail
        ? `hsl(${(segCounter * 24) % 360}, 85%, 52%)`
        : s.color || "#1e293b";
      this._drawSegment(ctx, s.x1, s.y1, s.x2, s.y2, color, s.width || 3);
    }

    // 6. Turtle Avatars + Optional Step Heading Pointer
    for (const turtle of this.scene.turtles) {
      if (!turtle.visible) continue;
      if (this.showHeadingPointer) {
        this._drawHeadingPointer(ctx, turtle.x, turtle.y, turtle.heading);
      }
      this._drawAvatar(ctx, turtle.x, turtle.y, turtle.heading, this.skin, 1);
    }

    ctx.restore();
  }

  _drawSegment(ctx, x1, y1, x2, y2, color, width) {
    const p1 = this.worldToCanvas(x1, y1);
    const p2 = this.worldToCanvas(x2, y2);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(p1.cx, p1.cy);
    ctx.lineTo(p2.cx, p2.cy);
    ctx.stroke();
    ctx.restore();
  }

  _drawGrid(ctx) {
    ctx.save();
    // Minor 25px grid
    ctx.strokeStyle = "rgba(148, 163, 184, 0.16)";
    ctx.lineWidth = 1;
    for (let x = -250; x <= 250; x += 25) {
      const { cx } = this.worldToCanvas(x, 0);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, WORLD_H);
      ctx.stroke();
    }
    for (let y = -200; y <= 200; y += 25) {
      const { cy } = this.worldToCanvas(0, y);
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(WORLD_W, cy);
      ctx.stroke();
    }

    // Major 50px grid
    ctx.strokeStyle = "rgba(100, 116, 139, 0.25)";
    for (let x = -250; x <= 250; x += 50) {
      const { cx } = this.worldToCanvas(x, 0);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, WORLD_H);
      ctx.stroke();
    }
    for (let y = -200; y <= 200; y += 50) {
      const { cy } = this.worldToCanvas(0, y);
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(WORLD_W, cy);
      ctx.stroke();
    }

    // Main X and Y axes
    ctx.strokeStyle = "rgba(30, 41, 59, 0.45)";
    ctx.lineWidth = 1.6;
    const origin = this.worldToCanvas(0, 0);
    ctx.beginPath();
    ctx.moveTo(0, origin.cy);
    ctx.lineTo(WORLD_W, origin.cy);
    ctx.moveTo(origin.cx, 0);
    ctx.lineTo(origin.cx, WORLD_H);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = "rgba(51, 65, 85, 0.72)";
    ctx.font = "600 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let x = -200; x <= 200; x += 50) {
      if (x === 0) continue;
      const { cx, cy } = this.worldToCanvas(x, 0);
      ctx.fillText(String(x), cx, cy + 4);
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (let y = -150; y <= 150; y += 50) {
      if (y === 0) continue;
      const { cx, cy } = this.worldToCanvas(0, y);
      ctx.fillText(String(y), cx + 5, cy);
    }
    ctx.fillText("(0, 0)", origin.cx + 4, origin.cy + 10);
    ctx.restore();
  }

  _drawBlueprint(ctx, segments) {
    ctx.save();
    ctx.strokeStyle = "rgba(28, 176, 246, 0.36)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.setLineDash([7, 7]);
    for (const seg of segments) {
      const p1 = this.worldToCanvas(seg.x1, seg.y1);
      const p2 = this.worldToCanvas(seg.x2, seg.y2);
      ctx.beginPath();
      ctx.moveTo(p1.cx, p1.cy);
      ctx.lineTo(p2.cx, p2.cy);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawHeadingPointer(ctx, x, y, heading) {
    const { cx, cy } = this.worldToCanvas(x, y);
    const rad = (-heading * Math.PI) / 180;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = "rgba(245, 158, 11, 0.65)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(rad) * 30, Math.sin(rad) * 30);
    ctx.stroke();
    ctx.restore();
  }

  _roundRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  _drawAvatar(ctx, x, y, heading, skin, alpha = 1, tintColor = null) {
    const { cx, cy } = this.worldToCanvas(x, y);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.rotate((-heading * Math.PI) / 180);

    if (skin === "rocket") {
      this._drawRocketSprite(ctx);
    } else if (skin === "dragon") {
      this._drawDragonSprite(ctx);
    } else if (skin === "robot") {
      this._drawRobotSprite(ctx);
    } else if (skin === "racecar") {
      this._drawRacecarSprite(ctx);
    } else {
      this._drawTurtleSprite(ctx, tintColor);
    }

    ctx.restore();
  }

  _drawTurtleSprite(ctx, tintColor = null) {
    // Legs
    ctx.fillStyle = "#65a30d";
    const legs = [
      [6, -9],
      [6, 9],
      [-7, -9],
      [-7, 9],
    ];
    for (const [lx, ly] of legs) {
      ctx.beginPath();
      ctx.arc(lx, ly, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Tail
    ctx.beginPath();
    ctx.moveTo(-10, -2.5);
    ctx.lineTo(-16, 0);
    ctx.lineTo(-10, 2.5);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = "#84cc16";
    ctx.beginPath();
    ctx.arc(12, 0, 5.2, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(14, -2, 1.1, 0, Math.PI * 2);
    ctx.arc(14, 2, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Shell
    ctx.fillStyle = tintColor || "#16a34a";
    ctx.strokeStyle = "#14532d";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10.5, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner shell highlight
    ctx.strokeStyle = "#86efac";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.5, 4.2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  _drawRocketSprite(ctx) {
    // Flame
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.lineTo(-18, 0);
    ctx.lineTo(-10, 4);
    ctx.closePath();
    ctx.fill();

    // Fins
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(-4, -5);
    ctx.lineTo(-11, -11);
    ctx.lineTo(-11, -4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4, 5);
    ctx.lineTo(-11, 11);
    ctx.lineTo(-11, 4);
    ctx.closePath();
    ctx.fill();

    // Body
    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.quadraticCurveTo(6, -7, -10, -6);
    ctx.lineTo(-10, 6);
    ctx.quadraticCurveTo(6, 7, 15, 0);
    ctx.fill();
    ctx.stroke();

    // Window
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(2, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawDragonSprite(ctx) {
    // Wings
    ctx.fillStyle = "#c084fc";
    ctx.beginPath();
    ctx.moveTo(2, -4);
    ctx.lineTo(-7, -14);
    ctx.lineTo(-9, -4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2, 4);
    ctx.lineTo(-7, 14);
    ctx.lineTo(-9, 4);
    ctx.closePath();
    ctx.fill();

    // Body
    ctx.fillStyle = "#7e22ce";
    ctx.beginPath();
    ctx.ellipse(-1, 0, 10, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Snout & horns
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(8, -4);
    ctx.lineTo(16, 0);
    ctx.lineTo(8, 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(10, -2, 1.2, 0, Math.PI * 2);
    ctx.arc(10, 2, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawRobotSprite(ctx) {
    ctx.fillStyle = "#38bdf8";
    ctx.strokeStyle = "#0369a1";
    ctx.lineWidth = 1.6;
    this._roundRectPath(ctx, -10, -9, 20, 18, 5);
    ctx.fill();
    ctx.stroke();

    // Visor
    ctx.fillStyle = "#0f172a";
    this._roundRectPath(ctx, 1, -6, 6, 12, 2);
    ctx.fill();

    ctx.fillStyle = "#22d3ee";
    ctx.beginPath();
    ctx.arc(4, -3, 1.5, 0, Math.PI * 2);
    ctx.arc(4, 3, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Antenna
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-14, 0);
    ctx.stroke();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(-14, 0, 2.3, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawRacecarSprite(ctx) {
    // Wheels
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-9, -10, 6, 3);
    ctx.fillRect(-9, 7, 6, 3);
    ctx.fillRect(4, -10, 6, 3);
    ctx.fillRect(4, 7, 6, 3);

    // Body
    ctx.fillStyle = "#ef4444";
    ctx.strokeStyle = "#7f1d1d";
    ctx.lineWidth = 1.5;
    this._roundRectPath(ctx, -12, -7, 26, 14, 5);
    ctx.fill();
    ctx.stroke();

    // Racing stripe + cockpit
    ctx.fillStyle = "#fde047";
    ctx.fillRect(-10, -1.5, 22, 3);
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(1, 0, 3.6, 0, Math.PI * 2);
    ctx.fill();
  }

  exportPNG(filename = "turtlequest-art.png") {
    const link = document.createElement("a");
    link.download = filename;
    link.href = this.canvas.toDataURL("image/png");
    link.click();
  }
}
