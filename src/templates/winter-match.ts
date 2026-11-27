import type {WinterDay} from './winter-defense';
export const winterMachines={
 '1207':{name:'两辆发射车的交班簿',stages:['纵向清开上午车位','先签上午回执，再横移午后交班牌','清开两辆车的离坪线','午后发射车已就位'],labels:['上午','午后'],hint:'中段先在上午牌竖消交回车位，再沿午后牌横消放行。暗框需等上一班签回；车架会按当前班次立起。'},
 '1208':{name:'黄河桥上的合龙口',stages:['先清出桥墩顶座','选择从哪一岸架梁','沿所选岸推进合龙口','列车驶过黄河'],labels:['西岸','东岸'],hint:'两岸的金框都能先架梁。先在西岸或东岸消除，余下合龙点会移到相应桥侧；终点沿梁面横消，将桥心接好。'},
 '1209':{name:'双级航迹轨道盘',stages:['纵向托起第一道航迹','纵向抬升，再横向展开星轨','分开两条星轨的接点','三星在轨道盘上展开'],labels:['升轨','展轨'],hint:'先沿竖纹消除，让轨道盘的第一层升起，第二层才有展开空间。再横向接通扇面。若一次交换让纵、横清除同时穿过两框，两层轨迹可以一起张开。'},
 '1210':{name:'书叶和奖章的展册',stages:['找出档案页的水色页签','用匹配元素装入书叶与手稿页','配好末页的两枚签，再装订','展册摊开，奖章亮起'],labels:['书叶','手稿'],hint:'金框上有元素名。让同一种元素在框中连成三枚，展架才收下这页。换错颜色可在本页重新配对，最后亲手装订。'},
 '1211':{name:'归航书箱的行李架',stages:['给书箱腾出书位','先竖放书脊，再横放稿夹','把最后两道绑带排齐','行李已放稳，箱盖扣合'],labels:['书脊','稿夹'],hint:'中段先在书脊格竖消，让书立稳。书本压下托板，稿夹随即下沉一行；跟着新的金框，从侧边横消把纸夹推入。封箱前按两个刻纹方向分别排好绑带。'},
} as const;
export function winterCell(day:WinterDay,x:number,y:number){
 if(y>=2&&y<=5)return true;
 switch(day){
 case '1207':return y===0||y===7?x===1||x===2||x===5||x===6:x>=1&&x<=6;
 case '1208':return y===6?x>0&&x<7:y===7?x===1||x===2||x===5||x===6:y===1||x===1||x===6;
 case '1209':return y===0?x>=2&&x<=5:y===7?x===3||x===4:x>0&&x<7;
 case '1210':return y===0||y===7?x!==0&&x!==7&&x!==3:x>0&&x<7;
 case '1211':return y===0?x===2||x===5:y===7?x>0&&x<7:true;
 }
}
export function winterGoals(day:WinterDay,stage:number,branch:number){
 if(day==='1211'&&stage===1&&branch===1)return [26,45];
 if(day==='1208'&&stage===2)return branch===2?[29,44]:[26,43];
 if(day==='1210')return [[27],[34,21],[26,37]][stage].slice();
 if(day==='1209')return [[27],[26,37],[34,21]][stage].slice();
 return [[27],[26,37],[26,29]][stage].slice();
}
export function winterAxis(day:WinterDay,stage:number,index:number):'row'|'column'|'either'{
 if(day==='1210'||day==='1208'&&stage===1)return 'either';
 if(day==='1208')return 'row';
 if(day==='1209'&&stage===2)return 'row';
 return index===0?'column':'row';
}
export function pageTone(stage:number,index:number){return [[0,1],[1,5],[0,3]][stage][index];}

