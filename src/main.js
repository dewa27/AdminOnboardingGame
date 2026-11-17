// Entry point: boots the Phaser game and mounts the DOM overlay system.
//
// Phaser renders into #game; the overlay system (HTML/CSS for dialogue,
// checklist, chat, summary) renders into #overlay and sits on top of the
// canvas. They share state through the gameState singleton.
import Phaser from 'phaser';
import { config } from './config.js';
import { overlay } from './ui/overlay.js';
import { showStart } from './ui/startScreen.js';
import { showNameInput } from './ui/nameScreen.js';
import { gameState, applySavedState } from './state/gameState.js';
import { loadGame } from './state/storage.js';
import './ui/styles.css';

// Initialise the overlay container so any view can mount itself into it.
overlay.init(document.getElementById('overlay'));

// Restore any previous save (see state/storage.js) before the first screen
// renders. A returning player (playerName already saved) skips straight to
// the start menu; a first-time player is asked for their name first.
applySavedState(loadGame());

if (gameState.playerName) {
  showStart();
} else {
  showNameInput(() => showStart());
}

// Boot the Phaser game.
const game = new Phaser.Game(config);

// Expose for debugging.
window.__game = game;