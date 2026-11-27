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
import {RpgBuild,StyleTracker,STYLE_PERKS,computePoiseDamage,relicById,type RelicId,type RpgBuildSnapshot} from '../templates/rpg-build';
import {FluidEchoes} from './battle-feedback';
import {CombatAudio} from './combat-audio';
import {FloatingTextPool,JuiceController,TelegraphPool} from './combat-juice';
import {SkirmishTacticalLayer,isWeakpointHit} from './skirmish-fx';
import {EnemyActor,type EnemyKind,type EnemySnapshot} from './battle-enemies';
import {createShipStations} from './battle-stations';
import {mountBattleLock} from './battle-lock';
import {mountSlimeHud} from '../ui/slime-hud';
import {historyDetails} from '../ui/battle-history';

const spec=session.spec,ship=spec.kind==='skirmish';
const stage=new Stage(battleLook(ship)),fleet=ship?buildFleet(stage):null,field=ship?null:buildCampaignField(stage);
const spawn:Vec=ship?[0,0,4]:fieldPoints.spawn;
// Keep original 0..3 enemy indices untouched for QA compatibility; append extra skirmish/RPG flankers at 4+.
const cast: [EnemyKind,Vec][]=ship?
 [['sailor',fleetPoints.first],['gunner',fleetPoints.gunner],['rigger',fleetPoints.rigger],['guardian',fleetPoints.guardian],
  ['sailor',[2.25,0,-4.25]],['rigger',[18.5,0,-3.8]]]:
 [['flag',fieldPoints.first],['light',[.05,0,-8]],['standard',fieldPoints.right],['captain',fieldPoints.boss],
  ['light',[-2.6,0,1.2]],['light',[-3.8,0,-9.8]]];

type Phase='intro'|'play'|'pause'|'station'|'reward'|'relic'|'lost'|'finale'|'won';
let phase:Phase='intro',clock=0,sceneTime=0,life=100,finaleAge=0;
let progress=newMission(ship),serial=0,message='',messageUntil=0,echoIndex=0,perfectCount=0,lastDamage=0,lastContact='',contactTime=-1;
let checkpointName=ship?'本船海图桌':'雾口';
let shotsFired=0,shotsHit=0,critCount=0,barrelCount=0,executeCount=0,breakCount=0,reactionCount=0;
let hitmarkerTimer=0,hitmarkerCrit=false,recoilTimer=0;
let firstRelicOffered=false,westSupplyTaken=false,eastPerchTaken=false,highGroundUntil=-Infinity;
const drumCooldowns=[0,0];
const brazierCooldowns=[0,0,0];
let lastWeakpoint=false;

const dodge=new BattleDodge();
const audio=new CombatAudio();
const juice=new JuiceController();
const floats=new FloatingTextPool(34);
const telegraphs=new TelegraphPool(stage.scene,10);
const skirmishLayer=ship?new SkirmishTacticalLayer(stage):null;
const rpgBuild=new RpgBuild();
const style=new StyleTracker();

const splats:T.Mesh[]=[];
function stainScenery(point:Vec,element:number){
 if(!ship)return;
 checkSkirmishPropAndElement(point,element,true);
 const center=new T.Vector3().fromArray(point),normal=new T.Vector3(0,1,0);
 const mastX=point[0]+1,mastZ=point[2]+.6;
 if(Math.abs(mastX)<.57&&Math.abs(mastZ)<.57&&point[1]>-2.4&&point[1]<6.65){
  normal.set(mastX,0,mastZ).normalize();
  center.set(-1+normal.x*.34,point[1],-.6+normal.z*.34);
 }else{
  let nearest=.18,found=false;
  for(const box of actor.world.boxes){
   if(point.some((v,i)=>v<box.min[i]-.13||v>box.max[i]+.13))continue;
   for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
    const face=sign<0?box.min[axis]:box.max[axis],distance=Math.abs(point[axis]-face);
    if(distance>=nearest)continue;
    nearest=distance;found=true;normal.set(0,0,0).setComponent(axis,sign);center.fromArray(point).setComponent(axis,face);
   }
  }
  if(!found){
   const y=actor.world.support(point[0],point[2],point[1]+.05);
   if(y===null||Math.abs(point[1]-y)>.22)return;
   center.y=y;
  }
 }
 const splash=new T.Mesh(new T.IcosahedronGeometry(.135,1),stage.toon(elements[element].color));
 splash.name='elemental clone splat';
 splash.position.copy(center).addScaledVector(normal,.013);
 splash.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),normal);
 splash.scale.set(1,.18,.8);stage.scene.add(splash);
 const courier=stage.scene.getObjectByName('Blue flag records ship');
 if(courier&&point[0]>14.65+courier.position.x)courier.attach(splash);
 splats.push(splash);
 if(splats.length>18){const old=splats.shift()!;old.removeFromParent();old.geometry.dispose();}
}

// One liquid rim expands in the camera plane while lit droplets scatter from the actual point of contact.
const impactGeometry=new T.SphereGeometry(1,10,7),rimGeometry=new T.TorusGeometry(1,.065,8,40);
const burstPool=ship?Array.from({length:5},()=>{
 const rim=new T.Mesh(rimGeometry,new T.MeshBasicMaterial({transparent:true,depthWrite:false}));
 const drops=new T.InstancedMesh(impactGeometry,new T.MeshStandardMaterial({roughness:.18,metalness:.12}),12);
 rim.layers.set(1);drops.layers.set(1);rim.name='clone impact wave';drops.name='clone impact droplets';
 drops.frustumCulled=false;rim.visible=drops.visible=false;stage.scene.add(rim,drops);
 return {rim,drops,age:1};
}):[];
const dropTransform=new T.Object3D();
function burstClone(point:Vec,element:number){
 if(!burstPool.length)return;
 audio.playCloneBurst(element);
 checkSkirmishPropAndElement(point,element,false);
 const slot=burstPool.reduce((oldest,b)=>b.age>oldest.age?b:oldest);
 slot.age=0;slot.rim.position.fromArray(point);slot.drops.position.fromArray(point);
 slot.rim.material.color.set(elements[element].rim);slot.drops.material.color.set(elements[element].color);
 slot.rim.visible=slot.drops.visible=true;
}
function updateBursts(dt:number){
 for(const slot of burstPool){
  if(!slot.rim.visible)continue;
  slot.age+=dt;
  const u=Math.min(1,slot.age/.36);
  if(u===1){slot.rim.visible=slot.drops.visible=false;continue;}
  const spread=1-(1-u)**2;
  slot.rim.quaternion.copy(stage.camera.quaternion);
  slot.rim.scale.setScalar(.12+.79*spread);slot.rim.material.opacity=(1-u)**1.35;
  for(let i=0;i<slot.drops.count;i++){
   const angle=i*2.4,dy=1-2*(i+.5)/slot.drops.count,radial=Math.sqrt(1-dy*dy);
   const speed=.60+.30*(i%3);
   dropTransform.position.set(Math.cos(angle)*radial*spread*speed,dy*spread*speed+.12*u-.32*u*u,Math.sin(angle)*radial*spread*speed);
   dropTransform.scale.setScalar(.08*(1-u)*(.7+.2*(i%3)));
   dropTransform.updateMatrix();slot.drops.setMatrixAt(i,dropTransform.matrix);
  }
  slot.drops.instanceMatrix.needsUpdate=true;
 }
}

