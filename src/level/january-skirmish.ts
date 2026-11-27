import {bindHelpHint,readingHelp} from './help-state';
import './january-skirmish.css';
import {seasonExhibit} from './season-entry';
import * as T from 'three';
import {FlightSignals} from '../templates/jan01-skirmish';
import {floorAt} from '../templates/january-skirmish';
import {session} from './mode-session';
import {Stage} from './stage';
import {SlimeCharacter} from '../slime/character';
import type {Vec} from '../slime/types';
import {applyLevelQuality} from '../game/graphics';
import {Save} from '../game/save';
import {CombatAudio} from './combat-audio';
import {buildCourse,laneAt,openTarget,targetPoint,type Lane,type SkirmishDay} from '../templates/january-skirmish';
import {buildSkirmishScene,skirmishLook} from '../themes/january-skirmish';

const spec=session.spec,course=buildCourse(spec.day as SkirmishDay,session.seed);
const exhibit=seasonExhibit(spec.id);
const stage=new Stage(skirmishLook(course)),art=buildSkirmishScene(stage,course),audio=new CombatAudio();
const flight=course.day==='0101'?new FlightSignals():null;
const done=flight?.verified??new Set<number>(),lanes=new Set<Lane>();
type Phase='intro'|'play'|'pause'|'finale'|'done';
let phase:Phase='intro',time=0,gameTime=0,finale=0,hits=0,health=3,lastReturn=0,aim=-1,recall=false,pinned=false,autoFire=false;
let checkpoint:Vec=[...course.spawn], lastLane:Lane|0=0, signalHitTime=-3, waterTime=0;
let flashUntil=0,warning='',lastRender='',lastLaunch=-5;
const ui=document.createElement('main');ui.className='js-course';ui.innerHTML=`
  <header><div><small></small><h1></h1></div><button data-do="home">回港</button></header>
  <article><small>分身交火</small><h2></h2><p></p><p class="js-instructions">WASD 移动，拖动画面转向。空格跳跃，Q 瞄准，G 或轻点靶心发射，X 回收。</p><button data-do="start" disabled>身体正在凝聚…</button><button data-do="practice">随机练习</button></article>
  <aside hidden><strong></strong><p></p><small></small></aside>
  <div class="js-reticle" hidden>＋</div><output hidden></output>
  <nav hidden><div class="js-pad"><button data-key="KeyW">↑</button><button data-key="KeyA">←</button><button data-key="KeyS">↓</button><button data-key="KeyD">→</button></div><div>
  <button data-do="aim">瞄准 Q</button><button data-do="fire">投射 G</button><button data-do="recall">回收 X</button><button data-do="latch">留守回路 R</button><button data-do="jump">跳跃</button><button data-do="use">互动 F</button><button data-do="pause">暂停</button></div></nav>`;
document.body.append(ui);
const get=<E extends HTMLElement=HTMLElement>(s:string)=>ui.querySelector(s) as E;
const btn=(s:string)=>get<HTMLButtonElement>('[data-do="'+s+'"]');
get('header small').textContent=spec.year+'　·　'+Number(spec.day.slice(0,2))+' 月 '+Number(spec.day.slice(2))+' 日';
get('h1').textContent=spec.title;get('h2').textContent=spec.goal;get('article p').textContent=spec.fact+'　场地与陪练为游戏演绎。';
exhibit.preview(get('article'));
if(flight)get('.js-instructions').textContent='WASD 移动，拖动转向。Q 选风标，G 投分身，X 回收。也可以轻点风标。';
const actor=new SlimeCharacter(stage,{spawn:course.spawn,world:art.world,input:false,ui:false,
  battleTargets:course.anchors,burstOnEnemy:true,defaultAim:true,onReady:()=>{if(phase==='intro')engage('start');else{btn('start').disabled=false;btn('start').textContent='继续';}},
  onFire:()=>audio.playCloneFire(actor.element),onBattleHit:target=>{
    if(phase!=='play'||!openTarget(target.id,done,lanes))return;
    audio.playHitmarker();if(target.health<=0){done.add(target.id);aim=-1;note(course.names[target.id]+' 已点亮');}
  }}).attach();
