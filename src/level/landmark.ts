import * as T from 'three';
import {levels} from '../../content/levels/registry';
import type {LandmarkPoint, LandmarkSpec} from '../../content/levels/types';
import {generateLandmark, validateLandmark, pointOnLeg, advanceClimb} from '../templates/landmark';
import {buildArecibo, areciboLook} from '../themes/arecibo-1974';
import {Stage} from './stage';
import {applyLevelQuality} from '../game/graphics';
import {Save} from '../game/save';
import {SlimeCharacter} from '../slime/character';
import {bakeRegion} from '../world/bake';
import {LevelUI} from '../ui/level-ui';
import {makeBoards, drawBoard, energize, undoContact, solved} from './pixel-board';

const id=new URLSearchParams(location.search).get('id')!;
const spec=levels[id] as LandmarkSpec, route=generateLandmark(spec), check=validateLandmark(route);
if(!check.ok) throw new Error(check.errors.join(' / '));
const stage=new Stage(areciboLook), save=new Save(), art=buildArecibo(stage,route,spec.seed);
const baked=bakeRegion(stage,{root:art.solids,x0:-32,z0:-12,w:40,h:41,ground:()=>null,classify:()=> 'filled'});
const boards=makeBoards(spec.board,spec.seed), climber={leg:0,t:0,launched:false};
type Phase='intro'|'route'|'board'|'armed'|'transmit'|'done';
let phase:Phase='intro', paused=false, time=0, elapsed=0, transmission=0, section=0, cursor=0, element=0;
let excursion=0, returning=false, bestMs=0, medal='', tape=false;
const point:LandmarkPoint=[...spec.spawn], keys=new Set<string>();
const ui=new LevelUI({start,resume,restart:()=>location.reload(),home:()=>location.href='./?from='+id},'11 月 16 日　/　1974');
const slime=new SlimeCharacter(stage,{input:false,ui:false,title:spec.title,trainingTargets:[],
  world:{boxes:[],surfaces:[],height:baked.height??undefined,bounds:{min:[-40,-16,-45],max:[40,34,45]}},
  spawn:[point[0],.6,point[2]],onToast:()=>{},onReady:()=>{if(phase==='intro')start();}}).attach();
