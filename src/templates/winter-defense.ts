/** Fictional observation desks, operated by the player during a live traffic wave. */
export const winterControls = {
 '1207':{name:'交班回传',guide:'风塔先给云团贴接力签。按交班键，优先把最靠近终点的已签云团送进接收站；其余签留给下一班。',ready:'回传天线就绪',used:'影像完成交班',color:'#e7bf72'},
 '1208':{name:'合测雪线',guide:'点过的单号塔位瞄向前半坡，双号塔位瞄向后半坡。等雪团走进瞄准的坡段再合测，照准的雪团会减速并减轻一格。',ready:'觇标待照准',used:'两线交会',color:'#abd6d4'},
 '1209':{name:'开启水门',guide:'风塔先把雾团引入航道，再开水门。引导过的雾团会滞留在水幕下，三秒内水塔遇到它就能一次扫净。',ready:'两列水门就绪',used:'水拱贯通',color:'#a4dfdb'},
 '1210':{name:'交换守望',guide:'两个观测器交替执勤，换班后，当前天区的噪点获得短暂滤波标记。水塔可快速处理被标记的噪点；另一半留给下一班。',ready:'守望台待交接',used:'天区已切换',color:'#f2c982'},
 '1211':{name:'截取云层',guide:'最后点过的塔位选取云层：单号近景、双号远景。按截取键保留所选层中的回波，风塔处理截取的回波时会向邻近一团传递标记。',ready:'成像窗待曝光',used:'云层已截取',color:'#b2d9e0'},
} as const;
export type WinterDay=keyof typeof winterControls;
export function winterDay(day:string):day is WinterDay{return Object.hasOwn(winterControls,day);}
export interface WinterPacket {distance:number;route:number;speed:number;slow:number;work:number;connected:boolean;lit?:boolean}
interface Desk {side:number;focus:number;hits:number;active:number}
export function operateWinter(day:WinterDay,desk:Desk,packets:WinterPacket[],length:(r:number)=>number){
 const fraction=(p:WinterPacket)=>p.distance/length(p.route);
 if(day==='1207'){
   const next=packets.filter(p=>p.lit).sort((a,b)=>fraction(b)-fraction(a))[0];
   if(next){next.work=0;desk.hits++;}return;
 }
 for(const packet of packets){
   if(day==='1209'&&packet.lit){packet.slow=2.6;desk.hits++;}
   if(day==='1208'&&(fraction(packet)>=.46)===!!(desk.focus%2)){packet.work--;packet.slow=3.5;desk.hits++;}
   if(day==='1210'&&packet.route%2===desk.side){packet.lit=true;desk.hits++;}
   if(day==='1211'&&(fraction(packet)>=.45)===!!(desk.focus%2)){packet.lit=true;desk.hits++;}
 }
}
export function winterBeam(day:WinterDay,desk:Desk,kind:'wind'|'water',packet:WinterPacket,neighbors:WinterPacket[]){
 if((day==='1207'||day==='1209')&&kind==='wind'){packet.lit=true;return 0;}
 if(!packet.lit)return 0;
 if(day==='1209'&&desk.active>0&&kind==='water'){desk.hits++;return packet.work;}
 if(day==='1210'&&kind==='water')return 1.5;
 if(day==='1211'&&kind==='wind'){
   const next=neighbors.find(other=>other!==packet&&!other.connected&&!other.lit&&other.route===packet.route&&Math.abs(packet.distance-other.distance)<5);
   if(next){next.lit=true;desk.hits++;}
   return 1;
 }
 return 0;
}
export function winterCadence(day:WinterDay,n:number){
 switch(day){
 case '1207':return {load:n%4===0?1:0,spacing:n%2?-.23:.23,speed:1};
 case '1208':return {load:0,spacing:0,speed:n%3===2?1.19:.96};
 case '1209':return {load:0,spacing:n%2?-.60:.60,speed:1.04};
 case '1210':return {load:n%3===2?1:0,spacing:n%3===1?-.43:.21,speed:1};
 case '1211':return {load:0,spacing:n%3<2?-.34:.68,speed:1};
 }
}

