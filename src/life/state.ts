/**
 * Persistent casual-play & home-building state (farm, fishing, critters, home props, cultivation,
 * habitats, unlocks, artisan machines, voxel-craft blocks, ranching, encounters, time museum, buffs).
 * Pure data, saved with the rest. Times are real-world milliseconds (Date.now()) so crops & machines keep progressing offline.
 */
/** `watered`: when the soil dries again; `wetFrom`: start of the current wet spell; `grown`: growth ms banked before it. */
export interface PlotState {
  crop: string;
  planted: number;
  watered: number;
  grown: number;
  wetFrom?: number;
  ripeSince?: number;
  weeds?: boolean;
  /** Fire element warmth boost (+35% growth speed). */
  warmBoost?: boolean;
  /** Steam greenhouse boost (Water + Fire combo, +45% extra growth speed). */
  steamUntil?: number;
  /** Soil fertility 0..1 (Dark/Physical boost; >=0.5 grants +1 bonus harvest). */
  fertility?: number;
  /** Last elemental strike on this plot (8s reaction window). */
  recentElement?: {el: number; at: number};
  /** Wind element pollination rolled a rare mutated variant. */
  variant?: 'normal' | 'rare';
  /** True once wind pollination has been attempted on this planting. */
  pollinated?: boolean;
}
export interface DexEntry { starlight?: boolean;n: number; first: number; /** biggest size (fish cm) or best time (park ms) */ best?: number}
export interface RequestState {id: string; item: string; count: number; reward: number; done: boolean}

export interface PlacedProp {
  nativeFootprint?: {width:number;depth:number;name:string};
  paidShells?: number;
  id: string;
  itemId: string;
  x: number;
  z: number;
  y: number;
  yaw: number;
  scale: number;
}

export type DailyHomeTaskKind = 'water' | 'element' | 'build' | 'visit' | 'harvest';
export interface DailyHomeTask {
  id: string;
  kind: DailyHomeTaskKind;
  title: string;
  target: number;
  progress: number;
  rewardCoins: number;
  rewardXp: number;
  done: boolean;
}

export interface VisitorRecord {
  count: number;
  first: number;
  fed: number;
  lastGiftDay?: string;
}

export type ExpansionThemeId = 'farmland' | 'jiangnan' | 'meadow' | 'coast';
export interface ExpandedTile {
  id: string;
  gx: number;
  gz: number;
  theme: ExpansionThemeId;
  unlockedAt: number;
}

export type GroundFinish = 'stone' | 'earth' | 'border';
export interface GroundTile {x: number; z: number; finish: GroundFinish}

/** Artisan machine / interactive POI active production slot. */
export interface MachineSlotState {
  machineKind: string;
  recipeId: string;
  outputId: string;
  outputCount: number;
  startedAt: number;
  durationMs: number;
  /** Accumulated element boost progress in ms. */
  boostedMs: number;
  boostCount: number;
  /** Gold quality bonus (+50% sell value or +1 output) triggered by preferred element boost. */
  goldStar?: boolean;
}

/** Single placed storybook voxel block (1m grid coordinates, integer gx/gy/gz). */
export type VoxelShape = 'cube' | 'slab' | 'slope' | 'stairs' | 'pillar' | 'fence' | 'lantern' | 'water';
export interface VoxelBlockData {
  x: number;
  y: number;
  z: number;
  blockId: string;
  shape?: VoxelShape;
  /** Quarter-turn yaw 0..3 (0, 90, 180, 270 deg). */
  rot?: number;
  /** Optional custom tint hex unlocked by Master Craft Hall. */
  tint?: number;
  paidShells?: number;
}

export interface VoxelBlueprint {
  id: string;
  name: string;
  blocks: Omit<VoxelBlockData, 'paidShells'>[];
  createdAt: number;
}

/** Adopted animal residing in a player ranch / fenced pen. */
export interface AdoptedAnimal {
  id: string;
  speciesId: string;
  name: string;
  adoptedAt: number;
  /** Affection 0..500 (100 per heart, max 5 hearts). */
  affection: number;
  /** Mood 0..100. */
  mood: number;
  lastFedDay?: string;
  lastPetDay?: string;
  lastProduceDay?: string;
  /** Optional home prop ID (coop/barn) or 'free' for voxel-fenced pasture. */
  homeId?: string;
  /** True when the animal is currently set to follow the slime around Home. */
  following?: boolean;
  care?: {born: number; due: number; reserve: number; rescueMs: number; notified: boolean};
  station?: [number, number];
}

