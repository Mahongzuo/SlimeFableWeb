import {changeShells} from './shell-wallet';
import {CROP_LIST, CROP_META, CROPS, ITEMS, type CropCategory} from './catalog';
import {growth, phase, water, WATER_MS} from './farming';
import {addItem, ensureHome, record, type LifeData, type PlotState} from './state';

export const SPRINKLER_CHARGE_MS = 12 * 3600_000;
export const ELEMENT_REACTION_WINDOW_MS = 8_000;

/** Extra ornamental/rare seeds unlocked via daily shop rotation, greenhouse, or habitat visitors. */
export const SPECIAL_SEEDS = [
  'seed-lotus',
  'seed-wisteria',
  'seed-ginkgo',
  'seed-starlight',
  'seed-chili',
  'seed-mint',
  'seed-nightbloom',
  'seed-dewleaf',
  'seed-mushroom',
] as const;

export function dailySpecialSeed(dayKey: string): string {
  let h = 2166136261;
  for (let i = 0; i < dayKey.length; i++) h = Math.imul(h ^ dayKey.charCodeAt(i), 16777619);
  return SPECIAL_SEEDS[(h >>> 0) % SPECIAL_SEEDS.length];
}

export interface ShopSeedEntry {
  id: string;
  name: string;
  price: number;
  special?: boolean;
  category: CropCategory;
  preferredElement: number;
  waterSensitive?: boolean;
  icon: string;
  growMin: number;
}

export function shopSeedList(life: LifeData, dayKey: string): ShopSeedEntry[] {
  const specialSet = new Set<string>(SPECIAL_SEEDS);
  const special = dailySpecialSeed(dayKey);
  const home = ensureHome(life);
  const hasGreenhouse = home.placed.some(p => p.itemId === 'pack-greenhouse');
  // All regular UE crops + UE core element starters (chili, mint, dewleaf) are always purchasable;
  // rare ornamentals & nightbloom rotate daily unless Greenhouse is placed.
  const alwaysAvailableSpecial = new Set(['seed-chili', 'seed-mint', 'seed-dewleaf', 'seed-mushroom']);
  const ids = CROP_LIST.map(([id]) => `seed-${id}`).filter(id => {
    if (!specialSet.has(id)) return true;
    if (hasGreenhouse || alwaysAvailableSpecial.has(id)) return true;
    return id === special;
  });
  return ids
    .filter(id => !!ITEMS[id] && !!CROPS[id])
    .map(id => {
      const meta = CROP_META[id];
      return {
        id,
        name: ITEMS[id].name,
        price: ITEMS[id].price,
        special: id === special,
        category: meta?.category ?? 'veg',
        preferredElement: meta?.preferredElement ?? 0,
        waterSensitive: meta?.waterSensitive,
        icon: ITEMS[id].icon,
        growMin: Math.round(CROPS[id].growMs / 60_000),
      };
    });
}

export function buySeed(life: LifeData, seedId: string, count = 1): {ok: boolean; reason?: string} {
  const def = ITEMS[seedId];
  if (!Number.isSafeInteger(count) || count < 1 || !def || def.kind !== 'seed') return {ok: false, reason: 'invalid'};
  const cost = def.price * count;
  if (life.coins < cost) return {ok: false, reason: 'coins'};
  changeShells(life, -(cost), 'spend');
  addItem(life, seedId, count);
  return {ok: true};
}

/** Fire element (2): warms the plot for +35% growth speed (also burns weeds if present). */
export function applyWarmBoost(life: LifeData, plotId: string, now: number): boolean {
  const p = life.plots[plotId];
  if (!p) return false;
  const ph = phase(p, now);
  if (ph === 'ripe' || ph === 'withered') return false;
  if (p.warmBoost && !p.weeds) return false;
  const spec = CROPS[p.crop];
  if (!spec) return false;
  p.grown = Math.min(spec.growMs, growth(p, now) * spec.growMs);
  p.wetFrom = Math.min(now, p.watered);
  p.weeds = false;
  p.warmBoost = true;
  return true;
}

/** Wind element (1): pollinates growing/ripe plot with a chance to mutate into a high-value rare variant. */
export function pollinatePlot(life: LifeData, plotId: string, now: number, rand: () => number): {ok: boolean; rare: boolean} {
  const p = life.plots[plotId];
  if (!p || p.pollinated) return {ok: false, rare: false};
  const ph = phase(p, now);
  if (ph === 'empty' || ph === 'withered') return {ok: false, rare: false};
  p.pollinated = true;
  const hasGreenhouse = ensureHome(life).placed.some(x => x.itemId === 'pack-greenhouse');
  const chance = hasGreenhouse ? 0.55 : 0.35;
  const rare = rand() < chance;
  p.variant = rare ? 'rare' : 'normal';
  return {ok: true, rare};
}

