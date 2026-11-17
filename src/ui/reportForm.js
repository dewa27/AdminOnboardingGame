// "Lapor ke Ops" form used from inside a close-up scene. Lets the player file
// one report per item (reason + urgency) and hands the updated map back.
//   items    : [{ id, label }]
//   reports  : { [itemId]: { reason, urgent } }  (existing reports, not mutated)
//   onClose  : (reports) => void — called when the form is closed
import { overlay } from './overlay.js';

const REASONS = ['Stok kurang', 'Rusak', 'Belum ada', 'Listrik'];

export function openReportForm({ items, reports, onClose, reasons = REASONS }) {
  const out = { ...reports };
  const draft = { item: items[0].id, reason: null, urgent: null };
  render();

  function render() {
    const sent = Object.entries(out).map(([id, r]) => {
      const label = items.find(i => i.id === id).label;
      return `<li>${esc(label)}: ${esc(r.reason)}, ${r.urgent ? 'hari ini' : 'bisa menunggu'} <a href="#" data-undo="${id}">batalkan</a></li>`;
    }).join('');

    overlay.show(`
      <div class="ov-frame">
        <div class="ov-topbar"><span>TIMEDOOR ACADEMY</span><span class="badge">LAPOR KE OPS</span></div>
        <div class="ov-dialogue">
          <div class="rb-label">Barang apa?</div>
          <div class="chip-row">${items.map(i => `<button class="chip ${draft.item === i.id ? 'on' : ''}" data-item="${i.id}">${esc(i.label)}</button>`).join('')}</div>
          <div class="rb-label">Masalahnya apa?</div>
          <div class="chip-row">${reasons.map(r => `<button class="chip ${draft.reason === r ? 'on' : ''}" data-reason="${r}">${r}</button>`).join('')}</div>
          <div class="rb-label">Seberapa mendesak?</div>
          <div class="chip-row">
            <button class="chip ${draft.urgent === true ? 'on' : ''}" data-urgent="1">Hari ini</button>
            <button class="chip ${draft.urgent === false ? 'on' : ''}" data-urgent="0">Bisa menunggu</button>
          </div>
          ${sent ? `<div class="rb-label">Laporan terkirim</div><ul class="summary-list">${sent}</ul>` : ''}
          <div class="dialogue-actions">
            <button class="primary" data-send ${draft.reason && draft.urgent !== null ? '' : 'disabled'}>Kirim laporan</button>
            <button class="choice" data-close>Kembali ke meja</button>
          </div>
        </div>
      </div>
    `);
    const q = sel => document.querySelectorAll(`#overlay ${sel}`);
    q('[data-item]').forEach(b => b.addEventListener('click', () => { draft.item = b.dataset.item; render(); }));
    q('[data-reason]').forEach(b => b.addEventListener('click', () => { draft.reason = b.dataset.reason; render(); }));
    q('[data-urgent]').forEach(b => b.addEventListener('click', () => { draft.urgent = b.dataset.urgent === '1'; render(); }));
    q('[data-undo]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); delete out[a.dataset.undo]; render(); }));
    q('[data-send]').forEach(b => b.addEventListener('click', () => {
      out[draft.item] = { reason: draft.reason, urgent: draft.urgent };
      draft.reason = null; draft.urgent = null;
      render();
    }));
    q('[data-close]').forEach(b => b.addEventListener('click', () => { overlay.hide(); onClose(out); }));
  }
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
