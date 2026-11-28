/* Classic Web Worker for maximum browser compatibility (Chrome, Safari, Firefox) */

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
        "hasElifOrElse": False,
        "hasModulo": False,
        "hasFloorDiv": False,
        "hasPow": False,
        "hasAugAssign": False,
        "hasBoolOp": False,
        "hasNot": False,
        "hasInOp": False,
        "hasReturnValue": False,
        "hasFString": False,
        "hasBreak": False,
        "hasList": False,
        "hasTuple": False,
        "hasDict": False,
        "hasSet": False,
        "hasClassDef": False,
        "hasSelfAttr": False,
        "hasImportTurtle": False,
        "hasImportRandom": False,
        "hasPrint": False,
        "hasInput": False,
        "hasRecursiveDef": False,
        "defNames": [],
        "topLevelDefNames": [],
        "defParamCounts": {},
        "defCallCounts": {},
        "defHasLoop": {},
        "hasDefCalledInLoop": {},
        "classNames": [],
        "classMethodNames": {},
        "classCallCounts": {},
        "hasClassCalledInLoop": {},
        "varNames": [],
        "turtleVarNames": [],
        "turtleCtorCalls": 0,
        "callNames": [],
        "maxLoopNesting": 0,
        "forRanges": [],
    }
    var_set = set()
    turtle_var_set = set()
    call_set = set()
    def_names = []
    top_level_defs = []
    def_param_counts = {}
    def_has_loop = {}
    called_in_loop = set()
    all_name_calls = {}
    class_names = []
    class_methods = {}

    def walk_loop(node, depth, current_fn=None, current_cls=None):
        is_loop = isinstance(node, (ast.For, ast.AsyncFor, ast.While))
        next_depth = depth + 1 if is_loop else depth
        if next_depth > info["maxLoopNesting"]:
            info["maxLoopNesting"] = next_depth

        next_fn = current_fn
        next_cls = current_cls

        if isinstance(node, (ast.For, ast.AsyncFor)):
            info["hasFor"] = True
            if current_fn is not None:
                def_has_loop[current_fn] = True
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
            if current_fn is not None:
                def_has_loop[current_fn] = True
        elif isinstance(node, ast.ClassDef):
            info["hasClassDef"] = True
            class_names.append(node.name)
            class_methods.setdefault(node.name, [])
            next_cls = node.name
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            info["hasDef"] = True
            def_names.append(node.name)
            if current_cls is None:
                top_level_defs.append(node.name)
            else:
                class_methods.setdefault(current_cls, []).append(node.name)
            def_param_counts[node.name] = len(node.args.args)
            def_has_loop.setdefault(node.name, False)
            next_fn = node.name
        elif isinstance(node, ast.If):
            info["hasIf"] = True
            if node.orelse:
                info["hasElifOrElse"] = True
        elif isinstance(node, ast.Return) and node.value is not None:
            info["hasReturnValue"] = True
        elif isinstance(node, ast.Break):
            info["hasBreak"] = True
        elif isinstance(node, ast.Mod):
            info["hasModulo"] = True
        elif isinstance(node, ast.FloorDiv):
            info["hasFloorDiv"] = True
        elif isinstance(node, ast.Pow):
            info["hasPow"] = True
        elif isinstance(node, ast.BoolOp):
            info["hasBoolOp"] = True
        elif isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.Not):
            info["hasNot"] = True
        elif isinstance(node, ast.Compare) and any(isinstance(op, (ast.In, ast.NotIn)) for op in node.ops):
            info["hasInOp"] = True
        elif isinstance(node, ast.JoinedStr):
            info["hasFString"] = True
        elif isinstance(node, ast.List) and isinstance(node.ctx, ast.Load):
            info["hasList"] = True
        elif isinstance(node, ast.Tuple) and isinstance(node.ctx, ast.Load):
            info["hasTuple"] = True
        elif isinstance(node, ast.Dict):
            info["hasDict"] = True
        elif isinstance(node, ast.Set):
            info["hasSet"] = True
        elif isinstance(node, ast.AugAssign):
            info["hasAugAssign"] = True
            if isinstance(node.op, ast.FloorDiv):
                info["hasFloorDiv"] = True
            elif isinstance(node.op, ast.Pow):
                info["hasPow"] = True
            elif isinstance(node.op, ast.Mod):
                info["hasModulo"] = True
            _tq_collect_target_names(node.target, var_set)
        elif isinstance(node, ast.Attribute):
            if (
                current_cls is not None
                and isinstance(node.value, ast.Name)
                and node.value.id == "self"
                and isinstance(node.ctx, ast.Store)
            ):
                info["hasSelfAttr"] = True
        elif isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name == "turtle":
                    info["hasImportTurtle"] = True
                elif alias.name == "random":
                    info["hasImportRandom"] = True
        elif isinstance(node, ast.ImportFrom):
            if node.module == "turtle":
                info["hasImportTurtle"] = True
            elif node.module == "random":
                info["hasImportRandom"] = True
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
            if _tq_is_turtle_ctor(node):
                info["turtleCtorCalls"] += 1
            if isinstance(node.func, ast.Name):
                fname = node.func.id
                call_set.add(fname)
                all_name_calls[fname] = all_name_calls.get(fname, 0) + 1
                if depth > 0:
                    called_in_loop.add(fname)
                if current_fn is not None and fname == current_fn:
                    info["hasRecursiveDef"] = True
                if fname == "print":
                    info["hasPrint"] = True
                elif fname == "input":
                    info["hasInput"] = True
                elif fname == "list":
                    info["hasList"] = True
                elif fname == "tuple":
                    info["hasTuple"] = True
                elif fname == "dict":
                    info["hasDict"] = True
                elif fname == "set":
                    info["hasSet"] = True
            elif isinstance(node.func, ast.Attribute):
                call_set.add(node.func.attr)

        for child in ast.iter_child_nodes(node):
            walk_loop(child, next_depth, next_fn, next_cls)

    walk_loop(tree, 0, None, None)
    info["defNames"] = sorted(set(def_names))
    info["topLevelDefNames"] = sorted(set(top_level_defs))
    info["defParamCounts"] = def_param_counts
    info["defCallCounts"] = {fn: all_name_calls.get(fn, 0) for fn in info["defNames"]}
    info["defHasLoop"] = {fn: bool(def_has_loop.get(fn, False)) for fn in info["defNames"]}
    info["hasDefCalledInLoop"] = {fn: (fn in called_in_loop) for fn in info["defNames"]}
    info["classNames"] = sorted(set(class_names))
    info["classMethodNames"] = {cls: sorted(set(ms)) for cls, ms in class_methods.items()}
    info["classCallCounts"] = {cls: all_name_calls.get(cls, 0) for cls in info["classNames"]}
    info["hasClassCalledInLoop"] = {cls: (cls in called_in_loop) for cls in info["classNames"]}
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

