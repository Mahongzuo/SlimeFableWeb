import type {ExpandedTile, ExpansionThemeId} from '../life/state';
import type {GroundSurface} from '../slime/world';
import type {Vec} from '../slime/types';
import {inland, WORLD} from './map';

export interface ExpansionThemeDef {
  id: ExpansionThemeId;
  name: string;
  icon: string;
  grassHex: number;
  accentHex: number;
  pathHex: number;
  desc: string;
  /** Built-in natural props spawned visually & counted toward ecology bonuses. */
  naturalProps: {asset: string; u: number; v: number; width: number; yaw: number; tags: string[]}[];
}

export const EXPANSION_THEMES: Record<ExpansionThemeId, ExpansionThemeDef> = {
  farmland: {
    id: 'farmland',
    name: '沃土农庄',
    icon: '🌾',
    grassHex: 0xa4c56e,
    accentHex: 0x8bb056,
    pathHex: 0xc9ab7c,
    desc: '开阔平坦的肥沃田园，最适合成排摆放农田与温室。',
    naturalProps: [
      {asset: 'nature-fern', u: 0.16, v: 0.18, width: 1.5, yaw: 0.4, tags: ['plant']},
      {asset: 'nature-fern', u: 0.84, v: 0.82, width: 1.5, yaw: 2.1, tags: ['plant']},
      {asset: 'pack-ginkgo', u: 0.86, v: 0.16, width: 3.2, yaw: 0.9, tags: ['tree']},
    ],
  },
  jiangnan: {
    id: 'jiangnan',
    name: '江南水乡',
    icon: '🏮',
    grassHex: 0x8ab978,
    accentHex: 0x6ea068,
    pathHex: 0xbcb7a8,
    desc: '青石小径配垂柳与莲池浅湾，天然吸引青莲池蛙与碧羽翠鸟。',
    naturalProps: [
      {asset: 'nature-willow', u: 0.22, v: 0.24, width: 3.8, yaw: 0.5, tags: ['tree', 'water', 'jiangnan']},
      {asset: 'waterside-lily', u: 0.50, v: 0.48, width: 1.8, yaw: 0.8, tags: ['water', 'lily', 'flower']},
      {asset: 'waterside-reeds', u: 0.58, v: 0.56, width: 2.0, yaw: 1.4, tags: ['water', 'reeds']},
      {asset: 'nature-bamboo', u: 0.82, v: 0.25, width: 2.4, yaw: 0.2, tags: ['tree', 'bamboo', 'jiangnan']},
    ],
  },
  meadow: {
    id: 'meadow',
    name: '林缘牧场',
    icon: '🌲',
    grassHex: 0x8bc26e,
    accentHex: 0x6ea458,
    pathHex: 0xcbb485,
    desc: '舒缓绿坡与银杏林缘，适合搭牧场木棚和大风车，吸引梅花鹿。',
    naturalProps: [
      {asset: 'pack-ginkgo', u: 0.20, v: 0.22, width: 3.6, yaw: 0.3, tags: ['tree', 'pasture']},
      {asset: 'nature-wisteria', u: 0.80, v: 0.24, width: 3.2, yaw: 1.3, tags: ['tree', 'flower', 'wisteria']},
      {asset: 'nature-fern', u: 0.26, v: 0.78, width: 1.6, yaw: 0.9, tags: ['plant', 'forest']},
      {asset: 'pack-ginkgo', u: 0.78, v: 0.78, width: 3.4, yaw: 2.5, tags: ['tree', 'pasture']},
    ],
  },
  coast: {
    id: 'coast',
    name: '潮汐花岬',
    icon: '🏖️',
    grassHex: 0xc2cf7a,
    accentHex: 0xe6d5a3,
    pathHex: 0xeadab0,
    desc: '暖阳白沙与潮池礁石，适合立灯塔与棕榈林，吸引岸蟹与海鸥。',
    naturalProps: [
      {asset: 'nature-palm', u: 0.22, v: 0.24, width: 3.0, yaw: 0.4, tags: ['tree', 'coast']},
      {asset: 'nature-palm', u: 0.78, v: 0.26, width: 2.8, yaw: 1.9, tags: ['tree', 'coast']},
      {asset: 'tidal-rocks', u: 0.52, v: 0.76, width: 2.6, yaw: 0.7, tags: ['coast', 'tidal']},
      {asset: 'waterside-shore-stones', u: 0.24, v: 0.74, width: 2.2, yaw: 1.2, tags: ['water', 'stone']},
    ],
  },
};

export const EXPANSION_THEME_LIST: ExpansionThemeDef[] = [
  EXPANSION_THEMES.farmland,
  EXPANSION_THEMES.jiangnan,
  EXPANSION_THEMES.meadow,
  EXPANSION_THEMES.coast,
];

