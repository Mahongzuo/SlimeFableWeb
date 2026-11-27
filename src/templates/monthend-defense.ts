import type {WinterPacket} from './winter-defense';
/** Fictional exhibits, ticket desks and signals. They only handle model traffic. */
const control=(name:string,guide:string,ready:string,used:string,color:string)=>({name,guide,ready,used,color});
export const monthendControls={
 '1222':control('按旗发票','天气旗每次开票后换色。金旗给金角票、蓝旗给蓝角票；等同色票进场再开窗，错过等下一班。','票窗可开','票窗已换旗','#88c0c8'),
 '1223':control('分竹篮','近廊竹架每整理一篮就留下一个竹节，最多三节。等两篮接连进廊，再把积攒的竹节逐篮分出去。','竹架可分篮','竹篮已分送','#b4c991'),
 '1224':control('移湾中浮标','最近选中的单号塔位看近浪，双号看远浪。在白浪跨过对应刻度时移标，标内水花会退回一截，再由岸台接住。','浮标可移','水标已移动','#96cbd0'),
 '1225':control('互换驿票','等青、金两路都出现路票再交换。一对票须同时在场，同色票仍在各自的驿道上等候。','两路可交票','路票已交换','#cbb88b'),
 '1226':control('按站序交行李','站牌按蓝、金、绿三站轮换。只交当前站色的一箱，确认行李已接住，再将下一站牌翻起。','站牌待翻','行李已转站','#8bbbbf'),
 '1227':control('对齐纪念灯','在展廊中段的两个铜刻度间留住一份时标；下次按灯换到另一半侧的刻度。看灯座朝向再接同窗时标。','刻灯可校时','展灯已校正','#e6bd86'),
 '1228':control('越坡传邮袋','风架替邮袋打上浅金邮戳。等带戳邮袋越过坡顶、后边还有一只未到顶的邮袋时交接，后袋接过通行签。','坡顶可交袋','邮袋已转交','#b7c1a8'),
 '1229':control('两岸搭灯线','按键前先选桥面塔位。单号接西岸，双号接东岸。先给一岸存电，再换边给另一岸的玉兰灯续上；留在同岸可重新蓄电。','桥灯可接电','灯线已搭接','#e7c38c'),
 '1230':control('夹入回温标','蓝色冷窗先用风架给温标留记号。离开风口，等减速结束、指针回稳，再把金标夹进暖室记录本。','记录夹待合','温标归档','#b6c9d2'),
 '1231':control('扶平悬浮台','观察同线前、后两颗承点。在它们相距不到全线四分之一时扶平模型，两个承点会靠拢并共同消去剩余偏差。','车模待扶平','导轨找平','#a0c4b8'),
} as const;
export type MonthendDay=keyof typeof monthendControls;
export function isMonthendDay(day:string):day is MonthendDay{return Object.hasOwn(monthendControls,day);}
const service=(sectors:string[],subject:string,water:string,wind:string,help:string,finale:string,clean:string,incident:string,guide:string)=>({sectors,subject,water,wind,help,finale,clean,incident,guide});
export const monthendService={
 '1222':service(['椰岸入口','天气旗窗','海边看台'],'观礼票','近窗理票桌','远窗引导台','加开引导窗','打开海岸看台','票根齐整','漏票','在椰岸展厅的模型前迎接观众，留心旗色，给两列观礼票找对窗口。'),
 '1223':service(['竹廊前门','鲜竹转角','双栖竹榻'],'竹食篮','近廊竹架','侧廊送篮台','加一只竹篮','安顿竹榻上的双熊猫','竹篮皆到','漏篮','在竹廊腾出转运位置，备好鲜竹，留一篮给先到的小客人。'),
 '1224':service(['浅湾浪线','浮标弯','水陆展台'],'水面浪标','岸边扶标台','远浪引导台','保护浮标','让双栖机模离水','水标齐全','漂失','波纹把湾内的游标推向岸边。看准刻线移标，再亲手送展机跃过水面。'),
 '1225':service(['山麓票房','双路驿亭','共用里程碑'],'驿站路票','近路理票台','远路传票台','添一枚回执','翻开两路里程碑','两路皆齐','漏收','两条蜿蜒山道汇向驿亭。青、金两路的票根到齐后才可成对压印。'),
 '1226':service(['北行李栈','中央分拣台','南转运台'],'行李签','近线分拣台','远线接驳台','加开行李车','推出南北行李车','件件到站','漏件','站台传送带上有三色行李签。按翻牌顺序装车，完成最后一件的交接。'),
 '1227':service(['模型基座','时标长廊','纪念灯台'],'纪念时标','近侧时标台','远侧时标台','补一枚时标','点亮纪念灯列','时标无缺','漏点','在航天模型的展廊外沿时间轴布灯。每道窄窗只接负责的那段时标。'),
 '1228':service(['山下邮局','山腰折返','坡顶邮亭'],'山路邮袋','山下理袋台','山腰盖戳架','加开接袋台','升起山顶邮牌','袋袋抵达','漏袋','分身帮忙传递邮袋；袋子盖戳并越过坡顶后，把通行签留给上坡的下一袋。'),
 '1229':service(['西岸桥埠','桥上灯座','东岸花灯'],'灯线接点','近桥续灯台','远桥理线架','临时接灯','让玉兰灯沿江开放','灯线齐全','暗灯','桥上玉兰灯的两个花瓣要分岸接电。观察塔位的单、双编号，搭好一段再换岸。'),
 '1230':service(['冷窗','回温廊','暖色记录夹'],'展柜温标','近程读温台','冷窗风架','增一支记录笔','将温标夹进展册','温标齐全','缺签','这里是返回舱模型的冷暖展室。先留冷端记号，再等温标离开风口回稳。'),
 '1231':service(['导轨前梁','双承点廊','终站停靠线'],'浮梁承点','近梁校平台','远梁扶稳台','加一根平尺','让磁浮车模平稳入站','平尺无偏','漏点','悬浮车模的导轨两端高低不同；等同线两颗承点靠近再扶平，最后放车入站。'),
};
type Packet=WinterPacket&{id?:number};
interface Control{hits:number;reserve:number;focus:number;side:number;active:number}
export const tint=(p:Packet,n:number)=>(p.id??p.route)%n;
export function monthOperate(day:MonthendDay,c:Control,live:Packet[],total:(route:number)=>number){
 const r=(p:Packet)=>p.distance/total(p.route),deliver=(p:Packet)=>{p.work=0;c.hits++;};
 switch(day){
 case '1222':live.filter(p=>tint(p,2)===1-c.side).forEach(deliver);break;
 case '1223':for(const p of live){if(!c.reserve)break;c.reserve--;deliver(p);}break;
 case '1224':for(const p of live)if(Math.abs(r(p)-(c.focus%2?.68:.28))<=.18){p.distance=Math.max(0,p.distance-total(p.route)*.22);p.slow=2.9;c.hits++;}break;
 case '1225':{const a=live.find(p=>!tint(p,2)),b=live.find(p=>tint(p,2));if(a&&b){deliver(a);deliver(b);}break;}
 case '1226':{const p=live.find(p=>tint(p,3)===c.reserve);if(p){deliver(p);c.reserve=(c.reserve+1)%3;}break;}
 case '1227':live.filter(p=>Math.abs(r(p)-(c.side?.34:.64))<.14).forEach(deliver);break;
 case '1228':{const front=live.find(p=>p.lit&&r(p)>.45),rear=live.find(p=>r(p)<=.45);if(front&&rear){deliver(front);rear.lit=true;rear.work--;c.hits++;}break;}
 case '1229':{const bank=1+c.focus%2;if(c.reserve&&c.reserve!==bank&&live.length){deliver(live[0]);c.reserve=0;}else c.reserve=bank;break;}
 case '1230':live.filter(p=>p.lit&&p.slow<=0).forEach(deliver);break;
 case '1231':{const pair=live.flatMap((p,i)=>live.slice(i+1).filter(q=>q.route===p.route&&Math.abs(r(p)-r(q))<=.25).map(q=>[p,q]))[0];
   if(pair){const [a,b]=pair,d=(a.distance+b.distance)/2;a.distance=b.distance=d;deliver(a);deliver(b);}break;}
 }
}
export function monthBeam(day:MonthendDay,c:Control,kind:'water'|'wind',p:Packet){
 if(day==='1223'&&kind==='water')c.reserve=Math.min(3,c.reserve+1);
 if((day==='1228'||day==='1230')&&kind==='wind')p.lit=true;
 return 0;
}
export function monthCadence(day:MonthendDay,n:number){const pattern=Number(day)-1222;
 return {load:(pattern===7||pattern===8)&&n%4===1?1:0,spacing:n%(2+pattern%3)===0?.43:-.15,speed:.96+(n+pattern)%3*.045};
}

