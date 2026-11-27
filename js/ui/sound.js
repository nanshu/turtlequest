class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
  }

  isMuted() {
    return this.muted;
  }

  _ensureCtx() {
    if (this.muted) return null;
    if (typeof window === "undefined") return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _tone(freq, duration, { type = "sine", gain = 0.08, delay = 0, endFreq = null } = {}) {
    const ctx = this._ensureCtx();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }

    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(g);
    g.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playClick() {
    this._tone(520, 0.055, { type: "triangle", gain: 0.05, endFreq: 660 });
  }

  playStep() {
    this._tone(420, 0.045, { type: "sine", gain: 0.045, endFreq: 480 });
  }

  playCorrect() {
    this._tone(523.25, 0.11, { type: "triangle", gain: 0.08, delay: 0 });
    this._tone(659.25, 0.14, { type: "triangle", gain: 0.08, delay: 0.09 });
  }

  playWin() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      this._tone(f, idx === 3 ? 0.28 : 0.12, {
        type: "triangle",
        gain: 0.09,
        delay: idx * 0.085,
      });
    });
  }

  playBonus() {
    const notes = [659.25, 880, 1174.66, 1318.5];
    notes.forEach((f, idx) => {
      this._tone(f, 0.15, { type: "sine", gain: 0.075, delay: idx * 0.07 });
    });
  }

  playError() {
    this._tone(240, 0.16, { type: "sawtooth", gain: 0.04, endFreq: 170 });
  }

  playUnlock() {
    this._tone(587.33, 0.1, { type: "triangle", gain: 0.08, delay: 0 });
    this._tone(880, 0.22, { type: "triangle", gain: 0.09, delay: 0.09 });
  }
}

export const soundFX = new SoundFX();
