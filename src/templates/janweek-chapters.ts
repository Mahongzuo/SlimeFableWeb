import type {JanweekStory} from '../../content/chronicle-newyear';
import {NewyearRun,within} from './newyear-chapters';
import type {Point} from './winter-chapters';

export function isJanweek(id:string){return id.slice(0,4)>='0106'&&id.slice(0,4)<='0110';}

export class JanweekRun extends NewyearRun {
  charge=0;
  get lastStory(){return this.story as JanweekStory;}
  get dockLevel(){return .5+.39*Math.sin(this.t*1.22);}
  get scanPosition(){return .5+.46*Math.sin(this.turn);}
  get threshold():[number,number] {
    switch(this.lastStory){
      case 'telegraph':return this.side===0?[.22,.50]:[.64,.95];
      case 'inkstone':return this.chosen===0?[.29,.52]:[.64,.91];
      case 'silverplate':return this.chosen===0?[.43,.68]:[.52,.82];
      case 'penny':return this.chosen===0?[.64,1]:[.78,1];
      default:return [.72,1];
    }
  }
  get onMark(){const [low,high]=this.threshold;return this.charge>=low&&this.charge<=high;}
  get aligned(){return Math.abs(this.dockLevel-.50)<.17;}
  scan(side:number){return side===0?this.scanPosition<.28:this.scanPosition>.72;}
  get locked(){return this.lastStory==='ferry'?this.aligned:this.lastStory==='lobster'?this.scan(this.step===1?Math.max(0,this.side):this.other):this.onMark;}
  get fallbackSide(){return this.side>=0?this.side:this.sideFree;}
  override get goal():Point {
    if(this.ready)return this.spec.finish;
    if(!this.step&&this.spec.requiredMarks&&this.marks.size!==this.markCount){
      return this.collectibles.find((_,i)=>i<this.markCount&&!this.marks.has(i))??this.sites[0];
    }
    if(!this.step&&this.spec.pin)return this.spec.pin;
    const a=this.sites;
    switch(this.lastStory){
      case 'translation':return a[this.sideFree];
      case 'telegraph':return this.mask===3?a[2]:a[this.fallbackSide];
      case 'ferry':return this.step===1?(this.count?a[2+this.chosen]:a[0]):a[4];
      case 'survey':return !this.step?a[0]:this.step===1?a[2+(this.count?this.other:this.chosen)]:a[4];
      case 'inkstone':return !this.step?a[0]:this.step===1?a[2]:a[this.other];
      case 'islands':return this.step===1?(this.chosen<0?a[0]:a[2+this.chosen]):a[2+this.other];
      case 'lobster':return this.step===1?a[this.fallbackSide]:a[this.count===1?this.other:2];
      case 'silverplate':return !this.step?a[0]:this.step===1?a[this.chosen]:a[2];
      case 'dispatch':return this.step===2?a[2]:a[this.sideFree];
      case 'penny':return !this.step?a[0]:this.step===1?a[2]:a[this.chosen];
    }
  }
  override get alternative(){
    if(this.ready||this.chosen>=0||this.mask)return;
    if(this.spec.pin&&!this.step)return;
    return this.sites[1];
  }
  override get hint():[string,string]{
    if(this.ready)return ['亲手收尾',this.spec.finishHelp];
    if(!this.step&&this.spec.requiredMarks&&this.marks.size<this.markCount){
      const [h,msg]=this.spec.tasks[0];return [h+' · '+this.marks.size+'/'+this.markCount,msg];
    }

    if(this.lastStory==='translation'){
      const [label,instructions]=this.spec.tasks[this.step];
      return [label+' · '+this.step+'/2',this.t<this.until?this.notice:instructions];
    }
    let [label,instructions]=this.spec.tasks[this.step];
    if(this.step>0)switch(this.lastStory){
      case 'telegraph':
        [label,instructions]=this.mask===3
          ?['扣下送纸压轮','到中央金圈，收身后跳起按 F。']
          :['压出点划','摊开压键，在相应的绿刻内按 F。短键早按，长键晚按。'];
        break;
      case 'ferry':
        if(this.count&&this.step===1){
          label='去同侧吊钩';instructions='在所选轨道后部收身，跳起来按 F 挂钩。';
        }
        break;
      case 'lobster':
        if(this.count>=2){
          label='收进两道闪点';instructions='走去中央铜钮按 F，校验刚才留下的两点。';
        }
        break;
    }
    return [label,this.t<this.until?this.notice:instructions];
  }

