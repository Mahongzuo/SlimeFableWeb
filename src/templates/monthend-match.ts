import type {MonthendDay} from './monthend-defense';
type Axis='column'|'row'|'either';
const machine=(name:string,stages:[string,string,string,string],labels:[string,string],hint:string)=>({name,stages,labels,hint});
export const monthendMachines={
 '1222':machine('月面相机的双照夹',['取出第一张底片','调整双照横、纵夹','给对照照相框套准','双照落进同一镜框'],['左照','右照'],'中段左照竖向滑，右照横向滑。依金框上的箭头完成两次交换，末层方向互换；最后用套准柄合起双照。'),
 '1223':machine('双星分位的错层展架',['腾出底部支架','任选上架或下架先安放','接住余下的星模','双星显示各自层位'],['上架','下架'],'中段任选一个架位先接。先接的层位会改变剩余星模的固定点，末段先对准内侧支架，再扣住外缘。'),
 '1224':machine('邮轮一列暖舷窗',['点亮登船口','从艉舱到船中再到艏舱','接亮两座顶层舱','整列舷窗一起点亮'],['前舱','后舱'],'中层按艉舱、船中、艏舱依次送光。窄舱竖向接线，长舱横向接线；暗舱须等相邻舱点亮。'),
 '1225':machine('湖山之间的活动折页',['展开湖边页','选择桥页或隧页先展','按先展一页续接画面','山水画页连成一幅'],['桥页','隧页'],'让标明的水或物理凝露在金框里消去。选择先展桥景或隧景，会改变最后两页的画面和色签。'),
 '1226':machine('山水双线换轨票夹',['打通第一股道','在桂林侧或南线侧先扳道岔','接通对应换乘票夹','双线换乘票送抵终点'],['桂线','南线'],'中段任一换轨点先接都可。先拨的股道决定两张终点票的位置，随后横消收第一张、竖消收另一张。'),
 '1227':machine('星光投影下的沙盘经纬网',['接上第一枚投影点','分别校准横、纵两向','先锁经度再锁纬度','地面发光交点定位'],['经线','纬线'],'投影桌经线只接竖向三连，纬线只接横向三连。中段任选方向，末段先锁经度，之后才有可接的纬度。'),
 '1228':machine('逐面迎光的试验路',['把晨光放进首段路面','相接两步调整东、西受光面','接起末对路面电格','光斑从路面移到灯端'],['东面','西面'],'先竖消东面或横消西面，剩下的一面须在下一次有效交换中连上。错过可在当层重新接光。'),
 '1229':machine('三层套色地形印台',['压平地形底图','按低地、丘陵、山脊依次套色','补齐河流与高程签','三层压出同一片山河'],['河流','高程'],'低地用水、丘陵用风、山脊用物理凝露，按亮起的顺序套色。提前消中的框会在它轮到后重新开放。'),
 '1230':machine('京张两站的滑动票尺',['校准第一道尺线','选择老站或新站先验票','对齐相应里程的长短尺','两张车票在同一尺上对齐'],['老站','新站'],'任一站票都可先接。老站先验时用横纹读长尺，新站先验则以竖纹读长尺，另一枚接点随后用相反方向。'),
 '1231':machine('城乡暖窗的配光盘',['接通首盏窗灯','选择先送沿江或内陆','依次给三座城分配暖色窗灯','暖光沿线从西到东亮起'],['沿江','内陆'],'中段先接的一路决定末段三座城的窗色。最终先点西窗，再补中、东两格，依框标出的元素消除。'),
} as const;
export const monthBranches=new Set<string>(['1223','1225','1226','1230','1231']);
export function monthGoals(day:MonthendDay,stage:number,branch:number){
 if(stage===0)return [27];
 if(stage===1)return day==='1224'||day==='1229'?[25,29,43]:[26,37];
 if(day==='1231')return branch===2?[25,29,43]:[25,29,44];
 if(monthBranches.has(day))return branch===2?[29,44]:[26,43];
 return [34,21];
}
export function monthAxis(day:MonthendDay,stage:number,index:number,branch:number):Axis{
 if(day==='1225'||day==='1229'||day==='1231'||stage===1&&monthBranches.has(day))return 'either';
 if(day==='1222')return (index+(stage===2?1:0))%2?'row':'column';
 if(day==='1224')return index===1?'column':'row';
 if(day==='1227'||day==='1228')return index===0?'column':'row';
 if(day==='1230')return (index+(branch===2?1:0))%2?'column':'row';
 return index%2?'column':'row';
}
export function monthTone(day:string,stage:number,index:number,branch=0){
 if(day==='1225')return [[0],[0,5],branch===2?[5,1]:[0,3]][stage][index];
 if(day==='1229')return [[5],[0,1,5],[0,5]][stage][index];
 if(day==='1231'&&stage===2)return (branch===2?[2,1,3]:[3,2,5])[index];
}
export function monthLocked(day:string,stage:number){return stage===1&&['1224','1229'].includes(day)||stage===2&&['1223','1227','1231'].includes(day);}
export function monthCell(day:MonthendDay,x:number,y:number){if(y>=1&&y<=6)return true;
 const masks=[0x7e,0x5a,0x3c,0xbd,0x66,0xdb,0x7b,0x3e,0xee,0x76];return !!(masks[(Number(day)-1222+(y===7?3:0))%10]&(1<<x));}
export function monthLabel(day:MonthendDay,stage:number,index:number,branch:number,axis:Axis){
 const label=stage===1&&day==='1224'?['艉舱','船中','艏舱'][index]:stage===1&&day==='1229'?['低地','丘陵','山脊'][index]:stage===2&&day==='1231'?['西窗','中窗','东窗'][index]:monthendMachines[day].labels[index%2];
 const tone=monthTone(day,stage,index,branch);return (tone===undefined?'':['水','风','火','雷','暗','物'][tone])+label+(axis==='row'?'↔':axis==='column'?'↕':'');
}

