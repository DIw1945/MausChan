"""Prepare the single generated Mummy spawn prop without rebuilding other art."""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'dist/assets'


def main():
    name = 'mummy-coffin-v20-generated.png'
    source = Image.open(ASSETS / name).convert('RGBA')
    bounds = source.getbbox()
    assert bounds and source.getpixel((0, 0))[3] == 0
    sprite = source.crop(bounds)
    scale = min(88 / sprite.width, 84 / sprite.height)
    sprite = sprite.resize((round(sprite.width * scale), round(sprite.height * scale)), Image.Resampling.NEAREST)
    frame = Image.new('RGBA', (112, 112))
    frame.alpha_composite(sprite, ((112 - sprite.width) // 2, 100 - sprite.height))
    folder = ASSETS / 'mummy-coffin-v20-frames'
    folder.mkdir(exist_ok=True)
    frame_file = 'mummy-coffin-v20-frames/coffin-0.png'
    atlas_file = 'mummy-coffin-v20-atlas.png'
    frame.save(ASSETS / frame_file)
    frame.save(ASSETS / atlas_file)
    metadata = {
        'sources': [name], 'animated': False,
        'selection': 'complete alpha bounds; nearest-neighbour scale; retain lid and every cloth tip',
        'placement': 'ground layer at the two existing Mummy points; no new collision',
        'sequences': {'mummy-coffin': [{
            'image': atlas_file, 'file': frame_file, 'x': 0, 'y': 0,
            'w': 112, 'h': 112, 'anchor': [56, 80],
            'sourceBounds': list(bounds), 'visibleSize': list(sprite.size),
        }]},
    }
    (ASSETS / 'mummy-coffin-v20-atlas.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
    assert frame.getbbox()[3] <= 100
    assert Image.open(ASSETS / frame_file).tobytes() == Image.open(ASSETS / atlas_file).tobytes()
    assert all(frame.getpixel(p)[3] == 0 for p in [(0, 0), (111, 0), (0, 111), (111, 111)])
    print(json.dumps({'visibleSize': sprite.size, 'bounds': frame.getbbox(), 'anchor': [56, 80], 'frameAtlasMatch': True}))


if __name__ == '__main__':
    main()