applyLevelQuality(stage,actor,new Save().data.quality);
actor.combat.targets.forEach((t,i)=>{t.name=course.names[i];t.maxHealth=i===0?18:i===3?42:30;t.health=0;});
actor.combat.nextHitMultiplier=t=>{
  if(t.id===0)return 1;
  const lane=laneAt(course,actor.position);
  if(course.bonus==='high')return lane===1?1.3:1;
  if(course.bonus==='cross')return lane!==0&&Math.sign(t.position[0])===-lane?1.8:1;
  return pinned?1.8:1;
};
const bulletGeometry=new T.IcosahedronGeometry(.15,1),bulletMaterial=stage.toon('#ff884b',{emissive:'#f5a03e',emissiveIntensity:.5});
const bullets=Array.from({length:8},()=>{const mesh=new T.Mesh(bulletGeometry,bulletMaterial);mesh.visible=false;stage.scene.add(mesh);return {mesh,dir:new T.Vector3(),age:0};});
const nextPosition=new T.Vector3(),cameraPoint=new T.Vector3(),body=new T.Vector3();
const movement=new Set(['KeyW','KeyS','KeyA','KeyD','ShiftLeft','ShiftRight','KeyC']);
function note(s:string){warning=s;flashUntil=time+2.1;}
function showPlay(playing:boolean){get('article').hidden=playing;get('aside').hidden=!playing;get('nav').hidden=!playing;get('.js-reticle').hidden=!playing;get('output').hidden=!playing;}
function open(i:number){if(flight)return flight.open(i);return openTarget(i,done,lanes);}
function aimAt(i:number){
  const p=actor.position,t=actor.combat.targets[i].position,dx=t[0]-p[0],dz=t[2]-p[2],d=Math.hypot(dx,dz);
  actor.yaw=Math.atan2(-dx,-dz)+Math.asin(Math.min(.95,.45/Math.max(d,.1)));
  const eye=.60+.24+.12*Math.min(1,Math.max(0,(actor.arm-1.2)/4));
  actor.pitch=Math.atan2(p[1]+eye-t[1]-.75,Math.sqrt(Math.max(.02,d*d-.45*.45)));
}
function engage(k:string){
  if(k==='home'){session.home();return;}if(k==='practice'){location.assign(session.practicePath());return;}
  if(k==='start'&&(phase==='intro'||phase==='pause')&&actor.ready){session.start();phase='play';actor.mode='play';showPlay(true);return;}
  if(phase==='finale' && flight && k==='jump'){actor.jump();return;}
  if(phase!=='play')return;
  if(k==='pause'){actor.keys.clear();actor.mode='paused';phase='pause';autoFire=false;showPlay(false);get('h2').textContent='已暂停';btn('start').textContent='继续';return;}
  if(k==='jump'){actor.jump();return;}
  if(k==='recall'){actor.keys.add('KeyX');recall=true;return;}
  if(k==='aim'){for(let n=1;n<=4;n++){const idx=(aim+n+4)%4;if(open(idx)){aim=idx;aimAt(aim);return;}}}
  if(k==='fire'&&flight){
    if(aim<0 || !open(aim)){note('用 Q 选择风标，或直接轻点它');return;}
    if(recall || actor.commands.length || (actor.latest?.shots.length??0)>=5){note('等分身归队后再投');return;}
    const p=actor.combat.targets[aim].position, landing:Vec=[p[0],(floorAt(course,p[0],p[2])??0)+.015,p[2]];
    if(flight.cast(aim,actor.position,landing,gameTime)){
      actor.launch(landing);actor.setMood('Spit',.35);audio.playCloneFire(actor.element);
    }else note('侧移避开棚柱，靠近到八米以内再投');
    return;
  }
  if(k==='fire'){if(aim>=0&&open(aim))aimAt(aim);autoFire=true;return;}
  if(k==='latch'){
    if(!done.has(0)){note('先点亮入口的练习靶');return;}
    const [x,y,z]=course.pad;
    if(Math.hypot(actor.position[0]-x,actor.position[2]-z)>5){note('向左侧青色圆环靠近，再留下分身');return;}
    if(time-lastLaunch<.6||(actor.latest?.shots.length??0)>=5)return;
    actor.keys.delete('KeyX');recall=false;actor.launch([x,y+.09,z]);lastLaunch=time;
  }
  if(k==='use'){
    if(done.size!==4){note('先完成四处接应');return;}
    if(!flight && Math.hypot(actor.position[0]-course.end[0],actor.position[2]-course.end[2])>1.55){note(course.prompt);return;}
    phase='finale';actor.keys.clear();actor.mode=flight?'play':'observe';get('nav').hidden=!flight;get('.js-reticle').hidden=true;
    if(flight)ui.querySelectorAll<HTMLButtonElement>('nav [data-do]').forEach(b=>b.hidden=b.dataset.do!=='jump');
    bullets.forEach(b=>b.mesh.visible=false);audio.playBellClang();
    const save=new Save(),key=spec.saveId+(session.practice?'-practice':'-daily');
    if(hits===0)save.data.life.records[key+'-clean']=1;
    if(flight && lastLane){
      const records=save.data.life.records;
      records[key+'-route-mask']=(records[key+'-route-mask']??0)|(lastLane===1?2:1);
      if(records[key+'-route-mask']===3)records[key+'-routes']=1;
    }else if(!flight && lanes.size===2)save.data.life.records[key+'-routes']=1;
    save.write();
  }
}
ui.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button[data-do]');if(b){engage(b.dataset.do!);b.blur();}});
ui.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(b=>{
  b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);actor.keys.add(b.dataset.key!);};
  b.onlostpointercapture=()=>actor.keys.delete(b.dataset.key!);
});
const keys:Record<string,string>={Space:'jump',KeyG:'fire',KeyQ:'aim',KeyX:'recall',KeyF:'use',KeyR:'latch'};
addEventListener('keydown',e=>{
  if(e.ctrlKey||e.altKey||e.metaKey)return;
  if(e.code==='Escape'&&!e.repeat){engage(phase==='pause'?'start':'pause');return;}
  if(phase!=='play' && !(flight&&phase==='finale'))return;
  if(movement.has(e.code)){actor.keys.add(e.code);return;}
  if(keys[e.code]){e.preventDefault();if(!e.repeat)engage(keys[e.code]);}
  if(/^Digit[1-6]$/.test(e.code))actor.setElement(Number(e.code.slice(-1))-1);
});
addEventListener('keyup',e=>{if(movement.has(e.code))actor.keys.delete(e.code);});addEventListener('blur',()=>engage('pause'));
const canvas=stage.renderer.domElement as HTMLCanvasElement;let drag:{x:number; y:number; distance:number}|null=null;
canvas.onpointerdown=e=>{if(phase!=='play')return;drag={x:e.clientX,y:e.clientY,distance:0};canvas.setPointerCapture(e.pointerId);};
canvas.onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;drag.distance+=Math.abs(dx)+Math.abs(dy);
  if(drag.distance>4){aim=-1;actor.yaw-=dx*.005;actor.pitch=T.MathUtils.clamp(actor.pitch+dy*.004,-.6,1.17);}};
