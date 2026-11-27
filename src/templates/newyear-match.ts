import {januaryMatches} from './january-match';
import type {NewyearDay} from './newyear-defense';
const machine=(day:NewyearDay,name:string,labels:[string,string],hint:string)=>({name,labels,hint,stages:januaryMatches[day]!.stages});
export const newyearMachines={
 '0102':machine('0102','木百叶之间的回声厅',['近席','远席'],'先让讲台金框泛起第一道回声。在空席两侧，近席的横纹要横消，远席的竖纹要竖消；末段先转近侧木叶，再将余声送进远廊。'),
 '0103':machine('0103','湖岸取景器里的极光双翼',['西翼','东翼'],'西翼收绿色风凝露，东翼收紫色雷凝露。中段任选一翼先亮，湖面最后一对倒影的左右配色随起手镜像。虹彩棋与条纹棋仍可帮助连通。'),
 '0104':machine('0104','木棚下的活动藤尖',['左叉','右叉'],'中段任选藤叉先接，先开的叉会改变上棚的纹路。左叉先行时，末段先横消再竖消；右叉先行则方向相反。两枝都抵顶，才可揭下枝纹。'),
 '0105':machine('0105','暗房里的转角长窗',['前窗','侧窗'],'中段长窗正面接横向连消，折到侧面的窗带接竖向连消，两面均可先行。一手产生两向连消同样能跨过转角。最后通过两只取景框把四层窗拼齐。'),
 '0106':machine('0106','两个半球之间的海湾',['西岸','东岸'],'中段先横移西岸，再纵向校正东岸。末段的拼口按相同次序合拢，错方向只消棋子，海岸会保留。'),
 '0107':machine('0107','从河面移过的取景窗',['岸柱','舟影'],'中段两个框可任选一个，让石柱或小舟先入取景窗。末段首框按所选方向横移或纵移，再接另一框。'),
 '0108':machine('0108','白木案上的六根弦',['低音弦','高音弦'],'中段低音横向接棕色物凝露，高音纵向接绿色风凝露。两种都入框以后，末段仍要按刻纹复调，然后对准弦桥。'),
 '0109':machine('0109','先穿横带再换纸面',['横带','纵带'],'第二段先沿横纹穿纸带，随后沿竖纹接住纵带。末段翻面，先纵再横。目标框旁的箭头指的是连成一排的方向。'),
 '0110':machine('0110','展开一张有门廊的街图',['街网','屋顶'],'中段先接街网或屋顶任意一边。先接街网，末段先横后竖；先接屋顶则先竖后横。展开前看清金框方向。'),
} as const;
export const newyearBranches=new Set<string>(['0103','0104','0107','0110']);
export function newyearCell(day:NewyearDay,stage:number,x:number,y:number){return januaryMatches[day]!.tableaux[stage].mask[y][x]==='.';}
export function newyearGoals(day:NewyearDay,stage:number){return januaryMatches[day]!.tableaux[stage].targets.slice();}
export function newyearAxis(day:NewyearDay,stage:number,index:number,branch=0):'row'|'column'|'either'{
 if((day==='0107'||day==='0110')&&stage===1)return 'either';
 if((day==='0107'||day==='0110')&&stage===2)return (index+(branch===2?1:0))%2?'column':'row';
 if(day==='0109')return (index+(stage===2?1:0))%2?'column':'row';
 if(day==='0103'||stage===1&&day==='0104')return 'either';
 if(day==='0104')return (index+(branch===2?1:0))%2?'column':'row';
 if(day==='0105')return (index+(stage===2?1:0))%2?'column':'row';
 return index%2?'column':'row';
}
export function newyearTone(day:string,stage:number,index:number,branch=0){
 if(day==='0108'&&stage>0)return [5,1][index];
 if(day==='0103'&&stage>0)return stage===2&&branch===2?[3,1][index]:[1,3][index];
}
export function newyearLabel(day:NewyearDay,stage:number,index:number,branch:number,axis:string){
 const tone=newyearTone(day,stage,index,branch),dir=axis==='row'?'↔':axis==='column'?'↕':'';
 return (tone===undefined?'':['水','风','火','雷','暗','物'][tone])+(stage===0?['讲台','中轴','根座','底片','岸线','取景','弦钮','纸头','折线'][Number(day)-102]:newyearMachines[day].labels[(index+(day==='0109'&&stage===2?1:0))%2])+dir;
}

