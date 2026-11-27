import {clamp} from './types';
import type {FluidVolume} from './world';
/**
 * 2.5D collision: one walkable top height per XZ cell, baked once from scene triangles.
 * Queries are O(1) array reads, so the particle solver cost no longer depends on scene complexity.
 */
export interface HeightFieldData {x0: number; z0: number; cell: number; w: number; h: number; data: Float32Array; noCling?: Uint8Array}
export const NO_FLOOR = -1e4;
const empty = (v: number) => v <= NO_FLOOR / 2;
export class HeightField {
  constructor(readonly d: HeightFieldData) {}
  cell(i: number, j: number) { const d = this.d; return i < 0 || j < 0 || i >= d.w || j >= d.h ? NO_FLOOR : d.data[i + j * d.w]; }
  /** True when the cell belongs to a solid non-climbable obstacle (e.g. a tree trunk). */
  isNoCling(x: number, z: number) {
    const d = this.d;
    if (!d.noCling) return false;
    const i = Math.floor((x - d.x0) / d.cell), j = Math.floor((z - d.z0) / d.cell);
    if (i < 0 || j < 0 || i >= d.w || j >= d.h) return false;
    return d.noCling[i + j * d.w] !== 0;
  }
  /**
   * Keep a particle `skin` metres clear of wall columns (like UE's collider skin = particle spacing), so the
   * reconstructed surface, which grows past the particles, rests against walls instead of sinking into them.
   * A wall is a neighbour column topping out above the particle and clearly above its own cell (not a slope).
   */
  pushOut(p: [number, number, number], skin: number) {
    const d = this.d, c = d.cell, fx = (p[0] - d.x0) / c, fz = (p[2] - d.z0) / c, i = Math.floor(fx), j = Math.floor(fz);
    if (i < 1 || j < 1 || i >= d.w - 1 || j >= d.h - 1) return;
    const own = this.cell(i, j);
    if (own > p[1] + .36) { // inside a column: leave through the nearest free cell (no deadzone vs support 0.38)
      let best = Infinity, bx = 0, bz = 0;
      for (let r = 1; r <= 5 && best === Infinity; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r || this.cell(i + di, j + dj) > p[1] + .03) continue;
        const nx = Math.min(Math.max(fx, i + di + skin / c), i + di + 1 - skin / c), nz = Math.min(Math.max(fz, j + dj + skin / c), j + dj + 1 - skin / c);
        const dist = Math.hypot(nx - fx, nz - fz); if (dist < best) { best = dist; bx = nx; bz = nz; }
      }
      if (best < Infinity) { p[0] = d.x0 + bx * c; p[2] = d.z0 + bz * c; }
      return;
    }
    const wall = (di: number, dj: number) => { const v = this.cell(i + di, j + dj); return v > p[1] + .03 && v > own + .12; };
    const L = wall(-1, 0), R = wall(1, 0), B = wall(0, -1), F = wall(0, 1), s = skin / c;
    let x = fx, z = fz;
    if (L && x - i < s) x = i + s; if (R && i + 1 - x < s) x = i + 1 - s;
    if (B && z - j < s) z = j + s; if (F && j + 1 - z < s) z = j + 1 - s;
    for (const [di, dj] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      if (!wall(di, dj) || (di < 0 ? L : R) || (dj < 0 ? B : F)) continue;
      const cx = di < 0 ? i : i + 1, cz = dj < 0 ? j : j + 1, vx = x - cx, vz = z - cz, len = Math.hypot(vx, vz);
      if (len < s && len > 1e-6) { x = cx + vx / len * s; z = cz + vz / len * s; }
    }
    p[0] = d.x0 + x * c; p[2] = d.z0 + z * c;
  }
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
/** `ground`: the walkable floor where the scan starts (e.g. the analytic terrain). Without it the scan starts at the lowest geometry, which can be the underside of a slab. */
export interface HeightBakeOptions {x0: number; z0: number; size: number; /** Depth in z when the region is not square. */ sizeZ?: number; cell: number; clearance?: number; fluids?: FluidVolume[]; ground?: (x: number, z: number) => number | null;
  /** Triangles of hollow shells (hulls, tetrapod piles) whose columns count as solid up to their highest surface. */
  filled?: ArrayLike<number>;
  /** Per triangle: 1 = double-sided sheet (counts as both a top and an underside). */
  sheets?: ArrayLike<number>;
  /** Per triangle: 1 = solid obstacle that cannot be wall-climbed (e.g. tree trunks). */
  noCling?: ArrayLike<number>}