export interface RanchState {
  starter?: 'later' | 'claimed';
  memorials?: {id: string; speciesId: string; name: string; at: number}[];
  animals: AdoptedAnimal[];
  /** Species IDs discovered & befriended in wild encounters (unlocks adoption). */
  discovered: string[];
  /** Daily encounter seed date (YYYY-MM-DD) & already-claimed encounter spot IDs. */
  encounterDay?: string;
  claimedEncounters: string[];
}

export interface FishPondState {
  fishId: string;
  count: number;
  capacity: number;
  /** Last real-world day YYYY-MM-DD when roe/treasure was collected. */
  lastCollectDay?: string;
  /** Last timestamp ms when population grew. */
  lastGrowAt: number;
  /** Current wish item ID needed to expand capacity (3 -> 5 -> 7 -> 10). */
  wishItem?: string;
  wishCount?: number;
}

export interface FishingProgressState {
  lure?: number;
  /** 1: 竹竿, 2: 碳素元素竿, 3: 沧溟星竿 */
  rodTier: number;
  bobberId: string | null;
  ponds: Record<string, FishPondState>;
  treasuresFound: number;
}

export type BuffEffect =
  | 'fishing_bar'
  | 'rare_encounter'
  | 'artisan_speed'
  | 'glide_lift'
  | 'harvest_luck'
  | 'move_speed';

export interface ActiveBuff {
  id: string;
  foodId: string;
  effect: BuffEffect;
  label: string;
  until: number;
}

export interface HomeBuildState {
  trees: import('./orchard').OrchardTree[];
  nativeTreeHarvests: Record<string, number>;
  gardenTerrain?: 1;
  paving: GroundTile[];
  placed: PlacedProp[];
  expansions: ExpandedTile[];
  xp: number;
  level: number;
  unlocks: string[];
  daily: {day: string; tasks: DailyHomeTask[]; claimedBonus: boolean} | null;
  visitors: Record<string, VisitorRecord>;
  souvenirSlots: Record<string, string>;
  /** Lightning-charged sprinkler/greenhouse keeps plots watered until this timestamp (ms). */
  sprinklerChargedUntil: number;
  bodyShape: 'dome' | 'ball';
  /** Remembers the last seed chosen in the Seed Picker for 1-click replanting. */
  lastSeed?: string;
  /** Optional creative sandbox toggle: allows 0-cost infinite territory expansion. */
  sandboxFreeExpand?: boolean;
  /** Active artisan processing machines keyed by PlacedProp.id (or native POI id). */
  machines?: Record<string, MachineSlotState>;
  /** Storybook Voxel-Craft blocks placed across buildable territory. */
  voxels?: VoxelBlockData[];
  /** Saved player voxel blueprints. */
  voxelBlueprints?: VoxelBlueprint[];
  /** Ranching & wild encounter state. */
  ranch?: RanchState;
  /** Time Museum 6-hall donation slots (hallId -> array of donated slotIds). */
  museum?: Record<string, string[]>;
  /** Upgraded fishing rods, bobbers, ponds & treasure counter. */
  fishing?: FishingProgressState;
  /** Active food buffs with real-world expiry timestamps. */
  activeBuffs?: ActiveBuff[];
  /** Daily tide drift bottle claims. */
  driftBottles?: {day: string; claimed: number; notes: string[]} | null;
  /** Active hot spring heat expiry timestamp (ms). */
  hotSpringUntil?: number;
  /** Last day a weather prayer was offered at the Time Observatory / Chime. */
  lastStargazeDay?: string;
}

export interface LifeData {
  sailing?: import('./voyage').SailingLog;
  earnedShells?: number;
  capacityFloor?: number;
  cottage?: {ninglu?:boolean; furnished?: boolean; furniture: {id: string; kind: string; x: number; z: number; turn: number; stored?: boolean}[]; plants: {asset: string; x: number; z: number}[]};
  coins: number;
  bag: Record<string, number>;
  dex: Record<string, DexEntry>;
  plots: Record<string, PlotState | null>;
  requests: {day: string; list: RequestState[]} | null;
  records: Record<string, number>;
  home?: HomeBuildState;
}

export const freshRanch = (): RanchState => ({
  animals: [],
  discovered: [],
  claimedEncounters: [],
});

