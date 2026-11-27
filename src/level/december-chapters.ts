import {levels} from '../../content/levels/registry';
import {legacySources} from '../../content/legacy-sources';
import {generateChronicle,chronicleMedal} from '../templates/chronicle';
import {DecemberRun,isDecemberChapter,near,type Story} from '../templates/december-chapters';
import {mail,lens,lantern,bridge,falls} from '../themes/december-first';
import {archive,message,rover,drum,foil} from '../themes/december-second';
import {theatre,scope,type Builder} from '../themes/december-chapters';
import {openChapter} from './jan01-chapter';
import type {Vec} from '../slime/types';

const params=new URLSearchParams(location.search),id=params.get('id')??'';
if(!isDecemberChapter(id))throw Error('未登记的展室');
const chapter=levels[id];
if(!('fact' in chapter)||(chapter.template!=='solstice'&&chapter.template!=='chronicle'))throw Error('缺少史实卡');
const first=chapter.template==='chronicle',seed=Array.from(params.get('practice')??id).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
const s=new DecemberRun(id,seed,first?generateChronicle(chapter).pickups.length:8,first?'藏签':'星尘');
const spawn:Vec=s.story==='bridge'?[-2.6,.18,1.55]:[-.65,.18,1.64];
const builders:Record<Story,Builder>={mail,archive,lens,message,lantern,rover,bridge,drum,falls,foil};
// Rest the camera on the result of the player's last operation.
const finalShot:Record<Story,[number,number,number,number]>={
  mail:[1.6,3.35,.45,1.65],archive:[0,3.43,1.26,-1.28],lens:[1.3,4.3,.70,.04],
  message:[1.0,3.36,1.20,-1.05],lantern:[.2,3.65,1.67,-1.53],rover:[-.32,2.90,.39,.05],
  bridge:[.32,2.5,.32,-.54],drum:[.05,3.32,1.19,-.81],falls:[.20,3.90,1.40,-1.05],foil:[-.5,3.15,1.05,-.88]
};
const source=first?chapter.source:legacySources[id],title=chapter.souvenir;
let audio:AudioContext|undefined;
function ringNote(high:boolean,index:number){if(!audio||audio.state!=='running')return;
  const oscillator=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
  oscillator.type='triangle';oscillator.frequency.value=(high?419:294)*[1,1.12,1.25][index%3];
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.065,now+.026);gain.gain.exponentialRampToValueAtTime(.0001,now+.32);
  oscillator.connect(gain);gain.connect(audio.destination);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};oscillator.start();oscillator.stop(now+.34);}
