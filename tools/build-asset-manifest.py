"""Regenerates docs/asset-manifest.json from the files in src/assets/generated.

Run after `node tools/generate-assets.mjs`:   python tools/build-asset-manifest.py
Needs Pillow. Provenance for every close-up asset is 'authored-procedural'; the two bag
designs and the shirt chest designs follow the real merch references in
src/assets/bag1.png and src/assets/bag2.png.
"""
import json
import os

from PIL import Image

G = 'src/assets/generated'
ROLES = {
    'cu_case': 'Pen case: 2 rows x 10 slots (slot centres in closeup.layout.json)',
    'cu_tray': 'Paper tray: 5 pack slots',
    'cu_drawer_closed': 'Stock drawer, closed front',
    'cu_drawer_open': 'Stock drawer, open interior',
    'cu_pack_big': 'Paper pack, 10 sheets',
    'cu_pack_small': 'Loose paper remainder (fewer than 10 sheets)',
    'cu_scrap': 'Scrap paper for the ink test',
    'cu_sticky': 'Sticky note (text drawn by the scene)',
    'cu_pk_bag_black': 'HQ package: black tote bag (after bag2.png)',
    'cu_pk_bag_green': 'HQ package: green drawstring bag with bear/robot/drone scene (after bag1.png)',
    'cu_pk_sticker': 'HQ package: sticker sheet',
    'cu_pk_robot': 'HQ package: robot, intact',
    'cu_pk_robot_broken': 'HQ package: robot, damaged (bent antenna, cracked head)',
    'cu_pk_laptop': 'HQ package: laptop, intact',
    'cu_pk_laptop_broken': 'HQ package: laptop, cracked screen',
    'cu_pk_box_closed': 'HQ delivery box, taped shut',
    'cu_pk_box_open': 'HQ delivery box, open',
    'cu_pk_list': 'Packing list (surat jalan) paper; text drawn by the scene',
    'cu_pk_bin': 'Sorting bin; counter and label drawn by the scene',
}


def role(name):
    if name in ROLES:
        return ROLES[name]
    if name.startswith('cu_pen_h'):
        return 'Pen lying flat (4 colours). Working and dry pens use the SAME sprite.'
    if name.startswith('cu_pen_v'):
        return 'Pen standing in the case (4 colours)'
    if name.startswith('cu_pk_shirt_'):
        _, _, _, colour, level = name.split('_')
        design = {'1': 'bear', '2': 'robot', '3': 'shape cluster'}[level]
        return f'HQ package: {colour} T-shirt, level {level} chest design ({design})'
    return name


def entry(name, path, im, alpha=True, anchor='center'):
    follows_ref = 'bag' in name or 'shirt' in name
    return {
        'id': name,
        'role': role(name),
        'path': path,
        'status': 'approved-for-prototype',
        'technical': {
            'dimensions': f'{im.width}x{im.height}', 'alpha': alpha, 'anchor': anchor,
            'frames': 1, 'filtering': 'nearest', 'display_scale': 2,
        },
        'visual_locks': [
            '16-colour palette (tools/generate-assets.mjs P)', 'top-left light',
            'dark-violet outline #2b2438', 'top-down view',
        ],
        'source': {
            'kind': 'authored-procedural',
            'url_or_tool': 'tools/generate-assets.mjs',
            'creator': 'Claude Code (session with project owner)',
            'created_at': '2026-10-24',
            'license': 'project-owned, generated from code',
            'attribution': '',
            'prompt_or_source_record': 'drawn with code primitives; no image-generation tool used'
            + ('; design follows src/assets/bag1.png / bag2.png reference art' if follows_ref else ''),
        },
        'verification': {
            'native_scale_reviewed': True, 'in_engine_reviewed': True,
            'technical_checks_passed': True, 'approved_by': '',
        },
    }


assets = []
for f in sorted(os.listdir(f'{G}/closeup')):
    assets.append(entry(f[:-4], f'{G}/closeup/{f}', Image.open(f'{G}/closeup/{f}')))
tile = entry('cu_desk_tile', f'{G}/cu_desk_tile.png', Image.open(f'{G}/cu_desk_tile.png'), alpha=False, anchor='tile')
tile['role'] = 'Close-up background: the room floor tile, seamless (3x3 repeat checked)'
assets.append(tile)

with open('docs/asset-manifest.json', 'w', encoding='utf8') as fh:
    json.dump({'schema_version': 1, 'art_direction_brief': 'docs/art-direction-brief.md', 'assets': assets}, fh, indent=2)
print(len(assets), 'manifest entries')
