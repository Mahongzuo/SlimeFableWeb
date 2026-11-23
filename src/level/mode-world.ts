import './mode-world.css';
import * as T from 'three';
import {session} from './mode-session';
import {Stage} from './stage';
import {Save} from '../game/save';
import {applyLevelQuality} from '../game/graphics';
import {SlimeCharacter} from '../slime/character';
import {mountSlimeHud} from '../ui/slime-hud';
import type {Vec,ShotView} from '../slime/types';
import {generateLayout,near,lamps,receiverAim,observationPoint,sweptImpact,phaseCanHit} from '../templates/mode-world';
import {modeLook,buildModeWorld} from '../themes/mode-world';

import {newWorldLook,buildWorldStory} from '../themes/world-stories';

const s=session.spec,shot=s.kind==='shot';
const layout=generateLayout(s.day,session.seed,shot?'shot':'trial');
const story=layout.story,life=story==='life',ink=story==='ink',memorial=story==='memorial';
const ceres=story==='ceres',tiros=story==='tiros',radio=story==='wow',original=ink||memorial;
const stage=new Stage(original?modeLook(s.day):newWorldLook(story));
const art=original?buildModeWorld(stage,layout,s.kind,session.seed):buildWorldStory(stage,layout,session.seed);
const latch=life?[layout.latch]:[];
const actor=new SlimeCharacter(stage,{world:layout.world,spawn:layout.spawn,input:false,ui:false,
 trainingTargets:latch,title:s.title,onToast:()=>{},onReady:()=>{const b=button('start');b.disabled=false;b.textContent=shot?'走入场地':'去见关主';}}).attach();
const characterHud = mountSlimeHud(actor, {elements:true, skills:false});
applyLevelQuality(stage,actor,new Save().data.quality);
type Phase='intro'|'play'|'pause'|'finale'|'done';
let phase:Phase='intro',time=0,finale=0,aim=0,contactTime=-2,fired=-2,lockTime=0,given=false,upper=false,lower=false,comboStart=false,latched=false,lastHits=0;
let lastWorker=-1,progress=0,active:boolean[]=[],message='',until=0,focus:Vec|null=null;
const visited=new Set<number>(),health=layout.targets.map(()=>1),pulse=health.map(()=>0);

