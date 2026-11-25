import {spawnPackModel} from './model-pack';
import {valleyWater} from '../zones/lake-water';
import {inland} from '../world/map';
import type {GroundFinish} from '../life/state';

import {quayPavilion, nativeLane} from './layout';
const finishMaps = new Map<GroundFinish, any>();

/** Tile joints and moss are painted into one surface, including the stone margins. */
function finishMap(T: any, finish: GroundFinish) {
  if (finishMaps.has(finish)) return finishMaps.get(finish);
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const stone = finish === 'stone', planted = finish === 'border';
  g.fillStyle = stone ? '#929991' : planted ? '#76836a' : '#ad9675';
  g.fillRect(0, 0, 256, 256);
  let seed = 491;
  const rand = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  if (stone) {
    const shades = ['#aab3aa','#bac0b4','#afb8b0','#c1c5b9','#a5afa9'];
    for (let row = 0; row < 5; row++) {
      const y = row * 51.2;
      for (let col = -1; col < 3; col++) {
        g.fillStyle = shades[Math.floor(rand()*shades.length)];
        g.fillRect(col*128 + (row%2)*64+1,y+1,126,49.3);
      }
    }
  }
  for(let i=0;i<1100;i++) {
    g.fillStyle = rand()>.5 ? 'rgba(47,65,52,.10)' : 'rgba(247,242,210,.14)';
    g.fillRect(rand()*256,rand()*256,1+rand()*4,1+rand()*2);
  }
  const t = new T.CanvasTexture(c); t.colorSpace=T.SRGBColorSpace;
  t.wrapS=t.wrapT=T.RepeatWrapping; finishMaps.set(finish,t); return t;
}

const materials = new Map<GroundFinish, any>();
export function groundTile(ctx:any, finish:GroundFinish, x:number,z:number, height:(x:number,z:number)=>number) {
  const T=ctx.THREE;
  if(!materials.has(finish)) materials.set(finish,new T.MeshStandardMaterial({
    map:finishMap(T,finish), roughness:finish==='stone'?.56:.93,
    polygonOffset:true, polygonOffsetFactor:-3, polygonOffsetUnits:-4
  }));
  const group=new T.Group();
  const geometry=new T.PlaneGeometry(2,2,6,6).rotateX(-Math.PI/2);
  const pos=geometry.attributes.position;
  const y=height(x,z);
  for(let i=0;i<pos.count;i++) pos.setY(i,height(x+pos.getX(i),z+pos.getZ(i))-y+.022);
  geometry.computeVertexNormals();
  const top=new T.Mesh(geometry,materials.get(finish)); top.layers.set(1); top.receiveShadow=true;group.add(top);
  if(finish==='border'){
    const leaf=new T.IcosahedronGeometry(1,0), green=ctx.mats.toon(0x81976a);
    const clumps=new T.InstancedMesh(leaf,green,16), dummy=new T.Object3D();
    for(let i=0;i<16;i++){
      const dx=(i%4-1.5)*.46+.06*Math.sin(i), dz=(Math.floor(i/4)-1.5)*.46;
      dummy.position.set(dx,height(x+dx,z+dz)-y+.12,dz); dummy.scale.set(.24,.16+.05*Math.cos(i),.22);
      dummy.rotation.y=i*2.4;dummy.updateMatrix();clumps.setMatrixAt(i,dummy.matrix);
    }
    clumps.receiveShadow=clumps.castShadow=true;clumps.layers.set(1);group.add(clumps);
  }
  group.position.set(x,y,z);
  return {group,dispose(){group.removeFromParent();geometry.dispose();for(const n of group.children)if(n.isInstancedMesh){n.geometry.dispose();n.dispose();}}};
}

