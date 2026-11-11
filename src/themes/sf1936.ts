import * as THREE from 'three';
import type {RunnerKit} from './beiping';
import type {Piece} from '../templates/runner';
const SANS = '"Helvetica Neue","Arial","PingFang SC","Microsoft YaHei",sans-serif';
const C = {road: '#7d7b78', curb: '#c9c4b8', steel: '#9aa3aa', steelDark: '#7a838a', concrete: '#c7c1b4', booth: '#e8e2d2', boothRoof: '#3f6f8a', water: '#3f7f9c', tunnel: '#b8b2a4'};
const CARS = ['#2b2b2e', '#5a1f24', '#2f4a3a', '#26364f', '#6b5a3a'];
/** San Francisco–Oakland Bay Bridge, opening day 1936: grey steel, Art Deco booths, 1930s cars, the bay far below. */
export const sfKit: RunnerKit = {
  id: 'sf-1936',
  look: {skyTop: '#7fb4e0', skyHorizon: '#eef1ea', fog: [70, 260], sun: '#fff4dc', sunIntensity: 2.8, hemiSky: '#dbe9f5', hemiGround: '#8c8a80', ink: '#2a2a2c', wash: '#f2f1ea'},
  build(stage, layout) {
    const root = new THREE.Group(); root.name = 'course'; stage.scene.add(root);
    const mesh = (geo: THREE.BufferGeometry, color: string, x: number, y: number, z: number, name: string) => { const m = new THREE.Mesh(geo, stage.toon(color)); m.position.set(x, y, z); m.name = name; stage.add(m, root); return m; };
    const boxOf = (p: Piece, color: string, name: string = p.kind) => mesh(new THREE.BoxGeometry(p.max[0] - p.min[0], p.max[1] - p.min[1], p.max[2] - p.min[2]), color, (p.min[0] + p.max[0]) / 2, (p.min[1] + p.max[1]) / 2, (p.min[2] + p.max[2]) / 2, name);
    let car = 0;
    for (const p of layout.pieces) {
      const w = p.max[0] - p.min[0], h = p.max[1] - p.min[1], d = p.max[2] - p.min[2], cx = (p.min[0] + p.max[0]) / 2, cz = (p.min[2] + p.max[2]) / 2;
      switch (p.kind) {
        case 'ground': boxOf(p, p.segment === 'tunnel' ? '#8a8680' : C.road);
          if (p.segment === 'deck' || p.segment === 'tunnel') for (const z of [-1.2 * 1.9, 0, 1.2 * 1.9]) mesh(new THREE.BoxGeometry(w, .02, .12), '#e8e2c8', cx, .01, z, 'lane-mark-fx');
          if (p.segment === 'deck') { const under = mesh(new THREE.BoxGeometry(w, 2.4, d - .4), C.steelDark, cx, -1.4, cz, 'deck-truss'); under.name = 'deck-truss'; }
          break;
        case 'rail': boxOf(p, C.steel); for (let k = p.min[0]; k < p.max[0]; k += 2.5) mesh(new THREE.BoxGeometry(.12, h + .2, .12), C.steelDark, k, h / 2, cz, 'rail-post'); break;
        case 'booth': boxOf(p, C.booth); mesh(new THREE.BoxGeometry(w + .5, .18, d + .5), C.boothRoof, cx, p.max[1] + .1, cz, 'booth-roof'); mesh(new THREE.BoxGeometry(.04, .7, d * .7), '#3c4b55', p.min[0] - .02, 1.4, cz, 'booth-window'); break;
        case 'car': {
          const col = CARS[car++ % CARS.length], g = new THREE.Group(); g.name = 'car'; g.position.set(cx, 0, cz); root.add(g);
          const add = (geo: THREE.BufferGeometry, c: string, x: number, y: number, z: number) => { const m = new THREE.Mesh(geo, stage.toon(c)); m.position.set(x, y, z); stage.add(m, g); return m; };
          add(new THREE.BoxGeometry(w * .95, .55, d * .9), col, 0, .6, 0); add(new THREE.BoxGeometry(w * .5, .55, d * .8), col, -w * .08, 1.15, 0); add(new THREE.BoxGeometry(w * .46, .4, d * .82), '#3c4b55', -w * .08, 1.15, 0).scale.set(1.02, .8, 1.01);
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const wh = add(new THREE.CylinderGeometry(.34, .34, .22, 14), '#1f1f22', sx * w * .32, .34, sz * d * .45); wh.rotation.x = Math.PI / 2; }
          add(new THREE.BoxGeometry(.06, .28, d * .5), '#d8d2bf', w * .48, .7, 0); break; }
        case 'pylon':
          if (p.segment === 'tunnel') { boxOf(p, C.tunnel); break; }
          boxOf(p, C.steel); for (let y = 2; y < h; y += 2.2) mesh(new THREE.BoxGeometry(w + .12, .12, d + .12), C.steelDark, cx, y, cz, 'pylon-rivets'); mesh(new THREE.BoxGeometry(w + .3, .5, d + .3), C.steelDark, cx, p.max[1] + .25, cz, 'pylon-cap'); break;
        case 'beam': boxOf(p, C.steel); for (let z = p.min[2] + .6; z < p.max[2]; z += 1.2) { const x1 = mesh(new THREE.BoxGeometry(.14, h * .9, .14), C.steelDark, cx, (p.min[1] + p.max[1]) / 2, z, 'beam-lattice'); x1.rotation.x = .7; } break;
        case 'wall': boxOf(p, C.tunnel); break;
        case 'ceiling': boxOf(p, C.tunnel); for (let k = p.min[0] + 3; k < p.max[0]; k += 6) { const l = mesh(new THREE.BoxGeometry(.8, .1, .3), '#fff1c8', k, p.min[1] - .06, 0, 'tunnel-lamp-fx'); (l.material as any).emissive?.set?.('#fff1c8'); } break;
        case 'plinth': boxOf(p, C.concrete); break;
        case 'pole': boxOf(p, '#d8d2c0'); mesh(new THREE.SphereGeometry(.14, 10, 8), '#e0b13a', cx, p.max[1] + .1, cz, 'pole-top'); break;
        case 'lamp': boxOf(p, '#3b3f42'); mesh(new THREE.SphereGeometry(.26, 12, 8), '#f2e8c8', cx, p.max[1] + .2, cz, 'lamp-globe'); break;
        default: boxOf(p, C.concrete);
      }
    }
    // main cables: from each tower top sagging down between the towers and out to the ends of the deck segment
    const cable = new THREE.MeshToonMaterial({color: '#6f787f'});
    for (const s of layout.segments.filter(q => q.kind === 'deck')) {
      const towers = layout.pieces.filter(p => p.kind === 'pylon' && p.segment === 'deck' && p.min[0] >= s.x0 && p.max[0] <= s.x1 && p.min[2] < 0).map(p => (p.min[0] + p.max[0]) / 2);
      for (const z of [-5.1, 5.1]) {
        const pts: THREE.Vector3[] = [], xs = [s.x0, ...towers, s.x1];
        for (let i = 1; i < xs.length; i++) { const a = xs[i - 1], b = xs[i], ya = i === 1 ? 8 : 22, yb = i === xs.length - 1 ? 8 : 22; for (let k = 0; k <= 12; k++) { const t = k / 12, sag = Math.sin(t * Math.PI) * (ya === 22 && yb === 22 ? 16 : 6); pts.push(new THREE.Vector3(a + (b - a) * t, ya + (yb - ya) * t - sag, z)); } }
        for (const ax of [s.x0, s.x1]) mesh(new THREE.BoxGeometry(2.2, 9, 1.2), C.concrete, ax + (ax === s.x0 ? 1.1 : -1.1), 4.5, z + (z > 0 ? .5 : -.5), 'cable-anchorage');
        const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, .18, 6), cable); tube.name = 'cable-fx'; root.add(tube);
        for (const pt of pts) if (pt.y > 2.2) { const hang = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, pt.y - 1), cable); hang.position.set(pt.x, (pt.y + 1) / 2, z); hang.name = 'hanger-fx'; root.add(hang); }
      }
    }
    // the bay far below the deck, and hills on the far shore
    const water = new THREE.Mesh(new THREE.PlaneGeometry(layout.bounds.max[0] + 400, 600), stage.toon(C.water)); water.rotation.x = -Math.PI / 2; water.position.set(layout.bounds.max[0] / 2, -22, 0); water.name = 'bay-water'; root.add(water);
    for (let i = 0; i < 9; i++) { const hill = new THREE.Mesh(new THREE.SphereGeometry(30 + i * 3, 12, 8), stage.toon(i % 2 ? '#8fa77a' : '#a3b386')); hill.scale.y = .35; hill.position.set(i * 45 - 40, -22, i % 2 ? 160 : -170); hill.name = 'far-hill-fx'; root.add(hill); }
    const sign = document.createElement('canvas'); sign.width = 512; sign.height = 128; const g = sign.getContext('2d')!; g.fillStyle = '#1f3f5a'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#f2e8c8'; g.font = `800 50px ${SANS}`; g.textAlign = 'center'; g.fillText('SAN FRANCISCO', 256, 60); g.font = `700 30px ${SANS}`; g.fillText('旧金山 · 海湾大桥', 256, 104);
    const tex = new THREE.CanvasTexture(sign); tex.colorSpace = THREE.SRGBColorSpace; const arr = layout.segments.find(q => q.kind === 'arrival');
    if (arr) { const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), stage.toon('#ffffff', {map: tex})); m.position.set(arr.x0 + 18, 4.2, 0); m.rotation.y = -Math.PI / 2; m.name = 'sign'; root.add(m);
      for (const z of [-2.2, 2.2]) mesh(new THREE.BoxGeometry(.2, 4.6, .2), '#3b3f42', arr.x0 + 18.05, 2.3, z, 'sign-post'); }
  },
};
