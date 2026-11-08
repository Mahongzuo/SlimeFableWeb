import {pathDistance} from '../world/map';
import {signpost, trees, tufts} from './kit';
import type {ZoneBuilder} from './types';
import {critterField} from './critter-field';

/** Mixed woodland; repeated scenery is batched and decorative names skip collision baking. */
export const forest: ZoneBuilder = z => {
  const {T} = z, root = new T.Group();
  type Pose = [number, number, number, number, number, number, number?];
  const batch = (name: string, geometry: any, color: number, poses: Pose[]) => {
    const mesh = new T.InstancedMesh(geometry, z.toon(color), poses.length);
    mesh.name = name;
    const matrix = new T.Matrix4(), rotation = new T.Quaternion();
    poses.forEach(([x, y, zz, sx, sy, sz, yaw = 0], i) => {
      rotation.setFromEuler(new T.Euler(0, yaw, 0));
      matrix.compose(new T.Vector3(x, y, zz), rotation, new T.Vector3(sx, sy, sz));
      mesh.setMatrixAt(i, matrix);
    });
    mesh.castShadow = !/water|fx|leaf/.test(name); mesh.receiveShadow = true;
    root.add(mesh); return mesh;
  };
  const box = new T.BoxGeometry(1, 1, 1);
  const beam = (name: string, color: number, poses: Pose[]) => batch(name, box, color, poses);

  // The southern meander crosses the existing path at (-81, 101).
  const curve = new T.CatmullRomCurve3([
    [-104, 120], [-96, 117], [-90, 106], [-81, 101],
    [-72, 109], [-77, 124], [-62, 132], [-50, 130], [-40, 136],
  ].map(([x, zz]) => new T.Vector3(x, 0, zz)));
  const samples = curve.getSpacedPoints(420);
  const creekDistance = (x: number, zz: number) => Math.min(...samples.map((p: any) => Math.hypot(x - p.x, zz - p.z)));
  const vertices: number[] = [], indices: number[] = [], pebbles: Pose[] = [];
  samples.forEach((p: any, i: number) => {
    const a = samples[Math.max(0, i - 1)], b = samples[Math.min(samples.length - 1, i + 1)];
    const length = Math.hypot(b.x - a.x, b.z - a.z), nx = -(b.z - a.z) / length, nz = (b.x - a.x) / length;
    for (const side of [-1, 1]) {
      const x = p.x + nx * .72 * side, zz = p.z + nz * .72 * side;
      vertices.push(x, z.ground(x, zz) + .03, zz);
      if (i % 5 === 0 && pathDistance(x, zz) > 2.6) {
        const px = p.x + nx * (1 + z.rand() * .35) * side, pz = p.z + nz * (1 + z.rand() * .35) * side;
        pebbles.push([px, z.ground(px, pz) + .08, pz, .16 + z.rand() * .2, .12, .22, z.rand() * 6]);
      }
    }
    if (i > 0) { const k = i * 2; indices.push(k - 2, k, k - 1, k - 1, k, k + 1); }
  });
  const waterGeometry = new T.BufferGeometry();
  waterGeometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); waterGeometry.setIndex(indices); waterGeometry.computeVertexNormals();
  const water = new T.Mesh(waterGeometry, z.toon(0x4c91a0, {side: T.DoubleSide})); water.name = 'forest-water'; root.add(water);
  batch('creek-pebbles-fx', new T.IcosahedronGeometry(1, 0), 0x929185, pebbles);

  const spots: [number, number, number][] = [];
  for (let tries = 0; spots.length < 279 && tries < 6000; tries++) {
    const x = -103 + z.rand() * 70, zz = 34 + z.rand() * 104, s = 1.1 + z.rand() * .65;
    if (pathDistance(x, zz) < 3.6 || creekDistance(x, zz) < 2.8 || Math.hypot(x + 70, zz - 95) < 7) continue;
    if (spots.some(([px, pz]) => Math.hypot(px - x, pz - zz) < 2.9)) continue;
    spots.push([x, zz, s]);
  }
  const pineCount = Math.round((spots.length + 1) * .6), pines = spots.slice(0, pineCount);
  root.add(trees(z, spots.slice(pineCount), [0x386844, 0x487647, 0x527a48, 0x315c40]));
  batch('pine-trunks', new T.CylinderGeometry(.18, .28, 1, 7).translate(0, .5, 0), 0x685039,
    pines.map(([x, zz, s]) => [x, z.ground(x, zz), zz, s, s * 4.5, s]));
  for (let layer = 0; layer < 3; layer++) {
    batch(`pine-foliage-${layer}`, new T.ConeGeometry(1, 1, 7), [0x294e39, 0x315f3f, 0x3d6c44][layer],
      pines.map(([x, zz, s]) => [x, z.ground(x, zz) + (2.5 + layer * 1.05) * s, zz, (1.65 - layer * .36) * s, 2.6 * s, (1.65 - layer * .36) * s]));
  }

  const base = z.ground(-70, 95), deck = base + 4;
  batch('treehouse-trunk', new T.CylinderGeometry(.65, .95, 8.5, 9).translate(0, 4.25, 0), 0x624832, [[-70, base, 95, 1, 1, 1]]);
  batch('treehouse-foliage', new T.IcosahedronGeometry(1, 1), 0x365e3c, [[-70, base + 9, 95, 4, 2.8, 3.6]]);
  beam('treehouse-platform', 0x94704a, [[-70, deck - .16, 95, 6, .32, 5.6]]);
  beam('treehouse-supports', 0x624832, [-72.5, -67.5].flatMap(x => [92.7, 97.3].map(zz => {
    const ground = z.ground(x, zz); return [x, (ground + deck) / 2, zz, .22, deck - ground, .22] as Pose;
  })));
  // Small cabin at the back: open doorway faces the ladder and viewing deck.
  beam('treehouse-cabin', 0x80613f, [
    [-70, deck + 1.2, 97.4, 3.2, 2.4, .16], [-71.6, deck + 1.2, 96.4, .16, 2.4, 2],
    [-68.4, deck + 1.2, 96.4, .16, 2.4, 2], [-71.15, deck + 1.2, 95.4, .9, 2.4, .16],
    [-68.85, deck + 1.2, 95.4, .9, 2.4, .16], [-70, deck + 2.2, 95.4, 1.4, .4, .16],
    [-70, deck + 2.5, 96.4, 3.7, .24, 2.6],
  ]);
  const railing: Pose[] = [];
  for (const x of [-72.85, -67.15]) {
    railing.push([x, deck + .85, 95, .12, .12, 5.5]);
    for (const zz of [92.3, 95, 97.7]) railing.push([x, deck + .45, zz, .13, .9, .13]);
  }
  for (const x of [-72, -68]) railing.push([x, deck + .85, 92.3, 1.7, .12, .12]);
  railing.push([-70, deck + .85, 97.7, 5.7, .12, .12]);
  beam('treehouse-railing', 0xa18154, railing);
  const ladderBase = z.ground(-70, 92), ladderHeight = deck - ladderBase;
  beam('treehouse-ladder-rails', 0x6c5035, [-70.55, -69.45].map(x => [x, ladderBase + (ladderHeight + .8) / 2, 92, .14, ladderHeight + .8, .18]));
  const rungs: Pose[] = [];
  for (let h = .2; h < ladderHeight + .1; h += .3) rungs.push([-70, ladderBase + h, 91.9, 1.15, .12, .28]);
  beam('treehouse-ladder-rungs', 0xaf8858, rungs);
  z.interact({id: 'forest-treehouse', position: [-70, deck + .25, 93.5], radius: 2, prompt: () => ({title: '树屋', sub: '夜里能看到萤火虫'}), act: () => {}});

  // Low stepped planks follow the path's slope; the full walking width stays open.
  const bridge: Pose[] = [], bridgeYaw = Math.atan2(-1, 3);
  for (let i = 0; i <= 20; i++) {
    const t = -4 + i * .4, x = -81 - t / Math.sqrt(10), zz = 101 + 3 * t / Math.sqrt(10);
    bridge.push([x, z.ground(x, zz) + .12, zz, 4.8, .18, .43, bridgeYaw]);
  }
  beam('creek-bridge-planks', 0x99734c, bridge);

  const clear = (x: number, zz: number, radius: number) => pathDistance(x, zz) > 3 + radius && creekDistance(x, zz) > 1.5 + radius && Math.hypot(x + 70, zz - 95) > 7 + radius && spots.every(([tx, tz]) => Math.hypot(tx - x, tz - zz) > radius + .6);
  const used: [number, number, number][] = [];
  const scatter = (count: number, radius: number, place: (x: number, zz: number) => void) => {
    for (let tries = 0, n = 0; n < count && tries < 20000; tries++) {
      const x = -102 + radius + z.rand() * (68 - radius * 2), zz = 35 + radius + z.rand() * (103 - radius * 2);
      if (!clear(x, zz, radius) || used.some(([px, pz, r]) => Math.hypot(px - x, pz - zz) < r + radius)) continue;
      used.push([x, zz, radius]); place(x, zz); n++;
    }
  };
  const logs: Pose[] = [], ends: Pose[] = [], stumps: Pose[] = [], leaves: Pose[] = [], stems: Pose[] = [], caps: Pose[] = [];
  scatter(6, 2.3, (x, zz) => {
    const yaw = z.rand() * Math.PI, y = Math.max(z.ground(x, zz), z.ground(x + Math.cos(yaw) * 2, zz - Math.sin(yaw) * 2), z.ground(x - Math.cos(yaw) * 2, zz + Math.sin(yaw) * 2)) + .38;
    logs.push([x, y, zz, 1, 1, 1, yaw]);
    for (const sign of [-1, 1]) ends.push([x + Math.cos(yaw) * 2.01 * sign, y, zz - Math.sin(yaw) * 2.01 * sign, 1, 1, 1, yaw]);
  });
  batch('fallen-logs', new T.CylinderGeometry(.38, .48, 4, 9).rotateZ(Math.PI / 2), 0x60462f, logs);
  batch('log-end-grain', new T.CylinderGeometry(.33, .33, .025, 9).rotateZ(Math.PI / 2), 0xbd9966, ends);
  scatter(10, .65, (x, zz) => stumps.push([x, z.ground(x, zz) + .3, zz, 1, 1, 1, z.rand() * 6]));
  batch('forest-stumps', new T.CylinderGeometry(.42, .58, .6, 8), 0x8c6944, stumps);
  scatter(3, 1.9, (x, zz) => {
    for (let i = 0; i < 11; i++) {
      const a = i * Math.PI * 2 / 11, px = x + Math.cos(a) * 1.55, pz = zz + Math.sin(a) * 1.55, y = z.ground(px, pz), s = .75 + z.rand() * .5;
      stems.push([px, y + .14 * s, pz, s, s, s]); caps.push([px, y + .29 * s, pz, s, s, s]);
    }
  });
  batch('mushroom-stems-fx', new T.CylinderGeometry(.045, .065, .28, 6), 0xe4d6af, stems);
  batch('mushroom-caps-fx', new T.SphereGeometry(.19, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0xb87a49, caps);
  scatter(40, .4, (x, zz) => leaves.push([x, z.ground(x, zz) + .06, zz, .6 + z.rand() * .5, .12, .4 + z.rand() * .4, z.rand() * 6]));
  batch('forest-leaf-piles', new T.IcosahedronGeometry(1, 0), 0x877340, leaves);
  root.add(signpost(z, -33, 53, -Math.PI / 2, '松果林', '轻手轻脚，小动物会躲'));
  root.add(tufts(z, 7000, {min: [-105, 31], max: [-31, 141]}, (x, zz) => pathDistance(x, zz) < 2.4 || creekDistance(x, zz) < 1, [0x5c814c, 0xa69a56, 0xc98fb8, 0xe3dcc0]));
  const homes: [number, number][] = [];
  for (let i = 0; i < 28; i++) { const x = -100 + z.rand() * 64, zz = 36 + z.rand() * 100; homes.push([x, zz]); }
  return {root, update: critterField(z, root, 'forest', homes)};
};
