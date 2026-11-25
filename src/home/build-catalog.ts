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
  /** DreamWorld GLB basename (in /models/dreamworld) or 'procedural-*' for functional facilities & farm beds. */
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

const thumb = (asset: string) => `/models/dreamworld/${asset}.png`;

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
    width: 3.2, depth: 1.0, height: 2.8, price: 14, unlockLevel: 1, solid: false, attracts: ['绒尾小熊猫'], tags: ['jiangnan', 'pavilion'],
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
    width: 3.6, depth: 3.6, height: 4.0, price: 10, unlockLevel: 1, solid: false, attracts: ['碧羽翠鸟', '林间梅花鹿'], tags: ['tree', 'water', 'jiangnan'],
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
    width: 3.4, depth: 3.4, height: 4.2, price: 14, unlockLevel: 2, solid: false, attracts: ['林间梅花鹿'], tags: ['tree', 'pasture'],
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
];

export const BUILD_ITEMS: Record<string, BuildItemDef> = Object.fromEntries(BUILD_CATALOG.map(i => [i.id, i]));

/** Curated DreamWorld-inspired one-click landscape presets players can place & customize. */
export const HOME_PRESETS: PresetBlueprint[] = [
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
      return distance>=extent(angle,yaw,item.width*scale,item.depth*scale)+extent(angle,p.yaw,other.width*p.scale,other.depth*p.scale);
    });
    if (!separated) {
      return {ok: false, reason: `与已摆放的「${other.name}」重叠`};
    }
  }
  return {ok: true};
}

/** Generates a world-space climbable/standable collision Box for solid placed home props. */
export function buildPropCollisionBox(prop: PlacedProp): Box | null {
  const def = BUILD_ITEMS[prop.itemId];
  if (!def || !def.solid) return null;
  const c = Math.abs(Math.cos(prop.yaw)), s = Math.abs(Math.sin(prop.yaw));
  // Raised farm beds use exact 0.50 outer-wall half-extents and >= 0.35m height so the slime never clips into the frame
  const extentFactor = def.farmBed ? 0.50 : 0.36;
  const hw = ((def.width * c + def.depth * s) * prop.scale) * extentFactor;
  const hd = ((def.width * s + def.depth * c) * prop.scale) * extentFactor;
  const h = def.farmBed ? Math.max(0.35, def.height * prop.scale) : def.height * prop.scale * 0.88;
  const min: Vec = [prop.x - hw, prop.y - 0.2, prop.z - hd];
  const max: Vec = [prop.x + hw, prop.y + h, prop.z + hd];
  return {min, max, camera: !def.farmBed, name: `home-${prop.id}`};
}

/** Keep pavilion entrances traversable while giving columns, floor and roof support. */
export function propCollisionParts(prop:PlacedProp):Box[] {
  if(prop.itemId!=='pack-pavilion'){
    const box=buildPropCollisionBox(prop);return box?[box]:[];
  }
  const result:Box[]=[],c=Math.cos(prop.yaw),s=Math.sin(prop.yaw),k=prop.scale;
  const part=(dx:number,dz:number,r:number,bottom:number,top:number,kind:string)=>{
    const x=prop.x+k*(dx*c+dz*s),z=prop.z+k*(dz*c-dx*s);
    result.push({name:'pavilion-'+prop.id+'-'+kind,min:[x-r*k,prop.y+bottom*k,z-r*k],max:[x+r*k,prop.y+top*k,z+r*k],camera:true});
  };
  part(0,0,1.26,-.06,.12,'floor');part(0,0,1.28,1.94,2.4,'roof');
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;part(Math.cos(a)*1.25,Math.sin(a)*1.25,.08,.1,2.02,'post-'+i);
  }
  return result;
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
