export type Vec = [number, number, number];
export type Quality = 'high' | 'balanced';
export interface Box {min:Vec; max:Vec; camera?:boolean; name:string}
export interface Command {type:'launch'|'reset'|'attack'; target?:Vec; combo?:number}
export interface Pose {active:boolean; forward:Vec; stretch:Vec; flatten:number; pulse:number}
export interface FrameInput {anchor:Vec; velocity:Vec; forward:Vec; spread:number; grounded:boolean; recalling:boolean; impact:number; pose:Pose; dt:number; quality:Quality; commands:Command[]; generation:number}
export interface ShotView {id:number; phase:'separating'|'flying'|'active'|'returning'|'merging'; center:Vec; radius:number; age:number; mergeProgress:number}
export interface MeshFrame {positions:Float32Array; normals:Float32Array; slots:Float32Array; count:number; centers:Vec[]; radii:Vec[]; clusterIds:number[]; shots:ShotView[]; simMs:number; meshMs:number; particleCount:number; generation:number; overflow:boolean; spread:number; grounded:boolean}
export const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export const smooth=(v:number)=>{v=clamp(v,0,1);return v*v*(3-2*v)};
export const length=(v:Vec)=>Math.hypot(...v);
export const distance=(a:Vec,b:Vec)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
export const idlePose=():Pose=>({active:false,forward:[0,0,-1],stretch:[1,1,1],flatten:0,pulse:0});

declare global {interface Window {__app:any; __slime:any}}
