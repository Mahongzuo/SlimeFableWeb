import {jan01Chapters} from '../../content/jan01-chapters';
import {openChapter} from './jan01-chapter';
import {bookLight,makeBook} from '../themes/jan01-book';
import {BookRun,bookCheckpoints,bookLayout,bookSpawn,bridgeX} from '../templates/jan01-book';
import type {Vec} from '../slime/types';
import {Save} from '../game/save';

const spec=jan01Chapters.find(s=>s.template==='jan01-book')!;
openChapter({...spec,year:1823,gate:2,opening:'翻开这本立体书',look:bookLight},stage=>{
  const seed=new URLSearchParams(location.search).get('practice')||spec.id;
  const run=new BookRun(bookLayout(seed)),art=makeBook(stage,run);
  let lastAngle=-2,windLift=false,notice='',noticeUntil=0,now=0;
  function hint():[string,string]{
    if(run.page===3)return ['纸景归入书页','屋顶、窗和树影落在同一幅画里。'];
    if(now<noticeUntil)return ['书签夹在这一页',notice];
    if(run.page===0)return ['沿线装书脊向上爬','WASD 或轻点纸面移动。持续推向带针脚的立边，身体会贴上去。'];
    if(run.page===1)return ['风起来了，选一道折痕','左行可攀过背风折页；右侧金纸扬起时，连续三次跳跃展开伞面。'];
    return ['踩住朱红书签',run.press>0?'压住片刻，让整页摊平。':'去末页的燕尾书签上，让纸景合成一幅插画。'];
  }
  return {
    world:art.world,spawn:bookSpawn,diagnostics:{run,art},
    update(actor,dt,time){
      now=time;
      const response=run.read({position:actor.position,clinging:!!actor.cling,gliding:actor.umbrellaOpen,grounded:actor.grounded},dt);
      const angle=art.animate(time);
      // The moving fold supplies the same slope to both the controller and fluid worker.
      if(Math.abs(lastAngle-angle)>.022){
        const length=2.5*Math.cos(angle);
        actor.setDynamicSurfaces([{min:[bridgeX-.925,-length],max:[bridgeX+.925,0],
          height:1.24+2.5*Math.sin(angle),slope:[0,-Math.tan(angle)]}]);
        lastAngle=angle;
      }
      const [x,,z]=actor.position;
      if(actor.grounded)windLift=false;
      if(run.page===1&&!windLift&&actor.umbrellaOpen&&Math.abs(x-bridgeX)<1.35&&z<-.35&&z>-4.8&&angle>.22){
        actor.velocity[1]=Math.max(actor.velocity[1],2.05);windLift=true;
      }
      if(response==='recover'){notice='落进了书沟。翻过的页还在，沿书签再出发。';noticeUntil=time+1.65;}
      if(response==='turn')actor.setMood('Happy',.75);
      if(response==='finish'){actor.keys.clear();actor.mode='observe';actor.decals.reset();actor.setMood('Bliss',2);}
    },
    action(){},hint,buttons:()=>[['Space','弹跳 / 展伞']],
    done:()=>run.page===3&&run.finishTime>2.35,
    checkpoint:()=>[...bookCheckpoints[Math.min(2,run.page)]],
    records:()=>({'clean':Number(!run.fallen),'fold-flower':run.flowers&1,'wind-flower':Number(!!(run.flowers&2))}),
    result:()=>{
      const key=spec.id+(new URLSearchParams(location.search).has('practice')?'-practice':'');
      const records=new Save().data.life.records;
      const collected=Number(!!records[key+'-fold-flower'])+Number(!!records[key+'-wind-flower']);
      return [run.fallen?'已夹好末页书签':'全程未落入书沟',run.flowers&1?'收下赤色压花':'',run.flowers&2?'收下金色压花':'','累计压花 '+collected+'/2'].filter(Boolean).join(' · ');
    },
    camera(actor,wide){
      const [x,,z]=actor.position,narrow=innerWidth<650;
      if(wide||run.page===3)return [[narrow?1.2:2.3,narrow?13:8.8,narrow?-.5:-2],[0,.8,-7.95]] as [Vec,Vec];
      const follow=Math.max(-7,Math.min(5.5,z)),baseX=x*(narrow?.52:.32);
      return [[baseX+(narrow?1.1:2.25),narrow?7.5:5.0,follow+(narrow?10.3:6.55)],
        [baseX,.78,follow-(narrow?.95:1.6)]] as [Vec,Vec];
    },
  };
});
