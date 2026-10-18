"""Slice only the generated eight-pose wrapped fall, preserving uniform body scale."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy.ndimage import label,find_objects
ROOT=Path(__file__).resolve().parents[1];A=ROOT/'dist/assets'
def main():
    source=Image.open(A/'burnice-mummifield-fall-v28-generated.png').convert('RGBA')
    source.putalpha(source.getchannel('A').point(lambda x:x if x>=32 else 0))
    labels,_=label(np.asarray(source)[:,:,3]>0);cells=[[] for _ in range(8)]
    for ident,region in enumerate(find_objects(labels),1):
        if region is None or np.count_nonzero(labels[region]==ident)<12:continue
        y,x=region;col=int((x.start+x.stop)/2/source.width*4);row=int((y.start+y.stop)/2/source.height*2)
        cells[row*4+col].append((x.start,y.start,x.stop,y.stop))
    bounds=[(min(b[0] for b in c),min(b[1] for b in c),max(b[2] for b in c),max(b[3] for b in c)) for c in cells]
    scale=54/(bounds[0][3]-bounds[0][1]);atlas=Image.new('RGBA',(640,320));folder=A/'burnice-mummifield-fall-v28-frames';folder.mkdir(exist_ok=True);frames=[]
    for i,b in enumerate(bounds):
        assert b[2]-b[0]<source.width/4 and b[3]-b[1]<source.height/2,('Merged bodies',i,b)
        im=source.crop(b);alpha=np.asarray(im)[:,:,3]
        if i<6:
            toes=alpha>100;toes[:round(im.height*.88)]=False
            if i>=4:toes[:,round(im.width*.4):]=False
            _,x=np.where(toes);pivot=float((x.min()+x.max())/2)
        else:pivot=im.width*.065
        scaled=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.NEAREST)
        f=Image.new('RGBA',(160,160));f.paste(scaled,(round(80-pivot*scale),112-scaled.height));box=f.getbbox()
        assert box[0]>1 and box[1]>1 and box[2]<159 and box[3]==112,('Clipped',i,box)
        file=f'burnice-mummifield-fall-v28-frames/fall-{i}.png';f.save(A/file);atlas.paste(f,(i%4*160,i//4*160));frames.append({'file':file,'x':i%4*160,'y':i//4*160,'w':160,'h':160,'sourceBounds':b,'visibleBounds':box,'sourceGroundPivotX':pivot})
    atlas.save(A/'burnice-mummifield-fall-v28-atlas.png')
    (A/'burnice-mummifield-fall-v28-atlas.json').write_text(json.dumps({'image':'burnice-mummifield-fall-v28-atlas.png','source':'burnice-mummifield-fall-v28-generated.png','anchor':[80,112],'fps':8,'loop':False,'holdLast':True,'frames':frames},indent=2)+'\n')
if __name__=='__main__':main()
