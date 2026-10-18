"""Slice generated Slime/struggle art; preserve complete subjects and fixed feet.

The generated sheet has an uneven empty header. Detect transparent row gutters,
then select complete components by centres rather than clipping nominal cells.
Requires Pillow only. Never regenerates historical assets.
"""
from pathlib import Path
from PIL import Image
from repair_nitro_sparkles import component_bounds
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
A = ROOT / 'dist/assets'


def rows(image, expected):
    projection = image.getchannel('A').resize((1, image.height), Image.Resampling.BOX).tobytes()
    occupied = [y for y, value in enumerate(projection) if value > 1]
    bands = []
    for y in occupied:
        if not bands or y - bands[-1][1] > 12:
            bands.append([y, y + 1])
        else:
            bands[-1][1] = y + 1
    if len(bands) != expected:
        raise ValueError(f'Expected {expected} rows, found {bands}')
    return [0] + [(left[1] + right[0]) / 2 for left, right in zip(bands, bands[1:])] + [image.height]


def subjects(name, row_count):
    image = Image.open(A / name).convert('RGBA')
    image.putalpha(image.getchannel('A').point(lambda value: value if value >= 28 else 0))
    dividers = rows(image, row_count)
    boxes = component_bounds(image)
    result = []
    for row in range(row_count):
        for column in range(4):
            selected = [box for box in boxes if column * image.width / 4 <= (box[0] + box[2]) / 2 < (column + 1) * image.width / 4
                        and dividers[row] <= (box[1] + box[3]) / 2 < dividers[row + 1]]
            if not selected:
                raise ValueError(f'Missing {name} frame {column}, {row}')
            box = (min(b[0] for b in selected), min(b[1] for b in selected), max(b[2] for b in selected), max(b[3] for b in selected))
            result.append({'image': image.crop(box), 'bounds': box, 'row': row, 'cell': [column, row]})
    return result


def record(meta, name, sources, size, anchor, sx, sy, character=False, hopping=False, version='v10'):
    atlas = Image.new('RGBA', (size * 4, size * ((len(sources) + 3) // 4)))
    sequence = []
    for index, source in enumerate(sources):
        im = source['image']
        scale_x = sx[index] if isinstance(sx, list) else sx
        scale_y = sy[index] if isinstance(sy, list) else sy
        width, height = round(im.width * scale_x), round(im.height * scale_y)
        ax = im.width / 2
        if character:
            feet = im.getchannel('A').crop((0, max(0, im.height - 12), im.width, im.height)).getbbox()
            ax = (feet[0] + feet[2]) / 2
        hop = 0
        if hopping:
            baseline = max(s['bounds'][3] for s in sources if s['row'] == source['row'])
            hop = round((baseline - source['bounds'][3]) * scale_y)
        x, y = round(anchor[0] - ax * scale_x), anchor[1] - height - hop
        if min(x, y) < 3 or x + width > size - 3 or y + height > size - 3:
            raise ValueError(f'Clipped {name}-{index}: {x,y,width,height}')
        frame = Image.new('RGBA', (size, size))
        frame.alpha_composite(im.resize((width, height), Image.Resampling.NEAREST), (x, y))
        file = f'slimes-{version}-frames/{name}-{index}.png'
        frame.save(A / file)
        atlas_x, atlas_y = index % 4 * size, index // 4 * size
        atlas.alpha_composite(frame, (atlas_x, atlas_y))
        sequence.append({'image': f'{name}-{version}-atlas.png', 'x': atlas_x, 'y': atlas_y,
                         'w': size, 'h': size, 'anchor': anchor, 'file': file,
                         'sourceBounds': list(source['bounds']), 'sourceCell': source['cell']})
    atlas.save(A / f'{name}-{version}-atlas.png')
    meta['sequences'][name] = sequence


def main():
    (A / 'slimes-v10-frames').mkdir(exist_ok=True)
    meta = {'sources': ['slimes-v10-generated.png', 'burnice-sticky-struggle-v10-generated.png'],
            'selection': 'complete component centres inside detected row gutters and intended column', 'sequences': {}}
    monsters = subjects('slimes-v10-generated.png', 7)
    for name, start, width in [('normal', 0, 26), ('big', 8, 44), ('swift', 16, 20)]:
        group = monsters[start:start + 8]
        scale = width / group[0]['image'].width
        record(meta, 'slime-' + name, group, 96, [48, 76], scale, scale, hopping=True)
    group = monsters[24:]
    scale = 52 / max(max(source['image'].size) for source in group)
    record(meta, 'slime-pop', group, 96, [48, 76], scale, scale)
    poses = subjects('burnice-sticky-struggle-v10-generated.png', 3)
    # Yellow hair/skin remain visible through the translucent green coating.
    # Calibrate each pose to the same head width/body height as the idle sprite.
    head_widths = []
    for source in poses:
        im = source['image']
        feet = im.getchannel('A').crop((0, im.height - 12, im.width, im.height)).getbbox()
        ax = (feet[0] + feet[2]) / 2
        xs = [x for y in range(round(im.height * .46)) for x in range(im.width)
              if abs(x - ax) < im.height * .44 and (lambda r,g,b,a: a > 100 and r > 140 and g > 130 and b < r * .85 and r > g * .88)(*im.getpixel((x,y)))]
        if not xs:
            raise ValueError('Character identity/hair landmarks missing')
        head_widths.append(max(xs) - min(xs) + 1)
    sx = [40 / width for width in head_widths]
    sy = [54 / source['image'].height for source in poses]
    record(meta, 'sticky-struggle', poses, 160, [80, 112], sx, sy, character=True)
    meta['stickyCalibration'] = {'referenceHeight': 54, 'referenceHeadWidth': 40,
                                 'bodyHeights': [round(s['image'].height * scale) for s,scale in zip(poses,sy)],
                                 'headWidths': [round(w * scale) for w,scale in zip(head_widths,sx)], 'scaleX': sx, 'scaleY': sy}
    (A / 'slimes-v10-atlas.json').write_text(json.dumps(meta, indent=2), encoding='utf-8')
    with zipfile.ZipFile(A / 'slimes-sticky-v10-sprites.zip', 'w', zipfile.ZIP_DEFLATED) as pack:
        files = set(meta['sources']) | {'slimes-v10-atlas.json', 'slimes-v10-draft-generated.png'}
        files.update(f[key] for seq in meta['sequences'].values() for f in seq for key in ('file', 'image'))
        for file in sorted(files):
            pack.write(A / file, file)
        for file in ['slimes-v10.txt', 'sticky-struggle-v10.txt']:
            pack.write(ROOT / 'docs/art-prompts' / file, file)
        pack.writestr('README.txt', 'Slimes v10: 40 generated RGBA frames.\n8 normal green,8 large blue,8 swift pink,4 goo pop,12 Burnice sticky struggle.\nMonster/effect canvas96 origin48,76. Burnice canvas160 origin80,112; fixed feet, calibrated body54/head40.\nMetadata supplements corrected-v8-atlas.json, burnice-atlas.json and bombs-v9-atlas.json.\nBuilt-in Image Generation; retained originals and prompts; component-centre slicing and nearest-neighbour scale.\n')
    print(json.dumps({'frames': sum(map(len, meta['sequences'].values())), 'calibration': meta['stickyCalibration']}))


if __name__ == '__main__':
    main()
