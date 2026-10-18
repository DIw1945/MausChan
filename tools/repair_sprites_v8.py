"""Replace Nitro art and recover complete shooter/projectile subjects, not cell spill."""
from pathlib import Path
from PIL import Image
from scipy.ndimage import label,find_objects
import numpy as np,json,zipfile
from repair_nitro_sparkles import slice_sparkles
A=Path(__file__).resolve().parents[1]/'dist/assets';OUT=A/'corrected-v8-frames';OUT.mkdir(exist_ok=True)
meta=json.loads((A/'nitro-v7-atlas.json').read_text());meta['nitroCalibration']={};meta['spriteRepair']={}

def subjects(name,cols=4,rows=4):
 im=Image.open(A/name).convert('RGBA');a=np.array(im);components,_=label(a[:,:,3]>=28);boxes=find_objects(components);areas=np.bincount(components.ravel());out=[];proof=[]
 for r in range(rows):
  for c in range(cols):
   x0=round(c*im.width/cols);x1=round((c+1)*im.width/cols);y0=round(r*im.height/rows);y1=round((r+1)*im.height/rows)
   # A previous-row dummy's base can have MORE pixels inside a projectile cell
   # than the projectile itself. Select by the COMPLETE SUBJECT'S centre first.
   candidates=[i+1 for i,b in enumerate(boxes) if b and x0<=(b[1].start+b[1].stop)/2<x1 and y0<=(b[0].start+b[0].stop)/2<y1]
   k=max(candidates,key=lambda i:areas[i]);by,bx=boxes[k-1];crop=a[by,bx].copy();crop[components[by,bx]!=k,3]=0
   out.append(Image.fromarray(crop));proof.append({'cell':[c,r],'subjectBounds':[bx.start,by.start,bx.stop,by.stop],'component':k})
 return out,proof

def clean(im):
 a=np.array(im);l,n=label(a[:,:,3]>=28,structure=np.ones((3,3)));areas=np.bincount(l.ravel());areas[0]=0;a[l!=areas.argmax(),3]=0
 return Image.fromarray(a)

