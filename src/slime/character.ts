import {transientElement} from './contact-fx';
import {GroundCameraHeight} from './camera-follow';
import {SlimeRenderer} from './render';
import {TrailDecals} from './wet-film';
import {FaceDirector,Mood} from './face';
import {Combat,isSelfSkill,skillAimStatus,stopAtMeleeTarget,type CombatTarget,type SwingAreaEvent} from './combat';
import {elements} from './elements';
import {CLING,stepCling,tryAttach,type ClingState} from './cling';
import {createWorld,CollisionWorld,GroundSurface,WorldDefinition} from './world';
import {SlimeUmbrellaView,UMBRELLA,UmbrellaLogic} from './umbrella';
import {SlashVfxSystem} from './slash-vfx';
import {SkillRuntime,type CombatHudSnapshot,type ReactionResult,type SkillDef,type SkillSlot} from './skills';
import {SkillVfxSystem} from './skill-vfx';
import {BattleCollider,Box,CannonImpact,CannonLaunchSpec,firstBattleContact,FrameInput,MeshFrame,Vec,Quality,Command,cannonPositionAt,clamp,distance,idlePose,mix,smooth,solveCannonLaunch} from './types';

export interface SlimeRenderPass {color:any;depth:any;time:number}
/** Supply the same Three.js namespace used by your scene; no second renderer is created. */
export interface SlimeContext {THREE:any;renderer:any;scene:any;camera:any;sun:any;controls:{enabled:boolean;target:any;update:()=>void}}
export interface SlimeOptions {
  gravityScale?:number;world:WorldDefinition;spawn:Vec;mount?:HTMLElement;ui?:boolean;input?:boolean;title?:string;trainingTargets?:Vec[];showCollisionBoxes?:boolean;sceneStats?:()=>unknown;
  /** Game-layer hooks. The legacy HUD stays hidden when ui is false; toasts and landings are forwarded here. */
  onToast?:(text:string)=>void;onLand?:(speed:number,swimming:boolean)=>void;onReady?:()=>void;onCling?:(on:boolean)=>void;
  onFire?:()=>void;
  /** Encounter targets supply foot positions. The level draws their models and HUD. */
  battleTargets?:Vec[]; burstOnEnemy?:boolean; defaultAim?:boolean; onDodgePress?:()=>void;
  onBattleCloneBurst?:(point:Vec,element:number)=>void;
  onBattleSceneryHit?:(point:Vec,element:number)=>void;
  onBattleHit?:(target:CombatTarget,damage:number,element:number,reaction:ReactionResult|null,point:Vec)=>void;
  /** Fired during active hit window of every combo attack so farm plots & interactive world objects can react. */
  onElementAttack?:(ev:SwingAreaEvent)=>void;
}

const CANNON = {speed: 28, maxSpeed: 36, gravity: 9.8, aimDistance: 40, fireInterval: 0.35, clearance: 0.03};
const LAUNCH_CAM = {height: 0.60, shoulder: 0.45, blendSeconds: 0.18};

function createUI(mount?:HTMLElement){
 const ui=document.createElement('div');ui.id='slime-ui';ui.innerHTML=`
 <div class="brand"><div class="brand-mark">◡</div><div><strong>凝露港 · 史莱姆漫游</strong><small>NINGLU HARBOR / SLIMEFABLE</small></div></div>
 <div class="top-actions"><label class="small-button quality-label"><select id="quality" aria-label="画质"><option value="high">高画质</option><option value="balanced">平衡画质</option></select></label><button class="small-button hidden" id="observe">返回观景</button><button class="small-button" id="reset">重置角色</button></div>
 <div class="metrics"><div class="status" id="status">正在唤醒果冻…</div><div id="metrics"></div></div>
 <section class="intro glass"><div class="eyebrow">A LITTLE JELLY, A QUIET HARBOR</div><h1>在晴雨之间<br>软软地出发。</h1><p>让身体随脚步轻轻晃动，留下一路元素印记。<br>分出一小团自己，再把它们慢慢收回来。</p><button id="play" class="primary"><span>开始游玩</span><span>↗</span></button><small class="note">桌面键鼠体验 · 原生软体模拟 · 六属性切换</small></section>
 <section class="element-panel glass"><div class="element-title"><span>身体里的六种天气</span><span>ELEMENT / 01—06</span></div><div class="elements">${elements.map((e,i)=>`<button class="element ${i===0?'active':''}" data-element="${i}" style="--element:${e.color}" aria-label="切换${e.name}属性" aria-pressed="${i===0}"><b>${e.icon}</b><span>${e.name}</span><kbd>${i+1}</kbd></button>`).join('')}</div><div class="element-description"><b id="element-tag">WATER / 水</b><span id="element-trail">涟漪水痕</span></div></section>
 <div class="hint"><div><kbd>W A S D</kbd> 移动 <kbd>Shift</kbd> 冲刺 <kbd>空格</kbd> 两段跳 / 开伞 <kbd>C</kbd> 摊开</div><div><kbd>G</kbd>/<kbd>右键</kbd> 瞄准 · 左键发射 <kbd>X</kbd> 回收 <kbd>左键</kbd> 连击 <kbd>滚轮</kbd> 视距 <kbd>Esc</kbd> 暂停</div></div><div class="crosshair ue-crosshair"><i></i><i></i><i></i><i></i></div>
 <div class="combo hidden"><span id="shot-count">分身 0 / 5</span><strong id="combo-name">自由漫游</strong><small id="combat-hint">沿码头前行，可在木靶旁试试四段连击</small></div><div class="toast" role="status"></div>`;
 (mount??document.body).appendChild(ui);ui.classList.add('viewing');
 const $=(s:string)=>ui.querySelector(s) as HTMLElement;
 return {ui,$};
}

export class SlimeCharacter {
 position:Vec=[0,0,0];velocity:Vec=[0,0,0];forward:Vec=[0,0,-1];grounded=true;jumps=0;spread=0;element=0;quality:Quality='high';mode:'observe'|'play'|'paused'='observe';yaw=0;pitch=.23;arm=2.6;currentArm=2.6;keys=new Set<string>();generation=0;swimming=false;
 readonly bodyShape='dome';readonly shapeBlend=1;
 readonly umbrella=new UmbrellaLogic();
 private umbrellaView:SlimeUmbrellaView;
 readonly slashVfx:SlashVfxSystem;
 readonly skills=new SkillRuntime();
 readonly skillVfx:SkillVfxSystem;
 private sentAnchor:Vec=[0,0,0];private frameAnchor:Vec|null=null;
 face=new FaceDirector();private lastShotCount=0;private lastSafe:Vec=[0,0,0];
 renderer:SlimeRenderer;decals:TrailDecals;combat:Combat;worker=new Worker(new URL('./sim.worker.ts',import.meta.url),{type:'module'});busy=false;elapsed=0;simDt=0;lastRequest=0;commands:Command[]=[];recycle:Pick<MeshFrame,'positions'|'normals'|'slots'>|undefined;latest:MeshFrame|null=null;ready=false;running=true;debugFreeze=false;
 aiming=false;aimReady=false;aimRecoil=0;launchCooldown=0;
 frameTimes:number[]=[];workerTimes:number[]=[];meshTimes:number[]=[];resets=0;workerErrors:string[]=[];dropped=0;received=0;
 private pendingImpacts:CannonImpact[]=[];
 private sentLaunches=0;
 private get occupiedShots(){
  const live=this.latest?.generation===this.generation?this.latest.shots.length:0;
  return live+this.sentLaunches+this.commands.filter(c=>c.type==='launch').length;
 }
 private jumpRequest=false;private jumpBuffer=0;private coyoteTimer=0;private jumpHeld=false;private jumpStretch=0;private airBounce=0;
 /** Level-authored dodges feed displacement through the usual capsule, floor and camera. */
 dodgeMotion:Vec|null=null;
 /** Only the RPG supplies a target; other scenes keep their existing camera and casting controls. */
 battleAim?:{target:CombatTarget|null;hard:boolean;denied:(text:string)=>void};
 inputLock=false;cling:ClingState|null=null;private clingCooldown=0;private clingPush=0;private detachRequest=false;
 private launchTarget:Vec=[3,0,13];private pendingCannon:CannonLaunchSpec|null=null;private rightAimHeld=false;
 private impact=0;private dragging=false;private toastTimer=0;private camPos:any;private target:any;private saved:any;private lastUi=0;private lastPerf=performance.now();
 private targetMeshes:any[]=[];private targetLabels:HTMLElement[]=[];private lightning:any;private lightningPositions=new Float32Array(6*32*2*3);
 private cameraHeight=new GroundCameraHeight();
 private shake=0;private aimBlend=0;private launchBlocked=false;private listeners:{target:EventTarget;type:string;fn:EventListener}[]=[];
 private baseBoxCount=0;private pendingDynamicBoxes:Box[]|null=null;
 private baseSurfaceCount=0;private pendingDynamicSurfaces:{surfaces:GroundSurface[];bounds?:{min:Vec;max:Vec}}|null=null;
 readonly T:any;readonly world:CollisionWorld;readonly ui:HTMLElement;private $:(s:string)=>HTMLElement;private spawn:Vec;private worldPending=true;