function notice(text:string,seconds=1.9){message=text;messageUntil=clock+seconds;}

function checkSkirmishPropAndElement(point:Vec,element:number,onScenery:boolean){
 if(!ship||!skirmishLayer||phase!=='play')return;
 // 1. Shootable props: powder barrels, ship bells, supply casks
 const triggers=skirmishLayer.checkImpact(point,element===2?1.25:0.95);
 for(const {prop,worldPos} of triggers){
  if(prop.kind==='barrel'){
   barrelCount++;
   audio.playBarrelExplode();
   juice.addShake(0.55);
   juice.triggerHitstop(0.065);
   floats.spawn([worldPos[0],worldPos[1]+.6,worldPos[2]],'💥 火药桶连环爆!','break');
   notice('💥 引爆船用火药桶！周边敌军重创失衡');
   const dmg=element===2?92:70;
   for(const e of enemies){
    if(!e.living)continue;
    const ep=e.target.position;
    if(Math.hypot(ep[0]-worldPos[0],ep[2]-worldPos[2])<=4.7&&Math.abs(ep[1]-worldPos[1])<2.5){
     e.target.health=Math.max(0,e.target.health-dmg);
     e.target.hitFlash=1;
     e.hit(worldPos,'Overload');
     floats.spawn([ep[0],ep[1]+1.5,ep[2]],'-'+dmg,'crit','#ff8b54');
     if(e.kind==='guardian')e.forceExpose(4.0,clock);
     else e.stun(1.4,clock);
     if(e.target.health<=0)e.die();
    }
   }
  }else if(prop.kind==='bell'){
   audio.playBellClang();
   juice.addShake(0.25);
   floats.spawn([worldPos[0],worldPos[1]+.6,worldPos[2]],'🔔 震耳钟鸣!','reaction','#ffe285');
   let stunned=0;
   for(const e of enemies){
    if(!e.living)continue;
    const ep=e.target.position;
    if(Math.hypot(ep[0]-worldPos[0],ep[2]-worldPos[2])<=5.4&&Math.abs(ep[1]-worldPos[1])<2.8){
     e.stun(2.4,clock);stunned++;
    }
   }
   notice(stunned?'🔔 铜钟巨响震晕了 '+stunned+' 名敌兵！':'🔔 铜钟鸣响，回荡在甲板之间');
  }else if(prop.kind==='supply'){
   audio.playHealSip();
   const heal=Math.min(100-life,26);
   life=Math.min(100,life+26);
   actor.skills.addEnergy(30);
   floats.spawn([worldPos[0],worldPos[1]+.6,worldPos[2]],heal>0?`+${heal} 生命 · +30 能量`:'+30 元素能量','heal');
   notice('🛢 打碎凝露补给桶，生命与能量回复！');
  }
 }

 // 2. Element-specific clone scenery/burst effects
 if(element===0&&onScenery){
  skirmishLayer.spawnElementPool('water',point);
 }else if(element===4){
  skirmishLayer.spawnElementPool('dark',point);
 }else if(element===3&&skirmishLayer.hasWaterNear(point,1.1)){
  // Shooting thunder into a wet puddle arcs to nearby foes!
  for(const e of enemies){
   if(!e.living)continue;
   const ep=e.target.position;
   if(Math.hypot(ep[0]-point[0],ep[2]-point[2])<=5.8&&Math.abs(ep[1]-point[1])<2.2){
    skirmishLayer.spawnLightningArc([point[0],point[1]+.35,point[2]],[ep[0],ep[1]+.9,ep[2]],'#c7a6ff');
    e.target.health=Math.max(0,e.target.health-20);
    e.target.hitFlash=1;
    floats.spawn([ep[0],ep[1]+1.45,ep[2]],'⚡ 水洼感电 -20','reaction','#c7a6ff');
    if(e.target.health<=0)e.die();
   }
  }
 }
 // Wind / Fire burst intercepts enemy projectiles mid-air
 if(element===1||element===2){
  for(const e of enemies){
   if(!e.present)continue;
   const res=e.interceptShots(point,element===1?1.45:1.1);
   if(res.intercepted>0){
    actor.skills.addEnergy(14*res.intercepted);
    audio.playHitmarker(true);
    floats.spawn([point[0],point[1]+.4,point[2]],res.giantBackfire?'💥 击爆巨弹反伤!':'🍃 拦截炮弹!','break');
    if(res.giantBackfire&&e.living){
     e.target.health=Math.max(0,e.target.health-48);
     e.forceExpose(3.6,clock);
     juice.addShake(0.42);
     notice('💥 追踪炽焰弹凌空引爆，反伤船首像并震开胸前帆结！',3.2);
     if(e.target.health<=0)e.die();
    }
   }
  }
 }
}

