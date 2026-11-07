import {record, type LifeData} from './state';
/**
 * Friendly "hunting": critters wander near home; a fast or loud slime spooks them, a flattened (C) slime sneaks.
 * Touch one that has not noticed you — or pounce with a dash — and it is caught, logged in the book, and let go.
 */
export interface CritterKind {id: string; zone: 'forest' | 'farm' | 'lake' | 'park'; hearing: number; speed: number; night?: boolean; day?: boolean; hop?: number; fly?: number}
export const CRITTER_KINDS: CritterKind[] = [
  {id: 'critter-butterfly', zone: 'park', hearing: 3, speed: 1.6, day: true, fly: 1.2},
  {id: 'critter-ladybug', zone: 'farm', hearing: 2, speed: .8, day: true, fly: .6},
  {id: 'critter-dragonfly', zone: 'lake', hearing: 4, speed: 3.2, day: true, fly: 1},
  {id: 'critter-frog', zone: 'lake', hearing: 3.5, speed: 2.4, hop: .6},
  {id: 'critter-rabbit', zone: 'forest', hearing: 6, speed: 4.5, day: true, hop: .5},
  {id: 'critter-squirrel', zone: 'forest', hearing: 5, speed: 4, day: true, hop: .25},
  {id: 'critter-hedgehog', zone: 'forest', hearing: 3, speed: 1.1},
  {id: 'critter-beetle', zone: 'forest', hearing: 2, speed: .7},
  {id: 'critter-firefly', zone: 'forest', hearing: 2.5, speed: 1, night: true, fly: 1.4},
  {id: 'critter-owl', zone: 'forest', hearing: 7, speed: 5, night: true, fly: 3},
];
export type CritterMood = 'idle' | 'wander' | 'alert' | 'flee' | 'caught';
export interface Critter {kind: CritterKind; home: [number, number]; pos: [number, number]; mood: CritterMood; timer: number; dir: [number, number]; respawn: number}
export interface Stalker {pos: [number, number]; speed: number; spread: number}
export const CATCH_RADIUS = .75, DASH = 5.2, RESPAWN = 45;
export const spawnCritter = (kind: CritterKind, home: [number, number]): Critter => ({kind, home, pos: [...home], mood: 'idle', timer: 1, dir: [1, 0], respawn: 0});
export const awake = (k: CritterKind, hour: number) => { const night = hour < 6 || hour >= 19; return k.night ? night : k.day ? !night : true; };
/** How far away this slime can be heard: moving fast is loud, flattening (C) is quiet. */
export const noise = (s: Stalker, k: CritterKind) => k.hearing * Math.min(1.6, .25 + s.speed / 3.2) * (1 - .65 * s.spread);
/** Advance one critter. Returns 'caught' on the frame it is caught. */
export function stepCritter(c: Critter, s: Stalker, dt: number, rand: () => number, blocked: (x: number, z: number) => boolean = () => false): 'caught' | null {
  if (c.mood === 'caught') { c.respawn -= dt; if (c.respawn <= 0) { c.pos = [...c.home]; c.mood = 'idle'; c.timer = 1; } return null; }
  const dx = c.pos[0] - s.pos[0], dz = c.pos[1] - s.pos[1], d = Math.hypot(dx, dz);
  if (d < CATCH_RADIUS && (c.mood !== 'flee' || s.speed > DASH)) { c.mood = 'caught'; c.respawn = RESPAWN; return 'caught'; }
  const heard = d < noise(s, c.kind);
  if (heard && c.mood !== 'flee' && c.mood !== 'alert') { c.mood = 'alert'; c.timer = .6; } // freeze, ears up, then bolt
  c.timer -= dt;
  if (c.mood === 'alert') { if (!heard) { c.mood = 'idle'; c.timer = 1; } else if (c.timer <= 0) { c.mood = 'flee'; c.timer = 2.5; } return null; }
  let speed = 0;
  if (c.mood === 'flee') { const l = d || 1; c.dir = [dx / l, dz / l]; speed = c.kind.speed; if (c.timer <= 0 && !heard) { c.mood = 'idle'; c.timer = 1.5; } }
  else if (c.mood === 'wander') { speed = c.kind.speed * .3; if (c.timer <= 0) { c.mood = 'idle'; c.timer = 1 + rand() * 2; } }
  else if (c.timer <= 0) { const a = rand() * Math.PI * 2, hx = c.home[0] - c.pos[0], hz = c.home[1] - c.pos[1], far = Math.hypot(hx, hz) > 6; c.dir = far ? [hx / Math.hypot(hx, hz), hz / Math.hypot(hx, hz)] : [Math.cos(a), Math.sin(a)]; c.mood = 'wander'; c.timer = 1 + rand() * 2.5; }
  if (speed) { const nx = c.pos[0] + c.dir[0] * speed * dt, nz = c.pos[1] + c.dir[1] * speed * dt; if (!blocked(nx, nz) && Math.hypot(nx - c.home[0], nz - c.home[1]) < 14) c.pos = [nx, nz]; else if (c.mood === 'flee') c.dir = [-c.dir[1], c.dir[0]]; }
  return null;
}
export function logCatch(life: LifeData, id: string) { return record(life, id); }