const Y0 = -8, BIN = .25, NB = 88, WORDS = 3;
/**
 * Several baked tiles (the harbour plus each Home zone that has solid props). Queries go to the tile that contains
 * the point; outside every tile there are no props, only the analytic terrain, so the answer is NO_FLOOR.
 */
export class HeightAtlas {
  private tiles: HeightField[];
  constructor(data: HeightFieldData[]) { this.tiles = data.map(d => new HeightField(d)); }
  private tile(x: number, z: number) { for (const t of this.tiles) { const d = t.d; if (x >= d.x0 && z >= d.z0 && x < d.x0 + d.w * d.cell && z < d.z0 + d.h * d.cell) return t; } return null; }
  pushOut(p: [number, number, number], skin: number) { this.tile(p[0], p[2])?.pushOut(p, skin); }
  raw(x: number, z: number) { return this.tile(x, z)?.raw(x, z) ?? NO_FLOOR; }
  at(x: number, z: number) { const t = this.tile(x, z); return t ? t.at(x, z) : null; }
  isNoCling(x: number, z: number) { return this.tile(x, z)?.isNoCling(x, z) ?? false; }
}
export function bakeHeightField(tris: ArrayLike<number>, o: HeightBakeOptions): HeightFieldData {
  const base = bakeStack(tris, o);
  if (!o.filled?.length) return base;
  const top = bakeStack(o.filled, {...o, fluids: undefined, ground: undefined, sheets: undefined, noCling: undefined, clearance: 1e3});
  for (let k = 0; k < base.data.length; k++) if (top.data[k] > base.data[k]) base.data[k] = top.data[k];
  return base;
}
/**
 * Rasterise triangles per XZ cell. Flat surfaces are kept as ordered hits with their facing (a downward face enters a
 * solid going up, an upward face leaves it); steep surfaces mark height bins. Walking up from the floor, the column
 * stays solid through closed objects (vending machines, crate stacks, seams between stacked parts) and through gaps
 * bridged by walls; it stops at open air wider than `clearance` topped by an underside (lamp arms, eaves, canopies).
 * In open water the column starts just below the surface, so the seabed is ignored.
 */
