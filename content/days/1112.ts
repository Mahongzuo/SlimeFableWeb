import {DayMeta} from '../types';
// 11/12 pilot day. Facts checked 2026-11-11 (Opus): Sun Yat-sen born 1866-11-12 in Cuiheng, Xiangshan (now Zhongshan);
// SF–Oakland Bay Bridge opened 1936-11-12; Ellis Island closed 1954-11-12 (last detainee: Norwegian seaman Arne Petersen);
// Voyager 1 closest approach to Saturn 1980-11-12; Philae landed on comet 67P 2014-11-12 and bounced twice.
export const day1112: DayMeta = {day: '1112', theme: '出发与抵达', chapters: [
  {id: '1112-1866', day: '1112', year: 1866, event: '孙中山诞生于广东香山翠亨村', quest: '翠亨村的好消息', steps: ['请来村口的接生阿婆', '收集烧水的柴火 0/3', '把好消息告诉孙达成'], souvenir: '翠亨村瓦当', template: 'explore-quest', era: 'qing-lingnan', tone: 'bright', status: 'web', palette: ['#5f8f5a', '#c9a46a']},
  {id: '1112-1936', day: '1112', year: 1936, event: '旧金山—奥克兰海湾大桥通车', quest: '赶在剪彩前跑过大桥', steps: ['穿过奥克兰收费站', '跨过桥面车流', '钻过芳草岛隧道', '冲到旧金山桥头'], souvenir: '通车纪念章', template: 'runner', era: 'usa-1930s', tone: 'bright', status: 'web', palette: ['#8a9aa6', '#e0a040']},
  {id: '1112-1954', day: '1112', year: 1954, event: '埃利斯岛移民站关闭', quest: '送最后一位滞留者上岸', steps: ['找到挪威海员彼得森', '帮他找回行李 0/3', '把他送上渡轮'], souvenir: '登记大厅的旧铭牌', template: 'explore-quest', era: 'usa-1950s', tone: 'solemn', status: 'web', palette: ['#a5553f', '#d8cdb6']},
  {id: '1112-1980', day: '1112', year: 1980, event: '旅行者 1 号飞掠土星', quest: '借土星的引力拍下光环', steps: ['调整航向进入弹弓轨道', '穿过光环缝隙', '拍下土卫六'], souvenir: '土星光环照片', template: 'flyby', era: 'space', tone: 'bright', status: 'design', palette: ['#1d2340', '#e8c27a']},
  {id: '1112-2014', day: '1112', year: 2014, event: '菲莱着陆器登陆 67P 彗星', quest: '在彗星上稳稳落地', steps: ['对准着陆点下降', '鱼叉没打响——弹跳中稳住', '找到有阳光的落脚处'], souvenir: '67P 彗星碎片', template: 'lander', era: 'space', tone: 'bright', status: 'design', palette: ['#2a2d33', '#d9d4c7']},
]};
