import {bindHelpHint,readingHelp} from './help-state';
import * as T from 'three';
import {session} from './mode-session';
import {Stage} from './stage';
import {SlimeCharacter} from '../slime/character';
import type {Vec} from '../slime/types';
import {applyLevelQuality} from '../game/graphics';
import {Save} from '../game/save';
import {ArenaEncounter,rpgConfigFor} from '../templates/january-rpg';
import {arenaLook,buildArena} from '../themes/january-rpg';
import './january-rpg.css';
import {seasonExhibit} from './season-entry';
import {Expedition,isExpedition} from '../templates/season-rpg';
import {buildExpeditionSet} from '../themes/season-rpg';

import {Voyage,isVoyageDay} from '../templates/december-voyage';
import {buildVoyageSet} from '../themes/december-voyage';

import {WinterVoyage,isWinterVoyage} from '../templates/winter-voyage';
import {buildWinterVoyageSet,winterLooks} from '../themes/winter-voyage';
import {isMidwinterVoyage,MidwinterVoyage} from '../templates/midwinter-voyage';
import {buildMidwinterVoyageSet,midwinterLooks} from '../themes/midwinter-voyage';
import {isYearendVoyage,YearendVoyage} from '../templates/yearend-voyage';
import {buildYearendVoyageSet,yearendLooks} from '../themes/yearend-voyage';
import {isMonthendVoyage,MonthendVoyage} from '../templates/monthend-voyage';
import {buildMonthendVoyageSet,monthendLooks,monthendEntrySide} from '../themes/monthend-voyage';
import {isNewyearVoyage,NewyearVoyage} from '../templates/newyear-voyage';
import {buildNewyearVoyageSet,newyearLooks} from '../themes/newyear-voyage';
const {spec}=session, config=rpgConfigFor(spec.day), arena=config.arena;
const winter=spec.day==='0101';
const exhibit=seasonExhibit(spec.id);
const previousExpedition=isExpedition(spec.day)?new Expedition(spec.day,session.seed,config):null;
const voyage=isVoyageDay(spec.day)?new Voyage(spec.day,session.seed,config):null;
const newVoyage=isWinterVoyage(spec.day)?new WinterVoyage(spec.day,session.seed,config):null;
const midwinter=isMidwinterVoyage(spec.day)?new MidwinterVoyage(spec.day,session.seed,config):null;
const yearend=isYearendVoyage(spec.day)?new YearendVoyage(spec.day,session.seed,config):null;
const monthend=isMonthendVoyage(spec.day)?new MonthendVoyage(spec.day,session.seed,config):null;
const newyear=isNewyearVoyage(spec.day)?new NewyearVoyage(spec.day,session.seed,config):null;
const peaceful=newyear??monthend??yearend??midwinter??newVoyage;
const expedition=previousExpedition??voyage??peaceful;
const battle=expedition??new ArenaEncounter(arena,session.seed,config);
const look=arenaLook(arena,config);
if(voyage?.day==='1203'||voyage?.day==='1204'){
  look.skyTop='#0a1424';look.skyHorizon=voyage.day==='1203'?'#242139':'#152d43';
  look.wash='#a9b9bc';look.sunIntensity=1.94;
}
if(newyear)Object.assign(look,newyearLooks[newyear.day]);
if(monthend)Object.assign(look,monthendLooks[monthend.day]);
if(yearend)Object.assign(look,yearendLooks[yearend.day]);
if(midwinter)Object.assign(look,midwinterLooks[midwinter.day]);
if(newVoyage)Object.assign(look,winterLooks[newVoyage.day]);
const stage=new Stage(look),set=previousExpedition?buildExpeditionSet(stage,previousExpedition):null;
const theater=newyear?buildNewyearVoyageSet(stage,newyear):monthend?buildMonthendVoyageSet(stage,monthend):yearend?buildYearendVoyageSet(stage,yearend):midwinter?buildMidwinterVoyageSet(stage,midwinter):newVoyage?buildWinterVoyageSet(stage,newVoyage):voyage?buildVoyageSet(stage,voyage):null;
const art=set||theater?null:buildArena(stage,arena,config);
const actor=new SlimeCharacter(stage,{world:(set??theater??art!).world,spawn:battle.layout.spawn,input:false,ui:false,
  trainingTargets:[],title:spec.title,onReady:()=>{if(!started){started=true;panel.querySelector('.season-preview')?.remove();session.start();actor.mode='play';updatePanel();}}}).attach();
