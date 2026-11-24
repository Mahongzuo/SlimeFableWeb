import * as T from 'three';
import type {Vec} from '../slime/types';
import type {CombatTarget} from '../slime/combat';
import type {SlimeCharacter} from '../slime/character';
import type {Stage} from './stage';
import {LAYER} from './stage';
import {createBattleRig} from '../themes/battle-rig';
import {elements} from '../slime/elements';
import {boltContact} from '../templates/battle-dodge';
import type {TelegraphPool} from './combat-juice';

export type EnemyKind='sailor'|'gunner'|'rigger'|'guardian'|'flag'|'light'|'standard'|'captain';
const enemies={
 sailor:['帆布偶兵',76,60],gunner:['瞭望射手',88,60],rigger:['索具偶兵',84,70],guardian:['船首像守卫',295,160],
 flag:['雾口旗甲兵',78,70],light:['轻旗兵',86,65],standard:['护旗手',112,110],captain:['阵旗守将',330,175]
} as const;
const models={sailor:undefined,gunner:undefined,rigger:'boarder',guardian:'figurehead',flag:undefined,light:'light',standard:'heavy',captain:'captain'} as const;
export interface EnemySnapshot{present:boolean;position:Vec;health:number;aura:number|null;auraLeft:number;entryAge:number;poise?:number}
type RigFrame=ReturnType<ReturnType<typeof createBattleRig>['update']>;
type Hit=(time:number,id:number,damage:number)=>void;
type Attack='sweep'|'thrust'|'follow'|'shoot'|'shock';
const blade=new T.Line3(),body=new T.Vector3(),closest=new T.Vector3();
function sweepContact(f:RigFrame,before:Vec,after:Vec){
 const distance=Math.max(f.previousBase.distanceTo(f.bladeBase),f.previousTip.distanceTo(f.bladeTip))+Math.hypot(after[0]-before[0],after[1]-before[1],after[2]-before[2]);
 const steps=Math.max(1,Math.ceil(distance/.04));
 for(let i=0;i<=steps;i++){
  const t=f.sweepStart+(f.sweepEnd-f.sweepStart)*i/steps;
  blade.start.lerpVectors(f.previousBase,f.bladeBase,t);blade.end.lerpVectors(f.previousTip,f.bladeTip,t);
  body.set(before[0]+(after[0]-before[0])*t,before[1]+(after[1]-before[1])*t+.28,before[2]+(after[2]-before[2])*t);
  if(blade.closestPointToPoint(body,true,closest).distanceToSquared(body)<=.36**2)return t;
 }
 return null;
}
type Shot={mesh:T.Mesh;velocity:T.Vector3;age:number;volley:{id:number;spent:boolean};damage:number;homing:boolean;giant:boolean};

export interface EnemyCallbacks {
 onWindupFlash?:(enemy:EnemyActor)=>void;
 onPhaseTwo?:(enemy:EnemyActor)=>void;
 onShockwaveRelease?:(enemy:EnemyActor)=>void;
}

