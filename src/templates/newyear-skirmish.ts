// 分身留下的尘痕、木版和可动展柜均为原创展陈。
import {RelayCourse,type Exhibit} from './season-skirmish';
import type {Vec} from '../slime/types';
export const newyearRelayMaps:Record<string,Exhibit&{repair:string}>={
 '0102':{kind:'dustgrid',name:'光穿过一格彗尘',lesson:'先把一团分身投进近侧的试样格。',middle:'从左格起手，留着分身沿两处金环收稀尘；或先投右格，把分身留在密尘窗，等金区亮起按 X 带回颗粒。再投对侧格。',repair:'稀尘漏过时回到亮起的那一格；密尘过早收回时只需重新投右格。',end:'手动闭合采样框，网格留住了两条颗粒轨迹',pads:['试样格','外框稀尘格','密尘窗','闭合闩'],stone:'#708995',trim:'#f4cf87',sky:['#18344e','#9dafb2']},
 '0103':{kind:'inletpress',name:'海湾没有拓净的地方',lesson:'把分身投在近处的试墨木版上。',middle:'先投左岛，按 X 收回蘸墨的分身，走入海湾的缺口金环等墨色压实，再投右岛。先投右岛则要穿过两处小岛的金环，用留守分身挡住逆行的墨滴。',repair:'近岛路线要先回收，再去海湾缺口压墨。远岛路线保留第一团，按金环顺序取岛影。',end:'压辊滚过纸面，补齐海湾的群岛轮廓',pads:['试墨木版','近岛墨台','远岛版架','拓印版辊'],stone:'#bb9f79',trim:'#f1bf78',sky:['#72949c','#e0d4aa']},
 '0104':{kind:'roverpetal',name:'岩脊外的一片模型坡板',lesson:'在火星陈列台近端投开第一只模型搭扣。',middle:'先投左侧气囊扣，走进两处岩缝的金环，把外罩松开；或先投右侧岩脊标，在中央托架的金环停稳。投另一侧解开坡板。',repair:'坡板还抬着时，看金环在岩缝还是托架。分身要守住第一只扣；松开后在当前扣重投。',end:'坡板放下，六轮展车慢慢滚出外罩',pads:['花瓣试扣','岩缝气囊扣','岩脊模型标','坡板拉柄'],stone:'#b69278',trim:'#e4b881',sky:['#a47e76','#edd2a9']},
 '0105':{kind:'blinkmap',name:'星图里忽然挪开的一点',lesson:'投到灯箱边缘的参照星。',middle:'先投左底片夹，留住参考星，依次走过两处观测金环，再投右片；或先投右片，走进中央观察孔，等明暗交替到金区按 X 带回位移，再投左片。',repair:'参考星守住后，两枚观测点要依次走过。用眨眼路线时，站在中间观察孔等金区再回收。',end:'三次星位连成短弧，坐标窗锁住了差异',pads:['参考星','左底片夹','右叠片窗','坐标锁'],stone:'#758899',trim:'#f1c689',sky:['#202d4c','#828799']},
 '0106':{kind:'dunevisor',name:'两种斜光下的沙纹',lesson:'从坡脚投一团分身到试砂圆盘。',middle:'左边先取亮砂时，留分身守尺，依次绕过坡脚和背坡两只金环。右边先取暗砂时，站到中央窥砂窗，等游标进入金区再按 X 取回样光。再投另一侧。',repair:'背坡不要收回第一团。暗砂错过金区就等下一圈；提前收回后重投暗砂环。',end:'纹理尺降到砂槽上，亮脊和暗沟一起显出来',pads:['试砂圆盘','亮面砂槽','阴面砂槽','压尺闩'],stone:'#ae7257',trim:'#ffd68e',sky:['#813e38','#f5c494']},
 '0107':{kind:'moonorrery',name:'木星镜台的两种观测法',lesson:'向近侧校准座投一团分身。',middle:'先投左侧望远镜，在中间的金环留住分身，等两次亮点入窗。先投右侧目镜则保留分身，从近月点走到远月点，各等一次入窗。两种路线最后都要投对侧。',repair:'金圈是观测点，留守的分身要继续压住镜座。错过信号就在当前环等下一次。分身自然回返时补投原镜座，已记下的光点会保留。',end:'折合的星位边框沿铜轴立起，木星旁出现一列卫星轨迹',pads:['校准座','长筒镜座','短筒目镜','轨迹架'],stone:'#567278',trim:'#ffdb9c',sky:['#1c314b','#576d87']},
 '0108':{kind:'spiralfilm',name:'沿旋臂找回偏离的光',lesson:'先把分身投进前方曝光座，试点亮一次。',middle:'先投左侧内弧底片时，沿紧凑的三个金环依次走过。先投右侧外缘底片时，沿外沿两处金环定位，各等一次金区。确认后投另一条旋臂。',repair:'从已亮起的环继续；分身自然回返时可补投原底片夹，保留已读光点。',end:'旋臂投影盘展开，光点在两条旋臂上由内向外接亮',pads:['曝光座','内弧底片','外缘底片','旋臂展开扣'],stone:'#716b87',trim:'#fed38b',sky:['#201b43','#6c6690']},
 '0109':{kind:'roofmooring',name:'从两排屋檐之间放飞',lesson:'投向压舱袋旁的试绳环，让模型气球停住。',middle:'先投左侧巷口绳环，沿两个窄环摊开从屋檐底下穿过。也可先投右侧风标，依次在两处开阔环等风袋亮起。分身留在锚点，越过街口后投另一侧。',repair:'巷口请按住 C 摊开。风标未亮时在屋檐环稍等；分身自然回返时补投原绳环，已通过的窄环会保留。',end:'沙袋和吊篮拉开的同时，气球带着绳尾掠过屋檐',pads:['试绳环','短巷绳锚','高廊风标','主缆闩'],stone:'#9f8d82',trim:'#ffc984',sky:['#587c9d','#efc8aa']},
 '0110':{kind:'cooperdock',name:'窄货栈里给一只桶让路',lesson:'向近侧踏板投分身，把空吊钩停稳。',middle:'左路先投吊具，留分身拉住摆臂，摊开经过两个窄道金环；右路先投滚桶止挡，等金区出现回收分身，随它把桶带到中央的称重金环，稳住之后投对侧。',repair:'桶卡住时在秤盘等进度满；若在错误时机松开止挡，只需把分身补回当前环。',end:'仓门升起，滚桶依次经过有木轨的出口',pads:['吊钩踏板','摆臂吊具','滚桶止挡','仓门拉环'],stone:'#997955',trim:'#f8c477',sky:['#739184','#e1cda5']}
};
interface RelayLeg {point:Vec; flat?:boolean; light?:boolean;}
interface RelayRoute {legs:RelayLeg[]; timedRecall?:boolean; charge?:boolean;}
const janWeek:Record<string,[RelayRoute,RelayRoute]>={
 '0106':[{legs:[{point:[-1.92,0,1.01]},{point:[1.26,0,-2.27]}]},{legs:[],timedRecall:true}],
 '0107':[{legs:[{point:[.09,0,-1.79],light:true},{point:[.09,0,-1.79],light:true}]},{legs:[{point:[1.38,0,1.6],light:true},{point:[-.83,0,-2.42],light:true}]}],
 '0108':[{legs:[{point:[-1.25,0,1.7]},{point:[-.5,0,-.56]},{point:[.98,0,-2.48]}]},{legs:[{point:[3.19,0,1.25],light:true},{point:[-1.67,0,-2.94],light:true}]}],
 '0109':[{legs:[{point:[-1.18,0,1.17],flat:true},{point:[-.91,0,-2.22],flat:true}]},{legs:[{point:[2.05,0,1.22],light:true},{point:[.79,0,-2.57],light:true}]}],
 '0110':[{legs:[{point:[-1.08,0,.84],flat:true},{point:[1.05,0,-2.82],flat:true}]},{legs:[],timedRecall:true,charge:true}]
};
export class NewyearReception extends RelayCourse{
 first=0;held=false;token=false;steps=0;fill=0;launches=0;distance=Infinity;private lastWindow=true;
 constructor(readonly day:string,seed:string){super(day,seed,newyearRelayMaps[day]);}
 get route():RelayRoute|undefined{return this.first?janWeek[this.day]?.[this.first-1]:undefined;}
 get leg(){return this.route?.legs[this.steps];}
 get timed(){return !!this.leg?.light||this.needsToken&&!this.token&&!!janWeek[this.day];}
 get signal(){
   // A held physical clone remains for seven seconds. Walking two timed stations
   // and missing both first flashes must still fit inside its actual lifetime.
   const rate=this.leg?.light?4.95:this.day==='0105'?1.78:this.route?.timedRecall?1.98:1.31;
   return .5+.5*Math.sin(this.elapsed*rate+this.phaseOffset);
 }
 get inLight(){return this.signal>=.62;}
 get trail(){if(this.route)return this.route.legs.length;return this.first===(this.day==='0103'?2:1)?2:0;}
 get needsToken(){if(this.route)return !!this.route.timedRecall;return this.day==='0103'?this.first===1:(this.day==='0105'||this.day==='0102')&&this.first===2;}
 get mark():Vec{
   if(this.route)return this.leg?.point??(this.day==='0110'?[.38,0,-2.22]:[.02,0,-1.36]);
   const s=this.first===1?-1:1;
   if(this.trail){const spots:Record<string,Vec[]>={'0102':[[1.63*s,0,1.74],[-1.29*s,0,-1.94]],'0103':[[1.46*s,0,1.57],[-1.83*s,0,-1.48]],'0104':[[.93*s,0,1.54],[-1.46*s,0,-2.47]],'0105':[[1.61*s,0,1.41],[-1.37*s,0,-1.80]]};return spots[this.day][Math.min(this.steps,1)];}
   return this.day==='0104'?[-1.20,0,-1.64]:this.day==='0103'?[.70,0,-1.84]:[0,0,-1.28];
 }
 get ready(){if(this.route)return this.route.timedRecall?this.token&&(!this.route.charge||this.fill===1):this.steps===this.trail;return this.trail?this.steps>=2:this.day==='0103'||this.day==='0104'?this.fill===1:this.token;}
 get canCollect(){if(this.route)return this.inLight&&this.distance<.98;return this.day==='0103'||this.signal>=.65&&(this.day!=='0105'||this.distance<.96);}
 get cueSpot():Vec|null{if(this.route&&this.first&&!this.held&&!this.token&&!this.ready)return this.pads[this.first];return this.first&&!this.ready&&!(this.done.has(1)&&this.done.has(2))&&(this.route||this.trail||this.day==='0104'||this.day==='0105'||this.day==='0103'&&this.token)?this.mark:null;}
 override available(i:number){return !this.done.has(i)&&(i===0||this.done.has(0)&&(i===1||i===2||i===3&&this.done.has(1)&&this.done.has(2)));}
 override cast(i:number,p:Vec){
   if(this.first&&i>0&&i<3&&i!==this.first&&!this.ready)return this.reject(this.spec.middle);
   if(this.token&&i>0&&i<3&&Math.hypot(p[0]-this.pads[i][0],p[2]-this.pads[i][2])>2.53)return this.reject('走近另一侧的环，将分身带回的痕迹交给它。');
   const ok=super.cast(i,p);if(ok)this.launches++;return ok;
 }
 override update(dt:number,p:Vec,shots:readonly {phase:string;center:Vec}[],flat=false){
   const n=super.update(dt,p,shots);
   if((n===1||n===2)&&!this.first){this.first=n;this.held=true;}
   else if(this.route&&n===this.first)this.held=true;
   if(!this.first||this.done.has(1)&&this.done.has(2))return n;
   const a=this.pads[this.first];
   if(this.held&&!shots.some(v=>v.phase==='active'&&Math.hypot(v.center[0]-a[0],v.center[2]-a[2])<.79)){
     if(this.route){
       this.held=false;
       if(!this.ready){this.done.delete(this.first);this.hint='已完成的金环仍在。补投第一只环，再从亮起的下一处继续。';}
     }else this.release();
     return n;
   }
   const m=this.mark;this.distance=Math.hypot(m[0]-p[0],m[2]-p[2]);
   if(this.route){
     const window=this.inLight,leg=this.leg,previous=this.route.legs[this.steps-1];
     const repeat=leg&&previous&&leg.point[0]===previous.point[0]&&leg.point[2]===previous.point[2];
     if(this.held&&leg&&this.distance<.91&&(!leg.flat||flat)&&(!leg.light||window&&(!repeat||!this.lastWindow)))this.steps++;
     if(this.route.charge&&this.token&&this.fill<1)this.fill=Math.max(0,Math.min(1,this.fill+dt*(this.distance<.82?1.45:-.34)));
     this.lastWindow=window;return n;
   }
   if(this.held&&this.steps<this.trail&&this.distance<.90){this.steps++;this.distance=Infinity;}
   if(!this.trail&&this.fill<1&&(this.day==='0104'||this.day==='0103'&&this.token)){
     this.fill=Math.max(0,Math.min(1,this.fill+dt*(this.distance<.96?1.24:-.57)));
   }
   return n;
 }
 private release(){this.done.delete(this.first);this.first=this.order=this.fill=this.steps=0;this.held=this.token=false;this.hint='当前展件松开了，入口的试样仍在。';}
 override recall(){
   if(this.held&&!(this.done.has(1)&&this.done.has(2))){
     if(this.needsToken&&this.canCollect){this.token=true;this.held=false;this.hint='已带回痕迹，跟随金环继续。';}
     else{this.release();this.retries++;}
   }super.recall();
 }
 override retry(){if(this.first&&!(this.done.has(1)&&this.done.has(2)))this.release();super.retry();}
 override get instruction(){
   if(!this.first||this.done.has(1)&&this.done.has(2))return super.instruction;
   if(this.ready)return '痕迹已对齐，向另一侧的接应环投分身。';
   if(this.route&&!this.held&&!this.token)return '补投「'+this.spec.pads[this.first]+'」。之前的金环仍然有效。';
   if(this.leg){
     const step='第 '+(this.steps+1)+'／'+this.trail+' 处金环';
     return this.leg.flat?'按住 C 摊开，经过'+step+'。':this.leg.light?'在'+step+'待到金区亮起。':'朝'+step+'移动，第一团分身继续留守。';
   }
   if(this.trail)return '沿展件走到第 '+(this.steps+1)+' 处金环，第一团要留下。';
   if(this.needsToken&&!this.token)return this.canCollect?'金区已亮，按 X 收回。':this.spec.middle;
   return '本体在金环站稳　'+Math.floor(this.fill*100)+'%';
 }
}
