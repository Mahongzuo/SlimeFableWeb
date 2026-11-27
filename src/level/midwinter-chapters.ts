import {levels} from '../../content/levels/registry';
import {legacySources} from '../../content/legacy-sources';
import {generateChronicle,chronicleMedal} from '../templates/chronicle';
import {MidwinterRun,isMidwinterChapter,within,type MidwinterStory} from '../templates/midwinter-chapters';
import {bell,garden,sign,dynamo,press} from '../themes/midwinter-first';
import {radio,ridge,tent,twins,letter} from '../themes/midwinter-second';
import type {Exhibit} from '../themes/midwinter-chapters';
import {scope,theatre} from '../themes/december-chapters';
import {openChapter} from './jan01-chapter';
import type {Vec} from '../slime/types';

const params=new URLSearchParams(location.search),id=params.get('id')??'';
if(!isMidwinterChapter(id))throw Error('未登记的冬季展室');
const chapter=levels[id];
if(!('fact' in chapter)||(chapter.template!=='solstice'&&chapter.template!=='chronicle'))throw Error('缺少事实卡');
const chronicle=chapter.template==='chronicle';
const seed=Array.from(params.get('practice')??id).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
const s=new MidwinterRun(id,seed,chronicle?generateChronicle(chapter).pickups.length:8);
const builders:Record<MidwinterStory,Exhibit>={bell,radio,garden,ridge,sign,tent,dynamo,twins,press,letter};
const lighting:Record<MidwinterStory,string>={bell:'archive',radio:'falls',garden:'lantern',ridge:'falls',sign:'bridge',tent:'lens',dynamo:'foil',twins:'message',press:'archive',letter:'drum'};
const shot:Record<MidwinterStory,Vec>={bell:[0,1.68,-2.02],radio:[0,1.51,-1.68],garden:[.04,.43,-1.73],ridge:[-.16,.72,-1.12],sign:[0,1.78,-1.82],tent:[0,.95,-1.42],dynamo:[0,1.48,-2.31],twins:[.08,1.36,-1.42],press:[.12,1.12,-1.71],letter:[.1,.69,-.25]};
const keepsakeShots:Partial<Record<MidwinterStory,[Vec,Vec]>>={
 garden:[[2.02,1.82,3.92],[.19,.29,-2.25]],ridge:[[1.74,2.42,3.92],[.03,1.09,.26]],
 twins:[[1.33,2.18,4.34],[0,1.28,-.36]],press:[[1.57,2.22,4.18],[0,1.15,-.83]],letter:[[1.42,2.45,3.86],[0,.73,.60]],
};
const verbs:Record<MidwinterStory,string>={bell:'取页／拼页',radio:'点按电键',garden:'托起',ridge:'描山',sign:'嵌字',tent:'钉标',dynamo:'接入／锁定',twins:'取景',press:'取样／排版',letter:'观察／写入'};
const spawn:Vec=[-.64,.18,1.68];
openChapter({id,title:s.spec.title,year:Number(id.slice(5)),gate:s.spec.gate,fact:chapter.fact,source:chronicle?chapter.source:legacySources[id],
  souvenir:chapter.souvenir,opening:s.spec.goal,look:scope(lighting[s.story])},stage=>{
  let audio:AudioContext|undefined,previousBeat=-1,sounded=false;
  function chime(hz:number,duration:number,level:number){if(!audio||audio.state!=='running')return;
    const osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;osc.type='sine';osc.frequency.value=hz;
    gain.gain.setValueAtTime(.001,now);gain.gain.exponentialRampToValueAtTime(level,now+.012);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
    osc.connect(gain);gain.connect(audio.destination);osc.start(now);osc.stop(now+duration+.02);}
  const art=theatre(stage,s,builders[s.story]);let flat=false,recall=false,latched=false,shotAt=-10;let safe:Vec=[...spawn];
  art.update(0,spawn[0],spawn[2]);
  return {world:art.world,spawn,checkpoint:()=>[...safe],
    action(a,key){if(s.end>=0)return;const [x,y,z]=a.position;
      if((s.story==='radio'||s.story==='bell')&&!audio&&typeof AudioContext!=='undefined'){
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
      if(s.story==='radio'&&s.step>0&&!s.ready&&s.pulse&&s.beat!==previousBeat){previousBeat=s.beat;chime(612,.16,.075);}
      if(s.story==='bell'&&s.end>=0&&!sounded){sounded=true;chime(224,1.65,.12);chime(534,1.12,.045);}
      art.update(t,x,z);
    },
    hint:()=>s.hint,buttons:()=>{if(s.end>=0)return [];const list:[string,string][]=[['Space','弹跳'],['KeyC',flat?'收身 C':'摊开 C']];
      if(s.spec.pin)list.push(['KeyG','投分身 G'],['KeyX','回收 X']);list.push(['KeyF',(s.ready?s.spec.last:verbs[s.story])+' F']);return list;},
    done:()=>s.end>=1.78,souvenirEarned:()=>s.quiet||chronicle||s.marks.size===8,recordTime:!s.quiet,
    records:()=>{if(s.quiet)return {remembrance:1} as Record<string,number>;const rec:Record<string,number>={'midwinter-clean':Number(!s.errors),'midwinter-complete-set':Number(s.marks.size===s.markCount)};
      if(s.chosen>=0)rec[s.chosen?'right-route':'left-route']=1;
      if(chronicle){rec.relics=s.marks.size;rec.full=Number(s.marks.size===s.markCount);rec.medal=chronicleMedal(chapter,s.elapsed);}
      else rec.stars=s.marks.size;return rec;},
    result:()=>s.quiet?'一只素白纸鹤轻轻落在静水上。':s.spec.last+'。'+(s.errors?'中途重新对位 '+s.errors+' 次。':'所有位置一次对准。')+(chronicle?chapter.relicName:'星尘')+' '+s.marks.size+'/'+s.markCount+(!chronicle&&s.marks.size<8?'，集齐八颗可领取'+chapter.souvenir+'。':'。'),
    camera(a){
      if(s.view==='low')return [[3.72,1.32,6.35],[0,.91,-1.10]];
      if(s.view==='far')return [[1.28,7.27,12.34],[0,1.04,-1.02]];
      const phone=innerWidth<innerHeight,shift=(phone?.45:.13)*a.position[0],u=Math.max(0,Math.min(1,s.end/1.44)),e=u*u*(3-2*u);
      const final=shot[s.story],mix=(x:number,y:number)=>x+(y-x)*e;
      const look:Vec=[mix(shift,final[0]),mix(1.02,final[1]),mix(-.92,final[2])];
      const detail=keepsakeShots[s.story];
      if(detail){const [eye,focus]=detail;
        return [[mix(shift+.45,eye[0]),mix(phone?6.75:4.55,eye[1]),
          mix(phone?11.55:8.05,eye[2]+(phone?1.35:0))],[mix(shift,focus[0]),mix(1.02,focus[1]),mix(-.92,focus[2])]];
      }
      return [[look[0]+.45,phone?mix(6.75,5.32):mix(4.55,3.42),phone?mix(11.55,9.43):mix(8.05,6.42)],look];
    },diagnostics:{state:s,root:art.root}};
});
