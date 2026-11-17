// Regenerates every Episode 1 visual asset from code, in one locked palette:
//   src/assets/generated/tileset.png   32px seamless tiles (floor, walls, door, mat)
//   src/assets/generated/props.png     furniture/prop atlas (+ props.json frame table)
//   src/assets/generated/manager.png   32x48 manager NPC sprite
//   src/assets/generated/closeup.png   Desk close-up atlas (+ closeup.json frames), drawn at
//                                      native size, shown at exactly 2x by DeskCloseUpScene
//   src/assets/generated/closeup/*.png each close-up frame on its own, for QA + provenance
//   src/assets/generated/closeup.layout.json  slot/anchor coordinates the scene reads, so
//                                      art and scene can't drift apart
//   src/assets/generated/cu_desk_tile.png     seamless 32x32 wood desk surface
//   src/data/episode1.tmj.json         Tiled-format map: floor + walls tile layers,
//                                      props + collision object layers
//
// Run:  node tools/generate-assets.mjs
//
// Rules this follows (pixel-art-sprites skill): one 16-colour palette shared by
// every asset, hue-shifted ramps (shadows lean cool, highlights lean warm), a
// dark-navy outline instead of pure black, light from the top-left, tiles whose
// border pixels are identical so they repeat with no seams, integer-only scaling
// (the game renders with pixelArt: true -> nearest-neighbour).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_ASSETS = path.join(ROOT, 'src/assets/generated');
const OUT_MAP = path.join(ROOT, 'src/data/episode1.tmj.json');
fs.mkdirSync(OUT_ASSETS, { recursive: true });

// ---------- Palette (16 colours, every asset uses only these) ----------
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
const P = {
  O:  hex('#2b2438'), // outline (dark violet-navy, never pure black)
  W1: hex('#6a6477'), W2: hex('#8d879b'), W3: hex('#b3adc0'), // wall ramp
  F1: hex('#cbc1b4'), F2: hex('#b4a99c'),                     // floor + grout line
  K1: hex('#8f5f38'), K2: hex('#c98f55'), K3: hex('#e6b87e'), // wood ramp
  G1: hex('#1d6a44'), G2: hex('#2f9e5a'), G3: hex('#66c985'), // Timedoor green ramp
  H:  hex('#f4f0ea'), H2: hex('#cfc9d3'),                     // white + cool shadow
  N:  hex('#3b4263'),                                         // navy (chairs, screens)
  B:  hex('#8cc3e8'),                                         // glass / screens
};

// ---------- Tiny canvas ----------
class Cv {
  // inset: drawing happens inside a 1px margin so the outline pass has room.
  constructor(w, h, inset = 0) {
    this.w = w; this.h = h; this.o = inset;
    this.d = new Uint8Array(w * h * 4);
  }
  px(x, y, c) {
    x = Math.round(x) + this.o; y = Math.round(y) + this.o;
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.d.set(c, (y * this.w + x) * 4);
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[(y * this.w + x) * 4 + 3];
  }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c); }
  // Filled rect lit from the top-left: highlight on top/left, shadow on bottom/right.
  bevel(x, y, w, h, base, hi, lo) {
    this.rect(x, y, w, h, base);
    if (hi) { this.rect(x, y, w, 1, hi); this.rect(x, y, 1, h, hi); }
    if (lo) { this.rect(x, y + h - 1, w, 1, lo); this.rect(x + w - 1, y, 1, h, lo); }
  }
  ellipse(cx, cy, rx, ry, c) {
    for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
      if ((i * i) / (rx * rx + 0.5) + (j * j) / (ry * ry + 0.5) <= 1) this.px(cx + i, cy + j, c);
    }
  }
  // Add the dark outline on transparent pixels touching the art (4-neighbour).
  outline() {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push([x, y]);
    }
    add.forEach(([x, y]) => this.d.set(P.O, (y * this.w + x) * 4));
  }
  blit(src, dx, dy) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const i = (y * src.w + x) * 4;
      if (src.d[i + 3]) this.d.set(src.d.subarray(i, i + 4), ((dy + y) * this.w + dx + x) * 4);
    }
  }
  save(file) {
    const png = new PNG({ width: this.w, height: this.h });
    png.data = Buffer.from(this.d);
    fs.writeFileSync(file, PNG.sync.write(png));
  }
}

// 3x5 pixel font, just the letters the brand banner needs.
const FONT = {
  t: ['010', '111', '010', '010', '011'], i: ['010', '000', '010', '010', '010'],
  m: ['101', '111', '111', '101', '101'], e: ['111', '100', '111', '100', '111'],
  d: ['001', '001', '111', '101', '111'], o: ['111', '101', '101', '101', '111'],
  r: ['111', '101', '110', '101', '101'], a: ['010', '101', '111', '101', '101'],
  c: ['111', '100', '100', '100', '111'], y: ['101', '101', '111', '001', '110'],
};
function text(cv, str, x, y, scale, c) {
  [...str].forEach((ch, n) => {
    FONT[ch].forEach((row, j) => [...row].forEach((v, i) => {
      if (v === '1') cv.rect(x + n * 4 * scale + i * scale, y + j * scale, scale, scale, c);
    }));
  });
}

// ---------- Tileset (32px, 8 columns) ----------
const T = 32;
const TILE = { floorA: 0, floorB: 1, floorC: 2, wallTop: 3, wallFace: 4, wallL: 5, wallR: 6, wallLR: 7, wallCapN: 8, door: 9, mat: 10 };
const COLLIDING = [TILE.wallTop, TILE.wallFace, TILE.wallL, TILE.wallR, TILE.wallLR, TILE.wallCapN];
const TILE_COUNT = 11, TILE_COLS = 8;

function drawFloor(cv, ox, variant) {
  const t = (x, y, c) => cv.px(ox + x, y, c);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) t(x, y, P.F1);
  // grout on the last row/column of EVERY tile -> continuous grid, no seams.
  for (let i = 0; i < T; i++) { t(i, T - 1, P.F2); t(T - 1, i, P.F2); }
  const speck = variant === 1 ? [[6, 8], [19, 5], [24, 22], [10, 25]] : variant === 2 ? [[8, 14], [21, 10], [14, 23]] : [];
  speck.forEach(([x, y]) => t(x, y, P.F2));
  if (variant === 2) [[7, 14], [22, 10]].forEach(([x, y]) => t(x, y, P.H2));
}

function drawWall(cv, ox, kind) {
  const t = (x, y, c) => cv.px(ox + x, y, c);
  const fill = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) t(x + i, y + j, c); };
  if (kind === 'face') {
    fill(0, 0, T, T, P.W2);
    fill(0, 0, T, 2, P.W3);                    // lit top edge
    fill(0, 22, T, 4, P.W1);                   // lower shadow band
    fill(0, 26, T, 4, P.K1);                   // skirting board
    fill(0, 26, T, 1, P.K2);
    fill(0, 30, T, 2, P.O);                    // contact shadow on the floor line
    return;
  }
  fill(0, 0, T, T, P.W1);
  fill(0, 0, T, 1, P.W2);                      // course line, repeats per tile
  [[6, 7], [21, 10], [12, 20], [26, 25]].forEach(([x, y]) => t(x, y, P.W2));
  if (kind === 'capN') { fill(0, 0, T, 2, P.W3); fill(0, 2, T, 1, P.O); }
  if (kind === 'L' || kind === 'LR') { fill(0, 0, 1, T, P.O); fill(1, 0, 2, T, P.W3); }
  if (kind === 'R' || kind === 'LR') { fill(T - 1, 0, 1, T, P.O); fill(T - 3, 0, 2, T, P.W3); }
}

