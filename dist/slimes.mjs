import {wanderAfterDefeat} from './defeat-wander.mjs?v=23';
import {SOLIDS,TRAINING_ZONE} from './core.mjs?v=12';
import {receiveDamage} from './health.mjs?v=12';

export const SLIME={perPoint:3,splitChildren:4,spawnInterval:3.2,spawnGrace:.55,aggro:210,leash:245,popDuration:.4,stickyMax:100,stickyFPS:9,escapePresses:12,decayDelay:6,decayRate:7};
export const SLIME_TYPES={
  normal:{name:'Slime เขียว',hp:40,speed:32,radius:11,goo:34,cooldown:1.8,windup:.52,art:'normal',scale:1},
  big:{name:'Slime ใหญ่',hp:100,speed:23,radius:19,goo:45,cooldown:2.2,windup:.68,art:'big',scale:1},
  swift:{name:'Slime เร็ว',hp:20,speed:65,radius:8,goo:26,cooldown:1.4,windup:.42,art:'swift',scale:1},
  tiny:{name:'Slime ลูก',hp:20,speed:58,radius:8,goo:26,cooldown:1.5,windup:.44,art:'big',scale:.5},
};
export const SLIME_POINTS=[{x:1150,y:260,types:['normal','swift','normal']},{x:1476,y:260,types:['big','normal','swift']},{x:1150,y:534,types:['swift','normal','swift']},{x:1476,y:534,types:['big','swift','normal']}];
export const insideTraining=p=>p.x>=TRAINING_ZONE.x&&p.x<=TRAINING_ZONE.x+TRAINING_ZONE.w&&p.y>=TRAINING_ZONE.y&&p.y<=TRAINING_ZONE.y+TRAINING_ZONE.h;
export const createSticky=()=>({amount:0,bound:false,presses:0,quiet:0,time:0});
export function addSticky(g,amount){
  if(g.bound)return false;g.amount=Math.min(SLIME.stickyMax,g.amount+Math.max(0,amount));g.quiet=0;
  if(g.amount<SLIME.stickyMax)return false;
  g.bound=true;g.presses=0;g.time=0;return true;
}
export function advanceSticky(g,dt){
  dt=Math.max(0,dt);g.time+=dt;
  if(g.bound)return;
  const before=g.quiet;g.quiet+=dt;
  g.amount=Math.max(0,g.amount-SLIME.decayRate*(Math.max(0,g.quiet-SLIME.decayDelay)-Math.max(0,before-SLIME.decayDelay)));
}
export function struggleSticky(g,h,{repeat=false}={}){
  if(!g.bound||h.dead||repeat)return false;
  g.presses=Math.min(SLIME.escapePresses,g.presses+1);
  if(g.presses<SLIME.escapePresses)return false;
  g.amount=0;g.bound=false;g.quiet=0;g.time=0;h.hurtTime=0;h.knockTime=0;h.invulnerable=Math.max(h.invulnerable,1.2);return true;
}
export const stickyFrame=time=>Math.floor(Math.max(0,time)*SLIME.stickyFPS)%12;
export const slimeFrame=s=>Math.floor(Math.max(0,s.age)*(s.type==='swift'||s.type==='tiny'?12:8))%8;
export const slimePopFrame=age=>Math.min(3,Math.floor(Math.max(0,age)/SLIME.popDuration*4));

