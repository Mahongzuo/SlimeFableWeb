import {defineLevel} from './types';
// Chapter design: SlimeFable Docs/Maps/Days/08/0815_TodayInHistory_Design.md (1920 劳动界). Lines are placeholders
// until the Grok card rewrites them; facts limited to the date, the city and the weekly's purpose.
export default defineLevel({
  id: '0815-1920', template: 'explore-quest', theme: 'minguo-shanghai', seed: '0815-1920',
  title: '1920 · 《劳动界》创刊', intro: '1920 年 8 月 15 日，上海。一份写给工人看的周刊就要印出来了。', outro: '创刊号送到了工友手里。',
  actors: {
    editor: {name: '陈编', slot: 'plaza-a', lines: ['手稿还差几份，找齐了我们就开印。'], done: '印好了！把创刊号送到工友们手里吧。', lock: {element: 0, hint: '印机要用水调墨 · 按 1 切换成水属性'}},
    worker1: {name: '码头工友', slot: 'lane', lines: ['这份报纸写的是我们自己的事？'], done: '谢谢，我念给大家听。'},
    worker2: {name: '纱厂工友', slot: 'plaza-b', lines: ['下了工正好有空读一读。'], done: '字印得真清楚。'},
    worker3: {name: '车夫', slot: 'yard', lines: ['我认字不多，听人念也行。'], done: '收好了，晚上带回去。'},
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
  signs: ['印刷所', '茶馆', '杂货', '裁缝铺'],
});
