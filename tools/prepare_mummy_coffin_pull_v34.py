"""Slice only12 generated active coffin poses, matching existing prop anchors/scale."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy.ndimage import label,find_objects,distance_transform_edt
ROOT=Path(__file__).resolve().parents[1];A=ROOT/'dist/assets'
def main():
    name='mummy-coffin-pull-v34-generated.png';source=Image.open(A/name).convert('RGBA');source.putalpha(source.getchannel('A').point(lambda a:a if a>=32 else 0));pixels=np.asarray(source);labels,_=label(pixels[:,:,3]>0);cells=[[]for _ in range(12)]
    counts=np.bincount(labels.ravel());major=np.flatnonzero(counts>500);major=major[major!=0];assert len(major)==12
    mainMask=np.isin(labels,major);_,nearest=distance_transform_edt(~mainMask,return_indices=True);owners=labels[tuple(nearest)]
    groups={}
    for ident in major:
        y,x=np.where(labels==ident);groups[int(ident)]=int((y.min()+y.max())/2/source.height*3)*4+int((x.min()+x.max())/2/source.width*4)
    for ident,region in enumerate(find_objects(labels),1):
        if region is None or np.count_nonzero(labels[region]==ident)<12:continue
        y,x=region;votes=np.bincount(owners[region][labels[region]==ident]);owner=int(votes.argmax());index=groups[owner];cells[index].append((x.start,y.start,x.stop,y.stop))
    subjects=[]
    for parts in cells:
        assert parts;bounds=(min(b[0]for b in parts),min(b[1]for b in parts),max(b[2]for b in parts),max(b[3]for b in parts));assert bounds[2]-bounds[0]<source.width/4*1.1
        im=source.crop(bounds);r,g,b,a=np.asarray(im).transpose(2,0,1);gold=(a>100)&(r>100)&(g>65)&(b<g*.62)&(r>g*1.25);gl,_=label(gold);counts=np.bincount(gl.ravel());regions=[region for ident,region in enumerate(find_objects(gl),1)if region is not None and counts[ident]>=100];assert regions
        left,right=min(r[1].start for r in regions),max(r[1].stop for r in regions);gold[:,:left]=False;gold[:,right:]=False;y,x=np.where(gold);box=(int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1));subjects.append((im,bounds,box))
    scale=min(72/(g[3]-g[1])for _,_,g in subjects);atlas=Image.new('RGBA',(448,336));folder=A/'mummy-coffin-pull-v34-frames';folder.mkdir(exist_ok=True);frames=[];hashes=[]
    for i,(im,bounds,gold)in enumerate(subjects):
        scaled=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.NEAREST);x=round(48-(gold[0]+gold[2])/2*scale);y=round(98-gold[3]*scale);assert x>=1 and y>=1 and x+scaled.width<112 and y+scaled.height<112
        f=Image.new('RGBA',(112,112));f.paste(scaled,(x,y));file=f'mummy-coffin-pull-v34-frames/pull-{i}.png';f.save(A/file);atlas.paste(f,(i%4*112,i//4*112));hashes.append(f.tobytes());frames.append({'file':file,'x':i%4*112,'y':i//4*112,'w':112,'h':112,'sourceBounds':bounds,'goldBounds':gold,'visibleBounds':f.getbbox()})
    assert len(set(hashes))==12;atlas.save(A/'mummy-coffin-pull-v34-atlas.png');(A/'mummy-coffin-pull-v34-atlas.json').write_text(json.dumps({'image':'mummy-coffin-pull-v34-atlas.png','source':name,'anchor':[56,80],'fps':10,'loop':True,'frames':frames},indent=2)+'\n');print('12 unique aligned coffin frames')
if __name__=='__main__':main()
