import {inland, lakeEdge, pathDistance, PATHS, WORLD, ZONES, zoneAt, LAKE} from './map';
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
      // two scales of patchiness: broad clover / dry-grass patches and fine mottling, like the harbour hill
      const big = Math.sin(x * .11 + Math.sin(zz * .07) * 2) * Math.sin(zz * .13 + Math.cos(x * .05) * 2), fine = Math.sin(x * 1.7 + zz * .9) * Math.sin(x * .37 - zz * 1.3);
      if (big > .35) c.lerp(tint.setHex(0x6f9f55), Math.min(.45, (big - .35) * 1.2)); else if (big < -.45) c.lerp(tint.setHex(0xc9c27a), Math.min(.35, (-.45 - big) * 1.1));
      c.offsetHSL(fine * .012, 0, fine * .03);
      const p = pathDistance(x, zz); if (p < 2.2) c.lerp(tint.setHex(DIRT), Math.min(1, (2.2 - p) / .8)); else if (p < 3.2) c.multiplyScalar(1 - (3.2 - p) * .06); // worn verge
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
  // stones along both verges of every path (walk-through, so they never snag the slime)
  const stones: [number, number, number][] = [];
  for (const path of PATHS) for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1], [bx, bz] = path[i], len = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / len, nz = (bx - ax) / len;
    for (let d = 0; d < len; d += .55 + ((d * 13.7) % 1) * .5) for (const side of [-1, 1]) { const x = ax + (bx - ax) * d / len + nx * side * 2.15, zz = az + (bz - az) * d / len + nz * side * 2.15; if (zoneAt(x, zz) !== 'harbor' && pathDistance(x, zz) > 1.9) stones.push([x, zz, (d * 7.1 + side) % 1]); }
  }
  const sm = new T.InstancedMesh(new T.DodecahedronGeometry(.16, 0), ctx.mats.toon(0xffffff), stones.length); sm.name = 'path-stones-fx';
  const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
  stones.forEach(([x, zz, r], i) => { e.set(r * 3, r * 9, 0); q.setFromEuler(e); m.compose(new T.Vector3(x, inland(x, zz) + .02, zz), q, new T.Vector3(1 + r, .55 + r * .3, .9 + r * .6)); sm.setMatrixAt(i, m); sm.setColorAt(i, c.setHex(0xbdb5a2).offsetHSL(0, 0, (r - .5) * .12)); });
  sm.castShadow = sm.receiveShadow = true; group.add(sm);
  ctx.scene.add(group);
  return group;
}
