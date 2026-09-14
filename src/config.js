import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { Episode1Scene } from './scenes/Episode1Scene.js';
import { Episode2Scene } from './scenes/Episode2Scene.js';

// Phaser game config. The room is small (640x480) so it fits comfortably in
// the existing single-file layout. `pixelArt: true` keeps placeholder coloured
// boxes crisp until real sprite sheets replace them.
export const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 640,
  height: 480,
  backgroundColor: '#22223b',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  // Pass the actual Scene classes, not string keys — Phaser derives each
  // scene's registered key from `super(key)` inside the class itself. Passing
  // plain strings here used to silently produce broken scene entries with no
  // `.sys`, crashing SceneManager.bootQueue on game boot (which is what made
  // clicking Episode 1 / Episode 2 show a blank overlay).
  scene: [BootScene, Episode1Scene, Episode2Scene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};