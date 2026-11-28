export const UNIT_9 = {
  id: "unit9",
  number: 9,
  title: "Blueprints & Objects (OOP)",
  description: "Command twin turtles side-by-side, build your first custom `class`, and bring a whole squad of objects to life!",
  theme: "rose",
};

export const UNIT_9_NODES = [
  {
    id: "u9-l1",
    unitId: "unit9",
    type: "code",
    icon: "👯",
    title: "Twin Turtles Mirror Dance",
    subtitle: "Two independent objects from one `Turtle` blueprint!",
    xp: 50,
    bonusXp: 15,
    story:
      "Every time you call `turtle.Turtle()`, Python stamps out a brand-new **object** from the `Turtle` blueprint—each remembering its own position, angle, and pen color! Hatch **`leo`** AND **`maya`**, send them to opposite sides, and have **both** draw closed shapes!",
    mathTip:
      "Mirror symmetry across the y-axis: if `leo` starts at `(-140, 40)` facing East (`0°`) turning `right(90)`, his mirror twin `maya` can start at `(140, 40)` facing West (`maya.setheading(180)`) turning `left(90)`!",
    starterCode: `import turtle

# Turtle Object #1: leo
leo = turtle.Turtle()
leo.pencolor("dodgerblue")
leo.pensize(3)
leo.penup()
leo.goto(-140, 40)
leo.pendown()

for i in range(4):
    leo.forward(80)
    leo.right(90)

# Turtle Object #2: Now hatch maya = turtle.Turtle(), pick a color, jump right, and draw a shape!
`,
    blueprint: null,
    showGridDefault: true,
    goals: [
      "Hatch 2 separate `turtle.Turtle()` objects (`leo` & `maya`)",
      "Give them 2 different pen colors",
      "Have BOTH turtles draw closed shapes on canvas",
    ],
    bonusGoal: "Bonus Star: Draw true mirror symmetry on BOTH sides of the y-axis (`x < -10` and `x > 10`)!",
    hints: [
      "Create `maya = turtle.Turtle()`, set `maya.pencolor(\"coral\")` and `maya.pensize(3)`!",
      "Jump `maya` to `(60, 40)` (or `(140, 40)` facing West `maya.setheading(180)`) and loop 4 times to draw her square!",
      "Watch both turtles get colored rings on the canvas so you can tell which object is which!",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments, commands, turtleCount } = turtleData;
      const distinctTurtles = Math.max(
        turtleCount || 0,
        astInfo?.turtleCtorCalls || 0,
        h.countDistinctTurtles(segments, commands)
      );

      const byTurtle = h.segmentsByTurtle(segments);
      let turtlesWithClosedShape = 0;
      for (const segs of byTurtle.values()) {
        const paths = h.splitClosedShapes(segs);
        if (paths.some((p) => h.isClosedPath(p))) {
          turtlesWithClosedShape += 1;
        }
      }

      const distinctColors = h.countDistinctColors(segments);
      const hasLeft = segments.some((s) => s.x1 < -15 || s.x2 < -15);
      const hasRight = segments.some((s) => s.x1 > 15 || s.x2 > 15);
      const bonusOk = turtlesWithClosedShape >= 2 && hasLeft && hasRight;

      const goals = [
        { label: `Create 2+ \`turtle.Turtle()\` objects (${distinctTurtles} created)`, passed: distinctTurtles >= 2 },
        { label: `Use 2+ distinct colors (${distinctColors} used)`, passed: distinctColors >= 2 },
        { label: `Have 2 turtles each draw a closed shape (${turtlesWithClosedShape}/2)`, passed: turtlesWithClosedShape >= 2 },
      ];
      const passed = distinctTurtles >= 2 && distinctColors >= 2 && turtlesWithClosedShape >= 2;
      let feedback = "Two objects, one blueprint! Notice how `leo` and `maya` keep track of totally separate positions and colors.";
      if (!passed) {
        if (distinctTurtles < 2) feedback = "Hatch a second turtle with `maya = turtle.Turtle()`!";
        else if (distinctColors < 2) feedback = "Give `leo` and `maya` different colors using `.pencolor(...)`!";
        else feedback = "Make sure BOTH `leo` and `maya` draw a closed shape (square, triangle, or polygon)!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: "Symmetrical twin-turtle dance complete!",
      };
    },
  },
  {
    id: "u9-l2",
    unitId: "unit9",
    type: "code",
    icon: "🤖",
    title: "Build Your First `StampBot`",
    subtitle: "Define `class`, `__init__`, `self`, & methods",
    xp: 55,
    bonusXp: 20,
    story:
      "Now design your **own blueprint** with `class StampBot:`! Save `self.pen`, `self.color`, and `self.size` inside **`__init__`**, add a **`draw_square(self, x, y)`** method, and build **2+ different `StampBot` objects** to stamp squares of different sizes and colors!",
    mathTip:
      "`__init__` stands for **initialize**—it runs automatically every time you stamp out a new object like `bot1 = StampBot(t, \"rose\", 80)`, and **`self`** means *\"this specific bot right here!\"*",
    starterCode: `import turtle

t = turtle.Turtle()
t.pensize(3)

class StampBot:
    def __init__(self, pen, color, size):
        # 1. Delete pass (temporary placeholder) and save self.pen, self.color, self.size!
        pass

    def draw_square(self, x, y):
        # 2. Delete pass, move self.pen to (x, y), set pencolor(self.color), and draw a square of self.size!
        pass

# 3. Build 2+ StampBot objects with DIFFERENT colors & sizes and call .draw_square(...)!
bot1 = StampBot(t, "crimson", 70)
`,
    blueprint: null,
    showGridDefault: false,
    goals: [
      "Define a `class` with `__init__` and `self` attributes",
      "Write a drawing method (`def draw_square(self, x, y):`) and call it",
      "Create 2+ objects drawing 2+ colored closed shapes",
    ],
    bonusGoal: "Bonus Star: Add a second method (like `.draw_triangle(...)` or `.grow(...)`) and draw 3+ shapes!",
    hints: [
      "Inside `__init__` (indented 8 spaces):\n`self.pen = pen`\n`self.color = color`\n`self.size = size`",
      "Inside `draw_square(self, x, y)`:\n`self.pen.penup()`\n`self.pen.goto(x, y)`\n`self.pen.pendown()`\n`self.pen.pencolor(self.color)`\n`for i in range(4):`\n`    self.pen.forward(self.size)`\n`    self.pen.right(90)`",
      "At the bottom, add `bot2 = StampBot(t, \"dodgerblue\", 110)` then call `bot1.draw_square(-140, 40)` and `bot2.draw_square(20, 60)`!",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments } = turtleData;
      const classNames = astInfo?.classNames || [];
      const validClasses = classNames.filter((cls) => {
        const ms = astInfo?.classMethodNames?.[cls] || [];
        return ms.includes("__init__") && ms.some((m) => m !== "__init__");
      });
      const matchingClass =
        validClasses.find(
          (cls) =>
            (astInfo?.classCallCounts?.[cls] || 0) >= 2 ||
            Boolean(astInfo?.hasClassCalledInLoop?.[cls])
        ) ||
        validClasses[0] ||
        classNames[0];
      const methods = matchingClass ? astInfo?.classMethodNames?.[matchingClass] || [] : [];
      const hasInit = validClasses.length >= 1 && Boolean(astInfo?.hasSelfAttr);
      const hasDrawMethod = validClasses.length >= 1;
      const totalValidInstances = validClasses.reduce(
        (sum, cls) => sum + (astInfo?.classCallCounts?.[cls] || 0),
        0
      );
      const loopedValid = validClasses.some((cls) =>
        Boolean(astInfo?.hasClassCalledInLoop?.[cls])
      );

      const paths = h.splitClosedShapes(segments);
      const closedShapes = paths.filter((p) => h.isClosedPath(p));
      const distinctColors = h.countDistinctColors(segments);

      const maxMethodsOnClass = validClasses.reduce(
        (best, cls) => Math.max(best, (astInfo?.classMethodNames?.[cls] || []).length),
        methods.length
      );
      const bonusOk = maxMethodsOnClass >= 3 && closedShapes.length >= 3;
      const builtEnoughInstances =
        totalValidInstances >= 2 || (loopedValid && closedShapes.length >= 2);

      const goals = [
        { label: "Define a `class` with `__init__` and `self` attributes", passed: Boolean(astInfo?.hasClassDef) && hasInit },
        { label: "Add a custom method (`def draw_square(self, x, y):`)", passed: hasDrawMethod },
        { label: `Create 2+ objects drawing 2+ colored shapes (${closedShapes.length} drawn)`, passed: builtEnoughInstances && closedShapes.length >= 2 && distinctColors >= 2 },
      ];
      const passed =
        Boolean(astInfo?.hasClassDef) &&
        hasInit &&
        hasDrawMethod &&
        builtEnoughInstances &&
        closedShapes.length >= 2 &&
        distinctColors >= 2;
      let feedback = `Blueprint engineer! Your \`${matchingClass || "StampBot"}\` class built ${loopedValid ? "multiple" : totalValidInstances} independent objects.`;
      if (!passed) {
        if (!astInfo?.hasClassDef || !hasInit) feedback = "Inside `__init__`, save your object's data on `self` (`self.pen = pen`, `self.color = color`, `self.size = size`)!";
        else if (!hasDrawMethod) feedback = "Add a method like `def draw_square(self, x, y):` inside your class!";
        else if (!builtEnoughInstances) feedback = `Build at least 2 \`${matchingClass}\` objects with different colors and sizes!`;
        else feedback = "Call `.draw_square(...)` on BOTH objects so 2+ differently colored shapes appear on canvas!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: "Multi-method StampBot factory unlocked!",
      };
    },
  },
  {
    id: "u9-l3",
    unitId: "unit9",
    type: "code",
    icon: "🪐",
    title: "Solar System Squad",
    subtitle: "Put custom objects inside a `list` + `for` loop!",
    xp: 60,
    bonusXp: 20,
    story:
      "Now combine **Classes + Lists** like a real game programmer! Create a `Planet` class with `name`, `x`, `y`, `radius`, `color`, and a `.draw(self, pen)` method, put **4+ `Planet` objects in a `planets` list**, and draw the whole galaxy with **`for planet in planets:`**!",
    mathTip:
      "Instead of managing 4 separate variables (`p1_x, p1_y, p1_r, p1_col...`), each `Planet` object bundles all its own numbers together cleanly!",
    starterCode: `import turtle

turtle.bgcolor("navy")
t = turtle.Turtle()
t.hideturtle()

class Planet:
    def __init__(self, name, x, y, radius, color):
        self.name = name
        self.x = x
        self.y = y
        self.radius = radius
        self.color = color

    def draw(self, pen):
        # Delete pass (temporary placeholder), move pen to (self.x, self.y) with penup(), and draw pen.dot(self.radius * 2, self.color)!
        pass

# Add 2+ more Planet objects so your galaxy list has 4+ planets!
planets = [
    Planet("Sun", -150, 0, 26, "gold"),
    Planet("Earth", -30, 35, 14, "dodgerblue"),
]

# Loop over planets: for p in planets: p.draw(t)
`,
    blueprint: null,
    showGridDefault: true,
    goals: [
      "Define `class Planet` with `self` attributes + `.draw(...)`",
      "Put 4+ objects in a `list` and render with a `for` loop",
      "Draw 4+ planets using 3+ distinct colors",
    ],
    bonusGoal: "Bonus Star: Write each planet's name (`pen.write(self.name, ...)`) on a dark space sky!",
    hints: [
      "Inside `def draw(self, pen):`:\n`pen.penup()`\n`pen.goto(self.x, self.y)`\n`pen.dot(self.radius * 2, self.color)`",
      "Add Mars (`\"coral\"`) and Saturn (`\"orange\"` / `\"violet\"`) inside `planets = [...]` so there are 4+ planets!",
      "At the bottom, loop:\n`for p in planets:`\n`    p.draw(t)`\nAnd inside `draw`, add:\n`pen.pencolor(\"white\")`\n`pen.goto(self.x, self.y - self.radius - 18)`\n`pen.write(self.name, align=\"center\")` for the Bonus Star!",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments, commands, bgcolor } = turtleData;
      const totalCalls = Object.values(astInfo?.classCallCounts || {}).reduce((a, b) => a + b, 0);
      const anyLooped = Object.values(astInfo?.hasClassCalledInLoop || {}).some(Boolean);
      const hasSquadStructure =
        Boolean(astInfo?.hasClassDef) &&
        Boolean(astInfo?.hasSelfAttr) &&
        Boolean(astInfo?.hasList) &&
        Boolean(astInfo?.hasFor) &&
        (totalCalls >= 4 || (anyLooped && totalCalls >= 1));

      const dots = h.countDots(commands);
      const closedShapes = h.splitClosedShapes(segments).filter((p) => h.isClosedPath(p)).length;
      const celestialCount = Math.max(dots, closedShapes, dots + closedShapes);

      const dotColors = new Set(
        commands.filter((c) => c.cmd === "dot" && c.color).map((c) => String(c.color).toLowerCase())
      );
      const segColors = new Set(segments.map((s) => String(s.color || "").toLowerCase()));
      const fillColors = new Set(
        commands.filter((c) => c.cmd === "end_fill" && c.color).map((c) => String(c.color).toLowerCase())
      );
      const allColors = new Set([...dotColors, ...segColors, ...fillColors]);
      const galaxyRendered = celestialCount >= 4 && allColors.size >= 3;

      const darkBg = String(bgcolor || "#ffffff").toLowerCase() !== "#ffffff";
      const bonusOk = darkBg && h.countWrites(commands) >= 4;

      const goals = [
        { label: "Keep `Planet` class + `list` of 4+ objects + `for` loop", passed: hasSquadStructure },
        { label: `Render 4+ planets on canvas (${celestialCount} drawn)`, passed: celestialCount >= 4 },
        { label: `Use 3+ distinct colors (${allColors.size} used)`, passed: allColors.size >= 3 },
      ];
      const passed = hasSquadStructure && galaxyRendered;
      let feedback = "Solar System launched! One list loop rendered an entire fleet of `Planet` objects.";
      if (!passed) {
        if (!hasSquadStructure) feedback = "Make sure your `planets` list holds at least 4 `Planet(...)` objects and gets drawn inside a `for p in planets:` loop!";
        else if (celestialCount < 4) feedback = "Finish `def draw(self, pen):` with `pen.dot(...)` (or a circle) and call `p.draw(t)` in your loop!";
        else feedback = "Give your planets at least 3 different colors!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: "Labeled deep-space planetary chart complete!",
      };
    },
  },
  {
    id: "u9-q1",
    unitId: "unit9",
    type: "quiz",
    icon: "⚡",
    title: "Quick Check: Blueprints & Objects",
    subtitle: "`class`, `self`, & object independence",
    xp: 25,
    questions: [
      {
        prompt: "If `class StampBot:` is a cookie cutter, what are `bot1 = StampBot(...)` and `bot2 = StampBot(...)`?",
        options: [
          "Two copies of the cookie cutter",
          "Two separate objects (instances) made from the same blueprint, each with its own color & size!",
          "Two syntax errors because you can only have one bot",
        ],
        correctIndex: 1,
        explanation: "A `class` is the blueprint; each `bot1`, `bot2` object built from it is an independent instance!",
      },
      {
        prompt: "Inside `def draw(self, x, y):`, what does **`self`** refer to?",
        options: [
          "The specific object calling the method right now (e.g., `bot1` or `bot2`)",
          "Always the first turtle in the program",
          "The filename of your script",
        ],
        correctIndex: 0,
        explanation: "When you call `bot2.draw(0, 0)`, Python automatically passes `bot2` as `self` so `self.color` reads `bot2`'s color!",
      },
      {
        prompt: "Suppose `bot1 = StampBot(t, \"red\", 60)` and `bot2 = StampBot(t, \"blue\", 90)`. If you run `bot1.size = 120`, what is `bot2.size`?",
        options: ["`120`", "`90` (unchanged—each object owns its own attributes!)", "`0`"],
        correctIndex: 1,
        explanation: "Each object stores its own `self.size` separately, so changing `bot1` leaves `bot2` untouched!",
      },
      {
        prompt: "Spot the bug! Why does calling `bot1.draw()` crash with `TypeError: takes 0 positional arguments but 1 was given`?",
        code: `class StampBot:
    def draw():
        print("Drawing!")`,
        options: [
          "Every method inside a `class` needs `self` as its first parameter: `def draw(self):`",
          "You cannot put `print()` inside a `class`",
          "`class StampBot:` must be lowercase",
        ],
        correctIndex: 0,
        explanation: "Python automatically passes the object as the first argument (`self`), so class methods must start with `def draw(self):`!",
      },
    ],
  },
  {
    id: "u9-l4",
    unitId: "unit9",
    type: "code",
    icon: "🎆",
    title: "Grand Capstone: Python Architect",
    subtitle: "Build a multi-object Fireworks / Garden / Galaxy scene!",
    xp: 80,
    bonusXp: 30,
    story:
      "You've reached the **Python Architect Capstone**! Combine your **class**, a **collection (`list` or `dict`)**, **`for` loops**, **`if` logic**, and **3+ colors** to create your own interactive **Fireworks Show** (or customize it into a Flower Garden or Robot City!).",
    mathTip:
      "Big fireworks use `12` spokes (`360° ÷ 12 = 30°`) while small sparkles use `8` spokes (`360° ÷ 8 = 45°`)—store each firework's `(x, y, size, spokes, color)` cleanly on a `Firework` object!",
    starterCode: `import turtle

turtle.bgcolor("#0f172a")
t = turtle.Turtle()
t.pensize(2)
t.hideturtle()

class Firework:
    def __init__(self, x, y, size, spokes, color):
        self.x = x
        self.y = y
        self.size = size
        self.spokes = spokes
        self.color = color

    def launch(self, pen):
        pen.pencolor(self.color)
        angle = 360 / self.spokes
        for i in range(self.spokes):
            pen.penup()
            pen.goto(self.x, self.y)
            pen.setheading(i * angle)
            pen.pendown()
            pen.forward(self.size)
            # Optional: if self.size >= 55: pen.dot(7, "white")!

# 1. Add 3+ Firework objects into the show list spanning 3+ quadrants!
show = [
    Firework(-130, 80, 65, 12, "gold"),
]

# 2. Loop over show with an if check (e.g. if fw.size >= 55: print(...)!) and call fw.launch(t)!
# 3. For the Bonus Star: sign your show with t.write("MY SHOW", align="center", ...) or hatch a 2nd turtle!
`,
    blueprint: null,
    showGridDefault: false,
    goals: [
      "Define a custom `class` (`__init__` + `self`) and build 3+ objects",
      "Combine a `list` or `dict`, a `for` loop, and an `if` decision",
      "Paint 3+ colors spanning 3+ quadrants on canvas",
    ],
    bonusGoal: "Bonus Star: Sign your scene with `t.write(...)` OR animate with 2+ `turtle.Turtle()` builders!",
    hints: [
      "Add 2+ more bursts inside `show = [...]` across other quadrants:\n`Firework(120, 75, 55, 10, \"coral\"),`\n`Firework(-60, -70, 48, 8, \"cyan\"),`\n`Firework(95, -80, 70, 12, \"violet\"),`",
      "Add an `if` check inside `launch` (`if self.size >= 55: pen.dot(8, \"white\")`) AND loop `for fw in show: fw.launch(t)`!",
      "Sign the bottom sky for the Bonus Star:\n`t.penup()`\n`t.goto(0, -165)`\n`t.pencolor(\"white\")`\n`t.write(\"TURTLE ARCHITECT\", align=\"center\", font=(\"Arial\", 18, \"bold\"))`",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments, commands } = turtleData;
      const totalInstances = Object.values(astInfo?.classCallCounts || {}).reduce((a, b) => a + b, 0);
      const anyLoopedClass = Object.values(astInfo?.hasClassCalledInLoop || {}).some(Boolean);
      const instanceCountLabel = anyLoopedClass ? "looped" : totalInstances;
      const usedOopObjects =
        Boolean(astInfo?.hasClassDef) &&
        Boolean(astInfo?.hasSelfAttr) &&
        (totalInstances >= 3 || (anyLoopedClass && totalInstances >= 1 && (segments.length >= 12 || h.countDots(commands) >= 3 || h.countStamps(commands) >= 3)));

      const usedCoreTools =
        (Boolean(astInfo?.hasList) || Boolean(astInfo?.hasDict)) &&
        Boolean(astInfo?.hasFor) &&
        Boolean(astInfo?.hasIf);

      const allColors = new Set([
        ...segments.map((s) => String(s.color || "").toLowerCase()),
        ...commands
          .filter((c) => (c.cmd === "dot" || c.cmd === "end_fill" || c.cmd === "write" || c.cmd === "stamp") && c.color)
          .map((c) => String(c.color).toLowerCase()),
      ]);
      const quads = h.visitedQuadrants(segments, commands);
      const hasEnoughArt =
        segments.length >= 12 || h.countDots(commands) >= 4 || h.countStamps(commands) >= 4;
      const richScene = allColors.size >= 3 && quads.size >= 3 && hasEnoughArt;

      const activeTurtles = h.countActiveTurtles(segments, commands);
      const bonusOk = h.countWrites(commands) >= 1 || activeTurtles >= 2;

      const goals = [
        { label: `Define a \`class\` and create 3+ objects (${instanceCountLabel} created)`, passed: usedOopObjects },
        { label: "Use a `list` or `dict`, a `for` loop, and an `if` decision", passed: usedCoreTools },
        { label: `Paint 3+ colors (${allColors.size}) across 3+ quadrants (${quads.size}/4)`, passed: richScene },
      ];
      const passed = usedOopObjects && usedCoreTools && richScene;
      let feedback = "PYTHON ARCHITECT COMPLETE! You just combined classes, collections, loops, logic, and turtle graphics into your own creation!";
      if (!passed) {
        if (!usedOopObjects) feedback = "Keep your custom `class` with `self` attributes and create at least 3 objects from it!";
        else if (!usedCoreTools) feedback = "Include a `list` (or `dict`), a `for` loop, AND an `if` statement in your scene!";
        else feedback = "Launch your objects across at least 3 quadrants using 3+ bright colors!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: activeTurtles >= 2 ? "Multi-turtle Architect Finale!" : "Signed Architect Finale!",
      };
    },
  },
];
