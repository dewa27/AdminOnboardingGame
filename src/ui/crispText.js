// Readable text inside Phaser scenes.
//
// The game runs with pixelArt: true, which scales every texture with nearest-neighbour.
// That is right for sprites but makes small canvas text look jagged. So text is drawn at
// 3x resolution and its own texture is switched to linear filtering; the pixel art next
// to it stays crisp. Same font as the HTML overlays so the game reads as one UI.
import Phaser from 'phaser';

export const UI_FONT = 'Poppins, "Segoe UI", Arial, sans-serif';

export function crispText(scene, x, y, str, style = {}) {
  // fontFamily is forced: pixel-style Courier text was the readability problem.
  const t = scene.add.text(x, y, str, { ...style, fontFamily: UI_FONT, resolution: 3 });
  t.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return t;
}
