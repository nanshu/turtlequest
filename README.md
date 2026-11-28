# TurtleQuest 🐢

A local-first, zero-build, Duolingo-style Python + Turtle learning web app built for 5th-grade math and logic learners—with optional multi-user accounts backed by **Cloudflare Workers + D1 (SQLite)**.

## Features
- **Real In-Browser Python:** Runs client-side via [Pyodide](https://pyodide.org/) inside a Web Worker with `print()` streaming, interactive `input()` modals, and infinite-loop protection.
- **Custom Turtle Graphics Engine:** Renders onto a HiDPI HTML5 `<canvas>` with `Step`, `Slow`, `Normal`, `Fast`, and `Instant` playback speeds, line-by-line execution tracing, coordinate grid toggle, and ghost blueprint overlays.
- **CodeMirror 6 Editor:** Python syntax highlighting, 4-space smart indentation, `Cmd/Ctrl + Enter` run shortcut, and an offline `<textarea>` fallback.
- **Beginner-Friendly Tutorials & Cheat Sheet:** Step-by-step zero-prerequisite visual tutorials at the start of every unit (with interactive tap-to-code canvas, 360° polygon slider, clickable 4-quadrant grid, star-polygon explorer, modulo/random lab, and recursive fractal tree explorer), **Learn First** cards inside every coding mission, and a one-click **Python & Turtle Cheat Sheet** with snippet insertion.
- **Complete 6-Unit Math-Smart Curriculum (36 Nodes):** 6 interactive unit tutorials + 24 hands-on coding missions + 6 Quick-Check quizzes covering angles, loops, variables & ratios, coordinates, `def` functions & 144° stars, `if/elif/else`, `%` modulo, `input()`, `random`, analog clock geometry, recursive fractal trees, a playable Secret Number game, and a creative Crest Capstone.
- **Multi-User Accounts + Free-Draw Sandbox:** Kid-friendly Username + PIN accounts stored in Cloudflare D1 (or Guest/local-only fallback when hosted statically), server-validated XP, Shell Gems, streaks (with a 2-day weekend freeze), unlockable turtle avatars, Sandbox gallery, PNG export, and JSON progress backup/restore.

---

## Option 1: Multi-User Cloud Setup (Cloudflare Workers + D1)

This mode gives you **multi-user accounts with a real D1 SQLite database**, zero 7-day pausing, and production `COOP/COEP` (`SharedArrayBuffer`) headers via [`_headers`](./_headers).

### Local Development
```bash
npm install
npm run db:migrate:local
npm run dev
```
Then open **http://127.0.0.1:8787** in your browser.

### Optional Family / Class Invite Code
To restrict who can register new accounts, set a `SIGNUP_CODE` secret:
```bash
npx wrangler secret put SIGNUP_CODE
```
*(In local dev, you can add a gitignored `.dev.vars` file with `SIGNUP_CODE=your-code`.)*

### Deploy Live to Cloudflare Workers (Free Tier)
```bash
npx wrangler login
npx wrangler d1 create turtlequest-db
# Copy the printed database_id into wrangler.jsonc
npm run db:migrate:remote
npm run deploy
```

### Reset a Kid's Forgotten PIN
```bash
# Local D1:
npm run reset-pin -- maya 5678

# Production D1:
npm run reset-pin -- --remote maya 5678
```

---

## Option 2: Simple Local / Static Mode (No Database)

```bash
python3 serve.py
```
Then open **http://127.0.0.1:8000** in your browser. Static hosting (such as `serve.py` or GitHub Pages) automatically runs in Guest/Local-Only mode using browser `localStorage`.

---

## Automated Tests

```bash
npm test
```
