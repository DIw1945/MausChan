import {test} from 'node:test';
import assert from 'node:assert/strict';
import {START,TRAINING_ZONE,MUMMY_ZONE,SPIDER_ZONE} from '../dist/core.mjs';
import {createHealth} from '../dist/health.mjs';
import {SLIME_TYPES,createSlimes,createSticky,advanceSlimes,advanceSlimesAfterDefeat} from '../dist/slimes.mjs';
import {MUMMY,createMummies,advanceMummies,advanceMummiesAfterDefeat} from '../dist/mummies.mjs';
import {SPIDER_TYPES,createSpiders,advanceSpiderSpawns,advanceSpidersAfterDefeat} from '../dist/spiders.mjs';

const kinds=[...Object.keys(SLIME_TYPES).map(type=>({family:'slime',type,zone:TRAINING_ZONE,speed:SLIME_TYPES[type].speed})),
  {family:'mummy',type:'mummy',zone:MUMMY_ZONE,speed:MUMMY.speed},
  ...Object.keys(SPIDER_TYPES).map(type=>({family:'spider',type,zone:SPIDER_ZONE,speed:SPIDER_TYPES[type].speed}))];
function setup(kind){
  let s,advance;
  if(kind.family==='slime'){s=createSlimes();advanceSlimes(s,.4,START,createHealth(),createSticky());advance=advanceSlimesAfterDefeat;}
  else if(kind.family==='mummy'){s=createMummies();advanceMummies(s,.6,START,createHealth());advance=advanceMummiesAfterDefeat;}
  else{s=createSpiders();advanceSpiderSpawns(s,.5,START);advance=advanceSpidersAfterDefeat;}
  const e=s.entities[0],home=s.points[0],config=SLIME_TYPES[kind.type]??SPIDER_TYPES[kind.type]??MUMMY;
  Object.assign(e,{type:kind.type,radius:config.radius,x:home.x+20,y:home.y,windup:.5,recoverTime:.2,spawnShield:0});
  s.entities=[e];s.points.forEach(p=>p.timer=1e6);
  if(s.shots)s.shots=[{id:'old',x:home.x,y:home.y}];
  return {s,e,p:{x:home.x,y:home.y},advance};
}

test('every monster species retreats, cancels pending attacks, then keeps wandering with body clearance',()=>{
  for(const kind of kinds){
    const {s,e,p,advance}=setup(kind),body={...p};let targets=new Set(),positions=new Set();
    advance(s,.1,p);assert.equal(e.windup,0);assert.equal(e.recoverTime,0);assert.ok(e.x>p.x+20,kind.type);assert.equal(e.moving,true);
    if(s.shots)assert.equal(s.shots.length,0);
    for(let i=0;i<800;i++){
      advance(s,.05,p);assert.equal(e.windup,0);if(s.shots)assert.equal(s.shots.length,0);
      if(e.defeatRetreat===false||e.webRetreat===false){
        assert.ok(Math.hypot(e.x-p.x,e.y-p.y)>=80-.001,kind.type);
        positions.add(`${Math.round(e.x)},${Math.round(e.y)}`);
        if(e.roamTarget)targets.add(`${e.roamTarget.x},${e.roamTarget.y}`);
      }
      assert.ok(e.x>=kind.zone.x&&e.x<=kind.zone.x+kind.zone.w&&e.y>=kind.zone.y&&e.y<=kind.zone.y+kind.zone.h);
    }
    assert.ok(positions.size>10,kind.type);assert.ok(targets.size>1,kind.type);assert.deepEqual(p,body);
  }
});

test('exact body overlap and arena corners do not trap slime or mummy retreat',()=>{
  for(const kind of kinds.filter(k=>k.family!=='spider')){
    for(const corner of [false,true]){
      const {s,e,p,advance}=setup(kind);
      if(corner){Object.assign(p,{x:kind.zone.x+40,y:kind.zone.y+40});Object.assign(e,{x:kind.zone.x+e.radius+9,y:kind.zone.y+e.radius+9});}
      else Object.assign(e,p);
      for(let i=0;i<500;i++)advance(s,.05,p);
      assert.equal(e.defeatRetreat,false,kind.type);assert.ok(Math.hypot(e.x-p.x,e.y-p.y)>=80-.001);
    }
  }
});

test('post-defeat movement respects extra scenery while clearing the body',()=>{
  for(const kind of kinds.filter(k=>k.family!=='spider')){
    const {s,e,p,advance}=setup(kind);const wall={x:p.x+40,y:p.y-70,w:12,h:140};
    for(let i=0;i<400;i++){
      advance(s,.05,p,{obstacles:[wall]});
      const rx=e.radius*(kind.family==='slime'?.75:1),ry=e.radius*(kind.family==='slime'?.4:.5);
      assert.ok(!(e.x+rx>wall.x&&e.x-rx<wall.x+wall.w&&e.y+ry>wall.y&&e.y-ry<wall.y+wall.h),kind.type);
    }
    assert.ok(Math.hypot(e.x-p.x,e.y-p.y)>=80-.001,kind.type);
  }
});

test('post-defeat spawning retains caps, clears projectiles and fresh Retry states contain no wandering state',()=>{
  for(const kind of kinds.filter(k=>k.type==='normal'||k.type==='mummy'||k.type==='weaver')){
    const {s,advance}=setup(kind);s.points.forEach(p=>p.timer=0);
    const cap=kind.family==='slime'?3:2;
    for(let i=0;i<800;i++){
      advance(s,.05,START);
      for(const point of s.points)assert.ok(s.entities.filter(e=>e.hp>0&&e.pointId===point.id).length<=cap);
      assert.ok(s.entities.every(e=>e.hp<=0||e.windup===0));if(s.shots)assert.equal(s.shots.length,0);
    }
    assert.equal(s.entities.filter(e=>e.hp>0).length,s.points.length*cap);
  }
  for(const create of [createSlimes,createMummies,createSpiders])assert.deepEqual(create().entities,[]);
});
