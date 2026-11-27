// 案头、试印机关、纸上游虾与印面均为纪念齐白石的虚构演绎。
import {openChapter,type ChapterGame} from './jan01-chapter';
import type {SlimeCharacter} from '../slime/character';
import type {Vec} from '../slime/types';
import {deskLight} from '../themes/jan01-chapter';
import {sealDesk} from '../themes/jan01-seal';
import {newStamp,press,peel,repairStamp,chooseStamp,stepStamp,sealStations,sealCorner,hiddenImprint} from '../templates/jan01-seal';
import {levels} from '../../content/levels/registry';

const id='0101-1864',spec=levels[id];
if(!('source' in spec))throw Error('印匣缺少事实卡');
const fact=spec.fact,source=spec.source;
const spawn:Vec=[-4.55,.17,2.72];
const distance=(a:Vec,b:Vec)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
openChapter({id,title:'印匣里的一尾虾',year:1864,gate:1,opening:'先在废纸上试一方印',fact,source,souvenir:spec.souvenir,look:deskLight},stage=>{
  const art=sealDesk(stage),s=newStamp();
  let note='',noteUntil=0,time=0,recall=false,shotTime=-4,wasOnTop=false;
  let trialFull=false;
  const say=(t:string)=>{note=t;noteUntil=time+2.6;};
  const target=()=>sealCorner(s.station);
  function shoot(a:SlimeCharacter){
    if(s.phase!=='stamp'&&s.phase!=='trial'){say('先去选一方落款，再投分身压住纸角。');return;}
    if(distance(a.position,target())>4.6){say('走近这方印石，再把分身投向翘起的纸角。');return;}
    if(time-shotTime<.5)return;
    if((a.latest?.shots.length??0)>=5){say('先收回分身，再试一次。');return;}
    recall=false;a.keys.delete('KeyX');a.launch(target());shotTime=time;a.setMood('Spit',.3);
  }
  function update(a:SlimeCharacter,dt:number,t:number){time=t;
    const c=target();if(recall&&!a.latest?.shots.length&&time-shotTime>.7){recall=false;a.keys.delete('KeyX');}
    if(s.phase==='trial'||s.phase==='stamp')s.pinned=!recall&&(a.latest?.shots??[]).some(shot=>shot.phase!=='returning'&&shot.phase!=='merging'&&shot.phase!=='separating'&&distance(shot.center,c)<.54&&Math.abs(shot.center[1]-c[1])<.68);
    const stone=sealStations[s.station],onTop=distance(a.position,stone)<.48&&a.position[1]>.47&&a.grounded;
    if(onTop&&!wasOnTop&&(s.phase==='trial'||s.phase==='stamp')){const isTrial=s.phase==='trial';press(s);if(isTrial)trialFull=s.printed;
      a.setMood('Squash',.4);say(isTrial?'钮已经压到底。到金色翘角揭下试纸。':s.printed?'纸角压平，四角都吃上了印泥。':'右下角露出纸白。压住那片翘边，就能把第四角印全。');}
    wasOnTop=onTop;stepStamp(s,dt);art.update(s,time,trialFull);
  }
  function action(a:SlimeCharacter,key:string){
    if(key==='KeyG'){shoot(a);return;}
    if(key==='KeyX'){recall=true;s.pinned=false;a.keys.add('KeyX');return;}
    if(key==='KeyR'&&s.phase==='proof'&&!s.printed){repairStamp(s);say('再投一团压住翘边，离开印钮后重新爬上去。');return;}
    if(key!=='KeyF')return;
    if(!s.hidden&&distance(a.position,hiddenImprint)<.85){s.hidden=true;say('翻出匣盖底下的小印面，正式落款会盖出它的花纹。');return;}
    if(s.phase==='choose'){const i=distance(a.position,sealStations[1])<=distance(a.position,sealStations[2])?1:2;
      if(distance(a.position,sealStations[i])>1.45){say('宣纸近角和远角各有一方印石，走近喜欢的那一处。');return;}
      chooseStamp(s,i);wasOnTop=false;say('这处落款已选好。分身固定纸角，本体登上印钮。');return;}
    if(s.phase==='trial-proof'||s.phase==='proof'){if(distance(a.position,target())>1.05){say('走到金色翘角旁，亲手把纸揭起来。');return;}
      const trial=s.phase==='trial-proof';peel(s);a.setMood('Bliss',1.4);if(trial){recall=true;a.keys.add('KeyX');say(trialFull?'印面四角齐全。画上有两处可以落款。':'试纸的右下角缺了一块。旁边那片纸角还翘着。');}else{a.mode='observe';a.keys.clear();}return;}
    say('靠近印石，朝钮顶走即可攀上去。匣盖下面也藏着东西。');
  }
  const hints:Record<typeof s.phase,[string,string]>={
    trial:['在废纸上试印','点击走向左侧印钮，或用 WASD 靠近并攀上。投分身可压平金色纸角。'],
    'trial-proof':['揭开试纸','走到试印旁的金色纸角，按 F 揭开，看看印面哪一角浅。'],
    choose:['在画上选一处落款','走近宣纸近角或远角的印石，按 F 选定位置。'],
    stamp:['压平纸角，再登印钮','G 投分身固定金色翘角。本体走上印钮压印。'],
    proof:['把这幅画揭起来','走到金色纸角按 F 揭纸。缺了一角，也可选择重印。'],
    lifting:['纸背离开书案','朱印显出来了。看看虾须。'],done:['案上留画','']};
  const game:ChapterGame={world:art.world,spawn,update,action,
    hint:()=>[hints[s.phase][0],time<noteUntil?note:hints[s.phase][1]],
    buttons:()=>{if(s.phase==='lifting'||s.phase==='done')return [];
      const b:[string,string][]=[['Space','弹跳']];
      if(s.phase==='stamp'||s.phase==='trial')b.push(['KeyG','分身压纸 G'],['KeyX','收回 X']);
      if(s.phase==='proof'&&!s.printed)b.push(['KeyR','重新蘸印 R']);
      b.push(['KeyF',s.phase==='choose'?'选此处 F':s.phase==='trial-proof'||s.phase==='proof'?'揭纸 F':'查看 F']);return b;},
    done:()=>s.phase==='done',records:()=>({'first-full':+s.clean,'hidden-die':+s.hidden,['position-'+s.station]:1}),
    result:()=>(s.clean?'首印四角齐全。':s.printed?'补印后，四角齐全。':'画角留着一方有缺口的朱印。')+(s.hidden?' 已收录匣底印面。':''),
    camera:(a,wide)=>{const end=wide||s.phase==='lifting',v=a.position,portrait=innerWidth/innerHeight<.78;
      const f=end?s.lift:0;const x=(portrait?v[0]*.80:v[0]*.30)*(1-f)+2*f,z=(portrait?v[2]*.8:v[2]*.35)*(1-f);
      const height=(portrait?7.1:6.2)+1.6*f;return [[x+(portrait?.12:1.05),height,z+(portrait?5.6:6.9)],[x,.14+f*.65,z-.56]];},
    checkpoint:()=>[...spawn],diagnostics:{state:s,stations:sealStations,corners:sealStations.map((_,i)=>sealCorner(i)),hiddenImprint,root:art.root}};
  return game;
});