def record(name,frames,size,origin,image=None):
 image=image or name+'-v8-atlas.png';atlas=Image.new('RGBA',(4*size,((len(frames)+3)//4)*size));seq=[]
 for i,f in enumerate(frames):
  file=f'corrected-v8-frames/{name}-{i}.png';f.save(A/file);x=i%4*size;y=i//4*size;atlas.alpha_composite(f,(x,y))
  seq.append({'image':image,'x':x,'y':y,'w':size,'h':size,'anchor':origin,'file':file})
 atlas.save(A/image);meta['sequences'][name]=seq
 return frames

def landmarks(im):
 a=np.array(im);mask=a[:,:,3]>100;yy,xx=np.indices(mask.shape);feet=mask&(yy>=im.height-8);fx=np.where(feet)[1];ax=(fx.min()+fx.max()+1)/2
 hair=mask&(a[:,:,0]>125)&(a[:,:,1]>85)&(a[:,:,1]>a[:,:,2]*1.15)&(a[:,:,0]>a[:,:,1]*.95)&(abs(xx-ax)<im.height*.28)&(yy<im.height*.65)
 top=max(0,int(np.where(hair)[0].min())-5);body=im.height-top;hx=np.where(mask[top:top+round(body*.48),:].any(0))[0]
 return ax,body,int(hx[-1]-hx[0]+1)

for stage in ['fetch','sip','cheer']:
 source,_=subjects(f'burnice-nitro-{stage}-v8-generated.png');lm=[landmarks(s) for s in source];sy=54/float(np.median([l[1] for l in lm[:3]]));sx=40/float(np.median([l[2] for l in lm[:3]]));frames=[]
 old=meta['sequences']['nitro-'+stage]
 for src,(ax,body,_) in zip(source,lm):
  w,h=round(src.width*sx),round(src.height*sy);x=round(80-ax*sx);y=112-h;assert min(x,y)>=8 and x+w<=152
  f=Image.new('RGBA',(160,160));f.alpha_composite(src.resize((w,h),Image.Resampling.NEAREST),(x,y));frames.append(f)
 record('nitro-'+stage,frames,160,[80,112])
 if stage=='cheer':
  for new,previous in zip(meta['sequences']['nitro-cheer'],old):new['cup']=previous['cup']
 meta['nitroCalibration'][stage]={'referenceHeight':54,'referenceHeadWidth':40,'bodyHeights':[round(l[1]*sy) for l in lm],'headWidths':[round(l[2]*sx) for l in lm[:3]],'scaleX':sx,'scaleY':sy}
source,_=subjects('nitro-item-v8-generated.png',rows=2);source=source[:4];scale=20/max(max(s.size) for s in source);frames=[]
for src in source:
 w,h=round(src.width*scale),round(src.height*scale);f=Image.new('RGBA',(32,32));f.alpha_composite(src.resize((w,h),Image.Resampling.NEAREST),((32-w)//2,26-h));frames.append(f)
record('nitro-item',frames,32,[16,26])

source,proof=subjects('shooter-projectile-generated.png',rows=3);shooter=[]
for i,src in enumerate(source[:8]):
 scale=54/src.height;w,h=round(src.width*scale),54;f=Image.new('RGBA',(96,96));f.alpha_composite(src.resize((w,h),Image.Resampling.NEAREST),((96-w)//2,75-h));shooter.append(clean(f))
# Keep the existing 4x2 shooter layout and origins.
record('shooter-idle',shooter[:4],96,[48,75],image='shooter-v8-atlas.png')
im=Image.open(A/'shooter-v8-atlas.png');combined=Image.new('RGBA',(384,192));combined.alpha_composite(im,(0,0))
meta['sequences']['shooter-fire']=[]
for i,f in enumerate(shooter[4:]):
 file=f'corrected-v8-frames/shooter-fire-{i}.png';f.save(A/file);combined.alpha_composite(f,(i*96,96));meta['sequences']['shooter-fire'].append({'image':'shooter-v8-atlas.png','x':i*96,'y':96,'w':96,'h':96,'anchor':[48,75],'file':file})
combined.save(A/'shooter-v8-atlas.png')
frames=[]
for src in source[8:]:
 a=np.array(src);m=(a[:,:,3]>128)&(a[:,:,0]>220)&(a[:,:,1]>180)&(a[:,:,2]>80);ys,xs=np.where(m);ax=xs.mean()+.5;ay=ys.mean()+.5
 scale=18/src.height;w,h=round(src.width*scale),18;x=round(12-ax*scale);y=round(18-ay*scale);assert min(x,y)>=1 and x+w<=23 and y+h<=24
 f=Image.new('RGBA',(24,24));f.alpha_composite(src.resize((w,h),Image.Resampling.NEAREST),(x,y));frames.append(clean(f))
record('projectile',frames,24,[12,18],image='projectile-v8-atlas.png')
meta['spriteRepair']={'method':'whole-subject bounding-centre selection; complete cross-cell bounds; isolated neighbours excluded','shooterAndProjectileSource':proof,'nitroDesign':'user-provided golden rectangular metal can, X side ribs, white flame/face emblem and integrated gold pour tab'}
slice_sparkles(A,meta)
(A/'corrected-v8-atlas.json').write_text(json.dumps(meta,indent=2))
# Build the current pack directly from CURRENT metadata so stale cut-up atlas
# versions and wrong cup frames cannot be mistaken for production art.
with zipfile.ZipFile(A/'burnice-corrected-v8-sprites.zip','w',zipfile.ZIP_DEFLATED) as z:
 files={f['file'] for seq in meta['sequences'].values() for f in seq}|{f['image'] for seq in meta['sequences'].values() for f in seq}
 sources=['burnice-nitro-fetch-v8-generated.png','burnice-nitro-sip-v8-generated.png','burnice-nitro-cheer-v8-generated.png','nitro-item-v8-generated.png','shooter-projectile-generated.png','burnice-generated.png','burnice-slash-left-v3-generated.png','burnice-slash-right-v3-generated.png','burnice-charge-walk-generated.png','burnice-hurt-generated.png','burnice-charge-spin-generated.png','dummy-generated.png','burnice-dizzy-spin-generated.png','burnice-collapse-generated.png','burnice-dizzy-rest-generated.png','burnice-dizzy-rest-v6-generated.png','fire-wave-v6-generated.png','fire-ring-v6-generated.png']
 for f in sources:
  if (A/f).exists():files.add(f)
 files.add('corrected-v8-atlas.json')
 for f in sorted(files):z.write(A/f,f)
 z.writestr('README.txt','Corrected v8:200 combat/item/effect frames + separate24 movement frames=224 total.\nNitro-Fuel now matches user gold square can reference, including all48 retrieval/drink/cheer poses,4 item frames and UI icon.\nShooter8/projectile4 were resegmented from complete source subjects. Previous cell crops included previous-row dummy feet; selecting the largest fragment alone could choose the dummy base over a smaller projectile.\nMain metadata:corrected-v8-atlas.json. Old wrong cup sprites and old sliced shooter/projectile atlases are excluded from this current pack.\nTiming4.6s; heal2 hearts capped at max; loot5%; controls and hitboxes unchanged.\nImages edited with built-in Image Generation; crop/align/nearest-neighbor scale. Unofficial HoYoverse fan prototype.\n')
print(json.dumps({'frames':sum(map(len,meta['sequences'].values())),'calibration':meta['nitroCalibration'],'projectileComponents':[p['component'] for p in proof[8:]],'zipMB':round((A/'burnice-corrected-v8-sprites.zip').stat().st_size/1024**2,2)}))
