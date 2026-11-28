import * as THREE from 'three';
import {waterWaves} from '../home/water-waves';
import {LAKE} from '../world/map';
import {createInlandWaterMaterial, LAKE_BAND, PUDDLE_BAND, WATER_LAYER, type InlandWaterOptions} from '../home/render/water-surface';

/** Indexed XZ triangles keep camera membership and the sloping waterline on the rendered bed. */
export function slopedWaterLevel(points:number[],indices:number[]){
  const cells=new Map<string,number[]>(),step=4;
  for(let i=0;i<indices.length;i+=3){
    const vertices=indices.slice(i,i+3).map(v=>3*v),xs=vertices.map(v=>points[v]),zs=vertices.map(v=>points[v+2]);
    for(let x=Math.floor(Math.min(...xs)/step);x<=Math.floor(Math.max(...xs)/step);x++)
      for(let z=Math.floor(Math.min(...zs)/step);z<=Math.floor(Math.max(...zs)/step);z++){
        const key=x+','+z;let bucket=cells.get(key);
        if(!bucket)cells.set(key,bucket=[]);bucket.push(i);
      }
  }
  return (x:number,z:number):number|undefined=>{
    const tris=cells.get(Math.floor(x/step)+','+Math.floor(z/step));
    if(!tris)return;
    for(const i of tris){
      const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;
      const ax=points[a]-points[c],az=points[a+2]-points[c+2],bx=points[b]-points[c],bz=points[b+2]-points[c+2];
      const dx=x-points[c],dz=z-points[c+2],det=ax*bz-az*bx;
      if(Math.abs(det)<1e-8)continue;
      const u=(dx*bz-dz*bx)/det,v=(ax*dz-az*dx)/det;
      if(u>=0 && v>=0 && u+v<=1)return u*points[a+1]+v*points[b+1]+(1-u-v)*points[c+1];
    }
  };
}
// Inland water shares the pipeline's opaque copy for refraction and its single mirror for reflection,
// so a lake, river or pond adds no scene passes of its own.
export function valleyWater(ctx:any,geometry:any,x:number,y:number,z:number,flowX=.28,flowZ=.16,opts:InlandWaterOptions & {levelAt?:(x:number,z:number)=>number|undefined}={}){
  const waves=waterWaves(ctx),pipeline=ctx.pipeline;
  const puddle=geometry.type==='ShapeGeometry';
  const river=Math.hypot(flowX,flowZ)>.6;
  const material=createInlandWaterMaterial(pipeline.water,ctx.U,waves.events,{
    sloped:!!opts.levelAt,animalContacts:waves.animalEvents,band:puddle?PUDDLE_BAND:LAKE_BAND,flow:[flowX,flowZ],
    calm:puddle?.85:river?.15:.6,minReflect:puddle?0:.04,shoreFoam:puddle?0:river?.16:.1,
    absorb:puddle?[.9,.7,.6]:[.55,.16,.12],puddle,patches:puddle?ctx.puddles:undefined,...opts,
  });
  if(puddle&&ctx.onUpdate){
    const wet=material.uniforms.uWet;
    ctx.onUpdate(()=>{const w=ctx.weather?.wet??ctx.weather?.rain??0;wet.value+=(Math.min(1,Math.max(0,w))-wet.value)*.02;});
  }
  material.uniforms.tWaterNormal0.value??=waves.normals[0];
  material.uniforms.tWaterNormal1.value??=waves.normals[1];
  const water=new THREE.Mesh(geometry,material);
  water.rotation.x=opts.levelAt?0:-Math.PI/2;water.position.set(x,y,z);water.layers.set(WATER_LAYER);water.name='garden-water';
  water.renderOrder=-20;material.uniforms.uLevel.value=y;
  water.onBeforeRender=(renderer:any)=>pipeline.captureOpaque(renderer);
  if(opts.levelAt)water.userData.levelAt=opts.levelAt;
  else if(!puddle) {
    const p=geometry.parameters;
    water.userData.containsWater=(wx:number,wz:number)=>{
      const dx=(wx-x)/water.scale.x,dz=(wz-z)/water.scale.y;
      return p.radius!==undefined ? dx*dx+dz*dz < p.radius*p.radius : Math.abs(dx)<p.width/2 && Math.abs(dz)<p.height/2;
    };
  }
  waves.surfaces.add(water);
  const entry=pipeline.registerWater(water,y);
  water.userData.releaseWater=()=>{
    waves.surfaces.delete(water);pipeline.unregisterWater(entry);material.dispose();
  };
  return water;
}
export function lakeWater(ctx:any){
  const mesh=valleyWater(ctx,new ctx.THREE.CircleGeometry(1,96),LAKE.center[0],LAKE.level,LAKE.center[1],.28,.16,{calm:.75});
  mesh.scale.set(LAKE.rx*1.04,LAKE.rz*1.04,1);
  return {mesh,update(){mesh.visible=ctx.camera.position.distanceTo(mesh.position)<125;}};
}
