import type {Vec} from '../slime/types';
import {ArenaEncounter, type RpgDayConfig} from './january-rpg';

/** The workshop, waterways, polar chart and tunnelling controls are fictional miniature sets. */
export const expeditionDays = ['1127','1128','1129','1130','1201'] as const;
export type ExpeditionDay = typeof expeditionDays[number];
export function isExpedition(day:string): day is ExpeditionDay {
  return expeditionDays.some(value=>value===day);
}
const names:Record<ExpeditionDay,readonly string[]>={
  '1127':['冰水槽','热浴槽','两点间的校线'],
  '1128':['迎风岬口','背风小湾','海峡出口'],
  '1129':['雪鞍','冰脊','极点航迹'],
  '1130':['上游分汊','沙洲外弯','码头深槽'],
  '1201':['西侧拱脚','东侧拱脚','最后一道岩芯'],
};
const descriptions:Record<ExpeditionDay,string>={
  '1127':'沿铜尺在冷蓝和炉红两只槽之间取温。摊开身体能让液柱更快稳定。',
  '1128':'帆布会先绷紧，浪峰随后过岬。轻舟趁潮闪避穿标，主帆摊开稳舵过标。',
  '1129':'看日影扫过冰脊。走到影尖旁，借风弹起，或摊开身体在背风面稳住航向。',
  '1130':'用测深锤探水，听出深槽，再沿深水一侧领船通过弯道。',
  '1201':'先在侧壁压稳支护，再移到另一端的岩芯。快钻借冲势推进，稳守路线可以压住钻架慢慢吃进岩层。',
};
type Body = {guard:boolean; airborne:boolean; dashing:boolean};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export class Expedition extends ArenaEncounter {
  readonly day:ExpeditionDay;
  fill=0;
  sounded=false;
  braced=false;
  sampled=false;
  depth=0;
  lastProbe=0;
  probeTime=-10;
  /** Elapsed time within one tide or sun sweep. Slow enough to read on a phone. */
  elapsed=0;
  private readonly expeditionRules:RpgDayConfig;
  constructor(day:ExpeditionDay,seed:string,config:RpgDayConfig){
    super(config.arena,seed,config);this.day=day;
    this.expeditionRules={...config,rounds:3};
    this.layout.branches[1][1]=0;
  }
  override get rules(){return this.expeditionRules;}
  get title(){return names[this.day][Math.min(this.round,2)];}
  get opening(){return descriptions[this.day];}
  get bank(){return (this.round%2===0?this.initialSide:-this.initialSide) as -1|1;}
  override get z(){return .1-this.round*3.15;}
  get column(){return [.08,.93,.50][Math.min(this.round,2)];}
  get tide(){return .5+.5*Math.cos(this.elapsed*1.05+this.initialSide*.8);}
  get shadow(){return Math.sin(this.elapsed*.57+this.initialSide)*1.55;}
  get shoreX(){return this.bank*(this.round===1?1.65:2.45);}
  get sampleSpot():Vec{
    if(this.day==='1127')return [this.round===0?-3.5:this.round===1?3.5:0,0,this.z];
    return [-this.shoreX,0,this.z+.95];
  }
  override get safeSpot():Vec{
    switch(this.day){
      case '1127': return [0,0,this.z-.8];
      case '1129': return [this.shadow,0,this.z];
      default:return [this.shoreX,0,this.z];
    }
  }
  get nextSpot():Vec{
    if(this.day==='1127'&&!this.sampled||this.day==='1201'&&!this.braced)return this.sampleSpot;
    if(this.day==='1130'&&!this.sounded)return [0,0,this.z+1.65];
    if(this.day==='1130'&&this.route<0&&this.depth<3)return [this.shoreX,0,this.z+1.65];
    return this.safeSpot;
  }
  get hint(){
    switch(this.day){
      case '1127':return this.sampled?(this.route<0?'样液已封入细管，回中央刻线按 J 留样。':'回中央刻线摊平身体，再按 J 留下宽刻印。'):
        '到'+['左边冰水槽','右边热浴槽','中间混合槽'][this.round]+'等液柱稳定，再按 J 取温。';
      case '1128':return (this.shoreX<0?'从左舷':'从右舷')+'过这一对浮标。帆垂下时'+(this.route<0?'按闪避再按 J。':'摊开稳舵，按 J。');
      case '1129':return '跟随投在雪上的影尖。'+(this.route<0?'在影尖旁起跳，按 J 越岭。':'在影尖旁摊开至航向稳定，按 J 记下。');
      case '1130':return this.sounded?('上次探得'+this.depth+'寻。'+(this.depth<3?(this.route<0?'换到对岸再放一次锤。':'听号换到对岸深槽。'):'顺这一岸往前。')+'进入浮标按 J 领船。'):'走近任一岸的黑白测深杆，按 J 放锤。';
      case '1201':return this.braced?'支撑已扣住。到对面钻头'+(this.route<0?'用闪避发力，按 J 推进。':'摊开压稳，按 J 推进。'):'在亮起的拱脚摊开身体，再按 J 扣住支撑。';
    }
  }
  override advance(dt:number,p:Vec,guard:boolean,_evading:boolean){
    if(this.phase!=='duel')return;
    this.elapsed+=dt;this.clock=(this.elapsed%6)/6;
    if(this.day==='1127'&&!this.sampled){
      const rate=this.near(p,this.sampleSpot,1.3)?(guard?2.4:this.route<0?1.1:.74):-.7;
      this.fill=clamp(this.fill+dt*rate);
    }else if(this.day==='1129'||this.day==='1201'){
      const onMark=this.near(p,this.nextSpot,1.65);
      this.fill=clamp(this.fill+(guard&&onMark?1.5:-.8)*dt);
    }
  }
  private slip(msg:string){
    this.message=msg;this.errors++;this.health--;
    if(!this.health)this.phase='lost';
    return false;
  }
  override strike(p:Vec,body:Body){
    if(this.phase!=='duel')return false;
    if(this.day==='1127'&&!this.sampled){
      if(!this.near(p,this.sampleSpot,1.4)||this.fill<.94)return this.slip('液柱还在动，留在槽边再取一次。');
      this.sampled=true;this.message='一滴样液锁进细管，回到中央落刻。';return false;
    }
    if(this.day==='1130'&&(!this.sounded||Math.abs(p[2]-(this.z+1.65))<.79)){
      if(Math.abs(Math.abs(p[0])-Math.abs(this.shoreX))>.98||Math.abs(p[2]-(this.z+1.65))>1.2)
        return this.slip('锤绳没过船舷。先走到黑白测深杆旁。');
      this.sounded=true;this.lastProbe=Math.sign(p[0]);this.probeTime=this.elapsed;
      this.depth=this.lastProbe===this.bank?4+this.round:2;
      this.message='锤绳放下了 '+this.depth+' 寻。';return false;
    }
    if(this.day==='1201'&&!this.braced){
      if(!this.near(p,this.sampleSpot,1.5)||!body.guard||this.fill<.6)return this.slip('先在亮起的底脚摊开，等吊架落座。');
      this.braced=true;this.fill=0;this.message='支护已咬合，去对侧推钻架。';return false;
    }
    const target=this.safeSpot;
    if(Math.hypot(p[0]-target[0],p[2]-target[2])>1.48)return this.slip(this.day==='1130'?'船底擦到浅滩，试另一岸。':'身体离开了落点，向机件靠近一些。');
    if(this.day==='1127'&&this.route>0&&!body.guard)return this.slip('摊开压稳铜尺，刻印才会齐。');
    if(this.day==='1130'&&this.route<0&&this.depth<3)return this.slip('快舵要亲手确认深槽，到对岸再下一次锤。');
    if(this.day==='1128'&&(this.tide>.63||!(this.route<0?body.dashing:body.guard)))
      return this.slip(this.tide>.63?'帆还在吃风。等帆落下来再过岬。':'轻舟借一次闪避，主帆摊开稳舵。');
    if(this.day==='1129'&&!(this.route<0?body.airborne:body.guard&&this.fill>.55))
      return this.slip('还没借到风。跟上影尖，再起跳或压稳航向。');
    if(this.day==='1201'&&!(this.route<0?body.dashing:body.guard&&this.fill>.6))
      return this.slip('钻架没有吃进岩层。快钻要冲势，稳守要压实。');
    this.round++;this.health=3;this.fill=0;this.sounded=this.braced=this.sampled=false;
    this.message=this.round===3?'这一段完成了，去尽头收下最后一笔。':names[this.day][this.round]+'已显现。';
    if(this.round>=3)this.phase='finale';
    return true;
  }
}
