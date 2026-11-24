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

const {spec}=session, config=rpgConfigFor(spec.day), arena=config.arena;
const battle=new ArenaEncounter(arena,session.seed,config);
const stage=new Stage(arenaLook(arena,config)),art=buildArena(stage,arena,config);
const actor=new SlimeCharacter(stage,{world:art.world,spawn:battle.layout.spawn,input:false,ui:false,
  trainingTargets:[],title:spec.title}).attach();
applyLevelQuality(stage,actor,new Save().data.quality);
const ui=document.createElement('main');ui.id='january-rpg';ui.dataset.arena=arena;
ui.innerHTML='<header><div><small></small><h1></h1></div><button data-home>回港</button></header><div class="jr-status" hidden><b></b><span></span><progress></progress></div><section><h2></h2><p></p><button data-start></button></section><aside hidden><strong></strong><p></p></aside><footer hidden><button data-leap>弹跳</button><button data-dash>闪避</button><button data-guard>摊开</button><button data-hit></button><button data-act>确认 F</button></footer>';
document.body.append(ui);
const $=<E extends HTMLElement=HTMLElement>(q:string)=>ui.querySelector(q) as E;
$('header small').textContent=Number(spec.day.slice(0,2))+' 月 '+Number(spec.day.slice(2))+' 日　·　6 号门 · 战斗 RPG';
$('h1').textContent=spec.title;$('[data-hit]').textContent=battle.rules.verb+' J';
$('[data-home]').onclick=session.home;
let started=false,paused=false,time=0,finale=0,closed=false,guardUntil=0,dashUntil=0,lastDash=-10,lastHit=-10;
let destination:Vec|null=null;
const walking=['KeyW','KeyA','KeyS','KeyD'];
const panel=$('section'),startButton=$<HTMLButtonElement>('[data-start]');
const hintBody=$('aside p'),hintTitle=$('aside strong'),status=$('.jr-status');
const statusName=$('.jr-status b'),statusNumbers=$('.jr-status span'),meter=$<HTMLProgressElement>('progress');
const choices=battle.rules.routes.join('　／　');
function updatePanel(){
  const modal=!started||battle.phase==='lost'||paused;
  panel.hidden=!modal;$('aside').hidden=modal;$('footer').hidden=modal||battle.phase==='curtain';
  status.hidden=modal||battle.phase!=='duel';
  if(modal){
    $('h2').textContent=!started?spec.title:paused?'暂停':'再试这一轮';
    const opening=config.opening??spec.fact;
    $('section p').textContent=!started?opening+'　游戏演绎 · '+spec.goal+'。点击地面或按 WASD 移动。':paused?spec.goal:'保留已选能力和突破进度。';
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
  $('[data-act]').hidden=phase==='duel';$('[data-hit]').hidden=phase!=='duel';
}
startButton.onclick=()=>{
  if(!actor.ready)return;
  if(!started){started=true;session.start();actor.mode='play';}
  else if(paused){paused=false;actor.mode='play';}
  else if(battle.phase==='lost'){battle.retry();actor.teleport([0,0,battle.z+1.8]);}
  updatePanel();startButton.blur();
};
let warmed=false;
let guardHeld=false;
function active(){return started&&!paused&&battle.phase!=='lost'&&battle.phase!=='curtain';}
function leap(){if(active()){actor.jump();if(battle.near(actor.position,battle.layout.warm,2.2))warmed=true;}}
function guard(){if(active()){guardUntil=time+.95;actor.keys.add('KeyC');if(battle.near(actor.position,battle.layout.warm,2.2))warmed=true;}}
function dash(){
  if(!active()||time-lastDash<(arena==='ice'&&battle.route===-1?.65:1.15))return;
  const dx=actor.keys.has('KeyA')?-1:actor.keys.has('KeyD')?1:Math.sign(actor.forward[0]);
  const dz=dx?0:actor.forward[2]||-1;
  lastDash=time;dashUntil=time+.48;actor.setMood('Happy',.3);
  if(arena==='field'&&battle.route===-1&&battle.phase==='duel'&&battle.cue==='open')hit();
  actor.position=actor.world.moveCapsule(actor.position,[dx*1.25,0,dz*1.25]).position;
}
function hit(){
  if(!active()||battle.phase!=='duel'||time-lastHit<.3)return;
  actor.attack();lastHit=time;
  if(battle.strike(actor.position,{guard:actor.spread>.32,airborne:!actor.grounded,dashing:time<dashUntil})){art.shot(actor.position[0],actor.position[2]);actor.setMood('Happy',.8);}
  else feedback(battle.message);
}
let feedbackEnd=0;
function feedback(msg:string){hintBody.textContent=msg;feedbackEnd=time+1;}
function interact(){
  if(!active())return;
  if(battle.phase==='warmup'&&!warmed){feedback('在前方热身圈弹跳或摊开一次。');return;}
  if(!battle.interact(actor.position)){feedback('先走进对应的光环。');return;}
  if(battle.phase==='curtain'){
    actor.keys.clear();destination=null;actor.mode='observe';
    const save=new Save(),records=save.data.life.records,key=spec.saveId+(session.practice?'-practice':'-daily');
    records[key+'-routes']=(records[key+'-routes']??0)|(battle.route===-1?1:2);
    if(!battle.errors)records[key+'-clean']=1;
    save.write();
  }
  feedbackEnd=0;updatePanel();
}
$('[data-leap]').onclick=leap;$('[data-guard]').onclick=guard;$('[data-dash]').onclick=dash;$('[data-act]').onclick=interact;$('[data-hit]').onclick=hit;
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
addEventListener('keyup',e=>{if(e.code==='KeyC'){guardHeld=false;return;}actor.keys.delete(e.code);});
addEventListener('blur',()=>{guardHeld=false;actor.keys.clear();destination=null;});
const ray=new T.Raycaster(),pointer=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),0),groundHit=new T.Vector3();
stage.renderer.domElement.addEventListener('pointerdown',(e:PointerEvent)=>{
  if(!active())return;
  pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(pointer,stage.camera);
  if(ray.ray.intersectPlane(plane,groundHit))destination=[T.MathUtils.clamp(groundHit.x,-5.65,5.65),0,T.MathUtils.clamp(groundHit.z,-10.6,9)];
});
const view=new T.Vector3(),aim=new T.Vector3();
let previousHUD='',readyLast=false;
function frame(delta:number){
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
      battle.advance(dt,actor.position,actor.spread>.32,time<dashUntil);
      if(actor.position[1]<-1.8){actor.teleport(battle.layout.spawn);destination=null;}
      if(battle.phase==='lost'){actor.keys.clear();destination=null;}
    }
    if(battle.phase==='curtain'){finale+=dt;if(finale>=1.9&&!closed){closed=true;session.finish();}}
  }
  const p=actor.position,narrow=innerWidth<620,terminal=battle.phase==='curtain';
  const baseZ=started?p[2]:2;
  view.set(terminal?4:started?p[0]*.48:4.2,terminal?4:started?(narrow?7.4:5.9):8.1,
    terminal?-2:baseZ+(started?(narrow?8.6:7.7):11));
  aim.set(terminal?0:started?p[0]*.55:0,terminal?1.8:.7,terminal?-9:baseZ-(started?2.7:4));
  stage.camera.position.copy(view);stage.camera.lookAt(aim);
  art.update(battle,time,dt,finale);
  const key=[battle.phase,battle.round,battle.turn,battle.cue,battle.health,paused,actor.ready].join('/');
  if(key!==previousHUD||readyLast!==actor.ready||feedbackEnd&&time>=feedbackEnd){
    previousHUD=key;readyLast=actor.ready;feedbackEnd=0;updatePanel();
  }
  if(battle.phase==='duel')meter.value=battle.clock;
  stage.render(dt,actor);
}
stage.camera.fov=52;stage.camera.updateProjectionMatrix();updatePanel();
const timer=new T.Clock();stage.renderer.setAnimationLoop(()=>frame(timer.getDelta()));
window.__slime=actor;(window as any).__level={spec,battle,stage,step:frame,get phase(){return battle.phase;},get warmed(){return warmed;},choices};
