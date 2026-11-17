# Art direction brief

Filled from the `create-game-assets` template. Source of truth for every number below is
`tools/generate-assets.mjs`; regenerate with `node tools/generate-assets.mjs`.

## Game frame

- Player fantasy: a new branch Admin on their first day, learning the SOP by doing it with their hands.
- Core verbs: walk, interact (E), then inside a close-up: inspect, drag, test, open, report.
- Engine and renderer: Phaser 3.80, WebGL/Canvas, `pixelArt: true` (nearest-neighbour).
- Target platforms: desktop browsers, shared by link.
- Camera/view/facing: top-down. Room view for walking, flat top-down close-up for task tables.
- Native viewport and common display scale: 640x480 game canvas, scaled to fit with `Scale.FIT`.
- Typical asset size on screen: room props 20-160px; close-up props drawn at native size and shown at exactly **2x**.

## Visual system

- Shape language: chunky, rounded-rectangle office objects; strong readable silhouettes.
- Silhouette priorities: pens (long thin), paper packs (stacked bars) and the case/tray (grids of slots) must be identifiable from shape alone.
- Value structure: dark outline, mid-tone fills, one light accent per object; the close-up background is the room floor tile, so zooming in keeps the room's floor colour.
- Palette roles and exact swatches (16, locked):

| Role | Swatches |
|---|---|
| Outline | `#2b2438` |
| Wall / structure | `#6a6477` `#8d879b` `#b3adc0` |
| Floor | `#cbc1b4` `#b4a99c` |
| Wood (desk, furniture) | `#8f5f38` `#c98f55` `#e6b87e` |
| Timedoor green (brand, accents) | `#1d6a44` `#2f9e5a` `#66c985` |
| White / paper | `#f4f0ea` `#cfc9d3` |
| Navy (chairs, screens, ink) | `#3b4263` |
| Glass / blue | `#8cc3e8` |

- Materials and surface cues: wood = 3-step ramp with grain dashes; paper = white with cool-grey edges and a green band; metal = grey (`#8d879b`).
- Edge/line treatment: 1px dark outline on the outside of every sprite; no outlines inside a sprite except where a shadow ramp step is needed.
- Lighting direction and contrast: light from the top-left; highlights on top/left edges, shadows on bottom/right.
- Detail density and focal hierarchy: low detail, high clarity. The interactive items (pens, packs) are the brightest things on the desk.
- Motion character: items snap into slots; no easing that blurs pixels (positions land on whole 2x pixels).
- Explicit exclusions: pure black, gradients, anti-aliasing, text baked into sprites, non-integer scaling, rotation by non-90 degrees.

## Technical contract

- Asset dimensions/aspect: see `docs/asset-manifest.json` (pens 26x8 / 8x26, packs 24x18 / 24x12, scrap 28x34, case 130x74, tray 130x34, drawer 138x100, sticky 105x58, desk tile 32x32).
- Alpha/background: transparent PNG for every sprite; the desk tile is opaque and repeats.
- Grid/tile/frame size: 32px tiles for the room; close-up pieces are free-size but always drawn on whole pixels and shown at 2x.
- Anchor/pivot/baseline: sprites use centre origin in the close-up; slot centres come from `closeup.layout.json`.
- Filtering/mipmaps/compression: nearest, no mipmaps, lossless PNG.
- Color space: sRGB.
- Texture/poly/material budgets: close-up atlas 512px wide; whole close-up set is a few KB.
- Naming and folders: `src/assets/generated/closeup/cu_<thing>[_variant].png`; atlas `closeup.png/.json`; layout `closeup.layout.json`.

## Close-up rules that matter for gameplay

- **Dry and working pens are the same sprite.** Nothing in the art may hint which is which; the only way to know is the ink test on the scrap paper.
- Slot coordinates in the art are the single source of truth for where items snap; the scene reads `closeup.layout.json` and never hard-codes them.
- The sticky note is green (not tan) so it separates from the desk; its text is drawn by the scene.
- HQ package items follow the real merch references (`src/assets/bag1.png`: green drawstring bag with bear, robot, drone; `bag2.png`: black tote with logo and colourful shapes). The palette has no red or yellow, so those shapes use orange-tan, tan, blue and green. "Black" cloth uses the outline colour `#2b2438`.
- T-shirt chest designs per level: L1 bear, L2 robot, L3 shape cluster, in black and white shirts.
- Damaged items (robot, laptop) must be recognisable at native size by shape alone (bent antenna, crack), without text.

## Visual target

- Approved seed/reference paths: `src/assets/generated/closeup/cu_pen_h0.png` (hero asset); real merch references `src/assets/bag1.png`, `src/assets/bag2.png`.
- Required do/don't examples: do keep every colour inside the 16 swatches (the generator fails the build otherwise); don't add a new colour for a single prop.
- Native-scale gameplay capture: pending, to be captured from `DeskCloseUpScene`.
- Approval owner/date: pending project owner.