  override tick(dt:number,x:number,z:number,spread:number,air:boolean,pinned:boolean,element=0){
    super.tick(dt,x,z,spread,air,pinned,element);
    if(this.end>=0||this.ready||this.lastStory==='translation')return;
    const point=this.goal,atGoal=within(x,z,point,.53),a=this.sites;
    let rate=0;
    switch(this.lastStory){
      case 'telegraph':{
        if(this.step&&this.mask!==3){
          const side=within(x,z,a[0],.53)?0:within(x,z,a[1],.53)?1:-1;
          if(side>=0&&!(this.mask&(1<<side))&&this.flat){
            if(this.side!==side)this.charge=0;
            this.side=side;rate=.59;
          }else this.charge=0;
        }
        break;
      }
      case 'survey':
        if(this.step===1&&atGoal&&this.flat&&element===0){
          this.count++;
          if(this.count===2){this.step=2;this.say('两片水纹都已采到。在中央水印旁保持摊开按 F。');}
        }
        break;
      case 'inkstone':
        if(this.step===1&&atGoal)rate=this.flat?.31:-.29;
        break;
      case 'lobster':{
        this.turn+=dt*(this.flat?.80:1.51);
        if(this.step===1&&this.flat){
          const side=within(x,z,a[0],.53)?0:within(x,z,a[1],.53)?1:-1;
          if(side>=0)this.side=side;
        }
        break;
      }
      case 'silverplate':
        if(this.step===1&&atGoal)rate=this.flat?(this.chosen===0?.43:.26):-.56;
        break;
      case 'dispatch':
        if(this.step===2)rate=this.flat&&atGoal?.78:-.45;
        break;
      case 'penny':
        if(this.step===1)rate=this.flat&&atGoal?(this.chosen===0?.73:.54):-.48;
        break;
    }
    this.charge=Math.max(0,Math.min(1,this.charge+rate*dt));
  }
  override act(x:number,z:number,air:boolean,element:number){
    if(this.ready||this.end>=0){super.act(x,z,air,element);return;}
    if(this.lastStory==='translation'){
      const column=this.sites.findIndex(point=>within(x,z,point,.8));
      if(column<0||(this.mask&(1<<column))){
        this.reject(this.mask?this.spec.tasks[1][1]:this.spec.tasks[0][1]);
        return;
      }
      this.choose(column);
      this.mask|=1<<column;
      this.step=this.mask===3?3:1;
      this.until=0;
      return;
    }
    if(this.spec.pin&&!this.pin||this.spec.requiredMarks&&!this.step){this.reject(this.spec.repair);return;}
    const a=this.sites,i=a.findIndex(p=>within(x,z,p)),side=i===0||i===1,near=within(x,z,this.goal),unmarked=side&&!(this.mask&(1<<i));
    switch(this.lastStory){
      case 'telegraph':
        if(this.step&&unmarked&&i===this.side&&this.flat&&this.onMark){this.choose(i);this.mask|=1<<i;this.charge=0;this.step=2;return;}
        if(this.mask===3&&i===2&&air&&!this.flat){this.step=3;return;}
        break;
      case 'ferry':
        if(this.step===1&&!this.count&&side&&this.flat){this.choose(i);this.count=1;return;}
        if(this.step===1&&this.count&&near&&air&&!this.flat){this.count=2;this.step=2;return;}
        if(this.step===2&&i===4&&this.flat&&this.aligned){this.step=3;return;}
        break;
      case 'survey':
        if(!this.step&&side){
          if(element!==1){this.reject('切换风属性（2）后才可以转动水边标。',true);return;}
          this.choose(i);this.step=1;return;
        }
        if(this.step===2&&i===4&&this.flat){
          if(element!==0){this.reject('保持水属性（1），再压下印石。',true);return;}
          this.step=3;return;
        }
        break;
      case 'inkstone':
        if(!this.step&&side&&this.flat){this.choose(i);this.step=1;return;}
        if(this.step===1&&near&&this.flat&&this.onMark){this.step=2;return;}
        if(this.step===2&&near&&air&&!this.flat){this.step=3;return;}
        break;
      case 'islands':
        if(this.step===1&&this.chosen<0&&side){this.choose(i);return;}
        if(this.step===1&&this.chosen>=0&&near&&this.flat){this.step=2;return;}
        if(this.step===2&&near&&air&&!this.flat){this.step=3;return;}
        break;
      case 'lobster':
        if(this.step===1&&side&&this.flat&&this.scan(i)){this.choose(i);this.count=1;this.step=2;return;}
        if(this.step===2&&this.count===1&&near&&air&&!this.flat&&this.scan(i)){this.count=2;return;}
        if(this.count===2&&i===2){this.step=3;return;}
        break;
      case 'silverplate':
        if(!this.step&&side){this.choose(i);this.step=1;return;}
        if(this.step===1&&near&&this.flat&&this.onMark){this.step=2;return;}
        if(this.step===2&&i===2&&element===0&&this.flat){this.step=3;return;}
        break;
      case 'dispatch':
        if(this.step&&unmarked){
          if(element!==i+2){this.reject(i?'右台需要雷属性（4）。':'左街口需要火属性（3）。',true);return;}
          this.choose(i);this.mask|=1<<i;if(this.mask===3)this.step=2;return;
        }
        if(this.step===2&&i===2&&this.onMark&&this.flat){this.step=3;return;}
        break;
      case 'penny':
        if(!this.step&&side){this.choose(i);this.step=1;return;}
        if(this.step===1&&near&&this.flat&&this.onMark){this.step=2;return;}
        if(this.step===2&&near&&air&&!this.flat){this.step=3;return;}
        break;
    }
    this.reject(this.spec.repair);
  }
}
