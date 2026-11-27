import * as THREE from 'three';
import {waterWaves} from '../home/water-waves';
import {LAKE} from '../world/map';
import {createInlandWaterMaterial, LAKE_BAND, PUDDLE_BAND, WATER_LAYER, type InlandWaterOptions} from '../home/render/water-surface';

// Inland water shares the pipeline's opaque copy for refraction and its single mirror for reflection,
// so a lake, river or pond adds no scene passes of its own.
export function valleyWater(ctx:any,geometry:any,x:number,y:number,z:number,flowX=.28,flowZ=.16,opts:InlandWaterOptions={}){
  const waves=waterWaves(ctx),pipeline=ctx.pipeline;
  const puddle=geometry.type==='ShapeGeometry';
  const river=Math.hypot(flowX,flowZ)>.6;
  const material=createInlandWaterMaterial(pipeline.water,ctx.U,waves.events,{
    band:puddle?PUDDLE_BAND:LAKE_BAND,flow:[flowX,flowZ],
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
  water.rotation.x=-Math.PI/2;water.position.set(x,y,z);water.layers.set(WATER_LAYER);water.name='garden-water';
  water.renderOrder=-20;material.uniforms.uLevel.value=y;
  water.onBeforeRender=(renderer:any)=>pipeline.captureOpaque(renderer);
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
