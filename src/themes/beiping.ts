import * as THREE from 'three';
import type {Stage, StageLook} from '../level/stage';
import type {RunnerLayout, Piece} from '../templates/runner';
import type {RunnerSpec} from '../../content/levels/types';
/** A runner theme turns course pieces into meshes; collision is baked from what it builds. */
export interface RunnerKit {id: string; look: StageLook; build(stage: Stage, layout: RunnerLayout, spec: RunnerSpec): void}
const SERIF = '"Noto Serif SC","Source Han Serif SC","Songti SC","STSong","SimSun",serif';
const C = {brick: '#8f8b85', brickDark: '#77736d', cap: '#4f5458', red: '#a8322a', redDark: '#86261f', wood: '#a47b4f', woodDark: '#7a5a3f', tile: '#4f5458', marble: '#ece7dc', stone: '#d6cfbf', asphalt: '#85817a', gold: '#e0b13a', water: '#4f8f8c'};
/** 北平 1949: grey-brick hutongs, courtyard roofs, Chang'an Avenue, marble bridges and the red gate tower. */
export const beipingKit: RunnerKit = {
  id: 'beiping-1949',
  look: {skyTop: '#8fc2e8', skyHorizon: '#f3ead2', fog: [60, 220], sun: '#fff1d6', sunIntensity: 2.6, hemiSky: '#dceeff', hemiGround: '#b8a88c', ink: '#2f2a24', wash: '#f7f1e3'},
  build(stage, layout, spec) {
    const root = new THREE.Group(); root.name = 'course'; stage.scene.add(root);
    const mesh = (geo: THREE.BufferGeometry, color: string, x: number, y: number, z: number, name: string, parent: THREE.Object3D = root) => { const m = new THREE.Mesh(geo, stage.toon(color)); m.position.set(x, y, z); m.name = name; stage.add(m, parent); return m; };
    const boxOf = (p: Piece, color: string, name = p.kind) => mesh(new THREE.BoxGeometry(p.max[0] - p.min[0], p.max[1] - p.min[1], p.max[2] - p.min[2]), color, (p.min[0] + p.max[0]) / 2, (p.min[1] + p.max[1]) / 2, (p.min[2] + p.max[2]) / 2, name);
    const people = ['#3f5f7a', '#5a6b7d', '#6b4f3f', '#2f3f5a', '#7a6a5a', '#4a5f4a'];
    let sign = 0;
    for (const p of layout.pieces) {
      const w = p.max[0] - p.min[0], h = p.max[1] - p.min[1], d = p.max[2] - p.min[2], cx = (p.min[0] + p.max[0]) / 2, cz = (p.min[2] + p.max[2]) / 2;
      switch (p.kind) {
        case 'ground': boxOf(p, p.segment === 'avenue' ? C.asphalt : p.segment === 'bridge' ? (p.min[1] < -1 ? '#3c5f63' : C.stone) : C.brick); break;
        case 'wall': case 'gate': {
          boxOf(p, C.brick); mesh(new THREE.BoxGeometry(w + .1, .18, d + .3), C.cap, cx, p.max[1] + .09, cz, 'wall-cap');
          if (p.kind === 'gate') { const face = cz > 0 ? p.min[2] - .02 : p.max[2] + .02; mesh(new THREE.BoxGeometry(1.4, 2.1, .08), C.red, cx, 1.05, face, 'gate-door'); mesh(new THREE.BoxGeometry(2, .3, .5), C.tile, cx, 2.35, face, 'gate-roof');
            if (spec.signs && sign < spec.signs.length && w > 4) { const tex = plaque(spec.signs[sign++]); const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .4), stage.toon('#ffffff', {map: tex})); m.position.set(cx + 1.6, 2.1, face + (cz > 0 ? -.03 : .03)); m.rotation.y = cz > 0 ? Math.PI : 0; root.add(m); } }
          break; }
        case 'crate': boxOf(p, C.wood); mesh(new THREE.BoxGeometry(w + .02, .06, d + .02), C.woodDark, cx, p.max[1] - .2, cz, 'crate-band'); break;
        case 'cart': boxOf(p, C.woodDark); for (const s of [-1, 1]) { const wh = mesh(new THREE.CylinderGeometry(.35, .35, .1, 14), '#5a4030', cx, .35, cz + s * (d / 2 + .06), 'cart-wheel'); wh.rotation.x = Math.PI / 2; } break;
        case 'house': boxOf(p, C.brick); for (let k = p.min[0] + 1; k < p.max[0] - .8; k += 1.8) for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(.9, 1, .06), C.red, k + .45, 1.4, s * (d / 2 + .02), 'window-frame'); break;
        case 'roof': { boxOf(p, C.tile); for (let k = p.min[0]; k < p.max[0]; k += .3) mesh(new THREE.BoxGeometry(.08, .06, d), '#3f4448', k + .15, p.max[1] + .03, cz, 'roof-tiles'); for (const s of [-1, 1]) { const eave = mesh(new THREE.BoxGeometry(w, .12, 2.4), C.tile, cx, p.min[1] - .35, s * 2.4, 'roof-eave'); eave.rotation.x = s * -.45; } break; }
        case 'ridge': boxOf(p, '#3b3f42'); for (const s of [p.min[0], p.max[0]]) mesh(new THREE.BoxGeometry(.3, .3, .3), '#3b3f42', s, p.max[1] + .1, 0, 'ridge-end'); break;
        case 'stair': boxOf(p, '#9c958a'); break;
        case 'crowd': { const g = new THREE.Group(); g.name = 'crowd'; root.add(g); const n = Math.max(2, Math.round(w * d * 1.6));
          for (let i = 0; i < n; i++) { const px = p.min[0] + .25 + ((i * 0.618) % 1) * (w - .5), pz = p.min[2] + .25 + ((i * 0.381 + .2) % 1) * (d - .5);
            mesh(new THREE.CapsuleGeometry(.2, .7, 4, 8), people[i % people.length], px, .6, pz, 'person', g); mesh(new THREE.SphereGeometry(.16, 10, 8), '#e8c9a6', px, 1.3, pz, 'person-head', g);
            if (i % 3 === 0) mesh(new THREE.BoxGeometry(.03, .5, .03), '#6b4a2f', px + .2, 1.45, pz, 'person-stick', g); }
          break; }
        case 'lamp': boxOf(p, '#3b3f42'); mesh(new THREE.SphereGeometry(.28, 12, 8), '#f2e8c8', cx, p.max[1] + .2, cz, 'lamp-globe'); break;
        case 'rail': boxOf(p, C.marble); break;
        case 'bridge': boxOf(p, C.marble); break;
        case 'plinth': boxOf(p, C.marble); break;
        case 'pole': boxOf(p, '#d8d8d8'); break;
        case 'tower': {
          boxOf(p, C.red); for (const z of [-7, -3.5, 0, 3.5, 7]) mesh(new THREE.BoxGeometry(.1, z === 0 ? 4 : 3, z === 0 ? 2.6 : 2), '#3a2a25', p.min[0] - .03, z === 0 ? 2 : 1.5, z, 'tower-arch');
          mesh(new THREE.BoxGeometry(w + 1.2, .5, d + 1.2), C.marble, cx, p.max[1] + .25, cz, 'tower-terrace');
          mesh(new THREE.BoxGeometry(w - 1, 3.2, d - 4), C.red, cx, p.max[1] + 2.1, cz, 'tower-hall');
          for (const [y, s] of [[p.max[1] + 3.9, 1], [p.max[1] + 5.2, .7]] as const) { const r = mesh(new THREE.BoxGeometry((w + 2) * s, .4, (d) * s), C.gold, cx, y, cz, 'tower-roof'); r.scale.y = 1; }
          const plq = plaque('天安门'); const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .8), stage.toon('#ffffff', {map: plq})); m.position.set(p.min[0] - .06, p.max[1] + 2.2, 0); m.rotation.y = -Math.PI / 2; root.add(m);
          break; }
      }
    }
    for (const w of layout.water) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w.max[0] - w.min[0], w.max[1] - w.min[1]), stage.toon(C.water, {transparent: true, opacity: .8})); m.rotation.x = -Math.PI / 2; m.position.set((w.min[0] + w.max[0]) / 2, w.level, (w.min[1] + w.max[1]) / 2); m.name = 'moat-water'; root.add(m); }
  },
};
function plaque(text: string) {
  const c = document.createElement('canvas'); c.width = 384; c.height = 128; const g = c.getContext('2d')!;
  g.fillStyle = '#2f3a4a'; g.fillRect(0, 0, 384, 128); g.strokeStyle = '#e0b13a'; g.lineWidth = 8; g.strokeRect(6, 6, 372, 116);
  g.fillStyle = '#f2d27a'; g.font = `900 72px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 192, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
