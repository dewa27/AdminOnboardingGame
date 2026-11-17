// DeskCloseUpScene — Task 1 (Meja Stationeries) as a hands-on close-up.
//
// Pressing E at the desk pauses the room scene and launches this one: a flat
// top-down view of the table. Nothing here is a checkbox; the player does the
// task with their hands:
//   - drag pens into the case (the case has no "required" count — the sticky
//     note gives the rule and the roster, the player does the maths)
//   - drag a pen onto the scrap paper to test the ink (dry pens look identical
//     to working ones; only the test tells them apart)
//   - drag paper packs onto the tray (10-sheet packs plus a loose remainder)
//   - open the stock drawer to take spares (that's "fix it yourself")
//   - "Lapor ke Ops" when stock can't cover the gap (that's "escalate")
// "Selesai" scores what is physically on the table (systems/inspectScoring.js).
//
// All art comes from tools/generate-assets.mjs and is shown at exactly 2x.
// Slot coordinates come from closeup.layout.json so art and scene can't drift.
import Phaser from 'phaser';
import layout from '../assets/generated/closeup.layout.json';
import { gameState } from '../state/gameState.js';
import { buildResult } from '../systems/inspectScoring.js';
import { openReportForm } from '../ui/reportForm.js';
import { showTaskResult } from '../ui/inspect.js';
import { crispText } from '../ui/crispText.js';

const Z = 2; // display scale of every pixel-art sprite
const FONT = '"Courier New", monospace';
const INK = '#2b2438';

// Screen-space anchors (top-left of each 2x sprite).
const CASE_AT = { x: 356, y: 16 };
const TRAY_AT = { x: 356, y: 184 };
const DRAWER_AT = { x: 356, y: 276 };
const STICKY_AT = { x: 16, y: 16 };
const SCRAP_AT = { x: 240, y: 24 };

const rect = (at, w, h) => new Phaser.Geom.Rectangle(at.x, at.y, w * Z, h * Z);
const R = {
  case: rect(CASE_AT, layout.case.w, layout.case.h),
  tray: rect(TRAY_AT, layout.tray.w, layout.tray.h),
  drawer: rect(DRAWER_AT, layout.drawer.w, layout.drawer.h),
  scrap: rect(SCRAP_AT, layout.scrap.w, layout.scrap.h),
  desk: new Phaser.Geom.Rectangle(8, 140, 340, 296)
};

const slotXY = (at, s) => ({ x: at.x + s.x * Z, y: at.y + s.y * Z });

export class DeskCloseUpScene extends Phaser.Scene {
  constructor() {
    super('DeskCloseUpScene');
  }

  init(data) {
    this.task = data.task;
    this.onDone = data.onDone;
  }

  create() {
    const cu = this.task.closeup;
    this.cu = cu;
    this.pens = [];
    this.packs = [];
    this.caseSlots = Array(layout.case.slots.length).fill(null);
    this.traySlots = Array(layout.tray.slots.length).fill(null);
    this.reports = {};
    this.drawerOpen = false;
    this.finished = false;
    this.scribbles = 0;

    this.cameras.main.fadeIn(250);
    this.add.tileSprite(0, 0, 640, 480, 'cu_desk_tile').setOrigin(0).setTileScale(Z).setDepth(0);

    this.buildFurniture();
    this.buildNote();
    this.spawnItems();
    this.buildButtons();
    this.refreshCounters();

    this.input.on('dragstart', (_p, o) => this.onDragStart(o));
    this.input.on('drag', (_p, o, x, y) => this.onDrag(o, x, y));
    this.input.on('dragend', (_p, o) => this.onDragEnd(o));

    // Roster goes into the notes panel so later stations can look it up.
    const line = this.task.noteLines[0];
    if (line && !gameState.episode1.notes.includes(line)) gameState.episode1.notes.push(line);
  }

  // ---------- Static pieces ----------

