// PackageUnpackScene — Task 1 (Paket HQ) as a hands-on close-up.
//
// HQ sent a delivery box. The player:
//   1. clicks the box to open it, everything spills out scattered on the table
//   2. sorts it: drag one item, or draw a selection box over many and drag the
//      whole pile onto a bin (items that belong in the bin go in, the rest
//      bounce back, so mixed piles are fine)
//   3. compares each bin's count with the packing list (surat jalan)
//   4. files "Lapor ke HQ" for anything that doesn't match (short, extra, wrong
//      variant, broken) — and does NOT report things the list says ship separately
//   5. "Selesai": scores what's on the table + the reports (systems/inspectScoring.js)
//
// Art: tools/generate-assets.mjs, shown at exactly 2x. Task data: data/ep1Tasks.js.
import Phaser from 'phaser';
import layout from '../assets/generated/closeup.layout.json';
import { gameState } from '../state/gameState.js';
import { buildResult } from '../systems/inspectScoring.js';
import { openReportForm } from '../ui/reportForm.js';
import { showTaskResult } from '../ui/inspect.js';
import { crispText } from '../ui/crispText.js';

const Z = 2;
const FONT = '"Courier New", monospace';
const INK = '#2b2438';

const LIST_AT = { x: 8, y: 8 };
const BOX_AT = { x: 330, y: 150 };
const BIN_Y = 384;
const BIN_STEP = 70;
const MAT = new Phaser.Geom.Rectangle(216, 8, 416, 368);

const BINS = [
  { id: 'pen', label: 'PULPEN', icon: 'cu_pen_h0' },
  { id: 'bag_black', label: 'TAS HITAM', icon: 'cu_pk_bag_black' },
  { id: 'bag_green', label: 'TAS HIJAU', icon: 'cu_pk_bag_green' },
  { id: 'shirt_1', label: 'KAOS L1', icon: 'cu_pk_shirt_white_1' },
  { id: 'shirt_2', label: 'KAOS L2', icon: 'cu_pk_shirt_white_2' },
  { id: 'shirt_3', label: 'KAOS L3', icon: 'cu_pk_shirt_white_3' },
  { id: 'sticker', label: 'STIKER', icon: 'cu_pk_sticker' },
  { id: 'robot', label: 'ROBOT', icon: 'cu_pk_robot' },
  { id: 'laptop', label: 'LAPTOP', icon: 'cu_pk_laptop' }
];

export class PackageUnpackScene extends Phaser.Scene {
  constructor() {
    super('PackageUnpackScene');
  }

  init(data) {
    this.task = data.task;
    this.onDone = data.onDone;
  }

  create() {
    this.cu = this.task.closeup;
    this.items = [];            // sprites still lying on the table
    this.selected = new Set();
    this.reports = {};
    this.boxOpen = false;
    this.finished = false;

    this.cameras.main.fadeIn(250);
    this.add.tileSprite(0, 0, 640, 480, 'cu_desk_tile').setOrigin(0).setTileScale(Z).setDepth(0);

    this.buildList();
    this.buildBox();
    this.buildBins();
    this.buildButtons();
    this.buildLasso();

    this.input.on('dragstart', (_p, s) => this.onDragStart(s));
    this.input.on('drag', (_p, s, x, y) => this.onDrag(s, x, y));
    this.input.on('dragend', (p, s) => this.onDragEnd(p, s));

    const line = this.task.noteLines[0];
    if (line && !gameState.episode1.notes.includes(line)) gameState.episode1.notes.push(line);
  }

  // ---------- Static pieces ----------

  buildList() {
    this.add.image(LIST_AT.x, LIST_AT.y, 'closeup', 'cu_pk_list').setOrigin(0).setScale(Z).setDepth(1);
    crispText(this, LIST_AT.x + 100, LIST_AT.y + 12, 'SURAT JALAN HQ', { fontFamily: FONT, fontSize: '12px', fontStyle: 'bold', color: '#f4f0ea' }).setOrigin(0.5, 0).setDepth(2);
    crispText(this, LIST_AT.x + 10, LIST_AT.y + 34, this.cu.listLines.join('\n'), { fontFamily: FONT, fontSize: '11px', color: INK, lineSpacing: 2 }).setDepth(2);
    crispText(this, 8, 232, 'Klik kotak untuk membuka. Seret barang ke tempatnya, atau tarik area kosong untuk memilih banyak.', {
      fontFamily: FONT, fontSize: '11px', color: INK, backgroundColor: '#f4f0ea', padding: { x: 6, y: 4 }, wordWrap: { width: 200 }
    }).setDepth(3);
    this.flashText = crispText(this, 424, 24, '', { fontFamily: FONT, fontSize: '13px', color: '#f4f0ea', backgroundColor: '#2b2438', padding: { x: 10, y: 5 } }).setOrigin(0.5).setDepth(200).setAlpha(0);
  }

