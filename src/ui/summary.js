// Episode summaries.
//
// Each summary shows a recap of what the player did and offers a button
// to advance to the next phase. The Phaser scene calls runEp1Summary() and
// runEp2Summary() from its script runner.
import { overlay } from './overlay.js';
import { gameState } from '../state/gameState.js';
import { saveGame } from '../state/storage.js';
import { customers, customerOrder } from '../data/customers.js';

export function runEp1Summary(onContinue) {
  gameState.progress.episode1Complete = true;
  saveGame(gameState);

  const tasks = Object.values(gameState.episode1.tasks);
  const points = tasks.reduce((n, t) => n + t.points, 0);
  const max = tasks.reduce((n, t) => n + t.max, 0);
  const percent = max ? Math.round((points / max) * 100) : 0;
  const reports = gameState.episode1.report;

  const taskLines = tasks
    .map(t => `<li><strong>${escapeHtml(t.title)}</strong>: ${t.percent}%</li>`)
    .join('');
  const reportLines = reports
    .map(r => `<li>${escapeHtml(r.item)} (${escapeHtml(r.area)}): ${escapeHtml(r.reason)}, ${r.urgent ? 'mendesak' : 'bisa menunggu'}</li>`)
    .join('');

  overlay.show(`
    <div class="ov-frame">
      <div class="ov-topbar">
        <span>TIMEDOOR ACADEMY</span>
        <span class="badge">EPISODE 1 SELESAI</span>
      </div>
      <div class="ov-dialogue">
        <div class="dialogue-speaker">Manajer Cabang</div>
        <div class="dialogue-text">Ini rekap kesiapan cabang. Skor keseluruhan kamu: <strong>${percent}%</strong>.</div>
        <ul class="summary-list">${taskLines}</ul>
        <div class="dialogue-text"><strong>${reports.length}</strong> laporan dikirim ke Ops${reports.length ? ':' : '.'}</div>
        <ul class="summary-list">${reportLines}</ul>
        <div class="dialogue-text">${
          percent >= 85
            ? 'Mantap. Kamu tahu kapan harus beresin sendiri dan kapan harus lapor.'
            : 'Yang penting: jangan diamkan kondisi yang gak sesuai, dan bedakan mana yang bisa kamu beresin sendiri dan mana yang harus naik ke Ops.'
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
  gameState.progress.episode2Complete = true;
  saveGame(gameState);

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