import {abilityRecords} from './ability-records';
import type {AbilityKind,AbilityMode,AbilitySpec} from './levels/types';
import type {ChapterMeta} from './types';

export const elementNames=['水','风','火','雷','暗','物'];
export const mechanics:Record<AbilityMode,{name:string;required:string[];steps:string[];souvenir:string}>={
  relay:{name:'检修桥',required:['瞄准投射分身','指定属性校验','主动回收分身'],steps:['把分身射上远端铜盘','趁桥面展开越过接缝','在远岸检测台校验属性','收回分身并启动终场'],souvenir:'双灯校验签'},
  circuit:{name:'双极台',required:['切换两种元素','摊开导通'],steps:['校准起点电极','走到另一组电极','换属性并摊开连接两极'],souvenir:'双极印记'},
  combo:{name:'共鸣庭',required:['指定元素攻击','近战连击'],steps:['走近共鸣木靶','选择指定属性','连续击中，接出第二段连击'],souvenir:'共鸣铜片'},
  climb:{name:'高架观测台',required:['贴壁攀登','指定元素激活'],steps:['推向高台立壁','贴壁攀升并翻上顶面','用指定元素点亮顶灯'],souvenir:'高台测记'},
  tide:{name:'浮标水道',required:['水属性浮游','属性切换校准'],steps:['携风校准岸边风标','切水属性进入水道','在水中通过两枚浮标','把样本送回岸台'],souvenir:'水纹采样签'},
  duet:{name:'双印庭',required:['瞄准投射分身','两团分身同时占位'],steps:['分别射中两侧印台','趁两盏灯同时亮起拾取三件藏品','回到仪式台完成交付'],souvenir:'双印拓片'},
};
const exhibits:Record<AbilityKind,[string,string]>={
  ink:['纸页校样','让印床压出这一页'],score:['乐谱','奏响终止和弦'],orbit:['观测底片','展开日月轨仪'],
  race:['计时签','点亮终点计时栏'],atelier:['展签','照亮展厅藏品'],span:['测绘图','展开桥身模型'],
  signal:['测绘记录','发出校验脉冲'],flight:['检修记录','启动发射演出'],field:['入场券','点亮赛场'],
  memorial:['白花','敲响和平钟'],
};
export function chapterSteps(s:AbilitySpec):string[]{
 if(s.kind==='memorial')return ['让两团分身分别点亮远端灯座','双灯亮起时，本体拾起三束白花','在祭台敲响和平钟'];
 const [item,finish]=exhibits[s.kind],element=elementNames[s.element];
 switch(s.mode){
 case 'relay':return ['把分身射上远端铜盘并保持占位','沿着检修桥过岸','用'+element+'属性接通检测台','收回分身，'+finish];
 case 'circuit':return ['用'+elementNames[(s.element+1)%6]+'属性校准起点','在终端切到'+element+'属性，摊开接通双极',finish];
 case 'combo':return ['用'+element+'属性击中舞台共鸣靶','接出第二段连击，取回'+item,finish];
 case 'climb':return ['攀上垂直观测台','用'+element+'属性校验'+item,finish];
 case 'tide':return ['用风属性校准岸标','切水属性，游过两枚浮标取得'+item,finish];
 case 'duet':return ['射出两团分身，同时点亮两侧印台','趁双灯亮起为'+item+'收集三枚印记',finish];
 }
}
export const abilityLevels:AbilitySpec[]=abilityRecords.map(([day,year,kind,title,fact,source,mode,element])=>({
  id:day+'-'+year,template:'ability',kind,title,fact,source,mode,element,souvenir:kind==='memorial'?'和平钟拓片':mechanics[mode].souvenir,
}));
export const abilityChapters:ChapterMeta[]=abilityLevels.map(s=>{
  const [day,year]=s.id.split('-');
  return {id:s.id,day,year:Number(year),event:s.fact,quest:s.title,steps:chapterSteps(s),souvenir:s.souvenir,template:s.template,era:mechanics[s.mode].name,tone:s.kind==='memorial'?'solemn':'bright',status:'web',palette:['#264451','#dda66b']};
});
