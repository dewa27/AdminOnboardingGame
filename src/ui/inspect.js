// Inspection task overlay — the shared mechanic for every Episode 1 station.
//
// The player has a reference sheet (what the SOP says) and a notes panel (what
// they learned earlier). Inspecting an object costs one step from a limited
// budget and reveals its real state; the player then decides:
//   Sudah sesuai | Perbaiki sendiri | Lapor ke Ops (reason + urgency)
// Feedback is withheld until "Selesai", so the result screen can explain every
// decision without it being usable to brute-force the answers.
//
// Task shape: see data/ep1Tasks.js. Scoring: systems/inspectScoring.js.
import { overlay } from './overlay.js';
import { gameState } from '../state/gameState.js';
import { buildResult } from '../systems/inspectScoring.js';

const REASONS = ['Stok kurang', 'Rusak', 'Belum ada', 'Listrik'];
const ACTION_LABEL = { ignore: 'Sudah sesuai', fix: 'Diperbaiki sendiri', report: 'Dilaporkan' };

export function runInspect(task, onDone) {
  const notes = gameState.episode1.notes;
  task.noteLines.forEach(line => { if (!notes.includes(line)) notes.push(line); });

  const st = {
    budget: task.budget,
    inspected: new Set(),
    decisions: {},
    selected: null,
    draft: null,          // { reason, urgent } while composing a report
    flash: ''
  };

  render();

  function render() {
    const sel = task.objects.find(o => o.id === st.selected) || null;
    const pending = task.objects.filter(o => o.kind === 'check' && st.inspected.has(o.id) && !st.decisions[o.id]).length;

    overlay.show(`
      <div class="ov-frame wide">
        <div class="ov-topbar">
          <span>TIMEDOOR ACADEMY</span>
          <span class="badge">TUGAS</span>
        </div>
        <div class="ov-dialogue">
          <div class="dialogue-speaker">${esc(task.title)}</div>
          <div class="inspect-grid">
            <div class="inspect-side">
              <div class="sheet-card">
                <h4>📋 ${esc(task.sheet.title)}</h4>
                <dl>${task.sheet.rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
              </div>
              <div class="notes-card">
                <h4>📝 Catatan</h4>
                ${notes.length ? `<ul>${notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : '<p class="muted">Belum ada catatan.</p>'}
              </div>
            </div>
            <div class="inspect-main">
              <div class="budget ${st.budget === 0 ? 'out' : ''}">Waktu sebelum kelas: <strong>${st.budget}</strong> langkah periksa</div>
              <div class="obj-list">${task.objects.map(o => objButton(o)).join('')}</div>
              <div class="obj-detail">${detailHtml(sel)}</div>
              ${st.flash ? `<div class="flash">${esc(st.flash)}</div>` : ''}
            </div>
          </div>
          <div class="dialogue-actions">
            <button class="primary" data-finish>Selesai &amp; serahkan${pending ? ` (${pending} belum diputuskan)` : ''}</button>
          </div>
        </div>
      </div>
    `);
    bind();
  }

  function objButton(o) {
    const seen = st.inspected.has(o.id);
    const d = st.decisions[o.id];
    const tag = d ? `<span class="status-tag ${d.action === 'report' ? 'report' : 'ok'}">${ACTION_LABEL[d.action]}</span>`
      : seen ? '<span class="status-tag pending">Diperiksa</span>' : '';
    return `<button class="obj-btn ${st.selected === o.id ? 'active' : ''}" data-obj="${o.id}">
      <span class="obj-icon">${o.icon}</span><span class="obj-name">${esc(o.name)}</span>${tag}</button>`;
  }

  function detailHtml(o) {
    if (!o) return '<p class="muted">Pilih sebuah objek untuk diperiksa. Setiap pemeriksaan memakai satu langkah.</p>';
    if (!st.inspected.has(o.id)) return '<p class="muted">Belum diperiksa.</p>';
    let html = `<p class="obs">${esc(o.obs)}</p>`;
    if (o.kind === 'info') return html + '<p class="muted">Info, gak perlu diputuskan.</p>';

    const d = st.decisions[o.id];
    if (d) {
      const extra = d.action === 'report' ? ` — ${esc(d.reason)}, ${d.urgent ? 'mendesak (hari ini)' : 'bisa menunggu'}` : '';
      return html + `<p class="decided">Keputusan: <strong>${ACTION_LABEL[d.action]}</strong>${extra}</p>`;
    }
    if (st.draft) {
      return html + `
        <div class="report-box">
          <div class="rb-label">Masalahnya apa?</div>
          <div class="chip-row">${REASONS.map(r => `<button class="chip ${st.draft.reason === r ? 'on' : ''}" data-reason="${r}">${r}</button>`).join('')}</div>
          <div class="rb-label">Seberapa mendesak?</div>
          <div class="chip-row">
            <button class="chip ${st.draft.urgent === true ? 'on' : ''}" data-urgent="1">Hari ini</button>
            <button class="chip ${st.draft.urgent === false ? 'on' : ''}" data-urgent="0">Bisa menunggu</button>
          </div>
          <div class="chip-row">
            <button class="mini-btn report-btn" data-send ${st.draft.reason && st.draft.urgent !== null ? '' : 'disabled'}>Kirim laporan</button>
            <button class="mini-btn" data-cancel>Batal</button>
          </div>
        </div>`;
    }
    return html + `
      <div class="decision-row">
        <button class="mini-btn" data-act="ignore">Sudah sesuai</button>
        <button class="mini-btn" data-act="fix">Perbaiki sendiri</button>
        <button class="mini-btn report-btn" data-act="report">Lapor ke Ops</button>
      </div>`;
  }

  function bind() {
    const q = sel => document.querySelectorAll(`#overlay ${sel}`);

    q('[data-obj]').forEach(b => b.addEventListener('click', () => {
      const id = b.getAttribute('data-obj');
      if (!st.inspected.has(id)) {
        if (st.budget <= 0) { st.flash = 'Waktu habis, kamu gak bisa memeriksa objek baru lagi.'; render(); return; }
        st.budget -= 1;
        st.inspected.add(id);
      }
      st.flash = '';
      st.selected = id;
      st.draft = null;
      render();
    }));

    q('[data-act]').forEach(b => b.addEventListener('click', () => {
      const action = b.getAttribute('data-act');
      if (action === 'report') { st.draft = { reason: null, urgent: null }; render(); return; }
      st.decisions[st.selected] = { action };
      render();
    }));
    q('[data-reason]').forEach(b => b.addEventListener('click', () => { st.draft.reason = b.getAttribute('data-reason'); render(); }));
    q('[data-urgent]').forEach(b => b.addEventListener('click', () => { st.draft.urgent = b.getAttribute('data-urgent') === '1'; render(); }));
    q('[data-cancel]').forEach(b => b.addEventListener('click', () => { st.draft = null; render(); }));
    q('[data-send]').forEach(b => b.addEventListener('click', () => {
      st.decisions[st.selected] = { action: 'report', reason: st.draft.reason, urgent: st.draft.urgent };
      st.draft = null;
      render();
    }));

    document.querySelector('#overlay [data-finish]').addEventListener('click', finish);
  }

  function finish() {
    const result = buildResult(task, st.decisions);
    showTaskResult(result, onDone);
  }

}

export function showTaskResult(result, onDone) {
  const icon = { good: '✅', partial: '🟡', bad: '❌', skipped: '⏭️' };
  overlay.show(`
    <div class="ov-frame wide">
      <div class="ov-topbar">
        <span>TIMEDOOR ACADEMY</span>
        <span class="badge">HASIL</span>
      </div>
      <div class="ov-dialogue">
        <div class="dialogue-speaker">${esc(result.title)}: ${result.percent}%</div>
        <div class="result-list">
          ${result.items.map(i => `
            <div class="result-item ${i.verdict}">
              <div class="ri-head">${icon[i.verdict]} <strong>${esc(i.name)}</strong>
                <span class="ri-pts">${i.points}/${i.max}</span></div>
              <div class="ri-note">${esc(i.note)}</div>
            </div>`).join('')}
        </div>
        <div class="dialogue-actions"><button class="primary" data-next>Lanjut</button></div>
      </div>
    </div>
  `);
  document.querySelector('#overlay [data-next]').addEventListener('click', () => {
    overlay.hide();
    onDone && onDone(result);
  });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}