canvas.onpointerup=e=>{
  if(!drag||phase!=='play')return;const click=drag.distance<6;drag=null;if(!click)return;
  let best=60;aim=-1;
  actor.combat.targets.forEach((t,i)=>{if(!open(i))return;cameraPoint.fromArray(t.position);cameraPoint.y+=.75;cameraPoint.project(stage.camera);
    const d=Math.hypot((cameraPoint.x*.5+.5)*innerWidth-e.clientX,(-cameraPoint.y*.5+.5)*innerHeight-e.clientY);
    if(cameraPoint.z>-1&&cameraPoint.z<1&&d<best){best=d;aim=i;}});
  engage('fire');
};
canvas.onlostpointercapture=()=>drag=null;canvas.oncontextmenu=e=>e.preventDefault();
function resetAtEntry(){waterTime=0;actor.teleport([...(flight?checkpoint:course.spawn)]);flight?.recall();health=3;aim=-1;recall=false;actor.keys.clear();bullets.forEach(b=>b.mesh.visible=false);note(flight?'回到本段系缆柱，已校准的风标保留':'回到入口，已经点亮的目标保留');}
function advanceTargets(){
  const lane=laneAt(course,actor.position);if(done.has(0)&&lane){
    lanes.add(lane);
    if(flight && flight.recalled && (lastLane!==lane || actor.position[2]<checkpoint[2]-1.8)){
      lastLane=flight.lastLane=lane;checkpoint=[lane*course.tiles[0].width,floorAt(course,lane*course.tiles[0].width,actor.position[2])??0,actor.position[2]];
    }
  }
  if(flight) {
    const landed=flight.observe(actor.latest?.shots??[],gameTime);
    if(landed>=0){aim=-1;audio.playHitmarker();note(landed===0?'练投成功，按 X 收回分身':course.names[landed]+'已锁定');}
    if(art.float){const rise=.064*Math.sin(gameTime*1.72);art.float.position.y=rise-.14;art.world.boxes[0].min[1]=rise-.28;art.world.boxes[0].max[1]=rise;actor.syncBox(0);}
  }
  pinned=!!actor.latest?.shots.some(s=>s.phase==='active'&&Math.hypot(s.center[0]-course.pad[0],s.center[2]-course.pad[2])<.69&&Math.abs(s.center[1]-course.pad[1])<.75);
  actor.combat.targets.forEach((t,i)=>{
    const active=open(i);if(active&&t.health===0&&!flight)t.health=t.maxHealth;
    const lock=flight?.locked.get(i),p=lock?[lock[0],course.anchors[i][1],lock[2]] as Vec:targetPoint(course,i,gameTime,pinned);t.position=p;art.targets[i].position.fromArray(p);
    art.targets[i].rotation.y=flight?(flight.locked.has(i)?0:Math.sin(gameTime*1.48+i)*1.35):.20*Math.sin(gameTime+i);
    art.targets[i].visible=flight?done.has(i)||active:active;
  });
}
function returnFire(dt:number){
  if(flight){
    const b=bullets[0],active=flight.recalled && done.size<4;
    b.mesh.visible=active;if(!active)return;
    b.mesh.position.set(2.77+Math.sin(gameTime*1.8)*1.27,1.62+.18*Math.cos(gameTime*3.6),-.45);
    body.fromArray(actor.position);body.y+=.34;
    if(body.distanceToSquared(b.mesh.position)<.29 && gameTime-signalHitTime>1.4){
      signalHitTime=gameTime;hits++;health--;note('信号球擦过，留意它摆回的时机');if(!health)resetAtEntry();
    }
    return;
  }
  if(!done.has(0))return;
  if(done.size<4&&gameTime-lastReturn>(pinned?4.5:2.8)){
    lastReturn=gameTime;const eligible=actor.combat.targets.filter(t=>open(t.id));
    const t=eligible[Math.floor(gameTime)%Math.max(1,eligible.length)],b=bullets.find(v=>!v.mesh.visible);
    if(t&&b){b.mesh.visible=true;b.age=0;b.mesh.position.fromArray(t.position);b.mesh.position.y+=.75;
      b.dir.set(actor.position[0],actor.position[1]+.25,actor.position[2]).sub(b.mesh.position).normalize();}}
  body.fromArray(actor.position);body.y+=.28;
  for(const b of bullets){if(!b.mesh.visible)continue;b.age+=dt;nextPosition.copy(b.mesh.position).addScaledVector(b.dir,dt*(course.style==='sport'||course.style==='court'?3.9:3.2));
    if(body.distanceToSquared(nextPosition)<.19){b.mesh.visible=false;health--;hits++;note('被回球擦到 · 横移或跳跃躲开');if(!health)resetAtEntry();}
    else if(b.age>4||actor.world.cast(b.mesh.position.toArray() as Vec,nextPosition.toArray() as Vec,.08)){b.mesh.visible=false;}
    else b.mesh.position.copy(nextPosition);
  }
}
function hud(){
  if(flight){
    const hint=phase==='finale'?'沿栈桥跑一段，送飞机离水':!done.has(0)?'把分身投上栈桥口的试风球':!flight.recalled?'收回分身，看风标重新转动':!lanes.size?'从浮台或船棚高廊进入湾内':done.size===3?'瞄准放行铃，投出最后一个分身':'调整位置，校准两处风标';
    get('aside strong').textContent=hint;get('aside p').textContent='风标 '+done.size+'/4　体力 '+health+'/3';
    get('aside small').textContent=phase==='finale'?'方向键继续移动':time<flashUntil?warning:aim>=0?'瞄准 '+course.names[aim]:'Q 选风标　G 投射　X 回收';
    btn('latch').hidden=btn('use').hidden=true;return;
  }
  const line=phase==='finale'?course.finale:done.size===4?course.prompt:!done.has(0)?'瞄准入口的练习靶，投出第一个分身':!lanes.size?'沿 '+course.routes.join(' 或 ')+' 走到岔路中段':done.size===3?'瞄准 '+course.names[3]:'点亮两侧的 '+course.names.slice(1,3).join('、');
  const meter='目标 '+done.size+'/4　体力 '+health+'/3　分身 '+(actor.latest?.shots.length??0)+'/5';
  const tactic=course.tactic;
  const tip=flashUntil>time?warning:pinned?'分身留守中 · 移动靶改走短线':aim>=0?'已瞄准 '+course.names[aim]:done.has(0)?tactic:'Q 选择目标 · G 发射 · 横移避开橙色回球';
  const view=line+meter+tip;if(view===lastRender)return;lastRender=view;
  get('aside strong').textContent=line;get('aside p').textContent=meter;get('aside small').textContent=tip;
  btn('use').hidden=done.size!==4;btn('latch').hidden=!done.has(0)||done.size===4;
}
const clock=new T.Clock();
bindHelpHint(()=>phase==='intro'?spec.goal:get('aside strong').textContent||spec.goal);
function step(delta:number){
  if(readingHelp())return;
  const dt=Math.max(0,Math.min(delta,.05));time+=dt;
  if(phase==='play'){
    gameTime+=dt;advanceTargets();if(aim>=0&&open(aim))aimAt(aim);
    actor.update(time,dt);if(autoFire){actor.fire();autoFire=false;}
    if(recall&&actor.latest?.shots.length===0){actor.keys.delete('KeyX');recall=false;flight?.recall();}
    if(flight && done.size===4){engage('use');}
    returnFire(dt);
    if(flight){waterTime=actor.swimming?waterTime+dt:0;if(waterTime>2.2)resetAtEntry();}
    if(actor.position[1]<-1||Math.abs(actor.position[0])>7.1||Math.abs(actor.position[2])>11)resetAtEntry();hud();
  }else if(phase!=='pause'){
    actor.update(time,dt);
    if(phase==='intro'&&flight){stage.camera.position.set(-.83,1.72,5.26);stage.camera.lookAt(-6.62,-.66,-.4);}
    else if(phase==='intro'){stage.camera.position.set(8.9,6.9,14.2);stage.camera.lookAt(0,1,-2);}
    if(phase==='finale'||phase==='done'){
      finale+=dt;
      if(flight){
        const p=actor.position,travel=finale<2?.82*finale*finale:3.28+(finale-2)*3.28;
        stage.camera.position.set(p[0]+1.5,2.25+p[1],p[2]+1.28);
        stage.camera.lookAt(-6.75-travel*.22,.65+Math.max(0,finale-1.9)*.9,-.6-travel*.975);
      }else if(course.style==='air'||course.style==='maritime'){stage.camera.position.set(10,3.5,-.3);stage.camera.lookAt(6+finale*1.5,1.35,-7-finale*2.7);}
      else if(course.style==='sport'||course.style==='court'){stage.camera.position.set(2.9,4.1,1.5);stage.camera.lookAt(0,3.8,-10);}
      else {stage.camera.position.set(0,4.4,.85);stage.camera.lookAt(0,3.6,-10.2);}
      hud();if(phase==='finale'&&finale>(flight?5.6:2.1)){phase='done';ui.hidden=true;exhibit.finish(()=>{session.finish();
        const summary=document.createElement('p');summary.className='mode-caption';const key=spec.saveId+(session.practice?'-practice':'-daily'),records=new Save().data.life.records;
        summary.textContent='累计挑战　'+(records[key+'-clean']?'✓':'○')+' 零次受击　'+(records[key+'-routes']?'✓':'○')+' 走完两条分岔';
        document.querySelector('.mode-keepsake footer')?.before(summary);});}
    }
  }
  art.animate(time,Math.min(finale,flight?5.65:2.4));stage.render(dt,actor);
}
advanceTargets();
stage.renderer.setAnimationLoop(()=>step(clock.getDelta()));
(window as any).__slime=actor;(window as any).__level={spec,course,stage,step,done,lanes,flight,get phase(){return phase;},get pinned(){return pinned;},get hits(){return hits;}};
