# TurtleQuest 🐢

A local-first, zero-build, Duolingo-style Python + Turtle learning web app built for 5th-grade math and logic learners.

## Features
- **Real In-Browser Python:** Runs client-side via [Pyodide](https://pyodide.org/) inside a Web Worker with `print()` streaming, interactive `input()` modals, and infinite-loop protection.
- **Custom Turtle Graphics Engine:** Renders onto a HiDPI HTML5 `<canvas>` with `Step`, `Slow`, `Normal`, `Fast`, and `Instant` playback speeds, line-by-line execution tracing, coordinate grid toggle, and ghost blueprint overlays.
- **CodeMirror 6 Editor:** Python syntax highlighting, 4-space smart indentation, `Cmd/Ctrl + Enter` run shortcut, and an offline `<textarea>` fallback.
- **Beginner-Friendly Tutorials & Cheat Sheet:** Step-by-step zero-prerequisite visual tutorials at the start of every unit (with interactive tap-to-code canvas, 360° polygon slider, clickable 4-quadrant grid, star-polygon explorer, modulo/random lab, and recursive fractal tree explorer), **Learn First** cards inside every coding mission, and a one-click **Python & Turtle Cheat Sheet** with snippet insertion.
- **Complete 6-Unit Math-Smart Curriculum (36 Nodes):** 6 interactive unit tutorials + 24 hands-on coding missions + 6 Quick-Check quizzes covering angles, loops, variables & ratios, coordinates, `def` functions & 144° stars, `if/elif/else`, `%` modulo, `input()`, `random`, analog clock geometry, recursive fractal trees, a playable Secret Number game, and a creative Crest Capstone.
- **Free-Draw Sandbox & Gamification:** Save/load creations in your local gallery, export PNG artwork, earn XP, Shell Gems, streaks (with a 2-day weekend freeze), unlockable turtle avatars, and JSON progress backup/restore.

## Quick Start

```bash
python3 serve.py
```

Then open **http://127.0.0.1:8000** in your browser.

*(Optional port argument: `python3 serve.py 8080`. Plain `python3 -m http.server` also works in fallback mode, while `serve.py` enables Cross-Origin Isolation headers for instant loop interrupts and synchronous `input()` prompts.)*