/** Lightning element (3): charges home sprinklers/greenhouse to auto-water all plots for 12 hours. */
export function chargeHomeSprinkler(life: LifeData, now: number): number {
  const home = ensureHome(life);
  home.sprinklerChargedUntil = now + SPRINKLER_CHARGE_MS;
  let wateredCount = 0;
  for (const [, p] of Object.entries(life.plots)) {
    if (!p) continue;
    const ph = phase(p, now);
    if (ph === 'ripe' || ph === 'withered') continue;
    const spec = CROPS[p.crop];
    if (!spec) continue;
    p.grown = Math.min(spec.growMs, growth(p, now) * spec.growMs);
    p.wetFrom = now;
    p.watered = Math.max(p.watered, now + Math.max(WATER_MS * 2, SPRINKLER_CHARGE_MS));
    wateredCount++;
  }
  return wateredCount;
}

export type ElementAttackOutcomeKind =
  | 'none'
  | 'burned'
  | 'washed'
  | 'zapped'
  | 'steam'
  | 'watered'
  | 'warmed'
  | 'electro_ripe'
  | 'pollinated'
  | 'fertilized'
  | 'cleared';

export interface ElementAttackOutcome {
  changed: boolean;
  kind: ElementAttackOutcomeKind;
  label: string;
  color: string;
  destroyed: boolean;
  rare?: boolean;
}

/**
 * UE ASlimeFarmPlot::ReceiveElement_Implementation port + Water/Fire crop destruction mechanics.
 * Called when a slime's elemental slash combo (or clone strike) hits a planted farm plot.
 */
