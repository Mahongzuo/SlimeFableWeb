import type {LanderSpec} from '../../content/levels/types';
import type {Vec, Box} from '../slime/types';
import {rng} from './random';

/** Pure layout and game rules. Distances and gravity are deliberately scaled for play. */
export const LANDER_MOTION = {gravity: 15.68, jump: 6.2, walk: 3.2, radius: .26, bounceThreshold: 2.4};
export interface LandingSite {id: string; position: Vec; radius: number}
export interface SolarPlatform extends LandingSite {cliff: Box; phase: number}
export interface LanderLayout {
  seed: string; gravityScale: number;
  terrain: {x0: number; z0: number; cell: number; width: number; depth: number; heights: number[]};
  craters: {x: number; z: number; radius: number; depth: number}[];
  cracks: {x: number; width: number}[];
  spawn: Vec; agilkia: LandingSite; platforms: SolarPlatform[]; abydos: LandingSite;
  hidden: LandingSite; bounds: {min: Vec; max: Vec};
}
export function generateLander(spec: LanderSpec): LanderLayout {
  const random = rng(spec.seed);
  const craters = Array.from({length: 12}, (_, i) => ({x: random.range(-8, 62), z: (i % 2 ? 1 : -1) * random.range(11, 19), radius: random.range(2, 4), depth: random.range(1, 2.8)}));
  const platforms: SolarPlatform[] = [0, 1, 2].map(i => {
    const x = 16 + i * 16, z = random.int(-2, 2), y = 5 + i * 5;
    return {id: `solar-${i + 1}`, position: [x, y, z], radius: 3.6, phase: i * 2.1,
      cliff: {name: `ice-cliff-${i + 1}`, min: [x - 5, -6, z - 5], max: [x + 5, y, z + 5]}};
  });
  const cracks = platforms.map(p => ({x: p.cliff.min[0] - 2.8, width: 2.2}));
  const terrain = {x0: -14, z0: -24, cell: 1, width: 81, depth: 49, heights: [] as number[]};
  for (let iz = 0; iz < terrain.depth; iz++) for (let ix = 0; ix < terrain.width; ix++) {
    const x = terrain.x0 + ix, z = terrain.z0 + iz;
    let h = .10 * Math.sin(x * .42) * Math.sin(z * .31);
    for (const c of craters) {
      const d = Math.hypot(x - c.x, z - c.z) / c.radius;
      if (d < 1) h -= c.depth * (1 - d * d);
      else if (d < 1.3) h += .28 * Math.sin((d - 1) / .3 * Math.PI);
    }
    for (const c of cracks) if (Math.abs(z) < 10 && Math.abs(x - c.x) < c.width / 2) h = -4.5;
    // Agilkia is a forgiving dust plain; a distinct sheltered basin ends the route.
    if (Math.hypot(x, z) < 6 || (x > 55 && Math.abs(z) < 8)) h = 0;
    terrain.heights.push(h);
  }
  return {seed: spec.seed, gravityScale: spec.gravityScale, terrain, craters, cracks, platforms,
    spawn: [0, 36, 0], agilkia: {id: 'Agilkia', position: [0, 0, 0], radius: 4},
    abydos: {id: 'Abydos', position: [59, 0, 1], radius: 3},
    hidden: {id: 'duck-rock', position: [49, 0, -16], radius: 1.5},
    bounds: {min: [-13, -8, -23], max: [65, 65, 23]}};
}
/** Same triangular interpolation as the rendered ground, followed by the solid ice terraces. */
export function terrainHeight(l: LanderLayout, x: number, z: number): number {
  const t = l.terrain, gx = (x - t.x0) / t.cell, gz = (z - t.z0) / t.cell;
  if (gx < 0 || gz < 0 || gx >= t.width - 1 || gz >= t.depth - 1) return -8;
  const ix = Math.floor(gx), iz = Math.floor(gz), u = gx - ix, v = gz - iz;
  const a = t.heights[iz * t.width + ix], b = t.heights[iz * t.width + ix + 1];
  const c = t.heights[(iz + 1) * t.width + ix], d = t.heights[(iz + 1) * t.width + ix + 1];
  let y = u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
  for (const p of l.platforms) if (x >= p.cliff.min[0] && x <= p.cliff.max[0] && z >= p.cliff.min[2] && z <= p.cliff.max[2]) y = Math.max(y, p.cliff.max[1]);
  return y;
}
/** Ground and closed ice cliffs in one triangle stream, shared by rendering and collision tests. */
export function landerTriangles(l: LanderLayout): number[] {
  const out: number[] = [], t = l.terrain;
  const triangle = (a: Vec, b: Vec, c: Vec) => out.push(...a, ...b, ...c);
  const vertex = (x: number, z: number): Vec => [t.x0 + x * t.cell, t.heights[z * t.width + x], t.z0 + z * t.cell];
  for (let z = 0; z < t.depth - 1; z++) for (let x = 0; x < t.width - 1; x++) {
    const a = vertex(x, z), b = vertex(x + 1, z), c = vertex(x, z + 1), d = vertex(x + 1, z + 1);
    triangle(a, c, b); triangle(b, c, d);
  }
  for (const p of l.platforms) {
    const [x, y, z] = p.cliff.min, [X, Y, Z] = p.cliff.max;
    const v: Vec[] = [[x,y,z],[X,y,z],[X,y,Z],[x,y,Z],[x,Y,z],[X,Y,z],[X,Y,Z],[x,Y,Z]];
    for (const [a,b,c,d] of [[4,7,6,5],[0,1,2,3],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]]) { triangle(v[a],v[b],v[c]); triangle(v[a],v[c],v[d]); }
  }
  return out;
}
export function sunlightCenter(spec: LanderSpec, p: SolarPlatform, time: number): Vec {
  return [p.position[0] + Math.sin(time / spec.sunlight.period * Math.PI * 2 + p.phase) * spec.sunlight.travel, p.position[1], p.position[2]];
}
export function inSunlight(spec: LanderSpec, l: LanderLayout, p: Vec, time: number): boolean {
  // Abydos remains in the cliff's shelter, including during the transmission.
  if (Math.hypot(p[0] - l.abydos.position[0], p[2] - l.abydos.position[2]) < l.abydos.radius + 1 && p[1] < 4) return false;
  return l.platforms.some(platform => {
    const center = sunlightCenter(spec, platform, time), c = platform.cliff;
    return p[0] >= c.min[0] && p[0] <= c.max[0] && p[2] >= c.min[2] && p[2] <= c.max[2] && Math.abs(p[1] - center[1]) < .65 && Math.hypot(p[0] - center[0], p[2] - center[2]) <= spec.sunlight.radius;
  });
}
export const batteryAfter = (spec: LanderSpec, battery: number, sunny: boolean, dt: number) => Math.max(0, Math.min(spec.battery.capacity, battery + (sunny ? spec.battery.sunCharge : -spec.battery.shadowDrain) * dt));
export const landingBounce = (speed: number, spread: number) => spread > .5 || speed <= LANDER_MOTION.bounceThreshold ? 0 : Math.min(5.4, speed * .62);
export const batteryMedal = (spec: LanderSpec, battery: number) => battery >= spec.medals.gold ? 3 : battery >= spec.medals.silver ? 2 : 1;
/** Certificate: wait in the jump's arc, cross the gap, meet the west ice face, then climb. */
export function platformApproach(l: LanderLayout, index: number) {
  const target = l.platforms[index], previous = l.platforms[index - 1];
  const start: Vec = previous ? [previous.cliff.max[0] - 1, previous.position[1], previous.position[2]] : [4, 0, 0];
  const wall: Vec = [target.cliff.min[0] - .29, target.position[1] - 1.2, target.position[2]];
  const g = LANDER_MOTION.gravity * l.gravityScale, dy = wall[1] - start[1];
  const disc = LANDER_MOTION.jump ** 2 - 2 * g * dy;
  const duration = disc >= 0 ? (LANDER_MOTION.jump + Math.sqrt(disc)) / g : NaN;
  const travel = Math.hypot(wall[0] - start[0], wall[2] - start[2]) / LANDER_MOTION.walk;
  return {start, wall, duration, travel, wait: duration - travel};
}
export function validateLander(l: LanderLayout) {
  const errors: string[] = [];
  if (l.platforms.length !== 3) errors.push('需要三个阳光平台');
  if (!(l.gravityScale > 0)) errors.push('重力必须为正');
  l.platforms.forEach((p, i) => {
    const a = platformApproach(l, i), g = LANDER_MOTION.gravity * l.gravityScale;
    if (!Number.isFinite(a.duration) || a.wait < 0) { errors.push(`${p.id}: 跳跃无法到达冰崖`); return; }
    for (let t = 0; t <= a.duration; t += .025) {
      const f = Math.max(0, Math.min(1, (t - a.wait) / a.travel));
      const x = a.start[0] + (a.wall[0] - a.start[0]) * f, z = a.start[2] + (a.wall[2] - a.start[2]) * f;
      const y = a.start[1] + LANDER_MOTION.jump * t - g * t * t / 2;
      if (terrainHeight(l, x, z) > y + .12 || y > l.bounds.max[1] - .6) { errors.push(`${p.id}: 跳跃路径被地形阻挡或越界`); break; }
    }
    if (Math.abs(terrainHeight(l, p.position[0], p.position[2]) - p.position[1]) > .1 || p.cliff.max[1] < a.wall[1] + .7 || p.cliff.min[1] > a.wall[1] || p.cliff.max[0] - p.cliff.min[0] < 1) errors.push(`${p.id}: 冰崖缺少连续墙面或可站立顶部`);
  });
  return {ok: !errors.length, errors};
}
