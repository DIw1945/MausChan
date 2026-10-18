import {COFFIN_DRAG,createCoffinDrag,advanceCoffinDrag,coffinDragPose,coffinDragHop} from './mummy-coffin-drag.mjs?v=34';
import {createCombatSfx} from './combat-sfx.mjs?v=33';
import {MUMMIFIELD,createMummifield,advanceMummifield,struggleMummifield,mummifieldFrame,mummyEscapePresses,mummifieldPose} from './mummifield.mjs?v=34';
import {WORLD,START,SOLIDS,TREE_POSITIONS,TRAINING_ZONE,SPIDER_ZONE,MUMMY_ZONE,updatePlayer,animationFrame} from './core.mjs?v=18';
import {COMBAT,createCombat,pressAttack,releaseAttack,cancelAttack,advanceCombat,chargeRatio,attackFrame,createDummies,dummyObstacles,resolveHits,updateDummies} from './combat.mjs?v=12';
import {chargeWalkFrame,chargeAuraAlpha,bladeZone} from './visuals.mjs?v=8';
import {createHealth,advanceHealth,updateShooter,updateProjectiles,hurtFrame,heartFill} from './health.mjs?v=18';
import {DEFEAT_HEAD,advanceDefeat,defeatPose,starOrbit} from './defeat.mjs?v=8';
import {FIRE,fullHearts,createSwordFire,emitSwordFire,updateSwordFire,waveFrame,ringPose} from './fire.mjs?v=18';
import {NITRO,NITRO_CUP,createNitro,canUseNitro,startNitro,advanceNitro,nitroPose,collectNitro,rollNitroDrop,heartAmount} from './nitro.mjs?v=8';
import {BOMB,createBombs,rockObstacles,canUseBomb,collectBombs,placeBomb,advanceBombs,advanceBombEffects,bombFuseFrame,bombBlastFrame,rockBreakFrame} from './bombs.mjs?v=12';
import {SLIME,SLIME_TYPES,createSlimes,createSticky,insideTraining,pointPopulation,advanceSlimes,advanceSlimesAfterDefeat,handleSlimeDefeats,advanceSticky,struggleSticky,stickyFrame,slimeFrame,slimePopFrame} from './slimes.mjs?v=23';
import {SPIDER,SPIDER_TYPES,SPIDER_DIRECTIONS,WEB,createSpiders,createWebbed,insideSpiderYard,spiderPopulation,advanceSpiders,advanceSpidersAfterDefeat,handleSpiderDefeats,advanceWebbed,struggleWebbed,webEscapePresses,webbedPose,webShotFrame,spiderAtlasFrame} from './spiders.mjs?v=23';

import {MUMMY,createMummies,mummyPopulation,insideMummyYard,advanceMummies,advanceMummiesAfterDefeat,handleMummyDefeats,mummyAtlasFrame,mummyShotFrame} from './mummies.mjs?v=34';

const $=id=>document.getElementById(id);
const canvas=$('game'), ctx=canvas.getContext('2d',{alpha:false}), viewport=$('viewport');
const atlas=new Image();
const treeAtlas=new Image(),spiderNestAtlas=new Image(),mummyCoffinAtlas=new Image(),mummyAtlas=new Image(),bandageAtlas=new Image();
const mummies=createMummies();
const slashAtlas=new Image(),chargeAtlas=new Image(),dummyAtlas=new Image();
const chargeWalkAtlas=new Image(),auraFrames={idle:{},walk:{}};
const hurtAtlas=new Image(),shooterAtlas=new Image(),projectileAtlas=new Image();
const dizzyAtlas=new Image(),collapseAtlas=new Image(),restAtlas=new Image(),starsAtlas=new Image();
const fireWaveAtlas=new Image(),fireRingAtlas=new Image();
const nitroFetchAtlas=new Image(),nitroSipAtlas=new Image(),nitroCheerAtlas=new Image(),nitroItemAtlas=new Image(),nitroSparkleAtlas=new Image();
const nitroAtlases={fetch:nitroFetchAtlas,sip:nitroSipAtlas,cheer:nitroCheerAtlas};
const bombAtlas=new Image(),bombBlastAtlas=new Image(),brittleRockAtlas=new Image();
const bombs=createBombs();
const slimes=createSlimes(),sticky=createSticky();
const spiders=createSpiders(),webbed=createWebbed();
const mummifield=createMummifield(),mummifieldAtlas=new Image();
const mummyDragAtlas=new Image(),mummyCoffinPullAtlas=new Image();
const combatSfx=createCombatSfx();
const mummifieldAtlases={first:mummifieldAtlas,second:new Image(),fall:new Image(),transition:new Image(),capture:new Image()};
const mummyGameOver=()=>health.dead&&mummifield.failed;
const bound=()=>sticky.bound||webbed.bound||mummifield.bound;
const spiderAtlases={weaver:new Image(),hunter:new Image()},webShotAtlas=new Image(),webbedAtlas=new Image();
const webbedAtlases={first:webbedAtlas,second:new Image(),rest:new Image()};
const webGameOver=()=>health.dead&&webbed.failed;
const gameOverVisible=()=>health.dead&&(mummifield.failed?mummifieldPose(mummifield).gameOver:webbed.failed||defeatPose(health.deathTime).gameOver);
const slimeAtlases={normal:new Image(),big:new Image(),swift:new Image()},slimePopAtlas=new Image(),stickyAtlas=new Image();
const defeatAtlases={spin:dizzyAtlas,collapse:collapseAtlas,rest:restAtlas};
const health=createHealth();let projectiles=[],lastHP=-1;
const combat=createCombat();
const swordFire=createSwordFire();
const nitro=createNitro();let noticeText='',noticeTime=0;
let dummies=createDummies(),damageEvents=[],sceneTime=0,shake=0;
const attackSources=new Set();
const row={down:0,left:1,right:2,up:3};
const names={down:'หันลง',left:'หันซ้าย',right:'หันขวา',up:'หันขึ้น'};
const player={...START,facing:'down',moving:false,actualMoving:false,wasMoving:false,animTime:0,distance:0};
let ready=false, camera={x:0,y:0}, cameraZoom=1, keys=new Set(), joy={x:0,y:0}, previewAction='walk', previewPaused=false, previewTime=0;
let previousTime=0, uiTime=0, hintGone=false;
const world=document.createElement('canvas');world.width=WORLD.width;world.height=WORLD.height;
const g=world.getContext('2d');g.imageSmoothingEnabled=false;g.translate(-WORLD.left,-WORLD.top);
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
let seed=45;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const grass=['#7e984e','#829c52','#78924a','#81994e'];
for(let y=0;y<WORLD.top+WORLD.height;y+=32)for(let x=0;x<WORLD.left+WORLD.width;x+=32){
  rect(g,x,y,32,32,grass[Math.floor(rnd()*grass.length)]);
  for(let i=0;i<8;i++){const px=x+Math.floor(rnd()*30),py=y+Math.floor(rnd()*30);rect(g,px,py,2,1,rnd()>.5?'#97ad60':'#6c8844');}
}
function path(x,y,w,h){
  rect(g,x,y,w,h,'#b6a16b');rect(g,x+3,y+3,w-6,h-6,'#c7b37c');
  for(let i=0;i<w*h/75;i++){const px=x+4+Math.floor(rnd()*(w-8)),py=y+4+Math.floor(rnd()*(h-8));rect(g,px,py,2+Math.floor(rnd()*3),1,rnd()>.5?'#d8c58c':'#b6a16c');}
  for(let i=0;i<w;i+=17){rect(g,x+i,y-2,7,3,'#879b51');rect(g,x+i+8,y+h-1,5,3,'#81984c');}
}
path(60,331,668,157);path(436,460,91,240);path(525,388,240,80);
path(665,303,65,155);
// Walk east from the original yard into the adjoining slime practice arena.
path(916,350,148,182);path(TRAINING_ZONE.x,TRAINING_ZONE.y,TRAINING_ZONE.w,TRAINING_ZONE.h);
rect(g,1040,138,570,5,'#5f6e42');rect(g,1040,650,570,5,'#5f6e42');
for(let x=1064;x<1596;x+=32){rect(g,x,174,14,1,'#dac58e');rect(g,x,615,14,1,'#dac58e');}
// Long quiet lane at the edge of the yard.
rect(g,42,654,940,62,'#777a60');rect(g,42,658,940,52,'#8b8c70');
for(let x=42;x<982;x+=32){rect(g,x,655,30,2,'#b3ad84');rect(g,x,708,30,2,'#656c55');}
for(let x=62;x<982;x+=50)rect(g,x,683,19,2,'#c5bc89');
// Patio paving and a small station foundation.
rect(g,550,365,258,35,'#6f7754');
for(let y=366;y<399;y+=12)for(let x=551;x<806;x+=24){rect(g,x+(y%24?0:12),y,22,10,'#999779');rect(g,x+1,y,20,1,'#b7b08a');}
// Pond: irregular block silhouette, grass fringe, sandy rim.
rect(g,750,411,146,138,'#627b40');rect(g,727,433,192,93,'#627b40');
rect(g,747,417,151,126,'#c8bc86');rect(g,734,432,178,97,'#c8bc86');
rect(g,749,425,145,109,'#4f9190');rect(g,742,439,161,82,'#4f9190');
rect(g,759,435,127,90,'#5aa5a0');rect(g,752,447,141,63,'#5aa5a0');
for(let i=0;i<38;i++){const x=759+rnd()*121,y=443+rnd()*68;rect(g,x,y,7+rnd()*8,1,'#7fbab0');}
for(const [x,y] of [[772,466],[862,506],[852,446]]){rect(g,x,y,11,5,'#4e8647');rect(g,x+3,y-2,8,3,'#83a25b');rect(g,x+7,y,3,2,'#c4ce80');}
// Pebbles, meadow clumps and tiny flowers.
for(let i=0;i<290;i++){
  const x=56+rnd()*910,y=75+rnd()*558;
  if((y>323&&y<495&&x<732)||(x>674&&y<333)||(x>720&&y>400)||(x>422&&x<541&&y>455))continue;
  if(i%4===0){rect(g,x,y,3,3,'#586f3b');rect(g,x-1,y-2,2,3,'#a0b65d');rect(g,x+3,y-1,2,3,'#a0b65d');}
  else if(i%5===0){rect(g,x,y,3,2,'#dbcb87');rect(g,x+1,y-1,1,4,'#eddda3');}
  else {rect(g,x,y,2,2,'#657f40');rect(g,x+1,y-3,1,3,'#9aaf60');}
}
function bush(x,y){rect(g,x-14,y-7,29,15,'#47633b');rect(g,x-11,y-12,23,18,'#527740');rect(g,x-6,y-15,13,15,'#638847');rect(g,x-9,y-9,4,3,'#78994f');rect(g,x+4,y-8,5,3,'#78994f');rect(g,x-10,y+6,23,2,'#3f5d37');}
for(let x=59;x<970;x+=30){if(x<400||x>558)bush(x,57);if(x<400||x>558)bush(x,737);}
for(let y=98;y<711;y+=32){if(y<336||y>532)bush(27,y);if(y<336||y>532)bush(999,y);bush(1640,y);}
// Wooden fence.
function fence(x,y,w){rect(g,x,y-12,w,4,'#766b41');rect(g,x,y-4,w,3,'#726039');for(let p=x;p<x+w;p+=28){rect(g,p,y-20,7,28,'#625539');rect(g,p,y-19,5,25,'#b8a071');rect(g,p,y-20,5,3,'#cfb684');rect(g,p+5,y-16,2,23,'#86734a');}}
fence(48,89,352);fence(558,89,405);fence(47,711,350);fence(566,711,407);
fence(1040,148,570);fence(1040,652,570);
// Extend west without moving any coordinates or random scenery in the old yard.
for(let y=0;y<WORLD.top+WORLD.height;y+=32)for(let x=WORLD.left;x<0;x+=32){
  rect(g,x,y,32,32,grass[Math.floor(rnd()*grass.length)]);
  for(let i=0;i<8;i++)rect(g,x+Math.floor(rnd()*30),y+Math.floor(rnd()*30),2,1,'#6c8844');
}
path(-44,350,140,182);path(SPIDER_ZONE.x,SPIDER_ZONE.y,SPIDER_ZONE.w,SPIDER_ZONE.h);
rect(g,-586,138,570,5,'#58615e');rect(g,-586,650,570,5,'#58615e');
fence(-586,148,570);fence(-586,652,570);
for(let y=98;y<711;y+=32)bush(-620,y);
// Extend north without moving the old world's objects or consuming its terrain seed.
for(let y=WORLD.top;y<0;y+=32)for(let x=WORLD.left;x<WORLD.left+WORLD.width;x+=32){
  rect(g,x,y,32,32,grass[Math.floor(rnd()*grass.length)]);
  for(let i=0;i<5;i++)rect(g,x+Math.floor(rnd()*30),y+Math.floor(rnd()*30),2,1,'#9bab65');
}
path(400,-112,158,238);path(MUMMY_ZONE.x,MUMMY_ZONE.y,MUMMY_ZONE.w,MUMMY_ZONE.h);
// Sandstone border and an open south entrance into the garden.
rect(g,202,-592,580,20,'#7b7057');rect(g,205,-589,574,10,'#cfbb86');
for(const x of [202,766]){rect(g,x,-572,16,472,'#86785b');rect(g,x+3,-570,9,468,'#c9b88a');}
for(const [x,w] of [[202,198],[558,224]]){rect(g,x,-100,w,16,'#86785b');rect(g,x+3,-97,w-6,8,'#c9b88a');}
for(const x of [384,558]){rect(g,x,-100,16,162,'#7b7057');rect(g,x+3,-98,9,158,'#c9b88a');}
for(let x=240;x<750;x+=36)for(let y=-540;y<-130;y+=36)rect(g,x,y,14,1,'#dfcc98');
// Misc static ground details.
rect(g,372,449,43,4,'#9d8f62');rect(g,380,454,30,2,'#b2a16d');
const objects=[];
const add=(y,draw)=>objects.push({y,draw});
function drawTree(p,x,y,variant){p.drawImage(treeAtlas,variant*96,0,96,112,Math.round(x)-48,Math.round(y)-96,96,112);}
function tree(x,y,variant){add(y,()=>{
  ctx.fillStyle='#30482c44';ctx.beginPath();ctx.ellipse(x+3,y+3,32,10,0,0,Math.PI*2);ctx.fill();
  drawTree(ctx,x,y,variant);
});}
TREE_POSITIONS.forEach(([x,y],i)=>tree(x,y,i%4));
function bench(x,y){add(y+12,()=>{rect(ctx,x-4,y+6,88,10,'#42533344');rect(ctx,x+3,y,5,19,'#4d5138');rect(ctx,x+66,y,5,19,'#4d5138');rect(ctx,x-3,y-21,82,7,'#84683f');rect(ctx,x-3,y-20,80,3,'#bf985d');rect(ctx,x-3,y-11,82,6,'#b08b52');rect(ctx,x-6,y-2,87,10,'#805e39');rect(ctx,x-6,y-2,87,3,'#d1ab6c');rect(ctx,x+2,y+2,72,2,'#b58d52');rect(ctx,x-8,y-6,5,6,'#51543a');rect(ctx,x+78,y-6,5,6,'#51543a');});}
bench(126,292);bench(570,522);
function barrel(x,y){add(y+8,()=>{rect(ctx,x-10,y-25,23,32,'#462f26');rect(ctx,x-12,y-22,26,28,'#a44e36');rect(ctx,x-9,y-21,4,27,'#c9673e');rect(ctx,x+8,y-21,4,27,'#7c392b');rect(ctx,x-13,y-18,28,4,'#444d41');rect(ctx,x-13,y,28,4,'#424b40');rect(ctx,x-10,y-26,23,6,'#dd8b47');rect(ctx,x-8,y-26,19,2,'#f2b363');rect(ctx,x+4,y-24,4,2,'#765634');});}
barrel(323,192);barrel(363,192);
// The little Nitro rest stop.
add(386,()=>{
  ctx.save();ctx.translate(-128,160);
  rect(ctx,681,219,257,15,'#3d513638');
  rect(ctx,691,100,231,124,'#785c3d');rect(ctx,700,109,212,112,'#d2bb82');
  rect(ctx,700,158,211,59,'#b29a66');for(let x=702;x<912;x+=19)rect(ctx,x,164,1,51,'#a28958');
  rect(ctx,776,159,38,65,'#3f4c39');rect(ctx,782,162,27,58,'#59674b');rect(ctx,802,190,3,4,'#efbd64');
  for(const x of [712,840]){rect(ctx,x,155,52,35,'#675235');rect(ctx,x+4,159,44,26,'#5b7a6c');rect(ctx,x+7,160,5,20,'#8dad91');rect(ctx,x+27,159,3,26,'#c9ae72');rect(ctx,x+4,171,44,3,'#c9ae72');rect(ctx,x-3,189,58,5,'#e2c68c');}
  // Tiled roof.
  rect(ctx,680,89,252,66,'#613f31');rect(ctx,688,79,235,65,'#b9653d');
  for(let y=80;y<143;y+=13)for(let x=689;x<924;x+=26){rect(ctx,x,y,24,10,'#c77845');rect(ctx,x+2,y+1,20,2,'#dc9556');rect(ctx,x+1,y+9,24,2,'#9b5136');}
  rect(ctx,681,141,252,9,'#673d2e');rect(ctx,683,140,248,3,'#e39a59');
  rect(ctx,730,104,150,29,'#3d4937');rect(ctx,733,107,144,23,'#293c31');rect(ctx,734,108,142,2,'#93a066');
  ctx.fillStyle='#f3d98d';ctx.font='bold 17px monospace';ctx.textAlign='center';ctx.fillText('NITRO',805,125);ctx.textAlign='left';
  // Striped awning.
  rect(ctx,704,147,206,13,'#eecc83');for(let x=704;x<910;x+=28)rect(ctx,x,147,14,13,'#b65035');rect(ctx,702,158,210,4,'#765337');
  rect(ctx,701,162,4,61,'#5c583b');rect(ctx,909,162,4,61,'#5c583b');
  rect(ctx,778,222,38,4,'#d1c38a');
  ctx.restore();
});
// A noticeboard beside the lane is only scenery.
add(593,()=>{rect(ctx,555,576,4,22,'#775e3c');rect(ctx,586,576,4,22,'#775e3c');rect(ctx,548,550,50,31,'#6a5136');rect(ctx,552,554,42,23,'#d0b57a');rect(ctx,557,558,14,13,'#e6d49d');rect(ctx,576,560,12,2,'#987a4d');rect(ctx,576,566,9,2,'#987a4d');});
add(354,()=>{rect(ctx,940,325,4,30,'#715b37');rect(ctx,920,307,82,27,'#614d35');rect(ctx,923,310,76,21,'#d2bb80');ctx.fillStyle='#35482e';ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillText('SLIME YARD →',961,324);ctx.textAlign='left';});
add(354,()=>{rect(ctx,65,325,4,30,'#715b37');rect(ctx,32,307,100,27,'#614d35');rect(ctx,35,310,94,21,'#d2bb80');ctx.fillStyle='#433c58';ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillText('← SPIDER YARD',82,324);ctx.textAlign='left';});

