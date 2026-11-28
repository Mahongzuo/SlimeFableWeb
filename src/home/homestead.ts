import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import type {Box} from '../slime/types';
import type {LifeData} from '../life/state';
import {changeShells} from '../life/shell-wallet';

import {HOUSE,houseColliders,houseRoom,canFurnish} from './ninglu-layout';
export {HOUSE} from './ninglu-layout';
type Furnishing = NonNullable<LifeData['cottage']>['furniture'][number];
type FurnDef = {name:string; asset?:string; width:number; depth:number; price:number};
export const furnishings:Record<string,FurnDef> = {
  bed:{name:'软枕木床',asset:'Bed_Single',width:1.6,depth:2.25,price:28},
  table:{name:'圆木茶桌',asset:'Table_RoundSmall',width:1.3,depth:1.3,price:14},
  nest:{name:'藤编软窝',width:1.05,depth:.94,price:8},bowl:{name:'青瓷食盆',width:.54,depth:.54,price:5},
  chair:{name:'榉木椅',asset:'Chair_2',width:.72,depth:.72,price:9},
  shelf:{name:'藏书格',asset:'Bookshelf',width:1.46,depth:.53,price:22},
  chest:{name:'矮斗柜',asset:'Drawer_1',width:1.11,depth:.65,price:16},
  desk:{name:'笔墨书案',asset:'court-scholars-writing',width:1.68,depth:.67,price:26},
  screen:{name:'彩绘折屏',asset:'court-folding-screen',width:1.83,depth:.38,price:24},
  scrolls:{name:'书卷架',asset:'court-scroll-rack',width:1.19,depth:.43,price:18},
  cushions:{name:'锦缎坐垫',asset:'court-floor-cushion-set',width:.88,depth:.75,price:8},
  lamp:{name:'绢纸落地灯',width:.55,depth:.55,price:12},
};
export function cottageData(life:LifeData) {
  const cottage:NonNullable<LifeData['cottage']>=life.cottage??={plants:[],furniture:[
    {id:'bed',kind:'bed',x:0,z:0,turn:0,stored:true},{id:'table',kind:'table',x:0,z:0,turn:0,stored:true},
    {id:'nest',kind:'nest',x:-6.76,z:2.80,turn:0},{id:'bowl',kind:'bowl',x:-4.52,z:2.80,turn:0}
  ]};
  if(!cottage.ninglu){
    for(const f of cottage.furniture){
      if(f.stored || !furnishings[f.kind])continue;
      const [w,d]=footprint(f.kind,f.turn);
      if(canFurnish(f.x,f.z,w,d))continue;
      const x=f.kind==='nest'?-6.76:f.kind==='bowl'?-4.52:undefined,z=2.80;
      if(x!==undefined && !cottage.furniture.some(other=>{
        if(other===f||other.stored||!furnishings[other.kind])return false;
        const [ow,od]=footprint(other.kind,other.turn);
        return Math.abs(other.x-x)<(ow+w)/2+.14 && Math.abs(other.z-z)<(od+d)/2+.14;
      }))Object.assign(f,{x,z,turn:0});
      else f.stored=true;
    }
    cottage.ninglu=true;
  }
  return cottage;
}
function footprint(kind:string,turn:number) {
  const def=furnishings[kind];
  return turn%2?[def.depth,def.width]:[def.width,def.depth];
}
export function placeFurniture(life:LifeData,kind:string,x:number,z:number,turn:number,id?:string) {
  const data=cottageData(life), item=id?data.furniture.find(f=>f.id===id):undefined;
  if (!furnishings[kind] || ![x,z,turn].every(Number.isFinite) || id && (!item||item.kind!==kind)) return false;
  turn=((Math.round(turn)%4)+4)%4;
  const [w,d]=footprint(kind,turn);
  if(!canFurnish(x,z,w,d))return false;
  if(data.furniture.some(f=>{
    if(f.id===id || f.stored)return false;
    const [fw,fd]=footprint(f.kind,f.turn);
    return Math.abs(x-f.x)<(w+fw)/2+.14 && Math.abs(z-f.z)<(d+fd)/2+.14;
  }))return false;
  if(!item && !changeShells(life,-furnishings[kind].price,'spend'))return false;
  if(item)Object.assign(item,{x,z,turn,stored:false});
  else data.furniture.push({id:crypto.randomUUID(),kind,x,z,turn});
  return true;
}

