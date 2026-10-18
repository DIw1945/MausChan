"""Reproduce original layered combat SFX; optional NumPy/SciPy, no network/service."""
from pathlib import Path
import json,wave,hashlib
import numpy as np
from scipy.signal import butter,sosfilt
ROOT=Path(__file__).resolve().parents[1];A=ROOT/'dist/assets/sfx';SR=44100
rng=np.random.default_rng(3301945)
def noise(t,low,high):
    n=rng.normal(0,1,len(t));return sosfilt(butter(2,[low,high],btype='bandpass',fs=SR,output='sos'),n)
def tone(t,start,end,decay):
    return np.sin(2*np.pi*(end*t+(start-end)*.022*(1-np.exp(-t/.022))))*np.exp(-t/decay)
def whoosh(t,bright=1):
    u=t/t[-1];env=np.sin(np.pi*np.clip(u,0,1))**1.5
    return noise(t,1100,12500)*env*.65+tone(t,2400*bright,900*bright,.055)*.12

def build():
    clips={}
    def put(name,duration,fn,loop=False):
        t=np.arange(round(duration*SR))/SR;x=fn(t);x=np.nan_to_num(x);x-=x.mean()
        if not loop:
            fade=min(round(.008*SR),len(x)//4);x[:fade]*=np.linspace(0,1,fade);x[-fade:]*=np.linspace(1,0,fade)
        x=x/(np.max(np.abs(x)) or 1)*.72
        clips[name]=(x,loop)
    put('slash-a',.20,lambda t:whoosh(t)+tone(t,4200,2300,.045)*.06)
    put('slash-b',.22,lambda t:whoosh(t,.87)+tone(t,3700,1850,.055)*.08)
    def spin(t):
        out=np.zeros(len(t))
        for i,at in enumerate([0,.18,.36]):
            mask=(t>=at)&(t<at+.23);u=t[mask]-at;out[mask]+=whoosh(u,1-i*.1)*(.95-i*.1)
        return out+tone(t,1700,700,.15)*.12
    put('spin',.64,spin)
    put('monster-hit',.18,lambda t:tone(t,310,95,.045)*.7+noise(t,500,8000)*np.exp(-t/.026)*.7+tone(t,2300,1800,.025)*.1)
    put('player-hit',.28,lambda t:tone(t,190,58,.075)*.7+noise(t,180,5500)*np.exp(-t/.05)*.5+tone(t,1100,380,.06)*.15)
    put('charge-start',.18,lambda t:np.sin(2*np.pi*(340*t+2300*t*t))*np.sin(np.pi*t/.18)**1.2*.5+noise(t,1800,6500)*np.sin(np.pi*t/.18)**2*.12)
    # Integer-cycle tones and cyclic FFT noise preserve seamless loop boundaries.
    def cyclic(t,base):
        n=len(t);spectrum=rng.normal(size=n//2+1)+1j*rng.normal(size=n//2+1);freq=np.fft.rfftfreq(n,1/SR);spectrum[(freq<2200)|(freq>5500)]=0
        air=np.fft.irfft(spectrum,n=n);air/=np.max(np.abs(air)) or 1
        return (np.sin(2*np.pi*base*t)+.22*np.sin(2*np.pi*base*2*t)+.08*np.sin(2*np.pi*base*4*t))*.5+air*.045
    put('charge-loop',.40,lambda t:cyclic(t,240),True)
    def ready(t):
        out=np.zeros(len(t))
        for start,f in [(0,880),(.055,1100),(.11,1320)]:
            u=np.maximum(0,t-start);out+=np.where(t>=start,np.sin(2*np.pi*f*u)*np.exp(-u/.09),0)*.32
        return out
    put('charge-ready',.35,ready)
    put('charged-loop',.8,lambda t:cyclic(t,480)*(.6+.22*np.cos(2*np.pi*2.5*t)),True)
    put('charge-cancel',.12,lambda t:tone(t,560,180,.055)*.35+noise(t,1100,4000)*np.exp(-t/.035)*.15)
    A.mkdir(parents=True,exist_ok=True);files=[]
    for name,(x,loop) in clips.items():
        pcm=(np.clip(x,-1,1)*32767).astype('<i2');file=name+'-v33.wav'
        with wave.open(str(A/file),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(SR);f.writeframes(pcm.tobytes())
        assert np.isfinite(x).all() and max(abs(x))<.99 and np.sqrt(np.mean(x*x))>.01
        files.append({'name':name,'file':file,'duration':len(x)/SR,'loop':loop,'peak':float(max(abs(x))),'sha256':hashlib.sha256((A/file).read_bytes()).hexdigest()})
    (A/'combat-sfx-v33.json').write_text(json.dumps({'source':'original deterministic layered synthesis','sampleRate':SR,'format':'mono16-bit PCM WAV','seed':3301945,'files':files},indent=2)+'\n')
    print('Generated',len(files),'original SFX;',sum((A/f['file']).stat().st_size for f in files),'bytes')
if __name__=='__main__':build()
