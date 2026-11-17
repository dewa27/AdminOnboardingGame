// Stress test for the Task 3 seating puzzle (rules + generator + scoring).
//   node tools/test-classroom.mjs
// Checks, over thousands of random classrooms, that every generated puzzle is fair:
// it has a real problem and a non-problem, the truth matches what is actually in the room,
// the target seat count is reachable by perfect placement, and perfect play scores 100%.
import { newDay, buildTask } from '../src/data/ep1Tasks.js';
import { buildResult } from '../src/systems/inspectScoring.js';
import {
  OUTLETS, DOOR_CELLS, DESKS, SEATS_PER_ISLAND, seatSpots, deskFor, matchPower, maxPoweredSeats, aisleStatus
} from '../src/systems/seatingRules.js';

let bad = 0;
const fail = m => { if (bad++ < 10) console.log('FAIL', m); };

// --- static facts about the room
const spots = seatSpots();
if (spots.length !== DESKS.length * SEATS_PER_ISLAND) fail(`expected ${DESKS.length * SEATS_PER_ISLAND} seat spots, got ${spots.length}`);
const full = maxPoweredSeats(OUTLETS);
if (full < 8) fail(`with every outlet the room only powers ${full} seats (a class can be 8)`);
console.log(`room: ${spots.length} seat spots, powers ${full} seats with all outlets;`,
  OUTLETS.map(d => `without ${d.id}: ${maxPoweredSeats(OUTLETS.filter(o => o.id !== d.id))}`).join(', '));
if (aisleStatus([], []).ok !== true) fail('empty room has no aisle');
if (aisleStatus([], DOOR_CELLS).ok !== false) fail('boxes on both door cells do not block the aisle');
if (spots.some(s => !deskFor(s.c, s.r))) fail('a seat spot has no desk');
if (deskFor(3, 3) !== null || deskFor(6, 3) !== null) fail('the sides of an island must not be seats');

// --- generated puzzles
const seen = { seatShort: 0, powerFault: 0, boxes: 0, powerShortfall: 0, ok: 0 };
const N = 5000;
for (let i = 0; i < N; i++) {
  const day = newDay();
  if (day.students < 5 || day.students > 8) fail('class size ' + day.students);
  const t = buildTask('classroom', day);
  const need = day.students;
  const cu = t.closeup;

  const issues = t.objects.filter(o => o.truth.correct !== 'ignore').length;
  if (issues < 1 || issues === t.objects.length) fail('issue count ' + issues);
  if (/undefined|NaN|\[object/.test(JSON.stringify(t))) fail('text: ' + JSON.stringify(t).match(/.{40}(undefined|NaN|\[object).{10}/)?.[0]);

  const usable = cu.stock.filter(c => !c.wobbly).length;
  const working = OUTLETS.filter(o => cu.outlets.find(x => x.id === o.id).state === 'ok');
  const truth = Object.fromEntries(t.objects.map(o => [o.id, o.truth.correct]));
  if ((usable < need) !== (truth.seat === 'report')) fail('seat truth does not match the stock');
  if ((working.length < OUTLETS.length) !== (truth.power === 'report')) fail('power truth does not match the outlets');
  if ((cu.boxes > 0) !== (truth.aisle === 'fix')) fail('aisle truth does not match the boxes');
  if (cu.stock.length > 16) fail('storeroom too big: ' + cu.stock.length);
  if (!cu.stock.some(c => c.wobbly)) fail('no wobbly chair to find');
  if (truth.seat === 'report') seen.seatShort++;
  if (truth.power === 'report') seen.powerFault++;
  if (cu.boxes) seen.boxes++;
  if (maxPoweredSeats(working) < need) seen.powerShortfall++;
  if (issues === 1) seen.ok++;

  // the target is reachable by perfect placement, and that placement leaves the aisle open
  const cells = spots.map(s => deskFor(s.c, s.r));
  const m = matchPower(cells, working);
  const chosen = spots.filter((_, idx) => m.assigned[idx]).slice(0, Math.min(cu.target, usable));
  const powered = matchPower(chosen.map(s => deskFor(s.c, s.r)), working).count;
  if (powered < cu.target) fail(`target ${cu.target} unreachable (got ${powered}); need=${need} usable=${usable} working=${working.length}`);
  if (cu.target > need) fail('target above the class size');
  if (!aisleStatus(chosen, []).ok) fail('best layout blocks the aisle');

  // perfect play scores 100%; opening an outlet cover is always penalised
  const opt = {};
  t.objects.forEach(o => {
    opt[o.id] = o.truth.correct === 'report' ? { action: 'report', reason: o.truth.reasons[0], urgent: o.truth.urgent }
      : o.truth.correct === 'fix' ? { action: 'fix' } : { action: 'ignore' };
  });
  const best = buildResult(t, opt);
  if (best.percent !== 100) fail('perfect play scored ' + best.percent);
  const opened = buildResult(t, { ...opt, power: { action: 'fix' } });
  if (opened.items.find(x => x.id === 'power').points >= best.items.find(x => x.id === 'power').points) fail('opening the cover is not penalised');
}
console.log(`${N} classrooms:`, seen);
console.log(bad ? `${bad} failures` : 'all invariants hold');
process.exit(bad ? 1 : 0);
