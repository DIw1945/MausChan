"""Slice the retained Image Generation bomb/rock sheet without redrawing art.

Run only for this asset set; needs Pillow. Historical atlases are untouched.
"""
from pathlib import Path
from PIL import Image
from repair_nitro_sparkles import component_bounds
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'dist/assets'
SOURCE = 'bombs-rocks-v9-generated.png'


def main():
    source = Image.open(ASSETS / SOURCE).convert('RGBA')
    source.putalpha(source.getchannel('A').point(lambda a: a if a >= 28 else 0))
    components = component_bounds(source)
    cells, proof = [], []
    for row in range(5):
        for column in range(4):
            bounds = [b for b in components
                      if column * source.width / 4 <= (b[0] + b[2]) / 2 < (column + 1) * source.width / 4
                      and row * source.height / 5 <= (b[1] + b[3]) / 2 < (row + 1) * source.height / 5]
            if not bounds:
                raise ValueError(f'Empty source frame {column}, {row}')
            box = (min(b[0] for b in bounds), min(b[1] for b in bounds),
                   max(b[2] for b in bounds), max(b[3] for b in bounds))
            cells.append(source.crop(box))
            proof.append({'cell': [column, row], 'sourceBounds': list(box)})
    metadata = {'source': SOURCE, 'sourceSize': list(source.size), 'grid': [4, 5],
                'selection': 'complete components by bounding-box centre, retaining detached sparks and rubble',
                'sequences': {}, 'sourceFrames': proof}
    output = ASSETS / 'bombs-v9-frames'
    output.mkdir(exist_ok=True)
    groups = [('bomb', cells[:4], 64, [32, 50], 24 / cells[0].width),
              ('bomb-blast', cells[4:12], 192, [96, 96], 176 / max(max(c.size) for c in cells[4:12])),
              ('brittle-rock', cells[12:], 96, [48, 76], 54 / cells[12].width)]
    for name, images, size, anchor, scale in groups:
        atlas = Image.new('RGBA', (size * 4, size * ((len(images) + 3) // 4)))
        frames = []
        for index, image in enumerate(images):
            dimensions = tuple(max(1, round(d * scale)) for d in image.size)
            x = round(anchor[0] - dimensions[0] / 2)
            y = round(anchor[1] - dimensions[1] / 2) if name == 'bomb-blast' else anchor[1] - dimensions[1]
            if min(x, y) < 3 or x + dimensions[0] > size - 3 or y + dimensions[1] > size - 3:
                raise ValueError(f'Clipped {name} frame {index}: {dimensions}, {x}, {y}')
            frame = Image.new('RGBA', (size, size))
            frame.alpha_composite(image.resize(dimensions, Image.Resampling.NEAREST), (x, y))
            file = f'bombs-v9-frames/{name}-{index}.png'
            frame.save(ASSETS / file)
            atlas_x, atlas_y = index % 4 * size, index // 4 * size
            atlas.alpha_composite(frame, (atlas_x, atlas_y))
            frames.append({'image': name + '-v9-atlas.png', 'x': atlas_x, 'y': atlas_y,
                           'w': size, 'h': size, 'anchor': anchor, 'file': file})
        atlas.save(ASSETS / (name + '-v9-atlas.png'))
        metadata['sequences'][name] = frames
    metadata['timing'] = {'fuse': 2.2, 'blast': .64, 'rockBreak': .8}
    (ASSETS / 'bombs-v9-atlas.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
    with zipfile.ZipFile(ASSETS / 'bombs-rocks-v9-sprites.zip', 'w', zipfile.ZIP_DEFLATED) as pack:
        paths = {SOURCE, 'bombs-v9-atlas.json'}
        paths.update(f[key] for seq in metadata['sequences'].values() for f in seq for key in ('file', 'image'))
        for path in sorted(paths):
            pack.write(ASSETS / path, path)
        pack.write(ROOT / 'docs/art-prompts/bombs-v9.txt', 'PROMPT.txt')
        pack.writestr('README.txt', 'Bombs v9: 20 transparent frames from built-in Image Generation.\n4 bomb states (frame 0 unlit, frames 1-3 lit fuse), 8 blast frames, 8 brittle-rock break frames (frame 0 intact).\nBomb canvas64/origin32,50; blast192/96,96; rock96/48,76. Nearest-neighbour scale; original, individual frames and metadata retained.\nThis pack supplements corrected-v8-atlas.json and burnice-atlas.json.\nQ places one bomb; fuse2.2s; radius88; damage180; player damage1 heart.\n')
    print(json.dumps({'frames': sum(map(len, metadata['sequences'].values())), 'bounds': proof}))


if __name__ == '__main__':
    main()
