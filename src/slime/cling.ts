import type {CollisionWorld,WallHit} from './world';
import type {Vec} from './types';

/**
 * Wall cling & slow climb, after UE USlimeClingComponent: the character owns the movement mode,
 * the solver only receives a cling plane (point + normal) that replaces the floor for the body.
 * Input is camera-relative: pushing into the wall climbs, pushing away descends, sideways strafes.
 */
export const CLING={climb:1.15,strafe:1.05,slide:.16,radius:.26,minHeight:.6,reach:.38,mantleReach:.62,mantle:2.4,jumpOut:4.4,jumpUp:5.8,cooldown:.32,graceSec:.1};
/** frame: the wall normal the input is read against; held while strafing so a key keeps its meaning around corners. */
export interface ClingState {point:Vec;normal:Vec;frame:Vec;top:number;mantle:Vec|null;vault?:boolean;grace:number}
export interface ClingInput {move:[number,number];jump:boolean;detach:boolean}
export type ClingEvent='none'|'jump'|'detach'|'mantle'|'vault'|'floor'|'lost'|'corner';
export interface ClingStep {position:Vec;velocity:Vec;state:ClingState|null;event:ClingEvent}

/** A wall in the push direction that is tall enough to climb (low obstacles keep stepping). */
export function tryAttach(world:CollisionWorld,pos:Vec,dir:[number,number]):ClingState|null{
 const l=Math.hypot(dir[0],dir[1]);if(l<.3)return null;const d:[number,number]=[dir[0]/l,dir[1]/l];
 const hit=world.wall(pos,d,CLING.radius+.14);if(!hit||hit.top-pos[1]<CLING.minHeight)return null;
 if(-(d[0]*hit.normal[0]+d[1]*hit.normal[2])<.55)return null;
 return fromHit(hit);
}
const fromHit=(h:WallHit,frame?:Vec):ClingState=>({point:[...h.point],normal:[...h.normal],frame:frame?[...frame]:[...h.normal],top:h.top,mantle:null,grace:CLING.graceSec});
const snap=(p:Vec,s:ClingState)=>{p[0]=s.point[0]+s.normal[0]*CLING.radius;p[2]=s.point[2]+s.normal[2]*CLING.radius};

