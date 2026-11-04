import {combos} from './elements';
import {Pose,Vec,clamp,idlePose,smooth} from './types';
export interface CombatTarget {id:number;position:Vec;health:number;maxHealth:number;hitFlash:number;hits:number;respawnAt:number;lastElement:number}
export class Combat {
 index=-1;age=0;active=false;queued=false;idle=0;element=0;direction:Vec=[0,0,-1];hitTargets=new Set<number>();totalHits=0;lastName='';
 targets:CombatTarget[];
 constructor(positions:Vec[]=[]){this.targets=positions.map((position,id)=>({id,position:[...position],health:120,maxHealth:120,hitFlash:0,hits:0,respawnAt:0,lastElement:0}));}

 reset(){this.active=false;this.queued=false;this.index=-1;this.age=0;this.idle=0;for(const t of this.targets){t.health=t.maxHealth;t.hitFlash=0;t.respawnAt=0;t.hits=0}this.totalHits=0}
 attack(element:number,forward:Vec){if(this.active){const c=combos[this.element][this.index];if(this.age>=c.hitStart)this.queued=true;return}this.index=this.idle>1||element!==this.element?-1:this.index;this.index=(this.index+1)%4;this.element=element;this.direction=[...forward];this.age=0;this.active=true;this.queued=false;this.hitTargets.clear();this.lastName=combos[element][this.index].name;}
 update(dt:number,position:Vec,time:number,onHit:(t:CombatTarget,damage:number)=>void):{pose:Pose;lunge:number}{for(const t of this.targets){t.hitFlash=Math.max(0,t.hitFlash-dt*4);if(t.health<=0&&time>=t.respawnAt)t.health=t.maxHealth}if(!this.active){this.idle+=dt;return {pose:idlePose(),lunge:0}}this.age+=dt;const c=combos[this.element][this.index];const pose=idlePose();pose.active=true;pose.forward=[...this.direction];const intensity=this.age<c.hitStart?smooth(this.age/c.hitStart)*.4:Math.sin(clamp((this.age-c.hitStart)/(c.hitEnd-c.hitStart),0,1)*Math.PI)*.9;
 if(c.pose==='SlamFlatten'||c.pose==='Pulse'){pose.flatten=intensity*.8;pose.pulse=intensity*.8;pose.stretch=[1+intensity*.4,1-intensity*.4,1+intensity*.4]}else if(c.pose==='UpperStretch')pose.stretch=[1+intensity*.3,1+intensity*.95,1-intensity*.12];else pose.stretch=[1+intensity*1.4,1-intensity*.20,1-intensity*.25];
 let lunge=0;if(this.age>=c.hitStart&&this.age<=c.hitEnd){lunge=(this.index===3?.4:.7)*dt/(c.hitEnd-c.hitStart);for(const t of this.targets){if(t.health<=0||this.hitTargets.has(t.id))continue;const dx=t.position[0]-position[0],dz=t.position[2]-position[2],dy=t.position[1]-position[1];const along=dx*this.direction[0]+dz*this.direction[2],side=Math.abs(dx*this.direction[2]-dz*this.direction[0]);const hit=c.shape==='Cone'?along>-.1&&along<c.range+.3&&side<Math.max(.3,along*1.3):c.exec==='AoE'?Math.hypot(dx,dz)<=c.radius+.3:along>-.25&&along<c.range+.3&&side<c.radius+.28;if(hit&&Math.abs(dy)<1&&!this.blocked(position,t.position)){this.hitTargets.add(t.id);t.health=Math.max(0,t.health-c.damage);t.hits++;t.lastElement=this.element;t.hitFlash=1;t.respawnAt=time+3;this.totalHits++;onHit(t,c.damage)}}}
 if(this.age>=c.hitEnd+c.recovery){const queued=this.queued;this.active=false;this.idle=0;if(queued)this.attack(this.element,this.direction)}return {pose,lunge};}
 blocked: (a:Vec,b:Vec)=>boolean=()=>false;
}
