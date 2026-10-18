import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DEFEAT,GAME_OVER_TIME,DEFEAT_HEAD,advanceDefeat,defeatPose,starOrbit} from '../dist/defeat.mjs';
import {createHealth,receiveDamage} from '../dist/health.mjs';

test('zero HP starts the dizzy sequence; Game Over waits for spin, fall and visible dazed rest',()=>{
 const h=createHealth(),p={x:280,y:410,facing:'left'};
 receiveDamage(h,p,{damage:6,vx:0,vy:110});
 assert.equal(h.dead,true);assert.equal(h.deathTime,0);assert.equal(h.facing,'left');
 for(const [t,stage,gameOver] of [[0,'spin',false],[1.999,'spin',false],[2,'collapse',false],[2.999,'collapse',false],[3,'rest',false],[4.199,'rest',false],[4.2,'rest',true],[30,'rest',true]]){
  const pose=defeatPose(t,h.facing);assert.equal(pose.stage,stage);assert.equal(pose.gameOver,gameOver);
 }
 assert.equal(GAME_OVER_TIME,4.2);
});

test('spin shows 16 distinct poses in its first turn, lands facing forward, and every fall frame is used',()=>{
 for(const facing of ['down','left','right','up']){
  const turn=Array.from({length:16},(_,i)=>defeatPose((i+.1)/16,facing).frame);
  assert.equal(new Set(turn).size,16);
  assert.equal(defeatPose(1.99,facing).frame,15);
 }
 assert.deepEqual(Array.from({length:16},(_,i)=>defeatPose(2+(i+.1)/16).frame),Array.from({length:16},(_,i)=>i));
 assert.equal(DEFEAT.spinDuration,2);
});

test('eight lying poses loop after Game Over while exactly three separately spaced stars keep orbiting',()=>{
 assert.deepEqual(Array.from({length:8},(_,i)=>defeatPose(3+(i+.1)/8).frame),[0,1,2,3,4,5,6,7]);
 assert.equal(defeatPose(4.01).frame,0);assert.equal(defeatPose(7).stage,'rest');
 for(const t of [0,1,3,4.2,60]){
  const stars=starOrbit(t,100,100);assert.equal(stars.length,3);
  assert.ok(Math.abs(stars.reduce((s,p)=>s+p.x,0)/3-100)<1e-8);
  assert.ok(Math.abs(stars.reduce((s,p)=>s+p.y,0)/3-84)<1e-8);
  for(const p of stars){assert.ok(p.frame>=0&&p.frame<4);assert.ok(p.alpha>=.72&&p.alpha<=1);}
 }
 assert.notDeepEqual(starOrbit(4.2,100,100),starOrbit(4.4,100,100));
 assert.equal(defeatPose(2.7).stars,false);assert.equal(defeatPose(2.9).stars,true);
});

test('defeat time only advances while dead and reset fully clears the sequence',()=>{
 const h=createHealth();advanceDefeat(h,3);assert.equal(h.deathTime,0);
 h.dead=true;advanceDefeat(h,2);assert.equal(h.deathTime,2);advanceDefeat(h,-1);assert.equal(h.deathTime,2);
 Object.assign(h,createHealth());advanceDefeat(h,.1);assert.equal(h.deathTime,0);assert.equal(h.hp,6);assert.equal(h.dead,false);
});

test('44 new production frames fit their atlases and share the documented ground/head anchors',()=>{
 const base=new URL('../dist/assets/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('defeat-v5-atlas.json',base)));
 const counts={'defeat-spin':16,'defeat-collapse':16,'defeat-rest':8,'defeat-stars':4};
 assert.deepEqual(meta.headOffset,[DEFEAT_HEAD.x,DEFEAT_HEAD.y]);
 for(const [name,count] of Object.entries(counts)){
  const frames=meta.sequences[name];assert.equal(frames.length,count);
  for(const f of frames){const png=fs.readFileSync(new URL(f.image,base)),w=png.readUInt32BE(16),h=png.readUInt32BE(20);
   assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=w&&f.y+f.h<=h);
   assert.deepEqual(f.anchor,name==='defeat-stars'?[8,8]:[80,112]);assert.ok(fs.existsSync(new URL(f.file,base)));
  }
 }
 assert.equal(Object.values(meta.sequences).reduce((sum,f)=>sum+f.length,0),128);
});
