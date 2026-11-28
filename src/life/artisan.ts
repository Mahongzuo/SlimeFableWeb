import {changeShells} from './shell-wallet';
import {ITEMS} from './catalog';
import {hasBuff} from './cooking';
import {addItem, ensureHome, record, takeItem, type LifeData, type MachineSlotState, type PlacedProp} from './state';

/**
 * Artisan Processing & Interactive POI Machine Engine.
 * Turns raw crops, fish and animal products into 2.5x-4x value handmade goods,
 * deeply linked with the Slime's 6 elements for active acceleration & gold-star quality.
 */
export type MachineKind = 'watermill' | 'teahall' | 'keg' | 'kiln' | 'beehive' | 'preserver' | 'loom';

export interface ArtisanRecipe {
  id: string;
  machine: MachineKind;
  name: string;
  inputId: string;
  inputCount: number;
  extraInputId?: string;
  extraInputCount?: number;
  outputId: string;
  outputCount: number;
  durationMs: number;
  /** Preferred element (0 Water, 1 Wind, 2 Fire, 3 Lightning, 4 Dark, 5 Physical) grants gold star & 40% boost. */
  preferredElement: number;
}

export const MACHINE_NAMES: Record<MachineKind, {name: string; icon: string; elementHint: string}> = {
  watermill: {name: '溪畔水磨坊', icon: '⚙️', elementHint: '水/风属性可推动水轮大幅提速'},
  teahall: {name: '临水炒茶坊', icon: '🍵', elementHint: '火属性控温焙炒可得金标特级茶'},
  keg: {name: '凝露酿造桶', icon: '🏺', elementHint: '暗/水属性温润发酵提速'},
  kiln: {name: '窑烤面包房', icon: '🔥', elementHint: '火属性旺炉直推 40% 进度'},
  beehive: {name: '庭院蜂箱', icon: '🐝', elementHint: '自动采周边 9m 花卉酿造对应花蜜'},
  preserver: {name: '古法腌渍缸', icon: '🥫', elementHint: '物/水属性压实入味，做顶级鱼子酱与奶酪'},
  loom: {name: '云绒织布机', icon: '🧶', elementHint: '风/雷属性穿梭织锦提速'},
};

/** Maps a PlacedProp.itemId to its artisan MachineKind (if any). */
export const PROP_TO_MACHINE: Record<string, MachineKind> = {
  'watermill': 'watermill',
  'build-teahall': 'teahall',
  'poi-keg': 'keg',
  'poi-kiln': 'kiln',
  'poi-beehive': 'beehive',
  'poi-preserver': 'preserver',
  'poi-loom': 'loom',
};

const MIN = 60_000;

