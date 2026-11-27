import {within,winterMarks,type Point} from './winter-chapters';
import {monthendChapters,type MonthendChapter} from '../../content/chronicle-monthend';
export {monthendChapters,isMonthendChapter,type MonthendChapter,type MonthendStory} from '../../content/chronicle-monthend';
export {within,type Point};
const middle:Point=[0,.60];
export class MonthendRun{
 readonly spec:MonthendChapter;readonly marks=new Set<number>();readonly collectibles=winterMarks;
 step=0;mask=0;chosen=-1;carry=-1;count=0;errors=0;t:number;elapsed=0;pin=false;flat=false;end=-1;until=0;note='';
 meter=0;hold=0;aim=0;detent=0;left=0;right=0;view:'play'|'low'|'far'='play';
 wings=[.13,.89];focalSpot=.50;focusDepth=.10;rulers=[.5,.5];
 constructor(readonly id:string,seed:number,readonly markCount:number){this.spec=monthendChapters[id];if(!this.spec)throw Error('未登记的展室');this.t=seed%89*.131;}
 get story(){return this.spec.story;}get ready(){return this.step>=this.spec.tasks.length;}
 get side(){return this.mask===1?1:0;}get wave(){return Math.sin(this.t*1.23);}
 signal(i:number){return i?this.wave>.25:this.wave<-.25;}
 get aligned(){return this.t<this.detent;}
 get source(){return this.carry<0?this.side:this.carry;}
 get aimBase():Point{return this.spec.sites[(this.story==='layers'?2:0)+this.source];}
 get aimPoint():Point{const [x,z]=this.aimBase;return [x+(this.source?-.27:.27),z];}
 get mirrorGoal(){return this.mask?this.focalSpot:this.carry===0?.42:.61;}
 get spotJoined(){return this.carry>=0&&Math.abs(this.wings[this.carry]-this.mirrorGoal)<.076;}
 get bestFocus(){return .37+this.focalSpot*.49;}
 get focused(){return Math.abs(this.focusDepth-this.bestFocus)<.071;}
 rulerPoint(i:number):Point{const [x,z]=this.spec.sites[i];return i?[x,z-.43]:[x-.43,z];}
 get rulerIndex(){return this.carry<0?0:this.carry;}
 get targetMark(){return this.story==='countdown'?[.26,.54,.80][Math.min(2,this.count)]:(this.step===1?this.chosen:1-this.chosen)===0?.37:.69;}
 get inBand(){return Math.abs(this.meter-this.targetMark)<(this.story==='countdown'?.053:.073);}
 get goal():Point{
  const a=this.spec.sites;if(this.ready)return this.spec.finish;if(this.spec.pin&&!this.step)return this.spec.pin;
  switch(this.story){
   case 'rubbing':return this.step===1?a[0]:this.count===0?[0,-.46]:a[1-this.chosen];
   case 'concert':return this.step===0?a[0]:this.step===1?a[2]:a[this.count===0?this.chosen:1-this.chosen];
   case 'arch':return a[this.left<=this.right?0:1];
   case 'contacts':return this.step===2?a[2]:this.carry<0?a[this.side]:this.aimPoint;
   case 'mirrors':return this.step===2?a[2]:a[this.carry<0?this.side:this.carry];
   case 'galaxy':return this.step===2?a[2]:this.carry<0?a[this.side]:this.rulerPoint(this.carry);
   case 'binding':return this.step===2?a[this.count?3:2]:this.carry<0?a[this.side]:a[2+this.carry];
   case 'layers':return this.carry<0?a[this.side]:this.aimPoint;
   case 'dispatch':return this.carry<0?a[this.side]:a[2];
   case 'phonics':return this.step===0?a[0]:this.step===1?a[2]:a[1-this.chosen];
   case 'cabinet':case 'sketch':return this.step===2||this.carry>=0?a[2]:a[this.side];
   case 'aqueduct':return a[this.step===0?0:this.step===1?this.chosen:1-this.chosen];
   case 'stagePhoto':case 'station':return a[this.side];
   case 'projector':return !this.step?a[0]:this.step===1?a[2+(this.count?1-this.chosen:this.chosen)]:this.count===2?middle:a[this.chosen];
   case 'archive':return this.step===2?middle:this.carry<0?a[this.side]:a[2+this.carry];
   case 'lattice':return !this.step?a[0]:a[[2+this.chosen,2+1-this.chosen,1-this.chosen,this.chosen][Math.min(this.count,3)]];
   case 'studio':return this.step===2?a[2]:a[this.side];
   case 'countdown':return a[Math.max(0,this.chosen)];
  }
 }
 get alternative():Point|undefined{
  if(this.ready||this.carry>=0||this.spec.pin&&!this.step)return;
  if(this.story==='arch'&&this.left===this.right)return this.spec.sites[1];
  if(this.chosen<0)return this.spec.sites[1];
 }
 get hint():[string,string]{const [h,msg]=this.ready?['完成最后一步',this.spec.finishHelp]:this.spec.tasks[this.step];
  return [h+' · 藏签 '+this.marks.size+'/'+this.markCount,this.t<this.until?this.note:msg];}
 say(msg:string,err=false){this.note=msg;this.until=this.t+2.15;if(err)this.errors++;}
 choose(i:number){if(this.chosen<0)this.chosen=i;this.carry=i;}
 place(){this.mask|=1<<this.carry;this.carry=-1;this.detent=0;this.hold=0;}
 tick(dt:number,x:number,z:number,spread:number,air:boolean,pinned:boolean){
  this.t+=dt;this.elapsed+=dt;this.flat=spread>.54;this.pin=pinned;
  if(this.end>=0){this.end+=dt;return;}
  if(air)for(let i=0;i<this.markCount;i++)if(within(x,z,this.collectibles[i],.62))this.marks.add(i);
  if(this.ready)return;
  if(this.spec.pin&&!this.step&&pinned)this.step=1;
  const a=this.spec.sites;
  switch(this.story){
   case 'rubbing':if(this.step===2&&pinned&&this.flat&&within(x,z,this.goal,.48)&&++this.count===2)this.step++;break;
   case 'concert':if(this.step===1){this.meter=Math.max(0,Math.min(1,this.meter+dt*(this.flat&&within(x,z,a[2])?.75:-.34)));}break;
   case 'layers':case 'contacts':
    if(this.carry>=0){const [cx,cz]=this.aimBase,dir=this.carry?-1:1;this.aim=(x-cx)*dir;
     if(this.flat&&Math.abs(z-cz)<.50&&this.aim>.11&&this.aim<.44)this.detent=this.t+1.15;}
    break;
   case 'mirrors':
    if(this.carry>=0&&within(x,z,a[this.carry])){const sign=this.carry?-1:1;
     this.wings[this.carry]=Math.max(.04,Math.min(.96,this.wings[this.carry]+dt*(this.flat?.32:-.23)*sign));}
    if(this.step===2&&within(x,z,a[2]))this.focusDepth=Math.max(.03,Math.min(.97,this.focusDepth+dt*(this.flat?.27:-.24)));
    break;
   case 'galaxy':if(this.carry>=0){const j=this.carry,[cx,cz]=a[j];this.rulers[j]=Math.max(0,Math.min(1,.5+(j?cz-z:x-cx)*.8));
    if(this.flat&&within(x,z,this.rulerPoint(j),.25))this.detent=this.t+1.2;}break;
   case 'binding':if(this.step===2&&this.count===0&&within(x,z,a[2]))this.count=1;break;
   case 'cabinet':if(this.step<2&&this.carry<0){const i=a.findIndex(p=>within(x,z,p));this.hold=i>=0&&i<2&&this.flat?this.hold+dt:0;}break;
   case 'aqueduct':if(this.step){this.meter=Math.min(.93,Math.max(.05,this.meter+dt*(this.flat&&within(x,z,this.goal)?.23:-.17)));}break;
   case 'projector':if(this.step===2&&this.count===2&&within(x,z,middle,.44))this.count++;break;
   case 'lattice':if(this.step&&this.flat===(this.step===1)&&this.count<4&&within(x,z,this.goal,.46)){this.count++;if(this.count===2)this.step=2;}break;
   case 'countdown':if(this.step&&within(x,z,a[this.chosen],.72)){this.meter+=dt*(this.flat?.043:.185);
    if(this.meter>this.targetMark+.093){this.meter=this.count===0?0:this.count===1?.26:.54;this.say('回到上一道锁扣，可以继续放绳。',true);}}break;
  }
 }
 act(x:number,z:number,air:boolean){
  if(this.end>=0)return;
  if(this.ready){if(within(x,z,this.spec.finish,.77))this.end=0;else this.say(this.spec.finishHelp,true);return;}
  if(this.spec.pin&&!this.pin){this.say(this.spec.repair,true);return;}
  const a=this.spec.sites,i=a.findIndex(p=>within(x,z,p)),spare=i>=0&&i<2&&!(this.mask&(1<<i));
  const near=within(x,z,this.goal),old=this.step;
  switch(this.story){
   case 'rubbing':if(this.step===1&&this.flat&&spare){this.chosen=i;this.step++;}break;
   case 'concert':if(!this.step&&spare){this.chosen=i;this.step++;}
    else if(this.step===1&&i===2&&this.flat&&this.meter>.70)this.step++;
    else if(this.step===2&&near&&this.signal(i)&&(!this.count||!this.flat)){this.count++;if(this.count===2)this.step++;this.say('音符已经落在谱上。');return;}break;
   case 'arch':if(i>=0&&i<2&&this.flat){const l=this.left+Number(i===0),r=this.right+Number(i===1);
    if(Math.max(l,r)<=2&&Math.abs(l-r)<=1){this.choose(i);this.carry=-1;this.left=l;this.right=r;this.step=l+r===4?3:2;
     this.say('左岸 '+l+'/2 · 右岸 '+r+'/2');return;}}break;
   case 'contacts':case 'layers':
    if(this.step<2||this.story==='layers'){
     if(this.carry<0&&spare){this.choose(i);this.step=this.story==='layers'&&this.mask!==0?2:1;this.say('已接入，去对应滑台套准。');return;}
     if(this.carry>=0&&this.aligned&&near&&this.flat){this.place();this.step=this.mask===3?(this.story==='layers'?3:2):0;this.say('这一侧已对准。');return;}
    }else if(i===2)this.step++;break;
   case 'mirrors':case 'galaxy':
    if(this.step<2&&this.carry<0&&spare){this.choose(i);this.step=1;this.say('已接住这一组，可以读数。');return;}
    if(this.step===1&&this.carry>=0&&near&&(this.story==='mirrors'?this.spotJoined:this.flat&&this.aligned)){
     if(this.story==='mirrors'&&!this.mask)this.focalSpot=this.wings[this.carry];
     this.place();this.step=this.mask===3?2:0;this.say('读数已经留下。');return;}
    if(this.step===2&&i===2&&(this.story==='mirrors'?this.focused:air))this.step++;break;
   case 'binding':case 'archive':
    if(this.step<2&&this.carry<0&&spare){this.choose(i);this.step=1;this.say('已托起，去内侧的同纹槽。');return;}
    if(this.step===1&&this.carry>=0&&near&&this.flat&&(this.story==='binding'||this.signal(this.carry))){this.place();this.step=this.mask===3?2:0;this.say('已收入一张。');return;}
    if(this.step===2&&(this.story==='binding'?this.count>0&&i===3:near&&!this.flat))this.step++;break;
   case 'dispatch':if(this.carry<0&&spare){this.choose(i);this.step=2;}
    else if(this.carry>=0&&near&&this.flat&&Math.cos(this.t*1.49)>.38){this.place();this.step=this.mask===3?3:1;}break;
   case 'phonics':if(!this.step&&spare){this.chosen=i;this.step++;}
    else if(this.step===1&&near&&this.flat)this.step++;else if(this.step===2&&near&&air)this.step++;break;
   case 'cabinet':case 'sketch':
    if(this.step<2&&this.carry<0&&spare&&(this.story==='cabinet'?this.hold>.66:i?air:this.flat)){
     this.choose(i);this.step=1;this.say('已记下图形，可以回到中央留图。');return;}
    if(this.step===1&&this.carry>=0&&i===2){this.place();this.step=this.mask===3?2:0;this.say('这一图已经留下。');return;}
    if(this.step===2&&i===2&&this.flat)this.step++;break;
   case 'aqueduct':if(!this.step&&spare){this.chosen=i;this.step++;}
    else if(this.step&&near&&this.inBand){this.mask|=1<<i;this.step++;}break;
   case 'station':case 'stagePhoto':if(spare&&this.signal(i)&&(this.story==='station'?this.flat:i?air:this.flat)){
    this.choose(i);this.place();this.step++;}break;
   case 'projector':if(!this.step&&spare){this.chosen=i;this.step++;}
    else if(this.step===1&&near&&this.flat===(this.count===0)){this.count++;if(this.count===2)this.step++;this.say('片齿已咬住。');return;}
    else if(this.step===2&&near&&this.count===3)this.step++;break;
   case 'lattice':if(!this.step&&spare){this.chosen=i;this.step++;}
    else if(this.step===2&&this.count===4&&near)this.step++;break;
   case 'studio':if(this.step===1&&spare&&this.flat&&this.signal(i)){this.choose(i);this.place();if(this.mask===3)this.step=2;this.say('已留下一段回声。');return;}
    if(this.step===2&&i===2)this.step++;break;
   case 'countdown':if(!this.step&&spare){this.chosen=i;this.step++;}
    else if(this.step&&near&&this.inBand&&(this.count<2||this.flat)){this.count++;this.step=this.count===3?3:this.count===2?2:1;this.say('这段已经扣稳。');return;}break;
  }
  if(this.step===old)this.say(this.spec.repair,true);else this.until=0;
 }
}
