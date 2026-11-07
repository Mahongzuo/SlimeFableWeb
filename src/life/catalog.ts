/** Every item the Home's casual loops hand out. Prices are in 贝壳 (shells). Critters are released after catching: dex only. */
export type ItemKind = 'seed' | 'crop' | 'fish' | 'critter' | 'food' | 'bait';
export interface ItemDef {id: string; name: string; kind: ItemKind; price: number; icon: string; desc: string}
const list: ItemDef[] = [];
const add = (kind: ItemKind, id: string, name: string, price: number, icon: string, desc: string) => list.push({id, name, kind, price, icon, desc});
/** crop id → [name, icon, grow minutes, yield min, yield max, seed price, crop price] */
export const CROP_LIST: [string, string, string, number, number, number, number, number][] = [
  ['radish', '萝卜', '🥕', 3, 2, 3, 2, 4], ['tomato', '番茄', '🍅', 6, 2, 4, 3, 6], ['corn', '玉米', '🌽', 9, 1, 3, 4, 9],
  ['strawberry', '草莓', '🍓', 12, 3, 5, 5, 6], ['sunflower', '向日葵', '🌻', 15, 1, 2, 6, 16], ['pumpkin', '南瓜', '🎃', 20, 1, 1, 8, 30],
];
for (const [id, name, icon, , , , seed, crop] of CROP_LIST) { add('seed', `seed-${id}`, `${name}种子`, seed, '🌱', `种在梯田的地块里。`); add('crop', `crop-${id}`, name, crop, icon, `梯田里自己种的${name}。`); }
export const CROPS: Record<string, {seed: string; crop: string; growMs: number; yield: [number, number]}> = Object.fromEntries(CROP_LIST.map(([id, , , min, a, b]) => [`seed-${id}`, {seed: `seed-${id}`, crop: `crop-${id}`, growMs: min * 60_000, yield: [a, b]}]));
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
