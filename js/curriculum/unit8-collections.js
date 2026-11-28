export const UNIT_8 = {
  id: "unit8",
  number: 8,
  title: "Data Containers",
  description: "Organize palettes in `list`s, lock `(x, y)` stars in `tuple`s, build a `dict` spellbook, and track discoveries in a `set`!",
  theme: "amber",
};

export const UNIT_8_NODES = [
  {
    id: "u8-l1",
    unitId: "unit8",
    type: "code",
    icon: "🚂",
    title: "Rainbow Pinwheel Playlist (`list`)",
    subtitle: "`[0]`, `[-1]`, `.append()`, & `len()`",
    xp: 45,
    bonusXp: 15,
    story:
      "A Python **`list`** is like a rainbow train `[...]` holding items in order! Create `colors = [...]`, add one more color at the end with **`.append()`**, `print()` how many colors you have (**`len(colors)`**) plus the first (`colors[0]`) and last (`colors[-1]`), and loop over your playlist to paint a pinwheel!",
    mathTip:
      "Python starts counting at **`0`**, so the first item is `colors[0]` and the shortcut **`colors[-1]`** grabs the very last item! Wrap around safely with `colors[i % len(colors)]`.",
    starterCode: `import turtle

t = turtle.Turtle()
t.pensize(3)

colors = ["red", "orange", "gold", "green"]
# 1. Add a 5th color with colors.append("blue") (or any color!)


# 2. print() len(colors), colors[0], and colors[-1]!


# 3. Loop 10+ times, rotating & changing color with colors[i % len(colors)]!
`,
    blueprint: null,
    showGridDefault: false,
    goals: [
      "Create a `list` and add a color with `.append()`",
      "Print list info using `len()` and `print()`",
      "Draw 12+ lines spanning 4+ colors from your list",
    ],
    bonusGoal: "Bonus Star: Draw a pinwheel of 6+ closed shapes using 5+ colors!",
    hints: [
      "Add:\n`colors.append(\"dodgerblue\")`\n`print(\"Total:\", len(colors), \"First:\", colors[0], \"Last:\", colors[-1])`",
      "Draw a colorful pinwheel loop:\n`for i in range(8):`\n`    t.pencolor(colors[i % len(colors)])`\n`    for side in range(4):`\n`        t.forward(75)`\n`        t.right(90)`\n`    t.right(360 / 8)`",
      "Make sure you don't accidentally drop any color quotes inside `colors = [...]`!",
    ],
    check(runResult, h) {
      const { astInfo, stdout, turtleData } = runResult;
      const { segments } = turtleData;
      const calls = astInfo?.callNames || [];
      const usedAppend = Boolean(astInfo?.hasList) && calls.includes("append");
      const usedLenPrint =
        calls.includes("len") &&
        Boolean(astInfo?.hasPrint) &&
        String(stdout || "").trim().length > 0;

      const distinctColors = h.countDistinctColors(segments);
      const drewColorful =
        (Boolean(astInfo?.hasFor) || Boolean(astInfo?.hasWhile)) &&
        segments.length >= 12 &&
        distinctColors >= 4;

      const closedShapes = h.splitClosedShapes(segments).filter((p) => h.isClosedPath(p));
      const bonusOk = closedShapes.length >= 6 && distinctColors >= 5;

      const goals = [
        { label: "Create a `list` and add an item with `.append()`", passed: usedAppend },
        { label: "Use `len()` and `print()`", passed: usedLenPrint },
        { label: `Loop with 4+ colors (${distinctColors} used)`, passed: drewColorful },
      ];
      const passed = usedAppend && usedLenPrint && drewColorful;
      let feedback = `All aboard the Color Train! ${distinctColors} colors cycled smoothly from your list.`;
      if (!passed) {
        if (!usedAppend) feedback = "Create a `list` like `colors = [...]` and add another color using `.append(...)`!";
        else if (!usedLenPrint) feedback = "Use `len(colors)` inside `print(...)` to check your list size!";
        else feedback = "Loop through your colors list (`colors[i % len(colors)]`) to draw at least 12 colorful lines!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: `Technicolor ${closedShapes.length}-shape pinwheel complete!`,
      };
    },
  },
  {
    id: "u8-l2",
    unitId: "unit8",
    type: "code",
    icon: "✨",
    title: "Star Map Constellation (`tuple`)",
    subtitle: "Locked `(x, y)` coordinate pins",
    xp: 45,
    bonusXp: 15,
    story:
      "A **`tuple`** uses parentheses `(x, y)` to lock a coordinate pair together so `x` and `y` never get split up! Put **5+ `(x, y)` tuples** inside `stars = [...]` spanning at least 3 quadrants, then unpack them cleanly with **`for x, y in stars:`** to connect a glowing night-sky constellation!",
    mathTip:
      "Tuple unpacking shortcut: if `stars = [(-150, 70), (-60, 110), ...]`, then **`for x, y in stars:`** automatically puts the 1st number into `x` and the 2nd into `y`!",
    starterCode: `import turtle

turtle.bgcolor("navy")
t = turtle.Turtle()
t.pencolor("skyblue")
t.pensize(3)

# Add at least 2 more (x, y) tuples so your constellation visits 3+ quadrants!
stars = [
    (-150, 70),
    (-60, 110),
    (30, 50),
]

# Jump to the first star WITHOUT drawing a line from (0, 0):
t.penup()
t.goto(stars[0])
t.pendown()

# Loop with: for x, y in stars: to connect each star and drop t.dot(14, "gold")!
`,
    blueprint: null,
    showGridDefault: true,
    goals: [
      "Store 5+ `(x, y)` tuples inside your `stars` list",
      "Use `for x, y in stars:` to connect and dot each star",
      "Span at least 3 quadrants of the night sky",
    ],
    bonusGoal: "Bonus Star: Close the loop back to `stars[0]` OR fill a shape inside your sky!",
    hints: [
      "Add two negative-y stars like `(120, -40)` and `(-40, -90)` inside `stars = [...]`!",
      "Notice `t.goto(stars[0])` works right out of the box because `t.goto()` accepts an `(x, y)` tuple!",
      "Loop with:\n`for x, y in stars:`\n`    t.goto(x, y)`\n`    t.dot(14, \"gold\")`",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments, commands } = turtleData;
      const usedTupleList = Boolean(astInfo?.hasTuple) && Boolean(astInfo?.hasList);
      const dots = h.countDots(commands);
      const quads = h.visitedQuadrants(segments, commands);
      const unpackedLoop = Boolean(astInfo?.hasFor) && dots >= 5 && segments.length >= 4;
      const skySpan = quads.size >= 3;

      const paths = h.getConnectedPaths(segments);
      const bonusOk =
        paths.some((p) => h.isClosedPath(p, 8)) || h.countFills(commands) >= 1 || dots >= 7;

      const goals = [
        { label: "Use `(x, y)` tuples inside a list (`5+` stars)", passed: usedTupleList && dots >= 5 },
        { label: "Loop `for x, y in stars:` to connect & mark stars", passed: unpackedLoop },
        { label: `Chart across 3+ quadrants (${quads.size}/4 visited)`, passed: skySpan },
      ];
      const passed = usedTupleList && unpackedLoop && skySpan;
      let feedback = `Constellation mapped! Tuple coordinates unpacked cleanly across ${quads.size} quadrants.`;
      if (!passed) {
        if (!usedTupleList) feedback = "Store `(x, y)` coordinates as tuples inside your `stars` list!";
        else if (dots < 5 || segments.length < 4) feedback = "Make sure `stars` has at least 5 `(x, y)` tuples and your `for` loop runs `t.goto(x, y)` and `t.dot(...)` for each one!";
        else feedback = "Spread your stars into at least 3 different quadrants (mix positive & negative `x` and `y`)!";
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: "Closed star constellation unlocked!",
      };
    },
  },
  {
    id: "u8-l3",
    unitId: "unit8",
    type: "code",
    icon: "📖",
    title: "Shape Spellbook (`dict`)",
    subtitle: "Look up `{\"square\": 4}` safely with `in`",
    xp: 50,
    bonusXp: 20,
    story:
      "A Python **`dict`** (dictionary) pairs **keys** with **values**, like a magic spellbook: `{\"triangle\": 3, \"square\": 4, \"hexagon\": 6}`! Look up each spell in `orders`, guard unknown spells like `\"dragon\"` using **`if name in shapes:`** so Python never crashes, and draw 3+ different shapes!",
    mathTip:
      "A `list` looks things up by number (`items[0]`). A **`dict`** looks things up by **name** (`shapes[\"hexagon\"] == 6`)—super useful whenever words map to values!",
    starterCode: `import turtle

t = turtle.Turtle()
t.pensize(3)

shapes = {
    "triangle": 3,
    "square": 4,
    "pentagon": 5,
    "hexagon": 6,
}

orders = ["triangle", "dragon", "square", "hexagon"]

# Loop through orders: if name in shapes, jump to a spot and draw that polygon!
# Otherwise, print a friendly message saying that spell isn't in the book!
`,
    blueprint: null,
    showGridDefault: false,
    goals: [
      "Use a `dict` (`{key: value}`) spellbook",
      "Check keys safely with `if name in shapes:`",
      "Draw 3+ different regular polygons looked up from the dict",
    ],
    bonusGoal: "Bonus Star: Add a second `colors_map` dict (or `t.write(...)` each shape name) using 3+ colors!",
    hints: [
      "Loop with an index or counter:\n`x = -170`\n`for name in orders:`\n`    if name in shapes:`\n`        sides = shapes[name]`\n`        ...`",
      "In the `else:` branch, `print(\"Unknown spell:\", name)` skips `\"dragon\"` without crashing with a `KeyError`!",
      "Bump `x += 110` after each drawn shape so your triangle, square, and hexagon sit side-by-side!",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments, commands } = turtleData;
      const usedDict = Boolean(astInfo?.hasDict);
      const guardedIn = Boolean(astInfo?.hasIf) && Boolean(astInfo?.hasInOp);

      const paths = h.splitClosedShapes(segments);
      const polyKinds = new Set();
      for (const p of paths) {
        for (let n = 3; n <= 12; n++) {
          if (h.isRegularPolygon(p, n, { minSide: 18 })) {
            polyKinds.add(n);
            break;
          }
        }
      }
      const drewPolys = polyKinds.size >= 3;
      const bonusOk = h.countDistinctColors(segments) >= 3 || h.countWrites(commands) >= 3;

      const goals = [
        { label: "Use a dictionary (`dict`)", passed: usedDict },
        { label: "Check safely with `if ... in ...:`", passed: guardedIn },
        { label: `Draw 3+ distinct polygons (${polyKinds.size} drawn)`, passed: drewPolys },
      ];
      const passed = usedDict && guardedIn && drewPolys;
      let feedback = `Spellbook mastered! Looked up ${polyKinds.size} polygons cleanly with zero \`KeyError\` crashes.`;
      if (!passed) {
        if (!usedDict) feedback = "Keep your `shapes = {...}` dictionary mapping shape names to side counts!";
        else if (!guardedIn) feedback = "Check `if name in shapes:` before looking up `shapes[name]` so unknown words don't crash!";
        else feedback = `Found ${polyKinds.size} regular polygon type(s)—space each drawn shape apart with \`t.penup()\` / \`t.goto(...)\` so 3+ different polygons appear!`;
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: "Color-coded Shape Spellbook complete!",
      };
    },
  },
  {
    id: "u8-q1",
    unitId: "unit8",
    type: "quiz",
    icon: "⚡",
    title: "Quick Check: Data Containers",
    subtitle: "`list`, `tuple`, `dict`, & `set`",
    xp: 25,
    questions: [
      {
        prompt: "Given `colors = [\"red\", \"gold\", \"teal\", \"blue\"]`, what does `colors[-1]` give you?",
        options: ["`\"red\"`", "`\"blue\"` (the last item in the list)", "`\"teal\"`"],
        correctIndex: 1,
        explanation: "`colors[0]` is the first item (`\"red\"`), and `colors[-1]` counts backwards to the very last item (`\"blue\"`)!",
      },
      {
        prompt: "Which Python container is BEST for storing word-to-number lookups like `\"hexagon\" -> 6`?",
        options: [
          "A dictionary (`dict`): `{\"hexagon\": 6}`",
          "A `set`: `{\"hexagon\", 6}`",
          "Two separate unrelated numbers",
        ],
        correctIndex: 0,
        explanation: "Dictionaries map keys (`\"hexagon\"`) directly to values (`6`) so `shapes[\"hexagon\"]` returns `6` immediately!",
      },
      {
        prompt: "A `set` automatically blocks duplicates. After `seen = {\"Q1\", \"Q2\"}` and `seen.add(\"Q1\")`, what is `len(seen)`?",
        options: ["`3`", "`2` (duplicates are ignored!)", "`1`"],
        correctIndex: 1,
        explanation: "`\"Q1\"` was already in the set, so `seen` still holds just 2 unique items: `{\"Q1\", \"Q2\"}`!",
      },
      {
        prompt: "Spot the bug! Why does `shapes[\"star\"]` crash with a `KeyError`?",
        code: `shapes = {"triangle": 3, "square": 4}
print(shapes["star"])`,
        options: [
          "`\"star\"` is not a key in `shapes`—you should check `if \"star\" in shapes:` first!",
          "Dictionaries only allow numbers as keys",
          "`print()` cannot print numbers from a dictionary",
        ],
        correctIndex: 0,
        explanation: "Always guard user or unknown keys with `if word in my_dict:` before reading `my_dict[word]`!",
      },
    ],
  },
  {
    id: "u8-l4",
    unitId: "unit8",
    type: "code",
    icon: "🧭",
    title: "4-Corner Treasure Hunt (`set`)",
    subtitle: "Unique `set()` tracker + `while True:` & `break`",
    xp: 55,
    bonusXp: 20,
    story:
      "A Python **`set()`** is a treasure bag that **never allows duplicates**! Roam around the grid inside a `while True:` loop, add each visited quadrant (`\"Q1\"`, `\"Q2\"`, `\"Q3\"`, `\"Q4\"`) to `visited = set()`, and **`break`** out the exact moment `len(visited) == 4`!",
    mathTip:
      "If the turtle visits Quadrant 1 three times, `visited.add(\"Q1\")` keeps only ONE `\"Q1\"`—so `len(visited) == 4` proves you explored all 4 distinct quadrants!",
    starterCode: `import turtle
import random

t = turtle.Turtle()
t.pensize(2)
t.pencolor("orange")

visited = set()
steps = 0

while True:
    steps += 1
    x = random.randint(-190, 190)
    y = random.randint(-150, 150)
    t.penup()
    t.goto(x, y)
    t.pendown()

    # 1. Pick zone = "Q1", "Q2", "Q3", or "Q4" based on x and y!
    # 2. Drop a t.dot(...) and add zone to visited using visited.add(zone)!
    # 3. Replace this starter safety brake with: if len(visited) == 4: break
    if steps >= 8:
        break

print("Explored all corners:", visited, "in", steps, "hops!")
`,
    blueprint: null,
    showGridDefault: true,
    goals: [
      "Track visited zones in a `set()` using `.add()`",
      "Stop a `while` loop cleanly with `break`",
      "Explore and mark all 4 quadrants (`4/4`)",
    ],
    bonusGoal: "Bonus Star: Stamp a bright gold dot ONLY when `zone not in visited` (a brand-new discovery!), and another color on repeat visits!",
    hints: [
      "Figure out the quadrant with:\n`if x > 10 and y > 10: zone = \"Q1\"`\n`elif x < -10 and y > 10: zone = \"Q2\"`\n`elif x < -10 and y < -10: zone = \"Q3\"`\n`elif x > 10 and y < -10: zone = \"Q4\"`\n`else: continue` (or skip axes!)",
      "Note: to award the Bonus Star, check `if zone not in visited: t.dot(18, \"gold\")` / `else: t.dot(10, \"skyblue\")` BEFORE `visited.add(zone)`!",
      "Don't forget a backup safety brake (like `if len(visited) == 4 or steps >= 80: break`) so your hunt always ends cleanly!",
    ],
    check(runResult, h) {
      const { astInfo, turtleData } = runResult;
      const { segments, commands } = turtleData;
      const calls = astInfo?.callNames || [];
      const usedSet = Boolean(astInfo?.hasSet) && calls.includes("add");
      const usedWhileBreak = Boolean(astInfo?.hasWhile) && Boolean(astInfo?.hasBreak);
      const quads = h.visitedQuadrants(segments, commands);
      const dots = h.countDots(commands);
      const exploredAll = quads.size === 4 && (dots >= 4 || segments.length >= 4);

      const dotColors = new Set(
        commands.filter((c) => c.cmd === "dot" && c.color).map((c) => String(c.color).toLowerCase())
      );
      const bonusOk = dotColors.size >= 2 && dots >= 4;

      const goals = [
        { label: "Use a `set()` and `.add()` to prevent duplicates", passed: usedSet },
        { label: "Use `while` + `break` when all 4 corners are found", passed: usedWhileBreak },
        { label: `Visit and mark all 4 quadrants (${quads.size}/4 visited)`, passed: exploredAll },
      ];
      const passed = usedSet && usedWhileBreak && exploredAll;
      let feedback = "Treasure hunt complete! Your `set` tracked every unique quadrant until `len(visited) == 4` triggered `break`.";
      if (!passed) {
        if (!usedSet) feedback = "Keep `visited = set()` and call `visited.add(zone)` for each quadrant!";
        else if (!usedWhileBreak) feedback = "Use a `while True:` loop with `if len(visited) == 4: break`!";
        else feedback = `Only ${quads.size}/4 quadrants were marked on canvas—make sure \`t.dot(...)\` runs inside the loop and replace \`if steps >= 8: break\` with \`if len(visited) == 4 or steps >= 80: break\`!`;
      }
      return {
        passed,
        goals,
        feedback,
        bonusPassed: passed && bonusOk,
        bonusFeedback: "First-discovery radar (`not in visited`) unlocked!",
      };
    },
  },
];
