function makeRegularPolygonBlueprint(sides, sideLen, startX = -sideLen / 2, startY = sideLen / 2, clockwise = true) {
  const segs = [];
  let x = startX;
  let y = startY;
  let heading = 0;
  const stepAngle = (360 / sides) * (clockwise ? -1 : 1);
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

export const UNIT_1 = {
  id: "unit1",
  number: 1,
  title: "First Moves & Angle Secrets",
  description: "Command your turtle, crack the exterior-angle trick, and lift your pen!",
  theme: "green",
};

export const UNIT_1_NODES = [
  {
    id: "u1-l1",
    unitId: "unit1",
    type: "code",
    icon: "🐢",
    title: "Meet Your Turtle",
    subtitle: "Move, turn 90°, and pick a color",
    xp: 20,
    bonusXp: 10,
    story:
      "Every Python turtle starts at (0, 0) facing East (right). Give your turtle `t` orders to draw a giant glowing L-corner!",
    mathTip:
      "Turning `90` degrees makes a crisp right angle—one quarter of a full `360°` spin!",
    starterCode: `import turtle

t = turtle.Turtle()
t.pencolor("blue")
t.forward(100)
# Turn 90 degrees and move forward 100 more!
`,
    blueprint: [
      { x1: 0, y1: 0, x2: 100, y2: 0 },
      { x1: 100, y1: 0, x2: 100, y2: -100 },
    ],
    showGridDefault: false,
    goals: [
      "Draw 2 connected lines at least 60 steps long",
      "Make a 90° corner turn between them",
      "Use a color other than default black",
    ],
    bonusGoal: "Bonus Star: Make your line chunky with `t.pensize(5)` (4 or thicker)",
    hints: [
      "After `t.forward(100)`, try `t.right(90)` or `t.left(90)` and then another `t.forward(100)`.",
      "Don't forget parentheses around the number, like `t.right(90)`!",
      "Try adding:\n`t.pensize(5)`\n`t.right(90)`\n`t.forward(100)`",
    ],
    check(runResult, h) {
      const { segments } = runResult.turtleData;
      const paths = h.getConnectedPaths(segments);
      const longest = paths.reduce(
        (best, p) => (p.edges.length > (best?.edges.length || 0) ? p : best),
        null
      );

      let hasLongCorner = false;
      let hasRightAngle = false;
      if (longest && longest.edges.length >= 2) {
        const lens = h.pathEdgeLengths(longest);
        const angles = h.pathExteriorAngles(longest);
        for (let i = 0; i < longest.edges.length - 1; i++) {
          const isRight = Math.abs(Math.abs(angles[i]) - 90) <= 5;
          if (isRight) hasRightAngle = true;
          if (isRight && lens[i] >= 60 && lens[i + 1] >= 60) {
            hasLongCorner = true;
            break;
          }
        }
      }
      const hasTwoLines = Boolean(
        hasLongCorner ||
          (longest && longest.edges.length >= 2 && h.pathEdgeLengths(longest).filter((l) => l >= 60).length >= 2)
      );
      const usedColor = h.hasCustomColor(segments);
      const thickPen = segments.some((s) => (s.width || 3) >= 4);

      const goals = [
        { label: "Draw 2 connected lines (60+ steps each)", passed: hasTwoLines },
        { label: "Make a 90° corner between those 2 lines", passed: hasLongCorner },
        { label: "Use a custom pen color", passed: usedColor },
      ];
      const passed = hasTwoLines && hasLongCorner && usedColor;
      let feedback = "Awesome first corner! Your turtle obeyed every line.";
      if (!passed) {
        if (!hasTwoLines) feedback = "Draw 2 connected lines at least 60 steps long!";
        else if (!hasLongCorner) {
          feedback = hasRightAngle
            ? "Almost! Make sure BOTH lines meeting at your 90° corner are at least 60 steps long."
            : "Almost! Check your turn angle—a crisp corner is 90°.";
        } else if (!usedColor) feedback = "Great corner! Now give it style with `t.pencolor(\"blue\")` or another color.";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && thickPen,
        bonusFeedback: "Chunky bold line unlocked!",
      };
    },
  },
  {
    id: "u1-l2",
    unitId: "unit1",
    type: "code",
    icon: "🟦",
    title: "The Perfect Square",
    subtitle: "4 equal sides + 4 right angles",
    xp: 25,
    bonusXp: 10,
    story:
      "A square has 4 equal sides and four 90° corners. Guide `t` all the way around and back to where it started!",
    mathTip:
      "Notice the perimeter: 4 sides of length `100` equals `400` total steps, and 4 turns of `90°` equals `360°`!",
    starterCode: `import turtle

t = turtle.Turtle()
t.pencolor("green")
t.pensize(4)

t.forward(100)
t.right(90)
# Finish the other 3 sides!
`,
    blueprint: makeRegularPolygonBlueprint(4, 100, 0, 0, true),
    showGridDefault: false,
    goals: [
      "Draw a closed 4-sided square (sides 60+ steps)",
      "Return cleanly back to your starting point",
    ],
    bonusGoal: "Bonus Star: Use at least 2 different colors on your square!",
    hints: [
      "You need 4 `t.forward(100)` commands and 4 `t.right(90)` (or `t.left(90)`) turns.",
      "Count your sides carefully—if you only have 3 sides, the shape stays open!",
      "To earn the bonus star, call `t.pencolor(\"orange\")` (or another color) halfway through!",
    ],
    check(runResult, h) {
      const { segments } = runResult.turtleData;
      const paths = h.getConnectedPaths(segments);
      const square = paths.find((p) => h.isRegularPolygon(p, 4, { minSide: 60 }));
      const anyClosed = paths.some((p) => h.isClosedPath(p));
      const multiColor = h.countDistinctColors(segments) >= 2;

      const goals = [
        { label: "Draw 4 equal sides with 90° turns", passed: Boolean(square) },
        { label: "Close the square back at the start", passed: Boolean(square || anyClosed) },
      ];
      const passed = Boolean(square);
      let feedback = "Clean 4×90° = 360° square!";
      if (!passed) {
        const biggest = paths.reduce(
          (best, p) => (p.edges.length > (best?.edges.length || 0) ? p : best),
          null
        );
        if (!biggest) feedback = "Your turtle hasn't drawn anything yet!";
        else if (biggest.edges.length < 4) feedback = `You drew ${biggest.edges.length} side(s) so far—a square needs 4!`;
        else if (!h.isClosedPath(biggest)) feedback = "Your 4 sides didn't meet back at the start—make sure all 4 sides are the same length and every turn is 90°.";
        else feedback = "Close! Double-check that all 4 sides are equal and every turn is 90°.";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && multiColor,
        bonusFeedback: "Multi-color square mastery!",
      };
    },
  },
  {
    id: "u1-l3",
    unitId: "unit1",
    type: "code",
    icon: "🔺",
    title: "The Triangle Trap!",
    subtitle: "Interior vs. exterior angles",
    xp: 30,
    bonusXp: 15,
    story:
      "Every corner inside an equilateral triangle is 60°. So if you want to draw one, should the turtle turn `60`... or something else? Test your brain!",
    mathTip:
      "Think like the turtle walking forward: to bend into a 60° inside corner, it must turn the **exterior angle** `180° - 60° = 120°` (and `3 × 120° = 360°`!).",
    starterCode: `import turtle

t = turtle.Turtle()
t.pencolor("coral")
t.pensize(4)

# Hint: Think about how much the turtle turns OUTSIDE the corner!
t.forward(120)
t.right(120)
`,
    blueprint: makeRegularPolygonBlueprint(3, 120, 0, 0, true),
    showGridDefault: false,
    goals: [
      "Draw 3 equal sides (60+ steps each)",
      "Close into an equilateral triangle using 120° turns",
    ],
    bonusGoal: "Bonus Star: Fill your triangle with color using `t.begin_fill()` and `t.end_fill()`",
    hints: [
      "Inside angles are 60°, so the turtle's outside turn is `180 - 60 = 120` degrees.",
      "Do `t.forward(120)` and `t.right(120)` (or `t.left(120)`) 3 times!",
      "For the bonus, put `t.fillcolor(\"gold\")` and `t.begin_fill()` before drawing, and `t.end_fill()` after!",
    ],
    check(runResult, h) {
      const { segments, commands } = runResult.turtleData;
      const paths = h.getConnectedPaths(segments);
      const tri = paths.find((p) => h.isRegularPolygon(p, 3, { minSide: 60 }));
      const filled = h.countFills(commands) >= 1;

      const biggest = paths.reduce(
        (best, p) => (p.edges.length > (best?.edges.length || 0) ? p : best),
        null
      );
      const angles = biggest ? h.pathExteriorAngles(biggest) : [];
      const fellIn60Trap = angles.some((a) => Math.abs(Math.abs(a) - 60) <= 4);

      const goals = [
        { label: "Draw 3 equal sides (60+ steps)", passed: Boolean(tri) },
        { label: "Turn 120° exterior angles to close the triangle", passed: Boolean(tri) },
      ];
      const passed = Boolean(tri);
      let feedback = "Boom! You beat the 60° Triangle Trap (3 × 120° = 360°)!";
      if (!passed) {
        if (fellIn60Trap) {
          feedback =
            "Aha! You fell into the 60° Triangle Trap! Turning 60° starts a hexagon. Try `180 - 60 = 120` degrees instead!";
        } else if (biggest && biggest.edges.length < 3) {
          feedback = "Keep going—you need 3 equal sides to close the triangle!";
        } else {
          feedback = "Almost there! Make all 3 sides equal and each turn `120` degrees.";
        }
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && filled,
        bonusFeedback: "Filled triangle with `begin_fill()` + `end_fill()`!",
      };
    },
  },
  {
    id: "u1-q1",
    unitId: "unit1",
    type: "quiz",
    icon: "⚡",
    title: "Quick Check: Angle Ninja",
    subtitle: "4 fast brain puzzles (no typing!)",
    xp: 20,
    questions: [
      {
        prompt:
          "Why does an equilateral triangle use `t.right(120)` instead of `t.right(60)`?",
        options: [
          "Because the turtle turns the exterior angle (180° - 60° = 120°), and 3 × 120° = 360°",
          "Because Python doubles every angle automatically",
          "Because triangles only have 2 corners",
        ],
        correctIndex: 0,
        explanation:
          "Spot on! Any closed polygon needs the turtle's turns to add up to a full 360° spin: 3 × 120° = 360°.",
      },
      {
        prompt: "Your turtle starts facing East (0°), then runs `t.left(90)`. Which way is it pointing now?",
        options: ["South (down)", "North (up)", "West (left)"],
        correctIndex: 1,
        explanation:
          "Starting at East (right) and turning 90° left aims straight North (up, 90°)!",
      },
      {
        prompt: "Spot the bug! Why will this Python code crash?",
        code: `import turtle
t = turtle.Turtle()
t.forward 100`,
        options: [
          "100 is too big for the canvas",
          "It is missing parentheses: it must be t.forward(100)",
          "Turtle must be lowercase turtle()",
        ],
        correctIndex: 1,
        explanation:
          "Every turtle action needs parentheses `(...)` around its input, like `t.forward(100)`!",
      },
      {
        prompt: "Spot the bug! Why does Python say `NameError: name 'blue' is not defined` here?",
        code: `import turtle
t = turtle.Turtle()
t.pencolor(blue)`,
        options: [
          "Color names are text and MUST wear quotes: `t.pencolor(\"blue\")`",
          "Python only knows the color red",
          "You have to write `t.color = blue` instead",
        ],
        correctIndex: 0,
        explanation:
          "Numbers stand alone (`100`), but words and color names ALWAYS need quotes (`\"blue\"`) so Python knows they are text!",
      },
    ],
  },
  {
    id: "u1-l4",
    unitId: "unit1",
    type: "code",
    icon: "✏️",
    title: "Pen Up! Two Shapes",
    subtitle: "Jump cleanly without leaving trails",
    xp: 30,
    bonusXp: 15,
    story:
      "Right now your turtle drags its pen everywhere. Use `t.penup()` to lift the pen, hop across the canvas, put it back with `t.pendown()`, and draw **two separate closed shapes**!",
    mathTip:
      "Think of `penup()` like lifting your pencil to move to a new spot on graph paper.",
    starterCode: `import turtle

t = turtle.Turtle()
t.pencolor("purple")
t.pensize(3)

# Shape 1 (for example, a square)
t.forward(70)
t.right(90)
t.forward(70)
t.right(90)
t.forward(70)
t.right(90)
t.forward(70)
t.right(90)

# Now lift your pen, move somewhere else, and draw Shape 2!
t.penup()
t.forward(120)
t.pendown()
`,
    blueprint: null,
    showGridDefault: false,
    goals: [
      "Use `t.penup()` and `t.pendown()` to jump cleanly",
      "Draw at least 2 separate closed shapes",
    ],
    bonusGoal: "Bonus Star: Give your two shapes 2 different colors!",
    hints: [
      "After `t.pendown()`, draw another square or triangle!",
      "Make sure you call `t.pendown()` BEFORE drawing the second shape, otherwise it will be invisible.",
      "Try adding a triangle after `t.pendown()`: 3 repeats of `t.forward(70)` and `t.left(120)`!",
    ],
    check(runResult, h) {
      const { segments, commands } = runResult.turtleData;
      const paths = h.getConnectedPaths(segments);
      const closedShapes = paths.filter((p) => h.isClosedPath(p));
      const jumped = h.hasPenUpJump(commands);
      const multiColor = h.countDistinctColors(segments) >= 2;

      const goals = [
        { label: "Jump with penup() and pendown()", passed: jumped },
        { label: "Draw 2+ separate closed shapes", passed: closedShapes.length >= 2 },
      ];
      const passed = jumped && closedShapes.length >= 2;
      let feedback = "Clean jump! Two separate shapes with zero messy connecting lines.";
      if (!passed) {
        if (!jumped) feedback = "Don't forget to move while `t.penup()` is active, then call `t.pendown()`!";
        else if (closedShapes.length === 1) feedback = "Nice first shape! Now finish closing your second shape after `t.pendown()`.";
        else feedback = "Make sure both shapes close back on themselves!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && multiColor,
        bonusFeedback: "Double-color island explorer!",
      };
    },
  },
];