export const ARTISAN_RECIPES: ArtisanRecipe[] = [
  // Watermill
  {id: 'mill-flour', machine: 'watermill', name: '磨制精面粉', inputId: 'crop-wheat', inputCount: 2, outputId: 'art-flour', outputCount: 2, durationMs: 4 * MIN, preferredElement: 0},
  {id: 'mill-rice', machine: 'watermill', name: '碾磨江南晶米', inputId: 'crop-rice', inputCount: 2, outputId: 'art-polished-rice', outputCount: 2, durationMs: 4 * MIN, preferredElement: 0},
  {id: 'mill-coffee', machine: 'watermill', name: '研磨手冲咖啡', inputId: 'crop-coffee', inputCount: 1, outputId: 'art-roast-coffee', outputCount: 1, durationMs: 6 * MIN, preferredElement: 2},
  // Teahall
  {id: 'tea-longjing', machine: 'teahall', name: '炒制明前龙井', inputId: 'crop-tea', inputCount: 2, outputId: 'art-longjing-tea', outputCount: 1, durationMs: 5 * MIN, preferredElement: 2},
  {id: 'tea-wisteria', machine: 'teahall', name: '焙制紫藤花茶', inputId: 'crop-wisteria', inputCount: 1, extraInputId: 'crop-tea', extraInputCount: 1, outputId: 'art-wisteria-tea', outputCount: 1, durationMs: 7 * MIN, preferredElement: 2},
  {id: 'tea-starlight', machine: 'teahall', name: '精制星露冷萃', inputId: 'crop-starlight', inputCount: 1, outputId: 'art-starlight-tea', outputCount: 1, durationMs: 9 * MIN, preferredElement: 1},
  // Keg
  {id: 'keg-grape', machine: 'keg', name: '酿造水晶果酒', inputId: 'crop-grape', inputCount: 2, outputId: 'art-grape-wine', outputCount: 1, durationMs: 8 * MIN, preferredElement: 4},
  {id: 'keg-berry', machine: 'keg', name: '酿造浆果气泡酒', inputId: 'crop-strawberry', inputCount: 3, outputId: 'art-berry-wine', outputCount: 1, durationMs: 7 * MIN, preferredElement: 0},
  {id: 'keg-blueberry', machine: 'keg', name: '酿造蓝莓果酒', inputId: 'crop-blueberry', inputCount: 3, outputId: 'art-berry-wine', outputCount: 1, durationMs: 7 * MIN, preferredElement: 0},
  {id: 'keg-pumpkin', machine: 'keg', name: '酿造金秋南瓜酒', inputId: 'crop-pumpkin', inputCount: 1, outputId: 'art-pumpkin-ale', outputCount: 1, durationMs: 10 * MIN, preferredElement: 4},
  // Kiln
  {id: 'kiln-sourdough', machine: 'kiln', name: '窑烤乡间面包', inputId: 'art-flour', inputCount: 1, extraInputId: 'prod-egg', extraInputCount: 1, outputId: 'art-sourdough', outputCount: 2, durationMs: 5 * MIN, preferredElement: 2},
  {id: 'kiln-bread-simple', machine: 'kiln', name: '窑烤原麦面包', inputId: 'art-flour', inputCount: 2, outputId: 'art-sourdough', outputCount: 1, durationMs: 4 * MIN, preferredElement: 2},
  {id: 'kiln-smoke-carp', machine: 'kiln', name: '果木熏鲤鱼', inputId: 'fish-carp', inputCount: 1, outputId: 'art-smoked-fish', outputCount: 1, durationMs: 5 * MIN, preferredElement: 2},
  {id: 'kiln-smoke-mackerel', machine: 'kiln', name: '果木熏鲭鱼', inputId: 'fish-mackerel', inputCount: 1, outputId: 'art-smoked-fish', outputCount: 1, durationMs: 5 * MIN, preferredElement: 2},
  {id: 'kiln-smoke-salmon', machine: 'kiln', name: '果木熏鲑鱼', inputId: 'fish-salmon', inputCount: 1, outputId: 'art-smoked-fish', outputCount: 2, durationMs: 6 * MIN, preferredElement: 2},
  // Preserver / Aging Jar
  {id: 'pres-cheese', machine: 'preserver', name: '发酵牧场奶酪', inputId: 'prod-milk', inputCount: 1, outputId: 'art-cheese', outputCount: 1, durationMs: 6 * MIN, preferredElement: 5},
  {id: 'pres-caviar', machine: 'preserver', name: '腌渍琥珀鱼子酱', inputId: 'prod-roe', inputCount: 1, outputId: 'art-caviar', outputCount: 1, durationMs: 8 * MIN, preferredElement: 0},
  {id: 'pres-truffle-oil', machine: 'preserver', name: '冷榨松露香油', inputId: 'prod-truffle', inputCount: 1, outputId: 'art-truffle-oil', outputCount: 1, durationMs: 9 * MIN, preferredElement: 4},
  // Loom
  {id: 'loom-cloth', machine: 'loom', name: '织造云绒锦缎', inputId: 'prod-wool', inputCount: 1, outputId: 'art-silk-cloth', outputCount: 1, durationMs: 6 * MIN, preferredElement: 1},
  {id: 'loom-star-cloth', machine: 'loom', name: '织造星绒华锦', inputId: 'prod-star-fur', inputCount: 1, outputId: 'art-silk-cloth', outputCount: 2, durationMs: 7 * MIN, preferredElement: 3},
];

