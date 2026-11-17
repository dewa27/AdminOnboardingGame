// ClassroomSeatingScene — Task 3 (Ruang Kelas) as a seating puzzle.
//
// A top-down grid of the classroom with fixed desks. From the storeroom panel the player drags
// chairs next to desks so everyone (students + mentor, per the roster in Notes) has a seat.
// The constraints (see systems/seatingRules.js):
//   - a seat needs a desk next to it
//   - each seat needs power: outlets reach a few cells and serve only 5 seats each
//   - the aisle to the door must stay open (move the delivery boxes)
// Hidden things the player has to find by clicking:
//   - wobbly chairs (same sprite as good ones): click a chair to test it
//   - a dead or scorched outlet: click an outlet -> "Tes colok", or the forbidden "Buka cover"
// Reporting is the right answer when the problem can't be solved at the table (not enough
// usable chairs; a faulty outlet). Scoring: systems/inspectScoring.js.
import Phaser from 'phaser';
import { gameState } from '../state/gameState.js';
import { buildResult } from '../systems/inspectScoring.js';
import { openReportForm } from '../ui/reportForm.js';
import { showTaskResult } from '../ui/inspect.js';
import { crispText } from '../ui/crispText.js';
import {
  COLS, ROWS, DESKS, OUTLETS, DOOR_CELLS,
  inGrid, isDesk, deskFor, facingFor, matchPower, aisleStatus
} from '../systems/seatingRules.js';

const Z = 2;
const CELL = 16 * Z;           // 32px on screen
const GX = 24, GY = 72;        // top-left of the grid
const INK = '#2b2438';

const PANEL = new Phaser.Geom.Rectangle(496, 148, 136, 180);   // storeroom
const BOX_START = [{ c: 6, r: 8 }, { c: 7, r: 8 }, { c: 6, r: 7 }];

const cellCenter = (c, r) => ({ x: GX + c * CELL + CELL / 2, y: GY + r * CELL + CELL / 2 });
const cellAt = (x, y) => ({ c: Math.floor((x - GX) / CELL), r: Math.floor((y - GY) / CELL) });

export class ClassroomSeatingScene extends Phaser.Scene {
  constructor() {
    super('ClassroomSeatingScene');
  }

  init(data) {
    this.task = data.task;
    this.onDone = data.onDone;
  }

  create() {
    this.cu = this.task.closeup;
    this.chairs = [];
    this.boxes = [];
    this.reports = {};
    this.openedOutlet = false;
    this.knownOutlets = {};            // id -> 'ok' | 'dead' | 'scorched' once tested
    this.dynamic = [];                 // laptops, flags: rebuilt on every change
    this.finished = false;
    this.input.dragDistanceThreshold = 6;

    this.cameras.main.fadeIn(250);
    this.add.tileSprite(0, 0, 640, 480, 'cu_desk_tile').setOrigin(0).setTileScale(Z).setDepth(0);

    this.buildRoom();
    this.buildPanel();
    this.spawnChairs();
    this.spawnBoxes();
    this.buildHud();
    this.buildButtons();

    this.input.on('dragstart', (_p, s) => this.onDragStart(s));
    this.input.on('drag', (_p, s, x, y) => s.setPosition(Math.round(x), Math.round(y)));
    this.input.on('dragend', (p, s) => this.onDragEnd(p, s));

    const line = this.task.noteLines[0];
    if (line && !gameState.episode1.notes.includes(line)) gameState.episode1.notes.push(line);
    this.renderNotes();
    this.refresh();
  }

  // ---------- Static room ----------

