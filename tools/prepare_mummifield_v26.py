"""Slice only the generated Mummifield sheet; preserve complete subjects and feet."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy.ndimage import label, find_objects
ROOT=Path(__file__).resolve().parents[1]
A=ROOT/'dist/assets'
def main():
    source=Image.open(A/'burnice-mummifield-v26-generated.png').convert('RGBA')
    source.putalpha(source.getchannel('A').point(lambda x:x if x>=32 else 0))
    labels,_=label(np.asarray(source)[:,:,3]>0)
    cells=[[] for _ in range(16)]
    for i,r in enumerate(find_objects(labels),1):
        if r is None or np.count_nonzero(labels[r]==i)<12:continue
        y,x=r;col=int((x.start+x.stop)/2/source.width*4);row=int((y.start+y.stop)/2/source.height*4)
        cells[row*4+col].append((x.start,y.start,x.stop,y.stop))
    bounds=[(min(b[0] for b in c),min(b[1] for b in c),max(b[2] for b in c),max(b[3] for b in c)) for c in cells]
    scale=54/max(b[3]-b[1] for b in bounds)
    atlas=Image.new('RGBA',(640,640));folder=A/'burnice-mummifield-v26-frames';folder.mkdir(exist_ok=True);frames=[]
    for i,b in enumerate(bounds):
        assert b[2]-b[0]<source.width/4 and b[3]-b[1]<source.height/4,('Merged subjects',b)
        im=source.crop(b);im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.NEAREST)
        # Align to dark boots rather than hair bounds, preserving the generated hip sway.
        rgba=np.asarray(im);red,green,blue,alpha=rgba.transpose(2,0,1)
        boot=(alpha>100)&(red<85)&(green<85)&(blue<85)
        boot[:round(im.height*.88)]=False
        yy,xx=np.where(boot);assert len(xx)>2,('Missing boots',i)
        footCentre=round((int(xx.min())+int(xx.max()))/2)
        f=Image.new('RGBA',(160,160));f.paste(im,(80-footCentre,112-im.height));box=f.getbbox()
        assert box[0]>0 and box[1]>0 and box[2]<160 and box[3]==112
        file=f'burnice-mummifield-v26-frames/struggle-{i}.png';f.save(A/file);atlas.paste(f,((i%4)*160,(i//4)*160))
        frames.append({'file':file,'x':i%4*160,'y':i//4*160,'w':160,'h':160,'sourceBounds':b,'visibleBounds':box})
    assert len({atlas.crop((i%4*160,i//4*160,i%4*160+160,i//4*160+160)).tobytes() for i in range(16)})==16
    atlas.save(A/'burnice-mummifield-v26-atlas.png')
    (A/'burnice-mummifield-v26-atlas.json').write_text(json.dumps({'image':'burnice-mummifield-v26-atlas.png','source':'burnice-mummifield-v26-generated.png','anchor':[80,112],'fps':10,'loop':True,'frames':frames},indent=2)+'\n')
if __name__=='__main__':main()
