import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCombat,pressAttack,releaseAttack,advanceCombat,cancelAttack,resolveHits} from '../dist/combat.mjs';
import {createHealth} from '../dist/health.mjs';
import {FIRE,fullHearts,createSwordFire,emitSwordFire,updateSwordFire,waveFrame,ringPose} from '../dist/fire.mjs';
const dummy=(id,x,y)=>({id,x,y,radius:12,hp:300,maxHP:300,hitTime:10,restoreTime:0,damageTotal:0,hits:0});
const attack=(facing='right',spin=false)=>{const c=createCombat();pressAttack(c,facing);c.time=.1;if(spin)c.state='spin';return c;};

test('full hearts launch exactly one fire crescent per slash in all four facing directions',()=>{
 for(const [facing,dx,dy] of [['right',1,0],['left',-1,0],['up',0,-1],['down',0,1]]){
  const f=createSwordFire(),c=attack(facing),p={x:450,y:580},h=createHealth();
  assert.equal(emitSwordFire(f,c,p,h),true);assert.equal(f.waves.length,1);
  assert.ok(Math.abs(f.waves[0].dx-dx)<1e-9&&Math.abs(f.waves[0].dy-dy)<1e-9);
  for(let i=0;i<10;i++)assert.equal(emitSwordFire(f,c,p,h),false);
  assert.equal(f.waves.length,1);assert.equal(f.rings.length,0);
 }
});

test('rapid slashes wait for the live projectile to disappear and never queue a delayed wave',()=>{
 const f=createSwordFire(),c=attack(),p={x:450,y:580},h=createHealth();
 assert.equal(emitSwordFire(f,c,p,h),true);const old=f.waves[0];
 for(let i=0;i<5;i++){c.id++;c.hitIds=new Set();assert.equal(emitSwordFire(f,c,p,h),false);assert.deepEqual(f.waves,[old]);}
 updateSwordFire(f,2,[],c.stats);assert.equal(f.waves.length,0);
 assert.equal(emitSwordFire(f,c,p,h),false);
 c.id++;assert.equal(emitSwordFire(f,c,p,h),true);assert.equal(f.waves.length,1);
 // A collision frees the slot immediately as well.
 updateSwordFire(f,.2,[dummy(99,510,580)],c.stats);assert.equal(f.waves.length,0);
 c.id++;assert.equal(emitSwordFire(f,c,p,h),true);
});

test('spin keeps eight short rays, blocks follow-up slash waves, and leaves normal range unchanged',()=>{
 const f=createSwordFire(),c=attack('right',true),p={x:450,y:580},h=createHealth();
 emitSwordFire(f,c,p,h);const rays=[...f.waves];
 assert.equal(rays.length,8);assert.ok(rays.every(w=>w.range===80));
 c.id++;c.state='slash';assert.equal(emitSwordFire(f,c,p,h),false);
 const distant=dummy(99,600,580);updateSwordFire(f,1,[distant],c.stats);
 assert.equal(distant.hp,300);assert.equal(f.waves.length,0);
 assert.ok(rays.every(w=>w.travelled<=80+.001));
 c.id++;assert.equal(emitSwordFire(f,c,p,h),true);assert.equal(f.waves[0].range,300);
});

test('fire checks health at the active strike: missing half a heart, hurt or death disable it',()=>{
 for(const changes of [{hp:5},{dead:true},{hurtTime:.2},{hp:0}]){
  const h={...createHealth(),...changes},f=createSwordFire(),c=attack();
  assert.equal(emitSwordFire(f,c,{x:450,y:580},h),false);assert.equal(f.waves.length,0);
 }
 assert.equal(fullHearts(createHealth()),true);assert.equal(fullHearts({...createHealth(),hp:5}),false);
 const h=createHealth(),f=createSwordFire(),c=attack();c.time=.02;
 assert.equal(emitSwordFire(f,c,{x:450,y:580},h),false);h.hp=5;c.time=.1;
 assert.equal(emitSwordFire(f,c,{x:450,y:580},h),false);
});

test('only releasing a full charge starts eight normalized fire rays and a single fire ring',()=>{
 const c=createCombat(),f=createSwordFire(),h=createHealth(),p={x:450,y:580};pressAttack(c,'down');advanceCombat(c,.35);
 assert.equal(c.state,'charging');advanceCombat(c,.81);assert.equal(emitSwordFire(f,c,p,h),false);
 releaseAttack(c);assert.equal(c.state,'spin');assert.equal(emitSwordFire(f,c,p,h),false);advanceCombat(c,.07);
 assert.equal(emitSwordFire(f,c,p,h),true);assert.equal(f.waves.length,8);assert.equal(f.rings.length,1);
 for(const w of f.waves){assert.ok(Math.abs(Math.hypot(w.dx,w.dy)-1)<1e-9);assert.equal(w.damage,60);assert.equal(w.hitIds,c.hitIds);}
 assert.equal(new Set(f.waves.map(w=>w.angle)).size,8);assert.equal(emitSwordFire(f,c,p,h),false);
 const early=createCombat();pressAttack(early,'down');advanceCombat(early,.35);advanceCombat(early,.3);releaseAttack(early);
 assert.equal(emitSwordFire(createSwordFire(),early,p,h),false);
});

