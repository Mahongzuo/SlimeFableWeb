import type {Box} from '../slime/types';
import {propCollisionParts,BUILD_ITEMS} from './build-catalog';
import {climateMaterial} from './climate-material';
import {spawnPackModel} from './model-pack';
import {valleyWater} from '../zones/lake-water';
import {inland} from '../world/map';
import type {GroundFinish} from '../life/state';

import {quayPavilion} from './layout';
const finishMaps = new Map<GroundFinish, any>();

/** Tile joints and moss are painted into one surface, including the stone margins. */
function finishMap(T: any, finish: GroundFinish) {
  if (finishMaps.has(finish)) return finishMaps.get(finish);
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const stone = finish === 'stone', planted = finish === 'border';
  g.fillStyle = stone ? '#9e9b89' : planted ? '#76836a' : '#ad9675';
  g.fillRect(0, 0, 256, 256);
  let seed = 491;
  const rand = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  if (stone) {
    // Warm sunlit limestone ashlar slabs harmonized with Voronoi flagstones (zero greenish tint!)
    const shades = ['#dbd3bf','#d1c8b3','#e2dac8','#cbc3af','#d6cdb8'];
    for (let row = 0; row < 5; row++) {
      const y = row * 51.2;
      for (let col = -1; col < 3; col++) {
        g.fillStyle = shades[Math.floor(rand()*shades.length)];
        g.fillRect(col*128 + (row%2)*64+1.5,y+1.5,125,48.2);
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
function createFeatheredTileMaterial(T: any, finish: GroundFinish) {
  const mat = new T.MeshStandardMaterial({
    map: finishMap(T, finish),
    roughness: finish === 'stone' ? 0.58 : 0.92,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -4,
  });
  climateMaterial(mat, 'terrain');
  const prevCompile = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey() : 'tile';
  mat.onBeforeCompile = (shader: any, renderer: any) => {
    if (prevCompile) prevCompile.call(mat, shader, renderer);
    shader.vertexShader = 'varying vec3 vTileW; varying vec2 vTileUv;\n' +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n vTileW = (modelMatrix * vec4(transformed, 1.0)).xyz; vTileUv = uv;',
      );
    const featherSnippet = `
      // Organic noise-feathered edge + soft damp earth rim so player paving blends naturally into turf
      vec2 edgeD = abs(vTileUv - 0.5) * 2.0;
      float boxD = max(edgeD.x, edgeD.y);
      float n1 = sin(vTileW.x * 3.8 + sin(vTileW.z * 3.1)) * 0.5 + 0.5;
      float n2 = cos(vTileW.z * 7.4 - vTileW.x * 5.9) * 0.5 + 0.5;
      float nEdge = (n1 * 0.65 + n2 * 0.35 - 0.5) * 0.16;
      float alphaMask = 1.0 - smoothstep(0.76 + nEdge, 0.99 + nEdge * 0.5, boxD);
      float dampRim = smoothstep(0.64 + nEdge, 0.88 + nEdge, boxD);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.74, 0.70, 0.58), dampRim * 0.52);
      diffuseColor.a *= alphaMask;
      if (diffuseColor.a < 0.03) discard;`;
    shader.fragmentShader = 'varying vec3 vTileW; varying vec2 vTileUv;\n' +
      shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + featherSnippet);
  };
  mat.customProgramCacheKey = () => prevKey + `-feathered-tile-${finish}-v1`;
  return mat;
}

export function groundTile(ctx:any, finish:GroundFinish, x:number,z:number, height:(x:number,z:number)=>number) {
  const T=ctx.THREE;
  if(!materials.has(finish)) materials.set(finish, createFeatheredTileMaterial(T, finish));
  const group=new T.Group();
  const geometry=new T.PlaneGeometry(2.12,2.12,6,6).rotateX(-Math.PI/2);
  const pos=geometry.attributes.position;
  const y=height(x,z);
  for(let i=0;i<pos.count;i++) pos.setY(i,height(x+pos.getX(i),z+pos.getZ(i))-y+.016);
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
  const treeBoxes:Box[]=[];
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
      const quaySnippet = `
        vec2 q=vQuayPoint.xz-vec2(10.,17.);
        float r=length(q);
        float area=(1.-smoothstep(9.55,9.72,r))*(1.-smoothstep(.03,.08,abs(vQuayPoint.y)));
        vec3 stone=texture2D(quayStone,vQuayPoint.xz*.36).rgb;
        float trim=max(1.-smoothstep(.06,.085,abs(r-9.48)),1.-smoothstep(.025,.055,abs(r-8.98)));
        float mid=1.-smoothstep(.035,.06,abs(r-1.5));
        stone=mix(stone,vec3(.30,.36,.32),trim*.78);
        stone=mix(stone,vec3(.74,.62,.36),mid);
        diffuseColor.rgb=mix(diffuseColor.rgb,stone*(1.-.12*quayRain),area);`;
      const anchor = shader.fragmentShader.includes('// __TERRAIN_SPLAT_END__') ? '// __TERRAIN_SPLAT_END__' : '#include <color_fragment>';
      shader.fragmentShader='varying vec3 vQuayPoint; uniform sampler2D quayStone; uniform float quayRain;\n'+shader.fragmentShader.replace(anchor, anchor + '\n' + quaySnippet);
    };
    mat.customProgramCacheKey=()=>source.customProgramCacheKey()+'-book-quay-v2';
    mesh.material=mat;
  });
  // Limewashed garden walls frame the skyline behind the doors. The circular
  // openings go through the full wall thickness, with a single continuous coping.
  // Exact 3D OBB colliders match the curb, pierced piers around the moon hole, lintel & top coping
  // (skipped from 2.5D heightfield bake so the opening never drops the coping height!).
  const lime=ctx.mats.toon(0xe3dfce),tile=ctx.mats.toon(0x506760);
  const wall=(x:number,z:number,yaw:number,length:number,wallIdx:number)=>{
    const frame=new T.Group();frame.position.set(x,0,z);frame.rotation.y=yaw;frame.userData.skipHeightBake=true;root.add(frame);
    const outline=new T.Shape();outline.moveTo(-length/2,.18);outline.lineTo(length/2,.18);
    outline.lineTo(length/2,1.84);outline.lineTo(-length/2,1.84);outline.closePath();
    const opening=new T.Path();opening.absarc(0,1.15,.48,0,Math.PI*2,true);outline.holes.push(opening);
    const slab=new T.Mesh(new T.ExtrudeGeometry(outline,{depth:.24,bevelEnabled:false}),lime);
    slab.position.z=-.12;frame.add(slab);
    for(const [w,h,d,y,mat] of [[length+.12,.19,.37,.095,stone],[length+.24,.14,.43,1.91,tile]] as const){
      const rail=new T.Mesh(new T.BoxGeometry(w,h,d),mat);rail.position.y=y;frame.add(rail);
    }
    frame.traverse((n:any)=>{if(n.isMesh)n.receiveShadow=n.castShadow=true;});
    // Single clean oriented solid collider per garden wall: avoids multi-layer pier/coping ledge traps
    // that previously caused heavy fluid draping and high particle-mesh rebuild cost.
    const w = length + .16, d = .36;
    treeBoxes.push({name:`quay-wall-${wallIdx}`,min:[x-w/2,0,z-d/2],max:[x+w/2,1.98,z+d/2],yaw,camera:true});
  };
  wall(20.6,12.2,-1.13,3.75,0);wall(21.45,17.3,-Math.PI/2,4.35,1);wall(20.45,22.6,-1.99,3.6,2);
  let gardenIdx=0;
  function garden(x:number,z:number,width:number,depth:number){
    const idx=gardenIdx++;
    const gGroup=new T.Group();gGroup.userData.skipHeightBake=true;root.add(gGroup);
    const addPlanter=(mat:any,px:number,py:number,pz:number,w:number,h:number,d:number)=>{
      const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(px,py,pz);m.receiveShadow=m.castShadow=true;gGroup.add(m);
    };
    addPlanter(stone,x,.18,z,width,.36,depth);
    addPlanter(ctx.mats.toon(0x708768),x,.41,z,width-.12,.10,depth-.12);
    treeBoxes.push({name:`quay-planter-${idx}-curb`,min:[x-width/2,0,z-depth/2],max:[x+width/2,.36,z+depth/2],camera:false});
    treeBoxes.push({name:`quay-planter-${idx}-soil`,min:[x-(width-.12)/2,.36,z-(depth-.12)/2],max:[x+(width-.12)/2,.46,z+(depth-.12)/2],camera:false});
    const shrub=new T.IcosahedronGeometry(1,0), mat=ctx.mats.toon(0x839b74);
    for(let i=0;i<5;i++){
      const bush=new T.Mesh(shrub,mat);
      bush.position.set(x+(i-2)*width*.15,.56+Math.sin(i)*.06,z+Math.sin(i*2)*depth*.15);
      bush.scale.set(width*.18,.26+i%2*.15,depth*.37);bush.rotation.y=i;bush.castShadow=true;
      bush.receiveShadow=true;bush.userData.walkThrough=true;gGroup.add(bush);
    }
  }
  garden(2.2,11.3,3.45,1.5);garden(2.2,23.6,2.7,1.1);
  garden(22.7,12.8,2.3,1.1);garden(22.4,29.5,2.5,1.1);
  const pavilion=spawnPackModel(T,'pack-pavilion',quayPavilion.width,{castShadow:true,outline:false});
  pavilion.group.position.set(quayPavilion.x,0,quayPavilion.z);root.add(pavilion.group);
  const pavDef=BUILD_ITEMS['pack-pavilion'];
  if(pavDef?.solid){
    treeBoxes.push(...propCollisionParts({
      id:'quay-pavilion',itemId:'pack-pavilion',
      x:quayPavilion.x,y:0,z:quayPavilion.z,yaw:0,
      scale:quayPavilion.width/Math.max(pavDef.width,pavDef.depth),
    }));
  }
  for(const [id,x,z,width] of [['nature-willow',-.4,25.5,4.5],['nature-bamboo',.7,30.3,2.2],
    ['nature-willow',2.2,11.3,4.6],['nature-willow',24.8,12.2,5.0],
    ['nature-bamboo',25.4,17.2,3.3],['nature-bamboo',25.4,23.3,3.6],
    ['nature-willow',24.7,28.8,4.5],
    ['waterside-shore-stones',-9,9.5,2.1],['waterside-reeds',-8.4,9.1,1.25]] as const) {
    const plant=spawnPackModel(T,id,width,{castShadow:true,outline:false});
    plant.group.position.set(x,Math.max(-.49,inland(x,z)),z);root.add(plant.group);
    const def=BUILD_ITEMS[id];
    if(def?.solid)treeBoxes.push(...propCollisionParts({id:'quay-'+x+'-'+z,itemId:id,
      x,y:plant.group.position.y,z,yaw:0,scale:width/Math.max(def.width,def.depth)}));
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
  ctx.onUpdate(()=>{wet.value=ctx.weather.wet??ctx.weather.rain;});
  ctx.scene.add(root);
  return treeBoxes;
}
