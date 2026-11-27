import {isNewyearDay} from '../templates/newyear-defense';
import {isMonthendDay} from '../templates/monthend-defense';
import {newyearBranches,newyearMachines} from '../templates/newyear-match';
import {monthBranches} from '../templates/monthend-match';
import {isYearendDay} from '../templates/yearend-defense';
import {bindHelpHint,readingHelp,resumeAfterHelp} from './help-state';
import * as THREE from 'three';
import './mode-match.css';
import './season-match.css';
import {isSeasonMatch,matchMachines,contactLabel,machineLocked,machineGoals} from '../templates/season-match';
import {buildMatchMachine} from '../themes/season-match';
import {session} from './mode-session';
import {Stage} from './stage';
import {applyLevelQuality} from '../game/graphics';
import {Save} from '../game/save';
import {SlimeCharacter} from '../slime/character';
import {elements} from '../slime/elements';
import {beginEncore,createBoard,swap,hint,shuffle,colour,specialKind,HOLE,COIN} from '../templates/mode-match';
import {MatchMotion,MatchSound,powers} from './match-effects';
import {bindMatchPointer} from './match-pointer';
import {buildMatchObjects} from '../themes/match-objects';
import {seasonExhibit} from './season-entry';
import {buildModeLandmark} from '../themes/mode-landmarks';
import {januaryMatches,targetLabel} from '../templates/january-match';
import {buildJanuaryMatch} from '../themes/january-match';
import {makeFinalPrint} from './january-match';
import {coinFaces,connectDrawer,drawerHints,mountCoinRail} from './jan01-match';

// The studio, currency counter and canal lock controls are fictional.
const {spec}=session;
const january=januaryMatches[spec.day];
const coins=spec.day==='0101',canal=spec.day==='0815';
const machineDay=isSeasonMatch(spec.day)?spec.day:null;
const machine=machineDay?matchMachines[machineDay]:null;
const rules=machine?.hint??january?.rules??(coins?'14 步内送入 3 枚硬币。先让 € 对准底部金框「币盘」，再消除它下方的凝露。':
 canal?'消除黄铜水标上的凝露，转开人字闸门，让安康号驶过三段航道。':
 '消除金边接点，把两侧的画面送进对应监视器。最后横向接通 02 号中屏。');
const captions=machine?.stages??january?.stages??(coins?['第一格零钱盘','为第二枚硬币换道','补齐最后一格','欧元柜台开张']:
 canal?['上游水标','平衡闸室水位','开启出口闸门','安康号通过运河']:['左右信号','另一侧信号','接通横带','首播信号已送出']);
const winterSkies:Record<string,[string,string]>={'1222':['#465365','#a6acaa'],'1223':['#37485b','#94a4a6'],'1224':['#749ca9','#d9ceaf'],'1225':['#7e9d87','#cfcca9'],'1226':['#718f86','#c5c8a8'],'1227':['#4d6474','#a2afa3'],'1228':['#8aa69e','#d9cda7'],'1229':['#769781','#c9c7a3'],'1230':['#8b8a79','#d6c3a2'],'1231':['#73647b','#c7a997'],'1217':['#33445f','#7f9aa5'],'1218':['#738383','#c5bfa8'],'1219':['#80685f','#d3b58c'],'1220':['#608d96','#c3cbb4'],'1221':['#283951','#7a859b']};
const orbitSky=winterSkies[spec.day]??(spec.day==='1213'?['#29394b','#777e8a']:spec.day==='1214'?['#6d918d','#cfbe9e']:spec.day==='1215'?['#6f989f','#d2c29e']:spec.day==='1216'?['#65867c','#c6c6a5']:spec.day==='1212'?['#698d83','#d9ccaa']:spec.day==='1209'?['#28394c','#6e8590']:null);
const stage=new Stage({skyTop:orbitSky?.[0]??january?.sky?.[0]??(january?.theme==='titan'?'#633636':january?'#365048':coins?'#758f8c':canal?'#7b9292':'#24394b'),skyHorizon:orbitSky?.[1]??january?.sky?.[1]??(january?.theme==='titan'?'#d9955e':january?'#cfb794':coins?'#e0d1ab':canal?'#cfdbc7':'#899c9e'),
 fog:[28,85],sun:'#ffe1b4',sunIntensity:2.2,hemiSky:'#fff3cf',hemiGround:'#676f6c',ink:'#344144',wash:'#b7b4a1'});