  buildRoom() {
    const g = this.add.graphics().setDepth(1);
    const W = 0x6a6477, TRIM = 0x8d879b, DARK = 0x2b2438;
    const x0 = GX - 16, y0 = GY - 32, x1 = GX + COLS * CELL + 16, y1 = GY + ROWS * CELL + 16;
    // walls (top is thicker: whiteboard wall)
    g.fillStyle(W, 1);
    g.fillRect(x0, y0, x1 - x0, 32); g.fillRect(x0, y0, 16, y1 - y0);
    g.fillRect(x1 - 16, y0, 16, y1 - y0); g.fillRect(x0, y1 - 16, x1 - x0, 16);
    g.lineStyle(2, DARK, 1).strokeRect(x0, y0, x1 - x0, y1 - y0);
    g.lineStyle(2, TRIM, 1).strokeRect(GX - 2, GY - 2, COLS * CELL + 4, ROWS * CELL + 4);
    // door gap in the bottom wall (the two door cells), with a mat
    const dx = GX + DOOR_CELLS[0].c * CELL, dw = DOOR_CELLS.length * CELL;
    this.add.rectangle(dx, GY + ROWS * CELL, dw, 16, 0x8cc3e8).setOrigin(0).setDepth(2).setStrokeStyle(2, DARK);
    crispText(this, dx + dw / 2, GY + ROWS * CELL + 8, 'PINTU', { fontSize: '9px', fontStyle: 'bold', color: INK }).setOrigin(0.5).setDepth(3);
    // whiteboard
    this.add.rectangle(GX + 8 * CELL, y0 + 6, 5 * CELL, 20, 0xf4f0ea).setOrigin(0).setDepth(2).setStrokeStyle(2, 0x3b4263);

    // desks
    DESKS.forEach(d => this.add.image(GX + d.c * CELL, GY + d.r * CELL, 'closeup', 'cu_cr_island').setOrigin(0).setScale(Z).setDepth(5));

    // outlets (state hidden until tested)
    this.outletSprites = {};
    OUTLETS.forEach(o => {
      const pos = o.side === 'left' ? { x: GX - 8, y: GY + o.r * CELL + 16 }
        : o.side === 'right' ? { x: GX + COLS * CELL + 8, y: GY + o.r * CELL + 16 }
          : { x: GX + o.c * CELL + 16, y: GY - 16 };
      const s = this.add.image(pos.x, pos.y, 'closeup', 'cu_cr_outlet').setScale(Z).setDepth(6).setInteractive({ useHandCursor: true });
      s.on('pointerdown', () => this.openOutletMenu(o, s));
      this.outletSprites[o.id] = s;
    });

    this.cableGfx = this.add.graphics().setDepth(7);
    this.markGfx = this.add.graphics().setDepth(14);
  }

  buildPanel() {
    this.add.rectangle(PANEL.x, PANEL.y, PANEL.width, PANEL.height, 0xcfc9d3).setOrigin(0).setDepth(1).setStrokeStyle(2, 0x2b2438);
    this.panelTitle = crispText(this, PANEL.x + 6, PANEL.y + 4, '', { fontSize: '11px', fontStyle: 'bold', color: INK }).setDepth(2);
    this.panelSlots = Array.from({ length: 16 }, (_, i) => ({
      x: PANEL.x + 20 + (i % 4) * 34, y: PANEL.y + 40 + Math.floor(i / 4) * 36, chair: null
    }));
    this.notesTitle = crispText(this, 504, 12, 'Catatan', { fontSize: '11px', fontStyle: 'bold', color: INK }).setDepth(2);
    this.add.rectangle(496, 8, 136, 132, 0xf4f0ea).setOrigin(0).setDepth(1).setStrokeStyle(2, 0x2b2438);
    this.notesText = crispText(this, 504, 34, '', { fontSize: '11px', color: INK, wordWrap: { width: 124 }, lineSpacing: 3 }).setDepth(2);
  }

  renderNotes() {
    const notes = gameState.episode1.notes;
    this.notesText.setText(notes.length ? notes.map(n => '• ' + n).join('\n') : 'Belum ada catatan.');
  }

  // ---------- Items ----------

  spawnChairs() {
    this.cu.stock.forEach((def, i) => {
      const slot = this.panelSlots[i];
      const sprite = this.add.image(slot.x, slot.y, 'closeup', 'cu_cr_chair_n').setScale(Z).setDepth(10);
      sprite.setInteractive({ useHandCursor: true, draggable: true });
      const chair = { kind: 'chair', sprite, wobbly: def.wobbly, tested: false, loc: 'stock', slot: i, cell: null };
      slot.chair = chair;
      sprite.setData('item', chair);
      sprite.on('pointerup', () => { if (!chair.dragged) this.testChair(chair); chair.dragged = false; });
      this.chairs.push(chair);
    });
  }

  spawnBoxes() {
    BOX_START.slice(0, this.cu.boxes).forEach(cell => {
      const p = cellCenter(cell.c, cell.r);
      const sprite = this.add.image(p.x, p.y, 'closeup', 'cu_cr_box').setScale(Z).setDepth(10);
      sprite.setInteractive({ useHandCursor: true, draggable: true });
      const box = { kind: 'box', sprite, cell: { ...cell }, start: { ...cell } };
      sprite.setData('item', box);
      this.boxes.push(box);
    });
  }

