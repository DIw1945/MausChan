import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {TRAINING_ZONE,WORLD,START,collides,updatePlayer} from '../dist/core.mjs';
import {createHealth} from '../dist/health.mjs';
import {createCombat,resolveHits,hitDummy} from '../dist/combat.mjs';
import {createSwordFire,emitSwordFire,updateSwordFire} from '../dist/fire.mjs';
import {createBombs,advanceBombs,BOMB} from '../dist/bombs.mjs';
import {SLIME,SLIME_TYPES,createSlimes,createSticky,pointPopulation,advanceSlimeSpawns,advanceSlimes,advanceSlimeEffects,handleSlimeDefeats,addSticky,advanceSticky,struggleSticky,stickyFrame,slimeFrame,slimePopFrame} from '../dist/slimes.mjs';

function setup(){const state=createSlimes(),health=createHealth(),goo=createSticky(),p={x:1150,y:260,facing:'left'};advanceSlimeSpawns(state,.4,START);return{state,health,goo,p,e:state.entities[0],combat:createCombat()};}
const attack=(s,dt)=>advanceSlimes(s.state,dt,s.p,s.health,s.goo);
const ready=s=>{Object.assign(s.e,{x:s.p.x-22,y:s.p.y,spawnShield:0,attackCooldown:0,windup:0,age:1});return s;};

