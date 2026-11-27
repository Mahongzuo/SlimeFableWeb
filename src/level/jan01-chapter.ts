import {bindHelpHint,readingHelp} from './help-state';
import './jan01-chapter.css';
import * as T from 'three';
import {Stage,type StageLook} from './stage';
import {Save} from '../game/save';
import {dayIdOf} from '../game/calendar';
import {SlimeCharacter} from '../slime/character';
import type {WorldDefinition} from '../slime/world';
import type {Vec} from '../slime/types';
import {applyLevelQuality} from '../game/graphics';
export interface ChapterGame{
  world:WorldDefinition;spawn:Vec;update:(actor:SlimeCharacter,dt:number,time:number)=>void;
  action:(actor:SlimeCharacter,key:string)=>void;hint:()=>[string,string];buttons:()=>[string,string][];
  done:()=>boolean;records:()=>Record<string,number>;result:()=>string;camera:(actor:SlimeCharacter,wide:boolean)=>[Vec,Vec];
  checkpoint:()=>Vec;diagnostics:object; preview?:(container:HTMLElement)=>void; souvenirEarned?:()=>boolean; legacyTimeKey?:string; recordTime?:boolean; minimumRecords?:readonly string[];
}
interface ChapterMeta{id:string;title:string;year:number;gate:number;fact:string;source:string;souvenir:string;opening:string;look:StageLook}
export function openChapter(meta:ChapterMeta,build:(stage:Stage)=>ChapterGame){
  const stage=new Stage(meta.look),game=build(stage);
  const ui=document.createElement('main');ui.className='jan-chapter '+(meta.gate===2?'book':'seal');
  ui.innerHTML='<header><div><small></small><h1></h1></div><button data-pause>暂停</button></header><section><h2></h2><p></p><nav></nav></section><aside><b></b><span></span></aside><footer></footer>';document.body.append(ui);
  const get=<E extends HTMLElement=HTMLElement>(s:string)=>ui.querySelector(s) as E;
  const day=meta.id.slice(0,4);
  get('header small').textContent=Number(day.slice(0,2))+' 月 '+Number(day.slice(2))+' 日 · '+meta.year+' 年 · '+(meta.gate===1?'一':'二')+'号门';get('h1').textContent=document.title=meta.title;
  let phase:'intro'|'play'|'pause'|'done'='intro',time=0,elapsed=0,lastTools='',lastHint='',destination:Vec|null=null,reading=false;
  const moveKeys=['KeyW','KeyA','KeyS','KeyD'],practice=new URLSearchParams(location.search).has('practice');
  const actor=new SlimeCharacter(stage,{world:game.world,spawn:game.spawn,input:false,ui:false,trainingTargets:[],title:meta.title,onToast:()=>{},onReady:()=>{if(phase==='intro')start();else panel();}}).attach();
  applyLevelQuality(stage,actor,new Save().data.quality);
  function btn(host:HTMLElement,name:string,fn:()=>void,attr:string){const b=document.createElement('button');b.textContent=name;b.setAttribute(attr,'');b.onclick=()=>{fn();b.blur();};host.append(b);return b;}
  function start(){if(!actor.ready||phase!=='intro')return;phase='play';actor.mode='play';actor.yaw=0;if(!practice)new Save().add('visited',meta.id);panel();}
  function home(){const save=new Save();save.data.selectedDay=dayIdOf(new Date())===day?null:day;save.write();location.assign('./?from='+meta.id+'&date='+day);}
  function pause(){if(phase==='play'){phase='pause';actor.keys.clear();destination=null;}else if(phase==='pause')phase='play';panel();}
  function finish(){const save=new Save(),records=save.data.life.records,prefix=meta.id+(practice?'-practice':'');
    for(const [k,v] of Object.entries(game.records())){
      const key=prefix+'-'+k,old=records[key];records[key]=game.minimumRecords?.includes(k)?Math.min(old??Infinity,v):Math.max(old??0,v);
    }
    if(game.recordTime!==false)records[prefix+'-ms']=Math.min(records[prefix+'-ms']||Infinity,Math.max(1,Math.round(elapsed*1000)));
    if(game.legacyTimeKey)records[prefix+'-'+game.legacyTimeKey]=Math.min(records[prefix+'-'+game.legacyTimeKey]||Infinity,records[prefix+'-ms']);
    if(!practice){if(game.souvenirEarned?.()??true)save.add('souvenirs',meta.id);save.add('completed',meta.id);}save.write();phase='done';actor.mode='observe';actor.keys.clear();destination=null;panel();
  }
  function panel(){get('section').hidden=phase==='play';get('aside').hidden=get('footer').hidden=phase!=='play';get('[data-pause]').hidden=phase!=='play';
    get('section').classList.toggle('receipt',phase==='done'&&!reading);
    const nav=get('nav');nav.replaceChildren();get('h2').textContent=phase==='intro'?meta.opening:phase==='pause'?'稍歇片刻':game.souvenirEarned&&!game.souvenirEarned()?'考察记录':meta.souvenir;
    get('p').textContent=phase==='done'?game.result()+'　'+meta.fact:meta.fact;
    if(phase==='intro'){btn(nav,actor.ready?'进入关卡':'史莱姆正在凝聚',start,'data-start').disabled=!actor.ready;const a=document.createElement('a');a.href=meta.source;a.textContent='历史出处';a.target='_blank';a.rel='noopener noreferrer';nav.append(a);game.preview?.(nav);}
    if(phase==='pause')btn(nav,'继续',pause,'data-resume');
    if(phase==='done')btn(nav,reading?'继续欣赏':game.souvenirEarned&&!game.souvenirEarned()?'查看考察记录':'查看'+meta.souvenir,()=>{reading=!reading;panel();},'data-read');
    if(phase==='pause'||phase==='done'&&reading)btn(nav,'再来一次',()=>location.reload(),'data-replay');
    btn(nav,'回到凝露港',home,'data-home');
  }
  function act(key:string){if(phase!=='play')return;if(key==='Space')actor.jump();else game.action(actor,key);}
  function hud(){const [headline,hint]=game.hint();if(headline+hint!==lastHint){get('aside b').textContent=headline;get('aside span').textContent=hint;lastHint=headline+hint;}
    const list=game.buttons(),sig=JSON.stringify(list);if(sig===lastTools)return;lastTools=sig;get('footer').replaceChildren();
    for(const [key,label] of list)btn(get('footer'),label,()=>act(key),'data-'+key.toLowerCase());
  }
  get('[data-pause]').onclick=pause;addEventListener('blur',()=>{if(phase==='play')pause();});
  addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='Escape'&&!e.repeat){pause();return;}
    if(phase==='intro'&&e.code==='Enter'){start();return;}if(phase!=='play')return;
    if(moveKeys.includes(e.code)){if(destination)actor.keys.clear();destination=null;actor.keys.add(e.code);e.preventDefault();return;}
    if(e.code==='Space')e.preventDefault();if(!e.repeat)act(e.code);
  });addEventListener('keyup',e=>actor.keys.delete(e.code));
  const ray=new T.Raycaster(),ndc=new T.Vector2(),floor=new T.Plane(new T.Vector3(0,1,0),0),point=new T.Vector3();
  stage.renderer.domElement.addEventListener('pointerdown',(e:PointerEvent)=>{if(phase!=='play')return;
    ndc.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(ndc,stage.camera);
    const hits=ray.intersectObjects(stage.scene.children,true);const hit=hits.find(h=>h.object.userData.walkTarget);
    if(hit)destination=[hit.point.x,hit.point.y,hit.point.z];else if(ray.ray.intersectPlane(floor,point))destination=[point.x,0,point.z];
  });
  const eye=new T.Vector3(),aim=new T.Vector3(),target=new T.Vector3();let first=true;
  bindHelpHint(()=>phase==='intro'?meta.opening:phase==='done'?game.result():game.hint().join('　'));