export function applyElementAttackToPlot(
  life: LifeData,
  plotId: string,
  element: number,
  now: number,
  isFinisher = false,
  rand: () => number = Math.random,
): ElementAttackOutcome {
  const p = life.plots[plotId];
  const ph = phase(p, now);
  if (!p || ph === 'empty') {
    return {changed: false, kind: 'none', label: '', color: '#ffffff', destroyed: false};
  }
  const spec = CROPS[p.crop];
  if (!spec) return {changed: false, kind: 'none', label: '', color: '#ffffff', destroyed: false};

  const meta = CROP_META[p.crop];
  const preferred = meta?.preferredElement ?? 0;
  const waterSensitive = !!meta?.waterSensitive;
  const hadWater = !!p.recentElement && p.recentElement.el === 0 && now - p.recentElement.at <= ELEMENT_REACTION_WINDOW_MS;
  const hadFire = !!p.recentElement && p.recentElement.el === 2 && now - p.recentElement.at <= ELEMENT_REACTION_WINDOW_MS;
  const isWet = now < p.watered;

  const bankAndBoost = (frac: number) => {
    const cur = growth(p, now) * spec.growMs;
    p.grown = Math.min(spec.growMs, cur + spec.growMs * frac);
    p.wetFrom = Math.min(now, p.watered);
    if (p.grown >= spec.growMs && !p.ripeSince) p.ripeSince = now;
  };

  // 5: Physical — cleans withered crops cleanly, or tills/fertilizes living plots
  if (element === 5) {
    if (ph === 'withered') {
      life.plots[plotId] = null;
      return {changed: true, kind: 'cleared', label: '🪨 斩清枯苗', color: '#e6d09c', destroyed: true};
    }
    p.fertility = Math.min(1, (p.fertility ?? 0) + 0.35);
    p.recentElement = {el: 5, at: now};
    return {changed: true, kind: 'fertilized', label: '🪨 松土增肥', color: '#f0d89e', destroyed: false};
  }

  // 2: Fire — Steam Greenhouse if recently watered, Warm Boost on fire-loving crops, otherwise BURNS & DESTROYS!
  if (element === 2) {
    if (hadWater && ph !== 'withered') {
      p.weeds = false;
      p.warmBoost = true;
      p.steamUntil = now + 60_000;
      bankAndBoost(0.12);
      p.recentElement = {el: 2, at: now};
      return {changed: true, kind: 'steam', label: '♨️ 蒸汽温室！', color: '#ffd980', destroyed: false};
    }
    if (preferred === 2 && ph !== 'withered') {
      p.weeds = false;
      p.warmBoost = true;
      bankAndBoost(0.14);
      p.recentElement = {el: 2, at: now};
      return {changed: true, kind: 'warmed', label: '🔥 喜火加速！', color: '#ff9f43', destroyed: false};
    }
    life.plots[plotId] = null;
    return {changed: true, kind: 'burned', label: '🔥 烧毁！', color: '#ff5226', destroyed: true};
  }

  // 0: Water — Waters dry tolerant crops; WASHES AWAY & DESTROYS water-sensitive crops, already-soaked non-water crops, or finisher slams!
  if (element === 0) {
    if (hadFire && !waterSensitive && ph !== 'withered') {
      p.weeds = false;
      p.warmBoost = true;
      p.steamUntil = now + 60_000;
      bankAndBoost(0.12);
      p.recentElement = {el: 0, at: now};
      return {changed: true, kind: 'steam', label: '♨️ 蒸汽温室！', color: '#8cd8ff', destroyed: false};
    }
    if (waterSensitive || isFinisher || (isWet && preferred !== 0)) {
      life.plots[plotId] = null;
      return {
        changed: true,
        kind: 'washed',
        label: waterSensitive ? '🌊 怕涝冲毁！' : '🌊 水浪冲毁！',
        color: '#45b6ff',
        destroyed: true,
      };
    }
    if (ph === 'withered') {
      life.plots[plotId] = null;
      return {changed: true, kind: 'washed', label: '🌊 冲清枯苗', color: '#5ec7ff', destroyed: true};
    }
    water(life, plotId, now, 0, () => 1); // strong clean soak without random weeds
    if (preferred === 0) bankAndBoost(0.10);
    p.recentElement = {el: 0, at: now};
    return {changed: true, kind: 'watered', label: preferred === 0 ? '💧 喜水滋润！' : '💧 水刃浇透', color: '#69c9ff', destroyed: false};
  }

  // 3: Lightning — Water+Lightning or Lightning-loving => Electro Ripen + Mutated; otherwise ZAPS & DESTROYS (exact UE rule)!
  if (element === 3) {
    if ((hadWater || preferred === 3) && ph !== 'withered') {
      bankAndBoost(0.28);
      p.variant = 'rare';
      p.pollinated = true;
      p.recentElement = {el: 3, at: now};
      return {changed: true, kind: 'electro_ripe', label: '⚡ 雷击催熟 ✨', color: '#d4b8ff', destroyed: false, rare: true};
    }
    life.plots[plotId] = null;
    return {changed: true, kind: 'zapped', label: '⚡ 劈毁！', color: '#b482ff', destroyed: true};
  }

  // 1: Wind — Pollinates & boosts rare golden mutation without destroying crops
  if (element === 1) {
    if (ph === 'withered') {
      life.plots[plotId] = null;
      return {changed: true, kind: 'cleared', label: '🍃 吹散枯苗', color: '#7ee6a8', destroyed: true};
    }
    const hadPol = !!p.pollinated;
    if (!hadPol) {
      const res = pollinatePlot(life, plotId, now, rand);
      if (preferred === 1) bankAndBoost(0.12);
      p.recentElement = {el: 1, at: now};
      return {changed: true, kind: 'pollinated', label: res.rare ? '🍃✨ 风吹变异！' : '🍃 清风授粉', color: res.rare ? '#ffe066' : '#7ef0a8', destroyed: false, rare: res.rare};
    }
    if (preferred === 1) bankAndBoost(0.08);
    p.recentElement = {el: 1, at: now};
    return {changed: true, kind: 'pollinated', label: '🍃 拂风舒叶', color: '#7ef0a8', destroyed: false};
  }

  // 4: Dark — High fertility infusion (+1 harvest bonus), accelerates dark-loving crops
  if (element === 4) {
    if (ph === 'withered') {
      life.plots[plotId] = null;
      return {changed: true, kind: 'cleared', label: '🌑 化枯为肥', color: '#b894ff', destroyed: true};
    }
    p.fertility = Math.min(1, (p.fertility ?? 0) + 0.55);
    if (preferred === 4) bankAndBoost(0.15);
    p.recentElement = {el: 4, at: now};
    return {changed: true, kind: 'fertilized', label: preferred === 4 ? '🌑 暗影丰茂！' : '🌑 肥力大增', color: '#c4a6ff', destroyed: false};
  }

  return {changed: false, kind: 'none', label: '', color: '#ffffff', destroyed: false};
}

/** Enhanced harvest that respects rare wind-mutated variants, dark/physical fertility, and raised-bed yield bonus. */
export function harvestEnhanced(
  life: LifeData,
  plotId: string,
  now: number,
  rand: () => number,
  extraYield = 0,
): {item: string; n: number; rare: boolean; bonusCoins: number} | null {
  const p: PlotState | null | undefined = life.plots[plotId];
  const ph = phase(p, now);
  if (!p || (ph !== 'ripe' && ph !== 'withered')) return null;
  const rare = p.variant === 'rare';
  const fertileBonus = (p.fertility ?? 0) >= 0.5 ? 1 : 0;
  life.plots[plotId] = null;
  if (ph === 'withered') return {item: 'withered', n: 0, rare: false, bonusCoins: 0};
  const s = CROPS[p.crop];
  if (!s) return null;
  const baseN = s.yield[0] + Math.floor(rand() * (s.yield[1] - s.yield[0] + 1));
  const n = baseN + (rare ? 1 : 0) + fertileBonus + Math.max(0, extraYield);
  addItem(life, s.crop, n);
  record(life, s.crop, n);
  const bonusCoins = rare ? Math.round((ITEMS[s.crop]?.price ?? 6) * 1.5) : 0;
  if (bonusCoins > 0) changeShells(life, bonusCoins, 'earn');
  return {item: s.crop, n, rare, bonusCoins};
}
