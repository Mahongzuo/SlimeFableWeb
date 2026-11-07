import {bakeHeightField, HeightFieldData} from '../slime/height-field';
import type {FluidVolume} from '../slime/world';
export type SolidKind = 'solid' | 'filled' | null;
export const pathOf = (m: any) => { const names: string[] = []; let node = m; while (node) { names.push(node.name ?? ''); node = node.parent; } return names.join('/'); };
/** Things nobody stands on or bumps into, whatever branch they live in. */
export const NEVER_SOLID = /water|gull|rain|foam|seabed|shaft|puddle|weather|pennant|wire|rope|props-nets|float|windsock|leaf|foliage|grass|flower|crop|petal|fx|time-shard|plaza-inlay|outline-occluder|inland-ground|inland-skirt/i;
export interface RegionBake {x0: number; z0: number; w: number; h: number; ground: (x: number, z: number) => number | null; fluids?: FluidVolume[]; classify: (mesh: any, path: string) => SolidKind; root?: any}
/**
 * Bake the solid triangles of one rectangular region into a 0.1 m height field (see slime/height-field.ts).
 * Meshes opt out by name (NEVER_SOLID), by being fully transparent, or with `userData.walkThrough = true` on them or a parent.
 */
export function bakeRegion(ctx: any, o: RegionBake): {height: HeightFieldData | null; triangles: number; meshes: number} {
  const T = ctx.THREE, data: number[] = [], filled: number[] = [], sheets: number[] = [], v = new T.Vector3(), m4 = new T.Matrix4();
  const x1 = o.x0 + o.w, z1 = o.z0 + o.h; let meshes = 0;
  const root = o.root ?? ctx.scene; root.updateMatrixWorld(true);
  const push = (geometry: any, matrix: any, out: number[], sheet: boolean) => {
    const pos = geometry.attributes.position, index = geometry.index, n = index?.count ?? pos.count;
    for (let j = 0; j + 2 < n; j += 3) {
      const start = out.length;
      for (let k = 0; k < 3; k++) { v.fromBufferAttribute(pos, index ? index.getX(j + k) : j + k).applyMatrix4(matrix); out.push(v.x, v.y, v.z); }
      const xs = [out[start], out[start + 3], out[start + 6]], zs = [out[start + 2], out[start + 5], out[start + 8]];
      if (Math.max(...xs) < o.x0 || Math.min(...xs) > x1 || Math.max(...zs) < o.z0 || Math.min(...zs) > z1) out.length = start;
      else if (out !== filled) sheets.push(sheet ? 1 : 0);
    }
  };
  const walkThrough = (m: any) => { for (let n = m; n; n = n.parent) if (n.userData?.walkThrough) return true; return false; };
  root.traverse((m: any) => {
    if (!m.isMesh || !m.geometry?.attributes.position || !m.visible) return;
    const path = pathOf(m); if (NEVER_SOLID.test(path) || walkThrough(m)) return;
    const kind = o.classify(m, path); if (!kind) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    if (mats.every((a: any) => a.transparent || a.depthWrite === false || a.colorWrite === false)) return;
    const out = kind === 'filled' ? filled : data, sheet = mats.some((a: any) => a.side === T.DoubleSide);
    if (m.isInstancedMesh) { for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, m4); push(m.geometry, m4.premultiply(m.matrixWorld), out, sheet); } }
    else push(m.geometry, m.matrixWorld, out, sheet);
    meshes++;
  });
  if (!data.length && !filled.length) return {height: null, triangles: 0, meshes};
  const height = bakeHeightField(data, {x0: o.x0, z0: o.z0, size: o.w, sizeZ: o.h, cell: .1, clearance: .75, fluids: o.fluids, ground: o.ground, filled, sheets});
  return {height, triangles: (data.length + filled.length) / 9, meshes};
}
