// BootScene — generates placeholder textures procedurally so we don't need any
// image files in the repo, plus loads the pixel-art player spritesheet and
// the Episode 1 tile-based room assets.
//
// Generated keys:
//   'floor'      64x64 repeating floor tile (Episode 2 desk backdrop only)
//   'wall'       32x32 wall block (same, Episode 2 only)
//   'manager'    32x48 NPC body (yellow) — still a flat placeholder box
//   'arrow'      24x24 pulsing arrow for the active target
//
// Loaded spritesheet:
//   'player_sheet'  72x72 frames, 8 cols x 8 rows, packed by scripts (see
//   src/assets/worker/ source frames + metadata.json) as:
//     row 0: idle south   row 1: walk south
//     row 2: idle north   row 3: walk north
//     row 4: idle west    row 5: walk west
//     row 6: idle east    row 7: walk east
//   Idle rows repeat a single still across all 8 columns; walk rows are the
//   8 real walk-cycle frames. Every frame is packed with the character's
//   feet aligned to the same baseline (y=66) regardless of the source
//   image's own canvas size, so switching direction/animation never makes
//   the sprite visually jump up or down. See makePlayerAnims() for the
//   derived animation keys.
import Phaser from 'phaser';
import playerSheetUrl from '../assets/worker_spritesheet.png';
import floorTileUrl from '../assets/floor_tile.png';
import furnitureManifest from '../data/furniturePlacement.json';

// Vite eagerly resolves every PNG under assets/tiles/ to a build-time URL
// (query/import behavior identical to a normal `import x from '...png'`,
// just done in bulk) — { '../assets/tiles/tile_017.png': '/actual/url.png', ... }
const tileImageUrls = import.meta.glob('../assets/tiles/*.png', { eager: true, import: 'default' });

const PLAYER_FRAME_W = 72;
const PLAYER_FRAME_H = 72;
const PLAYER_SHEET_COLS = 8;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.spritesheet('player_sheet', playerSheetUrl, {
      frameWidth: PLAYER_FRAME_W,
      frameHeight: PLAYER_FRAME_H
    });

    // Episode 1 room, tile-based version — see data/collision.js's header
    // comment and src/assets/episode1_map.json for how this is laid out:
    //   - 'floor_tile': one repeating floor texture, drawn as a real Tiled
    //     tile-layer grid (Episode1Scene.buildRoom)
    //   - 'episode1_map': the Tiled-format JSON itself, loaded as raw data
    //     (not via load.tilemapTiledJSON — its object layers reference
    //     furniture by filename, which Phaser's own tilemap loader doesn't
    //     know how to resolve, so Episode1Scene reads it directly instead)
    //   - each furniture/prop image cropped from the tiledrm.png asset sheet
    //     (see furnitureManifest / data/furniturePlacement.json)
    this.load.image('floor_tile', floorTileUrl);

    // Vite glob-import every cropped furniture tile so each one gets a real,
    // build-time-resolved URL (a runtime-built string path wouldn't survive
    // production bundling/hashing) — furnitureManifest just tells us which
    // filenames are actually used.
    const usedFiles = new Set(furnitureManifest.map(p => p.file));
    Object.entries(tileImageUrls).forEach(([path, url]) => {
      const file = path.split('/').pop();
      if (usedFiles.has(file)) this.load.image(`furn_${file}`, url);
    });
  }

  create() {
    this.makeFloor();
    this.makeWall();
    this.makeActor('manager',  0xffd166); // yellow — NPC stays a placeholder box for now
    this.makeArrow();
    this.makePlayerAnims();

    // Draw a static splash behind the start-screen overlay. BootScene stays
    // active (and this splash stays visible) until the player picks an
    // episode from the start screen. At that point ui/startScreen.js calls
    // scene.start('EpisodeXScene'), which tears BootScene down and the new
    // scene draws the actual game world.
    this.drawSplash();
  }

  drawSplash() {
    const cx = 320, cy = 240;
    this.add.rectangle(cx, cy, 480, 200, 0x22223b)
      .setStrokeStyle(4, 0x0f0f1c);

    this.add.text(cx, cy - 60, 'TIMEDOOR ACADEMY', {
      fontSize: '22px',
      fontFamily: '"Courier New", monospace',
      color: '#4ecdc4',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(cx, cy - 25, 'Admin Onboarding Simulator', {
      fontSize: '12px',
      fontFamily: '"Courier New", monospace',
      color: '#f4f1de',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(cx, cy + 20, 'Pilih episode dari menu', {
      fontSize: '10px',
      fontFamily: '"Courier New", monospace',
      color: '#888',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(cx, cy + 60, 'WASD / arrow keys untuk gerak', {
      fontSize: '9px',
      fontFamily: '"Courier New", monospace',
      color: '#666',
      align: 'center'
    }).setOrigin(0.5);
  }

  makeFloor() {
    const g = this.add.graphics({ x: 0, y: 0 });
    g.fillStyle(0x2a2a4a, 1);
    g.fillRect(0, 0, 64, 64);
    // Subtle stripes for a "tiled" feel.
    g.fillStyle(0x34345a, 1);
    g.fillRect(0, 0, 64, 4);
    g.fillRect(0, 32, 64, 2);
    g.generateTexture('floor', 64, 64);
    g.destroy();
  }

  makeWall() {
    const g = this.add.graphics();
    g.fillStyle(0x0f0f1c, 1);
    g.fillRect(0, 0, 32, 32);
    g.lineStyle(2, 0x22223b, 1);
    g.strokeRect(1, 1, 30, 30);
    g.generateTexture('wall', 32, 32);
    g.destroy();
  }

  makeActor(key, bodyColour) {
    const g = this.add.graphics();
    // Body
    g.fillStyle(bodyColour, 1);
    g.fillRect(0, 0, 32, 48);
    // Outline
    g.lineStyle(3, 0x0f0f1c, 1);
    g.strokeRect(0, 0, 32, 48);
    // Face dot so it's clear which way they're "looking".
    g.fillStyle(0x0f0f1c, 1);
    g.fillRect(12, 8, 8, 4);
    g.generateTexture(key, 32, 48);
    g.destroy();
  }

  makeArrow() {
    const g = this.add.graphics();
    g.fillStyle(0x06d6a0, 1);
    g.lineStyle(2, 0x0f0f1c, 1);
    // Triangle pointing down.
    g.beginPath();
    g.moveTo(4, 0);
    g.lineTo(20, 0);
    g.lineTo(12, 18);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.generateTexture('arrow', 24, 22);
    g.destroy();
  }

  // Row order in the spritesheet: idle/walk pairs per direction (see header
  // comment for the full layout). Each row has 8 columns. Idle rows repeat
  // the same still 8x — animating them is harmless (looks static) and keeps
  // the key scheme identical between idle/walk.
  makePlayerAnims() {
    const rows = [
      'idle_down', 'walk_down',
      'idle_up', 'walk_up',
      'idle_left', 'walk_left',
      'idle_right', 'walk_right'
    ];
    rows.forEach((name, row) => {
      const start = row * PLAYER_SHEET_COLS;
      this.anims.create({
        key: `player_${name}`,
        frames: this.anims.generateFrameNumbers('player_sheet', { start, end: start + PLAYER_SHEET_COLS - 1 }),
        frameRate: name.startsWith('walk') ? 10 : 3,
        repeat: -1
      });
    });
  }

}