import type {YearendDay} from './yearend-defense';
export const yearendMachines={
 '1217':{name:'悟空号的晶条层架',stages:['点亮上层晶条','连着两步点亮纵横晶条','沿贯穿光迹读出下层','三层亮起同一道贯穿迹'],labels:['纵条','横条'],hint:'中段先点亮一层，紧接着在下一次交换里点亮另一层。纵条要竖消，横条要横消；隔一步没有接上就会在本层复位。'},
 '1218':{name:'月背样品的工程展册',stages:['按元素签找到第一层样格','任选岩样或图版先排入展柜','按所选页签补齐展册','工程展册合好封皮'],labels:['样格','图版'],hint:'金框上标着要收的元素。先填左侧样格或右侧图版会换出不同的末页配色；让相应颜色在框内消除后，再手动合册。'},
 '1219':{name:'外滩交易厅的开市钟',stages:['清开钟面中心轴','先校时轮，再拨分轮','对准左、右两块响板','铜锣随开市钟响起'],labels:['时轮','分轮'],hint:'先沿时轮竖纹接通传动轴，再用横向三连拨分轮。校时后留意两块响板不同的刻纹，接好它们才可亲手鸣锣。'},
 '1220':{name:'十六台机组的双岸机房',stages:['为第一排转轮送水','选择先送水的左岸或右岸','接通另一排的进水口','两排共十六轮转动'],labels:['左岸','右岸'],hint:'中段先接哪一岸，会决定余下机组的位置。终段优先给刚接入的对岸进水口通水，再接回出水槽；终点亲自开启两岸机组。'},
 '1221':{name:'空间站的折叠光翼',stages:['打开根部锁','依次松开翼根、翼中与翼尖','把两侧翼边对到刻线','折叠光翼完全展开'],labels:['内铰','外铰'],hint:'中段金框从里往外依次亮起。先在翼根横消，再在翼中竖消，最后在翼尖横消。提前消中的暗铰仍要等前一个锁放开，再重新对齐。'},
} as const;
export function yearCell(day:YearendDay,x:number,y:number){
 if(y>=1&&y<=6)return true;
 switch(day){case '1217':return (x+y)%3!==0;case '1218':return x>0&&x<7;case '1219':return x>=2&&x<=5;
 case '1220':return x%4!==3;case '1221':return x===1||x===3||x===4||x===6;}
}
export function yearGoals(day:YearendDay,stage:number,branch:number){
 if(day==='1218')return [[27],[26,37],branch===2?[29,44]:[26,43]][stage].slice();
 if(day==='1220')return [[27],[26,37],branch===2?[34,21]:[29,42]][stage].slice();
 if(day==='1221')return [[27],[25,29,43],[26,37]][stage].slice();
 return [[27],[26,37],[34,21]][stage].slice();
}
export function yearAxis(day:YearendDay,stage:number,index:number):'row'|'column'|'either'{
 if(day==='1218'||day==='1220'&&stage===1)return 'either';
 if(day==='1221')return index===1?'column':'row';
 if(day==='1217')return index===0?'column':'row';
 if(day==='1219')return (index+(stage===2?1:0))%2?'row':'column';
 return stage===2&&index===1?'column':'row';
}
export function yearTone(day:string,stage:number,index:number,branch=0){if(day==='1218')return [[5],[5,0],branch===2?[0,1]:[5,3]][stage][index];}
export function yearLabel(day:YearendDay,stage:number,index:number,branch:number,axis:string){
 const tone=yearTone(day,stage,index,branch),dir=axis==='row'?'↔':axis==='column'?'↕':'';
 if(tone!==undefined)return ['水','风','火','雷','暗','物'][tone]+(index===0?'样':'图');
 if(day==='1221'&&stage===1)return ['翼根','翼中','翼尖'][index]+dir;
 if(day==='1220'&&stage===2)return (index===0?'入水':'出水')+dir;
 if(day==='1219'&&stage===2)return (index===0?'左板':'右板')+dir;
 return yearendMachines[day].labels[index%2]+dir;
}

