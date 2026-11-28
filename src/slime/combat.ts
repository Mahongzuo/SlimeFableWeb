import {combos,DEFAULT_ELEMENT} from './elements';
import {resolveElementReaction, type ReactionResult, type SkillDef} from './skills';
import {Pose,Vec,clamp,idlePose,smooth} from './types';
export interface CombatTarget {id:number;name?:string;position:Vec;health:number;maxHealth:number;hitFlash:number;hits:number;respawnAt:number;lastElement:number;aura:number|null;auraUntil:number}
export interface SwingStartEvent {element:number;comboIndex:number;forward:Vec;duration:number;name:string;isFinisher:boolean}
export interface SwingAreaEvent {element:number;comboIndex:number;origin:Vec;forward:Vec;range:number;radius:number;shape:string;exec:string;isFinisher:boolean}
export type TargetHitCallback=(t:CombatTarget,damage:number,element:number,reaction:ReactionResult|null)=>void;
export function isSelfSkill(def: SkillDef) {
 return def.range===0||def.archetype==='sweep'||def.archetype==='dome'||def.archetype==='vortex';
}
export function skillAimStatus(origin:Vec, target:Vec, def:SkillDef, blocked:(a:Vec,b:Vec)=>boolean) {
 if(blocked(origin,target))return 'blocked';
 const reach=isSelfSkill(def)?def.radius:def.range;
 return Math.hypot(target[0]-origin[0],target[1]-origin[1],target[2]-origin[2])<=reach?'ready':'far';
}
/** Limit the inward component of a combo step at the contact circle; sideways movement stays free. */
export function stopAtMeleeTarget(move:Vec, origin:Vec, target:Vec) {
 if(Math.abs(target[1]-origin[1])>=1)return;
 const x=target[0]-origin[0],z=target[2]-origin[2],distance=Math.hypot(x,z);
 if(distance<.001)return;
 const nx=x/distance,nz=z/distance;
 const over=move[0]*nx+move[2]*nz-Math.max(0,distance-.72);
 if(over>0){move[0]-=nx*over;move[2]-=nz*over;}
}
export class Combat {
 index=-1;age=0;active=false;queued=false;idle=0;element=DEFAULT_ELEMENT;direction:Vec=[0,0,-1];hitTargets=new Set<number>();areaDispatched=false;totalHits=0;lastName='';
 targets:CombatTarget[];
 nextHitMultiplier?:(target:CombatTarget)=>number;
 nextSwingDirection?:()=>Vec|undefined;
 onSwingStart?:(ev:SwingStartEvent)=>void;
 onSwingArea?:(ev:SwingAreaEvent)=>void;
 constructor(positions:Vec[]=[],private respawn=true){this.targets=positions.map((position,id)=>({id,position:[...position],health:120,maxHealth:120,hitFlash:0,hits:0,respawnAt:0,lastElement:0,aura:null,auraUntil:0}));}

