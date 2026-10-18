"""Slice the generated24-frame capture. Retain every complete ribbon; size from the body."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy.ndimage import label,find_objects
ROOT=Path(__file__).resolve().parents[1];A=ROOT/'dist/assets'
def main():
    source=Image.open(A/'burnice-mummifield-capture-v30-generated.png').convert('RGBA')
    source.putalpha(source.getchannel('A').point(lambda x:x if x>=32 else 0))
    pixels=np.asarray(source);assert (pixels[:,:,3]==0).mean()>.35
    labels,_=label(pixels[:,:,3]>0);cells=[[]for _ in range(24)];bodyParts=[[]for _ in range(24)]
    for ident,region in enumerate(find_objects(labels),1):
        if region is None:continue
        count=np.count_nonzero(labels[region]==ident)
        if count<12:continue
        y,x=region;index=int((y.start+y.stop)/2/source.height*4)*6+int((x.start+x.stop)/2/source.width*6)
        bounds=(x.start,y.start,x.stop,y.stop);cells[index].append(bounds);bodyParts[index].append((count,bounds))
    assert all(cells),'Missing frame'
    atlas=Image.new('RGBA',(640,960));folder=A/'burnice-mummifield-capture-v30-frames';folder.mkdir(exist_ok=True);frames=[];hashes=[]
    for i,parts in enumerate(cells):
        bounds=(min(b[0]for b in parts),min(b[1]for b in parts),max(b[2]for b in parts),max(b[3]for b in parts))
        assert bounds[2]-bounds[0]<source.width/6*1.12 and bounds[3]-bounds[1]<source.height/4,('Merged frames',i,bounds)
        # Use the main body only as a scale reference. All components remain in the output.
        body=max(bodyParts[i])[1];bx,by,br,bb=body
        head=np.asarray(source.crop((bx,by,br,by+round((bb-by)*.35))));r,g,b,a=head.transpose(2,0,1)
        gold=(a>100)&(r>100)&(g>65)&(b<g*.65)&(r>g*1.1);_,x=np.where(gold);assert len(x)>5
        pivot=bx+(int(x.min())+int(x.max()))/2;widthScale=37/(int(x.max())-int(x.min())+1);heightScale=54/(bb-by)
        im=source.crop(bounds);scaled=im.resize((round(im.width*widthScale),round(im.height*heightScale)),Image.Resampling.NEAREST)
        x=round(80-(pivot-bounds[0])*widthScale);y=round(112-(bb-bounds[1])*heightScale)
        frame=Image.new('RGBA',(160,160));frame.paste(scaled,(x,y));box=frame.getbbox();assert box[0]>1 and box[1]>1 and box[2]<159 and box[3]<159
        file=f'burnice-mummifield-capture-v30-frames/capture-{i}.png';frame.save(A/file);atlas.paste(frame,(i%4*160,i//4*160));hashes.append(frame.tobytes())
        frames.append({'file':file,'x':i%4*160,'y':i//4*160,'w':160,'h':160,'sourceBounds':bounds,'sourceBodyBounds':body,'visibleBounds':box,'sourceHeadPivotX':pivot})
    assert len(set(hashes))==24
    atlas.save(A/'burnice-mummifield-capture-v30-atlas.png')
    (A/'burnice-mummifield-capture-v30-atlas.json').write_text(json.dumps({'image':'burnice-mummifield-capture-v30-atlas.png','source':'burnice-mummifield-capture-v30-generated.png','anchor':[80,112],'fps':12,'loop':False,'duration':2,'frames':frames},indent=2)+'\n')
if __name__=='__main__':main()
