import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {preserveLayout,preserveHeight,preserveRects,type PreserveRect} from '../world/expansion';
import {landscapeAssetUrl} from './architecture-assets';
import {meadowGroundMaterial,sampleInlandGrassColor} from '../world/terrain-mesh';
import {animalWaterHeight,waterBirdAnchor} from './preserve-water';
import {disturbAnimalWater} from './water-waves';
import {valleyWater} from '../zones/lake-water';
import {climateMaterial} from './climate-material';
import {detailAt,detailMaterial,PreserveImpostors,WildlifeLod,type Impostor,type PlantPose} from './foliage/preserve-lod';
import {pathEdge,trailX,makeBoardwalk,makeTrailFence} from './preserve-trails';
import {collectTerritoryRects,combinedHeightWithRects} from '../world/island-coast';
import {SEA_LEVEL} from './layout';
import type {Box} from '../slime/types';
import {habitats,habitatPatch,preserveCover,prepareCanopyMaterial} from './foliage/preserve-habitat';
import {RANCH_SPECIES_MAP, interactWildEncounter} from '../life/ranch';
import {ITEMS} from '../life/catalog';
import {type LifeData} from '../life/state';
import {changeShells} from '../life/shell-wallet';
import {isBuildItemUnlocked} from '../life/unlocks';
import {cottageData} from './homestead';
import {makeEncounterMotes, makeMoteTexture} from './encounter-motes';
import {rng} from '../templates/random';
import type {Interactable} from '../zones/types';
import type {FluidVolume,GroundSurface} from '../slime/world';

export const plantChoices=[['nature-fern','林下蕨'],['nature-bamboo','青竹'],['nature-wisteria','紫藤']] as const;
const canopy=new Set(['redwood-tree','nature-bamboo','nature-willow']);
type GrovePlan={asset:string;poses:PlantPose[];sprites?:Impostor[]};
type GroveUpdate=(camera:T.Vector3,dt:number)=>void;
interface GroveStreaming {updates:GroveUpdate[];materials:Set<T.Material>}
function retirePlants(group:T.Group){
  group.userData.retired=true;
  const materials=new Set<T.Material>(),textures=new Set<T.Texture>();
  group.traverse(o=>{
    if(!(o instanceof T.Mesh))return;
    if(o instanceof T.InstancedMesh)o.dispose();
    if(o.userData.cachedPlant)return;
    o.geometry.dispose();
    for(const m of Array.isArray(o.material)?o.material:[o.material]){
      materials.add(m);if(m.map)textures.add(m.map);
    }
  });
  materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.removeFromParent();
}

