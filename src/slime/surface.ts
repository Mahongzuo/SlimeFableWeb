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
 private blurred=new Float32Array(44**3);
 private vals=new Float32Array(8);
 private points=new Float32Array(36);
 private norms=new Float32Array(36);
 private offX=new Float32Array(44*44);
 private offZ=new Float32Array(44*44);
 private seeded=new Uint8Array(44*44);
 private planeMask=new Uint8Array(44*44);
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
  if(this.planeMask.length<num)this.planeMask=new Uint8Array(num);
  const offX=this.offX,offZ=this.offZ,seeded=this.seeded,planeMask=this.planeMask;
  for(let z=0;z<nz;z++){
   const wz=origin[2]+z*cell;
   for(let x=0;x<nx;x++)planeMask[x+nx*z]=onPlane(origin[0]+x*cell,wz)?1:0;
  }
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
    for(let x=0;x<nx;x++){
     const idx=x+nx*z;
     if(!seeded[idx]||!planeMask[idx])continue;
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
   const spanX=max[0]-min[0]+reach*2,spanY=max[1]-min[1]+reach*2,spanZ=max[2]-min[2]+reach*2;
   // When particles drape vertically over a thin ledge/wall, keep initial grid density bounded so MC stays fast & avoids overflow rebuilds.
   const drapeScale=id===0&&solver.spread<.2&&spanY>.72?Math.min(1.38,1+(spanY-.72)*.48):1;
   let cell=Math.max((quality==='high'?(.028+(id===0?solver.spread*.042:0)):(.038+(id===0?solver.spread*.045:0)))*this.cellScale*drapeScale,Math.max(spanX,spanY,spanZ)/(maxDim-2));
   const cellY=id===0?Math.max(spanY/(maxDim-2),Math.min(cell,cell*(1-solver.spread)+.006*solver.spread)):cell;
   const ox=Math.floor((min[0]-reach)/cell)*cell,oy=Math.floor((min[1]-reach)/cellY)*cellY,oz=Math.floor((min[2]-reach)/cell)*cell;
   const origin:Vec=[ox,oy,oz];
   const nx=Math.min(maxDim,Math.ceil((max[0]+reach-ox)/cell)+1);
   const ny=Math.min(maxDim,Math.ceil((max[1]+reach-oy)/cellY)+1);
   const nz=Math.min(maxDim,Math.ceil((max[2]+reach-oz)/cell)+1);
   const stride=nx*ny,n=nx*ny*nz;
   if(this.field.length<n)this.field=new Float32Array(n);
   if(this.blurred.length<n)this.blurred=new Float32Array(n);
   const field=this.field;field.fill(0,0,n);
   const blurred=this.blurred;

   const invCell=1/cell,invCellY=1/cellY;
   const rXZ=reach*invCell,rY=reach*invCellY,invR2XZ=1/(rXZ*rXZ),invR2Y=1/(rY*rY);
   for(let pi=0;pi<particles.length;pi++){
    const pp=particles[pi].p;
    const lx=(pp[0]-ox)*invCell,ly=(pp[1]-oy)*invCellY,lz=(pp[2]-oz)*invCell;
    const ax=Math.max(0,Math.floor(lx-rXZ)),bx=Math.min(nx-1,Math.ceil(lx+rXZ));
    const ay=Math.max(0,Math.floor(ly-rY)),by=Math.min(ny-1,Math.ceil(ly+rY));
    const az=Math.max(0,Math.floor(lz-rXZ)),bz=Math.min(nz-1,Math.ceil(lz+rXZ));
    for(let z=az;z<=bz;z++){
     const dz=z-lz,dz2=dz*dz*invR2XZ,zOff=stride*z;
     for(let y=ay;y<=by;y++){
      const dy=y-ly,dyz2=dz2+dy*dy*invR2Y;if(dyz2>=1)continue;
      const yzOff=nx*y+zOff;
      for(let x=ax;x<=bx;x++){
       const dx=x-lx,d2=dyz2+dx*dx*invR2XZ;
       if(d2<1){const t=1-d2;field[x+yzOff]+=t*t*t;}
      }
     }
    }
   }
   const passes=quality==='high'?3:2;
   for(let pass=0;pass<passes;pass++)for(let axis=0;axis<3;axis++){
    blurred.set(field.subarray(0,n));
    const step=axis===0?1:axis===1?nx:stride;
    for(let z=1;z<nz-1;z++){const zOff=stride*z;for(let y=1;y<ny-1;y++){const yzOff=nx*y+zOff;for(let x=1;x<nx-1;x++){const j=x+yzOff;field[j]=(blurred[j-step]+2*blurred[j]+blurred[j+step])*.25}}}
   }

   // Density-union liquid bridges only appear when shots are right against the body surface.
   if(id===0){for(const shot of solver.shots){if(shot.phase!=='merging'&&shot.phase!=='separating')continue;const a=solver.center,b=shot.center,dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],l2=dx*dx+dy*dy+dz*dz;if(l2<.005||(shot.phase==='merging'&&l2>.32))continue;const radius=shot.phase==='merging'?.115:.095;for(let z=1;z<nz-1;z++)for(let y=1;y<ny-1;y++)for(let x=1;x<nx-1;x++){const wx=ox+x*cell,wy=oy+y*cellY,wz=oz+z*cell;const t=clamp(((wx-a[0])*dx+(wy-a[1])*dy+(wz-a[2])*dz)/l2,0,1),r=radius*(.8+.2*Math.sin(t*Math.PI)),d2=((wx-a[0]-t*dx)**2+(wy-a[1]-t*dy)**2+(wz-a[2]-t*dz)**2)/(r*r);if(d2<1)field[x+nx*y+stride*z]+=2.4*(1-d2)**2}}}

   const onPlane=(wx:number,wz:number)=>{const g=solver.world.support(wx,wz,solver.foot[1]+.05);return g!==null&&Math.abs(g-solver.foot[1])<=.08};
   if(bellReach>.002){
    // Smooth UE Dome Bell Flare: higher onset (0.56), wide fluid sweep (0.185m), curve 2.25, rounded meniscus tip
    this.applyBellFlare(field,nx,ny,nz,stride,origin,cell,cellY,solver.foot[1],iso,.56,bellReach,2.25,.018*domeWeight,onPlane);
    // One post-flare 1-2-1 smoothing pass eliminates any waist crease so top-to-skirt reads as one glassy curve.
    for(let axis=0;axis<3;axis++){blurred.set(field.subarray(0,n));const step=axis===0?1:axis===1?nx:stride;for(let z=1;z<nz-1;z++){const zOff=stride*z;for(let y=1;y<ny-1;y++){const yzOff=nx*y+zOff;for(let x=1;x<nx-1;x++){const j=x+yzOff;field[j]=(blurred[j-step]+2*blurred[j]+blurred[j+step])*.25}}}}
   }
   if(skirtReach>.002){
    // UE Ball Ground Skirt: low meniscus skirt
    this.applyBellFlare(field,nx,ny,nz,stride,origin,cell,cellY,solver.foot[1],iso,.18,skirtReach,1.8,.01,onPlane);
   }

   // UE sheet mode: conserved particle volume accumulates into XZ columns.
   if(id===0&&solver.spread>.01){const radius=.046*mixScale(solver.spread)*1.6,volume=4/3*Math.PI*.27**3/384,norm=3/(Math.PI*radius*radius);for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){const wx=ox+x*cell,wz=oz+z*cell;let weight=0,height=0;for(const {p} of particles){const d2=((p[0]-wx)**2+(p[2]-wz)**2)/(radius*radius);if(d2>=1)continue;const w=(1-d2)**2;weight+=w;height+=p[1]*w;}if(weight<.02)continue;const g=solver.world.support(wx,wz,solver.foot[1]+.05);const base=g!==null&&g>=solver.foot[1]-.08?g:height/weight-.023;const thick=Math.max(cellY*1.8,volume*norm*weight);for(let y=0;y<ny;y++){const wy=oy+y*cellY,inside=Math.min(wy-base,base+thick-wy);const sheet=Math.max(0,1.05+inside*1.05/Math.max(cellY*.40,.003));const j=x+nx*y+stride*z;field[j]=field[j]*(1-solver.spread)+sheet*solver.spread;}}}

   // Per-cell floors retain contact on slopes and permit supported edge sag.
   const shot=solver.shots.find(s=>s.id===id);
   if(!id||shot?.grounded){for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){const g=solver.world.support(ox+x*cell,oz+z*cell,center[1]);if(g===null)continue;for(let y=0;y<ny&&oy+y*cellY<g-.004;y++)field[x+nx*y+stride*z]=0}}
   if(!id&&solver.ridePlane){const rp=solver.ridePlane,n=rp.normal,pt=rp.point;for(let z=0;z<nz;z++){const wz=oz+z*cell;for(let x=0;x<nx;x++){const wx=ox+x*cell;for(let y=0;y<ny;y++){const wy=oy+y*cellY;if((wx-pt[0])*n[0]+(wy-pt[1])*n[1]+(wz-pt[2])*n[2]<-.002)field[x+nx*y+stride*z]=0}}}}

   // Zero-allocation Marching Cubes extraction with inlined finite-difference gradients
   const vals=this.vals,pts=this.points,nrms=this.norms;
   const nx1=nx-1,ny1=ny-1,nz1=nz-1;
   for(let z=0;z<nz1;z++){
    const z0=stride*z,z1=z0+stride;
    for(let y=0;y<ny1;y++){
     const y0=nx*y,y1=y0+nx;
     for(let x=0;x<nx1;x++){
      const v0=field[x+y0+z0],v1=field[x+1+y0+z0],v2=field[x+1+y1+z0],v3=field[x+y1+z0];
      const v4=field[x+y0+z1],v5=field[x+1+y0+z1],v6=field[x+1+y1+z1],v7=field[x+y1+z1];
      let cube=0;
      if(v0<iso)cube|=1;if(v1<iso)cube|=2;if(v2<iso)cube|=4;if(v3<iso)cube|=8;
      if(v4<iso)cube|=16;if(v5<iso)cube|=32;if(v6<iso)cube|=64;if(v7<iso)cube|=128;
      const mask=edgeTable[cube];if(!mask)continue;
      vals[0]=v0;vals[1]=v1;vals[2]=v2;vals[3]=v3;vals[4]=v4;vals[5]=v5;vals[6]=v6;vals[7]=v7;
      for(let e=0;e<12;e++){
       if(!(mask&(1<<e)))continue;
       const ed=edges[e],ia=ed[0],ib=ed[1],a=corners[ia],b=corners[ib];
       const t=(iso-vals[ia])/(vals[ib]-vals[ia]);
       const ax=x+a[0],ay=y+a[1],az=z+a[2];
       const bx=x+b[0],by=y+b[1],bz=z+b[2];
       const pOff=e*3;
       pts[pOff]=ox+(ax+(bx-ax)*t)*cell;
       pts[pOff+1]=oy+(ay+(by-ay)*t)*cellY;
       pts[pOff+2]=oz+(az+(bz-az)*t)*cell;
       const ayOff=nx*ay+stride*az;
       const gax=(field[(ax>0?ax-1:0)+ayOff]-field[(ax<nx1?ax+1:nx1)+ayOff])*invCell;
       const gay=(field[ax+nx*(ay>0?ay-1:0)+stride*az]-field[ax+nx*(ay<ny1?ay+1:ny1)+stride*az])*invCellY;
       const gaz=(field[ax+nx*ay+stride*(az>0?az-1:0)]-field[ax+nx*ay+stride*(az<nz1?az+1:nz1)])*invCell;
       const byOff=nx*by+stride*bz;
       const gbx=(field[(bx>0?bx-1:0)+byOff]-field[(bx<nx1?bx+1:nx1)+byOff])*invCell;
       const gby=(field[bx+nx*(by>0?by-1:0)+stride*bz]-field[bx+nx*(by<ny1?by+1:ny1)+stride*bz])*invCellY;
       const gbz=(field[bx+nx*by+stride*(bz>0?bz-1:0)]-field[bx+nx*by+stride*(bz<nz1?bz+1:nz1)])*invCell;
       nrms[pOff]=gax+(gbx-gax)*t;
       nrms[pOff+1]=gay+(gby-gay)*t;
       nrms[pOff+2]=gaz+(gbz-gaz)*t;
      }
      const baseT=cube*16;
      for(let t=0;t<16;t+=3){
       const e0=triTable[baseT+t];if(e0<0)break;
       if(count+3>this.maxVertices){overflow=true;continue}
       let e1=triTable[baseT+t+1],e2=triTable[baseT+t+2];
       const i0=e0*3,i1=e1*3,i2=e2*3;
       const ax=pts[i1]-pts[i0],ay=pts[i1+1]-pts[i0+1],az=pts[i1+2]-pts[i0+2];
       const bx=pts[i2]-pts[i0],by=pts[i2+1]-pts[i0+1],bz=pts[i2+2]-pts[i0+2];
       let o1=i1,o2=i2;
       if((ay*bz-az*by)*nrms[i0]+(az*bx-ax*bz)*nrms[i0+1]+(ax*by-ay*bx)*nrms[i0+2]<0){o1=i2;o2=i1;}
       const c0=count*3,c1=c0+3,c2=c0+6;
       positions[c0]=pts[i0];positions[c0+1]=pts[i0+1];positions[c0+2]=pts[i0+2];
       normals[c0]=nrms[i0];normals[c0+1]=nrms[i0+1];normals[c0+2]=nrms[i0+2];
       positions[c1]=pts[o1];positions[c1+1]=pts[o1+1];positions[c1+2]=pts[o1+2];
       normals[c1]=nrms[o1];normals[c1+1]=nrms[o1+1];normals[c1+2]=nrms[o1+2];
       positions[c2]=pts[o2];positions[c2+1]=pts[o2+1];positions[c2+2]=pts[o2+2];
       normals[c2]=nrms[o2];normals[c2+1]=nrms[o2+1];normals[c2+2]=nrms[o2+2];
       slots[count]=slot;slots[count+1]=slot;slots[count+2]=slot;
       count+=3;
      }
     }
    }
   }
   slot++;
  }
  if(overflow&&attempt<14){this.cellScale*=1.15;this.scales.set(scaleKey,this.cellScale);const result=this.build(solver,quality,{positions,normals,slots},attempt+1);result.meshMs=performance.now()-started;return result;}
  this.scales.set(scaleKey,this.cellScale);
  return {positions,normals,slots,count,centers,radii,clusterIds,shots:solver.views(),simMs:0,meshMs:performance.now()-started,particleCount:solver.particles.length,generation:0,overflow,grounded:solver.grounded,spread:solver.spread,shapeBlend:solver.shapeBlend};
 }
}
function mixScale(spread:number){return 1+1.2*spread}
