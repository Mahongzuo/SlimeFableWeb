/** Every item the Home's casual loops hand out. Prices are in 贝壳 (shells). Critters are released after catching: dex only. */
export type ItemKind = 'seed' | 'crop' | 'fish' | 'critter' | 'food' | 'bait';
export interface ItemDef {id: string; name: string; kind: ItemKind; price: number; icon: string; desc: string}
const list: ItemDef[] = [];
const add = (kind: ItemKind, id: string, name: string, price: number, icon: string, desc: string) => list.push({id, name, kind, price, icon, desc});
export type CropCategory = 'veg' | 'fruit' | 'grain' | 'flower' | 'special';
export type PlantStyle = 'leafy' | 'tall' | 'vine' | 'bush' | 'flower' | 'root';
export interface CropMeta {
  seed: string;
  crop: string;
  category: CropCategory;
  plantStyle: PlantStyle;
  /** 0 水 1 风 2 火 3 雷 4 暗 5 物 */
  preferredElement: number;
  /** Water-sensitive crops (chili, lavender, coffee) get washed away on a single water slash. */
  waterSensitive?: boolean;
  bodyColor: number;
  accentColor: number;
}

/** crop id → [name, icon, grow minutes, yield min, yield max, seed price, crop price] */
export const CROP_LIST: [string, string, string, number, number, number, number, number][] = [
  // Original 10 crops (IDs & balance preserved for save/test compatibility)
  ['radish', '萝卜', '🥕', 3, 2, 3, 2, 4],
  ['tomato', '番茄', '🍅', 6, 2, 4, 3, 6],
  ['corn', '玉米', '🌽', 9, 1, 3, 4, 9],
  ['strawberry', '草莓', '🍓', 12, 3, 5, 5, 6],
  ['sunflower', '向日葵', '🌻', 15, 1, 2, 6, 16],
  ['pumpkin', '南瓜', '🎃', 20, 1, 1, 8, 30],
  ['lotus', '青莲', '🪷', 10, 1, 2, 7, 18],
  ['wisteria', '紫藤花穗', '🪻', 14, 1, 2, 9, 24],
  ['ginkgo', '金叶银杏', '🍂', 16, 1, 2, 10, 28],
  ['starlight', '星露荧光花', '🌟', 18, 1, 2, 14, 42],
  // Ported UE core element & Hub crops (E:\UE\SlimeFable\Content\_Slime\Hub\Crops\DA_Crop_*)
  ['chili', '火辣椒', '🌶️', 7, 2, 4, 4, 8],
  ['mint', '清凉薄荷', '🌿', 5, 2, 4, 3, 6],
  ['nightbloom', '夜光花', '🌙', 14, 1, 2, 11, 32],
  ['dewleaf', '晨露叶', '💧', 8, 2, 3, 5, 11],
  ['carrot', '胡萝卜', '🥕', 4, 2, 4, 2, 5],
  ['cabbage', '卷心菜', '🥬', 6, 1, 3, 3, 8],
  ['eggplant', '紫茄子', '🍆', 9, 2, 3, 4, 10],
  ['watermelon', '大西瓜', '🍉', 18, 1, 2, 8, 28],
  ['potato', '马铃薯', '🥔', 5, 2, 4, 3, 6],
  ['blueberry', '蓝莓', '🫐', 10, 3, 5, 5, 7],
  ['grape', '水晶葡萄', '🍇', 13, 2, 4, 7, 13],
  ['cucumber', '脆黄瓜', '🥒', 6, 2, 3, 3, 7],
  ['broccoli', '西兰花', '🥦', 8, 1, 3, 4, 10],
  ['onion', '紫洋葱', '🧅', 5, 2, 4, 3, 6],
  ['wheat', '黄金小麦', '🌾', 7, 3, 5, 3, 5],
  ['rice', '水田稻米', '🌾', 8, 3, 5, 4, 6],
  ['rose', '红玫瑰', '🌹', 11, 1, 3, 6, 15],
  ['lavender', '薰衣草', '💐', 12, 2, 3, 6, 14],
  ['mushroom', '牛肝菌', '🍄', 9, 2, 3, 5, 12],
  ['tea', '嫩茶叶', '🍃', 10, 2, 4, 5, 11],
  ['coffee', '咖啡豆', '☕', 15, 2, 3, 8, 20],
  ['cacao', '可可豆', '🍫', 16, 2, 3, 9, 22],
];

