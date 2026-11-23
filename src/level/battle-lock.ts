import './battle-lock.css';
import {Vector3} from 'three';
import type {SlimeCharacter} from '../slime/character';
import {skillAimStatus, type CombatTarget} from '../slime/combat';
import {SKILL_KITS} from '../slime/skills';
import type {Stage} from './stage';

const focusTime = .45, occlusionGrace = .75;
export function mountBattleLock(actor:SlimeCharacter, stage:Stage, notice:(text:string)=>void) {
  const controls=document.createElement('div');
  controls.className='battle-lock-controls';
  const toggle=document.createElement('button'), cycle=document.createElement('button');
  toggle.type=cycle.type='button';
  toggle.textContent='锁定'; toggle.setAttribute('aria-label','锁定或解锁目标（Tab）');
  cycle.textContent='切敌'; cycle.setAttribute('aria-label','切换可见敌人（T）');
  controls.append(toggle,cycle);
  const marker=document.createElement('div');
  marker.className='battle-lock-marker';
  marker.innerHTML='<i aria-hidden="true"></i><span></span>';
  const label=marker.querySelector('span')!;
  document.body.append(controls,marker);
  let active=false, retain=0, obstructed=0;
  const screen=new Vector3();
  const aim:NonNullable<SlimeCharacter['battleAim']>={target:null,hard:false,denied:notice};
  actor.battleAim=aim;
  function project(t:CombatTarget) {
    return screen.set(t.position[0],t.position[1]+.88,t.position[2]).project(stage.camera);
  }
  function visible(t:CombatTarget) {
    const p=t.position,c=stage.camera.position;
    return !actor.combat.blocked(actor.position,p) &&
      !actor.world.cast([c.x,c.y,c.z],[p[0],p[1]+.88,p[2]],.01);
  }
  function visibleTargets() {
    return actor.combat.targets.filter(t=>t.health>0 && visible(t)).map(t=>{
      const p=project(t);
      const d=Math.hypot(t.position[0]-actor.position[0],t.position[2]-actor.position[2]);
      return {t,x:p.x,y:p.y,z:p.z,d,score:Math.hypot(p.x,p.y*.8)+Math.min(d,30)*.002};
    }).filter(p=>Math.abs(p.x)<1.02&&Math.abs(p.y)<1.02&&p.z>=-1&&p.z<=1);
  }
  function clear() {
    aim.target=null;aim.hard=false;active=false;retain=0;obstructed=0;
    marker.hidden=true;controls.hidden=true;
  }
  function select(target:CombatTarget,hard:boolean) {
    aim.target=target;aim.hard=hard;obstructed=0;retain=focusTime;
  }
  function toggleLock() {
    if(!active)return;
    if(aim.hard){aim.hard=false;retain=focusTime;notice('解除锁定');return;}
    const seen=visibleTargets().sort((a,b)=>a.score-b.score);
    const preferred=seen.find(c=>c.t===aim.target)??seen[0];
    if(!preferred){notice('视野内没有可锁定的敌人');return;}
    select(preferred.t,true);
  }
  function cycleTarget() {
    if(!active)return;
    const seen=visibleTargets().sort((a,b)=>a.x-b.x||a.t.id-b.t.id);
    if(!seen.length){notice('视野内没有可切换的敌人');return;}
    const index=seen.findIndex(c=>c.t===aim.target);
    select(seen[(index+1)%seen.length].t,true);
  }
  function key(e:KeyboardEvent) {
    if(!active||e.altKey||e.ctrlKey||e.metaKey||!['Tab','KeyT'].includes(e.code))return;
    e.preventDefault();e.stopImmediatePropagation();
    if(!e.repeat)(e.code==='Tab'?toggleLock:cycleTarget)();
  }
  window.addEventListener('keydown',key,true);
  toggle.onclick=toggleLock;cycle.onclick=cycleTarget;
  function update(dt:number,playing:boolean) {
    if(!playing){if(active)clear();return;}
    active=true;controls.hidden=false;
    const previous=aim.target;
    if(previous && (previous.health<=0||!actor.combat.targets.includes(previous))){
      aim.target=null;aim.hard=false;obstructed=0;retain=0;
    }
    if(aim.target&&aim.hard) {
      const t=aim.target;
      obstructed=visible(t)?0:obstructed+dt;
      if(obstructed>=occlusionGrace){aim.target=null;aim.hard=false;retain=0;}
      else {
        const dx=t.position[0]-actor.position[0],dz=t.position[2]-actor.position[2];
        const yaw=Math.atan2(-dx,-dz),delta=yaw-actor.yaw;
        const blend=1-Math.exp(-dt*7.5);
        actor.yaw+=Math.atan2(Math.sin(delta),Math.cos(delta))*blend;
        actor.pitch+=(.26-actor.pitch)*blend;
      }
    }
    if(!aim.hard){
      const candidates=visibleTargets().filter(c=>c.d<=16).sort((a,b)=>a.score-b.score);
      const best=candidates[0]?.t??null;
      if(previous===best)retain=focusTime;
      else retain=Math.max(0,retain-dt);
      if(!aim.target||retain<=0||!visible(aim.target)){
        if(aim.target!==best)retain=focusTime;
        aim.target=best;
      }
    }
    toggle.setAttribute('aria-pressed',String(aim.hard));toggle.textContent=aim.hard?'解锁':'锁定';
    const t=aim.target;
    if(!t){marker.hidden=true;return;}
    const status=skillAimStatus(actor.position,t.position,SKILL_KITS[actor.element].E,actor.combat.blocked);
    const p=project(t);
    marker.hidden=p.z>1||p.z< -1||Math.abs(p.x)>1||Math.abs(p.y)>1;
    marker.style.left=(p.x*.5+.5)*100+'%';marker.style.top=(.5-p.y*.5)*100+'%';
    marker.dataset.target=String(t.id);marker.dataset.hard=String(aim.hard);marker.dataset.status=status;
    const name=t.name?' '+t.name:'';
    label.textContent=(aim.hard?'锁定':'瞄向')+name+' · '+(status==='ready'?'E 可命中':status==='blocked'?'受遮挡':'E 超距');
  }
  clear();
  return {update,clear,get target(){return aim.target;},dispose(){
    clear();if(actor.battleAim===aim)actor.battleAim=undefined;
    window.removeEventListener('keydown',key,true);controls.remove();marker.remove();
  }};
}
