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
      tip: "Look at the dark **Console Output** box at the bottom-right after clicking Run to see your printed math!",
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
    label: "🐍 Loops & Math",
    items: [
      { code: "import turtle\nt = turtle.Turtle()", desc: "The 2 setup lines at the top of every turtle script" },
      { code: "for i in range(4):\n    t.forward(100)\n    t.right(90)", desc: "Repeat indented lines 4 times (`i` counts `0, 1, 2, 3`)" },
      { code: "sides = 6\nangle = 360 / sides", desc: "Store numbers in variables and calculate exterior turn angles" },
      { code: 'print("Angle:", angle)', desc: "Display words or math answers in the dark Console box" },
      { code: 'name = input("Your name? ")', desc: "Pop up a question box and store what the user types" },
      { code: "a + b, a - b, a * b, a / b", desc: "Add (`+`), subtract (`-`), multiply (`*`), divide (`/`)" },
    ],
  },
  {
    id: "fixes",
    label: "🐛 Quick Bug Fixes",
    items: [
      { code: "for i in range(4):", desc: "Missing colon `:` — every `for`, `if`, or `def` line MUST end with `:`!" },
      { code: "    t.forward(100)", desc: "Indentation — lines inside a `for` loop need 4 spaces (press `Tab`)" },
      { code: 't.pencolor("red")', desc: "Quotes — color names and words always need `\"...\"` or `'...'`" },
      { code: "t.forward(100)", desc: "Don't forget `t.` in front AND parentheses `(...)` around the number!" },
    ],
  },
];
