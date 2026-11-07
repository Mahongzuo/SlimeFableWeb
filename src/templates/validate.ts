import type {Layout} from './types';
/**
 * Reachability proof for a layout: rasterise every collision box into a 0.25 m height grid, then flood-fill from
 * the spawn. Walking climbs ≤ 0.34 m, a jump climbs ≤ 1.15 m (single jump reaches 1.22), falling is always allowed.
 * Every quest spot must be reached, stand on its own surface, and the split pads must be too far apart for one body.
 */
const CELL = .25, STEP = .34, JUMP = 1.15;
export function validateLayout(l: Layout): {ok: boolean; errors: string[]; reached: number} {
  const errors: string[] = [];
  const [x0, z0] = l.bounds.min, w = Math.ceil((l.bounds.max[0] - x0) / CELL), h = Math.ceil((l.bounds.max[1] - z0) / CELL);
  const top = new Float32Array(w * h);
  for (const b of l.boxes) {
    const i0 = Math.max(0, Math.floor((b.min[0] - x0) / CELL)), i1 = Math.min(w - 1, Math.ceil((b.max[0] - x0) / CELL) - 1);
    const j0 = Math.max(0, Math.floor((b.min[2] - z0) / CELL)), j1 = Math.min(h - 1, Math.ceil((b.max[2] - z0) / CELL) - 1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) top[i + j * w] = Math.max(top[i + j * w], b.max[1]);
  }
  const cellOf = (x: number, z: number) => { const i = Math.floor((x - x0) / CELL), j = Math.floor((z - z0) / CELL); return i < 0 || j < 0 || i >= w || j >= h ? -1 : i + j * w; };
  const seen = new Uint8Array(w * h), start = cellOf(l.spawn[0], l.spawn[2]);
  if (start < 0 || top[start] > .05) errors.push('出生点不在空地上');
  const queue = [start]; seen[start] = 1; let reached = 0;
  while (queue.length) {
    const k = queue.pop()!; reached++;
    const i = k % w, j = (k / w) | 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
      const n = ni + nj * w; if (seen[n]) continue;
      if (top[n] - top[k] <= JUMP) { seen[n] = 1; queue.push(n); }
    }
  }
  for (const s of Object.values(l.spots)) {
    const k = cellOf(s.x, s.z);
    if (k < 0) { errors.push(`${s.id} 在场景外`); continue; }
    if (Math.abs(top[k] - s.y) > .06) errors.push(`${s.id} 没有站在表面上（表面 ${top[k].toFixed(2)}，点 ${s.y.toFixed(2)}）`);
    if (!seen[k]) errors.push(`${s.id} 从出生点走不到`);
  }
  if (l.pads) {
    const d = Math.hypot(l.pads.a.x - l.pads.b.x, l.pads.a.z - l.pads.b.z);
    if (d < 4) errors.push(`两块踏板只隔 ${d.toFixed(1)} m，一个身体就能同时压住`);
    for (const p of [l.pads.a, l.pads.b]) { const k = cellOf(p.x, p.z); if (k < 0 || !seen[k]) errors.push(`${p.id} 走不到`); }
  }
  return {ok: errors.length === 0, errors, reached};
}
export {STEP};
