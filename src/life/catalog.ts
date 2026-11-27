/** Every item the Home's casual loops hand out. Prices are in 贝壳 (shells). */
export type ItemKind = 'seed' | 'crop' | 'fish' | 'critter' | 'food' | 'bait' | 'artisan' | 'animal_product' | 'relic' | 'blueprint';
export interface ItemDef {id: string; name: string; kind: ItemKind; price: number; icon: string; desc: string}
const list: ItemDef[] = [];
const add = (kind: ItemKind, id: string, name: string, price: number, icon: string, desc: string) => list.push({id, name, kind, price, icon, desc});
// Resident species spotted by touch have their own journal entries.
export const RESIDENT_FISH = new Set(['fish-koi','fish-stream-trout']);
add('fish','fish-koi','锦鲤',0,'🐟','乳白与朱红的花鲤，在镜湖和荷塘成群游动。');
add('fish','fish-stream-trout','溪鳟',0,'🐟','鳞侧带着粉红色的细纹，常在河道缓流里摆尾。');
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
  /** Preferred season 0 春 1 夏 2 秋 3 冬 (grants +25% yield/speed bonus in season). */
  preferredSeason?: number;
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
  // Ported UE core element & Hub crops
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
  radish: {category: 'veg', plantStyle: 'root', preferredElement: 0, preferredSeason: 0, bodyColor: 0x6fae4f, accentColor: 0xe86f3c},
  tomato: {category: 'veg', plantStyle: 'bush', preferredElement: 0, preferredSeason: 1, bodyColor: 0x559845, accentColor: 0xe63f36},
  corn: {category: 'grain', plantStyle: 'tall', preferredElement: 5, preferredSeason: 1, bodyColor: 0x79ab42, accentColor: 0xf4c842},
  strawberry: {category: 'fruit', plantStyle: 'vine', preferredElement: 0, preferredSeason: 0, bodyColor: 0x4f9246, accentColor: 0xe83b56},
  sunflower: {category: 'flower', plantStyle: 'tall', preferredElement: 2, preferredSeason: 1, bodyColor: 0x61993e, accentColor: 0xf7c928},
  pumpkin: {category: 'fruit', plantStyle: 'vine', preferredElement: 5, preferredSeason: 2, bodyColor: 0x55873e, accentColor: 0xeb8424},
  lotus: {category: 'special', plantStyle: 'flower', preferredElement: 0, preferredSeason: 1, bodyColor: 0x44966e, accentColor: 0xf7b2cc},
  wisteria: {category: 'special', plantStyle: 'flower', preferredElement: 1, preferredSeason: 0, bodyColor: 0x558752, accentColor: 0xb889f0},
  ginkgo: {category: 'special', plantStyle: 'tall', preferredElement: 1, preferredSeason: 2, bodyColor: 0x8ea848, accentColor: 0xf5c842},
  starlight: {category: 'special', plantStyle: 'flower', preferredElement: 3, preferredSeason: 3, bodyColor: 0x428ea6, accentColor: 0xa8f5ff},
  chili: {category: 'special', plantStyle: 'bush', preferredElement: 2, preferredSeason: 1, waterSensitive: true, bodyColor: 0x4e8a3d, accentColor: 0xf2381f},
  mint: {category: 'special', plantStyle: 'leafy', preferredElement: 1, preferredSeason: 0, bodyColor: 0x45b884, accentColor: 0x9cf7cc},
  nightbloom: {category: 'special', plantStyle: 'flower', preferredElement: 4, preferredSeason: 3, bodyColor: 0x3f4c7a, accentColor: 0xc299ff},
  dewleaf: {category: 'special', plantStyle: 'leafy', preferredElement: 0, preferredSeason: 0, bodyColor: 0x3fa0a8, accentColor: 0x9deeff},
  carrot: {category: 'veg', plantStyle: 'root', preferredElement: 5, preferredSeason: 2, bodyColor: 0x5ca144, accentColor: 0xf27d24},
  cabbage: {category: 'veg', plantStyle: 'leafy', preferredElement: 0, preferredSeason: 3, bodyColor: 0x6db35b, accentColor: 0xaee38f},
  eggplant: {category: 'veg', plantStyle: 'bush', preferredElement: 4, preferredSeason: 2, bodyColor: 0x4e8a45, accentColor: 0x6f3296},
  watermelon: {category: 'fruit', plantStyle: 'vine', preferredElement: 0, preferredSeason: 1, bodyColor: 0x4b8740, accentColor: 0x2d7a3c},
  potato: {category: 'veg', plantStyle: 'root', preferredElement: 5, preferredSeason: 0, bodyColor: 0x669643, accentColor: 0xc49c62},
  blueberry: {category: 'fruit', plantStyle: 'bush', preferredElement: 0, preferredSeason: 1, bodyColor: 0x4a8255, accentColor: 0x4663d6},
  grape: {category: 'fruit', plantStyle: 'bush', preferredElement: 1, preferredSeason: 2, bodyColor: 0x568c44, accentColor: 0x8d42c7},
  cucumber: {category: 'veg', plantStyle: 'vine', preferredElement: 0, preferredSeason: 1, bodyColor: 0x549c48, accentColor: 0x3b8c3b},
  broccoli: {category: 'veg', plantStyle: 'leafy', preferredElement: 0, preferredSeason: 3, bodyColor: 0x448546, accentColor: 0x2f6b36},
  onion: {category: 'veg', plantStyle: 'root', preferredElement: 5, preferredSeason: 0, bodyColor: 0x6ea64b, accentColor: 0xb868a8},
  wheat: {category: 'grain', plantStyle: 'tall', preferredElement: 1, preferredSeason: 1, bodyColor: 0x96a844, accentColor: 0xf2cf5c},
  rice: {category: 'grain', plantStyle: 'tall', preferredElement: 0, preferredSeason: 2, bodyColor: 0x6ca848, accentColor: 0xe6d68a},
  rose: {category: 'flower', plantStyle: 'flower', preferredElement: 2, preferredSeason: 0, bodyColor: 0x4a8744, accentColor: 0xe6294b},
  lavender: {category: 'flower', plantStyle: 'flower', preferredElement: 1, preferredSeason: 1, waterSensitive: true, bodyColor: 0x5c8c5e, accentColor: 0x9a6be8},
  mushroom: {category: 'special', plantStyle: 'root', preferredElement: 4, preferredSeason: 2, bodyColor: 0xd9c7a8, accentColor: 0x945b36},
  tea: {category: 'grain', plantStyle: 'leafy', preferredElement: 1, preferredSeason: 0, bodyColor: 0x4d994c, accentColor: 0x99db74},
  coffee: {category: 'grain', plantStyle: 'bush', preferredElement: 4, preferredSeason: 1, waterSensitive: true, bodyColor: 0x437840, accentColor: 0x8f3424},
  cacao: {category: 'fruit', plantStyle: 'bush', preferredElement: 2, preferredSeason: 2, bodyColor: 0x4f823d, accentColor: 0x9c5529},
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

