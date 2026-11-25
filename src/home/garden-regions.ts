import {gardenLayouts} from '../world/linqi/scene-designs.js';
import {createRoadCoverage} from '../world/linqi/road-coverage.js';
import {BUILD_ITEMS, propCollisionParts} from './build-catalog';
import {spawnPackModel} from './model-pack';
import {inland,LAKE} from '../world/map';
import {riverLevel} from './waterway';
import {valleyWater} from '../zones/lake-water';
import type {PlacedProp} from '../life/state';
import type {Box} from '../slime/types';

type Spot=[id:string,x:number,z:number,width:number,yaw?:number];
const scale=1.22;
const aliases:Record<string,string>={'water-stilt':'waterside-stilt-house',willow:'nature-willow',reeds:'waterside-reeds',
  'water-lily':'waterside-lily','shore-stones':'waterside-shore-stones',rock:'tidal-rocks',mallard:'fauna-mallard'};
const lanes=gardenLayouts.canal.strokes.filter(([id])=>id==='stonepath'||id==='dirtpath').map(([type,points,w])=>({
  type,p:points.map(([x,z])=>[-6+x*scale,-5+z*scale]),w:w*scale,
}));
export const gardenRoads=createRoadCoverage([...lanes,
  {type:'stonepath',p:[[-17,0],[-18,8],[-14,16],[-7,21],[1,19],[10,17]],w:1.8},
  {type:'stonepath',p:[[2,17],[6,21],[8,24],[8,34]],w:2},
  {type:'dirtpath',p:[[-27,5],[-19,3],[-15,-3]],w:1.9},
  {type:'dirtpath',p:[[17,13],[21,6],[20,-6],[15,-15],[13,-23]],w:1.65}
]);

