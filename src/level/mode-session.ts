import {historyDetails} from '../ui/battle-history';
import './mode-session.css';
import {modeById,modeNames,imprintShapes} from '../../content/daily-modes';
import {Save} from '../game/save';

const query=new URLSearchParams(location.search);
const chosen=modeById(query.get('id')??'');
if(!chosen)throw Error('没有这个固定模式');
const spec=chosen;
const fullCampaign=spec.id==='1021-skirmish'||spec.id==='1021-rpg';
// Retain the short encounter's -ms key and existing souvenir/win records.
const timeSuffix=fullCampaign?'-campaign-v1-ms':'-ms';
const practice=query.has('practice');
const seed=practice?(query.get('practice')||'practice'):spec.id+'-v1';
let began:number|null=null,finished=false;
document.title=spec.title+' · 史莱姆寓言';

function home(){
 const save=new Save();
 save.data.selectedDay=spec.day;
 save.write();
 location.assign('./?date='+spec.day+'&from='+spec.id);
}
function start(){
 if(began!==null)return;
 began=performance.now();
 if(!practice)new Save().add('visited',spec.saveId);
}
function recordWin(){
 if(finished||began===null)return;
 finished=true;
 const save=new Save(),record=save.data.life.records;
 const key=spec.saveId+(practice?'-practice':'-daily');
 record[key+'-wins']=(record[key+'-wins']??0)+1;
 const ms=Math.max(1,Math.round(performance.now()-began));
 record[key+timeSuffix]=Math.min(record[key+timeSuffix]??Infinity,ms);
 if(!practice){save.add('completed',spec.saveId);save.add('souvenirs',spec.saveId);}
 save.write();
}
function finish(){
 if(began===null||document.querySelector('.mode-keepsake'))return;
 recordWin();
 const record=new Save().data.life.records;
 const key=spec.saveId+(practice?'-practice':'-daily');
 const result=document.createElement('dialog');result.className='mode-keepsake';result.dataset.day=spec.day;
 const date=spec.day.slice(0,2)+' / '+spec.day.slice(2);
 result.innerHTML='<article><div class="mode-stamp"><span>'+spec.year+'</span><b>'+date+'</b></div><p class="mode-caption">'+(practice?'随机练习完成':'已收入史书')+'　·　'+modeNames[spec.kind]+'</p><h1>'+spec.souvenir+'</h1><p>'+spec.memory+'</p><div class="mode-fact">'+spec.fact+' <a href="'+spec.source+'" target="_blank" rel="noopener">史料 ↗</a></div><footer><button data-mode-home>回到凝露港</button><button data-mode-practice>随机练习</button></footer></article>';
 result.querySelector('.mode-fact')!.insertAdjacentHTML('afterend',historyDetails(spec));
 if(fullCampaign){
   const best=document.createElement('p'),seconds=Math.floor(record[key+timeSuffix]/1000);
   best.className='mode-caption';
   best.textContent='完整任务最快 '+Math.floor(seconds/60)+' 分 '+seconds%60+' 秒';
   result.querySelector('footer')!.before(best);
 }
 if(spec.id==='0101-trial'){
   const marks=imprintShapes(record[key+'-imprint']);
   if(marks.length){
     const strip=document.createElement('div');strip.className='mode-imprints';
     strip.setAttribute('aria-label','取印次序：'+marks.join('、'));
     for(const mark of marks){
       const seal=document.createElement('span');seal.dataset.mark=mark;seal.textContent=mark;strip.append(seal);
     }
     result.querySelector('h1')!.after(strip);
   }
 }
 document.body.append(result);result.addEventListener('cancel',e=>e.preventDefault());
 result.querySelector('button')!.onclick=home;
 result.querySelector<HTMLButtonElement>('[data-mode-practice]')!.onclick=()=>location.assign(practicePath());
 if(document.pointerLockElement)document.exitPointerLock();
 result.showModal();
}
function practicePath(){return spec.playPath+'&practice='+crypto.getRandomValues(new Uint32Array(1))[0].toString(36);}
export const session={spec,seed,practice,start,recordWin,finish,home,practicePath};

