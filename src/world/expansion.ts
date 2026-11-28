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
    desc: '木桩田栏围着野花草地，中央土路通往留给农床与果树的空地。',
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
    desc: '石栏、青石小径与岸边野花环绕莲池，垂柳下可寻池蛙与翠鸟。',
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
    desc: '疏桩横栏沿着草坡起伏，银杏和混色花带留出搭牧棚的空地。',
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
    desc: '沙丘绳栏分开花草与白沙，棕榈和岸礁间可寻岸蟹与海鸥。',
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
// Bound to the actual home's expansion list so previews and independent worlds stay isolated.
const sportSites = new WeakMap<ExpandedTile[], number>();
export function bindSportSite(tiles: ExpandedTile[], saved?:number, objects:ReadonlyArray<{x:number;z:number}>=[]) {
  const owned=tiles.map(slotForTile).filter((s):s is ExpansionSlot=>!!s);
  let gx=Number.isSafeInteger(saved)&&saved!>=1?saved!:1;
  if(saved!==gx) {
    while(owned.some(s=>s.gz>=0&&s.gz<=1&&s.gx>=gx&&s.gx<gx+4) ||
      objects.some(p=>p.z>=26&&p.z<=146&&p.x>=tileXBounds(gx)[0]-4&&p.x<=tileXBounds(gx+3)[1]+4)) gx++;
  }
  sportSites.set(tiles,gx);
  return gx;
}
export function sportLand(tiles:ExpandedTile[]) {
  const gx=sportSites.get(tiles);
  if(gx===undefined)return [];
  const minX=tileXBounds(gx)[0];
  const land=[{minX,minZ:30,maxX:minX+160,maxZ:142}];
  // Any intervening purchased ground already has its own surface.
  const owned=new Set(tiles.map(slotForTile).filter(Boolean).map(s=>tileKey(s!.gx,s!.gz)));
  for(let i=1;i<gx;i++)if(!owned.has(tileKey(i,0))){
    const [minX,maxX]=tileXBounds(i);land.push({minX,maxX,minZ:56,maxZ:61});
  }
  return land;
}
export function sportsGroundHeight(x:number,z:number) {
  // Reach the level lawn before the nearest authored plinth begins at x = 33.
  const t=Math.min(1,Math.max(0,(x-31)/2));
  return inland(31,Math.min(142,Math.max(30,z)))*(1-t)+.65*t;
}
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

  const reserved=new Set(preserveLayout(expansions).map(p=>tileKey(p.slot.gx,p.slot.gz)));
  const sports=sportSites.get(expansions);
  if(sports!==undefined)for(let x=1;x<sports+4;x++){
    reserved.add(tileKey(x,0));if(x>=sports)reserved.add(tileKey(x,1));
  }
  const candidates = new Map<string, {slot: ExpansionSlot; dist: number}>();
  for (const [gx, gz] of seeds) {
    for (const [dx, dz, edge] of DIRS) {
      const nx = gx + dx, nz = gz + dz;
      const k = tileKey(nx, nz);
      if (owned.has(k) || reserved.has(k) || isProtectedSeaCell(nx, nz)) continue;
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

export const preserveDefs=[
  {id:'redwoods',name:'原始森林',gx:-2,row:0,color:0x687f52,animals:['bear','bull-moose','great-horned-owl']},
  {id:'prairie',name:'风行草原',gx:-1,row:0,color:0xa8b76a,animals:['zebra','thomsons-gazelle','warthog']},
  {id:'marsh',name:'芦影沼泽',gx:0,row:0,color:0x788967,animals:['grey-heron','great-crested-grebe','mute-swan']},
  {id:'bamboo',name:'青竹溪谷',gx:-1,row:1,color:0x7e9c6d,animals:['chipmunk','house-sparrow','red-panda','pheasant']},
  {id:'alpine',name:'云顶花甸',gx:0,row:1,color:0x9aaf87,animals:['golden-eagle','goat']},
] as const;
export function preserveLayout(tiles:ExpandedTile[]){
  const owned=new Set(tiles.map(t=>slotForTile(t)).filter(Boolean).map(s=>tileKey(s!.gx,s!.gz)));
  // The first two northern rows include the original named expansion lots.
  let row=4;
  while(preserveDefs.some(d=>owned.has(tileKey(d.gx,row+d.row))))row++;
  return preserveDefs.map(d=>({...d,slot:makeExpansionSlot(d.gx,row+d.row)}));
}
export type PreserveRect={minX:number;minZ:number;maxX:number;maxZ:number; biome:string};
export function preserveRects(tiles:ExpandedTile[]):PreserveRect[]{
  const zones=preserveLayout(tiles);
  const out:PreserveRect[]=zones.map(({id,slot})=>({biome:id,minX:slot.min[0],maxX:slot.max[0],minZ:slot.min[1],maxZ:slot.max[1]}));
  const owned=new Set(tiles.map(t=>slotForTile(t)).filter(Boolean).map(s=>tileKey(s!.gx,s!.gz)));
  for(const [gx,x] of [[-2,-85],[0,23]])for(let gz=2;gz<zones[0].slot.gz;gz++){
    if(owned.has(tileKey(gx,gz)))continue;
    const [minZ,maxZ]=tileZBounds(gz);out.push({minX:x-7.4,maxX:x+7.4,minZ,maxZ,biome:'trail'});
  }
  return out;
}
export function preserveHeight(r:PreserveRect,x:number,z:number){
  const t=Math.max(0,Math.min(1,(z-WORLD.max[1])/14));
  const base=inland(x,WORLD.max[1])*(1-t)+.65*t;
  const edge=Math.min(x-r.minX,r.maxX-x,z-r.minZ,r.maxZ-z);
  const w=Math.max(0,Math.min(1,edge/6));const u=(x-r.minX)/(r.maxX-r.minX),v=(z-r.minZ)/(r.maxZ-r.minZ);
  if(r.biome==='trail')return base;
  const hills=Math.sin(u*Math.PI)*Math.sin(v*Math.PI);
  const h=r.biome==='alpine'?7*hills:r.biome==='bamboo'?-1.05*Math.exp(-Math.pow((u-.46)*8,2)):
    r.biome==='marsh'?-.92*hills+.24*Math.sin(x*.32+z*.2):r.biome==='prairie'?1.1*hills:.64*Math.sin(x*.22)*Math.cos(z*.15);
  return base+w*h;
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

/** Match the original island metre for metre on common axes. Beyond that band adjoining tiles share a 2 m lattice. */
export function expansionSegments(min:number,max:number,axis:0|1):number {
  const step=min>=WORLD.min[axis] && max<=WORLD.max[axis] ? 1 : 2;
  return Math.max(8,Math.round((max-min)/step));
}

/** Interpolates the same pair of triangles as the visible frontier mesh. */
export function expansionGroundAt(x: number, z: number, slot: ExpansionSlot, theme: ExpansionThemeId): number {
  const nx = expansionSegments(slot.min[0],slot.max[0],0);
  const nz = expansionSegments(slot.min[1],slot.max[1],1);
  const dx = (slot.max[0] - slot.min[0]) / nx, dz = (slot.max[1] - slot.min[1]) / nz;
  const gx = Math.max(0, Math.min(nx, (x - slot.min[0]) / dx)), gz = Math.max(0, Math.min(nz, (z - slot.min[1]) / dz));
  const ix = Math.min(nx - 1, Math.floor(gx)), iz = Math.min(nz - 1, Math.floor(gz));
  const fx = gx - ix, fz = gz - iz, x0 = slot.min[0] + ix * dx, z0 = slot.min[1] + iz * dz;
  const east = expansionHeight(x0 + dx, z0, slot, theme), south = expansionHeight(x0, z0 + dz, slot, theme);
  return fx + fz <= 1
    ? expansionHeight(x0, z0, slot, theme) * (1 - fx - fz) + east * fx + south * fz
    : expansionHeight(x0 + dx, z0 + dz, slot, theme) * (fx + fz - 1) + east * (1 - fz) + south * (1 - fx);
}

/** Shared road shoulders, beach and muddy lotus basin used by terrain, meadow and gardening. */
export function expansionSurfaceWeights(x: number, z: number, slot: ExpansionSlot, theme: ExpansionThemeId) {
  const w = slot.max[0] - slot.min[0], h = slot.max[1] - slot.min[1];
  const u = (x - slot.min[0]) / w, v = (z - slot.min[1]) / h;
  const basin = Math.hypot((u - .5) * 2.2, (v - .5) * 2.2);
  const path = Math.min(Math.abs(u - .5) * w, Math.abs(v - .5) * h);
  return {
    road: (theme === 'farmland' || (theme === 'jiangnan' && basin >= .72)) ? 1 - smoothstep(1.1, 2.15, path) : 0,
    sand: theme === 'coast' ? smoothstep(.55, .82, v) : 0,
    pond: theme === 'jiangnan' ? 1 - smoothstep(.45, .70, basin) : 0,
  };
}

/** Two short runs separated by a generous opening. Coordinates are inside each parcel. */
export function expansionFenceRuns(slot: ExpansionSlot,theme:ExpansionThemeId):[number,number][][] {
  const w=slot.max[0]-slot.min[0],h=slot.max[1]-slot.min[1];
  const mix=((Math.imul(slot.gx,31)^Math.imul(slot.gz,73))>>>0)%3;
  const alongX=theme==='coast'||mix!==1;
  const side=theme==='coast'?.67+(mix-1)*.035:mix===2?.86:.14;
  return [[.09,.34],[.66,.91]].map(([start,end])=>{
    const count=Math.max(2,Math.round((end-start)*(alongX?w:h)/2.7));
    return Array.from({length:count+1},(_,i)=>{
      const t=start+(end-start)*i/count;
      const bend=(theme==='coast'?.039:theme==='meadow'?.021:.009)*Math.sin(Math.PI*i/count)*(mix===2?-1:1);
      return [slot.min[0]+w*(alongX?t:side+bend),slot.min[1]+h*(alongX?side+bend:t)] as [number,number];
    });
  });
}

/** CollisionWorld and the worker use the same grid vertices as the visible parcel. */
export function buildExpansionSurface(tile: ExpandedTile): GroundSurface | null {
  const slot = slotForTile(tile);
  if (!slot) return null;
  const spanX = slot.max[0] - slot.min[0];
  const spanZ = slot.max[1] - slot.min[1];
  const segX = expansionSegments(slot.min[0],slot.max[0],0);
  const segZ = expansionSegments(slot.min[1],slot.max[1],1);
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

/** Computes expanded CollisionWorld bounds enclosing base WORLD + unlocked tiles + coastal ocean & dive depth. */
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
  return {min: [minX - 72, -24, minZ - 72], max: [maxX + 72, 65, maxZ + 72]};
}
