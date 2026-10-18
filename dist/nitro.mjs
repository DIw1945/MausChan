export const NITRO={duration:4.6,fetchDuration:1.2,sipDuration:2,cheerDuration:1.4,heal:4,dropChance:.05,pickupRadius:18,grace:.35,sample:{x:412,y:432}};
export const NITRO_CUP=[[13,-33],[13,-32],[13,-32],[14,-32],[20,-25],[20,-30],[16,-38],[14,-43],[14,-44],[13,-43],[13,-43],[14,-44],[14,-43],[14,-42],[14,-43],[15,-42]];
export function createNitro(){return{count:0,active:false,time:0,drops:[{id:0,...NITRO.sample,sample:true}],nextDrop:1,rolled:new WeakSet()};}
export const canUseNitro=(n,h)=>!n.active&&!h.dead&&h.hp>0&&h.hp<h.maxHP&&h.hurtTime<=0&&n.count>0;
export function startNitro(n,h){if(!canUseNitro(n,h))return false;n.count--;n.active=true;n.time=0;return true;}
export function advanceNitro(n,h,dt){
  if(!n.active)return 0;
  if(h.dead||h.hp<=0){n.active=false;n.time=0;return 0;}
  n.time=Math.min(NITRO.duration,n.time+Math.max(0,dt));
  if(n.time+1e-9<NITRO.duration)return 0;
  const healed=Math.max(0,Math.min(NITRO.heal,h.maxHP-h.hp));h.hp+=healed;
  h.invulnerable=Math.max(h.invulnerable,NITRO.grace);n.active=false;n.time=NITRO.duration;
  return healed;
}
export function nitroPose(time){
  time=Math.max(0,time);
  if(time<NITRO.fetchDuration)return{stage:'fetch',frame:Math.min(15,Math.floor(time/NITRO.fetchDuration*16)),sparkle:false};
  if(time<NITRO.fetchDuration+NITRO.sipDuration)return{stage:'sip',frame:Math.min(15,Math.floor((time-NITRO.fetchDuration)/NITRO.sipDuration*16)),sparkle:false};
  const frame=Math.min(15,Math.floor((time-NITRO.fetchDuration-NITRO.sipDuration)/NITRO.cheerDuration*16));return{stage:'cheer',frame,sparkle:frame>=8};
}
export function collectNitro(n,p,h){
  if(h.dead||n.active)return 0;let found=0;
  n.drops=n.drops.filter(d=>{if(Math.hypot(d.x-p.x,d.y-p.y)<=NITRO.pickupRadius){found++;return false;}return true;});
  n.count+=found;return found;
}
export function rollNitroDrop(n,event,random=Math.random){
  if(!event.killed||n.rolled.has(event))return false;n.rolled.add(event);
  if(random()>=NITRO.dropChance)return false;
  n.drops.push({id:n.nextDrop++,x:event.targetX,y:event.targetY+18,sample:false});return true;
}
export const heartAmount=units=>units%2?(units===1?'½':`${Math.floor(units/2)}½`):String(units/2);
