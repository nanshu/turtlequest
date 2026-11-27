const SPEED_PRESETS = {
  step: { pxPerSec: 0, degPerSec: 0 },
  slow: { pxPerSec: 110, degPerSec: 150 },
  normal: { pxPerSec: 260, degPerSec: 420 },
  fast: { pxPerSec: 760, degPerSec: 1200 },
  instant: { pxPerSec: Infinity, degPerSec: Infinity },
};

export class TurtlePlayer {
  constructor(renderer, { onStep, onStateChange, onFinish } = {}) {
    this.renderer = renderer;
    this.onStep = onStep || (() => {});
    this.onStateChange = onStateChange || (() => {});
    this.onFinish = onFinish || (() => {});

    this.speedMode = "normal";
    this.commands = [];
    this.initialBgcolor = "#ffffff";
    this.bgcolor = "#ffffff";
    this.cmdIndex = 0;
    this.drawables = [];
    this.turtles = new Map();
    this.activeTurtleId = "t1";

    this._rafId = null;
    this._lastTs = null;
    this._currentProgress = 0;
    this._playing = false;

    this._resetScene();
  }

  _defaultTurtle(id = "t1") {
    return {
      id,
      x: 0,
      y: 0,
      heading: 0,
      penDown: true,
      penColor: "#1e293b",
      fillColor: "#1cb0f6",
      penSize: 3,
      visible: true,
      fillStartIndex: null,
    };
  }

  _resetScene() {
    this.drawables = [];
    this.turtles = new Map([["t1", this._defaultTurtle("t1")]]);
    this.activeTurtleId = "t1";
    this.cmdIndex = 0;
    this._currentProgress = 0;
    this._syncRenderer(null);
  }

  _getTurtle(id) {
    const tid = id || this.activeTurtleId || "t1";
    if (!this.turtles.has(tid)) {
      this.turtles.set(tid, this._defaultTurtle(tid));
    }
    this.activeTurtleId = tid;
    return this.turtles.get(tid);
  }

  _syncRenderer(activeStroke = null) {
    this.renderer.setShowHeadingPointer(this.speedMode === "step");
    this.renderer.setScene({
      bgcolor: this.bgcolor,
      drawables: this.drawables,
      activeStroke,
      turtles: Array.from(this.turtles.values()),
    });
    const current = this._getTurtle(this.activeTurtleId);
    this.onStateChange({ ...current });
  }

  isFinished() {
    return this.cmdIndex >= this.commands.length;
  }

  setSpeed(mode) {
    if (!SPEED_PRESETS[mode]) return;
    this.speedMode = mode;
    this.renderer.setShowHeadingPointer(mode === "step");

    const hasRemaining = this.cmdIndex < this.commands.length;

    if (mode === "instant") {
      if (hasRemaining || this._playing) this.skipToEnd();
      else this.renderer.render();
      return;
    }

    if (mode === "step") {
      this._stopRaf();
      this._playing = false;
      if (this._currentProgress > 0 && this.cmdIndex < this.commands.length) {
        this._commitCommand(this.commands[this.cmdIndex]);
        this.cmdIndex += 1;
        this._currentProgress = 0;
      }
      this._syncRenderer(null);
      this.onStep({
        line: this.commands[this.cmdIndex - 1]?.line || null,
        index: this.cmdIndex,
        total: this.commands.length,
      });
      return;
    }

    if (hasRemaining) {
      this._playing = true;
      this._startRaf();
    } else {
      this.renderer.render();
    }
  }

  loadTape(commands, bgcolor = "#ffffff", { autoPlay = true, final = true } = {}) {
    this._stopRaf();
    this.commands = Array.isArray(commands) ? commands : [];
    this.initialBgcolor = bgcolor || "#ffffff";
    this.bgcolor = this.initialBgcolor;
    this._resetScene();

    if (this.commands.length === 0) {
      this._playing = false;
      if (final) this.onFinish();
      return;
    }

    if (!autoPlay) {
      this._playing = false;
      return;
    }

    if (this.speedMode === "instant") {
      this.skipToEnd({ emitFinish: final });
      return;
    }

    if (this.speedMode === "step") {
      this._playing = false;
      this.stepNext();
      return;
    }

    this._playing = true;
    this._startRaf();
  }

  appendCommands(batch, { final = false } = {}) {
    if (!Array.isArray(batch) || batch.length === 0) {
      if (final && this.isFinished()) {
        this.onFinish();
      }
      return;
    }
    this.commands.push(...batch);
    if (this.speedMode === "instant") {
      this.skipToEnd({ emitFinish: final });
    } else if (this.speedMode === "step") {
      this.onStep({
        line: null,
        index: this.cmdIndex,
        total: this.commands.length,
      });
    } else if (!this._playing) {
      this._playing = true;
      this._startRaf();
    }
  }

