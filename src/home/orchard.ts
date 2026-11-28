import * as T from 'three';
import type {SlimeCharacter} from '../slime/character';
import type {Box} from '../slime/types';
import type {LifeData} from '../life/state';
import {allOrchardTrees, fruitReady, harvestTree, plantTree, TREE_SPECIES, treeStage, type OrchardTree, type TreeSpecies} from '../life/orchard';
import {expansionGroundAt, slotForTile} from '../world/expansion';
import {inland} from '../world/map';
import {createOrchardTree} from './foliage/orchard-trees';
import {gardenSite, orchardRoutes, ownedGardenAt, plantingSpots, type GardenPoint} from './orchard-navigation';
import {OrchardUI, type OrchardMode} from '../ui/orchard-ui';

interface OrchardHost {
  ctx:any; slime:SlimeCharacter; life:LifeData; save:()=>void;
  toast:(message:string,ms?:number)=>void; onBoxes:(boxes:Box[])=>void;openHelp?:()=>void;
}
interface LiveTree {
  tree:OrchardTree; model:ReturnType<typeof createOrchardTree>; stage:string; ripe:boolean;
}
const movementKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','Space'];
const poseSeconds=.52;
const keyOf=(p:GardenPoint)=>p[0].toFixed(2)+','+p[1].toFixed(2);

export class HomeOrchard {
  readonly state={mode:'idle' as OrchardMode,species:'apple' as TreeSpecies,planned:[] as GardenPoint[],completed:0,tileId:''};
  private readonly ui:OrchardUI;
  private readonly trees=new Map<string,LiveTree>();
  private readonly root=new T.Group();
  private readonly markers=new T.Group();
  private markerKey='';
  private count=1;
  private total=0;
  private route:GardenPoint[]=[];
  private failed=new Set<string>();
  private retries=0;
  private stalled=0;
  private lastPos:GardenPoint|null=null;
  private pending:{point:GardenPoint;elapsed:number}|null=null;
  private active=false;
  private stick:GardenPoint|null=null;
  private renderClock=0;
  private uiClock=0;
  private currentFruit:OrchardTree|null=null;

