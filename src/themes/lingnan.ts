import * as THREE from 'three';
import type {ThemeKit} from './kit';
import {plainKit} from './plain';
import {trees, tufts, windy} from '../zones/kit';
import type {ZoneContext} from '../zones/types';
import {rng} from '../templates/random';

const baseKit = plainKit('lingnan-1866',
  {skyTop: '#a9cfe6', skyHorizon: '#f2ead6', fog: [28, 95], sun: '#fff0d0', sunIntensity: 2.7, hemiSky: '#e3f0e8', hemiGround: '#9c8f72', ink: '#2c2620', wash: '#f4ecdc'},
  {ground: '#b9a986', lane: '#c4b08a', plaza: '#cbbd9a', yard: '#a9b07f', walls: ['#8d9294', '#9a9d98', '#848a8c', '#a3a39a'], roof: '#4d5050', trim: '#d9d2c2', door: '#5a3a26', glass: '#3f4a46', wood: '#8a6a48', metal: '#4a4744', brick: '#7f8587', accent: '#b8483a', lamp: '#f2c46a'});

/** Decorations only: plainKit retains ownership of layout and interactive handles. */
export const lingnanKit: ThemeKit = {
  id: baseKit.id,
  look: baseKit.look,
  build(stage, layout, spec) {
    const handles = baseKit.build(stage, layout, spec);
    const root = new THREE.Group(); root.name = 'lingnan-details'; stage.add(root);
    const random = rng(layout.seed + ':lingnan');
    // The shared vegetation builders only use these context fields; time follows Stage.
    const zone = {
      T: THREE, ground: () => 0, rand: () => random.next(),
      toon: (color: number, opts = {}) => stage.toon(color, opts).clone(),
      ctx: {U: {uTime: {get value() { return stage.time; }}, uWind: {value: .45}}},
    } as unknown as ZoneContext;
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const poleGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
    const ballGeo = new THREE.SphereGeometry(1, 12, 8);
    const ringGeo = new THREE.TorusGeometry(1, .07, 6, 24);
    const batches = new Map<string, {geometry: THREE.BufferGeometry; color: string; matrices: THREE.Matrix4[]; wind: boolean}>();
    const transform = new THREE.Object3D();
    const put = (name: string, geometry: THREE.BufferGeometry, color: string,
      x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, wind = false) => {
      let batch = batches.get(name);
      if (!batch) { batch = {geometry, color, matrices: [], wind}; batches.set(name, batch); }
      transform.position.set(x, y, z); transform.scale.set(sx, sy, sz); transform.rotation.set(rx, ry, rz);
      transform.updateMatrix(); batch.matrices.push(transform.matrix.clone());
    };
    const beam = (name: string, color: string, a: THREE.Vector3, b: THREE.Vector3, radius: number) => {
      const mid = a.clone().add(b).multiplyScalar(.5);
      const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
      put(name, poleGeo, color, mid.x, mid.y, mid.z, radius, a.distanceTo(b), radius, rotation.x, rotation.y, rotation.z);
    };
    // A thick wall with two raised wok-handle lobes. A matching ribbon makes the grey stucco coping.
    const profile = new THREE.CurvePath<THREE.Vector2>();
    profile.add(new THREE.CubicBezierCurve(new THREE.Vector2(-.5, .06), new THREE.Vector2(-.48, 1.45), new THREE.Vector2(-.25, 1.68), new THREE.Vector2(-.17, .86)));
    profile.add(new THREE.CubicBezierCurve(new THREE.Vector2(-.17, .86), new THREE.Vector2(-.07, .78), new THREE.Vector2(.07, .78), new THREE.Vector2(.17, .86)));
    profile.add(new THREE.CubicBezierCurve(new THREE.Vector2(.17, .86), new THREE.Vector2(.25, 1.68), new THREE.Vector2(.48, 1.45), new THREE.Vector2(.5, .06)));
    const points = profile.getPoints(24);
    const wallShape = new THREE.Shape(); wallShape.moveTo(-.5, -.12);
    for (const p of points) wallShape.lineTo(p.x, p.y);
    wallShape.lineTo(.5, -.12); wallShape.closePath();
    const copingShape = new THREE.Shape(points);
    for (const p of [...points].reverse()) copingShape.lineTo(p.x, p.y + .055);
    copingShape.closePath();
    const extrude = (shape: THREE.Shape, depth: number) => {
      const g = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: false});
      g.translate(0, 0, -depth / 2); g.rotateY(Math.PI / 2); return g;
    };
    const wallGeo = extrude(wallShape, .24), copingGeo = extrude(copingShape, .30);
    const jarGeo = new THREE.LatheGeometry([
      new THREE.Vector2(.24, 0), new THREE.Vector2(.34, .08), new THREE.Vector2(.41, .4),
      new THREE.Vector2(.34, .7), new THREE.Vector2(.29, .74), new THREE.Vector2(.25, .72),
      new THREE.Vector2(.29, .61), new THREE.Vector2(.33, .4), new THREE.Vector2(.22, .1),
    ], 18);
    let doorIndex = 0;
    for (const lot of layout.lots) {
      if (!lot.door) continue;
      const w = lot.max[0] - lot.min[0], d = lot.max[1] - lot.min[1];
      const cx = (lot.min[0] + lot.max[0]) / 2, cz = (lot.min[1] + lot.max[1]) / 2;
      const rise = lot.roof === 'gable' ? Math.min(d * .32, 1.9) : .35;
      for (const side of [-1, 1]) {
        const x = cx + side * (w / 2 - .08);
        put('wok-ear-brick', wallGeo, '#7f888b', x, lot.height, cz, 1, Math.max(1.65, rise + .2), d + .4);
        put('wok-ear-stucco', copingGeo, '#c7c6b8', x, lot.height, cz, 1, Math.max(1.65, rise + .2), d + .4);
      }
      put('dragon-boat-ridge', boxGeo, '#91968f', cx, lot.height + rise + .14, cz, w, .28, .23);
      for (const side of [-1, 1]) {
        put('ridge-upturn', boxGeo, '#c7c6b8', cx + side * (w / 2 - .3), lot.height + rise + .35, cz, .65, .18, .23, 0, 0, side * .6);
      }
      const half = d / 2 + .35, slope = lot.roof === 'gable' ? rise : 0;
      for (let x = lot.min[0] + .15; x < lot.max[0]; x += .24) for (const side of [-1, 1]) {
        put('grey-tile-rolls', poleGeo, '#626967', x, lot.height + slope / 2 + .065, cz + side * half / 2,
          .045, Math.hypot(half, slope), .045, -side * Math.atan2(half, slope));
      }
      const {x, z, facing} = lot.door, f = facing[2], face = z + f * .17;
      for (let k = 0; k < 8; k++) put('sliding-door-bars', boxGeo, '#805b38', x - .49 + k * .14, 1.02, face, .045, 1.9, .07);
      for (const y of [.12, 1.95]) put('sliding-door-rails', boxGeo, '#5a3a26', x, y, face, 1.35, .10, .10);
      for (const side of [-1, 1]) put('red-door-paper', boxGeo, '#b8483a', x + side * .69, 1.15, face, .14, 2.02, .035);
      put('red-door-paper', boxGeo, '#b8483a', x, 2.31, z + f * .19, 1.32, .16, .035);
      put('household-water-jar', jarGeo, '#685548', x + Math.min(w / 2 - .5, 1.25), .02, z + f * .55);
      if (doorIndex++ % 3 === 2) {
        const lx = x - 1, lz = z + f * .48;
        put('lantern-bracket', boxGeo, '#5a3a26', lx, 2.95, z + f * .25, .07, .07, .55);
        put('lantern-cord', poleGeo, '#805b38', lx, 2.8, lz, .02, .3, .02);
        put('red-lantern', ballGeo, '#b8483a', lx, 2.48, lz, .24, .30, .24);
        for (const y of [2.18, 2.78]) put('lantern-caps', poleGeo, '#ad8952', lx, y, lz, .12, .07, .12);
        put('lantern-tassel-fx', poleGeo, '#b8483a', lx, 2.04, lz, .025, .23, .025);
      }
    }

    // Yard props anchor woven trays and cages without moving any existing prop or target.
    const yardProps = layout.props.filter(p => p.kind === 'crate' || p.kind === 'barrel').slice(0, 3);
    for (const p of yardProps) {
      put('grain-tray-rim', ringGeo, '#ae8e57', p.x, p.y + p.h + .06, p.z, .48, .48, .65, Math.PI / 2);
      put('drying-grain', poleGeo, '#c9ac60', p.x, p.y + p.h + .045, p.z, .45, .035, .45);
      for (let k = -3; k <= 3; k++) put('tray-weave', boxGeo, '#a68952', p.x + k * .1, p.y + p.h + .07, p.z, .018, .015, Math.sqrt(.45 ** 2 - (k * .1) ** 2) * 2);
    }
    const [x0, z0] = layout.bounds.min, [x1, z1] = layout.bounds.max;
    for (const lot of layout.lots.filter(l => l.door).slice(0, 4)) {
      const side = lot.door!.facing[2] > 0 ? -1 : 1;
      const z = side > 0 ? lot.max[1] + .3 : lot.min[1] - .3;
      for (let x = lot.min[0] + .3; x < lot.max[0] - .3; x += .23) put('yard-bamboo-fence', poleGeo, '#a99461', x, .42, z, .035, .84, .035);
      for (const y of [.22, .65]) put('yard-fence-rails', boxGeo, '#8a794f', (lot.min[0] + lot.max[0]) / 2, y, z, lot.max[0] - lot.min[0] - .6, .055, .055);
    }
    const anchor = yardProps[0];
    const cageX = anchor ? anchor.x + 1 : x1 - 3, cageZ = anchor ? anchor.z : z0 + 3;
    for (const y of [.06, .3, .54]) put('chicken-cage-hoops', ringGeo, '#a99461', cageX, y, cageZ, .45 - y * .25, .45 - y * .25, .4, Math.PI / 2);
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      beam('chicken-cage-ribs', '#a99461', new THREE.Vector3(cageX + Math.cos(a) * .44, .02, cageZ + Math.sin(a) * .44), new THREE.Vector3(cageX + Math.cos(a) * .30, .59, cageZ + Math.sin(a) * .30), .018);
    }
    for (let i = 0; i < 3; i++) {
      const x = cageX - .7 + i * .55, z = cageZ - .65 - (i % 2) * .3;
      put('chicken-body-fx', ballGeo, '#ceae70', x, .22, z, .17, .18, .23);
      put('chicken-head-fx', ballGeo, '#ceae70', x, .43, z - .14, .10, .11, .1);
      put('chicken-beak-fx', boxGeo, '#bd7b3c', x, .43, z - .25, .065, .045, .10);
      for (const s of [-1, 1]) put('chicken-legs-fx', poleGeo, '#bd7b3c', x + s * .065, .06, z, .015, .12, .015);
    }

    // The left plaza has open space beside its bench, away from the central route.
    const bench = layout.props.find(p => p.kind === 'bench');
    const tx = bench ? bench.x - 1.9 : x0 + 1.6, tz = bench ? bench.z + .4 : 0;
    stage.add(trees(zone, [[tx, tz, 1.65]], [0x59794e, 0x648554, 0x527347]), root);
    put('banyan-trunk', poleGeo, '#79664d', tx, 1.8, tz, .48, 3.6, .48);
    for (let i = 0; i < 16; i++) {
      const a = i * 2.4, r = .75 + (i % 4) * .36, h = 1.5 + (i % 3) * .55;
      put('banyan-aerial-roots-fx', poleGeo, '#8c7957', tx + Math.cos(a) * r, 3.6 - h / 2, tz + Math.sin(a) * r, .025, h, .025);
    }
    const wx = x1 - 3.6, wz = (z0 + z1) / 2 + 5;
    // Open masonry ring: no solid cylinder or flat water disk sealing the well mouth.
    for (let row = 0; row < 3; row++) for (let i = 0; i < 12; i++) {
      const a = (i + row % 2 * .5) * Math.PI / 6;
      put('well-masonry', boxGeo, '#93968a', wx + Math.cos(a) * .63, .13 + row * .23, wz + Math.sin(a) * .63, .35, .22, .22, 0, -a - Math.PI / 2);
    }
    for (const s of [-1, 1]) put('well-frame', boxGeo, '#70563c', wx + s * .9, 1.1, wz, .15, 2.2, .15);
    put('well-crossbar', boxGeo, '#70563c', wx, 2.16, wz, 2.1, .16, .16);
    put('well-rope', poleGeo, '#a99461', wx, 1.35, wz, .025, 1.5, .025);
    put('well-bucket', jarGeo, '#8a6a48', wx + 1.15, .02, wz, .65, .65, .65);

    for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
      const x = x0 + (x1 - x0) * (i + .5) / 6, z = (side < 0 ? z0 : z1) + side * (3.2 + i % 2);
      put('rice-terrace-grass', boxGeo, '#969b62', x, .12, z, (x1 - x0) / 6 - .35, .24, 4);
      put('rice-terrace-earth-fx', boxGeo, '#a59770', x, .02, z, (x1 - x0) / 6, .22, 4.3);

    }
    for (const side of [-1, 1]) {
      const z = side < 0 ? z0 - 3.7 : z1 + 3.7;
      stage.add(tufts(zone, 330, {min: [x0, z - 1.4], max: [x1, z + 1.4]}, () => false, [0xa4b56d]), root);
    }
    for (const x of [x0 - 2, x1 + 2]) for (const z of [z0 - 1, 0, z1 + 1]) for (let i = 0; i < 5; i++) {
      const bx = x + Math.sin(i * 2.4) * .6, bz = z + Math.cos(i * 2.4) * .6, h = 2.6 + i * .28;
      put('bamboo-stalk-grass', poleGeo, '#71865a', bx, h / 2, bz, .055, h, .055);
      for (let k = 1; k < 5; k++) {
        put('bamboo-nodes-grass', poleGeo, '#a2ad76', bx, k * h / 5, bz, .065, .05, .065);
        put('bamboo-leaf', ballGeo, '#638054', bx + Math.sin(k * 2) * .32, h * .45 + k * .32, bz, .6, .12, .20, 0, k * 1.8, .4, true);
      }
    }
    // One draw call per repeated geometry/material, independent of house count.
    for (const [name, batch] of batches) {
      const material = stage.toon(batch.color).clone();
      if (batch.wind) windy(zone, material, .035);
      const mesh = new THREE.InstancedMesh(batch.geometry, material, batch.matrices.length); mesh.name = name;
      batch.matrices.forEach((matrix, i) => {
        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(i, new THREE.Color().setScalar(.95 + random.next() * .1));
      });
      if (/grass|leaf|fx/.test(name)) mesh.userData.walkThrough = true;
      stage.add(mesh, root);
    }
    return handles;
  },
};
