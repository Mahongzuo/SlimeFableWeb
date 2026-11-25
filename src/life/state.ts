/**
 * Persistent casual-play & home-building state (farm, fishing, critters, home props, cultivation, habitats, unlocks).
 * Pure data, saved with the rest. Times are real-world milliseconds (Date.now()) so crops keep growing offline.
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
export interface DexEntry {n: number; first: number; /** biggest size (fish cm) or best time (park ms) */ best?: number}
export interface RequestState {id: string; item: string; count: number; reward: number; done: boolean}

export interface PlacedProp {
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
export interface HomeBuildState {
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
  /** Optional DreamWorld sandbox toggle: allows 0-cost infinite territory expansion. */
  sandboxFreeExpand?: boolean;
}

export interface LifeData {
  coins: number;
  bag: Record<string, number>;
  dex: Record<string, DexEntry>;
  plots: Record<string, PlotState | null>;
  requests: {day: string; list: RequestState[]} | null;
  records: Record<string, number>;
  home?: HomeBuildState;
}

export const freshHome = (): HomeBuildState => ({
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
});

export function ensureHome(life: LifeData): HomeBuildState {
  if (!life.home) life.home = freshHome();
  else {
    const base = freshHome();
    life.home = {
      ...base,
      ...life.home,
      bodyShape: 'dome',
      placed: Array.isArray(life.home.placed) ? life.home.placed : [],
      paving: Array.isArray(life.home.paving) ? life.home.paving : [],
      expansions: Array.isArray(life.home.expansions) ? life.home.expansions : [],
      unlocks: Array.isArray(life.home.unlocks) ? life.home.unlocks : [],
      visitors: life.home.visitors ?? {},
      souvenirSlots: life.home.souvenirSlots ?? {},
    };
  }
  return life.home;
}

export const freshLife = (): LifeData => ({coins: 0, bag: {}, dex: {}, plots: {}, requests: null, records: {}, home: freshHome()});
export function addItem(life: LifeData, id: string, n = 1) { life.bag[id] = (life.bag[id] ?? 0) + n; if (life.bag[id] <= 0) delete life.bag[id]; }
export function takeItem(life: LifeData, id: string, n = 1) { if ((life.bag[id] ?? 0) < n) return false; addItem(life, id, -n); return true; }
/** Returns true the first time something enters the collection book. */
export function record(life: LifeData, id: string, value?: number, better: 'max' | 'min' = 'max') {
  const e = life.dex[id], first = !e;
  if (!e) life.dex[id] = {n: 1, first: Date.now(), best: value};
  else { e.n++; if (value !== undefined && (e.best === undefined || (better === 'max' ? value > e.best : value < e.best))) e.best = value; }
  return first;
}
