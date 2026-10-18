"""Reslice only Nitro glints; exclude complete cans that spill into their row.

Uses the retained Image Generation source and Pillow. Can run independently of
the historical preparation pipeline, or from repair_sprites_v8.py.
"""
from pathlib import Path
from PIL import Image
import json
import zipfile


def component_bounds(image):
    width, height = image.size
    mask = bytearray(image.getchannel('A').point(lambda a: 255 if a >= 28 else 0).tobytes())
    bounds = []
    for start, value in enumerate(mask):
        if not value:
            continue
        mask[start] = 0
        stack = [start]
        left = right = start % width
        top = bottom = start // width
        area = 0
        while stack:
            index = stack.pop()
            x, y = index % width, index // width
            left, right = min(left, x), max(right, x)
            top, bottom = min(top, y), max(bottom, y)
            area += 1
            for ny in range(max(0, y - 1), min(height, y + 2)):
                for nx in range(max(0, x - 1), min(width, x + 2)):
                    neighbour = ny * width + nx
                    if mask[neighbour]:
                        mask[neighbour] = 0
                        stack.append(neighbour)
        if area >= 16:
            bounds.append((left, top, right + 1, bottom + 1))
    return bounds


def slice_sparkles(assets, metadata):
    source_name = 'nitro-item-v8-generated.png'
    source = Image.open(assets / source_name).convert('RGBA')
    bounds = component_bounds(source)
    groups = []
    for column in range(4):
        # Select complete subjects by their bounding-box centre, not any pixels
        # inside the lower cell: the cans above extend below the row boundary.
        group = [b for b in bounds
                 if column * source.width / 4 <= (b[0] + b[2]) / 2 < (column + 1) * source.width / 4
                 and source.height / 2 <= (b[1] + b[3]) / 2 < source.height]
        if not group:
            raise ValueError(f'No sparkles in source column {column}')
        box = (min(b[0] for b in group), min(b[1] for b in group),
               max(b[2] for b in group), max(b[3] for b in group))
        groups.append((source.crop(box), box))
    scale = 16 / max(max(image.size) for image, _ in groups)
    atlas = Image.new('RGBA', (96, 24))
    frames = []
    output = assets / 'corrected-v8-frames'
    output.mkdir(exist_ok=True)
    for index, (image, box) in enumerate(groups):
        size = tuple(round(dimension * scale) for dimension in image.size)
        frame = Image.new('RGBA', (24, 24))
        frame.alpha_composite(image.resize(size, Image.Resampling.NEAREST),
                              (round(12 - size[0] / 2), round(12 - size[1] / 2)))
        file = f'corrected-v8-frames/nitro-sparkle-{index}.png'
        frame.save(assets / file)
        atlas.alpha_composite(frame, (index * 24, 0))
        frames.append({'image': 'nitro-sparkle-v8-atlas.png', 'x': index * 24,
                       'y': 0, 'w': 24, 'h': 24, 'anchor': [12, 12], 'file': file})
    atlas.save(assets / 'nitro-sparkle-v8-atlas.png')
    metadata['sequences']['nitro-sparkle'] = frames
    metadata['spriteRepair']['nitroSparkle'] = {
        'source': source_name,
        'method': 'complete lower-row components by bounding-box centre; exclude upper-row cans',
        'sourceBounds': [list(box) for _, box in groups],
    }


def main():
    assets = Path(__file__).resolve().parents[1] / 'dist/assets'
    metadata_path = assets / 'corrected-v8-atlas.json'
    metadata = json.loads(metadata_path.read_text(encoding='utf-8'))
    old_frames = metadata['sequences']['nitro-sparkle']
    slice_sparkles(assets, metadata)
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding='utf-8')
    # Keep the downloadable current pack in sync; retain historical v7 files.
    pack = assets / 'burnice-corrected-v8-sprites.zip'
    temporary = pack.with_suffix('.tmp.zip')
    obsolete = {f[key] for f in old_frames for key in ('file', 'image')}
    replacements = {f[key] for f in metadata['sequences']['nitro-sparkle'] for key in ('file', 'image')}
    replacements.add(metadata_path.name)
    with zipfile.ZipFile(pack) as old, zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED) as new:
        for entry in old.infolist():
            if entry.filename not in obsolete | replacements:
                new.writestr(entry, old.read(entry.filename))
        for file in sorted(replacements):
            new.write(assets / file, file)
    temporary.replace(pack)
    print(json.dumps(metadata['spriteRepair']['nitroSparkle']))


if __name__ == '__main__':
    main()