const canal:Spot[]=[];
for(const [name,lx,lz,ratio,yaw] of gardenLayouts.canal.objects){
  const id=aliases[name]??name;
  if(name==='lantern'||name==='mallard')continue;
  const def=BUILD_ITEMS[id];
  const width=name==='build-covered-bridge'?10.8:(def?.width??1.5)*ratio*1.35;
  canal.push([id,-6+lx*scale,-5+lz*scale,width,yaw]);
}
const scenery:Record<string,Spot[]>={
  harbor:[...canal,['build-teahall',19,-9,6.1,-.9],['build-huizhou',24,-2,5,-1.2],
    ['pack-pavilion',13,-23,4],['pack-ginkgo',11,-21,3.8],['build-red-pagoda',-21,-21,5.1,.3],
    ['nature-bamboo',-19,-18,3.4],['nature-willow',-11,12,4.6],['waterside-reeds',-9,14,1.5],
    ['build-huizhou',-21,16,5.7,.27],['nature-wisteria',-23,12,3.3],['nature-bamboo',25,8,3.6]],
  park:[['pack-windmill',20,64,5.5,Math.PI],['pack-pavilion',-18,59,4.5,.6],['nature-wisteria',-21,57,3],['build-moon-gate',2,77,3.9],
    ['nature-bamboo',5,77,2.9],['pack-ginkgo',-8,72,3.7],['build-teahall',23,54,4.9,-1.4]],
  lake:[['waterside-stilt-house',-19,102,5.9,.8],['build-teahall',-22,98,5.5,-.4],
    ['pack-pavilion',20,123,4.3,-.6],['nature-willow',18,121,4.2],['nature-willow',-16,102,4.8],
    ['waterside-reeds',-15,104,2],['waterside-lily',-11,104,1.8],['nature-wisteria',20,130,3.2],
    ['nature-willow',-12,99,4.5,.4],['nature-willow',14,98,4.8,-.2],['nature-willow',20,101,3.7,.8],
    ['waterside-reeds',15.7,101.8,2.2],['waterside-shore-stones',17.8,101.9,2.8],
    ['waterside-lily',12.8,101.3,1.7],['waterside-reeds',-3.8,98.5,2.2],['waterside-shore-stones',-5.6,99,2.4]],
  farm:[['pack-greenhouse',-46,26.8,4.1,.2],['pasture-shelter',-55,26.6,4.2],['nature-bamboo',-51,28.1,3.1],
    ['build-huizhou',-72,18,5.5,.15],['pack-ginkgo',-76,20,4],['watermill',-90,-16,5.7,.8],
    ['build-thatch',-91,-23,4],['nature-willow',-86,-19,3.3]],
  forest:[['pasture-shelter',-54,75,4.6,.4],['nature-fern',-53,78,2.4],['nature-bamboo',-49,70,3.6],
    ['nature-bamboo',-48,74,4],['nature-bamboo',-52,72,3.3],['build-moon-gate',-92,102,3.5,1.2],
    ['pack-ginkgo',-94,99,4],['nature-wisteria',-89,104,3.4],['waterside-shore-stones',-98,108,3.9]],
};
export function buildGardenRegions(ctx:any,roots:any[],occupied:{x:number;z:number}[]){
  const T=ctx.THREE,boxes:Box[]=[], footprints:PlacedProp[]=[];
  for(const [id,spots] of Object.entries(scenery)){
    const root=roots.find(r=>r.name==='zone-'+id);
    for(const [asset,x,z,width,yaw=0] of spots){
      if(occupied.some(p=>Math.hypot(x-p.x,z-p.z)<width*.58+1))continue;
      const def=BUILD_ITEMS[asset];
      const bridge=asset==='build-covered-bridge';
      const aquatic=/lily|reeds|mallard/.test(asset);
      const ground=inland(x,z),y=bridge?-.1:aquatic?Math.max(ground,id==='lake'?LAKE.level:riverLevel):ground;
      const model=spawnPackModel(T,asset,width,{outline:false,castShadow:width>1.6});
      model.group.position.set(x,y,z);model.group.rotation.y=yaw;model.group.name='garden-'+asset;root.add(model.group);
      if (def?.solid) {
        const prop = {id:`native-${id}-${asset}-${x}-${z}`,itemId:asset,x,y,z,yaw,scale:width/Math.max(def.width,def.depth)};
        footprints.push(prop);
        if (bridge) boxes.push({name:'covered-footbridge',min:[x-width*.49,-.48,z-1.02],max:[x+width*.49,.17,z+1.02],camera:false});
        else boxes.push(...propCollisionParts(prop));
      }
    }
  }
  const river=valleyWater(ctx,new T.PlaneGeometry(19,54),-7.5,riverLevel,-4);ctx.scene.add(river);
  // Low silhouettes layer the horizon without procedural buildings on the sky itself.
  const mount=new T.Group();mount.name='garden-distant-ridges';mount.userData.walkThrough=true;
  for (let layer=0;layer<2;layer++) {
    const vertices:number[]=[], indices:number[]=[];
    for (let i=0;i<=144;i++) {
      const a=(i%144)*Math.PI/72, r=118+layer*25+5*Math.sin(3*a+.4);
      const x=r*Math.cos(a), z=(r+21)*Math.sin(a);
      const y=5+layer*5+3*Math.sin(5*a+layer)+2.6*Math.sin(9*a+1.3*layer)+1.7*Math.cos(17*a+layer);
      vertices.push(x,-9,z,x,y,z);
      if (i) {const j=(i-1)*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
    }
    const geom=new T.BufferGeometry();
    geom.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    geom.setIndex(indices);
    const ridge=new T.Mesh(geom,new T.MeshBasicMaterial({color:layer?0xa9bbb5:0x93aaa0,side:T.DoubleSide}));
    ridge.layers.set(1);mount.add(ridge);
  }
  // The silhouette belongs to the sky. Keep it beyond purchased plots as the world grows.
  ctx.scene.add(mount);
  ctx.onUpdate(()=>mount.position.set(ctx.camera.position.x,0,ctx.camera.position.z));
  return {boxes,footprints};
}
