import {defineRunner} from './types';
// 1936-11-12 旧金山—奥克兰海湾大桥通车。路线：奥克兰收费站 → 悬索桥面 → 芳草岛（Yerba Buena）隧道 → 旧金山桥头。
// 剧情为虚构的通车日小事；史实只取日期、桥名、路线和“当天通车”。
export default defineRunner({
  id: '1112-1936', template: 'runner', theme: 'sf-1936', seed: '1112-1936-a',
  title: '赶在剪彩前跑过大桥',
  intro: '1936 年 11 月 12 日，旧金山—奥克兰海湾大桥今天通车。剪彩就要开始，从奥克兰收费站出发，穿过桥面和芳草岛隧道，赶到旧金山桥头。',
  outro: '这一天，海湾大桥正式通车，比金门大桥还早半年。往返两岸的渡轮渐渐少了，旧金山湾从此有了一条跨海公路。',
  segments: ['toll', 'deck', 'tunnel', 'deck', 'arrival'],
  pickup: {name: '纪念彩带', count: 24, look: 'ribbon'},
  segmentNames: {toll: '奥克兰收费站', deck: '悬索桥面', tunnel: '芳草岛隧道', arrival: '旧金山桥头'},
  finish: {label: '冲过剪彩线', done: '彩带剪断，大桥通车了！', kind: 'ribbon'},
  souvenir: '通车纪念章',
});