 constructor(readonly ctx:SlimeContext,readonly options:SlimeOptions){
  this.T=ctx.THREE;this.world=createWorld(options.world);this.baseBoxCount=this.world.boxes.length;this.baseSurfaceCount=this.world.definition.surfaces.length;
  this.spawn=[...options.spawn];this.position=[...this.spawn];this.lastSafe=[...this.spawn];
  const view=createUI(options.mount);this.ui=view.ui;this.$=view.$;this.ui.id='slime-ui';if(options.ui===false)this.ui.style.display='none';
  this.$('.brand strong').textContent=options.title??'史莱姆 · 可复用角色';
  this.renderer=new SlimeRenderer(ctx,this.world);this.decals=new TrailDecals(this.T,this.world,ctx);this.combat=new Combat(options.battleTargets??options.trainingTargets??[],!options.battleTargets);
  if(options.battleTargets)this.combat.nextSwingDirection=()=>this.meleeAim();
  this.umbrellaView=new SlimeUmbrellaView(ctx);
  this.slashVfx=new SlashVfxSystem(ctx);
  this.skillVfx=new SkillVfxSystem(ctx);
  this.combat.onSwingStart=ev=>{
   const origin:Vec=[this.position[0],this.position[1],this.position[2]];
   this.slashVfx.playSwing(ev.element,ev.comboIndex,origin,ev.forward,ev.duration);
   this.shake=Math.max(this.shake,ev.isFinisher?.022:.009);
  };
  this.combat.onSwingArea=ev=>{
   this.skills.addEnergy(ev.isFinisher?12:7);
   this.options.onElementAttack?.(ev);
  };
  this.camPos=new this.T.Vector3();this.target=new this.T.Vector3();this.saved={position:ctx.camera.position.clone(),target:ctx.controls.target.clone(),fov:ctx.camera.fov,near:ctx.camera.near};
  if(!options.battleTargets)this.createTraining();
  this.createLightning();this.combat.blocked=(a,b)=>!!this.world.cast([a[0],a[1]+.35,a[2]],[b[0],b[1]+.35,b[2]],.01);
  this.worker.onmessage=e=>{if(this.running)this.receive(e.data)};this.worker.onerror=e=>this.fail(e.message);if(options.input!==false)this.bind();this.toast('场景已就绪，正在生成史莱姆');
 }

 get umbrellaOpen(){return this.umbrella.open}

 surfaceOffset():Vec{
  const fa=this.frameAnchor;let o:Vec=[0,0,0];
  if(fa){o=[this.position[0]-fa[0],this.position[1]-fa[1],this.position[2]-fa[2]];const l=Math.hypot(...o);if(l>.6)o=o.map(v=>v*.6/l) as Vec;}
  return o;
 }
 dodgePose(phase:number){
  if(phase<.14||phase>.82)this.impact=Math.max(this.impact,.35);
  else this.jumpStretch=Math.max(this.jumpStretch,.19*Math.sin(phase*Math.PI));
 }
 render(pass:SlimeRenderPass){
  if(!this.running)return;
  this.renderer.setOffset(this.surfaceOffset());
  if(this.running)this.renderer.render(pass,this.forward,this.element,this.quality,actor=>this.decals.render(pass,actor,this.quality));
 }

 jump(){this.jumpRequest=true;this.jumpBuffer=.12;}
 launch(target:Vec){this.commands.push({type:'launch',target:[...target]});}
 setMood(mood:Mood,duration=.8,priority=60){this.face.pulse(mood,duration,priority);}
 private meleeAim():Vec|undefined{
  const t=this.battleAim?.target;
  if(t&&t.health>0&&!this.combat.blocked(this.position,t.position)){
   const dx=t.position[0]-this.position[0],dz=t.position[2]-this.position[2],d=Math.hypot(dx,dz);
   if(d>.01)return [dx/d,0,dz/d];
  }
 }
 attack(){
  this.forward=this.meleeAim()??this.forward;
  this.combat.attack(this.element,this.forward);
 }
 /** Casts the active element's E (Tactical), R (Follow-up/Control), or Q (Elemental Burst) ARPG skill. */
 castSkill(slot:SkillSlot):SkillDef|null{
  if(this.inputLock||this.options.battleTargets&&this.mode!=='play')return null;
  const check=this.skills.canCast(this.element,slot);
  if(!check.ok){
   if(check.reason==='energy')this.toast(`${check.def.name} 能量不足（${Math.floor(this.skills.energy)}/${check.def.energyCost}）`);
   return null;
  }
  let aimPoint:Vec|undefined;
  const lock=this.battleAim, target=lock?.target;
  if(target&&target.health>0&&!isSelfSkill(check.def)){
   const status=skillAimStatus(this.position,target.position,check.def,this.combat.blocked);
   if(status==='ready')aimPoint=[...target.position];
   else if(lock.hard){lock.denied(status==='far'?'超出'+check.def.shortName+'射程':'目标受遮挡');return null;}
  }
  const def=this.skills.cast(this.element,slot);
  if(!def)return null;
  const origin:Vec=[...this.position];
  const fwd:Vec=[...this.forward];
  if(aimPoint){
   const dx=aimPoint[0]-origin[0],dz=aimPoint[2]-origin[2],d=Math.hypot(dx,dz);
   if(d>.01){fwd[0]=dx/d;fwd[2]=dz/d;this.forward=[...fwd];}
  }
  this.face.pulse(slot==='Q'?'Happy':'Attack',slot==='Q'?.65:.42,65);
  this.shake=Math.max(this.shake,slot==='Q'?.045:.022);
  if(def.archetype==='dash'&&def.dashDist){
   const moved=this.world.moveCapsule(this.position,[fwd[0]*def.dashDist,0,fwd[2]*def.dashDist],.22,.5);
   const ty=this.world.support(moved.position[0],moved.position[2],this.position[1]+.6);
   if(ty!==null)moved.position[1]=Math.max(moved.position[1],ty);
   this.position=moved.position;
   this.velocity[0]=fwd[0]*6;this.velocity[2]=fwd[2]*6;
  }else if(def.archetype==='leap_slam'){
   this.velocity[1]=5.2;this.grounded=false;this.impact=.42;
  }else if(def.archetype==='slam'||def.archetype==='sweep'){
   this.slashVfx.playSwing(def.element,3,origin,fwd,.36);
   this.impact=.32;
  }else{
   this.jumpStretch=.26;
  }
  const dashEnd=this.options.battleTargets&&def.archetype==='dash'?this.position:undefined;
  this.skillVfx.triggerSkill(def,origin,fwd,this.skillCallbacks(origin),aimPoint,dashEnd);
  this.spawnFloatingText(origin,`${def.icon} ${def.name}`,elements[def.element].rim,1.25);
  return def;
 }
 getCombatHudState():CombatHudSnapshot{return this.skills.snapshot(this.element);}
 private skillCallbacks(castOrigin?:Vec){
  return {
   getTargetPositions:()=>this.combat.targets.filter(t=>t.health>0).map(t=>t.position),
   castWall:this.options.battleTargets?(a:Vec,b:Vec)=>this.world.cast(a,b,.055)?.point:undefined,
   blocked:this.options.battleTargets?this.combat.blocked:undefined,
   sampleTerrain:(x:number,z:number)=>this.world.terrain(x,z),
   onSpawnBurst:(pos:Vec,el:number,count?:number,spread?:number)=>this.slashVfx.spawnBurst(pos,el,count,spread),
   onSkillHitArea:(center:Vec,def:SkillDef,isBurst?:boolean)=>{
    if(castOrigin&&this.options.battleTargets&&def.archetype!=='chain'&&this.combat.blocked(castOrigin,center))return;
    const hits=this.combat.hitTargetsInRadius(center,def.radius,def.element,def.damage,this.elapsed,(t,dmg,el,reaction)=>this.hit(t,dmg,el,reaction),!!this.options.battleTargets);
    if(hits>0&&def.energyGain>0)this.skills.addEnergy(def.energyGain*0.5);
    this.decals.stamp(center,def.element,this.elapsed,isBurst?1.15:.8);
    // Forward skill impacts to Home FarmRegistry & interactive world objects too!
    this.options.onElementAttack?.({
     element:def.element,
     comboIndex:def.slot==='Q'?3:1,
     origin:center,
     forward:[...this.forward],
     range:def.radius,
     radius:def.radius,
     shape:'Sphere',
     exec:'AoE',
     isFinisher:def.slot==='Q'||def.slot==='R',
    });
   },
  };
 }


