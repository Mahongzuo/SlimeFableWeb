// 纸卡、展窗与分身接力均为虚构的参观活动。
import {RelayCourse,type Exhibit} from './season-skirmish';
import type {Vec} from '../slime/types';

interface RelayDesign extends Exhibit {repair:string;}
export const monthendRelayMaps:Record<string,RelayDesign>={
 '1222':{kind:'punchcard',name:'光穿过的那一行',lesson:'向纸带入口投第一团分身。',middle:'任选读头投分身放卷。等游标落在中央金框，按 X 带回读到的孔列，再贴近对侧读头投递。',repair:'过了金框可等下一行；过早收回时在原读头补投。',end:'穿孔纸带接成一条亮着的长句',pads:['入带夹','左读头','右读头','出带轮'],stone:'#96a8a1',trim:'#efbf71',sky:['#5e8086','#dbd9bb']},
 '1223':{kind:'canalcar',name:'三幅水乡，坐进一扇车窗',lesson:'将分身投进车厢的检票匙孔。',middle:'将第一团留在任一端窗扣，本体依次进两处金环取桥影和白墙的倒影，向另一窗扣投分身拼成窗景。',repair:'窗只显一半时沿发光金环补取另一幅景。分身合回时重新挂窗扣。',end:'一扇车窗里驶过小桥与河埠',pads:['检票口','西侧窗扣','东侧窗扣','移景把手'],stone:'#927c67',trim:'#edb77a',sky:['#819d9d','#e7d7ba']},
 '1224':{kind:'polarbay',name:'冰上的两扇暖窗',lesson:'向踏雪入口的灯牌投一团分身。',middle:'投住一侧窗台，沿金环走入背风雪窝。本体在雪窝停稳，等暖色升满再投另一侧窗。',repair:'暖色退下时回金环站稳；首团分身要留在窗台。',end:'两列暖窗映进极昼的冰面',pads:['入口灯牌','左暖窗','右暖窗','灯影投影架'],stone:'#a7c2c2',trim:'#ffc57a',sky:['#608da5','#dedfcd']},
 '1225':{kind:'weatherfile',name:'四枚天气签的轮值柜',lesson:'先投到取签盘，翻开空白天气簿。',middle:'任选半柜投分身夹住两张天气签，依次踏过日云两枚印位，按 X 把签取回，去对侧半柜投存。',repair:'收签前要看见两处印位都点亮。在金环内盖好缺的印，再回收。',end:'四枚天气签展开为一只转动的天气柜',pads:['取签盘','晴云签夹','风雨签夹','展签扣'],stone:'#9daea1',trim:'#ebbc72',sky:['#70979e','#e9dcae']},
 '1226':{kind:'ticketpress',name:'一张票穿过三座城',lesson:'把分身投到柜头的取票盘。',middle:'先投一端车票夹，按 X 把空票取回。带票绕到中央换乘章的金环，在那里站稳盖章后交到对侧。',repair:'章没有落下时须先回收票，再站进换乘章下的金环等印泥压实。',end:'三城票缀成一张长折票',pads:['取票盘','西端票夹','东端票夹','折票摇柄'],stone:'#b09a80',trim:'#ebc481',sky:['#768e93','#efcfad']},
 '1227':{kind:'starletter',name:'从纸角牵出的星图',lesson:'向手稿的压纸石投下一团分身。',middle:'让分身压住任一页角，沿金色星点从内向外走出三段折线，再向对面页角投分身把纸铺平。',repair:'星线断在何处就回当前金环；两个页角都要压好。',end:'手稿页上方浮出一张金线星图',pads:['压纸石','左页角','右页角','展稿夹'],stone:'#b19e7f',trim:'#f0bc74',sky:['#4c637c','#c8baa7']},
 '1228':{kind:'iceribbon',name:'在冰丝带的背面系灯',lesson:'向冰边灯带的第一只扣环投分身。',middle:'把灯头挂在任一侧，先穿过弯道的第一只金环，再在第二只金环停稳，将绷直的灯绳投到另一侧。',repair:'灯绳还松时沿指引依次过弯，并在第二只金环停住等绳绷紧。',end:'看台边的冰丝带逐段点亮',pads:['灯带扣','内侧灯头','外侧灯头','合灯钮'],stone:'#a4bbca',trim:'#ffc792',sky:['#546681','#c0c9d3']},
 '1229':{kind:'speedruler',name:'车鼻旁的两排流光',lesson:'投到展台首尺，点亮读数列。',middle:'两列速度标从车尾向车头漂移。左尺等指示点进低格、右尺等进高格，再分别投分身留读数。两尺可任选起手。',repair:'错过读数可等下一列；走近相应的尺，会更容易读准。',end:'银色车模从两列光标间滑过',pads:['首尺','低格尺','高格尺','亮轨终尺'],stone:'#859aa1',trim:'#e5bd7b',sky:['#537887','#caded4']},
 '1230':{kind:'starplates',name:'交给另一颗星的观测片',lesson:'先投向沙盘入口的底片夹。',middle:'任投一端展座挂好观测片。本体走到中央相框，在两片影像重合时按 X，贴近另一端展座投出交换。',repair:'回收时要同时站在中央亮环、等光点进入金区。错过就留在原地等下一圈。',end:'两张观测片合出双星纪念图',pads:['底片夹','蓝星展座','金星展座','观测相框'],stone:'#8497a3',trim:'#e1be7e',sky:['#253f60','#9caaad']},
 '1231':{kind:'railpost',name:'把年末的里程盖成一幅图',lesson:'向地图册第一枚空印格投出分身。',middle:'任选一端印台投分身蘸色。依次走过两个城印再按 X 带回叠色图案，贴近另一端落章。起手侧决定城印顺序。',repair:'没带回叠色时，看地图上剩余的金环，从上一枚城印接着走。',end:'扇面展开，三城年印接成新年图',pads:['空印格','朱砂印台','青色印台','新年图扣'],stone:'#bc9c7e',trim:'#f7bb70',sky:['#786e80','#f0c39c']}
};
export class MonthendReception extends RelayCourse{
 launches=0;first=0;held=false;token=false;steps=0;fill=0;
 constructor(readonly day:string,seed:string){super(day,seed,monthendRelayMaps[day]);}
 get trail(){return ({'1223':2,'1225':2,'1227':3,'1228':1,'1231':2} as Record<string,number>)[this.day]??0;}
 get needsToken(){return ['1222','1225','1226','1230','1231'].includes(this.day);}
 get signal(){return .5+.5*Math.sin(this.elapsed*1.42+this.phaseOffset);}
 get mark():Vec{
   const side=this.first===1?-1:1;
   if(this.day==='1224')return [-side*1.60,0,.57];
   if(this.day==='1230'||this.day==='1226')return [.15*side,0,-1.79];
   if(this.day==='1228')return this.steps===0?[side*1.94,0,1.47]:[-side*1.58,0,-1.83];
   const spots:Vec[]=this.day==='1227'?[[1.71*side,0,1.82],[-.45*side,0,-.2],[-1.43*side,0,-2.61]]:
     this.day==='1231'?[[1.94*side,0,-1.91],[-1.16*side,0,1.56]]:[[.70*side,0,1.54],[-1.36*side,0,-1.85]];
   return spots[Math.min(this.steps,spots.length-1)];
 }
 get closeToMark(){return this.distance<.96;}
 private distance=Infinity;
 get ready(){
   switch(this.day){
    case '1222':return Math.abs(this.signal-.52)<.22;
    case '1230':return this.closeToMark&&this.signal>.63;
    case '1224':case '1228':return this.fill>=.91;
    case '1226':return this.token&&this.fill>=.91;
    default:return this.steps>=this.trail;
   }
 }
 get canCollect(){return this.day==='1226'||this.ready;}
 get cueSpot():Vec|null{
   if(!this.first||this.done.has(1)&&this.done.has(2))return null;
   if(this.steps<this.trail||['1224','1228'].includes(this.day)&&!this.ready||this.day==='1226'&&this.token&&!this.ready||this.day==='1230'&&!this.token)return this.mark;
   return null;
 }
 override available(i:number){return !this.done.has(i)&&(i===0||this.done.has(0)&&(i===1||i===2||i===3&&this.done.has(1)&&this.done.has(2)));}
 override cast(i:number,p:Vec){
   const other=this.first&&(i===1||i===2)&&i!==this.first;
   if(other&&(!this.ready&&(!this.token||this.day==='1226')||this.needsToken&&!this.token))return this.reject(this.spec.middle);
   if(other&&this.needsToken&&Math.hypot(p[0]-this.pads[i][0],p[2]-this.pads[i][2])>2.55)return this.reject('带着分身收回的展件，贴近另一端投递。');
   if(this.day==='1229'&&(i===1||i===2)){
     const near=Math.hypot(p[0]-this.pads[i][0],p[2]-this.pads[i][2])<1.8;
     if(i===1?this.signal>(near?.48:.32):this.signal<(near?.52:.68))return this.reject('再等一排流光进入'+(i===1?'低':'高')+'格。');
   }
   const ok=super.cast(i,p);if(ok)this.launches++;return ok;
 }
 override update(dt:number,p:Vec,shots:readonly {phase:string;center:Vec}[]){
   const n=super.update(dt,p,shots);if((n===1||n===2)&&!this.first){this.first=n;this.held=true;}
   if(!this.first||this.done.has(1)&&this.done.has(2))return n;
   const a=this.pads[this.first];
   if(this.held&&!shots.some(v=>v.phase==='active'&&Math.hypot(v.center[0]-a[0],v.center[2]-a[2])<.79)&&this.day!=='1229'){this.release();return n;}
   const m=this.mark;this.distance=Math.hypot(m[0]-p[0],m[2]-p[2]);
   if(this.held&&this.steps<this.trail&&this.closeToMark){this.steps++;this.distance=Infinity;}
   if(this.day==='1224'||this.day==='1228'&&this.steps===1||this.day==='1226'&&this.token){
     if(this.fill<1)this.fill=Math.max(0,Math.min(1,this.fill+dt*(this.closeToMark?1.25:-.55)));
     if(this.fill>=.91)this.fill=1;
   }
   return n;
 }
 private release(){this.done.delete(this.first);this.first=this.order=0;this.held=this.token=false;this.fill=this.steps=0;this.hint='只松开了当前一端，起始标记仍在。';}
 override recall(){
   if(this.held&&!(this.done.has(1)&&this.done.has(2))&&this.day!=='1229'){
     if(this.needsToken&&this.canCollect){this.token=true;this.held=false;this.hint='已收回展件，跟随金环继续交接。';}
     else{this.release();this.retries++;}
   }
   super.recall();
 }
 override retry(){if(this.first&&!(this.done.has(1)&&this.done.has(2))&&this.day!=='1229')this.release();super.retry();}
 override get instruction(){
   if(!this.first||this.done.has(1)&&this.done.has(2))return super.instruction;
   if(this.steps<this.trail)return '沿金环走到 '+this.spec.pads[this.first]+' 旁的第 '+(this.steps+1)+' 个记号。';
   if(this.day==='1224'||this.day==='1228'||this.day==='1226'&&this.token)return this.ready?'已对位，投向另一端。':'在金环内站稳　'+Math.round(this.fill*100)+'%';
   if(this.needsToken&&!this.token)return this.canCollect?'金区已到。按 X 收回展件。':this.spec.middle;
   return this.day==='1229'?this.spec.middle:'带着刚才的记号，向对侧亮环投分身。';
 }
}
