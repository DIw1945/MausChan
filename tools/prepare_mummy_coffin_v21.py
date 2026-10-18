"""Slice only the generated four-frame coffin sheet, keeping the stonework aligned."""
from pathlib import Path
import json, hashlib
import numpy as np
from scipy.ndimage import label, find_objects
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
A = ROOT / 'dist/assets'


def main():
    source_name = 'mummy-coffin-v21-generated.png'
    source = Image.open(A / source_name).convert('RGBA')
    source.putalpha(source.getchannel('A').point(lambda a: a if a >= 32 else 0))
    pixels = np.asarray(source)
    labels, _ = label(pixels[:, :, 3] > 0)
    cells = [[] for _ in range(4)]
    for ident, region in enumerate(find_objects(labels), 1):
        if region is None or np.count_nonzero(labels[region] == ident) < 12:
            continue
        y, x = region
        col, row = int((x.start + x.stop) / source.width), int((y.start + y.stop) / source.height)
        assert row in (0, 1) and col in (0, 1)
        cells[row * 2 + col].append((x.start, y.start, x.stop, y.stop))
    subjects = []
    for parts in cells:
        assert parts, 'Missing frame'
        bounds = (min(b[0] for b in parts), min(b[1] for b in parts), max(b[2] for b in parts), max(b[3] for b in parts))
        assert bounds[2]-bounds[0] < source.width*.49 and bounds[3]-bounds[1] < source.height*.49, ('Merged cells', bounds)
        sprite = source.crop(bounds)
        rgba = np.asarray(sprite).astype(float)
        r, g, b, a = rgba.transpose(2, 0, 1)
        # Gold stonework is the alignment reference; moving ivory linen is excluded.
        gold_mask = (a > 100) & (r > 100) & (g > 65) & (b < g*.62) & (r > g*1.25)
        gold_labels, _ = label(gold_mask)
        counts = np.bincount(gold_labels.ravel())
        # Ignore small warm-coloured flecks on the moving cloth when finding
        # the stonework's horizontal extent, then keep its complete gold bounds.
        stone = [region for ident, region in enumerate(find_objects(gold_labels), 1)
                 if region is not None and counts[ident] >= 200]
        assert stone
        left, right = min(region[1].start for region in stone), max(region[1].stop for region in stone)
        gold_mask[:, :left] = False;gold_mask[:, right:] = False
        yy, xx = np.where(gold_mask)
        assert len(xx) > 100
        gold = (int(xx.min()), int(yy.min()), int(xx.max()+1), int(yy.max()+1))
        subjects.append((sprite, bounds, gold))
    # Preserve the same scale for all poses; align to the unanimated gold body.
    scale = min(72 / (gold[3]-gold[1]) for _, _, gold in subjects)
    atlas = Image.new('RGBA', (448, 112))
    folder = A / 'mummy-coffin-v21-frames';folder.mkdir(exist_ok=True)
    sequence = [];hashes = []
    for i, (sprite, bounds, gold) in enumerate(subjects):
        size = (round(sprite.width*scale), round(sprite.height*scale))
        image = sprite.resize(size, Image.Resampling.NEAREST)
        x, y = round(48-(gold[0]+gold[2])/2*scale), round(98-gold[3]*scale)
        assert x >= 2 and y >= 2 and x+size[0] <= 110 and y+size[1] <= 110, ('Clipped frame', i, x, y, size)
        frame = Image.new('RGBA', (112, 112));frame.paste(image, (x, y))
        name = f'mummy-coffin-v21-frames/coffin-{i}.png';frame.save(A / name);atlas.paste(frame, (i*112, 0))
        hashes.append(hashlib.sha256(frame.tobytes()).hexdigest())
        sequence.append({'image': 'mummy-coffin-v21-atlas.png', 'file': name, 'x': i*112, 'y': 0, 'w': 112, 'h': 112,
                         'anchor': [56, 80], 'sourceBounds': list(bounds), 'goldBounds': list(gold), 'visibleBounds': list(frame.getbbox())})
    assert len(set(hashes)) == 4, 'Animation needs four distinct poses'
    atlas.save(A / 'mummy-coffin-v21-atlas.png')
    metadata = {'sources': [source_name], 'reference': 'mummy-coffin-v20-generated.png', 'animated': True,
                'fps': 3, 'playback': [0, 1, 2, 3, 2, 1], 'scale': scale,
                'selection': 'complete connected subjects by cell centre; whole bounds; gold-body alignment; nearest-neighbour',
                'placement': 'existing two Mummy spawn points; same 56,80 anchor; no collision changes',
                'sequences': {'mummy-coffin': sequence}}
    (A / 'mummy-coffin-v21-atlas.json').write_text(json.dumps(metadata, indent=2)+'\n', encoding='utf-8')
    for f in sequence:
        frame = Image.open(A / f['file'])
        assert frame.tobytes() == atlas.crop((f['x'], 0, f['x']+112, 112)).tobytes()
        assert all(frame.getpixel(p)[3] == 0 for p in [(0, 0), (111, 0), (0, 111), (111, 111)])
    print(json.dumps({'uniqueFrames': 4, 'fps': 3, 'playback': metadata['playback'], 'frameAtlasMatch': True,
                      'visibleBounds': [f['visibleBounds'] for f in sequence]}))


if __name__ == '__main__':
    main()
