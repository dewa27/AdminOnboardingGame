import Phaser from 'phaser';

// Player — owns its Phaser sprite and body. Encapsulates keyboard movement
// with normalised diagonal speed so the player doesn't move faster when
// holding two keys at once.
//
// Visuals: uses the 'player_sheet' spritesheet (see BootScene.makePlayerAnims)
// with idle/walk animations for each of the 4 cardinal directions. Diagonal
// movement picks whichever axis has the larger magnitude to decide which
// facing animation to show (there are no diagonal frames in the sheet).
export class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, 'player_sheet');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);
    // Frame is 72x72 with the character's feet anchored at a fixed baseline
    // (y=66, see BootScene) across every direction/animation — this already
    // reads at a good size in the 640x480 room, no extra scale needed.
    // Shrink the physics body to a small pad right under the character's
    // feet rather than the full frame. The furniture/wall collision boxes
    // in data/collision.js are already pixel-tight against the map art, so
    // a bigger body here was the actual cause of the "collision feels too
    // wide" complaint — the visible sprite (72px tall) always looked like it
    // stopped well short of an obstacle even though the physics box touched
    // it exactly. A tighter body lets the sprite visually overlap furniture
    // edges the way top-down games usually do.
    this.sprite.body.setSize(14, 8);
    this.sprite.body.setOffset(29, 60);
    this.speed = 90;
    this.facing = 'down';
    this.sprite.anims.play('player_idle_down');
  }

  update(cursors, wasd) {
    const body = this.sprite.body;
    let vx = 0;
    let vy = 0;

    if (cursors.left.isDown  || wasd.A.isDown) vx -= 1;
    if (cursors.right.isDown || wasd.D.isDown) vx += 1;
    if (cursors.up.isDown    || wasd.W.isDown) vy -= 1;
    if (cursors.down.isDown  || wasd.S.isDown) vy += 1;

    const moving = vx !== 0 || vy !== 0;

    if (vx !== 0 && vy !== 0) {
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }

    body.setVelocity(vx * this.speed, vy * this.speed);

    if (moving) {
      // Pick facing from whichever axis dominates this frame's input.
      if (Math.abs(vx) > Math.abs(vy)) {
        this.facing = vx > 0 ? 'right' : 'left';
      } else {
        this.facing = vy > 0 ? 'down' : 'up';
      }
    }

    const anim = `player_${moving ? 'walk' : 'idle'}_${this.facing}`;
    if (this.sprite.anims.currentAnim?.key !== anim) {
      this.sprite.anims.play(anim, true);
    }
  }
}