 teleport(p:Vec){this.cameraHeight.reset();this.currentArm=this.arm;this.frameAnchor=null;this.pendingImpacts.length=0;this.sentLaunches=0;this.commands=[];this.cling=null;this.umbrella.cancel(true);this.umbrellaView.reset();this.position=[...p];this.velocity=[0,0,0];this.generation++;this.decals.reset();}

 /** Move an existing platform in the worker without regenerating the body or its clones. */
 syncBox(index:number){const box=this.world.boxes[index];if(box&&!this.worldPending)this.worker.postMessage({boxUpdate:{index,min:box.min,max:box.max}});}

 /** Replace dynamically built home-prop collision boxes in both main world & simulation worker. */
 setDynamicBoxes(boxes:Box[]){
  this.world.boxes.length=this.baseBoxCount;
  for(const b of boxes)this.world.boxes.push(b);
  if(this.worldPending){this.pendingDynamicBoxes=boxes.map(b=>({...b,min:[...b.min] as Vec,max:[...b.max] as Vec}));}
  else this.worker.postMessage({dynamicBoxes:boxes});
 }

 /** Append dynamically expanded territory terrain surfaces & updated world bounds into main thread & worker. */
 setDynamicSurfaces(surfaces:GroundSurface[],bounds?:{min:Vec;max:Vec}){
  this.world.definition.surfaces.length=this.baseSurfaceCount;
  for(const s of surfaces)this.world.definition.surfaces.push(s);
  if(bounds){
   this.world.definition.bounds=bounds;
   this.options.world.bounds=bounds;
  }
  if(this.worldPending){this.pendingDynamicSurfaces={surfaces,bounds};}
  else this.worker.postMessage({dynamicSurfaces:{surfaces,bounds}});
 }

 attach(){return this}
 private on(target:EventTarget,type:string,fn:(e:any)=>void){target.addEventListener(type,fn as EventListener);this.listeners.push({target,type,fn:fn as EventListener})}

 private bind(){
  this.on(window,'keydown',e=>{
   if(e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable="true"]'))return;
   if(e.repeat&&['Space','KeyT'].includes(e.code))return;
   if(/^Digit[1-6]$/.test(e.code)){this.setElement(Number(e.code.slice(-1))-1);return}
   if(e.code==='KeyT'){if(this.options.battleTargets)return;if(this.cling)this.detachRequest=true;else this.reset();return}
   if(this.mode!=='play')return;
   if(!e.repeat){
    if(e.code==='KeyE'){this.castSkill('E');return}
    if(e.code==='KeyR'){this.castSkill('R');return}
    if(e.code==='KeyQ'){this.castSkill('Q');return}
   }
   if(['Space','KeyC','KeyG','KeyX','Tab'].includes(e.code))e.preventDefault();
   this.keys.add(e.code);
   if(e.code==='Space'&&!e.repeat){this.jumpRequest=true;this.jumpBuffer=.12;this.jumpHeld=true;}
   if(e.code==='Escape')this.pause();
  });
  this.on(window,'keyup',e=>{
   this.keys.delete(e.code);
   if(e.code==='Space')this.jumpHeld=false;
  });
  this.on(window,'blur',()=>{if(this.mode==='play')this.pause()});
  this.on(document,'visibilitychange',()=>{if(document.hidden&&this.mode==='play')this.pause()});
  this.on(document,'pointerlockchange',()=>{if(!document.pointerLockElement&&this.mode==='play')this.pause()});
  this.on(document,'mousemove',e=>{if(this.mode==='play'&&(document.pointerLockElement||this.dragging)){this.yaw-=e.movementX*.0024;this.pitch=clamp(this.pitch+e.movementY*.0022,-.32,1.18)}});
  // Mouse events also report a second button pressed while the first is held.
  if(this.options.onDodgePress){
   this.on(this.ctx.renderer.domElement,'mousedown',e=>{
    if(this.mode!=='play')return;
    if(e.button===2){e.preventDefault();this.options.onDodgePress?.();}
    if(e.button===1&&!document.pointerLockElement){e.preventDefault();this.dragging=true;}
   });
   this.on(window,'mouseup',e=>{if(e.button===1)this.dragging=false;});
  }
  this.on(this.ctx.renderer.domElement,'pointerdown',e=>{
   if(this.mode!=='play')return;
   if(e.button===0){
    if(this.aiming)this.fire();
    else this.attack();
   }
   if(e.button===2&&!this.options.onDodgePress){
    if(document.pointerLockElement)this.rightAimHeld=true;
    else this.dragging=true;
   }
  });
  this.on(window,'pointerup',e=>{
   if(e.button===2&&!this.options.onDodgePress){this.dragging=false;this.rightAimHeld=false;}
  });
  this.on(this.ctx.renderer.domElement,'contextmenu',e=>e.preventDefault());
  this.on(this.ctx.renderer.domElement,'wheel',e=>{if(this.mode==='play'){e.preventDefault();this.arm=clamp(this.arm+Math.sign(e.deltaY)*.4,1.2,5.2)}});
  this.$('#play').onclick=()=>this.play();this.$('#observe').onclick=()=>this.observe();this.$('#reset').onclick=()=>this.reset();
  this.$('#quality').onchange=e=>{this.quality=(e.target as HTMLSelectElement).value as Quality;this.toast(this.quality==='high'?'高画质 · 60 Hz 模拟 / 精细表面':'平衡画质 · 保留完整玩法 / 降低表面刷新')};
  this.ui.querySelectorAll<HTMLElement>('[data-element]').forEach(b=>b.onclick=()=>this.setElement(Number(b.dataset.element)));
 }