const actor=new SlimeCharacter(stage,{spawn,world:ship?fleetWorld():fieldWorld(),trainingTargets:[],battleTargets:cast.map(x=>x[1]),
 defaultAim:ship,burstOnEnemy:ship,onDodgePress:startDodge,input:true,ui:false,onToast:()=>{},
 onReady:()=>{if(phase==='intro')startMission();},
 onFire:()=>{
  if(phase!=='play')return;
  shotsFired++;
  recoilTimer=.16;
  audio.playCloneFire(actor.element);
 },
 onElementAttack:ev=>{
  if(phase!=='play')return;
  audio.playSlash(ev.comboIndex,ev.element);
  if(!ship)checkFieldInteractiveSwing(ev.origin,ev.range+1.2,ev.element);
 },
 onBattleSceneryHit:stainScenery,onBattleCloneBurst:burstClone,
 onBattleHit:(target,damage,el,event,point)=>{
  if(phase!=='play')return;
  lastDamage=damage;
  shotsHit++;
  const enemy=enemies[target.id];
  const hitPt:Vec=point===target.position?[target.position[0],target.position[1]+.9,target.position[2]]:point;
  const isCrit=lastWeakpoint||(enemy.isBroken(clock));
  lastWeakpoint=false;
  const brokenLegacy=enemy.hit(point===target.position?actor.position:point,event?.kind);

  // Audio + Hitmarker + Floating Numbers + Juice
  hitmarkerTimer=.22;hitmarkerCrit=isCrit||!!event;
  audio.playHitmarker(hitmarkerCrit);
  if(event){
   reactionCount++;
   audio.playReaction(event.kind);
   floats.spawn([hitPt[0],hitPt[1]+.55,hitPt[2]],event.label,'reaction',event.color);
   juice.addShake(0.16);
   if(!ship&&rpgBuild.has('tide')){
    const h=Math.min(rpgBuild.maxHealth-life,6);
    if(h>0){life+=h;floats.spawn([actor.position[0],actor.position[1]+1.0,actor.position[2]],`+${h}`,'heal');}
   }
  }
  floats.spawn([hitPt[0],hitPt[1]+.2,hitPt[2]],(isCrit?'🎯 ':'')+'-'+damage,isCrit?'crit':'damage');
  if(isCrit){
   critCount++;
   juice.addShake(0.22);
   juice.triggerHitstop(0.045);
   actor.skills.addEnergy(8);
  }

  // Mode-specific elemental follow-ups
  if(ship&&skirmishLayer){
   if(el===0){enemy.slowUntil=Math.max(enemy.slowUntil,clock+3.6);}
   else if(el===2){
    // Fire splash onto nearby foes
    for(const other of enemies){
     if(other.target.id===target.id||!other.living)continue;
     const op=other.target.position;
     if(Math.hypot(op[0]-hitPt[0],op[2]-hitPt[2])<=2.6&&Math.abs(op[1]-hitPt[1])<1.8){
      const sp=Math.round(damage*.45);
      other.target.health=Math.max(0,other.target.health-sp);
      other.target.hitFlash=1;
      floats.spawn([op[0],op[1]+1.3,op[2]],'🔥 -'+sp,'damage','#ffab6e');
      if(other.target.health<=0)other.die();
     }
    }
   }else if(el===3){
    // Thunder arcs to another living enemy within 6.2m
    const chainMax=target.aura===0||skirmishLayer.hasWaterNear(target.position,1.2)?2:1;
    const linked=enemies.filter(o=>o.target.id!==target.id&&o.living&&Math.hypot(o.target.position[0]-target.position[0],o.target.position[2]-target.position[2])<=6.4).slice(0,chainMax);
    for(const other of linked){
     skirmishLayer.spawnLightningArc([target.position[0],target.position[1]+1,target.position[2]],[other.target.position[0],other.target.position[1]+1,other.target.position[2]]);
     const arcDmg=Math.round(damage*.65);
     other.target.health=Math.max(0,other.target.health-arcDmg);
     other.target.hitFlash=1;
     floats.spawn([other.target.position[0],other.target.position[1]+1.45,other.target.position[2]],'⚡ -'+arcDmg,'reaction','#caa6ff');
     if(other.target.health<=0)other.die();
    }
   }else if(el===4){
    enemy.vulnUntil=Math.max(enemy.vulnUntil,clock+4.5);
   }else if(el===5&&enemy.kind==='guardian'){
    enemy.forceExpose(3.4,clock);
    floats.spawn([target.position[0],target.position[1]+1.65,target.position[2]],'🪨 护盾震裂!','break');
    notice('🪨 岩分身震开船首像护盾！瞄准胸前帆结输出！');
   }
  }else if(!ship){
   // RPG Poise damage & Style Rank progression
   const poiseDmg=computePoiseDamage(damage,el,event?.kind,rpgBuild.poiseDamageScale()*(dodge.rewardUntil>=clock?1.35:1));
   const justBroke=enemy.damagePoise(poiseDmg,clock);
   const rankedUp=style.registerHit(el,!!event,isCrit);
   if(rankedUp)audio.playRankUp(style.tier);
   if(rpgBuild.has('gale'))actor.skills.addEnergy(5);
   if(justBroke){
    breakCount++;
    rpgBuild.onBreakOrKill(clock);
    if(style.registerEvent('break'))audio.playRankUp(style.tier);
    audio.playPoiseBreak();
    juice.addShake(0.42);
    juice.triggerHitstop(0.075);
    floats.spawn([target.position[0],target.position[1]+1.8,target.position[2]],'⚡ 架势崩溃 · 按 F 处决!','break');
    notice('⚡ '+enemy.name+'架势崩溃！靠近按 F 发动处决重击！',3.2);
   }
   if(target.health<=0)rpgBuild.onBreakOrKill(clock);
  }
  if(brokenLegacy)notice('旗尖折入泥中 · 守将失衡');
  else if(event)notice(event.label);
 }}).attach();

const echoes=new FluidEchoes(stage.scene,actor),hud=mountSlimeHud(actor,{elements:true,skills:true,health:true});
applyLevelQuality(stage,actor,new Save().data.quality);

const ui=document.createElement('main');ui.id='battle-preview';ui.dataset.ship=String(ship);
ui.innerHTML=`
<header>
  <small></small>
  <h1></h1>
  <div class="bp-objective" hidden></div>
  <div class="bp-waypoint" hidden></div>
</header>
<div class="bp-top-tools" hidden>
  <button class="bp-tool-btn" data-mute title="开关战斗音效">${audio.muted?'🔇':'🔊'}</button>
</div>
<div class="bp-boss-bar" hidden>
  <div class="bp-boss-head"><b data-boss-name></b><span data-boss-phase></span></div>
  <div class="bp-boss-hp"><i data-boss-hp></i></div>
  <div class="bp-boss-poise" hidden><i data-boss-poise></i></div>
</div>
<aside class="bp-rpg-dock" hidden>
  <div class="bp-style-box">
    <strong class="bp-rank" data-rank>D</strong>
    <div><b data-rank-title>初阵</b><small data-combo>0 连击</small></div>
    <div class="bp-rank-bar"><i data-rank-bar></i></div>
  </div>
  <div class="bp-relic-row" data-relics></div>
  <div class="bp-potion-row">
    <button class="bp-potion-btn" data-potion title="按 H 饮用凝露葫芦，恢复 36 生命">🧪 凝露葫芦 <b data-potions>2</b> <kbd>H</kbd></button>
    <span class="bp-shield-pill" data-shield hidden>🛡 <b>0</b></span>
  </div>
</aside>
<div class="bp-reticle" hidden>
  <i class="bp-ch-t"></i><i class="bp-ch-b"></i><i class="bp-ch-l"></i><i class="bp-ch-r"></i>
  <em class="bp-hitmarker"></em>
  <div class="bp-ammo" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
  <small class="bp-ammo-tip" hidden>按 X 收回分身</small>
</div>
<section class="bp-card" aria-labelledby="battle-heading">
  <small></small>
  <h2 id="battle-heading"></h2>
  <p class="bp-description"></p>
  <div class="bp-summary" hidden></div>
  <div class="bp-rewards" hidden></div>
  <button data-primary></button>
  <button data-home>回港</button>
</section>
<button class="bp-interact" data-interact hidden></button>
<button class="bp-dodge" hidden>闪避</button>
<output></output>`;
document.body.append(ui);

const get=<E extends HTMLElement=HTMLElement>(q:string)=>ui.querySelector(q) as E;
const primary=get<HTMLButtonElement>('[data-primary]'),card=get('.bp-card'),rewards=get('.bp-rewards');
const summaryBox=get('.bp-summary'),topTools=get('.bp-top-tools'),muteBtn=get<HTMLButtonElement>('[data-mute]');
const bossBar=get('.bp-boss-bar'),rpgDock=get('.bp-rpg-dock'),waypointEl=get('.bp-waypoint');
const reticleEl=get('.bp-reticle'),hitmarkerEl=get('.bp-hitmarker'),ammoTip=get('.bp-ammo-tip');
const ammoDots=Array.from(ui.querySelectorAll<HTMLElement>('.bp-ammo span'));
const dodgeButton=get<HTMLButtonElement>('.bp-dodge'),interactButton=get<HTMLButtonElement>('[data-interact]');
const objectiveLabel=get('.bp-objective');
const potionBtn=get<HTMLButtonElement>('[data-potion]'),shieldPill=get('[data-shield]');
get('header small').textContent=spec.year+'　/　10 月 21 日';get('h1').textContent=spec.title;
get('[data-home]').onclick=session.home;
muteBtn.onclick=()=>{const m=audio.toggleMute();muteBtn.textContent=m?'🔇':'🔊';};

