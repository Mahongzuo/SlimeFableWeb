import {DayMeta} from '../types';
// Source: SlimeFable Docs/Maps/Days/10/1001_MiniGames_Design.md (UE design, table order).
export const day1001: DayMeta = {day: '1001', theme: '五种玩法', chapters: [
  {id: '1001-1949', day: '1001', year: 1949, event: '开国大典', quest: '奔向天安门', steps: ['穿过胡同、屋脊、长安街、金水桥', '沿途收集红旗 0/28', '冲进终点，升起国旗'], souvenir: '礼炮纪念章', template: 'runner', era: 'prc-1949', tone: 'bright', status: 'web', palette: ['#d8433a', '#f2c14e']},
  {id: '1001-1969', day: '1001', year: 1969, event: '北京地铁一期通车', quest: '把断开的线路接通', steps: ['在步数内推好铁轨', '首班车开过每一站', '坐车穿过隧道'], souvenir: '一期线路车票', template: 'grid-push', era: 'prc-1960s', tone: 'bright', status: 'design', palette: ['#4f8a5b', '#d9cfa8']},
  {id: '1001-2010', day: '1001', year: 2010, event: '嫦娥二号发射', quest: '点火、上升、近月制动', steps: ['按节奏点火', '躲开云层和碎片', '一次制动进入环月轨道'], souvenir: '环月轨道徽章', template: 'ascent', era: 'space', tone: 'bright', status: 'design', palette: ['#26335c', '#f4d35e']},
  {id: '1001-1890', day: '1001', year: 1890, event: '优胜美地国家公园设立', quest: '把羊赶出山谷草甸', steps: ['驱散羊群', '避开熊的巡逻', '让鹿和兔子回到草地'], souvenir: '山谷明信片', template: 'herding', era: 'american-west', tone: 'bright', status: 'design', palette: ['#6c9a5a', '#e4c590']},
  {id: '1001-1958', day: '1001', year: 1958, event: 'NASA 成立', quest: '限时把 NACA 的文件吐进对应柜子', steps: ['吞下传送带上的文件', '分进兰利、艾姆斯、刘易斯和新 NASA', '在时间内完成'], souvenir: 'NASA 徽章', template: 'sort-rush', era: 'cold-war-usa', tone: 'bright', status: 'design', palette: ['#2f5fa7', '#e14b3b']},
]};