let positions=layout.targets.map((_,i)=>observationPoint(layout,i,0)),oldPositions=positions;
let previous=new Map<number,ShotView>();
const pending:Vec[]=[],origins=new Map<number,Vec>(),spent=new Set<number>();
const ui=document.createElement('main');ui.id='mw-ui';ui.dataset.theme=s.day;
ui.innerHTML='<header><div><small></small><h1></h1></div><button data-w="pause" hidden>暂停</button></header><section><label></label><h2></h2><p></p><div><button data-w="start" disabled>身体正在凝聚…</button><button data-w="practice">随机练习</button><button data-w="home">回港</button></div></section><aside hidden><b></b><p></p><small></small></aside><nav hidden></nav><output hidden></output>';
document.body.append(ui);
const $=<E extends HTMLElement=HTMLElement>(sel:string)=>ui.querySelector(sel) as E;
function button(k:string){return $<HTMLButtonElement>('[data-w="'+k+'"]');}
const stationName={ceres:'子午观测台',tiros:'云图遥测站',wow:'射电接收场',life:'摄影与印刷工坊',ink:'水巷画室',memorial:'纪念庭院'}[story];
const npc=life?'摄影编辑':ink?'齐白石 · 艺术演绎':'讲解员';
const finaleTitle={ceres:'星图上留下谷神星的轨迹',tiros:'遥测纸上显出云层',wow:'记录纸上留住了信号',life:'创刊封面离开印刷机',ink:'朱印入画',memorial:'白花汇成一束'}[story];
const finaleHint={ceres:'到绘图台按 F，连起三个观测点',tiros:'到气象终端按 F，取出云图',wow:'保持两路接收，去记录台按 F 走纸',life:'到印刷台按 F，压印创刊封面',ink:'到金环按 F，把朱印落在画签上',memorial:'到金环按 F，献上白花'}[story];
$('header small').textContent=s.year+'　/　'+s.day.slice(0,2)+'·'+s.day.slice(2)+'　'+stationName;
$('h1').textContent=s.title;$('section label').textContent=shot?'分身投射':npc+' 的委托';
$('h2').textContent={ceres:'星群之间，哪一点在移动？',tiros:'为云层拼出一张像',wow:'两个馈源，一张记录纸',life:'把水坝留在第一期封面',ink:'来，给这幅画落个款',memorial:'我们一起走到花前'}[story];
$('section p').textContent=s.fact+'　'+s.goal+'（此处委托与机关为游戏演绎）';
const actionLabels:Record<string,string>={fire:'投射 G',aim:'换瞄点 Q',recall:'收回 X',use:'互动 F',attack:'连击 J',spread:'摊开 C',jump:'跳跃'};
for(const key of shot?['aim','fire','recall','use']:['spread','jump',...(life?['attack']:[]),'use']){
 const b=document.createElement('button');b.dataset.w=key;b.textContent=actionLabels[key];$('nav').append(b);
}
function say(text:string){message=text;until=time+2.7;}
function aimList(){return [...(shot?positions:[]),...layout.pads.map(receiverAim)];}
function aimName(){
 if(ceres)return '谷神星的游移光点';
 if(radio)return (aim+1)+' 号馈源';
 return aim<positions.length?'第 '+(aim+1)+' 片移动云层':'遥测供电环';
}
function fire(to:Vec){
 if(!shot||time-fired<.36)return;
 if((actor.latest?.shots.length??0)+pending.length>=5){say('五团分身都在场，按 X 收回');return;}
 const dx=to[0]-actor.position[0],dz=to[2]-actor.position[2],len=Math.hypot(dx,dz)||1;
 actor.forward=[dx/len,0,dz/len];fired=time;actor.keys.delete('KeyX');actor.launch(to);pending.push([...actor.position]);
 actor.setMood('Spit',.3);
}
function stateHint(){
 if(progress===1)return finaleHint;
 if(!shot&&!given)return '在出生点旁的关主前按 F 接受委托';
 if(ceres){const index=visited.size;return '在 '+(index+1)+' 号「'+layout.stations[index].label+'」环内，用 G 投向游移光点　'+index+'/3';}
 if(radio)return '从馈线台分别向两座接收环投出分身，保持接通。Q 切换馈源，X 提早收回会中断记录　'+active.filter(Boolean).length+'/2';
 if(tiros)return '向遥测环留一团分身，或爬上高空观测台。Q 选云层，G 校准云图　'+visited.size+'/3';
 if(life)return lower?'面向滚筒出口的卡扣，按 J 连击两次校正压辊':'爬上摄影架到取景框按 F；或按住 C 钻过印刷机，从出口松开卡扣';
 if(ink)return '自选取印顺序，到印座按 F　'+layout.stations.map((v,i)=>visited.has(i)?'✓'+v.label:v.label).join(' / ');
 return '任选一条路：走缓坡护灯，或攀上高台点灯，到灯环按 F';
}
function refresh(){
 progress=shot?(radio?(lockTime>=.65?1:active.filter(Boolean).length*.36):visited.size/3):!given?0:life?(upper||latched?1:0):ink?visited.size/3:Math.min(1,visited.size);
 $('aside b').textContent=shot?(ceres?'观测簿　'+visited.size+' / 3':tiros?'观测链路　'+(active[0]?'遥测在线':near(actor.position,layout.stations[0].at,1.8)?'高台直连':'等待校准'):'记录笔　'+(lockTime>=.65?'锁定信号':'等待同步')):'委托人　'+npc;
 $('aside p').textContent=stateHint();
 $('aside small').textContent='WASD 或点地移动　'+(shot?'当前瞄点：'+aimName()+'　点击目标可直接投射':'空格跳跃 · 朝墙移动可攀登');
 $('output').hidden=time>until||!message;$('output').textContent=message;
}
function showHUD(on:boolean){characterHud.update(on);$('section').hidden=on;$('aside').hidden=$('nav').hidden=button('pause').hidden=!on;}
function use(){
 if(!shot&&!given){if(near(actor.position,layout.spawn,2.6)){given=true;say(life?'去摄影架拍水坝，或者到机房调压辊。等你的封面上机。':ink?'先取哪枚印，由你定。':'我们在花前会合。');}else say('请先回入口接委托');return;}
 if(progress>=1&&near(actor.position,layout.end,1.4)){
  phase='finale';actor.keys.clear();actor.mode='observe';focus=null;showHUD(false);
  $('output').hidden=true;
  $('section label').textContent=String(s.year)+'　'+stationName;$('h2').textContent=finaleTitle;
  $('section p').textContent=s.fact;$('section div').hidden=true;
  if(ink&&!shot){
   const order=Array.from(visited);
   const seals=document.createElement('div');seals.className='mw-imprint';
   for(const i of order){const stamp=document.createElement('b');stamp.textContent=['方','圆','长'][i];seals.append(stamp);}
   $('section').append(seals);
   const save=new Save();save.data.life.records[s.id+(session.practice?'-practice':'-daily')+'-imprint']=Number(order.map(i=>i+1).join(''));save.write();
  }
  return;
 }
 layout.stations.forEach((v,i)=>{
  if(!near(actor.position,v.at))return;
  if(shot||!given)return;
  if(life){if(i===0&&upperClimbed){upper=true;visited.add(i);say('快门合上，水坝留在了底片上');}}
  else{visited.add(i);say(ink?'拓下'+v.label:'带上这盏灯去献花');}
 });
 refresh();
}
function perform(k:string){
 if(k==='home'){session.home();return;}
 if(k==='practice'){location.assign(session.practicePath());return;}
 if(k==='start'){if(!actor.ready)return;if(phase==='intro')session.start();phase='play';actor.mode='play';showHUD(true);return;}
 if(k==='pause'&&phase==='play'){phase='pause';actor.mode='observe';actor.keys.clear();focus=null;showHUD(false);$('h2').textContent='暂停';$('section p').textContent=stateHint();button('start').textContent='继续';return;}
 if(phase!=='play')return;
 if(k==='aim')aim=ceres?Math.min(2,visited.size):(aim+1)%aimList().length;
 if(k==='fire')fire(aimList()[aim]);
 if(k==='recall'){actor.keys.add('KeyX');contactTime=time;}
 if(k==='use')use();
 if(k==='attack'&&life)actor.attack();
 if(k==='jump')actor.jump();
 if(k==='spread'){if(actor.keys.has('KeyC'))actor.keys.delete('KeyC');else actor.keys.add('KeyC');}
}
ui.onclick=e=>{const b=(e.target as HTMLElement).closest('button');if(b?.dataset.w){perform(b.dataset.w);b.blur();}};
const motion=['KeyA','KeyD','KeyW','KeyS'];
addEventListener('keydown',e=>{
 if(e.ctrlKey||e.altKey||e.metaKey)return;
 if(e.code==='Escape'&&!e.repeat){perform(phase==='pause'?'start':'pause');return;}
 if(phase!=='play')return;
 if(motion.includes(e.code)){if(focus)for(const k of motion)actor.keys.delete(k);focus=null;actor.keys.add(e.code);return;}
 if(e.code==='Space')e.preventDefault();if(e.repeat)return;
 if(e.code==='KeyC'){actor.keys.add(e.code);return;}
 const keys:Record<string,string>={KeyQ:'aim',KeyG:'fire',KeyX:'recall',KeyJ:'attack',KeyF:'use',Space:'jump'};
 if(/^Digit[1-6]$/.test(e.code))actor.setElement(Number(e.code.slice(5))-1);
 if(keys[e.code]&&(shot||!['KeyQ','KeyG','KeyX'].includes(e.code)))perform(keys[e.code]);
});
addEventListener('keyup',e=>{if(motion.includes(e.code)||e.code==='KeyC')actor.keys.delete(e.code);});
addEventListener('blur',()=>{if(phase==='play')perform('pause');});
const ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0),ground=new T.Vector3(),marker=new T.Vector3();
stage.renderer.domElement.onpointerdown=(e:PointerEvent)=>{
 if(phase!=='play')return;
 if(shot){
  const pts=aimList();let closest=-1,best=28;
  pts.forEach((p,i)=>{if(i<health.length&&(health[i]<=0||(ceres&&i!==visited.size)))return;
   marker.fromArray(p).project(stage.camera);
   const d=Math.hypot((marker.x+1)*innerWidth*.5-e.clientX,(1-marker.y)*innerHeight*.5-e.clientY);
   if(d<best){closest=i;best=d;}
  });if(closest>=0){aim=closest;fire(pts[closest]);return;}
 }
 ray.setFromCamera(new T.Vector2(2*e.clientX/innerWidth-1,1-2*e.clientY/innerHeight),stage.camera);
 if(ray.ray.intersectPlane(plane,ground)){
  const v:Vec=[T.MathUtils.clamp(ground.x,-5.25,5.25),0,T.MathUtils.clamp(ground.z,-6.15,6.15)];
  if(e.shiftKey&&shot){fire(v);return;}focus=v;
 }
};
let upperClimbed=false;
function updateShots(){
 if(actor.received===lastWorker||!actor.latest)return;lastWorker=actor.received;
 const now=actor.latest.shots;
 for(const v of now){
   const prev=previous.get(v.id);
   if(!prev){origins.set(v.id,pending.shift()??[...actor.position]);continue;}
   if(spent.has(v.id)||!phaseCanHit(prev,v))continue;
   let best=Infinity,who=-1;
   for(let i=0;i<health.length;i++)if(health[i]>0){
    const t=sweptImpact(prev.center,v.center,oldPositions[i],positions[i],.42+v.radius,actor.world);
    if(t!==null&&t<best){who=i;best=t;}
   }
   if(who>=0){
    spent.add(v.id);
    const origin=origins.get(v.id)??actor.position;
    if(ceres&&(who!==visited.size||!near(origin,layout.stations[who].at,1.26))){say('从标有序号的目镜环重新观测');continue;}
    if(tiros&&!active[0]&&!near(origin,layout.stations[0].at,1.8)){say('图像还未标定：留分身给遥测环供电，或登上高台');continue;}
    health[who]=0;visited.add(who);say(ceres?'一个位置落在了观测簿上':'云层扫描完成');
    const next=health.findIndex(h=>h>0);if(next>=0)aim=next;
   }
   else if(ceres&&v.phase==='active'){say('这次未能标定，等光点越过标尺或在目镜环内挪一步');}
 }
 previous=new Map(now.map(v=>[v.id,v]));oldPositions=positions;
 for(const id of origins.keys())if(!previous.has(id)){origins.delete(id);spent.delete(id);}
 const eligible=radio?now.filter(shot=>{
  const origin=origins.get(shot.id);return origin&&near(origin,layout.stations[0].at,1.6);
 }):now;
 active=lamps(layout,eligible);
}
function gameTick(dt:number){
 if(focus){
  const dx=focus[0]-actor.position[0],dz=focus[2]-actor.position[2];for(const k of motion)actor.keys.delete(k);
  if(Math.hypot(dx,dz)<.22)focus=null;
  else{if(Math.abs(dx)>.12)actor.keys.add(dx>0?'KeyD':'KeyA');if(Math.abs(dz)>.12)actor.keys.add(dz>0?'KeyS':'KeyW');}
 }
 if(actor.position[1]<-1.25||Math.abs(actor.position[0])>5.7||Math.abs(actor.position[2])>6.8){
  actor.teleport([...layout.spawn]);focus=null;actor.keys.clear();previous.clear();pending.length=0;say('回到入口，已完成的步骤保留');
 }
 if(shot){
   positions=layout.targets.map((_,i)=>observationPoint(layout,i,time));updateShots();
   if(actor.keys.has('KeyX')&&!actor.latest?.shots.length&&time-contactTime>.3)actor.keys.delete('KeyX');
   if(radio)lockTime=active.length===2&&active.every(Boolean)?lockTime+dt:0;
 }else if(life&&given){
   if(actor.cling&&actor.position[1]>.45)upperClimbed=true;
   if(actor.spread>.64&&near(actor.position,layout.stations[1].at,.91))lower=true;
   const target=actor.combat.targets[0];if(target&&target.hits>lastHits){
    if(lower){if(actor.combat.index===0)comboStart=true;if(actor.combat.index===1&&comboStart){latched=true;visited.add(1);say('压辊咬合，封面纸已送进轮转机');}}
    lastHits=target.hits;
   }
 }
 refresh();
}
stage.camera.fov=53;stage.camera.updateProjectionMatrix();
const clock=new T.Clock(),eye=new T.Vector3(),look=new T.Vector3();
function step(delta:number){
 const dt=Math.min(.05,Math.max(0,delta));if(phase!=='pause'){
 time+=dt;actor.update(time,dt);
 characterHud.update(phase==='play');
 if(phase==='play')gameTick(dt);
 if(phase==='finale'){finale+=dt;if(finale>=3){phase='done';ui.hidden=true;session.finish();}}
 }
 const finish=phase==='finale'||phase==='done',v=actor.position,narrow=innerWidth<700;
 if(finish){eye.set(3.2,3.0,-.45);look.set(0,1.45,-8);}
 else{eye.set(1.45+v[0]*.52,7.3+v[1]*.7+(narrow?1.5:0),9.0+v[2]*.55);look.set(v[0]*.52,.45+v[1]*.32,v[2]*.55-2);}
 stage.camera.position.copy(eye);stage.camera.lookAt(look);stage.camera.updateMatrixWorld();
 art.update(time,progress,finale,visited,active,positions,health,pulse,given,actor.position);stage.render(dt,actor);
}
stage.renderer.setAnimationLoop(()=>step(clock.getDelta()));
(window as any).__slime=actor;(window as any).__level={spec:s,layout,step,health,visited,get phase(){return phase;},get progress(){return progress;},get aim(){return aim;},get active(){return active;},get positions(){return positions;}};