const practiceRandom=rng(session.seed);
const enemies=cast.map(([kind,point],i)=>new EnemyActor(
 stage,actor,kind,point,actor.combat.targets[i],ui,()=>++serial,
 session.practice?practiceRandom.range(-1,1):0,
 {
  onWindupFlash:e=>{
   if(phase!=='play')return;
   if(Math.hypot(e.target.position[0]-actor.position[0],e.target.position[2]-actor.position[2])<12){
    audio.playEnemyWindupFlash();
   }
  },
  onPhaseTwo:e=>{
   audio.playWarDrum();
   juice.addShake(0.45);
   if(e.kind==='guardian'){
    floats.spawn([e.target.position[0],e.target.position[1]+2.2,e.target.position[2]],'🌊 二阶段 · 怒海惊涛!','break');
    notice('⚠ 船首像进入二阶段！打爆它的追踪炽焰弹可反伤并震开护盾！',4.2);
   }else if(e.kind==='captain'){
    floats.spawn([e.target.position[0],e.target.position[1]+2.2,e.target.position[2]],'🚩 松尾山变阵 · 狂战开启!','break');
    notice('⚠ 阵旗守将展旗变阵！留神回身追击与地面震波（可闪避或跃起躲避）！',4.5);
   }
  },
  onShockwaveRelease:e=>{
   audio.playExecuteSlam();
   juice.addShake(0.50);
   floats.spawn([e.target.position[0],e.target.position[1]+1.5,e.target.position[2]],'💥 旗阵震地!','break');
  },
 },
));
const lock=ship?null:mountBattleLock(actor,stage,notice);
const linkGeometry=new T.BufferGeometry();linkGeometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(9),3));
const ward=new T.Line(linkGeometry,new T.LineBasicMaterial({color:'#9ff4d1',transparent:true,opacity:.84}));
ward.frustumCulled=false;ward.visible=false;stage.scene.add(ward);

actor.combat.nextHitMultiplier=t=>{
 const counter=dodge.multiplier(clock),enemy=enemies[t.id];
 if(counter>1)notice('⚡ 闪避反击 ×1.6');
 let mult=(counter>1?1.6:1)*(progress.reward==='power'?1.15:1)*(enemy.protected?.50:1)*(enemy.exposed?1.65:1);
 if(enemy.isVulnerable(clock))mult*=1.25;
 if(ship){
  // Weakpoint check via nearest recent impact or exposed figurehead
  const shots=actor.latest?.shots??[];
  const nearShot=shots.find(s=>Math.hypot(s.center[0]-t.position[0],s.center[2]-t.position[2])<1.4);
  if(enemy.exposed||(nearShot&&isWeakpointHit(enemy.kind,t.position,nearShot.center,enemy.exposed))){
   lastWeakpoint=true;
   mult*=1.45;
  }
 }else{
  const broken=enemy.isBroken(clock);
  if(broken)mult*=1.75;
  if(clock<highGroundUntil){highGroundUntil=-Infinity;mult*=1.5;notice('⛰ 居高临下先手突袭 ×1.5！');}
  mult*=rpgBuild.damageMultiplier({
   element:actor.element,
   targetHasAura:t.aura!==null&&clock<=t.auraUntil,
   targetBroken:broken,
   now:clock,
   styleRank:style.rank,
  });
 }
 return mult;
};

const controls=ship
 ?'左键发射分身 · 1–6 切换六元素（火爆桶/水留洼/雷链电/风截弹/岩破盾）· X 收回分身 · F 交互 · 右键闪避'
 :'左键连击 · E/R/Q 技能 · 1–6 切元素打反应 · Tab 锁定 / T 切敌 · F 处决破韧敌人/敲战鼓 · H 喝凝露葫芦 · 右键闪避';

function openRelicDraft(round:number,kicker:string,title:string,isMissionReward:boolean){
 phase=isMissionReward?'reward':'relic';
 actor.pause();clearAction();
 const picks=rpgBuild.draftChoices(session.seed,round);
 panel(kicker,title,'择一枚关原战意印记随行（同时回复 20 点生命）。','');
 rewards.hidden=false;
 primary.hidden=true;
 rewards.innerHTML=picks.map(r=>
  `<button type="button" class="bp-relic-card" data-pick-relic="${r.id}" style="--rc:${r.color}">
    <div class="bp-rc-head"><span>${r.icon}</span><b>${r.name}</b><small>${r.tag}</small></div>
    <p>${r.desc}</p>
  </button>`
 ).join('');
 for(const btn of Array.from(rewards.querySelectorAll<HTMLButtonElement>('[data-pick-relic]'))){
  btn.onclick=()=>{
   const id=btn.dataset.pickRelic as RelicId;
   const gained=rpgBuild.pick(id);
   life=Math.min(rpgBuild.maxHealth,life+Math.max(20,gained.healBonus));
   audio.playUpgrade(2);
   notice(`✨ 已装备「${relicById(id).name}」！`,3);
   if(isMissionReward){
    handle('power');
   }else{
    play();
    saveCheckpoint('山道入口');
   }
  };
 }
 rewards.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});
}

function renderSummary(){
 if(phase!=='won'){summaryBox.hidden=true;return;}
 summaryBox.hidden=false;
 if(ship){
  const acc=shotsFired?Math.min(100,Math.round(shotsHit/shotsFired*100)):100;
  const grade=acc>=65&&barrelCount>=2?'S':acc>=45?'A':'B';
  summaryBox.innerHTML=`<div><span>综合评价</span><b>${grade} 级</b></div><div><span>精准命中</span><b>${acc}%</b></div><div><span>弱点 / 爆桶</span><b>${critCount} / ${barrelCount}</b></div><div><span>完美闪避</span><b>${perfectCount} 次</b></div>`;
 }else{
  const grade=style.peakRank==='SS'||style.peakRank==='S'?'S':style.peakRank==='A'?'A':'B';
  summaryBox.innerHTML=`<div><span>战意巅峰</span><b>${style.peakRank}（${grade}）</b></div><div><span>最高连击</span><b>${style.maxCombo} 连</b></div><div><span>破韧 / 处决</span><b>${breakCount} / ${executeCount}</b></div><div><span>完美闪避</span><b>${perfectCount} 次</b></div>`;
 }
}

