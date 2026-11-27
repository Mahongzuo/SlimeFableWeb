import {bindHelpHint,readingHelp} from './help-state';
// 五日实体接应场。分身以真实粒子落点确认，玩家从场内进入对应史事的独立收尾。
import './january-skirmish.css';
import './season-skirmish.css';
import * as T from 'three';
import {Stage} from './stage';
import {session} from './mode-session';
import {seasonExhibit} from './season-entry';
import {CombatAudio} from './combat-audio';
import {SlimeCharacter} from '../slime/character';
import {applyLevelQuality} from '../game/graphics';
import {Save} from '../game/save';
import type {Vec} from '../slime/types';
import {RelayCourse} from '../templates/season-skirmish';
import {DecemberReception,decemberRelayMaps} from '../templates/december-skirmish';
import {relayLook,buildRelayScene,introEye} from '../themes/season-skirmish';

import {WinterReception,winterRelayMaps} from '../templates/winter-skirmish';
import {MidwinterReception,midwinterRelayMaps} from '../templates/midwinter-skirmish';
import {YearendReception,yearendRelayMaps} from '../templates/yearend-skirmish';
import {MonthendReception,monthendRelayMaps} from '../templates/monthend-skirmish';
import {NewyearReception,newyearRelayMaps} from '../templates/newyear-skirmish';
const {spec}=session,newyear=newyearRelayMaps[spec.day]?new NewyearReception(spec.day,session.seed):null,monthend=monthendRelayMaps[spec.day]?new MonthendReception(spec.day,session.seed):null,yearend=yearendRelayMaps[spec.day]?new YearendReception(spec.day,session.seed):null,midwinter=midwinterRelayMaps[spec.day]?new MidwinterReception(spec.day,session.seed):null,winter=winterRelayMaps[spec.day]?new WinterReception(spec.day,session.seed):null,december=decemberRelayMaps[spec.day]?new DecemberReception(spec.day,session.seed):null;
const course=newyear??monthend??yearend??midwinter??winter??december??new RelayCourse(spec.day,session.seed),stage=new Stage(relayLook(course));
const art=buildRelayScene(stage,course),exhibit=seasonExhibit(spec.id),audio=new CombatAudio();
const ui=document.createElement('main');ui.className='js-course season-course';
ui.innerHTML=`<header><div><small></small><h1></h1></div><button data-do="home">回港</button></header>
<article><small>分身交火</small><h2></h2><p></p><p class="js-instructions"></p><button data-do="start" disabled>身体正在凝聚…</button><button data-do="practice">随机练习</button></article>
<aside hidden><strong></strong><p></p><div class="relay-meter"><i></i></div><small></small></aside>
<nav hidden><div class="js-pad"><button data-key="KeyW">↑</button><button data-key="KeyA">←</button><button data-key="KeyS">↓</button><button data-key="KeyD">→</button></div><div class="relay-tools">
<button data-do="aim">选环 Q</button><button data-do="fire">投分身 G</button><button data-do="recall">回收 X</button><button data-do="jump">跳跃</button>${newyear&&newyear.day>='0109'?'<button data-key="KeyC">按住摊开</button>':''}<button data-do="retry">回到本段</button><button data-do="pause">暂停</button></div></nav>`;
document.body.append(ui);
const find=<E extends HTMLElement=HTMLElement>(q:string)=>ui.querySelector<E>(q)!;
const btn=(k:string)=>find<HTMLButtonElement>('[data-do="'+k+'"]');
find('header small').textContent=spec.year+'　·　'+spec.day.slice(0,2)+' 月 '+spec.day.slice(2)+' 日';
find('h1').textContent=course.spec.name;find('h2').textContent=spec.title;find('article p').textContent=spec.fact;
const instructions=find('.js-instructions');instructions.textContent=course.spec.lesson+' 移动用方向键或 WASD；选环后投分身，也可轻点地上的亮环。';
exhibit.preview(find('article'));
const spawn:Vec=[0,0,6.25],actor=new SlimeCharacter(stage,{world:art.world,spawn,input:false,ui:false,battleTargets:[],onReady(){if(phase==='intro')act('start');else{btn('start').disabled=false;btn('start').textContent='继续';}}}).attach();
applyLevelQuality(stage,actor,new Save().data.quality);
let lastBeat=0;
let phase:'intro'|'play'|'pause'|'finale'|'done'='intro',aim=0,time=0,end=0,hitTime=-8,hits=0,view='play',previousHud='';
const clock=new T.Clock(),target=new T.Vector3(),eye=new T.Vector3(),project=new T.Vector3(),danger=new T.Vector3();
const pulse=new T.Mesh(new T.IcosahedronGeometry(.16,1),stage.toon('#ff9752',{emissive:'#f09844',emissiveIntensity:.39}));
pulse.name='fx-return-pulse';stage.scene.add(pulse);pulse.visible=false;
const nav=find('nav'),panel=find('article'),aside=find('aside'),meter=find('.relay-meter'),bar=find('.relay-meter i');
const moves:Record<string,string>={ArrowUp:'KeyW',ArrowLeft:'KeyA',ArrowRight:'KeyD',ArrowDown:'KeyS',KeyW:'KeyW',KeyA:'KeyA',KeyD:'KeyD',KeyS:'KeyS',KeyC:'KeyC'};
const commands:Record<string,string>={KeyQ:'aim',KeyG:'fire',KeyX:'recall',Space:'jump',KeyR:'retry',Escape:'pause'};
let feedbackEnd=0;
function reset(){
 course.retry();actor.keys.clear();actor.keys.add('KeyX');course.returning=true;
 const check:Vec=course.done.size===0?[...spawn]:course.done.has(1)&&course.done.has(2)?[0,0,-3.15]:[0,0,2.1];
 actor.teleport(check);hitTime=course.elapsed;feedbackEnd=time+2.8;
}
function select(){if(!course.available(aim)){aim=[0,1,2,3].find(i=>course.available(i))??-1;}}
function act(k:string){
 if(k==='home'){session.home();return;}
 if(k==='practice'){location.assign(session.practicePath());return;}
 if((k==='start'||k==='pause'&&phase==='pause')&&actor.ready&&(phase==='intro'||phase==='pause')){
   phase='play';session.start();actor.mode='play';actor.yaw=0;panel.hidden=true;nav.hidden=aside.hidden=false;return;
 }
 if(phase!=='play')return;
 if(k==='pause'){phase='pause';actor.mode='paused';actor.keys.clear();nav.hidden=aside.hidden=true;panel.hidden=false;find('h2').textContent='已暂停';btn('start').textContent='继续';return;}
 if(k==='retry'){reset();return;}
 if(k==='jump'){actor.jump();return;}
 if(k==='recall'){course.recall();actor.keys.add('KeyX');feedbackEnd=time+2.9;return;}
 if(k==='aim'){for(let n=1;n<=4;n++){const i=(aim+n+4)%4;if(course.available(i)){aim=i;break;}}return;}
 if(k==='fire'){
   select();if(aim<0)return;
   if((actor.latest?.shots.length??0)>=5){course.hint='先回收已完成任务的分身。';feedbackEnd=time+2;return;}
   if(course.cast(aim,actor.position)){actor.launch([...course.pads[aim]]);actor.setMood('Spit',.3);audio.playCloneFire(actor.element);}
   feedbackEnd=time+2.4;
 }
}
ui.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-do]');if(b){act(b.dataset.do!);b.blur();}});
ui.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(b=>{
 b.onpointerdown=e=>{if(phase!=='play')return;e.preventDefault();b.setPointerCapture(e.pointerId);actor.keys.add(b.dataset.key!);};
 b.onlostpointercapture=()=>actor.keys.delete(b.dataset.key!);
});
addEventListener('keydown',e=>{
 if(document.querySelector('dialog[open]')||e.ctrlKey||e.metaKey||e.altKey)return;
 if(phase==='pause'&&e.code==='Escape'){if(!e.repeat)act('start');return;}
 if(phase!=='play')return;
 if(moves[e.code]){e.preventDefault();actor.keys.add(moves[e.code]);}
 else if(commands[e.code]){e.preventDefault();if(!e.repeat)act(commands[e.code]);}
});
addEventListener('keyup',e=>{if(moves[e.code])actor.keys.delete(moves[e.code]);});
addEventListener('blur',()=>{if(phase==='play')act('pause');});
stage.renderer.domElement.addEventListener('pointerup',(e:PointerEvent)=>{
 if(phase!=='play')return;let distance=55,chosen=-1;
 course.pads.forEach((p,i)=>{if(!course.available(i))return;project.fromArray(p);project.y+=.28;project.project(stage.camera);
  const d=Math.hypot((project.x*.5+.5)*innerWidth-e.clientX,(-project.y*.5+.5)*innerHeight-e.clientY);
  if(project.z>0&&project.z<1&&d<distance){distance=d;chosen=i;}});
 if(chosen>=0){aim=chosen;act('fire');}
});
function drawHud(){
 const kind=course.spec.kind,trainMeter=kind==='speedtrap'&&aim>0&&aim<3,walkMeter=kind==='crossing'&&course.westHeld&&!course.done.has(2);
 const shipMeter=kind==='starboard'&&aim>0&&aim<3;
 const sandMeter=kind==='dunes'&&(aim===1||aim===2),modelMeter=kind==='returnmark'&&!!midwinter?.held;
 const yearMeter=!!yearend&&(kind==='pulseprint'&&(aim===1||aim===2)||kind==='solstice'&&yearend.onMark&&!!yearend.held||kind==='roster'&&!!yearend.held&&!yearend.token);
 const monthMeter=!!monthend&&course.done.has(0)&&!(course.done.has(1)&&course.done.has(2))&&(kind==='speedruler'||monthend.first&&['punchcard','starplates','polarbay','iceribbon','ticketpress'].includes(kind));
 const newyearMeter=!!newyear&&!!newyear.first&&(newyear.timed||!newyear.trail)&&!newyear.ready;
 const show=newyearMeter||monthMeter||yearMeter||sandMeter||modelMeter||shipMeter||trainMeter||walkMeter||kind==='shadow'&&course.done.has(0)&&!course.done.has(2)||kind==='brake'&&course.westHeld&&!course.braked;
 meter.classList.toggle('show',show);
 if(show){const f=newyearMeter?(newyear!.timed||newyear!.day==='0102'||newyear!.day==='0105'?newyear!.signal:newyear!.fill):monthMeter?(['speedruler','punchcard','starplates'].includes(kind)?monthend!.signal:monthend!.fill):yearMeter?(kind==='roster'?yearend!.progress/2.15:yearend!.signal):sandMeter||modelMeter?midwinter!.markerSweep:shipMeter?course.sweep:trainMeter?december!.trainTime%12/12:walkMeter?december!.crossing:kind==='brake'?course.brake:course.sweep;bar.style.transform='scaleX('+Math.max(.015,f)+')';
  meter.dataset.window=String(newyearMeter?(newyear!.needsToken&&!newyear!.token?newyear!.canCollect:newyear!.timed?newyear!.inLight:newyear!.ready):monthMeter?(kind==='speedruler'?(aim===1?f<.35:f>.65):monthend!.ready):yearMeter?(kind==='pulseprint'?(aim===1?f<=.34:f>=.66):yearend!.ready):modelMeter?midwinter!.readyToRecall:sandMeter?(midwinter!.first?f>=.53:f<=.47):shipMeter?(aim===1?f<=.55:f>=.45):trainMeter?december!.windowAt(aim):walkMeter?f>=1:kind==='brake'?f>=.64:course.done.has(1)?f>=.68:f<=.32);}
 const help=feedbackEnd>time&&course.hint?course.hint:aim<0?course.spec.end:'当前瞄准　'+course.spec.pads[aim];
 const count='已接应 '+course.done.size+' / 4　·　分身 '+(actor.latest?.shots.length??0)+' / 5';
 const key=help+count+course.instruction;if(key===previousHud)return;previousHud=key;
 find('aside strong').textContent=course.instruction;find('aside p').textContent=count;find('aside small').textContent=help;
}
function opposingPulse(){
 const kind=course.spec.kind;const t=course.elapsed,active=course.done.has(0)&&course.done.size<4;
 pulse.visible=active&&!monthend&&!winter&&!midwinter&&!yearend&&(!december||kind==='twins');if(!pulse.visible)return;
 const p=(t*.25+course.phaseOffset)%1;
 if(newyear){
   const speed=newyear.day==='0103'?.23:newyear.day==='0104'?.14:.19;
   const offset=((course.elapsed*speed+course.phaseOffset)%1);
   danger.set(-4.5+9*offset,.29,-.14+.74*Math.sin(offset*Math.PI*2));
   if(newyear.day==='0103'&&newyear.held&&newyear.first===2&&offset>.68)pulse.visible=false;
   if(!pulse.visible)return;
  }else if(kind==='relay')danger.set(4.5-9*p,.28,-.92);
 else if(kind==='brake')danger.set(3*Math.cos(t),.27,-1.9+1.8*Math.sin(t));
 else if(kind==='arcs')danger.set(3.6*Math.sin(t*.86),.29,1.7*Math.cos(t*.86));
 else if(kind==='shadow')danger.set(-1.8+3.6*course.sweep,.23,-2.15);
 else if(kind==='twins')danger.set(-2.2+4.4*p,.31,-2.1+Math.sin(Math.PI*p)*1.15);
 else danger.set(2.1,.28,-3.4+p*6.8);
 pulse.position.copy(danger);
 const [x,y,z]=actor.position;if(t-hitTime>1.6&&Math.hypot(x-danger.x,y+.28-danger.y,z-danger.z)<.38){
   hits++;hitTime=t;actor.setMood('Hurt',.45);course.hint=newyear?'碰到横穿展台的亮点。下一次可侧移或跳过。':'擦到了橙色回波；下一趟可以跳过去。';feedbackEnd=time+2;
   if(hits%3===0)reset();
 }
}
function frameCamera(){
 const cam=stage.camera,portrait=innerWidth<innerHeight,kind=course.spec.kind;
 if(view==='low'){cam.position.set(3.7,.87,4.8);cam.lookAt(-.5,.64,-4.6);return;}
 if(view==='far'){cam.position.set(8,9.8,15.7);cam.lookAt(0,.7,-2.1);return;}
 if(phase==='intro'){eye.fromArray(introEye[kind]);if(portrait){eye.x*=.54;eye.z+=3.3;}cam.position.copy(eye);cam.lookAt(0,1.15,-3.9);return;}
 if(phase==='finale'||phase==='done'){
  if(newyear){
   const high=['0103','0104','0109','0110'].includes(newyear.day);
   cam.position.set(portrait?1.15:2.16,high?3.46:2.67,portrait?1.92:-4.23);cam.lookAt(0,newyear.day==='0109'?2.14:high?1.25:1.60,-10.56);
  }else if(monthend){
   const angle=monthend.day==='1229'?2.75:monthend.day==='1231'?1.19:1.80;
   cam.position.set(portrait?.94:angle,monthend.day==='1225'?3.52:2.62,portrait?2.80:-4.45);cam.lookAt(0,monthend.day==='1228'?1.83:1.50,-10.78);
  }else if(yearend){
   const focus=yearend.day==='1217'?.93:yearend.day==='1218'?2.12:yearend.day==='1220'?1.86:1.50;
   cam.position.set(portrait?1.02:1.85,yearend.day==='1221'?3.97:2.72,portrait?3.55:-4.37);cam.lookAt(0,focus,-10.76);
  }else if(winter||midwinter){cam.position.set(portrait?1.2:2.15,3.1,portrait?5.55:-1.45);cam.lookAt(0,1.75,-10.2);}
  else if(kind==='crossing'){cam.position.set(4.9,1.52,3.7);cam.lookAt(.15,1.01,-2.8);}
  else if(kind==='speedtrap'){const nose=december!.trainX+end*3;
   cam.position.set(nose+3.2,2.05,-4.1);cam.lookAt(nose-1.7,1.07,-9.55);}
  else if(kind==='twins'){const back=portrait?17.4:1.8;
   cam.position.set(.75,3.45,back+Math.min(3,end)*.68);cam.lookAt(0,3.15,-10.4);}
  else if(kind==='town'){cam.position.set(3.8,2.3,-1.8);cam.lookAt(.27,1.55,-9.5);}
  else{cam.position.set(3.3,2.4,-2.65);cam.lookAt(0,kind==='brake'?3.2:2.35,-10.5);}return;
 }
 const p=actor.position;target.set(p[0]*.38,1.42,p[2]-2.70);
 eye.set(target.x+(portrait?.24:1.2),portrait?6.6:4.1,target.z+(portrait?10.1:8.7));cam.position.copy(eye);cam.lookAt(target);
}
function finish(){
 phase='done';aside.hidden=true;
 exhibit.finish(()=>{
  const save=new Save(),key=spec.saveId+(session.practice?'-practice':'-daily'),r=save.data.life.records;
  if(!hits)r[key+'-clean']=1;
  if(course.lanes.size===2)r[key+'-routes']=1;
  if(!course.retries)r[key+'-first-pass']=1;
  if((newyear??monthend??yearend??midwinter??winter)?.launches===4)r[key+'-four-casts']=1;
  if(newyear||monthend||yearend||winter?.day==='1209'||midwinter&&midwinter.day!=='1214')r[key+'-first-side-mask']=(r[key+'-first-side-mask']??0)|(course.order===1?1:2);
  if(december){
   if(december.launches===4)r[key+'-four-casts']=1;
   if((course.spec.kind==='town'||course.spec.kind==='twins')&&course.order){
    r[key+'-first-side-mask']=(r[key+'-first-side-mask']??0)|(course.order===1?1:2);
   }
  }
  save.write();session.finish();
  const recap=document.createElement('p');recap.className='mode-caption';recap.textContent=(hits?'○':'✓')+' 零次擦碰　'+(course.retries?'○':'✓')+' 一遍接通　'+(course.lanes.size===2?'✓':'○')+' 走过两侧';document.querySelector('.mode-keepsake footer')?.before(recap);
  if(newyear||monthend||yearend||midwinter||winter)recap.textContent=((newyear??monthend??yearend??midwinter??winter)!.launches===4?'✓':'○')+' 四投交接　'+(course.retries?'○':'✓')+' 一遍接通';
  if(december){
   recap.textContent=(december.launches===4?'✓':'○')+' 四投接通　'+(course.retries?'○':'✓')+' 本段一遍过';
   if(course.spec.kind==='town'||course.spec.kind==='twins'){
    const mask=r[key+'-first-side-mask']??0;
    recap.textContent+='　'+((mask&1?1:0)+(mask&2?1:0))+'/2 种起手顺序';
   }
  }
 });
}
bindHelpHint(()=>phase==='intro'?course.spec.lesson:feedbackEnd>time&&course.hint?course.hint:course.instruction||course.spec.middle);
function step(delta:number){
  if(readingHelp())return;
 const dt=T.MathUtils.clamp(delta,0,.05);time+=dt;
 if(phase==='play'){
  actor.update(time,dt);const shots=actor.latest?.shots??[];const landed=newyear?newyear.update(dt,actor.position,shots,actor.spread>.52):course.update(dt,actor.position,shots);
  if(!course.returning)actor.keys.delete('KeyX');
  if(yearend?.day==='1219'&&course.done.has(0)&&!(course.done.has(1)&&course.done.has(2))){
    const beat=yearend.beat;
    if(beat&&beat!==lastBeat&&!course.done.has(beat)){if(beat===1)audio.playSalvage();else audio.playDewPickup();}
    lastBeat=beat;
  }
  if(landed>=0){audio.playHitmarker();feedbackEnd=time+1.2;}
  select();opposingPulse();
  if(actor.position[1]<-1.15)reset();
  if(course.done.size===4){phase='finale';actor.mode='observe';actor.keys.clear();nav.hidden=true;pulse.visible=false;
   if(newyear||monthend||december||winter||midwinter||yearend)ui.classList.add('december-finale');audio.playBellClang();}
  drawHud();
 }else if(phase!=='pause'){actor.update(time,dt);if(phase==='finale'){end+=dt;if(end>3.1)finish();}}
 frameCamera();art.animate(time,aim,end);if(course.spec.kind==='crossing')art.syncCars(syncCar);stage.render(dt,actor);
}
function syncCar(i:number){actor.syncBox(i);}
stage.renderer.setAnimationLoop(()=>step(clock.getDelta()));
(window as any).__slime=actor;(window as any).__level={spec,course,stage,step,done:course.done,lanes:course.lanes,get phase(){return phase;},get finalSeconds(){return end;},get hits(){return hits;},get aim(){return aim;},setView(v:'play'|'low'|'far'){view=v;}};