export const freshFishing = (): FishingProgressState => ({
  rodTier: 1,
  bobberId: null,
  ponds: {},
  treasuresFound: 0,
});

export const freshHome = (): HomeBuildState => ({
  trees: [],
  nativeTreeHarvests: {},
  paving: [],
  placed: [],
  expansions: [],
  xp: 0,
  level: 1,
  unlocks: [],
  daily: null,
  visitors: {},
  souvenirSlots: {},
  sprinklerChargedUntil: 0,
  bodyShape: 'dome',
  machines: {},
  voxels: [],
  voxelBlueprints: [],
  ranch: freshRanch(),
  museum: {},
  fishing: freshFishing(),
  activeBuffs: [],
  driftBottles: null,
  hotSpringUntil: 0,
});

export function ensureHome(life: LifeData): HomeBuildState {
  if (!life.home) life.home = freshHome();
  else {
    const base = freshHome();
    const rawRanch = life.home.ranch;
    const rawFishing = life.home.fishing;
    life.home = {
      ...base,
      ...life.home,
      trees: Array.isArray(life.home.trees) ? life.home.trees : [],
      nativeTreeHarvests: life.home.nativeTreeHarvests ?? {},
      bodyShape: 'dome',
      placed: Array.isArray(life.home.placed) ? life.home.placed : [],
      paving: Array.isArray(life.home.paving) ? life.home.paving : [],
      expansions: Array.isArray(life.home.expansions) ? life.home.expansions : [],
      unlocks: Array.isArray(life.home.unlocks) ? life.home.unlocks : [],
      visitors: life.home.visitors ?? {},
      souvenirSlots: life.home.souvenirSlots ?? {},
      machines: life.home.machines && typeof life.home.machines === 'object' ? life.home.machines : {},
      voxels: Array.isArray(life.home.voxels) ? life.home.voxels : [],
      voxelBlueprints: Array.isArray(life.home.voxelBlueprints) ? life.home.voxelBlueprints : [],
      ranch: {
        ...rawRanch,
        animals: Array.isArray(rawRanch?.animals) ? rawRanch.animals : [],
        discovered: Array.isArray(rawRanch?.discovered) ? rawRanch.discovered : [],
        encounterDay: rawRanch?.encounterDay,
        claimedEncounters: Array.isArray(rawRanch?.claimedEncounters) ? rawRanch.claimedEncounters : [],
      },
      museum: life.home.museum && typeof life.home.museum === 'object' ? life.home.museum : {},
      fishing: {
        rodTier: typeof rawFishing?.rodTier === 'number' && rawFishing.rodTier >= 1 ? rawFishing.rodTier : 1,
        lure: Math.max(0,Math.min(2,Math.floor(rawFishing?.lure ?? 0))),
        bobberId: rawFishing?.bobberId ?? null,
        ponds: rawFishing?.ponds && typeof rawFishing.ponds === 'object' ? rawFishing.ponds : {},
        treasuresFound: typeof rawFishing?.treasuresFound === 'number' ? rawFishing.treasuresFound : 0,
      },
      activeBuffs: Array.isArray(life.home.activeBuffs) ? life.home.activeBuffs : [],
      driftBottles: life.home.driftBottles ?? null,
      hotSpringUntil: typeof life.home.hotSpringUntil === 'number' ? life.home.hotSpringUntil : 0,
    };
  }
  return life.home;
}

export const freshLife = (): LifeData => ({coins: 0, bag: {}, dex: {}, plots: {}, requests: null, records: {}, home: freshHome()});
export function addItem(life: LifeData, id: string, n = 1) { life.bag[id] = (life.bag[id] ?? 0) + n; if (life.bag[id] <= 0) delete life.bag[id]; }
export function takeItem(life: LifeData, id: string, n = 1) { if ((life.bag[id] ?? 0) < n) return false; addItem(life, id, -n); return true; }
export function observeFish(life:LifeData,id:string){
  if(life.dex[id])return false;
  life.dex[id]={n:0,first:Date.now()};return true;
}
/** Returns true the first time something enters the collection book. */
export function record(life: LifeData, id: string, value?: number, better: 'max' | 'min' = 'max') {
  const e = life.dex[id], first = !e;
  if (!e) life.dex[id] = {n: 1, first: Date.now(), best: value};
  else { e.n++; if (value !== undefined && (e.best === undefined || (better === 'max' ? value > e.best : value < e.best))) e.best = value; }
  return first;
}
