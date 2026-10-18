import {lineBlocked} from './core.mjs?v=12';
export const COMBAT={slashDuration:.34,chargeDuration:.8,spinDuration:.64,slashDamage:20,spinDamage:60,slashReach:56,spinReach:66,dummyHP:300};
export function createCombat(){return{state:'idle',time:0,charge:0,held:false,facing:'down',id:0,hitIds:new Set(),stats:{hits:0,total:0,last:0,lastKind:'',spins:0}};}
function begin(c,state,facing){c.state=state;c.time=0;c.facing=facing;c.id++;c.hitIds=new Set();if(state==='spin')c.stats.spins++;}
export function pressAttack(c,facing){if(c.held)return;c.held=true;if(c.state==='idle'){c.charge=0;begin(c,'slash',facing);}}
export function releaseAttack(c){c.held=false;if(c.state==='charging'){if(c.charge>=COMBAT.chargeDuration)begin(c,'spin',c.facing);else{c.state='idle';c.time=0;}c.charge=0;}}
export function cancelAttack(c){c.state='idle';c.time=0;c.charge=0;c.held=false;c.hitIds=new Set();}
export function advanceCombat(c,dt){
  c.time+=dt;
  if(c.state==='slash'&&c.time>=COMBAT.slashDuration){c.state=c.held?'charging':'idle';c.time=0;c.charge=0;}
  else if(c.state==='charging')c.charge=Math.min(COMBAT.chargeDuration,c.charge+dt);
  else if(c.state==='spin'&&c.time>=COMBAT.spinDuration){c.state='idle';c.time=0;}
}
export function chargeRatio(c){return c.state==='charging'?Math.min(1,c.charge/COMBAT.chargeDuration):0;}
export function attackFrame(c){if(c.state==='slash')return Math.min(3,Math.floor(c.time/COMBAT.slashDuration*4));if(c.state==='spin')return Math.min(7,Math.floor(c.time/COMBAT.spinDuration*8));return c.charge>=COMBAT.chargeDuration?1:0;}
export function createDummies(){return[[468,474],[352,397],[626,466],[280,354]].map(([x,y],i)=>({id:i+1,x,y,hp:COMBAT.dummyHP,maxHP:COMBAT.dummyHP,radius:12,hitTime:10,restoreTime:0,damageTotal:0,hits:0,kind:i===3?'shooter':'target',shotTimer:1.6,fireTime:10}));}
export function dummyObstacles(dummies){return dummies.map(d=>({x:d.x-11,y:d.y-8,w:22,h:12}));}
export function canHit(c,p,d,obstacles=[]){
  if(d.hp<=0||d.spawnShield>0||c.hitIds.has(d.id)||lineBlocked(p.x,p.y,d.x,d.y,obstacles))return false;
  const dx=d.x-p.x,dy=d.y-p.y,dist=Math.hypot(dx,dy);
  if(c.state==='spin')return c.time>=.06&&c.time<=.55&&dist<=COMBAT.spinReach+d.radius;
  if(c.state!=='slash'||c.time<.07||c.time>.25||dist>COMBAT.slashReach+d.radius)return false;
  const v={down:[0,1],left:[-1,0],right:[1,0],up:[0,-1]}[c.facing];
  const forward=dx*v[0]+dy*v[1],side=Math.abs(dx*v[1]-dy*v[0]);
  return forward>=-4&&side<=forward*.95+d.radius;
}
export function hitDummy(d,damage,kind,stats){const wasAlive=d.hp>0;d.hp=Math.max(0,d.hp-damage);d.hitTime=0;d.restoreTime=d.hp===0?2.2:4;d.damageTotal+=damage;d.hits++;stats.hits++;stats.total+=damage;stats.last=damage;stats.lastKind=kind;return{id:d.id,x:d.x,y:d.y-38,targetX:d.x,targetY:d.y,killed:wasAlive&&d.hp===0,damage,kind};}
export function resolveHits(c,p,dummies,obstacles=[]){const hits=[];for(const d of dummies){if(!canHit(c,p,d,obstacles))continue;const damage=c.state==='spin'?COMBAT.spinDamage:COMBAT.slashDamage;c.hitIds.add(d.id);hits.push(hitDummy(d,damage,c.state,c.stats));}return hits;}
export function updateDummies(dummies,dt){for(const d of dummies){d.hitTime+=dt;if(d.restoreTime>0){d.restoreTime=Math.max(0,d.restoreTime-dt);if(d.restoreTime===0)d.hp=d.maxHP;}}}
