"""Build36 complete generated drag poses from primary/supplement sheets, not fixed crops."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy.ndimage import label,find_objects
ROOT=Path(__file__).resolve().parents[1];A=ROOT/'dist/assets'
def subjects(name,cols,rows):
    source=Image.open(A/name).convert('RGBA');source.putalpha(source.getchannel('A').point(lambda a:a if a>=32 else 0));labels,_=label(np.asarray(source)[:,:,3]>0);cells={}
    for ident,region in enumerate(find_objects(labels),1):
        if region is None or np.count_nonzero(labels[region]==ident)<12:continue
        y,x=region;index=int((y.start+y.stop)/2/source.height*rows)*cols+int((x.start+x.stop)/2/source.width*cols);cells.setdefault(index,[]).append((x.start,y.start,x.stop,y.stop))
    result=[]
    for index,parts in sorted(cells.items()):
        bounds=(min(b[0]for b in parts),min(b[1]for b in parts),max(b[2]for b in parts),max(b[3]for b in parts))
        if bounds[0]<=0 or bounds[1]<=0 or bounds[2]>=source.width or bounds[3]>=source.height:continue
        assert bounds[2]-bounds[0]<source.width/cols*1.15 and bounds[3]-bounds[1]<source.height/rows,('Merged',name,index,bounds)
        result.append((index,source.crop(bounds),bounds))
    return result

def main():
    primary='burnice-mummy-drag-v34-generated.png';supplement='burnice-mummy-drag-v34-supplement-generated.png'
    a=subjects(primary,6,5);b=subjects(supplement,4,3);assert len(a)>=24 and len(b)==12
    # Retain24 primary complete poses and12 supplementary poses; cropped source cells are excluded.
    chosen=[entry for entry in a if entry[0]not in [2,3,27]][:24];assert len(chosen)==24
    atlas=Image.new('RGBA',(640,1440));folder=A/'burnice-mummy-drag-v34-frames';folder.mkdir(exist_ok=True);frames=[];hashes=[]
    for name,poses in [(primary,chosen),(supplement,b)]:
        base=poses[0][1];sx,sy=60/base.width,30/base.height
        for sourceFrame,im,bounds in poses:
            i=len(frames);scaled=im.resize((round(im.width*sx),round(im.height*sy)),Image.Resampling.NEAREST);f=Image.new('RGBA',(160,160));f.paste(scaled,(80-scaled.width//2,112-scaled.height));box=f.getbbox();assert box[0]>1 and box[1]>1 and box[2]<159 and box[3]==112
            file=f'burnice-mummy-drag-v34-frames/struggle-{i}.png';f.save(A/file);atlas.paste(f,(i%4*160,i//4*160));hashes.append(f.tobytes());frames.append({'file':file,'x':i%4*160,'y':i//4*160,'w':160,'h':160,'source':name,'sourceFrame':sourceFrame,'sourceBounds':bounds,'visibleBounds':box})
    assert len(frames)==36 and len(set(hashes))==36;atlas.save(A/'burnice-mummy-drag-v34-atlas.png');(A/'burnice-mummy-drag-v34-atlas.json').write_text(json.dumps({'image':'burnice-mummy-drag-v34-atlas.png','sources':[primary,supplement],'anchor':[80,97],'groundY':112,'fps':12,'loop':True,'frames':frames},indent=2)+'\n');print('36 unique complete drag poses, 60x30 prone reference size')
if __name__=='__main__':main()
