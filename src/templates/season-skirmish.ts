// 五座微缩展场、分身机关与动线为游戏演绎。
import type {Vec} from '../slime/types';
import {rng} from './random';

type Kind='relay'|'brake'|'arcs'|'shadow'|'ticket'|'crossing'|'speedtrap'|'beads'|'twins'|'town'|'shiplink'|'winterlight'|'starboard'|'counter'|'cableway'|'cartworks'|'dunes'|'returnmark'|'halves'|'nest'|'pennants'|'roster'|'pulseprint'|'samplebox'|'solstice'|'punchcard'|'canalcar'|'polarbay'|'weatherfile'|'ticketpress'|'starletter'|'iceribbon'|'speedruler'|'starplates'|'railpost'|'dustgrid'|'inletpress'|'roverpetal'|'blinkmap'|'dunevisor'|'moonorrery'|'spiralfilm'|'roofmooring'|'cooperdock';
export interface Exhibit {kind:Kind; name:string; lesson:string; middle:string; end:string; pads:string[]; sky:[string,string]; stone:string; trim:string;}
export const relayMaps:Record<string, Exhibit>={
  '1127':{kind:'relay',name:'群山之间的回音',lesson:'投一团分身给脚边的校音灯。',middle:'分身守住山腰发射碟，本体过桥到东侧接收室，再投一团接通下行。',end:'山后的三个站点接通了',pads:['校音灯','西站发射碟','东站接收碟','海岛站'],sky:['#172d50','#e2b08a'],stone:'#798e87',trim:'#ffc373'},
  '1128':{kind:'brake',name:'离月面最近的一瞬',lesson:'先在近侧遥测盘上投一次分身。',middle:'分身压住制动盘，飞行器沿捕获弧收紧。亮针进入金色刻度就回收；然后在另一侧锁定切点。',end:'飞行器沿着切线转入月轨',pads:['遥测盘','制动盘','切点灯','捕获窗'],sky:['#101936','#626b90'],stone:'#637186',trim:'#efbb68'},
  '1129':{kind:'arcs',name:'两条弧的交会',lesson:'从近地点投一枚校准分身。',middle:'站到外弧看内弧、站到内弧看外弧。可从任意一侧开始，隔着月球投出交叉视线。',end:'两条观测弧闭合成环',pads:['参考点','内弧测点','外弧测点','会合光标'],sky:['#102943','#627c95'],stone:'#667e90',trim:'#7de0d1'},
  '1130':{kind:'shadow',name:'留住一长一短两道影',lesson:'向表尺近端投一枚分身做记号。',middle:'圭表影头在长短刻度之间移动。短影进铜槽时投在西尺，长影入槽时投在东尺。',end:'长影和短影一并拓上铜盘',pads:['表尺原点','短影槽','长影槽','四时盘'],sky:['#75acbd','#fee4b9'],stone:'#bbaa82',trim:'#cc702f'},
  '1201':{kind:'ticket',name:'一张报单穿过大厅',lesson:'试投到收单盘，让柜台翻开号码牌。',middle:'把分身投进左侧登记盘，再把带单的分身收回。带它走过柜台，贴近右侧终端投单。',end:'传号旗翻起，铜锣应声',pads:['叫号盘','登记盘','撮合终端','开市锣'],sky:['#799a99','#f0d6af'],stone:'#879e94',trim:'#e49a55'}
};
const left:Vec=[-3.1,.04,-.7],right:Vec=[3.1,.04,-.7];
export class RelayCourse{
  readonly spec:Exhibit;
  readonly pads:Vec[];
  readonly done=new Set<number>();
  readonly lanes=new Set<number>();
  readonly phaseOffset:number;
  pending:{i:number;time:number}|null=null;
  // The west relay/receipt is a physical job. Recalling too early releases that job.
  westHeld=false;carrying=false;braked=false; returning=false;
  elapsed=0; retries=0; hint=''; brakeTime=0; order=0;
  constructor(day:string,seed:string,exhibit=relayMaps[day]){
    this.spec=exhibit;
    this.phaseOffset=rng(seed).range(0,Math.PI*2);
    this.pads=[[0,.04,4.7],[...left],[...right],[0,.04,-5.55]];
  }
  get sweep(){return (1-Math.cos(this.elapsed*1.2+this.phaseOffset))*.5;}
  get brake(){return (1-Math.cos(this.brakeTime*1.04))*.5;}
  available(i:number){return !this.done.has(i)&&(i===0||this.done.has(0)&&(i===1||i===2&&(this.spec.kind==='arcs'||this.done.has(1))||i===3&&this.done.has(1)&&this.done.has(2)));}
  reject(message:string){this.hint=message;return false;}
  cast(i:number,p:Vec){
    if(this.pending||this.returning||!this.available(i))return false;
    const t=this.pads[i],kind=this.spec.kind;
    if(Math.hypot(p[0]-t[0],p[2]-t[2])>7.15)return this.reject('再靠近一些，接应环超出了投射距离。');
    if((i===1||i===2)&&p[2]>2.7)return this.reject('先下到中场，接近有铜边的投射位。');
    if(i===1&&kind==='relay'&&p[0]>-1)return this.reject('沿西侧金线走到发射室。');
    if(i===2&&kind==='relay'&&(!this.westHeld||p[0]<1.35))return this.reject('让西站的分身留守，再从东侧接收室接通信号。');
    if(i===2&&kind==='brake'&&!this.braked)return this.reject('等制动标尺亮起，按回收锁定切线。');
    if((i===1||i===2)&&kind==='arcs'&&(i===1?p[0]<1.15:p[0]>-1.15))return this.reject('月体挡住同侧读数；从对面弧廊取交叉视线。');
    if(i===1&&kind==='shadow'&&this.sweep>.32)return this.reject('再等影头回到刻尺短端，铜槽会亮起。');
    if(i===2&&kind==='shadow'&&this.sweep<.68)return this.reject('等影头伸到刻尺长端，再留一团分身。');
    if(i===2&&kind==='ticket'&&(!this.carrying||Math.hypot(p[0]-t[0],p[2]-t[2])>2.2))return this.reject('收回左侧带单的分身，走到右侧终端前递交。');
    if(i===3&&p[2]>-2.1)return this.reject('走到远端亮起的交接线，再投最后一团。');
    this.pending={i,time:this.elapsed};this.hint='';return true;
  }
  update(dt:number,p:Vec,shots:readonly {phase:string;center:Vec}[]){
    this.elapsed+=dt;
    if(this.done.has(0)&&Math.abs(p[0])>1.2&&p[2]<2.7)this.lanes.add(Math.sign(p[0]));
    const anyAt=(i:number)=>shots.some(s=>s.phase==='active'&&Math.hypot(s.center[0]-this.pads[i][0],s.center[2]-this.pads[i][2])<.79&&Math.abs(s.center[1]-this.pads[i][1])<.85);
    if(this.westHeld){
      if(anyAt(1))this.brakeTime+=dt;
      else if(!this.done.has(2)&&['relay','brake','ticket'].includes(this.spec.kind)){
        // Physical clones return on their own or merge if the body steps on them.
        if(this.spec.kind==='ticket'){this.carrying=true;this.hint='分身带着报单回来了。';}
        else{this.done.delete(1);this.hint='分身离开了西侧接应位，可以原地补投。';}
        this.westHeld=false;this.pending=null;
      }
    }
    if(this.returning&&!shots.length)this.returning=false;
    if(!this.pending)return -1;
    const {i,time}=this.pending;
    if(anyAt(i)){
      this.pending=null;this.done.add(i);if(i===1){this.westHeld=true;this.brakeTime=0;}
      if((i===1||i===2)&&!this.order)this.order=i;
      this.hint=this.spec.pads[i]+'已收到分身';return i;
    }
    if(this.elapsed-time>4){this.pending=null;this.hint='分身偏离了接应环，可以原地再投。';}
    return -1;
  }
  recall(){
    const kind=this.spec.kind;
    if(this.westHeld&&!this.done.has(2)){
      if(kind==='relay'){this.done.delete(1);this.hint='西站已松开，重新留一团分身守住发射碟。';}
      if(kind==='ticket'){this.carrying=true;this.hint='报单收回了，带到右侧柜台。';}
      if(kind==='brake'){
        this.braked=this.brake>=.64;
        if(!this.braked){this.done.delete(1);this.retries++;this.hint='松得早了，在原制动盘重试。';}
        else this.hint='制动窗口已锁定，去捕获弧点亮切点灯。';
      }
    }
    this.westHeld=false;this.pending=null;this.returning=true;
  }
  retry(){
    if(this.westHeld&&!this.done.has(2)&&['relay','brake','ticket'].includes(this.spec.kind))this.done.delete(1);
    this.westHeld=false;this.pending=null;this.returning=false;this.retries++;this.hint='已回到本段引导灯，完成的观测仍在。';
  }
  get instruction(){
    if(!this.done.has(0))return this.spec.lesson;
    if(this.done.size===4)return this.spec.end;
    if(this.done.has(1)&&this.done.has(2))return '去远端金环投射，点亮'+this.spec.pads[3]+'。';
    if(this.spec.kind==='brake'&&this.westHeld)return this.brake>=.64?'现在回收！切线落入金色窗口。':'保持分身压盘，看指针靠近金色刻度…';
    return this.spec.middle;
  }
}