function panel(kicker:string,title:string,body:string,action:string){
 card.hidden=false;get('.bp-card small').textContent=kicker;get('h2').textContent=title;
 card.querySelector('.battle-history')?.remove();
 const intro=get('.bp-description');intro.textContent=body;
 if(phase==='intro'||phase==='pause')intro.insertAdjacentHTML('beforebegin',historyDetails(spec,phase==='intro'));
 primary.textContent=action;primary.hidden=phase==='reward'||phase==='relic';
 rewards.hidden=phase!=='reward'&&phase!=='relic';
 renderSummary();
 if(!primary.hidden)primary.focus({preventScroll:true});
 hud.update(false);reticleEl.hidden=true;dodgeButton.hidden=interactButton.hidden=true;
 objectiveLabel.hidden=true;waypointEl.hidden=true;bossBar.hidden=true;rpgDock.hidden=true;topTools.hidden=true;
 get('output').textContent='';
}

card.hidden=true;

function play(){
 phase='play';card.hidden=true;primary.blur();actor.play();
 audio.startAmbient(ship?'ship':'field');audio.resume();
}

function startMission(){
 if(phase!=='intro'||!actor.ready)return;
 session.start();play();actor.pitch=ship?.04:.17;
 if(!ship){
  enemies[0].spawn();
  enemies[4].spawn();
 }
 saveCheckpoint(checkpointName);
}

primary.onclick=()=>{
 if(phase==='won'){session.finish();return;}
 if(!actor.ready)return;
 if(phase==='lost'){restoreCheckpoint();play();return;}
 if(phase==='intro'){startMission();return;}
 if(phase==='pause')play();
};

function clearAction(){
 for(const slot of burstPool){slot.rim.visible=slot.drops.visible=false;slot.age=1;}
 if(actor.dodgeMotion){actor.velocity[0]=0;actor.velocity[2]=0;}
 dodge.clear();actor.dodgeMotion=null;echoes.clear();lock?.clear();audio.pause();messageUntil=0;
 telegraphs.beginFrame();telegraphs.endFrame();
}

