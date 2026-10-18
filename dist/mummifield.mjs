export const MUMMIFIELD={max:100,buildup:34,escapePresses:28,decayDelay:8,decayRate:5,frames:16,fps:10};
export const createMummifield=()=>({amount:0,bound:false,presses:0,quiet:0,time:0});
export function addMummifield(s,amount=MUMMIFIELD.buildup){
  if(s.bound)return false;
  s.amount=Math.min(MUMMIFIELD.max,s.amount+Math.max(0,amount));s.quiet=0;
  if(s.amount<MUMMIFIELD.max)return false;
  s.bound=true;s.presses=0;s.time=0;return true;
}
export function advanceMummifield(s,dt){
  dt=Math.max(0,dt);s.time+=dt;if(s.bound)return;
  const before=s.quiet;s.quiet+=dt;
  s.amount=Math.max(0,s.amount-MUMMIFIELD.decayRate*(Math.max(0,s.quiet-MUMMIFIELD.decayDelay)-Math.max(0,before-MUMMIFIELD.decayDelay)));
}
export function struggleMummifield(s,h,{repeat=false}={}){
  if(!s.bound||h.dead||repeat)return false;
  s.presses=Math.min(MUMMIFIELD.escapePresses,s.presses+1);
  if(s.presses<MUMMIFIELD.escapePresses)return false;
  Object.assign(s,createMummifield());h.hurtTime=0;h.knockTime=0;h.invulnerable=Math.max(h.invulnerable,1.5);return true;
}
export const mummifieldFrame=time=>Math.floor(Math.max(0,time)*MUMMIFIELD.fps)%MUMMIFIELD.frames;