/** Fish catalog (original 10 + 18 ecological/seasonal & 4 legendary fish = 28 total). */
for (const [id, name, icon, price, desc] of [
  ['crucian', '鲫鱼', '🐟', 3, '最常见的湖鱼，咬钩很爽快。'],
  ['carp', '鲤鱼', '🐟', 5, '镜湖的老住户，力气不小。'],
  ['goby', '虾虎鱼', '🐟', 2, '港口石缝里的小家伙。'],
  ['mackerel', '鲭鱼', '🐟', 6, '跟着潮水进港的银色鱼群。'],
  ['catfish', '鲶鱼', '🐟', 8, '傍晚以后才出来活动。'],
  ['perch', '鲈鱼', '🐟', 7, '喜欢码头桩子的阴影。'],
  ['eel', '鳗鱼', '🐍', 12, '雨天会从湖底钻出来。'],
  ['golden-trout', '金鳟', '✨', 25, '只在清晨的镜湖出现。'],
  ['rainbow-trout', '彩虹鳟', '🌈', 20, '雨后天晴时最爱咬钩。'],
  ['history', '史书鱼', '📜', 40, '鳞片上印着今天的年份——只在有历史关卡的日子出现。'],
  // Expanded ecological & seasonal species
  ['loach', '溪涧泥鳅', '🐟', 4, '江南水巷石桥下灵活穿梭的小鱼。'],
  ['bitterling', '彩鳑鲏', '🐠', 7, '春日阳光下泛着蓝绿彩晕的江南小鱼。'],
  ['mandarin', '桃花鳜', '🐠', 16, '春溪桃花水涨时最肥美。'],
  ['sweetfish', '香鱼', '🐟', 14, '只栖息在清澈瀑布溪流中的名贵鱼。'],
  ['river-crab', '阳澄青蟹', '🦀', 18, '秋风起时沿芦苇岸潜行的肥美河蟹。'],
  ['sea-bream', '真鲷', '🐠', 15, '海岬深水区的红润海鱼。'],
  ['flying-fish', '银翼飞鱼', '🐟', 13, '夏日海面爱跃出水面的快泳手。'],
  ['squid', '星光鱿鱼', '🦑', 16, '入夜后在港口灯塔光晕下聚集。'],
  ['salmon', '回游鲑鱼', '🐟', 19, '秋日逆流跃向瀑布溪涧的强壮鱼群。'],
  ['lantern-fish', '灯笼鱼', '🐡', 22, '薄雾与深宵时刻微光闪烁的神秘鱼类。'],
  ['jade-carp', '翡翠锦鲤', '🐠', 28, '镜湖荷叶深处偶现的祥瑞锦鲤。'],
  ['moon-jelly', '月光水母', '🪼', 24, '宁静晴夜随海潮飘入港湾的透明水母。'],
  ['silver-herring', '冬潮青鳞', '🐟', 11, '冬季寒流里成群游动的银蓝小鱼。'],
  ['snow-char', '寒潭雪鳟', '❄️', 26, '落雪日里在瀑布冷潭跃动的冰色鳟鱼。'],
  // 4 Seasonal Legendary Fish Kings
  ['spring-koi', '春岚绯龙鲤（鱼王）', '🐉', 85, '【春季传说】只在春日水巷或镜湖薄雾/细雨中现身的百岁绯鲤。'],
  ['summer-marlin', '沧溟剑旗鱼（鱼王）', '⚔️', 95, '【夏季传说】夏日海岬深水区的极速霸主，拉扯极猛。'],
  ['autumn-sturgeon', '太湖玉鲟（鱼王）', '👑', 100, '【秋季传说】秋日镜湖深潭沉眠的古老巨鲟。'],
  ['winter-icefish', '霜华冰晶鱼（鱼王）', '💎', 90, '【冬季传说】冬雪时节在瀑布冰潭闪烁蓝光的稀世灵鱼。'],
] as const) add('fish', `fish-${id}`, name, price, icon, desc);

