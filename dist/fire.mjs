import {WORLD,SOLIDS} from './core.mjs?v=12';
import {COMBAT,hitDummy} from './combat.mjs?v=12';

export const FIRE={speed:240,range:300,spinRange:80,slashStart:.08,spinStart:.06,ringDuration:.64,waveFrames:8,ringFrames:8};
export const fullHearts=h=>!h.dead&&h.hp>0&&h.hp===h.maxHP;
export function createSwordFire(){return{waves:[],rings:[],lastAttack:-1};}

// Every projectile in an attack shares the melee hit set. Later attacks replace
// their set, so projectiles still in flight retain their own hit history.
export function emitSwordFire(f,c,p,h){
  if(!['slash','spin'].includes(c.state)||c.time<(c.state==='slash'?FIRE.slashStart:FIRE.spinStart)||f.lastAttack===c.id)return false;
  f.lastAttack=c.id;
  if(!fullHearts(h)||h.hurtTime>0)return false;
  const spin=c.state==='spin',base={right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2}[c.facing];
  // A blocked slash is consumed, never queued for after the current waves expire.
  if(!spin&&f.waves.length>0)return false;
  const count=spin?8:1;
  for(let i=0;i<count;i++){
    const angle=base+i*Math.PI/4,dx=Math.cos(angle),dy=Math.sin(angle);
    f.waves.push({x:p.x+dx*18,y:p.y+dy*18,dx,dy,angle,age:0,travelled:0,range:spin?FIRE.spinRange:FIRE.range,kind:spin?'fireSpin':'fireSlash',damage:spin?COMBAT.spinDamage:COMBAT.slashDamage,hitIds:c.hitIds});
  }
  if(spin)f.rings.push({x:p.x,y:p.y-20,age:0});
  return true;
}

function blocked(x,y,obstacles){return x<WORLD.left+4||y<4||x>WORLD.left+WORLD.width-4||y>WORLD.height-4||[...SOLIDS,...obstacles].some(r=>x+4>r.x&&x-4<r.x+r.w&&y+4>r.y&&y-4<r.y+r.h);}
function touches(w,d){const dx=d.x-w.x,dy=d.y-w.y;return Math.abs(dx*w.dx+dy*w.dy)<=10+d.radius&&Math.abs(-dx*w.dy+dy*w.dx)<=18+d.radius;}
export function updateSwordFire(f,dt,dummies,stats,obstacles=[]){
  const hits=[],alive=[];
  for(const w of f.waves){
    w.age+=dt;let removed=false;
    const distance=Math.min(FIRE.speed*Math.max(0,dt),w.range-w.travelled),steps=Math.max(1,Math.ceil(distance/3));
    for(let i=0;i<steps;i++){
      const step=distance/steps;w.x+=w.dx*step;w.y+=w.dy*step;w.travelled+=step;
      if(blocked(w.x,w.y,obstacles)){removed=true;break;}
      const target=dummies.find(d=>d.hp>0&&!(d.spawnShield>0)&&touches(w,d));
      if(target){
        if(!w.hitIds.has(target.id)){w.hitIds.add(target.id);hits.push(hitDummy(target,w.damage,w.kind,stats));}
        removed=true;break;
      }
    }
    if(!removed&&w.travelled<w.range-.001)alive.push(w);
  }
  f.waves=alive;f.rings=f.rings.filter(r=>(r.age+=dt)<FIRE.ringDuration);
  return hits;
}
export const waveFrame=age=>Math.floor(Math.max(0,age)*16)%FIRE.waveFrames;
export function ringPose(age){const t=Math.max(0,Math.min(1,age/FIRE.ringDuration));return{frame:Math.min(7,Math.floor(t*8)),size:Math.round(80+72*t),alpha:Math.min(1,(1-t)/.3)};}
