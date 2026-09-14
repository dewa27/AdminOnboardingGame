// Collision shapes for Episode 1's room, matched against the furniture and
// walls painted into assets/map.png (v2 Timedoor-branded art). Coordinates
// are in 640x480 game space (map.png is 1448x1086, scaled down by 2.2625x —
// see stations.js for the same conversion applied to station/NPC positions).
//
// Hand-tuned with tools/collision-editor.html — open it via the dev server
// (e.g. http://localhost:5173/tools/collision-editor.html), it auto-loads
// this file, lets you draw/drag/resize boxes AND circles visually, then
// "Copy to clipboard" and paste the result back in here.
//
// Two shapes are supported:
//   - rect:   { id, shape: 'rect', x, y, w, h }     — x,y is the TOP-LEFT corner
//   - circle: { id, shape: 'circle', x, y, r }       — x,y is the CENTER
// `shape` can be omitted and defaults to 'rect' (keeps old entries valid).
//
// See Episode1Scene.buildCollision(), which turns each one into a static
// arcade-physics body (a rectangle body for 'rect', a round body sized to
// match the circle for 'circle') that the player collides with. Toggle
// window.__debugCollision = true before starting Episode 1 to draw them.
export const collisionRects = [
  { id: 'wall_left', x: 0, y: 0, w: 34, h: 480 },
  { id: 'wall_right', x: 619, y: 0, w: 21, h: 480 },
  { id: 'wall_top_left', x: 0, y: 0, w: 275, h: 121 },
  { id: 'wall_top_right', x: 345, y: 0, w: 295, h: 66 },
  { id: 'wall_bottom_left', x: 0, y: 380, w: 234, h: 62 },
  { id: 'wall_bottom_right', x: 316, y: 380, w: 324, h: 62 },
  { id: 'divider_top', x: 338, y: 66, w: 16, h: 175 },
  { id: 'divider_bottom', x: 338, y: 309, w: 16, h: 71 },
  { id: 'reception_desk', x: 98, y: 173, w: 156, h: 53 },
  { id: 'bookshelf_wall', x: 279, y: 78, w: 48, h: 88 },
  { id: 'water_dispenser', x: 311, y: 150, w: 21, h: 56 },
  { id: 'trash_bin', x: 290, y: 175, w: 22, h: 24 },
  { id: 'sofa', x: 38, y: 285, w: 39, h: 95 },
  { id: 'ottoman', x: 88, y: 360, w: 40, h: 27 },
  { id: 'plant_entrance_left', x: 194, y: 396, w: 36, h: 46 },
  { id: 'plant_entrance_right', x: 316, y: 396, w: 35, h: 46 },
  { id: 'box_2', x: 177, y: 146, w: 29, h: 28 },
  { id: 'box_7', x: 123, y: 145, w: 31, h: 28 },
  { id: 'small_shelf_right', x: 349, y: 146, w: 36, h: 48 },
  { id: 'desk_topleft', x: 413, y: 177, w: 115, h: 68 },
  { id: 'desk_botleft', x: 413, y: 287, w: 115, h: 69 },
  { id: 'corner_shelf', x: 572, y: 281, w: 40, h: 92 },
  { id: 'plant_right_top', x: 559, y: 113, w: 40, h: 53 },
  { id: 'plant_right_bottom', x: 575, y: 270, w: 37, h: 28 },
  { id: 'circle_1', shape: 'circle', x: 59, y: 215, r: 16 },
  { id: 'circle_3', shape: 'circle', x: 51, y: 271, r: 14 },
  { id: 'circle_4', shape: 'circle', x: 109, y: 335, r: 19 },
  { id: 'circle_5', shape: 'circle', x: 207, y: 333, r: 27 },
  { id: 'circle_6', shape: 'circle', x: 242, y: 332, r: 19 },
  { id: 'circle_7', shape: 'circle', x: 173, y: 322, r: 18 },
  { id: 'circle_8', shape: 'circle', x: 244, y: 273, r: 26 },
  { id: 'circle_9', shape: 'circle', x: 276, y: 282, r: 17 },
  { id: 'circle_10', shape: 'circle', x: 209, y: 276, r: 19 },
];
