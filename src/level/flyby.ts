import * as THREE from 'three';
import {Stage} from './stage';
import {levels} from '../../content/levels/registry';
import type {FlybySpec} from '../../content/levels/types';
import {FLYBY, FLYBY_SHOTS, FLYBY_VISUAL_SCALE, flybyCamera, generateFlyby, validateFlyby, createFlight, advanceFlight, boost, ringZone, photoAvailable, photograph, photoCount, findRecord, predictFlight, fuelMedal} from '../templates/flyby';
import {spaceLook, buildFlybySpace, createFlybyPrediction} from '../themes/space';
import {SlimeCharacter} from '../slime/character';
import {LevelUI} from '../ui/level-ui';
import {Save} from '../game/save';

import {applyLevelQuality} from '../game/graphics';
const id=new URLSearchParams(location.search).get('id')??'';
const spec=levels[id] as FlybySpec,layout=generateFlyby(spec),check=validateFlyby(layout);
if(!check.ok)throw new Error(check.errors.join('; '));
const stage=new Stage(spaceLook),save=new Save(),art=buildFlybySpace(stage,layout),flight=createFlight(layout);
type Mode='intro'|'play'|'pause'|'done'|'failed';
let mode:Mode='intro',accumulator=0,visualTime=0,thrust=0,spread=0,hudTime=0,flash=0;
let shutter=false,fire=false,announcedEncounter=false,announcedDeparture=false,announcedGap=false;
const ui=new LevelUI({start,resume,restart:()=>location.reload(),home:()=>location.href='./?from='+encodeURIComponent(id)},'11月12日 · 1980');
// Render the real jelly in logical space using a proportionally scaled camera; depth remains compatible.
const slimeCamera=stage.camera.clone();
const slime=new SlimeCharacter({THREE,renderer:stage.renderer,scene:art.root,camera:slimeCamera,sun:stage.sun,controls:stage.controls},{
  world:{boxes:[],surfaces:[],bounds:{min:[-200,-200,-200],max:[200,200,200]}},
  spawn:[flight.x,1.2,flight.z],gravityScale:0,input:false,ui:false,trainingTargets:[],title:spec.title,
  onToast:()=>{},onReady:()=>{if(mode==='intro')start();},
}).attach();
// Observe mode runs only the jelly renderer/worker. Ground movement and its camera are never enabled.
slime.grounded=false;applyLevelQuality(stage,slime,save.data.quality);
const hud=ui.root.querySelector('.hud')!;
const status=document.createElement('div');status.className='card grain';
status.style.cssText='position:absolute;right:18px;top:85px;width:230px;padding:14px;pointer-events:none';
status.innerHTML='<b data-fuel></b><div data-shield></div><progress aria-label="探测器护盾" max="100" style="width:100%;accent-color:#e8c27a"></progress><small data-window></small>';
hud.appendChild(status);
const fuelLabel=status.querySelector('[data-fuel]')!,shieldLabel=status.querySelector('[data-shield]')!,shieldBar=status.querySelector('progress')!,windowLabel=status.querySelector('[data-window]')!;
const controls=document.createElement('div');controls.className='card';controls.style.cssText='position:absolute;bottom:20px;left:20px;padding:12px;max-width:43%;pointer-events:none;font-size:12px';
controls.textContent='空格：火属性短促推进 · F：快门 / 金色信号 · Esc：暂停\n青色线为未来6秒轨迹；光环中自动摊开缓冲，缝隙内安全';hud.appendChild(controls);
const gallery=document.createElement('div');gallery.style.cssText='position:absolute;right:18px;bottom:18px;display:grid;grid-template-columns:repeat(3,minmax(0,112px));gap:6px;max-width:48%;pointer-events:none';hud.appendChild(gallery);
const frames=spec.photos.map(p=>{
  const box=document.createElement('div');box.className='card';box.style.cssText='padding:4px;background:#121a2c;color:#cbd8e3;font-size:10px';
  const canvas=document.createElement('canvas');canvas.width=160;canvas.height=100;canvas.style.cssText='width:100%;display:block;image-rendering:pixelated';
  const c=canvas.getContext('2d')!;c.fillStyle='#1d2639';c.fillRect(0,0,160,100);c.fillStyle='#637187';c.font='12px sans-serif';c.textAlign='center';c.fillText('等待快门',80,55);
  const label=document.createElement('div');label.textContent=p.name;box.append(canvas,label);gallery.appendChild(box);return {canvas,c,box};
});
// Actual procedural scene photographs, rendered through a target-facing instrument camera.
const photoCamera=new THREE.PerspectiveCamera(50,1.6,.05,1000),photoTarget=new THREE.WebGLRenderTarget(160,100);
photoCamera.layers.enable(1); // Include the rings, haze and stars, which skip the outline pass.
const photoFocus=new THREE.Vector3();
const pixels=new Uint8Array(160*100*4),photoData=frames[0].c.createImageData(160,100);
function developPhoto(index:number) {
  const p=spec.photos[index],b=spec.bodies.find(q=>q.id===p.body)!;
  photoCamera.position.set(flight.x,flight.height+5,flight.z).multiplyScalar(FLYBY_VISUAL_SCALE);
  const distance=photoCamera.position.distanceTo(photoFocus.copy(art.bodies.get(b.id)!.position).multiplyScalar(FLYBY_VISUAL_SCALE)),radius=p.id==='rings'?spec.rings.outer:b.radius;
  photoCamera.fov=Math.max(15,Math.min(110,2*Math.atan(radius*FLYBY_VISUAL_SCALE*1.25/distance)*180/Math.PI));photoCamera.updateProjectionMatrix();photoCamera.lookAt(photoFocus);
  const previous=stage.renderer.getRenderTarget();art.probe.visible=false;art.windows.forEach(w=>w.visible=false);art.gravity.visible=false;art.signal.visible=false;trajectory.root.visible=false;
  stage.renderer.setRenderTarget(photoTarget);stage.renderer.render(stage.scene,photoCamera);stage.renderer.readRenderTargetPixels(photoTarget,0,0,160,100,pixels);stage.renderer.setRenderTarget(previous);
  art.probe.visible=true;art.gravity.visible=true;trajectory.root.visible=true;art.update(flight,thrust,spread,prediction,visualTime);
  for(let y=0;y<100;y++)for(let x=0;x<160;x++) {
    const a=(y*160+x)*4,b=((99-y)*160+x)*4;
    for(let k=0;k<3;k++)photoData.data[a+k]=Math.round(pixels[b+k]/64)*64*(y%3===0?.55:1);
    photoData.data[a+3]=255;
  }
  const f=frames[index];f.c.putImageData(photoData,0,0);f.c.fillStyle='#e8c27a';f.c.font='9px monospace';f.c.textAlign='left';f.c.fillText('VOYAGER 1 / 1980',6,94);f.box.style.borderColor='#e8c27a';
  flash=.25;slime.setMood('Happy',1);ui.toast('照片已接收：'+p.name);
}
const prediction=new Float32Array(FLYBY.predictionSamples*3),scratch=createFlight(layout);
const trajectory=createFlybyPrediction(stage,layout);art.root.add(trajectory.root);
const cameraPosition=new THREE.Vector3(),cameraTarget=new THREE.Vector3(),localCamera=new THREE.Vector3();
const cameraCoordinates=[0,0,0],targetCoordinates=[0,0,0],lookTarget=new THREE.Vector3().fromArray(FLYBY_SHOTS.opening.target);
stage.camera.position.fromArray(FLYBY_SHOTS.opening.position);stage.camera.fov=FLYBY_SHOTS.opening.fov;
stage.camera.far=1000;stage.camera.updateProjectionMatrix();stage.camera.lookAt(lookTarget);
let shotLock:keyof typeof FLYBY_SHOTS|null=null;
function start() {if(mode!=='intro'||!slime.ready)return;shotLock=null;mode='play';ui.panel(null);ui.showHud(true);save.add('visited',id);updateHud();}
function pause() {if(mode!=='play')return;mode='pause';fire=shutter=false;accumulator=0;ui.showHud(false);ui.panelPause();}
function resume() {if(mode!=='pause')return;mode='play';ui.panel(null);ui.showHud(true);timer.getDelta();}
function finish() {
  mode='done';ui.showHud(false);
  const records=save.data.life.records,count=photoCount(flight),medal=fuelMedal(spec,flight.fuel);
  records[id+'-fuel']=Math.max(records[id+'-fuel']??0,flight.fuel);records[id+'-medal']=Math.max(records[id+'-medal']??0,medal);
  records[id+'-photos']=Math.max(records[id+'-photos']??0,count);if(count===6)records[id+'-all-photos']=1;
  if(flight.fuel===FLYBY.fuel)records[id+'-no-thrust']=1;
  if(flight.gap)records[id+'-cassini-gap']=1;
  if(flight.photos&(1<<2))save.add('souvenirs',id);
  save.add('completed',id);save.write();
  const result=`${['','铜','银','金'][medal]}牌 · 剩余推进 ${flight.fuel}/12 · 照片 ${count}/6${flight.fuel===12?' · 零推进达成':''}${flight.gap?' · 卡西尼缝加分':''}${flight.hidden?' · 找到金唱片':''}`;
  ui.complete(spec.title,spec.outro+'\n'+result,spec.souvenir,!!(flight.photos&(1<<2)));
  ui.root.querySelector('[data-act="resume"]')?.remove();
  const replay=document.createElement('button');replay.className='btn';replay.dataset.act='restart';replay.textContent='再次飞掠 · 挑战六张照片与节省燃料';ui.root.querySelector('.complete .stack')!.appendChild(replay);
}
function fail() {mode='failed';ui.showHud(false);ui.panel('<div class="overlay"><div class="pause card grain"><h2>航线中断</h2><p>推进过多会错过泰坦；先观察六秒预测线，少量推进，避开天体表面和密集光环。</p><div class="stack"><button class="btn primary" data-act="restart">重新飞掠</button><button class="btn" data-act="home">回到港口</button></div></div></div>');}
function updateHud() {
  const count=photoCount(flight),active=spec.photos.findIndex((_,i)=>photoAvailable(layout,flight,i)),zone=ringZone(layout,flight);
  ui.quest({title:spec.title,branch:flight.departing?'离开黄道面 · 数据飞向远方':flight.encounter?'泰坦引力正在弯折航线':'靠近取景框 · 在快门窗口按 F',count,total:6,complete:false,index:count,branches:6});
  fuelLabel.textContent=`推进 ${flight.fuel}/12 · ${flight.time.toFixed(0)} 秒`;
  shieldLabel.textContent=`护盾 ${flight.shield.toFixed(0)}% · ${zone===2?'卡西尼缝 · 安全':zone===1?'摊开缓冲中':'惯性滑行'}`;shieldBar.value=flight.shield;
  windowLabel.textContent=active>=0?'快门开启：'+spec.photos[active].name:'青色四角框是拍照窗口，亮起后按 F';
  const hidden=!flight.hidden&&Math.hypot(flight.x-spec.hidden.position[0],flight.z-spec.hidden.position[1])<=spec.hidden.radius;
  ui.prompt(active>=0||hidden?{x:innerWidth*.5,y:innerHeight*.76,title:active>=0?spec.photos[active].name:'接收金色信号',sub:active>=0?'快门窗口开启 · 按 F 拍照':'按 F 寻找隐藏金唱片'}:null);
}
addEventListener('keydown',e=>{
  if(e.code==='Enter'&&mode==='intro')start();
  if(e.code==='Escape'){e.preventDefault();if(mode==='play')pause();else if(mode==='pause')resume();return;}
  if(mode!=='play'||!['Space','KeyF'].includes(e.code))return;
  e.preventDefault();if(e.repeat)return;if(e.code==='Space')fire=true;else shutter=true;
});
ui.root.addEventListener('click',e=>{if((e.target as HTMLElement).closest('[data-act="pause"]'))pause();},true);
addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
const timer=new THREE.Clock();
/** Deterministic QA frames use the same accumulator, inputs and simulation as live flight. */
function step(forcedDt?:number) {
  const dt=Math.max(0,Math.min(typeof forcedDt==='number'?forcedDt:timer.getDelta(),.05));visualTime+=dt;
  if(mode==='play'&&!shotLock) {
    if(fire){if(boost(flight)){thrust=.5;slime.setElement(2);}else ui.toast(flight.fuel?'推进器正在冷却':'推进次数已耗尽');fire=false;}
    if(shutter){const index=photograph(layout,flight);if(index>=0)developPhoto(index);else if(!findRecord(layout,flight))ui.toast('尚未进入快门窗口');
      if(flight.hidden&&!save.data.souvenirs.includes(id+'-golden-record')){save.data.life.records[id+'-golden-record']=1;save.add('souvenirs',id+'-golden-record');ui.toast('找到隐藏纪念品：'+spec.hiddenSouvenir);}
      shutter=false;
    }
    const slow=flight.encounter&&!flight.departing?.32:1;accumulator+=dt*slow;
    while(accumulator+1e-10>=FLYBY.step&&flight.status==='flying'){advanceFlight(layout,flight);accumulator-=FLYBY.step;}
    if(flight.gap&&!announcedGap){announcedGap=true;ui.banner('卡西尼缝 · 安全通道','没有颗粒撞击 · 通关加分');}
    if(flight.encounter&&!announcedEncounter){announcedEncounter=true;ui.banner('泰坦飞掠 · 时间放慢','让引力替你转弯 · 记得按 F');}
    if(flight.departing&&!announcedDeparture){announcedDeparture=true;ui.banner('离开黄道面','土星渐渐远去 · 航向太阳系外');}
    if(flight.status==='won')finish();else if(flight.status==='lost')fail();
    thrust=Math.max(0,thrust-dt);flash=Math.max(0,flash-dt);
  }
  const belt=ringZone(layout,flight)===1;spread+=(Number(belt)-spread)*(1-Math.exp(-dt*7));
  if(!thrust&&slime.element!==0)slime.setElement(0);
  const heading=-Math.atan2(flight.vz,flight.vx),dockX=.405,dockZ=.243;
  slime.position[0]=flight.x+Math.cos(heading)*dockX+Math.sin(heading)*dockZ;
  slime.position[1]=flight.height+.7+1.35*(1-spread*.12)*.53;
  slime.position[2]=flight.z-Math.sin(heading)*dockX+Math.cos(heading)*dockZ;
  slime.velocity[0]=flight.vx;slime.velocity[2]=flight.vz;slime.forward[0]=flight.vx/Math.hypot(flight.vx,flight.vz);slime.forward[2]=flight.vz/Math.hypot(flight.vx,flight.vz);slime.spread=spread;slime.update(visualTime,dt);
  if(mode!=='intro'&&!shotLock) {
    const fov=flybyCamera(layout,flight,cameraCoordinates,targetCoordinates);
    cameraPosition.fromArray(cameraCoordinates).multiplyScalar(FLYBY_VISUAL_SCALE);cameraTarget.fromArray(targetCoordinates).multiplyScalar(FLYBY_VISUAL_SCALE);
    stage.camera.position.lerp(cameraPosition,1-Math.exp(-dt*2));lookTarget.lerp(cameraTarget,1-Math.exp(-dt*2));stage.camera.lookAt(lookTarget);
    stage.camera.fov+=(fov-stage.camera.fov)*(1-Math.exp(-dt*2));stage.camera.updateProjectionMatrix();
  }
  slimeCamera.copy(stage.camera);slimeCamera.position.divideScalar(FLYBY_VISUAL_SCALE);
  slimeCamera.near=stage.camera.near/FLYBY_VISUAL_SCALE;slimeCamera.far=stage.camera.far/FLYBY_VISUAL_SCALE;
  slimeCamera.updateProjectionMatrix();slimeCamera.updateMatrixWorld();
  predictFlight(layout,flight,prediction,scratch);
  art.update(flight,thrust,spread,prediction,visualTime);
  trajectory.update(prediction,localCamera.copy(stage.camera.position).divideScalar(FLYBY_VISUAL_SCALE));
  gallery.style.filter=flash>0?'brightness(1.8)':'none';
  hudTime-=dt;if(hudTime<=0&&mode==='play'){hudTime=.08;updateHud();}
  stage.render(dt,slime);
}
stage.renderer.setAnimationLoop(()=>step());
(window as any).__slime=slime;
/** Review cameras use a real zero-thrust replay; they do not record photos or save progress. */
function shot(name:keyof typeof FLYBY_SHOTS) {
  const view=FLYBY_SHOTS[name];if(!view)return;
  Object.assign(flight,createFlight(layout));advanceFlight(layout,flight,view.time);accumulator=0;thrust=0;flash=0;
  shotLock=name;stage.camera.position.fromArray(view.position);lookTarget.fromArray(view.target);stage.camera.lookAt(lookTarget);
  stage.camera.fov=view.fov;stage.camera.updateProjectionMatrix();slime.teleport([flight.x,flight.height+1.4,flight.z]);
  ui.panel(null);ui.showHud(false);step(0);
}
(window as any).__level={spec,layout,check,step,start,shot,releaseShot(){shotLock=null;},shots:FLYBY_SHOTS,get flight(){return {...flight};},get state(){return mode;},stage};
export {};
