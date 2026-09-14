// Single source of truth for game state. Both the Phaser scenes and the DOM
// overlay views read from and write to this object, so a customer registering
// in the overlay updates a flag the scene can react to (and vice versa).
//
// Persistence is intentionally not implemented here yet — see the .md §8.
// Reloading the page resets everything.

export const gameState = {
  episode1: {
    // Filled by ChecklistView when the player reports a problem.
    report: []
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