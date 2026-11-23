type CellGesture = {
  id:number; from:number; x:number; y:number; width:number; height:number;
  moved:boolean; to:number; fraction:number; dx:number; dy:number;
};

/** Captured touch and mouse share one adjacent-swap path. Click remains the native keyboard/AT path. */
export function bindMatchPointer(grid:HTMLElement,cells:HTMLButtonElement[],playable:()=>boolean,
  tap:(index:number)=>void,exchange:(from:number,to:number,fraction:number)=>void) {
  const contacts=new Set<number>();
  const settling=new Set<Animation>();
  let drag:CellGesture|null=null;
  const indexAt=(target:EventTarget|null)=>target instanceof Element?
    Number(target.closest<HTMLElement>('[data-cell]')?.dataset.cell??-1):-1;
  const usable=(index:number)=>!!cells[index]&&!cells[index].disabled&&playable();
  const jelly=(index:number)=>cells[index].querySelector<HTMLElement>('.ml-jelly')!;

  function shift(index:number,x:number,y:number) {
    cells[index].style.setProperty('--drag-x',x+'px');
    cells[index].style.setProperty('--drag-y',y+'px');
  }
  function releaseCell(index:number,x:number,y:number,returning:boolean) {
    const cell=cells[index];
    delete cell.dataset.dragging;delete cell.dataset.dragPreview;
    cell.style.removeProperty('--drag-x');cell.style.removeProperty('--drag-y');
    if(!returning||(!x&&!y)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const motion=jelly(index).animate([{translate:x+'px '+y+'px'},{translate:'0px 0px'}],
      {duration:125,easing:'cubic-bezier(.2,.78,.3,1)'});
    settling.add(motion);
    void motion.finished.catch(()=>{}).then(()=>settling.delete(motion));
  }
  function finish(returning:boolean) {
    if(!drag)return;
    const d=drag;drag=null;
    releaseCell(d.from,d.dx,d.dy,returning);
    if(d.to>=0)releaseCell(d.to,-d.dx,-d.dy,returning);
    const source=cells[d.from];
    if(source.hasPointerCapture(d.id))source.releasePointerCapture(d.id);
  }
  function track(e:PointerEvent) {
    const d=drag;
    if(!d||d.id!==e.pointerId)return;
    const bounds=grid.getBoundingClientRect();
    if(!usable(d.from)||e.clientX<bounds.left||e.clientX>=bounds.right||e.clientY<bounds.top||e.clientY>=bounds.bottom){
      finish(true);return;
    }
    const x=(e.clientX-d.x)/d.width,y=(e.clientY-d.y)/d.height;
    if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>Math.min(8,Math.max(4,d.width*.14)))d.moved=true;
    if(!d.moved)return;
    const horizontal=Math.abs(x)>Math.abs(y);
    const main=horizontal?x:y,across=horizontal?y:x;
    const step=Math.sign(main),candidate=d.from+(horizontal?step:step*8);
    const aligned=Math.abs(main)>Math.abs(across)*1.35&&Math.abs(across)<.48;
    const neighbor=aligned&&usable(candidate)&&(!horizontal||(candidate>>3)===(d.from>>3));
    const to=neighbor?candidate:-1;
    if(d.to>=0&&to!==d.to)releaseCell(d.to,-d.dx,-d.dy,false);
    d.to=to;
    // A hole, a diagonal or the edge has no neighbor to displace.
    d.fraction=neighbor?Math.min(1,Math.abs(main)):0;
    d.dx=neighbor?(horizontal?step*d.width*d.fraction:0):Math.max(-.22,Math.min(.22,x))*d.width;
    d.dy=neighbor?(horizontal?0:step*d.height*d.fraction):Math.max(-.22,Math.min(.22,y))*d.height;
    shift(d.from,d.dx,d.dy);
    if(to>=0){cells[to].dataset.dragPreview='';shift(to,-d.dx,-d.dy);}
  }

  // A second finger may land outside the board, where the grid would miss its down event.
  window.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    contacts.add(e.pointerId);
    if(contacts.size>1)finish(true);
  },true);
  grid.addEventListener('pointerdown',e=>{
    const from=indexAt(e.target);
    if(e.button!==0||!e.isPrimary||contacts.size!==1||!usable(from))return;
    for(const motion of settling)motion.cancel();
    const box=cells[0].getBoundingClientRect();
    drag={id:e.pointerId,from,x:e.clientX,y:e.clientY,width:cells[1].getBoundingClientRect().x-box.x,
      height:cells[8].getBoundingClientRect().y-box.y,moved:false,to:-1,fraction:0,dx:0,dy:0};
    cells[from].focus({preventScroll:true});cells[from].setPointerCapture(e.pointerId);
    cells[from].dataset.dragging='';
    e.preventDefault();
  });
  window.addEventListener('pointermove',e=>{
    if(drag?.id!==e.pointerId)return;
    if(!(e.buttons&1)){finish(true);contacts.delete(e.pointerId);return;}
    track(e);
  });
  window.addEventListener('pointerup',e=>{
    contacts.delete(e.pointerId);
    if(drag?.id!==e.pointerId)return;
    if(e.button!==0){finish(true);return;}
    track(e);
    const d=drag;
    if(!d)return;
    const swap=d.to>=0&&d.fraction>=.35;
    finish(!swap);
    if(swap)exchange(d.from,d.to,d.fraction);
    else if(!d.moved)tap(d.from);
  });
  window.addEventListener('pointercancel',e=>{
    contacts.delete(e.pointerId);
    if(drag?.id===e.pointerId)finish(true);
  });
  window.addEventListener('pointerout',e=>{
    if(drag?.id===e.pointerId&&e.relatedTarget===null&&
      (e.clientX<=0||e.clientX>=innerWidth||e.clientY<=0||e.clientY>=innerHeight))finish(true);
  });
  grid.addEventListener('lostpointercapture',e=>{
    if(drag?.id===e.pointerId&&e.target===cells[drag.from])finish(true);
  });
  grid.addEventListener('focusout',e=>{if(drag&&e.target===cells[drag.from])finish(true);});
  grid.addEventListener('keydown',e=>{if(drag&&e.key==='Escape')finish(true);});
  function clear(){contacts.clear();finish(true);}
  window.addEventListener('blur',clear);
  window.addEventListener('pagehide',clear);
  window.addEventListener('resize',clear);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
  grid.addEventListener('click',e=>{
    // Pointer taps already committed on pointerup. Native Enter / Space and assistive
    // activation produce a click with no physical pointer, including after a cancelled drag.
    if(e.detail!==0||('pointerType' in e&&e.pointerType)){e.preventDefault();return;}
    const i=indexAt(e.target);
    if(usable(i)){
      finish(false);
      for(const motion of settling)motion.cancel();
      tap(i);
    }
  });
}