export class EnemyActor {
 readonly rig:ReturnType<typeof createBattleRig>;
 readonly name:string;
 readonly marker:HTMLElement;
 readonly maxPoise:number;
 readonly isShipEnemy:boolean;
 private bar:HTMLProgressElement;
 private poiseBar:HTMLProgressElement;
 private status:HTMLElement;
 private readonly projected=new T.Vector3();
 private readonly shots:Shot[]=[];
 private readonly pool:T.Mesh[]=[];
 private readonly ammo:T.IcosahedronGeometry;
 private readonly flashStar:T.Mesh;
 present=false; dead=false; enraged=false; exposed=false; protected=false;
 move:RigFrame['phase']='approach';
 attackKind:Attack='sweep';turns=0; attackId=0; attackStart=-1;
 poise:number;
 brokenUntil=-Infinity;
 stunnedUntil=-Infinity;
 slowUntil=-Infinity;
 vulnUntil=-Infinity;
 forceExposeUntil=-Infinity;
 shockCooldown=0;
 private phaseTwoTriggered=false;
 private windupFlashed=false;
 private windupAge=0;
 private shockTimer=-1;
 private wait=0;private heading=0;private resolved=false;
 private canBreak=true;private followPending=false;private moveSide=1;private launchHeight=0;
 private entryAge=1;
 private bubble:T.Mesh;
 constructor(
  private stage:Stage,
  private actor:SlimeCharacter,
  readonly kind:EnemyKind,
  readonly home:Vec,
  readonly target:CombatTarget,
  ui:HTMLElement,
  private nextId:()=>number,
  private practiceVariation=0,
  private callbacks:EnemyCallbacks={},
 ){
  this.name=enemies[kind][0];target.name=this.name;target.maxHealth=enemies[kind][1];target.health=0;
  this.maxPoise=enemies[kind][2];this.poise=this.maxPoise;
  this.isShipEnemy=['sailor','rigger','gunner','guardian'].includes(kind);
  this.rig=createBattleRig(this.isShipEnemy,models[kind]);
  this.rig.root.visible=false;stage.scene.add(this.rig.root);
  this.ammo=new T.IcosahedronGeometry(.17,1);
  this.marker=document.createElement('aside');this.marker.className='bp-enemy';this.marker.hidden=true;this.marker.dataset.enemy=kind;
  const b=document.createElement('b');b.textContent=this.name;
  this.bar=document.createElement('progress');this.bar.max=target.maxHealth;
  this.poiseBar=document.createElement('progress');this.poiseBar.className='bp-poise';this.poiseBar.max=this.maxPoise;this.poiseBar.value=this.maxPoise;
  this.poiseBar.hidden=this.isShipEnemy;
  this.status=document.createElement('small');this.marker.append(b,this.bar,this.poiseBar,this.status);ui.append(this.marker);
  this.bubble=new T.Mesh(new T.IcosahedronGeometry(1,1),new T.MeshBasicMaterial({color:'#8edcc7',wireframe:true,transparent:true,opacity:.34,depthWrite:false}));
  this.bubble.position.y=.82;this.bubble.scale.set(.62,.92,.6);this.bubble.visible=false;this.rig.root.add(this.bubble);
  this.flashStar=new T.Mesh(
   new T.OctahedronGeometry(.22,0),
   new T.MeshBasicMaterial({color:'#ffdf75',transparent:true,opacity:.95,depthWrite:false}),
  );
  this.flashStar.position.set(0,1.45,.36);
  this.flashStar.layers.set(LAYER.NO_OUTLINE);
  this.flashStar.visible=false;
  this.rig.root.add(this.flashStar);
 }
 spawn(){
  this.present=true;this.dead=false;this.enraged=false;this.exposed=false;this.protected=false;
  this.phaseTwoTriggered=false;this.windupFlashed=false;this.windupAge=0;this.shockTimer=-1;this.shockCooldown=0;
  this.poise=this.maxPoise;this.brokenUntil=-Infinity;this.stunnedUntil=-Infinity;this.slowUntil=-Infinity;this.vulnUntil=-Infinity;this.forceExposeUntil=-Infinity;
  Object.assign(this.target,{position:[...this.home],health:this.target.maxHealth,aura:null,auraUntil:0,hitFlash:0,hits:0});
  this.wait=0;this.turns=0;this.canBreak=true;this.followPending=false;this.heading=0;this.moveSide=this.practiceVariation<0?-1:1;this.launchHeight=0;
  this.entryAge=this.kind==='rigger'||this.kind==='gunner'?0:1;
  if(this.entryAge===0)this.placeReinforcement();
  this.move='approach';this.rig.root.position.fromArray(this.target.position);this.rig.root.rotation.y=0;this.rig.root.visible=true;
  this.rig.reset();this.rig.setEnraged(false);this.rig.setExposed(false);this.flashStar.visible=false;
 }
 private placeReinforcement(){
  const t=this.entryAge,s=this.target.position;
  s[0]=this.home[0]+(1-t)*(this.kind==='rigger'?1.6:.95);
  s[1]=this.home[1]+(this.kind==='rigger'?4*t*(1-t)*.91:0);
  s[2]=this.home[2]+(this.kind==='rigger'?-.20:.54)*(1-t);
 }
 snapshot(now:number):EnemySnapshot{
  return {present:this.present,entryAge:this.entryAge,position:[...this.target.position],health:this.target.health,aura:this.target.aura,auraLeft:Math.max(0,this.target.auraUntil-now),poise:this.poise};
 }
 restore(saved:EnemySnapshot,clock:number){
  this.clearShots();this.spawn();this.present=saved.present;this.entryAge=saved.entryAge;
  this.poise=saved.poise??this.maxPoise;
  Object.assign(this.target,{position:[...saved.position],health:saved.health,aura:saved.aura,auraUntil:clock+saved.auraLeft});
  this.dead=saved.health<=0;this.rig.root.visible=saved.present&&!this.dead;this.rig.root.position.fromArray(saved.position);
 }
 get living(){return this.present&&this.target.health>0;}
 get projectile(){return this.shots[0]?.mesh.position.toArray()??null;}
 isBroken(clock:number){return this.living&&clock<this.brokenUntil;}
 isVulnerable(clock:number){return clock<this.vulnUntil;}
 clearShots(){for(const s of this.shots){s.mesh.visible=false;this.pool.push(s.mesh);}this.shots.length=0;}
 die(){if(this.dead)return;this.dead=true;this.rig.defeat();this.bubble.visible=false;this.flashStar.visible=false;this.shockTimer=-1;}

