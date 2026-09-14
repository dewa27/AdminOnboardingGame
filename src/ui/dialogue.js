// Dialogue overlay — single-speaker text box with an "OK / Lanjut" button.
//
// `speaker`  : name shown in teal above the text
// `text`     : body, may include inline HTML (we use it for <strong>)
// `onDone`   : invoked when the player clicks the primary button
// `opts`     :
//   - dismissable (default true): if false, the OK button is shown but
//     doing nothing — used for "hints" that auto-dismiss when the player
//     walks somewhere. Currently we always render the button.
//   - hint (default null): reserved for future auto-dismiss logic.
import { overlay } from './overlay.js';

export function runDialogue(speaker, text, onDone, opts = {}) {
  overlay.show(`
    <div class="ov-frame">
      <div class="ov-topbar">
        <span>TIMEDOOR ACADEMY</span>
        <span class="badge">DIALOG</span>
      </div>
      <div class="ov-dialogue">
        <div class="dialogue-speaker">${escapeHtml(speaker)}</div>
        <div class="dialogue-text">${text}</div>
        <div class="dialogue-actions">
          <button class="primary" data-ok>Lanjut</button>
        </div>
      </div>
    </div>
  `);

  document.querySelector('#overlay [data-ok]').addEventListener('click', () => {
    overlay.hide();
    onDone && onDone();
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}