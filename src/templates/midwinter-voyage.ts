import type {Vec} from '../slime/types';
import {ArenaEncounter,type RpgDayConfig} from './january-rpg';

export const midwinterVoyages={
 '1212':{repair:'扫描条中断时退到上一个亮格，贴着光栅继续横扫。',name:'海台上的暗星图',routes:['轻跃截取','稳托长扫'],legs:['海平低窗','天顶窄窗','远处孤源'],start:'到左或右的望远镜起点按 J 开窗。沿两端间的光栅横扫，直到读数填满，再用选定姿势按 J 留下光源。',verb:'采光',end:'按下星图曝光柄'},
 '1213':{repair:'篮子不亮时看金环，必须中线、篮边、再中线，各走到一次。',name:'筛底留下的橙色',routes:['轻跃倒样','稳压收样'],legs:['灰坡碎屑','暗色峡谷砂','橙色珠粒'],start:'到岩样篮按 J 取样。沿篮边做完整的左右摇筛，先过中央金线、回篮边，再过线。去对面的样格用所选姿势按 J 收样。',verb:'筛样',end:'翻起样品盒的透光盖'},
 '1214':{repair:'送不出去时回发光按钮，松开 J 再次按下，直到本段所需份数点齐。',name:'光谱台上的一份光',routes:['跳接能量','稳压光片'],legs:['琥珀格','青绿格','紫罗兰格'],start:'在发光按钮旁按 J 取一份能量。本段需要几份就按几次，每次要松手；对应格点满后到对侧用选定姿势按 J 交付。',verb:'送能',end:'拉开彩谱遮片'},
 '1215':{repair:'短拍错过波峰可等下一轮；慢录需到对侧接收端再摊开。',name:'金星纸带最后的波纹',routes:['短拍捕波','摊开慢录'],legs:['第一道来波','云后的回声','最后一线弱讯'],start:'在记录鼓一侧按 J 开始接听。到另一端，短拍路线等波峰回到金色窗口，慢录路线摊开稳定片刻，再按 J 留下纸带。',verb:'记录',end:'转出接收站的整卷纸带'},
 '1216':{repair:'抄直线会漏掉扇面弧顶。回到外凸弧线的中间金环，再去对侧。',name:'书房地球仪的三个扇面',routes:['跃扣扇端','摊开压弧'],legs:['第一扇经线','第二扇经线','闭合的末扇'],start:'按 J 在书斋地球仪旁锁定一侧。沿外凸的弧线经过中间金环，再到对侧用选定姿势按 J，把扇面放稳。',verb:'合弧',end:'转动桌旁的总开关'}
} as const;
export type MidwinterDay=keyof typeof midwinterVoyages;
export const isMidwinterVoyage=(d:string):d is MidwinterDay=>Object.hasOwn(midwinterVoyages,d);
export class MidwinterVoyage extends ArenaEncounter{
 readonly design;private readonly setup:RpgDayConfig;
 engaged=false;fill=0;elapsed=0;steps=0;
 constructor(readonly day:MidwinterDay,seed:string,cfg:RpgDayConfig){
   super(cfg.arena,seed,cfg);this.design=midwinterVoyages[day];this.setup={...cfg,routes:this.design.routes,verb:this.design.verb,ending:this.design.end,rounds:3};this.layout.branches[1][1]=0;
 }
 override get rules(){return this.setup;}
 get opening(){return this.design.start;}
 get title(){return this.design.legs[Math.min(2,this.round)];}
 override get z(){return .2-this.round*3.03;}
 get side(){return this.initialSide*(this.round%2?-1:1);}
 get wave(){return .5+.5*Math.sin(this.elapsed*(1.30+this.round*.17)+this.side);}
 get source():Vec{return [-2.68*this.side,0,this.z+.1];}
 override get safeSpot():Vec{return [2.68*this.side,0,this.z+.1];}
 get middle():Vec{return [0,0,this.z+(this.day==='1216'?-1.55:.1)];}
 get nextSpot():Vec{
   if(!this.engaged||this.day==='1214'&&this.steps<this.round+1)return this.source;
   if(this.day==='1216'&&!this.steps||this.day==='1213'&&this.steps<3&&this.steps!==1)return this.middle;
   if(this.day==='1213'&&this.steps===1)return this.source;
   return this.safeSpot;
 }
 get hint(){
   if(!this.engaged)return '到「'+this.title+'」的起点，按 J '+this.design.verb+'。';
   const action=this.route<0?'跳起按 J':'摊开按 J';
   if(this.day==='1212')return '沿光栅向对端平移。填满的格子会留下，扫到尽头后'+action+' 采光。';
   if(this.day==='1213')return this.steps<3?['带样篮越过中间金线。','摇回取样篮旁的金环。','再过中线，留下最细一层。'][this.steps]:'筛好了，到对侧样格'+action+' 封存。';
   if(this.day==='1214')return this.steps<this.round+1?'已取 '+this.steps+' / '+(this.round+1)+' 份；在这里再按一次 J。':'格子已满，到对侧'+action+' 送能。';
   if(this.day==='1215')return this.route<0?'在接收端等波峰进入金色窗，按 J 捕波。':'到接收端摊开，等记录槽填满后按 J。';
   return this.steps?'到另一端'+action+' 合拢扇面。':'先走到弧顶的金色环，扇面会跟着身体打开。';
 }
 override advance(dt:number,p:Vec,guard:boolean,_evading:boolean){
   if(this.phase!=='duel')return;this.elapsed+=dt;
   if(this.engaged){
     if(this.day==='1212'&&Math.abs(p[2]-this.z)<1.35){const fraction=(p[0]-this.source[0])/(this.safeSpot[0]-this.source[0]);if(fraction<this.fill+.26)this.fill=Math.max(this.fill,Math.min(1,fraction));}
     if(this.day==='1213'&&this.steps<3&&this.near(p,this.steps===1?this.source:this.middle,1.01)){this.steps++;this.fill=this.steps/3;}
     if(this.day==='1216'&&!this.steps&&this.near(p,this.middle,.93)){this.steps=1;this.fill=1;}
     if(this.day==='1215'&&this.route>0&&this.near(p,this.safeSpot,1.45))this.fill=Math.max(0,Math.min(1,this.fill+dt*(guard?1.42:-.28)));
   }
   this.clock=this.day==='1215'&&this.route<0?this.wave:this.fill;
 }
 private miss(message:string){this.message=message;this.errors++;if(--this.health<=0)this.phase='lost';return false;}
 override strike(p:Vec,body:{guard:boolean;airborne:boolean;dashing:boolean}){
   if(this.phase!=='duel')return false;
   if(!this.engaged||this.day==='1214'&&this.steps<this.round+1){
     if(!this.near(p,this.source,1.48))return this.miss('走进亮起的取样环，重新按 J。');
     this.engaged=true;
     if(this.day==='1214'){this.steps++;this.fill=this.steps/(this.round+1);}
     this.message=this.hint;return false;
   }
   if(!this.near(p,this.safeSpot,1.5))return this.miss(this.hint);
   if(this.day==='1215'){
     if(this.route<0?this.wave<.65:this.fill<.88)return this.miss(this.hint);
   }else if(this.fill<.86||!(this.route<0?body.airborne:body.guard))return this.miss(this.hint);
   this.engaged=false;this.fill=0;this.steps=0;this.health=3;this.round++;
   if(this.round===3)this.phase='finale';this.message=this.phase==='duel'?this.title:this.design.end;return true;
 }
}