const native=new Set(['redwood-tree','reeds','cattails','moss-patch','meadow-patch','grass-tuft','tall-grass']);
const plants=new Map<string,Promise<T.Group>>();
const plantLoader=new GLTFLoader();
const breeze={value:0},wind={value:.35},windMaterials=new WeakSet<T.Material>();
function sway(mat:T.Material){
 if(windMaterials.has(mat))return;windMaterials.add(mat);
 const old=mat.onBeforeCompile, key=mat.customProgramCacheKey();
 mat.onBeforeCompile=function(shader:any,renderer:any){old.call(this,shader,renderer);shader.uniforms.preserveTime=breeze;shader.uniforms.preserveWind=wind;
   shader.vertexShader='uniform float preserveTime,preserveWind;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
     #ifdef USE_INSTANCING
     transformed.x+=max(0.,position.y)*(.033+.09*preserveWind)*sin(preserveTime*1.6+instanceMatrix[3].x*.64+instanceMatrix[3].z*.19);
     #endif`);};
 mat.customProgramCacheKey=()=>key+'-wind';
}
async function grove(root:T.Group,id:string,poses:PlantPose[],stream?:GroveStreaming,sprites?:Impostor[]) {
  let p=plants.get(id);
  if(!p){p=plantLoader.loadAsync(native.has(id)?'/models/companions/'+id+'.glb':landscapeAssetUrl(id,'glb')).then(g=>g.scene) as Promise<T.Group>;plants.set(id,p);}
  let scene:T.Group;
  try{scene=await p;}catch(error){if(plants.get(id)===p)plants.delete(id);console.warn('Preserve plant unavailable',id,error);return;}
  if(root.userData.retired||!poses.length)return;
  scene.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(scene),center=box.getCenter(new T.Vector3()),h=Math.max(.01,box.max.y-box.min.y);
  const pose=new T.Object3D(),centered=new T.Matrix4().makeTranslation(-center.x,-box.min.y,-center.z),matrix=new T.Matrix4();
  const batches:{mesh:T.InstancedMesh;matrices:T.Matrix4[];cones:boolean}[]=[];
  const copies=new Map<T.Material,T.Material>(),interval={value:new T.Vector2(0,1)};
  const copy=(m:T.Material)=>{
    if(!stream)return m;
    let c=copies.get(m);if(!c){c=detailMaterial(m,interval,true);copies.set(m,c);stream.materials.add(c);}return c;
  };
  scene.traverse(obj=>{
    const m=obj as T.Mesh;if(!m.isMesh)return;
    for(const mat of Array.isArray(m.material)?m.material:[m.material]){
      prepareCanopyMaterial(id,mat);
      climateMaterial(mat,'leaves');
      if(['grass-tuft','tall-grass','meadow-patch','reeds','cattails','nature-bamboo'].includes(id))sway(mat);
    }
    const batch=new T.InstancedMesh(m.geometry,Array.isArray(m.material)?m.material.map(copy):copy(m.material),poses.length);
    batch.name='grove-'+id;batch.userData.cachedPlant=true;
    const matrices:T.Matrix4[]=[];
    poses.forEach((v,i)=>{
      pose.position.set(v.x,v.y,v.z);pose.scale.setScalar(v.height/h);pose.rotation.y=v.yaw;pose.updateMatrix();
      matrix.copy(pose.matrix).multiply(centered).multiply(m.matrixWorld);batch.setMatrixAt(i,matrix);if(stream)matrices.push(matrix.clone());
    });
    batch.receiveShadow=true;batch.computeBoundingSphere();root.add(batch);
    if(stream){batch.count=0;batch.visible=false;batches.push({mesh:batch,matrices,cones:id==='redwood-tree'&&m.name==='Cones'});}
  });
  if(!stream)return;
  const near=sprites?27:14,far=sprites?55:36,color=new T.Color();
  let age=0,lastX=Infinity,lastZ=Infinity;
  stream.updates.push((cam,dt)=>{
    if(age===1&&Math.hypot(cam.x-lastX,cam.z-lastZ)<.32)return;
    lastX=cam.x;lastZ=cam.z;age=Math.min(1,age+dt*1.65);
    for(const {mesh} of batches)mesh.count=0;
    for(let i=0;i<poses.length;i++){
      const p=poses[i],distance=Math.hypot(cam.x-p.x,cam.z-p.z),weight=age*detailAt(distance,near,far);
      if(sprites)sprites[i].weight=1-weight;
      if(weight<=.001)continue;
      for(const {mesh,matrices,cones} of batches){
        const coverage=cones?weight*detailAt(distance,9,16):weight;
        if(coverage<=.001)continue;
        color.setRGB(coverage,1,1);
        mesh.setMatrixAt(mesh.count,matrices[i]);mesh.setColorAt(mesh.count++,color);
      }
    }
    for(const {mesh} of batches){mesh.visible=mesh.count>0;if(mesh.visible){mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor!.needsUpdate=true;}}
  });
}
type Live={id:string;key:string;model:WildlifeLod;r:PreserveRect;motes:ReturnType<typeof makeEncounterMotes>;x:number;z:number;baseX:number;baseZ:number;phase:number;contact:number;step:number;flying:boolean};
const plantPalettes:Record<string,[string,number,number][]> = {
 redwoods:[['redwood-tree',31,24],['nature-fern',62,.8],['moss-patch',16,.27],['tidal-rocks',5,1.4]],
 prairie:[['tall-grass',58,.8],['meadow-patch',17,.24],['tidal-rocks',5,.77]],
 marsh:[['nature-willow',7,5.8],['reeds',92,1.24],['cattails',68,1.43],['waterside-lily',18,.19]],
 bamboo:[['nature-bamboo',41,6.4],['nature-fern',32,.7],['waterside-shore-stones',11,.76]],
 alpine:[['redwood-tree',11,8],['tidal-rocks',16,1.75],['meadow-patch',42,.32]],
};
export class BiomePreserves {
 readonly boxes:Box[]=[];
 readonly fluids:FluidVolume[]=[];
 readonly root=new T.Group();surfaces:GroundSurface[]=[];rects:PreserveRect[]=[];
 private chunks=new Map<string,T.Group>();private wildlife:Live[]=[];private signature='!';private plantsRoot=new T.Group();
 private layouts=new Map<string,GrovePlan[]>();private horizon?:PreserveImpostors;
 private fields:(()=>void)[]=[];
 private plotSites:{r:PreserveRect;i:number;name:string;x:number;z:number}[]=[];
 private mote=makeMoteTexture();private time=0;
 constructor(private ctx:any,private life:LifeData,private save:()=>void,private toast:(s:string)=>void){ctx.scene.add(this.root);this.sync();}
 sync(){
   const tiles=this.life.home?.expansions??[],sig=tiles.map(t=>t.id).join(',');
   if(sig===this.signature)return;this.signature=sig;
   for(const id of [...this.chunks.keys()])this.unload(id);
   this.fields.splice(0).forEach(remove=>remove());this.horizon?.dispose();this.layouts.clear();
   for(const a of this.wildlife){a.model.dispose();a.motes.dispose();}this.wildlife=[];
   for(const o of [...this.root.children]){if(o.name==='北岸木栏')retirePlants(o as T.Group);o.userData.releaseWater?.();if(o instanceof T.Mesh)o.geometry.dispose();}
   this.root.clear();this.root.add(this.plantsRoot);this.rects=preserveRects(tiles);
   const layout=preserveLayout(tiles);
   this.plotSites=this.rects.filter(r=>r.biome!=='trail').flatMap(r=>[-1,1].map((side,i)=>({r,i,
     name:(layout.find(z=>z.id===r.biome)?.name??'')+' · '+(i?'东坡':'西坡'),
     x:(r.minX+r.maxX)/2+side*11,z:r.minZ+8})));
   this.surfaces=[];this.fluids.length=0;
   this.boxes.length=0;const territory=collectTerritoryRects(tiles);
   const silhouettes:Impostor[]=[];
   for(const r of this.rects){
     const biome=habitats[r.biome];
     if(r.biome==='trail'){
       const height=(x:number,z:number)=>combinedHeightWithRects(x,z,territory);
       const otherLand=territory.filter(t=>t.biome!=='trail');
       const cover=(x:number,z:number)=>otherLand.some(t=>x>=t.minX&&x<t.maxX&&z>=t.minZ&&z<t.maxZ)?0:
         preserveCover(r,x,z)*T.MathUtils.smoothstep(height(x,z),SEA_LEVEL+.16,SEA_LEVEL+.64);
       this.fields.push(this.ctx.grassField.addPreserve(r,this.root,height,cover,14));
       const fence=makeTrailFence(r);this.root.add(fence.root);this.boxes.push(...fence.boxes);
     }else if(biome){
       this.fields.push(this.ctx.grassField.addPreserve(r,this.root));
       this.planGroves(r,silhouettes);
       this.herd(r,layout.find(zone=>zone.id===r.biome)!.animals,silhouettes);
     }
     const w=r.maxX-r.minX,d=r.maxZ-r.minZ,n=Math.ceil(w/.70),m=Math.ceil(d/.70);
     const geo=new T.PlaneGeometry(w,d,n,m);geo.rotateX(-Math.PI/2);geo.translate((r.minX+r.maxX)/2,0,(r.minZ+r.maxZ)/2);
     const pos=geo.attributes.position, colors:number[]=[],values:number[]=[],splat:number[]=[];
     const def=preserveLayout(tiles).find(a=>a.id===r.biome);
     const base=new T.Color(def?.color??0xc1a379),rock=new T.Color(0x95968b),snow=new T.Color(0xe3e9df),sod=new T.Color(0x97aa65);
     const shade=new T.Color(biome?.ground[0]??base),sunlit=new T.Color(biome?.ground[1]??sod),silt=new T.Color(0x797054);
     const nativeTurf=new T.Color(),tint=new T.Color();
     for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),y=preserveHeight(r,x,z);pos.setY(i,y);values.push(y);
       const wear=1-T.MathUtils.smoothstep(pathEdge(r,x,z),-.4,.57);
       splat.push(-wear*(.73+.1*habitatPatch(x,z)),r.biome==='marsh'?Math.max(0,.4-y)*.38:0);
       const color=shade.clone().lerp(sunlit,habitatPatch(x,z));
       if(r.biome==='trail' && z<157){
         sampleInlandGrassColor(x,Math.min(142,z),nativeTurf,tint);
         color.lerp(nativeTurf,1-T.MathUtils.smoothstep(z,142,157));
       }
       if(r.biome==='alpine')color.lerp(rock,Math.max(0,(y-2)/9)).lerp(snow,Math.max(0,(y-5.6)/2.4));
       if(r.biome==='marsh')color.lerp(silt,(1-T.MathUtils.smoothstep(y,.08,.52))*.76);
       colors.push(color.r,color.g,color.b);}
     geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
     geo.setAttribute('aSplat',new T.Float32BufferAttribute(splat,2));const mat=meadowGroundMaterial(this.ctx);
     const ground=new T.Mesh(geo,mat);ground.receiveShadow=true;ground.name=r.biome;this.root.add(ground);
     if(r.biome==='trail' && r.minZ===142)this.sign(this.root,r.minX<0?'原始森林 · 北行':'芦影沼泽 · 北行',trailX(r,143)-1.95,preserveHeight(r,trailX(r,143)-1.95,143),143);
     this.surfaces.push({min:[r.minX,r.minZ],max:[r.maxX,r.maxZ],height:0,grid:{width:n+1,height:m+1,values}});
     if(r.biome==='marsh'||r.biome==='bamboo'){
       // Water occupies the recessed central basin. Dry ground occludes its irregular banks.
       const cx=(r.minX+r.maxX)/2,cz=(r.minZ+r.maxZ)/2,level=.18;
       const pond=new T.PlaneGeometry(w-1,d-1,n,m);
       const positions=pond.attributes.position,depths=new Float32Array(positions.count);
       for(let i=0;i<depths.length;i++)depths[i]=level-preserveHeight(r,cx+positions.getX(i),cz-positions.getY(i));
       pond.setAttribute('aBedDepth',new T.BufferAttribute(depths,1));
       const water=valleyWater(this.ctx,pond,cx,level,cz,.24,r.biome==='marsh'?.12:.66,
         r.biome==='marsh'?{mappedBed:true,calm:.82,minReflect:.24,absorb:[3.1,1.95,1.72],band:{colors:[0x91ae91,0x6b9988,0x427d72,0x365e59],stops:[.14,.48,1.35]}}:{mappedBed:true,calm:.42});
       this.root.add(water);
       const deck=makeBoardwalk(r);this.root.add(deck.mesh);this.boxes.push(...deck.boxes);
       this.fluids.push({min:[r.minX+.5,r.minZ+.5],max:[r.maxX-.5,r.maxZ-.5],level:.18,sink:.14});
     }
   }
   this.horizon=new PreserveImpostors(silhouettes,this.ctx);this.root.add(this.horizon.mesh);
   this.syncPlants();
 }
 plots(){return this.plotSites;}
 plant(asset:string,x:number,z:number){
   if(!this.plots().some(p=>Math.abs(x-p.x)<4&&Math.abs(z-p.z)<3)||!plantChoices.some(p=>p[0]===asset)||!isBuildItemUnlocked(this.life,asset))return false;
   const garden=cottageData(this.life).plants;
   if(garden.some(p=>Math.hypot(p.x-x,p.z-z)<1.15)||!changeShells(this.life,-5,'spend'))return false;
   garden.push({asset,x,z});this.syncPlants();this.save();return true;
 }
 syncPlants(){
   retirePlants(this.plantsRoot);this.plantsRoot=new T.Group();this.root.add(this.plantsRoot);
   for(const p of cottageData(this.life).plants){const r=this.rects.find(r=>p.x>r.minX&&p.x<r.maxX&&p.z>r.minZ&&p.z<r.maxZ);if(r)void grove(this.plantsRoot,p.asset,[{x:p.x,z:p.z,height:p.asset==='nature-fern'?.8:3.2,y:preserveHeight(r,p.x,p.z),yaw:p.x}]);}
 }
 private planGroves(r:PreserveRect,silhouettes:Impostor[]){
   const plans:GrovePlan[]=[],cx=(r.minX+r.maxX)/2,cz=(r.minZ+r.maxZ)/2;
   for(const [asset,count,height] of plantPalettes[r.biome]){
     const rand=rng(r.biome+'/'+asset),poses:PlantPose[]=[];
     const sprites:Impostor[]|undefined=canopy.has(asset)?[]:undefined;
     for(let i=0;i<count*8&&poses.length<count;i++){
       const x=rand.range(r.minX+1.2,r.maxX-1.2),z=rand.range(r.minZ+1.2,r.maxZ-1.2),y=preserveHeight(r,x,z);
       if(pathEdge(r,x,z)<.65||this.plots().some(p=>Math.abs(x-p.x)<4.8&&Math.abs(z-p.z)<3.6))continue;
       if(asset==='waterside-lily'?y>.09:
         asset==='reeds'||asset==='cattails'?y<-.12||y>.62||rand.next()>.24+.76*habitatPatch(x,z):
         ((r.biome==='marsh'||r.biome==='bamboo')&&y<.3))continue;
       if(asset==='nature-willow'&&poses.some(p=>Math.hypot(p.x-x,p.z-z)<6))continue;
       if(asset==='redwood-tree'&&poses.some(p=>Math.hypot(p.x-x,p.z-z)<3.7))continue;
       const plant={x,z,y:asset==='waterside-lily'?.182:y,height:height*rand.range(.76,1.26),yaw:rand.range(0,Math.PI*2)};
       poses.push(plant);
       if(sprites){const sprite={...plant,asset,weight:1};sprites.push(sprite);silhouettes.push(sprite);}
     }
     plans.push({asset,poses,sprites});
   }
   this.layouts.set(r.biome,plans);
 }
 private load(r:PreserveRect){
   const group=new T.Group();this.chunks.set(r.biome,group);this.root.add(group);
   const cx=(r.minX+r.maxX)/2,cz=(r.minZ+r.maxZ)/2;
   const stream:GroveStreaming={updates:[],materials:new Set()};group.userData.stream=stream;
   for(const plan of this.layouts.get(r.biome)??[])void grove(group,plan.asset,plan.poses,stream,plan.sprites);
   if(r.biome==='redwoods'){
     const bark=new T.MeshStandardMaterial({color:0x76593e,roughness:1});
     const cap=new T.MeshStandardMaterial({color:0x987e56,roughness:1});
     for(const [dx,dz,angle] of [[-8,7,.66],[8,-5,1.4],[-11,-3,-.24]]){
       const log=new T.Mesh(new T.CylinderGeometry(.34,.46,4.8,12),[bark,cap,cap]);
       log.rotation.set(0,angle,1.54,'YXZ');log.position.set(cx+dx,preserveHeight(r,cx+dx,cz+dz)+.31,cz+dz);group.add(log);
       void grove(group,'moss-patch',[{x:cx+dx,z:cz+dz,y:log.position.y+.27,height:.21,yaw:angle}]);
     }
   }
   const plots=this.plots().filter(p=>p.r.biome===r.biome);
   for(const plot of plots){
     const stones=new T.InstancedMesh(new T.DodecahedronGeometry(.24),new T.MeshStandardMaterial({color:0x9a9d88}),24);
     const pebble=new T.Object3D();
     for(let i=0;i<24;i++){const a=i*Math.PI/12,x=plot.x+4.65*Math.cos(a),z=plot.z+3.65*Math.sin(a);
       pebble.position.set(x,preserveHeight(r,x,z)+.055,z);pebble.scale.set(1.25,.6,.76);pebble.rotation.y=a;pebble.updateMatrix();stones.setMatrixAt(i,pebble.matrix);}
     group.add(stones);
     this.sign(group,plot.name,plot.x-2.8,preserveHeight(r,plot.x-2.8,plot.z-2.9),plot.z-2.9);
   }
 }
 private herd(r:PreserveRect,animals:readonly string[],silhouettes:Impostor[]){
   const cx=(r.minX+r.maxX)/2,cz=(r.minZ+r.maxZ)/2,rand=rng('herd-'+r.biome);
   animals.forEach((slug,i)=>{
     const key='preserve-'+r.biome+'-'+slug;
     if(this.life.home?.ranch?.claimedEncounters.includes(key))return;
     const sp=RANCH_SPECIES_MAP['ranch-'+slug],{x,z}=waterBirdAnchor(r,slug,cx-5+i*4.3,cz+2*(i%2?1:-1));
     const sprite={asset:slug,height:sp.size,x,z,y:preserveHeight(r,x,z),yaw:0,weight:1};silhouettes.push(sprite);
     const model=new WildlifeLod(sprite,rand.next(),!['red-panda','pheasant'].includes(slug));this.root.add(model.group);
     const motes=makeEncounterMotes(sp.tier,sp.size,rand.next()*17,this.mote);model.group.add(motes.points);
     this.wildlife.push({id:sp.id,r,key,model,motes,x,z,baseX:x,baseZ:z,phase:rand.next()*6,contact:rand.next(),step:1,flying:slug==='golden-eagle'});
   });
 }
 private sign(group:T.Group,label:string,x:number,y:number,z:number){
   const c=document.createElement('canvas');c.width=384;c.height=94;const g=c.getContext('2d')!;
   g.fillStyle='#546b58';g.fillRect(0,0,384,94);g.strokeStyle='#d3bd89';g.lineWidth=3;g.strokeRect(6,6,372,82);g.font='36px SimSun,serif';g.textAlign='center';g.fillStyle='#fff2d5';g.fillText(label,192,60);
   const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;
   const timber=new T.MeshStandardMaterial({color:0x745940}),lettering=new T.MeshBasicMaterial({map:t});
   const post=new T.Mesh(new T.BoxGeometry(.09,.88,.11),timber);post.position.set(x,y+.44,z);post.name='preserve-sign-support';
   const panel=new T.Mesh(new T.BoxGeometry(1.58,.39,.15),[timber,timber,timber,timber,lettering,lettering]);
   panel.position.set(x,y+1.04,z);panel.name='preserve-sign-panel';group.add(post,panel);
 }
 private unload(id:string){
   const group=this.chunks.get(id);if(!group)return;
   for(const plan of this.layouts.get(id)??[])for(const p of plan.sprites??[])p.weight=1;
   const stream:GroveStreaming=group.userData.stream;
   stream.materials.forEach(m=>m.dispose());stream.updates.length=0;
   retirePlants(group);this.chunks.delete(id);
 }
 update(pos:readonly number[],dt:number){
   this.time+=dt;breeze.value=this.time;wind.value=this.ctx.weather.wind;
   const cam:T.Vector3=this.ctx.camera.position;
   for(const r of this.rects){
     if(r.biome==='trail')continue;
     const d=Math.hypot(cam.x-T.MathUtils.clamp(cam.x,r.minX,r.maxX),cam.z-T.MathUtils.clamp(cam.z,r.minZ,r.maxZ));
     if(d<62&&!this.chunks.has(r.biome))this.load(r);else if(d>78)this.unload(r.biome);
     const stream:GroveStreaming|undefined=this.chunks.get(r.biome)?.userData.stream;
     stream?.updates.forEach(update=>update(cam,dt));
   }
   for(const a of this.wildlife){const r=a.r;
     const d=Math.hypot(pos[0]-a.x,pos[2]-a.z);
     if(d>3)a.phase+=dt*.22;
     const q=a.phase;
     if(d>3){a.x=a.baseX+Math.sin(q)*2.8;a.z=a.baseZ+Math.cos(q)*1.65;}
     const fly=a.flying && Math.sin(q)>.28 && d>6;
     const sprite=a.model.sprite,water=animalWaterHeight(r,sprite.asset,a.x,a.z,sprite.height,this.time+q);
     a.model.group.position.set(a.x,water.y+(fly?3*(Math.sin(q)-.28):0),a.z);
     a.model.group.rotation.y=d<=3?Math.atan2(pos[0]-a.x,pos[2]-a.z):Math.atan2(2.8*Math.cos(q),-1.65*Math.sin(q));
     sprite.x=a.x;sprite.z=a.z;sprite.y=a.model.group.position.y;sprite.yaw=a.model.group.rotation.y;
     const viewDistance=Math.hypot(cam.x-a.x,cam.z-a.z);
     if(water.wet && !fly && viewDistance<40 && (d>3 || water.swim)){
       a.contact-=dt;
       if(a.contact<=0){
         const yaw=sprite.yaw,back=water.swim?sprite.height*.32:0,side=a.step*sprite.height*(water.swim?.13:.075);
         disturbAnimalWater(this.ctx,a.x-back*Math.sin(yaw)+side*Math.cos(yaw),a.z-back*Math.cos(yaw)-side*Math.sin(yaw),water.swim?.27:.18);
         a.step=-a.step;a.contact=d<=3?1.45:water.swim?.69:.60;
       }
     }
     a.model.update(viewDistance,dt,d<=3?'notice':fly?'fly':water.swim?'swim':'walk');
     if(viewDistance<36)a.motes.update(this.time,dt,d);else a.motes.points.visible=false;
   }
   this.horizon?.update();
 }
 spots():Interactable[]{
   return this.wildlife.map(a=>({id:a.key,position:[a.x,a.model.group.position.y,a.z],radius:3,prompt:()=>({title:RANCH_SPECIES_MAP[a.id].name,sub:'赠送'+ITEMS[RANCH_SPECIES_MAP[a.id].favoriteItem].name+'结识'}),act:()=>{
     const result=interactWildEncounter(this.life,a.key,a.id);this.toast(result.message);
     if(result.tamed){a.model.dispose();a.motes.dispose();this.wildlife.splice(this.wildlife.indexOf(a),1);this.save();}
   }}));
 }
}

