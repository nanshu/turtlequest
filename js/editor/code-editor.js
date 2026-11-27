export class CodeEditor {
  constructor(mountEl, { initialCode = "", onChange, onRunShortcut } = {}) {
    this.mountEl = mountEl;
    this.onChange = onChange || (() => {});
    this.onRunShortcut = onRunShortcut || (() => {});
    this._activeLine = null;
    this._errorLine = null;
    this._destroyed = false;

    this.view = null;
    this._setHighlightEffect = null;
    this._textarea = this._createFallbackTextarea(initialCode);
    this.mountEl.appendChild(this._textarea);

    this._upgradeToCodeMirror();
  }

  _createFallbackTextarea(initialCode) {
    const ta = document.createElement("textarea");
    ta.className = "editor-fallback-textarea";
    ta.value = initialCode;
    ta.spellcheck = false;
    ta.setAttribute("aria-label", "Python Code Editor");

    ta.addEventListener("input", () => {
      this._errorLine = null;
      this.onChange(ta.value);
    });

    ta.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        this.onRunShortcut();
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const val = ta.value;

        if (e.shiftKey || start !== end) {
          const lineStart = val.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
          const after = val.indexOf("\n", end);
          const lineEnd = after === -1 ? val.length : after;
          const block = val.slice(lineStart, lineEnd);
          const lines = block.split("\n");
          const updated = e.shiftKey
            ? lines.map((l) => l.replace(/^ {1,4}/, ""))
            : lines.map((l) => `    ${l}`);
          const replacement = updated.join("\n");
          ta.value = `${val.slice(0, lineStart)}${replacement}${val.slice(lineEnd)}`;
          ta.selectionStart = lineStart;
          ta.selectionEnd = lineStart + replacement.length;
        } else {
          ta.value = `${val.slice(0, start)}    ${val.slice(end)}`;
          ta.selectionStart = ta.selectionEnd = start + 4;
        }

        this._errorLine = null;
        this.onChange(ta.value);
      }
    });

    return ta;
  }

  async _upgradeToCodeMirror() {
    try {
      const [cmMod, stateMod, viewMod, cmdsMod, langMod, pyMod] = await Promise.all([
        import("codemirror"),
        import("@codemirror/state"),
        import("@codemirror/view"),
        import("@codemirror/commands"),
        import("@codemirror/language"),
        import("@codemirror/lang-python"),
      ]);

      if (this._destroyed) return;

      const { EditorView, basicSetup } = cmMod;
      const { EditorState, Prec, StateEffect, StateField } = stateMod;
      const { Decoration, keymap } = viewMod;
      const { indentWithTab } = cmdsMod;
      const { indentUnit } = langMod;
      const { python } = pyMod;

      const setHighlightEffect = StateEffect.define();
      this._setHighlightEffect = setHighlightEffect;

      const lineHighlightField = StateField.define({
        create() {
          return Decoration.none;
        },
        update(decorations, tr) {
          decorations = decorations.map(tr.changes);
          for (const effect of tr.effects) {
            if (effect.is(setHighlightEffect)) {
              const { activeLine, errorLine } = effect.value || {};
              const builder = [];
              if (activeLine && activeLine >= 1 && activeLine <= tr.state.doc.lines) {
                const line = tr.state.doc.line(activeLine);
                builder.push(
                  Decoration.line({ attributes: { class: "cm-active-trace-line" } }).range(line.from)
                );
              }
              if (
                errorLine &&
                errorLine >= 1 &&
                errorLine <= tr.state.doc.lines &&
                errorLine !== activeLine
              ) {
                const line = tr.state.doc.line(errorLine);
                builder.push(
                  Decoration.line({ attributes: { class: "cm-error-trace-line" } }).range(line.from)
                );
              }
              builder.sort((a, b) => a.from - b.from);
              return Decoration.set(builder);
            }
          }
          return decorations;
        },
        provide: (f) => EditorView.decorations.from(f),
      });

      const runKeymap = Prec.highest(
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              this.onRunShortcut();
              return true;
            },
          },
        ])
      );

      const wasFocused = document.activeElement === this._textarea;
      const currentCode = this._textarea ? this._textarea.value : "";

      const state = EditorState.create({
        doc: currentCode,
        extensions: [
          runKeymap,
          basicSetup,
          python(),
          indentUnit.of("    "),
          keymap.of([indentWithTab]),
          lineHighlightField,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              if (this._errorLine !== null) {
                this._errorLine = null;
                queueMicrotask(() => {
                  if (!this._destroyed) this._applyHighlights();
                });
              }
              this.onChange(update.state.doc.toString());
            }
          }),
        ],
      });

      if (this._textarea) {
        this._textarea.remove();
        this._textarea = null;
      }

      this.view = new EditorView({
        state,
        parent: this.mountEl,
      });

      if (this._activeLine || this._errorLine) {
        this._applyHighlights();
      }
      if (wasFocused) {
        this.view.focus();
      }
    } catch {
      // Offline / CDN unreachable: keep fallback <textarea> working seamlessly
    }
  }

  getCode() {
    if (this.view) return this.view.state.doc.toString();
    return this._textarea ? this._textarea.value : "";
  }

  setCode(text) {
    this.clearHighlights();
    if (this.view) {
      const current = this.view.state.doc.toString();
      if (current === text) return;
      this.view.dispatch({
        changes: { from: 0, to: current.length, insert: text },
      });
    } else if (this._textarea) {
      this._textarea.value = text;
    }
  }

  insertText(snippet) {
    if (!snippet) return;
    if (this.view) {
      const state = this.view.state;
      const sel = state.selection.main;
      const docText = state.doc.toString();
      const atEnd = sel.from === 0 && sel.to === 0 && docText.trim().length > 0;
      const pos = atEnd ? docText.length : sel.from;
      const prefix = pos > 0 && docText[pos - 1] !== "\n" ? "\n" : "";
      const toInsert = `${prefix}${snippet}\n`;
      this.view.dispatch({
        changes: { from: pos, to: atEnd ? pos : sel.to, insert: toInsert },
        selection: { anchor: pos + toInsert.length },
      });
      this.view.focus();
    } else if (this._textarea) {
      const ta = this._textarea;
      const val = ta.value;
      const pos = ta.selectionStart || val.length;
      const prefix = pos > 0 && val[pos - 1] !== "\n" ? "\n" : "";
      const toInsert = `${prefix}${snippet}\n`;
      ta.value = `${val.slice(0, pos)}${toInsert}${val.slice(ta.selectionEnd || pos)}`;
      ta.selectionStart = ta.selectionEnd = pos + toInsert.length;
      ta.focus();
      this.onChange(ta.value);
    }
  }

  setActiveLine(lineNum) {
    this._activeLine = lineNum || null;
    this._applyHighlights();
  }

  setErrorLine(lineNum) {
    this._errorLine = lineNum || null;
    this._applyHighlights();
  }

  clearHighlights() {
    this._activeLine = null;
    this._errorLine = null;
    this._applyHighlights();
  }

  _applyHighlights() {
    if (!this.view || !this._setHighlightEffect) return;
    this.view.dispatch({
      effects: this._setHighlightEffect.of({
        activeLine: this._activeLine,
        errorLine: this._errorLine,
      }),
    });
  }

  focus() {
    if (this.view) this.view.focus();
    else if (this._textarea) this._textarea.focus();
  }

  destroy() {
    this._destroyed = true;
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
    if (this._textarea) {
      this._textarea.remove();
      this._textarea = null;
    }
  }
}
