import {ITEMS, RECIPES} from './catalog';
import {addItem, record, takeItem, type LifeData} from './state';
/** Cooking at the 凝露小厨 stove. The stove needs fire: the slime must be in the fire element (2) to light it. */
export const FIRE = 2;
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
