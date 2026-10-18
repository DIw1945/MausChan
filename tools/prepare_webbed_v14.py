"""Export stronger, thicker-silk Webbed II and matching quiet rest poses."""
from PIL import Image
from prepare_slime_assets import ROOT, A
from prepare_spider_assets import export, colour_bounds
from prepare_spiders_v13 import grid_subjects
import json
import zipfile


def metrics(meta):
    frames = [Image.open(A / f['file']).convert('RGBA') for f in meta['sequences']['burnice-webbed2']]
    heights = [im.getbbox()[3] - im.getbbox()[1] for im in frames]
    white = []
    for im in frames:
        pixels = im.load()
        count = 0
        for y in range(im.height):
            for x in range(im.width):
                r,g,b,a = pixels[x,y]
                if a > 128 and min(r,g,b) > 150 and max(r,g,b) - min(r,g,b) < 65:
                    count += 1
        white.append(count)
    return {'struggleHeightSpan': max(heights) - min(heights), 'meanWhitePixels': round(sum(white) / len(white), 2)}


def main():
    meta = json.loads((A / 'spiders-v13-atlas.json').read_text(encoding='utf-8'))
    previous_metrics = metrics(meta)
    meta['sources'].append('burnice-webbed2-v14-generated.png')
    poses = grid_subjects('burnice-webbed2-v14-generated.png', 5)
    heads = [colour_bounds(s['image'], lambda x,y,r,g,b,a: x > s['image'].width * .43 and a > 100 and r > 150 and g > 110 and b < r * .85 and g > b * 1.08) for s in poses]
    scales = [40 / (b[2] - b[0]) for b in heads]
    pivots = [(s['image'].width / 2, s['image'].height) for s in poses]
    (A / 'spiders-v14-frames').mkdir(exist_ok=True)
    export(meta, 'burnice-webbed2', poses[:12], 160, [80, 112], scales[:12], pivots[:12], version='v14')
    rest_indices = [11] + list(range(13, 20))
    export(meta, 'burnice-webbed-rest', [poses[i] for i in rest_indices], 160, [80, 112], [scales[i] for i in rest_indices], [pivots[i] for i in rest_indices], version='v14')
    meta['secondWebbedCalibration'] = {'headWidths': [round((b[2] - b[0]) * sc) for b,sc in zip(heads,scales)],
                                      'bodyLengths': [round(s['image'].width * sc) for s,sc in zip(poses,scales)]}
    meta['secondWebbedAnimation']['motion'] = 'stronger shoulder pulls, torso flex and bound-knee contractions; denser silk'
    meta['secondWebbedAnimation']['restMotion'] = 'quiet breathing only, same denser silk'
    current_metrics = metrics(meta)
    meta['visualComparison'] = {'v13': previous_metrics, 'v14': current_metrics}
    (A / 'spiders-v14-atlas.json').write_text(json.dumps(meta, indent=2), encoding='utf-8')
    with zipfile.ZipFile(A / 'spiders-webbed-v14-sprites.zip', 'w', zipfile.ZIP_DEFLATED) as pack:
        files = set(meta['sources']) | {'spiders-v14-atlas.json', 'spider-weaver-v13-draft-generated.png', 'burnice-webbed2-v13-draft-generated.png'}
        files.update(f[k] for seq in meta['sequences'].values() for f in seq for k in ('file', 'image'))
        for file in sorted(files):
            pack.write(A / file, file)
        prompt_files = sorted((ROOT / 'docs/art-prompts').glob('*v13*.txt')) + [ROOT / 'docs/art-prompts' / f for f in ['spiders-v12.txt', 'webbed-v12.txt', 'webbed2-v14.txt']]
        for file in prompt_files:
            pack.write(file, file.name)
        pack.writestr('README.txt', 'Spiders/Webbed v14:100 selected RGBA frames.\nRetains64 directional spiders +4 silk shots +12 Webbed I; replaces12 Webbed II +8 quiet rest.\nStronger torso/shoulder/knee contractions, thicker silk. Struggle8fps/rest4fps.\nBurnice160 origin80,112,head40. Last struggle equals first rest.\nBuilt-in Image Generation; original sheets, frame PNGs and prompts retained.\n')
    with zipfile.ZipFile(A / 'spiders-webbed-v14-sprites.zip') as pack:
        assert pack.testzip() is None
        for seq in meta['sequences'].values():
            for f in seq:
                frame = Image.open(A / f['file'])
                atlas = Image.open(A / f['image'])
                assert frame.tobytes() == atlas.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h'])).tobytes()
                assert pack.read(f['file']) == (A / f['file']).read_bytes()
                assert pack.read(f['image']) == (A / f['image']).read_bytes()
    assert (A / meta['sequences']['burnice-webbed2'][-1]['file']).read_bytes() == (A / meta['sequences']['burnice-webbed-rest'][0]['file']).read_bytes()
    preview = Image.new('RGBA', (896, 800), '#27362f')
    frames = meta['sequences']['burnice-webbed2'] + meta['sequences']['burnice-webbed-rest']
    for i,f in enumerate(frames):
        im = Image.open(A / f['file']).crop((24, 48, 136, 120)).resize((224, 144), Image.Resampling.NEAREST)
        preview.alpha_composite(im, (i % 4 * 224, i // 4 * 160 + 8))
    (ROOT / 'output').mkdir(exist_ok=True)
    preview.save(ROOT / 'output/webbed-v14-contact.png')
    print(json.dumps({'frames': sum(map(len, meta['sequences'].values())), 'metrics': meta['visualComparison'], 'calibration': meta['secondWebbedCalibration']}))


if __name__ == '__main__':
    main()
