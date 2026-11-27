function makeStarBlueprint(points, skip, sideLen, startX = -sideLen / 2, startY = 20) {
  const segs = [];
  let x = startX;
  let y = startY;
  let heading = 0;
  const turn = -((360 * skip) / points);
  for (let i = 0; i < points; i++) {
    const rad = (heading * Math.PI) / 180;
    const nx = x + sideLen * Math.cos(rad);
    const ny = y + sideLen * Math.sin(rad);
    segs.push({ x1: x, y1: y, x2: nx, y2: ny });
    x = nx;
    y = ny;
    heading += turn;
  }
  return segs;
}

export const UNIT_4 = {
  id: "unit4",
  number: 4,
  title: "Functions & Star Math",
  description: "Invent your own reusable Python commands with `def`, crack 144° star math, and stamp tiled grids!",
  theme: "orange",
};

export const UNIT_4_NODES = [
  {
    id: "u4-l1",
    unitId: "unit4",
    type: "code",
    icon: "🧩",
    title: "Your First Function",
    subtitle: "Define def draw_square(size): and reuse it!",
    xp: 35,
    bonusXp: 15,
    story:
      "Teach Python a brand-new command! Define `def draw_square(size):` with a `size` parameter, then call it at least **2 times** with different sizes.",
    mathTip:
      "Parameters work like adjustable dials: calling `draw_square(50)` and `draw_square(110)` runs the exact same recipe at 2 different scales!",
    starterCode: `import turtle

t = turtle.Turtle()
t.pensize(3)

def draw_square(size):
    for i in range(4):
        t.forward(size)
        t.right(90)

t.pencolor("orange")
draw_square(60)

# Now jump or stay put and call draw_square(...) with a DIFFERENT size!
`,
    blueprint: null,
    showGridDefault: false,
    goals: [
      "Define a function with a parameter (like `def draw_square(size):`)",
      "Call your function at least 2 times",
      "Draw 2+ closed squares with different side lengths",
    ],
    bonusGoal: "Bonus Star: Draw 3+ squares using at least 2 different colors!",
    hints: [
      "Add another call at the bottom like `draw_square(110)` (with 0 spaces in front so it's outside `def`)!",
      "Want them side-by-side? Use `t.penup()`, `t.forward(80)`, `t.pendown()`, then `draw_square(100)`.",
      "For the Bonus Star, change `t.pencolor(\"blue\")` and add a 3rd `draw_square(...)` call!",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments } = turtleData;
      const paramFns = (astInfo?.defNames || []).filter(
        (fn) => (astInfo?.defParamCounts?.[fn] || 0) >= 1
      );
      const calledTwice = paramFns.some(
        (fn) => (astInfo?.defCallCounts?.[fn] || 0) >= 2 || Boolean(astInfo?.hasDefCalledInLoop?.[fn])
      );

      const paths = h.splitClosedShapes(segments);
      const squares = paths.filter((p) => h.isRegularPolygon(p, 4, { minSide: 20 }));
      const sideLengths = squares.map((sq) => {
        const lens = h.pathEdgeLengths(sq);
        return lens.reduce((a, b) => a + b, 0) / lens.length;
      });
      const distinctSizes = [];
      for (const len of sideLengths) {
        if (!distinctSizes.some((d) => Math.abs(d - len) <= 6)) {
          distinctSizes.push(len);
        }
      }

      const hasTwoDifferentSquares = squares.length >= 2 && distinctSizes.length >= 2;
      const bonusOk = squares.length >= 3 && h.countDistinctColors(segments) >= 2;

      const goals = [
        { label: "Define a function with a parameter (`def`)", passed: paramFns.length >= 1 },
        { label: "Call your function 2+ times", passed: calledTwice },
        { label: "Draw 2+ closed squares of different sizes", passed: hasTwoDifferentSquares },
      ];
      const passed = paramFns.length >= 1 && calledTwice && hasTwoDifferentSquares;
      let feedback = "Reusable power unlocked! One `def` recipe drew multiple sized squares.";
      if (!passed) {
        if (paramFns.length < 1) feedback = "Define a function with a parameter like `def draw_square(size):`!";
        else if (!calledTwice) feedback = "Call your function at least twice (for example, `draw_square(60)` and `draw_square(110)`)!";
        else if (squares.length < 2) feedback = "Make sure at least 2 closed squares appear on the canvas (if they overlap, make them different sizes!).";
        else feedback = "Nice squares! Make sure at least two of them have DIFFERENT sizes (like `60` and `110`).";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: "Triple-square colorful function mastery!",
      };
    },
  },
  {
    id: "u4-l2",
    unitId: "unit4",
    type: "code",
    icon: "⭐",
    title: "The 144° 5-Point Star",
    subtitle: "Two full spins: 720° ÷ 5 = 144°!",
    xp: 40,
    bonusXp: 15,
    story:
      "A regular pentagon makes **1** full spin (`360° ÷ 5 = 72°`). A crisp 5-point star weaves across the middle and makes **2** full spins (`720° ÷ 5 = 144°`)! Put it inside `def draw_star(size):`.",
    mathTip:
      "`2 × 360° = 720°`, and `720° ÷ 5 = 144°`! Each sharp tip has an inside angle of `180° - 144° = 36°`.",
    starterCode: `import turtle

t = turtle.Turtle()
t.pencolor("orange")
t.fillcolor("gold")
t.pensize(3)

def draw_star(size):
    for i in range(5):
        t.forward(size)
        # Turn 144 degrees (2 * 360 / 5)!
        

t.penup()
t.goto(-75, 20)
t.pendown()
draw_star(150)
`,
    blueprint: makeStarBlueprint(5, 2, 150, -75, 20),
    showGridDefault: false,
    goals: [
      "Define and call a star function (`def` + `for`)",
      "Draw a closed 5-point star using 144° turns",
    ],
    bonusGoal: "Bonus Star: Fill your star with `begin_fill()`/`end_fill()` OR draw 2+ stars!",
    hints: [
      "Inside `draw_star(size)`, add `t.right(144)` (indented 8 spaces inside the `for` loop!).",
      "Check the math: `5 × 144° = 720°` = two full `360°` rotations!",
      "To earn the Bonus Star, put `t.begin_fill()` before `draw_star(150)` and `t.end_fill()` after—or call `draw_star(60)` somewhere else too!",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments, commands } = turtleData;
      const usedDefAndLoop =
        Boolean(astInfo?.hasDef) &&
        Boolean(astInfo?.hasFor) &&
        Object.values(astInfo?.defCallCounts || {}).some((c) => c >= 1);

      const paths = h.splitClosedShapes(segments);
      const stars = paths.filter((p) => h.isStarPolygon(p, 5, 2, { minSide: 40 }));
      const bonusOk = h.countFills(commands) >= 1 || stars.length >= 2;

      const goals = [
        { label: "Define and call a function with a `for` loop", passed: usedDefAndLoop },
        { label: "Draw a closed 5-point star (144° turns)", passed: stars.length >= 1 },
      ];
      const passed = usedDefAndLoop && stars.length >= 1;
      let feedback = "720° ÷ 5 = 144°—crisp geometric 5-point star!";
      if (!passed) {
        if (!usedDefAndLoop) feedback = "Keep your star code inside a `def` function with a `for` loop, and call it!";
        else {
          const pentagon = paths.find((p) => h.isRegularPolygon(p, 5, { minSide: 35 }));
          if (pentagon) {
            feedback = "Ooh, 72° draws a pentagon (1 spin = 360°)! Double it to `144` degrees (2 spins = 720°) for a 5-point star!";
          } else {
            feedback = "Not quite a closed 5-point star yet—loop 5 times with equal steps and turn `144` degrees each time!";
          }
        }
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: stars.length >= 2 ? "Double-star galaxy unlocked!" : "Golden filled star complete!",
      };
    },
  },
  {
    id: "u4-l3",
    unitId: "unit4",
    type: "code",
    icon: "🏭",
    title: "Polygon Factory (2 Inputs)",
    subtitle: "One function `draw_polygon(sides, size)` draws any shape!",
    xp: 40,
    bonusXp: 20,
    story:
      "Functions can take **2 parameters** separated by a comma! Build `def draw_polygon(sides, size):`, then use it to draw at least **2 different polygons** (like a triangle and a hexagon).",
    mathTip:
      "Notice how `angle = 360 / sides` inside your function automatically works for `sides = 3, 4, 5, 6, 8, 12`—any regular polygon!",
    starterCode: `import turtle

t = turtle.Turtle()
t.pensize(3)

def draw_polygon(sides, size):
    angle = 360 / sides
    for i in range(sides):
        t.forward(size)
        t.right(angle)

# Shape 1: Triangle on the left
t.penup()
t.goto(-160, 40)
t.pendown()
t.pencolor("coral")
draw_polygon(3, 80)

# Now jump right and call draw_polygon(...) with a DIFFERENT number of sides!
`,
    blueprint: null,
    showGridDefault: false,
    goals: [
      "Define a function taking 2+ parameters (`sides, size`)",
      "Call it 2+ times (directly or inside a loop)",
      "Draw 2+ regular polygons with DIFFERENT side counts",
    ],
    bonusGoal: "Bonus Star: Draw 3+ different polygon types (for example: 3, 4, and 6 sides)!",
    hints: [
      "Move with `t.penup()`, `t.goto(20, 40)`, `t.pendown()`, then call `draw_polygon(6, 55)`!",
      "Make sure each polygon has a different `sides` number (like `3`, `5`, and `6`).",
      "Add a third stop like `t.goto(0, -100)` with `draw_polygon(4, 65)` for the Bonus Star!",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments } = turtleData;
      const twoParamFns = (astInfo?.defNames || []).filter(
        (fn) => (astInfo?.defParamCounts?.[fn] || 0) >= 2
      );
      const calledTwice = twoParamFns.some(
        (fn) => (astInfo?.defCallCounts?.[fn] || 0) >= 2 || Boolean(astInfo?.hasDefCalledInLoop?.[fn])
      );

      const paths = h.splitClosedShapes(segments);
      const polyKinds = new Set();
      for (const p of paths) {
        for (let n = 3; n <= 12; n++) {
          if (h.isRegularPolygon(p, n, { minSide: 20 })) {
            polyKinds.add(n);
            break;
          }
        }
      }

      const goals = [
        { label: "Define a function with 2+ parameters", passed: twoParamFns.length >= 1 },
        { label: "Call it 2+ times", passed: calledTwice },
        { label: `Draw 2+ different polygon types (${polyKinds.size} found)`, passed: polyKinds.size >= 2 },
      ];
      const passed = twoParamFns.length >= 1 && calledTwice && polyKinds.size >= 2;
      let feedback = `Polygon Factory online! Built ${polyKinds.size} distinct regular polygons from one function.`;
      if (!passed) {
        if (twoParamFns.length < 1) feedback = "Make sure your `def` function takes 2 parameters like `def draw_polygon(sides, size):`!";
        else if (!calledTwice) feedback = "Call `draw_polygon(...)` at least twice with different shapes!";
        else feedback = "Draw at least 2 DIFFERENT regular polygons (e.g. a 3-sided triangle and a 6-sided hexagon), separated with `t.penup()`!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && polyKinds.size >= 3,
        bonusFeedback: `${polyKinds.size} polygon types built from one blueprint!`,
      };
    },
  },
  {
    id: "u4-q1",
    unitId: "unit4",
    type: "quiz",
    icon: "⚡",
    title: "Quick Check: Function Master",
    subtitle: "Parameters, calling functions, & star angles",
    xp: 20,
    questions: [
      {
        prompt: "Why does a classic 5-point star turn **`144°`** at every tip instead of `72°`?",
        options: [
          "Because the turtle wraps around TWO full circles: 2 × 360° ÷ 5 = 144°",
          "Because stars have 144 sides",
          "Because `def` always doubles turn angles",
        ],
        correctIndex: 0,
        explanation: "Exactly! 1 full spin (360° ÷ 5 = 72°) makes a pentagon; 2 full spins (720° ÷ 5 = 144°) weaves a 5-point star!",
      },
      {
        prompt: "What happens if you run this code?",
        code: `import turtle
t = turtle.Turtle()

def draw_box():
    for i in range(4):
        t.forward(80)
        t.right(90)`,
        options: [
          "It draws an 80×80 square right away",
          "Nothing is drawn because `draw_box()` was defined, but never called!",
          "Python crashes with a SyntaxError",
        ],
        correctIndex: 1,
        explanation:
          "`def` teaches Python a recipe—it doesn't run the recipe until you actually call `draw_box()`!",
      },
      {
        prompt: "In `def draw_polygon(sides, size):`, if you call `draw_polygon(8, 50)`, what is `360 / sides`?",
        options: ["36°", "45°", "60°"],
        correctIndex: 1,
        explanation: "When `sides = 8`, `360 ÷ 8 = 45°`—an octagon!",
      },
    ],
  },
  {
    id: "u4-l4",
    unitId: "unit4",
    type: "code",
    icon: "🧱",
    title: "Tiled Mosaic Grid",
    subtitle: "Helper function + nested grid loops",
    xp: 45,
    bonusXp: 20,
    story:
      "Combine your superpowers! Write a tile helper function `def draw_tile(x, y, size):`, then use **nested `for` loops** (`row` and `col`) to stamp a clean mosaic grid of at least **6 separate tiles**!",
    mathTip:
      "Grid math: if each tile is `50` wide with a `10` gap, step by `60`: `x = -90 + col * 60` and `y = 60 - row * 60`!",
    starterCode: `import turtle

t = turtle.Turtle()
t.pensize(2)

def draw_tile(x, y, size):
    t.penup()
    t.goto(x, y)
    t.pendown()
    for i in range(4):
        t.forward(size)
        t.right(90)

# Stamp a 2-row by 3-column grid (6 tiles!) — try 3x3 for the Bonus Star!
for row in range(2):
    for col in range(3):
        t.pencolor("orange")
        # Call draw_tile(-90 + col * 65, 60 - row * 65, 50)
        
`,
    blueprint: null,
    showGridDefault: false,
    goals: [
      "Define a tile helper function (`def`)",
      "Use nested loops (`row` and `col`)",
      "Stamp at least 6 separate closed tiles",
    ],
    bonusGoal: "Bonus Star: Build a 3×3 (9+ tiles) mosaic using 2+ colors!",
    hints: [
      "Inside the inner `col` loop, call `draw_tile(-90 + col * 65, 60 - row * 65, 50)`!",
      "For a 3×3 grid (9 tiles), change `range(2)` to `range(3)`!",
      "Add color variety with `colors = [\"orange\", \"teal\", \"purple\"]` and `t.pencolor(colors[(row + col) % 3])`!",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments } = turtleData;
      const usedDef = Boolean(astInfo?.hasDef) && Object.values(astInfo?.defCallCounts || {}).some((c) => c >= 1);
      const indirectNested = (astInfo?.defNames || []).some(
        (fn) => Boolean(astInfo?.defHasLoop?.[fn]) && Boolean(astInfo?.hasDefCalledInLoop?.[fn])
      );
      const nested = (astInfo?.maxLoopNesting || 0) >= 2 || indirectNested;
      const paths = h.splitClosedShapes(segments);
      const closedTiles = paths.filter((p) => h.isClosedPath(p));
      const bonusOk = closedTiles.length >= 9 && h.countDistinctColors(segments) >= 2;

      const goals = [
        { label: "Define and call a helper function (`def`)", passed: usedDef },
        { label: "Use nested `for` loops for rows & columns", passed: nested },
        { label: `Draw 6+ separate closed tiles (${closedTiles.length} drawn)`, passed: closedTiles.length >= 6 },
      ];
      const passed = usedDef && nested && closedTiles.length >= 6;
      let feedback = `Mosaic master! ${closedTiles.length} crisp tiles stamped in a grid.`;
      if (!passed) {
        if (!usedDef) feedback = "Define a `draw_tile(...)` helper function and call it inside your loop!";
        else if (!nested) feedback = "Use a nested `for` loop (`for row in range(...):` with `for col in range(...):` inside)!";
        else feedback = `Found ${closedTiles.length} closed tile(s)—make sure your grid stamps at least 6 separate tiles!`;
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: `${closedTiles.length}-tile multicolor mosaic complete!`,
      };
    },
  },
];