const studio=spec.day==='1123';
const landmark=studio?buildModeLandmark(stage,spec.day,[0,0,-1.5]):null;
const machineScene=machineDay?buildMatchMachine(stage,machineDay):null;
const januaryScene=machineScene??(january?buildJanuaryMatch(stage,january.theme,spec.day):null);
const objects=januaryScene??(studio?null:buildMatchObjects(stage,spec.day));
const sound=new MatchSound();
// Original monochrome stage art for the three fictional signal fragments.
const displays=!studio?[]:[0,1,2].map(n=>{
 const canvas=document.createElement('canvas');canvas.width=240;canvas.height=160;
 const c=canvas.getContext('2d')!;c.fillStyle='#26343a';c.fillRect(0,0,240,160);
 const white='#eee9dc';c.strokeStyle=white;c.fillStyle=white;
 if(n===0){
   c.fillRect(0,95,240,33);
   for(let i=0;i<15;i++){const h=16+(i*31)%42;c.fillRect(i*18,97-h,13,h);}
   c.beginPath();c.arc(175,29,12,0,Math.PI*2);c.fill();
 }else if(n===2){
   for(let i=0;i<17;i++){c.beginPath();c.ellipse(142-i*1.8,71+i*.4,8+i*8,4+i*5,i*.06,0,Math.PI*2);c.stroke();}
 }else{
   c.textAlign='center';c.font='bold 47px Georgia,serif';c.fillText('DOCTOR',120,65);c.fillText('WHO',120,108);
 }
 c.fillStyle='#1c282d';c.fillRect(0,130,240,30);
 c.fillStyle=white;c.font='bold 18px monospace';c.textAlign='left';c.fillText('0'+(n+1)+' / 23.XI.63',8,151);
 c.fillStyle='#18252d36';for(let i=0;i<160;i+=4)c.fillRect(0,i,240,1);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const picture=new THREE.Mesh(new THREE.PlaneGeometry(1.14,.88),new THREE.MeshBasicMaterial({map:texture}));
 picture.position.set((n-1)*1.75-.12,n===1?2.32:2.16,-1.012);picture.visible=false;stage.scene.add(picture);
 return {picture,src:canvas.toDataURL()};
});
const litScreens=[false,false,false];
const base=new THREE.Mesh(new THREE.CylinderGeometry(4.1,4.4,.48,48),stage.toon(january?.baseColor??(january?.theme==='titan'?'#ae714d':january?'#947965':coins?'#ad9980':canal?'#aebba6':'#58716f')));
base.position.y=-.25;stage.add(base);
const ring=new THREE.Mesh(new THREE.TorusGeometry(3.92,.024,6,96),stage.toon('#dcbf86'));
ring.rotation.x=Math.PI/2;ring.position.y=.01;stage.add(ring);
const counterHeight=coins?1.415:0;
const actor=new SlimeCharacter(stage,{world:{boxes:[],surfaces:[{min:[-8,-8],max:[8,8],height:counterHeight}]},spawn:coins?[.1,counterHeight,-1.08]:[0,0,1.3],input:false,ui:false,trainingTargets:[],onReady:()=>{
 if(phase!=='intro')return;
 sound.start(studio);phase='play';if(machine)ui.classList.add('machine-playing');actor.mode='play';session.start();if(coins)ui.classList.add('drawer-open');
 message(coins?drawerHints[0]:rules);paint();controls();
}}).attach();
applyLevelQuality(stage,actor,new Save().data.quality);
actor.forward=[0,0,1];