  constructor(private host:OrchardHost){
    this.root.name='orchard-trees';this.markers.name='orchard-preview';this.markers.userData.walkThrough=true;
    host.ctx.scene.add(this.root,this.markers);
    this.ui=new OrchardUI({
      action:action=>{
        if(!this.active)return;
        switch(action){
          case 'help':this.host.openHelp?.();break;
          case 'open':this.open();break;
          case 'manual':if(this.stock()>0)this.setMode('manual');break;
          case 'batch':this.preview();break;
          case 'start':case 'plant':case 'harvest':this.action();break;
          case 'stop':case 'back':this.cancel();break;
        }
        this.refreshUI();
      },
      species:id=>{this.state.species=id;this.count=Math.max(1,Math.min(this.count,this.stock()));this.refreshUI();},
      quantity:n=>{this.count=Math.max(1,Math.min(this.stock(),Math.floor(Number.isFinite(n)?n:1)));this.refreshUI();},
      move:(right,forward)=>{
        this.stick=right||forward?[right,forward]:null;
        if(this.stick&&this.state.mode==='auto')this.cancel();
        if(!this.stick)this.host.slime.setGardenWalk(null);
      },
    });
    window.addEventListener('keydown',e=>{
      if(!this.active||host.slime.mode!=='play')return;
      if(this.state.mode==='auto'&&movementKeys.includes(e.code)){this.cancel();return;}
      if(e.code==='Escape'&&this.cancel()){
        e.preventDefault();e.stopImmediatePropagation();
      }
    },true);
  }
  private get home(){return this.host.life.home!;}
  private stock(){return this.host.life.bag[TREE_SPECIES[this.state.species].saplingId]||0;}
  private at():GardenPoint{return [this.host.slime.position[0],this.host.slime.position[2]];}
  private owned(){return ownedGardenAt(this.home.expansions,...this.at());}
  private target():GardenPoint{
    const p=this.at(),f=this.host.slime.forward;
    const d=Math.hypot(f[0],f[2])||1;
    return [p[0]+1.52*f[0]/d,p[1]+1.52*f[2]/d];
  }
  open(){
    if(!this.active)return false;
    const plot=this.owned();
    if(!plot){this.host.toast('请走到已购扩建地块再种树');return false;}
    this.state.tileId=plot.tile.id;
    if(!this.stock()){
      const stocked=(Object.keys(TREE_SPECIES) as TreeSpecies[]).find(id=>!!this.host.life.bag[TREE_SPECIES[id].saplingId]);
      if(stocked)this.state.species=stocked;
    }
    this.count=Math.max(1,Math.min(this.stock(),this.count));
    this.state.completed=0;this.setMode('choose');this.refreshUI();return true;
  }
  private setMode(mode:OrchardMode){
    this.state.mode=mode;this.host.slime.setMenuPointer('orchard',this.active&&(mode==='choose'||mode==='preview'));
    this.uiClock=0;
  }
  cancel(){
    const mode=this.state.mode;
    if(mode==='idle')return false;
    this.host.slime.setGardenWalk(null);this.pending=null;this.route=[];this.failed.clear();
    this.state.planned=[];this.lastPos=null;this.stalled=0;this.retries=0;
    this.setMode(mode==='preview'?'choose':'idle');
    if(mode==='auto')this.host.toast('已停止造林，已栽 '+this.state.completed+' 棵');
    this.drawMarks([],true);
    return true;
  }
  private site(){
    const tile=this.home.expansions.find(t=>t.id===this.state.tileId),slot=tile&&slotForTile(tile);
    if(!tile||!slot)return null;
    const trees=allOrchardTrees(this.host.life).map(t=>({x:t.x,z:t.z,radius:TREE_SPECIES[t.species].crownRadius}));
    const surface=(x:number,z:number)=>expansionGroundAt(x,z,slot,tile.theme);
    return {slot,site:gardenSite(tile,slot,this.home,trees,surface,this.host.slime.world.fluid,this.host.slime.world.boxes)};
  }
  private reason(point:GardenPoint){
    const ctx=this.site();
    if(!ctx||this.owned()?.tile.id!==this.state.tileId)return '请回到选定的扩建地块';
    if(!this.stock())return '树苗已经用完';
    if(!this.host.slime.grounded||this.host.slime.swimming)return '请先在陆地站稳';
    return ctx.site.reason(...point,TREE_SPECIES[this.state.species].crownRadius);
  }
  private plan(n:number){
    const ctx=this.site();
    if(!ctx||this.owned()?.tile.id!==this.state.tileId)return [];
    const from=this.at(),r=TREE_SPECIES[this.state.species].crownRadius;
    const path=orchardRoutes(ctx.slot,from,ctx.site);
    return plantingSpots(ctx.slot,from,r,Math.min(n,this.stock()),
      (x,z)=>Math.hypot(x-from[0],z-from[1])>.85&&!this.failed.has(keyOf([x,z]))&&!ctx.site.reason(x,z,r),p=>!!path(p));
  }
  private preview(){
    if(!this.stock())return;
    this.failed.clear();this.state.planned=this.plan(this.count);this.setMode('preview');
    this.drawMarks(this.state.planned,true);
  }
  action():boolean{
    if(!this.active)return false;
    const mode=this.state.mode;
    if(mode==='choose'||mode==='auto'||this.pending)return true;
    if(mode==='preview'){
      this.state.planned=this.plan(this.count);
      if(!this.state.planned.length){this.host.toast('这块地没有可达的栽种位置');this.refreshUI();return true;}
      this.total=this.state.planned.length;this.state.completed=0;this.route=[];this.retries=0;
      this.setMode('auto');this.drawMarks(this.state.planned,true);this.refreshUI();return true;
    }
    if(mode==='manual'){
      const p=this.target(),reason=this.reason(p);
      if(reason)this.host.toast(reason);
      else this.beginPlant(p);
      return true;
    }
    const fruit=this.nearFruit();
    if(!fruit)return false;
    const picked=harvestTree(this.host.life,fruit.id,Date.now());
    if(picked){
      this.host.save();this.syncTrees();this.currentFruit=null;
      this.host.slime.setMood('Happy',.7);
      this.host.toast((TREE_SPECIES[fruit.species].fruitName??'果实')+' × '+picked.n+' 已收入背包');
      this.refreshUI();
    }
    return true;
  }
  private nearFruit(){
    const [x,z]=this.at(),y=this.host.slime.position[1],now=Date.now();
    let best:OrchardTree|null=null,nearest=2.55;
    for(const {tree,model} of this.trees.values()){
      const d=Math.hypot(tree.x-x,tree.z-z);
      if(d<nearest&&Math.abs(model.group.position.y-y)<1.9&&fruitReady(tree,now)){best=tree;nearest=d;}
    }
    return best;
  }
  private syncTrees(){
    const data=allOrchardTrees(this.host.life),owned=new Map(this.home.expansions.map(t=>[t.id,t]));
    const ids=new Set<string>();let rebuild=false;const now=Date.now();
    for(const tree of data){
      const tile=owned.get(tree.tileId);
      if(!tile&&tree.tileId!=='native-farm')continue;
      const slot=tile&&slotForTile(tile);
      ids.add(tree.id);
      let live=this.trees.get(tree.id);
      if(!live){
        const model=createOrchardTree(this.host.ctx,tree.species,tree.id);
        const y=slot&&tile?expansionGroundAt(tree.x,tree.z,slot,tile.theme):inland(tree.x,tree.z);
        model.group.position.set(tree.x,y,tree.z);this.root.add(model.group);
        live={model,tree,stage:'',ripe:false};this.trees.set(tree.id,live);rebuild=true;
      }
      live.tree=tree;
      const stage=treeStage(tree,now),ripe=fruitReady(tree,now);
      if(stage!==live.stage||ripe!==live.ripe){
        if(stage!==live.stage)rebuild=true;
        live.model.update(stage,ripe);live.stage=stage;live.ripe=ripe;
      }
    }
    for(const [id,live] of this.trees)if(!ids.has(id)){
      live.model.group.removeFromParent();live.model.dispose();this.trees.delete(id);rebuild=true;
    }
    if(rebuild){
      const boxes:Box[]=[];
      for(const {tree,model,stage} of this.trees.values()){
        const k=stage==='adult'?1:stage==='young'?.52:.20;
        const r=TREE_SPECIES[tree.species].trunkRadius*k,y=model.group.position.y;
        boxes.push({name:'orchard-trunk-'+tree.id,min:[tree.x-r,y-.10,tree.z-r],max:[tree.x+r,y+2.6*k,tree.z+r],camera:true,climbable:false});
      }
      this.host.onBoxes(boxes);
    }
  }
  private beginPlant(point:GardenPoint){
    const s=this.host.slime,[x,z]=this.at(),d=Math.hypot(point[0]-x,point[1]-z);
    s.setGardenWalk(null);
    if(d>.01)s.forward=[(point[0]-x)/d,0,(point[1]-z)/d];
    this.pending={point,elapsed:0};s.setMood('Squash',poseSeconds);
  }
  private finishPlant(point:GardenPoint){
    const conflict=this.reason(point);
    let planted=false;
    if(!conflict&&Math.hypot(point[0]-this.at()[0],point[1]-this.at()[1])<2.05){
      planted=!!plantTree(this.host.life,this.state.species,this.state.tileId,...point,Date.now());
    }
    if(planted){
      this.state.completed++;this.host.save();this.syncTrees();this.host.slime.setMood('Happy',.50);
    }
    if(this.state.mode==='auto'){
      this.next(planted);
    }else{
      this.host.toast(planted?'种下了'+TREE_SPECIES[this.state.species].name:conflict||'已离开栽种位置');
      if(!this.stock())this.cancel();
    }
  }
  private next(success:boolean){
    this.host.slime.setGardenWalk(null);
    if(!success&&this.state.planned[0])this.failed.add(keyOf(this.state.planned[0]));
    this.state.planned.shift();this.route=[];this.retries=0;this.stalled=0;this.lastPos=null;
    if(!this.state.planned.length&&this.state.completed<this.total&&this.stock()){
      this.state.planned=this.plan(this.total-this.state.completed);
    }
    if(!this.state.planned.length||!this.stock()){
      this.setMode('idle');this.host.slime.setGardenWalk(null);
      this.host.toast('造林结束，已栽 '+this.state.completed+' / '+this.total+' 棵');
    }
    this.drawMarks(this.state.planned,true);
  }
  private autoStep(dt:number){
    const s=this.host.slime,goal=this.state.planned[0];
    if(!goal||this.owned()?.tile.id!==this.state.tileId){this.cancel();return;}
    const [x,z]=this.at();
    if(Math.hypot(x-goal[0],z-goal[1])<1.15){
      if(this.reason(goal))this.next(false);else this.beginPlant(goal);
      return;
    }
    if(!this.route.length){
      const ctx=this.site();
      if(!ctx||ctx.site.reason(...goal,TREE_SPECIES[this.state.species].crownRadius)){
        this.next(false);return;
      }
      const route=orchardRoutes(ctx.slot,[x,z],ctx.site)(goal);
      if(!route?.length){this.next(false);return;}
      this.route=route;
    }
    while(this.route.length>1&&Math.hypot(this.route[0][0]-x,this.route[0][1]-z)<.26)this.route.shift();
    const [tx,tz]=this.route[0],d=Math.hypot(tx-x,tz-z);
    if(d>.001){
      const dx=(tx-x)/d,dz=(tz-z)/d,step=Math.min(.45,d);
      const probe=s.world.moveCapsule(s.position,[dx*step,0,dz*step],.28,.56).position;
      const actual=(probe[0]-x)*dx+(probe[2]-z)*dz;
      if(actual<step*.6){
        this.route=[];s.setGardenWalk(null);
        if(++this.retries>=2)this.next(false);
        return;
      }
      s.setGardenWalk([dx,dz]);
    }
    if(!this.lastPos||Math.hypot(this.lastPos[0]-x,this.lastPos[1]-z)>.16){this.lastPos=[x,z];this.stalled=0;}
    else this.stalled+=dt;
    if(this.stalled>.9){
      this.route=[];this.stalled=0;s.setGardenWalk(null);
      if(++this.retries>=2)this.next(false);
    }
  }
  private drawMarks(points:GardenPoint[],ok:boolean){
    const key=[this.state.species,ok,...points.map(p=>p.map(n=>Math.round(n*20)).join(','))].join('|');
    if(key===this.markerKey)return;
    this.markerKey=key;
    for(const line of [...this.markers.children]){
      this.markers.remove(line);line.geometry.dispose();line.material.dispose();
    }
    if(!points.length)return;
    const ctx=this.site();if(!ctx)return;
    const r=TREE_SPECIES[this.state.species].crownRadius,vertices:number[]=[];
    for(const [x,z] of points){
      for(let i=0;i<48;i++)for(const step of [i,i+1]){
        const a=step*Math.PI/24,gx=x+Math.cos(a)*r,gz=z+Math.sin(a)*r;
        vertices.push(gx,(ctx.site.ground(gx,gz)??0)+.075,gz);
      }
      const y=ctx.site.ground(x,z)??0;
      vertices.push(x,y+.05,z,x,y+.72,z,x,y+.72,z,x+.24,y+.59,z,x+.24,y+.59,z,x,y+.50,z);
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    const line=new T.LineSegments(geometry,new T.LineBasicMaterial({color:ok?0x21ca80:0xff6347,toneMapped:false}));
    line.name='orchard-crown-preview';this.markers.add(line);
  }
  private refreshUI(){
    if(!this.active)return;
    const plot=this.owned();
    let hint='',canPlant=false;
    if(this.state.mode==='manual'){
      const p=this.target(),reason=this.reason(p);
      hint=this.pending?'正在栽种…':reason||TREE_SPECIES[this.state.species].name+' · 此处可以扎根';
      canPlant=!reason&&!this.pending;
      this.drawMarks([this.pending?.point??p],!reason);
    }
    this.currentFruit=this.state.mode==='idle'?this.nearFruit():null;
    this.ui.show({mode:this.state.mode,species:this.state.species,count:this.count,bag:this.host.life.bag,
      tile:plot?.slot.name??'',hint,canPlant,
      ripe:this.currentFruit?TREE_SPECIES[this.currentFruit.species].fruitName??'果实':'',
      planned:this.state.planned.length,total:this.total,completed:this.state.completed});
  }
  update(dt:number,active:boolean){
    this.renderClock-=dt;
    if(this.renderClock<=0){this.syncTrees();this.renderClock=.65;}
    if(!active){
      if(this.active){
        this.ui.hide();this.host.slime.setGardenWalk(null);this.host.slime.setMenuPointer('orchard',false);
        this.markers.visible=false;this.stick=null;
      }
      this.active=false;return;
    }
    if(!this.active){this.active=true;this.markers.visible=true;this.setMode(this.state.mode);}
    const s=this.host.slime;
    if(this.state.mode==='auto'&&(this.stick||movementKeys.some(k=>s.keys.has(k))))this.cancel();
    if(this.stick){
      const [right,forward]=this.stick,c=Math.cos(s.yaw),sn=Math.sin(s.yaw);
      s.setGardenWalk([right*c-forward*sn,-right*sn-forward*c]);
    }
    if(this.pending){
      this.pending.elapsed+=dt;s.plantingPose(Math.min(1,this.pending.elapsed/poseSeconds));
      if(this.pending.elapsed>=poseSeconds){
        const point=this.pending.point;this.pending=null;this.finishPlant(point);this.uiClock=0;
      }
    }else if(this.state.mode==='auto')this.autoStep(dt);
    this.uiClock-=dt;
    if(this.uiClock<=0){this.refreshUI();this.uiClock=.12;}
  }
}
