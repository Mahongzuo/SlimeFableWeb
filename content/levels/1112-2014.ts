import {defineLander} from './types';
/** Facts: docs/days/1112.md, https://www.planetary.org/articles/11120821-philae-has-landed
 * and https://spaceodysseyhub.com/tools/space-race-timeline/2014-11-12 .
 * 虚构：史莱姆外壳、喷气、阳光平台、科学数据收集路线、鸭形岩石奖励；地形与时间均为玩法缩尺。
 */
export default defineLander({
  id: '1112-2014', template: 'lander', theme: 'space', seed: '67p-agilkia-abydos',
  title: '菲莱，弹了两下才落地',
  intro: '2014年11月12日，菲莱来到67P彗星：对准Agilkia，在阴影吞没电池前找到阳光。',
  outro: '菲莱的两支鱼叉没有发射，弹跳两次后，约两小时才停在悬崖阴影里。阳光不足，它依靠电池工作约60小时，把科学数据传回了地球。你用史莱姆的身体，替它完成了这次想象中的旅程。',
  souvenir: '67P 彗星碎片', hiddenSouvenir: '鸭形彗星岩石',
  gravityScale: .05, descentSeconds: 30,
  battery: {capacity: 100, shadowDrain: .45, sunCharge: .8, jetCost: 3},
  sunlight: {period: 64, radius: 6.5, travel: 8},
  medals: {gold: 75, silver: 40},
  science: ['表面采样数据', '冰崖观测数据', '尘埃分析数据'],
});
