import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {WORLD,START,SPIDER_ZONE,TRAINING_ZONE,collides,updatePlayer} from '../dist/core.mjs';
import {createHealth,advanceHealth,updateProjectiles} from '../dist/health.mjs';
import {createCombat,resolveHits} from '../dist/combat.mjs';
import {createSwordFire,emitSwordFire,updateSwordFire} from '../dist/fire.mjs';
import {createBombs,advanceBombs,BOMB} from '../dist/bombs.mjs';
import {SLIME,createSlimes,createSticky,advanceSlimes,addSticky} from '../dist/slimes.mjs';
import {SPIDER,SPIDER_TYPES,WEB,createSpiders,createWebbed,insideSpiderYard,spiderPopulation,advanceSpiderSpawns,advanceSpiders,advanceSpiderEffects,handleSpiderDefeats,fireWeb,advanceWebShots,addWebbed,advanceWebbed,struggleWebbed,webbedFrame,webShotFrame,spiderFrame} from '../dist/spiders.mjs';

function setup(type='weaver'){
  const s=createSpiders(),h=createHealth(),w=createWebbed(),p={x:-370,y:260,facing:'left'};
  advanceSpiderSpawns(s,.5,START);const e=s.entities[0];s.entities=[e];s.points.forEach(p=>p.timer=100);
  Object.assign(e,{type,radius:SPIDER_TYPES[type].radius,hp:SPIDER_TYPES[type].hp,maxHP:SPIDER_TYPES[type].hp,x:-470,y:260,spawnShield:0,attackCooldown:0});return{s,h,w,p,e};
}
function directShot(a){a.s.shots=[{id:'test',x:a.p.x,y:a.p.y-20,vx:0,vy:0,age:0,travelled:0}];return advanceWebShots(a.s,0,a.p,a.h,a.w);}

