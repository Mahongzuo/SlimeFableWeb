import type {VoxelBlueprint, VoxelShape} from '../life/state';
import {isMuseumHallRestored} from '../life/museum';
import type {LifeData} from '../life/state';

export type VoxelGroup = 'struct' | 'roof' | 'light' | 'nature' | 'ranch' | 'history';

export interface VoxelBlockDef {
  id: string;
  name: string;
  icon: string;
  group: VoxelGroup;
  color: number;
  accentColor?: number;
  defaultShape: VoxelShape;
  price: number;
  roughness: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
  emissive?: number;
  emissiveIntensity?: number;
  /** True for solid full-cube eligible for neighbor face culling & greedy meshing. */
  opaqueCube: boolean;
  /** Generates walkable/climbable collision box. */
  solid: boolean;
  /** Recognized by Ranch system to detect enclosed player-built animal pastures! */
  isFence?: boolean;
  /** Launches slime upward when stepped on (great for building custom umbrella glide towers!). */
  isBounce?: boolean;
  /** Uses leaf seasonal coloring instead of structure coloring. */
  climateSurface: 'structure' | 'leaves';
  /** Requires restoring a Time Museum hall or collecting N history souvenirs. */
  unlockHint?: string;
  requiresMuseumHall?: 'craft' | 'history';
  desc: string;
}

