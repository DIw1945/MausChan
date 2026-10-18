import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {WORLD,START,MUMMY_ZONE,collides,updatePlayer} from '../dist/core.mjs';
import {createHealth,updateProjectiles} from '../dist/health.mjs';
import {createCombat,pressAttack,resolveHits} from '../dist/combat.mjs';
import {createSwordFire,emitSwordFire,updateSwordFire} from '../dist/fire.mjs';
import {createBombs,advanceBombs,BOMB} from '../dist/bombs.mjs';
import {createNitro,rollNitroDrop} from '../dist/nitro.mjs';
import {MUMMY,MUMMY_DIRECTIONS,createMummies,mummyPopulation,insideMummyYard,advanceMummies,advanceMummyEffects,handleMummyDefeats,fireBandage,advanceBandages,mummyAtlasFrame} from '../dist/mummies.mjs';

function setup(distance=110){
  const s=createMummies(),h=createHealth();advanceMummies(s,.6,START,h);const e=s.entities[0];
  s.entities=[e];s.points.forEach(point=>point.timer=1e6);
  Object.assign(e,{x:430,y:-330,spawnShield:0,age:10,meleeCooldown:0,castCooldown:0});
  const p={x:e.x+distance,y:e.y,facing:'left'};return{s,h,e,p};
}

test('north gate is walkable in both directions; old spawn, east/west gates and world bottom remain stable',()=>{
  assert.equal(WORLD.top,-640);assert.equal(WORLD.top+WORLD.height,768);assert.deepEqual(START,{x:468,y:408});
  const p={x:440,y:200,facing:'up'};updatePlayer(p,{x:0,y:-1},4.5);assert.ok(insideMummyYard(p));assert.ok(p.y<-200);
  updatePlayer(p,{x:0,y:1},4.5);assert.ok(Math.abs(p.y-200)<.01);
  assert.equal(collides(300,30),true);assert.equal(collides(600,30),true);assert.equal(collides(210,-330),true);
  assert.equal(collides(20,400),false);assert.equal(collides(1000,400),false);
});

test('exactly two spawn points fill to two living mummies each and refill deaths with unique IDs',()=>{
  const s=createMummies(),h=createHealth();assert.equal(s.points.length,2);
  for(let i=0;i<800;i++){advanceMummies(s,.05,START,h);for(const point of s.points)assert.ok(mummyPopulation(s,point.id)<=2);}
  assert.equal(mummyPopulation(s),4);assert.ok(s.entities.every(e=>e.hp===200));
  const victim=s.entities[0];victim.hp=0;const event={id:victim.id,killed:true};handleMummyDefeats(s,[event,event]);assert.equal(s.kills,1);
  for(let i=0;i<140;i++)advanceMummies(s,.05,START,h);
  assert.equal(mummyPopulation(s),4);assert.ok(!s.entities.includes(victim));assert.equal(new Set(s.entities.map(e=>e.id)).size,s.entities.length);
  assert.ok(s.entities.every(e=>e.id.startsWith('mummy-')));
});

test('spawns avoid the player and blocked ground, and pausing freezes all mummy state',()=>{
  const s=createMummies(),h=createHealth();advanceMummies(s,.6,s.points[0],h);assert.ok(s.entities.every(e=>Math.hypot(e.x-s.points[0].x,e.y-s.points[0].y)>=42));
  const empty=createMummies();advanceMummies(empty,10,START,h,{obstacles:[MUMMY_ZONE]});assert.equal(empty.entities.length,0);assert.equal(empty.nextId,1);
  const a=setup();fireBandage(a.s,a.e,a.p);const before=JSON.stringify(a.s);advanceMummies(a.s,100,a.p,a.h,{paused:true});assert.equal(JSON.stringify(a.s),before);
});

