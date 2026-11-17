// Name-input screen — the very first thing the player sees, before the
// episode menu. Collects the admin's name into gameState.playerName and
// saves it immediately (see state/storage.js) so a reload skips straight
// back to the start menu instead of asking again.
import { overlay } from './overlay.js';
import { gameState } from '../state/gameState.js';
import { saveGame } from '../state/storage.js';

export function showNameInput(onDone) {
  overlay.show(`
    <div class="ov-frame">
      <div class="ov-topbar">
        <span>TIMEDOOR ACADEMY</span>
        <span class="badge">ADMIN ONBOARDING SIM</span>
      </div>
      <div class="start-screen">
        <h1 class="title">Siapa nama kamu?</h1>
        <p class="sub">Nama ini dipakai buat menyapa kamu dan menyimpan progres onboarding di browser ini.</p>
        <form id="name-form" novalidate>
          <input
            id="name-input"
            class="name-input"
            type="text"
            maxlength="30"
            autocomplete="off"
            placeholder="Nama kamu..."
          />
          <p class="name-error" id="name-error" hidden>Nama gak boleh kosong ya.</p>
          <div class="dialogue-actions">
            <button class="primary" type="submit">Mulai Onboarding</button>
          </div>
        </form>
      </div>
    </div>
  `);

  const form = document.getElementById('name-form');
  const input = document.getElementById('name-input');
  const error = document.getElementById('name-error');
  input.focus();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (!name) {
      error.hidden = false;
      input.focus();
      return;
    }
    gameState.playerName = name;
    saveGame(gameState);
    onDone && onDone();
  });
}
