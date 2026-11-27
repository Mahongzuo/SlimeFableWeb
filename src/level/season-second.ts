import {levels} from '../../content/levels/registry';
import {legacySources} from '../../content/legacy-sources';
import type {Vec} from '../slime/types';
import {buildSecond,secondLook} from '../themes/season-second';
import {SecondRun,opening,distance,isSecond} from '../templates/season-second';
import {openChapter} from './jan01-chapter';
import {seasonExhibit} from './season-entry';

const query=new URLSearchParams(location.search),id=query.get('id')??'';
if(!isSecond(id))throw Error('未登记的次章');
const spec=levels[id];
if(!('fact' in spec)||spec.template!=='solstice'&&spec.template!=='almanac')throw Error('次章事实卡缺失');
const seed=Array.from(query.get('practice')??id).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
const s=new SecondRun(id,seed),k=s.kind,exhibit=seasonExhibit(id),spawn:Vec=k===4?[-2.1,.17,1.44]:k===3?[-2.6,.17,1.64]:[-.32,.17,1.76];
const fact=spec.fact,secondTitle=spec.title,souvenir=spec.souvenir;
const source=legacySources[id]??'https://en.wikipedia.org/wiki/November_'+Number(id.slice(2,4));
const controls=['压折痕','锁定亮星','发球','传球','读数'];
openChapter({id,title:secondTitle,year:Number(id.slice(5)),gate:2,opening:opening[k],fact,source,souvenir,look:secondLook(k)},stage=>{
  const art=buildSecond(stage,s);let recall=false,latched=false,shotAt=-10,spreadToggle=false,showing=false;
  let safe:Vec=[...spawn];
  art.update(0,spawn[0],spawn[2]);
  return {world:art.world,spawn,preview:exhibit.preview,checkpoint:()=>[...safe],
    action(a,key){
      if(showing||s.ending>=0)return;
      if(key==='KeyF'&&s.approach){
        a.keys.clear();spreadToggle=false;showing=true;
        exhibit.finish(()=>{s.ending=0;showing=false;a.keys.clear();a.mode='observe';a.setMood('Bliss',2);});return;
      }
      if(key==='KeyC'){spreadToggle=!spreadToggle;if(spreadToggle)a.keys.add('KeyC');else a.keys.delete('KeyC');return;}
      if(key==='KeyX'){recall=true;latched=false;s.pin=false;a.keys.add('KeyX');return;}
      if(key==='KeyG'&&(k===0||k===4)){
        if(distance(a.position[0],a.position[2],s.anchor)>4.1){s.note('先走近铜座，再把分身投过去。');return;}
        if(s.time-shotAt<.65||s.pin)return;shotAt=s.time;recall=false;a.keys.delete('KeyX');
        a.launch([s.anchor[0],.12,s.anchor[1]]);a.setMood('Spit',.33);return;
      }
      if(key==='KeyF'){
        const last=s.step;s.act(a.position[0],a.position[2],!a.grounded&&a.position[1]>.23);
        if(k===4&&last===1&&s.step===2){latched=false;s.pin=false;}
        if(s.step!==last&&a.grounded)safe=[a.position[0],.16,a.position[2]];
        a.setMood('Squash',.22);
      }
    },
    update(a,dt,t){
      if(showing)return;
      const [x,y,z]=a.position,shots=a.latest?.shots??[];
      if(recall&&!shots.length){recall=false;a.keys.delete('KeyX');}
      if(spreadToggle)a.keys.add('KeyC');
      // A physical detent catches after the clone presses the foot. The character
      // can explore while its seven-second shot returns; X explicitly frees the catch.
      if(!recall&&shots.some(p=>p.phase==='active'&&distance(p.center[0],p.center[2],s.anchor)<.62&&Math.abs(p.center[1])<.85))latched=true;
      const old=s.step;s.tick(dt,x,z,a.spread,latched,!a.grounded&&y>.28);
      if(old!==s.step&&a.grounded)safe=[x,.16,z];
      if(y<-.85){s.errors++;a.teleport([...safe]);a.keys.clear();s.note('脚下落空了。上一次操作已经保留。');}
      art.update(t,x,z);
    },
    hint:()=>s.hint,
    buttons:()=>{if(showing||s.ending>=0)return [];if(s.approach)return [['KeyF',spec.finale+' F']];
      const list:[string,string][]=[['Space','弹跳'],['KeyC',spreadToggle?'收身 C':'摊开 C']];
      if(k===0||k===4)list.push(['KeyG','投分身 G'],['KeyX','回收 X']);list.push(['KeyF',controls[k]+' F']);return list;},
    done:()=>s.ending>=1.35,
    records:():Record<string,number>=>({clean:Number(s.errors===0),[k===4?'stars':'crystals']:s.finds.size,'stage-perfect':Number(s.errors===0),
      ...(k===2?{'wide-return':Number(s.wideHit)}:{}),...(k===3?{'lofted-pass':Number(s.lofted)}:{})}),
    legacyTimeKey:k===4?undefined:'time',souvenirEarned:()=>k!==4||s.finds.size===8,
    result:()=>secondTitle+' · '+(s.errors?'中途重试 '+s.errors+' 次。':'全程一次成功。')+(k===4?'星尘 ':'金晶 ')+s.finds.size+' / '+s.marks.length+(k===4&&s.finds.size<8?'，集齐八颗可带走南极冰晶印章。':'。'),
    camera(a,wide){const portrait=innerWidth/innerHeight<.82;
      if(s.view==='far')return [[1.5,7.3,12],[0,1,-1]];
      if(s.view==='low')return [[3.7,1.15,5.8],[0,.7,-1]];
      const shift=portrait?a.position[0]*.47:a.position[0]*.14;
      if(k===2||k===3)return [[shift,portrait?9.6:6.25,portrait?9:7.6],[shift,.5,-.72]];
      if(k===1)return [[shift,portrait?5.4:3.8,portrait?13.3:8.65],[shift,1.64,-1.3]];
      return [[shift+.48,portrait?7.6:4.65,portrait?11.8:8.2],[shift,wide?1.02:.77,-.83]];
    },diagnostics:{state:s,root:art.root}
  };
});

