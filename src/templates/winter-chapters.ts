/** Exhibition props, projection art and stage action are fictional throughout. */
export type Point=[number,number];
export type WinterStory='lecture'|'jovian'|'relay'|'recovery'|'street'|'mouse'|'sorghum'|'medal'|'harbor'|'atlas';
export interface WinterChapter{
  gate:1|2;story:WinterStory;title:string;goal:string;last:string;finishHelp:string;repair:string;
  abilities:string[];tasks:[string,string][];sites:Point[];finish:Point;pin?:Point;
}
export const winterChapters:Record<string,WinterChapter>={
 '1207-2015':{gate:1,story:'lecture',title:'让两页讲稿一起见光',goal:'压住翻页踏板，把两张透影片搭进光窗',last:'翻亮讲页',finishHelp:'到讲台右前的金圈按 F，前后两张图会一起投上银幕。',repair:'先在左侧投分身把踏板扣住。取到片后走进中央铜框，摊开再按 F。',abilities:['分身压踏板','摊开贴平片页'],pin:[-2.48,1.25],sites:[[-2.10,-.72],[2.04,-.72],[.08,.15]],finish:[2.55,1.35],tasks:[['扣住翻页踏板','从左侧铜扣旁投分身 G，让压片机保持打开。'],['任选一片透影片','走近枝叶片或书页片按 F 拿起。选择会决定底图。'],['叠进投影光窗','带片走进中央铜框，摊开 C 按 F 压好。再去装另一片。']]},
 '1207-1995':{gate:2,story:'jovian',title:'木星边缘的两次掠过',goal:'把探测器留在两道不同的观测窗内',last:'送出云带连片',finishHelp:'走到右前的收卷盘按 F，观察探测器绕过木星。',repair:'错过窗口会迎来下一圈。站在黄圈里等轨道亮点进入弧口。',abilities:['读轨道相位','摊开稳住观测窗'],sites:[[-2.18,.79],[2.24,-.37]],finish:[2.74,1.49],tasks:[['守住第一扇观测窗','走到左边琥珀圈。等白色探测器沿铜轨驶入发亮弧口，按 F 留影。'],['看另一边的云带','到右侧窗口摊开 C。待白点再次进入亮弧，按 F 取得第二张影像。']]},
 '1208-2018':{gate:1,story:'relay',title:'月背那条看得见的线',goal:'绕过月脊遮挡，在两侧恢复中继视线',last:'接通远端舷灯',finishHelp:'两侧脊口都接好后，到右前方接收碟旁按 F。',repair:'月脊正中会挡住连线。先 G 固定中继，绕去两端低矮的缺口，右边还要摊开才稳。',abilities:['分身留守中继','摊开稳住接收碟'],pin:[-.47,1.45],sites:[[-2.42,-.76],[2.46,-.76]],finish:[2.78,1.28],tasks:[['留住上方中继','在前侧铜座附近按 G，分身扣住中继底座。'],['从西侧找信号','绕到月脊西端的金圈。光线由断段连成一线时按 F。'],['接东侧小碟','到月脊另一端，摊开 C 压稳接收架，再按 F 接入。']]},
 '1208-2010':{gate:2,story:'recovery',title:'甲板边的两根回收绳',goal:'固定浮圈，分次收紧两根绳把舱体拉正',last:'把回收舱吊上船',finishHelp:'两根绳齐平后，去甲板前方的绞盘按 F，舱体会离水上架。',repair:'只收一侧会使舱体倾斜；跨到对侧交替收绳。两侧已经收紧的绳不会放掉。',abilities:['分身锁浮圈','摊开压绞盘'],pin:[-2.52,1.26],sites:[[-2.05,-.48],[2.04,-.48]],finish:[.22,1.57],tasks:[['接住漂浮的回收圈','在左前铜座附近按 G，让分身扣住绳头。'],['把舱体从水里拉正','在两侧绞盘摊开 C 并按 F。左右各收两次，两绳的差最多一格。']]},
 '1209-1935':{gate:1,story:'street',title:'冬巷里留存的两页',goal:'保护两扇文献窗，把街巷记录装成跨页',last:'合起街巷纪念册',finishHelp:'走到案前铜书角处按 F，留存同一条冬巷的两面。',repair:'纸签吹起时待在对应檐下摊开，看到窗扇打开后再去另一处。',abilities:['摊开护住纸页','分身固定册脊'],pin:[-.24,1.4],sites:[[-2.47,-.86],[2.47,-.86]],finish:[.23,.43],tasks:[['固定册脊','在前侧铜书扣附近投 G，让分身压稳册脊。'],['为第一扇窗挡风','两扇檐窗任选其一。在窗前摊开 C，停留至窗内的文献页展开。'],['留住另一页','在另一扇窗前同样摊开护纸。两幅文献一起归入册中。']]},
 '1209-1968':{gate:2,story:'mouse',title:'木盒鼠标里的另一扇窗',goal:'用身体带动光标，拖动窗口并沿链接翻页',last:'回到演示主页',finishHelp:'拖窗和翻页都完成后，到右前的木键帽按 F，两个窗口将并排留下。',repair:'移动时观察大屏的十字光标。将标题栏拖到虚框中再放开，最后摊开点中下划线。',abilities:['移动身体拖窗','摊开精确选取'],sites:[[-1.87,-.67],[1.39,.41],[-2.23,.98],[2.13,-.85]],finish:[2.82,1.45],tasks:[['拾起窗口标题栏','移动身体让屏上的光标落在铜色标题栏；在对应金圈按 F 拾起窗口。'],['拖到空心窗框','把窗口带进右方目标框，按 F 松开。'],['沿一条链接翻页','两条下划线任选一条。在对应金点摊开 C 并按 F，读出另一页。']]},
 '1210-2012':{gate:1,story:'sorghum',title:'高粱梢上的一张书页',goal:'在田埂与村口取两层图景，拼成文学纪念页',last:'夹起文学纪念页',finishHelp:'带着两层图景到案前的缎带环按 F，书页缓缓立起来。',repair:'第一张可以选田埂或村口。第二张要在中央金点跳起，越过高粱梢时按 F。',abilities:['摊开取低景','弹跳越过高粱梢'],sites:[[-2.40,.48],[2.31,.22],[.04,-1.25]],finish:[.30,1.62],tasks:[['选一幅开篇低景','左边田埂、右边村口任选。在金圈里摊开 C，再按 F 收入画页。'],['从高粱梢上看远方','走进靠后的中央金圈，收身 C；跳起越过穗子时按 F 取第二层风景。']]},
 '1210-1901':{gate:2,story:'medal',title:'天鹅绒上滚来一枚奖章',goal:'以身体倾斜托盘，让纪念章在两座展位停稳',last:'揭开奖典展罩',finishHelp:'两段都落稳后，到展台右前铜把手旁按 F，把镜头留给奖典陈列。',repair:'站到托盘目标刻线那侧让奖章滚过去；奖章接近金线时摊开 C 制动，再按 F 锁止。',abilities:['左右移动倾盘','摊开制动'],sites:[[-2.19,.24],[2.19,.24]],finish:[2.77,1.36],tasks:[['让奖章滚向左展位','走到左侧金圈倾斜托盘。奖章进入铜环时摊开 C，让它减速，按 F 留下第一印记。'],['送到右侧的天鹅绒上','收身 C，移动到另一侧。奖章滚进右环时再摊开减速，按 F 安放。']]},
 '1211-2001':{gate:1,story:'harbor',title:'两张船单赶同一潮水',goal:'按船单对接两处泊位，候潮放下短栈桥',last:'摇铃离港',finishHelp:'两张船单都销号后，到前方港铃旁按 F，货船才会开出防波堤。',repair:'在当前泊位等水尺的浮子进入铜刻线再按 F。错过潮头只等下一阵潮。',abilities:['分身锁住船单','候潮对接泊位'],pin:[-.15,1.54],sites:[[-2.48,-.44],[2.47,-.44]],finish:[2.73,1.38],tasks:[['扣稳船单夹','靠近前方的船单夹，用 G 让分身压住底单。'],['让第一座栈桥接岸','任选一处泊位。观察水尺浮子，进入亮线时按 F 放桥。'],['交接另一份船单','到另一座泊位摊开 C 稳住栈桥，再次等潮位合线，按 F 完成交接。']]},
 '1211-1843':{gate:2,story:'atlas',title:'图录里的两枚圆形视野',goal:'在纪念图录中配对几何插图和放大视野',last:'装订光学图页',finishHelp:'两个圆窗重合后，到图录右下角的铜书钉按 F 装订。',repair:'先选圆窗旁的样张，再看竖起的图页。移动身体对齐对应圆窗，第二个需要摊开稳住。',abilities:['移动视窗','摊开稳住图页'],sites:[[-2.02,.72],[2.08,.72],[-1.51,-1.01],[1.53,-1.01]],finish:[2.75,1.54],tasks:[['取出一张插画索引','从左右任一夹槽，按 F 夹起圆环图或菱形图。'],['套准同形圆窗','带着索引走到后排同侧圆窗，按 F 套准。'],['为另一张留下对照','到另一侧夹槽取图，再到对应圆窗；摊开 C，按 F 压稳装入。']]}
};
export const isWinterChapter=(id:string)=>Object.hasOwn(winterChapters,id);
export const within=(x:number,z:number,p:Point,r=.67)=>Math.hypot(x-p[0],z-p[1])<r;
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
export const winterMarks:Point[]=[[-3.22,1.51],[-2.91,-.16],[-2.27,-1.56],[-.88,-1.55],[.80,-1.54],[2.94,-1.29],[3.12,.53],[1.83,1.66]];
export class WinterRun{
  readonly spec:WinterChapter;readonly marks=new Set<number>();readonly collectibles=winterMarks;
  step=0;mask=0;chosen=-1;carry=-1;errors=0;end=-1;t=0;elapsed=0;pin=false;flat=false;
  left=0;right=0;dwell=0;medalX=0;speed=0;note='';until=0;view:'play'|'low'|'far'='play';
  constructor(readonly id:string,seed:number,readonly markCount:number){this.spec=winterChapters[id];if(!this.spec)throw Error('未知展室');this.t=seed%43*.13;}
  get story(){return this.spec.story;}
  get ready(){return this.step>=this.spec.tasks.length;}
  get nextSide(){return this.mask===1?1:0;}
  get arc(){return this.step===0?-1.90:.49;}
  get phase(){return this.t*1.24%(2*Math.PI);}
  get window(){return Math.cos(this.phase-this.arc)>.88;}
  get tide(){return .5+.46*Math.sin(this.t*1.41);}
  get highWater(){return Math.abs(this.tide-.69)<.12;}
  get target():number{return this.step===0?-1.6:1.6;}
  get plateStill(){return Math.abs(this.medalX-this.target)<.33&&Math.abs(this.speed)<.39;}
  get goal():Point{
    const {sites:a,pin,finish}=this.spec;if(this.ready)return finish;if(pin&&this.step===0)return pin;
    switch(this.story){
      case 'lecture':return a[this.step===1?this.nextSide:2];
      case 'jovian':case 'medal':return a[this.step];
      case 'relay':return a[this.step-1];
      case 'recovery':return a[this.left<=this.right?0:1];
      case 'street':case 'harbor':return a[this.nextSide];
      case 'mouse':return a[this.step];
      case 'sorghum':return a[this.step===0?0:2];
      case 'atlas':return a[this.carry<0?this.nextSide:2+this.carry];
    }
  }
  get alternative():Point|undefined{
    if(this.ready)return;const a=this.spec.sites;
    if((this.story==='lecture'||this.story==='street'||this.story==='harbor')&&this.step===1&&this.mask===0)return a[1];
    if(this.story==='sorghum'&&this.step===0||this.story==='atlas'&&this.step===0)return a[1];
    if(this.story==='mouse'&&this.step===2)return a[3];
    if(this.story==='recovery'&&this.left===this.right)return a[1];
  }
  get hint():[string,string]{
    const [headline,help]=this.ready?['完成最后一步',this.spec.finishHelp]:this.spec.tasks[this.step];
    return [headline+' · 藏签 '+this.marks.size+'/'+this.markCount,this.t<this.until?this.note:help];
  }
  say(message:string,error=false){this.note=message;this.until=this.t+2;if(error)this.errors++;}
  choose(i:number){this.carry=i;if(this.chosen<0)this.chosen=i;}
  place(){this.mask|=1<<this.carry;this.carry=-1;}
  get canSee(){return this.sight===1;}private sight=0;
  tick(dt:number,x:number,z:number,spread:number,air:boolean,pinned:boolean){
    this.t+=dt;this.elapsed+=dt;this.flat=spread>.54;this.pin=pinned;
    if(this.end>=0){this.end+=dt;return;}
    if(air)for(let i=0;i<this.markCount;i++)if(within(x,z,winterMarks[i],.62))this.marks.add(i);
    if(this.ready)return;
    if(this.spec.pin&&this.step===0&&this.pin)this.step=1;
    if(this.story==='relay'){
      // An opaque central ridge separates the transmitter and the far-side dishes.
      // The rays can clear either notch where the ridge tapers.
      this.sight=Number(z<-.22&&Math.abs(x)>1.75);
    }
    if(this.story==='street'&&this.step>0&&this.pin){
      const i=this.pair(x,z),holding=i>=0&&!(this.mask&(1<<i))&&this.flat;
      this.dwell=holding?this.dwell+dt:0;
      if(this.dwell>.74){this.choose(i);this.place();this.step++;this.dwell=0;}
    }
    if(this.story==='medal'){
      const tilt=clamp(x/2.2,-1,1),drag=this.flat?9.2:2.3,force=this.flat?.24:2.65;
      this.speed=clamp(this.speed+(tilt*force-this.speed*drag)*dt,-1.5,1.5);this.medalX+=this.speed*dt;
      if(Math.abs(this.medalX)>1.72){this.medalX=Math.sign(this.medalX)*1.72;this.speed*=-.2;}
    }
  }
  private pair(x:number,z:number,start=0){return within(x,z,this.spec.sites[start])?0:within(x,z,this.spec.sites[start+1])?1:-1;}
  act(x:number,z:number,air:boolean){
    const a=this.spec.sites;if(this.end>=0)return;
    if(this.ready){if(within(x,z,this.spec.finish,.78)){this.end=0;return;}this.say(this.spec.finishHelp,true);return;}
    if(this.spec.pin&&!this.pin){this.say(this.spec.repair,true);return;}
    const i=this.pair(x,z),unused=i>=0&&!(this.mask&(1<<i));const old=this.step;
    switch(this.story){
      case 'lecture':
        if(this.step===1&&unused){this.choose(i);this.step=2;}
        else if(this.step===2&&this.flat&&within(x,z,a[2])){this.place();this.step=this.mask===3?3:1;}break;
      case 'jovian':if(within(x,z,this.goal)&&this.window&&(!this.step||this.flat))this.step++;break;
      case 'relay':if(within(x,z,this.goal)&&this.canSee&&(this.step===1||this.flat))this.step++;break;
      case 'recovery':if(i>=0&&this.flat){
        const l=this.left+Number(i===0),r=this.right+Number(i===1);
        if(Math.max(l,r)<=2&&Math.abs(l-r)<=1){this.choose(i);this.left=l;this.right=r;if(l===2&&r===2)this.step++;this.say('左绳 '+l+' / 2 · 右绳 '+r+' / 2');return;}}break;
      case 'street':break;
      case 'mouse':
        if(this.step<2&&within(x,z,this.goal,.59))this.step++;
        else if(this.step===2&&this.flat){const link=this.pair(x,z,2);if(link>=0){this.choose(link);this.step++;}}break;
      case 'sorghum':
        if(!this.step&&i>=0&&this.flat){this.choose(i);this.step++;}
        else if(this.step===1&&air&&within(x,z,a[2]))this.step++;break;
      case 'medal':if(this.flat&&within(x,z,this.goal)&&this.plateStill){this.step++;}break;
      case 'harbor':if(unused&&this.highWater&&(this.step===1||this.flat)){this.choose(i);this.place();this.step++;}break;
      case 'atlas':
        if(this.carry<0&&unused){this.choose(i);this.step=this.mask===0?1:2;this.say('索引已经夹起，找后排的同形圆窗。');return;}
        if(this.carry>=0&&within(x,z,this.goal)&&(this.mask===0||this.flat)){this.place();this.step=this.mask===3?3:2;this.say('这一张已归入对照页。');return;}break;
    }
    if(this.step===old)this.say(this.spec.repair,true);else this.until=0;
  }
}