interface Checkpoint{
 progress:MissionProgress;life:number;position:Vec;yaw:number;pitch:number;element:number;
 skills:SkillCheckpoint;enemies:EnemySnapshot[];build:RpgBuildSnapshot;
}
let checkpoint:Checkpoint;
function saveCheckpoint(label:string){
 checkpointName=label;
 checkpoint={progress:{...progress},life,position:[...actor.position],yaw:actor.yaw,pitch:actor.pitch,element:actor.element,
  skills:actor.skills.checkpoint(),enemies:enemies.map(e=>e.snapshot(clock)),build:rpgBuild.snapshot()};
}
function restoreCheckpoint(){
 clearAction();actor.reset();actor.teleport(checkpoint.position);
 life=checkpoint.life;progress={...checkpoint.progress};actor.yaw=checkpoint.yaw;actor.pitch=checkpoint.pitch;
 actor.setElement(checkpoint.element,true);actor.skills.restore(checkpoint.skills);
 rpgBuild.restore(checkpoint.build);style.reset();juice.reset();
 enemies.forEach((e,i)=>e.restore(checkpoint.enemies[i],clock));
 skirmishLayer?.resetProps();
 updateObstacles();echoIndex=0;lastContact='';contactTime=-1;
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

function near(p:Vec,r=1.72){return Math.abs(actor.position[1]-p[1])<1.25&&Math.hypot(actor.position[0]-p[0],actor.position[2]-p[2])<r;}

function triggerDrum(idx:number){
 if(ship||!field||clock<drumCooldowns[idx])return;
 drumCooldowns[idx]=clock+7.5;
 field.pulseDrum(idx);
 audio.playWarDrum();
 juice.addShake(0.35);
 const dp=fieldPoints.drums[idx];
 floats.spawn([dp[0],dp[1]+1.5,dp[2]],'🥁 阵鼓震慑!','break');
 if(style.registerEvent('drum'))audio.playRankUp(style.tier);
 let affected=0;
 for(const e of enemies){
  if(!e.living)continue;
  const ep=e.target.position;
  if(Math.hypot(ep[0]-dp[0],ep[2]-dp[2])<=10.5){
   affected++;
   e.protected=false;
   e.stun(1.2,clock);
   const broke=e.damagePoise(Math.round(e.maxPoise*.40),clock);
   if(broke){
    breakCount++;audio.playPoiseBreak();
    floats.spawn([ep[0],ep[1]+1.7,ep[2]],'⚡ 鼓声破韧!','break');
   }
  }
 }
 notice(affected?'🥁 敲响战地大鼓！震散护旗庇护并大幅削减敌军韧性！':'🥁 战鼓雷动，振奋军心！',3);
}

function checkFieldInteractiveSwing(origin:Vec,range:number,element:number){
 // Swinging near a drum strikes it automatically!
 fieldPoints.drums.forEach((dp,i)=>{
  if(Math.hypot(origin[0]-dp[0],origin[2]-dp[2])<=range+1.1)triggerDrum(i);
 });
 // Wind or Fire swing near a brazier triggers a fiery swirl wave!
 if(element===1||element===2){
  fieldPoints.braziers.forEach((bp,i)=>{
   if(clock<brazierCooldowns[i])return;
   if(Math.hypot(origin[0]-bp[0],origin[2]-bp[2])<=range+1.8){
    brazierCooldowns[i]=clock+6.5;
    audio.playReaction('Overload');
    juice.addShake(0.28);
    floats.spawn([bp[0],bp[1]+1.4,bp[2]],'🔥🍃 火盆烈焰扩散!','reaction','#ff9642');
    for(const e of enemies){
     if(!e.living)continue;
     const ep=e.target.position;
     if(Math.hypot(ep[0]-bp[0],ep[2]-bp[2])<=5.2){
      e.target.health=Math.max(0,e.target.health-32);
      e.target.aura=2;e.target.auraUntil=clock+7;
      e.target.hitFlash=1;
      e.damagePoise(22,clock);
      floats.spawn([ep[0],ep[1]+1.5,ep[2]],'🔥 -32','crit','#ff8f4a');
      if(e.target.health<=0)e.die();
     }
    }
    notice('🔥 借风卷起火盆烈焰，灼烧周边敌阵！');
   }
  });
 }
}

function handle(event:Trigger){
 if(phase!=='play'&&phase!=='reward')return;
 const old=progress,next=advanceMission(old,event);if(next===old)return;
 progress=next;
 audio.playObjectiveClear();
 if(event==='log'){
  updateObstacles();notice('领航日志 · 科林伍德指挥另一列英舰。铺位旁的舱闩已松开，可由中层返回。',6);return;
 }
 switch(progress.step){
  case 'firstDeck':
   enemies[0].spawn();enemies[4].spawn();
   notice('海图只剩半张！两翼帆布偶兵逼近——可射爆前甲板火药桶！',3.5);break;
  case 'winch':notice('帆幕后出现半面蓝旗。跟随光柱登本船艉楼转动绞盘。',4);break;
  case 'crossing':updateObstacles();notice('两道桥已放下：艉楼跳板顺光（狙击对射），下舱舷门潜入（近战伏击+补给）。',4.5);break;
  case 'search':
   enemies[event==='upper'?1:2].spawn();enemies[5].spawn();
   saveCheckpoint(event==='upper'?'记录船艉楼':'记录船下舱');
   notice('已登记录船 · 沿舱灯与航点光柱寻找记录室',3.2);break;
  case 'guardian':
   enemies[3].spawn();saveCheckpoint('记录室 · 已取得图匣');
   notice('船首像守卫苏醒！瞄准外露帆结、用岩分身破盾，或引爆两侧火药桶！',4.2);break;
  case 'return':updateObstacles();notice('归路已开 · 带着图匣返回本船海图桌',3.2);break;
  case 'fork':
   if(!firstRelicOffered){
    firstRelicOffered=true;
    openRelicDraft(1,'雾口初胜 · 战意觉醒','择一枚关原战意印记',false);
   }else{
    notice('前方山道分岔：西路低道藏有凝露葫芦，东路高坡可抢占居高先手！',4);
   }
   break;
  case 'pair':
   enemies[1].spawn();enemies[2].spawn();enemies[5].spawn();
   saveCheckpoint('分岔山道');
   notice('青色旗线庇护轻兵！引下坡、敲响战地大鼓破盾，或抢高坡先击倒护旗手。',4.5);break;
  case 'reward':
   openRelicDraft(2,'山道整备 · 决战前夜','再择一枚战意印记迎战守将',true);
   break;
  case 'gate':
   play();saveCheckpoint('整备后的山道');break;
  case 'captain':
   enemies[3].spawn();saveCheckpoint('守将阵地');
   notice('阵旗守将现身！读地面红毯闪避，削空金色韧性条后按 F 处决！',4);break;
  case 'complete':
   phase='finale';actor.pause();clearAction();enemies.forEach(e=>e.clearShots());
   audio.playTransmitVictory();session.recordWin();finaleAge=0;break;
 }
}

const interactions:Partial<Record<Trigger,string>>={table:'展开海图',winch:'转动信号绞盘',chart:'取回图匣',log:'阅读日志，打开舱闩'};
type FieldAction={kind:'execute';enemy:EnemyActor}|{kind:'drum';idx:number}|{kind:'supply'}|{kind:'ship';trigger:Trigger};
function nearbyFieldAction():FieldAction|null{
 if(phase!=='play')return null;
 if(ship){
  if((progress.step==='orders'||progress.step==='return')&&near(fleetPoints.table))return {kind:'ship',trigger:'table'};
  if(progress.step==='winch'&&fleet?.docked&&near(fleetPoints.winch))return {kind:'ship',trigger:'winch'};
  if(progress.step==='search'&&near(fleetPoints.chart))return {kind:'ship',trigger:'chart'};
  if(!progress.journal&&['search','guardian','return'].includes(progress.step)&&near(fleetPoints.log))return {kind:'ship',trigger:'log'};
  return null;
 }
 // RPG priority 1: Execute a poise-broken enemy!
 const broken=enemies.find(e=>e.isBroken(clock)&&near(e.target.position,2.6));
 if(broken)return {kind:'execute',enemy:broken};
 // RPG priority 2: West supply crate
 if(!westSupplyTaken&&near(fieldPoints.westSupply,2.0))return {kind:'supply'};
 // RPG priority 3: Strike nearby war drum
 for(let i=0;i<fieldPoints.drums.length;i++){
  if(clock>=drumCooldowns[i]&&near(fieldPoints.drums[i],2.2))return {kind:'drum',idx:i};
 }
 return null;
}

let pendingStation:Trigger|null=null;
const stations=ship?createShipStations(ui,stage,finished=>{
 const event=pendingStation;pendingStation=null;play();
 if(finished&&event)handle(event);
}):null;

function usePotion(){
 if(ship||phase!=='play')return;
 const res=rpgBuild.usePotion(life);
 if(!res.used){
  notice(rpgBuild.potions<=0?'凝露葫芦已空':'生命已满，无需饮用');
  return;
 }
 life=res.nextLife;
 audio.playHealSip();
 floats.spawn([actor.position[0],actor.position[1]+1.1,actor.position[2]],`🧪 +${res.healed} 生命`,'heal');
 notice(`🧪 饮用凝露葫芦，恢复 ${res.healed} 生命（剩余 ${rpgBuild.potions} 瓶）`);
}
potionBtn.onclick=usePotion;

function interact(){
 const act=nearbyFieldAction();
 if(!act)return;
 if(act.kind==='ship'){
  const event=act.trigger;
  if(stations&&(event==='winch'||event==='table'&&progress.step==='return')){
   pendingStation=event;phase='station';actor.pause();clearAction();
   stations.open(event==='winch'?'signals':'chart');return;
  }
  handle(event);
  return;
 }
 if(act.kind==='execute'){
  const e=act.enemy;
  const dmg=e.execute(clock);
  if(dmg>0){
   executeCount++;
   const bonus=rpgBuild.onExecute(clock);
   life=Math.min(rpgBuild.maxHealth,life+bonus.heal);
   actor.skills.addEnergy(35);
   if(style.registerEvent('execute'))audio.playRankUp(style.tier);
   audio.playExecuteSlam();
   juice.addShake(0.55);
   juice.triggerHitstop(0.085);
   floats.spawn([e.target.position[0],e.target.position[1]+1.8,e.target.position[2]],`⚔ 处决重击 -${dmg}!`,'break');
   notice(`⚔ 处决重击！造成 ${dmg} 伤害`+(bonus.shieldRefreshed?' · 磐岩护盾刷新':''),2.8);
  }
  return;
 }
 if(act.kind==='supply'){
  westSupplyTaken=true;
  field?.setSupplyTaken(true);
  rpgBuild.addPotion(1);
  audio.playDewPickup();
  floats.spawn([fieldPoints.westSupply[0],fieldPoints.westSupply[1]+1.2,fieldPoints.westSupply[2]],'🧪 凝露葫芦 +1','heal');
  notice('🧪 拾取西路战备补给：凝露葫芦 +1（按 H 随时回血）',3.2);
  return;
 }
 if(act.kind==='drum'){
  triggerDrum(act.idx);
 }
}
interactButton.onclick=interact;

function startDodge(){
 const cdScale=ship?1:rpgBuild.dodgeCooldownScale();
 if(phase!=='play'||actor.mode!=='play')return;
 if(clock-dodge.started<dodgeTiming.cooldown*cdScale)return;
 // Allow reduced cooldown under Gale relic by shifting started check cleanly
 if(cdScale<1&&clock-dodge.started<dodgeTiming.cooldown)dodge.started=-Infinity;
 if(!dodge.begin(clock,dodgeDirection(actor.keys,actor.yaw,actor.forward)))return;
 actor.dodgePose(0);echoIndex=0;
}

function input(event:KeyboardEvent){
 if(phase!=='play')return;
 if(event.code==='KeyF'&&event.type==='keydown'&&!event.repeat){event.preventDefault();interact();return;}
 if(event.code==='KeyH'&&event.type==='keydown'&&!event.repeat&&!ship){event.preventDefault();usePotion();return;}
 if(event.code==='KeyX'&&event.type==='keydown'&&!event.repeat&&ship){audio.playRecallWhoosh();}
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
  perfectCount++;
  const eGain=Math.round(18*(ship?1:rpgBuild.energyGainScale(style.rank)));
  actor.skills.addEnergy(eGain);
  audio.playPerfectDodge();
  if(echoes.reduced.matches)echoes.capture(true);
  floats.spawn([actor.position[0],actor.position[1]+1.25,actor.position[2]],'✨ 完美闪避 · 反击就绪!','reaction','#8ef5ff');
  if(!ship){
   if(style.registerEvent('perfectDodge'))audio.playRankUp(style.tier);
   if(rpgBuild.has('thunder')){
    // Gale/Thunder relic auto-strikes nearest living attacker with lightning!
    const foe=enemies.filter(e=>e.living).sort((a,b)=>Math.hypot(a.target.position[0]-actor.position[0],a.target.position[2]-actor.position[2])-Math.hypot(b.target.position[0]-actor.position[0],b.target.position[2]-actor.position[2]))[0];
    if(foe&&Math.hypot(foe.target.position[0]-actor.position[0],foe.target.position[2]-actor.position[2])<10){
     foe.target.health=Math.max(0,foe.target.health-28);
     foe.damagePoise(36,clock);
     actor.skills.addEnergy(15);
     audio.playReaction('ElectroCharge');
     floats.spawn([foe.target.position[0],foe.target.position[1]+1.65,foe.target.position[2]],'⚡ 疾雷反击 -28','crit','#caa8ff');
     if(foe.target.health<=0)foe.die();
    }
   }
  }
  notice('✨ 完美闪避 · 下次反击 ×1.6！');
 }else if(result==='hit'){
  const dmgRes=ship?{hpLoss:damage,absorbed:0}:rpgBuild.absorbDamage(damage);
  life=Math.max(0,life-dmgRes.hpLoss);
  audio.playPlayerHurt();
  juice.addShake(0.32);
  if(!ship)style.onPlayerHurt();
  if(dmgRes.absorbed>0){
   floats.spawn([actor.position[0],actor.position[1]+1.1,actor.position[2]],`🛡 护盾吸收 ${dmgRes.absorbed}`,'info','#ebd083');
  }
  if(!echoes.reduced.matches)ui.animate([{boxShadow:'inset 0 0 64px #ef533399'},{boxShadow:'inset 0 0 0 transparent'}],280);
  if(life===0){phase='lost';actor.pause();clearAction();panel('任务中断','史莱姆散开了','从「'+checkpointName+'」重新集结。','从检查点重试');}
 }
}

