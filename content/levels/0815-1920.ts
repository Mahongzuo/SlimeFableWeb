import {defineLevel} from './types';
// Chapter design: SlimeFable Docs/Maps/Days/08/0815_TodayInHistory_Design.md (1920 劳动界). Lines are placeholders
// until the Grok card rewrites them; facts limited to the date, the city and the weekly's purpose.
export default defineLevel({
  id: '0815-1920', template: 'explore-quest', theme: 'minguo-shanghai', seed: '0815-1920',
  title: '1920 · 《劳动界》创刊', intro: '1920 年 8 月 15 日，上海。写给工人看的周刊《劳动界》，就要印出来了。', outro: '创刊号送到工友手里了。这份周刊，是写给工人看的。',
  actors: {
    editor: {name: '陈编', slot: 'plaza-a', lines: ['手稿还没齐，里弄里再找找。', '齐了我们就开印。', '《劳动界》是写给工人看的周刊。'], done: '印好了，送到工友手里吧。', lock: {element: 0, hint: '印机要用水调墨 · 按 1 切换成水属性'}},
    worker1: {name: '码头工友', slot: 'lane', lines: ['码头歇脚，想看看写给我们的字。', '周刊是写给工人看的，对吗？', '我念给旁边的工友听。'], done: '谢谢，我念给大家听。'},
    worker2: {name: '纱厂工友', slot: 'plaza-b', lines: ['纱厂下了工，正好有空读。', '字印清楚些，我们就认得。', '这份周刊，像是说我们的事。'], done: '字印得真清楚。'},
    worker3: {name: '车夫', slot: 'yard', lines: ['我认字不多，听人念也行。', '拉完车，想带一份回家。', '灯下让邻居慢慢念。'], done: '收好了，晚上带回去。'},
  },
  items: {
    draft1: {name: '手稿', slot: 'alley'},
    draft2: {name: '手稿', slot: 'roof'},
    draft3: {name: '手稿', slot: 'cabinet'},
    copy: {name: '创刊号影印', slot: 'hidden'},
  },
  quest: {
    main: {title: '把创刊号送到工友手里', branches: [
      {type: 'collect', label: '收集手稿', targets: ['draft1', 'draft2', 'draft3']},
      {type: 'talk', label: '把稿子交给陈编开印', targets: ['editor']},
      {type: 'talk', label: '把创刊号交给工友', targets: ['worker1', 'worker2', 'worker3']},
    ]},
    side: {title: '找到创刊号影印', objective: {type: 'collect', label: '创刊号影印', targets: ['copy']}, souvenir: '创刊号影印'},
  },
  signs: ['茶馆', '裁缝铺', '南货店', '酱园', '布庄', '药铺'],
});