 reset(){this.active=false;this.queued=false;this.index=-1;this.age=0;this.idle=0;this.areaDispatched=false;for(const t of this.targets){t.health=t.maxHealth;t.hitFlash=0;t.respawnAt=0;t.hits=0;t.aura=null;t.auraUntil=0}this.totalHits=0}
 /** Applies damage + elemental aura + 11 UE elemental reactions to a single target. */
 applyHitToTarget(t:CombatTarget,baseDamage:number,element:number,time:number,onHit:TargetHitCallback){
  if(t.health<=0)return;
  const curAura=t.aura!==null&&time<=t.auraUntil?t.aura:null;
  const reaction=resolveElementReaction(curAura,element);
  const reacted=reaction?baseDamage*reaction.multiplier+reaction.extraDamage:baseDamage;
  const totalDmg=Math.round(reacted*(this.nextHitMultiplier?.(t)??1));
  if(reaction&&reaction.consumeAura){t.aura=null;t.auraUntil=0;}
  else if(element!==5){t.aura=element;t.auraUntil=time+8;}
  t.health=Math.max(0,t.health-totalDmg);
  t.hits++;
  t.lastElement=element;
  t.hitFlash=1;
  if(t.health<=0)t.respawnAt=time+3;
  this.totalHits++;
  onHit(t,totalDmg,element,reaction);
 }
 /** Hits all living targets within a spherical radius (used by E / R / Q ARPG skills). */
 hitTargetsInRadius(center:Vec,radius:number,element:number,damage:number,time:number,onHit:TargetHitCallback,respectCover=false):number{
  let count=0;
  for(const t of this.targets){
   if(t.health<=0)continue;
   const d=Math.hypot(t.position[0]-center[0],t.position[2]-center[2]);
   if(d<=radius+.45&&Math.abs(t.position[1]-center[1])<2.4&&(!respectCover||!this.blocked(center,t.position))){
    this.applyHitToTarget(t,damage,element,time,onHit);
    count++;
   }
  }
  return count;
 }
 attack(element:number,forward:Vec){
  if(this.active){const c=combos[this.element][this.index];if(this.age>=c.hitStart)this.queued=true;return}
  this.index=this.idle>1||element!==this.element?-1:this.index;
  this.index=(this.index+1)%4;
  this.element=element;
  this.direction=[...forward];
  this.age=0;
  this.active=true;
  this.queued=false;
  this.areaDispatched=false;
  this.hitTargets.clear();
  const c=combos[element][this.index];
  this.lastName=c.name;
  this.onSwingStart?.({element,comboIndex:this.index,forward:[...forward],duration:Math.max(0.18,c.hitEnd+0.06),name:c.name,isFinisher:this.index===3});
 }
 update(dt:number,position:Vec,time:number,onHit:TargetHitCallback):{pose:Pose;lunge:number}{
  for(const t of this.targets){
   t.hitFlash=Math.max(0,t.hitFlash-dt*4);
   if(t.aura!==null&&time>t.auraUntil)t.aura=null;
   if(this.respawn&&t.health<=0&&time>=t.respawnAt){t.health=t.maxHealth;t.aura=null;t.auraUntil=0;}
  }
  if(!this.active){this.idle+=dt;return {pose:idlePose(),lunge:0}}
  this.age+=dt;
  const c=combos[this.element][this.index];
  const pose=idlePose();pose.active=true;pose.forward=[...this.direction];
  const intensity=this.age<c.hitStart?smooth(this.age/c.hitStart)*.4:Math.sin(clamp((this.age-c.hitStart)/(c.hitEnd-c.hitStart),0,1)*Math.PI)*.9;
  if(c.pose==='SlamFlatten'||c.pose==='Pulse'){pose.flatten=intensity*.8;pose.pulse=intensity*.8;pose.stretch=[1+intensity*.4,1-intensity*.4,1+intensity*.4]}
  else if(c.pose==='UpperStretch')pose.stretch=[1+intensity*.3,1+intensity*.95,1-intensity*.12];
  else pose.stretch=[1+intensity*1.4,1-intensity*.20,1-intensity*.25];
  let lunge=0;
  if(this.age>=c.hitStart&&this.age<=c.hitEnd){
   lunge=(this.index===3?.4:.7)*dt/(c.hitEnd-c.hitStart);
   if(!this.areaDispatched){
    this.areaDispatched=true;
    this.onSwingArea?.({element:this.element,comboIndex:this.index,origin:[...position],forward:[...this.direction],range:c.range,radius:c.radius,shape:c.shape,exec:c.exec,isFinisher:this.index===3});
   }
   for(const t of this.targets){
    if(t.health<=0||this.hitTargets.has(t.id))continue;
    const dx=t.position[0]-position[0],dz=t.position[2]-position[2],dy=t.position[1]-position[1];
    const along=dx*this.direction[0]+dz*this.direction[2],side=Math.abs(dx*this.direction[2]-dz*this.direction[0]);
    const hit=c.shape==='Cone'?along>-.1&&along<c.range+.3&&side<Math.max(.3,along*1.3):c.exec==='AoE'?Math.hypot(dx,dz)<=c.radius+.3:along>-.25&&along<c.range+.3&&side<c.radius+.28;
    if(hit&&Math.abs(dy)<1&&!this.blocked(position,t.position)){
     this.hitTargets.add(t.id);
     this.applyHitToTarget(t,c.damage,this.element,time,onHit);
    }
   }
  }
  if(this.age>=c.hitEnd+c.recovery){const queued=this.queued;this.active=false;this.idle=0;if(queued)this.attack(this.element,this.nextSwingDirection?.()??this.direction)}
  return {pose,lunge};
 }
 blocked: (a:Vec,b:Vec)=>boolean=()=>false;
}