test('four independent spawn points refill normally up to 3 living slimes each or 12 total',()=>{
  const state=createSlimes();assert.equal(state.points.length,4);
  for(let i=0;i<600;i++){advanceSlimeSpawns(state,.1,START);for(const p of state.points)assert.ok(pointPopulation(state,p.id)<=3);assert.ok(state.entities.filter(e=>e.hp>0).length<=12);}
  assert.ok(state.points.every(p=>pointPopulation(state,p.id)===3));assert.deepEqual(new Set(state.entities.map(e=>e.type)),new Set(['normal','big','swift']));
  const victim=state.entities[0],id=victim.id;victim.hp=0;handleSlimeDefeats(state,[{id,killed:true}]);const before=state.entities.filter(e=>e.hp>0).length;
  for(let i=0;i<50;i++)advanceSlimeSpawns(state,.1,START);assert.ok(state.entities.filter(e=>e.hp>0).length>before);assert.equal(new Set(state.entities.map(e=>e.id)).size,state.entities.length);
});
test('a large slime always splits into four distinct children, even at a full spawn point',()=>{
  const s=setup();advanceSlimeSpawns(s.state,1,START);const parent=s.state.entities.find(e=>e.type==='big');assert.ok(parent);
  for(let i=0;i<100;i++)advanceSlimeSpawns(s.state,.1,START);assert.equal(pointPopulation(s.state,parent.pointId),3);
  parent.hp=0;const event={id:parent.id,killed:true},children=handleSlimeDefeats(s.state,[event]);assert.equal(children.length,4);
  assert.ok(children.every(e=>e.type==='tiny'&&e.pointId===parent.pointId&&e.spawnShield>0));assert.equal(pointPopulation(s.state,parent.pointId),6);
  assert.equal(new Set(children.map(e=>e.id)).size,4);assert.equal(new Set(children.map(e=>`${e.x},${e.y}`)).size,4);
  const next=s.state.nextId;for(let i=0;i<100;i++)advanceSlimeSpawns(s.state,.1,START);assert.equal(s.state.nextId,next);
  for(const child of children)child.hp=0;handleSlimeDefeats(s.state,children.map(e=>({id:e.id,killed:true})));
  for(let i=0;i<50;i++)advanceSlimeSpawns(s.state,.1,START);assert.equal(pointPopulation(s.state,parent.pointId),3);
  assert.equal(handleSlimeDefeats(s.state,[event]).length,0);assert.equal(s.state.kills,5);
});
test('split children never split again and killing a whole group leaves reusable capacity',()=>{
  const s=setup();advanceSlimeSpawns(s.state,1,START);const parent=s.state.entities.find(e=>e.type==='big');parent.hp=0;
  const children=handleSlimeDefeats(s.state,[{id:parent.id,killed:true}]);for(const child of children)child.hp=0;
  assert.equal(handleSlimeDefeats(s.state,children.map(e=>({id:e.id,killed:true}))).length,0);assert.equal(pointPopulation(s.state,parent.pointId),0);
});
test('spawn locations avoid the player and refuse blocked ground without spending an identity',()=>{
  const state=createSlimes(),point=state.points[0];advanceSlimeSpawns(state,.5,point);const e=state.entities[0];assert.ok(Math.hypot(e.x-point.x,e.y-point.y)>=e.radius+24);
  const empty=createSlimes();advanceSlimeSpawns(empty,5,START,{obstacles:[{...TRAINING_ZONE}]});assert.equal(empty.entities.length,0);assert.equal(empty.nextId,1);
});
test('the new yard is connected through the east gate while the rest of the original border stays solid',()=>{
  assert.equal(WORLD.left+WORLD.width,1664);assert.equal(collides(1000,400),false);assert.equal(collides(1000,300),true);assert.equal(collides(START.x,START.y),false);
  const p={x:950,y:400,facing:'right'};updatePlayer(p,{x:1,y:0},1.4);assert.ok(p.x>TRAINING_ZONE.x);
});
test('slimes stay in the practice yard and cannot follow the player back to the original hub',()=>{
  const s=setup();for(let i=0;i<1200;i++)advanceSlimes(s.state,.05,START,s.health,s.goo);
  assert.ok(s.state.entities.every(e=>e.x>=TRAINING_ZONE.x&&e.x<=TRAINING_ZONE.x+TRAINING_ZONE.w&&e.y>=TRAINING_ZONE.y&&e.y<=TRAINING_ZONE.y+TRAINING_ZONE.h));assert.equal(s.health.hp,6);assert.equal(s.goo.amount,0);
});
test('the swift species actually chases faster than normal and heavy slimes',()=>{
  const distances=[];
  for(const type of ['big','normal','swift']){const s=setup();s.state.points.forEach(p=>p.timer=100);s.state.entities=[s.e];s.e.type=type;s.e.radius=SLIME_TYPES[type].radius;s.e.x=1120;s.e.y=260;s.e.spawnShield=0;s.p.x=1250;const start=s.e.x;attack(s,.5);distances.push(s.e.x-start);}
  assert.ok(distances[0]<distances[1]&&distances[1]<distances[2]);
});
test('contact attacks have a visible windup, deal half a heart, and build slime only on a real hit',()=>{
  const s=ready(setup());assert.equal(attack(s,.01).playerHit,false);assert.ok(s.e.windup>0);assert.equal(s.goo.amount,0);
  assert.equal(attack(s,.5).playerHit,false);assert.equal(attack(s,.03).playerHit,true);assert.equal(s.health.hp,5);assert.equal(s.goo.amount,34);
  s.e.windup=.01;assert.equal(attack(s,.02).playerHit,false);assert.equal(s.goo.amount,34);
});
test('moving out of range during the windup avoids both damage and sticky buildup',()=>{
  const s=ready(setup());attack(s,.01);s.p.x+=100;assert.equal(attack(s,SLIME_TYPES.normal.windup+.01).playerHit,false);assert.equal(s.health.hp,6);assert.equal(s.goo.amount,0);
});
test('every species telegraphs longer and waits longer between consecutive contact attacks',()=>{
  const previous={normal:[.42,1.45],big:[.55,1.8],swift:[.32,1.1],tiny:[.34,1.2]};
  for(const [type,config] of Object.entries(SLIME_TYPES)){
    const s=ready(setup());s.state.entities=[s.e];s.state.points.forEach(p=>p.timer=100);s.e.type=type;s.e.radius=config.radius;
    const hits=[];
    for(let time=0;time<5&&hits.length<2;time+=.01){s.health.invulnerable=0;if(attack(s,.01).playerHit)hits.push(time+.01);}
    assert.equal(hits.length,2,type);assert.ok(hits[0]>=config.windup,type);assert.ok(hits[1]-hits[0]>=config.cooldown+config.windup-.001,type);
    assert.ok(config.windup>=previous[type][0]*1.2,type);assert.ok(config.cooldown>=previous[type][1]*1.2,type);
  }
});
test('four split children remain distinct and inside the arena even at a boundary',()=>{
  for(const [x,y] of [[TRAINING_ZONE.x+8,TRAINING_ZONE.y+8],[TRAINING_ZONE.x+TRAINING_ZONE.w-8,TRAINING_ZONE.y+TRAINING_ZONE.h-8]]){
    const s=setup();Object.assign(s.e,{type:'big',hp:0,x,y});const children=handleSlimeDefeats(s.state,[{id:s.e.id,killed:true}]);
    assert.equal(children.length,4);assert.equal(new Set(children.map(c=>`${c.x},${c.y}`)).size,4);
    assert.ok(children.every(c=>!collides(c.x,c.y)&&c.x>TRAINING_ZONE.x&&c.x<TRAINING_ZONE.x+TRAINING_ZONE.w&&c.y>TRAINING_ZONE.y&&c.y<TRAINING_ZONE.y+TRAINING_ZONE.h));
  }
});
test('every slime type, including children, applies its own goo buildup on a hit',()=>{
  for(const [type,config] of Object.entries(SLIME_TYPES)){const s=ready(setup());s.e.type=type;s.e.radius=config.radius;s.e.windup=.01;assert.equal(attack(s,.02).playerHit,true);assert.equal(s.goo.amount,config.goo,type);}
});
test('threshold roots the player until struggle input; time alone cannot end the sticky state',()=>{
  const g=createSticky();assert.equal(addSticky(g,34),false);assert.equal(addSticky(g,34),false);assert.equal(addSticky(g,34),true);assert.equal(g.bound,true);assert.equal(g.amount,100);
  advanceSticky(g,999);assert.equal(g.bound,true);assert.equal(g.amount,100);assert.equal(g.presses,0);
});
test('partial goo decays only after six quiet seconds, including a timestep crossing that boundary',()=>{
  const g=createSticky();addSticky(g,50);advanceSticky(g,5);assert.equal(g.amount,50);advanceSticky(g,2);assert.equal(g.amount,43);addSticky(g,10);advanceSticky(g,5.9);assert.equal(g.amount,53);advanceSticky(g,100);assert.equal(g.amount,0);
});
test('12 distinct struggle presses free the player; held-key repeats cannot farm progress',()=>{
  const g=createSticky(),h=createHealth();addSticky(g,100);for(let i=0;i<100;i++)struggleSticky(g,h,{repeat:true});assert.equal(g.presses,0);
  for(let i=0;i<11;i++)assert.equal(struggleSticky(g,h),false);assert.equal(g.bound,true);assert.equal(struggleSticky(g,h),true);assert.equal(g.bound,false);assert.equal(g.amount,0);assert.ok(h.invulnerable>=1.2);assert.equal(h.hurtTime,0);assert.equal(h.knockTime,0);
  assert.equal(struggleSticky(g,h),false);addSticky(g,100);h.dead=true;assert.equal(struggleSticky(g,h),false);assert.equal(g.presses,0);
});
test('slimes give a bound player room to struggle and do not chain damage or reset escape progress',()=>{
  const s=ready(setup());addSticky(s.goo,100);s.goo.presses=5;s.e.windup=.01;for(let i=0;i<200;i++)attack(s,.05);
  assert.equal(s.health.hp,6);assert.equal(s.goo.presses,5);assert.equal(s.goo.bound,true);
});
test('Nitro pause leaves spawns, movement and attack clocks untouched',()=>{
  const s=ready(setup()),before=JSON.stringify(s.state);advanceSlimes(s.state,10,s.p,s.health,s.goo,{paused:true});assert.equal(JSON.stringify(s.state),before);assert.equal(s.health.hp,6);
});
test('swords damage living slimes once per attack with IDs independent from dummies',()=>{
  const s=ready(setup());s.p.facing='left';s.combat.state='slash';s.combat.time=.1;s.combat.facing='left';assert.equal(resolveHits(s.combat,s.p,[s.e]).length,1);assert.equal(s.e.hp,20);assert.equal(resolveHits(s.combat,s.p,[s.e]).length,0);assert.equal(s.combat.stats.hits,1);
});
test('fire and bombs kill slimes through the common combat path, while new split children have spawn grace',()=>{
  for(const weapon of ['fire','bomb']){
    const s=setup();advanceSlimeSpawns(s.state,1,START);const parent=s.state.entities.find(e=>e.type==='big');parent.spawnShield=0;parent.x=1200;parent.y=400;s.p={x:1160,y:400,facing:'right'};
    let hits;
    if(weapon==='fire'){parent.hp=20;s.combat.state='slash';s.combat.time=.1;s.combat.facing='right';const fire=createSwordFire();emitSwordFire(fire,s.combat,s.p,s.health);hits=updateSwordFire(fire,.2,[parent],s.combat.stats);}
    else{const bombs=createBombs();bombs.placed=[{id:1,x:parent.x,y:parent.y,time:0}];s.p.x=1400;hits=advanceBombs(bombs,BOMB.fuse,[parent],s.combat.stats,s.p,s.health).hits;}
    assert.equal(hits.length,1);assert.equal(hits[0].killed,true);const children=handleSlimeDefeats(s.state,hits);assert.equal(children.length,4);
    s.combat.state='spin';s.combat.time=.1;s.combat.hitIds=new Set();s.p={x:parent.x,y:parent.y,facing:'down'};assert.equal(resolveHits(s.combat,s.p,children).length,0);
  }
});
test('corpse goo effects finish without spawning after defeat, and fresh state resets all monsters and sticky status',()=>{
  const s=setup();s.e.hp=0;handleSlimeDefeats(s.state,[{id:s.e.id,killed:true}]);advanceSlimeEffects(s.state,.5);assert.equal(s.state.entities.length,0);const fresh=createSlimes();assert.equal(fresh.entities.length,0);assert.equal(fresh.kills,0);assert.equal(fresh.points.length,4);assert.deepEqual(createSticky(),{amount:0,bound:false,presses:0,quiet:0,time:0});
});
test('all new animation frame indices remain in bounds',()=>{
  for(let i=0;i<1000;i++){const t=i/37;assert.ok(stickyFrame(t)>=0&&stickyFrame(t)<12);assert.ok(slimeFrame({age:t,type:'swift'})>=0&&slimeFrame({age:t,type:'swift'})<8);assert.ok(slimePopFrame(t)>=0&&slimePopFrame(t)<4);}
});
test('sticky animation now plays 12 poses at 9fps and loops after four thirds of a second',()=>{
  assert.equal(SLIME.stickyFPS,9);assert.equal(stickyFrame(.1),0);assert.equal(stickyFrame(1),9);assert.equal(stickyFrame(12/9-.001),11);assert.equal(stickyFrame(12/9),0);
});
test('40 generated frames retain originals, fixed anchors and 12 distinct body-sized struggle poses',()=>{
  const base=new URL('../dist/assets/',import.meta.url),m=JSON.parse(fs.readFileSync(new URL('slimes-v11-atlas.json',base)));assert.ok(m.sources.every(name=>fs.existsSync(new URL(name,base))));
  assert.equal(m.stickyAnimation.fps,SLIME.stickyFPS);assert.ok(m.sequences['sticky-struggle'].every(f=>f.image==='sticky-struggle-v11-atlas.png'));
  for(const [name,count,size,anchor] of [['slime-normal',8,96,[48,76]],['slime-big',8,96,[48,76]],['slime-swift',8,96,[48,76]],['slime-pop',4,96,[48,76]],['sticky-struggle',12,160,[80,112]]]){
    assert.equal(m.sequences[name].length,count);for(const f of m.sequences[name]){const png=fs.readFileSync(new URL(f.image,base));assert.equal(f.w,size);assert.deepEqual(f.anchor,anchor);assert.ok(f.x+f.w<=png.readUInt32BE(16)&&f.y+f.h<=png.readUInt32BE(20));assert.ok(fs.existsSync(new URL(f.file,base)));}
  }
  assert.equal(new Set(m.sequences['sticky-struggle'].map(f=>crypto.createHash('sha256').update(fs.readFileSync(new URL(f.file,base))).digest('hex'))).size,12);
  assert.ok(m.stickyCalibration.bodyHeights.every(h=>Math.abs(h-54)<=1));assert.ok(m.stickyCalibration.headWidths.every(w=>Math.abs(w-40)<=1));
});
