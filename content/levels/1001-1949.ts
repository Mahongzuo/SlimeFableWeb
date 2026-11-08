import {defineRunner} from './types';
// 1949-10-01 开国大典. UE design: 1001_MiniGames_Design.md (runner) — hutong → rooftops → Chang'an Avenue → Golden Water Bridges.
export default defineRunner({
  id: '1001-1949', template: 'runner', theme: 'beiping-1949', seed: '1001-1949-a',
  title: '奔向天安门',
  intro: '1949 年 10 月 1 日下午，北平城里的人都往天安门广场赶。开国大典三点开始，从胡同口出发，穿过屋脊和长安街，在礼炮响起前赶到金水桥。',
  outro: '下午三点，毛泽东在天安门城楼上宣告中华人民共和国中央人民政府成立。第一面五星红旗在广场上升起，礼炮齐鸣二十八响。',
  segments: ['hutong', 'roofs', 'avenue', 'bridge'],
  pickup: {name: '小红旗', count: 28},
  segmentNames: {hutong: '胡同', roofs: '屋脊', avenue: '长安街', bridge: '金水桥'},
  finish: {label: '赶到广场，看升旗', done: '赶上了！五星红旗正在升起'},
  souvenir: '礼炮纪念章',
  signs: ['大栅栏', '前门', '西四牌楼', '东单'],
});
