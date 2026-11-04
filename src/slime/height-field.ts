import {clamp} from './types';
import type {FluidVolume} from './world';
/**
 * 2.5D collision: one walkable top height per XZ cell, baked once from scene triangles.
 * Queries are O(1) array reads, so the particle solver cost no longer depends on scene complexity.
 */
export interface HeightFieldData {x0: number; z0: number; cell: number; w: number; h: number; data: Float32Array}
export const NO_FLOOR = -1e4;
const empty = (v: number) => v <= NO_FLOOR / 2;
export class HeightField {
  constructor(readonly d: HeightFieldData) {}
  /** Nearest cell, unsmoothed: used for wall tests so edges stay sharp. */
  raw(x: number, z: number) {
    const d = this.d, i = Math.floor((x - d.x0) / d.cell), j = Math.floor((z - d.z0) / d.cell);
    if (i < 0 || j < 0 || i >= d.w || j >= d.h) return NO_FLOOR;
    return d.data[i + j * d.w];
  }
  /** Smooth where the four neighbours agree (ramps, decks); nearest cell across steps and walls. */
  at(x: number, z: number): number | null {
    const d = this.d, gx = (x - d.x0) / d.cell - .5, gz = (z - d.z0) / d.cell - .5, i = Math.floor(gx), j = Math.floor(gz);
    if (i < 0 || j < 0 || i >= d.w - 1 || j >= d.h - 1) { const r = this.raw(x, z); return empty(r) ? null : r; }
    const a = d.data[i + j * d.w], b = d.data[i + 1 + j * d.w], c = d.data[i + (j + 1) * d.w], e = d.data[i + 1 + (j + 1) * d.w];
    const lo = Math.min(a, b, c, e), hi = Math.max(a, b, c, e);
    if (empty(hi)) return null;
    if (hi - lo < .3) { const tx = gx - i, tz = gz - j; return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + e * tx) * tz; }
    const r = this.raw(x, z); return empty(r) ? null : r;
  }
}
export interface HeightBakeOptions {x0: number; z0: number; size: number; cell: number; clearance?: number; fluids?: FluidVolume[]}
const Y0 = -8, BIN = .25, NB = 88, WORDS = 3;
/**
 * Rasterise triangles into per-cell height-bin occupancy, then keep the top of the solid stack that starts at the
 * floor. A vertical gap wider than `clearance` (lamp arms, eaves, tree canopies) ends the stack, so it can be walked
 * under. In open water the stack starts just below the surface, so the seabed is ignored but hulls and tetrapods count.
 */
export function bakeHeightField(tris: ArrayLike<number>, o: HeightBakeOptions): HeightFieldData {
  const cell = o.cell, w = Math.ceil(o.size / cell), h = w, N = w * h, gapBins = Math.max(1, Math.round((o.clearance ?? .75) / BIN) - 1);
  const binOf = (y: number) => clamp(Math.floor((y - Y0) / BIN), 0, NB - 1);
  const cellOf = (x: number, z: number) => { const i = Math.floor((x - o.x0) / cell), j = Math.floor((z - o.z0) / cell); return i < 0 || j < 0 || i >= w || j >= h ? -1 : i + j * w; };
  const visit = (fn: (k: number, y: number) => void) => {
    for (let t = 0; t + 8 < tris.length; t += 9) {
      const ax = tris[t], ay = tris[t + 1], az = tris[t + 2], bx = tris[t + 3], by = tris[t + 4], bz = tris[t + 5], cx = tris[t + 6], cy = tris[t + 7], cz = tris[t + 8];
      const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, len = Math.hypot(nx, ny, nz);
      if (len < 1e-9) continue;
      for (const [x, y, z] of [[ax, ay, az], [bx, by, bz], [cx, cy, cz]]) { const k = cellOf(x, z); if (k >= 0) fn(k, y); }
      if (Math.abs(ny) / len > .35) {
        const den = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(den) < 1e-12) continue;
        const i0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - o.x0) / cell)), i1 = Math.min(w - 1, Math.floor((Math.max(ax, bx, cx) - o.x0) / cell));
        const j0 = Math.max(0, Math.floor((Math.min(az, bz, cz) - o.z0) / cell)), j1 = Math.min(h - 1, Math.floor((Math.max(az, bz, cz) - o.z0) / cell));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const px = o.x0 + (i + .5) * cell, pz = o.z0 + (j + .5) * cell;
          const u = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / den, v = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / den;
          if (u < -1e-4 || v < -1e-4 || u + v > 1.0001) continue;
          fn(i + j * w, ay * u + by * v + cy * (1 - u - v));
        }
      } else {
        const n = Math.min(400, Math.ceil(Math.max(Math.hypot(ux, uy, uz), Math.hypot(vx, vy, vz), Math.hypot(cx - bx, cy - by, cz - bz)) / (cell * .85)));
        for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
          const s = i / n, q = j / n, x = ax + ux * s + vx * q, z = az + uz * s + vz * q, k = cellOf(x, z);
          if (k >= 0) fn(k, ay + uy * s + vy * q);
        }
      }
    }
  };
  const bits = new Uint32Array(N * WORDS);
  visit((k, y) => { const b = binOf(y); bits[k * WORDS + (b >> 5)] |= 1 << (b & 31); });
  const has = (k: number, b: number) => (bits[k * WORDS + (b >> 5)] >>> (b & 31)) & 1;
  const top = new Int16Array(N).fill(-1);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = i + j * w, x = o.x0 + (i + .5) * cell, z = o.z0 + (j + .5) * cell;
    const fluid = o.fluids?.find(f => x >= f.min[0] && x <= f.max[0] && z >= f.min[1] && z <= f.max[1]);
    let b = fluid ? binOf(fluid.level - 1.3) : 0;
    while (b < NB && !has(k, b)) b++;
    if (b >= NB) continue;
    let last = b, gap = 0;
    for (let q = b + 1; q < NB; q++) { if (has(k, q)) { last = q; gap = 0; } else if (++gap > gapBins) break; }
    top[k] = last;
  }
  const data = new Float32Array(N).fill(NO_FLOOR);
  visit((k, y) => { if (top[k] >= 0 && binOf(y) === top[k] && y > data[k]) data[k] = y; });
  return {x0: o.x0, z0: o.z0, cell, w, h, data};
}
