/** Card facts live in the original chapters. All of these miniature sets and operations are fictional. */
export type Story='mail'|'archive'|'lens'|'message'|'lantern'|'rover'|'bridge'|'drum'|'falls'|'foil';
export type Spot=[number,number];
export interface Exhibit {story:Story;title:string;goal:string;last:string;pin?:Spot;finish:Spot;sites:Spot[];tasks:[string,string][]}
export const exhibits:Record<string,Exhibit>={
 '1202-1986':{story:'mail',title:'绿邮袋的最后两封信',goal:'压住袋口，给两封信盖戳、分格',last:'扣好邮袋',pin:[-2.65,1.2],finish:[2.65,1.38],sites:[[-1.5,.28],[1.42,.28],[-2.35,-1.18],[2.35,-1.18]],
 tasks:[['固定绿色邮袋','靠近黄铜夹，按 G 投分身卡住袋口。'],['在信上压一枚邮戳','任选一封信，跳起落回信面。看露出的圆戳或方戳。'],['按戳记分拣','圆戳投左格，方戳投右格。走到对应格口按 F。']]},
 '1202-1942':{story:'archive',title:'展柜里的一卷记录纸',goal:'压平长纸卷，把两段记录留在阅读窗内',last:'点亮阅读灯',finish:[2.8,1.34],sites:[[-2.45,.57],[2.45,.57],[-1.66,-1.18],[1.68,-1.18]],
 tasks:[['让文献卷平铺','在左侧纸卷的金线摊开 C，沿桌上金色横线走到右端。'],['为第一处记录夹书签','任选一扇铜框阅读窗，走到窗前按 F 夹入书签。'],['把另一段记录并排留下','到另一扇阅读窗按 F。两张纸会在展柜中并排展开。']]},
 '1203-1958':{story:'lens',title:'镜筒下的两片玻璃',goal:'推片调焦，辨认玻片上的两种轮廓',last:'夹入观察册',finish:[2.8,1.35],sites:[[-1.6,.60],[1.42,-.82],[-2.78,1.22]],
 tasks:[['移动载片找圆环','脚下的玻片跟着身体移动。把视野中心对准圆环并按 F。'],['把另一层调清楚','走到左前的黄铜滚花轮，按 F 调一格焦。'],['收录叶形轮廓','移动身体把叶形圈入视野。摊开 C 稳片后按 F 描下轮廓。']]},
 '1203-1992':{story:'message',title:'冬夜点阵里的问候',goal:'在键帽间拼出问候，再送往另一扇窗',last:'送出问候',finish:[2.72,1.27],sites:[[-2.20,.35],[0,.35],[2.20,.35]],
 tasks:[['看屏上第一个缺口','左、中、右三枚键各带一种笔画。走上闪亮的键按 F。'],['给中间一行补笔画','按下一枚亮键。屏上已经点亮的点阵会保留。'],['补齐最后的笔画','换到最后亮起的键，摊开 C，把整行一起压亮，然后按 F。']]},
 '1204-2024':{story:'lantern',title:'把年灯挂到檐下',goal:'按住灯座，将两翼灯骨合入红纸罩',last:'牵绳升灯',pin:[-.35,1.62],finish:[2.7,.99],sites:[[-2.15,-.48],[2.15,-.48]],
 tasks:[['稳住小灯座','将分身 G 投到脚边黄铜座，扣住绳头。'],['拢起第一扇灯骨','任选一侧灯骨，在金圈内摊开 C 压住竹弧，按 F 扣上。'],['扣起另一半红纸罩','到相对一侧继续压住竹弧，按 F 扣上。']]},
 '1204-1996':{story:'rover',title:'红沙上的第一对车辙',goal:'固定舱瓣、放平坡道，让小车驶上红沙',last:'松开车闩',pin:[-2.45,.95],finish:[1.8,1.54],sites:[[-1.85,-.80],[-1.85,1.42],[1.25,-.95],[2.8,.72]],
 tasks:[['支住着陆平台','靠近左侧支脚，投 G 将分身放到锁扣上。'],['沿铰链放平坡道','在坡顶的细金线处摊开 C，沿同一条直线走向坡脚。'],['给小车选一条出舱路','近处平坡和远处红石地各有一个金色落点。走近其一按 F。']]},
 '1205-2024':{story:'bridge',title:'溪上合拢的两根弧木',goal:'托稳桥模，接合两根弧木再过桥',last:'取下临时木销',pin:[-2.48,1.23],finish:[.08,-.70],sites:[[-2.15,.05],[-.48,-.68],[2.20,.05],[.55,-.68]],
 tasks:[['把桥模支在溪岸','向左岸木托投 G，压稳桥模。'],['托起一根弧木','任选一岸的弧木，在它旁边按 F 托起。'],['让榫口贴住合口','把弧木带到同侧桥心的金环里，摊开 C 再按 F。']]},
 '1205-1901':{story:'drum',title:'把飞鸟装进走马灯',goal:'补进两帧飞鸟，沿圆筒走出连续的动作',last:'推开窥影窗',finish:[.20,1.70],sites:[[-2.38,-.48],[2.38,-.48],[-2.5,.92],[0,1.56],[2.48,.92]],
 tasks:[['补画带上第一扇空窗','两侧画架各有一帧飞鸟。任选一幅按 F 装进筒内。'],['让翅膀接着向下拍','到另一侧安好下一帧。'],['推动脚边的弧形棘轮','先跳落在左侧棘齿上，再沿弧线走过中间和右齿，给筒加速。']]},
 '1206-1996':{story:'falls',title:'云瀑从画框里经过',goal:'沿两岸换景，把近松和远瀑收入同一页',last:'合上取景框',finish:[.09,1.55],sites:[[-2.32,.52],[2.0,-.85]],
 tasks:[['从低处给松枝留白','走到左岸细金框旁，摊开 C 俯身，让松枝从瀑口移开，按 F 留景。'],['换到右岸看第二叠水','走到右岸金点，弹跳中按 F，从上沿看见整条飞瀑。']]},
 '1206-1877':{story:'foil',title:'银箔上的三道声纹',goal:'在锡箔上压出三音，换挡听回声',last:'拨到回放',finish:[2.58,1.2],sites:[[-2.3,-.72],[0,-.72],[2.28,-.72]],
 tasks:[['落下刻针','走到锡箔左端的小铜圈，摊开 C 按 F 让刻针轻触银箔。'],['把声音刻在滚筒上','从左往右经过三个刻度。靠近自己的一侧刻高音，远侧刻低音。'],['抬针离开滚筒','走到右端金点，收身 C 让刻针抬起，按 F 换轴。']]}
};
export const isDecemberChapter=(id:string)=>Object.hasOwn(exhibits,id);
export const near=(x:number,z:number,p:Spot,r=.66)=>Math.hypot(x-p[0],z-p[1])<=r;
export const stars:Spot[]=[[-3.16,1.63],[-2.84,-.34],[-2.06,-1.74],[-.72,-1.59],[.80,-1.56],[2.86,-1.52],[3.13,.44],[1.64,1.68]];
export class DecemberRun {
  step=0;count=0;side=-1;selected=0;mask=0;pin=false;flat=false;began=false;travel=0;errors=0;end=-1;
  t=0; elapsed=0;note='';until=0;marks=new Set<number>();notes:number[]=[]; view:'play'|'low'|'far'='play'; private airborne=false;
  readonly spec:Exhibit;readonly order:number[];
  constructor(readonly id:string,seed:number,readonly markCount=8,readonly markName='藏签'){this.spec=exhibits[id];if(!this.spec)throw Error('未知舞台');
    if(this.story==='bridge'){this.collectibles[3]=[-.72,-.62];this.collectibles[4]=[.80,-.62];}
    this.t=(seed%89)/29;const offset=seed%3;this.order=[offset,(offset+2)%3,(offset+1)%3];}
  get story(){return this.spec.story;}
  readonly collectibles:Spot[]=stars.map(p=>[...p]);
  get ready(){return this.step>=this.spec.tasks.length;}
  msg(text:string,err=false){this.note=text;this.until=this.t+2.15;if(err)this.errors++;}
  get hint():[string,string]{const [title,hint]=this.ready?['完成最后一步',this.story==='message'?'走到铜色发送键，跳起落回键面。':this.story==='drum'?'在窥影窗前摊开 C，再按 F 推窗看飞鸟。':'走到最后的金圈，按 F '+this.spec.last+'。']:this.spec.tasks[this.step];
    return [title+' · '+this.markName+' '+this.marks.size+'/'+this.markCount,this.t<this.until?this.note:hint];}
  get goal():Spot{
    const {sites:s,finish,pin}=this.spec;if(this.ready)return finish;
    switch(this.story){
      case 'mail':return this.step===0?pin!:this.step===1?s[this.mask===1?1:0]:s[2+this.selected];
      case 'archive':case 'rover':return this.step===0?(pin??s[this.began?1:0]):this.story==='archive'?s[this.step===1?2:2+(1-this.selected)]:this.step===1?s[this.began?1:0]:s[2];
      case 'lens':return s[[0,2,1][this.step]];
      case 'message':return s[this.order[this.step]];
      case 'lantern':return this.step===0?pin!:s[this.step===1?0:1-this.selected];
      case 'bridge':return this.step===0?pin!:s[this.step===1?(this.mask===1?2:0):this.selected*2+1];
      case 'drum':return s[this.step<2?(this.step===0?0:1-this.selected):2+Math.min(2,this.count)];
      case 'falls':return s[this.step];
      case 'foil':return s[this.step===0?0:this.step===1?Math.min(2,this.count):2];
    }
  }
  get alternative():Spot|undefined{
    const s=this.spec.sites;
    if(this.story==='rover'&&this.step===2)return s[3];
    if(this.mask||this.ready)return;
    if(this.story==='archive'&&this.step===1)return s[3];
    if(this.story==='bridge'&&this.step===1)return s[2];
    if(((this.story==='mail'||this.story==='lantern')&&this.step===1)||(this.story==='drum'&&this.step===0))return s[1];
  }
  private pick(x:number,z:number,a:Spot,b:Spot){return near(x,z,a)?0:near(x,z,b)?1:-1;}
  private latchSide(i:number){
    if(i<0||this.mask&(1<<i)){this.msg('这一处还没对上。看看另一边的金圈。',true);return false;}
    if(this.side<0)this.side=i;this.selected=i;this.mask|=1<<i;return true;
  }
  tick(dt:number,x:number,z:number,spread:number,air:boolean,pinned:boolean){
    this.t+=dt;this.elapsed+=dt;this.flat=spread>.52;
    const landed=this.airborne&&!air;this.airborne=air;
    if(this.end>=0){this.end+=dt;return;}
    for(let i=0;i<this.markCount;i++)if(air&&near(x,z,this.collectibles[i],.63)&&!this.marks.has(i)){
      this.marks.add(i);this.msg('已收好一枚'+this.markName+'。');}
    this.pin=pinned;
    if(this.ready){if(this.story==='message'&&landed&&near(x,z,this.spec.finish))this.end=0;return;}
    if(this.spec.pin&&this.step===0&&pinned)this.step=1;
    const s=this.spec.sites;
    if(this.story==='mail'&&this.step===1&&landed&&pinned){
      const i=this.pick(x,z,s[0],s[1]);if(this.latchSide(i)){this.step=2;this.msg(i?'方戳压好了，把信送去右格。':'圆戳压好了，把信送去左格。');}}
    const archive=this.story==='archive'&&this.step===0,rover=this.story==='rover'&&this.step===1&&pinned;
    if((archive||rover)&&this.flat){
      if(near(x,z,s[0]))this.began=true;
      if(this.began){const axis=archive?x:z,start=s[0][archive?0:1],stop=s[1][archive?0:1];
        const off=Math.abs(archive?z-s[0][1]:x-s[0][0]);
        if(off>.84){this.began=false;this.travel=0;this.msg('离开金线了。从卷首重新压过这一段。',true);}
        else{this.travel=Math.max(this.travel,Math.max(0,Math.min(1,(axis-start)/(stop-start))));if(near(x,z,s[1],.50)){this.travel=1;this.step++;this.began=false;}}}}
    if(this.story==='drum'&&this.step===2&&(this.count>0||landed)&&near(x,z,s[2+this.count],.64)){this.count++;if(this.count===3)this.step++;}
    if(this.story==='foil'&&this.step===1&&this.flat){
      if(Math.abs(x-s[this.count][0])<.39&&Math.abs(z+.20)<1.25){
        const pitch=z<-.25?0:1;this.notes.push(pitch);this.count++;if(this.count===3)this.step=2;}}
  }
  action(x:number,z:number,air:boolean){
    if(this.end>=0)return;
    if(this.ready){if(this.story==='message'){this.msg('站上铜色发送键，跳起再落下。');return;}
      if(this.story==='drum'&&!this.flat){this.msg('摊开 C，才能从低矮的窥影窗望进去。',true);return;}
      if(!near(x,z,this.spec.finish,.76)){this.msg('最后的机关在金圈旁。',true);return;}this.end=0;return;}
    const s=this.spec.sites;
    if(this.spec.pin&&!this.pin){this.msg('铜锁还没有扣紧。走近投分身 G。',true);return;}
    switch(this.story){
      case 'mail':if(this.step===2&&near(x,z,this.goal,.72)){this.step=this.mask===3?3:1;return;}break;
      case 'archive':if(this.step===1||this.step===2){const i=this.pick(x,z,s[2],s[3]);if(this.latchSide(i)){this.step++;}return;}break;
      case 'lens':if(near(x,z,this.goal,this.step===1?.7:.48)&&(this.step<2||this.flat)){this.step++;return;}break;
      case 'message':if(near(x,z,this.goal)&&(this.step<2||this.flat)){this.step++;return;}break;
      case 'lantern':if(this.step>=1&&this.flat){const i=this.pick(x,z,s[0],s[1]);if(this.latchSide(i))this.step++;return;}break;
      case 'rover':if(this.step===2){const i=this.pick(x,z,s[2],s[3]);if(this.latchSide(i))this.step++;return;}break;
      case 'bridge':if(this.step===1){const i=this.pick(x,z,s[0],s[2]);if(this.latchSide(i))this.step=2;return;}
        if(this.step===2&&near(x,z,this.goal)&&this.flat){this.step=this.mask===3?3:1;return;}break;
      case 'drum':if(this.step<2){const i=this.pick(x,z,s[0],s[1]);if(this.latchSide(i))this.step++;return;}break;
      case 'falls':if(near(x,z,this.goal)&&(this.step===0?this.flat:air)){this.step++;return;}break;
      case 'foil':if(this.step===0&&near(x,z,this.goal)&&this.flat){this.step++;return;}
        if(this.step===2&&!this.flat&&near(x,z,this.goal)){this.step++;return;}break;
    }
    this.msg(this.spec.tasks[this.step][1],true);
  }
}
