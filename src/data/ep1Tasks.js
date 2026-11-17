// Episode 1 inspection tasks. Each station is generated fresh per run from a
// shared "day" (class roster, start time), so the numbers differ every
// playthrough and can't be memorised. The player has to read the reference
// sheet, inspect objects, cross-check, then decide per object:
//   ignore (it's fine) | fix (do it yourself) | report (escalate to Ops)
//
// A task is:
//   { id, title, station, budget, sheet: { title, rows: [[label, value]] },
//     noteLines: [string],           // saved to the player's notes panel
//     objects: [ {
//       id, name, icon,
//       kind: 'check' | 'info',      // 'info' only reveals facts (e.g. a storeroom)
//       weight: 1 | 2,               // how much it matters for the score
//       obs: string,                 // what inspecting reveals
//       truth: { correct, reasons, urgent },   // see systems/inspectScoring.js
//       msg: { ... }                 // per-outcome explanation on the result screen
//     } ] }
//
// `budget` is the number of inspections allowed ("waktu sebelum kelas"). When
// it's lower than the number of objects the player must prioritise.

import { OUTLETS, maxPoweredSeats } from '../systems/seatingRules.js';

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const rp = n => 'Rp ' + n.toLocaleString('id-ID');

export function newDay() {
  return { students: rand(5, 8), mentors: 1, classStart: '15.00' };
}

// Rolls a state per object ('ok' | 'fix' | 'report'), re-rolling until at least
// one object has a problem and at least one is fine — so no run is trivially
// "everything's broken" or "nothing to do".
function rollStates(specs) {
  for (;;) {
    const out = {};
    specs.forEach(([id, opts]) => {
      const total = opts.reduce((s, [, w]) => s + w, 0);
      let r = Math.random() * total;
      out[id] = opts.find(([, w]) => (r -= w) < 0)[0];
    });
    const issues = Object.values(out).filter(s => s !== 'ok').length;
    if (issues >= 1 && issues < specs.length) return out;
  }
}

const msg = (over = {}) => ({
  good: 'Tepat.',
  skipped: 'Belum sempat dicek / diputuskan.',
  missed: 'Masalahnya terlewat.',
  needlessFix: 'Sebenarnya gak ada yang perlu dibenerin di sini.',
  falseAlarm: 'Kondisinya sudah sesuai. Laporan ini gak perlu dan cuma bikin Ops bolak-balik.',
  overReport: 'Ini bisa kamu beresin sendiri (bahan/stoknya ada), gak perlu merepotkan Ops.',
  fixNoStock: 'Gak bisa diberesin sendiri, harusnya dilaporkan ke Ops.',
  ...over
});

const OK = { correct: 'ignore', reasons: [], urgent: false };
const FIX = { correct: 'fix', reasons: [], urgent: false };
const REPORT = (reasons, urgent) => ({ correct: 'report', reasons, urgent });
const truthFor = (state, reasons, urgent) =>
  state === 'ok' ? OK : state === 'fix' ? FIX : REPORT(reasons, urgent);

// A countable supply (pens, paper, chairs) with a requirement and a storeroom.
// 'fix'    : short, but the storeroom covers the gap
// 'report' : short, and the storeroom can't cover it
function supply(state, need, dRange, extra = () => 0) {
  let usable, d = 0, store;
  if (state === 'ok') { usable = need + rand(0, 2); store = rand(4, 12); }
  else if (state === 'fix') { d = rand(...dRange); usable = need - d; store = d + rand(0, 3); }
  else { d = rand(...dRange); usable = need - d; store = rand(0, d - 1); }
  const unusable = extra(state);
  return { usable, deficit: d, store, unusable, raw: usable + unusable };
}

function obj(o) {
  return { kind: 'check', weight: 1, ...o };
}

// ---------- Task 1: Meja Stationeries (close-up scene) ----------
//
// Played in scenes/DeskCloseUpScene.js: the player sees the desk from above and
// physically drags pens into a case and paper packs onto a tray. The numbers
// below decide what's lying on the desk and what's in the stock drawer; the
// 'pen' and 'paper' objects only carry the scoring truth.

const shuffle = arr => arr.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(([, v]) => v);

// 23 sheets -> [10, 10, 3]. Paper comes in packs of 10 plus a loose remainder.
function packsOf(sheets) {
  const out = Array(Math.floor(sheets / 10)).fill(10);
  if (sheets % 10) out.push(sheets % 10);
  return out;
}

