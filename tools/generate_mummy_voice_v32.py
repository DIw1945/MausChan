"""Optional regeneration: pip install edge-tts==7.3.1; requires ffmpeg. No runtime TTS."""
from pathlib import Path
import asyncio,json,os,subprocess
import edge_tts
import edge_tts.communicate
ROOT=Path(__file__).resolve().parents[1];A=ROOT/'dist/assets/audio'
TRIM='silenceremove=start_periods=1:start_duration=0.015:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_duration=0.015:start_threshold=-45dB,areverse'
LINES=[('mummy-surprise-ja-nanami-v32.mp3','えっ、なにこれ！','+20%'),('mummy-murmur-ja-nanami-v32.mp3','んーっ……んんーっ、んーっ！','-10%')]
FILTERS={
 'mummy-surprise-ja-v32.mp3':(LINES[0][0],TRIM+',loudnorm=I=-19:TP=-2:LRA=7,afade=t=in:d=0.015'),
 'mummy-muffled-ja-v32.mp3':(LINES[1][0],TRIM+',highpass=f=180,lowpass=f=900,equalizer=f=440:t=q:w=0.9:g=3,loudnorm=I=-21:TP=-3:LRA=6,afade=t=in:d=0.025'),
 'mummy-muffled-deep-ja-v32.mp3':(LINES[1][0],TRIM+',atempo=1.02,highpass=f=180,lowpass=f=650,equalizer=f=380:t=q:w=0.9:g=3,loudnorm=I=-22:TP=-3:LRA=6,afade=t=in:d=0.025'),
}
async def main():
    (A/'sources').mkdir(parents=True,exist_ok=True)
    # Add the environment's trusted proxy CA without disabling certificate checks.
    if os.environ.get('SSL_CERT_FILE'):edge_tts.communicate._SSL_CTX.load_verify_locations(cafile=os.environ['SSL_CERT_FILE'])
    for name,text,rate in LINES:
        await edge_tts.Communicate(text,'ja-JP-NanamiNeural',rate=rate,pitch='+38Hz',proxy=os.environ.get('HTTPS_PROXY')).save(str(A/'sources'/name))
    files=[]
    for output,(source,filters) in FILTERS.items():
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(A/'sources'/source),'-af',filters,'-ar','24000','-ac','1','-b:a','64k',str(A/output)],check=True)
        duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(A/output)],text=True))
        files.append({'file':output,'source':'sources/'+source,'duration':duration,'filters':filters})
    (A/'mummy-voice-v32.json').write_text(json.dumps({'provider':'Microsoft Edge online TTS via edge-tts7.3.1','voice':'ja-JP-NanamiNeural','synthetic':True,'language':'ja-JP','pitch':'+38Hz','lines':[{'source':'sources/'+name,'text':text,'rate':rate}for name,text,rate in LINES],'format':'MP3, mono,24kHz,64kbps','files':files},ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':asyncio.run(main())
