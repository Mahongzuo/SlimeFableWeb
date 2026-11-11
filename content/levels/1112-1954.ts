import {defineLevel} from './types';
// 1954-11-12 埃利斯岛移民站关闭。最后一位离开的滞留者是挪威海员阿恩·彼得森（Arne Petersen）。其余人物与情节为虚构。
export default defineLevel({
  id: '1112-1954', template: 'explore-quest', theme: 'ellis-1954', seed: '1112-1954',
  title: '1954 · 埃利斯岛的最后一天', intro: '1954 年 11 月 12 日，纽约港埃利斯岛。这座移民站接待过一千二百多万人，今天就要关门了。还剩最后一位滞留者。', outro: '挪威海员彼得森登上渡轮，成了最后一个离开埃利斯岛的人。移民站从此关闭，后来改建成移民博物馆。',
  actors: {
    petersen: {name: '海员彼得森', slot: 'yard', lines: ['我的船早开走了，签证也过期了。', '听说今天可以走了？可我的行李还散在岛上。', '帮我找找吧：帽子、海员证、还有那只旧木箱。'], done: '终于有人来接我了！我的帽子、海员证和那只旧木箱还散在岛上。'},
    officer: {name: '移民官', slot: 'plaza-a', lines: ['今天是移民站最后一天。', '登记大厅明天就锁门了。', '最后一位，彼得森先生，他在院子里。'], done: '手续办好了。祝你好运，彼得森先生。'},
    captain: {name: '渡轮船长', slot: 'plaza-b', lines: ['这是今天最后一班渡轮。', '人到了就开船。', '去曼哈顿，十分钟。'], done: '上船吧，开船了！', lock: {element: 1, hint: '雾太大，渡轮看不清航道 · 按 2 切换成风属性吹散雾'}},
    nurse: {name: '护士', slot: 'lane', lines: ['医务室已经清空了。', '木箱？我在走廊尽头见过一只。', '这里以前每天要检查几千人。'], done: '一路平安。'},
  },
  items: {
    cap: {name: '海员帽', slot: 'alley'},
    papers: {name: '海员证', slot: 'roof'},
    trunk: {name: '旧木箱', slot: 'cabinet'},
    plate: {name: '登记大厅的旧铭牌', slot: 'hidden'},
  },
  quest: {
    main: {title: '送最后一位滞留者上岸', branches: [
      {type: 'talk', label: '找到挪威海员彼得森', targets: ['petersen']},
      {type: 'collect', label: '帮他找回行李', targets: ['cap', 'papers', 'trunk']},
      {type: 'talk', label: '把他送上渡轮', targets: ['captain']},
    ]},
    side: {title: '找到登记大厅的旧铭牌', objective: {type: 'collect', label: '登记大厅的旧铭牌', targets: ['plate']}, souvenir: '登记大厅的旧铭牌'},
  },
  signs: ['登记大厅', '医务室', '行李房', '餐厅', '电报', '宿舍'],
});