/** Critters (original 10 + 8 new wild encounter rare species). */
for (const [id, name, icon, desc] of [
  ['butterfly', '蝴蝶', '🦋', '花丛里慢慢飞，靠近要轻。'],
  ['dragonfly', '蜻蜓', '🪰', '贴着湖面巡逻。'],
  ['firefly', '萤火虫', '✨', '只在夜里的松果林发光。'],
  ['squirrel', '松鼠', '🐿️', '一有动静就往树上窜。'],
  ['hedgehog', '刺猬', '🦔', '跑得慢，但会缩成球。'],
  ['rabbit', '兔子', '🐇', '在林边草地上蹦。'],
  ['frog', '青蛙', '🐸', '湖边和雨天最多。'],
  ['ladybug', '瓢虫', '🐞', '停在农场的菜叶上。'],
  ['beetle', '甲虫', '🪲', '躲在树根下的落叶里。'],
  ['owl', '猫头鹰', '🦉', '夜里蹲在高处的树枝上。'],
  ['snow-fox', '月影雪狐', '🦊', '薄雾或雪夜偶现的银白灵狐，可驯服入住牧场。'],
  ['white-deer', '霜角白鹿', '🦌', '林间晨雾中的祥瑞白鹿，产出珍贵灵茸。'],
  ['golden-pheasant', '红腹锦鸡', '🦚', '梯田花丛间巡游的彩羽珍禽，产出金纹灵蛋。'],
  ['otter', '溪涧水獭', '🦦', '爱在镜湖与溪桥边翻找贝壳与河珠。'],
  ['crane', '丹顶仙鹤', '🦢', '雨后彩虹时降临莲池的优雅长腿候鸟。'],
  ['albatross', '银翼信天翁', '🕊️', '追随海岬灯塔微光盘旋的远洋海鸟。'],
  ['nine-deer', '敦煌九色鹿影', '🌟', '历史文化日偶现的秘境幻影，带来丰饶祝福。'],
  ['spirit-panda', '雪绒小熊猫', '🦝', '冬雪竹林中抱团取暖的稀有小熊猫。'],
] as const) add('critter', `critter-${id}`, name, 0, icon, desc);

