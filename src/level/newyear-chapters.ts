import {levels} from '../../content/levels/registry';
import {generateChronicle,chronicleMedal} from '../templates/chronicle';
import {atlasCourse} from '../templates/atlas';
import {NewyearRun,isNewyearChapter,within,type NewyearStory} from '../templates/newyear-chapters';
import {JanweekRun,isJanweek} from '../templates/janweek-chapters';
import {translation,ferry,inkstone,lobster,dispatch} from '../themes/janweek-first';
import {telegraph,survey,islands,silverplate,penny} from '../themes/janweek-second';
import {elementNames} from '../../content/ability';
import {slides,classroom,courtyard,lever} from '../themes/newyear-first';
import {flyby,lamps,typewood,lift,strand} from '../themes/newyear-second';
import type {Exhibit} from '../themes/newyear-chapters';
import {scope,theatre} from '../themes/december-chapters';
import {openChapter} from './jan01-chapter';
import type {Vec} from '../slime/types';
const params=new URLSearchParams(location.search),id=params.get('id')??'',chapter=levels[id];
if(!isNewyearChapter(id)||!chapter||!['atlas','ability','chronicle'].includes(chapter.template)||!('source' in chapter)||!('fact' in chapter)||!('souvenir' in chapter))throw Error('未登记的新年展室');
const seed=Array.from(params.get('practice')??id).reduce((sum,c)=>(sum*31+c.charCodeAt(0))>>>0,0);
const run=isJanweek(id)?JanweekRun:NewyearRun;
const s=new run(id,seed,chapter.template==='atlas'?atlasCourse(chapter).gates.length:chapter.template==='chronicle'?generateChronicle(chapter).pickups.length:0);
const builds:Record<NewyearStory,Exhibit>={slides,flyby,lamps,classroom,typewood,courtyard,lift,lever,strand,translation,telegraph,ferry,survey,inkstone,islands,lobster,silverplate,dispatch,penny};
const light:Record<NewyearStory,string>={slides:'falls',flyby:'message',lamps:'lantern',classroom:'drum',typewood:'bridge',courtyard:'archive',lift:'lens',lever:'archive',strand:'falls',translation:'archive',telegraph:'drum',ferry:'bridge',survey:'falls',inkstone:'archive',islands:'bridge',lobster:'message',silverplate:'foil',dispatch:'lens',penny:'mail'};
const finalFocus:Record<NewyearStory,[Vec,Vec]>={
 slides:[[1.36,2.46,5.34],[0,1.57,-1.88]],flyby:[[.82,2.46,4.29],[0,1.45,-2.04]],
 lamps:[[1.34,2.29,3.70],[-.13,1.13,-1.75]],classroom:[[1.64,2.49,4.70],[0,1.38,-1.79]],
 typewood:[[1.25,2.29,4.27],[0,1.04,-1.52]],courtyard:[[1.54,2.35,4.54],[0,1.43,-2.30]],
 lift:[[1.59,2.67,5.37],[.02,1.50,-2.22]],lever:[[1.58,2.22,4.12],[0,1.27,-1.94]],strand:[[1.73,2.67,5.55],[.03,1.39,-1.76]],
 translation:[[1.02,2.59,4.95],[0,1.36,-2.31]],telegraph:[[1.10,2.45,4.85],[0,1.16,-2.18]],
 ferry:[[2.48,2.71,5.46],[0,.87,-2.86]],survey:[[1.60,2.55,4.79],[0,1.32,-2.11]],
 inkstone:[[1.46,2.25,4.83],[.30,1.75,-2.05]],islands:[[1.03,2.36,4.94],[0,1.09,-2]],
 lobster:[[1.45,2.55,5.22],[0,1.60,-3.02]],silverplate:[[1.38,2.21,4.78],[0,1.50,-1.95]],
 dispatch:[[1.35,3.42,5.20],[0,1.03,-2.66]],penny:[[1.35,2.48,5.23],[0,.87,-2.52]]
};
const verbs:Record<NewyearStory,string>={slides:'套片调焦',flyby:'轨迹曝光',lamps:'读光页',classroom:'调色窗',typewood:'拓字根',courtyard:'续墨',lift:'截取楼层',lever:'锁砝码',strand:'挂引线',translation:'校稿',telegraph:'敲键',ferry:'对轨',survey:'采印',inkstone:'落笔',islands:'摹叶',lobster:'记星',silverplate:'取版',dispatch:'接线',penny:'交信'};
const spawn:Vec=[-.48,.18,1.62];
openChapter({id,title:s.spec.title,year:Number(id.slice(5)),gate:s.spec.gate,fact:chapter.fact,source:chapter.source,souvenir:chapter.souvenir,opening:s.spec.goal,look:scope(light[s.story])},stage=>{
 const art=theatre(stage,s,builds[s.story]);let flat=false,recalling=false,latched=false,shotAt=-10;let safe:Vec=[...spawn];art.update(0,spawn[0],spawn[2]);
 return {world:art.world,spawn,checkpoint:()=>[...safe],minimumRecords:['checks'],
 action(a,key){if(s.end>=0)return;const [x,y,z]=a.position;
   if(/^Digit[1-6]$/.test(key)){a.setElement(Number(key.slice(5))-1,true);return;}
   if(key==='KeyC'){flat=!flat;if(flat)a.keys.add('KeyC');else a.keys.delete('KeyC');return;}
   if(key==='KeyX'){if(!s.spec.pin)return;recalling=true;latched=false;a.keys.add('KeyX');return;}
   if(key==='KeyG'&&s.spec.pin){const p=s.spec.pin;if(!within(x,z,p,4.0)){s.say('先靠近带铜环的分身座。');return;}
     if(latched||s.t-shotAt<.64)return;recalling=false;a.keys.delete('KeyX');a.launch([p[0],.13,p[1]]);shotAt=s.t;a.setMood('Spit',.29);return;}
   if(key==='KeyF'){const old=s.step;s.act(x,z,!a.grounded&&y>.29,a.element);if(s.step!==old&&a.grounded)safe=[x,.17,z];a.setMood('Squash',.22);}
 },
 update(a,dt,t){if(flat)a.keys.add('KeyC');const [x,y,z]=a.position,shots=a.latest?.shots??[],p=s.spec.pin;
   if(recalling&&!shots.length){recalling=false;a.keys.delete('KeyX');}
   if(p&&!recalling&&shots.some(q=>q.phase==='active'&&within(q.center[0],q.center[2],p,.63)&&Math.abs(q.center[1])<.85))latched=true;
   const old=s.step;s.tick(dt,x,z,a.spread,!a.grounded&&y>.28,latched||recalling&&s.story==='lamps'&&s.count===1,a.element);
   if(old!==s.step&&a.grounded)safe=[x,.17,z];
   if(y<-.85){a.teleport([...safe]);a.keys.clear();s.say('已回到刚才的操作点。');s.errors++;}
   if(s.end>=0){if(a.mode==='play')a.decals.reset();a.mode='observe';a.keys.clear();}art.update(t,x,z);
 },
 hint:()=>s.hint,buttons:()=>{if(s.end>=0)return [];
   if(s.story==='translation')return [['Space','弹跳收集（可选）'],['KeyF',s.ready?s.spec.last+' F':'校稿 F']];
   const keys:[string,string][]=[['Space','弹跳'],['KeyC',flat?'收身 C':'摊开 C']];
   if(s.spec.pin)keys.push(['KeyG','投分身 G'],['KeyX','回收 X']);
   for(const element of s.spec.elements??[])keys.push(['Digit'+(element+1),elementNames[element]+' '+(element+1)]);
   if(s.story==='slides')keys.push(['Digit1','水 1'],['Digit2','风 2']);
   if(s.story==='lamps')keys.push(['Digit5','暗 5']);
   if(s.story==='courtyard')keys.push(['Digit4','雷 4'],['Digit3','火 3']);
   keys.push(['KeyF',(s.ready?s.spec.last:verbs[s.story])+' F']);return keys;
 },
 done:()=>s.end>=1.85,
 records:()=>{const rec:Record<string,number>={'newyear-clean':Number(!s.errors)};
   if(s.chosen>=0)rec[s.chosen?'right-route':'left-route']=1;
   if(chapter.template==='chronicle'){rec.relics=s.marks.size;rec.medal=chronicleMedal(chapter,s.elapsed);if(s.marks.size===s.markCount)rec.full=1;}
   if(chapter.template==='atlas'){rec.gems=s.marks.size;if(!s.errors)rec.clean=1;}
   if(chapter.template==='ability')rec.checks=s.checks;
   return rec;},
 result:()=>s.spec.last+'。'+(s.story==='translation'?'可选译笺 '+s.marks.size+'/'+s.markCount+'。':chapter.template==='ability'?'属性校验失误 '+s.checks+' 次。':(chapter.template==='chronicle'?chapter.relicName:'菱晶')+' '+s.marks.size+'/'+s.markCount+'。'),
 camera(a){if(s.view==='low')return [[3.72,1.32,6.35],[0,.91,-1.10]];if(s.view==='far')return [[1.28,7.27,12.34],[0,1.04,-1.02]];
   const ratio=innerWidth/innerHeight,phone=ratio<1,d=Math.max(10.1,3.64/(Math.tan(stage.camera.fov*Math.PI/360)*ratio)+1.57);
   const [eye,focus]=finalFocus[s.story],u=Math.max(0,Math.min(1,s.end/1.48)),e=u*u*(3-2*u),mix=(v:number,end:number)=>v+(end-v)*e,shift=phone?0:.10*a.position[0];
   return [[mix(phone?0:shift+.45,eye[0]),mix(phone?.79+d*.448:4.62,eye[1]),mix(phone?-.51+d*.894:8.13,eye[2]+(phone?3.72:0))],
      [mix(shift,focus[0]),mix(phone?.79:1.08,focus[1]),mix(phone?-.51:-.97,focus[2])]];
 },diagnostics:{state:s,root:art.root}};
});
