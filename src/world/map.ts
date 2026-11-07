import type {GroundSurface, FluidVolume} from '../slime/world';
import {hill} from '../home/harbor-world';
/**
 * Home map: the original 60 m harbour block stays where it is; new land grows north and west of it (about 6× the area).
 * Everything here is pure data / pure functions so the worker, tests and zone builders agree on the same ground.
 */
export type ZoneId = 'harbor' | 'park' | 'lake' | 'farm' | 'forest';
export interface ZoneRect {id: ZoneId; name: string; min: [number, number]; max: [number, number]}
export const ZONES: ZoneRect[] = [
  {id: 'harbor', name: '晴雨港', min: [-30, -30], max: [30, 30]},
  {id: 'park', name: '风车公园', min: [-30, 30], max: [31, 80]},
  {id: 'lake', name: '镜湖', min: [-30, 80], max: [31, 142]},
  {id: 'farm', name: '梯田农场', min: [-106, -31], max: [-30, 30]},
  {id: 'forest', name: '松果林', min: [-106, 30], max: [-30, 142]},
];
export const WORLD = {min: [-106, -31] as [number, number], max: [31, 142] as [number, number]};
export const LAKE = {center: [2, 114] as [number, number], rx: 22, rz: 16, level: -.45, depth: 2.6};
/** Farm terraces step up westward; a retaining wall stands at each of these x. */
export const TERRACE = {first: -40, width: 11, rise: .9, count: 5};
/** Dirt paths between zones (polylines, metres). */
export const PATHS: [number, number][][] = [
  [[13, 29], [12, 40], [4, 52], [2, 66], [2, 80], [2, 94]],
  [[-29, 6], [-38, 4], [-52, 0], [-70, -2], [-92, -4]],
  [[-29, 52], [-42, 56], [-58, 66], [-74, 80], [-82, 104]],
  [[-66, 29], [-66, 40], [-62, 58]],
  [[2, 66], [-14, 60], [-29, 52]],
];
export const zoneAt = (x: number, z: number): ZoneId => {
  for (let i = ZONES.length - 1; i >= 0; i--) { const r = ZONES[i]; if (x >= r.min[0] && x <= r.max[0] && z >= r.min[1] && z <= r.max[1]) return r.id; }
  return 'harbor';
};
const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const segDist = (x: number, z: number, a: [number, number], b: [number, number]) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
};
export const pathDistance = (x: number, z: number) => { let d = Infinity; for (const p of PATHS) for (let i = 1; i < p.length; i++) d = Math.min(d, segDist(x, z, p[i - 1], p[i])); return d; };
/** 0 inside the lake shoreline ellipse … 1 at/after the shore. */
export const lakeEdge = (x: number, z: number) => Math.hypot((x - LAKE.center[0]) / LAKE.rx, (z - LAKE.center[1]) / LAKE.rz);
const hills = (x: number, z: number) => 1.1 + .9 * Math.sin(x * .071 + 1.1) * Math.sin(z * .064 + .4) + .45 * Math.sin(x * .13 - z * .09 + 2) + .25 * Math.sin(z * .19 + x * .05);

/** Ground height of the new land (not used inside the harbour block). */
export function inland(x: number, z: number): number {
  const zone = zoneAt(x, z), d = Math.max(-30 - x, z - 30, 0), seam = smooth(2, 16, d);
  let h = 0;
  if (zone === 'farm') {
    const k = Math.max(0, Math.min(TERRACE.count, Math.floor((TERRACE.first - x) / TERRACE.width) + 1));
    h = k * TERRACE.rise + .12 * Math.sin(z * .2) * smooth(-2, 4, TERRACE.first - x);
    h = Math.max(h, hill(-30, z) * (1 - smooth(0, 9, d)));
  } else if (zone === 'forest') h = hills(x, z) * 1.5 * seam;
  else if (zone === 'park') {
    const mound = 3.2 * (1 - smooth(0, 1, Math.hypot(x - 20, z - 64) / 10));
    h = (.25 * Math.sin(x * .2) * Math.sin(z * .17) + .25) * seam + mound;
  } else if (zone === 'lake') {
    const e = lakeEdge(x, z);
    h = (hills(x, z) * .7) * smooth(1.05, 1.6, e) * seam;
    if (e < 1.15) h = Math.min(h, LAKE.level + .35 - LAKE.depth * (1 - smooth(.35, 1.15, e)) + .35 * smooth(.85, 1.15, e));
  }
  // paths are flattened a little so the slime can roll along them
  const p = pathDistance(x, z); if (p < 3 && zone !== 'harbor') h = h * (.55 + .45 * smooth(1.2, 3, p));
  return h;
}
/** Analytic ground for the collision world: two 1 m grids (north strip, west strip). */
export function inlandSurfaces(): GroundSurface[] {
  const grid = (min: [number, number], max: [number, number]): GroundSurface => {
    const w = max[0] - min[0] + 1, h = max[1] - min[1] + 1, values: number[] = [];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) values.push(inland(min[0] + i, min[1] + j));
    return {min, max, height: 0, grid: {width: w, height: h, values}};
  };
  return [grid([-106, 30], [31, 142]), grid([-106, -31], [-30, 30])];
}
export const lakeFluid: FluidVolume = {min: [LAKE.center[0] - LAKE.rx * 1.2, LAKE.center[1] - LAKE.rz * 1.2], max: [LAKE.center[0] + LAKE.rx * 1.2, LAKE.center[1] + LAKE.rz * 1.2], level: LAKE.level, sink: .14};
