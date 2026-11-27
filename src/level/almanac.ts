import './almanac.css';
import {seasonExhibit} from './season-entry';
import {drawInstrument} from './almanac-instrument';
import * as T from 'three';
import {levels} from '../../content/levels/registry';
import {days} from '../../content/registry';
import type {AlmanacSpec} from '../../content/levels/types';
import {Save} from '../game/save';
import {applyLevelQuality} from '../game/graphics';
import {SlimeCharacter} from '../slime/character';
import {course,activityHint,aligned,logicResult,timedWindow, type Place} from '../templates/almanac';
import {buildTheatre} from '../themes/almanac';
import {rng} from '../templates/random';

const id=new URLSearchParams(location.search).get('id')!, spec=levels[id] as AlmanacSpec;
const [day,year]=id.split('-'), save=new Save(), stops=course(id), random=rng(id);
const exhibit=seasonExhibit(id);
document.title=spec.title+' · 史莱姆寓言';
document.body.innerHTML='<canvas id="map"></canvas><main class="hud"><header><div><small></small><h1></h1></div><div><select class="select" aria-label="切换十一月章节"></select> <button data-pause>暂停</button></div></header><section class="card"><small></small><h2></h2><p></p><div class="readout"></div><div class="meter" hidden><i class="band"></i><i class="needle"></i></div><div class="actions"></div></section></main><div class="map-label" hidden></div><div class="jump" hidden></div><div class="badge" hidden></div>';
const find=<E extends HTMLElement=HTMLElement>(s:string)=>document.querySelector(s) as E;
const canvas=find<HTMLCanvasElement>('#map'), select=find<HTMLSelectElement>('.select'), card=find('.card');
const instrument=document.createElement('canvas');instrument.width=360;instrument.height=84;instrument.style.cssText='width:100%;height:auto;border-radius:5px;display:block';card.insertBefore(instrument,find('.readout'));
find('header small').textContent='时光史书　 /　11 月 '+Number(day.slice(2))+' 日　 ·　'+year;
find('h1').textContent=spec.title;
for(const d of Object.values(days).filter(d=>d.day.startsWith('11')).sort((a,b)=>a.day.localeCompare(b.day))){
 for(const c of d.chapters.filter(c=>c.status==='web')){const op=new Option('11/'+d.day.slice(2)+'　'+c.quest,c.id);select.add(op);}}
