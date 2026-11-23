import './battle-preview.css';
import * as T from 'three';
import {Stage} from './stage';
import {session} from './mode-session';
import {SlimeCharacter} from '../slime/character';
import type {SkillCheckpoint} from '../slime/skills';
import type {Vec} from '../slime/types';
import {elements} from '../slime/elements';
import {applyLevelQuality} from '../game/graphics';
import {Save} from '../game/save';
import {battleLook} from '../themes/battle-preview';
import {rng} from '../templates/random';
import {buildFleet,fleetWorld,fleetPoints,fleetFinalView} from '../themes/battle-fleet';
import {fieldWorld,buildCampaignField,fieldPoints} from '../themes/battle-field';
import {BattleDodge,dodgeDirection,dodgeTiming} from '../templates/battle-dodge';
import {newMission,advanceMission,objective,type Trigger,type MissionProgress} from '../templates/battle-mission';
import {FluidEchoes,DodgeAudio} from './battle-feedback';
import {EnemyActor,type EnemyKind,type EnemySnapshot} from './battle-enemies';
import {createShipStations} from './battle-stations';
import {mountBattleLock} from './battle-lock';
import {mountSlimeHud} from '../ui/slime-hud';
import {historyDetails} from '../ui/battle-history';

const spec=session.spec,ship=spec.kind==='skirmish';
const stage=new Stage(battleLook(ship)),fleet=ship?buildFleet(stage):null,field=ship?null:buildCampaignField(stage);
const spawn:Vec=ship?[0,0,4]:fieldPoints.spawn;
const cast: [EnemyKind,Vec][]=ship?
 [['sailor',fleetPoints.first],['gunner',fleetPoints.gunner],['rigger',fleetPoints.rigger],['guardian',fleetPoints.guardian]]:
 [['flag',fieldPoints.first],['light',[.05,0,-8]],['standard',fieldPoints.right],['captain',fieldPoints.boss]];
type Phase='intro'|'play'|'pause'|'station'|'reward'|'lost'|'finale'|'won';
let phase:Phase='intro',clock=0,sceneTime=0,life=100,finaleAge=0;
let progress=newMission(ship),serial=0,message='',messageUntil=0,echoIndex=0,perfectCount=0,lastDamage=0,lastContact='',contactTime=-1;
let checkpointName=ship?'本船海图桌':'雾口';
const dodge=new BattleDodge(),audio=new DodgeAudio(ship);
const splats:T.Mesh[]=[];
function stainMast(point:Vec,element:number){
 const x=point[0]+1,z=point[2]+.6;
 if(!ship||Math.abs(x)>.63||Math.abs(z)>.63||point[1]<-2.4||point[1]>6.65)return;
 const splash=new T.Mesh(new T.IcosahedronGeometry(.115,1),stage.toon(elements[element].color)),side=Math.abs(x)>Math.abs(z);
 splash.position.set(side?-1+Math.sign(x)*.33:point[0],point[1],side?point[2]:-.6+Math.sign(z)*.33);
 splash.scale.set(side?.45:1,.86,side?1:.45);stage.scene.add(splash);splats.push(splash);
 if(splats.length>12){const old=splats.shift()!;old.removeFromParent();old.geometry.dispose();}
}
function notice(text:string,seconds=1.7){message=text;messageUntil=clock+seconds;}
const actor=new SlimeCharacter(stage,{spawn,world:ship?fleetWorld():fieldWorld(),trainingTargets:[],battleTargets:cast.map(x=>x[1]),
 defaultAim:ship,onDodgePress:startDodge,input:true,ui:false,onToast:()=>{},onBattleSceneryHit:stainMast,
 onBattleHit:(target,damage,_el,event,point)=>{
  if(phase!=='play')return;
  lastDamage=damage;
  const enemy=enemies[target.id],broken=enemy.hit(point===target.position?actor.position:point,event?.kind);
  if(broken)notice('旗尖折入泥中 · 守将失衡');else if(event)notice(event.label);
 }}).attach();
