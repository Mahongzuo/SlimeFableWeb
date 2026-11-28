import {landscapeAssetUrl} from './architecture-assets';
import {propStructures} from '../world/linqi/prop-structures';
import {valleyHeight,riverLevel} from './waterway';
import {portalSlots, plazaCenter, quayPavilion, nativeLane} from './layout';
import type {Box, Vec} from '../slime/types';
import type {ExpandedTile, HomeBuildState, PlacedProp} from '../life/state';
import {isInsideHomeTerritory} from '../world/expansion';

export type BuildCategory = 'farm' | 'house' | 'plant' | 'facility';

export interface FarmBedSpec {
  rows: number;
  cols: number;
  soilOffsetY: number;
  noWeeds?: boolean;
  extraYield?: number;
}

export interface BuildItemDef {
  id: string;
  name: string;
  category: BuildCategory;
  /** Local GLB basename or 'procedural-*' for functional facilities & farm beds. */
  asset: string;
  thumb: string;
  icon: string;
  /** Footprint width/depth & collision height in metres (at scale 1). */
  width: number;
  depth: number;
  height: number;
  price: number;
  unlockLevel: number;
  /** Whether the placed prop generates a climbable/standable collision box. */
  solid: boolean;
  /** Can be placed in shallow lake/harbor water (lily, reeds, stilt house, watermill, tidal rocks). */
  waterAllowed?: boolean;
  /** If set, placing this prop dynamically spawns a real farmable plot in FarmRegistry. */
  farmBed?: FarmBedSpec;
  /** Habitat visitors that this item helps attract (shown as badges in Build UI). */
  attracts?: string[];
  /** Ecology tags read by habitat visitor attraction rules. */
  tags: string[];
  desc: string;
}

export interface PresetBlueprint {
  id: string;
  name: string;
  subtitle: string;
  unlockLevel: number;
  discountPrice: number;
  items: {itemId: string; dx: number; dz: number; yaw: number; scale?: number}[];
}

const thumb = (asset: string) => landscapeAssetUrl(asset, 'png');