def _tq_run(code, run_seed=None):
    import js
    import random
    import turtle
    turtle._reset_runtime()
    if run_seed is not None:
        random.seed(int(run_seed))

    ast_info = {
        "hasFor": False,
        "hasWhile": False,
        "hasDef": False,
        "hasIf": False,
        "hasElifOrElse": False,
        "hasModulo": False,
        "hasFloorDiv": False,
        "hasPow": False,
        "hasAugAssign": False,
        "hasBoolOp": False,
        "hasNot": False,
        "hasInOp": False,
        "hasReturnValue": False,
        "hasFString": False,
        "hasBreak": False,
        "hasList": False,
        "hasTuple": False,
        "hasDict": False,
        "hasSet": False,
        "hasClassDef": False,
        "hasSelfAttr": False,
        "hasImportTurtle": False,
        "hasImportRandom": False,
        "hasPrint": False,
        "hasInput": False,
        "hasRecursiveDef": False,
        "defNames": [],
        "topLevelDefNames": [],
        "defParamCounts": {},
        "defCallCounts": {},
        "defHasLoop": {},
        "hasDefCalledInLoop": {},
        "classNames": [],
        "classMethodNames": {},
        "classCallCounts": {},
        "hasClassCalledInLoop": {},
        "varNames": [],
        "turtleVarNames": [],
        "turtleCtorCalls": 0,
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
  if (typeof loadPyodide !== "function") {
    importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");
  }
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

  const shimUrl = new URL("../turtle/py-turtle-shim.py", self.location.href);
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
    pyodide.globals.set("_tq_run_seed", msg.runSeed ?? null);
    try {
      const jsonStr = pyodide.runPython("_tq_run(_tq_user_code, _tq_run_seed)");
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
