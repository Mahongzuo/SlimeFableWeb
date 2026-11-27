import './ability.css';
import * as T from 'three';
import {levels} from '../../content/levels/registry';
import {chapterSteps,elementNames,mechanics} from '../../content/ability';
import {Stage} from './stage';
import {Save} from '../game/save';
import {dayIdOf,dayLabel} from '../game/calendar';
import {applyLevelQuality} from '../game/graphics';
import {SlimeCharacter} from '../slime/character';
import {mountSlimeHud} from '../ui/slime-hud';
import type {Vec} from '../slime/types';
import {abilityLayout,initialState,observe,operate,requestRecall,close,type Signals} from '../templates/ability';
import {workshopLook,workshopArt} from '../themes/ability';

const id=new URLSearchParams(location.search).get('id')??'',spec=levels[id];
if(spec?.template!=='ability'||!('mode' in spec)||!('source' in spec))throw Error('未知元素工坊 '+id);
const s=spec,day=id.slice(0,4),l=abilityLayout(s),p=initialState(),recipe=mechanics[s.mode];
const stage=new Stage(workshopLook(s)),art=workshopArt(stage,s,l),save=new Save();
type Phase='intro'|'play'|'pause'|'finale'|'done';
let phase:Phase='intro',time=0,elapsed=0,finale=0,recalling=false,aim=0,lastShot=-1,lastHint='',lastBridge=false;
let destination:Vec|null=null;
let rejectedChecks=0;
const workshopName=s.kind==='memorial'?'和平庭院':recipe.name;
const element=elementNames[s.element],padCount=s.mode==='relay'?1:2;
const shootable=s.mode==='relay'||s.mode==='duet';
const actor=new SlimeCharacter(stage,{world:l.world,spawn:l.spawn,input:false,ui:false,trainingTargets:s.mode==='combo'?[l.target]:[],title:s.title,onToast:()=>{},onReady:()=>{if(phase==='intro')start();}}).attach();
const characterHud = mountSlimeHud(actor, {elements:true, skills:false});
applyLevelQuality(stage,actor,save.data.quality);actor.forward=[0,0,1];
const ui=document.createElement('main');ui.id='ability-ui';
ui.innerHTML='<header><div><small></small><h1></h1></div><button data-action="pause">暂停</button></header><aside hidden><b></b><p></p><small></small></aside><section><small></small><h2></h2><p></p><div class="ab-actions"></div></section><footer hidden><div class="ab-tools"></div></footer><output hidden></output>';
document.body.append(ui);document.title=s.title+' · 史莱姆寓言';
const $=<E extends HTMLElement=HTMLElement>(q:string)=>ui.querySelector(q) as E;
$('header small').textContent=dayLabel(day)+' · '+id.slice(5)+'　 第二扇门';$('h1').textContent=s.title;
function btn(text:string,act:()=>void,parent:HTMLElement,key?:string){
  const b=document.createElement('button');b.textContent=text;if(key)b.dataset.action=key;b.onclick=()=>{act();b.blur();};parent.append(b);return b;
}
const tools=$('.ab-tools'),actions=$('.ab-actions');
function feedback(text:string){$('output').hidden=false;$('output').textContent=text;noticeUntil=time+1.7;}
let noticeUntil=0;
function shoot(to:Vec){
  if(phase!=='play'||!shootable||time-lastShot<.35)return;
  if((actor.latest?.shots.length??0)+actor.commands.length>=5){feedback('已分出五团，先召回');return;}
  lastShot=time;recalling=false;actor.keys.delete('KeyX');actor.launch(to);actor.setMood('Spit',.35);
}
function recall(){if(phase==='play'){requestRecall(p,snapshot());recalling=true;actor.keys.add('KeyX');}}
function attack(){if(phase==='play'&&s.mode==='combo')actor.attack();}
if(shootable){
  if(padCount===2)btn('切换瞄点 Q',()=>{aim=1-aim;},tools,'aim');
  btn('投射 G',()=>shoot(l.pads[aim]),tools,'shoot');btn('收回 X',recall,tools,'recall');
}
if(s.mode==='combo')btn('攻击 J',attack,tools,'attack');
if(s.mode==='circuit')btn('摊开 C',()=>actor.keys.has('KeyC')?actor.keys.delete('KeyC'):actor.keys.add('KeyC'),tools,'spread');
if(s.mode==='climb')btn('弹跳',()=>actor.jump(),tools);
btn('操作 F',interact,tools,'interact');
function snapshot():Signals{
 const target=actor.combat.targets[0];return {position:actor.position,element:actor.element,spread:actor.spread,swimming:actor.swimming,clinging:!!actor.cling,
 shots:actor.latest?.shots??[],hits:target?.hits??0,hitElement:target?.lastElement??-1,combo:actor.combat.index};
}
function hint(){
 if(p.ready)return s.kind==='memorial'?'到后方金环按 F 敲响和平钟':'到后方金环按 F 启动终场';
 switch(s.mode){
  case 'relay':return ['瞄准远岸铜盘投射分身，趁灯亮沿中央桥过岸','保持分身占位，在后方金环切到'+element+'属性并按 F','按 X 收回铜盘上的分身；若它已离开，先再投射一次'][p.step];
  case 'combo':return p.step?'再按 J，衔接第二段并击中木靶':'选择'+element+'属性，面向木靶并靠近，用 J 或点击木靶攻击';
  case 'climb':return '向前持续贴住高台正面，攀上顶面后用'+element+'属性在金环按 F';
  case 'tide':return ['在起点金环切风属性，按 F 校准','切水属性，游过近侧浮标','在水中游过远侧浮标','上远岸金环，按 F 交付样本'][p.step];
  case 'circuit':return p.step?'在后方金环切'+element+'属性，按 C 摊开后按 F':'在起点金环切'+elementNames[(s.element+1)%6]+'属性，按 F 校准';
  case 'duet':return '分别射中两只铜盘，双灯亮时收集'+(s.kind==='memorial'?'白花':'花形印记')+'　'+[1,2,4].filter(bit=>p.flowers&bit).length+'/3';
 }
}
function ringPeaceBell(){
 const audio=new AudioContext(),now=audio.currentTime;
 for(const [hz,volume,length] of [[164.8,.09,3.7],[329.6,.055,2.6],[397,.035,2],[553,.022,1.5]]){
   const osc=audio.createOscillator(),gain=audio.createGain();
   osc.frequency.value=hz;gain.gain.setValueAtTime(.0001,now);
   gain.gain.exponentialRampToValueAtTime(volume,now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+length);
   osc.connect(gain).connect(audio.destination);osc.start(now);osc.stop(now+length);
 }
 setTimeout(()=>{void audio.close();},4000);
}
function interact(){
 if(phase!=='play')return;
 const previous=p.step,ready=p.ready;noticeUntil=0;
 if(operate(s,l,p,snapshot())){if(s.kind==='memorial'&&typeof AudioContext!=='undefined')ringPeaceBell();noticeUntil=0;phase='finale';actor.mode='observe';actor.keys.clear();destination=null;finale=0;actor.setMood('Happy',2);panel();}
 else if(previous===p.step&&ready===p.ready){rejectedChecks++;feedback(hint());}
}
function home(){save.data.selectedDay=dayIdOf(new Date())===day?null:day;save.write();location.assign('./?from='+id+'&date='+day);}
function start(){if(!actor.ready||phase!=='intro')return;save.add('visited',id);phase='play';actor.mode='play';actor.forward=[0,0,-1];panel();}
function pause(){if(phase==='play'){phase='pause';actor.keys.clear();destination=null;}else if(phase==='pause'){phase='play';}panel();}
function panel(){
  characterHud.update(phase === 'play');
  $('section').hidden=phase==='play';$('aside').hidden=$('footer').hidden=phase!=='play';$('[data-action=pause]').hidden=phase!=='play';actions.replaceChildren();
  $('section small').textContent=workshopName;$('h2').textContent=phase==='intro'?'这一天':phase==='pause'?'时光暂停':phase==='done'?s.souvenir:s.kind==='memorial'?'和平钟声':s.id==='0804-2007'?'凤凰号升空':'工坊已点亮';
  $('section p').textContent=phase==='intro'?s.fact+'　游戏演绎：'+chapterSteps(s).join(' → '):phase==='done'?'已收进史书 · 用时 '+elapsed.toFixed(1)+' 秒 · 无效校验 '+rejectedChecks+' 次':phase==='pause'?hint():s.fact;
  if(phase==='intro'){btn(actor.ready?'走进工坊':'身体正在凝聚…',start,actions,'start').disabled=!actor.ready;const a=document.createElement('a');a.href=s.source;a.target='_blank';a.rel='noopener noreferrer';a.textContent='史料';actions.append(a);}
  if(phase==='pause')btn('继续',pause,actions);
  if(phase==='done'||phase==='pause')btn('重玩',()=>location.reload(),actions);
  if(phase!=='finale'&&phase!=='play')btn('回到凝露港',home,actions,'home');
}
$('[data-action=pause]').onclick=pause;
const motionKeys=new Set(['KeyW','KeyA','KeyS','KeyD']);
addEventListener('keydown',e=>{
 if(e.ctrlKey||e.metaKey||e.altKey)return;
 if(e.code==='Escape'&&!e.repeat&&(phase==='pause'||phase==='play')){pause();return;}
 if(phase==='intro'&&e.code==='Enter'){start();return;}if(phase!=='play')return;
 if(motionKeys.has(e.code)){if(destination)actor.keys.clear();destination=null;actor.keys.add(e.code);return;}
 if(e.code==='Space')e.preventDefault();if(e.repeat)return;
 if(/^Digit[1-6]$/.test(e.code))actor.setElement(Number(e.code.slice(5))-1);
 if(e.code==='KeyF')interact();if(e.code==='KeyJ')attack();if(e.code==='KeyX')recall();
 if(e.code==='KeyG')shoot(l.pads[aim]);if(e.code==='KeyQ'&&padCount===2)aim=1-aim;
 if(e.code==='KeyC')actor.keys.add('KeyC');if(e.code==='Space')actor.jump();
});
addEventListener('keyup',e=>{if(motionKeys.has(e.code)||e.code==='KeyC')actor.keys.delete(e.code);});
addEventListener('blur',()=>{if(phase==='play')pause();});
const ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0),hit=new T.Vector3();
stage.renderer.domElement.onpointerdown=(e:PointerEvent)=>{
 if(phase!=='play')return;
 ray.setFromCamera(new T.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),stage.camera);
 plane.constant=0;if(!ray.ray.intersectPlane(plane,hit))return;
 const ground:Vec=[hit.x,0,hit.z];
 if(shootable){const pad=l.pads.slice(0,padCount).findIndex(v=>close(v,ground,.9));if(pad>=0){aim=pad;shoot(ground);return;}if(e.shiftKey){shoot(ground);return;}}
 if(s.mode==='combo'&&close(ground,l.target,1)&&close(actor.position,l.target,1.75)){actor.forward=[(l.target[0]-actor.position[0]),0,l.target[2]-actor.position[2]];const n=Math.hypot(...actor.forward)||1;actor.forward[0]/=n;actor.forward[2]/=n;attack();return;}
 destination=[T.MathUtils.clamp(hit.x,-4.7,4.7),0,T.MathUtils.clamp(hit.z,-5.4,5.4)];
};
const eye=new T.Vector3(),look=new T.Vector3(),aimPoint=new T.Vector3();
function frame(delta:number){
 const dt=Math.max(0,Math.min(.05,delta));
 if(phase!=='pause'){
  time+=dt;if(phase==='play'){
   elapsed+=dt;
   if(destination){const dx=destination[0]-actor.position[0],dz=destination[2]-actor.position[2];
    for(const k of motionKeys)actor.keys.delete(k);
    if(Math.abs(dx)>.12)actor.keys.add(dx>0?'KeyD':'KeyA');if(Math.abs(dz)>.12)actor.keys.add(dz>0?'KeyS':'KeyW');
    if(Math.hypot(dx,dz)<.15)destination=null;
   }
  }
  actor.update(time,dt);
  characterHud.update(phase === 'play');
  if(phase==='play'){
   const a=snapshot();observe(s,l,p,a);
   if(recalling&&!a.shots.length){actor.keys.delete('KeyX');recalling=false;}
   if(s.mode==='relay'&&p.contact[0]!==lastBridge){lastBridge=p.contact[0];l.bridge.min[1]=lastBridge?-.2:-4;l.bridge.max[1]=lastBridge?0:-3.8;actor.syncBox(0);}
   if(actor.position[1]<-1.5||Math.abs(actor.position[0])>5.2||Math.abs(actor.position[2])>6){actor.teleport([...l.spawn]);actor.velocity=[0,0,0];destination=null;p.lastZ=l.spawn[2];for(const k of motionKeys)actor.keys.delete(k);}
   const msg=hint();if(msg!==lastHint){$('aside p').textContent=msg;lastHint=msg;}
   $('aside b').textContent=workshopName+'　·　'+elementNames[actor.element]+'属性';
   $('aside small').textContent='WASD 或点击地面移动'+(shootable?' · 点击铜盘投射，当前瞄点 '+(aim+1):'');
  }
  if(phase==='finale'){finale+=dt;if(finale>3.3){phase='done';const r=save.data.life.records;r[id+'-checks']=Math.min(r[id+'-checks']??Infinity,rejectedChecks);r[id+'-ms']=Math.min(r[id+'-ms']||Infinity,Math.max(1,Math.round(elapsed*1000)));save.add('completed',id);save.add('souvenirs',id);save.write();panel();}}
 }
 $('output').hidden=time>noticeUntil||phase!=='play';
 const terminal=phase==='finale'||phase==='done',v=actor.position;
 // The native controller updates its camera before this elevated workshop view.
 const narrow=innerWidth<650;eye.set(terminal?4.5:2.4,terminal?3.8:narrow?8.7:6.8,terminal?1.8:10.1+v[2]*.32);
 aimPoint.set(terminal?.5:v[0]*.29,terminal?3+Math.min(finale,3)*.42:.95,terminal?-8:-2.2+v[2]*.32);
 look.lerp(aimPoint,1-Math.exp(-dt*6));stage.camera.position.copy(eye);stage.camera.lookAt(look);
 art.update(p,time,finale);stage.render(dt,actor);
}
stage.camera.fov=54;stage.camera.updateProjectionMatrix();panel();
const clock=new T.Clock();stage.renderer.setAnimationLoop(()=>frame(clock.getDelta()));
(window as any).__slime=actor;(window as any).__level={spec:s,layout:l,puzzle:p,step:frame,get phase(){return phase;}};
