import * as T from 'three';
import type {Vec} from '../slime/types';
import type {CombatTarget} from '../slime/combat';
import type {SlimeCharacter} from '../slime/character';
import type {Stage} from './stage';
import {createBattleRig} from '../themes/battle-rig';
import {elements} from '../slime/elements';
import {boltContact} from '../templates/battle-dodge';

export type EnemyKind='sailor'|'gunner'|'rigger'|'guardian'|'flag'|'light'|'standard'|'captain';
const enemies={
 sailor:['帆布偶兵',72],gunner:['瞭望射手',86],rigger:['索具偶兵',82],guardian:['船首像守卫',268],
 flag:['雾口旗甲兵',76],light:['轻旗兵',86],standard:['护旗手',108],captain:['阵旗守将',290]
} as const;
const models={sailor:undefined,gunner:undefined,rigger:'boarder',guardian:'figurehead',flag:undefined,light:'light',standard:'heavy',captain:'captain'} as const;
export interface EnemySnapshot{present:boolean;position:Vec;health:number;aura:number|null;auraLeft:number;entryAge:number}
type RigFrame=ReturnType<ReturnType<typeof createBattleRig>['update']>;
type Hit=(time:number,id:number,damage:number)=>void;
type Attack='sweep'|'thrust'|'follow'|'shoot';
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
type Shot={mesh:T.Mesh;velocity:T.Vector3;age:number;volley:{id:number;spent:boolean};damage:number};
export class EnemyActor {
 readonly rig:ReturnType<typeof createBattleRig>;
 readonly name:string;
 readonly marker:HTMLElement;
 private bar:HTMLProgressElement;
 private status:HTMLElement;
 private readonly projected=new T.Vector3();
 private readonly shots:Shot[]=[];
 private readonly pool:T.Mesh[]=[];
 private readonly ammo:T.IcosahedronGeometry;
 present=false; dead=false; enraged=false; exposed=false; protected=false;
 move:RigFrame['phase']='approach';
 attackKind:Attack='sweep';turns=0; attackId=0; attackStart=-1;
 private wait=0;private heading=0;private resolved=false;
 private canBreak=true;private followPending=false;private moveSide=1;private launchHeight=0;
 private boltId=-1;private entryAge=1;
 private bubble:T.Mesh;
 constructor(private stage:Stage,private actor:SlimeCharacter,readonly kind:EnemyKind,readonly home:Vec,readonly target:CombatTarget,ui:HTMLElement,private nextId:()=>number,private practiceVariation=0){
  this.name=enemies[kind][0];target.name=this.name;target.maxHealth=enemies[kind][1];target.health=0;
  this.rig=createBattleRig(['sailor','rigger','gunner','guardian'].includes(kind),models[kind]);
  this.rig.root.visible=false;stage.scene.add(this.rig.root);
  this.ammo=new T.IcosahedronGeometry(.16,1);
  this.marker=document.createElement('aside');this.marker.className='bp-enemy';this.marker.hidden=true;this.marker.dataset.enemy=kind;
  const b=document.createElement('b');b.textContent=this.name;
  this.bar=document.createElement('progress');this.bar.max=target.maxHealth;
  this.status=document.createElement('small');this.marker.append(b,this.bar,this.status);ui.append(this.marker);
  this.bubble=new T.Mesh(new T.IcosahedronGeometry(1,1),new T.MeshBasicMaterial({color:'#8edcc7',wireframe:true,transparent:true,opacity:.34,depthWrite:false}));
  this.bubble.position.y=.82;this.bubble.scale.set(.62,.92,.6);this.bubble.visible=false;this.rig.root.add(this.bubble);
 }
 spawn(){
  this.present=true;this.dead=false;this.enraged=false;this.exposed=false;this.protected=false;
  Object.assign(this.target,{position:[...this.home],health:this.target.maxHealth,aura:null,auraUntil:0,hitFlash:0,hits:0});
  this.wait=0;this.turns=0;this.canBreak=true;this.followPending=false;this.heading=0;this.moveSide=this.practiceVariation<0?-1:1;this.launchHeight=0;
    this.entryAge=this.kind==='rigger'||this.kind==='gunner'?0:1;
  if(this.entryAge===0)this.placeReinforcement();
  this.move='approach';this.rig.root.position.fromArray(this.target.position);this.rig.root.rotation.y=0;this.rig.root.visible=true;
  this.rig.reset();this.rig.setEnraged(false);this.rig.setExposed(false);
 }
 private placeReinforcement(){
  const t=this.entryAge,s=this.target.position;
  s[0]=this.home[0]+(1-t)*(this.kind==='rigger'?1.6:.95);
  s[1]=this.home[1]+(this.kind==='rigger'?4*t*(1-t)*.91:0);
  s[2]=this.home[2]+(this.kind==='rigger'?-.20:.54)*(1-t);
 }
 snapshot(now:number):EnemySnapshot{
  return {present:this.present,entryAge:this.entryAge,position:[...this.target.position],health:this.target.health,aura:this.target.aura,auraLeft:Math.max(0,this.target.auraUntil-now)};
 }
 restore(saved:EnemySnapshot,clock:number){
  this.clearShots();this.spawn();this.present=saved.present;this.entryAge=saved.entryAge;
  Object.assign(this.target,{position:[...saved.position],health:saved.health,aura:saved.aura,auraUntil:clock+saved.auraLeft});
  this.dead=saved.health<=0;this.rig.root.visible=saved.present&&!this.dead;this.rig.root.position.fromArray(saved.position);
 }
 get living(){return this.present&&this.target.health>0;}
 get projectile(){return this.shots[0]?.mesh.position.toArray()??null;}
 clearShots(){for(const s of this.shots){s.mesh.visible=false;this.pool.push(s.mesh);}this.shots.length=0;}
 die(){if(this.dead)return;this.dead=true;this.rig.defeat();this.bubble.visible=false;}
 hit(point:Vec,reaction?:string){
  const p=this.target.position;this.rig.hit((point[0]-p[0])*Math.cos(this.heading)-(point[2]-p[2])*Math.sin(this.heading));
  if(this.kind==='captain'&&this.move==='recover'&&this.attackKind!=='follow'&&!this.followPending&&this.canBreak&&reaction==='BreakPoise'){
   this.rig.stagger(1);this.canBreak=false;return true;
  }
  return false;
 }
 private fire(origin:T.Vector3,offset:number,speed:number,damage:number,volley:{id:number;spent:boolean}){
  const mat=this.stage.toon('#ff9761',{emissive:'#ba532b',emissiveIntensity:.65});
  const mesh=this.pool.pop()??new T.Mesh(this.ammo,mat);if(!mesh.parent)this.stage.scene.add(mesh);
  mesh.position.copy(origin);mesh.visible=true;
  const p=this.actor.position;
  const v=new T.Vector3(p[0]-origin.x,p[1]+.28-origin.y,p[2]-origin.z).normalize();
  v.applyAxisAngle(T.Object3D.DEFAULT_UP,offset).multiplyScalar(speed);
  this.shots.push({mesh,velocity:v,age:0,volley,damage});
 }
 private stepShots(dt:number,realDt:number,clock:number,before:Vec,hit:Hit){
  const p=this.actor.position;
  for(let i=this.shots.length-1;i>=0;i--){
   const shot=this.shots[i],from=shot.mesh.position.toArray() as Vec;
   shot.mesh.position.addScaledVector(shot.velocity,dt);shot.age+=dt;
   const to=shot.mesh.position.toArray() as Vec;
   const touch=boltContact([from[0]-before[0],from[1]-before[1]-.28,from[2]-before[2]],[to[0]-p[0],to[1]-p[1]-.28,to[2]-p[2]],.45);
   const wall=this.actor.world.cast(from,to,.12),bodyFirst=touch!==null&&(!wall||touch<wall.t);
   if(!bodyFirst&&!wall&&shot.age<5.5)continue;
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
  this.enraged=this.kind==='captain'&&this.target.health<=this.target.maxHealth*.5;
  this.rig.setEnraged(this.enraged);
  let speed=0;
  if(this.move==='approach'){
   this.wait+=dt;this.heading=Math.atan2(dx,dz);
   let ready=false;
   if(shooter){
    if(this.kind!=='guardian'){
     const max=this.kind==='gunner'?1.45:.85;
     const dest=this.home[0]+this.moveSide*max;
     speed=this.travel(T.MathUtils.clamp(dest-t[0],-dt*1.3,dt*1.3),0,dt);
    }
    ready=this.wait>(this.kind==='guardian'?1.4:1.15)+this.practiceVariation*.21&&dist<26;
   }else{
    const reach=this.kind==='captain'?1.8:this.kind==='rigger'?1.12:1.55;
    const speedLimit=this.kind==='light'?2.5:this.kind==='standard'?.85:this.kind==='rigger'?2.0:1.65;
    // The standard bearer holds the ridge while the light infantry can be lured out of its ward.
    const leashed=this.kind==='standard'&&Math.hypot(t[0]-this.home[0],t[2]-this.home[2])>2.4;
    if(dist>reach-.15&&!leashed)speed=this.travel(dx/dist*speedLimit*dt,dz/dist*speedLimit*dt,dt);
    ready=dist<=reach+.22&&Math.abs(p[1]-t[1])<.9&&this.wait>(this.followPending?.03:.2+this.practiceVariation*.1);
   }
   if(ready){
    let attack:Attack=shooter?'shoot':'sweep';
    if(this.kind==='rigger')attack='thrust';
    if(this.kind==='captain')attack=this.followPending?'follow':this.turns%2===1?'thrust':'sweep';
    if(this.rig.attack(attack)){
     this.followPending=this.enraged&&attack==='sweep';this.canBreak=true;this.attackKind=attack;
     this.attackId=this.nextId();this.attackStart=clock-realDt;this.resolved=false;this.wait=0;this.turns++;this.moveSide*=-1;
    }
   }
  }
  if(this.kind==='rigger'&&this.move==='strike'){
   this.launchHeight=Math.min(.38,this.launchHeight+dt*2);
   this.travel(Math.sin(this.heading)*dt*1.4,Math.cos(this.heading)*dt*1.4,dt);
  }else this.launchHeight=Math.max(0,this.launchHeight-dt*2.2);
  this.rig.root.position.fromArray(this.target.position);this.rig.root.position.y+=this.launchHeight;
  this.rig.root.rotation.y=this.heading;
  const f=this.rig.update(dt,speed);this.move=f.phase;
  this.exposed=this.kind==='guardian'&&this.move==='recover';
  this.rig.setExposed(this.exposed);this.bubble.visible=this.protected;
  if(f.release){
   const volley={id:this.nextId(),spent:false};
   if(this.kind==='guardian')for(const angle of [-.20,0,.20])this.fire(f.muzzle,angle,5.4,14,volley);
   else this.fire(f.muzzle,0,4.3,this.kind==='sailor'?14:13,volley);
  }
  if(f.sweep&&!this.resolved){const touch=sweepContact(f,before,p);if(touch!==null){this.resolved=true;hit(clock-realDt+realDt*touch,this.attackId,this.kind==='captain'?23:this.kind==='flag'?22:13);}}
 }
 drawMarker(playing:boolean){
  const p=this.target.position;this.projected.set(p[0],p[1]+(this.kind==='captain'?2.45:1.95),p[2]).project(this.stage.camera);
  this.marker.hidden=!playing||!this.living||Math.abs(this.projected.x)>1||Math.abs(this.projected.z)>1;
  if(this.marker.hidden)return;
  this.marker.style.left=(50+50*this.projected.x)+'%';this.marker.style.top=(50-50*this.projected.y)+'%';
  this.bar.value=this.target.health;
  const tag=this.protected?'护旗庇护':this.exposed?'帆结外露':this.kind==='standard'?'护旗手':this.enraged?'展旗':'';
  this.status.textContent=[tag,this.target.aura!==null?elements[this.target.aura].name+'附着':''].filter(Boolean).join(' · ');
 }
}

