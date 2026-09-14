// Episode summaries.
//
// Each summary shows a recap of what the player did and offers a button
// to advance to the next phase. The Phaser scene calls runEp1Summary() and
// runEp2Summary() from its script runner.
import { overlay } from './overlay.js';
import { gameState } from '../state/gameState.js';
import { customers, customerOrder } from '../data/customers.js';

export function runEp1Summary(onContinue) {
  const reportCount = gameState.episode1.report.length;
  const totalItems = 7;
  const okCount = totalItems - reportCount;

  const reportLines = gameState.episode1.report
    .map(r => `<li>${escapeHtml(r.item)} (${escapeHtml(r.area)}) — ${escapeHtml(r.reason)}</li>`)
    .join('');

  overlay.show(`
    <div class="ov-frame">
      <div class="ov-topbar">
        <span>TIMEDOOR ACADEMY</span>
        <span class="badge">EPISODE 1 SELESAI</span>
      </div>
      <div class="ov-dialogue">
        <div class="dialogue-speaker">Manajer Cabang</div>
        <div class="dialogue-text">Kerja bagus buat hari pertama! Ini rekap kesiapan cabang:</div>
        <ul class="summary-list">
          <li><strong>${okCount}</strong> item lengkap</li>
          <li><strong>${reportCount}</strong> item dilaporkan${reportCount > 0 ? ':' : ''}</li>
          ${reportLines}
        </ul>
        <div class="dialogue-text">${
          reportCount > 0
            ? 'Laporan ini otomatis dicatat buat ditindaklanjuti tim Ops. Bagus, jangan pernah diamkan kondisi yang gak sesuai.'
            : 'Semua kondisi lengkap, mantap!'
        }</div>
        <div class="dialogue-actions">
          <button class="primary" data-next>Lanjut ke Episode 2</button>
          <button class="choice" data-back>Kembali ke Menu</button>
        </div>
      </div>
    </div>
  `);

  document.querySelector('#overlay [data-next]').addEventListener('click', () => {
    onContinue && onContinue();
  });
  document.querySelector('#overlay [data-back]').addEventListener('click', () => {
    overlay.hide();
    window.location.reload();
  });
}

export function runEp2Summary(onContinue) {
  const results = gameState.episode2.customers;
  const total = Object.values(results).filter(v => v.registered).length;

  const reasonText = {
    mikir_dulu:     'Belum daftar, masih mikir mikir',
    pergi:          'Gagal, customer gak puas dan pergi',
    ditinggal_lama: 'Gagal, ditinggal kelamaan gak dibales',
    gagal_jadwal:   'Sebenarnya mau daftar, tapi gagal karena slot yang cocok penuh'
  };

  const lines = customerOrder.map(key => {
    const c = customers[key];
    const r = results[key];
    if (r && r.registered) {
      return `<li>${escapeHtml(c.name)} — Terdaftar (${escapeHtml(gameState.episode2.slots[r.slot].label)}, commitment: ${r.commitment})</li>`;
    }
    return `<li>${escapeHtml(c.name)} — ${escapeHtml(reasonText[r && r.reason] || 'Gagal / gak jadi daftar')}</li>`;
  }).join('');

  overlay.show(`
    <div class="ov-frame">
      <div class="ov-topbar">
        <span>TIMEDOOR ACADEMY</span>
        <span class="badge">EPISODE 2 SELESAI</span>
      </div>
      <div class="ov-dialogue">
        <div class="dialogue-speaker">Rekap Hari Ini</div>
        <div class="dialogue-text"><strong>${total} dari 4</strong> customer berhasil didaftarkan sebagai Free Trial.</div>
        <ul class="summary-list">${lines}</ul>
        <div class="dialogue-actions">
          <button class="primary" data-back>Kembali ke Menu</button>
        </div>
      </div>
    </div>
  `);

  document.querySelector('#overlay [data-back]').addEventListener('click', () => {
    onContinue && onContinue();
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}