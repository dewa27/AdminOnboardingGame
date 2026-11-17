# Timedoor Academy: Admin Onboarding Simulator — Game Concept

Status: living document. Last updated 2026-10-24.
Companion docs: `handover-admin-onboarding-game (1).md` (original brief, Episode 2 rules), `docs/art-direction-brief.md`, `docs/asset-manifest.json`.

---

## 1. What this game is

A pixel-art **hybrid game** that trains new branch Admins at Timedoor Academy through their first day of work. It is part walking-around sim, part hands-on task game, part story/dialogue game:

| Layer | What the player does | Built in |
|---|---|---|
| **World** | Walks around the branch, talks to NPCs, walks to the next task | Phaser scene (tilemap room) |
| **Task close-ups** | Presses **E** at a station; the view switches to a close-up of that table/shelf/room and the player does the task with their hands (drag, test, open, report) | Phaser scene per task |
| **Dialogue** | The manager and other characters speak when the player interacts or finishes tasks (will grow into branching dialogue) | HTML overlay on top of the canvas |
| **Chat sim** (Episode 2) | Answers four WhatsApp-style customer chats at once, with patience and scheduling | HTML overlay |

**Goal of the product:** teach SOP understanding and decision-making by scenarios close to real work, not by reading material.

**Design thesis:** a real admin does not tick boxes. They look at the real situation, compare it with the standard, and decide: *fine, fix it myself, or escalate to Ops*. Every task in Episode 1 is built around exactly that decision, and the player's **hands** (dragging, counting, testing) are how they discover the real situation.

## 2. Design pillars

1. **Do it, don't click it.** Tasks are physical: count by moving things, test by using things.
2. **Find, don't be told.** The game never labels the problem. The player compares a standard (sticky note, sheet) with what is on the table.
3. **Three honest outcomes.** Every issue ends as *fine*, *fix it yourself*, or *report to Ops*. Wrong choices have visible, explained consequences.
4. **Never the same twice.** Numbers, broken items and stock are generated per run, so answers can't be memorised.
5. **Learn from the result.** Feedback is withheld until the player finishes, then every decision is explained, so it can't be used to brute-force the task.
6. **Reusable.** Task types are data-driven, so the same engine can later host BRP-monitoring tasks.

## 3. Structure

```
Name screen -> Start menu -> Episode 1 (world + 3 close-up tasks) -> Summary
                          -> Episode 2 (laptop + 4 customer chats)  -> Summary
                          -> Episode 3 (trial day)  [planned]
```

### Episode 1 — Persiapan Cabang (branch preparation)

Day setup (generated per run): class starts at 15.00 today, **N students (8-12) + 1 mentor**.

Flow:
1. Manager dialogue: explains the business, then the rule of the day: *inspect first, compare with the standard, decide: fix yourself or report to Ops. Time is limited.*
2. Walk to the reception desk, **Paket HQ** -> E -> unpacking close-up (Task 1).
3. Walk to **Ruang Kelas** -> E -> seating-puzzle close-up (Task 2).
5. After each task: result screen (explains each decision) then a manager reaction based on the score.
6. Episode summary: score per task, reports sent to Ops with urgency.

Information carries between stations: the roster read at the stationery desk (N + 1 mentor) is needed again in the classroom. It is saved to a **Notes** list so the player never has to memorise it.

### Episode 2 — Balas Chat Customer (implemented, unchanged)

Four customers (Ibu Sarah, Pak Doni, Kak Rani, Bu Wati) chat at once. Each has a branching tree with replies scored 1-4, answer order is shuffled, and patience drains on the other chats whenever you reply to one. A chat ends in *trial*, *fail_soft* or *fail_hard*. Trial slots (Mon 16.00 cap 1, Wed 16.00 cap 1, Sat 10.00 cap 2) must be matched to each customer's availability. Commitment (`high`/`low`, threshold 3.6 average) is stored for Episode 3. Full rules: see the handover doc, sections 4-7.

### Episode 3 — Hari H Trial (planned)