export interface ExpansionSlot {
  id: string;
  name: string;
  gx: number;
  gz: number;
  min: [number, number];
  max: [number, number];
  connectEdge: 'south' | 'north' | 'east' | 'west';
}

export const TILE_SIZE = 40;
export const EXPANSION_COST_CAP = 50;

/** Exact non-overlapping X bounds for any integer grid coordinate gx (-∞..+∞). */
export function tileXBounds(gx: number): [number, number] {
  if (gx === -2) return [-106, -66];
  if (gx === -1) return [-66, -26];
  if (gx === 0) return [-26, 31];
  if (gx >= 1) return [31 + (gx - 1) * TILE_SIZE, 31 + gx * TILE_SIZE];
  // gx <= -3: extends infinitely west from -106
  return [-106 + (gx + 2) * TILE_SIZE, -106 + (gx + 3) * TILE_SIZE];
}

/** Exact non-overlapping Z bounds for any integer grid coordinate gz (-∞..+∞). */
export function tileZBounds(gz: number): [number, number] {
  if (gz === -1) return [-31, 30];
  if (gz === 0) return [30, 86];
  if (gz === 1) return [86, 142];
  if (gz >= 2) return [142 + (gz - 2) * TILE_SIZE, 142 + (gz - 1) * TILE_SIZE];
  // gz <= -2: extends south from -31
  return [-31 + (gz + 1) * TILE_SIZE, -31 + (gz + 2) * TILE_SIZE];
}

export function isBaseCell(gx: number, gz: number): boolean {
  return gx >= -2 && gx <= 0 && gz >= -1 && gz <= 1;
}

/** Preserves the open harbor lighthouse sea channel south/east of the pier; all other directions expand infinitely! */
export function isProtectedSeaCell(gx: number, gz: number): boolean {
  if (gz <= -1 && gx >= 1) return true;
  if (gz <= -2 && gx >= -2) return true;
  return false;
}

export const tileKey = (gx: number, gz: number) => `tile_${gx}_${gz}`;

/** Backward-compatible mapping for Round 2 named slots so older saves migrate cleanly. */
const LEGACY_TO_COORD: Record<string, [number, number, string]> = {
  'exp-n-w': [-2, 2, '北林西境'],
  'exp-n-c': [-1, 2, '镜湖北岸'],
  'exp-n-e': [0, 2, '翠湖花坡'],
  'exp-n2-w': [-2, 3, '远松原野'],
  'exp-n2-c': [-1, 3, '云溪高坪'],
  'exp-n2-e': [0, 3, '北望山岬'],
  'exp-w-s': [-3, -1, '西岭梯田外苑'],
  'exp-w-m': [-3, 0, '西麓果林'],
  'exp-w-n': [-3, 1, '西松溪谷'],
  'exp-e-s': [1, 0, '风车东坡'],
  'exp-e-n': [1, 1, '东湖望海岬'],
  'exp-e-ne': [1, 2, '东北星岬'],
};

const COORD_TO_LEGACY_NAME: Record<string, string> = Object.fromEntries(
  Object.values(LEGACY_TO_COORD).map(([gx, gz, name]) => [tileKey(gx, gz), name]),
);

function autoNameForCell(gx: number, gz: number): string {
  const named = COORD_TO_LEGACY_NAME[tileKey(gx, gz)];
  if (named) return named;
  const dir = gz >= 2
    ? (gx <= -3 ? '西北原野' : gx >= 1 ? '东北星岬' : '北境旷野')
    : gx <= -3
      ? (gz <= -2 ? '西南高地' : '西境青原')
      : '东岬海原';
  return `${dir} (${gx},${gz})`;
}

/** Builds an ExpansionSlot for any infinite integer grid cell (gx, gz). */
export function makeExpansionSlot(gx: number, gz: number, connectEdge: 'south' | 'north' | 'east' | 'west' = 'south', customId?: string): ExpansionSlot {
  const [x0, x1] = tileXBounds(gx);
  const [z0, z1] = tileZBounds(gz);
  return {
    id: customId ?? tileKey(gx, gz),
    name: autoNameForCell(gx, gz),
    gx,
    gz,
    min: [x0, z0],
    max: [x1, z1],
    connectEdge,
  };
}