 stun(duration:number,clock:number){
  if(!this.living)return;
  this.stunnedUntil=Math.max(this.stunnedUntil,clock+duration);
  this.rig.stagger(duration);
 }

 forceExpose(duration:number,clock:number){
  if(!this.living||this.kind!=='guardian')return;
  this.forceExposeUntil=Math.max(this.forceExposeUntil,clock+duration);
  this.exposed=true;
  this.rig.setExposed(true);
 }

 /** Reduce poise; returns true when poise breaks on this hit. */
 damagePoise(amount:number,clock:number):boolean{
  if(!this.living||this.isBroken(clock)||amount<=0)return false;
  this.poise=Math.max(0,this.poise-amount);
  if(this.poise<=0){
   this.brokenUntil=clock+3.2;
   this.shockTimer=-1;
   this.followPending=false;
   this.rig.stagger(3.2);
   return true;
  }
  return false;
 }

 /** Perform a high-damage finisher on a poised-broken enemy. */
 execute(clock:number):number{
  if(!this.isBroken(clock))return 0;
  const dmg=Math.round(this.target.maxHealth*.28+42);
  this.target.health=Math.max(0,this.target.health-dmg);
  this.target.hitFlash=1;
  this.brokenUntil=-Infinity;
  this.poise=this.maxPoise;
  this.rig.hit(0);
  if(this.target.health<=0)this.die();
  return dmg;
 }

 /** Intercept airborne enemy shots (e.g. via Wind clone or well-aimed volley). */
 interceptShots(point:Vec,radius:number):{intercepted:number;giantBackfire:boolean}{
  let intercepted=0,giantBackfire=false;
  for(let i=this.shots.length-1;i>=0;i--){
   const s=this.shots[i];
   const p=s.mesh.position;
   const r=radius+(s.giant?.58:.32);
   if(Math.hypot(p.x-point[0],p.y-point[1],p.z-point[2])<=r){
    if(s.giant)giantBackfire=true;
    s.mesh.visible=false;this.pool.push(s.mesh);this.shots.splice(i,1);
    intercepted++;
   }
  }
  return {intercepted,giantBackfire};
 }

