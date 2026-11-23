import type {AlmanacSpec} from '../../content/levels/types';
import {rng} from './random';
export type Place=[number,number];
export function course(seed:string):Place[] {
  const random=rng(seed);
  return [[-6.6,1.4+random.range(-.9,1)], [random.range(-2.4,2.4),5+random.range(-1,1)], [6.3,random.range(.3,2.5)]];
}
export const timedWindow=(time:number, speed:number)=>.5+.46*Math.sin(time*speed);
export const aligned=(value:number,goal:number,tolerance=.14)=>Math.abs(value-goal)<=tolerance;
export const logicResult=(station:number,a:boolean,b:boolean)=>station===0?a&&b:station===1?a!==b:!a&&b;
export function activityHint(mode:AlmanacSpec['activity']) {
  switch(mode){
    case 'logic':return '拨动两路输入，让输出灯亮起，再锁存。';
    case 'aux':return '恢复仪表供电，按面板上的正确开关。';
    case 'hover':return '按住升力键上浮，松开下降，在金色高度带稳定悬停。';
    case 'dock':return '点火调整推力，将航迹稳在对接窗口。';
    case 'observe':return '旋转镜筒，将双线对准星标，然后曝光。';
    case 'align':return '转动旋钮，把光线调到金色刻线，再确认。';
    case 'tide':return '等浮标进入金色潮位带，按下松缆。';
    case 'beat':return '看光点经过拍线，踩准节拍。';
    case 'kick':return '瞄准游动的门洞，按下射门。';
    case 'pong':return '移动球拍，接住迎面弹来的光球。';
    case 'drive':return '提前发送驱动指令，等待探针移到采样标记。';
  }
}