/** Resolves either a legacy `exp-*` ID or any infinite `tile_gx_gz` ID into its exact ExpansionSlot. */
export function resolveExpansionSlot(id: string): ExpansionSlot | null {
  const leg = LEGACY_TO_COORD[id];
  if (leg) {
    const [gx, gz] = leg;
    const edge = gz >= 2 ? 'south' : gx <= -3 ? 'east' : 'west';
    return makeExpansionSlot(gx, gz, edge, id);
  }
  const m = /^tile_(-?\d+)_(-?\d+)$/.exec(id);
  if (!m) return null;
  const gx = Number(m[1]), gz = Number(m[2]);
  if (!Number.isSafeInteger(gx) || !Number.isSafeInteger(gz) || isBaseCell(gx, gz) || isProtectedSeaCell(gx, gz)) {
    return null;
  }
  const edge = gz >= 2 ? 'south' : gx <= -3 ? 'east' : gx >= 1 ? 'west' : 'north';
  return makeExpansionSlot(gx, gz, edge, id);
}

/** Resolves an ExpandedTile (supporting legacy & infinite IDs) into its canonical grid coordinates & slot. */
export function slotForTile(tile: Pick<ExpandedTile, 'id' | 'gx' | 'gz'>): ExpansionSlot | null {
  const byId = resolveExpansionSlot(tile.id);
  if (byId) return byId;
  if (Number.isSafeInteger(tile.gx) && Number.isSafeInteger(tile.gz) && !isBaseCell(tile.gx, tile.gz)) {
    return makeExpansionSlot(tile.gx, tile.gz);
  }
  return null;
}

/** Legacy exports preserved for compatibility with existing callers/tests. */
export const EXPANSION_SLOTS: ExpansionSlot[] = Object.keys(LEGACY_TO_COORD).map(id => resolveExpansionSlot(id)!);
export const EXPANSION_SLOT_MAP: Record<string, ExpansionSlot> = Object.fromEntries(
  EXPANSION_SLOTS.map(s => [s.id, s]),
);

/** Gentle capped progression: 1st tile FREE, then 20 / 35 / 50🐚 forever (or 0 in Sandbox Free mode). */
export function expansionCost(unlockedCount: number, sandboxFree = false): number {
  if (sandboxFree || unlockedCount <= 0) return 0;
  return Math.min(EXPANSION_COST_CAP, 20 + (unlockedCount - 1) * 15);
}

const DIRS: [number, number, 'south' | 'north' | 'east' | 'west'][] = [
  [0, 1, 'south'],  // north neighbor connects along its south edge
  [0, -1, 'north'], // south neighbor connects along its north edge
  [-1, 0, 'east'],  // west neighbor connects along its east edge
  [1, 0, 'west'],   // east neighbor connects along its west edge
];

/**
 * DreamWorld-style infinite dynamic frontier:
 * Walks all owned cells (base 3x3 + every unlocked tile), finds every adjacent empty cell,
 * and returns the nearest `maxCount` frontier tiles to `focusXZ` (supports unlimited expansion!).
 */
export function computeDynamicFrontier(
  expansions: ExpandedTile[],
  focusXZ: [number, number] = [-30, 142],
  maxCount = 8,
): ExpansionSlot[] {
  const owned = new Set<string>();
  const seeds: [number, number][] = [];
  for (let gx = -2; gx <= 0; gx++) {
    for (let gz = -1; gz <= 1; gz++) {
      owned.add(tileKey(gx, gz));
      seeds.push([gx, gz]);
    }
  }
  for (const tile of expansions) {
    const s = slotForTile(tile);
    if (!s) continue;
    const k = tileKey(s.gx, s.gz);
    if (!owned.has(k)) {
      owned.add(k);
      seeds.push([s.gx, s.gz]);
    }
  }

  const candidates = new Map<string, {slot: ExpansionSlot; dist: number}>();
  for (const [gx, gz] of seeds) {
    for (const [dx, dz, edge] of DIRS) {
      const nx = gx + dx, nz = gz + dz;
      const k = tileKey(nx, nz);
      if (owned.has(k) || isProtectedSeaCell(nx, nz)) continue;
      if (candidates.has(k)) continue;
      const slot = makeExpansionSlot(nx, nz, edge, k);
      const cx = (slot.min[0] + slot.max[0]) * 0.5;
      const cz = (slot.min[1] + slot.max[1]) * 0.5;
      const dist = Math.hypot(cx - focusXZ[0], cz - focusXZ[1]);
      candidates.set(k, {slot, dist});
    }
  }

  return [...candidates.values()]
    .sort((a, b) => a.dist - b.dist)
    .slice(0, maxCount)
    .map(c => c.slot);
}