test('the same mummy telegraphs ranged bandages and a close scratch; scratches cost one heart only once',()=>{
  const a=setup();advanceMummies(a.s,.01,a.p,a.h);assert.equal(a.e.action,'cast');assert.ok(a.e.windup>0);assert.equal(a.s.shots.length,0);
  advanceMummies(a.s,.91,a.p,a.h);assert.equal(a.s.shots.length,1);assert.equal(a.h.hp,6);assert.equal(a.e.castCooldown,MUMMY.castCooldown);
  a.s.shots=[];a.e.recoverTime=0;a.p.x=a.e.x+30;
  advanceMummies(a.s,.01,a.p,a.h);assert.equal(a.e.action,'scratch');assert.equal(a.h.hp,6);
  assert.equal(advanceMummies(a.s,.66,a.p,a.h).playerHit,true);assert.equal(a.h.hp,4);
  for(let i=0;i<20;i++)advanceMummies(a.s,.05,a.p,a.h);assert.equal(a.h.hp,4);
});

test('dodging scratch windup, leaving the zone, and interrupting a cast avoid the attack',()=>{
  const a=setup(30);advanceMummies(a.s,.01,a.p,a.h);a.p.y+=90;advanceMummies(a.s,.66,a.p,a.h);assert.equal(a.h.hp,6);
  const b=setup();advanceMummies(b.s,.01,b.p,b.h);b.e.hitTime=0;advanceMummies(b.s,.05,b.p,b.h);assert.equal(b.e.windup,0);assert.equal(b.s.shots.length,0);
  const c=setup();advanceMummies(c.s,.01,c.p,c.h);advanceMummies(c.s,1,START,c.h);assert.equal(c.s.shots.length,0);assert.equal(c.e.windup,0);
});

test('linen projectiles are swept, non-homing, consume on hit, and respect invulnerability',()=>{
  const a=setup();const shot=fireBandage(a.s,a.e,a.p);assert.equal(Math.hypot(shot.vx,shot.vy),MUMMY.shotSpeed);
  assert.equal(advanceBandages(a.s,1,a.p,a.h),true);assert.equal(a.h.hp,5);assert.equal(a.s.shots.length,0);
  fireBandage(a.s,a.e,a.p);assert.equal(advanceBandages(a.s,1,a.p,a.h),false);assert.equal(a.h.hp,5);assert.equal(a.s.shots.length,0);
  const b=setup();fireBandage(b.s,b.e,b.p);b.p.y+=100;assert.equal(advanceBandages(b.s,2,b.p,b.h),false);assert.equal(b.h.hp,6);assert.equal(b.s.shots.length,0);
});

test('walls block casting and cloth; shots expire at range, stay in the yard and cease during restraint or death',()=>{
  const a=setup(),wall={x:475,y:-380,w:12,h:100};advanceMummies(a.s,.01,a.p,a.h,{obstacles:[wall]});assert.equal(a.e.windup,0);
  fireBandage(a.s,a.e,a.p);assert.equal(advanceBandages(a.s,1,a.p,a.h,{obstacles:[wall]}),false);assert.equal(a.s.shots.length,0);
  fireBandage(a.s,a.e,{x:760,y:-330});advanceBandages(a.s,5,START,a.h);assert.equal(a.s.shots.length,0);
  a.e.x=740;fireBandage(a.s,a.e,{x:900,y:-330});advanceBandages(a.s,1,START,a.h);assert.equal(a.s.shots.length,0);
  for(const options of [{restrained:true},{}]){a.h.dead=!options.restrained;fireBandage(a.s,a.e,a.p);advanceMummies(a.s,.1,a.p,a.h,options);assert.equal(a.s.shots.length,0);assert.equal(a.e.windup,0);}
});

test('mummies walk slowly with four facings, obey collision and remain inside their own arena',()=>{
  const a=setup();a.e.castCooldown=1e6;const start=a.e.x;
  for(let i=0;i<20;i++)advanceMummies(a.s,.05,a.p,a.h);assert.ok(a.e.x>start&&a.e.x<=start+MUMMY.speed+.001);assert.equal(a.e.facing,'right');
  for(let i=0;i<800;i++)advanceMummies(a.s,.05,START,a.h);
  assert.ok(a.s.entities.every(e=>insideMummyYard(e)));assert.equal(a.h.hp,6);
  const b=setup();b.e.castCooldown=1e6;const wall={x:445,y:-400,w:10,h:150};for(let i=0;i<40;i++)advanceMummies(b.s,.05,b.p,b.h,{obstacles:[wall]});assert.ok(b.e.x<=432);
});

