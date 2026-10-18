import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {START,SPIDER_ZONE} from '../dist/core.mjs';
import {SPIDER,SPIDER_TYPES,createSpiders,advanceSpiderSpawns,advanceSpidersAfterWebDefeat,spiderPopulation,spiderAtlasFrame,handleSpiderDefeats} from '../dist/spiders.mjs';

function scene(type='weaver',p={x:-474,y:260}){
  const s=createSpiders();advanceSpiderSpawns(s,.5,START);s.entities=[s.entities[0]];s.points.forEach(p=>p.timer=1000);
  const e=s.entities[0];Object.assign(e,{type,radius:SPIDER_TYPES[type].radius,x:p.x+20,y:p.y,windup:.4,recoverTime:.2,spawnShield:0});
  s.shots=[{id:'old-web',x:p.x,y:p.y,vx:1,vy:0,age:0,travelled:0}];return{s,e,p};
}
test('after Webbed Game Over both spider species cancel attacks and walk away from Burnice',()=>{
  for(const type of Object.keys(SPIDER_TYPES)){
    const {s,e,p}=scene(type),position={...p};advanceSpidersAfterWebDefeat(s,.1,p);assert.equal(e.windup,0);assert.equal(e.recoverTime,0);assert.equal(s.shots.length,0);assert.ok(e.x>p.x+20);assert.equal(e.moving,true);assert.equal(e.facing,'right');assert.ok(spiderAtlasFrame(e)%8<4);
    for(let i=0;i<120;i++)advanceSpidersAfterWebDefeat(s,.05,p);assert.equal(e.webRetreat,false);assert.ok(Math.hypot(e.x-p.x,e.y-p.y)>=SPIDER.bodyClearance);assert.deepEqual(p,position);
  }
});
test('a spider exactly on the player finds a deterministic exit instead of sticking to the body',()=>{
  const {s,e,p}=scene();Object.assign(e,{x:p.x,y:p.y});for(let i=0;i<150;i++)advanceSpidersAfterWebDefeat(s,.05,p);assert.equal(e.webRetreat,false);assert.ok(Math.hypot(e.x-p.x,e.y-p.y)>=SPIDER.bodyClearance);
});
test('retreat can slide out along arena edges and corners without leaving the yard',()=>{
  for(const [p,x,y] of [[{x:-530,y:200},-552,180],[{x:-66,y:400},-44,400]]){
    const {s,e}=scene('weaver',p);Object.assign(e,{x,y});for(let i=0;i<240;i++)advanceSpidersAfterWebDefeat(s,.05,p);
    assert.equal(e.webRetreat,false);assert.ok(Math.hypot(e.x-p.x,e.y-p.y)>=SPIDER.bodyClearance);assert.ok(e.x>=SPIDER_ZONE.x+e.radius&&e.x<=SPIDER_ZONE.x+SPIDER_ZONE.w-e.radius);assert.ok(e.y>=SPIDER_ZONE.y+e.radius&&e.y<=SPIDER_ZONE.y+SPIDER_ZONE.h-e.radius);
  }
});
test('after retreat the spiders choose new wandering targets and keep a clear area around the player',()=>{
  const {s,e,p}=scene(),targets=new Set(),positions=new Set();for(let i=0;i<1000;i++){
    advanceSpidersAfterWebDefeat(s,.05,p);if(!e.webRetreat){assert.ok(Math.hypot(e.x-p.x,e.y-p.y)>=SPIDER.bodyClearance-.001);if(e.roamTarget)targets.add(`${e.roamTarget.x},${e.roamTarget.y}`);positions.add(`${Math.round(e.x)},${Math.round(e.y)}`);}assert.equal(e.windup,0);assert.equal(s.shots.length,0);
  }
  assert.ok(targets.size>3);assert.ok(positions.size>30);
});
test('post-defeat movement respects blocking scenery and rocks while leaving the body area',()=>{
  const {s,e,p}=scene('hunter'),wall={x:p.x+34,y:p.y-70,w:16,h:140};
  for(let i=0;i<160;i++){advanceSpidersAfterWebDefeat(s,.05,p,{obstacles:[wall]});assert.ok(!(e.x+e.radius>wall.x&&e.x-e.radius<wall.x+wall.w&&e.y+e.radius*.5>wall.y&&e.y-e.radius*.5<wall.y+wall.h));}
  assert.ok(Math.hypot(e.x-p.x,e.y-p.y)>=SPIDER.bodyClearance);
});
test('the live arena keeps its spawn caps, finishes old death effects and never shoots after Webbed defeat',()=>{
  const s=createSpiders(),p={x:-60,y:410};advanceSpiderSpawns(s,1,START);const old=s.entities[0];old.hp=0;handleSpiderDefeats(s,[{id:old.id,killed:true}]);
  for(let i=0;i<700;i++){advanceSpidersAfterWebDefeat(s,.05,p);assert.ok(s.points.every(point=>spiderPopulation(s,point.id)<=2));assert.equal(s.shots.length,0);assert.ok(s.entities.every(e=>e.windup===0));}
  assert.equal(spiderPopulation(s),8);assert.ok(!s.entities.includes(old));assert.equal(new Set(s.entities.map(e=>e.id)).size,s.entities.length);assert.equal(createSpiders().entities.length,0);
});
test('v14 selects stronger, denser-silk poses with fixed head scale and matching quiet rest transition',()=>{
  const base=new URL('../dist/assets/',import.meta.url),m=JSON.parse(fs.readFileSync(new URL('spiders-v14-atlas.json',base)));
  assert.equal(Object.values(m.sequences).reduce((n,s)=>n+s.length,0),100);assert.ok(m.sources.every(s=>fs.existsSync(new URL(s,base))));
  for(const [name,count] of [['burnice-webbed2',12],['burnice-webbed-rest',8]]){
    const seq=m.sequences[name];assert.equal(seq.length,count);for(const f of seq){assert.equal(f.image,`${name}-v14-atlas.png`);assert.deepEqual(f.anchor,[80,112]);assert.ok(fs.existsSync(new URL(f.file,base)));}
  }
  assert.deepEqual(fs.readFileSync(new URL(m.sequences['burnice-webbed2'][11].file,base)),fs.readFileSync(new URL(m.sequences['burnice-webbed-rest'][0].file,base)));
  assert.equal(new Set(m.sequences['burnice-webbed2'].map(f=>crypto.createHash('sha256').update(fs.readFileSync(new URL(f.file,base))).digest('hex'))).size,12);assert.ok(m.secondWebbedCalibration.headWidths.every(w=>w===40));
  assert.ok(m.visualComparison.v14.struggleHeightSpan>m.visualComparison.v13.struggleHeightSpan);assert.ok(m.visualComparison.v14.meanWhitePixels>m.visualComparison.v13.meanWhitePixels);
});
