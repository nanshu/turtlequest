export const UNIT_5 = {
  id: "unit5",
  number: 5,
  title: "Decisions, Input & Chance",
  description: "Teach Python to choose with `if/else`, unlock remainder `%` patterns, ask questions with `input()`, and roll `random` art!",
  theme: "teal",
};

export const UNIT_5_NODES = [
  {
    id: "u5-l1",
    unitId: "unit5",
    type: "code",
    icon: "🦓",
    title: "Even & Odd Stripes",
    subtitle: "Use `if i % 2 == 0:` to alternate colors",
    xp: 35,
    bonusXp: 15,
    story:
      "The `%` (modulo) operator gives the **remainder** after division! Use `if i % 2 == 0:` and `else:` inside a `for` loop to alternate two colors across at least **8 lines** (stripes or a zebra polygon/spiral).",
    mathTip:
      "Even numbers (`0, 2, 4, 6`) have remainder `0` when divided by `2` (`i % 2 == 0`). Odd numbers (`1, 3, 5, 7`) have remainder `1`!",
    starterCode: `import turtle

t = turtle.Turtle()
t.pensize(8)

for i in range(8):
    t.penup()
    t.goto(-140 + i * 40, 100)
    t.pendown()
    t.setheading(270)
    # Replace this line with an if i % 2 == 0: / else: color switch!
    t.pencolor("teal")
    t.forward(200)
`,
    blueprint: null,
    showGridDefault: false,
    goals: [
      "Use a `for` loop with `if` and `%` (modulo)",
      "Alternate between 2+ colors across 6+ drawn lines",
    ],
    bonusGoal: "Bonus Star: Use `if / elif / else` with `i % 3` to cycle 3+ colors across 9+ lines!",
    hints: [
      "Replace `t.pencolor(\"teal\")` with:\n`if i % 2 == 0:`\n`    t.pencolor(\"teal\")`\n`else:`\n`    t.pencolor(\"gold\")`",
      "For 3 alternating colors, try `range(9)` with `if i % 3 == 0:`, `elif i % 3 == 1:`, and `else:`!",
      "Remember to indent 4 spaces inside `for`, and 8 spaces inside `if` / `elif` / `else`!",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments } = turtleData;
      const usedLogic =
        Boolean(astInfo?.hasFor) && Boolean(astInfo?.hasIf) && Boolean(astInfo?.hasModulo);
      const colors = h.countDistinctColors(segments);
      const transitions = h.countColorTransitions(segments);
      const alternating = segments.length >= 6 && colors >= 2 && transitions >= 4;
      const bonusOk = segments.length >= 9 && colors >= 3 && transitions >= 6;

      const goals = [
        { label: "Use `for`, `if`, and `%` (modulo)", passed: usedLogic },
        { label: "Alternate 2+ colors across 6+ drawn lines", passed: alternating },
      ];
      const passed = usedLogic && alternating;
      let feedback = "Crisp modulo pattern! Remainder math makes alternating patterns effortless.";
      if (!passed) {
        if (!usedLogic) feedback = "Make sure your code uses a `for` loop, an `if` check, and the `%` remainder operator!";
        else feedback = "Make sure you draw at least 6 lines that switch back and forth between 2 or more colors!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: "3-color `i % 3` modulo rainbow unlocked!",
      };
    },
  },
  {
    id: "u5-l2",
    unitId: "unit5",
    type: "code",
    icon: "🎛️",
    title: "Interactive Polygon Builder",
    subtitle: "Ask the player with `input()` and draw their shape!",
    xp: 40,
    bonusXp: 15,
    story:
      "Let the **user** pick the polygon! Use `input(\"How many sides? \")` + `int(...)` to ask for a number (like `5`, `6`, or `8`), calculate `360 / sides`, and draw their custom shape!",
    mathTip:
      "`input()` always hands back **text** like `\"6\"`. Wrapping it in `int(...)` turns `\"6\"` into the real number `6` so Python can divide `360 / 6`!",
    starterCode: `import turtle

t = turtle.Turtle()
t.pencolor("teal")
t.fillcolor("lightblue")
t.pensize(3)

answer = input("How many sides (3 to 12)? ")
sides = int(answer)

if sides < 3:
    print("Polygons need at least 3 sides! Using 3.")
    sides = 3

angle = 360 / sides
print("Turn angle:", angle)

# Draw the player's polygon with a for loop!
for i in range(sides):
    t.forward(70)
    
`,
    blueprint: null,
    showGridDefault: false,
    goals: [
      "Use `input()` and `int()`",
      "Use a `for` loop",
      "Draw a closed regular polygon from user input (3+ sides)",
    ],
    bonusGoal: "Bonus Star: Include an `if` safety check AND fill the shape with `begin_fill()`/`end_fill()`!",
    hints: [
      "Add `t.right(angle)` inside the `for i in range(sides):` loop, click Run, and type a number like `6` in the popup box!",
      "If you type a big number like `10`, try a smaller step like `t.forward(50)` so it fits cleanly on screen.",
      "Wrap the `for` loop with `t.begin_fill()` before and `t.end_fill()` after to grab the Bonus Star!",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments, commands } = turtleData;
      const calls = astInfo?.callNames || [];
      const usedInputInt = Boolean(astInfo?.hasInput) && calls.includes("int");
      const usedFor = Boolean(astInfo?.hasFor);

      const paths = h.getConnectedPaths(segments, { tol: 3.0, mergeAngleDeg: 1.0 });
      let foundSides = 0;
      for (const p of paths) {
        for (let n = 3; n <= 36; n++) {
          if (h.isRegularPolygon(p, n, { minSide: 10 })) {
            foundSides = n;
            break;
          }
        }
        if (foundSides) break;
      }

      const bonusOk = Boolean(astInfo?.hasIf) && h.countFills(commands) >= 1;

      const goals = [
        { label: "Use `input()` and `int()`", passed: usedInputInt },
        { label: "Use a `for` loop", passed: usedFor },
        { label: "Draw a closed regular polygon from user input", passed: foundSides >= 3 },
      ];
      const passed = usedInputInt && usedFor && foundSides >= 3;
      let feedback = `Interactive builder works! You drew a ${foundSides}-sided polygon on demand.`;
      if (!passed) {
        if (!usedInputInt) feedback = "Use `input(...)` and convert the answer with `int(...)`!";
        else if (!usedFor) feedback = "Use a `for i in range(sides):` loop to draw the polygon!";
        else feedback = "Finish the loop with `t.right(angle)` and enter a number like `5`, `6`, or `8` when prompted!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: "Safe input check + filled custom polygon!",
      };
    },
  },
  {
    id: "u5-l3",
    unitId: "unit5",
    type: "code",
    icon: "🌌",
    title: "Random Starry Night",
    subtitle: "Scatter stars with `random.randint()`",
    xp: 40,
    bonusXp: 15,
    story:
      "Every time you click Run, `random` paints a brand-new galaxy! Set a dark night-sky background with `turtle.bgcolor(\"navy\")`, then use `random.randint(...)` inside a loop to scatter **12+ stars** across the sky.",
    mathTip:
      "`random.randint(-220, 220)` picks any whole number from `-220` to `220` (both ends included!)—covering all 4 quadrants evenly.",
    starterCode: `import turtle
import random

turtle.bgcolor("navy")
t = turtle.Turtle()
t.hideturtle()
t.penup()

colors = ["gold", "yellow", "white", "skyblue"]

for i in range(18):
    x = random.randint(-220, 220)
    y = random.randint(-170, 170)
    t.goto(x, y)
    # Pick a random size or color and stamp a dot!
    
`,
    blueprint: null,
    showGridDefault: false,
    goals: [
      "Import `random` and use `random.randint()` in a loop",
      "Scatter 12+ stars or dots across at least 3 quadrants",
    ],
    bonusGoal: "Bonus Star: Use `random.choice(...)` for 3+ star colors on a dark night-sky background!",
    hints: [
      "Inside the loop, add `t.dot(random.randint(6, 16), random.choice(colors))`!",
      "Click **▶ Run Code** twice—watch how every single night sky is completely unique!",
      "Keep `turtle.bgcolor(\"navy\")` (or `\"black\"`) and `random.choice(colors)` to earn the Bonus Star!",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments, commands, bgcolor } = turtleData;
      const calls = astInfo?.callNames || [];
      const usedRandom =
        Boolean(astInfo?.hasImportRandom) &&
        Boolean(astInfo?.hasFor) &&
        (calls.includes("randint") || calls.includes("randrange") || calls.includes("uniform"));

      const dots = h.countDots(commands);
      const closedShapes = h.getConnectedPaths(segments).filter((p) => h.isClosedPath(p)).length;
      const starCount = dots + closedShapes;
      const quads = h.visitedQuadrants(segments, commands);
      const scattered = starCount >= 12 && quads.size >= 3;

      const dotColors = new Set(
        commands.filter((c) => c.cmd === "dot" && c.color).map((c) => String(c.color).toLowerCase())
      );
      const segColors = new Set(segments.map((s) => String(s.color || "").toLowerCase()));
      const allColors = new Set([...dotColors, ...segColors]);
      const darkBg = String(bgcolor || "#ffffff").toLowerCase() !== "#ffffff";
      const bonusOk = calls.includes("choice") && allColors.size >= 3 && darkBg;

      const goals = [
        { label: "Use `import random` + `randint()` inside a `for` loop", passed: usedRandom },
        { label: `Scatter 12+ stars across 3+ quadrants (${starCount} stars, ${quads.size}/4 quadrants)`, passed: scattered },
      ];
      const passed = usedRandom && scattered;
      let feedback = `Instant cosmos! ${starCount} randomly placed stars across ${quads.size} quadrants.`;
      if (!passed) {
        if (!usedRandom) feedback = "Use `import random` and `random.randint(...)` inside a `for` loop!";
        else feedback = `Found ${starCount} star(s) in ${quads.size} quadrant(s)—add \`t.dot(10, "gold")\` (or draw mini stars) inside the loop!`;
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: "Multicolor random night sky complete!",
      };
    },
  },
  {
    id: "u5-q1",
    unitId: "unit5",
    type: "quiz",
    icon: "⚡",
    title: "Quick Check: Logic & Chance",
    subtitle: "Modulo remainders, `int()`, & `random`",
    xp: 20,
    questions: [
      {
        prompt: "What does `7 % 2` equal in Python?",
        options: ["3", "1 (the remainder when 7 is divided by 2)", "0"],
        correctIndex: 1,
        explanation: "7 ÷ 2 = 3 with remainder **1**, so `7 % 2 == 1` (which tells Python that 7 is odd!).",
      },
      {
        prompt: "Why do we write `sides = int(input(\"How many sides? \"))` instead of just `sides = input(...)`?",
        options: [
          "Because `input()` always returns text (a string like `\"6\"`), and `int()` converts it into a number (`6`) for math",
          "Because `input()` only accepts words, not digits",
          "Because `int()` makes the turtle faster",
        ],
        correctIndex: 0,
        explanation: "You can't divide `360 / \"6\"` on text—converting with `int()` makes `360 / 6` work cleanly!",
      },
      {
        prompt: "Which numbers can `random.randint(1, 6)` pick (just like rolling a die)?",
        options: [
          "Only 1 through 5",
          "Any whole number 1, 2, 3, 4, 5, or 6",
          "Only 1 or 6",
        ],
        correctIndex: 1,
        explanation: "Unlike `range(1, 6)`, `random.randint(1, 6)` includes BOTH endpoints (`1` and `6`)!",
      },
    ],
  },
  {
    id: "u5-l4",
    unitId: "unit5",
    type: "code",
    icon: "🎲",
    title: "Random Walk Explorer",
    subtitle: "Chance, `if` fences, & `t.distance(0, 0)`",
    xp: 45,
    bonusXp: 20,
    story:
      "In math, a **Random Walk** picks a random direction at every step! Walk at least **20 random steps**, add an `if` fence so your turtle bounces back if it strays too far (`t.distance(0, 0) > 150`), and `print()` how far from home it ended!",
    mathTip:
      "Even after 40 steps of length `25` (`1000` total pixels walked!), random paths often end surprisingly close to `(0, 0)`—check `t.distance(0, 0)` in the console!",
    starterCode: `import turtle
import random

t = turtle.Turtle()
t.pensize(3)
colors = ["teal", "dodgerblue", "purple", "orange"]

for i in range(30):
    t.pencolor(random.choice(colors))
    turn = random.choice([0, 90, 180, 270])
    t.setheading(turn)
    t.forward(25)

    # Add an if fence here: if t.distance(0, 0) > 150: turn toward (0, 0) and step back!
    

print("Final distance from home:", round(t.distance(0, 0), 1))
`,
    blueprint: null,
    showGridDefault: true,
    goals: [
      "Use `import random` + `for` loop + `if` fence check",
      "Walk at least 20 steps",
      "Use `print()` to report the final distance from `(0, 0)`",
    ],
    bonusGoal: "Bonus Star: Walk 40+ steps using 3+ different colors!",
    hints: [
      "Inside the loop, add:\n`if t.distance(0, 0) > 150:`\n`    t.setheading(t.towards(0, 0))`\n`    t.forward(40)`",
      "Boost `range(30)` to `range(45)` to earn the Bonus Star!",
      "Try switching `random.choice([0, 90, 180, 270])` to `random.randint(0, 359)` for a wild compass walk!",
    ],
    check(runResult, h) {
      const { astInfo, stdout, turtleData } = runResult;
      const { segments } = turtleData;
      const usedConstructs =
        Boolean(astInfo?.hasImportRandom) && Boolean(astInfo?.hasFor) && Boolean(astInfo?.hasIf);
      const longWalk = segments.length >= 20;
      const printedNum = Boolean(astInfo?.hasPrint) && h.extractPrintedNumbers(stdout).length >= 1;
      const bonusOk = segments.length >= 40 && h.countDistinctColors(segments) >= 3;

      const goals = [
        { label: "Use `random`, a `for` loop, and an `if` fence", passed: usedConstructs },
        { label: `Walk 20+ steps (${segments.length} walked)`, passed: longWalk },
        { label: "Print a numeric distance with `print()`", passed: printedNum },
      ];
      const passed = usedConstructs && longWalk && printedNum;
      let feedback = "Random walk complete! Run it again to see probability create a totally new path.";
      if (!passed) {
        if (!usedConstructs) feedback = "Combine `import random`, a `for` loop, and an `if` boundary check!";
        else if (!longWalk) feedback = "Increase your loop count so your turtle walks at least 20 steps!";
        else feedback = "Use `print(...)` to print the turtle's final distance from `(0, 0)`!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: `${segments.length}-step technicolor random walk!`,
      };
    },
  },
];
