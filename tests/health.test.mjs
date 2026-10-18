import {test} from 'node:test';import assert from 'node:assert/strict';
import {createHealth,receiveDamage,advanceHealth,updateShooter,updateProjectiles,heartFill,hurtFrame,HEALTH} from '../dist/health.mjs';
import {createDummies} from '../dist/combat.mjs';
import fs from 'node:fs';
const player=()=>({x:280,y:410,facing:'down'});
test('three hearts lose a half-heart per hit and cannot be drained repeatedly during i-frames',()=>{
 const h=createHealth(),p=player();assert.deepEqual([0,1,2].map(i=>heartFill(h,i)),[2,2,2]);
 assert.equal(receiveDamage(h,p,{vx:0,vy:1}),true);assert.equal(h.hp,5);assert.deepEqual([0,1,2].map(i=>heartFill(h,i)),[2,2,1]);
 assert.equal(receiveDamage(h,p,{vx:0,vy:1}),false);assert.equal(h.hp,5);advanceHealth(h,p,HEALTH.invulnerability+.01);assert.equal(receiveDamage(h,p,{vx:0,vy:1}),true);assert.equal(h.hp,4);
});
test('hurt facing retains all four directions; every recoil frame stays within its atlas',()=>{
 for(const facing of ['down','left','right','up']){const p={...player(),facing},h=createHealth();receiveDamage(h,p,{vx:0,vy:1});assert.equal(h.facing,facing);for(let i=0;i<30;i++){assert.ok(hurtFrame(h)>=0&&hurtFrame(h)<=3);advanceHealth(h,p,1/60);}}
});
test('knockback follows incoming travel and cannot push the player through scenery',()=>{
 const p=player(),h=createHealth();receiveDamage(h,p,{vx:0,vy:110});for(let i=0;i<12;i++)advanceHealth(h,p,1/60);assert.ok(p.y>425);assert.equal(p.x,280);
 const q={x:600,y:400,facing:'up'},s=createHealth();receiveDamage(s,q,{vx:0,vy:-110});for(let i=0;i<15;i++)advanceHealth(s,q,1/60);assert.ok(q.y>=394);
});
test('shooting dummy fires straight down at intervals and stops while knocked out',()=>{
 const d=createDummies().find(d=>d.kind==='shooter'),bs=[];for(let i=0;i<240;i++)updateShooter(d,1/60,bs);
 assert.equal(bs.length,2);assert.ok(bs.every(b=>b.vx===0&&b.vy===110&&b.x===d.x));d.hp=0;for(let i=0;i<240;i++)updateShooter(d,1/60,bs);assert.equal(bs.length,2);
});
test('swept projectile collision damages once, consumes pellets and respects invulnerability',()=>{
 const p=player(),h=createHealth(),bs=[{x:p.x,y:340,vx:0,vy:110,age:0,damage:1}];assert.equal(updateProjectiles(bs,.6,p,h),true);assert.equal(h.hp,5);assert.equal(bs.length,0);
 bs.push({x:p.x,y:p.y-23,vx:0,vy:110,age:0,damage:1});assert.equal(updateProjectiles(bs,.05,p,h),false);assert.equal(h.hp,5);assert.equal(bs.length,0);
});
test('projectiles expire on scenery and old projectiles are removed',()=>{
 const h=createHealth(),p=player(),bs=[{x:600,y:400,vx:0,vy:-110,age:0},{x:400,y:400,vx:0,vy:0,age:10}];updateProjectiles(bs,.5,p,h);assert.equal(bs.length,0);assert.equal(h.hp,6);
});
test('six half-heart hits lead to game over, and a fresh health state fully restores hearts',()=>{
 const h=createHealth(),p=player();for(let i=0;i<6;i++){receiveDamage(h,p,{vx:0,vy:1});advanceHealth(h,p,1.3);}assert.equal(h.dead,true);assert.equal(h.hp,0);assert.deepEqual([0,1,2].map(i=>heartFill(h,i)),[0,0,0]);assert.equal(receiveDamage(h,p,{damage:2}),false);assert.equal(createHealth().hp,6);
});
test('heart fill always matches total health including every half-heart',()=>{for(let hp=0;hp<=6;hp++){const h={hp};assert.equal([0,1,2].reduce((sum,i)=>sum+heartFill(h,i),0),hp);}});
test('charge walk now matches original body height and head width per facing',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../dist/assets/health-v4-atlas.json',import.meta.url),'utf8'));
 for(const [direction,c] of Object.entries(data.chargeCalibration)){assert.ok(c.newBodyHeights.every(h=>Math.abs(h-c.referenceHeight)<=3),direction);assert.ok(c.newHeadWidths.every(w=>Math.abs(w-c.referenceHeadWidth)<=1),direction);}
});
