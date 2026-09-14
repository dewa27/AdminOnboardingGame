# Timedoor Academy — Admin Onboarding Simulator

A 2D top-down simulation for onboarding new branch Admins at Timedoor Academy.
Episode 1 has the player walk around the branch and check off preparation
items; Episode 2 puts them at a laptop responding to four WhatsApp-style
customer chats simultaneously.

> See `handover-admin-onboarding-game.md` for the full design brief, scope,
> and rationale for the stack choices.

## Stack

- **Phaser 3** — renders the top-down room (Episode 1) and the laptop
  backdrop (Episode 2). All sprites are placeholder colored boxes generated
  procedurally in `BootScene.js`; they will be replaced with pixel art later.
- **DOM overlays** — dialogue, checklist, WhatsApp-style chat, and
  summary screens are plain HTML/CSS that sit on top of the Phaser canvas.
  Per the handover brief (§2), this layer is reused across future task
  types and is intentionally kept separate from the canvas.

## Layout

```
src/
├── main.js               entry: boots Phaser + overlay
├── config.js             Phaser game config
├── state/gameState.js    shared state singleton
├── data/
│   ├── customers.js      Episode 2 dialogue trees
│   ├── ep1Script.js      Episode 1 step script
│   └── stations.js       room layout
├── scenes/
│   ├── BootScene.js      generates placeholder textures
│   ├── Episode1Scene.js  top-down branch
│   └── Episode2Scene.js  laptop backdrop
├── systems/
│   └── player.js         keyboard movement (WASD + arrows)
└── ui/
    ├── overlay.js        show/hide controller
    ├── startScreen.js
    ├── dialogue.js
    ├── checklist.js
    ├── chat.js           Episode 2 WA-style multi-chat
    ├── summary.js
    └── styles.css
```

## Run locally

```
npm install
npm run dev
```

Vite will open the game at <http://localhost:5173>.

## Build for hosting

```
npm run build
```

Static output goes to `dist/` — drop it on any static host (Netlify, Vercel,
S3, GitHub Pages, or just `file://`).

## Controls

- **Episode 1**: `WASD` / arrow keys to move, `E` or `Space` near a station
  to start its checklist.
- **Episode 2**: click on a chat tab to switch, click a reply option or
  slot button to act.

## What's intentionally not built yet

- **Real sprite art** — every actor is a colored box (see BootScene).
- **Episode 3** — the trial-day episode that reads `commitment` from
  Episode 2. Deferred until Episodes 1–2 are considered final.
- **Persistence** — `window.gameState` lives only as long as the tab does.
  Reloading restarts the game. Tracked in handover doc §8.
- **Overall scoring** — recap is per-episode, no combined score yet.

## Reusability notes

- Task steps in `data/ep1Script.js` use a small typed shape
  (`dialogue | navigate | checklist | summary`). The same interpreter is
  designed to also drive BRP monitoring modules (handover §3).
- Customer dialogue trees (`data/customers.js`) are pure data — Episode 3
  can read `commitment` from the outcome of Episode 2 without touching the
  chat UI.