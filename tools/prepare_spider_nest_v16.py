"""Prepare the single generated spider nest; leave historical atlases untouched."""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'dist/assets'


def main():
    source_name = 'spider-nest-v16-generated.png'
    source = Image.open(ASSETS / source_name).convert('RGBA')
    # There is only one complete subject, so retain its whole alpha bounding box.
    bounds = source.getbbox()
    assert bounds and source.getpixel((0, 0))[3] == 0
    sprite = source.crop(bounds)
    scale = min(76 / sprite.width, 48 / sprite.height)
    size = (round(sprite.width * scale), round(sprite.height * scale))
    sprite = sprite.resize(size, Image.Resampling.NEAREST)
    sprite = sprite.crop(sprite.getbbox())
    size = sprite.size
    frame = Image.new('RGBA', (96, 64))
    frame.alpha_composite(sprite, ((96 - size[0]) // 2, 52 - size[1]))
    folder = ASSETS / 'spider-nest-v16-frames'
    folder.mkdir(exist_ok=True)
    frame_file = 'spider-nest-v16-frames/nest-0.png'
    atlas_file = 'spider-nest-v16-atlas.png'
    frame.save(ASSETS / frame_file)
    frame.save(ASSETS / atlas_file)
    metadata = {
        'sources': [source_name], 'animated': False,
        'selection': 'single complete transparent subject; whole alpha bounds; nearest-neighbour',
        'placement': 'ground layer at each existing spawn point; no new collision',
        'sequences': {'spider-nest': [{
            'image': atlas_file, 'file': frame_file, 'x': 0, 'y': 0,
            'w': 96, 'h': 64, 'anchor': [48, 40],
            'sourceBounds': list(bounds), 'visibleSize': list(size),
        }]},
    }
    (ASSETS / 'spider-nest-v16-atlas.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
    assert Image.open(ASSETS / frame_file).tobytes() == Image.open(ASSETS / atlas_file).tobytes()
    assert frame.getbbox()[3] == 52
    print(json.dumps({'visibleSize': size, 'bounds': frame.getbbox(), 'anchor': [48, 40]}))


if __name__ == '__main__':
    main()
