import {WORLD,SOLIDS,collides} from './core.mjs?v=18';
export const HEALTH={maxHP:6,damage:1,invulnerability:1.25,hurtDuration:.38,knockDuration:.18,knockSpeed:200,shotInterval:1.35,bulletSpeed:110};
export function createHealth(){return{hp:HEALTH.maxHP,maxHP:HEALTH.maxHP,invulnerable:0,hurtTime:0,knockTime:0,knockX:0,knockY:0,facing:'down',dead:false,deathTime:0,hitsTaken:0};}
export function receiveDamage(h,p,source){
  if(h.dead||h.invulnerable>0)return false;
  h.hp=Math.max(0,h.hp-(source.damage??HEALTH.damage));h.dead=h.hp===0;h.hitsTaken++;
  if(h.dead)h.deathTime=0;
  h.invulnerable=HEALTH.invulnerability;h.hurtTime=HEALTH.hurtDuration;h.knockTime=HEALTH.knockDuration;h.facing=p.facing;
  const dx=source.vx??(p.x-source.x),dy=source.vy??(p.y-source.y);const length=Math.hypot(dx,dy)||1;
  h.knockX=dx/length;h.knockY=dy/length;p.moving=false;p.actualMoving=false;return true;
}
export function advanceHealth(h,p,dt,obstacles=[]){
  if(!h.dead&&h.knockTime>0){
    const amount=HEALTH.knockSpeed*Math.min(dt,h.knockTime)*(h.knockTime/HEALTH.knockDuration),steps=Math.max(1,Math.ceil(amount/2));
    for(let i=0;i<steps;i++){const x=p.x+h.knockX*amount/steps,y=p.y+h.knockY*amount/steps;if(!collides(x,p.y,obstacles))p.x=x;if(!collides(p.x,y,obstacles))p.y=y;}
  }
  h.invulnerable=Math.max(0,h.invulnerable-dt);h.hurtTime=Math.max(0,h.hurtTime-dt);h.knockTime=Math.max(0,h.knockTime-dt);
}
export function hurtFrame(h){return Math.min(3,Math.max(0,Math.floor((HEALTH.hurtDuration-h.hurtTime)/HEALTH.hurtDuration*4)));}
export function heartFill(h,index){return Math.max(0,Math.min(2,h.hp-index*2));}
export function updateShooter(d,dt,bullets){
  d.fireTime=(d.fireTime??10)+dt;
  if(d.hp<=0){d.shotTimer=1;return;}
  d.shotTimer=(d.shotTimer??1.6)-dt;
  if(d.shotTimer<=0){d.shotTimer+=HEALTH.shotInterval;d.fireTime=0;bullets.push({x:d.x,y:d.y-18,vx:0,vy:HEALTH.bulletSpeed,age:0,damage:HEALTH.damage});}
}
function bulletBlocked(x,y,obstacles){return x<WORLD.left+6||x>WORLD.left+WORLD.width-6||y<WORLD.top+4||y>WORLD.top+WORLD.height-4||[...SOLIDS,...obstacles].some(r=>x+3>r.x&&x-3<r.x+r.w&&y+3>r.y&&y-3<r.y+r.h);}
export function updateProjectiles(bullets,dt,p,h,obstacles=[]){
  let hit=false;const alive=[];
  for(const b of bullets){let removed=false;b.age+=dt;const steps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/3));
    for(let i=0;i<steps;i++){
      b.x+=b.vx*dt/steps;b.y+=b.vy*dt/steps;
      if(bulletBlocked(b.x,b.y,obstacles)||b.age>9){removed=true;break;}
      if(((b.x-p.x)/10)**2+((b.y-(p.y-20))/12)**2<=1){if(receiveDamage(h,p,b))hit=true;removed=true;break;}
    }
    if(!removed)alive.push(b);
  }
  bullets.splice(0,bullets.length,...alive);return hit;
}
