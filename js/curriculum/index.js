import { CHEAT_SHEET_SECTIONS, LESSON_TUTORIALS, UNIT_TUTORIAL_NODES } from "./tutorials.js";
import { UNIT_1, UNIT_1_NODES } from "./unit1-basics.js";
import { UNIT_2, UNIT_2_NODES } from "./unit2-loops.js";
import { UNIT_3, UNIT_3_NODES } from "./unit3-vars-math.js";

function attachTutorials(nodes) {
  return nodes.map((node) =>
    node.type === "code" && LESSON_TUTORIALS[node.id]
      ? { ...node, tutorial: LESSON_TUTORIALS[node.id] }
      : node
  );
}

export const UNITS = [UNIT_1, UNIT_2, UNIT_3];

export const ALL_NODES = [
  UNIT_TUTORIAL_NODES.unit1,
  ...attachTutorials(UNIT_1_NODES),
  UNIT_TUTORIAL_NODES.unit2,
  ...attachTutorials(UNIT_2_NODES),
  UNIT_TUTORIAL_NODES.unit3,
  ...attachTutorials(UNIT_3_NODES),
];

export const ORDERED_NODE_IDS = ALL_NODES.map((n) => n.id);

export { CHEAT_SHEET_SECTIONS };

export function getNodeById(nodeId) {
  return ALL_NODES.find((n) => n.id === nodeId) || null;
}

export function getUnitById(unitId) {
  return UNITS.find((u) => u.id === unitId) || null;
}

export function getNextNodeId(currentId) {
  const idx = ORDERED_NODE_IDS.indexOf(currentId);
  if (idx === -1 || idx + 1 >= ORDERED_NODE_IDS.length) return null;
  return ORDERED_NODE_IDS[idx + 1];
}

export const SANDBOX_TEMPLATES = [
  {
    id: "blank",
    name: "Blank Canvas",
    code: `import turtle

t = turtle.Turtle()
t.pencolor("dodgerblue")
t.pensize(3)

# Draw anything you want!
for i in range(4):
    t.forward(100)
    t.right(90)
`,
  },
  {
    id: "star",
    name: "5-Point Star (144°)",
    code: `import turtle

t = turtle.Turtle()
t.pencolor("orange")
t.fillcolor("gold")
t.pensize(3)

t.penup()
t.goto(-75, 25)
t.pendown()

t.begin_fill()
for i in range(5):
    t.forward(150)
    t.right(144)
t.end_fill()
`,
  },
  {
    id: "spiral",
    name: "Colorful Twist Spiral",
    code: `import turtle

t = turtle.Turtle()
t.pensize(3)
colors = ["red", "orange", "gold", "green", "dodgerblue", "purple"]

for i in range(42):
    t.pencolor(colors[i % len(colors)])
    t.forward(6 + i * 4)
    t.right(61)
`,
  },
  {
    id: "coords",
    name: "Coordinate Flower",
    code: `import turtle

t = turtle.Turtle()
t.pensize(2)

for angle in range(0, 360, 30):
    t.setheading(angle)
    t.pencolor("purple")
    t.circle(60)
`,
  },
];
