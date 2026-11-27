/** 纪念戏台、水槽、茶匾、鸽窗和印样为游戏演绎。 */
import {levels} from '../../content/levels/registry';
import {isWorkshop,workshops} from '../../content/turning-season';
import {deskLight} from '../themes/jan01-chapter';
import {buildWorkshop} from '../themes/turning-season';
import {Workshop,latch,nearSpot} from '../templates/turning-season';
import type {Vec} from '../slime/types';
import {openChapter} from './jan01-chapter';

const id=new URLSearchParams(location.search).get('id')??'';
if(!isWorkshop(id))throw Error('未登记的工作台 '+id);
const chapter=levels[id],design=workshops[id];
if(chapter.template!=='chronicle'||!('fact' in chapter))throw Error('缺少该日事实卡');
const spawn:Vec=[-.70,.22,1.7];
openChapter({id,title:design.name,year:Number(id.split('-')[1]),gate:1,opening:design.steps[0],
  fact:chapter.fact,source:chapter.source,souvenir:chapter.souvenir,
  look:{...deskLight,skyTop:design.sky,skyHorizon:design.horizon,wash:design.horizon,fog:[20,55]}},stage=>{
  const s=new Workshop(design.kind),art=buildWorkshop(stage,design.kind);
  let again=false,recalls=0,shotTime=-5;
  art.update(s,0,spawn[0],spawn[2]);
  return {world:art.world,spawn,checkpoint:()=>[...spawn],
    action(actor,key){
      if(key==='KeyX'&&s.needsPin){again=true;actor.keys.add('KeyX');if(s.pinned)recalls++;return;}
      if(key==='KeyG'&&s.needsPin){
        if(!nearSpot(actor.position[0],actor.position[2],latch,3.9)){s.message('从铜座四米内投出分身。');return;}
        if(s.pinned||s.time-shotTime<.7)return;
        again=false;actor.keys.delete('KeyX');actor.launch([latch[0],.13,latch[1]]);shotTime=s.time;actor.setMood('Spit',.4);return;
      }
      if(key==='KeyF'){s.operate(actor.position[0],actor.position[2]);actor.setMood('Squash',.27);}
    },
    update(actor,dt,t){
      const p=actor.position,shots=actor.latest?.shots??[];
      if(again&&!shots.length){again=false;actor.keys.delete('KeyX');}
      const pinned=!again&&shots.some(q=>q.phase==='active'&&nearSpot(q.center[0],q.center[2],latch,.6)&&Math.abs(q.center[1])<.85);
      s.tick(dt,p[0],p[2],pinned,!actor.grounded&&p[1]>.33);art.update(s,t,p[0],p[2]);
    },
    hint:()=>[s.objective[0],s.hintTime>0?s.hint:s.objective[1]],
    buttons:()=>{const buttons:[string,string][]=[['Space','弹跳']];
      if(s.needsPin)buttons.push(['KeyG','分身 G'],['KeyX','回收 X']);
      const verb={shadow:'定影',spring:'拨闸',tea:'拨拢',dove:'开窗',press:'调规／起辊'}[s.kind];
      buttons.push(['KeyF',verb+' F']);return s.finishing?[]:buttons;},
    done:()=>s.done,records:():Record<string,number>=>s.kind==='tea'?{'full-sweep':Number(s.teaEdges===3)}:
      {'workshop-clean':Number(!s.errors),'workshop-unbroken':Number(!recalls)},
    result:()=>design.steps[2]+'。'+(s.kind==='tea'?(s.teaEdges===3?'匾的两边都压足了。':'再试时可以踩到两侧最外缘。'):
      (s.errors?'已留存这次作品。':'这次一气呵成。')+(!recalls?' 分身一直守在原处。':'')),
    camera:(a,wide)=>{const portrait=innerWidth<innerHeight,x=portrait&&!wide?a.position[0]*.5:0;
      return [[x+.18,portrait?7.9:4.85,portrait?11.9:8.2],[x,1.12,-.75]];},
    diagnostics:{state:s,root:art.root}
  };
});
