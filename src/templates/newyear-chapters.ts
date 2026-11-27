import {newyearChapters} from '../../content/chronicle-newyear';
import {within,winterMarks,type Point} from './winter-chapters';
export {isNewyearChapter,newyearChapters,type NewyearStory,type NewyearChapter} from '../../content/chronicle-newyear';
export {within};
export class NewyearRun{
 readonly spec;readonly marks=new Set<number>();readonly collectibles=winterMarks;
 step=0;chosen=-1;side=-1;mask=0;count=0;errors=0;checks=0;t:number;elapsed=0;end=-1;
 flat=false;pin=false;lifted=false;notice='';until=0;turn=0;focus=.16;meter=[.11,.89];balance=.50;
 view:'play'|'low'|'far'='play';
 constructor(readonly id:string,seed:number,readonly markCount:number){this.spec=newyearChapters[id];if(!this.spec)throw Error('未知的新年展厅');this.t=seed%131*.071;this.turn=seed%29*.15;}
 get story(){return this.spec.story;}get ready(){return this.step===3;}
 get sites(){return this.spec.sites;}get other(){return this.chosen===1?0:1;}
 get focusGoal(){return this.chosen===1?.56:.42;}
 get inFocus(){return Math.abs(this.focus-this.focusGoal)<.084;}
 get windowSide(){return Math.cos(this.turn); }
 get height(){return .5+.47*Math.sin(this.t*1.22);}
 window(i:number){return this.story==='flyby'?(i?this.windowSide>.60:this.windowSide<-.60):i?this.height>.71:this.height<.29;}
 get mark(){return this.mask?this.balance:this.side===1?.64:.38;}
 get matched(){return this.side>=0&&Math.abs(this.meter[this.side]-this.mark)<.077;}
 get sideFree(){return this.mask===1?1:0;}
 get inkPoint():Point{return this.chosen===1?[1.14,.55]:[.95,-.64];}
 get goal():Point{
   if(this.ready)return this.spec.finish;
   if(this.spec.pin&&!this.step)return this.spec.pin;
   const a=this.sites,j=Math.max(0,this.chosen);
   switch(this.story){
   case 'slides':return this.step===2?a[2]:a[this.sideFree];
   case 'flyby':return a[this.step===2?this.other:j];
   case 'lamps':return this.step===2?a[2]:a[0];
   case 'classroom':return this.step===0?this.collectibles.find((_,i)=>i<this.markCount&&!this.marks.has(i))??a[0]:a[this.side>=0?this.side:this.sideFree];
   case 'typewood':return !this.step?a[0]:this.step===1?a[2+j]:a[this.count?this.other:2+this.other];
   case 'courtyard':return this.step===1?a[2]:this.step===2&&!this.count?this.inkPoint:a[this.step===0?0:1];
   case 'lift':return a[this.sideFree];
   case 'lever':return this.step===2?a[2]:a[this.side>=0?this.side:this.sideFree];
   case 'strand':return !this.step?a[0]:this.step===1?a[2+j]:this.count===0?[0,-.68]:a[this.count===1?2+this.other:this.other];
   }
   throw Error('缺少新年展室目标 '+this.story);
 }
 get alternative():Point|undefined{
   if(this.ready||this.spec.pin&&!this.step||this.mask||this.chosen>=0||this.side>=0)return;
   if(this.story==='classroom'&&!this.step||this.story==='courtyard'&&!this.step)return;
   return this.sites[this.story==='courtyard'?3:1];
 }
 get hint():[string,string]{
   if(this.story==='courtyard'&&this.step===2&&!this.count)return ['沿笔路接墨','保持摊开，沿刚才所选的笔路经过亮着的铜环。墨痕接到右端后，去笔架切火收笔。'];
   const [h,msg]=this.ready?['亲手收尾',this.spec.finishHelp]:this.spec.tasks[this.step];
   const held=this.markCount?' · '+(this.story==='classroom'?'手笺 ':['flyby','typewood','lift','strand'].includes(this.story)?'菱晶 ':'信物 ')+this.marks.size+'/'+this.markCount:'';
   return [h+held,this.t<this.until?this.notice:msg];
 }
 say(msg:string){this.notice=msg;this.until=this.t+2.1;}
 reject(msg:string,wrongElement=false){this.say(msg);this.errors++;if(wrongElement)this.checks++;}
 choose(i:number){if(this.chosen<0)this.chosen=i;this.side=i;}
 tick(dt:number,x:number,z:number,spread:number,air:boolean,pinned:boolean,_element=0){
   this.t+=dt;this.elapsed+=dt;this.flat=spread>.54;this.pin=pinned;
   if(this.end>=0){this.end+=dt;return;}
   if(air)for(let i=0;i<this.markCount;i++)if(within(x,z,this.collectibles[i],.62))this.marks.add(i);
   if(this.ready)return;
   if(!this.step&&pinned&&this.spec.pin&&(!this.spec.requiredMarks||this.marks.size===this.markCount))this.step=1;
   const a=this.sites;
   switch(this.story){
   case 'slides':if(this.step===2&&within(x,z,a[2]))this.focus=Math.max(.04,Math.min(.96,this.focus+dt*(this.flat?.25:-.19)));break;
   case 'flyby':this.turn+=dt*(this.chosen===1?-1:1)*(this.flat?.76:1.48);break;
   case 'lamps':if(this.step===2&&this.count===1&&!pinned){this.step=3;this.say('书灯已回到本体，可以合页。');}break;
   case 'classroom':if(!this.step&&this.marks.size===this.markCount)this.step=1;break;
   case 'typewood':if(this.step===2&&this.count===0&&within(x,z,a[2+this.other],.52))this.count=1;break;
   case 'courtyard':if(this.step===2&&!this.count&&this.flat&&within(x,z,this.inkPoint,.39)){this.count=1;this.say('印环已吃墨。去右端笔架切火（3），保持摊开按 F 收笔。');}break;
   case 'strand':if(this.step===2&&this.count===0&&this.flat&&within(x,z,[0,-.68],.54)){this.count=1;this.say('中央线环已经吃住绳。');}break;
   }
   if((this.story==='classroom'||this.story==='lever')&&this.side>=0&&within(x,z,a[this.side])){
     const sign=this.side===0?1:-1;this.meter[this.side]=Math.max(.02,Math.min(.98,this.meter[this.side]+dt*(this.flat?.30:-.20)*sign));
   }
 }
 act(x:number,z:number,air:boolean,element:number){
   if(this.end>=0)return;
   if(this.ready){if(within(x,z,this.spec.finish,.73))this.end=0;else this.reject(this.spec.finishHelp);return;}
   if(this.spec.pin&&!this.pin){this.reject(this.spec.repair);return;}
   const a=this.sites,i=a.findIndex(p=>within(x,z,p)),free=i>=0&&i<2&&!(this.mask&(1<<i)),near=within(x,z,this.goal);
   switch(this.story){
   case 'slides':
     if(this.step===1&&free){if(element!==i){this.reject('左片认水，右片认风。',true);return;}this.choose(i);this.mask|=1<<i;
       if(this.mask===3)this.step=2;this.say('这一层玻璃画已叠入。');return;}
     if(this.step===2&&near&&this.inFocus){this.step=3;return;}break;
   case 'flyby':
     if(!this.step&&free){this.choose(i);this.step=1;return;}
     if(near&&this.window(i)&&(this.step===1?this.flat:air&&!this.flat)){this.step++;return;}break;
   case 'lamps':
     if(this.step===1&&free){if(element!==4){this.reject('切暗属性后，纸上的隐光才显现。',true);return;}
       this.choose(i);this.step=2;return;}
     if(this.step===2&&near&&!this.count){this.count=1;this.say('光页已经扣好，按 X 回收分身。');return;}break;
   case 'classroom':case 'lever':
     if(this.story==='classroom'&&!this.step)break;
     if(this.story==='lever'&&this.step===2){if(near&&air&&!this.flat){this.step=3;return;}break;}
     if(free&&this.side<0){this.choose(i);if(this.story==='lever')this.step=1;return;}
     if(this.side===i&&this.matched){if(!this.mask)this.balance=this.meter[i];this.mask|=1<<i;this.side=-1;
       this.step=this.story==='lever'?(this.mask===3?2:1):(this.mask===3?3:2);this.say('刻线吻合，这一侧已锁住。');return;}break;
   case 'typewood':
     if(!this.step&&free&&this.flat){this.choose(i);this.step=1;return;}
     if(this.step===1&&near&&air&&!this.flat){this.step=2;return;}
     if(this.step===2&&this.count&&near&&this.flat){this.step=3;return;}break;
   case 'courtyard':
     if(!this.step&&i===0){if(element!==3){this.reject('起笔砚需要雷属性（4）。',true);return;}this.step=1;return;}
     if(this.step===1&&(i===2||i===3)&&this.flat){this.choose(i-2);this.step=2;return;}
     if(this.step===2&&this.count&&i===1&&this.flat){if(element!==2){this.reject('终端要用火属性（3）接续。',true);return;}this.step=3;return;}break;
   case 'lift':
     if(free&&this.window(i)&&(i?air&&!this.flat:this.flat)){this.choose(i);this.mask|=1<<i;this.step++;return;}break;
   case 'strand':
     if(!this.step&&free){this.choose(i);this.step=1;return;}
     if(this.step===1&&near&&air&&!this.flat){this.step=2;return;}
     if(this.step===2&&this.count===1&&near&&this.flat){this.count=2;return;}
     if(this.step===2&&this.count===2&&near){this.step=3;return;}break;
   }
   this.reject(this.spec.repair);
 }
}