export const BUILD_CATALOG: BuildItemDef[] = [
  // ---- Placeable Farm Beds (UE RaisedBed / Planter style) ----
  {
    id: 'farm-bed-wood', name: '木框高架农田', category: 'farm', asset: 'procedural-farm-wood', thumb: '', icon: '🌱',
    width: 2.6, depth: 1.9, height: 0.36, price: 8, unlockLevel: 1, solid: true,
    farmBed: {rows: 2, cols: 3, soilOffsetY: 0.27},
    tags: ['farm', 'garden'],
    desc: '经典木框种植床，放好即可种植全部 32 种 UE 作物并支持元素刀光交互。',
  },
  {
    id: 'farm-bed-stone', name: '石砌庭院花床', category: 'farm', asset: 'procedural-farm-stone', thumb: '', icon: '🧱',
    width: 3.4, depth: 2.3, height: 0.38, price: 16, unlockLevel: 2, solid: true,
    farmBed: {rows: 3, cols: 4, soilOffsetY: 0.31, noWeeds: true},
    tags: ['farm', 'garden', 'stone'],
    desc: '整洁青石高床，4×3 植株排布，自带防杂草护边。',
  },
  {
    id: 'farm-bed-large', name: '大型肥沃田垄', category: 'farm', asset: 'procedural-farm-large', thumb: '', icon: '🚜',
    width: 4.8, depth: 2.9, height: 0.36, price: 26, unlockLevel: 3, solid: true,
    farmBed: {rows: 3, cols: 5, soilOffsetY: 0.27, extraYield: 1},
    tags: ['farm', 'garden'],
    desc: '宽阔肥沃大农田，5×3 植株排布，每次收获额外 +1 产量！',
  },

  // ---- Buildings (DreamWorld curated) ----
  {
    id: 'build-thatch', name: '茅草小屋', category: 'house', asset: 'build-thatch', thumb: thumb('build-thatch'), icon: '🏡',
    width: 3.8, depth: 3.4, height: 3.0, price: 12, unlockLevel: 1, solid: true, attracts: ['草甸野兔'], tags: ['house', 'pasture'],
    desc: '朴素温暖的田园茅草屋，史莱姆可以爬上草顶晒太阳。',
  },
  {
    id: 'build-moon-gate', name: '江南月洞门', category: 'house', asset: 'build-moon-gate', thumb: thumb('build-moon-gate'), icon: '🏮',
    width: 3.2, depth: 1.0, height: 2.8, price: 14, unlockLevel: 1, solid: true, attracts: ['绒尾小熊猫'], tags: ['jiangnan', 'pavilion'],
    desc: '白墙圆洞庭院门，框住一院竹影与湖光。',
  },
  {
    id: 'pack-pavilion', name: '湖畔凉亭', category: 'house', asset: 'pack-pavilion', thumb: thumb('pack-pavilion'), icon: '⛩️',
    width: 3.6, depth: 3.6, height: 3.2, price: 18, unlockLevel: 1, solid: true, attracts: ['绒尾小熊猫'], tags: ['jiangnan', 'pavilion'],
    desc: '四面纳风的歇山小亭，配两丛翠竹就能吸引小熊猫来玩。',
  },
  {
    id: 'build-huizhou', name: '徽派民居', category: 'house', asset: 'build-huizhou', thumb: thumb('build-huizhou'), icon: '🏘️',
    width: 5.0, depth: 4.0, height: 4.2, price: 28, unlockLevel: 2, solid: true, tags: ['house', 'jiangnan'],
    desc: '马头墙青瓦白屋，与凝露港山坡古厝相映成趣。',
  },
  {
    id: 'build-teahall', name: '临水茶馆', category: 'house', asset: 'build-teahall', thumb: thumb('build-teahall'), icon: '🍵',
    width: 4.8, depth: 3.8, height: 3.8, price: 32, unlockLevel: 2, solid: true, attracts: ['紫藤赤狐', '悠闲水豚'], tags: ['house', 'jiangnan', 'tea'],
    desc: '二层木格茶楼，配紫藤与花丛常有水豚和赤狐来歇脚。',
  },
  {
    id: 'pasture-shelter', name: '牧场木棚', category: 'house', asset: 'pasture-shelter', thumb: thumb('pasture-shelter'), icon: '🛖',
    width: 4.2, depth: 3.2, height: 2.6, price: 22, unlockLevel: 2, solid: true, attracts: ['林间梅花鹿', '草甸野兔'], tags: ['pasture'],
    desc: '林缘草甸的避雨木棚，配合树木会吸引梅花鹿与野兔。',
  },
  {
    id: 'pack-greenhouse', name: '玻璃温室', category: 'house', asset: 'pack-greenhouse', thumb: thumb('pack-greenhouse'), icon: '🌿',
    width: 4.6, depth: 3.6, height: 3.2, price: 38, unlockLevel: 3, solid: true, attracts: ['紫藤赤狐'], tags: ['garden', 'greenhouse'],
    desc: '晶莹透亮的育苗花房，能提升家园培育效率并点亮稀有种苗。',
  },
  {
    id: 'waterside-stilt-house', name: '水岸吊脚楼', category: 'house', asset: 'waterside-stilt-house', thumb: thumb('waterside-stilt-house'), icon: '🏠',
    width: 4.2, depth: 3.6, height: 3.6, price: 34, unlockLevel: 3, solid: true, waterAllowed: true, attracts: ['悠闲水豚'], tags: ['jiangnan', 'water'],
    desc: '可架设在镜湖浅水边的水乡木楼。',
  },
  {
    id: 'build-covered-bridge', name: '江南廊桥', category: 'house', asset: 'build-covered-bridge', thumb: thumb('build-covered-bridge'), icon: '🌉',
    width: 5.8, depth: 2.6, height: 3.0, price: 42, unlockLevel: 4, solid: true, waterAllowed: true, tags: ['jiangnan', 'water', 'bridge'],
    desc: '飞檐木廊桥，可跨越浅水与小径。',
  },
  {
    id: 'watermill', name: '溪畔水磨坊', category: 'house', asset: 'watermill', thumb: thumb('watermill'), icon: '⚙️',
    width: 4.6, depth: 3.8, height: 3.6, price: 45, unlockLevel: 4, solid: true, waterAllowed: true, attracts: ['白喉河乌'], tags: ['water', 'watermill'],
    desc: '水轮慢转的溪畔石磨坊，水边安置可吸引白喉河乌。',
  },
  {
    id: 'pack-windmill', name: '田园大风车', category: 'house', asset: 'pack-windmill', thumb: thumb('pack-windmill'), icon: '🌀',
    width: 4.0, depth: 4.0, height: 6.2, price: 48, unlockLevel: 5, solid: true, tags: ['pasture', 'landmark'],
    desc: '高耸的风车地标，爬到顶再撑滑翔伞能滑翔俯瞰整座凝露港！',
  },
  {
    id: 'build-lighthouse', name: '海岬灯塔', category: 'house', asset: 'build-lighthouse', thumb: thumb('build-lighthouse'), icon: '🗼',
    width: 3.6, depth: 3.6, height: 7.2, price: 58, unlockLevel: 5, solid: true, attracts: ['海岬海鸥'], tags: ['coast', 'lighthouse', 'landmark'],
    desc: '眺望潮汐的白色灯塔，与岸边一起吸引海鸥盘旋。',
  },
  {
    id: 'build-red-pagoda', name: '朱红宝塔', category: 'house', asset: 'build-red-pagoda', thumb: thumb('build-red-pagoda'), icon: '🏯',
    width: 4.4, depth: 4.4, height: 7.8, price: 68, unlockLevel: 6, solid: true, tags: ['jiangnan', 'landmark'],
    desc: '三层朱檐宝塔，家园最高观景地标与极佳的滑翔伞起跳台。',
  },

  // ---- Plants & Landscape (DreamWorld curated) ----
  {
    id: 'nature-bamboo', name: '翠竹丛', category: 'plant', asset: 'nature-bamboo', thumb: thumb('nature-bamboo'), icon: '🎋',
    width: 2.0, depth: 2.0, height: 3.2, price: 6, unlockLevel: 1, solid: false, attracts: ['绒尾小熊猫', '林间梅花鹿'], tags: ['tree', 'bamboo', 'jiangnan'],
    desc: '清风拂过的青翠竹林，种两丛配凉亭即可引来小熊猫。',
  },
  {
    id: 'nature-willow', name: '水岸垂柳', category: 'plant', asset: 'nature-willow', thumb: thumb('nature-willow'), icon: '🌳',
    width: 3.6, depth: 3.6, height: 4.0, price: 10, unlockLevel: 1, solid: true, attracts: ['碧羽翠鸟', '林间梅花鹿'], tags: ['tree', 'water', 'jiangnan'],
    desc: '轻垂丝条的柳树，水岸栽种最招翠鸟青睐。',
  },
  {
    id: 'waterside-lily', name: '睡莲丛', category: 'plant', asset: 'waterside-lily', thumb: thumb('waterside-lily'), icon: '🪷',
    width: 1.5, depth: 1.5, height: 0.3, price: 5, unlockLevel: 1, solid: false, waterAllowed: true, attracts: ['青莲池蛙', '碧羽翠鸟'], tags: ['water', 'lily', 'flower'],
    desc: '浮在镜湖水面或岸边的翠叶睡莲，池蛙最爱的落脚点。',
  },
  {
    id: 'waterside-reeds', name: '水边芦苇', category: 'plant', asset: 'waterside-reeds', thumb: thumb('waterside-reeds'), icon: '🌾',
    width: 1.8, depth: 1.8, height: 1.4, price: 5, unlockLevel: 1, solid: false, waterAllowed: true, attracts: ['青莲池蛙', '碧羽翠鸟'], tags: ['water', 'reeds'],
    desc: '随风起伏的滨水芦苇荡，和睡莲一起构成池蛙与翠鸟栖地。',
  },
  {
    id: 'nature-fern', name: '林间蕨丛', category: 'plant', asset: 'nature-fern', thumb: thumb('nature-fern'), icon: '🌿',
    width: 1.4, depth: 1.4, height: 0.7, price: 4, unlockLevel: 1, solid: false, tags: ['plant', 'forest'],
    desc: '点缀林荫小路的蓬松蕨类。',
  },
  {
    id: 'nature-wisteria', name: '紫藤花树', category: 'plant', asset: 'nature-wisteria', thumb: thumb('nature-wisteria'), icon: '🪻',
    width: 3.2, depth: 3.2, height: 3.4, price: 14, unlockLevel: 2, solid: false, attracts: ['紫藤赤狐'], tags: ['tree', 'flower', 'wisteria'],
    desc: '垂满紫色花穗的庭院花树，吸引赤狐与水豚驻足。',
  },
  {
    id: 'pack-ginkgo', name: '金秋银杏', category: 'plant', asset: 'pack-ginkgo', thumb: thumb('pack-ginkgo'), icon: '🍂',
    width: 3.4, depth: 3.4, height: 4.2, price: 14, unlockLevel: 2, solid: true, attracts: ['林间梅花鹿'], tags: ['tree', 'pasture'],
    desc: '满树金黄扇叶的银杏树，林缘牧场绝配。',
  },
  {
    id: 'nature-bonsai', name: '古雅盆景', category: 'plant', asset: 'nature-bonsai', thumb: thumb('nature-bonsai'), icon: '🪴',
    width: 1.6, depth: 1.6, height: 1.5, price: 12, unlockLevel: 2, solid: false, tags: ['jiangnan', 'flower'],
    desc: '精雕细琢的庭院松石盆景。',
  },
  {
    id: 'waterside-shore-stones', name: '叠岸景石', category: 'plant', asset: 'waterside-shore-stones', thumb: thumb('waterside-shore-stones'), icon: '🪨',
    width: 2.2, depth: 1.8, height: 1.0, price: 6, unlockLevel: 1, solid: true, waterAllowed: true, tags: ['water', 'stone'],
    desc: '圆润的溪岸叠石，可踩踏也能围出池岸边界。',
  },
  {
    id: 'nature-palm', name: '海风棕榈', category: 'plant', asset: 'nature-palm', thumb: thumb('nature-palm'), icon: '🌴',
    width: 2.8, depth: 2.8, height: 4.5, price: 12, unlockLevel: 3, solid: false, tags: ['tree', 'coast'],
    desc: '随海风舒展的海岸棕榈。',
  },
  {
    id: 'tidal-rocks', name: '潮池礁石', category: 'plant', asset: 'tidal-rocks', thumb: thumb('tidal-rocks'), icon: '🦀',
    width: 2.6, depth: 2.2, height: 1.1, price: 10, unlockLevel: 3, solid: true, waterAllowed: true, attracts: ['潮池岸蟹'], tags: ['coast', 'tidal'],
    desc: '留住浅海潮水的岩礁，安置在岸线即可吸引岸蟹出没。',
  },
  {
    id: 'nature-sea-arch', name: '海蚀拱门', category: 'plant', asset: 'nature-sea-arch', thumb: thumb('nature-sea-arch'), icon: '⛰️',
    width: 5.2, depth: 2.4, height: 4.2, price: 36, unlockLevel: 5, solid: true, waterAllowed: true, tags: ['coast', 'landmark'],
    desc: '壮阔的天然海蚀石拱，适合做海岸观景入口。',
  },

  // ---- Functional Home Facilities ----
  {
    id: 'facility-sprinkler', name: '元素洒水泉', category: 'facility', asset: 'procedural-fountain', thumb: '', icon: '⛲',
    width: 1.8, depth: 1.8, height: 1.5, price: 24, unlockLevel: 2, solid: true, attracts: ['悠闲水豚'], tags: ['water', 'facility'],
    desc: '雷属性充能后自动为农场全部地块持续保水 12 小时！',
  },
  {
    id: 'facility-pedestal', name: '史书纪念展台', category: 'facility', asset: 'procedural-pedestal', thumb: '', icon: '🏛️',
    width: 1.5, depth: 1.5, height: 1.3, price: 16, unlockLevel: 1, solid: true, tags: ['jiangnan', 'facility'],
    desc: '把通关历史关卡收集到的纪念品摆在庭院里展示。',
  },
  {
    id: 'facility-flowerbed', name: '培育花圃', category: 'facility', asset: 'procedural-flowerbed', thumb: '', icon: '🌷',
    width: 2.4, depth: 1.6, height: 0.45, price: 12, unlockLevel: 1, solid: false, attracts: ['草甸野兔', '紫藤赤狐'], tags: ['flower', 'garden', 'facility'],
    desc: '装点庭院的鲜花木槽，靠近时用风属性吹拂会飘起花瓣，也能吸引赤狐与野兔。',
  },
  // ---- Living Artisan & Interactive POIs ----
  {
    id: 'poi-keg', name: '凝露酿造桶', category: 'facility', asset: 'procedural-keg', thumb: '', icon: '🏺',
    width: 1.4, depth: 1.4, height: 1.35, price: 24, unlockLevel: 1, solid: true, tags: ['artisan', 'facility'],
    desc: '把葡萄、草莓、蓝莓与南瓜慢酿成 3 倍价值的果酒与麦芽酒，暗/水元素可加速发酵！',
  },
  {
    id: 'poi-kiln', name: '窑烤面包房', category: 'facility', asset: 'procedural-kiln', thumb: '', icon: '🔥',
    width: 2.4, depth: 2.0, height: 1.9, price: 32, unlockLevel: 1, solid: true, tags: ['artisan', 'facility'],
    desc: '用磨坊面粉烤制乡间面包，或果木慢熏鲜鱼。火属性旺炉可直推 40% 进度并出金标！',
  },
  {
    id: 'poi-beehive', name: '庭院蜂箱', category: 'facility', asset: 'procedural-beehive', thumb: '', icon: '🐝',
    width: 1.3, depth: 1.3, height: 1.25, price: 18, unlockLevel: 1, solid: true, tags: ['artisan', 'flower', 'facility'],
    desc: '自动采撷周围 9 米内青莲/星露等花卉，酿出对应高价风味花蜜！',
  },
  {
    id: 'poi-preserver', name: '古法腌渍缸', category: 'facility', asset: 'procedural-preserver', thumb: '', icon: '🥫',
    width: 1.5, depth: 1.5, height: 1.2, price: 28, unlockLevel: 2, solid: true, tags: ['artisan', 'facility'],
    desc: '把牧场鲜乳做成奶酪、鱼塘鱼籽腌成鱼子酱、松露冷榨为顶级松露油。',
  },
  {
    id: 'poi-loom', name: '云绒织布机', category: 'facility', asset: 'procedural-loom', thumb: '', icon: '🧶',
    width: 2.0, depth: 1.5, height: 1.6, price: 34, unlockLevel: 2, solid: true, tags: ['artisan', 'facility'],
    desc: '把动物梳落的云朵软绒与星光狐绒织成高价云绒锦缎，风/雷属性穿梭提速。',
  },
  {
    id: 'poi-hotspring', name: '露天温泉池', category: 'facility', asset: 'procedural-hotspring', thumb: '', icon: '♨️',
    width: 3.6, depth: 3.2, height: 0.72, price: 46, unlockLevel: 2, solid: true, attracts: ['悠闲水豚'], tags: ['water', 'hotspring', 'facility'],
    desc: '火/水属性注入暖泉后开启！史莱姆泡澡获活力祝福，水豚会自动来泡澡产出温泉暖露。',
  },
  {
    id: 'poi-observatory', name: '观星授时台', category: 'facility', asset: 'procedural-observatory', thumb: '', icon: '🔭',
    width: 2.8, depth: 2.8, height: 3.2, price: 52, unlockLevel: 3, solid: true, tags: ['landmark', 'astronomy', 'facility'],
    desc: '查看今日稀兽遭遇预报、气象星象并每日祈星获赠星露种子或历史残片。',
  },
  {
    id: 'poi-glider-tower', name: '乘风热气球台', category: 'facility', asset: 'procedural-glider-tower', thumb: '', icon: '🎈',
    width: 2.6, depth: 2.6, height: 3.8, price: 42, unlockLevel: 2, solid: true, tags: ['landmark', 'facility'],
    desc: '火/风属性点燃升空至高空，一键撑开滑翔伞俯瞰全岛并滑翔前往远方扩建领土！',
  },
  {
    id: 'poi-waystone', name: '传送风铃柱', category: 'facility', asset: 'procedural-waystone', thumb: '', icon: '🎐',
    width: 1.2, depth: 1.2, height: 2.4, price: 28, unlockLevel: 2, solid: true, tags: ['jiangnan', 'facility'],
    desc: '在扩建远地摆放两座以上风铃柱，即可按 F 在各节点间快速水泡传送！',
  },
  {
    id: 'poi-museum-altar', name: '时光博物苑展台', category: 'facility', asset: 'procedural-museum', thumb: '', icon: '🏛️',
    width: 2.6, depth: 2.2, height: 2.1, price: 10, unlockLevel: 1, solid: true, tags: ['jiangnan', 'facility'],
    desc: '向六大展厅捐献农产制品、珍鱼、动物馈赠与史事纪念品，永久修复凝露港奇迹！',
  },
  {
    id: 'poi-coop', name: '林间小动物牧舍', category: 'facility', asset: 'procedural-coop', thumb: '', icon: '🏡',
    width: 3.2, depth: 2.6, height: 2.2, price: 34, unlockLevel: 1, solid: true, tags: ['ranch', 'coop', 'pasture'],
    desc: '收容野兔、锦鸡、松鼠、水獭等小型物种，提供独立安置地点，每日产出灵蛋与绒毛。',
  },
  {
    id: 'poi-barn', name: '敞篷灵兽鹿苑', category: 'facility', asset: 'procedural-barn', thumb: '', icon: '🦌',
    width: 4.4, depth: 3.4, height: 2.9, price: 50, unlockLevel: 2, solid: true, tags: ['ranch', 'barn', 'pasture'],
    desc: '收容梅花鹿、白鹿、雪狐、水豚、小熊猫等中大型灵兽，提供独立安置地点，每日产出鲜乳与珍稀露。',
  },
  {
    id: 'poi-fishpond', name: '生态养殖鱼塘', category: 'facility', asset: 'procedural-fishpond', thumb: '', icon: '🐟',
    width: 3.8, depth: 3.2, height: 0.65, price: 38, unlockLevel: 1, solid: true, tags: ['water', 'pond', 'facility'],
    desc: '投放钓到的活鱼进行繁育（最高扩容至 10 条），每日产出鲜鱼籽与河珠！',
  },
];

