const TURTLE_METHODS = [
  "forward",
  "fd",
  "backward",
  "bk",
  "back",
  "right",
  "rt",
  "left",
  "lt",
  "goto",
  "setpos",
  "setposition",
  "setx",
  "sety",
  "home",
  "setheading",
  "seth",
  "circle",
  "penup",
  "pu",
  "up",
  "pendown",
  "pd",
  "down",
  "pensize",
  "width",
  "pencolor",
  "fillcolor",
  "color",
  "begin_fill",
  "end_fill",
  "dot",
  "stamp",
  "write",
  "hideturtle",
  "ht",
  "showturtle",
  "st",
  "clear",
  "reset",
  "speed",
  "shape",
  "position",
  "pos",
  "xcor",
  "ycor",
  "heading",
  "distance",
  "towards",
  "Turtle",
  "Screen",
];

const PYTHON_BUILTINS = [
  "print",
  "range",
  "input",
  "int",
  "float",
  "str",
  "bool",
  "list",
  "tuple",
  "dict",
  "set",
  "len",
  "abs",
  "round",
  "min",
  "max",
  "sum",
  "True",
  "False",
  "None",
  "for",
  "while",
  "break",
  "if",
  "else",
  "elif",
  "def",
  "return",
  "class",
  "self",
  "and",
  "or",
  "not",
  "in",
  "import",
  "turtle",
  "random",
  "math",
];

const COMMON_METHODS = [
  ...TURTLE_METHODS,
  "append",
  "add",
  "lower",
  "upper",
  "strip",
  "split",
  "keys",
  "values",
  "items",
  "get",
];

export function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function findClosestMatch(target, candidates) {
  if (!target) return null;
  const lower = target.toLowerCase();
  let best = null;
  let bestDist = Infinity;
  for (const cand of candidates) {
    const dist = levenshtein(lower, cand.toLowerCase());
    if (dist === 0) continue;
    if (dist < bestDist) {
      bestDist = dist;
      best = cand;
    }
  }
  const maxAllowed = target.length <= 4 ? 1 : 3;
  return bestDist <= maxAllowed ? best : null;
}

function extractUserVariables(code) {
  const names = new Set();
  const assignRe = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/gm;
  const forRe = /^\s*for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\b/gm;
  let match;
  while ((match = assignRe.exec(code)) !== null) names.add(match[1]);
  while ((match = forRe.exec(code)) !== null) names.add(match[1]);
  return Array.from(names);
}

function extractLineNumber(rawTraceback) {
  const matches = [...String(rawTraceback).matchAll(/File "<user_code>", line (\d+)/g)];
  if (matches.length > 0) {
    return Number(matches[matches.length - 1][1]);
  }
  const simpleMatch = String(rawTraceback).match(/line (\d+)/i);
  return simpleMatch ? Number(simpleMatch[1]) : null;
}

