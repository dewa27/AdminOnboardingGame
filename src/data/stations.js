// Stations placed in the Episode 1 room. Coordinates are in pixels and assume
// a 640x480 room rendered on top of assets/map.png (see config.js and
// Episode1Scene.buildRoom). `id` matches the targets used in ep1Script.js and
// the check inventory in ChecklistView.
//
// map.png is 1448x1086 (exactly 4:3, same as the 640x480 room — scale factor
// 2.2625 on both axes, no distortion) and depicts the Timedoor Academy
// office (v2 art): reception desk + wall-mounted shelf + meeting tables in
// the left room, a 4-desk classroom in the right room, entrance at the
// bottom-center. These (x, y) values are the map's real landmarks divided
// by 2.2625, re-measured against the current map.png.
export const stations = [
  {
    id: 'meja',
    label: 'Paket HQ',
    icon: '🖊️',
    // Reception desk (left room).
    x: 177,
    y: 186,
    width: 10,
    height: 10
  },
  {
    id: 'kelas',
    label: 'Ruang Kelas',
    icon: '🪑',
    // Right room, between the two rows of desks.
    x: 471,
    y: 265,
    width: 10,
    height: 10
  }
];

// Manager stands in front of the reception desk; player spawns near the
// entrance door at the bottom of the map.
export const NPC_POS = { x: 177, y: 239 };
export const PLAYER_START = { x: 272, y: 411 };

// Soft proximity radius (px) at which the interaction prompt becomes visible.
export const INTERACT_RADIUS = 70;
