// Single source of truth for game state. Both the Phaser scenes and the DOM
// overlay views read from and write to this object, so a customer registering
// in the overlay updates a flag the scene can react to (and vice versa).
//
// Persisted (see state/storage.js) as a localStorage snapshot: playerName,
// progress, episode1, episode2. main.js loads any existing save on boot via
// applySavedState() before the first screen renders.

export const gameState = {
  // Set by ui/nameScreen.js before the start menu is ever shown.
  playerName: null,
  // High-level completion flags, used by the start menu to show a
  // "done" badge and decide whether to skip the name screen on return.
  progress: {
    episode1Complete: false,
    episode2Complete: false
  },
  episode1: {
    // Every report the player sent to Ops: { area, item, reason, urgent }.
    report: [],
    // Per-task result (see systems/inspectScoring.js buildResult), keyed by task id.
    tasks: {},
    // Facts the player has picked up (e.g. today's roster), shown in the notes panel.
    notes: [],
    // Today's roster/start time, generated when Episode 1 starts (data/ep1Tasks.js).
    day: null
  },
  episode2: {
    // Trial slots: capacity and how many have been booked.
    slots: {
      s1: { label: 'Sesi 1 — Senin 16:00', cap: 1, used: 0 },
      s2: { label: 'Sesi 2 — Rabu 16:00',  cap: 1, used: 0 },
      s3: { label: 'Sesi 3 — Sabtu 10:00', cap: 2, used: 0 }
    },
    // Per-customer outcome. Each entry is one of:
    //   { registered: true,  commitment: 'high'|'low', slot: 's1'|'s2'|'s3' }
    //   { registered: false, reason: 'mikir_dulu'|'pergi'|'ditinggal_lama'|'gagal_jadwal' }
    customers: {}
  }
};

// Merges a snapshot loaded from storage.js's loadGame() into the live
// gameState, field by field (rather than a blind Object.assign) so a save
// from an older shape — e.g. missing a slot that got added later — can't
// leave gameState with holes.
export function applySavedState(saved) {
  if (!saved) return false;

  if (saved.playerName) gameState.playerName = saved.playerName;
  if (saved.progress) Object.assign(gameState.progress, saved.progress);
  if (saved.episode1 && Array.isArray(saved.episode1.report)) {
    gameState.episode1.report = saved.episode1.report;
    if (saved.episode1.tasks) gameState.episode1.tasks = saved.episode1.tasks;
  }
  if (saved.episode2) {
    if (saved.episode2.customers) gameState.episode2.customers = saved.episode2.customers;
    if (saved.episode2.slots) {
      Object.keys(gameState.episode2.slots).forEach(id => {
        const savedSlot = saved.episode2.slots[id];
        if (savedSlot && typeof savedSlot.used === 'number') {
          gameState.episode2.slots[id].used = savedSlot.used;
        }
      });
    }
  }
  return true;
}