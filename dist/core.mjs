export const WORLD = { left: -640, top: -640, width: 2304, height: 1408 };
export const TRAINING_ZONE = {x:1048,y:160,w:548,h:472};
export const SPIDER_ZONE = {x:-572,y:160,w:548,h:472};
export const MUMMY_ZONE = {x:218,y:-572,w:548,h:472};
export const START = { x: 468, y: 408 };
export const SPEED = 104;
export const TREE_POSITIONS = [[90,140],[236,106],[484,110],[608,144],[942,308],[114,470],[258,604],[638,622],[924,640]];
export const SOLIDS = [
  {x:-640,y:-640,w:2304,h:48},{x:-640,y:716,w:2304,h:52},
  {x:-640,y:0,w:1040,h:62},{x:558,y:0,w:1106,h:62},
  {x:-640,y:-640,w:42,h:1408},{x:1622,y:-640,w:42,h:1408},
  {x:202,y:-592,w:580,h:20},
  {x:202,y:-592,w:16,h:492},{x:766,y:-592,w:16,h:492},
  {x:202,y:-100,w:198,h:16},{x:558,y:-100,w:224,h:16},
  {x:384,y:-100,w:16,h:162},{x:558,y:-100,w:16,h:162},
  {x:0,y:0,w:42,h:336},{x:0,y:532,w:42,h:236},
  {x:982,y:0,w:42,h:336},{x:982,y:532,w:42,h:236},
  {x:1040,y:140,w:570,h:14},{x:1040,y:644,w:570,h:14},
  {x:-586,y:140,w:570,h:14},{x:-586,y:644,w:570,h:14},
  {x:560,y:242,w:238,h:145},
  {x:735,y:423,w:180,h:116},
  {x:126,y:284,w:80,h:27},{x:570,y:514,w:80,h:27},
  {x:310,y:180,w:26,h:24},{x:350,y:180,w:26,h:24},
  ...TREE_POSITIONS.map(([x,y])=>({x:x-9,y:y-8,w:18,h:16})),
];
export function directionVector(x,y) {
  const length=Math.hypot(x,y);
  return length ? {x:x/Math.max(1,length),y:y/Math.max(1,length)} : {x:0,y:0};
}
export function collides(x,y,obstacles=[]) {
  return [...SOLIDS,...obstacles].some(r=>x+8>r.x&&x-8<r.x+r.w&&y+3>r.y&&y-7<r.y+r.h);
}
export function lineBlocked(x0,y0,x1,y1,obstacles=[]) {
  return obstacles.some(r=>{
    let near=0,far=1;
    for(const [start,delta,min,max] of [[x0,x1-x0,r.x,r.x+r.w],[y0,y1-y0,r.y,r.y+r.h]]){
      if(Math.abs(delta)<1e-9){if(start<min||start>max)return false;continue;}
      const a=(min-start)/delta,b=(max-start)/delta;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(near>far)return false;
    }
    return true;
  });
}
export function updatePlayer(player, input, dt, options={}) {
  const speed=SPEED*(options.speedScale??1);
  const v=directionVector(input.x,input.y);
  player.moving=!!(v.x||v.y);
  if(player.moving&&!options.lockFacing) {
    if(Math.abs(v.x)>Math.abs(v.y)) player.facing=v.x<0?'left':'right';
    else if(Math.abs(v.y)>Math.abs(v.x)) player.facing=v.y<0?'up':'down';
    else if(!((player.facing==='left'&&v.x<0)||(player.facing==='right'&&v.x>0)||(player.facing==='up'&&v.y<0)||(player.facing==='down'&&v.y>0))) player.facing=v.y<0?'up':'down';
  }
  // Small steps avoid tunnelling and allow sliding along scenery.
  const steps=Math.max(1,Math.ceil(speed*dt/3));
  let distance=0;
  for(let i=0;i<steps;i++) {
    const oldX=player.x, oldY=player.y;
    const x=player.x+v.x*speed*dt/steps;
    const y=player.y+v.y*speed*dt/steps;
    if(!collides(x,player.y,options.obstacles)) player.x=x;
    if(!collides(player.x,y,options.obstacles)) player.y=y;
    distance+=Math.hypot(player.x-oldX,player.y-oldY);
  }
  if(player.moving!==player.wasMoving) player.animTime=0;
  player.animTime+=dt;
  player.wasMoving=player.moving;
  player.actualMoving=distance>0.0001;
  player.distance=(player.distance||0)+distance;
  return player;
}
export function animationFrame(player) {
  return player.moving ? 2+Math.floor(player.animTime*8)%4 : Math.floor(player.animTime*2)%2;
}
