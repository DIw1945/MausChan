"""Slice four generated still trees without rebuilding historical game sprites."""
from pathlib import Path
from PIL import Image
from repair_nitro_sparkles import component_bounds
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
A = ROOT / 'dist/assets'


def main():
    source_name = 'trees-v15-generated.png'
    source = Image.open(A / source_name).convert('RGBA')
    source.putalpha(source.getchannel('A').point(lambda a: a if a >= 28 else 0))
    boxes = component_bounds(source)
    atlas = Image.new('RGBA', (384, 112))
    folder = A / 'trees-v15-frames'
    folder.mkdir(exist_ok=True)
    frames = []
    for i in range(4):
        col, row = i % 2, i // 2
        selected = [b for b in boxes
                    if col <= (b[0] + b[2]) / source.width < col + 1
                    and row <= (b[1] + b[3]) / source.height < row + 1]
        assert selected, ('missing tree', col, row)
        box = (min(b[0] for b in selected), min(b[1] for b in selected),
               max(b[2] for b in selected), max(b[3] for b in selected))
        assert box[2] - box[0] < source.width * .5 and box[3] - box[1] < source.height * .5, ('merged trees', box)
        im = source.crop(box)
        # Anchor the visible trunk, not the centre of an asymmetric canopy.
        pixels = im.load()
        trunk = [x for y in range(round(im.height * .78), im.height) for x in range(im.width)
                 if pixels[x, y][3] >= 100 and pixels[x, y][0] > pixels[x, y][1] * 1.15
                 and pixels[x, y][1] > pixels[x, y][2] * 1.1]
        assert trunk, ('missing trunk', i)
        pivot = (min(trunk) + max(trunk) + 1) / 2
        scale = min(76 / im.width, 78 / im.height)
        w, h = round(im.width * scale), round(im.height * scale)
        x, y = round(48 - pivot * scale), 100 - h
        assert x >= 3 and x + w <= 93 and y >= 3
        frame = Image.new('RGBA', (96, 112))
        frame.alpha_composite(im.resize((w, h), Image.Resampling.NEAREST), (x, y))
        file = f'trees-v15-frames/tree-{i}.png'
        frame.save(A / file)
        atlas.alpha_composite(frame, (i * 96, 0))
        frames.append({'image': 'trees-v15-atlas.png', 'file': file, 'x': i * 96, 'y': 0,
                       'w': 96, 'h': 112, 'anchor': [48, 96], 'sourceCell': [col, row],
                       'sourceBounds': list(box), 'visibleSize': [w, h], 'trunkPivot': pivot})
    atlas.save(A / 'trees-v15-atlas.png')
    meta = {'sources': [source_name], 'animated': False, 'variants': 4,
            'selection': 'whole connected-component bounds by centre in a 2x2 grid; trunk-aligned; nearest-neighbour',
            'placement': 'anchor at original world x,y; root baseline y+4; existing trunk collision unchanged',
            'sequences': {'trees': frames}}
    (A / 'trees-v15-atlas.json').write_text(json.dumps(meta, indent=2), encoding='utf-8')
    with zipfile.ZipFile(A / 'trees-v15-sprites.zip', 'w', zipfile.ZIP_DEFLATED) as pack:
        for name in [source_name, 'trees-v15-atlas.png', 'trees-v15-atlas.json'] + [f['file'] for f in frames]:
            pack.write(A / name, name)
        pack.write(ROOT / 'docs/art-prompts/trees-v15.txt', 'trees-v15.txt')
        pack.write(Path(__file__), 'prepare_trees_v15.py')
        pack.writestr('README.txt', 'Trees v15: four STILL variants, not animation frames.\nBuilt-in Image Generation, transparent alpha preserved.\n96x112 frame canvas, anchor48,96, root baseline100.\nWorld positions and18x16 trunk colliders unchanged.\nFull original, frames, atlas, metadata, prompt and preparation script retained.\nPreparation script uses component_bounds from project tools/repair_nitro_sparkles.py.\n')
    with zipfile.ZipFile(A / 'trees-v15-sprites.zip') as pack:
        assert pack.testzip() is None
        for f in frames:
            frame = Image.open(A / f['file']).convert('RGBA')
            assert frame.tobytes() == atlas.crop((f['x'], 0, f['x'] + 96, 112)).tobytes()
            assert pack.read(f['file']) == (A / f['file']).read_bytes()
            assert frame.getbbox()[3] == 100
            assert frame.getpixel((0, 0))[3] == 0
    preview = Image.new('RGBA', (768, 224), '#7e984e')
    preview.alpha_composite(atlas.resize((768, 224), Image.Resampling.NEAREST))
    (ROOT / 'output').mkdir(exist_ok=True)
    preview.save(ROOT / 'output/trees-v15-contact.png')
    print(json.dumps({'variants': len(frames), 'animated': False, 'sizes': [f['visibleSize'] for f in frames]}))


if __name__ == '__main__':
    main()
