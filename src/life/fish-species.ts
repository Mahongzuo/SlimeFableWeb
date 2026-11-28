import { referenceFish } from './fish-reference';
import type { FishSpot } from './fishing';

export const waterNames = {
  lake: '湖泊',
  canal: '水巷',
  waterfall: '溪涧',
  harbor: '港湾',
  reef: '岛礁',
  offshore: '外海',
};
export const lures = [
  { name: '软木浮标', count: 0, attraction: 1, rare: 1 },
  { name: '柳叶旋片', count: 2, attraction: 1.25, rare: 1.3 },
  { name: '灯笼毛钩', count: 4, attraction: 1.4, rare: 1.85 },
];
export interface Species {
  id: string;
  name: string;
  water: FishSpot;
  min: number;
  max: number;
  trophy: number;
  shape: string;
  color: string;
  accent: string;
  pattern: string;
  rarity: string;
  phases?: string[];
  portrait?: string;
  rainBonus?: boolean;
}
type Real = [string, string, FishSpot, number, number, string, string, string, string];
const real: Real[] = [
  ['black-carp', '青鱼', 'lake', 48, 130, 'carp', '#36525a', '#aababc', 'scales'],
  ['grass-carp', '草鱼', 'canal', 35, 95, 'torpedo', '#72835e', '#d6d3a4', 'scales'],
  ['silver-carp', '鲢', 'lake', 30, 95, 'silver', '#90aab3', '#e3e9e5', 'silver'],
  ['bighead', '鳙', 'lake', 40, 120, 'bighead', '#586674', '#c0b6a1', 'spots'],
  ['topmouth', '翘嘴鲌', 'waterfall', 26, 85, 'jaw', '#728f9b', '#d5e9e3', 'silver'],
  ['blunt-bream', '团头鲂', 'lake', 18, 48, 'disc', '#718787', '#ded5ae', 'scales'],
  ['snakehead', '乌鳢', 'canal', 25, 80, 'longfin', '#4e5e40', '#b1ad75', 'spots'],
  ['yellow-catfish', '黄颡鱼', 'canal', 12, 33, 'cat', '#896c31', '#e5c354', 'bars'],
  ['northern-pike', '北方狗鱼', 'waterfall', 40, 125, 'pike', '#506b4c', '#d8cc8c', 'spots'],
  ['tench', '丁鱥', 'lake', 18, 58, 'tench', '#607042', '#c4aa5d', 'scales'],
  ['highfin', '胭脂鱼', 'waterfall', 22, 95, 'highfin', '#a58b71', '#392f37', 'bars'],
  ['pacu', '淡水白鲳', 'lake', 19, 60, 'pacu', '#8a9a9e', '#dd8b75', 'silver'],
  ['croaker', '大黄鱼', 'harbor', 18, 65, 'croaker', '#a38f51', '#f1c94f', 'gold'],
  ['ribbonfish', '带鱼', 'offshore', 70, 180, 'ribbon', '#a5c3d5', '#eaf6fe', 'silver'],
  ['pomfret', '银鲳', 'harbor', 16, 48, 'diamond', '#95acbd', '#f1f1df', 'silver'],
  ['flounder', '牙鲆', 'reef', 25, 82, 'flounder', '#807456', '#c6b994', 'spots'],
  ['turbot', '大菱鲆', 'reef', 25, 90, 'turbot', '#716752', '#ad9873', 'spots'],
  ['red-grouper', '赤点石斑鱼', 'reef', 22, 62, 'grouper', '#976553', '#f99b65', 'spots'],
  ['yellowfin', '黄鳍金枪鱼', 'offshore', 65, 185, 'tuna', '#355c76', '#edce45', 'gold'],
  ['skipjack', '鲣', 'offshore', 35, 86, 'bonito', '#385a76', '#a1c8cc', 'stripes'],
  ['dorado', '鬼头刀', 'offshore', 48, 165, 'dorado', '#319b91', '#e2ce48', 'spots'],
  ['swordfish', '剑鱼', 'offshore', 90, 250, 'sword', '#354f73', '#aec3da', 'silver'],
  ['lionfish', '蓑鲉', 'reef', 15, 38, 'lion', '#a94837', '#f1d4af', 'bars'],
  ['jack', '竹荚鱼', 'harbor', 14, 45, 'jack', '#417e7d', '#c5c6a7', 'stripe'],
];
const translations = [
  '苇岸鲈',
  '日辉蓝鳃鱼',
  '池塘镖鲈',
  '苔背牛头鲶',
  '溪纹红点鲑',
  '铜纹鳅',
  '湍流鲑',
  '灯笼鲤',
  '琥珀锦鲤',
  '绒夜鲶',
  '月纱玻璃鱼',
  '星河桨鲤',
];
const shapes = [
  'grouper',
  'disc',
  'torpedo',
  'cat',
  'torpedo',
  'longfin',
  'bonito',
  'carp',
  'carp',
  'cat',
  'diamond',
  'ribbon',
];
export const extraFish: Species[] = [
  ...referenceFish.map(
    (r, i): Species => ({
      id: 'fish-cove-' + r.id,
      name: translations[i],
      water: r.habitat === 'shallows' ? 'canal' : r.habitat === 'waterfall' ? 'waterfall' : 'lake',
      min: r.minCm,
      max: r.maxCm,
      trophy: r.trophyCm,
      shape: shapes[i],
      color: r.colorHex,
      accent: r.accentHex,
      pattern: r.pattern,
      rarity: r.rarity,
      rainBonus: !!r.rainBonus,
      phases: r.preferredPhases,
      portrait: 'ocean/fish/' + r.id + '.png',
    }),
  ),
  ...real.map(
    ([id, name, water, min, max, shape, color, accent, pattern]): Species => ({
      id: 'fish-' + id,
      name,
      water,
      min,
      max,
      portrait: 'ocean/fish/' + id + '.png',
      trophy: Math.round(max - (max - min) * 0.13),
      shape,
      color,
      accent,
      pattern,
      rarity: ['sword', 'lion', 'pike', 'highfin', 'tuna'].includes(shape) ? 'rare' : 'common',
    }),
  ),
];
export const speciesById = new Map(extraFish.map((s) => [s.id, s]));