function frame(raw:number){
  if(readingHelp())return;const dt=T.MathUtils.clamp(raw,0,.05);
    if(phase!=='pause'){time+=dt;
      if(phase==='play'&&destination){for(const k of moveKeys)actor.keys.delete(k);const x=destination[0]-actor.position[0],z=destination[2]-actor.position[2];
        if(Math.hypot(x,z)<.19)destination=null;
        else{if(Math.abs(x)>.12)actor.keys.add(x>0?'KeyD':'KeyA');if(Math.abs(z)>.12)actor.keys.add(z>0?'KeyS':'KeyW');}}
      actor.update(time,dt);
      if(phase==='play'){elapsed+=dt;game.update(actor,dt,time);if(actor.position[1]<-1.8){actor.teleport(game.checkpoint());destination=null;actor.keys.clear();}hud();if(game.done())finish();}
    }
    const [from,to]=game.camera(actor,phase==='done');const blend=first?1:1-Math.exp(-dt*5);
    eye.lerp(target.fromArray(from),blend);aim.lerp(target.fromArray(to),blend);stage.camera.position.copy(eye);stage.camera.lookAt(aim);first=false;
    stage.render(dt,actor);
  }
  stage.camera.fov=47;stage.camera.updateProjectionMatrix();panel();const clock=new T.Clock();stage.renderer.setAnimationLoop(()=>frame(clock.getDelta()));
  Object.assign(window,{__slime:actor,__level:{spec:meta,stage,game,get phase(){return phase;},step:frame}});
}
