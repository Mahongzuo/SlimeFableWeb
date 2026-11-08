import {LAKE, pathDistance, lakeEdge} from '../world/map';
import {signpost, trees} from './kit';
import type {ZoneBuilder} from './types';
import {lakeWater} from './lake-water';
import {critterField} from './critter-field';
import {fishingSpot} from './fishing-spot';

/** Quiet mountain lake: solid resting places and walk-through water details. */
export const lake: ZoneBuilder = z => {
  const {T} = z, root = new T.Group(), [cx, cz] = LAKE.center;
  type Part = [number, number, number, number, number, number, number?, number?];
  // One draw mesh per repeated shape; optional yaw and roll also cover fallen timber.
  const instances = (name: string, geometry: any, color: number, parts: Part[], palette?: number[]) => {
    const mesh = new T.InstancedMesh(geometry, z.toon(color), parts.length);
    mesh.name = name;
    const dummy = new T.Object3D();
    parts.forEach(([x, y, zz, sx, sy, sz, yaw = 0, roll = 0], i) => {
      dummy.position.set(x, y, zz); dummy.scale.set(sx, sy, sz); dummy.rotation.set(0, yaw, roll);
      dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      if (palette) mesh.setColorAt(i, new T.Color(palette[i % palette.length]));
    });
    mesh.castShadow = mesh.receiveShadow = !/water|leaf|flower|fx/.test(name);
    root.add(mesh); return mesh;
  };
  const box = new T.BoxGeometry(1, 1, 1);
  const waterGeometry = new T.CircleGeometry(1, 96).rotateX(-Math.PI / 2);
  const colors: number[] = [], deep = new T.Color(0x287c89), shallow = new T.Color(0x91d0b9);
  const vertices = waterGeometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const color = deep.clone().lerp(shallow, Math.hypot(vertices.getX(i), vertices.getZ(i)));
    colors.push(color.r, color.g, color.b);
  }
  waterGeometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  const water = new T.Mesh(waterGeometry, z.toon(0xffffff, {vertexColors: true, transparent: true, opacity: .88, depthWrite: false}));
  water.name = 'lake-water'; water.scale.set(LAKE.rx * 1.08, 1, LAKE.rz * 1.08);
  water.position.set(cx, LAKE.level, cz);
  // mirror water from the harbour's sea shader; the flat toon disc stays only as a fallback
  const mirror = lakeWater(z.ctx); if (mirror) root.add(mirror.mesh); else root.add(water);

  const foam = new T.Mesh(new T.RingGeometry(1.045, 1.065, 96).rotateX(-Math.PI / 2), z.toon(0xd7eee0, {transparent: true, opacity: .48, depthWrite: false}));
  foam.name = 'water-shore-foam-fx'; foam.scale.set(LAKE.rx, 1, LAKE.rz); foam.position.set(cx, LAKE.level + .015, cz); if (!mirror) root.add(foam);
  const leaves: Part[] = [[-10, 0, 105, .65, 1, .55], [-11.4, 0, 106, .48, 1, .5], [-9, 0, 106.6, .55, 1, .45], [15, 0, 119, .7, 1, .6], [16.2, 0, 120.3, .55, 1, .5], [14.1, 0, 121, .45, 1, .4], [-4, 0, 126, .65, 1, .5]];
  const lilies = new T.Group(); lilies.name = 'water-leaf-flowers'; root.add(lilies);
  const leaf = instances('water-lotus-leaf', new T.CircleGeometry(1, 18, .15, Math.PI * 2 - .3).rotateX(-Math.PI / 2), 0xffffff,
    leaves.map(([x, , zz, sx, sy, sz], i) => [x, LAKE.level + .04, zz, sx, sy, sz, i * 1.7]), [0x568d65, 0x73a66c, 0x86b678]);
  lilies.add(leaf);
  const petals: Part[] = [], hearts: Part[] = [];
  for (const index of [0, 3, 6]) {
    const [x, , zz] = leaves[index];
    hearts.push([x, LAKE.level + .17, zz, .1, .08, .1]);
    for (let k = 0; k < 7; k++) {
      const a = k * Math.PI * 2 / 7;
      petals.push([x + Math.sin(a) * .14, LAKE.level + .13, zz + Math.cos(a) * .14, .11, .07, .23, a]);
    }
  }
  lilies.add(instances('lotus-flower-petals', new T.SphereGeometry(1, 8, 6), 0xffffff, petals, [0xf2b2bc, 0xffd6cd]));
  lilies.add(instances('lotus-flower-hearts', new T.SphereGeometry(1, 8, 6), 0xf3cf76, hearts));

  // Original footprint: x ±1.1, z 96.5..108.5; deck top is y=0.1.
  const deckY = LAKE.level + .55, pierStart = cz - LAKE.rz - 1.5;
  instances('pier-deck-planks', box, 0xffffff, Array.from({length: 30}, (_, i) => [cx, deckY - .09, pierStart + .2 + i * .4, 2.2, .18, .38]), [0xa27a51, 0xb18a60, 0x96704c, 0xbf986c]);
  const supports: Part[] = [], rails: Part[] = [];
  for (const dx of [-1, 1]) {
    for (let k = 0; k < 5; k++) supports.push([cx + dx * 1.05, deckY - .9, cz - LAKE.rz - 1 + k * 2.8, .11, 2.2, .11]);
    for (let k = 0; k < 4; k++) rails.push([cx + dx, deckY + .48, pierStart + k * 2, .1, .96, .1]);
    for (const h of [.43, .88]) rails.push([cx + dx, deckY + h, pierStart + 3, .09, .09, 6]);
  }
  instances('pier-supports', new T.CylinderGeometry(1, 1, 1, 6), 0x78583e, supports);
  instances('pier-half-railings', box, 0x96734e, rails);
  instances('pier-lantern-frame', box, 0x654b37, [[cx + .92, deckY + 1.15, 107.7, .12, 2.3, .12], [cx + .63, deckY + 2.25, 107.7, .7, .1, .12], [cx + .4, deckY + 2.02, 107.7, .035, .4, .035], [cx + .4, deckY + 1.8, 107.7, .4, .07, .4], [cx + .4, deckY + 1.37, 107.7, .36, .07, .36]]);
  const lamp = new T.Mesh(new T.BoxGeometry(.28, .36, .28), z.toon(0xffdf97, {emissive: 0xffba61, emissiveIntensity: .45}));
  lamp.name = 'pier-lantern-glow-fx'; lamp.position.set(cx + .4, deckY + 1.59, 107.7); root.add(lamp);
  instances('pier-fish-barrel', new T.CylinderGeometry(.34, .29, .65, 12, 1, true), 0x96704c, [[cx - .66, deckY + .325, 107.65, 1, 1, 1]]);
  instances('pier-barrel-hoops', new T.TorusGeometry(.32, .025, 4, 12).rotateX(Math.PI / 2), 0x565e58, [[cx - .66, deckY + .12, 107.65, 1, 1, 1], [cx - .66, deckY + .55, 107.65, 1, 1, 1]]);
  instances('pier-barrel-water', new T.CircleGeometry(.29, 12).rotateX(-Math.PI / 2), 0x548d8a, [[cx - .66, deckY + .4, 107.65, 1, 1, 1]]);
  const fish = fishingSpot(z, 'fish-pier', [cx, deckY, cz - LAKE.rz + 10], [0, 1], 'lake');
  root.add(signpost(z, cx + 3.5, cz - LAKE.rz - 4, Math.PI, '镜湖', '码头尽头可以钓鱼'));

  const eastX = cx + LAKE.rx * 1.15, westX = cx - LAKE.rx * 1.15;
  const eastY = z.ground(eastX, cz), westY = z.ground(westX, cz);
  instances('east-fishing-flat-rock', new T.CylinderGeometry(1, 1.2, 1, 7), 0x87978d, [[eastX, eastY + .25, cz, 1.35, .7, 1.15]]);
  instances('west-fallen-log', new T.CylinderGeometry(.35, .42, 3.6, 9), 0x806046, [[westX - .8, z.ground(westX - .8, cz + 2) + .38, cz + 2, 1, 1, 1, .3, Math.PI / 2]]);
  const fishEast = fishingSpot(z, 'fish-east', [eastX, eastY + .6, cz], [-1, 0], 'lake');
  const fishWest = fishingSpot(z, 'fish-west', [westX, westY, cz], [1, 0], 'lake');
  root.add(signpost(z, eastX, cz - 2.3, -Math.PI / 2, '听水石', '静候鱼来'));
  root.add(signpost(z, westX - .5, cz - 2.3, Math.PI / 2, '枕木湾', '湖畔垂钓'));

  const reeds: Part[] = [], tips: Part[] = [], rocks: Part[] = [], pebbles: Part[] = [];
  for (let clump = 0; clump < 6; clump++) {
    const a = [.35, .95, 1.95, 2.65, 3.6, 5.65][clump];
    const x = cx + Math.cos(a) * LAKE.rx * 1.08, zz = cz + Math.sin(a) * LAKE.rz * 1.08;
    for (let k = 0; k < 12; k++) {
      const b = k * 2.4, px = x + Math.cos(b) * .55, pz = zz + Math.sin(b) * .45, h = .7 + (k % 4) * .17, y = z.ground(px, pz);
      reeds.push([px, y + h / 2, pz, .035, h, .035]); tips.push([px, y + h, pz, .07, .22, .07]);
    }
  }
  instances('shore-grass-reeds', new T.CylinderGeometry(.5, 1, 1, 5), 0x7e995f, reeds);
  instances('shore-grass-seedheads', new T.CylinderGeometry(1, 1, 1, 6), 0x9b7951, tips);
  for (let i = 0; i < 18; i++) {
    const a = i * Math.PI * 2 / 18, x = cx + Math.cos(a) * LAKE.rx * 1.23, zz = cz + Math.sin(a) * LAKE.rz * 1.23;
    if (pathDistance(x, zz) < 3 || Math.abs(x - cx) < 4 && zz > cz || Math.abs(zz - cz) < 3) continue;
    const s = .45 + (i % 3) * .3;
    rocks.push([x, z.ground(x, zz) + s * .3, zz, s, s * .65, s * .8, a]);
    for (let k = 0; k < 3; k++) { const px = x + 1 + k * .25, pz = zz + .4; pebbles.push([px, z.ground(px, pz) + .08, pz, .18, .12, .23, k]); }
  }
  instances('shore-boulders', new T.IcosahedronGeometry(1, 0), 0xffffff, rocks, [0x899a91, 0xa6afa0, 0x788c86]);
  instances('shore-pebbles-fx', new T.IcosahedronGeometry(1, 0), 0xb5baaa, pebbles);

  const pavilionZ = 136, pavilionY = Math.max(...[-1.7, 1.7].flatMap(dx => [-1.5, 1.5].map(dz => z.ground(cx + dx, pavilionZ + dz))));
  const timber: Part[] = [[cx, pavilionY + .12, pavilionZ, 4, .24, 3.6]], roof: Part[] = [];
  for (const dx of [-1.65, 1.65]) for (const dz of [-1.45, 1.45]) timber.push([cx + dx, pavilionY + 1.45, pavilionZ + dz, .18, 2.9, .18]);
  // Low eaves and solid stepped roof tiers give the slime a climbable route to the ridge.
  for (let i = 0; i < 4; i++) roof.push([cx, pavilionY + 2.65 + i * .22, pavilionZ, 4.7 - i * 1.05, .22, 4.15 - i * .55]);
  instances('north-pavilion-timber', box, 0x9f7c53, timber);
  instances('north-pavilion-roof', box, 0xffffff, roof, [0x536f64, 0x648172]);
  const benches: Part[] = [];
  for (const x of [cx - 7, cx + 7]) {
    const zz = 134.5, y = Math.max(z.ground(x - 1.1, zz), z.ground(x + 1.1, zz));
    benches.push([x, y + .55, zz, 2.8, .16, .65], [x, y + 1.05, zz + .3, 2.8, .42, .1]);
    for (const dx of [-1, 1]) { benches.push([x + dx, y + .27, zz, .16, .54, .55]); benches.push([x + dx, y + .8, zz + .27, .1, .8, .1]); }
  }
  instances('lake-benches', box, 0xaa835a, benches);
  const spots: [number, number, number][] = [];
  for (let i = 0; i < 40; i++) { const x = -28 + z.rand() * 57, zz = 82 + z.rand() * 58; if (lakeEdge(x, zz) > 1.35 && pathDistance(x, zz) > 3) spots.push([x, zz, .8 + z.rand() * .6]); }
  root.add(trees(z, spots));
  const critters = critterField(z, root, 'lake', [[-22, 110], [24, 106], [-12, 128], [16, 126], [-24, 98], [26, 120]]);
  return {root, update: (t, dt, p) => {
    mirror?.update();
    lilies.position.y = Math.sin(t * .85) * .018;
    fish(t, dt, p); fishEast(t, dt, p); fishWest(t, dt, p); critters(t, dt, p);
  }};
};
