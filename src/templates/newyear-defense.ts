import type {WinterPacket} from './winter-defense';
/** Miniature museum mechanisms. All ticket, light and type handling is fictional. */
export const newyearControls={
 '0102':{name:'开对岸舷桥',guide:'蓝角票和铜角票来自不同码头。按一次会收下当前一船的票，再等另一色的队伍出现，第二次按键才能让两艘船会航。同色仍会在原码头排队。',ready:'舷桥可放行',used:'值班舷桥已应答',color:'#9cc1c4'},
 '0103':{name:'把回音送入着陆窗',guide:'远距风塔先标出带金环的中继回音。把塔移到途经的坑缘；等金环进入路上两道铜标之间，再开着陆窗接收。过窗可改接随后回音。',ready:'接收窗待开',used:'中继窗已打开',color:'#b7b3a2'},
 '0104':{name:'合上六点字模',guide:'近台接下一页时给它压出凸点。等一张带点的页盘和一张空盘同时在场，按键便把两盘按左右列拼成一张触读卡。只剩同类页盘时等下一盘。',ready:'两列待合版',used:'字模已合版',color:'#c8b097'},
 '0105':{name:'给冰灯配罩',guide:'最后选择的单号塔位守蓝色冷罩，双号守金色暖罩。趁同色灯罩进巷时按键。下一次换岸可把另一色接到对面的灯座。',ready:'灯罩待装',used:'灯座已接罩',color:'#aad3d7'},
 '0106':{name:'把州图送进星孔',guide:'红角是快车带来的版片，要在前半段盖戳；青角的是慢车，要等过中心线才接。两色同时合时可一起送入公告栏。',ready:'邮驿戳台待用',used:'转送版片',color:'#c88f75'},
 '0107':{name:'转动顺风标',guide:'风塔先给风涡圈上金边。选择单号位时在航程前半段吹开金环，选择双号位时等它过中心线再吹。',ready:'顺风标待转',used:'打开一段顺风带',color:'#accbd0'},
 '0108':{name:'比对卡孔',guide:'蓝卡须有近台的金色读数标记，赭卡须保持原色。两种卡同时在场才可比对。',ready:'读卡杆待压',used:'核对两张卡',color:'#a5cbb4'},
 '0109':{name:'锁定下一路',guide:'依次收蓝色音轨、金色通话、绿色网页。前两路小灯锁住后第三路才会并入；漏掉可等同色的下一包。',ready:'信号开关待接',used:'锁存演示通道',color:'#83a7b6'},
 '0110':{name:'向本站转通风轮',guide:'风塔先在雾团上留下金圈，再选单号位排第一站（中线以前），或双号位排第二站（过中线以后）。同站多个金圈可以一批排出。',ready:'风井待接手',used:'通风轮已转',color:'#a0aca5'},
} as const;
export type NewyearDay=keyof typeof newyearControls;
export function isNewyearDay(day:string):day is NewyearDay{return Object.hasOwn(newyearControls,day);}
export const newyearService={
 '0102':{subject:'双港乘船票',guide:'两片水面各有一座票亭。潮纹水灯守近岸，领航风标照远船，轮流送两港客人上船。'},
 '0103':{subject:'待接中继回音',guide:'月背沙盘上三道坑沿窗口接续交班。把扇扫塔移到来路打上金环，再在两道铜标之间接收回音。'},
 '0104':{subject:'待印触读纸盘',guide:'木制阅读台把两列、三行的凸点活字分给纸页。近台先压点，再与空盘合版，让整本书都能从指尖读到。'},
 '0105':{subject:'待配冰灯罩',guide:'冰墙之间传来蓝、金两路灯罩。近处结冰塔守住冰壁，远处冷风塔接住暖流，给巷中两排灯座配罩。'},
 '0106':{subject:'待盖戳州图版片',guide:'窄道快车和主道慢车把版片交给木制公告栏。看版片颜色和铜线，用不同顺序接图。'},
 '0107':{subject:'海峡逆风涡',guide:'两岸之间各有一段风标带。把设备沿白崖迁到对岸，读金边的位置，按时转开风标。'},
 '0108':{subject:'待核对统计卡',guide:'卡槽分两色送出打孔卡。把能读孔的近台移到蓝卡来路，再配一张赭色卡压过读杆。'},
 '0109':{subject:'待并入演示的三路信号',guide:'蓝、金、绿三线会轮流进入。等当前灯座的同色信号出现再锁存。'},
 '0110':{subject:'拱券下待排的蒸汽',guide:'在两座通风井之间迁站。先用风塔给蒸汽加金圈，再选择相应站位开风井。'},
} as const;
type Signal=WinterPacket&{id?:number};
interface Control{focus:number;reserve:number;hits:number}
export const januaryWeekDefense = (day:string) => day>='0106'&&day<='0110';
export const signalKind=(p:Signal,count=2)=>(p.id??p.route)%count;
function matchesWindow(day:string,c:Control,p:Signal,fraction:number){
 switch(day){
  case '0106':return (fraction<.5?0:1)===signalKind(p);
  case '0107':return p.lit&&(fraction<.5?0:1)===c.focus%2&&fraction<.83;
  case '0109':return signalKind(p,3)===c.reserve;
  case '0110':return p.lit&&(fraction<.5?0:1)===c.focus%2;
  default:return false;
 }
}
export function januaryPacketCount(day:string,c:Control,packets:Signal[],tracks:{total:number}[]){
 let marked=false,blank=false,count=0;
 for(const p of packets){
  if(p.connected||p.work<=0)continue;
  if(day==='0108'){
   if(signalKind(p)===0)marked ||= !!p.lit;
   else blank ||= !p.lit;
   if(marked&&blank)return 2;
  }else if(matchesWindow(day,c,p,p.distance/tracks[p.route].total)){
   count++;
   if(day==='0109')return count;
  }
 }
 return count;
}
export function eligibleJanuaryPackets(day:string,c:Control,live:Signal[],length:(route:number)=>number){
 if(day==='0108'){
   const marked=live.find(p=>p.lit&&signalKind(p)===0),blank=live.find(p=>!p.lit&&signalKind(p)===1);
   return marked&&blank?[marked,blank]:[];
 }
 const matches=live.filter(p=>matchesWindow(day,c,p,p.distance/length(p.route)));
 return day==='0109'?matches.slice(0,1):matches;
}
export function januaryDefenseStatus(day:string,c:Control,ready:number){
 switch(day){
  case '0106':return ready?'已进快／慢车铜线范围 · 可收 '+ready+' 片':'等待快车红角进前段，或慢车青角过中线';
  case '0107':return (c.focus%2?'朝对岸后段':'朝近岸前段')+' · '+(ready?'金环已进入风带':'等金环进入所选风带');
  case '0108':return ready?'蓝卡已读孔，赭卡在场 · 可以比对':'等带金边蓝卡和原色赭卡同时到场';
  case '0109':return '下一路 '+['蓝色音轨','金色通话','绿色网页'][c.reserve]+' · '+(ready?'可以锁定':'等待同色');
  case '0110':return (c.focus%2?'第二站风井':'第一站风井')+' · '+(ready?'有 '+ready+' 团金环蒸汽':'等待金环蒸汽进入本段');
 }
 return '';
}
export function operateNewyear(day:NewyearDay,c:Control,live:Signal[],length:(route:number)=>number){
 const take=(p:Signal)=>{p.work=0;c.hits++;},side=(p:Signal)=>1+(p.id??p.route)%2;
 if(day==='0102'){
   const row=live.find(p=>side(p)!==c.reserve);
   if(row){take(row);c.reserve=side(row);}
 }else if(day==='0103'){
   for(const p of live){const u=p.distance/length(p.route);if(p.lit&&u>=.33&&u<=.72)take(p);}
 }else if(day==='0104'){
   const dot=live.find(p=>p.lit),blank=live.find(p=>!p.lit);if(dot&&blank){take(dot);take(blank);}
 }else if(day==='0105'){
   for(const p of live)if(signalKind(p)===c.focus%2)take(p);
 }else{
   const eligible=eligibleJanuaryPackets(day,c,live,length);
   for(const p of eligible)take(p);
   if(day==='0109'&&eligible.length)c.reserve=(c.reserve+1)%3;
 }
}
export function newyearBeam(day:NewyearDay,kind:'water'|'wind',p:Signal){
 if((day==='0103'||day==='0107'||day==='0110')&&kind==='wind'||day==='0104'&&kind==='water'||day==='0108'&&kind==='water'&&signalKind(p)===0)p.lit=true;
 return 0;
}
export function newyearCadence(day:NewyearDay,n:number,packetId=n){
 const gap=day==='0102'?.28:day==='0103'?.43:day==='0104'?.57:.34;
 if(januaryWeekDefense(day)){
   const quick=packetId%2===0,gap=day==='0109'?.23:day==='0108'?.39:.29;
   return {load:n%4===0?1:0,spacing:n%2===0?-gap:gap,speed:day==='0106'?(quick?1.20:.84):1};
 }
 return {load:(day==='0104'||day==='0103')&&n%3===0?1:0,spacing:n%2?gap:-gap,speed:day==='0105'&&n%3===2?1.10:1};
}

