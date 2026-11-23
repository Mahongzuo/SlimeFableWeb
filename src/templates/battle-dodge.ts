import type {Vec} from '../slime/types';

export const dodgeTiming={distance:2.2,duration:.42,cooldown:1.2,immuneFrom:.06,perfectUntil:.18,immuneUntil:.30};
export function dodgeDirection(keys:ReadonlySet<string>,yaw:number,facing:Vec):Vec {
 const x=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
 const z=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
 const len=Math.hypot(x,z);
 if(!len)return [-facing[0],0,-facing[2]];
 return [(Math.cos(yaw)*x-Math.sin(yaw)*z)/len,0,(-Math.sin(yaw)*x-Math.cos(yaw)*z)/len];
}
export class BattleDodge {
 started=-Infinity;
 direction:Vec=[0,0,1];
 perfect=false;
 rewardUntil=-Infinity;
 slowUntil=-Infinity;
 private previousAttack=-1;
 begin(now:number,dir:Vec){
  if(now-this.started<dodgeTiming.cooldown)return false;
  this.started=now;this.direction=dir;this.perfect=false;return true;
 }
 motion(from:number,to:number):Vec|null {
  if(to<=this.started||from>=this.started+dodgeTiming.duration)return null;
  const progress=(t:number)=>{const u=Math.max(0,Math.min(1,(t-this.started)/dodgeTiming.duration));return u*u*(3-2*u);};
  const distance=(progress(to)-progress(from))*dodgeTiming.distance;
  return [this.direction[0]*distance,0,this.direction[2]*distance];
 }
 contact(now:number,attack:number):'duplicate'|'hit'|'evaded'|'perfect' {
  if(this.previousAttack===attack)return 'duplicate';
  this.previousAttack=attack;
  const age=now-this.started;
  if(age<.06-1e-8||age>.30+1e-8)return 'hit';
  if(age>.18+1e-8||this.perfect)return 'evaded';
  this.perfect=true;this.rewardUntil=now+3;this.slowUntil=now+.2;
  return 'perfect';
 }
 multiplier(now:number){
  if(now>this.rewardUntil)return 1;
  this.rewardUntil=-Infinity;return 1.35;
 }
 clear(){this.started=this.rewardUntil=this.slowUntil=-Infinity;this.perfect=false;}
}

// Both endpoints are measured relative to the moving player's capsule centre.
export function boltContact(from:Vec,to:Vec,radius:number):number|null{
 const dx=to[0]-from[0],dy=to[1]-from[1],dz=to[2]-from[2];
 const c=from[0]**2+from[1]**2+from[2]**2-radius**2;
 if(c<=0)return 0;
 const a=dx*dx+dy*dy+dz*dz,b=from[0]*dx+from[1]*dy+from[2]*dz;
 const discriminant=b*b-a*c;
 if(a<1e-12||discriminant<0)return null;
 const t=(-b-Math.sqrt(discriminant))/a;
 return t>=0&&t<=1?t:null;
}

