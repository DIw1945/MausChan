import {addMummifield} from './mummifield.mjs?v=28';
import {wanderAfterDefeat} from './defeat-wander.mjs?v=23';
import {MUMMY_ZONE,SOLIDS,lineBlocked} from './core.mjs?v=18';
import {receiveDamage} from './health.mjs?v=18';

export const MUMMY={hp:200,speed:27,radius:13,perPoint:2,spawnInterval:6,spawnGrace:.7,aggro:280,leash:350,deathDuration:.65,meleeRange:38,meleeWindup:.65,meleeCooldown:1.8,castRange:215,castWindup:.9,castCooldown:3.4,shotSpeed:145,shotRange:280};
export const MUMMY_DIRECTIONS=['down','left','right','up'];
export const MUMMY_POINTS=[{x:350,y:-370},{x:634,y:-370}];
export const insideMummyYard=p=>p.x>=MUMMY_ZONE.x&&p.x<=MUMMY_ZONE.x+MUMMY_ZONE.w&&p.y>=MUMMY_ZONE.y&&p.y<=MUMMY_ZONE.y+MUMMY_ZONE.h;
export const mummyPopulation=(s,id)=>s.entities.filter(e=>e.hp>0&&(id===undefined||e.pointId===id)).length;
export const createMummies=()=>({nextId:1,nextShotId:1,kills:0,entities:[],shots:[],points:MUMMY_POINTS.map((p,id)=>({...p,id,index:0,timer:.6+id*.6}))});
const facing=(dx,dy,old='down')=>Math.hypot(dx,dy)<.01?old:Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';
const duration=action=>action==='scratch'?MUMMY.meleeWindup:MUMMY.castWindup;
export function mummyAtlasFrame(e){
  const action=e.windup>0||e.recoverTime>0?e.action:'walk',offset=action==='scratch'?4:action==='cast'?8:0;
  const frame=e.windup>0?Math.min(2,Math.floor((1-e.windup/duration(action))*3)):e.recoverTime>0?3:e.moving?Math.floor(e.walkTime*6)%4:0;
  return Math.max(0,MUMMY_DIRECTIONS.indexOf(e.facing))*12+offset+frame;
}
export const mummyShotFrame=age=>Math.floor(Math.max(0,age)*10)%4;
function blocked(x,y,r,obstacles){
  return x-r<MUMMY_ZONE.x+5||x+r>MUMMY_ZONE.x+MUMMY_ZONE.w-5||y-r<MUMMY_ZONE.y+5||y+r>MUMMY_ZONE.y+MUMMY_ZONE.h-5||[...SOLIDS,...obstacles].some(b=>x+r>b.x&&x-r<b.x+b.w&&y+r*.5>b.y&&y-r*.5<b.y+b.h);
}
function spawn(s,point,p,obstacles){
  const offsets=[[-28,0],[28,20],[0,-30],[0,32],[-40,-25],[40,-25]];
  for(let i=0;i<offsets.length;i++){
    const [dx,dy]=offsets[(point.index+i)%offsets.length],x=point.x+dx,y=point.y+dy;
    if(blocked(x,y,MUMMY.radius,obstacles)||Math.hypot(x-p.x,y-p.y)<42||s.entities.some(e=>e.hp>0&&Math.hypot(e.x-x,e.y-y)<MUMMY.radius+e.radius+5))continue;
    const e={id:`mummy-${s.nextId++}`,kind:'mummy',pointId:point.id,x,y,hp:MUMMY.hp,maxHP:MUMMY.hp,radius:MUMMY.radius,facing:'down',moving:false,walkTime:0,age:0,hitTime:10,damageTotal:0,hits:0,spawnShield:MUMMY.spawnGrace,meleeCooldown:1,castCooldown:1.8,action:'walk',windup:0,recoverTime:0,deathAge:0,deathHandled:false};
    s.entities.push(e);point.index++;return e;
  }
  return null;
}
function move(e,dx,dy,speed,dt,obstacles){
  const length=Math.hypot(dx,dy);if(length<1||speed<=0)return;
  const oldX=e.x,oldY=e.y,steps=Math.max(1,Math.ceil(speed*dt/3));
  for(let i=0;i<steps;i++){
    const x=e.x+dx/length*speed*dt/steps,y=e.y+dy/length*speed*dt/steps;
    if(!blocked(x,e.y,e.radius,obstacles))e.x=x;
    if(!blocked(e.x,y,e.radius,obstacles))e.y=y;
  }
  e.moving=Math.hypot(e.x-oldX,e.y-oldY)>.001;
  if(e.moving){e.facing=facing(e.x-oldX,e.y-oldY,e.facing);e.walkTime+=dt;}
}
export function fireBandage(s,e,p){
  const dx=p.x-e.x,dy=p.y-e.y,length=Math.hypot(dx,dy)||1;
  const shot={id:`bandage-${s.nextShotId++}`,x:e.x+dx/length*18,y:e.y+dy/length*18,vx:dx/length*MUMMY.shotSpeed,vy:dy/length*MUMMY.shotSpeed,age:0,travelled:0,damage:1};
  s.shots.push(shot);return shot;
}
export function advanceBandages(s,dt,p,h,{paused=false,restrained=false,mummifield=null,obstacles=[]}={}){
  if(paused)return false;
  if(h.dead||restrained||mummifield?.bound){s.shots=[];return false;}
  let hit=false;const alive=[];dt=Math.max(0,dt);
  for(const shot of s.shots){
    if(mummifield?.bound)break;
    let removed=false;shot.age+=dt;
    const distance=Math.min(MUMMY.shotSpeed*dt,MUMMY.shotRange-shot.travelled),steps=Math.max(1,Math.ceil(distance/3));
    for(let i=0;i<steps;i++){
      const step=distance/steps;shot.x+=shot.vx/MUMMY.shotSpeed*step;shot.y+=shot.vy/MUMMY.shotSpeed*step;shot.travelled+=step;
      if(blocked(shot.x,shot.y,3,obstacles)){removed=true;break;}
      if(((shot.x-p.x)/16)**2+((shot.y-p.y)/16)**2<=1){const damaged=receiveDamage(h,p,shot);hit=damaged||hit;if(damaged&&!h.dead&&mummifield&&addMummifield(mummifield)){h.knockTime=0;h.hurtTime=0;}removed=true;break;}
    }
    if(!removed&&shot.travelled<MUMMY.shotRange-.001)alive.push(shot);
  }
  s.shots=mummifield?.bound?[]:alive;return hit;
}
export function advanceMummyEffects(s,dt){s.entities=s.entities.filter(e=>e.hp>0||(e.deathAge+=Math.max(0,dt))<MUMMY.deathDuration||!e.deathHandled);}
export function handleMummyDefeats(s,events){
  for(const event of events){
    if(!event.killed)continue;const e=s.entities.find(e=>e.id===event.id);
    if(!e||e.hp>0||e.deathHandled)continue;e.deathHandled=true;e.deathAge=0;e.windup=0;e.recoverTime=0;s.kills++;
  }
}
export function advanceMummies(s,dt,p,h,{paused=false,restrained=false,mummifield=null,obstacles=[]}={}){
  if(paused)return{playerHit:false};dt=Math.max(0,dt);advanceMummyEffects(s,dt);
  for(const point of s.points){
    point.timer-=dt;if(point.timer>0)continue;
    point.timer=mummyPopulation(s,point.id)<MUMMY.perPoint&&spawn(s,point,p,obstacles)?MUMMY.spawnInterval:.4;
  }
  const wasBound=mummifield?.bound;
  const result={playerHit:advanceBandages(s,dt,p,h,{restrained,mummifield,obstacles})};
  result.bound=!wasBound&&!!mummifield?.bound;
  for(const e of s.entities){
    if(e.hp<=0)continue;
    e.age+=dt;e.hitTime+=dt;e.spawnShield=Math.max(0,e.spawnShield-dt);e.moving=false;
    e.meleeCooldown=Math.max(0,e.meleeCooldown-dt);e.castCooldown=Math.max(0,e.castCooldown-dt);e.recoverTime=Math.max(0,e.recoverTime-dt);
    if(mummifield?.bound&&!h.dead){
      e.windup=0;e.recoverTime=0;
      // Separate motion state prevents restraint wandering from changing later defeat AI.
      const motion=e.bindingMotion??(e.bindingMotion={...e});
      motion.x=e.x;motion.y=e.y;
      wanderAfterDefeat(motion,dt,p,s.points[e.pointId],MUMMY_ZONE,MUMMY.speed,(x,y)=>blocked(x,y,e.radius,obstacles));
      for(const key of ['x','y','facing','moving','walkTime'])e[key]=motion[key];
      continue;
    }
    delete e.bindingMotion;
    if(e.spawnShield>0)continue;
    const home=s.points[e.pointId],dx=p.x-e.x,dy=p.y-e.y,distance=Math.hypot(dx,dy);
    const chase=!h.dead&&!restrained&&insideMummyYard(p)&&distance<MUMMY.aggro&&Math.hypot(p.x-home.x,p.y-home.y)<MUMMY.leash;
    const sight=!lineBlocked(e.x,e.y,p.x,p.y,[...SOLIDS,...obstacles]);
    if(!chase){e.windup=0;e.recoverTime=0;}
    if(e.windup>0){
      e.facing=facing(dx,dy,e.facing);e.windup=Math.max(0,e.windup-dt);
      if(e.windup===0){
        if(chase&&sight){
          if(e.action==='scratch'&&distance<=MUMMY.meleeRange+5)result.playerHit=receiveDamage(h,p,{x:e.x,y:e.y,damage:2})||result.playerHit;
          else if(e.action==='cast'&&distance<=MUMMY.castRange+20)fireBandage(s,e,p);
        }
        if(e.action==='scratch')e.meleeCooldown=MUMMY.meleeCooldown;else e.castCooldown=MUMMY.castCooldown;
        e.recoverTime=.32;
      }
      continue;
    }
    if(e.recoverTime>0)continue;
    if(chase&&sight){
      const action=distance<=MUMMY.meleeRange&&e.meleeCooldown===0?'scratch':distance>72&&distance<=MUMMY.castRange&&e.castCooldown===0?'cast':null;
      if(action){e.action=action;e.windup=duration(action);e.facing=facing(dx,dy,e.facing);continue;}
    }
    let mx=home.x+Math.sin(e.age*.5+e.pointId)*30-e.x,my=home.y+Math.cos(e.age*.5+e.pointId)*26-e.y,speed=MUMMY.speed*.4;
    if(chase){mx=dx;my=dy;speed=distance>28?MUMMY.speed:0;}
    for(const other of s.entities)if(other!==e&&other.hp>0){const ox=e.x-other.x,oy=e.y-other.y,d=Math.hypot(ox,oy),gap=e.radius+other.radius+4;if(d>.01&&d<gap){mx+=ox/d*(gap-d)*3;my+=oy/d*(gap-d)*3;}}
    move(e,mx,my,speed,dt,obstacles);
  }
  return result;
}

export function advanceMummiesAfterDefeat(s,dt,p,{obstacles=[]}={}){
  dt=Math.max(0,dt);s.shots=[];advanceMummyEffects(s,dt);
  // Reuse the existing spawn logic without advancing living-combat AI.
  for(const point of s.points){
    point.timer-=dt;if(point.timer>0)continue;
    point.timer=mummyPopulation(s,point.id)<MUMMY.perPoint&&spawn(s,point,p,obstacles)?MUMMY.spawnInterval:.4;
  }
  for(const e of s.entities)if(e.hp>0)wanderAfterDefeat(e,dt,p,s.points[e.pointId],MUMMY_ZONE,MUMMY.speed,(x,y)=>blocked(x,y,e.radius,obstacles));
}