test('swords share one-hit history with fire, mummies take bombs, and defeat uses the rare-drop hook once',()=>{
  const a=setup(),c=createCombat(),p={x:a.e.x-30,y:a.e.y,facing:'right'};pressAttack(c,'right');c.time=.1;
  const hits=resolveHits(c,p,[a.e]);assert.equal(hits.length,1);assert.equal(a.e.hp,180);assert.equal(resolveHits(c,p,[a.e]).length,0);
  const f=createSwordFire();emitSwordFire(f,c,p,a.h);assert.equal(updateSwordFire(f,.2,[a.e],c.stats).length,0);assert.equal(a.e.hp,180);
  const b=createBombs();b.placed=[{id:1,x:a.e.x,y:a.e.y,time:0}];a.p={...START};const blast=advanceBombs(b,BOMB.fuse,[a.e],c.stats,a.p,a.h);
  assert.equal(a.e.hp,0);assert.equal(blast.hits.length,1);assert.equal(blast.hits[0].killed,true);
  handleMummyDefeats(a.s,blast.hits);handleMummyDefeats(a.s,blast.hits);assert.equal(a.s.kills,1);
  const nitro=createNitro(),before=nitro.drops.length;rollNitroDrop(nitro,blast.hits[0],()=>0);rollNitroDrop(nitro,blast.hits[0],()=>0);assert.equal(nitro.drops.length,before+1);
  advanceMummyEffects(a.s,1);assert.equal(a.s.entities.length,0);assert.equal(createMummies().entities.length,0);
});

test('fire waves and ordinary projectiles operate above the old y=0 boundary',()=>{
  const a=setup(),p={x:440,y:-220,facing:'up'},c=createCombat();Object.assign(a.e,{x:440,y:-300});pressAttack(c,'up');c.time=.1;
  const f=createSwordFire();assert.equal(emitSwordFire(f,c,p,a.h),true);assert.equal(updateSwordFire(f,.5,[a.e],c.stats).length,1);assert.equal(a.e.hp,180);
  const h=createHealth(),bullets=[{x:470,y:-240,vx:0,vy:-110,age:0,damage:1}];assert.equal(updateProjectiles(bullets,1,{x:470,y:-300,facing:'down'},h),true);assert.equal(h.hp,5);
});

test('all four facings select distinct walking, scratching and casting frames, including recovery',()=>{
  const a=setup();for(const [row,direction] of MUMMY_DIRECTIONS.entries()){
    a.e.facing=direction;Object.assign(a.e,{windup:0,recoverTime:0,moving:true,walkTime:.2});assert.equal(mummyAtlasFrame(a.e),row*12+1);
    for(const [action,offset,time] of [['scratch',4,MUMMY.meleeWindup],['cast',8,MUMMY.castWindup]]){
      Object.assign(a.e,{action,windup:time,recoverTime:0});assert.equal(mummyAtlasFrame(a.e),row*12+offset);
      Object.assign(a.e,{windup:0,recoverTime:.2});assert.equal(mummyAtlasFrame(a.e),row*12+offset+3);
    }
  }
});

test('generated art includes 48 distinct mummy poses and four linen frames with complete sources',()=>{
  const base=new URL('../dist/assets/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('mummy-v18-atlas.json',base)));
  assert.deepEqual(meta.directions,MUMMY_DIRECTIONS);assert.equal(meta.sequences.mummy.length,48);assert.equal(meta.sequences.bandage.length,4);
  for(const name of meta.sources)assert.ok(fs.existsSync(new URL(name,base)));
  const hashes=[];
  for(const f of meta.sequences.mummy){
    const png=fs.readFileSync(new URL(f.file,base));assert.equal(png.readUInt32BE(16),160);assert.equal(png.readUInt32BE(20),160);assert.equal(png[25],6);
    assert.deepEqual(f.anchor,[80,112]);assert.ok(f.sourceBounds[2]>f.sourceBounds[0]);assert.equal(f.facing,MUMMY_DIRECTIONS[Math.floor(hashes.length/12)]);
    hashes.push(crypto.createHash('sha256').update(png).digest('hex'));
  }
  assert.equal(new Set(hashes).size,48);
});