export const BUILD_ITEMS: Record<string, BuildItemDef> = Object.fromEntries(BUILD_CATALOG.map(i => [i.id, i]));

/** Curated DreamWorld-inspired one-click landscape presets players can place & customize. */
export const HOME_PRESETS: PresetBlueprint[] = [
  {
    id: 'preset-artisan-yard',
    name: '手作工坊小院',
    subtitle: '酿造桶 + 窑烤面包房 + 庭院蜂箱 + 培育花圃（立刻开启 3 倍价值加工链！）',
    unlockLevel: 1,
    discountPrice: 68,
    items: [
      {itemId: 'poi-kiln', dx: -2.6, dz: -1.4, yaw: 0.15, scale: 1},
      {itemId: 'poi-keg', dx: 2.2, dz: -1.6, yaw: 0, scale: 1},
      {itemId: 'poi-beehive', dx: 2.4, dz: 1.6, yaw: -0.3, scale: 1},
      {itemId: 'facility-flowerbed', dx: -1.6, dz: 2.0, yaw: 0, scale: 1},
    ],
  },
  {
    id: 'preset-ue-farmstead',
    name: '田园自耕小菜园',
    subtitle: '茅草小屋 + 3 座木框高架农田 + 培育花圃（马上开垦 3 块可种植农田 + 吸引野兔）',
    unlockLevel: 1,
    discountPrice: 28,
    items: [
      {itemId: 'build-thatch', dx: 0, dz: -3.2, yaw: 0, scale: 1},
      {itemId: 'farm-bed-wood', dx: -3.4, dz: 1.6, yaw: 0, scale: 1},
      {itemId: 'farm-bed-wood', dx: 0, dz: 1.6, yaw: 0, scale: 1},
      {itemId: 'farm-bed-wood', dx: 3.4, dz: 1.6, yaw: 0, scale: 1},
      {itemId: 'facility-flowerbed', dx: 3.6, dz: -2.4, yaw: 0, scale: 1},
    ],
  },
  {
    id: 'preset-jiangnan-court',
    name: '江南竹影小院',
    subtitle: '月洞门、木亭与双丛翠竹围合小院，柳荫下设纪念品台。',
    unlockLevel: 1,
    discountPrice: 45,
    items: [
      {itemId: 'pack-pavilion', dx: 0, dz: 0, yaw: 0, scale: 1},
      {itemId: 'build-moon-gate', dx: 0, dz: 4.8, yaw: 0, scale: 1},
      {itemId: 'nature-bamboo', dx: -3.6, dz: -2.2, yaw: 0.3, scale: 1},
      {itemId: 'nature-bamboo', dx: 3.6, dz: -2.0, yaw: 1.4, scale: 0.95},
      {itemId: 'nature-willow', dx: -4.2, dz: 3.0, yaw: 0.6, scale: 0.9},
      {itemId: 'facility-pedestal', dx: 3.2, dz: 3.2, yaw: -0.4, scale: 1},
    ],
  },
  {
    id: 'preset-pasture-garden',
    name: '花田牧场工坊',
    subtitle: '牧场木棚 + 玻璃温室 + 金秋银杏 + 紫藤花树（吸引梅花鹿、野兔与赤狐）',
    unlockLevel: 2,
    discountPrice: 78,
    items: [
      {itemId: 'pasture-shelter', dx: -3.2, dz: -1.5, yaw: 0.25, scale: 1},
      {itemId: 'pack-greenhouse', dx: 3.5, dz: -1.2, yaw: -0.2, scale: 1},
      {itemId: 'pack-ginkgo', dx: -5.6, dz: 2.6, yaw: 0.4, scale: 1},
      {itemId: 'nature-wisteria', dx: 5.5, dz: 2.8, yaw: 1.1, scale: 0.95},
      {itemId: 'facility-flowerbed', dx: 0, dz: 3.4, yaw: 0, scale: 1},
      {itemId: 'facility-sprinkler', dx: 0, dz: -3.2, yaw: 0, scale: 1},
    ],
  },
  {
    id: 'preset-coast-beacon',
    name: '海岬灯塔潮池',
    subtitle: '海岬灯塔 + 茅草小屋 + 潮池礁石 + 棕榈（吸引海鸥与岸蟹，绝佳撑伞起跳点）',
    unlockLevel: 4,
    discountPrice: 82,
    items: [
      {itemId: 'build-lighthouse', dx: 0, dz: -2.2, yaw: 0, scale: 1},
      {itemId: 'build-thatch', dx: -4.4, dz: 2.2, yaw: 0.35, scale: 1},
      {itemId: 'tidal-rocks', dx: 4.2, dz: 2.0, yaw: 0.7, scale: 1},
      {itemId: 'nature-palm', dx: 3.8, dz: -3.0, yaw: 0.2, scale: 1},
      {itemId: 'nature-palm', dx: -4.6, dz: -2.5, yaw: 2.1, scale: 0.9},
    ],
  },
];

