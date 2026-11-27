import {Box,Vec,clamp} from './types';
import {WaterPatch} from './water-mask';
import {TriangleWorld} from './mesh-collision';
import {HeightAtlas,HeightField,HeightFieldData} from './height-field';
/** Serializable collision data, shared verbatim with the simulation Worker. Metres, Y up. */
export interface GroundSurface {min:[number,number];max:[number,number];height:number;slope?:[number,number];grid?:{width:number;height:number;values:number[]}}
/** Open water the body floats on: XZ rectangle, surface height, and how deep the jelly sits in it. */
export interface FluidVolume {min:[number,number];max:[number,number];level:number;sink?:number;circle?:boolean}
export interface WorldDefinition {indexBoxes?:boolean;boxes:Box[];surfaces:GroundSurface[];triangles?:number[];height?:HeightFieldData;heights?:HeightFieldData[];water?:WaterPatch[];fluids?:FluidVolume[];bounds?:{min:Vec;max:Vec}}
export interface CollisionWorld {refreshBoxes:()=>void;definition:WorldDefinition;boxes:Box[];terrain:(x:number,z:number)=>number|null;support:(x:number,z:number,footY?:number,ignoreFluid?:boolean)=>number|null;projectPoint:(p:Vec,r:number,ignoreFluid?:boolean)=>void;moveCapsule:(p:Vec,d:Vec,r?:number,height?:number)=>{position:Vec;squeezed:boolean};cast:(a:Vec,b:Vec,r?:number,camera?:boolean)=>{point:Vec;t:number}|null;fluid:(x:number,z:number)=>number|null;
 /** First climbable wall from p along a horizontal direction: contact point at p's height, outward normal (XZ), wall top. */
 wall:(p:Vec,dir:[number,number],reach:number)=>WallHit|null}
