// 十座纪念展的道具、动线与操作均为原创演绎。
import type {Vec} from '../slime/types';
import {ArenaEncounter,type RpgDayConfig} from './january-rpg';

export const monthendVoyages={
 '1222':{name:'点阵织出的数学花窗',routes:['跃扣角点','摊开锁边'],legs:['三角点阵','方形点阵','菱形花窗'],start:'到每片点阵的金环按 J 拿线端，沿连续亮起的两只角环拉出图形，再到对端用所选姿势按 J 锁边。',repair:'少一个角时回到仍亮着的角环，拉完两段边线才能收口。',verb:'织窗',end:'扳起窗扣，让三片数学花窗透光'},
 '1223':{name:'展翼下的环球丝线',routes:['跳夹航迹','稳按图钉'],legs:['顺风丝带','迎风丝带','返航丝带'],start:'在模型翼下按 J 夹住地球仪的航迹线。进中间的风向环，等游标经过中央白区按 J，将航迹钉入地球仪，再到另一头扣线。',repair:'飘带未横直时可原地等下一个窗口。图钉点亮后再到末环做所选姿势。',verb:'钉线',end:'旋动地球仪，接起环绕一周的航迹'},
 '1224':{name:'雨林邮局的一封星空',routes:['跃盖邮戳','稳按信封'],legs:['叶影印片','云间印片','星空印片'],start:'在邮架按 J 取一层图案，走到对应邮格按 J 盖上叶、云或星印。最后去另一端用所选姿势按 J 压好。',repair:'对照当前层名称，寻找亮着金环的邮格；端点收件前需要在邮格盖印。',verb:'套印',end:'拉开邮架，翻出完整的星空纪念封'},
 '1225':{name:'苹果树影里的棱镜',routes:['跃截色带','稳接色带'],legs:['红橙光带','中间绿光','蓝紫边缘'],start:'在光源边按 J 取白光，到光具台中央等游标走入这一段的目标色区，按 J 锁住棱镜。到另一端跳起或摊开接光。',repair:'红橙在低段、绿在中段、蓝紫在高段。看当前提示，错过可原地等回摆。',verb:'接光',end:'拉开接光屏，迎上完整的七色谱'},
 '1226':{name:'黄铜齿间进的一位',routes:['跳拨字轮','稳拨字轮'],legs:['个位轮','十位轮','百位轮'],start:'在近端字轮按 J 接上摇柄。到中间金环按 J 拨动本位：个位拨一次，十位两次，百位三次。进位后去另一端扣紧齿轮。',repair:'看已经拨过的齿数。若需要多拨几次，请松开再按 J。',verb:'进位',end:'转动总摇柄，让数列从纸槽里走出'},
 '1227':{name:'一块弧面扫过的光',routes:['跃取扇面','稳夹扇面'],legs:['近端扇面','长轴弧段','远端扇面'],start:'在焦点旁按 J 取光片，走到轨道的第一支金色半径，再沿点亮的第二支半径走过弧面，到终点用所选姿势按 J 留影。',repair:'半径尚未显影就回当前金环。要依次走过两端，才能封住扇面。',verb:'留弧',end:'叠起三片扫过的椭圆弧面'},
 '1228':{name:'企鹅工坊的三块拼图',routes:['跃插拼块','摊开嵌边'],legs:['企鹅肚皮','圆圆的翅尖','橙色的脚掌'],start:'到零件篮按 J 借图块。在亮起的拼台金环按 J 试转，直到接缝对齐，再到另一边以所选姿势按 J 嵌好。',repair:'卡口仍错开时继续在拼台按 J。提示会显示还需转动几格。',verb:'拼块',end:'拉开拼架，把完整企鹅图送到橱窗'},
 '1229':{name:'回弹留下的三圈印',routes:['跃压印模','稳压印模'],legs:['浅圆印','宽条印','深环印'],start:'按 J 从展架拿一枚弹性试样。站进中央金环摊开，在展台把印迹压至饱满，再到另一端用所选姿势按 J 松模。',repair:'印迹太浅时回金环，按住 C 摊开停稳。等待填满后再离开。',verb:'松模',end:'掀起试样托盘，对照三道回弹印'},
 '1230':{name:'书页里走过的三串脚印',routes:['跃过书脊','摊开贴页'],legs:['河边足迹','林地足迹','树根足迹'],start:'按 J 揭开当前书页，依次踩进两串亮起的足迹。走到另一边的翻页角，按选定姿势按 J 拨动纸页。',repair:'少踩一串时，回到金环中的脚印开始接着走。',verb:'翻页',end:'拉动书签，让丛林剪影从书里站起来'},
 '1231':{name:'街口最后一串暖灯',routes:['跃挂灯钩','稳托灯线'],legs:['面包铺门楣','钟表铺窗格','街角阁楼'],start:'在街口灯盘按 J 提线，走进对应门前的挂灯环，停稳把绳张直，再按 J 挂钩。最后到另一头用所选姿势按 J 接成一串。',repair:'挂钩松动时回屋门金环稍停，等拉力槽到顶再按 J，然后接到对侧。',verb:'挂灯',end:'推开街口的灯窗，让整条街亮起来'}
} as const;
export type MonthendDay=keyof typeof monthendVoyages;
export const isMonthendVoyage=(d:string):d is MonthendDay=>Object.hasOwn(monthendVoyages,d);
export class MonthendVoyage extends ArenaEncounter{
 readonly design;private readonly settings:RpgDayConfig;
 engaged=false;steps=0;fill=0;elapsed=0;displacement=0;
 constructor(readonly day:MonthendDay,seed:string,config:RpgDayConfig){
   super(config.arena,seed,config);this.design=monthendVoyages[day];this.settings={...config,routes:this.design.routes,verb:this.design.verb,ending:this.design.end,rounds:3};this.layout.branches[1][1]=0;
 }
 override get rules(){return this.settings;}
 get opening(){return this.design.start;}
 get title(){return this.design.legs[Math.min(2,this.round)];}
 override get z(){return .15-this.round*3.02;}
 get side(){return this.initialSide*(this.round%2?-1:1);}
 get wave(){return .5+.5*Math.sin(this.elapsed*(1.14+this.round*.1)+this.side);}
 get source():Vec{return [-2.68*this.side,0,this.z+.19];}
 override get safeSpot():Vec{return [2.68*this.side,0,this.z+.12];}
 get trail(){return this.day==='1222'||this.day==='1227'||this.day==='1230';}
 get pulses(){return this.day==='1223'||this.day==='1225';}
 get turns(){return this.day==='1226'?this.round+1:this.day==='1228'?[2,1,3][this.round]:1;}
 get window(){
   const target=this.day==='1225'?[.20,.5,.79][this.round]:.5;
   return Math.abs(this.wave-target)<(this.route<0?.14:.22);
 }
 get middle():Vec{
   const s=this.side,z=this.z,j=this.steps===0?0:1;
   switch(this.day){
     case '1222':return [[-1.11*s,0,z-1.27],[1.49*s,0,z+(.49+this.round*.25)]][j] as Vec;
     case '1227':return [[-.99*s,0,z-1.41],[1.44*s,0,z-.72]][j] as Vec;
     case '1230':return [[-1.44*s,0,z+.88],[1.40*s,0,z-1.00]][j] as Vec;
     case '1224':return [s*[-1.22,1.13,-.38][this.round],0,z-1.06];
     case '1231':return [-s*1.54,0,z-1.13];
     case '1228':return [s*1.16,0,z-1.12];
     default:return [.23*s,0,z-.94];
   }
 }
 get nextSpot():Vec{return !this.engaged?this.source:this.fill<1?this.middle:this.safeSpot;}
 get hint(){
   if(!this.engaged)return '走入「'+this.title+'」起点，按 J 取件。';
   if(this.fill===1)return '已就位。到对端金环'+(this.route<0?'跳起':'摊开')+'按 J '+this.design.verb+'。';
   if(this.trail)return '跟随第 '+(this.steps+1)+' 只金环，走过「'+this.title+'」的两处记号。';
   if(this.pulses)return '在金环里看游标，'+(this.day==='1225'?['低段红橙','中段绿色','高段蓝紫'][this.round]:'中央白区')+(this.window?'已对齐，按 J。':'将亮起。');
   if(this.day==='1229')return '在金环按住 C，把印迹压深　'+Math.floor(this.displacement*100)+'%';
   if(this.day==='1231')return this.displacement>=.94?'灯线绷直了，原地按 J 挂钩。':'在灯钩金环里停住，等拉力槽满。';
   return this.day==='1224'?'到亮起的邮格按 J 盖印。':'在金环内按 J，剩余 '+(this.turns-this.steps)+' 格。';
 }
 override advance(dt:number,p:Vec,guard:boolean,_evading:boolean){
   if(this.phase!=='duel')return;this.elapsed+=dt;
   if(this.engaged&&this.fill<1){
     const near=this.near(p,this.middle,.93);
     if(this.trail&&near){this.steps++;this.displacement=this.steps/2;if(this.steps>=2)this.fill=1;}
     if(this.day==='1229'||this.day==='1231'){
       this.displacement=Math.max(0,Math.min(1,this.displacement+dt*(near&&(this.day==='1231'||guard)?1.45:-.61)));
       if(this.day==='1229'&&this.displacement>=.98)this.fill=1;
     }
   }
   this.clock=this.pulses&&this.fill<1?this.wave:this.displacement;
 }
 private miss(message:string){this.message=message;this.errors++;if(--this.health<=0)this.phase='lost';return false;}
 override strike(p:Vec,body:{guard:boolean;airborne:boolean;dashing:boolean}){
   if(this.phase!=='duel')return false;
   if(!this.engaged){if(!this.near(p,this.source,1.45))return this.miss(this.hint);this.engaged=true;this.message=this.hint;return false;}
   if(this.fill<1){
     if(this.trail||this.day==='1229'||!this.near(p,this.middle,.98)||this.pulses&&!this.window||this.day==='1231'&&this.displacement<.94)return this.miss(this.hint);
     this.steps++;this.displacement=this.steps/this.turns;if(this.steps>=this.turns)this.fill=1;this.message=this.hint;return false;
   }
   if(!this.near(p,this.safeSpot,1.5)||!(this.route<0?body.airborne:body.guard))return this.miss(this.hint);
   this.engaged=false;this.steps=this.fill=this.displacement=0;this.health=3;this.round++;
   if(this.round===3)this.phase='finale';this.message=this.phase==='duel'?this.title:this.design.end;return true;
 }
}