/** Keeps the Time Plaza & Lectern entrance clear so players never accidentally block story gates. */
export const PLAZA_NO_BUILD = {minX: -12, maxX: 19, minZ: 6, maxZ: 28};

export interface PlacementCheck {
  ok: boolean;
  reason?: string;
}

export function isInPlazaNoBuild(x: number, z: number, radius: number, protectLane=true): boolean {
  if (portalSlots.some(p => Math.hypot(x-p.position[0],z-p.position[2]) < radius+2.25)) return true;
  if (Math.hypot(x-plazaCenter[0],z-plazaCenter[2]) < radius+8.25) return true;
  if (Math.hypot(x-quayPavilion.x,z-quayPavilion.z) < radius+quayPavilion.width/2) return true;
  if (protectLane && x+radius>nativeLane.x-1 && x-radius<nativeLane.x+1 && z+radius>nativeLane.firstZ-1 && z-radius<nativeLane.lastZ+1) return true;
  if (x+radius>18.8 && x-radius<22.6 && z+radius>10 && z-radius<25) return true;
  return (
    x + radius > PLAZA_NO_BUILD.minX &&
    x - radius < PLAZA_NO_BUILD.maxX &&
    z + radius > PLAZA_NO_BUILD.minZ &&
    z - radius < PLAZA_NO_BUILD.maxZ
  );
}

