// Episode1Scene — top-down view of one Timedoor Academy branch, built from
// a real tile-based room (see data/episode1_map.json, a Tiled-format JSON)
// instead of the older single map.png illustration.
//
// The room has three drawn layers, all read from episode1_map.json:
//   1. 'floor' tile layer  — one repeating floor texture across a 20x15
//      grid of 32px tiles (640x480), rendered as a genuine Phaser Tilemap.
//   2. 'walls' object layer — flat-color rectangles along the same
//      boundary data/collision.js already uses for physics, so the visual
//      walls and the invisible collision walls can never drift apart.
//   3. 'furniture' object layer — individual sprites cropped from the
//      tiledrm.png asset sheet (src/assets/tiles/), positioned to
//      approximate the old map.png layout.
//
// Why not load episode1_map.json via Phaser's this.load.tilemapTiledJSON:
// its walls/furniture are irregular object layers (not a uniform tile grid)
// referencing plain image filenames, which Phaser's own Tiled loader doesn't
// resolve — so BootScene loads it as plain JSON data and this scene draws
// each layer itself in buildRoom().
//
// See data/stations.js for the exact landmark coordinates (reception desk,
// wall shelf, classroom) — those didn't move, so ep1Script/collision/NPC
// positions are unaffected by the switch to tiles.
//
// The scene drives the script from data/ep1Script.js. When the player walks
// close to the active target and presses E/Space, the corresponding overlay
// is shown (dialogue, checklist, etc.). The scene is otherwise just a stage
// for the DOM-based overlay views.
import Phaser from 'phaser';
import { Player } from '../systems/player.js';
import { gameState } from '../state/gameState.js';
import { ep1Script } from '../data/ep1Script.js';
import { stations, NPC_POS, PLAYER_START, INTERACT_RADIUS } from '../data/stations.js';
import { collisionRects } from '../data/collision.js';
import episode1Map from '../data/episode1_map.json';
import { overlay } from '../ui/overlay.js';
import { runDialogue } from '../ui/dialogue.js';
import { runChecklist } from '../ui/checklist.js';
import { runEp1Summary } from '../ui/summary.js';

export class Episode1Scene extends Phaser.Scene {
  constructor() {
    super('Episode1Scene');
  }

  create() {
    // Reset state on (re)entry.
    gameState.episode1.report = [];

    // World bounds match the visible room (no scrolling yet).
    this.physics.world.setBounds(0, 0, 640, 480);

    this.buildRoom();
    this.buildStations();
    this.buildNPC();
    this.buildPlayer();
    this.buildCollision();
    this.buildPrompt();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.interactKeyAlt = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Drive the script.
    this.scriptIndex = 0;
    this.activeTarget = null;
    this.scriptDone = false;

    overlay.hide();
    this.runNextStep();
  }

  // ---------- World construction ----------

  buildRoom() {
    this.buildFloorLayer();
    this.buildWallsLayer();
    this.buildFurnitureLayer();
  }

  // Real Phaser Tilemap for the floor — the one layer that's genuinely a
  // uniform grid, built from the loaded episode1_map.json + floor_tile image.
  buildFloorLayer() {
    // this.make.tilemap takes positional args, not a config object: blank
    // map since we're skipping Phaser's own Tiled-cache loading (see the
    // class doc comment for why) and stamping tiles ourselves below.
    const map = this.make.tilemap(
      undefined, episode1Map.tilewidth, episode1Map.tileheight,
      episode1Map.width, episode1Map.height
    );
    const floorLayerData = episode1Map.layers.find(l => l.name === 'floor');
    // Phaser's make.tilemap doesn't accept raw layer data directly, so we
    // build the layer manually: create a blank layer, then stamp every
    // cell with the floor tile's index (LayerData expects 0-based tile
    // indices per tileset, and our floor tileset has exactly one tile).
    const tileset = map.addTilesetImage('floor', 'floor_tile', episode1Map.tilewidth, episode1Map.tileheight, 0, 0);
    const layer = map.createBlankLayer('floor', tileset, 0, 0);
    for (let y = 0; y < episode1Map.height; y++) {
      for (let x = 0; x < episode1Map.width; x++) {
        const gid = floorLayerData.data[y * episode1Map.width + x];
        if (gid > 0) layer.putTileAt(gid - 1, x, y);
      }
    }
    layer.setDepth(0);
    this.floorLayer = layer;
  }

