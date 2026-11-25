import type {ChronicleMode, ChronicleSpec} from './levels/types';
import type {ChapterMeta} from './types';
import {januaryChronicles} from './chronicle-january';
import {februaryChronicles} from './chronicle-february';
import {marchChronicles} from './chronicle-march';
import {octoberChronicles} from './chronicle-october';
import {novemberChronicles} from './chronicle-november';
import {decemberChronicles} from './chronicle-december';

export const chronicleModeLabels: Record<ChronicleMode, {era: string; required: string[]; steps: (s: ChronicleSpec) => string[]}> = {
  parkour: {
    era: '轻跑酷',
    required: ['跳跃越栏', '摊开钻低门'],
    steps: s => [`沿主题长廊越栏钻门`, `收集沿途「${s.relicName}」`, s.finaleLabel],
  },
  gather: {
    era: '庭院搜集',
    required: ['立体探索', '跳跃/摊开'],
    steps: s => [`在主题庭院寻访五枚「${s.relicName}」`, `阅读三段史事微笺`, s.finaleLabel],
  },
  relay: {
    era: '分身连线',
    required: ['瞄准投射分身', '属性切换校准'],
    steps: s => [`投射分身压住对岸铜盘升桥`, `切换对应属性点亮两座共鸣柱`, s.finaleLabel],
  },
  glide: {
    era: '乘风巡礼',
    required: ['滑翔伞缓降', '收集航标'],
    steps: s => [`自高台撑伞滑翔或沿步道缓行`, `穿过风环收集「${s.relicName}」`, s.finaleLabel],
  },
};

export const chronicleLevels: ChronicleSpec[] = [
  ...januaryChronicles,
  ...februaryChronicles,
  ...marchChronicles,
  ...octoberChronicles,
  ...novemberChronicles,
  ...decemberChronicles,
];

export const chronicleEntries: {slot: 1 | 2; chapter: ChapterMeta}[] = chronicleLevels.map(s => {
  const [day, yearStr] = s.id.split('-');
  const meta = chronicleModeLabels[s.mode];
  return {
    slot: s.slot,
    chapter: {
      id: s.id,
      day,
      year: Number(yearStr),
      event: s.fact,
      quest: s.title,
      steps: meta.steps(s),
      souvenir: s.souvenir,
      template: 'chronicle',
      era: `${s.region === 'cn' ? '中国' : '海外'} · ${meta.era}`,
      tone: s.tone,
      status: 'web',
      palette: s.palette,
    },
  };
});
