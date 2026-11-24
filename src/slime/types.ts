export type Vec = [number, number, number];
export type Quality = 'high' | 'balanced';
export type BodyShape = 'dome' | 'ball';
export interface Box {min:Vec; max:Vec; camera?:boolean; name:string}
export interface CannonLaunchSpec {muzzle:Vec; start:Vec; target:Vec; velocity:Vec; flightTime:number; gravity:number; element?:number; burstOnEnemy?:boolean}
export interface BattleCollider {id:number; center:Vec; radius:number}
export interface CannonImpact {shotId:number; targetId:number|null; point:Vec; element:number}
/** First contact of an optional swept sphere with any target on the finite segment. */
export function firstBattleContact(a:Vec,b:Vec,radius:number,targets:readonly BattleCollider[],limit=Infinity){
 const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],length2=dx*dx+dy*dy+dz*dz;
 let best:{id:number;t:number;center:Vec;point:Vec}|undefined;
 for(const target of targets){
  const x=a[0]-target.center[0],y=a[1]-target.center[1],z=a[2]-target.center[2];
  const r=radius+target.radius,c=x*x+y*y+z*z-r*r,d=x*dx+y*dy+z*dz;
  const disc=d*d-length2*c;
  if(c>0&&(length2===0||d>=0||disc<0))continue;
  const t=c<=0?0:(-d-Math.sqrt(disc))/length2;
  if(t>1||t<0||t>=limit||best&&best.t<=t)continue;
  const center:Vec=[a[0]+dx*t,a[1]+dy*t,a[2]+dz*t];
  const n=Math.hypot(center[0]-target.center[0],center[1]-target.center[1],center[2]-target.center[2])||1;
  const point=center.map((v,i)=>target.center[i]+(v-target.center[i])*target.radius/n) as Vec;
  best={id:target.id,t,center,point};
 }
 return best;
}
export interface Command {type:'launch'|'reset'|'attack'; target?:Vec; cannon?:CannonLaunchSpec; combo?:number}
export interface Pose {active:boolean; forward:Vec; stretch:Vec; flatten:number; pulse:number}
export interface FrameInput {
  anchor:Vec; velocity:Vec; forward:Vec; spread:number; grounded:boolean; recalling:boolean; impact:number; pose:Pose; dt:number; quality:Quality; commands:Command[];
  cling?:{point:Vec;normal:Vec}|null; generation:number;
  /** 0 = Ball, 1 = UE Dome (bell shape). Defaults to 1 when omitted. */
  shapeBlend?:number;
  /** Transient jump vertical stretch (0..1) for snappy liftoff feel. */
  jumpStretch?:number;
  /** Transient mid-air double-jump "duang" bounce (0..1). */
  airBounce?:number;
  /** True while main body umbrella is deployed. */
  umbrella?:boolean;
  battleTargets?:BattleCollider[];
}
export interface ShotView {id:number; phase:'separating'|'flying'|'active'|'returning'|'merging'; center:Vec; radius:number; age:number; mergeProgress:number; umbrella?:boolean}
export interface MeshFrame {positions:Float32Array; normals:Float32Array; slots:Float32Array; count:number; centers:Vec[]; radii:Vec[]; clusterIds:number[]; shots:ShotView[]; impacts?:CannonImpact[]; simMs:number; meshMs:number; particleCount:number; generation:number; overflow:boolean; spread:number; grounded:boolean; shapeBlend?:number}
export const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export const smooth=(v:number)=>{v=clamp(v,0,1);return v*v*(3-2*v)};
export const length=(v:Vec)=>Math.hypot(...v);
export const distance=(a:Vec,b:Vec)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
export const idlePose=():Pose=>({active:false,forward:[0,0,-1],stretch:[1,1,1],flatten:0,pulse:0});

/**
 * Analytic low-arc ballistic solver ported verbatim from UE FSlimeCannonLaunch::Solve (metres, Y-up).
 * Default UE values: speed = 28 m/s (2800 cm/s), maxSpeed = 36 m/s (3600 cm/s), gravity = 9.8 m/s^2.
 */
export function solveCannonLaunch(
  start: Vec,
  target: Vec,
  speed = 28,
  maxSpeed = 36,
  gravity = 9.8,
): {velocity: Vec; flightTime: number} | null {
  const dx = target[0] - start[0], dy = target[1] - start[1], dz = target[2] - start[2];
  const g = Math.max(gravity, 0.01);
  const distSq = dx * dx + dy * dy + dz * dz;
  const dist = Math.sqrt(distSq);
  if (dist < 0.01) return null;
  const horizSq = dx * dx + dz * dz;
  const required2 = g * (dist + dy);
  const s = clamp(speed, 1, Math.max(maxSpeed, 1));
  const v2 = Math.max(s * s, required2 * (1 + 1e-6));
  const maxS = Math.max(maxSpeed, s);
  if (v2 > maxS * maxS) return null;
  const disc = Math.max(v2 * v2 - 2 * g * dy * v2 - g * g * horizSq, 0);
  const denom = v2 - g * dy + Math.sqrt(disc);
  if (denom <= 1e-8) return null;
  const t2 = (2 * distSq) / denom;
  const flightTime = Math.sqrt(Math.max(t2, 1e-8));
  const velocity: Vec = [dx / flightTime, dy / flightTime + 0.5 * g * flightTime, dz / flightTime];
  if (!velocity.every(Number.isFinite)) return null;
  return {velocity, flightTime};
}

export function cannonPositionAt(start: Vec, velocity: Vec, gravity: number, t: number): Vec {
  return [
    start[0] + velocity[0] * t,
    start[1] + velocity[1] * t - 0.5 * gravity * t * t,
    start[2] + velocity[2] * t,
  ];
}

declare global {interface Window {__app:any; __slime:any}}
