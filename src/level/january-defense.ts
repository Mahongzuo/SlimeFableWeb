import {januaryDefenseStatus,januaryPacketCount,januaryWeekDefense} from '../templates/newyear-defense';
import {bindHelpHint,readingHelp} from './help-state';
import './january-defense.css';
import {seasonExhibit} from './season-entry';
import {session} from './mode-session';
import {Save} from '../game/save';
import {applyLevelQuality} from '../game/graphics';
import {JanuaryDefense,type Installation} from '../templates/january-defense';
import {buildJanuaryDefense} from '../themes/january-defense';

const {spec}=session,game=new JanuaryDefense(spec.day,session.seed);
const exhibit=seasonExhibit(spec.id),directLanding=spec.id==='0107-defense';
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
let recallControl=0;
const machineButton=document.createElement('button');
let readyPackets=0;
if(game.control){
  machineButton.dataset.machine='';tools.append(machineButton);machineButton.textContent=game.control.spec.name;
  machineButton.onclick=()=>{if(!paused&&game.operate()){
    scene.react('wind');
    if(scene.actor.ready){scene.actor.launch([2.10,.32,3.92]);recallControl=1.4;}
    say(game.control!.spec.used);
  }};
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
    if(game.parade){heading.textContent='花车停在街角';copy.textContent='花粉盖住了花瓣。回到本轮起点调塔，之前的街段已经通过。';action.textContent='从这个弯道再试';}
  }else{
    const clear=game.plates.filter(Boolean).length;
    heading.textContent=phase==='finale'?'六轮已完成':spec.souvenir;
    copy.textContent=(map.theme==='eclipse'?'保存曝光 '+clear+' / 6　·　':'')+(game.errors===0 && !game.retries?'✓ ':'○ ')+map.clean+'　'+(game.assists===0?'✓ ':'○ ')+'未用支援';
    hint=phase==='finale'?'亲手完成最后一步':spec.memory;
    action.textContent=phase==='finale'?map.finale:'领取纪念品';
    if(directLanding){
      if(phase==='finale')hint='点「放下着陆绳」，气球就会飞向加来。';
      else if(finalTime<1.75){hint='着陆绳已放下，等吊篮落稳。';action.textContent='气球正在着陆';}
    }
    action.disabled=phase==='won'&&finalTime<1.75;
    if(!art.hidden&&art.childElementCount!==game.plates.length){
      art.replaceChildren(...game.plates.map((kept,i)=>{
        const photo=document.createElement('span');photo.className='jd-photo';photo.dataset.kept=String(kept);
        photo.style.setProperty('--height',(2+Math.round(Math.sin(i*Math.PI/5)*9))+'px');
        photo.style.setProperty('--shadow',(i*3-7)+'px');photo.title='第 '+(i+1)+' 张 · '+(kept?'曝光完成':'云带遮挡');return photo;
      }));
    }
  }
  if(game.parade && !paused){
    if(phase==='setup'&&entered){copy.textContent='温室门口的缎带向东。先在 1 号位架水雾喷台，试着拦下贴近车身的花粉。';}
    if(phase==='interval' && (game.wave===1||game.wave===3)){
      copy.textContent='车头已转，车尾还在前街。留一座旧塔守第一团花粉，把另一座移到新弯道。';
    }
    if(phase==='finale'){
      heading.textContent='双绳轮花拱';
      copy.textContent='让分身压住左侧绳轮，本体再去收紧右边的绳。';
      action.textContent=game.wheel==='free'?'投分身压左轮':game.wheel==='cast'?'分身正在落位':scene.crossing?'正在拉开花拱':'本体去拉右绳';
      action.disabled=!scene.wheelReady && game.wheel==='free'||game.wheel==='cast'||scene.crossing;
    }
  }
  if(game.control){
    const c=game.control;
    machineButton.hidden=!['wave','interval'].includes(phase);
    machineButton.disabled=c.lock>0;
    machineButton.textContent=c.spec.name+(machineButton.disabled?' · '+Math.ceil(c.lock)+' 秒':'');
    if(entered&&phase==='interval'&&game.wave===1){
      heading.textContent=c.spec.name+' · 转入中段';
      copy.textContent=c.spec.guide;
      if(!c.count){action.disabled=true;hint='先操作'+c.spec.name+'，再开第三轮。';}
    }
    if(phase==='wave'&&game.wave>=2){
      copy.textContent=c.spec.guide;hint=c.active>0?c.spec.used:'本段已处理 '+game.served+' 批';
      if(c.day==='1202')hint=c.linked?'接力灯守护 '+(Math.floor(c.focus/2)+1)+' 号灯段':'在同段架一风一水，准备接灯。';
      if(c.day==='1203')hint=c.side?'通行灯朝向东口':'通行灯朝向西口';
      if(c.day==='1204')hint=c.focus%2?'探照灯正对远场':'探照灯正对近场';
      if(c.day==='1205')hint='待放行回执 '+c.reserve+' / 4';
      if(c.day==='1207')hint='等待带签的云团 · 已回传 '+c.hits+' 批';
      if(c.day==='1208')hint=c.focus%2?'瞄准后半坡':'瞄准前半坡';
      if(c.day==='1209')hint=c.active>0?'水门已开 · 水塔等待引导标记':'让风塔先做航道标记';
      if(c.day==='1210')hint=c.side?'北天值班':'南天值班';
      if(c.day==='1211')hint=c.focus%2?'曝光窗在远景':'曝光窗在近景';
      if(c.day==='1212')hint='渠首水池 '+c.reserve+' / 3 格';
      if(c.day==='1213')hint=c.focus%2?'相机看守后窗':'相机看守前窗';
      if(c.day==='1214')hint='先用风塔标出中段的阴影';
      if(c.day==='1215')hint=c.reserve?'已存月车底片，等另一团来时回拍':'月车等待第一张底片';
      if(c.day==='0102')hint=c.reserve===0?'两港均可先上客':'下一次开桥请等'+(c.reserve===1?'铜':'蓝')+'角票';
      if(c.day==='0103')hint='金环越过前铜标、离开后铜标前可接收';
      if(c.day==='0104')hint='等一张带凸点的页盘与一张空盘同时到场';
      if(c.day==='0105')hint='当前塔位可配'+(c.focus%2?'金色暖罩':'蓝色冷罩');
      if(januaryWeekDefense(c.day))hint=januaryDefenseStatus(c.day,c,readyPackets);
      if(c.day==='1222')hint=(c.side?'金':'蓝')+'旗等同色票角';
      if(c.day==='1223')hint='竹架有 '+c.reserve+' / 3 节可分';
      if(c.day==='1224')hint=c.focus%2?'双号浮标守后半程':'单号浮标守前半程';
      if(c.day==='1225')hint='等青、金两色票同时在场';
      if(c.day==='1226')hint='下一站收'+['蓝','金','绿'][c.reserve]+'色行李';
      if(c.day==='1227')hint=c.side?'下一标在后段铜窗':'下一标在前段铜窗';
      if(c.day==='1228')hint='等金戳上坡，身后留一只邮袋';
      if(c.day==='1229')hint=c.reserve?'已存'+(c.reserve===1?'西':'东')+'岸电，换另一岸接线':'先选择单号西岸或双号东岸';
      if(c.day==='1230')hint='等金色温标离开风窗恢复常速';
      if(c.day==='1231')hint='同线两个承点须靠近到四分之一路段内';
      if(c.day==='1217')hint='金点越过本线半程后再读一次';
      if(c.day==='1218')hint='看金色纸角，夹住后接送风台';
      if(c.day==='1219')hint=c.reserve?'待换文本正等'+(c.reserve===1?'金':'蓝')+'签':'任选蓝、金一份先收';
      if(c.day==='1220')hint='当前分送至第'+(1+Math.floor(c.focus/2))+'站，留意'+['蓝','金','绿'][Math.floor(c.focus/2)]+'章';
      if(c.day==='1221')hint='金样带的两侧都须没有灰云';
      if(c.day==='1216')hint='等同路的两团信号同时出现';
      if(c.day==='1206')hint='留意风塔照亮的校姿目标。';
    }
    if(phase==='lost'){action.textContent='在本轮重新布防';copy.textContent='本轮开始前的进度已留好。可换塔位，或在波次中使用'+c.spec.name+'。';}
  }
  const showLanding=directLanding&&(phase==='finale'||phase==='won');
  tip.textContent=messageTimer>0&&!showLanding?lastMessage:hint;panel.dataset.phase=!entered?'intro':phase;
}
function claim(){
  if(claimed)return;claimed=true;
  const save=new Save(),record=save.data.life.records;
  if(game.errors===0 && !game.retries)record[recordKey+'-clean']=1;
  if(game.assists===0)record[recordKey+'-unassisted']=1;
  record[recordKey+'-plates']=Math.max(record[recordKey+'-plates']??0,game.plates.filter(Boolean).length);
  if(game.control&&game.control.hits>0)record[recordKey+'-machine']=Math.max(record[recordKey+'-machine']??0,game.control.hits);
  save.write();session.finish();
}
action.onclick=()=>{
  messageTimer=0;
  if(!entered){if(!scene.actor.ready)return;entered=true;panel.querySelector('.season-preview')?.remove();scene.enter();markPositions();session.start();}
  else if(paused)paused=false;
  else if(game.phase==='lost'){if(!game.retryCorner()){location.reload();return;}}
  else if(game.phase==='finale'){if(game.parade){if(game.wheel==='free')scene.castWheel();else scene.crossWheel();}else exhibit.finish(()=>{game.finish();refresh();});scene.react('water');}
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
bindHelpHint(()=>[heading.textContent,copy.textContent,game.phase==='wave'?game.control?.spec.guide:tip.textContent,game.phase==='wave'&&game.control&&januaryWeekDefense(game.day)?januaryDefenseStatus(game.day,game.control,readyPackets):''].filter(Boolean).join('　'));
function step(raw:number){
  if(readingHelp())return;
  const dt=Math.min(.12,Math.max(0,raw));time+=dt;
  if(!paused){
    for(let left=dt*multiplier;left>1e-8;left-=1/30)game.tick(Math.min(left,1/30));
    if(game.phase==='won')finalTime+=dt;
    if(recallControl>0){
      recallControl=Math.max(0,recallControl-dt);
      if(!recallControl)scene.actor.keys.add('KeyX');
    }else if(game.control&&!scene.actor.latest?.shots?.length)scene.actor.keys.delete('KeyX');
    messageTimer=Math.max(0,messageTimer-dt);scene.update(dt);
  }
  if(!entered&&scene.actor.ready){entered=true;panel.querySelector('.season-preview')?.remove();scene.enter();markPositions();session.start();refresh();}
  if(game.control&&januaryWeekDefense(game.day)&&game.phase==='wave')readyPackets=januaryPacketCount(game.day,game.control,game.packets,game.tracks);
  const key=[readyPackets,scene.actor.ready,game.wheel,scene.wheelReady,scene.crossing,game.phase,game.wave,game.control?.count,game.control?.focus,game.control?.reserve,Math.ceil(game.control?.lock??0),game.released,game.served,game.errors,game.canAssist,messageTimer>0,finalTime>=1.75].join('/');
  if(key!==lastKey){lastKey=key;refresh();}
}
let previous=performance.now();
function frame(timestamp:number){
  const dt=Math.min(.12,Math.max(0,(timestamp-previous)/1000));previous=timestamp;
  step(dt);
  if(!document.hidden)scene.stage.render(dt||.016,scene.actor);requestAnimationFrame(frame);
}
window.addEventListener('resize',markPositions);markPositions();refresh();
exhibit.preview(panel);
(window as any).__level={game,step,actor:scene.actor,collision:scene.collision,setView(view:'play'|'low'|'far'){scene.setView(view);markPositions();},
  get phase(){return game.phase;},get time(){return time;}};
(window as any).__slime=scene.actor;
window.addEventListener('pagehide',e=>{if(!e.persisted)scene.dispose();},{once:true});
requestAnimationFrame(frame);
