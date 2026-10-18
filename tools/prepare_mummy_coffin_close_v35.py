"""Prepare only the48 generated wrapping/closing poses; retain whole subjects."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy.ndimage import label, find_objects, distance_transform_edt

ROOT = Path(__file__).resolve().parents[1]
A = ROOT / 'dist/assets'

def subjects(name, cols, rows):
    source = Image.open(A / name).convert('RGBA')
    source.putalpha(source.getchannel('A').point(lambda a: a if a >= 32 else 0))
    pixels = np.asarray(source)
    labels, _ = label(pixels[:, :, 3] > 0)
    counts = np.bincount(labels.ravel())
    major = np.flatnonzero(counts > 1000)
    major = major[major != 0]
    assert len(major) == cols * rows
    _, nearest = distance_transform_edt(~np.isin(labels, major), return_indices=True)
    owners = labels[tuple(nearest)]
    groups = {}
    for ident in major:
        y, x = np.where(labels == ident)
        groups[int(ident)] = int((y.min()+y.max())/2/source.height*rows)*cols + int((x.min()+x.max())/2/source.width*cols)
    cells = [[] for _ in range(cols*rows)]
    for ident, region in enumerate(find_objects(labels), 1):
        if region is None or counts[ident] < 12:
            continue
        votes = np.bincount(owners[region][labels[region] == ident])
        y, x = region
        cells[groups[int(votes.argmax())]].append((ident, x.start, y.start, x.stop, y.stop))
    out = []
    for cell in cells:
        assert cell
        bounds = (min(p[1] for p in cell), min(p[2] for p in cell), max(p[3] for p in cell), max(p[4] for p in cell))
        # Mask by component ownership instead of cropping neighboring cloth tips.
        im = source.crop(bounds)
        selected = np.isin(labels[bounds[1]:bounds[3], bounds[0]:bounds[2]], [p[0] for p in cell])
        im.putalpha(Image.fromarray(np.where(selected, np.asarray(im)[:, :, 3], 0).astype('uint8')))
        r, g, b, a = np.asarray(im).transpose(2, 0, 1)
        gold = (a > 100) & (r > 100) & (g > 65) & (b < g*.62) & (r > g*1.25)
        y, x = np.where(gold)
        goldbox = (int(x.min()), int(y.min()), int(x.max()+1), int(y.max()+1))
        out.append((im, bounds, goldbox, source.size))
    return out

def main():
    sheets = [('mummy-coffin-wrap-v35-generated.png',6,4,[i for i in range(24) if i != 17]),
              ('mummy-coffin-tuck-v35-generated.png',4,2,list(range(1,8))),
              ('mummy-coffin-close-v35-generated.png',6,4,list(range(6,24)))]
    atlas = Image.new('RGBA', (112*6,112*8))
    folder = A / 'mummy-coffin-close-v35-frames'
    folder.mkdir(exist_ok=True)
    frames, hashes = [], []
    for name, cols, rows, indices in sheets:
        poses = subjects(name,cols,rows)
        # One calibration per sheet; linen extent never determines prop scale.
        scale = 72/max(poses[i][2][3]-poses[i][2][1] for i in indices)
        for index in indices:
            im, bounds, gold, size = poses[index]
            assert bounds[0] > 0 and bounds[1] > 0 and bounds[2] < size[0] and bounds[3] < size[1], (name,index,bounds)
            scaled = im.resize((round(im.width*scale),round(im.height*scale)), Image.Resampling.NEAREST)
            # Match the existing right rim and ground, including the final closed lid.
            x, y = round(81-gold[2]*scale), round(100-gold[3]*scale)
            assert x >= 1 and y >= 1 and x+scaled.width < 112 and y+scaled.height < 112
            f = Image.new('RGBA',(112,112)); f.paste(scaled,(x,y))
            n = len(frames); file = f'mummy-coffin-close-v35-frames/close-{n}.png'
            f.save(A/file); atlas.paste(f,(n%6*112,n//6*112)); hashes.append(f.tobytes())
            frames.append({'file':file,'x':n%6*112,'y':n//6*112,'w':112,'h':112,'source':name,'sourceIndex':index,'sourceBounds':bounds,'visibleBounds':f.getbbox()})
    assert len(frames) == len(set(hashes)) == 48
    atlas.save(A/'mummy-coffin-close-v35-atlas.png')
    (A/'mummy-coffin-close-v35-atlas.json').write_text(json.dumps({'image':'mummy-coffin-close-v35-atlas.png','anchor':[56,80],'fps':8,'loop':False,'frames':frames},indent=2)+'\n')
    print('48 unique whole-subject frames,112px cells,6 columns,8fps')

if __name__ == '__main__':
    main()
