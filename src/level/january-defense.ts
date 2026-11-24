import './january-defense.css';
import {session} from './mode-session';
import {Save} from '../game/save';
import {applyLevelQuality} from '../game/graphics';
import {JanuaryDefense,type Installation} from '../templates/january-defense';
import {buildJanuaryDefense} from '../themes/january-defense';

const {spec}=session,game=new JanuaryDefense(spec.day,session.seed);
const scene=buildJanuaryDefense(game),map=game.map;
applyLevelQuality(scene.stage,scene.actor,new Save().data.quality);
const ui=document.createElement('main');ui.id='jan-defense';ui.dataset.theme=map.theme;
ui.innerHTML=`<header><div><small></small><h1></h1></div><nav><button data-home>回港</button><button data-speed>1×</button><button data-pause>暂停</button></nav></header>
<div class="jd-readout" aria-live="polite"></div><div class="jd-markers" aria-label="可部署的位置"></div>
<section class="jd-panel"><h2></h2><p></p><div class="jd-tools" role="group" aria-label="布防工具"></div><div class="jd-strip" aria-label="本局保存的曝光"></div><footer><span class="jd-tip" role="status"></span><button data-action></button></footer></section>`;
document.body.append(ui);
const el=<T extends HTMLElement>(q:string)=>ui.querySelector<T>(q)!;
const title=el('h1'),topic=el('small'),readout=el('.jd-readout'),tip=el('.jd-tip'),panel=el('.jd-panel'),heading=el('h2'),copy=el('p');
title.textContent=spec.title;topic.textContent=(session.practice?'练习':'正式挑战')+'　·　'+spec.year+' / '+spec.day.slice(0,2)+' / '+spec.day.slice(2);
const action=el<HTMLButtonElement>('[data-action]'),speed=el<HTMLButtonElement>('[data-speed]'),pause=el<HTMLButtonElement>('[data-pause]');
const art=el('.jd-strip'),tools=el('.jd-tools'),markers=el('.jd-markers');
let entered=false,paused=false,multiplier=1,selection:Installation|'remove'='water';
let lastMessage='',messageTimer=0,lastKey='',finalTime=0,claimed=false,time=0;
const themeGuide=map.guide??({
  parade:'跟随马车，轮流守住花街的三个弯道。花粉沾满五次，马车就会停下整修。',
  station:'两侧站台交替到车。水台集中接驳，风台能从更远处分流。服务完成的旅客会继续走到出口。',
  eclipse:'月亮沿山脊向东移动。每两轮更换一座观测台；一轮云带完全清除，就能保住这一张曝光。'
} as Record<string,string>)[map.theme]??'根据当前段路线部署水、风两类设备，随时回收并迁移到下一段。';
const incident=map.incident??(map.theme==='parade'?'花车沾粉':map.theme==='station'?'误车小组':'云带漏入');
const recordKey=spec.saveId+(session.practice?'-practice':'-daily');
const buttons=new Map<string,HTMLButtonElement>();
function say(text:string){lastMessage=text;messageTimer=3;refresh();}
for(const [kind,label] of [['water',map.water],['wind',map.wind],['remove','回收塔'],['assist',map.help]]){
  const b=document.createElement('button');b.textContent=label;b.dataset.tool=kind;tools.append(b);buttons.set(kind,b);
  b.onclick=()=>{
    if(kind==='assist'){
      if(!paused&&game.assist()){scene.react('assist');say(map.help+'已启动');}
      return;
    }
    selection=kind as typeof selection;refresh();
  };
}
function place(index:number){
  if(!entered||paused)return;
  if(game.deploy(index,selection)){scene.react(selection);say(selection==='remove'?'已收回，可移到别处':'已部署在 '+(index+1)+' 号位');}
  else if(game.charges===0&&!game.towers[index])say('三个塔位都已使用，先选回收塔，再点旧塔。');
}
const padButtons=game.map.pads.map((_,i)=>{
  const b=document.createElement('button');b.dataset.pad=String(i);b.setAttribute('aria-label',(i+1)+' 号位置');
  b.textContent=String(i+1);markers.append(b);b.onclick=()=>place(i);return b;
});
function markPositions(){
  padButtons.forEach((b,i)=>{const at=scene.screen(i);b.style.left=at.x+'px';b.style.top=at.y+'px';});
}
function setupToolsVisible(){return entered&&!paused&&['setup','wave','interval'].includes(game.phase);}
function refresh(){
  const phase=game.phase,manage=setupToolsVisible(),sector=game.phase==='interval'?Math.min(2,Math.floor((game.wave+1)/2)):game.sector;
  markers.hidden=!manage;tools.hidden=!manage;art.hidden=map.theme!=='eclipse'||!['finale','won'].includes(phase);
  readout.hidden=!entered;pause.hidden=!entered||['lost','won','finale'].includes(phase);speed.hidden=pause.hidden;
  readout.textContent='第 '+(game.wave+1)+' / 6 轮　·　'+map.sectors[game.sector]+'　·　'+incident+' '+game.errors+' / 5';
  pause.textContent=paused?'继续':'暂停';speed.textContent=multiplier+'×';
  buttons.forEach((b,k)=>{b.setAttribute('aria-pressed',String(k===selection));if(k==='assist')b.disabled=!game.canAssist||paused;});
  padButtons.forEach((b,i)=>{const kind=game.towers[i]?.kind;b.dataset.filled=kind??'';b.title=(i+1)+' 号位 · '+(kind==='water'?map.water:kind==='wind'?map.wind:'可布防');});
  action.hidden=false;action.disabled=false;
  let hint='';
  if(!entered){
    heading.textContent=spec.goal;copy.textContent=spec.fact+' '+themeGuide;
    hint='选工具，再点地图上的数字布防。';action.textContent=scene.actor.ready?'进入布防':'正在生成史莱姆';action.disabled=!scene.actor.ready;
  }else if(paused){
    heading.textContent='布防暂停';copy.textContent='当前波次和设备位置已保留。';action.textContent='继续挑战';
  }else if(phase==='setup'||phase==='interval'){
    heading.textContent=map.sectors[sector]+' · '+(phase==='setup'?'布置首轮':'下一轮整备');
    const route=game.tracks[sector],nodes=[2*sector+1,2*sector+2];
    copy.textContent=map.theme==='station'?'下一班由'+map.sectors[sector]+'接应。近处服务台每次处理两份换乘需求，远处引导台会让队伍慢下来。':
      '下一批'+map.subject+'沿'+(route.points[0][0]<0?'左侧':'右侧')+'标线路过。'+nodes.join('、')+' 号位靠近本段。';
    hint='可用设备 '+game.charges+' / 3　·　回收后可立即迁移';action.textContent='开始第 '+(phase==='setup'?1:game.wave+2)+' 轮';
  }else if(phase==='wave'){
    heading.textContent=map.sectors[game.sector];copy.textContent=game.released+' / '+game.size+' 批已进入　·　累计处理 '+game.served;
    hint='可用设备 '+game.charges+' / 3　·　波次中仍可调整';action.hidden=true;
  }else if(phase==='lost'){
    heading.textContent='本次调度结束';copy.textContent=incident+'达到五次。可以从头整备，再试另一种部署。';
    action.textContent='重新布防';
  }else{
    const clear=game.plates.filter(Boolean).length;
    heading.textContent=phase==='finale'?'六轮已完成':spec.souvenir;
    copy.textContent=(map.theme==='eclipse'?'保存曝光 '+clear+' / 6　·　':'')+(game.errors===0?'✓ ':'○ ')+map.clean+'　'+(game.assists===0?'✓ ':'○ ')+'未用支援';
    hint=phase==='finale'?'亲手完成最后一步':spec.memory;
    action.textContent=phase==='finale'?map.finale:'领取纪念品';
    action.disabled=phase==='won'&&finalTime<1.75;
    if(!art.hidden&&art.childElementCount!==game.plates.length){
      art.replaceChildren(...game.plates.map((kept,i)=>{
        const photo=document.createElement('span');photo.className='jd-photo';photo.dataset.kept=String(kept);
        photo.style.setProperty('--height',(2+Math.round(Math.sin(i*Math.PI/5)*9))+'px');
        photo.style.setProperty('--shadow',(i*3-7)+'px');photo.title='第 '+(i+1)+' 张 · '+(kept?'曝光完成':'云带遮挡');return photo;
      }));
    }
  }
  tip.textContent=messageTimer>0?lastMessage:hint;panel.dataset.phase=!entered?'intro':phase;
}
function claim(){
  if(claimed)return;claimed=true;
  const save=new Save(),record=save.data.life.records;
  if(game.errors===0)record[recordKey+'-clean']=1;
  if(game.assists===0)record[recordKey+'-unassisted']=1;
  record[recordKey+'-plates']=Math.max(record[recordKey+'-plates']??0,game.plates.filter(Boolean).length);
  save.write();session.finish();
}
action.onclick=()=>{
  messageTimer=0;
  if(!entered){if(!scene.actor.ready)return;entered=true;session.start();}
  else if(paused)paused=false;
  else if(game.phase==='lost'){location.reload();return;}
  else if(game.phase==='finale'){game.finish();scene.react('water');}
  else if(game.phase==='won'){if(finalTime>=1.75)claim();}
  else game.start();
  refresh();
};
el<HTMLButtonElement>('[data-home]').onclick=session.home;
speed.onclick=()=>{multiplier=multiplier===1?2:1;refresh();};
pause.onclick=()=>{paused=!paused;refresh();};
addEventListener('keydown',e=>{
  if(e.repeat||!entered||document.querySelector('dialog[open]'))return;
  if(e.code==='Escape'&&!pause.hidden){pause.click();return;}
  if(!setupToolsVisible())return;
  if(/^Digit[1-6]$/.test(e.code))place(Number(e.code.slice(-1))-1);
});
function step(raw:number){
  const dt=Math.min(.12,Math.max(0,raw));time+=dt;
  if(!paused){
    for(let left=dt*multiplier;left>1e-8;left-=1/30)game.tick(Math.min(left,1/30));
    if(game.phase==='won')finalTime+=dt;
    messageTimer=Math.max(0,messageTimer-dt);scene.update(dt);
  }
  const key=[scene.actor.ready,game.phase,game.wave,game.released,game.served,game.errors,game.canAssist,messageTimer>0,finalTime>=1.75].join('/');
  if(key!==lastKey){lastKey=key;refresh();}
}
let previous=performance.now();
function frame(timestamp:number){
  const dt=Math.min(.12,Math.max(0,(timestamp-previous)/1000));previous=timestamp;
  step(dt);
  if(!document.hidden)scene.stage.render(dt||.016,scene.actor);requestAnimationFrame(frame);
}
window.addEventListener('resize',markPositions);markPositions();refresh();
(window as any).__level={game,step,actor:scene.actor,collision:scene.collision,setView(view:'play'|'low'|'far'){scene.setView(view);markPositions();},
  get phase(){return game.phase;},get time(){return time;}};
(window as any).__slime=scene.actor;
window.addEventListener('pagehide',e=>{if(!e.persisted)scene.dispose();},{once:true});
requestAnimationFrame(frame);
