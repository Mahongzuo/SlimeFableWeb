import {Box,Vec,clamp} from './types';
import {WaterPatch} from './water-mask';
import {TriangleWorld} from './mesh-collision';
import {HeightField,HeightFieldData} from './height-field';
/** Serializable collision data, shared verbatim with the simulation Worker. Metres, Y up. */
export interface GroundSurface {min:[number,number];max:[number,number];height:number;slope?:[number,number];grid?:{width:number;height:number;values:number[]}}
/** Open water the body floats on: XZ rectangle, surface height, and how deep the jelly sits in it. */
export interface FluidVolume {min:[number,number];max:[number,number];level:number;sink?:number}
export interface WorldDefinition {boxes:Box[];surfaces:GroundSurface[];triangles?:number[];height?:HeightFieldData;water?:WaterPatch[];fluids?:FluidVolume[];bounds?:{min:Vec;max:Vec}}
export interface CollisionWorld {definition:WorldDefinition;boxes:Box[];terrain:(x:number,z:number)=>number|null;support:(x:number,z:number,footY?:number)=>number|null;projectPoint:(p:Vec,r:number)=>void;moveCapsule:(p:Vec,d:Vec,r?:number,height?:number)=>{position:Vec;squeezed:boolean};cast:(a:Vec,b:Vec,r?:number,camera?:boolean)=>{point:Vec;t:number}|null;fluid:(x:number,z:number)=>number|null;
 /** First climbable wall from p along a horizontal direction: contact point at p's height, outward normal (XZ), wall top. */
 wall:(p:Vec,dir:[number,number],reach:number)=>WallHit|null}