export function canCraftArtisan(life: LifeData, recipe: ArtisanRecipe): boolean {
  if ((life.bag[recipe.inputId] ?? 0) < recipe.inputCount) return false;
  if (recipe.extraInputId && (life.bag[recipe.extraInputId] ?? 0) < (recipe.extraInputCount ?? 1)) return false;
  return true;
}

/** Finds the highest-value craftable artisan recipe for a given machine kind. */
export function availableArtisanRecipes(life: LifeData, machine: MachineKind): ArtisanRecipe[] {
  return ARTISAN_RECIPES
    .filter(r => r.machine === machine && canCraftArtisan(life, r))
    .sort((a, b) => (ITEMS[b.outputId]?.price ?? 0) * b.outputCount - (ITEMS[a.outputId]?.price ?? 0) * a.outputCount);
}

/** Computes progress 0..1 for a running machine slot (respecting artisan_speed buff & element boosts). */
export function machineProgress(slot: MachineSlotState, now: number, speedMul = 1): number {
  const elapsed = Math.max(0, now - slot.startedAt) * speedMul + slot.boostedMs;
  return Math.min(1, elapsed / Math.max(1, slot.durationMs));
}

export function isMachineReady(life: LifeData, slot: MachineSlotState, now: number): boolean {
  const mul = hasBuff(life, 'artisan_speed', now) ? 1.25 : 1;
  return machineProgress(slot, now, mul) >= 1;
}

/** Starts a recipe inside a machine POI. */
export function startMachine(
  life: LifeData,
  machinePropId: string,
  recipeId: string,
  now = Date.now(),
): {ok: boolean; reason?: string; slot?: MachineSlotState} {
  const home = ensureHome(life);
  home.machines ??= {};
  if (home.machines[machinePropId]) return {ok: false, reason: 'busy'};
  const r = ARTISAN_RECIPES.find(x => x.id === recipeId);
  if (!r) return {ok: false, reason: 'invalid'};
  if (!canCraftArtisan(life, r)) return {ok: false, reason: 'ingredients'};
  takeItem(life, r.inputId, r.inputCount);
  if (r.extraInputId) takeItem(life, r.extraInputId, r.extraInputCount ?? 1);
  const slot: MachineSlotState = {
    machineKind: r.machine,
    recipeId: r.id,
    outputId: r.outputId,
    outputCount: r.outputCount,
    startedAt: now,
    durationMs: r.durationMs,
    boostedMs: 0,
    boostCount: 0,
  };
  home.machines[machinePropId] = slot;
  return {ok: true, slot};
}

/**
 * Starts a passive Beehive cycle based on nearby flower beds / crops / decorative flowers within 9m.
 * Encourages spatial farm+flower+beehive planning (Stardew-style flower honey!).
 */
export function startBeehiveCycle(
  life: LifeData,
  beehiveProp: PlacedProp,
  now = Date.now(),
): {ok: boolean; honeyId: string; slot?: MachineSlotState} {
  const home = ensureHome(life);
  home.machines ??= {};
  if (home.machines[beehiveProp.id]) {
    return {ok: false, honeyId: home.machines[beehiveProp.id].outputId};
  }
  const honeyId = detectNearbyHoney(life, beehiveProp);
  const slot: MachineSlotState = {
    machineKind: 'beehive',
    recipeId: `honey-${honeyId}`,
    outputId: honeyId,
    outputCount: 1,
    startedAt: now,
    durationMs: 6 * MIN,
    boostedMs: 0,
    boostCount: 0,
  };
  home.machines[beehiveProp.id] = slot;
  return {ok: true, honeyId, slot};
}

