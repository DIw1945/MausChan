import {COMBAT} from './combat.mjs?v=12';
export const SFX_FILES=Object.fromEntries(['slash-a','slash-b','spin','monster-hit','player-hit','charge-start','charge-loop','charge-ready','charged-loop','charge-cancel'].map(name=>[name,`${name}-v33.wav`]));
export function createCombatSfx({Context=globalThis.AudioContext??globalThis.webkitAudioContext,fetchAudio=globalThis.fetch}={}){
  let context=null,loading=null,master=null,muted=false,clock=0,previous='idle',lastAttack=-1,wasCharged=false,loop=null,variant=0;
  const buffers=new Map(),active=new Set(),queued=[],lastHit={monster:-Infinity,player:-Infinity};
  async function preload(){
    if(!Context)return false;
    try{
      if(!context){context=new Context();master=context.createGain();master.gain.value=.65;const limiter=context.createDynamicsCompressor();limiter.threshold.value=-10;limiter.knee.value=12;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.12;master.connect(limiter);limiter.connect(context.destination);}
      loading??=Promise.all(Object.entries(SFX_FILES).map(async([name,file])=>{const r=await fetchAudio(new URL(`assets/sfx/${file}`,import.meta.url));if(!r.ok)throw Error('SFX unavailable');buffers.set(name,await context.decodeAudioData(await r.arrayBuffer()));}));
      await loading;return true;
    }catch{return false;}
  }
  async function unlock(){const pending=preload();try{if(context?.state!=='running')await context?.resume();return await pending;}catch{return false;}}
  function start(name,{gain=1,rate=1,repeat=false}={}){
    if(muted||context?.state!=='running'||!buffers.has(name))return null;
    const source=context.createBufferSource(),level=context.createGain();source.buffer=buffers.get(name);source.loop=repeat;source.playbackRate.value=rate;level.gain.value=gain;
    source.connect(level);level.connect(master);const entry={source,level,name};active.add(entry);
    source.onended=()=>{active.delete(entry);source.disconnect();level.disconnect();};source.start();return entry;
  }
  function stop(entry){if(!entry)return;active.delete(entry);entry.level.gain.setTargetAtTime(0,context.currentTime,.006);entry.source.stop(context.currentTime+.03);}
  function stopLoop(){stop(loop);loop=null;}
  function emit(name,options={}){
    if(muted)return;const gap=name==='monster-hit'?.055:name==='player-hit'?.07:0,key=name==='monster-hit'?'monster':name==='player-hit'?'player':null;
    if(key){if(clock-lastHit[key]<gap)return;lastHit[key]=clock;}
    if(!start(name,options)){if(queued.length<8)queued.push({name,options,until:clock+.12});}
  }
  function update(combat,health,dt,{restrained=false,paused=false}={}){
    clock+=Math.max(0,dt);
    const blocked=health.dead||health.hurtTime>0||restrained||paused,state=blocked?'idle':combat.state;
    if(blocked)for(let i=queued.length-1;i>=0;i--)if(!['monster-hit','player-hit'].includes(queued[i].name))queued.splice(i,1);
    for(let i=queued.length-1;i>=0;i--){const cue=queued[i];if(clock>cue.until||muted||start(cue.name,cue.options))queued.splice(i,1);}
    if((state==='slash'||state==='spin')&&(state!==previous||combat.id!==lastAttack)){emit(state==='spin'?'spin':variant++%2?'slash-b':'slash-a');lastAttack=combat.id;}
    if(state==='charging'){
      const ratio=Math.min(1,Math.max(0,combat.charge/COMBAT.chargeDuration)),full=ratio>=1,name=full?'charged-loop':'charge-loop';
      if(previous!=='charging')emit('charge-start',{gain:.55});
      if(full&&!wasCharged)emit('charge-ready',{gain:.65});
      if(loop?.name!==name){stopLoop();loop=start(name,{repeat:true,gain:full?.13:.12});}
      if(loop){loop.source.playbackRate.setTargetAtTime(full?1:.85+ratio*.65,context.currentTime,.04);loop.level.gain.setTargetAtTime(full?.13:.10+ratio*.08,context.currentTime,.04);}
      wasCharged=full;
    }else{
      if(previous==='charging'&&state==='idle'&&!blocked)emit('charge-cancel',{gain:.4});
      stopLoop();wasCharged=false;
    }
    previous=state;
  }
  function hit(events){if(events.some(e=>e.damage>0))emit('monster-hit',{gain:events.some(e=>e.killed)?1:.8,rate:events.some(e=>e.killed)?.9:1});}
  function playerHit(){emit('player-hit',{gain:.9});}
  function silence(){stopLoop();for(const e of [...active])stop(e);queued.length=0;previous='idle';wasCharged=false;}
  function reset(){silence();clock=0;lastAttack=-1;lastHit.monster=lastHit.player=-Infinity;}
  function setMuted(value){muted=!!value;if(muted)silence();}
  return{preload,unlock,update,hit,playerHit,silence,reset,setMuted,get muted(){return muted;},get ready(){return buffers.size===Object.keys(SFX_FILES).length;}};
}