export interface WallHit {point:Vec;normal:Vec;top:number;distance:number}
export function createWorld(definition:WorldDefinition):CollisionWorld {
 const boxes=definition.boxes,mesh=definition.triangles?.length?new TriangleWorld(definition.triangles):null,hf=definition.height?new HeightField(definition.height):null;
 const STEP=.34,SKIN=.07,DIRS:[number,number][]=[[1,0],[-1,0],[0,1],[0,-1],[.7071,.7071],[-.7071,.7071],[.7071,-.7071],[-.7071,-.7071]];
 /** True when any footprint sample stands on a column taller than a step: a wall for a body whose feet are at y. */
 const wall=(x:number,z:number,y:number,r:number)=>{if(!hf)return false;if(hf.raw(x,z)>y+STEP)return true;for(const [dx,dz] of DIRS)if(hf.raw(x+dx*r,z+dz*r)>y+STEP)return true;return false};
 function terrain(x:number,z:number):number|null {let result:number|null=null;for(const s of definition.surfaces){if(x<s.min[0]||x>s.max[0]||z<s.min[1]||z>s.max[1])continue;let y=s.height+(x-s.min[0])*(s.slope?.[0]??0)+(z-s.min[1])*(s.slope?.[1]??0);if(s.grid){const g=s.grid,gx=(x-s.min[0])/(s.max[0]-s.min[0])*(g.width-1),gz=(z-s.min[1])/(s.max[1]-s.min[1])*(g.height-1),ix=Math.min(g.width-2,Math.floor(gx)),iz=Math.min(g.height-2,Math.floor(gz)),tx=gx-ix,tz=gz-iz;const at=(a:number,b:number)=>g.values[a+b*g.width];y+=(at(ix,iz)*(1-tx)+at(ix+1,iz)*tx)*(1-tz)+(at(ix,iz+1)*(1-tx)+at(ix+1,iz+1)*tx)*tz;}result=y;}return result;}
function fluid(x:number,z:number):number|null {for(const f of definition.fluids??[])if(x>=f.min[0]&&x<=f.max[0]&&z>=f.min[1]&&z<=f.max[1])return f.level;return null;}
function support(x:number,z:number,footY=Infinity):number|null {
 let y=terrain(x,z);for(const b of boxes)if(x>=b.min[0]&&x<=b.max[0]&&z>=b.min[2]&&z<=b.max[2]&&b.max[1]<=footY+.38)y=Math.max(y??-100,b.max[1]);const exact=mesh?.height(x,z,footY+.38);if(exact!==null&&exact!==undefined)y=Math.max(y??-100,exact);if(hf){const hh=hf.at(x,z);if(hh!==null&&hh<=footY+.38)y=Math.max(y??-100,hh);}for(const f of definition.fluids??[])if(x>=f.min[0]&&x<=f.max[0]&&z>=f.min[1]&&z<=f.max[1])y=Math.max(y??-100,f.level-(f.sink??.14));return y;
}
function projectPoint(p:Vec,r:number){
 mesh?.project(p,r);
 hf?.pushOut(p,SKIN);
 const g=support(p[0],p[2],p[1]);if(g!==null&&p[1]<g+r&&p[1]>g-.7)p[1]=g+r;
 // beside a box (below its top) particles keep the surface skin, on top of it only their own radius
 for(const b of boxes){const side=p[1]<b.max[1]-.01,rr=side?r+SKIN:r;if(p[1]+r<=b.min[1]||p[1]-r>=b.max[1])continue;const q:Vec=[clamp(p[0],b.min[0],b.max[0]),clamp(p[1],b.min[1],b.max[1]),clamp(p[2],b.min[2],b.max[2])];let dx=p[0]-q[0],dy=side?0:p[1]-q[1],dz=p[2]-q[2],d=Math.hypot(dx,dy,dz);if(d>=rr)continue;if(d>1e-5){const s=(rr-d)/d;p[0]+=dx*s;p[1]+=dy*s;p[2]+=dz*s}else{const faces=[p[0]-b.min[0],b.max[0]-p[0],p[1]-b.min[1],b.max[1]-p[1],p[2]-b.min[2],b.max[2]-p[2]];const f=faces.indexOf(Math.min(...faces)),k=Math.floor(f/2);p[k]=(f%2?b.max:b.min)[k]+(f%2?1:-1)*(k===1?r:rr)}}
}
/** Grazing a corner: when only the side of the footprint is blocked, nudge across the move axis so the body slides round it. */
function deflect(out:Vec,x:number,z:number,r:number,axis:0|2,amount:number){if(!hf||hf.raw(x,z)>out[1]+STEP)return;let bx=0,bz=0;for(const [dx,dz] of DIRS)if(hf.raw(x+dx*r,z+dz*r)>out[1]+STEP){bx-=dx;bz-=dz}const side=axis===0?bz:bx,along=axis===0?bx:bz;if(Math.abs(side)<.5||Math.abs(along)>Math.abs(side)*1.6)return;const k=axis===0?2:0,t=Math.sign(side)*amount*.8,q=out[k]+t;if(!(k===2?wall(out[0],q,out[1],r):wall(q,out[2],out[1],r)))out[k]=q;}
function moveCapsule(p:Vec,delta:Vec,r=.27,height=.56):{position:Vec;squeezed:boolean}{
 const out:Vec=[...p];const steps=Math.max(1,Math.ceil(Math.hypot(delta[0],delta[2])/.10));let squeezed=false;
 for(let s=0;s<steps;s++) {if(hf){const sx=delta[0]/steps,sz=delta[2]/steps,nx=out[0]+sx;if(!wall(nx,out[2],out[1],r))out[0]=nx;else{squeezed=true;deflect(out,nx,out[2],r,0,Math.abs(sx))}const nz=out[2]+sz;if(!wall(out[0],nz,out[1],r))out[2]=nz;else{squeezed=true;deflect(out,out[0],nz,r,2,Math.abs(sz))}}else{out[0]+=delta[0]/steps;out[2]+=delta[2]/steps;}if(mesh)for(const lift of [Math.min(r,height*.5),Math.max(r,height-r)]){const q:Vec=[out[0],out[1]+lift,out[2]];mesh.project(q,Math.min(r,height*.5));out[0]=q[0];out[2]=q[2];}for(let pass=0;pass<2;pass++)for(const b of boxes){if(out[1]+height<=b.min[1]||out[1]>=b.max[1]-.03||b.max[1]<=out[1]+.32)continue;let x=clamp(out[0],b.min[0],b.max[0]),z=clamp(out[2],b.min[2],b.max[2]),dx=out[0]-x,dz=out[2]-z,d=Math.hypot(dx,dz);if(d>=r)continue;squeezed=true;if(d>.0001){out[0]+=dx*(r-d)/d;out[2]+=dz*(r-d)/d}else{const f=[out[0]-b.min[0],b.max[0]-out[0],out[2]-b.min[2],b.max[2]-out[2]];const i=f.indexOf(Math.min(...f));if(i<2)out[0]=(i===0?b.min[0]-r:b.max[0]+r);else out[2]=(i===2?b.min[2]-r:b.max[2]+r)}}}
 return {position:out,squeezed};
}
function rayBox(a:Vec,b:Vec,box:Box,expand=0):number|null {let lo=0,hi=1;for(let k=0;k<3;k++){const d=b[k]-a[k],min=box.min[k]-expand,max=box.max[k]+expand;if(Math.abs(d)<1e-8){if(a[k]<min||a[k]>max)return null}else{let t0=(min-a[k])/d,t1=(max-a[k])/d;if(t0>t1)[t0,t1]=[t1,t0];lo=Math.max(lo,t0);hi=Math.min(hi,t1);if(lo>hi)return null}}return lo;}
function cast(a:Vec,b:Vec,r=.04,camera=false):{point:Vec;t:number}|null {let best=mesh?.cast(a,b,r)??1;let hit=best<1;for(const box of boxes){if(camera&&!box.camera)continue;const t=rayBox(a,b,box,r);if(t!==null&&t<best){best=t;hit=true}}const n=Math.max(8,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2])/.12));for(let i=1;i<=n;i++){let t=i/n;if(t>=best)break;let x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,z=a[2]+(b[2]-a[2])*t;let floor=terrain(x,z);if(hf){const hh=hf.raw(x,z);if(hh>-1e3&&(floor===null||hh>floor))floor=hh;}if(floor!==null&&y-r<=floor){best=t;hit=true;break}}return hit?{t:best,point:a.map((v,i)=>v+(b[i]-v)*best) as Vec}:null;}

