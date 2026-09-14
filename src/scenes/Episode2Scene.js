// Episode2Scene — minimal backdrop while the WA-style chat overlay is on
// screen. Just shows the player at the laptop. All interaction happens in
// the DOM overlay (ui/chat.js); this scene exists so the player still feels
// "in the game" while answering chats.
//
// State is reset and the chat view is started from create() rather than
// letting chat.js drive everything, so reloading or coming back from
// Episode 3 (future) restarts cleanly.
import Phaser from 'phaser';
import { gameState } from '../state/gameState.js';
import { startEpisode2 } from '../ui/chat.js';
import { runEp2Summary } from '../ui/summary.js';

export class Episode2Scene extends Phaser.Scene {
  constructor() {
    super('Episode2Scene');
  }

  create() {
    // Reset Episode 2 state on entry.
    gameState.episode2.customers = {};
    gameState.episode2.slots.s1.used = 0;
    gameState.episode2.slots.s2.used = 0;
    gameState.episode2.slots.s3.used = 0;

    this.buildDeskScene();

    // Hand off to the chat overlay. When the chat is fully done, the
    // callback fires the Episode 2 summary.
    startEpisode2(this, () => {
      runEp2Summary(() => {
        this.showEndScreen();
      });
    });
  }

  buildDeskScene() {
    // Floor
    for (let x = 0; x < 640; x += 64) {
      for (let y = 0; y < 480; y += 64) {
        this.add.image(x + 32, y + 32, 'floor');
      }
    }

    // Wall trim
    for (let x = 0; x < 640; x += 32) {
      this.add.image(x + 16, 16, 'wall');
      this.add.image(x + 16, 464, 'wall');
    }
    for (let y = 32; y < 448; y += 32) {
      this.add.image(16, y + 16, 'wall');
      this.add.image(624, y + 16, 'wall');
    }

    // Big desk
    const deskX = 320, deskY = 240;
    this.add.rectangle(deskX, deskY, 200, 100, 0x8d6e63)
      .setStrokeStyle(3, 0x0f0f1c);
    this.add.text(deskX, deskY - 8, '💻 Laptop', {
      fontSize: '14px',
      color: '#f4f1de'
    }).setOrigin(0.5);

    // Player sitting at desk — static idle-right frame from the player
    // spritesheet (row 6 "idle_right", first column = frame 48).
    const player = this.add.sprite(deskX - 80, deskY - 20, 'player_sheet', 48).setOrigin(0);
    player.setDepth(5);

    this.add.text(deskX - 80 + 16, deskY - 20 - 14, 'Kamu', {
      fontSize: '9px',
      fontFamily: '"Courier New", monospace',
      color: '#f4f1de',
      backgroundColor: '#0f0f1c',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setDepth(6);

    // Caption
    this.add.text(320, 50, 'Laptop kerja — sekarang waktunya bales chat customer.', {
      fontSize: '12px',
      fontFamily: '"Courier New", monospace',
      color: '#f4f1de',
      backgroundColor: '#0f0f1c',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5);
  }

  showEndScreen() {
    this.add.text(320, 240, 'Onboarding selesai!\n\n(Kembali ke menu)', {
      fontSize: '18px',
      fontFamily: '"Courier New", monospace',
      color: '#f4f1de',
      backgroundColor: '#0f0f1c',
      align: 'center',
      padding: { x: 12, y: 8 }
    }).setOrigin(0.5);

    // Tiny button (DOM-overlay-based menu will be added if user clicks).
    // For now, just a console hint so the dev knows where to go.
    console.log('All episodes complete. Reload to start over (no persistence yet).');
  }
}