add(144,()=>{rect(ctx,312,112,5,28,'#715b37');rect(ctx,300,89,109,27,'#614d35');rect(ctx,303,92,103,21,'#d2bb80');ctx.fillStyle='#433c31';ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillText('↑ MUMMY YARD',354,106);ctx.textAlign='left';});

function resize(){const r=viewport.getBoundingClientRect();canvas.width=r.width<700?384:640;canvas.height=Math.round(canvas.width*r.height/r.width);ctx.imageSmoothingEnabled=false;snapCamera();}
function targetCamera(){const w=canvas.width/cameraZoom,h=canvas.height/cameraZoom;return{x:Math.max(WORLD.left,Math.min(WORLD.left+WORLD.width-w,player.x-w/2)),y:Math.max(WORLD.top,Math.min(WORLD.top+WORLD.height-h,player.y-h*.55))};}
function snapCamera(){camera=targetCamera();}
new ResizeObserver(resize).observe(viewport);
function makeAura(image,sx,sy,size,facing,ax,ay){
  const c=document.createElement('canvas');c.width=size;c.height=size;
  const p=c.getContext('2d');p.drawImage(image,sx,sy,size,size,0,0,size,size);
  const pixels=p.getImageData(0,0,size,size),zone=bladeZone(facing,ax,ay);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4,r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];
    const inBlade=x>=zone.x&&x<zone.x+zone.w&&y>=zone.y&&y<zone.y+zone.h;
    const gold=r>145&&g>75&&b<g*.8,silver=r>150&&g>135&&b>110;
    if(!inBlade||!(gold||silver))pixels.data[i+3]=0;
    else{pixels.data[i]=255;pixels.data[i+1]=188;pixels.data[i+2]=55;}
  }
  p.putImageData(pixels,0,0);return c;
}
function prepareAuras(){for(const facing of Object.keys(row)){
  auraFrames.idle[facing]=[0,1].map(f=>makeAura(chargeAtlas,row[facing]*96,f*96,96,facing,48,75));
  auraFrames.walk[facing]=[0,1,2,3].map(f=>makeAura(chargeWalkAtlas,f*160,row[facing]*160,160,facing,80,112));
}}
function drawAura(p,image,x,y,alpha){
  p.save();p.globalCompositeOperation='lighter';p.globalAlpha=alpha*.24;
  for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])p.drawImage(image,x+dx,y+dy);
  p.globalAlpha=alpha*.9;p.drawImage(image,x,y);p.restore();
}
function drawDefeat(p,x,y,pose,time){
  p.drawImage(defeatAtlases[pose.stage],pose.frame%4*160,Math.floor(pose.frame/4)*160,160,160,x-80,y-112,160,160);
  if(pose.stars)for(const star of starOrbit(time,x+DEFEAT_HEAD.x,y+DEFEAT_HEAD.y)){
    p.save();p.globalAlpha=star.alpha;
    p.drawImage(starsAtlas,star.frame*16,0,16,16,Math.round(star.x)-8,Math.round(star.y)-8,16,16);p.restore();
  }
}
function drawSwordWave(p,w){
  const f=waveFrame(w.age);p.save();p.translate(Math.round(w.x),Math.round(w.y-24));p.rotate(w.angle);
  p.globalAlpha=Math.min(1,(w.range-w.travelled)/45);
  p.drawImage(fireWaveAtlas,f%4*64,Math.floor(f/4)*64,64,64,-32,-32,64,64);p.restore();
}
function drawFireRing(p,ring){
  const {frame,size,alpha}=ringPose(ring.age),height=Math.round(size*.65);p.save();p.globalAlpha=alpha;
  p.drawImage(fireRingAtlas,frame%4*128,Math.floor(frame/4)*128,128,128,Math.round(ring.x-size/2),Math.round(ring.y-height/2),size,height);p.restore();
}
function drawNitro(p,x,y,pose,time){
  p.drawImage(nitroAtlases[pose.stage],pose.frame%4*160,Math.floor(pose.frame/4)*160,160,160,x-80,y-112,160,160);
  if(pose.sparkle){const cup=NITRO_CUP[pose.frame],f=Math.floor(time*10)%4;
    p.drawImage(nitroSparkleAtlas,f*24,0,24,24,x+cup[0]-4,y+cup[1]-18,24,24);
  }
}
function drawNitroDrop(d){
  const bob=Math.round(Math.sin(sceneTime*3+d.id)*2),f=Math.floor(sceneTime*4)%4;
  ctx.fillStyle='#fff0a433';ctx.beginPath();ctx.ellipse(d.x,d.y,13,4,0,0,Math.PI*2);ctx.fill();
  ctx.drawImage(nitroItemAtlas,f*32,0,32,32,Math.round(d.x)-16,Math.round(d.y)-26+bob,32,32);
  ctx.fillStyle='#fff3c6';ctx.strokeStyle='#38412c';ctx.lineWidth=2;ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.strokeText('NITRO +1',d.x,d.y+10);ctx.fillText('NITRO +1',d.x,d.y+10);ctx.textAlign='left';
}
function drawBombSprite(p,x,y,frame){p.drawImage(bombAtlas,frame*64,0,64,64,x-32,y-50,64,64);}
function drawBombDrop(d){
  const bob=Math.round(Math.sin(sceneTime*3+d.id)*2);drawBombSprite(ctx,Math.round(d.x),Math.round(d.y)+bob,0);
  ctx.font='bold 6px monospace';ctx.textAlign='center';ctx.lineWidth=2;ctx.strokeStyle='#28352b';ctx.fillStyle='#ffe3a5';ctx.strokeText('BOMB +1',d.x,d.y+10);ctx.fillText('BOMB +1',d.x,d.y+10);ctx.textAlign='left';
}
function drawBombWarning(b){
  ctx.save();ctx.fillStyle='#e96729';ctx.globalAlpha=.12;ctx.beginPath();ctx.arc(b.x,b.y,BOMB.radius,0,Math.PI*2);ctx.fill();ctx.strokeStyle=b.time>BOMB.fuse*.65?'#fff1b2':'#ffd581';ctx.globalAlpha=.7+.2*Math.sin(sceneTime*12);ctx.lineWidth=1;ctx.setLineDash([4,3]);ctx.stroke();ctx.restore();
}
function drawPlacedBomb(b){
  drawBombSprite(ctx,Math.round(b.x),Math.round(b.y),bombFuseFrame(b.time));
  rect(ctx,b.x-12,b.y-43,24,3,'#293124');rect(ctx,b.x-11,b.y-42,Math.ceil(22*(1-b.time/BOMB.fuse)),1,'#ffbe65');
}
function drawBombBlast(p,x,y,age){const frame=bombBlastFrame(age);p.drawImage(bombBlastAtlas,frame%4*192,Math.floor(frame/4)*192,192,192,x-96,y-96,192,192);}
function drawBrittleRock(p,rock,frame=rock.state==='intact'?0:rockBreakFrame(rock.age)){
  p.drawImage(brittleRockAtlas,frame%4*96,Math.floor(frame/4)*96,96,96,rock.x-48,rock.y-76,96,96);
}
function drawMummifield(p,x,y,time,status={tier:1}){const {sequence,frame:f}=mummifieldPose({...status,time});p.drawImage(mummifieldAtlases[sequence],f%4*160,Math.floor(f/4)*160,160,160,x-80,y-112,160,160);}
function drawSticky(p,x,y,time){const frame=stickyFrame(time);p.drawImage(stickyAtlas,frame%4*160,Math.floor(frame/4)*160,160,160,x-80,y-112,160,160);}
function drawWebbed(p,x,y,status){const {sequence,frame:f}=webbedPose(status);p.drawImage(webbedAtlases[sequence],f%4*160,Math.floor(f/4)*160,160,160,x-80,y-112,160,160);}
function drawWebShot(p,shot){const f=webShotFrame(shot.age);p.drawImage(webShotAtlas,f*32,0,32,32,Math.round(shot.x)-16,Math.round(shot.y)-16,32,32);}
function drawBandage(p,shot){
  const f=mummyShotFrame(shot.age);p.save();p.translate(Math.round(shot.x),Math.round(shot.y-22));p.rotate(Math.atan2(shot.vy,shot.vx));
  p.drawImage(bandageAtlas,f*64,0,64,32,-32,-16,64,32);p.restore();
}
function drawMummyPads(){
  const drag=mummifield.coffinDrag,pose=coffinDragPose(drag);
  for(const point of mummies.points){
    if(drag&&point.id===drag.coffin.id&&pose.stage!=='fall'&&pose.stage!=='done'){
      const f=pose.coffinFrame;ctx.drawImage(mummyCoffinPullAtlas,f%4*112,Math.floor(f/4)*112,112,112,Math.round(point.x)-70,Math.round(point.y)-100,140,140);continue;
    }
    const phase=Math.floor(sceneTime*3+point.id*2)%6,frame=phase<4?phase:6-phase;
    ctx.drawImage(mummyCoffinAtlas,frame*112,0,112,112,Math.round(point.x)-70,Math.round(point.y)-100,140,140);
  }
  drawCoffinTethers(ctx,drag,pose);
  ctx.fillStyle='#efe1b3';ctx.font='bold 15px monospace';ctx.textAlign='center';ctx.fillText('MUMMY TRAINING',492,-610);ctx.font='7px monospace';ctx.fillText('HEAVY GUARDIANS · CLAWS & BANDAGES',492,-597);ctx.textAlign='left';
}
// A single compact, text-free warning above the sprite, only during windup.
function drawAttackWarning(p,x,y){
  x=Math.round(x);y=Math.round(y);p.save();p.fillStyle='#f2c579';p.strokeStyle='#493e32';p.lineWidth=1;
  p.beginPath();p.moveTo(x,y-6);p.lineTo(x+5,y);p.lineTo(x,y+6);p.lineTo(x-5,y);p.closePath();p.fill();p.stroke();
  p.fillStyle='#493e32';p.fillRect(x-1,y-3,2,4);p.fillRect(x-1,y+2,2,2);p.restore();
}
function drawMummy(e){
  const x=Math.round(e.x),y=Math.round(e.y),dead=e.hp<=0,f=mummyAtlasFrame(e);ctx.save();
  ctx.globalAlpha=dead?Math.max(0,1-e.deathAge/MUMMY.deathDuration):Math.min(1,e.age/.3)*(e.hitTime<.18?.5:1);
  ctx.fillStyle='#4b403a55';ctx.beginPath();ctx.ellipse(x,y,15,5,0,0,Math.PI*2);ctx.fill();
  ctx.drawImage(mummyAtlas,f%4*160,Math.floor(f/4)*160,160,160,x-80,y-112,160,160);ctx.restore();
  if(!dead&&e.windup>0)drawAttackWarning(ctx,x,y-76);
  if(!dead&&e.hp<e.maxHP){rect(ctx,x-19,y-63,38,4,'#4b3f35');rect(ctx,x-18,y-62,Math.round(36*e.hp/e.maxHP),2,'#e1c38a');}
}
function drawSpiderPads(){
  for(const point of spiders.points)ctx.drawImage(spiderNestAtlas,0,0,96,64,Math.round(point.x)-60,Math.round(point.y)-50,120,80);
  ctx.fillStyle='#ded4f0';ctx.font='bold 15px monospace';ctx.textAlign='center';ctx.fillText('SPIDER TRAINING',-300,117);ctx.font='7px monospace';ctx.fillText('PURPLE WEAVER · ORANGE HUNTER',-300,131);ctx.textAlign='left';
}
function drawSpider(e){
  const x=Math.round(e.x),y=Math.round(e.y),dead=e.hp<=0,f=dead?Math.max(0,SPIDER_DIRECTIONS.indexOf(e.facing))*8+7:spiderAtlasFrame(e);ctx.save();
  ctx.globalAlpha=dead?Math.max(0,1-e.deathAge/SPIDER.deathDuration):Math.min(1,e.age/.3)*(e.hitTime<.18?.5:1);
  ctx.drawImage(spiderAtlases[e.type],f%4*96,Math.floor(f/4)*96,96,96,x-48,y-64,96,96);ctx.restore();
  if(!dead&&e.windup>0)drawAttackWarning(ctx,x,y-52);
  if(!dead&&e.hp<e.maxHP){rect(ctx,x-17,y-41,34,3,'#393044');rect(ctx,x-16,y-40,Math.round(32*e.hp/e.maxHP),1,'#efd3a3');}
}
function drawSlimePads(){
  for(const point of slimes.points){
    ctx.save();ctx.fillStyle='#3e6e5355';ctx.strokeStyle='#b7d893';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(point.x,point.y,29,14,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle='#dcd9a6';ctx.font='bold 15px monospace';ctx.textAlign='center';ctx.fillText('SLIME TRAINING',1322,117);ctx.font='7px monospace';ctx.fillText('GREEN · HEAVY BLUE · SWIFT PINK',1322,131);ctx.textAlign='left';
}
function drawSlime(e){
  const config=SLIME_TYPES[e.type],x=Math.round(e.x),y=Math.round(e.y);
  if(e.hp<=0){const f=slimePopFrame(e.deathAge);ctx.save();ctx.globalAlpha=1-e.deathAge/SLIME.popDuration;ctx.drawImage(slimePopAtlas,f*96,0,96,96,x-48,y-76,96,96);ctx.restore();return;}
  ctx.fillStyle='#284d3955';ctx.beginPath();ctx.ellipse(x,y,e.radius,4,0,0,Math.PI*2);ctx.fill();
  const f=slimeFrame(e),size=96*config.scale;ctx.save();ctx.globalAlpha=Math.min(1,e.age/.3);if(e.hitTime<.18)ctx.globalAlpha*=.5;
  ctx.drawImage(slimeAtlases[config.art],f%4*96,Math.floor(f/4)*96,96,96,x-48*config.scale,y-76*config.scale,size,size);ctx.restore();
  if(e.windup>0)drawAttackWarning(ctx,x,y-(e.type==='big'?55:e.type==='tiny'?32:42));
  if(e.hp<e.maxHP){const w=e.type==='big'?36:24;rect(ctx,x-w/2,y-(e.type==='big'?44:30),w,3,'#2b4031');rect(ctx,x-w/2+1,y-(e.type==='big'?43:29),Math.round((w-2)*e.hp/e.maxHP),1,'#f4c281');}
}
function drawCoffinTethers(p,drag,pose){
  if(!drag||['fall','done'].includes(pose.stage))return;
  const start=drag.opening,end={x:pose.center.x-5,y:pose.center.y-pose.hop+3},growth=pose.stage==='reach'?pose.reach:1;
  const ex=start.x+(end.x-start.x)*growth,ey=start.y+(end.y-start.y)*growth,dx=ex-start.x,dy=ey-start.y,length=Math.hypot(dx,dy)||1;
  p.save();p.lineCap='butt';p.globalAlpha=1-pose.intake;
  for(let i=-1;i<=1;i++){
    const slack=(pose.stage==='reach'?10:3)*(1-pose.intake),wave=Math.sin(drag.time*11+i*1.7)*slack;
    const mx=(start.x+ex)/2-dy/length*(wave+i*3),my=(start.y+ey)/2+dx/length*(wave+i*3);
    for(const [width,color]of [[5,'#675640'],[3,'#e1d2ad'],[1,'#fff0cd']]){
      p.strokeStyle=color;p.lineWidth=width;p.beginPath();p.moveTo(Math.round(start.x+i*3),Math.round(start.y));p.quadraticCurveTo(Math.round(mx),Math.round(my),Math.round(ex+i*2),Math.round(ey));p.stroke();
    }
  }
  p.restore();
}
function drawMummyDragged(p,pose,opening=null){
  if(pose.done)return;
  p.save();p.globalAlpha=pose.alpha;
  p.fillStyle='#26332255';p.beginPath();p.ellipse(pose.center.x,pose.center.y+12,25*pose.scale,5*pose.scale,0,0,Math.PI*2);p.fill();
  if(opening&&pose.intake>.4){p.beginPath();p.rect(opening.x-18,opening.y-23,36,48);p.clip();}
  p.translate(Math.round(pose.center.x),Math.round(pose.center.y-pose.hop));p.rotate(pose.rotation);p.scale(pose.scale,pose.scale);
  const f=pose.frame;p.drawImage(mummyDragAtlas,f%4*160,Math.floor(f/4)*160,160,160,-80,-97,160,160);p.restore();
}
function drawPlayer(){
  const drag=mummifield.coffinDrag,dragPose=coffinDragPose(drag);
  if(mummyGameOver()&&drag&&dragPose.stage!=='fall'){drawMummyDragged(ctx,dragPose,drag.opening);return;}
  const x=Math.round(player.x),y=Math.round(player.y);
  ctx.fillStyle='#263e3152';ctx.beginPath();ctx.ellipse(x,y-1,13,5,0,0,Math.PI*2);ctx.fill();
  ctx.save();
  if(!health.dead&&!nitro.active&&!bound()&&health.invulnerable>0)ctx.globalAlpha=Math.floor(sceneTime*12)%2===0?.28:1;
  if(mummyGameOver())drawMummifield(ctx,x,y,mummifield.time,mummifield);
  else if(webGameOver())drawWebbed(ctx,x,y,webbed);
  else if(health.dead)drawDefeat(ctx,x,y,defeatPose(health.deathTime,health.facing),health.deathTime);
  else if(nitro.active)drawNitro(ctx,x,y,nitroPose(nitro.time),nitro.time);
  else if(mummifield.bound)drawMummifield(ctx,x,y,mummifield.time,mummifield);
  else if(webbed.bound)drawWebbed(ctx,x,y,webbed);
  else if(sticky.bound)drawSticky(ctx,x,y,sticky.time);
  else if(health.hurtTime>0){const f=hurtFrame(health);ctx.drawImage(hurtAtlas,f*160,row[health.facing]*160,160,160,x-80,y-112,160,160);}
  else if(combat.state==='slash')ctx.drawImage(slashAtlas,attackFrame(combat)*160,row[combat.facing]*160,160,160,x-80,y-112,160,160);
  else if(combat.state==='charging'){
    const walking=player.actualMoving,f=walking?chargeWalkFrame(player):attackFrame(combat);
    if(walking)ctx.drawImage(chargeWalkAtlas,f*160,row[combat.facing]*160,160,160,x-80,y-112,160,160);
    else ctx.drawImage(chargeAtlas,row[combat.facing]*96,f*96,96,96,x-48,y-75,96,96);
    const aura=walking?auraFrames.walk[combat.facing][f]:auraFrames.idle[combat.facing][f];
    drawAura(ctx,aura,x-(walking?80:48),y-(walking?112:75),chargeAuraAlpha(sceneTime,chargeRatio(combat)));
  }
  else if(combat.state==='spin'){const offset={down:0,left:2,up:4,right:6}[combat.facing],f=(attackFrame(combat)+offset)%8;ctx.drawImage(chargeAtlas,(f%4)*96,(2+Math.floor(f/4))*96,96,96,x-48,y-75,96,96);}
  else ctx.drawImage(atlas,animationFrame(player)*64,row[player.facing]*64,64,64,x-32,y-61,64,64);
  ctx.restore();
  if(nitro.active){rect(ctx,x-24,y-77,48,5,'#28392b');rect(ctx,x-23,y-76,Math.round(46*nitro.time/NITRO.duration),3,'#ffc96b');}
  if(mummifield.bound&&!mummifield.capturing&&!health.dead){rect(ctx,x-23,y-75,46,4,'#4f402c');rect(ctx,x-22,y-74,Math.round(44*mummifield.presses/mummyEscapePresses(mummifield)),2,'#f3d798');}
  if(sticky.bound){rect(ctx,x-23,y-75,46,4,'#294436');rect(ctx,x-22,y-74,Math.round(44*sticky.presses/SLIME.escapePresses),2,'#b9ed95');}
  if(webbed.bound&&!health.dead){rect(ctx,x-23,y-56,46,4,'#393248');rect(ctx,x-22,y-55,Math.round(44*webbed.presses/webEscapePresses(webbed)),2,'#e2d5ff');}
  if(combat.state==='charging'){
    const ratio=chargeRatio(combat);rect(ctx,x-24,y-80,48,8,'#243427');rect(ctx,x-22,y-78,44,4,'#61704b');rect(ctx,x-22,y-78,Math.round(44*ratio),4,ratio>=1?'#fff0a6':'#edaa4a');
    ctx.fillStyle=ratio>=1?'#fff0ad':'#efdfb0';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText(ratio>=1?'พร้อม!':'ชาร์จ…',x,y-85);ctx.textAlign='left';
  }
}
function drawDummy(d){
  const hit=d.hitTime<.4,shooting=d.kind==='shooter',firing=shooting&&d.fireTime<.4,frame=shooting?(firing?Math.min(3,Math.floor(d.fireTime*10)):Math.floor(sceneTime*2)%4):(hit?Math.min(3,Math.floor(d.hitTime*10)):Math.floor(sceneTime*2)%4);
  const wobble=hit?Math.sin(d.hitTime*45)*Math.max(0,1-d.hitTime/.4)*3:0;
  ctx.fillStyle='#263e314d';ctx.beginPath();ctx.ellipse(d.x,d.y-1,16,5,0,0,Math.PI*2);ctx.fill();
  ctx.save();if(d.hp===0)ctx.globalAlpha=.5;ctx.drawImage(shooting?shooterAtlas:dummyAtlas,frame*96,(shooting?firing:hit)?96:0,96,96,Math.round(d.x-48+wobble),d.y-75,96,96);ctx.restore();
  rect(ctx,d.x-22,d.y+5,44,6,'#2e3b2c');rect(ctx,d.x-20,d.y+7,40,2,'#6d5841');rect(ctx,d.x-20,d.y+7,Math.round(40*d.hp/d.maxHP),2,d.hp>100?'#c7d788':'#ef9e58');
  ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillStyle='#273a29';ctx.fillText(d.hp===0?'RESET…':`${d.hp} / ${d.maxHP}`,d.x+1,d.y+22);ctx.fillStyle='#fff0c7';ctx.fillText(d.hp===0?'RESET…':`${d.hp} / ${d.maxHP}`,d.x,d.y+21);ctx.textAlign='left';
  if(shooting){ctx.fillStyle='#ffe09a';ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillText('FIRE ↓',d.x,d.y+33);ctx.textAlign='left';}
}
function render(dt){
  const oldZoom=cameraZoom,zoomTarget=bound()&&!health.dead?1.65:1;
  cameraZoom+=(zoomTarget-cameraZoom)*(1-Math.exp(-dt*10));
  if(Math.abs(cameraZoom-zoomTarget)<.0001)cameraZoom=zoomTarget;
  // Preserve the player's screen anchor as the visible world rectangle changes.
  camera.x+=canvas.width*(1/oldZoom-1/cameraZoom)/2;
  camera.y+=canvas.height*(1/oldZoom-1/cameraZoom)*.55;
  const target=targetCamera(), blend=1-Math.exp(-dt*9);camera.x+=(target.x-camera.x)*blend;camera.y+=(target.y-camera.y)*blend;
  camera.x=Math.max(WORLD.left,Math.min(WORLD.left+WORLD.width-canvas.width/cameraZoom,camera.x));
  camera.y=Math.max(WORLD.top,Math.min(WORLD.top+WORLD.height-canvas.height/cameraZoom,camera.y));
  const cx=Math.round(camera.x*cameraZoom)/cameraZoom,cy=Math.round(camera.y*cameraZoom)/cameraZoom;
  const wobble=shake>0?Math.round(Math.sin(sceneTime*110)*shake*3):0;
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(cameraZoom,cameraZoom);ctx.translate(-cx+wobble,-cy);ctx.drawImage(world,WORLD.left,WORLD.top);
  const gunner=dummies.find(d=>d.kind==='shooter');
  if(gunner){for(let y=gunner.y+40;y<704;y+=18)rect(ctx,gunner.x-1,y,2,6,'#b56c4459');}
  drawSlimePads();drawSpiderPads();drawMummyPads();
  for(const ring of swordFire.rings)drawFireRing(ctx,ring);
  for(const b of bombs.placed)drawBombWarning(b);
  const ordered=[...objects,...mummies.entities.map(e=>({y:e.y,draw:()=>drawMummy(e)})),...dummies.map(d=>({y:d.y,draw:()=>drawDummy(d)})),...slimes.entities.map(s=>({y:s.y,draw:()=>drawSlime(s)})),...spiders.entities.map(s=>({y:s.y,draw:()=>drawSpider(s)})),...bombs.rocks.filter(r=>r.state!=='gone').map(r=>({y:r.y,draw:()=>drawBrittleRock(ctx,r)})),...bombs.drops.map(d=>({y:d.y,draw:()=>drawBombDrop(d)})),...bombs.placed.map(b=>({y:b.y,draw:()=>drawPlacedBomb(b)})),...nitro.drops.map(d=>({y:d.y,draw:()=>drawNitroDrop(d)})),...swordFire.waves.map(w=>({y:w.y,draw:()=>drawSwordWave(ctx,w)})),{y:player.y,draw:drawPlayer}].sort((a,b)=>a.y-b.y);for(const obj of ordered)obj.draw();
  for(const blast of bombs.blasts)drawBombBlast(ctx,blast.x,blast.y,blast.age);
  for(const shot of spiders.shots)drawWebShot(ctx,shot);
  for(const shot of mummies.shots)drawBandage(ctx,shot);
  for(const b of projectiles){const f=Math.floor(b.age*12)%4;ctx.drawImage(projectileAtlas,f*24,0,24,24,Math.round(b.x)-12,Math.round(b.y)-18,24,24);}
  for(const e of damageEvents){ctx.save();ctx.globalAlpha=Math.min(1,(.85-e.age)*3);ctx.textAlign='center';ctx.font=`bold ${['spin','fireSpin','bomb'].includes(e.kind)?16:13}px monospace`;const y=e.y-e.age*32;ctx.lineWidth=3;ctx.strokeStyle='#233126';ctx.strokeText(e.damage,e.x,y);ctx.fillStyle=e.kind==='heal'?'#c8f2aa':e.kind==='player'?'#ff9990':e.kind.startsWith('fire')||e.kind==='bomb'?'#ffbc68':e.kind==='spin'?'#ffe298':'#fff8dc';ctx.fillText(e.damage,e.x,y);if(e.kind==='spin'||e.kind==='bomb'||e.kind.startsWith('fire')){ctx.font='bold 6px monospace';ctx.fillText(e.kind==='bomb'?'BOMB':e.kind.startsWith('fire')?'FIRE':'SPIN',e.x,y+10);}ctx.restore();}
  ctx.restore();
}
function updateUI(){
  const defeat=health.dead?(mummyGameOver()?{stage:'mummifield',gameOver:mummifieldPose(mummifield).gameOver}:webGameOver()?{stage:'webbed',gameOver:true}:defeatPose(health.deathTime,health.facing)):null;
  $('stateLabel').textContent=defeat?({spin:'หมุนเซ…',collapse:'หมดแรง…',rest:'นอนมึน…',webbed:'ติดใยแน่น…',mummifield:mummifieldPose(mummifield).gameOver?'ถูกลากเข้าโลง…':mummifield.coffinDrag&&coffinDragPose(mummifield.coffinDrag).stage!=='fall'?'กำลังถูกลากเข้าโลง…':'ล้มลง…'}[defeat.stage]):combat.state==='slash'?'ฟันดาบ':combat.state==='spin'?'หมุนฟัน!':combat.state==='charging'?(chargeRatio(combat)>=1?'พร้อมหมุนฟัน!':'กำลังชาร์จ'):player.moving?'กำลังเดิน':'ยืนพัก';$('stateDot').classList.toggle('walking',!health.dead&&(player.moving||combat.state!=='idle'));
  $('deathOverlay').hidden=!defeat?.gameOver;
  $('deathOverlay').querySelector('p').textContent=mummyGameOver()?'ถูกผ้าลากเข้าโลงศพ · ลองใหม่อีกครั้ง':webGameOver()?'ดิ้นไม่ทันเวลา · ถูกใยขั้นสองพันไว้ ลองใหม่อีกครั้ง':'พักสักนิด แล้วลองหลบกระสุนกันใหม่';
  $('deathOverlay').querySelector('.eyebrow').textContent=mummyGameOver()?'MUMMIFIELD II · TIME OUT':webGameOver()?'WEBBED II · TIME OUT':'TAKE A BREATHER, BURNICE';
  $('attackButton').disabled=health.dead||nitro.active||bound();
  const using=nitro.active?nitroPose(nitro.time):null;
  if(using)$('stateLabel').textContent=({fetch:'หยิบ Nitro-Fuel…',sip:'กำลังดื่ม…',cheer:'สดชื่นจัง!'}[using.stage]);
  $('nitroCount').textContent=nitro.count;$('nitroButton').disabled=bound()||!canUseNitro(nitro,health);$('nitroButton').classList.toggle('using',nitro.active);
  $('bombCount').textContent=bombs.count;$('bombButton').disabled=bound()||!canUseBomb(bombs,health,nitro.active);
  $('bombButton').setAttribute('aria-label',`ระเบิด ${bombs.count} ลูก กด Q เพื่อวางระเบิด`);
  $('bombHint').textContent=bombs.count?'Q · วางแล้วถอย!':'เก็บระเบิดจากลาน';
  $('nitroButton').setAttribute('aria-label',`Nitro-Fuel ${nitro.count} ชิ้น กด E เพื่อดื่มและฟื้น 2 หัวใจ`);
  $('nitroHint').textContent=using?({fetch:'กำลังหยิบ…',sip:'กำลังดื่ม…',cheer:'วิ้ง! อีกนิดเดียว'}[using.stage]):nitro.count===0?'เก็บจากลานได้เลย':health.hp>=health.maxHP?'หัวใจเต็มแล้ว':'E · ฟื้น 2 หัวใจ';
  $('nitroProgress').style.width=`${nitro.active?nitro.time/NITRO.duration*100:0}%`;
  $('resetDummies').disabled=nitro.active||bound();
  const inArena=insideTraining(player),inSpider=insideSpiderYard(player),inMummy=insideMummyYard(player),showMummy=mummifield.bound||(!sticky.bound&&!webbed.bound&&(inMummy||(!inArena&&!inSpider&&mummifield.amount>0))),showWeb=webbed.bound||(!sticky.bound&&(inSpider||(!inArena&&webbed.amount>0))),status=showMummy?mummifield:showWeb?webbed:sticky,presses=showMummy?mummyEscapePresses(mummifield):showWeb?webEscapePresses(webbed):SLIME.escapePresses,gooPercent=status.bound?Math.round(status.presses/presses*100):Math.round(status.amount);
  $('slimeHud').hidden=health.dead||(!inArena&&!inSpider&&!inMummy&&sticky.amount<=0&&webbed.amount<=0&&mummifield.amount<=0);$('struggleButton').hidden=!bound()||health.dead;$('struggleButton').disabled=mummifield.capturing||mummifield.transitioning||health.dead;
  viewport.classList.toggle('has-slime-hud',!$('slimeHud').hidden);viewport.classList.toggle('slime-bound',bound()&&!health.dead);viewport.classList.toggle('web-bound',webbed.bound&&!health.dead);
  $('slimeHud').classList.toggle('mummy-status',showMummy);viewport.classList.toggle('mummy-bound',mummifield.bound&&!health.dead);$('slimeHud').classList.toggle('web-status',!showMummy&&showWeb);$('slimeHud').classList.toggle('bound',status.bound);$('slimeMeterFill').style.width=`${gooPercent}%`;$('slimeMeter').setAttribute('aria-valuenow',gooPercent);$('slimeMeter').setAttribute('aria-label',showMummy?'Mummifield และการดิ้นหลุด':showWeb?'ใยแมงมุมและการดิ้นหลุด':'เมือกเหนียวและการสลัดออก');
  $('slimeStatus').textContent=showMummy&&mummifield.capturing?'ผ้ากำลังล้อมและพันตัว…':showMummy&&mummifield.transitioning?'Mummifield I · ผ้ากำลังพันเพิ่ม…':status.bound?`${showMummy?mummifield.tier===2?'Mummifield II! ดิ้น':'Mummifield! ดิ้น':showWeb?webbed.tier===2?'Webbed II! ดิ้น':'Webbed! ดิ้น':'ติดเมือก! สลัด'} ${status.presses}/${presses}`:`${showMummy?'Mummifield':showWeb?'ใย Webbed':'เมือกเหนียว'} ${Math.round(status.amount)}%`;
  const mummyTimer=mummifield.bound&&!health.dead;
  $('webPressure').hidden=(!webbed.bound&&!mummyTimer)||health.dead;const pressure=mummyTimer?mummifield.remaining/8*100:webbed.tier===2?webbed.remaining/WEB.secondDuration*100:webbed.reinforcement;
  $('webPressureLabel').textContent=mummyTimer&&mummifield.capturing?'กำลังพันตัว · ยังไม่เริ่มเวลา':mummyTimer&&mummifield.transitioning?'พักเวลา · กำลังพันใบหน้าและปลายเท้า':mummyTimer?`Mummifield ${mummifield.tier===2?'II':'I'} · เหลือ ${mummifield.remaining.toFixed(1)} วินาที`:webbed.tier===2?`เหลือ ${webbed.remaining.toFixed(1)} วินาที`:`ใยขั้นสอง ${Math.round(webbed.reinforcement)}%`;
  $('webPressureFill').style.width=`${pressure}%`;$('webPressureMeter').setAttribute('aria-valuenow',Math.round(pressure));$('webPressureMeter').setAttribute('aria-label',mummyTimer?'เวลาที่เหลือสำหรับดิ้นหลุดจากผ้ามัมมี่':webbed.tier===2?'เวลาที่เหลือสำหรับดิ้นหลุด':'ใย Webbed ขั้นสอง');
  viewport.classList.toggle('has-web-pressure',(webbed.bound||mummifield.bound)&&!health.dead);$('slimeHud').classList.toggle('second-web',showWeb&&webbed.tier===2);
  $('struggleButton').querySelector('strong').textContent=mummifield.capturing?'ผ้ากำลังล้อมตัว…':mummifield.transitioning?'ผ้ากำลังพันเพิ่ม…':mummifield.bound?mummifield.tier===2?'ดิ้นสุดแรง!':'ดิ้นให้ผ้าขาด!':webbed.bound?webbed.tier===2?'ฉีกใยขั้นสอง!':'ดิ้นให้ใยขาด!':'สลัดเมือก!';
  $('slimePopulation').textContent=slimes.entities.filter(s=>s.hp>0).length;
  $('spiderPopulation').textContent=spiderPopulation(spiders);
  $('mummyPopulation').textContent=mummyPopulation(mummies);
  document.querySelector('.scene-caption span').textContent=insideMummyYard(player)?'ลานฝึก Mummy':inSpider?'ลานฝึกแมงมุม':inArena?'ลานฝึก Slime':'ลานฝึก Nitro';
  $('walkHint').lastChild.textContent=insideMummyYard(player)?' หลบกรงเล็บและสายผ้าพันแผล!':inSpider?' ระวังใยสีขาว!':inArena?' ลองฟัน Slime ดูสิ!':' ลองฟัน Dummy ดูสิ!';$('walkHint').classList.toggle('gone',hintGone||bound());
  if(mummifield.bound&&!health.dead)$('stateLabel').textContent=mummifield.capturing?'ตกใจ! ผ้ากำลังล้อมตัว…':mummifield.transitioning?'Mummifield I · ผ้ากำลังพันเพิ่ม…':`Mummifield ${mummifield.tier===2?'II':'I'}! เหลือ ${mummifield.remaining.toFixed(1)} วิ`;
  if(sticky.bound&&!health.dead)$('stateLabel').textContent='ติดเมือก! กดทิศทางรัว ๆ';
  if(webbed.bound&&!health.dead)$('stateLabel').textContent=webbed.tier===2?`Webbed II! เหลือ ${webbed.remaining.toFixed(1)} วิ`:'Webbed! กดทิศทางรัว ๆ';
  $('itemNotice').textContent=noticeText;$('itemNotice').hidden=noticeTime<=0;
  $('powerLabel').textContent=fullHearts(health)?'คลื่นไฟพร้อม':'ต้องหัวใจเต็ม';$('healthHud').classList.toggle('full-power',fullHearts(health));
  if(lastHP!==health.hp){lastHP=health.hp;const shape='<path d="M1 1h3v1h1V1h3v1h1v3H8v1H7v1H6v1H5v1H4V8H3V7H2V6H1V5H0V2h1Z"/>';
    $('hearts').innerHTML=Array.from({length:health.maxHP/2},(_,i)=>`<span class="heart-slot"><svg viewBox="0 0 10 10" class="heart-empty">${shape}</svg><span class="heart-fill" style="width:${heartFill(health,i)*50}%"><svg viewBox="0 0 10 10">${shape}</svg></span></span>`).join('');
    $('hpLabel').textContent=`${Math.floor(health.hp/2)}${health.hp%2?'½':''} / ${health.maxHP/2}`;$('healthHud').dataset.hp=String(health.hp);
  }
  $('directionLabel').textContent=names[player.facing];$('positionLabel').textContent=`X ${Math.round(player.x)} · Y ${Math.round(player.y)}`;
  $('lastDamage').textContent=combat.stats.last||'—';$('totalDamage').textContent=combat.stats.total;$('hitCount').textContent=combat.stats.hits;$('lastKind').textContent=({spin:'หมุนฟัน',slash:'ฟันดาบ',fireSlash:'คลื่นดาบไฟ',fireSpin:'คลื่นไฟหมุนฟัน',bomb:'ระเบิด'}[combat.stats.lastKind])||'ยังไม่ได้โจมตี';
  $('attackButton').classList.toggle('charging',combat.state==='charging');$('attackButton').classList.toggle('charged',chargeRatio(combat)>=1);$('attackButton').classList.toggle('pressed',combat.held);$('attackCharge').style.height=`${chargeRatio(combat)*100}%`;
  $('attackButton').querySelector('strong').textContent=chargeRatio(combat)>=1?'ปล่อย!':combat.state==='charging'?'ชาร์จ…':'ฟันดาบ';
}
const defeatPreviews={dizzy:{stage:'spin',count:16,fps:16},fall:{stage:'collapse',count:16,fps:16},rest:{stage:'rest',count:8,fps:8}};
const mummyPreviews={mummyWalk:0,mummyScratch:4,mummyCast:8,mummyBandage:12};
const spiderPreviews={weaverWalk:{type:'weaver',attack:false},weaverAttack:{type:'weaver',attack:true},hunterWalk:{type:'hunter',attack:false},hunterAttack:{type:'hunter',attack:true}};
function previewCount(){if(previewAction==='mummyDragged')return COFFIN_DRAG.frames;if(previewAction==='coffinPull')return COFFIN_DRAG.coffinFrames;if(previewAction==='mummifieldCapture')return MUMMIFIELD.captureFrames;if(previewAction==='mummifieldTransition')return MUMMIFIELD.transitionFrames;if(previewAction==='mummifield2')return 16;if(previewAction==='mummifieldFall')return 8;if(previewAction==='mummifield')return MUMMIFIELD.frames;if(previewAction==='trees')return 1;if(spiderPreviews[previewAction])return 4;return ['slimes','spiders','webStatus'].includes(previewAction)?12:previewAction==='bombs'?8:previewAction==='nitro'?48:defeatPreviews[previewAction]?.count??(['spin','fireWave','fireSpin'].includes(previewAction)?8:['idle','charge'].includes(previewAction)?2:4);}
function previews(){if($('spriteLab').hidden)return;const count=previewCount(),defeat=defeatPreviews[previewAction],fps=defeat?.fps??(previewAction==='mummyDragged'?COFFIN_DRAG.fps:previewAction==='coffinPull'?COFFIN_DRAG.coffinFPS:previewAction==='mummifieldCapture'?MUMMIFIELD.captureFPS:previewAction==='mummifieldTransition'?MUMMIFIELD.transitionFPS:previewAction==='mummifield2'?MUMMIFIELD.secondFPS:previewAction==='mummifieldFall'?8:previewAction==='mummifield'?MUMMIFIELD.fps:Object.hasOwn(mummyPreviews,previewAction)?6:spiderPreviews[previewAction]||previewAction==='webStatus'?WEB.fps:previewAction==='spiders'?WEB.fps:previewAction==='slimes'?SLIME.stickyFPS:previewAction==='fireWave'?16:['fireSpin','bombs'].includes(previewAction)?12.5:previewAction==='hurt'?10:previewAction==='spin'||previewAction==='slash'?12:['walk','chargeWalk'].includes(previewAction)?8:2);const np=nitroPose(previewTime%NITRO.duration),frame=previewPaused?Number($('frameSlider').value):previewAction==='nitro'?['fetch','sip','cheer'].indexOf(np.stage)*16+np.frame:Math.floor(previewTime*fps)%count;for(const c of document.querySelectorAll('.preview')){
  if(c.width!==160){c.width=160;c.height=160;}const p=c.getContext('2d'),r=row[c.dataset.direction],facing=c.dataset.direction;
  p.clearRect(0,0,160,160);p.imageSmoothingEnabled=false;
  if(previewAction==='mummyDragged')drawMummyDragged(p,{frame,center:{x:80,y:100},hop:coffinDragHop(frame),scale:1,alpha:1,rotation:0,done:false,intake:0});
  else if(previewAction==='coffinPull')p.drawImage(mummyCoffinPullAtlas,frame%4*112,Math.floor(frame/4)*112,112,112,10,10,140,140);
  else if(previewAction==='mummifieldCapture')drawMummifield(p,80,112,(frame+.001)/MUMMIFIELD.captureFPS,{tier:0,capturing:true});
  else if(previewAction==='mummifieldTransition')drawMummifield(p,80,112,(frame+.001)/MUMMIFIELD.transitionFPS,{tier:1,transitioning:true});
  else if(previewAction==='mummifield2')drawMummifield(p,80,112,(frame+.001)/MUMMIFIELD.secondFPS,{tier:2});
  else if(previewAction==='mummifieldFall')drawMummifield(p,80,112,(frame+.001)/8,{failed:true});
  else if(previewAction==='mummifield')drawMummifield(p,80,112,(frame+.001)/MUMMIFIELD.fps);
  else if(Object.hasOwn(mummyPreviews,previewAction)){
    const offset=mummyPreviews[previewAction];
    if(offset===12)drawBandage(p,{x:80,y:104,age:(frame+.001)/10,vx:Math.cos(r*Math.PI/2),vy:Math.sin(r*Math.PI/2)});
    else{const f=r*12+offset+frame;p.drawImage(mummyAtlas,f%4*160,Math.floor(f/4)*160,160,160,0,0,160,160);}
  }
  else if(previewAction==='trees')drawTree(p,80,128,r);
  else if(spiderPreviews[previewAction]){
    const sequence=spiderPreviews[previewAction],f=r*8+(sequence.attack?4:0)+frame;p.drawImage(spiderAtlases[sequence.type],f%4*96,Math.floor(f/4)*96,96,96,32,48,96,96);
  }
  else if(previewAction==='webStatus'){
    const time=previewPaused?(frame+.001)/WEB.fps:previewTime;
    if(r<2)drawWebbed(p,80,112,{time,tier:r+1,remaining:99});
    else if(r===2)drawWebbed(p,80,112,{time:previewPaused?(frame%8+.001)/WEB.restFPS:previewTime,failed:true});
    else drawWebShot(p,{x:80,y:88,age:previewPaused?(frame%4+.001)/10:previewTime});
  }
  else if(previewAction==='spiders'){
    const time=previewPaused?(frame+.001)/WEB.fps:previewTime;
    if(r===3)drawWebbed(p,80,112,{time,tier:1});
    else if(r===2)drawWebShot(p,{x:80,y:88,age:previewPaused?(frame%4+.001)/10:previewTime});
    else{const f=previewPaused?frame%8:Math.floor(previewTime*8)%8;p.drawImage(spiderAtlases[r===0?'weaver':'hunter'],f%4*96,Math.floor(f/4)*96,96,96,32,48,96,96);}
  }
  else if(previewAction==='slimes'){
    if(r===3)drawSticky(p,80,112,previewPaused?(frame+.001)/SLIME.stickyFPS:previewTime);
    else{const f=frame%8,image=slimeAtlases[['normal','big','swift'][r]];p.drawImage(image,f%4*96,Math.floor(f/4)*96,96,96,32,36,96,96);}
  }
  else if(previewAction==='bombs'){
    if(r===0)drawBombSprite(p,80,112,0);
    else if(r===1)drawBombSprite(p,80,112,1+frame%3);
    else if(r===2){p.save();p.translate(80,80);p.scale(.8,.8);drawBombBlast(p,0,0,frame/8*BOMB.blastDuration);p.restore();}
    else drawBrittleRock(p,{x:80,y:120},frame);
  }
  else if(previewAction==='nitro'){const stage=r<3?['fetch','sip','cheer'][r]:['fetch','sip','cheer'][Math.floor(frame/16)],f=frame%16;drawNitro(p,80,112,{stage,frame:f,sparkle:stage==='cheer'&&f>=8},previewPaused?f/10:previewTime);}
  else if(defeat){const f=(frame+r*(count/4))%count;drawDefeat(p,80,112,{stage:defeat.stage,frame:f,stars:defeat.stage==='rest'||(defeat.stage==='collapse'&&f>=14)},previewTime);}
  else if(previewAction==='fireWave')drawSwordWave(p,{x:80,y:112,age:frame/16,angle:{right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2}[facing],travelled:0});
  else if(previewAction==='fireSpin'){drawFireRing(p,{x:80,y:92,age:frame/8*FIRE.ringDuration});const f=(frame+r*2)%8;p.drawImage(chargeAtlas,f%4*96,(2+Math.floor(f/4))*96,96,96,32,37,96,96);}
  else if(['walk','idle'].includes(previewAction))p.drawImage(atlas,(frame+(previewAction==='walk'?2:0))*64,r*64,64,64,48,51,64,64);
  else if(previewAction==='hurt')p.drawImage(hurtAtlas,frame*160,r*160,160,160,0,0,160,160);
  else if(previewAction==='slash')p.drawImage(slashAtlas,frame*160,r*160,160,160,0,0,160,160);
  else if(previewAction==='chargeWalk'){p.drawImage(chargeWalkAtlas,frame*160,r*160,160,160,0,0,160,160);drawAura(p,auraFrames.walk[facing][frame],0,0,chargeAuraAlpha(previewTime,1));}
  else if(previewAction==='charge'){p.drawImage(chargeAtlas,r*96,frame*96,96,96,32,37,96,96);drawAura(p,auraFrames.idle[facing][frame],32,37,chargeAuraAlpha(previewTime,frame));}
  else{const f=(frame+r*2)%8;p.drawImage(chargeAtlas,f%4*96,(2+Math.floor(f/4))*96,96,96,32,37,96,96);}
}if(!previewPaused)$('frameSlider').value=frame;$('frameOutput').textContent=frame+1;
  for(const [id,hit] of [['dummyIdlePreview',false],['dummyHitPreview',true]]){const p=$(id).getContext('2d');p.clearRect(0,0,96,96);p.imageSmoothingEnabled=false;const f=previewPaused?Number($('frameSlider').value)%4:Math.floor(previewTime*(hit?10:2))%4;p.drawImage(dummyAtlas,f*96,hit?96:0,96,96,0,0,96,96);}
  const s=$('shooterPreview').getContext('2d');s.clearRect(0,0,96,96);s.imageSmoothingEnabled=false;s.drawImage(shooterAtlas,(Math.floor(previewTime*10)%4)*96,96,96,96,0,0,96,96);
  const b=$('projectilePreview').getContext('2d');b.clearRect(0,0,96,96);b.imageSmoothingEnabled=false;b.drawImage(projectileAtlas,(Math.floor(previewTime*12)%4)*24,0,24,24,24,20,48,48);
}
function input(){let x=0,y=0;if(keys.has('ArrowLeft')||keys.has('KeyA'))x--;if(keys.has('ArrowRight')||keys.has('KeyD'))x++;if(keys.has('ArrowUp')||keys.has('KeyW'))y--;if(keys.has('ArrowDown')||keys.has('KeyS'))y++;return x||y?{x,y}:joy;}
function tick(now){const dt=previousTime?Math.min((now-previousTime)/1000,.05):0;previousTime=now;if(ready){
  sceneTime+=dt;noticeTime=Math.max(0,noticeTime-dt);
  if(nitro.active){
    const healed=advanceNitro(nitro,health,dt);
    if(healed){damageEvents.push({x:player.x,y:player.y-58,damage:`+${heartAmount(healed)}♥`,kind:'heal',age:0});showNotice(`สดชื่น! ฟื้น ${heartAmount(healed)} หัวใจ`);}
  }else if(!health.dead){
  const rocks=rockObstacles(bombs),obstacles=[...dummyObstacles(dummies),...rocks];
  const mummyStatus=advanceMummifield(mummifield,dt,health);
  if(mummyStatus.entered&&!mummyStatus.wrapping&&!mummyStatus.failed)enterRestraint('Mummifield I! ดิ้น 28 ครั้งภายใน 8 วินาที!');
  if(mummyStatus.wrapping){resetInput();noticeTime=0;}
  if(mummyStatus.upgraded&&!mummyStatus.failed)enterRestraint('Mummifield II! ดิ้น 64 ครั้งภายใน 8 วินาที!');
  if(mummyStatus.failed){finishWebDefeat();mummifield.coffinDrag=createCoffinDrag(player,mummies.points,{fallDuration:MUMMIFIELD.fallDuration});}
  advanceSticky(sticky,dt);if(advanceWebbed(webbed,dt,health))finishWebDefeat();
  if(!health.dead){
  if(bound()){health.knockTime=0;health.invulnerable=Math.max(health.invulnerable,.15);}
  updateDummies(dummies,dt);advanceHealth(health,player,dt,obstacles);advanceCombat(combat,dt);
  const locked=bound()||combat.state==='slash'||combat.state==='spin'||health.hurtTime>0;
  updatePlayer(player,locked?{x:0,y:0}:input(),dt,{speedScale:combat.state==='charging'?.42:1,lockFacing:locked,obstacles});
  const picked=collectNitro(nitro,player,health);if(picked)showNotice(`เก็บ Nitro-Fuel +${picked} · มี ${nitro.count} ชิ้น`);
  const pickedBombs=collectBombs(bombs,player,health);if(pickedBombs)showNotice(`เก็บระเบิด +${pickedBombs} · กด Q เพื่อวางแล้วถอย`);
  if(health.hurtTime>0)player.facing=health.facing;
  else if(combat.state==='charging')combat.facing=player.facing;
  else if(locked&&!bound())player.facing=combat.facing;
  const targets=[...dummies,...slimes.entities.filter(s=>s.hp>0),...spiders.entities.filter(s=>s.hp>0),...mummies.entities.filter(s=>s.hp>0)],hits=resolveHits(combat,player,targets,rocks);emitSwordFire(swordFire,combat,player,health);
  hits.push(...updateSwordFire(swordFire,dt,targets,combat.stats,rocks));
  for(const d of dummies)if(d.kind==='shooter')updateShooter(d,dt,projectiles);
  if(updateProjectiles(projectiles,dt,player,health,rocks))playerDamaged();
  const blast=advanceBombs(bombs,dt,targets,combat.stats,player,health);hits.push(...blast.hits);combatSfx.hit(hits);
  for(const hit of hits){rollNitroDrop(nitro,hit);damageEvents.push({...hit,age:0});shake=hit.kind==='bomb'?1.8:['spin','fireSpin'].includes(hit.kind)?1:.55;}
  handleSlimeDefeats(slimes,hits);handleSpiderDefeats(spiders,hits);handleMummyDefeats(mummies,hits);
  if(blast.exploded)shake=1.8;
  if(blast.broken.length)showNotice(`หินแตก ${blast.broken.length} ก้อน · เดินผ่านได้แล้ว!`);
  if(blast.playerHit)playerDamaged();
  const slimeAttack=advanceSlimes(slimes,dt,player,health,(webbed.bound||mummifield.bound)?{bound:true}:sticky,{obstacles});
  if(slimeAttack.playerHit)playerDamaged();
  if(slimeAttack.bound)enterRestraint('ติดเมือกเหนียว! กด WASD / ลูกศรรัว ๆ หรือปุ่มสลัด');
  const mummyAttack=advanceMummies(mummies,dt,player,health,{restrained:sticky.bound||webbed.bound,mummifield,obstacles});
  if(mummyAttack.playerHit)playerDamaged();
  if(mummyAttack.bound){enterRestraint('');noticeTime=0;}
  const spiderAttack=advanceSpiders(spiders,dt,player,health,webbed,{restrained:sticky.bound||mummifield.bound,obstacles});
  if(spiderAttack.playerHit)playerDamaged();
  if(spiderAttack.bound)enterRestraint(`Webbed! กดทิศทางรัว ๆ ${WEB.escapePresses} ครั้งเพื่อดิ้นให้ใยขาด`);
  if(spiderAttack.reinforced&&!spiderAttack.upgraded)showNotice('ใยขั้นสองสะสมเพิ่ม! ดิ้นให้หลุดก่อนใยพันแน่นขึ้น');
  if(spiderAttack.upgraded)enterRestraint(`Webbed II! ดิ้น ${WEB.secondPresses} ครั้งใน ${WEB.secondDuration} วินาที!`);
  }
  }else{
    advanceDefeat(health,dt);advanceBombEffects(bombs,dt);
    if(webbed.failed)advanceWebbed(webbed,dt);
    if(mummifield.failed)advanceMummifield(mummifield,dt);
    const obstacles=[...dummyObstacles(dummies),...rockObstacles(bombs)];
    advanceSpidersAfterDefeat(spiders,dt,player,{obstacles});
    advanceSlimesAfterDefeat(slimes,dt,player,{obstacles});
    advanceMummiesAfterDefeat(mummies,dt,player,{obstacles});
  }
  damageEvents=damageEvents.filter(e=>(e.age+=dt)<.85);shake=Math.max(0,shake-dt*5);
  if(combat.stats.hits&&!hintGone){hintGone=true;$('walkHint').classList.add('gone');}
  if(mummifield.failed&&mummifield.coffinDrag)advanceCoffinDrag(mummifield.coffinDrag,mummifield.time,player);
  combatSfx.update(combat,health,dt,{restrained:bound(),paused:nitro.active});
  render(dt);if(!previewPaused)previewTime+=dt;previews();uiTime+=dt;if(uiTime>.06){updateUI();uiTime=0;}
}requestAnimationFrame(tick);}
document.addEventListener('pointerdown',()=>{void combatSfx.unlock();},{capture:true,passive:true});
document.addEventListener('keydown',()=>{void combatSfx.unlock();},{capture:true});
$('soundButton').addEventListener('click',()=>{combatSfx.setMuted(!combatSfx.muted);const muted=combatSfx.muted;$('soundButton').textContent=muted?'🔇':'🔊';$('soundButton').setAttribute('aria-pressed',String(!muted));$('soundButton').setAttribute('aria-label',muted?'เปิดเสียงเอฟเฟกต์':'ปิดเสียงเอฟเฟกต์');$('soundButton').title=muted?'เปิดเสียงเอฟเฟกต์':'ปิดเสียงเอฟเฟกต์';});
const movementCodes=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'];
const attackCodes=['KeyJ','KeyZ','Space'];
function holdAttack(source){if(!ready||health.dead||health.hurtTime>0||nitro.active||bound())return;const first=attackSources.size===0;attackSources.add(source);if(first)pressAttack(combat,player.facing);updateUI();}
function letGoAttack(source){if(!attackSources.delete(source))return;if(attackSources.size===0)releaseAttack(combat);updateUI();}
document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if(bound()&&movementCodes.includes(e.code)){e.preventDefault();if(!e.repeat)struggle();return;}if(e.code==='KeyQ'){e.preventDefault();if(!e.repeat)useBomb();return;}if(e.code==='KeyE'){e.preventDefault();if(!e.repeat)useNitro();return;}if(e.code==='KeyR'&&gameOverVisible()){e.preventDefault();restartGame();return;}if(movementCodes.includes(e.code)){e.preventDefault();keys.add(e.code);}if(attackCodes.includes(e.code)){e.preventDefault();if(!e.repeat)holdAttack(e.code);}});
document.addEventListener('keyup',e=>{keys.delete(e.code);if(attackCodes.includes(e.code)){e.preventDefault();letGoAttack(e.code);}});
let joyPointer=null,gooGesture='';
function resetJoystick(){joy={x:0,y:0};joyPointer=null;gooGesture='';$('joyKnob').style.transform='translate(0px,0px)';}
function resetInput(){keys.clear();resetJoystick();attackSources.clear();cancelAttack(combat);}
function showNotice(text){noticeText=text;noticeTime=2.4;}
function enterRestraint(notice){keys.clear();joy={x:0,y:0};gooGesture='';attackSources.clear();cancelAttack(combat);player.facing='down';health.hurtTime=0;health.knockTime=0;showNotice(notice);}
function finishWebDefeat(){resetInput();projectiles=[];spiders.shots=[];mummies.shots=[];Object.assign(swordFire,createSwordFire());player.moving=false;player.actualMoving=false;noticeTime=0;}
function struggle(){if(!ready||!bound()||health.dead)return;const isWeb=webbed.bound,isMummy=mummifield.bound;if(isMummy?struggleMummifield(mummifield,health):isWeb?struggleWebbed(webbed,health):struggleSticky(sticky,health)){resetInput();showNotice(isMummy?'ดิ้นหลุดจากผ้าพันมัมมี่แล้ว!':isWeb?'ดิ้นหลุดจากใยแล้ว!':'สลัดเมือกออกแล้ว!');}updateUI();}
$('struggleButton').addEventListener('click',struggle);
function playerDamaged(){
  combatSfx.playerHit();
  cancelAttack(combat);attackSources.clear();shake=1;
  if(health.dead){projectiles=[];spiders.shots=[];mummies.shots=[];Object.assign(swordFire,createSwordFire());player.moving=false;player.actualMoving=false;resetJoystick();}
}
function useBomb(){
  if(!ready||bound()||!canUseBomb(bombs,health,nitro.active))return;
  if(!placeBomb(bombs,player,health,{usingNitro:nitro.active,obstacles:dummyObstacles(dummies)})){showNotice('ตรงนี้วางไม่ได้ · ขยับออกจากสิ่งกีดขวางก่อน');return;}
  cancelAttack(combat);attackSources.clear();showNotice('จุดชนวนแล้ว! ถอยออกจากวงระเบิด');updateUI();
}
$('bombButton').addEventListener('click',useBomb);
function useNitro(){if(!ready||bound()||!startNitro(nitro,health))return;resetInput();player.facing='down';player.moving=false;player.actualMoving=false;updateUI();}
$('nitroButton').addEventListener('click',useNitro);
window.addEventListener('blur',()=>{resetInput();combatSfx.silence();});document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();combatSfx.silence();previousTime=0;}});
const joystick=$('joystick');
function moveJoystick(e){if(e.pointerId!==joyPointer)return;e.preventDefault();const r=joystick.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,length=Math.hypot(x,y),clamp=Math.min(37,length);const angle=Math.atan2(y,x);$('joyKnob').style.transform=`translate(${Math.cos(angle)*clamp}px,${Math.sin(angle)*clamp}px)`;if(length<11){joy={x:0,y:0};gooGesture='';return;}const a=Math.round(angle/(Math.PI/4))*(Math.PI/4),direction={x:Math.round(Math.cos(a)),y:Math.round(Math.sin(a))};if(bound()){const gesture=`${direction.x},${direction.y}`;joy={x:0,y:0};if(gesture!==gooGesture){gooGesture=gesture;struggle();}return;}joy=direction;}
joystick.addEventListener('pointerdown',e=>{if(joyPointer!==null)return;joyPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);moveJoystick(e);});
joystick.addEventListener('pointermove',moveJoystick);
for(const name of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(name,e=>{if(e.pointerId===joyPointer)resetJoystick();});
$('attackButton').addEventListener('pointerdown',e=>{e.preventDefault();$('attackButton').setPointerCapture(e.pointerId);holdAttack('pointer:'+e.pointerId);});
$('attackButton').addEventListener('pointerup',e=>{e.preventDefault();letGoAttack('pointer:'+e.pointerId);});
for(const name of ['pointercancel','lostpointercapture'])$('attackButton').addEventListener(name,e=>{const id='pointer:'+e.pointerId;if(attackSources.has(id)){attackSources.delete(id);if(!attackSources.size)cancelAttack(combat);updateUI();}});
$('attackButton').addEventListener('keydown',e=>{if(e.code==='Enter'){e.preventDefault();if(!e.repeat)holdAttack('Enter');}});
$('attackButton').addEventListener('keyup',e=>{if(e.code==='Enter'){e.preventDefault();letGoAttack('Enter');}});
function resetTraining(){dummies=createDummies();projectiles=[];Object.assign(swordFire,createSwordFire());damageEvents=[];Object.assign(combat.stats,{hits:0,total:0,last:0,lastKind:'',spins:0});}
$('resetDummies').addEventListener('click',()=>{if(nitro.active||bound())return;resetInput();resetTraining();updateUI();});
function restartGame(){combatSfx.reset();resetInput();resetTraining();Object.assign(nitro,createNitro());Object.assign(bombs,createBombs());Object.assign(slimes,createSlimes());Object.assign(sticky,createSticky());Object.assign(spiders,createSpiders());Object.assign(mummies,createMummies());Object.assign(webbed,createWebbed());Object.assign(mummifield,createMummifield());noticeTime=0;Object.assign(health,createHealth());lastHP=-1;Object.assign(player,{...START,facing:'down',moving:false,actualMoving:false,wasMoving:false,animTime:0,distance:0});cameraZoom=1;snapCamera();updateUI();}
$('resetButton').addEventListener('click',restartGame);$('retryButton').addEventListener('click',restartGame);
$('fullscreenButton').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(viewport.requestFullscreen)await viewport.requestFullscreen();else{viewport.classList.toggle('expanded');$('fullscreenButton').textContent=viewport.classList.contains('expanded')?'×':'⛶';}}catch{viewport.classList.toggle('expanded');}resize();});
$('spriteButton').addEventListener('click',()=>{const lab=$('spriteLab');lab.hidden=!lab.hidden;$('spriteButton').innerHTML=lab.hidden?'ดู Sprite <span>↗</span>':'ซ่อน Sprite <span>↙</span>';if(!lab.hidden)lab.scrollIntoView({behavior:'smooth',block:'start'});});
for(const button of document.querySelectorAll('#animTabs button'))button.addEventListener('click',()=>{
  previewAction=button.dataset.action;previewTime=0;$('frameSlider').max=previewCount()-1;$('frameSlider').value=0;
  $('pausePreview').hidden=previewAction==='trees';$('frameControl').hidden=previewAction==='trees'||!previewPaused;
  for(const b of document.querySelectorAll('#animTabs button'))b.classList.toggle('active',b===button);
  const labels=['↓ ด้านหน้า','← ด้านซ้าย','→ ด้านขวา','↑ ด้านหลัง'],short=['DOWN','LEFT','RIGHT','UP'];
  document.querySelectorAll('.direction-cards article').forEach((card,i)=>{
    const sequence=defeatPreviews[previewAction];let label=labels[i],detail=short[i];
    if(['mummyDragged','coffinPull'].includes(previewAction)){label=previewAction==='mummyDragged'?'Burnice · ดิ้นระหว่างถูกลาก':'โลงศพ · ดึงผ้า';detail=previewAction==='mummyDragged'?'36 FRAMES · 12 FPS':'12 FRAMES · 10 FPS';}
    else if(previewAction==='mummifieldCapture'){label='กลุ่มผ้าล้อมตัว → Mummifield I';detail='24 FRAMES · 12 FPS';}
    else if(previewAction==='mummifieldTransition'){label='Mummifield I → II · พันผ้า';detail='24 FRAMES · 12 FPS';}
    else if(['mummifield2','mummifieldFall'].includes(previewAction)){label=previewAction==='mummifield2'?'Mummifield II · ดิ้น':'Mummifield II · ล้ม';detail=previewAction==='mummifield2'?'16 FRAMES · 16 FPS':'8 FRAMES · 8 FPS';}
    else if(previewAction==='mummifield'){label=`Mummifield · ดิ้น ${i+1}`;detail='16 FRAMES · 10 FPS';}
    else if(Object.hasOwn(mummyPreviews,previewAction)){detail=`${{mummyWalk:'WALK',mummyScratch:'SCRATCH',mummyCast:'CAST',mummyBandage:'BANDAGE'}[previewAction]} · 4 FRAMES`;if(previewAction==='mummyBandage')label=['→ ขวา','↓ ลง','← ซ้าย','↑ ขึ้น'][i];}
    else if(previewAction==='trees'){label=['ต้นไม้ทรงกลม','ต้นไม้ทรงสูง','ต้นไม้พุ่มกว้าง','ต้นไม้พุ่มซ้อน'][i];detail='STATIC · 1 FRAME';}
    else if(spiderPreviews[previewAction])detail=`${spiderPreviews[previewAction].attack?'ATTACK':'WALK'} · 4 FRAMES`;
    else if(previewAction==='webStatus'){label=['Webbed ขั้นแรก','Webbed II · ปิดตา','หมดเวลา · หายใจเบา ๆ','Projectile ใย'][i];detail=['12 FRAMES','12 FRAMES','8 FRAMES · 4 FPS','4 FRAMES'][i];}
    else if(previewAction==='spiders'){label=['แมงมุมยิงใย','แมงมุมประชิด','Projectile ใย','Burnice ติดใย Webbed'][i];detail=['32 FRAMES · 4 DIR','32 FRAMES · 4 DIR','4 FRAMES','12 FRAMES · 8 FPS'][i];}
    else if(previewAction==='slimes'){label=['Slime ธรรมดา','Slime ใหญ่แตกตัว','Slime ตัวเล็กเร็ว','Burnice สลัดเมือก'][i];detail=i===3?'12 FRAMES':'8 FRAMES';}
    else if(previewAction==='bombs'){label=['ไอเท็มระเบิด','จุดชนวน','แรงระเบิด','หินเปราะแตก'][i];detail=['PICKUP','3 FUSE FRAMES','8 FRAMES','8 FRAMES'][i];}
    else if(previewAction==='nitro'){label=['หยิบจากข้างหลัง','ยกดื่ม','ชูพร้อมประกาย','ลำดับเต็ม 4.6 วิ'][i];detail=i===3?'48 FRAMES':'16 FRAMES';}
    else if(sequence){label=`ช่วงที่ ${i+1}`;detail=`${sequence.count} FRAMES`;}
    else if(previewAction==='spin')label=`เฟส ${i+1}`;
    card.querySelector('span').textContent=label;card.querySelector('small').textContent=detail;
  });previews();
});
$('pausePreview').addEventListener('click',()=>{previewPaused=!previewPaused;$('pausePreview').textContent=previewPaused?'เล่นอนิเมชัน':'หยุดอนิเมชัน';$('frameControl').hidden=!previewPaused;});
$('frameSlider').addEventListener('input',previews);
const loadImage=(image,src)=>new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=src;});
const imageSources=[
  [mummyCoffinAtlas,'assets/mummy-coffin-v21-atlas.png'],
  [mummyAtlas,'assets/mummy-v18-atlas.png'],[bandageAtlas,'assets/mummy-bandage-v18-atlas.png'],
  [spiderNestAtlas,'assets/spider-nest-v16-atlas.png'],
  [treeAtlas,'assets/trees-v15-atlas.png'],
  [atlas,'assets/burnice-atlas.png'],[slashAtlas,'assets/burnice-slash-v3-atlas.png'],
  [chargeAtlas,'assets/burnice-charge-spin-atlas.png'],[dummyAtlas,'assets/dummy-atlas.png'],
  [chargeWalkAtlas,'assets/burnice-charge-walk-v4-atlas.png'],[hurtAtlas,'assets/burnice-hurt-atlas.png'],
  [shooterAtlas,'assets/shooter-v8-atlas.png'],[projectileAtlas,'assets/projectile-v8-atlas.png'],
  [dizzyAtlas,'assets/defeat-spin-atlas.png'],[collapseAtlas,'assets/defeat-collapse-atlas.png'],
  [restAtlas,'assets/defeat-rest-v6-atlas.png'],[starsAtlas,'assets/defeat-stars-atlas.png'],
  [fireWaveAtlas,'assets/fire-wave-v6-atlas.png'],[fireRingAtlas,'assets/fire-ring-v6-atlas.png'],
  [nitroFetchAtlas,'assets/nitro-fetch-v8-atlas.png'],[nitroSipAtlas,'assets/nitro-sip-v8-atlas.png'],
  [nitroCheerAtlas,'assets/nitro-cheer-v8-atlas.png'],[nitroItemAtlas,'assets/nitro-item-v8-atlas.png'],
  [nitroSparkleAtlas,'assets/nitro-sparkle-v8-atlas.png'],[bombAtlas,'assets/bomb-v9-atlas.png'],
  [bombBlastAtlas,'assets/bomb-blast-v9-atlas.png'],[brittleRockAtlas,'assets/brittle-rock-v9-atlas.png'],
  ...Object.entries(slimeAtlases).map(([name,image])=>[image,`assets/slime-${name}-v10-atlas.png`]),
  [slimePopAtlas,'assets/slime-pop-v10-atlas.png'],[stickyAtlas,'assets/sticky-struggle-v11-atlas.png'],
  ...Object.entries(spiderAtlases).map(([name,image])=>[image,`assets/spider-${name}-v13-atlas.png`]),
  [webShotAtlas,'assets/web-shot-v12-atlas.png'],[webbedAtlas,'assets/burnice-webbed-v12-atlas.png'],
  [mummyDragAtlas,'assets/burnice-mummy-drag-v34-atlas.png'],[mummyCoffinPullAtlas,'assets/mummy-coffin-pull-v34-atlas.png'],
  [mummifieldAtlases.capture,'assets/burnice-mummifield-capture-v30-atlas.png'],
  [mummifieldAtlases.transition,'assets/burnice-mummifield-transition-v30-atlas.png'],
  [mummifieldAtlases.second,'assets/burnice-mummifield2-v28-atlas.png'],[mummifieldAtlases.fall,'assets/burnice-mummifield-fall-v28-atlas.png'],
  [mummifieldAtlas,'assets/burnice-mummifield-v27-atlas.png'],
  [webbedAtlases.second,'assets/burnice-webbed2-v14-atlas.png'],[webbedAtlases.rest,'assets/burnice-webbed-rest-v14-atlas.png'],
];
Promise.all(imageSources.map(([image,src])=>loadImage(image,src))).then(()=>{prepareAuras();ready=true;void combatSfx.preload();$('loading').hidden=true;resize();updateUI();}).catch(()=>{$('loading').querySelector('p').textContent='โหลด Sprite ไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง';});
requestAnimationFrame(tick);