function updateWaypoint(){
 if(!ship||!skirmishLayer)return;
 const s=progress.step;
 if(s==='orders')skirmishLayer.setWaypoint(fleetPoints.table,'海图桌','#ffd98a');
 else if(s==='winch')skirmishLayer.setWaypoint(fleetPoints.winch,'艉楼绞盘','#ffd98a');
 else if(s==='crossing')skirmishLayer.setWaypoint(fleetPoints.upper,'艉楼跳板 / 下舱舷门','#8bf0e6');
 else if(s==='search')skirmishLayer.setWaypoint(fleetPoints.chart,'记录室图匣','#ffd98a');
 else if(s==='return')skirmishLayer.setWaypoint(fleetPoints.table,'返航海图桌','#8ef7b4');
 else skirmishLayer.setWaypoint(null);
}

function stepMission(){
 if(!ship&&!eastPerchTaken&&near(fieldPoints.eastPerch,2.1)){
  eastPerchTaken=true;
  field?.setPerchTaken(true);
  highGroundUntil=clock+20;
  audio.playUpgrade(2);
  floats.spawn([fieldPoints.eastPerch[0],fieldPoints.eastPerch[1]+1.3,fieldPoints.eastPerch[2]],'⛰ 高坡先手增益!','break');
  notice('⛰ 占领东路高坡旗台！20 秒内下次先手攻击伤害 ×1.5！',3.5);
 }
 switch(progress.step){
  case 'firstDeck':if(!enemies[0].living&&!enemies[4].living)handle('firstDown');break;
  case 'mist':if(!enemies[0].living&&!enemies[4].living)handle('firstDown');break;
  case 'crossing':
   if(near(fleetPoints.upper,1.35))handle('upper');
   else if(near(fleetPoints.lower,1.35))handle('lower');
   break;
  case 'search':case 'guardian':case 'return':
   for(const i of [1,2,5])if(!enemies[i].present&&near(enemies[i].home,4.2))enemies[i].spawn();
   if(progress.step==='guardian'&&!enemies[3].living)handle('guardianDown');
   break;
  case 'fork':if(actor.position[2]<=fieldPoints.fork[2])handle('fork');break;
  case 'pair':if(!enemies[1].living&&!enemies[2].living&&!enemies[5].living)handle('pairDown');break;
  case 'gate':if(actor.position[2]<=fieldPoints.bossGate[2])handle('gate');break;
  case 'captain':if(!enemies[3].living)handle('captainDown');break;
 }
}

