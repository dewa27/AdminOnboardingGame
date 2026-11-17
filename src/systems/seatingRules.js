// Rules for the classroom seating puzzle (Task 3). Pure functions, no Phaser, no DOM, so the
// task generator, the scene and the tests all use the very same logic.
//
// The room is a COLS x ROWS grid. Desks are fixed. The player places chairs next to desks.
//   - the room has two "islands": two desks pushed together face to face, a 2x2 block of desk
//     cells. Four students sit around each island: two on the north side, two on the south side
//   - a seat is a chair on a free cell directly above or below an island
//   - each seat needs power: an outlet reaches a desk cell within REACH cells (Manhattan
//     distance) and a working outlet's power strip serves at most CAP seats
//   - the aisle must stay open: at least one door cell is free and every chair has a free
//     neighbouring cell that connects to the door
// Boxes and chairs are obstacles for the aisle; desks are always obstacles.

export const COLS = 14;
export const ROWS = 9;
export const REACH = 6;
export const CAP = 3;

// Two islands, each a 2x2 block of desk cells (c, r is the top-left cell).
export const DESKS = [
  { c: 4, r: 3, w: 2, h: 2 }, { c: 8, r: 3, w: 2, h: 2 }
];
export const SEATS_PER_ISLAND = 4;
// Wall outlets sit just outside the grid.
export const OUTLETS = [
  { id: 'A', c: -1, r: 4, side: 'left' },
  { id: 'B', c: COLS, r: 4, side: 'right' },
  { id: 'C', c: 6, r: -1, side: 'top' }
];
// The door is on the bottom wall; these two grid cells are the way in.
export const DOOR_CELLS = [{ c: 6, r: ROWS - 1 }, { c: 7, r: ROWS - 1 }];

const key = (c, r) => `${c},${r}`;
const deskSet = new Set(DESKS.flatMap(d => Array.from({ length: d.w * d.h }, (_, i) => key(d.c + (i % d.w), d.r + Math.floor(i / d.w)))));

export const inGrid = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS;
export const isDesk = (c, r) => deskSet.has(key(c, r));

// The desk cell a chair at (c, r) is sitting at, or null if it is not a seat. Only the cells
// directly above and below an island are seats (the sides of the block are not).
export function deskFor(c, r) {
  if (isDesk(c, r)) return null;
  if (isDesk(c, r + 1)) return { c, r: r + 1 };      // sitting above the island, facing south
  if (isDesk(c, r - 1)) return { c, r: r - 1 };      // sitting below the island, facing north
  return null;
}

// Facing: a chair below its desk faces north (backrest at the bottom), above faces south.
export const facingFor = (c, r) => (isDesk(c, r + 1) ? 'south' : 'north');

export const reaches = (outlet, cell) => Math.abs(outlet.c - cell.c) + Math.abs(outlet.r - cell.r) <= REACH;

// Every cell where a chair can legally sit.
export function seatSpots() {
  const out = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) if (!isDesk(c, r) && deskFor(c, r)) out.push({ c, r });
  }
  return out;
}

// Assign seats (each given as its desk cell) to working outlets: capacity CAP, reach REACH.
// Classic augmenting-path matching, so a seat can bump another to a different outlet.
export function matchPower(deskCells, outlets) {
  const load = Object.fromEntries(outlets.map(o => [o.id, []]));
  const assigned = Array(deskCells.length).fill(null);

  const place = (i, seen) => {
    for (const o of outlets) {
      if (seen.has(o.id) || !reaches(o, deskCells[i])) continue;
      seen.add(o.id);
      if (load[o.id].length < CAP) { load[o.id].push(i); assigned[i] = o.id; return true; }
      for (const j of [...load[o.id]]) {
        if (place(j, seen)) {                         // j found another outlet
          load[o.id] = load[o.id].filter(x => x !== j);
          load[o.id].push(i); assigned[i] = o.id;
          return true;
        }
      }
    }
    return false;
  };

  let count = 0;
  deskCells.forEach((_, i) => { if (place(i, new Set())) count += 1; });
  return { count, assigned };
}

// Most seats the room could ever power with these outlets, if the player placed them perfectly.
export function maxPoweredSeats(outlets) {
  const cells = seatSpots().map(s => deskFor(s.c, s.r));
  return matchPower(cells, outlets).count;
}

// Aisle check. chairs / boxes: arrays of {c, r}.
export function aisleStatus(chairs, boxes) {
  const blocked = new Set([...deskSet, ...chairs.map(p => key(p.c, p.r)), ...boxes.map(p => key(p.c, p.r))]);
  const seen = new Set();
  const queue = DOOR_CELLS.filter(p => !blocked.has(key(p.c, p.r)));
  queue.forEach(p => seen.add(key(p.c, p.r)));
  for (let i = 0; i < queue.length; i++) {
    const { c, r } = queue[i];
    for (const [dc, dr] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const n = { c: c + dc, r: r + dr };
      if (!inGrid(n.c, n.r) || blocked.has(key(n.c, n.r)) || seen.has(key(n.c, n.r))) continue;
      seen.add(key(n.c, n.r)); queue.push(n);
    }
  }
  const doorOpen = queue.length > 0;
  const unreachable = chairs.filter(p =>
    ![[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dc, dr]) => seen.has(key(p.c + dc, p.r + dr)))).length;
  return { ok: doorOpen && unreachable === 0, doorOpen, unreachable };
}
