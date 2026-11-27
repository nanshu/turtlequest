export class PythonRunner {
  constructor({ onStatusChange } = {}) {
    this.onStatusChange = onStatusChange || (() => {});
    this.worker = null;
    this.ready = false;
    this.supportsSAB =
      typeof window !== "undefined" &&
      Boolean(window.crossOriginIsolated) &&
      typeof SharedArrayBuffer !== "undefined";

    this.interruptBuffer = null;
    this.interruptView = null;
    this.inputCtrlBuffer = null;
    this.inputCtrlView = null;
    this.inputDataBuffer = null;
    this.inputDataView = null;

    this.activeRun = null;
    this._drainingRunId = null;
    this._drainKillTimer = null;
    this._slowBootTimer = null;
    this._bootTimeoutTimer = null;
    this.nextRunId = 1;
    this.readyPromise = null;
  }

  _clearBootTimers() {
    if (this._slowBootTimer) {
      clearTimeout(this._slowBootTimer);
      this._slowBootTimer = null;
    }
    if (this._bootTimeoutTimer) {
      clearTimeout(this._bootTimeoutTimer);
      this._bootTimeoutTimer = null;
    }
  }

  init() {
    if (this.readyPromise) return this.readyPromise;

    this.onStatusChange("booting", "Waking up Python...");
    this.readyPromise = new Promise((resolve, reject) => {
      this._bootWorker(resolve, reject);
    });
    return this.readyPromise;
  }

  _bootWorker(resolveReady, rejectReady) {
    this._clearBootTimers();
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // Ignore
      }
      this.worker = null;
    }

    this.ready = false;
    this._drainingRunId = null;
    if (this._drainKillTimer) {
      clearTimeout(this._drainKillTimer);
      this._drainKillTimer = null;
    }

    const worker = new Worker(new URL("./pyodide-worker.js", import.meta.url));
    this.worker = worker;

    let bootSettled = false;
    const settleBootResolve = () => {
      if (bootSettled) return;
      bootSettled = true;
      this._clearBootTimers();
      if (resolveReady) resolveReady();
    };
    const settleBootReject = (err) => {
      if (bootSettled) return;
      bootSettled = true;
      this._clearBootTimers();
      if (rejectReady) rejectReady(err);
    };

    this._slowBootTimer = setTimeout(() => {
      if (this.worker === worker && !this.ready) {
        this.onStatusChange("booting", "Downloading Python...");
      }
    }, 5000);

    this._bootTimeoutTimer = setTimeout(() => {
      if (this.worker === worker && !this.ready) {
        try {
          worker.terminate();
        } catch {
          // Ignore
        }
        this.worker = null;
        this.ready = false;
        this.readyPromise = null;
        this.onStatusChange("error", "Python Timeout");
        settleBootReject(
          new Error(
            "Python took too long to download from jsDelivr. Please check your connection and refresh."
          )
        );
      }
    }, 30000);

    const initMsg = { type: "init" };
    if (this.supportsSAB) {
      this.interruptBuffer = new SharedArrayBuffer(1);
      this.interruptView = new Uint8Array(this.interruptBuffer);
      this.inputCtrlBuffer = new SharedArrayBuffer(8);
      this.inputCtrlView = new Int32Array(this.inputCtrlBuffer);
      this.inputDataBuffer = new SharedArrayBuffer(4096);
      this.inputDataView = new Uint8Array(this.inputDataBuffer);

      initMsg.interruptBuffer = this.interruptBuffer;
      initMsg.inputCtrlBuffer = this.inputCtrlBuffer;
      initMsg.inputDataBuffer = this.inputDataBuffer;
    }

    worker.onmessage = (event) => {
      if (this.worker !== worker) return;
      const msg = event.data;
      if (!msg) return;

      if (msg.type === "ready") {
        this.ready = true;
        this.onStatusChange(
          "ready",
          this.supportsSAB ? "Python Ready" : "Python Ready (Lite)"
        );
        settleBootResolve();
        return;
      }

      if (msg.type === "init_error") {
        try {
          worker.terminate();
        } catch {
          // Ignore
        }
        this.worker = null;
        this.ready = false;
        this.readyPromise = null;
        this.onStatusChange("error", "Python Offline");
        settleBootReject(new Error(msg.error || "Worker init failed"));
        return;
      }

      if (msg.type === "run_result" && msg.runId === this._drainingRunId) {
        this._drainingRunId = null;
        if (this._drainKillTimer) {
          clearTimeout(this._drainKillTimer);
          this._drainKillTimer = null;
        }
        return;
      }

      const run = this.activeRun;
      if (!run || run.aborted) {
        if (msg.type === "input_request" && this.inputCtrlView) {
          Atomics.store(this.inputCtrlView, 0, 2);
          Atomics.notify(this.inputCtrlView, 0);
        }
        return;
      }

      if (msg.type === "stream") {
        run.onStream?.(msg);
        return;
      }

      if (msg.type === "input_request") {
        this._handleInputRequest(msg.prompt || "", run);
        return;
      }

      if (msg.type === "run_result" && msg.runId === run.runId) {
        this._handleRunResult(msg.result, run);
      }
    };

    worker.onerror = (err) => {
      if (this.worker !== worker) return;
      const errObj = new Error(err && err.message ? err.message : "Worker crashed");
      try {
        worker.terminate();
      } catch {
        // Ignore
      }
      this.worker = null;
      this.ready = false;
      this.readyPromise = null;
      this.onStatusChange("error", "Python Error");

      // If still booting, rejecting bootPromise will also reject any run waiting on it
      if (!bootSettled) {
        settleBootReject(errObj);
        return;
      }
      const active = this.activeRun;
      if (active) {
        this._clearActiveRun();
        active.reject(errObj);
      }
    };

    worker.postMessage(initMsg);
  }

  async _handleInputRequest(prompt, run) {
    if (this.activeRun !== run || run.aborted) {
      if (this.inputCtrlView) {
        Atomics.store(this.inputCtrlView, 0, 2);
        Atomics.notify(this.inputCtrlView, 0);
      }
      return;
    }

    this._pauseWatchdog(run);

    try {
      const answer = await run.onInputRequest(prompt);
      if (this.activeRun !== run || run.aborted) {
        if (this.inputCtrlView) {
          Atomics.store(this.inputCtrlView, 0, 2);
          Atomics.notify(this.inputCtrlView, 0);
        }
        return;
      }

      if (answer === null) {
        Atomics.store(this.inputCtrlView, 0, 2);
        Atomics.notify(this.inputCtrlView, 0);
      } else {
        const encoded = new TextEncoder().encode(String(answer));
        const len = Math.min(encoded.length, this.inputDataView.length);
        this.inputDataView.set(encoded.subarray(0, len), 0);
        Atomics.store(this.inputCtrlView, 1, len);
        Atomics.store(this.inputCtrlView, 0, 1);
        Atomics.notify(this.inputCtrlView, 0);
        this._armWatchdog(run);
      }
    } catch {
      if (this.inputCtrlView) {
        Atomics.store(this.inputCtrlView, 0, 2);
        Atomics.notify(this.inputCtrlView, 0);
      }
    }
  }

  async _handleRunResult(result, run) {
    if (this.activeRun !== run || run.aborted) return;

    // Fallback input() loop when SharedArrayBuffer is unavailable (plain http.server / GitHub Pages)
    if (!result.ok && result.error === "NEEDS_FALLBACK_INPUT") {
      this._pauseWatchdog(run);
      const out = result.stdout || "";
      if (out) {
        run.onStream?.({
          stdoutReplace: out,
          commandsDelta: [],
        });
      }

      const answer = await run.onInputRequest(result.needsFallbackPrompt || "");
      if (this.activeRun !== run || run.aborted) return;

      if (answer === null) {
        this._clearActiveRun();
        run.resolve({
          ok: false,
          stdout: result.stdout || "",
          error: "KeyboardInterrupt: Stopped by user",
          astInfo: result.astInfo,
          turtleData: result.turtleData,
        });
        return;
      }
      run.preInputs.push(answer);
      this._armWatchdog(run);
      this.worker.postMessage({
        type: "run",
        runId: run.runId,
        code: run.code,
        preInputs: run.preInputs,
        runSeed: run.runSeed,
      });
      return;
    }

    this._clearActiveRun();
    run.resolve(result);
  }

  _armWatchdog(run = this.activeRun) {
    this._pauseWatchdog(run);
    if (!run || run.aborted) return;
    run.timerId = setTimeout(() => {
      if (this.activeRun === run && !run.aborted) {
        this.stop("timeout");
      }
    }, run.timeoutMs);
  }

  _pauseWatchdog(run = this.activeRun) {
    if (run && run.timerId) {
      clearTimeout(run.timerId);
      run.timerId = null;
    }
  }

  _clearActiveRun() {
    if (this.activeRun) {
      this._pauseWatchdog(this.activeRun);
      this.activeRun = null;
    }
  }

  _respawnWorker() {
    this.onStatusChange("booting", "Restarting Python...");
    this.readyPromise = new Promise((resolve, reject) => {
      this._bootWorker(resolve, reject);
    });
    return this.readyPromise;
  }

  run(code, { onStream, onInputRequest, timeoutMs = 12000 } = {}) {
    if (this.activeRun) {
      this.stop("superseded");
    }

    const runId = this.nextRunId++;
    // Deterministic per-run seed so non-SAB fallback replays keep random.randint() consistent across input() prompts
    const runSeed = Math.floor(Math.random() * 2147483646) + 1;

    return new Promise((resolve, reject) => {
      const run = {
        runId,
        runSeed,
        code,
        aborted: false,
        preInputs: [],
        onStream: onStream || (() => {}),
        onInputRequest: onInputRequest || (async () => ""),
        timeoutMs,
        timerId: null,
        resolve,
        reject,
      };
      this.activeRun = run;

      const bootPromise =
        this._drainingRunId !== null ? this._respawnWorker() : this.init();

      bootPromise.then(
        () => {
          if (this.activeRun !== run || run.aborted) return;
          this._armWatchdog(run);
          this.worker.postMessage({
            type: "run",
            runId,
            code,
            preInputs: [],
            runSeed,
          });
        },
        (err) => {
          if (this.activeRun === run && !run.aborted) {
            this._clearActiveRun();
            reject(err);
          }
        }
      );
    });
  }

  stop(reason = "user") {
    const run = this.activeRun;
    if (!run) return;

    run.aborted = true;
    this._clearActiveRun();

    const stoppedMessage =
      reason === "timeout"
        ? "TurtleLimitError: Your program took too long (more than 12 seconds). Check for a `while` loop that never stops!"
        : "KeyboardInterrupt: Stopped by user";

    // If cancelled before Pyodide finished booting/respawning, settle immediately without killing the booting worker
    if (!this.ready) {
      run.resolve({
        ok: false,
        stdout: "",
        error: stoppedMessage,
        astInfo: null,
        turtleData: null,
      });
      return;
    }

    if (this.supportsSAB && this.interruptView) {
      this.interruptView[0] = 2;
      if (this.inputCtrlView) {
        Atomics.store(this.inputCtrlView, 0, 2);
        Atomics.notify(this.inputCtrlView, 0);
      }

      const drainingId = run.runId;
      this._drainingRunId = drainingId;
      if (this._drainKillTimer) clearTimeout(this._drainKillTimer);
      this._drainKillTimer = setTimeout(() => {
        if (this._drainingRunId === drainingId) {
          this._respawnWorker().catch(() => {});
        }
      }, 550);

      run.resolve({
        ok: false,
        stdout: "",
        error: stoppedMessage,
        astInfo: null,
        turtleData: null,
      });
      return;
    }

    this._respawnWorker().catch(() => {});
    run.resolve({
      ok: false,
      stdout: "",
      error: stoppedMessage,
      astInfo: null,
      turtleData: null,
    });
  }
}
