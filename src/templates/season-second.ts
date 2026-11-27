/** Five walkable theatre sets. Their apparatus, marks and spatial actions are fictional. */
export const secondIds=['1127-1895','1128-1964','1129-1972','1130-1872','1201-1959'] as const;
export type SecondId=typeof secondIds[number];
export const isSecond=(id:string):id is SecondId=>secondIds.some(x=>x===id);
export type Point=[number,number];
export const paperClamp:Point=[-2.2,.8],iceAnchors:Point[]=[[-2.55,1.35],[2.65,-.9]];
export const paperCreases:Point[]=[[-1.85,-.72],[1.7,-.72],[1.7,1.18]];
export const passes:Point[]=[[-2.55,1.28],[1.75,.18],[-1.35,-1.48],[1,-2.45]];
export const scopeMarks:Point[]=[[-1.6,.85],[1.6,-.82],[.12,-1.45]];
export const stations:Point[]=[[1.96,1.2],[-1.94,-1.52]];
export const distance=(x:number,z:number,p:Point)=>Math.hypot(x-p[0],z-p[1]);
export const opening=['让烛光照见第一条折痕','用甲板上的滑轨推移寻星环','站在近边，身体就是球拍','把球送到队友下一步会到的地方','在两座脚架之间拉一条观测线'];
export const collectible=(kind:number):Point[]=>kind===4?
  [[-3.6,1.4],[-2.8,-1.5],[-1.6,.15],[-.65,.05],[.65,.05],[1.7,-1.52],[3.4,-.72],[3.3,1.25]]:
  [[-3.3,.45],[.15,-1.8],[3,.85]];
