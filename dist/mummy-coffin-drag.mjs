export const COFFIN_DRAG={frames:36,fps:12,reachDuration:.75,speed:29,minPull:6.6,maxPull:13,intakeDuration:1.8,coffinFrames:12,coffinFPS:10,closeFrames:48,closeFPS:8,wrapFrames:30,sealedDuration:2};
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
export function createCoffinDrag(player,points,{fallDuration=1}={}){
  let nearest=null,distance=Infinity;
  for(const [index,p]of points.entries()){
    const d=Math.hypot(p.x-player.x,p.y-player.y);
    if(d<distance){distance=d;nearest={id:p.id??index,x:p.x,y:p.y};}
  }
  if(!nearest)return null;
  const start={x:player.x+25.5,y:player.y-15},opening={x:nearest.x+12,y:nearest.y-28};
  return{coffin:nearest,origin:{x:player.x,y:player.y},start,opening,fallDuration,time:0,done:false,pullDuration:Math.max(COFFIN_DRAG.minPull,Math.min(COFFIN_DRAG.maxPull,Math.hypot(opening.x-start.x,opening.y-start.y)/COFFIN_DRAG.speed))};
}
export function coffinDragHop(frame){
  const pulse=(centre,width,height)=>height*Math.max(0,1-Math.abs(frame-centre)/width)**2;
  return pulse(8,3,8)+pulse(18,3,11)+pulse(28,3,7);
}
export function coffinDragPose(d){
  if(!d)return null;
  const t=d.time-d.fallDuration,pullTime=Math.max(0,t-COFFIN_DRAG.reachDuration),u=clamp(pullTime/d.pullDuration),progress=u+.018*Math.sin(u*Math.PI*10),intake=clamp((pullTime-d.pullDuration)/COFFIN_DRAG.intakeDuration);
  const closeTime=pullTime-d.pullDuration-COFFIN_DRAG.intakeDuration,closeDuration=COFFIN_DRAG.closeFrames/COFFIN_DRAG.closeFPS;
  const stage=t<0?'fall':t<COFFIN_DRAG.reachDuration?'reach':pullTime<d.pullDuration?'pull':intake<1?'intake':closeTime<COFFIN_DRAG.wrapFrames/COFFIN_DRAG.closeFPS?'wrap':closeTime<closeDuration?'close':closeTime<closeDuration+COFFIN_DRAG.sealedDuration?'sealed':'done';
  const frame=stage==='reach'?0:Math.floor(pullTime*COFFIN_DRAG.fps+1e-9)%COFFIN_DRAG.frames;
  const center={x:d.start.x+(d.opening.x-d.start.x)*progress,y:d.start.y+(d.opening.y-d.start.y)*progress+10*ease(intake)};
  return{stage,frame,center,hop:stage==='pull'?coffinDragHop(frame):0,reach:ease(t/COFFIN_DRAG.reachDuration),progress,intake,scale:1-.25*ease(intake),alpha:1-ease(intake),rotation:-Math.PI/2*ease(intake),coffinFrame:Math.floor(Math.max(0,t)*COFFIN_DRAG.coffinFPS+1e-9)%COFFIN_DRAG.coffinFrames,closeFrame:Math.min(COFFIN_DRAG.closeFrames-1,Math.floor(Math.max(0,closeTime)*COFFIN_DRAG.closeFPS+1e-9)),closeBlend:ease((intake-.55)/.45),done:stage==='done'};
}
export function advanceCoffinDrag(d,time,player){
  if(!d)return null;d.time=Math.max(d.time,Math.max(0,time));const pose=coffinDragPose(d);d.done=pose.done;
  if(pose.stage!=='fall'){
    player.x=d.origin.x+pose.center.x-d.start.x;player.y=d.origin.y+pose.center.y-d.start.y;
    player.moving=false;player.actualMoving=false;
  }
  return pose;
}
