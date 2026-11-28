import * as T from 'three';
import {preserveHeight,type PreserveRect} from '../world/expansion';
import {rng} from '../templates/random';
import type {Box} from '../slime/types';

const clamp=(v:number)=>Math.max(0,Math.min(1,v));
function causewayX(center:number,z:number){
  const t=(z-142)*Math.PI/20,dir=center<0?-1:1;
  return center+dir*(3.85*Math.sin(t)+.8*Math.sin(2*t));
}
/** The packed-earth approaches start inside the old island so the trail never ends at a tile edge. */
export function approachWear(x:number,z:number){
  const west=x< -64,center=west?-85:23,start=west?104:120;
  if(z<start||z>142||Math.abs(x-center)>10)return 0;
  const u=clamp((z-start)/(142-start));
  const bend=causewayX(center,z)+(west?(-82-causewayX(center,start))*(1-u)**2:3.8*(1-T.MathUtils.smoothstep(Math.abs(z-130),0,7)));
  const slope=(causewayX(center,z+.15)-causewayX(center,z-.15))/.30;
  const edge=Math.abs(x-bend)/Math.hypot(1,slope)-trailWidth(x,z);
  return (1-T.MathUtils.smoothstep(edge,-.4,.57))*T.MathUtils.smoothstep(u,0,.24);
}
function trailWidth(x:number,z:number){
  return 1.13+.16*Math.sin(z*.59+x*.31)+.09*Math.cos(x*1.6-z*.85);
}
export function trailX(r:PreserveRect,z:number){
  const cx=(r.minX+r.maxX)/2;
  if(r.biome==='trail')return causewayX(cx,z);
  const u=clamp((z-r.minZ)/(r.maxZ-r.minZ)),ease=1-u*u*(3-2*u);
  const approach=r.biome==='marsh'?23-cx:r.biome==='redwoods'?-85-cx:0;
  const bends=2.5*Math.sin(2*Math.PI*u)+1.4*Math.sin(4*Math.PI*u);
  return cx+approach*Math.max(0,1-u*2.25)**2*ease+bends;
}
function crossingZ(r:PreserveRect,x:number){
  const u=clamp((x-r.minX)/(r.maxX-r.minX));
  return (r.minZ+r.maxZ)/2+2.6*Math.sin(u*Math.PI*2)-1.4*Math.sin(u*Math.PI*4);
}
export function pathDistance(r:PreserveRect,x:number,z:number){
  const slope=(trailX(r,z+.15)-trailX(r,z-.15))/.30;
  const along=Math.abs(x-trailX(r,z))/Math.hypot(1,slope);
  return r.biome==='trail'?along:Math.min(along,Math.abs(z-crossingZ(r,x)));
}
export function pathEdge(r:PreserveRect,x:number,z:number){
  return pathDistance(r,x,z)-trailWidth(x,z);
}
export function makeTrailFence(r:PreserveRect){
  const root=new T.Group(),boxes:Box[]=[],poses:T.Matrix4[]=[],colors:T.Color[]=[];
  root.name='北岸木栏';const rand=rng('rail-'+r.biome+r.minX+'/'+r.minZ);
  const peg=new T.Object3D(),up=new T.Vector3(0,1,0);
  const beam=(start:T.Vector3,end:T.Vector3,width:number,depth:number)=>{
    const v=end.clone().sub(start);peg.position.copy(start).lerp(end,.5);
    peg.quaternion.setFromUnitVectors(up,v.clone().normalize());peg.scale.set(width,v.length(),depth);peg.updateMatrix();
    poses.push(peg.matrix.clone());colors.push(new T.Color(rand.pick([0x866442,0xa58054,0x95744f,0x796044])));
  };
  for(const [from,to,side] of [[.06,.34,-1],[.56,.9,1]]){
    const count=Math.max(2,Math.round((r.maxZ-r.minZ)*(to-from)/2.35));
    let prev:T.Vector3|undefined;
    for(let i=0;i<=count;i++){
      const z=r.minZ+(r.maxZ-r.minZ)*(from+(to-from)*i/count),s=(trailX(r,z+.1)-trailX(r,z-.1))/.2;
      const off=side*2.02/Math.hypot(1,s),x=trailX(r,z)+off,zz=z-s*off;
      const y=preserveHeight(r,x,zz),p=new T.Vector3(x,y,zz),top=rand.range(.87,1.09);
      beam(p.clone().addScaledVector(up,-.08),new T.Vector3(x+rand.range(-.055,.055),y+top,zz),.115,.137);
      boxes.push({name:'木栏柱',min:[x-.07,y,zz-.07],max:[x+.07,y+top,zz+.07],camera:false});
      if(prev){
        for(const h of [.36,.73])beam(prev.clone().addScaledVector(up,h),p.clone().addScaledVector(up,h+rand.range(-.025,.025)),.093,.135);
        const dx=x-prev.x,dz=zz-prev.z,cx=(x+prev.x)/2,cz=(zz+prev.z)/2,span=Math.hypot(dx,dz);
        boxes.push({name:'北岸木栏',min:[cx-.055,Math.min(y,prev.y),cz-span/2],max:[cx+.055,Math.max(y,prev.y)+.79,cz+span/2],yaw:Math.atan2(dx,dz),camera:false});
      }
      prev=p;
    }
  }
  const mesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({roughness:.94}),poses.length);
  poses.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,colors[i]);});mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
  return {root,boxes};
}

