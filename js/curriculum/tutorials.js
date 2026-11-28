/**
 * Beginner-friendly step-by-step tutorials (designed for a 10-year-old with zero
 * prior Python or programming experience), per-lesson Learn First cards, and
 * the always-available Python + Turtle Cheat Sheet.
 */

export const UNIT_TUTORIAL_NODES = {
  unit1: {
    id: "u1-t0",
    unitId: "unit1",
    type: "tutorial",
    icon: "📖",
    title: "Start Here: What Is Python?",
    subtitle: "3-minute hands-on beginner guide (no coding yet!)",
    xp: 15,
    steps: [
      {
        badge: "Step 1 • Programming Basics",
        title: "Code Is a Step-by-Step Recipe",
        body: "A computer is super fast, but it can't guess what you mean—it follows your instructions **strictly from top to bottom**, one line at a time.\n\n**Python** is the language we use to write those instructions. Lines starting with `#` are **comments** (sticky notes for humans—Python skips them!).",
        code: `# This is a comment (Python ignores it!)
t.forward(100)   # Step 1: walk 100 pixels straight
t.right(90)      # Step 2: turn 90 degrees right
t.forward(100)   # Step 3: walk 100 pixels straight`,
        callout: "Think of your turtle like a tiny robot holding a marker on a giant sheet of paper!",
      },
      {
        badge: "Step 2 • The 2 Magic Setup Lines",
        title: "Hatching Your Turtle",
        body: "Before your turtle can draw, every program starts with **2 setup lines**:\n1. `import turtle` — opens Python's Turtle toolbox.\n2. `t = turtle.Turtle()` — hatches a brand-new turtle and names it **`t`**.\n\nAfter that, write **`t.command(number)`** to give `t` an order!",
        diagram: "anatomy",
        code: `import turtle        # Open the turtle toolbox
t = turtle.Turtle()  # Hatch a turtle named t
t.forward(100)       # Tell t: go forward 100!`,
        callout: "The dot `.` means \"belongs to\"—so `t.forward(100)` literally means \"Hey `t`, run your `forward` command with `100`!\"",
      },
      {
        badge: "Step 3 • Numbers vs. Text",
        title: "Parentheses `()` and Quotes `\"\"`",
        body: "Python has two tiny punctuation rules that will save you tons of headaches:\n• Every action needs **parentheses `()`** around its input: `t.forward(100)` (never `t.forward 100`).\n• **Numbers** don't need quotes (`100`, `90`), but **words & color names** ALWAYS wear quotes (`\"blue\"`, `\"red\"`).",
        code: `t.pencolor("blue")  # Word -> MUST wear quotes!
t.pensize(5)        # Number -> NO quotes!
t.forward(100)      # Number -> NO quotes!`,
        callout: "If you write `t.pencolor(blue)` without quotes, Python thinks `blue` is a secret variable name instead of a color!",
      },
      {
        badge: "Step 4 • Try It Live!",
        title: "Tap Buttons & Watch Python Write Itself",
        body: "Tap the command buttons below to drive the turtle! Watch how every tap adds a real line of Python code on the right.",
        widget: "turtle-tap",
        callout: "Try tapping **Forward**, **Right 90°**, **Forward**—you just wrote your first Python turtle corner!",
      },
    ],
  },

  unit2: {
    id: "u2-t0",
    unitId: "unit2",
    type: "tutorial",
    icon: "📖",
    title: "Guide: Meet the `for` Loop",
    subtitle: "How to repeat commands + the 360° math trick",
    xp: 15,
    steps: [
      {
        badge: "Step 1 • Why Loops?",
        title: "Stop Copy-Pasting the Same Lines!",
        body: "To draw a square by hand, you had to write `forward` and `right` **4 separate times** (8 lines!). What if you wanted a 36-sided circle? That would be **72 lines**!\n\nA **`for` loop** tells Python: *\"Repeat these indented lines N times automatically!\"*",
        diagram: "loop-compare",
        callout: "Great programmers are cleverly lazy—when you spot a repeating pattern, put it in a `for` loop!",
      },
      {
        badge: "Step 2 • The 2 Golden Loop Rules",
        title: "Colon `:` + 4 Spaces of Indentation",
        body: "A Python `for` loop ALWAYS needs two things:\n1. A **colon `:`** at the very end of the `for` line.\n2. **4 spaces** (press `Tab`) at the start of every line that belongs **inside** the loop.\n\nLines lined up back on the left run **after** the loop finishes!",
        code: `for i in range(4):      # <-- Don't forget the colon :
    t.forward(100)      # <-- 4 spaces: runs 4 times!
    t.right(90)         # <-- 4 spaces: runs 4 times!
t.pencolor("red")       # <-- 0 spaces: runs ONCE at the end!`,
        callout: "What is `i`? It's a tiny built-in counter that counts `0, 1, 2, 3`—one number per lap around the loop!",
      },
      {
        badge: "Step 3 • Interactive Math Explorer",
        title: "The 360° Polygon Formula (`360 / sides`)",
        body: "To walk all the way around ANY regular polygon and end facing the same direction you started, your turtle's outside turns MUST add up to a full **360° spin**!\n\nDrag the slider below to test different shapes and see the exact Python loop!",
        widget: "polygon-slider",
        callout: "Fun check: `360 / 5 = 72°` (pentagon), `360 / 6 = 60°` (hexagon), `360 / 8 = 45°` (octagon)!",
      },
    ],
  },

  unit3: {
    id: "u3-t0",
    unitId: "unit3",
    type: "tutorial",
    icon: "📖",
    title: "Guide: Variables, Math & (x, y)",
    subtitle: "Labeled memory boxes, console print(), & 4 quadrants",
    xp: 15,
    steps: [
      {
        badge: "Step 1 • Variables",
        title: "Variables Are Labeled Storage Boxes",
        body: "A **variable** gives a name to a number so you can reuse it anywhere. When you write `sides = 5`, Python puts `5` inside a box labeled **`sides`**.\n\nChange `sides = 5` to `sides = 8` in one spot, and your whole program transforms from a pentagon into an octagon!",
        diagram: "variable-boxes",
        code: `sides = 5
length = 90
angle = 360 / sides   # Python calculates 72.0 for you!`,
        callout: "In Python, `=` doesn't mean \"equals\" like in math class—it means **\"store this value inside this box\"**!",
      },
      {
        badge: "Step 2 • Python Math & `print()`",
        title: "Using Python as a Super Calculator",
        body: "Python knows all the math operators you use in Singapore Math 5A—notice multiply uses `*` (star) and divide uses `/` (slash):\n• `+` add • `-` subtract • `*` multiply • `/` divide\n\nUse **`print(...)`** to display any number or message in the dark Console box below the canvas!",
        code: `sides = 5
length = 90
print("Turn angle:", 360 / sides)    # Shows: Turn angle: 72.0
print("Perimeter:", sides * length)  # Shows: Perimeter: 450`,
        callout: "You can print multiple things separated by commas—Python automatically adds a neat space between them!",
      },
      {
        badge: "Step 3 • Interactive Coordinate Grid",
        title: "Teleport Anywhere with `t.goto(x, y)`",
        body: "The center of your canvas is **`(0, 0)`**.\n• **`x`** goes left (`-`) and right (`+`).\n• **`y`** goes down (`-`) and up (`+`).\n\nClick anywhere on the grid below to see the exact `t.goto(x, y)` command!",
        widget: "coord-picker",
        callout: "Remember: if your pen is down, `t.goto(x, y)` draws a straight line there. Call `t.penup()` first to teleport invisibly!",
      },
    ],
  },

  unit4: {
    id: "u4-t0",
    unitId: "unit4",
    type: "tutorial",
    icon: "📖",
    title: "Guide: Build Your Own Commands (`def`)",
    subtitle: "Functions, parameters, & star-polygon math",
    xp: 15,
    steps: [
      {
        badge: "Step 1 • What Is a Function?",
        title: "Teach Python a Brand-New Word!",
        body: "Python already knows `t.forward()` and `t.right()`. With **`def`** (short for **define**), you can invent YOUR OWN command—like `draw_square(size)` or `draw_star(size)`—and reuse it anywhere!",
        diagram: "def-anatomy",
        code: `def draw_square(size):     # 1. Teach Python the recipe
    for i in range(4):
        t.forward(size)
        t.right(90)

draw_square(50)            # 2. Call it anytime!
draw_square(100)           # 3. Call it again at a new size!`,
        callout: "Important rule: writing `def ...` only *teaches* Python the recipe—nothing draws until you actually **call** it like `draw_square(50)`!",
      },
      {
        badge: "Step 2 • Parameters",
        title: "Multi-Dial Functions (`sides, size`)",
        body: "Variables listed inside `(...)` on the `def` line are called **parameters**—they act like adjustable dials! Separate multiple parameters with a comma:",
        code: `def draw_polygon(sides, size):
    angle = 360 / sides
    for i in range(sides):
        t.forward(size)
        t.right(angle)

draw_polygon(3, 80)   # Triangle!
draw_polygon(6, 55)   # Hexagon!`,
        callout: "One 5-line function can now draw triangles, squares, pentagons, hexagons, octagons—every regular polygon!",
      },
      {
        badge: "Step 3 • Interactive Star Math Explorer",
        title: "Why 5-Point Stars Turn `144°`!",
        body: "A regular polygon makes **1** full `360°` spin (`360 ÷ sides`). A sharp star leaps across the circle and makes **2 or 3** full spins (`360 × skip ÷ points`)!\n\nTap the star presets below to explore star-polygon math:",
        widget: "star-explorer",
        callout: "Check `5` points skipping `2`: `2 × 360° = 720°`, and `720° ÷ 5 = 144°`!",
      },
    ],
  },

  unit5: {
    id: "u5-t0",
    unitId: "unit5",
    type: "tutorial",
    icon: "📖",
    title: "Guide: Decisions (`if`), `%` & `random`",
    subtitle: "Teach Python to choose, check remainders, & roll dice",
    xp: 15,
    steps: [
      {
        badge: "Step 1 • Making Choices",
        title: "Branching Paths with `if / elif / else`",
        body: "An **`if`** statement lets Python ask a Yes/No question and choose what to run:\n• `==` checks **is equal to?** (remember: TWO equals signs!)\n• `<` less than • `>` greater than • `!=` not equal\n\nUse `elif` (\"else if\") for extra choices and `else:` as the fallback!",
        code: `if sides < 3:
    print("Too few sides!")
elif sides == 4:
    print("Square time!")
else:
    print("Awesome polygon!")`,
        callout: "Just like `for`, every `if`, `elif`, and `else` line ends with a colon `:` and indents its body by 4 spaces!",
      },
      {
        badge: "Step 2 • The Remainder Operator (`%`)",
        title: "Modulo (`%`) = Division Remainder!",
        body: "In Singapore Math, `7 ÷ 2 = 3` remainder **`1`**. Python's **`%`** operator gives you that remainder directly: `7 % 2` equals **`1`**, while `8 % 2` equals **`0`**!\n\nThat makes alternating patterns super easy: `i % 2 == 0` is True for every **even** lap (`0, 2, 4, 6...`) and False for every **odd** lap (`1, 3, 5, 7...`).",
        code: `if i % 2 == 0:
    t.pencolor("teal")   # Even laps: 0, 2, 4, 6
else:
    t.pencolor("gold")   # Odd laps: 1, 3, 5, 7`,
        callout: "Want a 3-color pattern? Check `i % 3`—the remainders always cycle `0, 1, 2, 0, 1, 2...`!",
      },
      {
        badge: "Step 3 • Interactive Modulo & Random Lab",
        title: "Test Remainders & `random` Live!",
        body: "Toggle `i % 2`, `i % 3`, or `i % 4` below to see how remainders paint repeating stripes—and roll `random.randint()` to see chance in action!",
        widget: "modulo-random",
        callout: "Remember `import random` at the top of your file whenever you use `random.randint(a, b)` or `random.choice(list)`!",
      },
    ],
  },

  unit6: {
    id: "u6-t0",
    unitId: "unit6",
    type: "tutorial",
    icon: "📖",
    title: "Guide: Boss Patterns, `while` & Recursion",
    subtitle: "How fractal trees, clocks, & playable games work",
    xp: 15,
    steps: [
      {
        badge: "Step 1 • `while` Loops",
        title: "Repeat Until a Condition Changes",
        body: "Use a `for` loop when you know the exact count (like `range(12)` for 12 clock hours). Use a **`while` loop** when you don't know how many tries something will take—like guessing a secret number!",
        code: `while guess != secret:
    guess = int(input("Try a number: "))
print("You cracked the code!")`,
        callout: "Always make sure something *inside* the `while` loop changes the condition so it stops eventually!",
      },
      {
        badge: "Step 2 • Recursion",
        title: "A Function That Calls Itself!",
        body: "Look at a real tree: a trunk splits into 2 smaller branches, and each branch splits into 2 even smaller branches! In Python, a function can call **itself** with a smaller number (`length * 0.7`)—that's called **recursion**.\n\nEvery recursive function MUST start with a **base case** (`if length < 15: return`) so it stops shrinking!",
        diagram: "recursion-diagram",
        callout: "Base case = the emergency brake that prevents infinite recursion!",
      },
      {
        badge: "Step 3 • Interactive Fractal Tree Lab",
        title: "Grow a Recursive Tree Live!",
        body: "Drag the **Levels** and **Branch Angle** sliders below to see how one tiny recursive function builds an entire forest canopy:",
        widget: "tree-explorer",
        callout: "You're ready for the Boss Missions—let's build a Clock, a Fractal Tree, a Playable Game, and your own Crest!",
      },
    ],
  },

  unit7: {
    id: "u7-t0",
    unitId: "unit7",
    type: "tutorial",
    icon: "📖",
    title: "Guide: Operators, Truth Gates & Smart Text",
    subtitle: "Division `//` vs `%`, `and`/`or`/`not`, clean strings, & `return`",
    xp: 15,
    steps: [
      {
        badge: "Step 1 • Math Operators Upgrade",
        title: "`//` (Quotient), `**` (Powers), & `+=` (Counters)",
        body: "Python gives you 3 speedy math tools:\n• **`//`** gives the whole-number **quotient** (`9 // 4 == 2`), pairing directly with **`%`** remainder (`9 % 4 == 1`)!\n• **`**`** computes **powers/exponents** (`2 ** 3 == 8`, `5 ** 2 == 25`).\n• **`+=`** updates a counter fast (`score += 1` adds 1 to `score`).",
        code: `row = 7 // 4    # Whole quotient -> 1
col = 7 % 4     # Remainder      -> 3
tower = 2 ** 4  # Powers of 2    -> 16
total += 1      # Shortcut for: total = total + 1`,
        callout: "With `row = i // 4` and `col = i % 4`, a single loop counts through every row and column of a 2D grid!",
      },
      {
        badge: "Step 2 • Boolean Logic Gates",
        title: "Combining Questions with `and`, `or`, `not`",
        body: "Comparisons produce **`True`** or **`False`**. Combine multiple checks inside `if`:\n• **`and`** — BOTH checks must be `True`.\n• **`or`** — at least ONE check must be `True`.\n• **`not`** — flips `True ↔ False`!",
        widget: "logic-gate-lab",
        callout: "Use `if x < -130 or x > 130:` to catch a turtle hitting EITHER wall, or `-130 <= x <= 130 and -90 <= y <= 90` for inside the safe box!",
      },
      {
        badge: "Step 3 • Smart Text & `return` Machines",
        title: "Tidy `str` Text + Functions That Hand Back Answers",
        body: "Clean typed words with **`.strip().lower()`**, check their size with **`len(word)`**, and plug variables straight into strings with **f-strings** (`f\"Hello, {clean}!\"`).\n\nAnd inside a `def` function, **`return`** turns a recipe into an Answer Machine that sends back a result!",
        diagram: "return-machine",
        code: `clean = "  MAYA  ".strip().lower()   # -> "maya"
banner = f"Hello, {clean}!"           # f-string magic

def turn_angle(sides):
    return 360 / sides                 # Hands back 72.0!`,
        callout: "Always save string edits back into a variable (`clean = raw.strip().lower()`), because `.strip()` builds a fresh cleaned string!",
      },
    ],
  },

  unit8: {
    id: "u8-t0",
    unitId: "unit8",
    type: "tutorial",
    icon: "📖",
    title: "Guide: Data Containers (`list`, `tuple`, `dict`, `set`)",
    subtitle: "4 super containers to organize colors, points, lookups & discoveries",
    xp: 15,
    steps: [
      {
        badge: "Step 1 • Meet the 4 Containers",
        title: "Different Treasure Chests for Different Jobs",
        body: "Instead of creating 20 separate variables (`c1`, `c2`, `c3`...), Python bundles values inside 4 containers—each with its own bracket style!",
        diagram: "collection-cards",
        callout: "Square brackets `[]` = **List** • Parentheses `()` = **Tuple** • Curly `{k: v}` = **Dictionary** • Curly `{a, b}` / `set()` = **Set**!",
      },
      {
        badge: "Step 2 • Interactive Container Lab",
        title: "Play With Lists, Dicts & Sets Live!",
        body: "Tap the tabs below to inspect list positions (`[0]` and `[-1]`), look up polygon sides in a dictionary spellbook, and see how a `set` automatically blocks duplicates!",
        widget: "collection-explorer",
        callout: "Zero-based counting tip: item #1 is always at index **`[0]`**, and **`[-1]`** grabs the very last item!",
      },
      {
        badge: "Step 3 • `while True:` + `break`",
        title: "Loop Until a Goal Is Reached",
        body: "Pair `visited = set()` with **`while True:`** and **`break`**! Inside the loop, keep hopping and adding quadrants with `visited.add(zone)`—then `if len(visited) == 4: break` exits immediately once all 4 are collected!",
        code: `visited = set()
while True:
    # roam & add zone to visited...
    if len(visited) == 4:
        break  # Instant exit!`,
        callout: "Think of `break` as an emergency exit door out of the nearest loop!",
      },
    ],
  },

  unit9: {
    id: "u9-t0",
    unitId: "unit9",
    type: "tutorial",
    icon: "📖",
    title: "Guide: Blueprints & Objects (OOP)",
    subtitle: "Cookie-cutter classes (`class`), `__init__`, `self`, & methods",
    xp: 15,
    steps: [
      {
        badge: "Step 1 • Cookie Cutters vs. Cookies",
        title: "What Is a Class? What Is an Object?",
        body: "You've ALREADY been using a class since Lesson 1! When you write **`leo = turtle.Turtle()`** and **`maya = turtle.Turtle()`**, `Turtle` is the **blueprint (class)** and `leo` and `maya` are two separate **objects (instances)** that each remember their own `(x, y)`, heading, and color!",
        diagram: "class-blueprint",
        code: `leo = turtle.Turtle()   # Object #1
maya = turtle.Turtle()  # Object #2 (independent!)
leo.pencolor("dodgerblue")
maya.pencolor("coral")`,
        callout: "Moving `leo` NEVER moves `maya`—each object carries its own personal data!",
      },
      {
        badge: "Step 2 • Building Your Own `class`",
        title: "Inside `__init__` and `self`",
        body: "You can invent your own classes (like `StampBot` or `Planet`)! Inside a class:\n• **`def __init__(self, ...):`** runs once when a new object is created.\n• **`self.color = color`** glues that value onto *this specific object*.\n• Every method inside the class takes **`self`** as its first parameter!",
        code: `class StampBot:
    def __init__(self, pen, color, size):
        self.pen = pen
        self.color = color
        self.size = size

    def draw_square(self, x, y):
        self.pen.pencolor(self.color)
        ...`,
        callout: "Say it out loud: `self.size` means *\"MY OWN size stored inside THIS bot!\"*",
      },
      {
        badge: "Step 3 • Interactive Blueprint Factory",
        title: "Stamp Independent Objects Live!",
        body: "Pick a color and size below and click **Spawn StampBot!** to watch one `class` blueprint stamp out totally different objects onto the canvas:",
        widget: "blueprint-factory",
        callout: "Once you put objects in a `list` (`for p in planets: p.draw(t)`), 3 lines of loop code can animate an entire solar system!",
      },
    ],
  },
};

