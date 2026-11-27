import type {WinterPacket} from './winter-defense';

/** Miniature waterworks and observing desks. All traffic, timing and controls are fictional. */
export const midControls={
 '1212':{name:'提闸分水',guide:'水塔净化时向闸前水池存一格清水，最多三格。等沙团进渠再提闸，每格水冲淡一团；先让水池攒满可以同时处理三团。',ready:'分水闸待起',used:'清水下泄',color:'#93d6ca'},
 '1213':{name:'按下快门',guide:'飞掠相机只拍得到窗口内的目标。单号塔位对准前窗，双号塔位对准后窗。等目标滑入对应距离再按快门，命中的目标即刻留影。',ready:'相机待曝光',used:'快门已曝光',color:'#eac282'},
 '1214':{name:'移开落区阴影',guide:'风塔留下测距标记。等标记进入进路中段再开避障灯，它会移回落区边缘。水塔趁标记还亮着时可以快速把阴影扫净。',ready:'避障灯可用',used:'落区开始清扫',color:'#d4ca99'},
 '1215':{name:'交换取景位',guide:'先由月车取景，再由着陆器回拍。没有前照时，按键保留最前一团反光的底片；有底片时再次按键，找另一团完成配对。第二张没拍到就等下一批。',ready:'两部相机待命',used:'取景位已交换',color:'#dab575'},
 '1216':{name:'双星对时',guide:'等同一路线上出现一前一后两团信号再对时。它们会各退让一半距离差并减轻负载，只有一团时把这次操作留给下一对。',ready:'校时链路待用',used:'双星对时完成',color:'#bbd6c4'},
} as const;
export type MidDay=keyof typeof midControls;
export function isMidDay(day:string):day is MidDay{return Object.hasOwn(midControls,day);}
interface Control {focus:number;hits:number;reserve:number;active:number;}
export function midOperate(day:MidDay,c:Control,live:WinterPacket[],total:(route:number)=>number){
 if(day==='1212'){
   for(const p of live){if(!c.reserve)break;c.reserve--;p.work-=2;p.slow=1.6;c.hits++;}
 }else if(day==='1213'){
   const center=c.focus%2?.68:.30;
   for(const p of live)if(Math.abs(p.distance/total(p.route)-center)<.18){p.work=0;c.hits++;}
 }else if(day==='1214'){
   for(const p of live)if(p.lit&&p.distance/total(p.route)>.27){
     p.distance=Math.max(0,p.distance-total(p.route)*.24);p.slow=2.4;c.hits++;}
 }else if(day==='1215'){
   if(!c.reserve){
     const front=live.reduce<WinterPacket|undefined>((prev,p)=>!prev||p.distance>prev.distance?p:prev,undefined);
     if(front){front.lit=true;front.slow=2.8;c.reserve=1;c.hits++;}
   }else{
     const partner=live.find(p=>!p.lit);
     if(partner){partner.work=0;for(const p of live)if(p.lit)p.work=0;c.reserve=0;c.hits++;}
   }
 }else{
   const lead=live[0],tail=lead&&live.find(p=>p!==lead&&p.route===lead.route);
   if(lead&&tail){const mean=(lead.distance+tail.distance)/2;lead.distance=tail.distance=mean;
     lead.work--;tail.work--;lead.slow=tail.slow=1.7;c.hits+=2;}
 }
}
export function midBeam(day:MidDay,c:Control,kind:'wind'|'water',p:WinterPacket){
 if(day==='1212'&&kind==='water')c.reserve=Math.min(3,c.reserve+1);
 if(day==='1214'&&kind==='wind')p.lit=true;
 if(day==='1214'&&kind==='water'&&p.lit&&c.active>0)return 1.5;
 return 0;
}
export function midCadence(day:MidDay,n:number){
 switch(day){
 case '1212':return {load:n%3===2?1:0,spacing:n%3<2?-.31:.62,speed:1};
 case '1213':return {load:0,spacing:0,speed:n%3===2?1.19:.99};
 case '1214':return {load:n%4===1?1:0,spacing:0,speed:1};
 case '1215':return {load:0,spacing:n%2?-.52:.52,speed:1};
 case '1216':return {load:0,spacing:n%2?.65:-.65,speed:n%2?1.06:.96};
 }
}