export interface WallHit {point:Vec;normal:Vec;top:number;distance:number}
export function createWorld(definition:WorldDefinition):CollisionWorld {
 const boxes=definition.boxes,mesh=definition.triangles?.length?new TriangleWorld(definition.triangles):null,hf:HeightField|HeightAtlas|null=definition.heights?.length?new HeightAtlas(definition.height?[definition.height,...definition.heights]:definition.heights):definition.height?new HeightField(definition.height):null;
 // Home has many narrow structural parts. Precompute OBB trig & world AABB once on refreshBoxes()
 // so particle/surface collision runs with zero Math.cos/sin and zero tuple allocations per query.
 interface CachedBox{b:Box;cx:number;cz:number;cos:number;sin:number;x0:number;x1:number;z0:number;z1:number;hasYaw:boolean}
 const cachedBoxes:CachedBox[]=[];
 const grid=new Map<number,Map<number,CachedBox[]>>(),empty:CachedBox[]=[];
 function makeCached(b:Box):CachedBox{
  const cx=(b.min[0]+b.max[0])*.5,cz=(b.min[2]+b.max[2])*.5;
  if(!b.yaw)return {b,cx,cz,cos:1,sin:0,x0:b.min[0],x1:b.max[0],z0:b.min[2],z1:b.max[2],hasYaw:false};
  const hx=(b.max[0]-b.min[0])*.5,hz=(b.max[2]-b.min[2])*.5;
  const cos=Math.cos(b.yaw),sin=Math.sin(b.yaw),ac=Math.abs(cos),as=Math.abs(sin);
  const ex=ac*hx+as*hz,ez=as*hx+ac*hz;
  return {b,cx,cz,cos,sin,x0:cx-ex,x1:cx+ex,z0:cz-ez,z1:cz+ez,hasYaw:true};
 }
 function refreshBoxes(){
  cachedBoxes.length=0;
  grid.clear();
  for(const box of boxes){
   const cb=makeCached(box);
   cachedBoxes.push(cb);
   if(!definition.indexBoxes)continue;
   for(let ix=Math.floor((cb.x0-1)/8);ix<=Math.floor((cb.x1+1)/8);ix++){
    let row=grid.get(ix);if(!row){row=new Map();grid.set(ix,row);}
    for(let iz=Math.floor((cb.z0-1)/8);iz<=Math.floor((cb.z1+1)/8);iz++){
     const cell=row.get(iz);if(cell)cell.push(cb);else row.set(iz,[cb]);
    }
   }
  }
 }
 refreshBoxes();
 const near=(x:number,z:number)=>definition.indexBoxes?(grid.get(Math.floor(x/8))?.get(Math.floor(z/8))??empty):cachedBoxes;
 const STEP=.34,SKIN=.07,DIRS:[number,number][]=[[1,0],[-1,0],[0,1],[0,-1],[.7071,.7071],[-.7071,.7071],[.7071,-.7071],[-.7071,-.7071]];
 /** True when any footprint sample stands on a column taller than a step: a wall for a body whose feet are at y. */
 const wall=(x:number,z:number,y:number,r:number)=>{if(!hf)return false;if(hf.raw(x,z)>y+STEP)return true;for(const [dx,dz] of DIRS)if(hf.raw(x+dx*r,z+dz*r)>y+STEP)return true;return false};
 function terrain(x:number,z:number):number|null {let result:number|null=null;for(const s of definition.surfaces){if(x<s.min[0]||x>s.max[0]||z<s.min[1]||z>s.max[1])continue;let y=s.height+(x-s.min[0])*(s.slope?.[0]??0)+(z-s.min[1])*(s.slope?.[1]??0);if(s.grid){const g=s.grid,gx=(x-s.min[0])/(s.max[0]-s.min[0])*(g.width-1),gz=(z-s.min[1])/(s.max[1]-s.min[1])*(g.height-1),ix=Math.min(g.width-2,Math.floor(gx)),iz=Math.min(g.height-2,Math.floor(gz)),tx=gx-ix,tz=gz-iz;const at=(a:number,b:number)=>g.values[a+b*g.width];y+=(at(ix,iz)*(1-tx)+at(ix+1,iz)*tx)*(1-tz)+(at(ix,iz+1)*(1-tx)+at(ix+1,iz+1)*tx)*tz;}result=y;}return result;}
function inFluid(f:FluidVolume,x:number,z:number){
 if(x<f.min[0]||x>f.max[0]||z<f.min[1]||z>f.max[1])return false;
 if(!f.circle)return true;
 const dx=(2*x-f.min[0]-f.max[0])/(f.max[0]-f.min[0]),dz=(2*z-f.min[1]-f.max[1])/(f.max[1]-f.min[1]);
 return dx*dx+dz*dz<=1;
}
function fluid(x:number,z:number){for(const f of definition.fluids??[])if(inFluid(f,x,z))return f.level;return null;}
function support(x:number,z:number,footY=Infinity,ignoreFluid=false):number|null {
 let y=terrain(x,z);
 const cand=near(x,z);
 for(let i=0;i<cand.length;i++){
  const c=cand[i],b=c.b;
  if(b.max[1]>footY+.38||x<c.x0||x>c.x1||z<c.z0||z>c.z1)continue;
  let lx=x,lz=z;
  if(c.hasYaw){const dx=x-c.cx,dz=z-c.cz;lx=c.cx+dx*c.cos-dz*c.sin;lz=c.cz+dx*c.sin+dz*c.cos;}
  if(lx>=b.min[0]&&lx<=b.max[0]&&lz>=b.min[2]&&lz<=b.max[2])y=Math.max(y??-100,b.max[1]);
 }
 const exact=mesh?.height(x,z,footY+.38);if(exact!==null&&exact!==undefined)y=Math.max(y??-100,exact);
 if(hf){const hh=hf.at(x,z);if(hh!==null&&hh<=footY+.38)y=Math.max(y??-100,hh);}
 if(!ignoreFluid)for(const f of definition.fluids??[])if(inFluid(f,x,z))y=Math.max(y??-100,f.level-(f.sink??.14));
 return y;
}
function projectPoint(p:Vec,r:number,ignoreFluid=false){
 mesh?.project(p,r);
 hf?.pushOut(p,SKIN);
 const g=support(p[0],p[2],p[1],ignoreFluid);if(g!==null&&p[1]<g+r&&p[1]>g-.7)p[1]=g+r;
 // beside a box (below its top) particles keep the surface skin, on top of it only their own radius
 const cand=r+SKIN<=1?near(p[0],p[2]):cachedBoxes;
 for(let i=0;i<cand.length;i++){
  const c=cand[i],b=c.b;
  if(p[1]+r<=b.min[1]||p[1]-r>=b.max[1])continue;
  const side=p[1]<b.max[1]-.01,rr=side?r+SKIN:r;
  if(p[0]<c.x0-rr||p[0]>c.x1+rr||p[2]<c.z0-rr||p[2]>c.z1+rr)continue;
  let lx0=p[0],lz0=p[2];
  if(c.hasYaw){const ox=p[0]-c.cx,oz=p[2]-c.cz;lx0=c.cx+ox*c.cos-oz*c.sin;lz0=c.cz+ox*c.sin+oz*c.cos;}
  const qx=clamp(lx0,b.min[0],b.max[0]),qy=clamp(p[1],b.min[1],b.max[1]),qz=clamp(lz0,b.min[2],b.max[2]);
  const dx=lx0-qx,dy=side?0:p[1]-qy,dz=lz0-qz,d=Math.hypot(dx,dy,dz);
  if(d>=rr)continue;
  let pushX=0,pushY=0,pushZ=0;
  if(d>1e-5){const s=(rr-d)/d;pushX=dx*s;pushY=dy*s;pushZ=dz*s;}
  else{
   const f0=lx0-b.min[0],f1=b.max[0]-lx0,f2=p[1]-b.min[1],f3=b.max[1]-p[1],f4=lz0-b.min[2],f5=b.max[2]-lz0;
   let f=0,best=f0;
   if(f1<best){best=f1;f=1;}if(f2<best){best=f2;f=2;}if(f3<best){best=f3;f=3;}if(f4<best){best=f4;f=4;}if(f5<best){f=5;}
   const k=f>>1,target=(f&1?b.max:b.min)[k]+(f&1?1:-1)*(k===1?r:rr);
   if(k===0)pushX=target-lx0;else if(k===1)pushY=target-p[1];else pushZ=target-lz0;
  }
  if(c.hasYaw){p[0]+=pushX*c.cos+pushZ*c.sin;p[2]+=-pushX*c.sin+pushZ*c.cos;}
  else{p[0]+=pushX;p[2]+=pushZ;}
  p[1]+=pushY;
 }
}
/** Grazing a corner: when only the side of the footprint is blocked, nudge across the move axis so the body slides round it. */
function deflect(out:Vec,x:number,z:number,r:number,axis:0|2,amount:number){if(!hf||hf.raw(x,z)>out[1]+STEP)return;let bx=0,bz=0;for(const [dx,dz] of DIRS)if(hf.raw(x+dx*r,z+dz*r)>out[1]+STEP){bx-=dx;bz-=dz}const side=axis===0?bz:bx,along=axis===0?bx:bz;if(Math.abs(side)<.5||Math.abs(along)>Math.abs(side)*1.6)return;const k=axis===0?2:0,t=Math.sign(side)*amount*.8,q=out[k]+t;if(!(k===2?wall(out[0],q,out[1],r):wall(q,out[2],out[1],r)))out[k]=q;}
function moveCapsule(p:Vec,delta:Vec,r=.27,height=.56):{position:Vec;squeezed:boolean}{
 const out:Vec=[...p];const steps=Math.max(1,Math.ceil(Math.hypot(delta[0],delta[2])/.10));let squeezed=false;
 for(let s=0;s<steps;s++) {
  if(hf){const sx=delta[0]/steps,sz=delta[2]/steps,nx=out[0]+sx;if(!wall(nx,out[2],out[1],r))out[0]=nx;else{squeezed=true;deflect(out,nx,out[2],r,0,Math.abs(sx))}const nz=out[2]+sz;if(!wall(out[0],nz,out[1],r))out[2]=nz;else{squeezed=true;deflect(out,out[0],nz,r,2,Math.abs(sz))}}
  else{out[0]+=delta[0]/steps;out[2]+=delta[2]/steps;}
  if(mesh)for(const lift of [Math.min(r,height*.5),Math.max(r,height-r)]){const q:Vec=[out[0],out[1]+lift,out[2]];mesh.project(q,Math.min(r,height*.5));out[0]=q[0];out[2]=q[2];}
  const cand=r<=.9?near(out[0],out[2]):cachedBoxes;
  for(let pass=0;pass<2;pass++)for(let ci=0;ci<cand.length;ci++){
   const c=cand[ci],b=c.b;
   if(out[1]+height<=b.min[1]||out[1]>=b.max[1]-.03||b.max[1]<=out[1]+.32)continue;
   if(out[0]<c.x0-r||out[0]>c.x1+r||out[2]<c.z0-r||out[2]>c.z1+r)continue;
   let lx=out[0],lz=out[2];
   if(c.hasYaw){const ox=out[0]-c.cx,oz=out[2]-c.cz;lx=c.cx+ox*c.cos-oz*c.sin;lz=c.cz+ox*c.sin+oz*c.cos;}
   const x=clamp(lx,b.min[0],b.max[0]),z=clamp(lz,b.min[2],b.max[2]),dx=lx-x,dz=lz-z,d=Math.hypot(dx,dz);
   if(d>=r)continue;
   squeezed=true;
   let pushX=0,pushZ=0;
   if(d>.0001){pushX=dx*(r-d)/d;pushZ=dz*(r-d)/d;}
   else{
    const f0=lx-b.min[0],f1=b.max[0]-lx,f2=lz-b.min[2],f3=b.max[2]-lz;
    let fi=0,best=f0;if(f1<best){best=f1;fi=1;}if(f2<best){best=f2;fi=2;}if(f3<best){fi=3;}
    if(fi<2)pushX=(fi===0?b.min[0]-r:b.max[0]+r)-lx;else pushZ=(fi===2?b.min[2]-r:b.max[2]+r)-lz;
   }
   if(c.hasYaw){out[0]+=pushX*c.cos+pushZ*c.sin;out[2]+=-pushX*c.sin+pushZ*c.cos;}
   else{out[0]+=pushX;out[2]+=pushZ;}
  }
 }
 return {position:out,squeezed};
}
function rayBox(a:Vec,b:Vec,c:CachedBox,expand=0):number|null {
 const box=c.b;
 let ax=a[0],ay=a[1],az=a[2],bx=b[0],by=b[1],bz=b[2];
 if(Math.max(ax,bx)<c.x0-expand||Math.min(ax,bx)>c.x1+expand||Math.max(az,bz)<c.z0-expand||Math.min(az,bz)>c.z1+expand||Math.max(ay,by)<box.min[1]-expand||Math.min(ay,by)>box.max[1]+expand)return null;
 if(c.hasYaw){
  const dax=ax-c.cx,daz=az-c.cz,dbx=bx-c.cx,dbz=bz-c.cz;
  ax=c.cx+dax*c.cos-daz*c.sin;az=c.cz+dax*c.sin+daz*c.cos;
  bx=c.cx+dbx*c.cos-dbz*c.sin;bz=c.cz+dbx*c.sin+dbz*c.cos;
 }
 let lo=0,hi=1;
 for(let k=0;k<3;k++){
  const o=k===0?ax:k===1?ay:az,d=(k===0?bx:k===1?by:bz)-o,min=box.min[k]-expand,max=box.max[k]+expand;
  if(Math.abs(d)<1e-8){if(o<min||o>max)return null}
  else{let t0=(min-o)/d,t1=(max-o)/d;if(t0>t1)[t0,t1]=[t1,t0];lo=Math.max(lo,t0);hi=Math.min(hi,t1);if(lo>hi)return null}
 }
 return lo;
}
function cast(a:Vec,b:Vec,r=.04,camera=false):{point:Vec;t:number}|null {let best=mesh?.cast(a,b,r)??1;let hit=best<1;for(let i=0;i<cachedBoxes.length;i++){const c=cachedBoxes[i];if(camera&&!c.b.camera)continue;const t=rayBox(a,b,c,r);if(t!==null&&t<best){best=t;hit=true}}const n=Math.max(8,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2])/.12));for(let i=1;i<=n;i++){let t=i/n;if(t>=best)break;let x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,z=a[2]+(b[2]-a[2])*t;let floor=terrain(x,z);if(hf){const hh=hf.raw(x,z);if(hh>-1e3&&(floor===null||hh>floor))floor=hh;}if(floor!==null&&y-r<=floor){best=t;hit=true;break}}return hit?{t:best,point:a.map((v,i)=>v+(b[i]-v)*best) as Vec}:null;}

