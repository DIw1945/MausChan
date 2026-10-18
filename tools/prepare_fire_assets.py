"""Slice generated pose correction and fire effects, retaining v5 animation timing."""
from pathlib import Path
from PIL import Image
from scipy.ndimage import label,find_objects
import numpy as np,json,zipfile
A=Path(__file__).resolve().parents[1]/'dist/assets'
OUT=A/'combat-v6-frames';OUT.mkdir(exist_ok=True)
meta=json.loads((A/'defeat-v5-atlas.json').read_text())

def subjects(name,cols=4,rows=2,effect=False):
    im=Image.open(A/name).convert('RGBA');a=np.array(im)
    # Remove alpha dust. Segment complete subjects globally, then select by cell.
    components,_=label(a[:,:,3]>=(80 if effect else 28))
    boxes=find_objects(components);result=[]
    for r in range(rows):
        for c in range(cols):
            ys=slice(round(r*im.height/rows),round((r+1)*im.height/rows));xs=slice(round(c*im.width/cols),round((c+1)*im.width/cols))
            areas=np.bincount(components[ys,xs].ravel());areas[0]=0;main=areas.argmax();by,bx=boxes[main-1]
            # Keep the whole connected flame or body; isolated source dust is excluded.
            crop=a[by,bx].copy();crop[components[by,bx]!=main,3]=0
            result.append(Image.fromarray(crop))
    return result

def atlas(name,frames,size,scale,anchor):
    out=Image.new('RGBA',(size*4,size*2));entries=[]
    for i,src in enumerate(frames):
        if isinstance(src,tuple):
            image=src[0] # Ground-anchored final collapse reused as first rest frame.
        else:
            w,h=round(src.width*scale),round(src.height*scale)
            image=Image.new('RGBA',(size,size));small=src.resize((w,h),Image.Resampling.NEAREST)
            x=round(anchor[0]-w/2);y=round(anchor[1]-h if name=='defeat-rest' else anchor[1]-h/2)
            assert min(x,y)>=2 and x+w<=size-2 and y+h<=size-2
            image.alpha_composite(small,(x,y))
        file=f'combat-v6-frames/{name}-{i}.png';image.save(A/file)
        x=i%4*size;y=i//4*size;out.alpha_composite(image,(x,y))
        entries.append({'image':name+'-v6-atlas.png','x':x,'y':y,'w':size,'h':size,'anchor':anchor,'file':file})
    out.save(A/(name+'-v6-atlas.png'));meta['sequences'][name]=entries

rest=subjects('burnice-dizzy-rest-v6-generated.png')
last=Image.open(A/'defeat-v5-frames/defeat-collapse-15.png').convert('RGBA')
lastbox=last.getbbox();width=lastbox[2]-lastbox[0]
# First rest frame exactly equals the last collapse frame. Subsequent generated poses
# preserve the same arm/cheek silhouette, ground anchor and ~59px body width.
scale=width/float(np.median([x.width for x in rest]))
atlas('defeat-rest',[(last,)]+rest[:7],160,scale,[80,112])
wave=subjects('fire-wave-v6-generated.png',effect=True)
scale=42/max(max(x.size) for x in wave)
atlas('fire-wave',wave,64,scale,[32,32])
ring=subjects('fire-ring-v6-generated.png',effect=True)
scale=110/max(max(x.size) for x in ring)
atlas('fire-ring',ring,128,scale,[64,64])
meta['restContinuity']={'firstFrameMatches':'defeat-collapse-15','arm':'outward elbow and glove beside cheek','headOffset':meta['headOffset']}
meta['fire']={'waveFrames':8,'ringFrames':8,'fullHeartsOnly':True,'slashDirections':4,'chargedDirections':8,'waveSpeed':240,'waveRange':300,'slashDamage':20,'spinDamage':60,'hitPolicy':'one hit per target per attack, shared with melee'}
(A/'combat-v6-atlas.json').write_text(json.dumps(meta,indent=2))
with zipfile.ZipFile(A/'burnice-fire-v6-sprites.zip','w',zipfile.ZIP_DEFLATED) as z:
    with zipfile.ZipFile(A/'burnice-defeat-v5-sprites.zip') as old:
        for item in old.infolist():
            if item.filename in ['README.txt','defeat-v5-atlas.json','defeat-rest-atlas.png'] or item.filename.startswith('defeat-v5-frames/defeat-rest-'):continue
            z.writestr(item,old.read(item.filename))
    for name in ['burnice-dizzy-rest-v6-generated.png','fire-wave-v6-generated.png','fire-ring-v6-generated.png','defeat-rest-v6-atlas.png','fire-wave-v6-atlas.png','fire-ring-v6-atlas.png','combat-v6-atlas.json']:z.write(A/name,name)
    for f in sorted(OUT.glob('*.png')):z.write(f,f.relative_to(A))
    z.writestr('README.txt','Fire v6:144 combat/health/defeat/effect frames + separate24 movement frames=168 total.\nRest8: first frame is the exact final collapse, followed by7 corrected generated breathing poses with arm outward.\nWave8:64px canvas,center32,32; ring8:128px,center64,64.\nFull hearts only: slash fires one forward fire crescent; fully charged spin releases8 radial crescents and a fire ring.\n20 slash /60 charged damage; each target takes at most one hit per attack, including melee.\nSources created/edited by built-in Image Generation, cropped and nearest-neighbor scaled.\nPrimary metadata:combat-v6-atlas.json; older metadata is retained for history.\nUnofficial fan-made Burnice / HoYoverse prototype.\n')
print(json.dumps({'restWidth':width,'newEffectFrames':16,'totalCombatFrames':sum(len(v) for v in meta['sequences'].values())}))