let board=createBoard(spec.day,session.seed);
let checkpoint=machine?structuredClone(board):null;
let qaView:'play'|'low'|'far'='play';
const recordKey=spec.saveId+(session.practice?'-practice':'-daily');
let records=new Save().data.life.records;
let best=records[recordKey+'-score']??0;
let run=0;
let pairedContact=false;
const historyKey=recordKey+'-round';
function rememberScore(){
 const save=new Save();records=save.data.life.records;
 if(!run){run=(records[historyKey]??0)+1;records[historyKey]=run;}
 if(run>records[historyKey]-10)records[historyKey+'-'+(run%10)]=board.score;
 best=Math.max(board.score,records[recordKey+'-score']??0);
 records[recordKey+'-score']=best;save.write();
}
function rankings(){
 const data=new Save().data.life.records,last=data[historyKey]??0;
 return Array.from({length:Math.min(10,last)},(_,i)=>({id:last-i,score:data[historyKey+'-'+((last-i)%10)]??0}))
   .sort((a,b)=>b.score-a.score||b.id-a.id);
}
let phase:'intro'|'play'|'resolving'|'lost'|'finale'='intro';
let selected=-1,time=0,finale=0,recallAt=0,shownProgress=0;
const ui=document.createElement('main');ui.id='match-lab';ui.dataset.theme=january?.theme??(coins?'euro':canal?'canal':'studio');
ui.innerHTML='<div class="ml-haze"></div><header class="ml-top"><div><p class="ml-kicker"></p><h1></h1></div><div class="ml-actions"><button data-rules aria-haspopup="dialog">规则</button><button data-mute aria-pressed="false"></button><button data-home>回到港口</button></div></header>'+
 '<aside class="ml-caption"><small></small><h2></h2><p></p></aside><article class="ml-console"><div class="ml-instrument"><span class="ml-status"></span><span class="ml-moves"></span></div>'+
 '<div class="ml-score" style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><strong></strong><span></span><button data-ranking>近十局</button></div><div class="ml-grid" role="group" aria-label="六色凝露棋盘"></div><div class="ml-meter"></div><p class="ml-message" role="status"></p><footer></footer></article>';
document.body.append(ui);if(machineDay)ui.dataset.machine=machineDay;
const $=<E extends HTMLElement=HTMLElement>(s:string)=>ui.querySelector(s) as E;
const grid=$('.ml-grid'),foot=$('footer');
const coinRail=coins?mountCoinRail(grid):null;
const exhibit=seasonExhibit(spec.id);
const fitDrawer=coins?connectDrawer(stage,$('.ml-console')):null;
const guide=document.createElement('dialog');guide.className='ml-guide';guide.setAttribute('aria-labelledby','ml-guide-title');
guide.innerHTML='<div class="ml-guide-head"><h2 id="ml-guide-title">凝露合成规则</h2><button type="button" data-close-guide aria-label="合上规则" autofocus>合上</button></div>'+
 '<p>交换上下或左右相邻的棋子，将三枚同色凝露排成一线即可消除。可拖一格，也可依次点两格。</p>'+
 '<dl class="ml-power-list">'+Object.entries(powers).map(([kind,p])=>'<dt><span data-mark="'+kind+'" aria-hidden="true">'+p.symbol+'</span>'+p.name+'</dt><dd>'+p.detail+'</dd>').join('')+'</dl>'+
 '<p>掉落形成的四连按连线方向生成条纹。横纹、竖纹、爆芯随同色连线或被其他特效击中时激活。</p>'+
 '<h3>相邻特效可直接交换</h3><ul><li>两枚条纹划出十字。</li><li>条纹加爆芯，沿条纹方向扫过四行或四列。</li><li>两枚爆芯一起引爆 5×5 格。</li><li>虹彩加条纹，把对方颜色的凝露变成随机横纹或竖纹并触发；虹彩加爆芯则变成爆芯并触发。</li><li>两枚虹彩消除全盘凝露。</li></ul><p>点「提示一步」后，棋盘只标出建议交换的两格。</p>';
