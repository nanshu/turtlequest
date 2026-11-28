export const UNIT_6 = {
  id: "unit6",
  number: 6,
  title: "Boss Missions & Creative Lab",
  description: "Combine everything you learned: analog clock geometry, recursive fractal trees, a playable Python game, and your own Crest!",
  theme: "coral",
};

export const UNIT_6_NODES = [
  {
    id: "u6-l1",
    unitId: "unit6",
    type: "code",
    icon: "🕰️",
    title: "Boss 1: Analog Clock Face",
    subtitle: "12 hours × 30° = 360° + hour & minute hands",
    xp: 50,
    bonusXp: 20,
    story:
      "Put your angle math to work! Build a real **Analog Clock Face**: use a `for` loop turning `30°` (`360 / 12`) to place all **12 hour marks** in a circle, then draw an **hour hand** and **minute hand** pointing from the center!",
    mathTip:
      "Every hour on a clock is `360° ÷ 12 = 30°`! On a turtle compass, 12 o'clock is `90°` (North), 3 o'clock is `0°` (East), and 9 o'clock is `180°` (West).",
    starterCode: `import turtle

t = turtle.Turtle()
t.pensize(3)

# 1. Draw the 12 hour marks around the clock (360 / 12 = 30 degrees each!)
for hour in range(12):
    t.penup()
    t.home()
    t.setheading(90 - hour * 30)
    t.forward(115)
    t.pendown()
    t.dot(10, "navy")

# 2. Draw the short hour hand (pointing to 3 o'clock = 0 degrees)
t.penup()
t.home()
t.pendown()
t.pencolor("coral")
t.pensize(6)
t.setheading(0)
t.forward(65)

# 3. Now draw the longer minute hand pointing to 12 o'clock (90 degrees)!
`,
    blueprint: null,
    showGridDefault: false,
    goals: [
      "Use a `for` loop",
      "Place 12+ hour marks around all 4 quadrants",
      "Draw 2+ distinct clock hands from the center `(0, 0)`",
    ],
    bonusGoal: "Bonus Star: Draw an outer clock ring AND use 2+ colors for your hands!",
    hints: [
      "For the minute hand, jump back to center (`t.penup()`, `t.home()`, `t.pendown()`), set a new color (`t.pencolor(\"blue\")`), `t.setheading(90)`, and `t.forward(95)`!",
      "Want an outer clock border for the Bonus Star? `t.penup()`, `t.goto(0, -135)`, `t.setheading(0)`, `t.pendown()`, `t.circle(135)`!",
      "Try setting ANY time you want: e.g., 10:10 is hour heading `90 - 10 * 30` and minute heading `90 - 2 * 30`!",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments, commands } = turtleData;
      const usedFor = Boolean(astInfo?.hasFor);

      // Count outer dial marks: dots at r >= 50 OR radial tick segments (aligned radially, NOT tangential circle chords!)
      const outerDots = commands.filter((c) => c.cmd === "dot" && Math.hypot(c.x, c.y) >= 50);
      const outerTicks = segments.filter((s) => {
        const len = h.segmentLength(s);
        if (len < 3 || len > 45) return false;
        const r1 = Math.hypot(s.x1, s.y1);
        const r2 = Math.hypot(s.x2, s.y2);
        if (Math.min(r1, r2) < 45 || Math.max(r1, r2) < 55) return false;
        const mx = (s.x1 + s.x2) / 2;
        const my = (s.y1 + s.y2) / 2;
        const mr = Math.hypot(mx, my) || 1;
        const dx = (s.x2 - s.x1) / len;
        const dy = (s.y2 - s.y1) / len;
        const radialAlignment = Math.abs((dx * mx + dy * my) / mr);
        return radialAlignment >= 0.72;
      });
      const dialMarks = outerDots.length + outerTicks.length;
      const quads = h.visitedQuadrants(segments, commands);

      // Hands: segments from center outward, deduplicated by direction so retracing `backward()` counts as 1 hand
      const handSegs = segments.filter(
        (s) =>
          (Math.hypot(s.x1, s.y1) <= 15 && Math.hypot(s.x2, s.y2) >= 30) ||
          (Math.hypot(s.x2, s.y2) <= 15 && Math.hypot(s.x1, s.y1) >= 30)
      );
      const distinctHandDirs = [];
      for (const s of handSegs) {
        const tipX = Math.hypot(s.x2, s.y2) >= Math.hypot(s.x1, s.y1) ? s.x2 : s.x1;
        const tipY = Math.hypot(s.x2, s.y2) >= Math.hypot(s.x1, s.y1) ? s.y2 : s.y1;
        const deg = ((Math.atan2(tipY, tipX) * 180) / Math.PI + 360) % 360;
        const duplicate = distinctHandDirs.some((d) => {
          const diff = Math.abs(((deg - d + 540) % 360) - 180);
          return diff <= 10;
        });
        if (!duplicate) distinctHandDirs.push(deg);
      }

      // Outer ring bonus check: tangential arc segments at radius >= 85
      const ringSegs = segments.filter(
        (s) => Math.hypot(s.x1, s.y1) >= 85 && Math.hypot(s.x2, s.y2) >= 85
      );
      const hasOuterRing = ringSegs.length >= 16;
      const handColors = new Set(handSegs.map((s) => String(s.color || "").toLowerCase()));
      const bonusOk = hasOuterRing && handColors.size >= 2;

      const goals = [
        { label: "Use a `for` loop", passed: usedFor },
        { label: `Place 12+ hour marks around all 4 quadrants (${dialMarks} marks)`, passed: dialMarks >= 12 && quads.size === 4 },
        { label: `Draw 2+ distinct clock hands from center (${distinctHandDirs.length} hands)`, passed: distinctHandDirs.length >= 2 },
      ];
      const passed = usedFor && dialMarks >= 12 && quads.size === 4 && distinctHandDirs.length >= 2;
      let feedback = "Right on time! 12 × 30° = 360° analog clock complete.";
      if (!passed) {
        if (!usedFor) feedback = "Use a `for` loop to stamp the 12 hour marks cleanly!";
        else if (dialMarks < 12 || quads.size < 4) feedback = "Make sure your loop places all 12 hour dots/ticks around the full circle!";
        else feedback = "Almost! Add a second clock hand starting from `t.home()` (the center) pointing to the minute!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: "Framed clock face with multi-color hands!",
      };
    },
  },
  {
    id: "u6-l2",
    unitId: "unit6",
    type: "code",
    icon: "🌳",
    title: "Boss 2: Recursive Fractal Tree",
    subtitle: "A function that calls ITSELF to grow branches!",
    xp: 55,
    bonusXp: 25,
    story:
      "Trees in nature repeat the same branching rule over and over at smaller scales! Write a **recursive** `def draw_branch(length):` function that splits into 2 smaller branches (`length * 0.7`) until `length < 15`.",
    mathTip:
      "Ratio shrink! Multiplying `length * 0.7` each level gives `80 → 56 → 39 → 27 → 19 → 13` (stop!). Just 10 lines of code grow over 30 branches!",
    starterCode: `import turtle

t = turtle.Turtle()
t.pensize(3)
t.pencolor("brown")

def draw_branch(length):
    # Base case: emergency brake so branches stop shrinking!
    if length < 15:
        return

    t.forward(length)
    t.left(28)
    draw_branch(length * 0.7)  # Step 1: Left sub-tree!

    t.right(56)
    # Step 2: Now call draw_branch(length * 0.7) for the RIGHT sub-tree!
    

    t.left(28)
    # Step 3: Lift pen when walking back to the fork so color tips won't paint over the trunk!
    t.penup()
    t.backward(length)
    t.pendown()

t.penup()
t.goto(0, -150)
t.setheading(90)
t.pendown()
draw_branch(80)
`,
    blueprint: null,
    showGridDefault: false,
    goals: [
      "Write a recursive function (a `def` that calls itself)",
      "Include an `if` base case so recursion stops cleanly",
      "Grow a branching tree with 15+ segments",
    ],
    bonusGoal: "Bonus Star: Paint green leaf tips on tiny branches (2+ colors on your tree)!",
    hints: [
      "Right under `t.right(56)`, add `draw_branch(length * 0.7)` (indented 4 spaces inside `draw_branch`)!",
      "Try switching speed to **Fast** or **Instant** to see the full fractal tree bloom (`80 → 56 → 39 → 27 → 19 → 13 stop!`).",
      "For leafy green tips, add right before `t.forward(length)`:\n`t.pencolor(\"green\" if length < 28 else \"brown\")`",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments } = turtleData;
      const recursive = Boolean(astInfo?.hasRecursiveDef);
      const hasBaseCase = Boolean(astInfo?.hasIf);
      const box = h.boundingBox(segments);

      const angleBuckets = new Set(
        segments
          .filter((s) => h.segmentLength(s) > 4)
          .map((s) => {
            const deg = ((Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180) / Math.PI + 360) % 360;
            return Math.floor(deg / 18);
          })
      );

      const treeGrown = segments.length >= 15 && box.height >= 60 && angleBuckets.size >= 4;
      const bonusOk = h.countDistinctColors(segments) >= 2;

      const goals = [
        { label: "Write a recursive function (`def` calling itself)", passed: recursive },
        { label: "Include an `if` base case", passed: hasBaseCase },
        { label: `Grow a branching tree (${segments.length} branches)`, passed: treeGrown },
      ];
      const passed = recursive && hasBaseCase && treeGrown;
      let feedback = `Fractal nature! Your recursive function grew ${segments.length} branches from one tiny rule.`;
      if (!passed) {
        if (!recursive) feedback = "Make `draw_branch` call itself (`draw_branch(length * 0.7)`) inside its own body!";
        else if (!hasBaseCase) feedback = "Always include an `if length < 15: return` base case so recursion stops!";
        else feedback = "Don't forget the second `draw_branch(length * 0.7)` call after `t.right(56)` so both left AND right branches grow!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: "Full leafy fractal tree unlocked!",
      };
    },
  },
  {
    id: "u6-l3",
    unitId: "unit6",
    type: "code",
    icon: "🎮",
    title: "Boss 3: Secret Number Game",
    subtitle: "Playable `while` game + Turtle Victory Celebration!",
    xp: 55,
    bonusXp: 25,
    story:
      "Build a real interactive Python game! Pick a `secret = random.randint(1, 10)`, keep asking with a `while` loop (`Too high!` / `Too low!`), and when the player wins, trigger a **Turtle Victory Celebration**!",
    mathTip:
      "Binary search pro tip: if you always guess the middle number (`5`, then `3` or `8`), you can crack ANY number from 1 to 10 in at most **4 guesses**!",
    starterCode: `import turtle
import random

secret = random.randint(1, 10)
guess = 0
tries = 0

while guess != secret:
    guess = int(input("Guess my secret number (1 to 10): "))
    tries = tries + 1
    if guess < secret:
        print("Too low! Try higher.")
    elif guess > secret:
        print("Too high! Try lower.")

print("YOU GOT IT in", tries, "tries!")

# Victory Turtle Celebration!
t = turtle.Turtle()
t.pencolor("gold")
t.fillcolor("gold")
t.pensize(4)
# Draw a victory star (5 sides, 144 deg) or celebration art, then write "YOU WIN!"!
`,
    blueprint: null,
    showGridDefault: false,
    goals: [
      "Use `random`, a `while` loop, `input()`, `if`, and `print()`",
      "Win your own game and draw a Victory Celebration on the canvas",
    ],
    bonusGoal: "Bonus Star: Draw a colorful celebration (2+ colors) AND write victory text with `t.write(...)`!",
    hints: [
      "After `t.pensize(4)`, add a golden 5-point star:\n`t.begin_fill()`\n`for i in range(5):`\n`    t.forward(120)`\n`    t.right(144)`\n`t.end_fill()`",
      "Add a victory banner for the Bonus Star:\n`t.penup(); t.goto(0, -100); t.pencolor(\"purple\")`\n`t.write(\"YOU WIN!\", align=\"center\", font=(\"Arial\", 22, \"bold\"))`",
      "Click **▶ Run Code** and play your own game—use binary search (start at `5`) to crack it fast!",
    ],
    check(runResult, h) {
      const { astInfo, stdout, turtleData } = runResult;
      const { segments, commands } = turtleData;
      const gameLogic =
        Boolean(astInfo?.hasImportRandom) &&
        Boolean(astInfo?.hasWhile) &&
        Boolean(astInfo?.hasInput) &&
        Boolean(astInfo?.hasIf) &&
        Boolean(astInfo?.hasPrint);

      const hasCelebration =
        segments.length >= 4 || h.countDots(commands) >= 3 || h.countWrites(commands) >= 1;
      const hasOutput = String(stdout || "").trim().length > 0;

      const allColors = new Set([
        ...segments.map((s) => String(s.color || "").toLowerCase()),
        ...commands
          .filter((c) => (c.cmd === "write" || c.cmd === "dot" || c.cmd === "end_fill") && c.color)
          .map((c) => String(c.color).toLowerCase()),
      ]);
      const bonusOk = h.countWrites(commands) >= 1 && allColors.size >= 2;

      const goals = [
        { label: "Build the game loop (`random`, `while`, `input`, `if`, `print`)", passed: gameLogic },
        { label: "Win the game and trigger Turtle Victory Art", passed: hasCelebration && hasOutput },
      ];
      const passed = gameLogic && hasCelebration && hasOutput;
      let feedback = "GG! You built and beat your very own Python mini-game!";
      if (!passed) {
        if (!gameLogic) feedback = "Make sure your game uses `random`, `while`, `input()`, `if`, and `print()`!";
        else feedback = "Finish guessing the secret number so your turtle runs the Victory Celebration!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: "Colorful Victory Banner & Celebration!",
      };
    },
  },
  {
    id: "u6-q1",
    unitId: "unit6",
    type: "quiz",
    icon: "⚡",
    title: "Final Boss Check: Python Master",
    subtitle: "Clock math, recursion, & `while` loops",
    xp: 25,
    questions: [
      {
        prompt: "On a 12-hour analog clock, what is the angle between **12 o'clock** and **4 o'clock**?",
        options: ["90°", "120°", "150°"],
        correctIndex: 1,
        explanation: "Each hour is `360° ÷ 12 = 30°`, so 4 hours is `4 × 30° = 120°`!",
      },
      {
        prompt: "Why does a recursive function like `draw_branch(length)` MUST have a **base case** (`if length < 15: return`)?",
        options: [
          "So it knows when to STOP calling itself instead of looping forever",
          "Because Python only allows `if` inside `def`",
          "To make lines thicker",
        ],
        correctIndex: 0,
        explanation: "Without a base case, recursion calls itself forever (until Python hits the safety limit)!",
      },
      {
        prompt: "In `while guess != secret:`, when does the `while` loop finally stop repeating?",
        options: [
          "After 10 tries automatically",
          "As soon as `guess` equals `secret` (`guess != secret` becomes `False`)",
          "Never—`while` loops always run forever",
        ],
        correctIndex: 1,
        explanation: "A `while` loop keeps running as long as its condition is `True`, and stops the moment it becomes `False`!",
      },
      {
        prompt: "Spot the bug! What happens if someone runs this recursive function?",
        code: `def draw_branch(length):
    t.forward(length)
    draw_branch(length * 0.7)`,
        options: [
          "It hits infinite recursion (`RecursionError`) because it has NO `if` base case to stop!",
          "It draws a hexagon automatically",
          "It skips calling `t.forward(length)`",
        ],
        correctIndex: 0,
        explanation:
          "Without a base case like `if length < 15: return`, the function keeps calling itself forever with tinier and tinier numbers!",
      },
    ],
  },
  {
    id: "u6-l4",
    unitId: "unit6",
    type: "code",
    icon: "🛡️",
    title: "Final Capstone: Design Your Crest",
    subtitle: "Open creative project combining all your skills!",
    xp: 75,
    bonusXp: 25,
    story:
      "You've reached the **Final Capstone**! Design your own custom Shield, Flag, or Geometric Crest using everything you've mastered: a custom `def` function, a `for` loop, 3+ colors, a filled shape, and your emblem's title with `t.write(...)`!",
    mathTip:
      "Pro design tip: combine symmetry across all 4 quadrants (`(±x, ±y)`) with a central polygon or 144° star and a bold banner title!",
    starterCode: `import turtle

turtle.bgcolor("#f8fafc")
t = turtle.Turtle()
t.pensize(3)

def draw_star(x, y, size, col):
    t.penup()
    t.goto(x, y)
    t.setheading(0)
    t.pendown()
    t.pencolor(col)
    t.fillcolor(col)
    t.begin_fill()
    for i in range(5):
        t.forward(size)
        t.right(144)
    t.end_fill()

# 1. Filled hexagon shield frame in the center
t.penup()
t.goto(-55, 95)
t.pendown()
t.pencolor("navy")
t.fillcolor("dodgerblue")
t.begin_fill()
for i in range(6):
    t.forward(110)
    t.right(60)
t.end_fill()

# 2. Call draw_star(...) to place your emblem(s), then sign your crest with t.write(...)!
# Example:
# draw_star(-42, 14, 84, "gold")
# t.penup(); t.goto(0, -145); t.pencolor("purple")
# t.write("TURTLE MASTER", align="center", font=("Arial", 20, "bold"))
`,
    blueprint: null,
    showGridDefault: false,
    goals: [
      "Define and call at least 1 custom `def` function",
      "Use a `for` loop and at least 1 filled shape (`begin_fill`/`end_fill`)",
      "Use 3+ colors and add a banner label with `t.write(...)`",
    ],
    bonusGoal: "Bonus Star: Add `t.dot()` or `t.stamp()` emblems AND span all 4 quadrants!",
    hints: [
      "Call `draw_star(-42, 14, 84, \"gold\")` to stamp a golden emblem right inside your shield!",
      "Sign your banner with:\n`t.penup(); t.goto(0, -145); t.pencolor(\"purple\")`\n`t.write(\"MY CREST\", align=\"center\", font=(\"Arial\", 20, \"bold\"))`",
      "Add 4 corner `t.dot(16, \"coral\")` gems (or `t.stamp()`) in all 4 quadrants to grab the Final Bonus Star!",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments, commands } = turtleData;
      const usedDef =
        Boolean(astInfo?.hasDef) && Object.values(astInfo?.defCallCounts || {}).some((c) => c >= 1);
      const usedLoop = Boolean(astInfo?.hasFor);
      const hasFill = h.countFills(commands) >= 1;
      const hasWrite = h.countWrites(commands) >= 1;

      const allColors = new Set([
        ...segments.map((s) => String(s.color || "").toLowerCase()),
        ...commands
          .filter((c) => (c.cmd === "end_fill" || c.cmd === "dot" || c.cmd === "write") && c.color)
          .map((c) => String(c.color).toLowerCase()),
      ]);
      const colorful = allColors.size >= 3;

      const quads = h.visitedQuadrants(segments, commands);
      const hasEmblems = h.countDots(commands) >= 2 || h.countStamps(commands) >= 1;
      const bonusOk = hasEmblems && quads.size === 4;

      const goals = [
        { label: "Define and call a custom `def` function", passed: usedDef },
        { label: "Use a `for` loop and a filled shape", passed: usedLoop && hasFill },
        { label: `Use 3+ colors (${allColors.size} used) + \`t.write(...)\``, passed: colorful && hasWrite },
      ];
      const passed = usedDef && usedLoop && hasFill && colorful && hasWrite;
      let feedback = "LEGENDARY CREST! You combined functions, loops, geometry, color, and typography like a real engineer!";
      if (!passed) {
        if (!usedDef) feedback = "Define and call at least 1 custom `def` function in your crest!";
        else if (!usedLoop || !hasFill) feedback = "Include both a `for` loop AND a filled shape (`t.begin_fill()` / `t.end_fill()`)!";
        else if (!colorful) feedback = "Splash in at least 3 different colors!";
        else feedback = "Sign your crest with a banner title using `t.write(\"YOUR TITLE\", align=\"center\")`!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: "Grandmaster 4-quadrant emblem crest!",
      };
    },
  },
];