export function detectNearbyHoney(life: LifeData, beehive: Pick<PlacedProp, 'x' | 'z'>): string {
  const home = ensureHome(life);
  let hasStar = false;
  let hasLotus = false;
  for (const p of home.placed) {
    const dist = Math.hypot(p.x - beehive.x, p.z - beehive.z);
    if (dist > 9.5) continue;
    if (p.itemId === 'waterside-lily') hasLotus = true;
    const plot = life.plots[`home-plot-${p.id}`];
    if (plot?.crop === 'seed-starlight' || plot?.crop === 'seed-nightbloom') hasStar = true;
    if (plot?.crop === 'seed-lotus' || plot?.crop === 'seed-wisteria' || plot?.crop === 'seed-rose' || plot?.crop === 'seed-lavender') hasLotus = true;
  }
  if (hasStar) return 'art-star-honey';
  if (hasLotus) return 'art-lotus-honey';
  return 'art-wild-honey';
}

/**
 * Active play acceleration: hitting or interacting with a running machine using an element
 * pushes progress forward (up to 3 boosts per batch) and awards Gold Star quality on preferred element!
 */
export function boostMachineWithElement(
  life: LifeData,
  machinePropId: string,
  element: number,
  now = Date.now(),
): {ok: boolean; goldStar: boolean; progress: number; reason?: string} {
  const home = ensureHome(life);
  const slot = home.machines?.[machinePropId];
  if (!slot) return {ok: false, goldStar: false, progress: 0, reason: 'empty'};
  if (isMachineReady(life, slot, now)) return {ok: false, goldStar: !!slot.goldStar, progress: 1, reason: 'ready'};
  if (slot.boostCount >= 3) return {ok: false, goldStar: !!slot.goldStar, progress: machineProgress(slot, now), reason: 'maxed'};
  const recipe = ARTISAN_RECIPES.find(r => r.id === slot.recipeId);
  const preferred = recipe ? recipe.preferredElement === element : element === 1;
  const frac = preferred ? 0.38 : 0.22;
  slot.boostedMs += Math.round(slot.durationMs * frac);
  slot.boostCount++;
  if (preferred) slot.goldStar = true;
  const mul = hasBuff(life, 'artisan_speed', now) ? 1.25 : 1;
  return {ok: true, goldStar: !!slot.goldStar, progress: machineProgress(slot, now, mul)};
}

/** Collects completed output from a machine; Gold Star grants +1 extra output or bonus shells. */
export function collectMachine(
  life: LifeData,
  machinePropId: string,
  now = Date.now(),
): {ok: boolean; outputId?: string; count?: number; goldStar?: boolean; bonusCoins?: number; first?: boolean} {
  const home = ensureHome(life);
  const slot = home.machines?.[machinePropId];
  if (!slot || !isMachineReady(life, slot, now)) return {ok: false};
  delete home.machines![machinePropId];
  const bonusCoins = slot.goldStar ? Math.max(6, Math.round((ITEMS[slot.outputId]?.price ?? 20) * 0.45)) : 0;
  if (bonusCoins > 0) changeShells(life, bonusCoins, 'earn');
  addItem(life, slot.outputId, slot.outputCount);
  const first = record(life, slot.outputId, slot.outputCount);
  return {ok: true, outputId: slot.outputId, count: slot.outputCount, goldStar: !!slot.goldStar, bonusCoins, first};
}

/** Sells any sellable item (crop/fish/food/artisan/animal_product/relic) at the port market. */
export function sellItem(life: LifeData, itemId: string, qty = 1): {ok: boolean; earned: number} {
  const def = ITEMS[itemId];
  if (!def || def.price <= 0 || def.kind === 'seed' || def.kind === 'bait' || def.kind === 'critter') {
    return {ok: false, earned: 0};
  }
  const have = life.bag[itemId] ?? 0;
  const n = Math.min(have, Math.max(1, qty));
  if (n <= 0 || !takeItem(life, itemId, n)) return {ok: false, earned: 0};
  const earned = def.price * n;
  changeShells(life, earned, 'earn');
  return {ok: true, earned};
}