 hit(point:Vec,reaction?:string){
  const p=this.target.position;this.rig.hit((point[0]-p[0])*Math.cos(this.heading)-(point[2]-p[2])*Math.sin(this.heading));
  if(this.kind==='captain'&&this.move==='recover'&&this.attackKind!=='follow'&&!this.followPending&&this.canBreak&&reaction==='BreakPoise'){
   this.rig.stagger(1);this.canBreak=false;return true;
  }
  return false;
 }
 private fire(origin:T.Vector3,offset:number,speed:number,damage:number,volley:{id:number;spent:boolean},homing=false,giant=false){
  const mat=this.stage.toon(giant?'#ff5c8a':'#ff9761',{emissive:giant?'#c92a54':'#ba532b',emissiveIntensity:giant?.95:.65});
  const mesh=this.pool.pop()??new T.Mesh(this.ammo,mat);
  if(mesh.material!==mat)mesh.material=mat;
  mesh.scale.setScalar(giant?2.15:1.05);
  if(!mesh.parent)this.stage.scene.add(mesh);
  mesh.position.copy(origin);mesh.visible=true;
  const p=this.actor.position;
  const v=new T.Vector3(p[0]-origin.x,p[1]+.28-origin.y,p[2]-origin.z).normalize();
  v.applyAxisAngle(T.Object3D.DEFAULT_UP,offset).multiplyScalar(speed);
  this.shots.push({mesh,velocity:v,age:0,volley,damage,homing,giant});
 }
 private stepShots(dt:number,realDt:number,clock:number,before:Vec,hit:Hit){
  const p=this.actor.position;
  for(let i=this.shots.length-1;i>=0;i--){
   const shot=this.shots[i],from=shot.mesh.position.toArray() as Vec;
   if(shot.homing&&shot.age<3.4){
    const desired=new T.Vector3(p[0]-shot.mesh.position.x,p[1]+.35-shot.mesh.position.y,p[2]-shot.mesh.position.z).normalize();
    const curSpd=shot.velocity.length();
    shot.velocity.normalize().lerp(desired,Math.min(1,dt*1.9)).normalize().multiplyScalar(curSpd);
   }
   shot.mesh.position.addScaledVector(shot.velocity,dt);
   shot.mesh.rotation.y+=dt*(shot.giant?5:8);
   shot.age+=dt;
   const to=shot.mesh.position.toArray() as Vec;
   const hitR=shot.giant?.62:.45;
   const touch=boltContact([from[0]-before[0],from[1]-before[1]-.28,from[2]-before[2]],[to[0]-p[0],to[1]-p[1]-.28,to[2]-p[2]],hitR);
   const wall=this.actor.world.cast(from,to,.12),bodyFirst=touch!==null&&(!wall||touch<wall.t);
   if(!bodyFirst&&!wall&&shot.age<5.8)continue;
   shot.mesh.visible=false;this.pool.push(shot.mesh);this.shots.splice(i,1);
   if(bodyFirst&&!shot.volley.spent){
    shot.volley.spent=true;hit(clock-realDt+realDt*touch!,shot.volley.id,shot.damage);
   }
  }
 }
 private travel(dx:number,dz:number,dt:number){
  const p=this.target.position,next=this.actor.world.moveCapsule(p,[dx,0,dz],.27,.75).position;
  const floor=this.actor.world.support(next[0],next[2],p[1]+.04);
  if(floor===null||floor<p[1]-.55||floor>p[1]+.37)return 0;
  const speed=Math.hypot(next[0]-p[0],next[2]-p[2])/dt;
  this.target.position=[next[0],floor,next[2]];return speed;
 }
 tick(dt:number,realDt:number,clock:number,before:Vec,hit:Hit){
  if(!this.present)return;
  this.stepShots(dt,realDt,clock,before,hit);
  if(!this.living){this.die();this.rig.update(dt,0);return;}
  const p=this.actor.position,t=this.target.position,dx=p[0]-t[0],dz=p[2]-t[2],dist=Math.hypot(dx,dz)||.001;
  if(this.entryAge<1){
   this.entryAge=Math.min(1,this.entryAge+dt/.78);this.placeReinforcement();
   this.rig.root.position.fromArray(t);this.rig.root.rotation.y=Math.atan2(dx,dz);this.rig.update(dt,2);return;
  }
  const shooter=['sailor','gunner','guardian'].includes(this.kind);
  const nowEnraged=(this.kind==='captain'||this.kind==='guardian')&&this.target.health<=this.target.maxHealth*.55;
  if(nowEnraged&&!this.phaseTwoTriggered){
   this.phaseTwoTriggered=true;
   this.enraged=true;
   this.rig.setEnraged(true);
   this.callbacks.onPhaseTwo?.(this);
  }
  this.enraged=nowEnraged;
  this.rig.setEnraged(this.enraged);

  // Recover poise slowly after stagger finishes
  if(this.brokenUntil>0&&clock>=this.brokenUntil&&this.poise<=0){
   this.poise=this.maxPoise;
   this.brokenUntil=-Infinity;
  }
  if(this.shockCooldown>0)this.shockCooldown=Math.max(0,this.shockCooldown-dt);

  // Stunned / Poise-broken state holds enemy vulnerable
  if(clock<this.brokenUntil||clock<this.stunnedUntil){
   this.flashStar.visible=false;
   this.rig.root.position.fromArray(this.target.position);
   this.rig.root.rotation.y=this.heading;
   const f=this.rig.update(dt,0);
   this.move=f.phase;
   this.exposed=(this.kind==='guardian')&&(this.move==='recover'||clock<this.forceExposeUntil);
   this.rig.setExposed(this.exposed);this.bubble.visible=this.protected;
   return;
  }

  // Captain Phase-2 ground shockwave slam sequence
  if(this.shockTimer>=0){
   this.shockTimer+=dt;
   this.move='windup';
   this.flashStar.visible=this.shockTimer>.65;
   this.flashStar.scale.setScalar(1.2+Math.sin(clock*28)*.3);
   if(this.shockTimer>=1.05){
    this.shockTimer=-1;this.flashStar.visible=false;this.wait=0;this.shockCooldown=7.5;
    this.callbacks.onShockwaveRelease?.(this);
    const playerDist=Math.hypot(p[0]-t[0],p[2]-t[2]);
    const airborne=p[1]-t[1]>.65;
    if(playerDist<=4.6&&!airborne){
     hit(clock,this.nextId(),22);
    }
   }
   this.rig.root.position.fromArray(this.target.position);
   this.rig.root.rotation.y=this.heading;
   this.rig.update(dt,0);
   return;
  }

  const slowFactor=clock<this.slowUntil?.62:1;
  let speed=0;
  if(this.move==='approach'){
   this.windupFlashed=false;this.windupAge=0;this.flashStar.visible=false;
   this.wait+=dt*slowFactor;this.heading=Math.atan2(dx,dz);
   let ready=false;
   if(shooter){
    if(this.kind!=='guardian'){
     const max=this.kind==='gunner'?1.45:.85;
     const dest=this.home[0]+this.moveSide*max;
     speed=this.travel(T.MathUtils.clamp(dest-t[0],-dt*1.3*slowFactor,dt*1.3*slowFactor),0,dt);
    }
    ready=this.wait>(this.kind==='guardian'?(this.enraged?1.15:1.4):1.15)+this.practiceVariation*.21&&dist<26;
   }else{
    const reach=this.kind==='captain'?1.8:this.kind==='rigger'?1.12:1.55;
    const speedLimit=(this.kind==='light'?2.5:this.kind==='standard'?.85:this.kind==='rigger'?2.0:1.7)*slowFactor;
    // The standard bearer holds the ridge while the light infantry can be lured out of its ward.
    const leashed=this.kind==='standard'&&Math.hypot(t[0]-this.home[0],t[2]-this.home[2])>2.4;
    if(dist>reach-.15&&!leashed)speed=this.travel(dx/dist*speedLimit*dt,dz/dist*speedLimit*dt,dt);
    ready=dist<=reach+.22&&Math.abs(p[1]-t[1])<.9&&this.wait>(this.followPending?.03:.2+this.practiceVariation*.1);
    if(this.kind==='captain'&&this.enraged&&this.shockCooldown<=0&&dist<5.5&&!this.followPending&&this.turns%3===2){
     this.attackKind='shock';this.shockTimer=0;this.wait=0;this.turns++;
     this.callbacks.onWindupFlash?.(this);
     return;
    }
   }
   if(ready){
    let attack:Attack=shooter?'shoot':'sweep';
    if(this.kind==='rigger')attack='thrust';
    if(this.kind==='captain')attack=this.followPending?'follow':this.turns%2===1?'thrust':'sweep';
    if(this.rig.attack(attack)){
     this.followPending=this.enraged&&attack==='sweep';this.canBreak=true;this.attackKind=attack;
     this.attackId=this.nextId();this.attackStart=clock-realDt;this.resolved=false;this.wait=0;this.turns++;this.moveSide*=-1;
     this.windupFlashed=false;this.windupAge=0;
    }
   }
  }
  if(this.kind==='rigger'&&this.move==='strike'){
   this.launchHeight=Math.min(.38,this.launchHeight+dt*2);
   this.travel(Math.sin(this.heading)*dt*1.4,Math.cos(this.heading)*dt*1.4,dt);
  }else this.launchHeight=Math.max(0,this.launchHeight-dt*2.2);
  this.rig.root.position.fromArray(this.target.position);this.rig.root.position.y+=this.launchHeight;
  this.rig.root.rotation.y=this.heading;
  const f=this.rig.update(dt*slowFactor,speed);this.move=f.phase;
  if(this.move==='windup'){
   this.windupAge+=dt*slowFactor;
   const leadDur=this.attackKind==='sweep'?.84:this.attackKind==='follow'?.56:this.attackKind==='shoot'?.80:.48;
   if(!this.windupFlashed&&this.windupAge>=leadDur-.26){
    this.windupFlashed=true;
    this.callbacks.onWindupFlash?.(this);
   }
   this.flashStar.visible=this.windupFlashed;
   const s=.9+.45*Math.sin(clock*36);
   this.flashStar.scale.set(s,s,s);
   (this.flashStar.material as T.MeshBasicMaterial).color.set(this.attackKind==='follow'?'#ff6384':'#ffe37a');
  }else{
   this.flashStar.visible=false;
  }
  this.exposed=this.kind==='guardian'&&(this.move==='recover'||clock<this.forceExposeUntil);
  this.rig.setExposed(this.exposed);this.bubble.visible=this.protected;
  if(f.release){
   const volley={id:this.nextId(),spent:false};
   if(this.kind==='guardian'){
    const angles=this.enraged?[-.34,-.17,0,.17,.34]:[-.20,0,.20];
    for(const angle of angles)this.fire(f.muzzle,angle,this.enraged?5.7:5.4,14,volley);
    if(this.enraged&&this.turns%2===0){
     // Giant slow homing flame orb that the player can shoot mid-air to backfire on the guardian!
     this.fire(f.muzzle,0,3.1,20,{id:this.nextId(),spent:false},true,true);
    }
   }else this.fire(f.muzzle,0,4.5,this.kind==='sailor'?14:13,volley);
  }
  if(f.sweep&&!this.resolved){const touch=sweepContact(f,before,p);if(touch!==null){this.resolved=true;hit(clock-realDt+realDt*touch,this.attackId,this.kind==='captain'?23:this.kind==='flag'?22:13);}}
 }

