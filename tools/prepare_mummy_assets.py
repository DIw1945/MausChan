"""Slice only the generated v18 mummy sheet; never rebuild existing game art."""
from pathlib import Path
from PIL import Image
from scipy.ndimage import label, find_objects
import numpy as np
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
A = ROOT / 'dist/assets'
DIRECTIONS = ['down', 'left', 'right', 'up']


def subjects(image):
    # Detect complete subjects across the whole source, never cut a fixed cell.
    image = image.convert('RGBA')
    image.putalpha(image.getchannel('A').point(lambda a: a if a >= 40 else 0))
    labels, _ = label(np.asarray(image)[:, :, 3] > 0)
    groups = [[] for _ in range(4)]
    fragments = []
    for ident, region in enumerate(find_objects(labels), 1):
        if region is None:
            continue
        y, x = region
        count = np.count_nonzero(labels[region] == ident)
        box = (x.start, y.start, x.stop, y.stop)
        if count > 100:
            col = min(3, int((x.start + x.stop) / 2 / image.width * 4))
            groups[col].append(box)
        elif count >= 4:
            fragments.append(box)
    result = []
    for col in range(4):
        groups[col].sort(key=lambda b: b[1])
        assert len(groups[col]) == 13, ('missing or merged subjects', col, len(groups[col]))
        for row, box in enumerate(groups[col]):
            assert box[3] - box[1] < image.height / 13 * 1.1, ('merged rows', box)
            # Retain detached pixels belonging to the subject, in full bounds.
            parts = [box]
            for fragment in fragments:
                fx, fy = (fragment[0] + fragment[2]) / 2, (fragment[1] + fragment[3]) / 2
                if box[0] - 8 <= fx <= box[2] + 8 and box[1] - 5 <= fy <= box[3] + 5:
                    parts.append(fragment)
            full = (min(b[0] for b in parts), min(b[1] for b in parts), max(b[2] for b in parts), max(b[3] for b in parts))
            result.append({'row': row, 'col': col, 'bounds': full, 'image': image.crop(full)})
    return sorted(result, key=lambda s: (s['row'], s['col']))


def main():
    source = subjects(Image.open(A / 'mummy-v18-generated.png'))
    frames = A / 'mummy-v18-frames'
    frames.mkdir(exist_ok=True)
    mummy = source[:48]
    # One uniform scale preserves body/head consistency through every action.
    walking = [s['image'].height for s in mummy if s['row'] % 3 == 0]
    scale = 54 / float(np.median(walking))
    meta = {'sources': ['mummy-v18-generated.png', 'mummy-v18-draft-generated.png'], 'directions': DIRECTIONS,
            'selection': 'complete connected subjects sorted by column and vertical position; transparent gutters verified; no fixed-cell clipping',
            'layout': '12 frames per direction: four walk, four scratch, four cast; down,left,right,up',
            'scale': scale, 'sequences': {'mummy': [], 'bandage': []}}
    atlas = Image.new('RGBA', (640, 1920))
    for index, subject in enumerate(mummy):
        im = subject['image']
        alpha = np.asarray(im)[:, :, 3]
        # Feet, not the extended arms or ribbons, define the horizontal anchor.
        yy, xx = np.where(alpha[int(im.height * .78):] > 100)
        pivot_x = float(np.median(xx)) if len(xx) else im.width / 2
        size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
        scaled = im.resize(size, Image.Resampling.NEAREST)
        x, y = round(80 - pivot_x * scale), 112 - size[1]
        assert x >= 0 and y >= 0 and x + size[0] <= 160 and y + size[1] <= 160, ('clipped sprite', index, x, y, size)
        frame = Image.new('RGBA', (160, 160))
        frame.paste(scaled, (x, y))
        name = f'mummy-v18-frames/mummy-{index}.png'
        frame.save(A / name)
        sx, sy = index % 4 * 160, index // 4 * 160
        atlas.paste(frame, (sx, sy))
        meta['sequences']['mummy'].append({'file': name, 'image': 'mummy-v18-atlas.png', 'x': sx, 'y': sy, 'w': 160, 'h': 160, 'anchor': [80, 112],
                                          'facing': DIRECTIONS[index // 12], 'action': ['walk', 'scratch', 'cast'][index % 12 // 4], 'sourceBounds': list(subject['bounds']), 'footBaseline': 112})
    atlas.save(A / 'mummy-v18-atlas.png')
    shot_atlas = Image.new('RGBA', (256, 32))
    for index, subject in enumerate(source[48:]):
        im = subject['image']; ratio = min(54 / im.width, 22 / im.height)
        im = im.resize((round(im.width * ratio), round(im.height * ratio)), Image.Resampling.NEAREST)
        frame = Image.new('RGBA', (64, 32));frame.paste(im, ((64 - im.width) // 2, (32 - im.height) // 2))
        name = f'mummy-v18-frames/bandage-{index}.png';frame.save(A / name);shot_atlas.paste(frame, (index * 64, 0))
        meta['sequences']['bandage'].append({'file': name, 'image': 'mummy-bandage-v18-atlas.png', 'x': index * 64, 'y': 0, 'w': 64, 'h': 32, 'anchor': [32, 16], 'sourceBounds': list(subject['bounds'])})
    shot_atlas.save(A / 'mummy-bandage-v18-atlas.png')
    (A / 'mummy-v18-atlas.json').write_text(json.dumps(meta, indent=2) + '\n', encoding='utf-8')
    with zipfile.ZipFile(A / 'mummy-v18-sprites.zip', 'w', zipfile.ZIP_DEFLATED) as pack:
        files = set(meta['sources']) | {'mummy-v18-atlas.json'}
        files.update(f[k] for seq in meta['sequences'].values() for f in seq for k in ('file', 'image'))
        for name in sorted(files):
            pack.write(A / name, name)
        pack.write(ROOT / 'docs/art-prompts/mummy-v18.txt', 'mummy-v18-prompt.txt')
        pack.write(Path(__file__), 'prepare_mummy_assets.py')
    with zipfile.ZipFile(A / 'mummy-v18-sprites.zip') as pack:
        assert pack.testzip() is None
        for sequence in meta['sequences'].values():
            for f in sequence:
                with Image.open(A / f['file']) as frame, Image.open(A / f['image']) as sheet:
                    assert frame.tobytes() == sheet.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h'])).tobytes()
                    assert pack.read(f['file']) == (A / f['file']).read_bytes()
    print(json.dumps({'mummyFrames': len(mummy), 'projectileFrames': 4, 'uniformScale': scale, 'framesAndArchiveVerified': True}))


if __name__ == '__main__':
    main()
