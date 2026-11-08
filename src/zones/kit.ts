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
/**
 * Wind sway for instanced foliage: bends each vertex by its height above the instance origin, phase-shifted per
 * instance, driven by the harbour's shared uTime / uWind uniforms. Chains the toon material's own shader patch.
 */
export function windy(z: ZoneContext, mat: any, amount = .12) {
  const prev = mat.onBeforeCompile, U = z.ctx.U;
  mat.onBeforeCompile = (sh: any, r: any) => {
    prev?.call(mat, sh, r);
    sh.uniforms.uTime = U.uTime; sh.uniforms.uWind = U.uWind ?? {value: .6};
    sh.vertexShader = 'uniform float uTime; uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 ip = instanceMatrix[3].xyz;
      #else
        vec3 ip = vec3(0.0);
      #endif
      float bend = max(position.y, 0.0); float ph = dot(ip.xz, vec2(.37, .23));
      float sw = sin(uTime * 1.7 + ph) * .6 + sin(uTime * 2.9 + ph * 1.7) * .4;
      transformed.x += sw * bend * bend * ${amount.toFixed(3)} * (.4 + uWind);
      transformed.z += cos(uTime * 1.3 + ph) * bend * bend * ${(amount * .5).toFixed(3)} * (.4 + uWind);`);
  };
  mat.customProgramCacheKey = () => 'windy' + amount; mat.needsUpdate = true; return mat;
}
/** Instanced trees: solid trunks, canopies built from 4 overlapping puffs (walk-through), crowns high enough for the camera. */
export function trees(z: ZoneContext, spots: [number, number, number][], colors = [0x5f9a58, 0x74ad5f, 0x4e8a55]) {
  const {T} = z, g = new T.Group(), n = spots.length, P = 4; g.name = 'trees';
  const trunk = new T.InstancedMesh(new T.CylinderGeometry(.12, .22, 1, 7).translate(0, .5, 0), z.toon(0x7a5a3f), n); trunk.name = 'tree-trunks';
  const puffGeo = new T.IcosahedronGeometry(1, 1); puffGeo.translate(0, .15, 0);
  const crown = new T.InstancedMesh(puffGeo, windy(z, z.toon(0xffffff, {noCache: true}), .035), n * P); crown.name = 'tree-foliage';
  const m = new T.Matrix4(), q = new T.Quaternion(), c = new T.Color(), e = new T.Euler();
  spots.forEach(([x, zz, s], i) => {
    const y = z.ground(x, zz), h = 2.3 * s;
    m.compose(new T.Vector3(x, y, zz), q.identity(), new T.Vector3(s, h, s)); trunk.setMatrixAt(i, m);
    const base = colors[i % colors.length];
    for (let k = 0; k < P; k++) {
      const a = k / P * Math.PI * 2 + z.rand(), r = k === 0 ? 0 : .75 * s, up = k === 0 ? 1.1 * s : .55 * s + z.rand() * .3 * s, sc = (k === 0 ? 1.25 : .85 + z.rand() * .25) * s;
      e.set(0, z.rand() * 6, 0); q.setFromEuler(e);
      m.compose(new T.Vector3(x + Math.cos(a) * r, y + h + up, zz + Math.sin(a) * r), q, new T.Vector3(sc * 1.15, sc * .9, sc * 1.15)); crown.setMatrixAt(i * P + k, m);
      crown.setColorAt(i * P + k, c.setHex(base).offsetHSL((z.rand() - .5) * .02, 0, (k === 0 ? .03 : -.02) + (z.rand() - .5) * .05));
    }
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
/**
 * Grass: clumps of five thin tapered blades (root darker, tip lighter) swaying in the wind, plus small flowers.
 * Never solid. `colors[0]` is the grass tint, the rest are flower colours.
 */
export function tufts(z: ZoneContext, count: number, area: {min: [number, number]; max: [number, number]}, avoid: (x: number, z: number) => boolean, colors = [0x8fbf6a, 0xf2c94c, 0xf2a7b5, 0xffffff]) {
  const {T} = z, g = new T.Group(); g.name = 'grass-tufts';
  // one clump = 5 blades, each a 2-triangle tapered strip with a bent tip
  const pos: number[] = [], col: number[] = [], root = new T.Color(colors[0]).multiplyScalar(.62), tip = new T.Color(colors[0]).lerp(new T.Color(0xf4f1c8), .35);
  for (let b = 0; b < 5; b++) {
    const a = b / 5 * Math.PI * 2 + .4, r = .04 + (b % 2) * .04, ox = Math.cos(a) * r, oz = Math.sin(a) * r, h = .15 + (b * 37 % 5) * .03, w = .02, lean = .05;
    const dx = Math.cos(a), dz = Math.sin(a), px = -dz * w, pz = dx * w;
    const v = [[ox - px, 0, oz - pz], [ox + px, 0, oz + pz], [ox + dx * lean * .5 + px * .6, h * .55, oz + dz * lean * .5 + pz * .6], [ox + dx * lean * .5 - px * .6, h * .55, oz + dz * lean * .5 - pz * .6], [ox + dx * lean, h, oz + dz * lean]];
    const cs = [root, root, root.clone().lerp(tip, .55), root.clone().lerp(tip, .55), tip];
    for (const [i0, i1, i2] of [[0, 1, 2], [0, 2, 3], [3, 2, 4]]) for (const k of [i0, i1, i2]) { pos.push(...v[k]); col.push(cs[k].r, cs[k].g, cs[k].b); }
  }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  // normals straight up: blades take the ground's lighting instead of going dark when they face away from the sun
  geo.setAttribute('normal', new T.Float32BufferAttribute(new Float32Array(pos.length).map((_, i) => i % 3 === 1 ? 1 : 0), 3));
  const mat = windy(z, z.toon(0xffffff, {noCache: true}), .5); mat.vertexColors = true; mat.side = T.DoubleSide;
  const blades = new T.InstancedMesh(geo, mat, count); blades.name = 'grass-blades'; blades.receiveShadow = true;
  const flowerGeo = new T.IcosahedronGeometry(.055, 0); flowerGeo.scale(1, .55, 1); flowerGeo.translate(0, .24, 0);
  const stem = new T.CylinderGeometry(.008, .008, .24, 3).translate(0, .12, 0);
  const fl = Math.max(1, Math.floor(count * .08)), flowers = new T.InstancedMesh(flowerGeo, windy(z, z.toon(0xffffff, {noCache: true}), .5), fl), stems = new T.InstancedMesh(stem, windy(z, z.toon(0x6f9a50, {noCache: true}), .5), fl);
  flowers.name = 'grass-flowers'; stems.name = 'grass-flower-stems';
  const m = new T.Matrix4(), q = new T.Quaternion(), c = new T.Color(), e = new T.Euler(); let i = 0, f = 0;
  for (let tries = 0; i < count && tries < count * 4; tries++) {
    const x = area.min[0] + z.rand() * (area.max[0] - area.min[0]), zz = area.min[1] + z.rand() * (area.max[1] - area.min[1]); if (avoid(x, zz)) continue;
    const s = .75 + z.rand() * .7; e.set(0, z.rand() * 6.28, 0); q.setFromEuler(e); m.compose(new T.Vector3(x, z.ground(x, zz), zz), q, new T.Vector3(s, s * (.8 + z.rand() * .5), s)); blades.setMatrixAt(i++, m);
    if (f < fl && z.rand() < .09 && colors.length > 1) { m.compose(new T.Vector3(x + .08, z.ground(x, zz), zz), q, new T.Vector3(1, .8 + z.rand() * .5, 1)); flowers.setMatrixAt(f, m); stems.setMatrixAt(f, m); flowers.setColorAt(f, c.setHex(colors[1 + Math.floor(z.rand() * (colors.length - 1))])); f++; }
  }
  blades.count = i; flowers.count = stems.count = f; g.add(blades, stems, flowers); return g;
}
