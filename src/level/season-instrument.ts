import {readingHelp} from './help-state';
import './season-instrument.css';
import {InstrumentPlay,instruments} from '../templates/season-instruments';
import {illustrate} from '../themes/season-instruments';
import {Save} from '../game/save';
import {progressId} from '../../content/daily-modes';

let pending:Promise<void>|null=null;
export function previewInstrument(id:string){return show(id,true);}
export function completeInstrument(id:string){
  return instruments[id]?show(id,false):Promise.resolve();
}
function show(id:string,preview:boolean):Promise<void>{
  if(pending)return pending;
  const spec=instruments[id],query=new URLSearchParams(location.search);
  const seed=Array.from(query.get('practice')??id).reduce((v,c)=>(v*31+c.charCodeAt(0))>>>0,0);
  const game=new InstrumentPlay(spec,seed),dialog=document.createElement('dialog');dialog.className='season-plate';
  dialog.innerHTML='<h2></h2><p></p><canvas width="960" height="480"></canvas><output aria-live="polite"></output><footer></footer>';
  dialog.querySelector('h2')!.textContent=spec.title;dialog.querySelector('p')!.textContent=spec.note;
  dialog.setAttribute('aria-label',spec.title);
  const canvas=dialog.querySelector('canvas')!,g=canvas.getContext('2d')!,footer=dialog.querySelector('footer')!,status=dialog.querySelector('output')!;
  canvas.setAttribute('aria-label',spec.note);let raf=0,last=0,drag=false,complete=false,previous='',focussed=0;
  const result=new Promise<void>(resolve=>{
    function close(){
      cancelAnimationFrame(raf);window.removeEventListener('keydown',key,true);window.removeEventListener('keyup',swallow,true);
      dialog.close();dialog.remove();pending=null;resolve();
    }
    function button(label:string,act:()=>void,cls=''){
      const b=document.createElement('button');b.type='button';b.textContent=label;b.className=cls;b.onclick=act;footer.append(b);return b;
    }
    function controls(){
      footer.replaceChildren();
      if(game.done){
        button(preview?'返回关卡':'继续',close,'season-main').focus();return;
      }
      if(spec.type==='register'){
        for(const [text,dx,dy] of [['←',-1,0],['→',1,0],['↑',0,-1],['↓',0,1]] as const)button(text,()=>game.nudge(dx,dy));
        button(spec.verb,()=>game.act(),'season-main');
      }else if(spec.type==='catch')button(spec.verb,()=>game.act(),'season-main');
      else if(spec.type==='rally'){button('球拍上移',()=>game.move(0,game.paddle-19));button('球拍下移',()=>game.move(0,game.paddle+19));}
      else spec.marks.forEach((mark,i)=>button(mark,()=>game.act(...spec.points[i])));
      if(preview)button('回到关卡',close,'season-exit');else button('回港',()=>{const day=id.slice(0,4),save=new Save();save.data.selectedDay=day;save.write();location.assign('./?from='+id+'&date='+day);},'season-exit');
    }
    function swallow(e:KeyboardEvent){if(e.code!=='Tab')e.stopImmediatePropagation();}
    function key(e:KeyboardEvent){
      if(e.code==='Tab'||e.code==='F1'||readingHelp())return;e.stopImmediatePropagation();
      if(e.code==='Escape'){e.preventDefault();if(preview)close();return;}
      if(game.done){if(e.code==='Enter'||e.code==='Space'){e.preventDefault();close();}return;}
      if(e.target instanceof HTMLButtonElement&&e.code==='Enter')return;
      if(e.code==='ArrowUp'||e.code==='ArrowDown'||e.code==='ArrowLeft'||e.code==='ArrowRight'){
        e.preventDefault();const dx=Number(e.code==='ArrowRight')-Number(e.code==='ArrowLeft'),dy=Number(e.code==='ArrowDown')-Number(e.code==='ArrowUp');
        if(spec.type==='rally')game.move(0,game.paddle+dy*14);
        if(spec.type==='register')game.nudge(dx,dy);
        if(spec.type==='release'||spec.type==='trace'){focussed=(focussed+dx+dy+spec.marks.length)%spec.marks.length;(footer.children[focussed] as HTMLElement)?.focus();}
      }else if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(!e.repeat)game.act(...(spec.points[focussed]??spec.points[0]));}
    }
    const point=(e:PointerEvent):[number,number]=>{const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)*480/r.width,(e.clientY-r.top)*240/r.height];};
    canvas.onpointerdown=e=>{drag=true;canvas.setPointerCapture(e.pointerId);const [x,y]=point(e);
      if(spec.type==='register'){const [cx,cy]=spec.points[0],dx=x-(cx+game.dx*15),dy=y-(cy+game.dy*15);
        if(Math.hypot(dx,dy)<7)game.act();else if(Math.abs(dx)>Math.abs(dy))game.nudge(Math.sign(dx),0);else game.nudge(0,Math.sign(dy));}
      else game.act(x,y);};
    canvas.onpointermove=e=>{if(drag)game.move(...point(e));};canvas.onlostpointercapture=()=>drag=false;
    dialog.addEventListener('cancel',e=>{e.preventDefault();if(preview)close();});
    function frame(now:number){const dt=last?Math.min(.05,(now-last)/1000):0;last=now;if(readingHelp()){raf=requestAnimationFrame(frame);return;}game.tick(dt);
      g.setTransform(2,0,0,2,0,0);illustrate(g,id,game);
      if(game.done&&!complete){
        complete=true;
        if(!preview){const save=new Save(),key=progressId(id)+(query.has('practice')?'-practice':'-daily')+'-instrument';
          const rec=save.data.life.records;rec[key]=1;if(!game.errors)rec[key+'-clean']=1;save.write();}
        controls();
      }
      const msg=complete?spec.title+' · 已完成'+(!game.errors?' · 一次成功':''):
        (spec.type==='register'?'对齐两色十字后确认':(game.index+1)+' / '+spec.marks.length+'　'+spec.marks[game.index])+(game.errors?'　重试 '+game.errors+' 次':'');
      if(msg!==previous){status.textContent=msg;previous=msg;}
      raf=requestAnimationFrame(frame);
    }
    document.body.append(dialog);controls();dialog.showModal();window.addEventListener('keydown',key,true);window.addEventListener('keyup',swallow,true);
    raf=requestAnimationFrame(frame);
  });
  pending=result;return result;
}
