"""Slice Image Generation defeat art with a shared fixed ground anchor."""
from pathlib import Path
from PIL import Image
import json,zipfile,numpy as np
from scipy.ndimage import label,find_objects
A=Path(__file__).resolve().parents[1]/'dist/assets'
OUT=A/'defeat-v5-frames';OUT.mkdir(exist_ok=True)
meta={'sequences':{},'timing':{'spin':2,'collapse':1,'restBeforeGameOver':1.2},'origin':[80,112]}
def crop_cell(im,c,r,cols,rows):
    # Select the complete connected subject, even when it crosses a nominal cell.
    # Fixed grid crops can truncate feet and leak those feet into the next row.
    pixels=np.array(im);components,_=label(pixels[:,:,3]>=28)
    cell=components[round(r*im.height/rows):round((r+1)*im.height/rows),round(c*im.width/cols):round((c+1)*im.width/cols)]
    areas=np.bincount(cell.ravel());areas[0]=0;subject=areas.argmax()
    pixels[components!=subject,3]=0
    ys,xs=find_objects((components==subject).astype(np.uint8))[0]
    return Image.fromarray(pixels[ys,xs])
def place(src,scale):
    small=src.resize((round(src.width*scale),round(src.height*scale)),Image.Resampling.NEAREST)
    frame=Image.new('RGBA',(160,160));x=(160-small.width)//2;y=112-small.height
    assert x>=8 and y>=8 and x+small.width<=152
    frame.alpha_composite(small,(x,y));return frame
def record(name,frames,cols,scale):
    atlas=Image.new('RGBA',(cols*160,((len(frames)+cols-1)//cols)*160));meta['sequences'][name]=[]
    for i,src in enumerate(frames):
        f=place(src,scale);file=f'defeat-v5-frames/{name}-{i}.png';f.save(A/file);x=i%cols*160;y=i//cols*160;atlas.alpha_composite(f,(x,y))
        meta['sequences'][name].append({'image':name+'-atlas.png','x':x,'y':y,'w':160,'h':160,'anchor':[80,112],'file':file})
    atlas.save(A/(name+'-atlas.png'))

im=Image.open(A/'burnice-dizzy-spin-generated.png').convert('RGBA');spin=[crop_cell(im,c,r,4,4) for r in range(4) for c in range(4)]
record('defeat-spin',spin,4,54/float(np.median([s.height for s in spin])))
im=Image.open(A/'burnice-collapse-generated.png').convert('RGBA');fall=[crop_cell(im,c,r,4,4) for r in range(4) for c in range(4)]
fallscale=54/fall[0].height;record('defeat-collapse',fall,4,fallscale)
lastwidth=round(fall[-1].width*fallscale)
im=Image.open(A/'burnice-dizzy-rest-generated.png').convert('RGBA');rest=[crop_cell(im,c,r,4,3) for r in range(2) for c in range(4)]
restscale=lastwidth/float(np.median([s.width for s in rest]));record('defeat-rest',rest,4,restscale)
meta['headOffset']=[round(lastwidth*.25),-round(np.median([s.height for s in rest])*restscale*.5)]
atlas=Image.new('RGBA',(64,16));meta['sequences']['defeat-stars']=[]
for c in range(4):
    src=crop_cell(im,c,2,4,3);scale=10/max(src.size);star=src.resize((round(src.width*scale),round(src.height*scale)),Image.Resampling.NEAREST);f=Image.new('RGBA',(16,16));f.alpha_composite(star,((16-star.width)//2,(16-star.height)//2));file=f'defeat-v5-frames/defeat-stars-{c}.png';f.save(A/file);atlas.alpha_composite(f,(c*16,0));meta['sequences']['defeat-stars'].append({'image':'defeat-stars-atlas.png','x':c*16,'y':0,'w':16,'h':16,'anchor':[8,8],'file':file})
atlas.save(A/'defeat-stars-atlas.png')
previous=json.loads((A/'health-v4-atlas.json').read_text());meta['sequences'].update(previous['sequences']);meta['chargeCalibration']=previous['chargeCalibration']
(A/'defeat-v5-atlas.json').write_text(json.dumps(meta,indent=2))
with zipfile.ZipFile(A/'burnice-defeat-v5-sprites.zip','w',zipfile.ZIP_DEFLATED) as z:
    with zipfile.ZipFile(A/'burnice-health-v4-sprites.zip') as old:
        for item in old.infolist():
            if item.filename!='README.txt':z.writestr(item,old.read(item.filename))
    for name in ['burnice-dizzy-spin-generated.png','burnice-collapse-generated.png','burnice-dizzy-rest-generated.png','defeat-spin-atlas.png','defeat-collapse-atlas.png','defeat-rest-atlas.png','defeat-stars-atlas.png','defeat-v5-atlas.json']:z.write(A/name,name)
    for f in sorted(OUT.glob('*.png')):z.write(f,f.relative_to(A))
    z.writestr('README.txt','Defeat v5 complete combat/health pack:128 frames, plus separate movement pack24.\nNew44 frames:16 dizzy spin,16 collapse,8 dazed lying,4 star twinkles.\nBody frames160x160, ground origin80,112. Stars16x16, centre8,8.\nSpin2s (16 unique frames, twice), fall1s, lying1.2s before Game Over.\nThree stars are drawn individually on an ellipse above the head; no fixed sprite star count.\nFull metadata in defeat-v5-atlas.json. Existing v4 art retained.\nBuilt-in Image Generation with transparent gutters, crop/align/nearest-neighbor scale.\nBurnice belongs to HoYoverse; unofficial fan-made prototype.\n')
print(json.dumps({'newFrames':44,'completeCombatFrames':sum(map(len,meta['sequences'].values())),'lyingWidth':lastwidth,'headOffset':meta['headOffset']}))
