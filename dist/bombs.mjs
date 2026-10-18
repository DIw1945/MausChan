import {collides} from './core.mjs?v=12';
import {hitDummy} from './combat.mjs?v=12';
import {receiveDamage} from './health.mjs?v=12';

export const BOMB={fuse:2.2,radius:88,damage:180,playerDamage:2,blastDuration:.64,breakDuration:.8,pickupRadius:18,placeDistance:24};
export const BOMB_SAMPLES=[[430,390],[392,488],[526,474]];
export const BRITTLE_ROCKS=[[542,410],[592,410],[700,592]];
const directions={down:[0,1],left:[-1,0],right:[1,0],up:[0,-1]};

export function createBombs(){return{count:0,nextId:1,drops:BOMB_SAMPLES.map(([x,y],id)=>({id,x,y})),placed:[],blasts:[],rocks:BRITTLE_ROCKS.map(([x,y],id)=>({id,x,y,state:'intact',age:0}))};}
export const rockObstacles=b=>b.rocks.filter(r=>r.state==='intact').map(r=>({x:r.x-22,y:r.y-22,w:44,h:26}));
export const canUseBomb=(b,h,usingNitro=false)=>b.count>0&&!h.dead&&h.hp>0&&h.hurtTime<=0&&!usingNitro;
export function collectBombs(b,p,h,usingNitro=false){
  if(h.dead||usingNitro)return 0;
  const before=b.drops.length;b.drops=b.drops.filter(d=>Math.hypot(d.x-p.x,d.y-p.y)>BOMB.pickupRadius);
  const collected=before-b.drops.length;b.count+=collected;return collected;
}
export function placeBomb(b,p,h,{usingNitro=false,obstacles=[]}={}){
  if(!canUseBomb(b,h,usingNitro))return null;
  const v=directions[p.facing],x=p.x+v[0]*BOMB.placeDistance,y=p.y+v[1]*BOMB.placeDistance;
  if(collides(x,y,[...rockObstacles(b),...obstacles])||b.placed.some(other=>Math.hypot(other.x-x,other.y-y)<20))return null;
  const bomb={id:b.nextId++,x,y,time:0};b.count--;b.placed.push(bomb);return bomb;
}
function blastTouchesRock(bomb,rock){
  const dx=Math.max(0,Math.abs(rock.x-bomb.x)-22),dy=Math.max(0,Math.abs(rock.y-9-bomb.y)-13);
  return Math.hypot(dx,dy)<=BOMB.radius;
}
export function advanceBombEffects(b,dt){
  dt=Math.max(0,dt);
  b.blasts=b.blasts.filter(blast=>(blast.age+=dt)<BOMB.blastDuration);
  for(const rock of b.rocks)if(rock.state==='breaking'){rock.age+=dt;if(rock.age>=BOMB.breakDuration)rock.state='gone';}
}
export function advanceBombs(b,dt,dummies,stats,p,h,{paused=false}={}){
  const result={hits:[],broken:[],playerHit:false,exploded:0};if(paused)return result;
  dt=Math.max(0,dt);advanceBombEffects(b,dt);
  const waiting=[];
  for(const bomb of b.placed){
    bomb.time+=dt;if(bomb.time+1e-9<BOMB.fuse){waiting.push(bomb);continue;}
    b.blasts.push({id:bomb.id,x:bomb.x,y:bomb.y,age:0});result.exploded++;
    for(const target of dummies)if(target.hp>0&&!(target.spawnShield>0)&&Math.hypot(target.x-bomb.x,target.y-bomb.y)<=BOMB.radius+target.radius)result.hits.push(hitDummy(target,BOMB.damage,'bomb',stats));
    for(const rock of b.rocks)if(rock.state==='intact'&&blastTouchesRock(bomb,rock)){rock.state='breaking';rock.age=0;result.broken.push(rock);}
    if(Math.hypot(p.x-bomb.x,p.y-bomb.y)<=BOMB.radius&&receiveDamage(h,p,{x:bomb.x,y:bomb.y,damage:BOMB.playerDamage}))result.playerHit=true;
  }
  b.placed=waiting;return result;
}
export const bombFuseFrame=time=>1+Math.floor(Math.max(0,time)*(time>BOMB.fuse*.65?16:6))%3;
export const bombBlastFrame=age=>Math.min(7,Math.floor(Math.max(0,age)/BOMB.blastDuration*8));
export const rockBreakFrame=age=>Math.min(7,Math.floor(Math.max(0,age)/BOMB.breakDuration*8));