/** Ranch Animal Products (harvested daily from adopted ranch animals & ponds). */
for (const [id, name, icon, price, desc] of [
  ['milk', '牧场鲜乳', '🥛', 14, '梅花鹿与白鹿清晨馈赠的香甜鲜乳，可入窑或制酪。'],
  ['egg', '金纹灵蛋', '🥚', 12, '牧舍羽禽产下的饱满鲜蛋，烘焙顶级点心必备。'],
  ['wool', '云朵软绒', '🧶', 16, '草甸野兔与小熊猫换季梳落的柔顺绒毛。'],
  ['truffle', '林间黑松露', '🍄', 34, '亲密度高的小动物在松果林泥土中刨出的稀世松露。'],
  ['bamboo-dew', '竹心清露', '🎋', 22, '绒尾小熊猫在竹林收集的清晨甘露。'],
  ['spring-dew', '温泉暖露', '♨️', 28, '悠闲水豚在露天温泉池泡澡时凝结的温润泉露。'],
  ['feather', '七彩灵羽', '🪶', 26, '丹顶仙鹤与翠鸟留下的虹光尾羽。'],
  ['pearl', '镜湖河珠', '🦪', 38, '溪涧水獭与稀世鱼塘偶得的莹润河珠。'],
  ['roe', '鲜鱼籽', '🟠', 18, '生态鱼塘每日产出的鲜活鱼籽，腌渍后价值翻倍。'],
  ['star-fur', '星光狐绒', '✨', 42, '月影雪狐在星夜留下的微光细绒。'],
] as const) add('animal_product', `prod-${id}`, name, price, icon, desc);

/** Artisan Processed Goods (2.5x–4x value over raw crops/fish/animal products!). */
for (const [id, name, icon, price, desc] of [
  ['flour', '水磨精面粉', '🌾', 16, '溪畔水磨坊细磨的小麦粉，烘焙窑核心原料。'],
  ['polished-rice', '江南晶米', '🍚', 18, '水磨去壳抛光的雪白精米，清香软糯。'],
  ['roast-coffee', '炭焙手冲咖啡', '☕', 48, '水磨现磨深烘咖啡，饮用或售卖皆为上品。'],
  ['longjing-tea', '明前龙井新茶', '🍵', 32, '临水炒茶坊火候精炒的翠绿香茗。'],
  ['wisteria-tea', '紫藤花韵茶', '🪻', 62, '紫藤花穗与嫩茶共焙的江南雅茶。'],
  ['starlight-tea', '星露冷萃茶', '🌟', 105, '以星露荧光花精制的顶级茶艺孤品。'],
  ['grape-wine', '水晶陈酿果酒', '🍷', 42, '凝露酿造桶发酵而成的琥珀果酒。'],
  ['berry-wine', '草莓蓝莓气泡酒', '🥂', 36, '果香浓郁的微醺浆果酿。'],
  ['pumpkin-ale', '金秋南瓜麦芽酒', '🍺', 78, '整颗南瓜入桶慢酿的醇厚季节佳酿。'],
  ['wild-honey', '百花野蜜', '🍯', 22, '庭院蜂箱采撷的香甜自然蜂蜜。'],
  ['lotus-honey', '青莲花蜜', '🪷', 48, '蜂箱毗邻青莲花田酿成的清雅莲蜜。'],
  ['star-honey', '星露花蜜', '✨', 92, '蜂箱临近星露花酿出的稀世发光蜜。'],
  ['cheese', '牧场手工奶酪', '🧀', 40, '鲜乳发酵而成的金黄醇香奶酪。'],
  ['smoked-fish', '果木熏鱼', '🐟', 34, '烘焙窑慢熏的港湾鲜鱼，保存风味且售价大涨。'],
  ['caviar', '琥珀鱼子酱', '🥫', 56, '生态鱼塘鲜鱼籽腌渍而成的珍馐。'],
  ['truffle-oil', '松露香油', '🍾', 88, '林间黑松露冷榨提纯的顶级料理圣品。'],
  ['sourdough', '柴火乡间面包', '🥖', 32, '水磨面粉与鲜蛋在烘焙窑中烤出的脆皮面包。'],
  ['silk-cloth', '云绒锦缎', '🧣', 46, '云朵软绒织就的暖软织物，深受港湾商船青睐。'],
] as const) add('artisan', `art-${id}`, name, price, icon, desc);

