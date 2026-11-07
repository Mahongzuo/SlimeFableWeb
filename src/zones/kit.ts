import {SERIF, paperCard, tagTexture} from '../home/paper';
import type {ZoneContext} from './types';
/**
 * Small shared builders for zone scenery. Everything is low-poly toon, instanced where it repeats.
 * Names matter for collision: trunks/posts are solid, `foliage`/`leaf`/`flower`/`grass`/`crop` are not.
 */
export function signpost(z: ZoneContext, x: number, zz: number, yaw: number, title: string, sub = '') {
  const {T} = z, g = new T.Group(); g.name = 'signpost'; g.position.set(x, z.ground(x, zz), zz); g.rotation.y = yaw;
  for (const dx of [-.62, .62]) { const post = new T.Mesh(new T.CylinderGeometry(.06, .08, 2.1, 6), z.toon(0x8a6a48)); post.position.set(dx, 1.05, 0); post.castShadow = true; g.add(post); }
  const tex = tagTexture(T, (c, w, h) => { paperCard(c, w, h); c.fillStyle = '#2f2a24'; c.textAlign = 'center'; c.font = `700 74px ${SERIF}`; c.fillText(title, w / 2 - 6, sub ? 118 : 150); if (sub) { c.font = `500 34px ${SERIF}`; c.fillStyle = '#6b5f50'; c.fillText(sub, w / 2 - 6, 180); } });
  const board = new T.Mesh(new T.BoxGeometry(1.5, .75, .06), [z.toon(0x8a6a48), z.toon(0x8a6a48), z.toon(0x8a6a48), z.toon(0x8a6a48), z.toon(0xffffff, {map: tex}), z.toon(0xffffff, {map: tex})]);
  board.position.y = 1.75; board.castShadow = true; g.add(board); return g;
}
/** Instanced round trees: solid trunks, walk-through canopies. */
export function trees(z: ZoneContext, spots: [number, number, number][], colors = [0x5f9a58, 0x74ad5f, 0x4e8a55]) {
  const {T} = z, g = new T.Group(), n = spots.length; g.name = 'trees';
  const trunk = new T.InstancedMesh(new T.CylinderGeometry(.16, .24, 1, 6).translate(0, .5, 0), z.toon(0x7a5a3f), n); trunk.name = 'tree-trunks';
  const crown = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), z.toon(0xffffff), n); crown.name = 'tree-foliage';
  const m = new T.Matrix4(), q = new T.Quaternion(), c = new T.Color();
  spots.forEach(([x, zz, s], i) => {
    const y = z.ground(x, zz), h = 1.6 * s;
    m.compose(new T.Vector3(x, y, zz), q, new T.Vector3(s, h, s)); trunk.setMatrixAt(i, m);
    q.setFromEuler(new T.Euler(0, z.rand() * 6, 0)); m.compose(new T.Vector3(x, y + h + .9 * s, zz), q, new T.Vector3(1.4 * s, 1.25 * s, 1.4 * s)); crown.setMatrixAt(i, m); q.identity();
    crown.setColorAt(i, c.setHex(colors[i % colors.length]).offsetHSL(0, 0, (z.rand() - .5) * .06));
  });
  for (const mesh of [trunk, crown]) { mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); }
  return g;
}
/** A run of picket fence along a polyline (solid, 0.8 m: low enough to hop, tall enough to cling). */
export function fence(z: ZoneContext, pts: [number, number][], color = 0xe9dfc9, height = .8) {
  const {T} = z, posts: [number, number][] = [];
  for (let i = 1; i < pts.length; i++) { const [ax, az] = pts[i - 1], [bx, bz] = pts[i], n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 1.2)); for (let k = i === 1 ? 0 : 1; k <= n; k++) posts.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]); }
  const g = new T.Group(); g.name = 'fence'; const mat = z.toon(color), m = new T.Matrix4(), q = new T.Quaternion();
  const post = new T.InstancedMesh(new T.BoxGeometry(.1, height, .1).translate(0, height / 2, 0), mat, posts.length);
  posts.forEach(([x, zz], i) => { m.compose(new T.Vector3(x, z.ground(x, zz), zz), q, new T.Vector3(1, 1, 1)); post.setMatrixAt(i, m); });
  const rails = new T.InstancedMesh(new T.BoxGeometry(1, .07, .05), mat, (posts.length - 1) * 2);
  for (let i = 1; i < posts.length; i++) { const [ax, az] = posts[i - 1], [bx, bz] = posts[i], len = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(-(bz - az), bx - ax);
    q.setFromEuler(new T.Euler(0, yaw, 0)); const ya = z.ground(ax, az), yb = z.ground(bx, bz);
    for (const [r, h] of [[0, .35], [1, .68]] as const) { m.compose(new T.Vector3((ax + bx) / 2, (ya + yb) / 2 + h * height / .8, (az + bz) / 2), q, new T.Vector3(len, 1, 1)); rails.setMatrixAt((i - 1) * 2 + r, m); } }
  for (const mesh of [post, rails]) { mesh.castShadow = true; g.add(mesh); }
  return g;
}
/** Scattered grass tufts / flowers (never solid). */
export function tufts(z: ZoneContext, count: number, area: {min: [number, number]; max: [number, number]}, avoid: (x: number, z: number) => boolean, colors = [0x8fbf6a, 0xf2c94c, 0xf2a7b5, 0xffffff]) {
  const {T} = z, geo = new T.ConeGeometry(.08, .32, 4).translate(0, .16, 0), mesh = new T.InstancedMesh(geo, z.toon(0xffffff), count);
  mesh.name = 'grass-tufts'; const m = new T.Matrix4(), q = new T.Quaternion(), c = new T.Color(); let i = 0;
  for (let tries = 0; i < count && tries < count * 4; tries++) { const x = area.min[0] + z.rand() * (area.max[0] - area.min[0]), zz = area.min[1] + z.rand() * (area.max[1] - area.min[1]); if (avoid(x, zz)) continue;
    const s = .7 + z.rand() * .8; m.compose(new T.Vector3(x, z.ground(x, zz), zz), q, new T.Vector3(s, s, s)); mesh.setMatrixAt(i, m); mesh.setColorAt(i, c.setHex(colors[z.rand() < .75 ? 0 : 1 + Math.floor(z.rand() * (colors.length - 1))])); i++; }
  mesh.count = i; return mesh;
}