function drawDoor(cv, ox) {
  const t = (x, y, c) => cv.px(ox + x, y, c);
  const fill = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) t(x + i, y + j, c); };
  fill(0, 0, T, T, P.N);
  fill(2, 3, 13, 25, P.B); fill(17, 3, 13, 25, P.B);    // two glass leaves
  fill(2, 3, 13, 1, P.H); fill(17, 3, 13, 1, P.H);       // glint
  for (let i = 0; i < 8; i++) { t(4 + i, 6 + i, P.H); t(19 + i, 6 + i, P.H); }
  fill(13, 14, 1, 6, P.H); fill(18, 14, 1, 6, P.H);      // handles
  fill(0, 28, T, 4, P.O);
}

function drawMat(cv, ox) {
  const t = (x, y, c) => cv.px(ox + x, y, c);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) t(x, y, (x + y) % 8 === 0 ? P.H2 : P.B);
  for (let i = 0; i < T; i++) { t(0, i, P.N); t(T - 1, i, P.N); }
}

function buildTileset() {
  const rows = Math.ceil(TILE_COUNT / TILE_COLS);
  const cv = new Cv(TILE_COLS * T, rows * T);
  drawFloor(cv, TILE.floorA * T, 0);
  drawFloor(cv, TILE.floorB * T, 1);
  drawFloor(cv, TILE.floorC * T, 2);
  drawWall(cv, TILE.wallTop * T, 'top');
  drawWall(cv, TILE.wallFace * T, 'face');
  drawWall(cv, TILE.wallL * T, 'L');
  drawWall(cv, TILE.wallR * T, 'R');
  drawWall(cv, TILE.wallLR * T, 'LR');
  // door/mat sit past the first row of 8, so they're drawn via a sub-canvas
  const place = (id, fn) => { const x = (id % TILE_COLS) * T; const y = Math.floor(id / TILE_COLS) * T;
    const sub = new Cv(T, T); fn(sub, 0); cv.blit(sub, x, y); };
  place(TILE.wallCapN, (sub, ox) => drawWall(sub, ox, 'capN'));
  place(TILE.door, drawDoor);
  place(TILE.mat, drawMat);
  cv.save(path.join(OUT_ASSETS, 'tileset.png'));
  return cv;
}

// ---------- Props ----------
// Each draw(c, w, h) paints into the inner (w-2)x(h-2) area; outline adds the ring.
const props = {};
const prop = (name, w, h, draw) => { const c = new Cv(w, h, 1); draw(c, w - 2, h - 2); c.outline(); props[name] = c; };

function leaf(c, cx, cy, rx, ry) { c.ellipse(cx, cy, rx, ry, P.G2); c.ellipse(cx - 1, cy - 1, Math.max(1, rx - 2), Math.max(1, ry - 2), P.G3); c.px(cx + rx - 1, cy + ry - 1, P.G1); c.px(cx + rx - 2, cy + ry - 1, P.G1); }
function plant(c, w, h, potH) {
  const cx = Math.floor(w / 2), top = h - potH;
  [[cx, 7, 6, 6], [cx - 7, 11, 5, 5], [cx + 7, 11, 5, 5], [cx - 3, 15, 5, 5], [cx + 4, 16, 5, 4]].forEach(([x, y, rx, ry]) => {
    if (y + ry < top + 3) leaf(c, x, y * (top / 22), rx, Math.max(2, Math.round(ry * top / 22)));
  });
  c.bevel(cx - 6, top, 13, potH, P.H, P.H, P.H2);
  c.rect(cx - 6, top, 13, 2, P.H2); c.rect(cx - 5, top, 11, 1, P.H);
  c.rect(cx - 6, top, 13, 1, P.H2);
  c.rect(cx - 5, top + 2, 11, 1, P.G1);       // soil
}

prop('logo_banner', 194, 58, (c, w, h) => {
  c.bevel(0, 0, w, h, P.H, P.H, P.H2);
  c.rect(0, h - 8, w, 8, P.G2); c.rect(0, h - 8, w, 1, P.G3);
  c.rect(0, h - 8, 40, 8, P.N);
  c.rect(8, 8, 3, 28, P.N); c.rect(8, 8, 12, 3, P.N); c.rect(8, 33, 12, 3, P.N); c.rect(17, 11, 3, 22, P.N); // door-mark "D"
  c.ellipse(15, 22, 11, 3, P.G2);
  text(c, 'timedoor', 46, 8, 3, P.N);
  text(c, 'academy', 46, 27, 3, P.G2);
});

prop('reception_desk', 162, 58, (c, w, h) => {
  c.bevel(0, 0, w, 32, P.H, P.H, P.H2);                      // work surface
  c.bevel(0, 32, w, h - 32, P.H2, P.H, P.W3);                // front panel
  // diagonal green stripe across the front panel
  for (let y = 0; y < h - 34; y++) c.rect(w - 100 + y, 34 + y, 36, 1, y < 2 ? P.G3 : P.G2);
  // monitor
  c.rect(64, 6, 22, 15, P.N); c.rect(66, 8, 18, 10, P.B); c.rect(66, 8, 18, 1, P.H); c.rect(72, 21, 6, 3, P.N);
  // stationery on the desk
  c.rect(110, 12, 8, 6, P.K2); c.rect(110, 12, 8, 1, P.K3);
  c.rect(124, 8, 6, 10, P.G2); c.rect(126, 10, 2, 5, P.H);
  c.rect(10, 12, 10, 6, P.H2); c.rect(11, 13, 8, 1, P.W2);
  // flower pot
  c.ellipse(w - 12, 8, 5, 5, P.H); c.ellipse(w - 14, 6, 3, 3, P.G3); c.rect(w - 15, 12, 7, 5, P.H2);
});

prop('chair_navy', 24, 28, (c, w, h) => {
  c.bevel(2, 0, w - 4, 10, P.N, P.W1, P.O);   // backrest
  c.bevel(1, 9, w - 2, h - 9, P.N, P.W1, P.O); // seat
  c.rect(w / 2 - 1, 11, 2, 6, P.W1);
});

prop('bookshelf_wall', 50, 90, (c, w, h) => {
  c.bevel(0, 0, w, h, P.K2, P.K3, P.K1);
  const items = [[P.G2, P.H, P.N, P.B], [P.N, P.K1, P.G3, P.H], [P.B, P.G1, P.H2, P.K1], [P.H, P.G2, P.N, P.K3]];
  for (let r = 0; r < 4; r++) {
    const y = 4 + r * 21;
    c.rect(3, y, w - 6, 17, P.K1);
    items[r].forEach((col, i) => { c.rect(5 + i * 10, y + 4, 8, 13, col); c.rect(5 + i * 10, y + 4, 8, 1, P.H); });
    c.rect(3, y + 17, w - 6, 2, P.K3);
  }
});

prop('water_dispenser', 22, 46, (c, w, h) => {
  c.bevel(3, 0, w - 6, 16, P.B, P.H, P.W3); c.rect(6, 2, 2, 8, P.H); // jug
  c.bevel(1, 16, w - 2, h - 16, P.H, P.H, P.H2);
  c.rect(7, 22, 8, 3, P.N); c.rect(9, 25, 4, 4, P.B);               // tap + cup
  c.rect(3, h - 4, w - 6, 3, P.W3);
});

