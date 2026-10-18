import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHealth} from '../dist/health.mjs';
import {START} from '../dist/core.mjs';
import {createMummies,advanceMummies,fireBandage,advanceBandages} from '../dist/mummies.mjs';
import {MUMMIFIELD,createMummifield,addMummifield,advanceMummifield,struggleMummifield,mummifieldFrame,mummyEscapePresses,mummifieldPose} from '../dist/mummifield.mjs';
function setup(){const s=createMummies(),h=createHealth(),w=createMummifield();advanceMummies(s,.6,START,h);const e=s.entities[0];s.entities=[e];s.points.forEach(p=>p.timer=1e6);Object.assign(e,{x:430,y:-330,spawnShield:0,meleeCooldown:0,castCooldown:0});return{s,h,w,e,p:{x:540,y:-330,facing:'down'}};}
function bindFirst(s,h){addMummifield(s,100);advanceMummifield(s,MUMMIFIELD.captureDuration,h);}
function hit(a){fireBandage(a.s,a.e,a.p);return advanceBandages(a.s,1,a.p,a.h,{mummifield:a.w});}
test('three damaging ranged hits fill Mummifield, clear knockback and remove all outstanding cloth',()=>{
 const a=setup();for(const value of [34,68,100]){a.h.invulnerable=0;assert.equal(hit(a),true);assert.equal(a.w.amount,value);}
 assert.equal(a.h.hp,3);assert.equal(a.w.bound,true);assert.equal(a.h.knockTime,0);assert.equal(a.s.shots.length,0);
 a.h.invulnerable=0;hit(a);assert.equal(a.h.hp,3);
});
test('invulnerability, pause, foreign restraint, misses, walls and fatal hits cannot apply buildup',()=>{
 for(const options of [{paused:true},{restrained:true},{obstacles:[{x:480,y:-350,w:10,h:40}]}]){
 const a=setup();fireBandage(a.s,a.e,a.p);advanceBandages(a.s,1,a.p,a.h,{mummifield:a.w,...options});assert.equal(a.w.amount,0);}
 const a=setup();a.h.invulnerable=1;hit(a);assert.equal(a.w.amount,0);a.h.invulnerable=0;a.h.hp=1;a.w.amount=68;hit(a);assert.equal(a.h.dead,true);assert.equal(a.w.bound,false);assert.equal(a.w.amount,68);
 const b=setup();fireBandage(b.s,b.e,b.p);b.p.y+=80;advanceBandages(b.s,2,b.p,b.h,{mummifield:b.w});assert.equal(b.w.amount,0);
});
test('scratch deals damage without filling Mummifield',()=>{
 const a=setup();a.p.x=460;advanceMummies(a.s,.01,a.p,a.h,{mummifield:a.w});advanceMummies(a.s,.66,a.p,a.h,{mummifield:a.w});assert.equal(a.h.hp,4);assert.equal(a.w.amount,0);
});
test('partial buildup decays after silence; first tier escapes with 28 distinct presses before timeout',()=>{
 const s=createMummifield(),h=createHealth();addMummifield(s);advanceMummifield(s,9);assert.equal(s.amount,29);advanceMummifield(s,20);assert.equal(s.amount,0);
 bindFirst(s,h);advanceMummifield(s,7);assert.equal(s.bound,true);assert.equal(struggleMummifield(s,h,{repeat:true}),false);assert.equal(s.presses,0);
 for(let i=1;i<MUMMIFIELD.escapePresses;i++)assert.equal(struggleMummifield(s,h),false);
 assert.equal(struggleMummifield(s,h),true);assert.deepEqual(s,createMummifield());assert.ok(h.invulnerable>=1.5);
 assert.equal(mummifieldFrame(0),0);assert.equal(mummifieldFrame(MUMMIFIELD.frames/MUMMIFIELD.fps),0);assert.equal(new Set(Array.from({length:MUMMIFIELD.frames},(_,i)=>mummifieldFrame((i+.01)/MUMMIFIELD.fps))).size,MUMMIFIELD.frames);
});
test('a filling projectile cancels every windup immediately and all Mummies retreat, including overlap and corners',()=>{
 for(const [x,y]of [[520,-330],[540,-330],[237,-553]]){
 const a=setup();Object.assign(a.e,{x,y,action:'scratch',windup:.01});Object.assign(a.p,{x:x===237?250:540,y:y===-553?-540:-330});a.w.amount=68;
 // Deliver a real swept projectile immediately next to the player.
 const shot=fireBandage(a.s,{x:a.p.x-22,y:a.p.y},a.p);shot.travelled=0;
 const result=advanceMummies(a.s,.04,a.p,a.h,{mummifield:a.w});assert.equal(result.bound,true);assert.equal(a.e.windup,0);
 const hp=a.h.hp;for(let i=0;i<300;i++)advanceMummies(a.s,.05,a.p,a.h,{mummifield:a.w});
 assert.ok(Math.hypot(a.e.x-a.p.x,a.e.y-a.p.y)>=80);assert.equal(a.h.hp,hp);assert.equal(a.s.shots.length,0);
 Object.assign(a.w,createMummifield());advanceMummies(a.s,.05,a.p,a.h,{mummifield:a.w});assert.equal(a.e.bindingMotion,undefined);
 }
});

