export const COMBAT_FRAME={size:160,anchorX:80,anchorY:112};
export function chargeWalkFrame(player){return Math.floor((player.distance||0)/6)%4;}
export function chargeAuraAlpha(time,ratio){
  const pulse=(Math.sin(time*Math.PI*6)+1)/2;
  return (.12+.78*pulse)*(.55+.45*Math.max(0,Math.min(1,ratio)));
}
export function bladeZone(facing,x,y){
  if(facing==='left')return{x:x-63,y:y-39,w:58,h:31};
  if(facing==='right')return{x:x+5,y:y-39,w:58,h:31};
  if(facing==='up')return{x:x-15,y:y-88,w:30,h:32};
  return{x:x-11,y:y-33,w:22,h:54};
}