  buildFurniture() {
    const img = (at, frame, depth = 1) => this.add.image(at.x, at.y, 'closeup', frame).setOrigin(0).setScale(Z).setDepth(depth);

    img(CASE_AT, 'cu_case');
    img(TRAY_AT, 'cu_tray');
    img(SCRAP_AT, 'cu_scrap');
    this.scrapGfx = this.add.graphics().setDepth(2);

    this.drawerClosed = img(DRAWER_AT, 'cu_drawer_closed', 8).setInteractive({ useHandCursor: true });
    this.drawerOpenImg = img(DRAWER_AT, 'cu_drawer_open', 8).setVisible(false);
    this.drawerLabel = crispText(this, DRAWER_AT.x + 69 * Z, DRAWER_AT.y + 72 * Z, 'LACI STOK', {
      fontFamily: FONT, fontSize: '10px', fontStyle: 'bold', color: INK
    }).setOrigin(0.5).setDepth(9);
    this.drawerClosed.on('pointerdown', () => this.setDrawer(true));

    this.caseLabel = crispText(this, CASE_AT.x, CASE_AT.y + R.case.height + 4, '', { fontFamily: FONT, fontSize: '11px', color: INK, backgroundColor: '#f4f0ea', padding: { x: 4, y: 2 } }).setDepth(3);
    this.trayLabel = crispText(this, TRAY_AT.x, TRAY_AT.y + R.tray.height + 4, '', { fontFamily: FONT, fontSize: '11px', color: INK, backgroundColor: '#f4f0ea', padding: { x: 4, y: 2 } }).setDepth(3);
    this.flashText = crispText(this, 320, 452, '', { fontFamily: FONT, fontSize: '12px', color: '#f4f0ea', backgroundColor: '#2b2438', padding: { x: 8, y: 4 } }).setOrigin(0.5).setDepth(200).setAlpha(0);
  }

  buildNote() {
    const cu = this.cu;
    this.add.image(STICKY_AT.x, STICKY_AT.y, 'closeup', 'cu_sticky').setOrigin(0).setScale(Z).setDepth(1);
    crispText(this, STICKY_AT.x + 14, STICKY_AT.y + 16, [
      'DAFTAR HARI INI',
      `Peserta: ${cu.students} + ${cu.mentors} mentor`,
      'Pulpen: 1/orang + 2 cad.',
      'Kertas: 2 lembar/orang',
      'Pulpen kering = gak dihitung'
    ].join('\n'), { fontFamily: FONT, fontSize: '10px', color: INK, lineSpacing: 5 }).setDepth(2);

    this.hint = crispText(this, 16, 396, 'Seret pulpen ke kotak. Seret pulpen ke kertas coretan untuk tes tinta. Seret pack kertas ke nampan.', {
      fontFamily: FONT, fontSize: '10px', color: INK, backgroundColor: '#e6b87e', padding: { x: 4, y: 3 }, wordWrap: { width: 320 }
    }).setDepth(3);
  }

  // ---------- Items ----------

