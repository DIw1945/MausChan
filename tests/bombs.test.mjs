import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BOMB,BOMB_SAMPLES,createBombs,rockObstacles,canUseBomb,collectBombs,placeBomb,advanceBombs,advanceBombEffects,bombFuseFrame,bombBlastFrame,rockBreakFrame} from '../dist/bombs.mjs';
import {collides,updatePlayer} from '../dist/core.mjs';
import {createHealth,receiveDamage,advanceHealth,updateProjectiles} from '../dist/health.mjs';
import {createCombat,createDummies,resolveHits} from '../dist/combat.mjs';
import {createSwordFire,emitSwordFire,updateSwordFire} from '../dist/fire.mjs';

const player=()=>({x:450,y:420,facing:'down'});
const setup=()=>({b:createBombs(),p:player(),h:createHealth(),c:createCombat(),d:createDummies()});
const advance=(s,dt,options)=>advanceBombs(s.b,dt,s.d,s.c.stats,s.p,s.h,options);

test('three bomb pickups give one item each, once, and wait during Nitro or defeat',()=>{
  const {b,p,h}=setup();assert.equal(b.count,0);assert.equal(b.drops.length,3);assert.equal(collectBombs(b,p,h),0);
  const [x,y]=BOMB_SAMPLES[0];assert.equal(collectBombs(b,{x,y},h,true),0);assert.equal(collectBombs(b,{x,y},{...h,dead:true}),0);
  assert.equal(collectBombs(b,{x,y},h),1);assert.equal(collectBombs(b,{x,y},h),0);assert.equal(b.count,1);
});
test('placement consumes exactly one bomb and uses the current facing in all four directions',()=>{
  for(const [facing,dx,dy] of [['down',0,24],['up',0,-24],['left',-24,0],['right',24,0]]){
    const {b,p,h}=setup();b.count=2;p.facing=facing;const bomb=placeBomb(b,p,h);
    assert.ok(bomb);assert.deepEqual([bomb.x,bomb.y],[p.x+dx,p.y+dy]);assert.equal(b.count,1);
    assert.equal(placeBomb(b,p,h),null);assert.equal(b.count,1);
  }
});
test('empty, hurt, dead, Nitro and blocked placements never spend inventory',()=>{
  const {b,p,h}=setup();assert.equal(canUseBomb(b,h),false);b.count=3;
  for(const health of [{...h,hurtTime:.1},{...h,dead:true},{...h,hp:0}])assert.equal(placeBomb(b,p,health),null);
  assert.equal(placeBomb(b,p,h,{usingNitro:true}),null);
  assert.equal(placeBomb(b,{x:542,y:430,facing:'up'},h),null);
  assert.equal(placeBomb(b,{x:548,y:300,facing:'right'},h),null);
  assert.equal(placeBomb(b,p,h,{obstacles:[{x:440,y:435,w:20,h:20}]}),null);assert.equal(b.count,3);
});
test('fuse waits 2.2 seconds, then hits each target exactly once for 180 damage',()=>{
  const s=setup();s.b.count=1;placeBomb(s.b,s.p,s.h);s.p={x:800,y:600,facing:'up'};
  assert.equal(advance(s,BOMB.fuse-.01).exploded,0);assert.equal(s.d[0].hp,300);
  const result=advance(s,.01);assert.equal(result.exploded,1);assert.equal(s.d[0].hp,120);assert.equal(s.b.placed.length,0);assert.equal(s.b.blasts.length,1);
  assert.equal(result.hits[0].kind,'bomb');const total=s.c.stats.total;
  for(let i=0;i<40;i++)advance(s,.02);assert.equal(s.c.stats.total,total);assert.equal(s.d[0].hp,120);assert.equal(s.b.blasts.length,0);
});
test('blast hits in a circle, including all directions, and leaves targets outside its radius alone',()=>{
  const s=setup();s.b.placed=[{id:1,x:450,y:420,time:0}];s.p={x:800,y:600,facing:'up'};
  const positions=[[80,0],[-80,0],[0,80],[0,-80],[60,60],[80,80]];
  s.d=positions.map(([x,y],i)=>({...createDummies()[0],id:i+1,x:450+x,y:420+y,radius:0}));
  assert.equal(advance(s,BOMB.fuse).hits.length,5);assert.deepEqual(s.d.map(d=>d.hp),[120,120,120,120,120,300]);
});
test('brittle rocks block walking and knockback, then lose collision immediately on blast and finish crumbling',()=>{
  const s=setup(),rock=s.b.rocks[0];assert.equal(collides(rock.x,rock.y,rockObstacles(s.b)),true);
  const p={x:rock.x-40,y:rock.y,facing:'right'};updatePlayer(p,{x:1,y:0},.5,{obstacles:rockObstacles(s.b)});assert.ok(p.x<rock.x-22);
  const knocked={x:rock.x-40,y:rock.y,facing:'right'},hurt=createHealth();receiveDamage(hurt,knocked,{vx:110,vy:0});
  for(let i=0;i<12;i++)advanceHealth(hurt,knocked,1/60,rockObstacles(s.b));assert.ok(knocked.x<rock.x-22-7);
  s.b.placed=[{id:1,x:rock.x-35,y:rock.y+30,time:0}];s.p={x:800,y:600,facing:'up'};
  const result=advance(s,BOMB.fuse);assert.ok(result.broken.includes(rock));assert.equal(rock.state,'breaking');assert.equal(collides(rock.x,rock.y,rockObstacles(s.b)),false);
  updatePlayer(p,{x:1,y:0},.5,{obstacles:rockObstacles(s.b)});assert.ok(p.x>rock.x);
  advance(s,BOMB.breakDuration);assert.equal(rock.state,'gone');
});
test('swords, spins and full-heart fire cannot destroy rocks or hit targets through them',()=>{
  const s=setup(),rock=s.b.rocks[0],obstacles=rockObstacles(s.b);s.p={x:rock.x-35,y:rock.y,facing:'right'};
  s.d=[{...s.d[0],x:rock.x+10,y:rock.y}];
  for(const state of ['slash','spin']){s.c.state=state;s.c.time=.1;s.c.facing='right';assert.equal(resolveHits(s.c,s.p,s.d,obstacles).length,0);}
  s.c.state='slash';s.c.id++;const fire=createSwordFire();emitSwordFire(fire,s.c,s.p,s.h);assert.equal(updateSwordFire(fire,.5,s.d,s.c.stats,obstacles).length,0);assert.equal(fire.waves.length,0);
  assert.equal(s.d[0].hp,300);assert.equal(rock.state,'intact');
});
test('rocks also stop shooter projectiles before they can hit a player behind them',()=>{
  const s=setup(),rock=s.b.rocks[0];s.p={x:rock.x+45,y:rock.y+15,facing:'left'};
  const bullets=[{x:rock.x-45,y:rock.y-5,vx:110,vy:0,age:0,damage:1}];
  assert.equal(updateProjectiles(bullets,1,s.p,s.h,rockObstacles(s.b)),false);assert.equal(bullets.length,0);assert.equal(s.h.hp,6);
});
test('standing in own blast costs one heart once and respects existing invulnerability',()=>{
  const s=setup();s.b.count=1;placeBomb(s.b,s.p,s.h);assert.equal(advance(s,BOMB.fuse).playerHit,true);assert.equal(s.h.hp,4);
  advance(s,.1);assert.equal(s.h.hp,4);
  s.b.placed=[{id:2,x:s.p.x,y:s.p.y,time:0}];assert.equal(advance(s,BOMB.fuse).playerHit,false);assert.equal(s.h.hp,4);
});
test('explosion and crumble effects finish after a lethal self-blast, without advancing other fuses',()=>{
  const s=setup();s.h.hp=2;s.b.count=1;placeBomb(s.b,s.p,s.h);advance(s,BOMB.fuse);assert.equal(s.h.dead,true);assert.equal(s.b.blasts.length,1);
  s.b.placed.push({id:2,x:400,y:400,time:.3});s.b.rocks[0].state='breaking';s.b.rocks[0].age=0;
  advanceBombEffects(s.b,1);assert.equal(s.b.blasts.length,0);assert.equal(s.b.rocks[0].state,'gone');assert.equal(s.b.placed[0].time,.3);
});
test('Nitro pause preserves fuses, blast/rock animation ages and health until play resumes',()=>{
  const s=setup();s.b.count=1;placeBomb(s.b,s.p,s.h);s.b.blasts.push({x:0,y:0,age:.1});s.b.rocks[0].state='breaking';s.b.rocks[0].age=.1;
  const before=JSON.stringify(s.b);assert.equal(advance(s,5,{paused:true}).exploded,0);assert.equal(JSON.stringify(s.b),before);assert.equal(s.h.hp,6);
  assert.equal(advance(s,BOMB.fuse).exploded,1);
});
test('independent bombs each damage once, report one death event, and a fresh game restores rocks and pickups',()=>{
  const s=setup();s.p={x:800,y:600,facing:'up'};s.b.placed=[{id:1,x:460,y:460,time:0},{id:2,x:460,y:460,time:0}];
  const result=advance(s,10);assert.equal(result.exploded,2);assert.equal(s.d[0].hp,0);assert.equal(result.hits.filter(h=>h.id===s.d[0].id&&h.killed).length,1);
  const fresh=createBombs();assert.equal(fresh.count,0);assert.equal(fresh.placed.length,0);assert.equal(fresh.blasts.length,0);assert.equal(fresh.drops.length,3);assert.ok(fresh.rocks.every(r=>r.state==='intact'));
});
test('bomb, blast and break animation frames stay bounded',()=>{
  for(const t of [-1,0,.01,.2,.6,1,2,10,100]){assert.ok(bombFuseFrame(t)>=1&&bombFuseFrame(t)<=3);assert.ok(bombBlastFrame(t)>=0&&bombBlastFrame(t)<=7);assert.ok(rockBreakFrame(t)>=0&&rockBreakFrame(t)<=7);}
});
test('all 20 generated bomb/rock frames have complete atlas bounds and preserved source art',()=>{
  const base=new URL('../dist/assets/',import.meta.url),m=JSON.parse(fs.readFileSync(new URL('bombs-v9-atlas.json',base)));
  assert.ok(fs.existsSync(new URL(m.source,base)));assert.deepEqual(m.grid,[4,5]);
  for(const [name,count,size,anchor] of [['bomb',4,64,[32,50]],['bomb-blast',8,192,[96,96]],['brittle-rock',8,96,[48,76]]]){
    assert.equal(m.sequences[name].length,count);
    for(const f of m.sequences[name]){const png=fs.readFileSync(new URL(f.image,base));assert.equal(f.w,size);assert.equal(f.h,size);assert.deepEqual(f.anchor,anchor);assert.ok(f.x+size<=png.readUInt32BE(16));assert.ok(f.y+size<=png.readUInt32BE(20));assert.ok(fs.existsSync(new URL(f.file,base)));}
  }
});
