"""Separate whole generated subjects, preserving swords outside nominal cells."""
from pathlib import Path
from PIL import Image
from scipy import ndimage
import numpy as np
import json,zipfile
import shutil

A=Path(__file__).resolve().parents[1]/'dist/assets'
OUT=A/'combat-v3-frames';OUT.mkdir(exist_ok=True)
DIRS=['down','left','right','up']

def subjects(path,rows,cols):
    rgba=np.array(Image.open(path).convert('RGBA'))
    mask=rgba[:,:,3]>40
    labels,n=ndimage.label(ndimage.binary_dilation(mask,iterations=6))
    areas=np.bincount(labels.ravel());areas[0]=0
    majors=np.argsort(areas)[-rows*cols:]
    boxes=ndimage.find_objects(labels)
    majors=sorted(majors,key=lambda k:(int(((boxes[k-1][0].start+boxes[k-1][0].stop)/2)/rgba.shape[0]*rows),(boxes[k-1][1].start+boxes[k-1][1].stop)/2))
    seeds=np.isin(labels,majors)
    _,indices=ndimage.distance_transform_edt(~seeds,return_indices=True)
    owners=labels[tuple(indices)]
    frames=[]
    for k in majors:
        pixels=rgba.copy();pixels[owners!=k,3]=0
        pixels[:,:,3][pixels[:,:,3]<28]=0
        ys,xs=np.where(pixels[:,:,3]>96)
        box=(xs.min(),ys.min(),xs.max()+1,ys.max()+1)
        pixels=pixels[box[1]:box[3],box[0]:box[2]]
        r,g,b,alpha=[pixels[:,:,i].astype(float) for i in range(4)]
        warm=(alpha>140)&(r>130)&(g>100)&(b>45)&(r>=g*.95)&(g>b*1.1)&(g>r*.55)
        wl,wn=ndimage.label(warm);wa=np.bincount(wl.ravel());wa[0]=0
        hair=ndimage.find_objects(wl)[int(wa.argmax())-1]
        hy,hx=hair;cx=(hx.start+hx.stop)/2
        dark=(alpha>180)&(np.maximum.reduce([r,g,b])<110)
        xx=np.arange(pixels.shape[1])[None,:]; yy=np.arange(pixels.shape[0])[:,None]
        dark&=(abs(xx-cx)<(hx.stop-hx.start)*.8)&(yy>hy.start+(hy.stop-hy.start)*.8)
        # Frontal blades can point below the feet: exclude a thin middle strip.
        if rows==4 and len(frames)//cols==0:dark&=abs(xx-cx)>(hx.stop-hx.start)*.08
        lines=np.where(dark.sum(axis=1)>6)[0]
        foot=int(lines[-1]);head=int(hy.start)
        frames.append({'image':Image.fromarray(pixels),'x':cx,'foot':foot,'height':foot-head,'box':list(map(int,box))})
    return frames

def place(frame,scale):
    src=frame['image'];src=src.resize((round(src.width*scale),round(src.height*scale)),Image.Resampling.NEAREST)
    out=Image.new('RGBA',(160,160));x=round(80-frame['x']*scale);y=round(112-frame['foot']*scale)
    assert x>=8 and y>=8 and x+src.width<=152 and y+src.height<=152,(x,y,src.size)
    out.alpha_composite(src,(x,y))
    return out

meta={'frameSize':[160,160],'anchor':[80,112],'sequences':{},'sourceRegions':{}}
atlas=Image.new('RGBA',(640,640))
for d in ['down','up']:
    r=DIRS.index(d)
    for c in range(4):
        out=Image.new('RGBA',(160,160));out.alpha_composite(Image.open(A/f'combat-frames/slash-{d}-{c}.png'),(32,37));atlas.alpha_composite(out,(c*160,r*160));out.save(OUT/f'slash-{d}-{c}.png')
for d in ['left','right']:
    frames=subjects(A/f'burnice-slash-{d}-v3-generated.png',2,2)
    scale=54/np.median([f['height'] for f in frames]);print(d,[(f['height'],f['foot'],f['x']) for f in frames],float(scale))
    meta['sourceRegions']['slash-'+d]=[f['box'] for f in frames]
    for c,f in enumerate(frames):
        out=place(f,scale);out.save(OUT/f'slash-{d}-{c}.png');atlas.alpha_composite(out,(c*160,DIRS.index(d)*160))
atlas.save(A/'burnice-slash-v3-atlas.png')
for r,d in enumerate(DIRS):meta['sequences']['slash-'+d]=[{'image':'burnice-slash-v3-atlas.png','x':c*160,'y':r*160,'file':f'combat-v3-frames/slash-{d}-{c}.png'} for c in range(4)]

frames=subjects(A/'burnice-charge-walk-generated.png',4,4)
atlas=Image.new('RGBA',(640,640))
for r,d in enumerate(DIRS):
    group=frames[r*4:r*4+4];scale=54/np.median([f['height'] for f in group]);print(d,'walk',[(f['height'],f['foot'],f['x']) for f in group],float(scale))
    meta['sourceRegions']['charge-walk-'+d]=[f['box'] for f in group]
    for c,f in enumerate(group):
        out=place(f,scale);out.save(OUT/f'charge-walk-{d}-{c}.png');atlas.alpha_composite(out,(c*160,r*160))
    meta['sequences']['charge-walk-'+d]=[{'image':'burnice-charge-walk-atlas.png','x':c*160,'y':r*160,'file':f'combat-v3-frames/charge-walk-{d}-{c}.png'} for c in range(4)]
atlas.save(A/'burnice-charge-walk-atlas.png')
for entries in meta['sequences'].values():
    for item in entries:item.update({'w':160,'h':160,'anchor':[80,112]})
old=json.loads((A/'combat-atlas.json').read_text())
for name,entries in old['sequences'].items():
    if name.startswith('slash-'):continue
    meta['sequences'][name]=[]
    for item in entries:
        namepart=Path(item['file']).name
        shutil.copy2(A/item['file'],OUT/namepart)
        meta['sequences'][name].append({**item,'file':'combat-v3-frames/'+namepart,'w':96,'h':96,'anchor':[48,75]})
(A/'combat-v3-atlas.json').write_text(json.dumps(meta,indent=2))
with zipfile.ZipFile(A/'burnice-combat-v3-sprites.zip','w',zipfile.ZIP_DEFLATED) as z:
    for n in ['burnice-slash-left-v3-generated.png','burnice-slash-right-v3-generated.png','burnice-charge-walk-generated.png','burnice-slash-v3-atlas.png','burnice-charge-walk-atlas.png','burnice-charge-spin-generated.png','dummy-generated.png','burnice-charge-spin-atlas.png','dummy-atlas.png','combat-v3-atlas.json']:z.write(A/n,n)
    for f in sorted(OUT.glob('*.png')):z.write(f,f.relative_to(A))
    z.writestr('README.txt','Combat v3 complete pack:56 frames.\nSlash and charge-walk:160x160 RGBA, anchor80,112. Rows:down,left,right,up;4 columns.\nStationary charge/spin/dummy:96x96 RGBA, anchor48,75. Per-frame dimensions in JSON.\nLeft/right slash and all charge walking generated anew. Up/down slash retained from v2.\nWhole-subject segmentation keeps complete sword/effects across nominal source cell edges.\nMovement idle/walk are in the separate movement pack.\nBurnice belongs to HoYoverse; unofficial fan project.\n')
print('Saved complete pack:56 production frames and per-frame metadata.')