/** Height-field walls are cell-aligned, so the normal comes from the height gradient around the contact; boxes use their face (or OBB local face). */
function wallHit(p:Vec,dir:[number,number],reach:number):WallHit|null{
 const l=Math.hypot(dir[0],dir[1])||1,dx=dir[0]/l,dz=dir[1]/l,y=p[1]+.12;let best:WallHit|null=null;
 if(hf){for(let d=0;d<=reach;d+=.04){const x=p[0]+dx*d,z=p[2]+dz*d,h=hf.raw(x,z);if(h>y+STEP){if(hf.isNoCling(x,z))break;let gx=0,gz=0;for(const [ox,oz] of DIRS){const hh=hf.raw(x+ox*.18,z+oz*.18);if(hh>y+STEP){gx-=ox;gz-=oz}}const gl=Math.hypot(gx,gz);const n:Vec=gl>1e-3?[gx/gl,0,gz/gl]:[-dx,0,-dz];let top=h;for(const [ox,oz] of DIRS)top=Math.max(top,Math.min(h+.6,hf.raw(x+ox*.1,z+oz*.1)));best={point:[x-dx*.02,p[1],z-dz*.02],normal:n,top,distance:d};break}}}
 const cand=reach<=.9?near(p[0],p[2]):cachedBoxes;
 for(let ci=0;ci<cand.length;ci++){
  const c=cand[ci],b=c.b;
  if(b.climbable===false||b.max[1]<=y+STEP||b.min[1]>y)continue;
  if(p[0]<c.x0-reach||p[0]>c.x1+reach||p[2]<c.z0-reach||p[2]>c.z1+reach)continue;
  let px=p[0],pz=p[2],ldx=dx,ldz=dz;
  if(c.hasYaw){
   const ox=px-c.cx,oz=pz-c.cz;px=c.cx+ox*c.cos-oz*c.sin;pz=c.cz+ox*c.sin+oz*c.cos;
   ldx=dx*c.cos-dz*c.sin;ldz=dx*c.sin+dz*c.cos;
  }
  let lo=0,hi=reach,axis=-1;
  if(Math.abs(ldx)<1e-8){if(px<b.min[0]||px>b.max[0])continue;}
  else{let t0=(b.min[0]-px)/ldx,t1=(b.max[0]-px)/ldx;if(t0>t1)[t0,t1]=[t1,t0];if(t0>lo){lo=t0;axis=0;}hi=Math.min(hi,t1);}
  if(Math.abs(ldz)<1e-8){if(pz<b.min[2]||pz>b.max[2])continue;}
  else{let t0=(b.min[2]-pz)/ldz,t1=(b.max[2]-pz)/ldz;if(t0>t1)[t0,t1]=[t1,t0];if(t0>lo){lo=t0;axis=2;}hi=Math.min(hi,t1);}
  if(axis<0||lo>hi||lo<0||(best&&lo>=best.distance))continue;
  const lnX=axis===0?(ldx>0?-1:1):0,lnZ=axis===2?(ldz>0?-1:1):0;
  const wnX=c.hasYaw?lnX*c.cos+lnZ*c.sin:lnX,wnZ=c.hasYaw?-lnX*c.sin+lnZ*c.cos:lnZ;
  best={point:[p[0]+dx*lo,p[1],p[2]+dz*lo],normal:[wnX,0,wnZ],top:b.max[1],distance:lo};
 }
 return best;
}
return {refreshBoxes,definition,boxes,terrain,support,projectPoint,moveCapsule,cast,fluid,wall:wallHit};
}
export const flatWorld=createWorld({boxes:[],surfaces:[{min:[-100,-100],max:[100,100],height:0}]});