select.value=id;select.onchange=()=>location.assign('./level.html?id='+select.value);
const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.setClearColor(0,0);const scene=new T.Scene(),camera=new T.PerspectiveCamera(43,1,.08,160);
camera.layers.enable(1);
const art=buildTheatre(scene,spec,stops);document.body.style.background='radial-gradient(ellipse at 68% 17%, '+art.haze+' 0%, '+art.night+' 83%)';
const floor=.04;
const slime=new SlimeCharacter({
 THREE:T,renderer,scene,camera,sun:art.sun,controls:{enabled:false,target:new T.Vector3(),update(){}},
},{
 spawn:[-.6,floor,2.4],world:{boxes:[],surfaces:[{min:[-11,-9.2],max:[11,9.2],height:floor}]},
 ui:false,input:false,trainingTargets:[],title:spec.title,onToast:()=>{},
 onReady:()=>{if(state==='intro')begin();},
}).attach();
slime.forward=[0,0,1];
const preset=applyLevelQuality({renderer,sun:art.sun},slime,save.data.quality);
// The liquid samples the lit stage for refraction and its depth for occlusion.
const backdrop=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:preset==='low'?0:2});
backdrop.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
const screenScene=new T.Scene(),screenCamera=new T.Camera(),bufferSize=new T.Vector2();
const copyBackdrop=new T.ShaderMaterial({
 depthTest:false,depthWrite:false,uniforms:{backdrop:{value:backdrop.texture}},
 vertexShader:'varying vec2 tex; void main(){tex=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:`varying vec2 tex; uniform sampler2D backdrop;
 void main(){gl_FragColor=texture2D(backdrop,tex);
 #include <colorspace_fragment>
 }`,
});
const screenQuad=new T.Mesh(new T.PlaneGeometry(2,2),copyBackdrop);
screenQuad.frustumCulled=false;screenScene.add(screenQuad);
const mat=(color:string,emissive=false)=>new T.MeshStandardMaterial({color,roughness:.43,metalness:.15,emissive:emissive?color:0,emissiveIntensity:.54});
function mesh(geo:any,material:any,parent=scene){const m=new T.Mesh(geo,material);parent.add(m);return m;}
const beacon=mesh(new T.TorusGeometry(.81,.055,8,64),mat(art.gold,true));beacon.rotation.x=Math.PI/2;
const crystal=mesh(new T.OctahedronGeometry(.27),mat(art.gold,true));
const relic=mesh(new T.OctahedronGeometry(.19),mat('#ffdc82',true));const collected=new Set<number>();
const seals=stops.map(([x,z])=>{const ring=mesh(new T.TorusGeometry(.86,.035,8,48),mat(art.mint,true));ring.rotation.x=Math.PI/2;ring.position.set(x,.18,z);ring.visible=false;return ring;});
const drops=Array.from({length:140},()=>({a:random.range(0,6.28),r:random.range(.4,1),v:random.range(.55,1.5),offset:random.next()}));
const particleGeo=new T.BufferGeometry(),particles=new Float32Array(drops.length*3);
particleGeo.setAttribute('position',new T.BufferAttribute(particles,3));
const sparks=new T.Points(particleGeo,new T.PointsMaterial({color:art.gold,size:.09,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));sparks.frustumCulled=false;scene.add(sparks);
type State='intro'|'walk'|'work'|'ready'|'finale'|'done';
let state:State='intro', paused=false,station=0,x=slime.position[0],z=slime.position[2],time=0,elapsed=0,finalTime=0,mistakes=0;
let value=.16,goal=.68,clock=0,velocity=0,stable=0,pressed=false,queued=0,a=false,b=false,jump=0,spread=false;
let burst=0,burstX=0,burstZ=0,destination:Place|null=null,messageTime=0;
const keys=new Set<string>(),ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0),hit=new T.Vector3(),pointer=new T.Vector2();
const mode=spec.activity;
let record=save.data.life.records;
function resize(){camera.aspect=innerWidth/innerHeight;
 camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
 renderer.getDrawingBufferSize(bufferSize);backdrop.setSize(bufferSize.x,bufferSize.y);}
resize();addEventListener('resize',resize);
function btn(label:string,act:()=>void,parent=find('.actions'),primary=false){const el=document.createElement('button');el.textContent=label;if(primary)el.className='primary';
 el.onclick=()=>{act();el.blur();};parent.append(el);return el;}
function announce(text:string){find('.badge').textContent=text;find('.badge').hidden=false;messageTime=2.5;}
function info(k:string,h:string,p:string){card.querySelector('small')!.textContent=k;card.querySelector('h2')!.textContent=h;card.querySelector('p')!.textContent=p;}
function flare(){burst=1;burstX=x;burstZ=z;}
function begin(){if(!slime.ready)return;state='walk';(exhibit.enabled?new Save():save).add('visited',id);panel();}
function startWork(){if(state!=='walk')return;state='work';destination=null;value=.16;goal=[.69,.34,.77][station];clock=0;velocity=0;stable=0;queued=0;a=b=pressed=false;panel();}
function success(){seals[station].visible=true;flare();slime.setMood('Happy');station++;state=station===3?'ready':'walk';announce(station===3?'三站完成':spec.stops[station-1]+' · 完成');panel();}
function miss(){mistakes++;announce('再试一次');}
function adjust(amount:number){if(queued)return;
 if(mode==='drive'){queued=amount;clock=0;}else value=Math.max(0,Math.min(1,value+amount));}
function confirm(){
 if(paused)return;
 if(state==='intro'){begin();return;}if(state==='ready'){exhibit.finish(()=>{state='finale';finalTime=0;flare();panel();});return;}
 if(state==='walk'){if(Math.hypot(x-stops[station][0],z-stops[station][1])<1.25)startWork();else destination=[...stops[station]];return;}
 if(state!=='work')return;
 if(mode==='hover'||mode==='dock'){velocity+=.21;return;}
 if(mode==='logic'){if(logicResult(station,a,b))success();else miss();return;}
 if(mode==='aux'){if(a=== (station!==1)&&b===(station!==0))success();else miss();return;}
 if(mode==='pong'){return;}
 if(queued){announce('指令传输中');return;}
 if(aligned(value,goal,.115))success();else miss();
}
function toggleInput(first:boolean){if(first)a=!a;else b=!b;panel();}
function liftButton(){const el=btn('按住增加升力',()=>{});el.onpointerdown=e=>{el.setPointerCapture(e.pointerId);pressed=true;};el.onlostpointercapture=()=>{pressed=false;};}
function panel(){
 instrument.hidden=paused||state!=='work';
 const actions=find('.actions');actions.replaceChildren();find('.readout').textContent='';
 find('.meter').hidden=true;find('.map-label').hidden=true;find('.jump').hidden=paused||state!=='walk';
 find('[data-pause]').hidden=state==='done'||state==='finale';
 if(paused){info('时光暂停',spec.title,'当前进度保留在这一局。');btn('继续',pause,actions,true);btn('重新开始',()=>location.reload());btn('回到凝露港',home);return;}
 if(state==='intro'){info(year+'　/　11.'+day.slice(2),spec.stops.join(' · '),spec.fact);
  btn(slime.ready?'进入这一日':'史莱姆正在凝聚…',begin,actions,true).disabled=!slime.ready;btn('回到凝露港',home);exhibit.preview(actions);return;}
 if(state==='walk'){info('行程　'+(station+1)+' / 3',spec.stops[station],'点击地面或 WASD 移动到信标。空格跳起可摘取旁边的金晶，C 摊开加速。');
  btn('前往'+spec.stops[station],confirm,actions,true);find('.map-label').hidden=false;return;}
 if(state==='work'){info('操作台　'+(station+1)+' / 3',spec.stops[station],activityHint(mode));
  if(mode==='logic'||mode==='aux'){btn((mode==='aux'?'供电':'输入 A')+'　'+Number(a),()=>toggleInput(true));
   btn((mode==='aux'?'辅助':'输入 B')+'　'+Number(b),()=>toggleInput(false));btn(mode==='aux'?'闭合开关':'锁存输出',confirm,actions,true);
   find('.readout').textContent=mode==='logic'?['A AND B','A XOR B','(NOT A) AND B'][station]+'　→　'+Number(logicResult(station,a,b)):
    ['配电指示　1 / 0','雷击 · 辅助电源　0 / 1','SCE → AUX　1 / 1'][station];return;}
  find('.meter').hidden=false;const band=find('.band');band.style.left=(goal-.115)*100+'%';band.style.width='23%';
  if(mode==='hover'||mode==='dock')liftButton();
  else if(['observe','align','drive','pong'].includes(mode)){btn('−　左调',()=>adjust(-.1));btn('+　右调',()=>adjust(.1));
   if(mode!=='pong')btn(mode==='observe'?'曝光':mode==='drive'?'采样':'确认',confirm,actions,true);}
  else btn(mode==='kick'?'射门':mode==='tide'?'松缆':'落拍',confirm,actions,true);return;}
 if(state==='ready'){info('就绪',spec.finale,'三处操作台已就绪。由你启动最后一步。');btn(spec.finale,confirm,actions,true);return;}
 if(state==='finale'){info(year+'　/　11.'+day.slice(2),spec.finale,spec.fact);return;}
 info('收进史书',spec.souvenir,'用时 '+elapsed.toFixed(1)+' 秒　·　个人最佳 '+(record[id+'-time']/1000).toFixed(1)+' 秒　·　金晶 '+collected.size+'/3　·　'+(mistakes?'重试 '+mistakes+' 次':'一次完成'));
 btn('再玩一次',()=>location.reload());btn('回到凝露港',home,actions,true);
}
function home(){location.assign('./?from='+id+'&date='+day);}
function pause(){if(state==='finale'||state==='done')return;paused=!paused;keys.clear();pressed=false;panel();}
find('[data-pause]').onclick=pause;
function leap(){if(state==='walk'&&jump===0)jump=1;}
btn('弹跳',leap,find('.jump'));btn('摊开',()=>{spread=!spread;},find('.jump'));
function key(e:KeyboardEvent){
 if(e.target===select||e.ctrlKey||e.metaKey)return;
 if(e.code==='Escape'&&!e.repeat){pause();return;}if(paused)return;
 if(['Space','ArrowUp','ArrowDown','ArrowRight','ArrowLeft'].includes(e.code))e.preventDefault();
 keys.add(e.code);if(e.repeat)return;
 if(e.code==='KeyC'&&state==='walk')spread=!spread;
 if(state==='walk'&&e.code==='Space')leap();
 else if(e.code==='Enter'||e.code==='KeyF'||e.code==='Space')confirm();
 else if(state==='work'){if(e.code==='Digit1')toggleInput(true);if(e.code==='Digit2')toggleInput(false);
   if(e.code==='ArrowLeft')adjust(-.1);if(e.code==='ArrowRight')adjust(.1);}
}
addEventListener('keydown',key);addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>{keys.clear();pressed=false;if(!paused&&['work','walk','ready'].includes(state))pause();});
canvas.onpointerdown=e=>{if(paused||state!=='walk')return;pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);
 ray.setFromCamera(pointer,camera);if(ray.ray.intersectPlane(plane,hit))destination=[hit.x,hit.z];};
function walk(dt:number){
 let dx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
 let dz=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
 if(dx||dz)destination=null;
 if(destination){dx=destination[0]-x;dz=destination[1]-z;if(Math.hypot(dx,dz)<.13){destination=null;dx=dz=0;}}
 const length=Math.hypot(dx,dz);if(length){const amount=Math.min(destination?length:Infinity,dt*(spread?5.3:3.6)*(jump?1.3:1));
  x+=dx/length*amount;z+=dz/length*amount;const rim=Math.hypot(x/9.85,z/8.1);if(rim>1){x/=rim;z/=rim;}slime.forward=[dx/length,0,dz/length];}
 if(!collected.has(station)&&jump>.15&&jump<.85&&Math.hypot(x-stops[station][0],z-stops[station][1]-1.65)<.8){collected.add(station);flare();announce('金晶　'+collected.size+' / 3');}
 if(Math.hypot(x-stops[station][0],z-stops[station][1])<.96)startWork();
}
function work(dt:number){
 clock+=dt;
 if(mode==='hover'||mode==='dock'){velocity+=((pressed||keys.has('Space')?.78:-.49)-velocity*1.65)*dt;
  value=Math.max(0,Math.min(1,value+velocity*dt));if(value===0||value===1)velocity=0;
  if(aligned(value,goal,.115))stable+=dt;else stable=Math.max(0,stable-dt*.6);
  if(stable>1.25){success();return;}find('.readout').textContent='稳定　'+Math.min(100,Math.round(stable/1.25*100))+'%';}
 else if(mode==='drive'&&queued){if(clock>=1.5){value=Math.max(0,Math.min(1,value+queued));queued=0;}find('.readout').textContent=queued?'指令延迟　'+(1.5-clock).toFixed(1)+' s':'探针已移动';}
 else if(['beat','kick','tide'].includes(mode))value=timedWindow(clock,1.35+station*.26);
 else if(mode==='pong'){const flight=Math.min(1,clock/3.4);find('.readout').textContent='回球距离　'+Math.round((1-flight)*100)+'%';
  if(flight>=1){if(aligned(value,goal,.115))success();else{miss();clock=0;}}}
 find('.needle').style.left=(value*100)+'%';
}
const aim=new T.Vector3(x,.65,z-.5),focus=new T.Vector3(),eye=new T.Vector3(),screen=new T.Vector3();
function step(delta:number){
 const dt=Math.min(.08,Math.max(0,delta));if(!paused){time+=dt;
  if(state==='walk'||state==='work')elapsed+=dt;
  if(jump>0){jump=Math.max(0,jump-dt*1.45);if(!jump)slime.setMood('Squash',.22);}
  if(state==='walk')walk(dt);else if(state==='work')work(dt);
  const height=floor+Math.sin(jump*Math.PI)*1.25;
  if(dt>0){slime.velocity[0]=(x-slime.position[0])/dt;slime.velocity[1]=(height-slime.position[1])/dt;slime.velocity[2]=(z-slime.position[2])/dt;}
  slime.position[0]=x;slime.position[1]=height;slime.position[2]=z;slime.grounded=jump===0;
  slime.spread=T.MathUtils.damp(slime.spread,spread&&slime.grounded?1:0,9,dt);
  slime.update(time,dt);
  if(state==='finale'){finalTime+=dt;if(finalTime>4.5){state='done';const ms=Math.max(1,Math.round(elapsed*1000));
   const current=exhibit.enabled?new Save():save;record=current.data.life.records;
   record[id+'-time']=Math.min(ms,record[id+'-time']||Infinity);if(!mistakes)record[id+'-clean']=1;
   record[id+'-crystals']=Math.max(record[id+'-crystals']||0,collected.size);
   current.add('completed',id);current.add('souvenirs',id);current.write();panel();}}
  burst=Math.max(0,burst-dt*.72);messageTime-=dt;if(messageTime<0)find('.badge').hidden=true;
 }
 const finish=state==='finale'||state==='done',lift=finish?Math.min(1,finalTime/3):0;
 art.animate(time,lift);
 if(state==='work'&&!paused)drawInstrument(instrument,mode,value,goal,clock,station,a,b);
 const [tx,tz]=stops[Math.min(station,2)];beacon.visible=crystal.visible=state==='walk';
 relic.visible=state==='walk'&&!collected.has(station);relic.position.set(tx,1.52+.08*Math.sin(time*3),tz+1.65);relic.rotation.y=time*1.8;
 beacon.position.set(tx,.24,tz);beacon.scale.setScalar(1+.12*Math.sin(time*3));crystal.position.set(tx,1.12+.18*Math.sin(time*3),tz);crystal.rotation.y=time;
 for(let i=0;i<drops.length;i++){const t=drops[i],f=(time*(finish?.53:.32)*t.v+t.offset)%1,rad=(finish?7:burst?2.4:.86)*t.r;
  const cx=finish?0:burst?burstX:tx,cz=finish?-3:burst?burstZ:tz;
  particles[i*3]=cx+rad*Math.cos(t.a+f*(finish?3:1))*f;particles[i*3+1]=.22+f*(finish?8:2.4)*(1-.28*f);particles[i*3+2]=cz+rad*Math.sin(t.a+f*(finish?3:1))*f;}
 particleGeo.attributes.position.needsUpdate=true;sparks.visible=finish||state==='walk'||burst>0;
 focus.set(x*(1-lift),.65,z*(1-lift)-.5);
 aim.lerp(focus,paused?0:1-Math.exp(-5*dt));
 eye.set(1.35+lift,2.65+lift*9,7.7+lift*12).add(aim);camera.position.copy(eye);camera.lookAt(aim);camera.updateMatrixWorld();
 if(state==='walk'){
  screen.set(tx,1.5,tz).project(camera);const label=find('.map-label');
  const left=(screen.x*.5+.5)*innerWidth,top=(.5-screen.y*.5)*innerHeight;
  label.textContent=(left<55?'‹　':'')+spec.stops[station]+(left>innerWidth-55?'　›':'');
  label.style.left=T.MathUtils.clamp(left,55,innerWidth-55)+'px';label.style.top=T.MathUtils.clamp(top,110,innerHeight*.65)+'px';
 }
 renderer.setRenderTarget(backdrop);renderer.render(scene,camera);
 renderer.setRenderTarget(null);renderer.render(screenScene,screenCamera);
 slime.render({color:backdrop.texture,depth:backdrop.depthTexture,time});
}
panel();const timer=new T.Clock();renderer.setAnimationLoop(()=>step(timer.getDelta()));
(window as any).__slime=slime;
(window as any).__level={spec,step,get state(){return state;},get station(){return station;},get value(){return value;},get goal(){return goal;},get stable(){return stable;},get velocity(){return velocity;}};
