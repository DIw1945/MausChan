import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,pressAttack,releaseAttack,advanceCombat,cancelAttack} from '../dist/combat.mjs';
import {createCombatSfx,SFX_FILES} from '../dist/combat-sfx.mjs';
function setup(){
 const started=[],stopped=[],urls=[];let ctx;
 const param=()=>({value:0,setTargetAtTime(value){this.value=value;}});
 class Context{
  constructor(){ctx=this;this.state='suspended';this.currentTime=0;this.destination={};}
  async resume(){this.state='running';}
  async decodeAudioData(data){return new TextDecoder().decode(data);}
  createGain(){return{gain:param(),connect(){},disconnect(){}};}
  createDynamicsCompressor(){return{threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){}};}
  createBufferSource(){return{buffer:null,loop:false,playbackRate:param(),connect(){},disconnect(){},start(){started.push(this);},stop(){stopped.push(this);}};}
 }
 const sfx=createCombatSfx({Context,fetchAudio:async url=>{urls.push(url.pathname);return{ok:true,arrayBuffer:async()=>new TextEncoder().encode(url.pathname.split('/').at(-1)).buffer};}});
 const c=createCombat(),h={dead:false,hurtTime:0};const update=(dt=.02,options={})=>sfx.update(c,h,dt,options);
 return{sfx,c,h,update,started,stopped,urls,context:()=>ctx,names:()=>started.map(n=>n.buffer.replace('-v33.wav',''))};
}
test('preloads10 local effects once and unlocks only on gesture, with no voice requests',async()=>{
 const a=setup();await a.sfx.preload();assert.equal(a.sfx.ready,true);assert.equal(a.context().state,'suspended');assert.equal(a.started.length,0);await a.sfx.unlock();await a.sfx.preload();assert.equal(a.urls.length,10);assert.ok(a.urls.every(u=>u.includes('/assets/sfx/')&&!u.includes('voice')));
});
test('real attack states emit one alternating slash per attack and spin only on release after full charge',async()=>{
 const a=setup();await a.sfx.unlock();pressAttack(a.c,'down');a.update();a.update();assert.deepEqual(a.names(),['slash-a']);releaseAttack(a.c);advanceCombat(a.c,.34);a.update();pressAttack(a.c,'down');a.update();assert.equal(a.names().at(-1),'slash-b');
 advanceCombat(a.c,.34);a.update();advanceCombat(a.c,.8);a.update();releaseAttack(a.c);a.update();assert.equal(a.names().at(-1),'spin');assert.ok(a.stopped.some(n=>n.loop));
});
test('charge rises smoothly, full chime fires once, and holding full does not stack loops',async()=>{
 const a=setup();await a.sfx.unlock();Object.assign(a.c,{state:'charging',charge:0});a.update();const loop=a.started.find(n=>n.loop);assert.equal(loop.buffer,SFX_FILES['charge-loop']);const initial=loop.playbackRate.value;
 a.c.charge=.4;a.update();assert.ok(loop.playbackRate.value>initial);a.c.charge=.8;a.update();for(let i=0;i<40;i++)a.update();assert.equal(a.names().filter(n=>n==='charge-ready').length,1);assert.equal(a.names().filter(n=>n==='charged-loop').length,1);assert.ok(a.stopped.includes(loop));
});
test('early release cancels charge, while hurt/restraint/pause stop charge without a false release sound',async()=>{
 for(const blocked of ['hurt','restrained','paused']){
 const a=setup();await a.sfx.unlock();Object.assign(a.c,{state:'charging',charge:.3});a.update();const loop=a.started.find(n=>n.loop);if(blocked==='hurt')a.h.hurtTime=.2;a.update(.02,{restrained:blocked==='restrained',paused:blocked==='paused'});assert.ok(a.stopped.includes(loop));assert.ok(!a.names().includes('charge-cancel'));}
 const a=setup();await a.sfx.unlock();Object.assign(a.c,{state:'charging',charge:.3});a.update();releaseAttack(a.c);a.update();assert.equal(a.names().at(-1),'charge-cancel');
});
test('actual positive damage produces coalesced target hits, separate player hits and bounded bursts',async()=>{
 const a=setup();await a.sfx.unlock();a.sfx.hit([]);a.sfx.hit([{damage:0}]);assert.equal(a.started.length,0);a.sfx.hit([{damage:20},{damage:20}]);a.sfx.hit([{damage:60}]);assert.deepEqual(a.names(),['monster-hit']);a.sfx.playerHit();a.sfx.playerHit();assert.deepEqual(a.names(),['monster-hit','player-hit']);a.update(.1);a.sfx.hit([{damage:60,killed:true}]);assert.equal(a.names().at(-1),'monster-hit');assert.equal(a.started.at(-1).playbackRate.value,.9);
});
test('mute/reset/hiding stop both loops and one-shots; unmute restarts only the current held loop',async()=>{
 const a=setup();await a.sfx.unlock();Object.assign(a.c,{state:'charging',charge:.4});a.update();a.sfx.setMuted(true);assert.ok(a.stopped.length>=2);const count=a.started.length;a.update();a.sfx.playerHit();assert.equal(a.started.length,count);a.sfx.setMuted(false);a.update();assert.equal(a.started.at(-1).buffer,SFX_FILES['charge-loop']);a.sfx.reset();cancelAttack(a.c);a.update();assert.equal(a.sfx.muted,false);assert.ok(a.stopped.includes(a.started.at(-1)));
});
test('late audio does not replay stale attacks and unsupported audio never breaks combat',async()=>{
 const a=setup();pressAttack(a.c,'down');a.update(.01);a.update(.3);await a.sfx.unlock();a.update(.01);assert.equal(a.started.length,0);
 const b=setup();pressAttack(b.c,'down');b.update(.01);await b.sfx.unlock();b.h.dead=true;b.update(.01);assert.equal(b.started.length,0);
 const unavailable=createCombatSfx({Context:null});assert.equal(await unavailable.unlock(),false);assert.doesNotThrow(()=>unavailable.update(createCombat(),{dead:false,hurtTime:0},.02));
});
