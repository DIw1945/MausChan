import {test} from 'node:test';
import assert from 'node:assert/strict';
import {START,updatePlayer,collides,SPEED} from '../dist/core.mjs';
import {COMBAT,createCombat,pressAttack,releaseAttack,cancelAttack,advanceCombat,chargeRatio,attackFrame,createDummies,dummyObstacles,resolveHits,updateDummies} from '../dist/combat.mjs';
const player=()=>({...START,facing:'down',moving:false,animTime:0,wasMoving:false});
const dummy=(x,y,id=1)=>({...createDummies()[0],id,x,y});
test('tap attacks immediately and only damages a target once per slash',()=>{
 const c=createCombat(),p=player(),d=dummy(p.x,p.y+40);
 pressAttack(c,'down');assert.equal(c.state,'slash');releaseAttack(c);advanceCombat(c,.1);
 assert.equal(resolveHits(c,p,[d])[0].damage,20);
 for(let i=0;i<6;i++){advanceCombat(c,.01);assert.equal(resolveHits(c,p,[d]).length,0);}
 assert.equal(d.hp,280);assert.equal(c.stats.hits,1);advanceCombat(c,.3);assert.equal(c.state,'idle');
});
test('slash respects each of four facings and cannot hit behind or far away',()=>{
 for(const [f,[x,y]] of Object.entries({down:[0,1],left:[-1,0],right:[1,0],up:[0,-1]})){
  const c=createCombat(),p=player();pressAttack(c,f);advanceCombat(c,.1);
  const front=dummy(p.x+x*40,p.y+y*40,1),back=dummy(p.x-x*40,p.y-y*40,2),far=dummy(p.x+x*120,p.y+y*120,3);
  assert.deepEqual(resolveHits(c,p,[front,back,far]).map(h=>h.id),[1]);
 }
});
test('holding transitions to charge; an early release does not spin',()=>{
 const c=createCombat();pressAttack(c,'left');advanceCombat(c,.35);assert.equal(c.state,'charging');advanceCombat(c,.79);assert.ok(chargeRatio(c)<1);releaseAttack(c);assert.equal(c.state,'idle');assert.equal(c.stats.spins,0);
});
test('full charge waits for release, then hits 360 degrees once per dummy',()=>{
 const c=createCombat(),p=player();pressAttack(c,'up');advanceCombat(c,.35);advanceCombat(c,1.3);assert.equal(c.state,'charging');assert.equal(chargeRatio(c),1);
 releaseAttack(c);assert.equal(c.state,'spin');advanceCombat(c,.1);
 const targets=[[0,45],[45,0],[0,-45],[-45,0],[120,0]].map(([x,y],i)=>dummy(p.x+x,p.y+y,i+1));
 assert.equal(resolveHits(c,p,targets).length,4);assert.equal(c.stats.total,240);assert.equal(c.stats.spins,1);
 advanceCombat(c,.1);assert.equal(resolveHits(c,p,targets).length,0);advanceCombat(c,1);assert.equal(c.state,'idle');
});
test('key repeat and cancel do not restart attacks or produce a ghost spin',()=>{
 const c=createCombat();pressAttack(c,'right');advanceCombat(c,.1);const id=c.id;pressAttack(c,'left');assert.equal(c.id,id);assert.equal(c.facing,'right');
 advanceCombat(c,.3);advanceCombat(c,1);cancelAttack(c);releaseAttack(c);assert.equal(c.state,'idle');assert.equal(c.held,false);assert.equal(c.stats.spins,0);
});
test('dummy regeneration and zero-HP recovery allow repeated testing',()=>{
 const d=dummy(0,0);d.hp=20;d.restoreTime=4;updateDummies([d],3.9);assert.equal(d.hp,20);updateDummies([d],.2);assert.equal(d.hp,300);
 d.hp=0;d.restoreTime=2.2;updateDummies([d],2.21);assert.equal(d.hp,300);
});
test('eight-way movement remains normalized; charge locks facing and slows movement',()=>{
 for(const [x,y] of [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]]){const p=player();updatePlayer(p,{x,y},.15);assert.ok(Math.abs(Math.hypot(p.x-START.x,p.y-START.y)-SPEED*.15)<1e-7);}
 const p=player();updatePlayer(p,{x:1,y:0},.1,{speedScale:.42,lockFacing:true});assert.equal(p.facing,'down');assert.ok(Math.abs(p.x-START.x-SPEED*.1*.42)<1e-7);
});
test('training dummies have physical collision and spawn outside scenery',()=>{
 for(const d of createDummies())assert.equal(collides(d.x,d.y),false);
 const p=player(),d=dummy(p.x,p.y+40);for(let i=0;i<100;i++)updatePlayer(p,{x:0,y:1},1/60,{obstacles:dummyObstacles([d])});assert.ok(p.y<d.y-9);
});
test('attack frames stay in their generated atlas ranges',()=>{
 for(const [state,duration,max] of [['slash',COMBAT.slashDuration,3],['spin',COMBAT.spinDuration,7]])for(let i=0;i<=100;i++){const f=attackFrame({...createCombat(),state,time:duration*i/100});assert.ok(f>=0&&f<=max);}
});
