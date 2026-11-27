// 码头风标、信号球与放行流程均为游戏演绎。
import type {Vec} from '../slime/types';
import type {Lane} from './january-skirmish';

export const shedPiers = [[1.52,-3.55],[1.52,-.6],[1.52,2.35],[4.08,-3.55],[4.08,-.6],[4.08,2.35]];

export function behindPier(from: Vec, to: Vec) {
  const dx=to[0]-from[0], dz=to[2]-from[2], length=dx*dx+dz*dz;
  if(length<.01 || from[0]>1.7 && from[1]>.65)return false;
  return shedPiers.some(([x,z])=>{
    const u=((x-from[0])*dx+(z-from[2])*dz)/length;
    return u>.02 && u<.98 && Math.hypot(x-from[0]-u*dx,z-from[2]-u*dz)<.16;
  });
}

export class FlightSignals {
  readonly verified=new Set<number>();
  readonly locked=new Map<number,Vec>();
  pending: {index:number; point:Vec; expires:number}|null=null;
  recalled=false;
  lastLane:Lane|0=0;
  open(index:number) {
    if(this.verified.has(index))return false;
    if(index===0)return true;
    if(!this.recalled || !this.lastLane)return false;
    return index===1 || index===2 || index===3 && this.verified.has(1) && this.verified.has(2);
  }
  cast(index:number, from:Vec, point:Vec, time:number) {
    if(this.pending || !this.open(index) || behindPier(from,point) || Math.hypot(point[0]-from[0],point[2]-from[2])>8.2)return false;
    this.pending={index,point:[...point],expires:time+3};return true;
  }
  observe(shots:ReadonlyArray<{phase:string;center:Vec}>,time:number) {
    for(const [i,point] of this.locked){
      if(!shots.some(s=>s.phase==='active' && Math.hypot(s.center[0]-point[0],s.center[2]-point[2])<.74))this.locked.delete(i);
    }
    const p=this.pending;
    if(!p)return -1;
    if(time>p.expires){this.pending=null;return -1;}
    if(!shots.some(s=>s.phase==='active' && Math.hypot(s.center[0]-p.point[0],s.center[2]-p.point[2])<.74 && Math.abs(s.center[1]-p.point[1])<.9))return -1;
    this.pending=null;this.verified.add(p.index);this.locked.set(p.index,p.point);return p.index;
  }
  recall() {
    this.recalled ||= this.verified.has(0);
    this.pending=null;this.locked.clear();
  }
}