const META_TABLE: Record<string, Omit<CropMeta, 'seed' | 'crop'>> = {
  radish: {category: 'veg', plantStyle: 'root', preferredElement: 0, bodyColor: 0x6fae4f, accentColor: 0xe86f3c},
  tomato: {category: 'veg', plantStyle: 'bush', preferredElement: 0, bodyColor: 0x559845, accentColor: 0xe63f36},
  corn: {category: 'grain', plantStyle: 'tall', preferredElement: 5, bodyColor: 0x79ab42, accentColor: 0xf4c842},
  strawberry: {category: 'fruit', plantStyle: 'vine', preferredElement: 0, bodyColor: 0x4f9246, accentColor: 0xe83b56},
  sunflower: {category: 'flower', plantStyle: 'tall', preferredElement: 2, bodyColor: 0x61993e, accentColor: 0xf7c928},
  pumpkin: {category: 'fruit', plantStyle: 'vine', preferredElement: 5, bodyColor: 0x55873e, accentColor: 0xeb8424},
  lotus: {category: 'special', plantStyle: 'flower', preferredElement: 0, bodyColor: 0x44966e, accentColor: 0xf7b2cc},
  wisteria: {category: 'special', plantStyle: 'flower', preferredElement: 1, bodyColor: 0x558752, accentColor: 0xb889f0},
  ginkgo: {category: 'special', plantStyle: 'tall', preferredElement: 1, bodyColor: 0x8ea848, accentColor: 0xf5c842},
  starlight: {category: 'special', plantStyle: 'flower', preferredElement: 3, bodyColor: 0x428ea6, accentColor: 0xa8f5ff},
  chili: {category: 'special', plantStyle: 'bush', preferredElement: 2, waterSensitive: true, bodyColor: 0x4e8a3d, accentColor: 0xf2381f},
  mint: {category: 'special', plantStyle: 'leafy', preferredElement: 1, bodyColor: 0x45b884, accentColor: 0x9cf7cc},
  nightbloom: {category: 'special', plantStyle: 'flower', preferredElement: 4, bodyColor: 0x3f4c7a, accentColor: 0xc299ff},
  dewleaf: {category: 'special', plantStyle: 'leafy', preferredElement: 0, bodyColor: 0x3fa0a8, accentColor: 0x9deeff},
  carrot: {category: 'veg', plantStyle: 'root', preferredElement: 5, bodyColor: 0x5ca144, accentColor: 0xf27d24},
  cabbage: {category: 'veg', plantStyle: 'leafy', preferredElement: 0, bodyColor: 0x6db35b, accentColor: 0xaee38f},
  eggplant: {category: 'veg', plantStyle: 'bush', preferredElement: 4, bodyColor: 0x4e8a45, accentColor: 0x6f3296},
  watermelon: {category: 'fruit', plantStyle: 'vine', preferredElement: 0, bodyColor: 0x4b8740, accentColor: 0x2d7a3c},
  potato: {category: 'veg', plantStyle: 'root', preferredElement: 5, bodyColor: 0x669643, accentColor: 0xc49c62},
  blueberry: {category: 'fruit', plantStyle: 'bush', preferredElement: 0, bodyColor: 0x4a8255, accentColor: 0x4663d6},
  grape: {category: 'fruit', plantStyle: 'bush', preferredElement: 1, bodyColor: 0x568c44, accentColor: 0x8d42c7},
  cucumber: {category: 'veg', plantStyle: 'vine', preferredElement: 0, bodyColor: 0x549c48, accentColor: 0x3b8c3b},
  broccoli: {category: 'veg', plantStyle: 'leafy', preferredElement: 0, bodyColor: 0x448546, accentColor: 0x2f6b36},
  onion: {category: 'veg', plantStyle: 'root', preferredElement: 5, bodyColor: 0x6ea64b, accentColor: 0xb868a8},
  wheat: {category: 'grain', plantStyle: 'tall', preferredElement: 1, bodyColor: 0x96a844, accentColor: 0xf2cf5c},
  rice: {category: 'grain', plantStyle: 'tall', preferredElement: 0, bodyColor: 0x6ca848, accentColor: 0xe6d68a},
  rose: {category: 'flower', plantStyle: 'flower', preferredElement: 2, bodyColor: 0x4a8744, accentColor: 0xe6294b},
  lavender: {category: 'flower', plantStyle: 'flower', preferredElement: 1, waterSensitive: true, bodyColor: 0x5c8c5e, accentColor: 0x9a6be8},
  mushroom: {category: 'special', plantStyle: 'root', preferredElement: 4, bodyColor: 0xd9c7a8, accentColor: 0x945b36},
  tea: {category: 'grain', plantStyle: 'leafy', preferredElement: 1, bodyColor: 0x4d994c, accentColor: 0x99db74},
  coffee: {category: 'grain', plantStyle: 'bush', preferredElement: 4, waterSensitive: true, bodyColor: 0x437840, accentColor: 0x8f3424},
  cacao: {category: 'fruit', plantStyle: 'bush', preferredElement: 2, bodyColor: 0x4f823d, accentColor: 0x9c5529},
};