export function buildQuay(ctx:any) {
  const T=ctx.THREE, root=new T.Group();root.name='props-book-quay';
  const stone=ctx.mats.toon(0x95a59e),wood=ctx.mats.toon(0x785e49);
  function block(mat:any,x:number,y:number,z:number,w:number,h:number,d:number) {
    const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat); m.position.set(x,y,z);
    m.receiveShadow=m.castShadow=true;root.add(m);
  }
  // The paved court is painted directly into the valley floor.
  const wet={value:ctx.weather.rain};
  const base=ctx.scene.getObjectByName('ground-harbor');
  base?.traverse((mesh:any)=>{
    if(!mesh.isMesh || Array.isArray(mesh.material) || mesh.material.transparent)return;
    const source=mesh.material, mat=source.clone(), original=source.onBeforeCompile;
    mat.onBeforeCompile=(shader:any,renderer:any)=>{
      original.call(source,shader,renderer);
      shader.uniforms.quayStone={value:finishMap(T,'stone')};shader.uniforms.quayRain=wet;
      shader.vertexShader='varying vec3 vQuayPoint;\n'+shader.vertexShader.replace('#include <project_vertex>',
        '#include <project_vertex>\n vQuayPoint=(modelMatrix*vec4(transformed,1.)).xyz;');
      shader.fragmentShader='varying vec3 vQuayPoint; uniform sampler2D quayStone; uniform float quayRain;\n'+shader.fragmentShader.replace('#include <color_fragment>',`
        #include <color_fragment>
        vec2 q=vQuayPoint.xz-vec2(10.,17.);
        float r=length(q); float area=(1.-smoothstep(9.63,9.68,r))*(1.-smoothstep(.03,.08,abs(vQuayPoint.y)));
        vec3 stone=texture2D(quayStone,vQuayPoint.xz*.36).rgb;
        float trim=max(1.-smoothstep(.06,.08,abs(r-9.48)),1.-smoothstep(.025,.05,abs(r-8.98)));
        float mid=1.-smoothstep(.035,.06,abs(r-1.5));
        stone=mix(stone,vec3(.19,.26,.23),trim*.88);
        stone=mix(stone,vec3(.59,.48,.26),mid);
        diffuseColor.rgb=mix(diffuseColor.rgb,stone*(1.-.12*quayRain),area);`);
    };
    mat.customProgramCacheKey=()=>source.customProgramCacheKey()+'-book-quay';
    mesh.material=mat;
  });
  for(let z=nativeLane.firstZ;z<=nativeLane.lastZ;z+=2)
    root.add(groundTile(ctx,'stone',nativeLane.x,z,(x,zz)=>inland(x,zz)).group);
  // Limewashed garden walls frame the skyline behind the doors. The circular
  // openings go through the full wall thickness, with a single continuous coping.
  const lime=ctx.mats.toon(0xe3dfce),tile=ctx.mats.toon(0x506760);
  const wall=(x:number,z:number,yaw:number,length:number)=>{
    const frame=new T.Group();frame.position.set(x,0,z);frame.rotation.y=yaw;root.add(frame);
    const outline=new T.Shape();outline.moveTo(-length/2,.18);outline.lineTo(length/2,.18);
    outline.lineTo(length/2,1.84);outline.lineTo(-length/2,1.84);outline.closePath();
    const opening=new T.Path();opening.absarc(0,1.15,.48,0,Math.PI*2,true);outline.holes.push(opening);
    const slab=new T.Mesh(new T.ExtrudeGeometry(outline,{depth:.24,bevelEnabled:false}),lime);
    slab.position.z=-.12;frame.add(slab);
    for(const [w,h,d,y,mat] of [[length+.12,.19,.37,.095,stone],[length+.24,.14,.43,1.91,tile]] as const){
      const rail=new T.Mesh(new T.BoxGeometry(w,h,d),mat);rail.position.y=y;frame.add(rail);
    }
    frame.traverse((n:any)=>{if(n.isMesh)n.receiveShadow=n.castShadow=true;});
  };
  wall(20.6,12.2,-1.13,3.75);wall(21.45,17.3,-Math.PI/2,4.35);wall(20.45,22.6,-1.99,3.6);
  function garden(x:number,z:number,width:number,depth:number){
    block(stone,x,.18,z,width,.36,depth);
    block(ctx.mats.toon(0x708768),x,.41,z,width-.12,.10,depth-.12);
    const shrub=new T.IcosahedronGeometry(1,0), mat=ctx.mats.toon(0x839b74);
    for(let i=0;i<5;i++){
      const bush=new T.Mesh(shrub,mat);
      bush.position.set(x+(i-2)*width*.15,.56+Math.sin(i)*.06,z+Math.sin(i*2)*depth*.15);
      bush.scale.set(width*.18,.26+i%2*.15,depth*.37);bush.rotation.y=i;bush.castShadow=true;
      bush.receiveShadow=true;root.add(bush);
    }
  }
  garden(2.2,11.3,3.45,1.5);garden(2.2,23.6,2.7,1.1);
  garden(22.7,12.8,2.3,1.1);garden(22.4,29.5,2.5,1.1);
  const pavilion=spawnPackModel(T,'pack-pavilion',quayPavilion.width,{castShadow:true,outline:false});
  pavilion.group.position.set(quayPavilion.x,0,quayPavilion.z);root.add(pavilion.group);
  for(const [id,x,z,width] of [['nature-willow',-.4,25.5,4.5],['nature-bamboo',.7,30.3,2.2],
    ['nature-willow',2.2,11.3,4.6],['nature-willow',24.8,12.2,5.0],
    ['nature-bamboo',25.4,17.2,3.3],['nature-bamboo',25.4,23.3,3.6],
    ['nature-willow',24.7,28.8,4.5],
    ['waterside-shore-stones',-9,9.5,2.1],['waterside-reeds',-8.4,9.1,1.25]] as const) {
    const plant=spawnPackModel(T,id,width,{castShadow:true,outline:false});
    plant.group.position.set(x,Math.max(-.49,inland(x,z)),z);root.add(plant.group);
  }
  const shapes=ctx.puddles.map((patch:any)=>{
    const shape=new T.Shape();
    for(let i=0;i<=40;i++){
      const a=i/40*Math.PI*2,r=1+.10*Math.sin(a*3)+.06*Math.cos(a*5);
      const dx=Math.cos(a)*patch.rx*r,dz=Math.sin(a)*patch.rz*r,c=Math.cos(patch.rot),s=Math.sin(patch.rot);
      const x=patch.x+dx*c+dz*s,y=-(patch.z-dx*s+dz*c);
      if(!i)shape.moveTo(x,y);else shape.lineTo(x,y);
    }
    return shape;
  });
  const puddles=valleyWater(ctx,new T.ShapeGeometry(shapes),0,.018,0);
  puddles.material.transparent=true;puddles.material.depthWrite=false;
  puddles.material.uniforms.wetness=wet;
  puddles.material.fragmentShader='uniform float wetness;\n'+puddles.material.fragmentShader.replace('#include <tonemapping_fragment>','gl_FragColor.a=.14+.53*wetness;\n#include <tonemapping_fragment>');
  puddles.material.polygonOffset=true;puddles.material.polygonOffsetFactor=-2;puddles.material.polygonOffsetUnits=-2;
  root.add(puddles);
  ctx.onUpdate(()=>{wet.value=ctx.weather.rain;});
  ctx.scene.add(root);
}
