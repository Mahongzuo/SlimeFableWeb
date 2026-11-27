/** These miniature exhibits and their puzzles are fictional. Facts come from each chapter. */
import {within,winterMarks,type Point} from './winter-chapters';
export {within,type Point};
export type MidwinterStory='bell'|'radio'|'garden'|'ridge'|'sign'|'tent'|'dynamo'|'twins'|'press'|'letter';
export interface MidwinterChapter{
  gate:1|2;story:MidwinterStory;title:string;goal:string;last:string;finishHelp:string;repair:string;
  abilities:string[];tasks:[string,string][];sites:Point[];finish:Point;pin?:Point;
}
export const midwinterChapters:Record<string,MidwinterChapter>={
 '1212-1936':{gate:1,story:'bell',title:'钟响以前的两幅时间页',goal:'在档案亭把两幅时间页拼回钟架下的光窗',last:'牵绳鸣钟',abilities:['分身托起窗框','摊开嵌页'],pin:[-2.55,1.15],sites:[[-2.10,-.84],[2.08,-.84],[-.69,.15],[.69,.15]],finish:[2.65,1.43],tasks:[['托起光窗','靠近左侧铜座，投分身 G 托住窗框。'],['选一幅时间页','左右各有一幅。到页匣按 F 取起，先取哪幅都可以。'],['拼合页边','到中间同侧的拼缝摊开 C，按 F 装入，再去拿另一幅。']],finishHelp:'两幅时间页都进窗后，到钟架右前的绳结按 F，听钟摆回响。',repair:'看页上开口的方向。左页放中央左槽，右页放中央右槽。走错槽时手里的页会保留。'},
 '1212-1901':{gate:2,story:'radio',title:'海崖接收棚的三个点',goal:'稳住接收机，在三次闪光时按下电键',last:'留下字母 S',abilities:['弹跳系起风筝天线','摊开稳住调谐轮'],sites:[[-2.10,.52],[2.04,.50],[0,-.68]],finish:[.12,1.59],tasks:[['从一边调谐','左右调谐轮任选一端。收身弹跳，在空中按 F 系起风筝天线；落地摊开 C，再按 F 稳住调谐轮。'],['听点，读灯','到中央电键。指针掠过黄铜刻度时灯亮，按 F 记下第一个点。'],['记录另外两点','留在电键旁，等之后两次亮灯分别按 F。每次亮灯只记一个点。']],finishHelp:'三点都已压在纸带上。到前端卷纸把手按 F 收纸，翻出字母 S。',repair:'调谐前先在轮旁跳起按 F 系绳。纸带上每次亮灯可记一点，提前按或连按只需等下次。'},
 '1213-1937':{gate:1,story:'garden',title:'静水庭里的一只纸鹤',goal:'在烛台边护住灯火，再把纸鹤轻放水上',last:'把纸鹤放在水面',abilities:['摊开护住烛火','轻托纸鹤'],sites:[[-2.07,-.48],[1.94,-.48],[0,.67]],finish:[.05,-1.54],tasks:[['在烛台旁停留','到任一烛台，摊开 C 为烛芯挡风，等烛光安定。可以随时起身。'],['托起纸鹤','到前方素纸台，按 F 托起纸鹤。可随意停留。']],finishHelp:'走到水边石沿的圆纹，按 F 轻轻放下纸鹤。随时可以停留或从暂停菜单回港。',repair:'仍可在原处慢慢继续。护烛时摊开后停留片刻，托鹤时靠近素纸台。'},
 '1213-1642':{gate:2,story:'ridge',title:'雾隙里的两重山脊',goal:'从船的两处望口让近山和远山对齐',last:'展平山形图',abilities:['摊开从低望口观测','弹跳抬高视线'],sites:[[-2.10,.52],[2.03,-.78]],finish:[.15,1.51],tasks:[['选择第一处望口','左边低望口摊开 C，右边高望口收身再弹跳。雾带移走时按 F 描山。'],['从另一望口补线','到另一个望口，用对应身位，在山尖清楚露出时按 F。两段山形将合到海图上。']],finishHelp:'到前甲板的海图铜辊按 F 展平山形图。',repair:'左望口要低，右望口要跳起。等雾带露出山尖再描线，已描的山形会保留。'},
 '1214-1951':{gate:1,story:'sign',title:'石榴巷口立新匾',goal:'用身体平整木料，将街坊的新字条嵌回牌面',last:'把新匾立到巷口',abilities:['摊开刨平木面','分身压住夹具'],pin:[-2.57,1.10],sites:[[-1.66,-.52],[1.73,-.52],[0,.88]],finish:[2.68,1.50],tasks:[['固定木夹','在木夹旁投分身 G，让木匾稳稳卡住。'],['沿着木纹平整牌面','选一端的金圈，摊开 C，并保持摊开走到另一端。逆向也能完成。'],['嵌入原创字条','木面平整后到前方字匣，按 F 把「石榴巷」字条嵌入。']],finishHelp:'到巷口右前方的木架按 F 立起新匾。',repair:'先摊开在木料一端停一下，再沿长边滑到另一端；走远会提示回到木板。'},
 '1214-1911':{gate:2,story:'tent',title:'两道极昼日影之间',goal:'在极昼雪原记录两道日影的落点，定下帐篷的位置',last:'拉起极昼帐篷',abilities:['分身立测影杆','摊开压住雪标'],pin:[-.02,1.16],sites:[[-1.91,-.68],[1.91,-.68]],finish:[2.65,1.39],tasks:[['把杆立在雪中','靠近营地前端杆座，投分身 G 立稳测影杆。'],['钉下第一道影子','任选左右一个雪标等候。当蓝影扫到脚边，摊开 C 后按 F 钉下标记。'],['等另一道影子','去另一端。影子重新落在脚边时，保持摊开并按 F。']],finishHelp:'两处雪标之间出现帐脚轮廓。走到右侧绳桩按 F，让帐篷立起来。',repair:'看蓝影的尖端和雪标。影子转走可原地等下一轮，第一枚雪标会留下。'},
 '1215-1991':{gate:1,story:'dynamo',title:'同步盘上的第一扇灯窗',goal:'在发电机展台拨动模型同步盘，使刻线会合',last:'合上展台闸柄',abilities:['身体横移调速','摊开锁住同步盘'],sites:[[-1.89,.64],[1.93,.64],[0,-.75]],finish:[2.62,1.47],tasks:[['选择调速滑轨','在左或右踏片按 F 接入展览模型，踏片决定从哪一侧追上基准线。'],['把刻线带进亮区','站到所选滑轨上，观察旋盘两根针相互追近。重合时摊开 C 按 F 锁住。'],['校对模型接点','带着锁好的同步盘到中央触点，保持摊开按 F 确认。']],finishHelp:'走到右前的独立展示手柄，按 F 合闸，让微缩街区的窗逐排亮起。',repair:'回到选中的踏片等两根针进入同一亮区。过早摊开会放慢追赶，可收身等下一圈。'},
 '1215-1965':{gate:2,story:'twins',title:'并行的两艘飞船',goal:'保持轨道模型间的空隙，从两艘飞船各拍一张照片',last:'翻开交会照片',abilities:['分身锁住参考轨道','摊开稳住取景架'],pin:[-2.51,1.23],sites:[[-1.9,-.62],[1.91,-.62]],finish:[.16,1.62],tasks:[['扣住参考轨','在左前定位铜座附近，投分身 G 固定一条轨道。'],['拍第一艘船的视角','到任一观测位，摊开 C。等两船移入取景架的双框，按 F 拍下。'],['在另一舷回拍','移到另一侧取景架，仍保持摊开，等两船进入另一组双框再按 F。']],finishHelp:'走到前排相册按 F 翻开两艘船相互拍下的照片。',repair:'等两船进入同侧成对的亮框。两船间保留空隙，已拍的底片会留下。'},
 '1216-1978':{gate:1,story:'press',title:'两栏公报并排付印',goal:'将两栏校样压进各自版框，亲手合印一张公报',last:'合印双栏公报',abilities:['分身托住压床','摊开推送校样'],pin:[-2.53,1.20],sites:[[-2.18,-.71],[2.18,-.71],[-.74,.26],[.75,.26]],finish:[2.71,1.51],tasks:[['托住压床','在左前液压展具旁投分身 G，撑起印床上盖。'],['选择一栏校样','左样是竖纹，右样是横纹，在两匣中任选一栏按 F 取出。'],['把校样推入同纹槽','摊开 C，先在同侧墨辊停留到上墨，接着到中央同纹框按 F 送入。两栏都要校样。']],finishHelp:'在右前方下压杆旁按 F 合印。看压床压下、抬起，双栏留到同一张纸上。',repair:'取样后在同侧墨辊摊开停留，铜圈移开表示墨色充足。左匣对中央左槽，右匣对中央右槽。'},
 '1216-1775':{gate:2,story:'letter',title:'写给冬夜的两行家书',goal:'从炉边和窗边采下细节，给冬夜书信留下自己的次序',last:'用火漆封信',abilities:['摊开贴近炉边','弹跳望向窗外'],sites:[[-2.11,-.78],[2.07,-.82],[0,.71]],finish:[2.59,1.50],tasks:[['从炉边或窗边起笔','任选一处。炉边摊开 C 看火色；窗边收身弹跳看雪。观察时按 F 记下。'],['写进第一行','将选好的细节带到靠前的信笺按 F 写入。换一处细节再写第二行。'],['收拢写好的信笺','两行各有一幅小画。到信笺处摊开 C，按 F 把它折好。']],finishHelp:'把折好的信带到右前的火漆盘，按 F 封信。',repair:'炉边摊开，窗边在跳起时观察；每取到一个细节都要先回信笺按 F 记下。'}
};
export const isMidwinterChapter=(id:string)=>Object.hasOwn(midwinterChapters,id);
export class MidwinterRun{
 readonly spec:MidwinterChapter;readonly marks=new Set<number>();readonly collectibles=winterMarks;readonly markCount:number;
 step=0;mask=0;chosen=-1;carry=-1;pin=false;flat=false;end=-1;t=0;elapsed=0;errors=0;dwell=0;sweep=0;count=0;lastBeat=-1;
 offset=0;proof=0;until=0;note='';view:'play'|'low'|'far'='play';
 constructor(readonly id:string,seed:number,count:number){this.spec=midwinterChapters[id];if(!this.spec)throw Error('未知展室');this.t=seed%73*.14;this.markCount=this.quiet?0:count;}
 get story(){return this.spec.story;}get quiet(){return this.story==='garden';}get ready(){return this.step===this.spec.tasks.length;}
 get side(){return this.mask===1?1:0;}get beat(){return Math.floor(this.t/1.08);}get pulse(){return this.t%1.08<.54;}
 get fogOpen(){return Math.sin(this.t*1.29)>.10;}
 get shadow(){return Math.sin(this.t*1.12);}get gap(){return Math.sin(this.t*1.38);}
 get synced(){return Math.cos(this.offset)>.86;}
 aligned(i:number){return this.story==='tent'?(i?this.shadow>.65:this.shadow<-.65):(i?this.gap>.58:this.gap<-.58);}
 get goal():Point{
  const a=this.spec.sites;if(this.ready)return this.spec.finish;if(this.spec.pin&&!this.step)return this.spec.pin;
  switch(this.story){
   case 'press':if(this.carry>=0&&this.proof<1)return this.roller;return this.carry<0?a[this.side]:a[2+this.carry];
   case 'bell':return this.carry<0?a[this.side]:a[2+this.carry];
   case 'radio':return this.step?a[2]:a[Math.max(0,this.chosen)];
   case 'garden':return this.step?a[2]:a[0];
   case 'ridge':case 'tent':case 'twins':return a[this.side];
   case 'sign':return this.step===2?a[2]:a[this.chosen<0?0:1-this.chosen];
   case 'dynamo':return a[this.step===2?2:Math.max(0,this.chosen)];
   case 'letter':return this.carry>=0||this.step===2?a[2]:a[this.side];
  }
 }
 get alternative(){if(this.ready||this.spec.pin&&!this.step||this.chosen>=0||this.carry>=0)return;return this.spec.sites[1];}
 get roller():Point{return [this.carry===1?1.51:-1.51,-.24];}
 get hint():[string,string]{const [h,p]=this.ready?['完成最后一步',this.spec.finishHelp]:this.spec.tasks[this.step];
  const count=this.story==='radio'&&this.step?' · 纸带 '+this.count+'/3':'';
  return [h+count+(this.quiet?'':' · 藏签 '+this.marks.size+'/'+this.markCount),this.t<this.until?this.note:p];}
 say(v:string,error=false){this.note=v;this.until=this.t+2.1;if(error&&!this.quiet)this.errors++;}
 pick(i:number){if(this.chosen<0)this.chosen=i;this.carry=i;}
 place(){this.mask|=1<<this.carry;this.carry=-1;}
 nearSide(x:number,z:number){const a=this.spec.sites;return within(x,z,a[0])?0:within(x,z,a[1])?1:-1;}
 tick(dt:number,x:number,z:number,spread:number,air:boolean,pinned:boolean){
  this.t+=dt;this.elapsed+=dt;this.flat=spread>.54;this.pin=pinned;
  if(this.end>=0){this.end+=dt;return;}
  if(air)for(let i=0;i<this.markCount;i++)if(within(x,z,this.collectibles[i],.62))this.marks.add(i);
  if(this.ready)return;
  if(this.spec.pin&&!this.step&&pinned)this.step=1;
  const i=this.nearSide(x,z);
  if(this.story==='press'&&this.carry>=0&&pinned&&this.flat&&within(x,z,this.roller,.52))this.proof=Math.min(1,this.proof+dt*1.65);
  if(this.quiet&&!this.step){this.dwell=i<0||!this.flat?0:this.dwell+dt;if(this.dwell>.80){this.chosen=i;this.step++;}}
  if(this.story==='sign'&&this.step===1&&pinned&&this.flat){
   if(this.chosen<0&&i>=0)this.chosen=i;
   if(this.chosen>=0&&Math.abs(z-this.spec.sites[0][1])<.7){
    const a=this.spec.sites[this.chosen][0],b=this.spec.sites[1-this.chosen][0];
    const reach=Math.max(0,Math.min(1,(x-a)/(b-a)));
    if(reach<this.sweep+.23)this.sweep=Math.max(this.sweep,reach);
    if(i===1-this.chosen&&this.sweep>.83){this.sweep=1;this.step++;}
   }
  }
  if(this.story==='dynamo'&&this.step===1){
   const engaged=i===this.chosen;this.offset+=(engaged?(this.flat?.30:1.48):.11)*dt;
  }
 }
 act(x:number,z:number,air:boolean){
  if(this.end>=0)return;
  if(this.ready){if(within(x,z,this.spec.finish,.78))this.end=0;else this.say(this.spec.finishHelp,true);return;}
  if(this.spec.pin&&!this.pin){this.say(this.spec.repair,true);return;}
  const i=this.nearSide(x,z),a=this.spec.sites,unused=i>=0&&!(this.mask&(1<<i));
  const old=this.step;
  switch(this.story){
   case 'bell':case 'press':
    if(this.step===1&&unused){this.pick(i);this.proof=0;this.step=2;}
    else if(this.step===2&&this.flat&&(this.story==='bell'||this.proof===1)&&within(x,z,a[2+this.carry])){this.place();this.step=this.mask===3?3:1;}break;
   case 'radio':if(!this.step&&this.chosen<0&&i>=0&&air){this.chosen=i;this.say('天线已经系好，落地后摊开身体锁住调谐轮。');return;}
    if(!this.step&&i===this.chosen&&i>=0&&this.flat)this.step++;
    else if(this.step&&within(x,z,a[2])&&this.pulse&&this.lastBeat!==this.beat){
     this.lastBeat=this.beat;this.count++;this.step=this.count===3?3:2;this.say('纸带已经记下 '+this.count+' 个点。');return;}break;
   case 'garden':if(this.step===1&&within(x,z,a[2]))this.step++;break;
   case 'ridge':if(unused&&this.fogOpen&&(i?air:this.flat)){this.pick(i);this.place();this.step++;}break;
   case 'tent':case 'twins':if(unused&&this.flat&&this.aligned(i)){this.pick(i);this.place();this.step++;}break;
   case 'sign':if(this.step===2&&within(x,z,a[2]))this.step++;break;
   case 'dynamo':if(!this.step&&i>=0){this.chosen=i;this.offset=i?1.12:3.31;this.step++;}
    else if(this.step===1&&i===this.chosen&&this.synced&&this.flat)this.step++;
    else if(this.step===2&&within(x,z,a[2])&&this.flat)this.step++;break;
   case 'letter':
    if(this.step===2&&this.flat&&within(x,z,a[2]))this.step++;
    else if(this.carry<0&&unused&&(i?air:this.flat)){this.pick(i);this.step=1;this.say('回到信笺，将刚看到的细节写下来。');return;}
    else if(this.carry>=0&&within(x,z,a[2])){this.place();this.step=this.mask===3?2:0;}break;
  }
  if(this.step===old)this.say(this.spec.repair,true);else this.until=0;
 }
}
