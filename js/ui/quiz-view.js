import { escapeHtml, formatInlineText } from "./format.js";
import { soundFX } from "./sound.js";

export function renderQuizView(container, node, { onBack, onComplete }) {
  const queue = node.questions.map((q, idx) => ({ ...q, origIndex: idx }));
  let currentIdx = 0;
  let selectedOption = null;
  let answered = false;
  let firstPassCorrect = 0;
  const totalUnique = node.questions.length;

  function render() {
    if (currentIdx >= queue.length) {
      const perfect = firstPassCorrect === totalUnique;
      onComplete({
        xpReward: node.xp || 20,
        bonusReward: perfect ? 5 : 0,
        bonusEarned: perfect,
        bonusFeedback: perfect ? `Perfect ${totalUnique}/${totalUnique} on the first try!` : "",
        feedback: `You nailed ${firstPassCorrect} / ${totalUnique} on the first try!`,
      });
      return;
    }

    const q = queue[currentIdx];
    const pct = Math.round((currentIdx / queue.length) * 100);

    const optionsHtml = q.options
      .map((opt, idx) => {
        let cls = "quiz-option-btn";
        if (answered) {
          if (idx === q.correctIndex) cls += " correct";
          else if (idx === selectedOption) cls += " wrong";
        } else if (idx === selectedOption) {
          cls += " selected";
        }
        return `
          <button class="${cls}" data-opt="${idx}" type="button" ${answered ? "disabled" : ""}>
            ${formatInlineText(opt)}
          </button>
        `;
      })
      .join("");

    const isCorrect = answered && selectedOption === q.correctIndex;

    container.innerHTML = `
      <div class="card quiz-container">
        <div class="quiz-progress-row">
          <button id="quiz-back-btn" class="btn btn-ghost btn-sm" type="button">← Path</button>
          <div class="quiz-progress-track">
            <div class="quiz-progress-fill" style="width:${pct}%"></div>
          </div>
          <span style="font-weight:900; font-size:0.85rem; color:var(--text-muted);">
            ${currentIdx + 1} / ${queue.length}
          </span>
        </div>

        <div class="xp-badge" style="display:inline-block; margin-bottom:10px;">⚡ ${formatInlineText(node.title)}</div>
        <h2 style="margin:0 0 10px; font-size:1.25rem;">${formatInlineText(q.prompt)}</h2>

        ${q.code ? `<pre class="quiz-code-block"><code>${escapeHtml(q.code)}</code></pre>` : ""}

        <div class="quiz-options">${optionsHtml}</div>

        ${
          answered
            ? `
            <div class="mission-feedback ${isCorrect ? "pass" : "retry"}" style="margin-top:16px;">
              <div>${isCorrect ? "✅ Nice thinking!" : "💡 Not quite—we'll loop back to this one!"}</div>
              <div style="font-weight:600; margin-top:4px;">${formatInlineText(q.explanation)}</div>
            </div>
            <div style="display:flex; justify-content:flex-end; margin-top:14px;">
              <button id="quiz-next-btn" class="btn ${isCorrect ? "btn-green" : "btn-blue"}" type="button">
                ${currentIdx + 1 >= queue.length ? "Finish Check! 🎉" : "Continue ➜"}
              </button>
            </div>
          `
            : `
            <div style="display:flex; justify-content:flex-end; margin-top:16px;">
              <button id="quiz-check-btn" class="btn btn-green" type="button" ${
                selectedOption === null ? "disabled" : ""
              }>Check Answer</button>
            </div>
          `
        }
      </div>
    `;

    container.querySelector("#quiz-back-btn").addEventListener("click", onBack);

    if (!answered) {
      container.querySelectorAll(".quiz-option-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          soundFX.playClick();
          selectedOption = Number(btn.dataset.opt);
          render();
        });
      });

      container.querySelector("#quiz-check-btn").addEventListener("click", () => {
        if (selectedOption === null) return;
        answered = true;
        if (selectedOption === q.correctIndex) {
          soundFX.playCorrect();
          if (currentIdx < totalUnique) firstPassCorrect += 1;
        } else {
          soundFX.playError();
          // Re-queue missed question for mastery
          queue.push({ ...q, isRetry: true });
        }
        render();
      });
    } else {
      const nextBtn = container.querySelector("#quiz-next-btn");
      let finishing = false;
      nextBtn.addEventListener("click", async () => {
        if (finishing) return;
        soundFX.playClick();
        if (currentIdx + 1 >= queue.length) {
          finishing = true;
          const originalText = nextBtn.textContent;
          nextBtn.disabled = true;
          nextBtn.textContent = "Saving...";
          const perfect = firstPassCorrect === totalUnique;
          try {
            const ok = await onComplete({
              xpReward: node.xp || 20,
              bonusReward: perfect ? 5 : 0,
              bonusEarned: perfect,
              bonusFeedback: perfect ? `Perfect ${totalUnique}/${totalUnique} on the first try!` : "",
              feedback: `You nailed ${firstPassCorrect} / ${totalUnique} on the first try!`,
            });
            if (ok === false && nextBtn.isConnected) {
              finishing = false;
              nextBtn.disabled = false;
              nextBtn.textContent = originalText;
            }
          } catch {
            if (nextBtn.isConnected) {
              finishing = false;
              nextBtn.disabled = false;
              nextBtn.textContent = originalText;
            }
          }
          return;
        }
        currentIdx += 1;
        selectedOption = null;
        answered = false;
        render();
      });
    }
  }

  render();
}
