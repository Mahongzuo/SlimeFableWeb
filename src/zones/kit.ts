import {climateMaterial} from '../home/climate-material';
import {SERIF, paperCard, tagTexture} from '../home/paper';
import {createChunkedGrassISM} from '../home/foliage/grass-ism';
import {createBroadleafTreesISM} from '../home/foliage/tree-ism';
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
  mat.customProgramCacheKey = () => 'windy' + amount; mat.needsUpdate = true; return climateMaterial(mat,'leaves');
}
/** Instanced trees: gnarled trunks + sphere-normal alpha-cutout leaf-card canopies (2 ISM draw calls per zone). */
export function trees(z: ZoneContext, spots: [number, number, number][], colors = [0x5f9a58, 0x74ad5f, 0x4e8a55]) {
  return createBroadleafTreesISM(z, spots, colors);
}
/** A run of picket fence along a polyline (solid, 0.8 m: low enough to hop, tall enough to cling). */
export function fence(z: ZoneContext, pts: [number, number][], color = 0xe9dfc9, height = .8) {
  const {T} = z, posts: [number, number][] = [];
  for (let i = 1; i < pts.length; i++) { const [ax, az] = pts[i - 1], [bx, bz] = pts[i], n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 1.2)); for (let k = i === 1 ? 0 : 1; k <= n; k++) posts.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]); }
  const g = new T.Group(); g.name = 'fence'; const mat = z.toon(color), m = new T.Matrix4(), q = new T.Quaternion();
  const post = new T.InstancedMesh(new T.BoxGeometry(.1, height, .1).translate(0, height / 2, 0), mat, posts.length);
  posts.forEach(([x, zz], i) => { m.compose(new T.Vector3(x, z.ground(x, zz), zz), q, new T.Vector3(1, 1, 1)); post.setMatrixAt(i, m); });
  const rails = new T.InstancedMesh(new T.BoxGeometry(1, .07, .05), mat, (posts.length - 1) * 2);
  for (let i = 1; i < posts.length; i++) { const [ax, az] = posts[i - 1], [bx, bz] = posts[i], ya = z.ground(ax, az), yb = z.ground(bx, bz);
    const direction = new T.Vector3(bx - ax, yb - ya, bz - az);
    const len = direction.length();
    q.setFromUnitVectors(new T.Vector3(1, 0, 0), direction.normalize());
    for (const [r, h] of [[0, .35], [1, .68]] as const) { m.compose(new T.Vector3((ax + bx) / 2, (ya + yb) / 2 + h * height / .8, (az + bz) / 2), q, new T.Vector3(len, 1, 1)); rails.setMatrixAt((i - 1) * 2 + r, m); } }
  for (const mesh of [post, rails]) { mesh.castShadow = true; g.add(mesh); }
  return g;
}
/**
 * Chunked multi-LOD curved blade grass ISM with wind gusts, slime interaction bending and backlit SSS.
 * Never solid. `colors[0]` is the grass tint, the rest are wildflower colours.
 */
export function tufts(z: ZoneContext, count: number, area: {min: [number, number]; max: [number, number]}, avoid: (x: number, z: number) => boolean, colors = [0x6e9d4f, 0xf2c94c, 0xf2a7b5, 0xffffff]) {
  return createChunkedGrassISM(z, count, area, avoid, colors);
}