prop('trash_bin', 20, 24, (c, w, h) => {
  c.bevel(1, 3, w - 2, h - 3, P.W2, P.W3, P.W1);
  c.rect(0, 0, w, 4, P.W3); c.rect(0, 3, w, 1, P.W1);
  for (let x = 4; x < w - 3; x += 3) c.rect(x, 7, 1, h - 10, P.W1);
});

prop('plant_tall', 32, 48, (c, w, h) => plant(c, w, h, 14));
prop('plant_small', 26, 34, (c, w, h) => plant(c, w, h, 10));

prop('sofa', 38, 86, (c, w, h) => {
  c.bevel(0, 0, 11, h, P.K3, P.H, P.K2);                      // backrest against the wall
  for (let i = 0; i < 3; i++) {
    const y = 2 + i * 26;
    c.bevel(10, y, w - 10, 24, P.H, P.H, P.H2);
    c.rect(11, y + 23, w - 12, 1, P.K3);
  }
  c.rect(10, 0, w - 10, 2, P.K2); c.rect(10, h - 2, w - 10, 2, P.K2);   // armrests
});

prop('coffee_table', 42, 42, (c, w, h) => {
  c.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, P.K1);
  c.ellipse(w / 2 - 1, h / 2 - 1, w / 2 - 3, h / 2 - 3, P.K2);
  c.ellipse(w / 2 - 3, h / 2 - 3, 6, 6, P.K3);
  c.rect(8, 22, 10, 7, P.B); c.rect(8, 22, 10, 1, P.H);
  c.rect(23, 24, 9, 7, P.G2);
  c.ellipse(24, 12, 4, 4, P.G3); c.rect(22, 15, 5, 4, P.H);
});

prop('ottoman', 38, 28, (c, w, h) => { c.bevel(0, 0, w, h, P.K3, P.H, P.K2); c.rect(2, 2, w - 4, 1, P.H); });

prop('round_table', 56, 54, (c, w, h) => {
  c.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, P.H2);
  c.ellipse(w / 2 - 1, h / 2 - 2, w / 2 - 3, h / 2 - 4, P.H);
  c.rect(w / 2 - 6, h / 2 - 8, 12, 9, P.G2); c.rect(w / 2 - 6, h / 2 - 8, 12, 1, P.G3); // table sign
  c.ellipse(w / 2 + 12, h / 2 + 8, 3, 3, P.G3); c.rect(w / 2 + 10, h / 2 + 10, 5, 3, P.H2);
});

prop('chair_green', 28, 28, (c, w, h) => {
  c.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, P.G1);
  c.ellipse(w / 2 - 1, h / 2 - 1, w / 2 - 3, h / 2 - 3, P.G2);
  c.ellipse(w / 2 - 4, h / 2 - 4, 4, 4, P.G3);
});
prop('chair_white', 28, 28, (c, w, h) => {
  c.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, P.H2);
  c.ellipse(w / 2 - 1, h / 2 - 1, w / 2 - 3, h / 2 - 3, P.H);
  c.ellipse(w / 2 - 4, h / 2 - 4, 4, 4, P.H);
});

function laptop(c, x, y, screenUp) {
  const sy = screenUp ? y : y + 8, by = screenUp ? y + 10 : y;
  c.rect(x, by, 20, 8, P.W3); c.rect(x + 2, by + 2, 16, 4, P.W2);
  c.rect(x, sy, 20, 10, P.N); c.rect(x + 2, sy + 1, 16, 7, P.B); c.rect(x + 2, sy + 1, 16, 1, P.H);
}
prop('desk_block', 130, 66, (c, w, h) => {
  c.bevel(0, 0, w, h, P.K2, P.K3, P.K1);
  c.rect(w / 2 - 1, 0, 2, h, P.K1); c.rect(0, h / 2 - 1, w, 2, P.K1);
  laptop(c, 20, 3, true); laptop(c, 84, 3, true);        // top row faces south
  laptop(c, 20, 31, false); laptop(c, 84, 31, false);    // bottom row faces north
  c.ellipse(w / 2, h / 2, 5, 5, P.G2); c.ellipse(w / 2 - 1, h / 2 - 1, 3, 3, P.G3);
});

prop('bookcase_small', 36, 66, (c, w, h) => {
  c.bevel(0, 10, w, h - 10, P.K2, P.K3, P.K1);
  for (let r = 0; r < 3; r++) {
    const y = 13 + r * 17;
    c.rect(3, y, w - 6, 14, P.K1);
    [P.G2, P.H, P.N, P.B, P.G1].forEach((col, i) => c.rect(4 + i * 5, y + 3, 4, 11, col));
  }
  c.ellipse(w / 2, 5, 6, 5, P.G2); c.ellipse(w / 2 - 2, 3, 3, 3, P.G3);
  c.rect(w / 2 - 4, 8, 9, 4, P.H);
});

prop('corner_shelf', 34, 86, (c, w, h) => {
  c.bevel(0, 16, w, h - 16, P.K2, P.K3, P.K1);
  c.rect(3, 20, w - 6, 24, P.K1); c.rect(6, 23, 22, 14, P.N); c.rect(8, 25, 18, 10, P.B);
  c.rect(3, 48, w - 6, 32, P.K1);
  [P.B, P.G2, P.H, P.B].forEach((col, i) => { c.rect(5, 52 + i * 7, 24, 6, col); c.rect(5, 52 + i * 7, 24, 1, P.H); });
  c.ellipse(w / 2 + 2, 8, 6, 7, P.G2); c.ellipse(w / 2, 6, 4, 4, P.G3); c.rect(w / 2 - 3, 13, 12, 4, P.H);
});

prop('wall_tv', 102, 46, (c, w, h) => {
  c.bevel(0, 0, w, 38, P.N, P.W1, P.O);
  c.rect(3, 3, w - 6, 32, P.W3); c.rect(3, 3, w - 6, 2, P.H); c.rect(3, 3, 2, 32, P.H);
  c.rect(w / 2 - 8, 38, 16, 3, P.N);
  c.bevel(2, 41, w - 4, h - 41, P.K3, P.H, P.K2);
});

function poster(c, w, h) {
  c.bevel(0, 0, w, h, P.H, P.W3, P.W2);
  for (let i = 0; i < 3; i++) c.rect(6, 8 + i * 8, w - 12, 4, P.N);
  c.rect(10, h - 10, w - 20, 2, P.G2);
}
prop('poster', 38, 48, poster);

// ---------- Close-up sprites (DeskCloseUpScene draws these at 2x) ----------
// A pen is drawn once along its length (L) and thickness (T), then emitted in a
// horizontal and a vertical orientation. Working and dry pens are the SAME art:
// the player has to test them on scrap paper, nothing about the sprite gives it away.
const PEN_COLORS = [[P.G2, P.G3, P.G1], [P.B, P.H, P.N], [P.N, P.W1, P.O], [P.K2, P.K3, P.K1]];
function drawPen(c, L, T, vert, body, hi, lo) {
  const put = (x, y, w, h, col) => (vert ? c.rect(y, x, h, w, col) : c.rect(x, y, w, h, col));
  put(0, 1, 3, T - 2, P.W2); put(0, 2, 1, T - 4, P.W1);   // metal tip
  put(3, 0, 16, T, body); put(3, 0, 16, 1, hi); put(3, T - 1, 16, 1, lo);
  put(19, 0, 5, T, lo); put(19, 0, 5, 1, body); put(20, 2, 3, 1, P.H); // cap + clip glint
}
PEN_COLORS.forEach(([body, hi, lo], i) => {
  prop(`cu_pen_h${i}`, 26, 8, (c, w, h) => drawPen(c, w, h, false, body, hi, lo));
  prop(`cu_pen_v${i}`, 8, 26, (c, w, h) => drawPen(c, h, w, true, body, hi, lo));
});

