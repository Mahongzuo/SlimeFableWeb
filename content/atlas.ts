import type {DayMeta} from './types';
import type {AtlasKind,AtlasSpec} from './levels/types';
import {atlasRecords} from './atlas-records';
import {newyearChapters} from './chronicle-newyear';

type Edition = {name:string; colors:[string,string]; finale:string; souvenir:string};
export const editions:Record<AtlasKind,Edition> = {
  atelier:{name:'色彩陈列馆',colors:['#243e46','#ffada1'],finale:'装裱展签',souvenir:'色版签条'},
  orbit:{name:'星影观测台',colors:['#171e49','#aee4ff'],finale:'合拢观测光环',souvenir:'天象描图'},
  score:{name:'回声音乐厅',colors:['#3c213f','#ffc883'],finale:'奏响终止和弦',souvenir:'演奏谱签'},
  race:{name:'大奖赛道',colors:['#123c47','#ff915f'],finale:'点亮终点计时牌',souvenir:'压线计时条'},
  span:{name:'结构测绘廊',colors:['#3c3643','#f1be86'],finale:'合拢结构线',souvenir:'测线铜尺'},
  flight:{name:'航天发射港',colors:['#213a5b','#f8ba87'],finale:'发送飞行回执',souvenir:'任务轨迹卡'},
  field:{name:'逐光运动场',colors:['#193f37','#e8dd75'],finale:'点燃终点灯',souvenir:'分道号码布'},
  signal:{name:'信号工坊',colors:['#26354a','#8cddd0'],finale:'接通记录仪',souvenir:'示波描线'},
  ink:{name:'活字排印间',colors:['#40334a','#f4c08e'],finale:'印出最后一页',souvenir:'凹版书签'},
};
export const atlasDays:DayMeta[]=[];
export const atlasLevels:AtlasSpec[]=[];
for(const [day,year,kind,title,fact,source] of atlasRecords){
  const {name,colors,finale,souvenir}=editions[kind],id=day+'-'+year;
  atlasLevels.push({id,template:'atlas',kind,title,fact,source,souvenir});
  const room=newyearChapters[id];
  atlasDays.push({day,theme:title,chapters:[{id,day,year,event:fact,quest:title,steps:room?[...room.tasks.map(([step])=>step),room.last]:['沿光迹收集菱晶','弹跳越过横栏','摊开穿过低门',finale],souvenir,template:'atlas',era:room?.title??name,tone:'bright',status:'web',palette:colors}]});
}