/** A strip of adjoining trapezoids follows the same centreline as the collision deck. */
export function makeBoardwalk(r:PreserveRect){
  const positions:number[]=[],colors:number[]=[],indices:number[]=[],boxes:Box[]=[];
  const count=Math.ceil((r.maxZ-r.minZ)/.44),width=.96;
  const edge=(z:number,side:number)=>{
    const x=trailX(r,z),s=(trailX(r,z+.1)-trailX(r,z-.1))/.2,off=side*width/Math.hypot(1,s);
    return [x+off,Math.max(.29,preserveHeight(r,x,z))+.12,z-off*s];
  };
  for(let i=0;i<count;i++){
    const z0=r.minZ+(r.maxZ-r.minZ)*i/count,z1=z0+(r.maxZ-r.minZ)/count;
    const mid=(z0+z1)/2;
    if(preserveHeight(r,trailX(r,mid),mid)>.38)continue;
    const c=new T.Color().setHex([0xb49a70,0xa48761,0xbd9e73,0xb09369][i%4]);
    const a=edge(z0,-1),b=edge(z0,1),d=edge(z1,-1),e=edge(z1,1),k=positions.length/3;
    // Narrow saw gaps between boards. Endpoints meet the land at both banks.
    const corners=[a,b,d,e].map((p,j)=>p.map((v,n)=>T.MathUtils.lerp(v,[d,e,a,b][j][n],.025)));
    for(const dy of [0,-.13])for(const p of corners){positions.push(p[0],p[1]+dy,p[2]);colors.push(c.r,c.g,c.b);}
    for(const j of [0,2,1,1,2,3,0,4,2,2,4,6,1,3,5,3,7,5,0,1,4,1,5,4,2,6,3,3,6,7])indices.push(k+j);
    const x0=trailX(r,z0),x1=trailX(r,z1),cx=(x0+x1)/2,cz=(z0+z1)/2,h=(a[1]+d[1])/2,len=Math.hypot(x1-x0,z1-z0);
    boxes.push({name:'弯木栈道',min:[cx-width,h-.15,cz-len/2-.02],max:[cx+width,h,cz+len/2+.02],yaw:Math.atan2(x1-x0,z1-z0),camera:false});
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.96}));mesh.receiveShadow=true;mesh.name='弯木栈道';
  return {mesh,boxes};
}