applyLevelQuality(stage,actor,new Save().data.quality);
const ui=document.createElement('main');ui.id='january-rpg';ui.dataset.arena=arena;
if(peaceful)ui.dataset.exhibition='winter';
if(winter)ui.dataset.rink='winter';
ui.innerHTML='<header><div><small></small><h1></h1></div><button data-home>回港</button></header><div class="jr-status" hidden><b></b><span></span><progress></progress></div><section><h2></h2><p></p><button data-start></button></section><aside hidden><strong></strong><p></p></aside><footer hidden><button data-leap>弹跳</button><button data-dash>闪避</button><button data-guard>摊开</button><button data-hit></button><button data-act>确认 F</button></footer>';
document.body.append(ui);
const $=<E extends HTMLElement=HTMLElement>(q:string)=>ui.querySelector(q) as E;
$('header small').textContent=Number(spec.day.slice(0,2))+' 月 '+Number(spec.day.slice(2))+' 日　·　6 号门 · 战斗 RPG';
$('h1').textContent=spec.title;$('[data-hit]').textContent=battle.rules.verb+' J';
if(peaceful)$('[data-dash]').textContent='滑步';
$('[data-home]').onclick=session.home;
let started=false,paused=false,time=0,finale=0,closed=false,guardUntil=0,dashUntil=0,lastDash=-10,lastHit=-10;
let dashOrigin:Vec|null=null;
let destination:Vec|null=null;
const walking=['KeyW','KeyA','KeyS','KeyD'];
const panel=$('section'),startButton=$<HTMLButtonElement>('[data-start]');
exhibit.preview(panel);
const hintBody=$('aside p'),hintTitle=$('aside strong'),status=$('.jr-status');
const statusName=$('.jr-status b'),statusNumbers=$('.jr-status span'),meter=$<HTMLProgressElement>('progress');
const choices=battle.rules.routes.join('　／　');
let warmStart:Vec|null=null,warmCorner:Vec|null=null,slid=false,resetShotAt=0;
function updatePanel(){
  const modal=!started||battle.phase==='lost'||paused;
  panel.hidden=!modal;$('aside').hidden=modal;$('footer').hidden=modal||battle.phase==='curtain';
  status.hidden=modal||battle.phase!=='duel';
  if(modal){
    $('h2').textContent=!started?spec.title:paused?'暂停':'再试这一轮';
    const opening=config.opening??spec.fact;
    $('section p').textContent=!started?opening+'　游戏演绎 · '+spec.goal+'。点击地面或按 WASD 移动。':paused?spec.goal:'保留已选能力和突破进度。';
    if(!started&&expedition)$('section p').textContent=spec.fact+'　'+expedition.opening;
    startButton.textContent=!started?(actor.ready?'进入场地':'凝聚身体中…'):paused?'继续':'回到检查点';
    startButton.disabled=!actor.ready;return;
  }
  const phase=battle.phase;
  hintTitle.textContent=phase==='warmup'?'热身标记':phase==='route'?'选择一条路线':phase==='duel'?
    (battle.cue==='open'?'现在出手':battle.cue==='strike'?'避开封锁':'观察对手') : battle.rules.ending;
  const side=battle.blocked>0?'左':'右';
  hintBody.textContent=phase==='warmup'?'走入前方光环，弹跳或摊开一次，按 F 完成热身。':
    phase==='route'?'左 · '+battle.rules.routes[0]+'　右 · '+battle.rules.routes[1]+'。到对应光环按 F 装备。':
    phase==='duel'?('去'+side+'侧光圈。'+(battle.cue==='open'?(arena==='stage'?(battle.route===-1?'摊开压住制动板，按 J 击打关节。':'跳起并按 J 击打悬线关节。'):arena==='field'&&battle.route===-1?'按闪避冲过推进线。':'按 J '+battle.rules.verb+'。'):battle.cue==='strike'?'避过攻击，等反击窗口。':'看对手的重心，先换位。')) :
    phase==='finale'?'到远端的光圈按 F，亲手完成收尾。':'';
  if(phase==='duel'){
    statusName.textContent=battle.rules.boss+'　·　'+battle.rules.routes[battle.route===-1?0:1];
    statusNumbers.textContent='体力 '+battle.health+'/3　　'+Math.min(battle.round,battle.rules.rounds)+' / '+battle.rules.rounds;
    meter.value=battle.clock;meter.max=1;
  }
  if(winter){
    if(phase==='warmup')hintBody.textContent=slid?'松开摊开，收身转向蓝线，在热身圈按 F。':'在前方蓝线附近摊开，滑半个身位，再收身急转。';
    if(phase==='duel'){
      hintTitle.textContent=battle.keeperMotion==='shoulder'?'门将转肩':battle.keeperMotion==='edge'?'冰刀压刃':battle.cue==='open'?'球门露出空侧':'门将扑出';
      hintBody.textContent=battle.cue==='open'?'切到门将伸手的另一侧，按 J 射门。':
        battle.route===-1?'带球引开他的肩膀；按 Shift 横切空侧。':'等他移刃，摊开接球可延长出手时间。';
    }
    if(phase==='finale')hintBody.textContent='冰球已兜进网底，滑向球门前的球灯领取票根。';
  }
  if(peaceful&&phase==='finale')hintBody.textContent='走入远端金环，按 F '+peaceful.design.end+'。';
  if(expedition&&phase==='duel'){
    hintTitle.textContent=expedition.title;hintBody.textContent=expedition.hint;
    statusName.textContent=battle.rules.routes[battle.route<0?0:1];
    statusNumbers.textContent='第 '+(battle.round+1)+' 段　·　余力 '+battle.health+' / 3';
  }
  $('[data-act]').hidden=phase==='duel';$('[data-hit]').hidden=phase!=='duel';
}
startButton.onclick=()=>{
  if(!actor.ready)return;
  if(!started){started=true;panel.querySelector('.season-preview')?.remove();session.start();actor.mode='play';}
  else if(paused){paused=false;actor.mode='play';}
  else if(battle.phase==='lost'){battle.retry();actor.teleport([0,0,battle.z+1.8]);}
  updatePanel();startButton.blur();
};
let warmed=false;
let guardHeld=false;
function active(){return started&&!paused&&battle.phase!=='lost'&&battle.phase!=='curtain';}
function leap(){if(active()){actor.jump();if(!winter&&battle.near(actor.position,battle.layout.warm,2.2))warmed=true;}}
function guard(){if(active()){
  guardUntil=time+.95;actor.keys.add('KeyC');
  if(battle.near(actor.position,battle.layout.warm,2.4)){
    if(winter){if(!warmStart)warmStart=[...actor.position];}
    else warmed=true;
  }
}}
function dash(){
  if(!active()||time-lastDash<(arena==='ice'&&battle.route===-1?.65:1.15))return;
  const dx=actor.keys.has('KeyA')?-1:actor.keys.has('KeyD')?1:Math.sign(actor.forward[0]);
  const dz=dx?0:actor.forward[2]||-1;
  lastDash=time;dashUntil=time+.48;actor.setMood('Happy',.3);
  if(expedition)dashOrigin=[...actor.position];
  if(!expedition&&arena==='field'&&battle.route===-1&&battle.phase==='duel'&&battle.cue==='open')hit();
  actor.position=actor.world.moveCapsule(actor.position,[dx*1.25,0,dz*1.25]).position;
}
function hit(){
  if(!active()||battle.phase!=='duel'||time-lastHit<(winter?.91:.3)||resetShotAt)return;
  if(peaceful)actor.setMood('Happy',.28);else actor.attack();
  lastHit=time;
  let contact=actor.position;
  if(expedition&&dashOrigin&&time<dashUntil&&(expedition.day==='1128'||expedition.day==='1201'||expedition.day==='1205')){
    const dx=contact[0]-dashOrigin[0],dz=contact[2]-dashOrigin[2],goal=expedition.safeSpot;
    const t=T.MathUtils.clamp(((goal[0]-dashOrigin[0])*dx+(goal[2]-dashOrigin[2])*dz)/(dx*dx+dz*dz||1),0,1);
    contact=[dashOrigin[0]+t*dx,contact[1],dashOrigin[2]+t*dz];
  }
  if(newyear?.day==='0103'&&newyear.route>0&&newyear.fill<1&&newyear.near(contact,newyear.source,1.36)&&!newyear.anchorHeld){
    actor.launch([...newyear.anchorSpot]);newyear.anchorShots++;
  }
  if(battle.strike(contact,{guard:actor.spread>.32,airborne:!actor.grounded,dashing:time<dashUntil})){art?.shot(actor.position[0],actor.position[2]);actor.setMood('Happy',.8);}
  else if(winter){
    art?.shot(actor.position[0],actor.position[2],false);
    battle.missedShot();resetShotAt=time+.82;feedback('冰球擦开了。回到门前，再试这一次出手。');
  }else feedback(battle.message);
}
let feedbackEnd=0;
function feedback(msg:string){hintBody.textContent=msg;feedbackEnd=time+1;}
function interact(){
  if(!active())return;
  if(battle.phase==='warmup'&&!warmed){feedback(winter?'在蓝线附近摊开滑行，再松开收身。':'在前方热身圈弹跳或摊开一次。');return;}
  if(!battle.interact(actor.position)){feedback('先走进对应的光环。');return;}
  if(battle.phase==='curtain'){
    actor.keys.clear();destination=null;actor.mode='observe';
    if(!expedition)recordRoute();
  }
  feedbackEnd=0;updatePanel();
}
function recordRoute(){
    const save=new Save(),records=save.data.life.records,key=spec.saveId+(session.practice?'-practice':'-daily');
    records[key+'-routes']=(records[key+'-routes']??0)|(battle.route===-1?1:2);
    if(!battle.errors)records[key+'-clean']=1;
    save.write();
}
$('[data-leap]').onclick=leap;
$('[data-guard]').onclick=()=>{
  if(!newyear?.chapter&&(!winter||battle.phase!=='warmup')){guard();return;}
  if(!active())return;
  guardHeld=!guardHeld;
  if(guardHeld)guard();else guardUntil=time;
  $('[data-guard]').textContent=guardHeld?'收身':'摊开';
};
$('[data-dash]').onclick=dash;$('[data-act]').onclick=interact;$('[data-hit]').onclick=hit;
addEventListener('keydown',e=>{
  if(e.metaKey||e.ctrlKey)return;
  if(e.code==='Enter'&&!started){startButton.click();return;}
  if(e.code==='Escape'&&started&&battle.phase!=='lost'&&battle.phase!=='curtain'){paused=!paused;actor.keys.clear();destination=null;actor.mode=paused?'paused':'play';updatePanel();return;}
  if(!active())return;
  if(walking.includes(e.code)){if(destination)actor.keys.clear();destination=null;actor.keys.add(e.code);return;}
  if(e.code==='Space')e.preventDefault();if(e.repeat)return;
  if(e.code==='Space')leap();if(e.code==='KeyC'){guardHeld=true;guard();}if(e.code==='ShiftLeft'||e.code==='ShiftRight')dash();
  if(e.code==='KeyJ')hit();if(e.code==='KeyF')interact();
});
addEventListener('keyup',e=>{if(e.code==='KeyC'){guardHeld=false;if(winter)guardUntil=time;return;}actor.keys.delete(e.code);});
addEventListener('blur',()=>{guardHeld=false;actor.keys.clear();destination=null;});
const ray=new T.Raycaster(),pointer=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),0),groundHit=new T.Vector3();
stage.renderer.domElement.addEventListener('pointerdown',(e:PointerEvent)=>{
  if(!active())return;
  pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(pointer,stage.camera);
  if(ray.ray.intersectPlane(plane,groundHit))destination=[T.MathUtils.clamp(groundHit.x,-5.65,5.65),0,T.MathUtils.clamp(groundHit.z,-10.6,9)];
});
const view=new T.Vector3(),aim=new T.Vector3();
let previousHUD='',readyLast=false;
bindHelpHint(()=>!started?(expedition?.opening??spec.goal):battle.phase==='duel'&&expedition?expedition.title+'　'+expedition.hint:hintBody.textContent||spec.goal);
function frame(delta:number){
  if(readingHelp())return;
  const dt=Math.min(.06,Math.max(0,delta));
  if(!paused)time+=dt;
  if(!guardHeld&&time>guardUntil)actor.keys.delete('KeyC');
  if(destination&&active()){
    const dx=destination[0]-actor.position[0],dz=destination[2]-actor.position[2];
    for(const key of walking)actor.keys.delete(key);
    if(Math.abs(dx)>.15)actor.keys.add(dx>0?'KeyD':'KeyA');
    if(Math.abs(dz)>.15)actor.keys.add(dz>0?'KeyS':'KeyW');
    if(Math.hypot(dx,dz)<.22)destination=null;
  }
  if(!paused){
    actor.update(time,dt);
    if(active()){
      if(newyear?.day==='0103')newyear.syncAnchor(actor.latest?.shots??[]);
      if(winter&&battle.phase==='warmup'&&warmStart){
        if(actor.keys.has('KeyC')&&actor.spread>.15&&Math.hypot(actor.position[0]-warmStart[0],actor.position[2]-warmStart[2])>.38){
          slid=true;warmCorner??=[...actor.position];warmCorner[0]=actor.position[0];warmCorner[2]=actor.position[2];
        }
        if(warmCorner&&!warmed&&!actor.keys.has('KeyC')&&actor.spread<.17){
          const dx=actor.position[0]-warmCorner[0],dz=actor.position[2]-warmCorner[2];
          const sx=warmCorner[0]-warmStart[0],sz=warmCorner[2]-warmStart[2];
          const moved=Math.hypot(dx,dz);
          warmed=moved>.16&&dx*sx+dz*sz<moved*Math.hypot(sx,sz)*.5;
        }
      }
      if(resetShotAt&&time>=resetShotAt){
        actor.teleport([0,0,battle.z+1.1]);destination=null;actor.keys.clear();resetShotAt=0;
      }
      if(!resetShotAt)battle.advance(dt,actor.position,actor.spread>.32,time<dashUntil);
      if(actor.position[1]<-1.8){
        const worktop=newyear||monthend||yearend||midwinter&&(midwinter.day==='1212'||midwinter.day==='1214');
        const checkpoint=worktop&&battle.phase==='duel'?peaceful!.nextSpot:worktop&&battle.phase==='finale'?battle.layout.end:battle.layout.spawn;
        actor.teleport(worktop?[checkpoint[0],checkpoint[1]+.14,checkpoint[2]]:checkpoint);destination=null;
      }
      if(battle.phase==='lost'){actor.keys.clear();destination=null;}
    }
    if(battle.phase==='curtain'){finale+=dt;if(finale>=1.9&&!closed){closed=true;exhibit.finish(()=>{if(expedition)recordRoute();session.finish();});}}
  }
  const p=actor.position,narrow=innerWidth<620,terminal=battle.phase==='curtain';
  const baseZ=started?p[2]:2;
  view.set(terminal?4:started?p[0]*.48:4.2,terminal?4:started?(narrow?7.4:5.9):8.1,
    terminal?-2:baseZ+(started?(narrow?8.6:7.7):11));
  aim.set(terminal?0:started?p[0]*.55:0,terminal?1.8:.7,terminal?-9:baseZ-(started?2.7:4));
  if(winter&&(!started||battle.phase==='warmup')){
    view.set(!started?.42:p[0]*.68,2.3,baseZ+(!started?10.5:4.1));aim.set(0,.59,2.1);
  }else if(winter&&battle.phase==='duel'){
    view.set(p[0]*.71,narrow?6.2:4.85,Math.max(p[2],battle.z)+(narrow?7.7:7));aim.set(p[0]*(narrow?.65:.40),.63,p[2]-(narrow?2.85:3.4));
  }
  if(expedition){
    if(!started){
      view.set(narrow?1.3:3.7,narrow?5.2:6.5,narrow?10:11.3);
      aim.set(0,1.05,-4.8);
    }else if(!terminal){
      view.set(p[0]*(narrow?.83:.48),narrow?7.1:5.8,p[2]+(narrow?7.8:7.1));
      aim.set(p[0]*(narrow?.78:.48),.52,p[2]-2.3);
      if(narrow){
        const choice=battle.phase==='route';
        const goal=battle.phase==='warmup'?battle.layout.warm:battle.phase==='finale'?battle.layout.end:expedition.nextSpot;
        const center=choice?0:(p[0]+goal[0])*.5;
        const width=choice?7.9:Math.abs(p[0]-goal[0])+2.55;
        const fit=width/(2*Math.tan(stage.camera.fov*Math.PI/360)*stage.camera.aspect);
        const distance=Math.max(10.7,fit);
        const centerZ=choice?(p[2]+1.5)*.5:(p[2]+goal[2])*.5;
        aim.set(center,.42,centerZ-.48);view.set(center,distance*.64,centerZ+distance*.79);
      }
    }else if(voyage?.day==='1206'){
      view.set(narrow?3.2:4.4,8.15,-2.75);aim.set(0,5.45,-11.55);
    }else{view.set(4.1,3.35,-1.3);aim.set(0,1.55,-10.6);}
  }
  if(newyear&&terminal){
    const scenes:Record<string,number[]>={'0102':[2.61,2.66,-3.08,2.26],'0103':[2.09,2.92,-5.84,1.83],'0104':[1.39,2.57,-4.76,2.19],'0105':[2.41,3.10,-4.83,2.12],'0106':[2.41,2.82,-4.65,1.99],'0107':[1.42,3.23,-4.26,2.23],'0108':[2.03,3.06,-4.82,2.37],'0109':[2.1,3.11,-4.61,2.32],'0110':[1.71,3.02,-4.55,2.13]};
    const [x,y,z,focus]=scenes[newyear.day];view.set(x,y,z+(narrow?4.76:0));aim.set(newyear.day==='0102'?.94:0,focus,-11.53);
  }
  if(newyear&&battle.phase==='warmup'){
    const field=newyear.day==='0102';view.set(p[0]+(narrow?.16:field?.81:2.01),narrow?4.45:field?1.83:2.71,p[2]+(narrow?9.15:field?4.31:4.72));
    aim.set(field?0:-1.12,field?1.32:1.05,p[2]-(field?8.23:4.84));
  }
  if(newyear?.day==='0102'&&battle.phase==='duel'&&newyear.engaged&&newyear.fill){
    view.set(p[0]*.51,narrow?4.70:2.68,p[2]+(narrow?8.70:4.38));aim.set(0,1.62,p[2]-5.44);
  }
  if(monthend&&terminal){
    const raised=['1223','1225','1227','1229'].includes(monthend.day);
    view.set(raised?2.84:1.51,raised?3.65:2.32,narrow?-.80:-5.55);aim.set(0,raised?1.36:1.65,-11.51);
  }
  if(monthend&&battle.phase==='warmup'){
    const s=monthendEntrySide(monthend.day);view.set(p[0]-(narrow?.53:2.20)*s,narrow?4.12:2.72,p[2]+(narrow?9.05:4.82));
    aim.set(p[0]*.28+s*1.19,1.02,p[2]-4.65);
  }
  if(yearend&&terminal){
    const shots={'1217':[[1.31,1.81,-7.27],[0,1.46,-11.67]],'1218':[[1.38,4.39,-8.43],[0,1.41,-11.65]],'1219':[[1.73,2.49,-5.05],[0,2.50,-12.11]],
      '1220':[[1.45,1.65,-4.08],[0,1.72,-12.88]],'1221':[[1.38,2.42,-6.95],[0,1.78,-11.66]]};
    const [eye,goal]=shots[yearend.day];view.set(eye[0],eye[1],eye[2]+(narrow?4.89:0));aim.set(goal[0],goal[1],goal[2]);
  }
  if(yearend&&battle.phase==='warmup'){
    const shots={'1217':[1.50,2.01,4.73,-1.02],'1218':[-1.64,3.02,4.65,.98],'1219':[1.84,2.63,4.72,-1.23],
      '1220':[2.07,2.05,4.69,-1.07],'1221':[1.95,2.55,4.73,-1.27]};
    const [x,y,z,focus]=shots[yearend.day];view.set(p[0]+(narrow?focus*.31:x),narrow?4.12:y,p[2]+(narrow?9.02:z));aim.set(p[0]*.29+focus,.92,p[2]-4.88);
  }
  if(midwinter&&terminal){
    const shots={ '1212':[[2.31,2.86,-4.98],[-.17,1.83,-11.93]], '1213':[[1.54,3.45,-7.68],[.24,1.02,-11.49]],
      '1214':[[2.08,2.41,-6.18],[.12,1.52,-11.76]], '1215':[[2.27,2.52,-5.51],[-.12,1.13,-10.76]], '1216':[[1.10,2.80,-6.21],[0,2.43,-11.92]] };
    const [eye,focus]=shots[midwinter.day];view.set(eye[0],eye[1],eye[2]+(narrow?4.8:0));aim.set(focus[0],focus[1],focus[2]);
  }
  if(midwinter&&battle.phase==='warmup'&&!narrow){
    const side=midwinter.day==='1213'||midwinter.day==='1216'?-1:1;
    const optics=midwinter.day==='1214',platform=midwinter.day==='1212';
    view.set(p[0]+(optics?2.72:1.63)*side,optics?3.48:platform?2.82:2.57,p[2]+(optics?4.21:4.85));
    aim.set(optics?-1.37:platform?-.81:0,optics?1.04:.85,p[2]-(optics?4.94:5.55));
  }
  if(midwinter&&narrow&&battle.phase==='warmup'&&(midwinter.day==='1214'||midwinter.day==='1212')){
    const x=(p[0]-.9)*.55;view.set(x,4.55,p[2]+9.48);aim.set(x-.59,.9,p[2]-5.12);
  }
  if(newVoyage&&battle.phase==='warmup'&&!narrow){
    const entrance:Record<string,[number,number,number]>={'1207':[1.7,2.37,4.7],'1208':[-1.5,2.75,4.8],'1209':[1.25,2.52,4.95],'1210':[-1.42,2.64,4.88],'1211':[1.55,2.8,4.95]};
    const [x,y,z]=entrance[newVoyage.day];view.set(p[0]+x,y,p[2]+z);aim.set(0,.73,p[2]-5.4);
  }
  stage.camera.position.copy(view);stage.camera.lookAt(aim);
  if(theater)theater.update(time,finale);
  else if(set&&previousExpedition)set.update(previousExpedition,time,dt,finale);
  else art!.update(battle,time,dt,finale,winter&&started?p:undefined);
  const key=[battle.phase,battle.round,battle.turn,battle.cue,winter?battle.keeperMotion:'',previousExpedition?.sampled,previousExpedition?.braced,previousExpedition?.depth,voyage?.engaged,peaceful?.engaged,midwinter?.steps,yearend?.steps,newyear?.steps,newyear?.fill,newyear?.anchorHeld,newyear&&Math.floor(newyear.displacement*10),monthend?.steps,monthend?.fill,monthend?.pulses&&monthend.engaged&&monthend.window,monthend&&Math.floor(monthend.displacement*10),slid,warmed,battle.health,paused,actor.ready].join('/');
  if((!feedbackEnd||time>=feedbackEnd)&&(key!==previousHUD||readyLast!==actor.ready||feedbackEnd)){
    previousHUD=key;readyLast=actor.ready;feedbackEnd=0;updatePanel();
  }
  if(battle.phase==='duel')meter.value=expedition?(previousExpedition?.day==='1128'?previousExpedition.tide:expedition.day==='1127'||expedition.day==='1201'?expedition.fill:battle.clock):battle.clock;
  stage.render(dt,actor);
}
stage.camera.fov=52;stage.camera.updateProjectionMatrix();updatePanel();
const timer=new T.Clock();stage.renderer.setAnimationLoop(()=>frame(timer.getDelta()));
window.__slime=actor;(window as any).__level={spec,battle,stage,step:frame,get phase(){return battle.phase;},get warmed(){return warmed;},choices};
