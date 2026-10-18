export const MUMMIFIELD={max:100,buildup:34,escapePresses:28,secondPresses:64,firstDuration:8,secondDuration:8,decayDelay:8,decayRate:5,frames:16,fps:10,secondFPS:16,fallFrames:8,fallFPS:8,fallDuration:1,transitionFrames:24,transitionFPS:12,transitionDuration:2,captureFrames:24,captureFPS:12,captureDuration:2};
export const createMummifield=()=>({amount:0,bound:false,tier:0,presses:0,quiet:0,time:0,remaining:0,failed:false,transitioning:false,capturing:false});
export const mummyEscapePresses=s=>s.tier===2?MUMMIFIELD.secondPresses:MUMMIFIELD.escapePresses;
export function addMummifield(s,amount=MUMMIFIELD.buildup){
  if(s.bound||s.failed)return false;
  s.amount=Math.min(MUMMIFIELD.max,s.amount+Math.max(0,amount));s.quiet=0;
  if(s.amount<MUMMIFIELD.max)return false;
  s.bound=true;s.tier=0;s.capturing=true;s.presses=0;s.time=0;s.remaining=0;return true;
}
export function advanceMummifield(s,dt,h){
  const result={entered:false,wrapping:false,upgraded:false,failed:false};dt=Math.max(0,dt);s.time+=dt;
  if(s.failed)return result;
  if(s.bound){
    if(s.capturing){
      if(s.time<MUMMIFIELD.captureDuration-1e-9)return result;
      const overflow=Math.max(0,s.time-MUMMIFIELD.captureDuration);
      s.capturing=false;s.tier=1;s.presses=0;s.time=overflow;s.remaining=MUMMIFIELD.firstDuration-overflow;result.entered=true;
    }else if(!s.transitioning)s.remaining-=dt;
    if(s.tier===1&&!s.capturing&&!s.transitioning&&s.remaining<=1e-9){
      s.transitioning=true;s.time=Math.max(0,-s.remaining);s.remaining=0;result.wrapping=true;
    }
    if(s.transitioning){
      if(s.time<MUMMIFIELD.transitionDuration-1e-9)return result;
      const overflow=Math.max(0,s.time-MUMMIFIELD.transitionDuration);
      s.transitioning=false;s.tier=2;s.presses=0;s.time=overflow;s.remaining=MUMMIFIELD.secondDuration-overflow;result.upgraded=true;
    }
    if(s.tier===2&&s.remaining<=1e-9){
      s.time=Math.max(0,-s.remaining);s.remaining=0;s.failed=true;result.failed=true;
      if(h){h.dead=true;h.deathTime=0;h.hurtTime=0;h.knockTime=0;}
    }
    return result;
  }
  const before=s.quiet;s.quiet+=dt;
  s.amount=Math.max(0,s.amount-MUMMIFIELD.decayRate*(Math.max(0,s.quiet-MUMMIFIELD.decayDelay)-Math.max(0,before-MUMMIFIELD.decayDelay)));
  return result;
}
export function struggleMummifield(s,h,{repeat=false}={}){
  if(!s.bound||s.failed||s.capturing||s.transitioning||h.dead||repeat||s.remaining<=0)return false;
  const required=mummyEscapePresses(s);s.presses=Math.min(required,s.presses+1);
  if(s.presses<required)return false;
  Object.assign(s,createMummifield());h.hurtTime=0;h.knockTime=0;h.invulnerable=Math.max(h.invulnerable,1.5);return true;
}
export const mummifieldFrame=time=>Math.floor(Math.max(0,time)*MUMMIFIELD.fps)%MUMMIFIELD.frames;
export const mummifieldPose=s=>s.failed?{sequence:'fall',frame:Math.min(MUMMIFIELD.fallFrames-1,Math.floor(Math.max(0,s.time)*MUMMIFIELD.fallFPS)),gameOver:s.time>=MUMMIFIELD.fallDuration}:s.capturing?{sequence:'capture',frame:Math.min(MUMMIFIELD.captureFrames-1,Math.floor(Math.max(0,s.time)*MUMMIFIELD.captureFPS+1e-9)),gameOver:false}:s.transitioning?{sequence:'transition',frame:Math.min(MUMMIFIELD.transitionFrames-1,Math.floor(Math.max(0,s.time)*MUMMIFIELD.transitionFPS+1e-9)),gameOver:false}:s.tier===2?{sequence:'second',frame:Math.floor(Math.max(0,s.time)*MUMMIFIELD.secondFPS)%MUMMIFIELD.frames,gameOver:false}:{sequence:'first',frame:mummifieldFrame(s.time),gameOver:false};