export const VOXEL_CATALOG: VoxelBlockDef[] = [
  // ---- Structural Jiangnan & Storybook Masonry ----
  {
    id: 'vx-plaster', name: '粉墙白泥', icon: '⬜', group: 'struct', color: 0xf1ece0, accentColor: 0xd8d1c2,
    defaultShape: 'cube', price: 1, roughness: 0.88, opaqueCube: true, solid: true, climateSurface: 'structure',
    desc: '徽派江南白墙粉泥，配青瓦屋面最出彩。',
  },
  {
    id: 'vx-bluestone', name: '青石方砖', icon: '🪨', group: 'struct', color: 0x8e9993, accentColor: 0x737e78,
    defaultShape: 'cube', price: 1, roughness: 0.84, opaqueCube: true, solid: true, climateSurface: 'structure',
    desc: '沉稳耐湿的港湾青石砖，雨天自动呈现湿润质感。',
  },
  {
    id: 'vx-wood', name: '原木方梁', icon: '🪵', group: 'struct', color: 0x996d46, accentColor: 0x785233,
    defaultShape: 'cube', price: 1, roughness: 0.82, opaqueCube: true, solid: true, climateSurface: 'structure',
    desc: '温润榫卯木结构块，适合搭树屋、廊桥与工坊。',
  },
  {
    id: 'vx-pillar-red', name: '朱漆立柱', icon: '🏮', group: 'struct', color: 0xa63c30, accentColor: 0x7a2a21,
    defaultShape: 'pillar', price: 2, roughness: 0.72, opaqueCube: false, solid: true, climateSurface: 'structure',
    desc: '古典朱红木柱，撑起凉亭、长廊与观景台。',
  },
  {
    id: 'vx-earth', name: '暖色夯土', icon: '🟫', group: 'struct', color: 0xb8966e, accentColor: 0x997954,
    defaultShape: 'cube', price: 1, roughness: 0.94, opaqueCube: true, solid: true, climateSurface: 'structure',
    desc: '朴素田园夯土块，与梯田和牧场浑然一体。',
  },
  {
    id: 'vx-plank', name: '木质露台板', icon: '🪜', group: 'struct', color: 0xb78b5e, accentColor: 0x916a43,
    defaultShape: 'slab', price: 1, roughness: 0.80, opaqueCube: false, solid: true, climateSurface: 'structure',
    desc: '0.5m 半高木板，轻松搭建挑空露台、亲水栈道与夹层。',
  },

  // ---- Roofs & Stairs ----
  {
    id: 'vx-tile-roof', name: '江南青瓦坡', icon: '🏠', group: 'roof', color: 0x4f665f, accentColor: 0x3b4e48,
    defaultShape: 'slope', price: 2, roughness: 0.78, opaqueCube: false, solid: true, climateSurface: 'structure',
    desc: '带斜度的青瓦坡屋顶，按 Q/E 旋转朝向，下雪自动覆白雪！',
  },
  {
    id: 'vx-tile-crimson', name: '朱檐琉璃坡', icon: '🏯', group: 'roof', color: 0x9d4234, accentColor: 0xd19f47,
    defaultShape: 'slope', price: 3, roughness: 0.58, metalness: 0.12, opaqueCube: false, solid: true, climateSurface: 'structure',
    desc: '庄重雅致的朱红斜坡屋瓦，适合搭宝塔与博物苑。',
  },
  {
    id: 'vx-stone-step', name: '青石台阶', icon: '📐', group: 'roof', color: 0x97a19a, accentColor: 0x7c8780,
    defaultShape: 'stairs', price: 2, roughness: 0.85, opaqueCube: false, solid: true, climateSurface: 'structure',
    desc: '两级青石阶梯，史莱姆可直接平滑走上高台。',
  },
  {
    id: 'vx-wood-step', name: '原木阶梯', icon: '🪵', group: 'roof', color: 0xa4774e, accentColor: 0x825b39,
    defaultShape: 'stairs', price: 2, roughness: 0.80, opaqueCube: false, solid: true, climateSurface: 'structure',
    desc: '轻巧的木质楼梯，连接阁楼、树屋与滑翔塔。',
  },

  // ---- Glass, Windows & Lighting ----
  {
    id: 'vx-glass', name: '清透玻璃窗', icon: '🪟', group: 'light', color: 0xbfe7f2, accentColor: 0x8db9c9,
    defaultShape: 'cube', price: 2, roughness: 0.18, metalness: 0.08, transparent: true, opacity: 0.48,
    opaqueCube: false, solid: true, climateSurface: 'structure',
    desc: '通透温室玻璃砖，搭建专属花房、水族馆墙面或全景窗。',
  },
  {
    id: 'vx-lattice', name: '花格木窗', icon: '💠', group: 'light', color: 0x7a563a, accentColor: 0xf4e8ce,
    defaultShape: 'pillar', price: 2, roughness: 0.78, opaqueCube: false, solid: true, climateSurface: 'structure',
    desc: '江南镂空木格花窗，透景又雅致。',
  },
  {
    id: 'vx-lantern', name: '暖光纸灯笼', icon: '🏮', group: 'light', color: 0xffd584, accentColor: 0xc24c38,
    defaultShape: 'lantern', price: 3, roughness: 0.45, emissive: 0xffae42, emissiveIntensity: 0.95,
    opaqueCube: false, solid: false, climateSurface: 'structure',
    desc: '自带柔暖光晕的灯笼块，入夜点亮庭院与空中廊桥！',
  },
  {
    id: 'vx-star-crystal', name: '星露萤光砖', icon: '✨', group: 'light', color: 0x9cf0ff, accentColor: 0x56c7e6,
    defaultShape: 'cube', price: 4, roughness: 0.25, emissive: 0x4cc9f0, emissiveIntensity: 0.65,
    opaqueCube: true, solid: true, climateSurface: 'structure',
    desc: '散发星辉微光的晶体砖，适合点缀观星台与水底奇观。',
  },

  // ---- Nature & Waterworks ----
  {
    id: 'vx-turf', name: '青草坡土', icon: '🌿', group: 'nature', color: 0x7da362, accentColor: 0x7d5e43,
    defaultShape: 'cube', price: 1, roughness: 0.92, opaqueCube: true, solid: true, climateSurface: 'leaves',
    desc: '随四季自动变色的草土块，可堆山造坡与空中花园。',
  },
  {
    id: 'vx-foliage', name: '花叶树冠', icon: '🌳', group: 'nature', color: 0x5d9454, accentColor: 0x86ba6e,
    defaultShape: 'cube', price: 1, roughness: 0.90, opaqueCube: true, solid: true, climateSurface: 'leaves',
    desc: '随春夏秋冬变色的浓密树冠块，适合塑造树篱迷宫与巨树。',
  },
  {
    id: 'vx-rock', name: '太湖叠石', icon: '⛰️', group: 'nature', color: 0x84877e, accentColor: 0x696d64,
    defaultShape: 'cube', price: 1, roughness: 0.90, opaqueCube: true, solid: true, climateSurface: 'structure',
    desc: '凹凸古拙的园林假山石块，构筑溪谷与瀑布崖壁。',
  },
  {
    id: 'vx-canal', name: '浅水渠块', icon: '💧', group: 'nature', color: 0x4dbbd9, accentColor: 0x7ce0f5,
    defaultShape: 'water', price: 2, roughness: 0.16, metalness: 0.08, transparent: true, opacity: 0.72,
    opaqueCube: false, solid: false, climateSurface: 'structure',
    desc: '半透清澈浅水块，可自由修筑庭院水渠、喷泉与锦鲤水池。',
  },

  // ---- Ranch & Slime Physics Interactive Blocks ----
  {
    id: 'vx-fence', name: '牧场木栅栏', icon: '🪵', group: 'ranch', color: 0x9c724b, accentColor: 0x735032,
    defaultShape: 'fence', price: 1, roughness: 0.85, opaqueCube: false, solid: true, isFence: true, climateSurface: 'structure',
    desc: '围成闭合圈即自动被牧场系统识别为「自建放牧区」，小动物会在圈内悠闲吃草！',
  },
  {
    id: 'vx-bounce', name: '弹跳软垫块', icon: '🟢', group: 'ranch', color: 0x52c79a, accentColor: 0xdaf7ea,
    defaultShape: 'slab', price: 4, roughness: 0.35, emissive: 0x2a8c67, emissiveIntensity: 0.25,
    opaqueCube: false, solid: true, isBounce: true, climateSurface: 'structure',
    desc: '史莱姆踏上即高高弹起，轻松飞上自建高塔或一键展开滑翔伞！',
  },

  // ---- History-Themed Unlockable Blocks ----
  {
    id: 'vx-dunhuang', name: '敦煌藻井砖', icon: '🎨', group: 'history', color: 0xc96a3b, accentColor: 0x3b7d8c,
    defaultShape: 'cube', price: 3, roughness: 0.75, opaqueCube: true, solid: true, climateSurface: 'structure',
    requiresMuseumHall: 'history', unlockHint: '修复「岁月史海馆」或集齐 5 件历史纪念品解锁',
    desc: '融合朱砂、石青与泥金的敦煌壁画建筑砖。',
  },
  {
    id: 'vx-greatwall', name: '长城青灰垛', icon: '🧱', group: 'history', color: 0x777d7a, accentColor: 0x595e5c,
    defaultShape: 'cube', price: 2, roughness: 0.88, opaqueCube: true, solid: true, climateSurface: 'structure',
    desc: '雄浑古朴的边关城砖，适合构筑瞭望台与城垣长廊。',
  },
  {
    id: 'vx-celadon', name: '越窑青瓷砖', icon: '🏺', group: 'history', color: 0x8db8aa, accentColor: 0x679486,
    defaultShape: 'cube', price: 3, roughness: 0.34, metalness: 0.12, opaqueCube: true, solid: true, climateSurface: 'structure',
    desc: '温润秘色青瓷釉面砖，打造流光溢彩的水上殿堂。',
  },
  {
    id: 'vx-aerospace', name: '航天银桁架', icon: '🚀', group: 'history', color: 0xc9d2d8, accentColor: 0x5b768f,
    defaultShape: 'cube', price: 3, roughness: 0.38, metalness: 0.45, opaqueCube: true, solid: true, climateSurface: 'structure',
    desc: '现代航天银灰结构块，建造观星发射塔与科幻连廊。',
  },
];