  spawnItems() {
    const cu = this.cu;
    // Desk pens: a jittered grid so they look scattered but never overlap.
    const cells = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) cells.push({ x: 46 + c * 62, y: 232 + r * 34 });
    Phaser.Utils.Array.Shuffle(cells);
    cu.pensOnDesk.forEach((p, i) => {
      const cell = cells[i];
      this.addPen(cell.x + Phaser.Math.Between(-4, 4), cell.y + Phaser.Math.Between(-4, 4), p.dry, 'desk');
    });
    cu.pensInDrawer.forEach((p, i) => {
      const s = layout.drawer.pens[i];
      const pos = slotXY(DRAWER_AT, s);
      this.addPen(pos.x, pos.y, p.dry, 'drawer');
    });
    cu.packsOnDesk.forEach((sheets, i) => this.addPack(54 + i * 62, 176, sheets, 'desk'));
    cu.packsInDrawer.forEach((sheets, i) => {
      const pos = slotXY(DRAWER_AT, layout.drawer.packs[i]);
      this.addPack(pos.x, pos.y, sheets, 'drawer');
    });
    this.setDrawer(false);
  }

  addPen(x, y, dry, origin) {
    const color = Phaser.Math.Between(0, layout.pen.variants - 1);
    const sprite = this.add.image(x, y, 'closeup', `cu_pen_h${color}`).setScale(Z).setDepth(10);
    sprite.setInteractive({ useHandCursor: true, draggable: true });
    const pen = { kind: 'pen', sprite, dry, color, loc: origin, origin, slot: null, tested: false, mark: null };
    sprite.setData('item', pen);
    this.pens.push(pen);
    return pen;
  }

  addPack(x, y, sheets, origin) {
    const frame = sheets >= 10 ? 'cu_pack_big' : 'cu_pack_small';
    const sprite = this.add.image(x, y, 'closeup', frame).setScale(Z).setDepth(10);
    sprite.setInteractive({ useHandCursor: true, draggable: true });
    const label = crispText(this, x, y, String(sheets), {
      fontFamily: FONT, fontSize: '12px', fontStyle: 'bold', color: INK, stroke: '#f4f0ea', strokeThickness: 3
    }).setOrigin(0.5).setDepth(11);
    const pack = { kind: 'pack', sprite, label, sheets, loc: origin, origin, slot: null };
    sprite.setData('item', pack);
    this.packs.push(pack);
    return pack;
  }

  setDrawer(open) {
    this.drawerOpen = open;
    this.drawerClosed.setVisible(!open);
    this.drawerLabel.setVisible(!open);
    this.drawerOpenImg.setVisible(open);
    if (this.closeBtn) this.closeBtn.setVisible(open);
    [...this.pens, ...this.packs].forEach(it => {
      if (it.loc !== 'drawer') return;
      it.sprite.setVisible(open);
      it.sprite.input.enabled = open;
      if (it.label) it.label.setVisible(open);
    });
  }

  // ---------- Drag & drop ----------

  onDragStart(sprite) {
    const it = sprite.getData('item');
    if (!it) return;
    it.prev = { x: sprite.x, y: sprite.y, loc: it.loc, slot: it.slot };
    if (it.loc === 'case') this.caseSlots[it.slot] = null;
    if (it.loc === 'tray') this.traySlots[it.slot] = null;
    it.slot = null;
    if (it.kind === 'pen') sprite.setTexture('closeup', `cu_pen_h${it.color}`);
    sprite.setDepth(100);
    this.syncLabel(it);
    if (it.mark) it.mark.setVisible(false);
  }

  onDrag(sprite, x, y) {
    const it = sprite.getData('item');
    if (!it) return;
    sprite.setPosition(Math.round(x), Math.round(y));
    this.syncLabel(it);
  }

  onDragEnd(sprite) {
    const it = sprite.getData('item');
    if (!it) return;
    sprite.setDepth(10);
    const p = { x: sprite.x, y: sprite.y };

    if (it.kind === 'pen') {
      if (Phaser.Geom.Rectangle.Contains(R.case, p.x, p.y) && this.placeInSlots(it, this.caseSlots, layout.case.slots, CASE_AT, 'case')) {
        sprite.setTexture('closeup', `cu_pen_v${it.color}`);
      } else if (Phaser.Geom.Rectangle.Contains(R.scrap, p.x, p.y)) {
        this.testPen(it);
        this.restore(it);
      } else if (this.drawerOpen && Phaser.Geom.Rectangle.Contains(R.drawer, p.x, p.y)) {
        it.loc = 'drawer';
      } else if (Phaser.Geom.Rectangle.Contains(R.desk, p.x, p.y)) {
        it.loc = 'desk';
      } else {
        this.restore(it);
      }
      if (it.mark) it.mark.setVisible(it.loc !== 'case' && it.loc !== 'drawer');
    } else {
      if (Phaser.Geom.Rectangle.Contains(R.tray, p.x, p.y) && this.placeInSlots(it, this.traySlots, layout.tray.slots, TRAY_AT, 'tray')) {
        // placed
      } else if (this.drawerOpen && Phaser.Geom.Rectangle.Contains(R.drawer, p.x, p.y)) {
        it.loc = 'drawer';
      } else if (Phaser.Geom.Rectangle.Contains(R.desk, p.x, p.y)) {
        it.loc = 'desk';
      } else {
        this.restore(it);
      }
    }
    this.syncLabel(it);
    this.refreshCounters();
  }

  // Snap into the nearest free slot; false if the container is full.
  placeInSlots(it, slots, slotDefs, at, loc) {
    let best = -1, bestD = Infinity;
    slotDefs.forEach((s, i) => {
      if (slots[i]) return;
      const pos = slotXY(at, s);
      const d = Phaser.Math.Distance.Between(pos.x, pos.y, it.sprite.x, it.sprite.y);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best < 0) { this.flash(loc === 'case' ? 'Kotak sudah penuh.' : 'Nampan sudah penuh.'); return false; }
    const pos = slotXY(at, slotDefs[best]);
    it.sprite.setPosition(pos.x, pos.y);
    slots[best] = it;
    it.slot = best;
    it.loc = loc;
    return true;
  }

  // Put an item back exactly where it was before the drag.
  restore(it) {
    const prev = it.prev;
    it.sprite.setPosition(prev.x, prev.y);
    it.loc = prev.loc;
    it.slot = prev.slot;
    if (prev.loc === 'case') { this.caseSlots[prev.slot] = it; it.sprite.setTexture('closeup', `cu_pen_v${it.color}`); }
    if (prev.loc === 'tray') this.traySlots[prev.slot] = it;
    this.syncLabel(it);
  }

  syncLabel(it) {
    if (it.label) it.label.setPosition(it.sprite.x, it.sprite.y).setVisible(it.sprite.visible);
    if (it.mark) it.mark.setPosition(it.sprite.x + 34, it.sprite.y);
  }

  // ---------- Ink test ----------

  testPen(pen) {
    pen.tested = true;
    const ink = [0x2f9e5a, 0x5d8fb8, 0x3b4263, 0x8f5f38][pen.color];
    const row = this.scribbles % 6;
    this.scribbles += 1;
    if (this.scribbles > 6 && row === 0) this.scrapGfx.clear();
    const x0 = SCRAP_AT.x + 16, y = SCRAP_AT.y + 22 + row * 10;

    if (pen.dry) {
      // Faint dents, no ink.
      this.scrapGfx.fillStyle(0x8d879b, 1);
      [0, 6, 13, 19].forEach(dx => this.scrapGfx.fillRect(x0 + dx, y, 2, 2));
      pen.sprite.setTint(0x8d879b);
      this.flash('Tintanya gak keluar: pulpen ini kering.');
    } else {
      this.scrapGfx.lineStyle(2, ink, 1);
      this.scrapGfx.beginPath();
      this.scrapGfx.moveTo(x0, y);
      [4, 8, 12, 16, 20, 24].forEach((dx, i) => this.scrapGfx.lineTo(x0 + dx, y + (i % 2 ? 2 : -2)));
      this.scrapGfx.strokePath();
      if (!pen.mark) pen.mark = crispText(this, 0, 0, '✓', { fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#1d6a44', stroke: '#f4f0ea', strokeThickness: 3 }).setOrigin(0.5).setDepth(11);
      this.flash('Tinta keluar: pulpen ini bagus.');
    }
  }

  // ---------- HUD ----------

  buildButtons() {
    this.makeButton(16, 438, 150, 30, 'Lapor ke Ops', () => this.openReport());
    this.makeButton(176, 438, 120, 30, 'Selesai', () => this.finish(), true);
    this.closeBtn = this.makeButton(DRAWER_AT.x + R.drawer.width - 96, DRAWER_AT.y - 26, 96, 22, 'Tutup laci', () => this.setDrawer(false)).setVisible(false);
  }

  makeButton(x, y, w, h, label, onClick, primary = false) {
    const bg = this.add.rectangle(x, y, w, h, primary ? 0x2f9e5a : 0xf4f0ea).setOrigin(0).setStrokeStyle(2, 0x2b2438).setInteractive({ useHandCursor: true });
    const text = crispText(this, x + w / 2, y + h / 2, label, { fontFamily: FONT, fontSize: '12px', fontStyle: 'bold', color: primary ? '#f4f0ea' : INK }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(primary ? 0x1d6a44 : 0xcfc9d3));
    bg.on('pointerout', () => bg.setFillStyle(primary ? 0x2f9e5a : 0xf4f0ea));
    bg.on('pointerdown', onClick);
    const group = this.add.container(0, 0, [bg, text]).setDepth(150);
    return group;
  }

  refreshCounters() {
    const inCase = this.caseSlots.filter(Boolean).length;
    const sheets = this.traySlots.filter(Boolean).reduce((n, p) => n + p.sheets, 0);
    this.caseLabel.setText(`Kotak pulpen: ${inCase}`);
    this.trayLabel.setText(`Nampan kertas: ${sheets} lembar`);
  }

  flash(msg) {
    this.flashText.setText(msg).setAlpha(1);
    this.tweens.killTweensOf(this.flashText);
    this.tweens.add({ targets: this.flashText, alpha: 0, delay: 1400, duration: 400 });
  }

  openReport() {
    openReportForm({
      items: [{ id: 'pen', label: 'Pulpen' }, { id: 'paper', label: 'Kertas' }],
      reports: this.reports,
      onClose: reports => { this.reports = reports; }
    });
  }

  // ---------- Scoring + exit ----------

  // What the player physically did decides the action:
  //   report filed -> 'report'; else took spares from the drawer -> 'fix'; else 'ignore'.
  // If the requirement isn't met and nothing was reported, the task is incomplete.
  collectDecisions() {
    const cu = this.cu;
    const usablePens = this.pens.filter(p => p.loc === 'case' && !p.dry).length;
    const sheets = this.packs.filter(p => p.loc === 'tray').reduce((n, p) => n + p.sheets, 0);
    const tookPens = this.pens.some(p => p.origin === 'drawer' && p.loc !== 'drawer');
    const tookPaper = this.packs.some(p => p.origin === 'drawer' && p.loc !== 'drawer');

    const decide = (report, tookSpares, enough) => report
      ? { action: 'report', reason: report.reason, urgent: report.urgent }
      : { action: tookSpares ? 'fix' : 'ignore', incomplete: !enough };

    return {
      pen: decide(this.reports.pen, tookPens, usablePens >= cu.penNeed),
      paper: decide(this.reports.paper, tookPaper, sheets >= cu.paperNeed)
    };
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
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
