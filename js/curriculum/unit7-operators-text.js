function makeArenaBlueprint() {
  return [
    { x1: -140, y1: 100, x2: 140, y2: 100 },
    { x1: 140, y1: 100, x2: 140, y2: -100 },
    { x1: 140, y1: -100, x2: -140, y2: -100 },
    { x1: -140, y1: -100, x2: -140, y2: 100 },
  ];
}

export const UNIT_7 = {
  id: "unit7",
  number: 7,
  title: "Operators, Logic Gates & Smart Text",
  description: "Master `//`, `**`, `+=`, compound `and`/`or`/`not` rules, clean `str` text with f-strings, and `return` answer machines!",
  theme: "indigo",
};

export const UNIT_7_NODES = [
  {
    id: "u7-l1",
    unitId: "unit7",
    type: "code",
    icon: "🧮",
    title: "Tile Grid & Power Towers",
    subtitle: "Floor division `//`, powers `**`, & `+=`",
    xp: 40,
    bonusXp: 15,
    story:
      "In Singapore Math, `9 ÷ 4 = 2` remainder `1`. In Python, `9 // 4` gives the whole-number **quotient (`2`)** and `9 % 4` gives the **remainder (`1`)**! Use ONE `for i in range(12):` loop with `row = i // 4`, `col = i % 4`, and `total += 1` to lay a **3×4 grid of 12 tiles**, then `print()` the total!",
    mathTip:
      "As `i` counts `0..11`, `i // 4` gives rows `0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2` while `i % 4` cycles columns `0, 1, 2, 3`—one loop builds an entire 2D grid!",
    starterCode: `import turtle

t = turtle.Turtle()
t.pensize(2)
t.pencolor("indigo")

total = 0

for i in range(12):
    # 1. Calculate row = i // 4 and col = i % 4, and add 1 to total using +=!
    row = 0
    col = 0

    x = -110 + col * 70
    y = 75 - row * 70
    t.penup()
    t.goto(x, y)
    t.pendown()
    t.dot(28, "indigo")

print("Total tiles:", total)
`,
    blueprint: null,
    showGridDefault: true,
    goals: [
      "Use `//` (floor division) and `+=` inside a `for` loop",
      "Stamp a 3×4 grid of 12+ tiles across 3+ quadrants",
      "Use `print()` to report the total count (`12`)",
    ],
    bonusGoal: "Bonus Star: Print a Powers-of-2 tower using `**` (like `2 ** k`) OR alternate row colors with `row % 2`!",
    hints: [
      "Inside the loop, set `row = i // 4`, `col = i % 4`, and `total += 1`!",
      "Every time `total += 1` runs, `total` goes up by `1` until it reaches `12`!",
      "For the Bonus Star, check `if row % 2 == 0:` to switch dot colors, OR add `print(\"2^5 =\", 2 ** 5)` using `**`!",
    ],
    check(runResult, h) {
      const { astInfo, stdout, turtleData } = runResult;
      const { segments, commands } = turtleData;
      const usedOps = Boolean(astInfo?.hasFor) && Boolean(astInfo?.hasFloorDiv) && Boolean(astInfo?.hasAugAssign);

      const dots = h.countDots(commands);
      const closedShapes = h.splitClosedShapes(segments).filter((p) => h.isClosedPath(p)).length;
      const tileCount = Math.max(dots, closedShapes);
      const quads = h.visitedQuadrants(segments, commands);
      const gridOk = tileCount >= 12 && quads.size >= 3;

      const nums = h.extractPrintedNumbers(stdout);
      const printedTotal = Boolean(astInfo?.hasPrint) && nums.some((n) => n >= 12);

      const dotColors = new Set(
        commands.filter((c) => c.cmd === "dot" && c.color).map((c) => String(c.color).toLowerCase())
      );
      const segColors = new Set(segments.map((s) => String(s.color || "").toLowerCase()));
      const allColors = new Set([...dotColors, ...segColors]);
      const bonusOk = Boolean(astInfo?.hasPow) || (Boolean(astInfo?.hasModulo) && allColors.size >= 2);

      const goals = [
        { label: "Use `//` and `+=` inside a `for` loop", passed: usedOps },
        { label: `Place 12+ grid tiles across 3+ quadrants (${tileCount} tiles)`, passed: gridOk },
        { label: "Use `print()` to show the total (`12`+)", passed: printedTotal },
      ];
      const passed = usedOps && gridOk && printedTotal;
      let feedback = `Grid engineering! One loop with \`//\`, \`%\`, and \`+=\` laid ${tileCount} neat tiles.`;
      if (!passed) {
        if (!usedOps) feedback = "Make sure your loop uses floor division `//` (`row = i // 4`) AND `+=` (`total += 1`)!";
        else if (!gridOk) feedback = "Update `row = i // 4` and `col = i % 4` so all 12 tiles spread across 3 rows and 4 columns!";
        else feedback = "Use `print(...)` to output the total number of tiles (`12`)!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: astInfo?.hasPow ? "Power-tower `**` math unlocked!" : "Alternating modulo row pattern unlocked!",
      };
    },
  },
  {
    id: "u7-l2",
    unitId: "unit7",
    type: "code",
    icon: "🚧",
    title: "Force-Field Arena",
    subtitle: "Compound rules with `and`, `or`, & `not`",
    xp: 45,
    bonusXp: 15,
    story:
      "Inside the dashed blue arena (`-140` to `140` wide, `-100` to `100` tall), patrol 28 random steps! Use **`and`**, **`or`**, or **`not`** to detect whenever your turtle crosses the fence (`x < -130 or x > 130 or y < -90 or y > 90`) and steer it straight back inside!",
    mathTip:
      "Chained comparisons work in Python too: `(-130 <= x <= 130) and (-90 <= y <= 90)` is `True` only when BOTH `x` and `y` stay safely inside the box!",
    starterCode: `import turtle
import random

t = turtle.Turtle()
t.pensize(3)

# 1. Draw the Indigo Force-Field Box (-140..140, -100..100)
t.pencolor("indigo")
t.penup()
t.goto(-140, 100)
t.pendown()
for w, h in [(280, 90), (200, 90), (280, 90), (200, 90)]:
    t.forward(w)
    t.right(h)

t.penup()
t.home()
t.pendown()
t.pencolor("dodgerblue")

for step in range(28):
    t.setheading(random.randint(0, 359))
    t.forward(40)
    x = t.xcor()
    y = t.ycor()

    # 2. Add an if guard with or / and / not!
    # Example: if x < -130 or x > 130 or y < -90 or y > 90:
    #     turn toward (0, 0) and step back inside!
    
`,
    blueprint: makeArenaBlueprint(),
    showGridDefault: true,
    goals: [
      "Use `and`, `or`, or `not` inside an `if` fence check",
      "Patrol 20+ random steps inside the arena",
      "Keep the turtle finishing inside the box (`|x| <= 150, |y| <= 110`)",
    ],
    bonusGoal: "Bonus Star: Stamp 2+ colors of `t.dot()` (red near walls, green/teal inside)!",
    hints: [
      "Inside the loop, write:\n`if x < -130 or x > 130 or y < -90 or y > 90:`\n`    t.dot(10, \"red\")`\n`    t.setheading(t.towards(0, 0))`\n`    t.forward(45)`",
      "Add an `else:` branch with `t.dot(8, \"teal\")` to celebrate safe steps and earn the Bonus Star!",
      "Keep all `if` body lines indented 8 spaces (4 for `for`, plus 4 for `if`)!",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments, commands, finalState } = turtleData;
      const usedLogicGate =
        Boolean(astInfo?.hasIf) && (Boolean(astInfo?.hasBoolOp) || Boolean(astInfo?.hasNot));
      const patrolled =
        Boolean(astInfo?.hasImportRandom) && Boolean(astInfo?.hasFor) && segments.length >= 24;
      const insideFinish =
        Math.abs(finalState?.x || 0) <= 155 && Math.abs(finalState?.y || 0) <= 115;

      const dotColors = new Set(
        commands.filter((c) => c.cmd === "dot" && c.color).map((c) => String(c.color).toLowerCase())
      );
      const bonusOk = dotColors.size >= 2 && h.countDots(commands) >= 4;

      const goals = [
        { label: "Use `and`, `or`, or `not` in an `if` check", passed: usedLogicGate },
        { label: "Patrol 20+ random steps", passed: patrolled },
        { label: "Bounce cleanly so turtle finishes inside the arena", passed: insideFinish },
      ];
      const passed = usedLogicGate && patrolled && insideFinish;
      let feedback = "Force-field active! Your compound `and`/`or`/`not` rules kept the turtle inside the box.";
      if (!passed) {
        if (!usedLogicGate) feedback = "Add an `if` rule using `or`, `and`, or `not` to check BOTH `x` and `y` walls!";
        else if (!patrolled) feedback = "Keep `import random` and let your turtle walk at least 20 patrol steps!";
        else feedback = "Your turtle wandered outside the box at the end—when out of bounds, point `t.towards(0, 0)` and walk back inside!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: "Color-coded force-field radar unlocked!",
      };
    },
  },
  {
    id: "u7-l3",
    unitId: "unit7",
    type: "code",
    icon: "🏷️",
    title: "Magic Name Banner",
    subtitle: "`.strip()`, `.lower()`, `len()`, & f-strings",
    xp: 45,
    bonusXp: 15,
    story:
      "Ask the player for a hero name with `input()`, tidy away extra spaces and messy capitals using **`.strip().lower()`**, measure **`len(clean)`** to size a neat frame box, and sign **`f\"Hello, {clean}!\"`** with `t.write(...)`!",
    mathTip:
      "`\"  Maya  \".strip().lower()` becomes `\"maya\"` (`len == 4`), so `width = len(clean) * 20 + 120` automatically makes longer names get wider frames!",
    starterCode: `import turtle

t = turtle.Turtle()
t.pensize(3)
t.pencolor("indigo")

raw = input("Enter your hero name: ")
# 1. Clean raw with .strip() and .lower() (e.g. clean = raw.strip().lower())


# 2. Measure len(clean) to size the frame width, draw the box, and write an f-string banner!
`,
    blueprint: null,
    showGridDefault: false,
    goals: [
      "Use `input()`, `.strip()`, `.lower()`, and `len()`",
      "Write a personalized banner using an f-string (`f\"...\"`) + `t.write(...)`",
      "Draw a closed box around your banner",
    ],
    bonusGoal: "Bonus Star: Check `clean[0]` with an `if` statement to pick a custom color AND fill your banner!",
    hints: [
      "Start with:\n`clean = raw.strip().lower()`\n`if len(clean) == 0:`\n`    clean = \"hero\"`\n`width = max(160, len(clean) * 22 + 90)`",
      "Draw a centered rectangle (`width` wide, `80` tall) starting at `(-width / 2, 40)` with `t.begin_fill()` and `t.end_fill()`!",
      "Then jump to `(0, -10)` and call:\n`t.write(f\"Hello, {clean}!\", align=\"center\", font=(\"Arial\", 20, \"bold\"))`",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments, commands } = turtleData;
      const calls = astInfo?.callNames || [];
      const cleanedText =
        Boolean(astInfo?.hasInput) &&
        calls.includes("strip") &&
        (calls.includes("lower") || calls.includes("upper") || calls.includes("title")) &&
        calls.includes("len");
      const usedFStringWrite = Boolean(astInfo?.hasFString) && h.countWrites(commands) >= 1;
      const closedBoxes = h.splitClosedShapes(segments).filter((p) => h.isClosedPath(p));
      const bonusOk =
        Boolean(astInfo?.hasIf) &&
        (h.countFills(commands) >= 1 || h.countDistinctColors(segments) >= 2);

      const goals = [
        { label: "Use `input()`, `.strip()`, `.lower()`, and `len()`", passed: cleanedText },
        { label: "Write banner text with `f\"...\"` and `t.write(...)`", passed: usedFStringWrite },
        { label: "Draw a closed banner frame", passed: closedBoxes.length >= 1 },
      ];
      const passed = cleanedText && usedFStringWrite && closedBoxes.length >= 1;
      let feedback = "Clean text engineering! Your banner automatically sizes to any name.";
      if (!passed) {
        if (!cleanedText) feedback = "Clean your `input()` with `.strip()` and `.lower()`, and measure its length with `len(...)`!";
        else if (!usedFStringWrite) feedback = "Use an f-string like `f\"Hello, {clean}!\"` inside `t.write(...)`!";
        else feedback = "Draw a closed rectangle frame around your greeting banner!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: "First-letter `clean[0]` color styling unlocked!",
      };
    },
  },
  {
    id: "u7-q1",
    unitId: "unit7",
    type: "quiz",
    icon: "⚡",
    title: "Quick Check: Operators & Text",
    subtitle: "Quotients, logic gates, text, & `return`",
    xp: 25,
    questions: [
      {
        prompt: "What are the values of `17 // 5` and `17 % 5` in Python?",
        options: [
          "`3.4` and `2`",
          "`3` (whole quotient) and `2` (remainder)",
          "`5` and `3`",
        ],
        correctIndex: 1,
        explanation: "5 fits into 17 three whole times (`17 // 5 == 3`) with 2 left over (`17 % 5 == 2`)!",
      },
      {
        prompt: "Suppose `x = 50` and `y = 200`. Is `(x < 100) and (y < 100)` `True` or `False`?",
        options: [
          "`True` because 50 is less than 100",
          "`False` because BOTH parts must be True for `and`, and `200 < 100` is False",
          "`Error` because you cannot combine two comparisons",
        ],
        correctIndex: 1,
        explanation: "`and` requires BOTH sides to be `True`. Since `y < 100` is `False`, the whole expression is `False` (whereas `or` would be `True`)!",
      },
      {
        prompt: "What is the key difference between `print(360 / sides)` and `return 360 / sides` inside a `def` function?",
        options: [
          "`print()` shows text in the console; `return` hands back the value so your code can store or reuse it in calculations",
          "`return` erases the variable forever",
          "They do the exact same thing",
        ],
        correctIndex: 0,
        explanation: "`return` hands the calculated answer back to whoever called the function—just like an Answer Machine!",
      },
      {
        prompt: "Spot the bug! A player types `\"  MAYA  \"`. Why does `print(name)` still print `\"  MAYA  \"` at the end?",
        code: `name = "  MAYA  "
name.strip().lower()
print(name)`,
        options: [
          "`.strip().lower()` returns a NEW cleaned string—you must save it back: `name = name.strip().lower()`",
          "`.lower()` only works on single letters",
          "`print()` removes lowercase automatically",
        ],
        correctIndex: 0,
        explanation: "Strings never mutate in place—always save the cleaned text into a variable with `name = name.strip().lower()`!",
      },
    ],
  },
  {
    id: "u7-l4",
    unitId: "unit7",
    type: "code",
    icon: "⚙️",
    title: "Answer Machines (`return`)",
    subtitle: "Write `def` helpers that `return` numbers & colors",
    xp: 50,
    bonusXp: 20,
    story:
      "So far your `def` functions immediately drew lines. Real engineers also build **Answer Machines** using **`return`**! Write `def turn_angle(sides):` to `return 360 / sides` and `def ring_color(step):` to `return` a color name, then use BOTH to draw nested polygons and print an `f\"...\"` summary!",
    mathTip:
      "`angle = turn_angle(6)` catches the returned number (`60.0`) from your function so `t.right(angle)` and `print(f\"...\")` can both use it!",
    starterCode: `import turtle

t = turtle.Turtle()
t.pensize(3)

def turn_angle(sides):
    # 1. Return 360 / sides instead of pass!
    pass

def ring_color(step):
    # 2. Return a different color string depending on step % 3!
    pass

# 3. Call your Answer Machines to draw 2+ closed polygons and print an f-string!
`,
    blueprint: null,
    showGridDefault: false,
    goals: [
      "Define `def` helper(s) that hand back values using `return`",
      "Draw 2+ closed polygons using your returned angle",
      "Print a summary using `print(f\"...\")`",
    ],
    bonusGoal: "Bonus Star: Draw 3+ different polygon counts (`sides`) with 3+ returned colors!",
    hints: [
      "Write `return 360 / sides` inside `turn_angle(sides)`, and `if step % 3 == 0: return \"indigo\"` / `elif step % 3 == 1: return \"dodgerblue\"` / `else: return \"coral\"` inside `ring_color(step)`!",
      "Then loop `for idx, s in enumerate([3, 4, 6]):` (or `for s in [3, 4, 5]:`) setting `angle = turn_angle(s)` and `t.pencolor(ring_color(idx))` so all 3 colors shine!",
      "Finish with `print(f\"Hexagon turn angle = {turn_angle(6)}\")`!",
    ],
    check(runResult, h) {
      const { astInfo, stdout, turtleData } = runResult;
      const { segments } = turtleData;
      const topDefs = astInfo?.topLevelDefNames || [];
      const calledDefs = topDefs.filter((fn) => (astInfo?.defCallCounts?.[fn] || 0) >= 1);
      const hasReturnMachine = Boolean(astInfo?.hasReturnValue) && calledDefs.length >= 1;

      const paths = h.splitClosedShapes(segments);
      const polyCount = paths.filter((p) => {
        for (let n = 3; n <= 12; n++) {
          if (h.isRegularPolygon(p, n, { minSide: 20 })) return true;
        }
        return false;
      }).length;
      const polyKinds = new Set();
      for (const p of paths) {
        for (let n = 3; n <= 12; n++) {
          if (h.isRegularPolygon(p, n, { minSide: 20 })) {
            polyKinds.add(n);
            break;
          }
        }
      }

      const printedSummary =
        Boolean(astInfo?.hasPrint) &&
        Boolean(astInfo?.hasFString) &&
        String(stdout || "").trim().length > 0;
      const bonusOk =
        calledDefs.length >= 2 && polyKinds.size >= 3 && h.countDistinctColors(segments) >= 3;

      const goals = [
        { label: "Define and call helper function(s) with `return`", passed: hasReturnMachine },
        { label: `Draw 2+ closed polygons (${polyCount} drawn)`, passed: polyCount >= 2 },
        { label: "Print a summary using `print(f\"...\")`", passed: printedSummary },
      ];
      const passed = hasReturnMachine && polyCount >= 2 && printedSummary;
      let feedback = "Answer Machines humming! Returning values lets functions plug into math, colors, and `print()` cleanly.";
      if (!passed) {
        if (!hasReturnMachine) feedback = "Make sure your `def` function uses `return ...` (not `pass`) and gets called!";
        else if (polyCount < 2) feedback = "Use `angle = turn_angle(s)` inside a loop to draw at least 2 closed regular polygons!";
        else feedback = "Add `print(f\"...\")` to report one of your returned values in the console!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: `Multi-machine rainbow polygon target (${polyKinds.size} shapes)!`,
      };
    },
  },
];
