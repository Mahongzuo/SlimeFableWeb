import {CROPS} from './catalog';
import {addItem, record, takeItem, type LifeData, type PlotState} from './state';
/**
 * Terrace farming, all in real time. A crop only grows while it is wet: one watering keeps the soil wet for
 * WATER_MS (water element: twice as long). Weeds may sprout when watered and halve growth until burnt (fire).
 * `watered` is when the soil dries; `grown` is growth banked up to the last watering.
 */
export const WATER_MS = 10 * 60_000, WITHER_MS = 24 * 3600_000, WEED_CHANCE = .15;
export const PLOT_IDS = [1, 2, 3].flatMap(t => [0, 1, 2].map(r => `farm-${t}-${r}`));
export type PlotPhase = 'empty' | 'sprout' | 'growing' | 'ripe' | 'withered';
const spec = (p: PlotState) => CROPS[p.crop];
/** Growth since the last watering that has not been banked yet. Wet window ends at `watered`. */
function pending(p: PlotState, now: number, wetFrom: number) { const ms = Math.max(0, Math.min(now, p.watered) - wetFrom); return p.weeds ? ms / 2 : ms; }
const wetFrom = (p: PlotState) => p.wetFrom ?? p.planted;
export function growth(p: PlotState, now: number) { const s = spec(p); return s ? Math.min(1, (p.grown + pending(p, now, wetFrom(p))) / s.growMs) : 0; }
/** When the crop became (or will become) ripe, assuming no more watering. */
function ripeAt(p: PlotState) { const s = spec(p), left = s.growMs - p.grown, rate = p.weeds ? .5 : 1, at = wetFrom(p) + left / rate; return at <= p.watered ? at : Infinity; }
export function phase(p: PlotState | null | undefined, now: number): PlotPhase {
  if (!p) return 'empty'; const g = growth(p, now);
  if (g >= 1) return now - (p.grown >= spec(p).growMs ? p.ripeSince ?? wetFrom(p) : ripeAt(p)) > WITHER_MS ? 'withered' : 'ripe';
  return g < .25 ? 'sprout' : 'growing';
}
export function plant(life: LifeData, plot: string, seed: string, now: number) {
  if (life.plots[plot] || !CROPS[seed] || !takeItem(life, seed)) return false;
  life.plots[plot] = {crop: seed, planted: now, watered: now, grown: 0}; return true;
}
export function water(life: LifeData, plot: string, now: number, element: number, rand: () => number) {
  const p = life.plots[plot]; if (!p || phase(p, now) === 'ripe' || phase(p, now) === 'withered') return false;
  const was = growth(p, now) * spec(p).growMs; p.grown = Math.min(spec(p).growMs, was);
  p.wetFrom = now; p.watered = now + (element === 0 ? 2 : 1) * WATER_MS;
  if (p.grown >= spec(p).growMs) p.ripeSince = now;
  if (!p.weeds && rand() < WEED_CHANCE) p.weeds = true;
  return true;
}
export function burnWeeds(life: LifeData, plot: string, now: number) {
  const p = life.plots[plot]; if (!p?.weeds) return false;
  p.grown = growth(p, now) * spec(p).growMs; p.wetFrom = Math.min(now, p.watered); p.weeds = false; return true;
}
export function harvest(life: LifeData, plot: string, now: number, rand: () => number): {item: string; n: number} | null {
  const p = life.plots[plot], ph = phase(p, now); if (!p || (ph !== 'ripe' && ph !== 'withered')) return null;
  life.plots[plot] = null; if (ph === 'withered') return {item: 'withered', n: 0};
  const s = spec(p), n = s.yield[0] + Math.floor(rand() * (s.yield[1] - s.yield[0] + 1));
  addItem(life, s.crop, n); record(life, s.crop, n); return {item: s.crop, n};
}