function stationery(day) {
  const people = day.students + day.mentors;
  const penNeed = people + 2;
  const paperNeed = people * 2;
  const st = rollStates([['pen', [['ok', 2], ['fix', 2], ['report', 2]]],
                         ['paper', [['ok', 2], ['fix', 2], ['report', 2]]]]);

  const pen = supply(st.pen, penNeed, [2, 4], s => (s === 'ok' ? rand(0, 2) : rand(1, 3)));
  const paper = supply(st.paper, paperNeed, [4, 8]);
  // The drawer only has room for 9 loose pens; 'ok' states can have more stock than that.
  const penStore = Math.min(pen.store, 9);

  return {
    id: 'stationery',
    mode: 'closeup',
    scene: 'DeskCloseUpScene',
    title: 'Meja Stationeries',
    closeup: {
      students: day.students,
      mentors: day.mentors,
      penNeed,
      paperNeed,
      pensOnDesk: shuffle([...Array(pen.usable).fill({ dry: false }), ...Array(pen.unusable).fill({ dry: true })]),
      pensInDrawer: Array(penStore).fill({ dry: false }),
      packsOnDesk: shuffle(packsOf(paper.usable)),
      packsInDrawer: packsOf(paper.store)
    },
    noteLines: [`Roster hari ini: ${day.students} siswa + ${day.mentors} mentor`],
    objects: [
      obj({
        id: 'pen', name: 'Pulpen', icon: '🖊️', weight: 2,
        truth: truthFor(st.pen, ['Stok kurang'], true),
        msg: msg({
          missed: `Kurang ${pen.deficit} pulpen yang bisa dipakai. Pulpen kering gak dihitung, jadi ada siswa yang gak kebagian.`,
          incomplete: `Kotak pulpen belum berisi ${penNeed} pulpen yang bisa dipakai (1 per orang + 2 cadangan). Pulpen kering yang ikut masuk gak dihitung.`,
          skipped: st.pen === 'ok' ? 'Pulpen belum dicek.' : `Pulpen belum dicek, padahal kurang ${pen.deficit}.`,
          fixNoStock: `Laci cuma punya ${penStore} pulpen cadangan, kurangnya ${pen.deficit}. Harusnya dilaporkan.`,
          overReport: `Laci masih punya ${penStore} pulpen cadangan, cukup untuk menutup kekurangan ${pen.deficit}.`
        })
      }),
      obj({
        id: 'paper', name: 'Kertas lembar kerja', icon: '📄', weight: 2,
        truth: truthFor(st.paper, ['Stok kurang'], true),
        msg: msg({
          missed: `Kurang ${paper.deficit} lembar kertas kerja.`,
          incomplete: `Nampan belum berisi ${paperNeed} lembar kertas (2 per orang). Ingat, ada pack yang isinya kurang dari 10 lembar, hitung semuanya.`,
          skipped: st.paper === 'ok' ? 'Kertas belum dicek.' : `Kertas belum dicek, padahal kurang ${paper.deficit} lembar.`,
          fixNoStock: `Laci cuma punya ${paper.store} lembar cadangan, kurangnya ${paper.deficit}. Harusnya dilaporkan.`,
          overReport: `Laci masih punya ${paper.store} lembar cadangan, cukup untuk menutup kekurangan ${paper.deficit}.`
        })
      })
    ]
  };
}

// ---------- Task 1: Paket HQ (unpacking close-up) ----------
//
// Played in scenes/PackageUnpackScene.js: HQ's delivery box is opened, everything
// spills out scattered, and the player sorts it into bins, then compares each
// group with the packing list (surat jalan). The list is the SOP; what's in the
// box is the truth. Possible discrepancies per item group:
//   short    received fewer than listed          -> report 'Kurang'
//   extra    received more than listed           -> report 'Berlebih'
//   wrong    right total, wrong variant split    -> report 'Salah kirim'
//   damaged  something arrived broken            -> report 'Rusak'
//   staged   the list says it ships separately   -> NOT a problem (reporting is a false alarm)
// Class-kit items (pen, bag, T-shirt, stickers) are needed for today's class, so
// they're urgent; robots and laptops aren't.

const PKG_REASONS = ['Kurang', 'Berlebih', 'Salah kirim', 'Rusak'];
const pick2 = (a, b) => (Math.random() < 0.5 ? a : b);