Trial day. Reads each customer's `registered`, `commitment` and `slot` from Episode 2 and decides who actually shows up. Not designed yet; see section 9.

## 4. The close-up task mechanic (the core of Episode 1)

> **Not every task looks the same.** A close-up is a *scene switch plus a hands-on mechanic that fits that task*, not one fixed screen. Task 1 is "unpack, sort, reconcile against a list"; the reserved stationery desk is "count by placing into a case"; Task 2 (the classroom) is a seating-and-power puzzle (section 6). What they share is the frame: E to enter, do it with your hands, "Selesai", explained result, manager reaction, and the decision *fine / fix / report*. Some tasks only have *fine* and *report* outcomes (Task 1); others also have *fix*.

### 4.1 Scene flow

```
Room (Episode1Scene)  --E near station-->  pause room, launch DeskCloseUpScene (fade in)
Close-up: play the task -> "Selesai" -> result screen (explains every decision)
        -> fade out -> stop close-up, resume room -> manager reacts -> next step
```

The room scene is paused (not restarted), so the player's position and the story step are preserved.

### 4.2 The player's verbs inside a close-up

| Verb | Example (Task 1) | Meaning for the SOP |
|---|---|---|
| **Drag** | Pen -> pen case; paper pack -> tray | Counting made physical |
| **Test** | Drag a pen onto scrap paper | Looks can lie; verify before you count |
| **Open** | Click the stock drawer | Checking whether you can cover a gap yourself |
| **Take** | Drag spares from the drawer to the case | = *fix it yourself* |
| **Report** | "Lapor ke Ops": item + reason + urgency | = *escalate* |
| **Finish** | "Selesai" | Hand in; the game judges the table, not clicks |

### 4.3 How the decision is read (no explicit "I choose X" buttons)

What is **physically on the table** decides the action:

- report filed for the item -> `report` (with reason + urgency)
- otherwise took spares from the drawer -> `fix`
- otherwise -> `ignore` (it was fine)
- requirement not met and nothing reported -> `incomplete` (counts as missed)

### 4.4 Scoring (per object, weight `w`)

| Truth | Player did | Points |
|---|---|---|
| fine | left it | 2w |
| fine | fixed needlessly | 1w |
| fine | reported | 0 (false alarm) |
| fixable | fixed | 2w |
| fixable | reported | 1w (Ops burdened needlessly) |
| fixable | ignored / short | 0 |
| must report | reported | 2w + 1w right reason + 1w right urgency |
| must report | tried to fix | 0 |
| any | requirement not met, no report | 0 |

Result screen notes each outcome in plain language. Manager's reaction picks the worst mistake and names it.

### 4.5 Data model

Each task is generated by `src/data/ep1Tasks.js` from the day (`students`, `mentors`, `classStart`). A task carries:

```
{ id, mode: 'closeup' | 'inspect', title,
  closeup: { ...what lies on the table / in the drawer },
  objects: [ { id, name, weight, truth: { correct, reasons, urgent }, msg: {...} } ] }
```

