import {newyearMachines,newyearBranches,newyearCell,newyearGoals,newyearAxis,newyearLabel,newyearTone} from './newyear-match';
import {isNewyearDay} from './newyear-defense';
import {monthendMachines,monthBranches,monthCell,monthGoals,monthLabel,monthAxis,monthTone,monthLocked} from './monthend-match';
import {isMonthendDay} from './monthend-defense';
import {yearendMachines,yearCell,yearGoals,yearLabel,yearAxis,yearTone} from './yearend-match';
import {isYearendDay} from './yearend-defense';
import {midMachines,midCell,midGoals,midLabel,midAxis,midTone} from './midwinter-match';
import {isMidDay} from './midwinter-defense';
import {winterDay} from "./winter-defense";
import {winterMachines,winterCell,winterGoals,winterAxis,pageTone} from "./winter-match";
/** The five miniature machines and their load paths are fictional. */
export const matchMachines = {
 ...newyearMachines,...monthendMachines,...yearendMachines,...midMachines,...winterMachines,
 '1202':{name:'月样封存台',stages:['纵消提起钻芯','给横铲让出回转座','依次抽托，将月样入罐','取样罐已封口'],labels:['钻托','铲座'],hint:'竖向三连拔起钻芯，横向三连让铲斗回转。最后等铜色钻托抽出，再清铲座，封样罐才会合上。'},
 '1203':{name:'月面起飞台',stages:['给底盘校平','接连松开两侧脚锁','为上升器清出通道','月面发射台已让空'],labels:['左脚','右脚'],hint:'中段先松一只脚锁，再在下一次交换时松另一只。停在半途多走一步，平台会重新锁回，可当场调平再试。'},
 '1204':{name:'交叉光路桌',stages:['校亮入射光','横扫分光镜，纵扫接收镜','旋转末对镜把光送进探测器','光点出现在接收屏上'],labels:['分光','接收'],hint:'沿镜面边缘的小刻线连成三枚，照亮这一束光。两束光以相反方向进入；条纹合击可以一次校准交叉的两个镜座。'},
 '1205':{name:'志愿驿站的物资柜',stages:['认领第一张需求单','先装哪一辆配送车','按上次选择补齐末站物资','驿站完成交接'],labels:['水箱','暖包'],hint:'金框里标着需求的元素。让相同元素在框中连消即可装车。中段先装的车将决定下一站的配货位置。'},
 '1206':{name:'秦岭隧道剖面',stages:['横向掘通第一段','先立竖撑，再通横洞','接好两口的进路','银色列车穿过山岭'],labels:['掌子面','支护'],hint:'按刻线方向清除接点。弯道先纵向立支撑，随后横向打通掌子面。最后从两端分别清开，列车会穿过山体。'},
 '1127':{name:'龙骨下的滑道',stages:['涂净艉部滑道','支撑船首，先退艉楔','卸下中托与艏栓','船台空了'],labels:['艉楔','艏栓'],hint:'金框是受力点。先消去靠船尾的木楔，再卸下船首；暗框会在支撑移走后点亮。'},
 '1128':{name:'双幅雷达测绘台',stages:['横扫一条海岸','横扫北幅，纵扫南幅','交叉接齐拼缝','两幅回波已合拢'],labels:['岸线','拼缝'],hint:'沿框上的横纹或竖纹连消。横扫显出岸线，竖扫校正两幅的拼缝，条纹棋也能沿相应方向扫描。'},
 '1129':{name:'风中的回收场',stages:['顺伞绳收紧伞衣','顶住横风，再收伞绳','稳住两边吊带','返回舱已着地'],labels:['伞绳','风带'],hint:'纵向三连收伞绳，横向三连收风带。观察左侧伞舱的摆动；两边都收住才会平稳降下一层。'},
 '1130':{name:'塔架回转台',stages:['松开脐带','先退近臂，再转远臂','依次收起两层栈桥','塔臂全部撤离'],labels:['铰座','回转'],hint:'一段连消只能打开同层的一道锁。先沿铰座竖纹松锁，亮起横纹后清出转臂的净空。'},
 '1201':{name:'雪站进路盘',stages:['打通进站线','选择先拨哪条进路','沿选定道岔接通站台','列车抵达站台'],labels:['内线','外线'],hint:'中段两个道岔均可先开。先消左框走内线，先消右框走外线；末段金框会随进路换到对应股道。'}
} as const;
export type MatchDay=keyof typeof matchMachines;
export function isSeasonMatch(day:string):day is MatchDay{return Object.hasOwn(matchMachines,day);}
type BoardState={day:string;stage:number;targets:number[];branch?:number;turn?:number;levelHold?:number};
// Outer rows trace the silhouette. All contact and helper cells remain in
// the central working area; holes in a column are real gravity barriers.
export function machineCell(day:MatchDay,stage:number,x:number,y:number){
 if(isNewyearDay(day))return newyearCell(day,stage,x,y);
 if(isMonthendDay(day))return monthCell(day,x,y);
 if(isYearendDay(day))return yearCell(day,x,y);
 if(isMidDay(day))return midCell(day,x,y);
 if(winterDay(day))return winterCell(day,x,y);
 switch(day){
   case '1202':return y<2?x>=2&&x<=5:y>5?x>=1+(y-6)&&x<=6-(y-6):true;
   case '1203':return y===0||y===7?x===2||x===5:y<2||y>5?x>=1&&x<=6:true;
   case '1204':return y===0||y===7?x%3!==0:y<2||y>5?x>0&&x<7:true;
   case '1205':return y===0||y===7?x===1||x===2||x===4||x===5:y===1||y===6?x!==7:true;
   case '1206':return y<2?x>=2-y&&x<=5+y:y>5?x>0&&x<7:true;
   case '1127':return y<2?x>=1&&x<=6:y>5?x>=y-5&&x<=7-(y-5):true;
   case '1128':return y<2||y>5?x!==(stage===2?4:3)&&x!==7:true;
   case '1129':return y===0?x>=2&&x<=5:y===1?x>0&&x<7:y>5?x===2||x===5||y===6&&x>1&&x<6:true;
   case '1130':return y===0?x===2||x===3||x===5:y===1||y===6?x>0&&x<7:y===7?x===1||x===2||x===5||x===6:true;
   case '1201':return y===0||y===7?x===1||x===2||x===5||x===6:y===1||y===6?x>0&&x<7:true;
 }
}
export function machineGoals(day:MatchDay,stage:number,branch=0){
 if(isNewyearDay(day))return newyearGoals(day,stage);
 if(isMonthendDay(day))return monthGoals(day,stage,branch);
 if(isYearendDay(day))return yearGoals(day,stage,branch);
 if(isMidDay(day))return midGoals(day,stage,branch);
 if(winterDay(day))return winterGoals(day,stage,branch);
 if(day==='1202')return [[27],[34,21],[26,37]][stage].slice();
 if(day==='1203')return [[35],[26,37],[26,29]][stage].slice();
 if(day==='1204')return [[27],[26,37],[34,21]][stage].slice();
 if(day==='1205')return [[27],[26,37],branch===2?[29,44]:[26,43]][stage].slice();
 if(day==='1206')return [[27],[26,37],[26,29]][stage].slice();
 if(day==='1201'&&stage===2)return branch===2?[29,44]:[26,43];
 if(day==='1129')return [[26,37],[34,21],[26,45]][stage].slice();
 if(day==='1128')return [[27],[26,37],[34,21]][stage].slice();
 if(day==='1130')return [[27],[26,37],[34,21]][stage].slice();
 return [[26],[26,37],[34,29]][stage].slice();
}
export function machineAxis(day:MatchDay,stage:number,index:number,branch=0):'row'|'column'|'either'{
 if(isNewyearDay(day))return newyearAxis(day,stage,index,branch);
 if(isMonthendDay(day))return monthAxis(day,stage,index,branch);
 if(isYearendDay(day))return yearAxis(day,stage,index);
 if(isMidDay(day))return midAxis(day,stage,index,branch);
 if(winterDay(day))return winterAxis(day,stage,index);
 if(day==='1202')return index===0?'column':'row';
 if(day==='1203')return stage===2?'column':'either';
 if(day==='1204')return (index+stage)%2===0?'column':'row';
 if(day==='1206')return stage===1&&index===0?'column':'row';
 if(day==='1128')return (stage===2?1-index:index)===0?'row':'column';
 if(day==='1129')return index===0?'column':'row';
 if(day==='1130')return index===0?'column':'row';
 return 'either';
}
export function machineLocked(b:BoardState,i:number){
 return b.targets.length>1&&b.targets[0]!==i&&((['0102','0107','0110'].includes(b.day)&&b.stage===2)||b.day==='0106'&&b.stage>=1||b.day==='0109'&&b.stage>=1||monthLocked(b.day,b.stage)||b.stage===1&&['1207','1209','1211','1214','1219','1221'].includes(b.day)||b.day==='1220'&&b.stage===2||b.day==='1127'||b.day==='1130'||b.day==='1202'&&b.stage===2||b.day==='1206'&&b.stage===1);
}
export function contactLabel(day:MatchDay,stage:number,i:number,branch=0){
 const goals=machineGoals(day,stage,branch),index=goals.indexOf(i),axis=machineAxis(day,stage,index,branch);
 if(isNewyearDay(day))return newyearLabel(day,stage,index,branch,axis);
 if(isMonthendDay(day))return monthLabel(day,stage,index,branch,axis);
 if(isYearendDay(day))return yearLabel(day,stage,index,branch,axis);
 if(isMidDay(day))return midLabel(day,stage,index,branch,axis);
 if(day==='1210')return ['水','风','火','雷','暗','物'][pageTone(stage,index)]+'签';
 if(day==='1205')return ['水','风','火','雷','暗','物'][crateTone(stage,index)]+(index===0?'箱':'包');
 if(day==='1206'&&stage===1)return index===0?'支护↕':'掘进↔';
 if(day==='1206'&&stage===2)return index===0?'西洞↔':'东洞↔';
 return matchMachines[day].labels[Math.max(0,index)%2]+(axis==='row'?'↔':axis==='column'?'↕':'');
}
export function crateTone(stage:number,index:number){return [[0,1],[0,2],[1,5]][stage][index];}
export function machineContact(b:BoardState,hits:Set<number>,lines:number[][],rows:number[],cols:number[],move?:readonly number[],cells?:number[]){
 if(!isSeasonMatch(b.day))return;
 const day=b.day,goals=machineGoals(day,b.stage,b.branch),before=b.targets.slice();
 // A simultaneous vertical/horizontal burst can unfold both orbital layers in one wave.
 const contactAxis=(i:number,step:number)=>lines.some(line=>line.includes(i)&&line[1]-line[0]===step)||(step===1?rows.includes(i>>3):cols.includes(i%8));
 const joint=day==='1209'&&b.stage===1&&before.length===2&&before.every(i=>hits.has(i))&&contactAxis(goals[0],8)&&contactAxis(goals[1],1);
 const received=before.filter(i=>{
   if(!hits.has(i)||machineLocked(b,i)&&!joint)return false;
   const targetTone=newyearTone(day,b.stage,goals.indexOf(i),b.branch)??monthTone(day,b.stage,goals.indexOf(i),b.branch)??yearTone(day,b.stage,goals.indexOf(i),b.branch)??midTone(day,b.stage,goals.indexOf(i),b.branch);
   if(targetTone!==undefined&&cells&&(cells[i]<0||cells[i]===24||cells[i]%6!==targetTone))return false;
   if(day==='1210'&&cells&&(cells[i]<0||cells[i]===24||cells[i]%6!==pageTone(b.stage,goals.indexOf(i))))return false;
   if(day==='1205'&&cells&&(cells[i]===24||cells[i]<0||cells[i]%6!==crateTone(b.stage,goals.indexOf(i))))return false;
   const axis=machineAxis(day,b.stage,goals.indexOf(i),b.branch);
   if(axis==='either')return true;
   const step=axis==='row'?1:8;
   return contactAxis(i,step);
 });
 if((day==='1203'||day==='1217'||day==='1228')&&b.stage===1&&before.length===2&&received.length===1)b.levelHold=b.turn;
 if((newyearBranches.has(day)||monthBranches.has(day)||['1201','1205','1208','1212','1213','1216','1218','1220'].includes(day))&&b.stage===1&&!b.branch&&received.length){
   const thrown=move?.find(cell=>received.includes(cell))??received[0];
   b.branch=thrown===goals[0]?1:2;
 }
 b.targets=before.filter(i=>!received.includes(i));
 if(day==='1211'&&b.stage===1&&!b.branch&&received.includes(goals[0])){
   b.branch=1;b.targets=[45];
 }
}