export function canPlaceProp(
  item: BuildItemDef,
  x: number,
  z: number,
  scale: number,
  existing: PlacedProp[],
  groundY: number | null,
  fluidLevel: number | null,
  expansions: ExpandedTile[] = [],
  yaw = 0,
): PlacementCheck {
  const c=Math.cos(yaw), s=Math.sin(yaw);
  for (const side of [-.5,.5]) for(const end of [-.5,.5]){
    const dx=item.width*scale*side,dz=item.depth*scale*end;
    if(!isInsideHomeTerritory(x+dx*c+dz*s,z-dx*s+dz*c,expansions,0))
      return {ok:false,reason:'物件超出领土边界'};
  }
  const r = (Math.max(item.width, item.depth) * scale) * 0.45;
  if (!isInsideHomeTerritory(x, z, expansions, 2.5)) {
    return {ok: false, reason: '超出家园领土边界（可在「扩建领土」中开垦新地块）'};
  }
  if (isInPlazaNoBuild(x, z, r)) {
    return {ok: false, reason: '时光门广场与史书台区域不可建造'};
  }
  if (groundY === null) return {ok: false, reason: '此处无法落脚'};
  const inWater = fluidLevel !== null && groundY < fluidLevel - 0.08;
  if (inWater && !item.waterAllowed) {
    return {ok: false, reason: '该建筑不能建在深水中'};
  }
  for (const p of existing) {
    const other = BUILD_ITEMS[p.itemId];
    if (!other) continue;
    // Separating axes of both oriented footprints. Foliage may interleave at its edges.
    const margin = item.solid || other.solid ? .49 : .34;
    const extent=(angle:number, rotation:number,w:number,d:number)=>
      margin*(Math.abs(Math.cos(angle-rotation))*w + Math.abs(Math.sin(angle-rotation))*d);
    const separated=[yaw,yaw+Math.PI/2,p.yaw,p.yaw+Math.PI/2].some(angle=>{
      const distance=Math.abs((x-p.x)*Math.cos(angle)-(z-p.z)*Math.sin(angle));
      return distance>=extent(angle,yaw,item.width*scale,item.depth*scale)+extent(angle,p.yaw,p.nativeFootprint?.width??other.width*p.scale,p.nativeFootprint?.depth??other.depth*p.scale);
    });
    if (!separated) {
      return {ok: false, reason: `与已摆放的「${p.nativeFootprint?.name??other.name}」重叠`};
    }
  }
  return {ok: true};
}

