import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHealth} from '../dist/health.mjs';
import {START} from '../dist/core.mjs';
import {createMummies,advanceMummies,fireBandage,advanceBandages} from '../dist/mummies.mjs';
import {MUMMIFIELD,createMummifield,addMummifield,advanceMummifield,struggleMummifield,mummifieldFrame} from '../dist/mummifield.mjs';
function setup(){const s=createMummies(),h=createHealth(),w=createMummifield();advanceMummies(s,.6,START,h);const e=s.entities[0];s.entities=[e];s.points.forEach(p=>p.timer=1e6);Object.assign(e,{x:430,y:-330,spawnShield:0,meleeCooldown:0,castCooldown:0});return{s,h,w,e,p:{x:540,y:-330,facing:'down'}};}
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
test('partial buildup decays after silence; restraint loops indefinitely until 28 distinct presses',()=>{
 const s=createMummifield(),h=createHealth();addMummifield(s);advanceMummifield(s,9);assert.equal(s.amount,29);advanceMummifield(s,20);assert.equal(s.amount,0);
 addMummifield(s,100);advanceMummifield(s,100);assert.equal(s.bound,true);assert.equal(struggleMummifield(s,h,{repeat:true}),false);assert.equal(s.presses,0);
 for(let i=1;i<MUMMIFIELD.escapePresses;i++)assert.equal(struggleMummifield(s,h),false);
 assert.equal(struggleMummifield(s,h),true);assert.deepEqual(s,createMummifield());assert.ok(h.invulnerable>=1.5);
 assert.equal(mummifieldFrame(0),0);assert.equal(mummifieldFrame(8/6),0);assert.equal(new Set(Array.from({length:8},(_,i)=>mummifieldFrame((i+.01)/6))).size,8);
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