 play(){
  if(!this.ready){this.toast('身体正在生成，请稍候');return}
  if(this.mode==='observe'){this.cameraHeight.reset();this.saved={position:this.ctx.camera.position.clone(),target:this.ctx.controls.target.clone(),fov:this.ctx.camera.fov,near:this.ctx.camera.near};this.yaw=0;this.pitch=.23;this.currentArm=this.arm;this.camPos.set(this.position[0],this.position[1]+1.1,this.position[2]+this.arm)}
  this.mode='play';this.ctx.controls.enabled=false;this.ctx.camera.fov=60;this.ctx.camera.near=.04;this.ctx.camera.updateProjectionMatrix();
  this.ui.classList.remove('viewing');this.ui.classList.add('playing');this.$('#observe').classList.remove('hidden');this.$('.combo').classList.remove('hidden');
  const promise=this.ctx.renderer.domElement.requestPointerLock?.();promise?.catch?.(()=>this.toast(this.options.onDodgePress?'可按住鼠标中键转动镜头':'可按住鼠标右键转动镜头'));
  this.$('#status').textContent='正在漫游 · 六属性 decal';
 }
 pause(){
  this.mode='paused';this.keys.clear();this.jumpRequest=false;this.jumpBuffer=0;this.jumpHeld=false;this.aiming=false;this.aimReady=false;this.rightAimHeld=false;this.dragging=false;
  this.ui.classList.remove('playing');this.$('#play span').textContent='继续游玩';this.$('.eyebrow').textContent='TAKE A LITTLE BREATH';this.$('.intro h1').innerHTML='暂停一下，<br>港口一直都在。';this.$('.intro p').innerHTML='点击继续，重新接管这一小团果冻。<br>也可以返回观景，自由欣赏凝露港。';
  if(document.pointerLockElement)document.exitPointerLock();this.$('#status').textContent='操控已暂停';
 }
 observe(){
  this.mode='observe';this.keys.clear();this.jumpRequest=false;this.jumpBuffer=0;this.jumpHeld=false;this.aiming=false;this.aimReady=false;this.rightAimHeld=false;this.dragging=false;
  if(document.pointerLockElement)document.exitPointerLock();
  this.ctx.camera.position.copy(this.saved.position);this.ctx.camera.fov=this.saved.fov;this.ctx.camera.near=this.saved.near;this.ctx.camera.updateProjectionMatrix();this.ctx.controls.target.copy(this.saved.target);this.ctx.controls.enabled=true;this.ctx.controls.update();
  this.ui.classList.remove('playing');this.ui.classList.add('viewing');this.$('#observe').classList.add('hidden');this.$('.combo').classList.add('hidden');this.$('#play span').textContent='开始游玩';this.$('.intro h1').innerHTML='在晴雨之间<br>软软地出发。';this.$('.eyebrow').textContent='A LITTLE JELLY, A QUIET HARBOR';this.$('.intro p').innerHTML='让身体随脚步轻轻晃动，留下一路元素印记。<br>分出一小团自己，再把它们慢慢收回来。';this.$('#status').textContent='自由观景 · 点击开始游玩';
 }
 setElement(index:number,force=false):boolean{
  const next=clamp(index,0,5);
  if(!force){
   const sw=this.skills.trySwitchElement(this.element,next);
   if(!sw.ok)return false;
   if(!sw.changed)return true;
  }
  this.element=next;
  this.ui.querySelectorAll<HTMLElement>('[data-element]').forEach(b=>{const active=Number(b.dataset.element)===this.element;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
  const e=elements[this.element];this.$('#element-tag').textContent=e.tag+' / '+e.name;this.$('#element-trail').textContent=e.trail;this.ui.style.setProperty('--accent',e.color);
  if(!force)this.toast(e.name+'属性 · '+e.trail);
  return true;
 }
 reset(){
  this.cameraHeight.reset();this.currentArm=this.arm;this.face.reset();this.frameAnchor=null;this.pendingImpacts.length=0;this.sentLaunches=0;this.commands=[];this.cling=null;this.umbrella.cancel(true);this.umbrellaView.reset();this.slashVfx.reset();this.skillVfx.reset();this.skills.reset();this.debugFreeze=false;
  this.position=[...this.spawn];this.velocity=[0,0,0];this.forward=[0,0,-1];this.grounded=true;this.jumps=0;this.spread=0;this.impact=0;this.jumpStretch=0;this.airBounce=0;this.coyoteTimer=0;this.jumpBuffer=0;this.jumpHeld=false;
  this.aiming=false;this.aimReady=false;this.rightAimHeld=false;this.keys.clear();this.combat.reset();this.decals.reset();this.generation++;this.resets++;this.latest=null;this.yaw=0;this.pitch=.23;
  if(this.mode==='play')this.camPos.set(this.position[0],1.1,this.position[2]+this.arm);
  this.toast('已回到码头 · 分身与木靶已重置');
 }

 private fail(error:string){this.workerErrors.push(error);this.$('#status').textContent='模拟异常，请重置角色';console.error('[Slime worker]',error);this.busy=false;this.toast('模拟出现异常：'+error.slice(0,90));}
 private receive(frame:MeshFrame&{error?:string}){
  this.busy=false;this.received++;if(frame.error){this.fail(frame.error);return}
  this.recycle={positions:frame.positions,normals:frame.normals,slots:frame.slots};
  if(frame.generation!==this.generation){this.dropped++;return}
  this.sentLaunches=0;
  if(frame.shots.length<this.lastShotCount&&!frame.impacts?.some(i=>i.targetId!==null))this.face.pulse('Happy',.8,50);
  this.lastShotCount=frame.shots.length;this.latest=frame;this.frameAnchor=this.sentAnchor;
  this.renderer.receive(frame);
  if(frame.impacts?.length){
   this.pendingImpacts.push(...frame.impacts);
   if(this.mode==='play')this.resolveImpacts();
  }
  this.decals.feed(frame,this.element,this.grounded&&!this.swimming);
  this.workerTimes.push(frame.simMs);this.meshTimes.push(frame.meshMs);if(this.workerTimes.length>600){this.workerTimes.shift();this.meshTimes.shift()}
  if(!this.ready){this.ready=true;this.options.onReady?.();this.$('#status').textContent='自由观景 · 点击开始游玩';this.toast('史莱姆已就绪 · 可以开始游玩')}
 }
 private resolveImpacts(){
  for(const impact of this.pendingImpacts.splice(0)){
    if(impact.targetId===null){
     this.slashVfx.spawnBurst(impact.point,impact.element,10,1.4);
     this.decals.stamp(impact.point,impact.element,this.elapsed,.5);
     this.options.onBattleSceneryHit?.(impact.point,impact.element);continue;
    }
    if(this.options.burstOnEnemy)this.options.onBattleCloneBurst?.(impact.point,impact.element);
    const target=this.combat.targets.find(t=>t.id===impact.targetId&&t.health>0);
    if(target)this.combat.applyHitToTarget(target,24,impact.element,this.elapsed,
      (t,damage,element,reaction)=>this.hit(t,damage,element,reaction,impact.point));
    else this.slashVfx.spawnBurst(impact.point,impact.element,14,2.2);
  }
 }
 private createTraining(){
  const labelHost=this.options.ui===false?document.body:this.ui;
  for(const target of this.combat.targets){const g=new this.T.Group();g.position.fromArray(target.position);g.name='Slime training target '+target.id;const wood=new this.T.MeshStandardMaterial({color:0xb39a76,roughness:.8});const post=new this.T.Mesh(new this.T.CylinderGeometry(.055,.07,.9,10),wood);post.position.y=.45;g.add(post);const board=new this.T.Mesh(new this.T.CylinderGeometry(.37,.37,.10,32),wood.clone());board.rotation.x=Math.PI/2;board.position.y=.9;board.castShadow=true;g.add(board);for(let i=0;i<3;i++){const ring=new this.T.Mesh(new this.T.TorusGeometry(.10+i*.09,.012,6,36),new this.T.MeshBasicMaterial({color:i%2?0xe9eddb:0x608773}));ring.position.set(0,.9,.06);g.add(ring)}this.ctx.scene.add(g);this.targetMeshes.push(g);const label=document.createElement('div');label.className='target-label arpg-target-label';label.innerHTML='<span class="t-head">木靶 <b class="aura"></b></span><div class="bar"><div class="fill"></div></div>';labelHost.appendChild(label);this.targetLabels.push(label)}
  for(const b of (this.options.showCollisionBoxes?this.world.boxes:[]).filter(b=>b.name.startsWith('training'))){const m=new this.T.Mesh(new this.T.BoxGeometry(b.max[0]-b.min[0],b.max[1]-b.min[1],b.max[2]-b.min[2]),new this.T.MeshStandardMaterial({color:0x8da69d,roughness:.8}));m.position.set((b.min[0]+b.max[0])/2,(b.min[1]+b.max[1])/2,(b.min[2]+b.max[2])/2);m.castShadow=true;m.receiveShadow=true;this.ctx.scene.add(m);this.targetMeshes.push(m)}
 }
 private createLightning(){const g=new this.T.BufferGeometry();g.setAttribute('position',new this.T.BufferAttribute(this.lightningPositions,3).setUsage(this.T.DynamicDrawUsage));g.setDrawRange(0,0);this.lightning=new this.T.LineSegments(g,new this.T.LineBasicMaterial({color:0xd6c5ff,transparent:true,opacity:.85,depthWrite:false}));this.lightning.layers.set(1);this.lightning.frustumCulled=false;this.ctx.scene.add(this.lightning)}
 private updateLightning(time:number){if(this.element!==3||!this.latest){this.lightning.visible=false;return}this.lightning.visible=true;let at=0;const center=this.latest.centers[0]??[this.position[0],this.position[1]+.2,this.position[2]];const segments:(Vec[])[]=[];const flicker=Math.floor(time*18);if(flicker%5<2){const pts:Vec[]=[];for(let i=0;i<17;i++){const a=i/16*Math.PI*1.8+time*3;pts.push([center[0]+Math.cos(a)*(.29+Math.sin(i*19+flicker)*.025),center[1]+Math.sin(a*2)*.13,center[2]+Math.sin(a)*.29])}segments.push(pts)}for(const shot of this.latest.shots.slice(0,3)){if(distance(shot.center,center)>4.5||flicker%4===0)continue;segments.push(Array.from({length:13},(_,i)=>{const t=i/12,bow=Math.sin(t*Math.PI)*.10;return center.map((v,k)=>mix(v,shot.center[k],t)+Math.sin(i*43+flicker*9+k*6)*bow) as Vec}))}for(const pts of segments)for(let i=0;i<pts.length-1;i++)for(const p of [pts[i],pts[i+1]]){this.lightningPositions.set(p,at*3);at++}this.lightning.geometry.attributes.position.needsUpdate=true;this.lightning.geometry.setDrawRange(0,at)}

 /** UE USlimeAbilityComponent::UpdateLaunchAim + GetCannonMuzzle port (40 m center-screen ray, 28-36 m/s low-arc cannon). */
 private battleColliders():BattleCollider[]{
  return this.combat.targets.filter(t=>t.health>0).map(t=>({id:t.id,radius:.52,
   center:[t.position[0],t.position[1]+.75,t.position[2]]}));
 }
 private aim(){
  const camera=this.ctx.camera;
  const dir=new this.T.Vector3();
  camera.getWorldDirection(dir);
  const camStart=camera.position.toArray() as Vec;
  const camEnd=camera.position.clone().addScaledVector(dir,CANNON.aimDistance).toArray() as Vec;
  let aimHit=this.world.cast(camStart,camEnd,.02);
  // Ignore accidental hits behind the slime along the camera boom
  const minDist=Math.max(.5,this.currentArm-.35);
  if(this.options.battleTargets&&aimHit&&distance(camStart,aimHit.point)<=minDist){
   // A camera-only obstruction behind the actor must not hide the next mast on the ray.
   const near=camStart.map((v,i)=>v+(camEnd[i]-v)*(minDist+.01)/CANNON.aimDistance) as Vec;
   aimHit=this.world.cast(near,camEnd,.02);
  }
  const worldTarget=aimHit&&distance(camStart,aimHit.point)>minDist?aimHit.point:null;
  this.launchTarget=worldTarget??camEnd;
  if(this.options.battleTargets){
   const target=firstBattleContact(camStart,camEnd,0,this.battleColliders(),worldTarget?distance(camStart,worldTarget)/CANNON.aimDistance:Infinity);
   if(target&&distance(camStart,target.point)>minDist)this.launchTarget=target.point;
  }

  const shotRadius=.27*Math.cbrt(.3);
  const bodyCenter:Vec=[this.position[0],this.position[1]+.20,this.position[2]];
  const bodyRad=this.latest?.radii[0]??[.34,.22,.34];
  const dx=this.launchTarget[0]-bodyCenter[0],dz=this.launchTarget[2]-bodyCenter[2],hd=Math.hypot(dx,dz);
  const aimDirX=hd>.01?dx/hd:this.forward[0],aimDirZ=hd>.01?dz/hd:this.forward[2];
  const reach=Math.abs(aimDirX)*bodyRad[0]+Math.abs(aimDirZ)*bodyRad[2];
  // UE GetCannonMuzzle: upper body elevation prevents floor false-positives
  const muzzleY=Math.max(bodyCenter[1]+.14,this.position[1]+Math.max(.34,bodyRad[1]*1.55));
  const start:Vec=[bodyCenter[0],muzzleY,bodyCenter[2]];
  const muzzle:Vec=[bodyCenter[0]+aimDirX*(reach+shotRadius+CANNON.clearance),muzzleY,bodyCenter[2]+aimDirZ*(reach+shotRadius+CANNON.clearance)];
  const sepBlocked=!!this.world.cast(start,muzzle,shotRadius*.45);

  const solved=solveCannonLaunch(muzzle,this.launchTarget,CANNON.speed,CANNON.maxSpeed,CANNON.gravity);
  let pathBlocked=false;
  if(solved&&!sepBlocked){
   let prev:Vec=muzzle;
   const steps=Math.max(1,Math.min(40,Math.ceil(solved.flightTime/.03)));
   for(let i=1;i<=steps;i++){
    const next=cannonPositionAt(muzzle,solved.velocity,CANNON.gravity,solved.flightTime*i/steps);
    const h=this.world.cast(prev,next,shotRadius*.4);
    if(h){
     pathBlocked=distance(h.point,this.launchTarget)>Math.max(.65,shotRadius*3.2);
     break;
    }
    prev=next;
   }
  }
  const activeShots=this.occupiedShots;
  // Match UE CanFireLaunch: separation block prevents fire; mid-flight obstacle only dims crosshair.
  this.launchBlocked=sepBlocked||!solved;
  this.aimReady=!this.launchBlocked&&!pathBlocked&&this.launchCooldown<=0&&activeShots<5;
  this.pendingCannon=solved?{muzzle,start,target:[...this.launchTarget],velocity:solved.velocity,flightTime:solved.flightTime,gravity:CANNON.gravity}:null;
  this.ui.classList.toggle('aim-blocked',!this.aimReady);
 }

 fire(){
  if(this.launchCooldown>0)return;
  if(this.occupiedShots>=5){this.toast('分身已达 5 团，按住 X 收回来');this.launchCooldown=.35;return}
  this.aim();
  if(!this.pendingCannon||this.launchBlocked)return;
  this.face.pulse('Spit',.38,55);
  this.commands.push({type:'launch',target:[...this.launchTarget],cannon:{...this.pendingCannon,element:this.element,burstOnEnemy:this.options.burstOnEnemy}});
  this.launchCooldown=CANNON.fireInterval;
  this.aimRecoil=1;
  this.shake=Math.max(this.shake,.014);
  this.options.onFire?.();
 }

 private movement(dt:number,time:number){
  this.spread=clamp(this.spread+(this.keys.has('KeyC')&&this.grounded?dt/.42:-dt/.58),0,1);
  let x=(this.keys.has('KeyD')?1:0)-(this.keys.has('KeyA')?1:0),z=(this.keys.has('KeyW')?1:0)-(this.keys.has('KeyS')?1:0);
  if(this.inputLock){x=0;z=0;this.jumpRequest=false;this.jumpBuffer=0}
  const norm=Math.hypot(x,z);if(norm){x/=norm;z/=norm}
  const fx=-Math.sin(this.yaw),fz=-Math.cos(this.yaw),rightX=Math.cos(this.yaw),rightZ=-Math.sin(this.yaw);
  const speed=(this.keys.has('ShiftLeft')?6.4:3.3)*mix(1,.45,this.spread)*(this.swimming?(this.element===0?1:.64):1);
  const targetX=(rightX*x+fx*z)*speed,targetZ=(rightZ*x+fz*z)*speed;

  // Crisp ground acceleration/braking + responsive UE air/umbrella control
  const accel=this.grounded
    ?(norm?42:50)
    :(this.umbrella.open?(norm?28:18):(norm?22:10));
  const change=accel*dt;
  this.velocity[0]+=clamp(targetX-this.velocity[0],-change,change);
  this.velocity[2]+=clamp(targetZ-this.velocity[2],-change,change);
  if(norm||this.aiming)this.forward=[fx,0,fz];
  if(norm&&!this.aiming){const d=Math.hypot(targetX,targetZ)||1;this.forward=[targetX/d,0,targetZ/d]}

  const lock=this.battleAim;
  if(lock?.hard&&lock.target&&lock.target.health>0){
   const dx=lock.target.position[0]-this.position[0],dz=lock.target.position[2]-this.position[2],d=Math.hypot(dx,dz);
   if(d>.01)this.forward=[dx/d,0,dz/d];
  }
  const mv:[number,number]=[rightX*x+fx*z,rightZ*x+fz*z];
  this.clingCooldown=Math.max(0,this.clingCooldown-dt);
  if(!this.cling&&norm&&this.clingCooldown<=0&&this.spread<.4&&!this.swimming&&!this.aiming){
   const s=tryAttach(this.world,this.position,mv);
   if(s&&(!this.grounded||(this.clingPush+=dt)>=.14)){
    this.cling=s;this.clingPush=0;this.velocity=[0,0,0];this.jumps=0;this.impact=.1;
    this.umbrella.cancel();this.face.pulse('Squash',.2,40);this.options.onCling?.(true);
   }else if(!s)this.clingPush=0;
  }else if(!norm)this.clingPush=0;

  if(this.cling){
   const r=stepCling(this.world,this.cling,this.position,{move:mv,jump:this.jumpRequest,detach:this.detachRequest},dt);
   this.jumpRequest=false;this.jumpBuffer=0;this.detachRequest=false;this.position=r.position;this.velocity=r.velocity;this.cling=r.state;this.grounded=r.event==='mantle'||r.event==='floor';this.swimming=false;
   if(this.cling && !this.cling.mantle && !transientElement(this.element)){
    const {point,normal}=this.cling;
    this.decals.wall.touch([point[0],this.position[1]+.16,point[2]],normal,this.element,this.elapsed);
   }
   if(r.state)this.forward=[r.state.normal[0],0,r.state.normal[2]];
   else{
    this.clingCooldown=r.event==='jump'?CLING.cooldown:r.event==='mantle'||r.event==='floor'||r.event==='vault'?.15:CLING.cooldown*1.5;
    this.jumps=this.grounded?0:1;
    if(r.event==='jump'){this.impact=.12;this.jumpStretch=.26;this.face.pulse('Happy',.2,40)}
    this.options.onCling?.(false);
   }
   if(this.grounded)this.lastSafe=[...this.position];
   return this.combat.update(dt,this.position,time,(target,damage,el,reaction)=>this.hit(target,damage,el,reaction)).pose;
  }

  // Coyote time & jump buffer for zero-sluggishness platforming
  if(this.grounded)this.coyoteTimer=.12;
  else this.coyoteTimer=Math.max(0,this.coyoteTimer-dt);
  if(this.jumpBuffer>0)this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);

  // Space press while airborne after double-jump (or umbrella open) toggles UE Umbrella
  if(this.jumpRequest&&!this.grounded&&this.coyoteTimer<=0&&(this.umbrella.open||this.jumps>=2)){
   this.umbrella.toggle(this.grounded,false,this.swimming,this.jumps,2);
   this.jumpRequest=false;this.jumpBuffer=0;
  }

  if(this.jumpBuffer>0){
   const canFirstJump=this.grounded||this.coyoteTimer>0;
   if(canFirstJump){
    this.velocity[1]=6.6;this.grounded=false;this.swimming=false;this.jumps=1;this.coyoteTimer=0;this.jumpBuffer=0;this.jumpRequest=false;
    this.impact=.08;this.jumpStretch=.30;this.umbrella.cancel();
   }else if(this.jumps<2){
    this.velocity[1]=5.6;this.grounded=false;this.jumps=2;this.jumpBuffer=0;this.jumpRequest=false;
    this.airBounce=1;this.jumpStretch=.22;this.face.pulse('Happy',.2,35);this.umbrella.cancel();
   }
  }
  this.jumpRequest=false;

  // Variable jump height cut when releasing Space early on upward arc
  if(!this.jumpHeld&&this.velocity[1]>2.6&&!this.umbrella.open)this.velocity[1]-=18*dt;

  // Asymmetric gravity: crisp ascent, decisive descent (eliminates floaty heavy feeling)
  const gScale=this.options.gravityScale??1;
  const gravity=(this.velocity[1]<0&&!this.umbrella.open?20.5:15.7)*gScale;
  this.velocity[1]-=gravity*dt;

  this.umbrella.step(dt,time,this.velocity[1],this.grounded,false,this.swimming);
  this.velocity[1]=this.umbrella.limitFallVelocity(this.velocity[1],time);

  const combat=this.combat.update(dt,this.position,time,(target,damage,el,reaction)=>this.hit(target,damage,el,reaction));
  const lunge=combat.lunge;
  const move:Vec=[this.velocity[0]*dt+this.combat.direction[0]*lunge,this.velocity[1]*dt,this.velocity[2]*dt+this.combat.direction[2]*lunge];
  if(!this.dodgeMotion&&this.combat.active&&lock?.target&&lock.target.health>0){
   stopAtMeleeTarget(move,this.position,lock.target.position);
  }
  if(this.dodgeMotion){move[0]=this.dodgeMotion[0];move[2]=this.dodgeMotion[2];this.velocity[0]=move[0]/Math.max(dt,.001);this.velocity[2]=move[2]/Math.max(dt,.001);}
  const moved=this.world.moveCapsule(this.position,move,this.spread>.4?.17:.22,mix(.52,.18,this.spread));
  const next=moved.position;
  if(this.options.battleTargets&&move[1]>0){
   const top=next[1]+mix(.52,.18,this.spread);
   const roof=this.world.cast([next[0],top,next[2]],[next[0],top+move[1],next[2]],.015);
   if(roof){move[1]*=Math.max(0,roof.t-.01);this.velocity[1]=0;}
  }
  next[1]+=move[1];
  const floor=this.world.support(next[0],next[2],this.position[1]);
  if(floor!==null&&this.velocity[1]<=0&&next[1]<=floor+.04&&this.position[1]>=floor-.38){
   const fluid=this.world.fluid(next[0],next[2]);
   const floating=fluid!==null&&floor<=fluid-.05;
   if(!this.grounded){
    this.face.pulse(floating?'Happy':'Squash',.20,40);
    this.impact=clamp(-this.velocity[1]*.038,0,.50);
    this.options.onLand?.(-this.velocity[1],floating);
   }
   this.umbrella.cancel();
   next[1]=floor;this.velocity[1]=0;this.grounded=true;this.jumps=0;this.swimming=floating;
  }else{this.grounded=false;this.swimming=false}
  this.position=next;
  if(this.outOfBounds()){
   const safe=[...this.lastSafe] as Vec;
   if(this.options.battleTargets)this.teleport(safe);
   else{this.reset();this.position=safe;}
  }else if(this.grounded&&next[1]>-2)this.lastSafe=[...next];
  return combat.pose;
 }

 private outOfBounds(){const b=this.options.world.bounds;if(!b)return this.position[1]<this.spawn[1]-20;return this.position.some((v,k)=>v<b.min[k]||v>b.max[k]);}

 /**
  * UE over-the-shoulder aiming camera:
  * Shifts BOTH camera position and look-at pivot by shoulder (+0.45 m right) & height (+0.60 m up)
  * so screen center stays strictly aligned with yaw/pitch ray while the slime clears the bottom-left frame.
  */
 private camera(dt:number){
  const rate=1/Math.max(LAUNCH_CAM.blendSeconds,.01);
  this.aimBlend=this.aiming?Math.min(1,this.aimBlend+rate*dt):Math.max(0,this.aimBlend-rate*dt);
  const eased=smooth(this.aimBlend);
  const right=new this.T.Vector3(Math.cos(this.yaw),0,-Math.sin(this.yaw));
  const baseHeight=mix(.24,.36,clamp((this.arm-1.2)/4,0,1));
  const [x,foot,z]=this.position;
  // Descending a tread can briefly leave the capsule airborne until it finds the next tread.
  const floor=this.grounded?foot:this.world.support(x,z,foot);
  const stepReach=.34+.08*Math.hypot(this.velocity[0],this.velocity[2]);
  const onSteps=!this.cling&&!this.swimming&&this.jumps===0&&floor!==null
   &&this.velocity[1]<=0&&foot-floor<=stepReach;
  const filteredFoot=this.cameraHeight.update(foot,dt,onSteps);
  const eye=baseHeight+LAUNCH_CAM.height*eased;
  const pivot=new this.T.Vector3(x,filteredFoot+eye,z).addScaledVector(right,LAUNCH_CAM.shoulder*eased);
  if(filteredFoot<foot&&onSteps){
   // On a steep staircase the filtered eye can lag into the tread. Keep the
   // boom's starting sphere clear, or a ground sample near t=0 collapses it.
   const tread=this.world.support(pivot.x,pivot.z,foot);
   if(tread!==null)pivot.y=Math.max(pivot.y,Math.min(foot+eye,tread+.19));
  }
  if(Math.abs(pivot.y-foot-eye)>.01){
   const physical:Vec=[pivot.x,foot+eye,pivot.z];
   const obstruction=this.world.cast(physical,pivot.toArray(),.12,true);
   if(obstruction)pivot.y=mix(physical[1],pivot.y,Math.max(0,obstruction.t-.03));
  }
  const offset=new this.T.Vector3(Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch)+.05*(1-eased),Math.cos(this.yaw)*Math.cos(this.pitch));
  const desired=pivot.clone().addScaledVector(offset,this.arm);
  const collision=this.world.cast(pivot.toArray(),desired.toArray(),.12,true);
  const wanted=collision?Math.max(.01,this.arm*collision.t-.10):this.arm;
  this.currentArm=wanted<this.currentArm?wanted:mix(this.currentArm,wanted,1-Math.exp(-dt*5.5));
  this.camPos.copy(pivot).addScaledVector(offset,this.currentArm);
  this.ctx.camera.position.copy(this.camPos);
  if(this.shake>0){
   this.ctx.camera.position.x+=Math.sin(this.elapsed*79)*this.shake;
   this.ctx.camera.position.y+=Math.cos(this.elapsed*93)*this.shake;
   this.shake*=Math.exp(-dt*20);
  }
  const locked=this.battleAim?.hard?this.battleAim.target:null;
  if(locked&&locked.health>0){
   this.target.set(locked.position[0],locked.position[1]+.75,locked.position[2]);
   pivot.lerp(this.target,.32);
  }
  this.ctx.camera.lookAt(pivot);
  this.ctx.camera.updateMatrixWorld();
 }