/**
 * Step-by-step "Learn First" cards shown inside every coding mission.
 */
export const LESSON_TUTORIALS = {
  "u1-l1": [
    {
      title: "How Turtle Commands Work",
      body: "Your turtle `t` starts at the center `(0, 0)` pointing **East (right)**. Each line runs in order from top to bottom:\n• `t.forward(100)` walks 100 pixels straight ahead.\n• `t.right(90)` spins 90° clockwise (to the right).\n• `t.left(90)` spins 90° counter-clockwise (to the left).",
      code: `t.pencolor("blue")
t.forward(100)
t.right(90)
t.forward(100)`,
      tip: "Look at the pale dashed blue **Blueprint** on the canvas—it shows an example L-corner!",
    },
    {
      title: "Bonus Tip: Changing Line Thickness",
      body: "Want a bold, chunky marker line? Call `t.pensize(5)` **before** moving forward! Bigger numbers make thicker lines.",
      code: `t.pensize(5)        # Thick 5-pixel line
t.pencolor("coral") # Pick any color name in quotes!`,
      tip: "Click **▶ Run Code** anytime to test—making mistakes is free and won't cost you hearts!",
    },
  ],
  "u1-l2": [
    {
      title: "Building a Closed Square",
      body: "A square has **4 equal sides** and **4 right angles (90°)**. After moving forward and turning 90° four times, `4 × 90° = 360°`, so your turtle lands right back at the start!",
      code: `t.forward(100)
t.right(90)
t.forward(100)
t.right(90)
# Repeat 2 more times to close the square!`,
      tip: "Try clicking the **Step** speed button on the canvas and tapping **Next Step** to watch each line light up one by one!",
    },
    {
      title: "Switching Colors Mid-Shape",
      body: "Every time you call `t.pencolor(\"orange\")`, all lines drawn **after** that line use the new color—earlier lines keep their old color!",
      code: `t.pencolor("green")
t.forward(100)
t.right(90)
t.pencolor("orange")  # Next side will be orange!
t.forward(100)`,
      tip: "Using 2 or more colors earns the ⭐ Bonus Star on this mission.",
    },
  ],
  "u1-l3": [
    {
      title: "The Famous 60° vs. 120° Triangle Trap!",
      body: "Every **inside** corner of an equilateral triangle is `60°`. But look at the turtle walking straight ahead—to bend sharply back around into a 60° corner, it has to turn the **outside (exterior) angle**: `180° - 60° = 120°`!",
      diagram: "exterior-angle",
      tip: "Check the 360° rule: `3 turns × 120° = 360°`! Turning `60°` only gives `3 × 60° = 180°` (half a hexagon!).",
    },
    {
      title: "Bonus Trick: Filling Shapes with Color",
      body: "Want to paint the inside of your triangle? Wrap your drawing commands between `t.begin_fill()` and `t.end_fill()`:",
      code: `t.fillcolor("gold")
t.begin_fill()
# ... draw all 3 sides here ...
t.end_fill()`,
      tip: "Make sure `t.end_fill()` comes **after** all 3 sides are drawn!",
    },
  ],
  "u1-l4": [
    {
      title: "Lifting Your Marker with `penup()`",
      body: "By default, your turtle's marker is **down**, so moving anywhere leaves ink. To hop cleanly to a new spot:\n1. `t.penup()` — lifts the marker off the paper.\n2. Move to your new spot (`t.forward(120)` or `t.goto(100, 0)`).\n3. `t.pendown()` — puts the marker back down to draw again!",
      code: `t.penup()        # Marker UP (no trail!)
t.forward(120)   # Hop across empty space
t.pendown()      # Marker DOWN (ready to draw!)`,
      tip: "Forgetting `t.pendown()` is the #1 bug here—if your second shape looks invisible, check the HUD (`Pen: Down`)!",
    },
  ],
  "u2-l1": [
    {
      title: "Writing Your First `for` Loop",
      body: "Instead of typing `t.forward(100)` and `t.right(90)` four times, wrap them inside `for i in range(4):` and push both lines **4 spaces to the right** (press `Tab`):",
      code: `for i in range(4):
    t.forward(100)
    t.right(90)`,
      tip: "Check the 2 loop rules: a colon `:` at the end of line 1, and 4 spaces in front of lines 2 and 3!",
    },
  ],
  "u2-l2": [
    {
      title: "Let Python Do the Division!",
      body: "For a regular 6-sided **hexagon**, each outside turn is `360 ÷ 6 = 60°`. Even cooler—you can type `360 / 6` right inside `t.right(...)` and Python calculates it for you!",
      code: `for i in range(6):
    t.forward(75)
    t.right(360 / 6)`,
      tip: "For the ⭐ Bonus Star, put `t.begin_fill()` **before** the loop and `t.end_fill()` **after** the loop (with 0 spaces in front!).",
    },
  ],
  "u2-l3": [
    {
      title: "How Computers Fake Curves",
      body: "Screens are made of tiny straight steps. If you draw a **36-sided polygon** with tiny sides (`12` pixels) and tiny turns (`360 / 36 = 10°`), your eyes see a smooth circle!",
      code: `for i in range(36):
    t.forward(12)
    t.right(360 / 36)   # 10 degrees each step!`,
      tip: "Try switching the speed to **Fast** or **Instant** so the 36 steps zip around cleanly!",
    },
  ],
  "u2-l4": [
    {
      title: "Loop Inside a Loop (Nested Loops)",
      body: "To make a Spirograph, put a shape-drawing loop **inside** a rotation loop:\n• **Outer loop (`j`):** runs 12 times.\n• **Inner loop (`i`):** indented **4 spaces**, its body indented **8 spaces**—draws 1 full square.\n• **Rotate line:** back at **4 spaces**, turns `30°` (`360 / 12`) before the next square!",
      code: `for j in range(12):        # 0 spaces (outer loop)
    for i in range(4):     # 4 spaces (inner loop)
        t.forward(85)      # 8 spaces (inside inner loop)
        t.right(90)        # 8 spaces
    t.right(30)            # 4 spaces (runs after each square!)`,
      tip: "Watch the indentation carefully! If `t.right(30)` had 8 spaces, it would turn 30° on every single side instead of once per square.",
    },
  ],
  "u3-l1": [
    {
      title: "Variables + `print()` Together",
      body: "Store numbers in named variables (`sides`, `length`, `angle`), then pass those names into `range(sides)`, `t.forward(length)`, `t.right(angle)`, and `print(...)`!",
      code: `sides = 5
length = 90
angle = 360 / sides

print("Turn angle:", angle)
print("Perimeter:", sides * length)`,
      tip: "Why does `360 / 5` print `72.0` instead of `72`? Standard `/` division always produces a decimal (`float`) in Python—we'll learn whole-number `//` division in Unit 7!",
    },
  ],
  "u3-l2": [
    {
      title: "Using the Loop Counter `i` to Grow!",
      body: "Inside `for i in range(24):`, the variable `i` automatically changes every lap: `0, 1, 2, 3, ... 23`!\n\nIf you write `t.forward(10 + i * 6)` **and** turn every lap (`t.right(90)`), each side grows 6 pixels longer than the last:",
      code: `# Lap i=0 -> forward(10)  then right(90)
# Lap i=1 -> forward(16)  then right(90)
# Lap i=2 -> forward(22)  then right(90)
for i in range(24):
    t.forward(10 + i * 6)
    t.right(90)`,
      tip: "For a wild twisted illusion (and the ⭐ Bonus Star!), change `range(24)` to `range(32)` and change `90` to `91` or `72`!",
    },
  ],
  "u3-l3": [
    {
      title: "Singapore Math Ratios in Code!",
      body: "If `small = 60`, then `big = small * 2` creates an exact **1 : 2** ratio automatically! Even if you later change `small = 40`, `big` updates to `80` by itself.",
      code: `small = 60
big = small * 2

# Notice the area ratio!
print("Small area:", small * small)  # 3600
print("Big area:", big * big)        # 14400 (4x bigger!)`,
      tip: "Use `t.penup()`, `t.goto(10, 60)`, and `t.pendown()` to hop over before drawing the big square.",
    },
  ],
  "u3-l4": [
    {
      title: "Reading the 4 Quadrants",
      body: "With **# Grid** turned ON, every spot has an address `(x, y)`:\n• **Quadrant I (top-right):** `(+x, +y)` like `(100, 80)`\n• **Quadrant II (top-left):** `(-x, +y)` like `(-100, 80)`\n• **Quadrant III (bottom-left):** `(-x, -y)` like `(-100, -80)`\n• **Quadrant IV (bottom-right):** `(+x, -y)` like `(100, -80)`",
      code: `t.goto(-100, 80)   # Top-left
t.dot(14, "gold")  # Drop a bright star dot!`,
      tip: "If you go to all 4 corners and finish back at `(100, 80)`, you connect a giant rectangle across all 4 quadrants and earn the ⭐ Bonus Star!",
    },
  ],
  "u4-l1": [
    {
      title: "Defining vs. Calling a Function",
      body: "The indented block under `def draw_square(size):` teaches Python the recipe. Then, back at **0 spaces** of indentation, you can call `draw_square(60)` and `draw_square(110)` as many times as you want!",
      code: `def draw_square(size):
    for i in range(4):
        t.forward(size)
        t.right(90)

draw_square(60)
draw_square(110)`,
      tip: "Notice `for i in range(4):` inside `def` has **4 spaces**, and lines inside the `for` loop have **8 spaces**!",
    },
  ],
  "u4-l2": [
    {
      title: "Cracking the 144° Star Angle",
      body: "To weave a 5-point star, the turtle goes around **TWO full circles** (`2 × 360° = 720°`) across 5 corners:\n`720° ÷ 5 = 144°` per turn!",
      code: `def draw_star(size):
    for i in range(5):
        t.forward(size)
        t.right(144)`,
      tip: "Try `t.begin_fill()` before `draw_star(150)` and `t.end_fill()` after to paint a glowing golden star!",
    },
  ],
  "u4-l3": [
    {
      title: "Passing 2 Parameters (`sides, size`)",
      body: "Separate parameters with a comma inside `def draw_polygon(sides, size):`. When you call `draw_polygon(6, 55)`, Python sets `sides = 6` and `size = 55` automatically!",
      code: `draw_polygon(3, 80)   # 3-sided triangle (120° turns)
draw_polygon(6, 55)   # 6-sided hexagon (60° turns)`,
      tip: "Use `t.penup()` and `t.goto(x, y)` between calls so your shapes sit cleanly side-by-side!",
    },
  ],
  "u4-l4": [
    {
      title: "Stamping a Row × Column Grid",
      body: "Nested loops build 2D grids naturally: the outer loop picks the `row` (up/down `y`), and the inner loop walks across each `col` (left/right `x`) calling your helper function `draw_tile(x, y, size)`!",
      code: `for row in range(3):
    for col in range(3):
        x = -90 + col * 65
        y = 70 - row * 65
        draw_tile(x, y, 50)`,
      tip: "Want checkerboard colors? Try `if (row + col) % 2 == 0:` or pick from a list of colors!",
    },
  ],
  "u5-l1": [
    {
      title: "Alternating Colors with `i % 2 == 0`",
      body: "Inside a loop, `i % 2` gives `0` on even steps (`0, 2, 4, 6`) and `1` on odd steps (`1, 3, 5, 7`). Combine it with `if / else` to flip colors automatically!",
      code: `if i % 2 == 0:
    t.pencolor("teal")
else:
    t.pencolor("gold")`,
      tip: "For the ⭐ Bonus Star, change `range(8)` to `range(9)` and use `i % 3 == 0` / `elif i % 3 == 1` / `else` for 3 colors!",
    },
  ],
  "u5-l2": [
    {
      title: "Turning `input()` Text Into a Number",
      body: "When Python runs `input(...)`, a popup asks you to type an answer. Because `input()` always returns **text** (like `\"6\"`), wrap it in `int(...)` so Python can divide `360 / sides`!",
      code: `sides = int(input("How many sides? "))
angle = 360 / sides`,
      tip: "Adding `if sides < 3: sides = 3` protects your program if someone types `1` or `2`!",
    },
  ],
  "u5-l3": [
    {
      title: "Generating Random Coordinates & Colors",
      body: "After `import random`, you get two awesome tools:\n• `random.randint(-220, 220)` picks a random whole number in that range.\n• `random.choice(colors)` picks a random color from `colors = [\"gold\", ...]` (**Sneak Peek:** square brackets `[]` create a **list**—you'll master them in Unit 8!).",
      code: `t.hideturtle()   # Hides the turtle arrow for a clean sky!
x = random.randint(-220, 220)
y = random.randint(-170, 170)
t.goto(x, y)
t.dot(random.randint(6, 16), random.choice(colors))`,
      tip: "Call `turtle.bgcolor(\"navy\")` at the top so your random stars shine against a dark sky, and `t.hideturtle()` to tuck the turtle away cleanly!",
    },
  ],
  "u5-l4": [
    {
      title: "Random Walks & Safety Fences",
      body: "Pick a random heading (`random.choice([0, 90, 180, 270])`) every step! Use:\n• `t.distance(0, 0)` — measures how far away from center the turtle wandered.\n• `t.towards(0, 0)` — returns the compass angle pointing straight back home.\n• `round(num, 1)` — rounds long decimals (like `42.4264...`) neatly to 1 decimal place (`42.4`)!",
      code: `if t.distance(0, 0) > 150:
    t.setheading(t.towards(0, 0))
    t.forward(40)

print("Distance:", round(t.distance(0, 0), 1))`,
      tip: "Run it 3 times and compare how far from `(0, 0)` each random walk finishes in the console!",
    },
  ],
  "u6-l1": [
    {
      title: "Clock Compass Math (`30°` per Hour)",
      body: "A clock splits `360°` into `12` equal slices of `30°`. Since North (12 o'clock) is heading `90°`, hour `h` points at heading `90 - h * 30`:\n• 12 o'clock (`h=0`) → `90°`\n• 3 o'clock (`h=3`) → `0°`\n• 6 o'clock (`h=6`) → `-90°` (`270°`)",
      code: `for hour in range(12):
    t.penup()
    t.home()
    t.setheading(90 - hour * 30)
    t.forward(115)
    t.dot(10, "navy")`,
      tip: "Draw your hour hand shorter & thicker (`pensize(6)`, `forward(65)`) and your minute hand longer (`pensize(4)`, `forward(95)`)!",
    },
  ],
  "u6-l2": [
    {
      title: "Trace & Grow Both Sub-Trees",
      body: "Follow the shrinking sizes (`80 → 56 → 39 → 27 → 19 → 13 STOP!`) inside `draw_branch(length)`:\n1. **Base case brake:** `if length < 15: return` stops tiny twigs.\n2. Grow forward `length`, turn `left(28)`, and call `draw_branch(length * 0.7)`.\n3. Turn `right(56)` (`28 + 28`) and call `draw_branch(length * 0.7)` again for the right side.\n4. Turn `left(28)` and walk `backward(length)` with `penup()` so colored leaves don't repaint the trunk!",
      code: `t.left(28)
draw_branch(length * 0.7)
t.right(56)
draw_branch(length * 0.7)
t.left(28)
t.penup()
t.backward(length)
t.pendown()`,
      tip: "Switch speed to **Fast** or **Instant** to watch the whole fractal canopy bloom!",
    },
  ],
  "u6-l3": [
    {
      title: "Combining a `while` Game Loop + Turtle Art",
      body: "First, run `while guess != secret:` to keep asking until the player guesses right. The moment the `while` loop ends, Python moves down to the Victory Turtle section and celebrates on canvas!",
      code: `while guess != secret:
    guess = int(input("Guess (1-10): "))
    if guess < secret:
        print("Too low!")
    elif guess > secret:
        print("Too high!")`,
      tip: "Click **▶ Run Code** and beat your own game—start at `5` to use binary search!",
    },
  ],
  "u6-l4": [
    {
      title: "Designing Your Own Master Crest",
      body: "This is your open creative capstone! Layer elements cleanly from back to front:\n1. Background (`turtle.bgcolor(...)`)\n2. Shield or flag frame (`begin_fill()` / `end_fill()`)\n3. Reusable `def` emblems (stars, polygons, corner dots)\n4. Bold title banner (`t.write(\"YOUR NAME\", align=\"center\")`)",
      code: `t.penup()
t.goto(0, -145)
t.write("MY CREST", align="center", font=("Arial", 20, "bold"))`,
      tip: "Once you love your crest, copy the code into the **🎨 Sandbox** and click **📸 Save PNG** to keep a picture of it!",
    },
  ],
  "u7-l1": [
    {
      title: "Building a 2D Grid With `//` and `%`",
      body: "Imagine 12 seats lined up in 3 rows of 4. Seat `i` (`0..11`) belongs at:\n• `row = i // 4` (whole quotient: `0, 1, or 2`)\n• `col = i % 4` (remainder: `0, 1, 2, or 3`)\nUse `total += 1` each time to count tiles cleanly!",
      code: `for i in range(12):
    row = i // 4
    col = i % 4
    total += 1
    t.goto(-110 + col * 70, 75 - row * 70)`,
      tip: "Want the ⭐ Bonus Star? Try `row % 2 == 0` for alternating row colors, OR `print(\"2^5 =\", 2 ** 5)` using `**`!",
    },
  ],
  "u7-l2": [
    {
      title: "Guarding Both Walls With `and` / `or`",
      body: "To keep your turtle inside the `[-130..130] × [-90..90]` safe zone, bounce back whenever it crosses ANY of the 4 walls using `or`:",
      code: `if x < -130 or x > 130 or y < -90 or y > 90:
    t.dot(10, "red")
    t.setheading(t.towards(0, 0))
    t.forward(45)`,
      tip: "Add an `else:` branch with `t.dot(8, \"teal\")` to see green/teal safe spots vs red wall bounces!",
    },
  ],
  "u7-l3": [
    {
      title: "Cleaning Text & Formatting f-Strings",
      body: "People type messy spaces or ALL CAPS in `input()`. Clean it up first, measure `len(clean)`, and format your greeting with an `f\"...\"` string!",
      code: `clean = raw.strip().lower()
width = max(160, len(clean) * 22 + 90)
t.write(f"Hello, {clean}!", align="center", font=("Arial", 20, "bold"))`,
      tip: "Check `clean[0]` (the very first letter!) with `if` to pick your favorite border color and fill your banner!",
    },
  ],
  "u7-l4": [
    {
      title: "Writing Answer Machines With `return`",
      body: "When a function uses **`return`**, it doesn't just print—it hands back an answer your main program can plug right into `t.right(...)` or `t.pencolor(...)`!",
      code: `def turn_angle(sides):
    return 360 / sides

angle = turn_angle(6)   # angle is 60.0!
print(f"Hexagon angle: {angle}")`,
      tip: "Define BOTH `turn_angle(sides)` and `ring_color(step)` returning values, then loop through `[3, 4, 6]`!",
    },
  ],
  "u8-l1": [
    {
      title: "The Color Train (`list`) Toolkit",
      body: "Keep all your colors in one variable:\n• `colors.append(\"blue\")` adds to the end of the list.\n• `len(colors)` counts how many items are inside.\n• `colors[0]` is first, `colors[-1]` is last, and `colors[i % len(colors)]` loops round and round forever without crashing!",
      code: `colors = ["red", "orange", "gold", "green"]
colors.append("dodgerblue")
t.pencolor(colors[i % len(colors)])`,
      tip: "Make sure you have 4+ distinct colors drawn across at least 12 lines!",
    },
  ],
  "u8-l2": [
    {
      title: "Unpacking `(x, y)` Tuples",
      body: "Each star in `stars = [(-150, 70), (-60, 110), ...]` is a locked `(x, y)` tuple pair. A Python `for` loop can unpack BOTH coordinates automatically in one step:",
      code: `for x, y in stars:
    t.goto(x, y)
    t.dot(14, "gold")`,
      tip: "Because `stars[0]` is already `(x, y)`, `t.goto(stars[0])` jumps straight to the first star!",
    },
  ],
  "u8-l3": [
    {
      title: "Safe Lookups With `if name in shapes:`",
      body: "If `\"dragon\"` isn't in your `shapes` dictionary, writing `shapes[\"dragon\"]` crashes with `KeyError`! Check `if name in shapes:` first so unknown spells print a warning cleanly:",
      code: `for name in orders:
    if name in shapes:
        sides = shapes[name]
        # draw polygon with sides!
    else:
        print("Unknown spell:", name)`,
      tip: "Remember to jump to a fresh x-position after each shape so your triangle, square, and hexagon don't stack on top of each other!",
    },
  ],
  "u8-l4": [
    {
      title: "Tracking Unique Corners With `set()`",
      body: "A `set()` ignores duplicate entries! Every time your turtle hops to `(x, y)`, figure out its quadrant (`\"Q1\"`..`\"Q4\"`), run `visited.add(zone)`, and stop the loop with `break` as soon as `len(visited) == 4`:",
      code: `if zone not in visited:
    t.dot(18, "gold")   # Brand-new discovery!
else:
    t.dot(10, "skyblue")
visited.add(zone)
if len(visited) == 4 or steps >= 80:
    break`,
      tip: "Keep a backup limit (`or steps >= 80`) alongside `len(visited) == 4`—just in case random hops skip axes!",
    },
  ],
  "u9-l1": [
    {
      title: "One Blueprint, Two Turtles!",
      body: "Calling `turtle.Turtle()` twice hatches two separate Turtle objects (`leo` and `maya`). Giving `leo.forward(80)` only moves `leo`—`maya` waits until you command `maya.forward(80)`!",
      code: `leo = turtle.Turtle()
maya = turtle.Turtle()
leo.pencolor("dodgerblue")
maya.pencolor("coral")`,
      tip: "Notice the matching colored halo rings on the canvas when 2+ turtles are active!",
    },
  ],
  "u9-l2": [
    {
      title: "Building `StampBot` Step-by-Step",
      body: "1. Inside `def __init__(self, pen, color, size):`, glue inputs onto `self` (`self.pen = pen`, `self.color = color`, `self.size = size`).\n2. Inside `def draw_square(self, x, y):`, use `self.pen`, `self.color`, and `self.size`!\n3. Make `bot1` and `bot2` with different colors & sizes.",
      code: `bot1 = StampBot(t, "crimson", 70)
bot2 = StampBot(t, "dodgerblue", 110)
bot1.draw_square(-140, 40)
bot2.draw_square(20, 60)`,
      tip: "Every method inside `class StampBot:` starts with `self` as its first parameter!",
    },
  ],
  "u9-l3": [
    {
      title: "Animating a `list` of Objects",
      body: "Store all your `Planet(...)` instances inside a `planets = [...]` list, then draw them all in just 2 lines!",
      code: `for p in planets:
    p.draw(t)`,
      tip: "Inside `draw(self, pen)`, use `pen.dot(self.radius * 2, self.color)` and `pen.write(self.name, align=\"center\")` for a labeled galaxy!",
    },
  ],
  "u9-l4": [
    {
      title: "Design Like a Python Architect",
      body: "Combine your entire toolkit in one creation:\n1. A custom `class` (`__init__` + `self` + method)\n2. A `list` or `dict` holding 3+ objects across 3+ quadrants\n3. A `for` loop + `if` check (for special colors or dot bursts)\n4. A signed title with `t.write(...)` or a 2nd turtle for the ⭐ Bonus Star!",
      code: `for fw in show:
    fw.launch(t)`,
      tip: "Click into **🎨 Free-Draw Sandbox** anytime after finishing to export your OOP art as a PNG!",
    },
  ],
};

