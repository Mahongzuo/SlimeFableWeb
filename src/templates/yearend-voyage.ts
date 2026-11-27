import type {Vec} from '../slime/types';
import {ArenaEncounter,type RpgDayConfig} from './january-rpg';

export const yearendVoyages={
 '1217':{name:'矿廊深处的纱网灯',routes:['跃起挂灯','摊开扶灯'],legs:['拱顶铁钩','木梁旧钩','尽头灯钩'],start:'在照壁旁按 J 拾起展灯的灯影。走向侧方金环，让灯影掠过墙上的挂钩，再到对面用所选姿势按 J 留影。',repair:'灯钩仍暗时先回侧方的金环，让影尖触到钩，再去墙边；最后到尽头按 F 挂灯。',verb:'留影',end:'把纱网灯挂进拱顶'},
 '1218':{name:'地球图里的三层透明片',routes:['跳扣片角','稳托对位'],legs:['海岸轮廓','林地边缘','云影轮廓'],start:'按 J 取出当前透明片。走到两端之间的金色校准环再按 J，把该层的海、林或云影对到框内。继续到另一端用选定姿势按 J 夹好。',repair:'只走到终点不能固定这一层。退回校准环按 J，让两根边线重合，再去端点。',verb:'配准',end:'掀开叠片台上的透光框'},
 '1219':{name:'转椅两端的星点',routes:['短窗快照','宽窗定星'],legs:['近星双点','偏移的伴星','遥远背景星'],start:'先在第一只视镜按 J 取左眼星点。走到另一支视镜；短窗路线等两个游标相遇按 J，宽窗路线在镜前摊开，让星点稳定再按 J。',repair:'星点错开可在同一支视镜等下一轮。宽窗路线需要在第二支镜前持续摊开。',verb:'合星',end:'转动观星椅串起视差星图'},
 '1220':{name:'候机窗前的三张明信片',routes:['跃夹明信片','扶稳照片角'],legs:['晨山窗','海湾窗','暮城窗'],start:'取卡亭按 J 领取一张旅行明信片。沿金环到和卡面对应的观景窗按 J 取景，再到另一头用所选姿势按 J 夹回卡架。',repair:'看当前卡名与金环：山、湾、城各有自己的取景点。在窗前先按 J，再回卡架夹好。',verb:'夹卡',end:'拉开候机厅的风景长窗'},
 '1221':{name:'玻璃层之间的小鹿',routes:['跃扣画片','稳推画层'],legs:['远山玻璃层','中林玻璃层','近处小鹿层'],start:'在画夹边按 J 抽出一层。先到亮起的画轨起点，再沿这一层的横轨推到另一端，让整条轨迹显影。用所选姿势按 J 定格。',repair:'有空白时退到上一个显影点，贴着该层横轨平移，不要提前往最后一格切角。',verb:'定格',end:'转动手摇摄影台，翻出剪影动画'}
} as const;
export type YearendDay=keyof typeof yearendVoyages;
export const isYearendVoyage=(d:string):d is YearendDay=>Object.hasOwn(yearendVoyages,d);
export class YearendVoyage extends ArenaEncounter{
 readonly design;private readonly settings:RpgDayConfig;
 engaged=false;steps=0;fill=0;elapsed=0;displacement=0;
 constructor(readonly day:YearendDay,seed:string,config:RpgDayConfig){
   super(config.arena,seed,config);this.design=yearendVoyages[day];this.settings={...config,routes:this.design.routes,verb:this.design.verb,ending:this.design.end,rounds:3};this.layout.branches[1][1]=0;
 }
 override get rules(){return this.settings;}
 get opening(){return this.design.start;}
 get title(){return this.design.legs[Math.min(2,this.round)];}
 override get z(){return .2-this.round*3.02;}
 get side(){return this.initialSide*(this.round%2?-1:1);}
 get wave(){return .5+.5*Math.cos(this.elapsed*(1.17+this.round*.11)+this.side);}
 get source():Vec{return [-2.65*this.side,0,this.z+.12];}
 override get safeSpot():Vec{return [2.65*this.side,0,this.z+(this.day==='1221'?this.trackZ:.12)];}
 get trackZ(){return [-.82,.58,-.46][Math.min(2,this.round)];}
 get middle():Vec{
   if(this.day==='1221')return [this.source[0],0,this.z+this.trackZ];
   if(this.day==='1220')return [-3.81,0,this.z+(this.round===1?.61:-.91)];
   return [this.day==='1218'?this.side*(this.round-1)*.60:0,0,this.z+(this.day==='1217'?-1.42:.15)];
 }
 get nextSpot():Vec{return !this.engaged?this.source:!this.steps&&this.day!=='1219'?this.middle:this.safeSpot;}
 get hint(){
   if(!this.engaged)return '走入「'+this.title+'」的起点金环，按 J。';
   const feel=this.route<0?'跳起按 J':'摊开按 J';
   if(this.day==='1219')return this.route<0?'在第二支视镜等两点靠近中央刻线，然后按 J。':'在第二支视镜前摊开，等稳定槽满后按 J。';
   if(!this.steps)switch(this.day){
     case '1217':return '沿金环把影尖挪到侧方的灯钩。';
     case '1218':return '带透明片到金色校准环，按 J 锁定这层边线。';
     case '1220':return '卡面是「'+this.title+'」。到对应景窗的金环按 J 取景。';
     case '1221':return '先走到这一层横轨的起点，金环会移到轨道另一端。';
   }
   return this.day==='1221'?'沿同一条横轨推片，显影 '+Math.floor(this.fill*100)+'%。到另一端'+feel+'。':'已对好这一层，到对端'+feel+'。';
 }
 override advance(dt:number,p:Vec,guard:boolean,_evading:boolean){
   if(this.phase!=='duel')return;this.elapsed+=dt;
   if(this.engaged){
     const a=this.source,h=this.middle,dx=h[0]-a[0],dz=h[2]-a[2];
     this.displacement=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[2]-a[2])*dz)/(dx*dx+dz*dz||1)));
     if((this.day==='1217'||this.day==='1221')&&!this.steps&&this.near(p,this.middle,this.day==='1221'?.55:.90)){this.steps=1;if(this.day==='1217')this.fill=1;}
     if(this.day==='1219'&&this.route>0&&this.near(p,this.safeSpot,1.45))this.fill=Math.min(1,Math.max(0,this.fill+dt*(guard?1.40:-.32)));
     if(this.day==='1221'&&this.steps&&Math.abs(p[2]-this.safeSpot[2])<.79){
       const v=(p[0]-this.source[0])/(this.safeSpot[0]-this.source[0]);if(v<=this.fill+.25)this.fill=Math.max(this.fill,Math.min(1,v));}
   }
   this.clock=this.day==='1219'&&this.route<0?this.wave:this.fill;
 }
 private miss(message:string){this.message=message;this.errors++;if(--this.health<=0)this.phase='lost';return false;}
 override strike(p:Vec,body:{guard:boolean;airborne:boolean;dashing:boolean}){
   if(this.phase!=='duel')return false;
   if(!this.engaged){if(!this.near(p,this.source,1.49))return this.miss('先到亮起的起点取样。');this.engaged=true;this.message=this.hint;return false;}
   if(!this.steps&&(this.day==='1218'||this.day==='1220')){
     if(!this.near(p,this.middle,.96))return this.miss(this.hint);this.steps=1;this.fill=1;this.message=this.hint;return false;
   }
   if(!this.near(p,this.safeSpot,1.51))return this.miss(this.hint);
   if(this.day==='1219'){if(this.route<0?Math.abs(this.wave-.5)>.16:this.fill<.88)return this.miss(this.hint);}
   else if(this.fill<.86||!(this.route<0?body.airborne:body.guard))return this.miss(this.hint);
   this.engaged=false;this.steps=0;this.fill=0;this.displacement=0;this.health=3;this.round++;
   if(this.round===3)this.phase='finale';this.message=this.phase==='duel'?this.title:this.design.end;return true;
 }
}