export const VOXEL_ITEMS: Record<string, VoxelBlockDef> = Object.fromEntries(VOXEL_CATALOG.map(b => [b.id, b]));

export const VOXEL_GROUPS: [VoxelGroup, string][] = [
  ['struct', '墙木'],
  ['roof', '瓦阶'],
  ['light', '窗灯'],
  ['nature', '山水'],
  ['ranch', '牧玩'],
  ['history', '史砖'],
];

/** Storybook palette dyes for tinting voxel blocks (free full palette when Craft Hall restored). */
export const VOXEL_DYES: {name: string; hex: number | null; css: string}[] = [
  {name: '原色', hex: null, css: 'linear-gradient(135deg,#f1ece0,#8e9993)'},
  {name: '月白', hex: 0xf4f0e4, css: '#f4f0e4'},
  {name: '青瓷', hex: 0x7db3a4, css: '#7db3a4'},
  {name: '黛瓦', hex: 0x455853, css: '#455853'},
  {name: '朱砂', hex: 0xb94a3a, css: '#b94a3a'},
  {name: '杏黄', hex: 0xe3b859, css: '#e3b859'},
  {name: '紫藤', hex: 0x9c86c4, css: '#9c86c4'},
  {name: '松烟', hex: 0x4e5255, css: '#4e5255'},
];

