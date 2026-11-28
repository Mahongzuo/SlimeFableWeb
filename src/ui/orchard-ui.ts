import {TREE_SPECIES, type TreeSpecies} from '../life/orchard';
import './orchard.css';

export type OrchardMode='idle'|'choose'|'manual'|'preview'|'auto';
type Action='open'|'manual'|'batch'|'start'|'plant'|'harvest'|'stop'|'back'|'help';
interface OrchardActions {
  action:(action:Action)=>void;
  species:(id:TreeSpecies)=>void;
  quantity:(n:number)=>void;
  move:(right:number,forward:number)=>void;
}
export interface OrchardView {
  mode:OrchardMode;species:TreeSpecies;count:number;bag:Record<string,number>;
  tile:string;hint:string;canPlant:boolean;ripe:string;planned:number;completed:number;total:number;
}

export class OrchardUI {
  readonly root=document.createElement('div');
  private panel:HTMLElement;
  private bar:HTMLElement;
  private pad:HTMLElement;
  private lastKey='';
  private stick:number|null=null;
  constructor(private h:OrchardActions){
    this.root.id='orchard-ui';this.root.hidden=true;
    this.root.innerHTML='<section class="orchard-picker card" aria-label="选择树苗" hidden></section><div class="orchard-actions"></div><div class="orchard-stick" data-orchard-pad role="group" aria-label="移动摇杆"><i></i></div>';
    document.body.append(this.root);
    this.panel=this.root.querySelector('section')!;
    this.bar=this.root.querySelector('.orchard-actions')!;
    this.pad=this.root.querySelector('[data-orchard-pad]')!;
    this.root.addEventListener('click',event=>{
      const b=(event.target as HTMLElement).closest<HTMLButtonElement>('button');
      if(!b||b.disabled)return;
      if(b.dataset.species)this.h.species(b.dataset.species as TreeSpecies);
      else if(b.dataset.orchard)this.h.action(b.dataset.orchard as Action);
    });
    this.root.addEventListener('input',e=>{
      const n=e.target as HTMLInputElement;
      if(n.matches('[data-count]')&&n.value!=='')this.h.quantity(Number(n.value));
    });
    this.root.addEventListener('change',e=>{
      const n=e.target as HTMLInputElement;
      if(!n.matches('[data-count]'))return;
      n.value=String(Math.max(1,Math.min(Number(n.max),Math.floor(Number(n.value)||1))));
      this.h.quantity(Number(n.value));
    });
    this.pad.addEventListener('pointerdown',e=>{
      if(this.stick!==null)return;
      this.stick=e.pointerId;this.pad.setPointerCapture(e.pointerId);e.preventDefault();this.drag(e);
    });
    this.pad.addEventListener('pointermove',e=>{if(this.stick===e.pointerId)this.drag(e);});
    for(const type of ['pointerup','pointercancel','lostpointercapture']){
      this.pad.addEventListener(type,(event:Event)=>{if((event as PointerEvent).pointerId===this.stick)this.release();});
    }
  }
  private drag(e:PointerEvent){
    const r=this.pad.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width*.43),z=(r.top+r.height/2-e.clientY)/(r.height*.43);
    const d=Math.hypot(x,z),scale=1/Math.max(1,d);
    this.pad.style.setProperty('--stick-x',x*scale*25+'px');this.pad.style.setProperty('--stick-y',-z*scale*25+'px');
    this.h.move(d<.12?0:x*scale,d<.12?0:z*scale);
  }
  private release(){
    this.stick=null;this.pad.style.setProperty('--stick-x','0px');this.pad.style.setProperty('--stick-y','0px');this.h.move(0,0);
  }
  hide(){this.root.hidden=true;if(this.stick!==null)this.release();}
  show(v:OrchardView){
    this.root.hidden=false;
    const key=[v.mode,v.species,v.count,v.tile,v.hint,v.canPlant,v.ripe,v.planned,v.completed,v.total,
      ...Object.values(TREE_SPECIES).map(s=>v.bag[s.saplingId]||0)].join('|');
    if(key===this.lastKey)return;
    this.lastKey=key;this.panel.hidden=v.mode!=='choose';
    const button=(id:Action,label:string,disabled=false)=>'<button type="button" data-orchard="'+id+'" '+(disabled?'disabled':'')+'>'+label+'</button>';
    const spec=TREE_SPECIES[v.species], stock=v.bag[spec.saplingId]||0;
    if(v.mode==='choose'){
      if(!this.panel.hasChildNodes()){
        const options=Object.entries(TREE_SPECIES).map(([id,s])=>'<button type="button" data-species="'+id+'"><span>'+s.icon+' '+s.name+'</span><small></small></button>').join('');
        this.panel.innerHTML='<header><h2>种树</h2><div>'+button('help','F1 帮助')+' '+button('back','关闭')+'</div></header><p data-tile></p><div class="orchard-species">'+options+'</div>'+
          '<p data-stock></p><label>造林数量 <input data-count type="number" inputmode="numeric" min="1"></label>'+
          '<footer>'+button('manual','亲手栽种')+button('batch','预览造林')+'</footer>';
      }
      this.panel.querySelector('[data-tile]')!.textContent=v.tile;
      this.panel.querySelector('[data-stock]')!.textContent=stock?'移动到树冠标记的位置后栽下。':'树苗可在梯田农场入口的种子铺购买。';
      this.panel.querySelectorAll<HTMLButtonElement>('[data-species]').forEach(b=>{
        const id=b.dataset.species as TreeSpecies;
        b.setAttribute('aria-pressed',String(id===v.species));
        b.querySelector('small')!.textContent='× '+(v.bag[TREE_SPECIES[id].saplingId]||0);
      });
      const input=this.panel.querySelector<HTMLInputElement>('[data-count]')!;
      input.max=String(Math.max(1,stock));
      if(document.activeElement!==input)input.value=String(v.count);
      this.panel.querySelectorAll<HTMLButtonElement>('footer button').forEach(b=>{b.disabled=stock<=0;});
    }
    let html='';
    if(v.mode==='idle'){
      if(v.ripe)html+=button('harvest','采'+v.ripe+' · F');
      if(v.tile)html+=button('open','种树');
    } else if(v.mode==='manual'){
      html='<span data-orchard-message>'+v.hint+'</span>'+button('plant','栽下 · F',!v.canPlant)+button('back','结束');
    } else if(v.mode==='preview'){
      html='<span data-orchard-message>可栽 '+v.planned+' / '+v.count+' 棵'+(v.planned?'':' · 没有可达空地')+'</span>'+button('start','开始造林 · F',!v.planned)+button('back','返回');
    } else if(v.mode==='auto'){
      html='<span data-orchard-message>已栽 '+v.completed+' / '+v.total+' 棵</span>'+button('stop','停止造林');
    }
    this.bar.innerHTML=html;this.bar.hidden=!html;
  }
}
