"""Export the restrained/disgusted v11 struggle without rebuilding older art."""
from PIL import Image
from prepare_slime_assets import ROOT, A, subjects, record
import json
import zipfile


def main():
    meta = json.loads((A / 'slimes-v10-atlas.json').read_text(encoding='utf-8'))
    meta['sources'][1] = 'burnice-sticky-struggle-v11-generated.png'
    poses = subjects(meta['sources'][1], 3)
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
    (A / 'slimes-v11-frames').mkdir(exist_ok=True)
    record(meta, 'sticky-struggle', poses, 160, [80, 112], sx, sy, character=True, version='v11')
    meta['stickyCalibration'] = {'referenceHeight': 54, 'referenceHeadWidth': 40,
                                'bodyHeights': [round(s['image'].height * scale) for s,scale in zip(poses,sy)],
                                'headWidths': [round(w * scale) for w,scale in zip(head_widths,sx)], 'scaleX': sx, 'scaleY': sy}
    meta['stickyAnimation'] = {'fps': 9, 'frames': 12, 'motion': 'restrained shoulder/wrist wriggles, planted feet', 'expression': 'disgusted'}
    (A / 'slimes-v11-atlas.json').write_text(json.dumps(meta, indent=2), encoding='utf-8')
    with zipfile.ZipFile(A / 'slimes-sticky-v11-sprites.zip', 'w', zipfile.ZIP_DEFLATED) as pack:
        files = set(meta['sources']) | {'slimes-v11-atlas.json'}
        files.update(f[key] for seq in meta['sequences'].values() for f in seq for key in ('file', 'image'))
        for file in sorted(files):
            pack.write(A / file, file)
        for file in ['slimes-v10.txt', 'sticky-struggle-v11.txt']:
            pack.write(ROOT / 'docs/art-prompts' / file, file)
        pack.writestr('README.txt', 'Slimes v11: 40 generated RGBA frames; monsters/pop retain v10 art.\n12 new restrained Burnice sticky poses, disgusted face, 9fps.\nMonster canvas96 origin48,76; Burnice160 origin80,112, calibrated body54/head40.\nBuilt-in Image Generation, complete-component slicing, nearest-neighbour alignment.\n')
    with zipfile.ZipFile(A / 'slimes-sticky-v11-sprites.zip') as pack:
        assert pack.testzip() is None
        for sequence in meta['sequences'].values():
            for frame in sequence:
                file = A / frame['file']
                atlas = Image.open(A / frame['image']).convert('RGBA')
                box = (frame['x'], frame['y'], frame['x'] + frame['w'], frame['y'] + frame['h'])
                assert atlas.crop(box).tobytes() == Image.open(file).convert('RGBA').tobytes()
                assert pack.read(frame['file']) == file.read_bytes()
                assert pack.read(frame['image']) == (A / frame['image']).read_bytes()
                if frame['image'] == 'sticky-struggle-v11-atlas.png':
                    bounds = Image.open(file).getbbox()
                    assert bounds[3] == 112 and bounds[3] - bounds[1] == 54
    # A pixel-preserving contact sheet for visual review at 2x game scale.
    preview = Image.new('RGBA', (160 * 4, 160 * 3), '#27362f')
    for i, frame in enumerate(meta['sequences']['sticky-struggle']):
        im = Image.open(A / frame['file']).crop((48, 48, 112, 120)).resize((128, 144), Image.Resampling.NEAREST)
        # Review file uses a 2x scale; production frames are kept untouched.
        preview.alpha_composite(im, (i % 4 * 160 + 16, i // 4 * 160 + 8))
    (ROOT / 'output').mkdir(exist_ok=True)
    preview.save(ROOT / 'output/sticky-v11-contact.png')
    loop = [Image.open(A / f['file']).crop((48, 48, 112, 120)).resize((256, 288), Image.Resampling.NEAREST)
            for f in meta['sequences']['sticky-struggle']]
    loop[0].save(ROOT / 'output/sticky-v11-preview.gif', save_all=True, append_images=loop[1:],
                 duration=1000 / 9, loop=0, disposal=2, transparency=0)
    print(json.dumps({'frames': sum(map(len, meta['sequences'].values())), 'fps': meta['stickyAnimation']['fps'], 'calibration': meta['stickyCalibration']}))


if __name__ == '__main__':
    main()
