import * as THREE from 'three';
import type {ThemeKit} from './kit';
import {plainKit} from './plain';

const baseKit = plainKit('minguo-shanghai',
    {skyTop: '#bcd6e2', skyHorizon: '#efe6d2', fog: [26, 90], sun: '#fff1d6', sunIntensity: 2.6, hemiSky: '#e6eef2', hemiGround: '#a69a86', ink: '#2c2620', wash: '#f4ecdc'},
    {ground: '#b8ad98', lane: '#a9a395', plaza: '#c9bea6', yard: '#bfb39b', walls: ['#a7a59c', '#b9b1a1', '#9aa09b', '#c2b59c'], roof: '#4a4a4f', trim: '#e5dccb', door: '#4b2c22', glass: '#3c4b55', wood: '#a98458', metal: '#4a4744', brick: '#8f6b5c', accent: '#b8483a', lamp: '#f2c46a'});

/** Decorative only: the base kit owns all interactive handles and layout geometry. */
export const minguoKit: ThemeKit = {
  id: baseKit.id,
  look: baseKit.look,
  build(stage, layout, spec) {
    const handles = baseKit.build(stage, layout, spec);
    const root = new THREE.Group();
    root.name = 'minguo-details';
    stage.add(root);
    const stone = stage.toon('#d7d4c9');
    const wood = stage.toon('#4b2c22');
    const roof = stage.toon('#4a4a4f');
    const bamboo = stage.toon('#a98458');
    const red = stage.toon('#b8483a');
    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    const mesh = (geometry, material, x: number, y: number, z: number, parent = root) => {
      const m = new THREE.Mesh(geometry, material);
      m.position.set(x, y, z);
      stage.add(m, parent);
      return m;
    };
    const box = (w: number, h: number, d: number, material, x: number, y: number, z: number, parent = root) => {
      const m = mesh(unitBox, material, x, y, z, parent);
      m.scale.set(w, h, d);
      return m;
    };
    const triangle = new THREE.Shape();
    triangle.moveTo(-.94, 0); triangle.lineTo(.94, 0); triangle.lineTo(0, .5); triangle.closePath();
    const pediment = new THREE.ExtrudeGeometry(triangle, {depth: .24, bevelEnabled: false});
    pediment.translate(0, 0, -.12);

    // Frame and separated slats share one geometry/draw call per shutter leaf.
    const parts: THREE.Shape[] = [];
    const rectangle = (x: number, y: number, w: number, h: number) => {
      const s = new THREE.Shape();
      s.moveTo(x, y); s.lineTo(x + w, y); s.lineTo(x + w, y + h); s.lineTo(x, y + h); s.closePath();
      parts.push(s);
    };
    rectangle(0, -.49, .045, .98); rectangle(.375, -.49, .045, .98);
    for (let i = 0; i < 8; i++) rectangle(.045, -.49 + i * .125, .33, .085);
    const shutter = new THREE.ExtrudeGeometry(parts, {depth: .045, bevelEnabled: false});
    shutter.translate(0, 0, -.0225);
    const lanternBody = new THREE.SphereGeometry(.23, 12, 8);
    const lanternCap = new THREE.CylinderGeometry(.11, .11, .08, 8);
    let doorIndex = 0;
    for (const lot of layout.lots) {
      const w = lot.max[0] - lot.min[0], d = lot.max[1] - lot.min[1];
      const cx = (lot.min[0] + lot.max[0]) / 2, cz = (lot.min[1] + lot.max[1]) / 2;
      const group = new THREE.Group(); group.name = `minguo-${lot.id}`; stage.add(group, root);
      if (lot.roof === 'gable') {
        // Match plainKit's X-axis gable, including its roof rise and overhang.
        const rise = Math.min(d * .32, 1.9);
        box(w + .8, .13, .16, roof, cx, lot.height + rise + .055, cz, group);
        const fireWall = new THREE.Shape();
        fireWall.moveTo(-d * .3, rise * .4);
        fireWall.lineTo(0, rise); fireWall.lineTo(d * .3, rise * .4);
        fireWall.lineTo(d * .3, rise * .4 + .28); fireWall.lineTo(0, rise + .28);
        fireWall.lineTo(-d * .3, rise * .4 + .28); fireWall.closePath();
        const geometry = new THREE.ExtrudeGeometry(fireWall, {depth: .2, bevelEnabled: false});
        geometry.translate(0, 0, -.1); geometry.rotateY(Math.PI / 2);
        mesh(geometry, stone, lot.min[0] - .08, lot.height, cz, group);
      }
      if (!lot.door) continue;
      const {x, z, facing} = lot.door, f = facing[2];
      const face = z + f * .16;
      for (const s of [-1, 1]) box(.24, 2.4, .3, stone, x + s * .73, 1.2, face, group);
      box(1.88, .22, .34, stone, x, 2.46, face, group);
      mesh(pediment, stone, x, 2.57, face, group);
      const window = (wx: number, y: number) => {
        for (const s of [-1, 1]) {
          const leaf = mesh(shutter, wood, wx + s * .46, y, z + f * .13, group);
          leaf.scale.x = s;
          leaf.rotation.y = -s * f * Math.PI / 12;
        }
      };
      for (const y of lot.height > 4.6 ? [1.75, 3.6] : [1.75]) {
        for (const dx of [-w / 2 + .9, w / 2 - .9]) if (Math.abs(dx) > .9) window(x + dx, y);
      }
      if (lot.height > 4.6) window(x, 3.6);
      if (doorIndex++ % 3 === 0) {
        const lx = x + .98, lz = z + f * .48;
        box(.07, .07, .5, wood, lx, 2.95, z + f * .25, group);
        box(.025, .16, .025, wood, lx, 2.85, lz, group);
        const body = mesh(lanternBody, red, lx, 2.52, lz, group); body.scale.y = 1.15;
        for (const y of [2.23, 2.81]) mesh(lanternCap, wood, lx, y, lz, group);
      }
    }

    // One pole per right-hand alley; ignore wall seams and the main street.
    const clothGeometry = new THREE.PlaneGeometry(1, 1);
    const clothMaterials = ['#e5dccb', '#9aa09b', '#b9b1a1'].map(c => stage.toon(c, {side: THREE.DoubleSide}));
    for (const left of layout.lots) {
      if (!left.door || left.height < 3.8) continue;
      const right = layout.lots.filter(l => l !== left && l.door && l.height >= 3.8
        && l.min[0] >= left.max[0] && l.door.facing[2] === left.door!.facing[2]
        && Math.min(l.max[1], left.max[1]) - Math.max(l.min[1], left.min[1]) > 1)
        .sort((a, b) => a.min[0] - b.min[0])[0];
      if (!right) continue;
      const gap = right.min[0] - left.max[0];
      if (gap < 1.2 || gap > 7) continue;
      const x = (left.max[0] + right.min[0]) / 2;
      const z = (Math.max(left.min[1], right.min[1]) + Math.min(left.max[1], right.max[1])) / 2;
      const group = new THREE.Group(); group.name = `laundry-${left.id}`; stage.add(group, root);
      const pole = mesh(new THREE.CylinderGeometry(.035, .045, gap + .24, 8), bamboo, x, 3.6, z, group);
      pole.rotation.z = Math.PI / 2;
      const count = gap > 2.5 ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const height = .65 + (i % 2) * .22;
        const cloth = mesh(clothGeometry, clothMaterials[i], left.max[0] + gap * (i + 1) / (count + 1), 3.58 - height / 2, z, group);
        cloth.scale.set(Math.min(.65, gap / (count + 1) * .8), height, 1);
        cloth.rotation.y = (i - 1) * .08;
        cloth.castShadow = false;
      }
    }
    // Give existing shop signs a wooden surround, following their local transform.
    for (const prop of layout.props) {
      if (prop.kind !== 'sign') continue;
      const group = new THREE.Group(); group.name = `sign-frame-${prop.id}`;
      group.position.set(prop.x, prop.y, prop.z); group.rotation.y = prop.rot; stage.add(group, root);
      for (const s of [-1, 1]) {
        box(prop.w + .12, .06, .08, wood, 0, s * (prop.h / 2 + .03), 0, group);
        box(.06, prop.h, .08, wood, s * (prop.w / 2 + .03), 0, 0, group);
      }
    }
    return handles;
  },
};
