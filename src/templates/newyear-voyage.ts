// 球场、工场、星风投影和雪地校准台为虚构场景。赛果与展品史实在原历史卡。
import {ArenaEncounter,type RpgDayConfig} from './january-rpg';
import type {Vec} from '../slime/types';
export const newyearVoyages={
 '0102':{name:'终场的风带',routes:['传接推进','长踢远射'],legs:['近侧摆球','斜线摆球','终场摆球'],verb:'踢球',start:'在球架金环按 J 摆球。推进路线先带球走过接应线的金环；远踢可直接去踢球点。到球点看门柱和风带，指针接近中央、投影落进双柱时按 J 踢。',repair:'出界会沿偏左或偏右的实际弧线飞走。球随即回到原座，留在这里等风回中再按 J；站得偏也会踢偏。',end:'翻起终场三分的记分牌'},
 '0103':{name:'绕紧最后一圈纸',routes:['内线穿轴','外线拉张'],legs:['第一道起缝','中段接缝','收口纸边'],verb:'压缝',start:'到纸架按 J 夹住纸头。内线在模芯的三处金环摊开滚过；外线按 J 留一团真分身拉住纸头，再沿三处金环绕模。走完这一圈到终端按 J 合缝。',repair:'少走一段时回亮着的金环。内线要在环中摊开，外线分身若离开纸头，在纸架按 J 重挂。',end:'拉出模芯，让螺旋纸管脱模'},
 '0104':{name:'在星风前取一道亮边',routes:['贴壁绕波','亮边护盾'],legs:['迎风弧头','转侧弧肩','渐隐弧尾'],verb:'拓弧',start:'在光核座按 J 取片。绕波路线经过弧边两个金环；护盾路线在中央亮边摊开，挡住光流直到槽满。走到末端，在风带回落、游标处于低谷时按 J 拓印。',repair:'提前拓印会错过波谷。站在末环，等亮色风流退下、指示槽在低段时再按 J。',end:'合上星图夹，把三段亮弧拓在一起'},
 '0105':{name:'雪槽边的水平泡',routes:['雪槽修舱','屋顶校风'],legs:['西侧舱脚','迎风舱脚','观测窗底座'],verb:'定轴',start:'在舱脚按 J 展开水平仪。走入金环后左右微移，看气泡向中央退回。雪槽路线摊开稳住，屋顶路线等阵风变弱；气泡居中且稳定槽满后按 J 锁脚，再到终端按 J 登记。',repair:'气泡偏右时稍向左，偏左时向右。槽还未满就先站稳；屋顶等风势减小再锁。',end:'亲手升起寻星罩，在日记上留下一排水平记号'}, 
 '0106':{name:'把彗核的飞尘印下来',routes:['绕背光板','压稳曝光台'],legs:['迎光岩肩','暗侧凹面','尘束末梢'],verb:'曝光',start:'到每段片架按 J 取一张底片。背光路绕过两枚遮光环；压台路在取景环摊开 C，把读数槽稳到满。到终端，等光强读数回到低段按 J 曝光。',repair:'留意右上的光强槽。光过强时留在终端，等指针回到低段。',end:'翻起底片，让彗核与浮尘现出剪影'},
 '0107':{name:'猫眼里的一对光环',routes:['遮光找内环','扫描外环'],legs:['内圈亮边','外圈暗纹','双环切点'],verb:'锁光环',start:'在片架按 J。遮光路线在两处内圈预定点摊开；扫描路线依次走过外圈三处光环，第二环等高光入窗。到终端时两片光环要对齐才可按 J 锁定。',repair:'跟着当前亮环走。稳住内圈时保持摊开，外环等游标进入高段。终端双环靠拢时再锁。',end:'推动合页，使两层光环在猫眼镜片上重合'},
 '0108':{name:'粉笔线从哪儿收口',routes:['沿内弧补白','贴尺借力'],legs:['短断弧','偏心弧','闭合边界'],verb:'收粉线',start:'从粉笔盒取笔 J。内弧线依次经过三处金环，第二环收身后的跳跃高度会帮助越过低尺；借力线按住 C，把分叉的两道粉线压到同一刻尺上。最后到终端按 J。',repair:'内弧第二处需要在圈中跳起来。借力线每个圈都要按住 C 直到点亮。线段已走过就不会擦掉。',end:'拉下黑板边的收笔线，补出最后一截粉笔弧'},
 '0109':{name:'让两片气弧一起留在镜里',routes:['绕过星风口','展开挡光罩'],legs:['弧冠','左翼','右翼'],verb:'叠片',start:'在起点按 J 取一片云弧。绕风路线要跨两处稳定窗，在第二窗等风势变缓。护罩路线在挡光环摊开，让防风槽积满。到片夹后等暗段按 J 合片。',repair:'风流最强时不必冲过去。暗段窗口反复出现；在原环等到游标回到低段即可。',end:'升起镜框，把三片弧光合成一朵盔形云'},
 '0110':{name:'街角来信的最后一格',routes:['翻窗接分镜','压字排窄栏'],legs:['门廊来信','街角递纸','雨棚回信'],verb:'压下版框',start:'在字盘按 J 拿起原创分镜。翻窗路线先过下栏，再在上栏的金环跳一下，最后走过侧栏。窄栏路线在排字框摊开 C，稳到进度满。到末环按 J 压正版框。',repair:'漏了栏线就回到当前金环。翻窗跳过栏线时要站在金环内；窄栏持续摊开直到槽满。',end:'翻起自己的版面，让三格木刻纸偶接成一页街角来信'}
} as const;
export type NewyearDay=keyof typeof newyearVoyages;
export const isNewyearVoyage=(d:string):d is NewyearDay=>Object.hasOwn(newyearVoyages,d);
interface Capture {x:number; z:number; mode?:'flat'|'jump'|'high'|'low';}
interface Passage {points:Capture[]; settle?:boolean;}
const capture=(x:number,z:number,mode?:Capture['mode']):Capture=>({x,z,mode});
const workshop:Partial<Record<NewyearDay,{routes:[Passage,Passage]; window?:'middle'|'low'; rhythm:number}>>={
 '0106':{routes:[{points:[capture(-1.25,-.77),capture(.89,-1.37)]},{points:[capture(-.10,-1.36,'flat')],settle:true}],window:'low',rhythm:1.43},
 '0107':{routes:[{points:[capture(-1.49,-.81,'flat'),capture(.43,-1.49,'flat')]},{points:[capture(-.97,-1.68),capture(.45,-1.16,'high'),capture(1.54,-1.72)]}],window:'middle',rhythm:1.21},
 '0108':{routes:[{points:[capture(-1.28,-.88),capture(.15,-1.69,'jump'),capture(1.44,-1.19)]},{points:[capture(-.83,-1.45,'flat'),capture(1.07,-1.47,'flat')]}],rhythm:1.20},
 '0109':{routes:[{points:[capture(-1.41,-1.02),capture(.86,-1.44,'low')]},{points:[capture(.14,-1.68,'flat')],settle:true}],window:'low',rhythm:1.72},
 '0110':{routes:[{points:[capture(-1.44,-1.46),capture(.11,-1.78,'jump'),capture(1.38,-1.16)]},{points:[capture(-.27,-1.45,'flat')],settle:true}],rhythm:1.15}
};
export class NewyearVoyage extends ArenaEncounter{
 readonly design;private readonly settings:RpgDayConfig;
 engaged=false;steps=0;fill=0;elapsed=0;displacement=0;anchorHeld=false;anchorShots=0;
 bubble=0;shot:{start:Vec;crossX:number;age:number;goal:boolean}|null=null;wide=0;
 constructor(readonly day:NewyearDay,seed:string,config:RpgDayConfig){
  super(config.arena,seed,config);this.design=newyearVoyages[day];this.settings={...config,routes:this.design.routes,verb:this.design.verb,ending:this.design.end,rounds:3};this.layout.branches[1][1]=0;
 }
 override get rules(){return this.settings;}
 get title(){return this.design.legs[Math.min(this.round,2)];}
 get opening(){return this.design.start;}
 override get z(){return .04-this.round*2.64;}
 get side(){return this.initialSide*(this.round%2?-1:1);}
 get source():Vec{return [-2.57*this.side,0,this.z+.52];}
 get anchorSpot():Vec{return [this.source[0]-.65*this.side,.04,this.source[2]-1.49];}
 get passage(){return workshop[this.day]?.routes[this.route<0?0:1];}
 get chapter(){return workshop[this.day];}
 get nextCapture(){const route=this.passage;return route?.points[Math.min(this.steps,route.points.length-1)];}
 get wave(){return .5+.5*Math.sin(this.elapsed*(this.chapter?.rhythm??(this.day==='0104'?1.61:1.13))+this.initialSide*.81+this.round*.32);}
 get middle():Vec{
  const s=this.side,z=this.z;
  const point=this.nextCapture;if(point)return [point.x*s,0,z+point.z];
  if(this.day==='0102')return [-.28*s,0,z-1.10];
  if(this.day==='0103')return ([[-1.13*s,0,z-1.25],[.16*s,0,z-1.69],[1.62*s,0,z-.87]] as Vec[])[Math.min(this.steps,2)];
  if(this.day==='0104')return this.route<0?(this.steps?[1.05*s,.27,z-1.29]:[-1.28*s,.26,z-.86]):[-.21*s,0,z-1.29];
  return this.route<0?[-1.44*s,0,z-1.19]:[1.48*s,.44,z-1.19];
 }
 override get safeSpot():Vec{return this.day==='0102'?[this.route<0?this.side*.69:this.side*1.58,0,this.z+(this.route<0?-1.64:.30)]:[2.49*this.side,0,this.z+.11];}
 get nextSpot():Vec{return !this.engaged?this.source:this.fill===1?this.safeSpot:this.middle;}
 get kickX(){return (this.wave-.5)*6.25;}
 get windReady(){if(this.chapter)return this.chapter.window==='low'?this.wave<.43:this.chapter.window==='middle'?Math.abs(this.wave-.5)<.24:true;return this.day==='0104'?this.wave<.42:this.wave<.68;}
 get hint(){
  if(!this.engaged)return '走到「'+this.title+'」的起始环按 J。';
  if(this.day==='0102')return this.fill===1?(this.shot&&!this.shot.goal?'球偏'+(this.shot.crossX<0?'左':'右')+'了。原球座马上补球。':'在球座看风带，落点移到两柱之间时按 J 踢球。'):'先把球带过侧边接应线。';
  if(this.day==='0103')return this.fill===1?'回到终端压缝，按 J。':this.route>0&&!this.anchorHeld?'纸头待挂：在纸架按 J 留分身压住。':'第 '+(this.steps+1)+' 道纸边，进金环'+(this.route<0?'摊开滚过。':'将纸带拉紧。');
  if(this.day==='0104')return this.fill===1?'走到末端等风流退入低谷，按 J 拓弧。':this.route<0?'沿弧边绕向第 '+(this.steps+1)+' 个金环。':'在中央金环摊开挡住风流，等护盾槽满。';
  if(this.passage){
    if(this.fill===1)return '去末端金环'+(this.chapter?.window?'等指针进入目标段，':'，')+'按 J「'+this.design.verb+'」。';
    const at='在第 '+(this.steps+1)+' 处金环';
    switch(this.nextCapture?.mode){
      case 'flat':return at+'按住 C 摊开'+(this.passage.settle?'，让校准槽蓄满。':'。');
      case 'jump':return at+'弹跳，越过线尺。';
      case 'high':return at+'等指针到上段。';
      case 'low':return at+'等星风回到下段。';
      default:return '走到第 '+(this.steps+1)+' 处金环。';
    }
  }
  return this.fill===1?'舱脚已锁，去另一头按 J 记入观测册。':this.displacement>=.94?'水平泡已稳，原地按 J 锁脚。':'气泡'+(Math.abs(this.bubble)<.40?'接近中央，稳住。':this.bubble>0?'偏右，向左微调。':'偏左，向右微调。');
 }
 syncAnchor(shots:readonly {phase:string;center:Vec}[]){if(this.day==='0103'&&this.route>0&&this.engaged){const a=this.anchorSpot;this.anchorHeld=shots.some(s=>s.phase==='active'&&Math.hypot(s.center[0]-a[0],s.center[2]-a[2])<.82);}}
 override advance(dt:number,p:Vec,guard:boolean,_evading:boolean){
  if(this.shot){this.shot.age+=dt;if(this.shot.age>1.04)this.shot=null;}
  if(this.phase!=='duel')return;this.elapsed+=dt;
  if(this.engaged&&this.fill<1){
   const passage=this.passage,capture=this.nextCapture;
   if(passage&&capture){
    const mode=capture.mode,valid=!mode||(mode==='flat'?guard:mode==='jump'?p[1]>.32:mode==='high'?this.wave>.70:this.wave<.40);
    const holding=this.near(p,this.middle,.78)&&valid;
    if(passage.settle){
      this.displacement=Math.max(0,Math.min(1,this.displacement+dt*(holding?1.22:-.35)));
      if(this.displacement===1){this.steps=1;this.fill=1;}
    }else if(holding){
      this.steps++;this.displacement=this.steps/passage.points.length;
      if(this.steps===passage.points.length)this.fill=1;
    }
   }
   if(this.day==='0102'&&this.near(p,this.middle,1.03))this.fill=1;
   if(this.day==='0103'&&this.near(p,this.middle,.99)&&(this.route<0?guard:this.anchorHeld)){this.steps++;this.displacement=this.steps/3;if(this.steps===3)this.fill=1;}
   if(this.day==='0104'){
    if(this.route<0&&this.near(p,this.middle,.98)){this.steps++;this.displacement=this.steps/2;}
    if(this.route>0){const holding=guard&&this.near(p,this.middle,1.07);this.displacement=Math.max(0,Math.min(1,this.displacement+dt*(holding?1.35:-.16)));}
    if(this.displacement>=1)this.fill=1;
   }
   if(this.day==='0105'){const m=this.middle;this.bubble=Math.max(-1,Math.min(1,(p[0]-m[0])*.92+(this.wave-.5)*(this.route<0?.24:.46)));
    const stable=this.near(p,m,1.03)&&Math.abs(this.bubble)<.48&&(this.route<0?guard:this.windReady);
    this.displacement=Math.max(0,Math.min(1,this.displacement+dt*(stable?1.36:-.38)));}
  }
  this.clock=this.passage&&(this.fill===1&&this.chapter?.window||this.nextCapture?.mode==='high'||this.nextCapture?.mode==='low')?this.wave:this.day==='0102'?this.wave:this.day==='0104'&&this.fill===1?this.wave:this.displacement;
 }
 private miss(message:string){this.errors++;this.message=message;if(this.day!=='0102'&&--this.health===0)this.phase='lost';return false;}
 override strike(p:Vec,_body:{guard:boolean;airborne:boolean;dashing:boolean}){
  if(this.phase!=='duel')return false;
  if(!this.engaged){
    if(!this.near(p,this.source,1.36))return this.miss(this.hint);
    this.engaged=true;this.fill=this.day==='0102'&&this.route>0?1:0;this.message=this.hint;return false;
  }
  if(this.day==='0103'&&this.route>0&&!this.fill&&this.near(p,this.source,.96)){this.message='压住纸头，再沿金环拉开纸边。';return false;}
  if(this.day==='0105'&&this.fill<1&&this.near(p,this.middle,1.01)&&this.displacement>=.94){this.fill=1;this.message=this.hint;return false;}
  if(this.fill<1||!this.near(p,this.safeSpot,1.57))return this.miss(this.hint);
  if((this.day==='0104'||this.chapter?.window)&&!this.windReady)return this.miss(this.hint);
  if(this.day==='0102'){
    if(this.shot&&this.shot.age<.79){this.message='球正在飞。';return false;}
    const x=this.kickX+(p[0]-this.safeSpot[0])*1.35,goal=Math.abs(x)<1.65;
    this.shot={start:[p[0],.27,p[2]],crossX:x,age:0,goal};
    if(!goal){this.wide++;return this.miss('球从'+(x<0?'左':'右')+'柱外飞过，原地再踢一次。');}
  }
  this.round++;this.steps=this.fill=this.displacement=0;this.engaged=this.anchorHeld=false;this.health=3;
  if(this.round===3)this.phase='finale';this.message=this.phase==='finale'?this.design.end:this.title;return true;
 }
}
