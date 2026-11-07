import {inland, lakeEdge, pathDistance, WORLD, ZONES, zoneAt, LAKE} from './map';
/** Grass tint per zone, then dirt paths and the lake's sand ring are painted into vertex colours. */
const GRASS: Record<string, number> = {park: 0x9fc77c, lake: 0x93c07a, farm: 0xa9c46f, forest: 0x6f9e62};
const DIRT = 0xc9ab7c, SAND = 0xe3d3a6, MUD = 0x8c7a5c, SKIRT = 0x7d6b55;
/** Ground meshes for every non-harbour zone (1 m grid) plus the island skirt round the new outline. */
export function buildInlandGround(ctx: any) {
  const T = ctx.THREE, group = new T.Group(); group.name = 'inland-ground';
  const mat = ctx.mats.toon(0xffffff, {noCache: true}); mat.vertexColors = true; mat.needsUpdate = true;
  const c = new T.Color(), tint = new T.Color();
  for (const z of ZONES) {
    if (z.id === 'harbor') continue;
    const w = z.max[0] - z.min[0], h = z.max[1] - z.min[1], geo = new T.PlaneGeometry(w, h, w, h); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + (z.min[0] + z.max[0]) / 2, zz = pos.getZ(i) + (z.min[1] + z.max[1]) / 2, y = inland(x, zz);
      pos.setXYZ(i, x, y, zz);
      c.setHex(GRASS[zoneAt(x, zz)] ?? GRASS.park);
      const n = Math.sin(x * 1.7 + zz * .9) * Math.sin(x * .37 - zz * 1.3); c.offsetHSL(n * .015, 0, n * .035);
      const p = pathDistance(x, zz); if (p < 2.2) c.lerp(tint.setHex(DIRT), Math.min(1, (2.2 - p) / .8));
      const e = lakeEdge(x, zz); if (e < 1.25) c.lerp(tint.setHex(y < LAKE.level - .2 ? MUD : SAND), Math.min(1, (1.25 - e) / .12));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new T.BufferAttribute(colors, 3)); geo.computeVertexNormals();
    const mesh = new T.Mesh(geo, mat); mesh.name = `ground-${z.id}`; mesh.receiveShadow = true; group.add(mesh);
  }
  // island skirt: the harbour block is a diorama slab, so the new land ends in the same kind of cliff
  const skirt = ctx.mats.toon(SKIRT), edges: [number, number, number, number][] = [
    [WORLD.min[0], WORLD.max[1], WORLD.max[0], WORLD.max[1]], [WORLD.min[0], WORLD.min[1], WORLD.min[0], WORLD.max[1]],
    [30, 30, WORLD.max[0], 30], [WORLD.max[0], 30, WORLD.max[0], WORLD.max[1]], [WORLD.min[0], WORLD.min[1], -30, WORLD.min[1]],
  ];
  for (const [x0, z0, x1, z1] of edges) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len), verts: number[] = [], idx: number[] = [];
    for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; verts.push(x, inland(x, z) + .02, z, x, -8, z); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(verts, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = new T.Mesh(geo, skirt); m.material.side = T.DoubleSide; m.name = 'inland-skirt'; group.add(m);
  }
  ctx.scene.add(group);
  return group;
}
