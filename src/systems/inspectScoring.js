// Scoring for the Episode 1 inspection tasks (see data/ep1Tasks.js for how a
// task is built and ui/inspect.js for the screen). Pure functions, no DOM.
//
// Every checkable object carries the ground truth of what the right call is:
//   truth = { correct: 'ignore' | 'fix' | 'report', reasons: [...], urgent: bool }
//   weight = how much the object matters (1 minor, 2 core)
// and the player's decision looks like:
//   { action: 'ignore' | 'fix' | 'report', reason?: string, urgent?: bool }
//
// Points (w = weight):
//   correct 'ignore' : ignore 2w | needless fix 1w | false-alarm report 0
//   correct 'fix'    : fix 2w    | report instead 1w (Ops burdened needlessly) | ignore 0
//   correct 'report' : report 2w, +1w right reason, +1w right urgency
//                      | fix 0 (couldn't actually be fixed) | ignore 0
//   not decided      : 0 ("skipped")
//
// Verdicts: 'good' | 'partial' | 'bad' | 'skipped' — the result screen shows
// the per-object note so the player learns WHY, but only after finishing, so
// the feedback can't be used to brute-force the task.

export function evaluate(obj, decision) {
  const t = obj.truth;
  const w = obj.weight;
  const max = (t.correct === 'report' ? 4 : 2) * w;
  const msg = obj.msg;

  if (!decision) return { points: 0, max, verdict: 'skipped', note: msg.skipped };

  // Close-up tasks set `incomplete` when the player stopped without actually
  // meeting the requirement (e.g. the pen case holds too few working pens).
  if (decision.incomplete) {
    return { points: 0, max, verdict: 'bad', note: msg.incomplete || msg.missed };
  }

  const a = decision.action;
  if (t.correct === 'ignore') {
    if (a === 'ignore') return { points: 2 * w, max, verdict: 'good', note: msg.good };
    if (a === 'fix') return { points: 1 * w, max, verdict: 'partial', note: msg.needlessFix };
    return { points: 0, max, verdict: 'bad', note: msg.falseAlarm };
  }

  if (t.correct === 'fix') {
    if (a === 'fix') return { points: 2 * w, max, verdict: 'good', note: msg.good };
    if (a === 'report') return { points: 1 * w, max, verdict: 'partial', note: msg.overReport };
    return { points: 0, max, verdict: 'bad', note: msg.missed };
  }

  // correct === 'report'
  if (a === 'report') {
    let pts = 2 * w;
    const notes = [msg.good];
    if (t.reasons.includes(decision.reason)) pts += w;
    else notes.push(`Alasan laporan kurang tepat (seharusnya: ${t.reasons[0]}).`);
    if (!!decision.urgent === !!t.urgent) pts += w;
    else notes.push(t.urgent ? 'Ini mendesak (berdampak hari ini), harusnya ditandai "Hari ini".' : 'Ini gak mendesak, jangan semua ditandai "Hari ini" supaya prioritas Ops tetap jelas.');
    return { points: pts, max, verdict: pts === max ? 'good' : 'partial', note: notes.join(' ') };
  }
  if (a === 'fix') return { points: 0, max, verdict: 'bad', note: msg.fixNoStock };
  return { points: 0, max, verdict: 'bad', note: msg.missed };
}

// decisions: { [objectId]: decision }. Info objects (kind 'info') aren't scored.
export function buildResult(task, decisions) {
  const items = task.objects
    .filter(o => o.kind === 'check')
    .map(o => {
      const d = decisions[o.id] || null;
      const e = evaluate(o, d);
      return {
        id: o.id,
        name: o.name,
        action: d ? d.action : null,
        reason: d && d.action === 'report' ? d.reason : null,
        urgent: d && d.action === 'report' ? !!d.urgent : null,
        ...e
      };
    });
  const points = items.reduce((s, i) => s + i.points, 0);
  const max = items.reduce((s, i) => s + i.max, 0);
  return { taskId: task.id, title: task.title, items, points, max, percent: max ? Math.round((points / max) * 100) : 0 };
}

// Short manager reaction to a finished task, built from the worst mistakes.
export function debrief(result) {
  const bad = result.items.filter(i => i.verdict === 'bad' || i.verdict === 'skipped');
  const partial = result.items.filter(i => i.verdict === 'partial');
  if (result.percent >= 85) {
    return 'Rapi! Kamu cek dengan teliti dan tahu mana yang bisa kamu beresin sendiri, mana yang harus naik ke Ops. Lanjut ya.';
  }
  if (bad.length === 0 && partial.length > 0) {
    return `Hampir pas. Satu catatan: <strong>${partial[0].name}</strong>: ${partial[0].note} Lanjut ya.`;
  }
  if (result.percent >= 50) {
    return `Lumayan, tapi ada yang terlewat atau kurang tepat, terutama <strong>${bad[0].name}</strong>: ${bad[0].note} Perhatiin lagi di tugas berikutnya.`;
  }
  return `Masih banyak yang meleset. Contohnya <strong>${bad[0].name}</strong>: ${bad[0].note} Pelan-pelan, baca dulu lembar acuan dan cek stok gudangnya sebelum memutuskan.`;
}
