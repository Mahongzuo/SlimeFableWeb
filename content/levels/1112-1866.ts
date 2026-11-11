import {defineLevel} from './types';
// 1866-11-12 孙中山诞生于广东香山县翠亨村（今中山市）。父亲孙达成。剧情是虚构的村中小事，史实只取日期、地点和父亲的名字。
export default defineLevel({
  id: '1112-1866', template: 'explore-quest', theme: 'lingnan-1866', seed: '1112-1866',
  title: '1866 · 翠亨村的好消息', intro: '1866 年 11 月 12 日，广东香山县翠亨村。孙家要添一个孩子了，全村都在帮忙。', outro: '这天出生的男孩，后来叫孙文，也就是孙中山。翠亨村的人那时还不知道，他会改变整个中国。',
  actors: {
    midwife: {name: '接生阿婆', slot: 'plaza-b', lines: ['孙家那边要生了？我这就过去。', '先烧好热水，柴火要干的。', '别急，孩子会平平安安的。'], done: '水烧开了就好，剩下交给我。'},
    father: {name: '孙达成', slot: 'plaza-a', lines: ['我去村口看看阿婆来了没有。', '屋里要热水，柴房那边还有柴。', '谢谢你帮忙。'], done: '是个男孩！母子平安。', lock: {element: 2, hint: '灶膛要点火才能烧水 · 按 3 切换成火属性'}},
    neighbor1: {name: '隔壁阿伯', slot: 'lane', lines: ['孙家今天热闹啊。', '柴火？巷子里头好像有一捆。', '要帮忙尽管说。'], done: '好事！晚上来喝酒。'},
    neighbor2: {name: '塘边阿嫂', slot: 'yard', lines: ['我在塘边洗衣服，听说孙家要添丁。', '屋顶上晒着干柴，你上去看看。', '要是生了，记得告诉我。'], done: '母子平安就好！'},
  },
  items: {
    wood1: {name: '干柴', slot: 'alley'},
    wood2: {name: '干柴', slot: 'roof'},
    wood3: {name: '干柴', slot: 'cabinet'},
    tile: {name: '翠亨村瓦当', slot: 'hidden'},
  },
  quest: {
    main: {title: '帮孙家迎接新生儿', branches: [
      {type: 'talk', label: '请来村口的接生阿婆', targets: ['midwife']},
      {type: 'collect', label: '收集烧水的柴火', targets: ['wood1', 'wood2', 'wood3']},
      {type: 'talk', label: '把柴火交给孙达成，点火烧水', targets: ['father']},
    ]},
    side: {title: '找到翠亨村瓦当', objective: {type: 'collect', label: '翠亨村瓦当', targets: ['tile']}, souvenir: '翠亨村瓦当'},
  },
  signs: ['杂货铺', '米铺', '祠堂', '凉茶', '私塾', '药材'],
});
