import type {Jan01ChapterSpec} from './levels/types';
import type {DayMeta} from './types';
import {templateNames} from './types';

// 事实卡见 docs/days/0101.md。案头与立体书是为纪念这一天创作的虚构场景。
export const jan01Chapters: Jan01ChapterSpec[] = [
  {
    id: '0101-1864', template: 'jan01-seal', title: '印匣里的一尾虾',
    fact: '1864 年 1 月 1 日，画家、篆刻家齐白石出生。',
    source: 'https://www.capitalmuseum.org.cn/exhibition/604e72abc3d3455da15369e587c3d7e6',
    souvenir: '色版签条', palette: ['#e8d9b8', '#aa3427'],
    steps: ['在纸条上试印，观察缺角', '选好落款，让分身压住纸角', '本体登上印钮，亲手揭纸'],
    requiredAbilities: ['分身压纸', '登上印钮'], optionalAbilities: ['探索隐藏印面'],
  },
  {
    id: '0101-1823', template: 'jan01-book', title: '风把书翻到了哪一页',
    fact: '1823 年 1 月 1 日，裴多菲在基什克勒什受洗。这一天也被广泛纪念为他的生日。',
    source: 'https://pim.hu/en/exhibition/who-am-i-i-will-not-say-petofis-choices',
    souvenir: '高台测记', palette: ['#254965', '#dfad66'],
    steps: ['贴壁攀上书脊', '沿背风折痕攀行或借风滑翔', '踏下末页书签，让插画合拢'],
    requiredAbilities: ['贴壁攀登'], optionalAbilities: ['伞形滑翔', '拾取压花'],
  },
];

export const jan01Day: DayMeta = {
  day: '0101', theme: jan01Chapters[0].title,
  chapters: jan01Chapters.map(s => ({
    id: s.id, day: '0101', year: Number(s.id.slice(5)), event: s.fact, quest: s.title,
    steps: s.steps, souvenir: s.souvenir, template: s.template, era: templateNames[s.template],
    tone: 'bright', status: 'web', palette: s.palette,
  })),
};
