"""Slice the Image Generation sheet into aligned, low-resolution game frames."""
from pathlib import Path
from PIL import Image
import json, zipfile

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'dist/assets'
source = ASSETS / 'burnice-generated.png'
im = Image.open(source).convert('RGBA')
out = ASSETS / 'frames'
out.mkdir(parents=True, exist_ok=True)
directions = ['down', 'left', 'right', 'up']
atlas = Image.new('RGBA', (64*6, 64*4))
records = {}
for row, direction in enumerate(directions):
    records[direction] = []
    for col in range(6):
        cell = im.crop((col*256, row*256, (col+1)*256, (row+1)*256))
        # Trim only nearly transparent background noise; retain subject alpha.
        alpha = cell.getchannel('A')
        mask = alpha.point(lambda value: 255 if value > 96 else 0)
        box = mask.getbbox()
        crop = cell.crop(box)
        crop.putalpha(crop.getchannel('A').point(lambda value: 0 if value < 32 else value))
        crop = crop.resize((round(crop.width/4), round(crop.height/4)), Image.Resampling.NEAREST)
        frame = Image.new('RGBA', (64,64))
        frame.alpha_composite(crop, ((64-crop.width)//2, 61-crop.height))
        action = 'idle' if col < 2 else 'walk'
        idx = col if col < 2 else col-2
        name = f'{direction}-{action}-{idx}.png'
        frame.save(out / name)
        atlas.alpha_composite(frame, (col*64,row*64))
        records[direction].append({'file':'frames/'+name,'x':col*64,'y':row*64,'w':64,'h':64,'action':action,'index':idx,'anchor':[32,61]})
atlas.save(ASSETS / 'burnice-atlas.png')
meta = {'image':'burnice-atlas.png','frameSize':[64,64],'anchor':[32,61],'idleFps':2,'walkFps':8,'directions':records,'source':'Image Generation, sliced with Pillow; no procedural character drawing.'}
(ASSETS/'burnice-atlas.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
with zipfile.ZipFile(ASSETS/'burnice-sprites.zip','w',zipfile.ZIP_DEFLATED) as z:
    for f in [ASSETS/'burnice-generated.png', ASSETS/'burnice-atlas.png', ASSETS/'burnice-atlas.json',*sorted(out.glob('*.png'))]:
        z.write(f,f.relative_to(ASSETS))
    z.writestr('README.txt','Burnice White fan-made sprite study\n24 frames, 64x64 RGBA. Row order: down, left, right, up.\nColumns 0-1: idle (2 fps). Columns 2-5: walk (8 fps).\nOrigin: bottom-centre (32,61). Movement uses 8 directions; art uses 4 facing directions.\nSprites generated using Image Generation from a character reference, then cropped and reduced with nearest-neighbor.\nCharacter belongs to HoYoverse; this pack does not grant rights to the original character.\n')
print(json.dumps({'frames':24,'atlas':str(ASSETS/'burnice-atlas.png'),'size':atlas.size}))
