import type {LifeData} from './state';

export interface EnemyShip {
  x: number;
  z: number;
  yaw: number;
  hp: number;
  reload: number;
  aim: {x: number; z: number; remaining: number} | null;
}
export interface Voyage {
  seed: number;
  x: number;
  z: number;
  yaw: number;
  hp: number;
  ammo: number;
  purchased: number;
  farthest: number;
  threshold: number;
  cleared: number;
  cargo: number;
  enemy: EnemyShip | null;
  reload: [number, number];
}
export interface SailingLog {
  flag: number;
  waters: number;
  reserve: number;
  run: Voyage | null;
}
const randomSeed = () => Math.floor(Math.random() * 0x100000000);
export function sailingLog(life: LifeData) {
  return (life.sailing ??= {flag: randomSeed(), waters: randomSeed(), reserve: 0, run: null});
}
export function voyageNoise(seed: number, a: number, b = 0) {
  let h = seed ^ Math.imul(a, 0x45d9f3b) ^ Math.imul(b, 0x27d4eb2d);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  return ((h ^ (h >>> 13)) >>> 0) / 0x100000000;
}
export const seaInterval = (roll: number) => 300 + Math.min(1700, Math.floor(roll * 1701));
export function buyRounds(life: LifeData) {
  const log = sailingLog(life);
  if (log.run || log.reserve + 6 > 24 || life.coins < 6) return false;
  life.coins -= 6;
  log.reserve += 6;
  return true;
}
export function depart(life: LifeData, x: number, z: number, yaw: number, seed = randomSeed()): Voyage {
  const log = sailingLog(life);
  if (log.run) return log.run;
  log.run = {
    seed,
    x,
    z,
    yaw,
    ammo: 12 + log.reserve,
    purchased: log.reserve,
    hp: 6,
    farthest: 0,
    threshold: seaInterval(voyageNoise(seed, 0)),
    cargo: 0,
    cleared: 0,
    enemy: null,
    reload: [0, 0],
  };
  log.reserve = 0;
  return log.run;
}
export function sightEnemy(run: Voyage, distance: number, navigable: (x: number, z: number) => boolean) {
  const previous = run.farthest;
  run.farthest = Math.max(distance, previous);
  if (run.enemy || distance < previous || distance < run.threshold) return false;
  for (let i = 0; i < 20; i++) {
    const a = run.yaw + 0.85 + i * 2.4;
    const x = run.x + 41 * Math.sin(a),
      z = run.z + 41 * Math.cos(a);
    if (!navigable(x, z)) continue;
    run.enemy = {x, z, yaw: a + Math.PI, hp: 4 + run.cleared, reload: 4, aim: null};
    return true;
  }
  return false;
}
export function endEncounter(run: Voyage, won: boolean) {
  if (!run.enemy) return;
  if (won) {
    run.cargo += 6 + run.cleared * 3;
    run.cleared++;
  }
  run.enemy = null;
  run.threshold = run.farthest + seaInterval(voyageNoise(run.seed, Math.round(run.farthest), run.cleared));
}
/** Port is local +X since the mesh bows towards +Z. */
export function inBroadside(run: Voyage, side: 1 | -1) {
  const e = run.enemy;
  if (!e) return false;
  const dx = e.x - run.x,
    dz = e.z - run.z,
    range = Math.hypot(dx, dz);
  return (
    range > 0 && range <= 58 && (side * (dx * Math.cos(run.yaw) - dz * Math.sin(run.yaw))) / range >= 0.72
  );
}
export function fireBroadside(run: Voyage, side: 1 | -1): 'empty' | 'loading' | 'hit' | 'miss' | 'won' {
  const index = side === 1 ? 0 : 1;
  if (!run.ammo) return 'empty';
  if (run.reload[index] > 0) return 'loading';
  run.ammo--;
  run.reload[index] = 1.65;
  if (!inBroadside(run, side)) return 'miss';
  if (--run.enemy!.hp > 0) return 'hit';
  endEncounter(run, true);
  return 'won';
}
export function finishVoyage(life: LifeData, safe: boolean) {
  const log = sailingLog(life),
    run = log.run;
  if (!run) return 0;
  const payout = safe ? run.cargo : 0;
  log.reserve = safe ? Math.min(run.purchased ?? 0, run.ammo) : 0;
  life.coins += payout;
  life.records['voyage-distance'] = Math.max(life.records['voyage-distance'] ?? 0, Math.floor(run.farthest));
  life.records['voyage-waves'] = Math.max(life.records['voyage-waves'] ?? 0, run.cleared);
  log.run = null;
  return payout;
}
