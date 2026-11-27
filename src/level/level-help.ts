import {touchHelpFor} from '../../content/winter-help';
import {guideFor,endingHelp} from '../../content/gate-help';
import {currentHelpHint,nextHelpMove,setReadingHelp,type BoardExample} from './help-state';
import './level-help.css';

function exampleDiagram(example:BoardExample){
  const figure=document.createElement('figure');figure.className='gh-diagram';
  const grid=document.createElement('div');grid.className='gh-grid';grid.setAttribute('aria-hidden','true');
  example.cells.forEach((cell,i)=>{
    const tile=document.createElement('span');
    if(cell.hole)tile.classList.add('gh-hole');
    else{
      tile.style.backgroundColor=cell.color;
      const index=example.pair.indexOf(i);
      if(index>=0){
        const number=document.createElement('b');number.textContent=String(index+1);
        tile.classList.add('gh-pair');tile.append(number);
      }else tile.textContent=cell.symbol;
      if(cell.target)tile.classList.add('gh-target');
    }
    grid.append(tile);
  });
  const caption=document.createElement('figcaption');
  caption.textContent='返回棋盘后，依次点 1、2 两格交换。金框是当前目标。';
  figure.append(grid,caption);return figure;
}

export function installGateHelp(id:string){
  const guide=guideFor(id);if(!guide)return;
  const launcher=document.createElement('button');
  launcher.type='button';launcher.className='gate-help-launch';launcher.textContent='F1 帮助';
  launcher.setAttribute('aria-haspopup','dialog');launcher.setAttribute('aria-controls','gate-help');
  const panel=document.createElement('dialog');panel.id='gate-help';panel.setAttribute('aria-labelledby','gate-help-title');
  panel.innerHTML='<div class="gh-heading"><div><small>通关帮助</small><h2 id="gate-help-title"></h2></div><button class="gh-close" type="button" autofocus aria-label="关闭帮助">×</button></div><div class="gh-scroll"><section class="gh-current"><h3>现在怎么做</h3><p></p></section><section class="gh-repair"><h3>卡住时</h3><p></p></section><details class="gh-steps"><summary>看完整走法</summary><p class="gh-move" hidden></p><ol></ol><p class="gh-optional" hidden></p></details></div><footer><button type="button" class="gh-back">返回关卡</button></footer>';
  panel.querySelector('h2')!.textContent=guide.title;
  panel.querySelector('.gh-repair p')!.textContent=guide.repair;
  panel.querySelector('.gh-optional')!.textContent=guide.optional??'';
  (panel.querySelector('.gh-optional') as HTMLElement).hidden=!guide.optional;
  const touchHint=touchHelpFor(id);
  if(touchHint){
    const tip=document.createElement('p');tip.className='gh-touch';tip.textContent='触屏操作　'+touchHint;
    panel.querySelector('.gh-current')!.append(tip);
  }
  const ending=endingHelp(id);
  const steps=panel.querySelector('ol')!;
  for(const line of [...guide.steps,...(ending?[ending]:[])]){const item=document.createElement('li');item.textContent=line;steps.append(item);}
  document.body.append(panel);
  let prior:HTMLElement|null=null;
  function dock(){
    if(panel.open)return;
    const dialogs=Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]')).filter(d=>d!==panel);
    const modal=dialogs.at(-1);
    const header=document.querySelector<HTMLElement>('main header');
    const host=modal??header?.querySelector<HTMLElement>('nav,.ml-actions')??header;
    if(host&&launcher.parentElement!==host)host.append(launcher);
    launcher.classList.toggle('in-modal',!!modal);
  }
  const held=new Set<string>();
  function open(){
    if(panel.open)return;
    const plate=document.querySelector<HTMLDialogElement>('.season-plate[open]');
    const receipt=document.querySelector('.mode-keepsake[open]');
    const current=plate?(plate.querySelector('output')?.textContent??'')+'　'+(plate.querySelector('p')?.textContent??''):
      receipt?'已经通关。关闭帮助后可以领取、回港，或选择练习。':currentHelpHint();
    panel.querySelector('.gh-current p')!.textContent=current?.trim()||guide!.steps[0];
    (panel.querySelector('details') as HTMLDetailsElement).open=false;
    const move=panel.querySelector<HTMLElement>('.gh-move')!;move.hidden=true;move.textContent='';panel.querySelector('.gh-diagram')?.remove();
    prior=document.activeElement instanceof HTMLElement?document.activeElement:null;
    for(const code of [...held])dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));held.clear();
    setReadingHelp(true);panel.showModal();panel.querySelector<HTMLElement>('.gh-scroll')!.scrollTop=0;
  }
  const details=panel.querySelector('details')!;
  details.addEventListener('toggle',()=>{
    if(!details.open||!panel.open||document.querySelector('.season-plate[open]'))return;
    const example=nextHelpMove();
    if(!example)return;
    const move=panel.querySelector<HTMLElement>('.gh-move')!;
    move.textContent=typeof example==='string'?example:example.text;move.hidden=false;
    panel.querySelector('.gh-diagram')?.remove();
    if(typeof example!=='string')move.after(exampleDiagram(example));
  });
  function close(){
    if(!panel.open)return;
    panel.close();setReadingHelp(false);dock();
    const returnTo=prior?.isConnected&&prior!==document.body?prior:launcher;
    returnTo.focus({preventScroll:true});prior=null;
  }
  launcher.onclick=open;panel.querySelector<HTMLElement>('.gh-close')!.onclick=close;panel.querySelector<HTMLElement>('.gh-back')!.onclick=close;
  panel.addEventListener('cancel',e=>{e.preventDefault();close();});
  window.addEventListener('keydown',e=>{
    if(e.key==='F1'||e.code==='F1'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)(panel.open?close:open)();return;}
    if(panel.open){e.stopImmediatePropagation();if(e.key==='Escape'){e.preventDefault();close();}return;}
    held.add(e.code);
  },true);
  window.addEventListener('keyup',e=>{held.delete(e.code);if(panel.open||e.code==='F1')e.stopImmediatePropagation();},true);
  window.addEventListener('blur',()=>held.clear());
  dock();const observer=new MutationObserver(dock);observer.observe(document.body,{childList:true});
  const dialogChanges=new MutationObserver(records=>{if(records.some(r=>r.target instanceof HTMLDialogElement))dock();});
  dialogChanges.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
}