applyLevelQuality(stage,slime,save.data.quality);
const css=document.createElement('style');
css.textContent=`
#game-ui .toast:empty{display:none}#game-ui .are-time{position:absolute;right:20px;top:74px;font:600 14px/1.5 var(--sans);background:#162f31e8;color:#fff2cc;padding:6px 12px;border-radius:4px}
#game-ui .intro{margin:0 auto 0 0;width:min(392px,91vw);padding:25px 28px;background:#faf3ddf5;border-color:#334b47;border-radius:5px;box-shadow:5px 6px 0 #34483f55}
#game-ui .overlay:has(.intro){align-items:flex-end;justify-content:flex-start;padding:clamp(14px,4vw,54px);background:linear-gradient(90deg,#16393433,transparent 65%);backdrop-filter:none}
#game-ui .intro h2{font-size:clamp(25px,3vw,38px);line-height:1.12}#game-ui .intro ol{font-size:13px}
#game-ui .intro .kicker,#game-ui .quest .kicker{color:#30716b;letter-spacing:.12em}#game-ui .quest{max-width:min(390px,78vw);border-radius:5px}
#game-ui .are-actions{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:8px;max-width:96vw;white-space:nowrap}
#game-ui .are-actions button,#game-ui .console button{border:1px solid #71968c;color:#ecf6df;background:#214d4b;padding:9px 14px;border-radius:4px;touch-action:none;font-weight:700}
#game-ui .console{pointer-events:auto;position:absolute;right:clamp(8px,4vw,56px);top:50%;transform:translateY(-50%);padding:14px clamp(12px,2vw,26px);width:min(410px,47vw);background:#102a2bf5;border:2px solid #a3b8a5;box-shadow:4px 6px 0 #18312b80;border-radius:8px;color:#edf2d8;text-align:center}
#game-ui .console h3{font-size:20px;margin:0 0 7px}#game-ui .console p{font-size:13px;line-height:1.45;margin:7px 0}
#game-ui .console canvas{display:block;margin:8px auto;width:auto;height:auto;max-width:100%;max-height:52vh;image-rendering:pixelated;cursor:crosshair;touch-action:none}
#game-ui .console footer{display:flex;gap:7px;justify-content:center;flex-wrap:wrap}#game-ui .console button{font-size:13px;padding:6px 10px}
@media(max-width:680px){#game-ui .console{width:94vw;max-width:392px;right:50%;transform:translate(50%,-50%);top:55%}#game-ui .console canvas{max-height:39vh}#game-ui .quest{padding:8px 12px}#game-ui .quest .side{display:none}}
@media(max-height:520px){#game-ui .console{top:50%;padding:5px 12px}#game-ui .console canvas{max-height:40vh}#game-ui .console p{margin:3px}}
`;document.head.appendChild(css);
const hud=ui.root.querySelector('.hud')!;
const timerLabel=document.createElement('div');timerLabel.className='are-time';hud.appendChild(timerLabel);
const actions=document.createElement('div');actions.className='are-actions';hud.appendChild(actions);
const consolePanel=document.createElement('section');consolePanel.className='console hidden';hud.appendChild(consolePanel);
consolePanel.innerHTML='<h3></h3><canvas aria-label="像素检修面板"></canvas><p></p><footer><button data-power>4 · 雷属性</button><button data-undo>Z · 撤销</button><button data-next>接入下一段</button></footer>';
const canvas=consolePanel.querySelector('canvas')!, next=consolePanel.querySelector<HTMLButtonElement>('[data-next]')!;
const power=consolePanel.querySelector<HTMLButtonElement>('[data-power]')!;
const screen=document.createElement('canvas');screen.width=23;screen.height=73;
const screenCtx=screen.getContext('2d')!, texture=new T.CanvasTexture(screen);
texture.magFilter=T.NearestFilter;texture.minFilter=T.NearestFilter;texture.colorSpace=T.SRGBColorSpace;
const display=new T.Mesh(new T.PlaneGeometry(1.75,4.5),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}));
display.position.set(.45,18.3,-7.65);art.root.add(display);
const frame=new T.Mesh(new T.BoxGeometry(1.93,4.7,.16),stage.toon('#394d4c'));frame.position.copy(display.position);frame.position.z-=.12;art.root.add(frame);
function redrawScreen(){let y=0;for(const b of boards){for(let i=0;i<b.bits.length;i++){
  screenCtx.fillStyle=b.wrong.has(i)?'#fc6e56':b.bits[i]==='1'&&(!b.missing.has(i)||b.repaired.has(i))?b.color:'#142e30';
  screenCtx.fillRect(i%b.width,y+Math.floor(i/b.width),1,1);}y+=b.height;}texture.needsUpdate=true;}
redrawScreen();
function intro(){
  const best=save.data.life.records[id+'-climb-ms'];
  const hints=['沿检修塔攀爬，蹬墙起跳，再摊开滑过主缆。','接通五段像素画，在控制台亲手发射。'];
  if(best)hints.push('个人攀爬纪录 '+(best/1000).toFixed(1)+' 秒'+(save.data.life.records[id+'-clean']?' · 已达成一次画对':' · 可挑战一次画对'));
  ui.intro(spec.title,spec.intro,hints,slime.ready);
}
function start(){if(phase!=='intro'||!slime.ready)return;phase='route';ui.panel(null);ui.showHud(true);refresh();}
function resume(){if(phase==='done'){location.reload();return;}paused=false;ui.panel(null);ui.showHud(true);refresh();}
function pause(){if(paused||!['route','board','armed'].includes(phase))return;paused=true;keys.clear();ui.showHud(false);ui.panelPause();}
ui.root.addEventListener('click',e=>{if((e.target as HTMLElement).closest('[data-act="pause"]'))pause();},true);
function setElement(i:number){element=i;slime.setElement(i);if(phase==='board')refresh();}
function contact(index:number){if(phase!=='board'||paused)return;const board=boards[section];cursor=index;
  energize(board,index,element===3);redrawScreen();refresh();}
function undo(){if(phase!=='board'||paused)return;undoContact(boards[section]);redrawScreen();refresh();}
function nextSection(){
  if(phase!=='board'||paused||!solved(boards[section]))return;
  if(++section===boards.length){phase='armed';consolePanel.classList.add('hidden');}
  else cursor=0;
  refresh();
}
canvas.onpointerdown=e=>{const board=boards[section],box=canvas.getBoundingClientRect();
  const x=Math.min(board.width-1,Math.floor((e.clientX-box.left)/box.width*board.width));
  const y=Math.min(board.height-1,Math.floor((e.clientY-box.top)/box.height*board.height));
  contact(x+y*board.width);};
