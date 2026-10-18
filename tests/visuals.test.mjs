import {test} from 'node:test';
import assert from 'node:assert/strict';
import {updatePlayer} from '../dist/core.mjs';
import {chargeWalkFrame,chargeAuraAlpha,bladeZone} from '../dist/visuals.mjs';
const p=()=>({x:250,y:410,distance:0,facing:'down',moving:false,animTime:0});
test('charge walking uses actual distance, cycles all four frames and turns toward movement',()=>{
 const a=p(),frames=new Set();for(let i=0;i<90;i++){updatePlayer(a,{x:1,y:0},1/60,{speedScale:.42});frames.add(chargeWalkFrame(a));assert.equal(a.actualMoving,true);}
 assert.deepEqual([...frames].sort(),[0,1,2,3]);assert.equal(a.facing,'right');
 const last=chargeWalkFrame(a);updatePlayer(a,{x:0,y:0},.2,{speedScale:.42});assert.equal(a.actualMoving,false);assert.equal(chargeWalkFrame(a),last);
});
test('pushing into scenery stops charge foot animation instead of sliding',()=>{
 const a={...p(),x:600,y:400};for(let i=0;i<120;i++)updatePlayer(a,{x:0,y:-1},1/60,{speedScale:.42});assert.equal(a.actualMoving,false);
 const distance=a.distance;for(let i=0;i<30;i++)updatePlayer(a,{x:0,y:-1},1/60,{speedScale:.42});assert.equal(a.distance,distance);
});
test('sword aura keeps pulsing after full charge for any hold duration',()=>{
 for(const ratio of [0,.4,1])for(const start of [0,3,60]){const values=Array.from({length:30},(_,i)=>chargeAuraAlpha(start+i/60,ratio));assert.ok(Math.max(...values)-Math.min(...values)>.35);assert.ok(values.every(v=>v>0&&v<=1));}
});
test('aura masks target the blade region for each facing',()=>{
 const x=80,y=112;assert.ok(bladeZone('left',x,y).x<x);assert.ok(bladeZone('right',x,y).x>x);assert.ok(bladeZone('up',x,y).y<y-54);assert.ok(bladeZone('down',x,y).y+bladeZone('down',x,y).h>y);
});