/** Compatibility helper returning frontier slots around the north/west/east default focus. */
export function computeFrontierSlots(expansions: ExpandedTile[], focusXZ?: [number, number], maxCount = 10): ExpansionSlot[] {
  return computeDynamicFrontier(expansions, focusXZ ?? [-30, 142], maxCount);
}

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Shared seamless elevation along every expansion boundary (works for infinite gx/gz):
 * - At any edge touching base WORLD, d = 0 => exact match with inland(x, z) to 0.000 m.
 * - Along any shared edge between two infinite tiles, interior = 0 => exact 0.000 m match across ANY themes!
 */
export function expansionHeight(x: number, z: number, slot: ExpansionSlot, theme: ExpansionThemeId): number {
  const cx = Math.max(WORLD.min[0], Math.min(WORLD.max[0], x));
  const cz = Math.max(WORLD.min[1], Math.min(WORLD.max[1], z));
  const edgeH = inland(cx, cz);
  const dWorld = Math.hypot(x - cx, z - cz);
  const baseH = edgeH + (0.65 - edgeH) * smoothstep(0, 14, dWorld);

  const distEdge = Math.min(x - slot.min[0], slot.max[0] - x, z - slot.min[1], slot.max[1] - z);
  const interior = smoothstep(0, 7, distEdge);
  if (interior <= 0) return baseH;

  const u = (x - slot.min[0]) / (slot.max[0] - slot.min[0]);
  const v = (z - slot.min[1]) / (slot.max[1] - slot.min[1]);
  let delta = 0;
  if (theme === 'farmland') {
    delta = 0.08 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
  } else if (theme === 'jiangnan') {
    const pondD = Math.hypot((u - 0.5) * 2.2, (v - 0.5) * 2.2);
    delta = -0.35 * (1 - smoothstep(0.25, 0.72, pondD));
  } else if (theme === 'meadow') {
    delta = 0.85 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI) + 0.38 * Math.sin(x * 0.14) * Math.cos(z * 0.13);
  } else {
    delta = 0.42 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI) - 0.22 * smoothstep(0.55, 0.95, v);
  }
  return baseH + delta * interior;
}

/** Builds a lightweight 2m-step GroundSurface for CollisionWorld & sim.worker.ts (scales effortlessly to 50+ tiles). */
export function buildExpansionSurface(tile: ExpandedTile): GroundSurface | null {
  const slot = slotForTile(tile);
  if (!slot) return null;
  const spanX = slot.max[0] - slot.min[0];
  const spanZ = slot.max[1] - slot.min[1];
  const segX = Math.max(8, Math.round(spanX / 2));
  const segZ = Math.max(8, Math.round(spanZ / 2));
  const w = segX + 1;
  const h = segZ + 1;
  const values: number[] = [];
  for (let j = 0; j < h; j++) {
    const z = slot.min[1] + (spanZ * j) / segZ;
    for (let i = 0; i < w; i++) {
      const x = slot.min[0] + (spanX * i) / segX;
      values.push(expansionHeight(x, z, slot, tile.theme));
    }
  }
  return {min: slot.min, max: slot.max, height: 0, grid: {width: w, height: h, values}};
}

/** True when (x, z) lies inside base Home WORLD or any unlocked infinite expansion territory. */
export function isInsideHomeTerritory(x: number, z: number, expansions: ExpandedTile[] = [], inset = 2.5): boolean {
  const slots = expansions.map(e => slotForTile(e)).filter((s): s is ExpansionSlot => !!s);
  const pointIn = (px: number, pz: number) => {
    if (px >= WORLD.min[0] && px <= WORLD.max[0] && pz >= WORLD.min[1] && pz <= WORLD.max[1]) return true;
    for (const slot of slots) {
      if (px >= slot.min[0] && px <= slot.max[0] && pz >= slot.min[1] && pz <= slot.max[1]) return true;
    }
    return false;
  };
  if (!pointIn(x, z)) return false;
  if (inset <= 0) return true;
  return pointIn(x + inset, z) && pointIn(x - inset, z) && pointIn(x, z + inset) && pointIn(x, z - inset);
}

/** Computes expanded CollisionWorld bounds enclosing base WORLD + all unlocked infinite tiles. */
export function computeExpandedBounds(expansions: ExpandedTile[]): {min: Vec; max: Vec} {
  let minX = WORLD.min[0], maxX = WORLD.max[0], minZ = WORLD.min[1], maxZ = WORLD.max[1];
  for (const e of expansions) {
    const slot = slotForTile(e);
    if (!slot) continue;
    minX = Math.min(minX, slot.min[0]);
    maxX = Math.max(maxX, slot.max[0]);
    minZ = Math.min(minZ, slot.min[1]);
    maxZ = Math.max(maxZ, slot.max[1]);
  }
  return {min: [minX - 2, -9, minZ - 2], max: [maxX + 2, 42, maxZ + 2]};
}