function packageTask(day) {
  const K = rand(6, 8);                                  // class kits in this batch
  const bb = Math.max(2, Math.min(K - 2, Math.round(K / 2) + rand(-1, 1)));
  const bg = K - bb;
  let l1 = Math.max(2, Math.round(K / 3) + rand(-1, 1));
  let l2 = Math.max(2, Math.round(K / 3) + rand(-1, 1));
  let l3 = K - l1 - l2;
  if (l3 < 2) { l3 = 2; l1 = K - l2 - l3; }
  const R = rand(2, 4), L = rand(2, 4);

  let st;
  for (;;) {
    st = rollStates([
      ['pen', [['ok', 2], ['short', 1], ['extra', 1]]],
      ['bag', [['ok', 2], ['short', 1], ['wrong', 1]]],
      ['shirt', [['ok', 2], ['short', 1], ['wrong', 1]]],
      ['sticker', [['ok', 3], ['short', 1]]],
      ['robot', [['ok', 2], ['damaged', 1], ['short', 1], ['staged', 1]]],
      ['laptop', [['ok', 2], ['damaged', 1], ['short', 1], ['staged', 1]]]
    ]);
    // staged is expected, so at least one *real* problem is required
    if (Object.values(st).some(s => s !== 'ok' && s !== 'staged')) break;
  }

  // What actually arrived in the box.
  const got = { pen: K, bb, bg, l: [l1, l2, l3], sticker: K, robot: R, laptop: L, robotBroken: 0, laptopBroken: 0 };
  const note = {};                                         // human detail for the result screen
  if (st.pen === 'short') { const d = rand(1, 3); got.pen -= d; note.pen = `kurang ${d}`; }
  if (st.pen === 'extra') { const d = rand(1, 2); got.pen += d; note.pen = `lebih ${d}`; }
  if (st.bag === 'short') { const d = rand(1, 2); if (pick2(true, false) && bb - d >= 1) { got.bb -= d; note.bag = `tas hitam kurang ${d}`; } else { got.bg = Math.max(1, bg - d); note.bag = `tas hijau kurang ${bg - got.bg}`; } }
  if (st.bag === 'wrong') { const d = Math.min(rand(1, 2), bg - 1); got.bb += d; got.bg -= d; note.bag = `tas hitam ${got.bb} dan hijau ${got.bg}, seharusnya ${bb} dan ${bg}`; }
  if (st.shirt === 'short') { const i = [0, 1, 2].filter(k => got.l[k] >= 2)[0]; const d = 1; got.l[i] -= d; note.shirt = `kaos level ${i + 1} kurang ${d}`; }
  if (st.shirt === 'wrong') { const a = got.l.findIndex(v => v >= 2), b = (a + 1) % 3; got.l[a] -= 1; got.l[b] += 1; note.shirt = `kaos level ${a + 1} dan ${b + 1} tertukar satu`; }
  if (st.sticker === 'short') { const d = rand(1, 3); got.sticker -= d; note.sticker = `kurang ${d}`; }
  if (st.robot === 'short') { got.robot -= 1; note.robot = 'kurang 1'; }
  if (st.robot === 'damaged') { got.robotBroken = 1; note.robot = '1 robot rusak'; }
  if (st.robot === 'staged') { got.robot = 0; }
  if (st.laptop === 'short') { got.laptop -= 1; note.laptop = 'kurang 1'; }
  if (st.laptop === 'damaged') { got.laptopBroken = 1; note.laptop = '1 laptop layarnya retak'; }
  if (st.laptop === 'staged') { got.laptop = 0; }

  const listLines = [
    `Kelas hari ini: ${day.students} siswa`,
    '',
    `CLASS KIT x ${K}`,
    ` Pulpen   ${K}`,
    ` Tas  hitam ${bb} / hijau ${bg}`,
    ` Kaos L1 ${l1} L2 ${l2} L3 ${l3}`,
    ` Stiker   ${K}`,
    `ROBOT x ${R}${st.robot === 'staged' ? '  (kirim terpisah)' : ''}`,
    `LAPTOP x ${L}${st.laptop === 'staged' ? '  (kirim terpisah)' : ''}`
  ];

  // Items to spill from the box.
  const items = [];
  const add = (obj, bin, frame, broken = false) => items.push({ obj, bin, frame, broken });
  for (let i = 0; i < got.pen; i++) add('pen', 'pen', `cu_pen_h${rand(0, 3)}`);
  for (let i = 0; i < got.bb; i++) add('bag', 'bag_black', 'cu_pk_bag_black');
  for (let i = 0; i < got.bg; i++) add('bag', 'bag_green', 'cu_pk_bag_green');
  got.l.forEach((n, k) => { for (let i = 0; i < n; i++) add('shirt', `shirt_${k + 1}`, `cu_pk_shirt_${pick2('black', 'white')}_${k + 1}`); });
  for (let i = 0; i < got.sticker; i++) add('sticker', 'sticker', 'cu_pk_sticker');
  for (let i = 0; i < got.robot; i++) add('robot', 'robot', i < got.robotBroken ? 'cu_pk_robot_broken' : 'cu_pk_robot', i < got.robotBroken);
  for (let i = 0; i < got.laptop; i++) add('laptop', 'laptop', i < got.laptopBroken ? 'cu_pk_laptop_broken' : 'cu_pk_laptop', i < got.laptopBroken);

  const REASON = { short: 'Kurang', extra: 'Berlebih', wrong: 'Salah kirim', damaged: 'Rusak' };
  const listed = { pen: `${K}`, bag: `hitam ${bb}, hijau ${bg}`, shirt: `L1 ${l1}, L2 ${l2}, L3 ${l3}`, sticker: `${K}`, robot: `${R}`, laptop: `${L}` };
  const receivedText = {
    pen: `${got.pen}`, bag: `hitam ${got.bb}, hijau ${got.bg}`, shirt: `L1 ${got.l[0]}, L2 ${got.l[1]}, L3 ${got.l[2]}`,
    sticker: `${got.sticker}`, robot: `${got.robot}${got.robotBroken ? ' (1 rusak)' : ''}`, laptop: `${got.laptop}${got.laptopBroken ? ' (1 retak)' : ''}`
  };
  const defs = [
    ['pen', 'Pulpen', '🖊️', 2], ['bag', 'Tas', '🎒', 2], ['shirt', 'Kaos', '👕', 2],
    ['sticker', 'Stiker', '⭐', 1], ['robot', 'Robot', '🤖', 2], ['laptop', 'Laptop', '💻', 2]
  ];
  const objects = defs.map(([id, name, icon, weight]) => {
    const state = st[id];
    const problem = state !== 'ok' && state !== 'staged';
    return obj({
      id, name, icon, weight,
      truth: problem ? REPORT([REASON[state]], id !== 'robot' && id !== 'laptop') : OK,
      msg: msg({
        good: problem ? `Tepat: ${name.toLowerCase()} tidak sesuai surat jalan (${note[id]}).` : 'Tepat.',
        missed: problem ? `${name} tidak sesuai surat jalan: tercatat ${listed[id]}, diterima ${receivedText[id]} (${note[id]}).` : `${name} sudah sesuai surat jalan.`,
        falseAlarm: state === 'staged'
          ? `${name} memang dikirim terpisah (tertulis di surat jalan), bukan kekurangan.`
          : `${name} sudah sesuai surat jalan (${listed[id]}). Laporan ini gak perlu.`,
        skipped: problem ? `${name} belum diperiksa, padahal tidak sesuai: ${note[id]}.` : 'Belum dicek, untungnya memang sesuai.',
        incomplete: `Sebagian ${name.toLowerCase()} belum kamu kelompokkan, jadi hitungannya belum bisa dipercaya.`
      })
    });
  });

  return {
    id: 'package',
    mode: 'closeup',
    scene: 'PackageUnpackScene',
    title: 'Paket HQ',
    closeup: { students: day.students, mentors: day.mentors, listLines, items, reasons: PKG_REASONS },
    noteLines: [`Roster hari ini: ${day.students} siswa + ${day.mentors} mentor`],
    objects
  };
}

