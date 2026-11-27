import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.mjs";

let pyodide = null;
let interruptView = null;
let inputCtrlView = null;
let inputDataView = null;
let currentPreInputs = [];
let stdoutBuffer = [];

const TEXT_DECODER = new TextDecoder();

function flushStreamsToMain() {
  if (!pyodide) return;
  let commandsDelta = [];
  try {
    const proxy = pyodide.runPython(
      "import json, turtle; json.dumps(_tq_sanitize_json(turtle._flush_commands()), allow_nan=False)"
    );
    commandsDelta = JSON.parse(proxy);
  } catch {
    commandsDelta = [];
  }
  const stdoutDelta = stdoutBuffer.join("");
  stdoutBuffer = [];
  if (stdoutDelta || commandsDelta.length > 0) {
    self.postMessage({
      type: "stream",
      stdoutDelta,
      commandsDelta,
    });
  }
}

globalThis._tqStdoutWrite = (text) => {
  stdoutBuffer.push(String(text));
};

globalThis._tqInputBridge = (promptText) => {
  const promptStr = promptText == null ? "" : String(promptText);

  if (inputCtrlView && inputDataView) {
    // Only stream intermediate stdout/commands in SAB mode where execution pauses live
    flushStreamsToMain();
    Atomics.store(inputCtrlView, 0, 0);
    self.postMessage({ type: "input_request", prompt: promptStr });
    Atomics.wait(inputCtrlView, 0, 0);
    const status = Atomics.load(inputCtrlView, 0);
    if (status === 2) {
      return { cancelled: true, value: "" };
    }
    const byteLen = Math.min(Atomics.load(inputCtrlView, 1), inputDataView.length);
    const copy = new Uint8Array(byteLen);
    copy.set(inputDataView.subarray(0, byteLen));
    Atomics.store(inputCtrlView, 0, 0);
    const decoded = TEXT_DECODER.decode(copy);
    stdoutBuffer.push(`${promptStr}${decoded}\n`);
    return { cancelled: false, value: decoded };
  }

  if (currentPreInputs.length > 0) {
    const nextVal = String(currentPreInputs.shift());
    stdoutBuffer.push(`${promptStr}${nextVal}\n`);
    return { cancelled: false, value: nextVal };
  }

  return { cancelled: false, needsPrompt: true, prompt: promptStr };
};

const PY_RUNNER_BOOTSTRAP = `
import ast
import builtins
import json
import math
import sys
import traceback
import types

class _TQStream:
    def __init__(self, writer):
        self._writer = writer
    def write(self, s):
        if s:
            self._writer(str(s))
        return len(s)
    def flush(self):
        pass

def _tq_sanitize_json(obj):
    if isinstance(obj, float):
        return 0.0 if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, list):
        return [_tq_sanitize_json(x) for x in obj]
    if isinstance(obj, tuple):
        return [_tq_sanitize_json(x) for x in obj]
    if isinstance(obj, dict):
        return {k: _tq_sanitize_json(v) for k, v in obj.items()}
    return obj

def _tq_collect_target_names(target, out_set):
    if isinstance(target, ast.Name):
        out_set.add(target.id)
    elif isinstance(target, (ast.Tuple, ast.List)):
        for elt in target.elts:
            _tq_collect_target_names(elt, out_set)

def _tq_is_turtle_ctor(node):
    if not isinstance(node, ast.Call):
        return False
    if isinstance(node.func, ast.Attribute) and node.func.attr == "Turtle":
        return True
    if isinstance(node.func, ast.Name) and node.func.id == "Turtle":
        return True
    return False

def _tq_analyze_ast(tree):
    info = {
        "hasFor": False,
        "hasWhile": False,
        "hasDef": False,
        "hasIf": False,
        "hasImportTurtle": False,
        "hasPrint": False,
        "hasInput": False,
        "varNames": [],
        "turtleVarNames": [],
        "callNames": [],
        "maxLoopNesting": 0,
        "forRanges": [],
    }
    var_set = set()
    turtle_var_set = set()
    call_set = set()

    def walk_loop(node, depth):
        is_loop = isinstance(node, (ast.For, ast.AsyncFor, ast.While))
        next_depth = depth + 1 if is_loop else depth
        if next_depth > info["maxLoopNesting"]:
            info["maxLoopNesting"] = next_depth

        if isinstance(node, (ast.For, ast.AsyncFor)):
            info["hasFor"] = True
            if (
                isinstance(node.iter, ast.Call)
                and isinstance(node.iter.func, ast.Name)
                and node.iter.func.id == "range"
                and len(node.iter.args) >= 1
                and isinstance(node.iter.args[0], ast.Constant)
                and isinstance(node.iter.args[0].value, int)
            ):
                info["forRanges"].append(node.iter.args[0].value)
        elif isinstance(node, ast.While):
            info["hasWhile"] = True
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            info["hasDef"] = True
        elif isinstance(node, ast.If):
            info["hasIf"] = True
        elif isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name == "turtle":
                    info["hasImportTurtle"] = True
        elif isinstance(node, ast.ImportFrom):
            if node.module == "turtle":
                info["hasImportTurtle"] = True
        elif isinstance(node, ast.Assign):
            is_turtle = _tq_is_turtle_ctor(node.value)
            for t in node.targets:
                _tq_collect_target_names(t, var_set)
                if is_turtle:
                    _tq_collect_target_names(t, turtle_var_set)
        elif isinstance(node, ast.AnnAssign):
            _tq_collect_target_names(node.target, var_set)
            if node.value is not None and _tq_is_turtle_ctor(node.value):
                _tq_collect_target_names(node.target, turtle_var_set)
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                call_set.add(node.func.id)
                if node.func.id == "print":
                    info["hasPrint"] = True
                elif node.func.id == "input":
                    info["hasInput"] = True
            elif isinstance(node.func, ast.Attribute):
                call_set.add(node.func.attr)

        for child in ast.iter_child_nodes(node):
            walk_loop(child, next_depth)

    walk_loop(tree, 0)
    info["varNames"] = sorted(var_set)
    info["turtleVarNames"] = sorted(turtle_var_set)
    info["callNames"] = sorted(call_set)
    return info

class _TQNeedInputFallback(RuntimeError):
    def __init__(self, prompt):
        super().__init__(prompt)
        self.prompt = prompt

def _tq_input(prompt=""):
    import js
    res = js._tqInputBridge(prompt)
    if getattr(res, "cancelled", False):
        raise KeyboardInterrupt("Stopped by user")
    if getattr(res, "needsPrompt", False):
        raise _TQNeedInputFallback(getattr(res, "prompt", ""))
    return str(getattr(res, "value", ""))

def _tq_run(code):
    import js
    import turtle
    turtle._reset_runtime()

    ast_info = {
        "hasFor": False,
        "hasWhile": False,
        "hasDef": False,
        "hasIf": False,
        "hasImportTurtle": False,
        "hasPrint": False,
        "hasInput": False,
        "varNames": [],
        "callNames": [],
        "maxLoopNesting": 0,
        "forRanges": [],
    }

    old_stdout = sys.stdout
    old_stderr = sys.stderr
    old_input = builtins.input
    err_lines = []

    stream_out = _TQStream(js._tqStdoutWrite)
    stream_err = _TQStream(lambda s: err_lines.append(s))

    ok = True
    error_text = None
    needs_fallback_prompt = None

    try:
        tree = ast.parse(code, filename="<user_code>", mode="exec")
        ast_info = _tq_analyze_ast(tree)
        compiled = compile(tree, "<user_code>", "exec")

        sys.stdout = stream_out
        sys.stderr = stream_err
        builtins.input = _tq_input

        user_ns = {"__name__": "__main__"}
        exec(compiled, user_ns, user_ns)
    except _TQNeedInputFallback as exc:
        ok = False
        needs_fallback_prompt = exc.prompt
        error_text = "NEEDS_FALLBACK_INPUT"
    except BaseException:
        ok = False
        error_text = traceback.format_exc()
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr
        builtins.input = old_input

    return json.dumps(_tq_sanitize_json({
        "ok": ok,
        "stderr": "".join(err_lines),
        "error": error_text,
        "needsFallbackPrompt": needs_fallback_prompt,
        "astInfo": ast_info,
        "turtleData": turtle._export_state(),
    }), allow_nan=False)
`;

