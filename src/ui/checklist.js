// Checklist overlay — ported from the original prototype. Each item can be:
//
//   - "Taruh/Cek OK"  → marks it OK
//   - "Lapor Kondisi" → opens a reason picker (Stok kurang / Rusak / Belum ada),
//                       records the report in gameState.episode1.report
//
// When every item is no longer pending, the "Selesai" button enables and
// triggers `onDone()`.
import { overlay } from './overlay.js';
import { gameState } from '../state/gameState.js';

export function runChecklist(step, onDone) {
  // Per-step state lives on the step object (the script is read-only data,
  // but attaching transient UI state to it is fine for a prototype).
  if (!step._state) {
    step._state = {};
    step.items.forEach(it => step._state[it.id] = { status: 'pending', reason: null, showReasons: false });
  }
  const state = step._state;

  render();

  function render() {
    const allDone = step.items.every(it => state[it.id].status !== 'pending');

    overlay.show(`
      <div class="ov-frame">
        <div class="ov-topbar">
          <span>TIMEDOOR ACADEMY</span>
          <span class="badge">CHECKLIST</span>
        </div>
        <div class="ov-dialogue">
          <div class="dialogue-speaker">${escapeHtml(step.title)}</div>
          <div class="checklist-modal">
            ${step.items.map(itemHtml).join('')}
          </div>
          <div class="dialogue-actions">
            <button class="primary" data-finish ${allDone ? '' : 'disabled'}>Selesai</button>
          </div>
        </div>
      </div>
    `);

    step.items.forEach(it => {
      const id = it.id;
      const okBtn      = document.querySelector(`#overlay [data-set-ok="${id}"]`);
      const showBtn    = document.querySelector(`#overlay [data-show-reasons="${id}"]`);
      const reasonBtns = document.querySelectorAll(`#overlay [data-set-report="${id}"]`);

      okBtn   && okBtn.addEventListener('click',   () => { state[id].status = 'ok'; render(); });
      showBtn && showBtn.addEventListener('click', () => { state[id].showReasons = true; render(); });
      reasonBtns.forEach(b => b.addEventListener('click', () => {
        const reason = b.getAttribute('data-reason');
        state[id].status = 'reported';
        state[id].reason = reason;
        state[id].showReasons = false;
        gameState.episode1.report.push({ area: step.title, item: id, reason });
        render();
      }));
    });

    document.querySelector('#overlay [data-finish]').addEventListener('click', () => {
      overlay.hide();
      onDone && onDone();
    });
  }

  function itemHtml(it) {
    const s = state[it.id];
    let tag = '<span class="status-tag pending">Belum dicek</span>';
    if (s.status === 'ok')       tag = '<span class="status-tag ok">Lengkap</span>';
    if (s.status === 'reported') tag = `<span class="status-tag report">Dilaporkan: ${escapeHtml(s.reason)}</span>`;

    let actions = '';
    if (s.status === 'pending') {
      actions = `
        <button class="mini-btn" data-set-ok="${it.id}">Taruh/Cek OK</button>
        <button class="mini-btn report-btn" data-show-reasons="${it.id}">Lapor Kondisi</button>
      `;
    }
    let reasonRow = '';
    if (s.showReasons) {
      reasonRow = `
        <div class="reason-row">
          <button class="mini-btn report-btn" data-set-report="${it.id}" data-reason="Stok kurang">Stok kurang</button>
          <button class="mini-btn report-btn" data-set-report="${it.id}" data-reason="Rusak">Rusak</button>
          <button class="mini-btn report-btn" data-set-report="${it.id}" data-reason="Belum ada">Belum ada</button>
        </div>`;
    }
    return `
      <div class="checklist-item">
        <span class="item-name">${escapeHtml(it.name)}</span>
        <span>${tag}${actions}</span>
      </div>${reasonRow}`;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}