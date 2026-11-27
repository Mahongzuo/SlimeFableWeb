import {ITEMS, RECIPES} from './catalog';
import {addItem, ensureHome, record, takeItem, type ActiveBuff, type BuffEffect, type LifeData} from './state';
/** Cooking at the 凝露小厨 stove. The stove needs fire: the slime must be in the fire element (2) to light it. */
export const FIRE = 2;
export const BUFF_DURATION_MS = 15 * 60_000;

export interface FoodBuffSpec {
  effect: BuffEffect;
  label: string;
  durationMs?: number;
}

export const FOOD_BUFFS: Record<string, FoodBuffSpec> = {
  'food-corn-roast': {effect: 'move_speed', label: '热腾腾提速'},
  'food-fish-soup': {effect: 'fishing_bar', label: '垂钓稳线'},
  'food-pumpkin-pie': {effect: 'harvest_luck', label: '丰收好运'},
  'food-berry-ice': {effect: 'glide_lift', label: '清风滑翔'},
  'food-radish-salad': {effect: 'move_speed', label: '轻盈步履'},
  'food-carrot-soup': {effect: 'move_speed', label: '胡萝卜疾走'},
  'food-chili-hotpot': {effect: 'artisan_speed', label: '红火加工 +25%'},
  'food-mint-tea-cake': {effect: 'glide_lift', label: '薄荷御风'},
  'food-lotus-porridge': {effect: 'fishing_bar', label: '青莲定心垂钓'},
  'food-fisherman-feast': {effect: 'fishing_bar', label: '渔夫大师 +25%'},
  'food-truffle-pasta': {effect: 'rare_encounter', label: '松露寻兽香'},
  'food-honey-toast': {effect: 'harvest_luck', label: '蜜糖丰收'},
  'food-blueberry-tart': {effect: 'artisan_speed', label: '巧匠灵思 +25%'},
  'food-mocha-cake': {effect: 'artisan_speed', label: '摩卡疾速工坊'},
  'food-cabbage-roll': {effect: 'fishing_bar', label: '港湾稳竿'},
  'food-baked-potato': {effect: 'harvest_luck', label: '田园饱满'},
  'food-watermelon-sorbet': {effect: 'glide_lift', label: '盛夏乘风'},
  'food-steamed-mandarin': {effect: 'rare_encounter', label: '桃花引灵兽'},
  'food-crab-roe-rice': {effect: 'harvest_luck', label: '秋收满仓'},
  'food-lavender-macaron': {effect: 'glide_lift', label: '花风滑翔'},
  'food-rose-jam-bun': {effect: 'rare_encounter', label: '玫瑰沁香'},
  'food-starlight-pudding': {effect: 'rare_encounter', label: '星露奇遇祝福'},
  'food-caviar-canape': {effect: 'fishing_bar', label: '沧溟垂钓祝福'},
  'food-autumn-mooncake': {effect: 'harvest_luck', label: '桂月丰年'},
};

export const canCook = (life: LifeData, id: string) => { const r = RECIPES.find(x => x.id === id); return !!r && Object.entries(r.needs).every(([k, n]) => (life.bag[k] ?? 0) >= n); };
/** Cookable dishes, most valuable first. */
export const cookable = (life: LifeData) => RECIPES.filter(r => canCook(life, r.id)).sort((a, b) => ITEMS[b.id].price - ITEMS[a.id].price);
/** The dish you are closest to cooking (fewest missing ingredients), for hints. */
export function nearest(life: LifeData) {
  let best = RECIPES[0], miss = Infinity;
  for (const r of RECIPES) { const m = Object.entries(r.needs).reduce((s, [k, n]) => s + Math.max(0, n - (life.bag[k] ?? 0)), 0); if (m < miss) { miss = m; best = r; } }
  return {recipe: best, missing: miss};
}
export function cook(life: LifeData, id: string, element: number): {ok: boolean; reason?: 'fire' | 'ingredients'; first?: boolean} {
  if (element !== FIRE) return {ok: false, reason: 'fire'};
  const r = RECIPES.find(x => x.id === id); if (!r || !canCook(life, id)) return {ok: false, reason: 'ingredients'};
  for (const [k, n] of Object.entries(r.needs)) takeItem(life, k, n);
  addItem(life, id); return {ok: true, first: record(life, id)};
}

/** Consumes 1 cooked dish from bag to grant a 15-minute lifestyle buff. */
export function eatFood(life: LifeData, foodId: string, now = Date.now()): {ok: boolean; buff?: ActiveBuff} {
  const def = ITEMS[foodId];
  const spec = FOOD_BUFFS[foodId];
  if (!def || def.kind !== 'food' || !spec) return {ok: false};
  if (!takeItem(life, foodId, 1)) return {ok: false};
  const home = ensureHome(life);
  const list = (home.activeBuffs ?? []).filter(b => b.until > now && b.effect !== spec.effect);
  const buff: ActiveBuff = {
    id: `${spec.effect}-${now}`,
    foodId,
    effect: spec.effect,
    label: `${def.icon} ${spec.label}`,
    until: now + (spec.durationMs ?? BUFF_DURATION_MS),
  };
  list.push(buff);
  home.activeBuffs = list;
  return {ok: true, buff};
}

export function getActiveBuffs(life: LifeData, now = Date.now()): ActiveBuff[] {
  const home = ensureHome(life);
  const active = (home.activeBuffs ?? []).filter(b => b.until > now);
  if (active.length !== (home.activeBuffs?.length ?? 0)) home.activeBuffs = active;
  return active;
}

export function hasBuff(life: LifeData, effect: BuffEffect, now = Date.now()): boolean {
  return getActiveBuffs(life, now).some(b => b.effect === effect);
}
