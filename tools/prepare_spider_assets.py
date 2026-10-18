"""Slice generated spider/webbed art, keeping complete components and body anchors."""
from PIL import Image
from prepare_slime_assets import ROOT, A, subjects
import json
import zipfile


def export(meta, name, sources, size, anchor, scales, pivots, version='v12'):
    atlas = Image.new('RGBA', (size * 4, size * ((len(sources) + 3) // 4)))
    frames = []
    for i, (source, scale, pivot) in enumerate(zip(sources, scales, pivots)):
        im = source['image']
        width, height = round(im.width * scale), round(im.height * scale)
        x, y = round(anchor[0] - pivot[0] * scale), round(anchor[1] - pivot[1] * scale)
        assert min(x, y) >= 3 and x + width <= size - 3 and y + height <= size - 3, (name, i, x, y, width, height)
        frame = Image.new('RGBA', (size, size))
        frame.alpha_composite(im.resize((width, height), Image.Resampling.NEAREST), (x, y))
        file = f'spiders-{version}-frames/{name}-{i}.png'
        frame.save(A / file)
        ax, ay = i % 4 * size, i // 4 * size
        atlas.alpha_composite(frame, (ax, ay))
        frames.append({'image': f'{name}-{version}-atlas.png', 'file': file, 'x': ax, 'y': ay, 'w': size, 'h': size,
                       'anchor': anchor, 'sourceBounds': list(source['bounds']), 'sourceCell': source['cell']})
    atlas.save(A / f'{name}-{version}-atlas.png')
    meta['sequences'][name] = frames


def colour_bounds(im, predicate):
    points = [(x, y) for y in range(im.height) for x in range(im.width) if predicate(x, y, *im.getpixel((x, y)))]
    if not points:
        raise ValueError('Missing body/head colour landmark')
    return min(p[0] for p in points), min(p[1] for p in points), max(p[0] for p in points) + 1, max(p[1] for p in points) + 1


def main():
    (A / 'spiders-v12-frames').mkdir(exist_ok=True)
    meta = {'sources': ['spiders-v12-generated.png', 'burnice-webbed-v12-generated.png'],
            'selection': 'complete component bounding-box centres in detected row gutters and intended columns', 'sequences': {}}
    monsters = subjects(meta['sources'][0], 5)
    for name, start, target in [('weaver', 0, 36), ('hunter', 8, 38)]:
        group = monsters[start:start + 8]
        bounds = [colour_bounds(s['image'], lambda x,y,r,g,b,a: a > 100 and (r > 40 and b > g * 1.4 and r > g * 1.5 if name == 'weaver' else r > 90 and r > g * 1.4 and b < r * .6)) for s in group]
        scale = target / (bounds[0][2] - bounds[0][0])
        # Anchor the coloured body, not the attached white silk on the shooting pose.
        export(meta, 'spider-' + name, group, 96, [48, 64], [scale] * 8, [((b[0] + b[2]) / 2, b[3]) for b in bounds])
    group = monsters[16:]
    scale = 24 / max(max(s['image'].size) for s in group)
    export(meta, 'web-shot', group, 32, [16, 16], [scale] * 4, [(s['image'].width / 2, s['image'].height / 2) for s in group])
    poses = subjects(meta['sources'][1], 3)
    heads = [colour_bounds(s['image'], lambda x,y,r,g,b,a: x > s['image'].width * .43 and a > 100 and r > 150 and g > 110 and b < r * .85 and g > b * 1.08) for s in poses]
    scales = [40 / (b[2] - b[0]) for b in heads]
    export(meta, 'burnice-webbed', poses, 160, [80, 112], scales, [(s['image'].width / 2, s['image'].height) for s in poses])
    meta['webbedCalibration'] = {'referenceHeadWidth': 40, 'headWidths': [round((b[2] - b[0]) * sc) for b, sc in zip(heads, scales)],
                                 'bodyLengths': [round(s['image'].width * sc) for s, sc in zip(poses, scales)], 'scale': scales}
    meta['webbedAnimation'] = {'frames': 12, 'fps': 8, 'orientation': 'lying, head right, boots left', 'anchor': [80, 112]}
    (A / 'spiders-v12-atlas.json').write_text(json.dumps(meta, indent=2), encoding='utf-8')
    with zipfile.ZipFile(A / 'spiders-webbed-v12-sprites.zip', 'w', zipfile.ZIP_DEFLATED) as pack:
        files = set(meta['sources']) | {'spiders-v12-atlas.json'}
        files.update(f[k] for seq in meta['sequences'].values() for f in seq for k in ('file', 'image'))
        for file in sorted(files):
            pack.write(A / file, file)
        for file in ['spiders-v12.txt', 'webbed-v12.txt']:
            pack.write(ROOT / 'docs/art-prompts' / file, file)
        pack.writestr('README.txt', 'Spiders/Webbed v12:32 Image Generation frames.\n8 purple weaver,8 orange hunter,4 silk projectiles,12 lying Webbed poses at8fps.\nSpider96 origin48,64;shot32 centre16,16;Burnice160 origin80,112,head40.\nComplete-component slicing, body-colour anchors, nearest-neighbour scaling.\nSupplements existing movement/v8/v9/v11 atlases; all originals and prompts retained.\n')
    with zipfile.ZipFile(A / 'spiders-webbed-v12-sprites.zip') as pack:
        assert pack.testzip() is None
        for seq in meta['sequences'].values():
            for f in seq:
                atlas = Image.open(A / f['image'])
                assert atlas.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h'])).tobytes() == Image.open(A / f['file']).tobytes()
                assert pack.read(f['file']) == (A / f['file']).read_bytes()
                assert pack.read(f['image']) == (A / f['image']).read_bytes()
    preview = Image.new('RGBA', (640, 384), '#27362f')
    for i, f in enumerate(meta['sequences']['burnice-webbed']):
        im = Image.open(A / f['file']).crop((30, 56, 130, 120)).resize((160, 102), Image.Resampling.NEAREST)
        preview.alpha_composite(im, (i % 4 * 160, i // 4 * 128 + 12))
    (ROOT / 'output').mkdir(exist_ok=True)
    preview.save(ROOT / 'output/webbed-v12-contact.png')
    print(json.dumps({'frames': sum(map(len, meta['sequences'].values())), 'calibration': meta['webbedCalibration']}))


if __name__ == '__main__':
    main()
