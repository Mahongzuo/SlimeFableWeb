import type {LanderSpec} from '../../content/levels/types';
import type {Vec, Box} from '../slime/types';
import {rng} from './random';

/** Pure layout and game rules. Distances and gravity are deliberately scaled for play. */
export const LANDER_SHOTS = {
  opening: {position: [-16, 32, 43], target: [19, 13, -35]},
  cliff: {position: [9, 10, 22], target: [29, 13, -28]},
  finale: {position: [68, 3.4, 18], target: [55, 12, -3]},
};
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
    // Broad ridges, medium folds and fine dust ripples; leave the approach corridor forgiving.
    const roughness = Math.min(1, Math.max(0, (Math.abs(z) - 5) / 7));
    let h = .08 * Math.sin(x * .42) * Math.sin(z * .31) + roughness *
      (1.1 * Math.sin(x * .09 + .4) * Math.cos(z * .13) + .48 * Math.sin(x * .31 + z * .22) + .16 * Math.cos(x * .91 - z * .7));
    for (const c of craters) {
      const d = Math.hypot(x - c.x, z - c.z) / c.radius;
      if (d < 1) h -= c.depth * (1 - d * d);
      else if (d < 1.3) h += .28 * Math.sin((d - 1) / .3 * Math.PI);
    }
    for (const c of cracks) if (Math.abs(z) < 10 && Math.abs(x - c.x) < c.width / 2) h = -4.5;
    // Agilkia is a forgiving dust plain; a distinct sheltered basin ends the route.
    if (Math.hypot(x, z) < 6 || (x > 55 && Math.abs(z) < 8) || Math.hypot(x - 49, z + 16) < 2.5) h = 0;
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
  if (gx < 0 || gz < 0 || gx > t.width - 1 || gz > t.depth - 1) return -8;
  const ix = Math.min(t.width - 2, Math.floor(gx)), iz = Math.min(t.depth - 2, Math.floor(gz)), u = gx - ix, v = gz - iz;
  const a = t.heights[iz * t.width + ix], b = t.heights[iz * t.width + ix + 1];
  const c = t.heights[(iz + 1) * t.width + ix], d = t.heights[(iz + 1) * t.width + ix + 1];
  let y = u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
  for (const p of l.platforms) if (onPlatform(p, x, z)) y = Math.max(y, p.cliff.max[1]);
  return y;
}
const CLIFF_OUTLINE = [[-5,-2],[-4.8,-3.9],[-2.5,-5],[1.8,-4.7],[4.5,-3.6],[5,-1.8],[4.8,2.7],[2.7,4.8],[-1.6,5],[-4.2,3.9],[-5,2]];
/** Cut corners keep the climbable west face while removing the rectangular silhouette. */
export function cliffOutline(p: SolarPlatform, layer = 1): Vec[] {
  const outline = CLIFF_OUTLINE;
  const t = Math.max(0, Math.min(1, layer));
  return outline.map(([x,z], i) => {
    // The two west anchors stay vertical for the shared character's attach/mantle probes.
    const bulge = i === 0 || i === outline.length - 1 ? 0 : .18 * Math.sin(t * Math.PI * 7 + i) * Math.sin(t * Math.PI);
    return [p.position[0] + x * (1 + bulge * .12), p.cliff.min[1] + (p.position[1] - p.cliff.min[1]) * t, p.position[2] + z * (1 + bulge * .12)];
  });
}
export function onPlatform(p: SolarPlatform, x: number, z: number) {
  const ring = CLIFF_OUTLINE;
  x -= p.position[0]; z -= p.position[2];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    if ((b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]) < -1e-6) return false;
  }
  return true;
}
/** The same closed, stratified polygon cliffs feed rendering and collision baking. */
export function landerTriangles(l: LanderLayout): number[] {
  const out: number[] = [], t = l.terrain;
  const triangle = (a: Vec, b: Vec, c: Vec) => out.push(...a, ...b, ...c);
  const vertex = (x: number, z: number): Vec => [t.x0 + x * t.cell, t.heights[z * t.width + x], t.z0 + z * t.cell];
  for (let z = 0; z < t.depth - 1; z++) for (let x = 0; x < t.width - 1; x++) {
    const a = vertex(x, z), b = vertex(x + 1, z), c = vertex(x, z + 1), d = vertex(x + 1, z + 1);
    triangle(a, c, b); triangle(b, c, d);
  }
  for (const p of l.platforms) {
    const layers = Math.ceil((p.position[1] - p.cliff.min[1]) / .55);
    for (let j = 0; j < layers; j++) {
      const lo = cliffOutline(p, j / layers), hi = cliffOutline(p, (j + 1) / layers);
      for (let i = 0; i < lo.length; i++) {
        const k = (i + 1) % lo.length;
        triangle(lo[i], hi[i], hi[k]); triangle(lo[i], hi[k], lo[k]);
        if (j === 0) triangle([p.position[0], p.cliff.min[1], p.position[2]], lo[i], lo[k]);
        if (j === layers - 1) triangle(p.position, hi[k], hi[i]);
      }
    }
  }
  return out;
}
/** Outer surface meets every playable boundary sample and continues beyond the camera far plane. */
export function horizonHeight(l: LanderLayout, x: number, z: number): number {
  const t = l.terrain, cx = Math.max(t.x0, Math.min(t.x0 + (t.width - 1) * t.cell, x));
  const cz = Math.max(t.z0, Math.min(t.z0 + (t.depth - 1) * t.cell, z));
  const distance = Math.hypot(x - cx, z - cz), fade = Math.min(1, distance / 14);
  return terrainHeight(l, cx, cz) * (1 - fade) + fade *
    (2.4 * Math.sin(x * .057) * Math.cos(z * .071) + .8 * Math.sin(x * .23 + z * .12)) - distance * distance / 340;
}
export function horizonTriangles(l: LanderLayout): number[] {
  const t = l.terrain;
  const axis = (origin: number, count: number) => [origin-1000, origin-500, origin-260, origin-160, origin-100, origin-65, origin-40, origin-24, origin-12, origin-5,
    ...Array.from({length: count}, (_, i) => origin + i * t.cell), ...[5,12,24,40,65,100,160,260,500,1000].map(d => origin + (count - 1) * t.cell + d)];
  const xs = axis(t.x0, t.width), zs = axis(t.z0, t.depth), out: number[] = [];
  const vertex = (x: number, z: number) => [x,horizonHeight(l,x,z),z];
  for (let j=0;j<zs.length-1;j++) for (let i=0;i<xs.length-1;i++) {
    if (xs[i]>=t.x0 && xs[i+1]<=t.x0+(t.width-1)*t.cell && zs[j]>=t.z0 && zs[j+1]<=t.z0+(t.depth-1)*t.cell) continue;
    const a=vertex(xs[i],zs[j]), b=vertex(xs[i+1],zs[j]), c=vertex(xs[i],zs[j+1]), d=vertex(xs[i+1],zs[j+1]);
    out.push(...a,...c,...b,...b,...c,...d);
  }
  return out;
}
function sunlightX(spec: LanderSpec, p: SolarPlatform, time: number) {
  return p.position[0] + Math.sin(time / spec.sunlight.period * Math.PI * 2 + p.phase) * spec.sunlight.travel;
}
export function sunlightCenter(spec: LanderSpec, p: SolarPlatform, time: number, out: Vec = [0,0,0]): Vec {
  out[0]=sunlightX(spec,p,time); out[1]=p.position[1]; out[2]=p.position[2]; return out;
}
export function inSunlight(spec: LanderSpec, l: LanderLayout, p: Vec, time: number): boolean {
  // Abydos remains in the cliff's shelter, including during the transmission.
  if (Math.hypot(p[0] - l.abydos.position[0], p[2] - l.abydos.position[2]) < l.abydos.radius + 1 && p[1] < 4) return false;
  return l.platforms.some(platform => {
    return onPlatform(platform, p[0], p[2]) && Math.abs(p[1] - platform.position[1]) < .65 && Math.hypot(p[0] - sunlightX(spec,platform,time), p[2] - platform.position[2]) <= spec.sunlight.radius;
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