power.onclick=()=>setElement(element===3?0:3);next.onclick=nextSection;
consolePanel.querySelector<HTMLButtonElement>('[data-undo]')!.onclick=undo;
function button(label:string,key:string,hold=false){
  const btn=document.createElement('button');btn.textContent=label;actions.appendChild(btn);
  if(hold){btn.onpointerdown=e=>{btn.setPointerCapture(e.pointerId);keys.add(key);};btn.onlostpointercapture=()=>keys.delete(key);}
  else btn.onclick=()=>press(key);
}
function refresh(){
  actions.replaceChildren();let title='',branch='',side='',index=0;
  timerLabel.hidden=phase!=='route';
  consolePanel.classList.toggle('hidden',phase!=='board');
  if(phase==='route'){
    const leg=route[climber.leg];title='登上接收平台';branch=leg.prompt;index=climber.leg;
    const label={walk:'W / ↑　向前走',climb:'W / ↑　贴墙攀爬',jump:'空格　蹬墙跳',slide:'C　摊开滑行'}[leg.action];
    if(leg.action==='slide'&&!tape){side='塔冠西侧有一截散落的打印纸带';button('A　探查塔冠','KeyA');}
    button(label,leg.action==='jump'?'Space':leg.action==='slide'?'KeyC':'KeyW',['walk','climb'].includes(leg.action));
  }else if(phase==='board'){
    const b=boards[section];title='修复发往 M13 的信息';branch='接收平台 · 信号段 '+(section+1)+' / '+boards.length;index=section;
    consolePanel.querySelector('h3')!.textContent=b.name+'　'+b.repaired.size+' / '+b.missing.size;
    consolePanel.querySelector('p')!.textContent=b.wrong.size?'红格是误触，按 Z 撤销。':
      solved(b)?'本段校验通过。':element===3?'点击空心十字跳过去通电；方向键逐格走。':'按 4 切换雷属性，再点亮带十字的空心格。';
    power.textContent=element===3?'雷属性已接通':'4 · 雷属性';next.hidden=!solved(b);
    next.textContent=section===boards.length-1?'接通发射台':'接入下一段';drawBoard(canvas,b,cursor,element===3);
  }else if(phase==='armed'){title='向星团 M13 发射';branch='五段信息已就绪。按 F 按下发射钮。';index=5;button('F　发射信息','KeyF');}
  if(title)ui.quest({title,branch,count:0,total:1,complete:false,index,branches:6,side:side?{title:side,done:tape}:undefined});
}
function launch(){if(phase!=='armed'||paused)return;phase='transmit';transmission=0;ui.showHud(false);ui.banner('阿雷西博　/　1974','信号离开天线');}
function finish(){
  phase='done';const records=save.data.life.records;
  records[id+'-climb-ms']=Math.min(records[id+'-climb-ms']||Infinity,bestMs);
  const flawless=boards.every(b=>b.mistakes===0);
  if(flawless)records[id+'-clean']=1;
  save.add('completed',id);save.write();
  ui.complete(spec.title,spec.outro+'　攀爬 '+(bestMs/1000).toFixed(1)+' 秒 · '+medal+'。'+(flawless?'五段一次画对。':''),spec.souvenir,save.data.souvenirs.includes(id));
  const replay=ui.root.querySelector<HTMLButtonElement>('.complete [data-act="resume"]');
  if(replay)replay.textContent='重玩 · 寻找塔顶纸带';
  else {const b=document.createElement('button');b.className='btn';b.textContent='再玩一次';b.onclick=()=>location.reload();ui.root.querySelector('.complete .stack')?.appendChild(b);}
}
function press(code:string){
  if(code==='Escape'){if(paused)resume();else pause();return;}
  if(paused)return;
  if(phase==='intro'&&code==='Enter'){start();return;}
  if(phase==='route'){
    const leg=route[climber.leg];
    if(code==='KeyA'&&leg.action==='slide'&&!tape&&!climber.launched&&!excursion){excursion=.001;returning=false;}
    if(excursion>0)return;
    if((code==='Space'&&leg.action==='jump')||(code==='KeyC'&&leg.action==='slide'))climber.launched=true;
  }else if(phase==='board'){
    if(code==='Digit4'){setElement(3);return;}if(code==='Digit1'){setElement(0);return;}
    if(code==='KeyZ'){undo();return;}if(code==='Enter'){nextSection();return;}
    const b=boards[section],x=cursor%b.width,y=Math.floor(cursor/b.width);
    const dx=Number(code==='ArrowRight'||code==='KeyD')-Number(code==='ArrowLeft'||code==='KeyA');
    const dy=Number(code==='ArrowDown'||code==='KeyS')-Number(code==='ArrowUp'||code==='KeyW');
    if(dx||dy){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<b.width&&ny>=0&&ny<b.height)contact(ny*b.width+nx);}
    else if(code==='Space')contact(cursor);
  }else if(phase==='armed'&&code==='KeyF')launch();
}
addEventListener('keydown',e=>{
  if(e.code==='Tab'||e.ctrlKey||e.metaKey||e.altKey)return;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(e.code))e.preventDefault();
  keys.add(e.code);if(!e.repeat||phase==='board'&&e.code.startsWith('Arrow'))press(e.code);
});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();pause();});
function climb(dt:number){
  const old=climber.leg,leg=route[old];elapsed+=dt;
  if(excursion>0){
    excursion+=dt*(returning?-1:1);
    if(excursion>=1){excursion=1;returning=true;tape=true;art.reel.visible=false;save.add('souvenirs',id);ui.toast('拾到塔顶的打印纸带');refresh();}
    excursion=Math.max(0,excursion);point[0]=leg.start[0]-3.6*excursion;point[1]=leg.start[1];point[2]=leg.start[2];return;
  }
  const move=(keys.has('KeyW')||keys.has('ArrowUp'))&&(leg.action==='walk'||leg.action==='climb')?leg.action:null;
  advanceClimb(climber,route,move,dt);
  pointOnLeg(leg,old===climber.leg?climber.t:1,point);
  if(old!==climber.leg){
    if(climber.leg===route.length){bestMs=Math.round(elapsed*1000);medal=elapsed<=spec.medals.gold?'金牌':elapsed<=spec.medals.silver?'银牌':'铜牌';phase='board';ui.toast('抵达接收平台 · '+medal);}
    refresh();
  }
}
const target=new T.Vector3(),eye=new T.Vector3(),look=new T.Vector3(0,5,-6);
stage.camera.position.set(7,32,56);stage.camera.lookAt(look);
function step(delta:number){
  const dt=Math.min(Math.max(delta,0),.09);time+=dt;
  if(!paused&&phase==='route')climb(dt);
  if(phase==='route'){const seconds=Math.floor(elapsed);if(timerLabel.dataset.seconds!==String(seconds)){
    timerLabel.dataset.seconds=String(seconds);timerLabel.textContent='攀爬 '+seconds+' 秒　·　金牌 '+spec.medals.gold+' 秒';}}
  if(phase==='transmit'){transmission+=dt;if(transmission-dt<3.8&&transmission>=3.8)ui.banner('信号目的地　/　M13','约 25,000 年后到达 M13');if(transmission>=9.5)finish();}
  slime.position[0]=point[0];slime.position[1]=point[1]+.64;slime.position[2]=point[2];
  const leg=route[climber.leg];slime.spread=leg?.action==='slide'&&climber.launched?.95:0;
  slime.update(time,dt);
  if(phase==='intro'){eye.set(7,32,56);target.set(0,5,-6);}
  else if(phase==='route'){
    eye.set(point[0]+9,point[1]+5.5,point[2]+10);
    target.set(point[0]+1.2,point[1]+2,point[2]-2);
    if(leg?.action==='slide'){eye.set(point[0]+9,point[1]+8,point[2]+12);target.set(point[0],point[1]-.8,point[2]-3);}
  }else if(phase==='board'||phase==='armed'){eye.set(6.8,19.5,2);target.set(1,17,-7);}
  else if(transmission<3.8){eye.set(23,17+transmission*9,32);target.set(0,8+transmission*6,-6);}
  else {const t=Math.min(transmission-3.8,6);eye.set(1+t*.35,72+t*.5,13+t*2.4);target.set(0,71,-6);}
  const k=1-Math.exp(-dt*(phase==='transmit'?4:3));
  stage.camera.position.lerp(eye,k);look.lerp(target,k);stage.camera.lookAt(look);
  art.update(time,dt,point,phase==='transmit'||phase==='done'?transmission:-1);
  stage.render(dt,phase==='intro'||phase==='route'||phase==='board'||phase==='armed'?slime:undefined);
}
const clock=new T.Clock();stage.renderer.setAnimationLoop(()=>step(clock.getDelta()));
(window as any).__level={spec,stage,step,check,climber,boards,get phase(){return phase;},get section(){return section;}};