/** Historical Relics fished from treasure chests or drift bottles (donatable to Time Museum!). */
for (const [id, name, icon, price, desc] of [
  ['bronze-bell', '古铜编钟残片', '🔔', 45, '水底宝箱打捞出的青铜古乐残件，可捐入时光博物苑。'],
  ['celadon-shard', '秘色青瓷片', '🏺', 42, '温润如玉的越窑青瓷古片，见证江南水乡千年窑火。'],
  ['compass', '古船水罗盘', '🧭', 50, '锈迹斑斑却依然指南的远航罗盘。'],
  ['scroll', '漆匣星图残卷', '📜', 55, '记录古人观象授时的防水漆匣卷轴。'],
  ['astrolabe', '黄铜浑仪环', '🔭', 65, '工艺精妙的天文观测仪残环。'],
  ['jade-seal', '凝露古玉印', '💠', 70, '刻有“岁月拾光”篆文的古港信物。'],
] as const) add('relic', `relic-${id}`, name, price, icon, desc);

/** Cooked Foods (original 5 preserved verbatim + 19 new dishes = 24 total!). */
for (const [id, name, icon, price, desc] of [
  // Original 5 (must stay exact for existing tests!)
  ['corn-roast', '烤玉米', '🌽', 14, '火属性烤出来的，满港口都是香味。'],
  ['fish-soup', '番茄鱼汤', '🍲', 24, '鲫鱼和番茄一起炖。'],
  ['pumpkin-pie', '南瓜派', '🥧', 48, '一整个南瓜才做一块。'],
  ['berry-ice', '草莓冰沙', '🍧', 20, '风属性吹凉的。'],
  ['radish-salad', '萝卜沙拉', '🥗', 12, '清清爽爽。'],
  // 19 New Cookbook Dishes with Life Buffs
  ['carrot-soup', '奶油胡萝卜浓汤', '🥣', 28, '食用后 15 分钟内移动轻盈提速。'],
  ['chili-hotpot', '火辣松菇锅', '🥘', 36, '食用后 15 分钟内加工坊速度提升 25%。'],
  ['mint-tea-cake', '薄荷茶酥', '🧁', 34, '食用后 15 分钟内滑翔伞升力增强，滑得更远。'],
  ['lotus-porridge', '青莲晶米粥', '🍚', 42, '食用后 15 分钟内垂钓捕鱼绿框加宽 25%。'],
  ['fisherman-feast', '港湾渔夫拼盘', '🍣', 54, '食用后 15 分钟内垂钓绿框加宽且宝箱率翻倍。'],
  ['truffle-pasta', '松露奶酪意面', '🍝', 110, '食用后 15 分钟内稀兽遭遇率大幅提升。'],
  ['honey-toast', '花蜜厚吐司', '🍞', 52, '食用后 15 分钟内丰收好运，额外产果率上升。'],
  ['blueberry-tart', '蓝莓奶酪挞', '🥧', 58, '酸甜酥香，食用后加工坊效率提升。'],
  ['mocha-cake', '摩卡可可慕斯', '🍰', 74, '咖啡与可可的双重提神，移动与作业双提速。'],
  ['cabbage-roll', '鲜虾卷心菜卷', '🥬', 26, '家常鲜美，食用后钓鱼更稳。'],
  ['baked-potato', '奶酪焗薯', '🥔', 44, '热腾腾的拉丝奶酪焗马铃薯。'],
  ['watermelon-sorbet', '冰镇西瓜霜', '🍉', 38, '夏日解暑佳品，滑翔与移速小幅提升。'],
  ['steamed-mandarin', '清蒸桃花鳜', '🐟', 48, '江南名菜，食用后稀兽遭遇率提升。'],
  ['crab-roe-rice', '蟹黄晶米盖饭', '🦀', 62, '秋日顶级鲜味，食用后丰收好运。'],
  ['lavender-macaron', '薰衣草马卡龙', '🍬', 40, '花香四溢，食用后滑翔轻盈。'],
  ['rose-jam-bun', '玫瑰花蜜包', '🥐', 46, '窑烤酥皮包裹玫瑰花蜜。'],
  ['starlight-pudding', '星露布丁', '🍮', 128, '梦幻发光甜品，大幅提升稀兽与鱼王遭遇率。'],
  ['caviar-canape', '鱼子酱脆饼', '🍽️', 96, '宴会级珍馐，售价极高。'],
  ['autumn-mooncake', '桂月银杏月饼', '🥮', 68, '融合金叶银杏与莲蜜的节气限定茶点。'],
] as const) add('food', `food-${id}`, name, price, icon, desc);