 private hit(target:CombatTarget,damage:number,el=this.element,reaction:ReactionResult|null=null,point:Vec=target.position){
  this.shake=Math.max(this.shake,reaction?.038:.026);
  this.decals.stamp(point,el,this.elapsed,.65);
  this.slashVfx.spawnBurst(point,el,reaction?22:14,reaction?3.0:2.2);
  this.options.onBattleHit?.(target,damage,el,reaction,point);
  this.spawnFloatingText(target.position,`${Math.round(damage)}`,elements[el].rim,1.25);
  if(reaction){
   this.spawnFloatingText(target.position,reaction.label,reaction.color,1.72);
   this.skills.addEnergy(10);
  }
 }
 /** Spawn a 3D world-anchored floating callout (used by farm reactions & combat feedback). */
 spawnFloatingText(pos:Vec,text:string,color='#ffe066',height=1.15){
  this.projectLabel(pos,height,(x,y)=>{
   const host=this.ui.style.display==='none'?document.body:this.ui;
   const label=document.createElement('div');
   label.className='floating-damage world-callout';
   label.style.left=x+'px';label.style.top=y+'px';label.style.color=color;
   label.textContent=text;
   host.appendChild(label);
   setTimeout(()=>label.remove(),1150);
  });
 }
 private projectLabel(pos:Vec,height:number,fn:(x:number,y:number)=>void){const p=new this.T.Vector3(pos[0],pos[1]+height,pos[2]).project(this.ctx.camera);if(p.z<1&&p.z>-1&&Math.abs(p.x)<1.2&&Math.abs(p.y)<1.2)fn((p.x*.5+.5)*innerWidth,(-p.y*.5+.5)*innerHeight)}