function bakeStack(tris: ArrayLike<number>, o: HeightBakeOptions): HeightFieldData {
  const cell = o.cell, w = Math.ceil(o.size / cell), h = Math.ceil((o.sizeZ ?? o.size) / cell), N = w * h, clearance = o.clearance ?? .75, gapBins = Math.max(1, Math.round(clearance / BIN) - 1);
  const binOf = (y: number) => clamp(Math.floor((y - Y0) / BIN), 0, NB - 1);
  const cellOf = (x: number, z: number) => { const i = Math.floor((x - o.x0) / cell), j = Math.floor((z - o.z0) / cell); return i < 0 || j < 0 || i >= w || j >= h ? -1 : i + j * w; };
  const side = new Uint32Array(N * WORDS), sideTop = new Float32Array(N).fill(NO_FLOOR);
  let noClingCells: Uint8Array | null = null;
  const markNoCling = (k: number) => { (noClingCells ??= new Uint8Array(N))[k] = 1; };
  let cap = 1 << 20, count = 0, hy = new Float32Array(cap), hs = new Int8Array(cap), hn = new Int32Array(cap);
  const head = new Int32Array(N).fill(-1);
  const hit = (k: number, y: number, s: number) => {
    if (count >= cap) { cap *= 2; const y2 = new Float32Array(cap), s2 = new Int8Array(cap), n2 = new Int32Array(cap); y2.set(hy); s2.set(hs); n2.set(hn); hy = y2; hs = s2; hn = n2; }
    hy[count] = y; hs[count] = s; hn[count] = head[k]; head[k] = count++;
  };
  const mark = (k: number, y: number) => { const b = binOf(y); side[k * WORDS + (b >> 5)] |= 1 << (b & 31); if (y > sideTop[k]) sideTop[k] = y; };
  for (let t = 0; t + 8 < tris.length; t += 9) {
    const triIdx = t / 9;
    const sheet = o.sheets?.[triIdx] === 1;
    const noCling = o.noCling?.[triIdx] === 1;
    const ax = tris[t], ay = tris[t + 1], az = tris[t + 2], bx = tris[t + 3], by = tris[t + 4], bz = tris[t + 5], cx = tris[t + 6], cy = tris[t + 7], cz = tris[t + 8];
    const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, len = Math.hypot(nx, ny, nz);
    if (len < 1e-9) continue;
    for (const [x, y, z] of [[ax, ay, az], [bx, by, bz], [cx, cy, cz]]) { const k = cellOf(x, z); if (k >= 0) { mark(k, y); if (noCling) markNoCling(k); } }
    if (Math.abs(ny) / len > .35) {
      const den = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(den) < 1e-12) continue;
      const i0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - o.x0) / cell)), i1 = Math.min(w - 1, Math.floor((Math.max(ax, bx, cx) - o.x0) / cell));
      const j0 = Math.max(0, Math.floor((Math.min(az, bz, cz) - o.z0) / cell)), j1 = Math.min(h - 1, Math.floor((Math.max(az, bz, cz) - o.z0) / cell));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const px = o.x0 + (i + .5) * cell, pz = o.z0 + (j + .5) * cell;
        const u = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / den, v = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / den;
        if (u < -1e-4 || v < -1e-4 || u + v > 1.0001) continue;
        const y = ay * u + by * v + cy * (1 - u - v), k = i + j * w;
        if (sheet) { hit(k, y - 1e-4, 1); hit(k, y, -1); } else hit(k, y, ny > 0 ? -1 : 1);
        if (noCling) markNoCling(k);
      }
    } else {
      const n = Math.min(400, Math.ceil(Math.max(Math.hypot(ux, uy, uz), Math.hypot(vx, vy, vz), Math.hypot(cx - bx, cy - by, cz - bz)) / (cell * .85)));
      for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
        const a = i / n, q = j / n, k = cellOf(ax + ux * a + vx * q, az + uz * a + vz * q);
        if (k >= 0) { mark(k, ay + uy * a + vy * q); if (noCling) markNoCling(k); }
      }
    }
  }
  const hasSide = (k: number, b: number) => (side[k * WORDS + (b >> 5)] >>> (b & 31)) & 1;
  /** Walls fill the interval [a, b] with no empty run wider than the clearance. */
  const bridged = (k: number, a: number, b: number) => { let gap = 0; for (let q = binOf(a); q <= binOf(b); q++) { if (hasSide(k, q)) gap = 0; else if (++gap > gapBins) return false; } return true; };
  const data = new Float32Array(N).fill(NO_FLOOR), ys: number[] = [], ss: number[] = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = i + j * w, x = o.x0 + (i + .5) * cell, z = o.z0 + (j + .5) * cell;
    const fluid = o.fluids?.find(f => x >= f.min[0] && x <= f.max[0] && z >= f.min[1] && z <= f.max[1]);
    const g = fluid ? null : o.ground?.(x, z) ?? null, start = fluid ? fluid.level - 1.3 : g !== null ? g - .2 : -Infinity;
    ys.length = ss.length = 0;
    for (let e = head[k]; e >= 0; e = hn[e]) if (hy[e] >= start) { let p = ys.length; ys.push(0); ss.push(0); while (p > 0 && ys[p - 1] > hy[e]) { ys[p] = ys[p - 1]; ss[p] = ss[p - 1]; p--; } ys[p] = hy[e]; ss[p] = hs[e]; }
    // a cell centre on a shared edge sees the same face twice; count it once
    for (let e = ys.length - 1; e > 0; e--) if (ss[e] === ss[e - 1] && ys[e] - ys[e - 1] < 2e-3) { ys.splice(e, 1); ss.splice(e, 1); }
    let top = NO_FLOOR, depth = 0;
    if (ys.length) {
      top = ys[0]; depth = 0; // standing on the floor, whichever way its triangles wind
      for (let e = 1; e < ys.length; e++) {
        if (depth === 0 && ss[e] > 0 && ys[e] - top > clearance && !bridged(k, top, ys[e])) break; // open air, then something overhead
        depth = Math.max(0, depth + ss[e]); top = ys[e];
      }
    }
    // walls without caps (fences, thin panels) extend the column while their bins stay connected
    let b = top > NO_FLOOR / 2 ? binOf(top) : -1;
    if (b < 0) { b = Math.max(0, binOf(start === -Infinity ? Y0 : start)); while (b < NB && !hasSide(k, b)) b++; if (b >= NB) { data[k] = top; continue; } }
    let last = b, gap = 0;
    for (let q = b + 1; q < NB; q++) { if (hasSide(k, q)) { last = q; gap = 0; } else if (++gap > gapBins) break; }
    const wallTop = last > binOf(top > NO_FLOOR / 2 ? top : Y0) ? Math.min(sideTop[k], Y0 + (last + 1) * BIN) : NO_FLOOR;
    data[k] = Math.max(top, wallTop);
  }
  return noClingCells ? {x0: o.x0, z0: o.z0, cell, w, h, data, noCling: noClingCells} : {x0: o.x0, z0: o.z0, cell, w, h, data};
}