const EL_NAMES = ['水', '风', '火', '雷', '暗', '物'] as const;
for (const [id, name, icon, , , , seed, crop] of CROP_LIST) {
  const m = META_TABLE[id];
  const affinity = m ? `喜${EL_NAMES[m.preferredElement]}属性${m.waterSensitive ? '·怕涝' : ''}` : '';
  add('seed', `seed-${id}`, `${name}种子`, seed, icon, `可种在梯田或自建农田中（${affinity}）。`);
  add('crop', `crop-${id}`, name, crop, icon, `家园里培育收获的新鲜${name}。`);
}
export const CROPS: Record<string, {seed: string; crop: string; growMs: number; yield: [number, number]}> = Object.fromEntries(CROP_LIST.map(([id, , , min, a, b]) => [`seed-${id}`, {seed: `seed-${id}`, crop: `crop-${id}`, growMs: min * 60_000, yield: [a, b]}]));
export const CROP_META: Record<string, CropMeta> = Object.fromEntries(
  CROP_LIST.map(([id]) => {
    const m = META_TABLE[id] ?? {category: 'veg' as CropCategory, plantStyle: 'leafy' as PlantStyle, preferredElement: 0, bodyColor: 0x6fae4f, accentColor: 0xffffff};
    return [`seed-${id}`, {seed: `seed-${id}`, crop: `crop-${id}`, ...m}];
  }),
);
/** fish id → name, icon, price, desc */
for (const [id, name, price, desc] of [
  ['crucian', '鲫鱼', 3, '最常见的湖鱼，咬钩很爽快。'], ['carp', '鲤鱼', 5, '镜湖的老住户，力气不小。'], ['goby', '虾虎鱼', 2, '港口石缝里的小家伙。'],
  ['mackerel', '鲭鱼', 6, '跟着潮水进港的银色鱼群。'], ['catfish', '鲶鱼', 8, '傍晚以后才出来活动。'], ['perch', '鲈鱼', 7, '喜欢码头桩子的阴影。'],
  ['eel', '鳗鱼', 12, '雨天会从湖底钻出来。'], ['golden-trout', '金鳟', 25, '只在清晨的镜湖出现。'], ['rainbow-trout', '彩虹鳟', 20, '雨后天晴时最爱咬钩。'],
  ['history', '史书鱼', 40, '鳞片上印着今天的年份——只在有历史关卡的日子出现。'],
] as const) add('fish', `fish-${id}`, name, price, '🐟', desc);
for (const [id, name, icon, desc] of [
  ['butterfly', '蝴蝶', '🦋', '花丛里慢慢飞，靠近要轻。'], ['dragonfly', '蜻蜓', '🪰', '贴着湖面巡逻。'], ['firefly', '萤火虫', '✨', '只在夜里的松果林发光。'],
  ['squirrel', '松鼠', '🐿️', '一有动静就往树上窜。'], ['hedgehog', '刺猬', '🦔', '跑得慢，但会缩成球。'], ['rabbit', '兔子', '🐇', '在林边草地上蹦。'],
  ['frog', '青蛙', '🐸', '湖边和雨天最多。'], ['ladybug', '瓢虫', '🐞', '停在农场的菜叶上。'], ['beetle', '甲虫', '🪲', '躲在树根下的落叶里。'], ['owl', '猫头鹰', '🦉', '夜里蹲在高处的树枝上。'],
] as const) add('critter', `critter-${id}`, name, 0, icon, desc);
for (const [id, name, icon, price, desc] of [
  ['corn-roast', '烤玉米', '🌽', 14, '火属性烤出来的，满港口都是香味。'], ['fish-soup', '番茄鱼汤', '🍲', 24, '鲫鱼和番茄一起炖。'],
  ['pumpkin-pie', '南瓜派', '🥧', 48, '一整个南瓜才做一块。'], ['berry-ice', '草莓冰沙', '🍧', 20, '风属性吹凉的。'], ['radish-salad', '萝卜沙拉', '🥗', 12, '清清爽爽。'],
] as const) add('food', `food-${id}`, name, price, icon, desc);
add('bait', 'bait-worm', '蚯蚓饵', 1, '🪱', '普通鱼饵。'); add('bait', 'bait-glow', '发光饵', 6, '💡', '稀有鱼更容易上钩。');
export const ITEMS: Record<string, ItemDef> = Object.fromEntries(list.map(i => [i.id, i]));
export const RECIPES: {id: string; needs: Record<string, number>}[] = [
  {id: 'food-corn-roast', needs: {'crop-corn': 2}}, {id: 'food-fish-soup', needs: {'fish-crucian': 1, 'crop-tomato': 2}},
  {id: 'food-pumpkin-pie', needs: {'crop-pumpkin': 1, 'crop-strawberry': 1}}, {id: 'food-berry-ice', needs: {'crop-strawberry': 3}},
  {id: 'food-radish-salad', needs: {'crop-radish': 2, 'crop-tomato': 1}},
];