export function stepCling(world:CollisionWorld,s:ClingState,pos:Vec,input:ClingInput,dt:number):ClingStep{
 const n=s.normal;
 if(s.mantle){const m=s.mantle,p:Vec=[...pos];
  if(p[1]<m[1]+.02){p[1]=Math.min(m[1]+.02,p[1]+CLING.mantle*dt);return {position:p,velocity:[0,CLING.mantle,0],state:s,event:'none'}}
  const dx=m[0]-p[0],dz=m[2]-p[2],d=Math.hypot(dx,dz),step=CLING.mantle*dt;
  if(d<=step)return {position:[m[0],m[1],m[2]],velocity:[-n[0]*1.4,0,-n[2]*1.4],state:null,event:s.vault?'vault':'mantle'};
  p[0]+=dx/d*step;p[2]+=dz/d*step;return {position:p,velocity:[dx/d*CLING.mantle,0,dz/d*CLING.mantle],state:s,event:'none'}}
 if(input.jump)return {position:[...pos],velocity:[n[0]*CLING.jumpOut,CLING.jumpUp,n[2]*CLING.jumpOut],state:null,event:'jump'};
 if(input.detach)return {position:[pos[0]+n[0]*.06,pos[1],pos[2]+n[2]*.06],velocity:[n[0]*1.2,0,n[2]*1.2],state:null,event:'detach'};
 const t:[number,number]=[-n[2],n[0]],m=input.move,f=s.frame;
 const up=-(m[0]*f[0]+m[1]*f[2]),side=m[0]*-f[2]+m[1]*f[0];
 const vs=Math.abs(side)>.2?CLING.strafe*side:0,vy=Math.abs(up)>.2?CLING.climb*up:vs?0:-CLING.slide,frame:Vec=vs?f:n;
 const p:Vec=[pos[0]+t[0]*vs*dt,pos[1]+vy*dt,pos[2]+t[1]*vs*dt];
 const floor=world.support(p[0],p[2],pos[1]+.05);
 if(floor!==null&&p[1]<=floor+.005&&vy<0){p[1]=floor;return {position:p,velocity:[0,0,0],state:null,event:'floor'}}
 if(floor!==null&&p[1]<floor)p[1]=floor;
 const dir:[number,number]=[t[0]*Math.sign(vs),t[1]*Math.sign(vs)];
 // Inner corner: the strafe runs into another wall face.
 if(vs){const c=world.wall(p,dir,CLING.radius+.04);if(c&&c.top-p[1]>CLING.minHeight*.5&&c.normal[0]*n[0]+c.normal[2]*n[2]<.7){const ns=fromHit(c,frame);snap(p,ns);return {position:p,velocity:[0,vy,0],state:ns,event:'corner'}}}
 const hit=world.wall(p,[-n[0],-n[2]],CLING.reach);
 if(hit){const nx=n[0]+(hit.normal[0]-n[0])*.5,nz=n[2]+(hit.normal[2]-n[2])*.5,l=Math.hypot(nx,nz)||1;
  const ns:ClingState={point:[...hit.point],normal:[nx/l,0,nz/l],frame:vs?f:[nx/l,0,nz/l],top:hit.top,mantle:null,grace:CLING.graceSec};snap(p,ns);
  if(up>.2&&ns.top-p[1]<CLING.mantleReach&&mantle(world,ns,p))return {position:p,velocity:[0,vy,0],state:ns,event:'none'};
  if(p[1]>ns.top-HOLD)p[1]=ns.top-HOLD;
  return {position:p,velocity:[t[0]*vs,vy,t[1]*vs],state:ns,event:'none'}}
 // Lost the wall: near the top → mantle, strafing past an edge → wrap the outer corner, else a short grace.
 if(s.top-p[1]<CLING.mantleReach+.15&&up>=-.2){const ns={...s,grace:CLING.graceSec};if(mantle(world,ns,p))return {position:p,velocity:[0,vy,0],state:ns,event:'none'};p[1]=Math.min(p[1],s.top-HOLD);snap(p,s);return {position:p,velocity:[0,0,0],state:ns,event:'none'}}
 if(vs){const q:Vec=[p[0]+dir[0]*(CLING.radius+.06)-n[0]*(CLING.radius+.32),p[1],p[2]+dir[1]*(CLING.radius+.06)-n[2]*(CLING.radius+.32)];
  const c=world.wall(q,[-dir[0],-dir[1]],.7);if(c&&c.normal[0]*dir[0]+c.normal[2]*dir[1]>.5&&c.top-p[1]>CLING.minHeight*.5){const ns=fromHit(c,frame);snap(p,ns);return {position:p,velocity:[0,vy,0],state:ns,event:'corner'}}}
 if(s.grace>dt){return {position:p,velocity:[t[0]*vs,vy,t[1]*vs],state:{...s,grace:s.grace-dt},event:'none'}}
 return {position:p,velocity:[n[0]*.6,Math.min(vy,0),n[2]*.6],state:null,event:'lost'};
}

/** Mantle target: a little past the lip, standing on the top. False when the top is not standable (thin rail, overhang). */
/** Highest feet height at which the wall probe still sees the wall (column must exceed feet + .12 + STEP). */
const HOLD=.48;
/** Mantle target: stand on the lip (walls as thin as 12 cm), otherwise vault over a parapet and drop behind it. */
function mantle(world:CollisionWorld,s:ClingState,_p:Vec):boolean{
 const n=s.normal;
 for(const d of [.34,.22,.12]){const tx=s.point[0]-n[0]*d,tz=s.point[2]-n[2]*d,sup=world.support(tx,tz,s.top+.3);if(sup!==null&&Math.abs(sup-s.top)<=.3){s.mantle=[tx,sup,tz];s.vault=false;return true}}
 const tx=s.point[0]-n[0]*.6,tz=s.point[2]-n[2]*.6,behind=world.support(tx,tz,s.top+.3);
 if(behind!==null&&behind<s.top-.3&&!world.wall([tx,behind,tz],[n[0],n[2]],.01)){s.mantle=[tx,s.top+.05,tz];s.vault=true;return true}
 return false;
}
