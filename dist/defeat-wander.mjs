// Shared by non-attacking monsters after any player defeat.
const RETREAT=92,CLEARANCE=80;
function random(e){
  if(e.defeatSeed===undefined){e.defeatSeed=0;for(const c of e.id)e.defeatSeed=(Math.imul(e.defeatSeed,31)+c.charCodeAt(0))>>>0;}
  e.defeatSeed=(Math.imul(e.defeatSeed,1664525)+1013904223)>>>0;return e.defeatSeed/4294967296;
}
export function wanderAfterDefeat(e,dt,p,home,zone,speed,blocked){
  dt=Math.max(0,dt);e.age+=dt;e.hitTime+=dt;e.spawnShield=Math.max(0,e.spawnShield-dt);e.windup=0;e.recoverTime=0;e.moving=false;
  const move=(dx,dy,rate,avoid=false)=>{
    const length=Math.hypot(dx,dy);if(length<.001)return;
    const oldX=e.x,oldY=e.y,steps=Math.max(1,Math.ceil(rate*dt/3));
    for(let i=0;i<steps;i++){
      const x=e.x+dx/length*rate*dt/steps,y=e.y+dy/length*rate*dt/steps;
      if(!blocked(x,e.y)&&(!avoid||Math.hypot(x-p.x,e.y-p.y)>=CLEARANCE))e.x=x;
      if(!blocked(e.x,y)&&(!avoid||Math.hypot(e.x-p.x,y-p.y)>=CLEARANCE))e.y=y;
    }
    const x=e.x-oldX,y=e.y-oldY;e.moving=Math.hypot(x,y)>.001;
    if(e.moving){e.facing=Math.abs(x)>Math.abs(y)?x<0?'left':'right':y<0?'up':'down';e.walkTime=(e.walkTime??0)+dt;}
  };
  if(e.defeatRetreat===undefined){e.defeatRetreat=true;e.roamTimer=0;e.roamPause=0;}
  const distance=Math.hypot(e.x-p.x,e.y-p.y);
  if(distance>=RETREAT)e.defeatRetreat=false;
  if(e.defeatRetreat){
    if(e.defeatSlide&&!blocked(e.x+e.defeatSlide.x*3,e.y+e.defeatSlide.y*3)){move(e.defeatSlide.x,e.defeatSlide.y,speed);return;}
    e.defeatSlide=null;
    const angle=distance>.001?Math.atan2(e.y-p.y,e.x-p.x):random(e)*Math.PI*2;
    let best=null,score=distance;
    for(const offset of [0,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2]){
      const x=Math.cos(angle+offset),y=Math.sin(angle+offset),next=Math.hypot(e.x+x*3-p.x,e.y+y*3-p.y);
      if(next>score+.0001&&!blocked(e.x+x*3,e.y+y*3)){best={x,y};score=next;}
    }
    // Slide along a wall if a corner blocks every directly outward step.
    if(!best){
      score=-Infinity;
      for(const [x,y]of [[1,0],[-1,0],[0,1],[0,-1]])if(!blocked(e.x+x*3,e.y+y*3)){
        const next=Math.hypot(e.x+x*RETREAT*2-p.x,e.y+y*RETREAT*2-p.y);
        if(next>score){best={x,y};score=next;}
      }
      e.defeatSlide=best;
    }
    if(best)move(best.x,best.y,speed);return;
  }
  e.roamTimer=Math.max(0,e.roamTimer-dt);e.roamPause=Math.max(0,e.roamPause-dt);
  if(e.roamPause>0)return;
  if(!e.roamTarget||e.roamTimer===0){
    e.roamTarget={x:e.x,y:e.y};e.roamTimer=.5;
    for(let i=0;i<16;i++){
      const angle=random(e)*Math.PI*2,radius=45+random(e)*85;
      const x=Math.max(zone.x+e.radius+10,Math.min(zone.x+zone.w-e.radius-10,home.x+Math.cos(angle)*radius));
      const y=Math.max(zone.y+e.radius+10,Math.min(zone.y+zone.h-e.radius-10,home.y+Math.sin(angle)*radius));
      if(!blocked(x,y)&&Math.hypot(x-p.x,y-p.y)>=RETREAT){e.roamTarget={x,y};e.roamTimer=2+random(e)*3;break;}
    }
  }
  const dx=e.roamTarget.x-e.x,dy=e.roamTarget.y-e.y;
  if(Math.hypot(dx,dy)<5){e.roamTimer=0;e.roamPause=.35+random(e)*.8;return;}
  move(dx,dy,speed*.55,true);
}