const courtPigments:Record<string,number>={timber:0x78543e,wood:0xa17a54,paper:0xe9d8ab,stone:0xa39e91,leaf:0x608157,blossom:0xc9848b,glaze:0x65988e,lacquer:0x985546,bronze:0xa18556,ink:0x403d38};
const housePigments:Record<string,number>={Wood:0x9a7153,Wood_Dark:0x72533f,Cushin:0xad8e74,White:0xe1dac4,Kitchen:0x729083,KitchenTop:0xc7b99f,Red:0xba8368,DarkRed:0x935c4b};
const loader=new GLTFLoader(), assets=new Map<string,Promise<T.Group>>();
function loadAsset(asset:string):Promise<T.Group>{
  const cached=assets.get(asset);
  if(cached)return cached;
  const pending:Promise<T.Group>=loader.loadAsync('/models/companions/'+asset+'.glb').then(({scene})=>{
      scene.traverse(node=>{
        if(!(node instanceof T.Mesh))return;
        node.castShadow=true;node.receiveShadow=true;
        for(const mat of Array.isArray(node.material)?node.material:[node.material]){
          if(mat instanceof T.MeshStandardMaterial){
            const palette=asset.startsWith('court-')?courtPigments:housePigments;
            const shade=asset==='Bookshelf'?0x926c49:palette[mat.name];
            if(shade!==undefined)mat.color.setHex(shade);
            mat.metalness=Math.min(mat.metalness,.09);mat.roughness=Math.max(mat.roughness,.63);
          }
        }
      });
      return scene;
    }).catch(error=>{assets.delete(asset);throw error;});
  assets.set(asset,pending);
  return pending;
}
function fitModel(parent:T.Object3D,asset:string,x:number,z:number,y:number,w:number,d:number,h?:number) {
  const p=loadAsset(asset);
  const holder=new T.Group();holder.position.set(x,y,z);parent.add(holder);
  void p.then(scene=>{
    const mesh=scene.clone(true), b=new T.Box3().setFromObject(mesh),s=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3());
    const sy=h?h/s.y:Math.min(w/s.x,d/s.z);
    mesh.scale.set(w/s.x,sy,d/s.z);mesh.position.set(-c.x*mesh.scale.x,-b.min.y*sy,-c.z*mesh.scale.z);
    holder.add(mesh);
  }).catch(error=>console.warn(asset,error));
  return holder;
}
function finish(hex:number,roughness=.82){return new T.MeshStandardMaterial({color:hex,roughness});}
const wood=finish(0x875c40),dark=finish(0x534036),jade=finish(0x5e897c),linen=finish(0xe3b898);
const lit=new T.MeshBasicMaterial({color:0xffe6aa});
function block(parent:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,mat:T.Material) {
  const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m;
}
function round(parent:T.Object3D,x:number,y:number,z:number,top:number,bottom:number,h:number,mat:T.Material,n=24) {
  const m=new T.Mesh(new T.CylinderGeometry(top,bottom,h,n),mat);m.position.set(x,y,z);parent.add(m);return m;
}
export class Homestead {
  readonly rooms=new T.Group();readonly interior=new T.Scene();readonly shell=new T.Group();
  readonly boxes=houseColliders();readonly furnitureBoxes:Box[]=[];
  inside=false;
  private zone:ReturnType<typeof houseRoom>='outside';
  private parts:T.Object3D[]=[];
  private fixtures=new T.Group();private furnitureGroups=new Map<string,T.Group>();
  private target?:T.WebGLRenderTarget;
  private quad=new T.Scene();private orth=new T.OrthographicCamera(-1,1,1,-1,0,1);
  private display=new T.MeshBasicMaterial({toneMapped:false,depthTest:false,depthWrite:false});
  constructor(private ctx:any,private life:LifeData) {
    this.shell.name='凝露小院';this.rooms.name='小院建筑与家具';ctx.scene.add(this.shell);
    this.shell.position.set(HOUSE.x,HOUSE.y,HOUSE.z);
    this.shell.add(this.rooms);this.rooms.add(this.fixtures);
    void loader.loadAsync('/models/companions/ninglu-courtyard.glb').then(({scene})=>{
      scene.name='凝露小院原作';scene.scale.setScalar(HOUSE.scale);
      scene.traverse(node=>{
        if(node.name.startsWith('SM_'))this.parts.push(node);
        if(node instanceof T.Mesh){node.castShadow=true;node.receiveShadow=true;}
      });
      this.rooms.add(scene);this.cutaway();
    }).catch(error=>console.error('凝露小院模型加载失败',error));
    this.interior.background=new T.Color(0xead8b9);
    this.interior.add(new T.HemisphereLight(0xffedce,0xbba38d,1.65));
    const sun=new T.DirectionalLight(0xffdfb2,2.1);sun.position.set(HOUSE.x-6,9,HOUSE.z+5);sun.target.position.set(HOUSE.x,0,HOUSE.z);this.interior.add(sun,sun.target);
    for(const [x,z] of [[-3,-2],[3,2]]){const lamp=new T.PointLight(0xffb365,9,6,2);lamp.position.set(HOUSE.x+x,2.6,HOUSE.z+z);this.interior.add(lamp);}
    this.quad.add(new T.Mesh(new T.PlaneGeometry(2,2),this.display));this.sync();
    ctx.renderCottage=(t:number)=>this.render(t);
  }
  sync(){
    // Replace furniture instances only; shared glTF geometry and textures remain loader-owned.
    this.fixtures.clear();this.furnitureBoxes.length=0;
    for(const f of cottageData(this.life).furniture)if(!f.stored)this.addFurniture(f);
  }
  private addFurniture(f:Furnishing){
    const def=furnishings[f.kind];if(!def)return;
    const [w,d]=footprint(f.kind,f.turn);
    this.furnitureBoxes.push({name:def.name,min:[HOUSE.x+f.x-w*.46,HOUSE.y,HOUSE.z+f.z-d*.46],max:[HOUSE.x+f.x+w*.46,HOUSE.y+.10*HOUSE.scale+({bed:.5,chair:.65,table:.76,shelf:1.6,screen:1.63,scrolls:1.28,desk:.86,cushions:.15,chest:.75,lamp:1.8,bowl:.17,nest:.24}[f.kind]??.5),HOUSE.z+f.z+d*.46],camera:false});
    const existing=this.furnitureGroups.get(f.id),g=existing??new T.Group();
    this.fixtures.add(g);g.position.set(f.x,.10*HOUSE.scale+.004,f.z);g.rotation.y=f.turn*Math.PI/2;
    if(existing)return;
    this.furnitureGroups.set(f.id,g);
    const shadow=new T.Mesh(new T.CircleGeometry(1,32),new T.MeshBasicMaterial({color:0x4d3229,transparent:true,opacity:.18,depthWrite:false}));
    shadow.rotation.x=-Math.PI/2;shadow.scale.set(def.width*.54,def.depth*.53,1);g.add(shadow);
    if(def.asset){
      // Keep the table top at a known height so its tea service moves and rotates with it.
      fitModel(g,def.asset,0,0,0,def.width,def.depth,({table:.75,bed:.78,desk:.86,scrolls:1.28,screen:1.63,cushions:.15,shelf:1.63} as Record<string,number>)[f.kind]);
      if(f.kind==='table'){
        fitModel(g,'court-tea-set',0,0,.759,.87,.55,.27);
      }
      if(f.kind==='desk'){
        fitModel(g,'court-calligraphy-brush',-.40,-.05,.86,.52,.26,.45);
        fitModel(g,'court-inkstone-and',.42,.02,.86,.36,.23,.16);
        block(g,.01,.873,.04,.38,.019,.27,finish(0xf3e4bf));
      }
      if(f.kind==='shelf'){
        block(g,0,.82,-.239,1.40,1.58,.032,wood);
        const spines=[jade,wood,linen,dark,finish(0xc8a46a)],pose=new T.Object3D();
        const batches=spines.map(()=>[] as T.Matrix4[]);
        for(const [shelfIndex,y] of [.025,.245,.485,.715,.947,1.176,1.403].entries()){
          for(let i=0;i<9;i++){
            if((i+shelfIndex*2)%13===0)continue;
            const x=-.585+i*.131,h=.174+.023*Math.sin(i*13+y);
            pose.position.set(x,y+h/2,.015);pose.scale.set(.103,h,.30);pose.updateMatrix();
            batches[(i+shelfIndex)%4].push(pose.matrix.clone());
            pose.position.set(x,y+h*.68,.169);pose.scale.set(.078,.015,.011);pose.updateMatrix();
            batches[4].push(pose.matrix.clone());
          }
        }
        const cube=new T.BoxGeometry(1,1,1);
        batches.forEach((matrices,i)=>{
          const batch=new T.InstancedMesh(cube,spines[i],matrices.length);
          matrices.forEach((m,j)=>batch.setMatrixAt(j,m));batch.computeBoundingSphere();g.add(batch);
        });
      }
      if(f.kind==='bed'){
        const carved=finish(0x79513c),brass=finish(0xba995b);
        block(g,0,1.08,-1.04,1.64,1.14,.10,carved);
        block(g,0,1.21,-.978,1.39,.70,.05,jade);
        for(let i=-3;i<=3;i++){
          const cross=block(g,i*.185,1.24,-.94,.028,.49,.037,brass);cross.rotation.z=.46;
        }
        block(g,0,1.65,-1.03,1.77,.103,.14,carved);
        const quilt=finish(0x719e91);block(g,0,.67,.37,1.46,.095,1.35,quilt);
        for(let i=0;i<5;i++)block(g,0,.72,.62+i*.074,1.45,.012,.023,i%2?linen:jade);
        const pillow=new T.Mesh(new T.SphereGeometry(1,20,12),finish(0xf7e8ce));pillow.position.set(0,.68,-.64);pillow.scale.set(.59,.145,.31);g.add(pillow);
      }
      return;
    }
    if(f.kind==='lamp'){round(g,0,.07,0,.23,.27,.14,wood);round(g,0,.77,0,.045,.055,1.35,dark);round(g,0,1.52,0,.22,.32,.49,lit);}
    else if(f.kind==='bowl'){round(g,0,.105,0,.27,.2,.21,jade);round(g,0,.213,0,.204,.204,.012,wood);}
    else {
      round(g,0,.13,0,.51,.44,.26,wood);
      for(let i=0;i<5;i++)round(g,0,.046+i*.044,0,.462+i*.012,.466+i*.012,.019,linen,32);
      const cushion=new T.Mesh(new T.SphereGeometry(1,24,12),finish(0xcfa079));cushion.scale.set(.439,.11,.42);cushion.position.y=.26;g.add(cushion);
      for(const [x,z] of [[-.1,-.1],[.1,.1]])round(g,x,.363,z,.02,.02,.009,wood,8);
    }
  }
  private cutaway(){
    for(const part of this.parts){
      const name=part.name;
      const main=this.zone==='lower'||this.zone==='upper';
      part.visible=!(main&&(name==='SM_Main_Roof'||name==='SM_Gallery_Awning') ||
        this.zone==='lower'&&(name.startsWith('SM_L2_')||name==='SM_Exterior_Trim') ||
        this.zone==='pet'&&name==='SM_Pet_Roof' || this.zone==='tea'&&name==='SM_Tea_Roof');
    }
  }
  update(p:readonly number[],_dt:number){
    const next=houseRoom(p[0],p[1],p[2]);
    if(this.zone===next)return;
    this.zone=next;this.inside=next!=='outside';this.cutaway();
    if(this.inside){this.interior.add(this.rooms);this.rooms.position.copy(this.shell.position);}
    else{this.shell.add(this.rooms);this.rooms.position.set(0,0,0);}
  }
  private render(time:number){
    if(!this.inside)return false;
    const r=this.ctx.renderer as T.WebGLRenderer,cam=this.ctx.camera as T.PerspectiveCamera;
    const sx=r.domElement.width,sy=r.domElement.height;
    if(!this.target){this.target=new T.WebGLRenderTarget(sx,sy,{samples:4});this.target.depthTexture=new T.DepthTexture(sx,sy);this.display.map=this.target.texture;this.display.needsUpdate=true;}
    if(this.target.width!==sx || this.target.height!==sy)this.target.setSize(sx,sy);
    r.setRenderTarget(this.target);r.clear();r.render(this.interior,cam);
    r.setRenderTarget(null);r.render(this.quad,this.orth);
    this.ctx.renderSlime?.({color:this.target.texture,depth:this.target.depthTexture,time});return true;
  }
}

