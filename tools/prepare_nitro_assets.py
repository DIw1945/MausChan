"""Slice generated Nitro-Fuel art and match body height/head width to idle."""
from pathlib import Path
from PIL import Image
from scipy.ndimage import label,find_objects
import numpy as np,json,zipfile
A=Path(__file__).resolve().parents[1]/'dist/assets';OUT=A/'nitro-v7-frames';OUT.mkdir(exist_ok=True)
meta=json.loads((A/'combat-v6-atlas.json').read_text());meta['nitroCalibration']={}

def subjects(name,rows=4,keep_glints=False):
 im=Image.open(A/name).convert('RGBA');a=np.array(im);components,_=label(a[:,:,3]>=28);boxes=find_objects(components);out=[]
 for r in range(rows):
  for c in range(4):
   ys=slice(round(r*im.height/rows),round((r+1)*im.height/rows));xs=slice(round(c*im.width/4),round((c+1)*im.width/4))
   area=np.bincount(components[ys,xs].ravel());area[0]=0;k=area.argmax();by,bx=boxes[k-1]
   if keep_glints and r==1:
    crop=a[ys,xs].copy();crop[crop[:,:,3]<28,3]=0;opaque=Image.fromarray(crop);out.append(opaque.crop(opaque.getbbox()));continue
   crop=a[by,bx].copy();crop[components[by,bx]!=k,3]=0;out.append(Image.fromarray(crop))
 return out

def landmarks(im):
 a=np.array(im);mask=a[:,:,3]>100;yy,xx=np.indices(mask.shape)
 feet=mask&(yy>=im.height-8);fx=np.where(feet)[1];ax=(fx.min()+fx.max()+1)/2
 hair=mask&(a[:,:,0]>125)&(a[:,:,1]>85)&(a[:,:,1]>a[:,:,2]*1.15)&(a[:,:,0]>a[:,:,1]*.95)&(abs(xx-ax)<im.height*.28)&(yy<im.height*.65)
 top=max(0,int(np.where(hair)[0].min())-5);body=im.height-top
 hx=np.where(mask[top:top+round(body*.48),:].any(0))[0]
 return ax,top,body,int(hx[-1]-hx[0]+1)

def record(name,frames,size,origin,fit=None):
 atlas=Image.new('RGBA',(4*size,((len(frames)+3)//4)*size));seq=[]
 for i,(f,cup) in enumerate(frames):
  file=f'nitro-v7-frames/{name}-{i}.png';f.save(A/file);x=i%4*size;y=i//4*size;atlas.alpha_composite(f,(x,y))
  e={'image':name+'-v7-atlas.png','x':x,'y':y,'w':size,'h':size,'anchor':origin,'file':file}
  if cup:e['cup']=cup
  seq.append(e)
 atlas.save(A/(name+'-v7-atlas.png'));meta['sequences'][name]=seq

for stage in ['fetch','sip','cheer']:
 source=subjects(f'burnice-nitro-{stage}-v7-generated.png');lm=[landmarks(s) for s in source]
 sy=54/float(np.median([l[2] for l in lm[:3]]));sx=40/float(np.median([l[3] for l in lm[:3]]));frames=[];heights=[]
 for src,(ax,top,body,_) in zip(source,lm):
  w,h=round(src.width*sx),round(src.height*sy);x=round(80-ax*sx);y=112-h
  f=Image.new('RGBA',(160,160));assert x>=8 and y>=8 and x+w<=152 and y+h<=152
  f.alpha_composite(src.resize((w,h),Image.Resampling.NEAREST),(x,y));cup=None
  if stage=='cheer':
   ar=np.array(src);yy,xx=np.indices(ar.shape[:2]);m=(ar[:,:,3]>100)&(ar[:,:,0]>160)&(ar[:,:,1]>50)&(ar[:,:,1]<170)&(ar[:,:,2]<120)&(ar[:,:,0]>ar[:,:,1]*1.25)&(xx>ax+lm[0][3]*.28)&(yy<top+body*.55)
   ll,n=label(m)
   if n:
    areas=np.bincount(ll.ravel());areas[0]=0;k=areas.argmax();ys,xs=np.where(ll==k);cup=[round(x+(xs.mean()+.5)*sx-80),round(y+(ys.mean()+.5)*sy-112)]
  frames.append((f,cup));heights.append(round(body*sy))
 record('nitro-'+stage,frames,160,[80,112])
 meta['nitroCalibration'][stage]={'referenceHeight':54,'referenceHeadWidth':40,'bodyHeights':heights,'scaleX':sx,'scaleY':sy,'headWidths':[round(l[3]*sx) for l in lm[:3]]}

source=subjects('nitro-item-v7-generated.png',rows=2,keep_glints=True)
for name,group,size,target,origin in [('nitro-item',source[:4],32,20,[16,26]),('nitro-sparkle',source[4:],24,16,[12,12])]:
 scale=target/max(max(s.size) for s in group);frames=[]
 for src in group:
  w,h=round(src.width*scale),round(src.height*scale);f=Image.new('RGBA',(size,size));y=round(origin[1]-h if name=='nitro-item' else origin[1]-h/2)
  f.alpha_composite(src.resize((w,h),Image.Resampling.NEAREST),(round(origin[0]-w/2),y));frames.append((f,None))
 record(name,frames,size,origin)
meta['nitro']={'duration':4.6,'fetch':1.2,'sip':2,'cheer':1.4,'healHalfHearts':4,'dropChance':.05,'sample':[412,432],'healAt':'end','pauseCombatWhileUsing':True,'useKey':'E'}
(A/'nitro-v7-atlas.json').write_text(json.dumps(meta,indent=2))
with zipfile.ZipFile(A/'burnice-nitro-v7-sprites.zip','w',zipfile.ZIP_DEFLATED) as z:
 with zipfile.ZipFile(A/'burnice-fire-v6-sprites.zip') as old:
  for item in old.infolist():
   if item.filename not in ['README.txt']:z.writestr(item,old.read(item.filename))
 for name in ['burnice-nitro-fetch-v7-generated.png','burnice-nitro-sip-v7-generated.png','burnice-nitro-cheer-v7-generated.png','nitro-item-v7-generated.png','nitro-fetch-v7-atlas.png','nitro-sip-v7-atlas.png','nitro-cheer-v7-atlas.png','nitro-item-v7-atlas.png','nitro-sparkle-v7-atlas.png','nitro-v7-atlas.json']:z.write(A/name,name)
 for f in sorted(OUT.glob('*.png')):z.write(f,f.relative_to(A))
 z.writestr('README.txt','Nitro v7:200 combat/item/effect frames + separate24 movement frames=224 total.\nNew56:16 fetch from behind,16 drink,16 cheer/raise,4 item,4 sparkle.\n4.6 seconds:fetch1.2,sip2,cheer1.4. Heal4 half-heart units only after completion, capped at max.\nBody160px,feet80,112; head width40px/body height54px match idle.\nNitro item32px,origin16,26; sparkle24px,centre12,12.\nThe yard sample gives1 item. Defeated targets roll5% rare drops. PressE or use the item button.\nPrimary metadata:nitro-v7-atlas.json. Art made with built-in Image Generation.\nUnofficial Burnice / HoYoverse fan prototype.\n')
print(json.dumps({'frames':sum(map(len,meta['sequences'].values())),'calibration':meta['nitroCalibration'],'zipMB':round((A/'burnice-nitro-v7-sprites.zip').stat().st_size/1024**2,2)}))
