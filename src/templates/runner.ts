import type {Box, Vec} from '../slime/types';
import type {RunnerSegment, RunnerSpec} from '../../content/levels/types';
import {rng} from './random';
/**
 * Runner course, pure data. The course runs along +x; every solid is a box tagged with what it is, so the theme
 * knows what to draw and the validator can check every gap and rise against the slime's jump.
 * Jump budget (character.ts): single jump ≈ 1.2 m up, ≈ 2.5 m across at walking speed — courses stay inside
 * RUNNER_LIMITS so the line is always clearable without sprinting or double-jumping.
 */
export const RUNNER_LIMITS = {gap: 2.2, rise: 1.0, drop: 4.5};
export type PieceKind = 'ground' | 'wall' | 'gate' | 'crate' | 'cart' | 'house' | 'roof' | 'ridge' | 'stair' | 'crowd' | 'lamp' | 'rail' | 'bridge' | 'plinth' | 'tower' | 'pole';
export interface Piece extends Box {kind: PieceKind; segment: RunnerSegment; walk: boolean}
export interface RunnerLayout {
  seed: string; spawn: Vec; spawnYaw: number; pieces: Piece[]; pickups: Vec[];
  /** Walkable line the validator follows: one top surface per step, in order. */
  route: {x0: number; x1: number; z: number; y: number; segment: RunnerSegment}[];
  segments: {kind: RunnerSegment; x0: number; x1: number}[];
  water: {min: [number, number]; max: [number, number]; level: number}[];
  finish: {x: number; y: number; z: number; r: number}; bounds: {min: Vec; max: Vec};
}
export function generateRunner(spec: RunnerSpec): RunnerLayout {
  const r = rng(spec.seed), pieces: Piece[] = [], route: RunnerLayout['route'] = [], segments: RunnerLayout['segments'] = [], water: RunnerLayout['water'] = [];
  let x = 0, seg: RunnerSegment = 'hutong';
  const box = (kind: PieceKind, min: Vec, max: Vec, walk = false) => { pieces.push({name: `${seg}-${kind}-${pieces.length}`, kind, segment: seg, walk, min, max}); };
  const step = (x0: number, x1: number, y: number, z = 0) => route.push({x0, x1, z, y, segment: seg});
  for (const kind of spec.segments) {
    seg = kind; const start = x;
    if (kind === 'hutong') { // a 3.4 m alley between grey walls, carts and crate steps to hop
      const len = 46; box('ground', [x, -.2, -1.7], [x + len, 0, 1.7], true);
      for (const side of [-1, 1]) for (let k = 0; k < len; ) { const w = r.range(5, 9); box(r.chance(.35) ? 'gate' : 'wall', [x + k, 0, side > 0 ? 1.7 : -2.3], [x + Math.min(len, k + w), r.range(2.8, 3.4), side > 0 ? 2.3 : -1.7]); k += w; }
      let cx = x + 6; step(x, cx, 0);
      while (cx < x + len - 6) { const h = r.pick([.5, .7, .9]), w = r.range(1.2, 2.2); box(r.chance(.5) ? 'crate' : 'cart', [cx, 0, -1.1], [cx + w, h, 1.1], true); step(cx, cx + w, h); const gap = r.range(2.5, 4.5); step(cx + w, cx + w + gap, 0); cx += w + gap; }
      step(cx, x + len, 0); x += len;
    } else if (kind === 'roofs') { // stairs up onto a row of courtyard roofs, small gaps between them, a ramp back down
      box('ground', [x, -.2, -4], [x + 52, 0, 4], true);
      let y = 0, cx = x; for (let k = 0; k < 4; k++) { box('stair', [cx, 0, -1.2], [cx + 1.1, y + .8, 1.2], true); y += .8; step(cx, cx + 1.1, y); cx += 1.1; }
      let gapTotal = 0;
      while (cx < x + 44) {
        const w = r.range(5, 8), hy = r.pick([3.2, 3.6, 4.0]) as number;
        const top = Math.min(hy, route[route.length - 1].y + RUNNER_LIMITS.rise);
        box('house', [cx, 0, -3.5], [cx + w, top - .2, 3.5]); box('roof', [cx - .2, top - .2, -1.4], [cx + w + .2, top, 1.4], true); box('ridge', [cx - .2, top, -.18], [cx + w + .2, top + .22, .18]);
        step(cx, cx + w, top); const gap = r.range(1.0, RUNNER_LIMITS.gap - .2); gapTotal += gap; cx += w + gap;
      }
      const last = route[route.length - 1].y; let yy = last; while (yy > .5) { yy = Math.max(0, yy - .8); box('stair', [cx, 0, -1.2], [cx + 1.1, yy, 1.2], true); step(cx, cx + 1.1, yy); cx += 1.1; }
      step(cx, cx + 2, 0); x = cx + 2;
    } else if (kind === 'avenue') { // Chang'an Avenue: wide, crowds to weave round, lamp posts
      const len = 50; box('ground', [x, -.2, -9], [x + len, 0, 9], true); step(x, x + len, 0);
      for (let k = 6; k < len - 4; k += r.range(5, 8)) { const z0 = r.range(-7, 3); box('crowd', [x + k, 0, z0], [x + k + r.range(1.2, 2.2), 1.6, z0 + r.range(1.5, 3.5)]); }
      for (let k = 2; k < len; k += 10) for (const z of [-8.4, 8.4]) box('lamp', [x + k - .12, 0, z - .12], [x + k + .12, 3.6, z + .12]);
      x += len;
    } else { // Golden Water Bridges over the moat, then the square in front of the gate tower
      const moat = 7; box('ground', [x, -.2, -12], [x + 3, 0, 12], true); step(x, x + 3, 0); x += 3;
      box('ground', [x, -1.6, -12], [x + moat, -1.4, 12]); water.push({min: [x, -12], max: [x + moat, 12], level: -.7});
      for (const z of [-8, -4, 0, 4, 8]) { const w = z === 0 ? 2.4 : 1.8; box('bridge', [x, -.4, z - w / 2], [x + moat, .15, z + w / 2], true); for (const s of [-1, 1]) box('rail', [x, .15, z + s * w / 2 - (s > 0 ? .12 : 0)], [x + moat, .7, z + s * w / 2 + (s < 0 ? .12 : 0)]); }
      step(x, x + moat, .15); x += moat;
      box('ground', [x, -.2, -12], [x + 22, 0, 12], true); step(x, x + 22, 0);
      box('plinth', [x + 9, 0, -1.2], [x + 11.4, .5, 1.2], true); box('pole', [x + 10.1, .5, -.1], [x + 10.3, 9, .1]);
      box('tower', [x + 18, 0, -12], [x + 22, 9, 12]);
      x += 22;
    }
    segments.push({kind, x0: start, x1: x});
  }
  // pickups: spread along the route, a little above each walkable stretch
  const pickups: Vec[] = [], total = route.reduce((s, q) => s + (q.x1 - q.x0), 0); let acc = 0, next = 3;
  const gapPer = (total - 6) / spec.pickup.count;
  for (const q of route) { while (next <= acc + (q.x1 - q.x0) && pickups.length < spec.pickup.count) { const px = q.x0 + (next - acc); pickups.push([px, q.y + .6, q.segment === 'avenue' ? Math.sin(px * .35) * 5 : q.z]); next += gapPer; } acc += q.x1 - q.x0; }
  const fin = segments[segments.length - 1], plinth = pieces.find(p => p.kind === 'plinth')!;
  return {seed: spec.seed, spawn: [1.5, 0, 0], spawnYaw: -Math.PI / 2, pieces, pickups, route, segments, water,
    finish: {x: (plinth.min[0] + plinth.max[0]) / 2, y: plinth.max[1], z: 0, r: 2.2},
    bounds: {min: [-4, -6, -14], max: [x + 4, 30, 14]}};
}
/** Every step of the route must be reachable from the one before with a single walking jump. */
export function validateRunner(l: RunnerLayout) {
  const errors: string[] = [];
  for (let i = 1; i < l.route.length; i++) {
    const a = l.route[i - 1], b = l.route[i], gap = b.x0 - a.x1, rise = b.y - a.y;
    if (gap > RUNNER_LIMITS.gap + 1e-6) errors.push(`gap ${gap.toFixed(2)} m before x=${b.x0.toFixed(1)}`);
    if (rise > RUNNER_LIMITS.rise + 1e-6) errors.push(`rise ${rise.toFixed(2)} m at x=${b.x0.toFixed(1)}`);
    if (-rise > RUNNER_LIMITS.drop) errors.push(`drop ${(-rise).toFixed(2)} m at x=${b.x0.toFixed(1)}`);
  }
  return {ok: !errors.length, errors};
}
