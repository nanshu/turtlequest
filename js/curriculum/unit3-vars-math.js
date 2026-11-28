function makePolygonBlueprint(sides, sideLen, startX = 0, startY = 0) {
  const segs = [];
  let x = startX;
  let y = startY;
  let heading = 0;
  const stepAngle = -(360 / sides);
  for (let i = 0; i < sides; i++) {
    const rad = (heading * Math.PI) / 180;
    const nx = x + sideLen * Math.cos(rad);
    const ny = y + sideLen * Math.sin(rad);
    segs.push({ x1: x, y1: y, x2: nx, y2: ny });
    x = nx;
    y = ny;
    heading += stepAngle;
  }
  return segs;
}

export const UNIT_3 = {
  id: "unit3",
  number: 3,
  title: "Variables, Math & Coordinates",
  description: "Store values in variables, scale ratios, grow spirals, and map all 4 quadrants!",
  theme: "purple",
};

export const UNIT_3_NODES = [
  {
    id: "u3-l1",
    unitId: "unit3",
    type: "code",
    icon: "🧮",
    title: "Variable Power & print()",
    subtitle: "Let Python compute angles & perimeters",
    xp: 30,
    bonusXp: 15,
    story:
      "Variables are labeled boxes that hold numbers. Store `sides = 5` and `length = 90`, let Python calculate `angle = 360 / sides`, draw a pentagon, and `print()` the turn angle!",
    mathTip:
      "`360 / 5 = 72.0` degrees per turn, and `perimeter = sides * length = 5 × 90 = 450`!",
    starterCode: `import turtle

t = turtle.Turtle()
t.pencolor("purple")
t.pensize(4)

sides = 5
length = 90
# 1. Calculate angle = 360 / sides and print() it!


# 2. Finish the loop: turn right by angle!
for i in range(sides):
    t.forward(length)
    
`,
    blueprint: makePolygonBlueprint(5, 90, 0, 0),
    showGridDefault: false,
    goals: [
      "Store values in variables and use a `for` loop",
      "Draw a regular 5-sided pentagon",
      "Print the turn angle (72) using `print()`",
    ],
    bonusGoal: "Bonus Star: Also `print()` the pentagon's perimeter (`sides * length`)!",
    hints: [
      "Create `angle = 360 / sides`, add `print(\"Turn angle:\", angle)`, and put `t.right(angle)` inside the `for` loop!",
      "To earn the Bonus Star, add `print(\"Perimeter:\", sides * length)`!",
      "Keep `sides = 5` and `angle = 360 / sides` so `print()` outputs `72` (or `72.0`).",
    ],
    check(runResult, h) {
      const { astInfo, stdout, turtleData } = runResult;
      const { segments } = turtleData;
      const paths = h.getConnectedPaths(segments);
      const pentagon = paths.find((p) => h.isRegularPolygon(p, 5, { minSide: 35 }));
      const turtleVars = new Set(astInfo?.turtleVarNames || ["t"]);
      const userVars = (astInfo?.varNames || []).filter((v) => !turtleVars.has(v));
      const usedVarsAndLoop = userVars.length >= 2 && Boolean(astInfo?.hasFor);
      const nums = h.extractPrintedNumbers(stdout);
      const printedAngle = Boolean(astInfo?.hasPrint) && nums.some((n) => Math.abs(n - 72) <= 0.1);

      let printedPerimeter = false;
      if (pentagon) {
        const edgeLens = h.pathEdgeLengths(pentagon);
        const avgSide = edgeLens.reduce((a, b) => a + b, 0) / edgeLens.length;
        const expectedPerim = 5 * avgSide;
        printedPerimeter = nums.some((n) => Math.abs(n - expectedPerim) <= 2.5);
      }

      const goals = [
        { label: "Use variables + a `for` loop", passed: usedVarsAndLoop },
        { label: "Draw a regular pentagon", passed: Boolean(pentagon) },
        { label: "print() the turn angle (72)", passed: printedAngle },
      ];
      const passed = usedVarsAndLoop && Boolean(pentagon) && printedAngle;
      let feedback = "Variables + geometry + console output—triple win!";
      if (!passed) {
        if (!usedVarsAndLoop) feedback = "Create at least 2 variables (like `sides` and `length`) and use a `for` loop!";
        else if (!pentagon) feedback = "Make sure `sides = 5` and `angle = 360 / sides` to draw a 5-sided pentagon!";
        else if (!printedAngle) feedback = "Use `print(angle)` so 72 shows up in the console below!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && printedPerimeter,
        bonusFeedback: "Perimeter calculation printed cleanly!",
      };
    },
  },
  {
    id: "u3-l2",
    unitId: "unit3",
    type: "code",
    icon: "🌪️",
    title: "Growing Spiral",
    subtitle: "Use loop counter `i` inside forward()",
    xp: 35,
    bonusXp: 15,
    story:
      "Inside `for i in range(24):`, `i` counts `0, 1, 2, 3...`. If you move `10 + i * 6` steps each turn, every side grows longer than the last—creating a spiral!",
    mathTip:
      "Arithmetic sequence alert! `10 + i * 6` produces `10, 16, 22, 28, ...` (+6 each step).",
    starterCode: `import turtle

t = turtle.Turtle()
t.pencolor("indigo")
t.pensize(3)

for i in range(24):
    t.forward(10 + i * 6)
    # Turn 90 degrees (or try 91 or 72 for a twist!)
    
`,
    blueprint: null,
    showGridDefault: false,
    goals: [
      "Use a `for` loop",
      "Turn each step to spiral outward",
      "Draw 16+ segments that grow longer each step",
    ],
    bonusGoal: "Bonus Star: Draw 28+ segments with an off-90° twist (like 91°, 89°, or 72°)!",
    hints: [
      "Add `t.right(90)` inside the loop to make a square spiral!",
      "Want the spiral to twist smoothly? Try `for i in range(32):`, `t.forward(8 + i * 4)`, and `t.right(91)` or `t.right(72)`.",
      "Make sure your `t.forward(...)` uses `i` so each segment grows longer than the one before.",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments } = turtleData;
      const usedFor = Boolean(astInfo?.hasFor);
      const lengths = segments.map(h.segmentLength).filter((l) => l > 0.5);

      let growingSteps = 0;
      for (let idx = 1; idx < lengths.length; idx++) {
        if (lengths[idx] >= lengths[idx - 1] - 0.5) growingSteps += 1;
      }
      const paths = h.getConnectedPaths(segments, { tol: 2.5, mergeAngleDeg: 1.0 });
      const turns = paths.flatMap((p) => h.pathExteriorAngles(p));
      const sharpTurns = turns.filter((a) => Math.abs(a) >= 15).length;
      const box = h.boundingBox(segments);
      const turnedIntoSpiral = sharpTurns >= 12 && box.width >= 30 && box.height >= 30;

      const isGrowing =
        lengths.length >= 16 &&
        lengths[lengths.length - 1] > lengths[0] + 25 &&
        growingSteps >= Math.floor((lengths.length - 1) * 0.75);

      const hasTwist = turns.some((a) => Math.abs(Math.abs(a) - 90) >= 0.8);
      const bonusOk = lengths.length >= 28 && hasTwist;

      const goals = [
        { label: "Use a `for` loop", passed: usedFor },
        { label: "Turn each step to spiral outward", passed: turnedIntoSpiral },
        { label: "Draw 16+ steadily growing segments", passed: isGrowing && turnedIntoSpiral },
      ];
      const passed = usedFor && turnedIntoSpiral && isGrowing;
      let feedback = "Hypnotic! Watching `i` grow the spiral step-by-step is pure math art.";
      if (!passed) {
        if (!usedFor) feedback = "Use a `for i in range(...):` loop!";
        else if (!turnedIntoSpiral) feedback = "Your turtle went in a straight line! Add a turn like `t.right(90)` inside the loop to make it spiral!";
        else if (lengths.length < 16) feedback = "Increase `range(...)` to at least 16 steps and include a turn inside the loop!";
        else feedback = "Make sure the side length uses `i` (like `10 + i * 6`) so it grows bigger each turn!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: "Twisted optical spiral unlocked!",
      };
    },
  },
  {
    id: "u3-l3",
    unitId: "unit3",
    type: "code",
    icon: "⚖️",
    title: "Ratio Scaling (1:2 Squares)",
    subtitle: "Singapore Math ratios in action!",
    xp: 35,
    bonusXp: 15,
    story:
      "Draw **two separate squares** in a **1 : 2 side-length ratio** (for example, side `60` and side `120`). Notice what happens to the area when you double the side!",
    mathTip:
      "Singapore Math 5A check: If the side ratio is `1 : 2`, the perimeter ratio is `1 : 2`, AND the **area ratio** is `1 : 4` (`60² = 3600`, `120² = 14400`)!",
    starterCode: `import turtle

t = turtle.Turtle()
t.pensize(3)

small = 60
big = small * 2

# 1. Draw the small square on the left
t.penup()
t.goto(-160, 40)
t.pendown()
t.pencolor("blue")
for i in range(4):
    t.forward(small)
    t.right(90)

# 2. Jump right and draw the big square (side = big)!
`,
    blueprint: [
      ...makePolygonBlueprint(4, 60, -160, 40),
      ...makePolygonBlueprint(4, 120, 10, 60),
    ],
    showGridDefault: false,
    goals: [
      "Draw 2 separate closed squares",
      "Make the big square's side 2× the small square's side (1:2 ratio)",
    ],
    bonusGoal: "Bonus Star: `print()` both areas (`small * small` and `big * big`)!",
    hints: [
      "Use `t.penup()`, `t.goto(10, 60)`, and `t.pendown()` before drawing the big square.",
      "Then loop 4 times with `t.forward(big)` and `t.right(90)`!",
      "To grab the Bonus Star, add:\n`print(\"Small area:\", small * small)`\n`print(\"Big area:\", big * big)`",
    ],
    check(runResult, h) {
      const { astInfo, stdout, turtleData } = runResult;
      const { segments } = turtleData;
      const paths = h.getConnectedPaths(segments);
      const squares = paths.filter((p) => h.isRegularPolygon(p, 4, { minSide: 20 }));

      let matchedPair = null;
      for (let i = 0; i < squares.length; i++) {
        for (let j = i + 1; j < squares.length; j++) {
          const lenA = h.pathEdgeLengths(squares[i])[0];
          const lenB = h.pathEdgeLengths(squares[j])[0];
          const smallSide = Math.min(lenA, lenB);
          const bigSide = Math.max(lenA, lenB);
          const ratio = bigSide / smallSide;
          if (Math.abs(ratio - 2.0) <= 0.1) {
            matchedPair = { smallSide, bigSide };
          }
        }
      }

      const nums = h.extractPrintedNumbers(stdout);
      let printedAreas = false;
      if (matchedPair && astInfo?.hasPrint) {
        const aSmall = matchedPair.smallSide * matchedPair.smallSide;
        const aBig = matchedPair.bigSide * matchedPair.bigSide;
        printedAreas =
          nums.some((n) => Math.abs(n - aSmall) <= 4) &&
          nums.some((n) => Math.abs(n - aBig) <= 4);
      }

      const goals = [
        { label: "Draw 2 separate closed squares", passed: squares.length >= 2 },
        { label: "Scale big square to 2× small square (1:2 ratio)", passed: Boolean(matchedPair) },
      ];
      const passed = squares.length >= 2 && Boolean(matchedPair);
      let feedback = "1:2 side ratio nailed! Twice as wide = 4× the area.";
      if (!passed) {
        if (squares.length < 2) {
          feedback = `Found ${squares.length} closed square(s) so far—draw a second separate square using \`t.penup()\` and \`t.goto(...)\`!`;
        } else {
          feedback = "You have 2 squares, but their sides aren't in a 1:2 ratio (one should be double the other)!";
        }
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && printedAreas,
        bonusFeedback: "1:4 area ratio proven in the console!",
      };
    },
  },
  {
    id: "u3-q1",
    unitId: "unit3",
    type: "quiz",
    icon: "⚡",
    title: "Quick Check: Math & Coords",
    subtitle: "Quadrants, formulas, and scaling",
    xp: 20,
    questions: [
      {
        prompt: "On the turtle coordinate plane, where does `t.goto(-80, 60)` land?",
        options: [
          "Quadrant I (top-right)",
          "Quadrant II (top-left: negative x, positive y)",
          "Quadrant IV (bottom-right)",
        ],
        correctIndex: 1,
        explanation:
          "Negative `x` moves left (`-80`), and positive `y` moves up (`+60`), landing in Quadrant II (top-left)!",
      },
      {
        prompt: "In a growing spiral `t.forward(10 + i * 5)`, how far does the turtle move when `i = 3`?",
        options: ["25", "65", "18"],
        correctIndex: 0,
        explanation: "Order of operations: `3 × 5 = 15`, then `10 + 15 = 25`!",
      },
      {
        prompt: "If you double the side length of a square (1 : 2 ratio), what happens to its **area**?",
        options: [
          "The area becomes 2× bigger",
          "The area becomes 4× bigger",
          "The area stays the same",
        ],
        correctIndex: 1,
        explanation: "Doubling both width AND height multiplies area by `2 × 2 = 4`!",
      },
      {
        prompt: "Spot the bug! Why does Python raise `NameError: name 'lenght' is not defined`?",
        code: `length = 80
t.forward(lenght)`,
        options: [
          "The variable name was spelled `length` on line 1, but misspelled `lenght` on line 2",
          "You cannot pass a variable inside `t.forward()`",
          "80 is missing quotes",
        ],
        correctIndex: 0,
        explanation:
          "Variable names must match letter-for-letter (and uppercase/lowercase too) every time you use them!",
      },
    ],
  },
  {
    id: "u3-l4",
    unitId: "unit3",
    type: "code",
    icon: "🧭",
    title: "Four-Quadrant Star Map",
    subtitle: "Master negative & positive (x, y) coordinates",
    xp: 40,
    bonusXp: 20,
    story:
      "The coordinate grid is turned ON! Use `t.goto(x, y)` with positive and negative numbers to visit **all 4 quadrants** (top-right, top-left, bottom-left, bottom-right).",
    mathTip:
      "Quadrant I: `(+x, +y)` • Quadrant II: `(-x, +y)` • Quadrant III: `(-x, -y)` • Quadrant IV: `(+x, -y)`.",
    starterCode: `import turtle

t = turtle.Turtle()
t.pencolor("purple")
t.pensize(3)

# Jump cleanly to Quadrant I (+x, +y)
t.penup()
t.goto(100, 80)
t.pendown()
t.dot(14, "red")

# Now visit Quadrant II (-x, +y), III (-x, -y), and IV (+x, -y)!
`,
    blueprint: null,
    showGridDefault: true,
    goals: [
      "Use `t.goto(x, y)` coordinates",
      "Draw shapes or dots in all 4 quadrants",
    ],
    bonusGoal: "Bonus Star: Place 4+ colorful t.dot() stars OR connect all 4 quadrants into a giant closed diamond!",
    hints: [
      "Try adding:\n`t.goto(-100, 80)`\n`t.goto(-100, -80)`\n`t.goto(100, -80)`\n`t.goto(100, 80)`",
      "You can also drop bright star markers with `t.dot(14, \"gold\")` at each corner!",
      "Make sure your `(x, y)` points aren't right on `0` so they sit clearly inside all 4 quadrants.",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments, commands } = turtleData;
      const calls = astInfo?.callNames || [];
      const usedGoto =
        calls.includes("goto") || calls.includes("setpos") || calls.includes("setposition");
      const quads = h.visitedQuadrants(segments, commands);
      const allFour = quads.size === 4;

      const paths = h.getConnectedPaths(segments);
      const hasClosedSubLoopAllFour = paths.some((p) => {
        if (h.isClosedPath(p) && h.visitedQuadrants(p.edges).size === 4) return true;
        // Also match if a stem was drawn first and then a sub-loop closed across all 4 quadrants
        for (let startIdx = 0; startIdx < p.edges.length - 2; startIdx++) {
          const sub = p.edges.slice(startIdx);
          const subStart = { x: sub[0].x1, y: sub[0].y1 };
          const subEnd = { x: sub[sub.length - 1].x2, y: sub[sub.length - 1].y2 };
          if (h.pointsClose(subStart, subEnd, 4.5) && h.visitedQuadrants(sub).size === 4) {
            return true;
          }
        }
        return false;
      });
      const bonusOk = h.countDots(commands) >= 4 || hasClosedSubLoopAllFour;

      const goals = [
        { label: "Use t.goto(x, y)", passed: usedGoto },
        { label: `Visit all 4 quadrants (${quads.size}/4 visited)`, passed: allFour },
      ];
      const passed = usedGoto && allFour;
      let feedback = "Coordinate navigator! You charted all 4 quadrants of the grid.";
      if (!passed) {
        if (!usedGoto) feedback = "Use `t.goto(x, y)` to jump directly to `(x, y)` coordinates!";
        else {
          const missing = [1, 2, 3, 4].filter((q) => !quads.has(q)).join(", ");
          feedback = `You reached ${quads.size}/4 quadrants! Still missing Quadrant(s): ${missing}.`;
        }
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: "Star-map constellation complete!",
      };
    },
  },
];