test('melee and its wave share one hit per target instead of doubling slash damage',()=>{
 const c=attack(),f=createSwordFire(),p={x:400,y:400},h=createHealth(),d=dummy(1,430,400);
 assert.equal(resolveHits(c,p,[d]).length,1);emitSwordFire(f,c,p,h);
 assert.equal(updateSwordFire(f,.5,[d],c.stats).length,0);
 assert.equal(d.hp,280);assert.equal(d.hits,1);assert.equal(c.stats.total,20);assert.equal(f.waves.length,0);
});

test('distant fire hits record real damage and the eight-way attack can strike eight separate targets',()=>{
 const c=attack('right',true),f=createSwordFire(),p={x:450,y:580};emitSwordFire(f,c,p,createHealth());
 const ds=Array.from({length:8},(_,i)=>dummy(i+1,p.x+Math.cos(i*Math.PI/4)*100,p.y+Math.sin(i*Math.PI/4)*100));
 const hits=updateSwordFire(f,.5,ds,c.stats);assert.equal(hits.length,8);assert.ok(ds.every(d=>d.hp===240&&d.hits===1));assert.equal(c.stats.total,480);assert.equal(c.stats.lastKind,'fireSpin');
 assert.equal(updateSwordFire(f,.5,ds,c.stats).length,0);
});

test('new attacks and cancellation retain the hit history of older waves still in flight',()=>{
 const c=attack(),f=createSwordFire(),p={x:400,y:400};emitSwordFire(f,c,p,createHealth());const old=f.waves[0];old.hitIds.add(7);
 c.state='idle';c.held=false;pressAttack(c,'right');assert.notEqual(c.hitIds,old.hitIds);assert.ok(old.hitIds.has(7));
 cancelAttack(c);assert.ok(old.hitIds.has(7));assert.equal(c.hitIds.size,0);
 const d=dummy(7,510,400);updateSwordFire(f,1,[d],c.stats);assert.equal(d.hp,300);
 pressAttack(c,'right');c.time=.1;emitSwordFire(f,c,p,createHealth());updateSwordFire(f,1,[d],c.stats);assert.equal(d.hp,280);
});

test('swept fire collision stops at scenery and waves/rings expire after their finite range and duration',()=>{
 const c=attack('up'),f=createSwordFire(),p={x:600,y:420},d=dummy(1,600,300);emitSwordFire(f,c,p,createHealth());
 assert.equal(updateSwordFire(f,1,[d],c.stats).length,0);assert.equal(d.hp,300);assert.equal(f.waves.length,0);
 const r=createSwordFire(),s=attack('up',true);emitSwordFire(r,s,{x:450,y:580},createHealth());updateSwordFire(r,2,[],s.stats);
 assert.equal(r.waves.length,0);assert.equal(r.rings.length,0);assert.equal(FIRE.range,300);
});

test('new rest begins with the identical collapse frame; corrected art and fire frames fit the atlases',()=>{
 const base=new URL('../dist/assets/',import.meta.url),m=JSON.parse(fs.readFileSync(new URL('combat-v6-atlas.json',base)));
 assert.deepEqual(fs.readFileSync(new URL(m.sequences['defeat-rest'][0].file,base)),fs.readFileSync(new URL('defeat-v5-frames/defeat-collapse-15.png',base)));
 for(const name of ['defeat-rest','fire-wave','fire-ring']){assert.equal(m.sequences[name].length,8);for(const f of m.sequences[name]){
  const a=fs.readFileSync(new URL(f.image,base));assert.ok(f.x+f.w<=a.readUInt32BE(16)&&f.y+f.h<=a.readUInt32BE(20));assert.ok(fs.existsSync(new URL(f.file,base)));
 }}
 for(let t=0;t<10;t+=.013){assert.ok(waveFrame(t)>=0&&waveFrame(t)<8);const p=ringPose(t);assert.ok(p.frame>=0&&p.frame<8&&p.alpha>=0&&p.alpha<=1);}
 assert.equal(Object.values(m.sequences).reduce((n,a)=>n+a.length,0),144);
});
