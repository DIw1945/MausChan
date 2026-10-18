import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMummyVoice} from '../dist/mummy-voice.mjs';
function setup(){
 const played=[],stopped=[];let fetches=0;
 class Context{
  constructor(){this.state='suspended';this.currentTime=0;this.destination={};}
  async resume(){this.state='running';}
  async decodeAudioData(data){return new Uint8Array(data)[0];}
  createGain(){return{gain:{value:0,setTargetAtTime(){}},connect(){},disconnect(){}};}
  createBufferSource(){return{buffer:null,connect(){},disconnect(){},start(){played.push(this.buffer);},stop(){stopped.push(this.buffer);}};}
 }
 const voice=createMummyVoice({Context,fetchAudio:async url=>{fetches++;const value=url.pathname.includes('surprise')?1:url.pathname.includes('deep')?3:2;return{ok:true,arrayBuffer:async()=>new Uint8Array([value]).buffer};}});
 const s={bound:true,capturing:true,tier:0,time:0},h={dead:false};return{voice,s,h,played,stopped,fetches:()=>fetches};
}
test('gesture unlock loads only three bundled clips once; no sound before unlock',async()=>{
 const a=setup();a.voice.update(a.s,a.h,.01);assert.deepEqual(a.played,[]);assert.equal(a.voice.ready,false);
 assert.equal(await a.voice.unlock(),true);assert.equal(a.voice.ready,true);a.voice.update(a.s,a.h,.01);assert.deepEqual(a.played,[1]);await a.voice.unlock();assert.equal(a.fetches(),3);
});
test('surprise precedes mouth wrapping; mouth cue replaces it and cannot overlap',async()=>{
 const a=setup();await a.voice.unlock();a.voice.update(a.s,a.h,.01);a.s.time=1.49;a.voice.update(a.s,a.h,1.49);assert.deepEqual(a.played,[1]);
 a.s.time=1.5;a.voice.update(a.s,a.h,.01);assert.deepEqual(a.played,[1,2]);assert.deepEqual(a.stopped,[1]);
 a.voice.update(a.s,a.h,.1);assert.deepEqual(a.played,[1,2]);Object.assign(a.s,{capturing:false,tier:1,time:0});a.voice.update(a.s,a.h,.4);assert.deepEqual(a.played,[1,2]);
});
test('muffled repeats are spaced out; tierII starts the deeper voice',async()=>{
 const a=setup();await a.voice.unlock();Object.assign(a.s,{capturing:false,tier:1});a.voice.update(a.s,a.h,.01);assert.deepEqual(a.played,[2]);
 for(let i=0;i<30;i++)a.voice.update(a.s,a.h,.1);assert.deepEqual(a.played,[2]);a.voice.update(a.s,a.h,.3);assert.deepEqual(a.played,[2,2]);
 a.s.tier=2;a.voice.update(a.s,a.h,.01);assert.deepEqual(a.played,[2,2,3]);assert.ok(a.stopped.length>=2);
});
test('escape, defeat, mute and Retry stop playback and discard pending cues',async()=>{
 const a=setup();await a.voice.unlock();a.voice.update(a.s,a.h,.01);a.voice.setMuted(true);assert.deepEqual(a.stopped,[1]);a.s.time=1.5;a.voice.update(a.s,a.h,2);assert.deepEqual(a.played,[1]);
 a.voice.setMuted(false);a.s.bound=false;a.voice.update(a.s,a.h,.01);assert.deepEqual(a.played,[1]);a.voice.reset();a.s.bound=true;a.s.time=0;a.voice.update(a.s,a.h,.01);assert.deepEqual(a.played,[1,1]);
 a.h.dead=true;a.voice.update(a.s,a.h,.01);assert.deepEqual(a.stopped,[1,1]);a.voice.reset();assert.equal(a.voice.muted,false);
});
test('failed/unsupported audio stays silent without interrupting gameplay; late unlock cannot play stale surprise',async()=>{
 const unavailable=createMummyVoice({Context:null});assert.equal(await unavailable.unlock(),false);assert.doesNotThrow(()=>unavailable.update({bound:true,capturing:true,time:0},{dead:false},.05));
 const a=setup();a.voice.update(a.s,a.h,.01);a.voice.update(a.s,a.h,.7);await a.voice.unlock();a.voice.update(a.s,a.h,.01);assert.deepEqual(a.played,[]);
 a.s.time=1.5;a.voice.update(a.s,a.h,.01);assert.deepEqual(a.played,[2]);
});
test('hiding the page silences the current clip without replaying surprise on return',async()=>{
 const a=setup();await a.voice.unlock();a.voice.update(a.s,a.h,.01);a.voice.silence();a.voice.update(a.s,a.h,.1);assert.deepEqual(a.played,[1]);assert.deepEqual(a.stopped,[1]);
 a.s.time=1.5;a.voice.update(a.s,a.h,1.4);assert.deepEqual(a.played,[1,2]);
});
