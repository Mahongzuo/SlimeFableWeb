import './atlas.css';
import * as T from 'three';
import {levels} from '../../content/levels/registry';
import {days} from '../../content/registry';
import {editions} from '../../content/atlas';
import {Stage} from './stage';
import {atlasLook,buildAtlas} from '../themes/atlas';
import {atlasCourse,curve,freshRun,hop,jumpHeight,signs,tick} from '../templates/atlas';
import {SlimeCharacter} from '../slime/character';
import {applyLevelQuality} from '../game/graphics';
import {dayIdOf,dayLabel} from '../game/calendar';
import {Save} from '../game/save';

const id=new URLSearchParams(location.search).get('id')??'',entry=levels[id];
if(entry?.template!=='atlas'||!('kind' in entry))throw Error('找不到历史航道 '+id);
const spec=entry,day=id.slice(0,4),edition=editions[spec.kind],course=atlasCourse(spec);
const stage=new Stage(atlasLook(spec)),art=buildAtlas(stage,spec,course),save=new Save(),run=freshRun();
type Phase='intro'|'play'|'pause'|'ready'|'finale'|'done';
let phase:Phase='intro',time=0,finale=0,slow=false,message='',messageUntil=0;
document.title=spec.title+' · 史莱姆寓言';
const ui=document.createElement('main');ui.id='atlas-ui';ui.style.setProperty('--accent',edition.colors[1]);
ui.innerHTML=`<header><div class="atlas-heading"><small></small><h1></h1></div><details><summary>关卡日历</summary><nav><label>月份<select data-month></select></label><label>章节<select data-chapter></select></label><a data-go>打开章节</a><a data-home>回到凝露港</a></nav></details></header>
<div class="atlas-status" hidden><span data-counter></span><b data-sign></b><span data-distance></span><progress aria-label="航道进度" value="0" max="1"></progress></div>
<div class="atlas-message" aria-live="polite" hidden></div><section class="atlas-card"><small data-label></small><h2></h2><p data-copy></p><div class="atlas-actions"></div></section>
<div class="atlas-pad" hidden><button data-move="-1" aria-label="换到左侧道">←</button><button data-move="1" aria-label="换到右侧道">→</button><button data-hop>弹跳</button><button data-fold>摊开</button><button data-slow>慢行</button><button data-pause>暂停</button></div>`;
document.body.append(ui);
const el=<E extends HTMLElement=HTMLElement>(s:string)=>ui.querySelector(s) as E;
el('header small').textContent=dayLabel(day)+'　/　'+id.slice(5)+'　·　'+edition.name;el('h1').textContent=spec.title;
const monthSelect=el<HTMLSelectElement>('[data-month]'),chapterSelect=el<HTMLSelectElement>('[data-chapter]'),go=el<HTMLAnchorElement>('[data-go]');
for(let i=1;i<=12;i++)monthSelect.add(new Option(i+' 月',String(i).padStart(2,'0')));
monthSelect.value=day.slice(0,2);
function updateCalendar(){
  chapterSelect.replaceChildren();
  for(const d of Object.values(days).filter(d=>d.day.startsWith(monthSelect.value)).sort((a,b)=>a.day.localeCompare(b.day))){
    for(const c of d.chapters.filter(c=>c.status==='web'&&levels[c.id]))chapterSelect.add(new Option(d.day.slice(2)+' 日 · '+c.quest,c.id));
  }
  if(monthSelect.value===day.slice(0,2))chapterSelect.value=id;
  go.href='./level.html?id='+chapterSelect.value;
}
monthSelect.onchange=updateCalendar;chapterSelect.onchange=()=>{go.href='./level.html?id='+chapterSelect.value;};updateCalendar();
const home='./?from='+encodeURIComponent(id)+'&date='+day;el<HTMLAnchorElement>('[data-home]').href=home;
function selectReturnDay(){
  save.data.selectedDay=dayIdOf(new Date())===day?null:day;
  save.write();
}
el('[data-home]').onclick=selectReturnDay;
const actor=new SlimeCharacter({THREE:T,renderer:stage.renderer,scene:stage.scene,camera:stage.camera,sun:stage.sun,controls:stage.controls},{
  world:{boxes:[],surfaces:[{min:[-7,-course.finish-10],max:[7,10],height:.025}]},spawn:[0,.025,0],input:false,ui:false,trainingTargets:[],title:spec.title,onToast:()=>{},
  onReady:()=>{if(phase==='intro')start();},
}).attach();
actor.forward=[0,0,1];applyLevelQuality(stage,actor,save.data.quality);
let audio:AudioContext|null=null;
function chime(note:number){
  if(!audio||audio.state!=='running')return;
  const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime;
  osc.type=spec.kind==='score'?'triangle':'sine';osc.frequency.value=[261.63,329.63,392,440,523.25,659.25,783.99][note%7];
  gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(.065,t+.015);gain.gain.exponentialRampToValueAtTime(.001,t+.35);
  osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+.36);
}
const controls=el('.atlas-pad'),status=el('.atlas-status'),card=el('.atlas-card'),actions=el('.atlas-actions');
function button(label:string,act:()=>void,disabled=false){
  const b=document.createElement('button');b.textContent=label;b.disabled=disabled;b.onclick=()=>{act();b.blur();};actions.append(b);
}
function panel(){
  actions.replaceChildren();card.hidden=phase==='play';controls.hidden=phase!=='play';status.hidden=phase!=='play';el('details').hidden=phase==='play';
  let label='',heading='',copy='';
  if(phase==='intro'){
    label=edition.name+'　·　'+course.gates.length+' 道机关';heading=spec.title;copy=spec.fact;
    button(actor.ready?'进入航道':'史莱姆正在凝聚…',start,!actor.ready);
    const link=document.createElement('a');link.textContent='历史出处';link.target='_blank';link.rel='noopener noreferrer';link.href=spec.source;actions.append(link);
  }else if(phase==='pause'){
    label='航道暂停';heading=spec.title;copy='已通过 '+run.index+'/'+course.gates.length+' 道机关。';
    button('继续前进',()=>{phase='play';panel();});button('重新出发',()=>location.reload());
  }else if(phase==='ready'){
    label='终点';heading=edition.finale;copy='沿途的光迹已接通，最后一步交给你。';button(edition.finale,launch);
  }else if(phase==='finale'){label=dayLabel(day);heading=edition.finale;copy=spec.fact;}
  else if(phase==='done'){
    const records=save.data.life.records;label='已收进史书';heading=spec.souvenir;
    copy='本次 '+run.time.toFixed(1)+' 秒 · 最佳 '+((records[id+'-ms']??0)/1000).toFixed(1)+' 秒 · 收藏 '+run.collected.size+'/'+course.gates.length+' · '+(run.retries?'重试 '+run.retries+' 次':'全程无重试');
    button('再走一遍',()=>location.reload());button('回到凝露港',()=>{selectReturnDay();location.assign(home);});
  }
  el('[data-label]').textContent=label;el('h2').hidden=phase==='intro';el('h2').textContent=heading;el('[data-copy]').textContent=copy;
  if(phase==='intro'){const guide=document.createElement('p');guide.className='atlas-guide';guide.textContent='自动前进 · ← → 换道 · 空格越栏 · C 摊开过低门 · ↓ 慢行。沿途菱晶可收集。';actions.before(guide);}
  for(const guide of Array.from(ui.querySelectorAll('.atlas-guide')))if(phase!=='intro'||guide!==ui.querySelector('.atlas-guide'))guide.remove();
}
function start(){if(phase!=='intro'||!actor.ready)return;
  try{audio??=new AudioContext();void audio.resume().catch(()=>{});}catch{}
  phase='play';save.add('visited',id);actor.forward=[0,0,-1];panel();
}
function launch(){if(phase!=='ready')return;phase='finale';finale=0;actor.setMood('Bliss',2);chime(4);panel();}
function finish(){phase='done';const records=save.data.life.records,ms=Math.max(1,Math.round(run.time*1000));
  records[id+'-ms']=Math.min(ms,records[id+'-ms']||Infinity);records[id+'-gems']=Math.max(run.collected.size,records[id+'-gems']||0);
  if(!run.retries)records[id+'-clean']=1;
  save.add('completed',id);save.add('souvenirs',id);save.write();panel();
}
function pause(){if(phase==='play'){phase='pause';slow=false;panel();}else if(phase==='pause'){phase='play';panel();}}
function lane(dir:number){if(phase==='play')run.lane=T.MathUtils.clamp(run.lane+dir,-1,1);}
function fold(){if(phase==='play'&&run.jump===0)run.flat=!run.flat;}
function jump(){if(phase==='play')hop(run);}
for(const b of Array.from(ui.querySelectorAll<HTMLElement>('[data-move]')))b.onclick=()=>lane(Number(b.dataset.move));
el('[data-hop]').onclick=jump;el('[data-fold]').onclick=fold;el('[data-pause]').onclick=pause;
el('[data-slow]').onclick=()=>{slow=!slow;};
addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||(e.target instanceof Element&&e.target.closest('select,summary,nav')))return;
  if(e.code==='Escape'&&!e.repeat){pause();return;}
  if(e.code==='Enter'&&(phase==='intro'||phase==='ready')){e.preventDefault();phase==='intro'?start():launch();return;}
  if(phase!=='play')return;
  if(['Space','ArrowLeft','ArrowRight','ArrowDown'].includes(e.code))e.preventDefault();if(e.repeat)return;
  if(['ArrowLeft','KeyA'].includes(e.code))lane(-1);if(['ArrowRight','KeyD'].includes(e.code))lane(1);
  if(e.code==='Space')jump();if(e.code==='KeyC')fold();if(['ArrowDown','KeyS'].includes(e.code))slow=true;
});
addEventListener('keyup',e=>{if(['ArrowDown','KeyS'].includes(e.code))slow=false;});
addEventListener('blur',()=>{if(phase==='play')pause();});
function say(text:string){message=text;messageUntil=time+1.5;}
function simulate(dt:number){
  time+=dt;
  if(phase==='play'){
    const result=tick(run,course,dt,slow);
    if(result==='gate'){actor.setMood('Happy',.34);chime(run.index);say('通过　'+run.index+' / '+course.gates.length);}
    else if(result==='jewel'){chime(5);say('菱晶　'+run.collected.size+' / '+course.gates.length);}
    else if(result==='retry'){say('再来一次 · '+signs[course.gates[run.index].sign]);actor.teleport([curve(run.distance,course.phase)+run.offset,.025,-run.distance]);actor.setMood('Squash',.24);}
    else if(result==='finish'){phase='ready';actor.forward=[0,0,1];panel();}
  }
  const y=.025+jumpHeight(run),x=curve(run.distance,course.phase)+run.offset,z=-run.distance;
  if(dt>0){actor.velocity[0]=(x-actor.position[0])/dt;actor.velocity[1]=(y-actor.position[1])/dt;actor.velocity[2]=(z-actor.position[2])/dt;}
  if(phase==='play')actor.forward=[Math.sin(Math.atan2(actor.velocity[0],Math.max(.1,-actor.velocity[2]))),0,-Math.cos(Math.atan2(actor.velocity[0],Math.max(.1,-actor.velocity[2])))];
  actor.position[0]=x;actor.position[1]=y;actor.position[2]=z;actor.spread=run.spread;actor.grounded=!run.jump;actor.update(time,dt);
  if(phase==='finale'){finale+=dt;if(finale>=3.6)finish();}
}
const eye=new T.Vector3(),aim=new T.Vector3(),look=new T.Vector3(0,1,-6);
function frame(raw:number){
  const dt=Math.max(0,Math.min(.075,raw));if(phase!=='pause')simulate(dt);
  const [x,,z]=actor.position,landmark=art.hero.position,overview=phase==='done'||phase==='finale',intro=phase==='intro';
  if(overview){eye.set(landmark.x+6,4.4,landmark.z+12);aim.set(landmark.x,3.35+Math.min(finale,3)*.25,landmark.z);}
  else{const narrow=innerWidth<650;
    if(intro&&narrow){eye.set(x-.68,2.45,z+6);aim.set(x,.4,z-1.15);}
    else{eye.set(x*.72+(intro?-1.65:.72),intro?2.1:narrow?3.6:2.9,z+(intro?4.5:narrow?5.8:4.6));
      aim.set(curve(run.distance+3,course.phase)+run.offset*.26,.72,z-(intro?3.5:3.1));}}
  const blend=1-Math.exp(-dt*(overview?2.6:7));
  stage.camera.position.lerp(eye,blend);look.lerp(aim,blend);stage.camera.lookAt(look);
  if(phase==='play'){
    const g=course.gates[run.index];el('[data-counter]').textContent='航标 '+Math.min(run.index+1,course.gates.length)+' / '+course.gates.length;
    el('[data-sign]').textContent=g?(g.sign==='fork'?'任选侧道':(['左道','中道','右道'][g.lane+1]))+' · '+signs[g.sign]:'抵达终点';
    el('[data-distance]').textContent=g?Math.max(0,g.distance-run.distance).toFixed(1)+' m':'';
    el<HTMLProgressElement>('progress').value=Math.min(1,run.distance/course.finish);
    el('[data-fold]').setAttribute('aria-pressed',String(run.flat));el('[data-slow]').setAttribute('aria-pressed',String(slow));
  }
  const toast=el('.atlas-message');toast.hidden=phase!=='play'||time>messageUntil||!message;if(!toast.hidden)toast.textContent=message;
  art.paint(run,time,finale);stage.render(dt,actor);
}
stage.camera.fov=47;stage.camera.updateProjectionMatrix();stage.camera.position.set(-1.65,2.1,4.5);
panel();const clock=new T.Clock();stage.renderer.setAnimationLoop(()=>frame(clock.getDelta()));
(window as any).__slime=actor;
(window as any).__level={spec,course,run,get phase(){return phase;},step:frame};