`rollStates()` guarantees every run has at least one real problem and at least one thing that is fine. A stress test checks 5000 random runs, including **physical feasibility** (a "fixable" problem really can be fixed from the drawer; a "must report" one really can't).

## 5. Task 1 — Paket HQ (implemented)

**Story:** HQ has sent a delivery package to the branch. The admin must unpack it and make sure what arrived matches the packing list (*surat jalan*), because the branch's stock is only as good as what was really received.

**What is in the package:**

| Group | Details |
|---|---|
| **Class Kit** (1 kit = pen + bag + T-shirt + stickers) | Kits for a new batch (6-8 kits) |
| Pen | One general type |
| Bag | Two types: **black** tote and **green** drawstring bag (art follows the real merch, `src/assets/bag1.png`, `bag2.png`) |
| T-shirt | Mostly black or white; the **chest design differs per student level** (L1 bear, L2 robot, L3 shape cluster, all from the Timedoor artwork) |
| Stickers | One sticker sheet per kit |
| Other items | Robots, laptops (listed separately from the kits) |

**Close-up:** a table with the packing list on the left, a taped cardboard box in the middle, and nine sorting bins along the bottom (Pulpen, Tas hitam, Tas hijau, Kaos L1/L2/L3, Stiker, Robot, Laptop), each with a live counter.

**How it plays:**
1. Click the box: it opens and the contents **spill out scattered** over the table.
2. **Sort:** drag one item to its bin, or draw a selection box over many and drag the whole pile onto a bin. Items that belong go in; the rest bounce back. (Sorting is the physical part; it is intentionally low-friction.)
3. **Reconcile:** read each bin's counter against the packing list (including the split by bag colour and shirt level).
4. **Report** with "Lapor ke HQ" for anything that doesn't match: item + reason + urgency.
5. **Selesai:** the game scores the reports and whether everything was actually sorted.

**What can be wrong (generated per run, at least one real problem every time):**

| Discrepancy | Example | Correct action |
|---|---|---|
| **Kurang** (short) | 8 pens listed, 7 received | report *Kurang* |
| **Berlebih** (extra) | 2 extra pens | report *Berlebih* |
| **Salah kirim** (wrong variant) | right bag total but 5 black / 3 green instead of 4 / 4; or an L1 and L2 shirt swapped | report *Salah kirim* |
| **Rusak** (damaged) | one robot with a bent antenna and cracked head; a laptop with a cracked screen (visible when you sort it) | report *Rusak* |
| **Staged shipment** (trap) | list says "ROBOT x 3 (kirim terpisah)", none arrived | **no report**: reporting is a false alarm |

**Urgency:** class-kit items are needed for today's class, so they are urgent; robots and laptops are not.

**Outcomes:** *fine* or *report* (no *fix* in this task: the branch cannot conjure stock HQ didn't send).

**Why this teaches the SOP:** the admin must check the delivery against the document before accepting it, notice variants and damage (not only totals), and avoid noise to HQ by not reporting what is expected.

**Roster:** the packing list header says "Kelas hari ini: N siswa"; this is written to the Notes list and used again in the classroom (Task 2).

**Implemented in:** `src/scenes/PackageUnpackScene.js`, `src/data/ep1Tasks.js` (`packageTask`), `src/ui/reportForm.js`. Assets: `cu_pk_*` in the close-up atlas.

### 5b. Reserved: Meja Stationeries count-by-placing (built, currently unused)

The earlier Task 1 prototype is kept in the code (`src/scenes/DeskCloseUpScene.js`, `ep1Tasks.js` `stationery`) for a possible later station: drag pens into a case, ink-test them on scrap paper, add up paper packs, take spares from a stock drawer (fix) or report. It scores with the same engine and already has three outcomes (fine / fix / report).

## 6. Task 2 — Ruang Kelas (implemented): the seating puzzle

*(The shelf/merch task that used to be Task 2 was removed.)*

**Story:** class starts today. The admin must make the classroom ready: a seat with power for every student, and a clear way to the door.

**Close-up:** a top-down grid of the room. Two **islands**, each made of two desks pushed together face to face (a 2x2 block). Four students sit at an island: **two on the north side, two on the south side**, so the room has exactly 8 student seats. The mentor uses the teacher's desk and is not seated here. A storeroom panel on the right holds the spare chairs; three wall outlets (left, right, top) and a door on the bottom wall.

**Rules (all in `src/systems/seatingRules.js`):**
- A seat = a chair directly above or below an island. The sides of the block are not seats.
- Power: each outlet reaches seats within 6 cells and its power strip serves at most **3** seats. Seats are matched to outlets automatically (with bumping), and cables are drawn.
- Aisle: the door cells must be free and every chair must connect to the door through free cells.
- The headcount comes from Task 1's roster note: **5-8 students** (the player has to read the Notes, the scene never states the number).

**What the player does (drag and click):**
- Drag chairs from the storeroom to the seat positions around the islands (drag back to remove).
- **Test chairs** by clicking them: some storeroom chairs are wobbly and look identical; wobbly chairs do not count.
- **Test outlets** by clicking them: "Tes colok" reveals a working, dead or scorched outlet. The other choice, "Buka cover", is the forbidden one: electrical faults are reported, never opened (it scores 0 and the result screen explains why).
- **Move the delivery boxes** that may be blocking the door.
- File "Lapor ke Ops" (reason + urgency) when the problem can't be solved at the table.

**What can be wrong (generated per run):**

| Problem | Correct action |
|---|---|
| Not enough sturdy chairs for the class | seat as many as possible, **report** *Kurang* |
| One outlet dead or scorched (a class of 7-8 may then not be fully powerable) | **report** *Listrik*, never open it |
| Boxes in front of the door | **fix**: move them |
| Everything fine | do the seating, report nothing |

**Scoring:** three objects (Kursi 2x, Stopkontak 2x, Lorong 1x). "Kursi" is incomplete unless the player seated every seat that was actually possible (limited by sturdy chairs, power and the headcount); reporting a shortfall that doesn't exist, or missing one that does, costs points, as in Task 1.

**Implemented in:** `src/scenes/ClassroomSeatingScene.js`, `src/systems/seatingRules.js`, `ep1Tasks.js` (`classroom`). Tested by `node tools/test-classroom.mjs` (5000 random classrooms: truth matches the room, the target is reachable, perfect play = 100%).

## 7. Systems that apply across the game

### 8.1 Dialogue and NPC interaction (hybrid layer, next)

Every NPC interaction and task start/finish will use a data-driven dialogue runner:

- node/choice graph with conditions and variables (e.g. `reportedToOps`, `taskScore`)
- speaker + portrait + text; optional choices with consequences
- hooks for localisation (text is Indonesian now)
- the manager's task debrief becomes a dialogue node reading the task result

Tools in this repo: `dialogue-systems` and `visual-novel` skills. Decision pending: custom runner vs Ink/Yarn (default: small custom JSON runner, since the overlay already exists).

### 8.2 Notes / carry-over information

`gameState.episode1.notes` holds facts learned (roster). Later stations and Episode 3 can read it. Extend as more cross-task clues are added.

### 8.3 Reports to Ops

Each report is stored as `{ area, item, reason, urgent }` and shown in the episode summary. The same list will be an input to the final score.

### 8.4 Persistence

Progress, player name, per-task results and Episode 2 outcomes are saved to `localStorage` (`src/state/storage.js`). No backend.

### 8.5 Scoring

- Per task: percentage from section 4.4.
- Episode 1 score: sum over tasks.
- Planned: **overall final rating** combining Episode 1 (decision quality), Episode 2 (reply quality + scheduling), Episode 3 (trial outcome).

## 8. Roadmap

Ordered by dependency. Each step is releasable.

| # | Step | Status |
|---|---|---|
| 0 | Room tilemap, props, player, collision, depth sorting | Done |
| 1 | Close-up scene engine + **Task 1: Paket HQ** unpack-sort-reconcile (section 5) | Done |
| 2 | Pixel-art close-up asset pipeline (generator + QA + manifest); bag/shirt art after the real merch | Done |
| 3 | Extract reusable parts from `DeskCloseUpScene`: `SlotGrid`, `TestStation`, `StockDrawer`, `ItemDrag` | Next |
| 4 | **Task 2** Ruang Kelas seating puzzle (section 6); uses Task 1's Notes, teaches the electrical rule | Done |
| 5 | Task removed: the old shelf/merch task | Dropped |
| 6 | Dialogue runner + NPC interactions in the room (manager at stations, short exchanges) | After 3 |
| 7 | **Episode 2** rework: chat desk becomes a real game, not just replying (see the proposal in the conversation / next section of this doc) | Next |
| 8 | Episode 3 design (trial day): who shows up, what the admin must handle | After 7 |
| 9 | Overall final score + ending screen + back-to-menu | After 8 |
| 10 | Audio (footsteps, drag/drop, success/fail), motion polish | Anytime |
| 11 | Docs/README refresh; delete unused legacy assets (`map.png`, `tiles/`, `collision.js`, `episode1_map.json`, `furniturePlacement.json`) | Soon |

### Open questions

- Should wrong decisions also change the story (e.g. the manager's mood, extra dialogue), not only the score?
- Time pressure: keep a step budget, or a real-time countdown per close-up?
- Should the player be able to retry a task, or is one attempt per run part of the learning?
- Episode 3: how much of "who shows up" is shown to the player vs. hidden?
- Mobile/touch support: dragging works with touch in Phaser, but the report form and result are HTML overlays sized for desktop.

## 9. Technical notes

- **Stack:** Phaser 3.80, Vite 5, vanilla JS. DOM overlays for dialogue, forms, result, chat, summary.
- **Scenes:** `BootScene`, `Episode1Scene`, `DeskCloseUpScene`, `Episode2Scene`.
- **Room:** Tiled-format map `src/data/episode1.tmj.json` (tile layers `floor`, `walls`; object layers `props`, `collision`); wall tiles carry a `collides` property; solid props depth-sort by the bottom of their hitbox.
- **Rendering rules:** `pixelArt: true`; all pixel art shown at integer scale (room 1x, close-ups 2x); never rotate sprites by non-90 degrees.
- **Run:** `npm run dev`. **Build:** `npm run build`.

## 10. Asset pipeline

Everything visual for Episode 1 is generated by one script: `node tools/generate-assets.mjs`.

- One locked 16-colour palette (see `docs/art-direction-brief.md`); the script **fails the build** if any pixel is outside it.
- Outputs: room tileset + props atlas + manager sprite; close-up atlas, individual frames, desk tile, and `closeup.layout.json` (slot positions read by the scene).
- QA before use (from the `create-game-assets` skill): `asset_report.py` for size/alpha/colour count per file, `build_preview_sheet.py` for a contact sheet, a 3x3 repeat test for tiles, and a native-scale (2x) composition review.
- Provenance: every asset is listed in `docs/asset-manifest.json` with source ("authored-procedural, no image-generation tool or third-party art") and verification flags.
- Rule for new assets: add the drawing to the generator, reuse the palette, export a layout entry for anything with snap positions, run QA, add to the manifest. Pen sprites for working and dry pens are intentionally the same file.

## 11. Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-10-24 | Rebuilt Episode 1 art as a proper tileset/tilemap | Old floor tile was 58px on a 32px grid and failed to load |
| 2026-10-24 | Tasks become inspect-compare-decide (fine / fix / report), randomised per run | Make tasks need logic and critical thinking, not button clicks |
| 2026-10-24 | Overlay-with-buttons inspection judged wrong for the game | The player wants to *play* the task |
| 2026-10-24 | Tasks become close-up scenes with drag, test, open, report | Genre is a hybrid; hands-on counting is the core verb |
| 2026-10-24 | Assets generated procedurally under one palette with QA gates | Exact pixels, consistency, and the "dry pen looks identical" rule |
| 2026-10-24 | Task 1 changed from stationery desk to **unpack and verify the HQ package** | Matches the real branch workflow (check stock received from HQ); gives variants/damage/staged-shipment logic |
| 2026-10-24 | Close-up is a scene switch with a mechanic that fits each task, not one fixed screen | "Not all tasks will look like it" |
| 2026-10-24 | Bag and T-shirt art redrawn from the real merch images (`bag1.png`, `bag2.png`) | Branded, recognisable items; palette has no red/yellow so nearest swatches are used |
| 2026-10-25 | Classroom redesigned as a **seating puzzle**: two 2x2 islands (two desks face to face, 4 seats each), power reach and capacity, wobbly chairs, dead outlets, boxes in the aisle | A spatial/systems mechanic that differs from Task 1 and teaches capacity, safety and "report, don't repair" |
| 2026-10-25 | The merch/shelf task was **removed** from Episode 1 | Scope decision by the project owner |