prop('cu_pack_big', 24, 18, (c, w, h) => {
  c.rect(0, 0, w, 6, P.H); c.rect(0, 0, w, 1, P.H2);            // top sheet
  c.rect(0, 6, w, h - 6, P.H2);
  for (let y = 7; y < h; y += 2) c.rect(0, y, w, 1, P.W3);       // sheet edges
  c.rect(0, 9, w, 4, P.G2); c.rect(0, 9, w, 1, P.G3);            // paper band
});
prop('cu_pack_small', 24, 12, (c, w, h) => {
  c.rect(0, 0, w, 4, P.H); c.rect(0, 0, w, 1, P.H2);
  c.rect(0, 4, w, h - 4, P.H2);
  for (let y = 5; y < h; y += 2) c.rect(0, y, w, 1, P.W3);
});
prop('cu_scrap', 28, 34, (c, w, h) => {
  c.rect(0, 0, w, h, P.H);
  for (let y = 6; y < h - 2; y += 5) c.rect(1, y, w - 2, 1, P.B);  // ruled lines
  c.rect(5, 0, 1, h, P.G2);                                         // margin
  c.rect(w - 4, 0, 4, 4, P.H2);                                     // folded corner
});

// ---- Structural close-up props. Slot coordinates are exported to closeup.layout.json. ----
const LAYOUT_CU = {};

// Pen case: 10 columns x 2 rows of 10x30 slots; a vertical pen (8x26) sits centred in a slot.
const CASE_W = 130, CASE_H = 74, SLOT_W = 12, SLOT_COLS = 10;
prop('cu_case', CASE_W, CASE_H, (c, w, h) => {
  c.bevel(0, 0, w, h, P.K2, P.K3, P.K1);
  c.rect(3, 3, w - 6, h - 6, P.N);
  for (let r = 0; r < 2; r++) for (let i = 0; i < SLOT_COLS; i++) {
    c.rect(4 + i * SLOT_W, 4 + r * 32, 10, 30, P.W1);
    c.rect(4 + i * SLOT_W, 4 + r * 32, 10, 1, P.W2);        // lit top lip of each slot
  }
});
LAYOUT_CU.case = {
  w: CASE_W, h: CASE_H,
  // centre of each slot in sprite pixels (incl. the 1px outline), row-major
  slots: Array.from({ length: 2 * SLOT_COLS }, (_, k) => ({
    x: 1 + 4 + (k % SLOT_COLS) * SLOT_W + 5,
    y: 1 + 4 + Math.floor(k / SLOT_COLS) * 32 + 15,
  })),
};

// Paper tray: 5 pack slots, 25px apart.
const TRAY_W = 130, TRAY_H = 34, TRAY_SLOTS = 5;
prop('cu_tray', TRAY_W, TRAY_H, (c, w, h) => {
  c.bevel(0, 0, w, h, P.K2, P.K3, P.K1);
  c.rect(3, 3, w - 6, h - 9, P.W3);
  c.rect(3, 3, w - 6, 1, P.W2);
  c.rect(3, h - 6, w - 6, 3, P.K1);                         // front lip
  for (let i = 1; i < TRAY_SLOTS; i++) c.rect(3 + i * 25, 4, 1, h - 10, P.W2); // cell dividers
});
LAYOUT_CU.tray = {
  w: TRAY_W, h: TRAY_H,
  slots: Array.from({ length: TRAY_SLOTS }, (_, i) => ({ x: 1 + 3 + i * 25 + 12, y: 1 + 3 + 12 })),
};

// Stock drawer: closed front and open interior share one footprint.
const DR_W = 138, DR_H = 100;
prop('cu_drawer_closed', DR_W, DR_H, (c, w, h) => {
  c.bevel(0, 0, w, h, P.K2, P.K3, P.K1);
  c.bevel(6, 6, w - 12, h - 12, P.K2, P.K1, P.K3);          // inset panel
  c.rect(w / 2 - 14, 18, 28, 6, P.W3); c.rect(w / 2 - 14, 18, 28, 1, P.H); c.rect(w / 2 - 14, 23, 28, 1, P.W1); // handle
  c.bevel(w / 2 - 22, h - 34, 44, 14, P.H, P.H, P.H2);     // label plate (text drawn in-game)
});
prop('cu_drawer_open', DR_W, DR_H, (c, w, h) => {
  c.bevel(0, 0, w, h, P.K1, P.K2, P.O);
  c.rect(3, 3, w - 6, h - 16, P.W1);                        // dark compartment
  c.rect(3, 3, w - 6, 3, P.N); c.rect(3, 3, 3, h - 16, P.N); // shadow from top/left wall
  c.bevel(3, h - 12, w - 6, 9, P.K2, P.K3, P.K1);           // front lip
});
LAYOUT_CU.drawer = {
  w: DR_W, h: DR_H,
  penCols: 4, penRows: 3,
  pens: Array.from({ length: 12 }, (_, k) => ({ x: 22 + (k % 4) * 31, y: 17 + Math.floor(k / 4) * 13 })),
  packs: Array.from({ length: 4 }, (_, i) => ({ x: 24 + i * 30, y: 70 })),
};

// Sticky note: text is drawn by the scene (kept code-native so it stays editable/localisable).
prop('cu_sticky', 105, 58, (c, w, h) => {
  // Green (Timedoor ramp) so it separates from the tan desk; dark navy text sits on it.
  c.rect(0, 0, w, h, P.G3);
  c.rect(0, h - 4, w, 4, P.G2);                             // curl shadow along the bottom
  c.rect(w - 8, h - 8, 8, 8, P.G1);                         // curled corner
  c.rect(w / 2 - 10, 0, 20, 5, P.H2);                       // tape
  c.rect(w / 2 - 10, 0, 20, 1, P.H);
});
LAYOUT_CU.sticky = { w: 105, h: 58 };

// ---- HQ package unpacking (PackageUnpackScene): items, box, packing list, sorting bins ----
// Bags redrawn from the real merch (src/assets/bag1.png, bag2.png):
//   green drawstring backpack with the bear / robot / drone scene,
//   black tote with the Timedoor logo and colourful shapes along the bottom.
// The palette has no red/yellow, so those shapes use the nearest swatches (orange-tan, tan, blue, green).
const BLACK = P.O; // true dark body; the 1px outline merges with it, which reads as black cloth

