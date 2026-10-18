"""Slice generated hurt/shooter sprites and match charge-walk body height."""
from pathlib import Path
from PIL import Image
from scipy import ndimage
import numpy as np
import json,zipfile,shutil
A=Path(__file__).resolve().parents[1]/'dist/assets'
OUT=A/'health-v4-frames';OUT.mkdir(exist_ok=True)
DIRS=['down','left','right','up'];meta={'sequences':{},'chargeCalibration':{}}

def box(im):return im.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox()
def fit(src,scale,ax,ay,size=160,origin=(80,112),scale_x=None):
    sx=scale if scale_x is None else scale_x
    src=src.copy();src.putalpha(src.getchannel('A').point(lambda v:0 if v<28 else v))
    small=src.resize((round(src.width*sx),round(src.height*scale)),Image.Resampling.NEAREST)
    result=Image.new('RGBA',(size,size));x=round(origin[0]-ax*sx);y=round(origin[1]-ay*scale)
    assert x>=0 and y>=0 and x+small.width<=size and y+small.height<=size
    result.alpha_composite(small,(x,y));return result

# The v3 height estimate excluded some forehead pixels. Measure the whole body.
atlas=Image.new('RGBA',(640,640))
for r,d in enumerate(DIRS):
    originals=[Image.open(A/f'combat-v3-frames/charge-walk-{d}-{c}.png').convert('RGBA') for c in range(4)]
    heights=[]
    for im in originals:
        ar=np.array(im);xx=np.arange(160)[None,:];yy=np.arange(160)[:,None]
        m=(ar[:,:,3]>128)&(abs(xx-80)<32)&(yy<112)
        if d=='up':m&=~((abs(xx-80)<12)&(yy<58))
        heights.append(112-np.where(m)[0].min())
    ref=Image.open(A/f'frames/{d}-idle-0.png');rb=box(ref);target=rb[3]-rb[1]
    scale=min(1,target/float(np.median(heights)))
    refmask=np.array(ref)[:,:,3]>128;refx=np.where(refmask[rb[1]:rb[1]+20,:].any(0))[0];refwidth=int(refx[-1]-refx[0]+1)
    headwidths=[]
    for im in originals:
        fitted=fit(im,scale,80,112);ar=np.array(fitted);m=ar[:,:,3]>128;xx=np.arange(160)[None,:];yy=np.arange(160)[:,None]
        body=m&(abs(xx-80)<32)&(yy<112)
        if d=='up':body&=~((abs(xx-80)<12)&(yy<58))
        top=int(np.where(body)[0].min());xs=np.where(m[top:top+20,:].any(0))[0];headwidths.append(int(xs[-1]-xs[0]+1))
    widthscale=min(1,refwidth/float(np.median(headwidths)))
    meta['chargeCalibration'][d]={'referenceHeight':target,'referenceHeadWidth':refwidth,'oldBodyHeights':list(map(int,heights)),'scale':scale,'widthCorrection':widthscale,'newBodyHeights':[round(h*scale) for h in heights],'newHeadWidths':[round(w*widthscale) for w in headwidths]}
    for c,im in enumerate(originals):
        f=fit(im,scale,80,112,scale_x=scale*widthscale);f.save(OUT/f'charge-walk-{d}-{c}.png');atlas.alpha_composite(f,(c*160,r*160))
    meta['sequences']['charge-walk-'+d]=[{'image':'burnice-charge-walk-v4-atlas.png','x':c*160,'y':r*160,'w':160,'h':160,'anchor':[80,112],'file':f'health-v4-frames/charge-walk-{d}-{c}.png'} for c in range(4)]
atlas.save(A/'burnice-charge-walk-v4-atlas.png')

