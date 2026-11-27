import {levels} from '../../content/levels/registry';
import {legacySources} from '../../content/legacy-sources';
import {generateChronicle,chronicleMedal} from '../templates/chronicle';
import {WinterRun,isWinterChapter,within,type WinterStory} from '../templates/winter-chapters';
import {lecture,relay,street,sorghum,harbor} from '../themes/winter-first';
import {jovian,recovery,mouse,medal,atlas} from '../themes/winter-second';
import type {WinterBuilder} from '../themes/winter-chapters';
import {scope,theatre} from '../themes/december-chapters';
import {openChapter} from './jan01-chapter';
import type {Vec} from '../slime/types';

const params=new URLSearchParams(location.search),id=params.get('id')??'';
if(!isWinterChapter(id))throw Error('未登记的冬季展室');
const chapter=levels[id];
if(!('fact' in chapter)||(chapter.template!=='solstice'&&chapter.template!=='chronicle'))throw Error('缺少事实卡');
const chronicle=chapter.template==='chronicle';
const seed=Array.from(params.get('practice')??id).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
const s=new WinterRun(id,seed,chronicle?generateChronicle(chapter).pickups.length:8);
const builders:Record<WinterStory,WinterBuilder>={lecture,jovian,relay,recovery,street,mouse,sorghum,medal,harbor,atlas};
const lighting:Record<WinterStory,string>={lecture:'archive',jovian:'message',relay:'message',recovery:'falls',street:'archive',mouse:'lens',sorghum:'bridge',medal:'drum',harbor:'falls',atlas:'lens'};
const shot:Record<WinterStory,Vec>={lecture:[0,1.9,-2.38],jovian:[.18,2.10,-2.33],relay:[.20,1.52,-1.89],recovery:[0,1.32,-2.09],street:[0,1.22,-1.06],mouse:[0,1.92,-2.53],sorghum:[.24,.84,.25],medal:[.82,1.2,-1.48],harbor:[.08,.48,-2.5],atlas:[0,1.62,-2.35]};
const verbs:Record<WinterStory,string>={lecture:'取片／压片',jovian:'留影',relay:'接入',recovery:'收绳',street:'查看',mouse:'点选／松开',sorghum:'取景',medal:'锁止',harbor:'放桥',atlas:'取图／套准'};
const spawn:Vec=[-.64,.18,1.68];
openChapter({id,title:s.spec.title,year:Number(id.slice(5)),gate:s.spec.gate,fact:chapter.fact,source:chronicle?chapter.source:legacySources[id],
  souvenir:chapter.souvenir,opening:s.spec.goal,look:scope(lighting[s.story])},stage=>{
  const art=theatre(stage,s,builders[s.story]);let flat=false,recall=false,latched=false,shotAt=-10;let safe:Vec=[...spawn];
  art.update(0,spawn[0],spawn[2]);
  return {world:art.world,spawn,checkpoint:()=>[...safe],
    action(a,key){if(s.end>=0)return;const [x,y,z]=a.position;
      if(key==='KeyC'){flat=!flat;if(flat)a.keys.add('KeyC');else a.keys.delete('KeyC');return;}
      if(key==='KeyX'){recall=true;latched=false;s.pin=false;a.keys.add('KeyX');return;}
      if(key==='KeyG'&&s.spec.pin){const p=s.spec.pin;
        if(!within(x,z,p,4.1)){s.say('靠近黄铜座后再投分身。');return;}if(s.pin||s.t-shotAt<.68)return;
        recall=false;a.keys.delete('KeyX');a.launch([p[0],.13,p[1]]);a.setMood('Spit',.31);shotAt=s.t;return;}
      if(key==='KeyF'){const old=s.step;s.act(x,z,!a.grounded&&y>.29);if(old!==s.step&&a.grounded)safe=[x,.17,z];a.setMood('Squash',.23);}
    },
    update(a,dt,t){
      if(flat)a.keys.add('KeyC');const [x,y,z]=a.position,shots=a.latest?.shots??[],p=s.spec.pin;
      if(recall&&!shots.length){recall=false;a.keys.delete('KeyX');}
      if(p&&!recall&&shots.some(q=>q.phase==='active'&&within(q.center[0],q.center[2],p,.63)&&Math.abs(q.center[1])<.83))latched=true;
      const prior=s.step;s.tick(dt,x,z,a.spread,!a.grounded&&y>.28,latched);if(prior!==s.step&&a.grounded)safe=[x,.17,z];
      if(y<-.84){a.teleport([...safe]);a.keys.clear();s.say('上一次操作已经保留。',true);}
      if(s.end>=0){if(a.mode==='play')a.decals.reset();a.mode='observe';a.keys.clear();}
      art.update(t,x,z);
    },
    hint:()=>s.hint,buttons:()=>{if(s.end>=0)return [];const list:[string,string][]=[['Space','弹跳'],['KeyC',flat?'收身 C':'摊开 C']];
      if(s.spec.pin)list.push(['KeyG','投分身 G'],['KeyX','回收 X']);list.push(['KeyF',(s.ready?s.spec.last:verbs[s.story])+' F']);return list;},
    done:()=>s.end>=1.78,souvenirEarned:()=>chronicle||s.marks.size===8,
    records:()=>{const rec:Record<string,number>={'winter-clean':Number(!s.errors),'winter-complete-set':Number(s.marks.size===s.markCount)};
      if(s.chosen>=0)rec[s.chosen?'right-route':'left-route']=1;
      if(chronicle){rec.relics=s.marks.size;rec.full=Number(s.marks.size===s.markCount);rec.medal=chronicleMedal(chapter,s.elapsed);}
      else rec.stars=s.marks.size;return rec;},
    result:()=>s.spec.last+'。'+(s.errors?'中途重新对位 '+s.errors+' 次。':'所有位置一次对准。')+(chronicle?chapter.relicName:'星尘')+' '+s.marks.size+'/'+s.markCount+(!chronicle&&s.marks.size<8?'，集齐八颗可领取'+chapter.souvenir+'。':'。'),
    camera(a){
      if(s.view==='low')return [[3.72,1.32,6.35],[0,.91,-1.10]];
      if(s.view==='far')return [[1.28,7.27,12.34],[0,1.04,-1.02]];
      const phone=innerWidth<innerHeight,shift=(phone?.45:.13)*a.position[0],u=Math.max(0,Math.min(1,s.end/1.44)),e=u*u*(3-2*u);
      const final=shot[s.story],mix=(x:number,y:number)=>x+(y-x)*e;
      const look:Vec=[mix(shift,final[0]),mix(1.02,final[1]),mix(-.92,final[2])];
      return [[look[0]+.45,phone?mix(6.75,5.32):mix(4.55,3.42),phone?mix(11.55,9.43):mix(8.05,6.42)],look];
    },diagnostics:{state:s,root:art.root}};
});