function drawGreenBag(c, w, h) {
  // body sits 3px in from each side so the drawstring cords can hang outside it
  const m = 3;
  for (let y = 4; y < h; y++) {
    const gather = y < 9 ? (9 - y) : 0;                       // narrow at the gathered top
    const round = y > h - 3 ? (y - (h - 3)) + (y === h - 1 ? 1 : 0) : 0;
    const inset = m + gather + round;
    c.rect(inset, y, w - 2 * inset, 1, P.G2);
    c.px(inset, y, P.G3); c.px(w - 1 - inset, y, P.G1);
  }
  c.rect(m + 5, 3, w - 2 * (m + 5), 2, P.G1);                  // gathered neck
  // black drawstring: loops over the top, ends hang down both sides
  c.rect(m + 4, 2, w - 2 * (m + 4), 1, P.O);
  c.rect(1, 3, 1, 18, P.O); c.rect(w - 2, 3, 1, 18, P.O);
  c.rect(2, 3, m + 2, 1, P.O); c.rect(w - m - 4, 3, m + 2, 1, P.O);
  // wordmark: logo mark + two lines
  c.rect(6, 10, 2, 3, P.H); c.rect(9, 10, 8, 1, P.H); c.rect(9, 12, 6, 1, P.H);
  // drone (top right)
  c.rect(16, 15, 3, 1, P.H); c.px(17, 16, P.W3); c.px(15, 15, P.H); c.px(19, 15, P.H);
  // robot (left)
  c.rect(5, 21, 4, 4, P.W3); c.rect(5, 21, 4, 1, P.H); c.px(6, 23, P.G1); c.px(8, 23, P.G1);
  // bear (centre): ears, head, snout, body, paws
  c.px(10, 16, P.K1); c.px(15, 16, P.K1);
  c.ellipse(12, 19, 3, 3, P.K2);
  c.px(11, 18, P.O); c.px(14, 18, P.O); c.rect(11, 20, 3, 2, P.K3); c.px(12, 20, P.O);
  c.rect(9, 22, 8, 4, P.K1); c.rect(9, 22, 8, 1, P.K2);
  c.rect(10, 23, 2, 2, P.B);                                   // little blue gadget in its paws
  // grass mound
  c.rect(7, h - 4, w - 14, 2, P.G1);
}

function drawBlackTote(c, w, h) {
  // long straps rising from the body
  c.rect(6, 0, 2, 10, P.W1); c.rect(w - 8, 0, 2, 10, P.W1); c.rect(6, 0, w - 12, 1, P.W1);
  c.rect(6, 0, 1, 10, P.W2);
  // body
  c.rect(0, 9, w, h - 9, BLACK); c.rect(0, 9, w, 1, P.N); c.rect(0, 9, 1, h - 9, P.N);
  // logo block + wordmark lines
  c.rect(5, 13, 3, 5, P.H); c.rect(5, 15, 5, 1, P.H);
  c.rect(10, 13, 9, 1, P.H); c.rect(10, 15, 7, 1, P.H);
  c.rect(5, 19, 14, 1, P.W1);                      // social handles line
  // colourful shapes along the bottom: grey rounded squares, orange asterisk, blue square, green brackets, tan circle
  c.rect(2, h - 5, 4, 4, P.W2); c.rect(7, h - 3, 3, 3, P.W2);
  [[2, 22], [3, 21], [3, 23], [4, 22]].forEach(([x, y]) => c.px(x, y, P.K2));  // asterisk
  c.rect(7, h - 8, 4, 4, P.B);
  c.rect(12, h - 7, 2, 1, P.G2); c.rect(11, h - 6, 2, 1, P.G2); c.rect(10, h - 5, 4, 1, P.G2); c.rect(11, h - 4, 2, 1, P.G2); // chevron
  c.rect(15, h - 7, 2, 1, P.G3); c.rect(16, h - 6, 2, 1, P.G3); c.rect(15, h - 5, 3, 1, P.G3);
  c.ellipse(w - 5, h - 5, 3, 3, P.K3); c.px(w - 5, h - 5, BLACK);
}
prop('cu_pk_bag_black', 26, 30, (c, w, h) => drawBlackTote(c, w, h));
prop('cu_pk_bag_green', 26, 30, (c, w, h) => drawGreenBag(c, w, h));

// T-shirts: black or white; chest design per student level, taken from the same Timedoor artwork:
//   level 1 = the bear, level 2 = the robot, level 3 = the shape cluster.
function drawShirt(c, w, h, white, level) {
  const body = white ? P.H : BLACK, hi = white ? P.H : P.N, lo = white ? P.H2 : BLACK;
  c.rect(0, 3, w, 7, body); c.rect(0, 3, w, 1, hi); c.rect(0, 9, w, 1, white ? P.H2 : P.N);   // sleeves
  c.bevel(4, 3, w - 8, h - 3, body, hi, lo);                                                   // torso
  c.rect(w / 2 - 3, 3, 6, 2, white ? P.H2 : P.N);                                              // collar
  const cx = Math.floor(w / 2), cy = 12;
  if (level === 1) {                                   // bear
    c.px(cx - 3, cy - 3, P.K1); c.px(cx + 3, cy - 3, P.K1);
    c.ellipse(cx, cy, 3, 3, P.K2);
    c.px(cx - 1, cy - 1, P.O); c.px(cx + 1, cy - 1, P.O); c.rect(cx - 1, cy + 1, 3, 1, P.K3);
  } else if (level === 2) {                            // robot
    c.px(cx, cy - 5, P.G2); c.px(cx, cy - 4, P.W1);
    c.rect(cx - 3, cy - 3, 7, 6, P.W2); c.rect(cx - 3, cy - 3, 7, 1, P.W3);
    c.rect(cx - 2, cy - 1, 5, 2, P.N); c.px(cx - 1, cy - 1, P.G3); c.px(cx + 1, cy - 1, P.G3);
  } else {                                             // shapes
    c.rect(cx - 4, cy - 2, 3, 3, P.B);
    c.rect(cx, cy - 3, 3, 1, P.G2); c.rect(cx + 1, cy - 2, 3, 1, P.G2); c.rect(cx, cy - 1, 3, 1, P.G2);
    c.ellipse(cx + 1, cy + 3, 2, 2, P.K3); c.rect(cx - 4, cy + 2, 2, 2, P.W2);
  }
}
for (const [name, white] of [['black', false], ['white', true]]) {
  for (const lv of [1, 2, 3]) prop(`cu_pk_shirt_${name}_${lv}`, 24, 24, (c, w, h) => drawShirt(c, w, h, white, lv));
}

prop('cu_pk_sticker', 16, 14, (c, w, h) => {
  c.bevel(0, 0, w, h, P.H, P.H, P.H2);
  [[2, 2, P.G2], [8, 2, P.B], [2, 7, P.K2], [8, 7, P.G3]].forEach(([x, y, col]) => c.rect(x, y, 4, 4, col));
  c.rect(w - 4, 0, 4, 3, P.H2);
});

function drawRobot(c, w, h, broken) {
  const ax = broken ? 13 : 10;
  c.rect(ax, 0, 2, 4, P.W2); c.rect(ax - (broken ? 1 : 0), 0, 3, 2, broken ? P.K3 : P.G3);   // antenna (bent when broken)
  c.bevel(2, 4, w - 4, 11, P.W3, P.H, P.W1);                                          // head
  c.rect(4, 7, w - 8, 5, P.N);                                                        // visor
  c.rect(6, 8, 3, 3, P.G3); c.rect(w - 9, 8, 3, 3, broken ? P.N : P.G3);              // eyes
  c.bevel(4, 15, w - 8, 6, P.W2, P.W3, P.W1);                                         // body
  c.rect(w / 2 - 1, 17, 2, 2, P.G2);                                                  // chest light
  c.rect(2, 21, 5, 3, P.N); c.rect(w - 7, 21, 5, 3, P.N);                             // wheels
  if (broken) {                                                                        // crack + sparks
    for (let i = 0; i < 9; i++) c.px(4 + i, 5 + Math.floor(i * 0.9), P.O);
    c.px(15, 3, P.K3); c.px(17, 5, P.K3); c.px(3, 18, P.K3);
  }
}
prop('cu_pk_robot', 24, 26, (c, w, h) => drawRobot(c, w, h, false));
prop('cu_pk_robot_broken', 24, 26, (c, w, h) => drawRobot(c, w, h, true));

