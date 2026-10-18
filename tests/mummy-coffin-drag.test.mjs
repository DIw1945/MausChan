import {createMummies,advanceMummies,advanceMummiesAfterDefeat} from '../dist/mummies.mjs';
import {createHealth} from '../dist/health.mjs';
import {START} from '../dist/core.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCoffinDrag,advanceCoffinDrag,coffinDragPose,coffinDragHop,COFFIN_DRAG} from '../dist/mummy-coffin-drag.mjs';
import {createMummifield,mummifieldPose} from '../dist/mummifield.mjs';
const points=[{id:0,x:350,y:-370},{id:1,x:634,y:-370}];
const endTime=d=>d.fallDuration+COFFIN_DRAG.reachDuration+d.pullDuration+COFFIN_DRAG.intakeDuration;
test('nearest coffin is selected once, stable at ties, snapshotted and empty groups safely fall back',()=>{
 for(const [x,id]of [[300,0],[492,0],[700,1]]){const p={x,y:-330},d=createCoffinDrag(p,points);assert.equal(d.coffin.id,id);assert.notEqual(d.coffin,points[id]);assert.ok(d.pullDuration>=36/12);}
 assert.equal(createCoffinDrag({x:0,y:0},[]),null);const mutable=points.map(p=>({...p})),d=createCoffinDrag({x:300,y:-330},mutable);mutable[0].x=999;assert.equal(d.coffin.x,350);
});
test('fall and reaching play before movement, then pulling approaches the frozen opening monotonically',()=>{
 const p={x:700,y:-250},d=createCoffinDrag(p,points),origin={...p};advanceCoffinDrag(d,.99,p);assert.equal(coffinDragPose(d).stage,'fall');assert.deepEqual(p,origin);
 advanceCoffinDrag(d,1.3,p);assert.equal(coffinDragPose(d).stage,'reach');assert.equal(p.x,origin.x);assert.equal(p.y,origin.y);
 let distance=Infinity;for(let i=0;i<=100;i++){
 const pose=advanceCoffinDrag(d,1+COFFIN_DRAG.reachDuration+d.pullDuration*i/100,p),next=Math.hypot(pose.center.x-d.opening.x,pose.center.y-d.opening.y);assert.ok(next<=distance+1e-8);distance=next;assert.equal(p.actualMoving,false);
 }
 assert.ok(distance<1e-7);assert.equal(d.coffin.id,1);
});
test('36 distinct animation indices loop with pronounced fish-like hops and12 dynamic coffin frames',()=>{
 const d=createCoffinDrag({x:300,y:-330},points);const start=1+COFFIN_DRAG.reachDuration;
 const frames=[],coffins=new Set();for(let i=0;i<36;i++){d.time=start+(i+.01)/12;const pose=coffinDragPose(d);frames.push(pose.frame);coffins.add(pose.coffinFrame);}
 assert.deepEqual(frames,Array.from({length:36},(_,i)=>i));assert.equal(coffins.size,12);assert.ok(coffinDragHop(8)>=8);assert.ok(coffinDragHop(18)>=11);assert.equal(coffinDragHop(0),0);
 d.time=start+3;assert.equal(coffinDragPose(d).frame,0);
});
test('intake rotates, shrinks and hides the body; Game Over waits until fully inside',()=>{
 const p={x:350,y:-330},d=createCoffinDrag(p,points),s=createMummifield();Object.assign(s,{failed:true,bound:true,tier:2,coffinDrag:d});
 advanceCoffinDrag(d,2,p);s.time=2;assert.equal(mummifieldPose(s).gameOver,false);
 const halfway=endTime(d)-COFFIN_DRAG.intakeDuration/2,pose=advanceCoffinDrag(d,halfway,p);s.time=halfway;assert.equal(pose.stage,'intake');assert.ok(pose.rotation<0);assert.ok(pose.scale<1);assert.ok(pose.alpha<1);assert.equal(mummifieldPose(s).gameOver,false);
 advanceCoffinDrag(d,endTime(d)+.001,p);s.time=endTime(d)+.001;assert.equal(d.done,true);assert.equal(mummifieldPose(s).gameOver,true);assert.equal(coffinDragPose(d).alpha,0);
});
test('large/small time steps agree, overlap remains finite, rewinds cannot reverse the capture and reset discards it',()=>{
 const a={x:350,y:-370},b={...a},da=createCoffinDrag(a,points),db=createCoffinDrag(b,points),end=endTime(da)+1;advanceCoffinDrag(da,end,a);for(let t=0;t<end;t+=.05)advanceCoffinDrag(db,t,b);advanceCoffinDrag(db,end,b);assert.deepEqual(a,b);assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.y));const old={...a};advanceCoffinDrag(da,0,a);assert.deepEqual(a,old);assert.equal(createMummifield().coffinDrag,null);
});
test('Mummies resume retreat if the moving defeated body enters their clearance instead of freezing',()=>{
 const s=createMummies(),p={x:430,y:-330};advanceMummies(s,.6,START,createHealth());const e=s.entities[0];s.entities=[e];s.points.forEach(p=>p.timer=1000);
 Object.assign(e,{x:p.x,y:p.y,defeatRetreat:false,roamTarget:{x:500,y:-330},roamTimer:5,roamPause:0});advanceMummiesAfterDefeat(s,.05,p);assert.ok(Math.hypot(e.x-p.x,e.y-p.y)>.1);
 for(let i=0;i<140;i++)advanceMummiesAfterDefeat(s,.05,p);assert.ok(Math.hypot(e.x-p.x,e.y-p.y)>=80);
});
