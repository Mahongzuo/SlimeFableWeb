import {newyearControls,isNewyearDay,operateNewyear,newyearBeam,newyearCadence} from './newyear-defense';
import {monthendControls,isMonthendDay,monthOperate,monthBeam,monthCadence} from './monthend-defense';
import {yearendControls,isYearendDay,operateYearend,beamYearend,cadenceYearend} from './yearend-defense';
import {midControls,isMidDay,midOperate,midBeam,midCadence} from './midwinter-defense';
import {winterControls,winterDay,operateWinter,winterBeam,winterCadence} from "./winter-defense";
/** Five fictional tabletop mechanisms. Each is operated while the waves are on the road. */
export const defenseControls = {
  ...newyearControls,...monthendControls,...yearendControls,...midControls,...winterControls,
  '1127': {name:'切换母线', guide:'指针充满后切换母线。两排塔交替蓄电，先架好下一排塔，再给它送电。', ready:'母线蓄满', used:'储能接入', color:'#f2b54d'},
  '1128': {name:'转动引航灯', guide:'在外海和内港之间转动灯罩。进入光道的涌浪会减速，可以腾出塔位守另一边。', ready:'引航灯点亮', used:'光道已转向', color:'#ec9765'},
  '1129': {name:'合拢保温罩', guide:'阵风接近时合罩，暖流会留在塔旁数秒。先在罩内架塔，再借热量处理下一批。', ready:'保温毯待合拢', used:'罩内升温', color:'#f3bb66'},
  '1130': {name:'开均压阀', guide:'两舱之间开阀时，前后两个相邻货包会平均分担余下的压力。先处理一路，再放开阀门。', ready:'双舱阀就绪', used:'两舱已均压', color:'#8bdfd5'},
  '1201': {name:'悬停扫尘', guide:'让月面着陆器悬停。等尘团进入半程后的落区再扫，近地点的尘团会同时退回一段。', ready:'落区可悬停', used:'着陆器反推', color:'#e1bd80'},
  '1202': {name:'架起接力灯',guide:'在本段相邻两座塔分别架风塔和水塔，再架接力灯。前塔照亮的月尘会由后塔一次扫净。',ready:'灯杆待接续',used:'月车灯线接通',color:'#ffd684'},
  '1203': {name:'放行洞口',guide:'两端列车轮流到洞口。放行会改变信号方向，另一端的雾团在洞外等候，给对面腾出接车时间。',ready:'双端灯待切换',used:'通行方向已换',color:'#e4a571'},
  '1204': {name:'扫寻伞影',guide:'最后点过的单号塔位负责近场，双号负责远场。扫寻会标亮光带内的风团，已标亮的目标可被任意塔迅速处理。',ready:'灯阵待扫寻',used:'探照灯已扫过',color:'#f3c56b'},
  '1205': {name:'放行缓存',guide:'风塔收存过桥回执，最多留四份。两路同时拥入时放出缓存，一份回执便能消化一批积压。',ready:'缓存口可放行',used:'缓存队列已放行',color:'#9ee1c8'},
  '1206': {name:'合拢对接爪',guide:'风塔先为目标校姿。等校好姿的目标进入中段，再合爪接收；校姿只在短时间内有效。',ready:'对接环可合拢',used:'抱爪已闭合',color:'#e4bb84'},
} as const;
export type DefenseDay = keyof typeof defenseControls;
export function isSeasonDefense(day:string):day is DefenseDay{return Object.hasOwn(defenseControls,day);}
interface Packet {distance:number;route:number;speed:number;slow:number;work:number;connected:boolean;lit?:boolean;}
export class DefenseControl {
  count=0; lock=0; active=0; side=0; hits=0;
  focus=0; reserve=0; linked=false;
  constructor(readonly day:DefenseDay){}
  get spec(){return defenseControls[this.day];}
  tick(dt:number){this.lock=Math.max(0,this.lock-dt);this.active=Math.max(0,this.active-dt);}
  operate(packets:Packet[],total:(route:number)=>number){
    if(this.lock>0)return false;
    this.count++;this.lock=4;this.side=1-this.side;this.active=this.day==='1129'?5:3;
    const live=packets.filter(p=>!p.connected&&p.work>0);
    if(isNewyearDay(this.day))operateNewyear(this.day,this,live,total);
    if(isMonthendDay(this.day))monthOperate(this.day,this,live,total);
    if(isYearendDay(this.day))operateYearend(this.day,this,live,total);
    if(isMidDay(this.day))midOperate(this.day,this,live,total);
    if(winterDay(this.day))operateWinter(this.day,this,live,total);
    if(this.day==='1203')for(const p of live){
      if(p.route%2!==this.side&&p.distance<total(p.route)*.57){p.slow=3.7;this.hits++;}
    }
    if(this.day==='1204')for(const p of live){
      const fraction=p.distance/total(p.route);
      if(Math.abs(fraction-(this.focus%2?.73:.24))<.27){p.lit=true;this.hits++;}
    }
    if(this.day==='1205')for(const p of live){
      if(!this.reserve)break;
      this.reserve--;p.work=0;this.hits++;
    }
    if(this.day==='1206')for(const p of live){
      if(p.slow>0&&p.distance/total(p.route)>.22){p.work=0;this.hits++;}
    }
    if(this.day==='1130'&&live.length>=2){
      const a=live[0],b=live[1],shared=Math.max(0,(a.work+b.work)*.5-1);
      a.work=b.work=shared;this.hits+=2;
    }
    if(this.day==='1201')for(const p of live){
      const length=total(p.route);
      if(p.distance>=length*.42){p.distance=Math.max(0,p.distance-length*.25);p.slow=2.8;this.hits++;}
    }
    return true;
  }
  // Shape the incoming wave, so the operator's window changes with this site.
  release(serial:number,wave:number,packetId=serial){
    if(wave<2)return {load:0,spacing:0,speed:1};
    if(isNewyearDay(this.day))return newyearCadence(this.day,serial,packetId);
    if(isMonthendDay(this.day))return monthCadence(this.day,serial);
    if(isYearendDay(this.day))return cadenceYearend(this.day,serial);
    if(isMidDay(this.day))return midCadence(this.day,serial);
    if(winterDay(this.day))return winterCadence(this.day,serial);
    switch(this.day){
      case '1202':return {load:serial%3===2?1:0,spacing:0,speed:1};
      case '1203':return {load:0,spacing:serial%4<2?-.42:.42,speed:serial%3===0?1.14:.97};
      case '1204':return {load:serial%2===0?1:0,spacing:0,speed:1.04};
      case '1205':return {load:0,spacing:serial%4<3?-.45:1.35,speed:1};
      case '1206':return {load:serial%3===0?1:0,spacing:serial%2===0?-.36:.36,speed:1};
      case '1127':return {load:serial%4===0?1:0,spacing:0,speed:1};
      case '1128':return {load:0,spacing:0,speed:serial%3===0?1.23:.95};
      case '1129':return {load:0,spacing:serial%3===0?-.62:serial%3===2?.62:0,speed:1};
      case '1130':return {load:serial%2===0?1:0,spacing:serial%2===0?-1.17:1.17,speed:1};
      case '1201':return {load:1,spacing:0,speed:.97};
    }
  }
  beam(pad:number,kind:'water'|'wind',packet:Packet,neighbors:Packet[]=[]){
    if(isNewyearDay(this.day))return newyearBeam(this.day,kind,packet);
    if(isMonthendDay(this.day))return monthBeam(this.day,this,kind,packet);
    if(isYearendDay(this.day))return beamYearend(this.day,this,kind,packet);
    if(isMidDay(this.day))return midBeam(this.day,this,kind,packet);
    if(winterDay(this.day))return winterBeam(this.day,this,kind,packet,neighbors);
    if(this.day==='1204'&&packet.lit)return 1.25;
    if(this.day==='1205'&&kind==='wind')this.reserve=Math.min(4,this.reserve+1);
    if(this.day==='1206'&&kind==='wind')packet.slow=3;
    if(this.active<=0)return 0;
    if(this.day==='1202'&&this.linked&&Math.floor(pad/2)===Math.floor(this.focus/2)){
      if(kind==='wind'){packet.lit=true;packet.slow=2.6;this.hits++;}
      else if(packet.lit){this.hits++;return 2;}
    }
    if(this.day==='1203'&&packet.route%2!==this.side){packet.slow=2.8;this.hits++;}

    if(this.day==='1127'&&pad%2===this.side){this.hits++;return 1.4;}
    if(this.day==='1128'&&(packet.route+this.side)%2===0){packet.slow=3;this.hits++;return .55;}
    if(this.day==='1129'&&kind==='water'){this.hits++;return 1.2;}
    return 0;
  }
}
