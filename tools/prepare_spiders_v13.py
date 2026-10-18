"""Build four-facing spiders and Webbed II art without rebuilding older atlases."""
from PIL import Image
from prepare_slime_assets import ROOT, A
from prepare_spider_assets import export, colour_bounds
from repair_nitro_sparkles import component_bounds
import json
import zipfile


def grid_subjects(name, row_count):
    im = Image.open(A / name).convert('RGBA')
    im.putalpha(im.getchannel('A').point(lambda a: a if a >= 28 else 0))
    boxes = component_bounds(im)
    result = []
    for row in range(row_count):
        for col in range(4):
            chosen = [b for b in boxes if col <= (b[0] + b[2]) / 2 / im.width * 4 < col + 1
                      and row <= (b[1] + b[3]) / 2 / im.height * row_count < row + 1]
            assert chosen, (name, col, row)
            box = (min(b[0] for b in chosen), min(b[1] for b in chosen), max(b[2] for b in chosen), max(b[3] for b in chosen))
            # No cell crop: complete connected components are retained. Reject merged neighbours.
            assert box[2] - box[0] <= im.width / 4 * 1.05, (name, col, row, 'merged columns', box)
            assert box[3] - box[1] <= im.height / row_count * 1.3, (name, col, row, 'merged rows', box)
            result.append({'image': im.crop(box), 'bounds': box, 'cell': [col, row]})
    return result


def main():
    (A / 'spiders-v13-frames').mkdir(exist_ok=True)
    meta = json.loads((A / 'spiders-v12-atlas.json').read_text(encoding='utf-8'))
    meta['selection'] = 'complete component centres in the intended 4-column grid; no cell clipping; reject merged neighbours'
    meta['sources'] += ['spider-weaver-v13-generated.png', 'spider-hunter-v13-generated.png', 'burnice-webbed2-v13-generated.png']
    meta['directions'] = ['down', 'left', 'right', 'up']
    meta['directionLayout'] = '8 frames per facing: four walk, four attack; facings down,left,right,up'
    for name, target in [('weaver', 36), ('hunter', 38)]:
        group = grid_subjects(f'spider-{name}-v13-generated.png', 8)
        bounds = [colour_bounds(s['image'], lambda x,y,r,g,b,a: a > 100 and (r > 40 and b > g * 1.4 and r > g * 1.5 if name == 'weaver' else r > 90 and r > g * 1.4 and b < r * .6)) for s in group]
        scale = target / (bounds[0][2] - bounds[0][0])
        export(meta, 'spider-' + name, group, 96, [48, 64], [scale] * 32, [((b[0] + b[2]) / 2, b[3]) for b in bounds], version='v13')
        for i, f in enumerate(meta['sequences']['spider-' + name]):
            f['facing'] = meta['directions'][i // 8]
            f['action'] = 'walk' if i % 8 < 4 else 'attack'
    poses = grid_subjects('burnice-webbed2-v13-generated.png', 5)
    heads = [colour_bounds(s['image'], lambda x,y,r,g,b,a: x > s['image'].width * .43 and a > 100 and r > 150 and g > 110 and b < r * .85 and g > b * 1.08) for s in poses]
    scales = [40 / (b[2] - b[0]) for b in heads]
    pivots = [(s['image'].width / 2, s['image'].height) for s in poses]
    export(meta, 'burnice-webbed2', poses[:12], 160, [80, 112], scales[:12], pivots[:12], version='v13')
    # Exact final-struggle / first-rest continuity; later generated frames supply breathing.
    rest_indices = [11] + list(range(13, 20))
    export(meta, 'burnice-webbed-rest', [poses[i] for i in rest_indices], 160, [80, 112], [scales[i] for i in rest_indices], [pivots[i] for i in rest_indices], version='v13')
    meta['secondWebbedCalibration'] = {'headWidths': [round((b[2] - b[0]) * sc) for b, sc in zip(heads, scales)],
                                      'bodyLengths': [round(s['image'].width * sc) for s, sc in zip(poses, scales)]}
    meta['secondWebbedAnimation'] = {'struggleFrames': 12, 'fps': 8, 'restFrames': 8, 'restFPS': 4, 'restFirstMatchesStruggleLast': True}
    (A / 'spiders-v13-atlas.json').write_text(json.dumps(meta, indent=2), encoding='utf-8')
    prompt_files = ['spiders-v12.txt', 'webbed-v12.txt', 'spider-weaver-v13.txt', 'spider-weaver-v13-repair.txt', 'spider-hunter-v13.txt', 'webbed2-v13.txt', 'webbed2-v13-repair.txt']
    with zipfile.ZipFile(A / 'spiders-webbed-v13-sprites.zip', 'w', zipfile.ZIP_DEFLATED) as pack:
        files = set(meta['sources']) | {'spiders-v13-atlas.json', 'spider-weaver-v13-draft-generated.png', 'burnice-webbed2-v13-draft-generated.png'}
        files.update(f[k] for seq in meta['sequences'].values() for f in seq for k in ('file', 'image'))
        for file in sorted(files):
            pack.write(A / file, file)
        for file in prompt_files:
            pack.write(ROOT / 'docs/art-prompts' / file, file)
        pack.writestr('README.txt', 'Spiders/Webbed v13:100 selected RGBA frames.\n32 frames per spider: down,left,right,up x (4 walk +4 attack).\n4 retained silk shots,12 retained Webbed I,12 new Webbed II,8 breathing rest.\nSpider96 origin48,64;shot32 centre16,16;Burnice160 origin80,112/head40.\nWebbed II8fps, breathing4fps. Last struggle matches first rest exactly.\nBuilt-in Image Generation; complete-component centre slicing; nearest-neighbour alignment.\n')
    with zipfile.ZipFile(A / 'spiders-webbed-v13-sprites.zip') as pack:
        assert pack.testzip() is None
        for seq in meta['sequences'].values():
            for f in seq:
                frame = Image.open(A / f['file'])
                atlas = Image.open(A / f['image'])
                assert frame.tobytes() == atlas.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h'])).tobytes()
                assert pack.read(f['file']) == (A / f['file']).read_bytes()
                assert pack.read(f['image']) == (A / f['image']).read_bytes()
    last = A / meta['sequences']['burnice-webbed2'][-1]['file']
    first = A / meta['sequences']['burnice-webbed-rest'][0]['file']
    assert last.read_bytes() == first.read_bytes()
    print(json.dumps({'frames': sum(map(len, meta['sequences'].values())), 'calibration': meta['secondWebbedCalibration']}))


if __name__ == '__main__':
    main()