  freeCell(c, r, ignore) {
    if (!inGrid(c, r) || isDesk(c, r)) return false;
    return ![...this.chairs.filter(x => x.loc === 'grid'), ...this.boxes].some(x => x !== ignore && x.cell.c === c && x.cell.r === r);
  }

  onDragStart(sprite) {
    const it = sprite.getData('item');
    if (!it) return;
    it.prev = { x: sprite.x, y: sprite.y, loc: it.loc, cell: it.cell && { ...it.cell }, slot: it.slot };
    if (it.kind === 'chair') it.dragged = true;
    sprite.setDepth(100);
    this.closeMenu();
  }

  onDragEnd(pointer, sprite) {
    const it = sprite.getData('item');
    if (!it) return;
    sprite.setDepth(10);
    const { c, r } = cellAt(pointer.x, pointer.y);

    if (it.kind === 'chair' && Phaser.Geom.Rectangle.Contains(PANEL, pointer.x, pointer.y)) {
      this.sendToStock(it);
    } else if (this.freeCell(c, r, it)) {
      const p = cellCenter(c, r);
      sprite.setPosition(p.x, p.y);
      it.cell = { c, r };
      if (it.kind === 'chair') {
        this.releaseSlot(it);
        it.loc = 'grid';
        sprite.setTexture('closeup', facingFor(c, r) === 'south' ? 'cu_cr_chair_s' : 'cu_cr_chair_n');
      }
    } else {
      this.restore(it);
    }
    this.refresh();
  }

  releaseSlot(chair) {
    if (chair.loc === 'stock' && chair.slot != null) { this.panelSlots[chair.slot].chair = null; chair.slot = null; }
  }

  sendToStock(chair) {
    const idx = this.panelSlots.findIndex(s => !s.chair);
    if (idx < 0) return this.restore(chair);
    this.releaseSlot(chair);
    chair.loc = 'stock'; chair.cell = null; chair.slot = idx;
    this.panelSlots[idx].chair = chair;
    chair.sprite.setTexture('closeup', 'cu_cr_chair_n').setPosition(this.panelSlots[idx].x, this.panelSlots[idx].y);
  }

  restore(it) {
    it.sprite.setPosition(it.prev.x, it.prev.y);
    it.loc = it.prev.loc; it.cell = it.prev.cell; it.slot = it.prev.slot;
  }

  // ---------- Testing things ----------

  testChair(chair) {
    if (chair.tested) return;
    chair.tested = true;
    if (chair.wobbly) { chair.sprite.setTint(0x8d879b); this.floatText(chair.sprite.x, chair.sprite.y - 20, 'Goyah! Gak layak.', '#b45309'); }
    else this.floatText(chair.sprite.x, chair.sprite.y - 20, 'Kokoh ✓', '#1d6a44');
    this.refresh();
  }