// ---------- Task 3: Ruang Kelas (seating puzzle close-up) ----------
//
// Played in scenes/ClassroomSeatingScene.js. The room is a grid with fixed desks; the player
// places chairs from the storeroom so every person (students + mentor, from Task 1's roster
// note) has a working seat with power, without blocking the aisle to the door. Rules live in
// systems/seatingRules.js. Hidden facts the player must discover:
//   - some storeroom chairs are wobbly (same sprite; click one to test it)
//   - one outlet may be dead or scorched (click it to test); electrical faults are never
//     opened up by the admin, they are reported
//   - delivery boxes may be left in the aisle (move them)
// Three scored objects: seat (enough usable chairs?), power (outlets), aisle (clear path).

const CLASSROOM_REASONS = ['Kurang', 'Listrik', 'Rusak'];

function classroom(day) {
  // Only students sit at the islands (the mentor uses the teacher's desk), and the room has
  // exactly two islands of four seats, so a class is at most 8 students.
  const people = day.students;
  const st = rollStates([['seat', [['ok', 2], ['short', 1]]],
                         ['power', [['ok', 2], ['dead', 1]]],
                         ['aisle', [['ok', 1], ['boxes', 1]]]]);

  const wobbly = rand(1, 2);
  const usable = st.seat === 'ok' ? people + rand(0, 1) : people - rand(1, 3);
  const stock = [...Array(usable).fill({ wobbly: false }), ...Array(wobbly).fill({ wobbly: true })];

  const deadIdx = st.power === 'dead' ? rand(0, OUTLETS.length - 1) : -1;
  const deadKind = pick2('dead', 'scorched');
  const outlets = OUTLETS.map((o, i) => ({ id: o.id, state: i === deadIdx ? deadKind : 'ok' }));
  const working = OUTLETS.filter((_, i) => i !== deadIdx);
  const powerMax = maxPoweredSeats(working);
  // What a perfect player can actually seat: limited by usable chairs, power and the headcount.
  const target = Math.min(people, usable, powerMax);

  const deadName = deadIdx >= 0 ? OUTLETS[deadIdx].id : null;
  const where = deadName ? { A: 'kiri', B: 'kanan', C: 'atas' }[deadName] : 'mana pun';

  return {
    id: 'classroom',
    mode: 'closeup',
    scene: 'ClassroomSeatingScene',
    title: 'Ruang Kelas',
    closeup: {
      stock: shuffle(stock),
      outlets,
      boxes: st.aisle === 'boxes' ? 3 : 0,
      target,
      reasons: CLASSROOM_REASONS,
      reportItems: [{ id: 'seat', label: 'Kursi' }, { id: 'power', label: 'Stopkontak' }]
    },
    noteLines: [`Roster hari ini: ${day.students} siswa + ${day.mentors} mentor`],
    objects: [
      obj({
        id: 'seat', name: 'Kursi', icon: '🪑', weight: 2,
        truth: st.seat === 'short' ? REPORT(['Kurang'], true) : OK,
        msg: msg({
          good: st.seat === 'short'
            ? `Tepat: kursi layak pakai cuma ${usable} (${wobbly} kursi goyah gak dihitung), padahal butuh ${people}.`
            : `Tepat: ada ${usable} kursi layak pakai (${wobbly} goyah gak dihitung) untuk ${people} siswa.`,
          missed: `Kursi layak pakai cuma ${usable} dari ${people} orang yang dibutuhkan (${wobbly} kursi goyah gak dihitung). Harusnya dilaporkan.`,
          falseAlarm: `Kursi layak pakai ada ${usable}, cukup untuk ${people} orang. Laporan ini gak perlu.`,
          incomplete: `Kursi belum terpasang semua padahal sebenarnya bisa: butuh ${people}, yang layak dan bisa dialiri listrik ${target}. Jangan lupa tes kursi yang goyah.`,
          skipped: 'Kursi belum diurus.'
        })
      }),
      obj({
        id: 'power', name: 'Stopkontak', icon: '🔌', weight: 2,
        truth: st.power === 'dead' ? REPORT(['Listrik', 'Rusak'], true) : OK,
        msg: msg({
          good: st.power === 'dead'
            ? `Tepat: stopkontak ${where} ${deadKind === 'dead' ? 'mati' : 'gosong'} dan dilaporkan, bukan dibongkar sendiri.`
            : 'Tepat: semua stopkontak normal, gak ada yang perlu dilaporkan.',
          missed: `Stopkontak ${where} ${deadKind === 'dead' ? 'mati' : 'gosong'} dan gak dilaporkan. Kabel dan laptop di dekatnya jadi bahaya.`,
          falseAlarm: 'Semua stopkontak normal. Laporan ini gak perlu.',
          needlessFix: 'Stopkontak normal, jangan dibuka. Masalah listrik bukan urusan admin.',
          fixNoStock: 'Masalah listrik gak boleh dibongkar atau diperbaiki sendiri, harus dilaporkan ke teknisi.',
          skipped: 'Stopkontak belum dicek.'
        })
      }),
      obj({
        id: 'aisle', name: 'Lorong ke pintu', icon: '🚪', weight: 1,
        truth: st.aisle === 'boxes' ? FIX : OK,
        msg: msg({
          good: st.aisle === 'boxes' ? 'Tepat: kardus di depan pintu kamu pindahkan sendiri.' : 'Tepat: lorong ke pintu bebas.',
          missed: 'Kardus masih menghalangi pintu. Ini bisa kamu pindahkan sendiri, dan jalur keluar harus selalu bebas.',
          overReport: 'Kardus bisa kamu pindahkan sendiri.',
          incomplete: 'Lorong ke pintu masih terhalang (kardus atau kursi), peserta gak bisa keluar dengan aman.',
          skipped: 'Lorong belum diurus.'
        })
      })
    ]
  };
}

const BUILDERS = { package: packageTask, stationery, classroom };

export function buildTask(id, day) {
  return BUILDERS[id](day);
}