async function initializeWorker(msg) {
  pyodide = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
  });

  if (msg.interruptBuffer) {
    interruptView = new Uint8Array(msg.interruptBuffer);
    pyodide.setInterruptBuffer(interruptView);
  }
  if (msg.inputCtrlBuffer && msg.inputDataBuffer) {
    inputCtrlView = new Int32Array(msg.inputCtrlBuffer);
    inputDataView = new Uint8Array(msg.inputDataBuffer);
  }

  const shimUrl = new URL("../turtle/py-turtle-shim.py", import.meta.url);
  const shimResp = await fetch(shimUrl);
  if (!shimResp.ok) {
    throw new Error(`Failed to fetch turtle shim (${shimResp.status})`);
  }
  const shimSource = await shimResp.text();

  pyodide.globals.set("_tq_shim_source", shimSource);
  pyodide.runPython(`
import sys, types
_turtle_mod = types.ModuleType("turtle")
_turtle_mod.__file__ = "turtle.py"
exec(compile(_tq_shim_source, "turtle.py", "exec"), _turtle_mod.__dict__)
sys.modules["turtle"] = _turtle_mod
del _tq_shim_source
`);
  pyodide.runPython(PY_RUNNER_BOOTSTRAP);

  self.postMessage({
    type: "ready",
    crossOriginIsolated: Boolean(self.crossOriginIsolated),
  });
}

self.onmessage = async (event) => {
  const msg = event.data;
  if (!msg || !msg.type) return;

  if (msg.type === "init") {
    try {
      await initializeWorker(msg);
    } catch (err) {
      self.postMessage({
        type: "init_error",
        error: err && err.message ? err.message : String(err),
      });
    }
    return;
  }

  if (msg.type === "run") {
    if (!pyodide) {
      self.postMessage({
        type: "run_result",
        runId: msg.runId,
        result: {
          ok: false,
          stdout: "",
          error: "Python is still waking up. Try again in a moment!",
          astInfo: null,
          turtleData: null,
        },
      });
      return;
    }

    stdoutBuffer = [];
    currentPreInputs = Array.isArray(msg.preInputs) ? [...msg.preInputs] : [];
    if (interruptView) {
      interruptView[0] = 0;
    }

    pyodide.globals.set("_tq_user_code", msg.code || "");
    try {
      const jsonStr = pyodide.runPython("_tq_run(_tq_user_code)");
      const parsed = JSON.parse(jsonStr);
      parsed.stdout = stdoutBuffer.join("");
      stdoutBuffer = [];

      self.postMessage({
        type: "run_result",
        runId: msg.runId,
        result: parsed,
      });
    } catch (err) {
      self.postMessage({
        type: "run_result",
        runId: msg.runId,
        result: {
          ok: false,
          stdout: stdoutBuffer.join(""),
          error: err && err.message ? err.message : String(err),
          astInfo: null,
          turtleData: null,
        },
      });
    }
  }
};
