/** The models, illustrated settings and player actions are fictional exhibition pieces. */
import {within,winterMarks,type Point} from './winter-chapters';
export {within,type Point};
import {yearendChapters,type YearendChapter} from '../../content/chronicle-yearend';
export {yearendChapters};
export type {YearendChapter,YearendStory} from '../../content/chronicle-yearend';
export const isYearendChapter=(id:string)=>Object.hasOwn(yearendChapters,id);
const arcs:Point[][]=[
 [[-1.35,-.43],[-.12,-.82],[1.22,-.46],[2.11,.42]],
 [[1.35,-.43],[.12,-.82],[-1.22,-.46],[-2.11,.42]]
];
export class YearendRun{
 readonly spec:YearendChapter;readonly marks=new Set<number>();readonly collectibles=winterMarks;
 step=0;mask=0;chosen=-1;carry=-1;count=0;stock=0;errors=0;elapsed=0;end=-1;t:number;pin=false;flat=false;
 water=.16;shake=1;aim=0;aimSide=-1;aimHold=0;locked=0;photo=0;until=0;note='';view:'play'|'low'|'far'='play';
 constructor(readonly id:string,seed:number,readonly markCount:number){this.spec=yearendChapters[id];if(!this.spec)throw Error('未知展室');this.t=seed%91*.13;}
 get story(){return this.spec.story;}get ready(){return this.step===this.spec.tasks.length;}
 get side(){return this.mask&1?1:0;}
 get cycle(){return Math.sin(this.t*1.18);}get wind(){return this.cycle>-.03;}
 get targetWater(){return (this.step===1)===(this.chosen===0)?.38:.72;}
 get onLevel(){return Math.abs(this.water-this.targetWater)<.087;}
 get needle(){return this.t*1.28;}inGroove(i:number){return Math.cos(this.needle-(i?.55:2.58))>.71;}
 get overhead(){return Math.cos(this.t*1.43)>.65;}get zero(){return this.shake<.10;}
 get pendulum(){return Math.sin(this.t*1.37);}
 get horizon(){return Math.sin(this.t*1.12);}get rise(){return .5+.5*Math.sin(this.t*1.07);}
 get framed(){return this.rise>.73;}
 signal(i:number){
  if(this.story==='clock')return i===2?Math.abs(this.pendulum)<.33:i?this.pendulum>.44:this.pendulum<-.44;
  if(this.story==='lotus')return i?this.cycle<-.10:this.cycle>.10;
  return Math.abs(this.aim-(i?-.34:.34))<.25;
 }
 get ripple():Point{const k=this.carry?1:-1;return this.count===0?[k*1.14,.04]:[k*.43,-.69];}
 arcSite(i:number):Point{const [x,z]=this.spec.sites[i];return [x+(i?-.26:.26),z];}
 get goal():Point{const a=this.spec.sites;if(this.ready)return this.spec.finish;if(!this.step&&this.spec.pin)return this.spec.pin;
  switch(this.story){
   case 'boat':return this.chosen<0?a[0]:arcs[this.chosen][Math.min(3,this.count)];
   case 'flyer':return a[this.side];case 'lotus':return this.carry>=0?this.ripple:a[this.side];
   case 'clock':return this.step===2?a[2]:a[this.side];
   case 'compass':return this.step===2?a[2]:this.arcSite(this.side);
   case 'locks':return a[this.step===2?2+1-this.chosen:Math.max(0,this.chosen)];
   case 'broadcast':return this.step===2?a[2]:a[this.side];
   case 'balance':return !this.step?a[4]:this.carry<0?a[this.side]:a[2+this.carry];
   case 'bulbs':return this.stock?a[[0,1,2,3].find(i=>!(this.mask&(1<<i)))??0]:a[4];
   case 'earthrise':return a[this.step===1?2:Math.max(0,this.chosen)];
  }
 }
 get alternative():Point|undefined{
  if(this.ready||this.carry>=0||this.spec.pin&&!this.step)return;
  if(this.story==='balance'&&!this.step||this.story==='earthrise'&&this.step)return;
  if(this.story==='bulbs')return this.stock?this.spec.sites[[1,3,2,0].find(i=>!(this.mask&(1<<i)))??0]:undefined;
  return this.chosen<0?this.spec.sites[1]:undefined;
 }
 get hint():[string,string]{
  const [label,how]=this.ready?['完成最后一步',this.spec.finishHelp]:this.spec.tasks[this.step];
  const extra=this.story==='bulbs'&&this.stock?' · 手中微光 '+this.stock:'';
  return [label+extra+' · 藏签 '+this.marks.size+'/'+this.markCount,this.t<this.until?this.note:how];
 }
 say(v:string,error=false){this.note=v;this.until=this.t+2.2;if(error)this.errors++;}
 setSide(i:number){if(this.chosen<0)this.chosen=i;}
 tick(dt:number,x:number,z:number,spread:number,air:boolean,pinned:boolean){
  this.t+=dt;this.elapsed+=dt;this.pin=pinned;this.flat=spread>.54;
  if(this.end>=0){this.end+=dt;return;}
  if(air)for(let i=0;i<this.markCount;i++)if(within(x,z,this.collectibles[i],.62))this.marks.add(i);
  if(this.ready)return;if(this.spec.pin&&!this.step&&this.pin)this.step=1;
  if(this.story==='boat'&&this.step&&this.flat===(this.step===1)&&within(x,z,this.goal,.43)){
   this.count++;if(this.count===2||this.count===4)this.step++;
  }
  if(this.story==='locks'&&this.step){
   const fill=this.flat&&within(x,z,this.goal,.71);this.water=Math.max(.07,Math.min(.92,this.water+dt*(fill?.19:-.19)));
  }
  if(this.story==='balance'&&!this.step){
   const holding=this.flat&&within(x,z,this.goal);this.shake=holding?Math.max(0,this.shake-dt*.95):Math.min(1,this.shake+dt*.34);
  }
  if(this.story==='compass'&&this.step<2){
   const i=x<0?0:1,p=this.spec.sites[i],angle=Math.max(-1,Math.min(1,(x-p[0])*1.30)),notch=i?-.34:.34;
   // The sighting wheel rests in its notch while the soft body changes height.
   if(!air&&within(x,z,p)&&Math.abs(angle-notch)<.25){this.aimSide=i;this.aimHold=this.t+1.4;}
   this.aim=this.aimSide===i&&this.t<this.aimHold?notch:angle;
  }
  if(this.story==='lotus'&&this.carry>=0&&within(x,z,this.ripple,.44)){
   this.count++;if(this.count===2){this.mask|=1<<this.carry;this.carry=-1;this.count=0;this.step++;}
  }
 }
 act(x:number,z:number,air:boolean){
  if(this.end>=0)return;if(this.ready){if(within(x,z,this.spec.finish,.78))this.end=0;else this.say(this.spec.finishHelp,true);return;}
  if(this.spec.pin&&!this.pin){this.say(this.spec.repair,true);return;}
  const a=this.spec.sites,i=a.findIndex(p=>within(x,z,p)),old=this.step,unused=i>=0&&i<2&&!(this.mask&(1<<i));
  switch(this.story){
   case 'boat':if(!this.step&&i>=0){this.chosen=i;this.step++;}break;
   case 'flyer':if(unused&&this.wind&&(i?air:this.flat)){this.setSide(i);this.mask|=1<<i;this.step++;}break;
   case 'locks':if(!this.step&&i>=0&&i<2){this.chosen=i;this.step++;}
    else if(this.step&&within(x,z,this.goal)&&this.onLevel){this.step++;this.locked=this.water;}break;
   case 'broadcast':
    if(this.step===1&&unused&&this.flat&&this.inGroove(i)){this.setSide(i);this.mask|=1<<i;if(this.mask===3)this.step=2;this.say('这一段已经录入，唱针会接着下一段。');return;}
    if(this.step===2&&i===2&&this.overhead)this.step++;break;
   case 'balance':
    if(!this.step&&i===4&&this.zero&&this.flat)this.step++;
    else if(this.step===1&&unused){this.setSide(i);this.carry=i;this.step=2;}
    else if(this.step===2&&i===2+this.carry){this.mask|=1<<this.carry;this.carry=-1;this.step=this.mask===3?3:1;}break;
   case 'lotus':if(this.carry<0&&unused&&this.signal(i)&&(i?air:this.flat)){
    this.setSide(i);this.carry=i;this.count=0;this.say('潮纹已经亮起，跟着地上的两圈涟漪走向花心。');return;}break;
   case 'clock':case 'compass':
    if(this.step<2&&unused&&this.signal(i)&&(i?air:this.flat)){this.setSide(i);this.mask|=1<<i;this.step++;}
    else if(this.step===2&&i===2&&(this.story==='clock'?this.signal(2):this.flat))this.step++;break;
   case 'bulbs':
    if(i===4&&this.flat&&!this.stock){this.stock=2;this.say('两颗微光珠已经托好。');return;}
    if(i>=0&&i<4&&this.stock>0&&!(this.mask&(1<<i))){this.setSide(i%2);this.stock--;this.count++;this.mask|=1<<i;
     this.step=this.count===4?3:this.count>=2?2:1;this.say('已经点亮 '+this.count+' 盏灯。');return;}break;
   case 'earthrise':
    if(!this.step&&i>=0&&i<2){this.chosen=i;this.step++;}
    else if(this.step===1&&i===2&&this.flat&&Math.abs(this.horizon)<.34)this.step++;
    else if(this.step===2&&i===this.chosen&&air&&this.framed){this.photo=this.rise;this.step++;}break;
  }
  if(this.step===old)this.say(this.spec.repair,true);else this.until=0;
 }
}