test('first timeout holds tierI and progress during all24 wrapping frames before starting tierII',()=>{
 const s=createMummifield(),h=createHealth();bindFirst(s,h);for(let i=0;i<20;i++)struggleMummifield(s,h);
 assert.equal(advanceMummifield(s,7.99,h).wrapping,false);assert.equal(s.tier,1);assert.equal(s.presses,20);
 const start=advanceMummifield(s,.01,h);assert.equal(start.wrapping,true);assert.equal(start.upgraded,false);assert.equal(s.tier,1);assert.equal(s.remaining,0);assert.equal(s.transitioning,true);
 const poseFrames=[];
 for(let i=0;i<24;i++){
  assert.equal(s.tier,1);assert.equal(s.presses,20);assert.equal(s.remaining,0);assert.equal(struggleMummifield(s,h),false);assert.equal(h.dead,false);
  const pose=mummifieldPose(s);assert.equal(pose.sequence,'transition');poseFrames.push(pose.frame);
  if(i<23)assert.equal(advanceMummifield(s,1/12,h).upgraded,false);
 }
 assert.deepEqual(poseFrames,Array.from({length:24},(_,i)=>i));assert.equal(s.presses,20);
 assert.equal(advanceMummifield(s,1/12,h).upgraded,true);assert.equal(s.tier,2);assert.equal(s.transitioning,false);assert.ok(Math.abs(s.remaining-8)<1e-9);assert.equal(s.presses,0);assert.ok(Math.abs(s.time)<1e-9);
 assert.equal(mummyEscapePresses(s),64);assert.equal(mummifieldPose(s).sequence,'second');
});
test('second tier requires 64 distinct presses and escape clears both deadlines',()=>{
 const s=createMummifield(),h=createHealth();bindFirst(s,h);advanceMummifield(s,10,h);advanceMummifield(s,7.9,h);
 for(let i=0;i<63;i++){assert.equal(struggleMummifield(s,h,{repeat:true}),false);assert.equal(struggleMummifield(s,h),false);}
 assert.equal(s.bound,true);assert.equal(struggleMummifield(s,h),true);assert.deepEqual(s,createMummifield());advanceMummifield(s,20,h);assert.equal(h.dead,false);assert.ok(h.invulnerable>=1.5);
});
test('timeout defeats after eight seconds per tier plus the two-second transition without HP damage; falling plays once before Game Over',()=>{
 const s=createMummifield(),h=createHealth();bindFirst(s,h);advanceMummifield(s,17.99,h);assert.equal(h.dead,false);
 assert.equal(advanceMummifield(s,.01,h).failed,true);assert.equal(s.failed,true);assert.equal(h.dead,true);assert.equal(h.hp,6);assert.equal(s.remaining,0);assert.equal(h.knockTime,0);
 assert.deepEqual(mummifieldPose(s),{sequence:'fall',frame:0,gameOver:false});assert.equal(struggleMummifield(s,h),false);
 for(let i=1;i<8;i++){advanceMummifield(s,.125,h);assert.equal(mummifieldPose(s).frame,i);assert.equal(mummifieldPose(s).gameOver,false);}
 advanceMummifield(s,.125,h);assert.equal(mummifieldPose(s).gameOver,true);advanceMummifield(s,20,h);assert.equal(mummifieldPose(s).frame,7);assert.equal(mummifieldPose(s).gameOver,true);
});
test('timer overflow and frame subdivision agree, including a delayed update crossing both deadlines',()=>{
 const make=()=>{const s=createMummifield();bindFirst(s);return s;};
 const a=make(),b=make(),ha=createHealth(),hb=createHealth();advanceMummifield(a,10.25,ha);assert.equal(a.tier,2);assert.equal(a.remaining,7.75);assert.equal(a.time,.25);
 advanceMummifield(a,8,ha);advanceMummifield(b,18.25,hb);assert.equal(a.failed,true);assert.equal(b.failed,true);assert.equal(a.time,.25);assert.equal(b.time,.25);
 const c=make(),hc=createHealth();for(let i=0;i<360;i++)advanceMummifield(c,.05,hc);assert.equal(c.failed,true);assert.equal(hc.dead,true);
 const frozen=JSON.stringify(c);advanceMummifield(c,-1,hc);assert.equal(JSON.stringify(c),frozen);
});

test('capture plays24 frames before tierI and preserves its full eight seconds',()=>{
 const s=createMummifield(),h=createHealth();assert.equal(addMummifield(s,100),true);assert.equal(s.tier,0);assert.equal(s.capturing,true);assert.equal(s.bound,true);
 const frames=[];for(let i=0;i<24;i++){
  assert.equal(s.tier,0);assert.equal(s.remaining,0);assert.equal(s.presses,0);assert.equal(struggleMummifield(s,h),false);assert.equal(h.dead,false);
  const pose=mummifieldPose(s);assert.equal(pose.sequence,'capture');frames.push(pose.frame);
  if(i<23)assert.equal(advanceMummifield(s,1/12,h).entered,false);
 }
 assert.deepEqual(frames,Array.from({length:24},(_,i)=>i));assert.equal(advanceMummifield(s,1/12,h).entered,true);
 assert.equal(s.capturing,false);assert.equal(s.tier,1);assert.ok(Math.abs(s.remaining-8)<1e-9);assert.equal(mummifieldPose(s).sequence,'first');assert.equal(h.hp,6);
});
test('capture overflow agrees with small updates through capture, both tiers and wrapping',()=>{
 const a=createMummifield(),b=createMummifield(),ha=createHealth(),hb=createHealth();addMummifield(a,100);addMummifield(b,100);
 const result=advanceMummifield(a,2.25,ha);assert.equal(result.entered,true);assert.equal(a.tier,1);assert.equal(a.remaining,7.75);assert.equal(a.time,.25);
 advanceMummifield(a,18,ha);advanceMummifield(b,20.25,hb);assert.equal(a.failed,true);assert.equal(b.failed,true);assert.equal(a.time,.25);assert.equal(b.time,.25);
 const c=createMummifield(),hc=createHealth();addMummifield(c,100);for(let i=0;i<400;i++)advanceMummifield(c,.05,hc);assert.equal(c.failed,true);assert.equal(hc.dead,true);
});
