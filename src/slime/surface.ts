import {edgeTable,triTable} from './marching-tables';
import {SlimeSolver,Particle} from './solver';
import {Vec,MeshFrame,Quality,clamp,smooth} from './types';

const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
const edges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];

const smoothMax=(a:number,b:number,k:number)=>{if(k<=1e-5)return Math.max(a,b);const h=Math.max(k-Math.abs(a-b),0)/k;return Math.max(a,b)+h*h*k*.25};

/**
 * Per-cluster density splat, UE ApplyBellFlare / GroundSkirt EDT contour dilation,
 * gradient normals and Marching Cubes, following UE FSlimeSurfaceBuilder.
 */
export class SurfaceBuilder {
 readonly maxVertices=9000;
 private field=new Float32Array(44**3);
 private points=new Float32Array(36);
 private norms=new Float32Array(36);
 private offX=new Float32Array(44*44);
 private offZ=new Float32Array(44*44);
 private seeded=new Uint8Array(44*44);
 private cellScale=1;
 private scales=new Map<string,number>();

 /**
  * Exact port of UE FSlimeSurfaceBuilder::ApplyBellFlare (Y-up metres).
  * Uses 2-pass 2D Euclidean distance transform per horizontal slice + rounded ground tip + SmoothMax union.
  */
 private applyBellFlare(
  field:Float32Array,nx:number,ny:number,nz:number,stride:number,
  origin:Vec,cell:number,cellY:number,floor:number,iso:number,
  flareHeightFrac:number,reach:number,curve:number,tip:number,
  onPlane:(wx:number,wz:number)=>boolean,
 ){
  if(reach<=.001||nx<=2||nz<=2||ny<=1)return;
  let topY=-1;
  outer:for(let y=ny-1;y>=0;y--){
   if(origin[1]+y*cellY<floor)break;
   for(let z=0;z<nz;z++)for(let x=0;x<nx;x++)if(field[x+nx*y+stride*z]>=iso){topY=y;break outer;}
  }
  if(topY<0)return;
  const bodyTop=origin[1]+topY*cellY;
  const flareHeight=Math.max(flareHeightFrac*Math.max(bodyTop-floor,cellY),cellY*3);
  const yMax=Math.min(Math.ceil((floor+flareHeight-origin[1])/cellY),ny-1);
  if(yMax<0)return;

  const num=nx*nz;
  if(this.offX.length<num){this.offX=new Float32Array(num);this.offZ=new Float32Array(num);this.seeded=new Uint8Array(num)}
  const offX=this.offX,offZ=this.offZ,seeded=this.seeded;
  const slope=iso/Math.max(cell,.001);
  const effectiveTip=Math.min(tip,reach);
  const dirX=[1,-1,0,0],dirZ=[0,0,1,-1];

  const sample=(x:number,y:number,z:number)=>x<0||z<0||x>=nx||z>=nz?0:field[x+nx*y+stride*z];
  const consider=(x:number,z:number,nx2:number,nz2:number)=>{
   if(nx2<0||nz2<0||nx2>=nx||nz2>=nz)return;
   const nIdx=nx2+nx*nz2;
   if(!seeded[nIdx])return;
   const idx=x+nx*z;
   const dx=offX[nIdx]-(x-nx2)*cell;
   const dz=offZ[nIdx]-(z-nz2)*cell;
   const lenSq=dx*dx+dz*dz;
   const curSq=seeded[idx]?offX[idx]*offX[idx]+offZ[idx]*offZ[idx]:1e12;
   if(lenSq<curSq){offX[idx]=dx;offZ[idx]=dz;seeded[idx]=1}
  };

  for(let y=0;y<=yMax;y++){
   const worldY=origin[1]+y*cellY;
   const above=worldY-floor;
   if(above>flareHeight)break;
   if(above<-cellY)continue;

   let anyInside=false;
   for(let z=0;z<nz;z++){
    for(let x=0;x<nx;x++){
     const idx=x+nx*z;
     const val=sample(x,y,z);
     const inside=val>=iso;
     if(inside)anyInside=true;
     let best=1e6,bx=0,bz=0;
     for(let d=0;d<4;d++){
      const nb=sample(x+dirX[d],y,z+dirZ[d]);
      if(inside===(nb>=iso))continue;
      const denom=Math.abs(val-nb);
      const along=clamp(denom>1e-5?Math.abs(val-iso)/denom:.5,0,1);
      const dist=along*cell;
      if(dist<best){best=dist;bx=dirX[d]*dist;bz=dirZ[d]*dist}
     }
     seeded[idx]=best<1e5?1:0;
     offX[idx]=bx;offZ[idx]=bz;
    }
   }
   if(!anyInside)continue;

   for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){consider(x,z,x-1,z);consider(x,z,x,z-1);consider(x,z,x-1,z-1);consider(x,z,x+1,z-1)}
   for(let z=nz-1;z>=0;z--)for(let x=nx-1;x>=0;x--){consider(x,z,x+1,z);consider(x,z,x,z+1);consider(x,z,x+1,z+1);consider(x,z,x-1,z+1)}

   const heightT=clamp(above/flareHeight,0,1);
   let spread=reach*Math.pow(1-heightT,Math.max(curve,.5));
   if(above<effectiveTip&&effectiveTip>1e-4){
    const rem=effectiveTip-Math.max(above,0);
    spread-=effectiveTip-Math.sqrt(Math.max(effectiveTip*effectiveTip-rem*rem,0));
   }
   spread=Math.max(spread,0);
   const band=spread+cell;

   for(let z=0;z<nz;z++){
    const wz=origin[2]+z*cell;
    for(let x=0;x<nx;x++){
     const idx=x+nx*z;
     if(!seeded[idx])continue;
     const wx=origin[0]+x*cell;
     if(!onPlane(wx,wz))continue;
     const len=Math.hypot(offX[idx],offZ[idx]);
     const signed=sample(x,y,z)>=iso?-len:len;
     if(signed>band||signed<-cell)continue;
     const fVal=iso+slope*(spread-signed);
     if(fVal<=0)continue;
     const cellIdx=x+nx*y+stride*z;
     field[cellIdx]=smoothMax(field[cellIdx],fVal,.72*iso);
    }
   }
  }
 }

 build(solver:SlimeSolver,quality:Quality,buffers?:{positions:Float32Array;normals:Float32Array;slots:Float32Array},attempt=0):MeshFrame {
  const started=performance.now(),positions=buffers?.positions??new Float32Array(this.maxVertices*3),normals=buffers?.normals??new Float32Array(this.maxVertices*3),slots=buffers?.slots??new Float32Array(this.maxVertices);let count=0,overflow=false;
  const centers:Vec[]=[],radii:Vec[]=[],clusterIds:number[]=[];const clusters=new Map<number,Particle[]>();clusters.set(0,[]);const merging=new Set(solver.shots.filter(s=>s.phase==='merging'||s.phase==='separating').map(s=>s.id));
  for(const p of solver.particles){const id=merging.has(p.group)?0:p.group;let list=clusters.get(id);if(!list)clusters.set(id,list=[]);list.push(p)}
  const scaleKey=quality+':'+clusters.size+':'+(solver.spread>.5?'sheet':'blob');if(attempt===0)this.cellScale=this.scales.get(scaleKey)??1;
  const domeWeight=smooth(solver.shapeBlend);
  const iso=1.05;
  let slot=0;
  for(const [id,particles] of clusters){
   if(!particles.length)continue;
   clusterIds.push(id);
   const min:Vec=[Infinity,Infinity,Infinity],max:Vec=[-Infinity,-Infinity,-Infinity];
   for(const {p} of particles)for(let k=0;k<3;k++){min[k]=Math.min(min[k],p[k]);max[k]=Math.max(max[k],p[k])}
   const reach=.105+(id===0?solver.spread*.06:0);
   const center=min.map((v,k)=>(v+max[k])*.5) as Vec;
   const opticalMin:Vec=[Infinity,Infinity,Infinity],opticalMax:Vec=[-Infinity,-Infinity,-Infinity];
   for(const particle of particles){if(id===0&&particle.group!==0)continue;for(let k=0;k<3;k++){opticalMin[k]=Math.min(opticalMin[k],particle.p[k]);opticalMax[k]=Math.max(opticalMax[k],particle.p[k]);}}
   centers.push(opticalMin.map((v,k)=>(v+opticalMax[k])*.5) as Vec);
   radii.push(opticalMin.map((v,k)=>Math.max(.05,(opticalMax[k]-v)*.5+.028)) as Vec);

   // UE Bell flare (Dome) vs GroundSkirt (Ball): mutually exclusive blend, active when grounded and not spread.
   const rimBlend=id===0&&solver.grounded&&solver.spread<.2?1-solver.spread*5:0;
   const bellReach=rimBlend*domeWeight*.185;
   const skirtReach=rimBlend*(1-domeWeight)*.08;
   const padXZ=Math.max(bellReach,skirtReach);
   if(padXZ>0){min[0]-=padXZ;min[2]-=padXZ;max[0]+=padXZ;max[2]+=padXZ;min[1]=Math.min(min[1],solver.foot[1]);}

   const maxDim=quality==='high'?44:32;
   let cell=Math.max((quality==='high'?(.028+(id===0?solver.spread*.042:0)):(.038+(id===0?solver.spread*.045:0)))*this.cellScale,Math.max(...max.map((v,k)=>v-min[k]+reach*2))/(maxDim-2));
   const cellY=id===0?Math.max((max[1]-min[1]+reach*2)/(maxDim-2),Math.min(cell,cell*(1-solver.spread)+.006*solver.spread)):cell;
   const cells=[cell,cellY,cell];
   const origin=min.map((v,k)=>Math.floor((v-reach)/cells[k])*cells[k]) as Vec;
   const dims=max.map((v,k)=>Math.min(maxDim,Math.ceil((v+reach-origin[k])/cells[k])+1));
   const [nx,ny,nz]=dims,stride=nx*ny,n=nx*ny*nz;
   if(this.field.length<n)this.field=new Float32Array(n);
   const field=this.field;field.fill(0,0,n);

   for(const {p} of particles){const local=p.map((v,k)=>(v-origin[k])/cells[k]);const r=reach/cell;const rs=cells.map(v=>reach/v);const a=local.map((v,k)=>Math.max(0,Math.floor(v-rs[k]))),b=local.map((v,k)=>Math.min(dims[k]-1,Math.ceil(v+rs[k])));for(let z=a[2];z<=b[2];z++)for(let y=a[1];y<=b[1];y++)for(let x=a[0];x<=b[0];x++){const d2=((x-local[0])**2+(z-local[2])**2)/(r*r)+(y-local[1])**2/(rs[1]*rs[1]);if(d2<1)field[x+nx*y+stride*z]+=Math.pow(1-d2,3)}}
   const blurred=new Float32Array(n);
   for(let pass=0;pass<(quality==='high'?3:2);pass++)for(let axis=0;axis<3;axis++){blurred.set(field.subarray(0,n));const step=[1,nx,stride][axis];for(let z=1;z<nz-1;z++)for(let y=1;y<ny-1;y++)for(let x=1;x<nx-1;x++){const j=x+nx*y+stride*z;field[j]=(blurred[j-step]+2*blurred[j]+blurred[j+step])*.25}}

   // Density-union liquid bridges only appear when shots are right against the body surface.
   if(id===0){for(const shot of solver.shots){if(shot.phase!=='merging'&&shot.phase!=='separating')continue;const a=solver.center,b=shot.center,dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],l2=dx*dx+dy*dy+dz*dz;if(l2<.005||(shot.phase==='merging'&&l2>.32))continue;const radius=shot.phase==='merging'?.115:.095;for(let z=1;z<nz-1;z++)for(let y=1;y<ny-1;y++)for(let x=1;x<nx-1;x++){const wx=origin[0]+x*cell,wy=origin[1]+y*cellY,wz=origin[2]+z*cell;const t=clamp(((wx-a[0])*dx+(wy-a[1])*dy+(wz-a[2])*dz)/l2,0,1),r=radius*(.8+.2*Math.sin(t*Math.PI)),d2=((wx-a[0]-t*dx)**2+(wy-a[1]-t*dy)**2+(wz-a[2]-t*dz)**2)/(r*r);if(d2<1)field[x+nx*y+stride*z]+=2.4*(1-d2)**2}}}

   const onPlane=(wx:number,wz:number)=>{const g=solver.world.support(wx,wz,solver.foot[1]+.05);return g!==null&&Math.abs(g-solver.foot[1])<=.08};
   if(bellReach>.002){
    // Smooth UE Dome Bell Flare: higher onset (0.56), wide fluid sweep (0.185m), curve 2.25, rounded meniscus tip
    this.applyBellFlare(field,nx,ny,nz,stride,origin,cell,cellY,solver.foot[1],iso,.56,bellReach,2.25,.018*domeWeight,onPlane);
    // One post-flare 1-2-1 smoothing pass eliminates any waist crease so top-to-skirt reads as one glassy curve.
    for(let axis=0;axis<3;axis++){blurred.set(field.subarray(0,n));const step=[1,nx,stride][axis];for(let z=1;z<nz-1;z++)for(let y=1;y<ny-1;y++)for(let x=1;x<nx-1;x++){const j=x+nx*y+stride*z;field[j]=(blurred[j-step]+2*blurred[j]+blurred[j+step])*.25}}
   }
   if(skirtReach>.002){
    // UE Ball Ground Skirt: low meniscus skirt
    this.applyBellFlare(field,nx,ny,nz,stride,origin,cell,cellY,solver.foot[1],iso,.18,skirtReach,1.8,.01,onPlane);
   }

   // UE sheet mode: conserved particle volume accumulates into XZ columns.
   if(id===0&&solver.spread>.01){const radius=.046*mixScale(solver.spread)*1.6,volume=4/3*Math.PI*.27**3/384,norm=3/(Math.PI*radius*radius);for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){const wx=origin[0]+x*cell,wz=origin[2]+z*cell;let weight=0,height=0;for(const {p} of particles){const d2=((p[0]-wx)**2+(p[2]-wz)**2)/(radius*radius);if(d2>=1)continue;const w=(1-d2)**2;weight+=w;height+=p[1]*w;}if(weight<.02)continue;const g=solver.world.support(wx,wz,solver.foot[1]+.05);const base=g!==null&&g>=solver.foot[1]-.08?g:height/weight-.023;const thick=Math.max(cellY*1.8,volume*norm*weight);for(let y=0;y<ny;y++){const wy=origin[1]+y*cellY,inside=Math.min(wy-base,base+thick-wy);const sheet=Math.max(0,1.05+inside*1.05/Math.max(cellY*.40,.003));const j=x+nx*y+stride*z;field[j]=field[j]*(1-solver.spread)+sheet*solver.spread;}}}

   // Per-cell floors retain contact on slopes and permit supported edge sag.
   const shot=solver.shots.find(s=>s.id===id);
   if(!id||shot?.grounded){for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){const g=solver.world.support(origin[0]+x*cell,origin[2]+z*cell,center[1]);if(g===null)continue;for(let y=0;y<ny&&origin[1]+y*cellY<g-.004;y++)field[x+nx*y+stride*z]=0}}

   const grad=(x:number,y:number,z:number):Vec=>{const at=(a:number,b:number,c:number)=>field[clamp(a,0,nx-1)+nx*clamp(b,0,ny-1)+stride*clamp(c,0,nz-1)];const g:Vec=[at(x-1,y,z)-at(x+1,y,z),at(x,y-1,z)-at(x,y+1,z),at(x,y,z-1)-at(x,y,z+1)];return g.map((v,k)=>v/cells[k]) as Vec};
   for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
    const vals=corners.map(c=>field[x+c[0]+nx*(y+c[1])+stride*(z+c[2])]);let cube=0;for(let k=0;k<8;k++)if(vals[k]<iso)cube|=1<<k;const mask=edgeTable[cube];if(!mask)continue;
    for(let e=0;e<12;e++){if(!(mask&(1<<e)))continue;const [ia,ib]=edges[e],a=corners[ia],b=corners[ib],t=(iso-vals[ia])/(vals[ib]-vals[ia]);const ga=grad(x+a[0],y+a[1],z+a[2]),gb=grad(x+b[0],y+b[1],z+b[2]);for(let k=0;k<3;k++){this.points[e*3+k]=origin[k]+([x,y,z][k]+a[k]+(b[k]-a[k])*t)*cells[k];this.norms[e*3+k]=ga[k]+(gb[k]-ga[k])*t}}
    for(let t=0;t<16;t+=3){if(triTable[cube*16+t]<0)break;if(count+3>this.maxVertices){overflow=true;continue}const es=[triTable[cube*16+t],triTable[cube*16+t+1],triTable[cube*16+t+2]];const ax=this.points[es[1]*3]-this.points[es[0]*3],ay=this.points[es[1]*3+1]-this.points[es[0]*3+1],az=this.points[es[1]*3+2]-this.points[es[0]*3+2],bx=this.points[es[2]*3]-this.points[es[0]*3],by=this.points[es[2]*3+1]-this.points[es[0]*3+1],bz=this.points[es[2]*3+2]-this.points[es[0]*3+2];if((ay*bz-az*by)*this.norms[es[0]*3]+(az*bx-ax*bz)*this.norms[es[0]*3+1]+(ax*by-ay*bx)*this.norms[es[0]*3+2]<0)[es[1],es[2]]=[es[2],es[1]];for(const e of es){for(let k=0;k<3;k++){positions[count*3+k]=this.points[e*3+k];normals[count*3+k]=this.norms[e*3+k]}slots[count]=slot;count++}}
   }
   slot++;
  }
  if(overflow&&attempt<14){this.cellScale*=1.15;this.scales.set(scaleKey,this.cellScale);const result=this.build(solver,quality,{positions,normals,slots},attempt+1);result.meshMs=performance.now()-started;return result;}
  this.scales.set(scaleKey,this.cellScale);
  return {positions,normals,slots,count,centers,radii,clusterIds,shots:solver.views(),simMs:0,meshMs:performance.now()-started,particleCount:solver.particles.length,generation:0,overflow,grounded:solver.grounded,spread:solver.spread,shapeBlend:solver.shapeBlend};
 }
}
function mixScale(spread:number){return 1+1.2*spread}
