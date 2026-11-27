import {RelayCourse,type Exhibit} from './season-skirmish';
import type {Vec} from '../slime/types';

export const yearendRelayMaps:Record<string,Exhibit&{repair:string}>={
 '1217':{kind:'pennants',name:'从一只旗耳到另一只',lesson:'将分身投在庆典陈列柜外的线轴上。',middle:'任选一侧旗耳投分身留住旗头。本体沿金环依次走过两只挂钩，再向另一侧旗耳投分身。',repair:'彩绳垂下时回头找亮着的挂钩。第一只靠近投出的旗头，第二只在对面。',end:'庆典彩旗展开，帷布揭开纪念铭牌',pads:['穿线轴','左旗耳','右旗耳','揭幕环'],stone:'#8c978b',trim:'#e9ad66',sky:['#638f9d','#f3c9a0']},
 '1218':{kind:'roster',name:'卷起的一百扇小窗',lesson:'先向名录展柜的导纸轮投一团分身。',middle:'任选一侧卷轴投分身。等名录铺到中央金线，按 X 收回，在另一端近处投进锁纸轮。在第一只卷轴附近时放卷较慢。',repair:'松手太早时在原轴补投，看见金色夹线亮起再回收。去对面时要带着刚收回的纸签。',end:'两卷接成一整面百格纪念墙',pads:['导纸轮','左卷轴','右卷轴','展墙扣'],stone:'#ab8c6e',trim:'#eed196',sky:['#818d94','#eac8ab']},
 '1219':{kind:'pulseprint',name:'听见的星，在纸上跳',lesson:'投向记录盘，给观测台留下一枚起始墨点。',middle:'两侧纸列各收一种节拍。听到下行音、光点进入低刻度时投左列；听到上行音、光点进入高刻度时投右列。贴近相应的墨盘，容易看准。两列先后自选。',repair:'整列没压出墨迹就稍等下一拍，观察左低右高的标尺。走近墨盘会放宽窗口。',end:'记录纸缓缓走出，脉冲留下两列印迹',pads:['起始墨点','左列低拍','右列高拍','出纸杆'],stone:'#5b7479',trim:'#f1bf75',sky:['#20394b','#90a5a1']},
 '1220':{kind:'samplebox',name:'展窗内的第一道月色',lesson:'先点亮样品展窗外的观察灯。',middle:'先投任一侧套环，让分身保持托力。本体走到对侧金色脚印，等两道定位线重合，再向第二只套环投分身。',repair:'套环松开时从同侧重投，第一团要留在架上。两道线没齐时站稳在另一侧脚印。',end:'双环同时压稳，样品匣沿衬垫滑出',pads:['观察灯','左托环','右托环','样匣拉扣'],stone:'#92aaa9',trim:'#e4c990',sky:['#7b9fa9','#dce3d0']},
 '1221':{kind:'solstice',name:'第一次留刻，第二次量影',lesson:'向石圭近处的原点投一枚分身。',middle:'先投任一边石尺，留下参照刻。走到中央比对点，等影尖伸到最远的金线再按 X 收回。在另一侧投出第二枚量刻。',repair:'没有带回比对值时，重新留刻，站进两尺之间的金环，等影尖伸长再按 X。',end:'两条冬至影线重合，刻痕拓成金印',pads:['石尺原点','西尺留刻','东尺留刻','拓印钮'],stone:'#ab9f80',trim:'#dbad64',sky:['#8eafb7','#eed9b4']}
};
export class YearendReception extends RelayCourse{
 launches=0;first=0;held=0;progress=0;hooks=0;token=false;onMark=false;
 constructor(readonly day:string,seed:string){super(day,seed,yearendRelayMaps[day]);}
 get hook():Vec{const s=this.first===2?-1:1;return this.hooks===0?[s*-.94,0,1.16]:[s*1.51,0,-2.07];}
 get alignmentSpot():Vec{return [this.first===2?-1.82:1.82,0,.05];}
 get signal(){return .5+.5*Math.sin(this.elapsed*1.27+this.phaseOffset);}
 get beat(){return this.signal<=.34?1:this.signal>=.66?2:0;}
 get ready(){return this.day==='1218'?this.progress>=.83&&this.progress<=1.64:this.day==='1221'?this.onMark&&this.signal>=.72:this.progress>=.85;}
 override available(i:number){return !this.done.has(i)&&(i===0||this.done.has(0)&&(i===1||i===2||i===3&&this.done.has(1)&&this.done.has(2)));}
 override cast(i:number,p:Vec){
   const other=(i===1||i===2)&&this.first&&i!==this.first,d=this.day;
   if(other&&d==='1217'&&this.hooks<2)return this.reject('先沿正在发亮的两个旗钩串起彩绳。');
   if(other&&(d==='1218'||d==='1221')&&!this.token)return this.reject(d==='1218'?'金线对齐后按 X 取回纸签。':'站进比对环，影尖最长时按 X。');
   if(other&&d==='1218'&&Math.hypot(p[0]-this.pads[i][0],p[2]-this.pads[i][2])>2.42)return this.reject('带纸签靠近对侧卷轴，再锁住纸边。');
   if(other&&d==='1220'&&(!this.held||!this.ready))return this.reject('第一团留下托环，本体在对侧金色脚印上等定位线合拢。');
   if((i===1||i===2)&&d==='1219'){
     const close=Math.hypot(p[0]-this.pads[i][0],p[2]-this.pads[i][2])<1.54;
     if(i===1?this.signal>(close?.54:.34):this.signal<(close?.46:.66))return this.reject('等下一拍走进'+(i===1?'低':'高')+'刻度。');
   }
   const ok=super.cast(i,p);if(ok)this.launches++;return ok;
 }
 override update(dt:number,p:Vec,shots:readonly {phase:string;center:Vec}[]){
   const landed=super.update(dt,p,shots);if((landed===1||landed===2)&&!this.first){this.first=landed;this.held=landed;}
   const unfinished=this.first&&!(this.done.has(1)&&this.done.has(2));
   if(this.held&&unfinished){
     const anchor=this.pads[this.held],active=shots.some(s=>s.phase==='active'&&Math.hypot(s.center[0]-anchor[0],s.center[2]-anchor[2])<.79);
     if(!active&&this.day!=='1219')this.release();
     if(active&&this.day==='1217'&&this.hooks<2&&Math.hypot(p[0]-this.hook[0],p[2]-this.hook[2])<.87)this.hooks++;
     if(active&&this.day==='1218')this.progress=(this.progress+dt*(Math.abs(p[0]-anchor[0])<1.45?.53:.94))%2.15;
     if(active&&this.day==='1220')this.progress=Math.min(1,Math.max(0,this.progress+dt*(Math.hypot(p[0]-this.alignmentSpot[0],p[2]-this.alignmentSpot[2])<1.13?1.48:-.63)));
     if(active&&this.day==='1221')this.onMark=Math.hypot(p[0],p[2]+.25)<1.13;
   }
   return landed;
 }
 private release(){this.done.delete(this.first);this.first=0;this.order=0;this.held=0;this.progress=0;this.hooks=0;this.onMark=false;this.hint='留守机关松开了，可从本段重新投。';}
 override recall(){
   if(this.held&&!(this.done.has(2)&&this.done.has(1))&&this.day!=='1219'){
     if((this.day==='1218'||this.day==='1221')&&this.ready){this.token=true;this.held=0;this.hint='记号已随分身收回，去另一端完成比对。';}
     else{this.release();this.retries++;}
   }
   super.recall();
 }
 override retry(){if(this.held&&!(this.done.has(1)&&this.done.has(2))&&this.day!=='1219')this.release();super.retry();}
 override get instruction(){
   if(this.held&&!(this.done.has(1)&&this.done.has(2))){
     if(this.day==='1217')return this.hooks<2?'旗头已挂住。沿金环穿过第 '+(this.hooks+1)+' 只旗钩。':'彩绳已穿好，向对侧旗耳投分身。';
     if(this.day==='1218')return this.ready?'两卷对上金线！按 X 取回纸签。':'留守卷轴，等纸边进入金线再收回。';
     if(this.day==='1220')return this.ready?'两线已合，向对侧套环投分身。':'在对侧金色脚印站稳　'+Math.floor(this.progress*100)+'%';
     if(this.day==='1221')return !this.onMark?'参照刻已留，走到中央比对点。':this.ready?'影尖抵达最长线。按 X 收回。':'留在比对点，观察慢慢伸长的影尖。';
   }
   return super.instruction;
 }
}
