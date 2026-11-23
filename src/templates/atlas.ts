import type {AtlasKind,AtlasSpec} from '../../content/levels/types';
import {rng} from './random';

export type Sign = 'trace' | 'leap' | 'fold' | 'drift' | 'fork';
export interface Gate {distance:number; lane:number; sign:Sign; jewelLane:number; phase:number}
const scores:Record<AtlasKind,Sign[]> = {
  orbit:['trace','drift','fold','drift','leap','fold'], score:['trace','leap','trace','fork','fold','leap'],
  race:['trace','fork','drift','fold','leap','drift','fork'], atelier:['fork','trace','fold','leap','fork','drift'],
  flight:['trace','drift','leap','fold','drift','leap'], span:['leap','fold','trace','fork','fold','leap'],
  field:['trace','leap','fork','leap','fold','leap'], ink:['trace','fold','fork','leap','fold','trace'],
  signal:['drift','fold','trace','leap','drift','fork'],
};
export const signs:Record<Sign,string>={trace:'对准光印',leap:'跳过横栏',fold:'摊开过低门',drift:'追随移动的光印',fork:'左右两束光任选一束'};
export function atlasCourse(spec:AtlasSpec){
  const r=rng(spec.id),pattern=[...scores[spec.kind]];
  if(r.chance(.5))[pattern[1],pattern[3]]=[pattern[3],pattern[1]];
  let distance=1;
  const gates:Gate[]=pattern.map((sign,i)=>{
    distance+=i===0?6:r.range(6.4,8.4);
    return {distance,lane:r.int(-1,1),jewelLane:r.int(-1,1),sign,phase:r.range(0,Math.PI*2)};
  });
  return {gates,speed:spec.kind==='race'?4.3:spec.kind==='field'?3.9:3.35,phase:r.range(0,Math.PI*2),finish:distance+5};
}
export type Course=ReturnType<typeof atlasCourse>;
export const laneWidth=1.65;
export const curve=(distance:number,phase:number)=>1.05*(Math.sin(distance*.115+phase)-Math.sin(phase));
export function targetX(g:Gate,t:number){
  return g.sign==='drift'?g.lane*laneWidth+.68*Math.sin(t*1.65+g.phase):g.lane*laneWidth;
}
export function passes(g:Gate,offset:number,height:number,spread:number,time:number){
  const miss=g.sign==='fork'?Math.abs(Math.abs(offset)-laneWidth):Math.abs(offset-targetX(g,time));
  return miss<.85&&(g.sign!=='leap'||height>.32)&&(g.sign!=='fold'||spread>.62);
}
export interface Run {distance:number;offset:number;lane:number;time:number;jump:number;flat:boolean;spread:number;index:number;retries:number;collected:Set<number>}
export function freshRun():Run{return {distance:0,offset:0,lane:0,time:0,jump:0,flat:false,spread:0,index:0,retries:0,collected:new Set()};}
export const jumpHeight=(r:Run)=>Math.sin(Math.PI*r.jump)*1.28;
export function hop(r:Run){if(r.jump<=0){r.jump=1;r.flat=false;}}
export function tick(r:Run,c:Course,dt:number,slow:boolean){
  const old=r.distance;r.time+=dt;r.distance+=dt*c.speed*(slow?.50:1);
  const diff=r.lane*laneWidth-r.offset;r.offset+=Math.sign(diff)*Math.min(Math.abs(diff),dt*8.8);
  r.jump=Math.max(0,r.jump-dt/.86);r.spread+=(Number(r.flat&&r.jump===0)-r.spread)*(1-Math.exp(-10*dt));
  const gate=c.gates[r.index];
  if(!gate)return r.distance>=c.finish?'finish':undefined;
  const jewelAt=gate.distance-3.1;
  if(old<=jewelAt+.35&&r.distance>=jewelAt-.35&&Math.abs(r.offset-gate.jewelLane*laneWidth)<.72&&!r.collected.has(r.index)){
    r.collected.add(r.index);return 'jewel';
  }
  if(r.distance<gate.distance)return;
  if(passes(gate,r.offset,jumpHeight(r),r.spread,r.time)){r.index++;return 'gate';}
  r.distance=gate.distance-4.5;r.jump=0;r.retries++;return 'retry';
}
