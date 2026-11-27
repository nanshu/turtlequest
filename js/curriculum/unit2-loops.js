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

export const UNIT_2 = {
  id: "unit2",
  number: 2,
  title: "Loops & Polygon Power",
  description: "Replace repetitive typing with `for` loops and unlock the 360° polygon formula.",
  theme: "blue",
};

export const UNIT_2_NODES = [
  {
    id: "u2-l1",
    unitId: "unit2",
    type: "code",
    icon: "🔁",
    title: "Loop Shortcut",
    subtitle: "Draw a square in just 3 lines!",
    xp: 25,
    bonusXp: 10,
    story:
      "Programmers hate repeating the same lines over and over. A Python `for` loop repeats indented lines automatically!",
    mathTip:
      "`for i in range(4):` runs the indented block 4 times (`i = 0, 1, 2, 3`). Indenting by 4 spaces tells Python what lives inside the loop.",
    starterCode: `import turtle

t = turtle.Turtle()
t.pencolor("dodgerblue")
t.pensize(4)

for i in range(4):
    t.forward(100)
    # Turn 90 degrees inside the loop!
`,
    blueprint: makePolygonBlueprint(4, 100, 0, 0),
    showGridDefault: false,
    goals: [
      "Use a `for` loop",
      "Draw a closed square (sides 60+ steps)",
    ],
    bonusGoal: "Bonus Star: Make a mega square with sides at least 130 steps long!",
    hints: [
      "Add `t.right(90)` (indented with 4 spaces!) right under `t.forward(100)`.",
      "Check your colon `:` at the end of `for i in range(4):` and make sure both lines inside use 4 spaces.",
      "Change `100` to `140` to grab the Bonus Star too!",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments } = turtleData;
      const paths = h.getConnectedPaths(segments);
      const square = paths.find((p) => h.isRegularPolygon(p, 4, { minSide: 60 }));
      const megaSquare = paths.find((p) => h.isRegularPolygon(p, 4, { minSide: 130 }));
      const usedFor = Boolean(astInfo?.hasFor);

      const goals = [
        { label: "Use a `for` loop", passed: usedFor },
        { label: "Draw a closed square", passed: Boolean(square) },
      ];
      const passed = usedFor && Boolean(square);
      let feedback = "So much cleaner! 4 sides in 3 lines of loop code.";
      if (!passed) {
        if (!usedFor) feedback = "Use a `for i in range(4):` loop instead of writing 4 separate copies!";
        else feedback = "Your loop ran, but it didn't draw a closed square yet—check that `t.right(90)` is indented inside the loop!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && Boolean(megaSquare),
        bonusFeedback: "Mega square drawn with a loop!",
      };
    },
  },
  {
    id: "u2-l2",
    unitId: "unit2",
    type: "code",
    icon: "⬡",
    title: "The 360° Secret: Hexagon",
    subtitle: "Any regular polygon = 360 / sides",
    xp: 30,
    bonusXp: 15,
    story:
      "Ready for the superpower of Turtle geometry? To draw ANY regular polygon, repeat `sides` times and turn `360 / sides` degrees! Let's build a 6-sided **hexagon**.",
    mathTip:
      "`360 ÷ 6 = 60°` per exterior turn! (Inside each corner of a hexagon is `120°`, and `180° - 120° = 60°`.)",
    starterCode: `import turtle

t = turtle.Turtle()
t.pencolor("teal")
t.fillcolor("lightblue")
t.pensize(3)

# Repeat 6 times and turn 360 / 6 degrees!
for i in range(6):
    t.forward(75)
    
`,
    blueprint: makePolygonBlueprint(6, 75, 0, 0),
    showGridDefault: false,
    goals: [
      "Use a `for` loop",
      "Draw a closed regular hexagon (6 equal sides)",
    ],
    bonusGoal: "Bonus Star: Fill your hexagon with t.begin_fill() and t.end_fill()!",
    hints: [
      "In Python, you can even write `t.right(360 / 6)` right inside the loop—let Python do the division!",
      "Make sure `t.begin_fill()` goes BEFORE the `for` loop and `t.end_fill()` goes AFTER (unindented!).",
      "Inside the loop:\n`    t.forward(75)`\n`    t.right(360 / 6)`",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments, commands } = turtleData;
      const paths = h.getConnectedPaths(segments);
      const hex = paths.find((p) => h.isRegularPolygon(p, 6, { minSide: 35 }));
      const usedFor = Boolean(astInfo?.hasFor);
      const filled = h.countFills(commands) >= 1;

      const goals = [
        { label: "Use a `for` loop", passed: usedFor },
        { label: "Draw a regular 6-sided hexagon", passed: Boolean(hex) },
      ];
      const passed = usedFor && Boolean(hex);
      let feedback = "360 / 6 = 60°—hexagon nailed!";
      if (!passed) {
        if (!usedFor) feedback = "Use a `for` loop to repeat the 6 sides!";
        else feedback = "Check your loop count (`6`) and turn angle (`360 / 6` = `60` degrees).";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && filled,
        bonusFeedback: "Honeycomb fill complete!",
      };
    },
  },
  {
    id: "u2-l3",
    unitId: "unit2",
    type: "code",
    icon: "⭕",
    title: "Almost a Circle",
    subtitle: "36-sided polygon illusion",
    xp: 30,
    bonusXp: 15,
    story:
      "What happens if you draw a polygon with **36** tiny sides (`360 / 36 = 10°` each)? From a distance, a 36-gon looks like a smooth circle!",
    mathTip:
      "Perimeter check: `36` steps × `12` pixels = `432` circumference (`r ≈ 69` px). Or try `72` steps × `5°`!",
    starterCode: `import turtle

t = turtle.Turtle()
t.pencolor("magenta")
t.pensize(4)

# Try 36 steps, turning 360 / 36 (10 degrees) each time!
for i in range(36):
    t.forward(12)
    
`,
    blueprint: makePolygonBlueprint(36, 12, 0, 0),
    showGridDefault: false,
    goals: [
      "Use a `for` loop with 24+ steps",
      "Turn 360 / steps to close into a smooth circle-like loop",
    ],
    bonusGoal: "Bonus Star: Fill your circle or use a thick pen (`pensize >= 4`)",
    hints: [
      "Inside `for i in range(36):`, turn `t.right(360 / 36)` (which is `10` degrees).",
      "Keep `t.forward(...)` around `8` to `15` so the circle fits nicely on screen!",
      "Try `t.forward(12)` and `t.right(10)` inside `for i in range(36):`!",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments, commands } = turtleData;
      const paths = h.getConnectedPaths(segments, { tol: 2.5, mergeAngleDeg: 0.5, minSegLen: 0.2 });
      const circleLike = paths.find((p) => {
        if (!h.isClosedPath(p, 8)) return false;
        if (p.edges.length < 24) return false;
        const turns = h.pathExteriorAngles(p);
        const totalTurn = Math.abs(turns.reduce((a, b) => a + b, 0));
        return Math.abs(totalTurn - 360) <= 15;
      });
      const usedFor = Boolean(astInfo?.hasFor);
      const styled = h.countFills(commands) >= 1 || segments.some((s) => (s.width || 3) >= 4);

      const goals = [
        { label: "Use a `for` loop", passed: usedFor },
        { label: "Draw a closed 24+ sided smooth circle", passed: Boolean(circleLike) },
      ];
      const passed = usedFor && Boolean(circleLike);
      let feedback = "Smooth geometry! Computers draw circles using tiny polygon steps just like that.";
      if (!passed) {
        if (!usedFor) feedback = "Use a `for` loop so you don't have to type 36 lines!";
        else feedback = "Make sure your total turn adds up to 360° (e.g. `range(36)` with `t.right(10)`).";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && styled,
        bonusFeedback: "Polished circle style!",
      };
    },
  },
  {
    id: "u2-q1",
    unitId: "unit2",
    type: "quiz",
    icon: "⚡",
    title: "Quick Check: Loop Detective",
    subtitle: "Predict angles & spot indentation bugs",
    xp: 20,
    questions: [
      {
        prompt: "Using the 360° Turn Rule, what angle should a turtle turn at each corner of a **regular pentagon** (5 sides)?",
        options: ["60°", "72°", "108°"],
        correctIndex: 1,
        explanation: "360 ÷ 5 = 72°! Five exterior turns of 72° add up to 360°.",
      },
      {
        prompt: "What happens when you run this code?",
        code: `for i in range(4):
    t.forward(100)
t.right(90)`,
        options: [
          "It draws a square",
          "It moves forward 400 in one straight line, then turns 90° once at the end",
          "It turns 90° four times without moving",
        ],
        correctIndex: 1,
        explanation:
          "Because `t.right(90)` is NOT indented, it sits outside the loop and only runs once after all 4 forwards finish!",
      },
      {
        prompt: "How many total degrees has the turtle spun after running `for i in range(8): t.right(45)`?",
        options: ["180° (half turn)", "360° (one full octagon loop)", "720° (two full spins)"],
        correctIndex: 1,
        explanation: "8 × 45° = 360°—a regular octagon!",
      },
    ],
  },
  {
    id: "u2-l4",
    unitId: "unit2",
    type: "code",
    icon: "🌀",
    title: "Spirograph Burst",
    subtitle: "Nested loops = instant geometric art!",
    xp: 40,
    bonusXp: 20,
    story:
      "What happens if you put a **loop inside another loop**? Draw a shape, rotate a little bit (`360 / 12 = 30°`), and repeat 12 times to create a Spirograph!",
    mathTip:
      "A loop inside a loop is called a **nested loop**. `12` outer repeats × `4` inner sides = `48` total lines drawn from just 6 lines of code!",
    starterCode: `import turtle

t = turtle.Turtle()
t.pencolor("deepskyblue")
t.pensize(2)

# Outer loop: repeat 12 times around the circle
for j in range(12):
    # Inner loop: draw 1 square (4 spaces indent -> 8 spaces inside!)
    for i in range(4):
        t.forward(85)
        t.right(90)
    # Now rotate 360 / 12 = 30 degrees before the next square!
    
`,
    blueprint: null,
    showGridDefault: false,
    goals: [
      "Use a nested `for` loop (a loop inside a loop)",
      "Rotate and draw at least 6 shapes around the center",
    ],
    bonusGoal: "Bonus Star: Draw 12+ rotated shapes (36+ lines) or use 2+ colors!",
    hints: [
      "Add `t.right(30)` (indented 4 spaces so it belongs to the `j` loop, NOT the `i` loop!).",
      "Check indentation: `for i in range(4):` has 4 spaces, lines inside it have 8 spaces, and `t.right(30)` has 4 spaces.",
      "With `range(12)` and `t.right(30)` after the inner loop, `12 × 30° = 360°` makes a full radial burst!",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments } = turtleData;
      const nested = (astInfo?.maxLoopNesting || 0) >= 2;
      const box = h.boundingBox(segments);

      // Measure angular diversity of segments to confirm true rotation around a hub
      const angleBuckets = new Set(
        segments
          .filter((s) => h.segmentLength(s) > 2)
          .map((s) => {
            const deg = ((Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180) / Math.PI + 360) % 360;
            return Math.floor(deg / 20);
          })
      );

      const rotatedBurst =
        segments.length >= 18 &&
        box.width >= 60 &&
        box.height >= 60 &&
        angleBuckets.size >= 6;

      const bonusReady = segments.length >= 36 || h.countDistinctColors(segments) >= 2;

      const goals = [
        { label: "Use nested loops (loop inside a loop)", passed: nested },
        { label: "Draw a rotated radial burst (18+ lines)", passed: rotatedBurst },
      ];
      const passed = nested && rotatedBurst;
      let feedback = "Whoa—instant Spirograph art powered by nested loops!";
      if (!passed) {
        if (!nested) feedback = "Put one `for` loop inside another `for` loop!";
        else feedback = "Don't forget to rotate (like `t.right(30)`) after each inner shape so they fan out in a circle!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusReady,
        bonusFeedback: "Master Spirograph artist!",
      };
    },
  },
];
