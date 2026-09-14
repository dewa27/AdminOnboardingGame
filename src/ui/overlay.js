// Tiny overlay controller. The Phaser canvas lives in #game; the overlay
// container lives in #overlay (a sibling). Views render themselves into
// the container via `overlay.show(html)` / `overlay.hide()`.
//
// While a view is shown, the container has .visible which:
//   - dims the game behind it
//   - blocks pointer events to the canvas so the player doesn't move
//     while reading a checklist
//
// Views don't have to use this API directly — the helpers in dialogue.js,
// checklist.js, chat.js, summary.js wrap the show/hide lifecycle so callers
// just provide an "onDone" callback.
let rootEl = null;

export const overlay = {
  init(el) {
    rootEl = el;
  },

  isVisible() {
    return !!rootEl && rootEl.classList.contains('visible');
  },

  show(html) {
    if (!rootEl) return;
    rootEl.innerHTML = html;
    rootEl.classList.add('visible');
  },

  hide() {
    if (!rootEl) return;
    rootEl.innerHTML = '';
    rootEl.classList.remove('visible');
  }
};