function updateWard(){
 const light=enemies[1],standard=enemies[2];
 const p=light.target.position,q=standard.target.position;
 light.protected=!ship&&light.living&&standard.living&&clock>=drumCooldowns[1]-6&&Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2])<=5.8;
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
 const realDt=Math.min(.05,timer.getDelta());
 const dt=juice.step(realDt);
 if(phase==='play'&&actor.mode==='paused'){phase='pause';clearAction();panel('交战暂停',spec.title,controls,'继续交战');}
 telegraphs.beginFrame();
 if(phase==='play'&&dt>0){
  const before:Vec=[...actor.position],last=clock;clock+=dt;
  const sceneDt=last<dodge.slowUntil&&!echoes.reduced.matches?dt*.32:dt;sceneTime+=sceneDt;
  const wasDodging=actor.dodgeMotion!==null;actor.dodgeMotion=dodge.motion(last,clock);
  if(wasDodging&&!actor.dodgeMotion){actor.velocity[0]=actor.velocity[2]=0;}
  const age=clock-dodge.started;
  if(actor.dodgeMotion)actor.dodgePose(Math.min(1,age/dodgeTiming.duration));
  updateWard();lock?.update(dt,true);actor.update(clock,dt);
  if(!ship)style.step(realDt);
  for(const enemy of enemies){
   if(phase==='play'){
    enemy.tick(sceneDt,dt,clock,before,contact);
    enemy.drawTelegraph(telegraphs);
   }
  }
  // Intercept airborne shots when Wind clone is flying
  if(ship&&actor.latest?.shots.length){
   for(const sh of actor.latest.shots){
    if(sh.phase!=='flying')continue;
    for(const e of enemies){
     if(!e.present)continue;
     const res=e.interceptShots(sh.center,actor.element===1?1.15:.65);
     if(res.intercepted>0){
      audio.playHitmarker(true);
      actor.skills.addEnergy(12);
      floats.spawn([sh.center[0],sh.center[1]+.4,sh.center[2]],res.giantBackfire?'💥 击爆追踪巨弹!':'🍃 凌空截弹!','break');
      if(res.giantBackfire&&e.living){
       e.target.health=Math.max(0,e.target.health-48);
       e.forceExpose(3.6,clock);
       juice.addShake(0.42);
       if(e.target.health<=0)e.die();
      }
     }
    }
   }
  }
  if(phase==='play')stepMission();
  const times=dodge.perfect?[.025,.14,.25,.38]:[.025,.23];
  while(echoIndex<times.length&&age>=times[echoIndex]&&age<=.46){echoes.capture();echoIndex++;}
  updateWaypoint();
 }else{
  lock?.update(dt,false);actor.update(clock,dt);
  if(phase==='finale')ending(dt);
 }
 telegraphs.endFrame();
 updateObstacles();
 field?.update(sceneTime,enemies[3].enraged,progress.step==='complete');
 skirmishLayer?.update(realDt,sceneTime,(pos,rad)=>{
  for(const e of enemies){
   if(!e.living)continue;
   const ep=e.target.position;
   if(Math.hypot(ep[0]-pos[0],ep[2]-pos[2])<=rad&&Math.abs(ep[1]-pos[1])<1.8){
    e.target.health=Math.max(0,e.target.health-8);
    e.vulnUntil=Math.max(e.vulnUntil,clock+3);
    floats.spawn([ep[0],ep[1]+1.35,ep[2]],'🌑 -8','damage','#c59bff');
    if(e.target.health<=0)e.die();
   }
  }
 });
 if(phase==='play')updateBursts(realDt);
 echoes.step(realDt);primary.disabled=!actor.ready;

 const playing=phase==='play';
 hud.update(playing,{current:life,max:ship?100:rpgBuild.maxHealth});
 topTools.hidden=!playing;
 for(const e of enemies)e.drawMarker(playing,clock);
 const cdScale=ship?1:rpgBuild.dodgeCooldownScale();
 dodgeButton.hidden=!playing;dodgeButton.disabled=clock-dodge.started<dodgeTiming.cooldown*cdScale;

 // Boss top health & poise bar
 const boss=enemies[3];
 const showBoss=playing&&boss.living;
 bossBar.hidden=!showBoss;
 if(showBoss){
  get('[data-boss-name]').textContent=ship?'⚓ 船首像守卫':'🚩 阵旗守将';
  get('[data-boss-phase]').textContent=boss.isBroken(clock)?'⚡ 架势崩溃 · 可处决'
   :boss.enraged?(ship?'二阶段 · 怒海惊涛':'二阶段 · 松尾山变阵')
   :(ship?(boss.exposed?'🎯 帆结外露!':'护盾闭合（用岩/爆桶破防）'):'一阶段 · 雾锁关原');
  get('[data-boss-hp]').style.width=Math.max(0,Math.min(100,boss.target.health/boss.target.maxHealth*100)).toFixed(1)+'%';
  const poiseTrack=get('.bp-boss-poise');
  poiseTrack.hidden=ship;
  if(!ship)get('[data-boss-poise]').style.width=Math.max(0,Math.min(100,boss.poise/boss.maxPoise*100)).toFixed(1)+'%';
 }

 // RPG dock: Style Rank, Relics, Potions, Shield
 rpgDock.hidden=!playing||ship;
 if(playing&&!ship){
  const rk=style.rank,meta=STYLE_PERKS[rk];
  const rEl=get('[data-rank]');rEl.textContent=rk;rEl.style.color=meta.color;
  get('[data-rank-title]').textContent=meta.title+' · '+meta.perk;
  get('[data-combo]').textContent=style.combo>0?style.combo+' 连击':'等待接敌';
  get('[data-rank-bar]').style.width=Math.round(style.progress*100)+'%';
  get('[data-rank-bar]').style.background=meta.color;
  get('[data-potions]').textContent=String(rpgBuild.potions);
  potionBtn.disabled=rpgBuild.potions<=0||life>=rpgBuild.maxHealth;
  shieldPill.hidden=rpgBuild.shield<=0;
  if(rpgBuild.shield>0)shieldPill.querySelector('b')!.textContent=String(Math.ceil(rpgBuild.shield));
  get('[data-relics]').innerHTML=rpgBuild.relics.map(id=>{
   const r=relicById(id);
   return `<span class="bp-relic-chip" title="${r.name}：${r.desc}" style="border-color:${r.color}">${r.icon} ${r.name}</span>`;
  }).join('');
 }

 // Dynamic reticle + 5-clone ammo arc + Hitmarker (Skirmish)
 reticleEl.hidden=!playing||!actor.aiming;
 ui.classList.toggle('blocked',!actor.aimReady);
 if(!reticleEl.hidden){
  recoilTimer=Math.max(0,recoilTimer-realDt);
  hitmarkerTimer=Math.max(0,hitmarkerTimer-realDt);
  reticleEl.classList.toggle('recoiling',recoilTimer>0);
  hitmarkerEl.classList.toggle('show',hitmarkerTimer>0);
  hitmarkerEl.classList.toggle('crit',hitmarkerCrit);
  const out=actor.latest?.shots.length??0;
  const avail=Math.max(0,5-out);
  ammoDots.forEach((dot,i)=>dot.classList.toggle('full',i<avail));
  ammoTip.hidden=avail>0;
 }

 // Waypoint distance indicator (Skirmish)
 const wp=playing&&ship?skirmishLayer?.waypointInfo(actor.position):null;
 waypointEl.hidden=!wp;
 if(wp)waypointEl.textContent=`🧭 ${wp.label} · ${Math.round(wp.distance)}m`;

 // Contextual F interaction button
 const action=nearbyFieldAction();
 interactButton.hidden=!action;
 if(action){
  interactButton.classList.toggle('bp-exec-btn',action.kind==='execute');
  interactButton.textContent=action.kind==='execute'?'F　⚔ 处决重击！'
   :action.kind==='drum'?'F　🥁 敲响战地大鼓'
   :action.kind==='supply'?'F　🧪 拾取凝露葫芦'
   :'F　'+interactions[action.trigger];
 }
 objectiveLabel.hidden=!playing;objectiveLabel.textContent=objective[progress.step];
 const threat=enemies.find(e=>e.living&&e.move==='windup'&&near(e.target.position,5.5));
 get('output').textContent=!playing?'':clock<messageUntil?message
  :threat?.attackKind==='shock'?'⚠ 旗阵震地 · 闪避或跳起！'
  :threat?.attackKind==='follow'?'⚠ 留意回身追击！'
  :threat?.attackKind==='thrust'?'⚠ 旗尖压低 · 侧向闪避！':'';

 stations?.update();
 juice.applyShake(stage.camera);
 stage.render(realDt,actor);
 juice.restoreShake(stage.camera);
 floats.update(realDt,stage.camera);
}

stage.renderer.setAnimationLoop(frame);
Object.assign(window,{__slime:actor,__level:{
 spec,enemies,points:ship?fleetPoints:fieldPoints,rpgBuild,style,
 get phase(){return phase;},get life(){return life;},
 get progress(){return {...progress};},get checkpoint(){return checkpointName;},get move(){return enemies[0].move;},
 get encounter(){const e=enemies[0];return {clock,swing:e.turns,attackStart:e.attackStart,contactTime,lastContact,perfectCount,lastDamage,echoIndex,rewardUntil:dodge.rewardUntil,started:dodge.started,bolt:e.projectile};}
}});