im=Image.open(A/'burnice-hurt-generated.png').convert('RGBA');atlas=Image.new('RGBA',(640,640))
for r,d in enumerate(DIRS):
    group=[]
    for c in range(4):
        src=im.crop((round(c*im.width/4),round(r*im.height/4),round((c+1)*im.width/4),round((r+1)*im.height/4)))
        b=box(src);crop=src.crop(b);group.append(crop)
    rb=box(Image.open(A/f'frames/{d}-idle-0.png'));scale=(rb[3]-rb[1])/float(np.median([f.height for f in group]))
    for c,src in enumerate(group):
        f=fit(src,scale,src.width/2,src.height);f.save(OUT/f'hurt-{d}-{c}.png');atlas.alpha_composite(f,(c*160,r*160))
    meta['sequences']['hurt-'+d]=[{'image':'burnice-hurt-atlas.png','x':c*160,'y':r*160,'w':160,'h':160,'anchor':[80,112],'file':f'health-v4-frames/hurt-{d}-{c}.png'} for c in range(4)]
atlas.save(A/'burnice-hurt-atlas.png')

im=Image.open(A/'shooter-projectile-generated.png').convert('RGBA');atlas=Image.new('RGBA',(384,192));bullet=Image.new('RGBA',(96,24))
for r in range(3):
    seq=['shooter-idle','shooter-fire','projectile'][r];meta['sequences'][seq]=[]
    for c in range(4):
        src=im.crop((round(c*im.width/4),round(r*im.height/3),round((c+1)*im.width/4),round((r+1)*im.height/3)))
        src=src.crop(box(src))
        if r<2:
            f=fit(src,54/src.height,src.width/2,src.height,96,(48,75));atlas.alpha_composite(f,(c*96,r*96));name='shooter-atlas.png';sz=96;anchor=[48,75]
        else:
            f=fit(src,18/src.height,src.width/2,src.height-4,24,(12,21));bullet.alpha_composite(f,(c*24,0));name='projectile-atlas.png';sz=24;anchor=[12,18]
        f.save(OUT/f'{seq}-{c}.png');meta['sequences'][seq].append({'image':name,'x':c*sz,'y':r*96 if r<2 else 0,'w':sz,'h':sz,'anchor':anchor,'file':f'health-v4-frames/{seq}-{c}.png'})
atlas.save(A/'shooter-atlas.png');bullet.save(A/'projectile-atlas.png')
previous=json.loads((A/'combat-v3-atlas.json').read_text())
for name,entries in previous['sequences'].items():
    if name.startswith('charge-walk'):continue
    meta['sequences'][name]=[]
    for item in entries:
        fname=Path(item['file']).name;shutil.copy2(A/item['file'],OUT/fname)
        meta['sequences'][name].append({**item,'file':'health-v4-frames/'+fname})
(A/'health-v4-atlas.json').write_text(json.dumps(meta,indent=2))
with zipfile.ZipFile(A/'burnice-health-v4-sprites.zip','w',zipfile.ZIP_DEFLATED) as z:
    names={item['image'] for entries in meta['sequences'].values() for item in entries}
    names.update(['burnice-hurt-generated.png','shooter-projectile-generated.png','burnice-charge-walk-generated.png','burnice-slash-left-v3-generated.png','burnice-slash-right-v3-generated.png','burnice-charge-spin-generated.png','dummy-generated.png','health-v4-atlas.json'])
    for name in sorted(names):z.write(A/name,name)
    for f in sorted(OUT.glob('*.png')):z.write(f,f.relative_to(A))
    z.writestr('README.txt','Complete combat/health v4:84 frames, plus separate movement pack24 frames.\nCharge-walk and hurt:160x160, feet anchor80,112. Row order down,left,right,up;4 frames per row.\nShooter:96x96,anchor48,75; row0 idle,row1 firing.\nProjectile:24x24,core anchor12,18;4 columns.\nCharge-walk resized to match original idle height AND head width, foot origin preserved.\nPrior slash/charge/spin/target dummy retained. Per-frame dimensions and origins in JSON.\nNew hurt/shooter/projectile art uses Image Generation.\nCharacter belongs to HoYoverse; unofficial fan-made study.\n')
print(json.dumps(meta['chargeCalibration']));print('Saved84 frames and complete combat/health sprite pack.')