  openOutletMenu(outlet, sprite) {
    this.closeMenu();
    const state = this.cu.outlets.find(o => o.id === outlet.id).state;
    const mx = Phaser.Math.Clamp(sprite.x + (outlet.side === 'right' ? -150 : 30), 8, 470), my = Phaser.Math.Clamp(sprite.y + 4, 80, 330);
    const parts = [];
    const bg = this.add.rectangle(mx, my, 140, 62, 0xf4f0ea).setOrigin(0).setStrokeStyle(2, 0x2b2438).setDepth(200);
    const mk = (y, label, fn) => {
      const t = crispText(this, mx + 8, my + y, label, { fontSize: '12px', fontStyle: 'bold', color: INK, backgroundColor: '#cfc9d3', padding: { x: 6, y: 4 }, fixedWidth: 124 }).setDepth(201).setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => { this.closeMenu(); fn(); });
      parts.push(t);
    };
    mk(6, 'Tes colok', () => this.revealOutlet(outlet, state, false));
    mk(34, 'Buka cover', () => this.revealOutlet(outlet, state, true));
    const catcher = this.add.zone(0, 0, 640, 480).setOrigin(0).setInteractive().setDepth(199);
    catcher.on('pointerdown', () => this.closeMenu());
    this.menu = [bg, catcher, ...parts];
  }

  closeMenu() {
    if (this.menu) { this.menu.forEach(o => o.destroy()); this.menu = null; }
  }

  revealOutlet(outlet, state, opened) {
    this.knownOutlets[outlet.id] = state;
    const frame = { ok: 'cu_cr_outlet_ok', dead: 'cu_cr_outlet_dead', scorched: 'cu_cr_outlet_scorched' }[state];
    this.outletSprites[outlet.id].setTexture('closeup', frame);
    const s = this.outletSprites[outlet.id];
    if (opened) {
      this.openedOutlet = true;
      this.flash('Cover dibuka sendiri: urusan listrik itu tugas teknisi, bukan admin!');
    } else {
      this.floatText(s.x, s.y + 14, { ok: 'Normal ✓', dead: 'Mati: gak ada arus', scorched: 'Hangat & bau gosong!' }[state], state === 'ok' ? '#1d6a44' : '#b45309');
    }
    this.refresh();
  }

  // ---------- Rules applied to the current table ----------

  placedChairs() { return this.chairs.filter(c => c.loc === 'grid'); }

  // Outlets the player currently believes work (everything not yet found faulty).
  believedOutlets() { return OUTLETS.filter(o => !['dead', 'scorched'].includes(this.knownOutlets[o.id])); }

  // Outlets that truly work (used for the real score).
  workingOutlets() { return OUTLETS.filter(o => this.cu.outlets.find(x => x.id === o.id).state === 'ok'); }

  // ---------- Drawing the live state ----------

  refresh() {
    this.dynamic.forEach(o => o.destroy());
    this.dynamic = [];
    this.cableGfx.clear(); this.markGfx.clear();

    const placed = this.placedChairs();
    const seated = placed.map(c => ({ chair: c, desk: deskFor(c.cell.c, c.cell.r) }));
    const withDesk = seated.filter(s => s.desk);

    // laptops on the desks in front of each seat
    withDesk.forEach(({ chair, desk }) => {
      const p = cellCenter(desk.c, desk.r);
      const above = facingFor(chair.cell.c, chair.cell.r) === 'south';
      const img = this.add.image(p.x, p.y + (above ? -5 : 5), 'closeup', above ? 'cu_cr_laptop_s' : 'cu_cr_laptop_n').setScale(Z).setDepth(8);
      this.dynamic.push(img);
    });

    // cables: what the player can see, assuming outlets work unless they've found one dead
    const believed = this.believedOutlets();
    const m = matchPower(withDesk.map(s => s.desk), believed);
    this.cableGfx.lineStyle(2, 0x66c985, 1);
    withDesk.forEach((s, i) => {
      const id = m.assigned[i];
      if (!id) return;
      const o = this.outletSprites[id];
      const d = cellCenter(s.desk.c, s.desk.r);
      this.cableGfx.lineBetween(o.x, o.y, d.x, d.y);
    });
    // flags: no desk / no power
    seated.forEach((s, i) => {
      const idx = withDesk.indexOf(s);
      const bad = !s.desk ? 'no desk' : (!m.assigned[idx] ? 'no power' : null);
      if (bad) this.flag(s.chair.sprite.x + 10, s.chair.sprite.y - 12, bad === 'no desk' ? '?' : '⚡');
      if (s.chair.tested && !s.chair.wobbly) this.markGfx.fillStyle(0x66c985, 1).fillRect(s.chair.sprite.x + 6, s.chair.sprite.y - 14, 8, 8);
    });
    this.chairs.filter(c => c.tested && !c.wobbly && c.loc === 'stock').forEach(c => this.markGfx.fillStyle(0x66c985, 1).fillRect(c.sprite.x + 6, c.sprite.y - 14, 8, 8));

    // HUD
    const aisle = aisleStatus(placed.map(c => c.cell), this.boxes.map(b => b.cell));
    this.hud.setText([
      `Kursi terpasang: ${placed.length}     Tersambung listrik: ${m.count}`,
      `Lorong ke pintu: ${aisle.ok ? 'bebas' : aisle.doorOpen ? `${aisle.unreachable} kursi terkurung` : 'pintu terhalang'}`
    ]);
    this.hud.setColor(aisle.ok ? INK : '#b45309');
    this.panelTitle.setText(`Gudang kursi: ${this.chairs.filter(c => c.loc === 'stock').length}`);
  }

  flag(x, y, ch) {
    const bg = this.add.circle(x, y, 8, 0xc98f55).setStrokeStyle(2, 0x2b2438).setDepth(15);
    const t = crispText(this, x, y, ch, { fontSize: '11px', fontStyle: 'bold', color: '#2b2438' }).setOrigin(0.5).setDepth(16);
    this.dynamic.push(bg, t);
  }

  floatText(x, y, str, color) {
    const t = crispText(this, x, y, str, { fontSize: '12px', fontStyle: 'bold', color, backgroundColor: '#f4f0ea', padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(180);
    this.tweens.add({ targets: t, y: y - 18, alpha: 0, delay: 900, duration: 700, onComplete: () => t.destroy() });
  }

  // ---------- HUD & buttons ----------

  buildHud() {
    this.hud = crispText(this, 24, 388, '', { fontSize: '12px', fontStyle: 'bold', color: INK, lineSpacing: 4 }).setDepth(3);
    crispText(this, 24, 428, 'Tiap island untuk 4 siswa: 2 kursi di atas, 2 di bawah. Mentor pakai meja guru, jadi hanya siswa yang dihitung. Klik kursi atau stopkontak untuk mengeceknya, dan pindahkan kardus dari lorong.', {
      fontSize: '11px', color: INK, backgroundColor: '#f4f0ea', padding: { x: 6, y: 4 }, wordWrap: { width: 450 }
    }).setDepth(3);
    this.flashText = crispText(this, 248, 364, '', { fontSize: '13px', color: '#f4f0ea', backgroundColor: '#2b2438', padding: { x: 10, y: 5 }, wordWrap: { width: 460 }, align: 'center' }).setOrigin(0.5).setDepth(200).setAlpha(0);
  }

  buildButtons() {
    this.makeButton(496, 340, 136, 30, 'Lapor ke Ops', () => this.openReport());
    this.makeButton(496, 378, 136, 30, 'Selesai', () => this.finish(), true);
  }

  makeButton(x, y, w, h, label, onClick, primary = false) {
    const bg = this.add.rectangle(x, y, w, h, primary ? 0x2f9e5a : 0xf4f0ea).setOrigin(0).setStrokeStyle(2, 0x2b2438).setInteractive({ useHandCursor: true });
    const text = crispText(this, x + w / 2, y + h / 2, label, { fontSize: '13px', fontStyle: 'bold', color: primary ? '#f4f0ea' : INK }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(primary ? 0x1d6a44 : 0xcfc9d3));
    bg.on('pointerout', () => bg.setFillStyle(primary ? 0x2f9e5a : 0xf4f0ea));
    bg.on('pointerdown', onClick);
    return this.add.container(0, 0, [bg, text]).setDepth(150);
  }

  flash(msg) {
    this.flashText.setText(msg).setAlpha(1);
    this.tweens.killTweensOf(this.flashText);
    this.tweens.add({ targets: this.flashText, alpha: 0, delay: 2600, duration: 400 });
  }

  openReport() {
    openReportForm({
      items: this.cu.reportItems,
      reasons: this.cu.reasons,
      reports: this.reports,
      onClose: reports => { this.reports = reports; }
    });
  }

  // ---------- Scoring + exit ----------

  collectDecisions() {
    const placed = this.placedChairs();
    // Only sturdy chairs next to a desk count as seats; power is matched against outlets that truly work.
    const usable = placed.filter(c => !c.wobbly).map(c => deskFor(c.cell.c, c.cell.r)).filter(Boolean);
    const valid = matchPower(usable, this.workingOutlets()).count;
    const aisle = aisleStatus(placed.map(c => c.cell), this.boxes.map(b => b.cell));
    const movedBoxes = this.boxes.length > 0 && this.boxes.every(b => b.cell.c !== b.start.c || b.cell.r !== b.start.r);

    const seatReport = this.reports.seat;
    const powerReport = this.reports.power;
    return {
      seat: seatReport
        ? { action: 'report', reason: seatReport.reason, urgent: seatReport.urgent, incomplete: valid < this.cu.target }
        : { action: 'ignore', incomplete: valid < this.cu.target },
      power: this.openedOutlet
        ? { action: 'fix' }
        : powerReport ? { action: 'report', reason: powerReport.reason, urgent: powerReport.urgent } : { action: 'ignore' },
      aisle: { action: movedBoxes ? 'fix' : 'ignore', incomplete: !aisle.ok }
    };
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.closeMenu();
    const result = buildResult(this.task, this.collectDecisions());
    showTaskResult(result, () => this.close(result));
  }

  close(result) {
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      this.scene.resume('Episode1Scene');
      this.onDone && this.onDone(result);
    });
  }
}