  finishStream() {
    if (this.isFinished() && !this._playing) {
      this.onFinish();
    }
  }

  replay() {
    if (this.commands.length === 0) return;
    this.loadTape(this.commands, this.initialBgcolor, { autoPlay: true, final: true });
  }

  reset() {
    this._stopRaf();
    this._playing = false;
    this.commands = [];
    this.initialBgcolor = "#ffffff";
    this.bgcolor = "#ffffff";
    this._resetScene();
  }

  skipToEnd({ emitFinish = true } = {}) {
    this._stopRaf();
    this._playing = false;
    while (this.cmdIndex < this.commands.length) {
      this._commitCommand(this.commands[this.cmdIndex]);
      this.cmdIndex += 1;
    }
    this._currentProgress = 0;
    this._syncRenderer(null);
    this.onStep({ line: null, index: this.cmdIndex, total: this.commands.length });
    if (emitFinish) this.onFinish();
  }

  stepNext() {
    if (this.cmdIndex >= this.commands.length) {
      this.onStep({ line: null, index: this.cmdIndex, total: this.commands.length });
      this.onFinish();
      return false;
    }

    // Group non-motion metadata commands (spawn/pen/color) with the next motion if possible
    let cmd = this.commands[this.cmdIndex];
    while (
      this.cmdIndex < this.commands.length - 1 &&
      (cmd.cmd === "spawn" || cmd.cmd === "pen" || cmd.cmd === "pencolor" || cmd.cmd === "fillcolor" || cmd.cmd === "pensize" || cmd.cmd === "begin_fill")
    ) {
      this._commitCommand(cmd);
      this.cmdIndex += 1;
      cmd = this.commands[this.cmdIndex];
    }

    this._commitCommand(cmd);
    this.cmdIndex += 1;

    // Step past an entire grouped command (e.g., circle() chords) in one click
    if (cmd.group) {
      while (this.cmdIndex < this.commands.length && this.commands[this.cmdIndex].group === cmd.group) {
        this._commitCommand(this.commands[this.cmdIndex]);
        this.cmdIndex += 1;
      }
    }

    this._currentProgress = 0;
    this._syncRenderer(null);

    this.onStep({
      line: cmd.line || null,
      index: this.cmdIndex,
      total: this.commands.length,
      cmd: cmd.cmd,
    });

    if (this.cmdIndex >= this.commands.length) {
      this.onFinish();
    }
    return true;
  }

  _commitCommand(cmd) {
    if (!cmd) return;
    const t = this._getTurtle(cmd.id);

    switch (cmd.cmd) {
      case "spawn":
        this.turtles.set(cmd.id, {
          id: cmd.id,
          x: cmd.x ?? 0,
          y: cmd.y ?? 0,
          heading: cmd.heading ?? 0,
          penDown: cmd.penDown ?? true,
          penColor: cmd.penColor ?? "#1e293b",
          fillColor: cmd.fillColor ?? "#1cb0f6",
          penSize: cmd.penSize ?? 3,
          visible: cmd.visible ?? true,
        });
        this.activeTurtleId = cmd.id;
        break;
      case "move":
        t.x = cmd.x2;
        t.y = cmd.y2;
        if (cmd.penDown) {
          this.drawables.push({
            kind: "segment",
            turtleId: t.id,
            x1: cmd.x1,
            y1: cmd.y1,
            x2: cmd.x2,
            y2: cmd.y2,
            color: cmd.color,
            width: cmd.width,
          });
        }
        break;
      case "turn":
        t.heading = cmd.toHeading;
        break;
      case "pen":
        t.penDown = cmd.penDown;
        break;
      case "pensize":
        t.penSize = cmd.width;
        break;
      case "pencolor":
        t.penColor = cmd.color;
        break;
      case "fillcolor":
        t.fillColor = cmd.color;
        break;
      case "begin_fill":
        t.fillStartIndex = this.drawables.length;
        break;
      case "end_fill": {
        const fillDrawable = {
          kind: "fill",
          turtleId: t.id,
          points: cmd.points,
          color: cmd.color,
        };
        const insertAt =
          typeof t.fillStartIndex === "number" && t.fillStartIndex <= this.drawables.length
            ? t.fillStartIndex
            : this.drawables.length;
        this.drawables.splice(insertAt, 0, fillDrawable);
        t.fillStartIndex = null;
        break;
      }
      case "dot":
        this.drawables.push({
          kind: "dot",
          turtleId: t.id,
          x: cmd.x,
          y: cmd.y,
          size: cmd.size,
          color: cmd.color,
        });
        break;
      case "stamp":
        this.drawables.push({
          kind: "stamp",
          turtleId: t.id,
          x: cmd.x,
          y: cmd.y,
          heading: cmd.heading,
          color: cmd.color,
        });
        break;
      case "write":
        this.drawables.push({
          kind: "write",
          turtleId: t.id,
          x: cmd.x,
          y: cmd.y,
          text: cmd.text,
          align: cmd.align,
          color: cmd.color,
          fontSize: cmd.fontSize,
          fontFamily: cmd.fontFamily,
          fontWeight: cmd.fontWeight,
        });
        break;
      case "visibility":
        t.visible = cmd.visible;
        break;
      case "bgcolor":
        this.bgcolor = cmd.color;
        break;
      case "clear":
        if (cmd.id === "all") {
          this.drawables = [];
        } else {
          this.drawables = this.drawables.filter((d) => d.turtleId !== cmd.id);
        }
        break;
      case "reset":
        this.drawables = this.drawables.filter((d) => d.turtleId !== cmd.id);
        this.turtles.set(cmd.id, this._defaultTurtle(cmd.id));
        break;
      case "reset_screen":
        this.drawables = [];
        this.bgcolor = "#ffffff";
        for (const tid of this.turtles.keys()) {
          this.turtles.set(tid, this._defaultTurtle(tid));
        }
        break;
      default:
        break;
    }
  }