test('west spider yard connects to the old yard while original positions and east Slime zone remain stable',()=>{
  assert.equal(WORLD.left,-640);assert.equal(WORLD.left+WORLD.width,1664);assert.equal(WORLD.top+WORLD.height,768);assert.deepEqual(START,{x:468,y:408});assert.equal(TRAINING_ZONE.x,1048);
  assert.equal(collides(20,400),false);assert.equal(collides(20,300),true);assert.equal(collides(-620,400),true);
  const p={x:80,y:400,facing:'left'};updatePlayer(p,{x:-1,y:0},2);assert.ok(insideSpiderYard(p));
});
test('four spider nests continuously refill to two enemies each with separate, unique monster IDs',()=>{
  const s=createSpiders();for(let i=0;i<600;i++){advanceSpiderSpawns(s,.1,START);assert.ok(s.points.every(p=>spiderPopulation(s,p.id)<=2));}
  assert.equal(spiderPopulation(s),8);assert.deepEqual(new Set(s.entities.map(e=>e.type)),new Set(['weaver','hunter']));
  const e=s.entities[0];e.hp=0;const event={id:e.id,killed:true};handleSpiderDefeats(s,[event,event]);assert.equal(s.kills,1);
  for(let i=0;i<60;i++)advanceSpiderSpawns(s,.1,START);assert.equal(spiderPopulation(s),8);assert.equal(new Set(s.entities.map(e=>e.id)).size,s.entities.length);assert.ok(s.entities.every(e=>e.id.startsWith('spider-')));
});
test('spawns avoid the player, refuse blocked ground, and spend no ID when paused or blocked',()=>{
  const s=createSpiders();advanceSpiderSpawns(s,1,s.points[0]);assert.ok(s.entities.every(e=>Math.hypot(e.x-s.points[0].x,e.y-s.points[0].y)>=e.radius+28));
  const empty=createSpiders();advanceSpiderSpawns(empty,10,START,{obstacles:[{...SPIDER_ZONE}]});assert.equal(empty.entities.length,0);assert.equal(empty.nextId,1);
  const before=JSON.stringify(s);advanceSpiderSpawns(s,10,START,{paused:true});assert.equal(JSON.stringify(s),before);
});
test('web weavers visibly wind up before launching aimed projectiles, then respect a cooldown',()=>{
  const a=setup();advanceSpiders(a.s,.01,a.p,a.h,a.w);assert.ok(a.e.windup>0);assert.equal(a.s.shots.length,0);
  advanceSpiders(a.s,.79,a.p,a.h,a.w);assert.equal(a.s.shots.length,0);advanceSpiders(a.s,.02,a.p,a.h,a.w);assert.equal(a.s.shots.length,1);assert.equal(a.h.hp,6);
  const shot=a.s.shots[0];assert.ok(shot.vx>0);assert.ok(Math.abs(Math.hypot(shot.vx,shot.vy)-WEB.speed)<.001);assert.equal(a.e.attackCooldown,SPIDER_TYPES.weaver.cooldown);
});
test('a wall blocks aimed casting and moving out of the yard cancels the attack at release',()=>{
  const a=setup(),wall={x:-430,y:200,w:20,h:100};advanceSpiders(a.s,.01,a.p,a.h,a.w,{obstacles:[wall]});assert.equal(a.e.windup,0);
  a.e.windup=.01;a.p={...START};advanceSpiders(a.s,.02,a.p,a.h,a.w);assert.equal(a.s.shots.length,0);
});
test('melee hunters wind up and deal half a heart without adding projectile-only Webbed buildup',()=>{
  const a=setup('hunter');a.e.x=a.p.x-25;advanceSpiders(a.s,.01,a.p,a.h,a.w);assert.ok(a.e.windup>0);assert.equal(a.h.hp,6);
  assert.equal(advanceSpiders(a.s,.61,a.p,a.h,a.w).playerHit,true);assert.equal(a.h.hp,5);assert.equal(a.w.amount,0);assert.equal(a.s.shots.length,0);
});
test('dodging a melee windup avoids damage and hitting a spider interrupts its cast',()=>{
  const a=setup('hunter');a.e.x=a.p.x-25;a.e.windup=.01;a.p.y+=80;advanceSpiders(a.s,.02,a.p,a.h,a.w);assert.equal(a.h.hp,6);
  a.e.type='weaver';a.e.windup=.4;a.e.hitTime=0;advanceSpiders(a.s,.05,a.p,a.h,a.w);assert.equal(a.e.windup,0);assert.equal(a.s.shots.length,0);
});
test('swept silk collision cannot tunnel through the player and adds 50 only on a real hit',()=>{
  const a=setup();fireWeb(a.s,a.e,a.p);const result=advanceWebShots(a.s,1.2,a.p,a.h,a.w);assert.equal(result.playerHit,true);assert.equal(a.h.hp,5);assert.equal(a.w.amount,50);assert.equal(a.s.shots.length,0);
  assert.equal(directShot(a).playerHit,false);assert.equal(a.w.amount,50);assert.equal(a.s.shots.length,0);
});
test('silk can be dodged, collides with scenery and rocks, expires by range and stays within its yard',()=>{
  const a=setup();fireWeb(a.s,a.e,a.p);a.p.y+=100;assert.equal(advanceWebShots(a.s,1.3,a.p,a.h,a.w).playerHit,false);assert.equal(a.h.hp,6);
  a.p.y-=100;a.s.shots=[];fireWeb(a.s,a.e,a.p);advanceWebShots(a.s,1,a.p,a.h,a.w,{obstacles:[{x:-430,y:200,w:20,h:100}]});assert.equal(a.s.shots.length,0);assert.equal(a.w.amount,0);
  fireWeb(a.s,a.e,{x:-80,y:260});advanceWebShots(a.s,4,{...START},a.h,a.w);assert.equal(a.s.shots.length,0);
  a.e.x=-70;fireWeb(a.s,a.e,START);advanceWebShots(a.s,1,START,a.h,a.w);assert.equal(a.s.shots.length,0);
});
test('two real web hits root at 100; time alone cannot escape the first tier or advance struggle progress',()=>{
  const a=setup();for(let i=0;i<2;i++){a.h.invulnerable=0;const r=directShot(a);assert.equal(r.bound,i===1);}
  assert.equal(a.w.bound,true);assert.equal(a.w.amount,100);assert.equal(a.h.hp,4);advanceWebbed(a.w,999);assert.equal(a.w.bound,true);assert.equal(a.w.presses,0);assert.equal(a.w.tier,1);
});
test('partial silk decays after eight quiet seconds and a new hit resets that quiet period',()=>{
  const w=createWebbed();addWebbed(w,50);advanceWebbed(w,7);assert.equal(w.amount,50);advanceWebbed(w,2);assert.equal(w.amount,45);addWebbed(w,10);advanceWebbed(w,8);assert.equal(w.amount,55);advanceWebbed(w,100);assert.equal(w.amount,0);
});
test('Webbed requires 28 distinct presses, more than slime, ignores repeats, and grants escape grace',()=>{
  const a=setup();addWebbed(a.w,100);assert.ok(WEB.escapePresses>SLIME.escapePresses);for(let i=0;i<50;i++)struggleWebbed(a.w,a.h,{repeat:true});assert.equal(a.w.presses,0);
  for(let i=0;i<27;i++)assert.equal(struggleWebbed(a.w,a.h),false);assert.equal(a.w.bound,true);assert.equal(struggleWebbed(a.w,a.h),true);assert.equal(a.w.bound,false);assert.equal(a.w.amount,0);assert.ok(a.h.invulnerable>=1.5);
  addWebbed(a.w,100);a.h.dead=true;assert.equal(struggleWebbed(a.w,a.h),false);assert.equal(a.w.presses,0);
});
test('spiders keep attacking rooted players, adding tier-two silk instead of removing HP',()=>{
  const a=setup('hunter');a.e.x=a.p.x-25;addWebbed(a.w,100);a.w.presses=7;fireWeb(a.s,a.e,a.p);a.e.windup=.01;
  for(let i=0;i<250;i++){advanceWebbed(a.w,.05,a.h);advanceSpiders(a.s,.05,a.p,a.h,a.w);}assert.equal(a.h.hp,6);assert.equal(a.w.tier,1);assert.equal(a.w.presses,7);
  for(let i=0;i<250&&a.w.tier===1;i++){advanceWebbed(a.w,.05,a.h);advanceSpiders(a.s,.05,a.p,a.h,a.w);}assert.equal(a.h.hp,6);assert.equal(a.w.presses,0);assert.equal(a.w.tier,2);assert.ok(a.w.remaining>0);assert.equal(a.w.bound,true);
});
test('slime binding suppresses spider attacks and web binding suppresses Slime attacks without mixing states',()=>{
  const a=setup();fireWeb(a.s,a.e,a.p);a.e.windup=.01;advanceSpiders(a.s,1,a.p,a.h,a.w,{restrained:true});assert.equal(a.h.hp,6);assert.equal(a.w.amount,0);assert.equal(a.s.shots.length,0);
  const s=createSlimes(),g=createSticky();addSticky(g,100);advanceSlimes(s,10,{x:1150,y:260,facing:'down'},a.h,{bound:true});assert.equal(a.h.hp,6);assert.equal(g.presses,0);
});
test('Nitro pause freezes all spider movement, spawn timers, casting and projectiles',()=>{
  const a=setup();fireWeb(a.s,a.e,a.p);a.e.windup=.5;const before=JSON.stringify(a.s);advanceSpiders(a.s,10,a.p,a.h,a.w,{paused:true});assert.equal(JSON.stringify(a.s),before);assert.equal(a.w.amount,0);
});
test('spiders remain inside their arena and never chase into the original hub or slime arena',()=>{
  const a=setup();for(let i=0;i<1200;i++)advanceSpiders(a.s,.05,START,a.h,a.w);assert.ok(a.s.entities.every(insideSpiderYard));assert.equal(a.h.hp,6);assert.equal(a.s.shots.length,0);
});
test('swords hit spiders once per attack; shielded newly spawned enemies ignore that strike',()=>{
  const a=setup('hunter'),c=createCombat();a.e.x=a.p.x-25;c.state='slash';c.time=.1;c.facing='left';assert.equal(resolveHits(c,a.p,[a.e]).length,1);assert.equal(a.e.hp,40);assert.equal(resolveHits(c,a.p,[a.e]).length,0);
  c.hitIds.clear();a.e.spawnShield=SPIDER.spawnGrace;assert.equal(resolveHits(c,a.p,[a.e]).length,0);
});
test('full-heart fire works at negative west coordinates and bombs report real spider kills once',()=>{
  for(const weapon of ['fire','bomb']){
    const a=setup(),c=createCombat();a.e.x=a.p.x-40;a.e.hp=20;
    let hits;if(weapon==='fire'){c.state='slash';c.time=.1;c.facing='left';const fire=createSwordFire();emitSwordFire(fire,c,a.p,a.h);hits=updateSwordFire(fire,.2,[a.e],c.stats);}
    else{const b=createBombs();b.placed=[{id:1,x:a.e.x,y:a.e.y,time:0}];a.p.x=-100;hits=advanceBombs(b,BOMB.fuse,[a.e],c.stats,a.p,a.h).hits;}
    assert.equal(hits.length,1);assert.equal(hits[0].killed,true);handleSpiderDefeats(a.s,hits);handleSpiderDefeats(a.s,hits);assert.equal(a.s.kills,1);
  }
});
test('negative-coordinate projectiles remain valid, while the right world edge remains unchanged',()=>{
  const h=createHealth(),p={x:-300,y:400,facing:'down'},bullets=[{x:-300,y:360,vx:0,vy:110,age:0}];assert.equal(updateProjectiles(bullets,.2,p,h),true);assert.equal(h.hp,5);
  const outside=[{x:1663,y:680,vx:20,vy:0,age:0}];updateProjectiles(outside,.2,START,createHealth());assert.equal(outside.length,0);
});
test('defeat effects finish without spawning, and fresh state clears webs, shots and monsters',()=>{
  const a=setup();a.e.hp=0;handleSpiderDefeats(a.s,[{id:a.e.id,killed:true}]);advanceSpiderEffects(a.s,1);assert.equal(a.s.entities.length,0);assert.equal(createSpiders().entities.length,0);assert.equal(createSpiders().shots.length,0);assert.deepEqual(createWebbed(),{amount:0,bound:false,tier:0,presses:0,quiet:0,time:0,reinforcement:0,hitGrace:0,remaining:0,failed:false});
});
test('all generated animation indices remain bounded and Webbed uses every pose at 8fps',()=>{
  assert.equal(WEB.fps,8);assert.equal(webbedFrame(1.49),11);assert.equal(webbedFrame(1.5),0);
  for(let i=0;i<1000;i++){const t=i/37;assert.ok(webbedFrame(t)>=0&&webbedFrame(t)<12);assert.ok(webShotFrame(t)>=0&&webShotFrame(t)<4);for(const type of Object.keys(SPIDER_TYPES))assert.ok(spiderFrame({age:t,windup:0,type})<8);}
});
test('32 generated spider/web frames retain source art, complete bounds and fixed body/head anchors',()=>{
  const base=new URL('../dist/assets/',import.meta.url),m=JSON.parse(fs.readFileSync(new URL('spiders-v12-atlas.json',base)));assert.ok(m.sources.every(s=>fs.existsSync(new URL(s,base))));assert.equal(m.webbedAnimation.fps,WEB.fps);
  for(const [name,count,size,anchor] of [['spider-weaver',8,96,[48,64]],['spider-hunter',8,96,[48,64]],['web-shot',4,32,[16,16]],['burnice-webbed',12,160,[80,112]]]){
    assert.equal(m.sequences[name].length,count);for(const f of m.sequences[name]){const png=fs.readFileSync(new URL(f.image,base));assert.equal(f.w,size);assert.deepEqual(f.anchor,anchor);assert.ok(f.x+f.w<=png.readUInt32BE(16)&&f.y+f.h<=png.readUInt32BE(20));assert.ok(fs.existsSync(new URL(f.file,base)));}
  }
  assert.equal(new Set(m.sequences['burnice-webbed'].map(f=>crypto.createHash('sha256').update(fs.readFileSync(new URL(f.file,base))).digest('hex'))).size,12);assert.ok(m.webbedCalibration.headWidths.every(w=>w===40));assert.ok(Math.max(...m.webbedCalibration.bodyLengths)-Math.min(...m.webbedCalibration.bodyLengths)<=3);
});
