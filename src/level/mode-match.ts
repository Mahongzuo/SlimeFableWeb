import * as THREE from 'three';
import './mode-match.css';
import {session} from './mode-session';
import {Stage} from './stage';
import {applyLevelQuality} from '../game/graphics';
import {Save} from '../game/save';
import {SlimeCharacter} from '../slime/character';
import {elements} from '../slime/elements';
import {createBoard,swap,hint,shuffle,colour,specialKind,HOLE,COIN} from '../templates/mode-match';
import {MatchMotion,MatchSound,powers} from './match-effects';
import {bindMatchPointer} from './match-pointer';
import {buildMatchObjects} from '../themes/match-objects';
import {buildModeLandmark} from '../themes/mode-landmarks';

// The studio, currency counter and canal lock controls are fictional.
const {spec}=session;
const coins=spec.day==='0101',canal=spec.day==='0815';
const rules=coins?'左右挪动欧元硬币，消除它下方的凝露，让硬币掉进描金的零钱盘。':
 canal?'消除黄铜水标上的凝露，转开人字闸门，让安康号驶过三段航道。':
 '消除金边接点，把两侧的画面送进对应监视器。最后横向接通 02 号中屏。';
const captions=coins?['第一格零钱盘','为第二枚硬币换道','补齐最后一格','欧元柜台开张']:
 canal?['上游水标','平衡闸室水位','开启出口闸门','安康号通过运河']:['左右信号','另一侧信号','接通横带','首播信号已送出'];
const stage=new Stage({skyTop:coins?'#758f8c':canal?'#7b9292':'#24394b',skyHorizon:coins?'#e0d1ab':canal?'#cfdbc7':'#899c9e',
 fog:[28,85],sun:'#ffe1b4',sunIntensity:2.2,hemiSky:'#fff3cf',hemiGround:'#676f6c',ink:'#344144',wash:'#b7b4a1'});