  _startRaf() {
    this._stopRaf();
    this._lastTs = performance.now();
    const tick = (now) => {
      if (!this._playing) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - this._lastTs) / 1000));
      this._lastTs = now;
      this._advanceFrame(dt);
      if (this._playing) {
        this._rafId = requestAnimationFrame(tick);
      }
    };
    this._rafId = requestAnimationFrame(tick);
  }

  _stopRaf() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _advanceFrame(dt) {
    const preset = SPEED_PRESETS[this.speedMode] || SPEED_PRESETS.normal;
    let timeBudget = dt;
    let activeStroke = null;
    let lastLine = null;

    while (timeBudget > 0 && this.cmdIndex < this.commands.length) {
      const cmd = this.commands[this.cmdIndex];
      lastLine = cmd.line || lastLine;

      if (cmd.cmd === "move") {
        const dist = Math.hypot(cmd.x2 - cmd.x1, cmd.y2 - cmd.y1);
        const duration = dist > 0 ? dist / preset.pxPerSec : 0;
        if (duration <= 0.0005) {
          this._commitCommand(cmd);
          this.cmdIndex += 1;
          this._currentProgress = 0;
          continue;
        }
        const remainingFrac = 1 - this._currentProgress;
        const remainingTime = duration * remainingFrac;
        if (timeBudget >= remainingTime) {
          timeBudget -= remainingTime;
          this._commitCommand(cmd);
          this.cmdIndex += 1;
          this._currentProgress = 0;
        } else {
          this._currentProgress += timeBudget / duration;
          timeBudget = 0;
          const ix = cmd.x1 + (cmd.x2 - cmd.x1) * this._currentProgress;
          const iy = cmd.y1 + (cmd.y2 - cmd.y1) * this._currentProgress;
          const t = this._getTurtle(cmd.id);
          t.x = ix;
          t.y = iy;
          if (cmd.penDown) {
            activeStroke = {
              x1: cmd.x1,
              y1: cmd.y1,
              x2: ix,
              y2: iy,
              color: cmd.color,
              width: cmd.width,
            };
          }
        }
      } else if (cmd.cmd === "turn") {
        const deg = Math.abs(cmd.delta || 0);
        const duration = deg > 0 ? deg / preset.degPerSec : 0;
        if (duration <= 0.0005) {
          this._commitCommand(cmd);
          this.cmdIndex += 1;
          this._currentProgress = 0;
          continue;
        }
        const remainingFrac = 1 - this._currentProgress;
        const remainingTime = duration * remainingFrac;
        if (timeBudget >= remainingTime) {
          timeBudget -= remainingTime;
          this._commitCommand(cmd);
          this.cmdIndex += 1;
          this._currentProgress = 0;
        } else {
          this._currentProgress += timeBudget / duration;
          timeBudget = 0;
          const t = this._getTurtle(cmd.id);
          t.heading = (cmd.fromHeading + cmd.delta * this._currentProgress) % 360;
        }
      } else {
        this._commitCommand(cmd);
        this.cmdIndex += 1;
        this._currentProgress = 0;
      }
    }

    this._syncRenderer(activeStroke);
    this.onStep({
      line: lastLine,
      index: this.cmdIndex,
      total: this.commands.length,
    });

    if (this.cmdIndex >= this.commands.length) {
      this._playing = false;
      this.onStep({ line: null, index: this.cmdIndex, total: this.commands.length });
      this.onFinish();
    }
  }
}
