import * as THREE from 'three';
import type {KitHandles, Palette, ThemeKit} from './kit';
import type {Stage, StageLook} from '../level/stage';
import type {Layout, Lot, Prop} from '../templates/types';
const SERIF = '"Noto Serif SC","Source Han Serif SC","Songti SC","STSong","SimSun",serif';
function signTexture(text: string, paper: string, ink: string) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160; const g = c.getContext('2d')!;
  g.fillStyle = paper; g.fillRect(0, 0, 512, 160); g.strokeStyle = ink; g.lineWidth = 10; g.strokeRect(8, 8, 496, 144);
  g.fillStyle = ink; g.font = `900 92px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 86);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
/** Gable roof prism along X, footprint w × d, overhang o. */
function gable(w: number, d: number, h: number, o: number) {
  const s = new THREE.Shape(); s.moveTo(-d / 2 - o, 0); s.lineTo(d / 2 + o, 0); s.lineTo(0, h); s.lineTo(-d / 2 - o, 0);
  const g = new THREE.ExtrudeGeometry(s, {depth: w + o * 2, bevelEnabled: false}); g.translate(0, 0, -(w + o * 2) / 2); g.rotateY(Math.PI / 2); return g;
}
/** Simple, readable district kit: walls, roofs, doors, windows, props. Palette decides the era. */
export function plainKit(id: string, look: StageLook, p: Palette): ThemeKit {
  return {id, look, build(stage: Stage, layout: Layout, spec): KitHandles {
    const T = THREE, mat = (c: string, o = {}) => stage.toon(c, o), root = new T.Group(); root.name = 'district'; stage.scene.add(root);
    const [x0, z0] = layout.bounds.min, [x1, z1] = layout.bounds.max;
    const plane = (w: number, d: number, x: number, z: number, y: number, c: string) => { const m = new T.Mesh(new T.PlaneGeometry(w, d), mat(c)); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m; };
    plane(140, 140, 0, 0, -.01, p.ground);
    plane(x1 - x0, z1 - z0, (x0 + x1) / 2, (z0 + z1) / 2, 0, p.yard);
    plane(26, 7, .5, 0, .004, p.lane); plane(10.5, z1 - z0, -17, 0, .006, p.plaza); plane(9.5, z1 - z0, 17.75, 0, .006, p.plaza);
    for (let x = -12; x <= 13; x += 1.2) plane(.04, 7, x, 0, .008, p.trim); // paving joints
    const box = (w: number, h: number, d: number, c: string, x: number, y: number, z: number, parent = root) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); return stage.add(m, parent); };
    for (const lot of layout.lots) buildLot(lot);
    function buildLot(l: Lot) {
      const w = l.max[0] - l.min[0], d = l.max[1] - l.min[1], cx = (l.min[0] + l.max[0]) / 2, cz = (l.min[1] + l.max[1]) / 2;
      const wall = l.style === 9 ? p.accent : p.walls[l.style % p.walls.length];
      box(w, l.height, d, wall, cx, l.height / 2, cz);
      box(w + .12, .18, d + .12, p.trim, cx, l.height - .09, cz); // cornice
      box(w + .06, .35, d + .06, p.brick, cx, .175, cz);         // plinth
      if (l.roof === 'gable') { const roof = new T.Mesh(gable(w, d, Math.min(d * .32, 1.9), .35), mat(p.roof)); roof.position.set(cx, l.height, cz); stage.add(roof, root); }
      else { for (const [dx, dz, ww, dd] of [[0, d / 2, w, .2], [0, -d / 2, w, .2], [w / 2, 0, .2, d], [-w / 2, 0, .2, d]]) box(ww, .45, dd, p.trim, cx + dx, l.height + .22, cz + dz); }
      if (!l.door) return;
      const f = l.door.facing[2], face = l.door.z + f * .03;
      box(1.15, 2.15, .12, p.door, l.door.x, 1.08, face);
      box(1.5, .22, .2, p.trim, l.door.x, 2.3, l.door.z + f * .06);
      const floors = l.height > 4.6 ? [1.75, 3.6] : [1.75];
      for (const y of floors) for (const dx of [-w / 2 + .9, w / 2 - .9]) if (Math.abs(dx) > .9) { box(.8, .95, .08, p.glass, l.door.x + dx, y + (y > 2 ? 0 : 0), face); box(.95, .1, .14, p.trim, l.door.x + dx, y - .53, face + f * .02); }
      if (l.height > 4.6) box(.8, .95, .08, p.glass, l.door.x, 3.6, face);
    }
    const pads: KitHandles['pads'] = {}; let cabinet: KitHandles['cabinet'];
    for (const pr of layout.props) buildProp(pr);
    function buildProp(q: Prop) {
      const g = new T.Group(); g.position.set(q.x, q.y, q.z); g.rotation.y = q.rot; root.add(g);
      const b = (w: number, h: number, d: number, c: string, x = 0, y = 0, z = 0) => box(w, h, d, c, x, y, z, g);
      switch (q.kind) {
        case 'fence': b(q.w, q.h, q.d, p.brick, 0, q.h / 2, 0); b(q.w + .05, .12, q.d + .08, p.trim, 0, q.h + .06, 0); break;
        case 'crate': b(q.w, q.h, q.d, p.wood, 0, q.h / 2, 0); b(q.w + .02, .08, q.d + .02, p.trim, 0, q.h * .5, 0); break;
        case 'crate-stack': { const n = Math.max(1, Math.round(q.h / .45)); for (let i = 0; i < n; i++) b(q.w - i * .08, q.h / n - .02, q.d - i * .06, i % 2 ? p.wood : p.trim, (i % 2 - .5) * .06, q.h / n * (i + .5), 0); break; }
        case 'barrel': { const m = new T.Mesh(new T.CylinderGeometry(q.w / 2, q.w / 2 * .92, q.h, 14), mat(p.wood)); m.position.y = q.h / 2; stage.add(m, g); for (const y of [.2, .8]) { const r = new T.Mesh(new T.TorusGeometry(q.w / 2 + .01, .025, 6, 18), mat(p.metal)); r.rotation.x = Math.PI / 2; r.position.y = q.h * y; stage.add(r, g); } break; }
        case 'lamp': { b(.12, q.h, .12, p.metal, 0, q.h / 2, 0); b(.5, .08, .08, p.metal, .2, q.h - .1, 0); b(.3, .36, .3, p.lamp, .42, q.h - .32, 0); const s = stage.glow(p.lamp, 1.6, .45); s.position.set(.42, q.h - .32, 0); g.add(s); break; }
        case 'bench': b(q.w, .08, q.d, p.wood, 0, q.h, 0); for (const x of [-q.w / 2 + .15, q.w / 2 - .15]) b(.08, q.h, q.d * .8, p.metal, x, q.h / 2, 0); break;
        case 'sign': { const m = new T.Mesh(new T.PlaneGeometry(q.w, q.h), new T.MeshBasicMaterial({map: signTexture(q.text ?? '', '#efe2c4', '#2f2a24')})); m.position.y = 0; g.add(m); break; }
        case 'press': { b(q.w, q.h * .7, q.d, p.metal, 0, q.h * .35, 0); const roll = new T.Mesh(new T.CylinderGeometry(.16, .16, q.w * .9, 16), mat(p.trim)); roll.rotation.z = Math.PI / 2; roll.position.y = q.h * .82; stage.add(roll, g); b(.06, .5, .06, p.metal, q.w / 2 + .05, q.h * .8, 0); break; }
        case 'pad': {
          const base = new T.Mesh(new T.CylinderGeometry(.55, .6, .06, 28), mat(p.trim)); base.position.y = .03; stage.add(base, g);
          const ring = new T.Mesh(new T.TorusGeometry(.42, .05, 8, 28), mat(p.accent)); ring.rotation.x = Math.PI / 2; ring.position.y = .07; stage.add(ring, g);
          const glow = stage.glow(p.accent, 1.4, 0); glow.position.y = .3; g.add(glow);
          const key = Math.abs(q.z - (layout.pads?.a.z ?? 0)) < .01 ? 'a' : 'b';
          pads[key] = {press(k) { base.position.y = .03 - .025 * k; ring.material = stage.toon(k > .5 ? p.lamp : p.accent); glow.material.opacity = .55 * k; }};
          break; }
        case 'cabinet': {
          b(q.w, q.h, q.d, p.wood, 0, q.h / 2, 0); b(q.w + .1, .1, q.d + .1, p.trim, 0, q.h + .05, 0);
          const doors = [-1, 1].map(s => { const hinge = new T.Group(); hinge.position.set(s * q.w / 2, q.h / 2, -q.d / 2 - .02); g.add(hinge); const leaf = new T.Mesh(new T.BoxGeometry(q.w / 2 - .02, q.h - .12, .05), mat(p.door)); leaf.position.x = -s * (q.w / 4); stage.add(leaf, hinge); return {hinge, s}; });
          cabinet = {open(k) { for (const {hinge, s} of doors) hinge.rotation.y = s * k * 1.9; }};
          break; }
      }
    }
    return {pads, cabinet};
  }};
}
