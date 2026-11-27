import {RelayCourse,type Exhibit} from './season-skirmish';
import type {Vec} from '../slime/types';

export const winterRelayMaps:Record<string,Exhibit>={
 '1207':{kind:'shiplink',name:'回执从海面升起',pads:['岸台','船上收信盘','回执灯','海星钟'],lesson:'先把分身投给身前的岸台。',middle:'向船上收信盘投分身。留守至回执灯蓄满，按 X 带回回执，再送到东岸。',end:'回执穿过夜空，船灯逐次亮起',sky:['#142745','#dc9480'],stone:'#708985',trim:'#ffbf68'},
 '1208':{kind:'winterlight',name:'把风存进冬夜的窗',pads:['试灯','储光风轮','窗边灯座','街尾门灯'],lesson:'投亮试灯，沿两侧路沿走向风轮。',middle:'用分身守住储光风轮。本体到街中央迎风等候，或沿左巷靠近叶轮加快蓄光。灯槽满后投亮右边窗口。',end:'冬夜街上的窗一扇扇亮起来',sky:['#243d6b','#d39c93'],stone:'#818caa',trim:'#ffe1a3'},
 '1209':{kind:'starboard',name:'海面升起十四盏星灯',pads:['甲板罗盘','左舷星架','右舷星架','船首升旗盘'],lesson:'把第一团分身投向甲板上的罗盘。',middle:'先选任意一舷。船横摇时，左舷落低投左架，右舷落低投右架。两架各带七枚星灯。',end:'十四枚星灯在甲板外展开',sky:['#173450','#8fc6c8'],stone:'#7c9aa8',trim:'#f5d593'},
 '1210':{kind:'counter',name:'翻到第四百格',pads:['年表起点','翻牌轴','定位销','纪念抽屉'],lesson:'投在近旁的年表起点，启动翻牌。',middle:'分身压住左轴，等计数牌显示 400 时按 X 回收。站在轴的左侧可以慢速翻页，再把分身投到定位销。',end:'年表抽屉推出第四百格纪念牌',sky:['#3b5365','#f0cca0'],stone:'#ac9479',trim:'#eac46c'},
 '1211':{kind:'cableway',name:'桥心的一车压载',pads:['启程哨','西岸吊车','东岸桥扣','通桥铃'],lesson:'向启程哨投分身，让两岸的桥灯亮起。',middle:'分身留在西岸吊车。本体沿桥心把载重车带过中线，也可绕去桥北横梁，再投东岸桥扣。',end:'桥扣咬合，第一辆车缓缓过桥',sky:['#72a3ae','#f4d7ac'],stone:'#9c967e',trim:'#edb373'}
};
type Shot={phase:string;center:Vec};
export class WinterReception extends RelayCourse {
 charge=0; aligned=false; launches=0; crossing=0;
 constructor(readonly day:string,seed:string){super(day,seed,winterRelayMaps[day]);}
 get face(){return 397+Math.min(4,Math.floor(this.charge%5));}
 get open(){return this.spec.kind==='counter'?this.face===400:this.charge>=1;}
 override available(i:number){return this.spec.kind==='starboard'&&i===2?this.done.has(0)&&!this.done.has(2):super.available(i);}
 override cast(i:number,p:Vec){
   if(i===1&&this.spec.kind==='cableway'&&p[0]>-.9)return this.reject('先到西岸吊车旁留守，再带着载重车过桥。');
   if(i===2&&['shiplink','counter'].includes(this.spec.kind)&&!this.aligned)return this.reject('先在左侧留守，等金色窗口出现时回收。');
   if(i===2&&this.spec.kind==='winterlight'&&this.charge<1)return this.reject('储光槽还在上升，到街中央等候或靠近左巷风轮。');
   if(i===2&&this.spec.kind==='cableway'&&this.crossing<1)return this.reject('到桥心的铜线来，把载重车带过中线。');
   if(this.spec.kind==='starboard'&&(i===1&&this.sweep>.55||i===2&&this.sweep<.45))return this.reject('这侧船舷还没落低，留意船边的刻度。');
   const ok=super.cast(i,p);if(ok)this.launches++;return ok;
 }
 override update(dt:number,p:Vec,shots:readonly Shot[]){
   const hit=super.update(dt,p,shots),kind=this.spec.kind;
   if(this.westHeld&&!this.done.has(2)&&kind!=='starboard'){
     const a=this.pads[1],exists=shots.some(s=>s.phase==='active'&&Math.hypot(s.center[0]-a[0],s.center[2]-a[2])<.79);
     if(!exists){this.done.delete(1);this.westHeld=false;this.charge=0;this.crossing=0;this.hint='分身离开了左侧机关，原地补投即可。';}
     else if(kind==='counter')this.charge+=dt*(p[0]<-1?.62:1.12);
     else if(kind==='winterlight')this.charge=Math.min(1,this.charge+dt*(p[0]<-1?.72:.35));
     else if(kind==='shiplink')this.charge=Math.min(1,this.charge+dt*(p[0]>1?.82:.48));
     else if(kind==='cableway'&&Math.abs(p[2]+.75)<1.65)this.crossing=Math.max(this.crossing,Math.max(0,Math.min(1,(p[0]+1.65)/3)));
   }
   return hit;
 }
 override recall(){
   if(this.westHeld&&!this.done.has(2)&&this.spec.kind!=='starboard'){
     this.aligned=['shiplink','counter'].includes(this.spec.kind)&&this.open;
     if(!this.aligned){this.done.delete(1);this.retries++;this.charge=0;this.crossing=0;this.hint='已松开左侧机关，到同一站重新留守。';}
     else this.hint='回收成功，现在可以投向东侧。';
   }
   super.recall();
 }
 override retry(){if(this.westHeld&&!this.done.has(2)&&this.spec.kind!=='starboard'){this.done.delete(1);this.charge=0;this.crossing=0;}super.retry();}
 override get instruction(){
   if(this.westHeld&&!this.done.has(2)){
     if(this.spec.kind==='counter')return '翻牌 '+this.face+'　·　出现 400 时按 X 回收。';
     if(this.spec.kind==='shiplink')return this.open?'回执到了！按 X 回收分身，再投东岸。':'等待回执　'+Math.floor(this.charge*100)+'%　·　靠近东岸可提前听见。';
     if(this.spec.kind==='winterlight')return this.open?'窗边灯座已可接应，向它投分身。':'风轮储光 '+Math.floor(this.charge*100)+'%　·　左巷的风更强。';
     if(this.spec.kind==='cableway')return this.crossing>=1?'载重车已过线，投向东岸桥扣。':'沿桥心铜线从左走到右　'+Math.floor(this.crossing*100)+'%';
   }
   return super.instruction;
 }
}
