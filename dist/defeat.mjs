export const DEFEAT={spinDuration:2,collapseDuration:1,restDuration:1.2,spinFrames:16,collapseFrames:16,restFrames:8};
export const GAME_OVER_TIME=DEFEAT.spinDuration+DEFEAT.collapseDuration+DEFEAT.restDuration;
export const DEFEAT_HEAD={x:15,y:-17};
export function advanceDefeat(h,dt){if(h.dead)h.deathTime=(h.deathTime||0)+Math.max(0,dt);else h.deathTime=0;}
export function defeatPose(time=0,facing='down'){
  time=Math.max(0,time);
  if(time<2){const offset={down:0,left:4,up:6,right:8}[facing]??0;const frame=time>=1.75?12+Math.min(3,Math.floor((time-1.75)*16)):(Math.floor(time*16)+offset)%16;return{stage:'spin',frame,stars:false,gameOver:false};}
  if(time<3)return{stage:'collapse',frame:Math.min(15,Math.floor((time-2)*16)),stars:time>=2.85,gameOver:false};
  return{stage:'rest',frame:Math.floor((time-3)*8)%8,stars:true,gameOver:time>=GAME_OVER_TIME};
}
export function starOrbit(time,headX,headY){return Array.from({length:3},(_,i)=>{const angle=time*Math.PI*1.6+i*Math.PI*2/3;return{x:headX+Math.cos(angle)*19,y:headY-16+Math.sin(angle)*7,frame:Math.floor(time*8+i)%4,alpha:.72+.28*(Math.sin(angle)+1)/2};});}
