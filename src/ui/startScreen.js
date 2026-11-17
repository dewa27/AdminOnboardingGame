// Start screen — entry point of the game. Pure DOM; no Phaser involvement
// until the player clicks one of the episode buttons.
//
// For now both episodes start the same way: switch into the BootScene's
// Episode 1 scene. (The BootScene already runs once on Phaser boot, so the
// scenes are warm — we just call scene.start() to begin them.)
import { overlay } from './overlay.js';
import { gameState } from '../state/gameState.js';
import { clearGame } from '../state/storage.js';

export function showStart() {
  const name = gameState.playerName || 'Admin';
  const ep1Done = gameState.progress.episode1Complete;
  const ep2Done = gameState.progress.episode2Complete;

  overlay.show(`
    <div class="ov-frame">
      <div class="ov-topbar">
        <span>TIMEDOOR ACADEMY</span>
        <span class="badge">ADMIN ONBOARDING SIM</span>
      </div>
      <div class="start-screen">
        <h1 class="title">Halo, ${escapeHtml(name)}!</h1>
        <p class="sub">Simulasi peran Admin Cabang Timedoor Academy. Pilih episode untuk mulai.</p>
        <button class="ep-btn" data-ep="1">
          <strong>Episode 1 — Persiapan Cabang${ep1Done ? ' ✓' : ''}</strong>
          <span>Cek paket kiriman HQ dan siapkan ruang kelas.</span>
        </button>
        <button class="ep-btn" data-ep="2">
          <strong>Episode 2 — Balas Chat Customer${ep2Done ? ' ✓' : ''}</strong>
          <span>Layani 4 calon customer, arahkan mereka daftar Free Trial.</span>
        </button>
        <p class="footer-note">Catatan: prototype, asset visual masih placeholder.</p>
        <p class="footer-note"><a href="#" id="reset-player">Bukan ${escapeHtml(name)}? Ganti pemain</a></p>
      </div>
    </div>
  `);

  // Use a single delegated click handler — overlay innerHTML gets replaced
  // frequently, so re-binding on every view would be wasteful.
  const root = document.getElementById('overlay');
  root.querySelectorAll('.ep-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ep = btn.getAttribute('data-ep');
      if (ep === '1') startEpisode1();
      else if (ep === '2') startEpisode2();
    });
  });

  document.getElementById('reset-player').addEventListener('click', (e) => {
    e.preventDefault();
    clearGame();
    window.location.reload();
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

// All scene keys registered in config.js. Used to defensively stop whatever
// else might be active/sleeping/paused before starting the chosen episode —
// Phaser's SceneManager has no `getActiveKey()` (that was a bug: calling it
// threw a TypeError and silently aborted the scene switch, leaving the
// overlay hidden and the canvas on whatever BootScene had drawn).
const ALL_SCENE_KEYS = ['BootScene', 'Episode1Scene', 'Episode2Scene', 'DeskCloseUpScene', 'PackageUnpackScene', 'ClassroomSeatingScene'];

function stopAllExcept(game, keep) {
  ALL_SCENE_KEYS.forEach(key => {
    if (key !== keep && game.scene.isActive(key)) {
      game.scene.stop(key);
    }
  });
}

function startEpisode1() {
  // Hide the menu overlay first so the player sees the room (dimmed by
  // the next overlay that opens) come alive, not a black canvas.
  overlay.hide();

  // Stop whatever is currently active (BootScene by default) and start
  // Episode1Scene cleanly. `stop` + `start` is more defensive than just
  // `start` because it guarantees the scene's create() runs.
  const game = window.__game;
  stopAllExcept(game, 'Episode1Scene');
  game.scene.start('Episode1Scene');
}

function startEpisode2() {
  overlay.hide();

  const game = window.__game;
  stopAllExcept(game, 'Episode2Scene');
  game.scene.start('Episode2Scene');
}