import type {Stage} from './stage';

type Station='signals'|'chart';
type Piece='nelson'|'collingwood';
const names:Record<Piece,string>={nelson:'纳尔逊',collingwood:'科林伍德'};
const bearings=[
 {label:'左舷远海',point:[-15,.12,-21],fov:16,feedback:'镜中是一列远帆。桅顶没有半面蓝旗。'},
 {label:'船首远海',point:[13,-.1,-25],fov:13,feedback:'这组帆影仍在远处；继续找半面蓝旗。'},
 {label:'右舷近海',point:[19.27,8.83,-2.55],fov:17,feedback:''}
] as const;

export function createShipStations(host:HTMLElement,stage:Stage,onClose:(finished:boolean)=>void){
 const dialog=document.createElement('section');
 dialog.className='bp-station';dialog.hidden=true;
 dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','舰船任务台');
 host.append(dialog);
 let current:Station|null=null,bearing=0,piece:Piece|null=null;
 const laid=new Set<Piece>();
 const fog=stage.scene.fog,normalFog=fog?.far;
 const get=<E extends HTMLElement=HTMLElement>(q:string)=>dialog.querySelector<E>(q)!;
 function feedback(text:string){get('[data-station-message]').textContent=text;}
 function close(done:boolean){
  if(fog?.isFog)fog.far=normalFog;
  current=null;dialog.hidden=true;dialog.replaceChildren();delete dialog.dataset.station;
  stage.camera.fov=60;stage.camera.updateProjectionMatrix();onClose(done);
 }
 function turn(dir:number){
  bearing=(bearing+dir+bearings.length)%bearings.length;
  get('[data-bearing]').textContent=bearings[bearing].label;feedback('');
 }
 function open(kind:Station){
  current=kind;bearing=0;piece=null;laid.clear();dialog.hidden=false;dialog.dataset.station=kind;
  if(kind==='signals'){
   dialog.innerHTML='<div class="scope-glass" aria-hidden="true"></div><article><h2>辨认记录船</h2><p>找桅顶悬着半面蓝旗的船，为它放下跳板。</p><div class="scope-dial"><button data-station-prev aria-label="向左转镜">◀</button><b data-bearing></b><button data-station-next aria-label="向右转镜">▶</button></div><p class="station-message" data-station-message role="status"></p><button data-station-confirm>向这艘船放桥</button><button data-station-back>放下望远镜</button></article>';
   get('[data-station-prev]').onclick=()=>turn(-1);get('[data-station-next]').onclick=()=>turn(1);
   get('[data-station-confirm]').onclick=()=>{if(bearing===2)close(true);else feedback(bearings[bearing].feedback);};
   turn(0);
  }else{
   dialog.innerHTML='<article><h2>拼回航迹图</h2><p>图匣里有两片残页。对齐接缝的墨记，补全两列英舰的航线。</p><div class="chart-paper"><small>特拉法加角　·　1805 年 10 月 21 日</small><button class="chart-slot" data-route-slot="north"><span>●</span><i></i><b>接入残页</b></button><button class="chart-slot" data-route-slot="south"><span>◆</span><i></i><b>接入残页</b></button></div><div class="chart-pieces"><button data-route-piece="collingwood">◆ 科林伍德</button><button data-route-piece="nelson">● 纳尔逊</button></div><p class="station-message" data-station-message role="status"></p><button data-station-back>收起海图</button></article>';
   for(const b of Array.from(dialog.querySelectorAll<HTMLButtonElement>('[data-route-piece]'))){
    b.onclick=()=>{piece=b.dataset.routePiece as Piece;for(const other of Array.from(dialog.querySelectorAll('[data-route-piece]')))other.setAttribute('aria-pressed',String(other===b));feedback('把'+names[piece]+'的残页接到相同墨记旁。');};
   }
   for(const b of Array.from(dialog.querySelectorAll<HTMLButtonElement>('[data-route-slot]'))){
    b.onclick=()=>{
     if(!piece){feedback('先拿起图匣里的一片残页。');return;}
     const match=b.dataset.routeSlot==='north'?'nelson':'collingwood';
     if(piece!==match){feedback('接缝上的墨记不同。试试另一列。');return;}
     laid.add(piece);b.querySelector('b')!.textContent=names[piece];b.disabled=true;
     get<HTMLButtonElement>('[data-route-piece="'+piece+'"]').disabled=true;piece=null;
     if(laid.size===2)close(true);else feedback('第一列已经接上。还有一片残页。');
    };
   }
  }
  get('[data-station-back]').onclick=()=>close(false);
  dialog.querySelector<HTMLButtonElement>('button')!.focus({preventScroll:true});
 }
 function update(){
  if(current!=='signals')return;
  const sight=bearings[bearing];
  if(fog?.isFog)fog.far=110;
  stage.camera.position.set(4.8,11.4,5.3);stage.camera.lookAt(...sight.point);stage.camera.fov=sight.fov;stage.camera.updateProjectionMatrix();
 }
 window.addEventListener('keydown',e=>{
  if(!current)return;
  if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();close(false);return;}
  if(current==='signals'&&(e.code==='ArrowLeft'||e.code==='ArrowRight')){
   e.preventDefault();turn(e.code==='ArrowLeft'?-1:1);
  }
  if(e.code==='Tab'){
   const buttons=Array.from(dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')),at=buttons.indexOf(document.activeElement as HTMLButtonElement);
   e.preventDefault();buttons[(at+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();
  }
 },true);
 return {open,update};
}