export function isVoxelUnlocked(life: LifeData, blockId: string, souvenirCount = 0): boolean {
  const def = VOXEL_ITEMS[blockId];
  if (!def) return false;
  if (!def.requiresMuseumHall) return true;
  if (isMuseumHallRestored(life, def.requiresMuseumHall)) return true;
  if (def.requiresMuseumHall === 'history' && souvenirCount >= 5) return true;
  return false;
}

export function voxelUnitPrice(life: LifeData, blockId: string): number {
  const def = VOXEL_ITEMS[blockId];
  if (!def) return 1;
  // Restoring Lu Ban Craft Hall makes basic 1-shell wood/stone/earth blocks FREE!
  if (def.price <= 1 && isMuseumHallRestored(life, 'craft')) return 0;
  return def.price;
}

/** Built-in starter Voxel Blueprints players can stamp and then customize block-by-block! */
export const BUILTIN_VOXEL_BLUEPRINTS: VoxelBlueprint[] = [
  {
    id: 'bp-watchtower',
    name: '观景滑翔塔',
    createdAt: 0,
    blocks: [
      // 3x3 stone base + 4 red pillars up to y=4 + wooden deck + bounce pad + lanterns +青瓦 roof
      ...[-1, 0, 1].flatMap(x => [-1, 0, 1].map(z => ({x, y: 0, z, blockId: 'vx-bluestone', shape: 'cube' as VoxelShape}))),
      ...[1, 2, 3].flatMap(y => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => ({x, y, z, blockId: 'vx-pillar-red', shape: 'pillar' as VoxelShape}))),
      {x: 0, y: 1, z: 1, blockId: 'vx-wood-step', shape: 'stairs', rot: 0},
      {x: 0, y: 2, z: 0, blockId: 'vx-plank', shape: 'cube'},
      {x: 0, y: 3, z: -1, blockId: 'vx-wood-step', shape: 'stairs', rot: 2},
      ...[-1, 0, 1].flatMap(x => [-1, 0, 1].map(z => ({x, y: 4, z, blockId: 'vx-wood', shape: 'cube' as VoxelShape}))),
      {x: 0, y: 5, z: 0, blockId: 'vx-bounce', shape: 'slab'},
      {x: -1, y: 5, z: -1, blockId: 'vx-lantern', shape: 'lantern'},
      {x: 1, y: 5, z: 1, blockId: 'vx-lantern', shape: 'lantern'},
    ],
  },
  {
    id: 'bp-pasture-pen',
    name: '围栏放牧圈',
    createdAt: 0,
    blocks: (() => {
      const out: Omit<import('../life/state').VoxelBlockData, 'paidShells'>[] = [];
      for (let x = -3; x <= 3; x++) {
        for (let z = -3; z <= 3; z++) {
          if (Math.abs(x) === 3 || Math.abs(z) === 3) {
            out.push({x, y: 0, z, blockId: 'vx-fence', shape: 'fence'});
          }
        }
      }
      out.push({x: -3, y: 1, z: -3, blockId: 'vx-lantern', shape: 'lantern'});
      out.push({x: 3, y: 1, z: 3, blockId: 'vx-lantern', shape: 'lantern'});
      return out;
    })(),
  },
  {
    id: 'bp-teapavilion',
    name: '青瓦小轩',
    createdAt: 0,
    blocks: [
      ...[-1, 0, 1].flatMap(x => [-1, 0, 1].map(z => ({x, y: 0, z, blockId: 'vx-plank', shape: 'slab' as VoxelShape}))),
      ...[1, 2].flatMap(y => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => ({x, y, z, blockId: 'vx-pillar-red', shape: 'pillar' as VoxelShape}))),
      {x: 0, y: 1, z: -1, blockId: 'vx-plaster', shape: 'cube'},
      {x: 0, y: 2, z: -1, blockId: 'vx-glass', shape: 'cube'},
      ...[-1, 0, 1].map(x => ({x, y: 3, z: -1, blockId: 'vx-tile-roof', shape: 'slope' as VoxelShape, rot: 2})),
      ...[-1, 0, 1].map(x => ({x, y: 3, z: 0, blockId: 'vx-tile-roof', shape: 'cube' as VoxelShape})),
      ...[-1, 0, 1].map(x => ({x, y: 3, z: 1, blockId: 'vx-tile-roof', shape: 'slope' as VoxelShape, rot: 0})),
      {x: 0, y: 2, z: 1, blockId: 'vx-lantern', shape: 'lantern'},
    ],
  },
];
