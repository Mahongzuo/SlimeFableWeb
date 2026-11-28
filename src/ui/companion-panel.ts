import * as T from 'three';
import {type LifeData,ensureHome} from '../life/state';
import {claimStarter,mealState,buyRation,RESCUE_MS,growth,settleMeals} from '../life/companion-care';
import {starterIds} from '../life/companion-catalog';
import {capacityProgress} from '../life/shell-wallet';
import {careForAnimal,RANCH_SPECIES_MAP,toggleAnimalFollow} from '../life/ranch';
import {ITEMS} from '../life/catalog';
import {isBuildItemUnlocked} from '../life/unlocks';
import {spawnPackModel,packThumbUrl,type SpawnedPackModel} from '../home/model-pack';
import {planWidth,planDepth} from '../home/ninglu-layout';
import {cottageData,furnishings,placeFurniture,HOUSE} from '../home/homestead';
import {plantChoices,type BiomePreserves} from '../home/biome-preserves';
import type {RanchRuntime} from '../home/ranch-runtime';
import './companion-panel.css';

type Page='starter'|'pets'|'room'|'plot'|'rescue';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
type Host={life:LifeData;biomes:BiomePreserves;ranch:RanchRuntime;near:()=>boolean;position:()=>readonly number[];change:()=>void;furniture:()=>void;toast:(s:string)=>void;help:()=>void;lock:(on:boolean)=>void};
const button=(action:string,label:string,value='',disabled=false)=>`<button type="button" data-action="${action}" value="${esc(value)}" ${disabled?'disabled':''}>${label}</button>`;
export class CompanionPanel {
 readonly root=document.createElement('dialog');
 private page:Page='pets';private selected=starterIds[0];private renderer?:T.WebGLRenderer;private model?:SpawnedPackModel;
 private plot=0;private furnitureId='';private kind='chair';private turn=0;private message='';private chosenPet='';private plantKind:string='nature-fern';
 constructor(private host:Host){
   this.root.className='companion-book';this.root.setAttribute('aria-label','临水小院');document.body.appendChild(this.root);
   this.root.addEventListener('cancel',e=>{e.preventDefault();this.close();});
   this.root.addEventListener('click',e=>{
     const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
     if(b&&!b.disabled)this.act(b.dataset.action!,b.value);
     const grid=(e.target as HTMLElement).closest<HTMLElement>('[data-plan]');
     if(!b&&grid){const rect=grid.getBoundingClientRect();this.at((e.clientX-rect.left)/rect.width,(e.clientY-rect.top)/rect.height);}
   });
   this.root.addEventListener('change',e=>{const select=e.target as HTMLSelectElement;
     if(select.name==='plot'){this.plot=Number(select.value);this.draw();}
     if(select.name==='plant')this.plantKind=select.value;
     if(select.name==='furnishing'){this.furnitureId=select.value.startsWith('owned:')?select.value.slice(6):'';this.kind=this.furnitureId?cottageData(host.life).furniture.find(f=>f.id===this.furnitureId)!.kind:select.value;this.draw();}
   });
 }
 get visible(){return this.root.open;}
 open(page:Page='pets',plot=0){
   this.plot=plot;this.page=page;this.message='';if(!this.visible){this.root.showModal();this.host.lock(true);}
   this.draw();
 }
 close(){
   const ranch=ensureHome(this.host.life).ranch!;
   if(this.page==='starter'&&!ranch.starter)ranch.starter='later';
   if(this.page==='rescue')for(const a of ranch.animals)if(mealState(a)==='濒危'&&a.care)a.care.notified=true;
   this.previewOff();this.root.close();this.host.lock(false);this.host.change();
 }
 showHelp(){this.previewOff();this.root.close();this.host.help();}
 resumeHelp(){this.root.showModal();this.host.lock(true);this.draw();}
 private previewOff(){
   this.model?.dispose();this.model=undefined;
   if(this.renderer){this.renderer.setAnimationLoop(null);this.renderer.dispose();this.renderer.forceContextLoss();this.renderer=undefined;}
 }
 private preview(){
   const canvas=this.root.querySelector<HTMLCanvasElement>('.pet-preview');if(!canvas)return;
   const renderer=this.renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(1.5,devicePixelRatio));renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);
   const scene=new T.Scene(),cam=new T.PerspectiveCamera(33,canvas.clientWidth/canvas.clientHeight,.03,15);
   cam.layers.enable(1);cam.position.set(1.4,.93,1.76);cam.lookAt(0,.38,0);scene.add(new T.HemisphereLight(0xfff1da,0xb9b3a3,2.3));
   const key=new T.DirectionalLight(0xffe3b9,2.2);key.position.set(-3,4,3);scene.add(key);
   this.model=spawnPackModel(T,this.selected,1.22,{outline:false});scene.add(this.model.group);
   const model=this.model;model.setPose?.('notice');
   renderer.setAnimationLoop(t=>{model.setPose?.(t%9000<4200?(this.selected==='ranch-golden-retriever'?'sit':'notice'):t%9000<7200?'walk':'idle');renderer.render(scene,cam);});
 }
 private draw(){
   this.previewOff();
   const life=this.host.life,ranch=settleMeals(life,Date.now()),cap=capacityProgress(life),near=this.host.near();
   const close=button('close',this.page==='starter'?'暂时不养':'返回游戏');
   let title='',body='';
   if(this.page==='starter'){
     title='选一只幼宠，一起回家';const sp=RANCH_SPECIES_MAP[this.selected];
     body=`<div class="adoption"><div class="portrait"><canvas class="pet-preview"></canvas><h3>${sp.name}</h3><small>爱吃${ITEMS[sp.favoriteItem]?.name} · 随身附两份口粮</small></div><div class="species-list">${starterIds.map(id=>`<button data-action="select" value="${id}" aria-pressed="${id===this.selected}"><img src="${packThumbUrl(id)}" alt="">${RANCH_SPECIES_MAP[id].name}</button>`).join('')}</div></div><footer>${close}${button('claim','免费领养'+sp.name,this.selected)}</footer>`;
   }else if(this.page==='pets'||this.page==='rescue'){
     title=this.page==='rescue'?'有伙伴在等你补喂':'我的伙伴';
     body=`<div class="pet-summary">已养 ${ranch.animals.length}/${cap.total} 只 · ${cap.hint}</div>`+
       (this.page==='rescue'?'<p>下面标为濒危的伙伴已经连续缺粮。现在可以补喂，返回游戏后开始计算 30 分钟救助时间。</p>':'')+
       ranch.animals.map(a=>{const sp=RANCH_SPECIES_MAP[a.speciesId],c=a.care!,state=mealState(a);
         return `<article><img src="${packThumbUrl(a.speciesId)}" alt=""><div><h3>${esc(a.name)}</h3><small>${state} · 备粮 ${c.reserve}/3 · 体型 ${Math.round(growth(a)*100)}% · ♥ ${a.affection} ${state==='濒危'?'· 救助剩余 '+Math.ceil((RESCUE_MS-c.rescueMs)/60000)+' 分钟':''}</small><div class="actions">${button('ration',state==='饱足'?'备粮 · 3 贝壳':'补喂 · 3 贝壳',a.id,life.coins<3 || state==='饱足'&&c.reserve>=3)}${button('favorite','喂'+(ITEMS[sp.favoriteItem]?.name??''),a.id,!life.bag[sp.favoriteItem])}${button('follow',a.following?'送回安置点':'召来',a.id)}${button('home','留在小院',a.id)}${button('station','安置到生态区',a.id)}${near?button('seek','陪它寻物',a.id):''}</div></div></article>`;}).join('')+
       (near&&ranch.starter!=='claimed'?button('starter','领取首只幼宠'):'')+
       (ranch.memorials?.length?`<p>纪念册 · ${ranch.memorials.map(m=>esc(m.name)).join('、')}</p>`:'')+
       (this.host.ranch.seek?button('stop','结束寻物'):'')+
       (near?button('room','布置房间'):'')+close;
   }else if(this.page==='room'){
     title='布置小屋';const furniture=cottageData(life).furniture,kind=furnishings[this.kind];
     body=`<p>选好家具，在平面图上点按放置。可在主楼一层和两侧厢房的空位添置家具。旧家具可从「已收起」中取出。</p><select name="furnishing" aria-label="选择家具">${furniture.map(f=>`<option value="owned:${f.id}" ${this.furnitureId===f.id?'selected':''}>${furnishings[f.kind].name}${f.stored?'（已收起）':''}</option>`).join('')}${Object.entries(furnishings).map(([id,d])=>`<option value="${id}" ${!this.furnitureId&&id===this.kind?'selected':''}>购置${d.name} · ${d.price} 贝壳</option>`).join('')}</select><div class="floor-plan" data-plan><span>厨房 · 餐室</span><span>会客厅 · 书房</span><span>宠物房</span><span>茶室</span>${furniture.filter(f=>!f.stored).map(f=>`<button data-action="pick" value="${f.id}" style="left:${(f.x/planWidth+.5)*100}%;top:${(f.z/planDepth+.5)*100}%">${furnishings[f.kind].name}</button>`).join('')}</div><p>${kind.name} · 朝向 ${this.turn*90}°</p>${button('rotate','旋转 90°')}${this.furnitureId?button('store','收起这件'):''}${close}`;
   }else{
     title=this.chosenPet?'为伙伴选安置点':'在空地种植';
     const plots=this.host.biomes.plots();body=`<select name="plot" aria-label="选择空地">${plots.map((p,i)=>`<option value="${i}" ${i===this.plot?'selected':''}>${p.name}</option>`).join('')}</select>`+
       (this.chosenPet?button('settle','安置在这块空地'): `<select name="plant" aria-label="植物">${plantChoices.map(([id,name])=>`<option value="${id}" ${this.plantKind===id?'selected':''} ${isBuildItemUnlocked(life,id)?'':'disabled'}>${name} · 5 贝壳</option>`).join('')}</select><p>点按空地选择种植位置</p><div class="plant-plan" data-plan>🌿</div>`)+close;
   }
   this.root.innerHTML=`<main><header><h2>${title}</h2><span>${life.coins} 贝壳 ${button('help','F1 帮助')}</span></header>${body}<output aria-live="polite">${esc(this.message)}</output></main>`;
   if(this.page==='starter')this.preview();
 }
 private at(u:number,v:number){
   if(this.page==='room'){
     const ok=placeFurniture(this.host.life,this.kind,(u-.5)*planWidth,(v-.5)*planDepth,this.turn,this.furnitureId||undefined);
     this.message=ok?'已摆好。':'这里放不下，或贝壳不足。请在房间内留出通道和家具间距。';if(ok)this.host.furniture();
   }else if(this.page==='plot'&&!this.chosenPet){const p=this.host.biomes.plots()[this.plot];this.message=this.host.biomes.plant(this.plantKind,p.x+(u-.5)*7.9,p.z+(v-.5)*5.9)?'种好了。':'此处已种植、品种未解锁或贝壳不足。';}
   this.host.change();this.draw();
 }
 private act(action:string,value:string){
   const life=this.host.life,ranch=ensureHome(life).ranch!,a=ranch.animals.find(a=>a.id===value);
   if(action==='help'){this.showHelp();return;}
   if(action==='close'){this.close();return;}
   if(action==='select'){this.selected=value;this.draw();return;}
   if(action==='claim'&&claimStarter(life,value)){this.host.toast('领养成功，伙伴正在跟随你。');this.close();return;}
   if(action==='starter'){this.open('starter');return;}
   if(action==='ration')this.message=buyRation(life,value)?'食槽已更新。':'无法添粮。';
   if(action==='favorite')this.message=careForAnimal(life,value,new Date().toLocaleDateString('sv-SE'),true).message;
   if(action==='follow'){toggleAnimalFollow(life,value);this.host.ranch.seek=null;}
   if(action==='home'&&a){a.following=false;a.station=undefined;this.host.ranch.seek=null;}
   if(action==='station'){this.chosenPet=value;this.open('plot');return;}
   if(action==='settle'){const p=this.host.biomes.plots()[this.plot],pet=ranch.animals.find(a=>a.id===this.chosenPet);if(pet){pet.station=[p.x,p.z];pet.following=false;}this.chosenPet='';this.page='pets';}
   if(action==='room'){this.open('room');return;}
   if(action==='pick'){const f=cottageData(life).furniture.find(f=>f.id===value)!;this.furnitureId=f.id;this.kind=f.kind;this.turn=f.turn;}
   if(action==='rotate')this.turn=(this.turn+1)%4;
   if(action==='store'){const f=cottageData(life).furniture.find(f=>f.id===this.furnitureId);if(f){f.stored=true;this.host.furniture();}}
   if(action==='seek'&&a){this.chosenPet=value;this.root.innerHTML='<main><h2>把铃铛藏在哪里？</h2>'+button('hide','窗边茶桌','tea')+button('hide','小院廊下','yard')+button('close','返回游戏')+'</main>';return;}
   if(action==='hide'){
     const pet=ranch.animals.find(a=>a.id===this.chosenPet);if(!pet)return;
     if(!pet.following)toggleAnimalFollow(life,pet.id);
     this.host.ranch.seek={id:pet.id,x:HOUSE.x+(value==='tea'?5.74:0),z:HOUSE.z+(value==='tea'?3.05:-1.45),found:()=>{
       pet.affection=Math.min(500,pet.affection+8);this.host.change();this.host.toast(pet.name+'找到了铃铛！亲密度 +8');}};
     this.chosenPet='';this.host.toast('铃铛藏好了！跟着伙伴看看。');this.close();return;
   }
   if(action==='stop')this.host.ranch.seek=null;
   this.host.change();this.draw();
 }
 openPlot(i:number){this.chosenPet='';this.open('plot',i);}
}