 update(time:number,rawDt:number){
  if(!this.running)return;
  const now=performance.now(),actualDt=(now-this.lastPerf)/1000;this.lastPerf=now;
  if(actualDt>0&&actualDt<1){this.frameTimes.push(actualDt*1000);if(this.frameTimes.length>1800)this.frameTimes.shift()}
  const dt=Math.min(rawDt,.05);
  this.elapsed=time;
  this.impact*=Math.exp(-dt*12);
  this.jumpStretch*=Math.exp(-dt*13);
  this.airBounce=Math.max(0,this.airBounce-dt*4.5);
  this.aimRecoil=Math.max(0,this.aimRecoil-dt*7);
  this.launchCooldown=Math.max(0,this.launchCooldown-dt);


  this.aiming=this.mode==='play'&&(this.options.defaultAim===true||this.keys.has('KeyG')||this.rightAimHeld);
  this.ui.classList.toggle('aiming',this.aiming);
  let pose=idlePose();
  if(this.mode==='play'){
   if(this.pendingImpacts.length)this.resolveImpacts();
   pose=this.movement(dt,time);
   this.camera(dt);
   if(this.aiming){this.aim()}else{this.aimReady=false;this.pendingCannon=null}
  }else{
   this.combat.targets.forEach(t=>t.hitFlash=Math.max(0,t.hitFlash-dt*4));
   this.umbrella.step(dt,time,0,true,false,false);
  }
  this.face.update(dt,this.velocity,this.grounded,this.aiming,this.combat.active);
  this.renderer.setFace(this.face);
  this.decals.update(time,this.element,this.grounded&&!this.swimming&&!this.cling);
  this.decals.prune(this.latest?.shots.map(s=>s.id)??[]);
  this.updateLightning(time);

  // Update 3D umbrellas for main body + returning airborne mini-slime shots
  const bodyCenter=this.latest?.centers[0]??[this.position[0],this.position[1]+.2,this.position[2]];
  const offset=this.frameAnchor?[this.position[0]-this.frameAnchor[0],this.position[1]-this.frameAnchor[1],this.position[2]-this.frameAnchor[2]]:[0,0,0];
  const bodyBase:Vec=[bodyCenter[0]+offset[0],bodyCenter[1]+offset[1]+.18,bodyCenter[2]+offset[2]];
  this.umbrellaView.update(dt,time,this.element,this.umbrella.open,this.umbrella.openAmount,bodyBase,.27,this.velocity,this.latest?.shots??[]);
  this.slashVfx.update(dt,time,[this.position[0],this.position[1],this.position[2]]);
  if(!this.options.battleTargets||this.mode==='play'){
   this.skills.step(dt);this.skillVfx.update(dt,this.skillCallbacks());
  }

  this.simDt=Math.min(this.simDt+dt,4/60);
  const interval=this.quality==='high'?1/60:1/30;
  if(!this.busy&&(!this.ready||time-this.lastRequest>=interval)){
   const input:FrameInput={
    anchor:[...this.position],velocity:[...this.velocity],forward:[...this.forward],spread:this.spread,
    grounded:this.grounded,recalling:this.keys.has('KeyX'),impact:this.impact,pose,
    dt:this.debugFreeze||this.options.battleTargets&&this.mode!=='play'?0:this.simDt,quality:this.quality,commands:this.commands.splice(0),
    cling:this.cling&&!this.cling.mantle?{point:[...this.cling.point],normal:[...this.cling.normal]}:null,
    battleTargets:this.options.battleTargets?this.battleColliders():undefined,
    generation:this.generation,shapeBlend:this.shapeBlend,jumpStretch:this.jumpStretch,airBounce:this.airBounce,umbrella:this.umbrella.open,
   };
   this.sentLaunches=input.commands.filter(c=>c.type==='launch').length;
   const recycle=this.recycle;this.recycle=undefined;this.sentAnchor=[...input.anchor];
   this.worker.postMessage({input,recycle,world:this.worldPending?this.options.world:undefined},recycle?[recycle.positions.buffer,recycle.normals.buffer,recycle.slots.buffer]:[]);
   if(this.worldPending){
    this.worldPending=false;
    if(this.pendingDynamicBoxes){this.worker.postMessage({dynamicBoxes:this.pendingDynamicBoxes});this.pendingDynamicBoxes=null;}
    if(this.pendingDynamicSurfaces){this.worker.postMessage({dynamicSurfaces:this.pendingDynamicSurfaces});this.pendingDynamicSurfaces=null;}
   }
   this.busy=true;this.simDt=0;this.lastRequest=time;
  }

  for(let i=0;i<this.targetLabels.length;i++){
   const target=this.combat.targets[i],mesh=this.targetMeshes[i];mesh.visible=target.health>0;
   mesh.rotation.z=Math.sin(time*45)*target.hitFlash*.08;mesh.children[1].material.color.set(target.hitFlash>0?elements[target.lastElement].color:0xb39a76);
   const label=this.targetLabels[i];label.style.display='none';
   const distToTarget=distance(this.position,target.position);
   if(target.health>0&&distToTarget<18&&this.mode==='play'){
    this.projectLabel(target.position,1.55,(x,y)=>{label.style.display='block';label.style.left=x+'px';label.style.top=y+'px'});
    (label.querySelector('.fill') as HTMLElement).style.width=100*target.health/target.maxHealth+'%';
    const auraEl=label.querySelector('.aura') as HTMLElement|null;
    if(auraEl){
     if(target.aura!==null){auraEl.textContent=elements[target.aura].name;auraEl.style.background=elements[target.aura].color;auraEl.style.display='inline-block';}
     else auraEl.style.display='none';
    }
   }
  }
  if(time-this.lastUi>.35){
   this.lastUi=time;const mean=(a:number[])=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
   this.$('#metrics').textContent=`${Math.round(1000/(mean(this.frameTimes.slice(-90))||16.7))} FPS · PBF ${this.latest?.particleCount??384} 粒子 · ${this.latest?.count??0} 顶点`;
   this.$('#shot-count').textContent=`分身 ${this.latest?.shots.length??0} / 5`;
   this.$('#combo-name').textContent=this.umbrella.open?'撑伞滑翔':this.combat.active?this.combat.lastName+' / '+(this.combat.index+1):this.keys.has('KeyX')?'正在收回分身':this.aiming?'炮弹瞄准':'自由漫游';
   this.$('#combat-hint').textContent=this.combat.totalHits?`命中 ${this.combat.totalHits} 次 · ${elements[this.element].name}属性`:'沿码头前行，可在木靶旁试试四段连击';
  }
 }

