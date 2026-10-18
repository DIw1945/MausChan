import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {START} from '../dist/core.mjs';
import {createHealth} from '../dist/health.mjs';
import {WEB,SPIDER_TYPES,SPIDER_DIRECTIONS,createWebbed,addWebbed,reinforceWebbed,advanceWebbed,struggleWebbed,webEscapePresses,webbedPose,createSpiders,advanceSpiderSpawns,advanceSpiders,advanceWebShots,applySpiderHit,spiderFacing,spiderFrame,spiderAtlasFrame} from '../dist/spiders.mjs';

function bound(){const w=createWebbed(),h=createHealth(),p={x:-370,y:260,facing:'left'};addWebbed(w,100);return{w,h,p};}
function second(){const a=bound();for(let i=0;i<5;i++){advanceWebbed(a.w,WEB.reinforceGrace);reinforceWebbed(a.w);}return a;}
const strike=a=>applySpiderHit(a.w,a.h,a.p,{x:a.p.x-25,y:a.p.y,damage:1},{silk:true});

test('four-facing atlas mapping selects separate walk and attack frames for both species',()=>{
  assert.deepEqual(SPIDER_DIRECTIONS,['down','left','right','up']);
  for(const type of Object.keys(SPIDER_TYPES))for(const [i,facing] of SPIDER_DIRECTIONS.entries()){
    for(let frame=0;frame<4;frame++)assert.equal(spiderAtlasFrame({type,facing,age:0,moving:true,walkTime:(frame+.001)/8,windup:0,recoverTime:0}),i*8+frame);
    assert.equal(spiderAtlasFrame({type,facing,age:0,moving:false,windup:SPIDER_TYPES[type].windup,recoverTime:0}),i*8+4);
    assert.equal(spiderAtlasFrame({type,facing,age:0,moving:false,windup:0,recoverTime:.1}),i*8+7);
  }
});
test('movement picks four cardinal facings and standing spiders do not run a walk cycle',()=>{
  for(const [dx,dy,f] of [[0,1,'down'],[-1,0,'left'],[1,0,'right'],[0,-1,'up']])assert.equal(spiderFacing(dx,dy),f);
  assert.equal(spiderFacing(0,0,'left'),'left');assert.equal(spiderFrame({type:'hunter',moving:false,age:999,windup:0,recoverTime:0}),0);
});
test('casting tracks the target direction, then shows attack recovery in that facing',()=>{
  for(const [dx,dy,facing] of [[100,0,'right'],[-100,0,'left'],[0,100,'down'],[0,-80,'up']]){
    const s=createSpiders(),h=createHealth(),w=createWebbed();advanceSpiderSpawns(s,.5,START);s.points.forEach(p=>p.timer=100);const e=s.entities[0];s.entities=[e];Object.assign(e,{x:-370,y:300,spawnShield:0,attackCooldown:0});const p={x:e.x+dx,y:e.y+dy,facing:'down'};
    advanceSpiders(s,.01,p,h,w);assert.equal(e.facing,facing);assert.equal(spiderFrame(e),4);advanceSpiders(s,.81,p,h,w);assert.equal(e.facing,facing);assert.equal(e.recoverTime,.28);assert.equal(spiderFrame(e),6);assert.equal(s.shots.length,1);
  }
});
test('reinforcement ignores HP invulnerability while keeping health, hit count and position unchanged',()=>{
  const a=bound();advanceWebbed(a.w,.7);a.h.invulnerable=99;const before=JSON.stringify(a.h),position={...a.p};const hit=strike(a);
  assert.equal(hit.playerHit,false);assert.equal(hit.reinforced,true);assert.equal(a.w.reinforcement,20);assert.equal(JSON.stringify(a.h),before);assert.deepEqual(a.p,position);
});
test('the initial bind and reinforcement cooldown prevent a burst of shots from instantly reaching tier two',()=>{
  const a=bound();assert.equal(strike(a).reinforced,false);advanceWebbed(a.w,.7);
  const s=createSpiders();s.shots=Array.from({length:10},(_,id)=>({id,x:a.p.x,y:a.p.y-17,vx:0,vy:0,age:0,travelled:0}));
  advanceWebShots(s,0,a.p,a.h,a.w);assert.equal(a.w.reinforcement,20);assert.equal(a.w.tier,1);assert.equal(a.h.hp,6);assert.equal(s.shots.length,0);
});
test('five spaced silk hits enter tier two, start a fresh harder escape and a fixed 10-second timer',()=>{
  const a=bound();a.w.presses=18;for(let i=0;i<5;i++){advanceWebbed(a.w,.7);const hit=strike(a);assert.equal(hit.upgraded,i===4);if(i<4)assert.equal(a.w.tier,1);}
  assert.equal(a.w.tier,2);assert.equal(a.w.reinforcement,100);assert.equal(a.w.presses,0);assert.equal(a.w.remaining,10);assert.equal(a.h.hp,6);assert.equal(webEscapePresses(a.w),44);assert.ok(webEscapePresses(a.w)>WEB.escapePresses);
});
test('seven bites are required for tier two and still deal no HP damage',()=>{
  const a=bound();for(let i=0;i<7;i++){advanceWebbed(a.w,.7);const r=applySpiderHit(a.w,a.h,a.p,{x:a.p.x-20,y:a.p.y,damage:1});assert.equal(r.playerHit,false);assert.equal(r.upgraded,i===6);if(i<6)assert.equal(a.w.tier,1);}
  assert.equal(a.w.tier,2);assert.equal(a.h.hp,6);assert.equal(a.h.hitsTaken,0);
});

