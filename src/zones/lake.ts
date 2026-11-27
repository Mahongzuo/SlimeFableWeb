import {LAKE, pathDistance, lakeEdge} from '../world/map';
import {signpost, trees, tufts, windy} from './kit';
import type {Box} from '../slime/types';
import type {ZoneBuilder} from './types';
import {lakeWater} from './lake-water';
import {critterField} from './critter-field';
import {fishingSpot} from './fishing-spot';

/** Quiet mountain lake: solid resting places and walk-through water details. */
export const lake: ZoneBuilder = z => {
  const {T} = z, P = z.ctx.P, root = new T.Group(), [cx, cz] = LAKE.center;
  type Part = [number, number, number, number, number, number, number?, number?];
  // One draw mesh per repeated shape; optional yaw and roll also cover fallen timber.
  const instances = (name: string, geometry: any, color: number, parts: Part[], palette?: number[]) => {
    const mesh = new T.InstancedMesh(geometry, z.toon(color), parts.length);
    mesh.name = name;
    const dummy = new T.Object3D();
    parts.forEach(([x, y, zz, sx, sy, sz, yaw = 0, roll = 0], i) => {
      dummy.position.set(x, y, zz); dummy.scale.set(sx, sy, sz); dummy.rotation.set(0, yaw, roll);
      dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new T.Color(palette ? palette[i % palette.length] : 0xffffff).multiplyScalar(.95 + z.rand() * .1));
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
  // Thick-walled hollow fish barrel (outer stave wall, rounded rim lip, inner wall & bottom — never back-face culled)
  const pierBarrelGeo = new T.LatheGeometry([
    [0, -.325], [.29, -.325], [.34, .325], [.306, .325], [.258, -.27], [0, -.27],
  ].map(([r, y]) => new T.Vector2(r, y)), 20);
  instances('pier-fish-barrel', pierBarrelGeo, 0x96704c, [[cx - .66, deckY + .325, 107.65, 1, 1, 1]]);
  instances('pier-barrel-hoops', new T.TorusGeometry(1, .022, 6, 20).rotateX(Math.PI / 2), 0x565e58, [
    [cx - .66, deckY + .12, 107.65, .304, 1, .304],
    [cx - .66, deckY + .55, 107.65, .336, 1, .336],
  ]);
  instances('pier-barrel-water', new T.CircleGeometry(.284, 20).rotateX(-Math.PI / 2), 0x548d8a, [[cx - .66, deckY + .4, 107.65, 1, 1, 1]]);
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
  const reedMesh = instances('shore-grass-reeds', new T.CylinderGeometry(.5, 1, 1, 5), 0x7e995f, reeds);
  reedMesh.material = windy(z, z.toon(P.grass, {noCache: true}), .12);
  const seedMesh = instances('shore-grass-seedheads', new T.CylinderGeometry(1, 1, 1, 6), 0x9b7951, tips);
  seedMesh.material = windy(z, z.toon(P.woodDark, {noCache: true}), .12);
  for (let i = 0; i < 18; i++) {
    const a = i * Math.PI * 2 / 18, x = cx + Math.cos(a) * LAKE.rx * 1.23, zz = cz + Math.sin(a) * LAKE.rz * 1.23;
    if (pathDistance(x, zz) < 3 || Math.abs(x - cx) < 4 && zz > cz || Math.abs(zz - cz) < 3) continue;
    const s = .45 + (i % 3) * .3;
    rocks.push([x, z.ground(x, zz) + s * .3, zz, s, s * .65, s * .8, a]);
    for (let k = 0; k < 3; k++) { const px = x + 1 + k * .25, pz = zz + .4; pebbles.push([px, z.ground(px, pz) + .08, pz, .18, .12, .23, k]); }
  }
  const shoreRocksMesh = instances('shore-boulders', new T.IcosahedronGeometry(1, 0), 0xffffff, rocks, [0x899a91, 0xa6afa0, 0x788c86]);
  shoreRocksMesh.userData.skipHeightBake = true;
  instances('shore-pebbles-fx', new T.IcosahedronGeometry(1, 0), 0xb5baaa, pebbles);

  const pavilionZ = 136, pavilionY = Math.max(...[-1.7, 1.7].flatMap(dx => [-1.5, 1.5].map(dz => z.ground(cx + dx, pavilionZ + dz))));
  const zoneBoxes: Box[] = [
    {name: 'lake-pavilion-plinth', min: [cx - 2.3, pavilionY, pavilionZ - 2.3], max: [cx + 2.3, pavilionY + .30, pavilionZ + 2.3], camera: false},
    // Lightweight 2-tier hipped roof matching concave hexagon profile (no hovering above outer eaves)
    {name: 'lake-pavilion-roof-eave', min: [cx - 2.55, pavilionY + 3.18, pavilionZ - 2.55], max: [cx + 2.55, pavilionY + 3.52, pavilionZ + 2.55], camera: true},
    {name: 'lake-pavilion-roof-top', min: [cx - 1.35, pavilionY + 3.50, pavilionZ - 1.35], max: [cx + 1.35, pavilionY + 4.28, pavilionZ + 1.35], camera: true},
    // Solid flat fishing boulder on east bank
    {name: 'lake-east-rock', min: [eastX - 1.25, eastY - 0.15, cz - 1.08], max: [eastX + 1.25, eastY + 0.60, cz + 1.08], camera: false, climbable: false},
  ];
  // Solid walkable/blocking OBBs for all lakeside boulders
  rocks.forEach(([rx, ry, rz, sx, sy, sz, yaw = 0], idx) => {
    const hx = sx * 0.76, hy = sy * 0.72, hz = sz * 0.76;
    zoneBoxes.push({
      name: `lake-shore-boulder-${idx}`,
      min: [rx - hx, ry - hy, rz - hz],
      max: [rx + hx, ry + hy, rz + hz],
      yaw,
      camera: false,
      climbable: false,
    });
  });
  // Shared batches for village carpentry, masonry and pass-through small details.
  const wood: Part[] = [], stone: Part[] = [], rope: Part[] = [], metal: Part[] = [], cloth: Part[] = [];
  const beam = (parts: Part[], a: number[], b: number[], width: number, depth = width) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    parts.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2,
      width, Math.hypot(dx, dy, dz), depth, Math.atan2(-dz, dx), -Math.atan2(Math.hypot(dx, dz), dy)]);
  };
  // Hexagonal stone plinth, six columns, five bays of curved-back seating; south bay stays open.
  instances('north-pavilion-plinth', new T.CylinderGeometry(2.35, 2.5, .3, 6), P.concrete, [[cx, pavilionY + .15, pavilionZ, 1, 1, 1]]);
  const ring = Array.from({length: 6}, (_, i) => {
    const a = Math.PI / 6 + i * Math.PI / 3;
    return [cx + Math.cos(a) * 2, pavilionZ + Math.sin(a) * 2];
  });
  for (let i = 0; i < 6; i++) {
    const [x, zz] = ring[i], [nx, nz] = ring[(i + 1) % 6];
    stone.push([x, pavilionY + .38, zz, .4, .16, .4]);
    wood.push([x, pavilionY + 1.85, zz, .19, 3, .19]);
    beam(wood, [x, pavilionY + 3.25, zz], [nx, pavilionY + 3.25, nz], .2);
    if (i === 3) continue;
    const mx = (x + nx) / 2, mz = (zz + nz) / 2, yaw = Math.atan2(-(nz - zz), nx - x);
    wood.push([mx, pavilionY + .78, mz, 2.05, .18, .5, yaw]);
    zoneBoxes.push({name: `lake-pavilion-seat-${i}`, min: [mx - 1.02, pavilionY + .30, mz - .25], max: [mx + 1.02, pavilionY + .87, mz + .25], yaw, camera: false});
    for (const t of [.18, .5, .82]) {
      const bx = x + (nx - x) * t, bz = zz + (nz - zz) * t;
      const ox = (bx - cx) * .1, oz = (bz - pavilionZ) * .1;
      wood.push([bx, pavilionY + .52, bz, .16, .44, .16]);
      beam(wood, [bx, pavilionY + .8, bz], [bx + ox, pavilionY + 1.32, bz + oz], .09);
    }
    beam(wood, [x + (x - cx) * .1, pavilionY + 1.32, zz + (zz - pavilionZ) * .1],
      [nx + (nx - cx) * .1, pavilionY + 1.32, nz + (nz - pavilionZ) * .1], .16);
  }
  for (let i = 0; i < 3; i++) stone.push([cx, pavilionY + .05 + i * .09, pavilionZ - 2.8 + i * .3, 1.65, .18, .38]);
  // Closed six-sided roof bands: concave profile with a gently raised outer eave, >= .18 m thick.
  const roofPos: number[] = [], roofIndex: number[] = [];
  const profile = [[2.85, 3.32], [2.55, 3.18], [1.95, 3.38], [1.15, 3.85], [.18, 4.35]];
  for (const offset of [0, -.18]) for (const [r, h] of profile) for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3;
    roofPos.push(cx + Math.cos(a) * r, pavilionY + h + offset, pavilionZ + Math.sin(a) * r);
  }
  const quad = (a: number, b: number, c: number, d: number) => roofIndex.push(a, b, c, a, c, d);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) {
    const a = j * 6 + i, b = j * 6 + (i + 1) % 6;
    quad(a, a + 6, b + 6, b); quad(a + 30, b + 30, b + 36, a + 36);
  }
  for (let i = 0; i < 6; i++) { const n = (i + 1) % 6; quad(i, n, n + 30, i + 30); quad(24 + i, 54 + i, 54 + n, 24 + n); }
  const roofGeo = new T.BufferGeometry(); roofGeo.setAttribute('position', new T.Float32BufferAttribute(roofPos, 3)); roofGeo.setIndex(roofIndex); roofGeo.computeVertexNormals();
  instances('north-pavilion-hip-roof', roofGeo, P.tileRoof, [[0, 0, 0, 1, 1, 1]]);
  const roofRibs: Part[] = [];
  for (let side = 0; side < 6; side++) for (let j = 0; j < 4; j++) {
    const angle = Math.PI / 6 + side * Math.PI / 3, [r, h] = profile[j], [nr, nh] = profile[j + 1];
    beam(roofRibs, [cx + Math.cos(angle) * r, pavilionY + h + .04, pavilionZ + Math.sin(angle) * r],
      [cx + Math.cos(angle) * nr, pavilionY + nh + .04, pavilionZ + Math.sin(angle) * nr], .15);
  }
  instances('north-pavilion-ridge-caps', box, P.tileRoofLight, roofRibs);
  instances('north-pavilion-finial', new T.SphereGeometry(1, 12, 8), P.tileRoofLight,
    [[cx, pavilionY + 4.36, pavilionZ, .3, .16, .3], [cx, pavilionY + 4.6, pavilionZ, .19, .28, .19], [cx, pavilionY + 4.88, pavilionZ, .08, .16, .08]]);

  // Mooring cleats and rope coils sit at the pier edges, clear of the fishing stand.
  for (const [x, zz] of [[cx - .85, 105.5], [cx + .85, 106.6]]) {
    wood.push([x, deckY + .32, zz, .18, .64, .18], [x, deckY + .54, zz, .43, .16, .18]);
    for (let k = 0; k < 3; k++) rope.push([x, deckY + .06 + k * .04, zz - .36, .25 + k * .035, 1, .21 + k * .035]);
  }
  // Slatted fish crates, including end battens and a lid; all boards have usable thickness.
  for (const [x, zz, y] of [[cx - .7, 103.5, deckY], [cx + 2.8, 96, z.ground(cx + 2.8, 96)]]) {
    for (let k = 0; k < 3; k++) {
      for (const side of [-1, 1]) wood.push([x, y + .12 + k * .18, zz + side * .28, .72, .16, .15], [x + side * .29, y + .12 + k * .18, zz, .15, .16, .56]);
      wood.push([x - .24 + k * .24, y + .61, zz, .22, .16, .7]);
    }
  }
  // A drying net beside the pier approach: frame is solid, every strand is explicitly fx.
  const netX = cx + 4.6, netZ = 97.4, netY = z.ground(netX, netZ), net: Part[] = [];
  for (const dx of [-1.15, 1.15]) {
    wood.push([netX + dx, netY + 1.1, netZ, .16, 2.2, .16]);
    stone.push([netX + dx, netY + .09, netZ, .4, .18, .4]);
  }
  wood.push([netX, netY + 2.1, netZ, 2.65, .16, .16]);
  for (let i = 0; i <= 12; i++) {
    const x = netX - 1.1 + i * 2.2 / 12, sag = .18 * Math.sin(i / 12 * Math.PI);
    net.push([x, netY + 1.3 - sag / 2, netZ, .014, 1.45 - sag, .014]);
  }
  for (let row = 0; row < 9; row++) for (let i = 0; i < 12; i++) {
    const x = netX - 1.1 + i * 2.2 / 12;
    beam(net, [x, netY + .6 + row * .17 - .18 * Math.sin(i / 12 * Math.PI), netZ],
      [x + 2.2 / 12, netY + .6 + row * .17 - .18 * Math.sin((i + 1) / 12 * Math.PI), netZ], .014);
  }
  instances('fishing-drying-net-fx', box, P.ropeWet, net);
  const buckets: Part[] = [], handles: Part[] = [], grooves: Part[] = [];
  for (const x of [eastX, westX]) {
    const zz = cz + 1.5, y = z.ground(x, zz);
    wood.push([x, y + .46, zz, .6, .16, .48]);
    for (const dz of [-.17, .17]) for (const side of [-1, 1])
      beam(wood, [x + side * .25, y + .04, zz + dz], [x - side * .2, y + .39, zz + dz], .1);
    const bx = x + (x === eastX ? .85 : -.85), by = z.ground(bx, zz);
    buckets.push([bx, by + .26, zz, 1, 1, 1]);
    handles.push([bx, by + .48, zz, .27, .32, .27]);
    for (const h of [.07, .47]) metal.push([bx, by + h, zz, .26, 1, .26]);
    cloth.push([x, y + .57, zz, .42, .04, .35]);
  }
  // Hollow, thick-walled buckets with a bottom, built as a single lathed batch.
  const bucketGeo = new T.LatheGeometry([[0, -.25], [.22, -.25], [.28, .25], [.24, .25], [.18, -.19], [0, -.19]].map(([x, y]) => new T.Vector2(x, y)), 12);
  instances('fishing-wooden-buckets', bucketGeo, P.woodWeathered, buckets);
  instances('fishing-bucket-handles-fx', new T.TorusGeometry(1, .055, 5, 16, Math.PI), P.iron, handles);
  // Washing ledge and three broad stepping stones leading into the shallow west cove.
  const washX = cx - 18, washZ = cz - 9, washY = z.ground(washX, washZ);
  stone.push([washX, washY + .15, washZ, 1.4, .3, .95, -.4]);
  cloth.push([washX - .25, washY + .32, washZ, .5, .035, .65, -.4]);
  for (let i = 0; i < 7; i++) {
    const dx = .15 + i * .12;
    grooves.push([washX + Math.cos(.4) * dx, washY + .305, washZ + Math.sin(.4) * dx, .025, .012, .68, -.4]);
  }
  instances('washing-stone-grooves-fx', box, P.concreteWet, grooves);
  for (let i = 1; i <= 3; i++) {
    const x = washX + i * .65, zz = washZ + i * .42, top = washY + .18 - i * .09, bottom = z.ground(x, zz) - .1;
    stone.push([x, (top + bottom) / 2, zz, .8, Math.max(.2, top - bottom), .65, i * .3]);
  }
  // Short plank walk follows the north-east shore; piles reach the lake bed.
  for (let i = 0; i < 28; i++) {
    const a = .32 + i * .023, x = cx + Math.cos(a) * LAKE.rx * 1.1, zz = cz + Math.sin(a) * LAKE.rz * 1.1;
    const y = z.ground(x, zz) + .22, yaw = Math.atan2(-Math.sin(a) * LAKE.rx, Math.cos(a) * LAKE.rz);
    wood.push([x, y, zz, 1.5, .2, .43, yaw]);
    if (i % 4 === 0) for (const side of [-1, 1]) {
      const px = x + side * .63 * Math.cos(yaw), pz = zz - side * .63 * Math.sin(yaw), bottom = z.ground(px, pz) - .12;
      wood.push([px, (bottom + y) / 2, pz, .17, y - bottom, .17]);
    }
  }
  instances('lake-village-timber', box, P.wood, wood);
  instances('lake-village-stonework', box, P.concreteDark, stone);
  instances('lake-rope-coils-fx', new T.TorusGeometry(1, .065, 5, 20).rotateX(Math.PI / 2), P.rope, rope);
  instances('lake-bucket-hoops-fx', new T.TorusGeometry(1, .055, 5, 16).rotateX(Math.PI / 2), P.iron, metal);
  instances('lake-washing-cloth-fx', box, P.boatOffWhite, cloth);
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
  const lakeNativeTrees = [
    [18, 121, 1.05], [-16, 102, 1.15], [20, 130, 0.95],
    [-12, 99, 1.10], [14, 98, 1.15], [20, 101, 1.00],
  ] as const;
  root.add(tufts(z, 1200, {min: [-29, 82], max: [30, 141]},
    (x, zz) => lakeEdge(x, zz) < 1.17 || pathDistance(x, zz) < 2.8 ||
      Math.hypot(x - cx, zz - pavilionZ) < 3.4 ||
      spots.some(([tx, tz, ts]) => Math.hypot(x - tx, zz - tz) < Math.max(0.80, ts * 0.58 + 0.38)) ||
      lakeNativeTrees.some(([tx, tz, r]) => Math.hypot(x - tx, zz - tz) < r) ||
      rocks.some(([rx, , rz, sx, , sz]) => Math.hypot(x - rx, zz - rz) < Math.max(sx, sz) * 0.85 + 0.32) ||
      Math.abs(zz - cz) < 3 && (Math.abs(x - eastX) < 2 || Math.abs(x - westX) < 2),
    [P.grass, P.safetyYellow, P.boatOffWhite]));
  // The kit boards use six material groups; four identical untextured edges can share one draw.
  root.traverse((obj: any) => {
    if (obj.parent?.name !== 'signpost' || !Array.isArray(obj.material)) return;
    obj.geometry.clearGroups(); obj.geometry.addGroup(0, 24, 0);
    obj.geometry.addGroup(24, 6, 4); obj.geometry.addGroup(30, 6, 5);
  });
  const critters = critterField(z, root, 'lake', [[-22, 110], [24, 106], [-12, 128], [16, 126], [-24, 98], [26, 120]]);
  return {root, boxes: zoneBoxes, update: (t, dt, p) => {
    mirror?.update();
    lilies.position.y = Math.sin(t * .85) * .018;
    fish(t, dt, p); fishEast(t, dt, p); fishWest(t, dt, p); critters(t, dt, p);
  }};
};