  // Flat-color rectangles matching data/collision.js's wall/divider boxes
  // exactly (see episode1_map.json's "walls" object layer, built from the
  // same source list) — the visual wall and the invisible collision wall
  // can never drift apart since they share one set of numbers.
  buildWallsLayer() {
    const wallsLayer = episode1Map.layers.find(l => l.name === 'walls');
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x8a8690, 1);
    g.lineStyle(1, 0x5f5b66, 1);
    wallsLayer.objects.forEach(o => {
      g.fillRect(o.x, o.y, o.width, o.height);
      g.strokeRect(o.x, o.y, o.width, o.height);
    });
  }

  // Furniture sprites cropped from tiledrm.png, positioned per
  // episode1_map.json's "furniture" object layer (see data/furniturePlacement.json,
  // the source list that layer was generated from).
  buildFurnitureLayer() {
    const furnitureLayer = episode1Map.layers.find(l => l.name === 'furniture');
    furnitureLayer.objects.forEach(o => {
      const fileProp = o.properties.find(p => p.name === 'file');
      const sprite = this.add.image(o.x, o.y, `furn_${fileProp.value}`).setOrigin(0);
      sprite.setDisplaySize(o.width, o.height);
      sprite.setDepth(2);
    });
  }

  buildStations() {
    this.arrowGfx = {};

    stations.forEach(st => {
      // No flat placeholder box anymore — the real furniture is already
      // painted into map.png. Just label it and give it a pulsing arrow.
      this.add.text(st.x, st.y + 26, st.label, {
        fontSize: '11px',
        fontFamily: '"Courier New", monospace',
        color: '#f4f1de',
        backgroundColor: '#0f0f1c',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setDepth(1000);

      // Pulsing arrow (hidden until this station is the active target).
      const arrow = this.add.image(st.x - 12, st.y - 40, 'arrow').setOrigin(0).setDepth(1000);
      arrow.setVisible(false);
      this.arrowGfx[st.id] = arrow;
    });
  }

  buildNPC() {
    // Manager NPC — still the flat placeholder box (see BootScene.makeActor)
    // since we only have a player spritesheet so far.
    this.manager = this.add.image(NPC_POS.x, NPC_POS.y, 'manager').setOrigin(0.5);

    // Y-sorted (see registerYSort/applyYSort below) — depth is recalculated
    // every frame from its feet position instead of a fixed setDepth() call.
    this.registerYSort(this.manager, 0);

    const managerLabel = this.add.text(NPC_POS.x, NPC_POS.y - 34, 'Manajer', {
      fontSize: '9px',
      fontFamily: '"Courier New", monospace',
      color: '#f4f1de',
      backgroundColor: '#0f0f1c',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
    // Y-sorts as if it were part of the manager sprite (see registerYSort's
    // followY), +1 so it draws just above the manager's own body depth.
    this.registerYSort(managerLabel, 1, this.manager);
  }

  buildPlayer() {
    this.player = new Player(this, PLAYER_START.x, PLAYER_START.y);

    // Y-sorted against the manager (and, later, any cut-out furniture piece
    // tall enough to stand in front of/behind) — see registerYSort/applyYSort.
    this.registerYSort(this.player.sprite, 0);

    // Sprite is origin-centered and much taller than the old placeholder box,
    // so the "Kamu" label needs to float above the sprite's head — and follow
    // it, since (unlike the manager) the player actually walks around.
    this.playerLabel = this.add.text(PLAYER_START.x, PLAYER_START.y - 40, 'Kamu', {
      fontSize: '9px',
      fontFamily: '"Courier New", monospace',
      color: '#f4f1de',
      backgroundColor: '#0f0f1c',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
    // Y-sorts as if it were part of the player sprite (see registerYSort's
    // followY), +1 so it draws just above the player's own body depth.
    this.registerYSort(this.playerLabel, 1, this.player.sprite);
  }

  // ---------- Y-sort ----------
  //
  // Any sprite added here gets its depth recomputed every frame from its own
  // Y position (plus an optional per-object offset, e.g. to compensate for
  // an origin that isn't at the sprite's feet) — so two overlapping sprites
  // naturally draw whichever one is visually "lower" (closer to the camera
  // in a top-down room) on top. This is what makes the player walk in front
  // of the manager when below them and behind when above them.
  //
  // The room background/floor and other UI elements (prompts, arrows) are
  // NOT part of this system — they use fixed depths outside the Y-sort
  // range (background/floor at 0, furniture at 2, sortable actors + their
  // labels get depths in the 10-999 range via this list) so they're never
  // accidentally reordered relative to a walking character.
  //
  // A name label floats above its owner's head, so its own Y is always
  // "further up" than the character standing behind/in front of it — depth-
  // sorting the label by its OWN y would make every label draw as if it
  // belonged to whichever character is closest to the label's height, which
  // is wrong. Instead `followY` lets a label track a different object's Y
  // (its owner's) while keeping its own screen position — so "Manajer"
  // Y-sorts exactly as if it were part of the manager sprite, and likewise
  // for "Kamu" and the player.
  registerYSort(gameObject, feetOffset = 0, followY = null) {
    if (!this.ySortList) this.ySortList = [];
    this.ySortList.push({ obj: gameObject, feetOffset, followY });
  }

  applyYSort() {
    if (!this.ySortList) return;
    this.ySortList.forEach(({ obj, feetOffset, followY }) => {
      const y = followY ? followY.y : obj.y;
      obj.setDepth(10 + y + feetOffset);
    });
  }

  // Invisible static physics bodies matching the walls/furniture painted
  // into map.png (see data/collision.js for the rectangles) — keeps the
  // player from walking through desks, the bookshelf, plants, etc.
  buildCollision() {
    this.collisionGroup = this.physics.add.staticGroup();

    collisionRects.forEach(r => {
      if (r.shape === 'circle') {
        // Zone is sized to the circle's bounding box so setCircle's default
        // (radius = min(width,height)/2, centered) lines up with r.x/r.y
        // being the circle's center.
        const zone = this.add.zone(r.x, r.y, r.r * 2, r.r * 2);
        this.physics.add.existing(zone, true);
        zone.body.setCircle(r.r);
        this.collisionGroup.add(zone);
      } else {
        const zone = this.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h);
        this.physics.add.existing(zone, true); // true = static body
        this.collisionGroup.add(zone);
      }
    });

    this.physics.add.collider(this.player.sprite, this.collisionGroup);

    // DEBUG ONLY — outline every collision shape in red so misalignment
    // against the map art is visible at a glance. Toggle with window.__debugCollision.
    if (window.__debugCollision) {
      const g = this.add.graphics().setDepth(50);
      g.lineStyle(1, 0xff0000, 1);
      collisionRects.forEach(r => {
        if (r.shape === 'circle') g.strokeCircle(r.x, r.y, r.r);
        else g.strokeRect(r.x, r.y, r.w, r.h);
      });
    }
  }

  buildPrompt() {
    this.prompt = this.add.text(0, 0, '[E] Cek', {
      fontSize: '11px',
      fontFamily: '"Courier New", monospace',
      color: '#1a1a2e',
      backgroundColor: '#06d6a0',
      padding: { x: 6, y: 3 }
    }).setOrigin(0.5).setDepth(1000).setVisible(false);
  }

  // ---------- Script runner ----------

  runNextStep() {
    if (this.scriptDone) return;

    const step = ep1Script[this.scriptIndex];
    if (!step) {
      this.scriptDone = true;
      return;
    }

    switch (step.type) {
      case 'dialogue':
        this.runDialogueStep(step);
        break;
      case 'navigate':
        this.runNavigateStep(step);
        break;
      case 'checklist':
        this.runChecklistStep(step);
        break;
      case 'summary':
        this.scriptIndex += 1;
        this.scriptDone = true;
        runEp1Summary(() => this.startEpisode2());
        break;
      default:
        this.scriptIndex += 1;
        this.runNextStep();
    }
  }

  runDialogueStep(step) {
    runDialogue(step.speaker, step.text, () => {
      this.scriptIndex += 1;
      this.runNextStep();
    });
  }

  runNavigateStep(step) {
    this.activeTarget = step.target;
    this.refreshActiveArrow();
    runDialogue(
      'Petunjuk',
      `Jalan ke <strong>${step.label}</strong> dan tekan [E] untuk mengecek.`,
      () => { /* wait for player to walk there */ },
      { dismissable: false, hint: 'auto' }
    );
    this.scriptIndex += 1;
  }

  runChecklistStep(step) {
    // Move to a clean state: no active target while the checklist is open.
    this.activeTarget = null;
    this.refreshActiveArrow();
    this.prompt.setVisible(false);

    runChecklist(step, () => {
      this.scriptIndex += 1;
      this.runNextStep();
    });
  }

  refreshActiveArrow() {
    Object.entries(this.arrowGfx).forEach(([id, arrow]) => {
      arrow.setVisible(id === this.activeTarget);
    });
  }

  // ---------- Loop ----------

  update() {
    if (this.player) {
      this.player.update(this.cursors, this.wasd);
      this.playerLabel.setPosition(this.player.sprite.x, this.player.sprite.y - 40);
    }

    this.applyYSort();

    // Proximity check vs. active target.
    if (this.activeTarget && !overlay.isVisible()) {
      const target = stations.find(s => s.id === this.activeTarget);
      const dist = Phaser.Math.Distance.Between(
        this.player.sprite.x, this.player.sprite.y,
        target.x, target.y
      );

      if (dist < INTERACT_RADIUS) {
        this.prompt.setPosition(this.player.sprite.x, this.player.sprite.y - 44);
        this.prompt.setVisible(true);

        if (Phaser.Input.Keyboard.JustDown(this.interactKey) ||
            Phaser.Input.Keyboard.JustDown(this.interactKeyAlt)) {
          // Consume the navigation step — run the next script step
          // (which the script author should have placed as a 'checklist').
          const next = ep1Script[this.scriptIndex];
          if (next && next.type === 'checklist') {
            this.runChecklistStep(next);
          } else {
            // Defensive: if there's no checklist queued, just advance.
            this.scriptIndex += 1;
            this.runNextStep();
          }
        }
      } else {
        this.prompt.setVisible(false);
      }
    } else {
      this.prompt.setVisible(false);
    }

    // Arrow bob animation (only the visible one).
    const t = this.time.now / 200;
    Object.values(this.arrowGfx).forEach(a => {
      if (!a.visible) return;
      const baseY = stations.find(s => s.id === this.activeTarget).y - 40;
      a.y = baseY + Math.sin(t) * 4;
    });
  }

  // ---------- Scene transitions ----------

  startEpisode2() {
    overlay.hide();
    this.scene.start('Episode2Scene');
  }
}