function drawLaptop(c, w, h, broken) {
  c.bevel(2, 0, w - 4, 12, P.N, P.W1, P.O);                                            // lid/screen frame
  c.rect(4, 2, w - 8, 8, P.B); c.rect(4, 2, w - 8, 1, P.H);
  c.bevel(0, 12, w, h - 12, P.W3, P.H, P.W1);                                         // keyboard deck
  for (let r = 0; r < 2; r++) for (let k = 0; k < 8; k++) c.rect(3 + k * 3, 14 + r * 3, 2, 2, P.W2);
  if (broken) {
    for (let i = 0; i < 10; i++) c.px(8 + i, 2 + Math.floor(i * 0.8), P.H);            // crack
    c.rect(w - 12, 3, 8, 6, P.N); c.px(w - 13, 4, P.H);                                // dead patch
  }
}
prop('cu_pk_laptop', 30, 22, (c, w, h) => drawLaptop(c, w, h, false));
prop('cu_pk_laptop_broken', 30, 22, (c, w, h) => drawLaptop(c, w, h, true));

// Cardboard HQ box: taped shut, then open from above.
prop('cu_pk_box_closed', 74, 58, (c, w, h) => {
  c.bevel(0, 0, w, h, P.K2, P.K3, P.K1);
  c.rect(w / 2 - 4, 0, 8, h, P.H2); c.rect(w / 2 - 4, 0, 8, 1, P.H);                  // packing tape
  c.rect(w / 2, 2, 1, h - 4, P.W3);
  c.bevel(8, 14, 22, 18, P.H, P.H, P.H2);                                             // shipping label
  [10, 12, 15, 17, 18, 21, 24, 26].forEach(x => c.rect(x, 24, 1, 6, P.O));            // barcode
  c.rect(10, 17, 12, 1, P.W2); c.rect(10, 19, 9, 1, P.W2);
});
prop('cu_pk_box_open', 74, 58, (c, w, h) => {
  c.bevel(0, 0, w, h, P.K1, P.K2, P.O);
  c.rect(4, 4, w - 8, h - 8, P.O);                                                    // dark cavity
  c.rect(0, 0, w, 4, P.K3); c.rect(0, h - 4, w, 4, P.K2);                             // folded flaps
  c.rect(0, 0, 4, h, P.K3); c.rect(w - 4, 0, 4, h, P.K2);
});

// Packing list (Surat Jalan). The text is drawn by the scene.
prop('cu_pk_list', 100, 110, (c, w, h) => {
  c.bevel(0, 0, w, h, P.H, P.H, P.H2);
  c.rect(0, 0, w, 11, P.G2); c.rect(0, 0, w, 1, P.G3);                                // header band
  c.rect(w / 2 - 8, 0, 16, 3, P.W1);                                                  // clip
});

// Sorting bin: dark mouth (shows the counter), front panel (shows the label).
prop('cu_pk_bin', 34, 46, (c, w, h) => {
  c.bevel(0, 0, w, h, P.K2, P.K3, P.K1);
  c.rect(2, 2, w - 4, 24, P.W1); c.rect(2, 2, w - 4, 3, P.N);                          // mouth
  c.bevel(3, 28, w - 6, 14, P.H, P.H, P.H2);                                           // label plate
});
LAYOUT_CU.bin = { w: 34, h: 46, mouth: { x: 1 + 2, y: 1 + 2, w: 28, h: 24 }, plate: { x: 1 + 3, y: 1 + 28, w: 26, h: 14 } };
LAYOUT_CU.package = {
  bag: { w: 26, h: 30 }, shirt: { w: 24, h: 24 }, sticker: { w: 16, h: 14 },
  robot: { w: 24, h: 26 }, laptop: { w: 30, h: 22 }, box: { w: 74, h: 58 }, list: { w: 100, h: 110 }
};

// ---- Classroom seating puzzle (ClassroomSeatingScene). One grid cell = 16 native px = 32 on screen. ----
// Raw props have no auto-outline so they can sit exactly on the grid.
const propRaw = (name, w, h, draw) => { const c = new Cv(w, h, 0); draw(c, w, h); props[name] = c; };

// 4-cell desk (64x16): wood top, a seam on every cell, dark outline on the edges.
propRaw('cu_cr_desk', 64, 16, (c, w, h) => {
  c.bevel(0, 0, w, h, P.K2, P.K3, P.K1);
  for (let x = 16; x < w; x += 16) c.rect(x - 1, 2, 1, h - 4, P.K1);
  c.rect(0, 0, w, 1, P.O); c.rect(0, h - 1, w, 1, P.O); c.rect(0, 0, 1, h, P.O); c.rect(w - 1, 0, 1, h, P.O);
});

// Island: two desks pushed together face to face = a 2x2 block (32x32), seam down the middle.
propRaw('cu_cr_island', 32, 32, (c, w, h) => {
  c.bevel(0, 0, w, h, P.K2, P.K3, P.K1);
  c.rect(1, h / 2 - 1, w - 2, 1, P.K1); c.rect(1, h / 2, w - 2, 1, P.K3);              // where the two desks meet
  c.rect(w / 2 - 1, 1, 1, h / 2 - 2, P.K1); c.rect(w / 2 - 1, h / 2 + 2, 1, h / 2 - 3, P.K1); // each desk is two cells wide
  c.rect(0, 0, w, 1, P.O); c.rect(0, h - 1, w, 1, P.O); c.rect(0, 0, 1, h, P.O); c.rect(w - 1, 0, 1, h, P.O);
});

// Chairs, top-down. Backrest on the side away from the desk; wobbly chairs use the SAME art.
function drawChair(c, w, h, backAtTop) {
  c.bevel(1, 1, w - 2, h - 2, P.N, P.W1, P.O);
  c.rect(2, backAtTop ? 1 : h - 4, w - 4, 3, P.O);
  c.rect(3, backAtTop ? 2 : h - 3, w - 6, 1, P.W1);
}
prop('cu_cr_chair_n', 16, 16, (c, w, h) => drawChair(c, w, h, false));   // sits below its desk, faces north
prop('cu_cr_chair_s', 16, 16, (c, w, h) => drawChair(c, w, h, true));    // sits above its desk, faces south

// Small laptop on the desk in front of a seat; the screen faces the person.
function drawDeskLaptop(c, w, h, screenAtTop) {
  const screenY = screenAtTop ? 0 : h - 3, keysY = screenAtTop ? 3 : 0;
  c.rect(0, screenY, w, 3, P.N); c.rect(1, screenY + 1, w - 2, 1, P.B);
  c.rect(0, keysY, w, h - 3, P.W3); c.rect(1, keysY + 1, w - 2, 1, P.W2);
}
prop('cu_cr_laptop_n', 12, 10, (c, w, h) => drawDeskLaptop(c, w, h, true));
prop('cu_cr_laptop_s', 12, 10, (c, w, h) => drawDeskLaptop(c, w, h, false));