export const secondSteps:[string,string][][]=[
 [['压住纸角','靠近左侧铜夹投分身 G。烛焰摇时，分身会替你按住手稿。'],['先压平横折痕','在左侧金色折痕旁摊开 C，沿虚线走到右端。'],['给手稿折出侧翼','保持摊开，沿右侧短折痕走向自己，最后在金点按 F。']],
 [['认准双星旁的亮星','移动身体控制舷窗里的寻星环。两圈重合时按 F 锁星。'],['分清两颗橙星','用脚下滑轨调整方位，摊开 C 压住抖动的寻星架，再按 F。'],['沿转移窗定向','在另一端看最后一颗星，摊开能压住架子。金环合拢时按 F。']],
 [['发出第一球','走到靠近自己的球拍边，按 F 发球。左右移动接球。'],['借侧壁回球','看球落向哪侧，提前横移。摊开 C 可加宽球拍。'],['接住最后一球','球越来越快；触边反弹后，还能用摊开加宽接球面。']],
 [['从边线开球','走到皮球旁。等接应人与空位的金圈重合，按 F 传地滚球。'],['跨过拦截线','追上球。等防守人让开再传，或跳起时按 F 挑传。'],['球门前的最后一脚','在球旁读接应人的跑位。队友脚下亮起金圈时送球。']],
 [['给西侧脚架压舱','走近左岸铜座，投分身 G 压下脚架锁扣。'],['走过冰缝读第一条线','脚架已锁住。走过中央冰桥到对岸金圈，摊开 C 稳住身体，按 F 观测。'],['换一个角度复测','到右岸脚架投 G 压住第二个锁扣。走回西北测点，摊开后按 F。']]
];
export class SecondRun {
  readonly kind:number;readonly marks:Point[];readonly finds=new Set<number>();
  step=0;errors=0;time=0;ending=-1;pin=false;spread=false;flattened=0;rolling=false;
  ball:Point=[0,1.68];vx=.8;vz=-2.25;flight=0;highPass=false;lofted=false;wideHit=false;
  message='';noticeUntil=0;view:'play'|'low'|'far'='play';
  constructor(readonly id:SecondId,readonly seed:number){
    this.kind=secondIds.indexOf(id);this.marks=collectible(this.kind);
    this.time=(seed%97)*.017;
  }
  get goal():Point{
    if(this.kind===0)return this.step===0?paperClamp:paperCreases[this.step===1?(this.rolling?1:0):2];
    if(this.kind===1)return scopeMarks[Math.min(2,this.step)];
    if(this.kind===2)return [this.ball[0],1.62];
    if(this.kind===3)return passes[Math.min(3,this.step)];
    return this.step===0?iceAnchors[0]:stations[Math.min(this.step-1,1)];
  }
  get receiver():Point {const [x,z]=passes[Math.min(3,this.step+1)];return [x+.76*Math.sin(this.time*1.45+this.step),z];}
  get canPass(){return Math.abs(this.receiver[0]-passes[Math.min(3,this.step+1)][0])<.34;}
  get approach(){return this.step>=3;}
  get hint():[string,string]{
    if(this.approach)return ['收好这一日的记录','按 F 完成最后的手工机关。'];
    const [title,description]=secondSteps[this.kind][this.step];
    const count=this.kind===4?' · 星尘 '+this.finds.size+'/8':this.finds.size?' · 金晶 '+this.finds.size+'/3':'';
    return [title+count,this.time<this.noticeUntil?this.message:description];
  }
  note(message:string){this.message=message;this.noticeUntil=this.time+2;}
  miss(message:string){this.errors++;this.note(message);}
  get anchor(){return this.kind===0?paperClamp:iceAnchors[Number(this.step>=2)];}
  get cursorShift(){return this.step===0||this.spread?0:Math.sin(this.time*4.4)*.26;}
  tick(dt:number,x:number,z:number,spread:number,pinned:boolean,jumping:boolean){
    this.time+=dt;this.spread=spread>.54;this.pin=pinned;
    if(this.ending>=0){this.ending+=dt;return;}
    for(let i=0;i<this.marks.length;i++)if(!this.finds.has(i)&&jumping&&distance(x,z,this.marks[i])<.59){
      this.finds.add(i);
      this.note(this.kind===4?'接住星尘。集齐八颗，就能带走冰晶印章。':'接住一枚金晶。沿途还可以跳起来收集。');
    }
    if(this.approach)return;
    if(this.kind===0){
      if(this.step===0&&pinned)this.step=1;
      if(this.step===1&&pinned&&this.spread){
        if(distance(x,z,paperCreases[0])<.66)this.rolling=true;
        if(this.rolling){
          if(Math.abs(z-paperCreases[0][1])>.72||x<paperCreases[0][0]-.75)this.rolling=false;
          else{this.flattened=Math.max(this.flattened,Math.min(1,(x+1.85)/3.55));if(distance(x,z,paperCreases[1])<.54){this.step=2;this.flattened=1;}}
        }
      }
    }
    if(this.kind===2&&this.rolling){
      this.ball[0]+=this.vx*dt;this.ball[1]+=this.vz*dt;
      if(Math.abs(this.ball[0])>=3.1){this.ball[0]=Math.sign(this.ball[0])*3.1;this.vx=-Math.sign(this.ball[0])*Math.abs(this.vx);}
      if(this.ball[1]<-2.1){this.ball[1]=-2.1;this.vz=Math.abs(this.vz);}
      if(this.ball[1]>=1.56&&this.vz>0){
        if(Math.abs(this.ball[0]-x)<(this.spread?1.18:.74)&&Math.abs(z-1.62)<.88){
          this.wideHit||=this.spread;this.step++;this.vz=-(2.45+this.step*.45);this.vx=-this.vx*1.14;
        }else{this.miss('球从拍边滑走了。走回近边按 F，只重发这一球。');this.rolling=false;this.ball=[0,1.62];}
      }
    }
    if(this.kind===3&&this.flight>0){this.flight=Math.max(0,this.flight-dt);if(!this.flight)this.step++;}
    if(this.kind===4&&this.step===0&&pinned)this.step=1;
  }
  act(x:number,z:number,jumping:boolean){
    if(this.approach||this.ending>=0)return;
    if(this.kind===0){
      if(this.step===2&&this.pin&&this.spread&&distance(x,z,this.goal)<.65){this.step++;return;}
      this.miss(this.step===2?'纸翼还翘着。让分身守好铜夹，本体摊在侧翼的金点上。':'压实纸张后再收折侧翼。');
    }else if(this.kind===1){
      if(distance(x+this.cursorShift,z,this.goal)<.34&&(this.step===0||this.spread))this.step++;
      else this.miss('亮星还在圈外，或寻星架还在晃。试着摊开，慢慢对齐。');
    }else if(this.kind===2){
      if(!this.rolling&&Math.abs(z-1.62)<.88){this.rolling=true;this.ball=[Math.max(-2.8,Math.min(2.8,x)),1.45];this.vx=(this.step%2?-1:1)*1.25;this.vz=-(2.25+this.step*.34);}
      else if(!this.rolling)this.note('站到近端的白色球拍旁发球。');
    }else if(this.kind===3){
      if(this.flight>0)return;
      if(distance(x,z,this.goal)>.85){this.note('先走近停下的皮球。');return;}
      if(!this.canPass&&!jumping){this.miss('防守人截住了直传。球留在脚下，等跑位或试挑传。');return;}
      this.highPass=jumping;this.lofted||=jumping;this.flight=.68;
    }else if(this.kind===4){
      if(this.step>0&&this.pin&&this.spread&&distance(x,z,this.goal)<.7){this.step++;return;}
      this.miss('两端尚未同时站稳。分身守住脚架，你摊在对岸的金圈里再读数。');
    }
  }
}