  buildBox() {
    this.box = this.add.image(BOX_AT.x, BOX_AT.y, 'closeup', 'cu_pk_box_closed').setScale(Z).setDepth(5).setInteractive({ useHandCursor: true });
    this.boxHint = crispText(this, BOX_AT.x, BOX_AT.y + 72, 'Klik untuk buka', { fontFamily: FONT, fontSize: '12px', fontStyle: 'bold', color: INK, backgroundColor: '#f4f0ea', padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(6);
    this.box.on('pointerdown', () => this.openBox());
  }

  buildBins() {
    this.bins = BINS.map((def, i) => {
      const x = 8 + i * BIN_STEP;
      this.add.image(x, BIN_Y, 'closeup', 'cu_pk_bin').setOrigin(0).setScale(Z).setDepth(1);
      const mouth = layout.bin.mouth, plate = layout.bin.plate;
      // icon at 1x in the dark mouth, counter below it, label on the plate
      this.add.image(x + (mouth.x + mouth.w / 2) * Z, BIN_Y + (mouth.y + 8) * Z, 'closeup', def.icon).setDepth(2);
      const count = crispText(this, x + (mouth.x + mouth.w / 2) * Z, BIN_Y + (mouth.y + mouth.h - 5) * Z, '0', { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#f4f0ea' }).setOrigin(0.5).setDepth(3);
      crispText(this, x + (plate.x + plate.w / 2) * Z, BIN_Y + (plate.y + plate.h / 2) * Z, def.label, { fontFamily: FONT, fontSize: '9px', fontStyle: 'bold', color: INK }).setOrigin(0.5).setDepth(3);
      return { ...def, x, rect: new Phaser.Geom.Rectangle(x, BIN_Y, layout.bin.w * Z, layout.bin.h * Z), count: 0, countText: count };
    });
  }

  buildButtons() {
    this.makeButton(8, 296, 200, 30, 'Lapor ke HQ', () => this.openReport());
    this.makeButton(8, 336, 200, 30, 'Selesai', () => this.finish(), true);
  }

  makeButton(x, y, w, h, label, onClick, primary = false) {
    const bg = this.add.rectangle(x, y, w, h, primary ? 0x2f9e5a : 0xf4f0ea).setOrigin(0).setStrokeStyle(2, 0x2b2438).setInteractive({ useHandCursor: true });
    const text = crispText(this, x + w / 2, y + h / 2, label, { fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: primary ? '#f4f0ea' : INK }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(primary ? 0x1d6a44 : 0xcfc9d3));
    bg.on('pointerout', () => bg.setFillStyle(primary ? 0x2f9e5a : 0xf4f0ea));
    bg.on('pointerdown', onClick);
    return this.add.container(0, 0, [bg, text]).setDepth(150);
  }

  // ---------- Opening the box ----------

  openBox() {
    if (this.boxOpen) return;
    this.boxOpen = true;
    this.box.setTexture('closeup', 'cu_pk_box_open').disableInteractive();
    this.boxHint.destroy();

    // Jittered grid over the table so the pile looks scattered but stays readable.
    const cells = [];
    for (let y = MAT.y + 30; y < MAT.bottom - 24; y += 50) {
      for (let x = MAT.x + 30; x < MAT.right - 24; x += 62) cells.push({ x, y });
    }
    Phaser.Utils.Array.Shuffle(cells);

    this.cu.items.forEach((def, i) => {
      const cell = cells[i % cells.length];
      const tx = cell.x + Phaser.Math.Between(-10, 10), ty = cell.y + Phaser.Math.Between(-8, 8);
      const s = this.add.image(BOX_AT.x, BOX_AT.y, 'closeup', def.frame).setScale(0).setDepth(10 + i % 5);
      s.setData('def', def);
      s.setInteractive({ useHandCursor: true, draggable: true });
      this.items.push(s);
      this.tweens.add({ targets: s, x: tx, y: ty, scale: Z, duration: 320, delay: i * 18, ease: 'Back.Out' });
    });
    this.flash('Kotak terbuka. Kelompokkan isinya, lalu cocokkan dengan surat jalan.');
  }

  // ---------- Lasso selection ----------

  buildLasso() {
    this.lassoGfx = this.add.graphics().setDepth(120);
    this.selGfx = this.add.graphics().setDepth(119);
    this.lasso = null;

    // Empty table: pointer down starts a selection rectangle.
    this.matHit = this.add.zone(MAT.x, MAT.y, MAT.width, MAT.height).setOrigin(0).setInteractive().setDepth(1);
    this.matHit.on('pointerdown', p => { this.selected.clear(); this.lasso = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; });
    this.input.on('pointermove', p => { if (this.lasso && p.isDown) { this.lasso.x1 = p.x; this.lasso.y1 = p.y; } });
    this.input.on('pointerup', () => {
      if (!this.lasso) return;
      const r = new Phaser.Geom.Rectangle(Math.min(this.lasso.x0, this.lasso.x1), Math.min(this.lasso.y0, this.lasso.y1), Math.abs(this.lasso.x1 - this.lasso.x0), Math.abs(this.lasso.y1 - this.lasso.y0));
      this.lasso = null;
      if (r.width < 6 && r.height < 6) return;
      this.items.forEach(s => { if (Phaser.Geom.Intersects.RectangleToRectangle(r, s.getBounds())) this.selected.add(s); });
    });
  }

  update() {
    this.lassoGfx.clear();
    if (this.lasso) {
      this.lassoGfx.lineStyle(2, 0xf4f0ea, 1).strokeRect(Math.min(this.lasso.x0, this.lasso.x1), Math.min(this.lasso.y0, this.lasso.y1), Math.abs(this.lasso.x1 - this.lasso.x0), Math.abs(this.lasso.y1 - this.lasso.y0));
    }
    this.selGfx.clear();
    this.selGfx.lineStyle(2, 0x66c985, 1);
    this.selected.forEach(s => { const b = s.getBounds(); this.selGfx.strokeRect(b.x - 2, b.y - 2, b.width + 4, b.height + 4); });
  }

  // ---------- Drag & drop ----------

  onDragStart(sprite) {
    if (!this.items.includes(sprite)) return;
    if (!this.selected.has(sprite)) { this.selected.clear(); this.selected.add(sprite); }
    this.dragGroup = [...this.selected].map(s => ({ s, x: s.x, y: s.y }));
    this.dragOrigin = { x: sprite.x, y: sprite.y };
    this.dragGroup.forEach(g => g.s.setDepth(100));
  }

  onDrag(sprite, x, y) {
    if (!this.dragGroup) return;
    const dx = x - this.dragOrigin.x, dy = y - this.dragOrigin.y;
    this.dragGroup.forEach(g => g.s.setPosition(Math.round(g.x + dx), Math.round(g.y + dy)));
  }

  onDragEnd(pointer) {
    if (!this.dragGroup) return;
    const bin = this.bins.find(b => Phaser.Geom.Rectangle.Contains(b.rect, pointer.x, pointer.y));
    let rejected = 0;

    this.dragGroup.forEach(({ s, x, y }) => {
      const def = s.getData('def');
      if (bin && def.bin === bin.id) {
        this.absorb(s, bin);
      } else if (bin) {
        rejected += 1;
        this.tweens.add({ targets: s, x, y, duration: 220, ease: 'Cubic.Out' });
      } else {
        // dropped on the table: keep it where it landed, inside the mat
        s.setPosition(Phaser.Math.Clamp(s.x, MAT.x + 16, MAT.right - 16), Phaser.Math.Clamp(s.y, MAT.y + 16, MAT.bottom - 16));
      }
      if (!bin || def.bin !== bin.id) s.setDepth(10);
    });
    if (rejected) this.flash(`${rejected} barang bukan ${bin.label.toLowerCase()}, dikembalikan.`);
    this.dragGroup = null;
  }

  absorb(sprite, bin) {
    this.items.splice(this.items.indexOf(sprite), 1);
    this.selected.delete(sprite);
    sprite.disableInteractive();
    bin.count += 1;
    bin.countText.setText(String(bin.count));
    this.tweens.add({
      targets: sprite, x: bin.x + (layout.bin.w * Z) / 2, y: bin.y + 30, scale: 0, duration: 160,
      onComplete: () => sprite.destroy()
    });
  }

  // ---------- HUD ----------

  flash(msg) {
    this.flashText.setText(msg).setAlpha(1);
    this.tweens.killTweensOf(this.flashText);
    this.tweens.add({ targets: this.flashText, alpha: 0, delay: 1800, duration: 400 });
  }

  openReport() {
    openReportForm({
      items: this.task.objects.map(o => ({ id: o.id, label: o.name })),
      reasons: this.cu.reasons,
      reports: this.reports,
      onClose: reports => { this.reports = reports; }
    });
  }

  // ---------- Scoring + exit ----------

  // A report is a report; no report means "I judge this group fine". If items of a
  // group are still lying unsorted the count can't be trusted, so it's incomplete.
  collectDecisions() {
    const decisions = {};
    this.task.objects.forEach(o => {
      const left = this.items.filter(s => s.getData('def').obj === o.id).length;
      const r = this.reports[o.id];
      decisions[o.id] = r
        ? { action: 'report', reason: r.reason, urgent: r.urgent }
        : { action: 'ignore', incomplete: left > 0 || !this.boxOpen };
    });
    return decisions;
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