 /** Submit ground attack telegraph decal to shared pool during enemy windup. */
 drawTelegraph(pool:TelegraphPool){
  if(!this.living)return;
  const pos=this.target.position;
  if(this.shockTimer>=0){
   pool.draw({shape:'circle',origin:pos,yaw:0,radius:4.6,progress:Math.min(1,this.shockTimer/1.05),color:'#ff3d6e'});
   return;
  }
  if(this.move!=='windup'||this.attackKind==='shoot')return;
  const dur=this.attackKind==='sweep'?.84:this.attackKind==='follow'?.56:.48;
  const prog=Math.min(1,this.windupAge/dur);
  if(this.attackKind==='thrust'){
   pool.draw({shape:'line',origin:pos,yaw:this.heading,radius:this.kind==='captain'?3.2:2.6,width:1.15,progress:prog,color:'#ff6b42'});
  }else{
   pool.draw({shape:'sector',origin:pos,yaw:this.heading,radius:this.kind==='captain'?2.65:2.25,angle:Math.PI*.78,progress:prog,color:this.attackKind==='follow'?'#ff4070':'#f4503c'});
  }
 }

 drawMarker(playing:boolean,clock=0){
  const p=this.target.position;this.projected.set(p[0],p[1]+(this.kind==='captain'||this.kind==='guardian'?2.45:1.95),p[2]).project(this.stage.camera);
  this.marker.hidden=!playing||!this.living||Math.abs(this.projected.x)>1||Math.abs(this.projected.z)>1;
  if(this.marker.hidden)return;
  this.marker.style.left=(50+50*this.projected.x)+'%';this.marker.style.top=(50-50*this.projected.y)+'%';
  this.bar.value=this.target.health;
  if(!this.isShipEnemy){
   this.poiseBar.value=this.poise;
   this.marker.dataset.broken=String(this.isBroken(clock));
  }
  const tag=this.isBroken(clock)?'⚡ 失衡 · 按 F 处决!'
   :clock<this.stunnedUntil?'🔔 眩晕'
   :this.protected?'🛡 护旗庇护'
   :this.exposed?'🎯 帆结外露'
   :this.kind==='standard'?'护旗手'
   :this.enraged?(this.kind==='guardian'?'怒海二阶段':'展旗狂战'):'';
  this.status.textContent=[tag,this.target.aura!==null?elements[this.target.aura].name+'附着':''].filter(Boolean).join(' · ');
 }
}