// Wall outlet: plain plate until tested, then the revealed state.
function drawOutlet(c, w, h, state) {
  c.bevel(0, 0, w, h, state === 'scorched' ? P.W2 : P.H, state === 'scorched' ? P.W2 : P.H, state === 'scorched' ? P.W1 : P.H2);
  c.rect(1, 2, 2, 2, P.O); c.rect(w - 3, 2, 2, 2, P.O);
  if (state === 'ok') c.rect(w / 2 - 1, h - 2, 2, 1, P.G3);                 // green light
  if (state === 'dead') c.rect(w / 2 - 1, h - 2, 2, 1, P.W1);               // dark light
  if (state === 'scorched') { c.rect(0, h - 3, w, 3, P.O); c.px(2, 1, P.O); c.px(w - 3, 1, P.O); } // burn marks
}
prop('cu_cr_outlet', 10, 10, (c, w, h) => drawOutlet(c, w, h, 'unknown'));
prop('cu_cr_outlet_ok', 10, 10, (c, w, h) => drawOutlet(c, w, h, 'ok'));
prop('cu_cr_outlet_dead', 10, 10, (c, w, h) => drawOutlet(c, w, h, 'dead'));
prop('cu_cr_outlet_scorched', 10, 10, (c, w, h) => drawOutlet(c, w, h, 'scorched'));

// Delivery box left in the aisle.
prop('cu_cr_box', 16, 16, (c, w, h) => {
  c.bevel(0, 0, w, h, P.K2, P.K3, P.K1);
  c.rect(w / 2 - 1, 0, 2, h, P.H2); c.rect(0, h / 2 - 1, w, 2, P.H2);
  c.rect(2, 2, 3, 2, P.H);
});
LAYOUT_CU.classroom = { cell: 16, island: { w: 32, h: 32 }, chair: { w: 16, h: 16 }, laptop: { w: 12, h: 10 }, outlet: { w: 10, h: 10 }, box: { w: 16, h: 16 } };

LAYOUT_CU.pen = { hW: 26, hH: 8, vW: 8, vH: 26, variants: PEN_COLORS.length };
LAYOUT_CU.pack = { w: 24, bigH: 18, smallH: 12 };
LAYOUT_CU.scrap = { w: 28, h: 34 };

// Close-up background: exactly the room's floor tile (drawFloor), so zooming in on a table
// keeps the same floor colour and grout lines as the room the player just left.
// Kept under the old file name cu_desk_tile.png so scenes don't need renaming.
function buildDeskTile() {
  const t = new Cv(32, 32);
  drawFloor(t, 0, 0);
  t.save(path.join(OUT_ASSETS, 'cu_desk_tile.png'));
  return t;
}

// ---------- Manager NPC sprite (32x48) ----------
function buildManager() {
  const c = new Cv(32, 48, 1);
  c.rect(8, 41, 6, 5, P.O); c.rect(18, 41, 6, 5, P.O);          // shoes
  c.rect(9, 28, 6, 13, P.N); c.rect(17, 28, 6, 13, P.N);        // trousers
  c.rect(9, 28, 6, 1, P.W1);
  c.bevel(7, 14, 18, 16, P.G2, P.G3, P.G1);                     // Timedoor-green polo
  c.rect(4, 15, 4, 13, P.G2); c.rect(24, 15, 4, 13, P.G2);      // arms
  c.rect(4, 15, 4, 1, P.G3); c.rect(4, 27, 4, 3, P.K3); c.rect(24, 27, 4, 3, P.K3); // hands
  c.rect(19, 18, 4, 3, P.H); c.rect(19, 18, 4, 1, P.H2);         // name badge
  c.rect(14, 14, 4, 3, P.K3);                                    // neck
  c.bevel(9, 2, 14, 14, P.K3, P.H, P.K2);                        // head
  c.rect(9, 1, 14, 5, P.K1); c.rect(8, 4, 2, 6, P.K1); c.rect(22, 4, 2, 6, P.K1); // hair
  c.rect(9, 1, 14, 1, P.K2);
  c.rect(12, 9, 2, 2, P.O); c.rect(18, 9, 2, 2, P.O);            // eyes
  c.rect(14, 13, 4, 1, P.K1);                                    // smile
  c.outline();
  c.save(path.join(OUT_ASSETS, 'manager.png'));
}

// ---------- Layout ----------
const LAYOUT = [
  '####################',
  '####################',
  '########..#........#',
  '########..#........#',
  '#.........#........#',
  '#.........#........#',
  '#.........#........#',
  '#.........#........#',
  '#..................#',
  '#..................#',
  '#.........#........#',
  '#.........#........#',
  '#######...##########',
  '#######DDD##########',
  '       MMM          ',
];
const ROWS = LAYOUT.length, COLS = LAYOUT[0].length;
const at = (r, c) => (LAYOUT[r] && LAYOUT[r][c]) || ' ';
const isFloor = ch => ch === '.' || ch === 'D' || ch === 'M';

function wallTile(r, c) {
  const n = isFloor(at(r - 1, c)), s = isFloor(at(r + 1, c)), w = isFloor(at(r, c - 1)), e = isFloor(at(r, c + 1));
  if (s) return TILE.wallFace;
  if (n) return TILE.wallCapN;
  if (w && e) return TILE.wallLR;
  if (w) return TILE.wallL;
  if (e) return TILE.wallR;
  return TILE.wallTop;
}
const floorVariant = (r, c) => { const h = (r * 7 + c * 13 + r * c) % 11; return h === 0 ? TILE.floorC : h < 3 ? TILE.floorB : TILE.floorA; };