openChapter({id,title:s.spec.title,year:Number(id.slice(5)),gate:first?1:2,fact:chapter.fact,source,souvenir:title,opening:s.spec.goal,look:scope(s.story)},stage=>{
  const art=theatre(stage,s,builders[s.story]);let spread=false,recall=false,latched=false,shotTime=-10,played=0;
  let checkpoint:Vec=[...spawn];
  art.update(0,spawn[0],spawn[2]);
  return {world:art.world,spawn,checkpoint:()=>[...checkpoint],
    action(a,key){
      const [x,,z]=a.position;
      if(s.end>=0)return;
      if(key==='KeyC'){spread=!spread;if(spread)a.keys.add('KeyC');else a.keys.delete('KeyC');return;}
      if(key==='KeyX'){recall=true;latched=false;a.keys.add('KeyX');s.pin=false;return;}
      if(key==='KeyG'&&s.spec.pin){
        const target=s.spec.pin;
        if(!near(x,z,target,3.9)){s.msg('先靠近脚边的黄铜锁，再投分身。');return;}
        if(s.pin||s.t-shotTime<.65)return;
        shotTime=s.t;recall=false;a.keys.delete('KeyX');a.launch([target[0],.12,target[1]]);a.setMood('Spit',.35);return;
      }
      if(key==='KeyF'){
        if(s.story==='foil'&&typeof AudioContext!=='undefined'){audio??=new AudioContext();if(audio.state==='suspended')void audio.resume().catch(()=>{});}
        const old=s.step;s.action(x,z,!a.grounded&&a.position[1]>.24);a.setMood('Squash',.25);
        if(old!==s.step)s.until=0;
        if(a.grounded&&s.step!==old)checkpoint=[x,.16,z];
      }
    },
    update(a,dt,t){
      if(spread)a.keys.add('KeyC');const [x,y,z]=a.position;
      const shots=a.latest?.shots??[],pin=s.spec.pin;
      if(recall&&!shots.length){recall=false;a.keys.delete('KeyX');}
      if(pin&&!recall&&shots.some(q=>q.phase==='active'&&near(q.center[0],q.center[2],pin,.62)&&Math.abs(q.center[1])<.87))latched=true;
      const old=s.step,count=s.notes.length;s.tick(dt,x,z,a.spread,!a.grounded&&y>.28,latched);
      if(count<s.notes.length)ringNote(!!s.notes[count],count);
      if(s.story==='foil'&&s.end>=0&&played<3&&s.end>.16+played*.41){ringNote(!!s.notes[played],played);played++;}
      if(old!==s.step&&a.grounded)checkpoint=[x,.16,z];
      if(y<-.85){a.teleport([...checkpoint]);a.keys.clear();s.msg('已回到上一次站稳的位置。',true);}
      if(s.end>=0){if(a.mode==='play')a.decals.reset();a.keys.clear();a.mode='observe';}
      art.update(t,x,z);
    },
    hint:()=>s.hint,
    buttons:()=>{if(s.end>=0)return [];const list:[string,string][]=[['Space','弹跳'],['KeyC',spread?'收身 C':'摊开 C']];
      if(s.spec.pin)list.push(['KeyG','投分身 G'],['KeyX','回收 X']);
      list.push(['KeyF',s.ready?s.spec.last+' F':({mail:'投递',archive:'夹书签',lens:'调焦／收录',message:'拼字',lantern:'扣灯骨',rover:'选车道',bridge:'托木／合榫',drum:'装画片',falls:'留景',foil:'落针／抬针'}[s.story])+' F']);return list;},
    done:()=>s.end>=1.86,souvenirEarned:()=>first||s.marks.size===8,
    records:()=>{const result:Record<string,number>={'stage-clean':Number(!s.errors),'stage-all':Number(s.marks.size===s.markCount)};
      if(s.side>=0)result[s.side?'right-first':'left-first']=1;
      if(first){result.relics=s.marks.size;result.full=Number(s.marks.size===s.markCount);result.medal=chronicleMedal(chapter,s.elapsed);}
      else result.stars=s.marks.size;return result;},
    result:()=>s.spec.last+'。'+(s.errors?'中途重新对位 '+s.errors+' 次。':'一次完成。')+(first?chapter.relicName:'星尘')+' '+s.marks.size+'/'+s.markCount+(!first&&s.marks.size<8?'，集齐八颗可带走'+title+'。':'。'),
    camera(a,wide){
      const portrait=innerWidth/innerHeight<.82,shift=a.position[0]*(portrait?.52:.15);
      if(s.view==='low')return [[3.95,1.45,6.5],[0,.88,-1]];
      if(s.view==='far')return [[1.15,7.9,12.3],[0,1.05,-1]];
      const face=s.story==='lens'||s.story==='archive'||s.story==='message';
      const high=face?4.20:s.story==='bridge'?5.65:4.76;
      const u=Math.min(1,Math.max(0,s.end/1.5)),ease=u*u*(3-2*u),[focus,h,lift,z]=finalShot[s.story];
      const blend=(start:number,stop:number)=>start+(stop-start)*ease;
      return [[blend(shift+.49,focus+.65),blend(portrait?high+2.35:high,portrait?h+2.15:h),blend(portrait?11.5:8.15,portrait?9.7:6.75)],
        [blend(shift,focus),blend(face?1.26:wide?1.02:.8,lift),blend(-.82,z)]];
    },diagnostics:{state:s,root:art.root}};
});
