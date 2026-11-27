import type {Vec} from '../slime/types';
import {ArenaEncounter,type RpgDayConfig} from './january-rpg';

export const winterVoyages={
 '1207':{name:'舷窗里的蓝色玻璃球',routes:['跃起取景','摊开稳镜'],legs:['海岸的弧','云带的弧','完整地球'],verb:'拍摄',end:'压下快门，抽出照片',start:'在取景器旁按 J 开镜。走到对面的金环，等云带进入框内，按所选姿势按 J 曝光。'},
 '1208':{name:'签字桌的两份文本',routes:['跳扣书夹','按平纸页'],legs:['左册折页','右册衬纸','封面书签'],verb:'合页',end:'合上两份纪念册',start:'两本展册要逐页对齐。先到页脚按 J 夹住一角，沿同一页慢慢走到另一端，照亮整条折痕。'},
 '1209':{name:'纸带那头的回声',routes:['逐步译读','并行送卡'],legs:['读入图形','翻译符号','输出图样'],verb:'译读',end:'送出译读纸带',start:'先在读卡机按 J 送卡。读头扫过时，跟着纸带找到本轮亮起的输出灯，再按 J 译出一个符号。'},
 '1210':{name:'织机替数字作画',routes:['跃起挑纬','压板引经'],legs:['第一束经线','第二条纬带','花纹的边'],verb:'穿梭',end:'转动卷布辊',start:'在穿孔卡旁按 J 放梭。沿金线横穿织机，穿过中间的经线，走到对侧用所选姿势按 J 收梭。'},
 '1211':{name:'最后一箱的蓝封条',routes:['跳扣箱带','稳托物箱'],legs:['毛毯篮','书本箱','灯具包'],verb:'交接',end:'把物资车推出货棚',start:'在货架按 J 领取一份物资。经过过道中央的称重灯，到打包位摊开或跳扣，按 J 系牢。'}
} as const;
export type WinterDay=keyof typeof winterVoyages;
export const isWinterVoyage=(d:string):d is WinterDay=>Object.hasOwn(winterVoyages,d);
export class WinterVoyage extends ArenaEncounter{
 readonly design;private readonly setup:RpgDayConfig;
 engaged=false;fill=0;elapsed=0;passed=false;
 constructor(readonly day:WinterDay,seed:string,config:RpgDayConfig){
   super(config.arena,seed,config);this.design=winterVoyages[day];this.setup={...config,routes:this.design.routes,verb:this.design.verb,ending:this.design.end,rounds:3};this.layout.branches[1][1]=0;
 }
 override get rules(){return this.setup;}
 get opening(){return this.design.start;}
 get title(){return this.design.legs[Math.min(2,this.round)];}
 override get z(){return .1-this.round*3.05;}
 get side(){return this.initialSide*(this.round%2?-1:1);}
 get wind(){return .5+.5*Math.sin(this.elapsed*(this.route<0?1.3:.91)+this.side);}
 get source():Vec{return [-2.65*this.side,0,this.z+.58];}
 override get safeSpot():Vec{return [2.65*this.side,0,this.z+(this.day==='1209'?(this.round-1)*.65:0)];}
 get nextSpot():Vec{return this.engaged?this.safeSpot:this.source;}
 get hint(){if(!this.engaged)return '沿金色标记到「'+this.title+'」的起点按 J。';
   const action=this.route<0?'弹起时按 J':'摊开身体按 J';
   switch(this.day){
     case '1207':return '等取景盘旋入金色窗口，'+action+' 曝光。';
     case '1208':return '沿页脚的横折痕横穿两本展册，折痕全部亮起后，'+action+' 合页。';
     case '1209':return '跟随读头到亮起的输出端。'+(this.route<0?'等短灯亮起，按 J 单步译读。':'在输出端摊开等待灯槽蓄满，按 J 整组译读。');
     case '1210':return '穿梭经过中间金色经线。到对端，'+action+' 收梭。';
     case '1211':return '带着物资经过过道正中的称重灯，稍停至秤针落稳，再到对侧'+action+' 系箱带。';
   }
 }
 override advance(dt:number,p:Vec,guard:boolean,_evading:boolean){
   if(this.phase!=='duel')return;this.elapsed+=dt;
   if(this.engaged){
     const nearLine=Math.abs(p[2]-(this.z+.25))<1.45;
     if(this.day==='1208'&&nearLine){const span=(p[0]-this.source[0])/(this.safeSpot[0]-this.source[0]);if(span<this.fill+.26)this.fill=Math.max(this.fill,Math.min(1,span));}
     if(this.day==='1210'&&nearLine&&Math.abs(p[0])<.9)this.passed=true;
     if(this.day==='1211'&&nearLine&&Math.abs(p[0])<1.3)this.fill=Math.min(1,this.fill+dt*1.6);
     if(this.day==='1209'&&this.route>0&&guard&&this.near(p,this.safeSpot,1.5))this.fill=Math.min(1,this.fill+dt*1.7);
   }
   this.clock=this.day==='1207'||this.day==='1209'&&this.route<0?this.wind:this.day==='1210'?Number(this.passed):this.fill;
 }
 private miss(message:string){this.message=message;this.errors++;if(--this.health<=0)this.phase='lost';return false;}
 override strike(p:Vec,body:{guard:boolean;airborne:boolean;dashing:boolean}){
   if(this.phase!=='duel')return false;
   if(!this.near(p,this.nextSpot,1.55))return this.miss('走进金环再按 J。');
   if(!this.engaged){this.engaged=true;this.fill=0;this.passed=false;this.message=this.hint;return false;}
   if(this.day==='1207'&&this.wind>.53||this.day==='1208'&&this.fill<.85||this.day==='1209'&&(this.route<0?this.wind>.52:this.fill<.88)||this.day==='1210'&&!this.passed||this.day==='1211'&&this.fill<.88)return this.miss(this.hint);
   if(this.day!=='1209'&&!(this.route<0?body.airborne:body.guard))return this.miss(this.hint);
   this.engaged=false;this.fill=0;this.passed=false;this.health=3;this.round++;
   if(this.round===3)this.phase='finale';this.message=this.round===3?this.design.end:this.title;return true;
 }
}