export function createSlimes(){return{nextId:1,kills:0,entities:[],points:SLIME_POINTS.map((p,id)=>({...p,id,index:0,timer:.4+id*.35}))};}
export const pointPopulation=(s,id)=>s.entities.filter(e=>e.pointId===id&&e.hp>0).length;
function makeSlime(state,point,type,x,y){
  const config=SLIME_TYPES[type],entity={id:`slime-${state.nextId++}`,kind:'slime',type,pointId:point.id,x,y,hp:config.hp,maxHP:config.hp,radius:config.radius,age:0,hitTime:10,damageTotal:0,hits:0,spawnShield:SLIME.spawnGrace,attackCooldown:.7,windup:0,deathAge:0,deathHandled:false};
  state.entities.push(entity);return entity;
}
function blocked(x,y,radius,obstacles){return x-radius<TRAINING_ZONE.x+8||x+radius>TRAINING_ZONE.x+TRAINING_ZONE.w-8||y-radius<TRAINING_ZONE.y+8||y+radius>TRAINING_ZONE.y+TRAINING_ZONE.h-8||[...SOLIDS,...obstacles].some(r=>x+radius*.75>r.x&&x-radius*.75<r.x+r.w&&y+radius*.4>r.y&&y-radius*.4<r.y+r.h);}
function spawnPosition(state,point,type,p,obstacles){
  const radius=SLIME_TYPES[type].radius,offsets=[[-28,0],[26,-22],[26,25],[-25,30],[0,-45],[46,0],[-44,-26],[0,46]];
  for(let i=0;i<offsets.length;i++){
    const [dx,dy]=offsets[(i+point.index)%offsets.length],x=point.x+dx,y=point.y+dy;
    if(!blocked(x,y,radius,obstacles)&&Math.hypot(x-p.x,y-p.y)>=radius+24&&!state.entities.some(e=>e.hp>0&&Math.hypot(e.x-x,e.y-y)<e.radius+radius+3))return{x,y};
  }
  return null;
}
export function advanceSlimeSpawns(state,dt,p,{paused=false,obstacles=[]}={}){
  if(paused)return;
  for(const point of state.points){
    point.timer-=Math.max(0,dt);if(point.timer>0)continue;
    const type=point.types[point.index%point.types.length];
    // Death splits may exceed the regular spawn cap; wait for their population to fall.
    if(pointPopulation(state,point.id)>=SLIME.perPoint){point.timer=.4;continue;}
    const position=spawnPosition(state,point,type,p,obstacles);if(!position){point.timer=.4;continue;}
    makeSlime(state,point,type,position.x,position.y);point.index++;point.timer=SLIME.spawnInterval;
  }
}
function moveSlime(e,dx,dy,speed,dt,obstacles){
  const length=Math.hypot(dx,dy);if(length<1)return;
  const distance=speed*dt,steps=Math.max(1,Math.ceil(distance/3));
  for(let i=0;i<steps;i++){
    const x=e.x+dx/length*distance/steps,y=e.y+dy/length*distance/steps;
    if(!blocked(x,e.y,e.radius,obstacles))e.x=x;if(!blocked(e.x,y,e.radius,obstacles))e.y=y;
  }
}
export function advanceSlimeEffects(state,dt){
  state.entities=state.entities.filter(e=>e.hp>0||(e.deathAge+=dt)<SLIME.popDuration||!e.deathHandled);
}
export function advanceSlimes(state,dt,p,h,goo,{paused=false,obstacles=[]}={}){
  const result={playerHit:false,bound:false};if(paused)return result;dt=Math.max(0,dt);
  advanceSlimeEffects(state,dt);
  advanceSlimeSpawns(state,dt,p,{obstacles});
  for(const e of state.entities){
    if(e.hp<=0)continue;
    const config=SLIME_TYPES[e.type],home=state.points[e.pointId];e.age+=dt;e.hitTime+=dt;e.spawnShield=Math.max(0,e.spawnShield-dt);e.attackCooldown=Math.max(0,e.attackCooldown-dt);
    if(e.spawnShield>0)continue;
    if(e.hitTime<.22){e.windup=0;e.attackCooldown=Math.max(e.attackCooldown,.4);continue;}
    const distance=Math.hypot(p.x-e.x,p.y-e.y),chase=!h.dead&&!goo.bound&&insideTraining(p)&&distance<SLIME.aggro&&Math.hypot(p.x-home.x,p.y-home.y)<SLIME.leash;
    if(e.windup>0){
      e.windup=Math.max(0,e.windup-dt);
      if(e.windup===0){
        if(chase&&distance<=e.radius+23&&receiveDamage(h,p,{x:e.x,y:e.y,damage:1})){result.playerHit=true;if(!h.dead&&addSticky(goo,config.goo)){result.bound=true;h.knockTime=0;}}
        e.attackCooldown=config.cooldown;
      }
      continue;
    }
    if(chase&&distance<=e.radius+16&&e.attackCooldown===0){e.windup=config.windup;continue;}
    let dx,dy,speed=config.speed;
    if(chase){dx=p.x-e.x;dy=p.y-e.y;if(distance<e.radius+12)speed=0;}
    else{dx=home.x+Math.sin(e.age*.6+Number(e.id.slice(6)))*35-e.x;dy=home.y+Math.cos(e.age*.5+Number(e.id.slice(6)))*30-e.y;speed*=.4;}
    if(goo.bound&&distance<42){dx=e.x-p.x;dy=e.y-p.y;speed=config.speed*.6;}
    for(const other of state.entities)if(other!==e&&other.hp>0){const ox=e.x-other.x,oy=e.y-other.y,d=Math.hypot(ox,oy),gap=e.radius+other.radius+3;if(d>0&&d<gap){dx+=ox/d*(gap-d)*3;dy+=oy/d*(gap-d)*3;}}
    moveSlime(e,dx,dy,speed,dt,obstacles);
  }
  return result;
}
export function handleSlimeDefeats(state,events){
  const split=[];
  for(const event of events){
    if(!event.killed)continue;
    const parent=state.entities.find(e=>e.id===event.id);if(!parent||parent.deathHandled||parent.hp>0)continue;
    parent.deathHandled=true;parent.deathAge=0;parent.windup=0;state.kills++;
    if(parent.type!=='big')continue;
    const point=state.points[parent.pointId];
    const x=Math.max(TRAINING_ZONE.x+40,Math.min(TRAINING_ZONE.x+TRAINING_ZONE.w-40,parent.x)),y=Math.max(TRAINING_ZONE.y+40,Math.min(TRAINING_ZONE.y+TRAINING_ZONE.h-40,parent.y));
    for(let i=0;i<SLIME.splitChildren;i++){
      split.push(makeSlime(state,point,'tiny',x+(i%2?15:-15),y+(i<2?-12:12)));
    }
  }
  return split;
}

export function advanceSlimesAfterDefeat(state,dt,p,{obstacles=[]}={}){
  dt=Math.max(0,dt);advanceSlimeEffects(state,dt);advanceSlimeSpawns(state,dt,p,{obstacles});
  for(const e of state.entities)if(e.hp>0)wanderAfterDefeat(e,dt,p,state.points[e.pointId],TRAINING_ZONE,SLIME_TYPES[e.type].speed,(x,y)=>blocked(x,y,e.radius,obstacles));
}
