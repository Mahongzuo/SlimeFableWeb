import * as T from 'three';
import {rng} from '../templates/random';
/** Material slots: toon takes per-instance colour; glow is always lit; lamp and lit brighten in the finale; glass is see-through. */
export type Slot = 'toon' | 'glow' | 'lamp' | 'lit' | 'glass';
type Geo = 'box' | 'round' | 'taperUp' | 'taperDown' | 'cone' | 'ball' | 'rock' | 'ring' | 'hoop';
type V3 = [number, number, number];
/**
 * Collects primitives per parent group and flushes them as one InstancedMesh per geometry and material,
 * so a whole landmark costs a handful of draw calls. Toon instances get ±5% brightness jitter.
 */
export class Kit {
  private store = new Map<any, Map<string, {m: any[]; c: any[]}>>();
  private dummy = new T.Object3D(); private up = new T.Vector3(0, 1, 0); private dir = new T.Vector3();
  readonly geos: Record<Geo, any> = {
    box: new T.BoxGeometry(1, 1, 1), round: new T.CylinderGeometry(1, 1, 1, 20), taperUp: new T.CylinderGeometry(.55, 1, 1, 20),
    taperDown: new T.CylinderGeometry(1, .55, 1, 20), cone: new T.ConeGeometry(1, 1, 16), ball: new T.SphereGeometry(1, 22, 14),
    rock: new T.IcosahedronGeometry(1, 1), ring: new T.TorusGeometry(1, .065, 8, 48), hoop: new T.TorusGeometry(1, .2, 10, 40),
  };
  private random: ReturnType<typeof rng>;
  constructor(readonly mats: Record<Slot, any>, seed: string) { this.random = rng(seed); }
  group(parent: any, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) { const g = new T.Group(); g.position.set(x, y, z); g.rotation.set(rx, ry, rz); g.scale.setScalar(s); parent.add(g); return g; }
  put(geo: Geo, p: any, slot: Slot, c: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0) {
    let batch = this.store.get(p); if (!batch) this.store.set(p, batch = new Map());
    const key = geo + '|' + slot; let part = batch.get(key); if (!part) batch.set(key, part = {m: [], c: []});
    const d = this.dummy; d.position.set(x, y, z); d.scale.set(sx, sy, sz); d.rotation.set(rx, ry, rz); d.updateMatrix(); part.m.push(d.matrix.clone());
    const color = new T.Color(c); if (slot === 'toon') color.multiplyScalar(.95 + this.random.next() * .1); part.c.push(color);
  }
  box(p: any, c: string, x: number, y: number, z: number, w: number, h: number, d: number, ry = 0, slot: Slot = 'toon') { this.put('box', p, slot, c, x, y, z, w, h, d, 0, ry, 0); }
  cyl(p: any, c: string, x: number, y: number, z: number, r: number, h: number, slot: Slot = 'toon') { this.put('round', p, slot, c, x, y, z, r, h, r); }
  taper(p: any, c: string, x: number, y: number, z: number, r: number, h: number, down = false, slot: Slot = 'toon') { this.put(down ? 'taperDown' : 'taperUp', p, slot, c, x, y, z, r, h, r); }
  cone(p: any, c: string, x: number, y: number, z: number, r: number, h: number, slot: Slot = 'toon') { this.put('cone', p, slot, c, x, y, z, r, h, r); }
  ball(p: any, c: string, x: number, y: number, z: number, rx: number, ry = rx, rz = rx, slot: Slot = 'toon') { this.put('ball', p, slot, c, x, y, z, rx, ry, rz); }
  rock(p: any, c: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0) { this.put('rock', p, 'toon', c, x, y, z, sx, sy, sz, 0, ry, 0); }
  ring(p: any, c: string, x: number, y: number, z: number, r: number, rx = 0, ry = 0, slot: Slot = 'toon', fat = false) { this.put(fat ? 'hoop' : 'ring', p, slot, c, x, y, z, r, r, r, rx, ry, 0); }
  beam(p: any, c: string, a: V3, b: V3, r: number, slot: Slot = 'toon') {
    this.dir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = this.dir.length();
    this.dummy.quaternion.setFromUnitVectors(this.up, this.dir.normalize()); const e = new T.Euler().setFromQuaternion(this.dummy.quaternion);
    this.put('round', p, slot, c, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, r, len, r, e.x, e.y, e.z);
  }
  flush() {
    for (const [parent, batch] of this.store) for (const [key, b] of batch) {
      const [geo, slot] = key.split('|') as [Geo, Slot];
      const mesh = new T.InstancedMesh(this.geos[geo], this.mats[slot], b.m.length); mesh.name = slot === 'glass' ? 'fx-glass' : slot;
      b.m.forEach((m, i) => { mesh.setMatrixAt(i, m); mesh.setColorAt(i, b.c[i]); });
      mesh.castShadow = slot === 'toon' || slot === 'lit'; mesh.receiveShadow = slot !== 'glow' && slot !== 'lamp';
      if (slot === 'glass') mesh.layers.set(1);
      parent.add(mesh);
    }
    this.store.clear();
  }
}
/** What a landmark hands back: groups the finale animates, and where the camera and particles should aim (local). */
export interface Landmark {
  mover: any; spinners: {group: any; axis: 'x' | 'y' | 'z'}[]; focus: V3; height: number;
  water?: boolean; lift?: number; furl?: boolean; kick?: {from: V3; to: V3};
}
const C = {stone: '#cfc4ae', dark: '#3a3f55', brass: '#c99a55', ivory: '#efe5cb', red: '#b9473d', white: '#eef1f3', steel: '#8d9aa8', wood: '#7d5236', black: '#26252c', green: '#6fa596', brick: '#a9513f'};
type Build = (k: Kit, F: any, L: Landmark) => void;
const lattice = (k: Kit, F: any, c: string, x: number, z: number, base: number, top: number, w0: number, w1: number, r: number) => {
  const corner = (y: number, sx: number, sz: number): V3 => { const t = (y - base) / (top - base), w = w0 + (w1 - w0) * t; return [x + sx * w, y, z + sz * w]; };
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) k.beam(F, c, corner(base, sx, sz), corner(top, sx, sz), r);
  for (let y = base + 2; y < top; y += 2) for (const [a, b] of [[[1, 1], [1, -1]], [[1, -1], [-1, -1]], [[-1, -1], [-1, 1]], [[-1, 1], [1, 1]]] as const) {
    k.beam(F, c, corner(y, a[0], a[1]), corner(y, b[0], b[1]), r * .6); k.beam(F, c, corner(y - 2, a[0], a[1]), corner(y, b[0], b[1]), r * .45);
  }
};
const rocketPad = (k: Kit, F: any) => {
  k.box(F, C.dark, 0, .5, 0, 9, 1, 9); k.box(F, '#2a2d38', 0, 1.02, 0, 3.4, .06, 3.4);
  lattice(k, F, '#c4473b', 4.6, 0, 1, 19, 1.2, .9, .16);
  for (const y of [6, 11, 16]) k.box(F, '#c4473b', 2.6, y, 0, 3.2, .3, .5);
  for (let i = 0; i < 6; i++) k.ball(F, '#ffb36b', 4.6 + (i % 2 ? 1.3 : -1.3), 3 + i * 3, 1.3, .14, .14, .14, 'glow');
};
const builds: Record<string, Build> = {
  beagle(k, F, L) {
    const M = L.mover; L.water = true; L.focus = [0, 5, 3]; L.height = 11;
    for (let j = 0; j < 12; j++) { const x = (j - 5.5) * .95, w = .45 + 1.25 * Math.sin(Math.PI * (j + .5) / 12);
      k.box(M, '#4a3427', x, .9, 0, .97, 1.8, w * 1.7); k.box(M, C.ivory, x, 1.75, 0, .97, .16, w * 1.76); k.box(M, '#26252c', x, .05, 0, .97, .3, w * 1.4); }
    for (const [x, h] of [[-3.2, 8], [0, 10], [3.2, 8.5]]) {
      k.cyl(M, C.wood, x, h / 2 + 1, 0, .13, h);
      for (let l = 0; l < 3; l++) { const y = 3 + l * 2.2, w = 3.3 - l * .75; k.box(M, C.wood, x, y + .95, 0, .12, .12, w); k.ball(M, l % 2 ? '#f3e7c9' : '#e9dab4', x + .28, y, 0, .26, .95, w * .47); }
      k.beam(M, C.ivory, [x, h + 1, 0], [x - 2.8, 1.8, 1.2], .03); k.beam(M, C.ivory, [x, h + 1, 0], [x + 2.8, 1.8, -1.2], .03);
    }
    k.beam(M, C.wood, [5.6, 1.8, 0], [9, 3.4, 0], .1); k.beam(M, C.ivory, [9, 3.4, 0], [3.2, 9.4, 0], .03);
    k.ball(M, '#ffcf7a', -5.9, 2.5, 0, .28, .28, .28, 'lamp'); k.ball(M, '#ffcf7a', 5.2, 2.3, 0, .2, .2, .2, 'lamp');
    for (let i = 0; i < 7; i++) { k.box(F, '#6f5a45', -10 + i * 1.2, .35, 6.5, 1.1, .7, 2.6); k.cyl(F, '#5a4a3b', -10 + i * 1.2, .7, 7.9, .14, 1.4); }
    k.cyl(F, C.stone, 9, 4, -4, 1, 8); k.cone(F, C.red, 9, 8.8, -4, 1.3, 1.6); k.ball(F, '#fff1b8', 9, 8, -4, .55, .55, .55, 'lamp');
  },
  gate(k, F, L) {
    L.focus = [0, 6, 0]; L.height = 12;
    for (let i = 0; i < 6; i++) { const x = -6 + i * 2.4; k.cyl(F, C.stone, x, 4.8, 0, .55, 9); k.box(F, C.stone, x, .5, 0, 1.5, .8, 1.5); k.box(F, C.ivory, x, 9.35, 0, 1.4, .3, 1.4); }
    k.box(F, C.stone, 0, 10.2, 0, 15, 1.4, 3.4); k.box(F, C.ivory, 0, 11, 0, 15.4, .25, 3.6); k.box(F, C.stone, 0, 11.9, 0, 8, 1.6, 2.8); k.box(F, C.ivory, 0, 12.8, 0, 8.4, .25, 3);
    for (const s of [-1, 1]) { k.box(F, C.stone, s * 10, 3, 0, 3.4, 6, 3); k.box(F, C.ivory, s * 10, 6.2, 0, 3.8, .3, 3.4); k.box(F, '#ffd99a', s * 10, 2.6, 1.52, 1.2, 2.2, .06, 0, 'lamp'); }
    for (let i = 0; i < 5; i++) { const x = -4.8 + i * 2.4; k.box(F, '#ffe3a8', x, 4.4, -.4, 1.5, 8, .08, 0, 'lit'); k.ball(F, '#ffd27f', x, 8.4, 1, .3, .3, .3, 'lamp'); }
    for (let i = 0; i < 13; i++) k.ball(F, '#ffd27f', -7.2 + i * 1.2, 9.6, 1.78, .14, .14, .14, 'lamp');
  },
  sputnik(k, F, L) {
    L.focus = [0, 8, 0]; L.height = 14; const M = L.mover; M.position.set(0, 8, 0); M.rotation.x = .38;
    k.cyl(F, C.stone, 0, 1.6, 0, 1.3, 3.2); k.cyl(F, C.brass, 0, 3.3, 0, 1.8, .25); k.ball(F, '#2f5f9a', 0, 8, 0, 4.6);
    const r = rng('sputnik-land'); for (let i = 0; i < 11; i++) { const a = r.range(0, 6.28), b = r.range(-1, 1), c = Math.sqrt(1 - b * b);
      k.ball(F, i % 3 ? '#6f9e6a' : '#a7b77a', 3.75 * c * Math.cos(a), 8 + 3.75 * b, 3.75 * c * Math.sin(a), r.range(1, 1.6)); }
    k.ring(F, '#bcd7ff', 0, 8, 0, 7, Math.PI / 2 + .38, 0, 'lit');
    k.ball(M, '#d7dde2', 7, 0, 0, .75); k.ring(M, C.steel, 7, 0, 0, .76, Math.PI / 2);
    for (const [y, z] of [[.35, .35], [-.35, .35], [.35, -.35], [-.35, -.35]]) k.beam(M, '#c3c9cf', [7, y * .6, z * .6], [4.2, y * 1.5, z * 2], .035);
    k.ball(M, '#9fe3ff', 7.6, .4, 0, .16, .16, .16, 'lamp');
  },
  record(k, F, L) {
    L.focus = [0, 6, 2]; L.height = 11; const G = k.group(F, 0, 5.5, 0, .75);
    k.box(G, C.wood, 0, -.6, 0, 12, 1.2, 9.5); k.box(G, C.brass, 0, 0, 0, 12.2, .08, 9.7);
    const S = k.group(G, -1.2, .2, 0); L.spinners.push({group: S, axis: 'y'});
    k.cyl(S, C.black, 0, 0, 0, 4.1, .18); for (const r of [1.8, 2.3, 2.8, 3.3, 3.8]) k.ring(S, '#45434f', 0, .1, 0, r, Math.PI / 2);
    k.cyl(S, '#d8483d', 0, .12, 0, 1.3, .04); k.box(S, C.ivory, .55, .16, 0, .9, .02, .22); k.cyl(S, C.steel, 0, .2, 0, .12, .3);
    k.cyl(G, C.steel, 4.4, .5, -3.2, .4, 1); k.beam(G, C.steel, [4.4, 1, -3.2], [1.9, .8, 1.4], .1); k.box(G, C.steel, 1.8, .7, 1.5, .45, .25, .7);
    for (const s of [-1, 1]) { k.box(F, C.dark, s * 8.6, 3.2, 0, 2.8, 6.4, 2.4); for (const y of [1.8, 4.4]) { k.cyl(F, '#1d1c24', s * 8.6, y, 1.22, .9, .1); k.ring(F, '#ff9d6c', s * 8.6, y, 1.25, .95, 0, 0, 'lamp'); } }
  },
  windmill(k, F, L) {
    L.focus = [-2.5, 11, 2]; L.height = 15;
    k.box(F, C.brick, 0, 3, 0, 11, 6, 5); k.box(F, C.dark, 0, 6.4, 0, 11.6, .8, 5.6);
    for (let i = 0; i < 5; i++) k.box(F, '#ffd38a', -4.4 + i * 2.2, 2.6, 2.53, 1, 1.5, .08, 0, 'lamp');
    k.box(F, '#ffcf8a', 2.5, 5.2, 2.58, 4.8, .8, .1, 0, 'lit'); for (let i = 0; i < 16; i++) k.ball(F, '#ffd27f', -5.2 + i * .7, 6.95, 2.82, .11, .11, .11, 'lamp');
    k.taper(F, '#b8473c', -2.5, 9.9, 0, 1.6, 7); k.cone(F, C.dark, -2.5, 14.1, 0, 1.9, 1.6); k.box(F, '#ffd38a', -2.5, 9.4, 1.42, .6, .9, .08, 0, 'lamp');
    const S = k.group(F, -2.5, 12, 1.9); L.spinners.push({group: S, axis: 'z'}); k.ball(S, C.dark, 0, 0, 0, .45);
    for (let b = 0; b < 4; b++) { const a = b * Math.PI / 2, s = Math.sin(a), c = Math.cos(a);
      k.put('box', S, 'toon', C.ivory, -s * 2.8, c * 2.8, 0, .9, 5, .06, 0, 0, a); k.put('box', S, 'toon', C.wood, -s * 2.8, c * 2.8, .05, .14, 5.2, .08, 0, 0, a);
      for (let n = 0; n < 4; n++) k.put('box', S, 'toon', C.wood, -s * (1 + n * 1.2), c * (1 + n * 1.2), .06, .95, .06, .08, 0, 0, a); }
  },
  moon(k, F, L) {
    L.focus = [0, 9, 0]; L.height = 16; const S = k.group(F, 0, 9, 0); L.spinners.push({group: S, axis: 'y'});
    k.ball(S, '#bdbccb', 0, 0, 0, 6.2); const r = rng('moon-faces');
    for (let i = 0; i < 22; i++) { const near = i < 8, a = r.range(0, 6.28), b = r.range(-.8, .8), c = Math.sqrt(1 - b * b);
      let x = c * Math.cos(a), z = c * Math.sin(a); if (near ? z < 0 : z > 0) z = -z; z += near ? .35 : -.35; const l = Math.hypot(x, b, z); x /= l; z /= l; const y = b / l;
      if (near) k.ball(S, '#77768c', x * 5.5, y * 5.5, z * 5.5, r.range(1.5, 2.3));
      else { k.ball(S, '#dcdbe6', x * 5.92, y * 5.92, z * 5.92, r.range(.55, 1.05)); k.ball(S, '#9e9db2', x * 6.02, y * 6.02, z * 6.02, .32); } }
    k.ring(F, C.brass, 0, 9, 0, 7.4, Math.PI / 2.3); k.cyl(F, C.stone, 0, 1.4, 0, 1.2, 2.8); k.cyl(F, C.brass, 0, 2.9, 0, 1.6, .2);
    const M = L.mover; M.position.set(0, 9, 0); k.cyl(M, '#c9ccd2', 8.6, 1, 0, .45, 1.6); k.cone(M, '#c9ccd2', 8.6, 2.1, 0, .45, .6);
    k.box(M, '#3d5f95', 8.6, 1, .9, .06, .9, 1.2); k.ball(M, '#d9d6ff', 8.6, 2.5, 0, .12, .12, .12, 'lamp');
  },
  pulse(k, F, L) {
    L.focus = [0, 6.5, 1]; L.height = 10;
    k.box(F, C.wood, 0, 2.2, 0, 12, .35, 4); for (const [x, z] of [[-5.5, -1.6], [5.5, -1.6], [-5.5, 1.6], [5.5, 1.6]]) k.box(F, C.dark, x, 1, z, .3, 2, .3);
    k.box(F, C.dark, 0, 6.5, -.5, 9, 6, 2.2); k.box(F, C.brass, 0, 6.5, .62, 8.4, 5.4, .1); k.box(F, '#0d2a26', 0, 6.5, .7, 7.6, 4.6, .06);
    for (let i = 0; i < 7; i++) k.box(F, '#1d4a42', -3.25 + i * 1.08, 6.5, .74, .03, 4.4, .02); for (let i = 0; i < 4; i++) k.box(F, '#1d4a42', 0, 4.8 + i * 1.1, .74, 7.4, .03, .02);
    const ys = [0, 0, .1, .35, -.2, 1.7, -1.1, .1, .3, 0, 0, 0, .1, .35, -.2, 1.7, -1.1, .1, .3, 0, 0];
    for (let i = 0; i + 1 < ys.length; i++) k.beam(F, '#7dffc8', [-3.6 + i * .36, 6.3 + ys[i], .8], [-3.6 + (i + 1) * .36, 6.3 + ys[i + 1], .8], .06, 'lamp');
    for (let i = 0; i < 5; i++) k.ball(F, i % 2 ? '#ff9b6b' : '#7dffc8', -3.6 + i * .5, 3.85, .82, .12, .12, .12, 'lamp');
    k.cyl(F, C.brass, -4, 2.9, 1.1, .6, 1); for (let i = 0; i < 4; i++) k.ring(F, '#b77945', 3.6, 2.6 + i * .12, 1.1, .45, Math.PI / 2);
    k.beam(F, '#d0534a', [-3.4, 2.5, 1.1], [3.2, 2.5, 1.1], .04);
  },
  post(k, F, L) {
    L.focus = [0, 5, 3]; L.height = 10; const M = L.mover; M.position.set(0, 5, 3);
    k.box(F, C.stone, 0, 4, -2.2, 12, 8, 4); k.box(F, C.ivory, 0, 8.2, -2.2, 12.6, .4, 4.4); k.box(F, C.dark, 0, 8.9, -2.2, 11, 1, 3.6);
    for (let i = 0; i < 4; i++) { const x = -4.5 + i * 3; k.box(F, '#ffd38a', x, 3.4, -.18, 1.3, 2.4, .1, 0, 'lamp'); k.ring(F, C.ivory, x, 4.6, -.14, .65, 0, 0); }
    k.cyl(F, '#c43c32', 0, 2.2, 3, 1.2, 4.4); k.ball(F, '#c43c32', 0, 4.4, 3, 1.2, .8, 1.2); k.box(F, C.black, 0, 3.4, 4.2, 1, .15, .1); k.cyl(F, C.brass, 0, 4.42, 3, 1.25, .12); k.cyl(F, C.brass, 0, .1, 3, 1.4, .2);
    const r = rng('letters'); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28, d = r.range(3, 6), y = r.range(-1.2, 3);
      k.box(M, C.ivory, Math.cos(a) * d, y, Math.sin(a) * d, .9, .05, .6, -a); k.box(M, '#c43c32', Math.cos(a) * d + .25 * Math.sin(a), y + .04, Math.sin(a) * d + .25 * Math.cos(a), .18, .03, .18, -a); }
  },
  triton(k, F, L) {
    L.focus = [4, 11, -3]; L.height = 16;
    k.cyl(F, C.stone, -5, 2, 1, 2.6, 4); k.ball(F, '#c9ccd6', -5, 4, 1, 2.6, 2.2, 2.6); k.box(F, C.dark, -5, 5.1, 2.3, .8, 2, .6);
    k.beam(F, C.brass, [-5, 4.6, 1.4], [-2.4, 7.8, 3.4], .45); k.ring(F, C.brass, -2.4, 7.8, 3.4, .5, -.9);
    k.ball(F, '#3f6fd2', 4, 11, -3, 4.2); k.ball(F, '#5c8de6', 4, 11, -3, 4.26, .9, 4.26); k.ball(F, '#5c8de6', 4, 12.4, -3, 3.9, .5, 3.9); k.ball(F, '#284e9e', 6, 10, -.2, 1.1, .6, .6);
    const M = L.mover; M.position.set(4, 11, -3); M.rotation.x = .4; k.ball(M, '#e0d6cb', 7.4, 0, 0, .8); k.ball(M, '#f7f0e4', 7.4, 0, 0, .3, .3, .3, 'lamp');
  },
  maryrose(k, F, L) {
    L.water = true; L.focus = [0, 3, 0]; L.height = 10; const M = L.mover;
    k.box(M, '#4b3324', 0, -.2, -1.6, 13, .5, .6);
    for (let l = 0; l < 7; l++) k.box(M, l % 2 ? '#6a4a32' : '#5e412c', 0, .3 + l * .5, -1.5 + l * .3, 12.6 - l * .7, .42, .22);
    for (let j = 0; j < 14; j++) { const x = (j - 6.5) * .9; k.beam(M, '#57402d', [x, -.2, -1.6], [x, 3.6, .6 - Math.abs(j - 6.5) * .05], .14); }
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) k.beam(F, '#e0b23a', [sx * 7.5, -1, sz * 3.4], [sx * 6.5, 9, sz * 2.4], .25);
    k.box(F, '#e0b23a', 0, 9, 2.4, 13.4, .5, .5); k.box(F, '#e0b23a', 0, 9, -2.4, 13.4, .5, .5); for (const x of [-6.5, 6.5]) k.box(F, '#e0b23a', x, 9, 0, .5, .5, 5.3);
    for (const x of [-4.5, -1.5, 1.5, 4.5]) k.beam(F, '#2d2b2b', [x, 9, -.3], [x, 3.8, -.3], .05);
    k.box(F, '#3d4b57', 12, .4, 3, 6, 1.4, 5); k.beam(F, '#e0b23a', [11, 1, 3], [6, 13, 0], .3); k.beam(F, '#2d2b2b', [6, 13, 0], [4, 9.2, 0], .05);
    for (let i = 0; i < 6; i++) k.ball(F, i % 2 ? '#ff8a5c' : '#ffd36b', -9 + i * 3.6, .15, 5.5 - (i % 3), .3, .3, .3, 'lamp');
  },
  cauldron(k, F, L) {
    L.focus = [0, 9, 0]; L.height = 12; const M = L.mover; M.position.set(0, 8.3, 0);
    for (let i = 0; i < 7; i++) { const s = 13 - i * 1.6; k.box(F, i % 2 ? C.stone : '#c4b89f', 0, i * .9 + .45, 0, s, .9, s * .8); k.box(F, C.ivory, 0, i * .9 + .5, s * .4 + .05, 2.2, .12, .3);
      k.ball(F, '#ffb15a', -s / 2 + .3, i * .9 + 1.05, s * .4 - .2, .12, .12, .12, 'lamp'); k.ball(F, '#ffb15a', s / 2 - .3, i * .9 + 1.05, s * .4 - .2, .12, .12, .12, 'lamp'); }
    k.taper(F, C.brass, 0, 6.6, 0, 1.2, 1.4, true); k.cyl(F, '#a47a3f', 0, 7.35, 0, 2, .3); k.ring(F, '#f1c47a', 0, 7.5, 0, 2, Math.PI / 2);
    for (const [c, s, h] of [['#ff6b3d', 1.6, 3.4], ['#ffb347', 1.1, 2.6], ['#ffe08a', .6, 1.8]] as const) k.cone(M, c, 0, h / 2 - .7, 0, s, h, 'lamp');
  },
  meridian(k, F, L) {
    L.focus = [0, 5, 0]; L.height = 12; L.lift = 5.5; const M = L.mover; M.position.set(4, 0, 0);
    k.box(F, C.brick, -4, 3, -1.5, 8, 6, 6); k.box(F, C.ivory, -4, 6.1, -1.5, 8.4, .3, 6.4); k.ball(F, '#59707a', -4, 6.3, -1.5, 2.6, 2.2, 2.6); k.box(F, C.dark, -4, 7.2, .5, .7, 2, 1);
    for (let i = 0; i < 3; i++) k.box(F, '#ffd38a', -6.5 + i * 2.5, 2.8, 1.52, 1, 1.8, .08, 0, 'lamp');
    k.box(F, C.brick, 4, 2, 0, 2.4, 4, 2.4); k.cyl(F, C.white, 4, 9, 0, .16, 10); k.cone(F, C.brass, 4, 14.3, 0, .4, .8);
    k.ball(M, '#d64a3a', 0, 5, 0, .9); k.ring(M, C.brass, 0, 5, 0, .92, Math.PI / 2);
    k.box(F, '#ffe39a', 0, .3, 2, .16, .05, 20, 0, 'lamp'); for (let i = 0; i < 9; i++) k.box(F, C.brass, 0, .29, -7 + i * 2, .9, .04, .1);
  },
  x1(k, F, L) {
    L.focus = [0, 8, 0]; L.height = 10; const M = L.mover; M.position.set(0, 6.6, 0);
    k.taper(F, C.stone, 0, 3, 0, 1, 6); k.cyl(F, C.brass, 0, 6.1, 0, .6, .2);
    k.ball(M, '#e88a2e', 0, 0, 0, 3.2, .62, .62); k.put('cone', M, 'toon', '#e88a2e', 3.4, 0, 0, .5, 1.4, .5, 0, 0, -Math.PI / 2);
    k.box(M, '#e88a2e', .2, 0, 0, 1.5, .08, 5.8); k.box(M, '#e88a2e', -2.7, .7, 0, 1, 1.4, .08); k.box(M, '#e88a2e', -2.8, .25, 0, .8, .06, 2.2);
    k.box(M, '#2b3447', 1.6, .35, 0, .8, .25, .45); for (const z of [-.18, .18]) k.ball(M, '#ffc46b', -3.25, 0, z, .14, .14, .14, 'lamp');
  },
  cassini(k, F, L) {
    L.focus = [0, 8, 0]; L.height = 19; L.lift = 70; rocketPad(k, F); const M = L.mover; M.position.set(0, 1, 0);
    k.cyl(M, '#e6dcc2', 0, 7, 0, 1, 12); k.cyl(M, C.white, 0, 14.5, 0, 1.2, 3); k.cone(M, C.white, 0, 17, 0, 1.2, 2);
    for (const s of [-1, 1]) { k.cyl(M, '#dad2bf', s * 1.9, 5.5, 0, .72, 10); k.cone(M, '#dad2bf', s * 1.9, 11.1, 0, .72, 1.2); for (const y of [2, 6, 9]) k.cyl(M, C.dark, s * 1.9, y, 0, .74, .14); }
    for (const y of [3, 9, 13]) k.cyl(M, C.dark, 0, y, 0, 1.02, .12); k.ball(M, '#ffc46b', 0, .3, 0, .7, .3, .7, 'lamp');
  },
  studio(k, F, L) {
    L.focus = [0, 4.5, 3]; L.height = 10;
    k.box(F, '#b79b78', 0, 3, -2.4, 11, 6, 4); k.put('box', F, 'toon', C.dark, -2.8, 6.9, -2.4, 6.4, .35, 4.6, 0, 0, .5); k.put('box', F, 'toon', C.dark, 2.8, 6.9, -2.4, 6.4, .35, 4.6, 0, 0, -.5);
    for (let i = 0; i < 4; i++) k.box(F, '#ffd38a', -3.9 + i * 2.6, 3, -.36, 1.2, 1.6, .08, 0, 'lamp');
    const D = k.group(F, 0, 3.6, 3, -.95); k.box(D, C.wood, 0, 0, 0, 7.4, 4.8, .25); k.box(D, '#fff3d6', 0, 0, .14, 6, 3.6, .04, 0, 'lit');
    for (const [x, y, w, h] of [[0, 1.95, 6.4, .3], [0, -1.95, 6.4, .3], [-3.05, 0, .3, 4.2], [3.05, 0, .3, 4.2]]) k.box(D, C.ivory, x, y, .2, w, h, .14);
    k.box(F, C.dark, 0, 1.2, 3.2, 7, 2.4, 2.4);
    for (const x of [-5.4, 5.4]) { k.cyl(F, C.steel, x, 3.4, 1.2, .12, 6.8); const S = k.group(F, x, 7.2, 1.4); L.spinners.push({group: S, axis: 'z'});
      k.ring(S, C.steel, 0, 0, 0, 1.5, 0, 0, 'toon', true); for (let b = 0; b < 3; b++) k.put('box', S, 'toon', C.steel, 0, 0, 0, .16, 2.9, .1, 0, 0, b * Math.PI / 3); k.ball(S, C.dark, 0, 0, .1, .3); }
  },
  kepler(k, F, L) {
    L.focus = [5, 16, -6]; L.height = 18; const M = L.mover; M.position.set(5, 16, -6);
    k.cyl(F, C.stone, -4, 5, 0, 2.2, 10); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; k.box(F, C.stone, -4 + Math.cos(a) * 2.1, 10.4, Math.sin(a) * 2.1, .6, .8, .6, -a); }
    for (let i = 0; i < 4; i++) k.box(F, '#ffd38a', -4 + 2.21 * Math.sin(i), 2 + i * 2.2, 2.21 * Math.cos(i) * .3 + 1.4, .4, .9, .1, i, 'lamp');
    k.ring(F, C.brass, -4, 12.6, 0, 2.2, 0, .6, 'toon', true); k.beam(F, C.brass, [-4, 10.8, 0], [-2.4, 14.2, .9], .12);
    k.ball(M, '#fff2c4', 0, 0, 0, .6, .6, .6, 'lamp'); for (const a of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) k.put('box', M, 'lamp', '#fff2c4', 0, 0, 0, a % (Math.PI / 2) ? 2.2 : 4.2, .1, .1, 0, 0, a);
    const r = rng('ophiuchus'); const stars: V3[] = []; for (let i = 0; i < 9; i++) stars.push([r.range(-9, 12), r.range(11, 21), r.range(-9, -6)]);
    stars.forEach((s, i) => { k.ball(F, '#e8ecff', s[0], s[1], s[2], .18, .18, .18, 'lamp'); if (i) k.beam(F, '#6d74a8', stars[i - 1], s, .03, 'lit'); });
  },
  mast(k, F, L) {
    L.focus = [0, 22, 0]; L.height = 25;
    k.box(F, C.stone, 0, 2, 3, 8, 4, 4); k.box(F, C.dark, 0, 4.3, 3, 8.4, .6, 4.4); for (let i = 0; i < 4; i++) k.box(F, '#ffd38a', -2.7 + i * 1.8, 2, 5.03, .9, 1.4, .08, 0, 'lamp');
    lattice(k, F, C.steel, 0, -1, .3, 24, 2.2, .35, .14); k.ball(F, '#b9a6ff', 0, 24.6, -1, .5, .5, .5, 'lamp');
    lattice(k, F, C.steel, -9, -3, .3, 15, 1.2, .25, .1); k.ball(F, '#ff7b6b', -9, 15.4, -3, .35, .35, .35, 'lamp');
    for (let i = 0; i < 4; i++) k.beam(F, '#3b3f4a', [0, 23.6 - i * .4, -1], [-9, 14.6 - i * .3, -3], .025);
  },
  eiffel(k, F, L) {
    L.focus = [0, 14, 0]; L.height = 27; const brown = '#7d5a43';
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      k.beam(F, brown, [sx * 5.4, 0, sz * 5.4], [sx * 2.7, 8, sz * 2.7], .42); k.beam(F, brown, [sx * 2.7, 8, sz * 2.7], [sx * 1.1, 16, sz * 1.1], .32); k.beam(F, brown, [sx * 1.1, 16, sz * 1.1], [sx * .3, 26, sz * .3], .2);
      for (let i = 1; i < 7; i++) k.ball(F, '#ffd27f', sx * (5.4 - i * .45), i * 1.15, sz * (5.4 - i * .45), .1, .1, .1, 'lamp');
    }
    k.box(F, brown, 0, 8, 0, 7, .5, 7); k.box(F, brown, 0, 16, 0, 3, .4, 3); k.cyl(F, brown, 0, 26.6, 0, .25, 1.6); k.ball(F, '#ffd27f', 0, 27.6, 0, .4, .4, .4, 'lamp');
    for (const ry of [0, Math.PI / 2]) for (const s of [-1, 1]) { const x = ry ? s * 4.6 : 0, z = ry ? 0 : s * 4.6; k.ring(F, brown, x, 1.4, z, 3.4, 0, ry, 'toon', true); }
    for (let y = 2; y < 24; y += 2.5) { const w = y < 8 ? 5.4 - y * .34 : y < 16 ? 2.7 - (y - 8) * .2 : 1.1 - (y - 16) * .08;
      for (const [a, b] of [[[1, 1], [-1, -1]], [[1, -1], [-1, 1]]] as const) k.beam(F, brown, [a[0] * w, y, a[1] * w], [a[0] * w, y + 2, -a[1] * w], .06); }
    const M = L.mover; k.ball(M, '#e6d7a4', 11, 14, 0, .95, .95, 3.4); k.box(M, C.wood, 11, 12.7, 0, .32, .3, 1.6); k.box(M, '#bfae7c', 11, 14, -3.2, .06, 1.4, .9);
    for (const z of [-1.6, 0, 1.6]) k.beam(M, '#5a4a3b', [11, 13.1, z], [11, 13.9, z], .02); k.box(M, C.dark, 11, 12.7, 1, .06, .9, .06);
  },
  opera(k, F, L) {
    L.focus = [0, 6, 0]; L.height = 10;
    k.box(F, '#d9c9a6', 0, 1, 0, 17, 2, 11); k.box(F, '#cdbd99', 0, .4, 6, 11, .8, 1.6);
    const shell = (x: number, z: number, h: number, w: number, lean: number) => k.put('cone', F, 'lit', '#f3efe4', x, 1.7 + h * .42, z, w, h, w * .62, lean, 0, 0);
    for (const [z, h, lean] of [[3.4, 7.6, .5], [1, 6.6, .46], [-1.3, 5.4, .42], [-3.2, 4, -.55]]) { shell(-3.2, z, h, 2.1, lean); shell(-4.9, z - .2, h * .72, 1.2, lean); }
    for (const [z, h, lean] of [[3.1, 5.8, .5], [1, 5, .46], [-1, 4, .42], [-2.6, 3, -.55]]) { shell(3.8, z, h, 1.7, lean); shell(5.3, z - .2, h * .7, 1, lean); }
    shell(-7.2, 4.4, 2.8, 1.2, .5);
    for (let i = 0; i < 18; i++) k.ball(F, '#ffd08a', -8 + i * .94, 2.15, 5.45, .12, .12, .12, 'lamp');
    for (let i = 0; i < 6; i++) k.box(F, '#ffd08a', -6 + i * 2.4, 1.1, 5.52, 1.4, 1.2, .06, 0, 'lamp');
  },
  theatre(k, F, L) {
    L.focus = [0, 4.5, 0]; L.height = 13; L.furl = true; const M = L.mover; M.position.set(0, 7.6, -.9);
    k.box(F, '#c9b38c', 0, 6, -3.4, 16, 12, 3.4); for (let i = 0; i < 6; i++) k.cyl(F, C.ivory, -7 + i * 2.8 + (i > 2 ? 0 : 0), 4.5, -1.2, .42, 9);
    k.box(F, C.ivory, 0, 9.4, -1.2, 16.4, .9, 1.2); k.ball(F, '#5e7f74', 0, 12.2, -3.4, 3.6, 2.4, 2.4); k.cone(F, '#d6a54c', 0, 14.9, -3.4, .4, 1.2);
    k.box(F, '#2a1c25', 0, 4.1, -1.62, 8, 6.4, .1); k.box(F, '#ffe2a6', 0, 4.1, -1.66, 7.6, 6.1, .04, 0, 'lit');
    k.box(M, '#a62f35', 0, -3.3, 0, 8.2, 6.6, .22); for (let i = 0; i < 9; i++) k.box(M, '#8d2229', -3.6 + i * .9, -3.3, .13, .18, 6.6, .06);
    k.box(M, '#e4b45a', 0, -6.55, .14, 8.2, .22, .1); k.box(F, '#e4b45a', 0, 7.7, -.75, 8.8, .5, .3);
    for (let i = 0; i < 12; i++) k.ball(F, '#ffcb6b', -4.4 + i * .8, .6, -.4, .13, .13, .13, 'lamp');
  },
  bulb(k, F, L) {
    L.focus = [0, 6.4, 0]; L.height = 10;
    k.box(F, C.wood, 0, 2, 0, 11, .4, 5); for (const [x, z] of [[-5, -2], [5, -2], [-5, 2], [5, 2]]) k.box(F, C.dark, x, 1, z, .3, 2, .3);
    k.cyl(F, C.brass, 0, 3, 0, 1.3, 1.6); for (let i = 0; i < 4; i++) k.ring(F, '#a77a3d', 0, 2.5 + i * .3, 0, 1.32, Math.PI / 2);
    k.ball(F, '#fff4d6', 0, 6.4, 0, 3, 3.4, 3, 'glass'); k.beam(F, C.steel, [-.6, 3.8, 0], [-.6, 6.6, 0], .05); k.beam(F, C.steel, [.6, 3.8, 0], [.6, 6.6, 0], .05);
    k.ring(F, '#ffd37a', 0, 7.1, 0, .6, 0, 0, 'lamp', true);
    k.cyl(F, C.brass, -4, 3.4, .4, .6, 2.4); k.ball(F, '#e8f4ff', -4, 5.1, .4, .9, 1.1, .9, 'glass'); k.beam(F, C.brass, [-4, 4.6, .4], [-2.4, 3.6, .4], .06);
    for (let i = 0; i < 4; i++) { k.cyl(F, '#6d8f9a', 2.6 + i * .8, 2.7, 1.3, .3, .9); k.cyl(F, C.dark, 2.6 + i * .8, 3.2, 1.3, .12, .2); }
    k.beam(F, '#d0534a', [2.6, 3.3, 1.3], [0, 3.3, .6], .03);
  },
  ipod(k, F, L) {
    L.focus = [0, 6, 1]; L.height = 13; k.box(F, C.stone, 0, .8, 0, 6.4, 1.6, 3.2);
    const G = k.group(F, 0, 7, 0, -.12); k.box(G, '#f2f3f5', 0, 0, 0, 6, 9.6, 1.1); k.box(G, '#b9c0c8', 0, 0, -.6, 6.1, 9.7, .1); k.box(G, '#9fb7c9', 0, 2.1, .56, 4.6, 3.3, .04, 0, 'lit');
    const S = k.group(G, 0, -2.2, .6); L.spinners.push({group: S, axis: 'z'});
    k.put('round', S, 'toon', '#e3e5e8', 0, 0, 0, 2.2, .06, 2.2, Math.PI / 2); k.ring(S, '#c5c9cf', 0, 0, .04, 2.15); k.put('round', S, 'toon', '#f8f9fa', 0, 0, .05, .8, .06, .8, Math.PI / 2);
    for (let i = 0; i < 4; i++) k.box(S, '#9aa1aa', Math.cos(i * Math.PI / 2) * 1.5, Math.sin(i * Math.PI / 2) * 1.5, .05, .3, .3, .02);
    k.beam(F, C.white, [0, 2.2, .3], [-1.8, 1.7, 1.5], .05); k.beam(F, C.white, [0, 2.2, .3], [1.6, 1.7, 1.6], .05); k.ball(F, C.white, -1.8, 1.8, 1.5, .3); k.ball(F, C.white, 1.6, 1.8, 1.6, .3);
  },
  concorde(k, F, L) {
    L.focus = [0, 7, 0]; L.height = 9; const M = L.mover; M.position.set(0, 4.8, 0); k.taper(F, C.stone, 0, 2.2, 0, .9, 4.4);
    k.ball(M, C.white, 0, 0, 0, 5.6, .5, .5); k.put('cone', M, 'toon', C.white, 6.2, -.15, 0, .42, 1.6, .42, 0, 0, -Math.PI / 2 - .12);
    for (const s of [-1, 1]) { k.put('box', M, 'toon', C.white, -1.2, -.2, s * 1.7, 6.2, .08, 2.6, 0, s * .36, 0); k.box(M, '#c7ccd2', -1.8, -.48, s * 1.2, 2.6, .35, .8); }
    k.put('box', M, 'toon', C.white, -4.4, 1.1, 0, 1.8, 2, .08, 0, 0, .5); k.box(M, '#2c3f6b', -1, .02, 0, 9, .06, .52); k.ball(M, '#ff9e7a', -5.6, 0, 0, .14, .14, .14, 'lamp');
    for (let i = 0; i < 12; i++) for (const z of [-3, 3]) k.ball(F, i % 4 ? '#ffe3a8' : '#ff9e7a', -8 + i * 1.45, .35, z, .12, .12, .12, 'lamp');
  },
  piano(k, F, L) {
    L.focus = [0, 6, 0]; L.height = 9; const G = k.group(F, 0, 0, 0, 0, -.3, 0, 1.7);
    k.box(G, C.black, -.6, 3.1, 0, 5, 1.1, 3.4); k.cyl(G, C.black, 1.6, 3.1, -.4, 1.8, 1.1); for (const [x, z] of [[-2.8, 1.4], [-2.8, -1.4], [2.8, -.4]]) k.taper(G, C.black, x, 1.3, z, .2, 2.6, true);
    k.box(G, C.white, -.6, 3.1, 2.05, 4.6, .25, .7); for (let i = 0; i < 14; i++) if (i % 7 !== 2 && i % 7 !== 6) k.box(G, C.black, -2.7 + i * .32, 3.3, 1.95, .14, .15, .45);
    k.put('box', G, 'toon', '#2c2b31', .4, 4.9, 0, 5.4, .1, 3.6, 0, 0, .55); k.beam(G, C.brass, [1.4, 3.7, .4], [1.8, 5.8, .4], .05); k.put('box', G, 'toon', C.wood, -.6, 4.1, 1.3, 2.4, 1, .08, -.3);
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28; k.ball(F, '#f6d58f', Math.cos(a) * 8, .4, Math.sin(a) * 6, .14, .14, .14, 'lamp'); }
    const M = L.mover; const r = rng('notes'); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28, d = r.range(3, 7), y = r.range(5, 13), x = Math.cos(a) * d, z = Math.sin(a) * d;
      k.ball(M, '#ffe7a8', x, y, z, .42, .3, .3, 'lamp'); k.box(M, '#ffe7a8', x + .36, y + .8, z, .08, 1.6, .08, 0, 'lamp'); if (i % 2) k.box(M, '#ffe7a8', x + .62, y + 1.5, z, .5, .1, .08, 0, 'lamp'); }
  },
  football(k, F, L) {
    L.focus = [4, 1.6, -1.5]; L.height = 7; L.kick = {from: [1, .45, 7], to: [4.5, 1.6, -2.6]};
    k.box(F, '#7b5a45', -5, 2, -3, 8, 4, 4); k.box(F, C.ivory, -5, 5.4, -3, 8.2, 2.8, 4.2); for (let i = 0; i < 7; i++) k.box(F, '#4a3427', -8.6 + i * 1.2, 5.4, -.87, .18, 2.8, .1);
    k.put('box', F, 'toon', C.dark, -7, 7.6, -3, 4.6, .3, 4.8, 0, 0, .55); k.put('box', F, 'toon', C.dark, -3, 7.6, -3, 4.6, .3, 4.8, 0, 0, -.55);
    for (let i = 0; i < 3; i++) k.box(F, '#ffd38a', -7.4 + i * 2.4, 2, -.95, 1.2, 1.4, .08, 0, 'lamp'); k.box(F, C.wood, -1.4, 3.4, -.9, 1.6, 1, .1); k.box(F, '#ffd38a', -1.4, 3.4, -.84, 1.2, .6, .04, 0, 'lit');
    for (const x of [1.5, 7.5]) k.cyl(F, C.white, x, 1.4, -1.5, .1, 2.8); k.box(F, C.white, 4.5, 2.8, -1.5, 6.2, .14, .14);
    for (let i = 0; i <= 8; i++) k.beam(F, '#d9dde0', [1.5 + i * .75, 2.8, -1.5], [1.5 + i * .75, 0, -3.4], .02); for (let j = 0; j < 4; j++) k.beam(F, '#d9dde0', [1.5, .7 * j, -1.5 - j * .45], [7.5, .7 * j, -1.5 - j * .45], .02);
    k.box(F, C.ivory, 4.5, .27, 1.5, 9, .04, .1); const M = L.mover; k.ball(M, C.white, 0, 0, 0, .45); for (let i = 0; i < 6; i++) { const a = i * 1.05; k.ball(M, C.black, Math.cos(a) * .38, Math.sin(a) * .38, i % 2 ? .2 : -.2, .12); }
  },
  subway(k, F, L) {
    L.focus = [0, 2.5, 1.5]; L.height = 8; const M = L.mover;
    k.box(F, C.stone, 0, 3.6, -2.2, 17, 7.2, 2); k.box(F, '#1a1d24', 0, 2.5, -1.15, 6.2, 5, .1); k.ring(F, C.brass, 0, 2.5, -1.1, 3.3, 0, 0, 'toon', true);
    for (let i = 0; i < 7; i++) k.ball(F, '#9fe0c8', -3.2 + i * 1.07, 6.4, -1.12, .14, .14, .14, 'lamp');
    k.box(F, '#3d5a4c', -6.5, 1.8, 3.4, 3, 3.6, 2.4); k.cone(F, '#3d5a4c', -6.5, 4.3, 3.4, 2.2, 1.4); k.box(F, '#ffe4a8', -6.5, 2.3, 4.62, 2.2, 1.6, .06, 0, 'lamp');
    for (const z of [.8, 2.2]) k.box(F, C.steel, 0, .32, z, 30, .08, .1); for (let i = 0; i < 22; i++) k.box(F, C.wood, -14 + i * 1.33, .27, 1.5, .3, .06, 2);
    for (let c = 0; c < 3; c++) { const x = -c * 4.3; k.box(M, '#6b3f35', x, 1.7, 1.5, 4.1, 2.4, 2); k.box(M, '#3a3333', x, 3, 1.5, 4.2, .25, 2.1);
      for (let w = 0; w < 4; w++) k.box(M, '#fff0bd', x - 1.5 + w, 2, 2.52, .6, .7, .04, 0, 'lamp'); }
    k.ball(M, '#fff7d6', 2.08, 1.6, 1.5, .2, .2, .2, 'lamp');
  },
  liberty(k, F, L) {
    L.focus = [1.5, 18.5, 0]; L.height = 20; const M = L.mover; M.position.set(1.55, 19.3, .1);
    k.cyl(F, '#a99f86', 0, 1, 0, 6.2, 2); k.box(F, '#cdbf9f', 0, 5, 0, 5, 6, 5); k.box(F, '#d8cbab', 0, 8.2, 0, 5.6, .5, 5.6); k.box(F, C.dark, 0, 4, 2.52, 1, 2, .06);
    k.taper(F, C.green, 0, 11.6, 0, 1.7, 6.6); k.ball(F, C.green, 0, 14.9, 0, 1.2, .8, .9); k.ball(F, C.green, 0, 15.9, .1, .62);
    for (let i = 0; i < 7; i++) { const a = -1.2 + i * .4; k.put('cone', F, 'toon', C.green, Math.sin(a) * .7, 16.4 + Math.cos(a) * .25, .1, .1, .8, .1, 0, 0, -a); }
    k.box(F, C.green, -1.2, 13.6, .6, .7, 1.3, .25); k.beam(F, C.green, [.9, 14.9, 0], [1.5, 18.3, .1], .32); k.cyl(F, C.green, 1.55, 18.6, .1, .28, .7); k.taper(F, C.brass, 1.55, 19.05, .1, .5, .5, true);
    for (const [c, s, h] of [['#ff8c42', .5, 1.6], ['#ffd36b', .3, 1.1]] as const) k.cone(M, c, 0, h / 2, 0, s, h, 'lamp');
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; k.ball(F, '#ffc768', Math.cos(a) * 6.3, 2.2, Math.sin(a) * 6.3, .16, .16, .16, 'lamp'); }
  },
  arpanet(k, F, L) {
    L.focus = [0, 9, 0]; L.height = 12; const M = L.mover;
    for (const x of [-6, 6]) { k.box(F, '#c9c3b5', x, 2.6, 0, 2.4, 5.2, 1.6); k.box(F, '#7c8f9a', x, 3.2, .82, 2, 2.4, .06);
      for (let i = 0; i < 20; i++) k.ball(F, i % 3 ? '#6dffd2' : '#ffcf6b', x - .7 + (i % 4) * .46, 2.4 + Math.floor(i / 4) * .4, .88, .07, .07, .07, 'lamp');
      k.box(F, '#b8b2a2', x + (x < 0 ? 2.2 : -2.2), 1.4, 1.4, 1.8, 1.4, 1.2); k.box(F, C.ivory, x + (x < 0 ? 2.2 : -2.2), 2.3, 1.4, 1, .5, .05); }
    for (let i = 0; i < 16; i++) { const a = i / 16, b = (i + 1) / 16; k.beam(F, '#6dffd2', [-6 + 12 * a, 5.4 + 3.4 * Math.sin(Math.PI * a), 0], [-6 + 12 * b, 5.4 + 3.4 * Math.sin(Math.PI * b), 0], .07, 'lamp'); }
    M.position.set(0, 11.5, 0); k.box(M, '#6dffd2', -2.4, 0, 0, .55, 2.6, .4, 0, 'lamp'); k.box(M, '#6dffd2', -1.6, -1.05, 0, 2.1, .5, .4, 0, 'lamp'); k.ring(M, '#6dffd2', 1.9, 0, 0, 1.15, 0, 0, 'lamp', true);
  },
  microphone(k, F, L) {
    L.focus = [0, 8.5, 1]; L.height = 13;
    k.box(F, C.wood, 0, 2, 1, 9, .4, 3.6); for (const x of [-4, 4]) k.box(F, C.dark, x, 1, 1, .3, 2, 3);
    k.cyl(F, C.steel, 0, 4.6, 1, .18, 5); k.cyl(F, C.dark, 0, 2.3, 1, 1, .2); k.ball(F, '#b9c1c9', 0, 8.3, 1, 1.4, 2, 1.1);
    for (let i = 0; i < 7; i++) k.box(F, '#7d8590', -.9 + i * .3, 8.3, 2.05, .08, 2.8, .06); k.ring(F, C.steel, 0, 8.3, 1, 1.55, 0, Math.PI / 2, 'toon', true); k.box(F, C.brass, 0, 6.2, 2, 1.8, .6, .1);
    k.box(F, C.dark, 0, 12, -2, 4.2, 1.5, .4); k.box(F, '#ff5b4a', 0, 12, -1.78, 3.5, .95, .06, 0, 'lamp');
    k.box(F, C.wood, -6.5, 2.8, 0, 2.8, 5.6, 2); k.ring(F, '#ffcf6b', -6.5, 4.2, 1.02, .5, 0, 0, 'lamp'); for (let i = 0; i < 5; i++) k.box(F, '#4a3427', -6.5, 1.6 + i * .3, 1.02, 2, .1, .04);
    lattice(k, F, C.steel, 8, -4, .3, 14, 1, .2, .09); k.ball(F, '#ff8f6a', 8, 14.3, -4, .3, .3, .3, 'lamp');
  },
  soyuz(k, F, L) {
    L.focus = [0, 8, 0]; L.height = 18; L.lift = 70; rocketPad(k, F); const M = L.mover; M.position.set(0, 1, 0);
    k.cyl(M, '#d9dccf', 0, 7.5, 0, 1, 12); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * 1.45, z = Math.sin(a) * 1.45;
      k.taper(M, '#c8cdbd', x, 4, z, .85, 6.4); k.cone(M, '#c8cdbd', x, 7.8, z, .47, 1.2); }
    k.cyl(M, '#cfd3c4', 0, 14.5, 0, 1, 2.4); k.cyl(M, '#e9e9e2', 0, 16.8, 0, 1.2, 2.4); k.cone(M, '#e9e9e2', 0, 18.6, 0, 1.2, 1.4); k.beam(M, C.steel, [0, 19.3, 0], [0, 21.4, 0], .12);
    for (const y of [5, 11]) k.cyl(M, '#5f6b5e', 0, y, 0, 1.03, .16); k.ball(M, '#ffbf6a', 0, .3, 0, .8, .3, .8, 'lamp');
  },
};
export const LANDMARKS = Object.keys(builds);
export function buildLandmark(k: Kit, root: any, kind: string): Landmark {
  const mover = new T.Group(); mover.name = 'landmark-mover'; root.add(mover);
  const L: Landmark = {mover, spinners: [], focus: [0, 6, 0], height: 10};
  (builds[kind] ?? builds.gate)(k, root, L);
  return L;
}
