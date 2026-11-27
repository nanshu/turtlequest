import { ALL_NODES, ORDERED_NODE_IDS, UNITS } from "../curriculum/index.js";
import { isLessonUnlocked, TURTLE_SKINS } from "../state/progress.js";
import { escapeHtml } from "./format.js";

const WINDING_OFFSETS = [0, 1, 2, 1, 0, 5, 6, 5];

export function renderSkillMap(container, state, { onOpenNode, onOpenSandbox }) {
  const completedCount = Object.keys(state.completedLessons || {}).length;
  const totalCount = ALL_NODES.length;
  const currentSkin = TURTLE_SKINS.find((s) => s.id === state.activeSkin) || TURTLE_SKINS[0];

  // First unlocked node that isn't completed yet
  const nextNodeId =
    ORDERED_NODE_IDS.find(
      (id) => isLessonUnlocked(state, id, ORDERED_NODE_IDS) && !state.completedLessons?.[id]?.passed
    ) || ORDERED_NODE_IDS[ORDERED_NODE_IDS.length - 1];

  const unitsHtml = UNITS.map((unit) => {
    const unitNodes = ALL_NODES.filter((n) => n.unitId === unit.id);
    const doneInUnit = unitNodes.filter((n) => state.completedLessons?.[n.id]?.passed).length;

    const nodesHtml = unitNodes
      .map((node, idx) => {
        const unlocked = isLessonUnlocked(state, node.id, ORDERED_NODE_IDS);
        const comp = state.completedLessons?.[node.id];
        const passed = Boolean(comp?.passed);
        const isCurrent = node.id === nextNodeId && unlocked && !passed;
        const offsetClass = `offset-${WINDING_OFFSETS[idx % WINDING_OFFSETS.length]}`;

        let stateClass = `unit-${unit.theme}`;
        if (!unlocked) stateClass = "locked";
        else if (passed) stateClass = "completed";
        if (isCurrent) stateClass += " current";

        const starBadge = passed
          ? `<span class="node-stars">${comp.bonus ? "⭐⭐" : "⭐"}</span>`
          : "";

        return `
          <div class="path-node-row ${offsetClass}">
            <div class="node-circle-wrap">
              ${isCurrent ? `<div class="node-start-tag">Start!</div>` : ""}
              <button
                class="node-btn ${stateClass}"
                data-node-id="${node.id}"
                type="button"
                ${unlocked ? "" : "disabled"}
                title="${escapeHtml(node.title)}"
              >
                <span>${unlocked ? node.icon : "🔒"}</span>
                ${starBadge}
              </button>
            </div>
            <div class="node-label">
              <div class="node-title">${escapeHtml(node.title)}</div>
              <div class="node-subtitle">${escapeHtml(node.subtitle)}</div>
            </div>
          </div>
        `;
      })
      .join("");

    return `
      <section class="unit-section">
        <div class="unit-banner theme-${unit.theme}">
          <div>
            <div class="unit-eyebrow">Unit ${unit.number}</div>
            <h2 class="unit-title">${escapeHtml(unit.title)}</h2>
            <p class="unit-desc">${escapeHtml(unit.description)}</p>
          </div>
          <div class="unit-progress-pill">${doneInUnit} / ${unitNodes.length} Done</div>
        </div>
        <div class="path-nodes">${nodesHtml}</div>
      </section>
    `;
  }).join("");

  container.innerHTML = `
    <div class="skill-map-container">
      <div class="card hero-welcome">
        <div>
          <h1>Ready to code, Explorer? ${currentSkin.emoji}</h1>
          <p>
            <strong>${completedCount} of ${totalCount}</strong> missions cleared! Use real Python + math to command your turtle, earn Shell Gems, and unlock new avatars.
          </p>
        </div>
        <button id="hero-sandbox-btn" class="btn btn-blue" type="button">🎨 Free-Draw Sandbox</button>
      </div>

      ${unitsHtml}

      <div class="coming-soon-banner">
        <h3>🚀 Coming Next: Units 4–6 (Functions, Star Math &amp; Mini-Games)</h3>
        <p style="margin:0;">
          Finish Units 1–3 and experiment with 5-point stars, spirals, and interactive drawings in the Free-Draw Sandbox!
        </p>
      </div>
    </div>
  `;

  container.querySelector("#hero-sandbox-btn").addEventListener("click", onOpenSandbox);
  container.querySelectorAll(".node-btn:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", () => {
      onOpenNode(btn.dataset.nodeId);
    });
  });
}