// Placements: x,y = top-left in px. collide = [dx, dy, w, h] relative to the prop.
const PLACE = [
  { p: 'logo_banner', x: 47, y: 64 },
  { p: 'wall_tv', x: 413, y: 14 },
  { p: 'poster', x: 366, y: 12 },
  { p: 'poster', x: 556, y: 12 },
  { p: 'chair_navy', x: 138, y: 146, collide: [4, 12, 16, 14] },
  { p: 'chair_navy', x: 176, y: 146, collide: [4, 12, 16, 14] },
  { p: 'reception_desk', x: 96, y: 168, collide: [2, 8, 158, 48] },
  { p: 'bookshelf_wall', x: 264, y: 66, collide: [0, 26, 50, 62] },
  { p: 'water_dispenser', x: 290, y: 174, collide: [0, 14, 22, 32] },
  { p: 'trash_bin', x: 266, y: 194, collide: [0, 4, 20, 20] },
  { p: 'plant_tall', x: 40, y: 190, collide: [6, 28, 20, 20] },
  { p: 'plant_small', x: 36, y: 262, collide: [4, 20, 18, 14] },
  { p: 'sofa', x: 34, y: 294, collide: [0, 0, 38, 86] },
  { p: 'coffee_table', x: 76, y: 314, collide: [2, 4, 38, 34] },
  { p: 'ottoman', x: 84, y: 356, collide: [0, 0, 38, 28] },
  { p: 'round_table', x: 190, y: 252, collide: [2, 4, 52, 48] },
  { p: 'chair_green', x: 164, y: 264, collide: [5, 5, 18, 18] },
  { p: 'chair_white', x: 244, y: 264, collide: [5, 5, 18, 18] },
  { p: 'chair_white', x: 204, y: 224, collide: [5, 5, 18, 18] },
  { p: 'round_table', x: 148, y: 306, collide: [2, 4, 52, 48] },
  { p: 'chair_green', x: 122, y: 318, collide: [5, 5, 18, 18] },
  { p: 'chair_white', x: 202, y: 318, collide: [5, 5, 18, 18] },
  { p: 'chair_white', x: 162, y: 354, collide: [5, 5, 18, 18] },
  { p: 'plant_small', x: 196, y: 346, collide: [4, 20, 18, 14] },
  { p: 'plant_small', x: 322, y: 346, collide: [4, 20, 18, 14] },
  { p: 'bookcase_small', x: 360, y: 136, collide: [0, 14, 36, 52] },
  { p: 'chair_navy', x: 436, y: 142, collide: [4, 12, 16, 14] },
  { p: 'chair_navy', x: 488, y: 142, collide: [4, 12, 16, 14] },
  { p: 'desk_block', x: 420, y: 168, collide: [0, 0, 130, 66] },
  { p: 'chair_navy', x: 436, y: 235, collide: [4, 12, 16, 14] },
  { p: 'chair_navy', x: 488, y: 235, collide: [4, 12, 16, 14] },
  { p: 'chair_navy', x: 436, y: 264, collide: [4, 12, 16, 14] },
  { p: 'chair_navy', x: 488, y: 264, collide: [4, 12, 16, 14] },
  { p: 'desk_block', x: 420, y: 290, collide: [0, 0, 130, 66] },
  { p: 'chair_navy', x: 436, y: 355, collide: [4, 12, 16, 14] },
  { p: 'chair_navy', x: 488, y: 355, collide: [4, 12, 16, 14] },
  { p: 'plant_tall', x: 566, y: 106, collide: [6, 28, 20, 20] },
  { p: 'corner_shelf', x: 572, y: 284, collide: [0, 16, 34, 70] },
];

// ---------- Build everything ----------
function packAtlas(names, base) {
  const PAD = 2, WIDTH = 512;
  let x = PAD, y = PAD, rowH = 0;
  const frames = {};
  names.forEach(n => {
    const p = props[n];
    if (x + p.w + PAD > WIDTH) { x = PAD; y += rowH + PAD; rowH = 0; }
    frames[n] = { x, y, w: p.w, h: p.h };
    x += p.w + PAD; rowH = Math.max(rowH, p.h);
  });
  const H = y + rowH + PAD;
  const sheet = new Cv(WIDTH, H);
  names.forEach(n => sheet.blit(props[n], frames[n].x, frames[n].y));
  sheet.save(path.join(OUT_ASSETS, `${base}.png`));
  const atlas = {
    frames: Object.fromEntries(Object.entries(frames).map(([n, f]) => [n, {
      frame: f, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: f.w, h: f.h }, sourceSize: { w: f.w, h: f.h },
    }])),
    meta: { image: `${base}.png`, format: 'RGBA8888', size: { w: WIDTH, h: H }, scale: '1' },
  };
  fs.writeFileSync(path.join(OUT_ASSETS, `${base}.json`), JSON.stringify(atlas, null, 2));
}

function pack() {
  const all = Object.keys(props);
  const closeup = all.filter(n => n.startsWith('cu_'));
  packAtlas(all.filter(n => !n.startsWith('cu_')), 'props');
  packAtlas(closeup, 'closeup');
  // individual frames, so QA scripts and provenance can address each asset
  const dir = path.join(OUT_ASSETS, 'closeup');
  fs.mkdirSync(dir, { recursive: true });
  closeup.forEach(n => props[n].save(path.join(dir, `${n}.png`)));
  fs.writeFileSync(path.join(OUT_ASSETS, 'closeup.layout.json'), JSON.stringify(LAYOUT_CU, null, 2));
}

// Fail the build if any opaque pixel is outside the 16-colour palette.
function verifyPalette() {
  const allowed = new Set(Object.values(P).map(c => c.join(',')));
  const bad = [];
  const check = (name, cv) => {
    for (let i = 0; i < cv.d.length; i += 4) {
      if (cv.d[i + 3] === 0) continue;
      if (!allowed.has([...cv.d.subarray(i, i + 4)].join(','))) { bad.push(name); return; }
    }
  };
  Object.entries(props).forEach(([n, cv]) => check(n, cv));
  if (bad.length) throw new Error('off-palette pixels in: ' + bad.join(', '));
}

function buildMap() {
  const floor = [], walls = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = at(r, c);
    floor.push(ch === '.' || ch === 'D' ? floorVariant(r, c) + 1 : 0);
    walls.push(ch === '#' ? wallTile(r, c) + 1 : ch === 'D' ? TILE.door + 1 : ch === 'M' ? TILE.mat + 1 : 0);
  }
  let id = 1;
  const propObjs = [], collObjs = [];
  PLACE.forEach(pl => {
    const p = props[pl.p];
    propObjs.push({ id: id++, name: pl.p, type: 'prop', x: pl.x, y: pl.y, width: p.w, height: p.h, rotation: 0, visible: true,
      properties: [{ name: 'frame', type: 'string', value: pl.p }]
        // Solid props depth-sort against the player by the bottom edge of their hitbox;
        // wall decor (banner, TV, posters) has no hitbox and stays behind everything.
        .concat(pl.collide ? [{ name: 'sortY', type: 'int', value: pl.y + pl.collide[1] + pl.collide[3] }] : []) });
    if (pl.collide) {
      const [dx, dy, w, h] = pl.collide;
      collObjs.push({ id: id++, name: pl.p, type: 'collider', x: pl.x + dx, y: pl.y + dy, width: w, height: h, rotation: 0, visible: true });
    }
  });
  const layer = (lid, name, data) => ({ id: lid, name, type: 'tilelayer', width: COLS, height: ROWS, x: 0, y: 0, opacity: 1, visible: true, data });
  const objLayer = (lid, name, objects) => ({ id: lid, name, type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects });
  const map = {
    compressionlevel: -1, width: COLS, height: ROWS, tilewidth: T, tileheight: T,
    type: 'map', orientation: 'orthogonal', renderorder: 'right-down', infinite: false,
    nextlayerid: 5, nextobjectid: id, tiledversion: '1.10.2', version: '1.10',
    tilesets: [{
      firstgid: 1, name: 'timedoor_tiles', image: 'generated/tileset.png',
      imagewidth: TILE_COLS * T, imageheight: Math.ceil(TILE_COUNT / TILE_COLS) * T,
      tilewidth: T, tileheight: T, tilecount: TILE_COLS * Math.ceil(TILE_COUNT / TILE_COLS), columns: TILE_COLS, margin: 0, spacing: 0,
      tiles: COLLIDING.map(i => ({ id: i, properties: [{ name: 'collides', type: 'bool', value: true }] })),
    }],
    layers: [layer(1, 'floor', floor), layer(2, 'walls', walls), objLayer(3, 'props', propObjs), objLayer(4, 'collision', collObjs)],
  };
  fs.writeFileSync(OUT_MAP, JSON.stringify(map, null, 1));
}

buildTileset();
buildManager();
buildDeskTile();
verifyPalette();
pack();
buildMap();
console.log(`tileset ${TILE_COUNT} tiles, ${Object.keys(props).length} props, ${PLACE.length} placements -> src/assets/generated, src/data/episode1.tmj.json`);