const isTreeDef = (def: BuildItemDef) => def.category === 'plant' && def.tags.includes('tree');

/** Generates an exact world-space standable oriented collision Box for solid placed home props (trees are non-climbable). */
export function buildPropCollisionBox(prop: PlacedProp): Box | null {
  const def = BUILD_ITEMS[prop.itemId];
  if (!def || !def.solid) return null;
  const hw = (def.width * prop.scale) * 0.50;
  const hd = (def.depth * prop.scale) * 0.50;
  const h = def.farmBed ? Math.max(0.35, def.height * prop.scale) : def.height * prop.scale;
  const min: Vec = [prop.x - hw, prop.y - 0.12, prop.z - hd];
  const max: Vec = [prop.x + hw, prop.y + h, prop.z + hd];
  const climbable = isTreeDef(def) ? false : undefined;
  return {min, max, yaw: prop.yaw || undefined, camera: !def.farmBed, climbable, name: `home-${prop.id}`};
}

// Emit exact oriented 3D collision boxes (OBBs) for every structural sub-part so rotated
// buildings, archways, bridges and walls match their rendered geometry with zero staircasing.
export function propCollisionParts(prop:PlacedProp):Box[] {
  const def=BUILD_ITEMS[prop.itemId],structure=propStructures[prop.itemId];
  if(!structure){
    const box=buildPropCollisionBox(prop);return box?[box]:[];
  }
  const k=Math.max(def.width,def.depth)*prop.scale/structure.span;
  const c=Math.cos(prop.yaw),s=Math.sin(prop.yaw),boxes:Box[]=[];
  const yaw=Math.abs(prop.yaw)>1e-5?prop.yaw:undefined;
  const treeProp=isTreeDef(def);
  for(const [dx,dz,w,d,lo,hi,kind] of structure.parts){
    const x=prop.x+(dx*c+dz*s)*k,z=prop.z+(dz*c-dx*s)*k;
    const hx=w*k/2,hz=d*k/2;
    boxes.push({
      name:`${prop.id}-${boxes.length}-${kind}`,
      min:[x-hx,prop.y+lo*k,z-hz],
      max:[x+hx,prop.y+hi*k,z+hz],
      yaw,
      camera:kind!=='deck'&&kind!=='floor',
      climbable:(treeProp||kind==='trunk')?false:undefined,
    });
  }
  return boxes;
}

