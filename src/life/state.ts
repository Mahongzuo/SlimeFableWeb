/**
 * Persistent casual-play state (farm, fishing, critters, park records, requests). Pure data, saved with the rest.
 * Times are real-world milliseconds (Date.now()) so crops keep growing while the game is closed.
 */
export interface PlotState {crop: string; planted: number; watered: number; /** growth ms already banked */ grown: number; weeds?: boolean}
export interface DexEntry {n: number; first: number; /** biggest size (fish cm) or best time (park ms) */ best?: number}
export interface RequestState {id: string; item: string; count: number; reward: number; done: boolean}
export interface LifeData {
  coins: number;
  bag: Record<string, number>;
  dex: Record<string, DexEntry>;
  plots: Record<string, PlotState | null>;
  requests: {day: string; list: RequestState[]} | null;
  records: Record<string, number>;
}
export const freshLife = (): LifeData => ({coins: 0, bag: {}, dex: {}, plots: {}, requests: null, records: {}});
export function addItem(life: LifeData, id: string, n = 1) { life.bag[id] = (life.bag[id] ?? 0) + n; if (life.bag[id] <= 0) delete life.bag[id]; }
export function takeItem(life: LifeData, id: string, n = 1) { if ((life.bag[id] ?? 0) < n) return false; addItem(life, id, -n); return true; }
/** Returns true the first time something enters the collection book. */
export function record(life: LifeData, id: string, value?: number, better: 'max' | 'min' = 'max') {
  const e = life.dex[id], first = !e;
  if (!e) life.dex[id] = {n: 1, first: Date.now(), best: value};
  else { e.n++; if (value !== undefined && (e.best === undefined || (better === 'max' ? value > e.best : value < e.best))) e.best = value; }
  return first;
}