export const CHEAT_SHEET_SECTIONS = [
  {
    id: "move",
    label: "🐢 Move & Turn",
    items: [
      { code: "t.forward(100)", desc: "Walk straight ahead 100 pixels (shortcut: `t.fd(100)`)" },
      { code: "t.backward(50)", desc: "Walk backwards 50 pixels (shortcut: `t.bk(50)`)" },
      { code: "t.right(90)", desc: "Turn clockwise by 90 degrees (shortcut: `t.rt(90)`)" },
      { code: "t.left(90)", desc: "Turn counter-clockwise by 90 degrees (shortcut: `t.lt(90)`)" },
      { code: "t.goto(x, y)", desc: "Move directly to coordinate `(x, y)` — center is `(0, 0)`" },
      { code: "t.setheading(90)", desc: "Point in an exact direction: `0`=East, `90`=North, `180`=West, `270`=South" },
      { code: "t.circle(60)", desc: "Draw a circle with radius 60 (negative radius curves right)" },
      { code: "t.home()", desc: "Return to `(0, 0)` facing East (`0°`)" },
    ],
  },
  {
    id: "pen",
    label: "🎨 Pen & Colors",
    colors: [
      { name: "red", hex: "#ef4444" },
      { name: "orange", hex: "#f97316" },
      { name: "gold", hex: "#f59e0b" },
      { name: "green", hex: "#22c55e" },
      { name: "teal", hex: "#14b8a6" },
      { name: "dodgerblue", hex: "#1e90ff" },
      { name: "blue", hex: "#3b82f6" },
      { name: "purple", hex: "#a855f7" },
      { name: "magenta", hex: "#d946ef" },
      { name: "coral", hex: "#fb7185" },
    ],
    items: [
      { code: 't.pencolor("blue")', desc: "Change marker color (always put quotes around color names!)" },
      { code: "t.pensize(5)", desc: "Make the line thicker or thinner (default is `3`)" },
      { code: "t.penup()", desc: "Lift the marker so moving leaves NO line" },
      { code: "t.pendown()", desc: "Put the marker back down to draw again" },
      { code: 't.fillcolor("gold")', desc: "Pick the paint color used inside `begin_fill()` / `end_fill()`" },
      { code: "t.begin_fill()\n# draw shape\nt.end_fill()", desc: "Fill the inside of a closed shape with your `fillcolor`" },
      { code: 't.dot(14, "red")', desc: "Stamp a filled circle dot right where the turtle stands" },
      { code: 't.write("Hi!", font=("Arial", 16, "bold"))', desc: "Write text on the canvas at the turtle's position" },
    ],
  },
  {
    id: "python",
    label: "🐍 Loops, Functions & Logic",
    items: [
      { code: "import turtle\nt = turtle.Turtle()", desc: "The 2 setup lines at the top of every turtle script" },
      { code: "for i in range(4):\n    t.forward(100)\n    t.right(90)", desc: "Repeat indented lines 4 times (`i` counts `0, 1, 2, 3`)" },
      { code: "def draw_polygon(sides, size):\n    for i in range(sides):\n        t.forward(size)\n        t.right(360 / sides)", desc: "Define your own reusable command with parameters (`def`)" },
      { code: "if i % 2 == 0:\n    t.pencolor(\"teal\")\nelse:\n    t.pencolor(\"gold\")", desc: "Make decisions (`if / elif / else`) and check even/odd remainders (`%`)" },
      { code: "while guess != secret:\n    guess = int(input(\"Guess: \"))", desc: "Repeat until a condition becomes False (`while` loop)" },
      { code: "import random\nx = random.randint(-150, 150)\nc = random.choice([\"red\", \"gold\"])", desc: "Pick random numbers or random items from a list" },
      { code: 'print("Angle:", 360 / 5)', desc: "Display words or math answers in the dark Console box" },
    ],
  },
  {
    id: "fixes",
    label: "🐛 Quick Bug Fixes",
    items: [
      { code: "for i in range(4):", desc: "Missing colon `:` — every `for`, `if`, `def`, or `class` line MUST end with `:`!" },
      { code: "    t.forward(100)", desc: "Indentation — lines inside a block need 4 spaces (press `Tab`)" },
      { code: 't.pencolor("red")', desc: "Quotes — color names and words always need `\"...\"` or `'...'`" },
      { code: "t.forward(100)", desc: "Don't forget `t.` in front AND parentheses `(...)` around the number!" },
      { code: 'if word in my_dict:', desc: "Guard dictionary lookups with `in` before reading `my_dict[word]` to avoid `KeyError`!" },
    ],
  },
  {
    id: "operators",
    label: "⚙️ Operators & Text",
    items: [
      { code: "row = i // 4\ncol = i % 4", desc: "`//` gives the whole-number quotient; `%` gives the division remainder" },
      { code: "power = 2 ** 5\ncount += 1", desc: "`**` calculates powers/exponents (`32`); `+=` adds onto a variable" },
      { code: "if x < -130 or x > 130:", desc: "Combine Yes/No checks using `and`, `or`, and `not` (`True` / `False`)" },
      { code: 'clean = text.strip().lower()\nprint(f"Hi {clean}! ({len(clean)})")', desc: "Tidy spaces/caps, count letters with `len()`, and plug into f-strings `f\"...\"`" },
      { code: "def turn_angle(sides):\n    return 360 / sides", desc: "`return` hands an answer back from a function so your code can reuse it" },
    ],
  },
  {
    id: "containers",
    label: "📦 Lists, Dicts & Sets",
    items: [
      { code: 'colors = ["red", "gold", "teal"]\ncolors.append("blue")\nt.pencolor(colors[i % len(colors)])', desc: "`list`: ordered items `[0]` first, `[-1]` last, `.append()` adds to end" },
      { code: 'stars = [(-100, 80), (120, -40)]\nfor x, y in stars:\n    t.goto(x, y)', desc: "`tuple`: locked `(x, y)` pairs that unpack cleanly in a `for` loop" },
      { code: 'shapes = {"triangle": 3, "square": 4}\nif name in shapes:\n    sides = shapes[name]', desc: "`dict`: spellbook lookup pairing keys (`\"square\"`) to values (`4`)" },
      { code: 'seen = set()\nseen.add("Q1")\nif len(seen) == 4:\n    break', desc: "`set`: unique bag (blocks duplicates!) paired with `while True:` + `break`" },
    ],
  },
  {
    id: "oop",
    label: "🤖 Classes & Objects",
    items: [
      { code: "leo = turtle.Turtle()\nmaya = turtle.Turtle()", desc: "Spawn multiple independent Turtle objects from one blueprint" },
      { code: "class StampBot:\n    def __init__(self, pen, color, size):\n        self.pen = pen\n        self.color = color\n        self.size = size\n\n    def draw(self, x, y):\n        self.pen.pencolor(self.color)", desc: "Define your own `class` blueprint with `__init__`, `self` attributes, and methods" },
      { code: "for bot in squad:\n    bot.draw(t)", desc: "Store custom objects in a `list` and run `.method()` on every one!" },
    ],
  },
];
