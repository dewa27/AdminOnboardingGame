// Lightweight "database" for this prototype: the browser's localStorage.
//
// There's no backend (see README — static hosting / file://), so progress
// is saved per-browser under one JSON blob. Swap this module out for a real
// API client later without touching callers — they only see
// saveGame/loadGame/clearGame.
const STORAGE_KEY = 'timedoor-admin-onboarding-save-v1';

export function saveGame(gameState) {
  try {
    const snapshot = {
      playerName: gameState.playerName,
      progress: gameState.progress,
      episode1: gameState.episode1,
      episode2: gameState.episode2,
      savedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (err) {
    // Private browsing / storage disabled / quota full — non-fatal, the
    // player just keeps playing without persistence this session.
    console.warn('Gagal menyimpan progres ke localStorage:', err);
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('Gagal memuat progres dari localStorage:', err);
    return null;
  }
}

export function clearGame() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Gagal menghapus progres dari localStorage:', err);
  }
}