/** Height-field walls are cell-aligned, so the normal comes from the height gradient around the contact; boxes use their face. */
function wallHit(p:Vec,dir:[number,number],reach:number):WallHit|null{
 const l=Math.hypot(dir[0],dir[1])||1,dx=dir[0]/l,dz=dir[1]/l,y=p[1]+.12;let best:WallHit|null=null;
 if(hf){for(let d=0;d<=reach;d+=.04){const x=p[0]+dx*d,z=p[2]+dz*d,h=hf.raw(x,z);if(h>y+STEP){let gx=0,gz=0;for(const [ox,oz] of DIRS){const hh=hf.raw(x+ox*.18,z+oz*.18);if(hh>y+STEP){gx-=ox;gz-=oz}}const gl=Math.hypot(gx,gz);const n:Vec=gl>1e-3?[gx/gl,0,gz/gl]:[-dx,0,-dz];let top=h;for(const [ox,oz] of DIRS)top=Math.max(top,Math.min(h+.6,hf.raw(x+ox*.1,z+oz*.1)));best={point:[x-dx*.02,p[1],z-dz*.02],normal:n,top,distance:d};break}}}
 for(const b of boxes){if(b.max[1]<=y+STEP||b.min[1]>y)continue;let lo=0,hi=reach,axis=-1,sign=0;for(const [k,dk] of [[0,dx],[2,dz]] as const){const o=p[k];if(Math.abs(dk)<1e-8){if(o<b.min[k]||o>b.max[k]){lo=Infinity;break}continue}let t0=(b.min[k]-o)/dk,t1=(b.max[k]-o)/dk,s0=-1;if(t0>t1){[t0,t1]=[t1,t0];s0=1}if(t0>lo){lo=t0;axis=k;sign=s0}hi=Math.min(hi,t1);}
  if(axis<0||lo>hi||lo<0||(best&&lo>=best.distance))continue;const n:Vec=[0,0,0];n[axis]=dx===0&&dz===0?0:(axis===0?(dx>0?-1:1):(dz>0?-1:1));best={point:[p[0]+dx*lo,p[1],p[2]+dz*lo],normal:n,top:b.max[1],distance:lo}}
 return best;
}
return {definition,boxes,terrain,support,projectPoint,moveCapsule,cast,fluid,wall:wallHit};
}
export const flatWorld=createWorld({boxes:[],surfaces:[{min:[-100,-100],max:[100,100],height:0}]});