 toast(text:string){if(this.options.onToast){this.options.onToast(text);return}const el=this.$('.toast');el.textContent=text;el.classList.add('show');clearTimeout(this.toastTimer);this.toastTimer=window.setTimeout(()=>el.classList.remove('show'),2400)}

 stats(){
  const stats=(a:number[])=>{const sorted=[...a].sort((a,b)=>a-b);return {mean:a.reduce((s,v)=>s+v,0)/(a.length||1),p95:sorted[Math.floor(sorted.length*.95)]??0,max:sorted.at(-1)??0,samples:a.length}};
  return {ready:this.ready,mode:this.mode,position:this.position,element:this.element,elementName:elements[this.element].name,bodyShape:this.bodyShape,umbrellaOpen:this.umbrella.open,quality:this.quality,viewport:{width:innerWidth,height:innerHeight,pixelRatio:this.ctx.renderer.getPixelRatio()},frame:stats(this.frameTimes),simulation:stats(this.workerTimes),surface:stats(this.meshTimes),shots:this.latest?.shots??[],vertices:this.latest?.count,particles:this.latest?.particleCount,overflow:this.latest?.overflow,stamps:this.decals.stamps,stampCapacity:128,hits:this.combat.totalHits,targets:this.combat.targets,received:this.received,resets:this.resets,errors:this.workerErrors,scene:this.options.sceneStats?.()??{},memory:this.ctx.renderer.info.memory,generation:this.generation};
 }

 dispose(){
  if(!this.running)return;this.running=false;this.observe();this.worker.terminate();this.renderer.dispose();this.decals.dispose();this.umbrellaView.dispose();this.slashVfx.dispose();this.skillVfx.dispose();
  for(const {target,type,fn} of this.listeners)target.removeEventListener(type,fn);
  for(const o of [...this.targetMeshes,this.lightning]){o.removeFromParent();o.traverse?.((m:any)=>{m.geometry?.dispose();if(Array.isArray(m.material))m.material.forEach((a:any)=>a.dispose());else m.material?.dispose()})}
  for(const l of this.targetLabels)l.remove();
  clearTimeout(this.toastTimer);this.ui.remove();
 }
}
