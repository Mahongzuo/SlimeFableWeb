import type {WinterPacket} from './winter-defense';
/** These controls operate museum models and exhibit documents only. */
export const yearendControls={
 '1217':{name:'追读两跳',guide:'在路程前半按一次，把第一跳的信号记成金点。同一金点越过后半刻线再按一次，回收台才收到完整读数。漏掉的信号可在下一批重新追读。',ready:'接收台就绪',used:'接收窗已读取',color:'#b8d7df'},
 '1218':{name:'夹住湿印张',guide:'蓝色给纸台先为印张润边，被润过的印张有金色纸角。见到纸角后合夹，印张会暂时留在压床；借绿色送风台在开夹前晾好它。',ready:'压床可合夹',used:'纸夹已压下',color:'#cda47c'},
 '1219':{name:'交换两侧文本',guide:'文书带蓝、金两色封签。先按交换键把一份送到桌中央，下一次等相反色的封签到场再按；同色到场时保留待换文本。',ready:'签字台待交换',used:'文书交接就绪',color:'#d2bc8f'},
 '1220':{name:'分送观测图',guide:'按图章分送：蓝章送一站、金章送二站、绿章送三站。最后点过的塔位选地址，1/2 号对应一站、3/4 号对应二站、5/6 号对应三站。等对色的图入场再送。',ready:'分拣架就绪',used:'图件已核送',color:'#b4d5c6'},
 '1221':{name:'曝光晴空样带',guide:'风台先滤去云雾，标出可读的金色样带。只有它前后近处都没有未滤云团时才可曝光；先处理挤在一起的云团，再按曝光。',ready:'观测窗待开',used:'采样片已曝光',color:'#bccca7'},
} as const;
export type YearendDay=keyof typeof yearendControls;
export function isYearendDay(day:string):day is YearendDay{return Object.hasOwn(yearendControls,day);}
export const yearendService={
 '1217':{sectors:["雪原一跳线","折返回波线","回收站"],subject:'雪原回波',water:'近场接收台',wind:'远距引导台',help:'补一盏信标',finale:'扶正雪原返回舱',clean:'回波皆齐',incident:'漏读',guide:'雪原接收站的两道弧线标着回波折返的位置。把蓝、绿两座接收台移到当班的线路，留出完整的两跳。'},
 '1218':{sectors:["活字台","压印床","装订架"],subject:'待装订印张',water:'蓝色给纸台',wind:'绿色送风台',help:'临时托纸',finale:'装订会议纪念本',clean:'纸页平整',incident:'错页',guide:'这是纪念会议的年代印刷间。给纸台整理边缘，送风台晾干油墨。不要让未装好的纸页走过排字架。'},
 '1219':{sectors:["展厅入口","两侧签字桌","交换档案台"],subject:'待传文本',water:'近桌校页台',wind:'远桌传件台',help:'增开收件托',finale:'合起交换文本',clean:'文本完整',incident:'漏收',guide:'这座签字厅是档案展陈。两张长桌各有一本待交换文本；在两侧传件台接好不同封签，再合起归档。'},
 '1220':{sectors:["三星图夹","三站分拣口","九星展架"],subject:'待分观测图',water:'近场读图台',wind:'远距接图台',help:'加开图夹',finale:'点亮九星展架',clean:'图件齐备',incident:'错投',guide:'模型展台把接收图按三色图章分给不同地面站。九颗展示星等着最后一份观测图归档。'},
 '1221':{sectors:["云层筛网","晴空曝光窗","地面出图口"],subject:'云层样带',water:'窄带读图台',wind:'云雾滤光台',help:'校正图尺',finale:'将碳图送到地面站',clean:'样带清楚',incident:'漏样',guide:'发射前夜的纪念展用模型预演观测。先过滤云雾，再挑前后都干净的样带，把每一条清晰图带接回桌面。'},
} as const;
type Packet=WinterPacket&{id?:number};
interface Control{hits:number;reserve:number;focus:number;active:number}
export const mailTones=['#83c0d2','#ecc187','#a5ce98'] as const;
export function operateYearend(day:YearendDay,c:Control,live:Packet[],total:(route:number)=>number){
 if(day==='1217'){
   for(const p of live){const r=p.distance/total(p.route);
     if(p.lit&&r>=.50){p.work=0;c.hits++;}
     else if(!p.lit&&r<.50){p.lit=true;c.hits++;}}
 }else if(day==='1218'){
   for(const p of live)if(p.lit){p.slow=3.8;p.work--;c.hits++;}
 }else if(day==='1219'){
   const side=(p:Packet)=>1+((p.id??p.route)%2);
   const doc=live.find(p=>!c.reserve||side(p)!==c.reserve);
   if(doc){doc.work=0;c.reserve=c.reserve?0:side(doc);c.hits++;}
 }else if(day==='1220'){
   for(const p of live)if((p.id??p.route)%3===Math.floor(c.focus/2)){p.work=0;c.hits++;}
 }else{
   for(const p of live)if(p.lit&&!live.some(other=>other.route===p.route&&!other.lit&&Math.abs(other.distance-p.distance)<total(p.route)*.15)){
     p.work=0;c.hits++;
   }
 }
}
export function beamYearend(day:YearendDay,c:Control,kind:'water'|'wind',p:Packet){
 if(day==='1218'&&kind==='water'||day==='1221'&&kind==='wind')p.lit=true;
 if(day==='1218'&&kind==='wind'&&p.lit&&c.active>0)return 1.6;
 return 0;
}
export function cadenceYearend(day:YearendDay,n:number){
 switch(day){
 case '1217':return {load:n%3===1?1:0,spacing:.07,speed:n%2?1.02:.94};
 case '1218':return {load:0,spacing:n%3<2?-.47:.94,speed:1};
 case '1219':return {load:n%4===3?1:0,spacing:n%2?.43:-.43,speed:1};
 case '1220':return {load:0,spacing:.04,speed:n%3===1?1.14:.99};
 case '1221':return {load:0,spacing:n%4<2?-.57:.57,speed:1};
 }
}

