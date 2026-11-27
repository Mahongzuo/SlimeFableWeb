import {levels} from './levels/registry';
import type {GateGuide} from './gate-help';
import {newyearChapters} from '../src/templates/newyear-chapters';
import {newyearRelayMaps} from '../src/templates/newyear-skirmish';
import {isNewyearVoyage,newyearVoyages} from '../src/templates/newyear-voyage';
import {monthendChapters} from '../src/templates/monthend-chapters';
import {monthendRelayMaps} from '../src/templates/monthend-skirmish';
import {isMonthendVoyage,monthendVoyages} from '../src/templates/monthend-voyage';
import {yearendChapters} from '../src/templates/yearend-chapters';
import {yearendRelayMaps} from '../src/templates/yearend-skirmish';
import {isYearendVoyage,yearendVoyages} from '../src/templates/yearend-voyage';
import {midwinterChapters} from '../src/templates/midwinter-chapters';
import {winterChapters} from '../src/templates/winter-chapters';
import {midwinterRelayMaps} from '../src/templates/midwinter-skirmish';
import {isMidwinterVoyage,midwinterVoyages} from '../src/templates/midwinter-voyage';
import {winterRelayMaps} from '../src/templates/winter-skirmish';
import {isWinterVoyage,winterVoyages} from '../src/templates/winter-voyage';

const repairs={
 '1207':'云带还没进金框时不要急着曝光；等取景盘再转一圈，在对侧用选定的能力拍摄。',
 '1208':'折痕缺光时退回最后亮起的一小段，贴着折线向前走。直接绕到另一端不会压平纸张。',
 '1209':'逐步译读要等短灯亮起。并行送卡则要在输出端摊开，把灯槽蓄满再按 J。',
 '1210':'梭子在中间金线处才算穿过经线。漏穿时返回中央，从经线旁再走向对端。',
 '1211':'交接前要停在中间称重灯，等秤针落稳；还有空格就回秤台稍等。'
} as const;
export function winterHelp(id:string):GateGuide|undefined{
 const n=newyearChapters[id];
 if(n)return {title:n.title,steps:[...n.tasks.map(([,hint])=>hint),n.finishHelp],repair:n.repair,optional:n.optional};
 const c=midwinterChapters[id]??yearendChapters[id]??monthendChapters[id]??winterChapters[id];if(c)return {title:c.title,steps:[...c.tasks.map(([,hint])=>hint),c.finishHelp],repair:c.repair,optional:c.story==='garden'?'可以在水庭停留。献鹤即可留下素白和平纸鹤。':levels[id]?.template==='solstice'?'主机关完成即可通关。想带回本章纪念品，可在揭幕前跳起收齐八颗星尘。':'完成主机关即可领取纪念品。沿途藏签另记全收集成绩。'};
 const [day,kind]=id.split('-');
 if(kind==='skirmish'){
  const r=newyearRelayMaps[day]??monthendRelayMaps[day]??yearendRelayMaps[day]??midwinterRelayMaps[day]??winterRelayMaps[day];
  if(!r)return;
  return {title:r.name,steps:[r.lesson,'走进投射范围，Q 选环，用 G 投分身。触屏可直接点目标。',r.middle,'向「'+r.pads[3]+'」投出最后一团。'+r.end+'。'],
    repair:(newyearRelayMaps[day]?.repair??monthendRelayMaps[day]?.repair??yearendRelayMaps[day]?.repair??midwinterRelayMaps[day]?.repair??r.middle)+'　站偏了先走近重投。发生跌落可从本段继续。'};
 }
 if(kind==='rpg'){
  const v=isNewyearVoyage(day)?newyearVoyages[day]:isMonthendVoyage(day)?monthendVoyages[day]:isYearendVoyage(day)?yearendVoyages[day]:isMidwinterVoyage(day)?midwinterVoyages[day]:isWinterVoyage(day)?winterVoyages[day]:null;
  if(!v)return;
  const repair=isWinterVoyage(day)?repairs[day]:'repair' in v?v.repair:'';
  return {title:v.name,steps:[
   '到前方热身圈弹跳或摊开一次，按 F。到左或右能力圈按 F 选择「'+v.routes.join('」或「')+'」。',v.start,
   '依次完成「'+v.legs.join('」「')+'」。看上方的当前目标，根据所选路线用底部动作按钮或键盘 J 完成本段。',
   '三段结束，到尽头的光圈按 F，'+v.end+'。'],repair:day==='0102'?repair:repair+'　体力耗尽可从本段重试。'};
 }
}


export function touchHelpFor(id:string):string{
 const [day,kind]=id.split('-');
 if(!isMidwinterVoyage(day)&&!isYearendVoyage(day)&&!isMonthendVoyage(day)&&!isNewyearVoyage(day))return '';
 if(id==='0106-1903')return '轻点亮着的金圈，走进去后点底部「校稿」。左右各一次，再轻点前方金圈去合稿。';
 if(newyearChapters[id])return '轻点地面靠近展具，再点底栏对应的动作。需要切换属性、投出或回收分身时，使用本章底栏的同名按钮。';
 if(midwinterChapters[id]||yearendChapters[id]||monthendChapters[id])return '轻点地面走到机关旁，再点底栏的动作。攻略里的 F 是互动，C 是摊开或收身。';
 if(kind==='defense')return '先点布防工具，再点场景中的编号。操作本关机关时点工具栏里的专属按钮。';
 if(kind==='match')return '相邻两格可以依次轻点，也可以从第一格向第二格拖动。';
 if(kind==='skirmish')return '按住方向按钮移动。轻点亮环直接投分身，或用底栏选环、投出和回收。'+(['0109','0110'].includes(day)?'经过窄道时，长按「按住摊开」，再用另一根手指按方向。':'');
 if(kind==='rpg')return '点地面走位。底栏的「确认 F」负责选路线；弹跳、摊开和本关的专属动作各有按钮。';
 return '';
}
