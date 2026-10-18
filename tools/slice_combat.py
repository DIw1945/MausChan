"""Crop generated combat sheets; retain alpha and original character art."""
from pathlib import Path
from PIL import Image
import numpy as np
from scipy import ndimage
import json, zipfile

A = Path(__file__).resolve().parents[1]/'dist/assets'
OUT = A/'combat-frames'
OUT.mkdir(exist_ok=True)
DIRS = ['down','left','right','up']
meta = {'frameSize':[96,96],'anchor':[48,75],'sequences':{}}

def cell(im,c,r,cols,rows):
    return im.crop((round(c*im.width/cols),round(r*im.height/rows),round((c+1)*im.width/cols),round((r+1)*im.height/rows)))

def place(src,scale,foot,anchor_x=None):
    src.putalpha(src.getchannel('A').point(lambda v:0 if v<28 else v))
    # Discard disconnected slivers from effects in neighboring generated cells.
    a=np.array(src)
    labels,count=ndimage.label(a[:,:,3]>40)
    for label,box in enumerate(ndimage.find_objects(labels),1):
        if box is None:continue
        yy,xx=box;w=xx.stop-xx.start;center=(xx.start+xx.stop)/2
        if w<src.width*.24 and (center<src.width*.12 or center>src.width*.88):
            a[labels==label,3]=0
    src=Image.fromarray(a)
    image=src.resize((round(src.width*scale),round(src.height*scale)),Image.Resampling.NEAREST)
    out=Image.new('RGBA',(96,96))
    x=round(48-(anchor_x if anchor_x is not None else src.width/2)*scale)
    y=round(75-foot*scale)
    out.alpha_composite(image,(x,y))
    return out

def save_frame(name,image):
    image.save(OUT/(name+'.png'))

# Foot baselines are measured within each generated source cell, not from effects.
slash_feet=[[280,259,274,276],[276,255,264,264],[258,250,252,255],[275,277,281,275]]
im=Image.open(A/'burnice-slash-generated.png').convert('RGBA')
atlas=Image.new('RGBA',(96*4,96*4))
for r,d in enumerate(DIRS):
    meta['sequences']['slash-'+d]=[]
    for c in range(4):
        f=place(cell(im,c,r,4,4),.235,slash_feet[r][c])
        name=f'slash-{d}-{c}';save_frame(name,f);atlas.alpha_composite(f,(c*96,r*96))
        meta['sequences']['slash-'+d].append({'image':'burnice-slash-atlas.png','x':c*96,'y':r*96,'file':'combat-frames/'+name+'.png'})
atlas.save(A/'burnice-slash-atlas.png')

im=Image.open(A/'burnice-charge-spin-generated.png').convert('RGBA')
atlas=Image.new('RGBA',(384,384))
feet=[[282,291,291,301],[289,291,292,299],[261,265,272,281],[271,263,251,250]]
for r in range(4):
    for c in range(4):
        f=place(cell(im,c,r,4,4),.26,feet[r][c])
        if r<2: name=f'charge-{DIRS[c]}-{r}';seq='charge-'+DIRS[c]
        else: name=f'spin-{(r-2)*4+c}';seq='spin'
        save_frame(name,f);atlas.alpha_composite(f,(c*96,r*96))
        meta['sequences'].setdefault(seq,[]).append({'image':'burnice-charge-spin-atlas.png','x':c*96,'y':r*96,'file':'combat-frames/'+name+'.png'})
atlas.save(A/'burnice-charge-spin-atlas.png')

im=Image.open(A/'dummy-generated.png').convert('RGBA')
atlas=Image.new('RGBA',(384,192))
for r in range(2):
    seq='dummy-idle' if r==0 else 'dummy-hit';meta['sequences'][seq]=[]
    for c in range(4):
        src=cell(im,c,r,4,2)
        box=src.getchannel('A').point(lambda v:255 if v>96 else 0).getbbox()
        # The same scale is used throughout; the stationary base is the anchor.
        f=place(src,.145,437,src.width/2+25)
        name=f'{seq}-{c}';save_frame(name,f);atlas.alpha_composite(f,(c*96,r*96))
        meta['sequences'][seq].append({'image':'dummy-atlas.png','x':c*96,'y':r*96,'file':'combat-frames/'+name+'.png'})
atlas.save(A/'dummy-atlas.png')
(A/'combat-atlas.json').write_text(json.dumps(meta,indent=2))
with zipfile.ZipFile(A/'burnice-combat-sprites.zip','w',zipfile.ZIP_DEFLATED) as z:
    for name in ['burnice-slash-generated.png','burnice-charge-spin-generated.png','dummy-generated.png','burnice-slash-atlas.png','burnice-charge-spin-atlas.png','dummy-atlas.png','combat-atlas.json']:
        z.write(A/name,name)
    for f in sorted(OUT.glob('*.png')):z.write(f,f.relative_to(A))
    z.writestr('README.txt','Image Generation combat sprite pack\n40 frames,96x96 RGBA. Feet anchor:48,75.\nSlash: rows DOWN,LEFT,RIGHT,UP;4 columns per row.\nCharge: row0 build, row1 ready; columns DOWN,LEFT,RIGHT,UP.\nSpin: row2 then row3,8 frames. Dummy: row0 idle,row1 hit;4 frames each.\nBase walk sprites are available in the separate movement pack.\nBurnice belongs to HoYoverse. Unofficial fan-made prototype.\n')
print('Sliced 40 generated combat frames and created downloadable ZIP.')