const studio=spec.day==='1123';
const landmark=studio?buildModeLandmark(stage,spec.day,[0,0,-1.5]):null;
const objects=studio?null:buildMatchObjects(stage,spec.day);
const sound=new MatchSound();
// Original monochrome stage art for the three fictional signal fragments.
const displays=coins||canal?[]:[0,1,2].map(n=>{
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
const base=new THREE.Mesh(new THREE.CylinderGeometry(4.1,4.4,.48,48),stage.toon(coins?'#ad9980':canal?'#aebba6':'#58716f'));
base.position.y=-.25;stage.add(base);
const ring=new THREE.Mesh(new THREE.TorusGeometry(3.92,.024,6,96),stage.toon('#dcbf86'));
ring.rotation.x=Math.PI/2;ring.position.y=.01;stage.add(ring);
const actor=new SlimeCharacter(stage,{world:{boxes:[],surfaces:[{min:[-8,-8],max:[8,8],height:0}]},spawn:[0,0,1.3],input:false,ui:false,trainingTargets:[]}).attach();
applyLevelQuality(stage,actor,new Save().data.quality);
actor.forward=[0,0,1];

let board=createBoard(spec.day,session.seed);
let phase:'intro'|'play'|'resolving'|'lost'|'finale'='intro';
let selected=-1,time=0,finale=0,recallAt=0,shownProgress=0;
const ui=document.createElement('main');ui.id='match-lab';ui.dataset.theme=coins?'euro':canal?'canal':'studio';
ui.innerHTML='<div class="ml-haze"></div><header class="ml-top"><div><p class="ml-kicker"></p><h1></h1></div><div class="ml-actions"><button data-rules aria-haspopup="dialog">规则</button><button data-mute aria-pressed="false"></button><button data-home>回到港口</button></div></header>'+
 '<aside class="ml-caption"><small></small><h2></h2><p></p></aside><article class="ml-console"><div class="ml-instrument"><span class="ml-status"></span><span class="ml-moves"></span></div>'+
 '<div class="ml-grid" role="group" aria-label="六色凝露棋盘"></div><div class="ml-meter"></div><p class="ml-message" role="status"></p><footer></footer></article>';
document.body.append(ui);
const $=<E extends HTMLElement=HTMLElement>(s:string)=>ui.querySelector(s) as E;
const grid=$('.ml-grid'),foot=$('footer');
const guide=document.createElement('dialog');guide.className='ml-guide';guide.setAttribute('aria-labelledby','ml-guide-title');
guide.innerHTML='<div class="ml-guide-head"><h2 id="ml-guide-title">凝露合成规则</h2><button type="button" data-close-guide aria-label="合上规则" autofocus>合上</button></div>'+
 '<p>交换上下或左右相邻的棋子，将三枚同色凝露排成一线即可消除。可拖一格，也可依次点两格。</p>'+
 '<dl class="ml-power-list">'+Object.entries(powers).map(([kind,p])=>'<dt><span data-mark="'+kind+'" aria-hidden="true">'+p.symbol+'</span>'+p.name+'</dt><dd>'+p.detail+'</dd>').join('')+'</dl>'+
 '<p>掉落形成的四连按连线方向生成条纹。横纹、竖纹、爆芯随同色连线或被其他特效击中时激活。</p>'+
 '<h3>相邻特效可直接交换</h3><ul><li>两枚条纹划出十字。</li><li>条纹加爆芯，沿条纹方向扫过四行或四列。</li><li>两枚爆芯一起引爆 5×5 格。</li><li>虹彩加条纹，把对方颜色的凝露变成随机横纹或竖纹并触发；虹彩加爆芯则变成爆芯并触发。</li><li>两枚虹彩消除全盘凝露。</li></ul><p>点「提示一步」后，棋盘只标出建议交换的两格。</p>';
ui.append(guide);
$('[data-rules]').onclick=()=>{if(!guide.open)guide.showModal();};
guide.querySelector<HTMLButtonElement>('[data-close-guide]')!.onclick=()=>guide.close();
guide.onclick=e=>{if(e.target===guide){const box=guide.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)guide.close();}};
function button(label:string,attr:string,act:()=>void){
 const b=document.createElement('button');b.textContent=label;b.setAttribute(attr,'');b.onclick=act;foot.append(b);
}
$('.ml-kicker').textContent=(session.practice?'随机练习':'每日三消')+'　/　'+spec.year+' · '+Number(spec.day.slice(0,2))+' 月 '+Number(spec.day.slice(2))+' 日';
$('h1').textContent=spec.title;$('[data-home]').onclick=session.home;
$('.ml-caption small').textContent=coins?'零 钱 柜 台':canal?'巴 拿 马 运 河':'一 号 演 播 室';
$('.ml-caption h2').textContent=coins?'准备找零':canal?'安康号待闸':'等待播出';
$('.ml-caption p').textContent=spec.fact;
for(let i=0;i<64;i++){
 const b=document.createElement('button');b.type='button';b.dataset.cell=String(i);
 b.innerHTML='<span class="ml-jelly"><i></i><b></b><span class="ml-power" aria-hidden="true"></span></span><em></em>';
 grid.append(b);
}
const cells=Array.from(grid.children) as HTMLButtonElement[];
const motion=new MatchMotion(cells,grid,sound);
const mute=$<HTMLButtonElement>('[data-mute]');
function showMute(){mute.textContent=sound.muted?'音效关':'音效开';mute.setAttribute('aria-pressed',String(sound.muted));mute.setAttribute('aria-label',sound.muted?'开启三消声音':'静音三消声音');}
mute.onclick=()=>{sound.toggle();showMute();if(!sound.muted&&phase!=='intro'){sound.start(studio);sound.play('pick');}};
showMute();
function paint(values=board.cells,targets=board.targets,act=board.stage){
 cells.forEach((b,i)=>{
   const value=values[i],el=elements[Math.max(0,colour(value))],kind=specialKind(value);
   const power=kind==='normal'?null:powers[kind];
   b.className='ml-cell';b.classList.toggle('hole',value===HOLE);b.classList.toggle('coin',value===COIN);
   b.classList.toggle('target',targets.includes(i));b.classList.toggle('selected',i===selected);b.classList.toggle('clone',!!power);
   b.dataset.special=kind;
   b.dataset.tone=String(colour(value));
   b.style.setProperty('--tone',el.color);b.style.setProperty('--rim',el.rim);
   b.querySelector('b')!.textContent=value===COIN?'€':kind==='rainbow'?'':el.icon;
   b.querySelector('.ml-power')!.textContent=power?.symbol??'';
   b.querySelector('em')!.textContent=targets.includes(i)?(coins?'币盘':canal?'水标':act>=2?'02':i%8<4?'01':'03'):'';
   b.disabled=phase!=='play'||value===HOLE;
   const piece=value===HOLE?'空洞':value===COIN?'欧元硬币':kind==='rainbow'?'虹彩':el.name+(power?' · '+power.name:'');
   b.setAttribute('aria-label',(Math.floor(i/8)+1)+' 行 '+(i%8+1)+' 列 '+piece+(targets.includes(i)?' 目标':''));
 });
 $('.ml-moves').textContent='余 '+board.moves+' 步';
 $('.ml-status').textContent=captions[act];
 const meter=$('.ml-meter');meter.replaceChildren();
 for(let i=0;i<3;i++){const s=document.createElement('span');s.classList.toggle('on',i<act);meter.append(s);}
}
function controls(){
 foot.replaceChildren();
 if(phase==='intro')button('开始'+(coins?'分币':canal?'开闸':'接线'),'data-match-start',()=>{
   if(!actor.ready){message('史莱姆正在凝聚，稍候即可开始。');return;}
   sound.start(studio);phase='play';actor.mode='play';session.start();message(rules);paint();controls();
 });
 if(phase==='intro')button(session.practice?'换个练习棋盘':'随机练习','data-match-practice',()=>location.assign(session.practicePath()));
 if(phase==='play'){
   button('提示一步','data-match-hint',()=>{
     paint();const next=hint(board);
     if(next)for(const i of next)cells[i].classList.add('suggest');
   });
   if(board.moves>1)button('重排 · 1 步','data-match-shuffle',()=>{
     selected=-1;shuffle(board);paint();message('重排完成，已接通的目标保留。');
   });
 }
 if(phase==='lost')button('从头再试','data-match-retry',()=>{
   board=createBoard(spec.day,session.seed);litScreens.fill(false);shownProgress=0;phase='play';selected=-1;paint();controls();message(rules);
 });
 if(phase==='finale')button('收进史书','data-match-keep',()=>session.finish());
}
function message(s:string){$('.ml-message').textContent=s;}
async function sendKeepsake(i:number,step:number){
 const from=cells[i].getBoundingClientRect();
 const screen=step>=2?1:i%8<4?0:2;
 const end=objects?objects.destination(step).clone():displays[screen].picture.position.clone();
 end.project(stage.camera);
 const x=from.left+from.width/2,y=from.top+from.height/2;
 const dx=(end.x+1)*innerWidth/2-x,dy=(1-end.y)*innerHeight/2-y;
 const tile=document.createElement('span');tile.className='ml-delivery';
 tile.setAttribute('aria-hidden','true');tile.textContent=coins?'€':canal?'≈':'';
 if(!coins&&!canal){
   const frame=document.createElement('img');frame.src=displays[screen].src;tile.append(frame);
 }
 const land=()=>{tile.remove();if(!coins&&!canal)litScreens[screen]=true;};
 tile.style.left=x+'px';tile.style.top=y+'px';ui.append(tile);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){land();return;}
 const flight=tile.animate([{transform:'translate(-50%,-50%) scale(.65)',opacity:0},
   {transform:'translate(-50%,-100%) scale(1.12)',opacity:1,offset:.23},
   {transform:'translate(calc(-50% + '+dx+'px),calc(-50% + '+dy+'px)) scale(.4)',opacity:0}],
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
 const startStage=board.stage,targets=board.targets.slice(),result=swap(board,a,b,true);selected=-1;
 phase='resolving';foot.replaceChildren();
 await motion.exchange(a,b,!!result,dragFraction);
 if(!result){phase='play';paint();controls();message(coins?'同色连成线、相邻特效组合，或将硬币左右换道，才能完成交换。':'普通棋须连成三枚同色。两枚相邻特效可直接交换，虹彩可交换选色。');return;}
 actor.setElement(tone);
 if(result.madeClone){actor.launch([1.4,0,1.35]);recallAt=time+1.3;}else{actor.jump();}
 // Show the material changing on each chain before revealing the next tableau.
 for(const [step,indices] of result.groups.entries()){
   paint(result.frames[step],targets,startStage);
   const cascade=result.cascades[step];
   if(step)message('连锁 × '+(step+1));
   await motion.clear(indices,cascade,step);
   paint(cascade.after,targets,startStage);await motion.drop(cascade);
 }
 const received=targets.filter(i=>result.advanced||!board.targets.includes(i));
 if(received.length){
   const active=coins?received:received.filter(i=>result.groups.some(row=>row.includes(i)));
   // A bridge can involve two contacts, but both carry the same middle picture.
   if(!coins&&!canal&&startStage===2)active.splice(1);
   if(active.length)sound.play('objective');
   await Promise.all(active.map(i=>sendKeepsake(i,startStage)));
 }
 shownProgress=canal?(board.stage<1?0:board.stage===3?5:
   (board.stage===1?1:3)+2-board.targets.length)/5:board.stage/3;
 if(board.stage===3&&canal&&objects){
   message('出口闸门打开，安康号正在驶离闸室。');
   while(!objects.passed())await new Promise<void>(r=>requestAnimationFrame(()=>r()));
 }
 if(board.stage===3&&displays.length)await delay(420);
 phase=board.stage===3?'finale':board.moves?'play':'lost';
 if(phase==='finale'){
   sound.finish();actor.keys.add('KeyX');actor.setMood('Happy',3);ui.classList.add('complete');
   $('.ml-caption h2').textContent=captions[3];$('.ml-caption p').textContent=spec.memory;
   message(spec.fact);
 }else if(phase==='lost')message('这一次的步数用完了。重新推演，棋盘开局相同。');
 else if(result.advanced){$('.ml-caption h2').textContent=captions[board.stage];message(captions[board.stage]+'　·　'+rules);}
 else{
   const names=new Set<string>();
   for(const cascade of result.cascades)for(const tile of cascade.created){
     const kind=specialKind(tile.value);if(kind!=='normal')names.add(powers[kind].name);
   }
   message(result.reshuffled?'棋盘已自动重排。':names.size?'新凝成了'+[...names].join('、')+'。'+rules:rules);
 }
 paint();controls();
}
bindMatchPointer(grid,cells,()=>phase==='play',select,resolve);
message(rules+'　按住凝露，向相邻格拖动。');paint();controls();
const clock=new THREE.Clock();
function frame(dt:number){
 dt=Math.min(.05,dt);time+=dt;actor.update(time,dt);
 if(recallAt&&time>=recallAt){actor.keys.add('KeyX');if(!actor.latest?.shots?.length){actor.keys.delete('KeyX');recallAt=0;}}
 if(phase==='finale')finale+=dt;
 const compact=innerWidth<760,aspect=innerWidth/innerHeight;
 stage.camera.fov=compact?48:36;stage.camera.aspect=aspect;
 const cropX=compact?0:Math.round(innerWidth*(canal?.29:.23));
 const cropY=compact?Math.round(innerHeight*.30):0;
 stage.camera.setViewOffset(innerWidth,innerHeight,cropX,cropY,innerWidth,innerHeight);
 stage.camera.position.set(canal?2.55:compact?4.5:4.1,canal?5.2:compact?4.8:3.8,compact||canal?9:7.4);stage.camera.lookAt(0,.9,-.1);
 for(let i=0;i<displays.length;i++)displays[i].picture.visible=litScreens[i]&&finale===0;
 landmark?.update(time,shownProgress,finale,litScreens);objects?.update(performance.now()/1000,shownProgress,finale);stage.render(dt,actor);
}
stage.renderer.setAnimationLoop(()=>frame(clock.getDelta()));
(window as any).__slime=actor;
(window as any).__level={spec,get board(){return board;},get phase(){return phase;},hint:()=>phase==='play'?hint(board):null,step:frame};