const echoes=new FluidEchoes(stage.scene,actor),hud=mountSlimeHud(actor,{elements:true,skills:true,health:true});
applyLevelQuality(stage,actor,new Save().data.quality);
const ui=document.createElement('main');ui.id='battle-preview';ui.dataset.ship=String(ship);
ui.innerHTML='<header><small></small><h1></h1><div class="bp-objective" hidden></div></header><i class="bp-reticle" hidden></i><section class="bp-card" aria-labelledby="battle-heading"><small></small><h2 id="battle-heading"></h2><p class="bp-description"></p><div class="bp-rewards" hidden><button data-reward="heal">回复 30 生命</button><button data-reward="power">余程伤害 +20%</button></div><button data-primary></button><button data-home>回港</button></section><button class="bp-interact" data-interact hidden></button><button class="bp-dodge" hidden>闪避</button><output></output>';
document.body.append(ui);
const get=<E extends HTMLElement=HTMLElement>(q:string)=>ui.querySelector(q) as E;
const primary=get<HTMLButtonElement>('[data-primary]'),card=get('.bp-card'),rewards=get('.bp-rewards');
const dodgeButton=get<HTMLButtonElement>('.bp-dodge'),interactButton=get<HTMLButtonElement>('[data-interact]');
const objectiveLabel=get('.bp-objective');
get('header small').textContent=spec.year+'　/　10 月 21 日';get('h1').textContent=spec.title;
get('[data-home]').onclick=session.home;
const practiceRandom=rng(session.seed);
const enemies=cast.map(([kind,point],i)=>new EnemyActor(stage,actor,kind,point,actor.combat.targets[i],ui,()=>++serial,session.practice?practiceRandom.range(-1,1):0));
const lock=ship?null:mountBattleLock(actor,stage,notice);
const linkGeometry=new T.BufferGeometry();linkGeometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(9),3));
const ward=new T.Line(linkGeometry,new T.LineBasicMaterial({color:'#9ff4d1',transparent:true,opacity:.84}));
ward.frustumCulled=false;ward.visible=false;stage.scene.add(ward);
actor.combat.nextHitMultiplier=t=>{
 const counter=dodge.multiplier(clock),enemy=enemies[t.id];
 if(counter>1)notice('闪避反击 ×1.35');
 return counter*(progress.reward==='power'?1.2:1)*(enemy.protected?.50:1)*(enemy.exposed?1.65:1);
};
const controls=(ship?'左键发射分身 · X 回收 · F 交互':'左键连击 · Tab 锁定 / 解锁 · T 切敌 · 1–6 切元素 · E/R/Q 技能')+' · 右键闪避（Alt 也可）';
function panel(kicker:string,title:string,body:string,action:string){
 card.hidden=false;get('.bp-card small').textContent=kicker;get('h2').textContent=title;
 card.querySelector('.battle-history')?.remove();
 const intro=get('.bp-description');intro.textContent=body;
 if(phase==='intro'||phase==='pause')intro.insertAdjacentHTML('beforebegin',historyDetails(spec,phase==='intro'));
 primary.textContent=action;primary.hidden=phase==='reward';rewards.hidden=phase!=='reward';
 (phase==='reward'?get('[data-reward]'):primary).focus({preventScroll:true});
 hud.update(false);get('.bp-reticle').hidden=true;dodgeButton.hidden=interactButton.hidden=true;
 objectiveLabel.hidden=true;get('output').textContent='';
}
panel('历史场景演绎',ship?'寻回两列舰队的航迹图':'越过山道，击败阵旗守将',spec.fact+'　'+controls,'开始任务');
function play(){
 phase='play';card.hidden=true;primary.blur();actor.play();audio.play();
}
primary.onclick=()=>{
 if(phase==='won'){session.finish();return;}
 if(!actor.ready)return;
 if(phase==='lost'){restoreCheckpoint();play();return;}
 if(phase==='intro'){
  session.start();play();actor.pitch=ship?.04:.17;
  if(!ship)enemies[0].spawn();
  saveCheckpoint(checkpointName);return;
 }
 if(phase==='pause')play();
};
function clearAction(){
 if(actor.dodgeMotion){actor.velocity[0]=0;actor.velocity[2]=0;}
 dodge.clear();actor.dodgeMotion=null;echoes.clear();lock?.clear();audio.pause();messageUntil=0;
}
interface Checkpoint{progress:MissionProgress;life:number;position:Vec;yaw:number;pitch:number;element:number;skills:SkillCheckpoint;enemies:EnemySnapshot[]}
let checkpoint:Checkpoint;
function saveCheckpoint(label:string){
 checkpointName=label;
 checkpoint={progress:{...progress},life,position:[...actor.position],yaw:actor.yaw,pitch:actor.pitch,element:actor.element,
  skills:actor.skills.checkpoint(),enemies:enemies.map(e=>e.snapshot(clock))};
}
function restoreCheckpoint(){
 clearAction();actor.reset();actor.teleport(checkpoint.position);
 life=checkpoint.life;progress={...checkpoint.progress};actor.yaw=checkpoint.yaw;actor.pitch=checkpoint.pitch;
 actor.setElement(checkpoint.element,true);actor.skills.restore(checkpoint.skills);
 enemies.forEach((e,i)=>e.restore(checkpoint.enemies[i],clock));updateObstacles();echoIndex=0;lastContact='';contactTime=-1;
}
function fleetState(){
 const step=progress.step;
 return {revealed:!['orders','firstDeck'].includes(step),bridged:!['orders','firstDeck','winch'].includes(step),
  journal:progress.journal,chart:['guardian','return','complete'].includes(step),delivered:step==='complete',guardianDead:['return','complete'].includes(step)};
}
function updateObstacles(){
 if(!fleet)return;
 const state=fleetState();
 fleet.update(sceneTime,state);
 fleet.syncCollision(actor,state);
}
updateObstacles();
function near(p:Vec,r=1.72){return Math.abs(actor.position[1]-p[1])<1.12&&Math.hypot(actor.position[0]-p[0],actor.position[2]-p[2])<r;}
function handle(event:Trigger){
 if(phase!=='play'&&phase!=='reward')return;
 const old=progress,next=advanceMission(old,event);if(next===old)return;
 progress=next;
 if(event==='log'){
  updateObstacles();notice('领航日志 · 科林伍德指挥另一列英舰。铺位旁的舱闩已松开，可由中层返回。',6);return;
 }
 switch(progress.step){
  case 'firstDeck':enemies[0].spawn();notice('海图只剩半张。脚步声从前甲板传来。');break;
  case 'winch':notice('帆幕后出现半面蓝旗。到本船艉楼接通信号。',4);break;
  case 'crossing':updateObstacles();notice('两道桥已经放下：艉楼顺光，货舱沿灯。',4);break;
  case 'search':
   enemies[event==='upper'?1:2].spawn();saveCheckpoint(event==='upper'?'记录船艉楼':'记录船下舱');
   notice('已登记录船 · 沿舱灯寻找记录室',3);break;
  case 'guardian':enemies[3].spawn();saveCheckpoint('记录室 · 已取得图匣');notice('门外的船首像睁开眼睛。留意它胸前的帆结。',3);break;
  case 'return':updateObstacles();notice('归路已开 · 带着图匣回海图桌',3);break;
  case 'fork':notice('前方山道分岔，坡上映出第二面旗。',3);break;
  case 'pair':enemies[1].spawn();enemies[2].spawn();saveCheckpoint('分岔山道');notice('青色旗线保护轻兵。引它下坡，或先击倒护旗手。',4);break;
  case 'reward':phase='reward';actor.pause();clearAction();panel('山道整备','下一面旗后是守将','本次只选一项，效果随你进入阵地。','');break;
  case 'gate':
   if(progress.reward==='heal')life=Math.min(100,life+30);
   play();saveCheckpoint('整备后的山道');break;
  case 'captain':enemies[3].spawn();saveCheckpoint('守将阵地');notice('横扫看腰，直刺看旗尖。',3);break;
  case 'complete':
   phase='finale';actor.pause();clearAction();enemies.forEach(e=>e.clearShots());session.recordWin();finaleAge=0;break;
 }
}
const interactions:Partial<Record<Trigger,string>>={table:'展开海图',winch:'转动信号绞盘',chart:'取回图匣',log:'阅读日志，打开舱闩'};
function nearbyAction():Trigger|null{
 if(!ship||phase!=='play')return null;
 if((progress.step==='orders'||progress.step==='return')&&near(fleetPoints.table))return 'table';
 if(progress.step==='winch'&&fleet?.docked&&near(fleetPoints.winch))return 'winch';
 if(progress.step==='search'&&near(fleetPoints.chart))return 'chart';
 if(!progress.journal&&['search','guardian','return'].includes(progress.step)&&near(fleetPoints.log))return 'log';
 return null;
}
let pendingStation:Trigger|null=null;
const stations=ship?createShipStations(ui,stage,finished=>{
 const event=pendingStation;pendingStation=null;play();
 if(finished&&event)handle(event);
}):null;
function interact(){
 const event=nearbyAction();
 if(!event)return;
 if(stations&&(event==='winch'||event==='table'&&progress.step==='return')){
  pendingStation=event;phase='station';actor.pause();clearAction();
  stations.open(event==='winch'?'signals':'chart');return;
 }
 handle(event);
}
interactButton.onclick=interact;
get('[data-reward="heal"]').onclick=()=>handle('heal');get('[data-reward="power"]').onclick=()=>handle('power');
function startDodge(){
 if(phase!=='play'||actor.mode!=='play'||!dodge.begin(clock,dodgeDirection(actor.keys,actor.yaw,actor.forward)))return;
 actor.dodgePose(0);echoIndex=0;
}
function input(event:KeyboardEvent){
 if(phase!=='play')return;
 if(event.code==='KeyF'&&event.type==='keydown'&&!event.repeat){event.preventDefault();interact();}
 if(event.code!=='AltLeft'&&event.code!=='AltRight')return;
 event.preventDefault();if(event.type==='keydown'&&!event.repeat)startDodge();
}
window.addEventListener('keydown',input,true);window.addEventListener('keyup',input,true);
dodgeButton.addEventListener('pointerdown',e=>{e.preventDefault();startDodge();});
dodgeButton.addEventListener('click',e=>{if(!e.detail)startDodge();});
function contact(time:number,id:number,damage:number){
 if(phase!=='play')return;
 const result=dodge.contact(time,id);lastContact=result;contactTime=time;
 if(result==='perfect'){
  perfectCount++;actor.skills.addEnergy(14);audio.perfect();if(echoes.reduced.matches)echoes.capture(true);
  notice('完美闪避 · 反击就绪');
 }else if(result==='hit'){
  life=Math.max(0,life-damage);
  if(!echoes.reduced.matches)ui.animate([{boxShadow:'inset 0 0 56px #ef533388'},{boxShadow:'inset 0 0 0 transparent'}],260);
  if(life===0){phase='lost';actor.pause();clearAction();panel('任务中断','史莱姆散开了','从「'+checkpointName+'」重新集结。','从检查点重试');}
 }
}
function stepMission(){
 switch(progress.step){
  case 'firstDeck':case 'mist':if(!enemies[0].living)handle('firstDown');break;
  case 'crossing':
   if(near(fleetPoints.upper,1.35))handle('upper');
   else if(near(fleetPoints.lower,1.35))handle('lower');
   break;
  case 'search':case 'guardian':case 'return':
   for(const i of [1,2])if(!enemies[i].present&&near(enemies[i].home,3.9))enemies[i].spawn();
   if(progress.step==='guardian'&&!enemies[3].living)handle('guardianDown');
   break;
  case 'fork':if(actor.position[2]<=fieldPoints.fork[2])handle('fork');break;
  case 'pair':if(!enemies[1].living&&!enemies[2].living)handle('pairDown');break;
  case 'gate':if(actor.position[2]<=fieldPoints.bossGate[2])handle('gate');break;
  case 'captain':if(!enemies[3].living)handle('captainDown');break;
 }
}
function updateWard(){
 const light=enemies[1],standard=enemies[2];
 const p=light.target.position,q=standard.target.position;
 light.protected=!ship&&light.living&&standard.living&&Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2])<=5.8;
 ward.visible=light.protected;
 if(!ward.visible)return;
 const attr=ward.geometry.attributes.position;
 attr.setXYZ(0,p[0],p[1]+1,p[2]);attr.setXYZ(1,(p[0]+q[0])/2,(p[1]+q[1])/2+1.6+.1*Math.sin(clock*4),(p[2]+q[2])/2);attr.setXYZ(2,q[0],q[1]+1.4,q[2]);attr.needsUpdate=true;
}
const camTo=new T.Vector3(),focus=new T.Vector3();
function ending(dt:number){
 finaleAge+=dt;sceneTime+=dt;
 enemies.forEach(e=>{if(e.present)e.rig.update(dt,0);});
 if(ship){camTo.fromArray(fleetFinalView.eye);focus.fromArray(fleetFinalView.look);}
 else{camTo.set(-4,3.4,-13);focus.set(3,1.25,-21);}
 stage.camera.position.lerp(camTo,1-Math.exp(-dt*2.8));stage.camera.lookAt(focus);
 if(finaleAge>=(ship?3.4:2.5)){phase='won';panel('任务完成',spec.souvenir,spec.memory,'查看纪念品');}
}
stage.camera.position.set(ship?4:4.2,3.4,spawn[2]+3.5);stage.camera.lookAt(0,.75,spawn[2]-4);
const timer=new T.Clock();
function frame(){
 const dt=Math.min(.05,timer.getDelta());
 if(phase==='play'&&actor.mode==='paused'){phase='pause';clearAction();panel('交战暂停',spec.title,controls,'继续交战');}
 if(phase==='play'&&dt>0){
  const before:Vec=[...actor.position],last=clock;clock+=dt;
  const sceneDt=last<dodge.slowUntil&&!echoes.reduced.matches?dt*.4:dt;sceneTime+=sceneDt;
  const wasDodging=actor.dodgeMotion!==null;actor.dodgeMotion=dodge.motion(last,clock);
  if(wasDodging&&!actor.dodgeMotion){actor.velocity[0]=actor.velocity[2]=0;}
  const age=clock-dodge.started;
  if(actor.dodgeMotion)actor.dodgePose(Math.min(1,age/dodgeTiming.duration));
  updateWard();lock?.update(dt,true);actor.update(clock,dt);
  for(const enemy of enemies){if(phase==='play')enemy.tick(sceneDt,dt,clock,before,contact);}
  if(phase==='play')stepMission();
  const times=dodge.perfect?[.025,.14,.25,.38]:[.025,.23];
  while(echoIndex<times.length&&age>=times[echoIndex]&&age<=.46){echoes.capture();echoIndex++;}
 }else{
  lock?.update(dt,false);actor.update(clock,dt);
  if(phase==='finale')ending(dt);
 }
 updateObstacles();
 field?.update(sceneTime,enemies[3].enraged,progress.step==='complete');
 echoes.step(dt);primary.disabled=!actor.ready;
 const playing=phase==='play';hud.update(playing,{current:life,max:100});
 for(const e of enemies)e.drawMarker(playing);
 dodgeButton.hidden=!playing;dodgeButton.disabled=clock-dodge.started<dodgeTiming.cooldown;
 const action=nearbyAction();interactButton.hidden=!action;
 if(action)interactButton.textContent='F　'+interactions[action];
 objectiveLabel.hidden=!playing;objectiveLabel.textContent=objective[progress.step];
 get('.bp-reticle').hidden=!playing||!actor.aiming;ui.classList.toggle('blocked',!actor.aimReady);
 const threat=enemies.find(e=>e.living&&e.move==='windup'&&near(e.target.position,5));
 get('output').textContent=!playing?'':clock<messageUntil?message:threat?.attackKind==='follow'?'留意回身追击':threat?.attackKind==='thrust'?'旗尖压低 · 直刺':'';
 stations?.update();stage.render(dt,actor);
}
stage.renderer.setAnimationLoop(frame);
Object.assign(window,{__slime:actor,__level:{spec,enemies,points:ship?fleetPoints:fieldPoints,get phase(){return phase;},get life(){return life;},
 get progress(){return {...progress};},get checkpoint(){return checkpointName;},get move(){return enemies[0].move;},
 get encounter(){const e=enemies[0];return {clock,swing:e.turns,attackStart:e.attackStart,contactTime,lastContact,perfectCount,lastDamage,echoIndex,rewardUntil:dodge.rewardUntil,started:dodge.started,bolt:e.projectile};}}});

