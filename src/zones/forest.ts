import {nativeBuildingMaterial} from '../home/architecture-surfaces';
import {approachWear} from '../home/preserve-trails';
import {slopedWaterLevel,valleyWater} from './lake-water';
import {pathDistance} from '../world/map';
import {getNativeTreeSpots} from '../home/garden-regions';
import {signpost, trees, tufts, windy} from './kit';
import {createLeafCardMaterial, getSharedPineBoughGeometry, buildBroadleafCanopyGeometry} from '../home/foliage/tree-ism';
import type {Box} from '../slime/types';
import type {ZoneBuilder} from './types';
import {critterField} from './critter-field';
import {orchardGeometry} from '../home/foliage/orchard-trees';

/** Mixed woodland; repeated scenery is batched and decorative names skip collision baking. */
export const forest: ZoneBuilder = z => {
  const {T} = z, P = z.ctx.P, root = new T.Group();
  type Pose = [number, number, number, number, number, number, number?, number?, number?];
  const batch = (name: string, geometry: any, color: number, poses: Pose[]) => {
    const mesh = new T.InstancedMesh(geometry, nativeBuildingMaterial(z, name, color, /foliage/.test(name) ? {noCache: true} : {}), poses.length);
    mesh.name = name;
    const matrix = new T.Matrix4(), rotation = new T.Quaternion(), tint = new T.Color();
    poses.forEach(([x, y, zz, sx, sy, sz, yaw = 0, pitch = 0, roll = 0], i) => {
      rotation.setFromEuler(new T.Euler(pitch, yaw, roll));
      matrix.compose(new T.Vector3(x, y, zz), rotation, new T.Vector3(sx, sy, sz));
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, tint.setScalar(.95 + z.rand() * .1));
    });
    mesh.castShadow = !/water|fx|leaf/.test(name); mesh.receiveShadow = true;
    if (/foliage/.test(name)) windy(z, mesh.material, .025);
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
    if (i > 0) { const k = i * 2; indices.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  });
  const waterGeometry = new T.BufferGeometry();
  waterGeometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); waterGeometry.setIndex(indices); waterGeometry.computeVertexNormals();
  // The creek follows the hills. Resolve its local interface on the same triangles the camera sees.
  const water=valleyWater(z.ctx,waterGeometry,0,0,0,.07,.81,{levelAt:slopedWaterLevel(vertices,indices),calm:.44,shoreFoam:.025});
  water.name='forest-water';root.add(water);
  batch('creek-pebbles-fx', new T.IcosahedronGeometry(1, 0), 0x929185, pebbles);

  const spots: [number, number, number][] = [];
  for (let tries = 0; spots.length < 190 && tries < 6000; tries++) {
    const x = -103 + z.rand() * 70, zz = 34 + z.rand() * 104, s = 1.1 + z.rand() * .65;
    const campClearing = Math.hypot(x + 54, zz - 75) < 6 || Math.hypot(x + 92, zz - 102) < 5;
    const treehouseVista = zz > 84 && zz < 96 && x > -71 && x < -58;
    if (campClearing || treehouseVista || pathDistance(x, zz) < 3.6 || creekDistance(x, zz) < 2.8 || Math.hypot(x + 70, zz - 95) < 7 || Math.hypot(x + 89, zz - 77) < 6) continue;
    if (spots.some(([px, pz]) => Math.hypot(px - x, pz - zz) < 2.9)) continue;
    spots.push([x, zz, s]);
  }
  for(let i=spots.length-1;i>=0;i--)if(approachWear(spots[i][0],spots[i][1])>.04)spots.splice(i,1);
  const pineCount = Math.round((spots.length + 1) * .6), pines = spots.slice(0, pineCount);
  const broadleaf=spots.slice(pineCount);
  const edgeTrees=broadleaf.filter(([x,zz])=>pathDistance(x,zz)<13 && pathDistance(x,zz)>4.7).slice(0,14);
  root.add(trees(z,broadleaf.filter(p=>!edgeTrees.includes(p)),[0x386844,0x487647,0x527a48,0x315c40]));
  const groveBoxes:Box[]=[];
  const shrubs:Pose[]=[];
  for(const [kind,k] of [['oak',0],['poplar',1]] as const){
    for(const variant of [0,1] as const){
      const shape=orchardGeometry(kind,variant),poses:Pose[]=[];
      for(let i=2*variant+k;i<edgeTrees.length;i+=4){
        const [x,zz,size]=edgeTrees[i],y=z.ground(x,zz),scale=size*(kind==='oak'?.53:.61),r=scale*(kind==='oak'?.51:.29);
        poses.push([x,y,zz,scale,scale,scale,i*1.63]);
        groveBoxes.push({name:'meadow-'+kind+'-trunk-'+i,min:[x-r,y-.12,zz-r],max:[x+r,y+3*scale,zz+r],camera:true,climbable:false});
        const cx=x+1.3,cz=zz+.7;
        if(pathDistance(cx,cz)>4 && creekDistance(cx,cz)>2.5){
          for(let b=0;b<7;b++){
            const turn=b*2.3999+i,reach=b===0?0:.72;
            const bx=cx+Math.sin(turn)*reach,bz=cz+Math.cos(turn)*reach;
            shrubs.push([bx,z.ground(bx,bz)+.30,bz,.65,.42+(b%3)*.12,.64,turn]);
          }
        }
      }
      if(!poses.length)continue;
      const bark=batch('meadow-'+kind+'-bark',shape.trunk,0xffffff,poses);
      bark.material=new T.MeshStandardMaterial({vertexColors:true,roughness:.9});bark.userData.walkThrough=true;
      const foliage=batch('meadow-'+kind+'-leaf',shape.canopy,0xffffff,poses);
      foliage.material=new T.MeshStandardMaterial({vertexColors:true,roughness:.88,side:T.DoubleSide});
      windy(z,foliage.material,.011);
    }
  }
  batch('meadow-shrub-foliage',new T.IcosahedronGeometry(1,1),0x608d48,shrubs);
  batch('pine-trunks', new T.CylinderGeometry(.18, .28, 1, 7).translate(0, .5, 0), 0x685039,
    pines.map(([x, zz, s]) => [x, z.ground(x, zz), zz, s, s * 4.5, s]));
  // Long limbs and flattened needle clusters leave sightlines under mature pines.
  const limbs: Pose[] = [], shaded: Pose[] = [], tips: Pose[] = [];
  for (const [x, zz, size] of pines) {
    const baseY = z.ground(x, zz), turn = z.rand() * Math.PI * 2;
    for (let tier = 0; tier < 4; tier++) {
      const angle = turn + tier * 2.4, reach = (1.25 - tier * .22) * size;
      const dx = Math.cos(angle) * reach, dz = -Math.sin(angle) * reach;
      const y = baseY + (2.8 + tier * .48) * size;
      limbs.push([x + dx * .5, y, zz + dz * .5, reach, size * .12, size * .13, angle, 0, .18]);
      const width = (1.18 - tier * .13) * size;
      shaded.push([x + dx, y + .15 * size, zz + dz, width * 1.28, size * .48, width, angle]);
      tips.push([x + dx * 1.12, y + .38 * size, zz + dz * 1.12, width * 1.08, size * .37, width * .92, angle]);
    }
  }
  const pineBranches = beam('pine-branches', 0x6b5946, limbs);
  pineBranches.userData.walkThrough = true;
  pineBranches.userData.skipHeightBake = true;
  const needles = getSharedPineBoughGeometry();
  const pineLeafMat = createLeafCardMaterial(z, 0.045, true);
  const pineShadow = batch('pine-foliage-shadow', needles, 0x3b664b, shaded);
  pineShadow.material = pineLeafMat;
  const pineTips = batch('pine-foliage-tips', needles, 0x56825c, tips);
  pineTips.material = pineLeafMat;

  const zoneBoxes: Box[] = groveBoxes;
  const base = z.ground(-70, 95), deck = base + 4;
  batch('treehouse-trunk', new T.CylinderGeometry(.65, .95, 8.5, 9).translate(0, 4.25, 0), 0x624832, [[-70, base, 95, 1, 1, 1]]);
  const thCanopy = batch('treehouse-foliage', buildBroadleafCanopyGeometry(), 0x3f6e44, [[-70, base + 1.4, 95, 2.5, 2.3, 2.5]]);
  thCanopy.material = pineLeafMat;
  const thDeck = beam('treehouse-platform', 0x94704a, [[-70, deck - .16, 95, 6, .32, 5.6]]);
  thDeck.userData.skipHeightBake = true;
  zoneBoxes.push({name: 'treehouse-deck', min: [-73, deck - .32, 92.2], max: [-67, deck, 97.8], camera: false});
  beam('treehouse-supports', 0x624832, [-72.5, -67.5].flatMap(x => [92.7, 97.3].map(zz => {
    const ground = z.ground(x, zz);
    zoneBoxes.push({name: `treehouse-sup-${x}-${zz}`, min: [x - .11, ground, zz - .11], max: [x + .11, deck, zz + .11], camera: true});
    return [x, (ground + deck) / 2, zz, .22, deck - ground, .22] as Pose;
  })));
  // Small cabin at the back: open doorway faces the ladder and viewing deck.
  const thCabin = beam('treehouse-cabin', 0x80613f, [
    [-70, deck + 1.2, 97.4, 3.2, 2.4, .16], [-71.6, deck + 1.2, 96.4, .16, 2.4, 2],
    [-68.4, deck + 1.2, 96.4, .16, 2.4, 2], [-71.15, deck + 1.2, 95.4, .9, 2.4, .16],
    [-68.85, deck + 1.2, 95.4, .9, 2.4, .16], [-70, deck + 2.2, 95.4, 1.4, .4, .16],
    [-70, deck + 2.5, 96.4, 3.7, .24, 2.6],
  ]);
  thCabin.userData.skipHeightBake = true;
  zoneBoxes.push(
    {name: 'th-wall-back', min: [-71.6, deck, 97.32], max: [-68.4, deck + 2.4, 97.48], camera: true},
    {name: 'th-wall-l', min: [-71.68, deck, 95.4], max: [-71.52, deck + 2.4, 97.4], camera: true},
    {name: 'th-wall-r', min: [-68.48, deck, 95.4], max: [-68.32, deck + 2.4, 97.4], camera: true},
    {name: 'th-wall-fl', min: [-71.6, deck, 95.32], max: [-70.7, deck + 2.4, 95.48], camera: true},
    {name: 'th-wall-fr', min: [-69.3, deck, 95.32], max: [-68.4, deck + 2.4, 95.48], camera: true},
    {name: 'th-lintel', min: [-70.7, deck + 2.0, 95.32], max: [-69.3, deck + 2.4, 95.48], camera: true},
    {name: 'th-roof', min: [-71.85, deck + 2.38, 95.1], max: [-68.15, deck + 2.62, 97.7], camera: true},
  );
  const railing: Pose[] = [];
  for (const x of [-72.85, -67.15]) {
    railing.push([x, deck + .85, 95, .12, .12, 5.5]);
    for (const zz of [92.3, 95, 97.7]) railing.push([x, deck + .45, zz, .13, .9, .13]);
  }
  for (const x of [-72, -68]) railing.push([x, deck + .85, 92.3, 1.7, .12, .12]);
  railing.push([-70, deck + .85, 97.7, 5.7, .12, .12]);
  // Round bamboo rails with visible nodes, including the open ladder entrance.
  const bambooNodes: Pose[] = [];
  for (const pose of railing) {
    const [x, y, zz, sx, sy, sz] = pose;
    for (let t = -.4; t <= .41; t += .2) bambooNodes.push([x + (sx > 1 ? sx * t : 0), y + (sy > .5 ? sy * t : 0), zz + (sz > 1 ? sz * t : 0), sx > 1 ? .045 : .17, sy > .5 ? .045 : .17, sz > 1 ? .045 : .17]);
  }
  batch('treehouse-bamboo-rails', new T.CylinderGeometry(.075, .075, 1, 8), P.rope, railing.map(([x,y,zz,sx,sy,sz]) => [x,y,zz,1,Math.max(sx,sy,sz),1,0,sz > 1 ? Math.PI / 2 : 0,sx > 1 ? Math.PI / 2 : 0]));
  beam('bamboo-nodes-fx', P.sand, bambooNodes);
  const ladderBase = z.ground(-70, 92), ladderHeight = deck - ladderBase;
  beam('treehouse-ladder-rails', 0x6c5035, [-70.55, -69.45].map(x => [x, ladderBase + (ladderHeight + .8) / 2, 92, .14, ladderHeight + .8, .18]));
  const rungs: Pose[] = [];
  for (let h = .2; h < ladderHeight + .1; h += .3) {
    rungs.push([-70, ladderBase + h, 91.9, 1.15, .16, .28]);
    zoneBoxes.push({name: `th-rung-${rungs.length}`, min: [-70.58, ladderBase + h - .08, 91.76], max: [-69.42, ladderBase + h + .08, 92.04], camera: false});
  }
  const rungMesh = beam('treehouse-ladder-rungs', 0xaf8858, rungs);
  rungMesh.userData.skipHeightBake = true;
  z.interact({id: 'forest-treehouse', position: [-70, deck + .25, 93.5], radius: 2, prompt: () => ({title: '树屋', sub: '夜里能看到萤火虫'}), act: () => {}});

  // Low stepped planks follow the path's slope; the full walking width stays open.
  const bridge: Pose[] = [], bridgeYaw = Math.atan2(-1, 3);
  for (let i = 0; i <= 20; i++) {
    const t = -4 + i * .4, x = -81 - t / Math.sqrt(10), zz = 101 + 3 * t / Math.sqrt(10);
    bridge.push([x, z.ground(x, zz) + .12, zz, 4.8, .18, .43, bridgeYaw]);
  }
  beam('creek-stone-bridge', P.concrete, bridge);

  const clear = (x: number, zz: number, radius: number) => pathDistance(x, zz) > 3 + radius && creekDistance(x, zz) > 1.5 + radius && Math.hypot(x + 70, zz - 95) > 7 + radius && Math.hypot(x + 89, zz - 77) > 6 + radius && spots.every(([tx, tz]) => Math.hypot(tx - x, tz - zz) > radius + .6);
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
  // Strictly bottom-to-top LatheGeometry points so forest mushroom caps face outward (never inverted)
  const fCapPts = [new T.Vector2(.001, -.012), new T.Vector2(.15, -.018), new T.Vector2(.19, 0), new T.Vector2(.17, .095), new T.Vector2(.10, .165), new T.Vector2(.001, .19)];
  const fCapGeo = new T.LatheGeometry(fCapPts, 14);
  fCapGeo.computeVertexNormals();
  batch('mushroom-caps-fx', fCapGeo, 0xb87a49, caps);
  scatter(500, .25, (x, zz) => leaves.push([x, z.ground(x, zz) + .06, zz, .6 + z.rand() * .5, .12, .4 + z.rand() * .4, z.rand() * 6]));
  batch('forest-leaf-piles', new T.IcosahedronGeometry(1, 0), 0x877340, leaves);

  // Solid ranger cabin: separate stacked timbers make the walls and filled interior.
  const cabinY = z.ground(-89, 77), timber: Pose[] = [], stone: Pose[] = [], tiles: Pose[] = [];
  for (let row = 0; row < 12; row++) for (let lane = 0; lane < 9; lane++) {
    timber.push([-89, cabinY + .38 + row * .2, 75.4 + lane * .4, 4.4, .21, .41]);
  }
  for (const x of [-91, -87]) for (const zz of [75.4, 78.6]) stone.push([x, cabinY + .12, zz, .65, .3, .65]);
  // Overlapping ceramic courses form thick pitched roofs with a capped ridge.
  for (const [cx, cy, cz, half, depth] of [[-89, cabinY + 2.9, 77, 2.6, 4.4], [-70, deck + 2.8, 96.4, 2.1, 2.8]]) {
    for (const side of [-1, 1]) for (let row = 0; row < 7; row++) for (let col = 0; col < Math.ceil(depth / .28); col++) {
      const d = (row + .5) * half / 7;
      tiles.push([cx + side * d, cy + .75 - d * .36, cz - depth / 2 + col * .28, half / 7 + .08, .18, .3, 0, 0, -side * .345]);
    }
    tiles.push([cx, cy + .8, cz, .3, .23, depth + .2]);
  }
  beam('ranger-cabin-timbers', P.wood, timber);
  beam('cabin-and-post-footings', P.gravel, stone);
  beam('blue-tile-roofs', 0x596568, tiles);
  const trim: Pose[] = [], dark: Pose[] = [];
  dark.push([-89, cabinY + 1.1, 75.16, 1.1, 1.9, .18]);
  for (const x of [-90.5, -87.5]) {
    dark.push([x, cabinY + 1.65, 75.15, .85, .8, .18]);
    for (let k = -1; k <= 1; k++) trim.push([x + k * .25, cabinY + 1.65, 75.02, .055, .85, .055]);
    trim.push([x, cabinY + 1.65, 75.02, .9, .06, .06]);
  }
  beam('cabin-door-and-window-insets', 0x493d32, dark);
  beam('cabin-window-lattice', P.rope, trim);
  beam('cabin-doorstep', P.concrete, [[-89, cabinY + .1, 74.65, 1.5, .2, .7]]);
  const firewood: Pose[] = [], cutEnds: Pose[] = [], cones: Pose[] = [], moss: Pose[] = [];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 6 - row; col++) {
    const x = -92 + col * .25 + row * .125, y = z.ground(x, 79.7) + .15 + row * .23;
    firewood.push([x, y, 79.7, .12, .12, .65]); cutEnds.push([x, y, 79.03, .105, .105, .025]);
  }
  batch('stacked-firewood', new T.CylinderGeometry(1, 1, 2, 8).rotateX(Math.PI / 2), P.wood, firewood);
  batch('firewood-cut-ends', new T.CylinderGeometry(1, 1, 1, 8).rotateX(Math.PI / 2), P.sand, cutEnds);
  for (const [x,y,zz,,,,yaw = 0] of logs) for (let k = 0; k < 9; k++) {
    const d = -1.6 + k * .4;
    moss.push([x + Math.cos(yaw) * d, y + .35, zz - Math.sin(yaw) * d, .32, .09, .25, yaw]);
  }
  batch('fallen-log-moss-foliage', new T.IcosahedronGeometry(1, 1), 0x5c814c, moss);
  scatter(150, .3, (x, zz) => {
    for (let i = 0; i < 5; i++) {
      const px = x + (z.rand() - .5) * .45, pz = zz + (z.rand() - .5) * .45;
      cones.push([px, z.ground(px, pz) + .1, pz, .09, .15, .09, z.rand() * 6]);
    }
  });
  batch('pinecone-piles-fx', new T.IcosahedronGeometry(1, 1), P.wood, cones);

  // A small undershot wheel sits beside the creek, leaving the stone crossing clear.
  const wheel = new T.Group(); wheel.name = 'creek-wheel-fx';
  const wx = -88, wz = 104.7, wy = z.ground(wx, wz) + 1.05;
  wheel.position.set(wx, wy, wz); root.add(wheel);
  const wheelParts: Pose[] = [];
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    wheelParts.push([Math.cos(a) * .92, Math.sin(a) * .92, 0, .22, .25, .7, 0, 0, a]);
    wheelParts.push([Math.cos(a) * .47, Math.sin(a) * .47, 0, .94, .09, .16, 0, 0, a]);
  }
  wheel.add(beam('waterwheel-paddles-fx', P.wood, wheelParts));
  const rims = batch('waterwheel-rims-fx', new T.TorusGeometry(.92, .065, 6, 24), P.rope, [[0,0,-.29,1,1,1],[0,0,.29,1,1,1]]); wheel.add(rims);
  beam('waterwheel-stone-bearings', P.concrete, [-.6,.6].map(d => [wx, wy - .6, wz + d, .45, 1.1, .35]));
  batch('waterwheel-axle-fx', new T.CylinderGeometry(.11,.11,1.6,8).rotateX(Math.PI / 2), P.wood, [[wx,wy,wz,1,1,1]]);

  // Low square Chinese stone lanterns mark the firefly glade beside the treehouse.
  const lanterns: Pose[] = [], glow: Pose[] = [];
  for (const [x,zz] of [[-75,91],[-65,98]]) {
    const y = z.ground(x,zz);
    lanterns.push([x,y+.12,zz,.75,.24,.75], [x,y+.4,zz,.3,.4,.3], [x,y+.65,zz,.6,.16,.6], [x,y+1.08,zz,.8,.18,.8], [x,y+1.2,zz,.5,.15,.5]);
    for (const dx of [-.23,.23]) for (const dz of [-.23,.23]) lanterns.push([x+dx,y+.86,zz+dz,.12,.3,.12]);
    glow.push([x,y+.85,zz,.28,.24,.28]);
  }
  beam('glade-stone-lanterns', P.concrete, lanterns);
  const lights = beam('lantern-glow-fx', P.safetyYellow, glow);
  lights.material = z.toon(P.safetyYellow, {emissive: P.safetyYellow, emissiveIntensity: 1.2});
  root.add(signpost(z, -86, 73, 0, '护林小屋', '护林防火 · 请勿采菇'));
  root.add(signpost(z, -62, 96, -.6, '往东·凝露港', '沿石板路出林'));

  const forestNativeTrees = getNativeTreeSpots('forest');
  root.add(signpost(z, -33, 53, -Math.PI / 2, '松果林', '轻手轻脚，小动物会躲'));
  root.add(tufts(z, 7000, {min: [-106, 30], max: [-30, 142]}, (x, zz) => pathDistance(x, zz) < 2.4
    || creekDistance(x, zz) < 1
    || Math.hypot(x + 70, zz - 95) < 1.65 // giant treehouse trunk
    || (Math.abs(x + 89) < 2.6 && Math.abs(zz - 77) < 2.2) // ranger cabin footprint
    || spots.some(([tx, tz, ts]) => Math.hypot(x - tx, zz - tz) < Math.max(0.80, ts * 0.56 + 0.36))
    || forestNativeTrees.some(([tx, tz, r]) => Math.hypot(x - tx, zz - tz) < r),
    [0x5c814c, 0xa69a56, 0xc98fb8, 0xe3dcc0]));
  // kit signposts use identical edge materials and the same texture on both faces.
  root.traverse((node: any) => {
    if (node.parent?.name !== 'signpost' || !Array.isArray(node.material)) return;
    node.geometry.clearGroups(); node.geometry.addGroup(0, 24, 0); node.geometry.addGroup(24, 12, 4);
  });
  const fireflyPoses: Pose[] = [];
  for (let i = 0; i < 48; i++) {
    const x = -76 + z.rand() * 12, zz = 89 + z.rand() * 12;
    fireflyPoses.push([x, z.ground(x, zz) + .6 + z.rand() * 1.5, zz, .035, .035, .035]);
  }
  const fireflies = batch('glade-fireflies-fx', new T.IcosahedronGeometry(1, 0), P.safetyYellow, fireflyPoses);
  fireflies.material = lights.material;
  const homes: [number, number][] = [];
  for (let i = 0; i < 28; i++) { const x = -100 + z.rand() * 64, zz = 36 + z.rand() * 100; homes.push([x, zz]); }
  const updateCritters = critterField(z, root, 'forest', homes);
  // Keep the original simulation nodes, batch their display by geometry/material.
  const critters = root.getObjectByName('critters-fx');
  const groups = new Map<string, {source: any; nodes: any[]; mesh?: any}>();
  critters?.traverse((node: any) => {
    if (!node.isMesh) return;
    const mat = node.material;
    const key = JSON.stringify([node.geometry.type, node.geometry.parameters, mat.type, mat.color?.getHex(), mat.emissive?.getHex(), mat.emissiveIntensity, mat.transparent, mat.opacity, mat.side]);
    let group = groups.get(key);
    if (!group) { group = {source: node, nodes: []}; groups.set(key, group); }
    group.nodes.push(node); node.visible = false;
  });
  for (const group of groups.values()) {
    group.mesh = new T.InstancedMesh(group.source.geometry, group.source.material, group.nodes.length);
    group.mesh.name = 'forest-critter-display-fx'; group.mesh.frustumCulled = false;
    group.mesh.castShadow = true; root.add(group.mesh);
  }
  const critterMatrix = new T.Matrix4();
  return {root, boxes: zoneBoxes, update(t, dt, player) {
    updateCritters(t, dt, player);
    wheel.rotation.z = -t * .22;
    const night = (z.ctx.U.uSun?.value ?? 1) < .2;
    lights.visible = fireflies.visible = night;
    if (night) {
      for (let i = 0; i < fireflyPoses.length; i++) {
        const [x, y, zz] = fireflyPoses[i], phase = t * .65 + i * 2.4;
        const size = .025 + .012 * (1 + Math.sin(t * 2 + i));
        critterMatrix.makeScale(size, size, size);
        critterMatrix.setPosition(x + Math.sin(phase) * .35, y + Math.sin(phase * 1.3) * .2, zz + Math.cos(phase) * .35);
        fireflies.setMatrixAt(i, critterMatrix);
      }
      fireflies.instanceMatrix.needsUpdate = true;
    }
    for (const group of groups.values()) {
      let count = 0;
      for (const node of group.nodes) {
        if (!node.parent.visible) continue;
        node.parent.updateMatrix(); node.updateMatrix();
        critterMatrix.multiplyMatrices(node.parent.matrix, node.matrix);
        group.mesh.setMatrixAt(count++, critterMatrix);
      }
      group.mesh.count = count; group.mesh.instanceMatrix.needsUpdate = true;
    }
  }};
};
