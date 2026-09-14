// Entry point: boots the Phaser game and mounts the DOM overlay system.
//
// Phaser renders into #game; the overlay system (HTML/CSS for dialogue,
// checklist, chat, summary) renders into #overlay and sits on top of the
// canvas. They share state through the gameState singleton.
import Phaser from 'phaser';
import { config } from './config.js';
import { overlay } from './ui/overlay.js';
import { showStart } from './ui/startScreen.js';
import './ui/styles.css';

// Initialise the overlay container so any view can mount itself into it.
overlay.init(document.getElementById('overlay'));

// Show the start screen immediately so the player has something to click
// while Phaser boots in the background.
showStart();

// Boot the Phaser game.
const game = new Phaser.Game(config);

// Expose for debugging.
window.__game = game;