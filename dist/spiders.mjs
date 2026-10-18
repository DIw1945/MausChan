import {SOLIDS,SPIDER_ZONE,lineBlocked} from './core.mjs?v=12';
import {receiveDamage} from './health.mjs?v=12';

export const SPIDER={perPoint:2,spawnInterval:4.2,spawnGrace:.65,aggro:230,leash:265,deathDuration:.5,retreatDistance:92,bodyClearance:80};
export const WEB={max:100,buildup:50,escapePresses:28,reinforceBuildup:20,meleeBuildup:15,reinforceGrace:.7,secondPresses:44,secondDuration:10,decayDelay:8,decayRate:5,fps:8,frames:12,restFPS:4,restFrames:8,speed:118,range:285,radius:5};
export const SPIDER_DIRECTIONS=['down','left','right','up'];
export const SPIDER_TYPES={
  weaver:{name:'แมงมุมยิงใย',hp:40,speed:25,radius:12,windup:.8,cooldown:2.5,range:220},
  hunter:{name:'แมงมุมประชิด',hp:60,speed:46,radius:13,windup:.6,cooldown:1.9,range:29},
};
export const SPIDER_POINTS=[{x:-474,y:260,types:['weaver','hunter']},{x:-156,y:260,types:['weaver','hunter']},{x:-474,y:534,types:['hunter','weaver']},{x:-156,y:534,types:['weaver','hunter']}];
export const insideSpiderYard=p=>p.x>=SPIDER_ZONE.x&&p.x<=SPIDER_ZONE.x+SPIDER_ZONE.w&&p.y>=SPIDER_ZONE.y&&p.y<=SPIDER_ZONE.y+SPIDER_ZONE.h;
export const createWebbed=()=>({amount:0,bound:false,tier:0,presses:0,quiet:0,time:0,reinforcement:0,hitGrace:0,remaining:0,failed:false});
export const webEscapePresses=w=>w.tier===2?WEB.secondPresses:WEB.escapePresses;
export function addWebbed(w,amount=WEB.buildup){
  if(w.bound||w.failed)return false;w.amount=Math.min(WEB.max,w.amount+Math.max(0,amount));w.quiet=0;
  if(w.amount<WEB.max)return false;w.bound=true;w.tier=1;w.presses=0;w.time=0;w.reinforcement=0;w.hitGrace=WEB.reinforceGrace;return true;
}
export function reinforceWebbed(w,amount=WEB.reinforceBuildup){
  if(!w.bound||w.failed||w.tier!==1||w.hitGrace>0)return{reinforced:false,upgraded:false};
  w.hitGrace=WEB.reinforceGrace;w.reinforcement=Math.min(WEB.max,w.reinforcement+Math.max(0,amount));
  const upgraded=w.reinforcement>=WEB.max;
  if(upgraded){w.tier=2;w.presses=0;w.remaining=WEB.secondDuration;w.time=0;}
  return{reinforced:true,upgraded};
}
export function advanceWebbed(w,dt,h){
  dt=Math.max(0,dt);w.time+=dt;w.hitGrace=Math.max(0,w.hitGrace-dt);
  if(w.failed)return false;
  if(w.bound){
    if(w.tier===2){w.remaining=Math.max(0,w.remaining-dt);if(w.remaining===0){w.failed=true;w.time=0;if(h){h.dead=true;h.deathTime=0;h.hurtTime=0;h.knockTime=0;}return true;}}
    return false;
  }
  const before=w.quiet;w.quiet+=dt;w.amount=Math.max(0,w.amount-WEB.decayRate*(Math.max(0,w.quiet-WEB.decayDelay)-Math.max(0,before-WEB.decayDelay)));
  return false;
}
export function struggleWebbed(w,h,{repeat=false}={}){
  if(!w.bound||w.failed||h.dead||repeat||w.tier===2&&w.remaining<=0)return false;const required=webEscapePresses(w);w.presses=Math.min(required,w.presses+1);
  if(w.presses<required)return false;
  Object.assign(w,createWebbed());h.hurtTime=0;h.knockTime=0;h.invulnerable=Math.max(h.invulnerable,1.5);return true;
}
export const webbedFrame=time=>Math.floor(Math.max(0,time)*WEB.fps)%WEB.frames;
export const webbedPose=w=>w.failed?{sequence:'rest',frame:Math.floor(Math.max(0,w.time)*WEB.restFPS)%WEB.restFrames}:w.tier===2?{sequence:'second',frame:w.remaining<=.18?11:webbedFrame(w.time)}:{sequence:'first',frame:webbedFrame(w.time)};
export const webShotFrame=age=>Math.floor(Math.max(0,age)*10)%4;
export function spiderFacing(dx,dy,previous='down'){
  if(Math.hypot(dx,dy)<.01)return previous;
  return Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';
}
export const spiderFrame=e=>e.windup>0?4+Math.min(2,Math.floor((1-e.windup/SPIDER_TYPES[e.type].windup)*3)):e.recoverTime>0?(e.recoverTime>.14?6:7):e.moving?Math.floor(Math.max(0,e.walkTime??e.age)*8)%4:0;
export const spiderAtlasFrame=e=>Math.max(0,SPIDER_DIRECTIONS.indexOf(e.facing))*8+spiderFrame(e);
export function createSpiders(){return{nextId:1,nextShotId:1,kills:0,entities:[],shots:[],points:SPIDER_POINTS.map((p,id)=>({...p,id,index:0,timer:.5+id*.4}))};}
export const spiderPopulation=(s,id)=>s.entities.filter(e=>e.hp>0&&(id===undefined||e.pointId===id)).length;
function blocked(x,y,r,obstacles=[]){return x-r<SPIDER_ZONE.x+8||x+r>SPIDER_ZONE.x+SPIDER_ZONE.w-8||y-r<SPIDER_ZONE.y+8||y+r>SPIDER_ZONE.y+SPIDER_ZONE.h-8||[...SOLIDS,...obstacles].some(b=>x+r>b.x&&x-r<b.x+b.w&&y+r*.5>b.y&&y-r*.5<b.y+b.h);}
function spawn(state,point,p,obstacles){
  const type=point.types[point.index%point.types.length],config=SPIDER_TYPES[type],offsets=[[-26,0],[27,22],[26,-25],[-24,29],[0,-40],[0,40]];
  for(let i=0;i<offsets.length;i++){
    const [dx,dy]=offsets[(i+point.index)%offsets.length],x=point.x+dx,y=point.y+dy;
    if(blocked(x,y,config.radius,obstacles)||Math.hypot(x-p.x,y-p.y)<config.radius+28||state.entities.some(e=>e.hp>0&&Math.hypot(x-e.x,y-e.y)<e.radius+config.radius+4))continue;
    const e={id:`spider-${state.nextId++}`,kind:'spider',type,pointId:point.id,x,y,hp:config.hp,maxHP:config.hp,radius:config.radius,facing:'down',moving:false,walkTime:0,recoverTime:0,age:0,hitTime:10,damageTotal:0,hits:0,spawnShield:SPIDER.spawnGrace,attackCooldown:1,windup:0,deathAge:0,deathHandled:false};state.entities.push(e);point.index++;return e;
  }
  return null;
}
export function advanceSpiderSpawns(s,dt,p,{paused=false,obstacles=[]}={}){
  if(paused)return;for(const point of s.points){point.timer-=Math.max(0,dt);if(point.timer>0)continue;
    point.timer=spiderPopulation(s,point.id)<SPIDER.perPoint&&spawn(s,point,p,obstacles)?SPIDER.spawnInterval:.4;
  }
}
function move(e,dx,dy,speed,dt,obstacles,avoid=null){
  const startX=e.x,startY=e.y;
  const length=Math.hypot(dx,dy);if(length<1)return;const distance=speed*dt,steps=Math.max(1,Math.ceil(distance/3));
  for(let i=0;i<steps;i++){const x=e.x+dx/length*distance/steps,y=e.y+dy/length*distance/steps;if(!blocked(x,e.y,e.radius,obstacles)&&(!avoid||Math.hypot(x-avoid.x,e.y-avoid.y)>=SPIDER.bodyClearance))e.x=x;if(!blocked(e.x,y,e.radius,obstacles)&&(!avoid||Math.hypot(e.x-avoid.x,y-avoid.y)>=SPIDER.bodyClearance))e.y=y;}
  e.moving=Math.hypot(e.x-startX,e.y-startY)>.001;if(e.moving){e.facing=spiderFacing(e.x-startX,e.y-startY,e.facing);e.walkTime+=dt;}
}
export function fireWeb(s,e,p){
  const x=e.x,y=e.y-12,dx=p.x-x,dy=p.y-20-y,distance=Math.hypot(dx,dy)||1;
  e.facing=spiderFacing(dx,dy,e.facing);
  const shot={id:`web-${s.nextShotId++}`,x:x+dx/distance*16,y:y+dy/distance*16,vx:dx/distance*WEB.speed,vy:dy/distance*WEB.speed,age:0,travelled:0};s.shots.push(shot);return shot;
}
export function applySpiderHit(w,h,p,source,{silk=false}={}){
  const result={playerHit:false,bound:false,reinforced:false,upgraded:false};
  if(h.dead||w.failed)return result;
  if(w.bound)return{...result,...reinforceWebbed(w,silk?WEB.reinforceBuildup:WEB.meleeBuildup)};
  if(receiveDamage(h,p,source)){result.playerHit=true;if(silk&&!h.dead&&addWebbed(w)){result.bound=true;h.knockTime=0;}}
  return result;
}
export function advanceWebShots(s,dt,p,h,w,{paused=false,restrained=false,obstacles=[]}={}){
  const result={playerHit:false,bound:false,reinforced:false,upgraded:false};if(paused)return result;
  dt=Math.max(0,dt);
  if(restrained||h.dead||w.failed){s.shots=[];return result;}
  const alive=[];
  for(const shot of s.shots){
    let removed=false;const distance=WEB.speed*Math.max(0,dt),steps=Math.max(1,Math.ceil(distance/3));shot.age+=Math.max(0,dt);
    for(let i=0;i<steps;i++){
      shot.x+=shot.vx*dt/steps;shot.y+=shot.vy*dt/steps;shot.travelled+=distance/steps;
      if(blocked(shot.x,shot.y,3,obstacles)||shot.travelled>WEB.range){removed=true;break;}
      if(((shot.x-p.x)/(w.bound?42:10+WEB.radius))**2+((shot.y-(p.y-(w.bound?17:20)))/(w.bound?20:12+WEB.radius))**2<=1){
        removed=true;
        const hit=applySpiderHit(w,h,p,{...shot,damage:1},{silk:true});for(const key of Object.keys(result))result[key]||=hit[key];
        break;
      }
    }
    if(!removed)alive.push(shot);
  }
  s.shots=alive;return result;
}
export function advanceSpiderEffects(s,dt){s.entities=s.entities.filter(e=>e.hp>0||(e.deathAge+=Math.max(0,dt))<SPIDER.deathDuration||!e.deathHandled);}
export function handleSpiderDefeats(s,events){for(const event of events){if(!event.killed)continue;const e=s.entities.find(e=>e.id===event.id);if(!e||e.hp>0||e.deathHandled)continue;e.deathHandled=true;e.deathAge=0;e.windup=0;s.kills++;}}
function roamRandom(e){e.roamSeed=(Math.imul(e.roamSeed??(Number(e.id.slice(7))+1)*7919,1664525)+1013904223)>>>0;return e.roamSeed/4294967296;}
function retreatDirection(e,p,obstacles){
  if(e.retreatSlide){const {dx,dy}=e.retreatSlide;if(!blocked(e.x+dx*3,e.y+dy*3,e.radius,obstacles))return e.retreatSlide;e.retreatSlide=null;}
  const distance=Math.hypot(e.x-p.x,e.y-p.y),angle=distance>.001?Math.atan2(e.y-p.y,e.x-p.x):roamRandom(e)*Math.PI*2;
  let best=null,score=distance;
  for(const offset of [0,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2]){
    const dx=Math.cos(angle+offset),dy=Math.sin(angle+offset),x=e.x+dx*3,y=e.y+dy*3,next=Math.hypot(x-p.x,y-p.y);
    if(next>score+.0001&&!blocked(x,y,e.radius,obstacles)){best={dx,dy};score=next;}
  }
  if(best)return best;
  // At a corner the first step may have to follow a wall before distance can grow.
  let slideScore=-Infinity;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(!blocked(e.x+dx*3,e.y+dy*3,e.radius,obstacles)){
    const end=Math.hypot(e.x+dx*SPIDER.retreatDistance*2-p.x,e.y+dy*SPIDER.retreatDistance*2-p.y);
    if(end>slideScore){best={dx,dy};slideScore=end;}
  }
  if(best)e.retreatSlide=best;return best;
}
function chooseRoamTarget(e,home,p,obstacles){
  for(let i=0;i<16;i++){
    const angle=roamRandom(e)*Math.PI*2,radius=45+roamRandom(e)*85;
    const x=Math.max(SPIDER_ZONE.x+e.radius+10,Math.min(SPIDER_ZONE.x+SPIDER_ZONE.w-e.radius-10,home.x+Math.cos(angle)*radius)),y=Math.max(SPIDER_ZONE.y+e.radius+10,Math.min(SPIDER_ZONE.y+SPIDER_ZONE.h-e.radius-10,home.y+Math.sin(angle)*radius));
    if(!blocked(x,y,e.radius,obstacles)&&Math.hypot(x-p.x,y-p.y)>=SPIDER.retreatDistance){e.roamTarget={x,y};e.roamTimer=2+roamRandom(e)*3;return;}
  }
  e.roamTarget={x:e.x,y:e.y};e.roamTimer=.5;
}
// Keep the original export for older callers; this movement applies to any defeat.
export function advanceSpidersAfterWebDefeat(s,dt,p,{obstacles=[]}={}){
  dt=Math.max(0,dt);s.shots=[];advanceSpiderEffects(s,dt);advanceSpiderSpawns(s,dt,p,{obstacles});
  for(const e of s.entities){
    if(e.hp<=0)continue;
    const config=SPIDER_TYPES[e.type],home=s.points[e.pointId];e.age+=dt;e.hitTime+=dt;e.spawnShield=Math.max(0,e.spawnShield-dt);e.windup=0;e.recoverTime=0;e.attackCooldown=config.cooldown;e.moving=false;
    if(e.webRetreat===undefined){e.webRetreat=true;e.roamTimer=0;e.roamPause=0;}
    if(e.webRetreat&&Math.hypot(e.x-p.x,e.y-p.y)>=SPIDER.retreatDistance)e.webRetreat=false;
    if(e.webRetreat){const direction=retreatDirection(e,p,obstacles);if(direction)move(e,direction.dx*100,direction.dy*100,config.speed,dt,obstacles);continue;}
    e.roamTimer=Math.max(0,e.roamTimer-dt);e.roamPause=Math.max(0,e.roamPause-dt);
    if(e.roamPause>0)continue;
    if(!e.roamTarget||e.roamTimer===0)chooseRoamTarget(e,home,p,obstacles);
    const dx=e.roamTarget.x-e.x,dy=e.roamTarget.y-e.y;
    if(Math.hypot(dx,dy)<5){e.roamTimer=0;e.roamPause=.35+roamRandom(e)*.8;continue;}
    move(e,dx,dy,config.speed*.55,dt,obstacles,p);
  }
}
export function advanceSpiders(s,dt,p,h,w,{paused=false,restrained=false,obstacles=[]}={}){
  if(paused)return{playerHit:false,bound:false,reinforced:false,upgraded:false};dt=Math.max(0,dt);
  advanceSpiderEffects(s,dt);advanceSpiderSpawns(s,dt,p,{obstacles});
  const result=advanceWebShots(s,dt,p,h,w,{restrained,obstacles});
  for(const e of s.entities){
    if(e.hp<=0)continue;
    const config=SPIDER_TYPES[e.type],home=s.points[e.pointId];e.age+=dt;e.hitTime+=dt;e.spawnShield=Math.max(0,e.spawnShield-dt);e.attackCooldown=Math.max(0,e.attackCooldown-dt);e.recoverTime=Math.max(0,(e.recoverTime??0)-dt);e.moving=false;
    if(e.spawnShield>0)continue;
    if(e.hitTime<.22){e.windup=0;e.attackCooldown=Math.max(e.attackCooldown,.5);continue;}
    const distance=Math.hypot(p.x-e.x,p.y-e.y),chase=!h.dead&&!restrained&&!w.failed&&insideSpiderYard(p)&&distance<SPIDER.aggro&&Math.hypot(p.x-home.x,p.y-home.y)<SPIDER.leash;
    const sight=!lineBlocked(e.x,e.y-12,p.x,p.y-20,[...SOLIDS,...obstacles]);
    if(e.windup>0){
      if(chase)e.facing=spiderFacing(p.x-e.x,p.y-e.y,e.facing);
      e.windup=Math.max(0,e.windup-dt);
      if(e.windup===0){
        if(chase&&sight&&distance<=config.range+8){
          if(e.type==='weaver')fireWeb(s,e,p);
          else{const hit=applySpiderHit(w,h,p,{x:e.x,y:e.y,damage:1});for(const key of Object.keys(result))result[key]||=hit[key];}
        }
        e.attackCooldown=config.cooldown;e.recoverTime=.28;
      }
      continue;
    }
    if(e.recoverTime>0)continue;
    if(chase&&sight&&distance<=config.range&&e.attackCooldown===0){e.facing=spiderFacing(p.x-e.x,p.y-e.y,e.facing);e.windup=config.windup;continue;}
    let dx=home.x+Math.sin(e.age*.6+e.pointId)*28-e.x,dy=home.y+Math.cos(e.age*.6+e.pointId)*25-e.y,speed=config.speed*.35;
    if(chase){dx=p.x-e.x;dy=p.y-e.y;speed=config.speed;if(e.type==='weaver'){if(distance<85){dx=-dx;dy=-dy;}else if(distance<165&&sight)speed=0;}else if(distance<24)speed=0;}
    if(restrained&&distance<58){dx=e.x-p.x;dy=e.y-p.y;speed=config.speed;}
    for(const other of s.entities)if(other!==e&&other.hp>0){const dx2=e.x-other.x,dy2=e.y-other.y,d=Math.hypot(dx2,dy2),gap=e.radius+other.radius+4;if(d>0&&d<gap){dx+=dx2/d*(gap-d)*3;dy+=dy2/d*(gap-d)*3;}}
    move(e,dx,dy,speed,dt,obstacles);
  }
  return result;
}

export const advanceSpidersAfterDefeat=advanceSpidersAfterWebDefeat;