test('mixed silk and melee reinforcement remains in tier one at 95 percent, then caps on the next hit',()=>{
  const a=bound();for(let i=0;i<4;i++){advanceWebbed(a.w,.7);strike(a);}
  advanceWebbed(a.w,.7);applySpiderHit(a.w,a.h,a.p,{x:a.p.x-20,y:a.p.y,damage:1});
  assert.equal(a.w.reinforcement,95);assert.equal(a.w.tier,1);assert.equal(a.w.remaining,0);
  advanceWebbed(a.w,.7);assert.equal(strike(a).upgraded,true);assert.equal(a.w.reinforcement,100);assert.equal(a.w.remaining,10);assert.equal(a.h.hp,6);
});
test('ordinary melee still costs half a heart and never adds stage-one projectile silk',()=>{
  const a={w:createWebbed(),h:createHealth(),p:{x:-370,y:260,facing:'left'}};const r=applySpiderHit(a.w,a.h,a.p,{x:-390,y:260,damage:1});assert.equal(r.playerHit,true);assert.equal(a.h.hp,5);assert.equal(a.w.amount,0);
});
test('later attacks cannot reset tier-two progress or extend/restart its deadline',()=>{
  const a=second();a.w.presses=20;advanceWebbed(a.w,3);const before={presses:a.w.presses,remaining:a.w.remaining};for(let i=0;i<10;i++)strike(a);
  assert.equal(a.w.presses,before.presses);assert.equal(a.w.remaining,before.remaining);assert.equal(a.h.hp,6);assert.equal(a.w.tier,2);
});
test('44 distinct presses beat tier two and completely clear both tiers with escape grace',()=>{
  const a=second();for(let i=0;i<43;i++)assert.equal(struggleWebbed(a.w,a.h),false);assert.equal(a.w.bound,true);assert.equal(struggleWebbed(a.w,a.h),true);assert.deepEqual(a.w,createWebbed());assert.equal(a.h.dead,false);assert.equal(a.h.hp,6);assert.ok(a.h.invulnerable>=1.5);
});
test('holding a direction cannot beat either tier and disabled/dead input cannot revive a failed run',()=>{
  const a=second();for(let i=0;i<200;i++)struggleWebbed(a.w,a.h,{repeat:true});assert.equal(a.w.presses,0);advanceWebbed(a.w,10,a.h);assert.equal(a.w.failed,true);assert.equal(struggleWebbed(a.w,a.h),false);
});
test('timeout produces Game Over without consuming HP, and rest keeps looping instead of struggling',()=>{
  const a=second();a.w.presses=43;assert.equal(advanceWebbed(a.w,9.9,a.h),false);assert.equal(a.h.dead,false);assert.equal(webbedPose(a.w).frame,11);
  assert.equal(advanceWebbed(a.w,.11,a.h),true);assert.equal(a.h.dead,true);assert.equal(a.h.hp,6);assert.equal(a.w.failed,true);assert.deepEqual(webbedPose(a.w),{sequence:'rest',frame:0});
  advanceWebbed(a.w,.5);assert.deepEqual(webbedPose(a.w),{sequence:'rest',frame:2});advanceWebbed(a.w,1.5);assert.deepEqual(webbedPose(a.w),{sequence:'rest',frame:0});
});
test('escaping just before the deadline succeeds; the deadline cannot be bypassed after failure',()=>{
  const a=second();advanceWebbed(a.w,9.99,a.h);a.w.presses=43;assert.equal(struggleWebbed(a.w,a.h),true);advanceWebbed(a.w,1,a.h);assert.equal(a.h.dead,false);
  const b=second();advanceWebbed(b.w,10,b.h);b.w.presses=43;assert.equal(struggleWebbed(b.w,b.h),false);assert.equal(b.w.failed,true);
});
test('first-tier time has no deadline, while tier-two expiry cannot reset itself on later ticks',()=>{
  const a=bound();advanceWebbed(a.w,999,a.h);assert.equal(a.w.tier,1);assert.equal(a.h.dead,false);
  const b=second();assert.equal(advanceWebbed(b.w,999,b.h),true);assert.equal(advanceWebbed(b.w,999,b.h),false);assert.equal(b.w.remaining,0);assert.equal(b.h.hp,6);
});
test('fresh state clears failure and both progress meters for Retry',()=>{
  const a=second();advanceWebbed(a.w,10,a.h);Object.assign(a.w,createWebbed());assert.equal(a.w.failed,false);assert.equal(a.w.tier,0);assert.equal(a.w.reinforcement,0);assert.equal(a.w.remaining,0);assert.equal(a.w.bound,false);
});
test('100 selected v13 frames include both four-facing monsters and two matching Webbed defeat sequences',()=>{
  const base=new URL('../dist/assets/',import.meta.url),m=JSON.parse(fs.readFileSync(new URL('spiders-v13-atlas.json',base)));assert.equal(Object.values(m.sequences).reduce((n,s)=>n+s.length,0),100);
  assert.ok(m.sources.every(s=>fs.existsSync(new URL(s,base))));assert.deepEqual(m.directions,SPIDER_DIRECTIONS);
  for(const type of ['weaver','hunter']){
    const seq=m.sequences['spider-'+type];assert.equal(seq.length,32);
    for(let i=0;i<32;i++){const f=seq[i],png=fs.readFileSync(new URL(f.image,base));assert.equal(f.facing,SPIDER_DIRECTIONS[Math.floor(i/8)]);assert.equal(f.action,i%8<4?'walk':'attack');assert.deepEqual(f.anchor,[48,64]);assert.ok(f.x+96<=png.readUInt32BE(16)&&f.y+96<=png.readUInt32BE(20));}
    assert.equal(new Set([0,8,16,24].map(i=>crypto.createHash('sha256').update(fs.readFileSync(new URL(seq[i].file,base))).digest('hex'))).size,4);
  }
  assert.equal(m.sequences['burnice-webbed2'].length,12);assert.equal(m.sequences['burnice-webbed-rest'].length,8);
  assert.deepEqual(fs.readFileSync(new URL(m.sequences['burnice-webbed2'][11].file,base)),fs.readFileSync(new URL(m.sequences['burnice-webbed-rest'][0].file,base)));
  assert.equal(m.secondWebbedAnimation.restFPS,WEB.restFPS);assert.ok(m.secondWebbedCalibration.headWidths.every(w=>w===40));
  assert.ok(new Set(m.sequences['burnice-webbed-rest'].map(f=>crypto.createHash('sha256').update(fs.readFileSync(new URL(f.file,base))).digest('hex'))).size>=2);
});
