// Bundled Japanese synthetic voice. Playback never calls a speech service.
export const MUMMY_VOICE={mouthTime:1.5,interval:3.2,volume:.8,files:{surprise:'mummy-surprise-ja-v31.mp3',muffled:'mummy-muffled-ja-v31.mp3',deep:'mummy-muffled-deep-ja-v31.mp3'}};
const phaseOf=(s,h)=>h.dead||!s.bound?'none':s.capturing?'capture':s.transitioning?'wrapping':s.tier===2?'second':'first';
export function createMummyVoice({Context=globalThis.AudioContext??globalThis.webkitAudioContext,fetchAudio=globalThis.fetch}={}){
  let context=null,loading=null,muted=false,phase='none',clock=0,nextAt=0,mouthPlayed=false,current=null,pending=null;
  const buffers=new Map();
  function stop(){
    const old=current;current=null;if(!old)return;
    old.gain.gain.setTargetAtTime(0,context.currentTime,.008);old.source.stop(context.currentTime+.04);
  }
  async function unlock(){
    if(!Context)return false;
    try{
      context??=new Context();if(context.state!=='running')await context.resume();
      loading??=Promise.all(Object.entries(MUMMY_VOICE.files).map(async([name,file])=>{
        const response=await fetchAudio(new URL(`assets/audio/${file}`,import.meta.url));if(!response.ok)throw Error('Voice unavailable');
        buffers.set(name,await context.decodeAudioData(await response.arrayBuffer()));
      }));
      await loading;return true;
    }catch{return false;}
  }
  function play(name){
    if(muted||context?.state!=='running'||!buffers.has(name))return false;
    stop();const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffers.get(name);gain.gain.value=MUMMY_VOICE.volume;
    source.connect(gain);gain.connect(context.destination);current={source,gain};
    source.onended=()=>{source.disconnect();gain.disconnect();if(current?.source===source)current=null;};source.start();return true;
  }
  function update(s,h,dt){
    clock+=Math.max(0,dt);const next=phaseOf(s,h);
    if(next!==phase){
      phase=next;pending=null;
      if(next==='none'){stop();mouthPlayed=false;return;}
      if(next==='capture'){mouthPlayed=false;pending={name:'surprise',until:clock+.6};}
      else if(next==='second'||clock>=nextAt)pending={name:next==='second'?'deep':'muffled',until:clock+.6};
    }
    if(phase==='none'||muted)return;
    if(phase==='capture'&&s.time>=MUMMY_VOICE.mouthTime&&!mouthPlayed){mouthPlayed=true;pending={name:'muffled',until:clock+.6};}
    if(phase!=='capture'&&clock>=nextAt&&!pending)pending={name:phase==='second'?'deep':'muffled',until:clock+.6};
    if(pending){
      if(clock>pending.until){pending=null;nextAt=clock+MUMMY_VOICE.interval;}
      else if(play(pending.name)){pending=null;nextAt=clock+MUMMY_VOICE.interval;}
    }
  }
  function silence(){stop();pending=null;nextAt=clock+MUMMY_VOICE.interval;}
  function reset(){stop();phase='none';clock=0;nextAt=0;pending=null;mouthPlayed=false;}
  function setMuted(value){muted=!!value;pending=null;nextAt=clock+MUMMY_VOICE.interval;if(muted)stop();}
  return{unlock,update,reset,silence,setMuted,get muted(){return muted;},get ready(){return buffers.size===3;}};
}
