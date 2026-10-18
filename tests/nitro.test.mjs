import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {NITRO,NITRO_CUP,createNitro,collectNitro,canUseNitro,startNitro,advanceNitro,nitroPose,rollNitroDrop,heartAmount} from '../dist/nitro.mjs';
import {createHealth} from '../dist/health.mjs';
import {createCombat,pressAttack,resolveHits,hitDummy} from '../dist/combat.mjs';
import {createSwordFire,emitSwordFire} from '../dist/fire.mjs';

test('yard sample is outside spawn pickup range and gives exactly one item, once',()=>{
 const n=createNitro(),h=createHealth();assert.equal(n.count,0);assert.equal(n.drops.length,1);
 assert.equal(collectNitro(n,{x:468,y:408},h),0);assert.equal(collectNitro(n,NITRO.sample,h),1);assert.equal(n.count,1);assert.equal(n.drops.length,0);
 assert.equal(collectNitro(n,NITRO.sample,h),0);assert.equal(n.count,1);
});
test('pickups wait while drinking or defeated, and separate drops each add one',()=>{
 const n=createNitro(),h=createHealth();n.active=true;assert.equal(collectNitro(n,NITRO.sample,h),0);n.active=false;h.dead=true;assert.equal(collectNitro(n,NITRO.sample,h),0);
 h.dead=false;n.drops.push({id:1,...NITRO.sample});assert.equal(collectNitro(n,NITRO.sample,h),2);assert.equal(n.count,2);
});
test('using consumes one item once; empty, full-health, hurt and dead states cannot waste it',()=>{
 for(const changes of [{},{hurtTime:.2,hp:3},{dead:true,hp:0}]){const n=createNitro(),h={...createHealth(),...changes};n.count=1;assert.equal(startNitro(n,h),false);assert.equal(n.count,1);}
 const n=createNitro(),h={...createHealth(),hp:2};assert.equal(startNitro(n,h),false);n.count=2;assert.equal(canUseNitro(n,h),true);assert.equal(startNitro(n,h),true);assert.equal(n.count,1);assert.equal(startNitro(n,h),false);assert.equal(n.count,1);assert.equal(h.hp,2);
});
test('all 48 poses play across fetch, sip and cheerful raise, with sparkle only once the cup is high',()=>{
 for(const [start,duration,stage] of [[0,1.2,'fetch'],[1.2,2,'sip'],[3.2,1.4,'cheer']]){
  const frames=[];for(let i=0;i<16;i++){const p=nitroPose(start+(i+.1)/16*duration);assert.equal(p.stage,stage);frames.push(p.frame);}
  assert.deepEqual(frames,Array.from({length:16},(_,i)=>i));
 }
 assert.equal(nitroPose(3.3).sparkle,false);assert.equal(nitroPose(4.1).sparkle,true);assert.equal(nitroPose(20).frame,15);assert.equal(NITRO.duration,4.6);
});
test('healing waits until the entire 4.6-second animation ends and restores two hearts capped at max',()=>{
 for(let hp=1;hp<6;hp++){
  const n=createNitro(),h={...createHealth(),hp};n.count=1;startNitro(n,h);
  assert.equal(advanceNitro(n,h,4.59),0);assert.equal(h.hp,hp);assert.equal(n.active,true);
  const healed=advanceNitro(n,h,.01);assert.equal(healed,Math.min(4,6-hp));assert.equal(h.hp,Math.min(hp+4,6));assert.equal(n.active,false);assert.equal(n.count,0);
  assert.equal(advanceNitro(n,h,5),0);assert.equal(h.hp,Math.min(hp+4,6));
 }
});
test('cancellation on death cannot resurrect; fresh game state restores just the placed sample',()=>{
 const n=createNitro(),h={...createHealth(),hp:1};n.count=1;startNitro(n,h);h.dead=true;h.hp=0;assert.equal(advanceNitro(n,h,5),0);assert.equal(h.hp,0);assert.equal(n.active,false);
 Object.assign(n,createNitro());assert.equal(n.count,0);assert.equal(n.drops.length,1);assert.equal(n.time,0);
});
test('rare loot rolls only on a defeat, at 5%, and a defeat event cannot be rolled twice',()=>{
 const n=createNitro();let rolls=0;const random=()=>{rolls++;return 0;};
 assert.equal(rollNitroDrop(n,{killed:false},random),false);assert.equal(rolls,0);
 const death={killed:true,targetX:300,targetY:400};assert.equal(rollNitroDrop(n,death,random),true);assert.equal(n.drops.length,2);assert.equal(n.drops[1].x,300);assert.equal(n.drops[1].y,418);
 assert.equal(rollNitroDrop(n,death,random),false);assert.equal(rolls,1);
 assert.equal(rollNitroDrop(n,{...death},()=>.05),false);assert.equal(rollNitroDrop(n,{...death},()=>.049999),true);
});
test('melee and ranged damage expose a real alive-to-defeated event for loot',()=>{
 const c=createCombat(),d={id:1,x:300,y:400,radius:12,hp:40,maxHP:300,hitTime:10,restoreTime:0,damageTotal:0,hits:0};
 const first=hitDummy(d,20,'fireSlash',c.stats);assert.equal(first.killed,false);
 const last=hitDummy(d,20,'fireSlash',c.stats);assert.equal(last.killed,true);assert.deepEqual([last.targetX,last.targetY],[300,400]);
 assert.equal(hitDummy(d,20,'slash',c.stats).killed,false);
 d.hp=20;c.state='slash';c.time=.1;c.facing='right';assert.equal(resolveHits(c,{x:270,y:400},[d])[0].killed,true);
});
test('healing back to full hearts restores fire-sword eligibility',()=>{
 const h={...createHealth(),hp:5},n=createNitro();n.count=1;startNitro(n,h);advanceNitro(n,h,4.6);
 const c=createCombat();pressAttack(c,'right');c.time=.1;assert.equal(emitSwordFire(createSwordFire(),c,{x:450,y:580},h),true);
 assert.deepEqual([1,2,3,4].map(heartAmount),['½','1','1½','2']);
});
test('generated Nitro art has 56 bounded frames, fixed anchors, matched body scale and tracked cup positions',()=>{
 const base=new URL('../dist/assets/',import.meta.url),m=JSON.parse(fs.readFileSync(new URL('corrected-v8-atlas.json',base)));
 for(const [name,count] of [['nitro-fetch',16],['nitro-sip',16],['nitro-cheer',16],['nitro-item',4],['nitro-sparkle',4]]){
  assert.equal(m.sequences[name].length,count);for(const f of m.sequences[name]){const p=fs.readFileSync(new URL(f.image,base));assert.ok(f.x+f.w<=p.readUInt32BE(16)&&f.y+f.h<=p.readUInt32BE(20));assert.ok(fs.existsSync(new URL(f.file,base)));if(f.w===160)assert.deepEqual(f.anchor,[80,112]);}
 }
 for(const c of Object.values(m.nitroCalibration)){assert.ok(c.bodyHeights.every(h=>Math.abs(h-54)<=1));assert.ok(c.headWidths.every(w=>Math.abs(w-40)<=1));}
 assert.deepEqual(m.sequences['nitro-cheer'].map(f=>f.cup),NITRO_CUP);assert.equal(Object.values(m.sequences).reduce((n,f)=>n+f.length,0),200);
});