export function translatePythonError(rawTraceback, code = "") {
  const text = String(rawTraceback || "").trim();
  const lines = code.split("\n");
  const line = extractLineNumber(text);
  const srcLine = line && lines[line - 1] !== undefined ? lines[line - 1].trim() : "";

  const nonEmpty = text.split("\n").map((s) => s.trim()).filter(Boolean);
  const lastLine = nonEmpty[nonEmpty.length - 1] || text;

  if (text.includes("TurtleLimitError")) {
    return {
      title: "Whoa, Your Turtle Got Dizzy!",
      explanation:
        "Your code ran too many steps—usually because a loop never knows when to stop.",
      tip: "Check your `for` or `while` loop so it finishes in a few hundred steps instead of forever!",
      line,
      rawTraceback: text,
    };
  }

  if (lastLine.startsWith("RecursionError") || text.includes("RecursionError")) {
    return {
      title: `Infinite Recursion${line ? ` on Line ${line}` : ""}`,
      explanation:
        "Your recursive function kept calling itself over and over without stopping!",
      tip: "Check your **base case** (like `if length < 15: return`) and make sure each recursive call passes a SMALLER number (like `length * 0.7`)!",
      line,
      rawTraceback: text,
    };
  }

  if (text.includes("KeyboardInterrupt")) {
    return {
      title: "Turtle Paused!",
      explanation: "You stopped the program before it finished.",
      tip: "Tweak your code whenever you're ready and click Run again.",
      line,
      rawTraceback: text,
    };
  }

  if (lastLine.startsWith("IndentationError") || lastLine.startsWith("TabError")) {
    return {
      title: `Spacing Mix-Up${line ? ` on Line ${line}` : ""}`,
      explanation:
        "Python uses spaces at the start of a line (indentation) to know which lines belong inside a `for` loop or `if` block.",
      tip: "Use 4 spaces (or press Tab) for every line inside a loop, and make sure lines outside the loop line up on the left!",
      line,
      rawTraceback: text,
    };
  }

  if (lastLine.startsWith("SyntaxError")) {
    if (
      lastLine.includes("cannot assign to expression") ||
      (/^\s*(if|elif|while)\b/.test(srcLine) && /[^=!<>]=[^=]/.test(srcLine))
    ) {
      return {
        title: `One \`=\` vs Two \`==\`${line ? ` on Line ${line}` : ""}`,
        explanation: "In Python, one `=` stores a value in a variable, while two `==` checks if two things are equal.",
        tip: "If you are comparing inside an `if` or `while`, use `==`!",
        line,
        rawTraceback: text,
      };
    }

    if (
      lastLine.includes("expected ':'") ||
      (/^\s*(for|while|if|elif|else|def|class)\b/.test(srcLine) &&
        !srcLine.replace(/#.*$/, "").trim().endsWith(":"))
    ) {
      return {
        title: `Missing Colon \`:\`${line ? ` on Line ${line}` : ""}`,
        explanation: `Lines starting with \`for\`, \`if\`, \`def\`, or \`class\` always need a colon \`:\` at the end so Python knows an indented block starts next.`,
        tip: srcLine
          ? `Try adding \`:\` at the end of: \`${srcLine}\``
          : "Add `:` at the end of your `for`, `if`, `def`, or `class` line!",
        line,
        rawTraceback: text,
      };
    }

    if (
      /^(?:[A-Za-z_][A-Za-z0-9_]*\.)?(?:forward|fd|backward|bk|back|right|rt|left|lt|goto|setpos|setheading|circle|pencolor|fillcolor|color|pensize|width|dot|write|print)\s+(?:["'\d-])/.test(
        srcLine
      ) ||
      lastLine.includes("Missing parentheses")
    ) {
      return {
        title: `Missing Parentheses \`()\`${line ? ` on Line ${line}` : ""}`,
        explanation:
          "Turtle commands and `print` need parentheses around what goes inside, like `t.forward(100)` or `print(72)`.",
        tip: "Wrap the number or text inside `(` and `)`.",
        line,
        rawTraceback: text,
      };
    }

    if (lastLine.includes("unterminated string") || lastLine.includes("EOL while scanning string")) {
      return {
        title: `Unclosed Quote${line ? ` on Line ${line}` : ""}`,
        explanation: "A piece of text has an opening quote `\"` or `'` without a matching closing quote.",
        tip: "Check that every color or text string has matching quotes on both ends, like `'blue'`.",
        line,
        rawTraceback: text,
      };
    }

    return {
      title: `Python Grammar Hiccup${line ? ` on Line ${line}` : ""}`,
      explanation: "Python couldn't read that line—there might be an extra/missing parenthesis, quote, or comma.",
      tip: srcLine ? `Take a close look at line ${line}: \`${srcLine}\`` : "Check parentheses `()` and colons `:`!",
      line,
      rawTraceback: text,
    };
  }

  if (lastLine.startsWith("NameError")) {
    const m = lastLine.match(/name ['"]([^'"]+)['"] is not defined/);
    const badName = m ? m[1] : "";
    let tip = "Check spelling and capital letters—Python treats `sides` and `Sides` as different names.";

    if (TURTLE_METHODS.includes(badName)) {
      tip = `Did you forget \`t.\` in front? Try \`t.${badName}(...)\`!`;
    } else if (["random", "math", "turtle"].includes(badName)) {
      tip = `Did you forget \`import ${badName}\` at the top of your code?`;
    } else {
      const candidates = [...TURTLE_METHODS, ...PYTHON_BUILTINS, ...extractUserVariables(code)];
      const suggestion = findClosestMatch(badName, candidates);
      if (suggestion) {
        tip = TURTLE_METHODS.includes(suggestion)
          ? `Did you mean \`t.${suggestion}(...)\` or \`${suggestion}\`?`
          : `Did you mean \`${suggestion}\`? (Also remember quotes around colors like \`"red"\`!)`;
      }
    }

    return {
      title: `Unknown Word \`${badName || "name"}\`${line ? ` on Line ${line}` : ""}`,
      explanation: `Python doesn't recognize \`${badName}\` yet. Maybe it has a typo, or the variable hasn't been created yet!`,
      tip,
      line,
      rawTraceback: text,
    };
  }

  if (lastLine.startsWith("AttributeError")) {
    const m = lastLine.match(/has no attribute ['"]([^'"]+)['"]/);
    const badAttr = m ? m[1] : "";
    const typeMatch = lastLine.match(/(?:['"]([^'"]+)['"] object|module ['"]([^'"]+)['"]) has no attribute/);
    const objType = (typeMatch && (typeMatch[1] || typeMatch[2])) || "object";
    const isTurtleObj = objType === "Turtle" || objType === "turtle" || objType === "Screen";

    if (isTurtleObj) {
      const suggestion = findClosestMatch(badAttr, TURTLE_METHODS);
      return {
        title: `Turtle Doesn't Know \`.${badAttr}()\`${line ? ` on Line ${line}` : ""}`,
        explanation: `Your turtle tried to run \`.${badAttr}()\`, which isn't a turtle command.`,
        tip: suggestion
          ? `Did you mean \`t.${suggestion}(...)\`?`
          : "Check the spelling of your turtle command (like `t.forward`, `t.right`, `t.penup`, `t.pencolor`).",
        line,
        rawTraceback: text,
      };
    }

    const suggestion = findClosestMatch(badAttr, COMMON_METHODS);
    return {
      title: `\`${objType}\` Doesn't Have \`.${badAttr}\`${line ? ` on Line ${line}` : ""}`,
      explanation: `The \`${objType}\` object doesn't have an attribute or method named \`.${badAttr}\`.`,
      tip: suggestion
        ? `Did you mean \`.${suggestion}(...)\`? (If it's your own \`class\`, check \`self.${badAttr} = ...\` inside \`__init__\` and method spelling!)`
        : `Check your spelling—if this is your own \`class\`, make sure \`self.${badAttr}\` is saved in \`__init__(self, ...)\` or defined as a method inside the class!`,
      line,
      rawTraceback: text,
    };
  }

  if (lastLine.startsWith("IndexError")) {
    return {
      title: `List Index Out of Range${line ? ` on Line ${line}` : ""}`,
      explanation:
        "You asked for an item position that doesn't exist in that list or word! Remember Python counts from `0`.",
      tip: "A list with 4 items has positions `0, 1, 2, 3` (or `-1` for the last item). Check `len(my_list)` or try `i % len(colors)` to wrap safely!",
      line,
      rawTraceback: text,
    };
  }

  if (lastLine.startsWith("KeyError")) {
    const keyMatch = lastLine.match(/^KeyError:\s*(.+)$/);
    const missingKey = keyMatch ? keyMatch[1].trim() : "key";
    return {
      title: `Missing Dictionary Key \`${missingKey}\`${line ? ` on Line ${line}` : ""}`,
      explanation: `Python looked inside your dictionary (\`dict\`), but the key \`${missingKey}\` wasn't found!`,
      tip: "Check spelling/lowercase (use `.strip().lower()` on user input!), or guard lookups safely with `if word in my_dict:` before reading `my_dict[word]`.",
      line,
      rawTraceback: text,
    };
  }

  if (lastLine.startsWith("UnboundLocalError")) {
    return {
      title: `Variable Read Before Set Inside Function${line ? ` on Line ${line}` : ""}`,
      explanation:
        "Inside a `def` function, you tried to update an outside variable before giving it a local value inside the function.",
      tip: "Pass values into your function as parameters inside `(...)` and send answers back with `return`!",
      line,
      rawTraceback: text,
    };
  }

  if (lastLine.startsWith("ZeroDivisionError")) {
    return {
      title: `Divided by Zero${line ? ` on Line ${line}` : ""}`,
      explanation: "Math rule alert: you can't divide a number by `0`!",
      tip: "Make sure the variable or number after `/` isn't `0`.",
      line,
      rawTraceback: text,
    };
  }

  if (lastLine.startsWith("TypeError")) {
    const missingMatch = lastLine.match(/missing (\d+) required positional argument/);
    if (missingMatch) {
      return {
        title: `Missing Input Inside \`()\`${line ? ` on Line ${line}` : ""}`,
        explanation: `That command needs ${missingMatch[1]} input value(s) inside the parentheses, like \`t.forward(100)\`.`,
        tip: "Put the missing number or text inside `(...)`!",
        line,
        rawTraceback: text,
      };
    }

    const argMatch = lastLine.match(/takes (\d+) positional argument.*but (\d+) were given/);
    if (argMatch) {
      const isBoundMethod = /Turtle\.[A-Za-z_]+\(\)|Screen\.[A-Za-z_]+\(\)/.test(lastLine);
      const expected = Math.max(0, Number(argMatch[1]) - (isBoundMethod ? 1 : 0));
      const given = Math.max(0, Number(argMatch[2]) - (isBoundMethod ? 1 : 0));
      return {
        title: `Wrong Number of Inputs${line ? ` on Line ${line}` : ""}`,
        explanation: `That command expected ${expected} input(s), but got ${given}.`,
        tip: "Check what goes inside the `(...)`—for example, `t.goto(x, y)` needs 2 numbers, while `t.forward(100)` needs 1.",
        line,
        rawTraceback: text,
      };
    }
    return {
      title: `Type Mix-Up${line ? ` on Line ${line}` : ""}`,
      explanation:
        "You tried to mix two different kinds of values—like adding a word and a number, or using `()` on a number.",
      tip: "Check whether your values should be numbers (like `100`) or quoted text (like `\"blue\"`).",
      line,
      rawTraceback: text,
    };
  }

  if (lastLine.startsWith("ValueError")) {
    return {
      title: `Unexpected Value${line ? ` on Line ${line}` : ""}`,
      explanation: "Python got a value it couldn't convert or use for that command.",
      tip: `Details: ${lastLine.replace(/^ValueError:\s*/, "")}`,
      line,
      rawTraceback: text,
    };
  }

  return {
    title: `Oops! Python Hit a Snag${line ? ` on Line ${line}` : ""}`,
    explanation: lastLine,
    tip: "Read the line highlighted in red and check your spelling, numbers, and parentheses.",
    line,
    rawTraceback: text,
  };
}
