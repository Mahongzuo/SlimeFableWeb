import type {MidDay} from './midwinter-defense';
export const midMachines={
 '1212':{name:'巴黎双页气候展板',stages:['认出第一枚水色页签','从两张气候图中先选五彩页签之一','用所选图例补上两张地图','展板和印记已拼合'],labels:['河流','林带'],hint:'把金框注明的同色元素消在框内。中段先消左图或右图决定最后两枚页签的颜色；拼好两图后亲手合拢接缝。'},
 '1213':{name:'携样回家的轨道桌',stages:['纵消松开月旁起航扣','从内弧与高弧中择一起笔','沿选中的转移弧对位','样品舱抵达地球侧'],labels:['内弧','高弧'],hint:'两条金弧都能先选。先点内弧，末段接通两个横向端点；先点高弧，末段只留一个竖向转移口。另一条路线可在练习里再走。'},
 '1214':{name:'江水拐弯的围堰沙盘',stages:['横接迎水面','先安竖向桩脚，再横向合堤','从两侧接好导流槽','江水流经模型导流槽'],labels:['桩脚','堤身'],hint:'先在有竖纹的桩脚消一列，才能在另一侧横向合堤。合堤后分清两处出口，余下两框清开才可手动转轮导流。'},
 '1215':{name:'给海空邮三线盖到埠戳',stages:['让首份凭证抵达港口','给海、空、邮三条线各送一枚凭证','连通两地的回执','三线到埠留戳'],labels:['航单','邮袋'],hint:'中段同时挂着海运、空运、邮路三枚金框，各有元素图例。按框上的色名送入对应凝露，顺序自选；送达一线，它的凭证便会留在展柜里。'},
 '1216':{name:'峰林间的桥隧行车盘',stages:['先打通西侧隧道','选桥口与洞口的会车方向','把列车引上选定的进站线','列车驶出峰林'],labels:['桥口','洞口'],hint:'中段先在桥口横消，列车走前侧高架；先在洞口纵消则沿后侧进站。末段接通对应路线的两端，在四个鸣笛标记上把列车送出峰林。'},
} as const;
export function midCell(day:MidDay,x:number,y:number){
 if(y>=1&&y<=6)return !(day==='1212'&&(x===3||x===4)&&y===4);
 switch(day){
 case '1212':return x>=1&&x<7;
 case '1213':return y===0?x===2||x===5:x>0&&x<7;
 case '1214':return y===7||x===4||x===5;
 case '1215':return x===1||x===3||x===5||x===6;
 case '1216':return y===0?x===1||x===2||x===6:x>0&&x<7;
 }
}
export function midGoals(day:MidDay,stage:number,branch:number){
 if(day==='1212')return [[18],[18,45],[17,46]][stage].slice();
 if(day==='1213')return [[27],[26,37],branch===2?[29]:[34,21]][stage].slice();
 if(day==='1215')return [[27],[25,29,43],[26,37]][stage].slice();
 if(day==='1216')return [[27],[26,37],branch===2?[29,44]:[26,43]][stage].slice();
 return [[27],[26,37],[34,21]][stage].slice();
}
export function midAxis(day:MidDay,stage:number,index:number,branch:number):'row'|'column'|'either'{
 if(day==='1212'||day==='1215')return 'either';
 if(day==='1213')return stage===0?'column':stage===1?'either':branch===2?'column':'row';
 if(day==='1214')return stage===1&&index===0||stage===2&&index===1?'column':'row';
 return index===0?'row':'column';
}
export function midTone(day:string,stage:number,index:number,branch=0):number|undefined{
 if(day==='1212')return [[0],[0,1],branch===2?[1,5]:[0,1]][stage][index];
 if(day==='1215')return [[0],[0,1,5],[1,5]][stage][index];
}
export function midLabel(day:MidDay,stage:number,index:number,branch:number,axis:string){
 const tone=midTone(day,stage,index,branch),dir=axis==='row'?'↔':axis==='column'?'↕':'';
 if(day==='1215'&&stage===1)return ['海水','空风','邮物'][index];
 if(tone!==undefined)return ['水','风','火','雷','暗','物'][tone]+'签';
 if(day==='1213'&&stage===2)return (branch===2?'高弧':'内弧')+dir;
 return midMachines[day].labels[index%2]+dir;
}

