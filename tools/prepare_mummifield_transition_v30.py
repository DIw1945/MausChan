"""Slice only the generated 24-pose wrapping transition, retaining reading order."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy.ndimage import label,find_objects
ROOT=Path(__file__).resolve().parents[1];A=ROOT/'dist/assets'
def main():
    source=Image.open(A/'burnice-mummifield-transition-v29-generated.png').convert('RGBA')
    source.putalpha(source.getchannel('A').point(lambda x:x if x>=32 else 0))
    pixels=np.asarray(source);assert np.count_nonzero(pixels[:,:,3]==0)>source.width*source.height*.35,'Transparent gutters required'
    labels,_=label(pixels[:,:,3]>0);cells=[[] for _ in range(24)]
    for ident,region in enumerate(find_objects(labels),1):
        if region is None or np.count_nonzero(labels[region]==ident)<12:continue
        y,x=region;col=int((x.start+x.stop)/2/source.width*6);row=int((y.start+y.stop)/2/source.height*4)
        cells[row*6+col].append((x.start,y.start,x.stop,y.stop))
    assert all(cells),'Missing frame'
    bounds=[(min(b[0] for b in c),min(b[1] for b in c),max(b[2] for b in c),max(b[3] for b in c)) for c in cells]
    atlas=Image.new('RGBA',(640,960));folder=A/'burnice-mummifield-transition-v30-frames';folder.mkdir(exist_ok=True);frames=[];hashes=[]
    for i,b in enumerate(bounds):
        assert b[2]-b[0]<source.width/6 and b[3]-b[1]<source.height/4,('Merged subjects',i,b)
        im=source.crop(b);r,g,blue,a=np.asarray(im).transpose(2,0,1)
        # Head ornaments anchor the figure; moving linen ends near the feet are excluded.
        gold=(a>100)&(r>100)&(g>65)&(blue<g*.65)&(r>g*1.1);gold[round(im.height*.35):]=False
        _,x=np.where(gold);assert len(x)>5
        pivot=(int(x.min())+int(x.max()))/2;scale=54/im.height
        headMask=np.asarray(im)[:round(im.height*20/54),:,3]>100
        _,hx=np.where(headMask)
        sourceHeadWidth=int(hx.max())-int(hx.min())+1
        targetHeadWidth=40-i/23
        widthScale=targetHeadWidth/sourceHeadWidth
        scaled=im.resize((round(im.width*widthScale),54),Image.Resampling.NEAREST)
        f=Image.new('RGBA',(160,160));f.paste(scaled,(round(80-pivot*widthScale),58));box=f.getbbox()
        assert box[0]>1 and box[1]>1 and box[2]<159 and box[3]==112,('Clipped',i,box)
        file=f'burnice-mummifield-transition-v30-frames/wrap-{i}.png';f.save(A/file);atlas.paste(f,(i%4*160,i//4*160));hashes.append(f.tobytes());frames.append({'file':file,'x':i%4*160,'y':i//4*160,'w':160,'h':160,'sourceBounds':b,'visibleBounds':box,'sourceHeadPivotX':pivot,'targetHeadWidth':targetHeadWidth})
    assert len(set(hashes))==24,'24 distinct generated poses required'
    atlas.save(A/'burnice-mummifield-transition-v30-atlas.png')
    (A/'burnice-mummifield-transition-v30-atlas.json').write_text(json.dumps({'image':'burnice-mummifield-transition-v30-atlas.png','source':'burnice-mummifield-transition-v29-generated.png','anchor':[80,112],'fps':12,'loop':False,'duration':2,'frames':frames},indent=2)+'\n')
if __name__=='__main__':main()
