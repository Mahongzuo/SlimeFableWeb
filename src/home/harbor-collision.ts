import {WorldDefinition, createWorld} from '../slime/world';
import {bakeHeightField} from '../slime/height-field';
/** Never solid: weather, water surfaces, thin lines, decals and our own effect meshes. */
const SKIP = /water|gull|rain|foam|seabed|shaft|puddle|weather|pennant|wire|rope|props-nets|float|windsock|leaf|foliage|grass|time-shard|plaza-inlay|outline-occluder/i;
/** Only these scene branches are solid: ground, buildings, props, moored boats, and the home plaza pieces. */
const SOLID = /landscape|buildings|warehouse|waitingRoom|whDoor|props|vending|lighthouse|tetrapod|house|base|boats|cruiser|time-portal|history-lectern/;
/** Hollow shells: count their columns as solid to the top, so decks are walkable and piles have no leg gaps. */
const FILLED = /boats|cruiser|tetrapod/;
const pathOf = (m: any) => { const names: string[] = []; let node = m; while (node) { names.push(node.name ?? ''); node = node.parent; } return names.join('/'); };
/**
 * Bake every solid triangle in the harbour once, at load, into a 0.1 m height field (see slime/height-field.ts).
 * The worker then answers every collision query with array lookups instead of scanning triangles.
 * Boats bob by about 0.15 m around their moorings; their baked decks are a static approximation.
 */
export function bakeHarborCollision(ctx: any, base: WorldDefinition): WorldDefinition {
  const T = ctx.THREE, data: number[] = [], filled: number[] = [], sheets: number[] = [], v = new T.Vector3(), m4 = new T.Matrix4(), started = performance.now();
  let meshes = 0;
  ctx.scene.updateMatrixWorld(true);
  const push = (geometry: any, matrix: any, data: number[], sheet = false) => {
    const pos = geometry.attributes.position, index = geometry.index, n = index?.count ?? pos.count;
    for (let j = 0; j + 2 < n; j += 3) {
      const start = data.length;
      for (let k = 0; k < 3; k++) { v.fromBufferAttribute(pos, index ? index.getX(j + k) : j + k).applyMatrix4(matrix); data.push(v.x, v.y, v.z); }
      const xs = [data[start], data[start + 3], data[start + 6]], zs = [data[start + 2], data[start + 5], data[start + 8]];
      if (Math.max(...xs) < -32 || Math.min(...xs) > 32 || Math.max(...zs) < -32 || Math.min(...zs) > 32) data.length = start;
      else if (data !== filled) sheets.push(sheet ? 1 : 0);
    }
  };
  ctx.scene.traverse((m: any) => {
    if (!m.isMesh || !m.geometry?.attributes.position || !m.visible) return;
    const path = pathOf(m);
    if (SKIP.test(path) || !SOLID.test(path)) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    if (mats.every((a: any) => a.transparent || a.depthWrite === false || a.colorWrite === false)) return;
    const target = FILLED.test(path) ? filled : data, sheet = mats.some((a: any) => a.side === T.DoubleSide);
    if (m.isInstancedMesh) { for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, m4); push(m.geometry, m4.premultiply(m.matrixWorld), target, sheet); } }
    else push(m.geometry, m.matrixWorld, target, sheet);
    meshes++;
  });
  // start every land column at the walkable ground, not at the underside of the quay slab
  const terrain = createWorld({...base, boxes: []}).terrain;
  const height = bakeHeightField(data, {x0: -32, z0: -32, size: 64, cell: .1, clearance: .75, fluids: base.fluids, ground: terrain, filled, sheets});
  console.info(`[Slime collision] ${meshes} meshes, ${(data.length + filled.length) / 9} triangles → ${height.w}×${height.h} height field in ${(performance.now() - started).toFixed(0)} ms`);
  return {...base, boxes: base.boxes.filter(b => b.name.startsWith('training')), triangles: undefined, height};
}
