import {levels} from '../../content/levels/registry';
import {legacySources} from '../../content/legacy-sources';
import {generateChronicle,chronicleMedal} from '../templates/chronicle';
import {YearendRun,isYearendChapter,within,type YearendStory} from '../templates/yearend-chapters';
import {boat,locks,balance,lotus,compass} from '../themes/yearend-first';
import {flyer,broadcast,clock,bulbs,earthrise} from '../themes/yearend-second';
import type {Exhibit} from '../themes/yearend-chapters';
import {scope,theatre} from '../themes/december-chapters';
import {openChapter} from './jan01-chapter';
import type {Vec} from '../slime/types';

const params=new URLSearchParams(location.search),id=params.get('id')??'';
if(!isYearendChapter(id))throw Error('未登记的冬季展室');
const chapter=levels[id];
if(!('fact' in chapter)||(chapter.template!=='solstice'&&chapter.template!=='chronicle'))throw Error('缺少事实卡');
const chronicle=chapter.template==='chronicle';
const seed=Array.from(params.get('practice')??id).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
const s=new YearendRun(id,seed,chronicle?generateChronicle(chapter).pickups.length:8);
const builders:Record<YearendStory,Exhibit>={boat,flyer,locks,broadcast,balance,clock,lotus,bulbs,compass,earthrise};
const lighting:Record<YearendStory,string>={boat:'bridge',flyer:'drum',locks:'falls',broadcast:'message',balance:'archive',clock:'lantern',lotus:'falls',bulbs:'archive',compass:'lens',earthrise:'message'};
const finale:Record<YearendStory,[Vec,Vec]>={
 boat:[[2.53,2.04,4.55],[.44,1.12,-1.80]],flyer:[[3.33,2.38,4.69],[.63,1.82,-.33]],
 locks:[[1.21,2.88,4.27],[.06,.83,-2.34]],broadcast:[[1.55,2.93,4.55],[0,1.41,-1.76]],
 balance:[[3.51,2.66,4.55],[1.48,1.24,-1.02]],clock:[[1.78,2.53,5.17],[0,1.93,-2.40]],
 lotus:[[1.56,1.96,3.81],[0,1.02,-1.79]],bulbs:[[1.15,2.32,5.18],[0,1.64,-1.98]],
 compass:[[1.39,3.06,4.23],[.13,.91,-1.89]],earthrise:[[1.12,2.34,4.57],[.04,1.48,-.89]],
};
const verbs:Record<YearendStory,string>={boat:'牵绳',flyer:'托翼',locks:'抬闸',broadcast:'录音／发送',balance:'去皮／交接',clock:'显影',lotus:'引潮',bulbs:'接珠／点灯',compass:'锁弧／落点',earthrise:'锁位／快门'};
const spawn:Vec=[-.64,.18,1.68];
openChapter({id,title:s.spec.title,year:Number(id.slice(5)),gate:s.spec.gate,fact:chapter.fact,source:chronicle?chapter.source:legacySources[id],
  souvenir:chapter.souvenir,opening:s.spec.goal,look:scope(lighting[s.story])},stage=>{
  let audio:AudioContext|undefined,heardMask=0,sounded=false;
  function chime(hz:number,duration:number,level:number,delay=0){if(!audio||audio.state!=='running')return;
    const osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime+delay;osc.type='sine';osc.frequency.value=hz;
    gain.gain.setValueAtTime(.001,now);gain.gain.exponentialRampToValueAtTime(level,now+.012);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
    osc.connect(gain);gain.connect(audio.destination);osc.start(now);osc.stop(now+duration+.02);}
  const art=theatre(stage,s,builders[s.story]);let flat=false,recall=false,latched=false,shotAt=-10;let safe:Vec=[...spawn];
  art.update(0,spawn[0],spawn[2]);
  return {world:art.world,spawn,checkpoint:()=>[...safe],
    action(a,key){if(s.end>=0)return;const [x,y,z]=a.position;
      if((s.story==='broadcast'||s.story==='clock')&&!audio&&typeof AudioContext!=='undefined'){
        try{audio=new AudioContext();void audio.resume().catch(()=>{});}catch{/* Visible pulse and bell motion remain available. */}}

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
      if(s.story==='broadcast'&&s.mask!==heardMask){
        const pitch=s.mask&~heardMask&1?349:523;chime(pitch,.31,.069);chime(pitch*1.25,.33,.056,.19);heardMask=s.mask;
      }
      if(s.end>=0&&!sounded){sounded=true;
        if(s.story==='clock'){chime(196,1.40,.12);chime(460,.90,.045);}
        if(s.story==='broadcast'){const first=s.chosen?523:349,second=s.chosen?349:523;
          chime(first,.31,.07);chime(first*1.25,.35,.05,.19);chime(second,.36,.06,.64);chime(second*1.25,.35,.05,.85);}}
      art.update(t,x,z);
    },
    hint:()=>s.hint,buttons:()=>{if(s.end>=0)return [];const list:[string,string][]=[['Space','弹跳'],['KeyC',flat?'收身 C':'摊开 C']];
      if(s.spec.pin)list.push(['KeyG','投分身 G'],['KeyX','回收 X']);list.push(['KeyF',(s.ready?s.spec.last:verbs[s.story])+' F']);return list;},
    done:()=>s.end>=1.78,souvenirEarned:()=>chronicle||s.marks.size===8,
    records:()=>{const rec:Record<string,number>={'yearend-clean':Number(!s.errors),'yearend-complete-set':Number(s.marks.size===s.markCount)};
      if(s.chosen>=0)rec[s.chosen?'right-route':'left-route']=1;
      if(chronicle){rec.relics=s.marks.size;rec.full=Number(s.marks.size===s.markCount);rec.medal=chronicleMedal(chapter,s.elapsed);}
      else rec.stars=s.marks.size;return rec;},
    result:()=>s.spec.last+'。'+(s.errors?'中途重新对位 '+s.errors+' 次。':'所有位置一次对准。')+(chronicle?chapter.relicName:'星尘')+' '+s.marks.size+'/'+s.markCount+(!chronicle&&s.marks.size<8?'，集齐八颗可领取'+chapter.souvenir+'。':'。'),
    camera(a){
      if(s.view==='low')return [[3.72,1.32,6.35],[0,.91,-1.10]];
      if(s.view==='far')return [[1.28,7.27,12.34],[0,1.04,-1.02]];
      const aspect=innerWidth/innerHeight,phone=aspect<1,shift=phone?0:.13*a.position[0];
      const u=Math.max(0,Math.min(1,s.end/1.44)),e=u*u*(3-2*u);
      const [eye,focus]=finale[s.story],mix=(start:number,end:number)=>start+(end-start)*e;
      if(phone){
        // Keep both workstations, the front release and the optional edge finds in one tap area.
        const tanHalfV=Math.tan(stage.camera.fov*Math.PI/360);
        const distance=Math.max(10.1,3.58/(tanHalfV*aspect)+1.57);
        return [[mix(0,eye[0]),mix(.79+distance*.448,eye[1]),mix(-.51+distance*.894,eye[2]+1.38)],
          [mix(0,focus[0]),mix(.79,focus[1]),mix(-.51,focus[2])]];
      }
      return [[mix(shift+.45,eye[0]),mix(4.62,eye[1]),mix(8.13,eye[2])],
        [mix(shift,focus[0]),mix(1.08,focus[1]),mix(-.97,focus[2])]];
    },diagnostics:{state:s,root:art.root}};
});