/** Re-seat old harbour builds on the new terrain once, preserving IDs, crops and inventories. */
export function settleLegacyGarden(home: HomeBuildState) {
  if (home.gardenTerrain === 1) return false;
  for (const p of home.placed) {
    const def=BUILD_ITEMS[p.itemId];
    if (!def || p.x < -30 || p.x > 31 || p.z < -31 || p.z > 30) continue;
    const neighbours=home.placed.filter(other=>other!==p);
    const settle=(x:number,z:number)=>{
      const c=Math.cos(p.yaw),s=Math.sin(p.yaw),y=valleyHeight(x,z);
      for (const side of [-.5,.5]) for (const end of [-.5,.5]) {
        const dx=side*def.width*p.scale,dz=end*def.depth*p.scale;
        const px=x+dx*c+dz*s,pz=z-dx*s+dz*c;
        if (px < -30 || px > 31 || pz < -31 || pz > 30) return false;
        const h=valleyHeight(px,pz);
        if (!def.waterAllowed && (h < riverLevel-.08 || Math.abs(h-y)>.55)) return false;
      }
      if (!canPlaceProp(def,x,z,p.scale,neighbours,y,riverLevel,home.expansions,p.yaw).ok) return false;
      p.x=x;p.z=z;p.y=def.waterAllowed?Math.max(y,riverLevel):y;
      return true;
    };
    if (settle(p.x,p.z)) continue;
    // A former quay can now be a river or a public path. Prefer the nearest stable bank.
    let found=false;
    for (let radius=1;radius<=48 && !found;radius++) {
      const count=Math.ceil(Math.PI*radius);
      for (let i=0;i<count;i++) {
        const angle=i*Math.PI*2/count;
        if (settle(p.x+radius*Math.cos(angle),p.z+radius*Math.sin(angle))) {found=true;break;}
      }
    }
  }
  home.gardenTerrain=1;
  return true;
}