/** Baits & Tackle */
add('bait', 'bait-worm', '蚯蚓饵', 1, '🪱', '普通鱼饵，略微缩短等咬钩时间。');
add('bait', 'bait-glow', '发光饵', 6, '💡', '稀有鱼与夜行鱼更容易上钩。');
add('bait', 'bait-element', '元素香饵', 8, '✨', '吸引宝箱与高价值季节鱼，并让鱼游动更平稳。');
add('bait', 'bait-chronicle', '岁月年轮饵', 12, '📜', '历史日专用珍稀饵，大幅提升史书鱼与古代遗物宝箱概率。');

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(list.map(i => [i.id, i]));

/**
 * Cooking recipes.
 * NOTE: Original 5 recipes kept first; new recipes never conflict with single-ingredient corn-roast
 * or nearest-strawberry test invariants in tests/life-cooking-requests.test.ts.
 */
export const RECIPES: {id: string; needs: Record<string, number>}[] = [
  {id: 'food-corn-roast', needs: {'crop-corn': 2}},
  {id: 'food-fish-soup', needs: {'fish-crucian': 1, 'crop-tomato': 2}},
  {id: 'food-pumpkin-pie', needs: {'crop-pumpkin': 1, 'crop-strawberry': 1}},
  {id: 'food-berry-ice', needs: {'crop-strawberry': 3}},
  {id: 'food-radish-salad', needs: {'crop-radish': 2, 'crop-tomato': 1}},
  // 19 new recipes
  {id: 'food-carrot-soup', needs: {'crop-carrot': 2, 'prod-milk': 1}},
  {id: 'food-chili-hotpot', needs: {'crop-chili': 2, 'crop-mushroom': 1}},
  {id: 'food-mint-tea-cake', needs: {'crop-mint': 2, 'art-flour': 1}},
  {id: 'food-lotus-porridge', needs: {'crop-lotus': 1, 'art-polished-rice': 1}},
  {id: 'food-fisherman-feast', needs: {'fish-carp': 1, 'fish-perch': 1, 'crop-onion': 1}},
  {id: 'food-truffle-pasta', needs: {'prod-truffle': 1, 'art-cheese': 1, 'art-flour': 1}},
  {id: 'food-honey-toast', needs: {'art-sourdough': 1, 'art-wild-honey': 1}},
  {id: 'food-blueberry-tart', needs: {'crop-blueberry': 3, 'art-cheese': 1}},
  {id: 'food-mocha-cake', needs: {'art-roast-coffee': 1, 'crop-cacao': 2, 'prod-egg': 1}},
  {id: 'food-cabbage-roll', needs: {'crop-cabbage': 2, 'fish-goby': 2}},
  {id: 'food-baked-potato', needs: {'crop-potato': 2, 'art-cheese': 1}},
  {id: 'food-watermelon-sorbet', needs: {'crop-watermelon': 1, 'crop-mint': 2}},
  {id: 'food-steamed-mandarin', needs: {'fish-mandarin': 1, 'crop-onion': 1, 'crop-dewleaf': 1}},
  {id: 'food-crab-roe-rice', needs: {'fish-river-crab': 1, 'art-polished-rice': 1}},
  {id: 'food-lavender-macaron', needs: {'crop-lavender': 2, 'prod-egg': 1}},
  {id: 'food-rose-jam-bun', needs: {'crop-rose': 2, 'art-flour': 1, 'art-wild-honey': 1}},
  {id: 'food-starlight-pudding', needs: {'crop-starlight': 1, 'prod-milk': 1, 'art-star-honey': 1}},
  {id: 'food-caviar-canape', needs: {'art-caviar': 1, 'art-sourdough': 1}},
  {id: 'food-autumn-mooncake', needs: {'crop-ginkgo': 1, 'art-lotus-honey': 1, 'art-flour': 1}},
];