ui.append(guide);
if(january){
 const brief=document.createElement('p');
 brief.textContent='本关复玩挑战：'+january.marks.join('、')+'。通关时分别登记，正式与练习分开。';
 guide.append(brief);
}
$('[data-rules]').onclick=()=>{if(!guide.open)guide.showModal();};
guide.querySelector<HTMLButtonElement>('[data-close-guide]')!.onclick=()=>guide.close();
guide.onclick=e=>{if(e.target===guide){const box=guide.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)guide.close();}};
const ranking=document.createElement('dialog');ranking.className='ml-guide';ranking.setAttribute('aria-label','最近十局得分');ui.append(ranking);
function showRanking(){
 ranking.replaceChildren();
 const title=document.createElement('h2');title.textContent=(session.practice?'练习':'正式')+' · 最近十局';ranking.append(title);
 const list=document.createElement('ol');
 for(const row of rankings()){
   const item=document.createElement('li');item.textContent='第 '+row.id+' 局　'+row.score+' 分'+(row.id===run?'　· 本局':'');list.append(item);
 }
 if(!list.children.length)list.textContent='完成第一步交换后开始记分。';
 ranking.append(list);
 const close=document.createElement('button');close.textContent='合上';close.onclick=()=>ranking.close();ranking.append(close);ranking.showModal();
}
$('[data-ranking]').onclick=showRanking;
function button(label:string,attr:string,act:()=>void){
 const b=document.createElement('button');b.textContent=label;b.setAttribute(attr,'');b.onclick=act;foot.append(b);
}
$('.ml-kicker').textContent=(session.practice?'随机练习':'每日三消')+'　/　'+spec.year+' · '+Number(spec.day.slice(0,2))+' 月 '+Number(spec.day.slice(2))+' 日';
$('h1').textContent=spec.title;$('[data-home]').onclick=session.home;
$('.ml-caption small').textContent=machine?.name??january?.zone??(coins?'零 钱 柜 台':canal?'巴 拿 马 运 河':'一 号 演 播 室');
$('.ml-caption h2').textContent=machine?.stages[0]??january?.stages[0]??(coins?'准备找零':canal?'安康号待闸':'等待播出');
$('.ml-caption p').textContent=spec.fact;
for(let i=0;i<64;i++){
 const b=document.createElement('button');b.type='button';b.dataset.cell=String(i);
 b.innerHTML='<span class="ml-jelly"><i></i><b></b><span class="ml-power" aria-hidden="true"></span></span><em></em>';
 grid.append(b);
}
const cells=Array.from(grid.children) as HTMLButtonElement[];
const print=january?makeFinalPrint(january.theme,spec):null;
if(print)grid.append(print);
const motion=new MatchMotion(cells,grid,sound);
const mute=$<HTMLButtonElement>('[data-mute]');
function showMute(){mute.textContent=sound.muted?'音效关':'音效开';mute.setAttribute('aria-pressed',String(sound.muted));mute.setAttribute('aria-label',sound.muted?'开启三消声音':'静音三消声音');}
mute.onclick=()=>{sound.toggle();showMute();if(!sound.muted&&phase!=='intro'){sound.start(studio);sound.play('pick');}};
showMute();
function paint(values=board.cells,targets=board.targets,act=board.stage){
 const face=coinFaces[Math.min(2,act)],coin=values.indexOf(COIN);
 const column=coins&&coin>=0&&selected===coin&&!board.bonus?coin%8:-1;
 coinRail?.update(act,column);
 cells.forEach((b,i)=>{
   const value=values[i],el=elements[Math.max(0,colour(value))],kind=specialKind(value);
   const power=kind==='normal'?null:powers[kind];
   b.className='ml-cell';b.classList.toggle('hole',value===HOLE);b.classList.toggle('coin',value===COIN);
   b.classList.toggle('target',targets.includes(i));b.classList.toggle('selected',i===selected);b.classList.toggle('clone',!!power);
   b.classList.toggle('mechanism-latched',!!machine&&machineLocked({day:spec.day,stage:act,targets},i)&&targets.includes(i));
   b.dataset.special=kind;
   b.dataset.tone=String(colour(value));
   b.style.setProperty('--tone',el.color);b.style.setProperty('--rim',el.rim);
   b.classList.toggle('coin-path',column>=0&&i%8===column&&i>coin);
   b.classList.toggle('coin-landing',column>=0&&i===56+column);
   b.querySelector('b')!.textContent=value===COIN?face:kind==='rainbow'?'':el.icon;
   b.querySelector('.ml-power')!.textContent=power?.symbol??'';
   b.querySelector('em')!.textContent=targets.includes(i)?(machineDay?contactLabel(machineDay,act,i,board.branch):january?targetLabel(january,act,i):coins?face+'槽':canal?'水标':act>=2?'02':i%8<4?'01':'03'):'';
   b.classList.toggle('time-drop',board.bonus?.tile===i);
   b.disabled=phase!=='play'||value===HOLE;
   const piece=value===HOLE?'空洞':value===COIN?'欧元硬币':kind==='rainbow'?'虹彩':el.name+(power?' · '+power.name:'');
   b.setAttribute('aria-label',(Math.floor(i/8)+1)+' 行 '+(i%8+1)+' 列 '+piece+(board.bonus?.tile===i?' 沙漏，加两步':'')+(targets.includes(i)?' 目标 '+(machineDay?contactLabel(machineDay,act,i,board.branch):january?targetLabel(january,act,i):''):''));
 });
 $('.ml-moves').textContent='余 '+board.moves+' 步';
 if(print)print.hidden=phase!=='finale'||!!board.bonus;
 $('.ml-status').textContent=board.bonus?'加演冲分':(january?.zone??(coins?'送硬币入盘':canal?'开启三段船闸':'接通三屏'))+'　'+act+'/3';
 $('.ml-score strong').textContent='得分 '+board.score;
 $('.ml-score span').textContent=(session.practice?'练习':'正式')+'最佳 '+best+' · 通关 '+(records[recordKey+'-wins']??0)+' 次';
 const meter=$('.ml-meter');meter.replaceChildren();
 for(let i=0;i<3;i++){const s=document.createElement('span');s.classList.toggle('on',i<act);meter.append(s);}
}
function settle(){
 session.finish();
 const result=document.querySelector('.mode-keepsake article');
 if(!result||result.querySelector('.ml-final-score'))return;
 const line=document.createElement('p');line.className='ml-final-score';
 const place=rankings().findIndex(row=>row.id===run)+1;
 line.textContent='本局 '+board.score+' 分'+(place?' · 最近十局第 '+place+' 名':'');
 if(january)line.textContent+='　'+january.marks.map((name,i)=>(records[recordKey+'-mark-'+i]?'✓ ':'○ ')+name).join('　');
 if(coins)line.textContent+='　'+(board.shuffles===0?'✓ 零重排':'重排 '+board.shuffles+' 次');
 result.querySelector('footer')?.before(line);
}
function controls(){
 foot.replaceChildren();
 if(phase==='intro')button('开始'+(january?.action??(coins?'分币':canal?'开闸':'接线')),'data-match-start',()=>{
   if(!actor.ready){message('史莱姆正在凝聚，稍候即可开始。');return;}
   sound.start(studio);phase='play';if(machine)ui.classList.add('machine-playing');actor.mode='play';session.start();if(coins)ui.classList.add('drawer-open');
   message(coins?drawerHints[0]:rules);paint();controls();
 });
 if(phase==='intro')button(session.practice?'换个练习棋盘':'随机练习','data-match-practice',()=>location.assign(session.practicePath()));
 if(phase==='intro')exhibit.preview(foot);
 if(phase==='play'){
   button('提示一步','data-match-hint',()=>{
     paint();const next=hint(board);
     if(next)for(const i of next)cells[i].classList.add('suggest');
   });
   if(board.bonus)button('结束冲分','data-match-bank',settle);
   if(!board.bonus&&board.moves>1)button('重排 · 1 步','data-match-shuffle',()=>{
     selected=-1;shuffle(board);paint();message('重排完成，已接通的目标保留。');
   });
 }
 if(phase==='lost')button(checkpoint?'从本段再试':'从头再试','data-match-retry',()=>{
   if(checkpoint){board=structuredClone(checkpoint);phase='play';selected=-1;shownProgress=board.stage/3;
     $('.ml-caption h2').textContent=captions[board.stage];paint();controls();message(rules);return;}
   run=0;pairedContact=false;board=createBoard(spec.day,session.seed);litScreens.fill(false);shownProgress=0;phase='play';selected=-1;$('.ml-caption h2').textContent=captions[0];paint();controls();message(rules);
 });
 if(phase==='finale'&&!board.bonus)button('继续冲分 · +3 步','data-match-encore',()=>{
   beginEncore(board,String(crypto.getRandomValues(new Uint32Array(1))[0]));phase='play';paint();controls();
   message('消除带沙漏的格子可得 2 步，每局最多出现两枚。');
 });
 if(phase==='finale')button('查看通关纪念品','data-match-keep',settle);
}
function message(s:string){$('.ml-message').textContent=s;}
async function sendKeepsake(i:number,step:number){
 const from=cells[i].getBoundingClientRect();
 const screen=step>=2?1:i%8<4?0:2;
 const end=objects?objects.destination(step).clone():displays[screen].picture.position.clone();
 end.project(stage.camera);
 const x=from.left+from.width/2,y=from.top+from.height/2;
 const slot=coinRail?.destination(step);
 const dx=slot?slot.left+slot.width/2-x:(end.x+1)*innerWidth/2-x;
 const dy=slot?slot.top+slot.height/2-y:(1-end.y)*innerHeight/2-y;
 const tile=document.createElement('span');tile.className='ml-delivery';
 tile.setAttribute('aria-hidden','true');tile.textContent=january?.symbol??(january?.theme==='titan'?'◈':january?'✦':coins?coinFaces[step]:canal?'≈':'');
 if(studio){
   const frame=document.createElement('img');frame.src=displays[screen].src;tile.append(frame);
 }
 const land=()=>{tile.remove();if(studio)litScreens[screen]=true;};
 tile.style.left=x+'px';tile.style.top=y+'px';ui.append(tile);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){land();return;}
 const flight=tile.animate([{transform:'translate(-50%,-50%) scale(.65)',opacity:0},
   {transform:'translate(-50%,-100%) scale(1.12)',opacity:1,offset:.23},
   {transform:'translate(calc(-50% + '+dx+'px),calc(-50% + '+dy+'px)) rotate('+(coins?'300':'0')+'deg) scale(.4)',opacity:0}],
   {duration:760,easing:'cubic-bezier(.28,.05,.25,1)',fill:'forwards'});
 await flight.finished;land();
}
function select(i:number){
 if(phase!=='play'||board.cells[i]===HOLE)return;
 if(selected===i){selected=-1;paint();return;}
 if(selected>=0&&Math.abs(i%8-selected%8)+Math.abs((i>>3)-(selected>>3))===1){
   void resolve(selected,i);return;
 }
 selected=i;sound.play('pick');const tone=colour(board.cells[i]);if(tone>=0)actor.setElement(tone);paint();
}
const delay=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
async function resolve(a:number,b:number,dragFraction=0){
 if(phase!=='play'||Math.abs(a%8-b%8)+Math.abs((a>>3)-(b>>3))!==1||board.cells[a]===HOLE||board.cells[b]===HOLE)return;
 const tone=Math.max(0,colour(board.cells[a])>=0?colour(board.cells[a]):colour(board.cells[b]));
 const previousMoves=board.moves,previousTile=board.bonus?.tile;
 const startStage=board.stage,targets=board.targets.slice(),result=swap(board,a,b,true);selected=-1;
 if(result)rememberScore();
 phase='resolving';foot.replaceChildren();
 await motion.exchange(a,b,!!result,dragFraction);await resumeAfterHelp();
 if(!result){phase='play';paint();controls();message(coins?'同色连成线、相邻特效组合，或将硬币左右换道，才能完成交换。':'普通棋须连成三枚同色。两枚相邻特效可直接交换，虹彩可交换选色。');return;}
 actor.setElement(tone);
 if(result.madeClone){actor.launch([1.4,0,1.35]);recallAt=time+1.3;}else{actor.jump();}
 // Show the material changing on each chain before revealing the next tableau.
 for(const [step,indices] of result.groups.entries()){
   paint(result.frames[step],targets,startStage);
   const cascade=result.cascades[step];
   if(step)message('连锁 × '+(step+1));
   await motion.clear(indices,cascade,step);await resumeAfterHelp();
   paint(cascade.after,targets,startStage);await motion.drop(cascade);await resumeAfterHelp();
 }
 if(board.bonus){
   phase=board.moves?'play':'finale';
   const rank=rankings().findIndex(row=>row.id===run)+1;
   message(!board.moves?'冲分结束 · '+board.score+' 分'+(rank?' · 最近十局第 '+rank+' 名':''):
     board.moves>previousMoves?'收集沙漏，增加 2 步！':board.bonus.tile>=0?'消除沙漏所在格，获得 2 步。':'继续连消冲分。');
   if(previousTile!==board.bonus.tile&&board.bonus.tile>=0)sound.play('objective');
   paint();controls();return;
 }
 const received=targets.filter(i=>result.advanced||!board.targets.includes(i));
 if(january&&targets.length===2&&result.advanced)pairedContact=true;
 if(received.length){
   const active=coins?received:received.filter(i=>result.groups.some(row=>row.includes(i)));
   // A bridge can involve two contacts, but both carry the same middle picture.
   if(studio&&startStage===2)active.splice(1);
   if(active.length)sound.play('objective');
   await Promise.all(active.map(i=>sendKeepsake(i,startStage)));
 }
 if(januaryScene&&january&&board.stage<3){
   const targets=machineDay?machineGoals(machineDay,board.stage,board.branch):january.tableaux[board.stage].targets;
   januaryScene.contacts?.(!board.targets.includes(targets[0]),targets[1]!==undefined&&!board.targets.includes(targets[1]));
   machineScene?.setThird(targets.length>2&&!board.targets.includes(targets[2]));
   shownProgress=(board.stage+1-board.targets.length/targets.length)/3;
 }else shownProgress=canal?(board.stage<1?0:board.stage===3?5:
   (board.stage===1?1:3)+2-board.targets.length)/5:board.stage/3;
 if(machineScene){machineScene.setBranch(board.branch??0);if(result.advanced&&board.stage<3){checkpoint=structuredClone(board);checkpoint.moves=Math.max(4,checkpoint.moves);}}
 if(board.stage===3&&canal&&objects){
   message('出口闸门打开，安康号正在驶离闸室。');
   while(!objects.passed())await new Promise<void>(r=>requestAnimationFrame(()=>r()));
 }
 if(board.stage===3&&displays.length)await delay(420);
 if(machine&&board.stage===3){shownProgress=1;await delay(matchMedia('(prefers-reduced-motion: reduce)').matches?200:1000);}
 await resumeAfterHelp();
 if(board.stage===3)await exhibit.run();
 await resumeAfterHelp();
 phase=board.stage===3?'finale':board.moves?'play':'lost';
 if(phase==='finale'){
   session.recordWin();
   const saved=new Save();records=saved.data.life.records;
   if(coins&&board.shuffles===0){records[recordKey+'-no-shuffle']=1;saved.write();}
   if(machineDay&&(newyearBranches.has(machineDay)||monthBranches.has(machineDay)||['1201','1205','1208','1212','1213','1216','1218','1220'].includes(machineDay))&&board.branch)records[recordKey+'-track-'+board.branch]=1;
   if(january){
     if(board.moves>=10)records[recordKey+'-mark-0']=1;
     if(pairedContact)records[recordKey+'-mark-1']=1;
     saved.write();
   }
   sound.finish();actor.keys.add('KeyX');actor.setMood('Happy',3);ui.classList.add('complete');
   $('.ml-caption h2').textContent=captions[3];$('.ml-caption p').textContent=spec.memory;
   message('已通关！可带剩余步数继续冲分，或查看通关纪念品。');
 }else if(phase==='lost')message('这一次的步数用完了。重新推演，棋盘开局相同。');
 else if(result.advanced){$('.ml-caption h2').textContent=captions[board.stage];message(coins?drawerHints[board.stage]:captions[board.stage]+'　·　'+rules);}
 else{
   const names=new Set<string>();
   for(const cascade of result.cascades)for(const tile of cascade.created){
     const kind=specialKind(tile.value);if(kind!=='normal')names.add(powers[kind].name);
   }
   const guidance=coins?drawerHints[board.stage]:rules;
   const lockedAgain=(machineDay==='1203'||machineDay==='1217'||machineDay==='1228')&&board.stage===1&&targets.length===1&&board.targets.length===2;
   message(lockedAgain&&machineDay==='1228'?'光斑滑过去了，再用连续两次交换把两面接上。':lockedAgain&&machineDay==='1217'?'晶条没有接上。重新点亮一层，下一步接通另一层。':lockedAgain?'脚锁已经回弹，平台重新找平。松一侧后，下一次交换就去另一侧。':result.reshuffled?'棋盘已自动重排。':names.size?'新凝成了'+[...names].join('、')+'。'+guidance:guidance);
 }
 paint();controls();
}
bindMatchPointer(grid,cells,()=>phase==='play',select,resolve);
message(rules+'　按住凝露，向相邻格拖动。');paint();controls();
const clock=new THREE.Clock();
function cellPosition(i:number){
 return '第 '+(1+Math.floor(i/8))+' 行第 '+(1+i%8)+' 列';
}
function currentBoardHint(){
 if(phase==='lost')return '步数已经用完。点重试，回到可重新推演的位置。';
 if(phase==='finale')return '三段均已完成，可以领取纪念品或用余步冲分。';
 if(coins)return drawerHints[Math.min(board.stage,2)];
 const heading=captions[Math.min(board.stage,2)];
 if(!machineDay||(!isYearendDay(machineDay)&&!isMonthendDay(machineDay)&&!isNewyearDay(machineDay)))return [heading,rules].join('　');
 const targets=board.targets.map(i=>{
   const name=contactLabel(machineDay,board.stage,i,board.branch);
   return name+'在'+cellPosition(i)+(machineLocked(board,i)?'（等待前一处）':'');
 });
 return [heading,targets.join('，')+'。',rules].join('　');
}
bindHelpHint(currentBoardHint,()=>{
 if(phase!=='play')return '';
 const pair=hint(board);if(!pair)return '';
 const text='从左上角数起。当前可交换 '+cellPosition(pair[0])+' 与 '+cellPosition(pair[1])+'。';
 if(!machineDay||(!isMonthendDay(machineDay)&&!isNewyearDay(machineDay)))return text;
 return {text,pair,cells:board.cells.map((value,i)=>{
   const element=elements[Math.max(0,colour(value))];
   const power=specialKind(value);
   const symbol=power==='normal'?element.icon:powers[power].symbol;
   return {symbol,color:power==='rainbow'?'#a787ad':element.rim,hole:value===HOLE,target:board.targets.includes(i)};
 })};
});
function frame(dt:number){
  if(readingHelp())return;
 dt=Math.min(.05,dt);time+=dt;actor.update(time,dt);
 if(recallAt&&time>=recallAt){actor.keys.add('KeyX');if(!actor.latest?.shots?.length){actor.keys.delete('KeyX');recallAt=0;}}
 if(phase==='finale'||(coins||machine&&spec.day<'1202'&&!Object.hasOwn(newyearMachines,spec.day))&&board.stage===3)finale+=dt;
 if(coins&&board.stage===3){
   const push=Math.min(1,finale*1.4);actor.position[0]=.1+.43*push;actor.position[2]=-1.08+.23*push;
   actor.spread=.24*Math.sin(push*Math.PI);actor.forward=[1,0,0];
 }
 const compact=innerWidth<760,aspect=innerWidth/innerHeight;
 const portraitTable=!!january&&compact&&aspect<1;
 stage.camera.fov=portraitTable?61:compact?48:36;stage.camera.aspect=aspect;
 const cropX=compact?0:Math.round(innerWidth*(canal?.29:.23));
 const cropY=compact?Math.round(innerHeight*(portraitTable?.24:.30)):0;
 stage.camera.setViewOffset(innerWidth,innerHeight,cropX,cropY,innerWidth,innerHeight);
 if(coins)stage.camera.position.set(compact?.8:1.05,compact?4.65:4.25,compact?6.4:5.5);
 else if(portraitTable)stage.camera.position.set(4.3,5.4,11.3);
 else stage.camera.position.set(canal?2.55:compact?4.5:4.1,canal?5.2:compact?4.8:3.8,compact||canal?9:7.4);
 if(machineDay&&qaView==='low')stage.camera.position.set(3.4,1.77,6.64);
 if(machineDay&&qaView==='far')stage.camera.position.set(4.8,5.84,9.72);
 stage.camera.lookAt(0,coins?1.62:.9,coins?-1.45:-.1);
 fitDrawer?.(finale);
 for(let i=0;i<displays.length;i++)displays[i].picture.visible=litScreens[i]&&finale===0;
 landmark?.update(time,shownProgress,finale,litScreens);objects?.update(performance.now()/1000,shownProgress,finale);stage.render(dt,actor);
}
stage.renderer.setAnimationLoop(()=>frame(clock.getDelta()));
(window as any).__slime=actor;
(window as any).__level={spec,get board(){return board;},get phase(){return phase;},get machine(){return machine;},setView(v:typeof qaView){qaView=v;},hint:()=>phase==='play'?hint(board):null,step:frame};

