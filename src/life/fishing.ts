import {addItem, record, type LifeData} from './state';
/** Where, when and how hard each fish bites. Sizes in cm; fight 0..1 (how hard it pulls the line). */
export type FishSpot = 'lake' | 'harbor';
export interface FishRow {fish: string; spots: FishSpot[]; weight: number; size: [number, number]; fight: number; hours?: [number, number]; rain?: boolean; rare?: boolean; history?: boolean}
export const FISH_TABLE: FishRow[] = [
  {fish: 'fish-crucian', spots: ['lake'], weight: 30, size: [8, 22], fight: .2},
  {fish: 'fish-carp', spots: ['lake'], weight: 18, size: [25, 60], fight: .45},
  {fish: 'fish-goby', spots: ['harbor'], weight: 30, size: [5, 12], fight: .15},
  {fish: 'fish-mackerel', spots: ['harbor'], weight: 20, size: [20, 38], fight: .4},
  {fish: 'fish-perch', spots: ['lake', 'harbor'], weight: 14, size: [18, 45], fight: .5},
  {fish: 'fish-catfish', spots: ['lake'], weight: 10, size: [30, 80], fight: .6, hours: [18, 4]},
  {fish: 'fish-eel', spots: ['lake', 'harbor'], weight: 6, size: [40, 90], fight: .7, rain: true},
  {fish: 'fish-golden-trout', spots: ['lake'], weight: 3, size: [30, 55], fight: .8, hours: [5, 8], rare: true},
  {fish: 'fish-rainbow-trout', spots: ['lake'], weight: 3, size: [25, 50], fight: .75, rain: true, rare: true},
  {fish: 'fish-history', spots: ['lake', 'harbor'], weight: 2, size: [19, 21], fight: .9, history: true, rare: true},
];
const inHours = (h: number, [a, b]: [number, number]) => a <= b ? h >= a && h < b : h >= a || h < b;
export interface FishEnv {hour: number; raining: boolean; historyDay: boolean}
export function pickFish(spot: FishSpot, env: FishEnv, bait: string | null, rand: () => number): {fish: string; size: number} {
  const rows = FISH_TABLE.filter(r => r.spots.includes(spot) && (!r.hours || inHours(env.hour, r.hours)) && (!r.rain || env.raining) && (!r.history || env.historyDay));
  const w = (r: FishRow) => r.weight * (r.rare && bait === 'bait-glow' ? 3 : 1), total = rows.reduce((s, r) => s + w(r), 0);
  let x = rand() * total, row = rows[rows.length - 1];
  for (const r of rows) { x -= w(r); if (x < 0) { row = r; break; } }
  return {fish: row.fish, size: Math.round(row.size[0] + rand() * (row.size[1] - row.size[0]))};
}
export type FishPhase = 'cast' | 'wait' | 'bite' | 'reel' | 'caught' | 'escaped';
export const GREEN: [number, number] = [.25, .8];
/** One cast, from the throw to a fish in the bag (or not). Drive it with update(dt, reeling) and hook(). */
export class FishingSession {
  phase: FishPhase = 'cast'; timer = .6; misses = 0; tension = .3; progress = 0; readonly catch: {fish: string; size: number}; private fight: number; private surge = 0;
  constructor(readonly spot: FishSpot, env: FishEnv, private rand: () => number, bait: string | null = null) {
    this.catch = pickFish(spot, env, bait, rand); this.fight = FISH_TABLE.find(r => r.fish === this.catch.fish)!.fight;
  }
  private toWait() { this.phase = 'wait'; this.timer = 2 + this.rand() * 6; }
  hook() { if (this.phase !== 'bite') return false; this.phase = 'reel'; this.tension = .35; return true; }
  update(dt: number, reeling: boolean) {
    if (this.phase === 'caught' || this.phase === 'escaped') return;
    if (this.phase !== 'reel') {
      this.timer -= dt; if (this.timer > 0) return;
      if (this.phase === 'cast') this.toWait();
      else if (this.phase === 'wait') { this.phase = 'bite'; this.timer = .9; }
      else if (++this.misses >= 3) this.phase = 'escaped'; else this.toWait();
      return;
    }
    // the fish surges every so often; reeling raises tension, slack lets it fall
    this.surge -= dt; if (this.surge <= 0) this.surge = .4 + this.rand() * 1.2;
    const pull = this.surge < .35 ? this.fight * 1.1 : this.fight * .15;
    this.tension = Math.max(0, this.tension + ((reeling ? .55 : -.7) + pull) * dt);
    if (this.tension >= 1) { this.phase = 'escaped'; return; }
    if (this.tension >= GREEN[0] && this.tension <= GREEN[1]) this.progress += dt * (reeling ? .28 : .1) * (1.2 - this.fight * .6);
    if (this.progress >= 1) this.phase = 'caught';
  }
  result() { return this.phase === 'caught' ? this.catch : null; }
}
/** Put the catch in the bag; true the first time this fish is caught. */
export function landCatch(life: LifeData, c: {fish: string; size: number}) { addItem(life, c.fish); return record(life, c.fish, c.size); }
