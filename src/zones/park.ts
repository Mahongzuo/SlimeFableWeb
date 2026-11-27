import {SANS, tagTexture} from '../home/paper';
import {getNativeTreeSpots} from '../home/garden-regions';
import {pathDistance} from '../world/map';
import {signpost, trees, tufts} from './kit';
import type {Box} from '../slime/types';
import type {ZoneBuilder} from './types';
import {critterField} from './critter-field';
import {plazaLife} from './plaza-life';

/** Builds a rich hand-painted mushroom cap texture (spotted glazed dome top + radial cream gills underneath). */
function makeMushroomTextures(T: any, topHex: string, midHex: string, rimHex: string, spotHex: string) {
  if (typeof document === 'undefined') return {map: null, emissiveMap: null};
  const S = 512;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d')!;
  const ec = document.createElement('canvas'); ec.width = ec.height = S;
  const eg = ec.getContext('2d')!;
  eg.fillStyle = '#000000';
  eg.fillRect(0, 0, S, S);

  // Canvas y = 0 corresponds to UV v = 1 (cap apex), y = S corresponds to UV v = 0 (underside stem join).
  const splitY = Math.round(S * 0.62); // Top 62% = dome exterior, bottom 38% = radial gills
  const topGrad = g.createLinearGradient(0, 0, 0, splitY);
  topGrad.addColorStop(0.0, topHex);
  topGrad.addColorStop(0.62, midHex);
  topGrad.addColorStop(0.92, rimHex);
  topGrad.addColorStop(1.0, '#f4e7cb');
  g.fillStyle = topGrad;
  g.fillRect(0, 0, S, splitY);

  // Soft storybook spots distributed organically across the cap dome (with wrap-around along X)
  let seed = topHex.charCodeAt(1) * 997 + midHex.charCodeAt(3) * 131;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 24; i++) {
    const sx = rand() * S;
    const sy = 26 + rand() * (splitY - 72);
    const rx = 11 + rand() * 17;
    const ry = rx * (0.72 + rand() * 0.28);
    for (const off of [-S, 0, S]) {
      const grad = g.createRadialGradient(sx + off, sy, rx * 0.12, sx + off, sy, rx);
      grad.addColorStop(0, spotHex);
      grad.addColorStop(0.72, spotHex);
      grad.addColorStop(1, 'rgba(255,248,232,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(sx + off, sy, rx, ry, 0, 0, Math.PI * 2);
      g.fill();

      // Gentle fairy-tale nocturnal glow on cap spots
      const eGrad = eg.createRadialGradient(sx + off, sy, rx * 0.1, sx + off, sy, rx * 1.15);
      eGrad.addColorStop(0, 'rgba(255,244,210,0.85)');
      eGrad.addColorStop(1, 'rgba(0,0,0,0)');
      eg.fillStyle = eGrad;
      eg.beginPath();
      eg.ellipse(sx + off, sy, rx * 1.15, ry * 1.15, 0, 0, Math.PI * 2);
      eg.fill();
    }
  }

  // Underside cream-amber radial gills (bottom 38% of UV height)
  const gillGrad = g.createLinearGradient(0, splitY, 0, S);
  gillGrad.addColorStop(0, '#f3e4c3');
  gillGrad.addColorStop(0.55, '#dfc89f');
  gillGrad.addColorStop(1, '#c3a87e');
  g.fillStyle = gillGrad;
  g.fillRect(0, splitY, S, S - splitY);
  const gillCount = 48;
  for (let i = 0; i < gillCount; i++) {
    const x = (i / gillCount) * S;
    g.fillStyle = i % 2 === 0 ? 'rgba(132,98,66,0.28)' : 'rgba(255,248,228,0.24)';
    g.fillRect(x, splitY, Math.max(2, S / gillCount * 0.45), S - splitY);
  }
  // Subtle warm bioluminescent tint under the gills at night
  const egGill = eg.createLinearGradient(0, splitY, 0, S);
  egGill.addColorStop(0, 'rgba(240,215,160,0.28)');
  egGill.addColorStop(1, 'rgba(200,175,120,0.08)');
  eg.fillStyle = egGill;
  eg.fillRect(0, splitY, S, S - splitY);

  const map = new T.CanvasTexture(c);
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = T.RepeatWrapping;
  map.wrapT = T.ClampToEdgeWrapping;
  const emissiveMap = new T.CanvasTexture(ec);
  emissiveMap.colorSpace = T.SRGBColorSpace;
  emissiveMap.wrapS = T.RepeatWrapping;
  emissiveMap.wrapT = T.ClampToEdgeWrapping;
  return {map, emissiveMap};
}

/**
 * Windmill playground; all moving decoration is excluded from the static bake.
 */
export const park: ZoneBuilder = z => {
  const {T} = z, root = new T.Group();
  const mesh = (name: string, geometry: any, color: number, x: number, y: number, zz: number, parent = root) => {
    const m = new T.Mesh(geometry, z.toon(color));
    m.name = name; m.position.set(x, y, zz); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  };
  // Batch repeated parts by geometry/material, including benches, masonry and ladders.
  type Part = [number, number, number, number, number, number, number?, number?, number?];
  const batch = (name: string, geometry: any, color: number, parts: Part[], parent = root) => {
    const m = new T.InstancedMesh(geometry, z.toon(color), parts.length), dummy = new T.Object3D(), shade = new T.Color();
    m.name = name;
    parts.forEach(([x, y, zz, sx, sy, sz, rx = 0, rz = 0, ry = 0], i) => {
      dummy.position.set(x, y, zz); dummy.scale.set(sx, sy, sz); dummy.rotation.set(rx, ry, rz);
      dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, shade.setScalar(.95 + z.rand() * .1));
    });
    m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  };
  const box = new T.BoxGeometry(1, 1, 1);
  root.add(signpost(z, 16, 34, Math.PI, '风车公园', '蘑菇弹跳 · 环形跑酷'));

  const towerY = z.ground(20, 64);
  const mushroomSites = [[-18, 40, .65], [-18, 49, .9], [-12, 44, 1.15], [-6, 48, 1.4], [-3, 55, .8]];
  // Strictly bottom-to-top LatheGeometry profile so outward normals face OUTSIDE (fixes inside-out transparent look!)
  const capProfile = (r: number) => {
    const pts: any[] = [
      new T.Vector2(0.001, -0.04),
      new T.Vector2(r * 0.34, -0.055),
      new T.Vector2(r * 0.72, -0.068),
      new T.Vector2(r * 0.94, -0.045),
      new T.Vector2(r * 1.00, 0.015),
    ];
    for (let i = 1; i <= 10; i++) {
      const t = i / 10;
      const a = (1 - t) * Math.PI * 0.48;
      pts.push(new T.Vector2(Math.max(0.001, Math.sin(a) * r), Math.cos(a) * r * 0.40));
    }
    const geo = new T.LatheGeometry(pts, 32);
    geo.computeVertexNormals();
    return geo;
  };
  // Curved mushroom stem with gently flared base and delicate annulus collar (bottom-to-top Y increasing!)
  const stemProfile = () => {
    const pts = [
      new T.Vector2(0.001, 0.0),
      new T.Vector2(0.62, 0.0),
      new T.Vector2(0.56, 0.16),
      new T.Vector2(0.45, 0.42),
      new T.Vector2(0.41, 0.68),
      new T.Vector2(0.52, 0.75), // soft annulus skirt ring
      new T.Vector2(0.39, 0.81),
      new T.Vector2(0.36, 1.02),
    ];
    const geo = new T.LatheGeometry(pts, 18);
    geo.computeVertexNormals();
    return geo;
  };
  const sharedCapGeo = capProfile(1.38);
  const sharedStemGeo = stemProfile();
  const capPalettes: [string, string, string, string][] = [
    ['#e56c58', '#d45142', '#a8342a', '#fff6e2'], // coral fairy red
    ['#f0bc58', '#dfa03c', '#b47422', '#fff9e6'], // honey amber gold
    ['#5db9b0', '#3f9b95', '#2a7272', '#ecfff9'], // celadon seafoam
    ['#86c466', '#62a44c', '#3d7936', '#f7ffe8'], // meadow moss green
    ['#b388d4', '#8d64b8', '#63418c', '#faf0ff'], // twilight lavender
  ];
  const stems: Part[] = [];
  const mushrooms = mushroomSites.map(([x, zz, h], i) => {
    const y = z.ground(x, zz), radius = 1.38;
    stems.push([x, y, zz, .92, h, .92]);
    const [topHex, midHex, rimHex, spotHex] = capPalettes[i % capPalettes.length];
    const tex = makeMushroomTextures(T, topHex, midHex, rimHex, spotHex);
    const capMat = z.toon(0xffffff, {
      noCache: true,
      roughness: 0.56,
      metalness: 0.02,
      ...(tex.map ? {map: tex.map} : {}),
    });
    if (tex.emissiveMap) {
      capMat.emissive = new T.Color(0xffe9be);
      capMat.emissiveMap = tex.emissiveMap;
      capMat.emissiveIntensity = 0.26;
      capMat.needsUpdate = true;
    }
    const cap = new T.Mesh(sharedCapGeo, capMat);
    cap.name = `bounce-mushroom-cap-${i}`;
    cap.position.set(x, y + h, zz);
    cap.castShadow = cap.receiveShadow = true;
    root.add(cap);
    return {x, z: zz, top: y + h + radius * 0.40, radius, cap, pulse: 0};
  });
  batch('mushroom-stems', sharedStemGeo, 0xf6e6c8, stems);

  // Clockwise route around the playground; rings 2/3 require the nearby bounce caps.
  const route = [[-12, 35, 1.2], [-18, 40, 3.5], [-18, 49, 3.5], [-23, 69, 1.3], [-7, 76, 1.6], [21, 75, 1.4], [26, 55, 1.6], [23, 37, 1.2]];
  const rings = route.map(([x, zz, h], i) => {
    const prev = route[(i + route.length - 1) % route.length], next = route[(i + 1) % route.length];
    const yaw = Math.atan2(next[0] - prev[0], next[1] - prev[1]);
    const ring = mesh(`park-ring-${i + 1}-fx`, new T.TorusGeometry(1.2, .1, 6, 24), 0xf2ca78, x, z.ground(x, zz) + h, zz);
    ring.rotation.y = yaw; ring.material = ring.material.clone();
    return {mesh: ring, nx: Math.sin(yaw), nz: Math.cos(yaw)};
  });
  const startY = z.ground(-12, 33) + .09;
  const start = mesh('park-start-slab', new T.CylinderGeometry(1.25, 1.35, .18, 8), 0x9eb9a7, -12, startY, 33);
  start.material = start.material.clone();
  z.interact({id: 'park-rings', position: [-12, startY, 33], radius: 3,
    prompt: () => ({title: '环形跑酷', sub: Number.isFinite(z.life.records['park-rings']) ? `最好成绩 ${(z.life.records['park-rings'] / 1000).toFixed(2)} 秒 · 按亮环顺序穿过` : '还没有纪录 · 穿过第一个亮环开始'}), act: () => {}});

  // A solid ramp and closely spaced climbable ladder rungs.
  const zoneBoxes: Box[] = [];
  const sy = z.ground(19, 44), slideParts: Part[] = [[19, sy + 2, 44, 2, .2, 1.5], [18.3, sy + 1, 44, .15, 2, .15], [19.7, sy + 1, 44, .15, 2, .15]];
  for (let i = 0; i < 8; i++) slideParts.push([19, sy + .15 + i * .25, 43.3, 1.4, .12, .24]);
  const slideMesh = batch('slide-ladder-platform', box, 0xe4bc76, slideParts);
  slideMesh.userData.skipHeightBake = true;
  zoneBoxes.push(
    {name: 'park-slide-deck', min: [18, sy + 1.9, 43.25], max: [20, sy + 2.1, 44.75], camera: false},
    {name: 'park-slide-post-l', min: [18.22, sy, 43.92], max: [18.38, sy + 2, 44.08], camera: true},
    {name: 'park-slide-post-r', min: [19.62, sy, 43.92], max: [19.78, sy + 2, 44.08], camera: true},
  );
  for (let i = 0; i < 8; i++) {
    const ry = sy + .15 + i * .25;
    zoneBoxes.push({name: `park-slide-rung-${i}`, min: [18.3, ry - .06, 43.18], max: [19.7, ry + .06, 43.42], camera: false});
  }
  const endY = z.ground(19, 49) + .12, drop = sy + 2 - endY, slope = Math.atan2(drop, 4.3);
  batch('slide-walkable-ramp', box, 0x82a296, [[19, (sy + 2 + endY) / 2, 46.85, 1.5, .16, Math.hypot(4.3, drop), slope]]);

  // Relocated handcrafted timber swing set on open meadow lawn (-9.5, 70.0), well clear of the stone path!
  // Entire assembly sets skipHeightBake=true so the overhead beam NEVER creates a 2.5D solid airwall over the seat.
  const swingX = -9.5, swingZ = 70.0, swingY = z.ground(swingX, swingZ);
  const swingGroup = new T.Group();
  swingGroup.name = 'park-swing-set';
  swingGroup.userData.skipHeightBake = true;
  root.add(swingGroup);

  const swingTimberMat = z.toon(0x8e623f);
  const swingDarkMat = z.toon(0x5c3e28);
  const swingStoneMat = z.toon(0xa8aca2);
  const swingIronMat = z.toon(0x465258);
  const swingRopeMat = z.toon(0xe6d3a3);
  const swingSeatMat = z.toon(0xdc8266);
  const swingTrimMat = z.toon(0xf4dfba);

  const addSwingPart = (geo: any, mat: any, px: number, py: number, pz: number, rx = 0, ry = 0, rz = 0, parent = swingGroup) => {
    const m = new T.Mesh(geo, mat);
    m.position.set(px, py, pz);
    m.rotation.set(rx, ry, rz);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  // Stone footings, tapered A-frame timber legs, cross-braces, decorative ridge beam & iron shackles
  const legGeo = new T.CylinderGeometry(0.085, 0.115, 3.55, 10);
  const footingGeo = new T.CylinderGeometry(0.18, 0.24, 0.28, 8);
  const braceGeo = new T.CylinderGeometry(0.06, 0.06, 1.85, 8);
  for (const dx of [-2.05, 2.05]) {
    for (const side of [-1, 1]) {
      const fz = swingZ + side * 1.12;
      const fy = z.ground(swingX + dx, fz);
      addSwingPart(footingGeo, swingStoneMat, swingX + dx, fy + 0.12, fz);
      addSwingPart(legGeo, swingTimberMat, swingX + dx, swingY + 1.62, swingZ + side * 0.58, side * 0.32);
    }
    // Side A-frame cross-brace + iron collar cap at apex
    addSwingPart(braceGeo, swingDarkMat, swingX + dx, swingY + 1.35, swingZ, Math.PI / 2);
    addSwingPart(new T.BoxGeometry(0.26, 0.26, 0.34), swingIronMat, swingX + dx, swingY + 3.22, swingZ);
  }
  // Sturdy rounded overhead top beam with carved finials
  addSwingPart(new T.CylinderGeometry(0.125, 0.125, 4.95, 12), swingTimberMat, swingX, swingY + 3.22, swingZ, 0, 0, Math.PI / 2);
  for (const endX of [-2.52, 2.52]) {
    addSwingPart(new T.SphereGeometry(0.145, 12, 10), swingDarkMat, swingX + endX, swingY + 3.22, swingZ);
  }
  for (const rx of [-0.72, 0.72]) {
    addSwingPart(new T.TorusGeometry(0.14, 0.028, 8, 16), swingIronMat, swingX + rx, swingY + 3.22, swingZ, 0, Math.PI / 2, 0);
  }

  // Animated pendulum pivot hanging from top beam (swings interactively when slime hops on!)
  const swingPivot = new T.Group();
  swingPivot.name = 'park-swing-pivot';
  swingPivot.position.set(swingX, swingY + 3.22, swingZ);
  swingGroup.add(swingPivot);

  const ropeLen = 2.38;
  const ropeGeo = new T.CylinderGeometry(0.026, 0.026, ropeLen, 8);
  const knotGeo = new T.TorusGeometry(0.042, 0.016, 6, 12);
  for (const rx of [-0.72, 0.72]) {
    addSwingPart(ropeGeo, swingRopeMat, rx, -ropeLen * 0.5, 0, 0, 0, 0, swingPivot);
    addSwingPart(knotGeo, swingIronMat, rx, -ropeLen + 0.06, 0, Math.PI / 2, 0, 0, swingPivot);
    addSwingPart(knotGeo, swingRopeMat, rx, -ropeLen - 0.04, 0, Math.PI / 2, 0, 0, swingPivot);
  }
  // Contoured wooden plank seat with chamfered edge trim & underside support battens
  addSwingPart(new T.BoxGeometry(1.66, 0.11, 0.66), swingSeatMat, 0, -ropeLen, 0, 0, 0, 0, swingPivot);
  addSwingPart(new T.BoxGeometry(1.72, 0.045, 0.72), swingTrimMat, 0, -ropeLen + 0.045, 0, 0, 0, 0, swingPivot);
  for (const bx of [-0.62, 0.62]) {
    addSwingPart(new T.BoxGeometry(0.12, 0.08, 0.58), swingDarkMat, bx, -ropeLen - 0.08, 0, 0, 0, 0, swingPivot);
  }

  // Clean open-air 3D OBB colliders: side legs + overhead beam + walkable seat (zero airwall inside!)
  for (const dx of [-2.05, 2.05]) {
    for (const side of [-1, 1]) {
      zoneBoxes.push({
        name: `park-swing-leg-${dx > 0 ? 'r' : 'l'}-${side > 0 ? 'f' : 'b'}`,
        min: [swingX + dx - 0.13, swingY, swingZ + side * 0.85 - 0.14],
        max: [swingX + dx + 0.13, swingY + 3.2, swingZ + side * 0.85 + 0.14],
        camera: true,
      });
    }
  }
  const pivotY = swingY + 3.22;
  const seatRadius = ropeLen - 0.0675; // distance from top beam pivot to top surface of seat plank
  const swingSeatBox: Box = {
    name: 'park-swing-seat',
    min: [swingX - 0.84, pivotY - seatRadius - 0.18, swingZ - 0.38],
    max: [swingX + 0.84, pivotY - seatRadius, swingZ + 0.38],
    camera: false,
  };
  zoneBoxes.push(
    {name: 'park-swing-beam', min: [swingX - 2.45, swingY + 3.08, swingZ - 0.15], max: [swingX + 2.45, swingY + 3.36, swingZ + 0.15], camera: true},
    swingSeatBox,
  );

  const benchParts: Part[] = [], lampParts: Part[] = [], lights: Part[] = [];
  for (const [x, zz] of [[17, 38], [9, 55], [-3, 70], [7, 76]]) {
    const y = z.ground(x, zz);
    benchParts.push([x, y + .55, zz, 2.4, .18, .7], [x, y + 1.05, zz + .3, 2.4, .65, .12]);
    for (const dx of [-.85, .85]) benchParts.push([x + dx, y + .25, zz, .16, .5, .55],
      [x + dx, y + .83, zz, .15, .15, .8], [x + dx, y + .7, zz - .22, .15, .3, .15]);
  }
  batch('park-benches', box, 0xb88b64, benchParts);
  for (const [x, zz] of [[7, 35], [17, 41], [11, 49], [-1, 56], [7, 65], [-3, 77]]) {
    const y = z.ground(x, zz); lampParts.push([x, y + 1.7, zz, .1, 3.4, .1]); lights.push([x, y + 3.45, zz, .3, .4, .3]);
  }
  batch('park-lampposts', new T.CylinderGeometry(1, 1.3, 1, 6), 0x667d78, lampParts);
  batch('park-lanterns-fx', new T.IcosahedronGeometry(1, 0), 0xffdc8d, lights);
  const bricks: Part[] = [], flowers: Part[] = [];
  for (const [x, zz] of [[-3, 38], [13, 72]]) {
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, bx = x + Math.cos(a) * 1.7, bz = zz + Math.sin(a) * 1.7; bricks.push([bx, z.ground(bx, bz) + .18, bz, .45, .36, .45]); }
    for (let i = 0; i < 24; i++) { const a = z.rand() * Math.PI * 2, r = Math.sqrt(z.rand()) * 1.3, fx = x + Math.cos(a) * r, fz = zz + Math.sin(a) * r; flowers.push([fx, z.ground(fx, fz) + .35, fz, .18, .28, .18]); }
  }
  batch('flowerbed-brick-border', box, 0xc98d78, bricks).name = 'garden-brick-border';
  const blooms = batch('park-flowers', new T.IcosahedronGeometry(1, 0), 0xffffff, flowers), tint = new T.Color();
  flowers.forEach((_, i) => blooms.setColorAt(i, tint.setHex([0xf1a4b2, 0xf6cc6e, 0xb4a1d5][i % 3])));
  // Shared colour-per-instance batches keep all added furniture to five draw calls.
  type Detail = {part: Part; color: number};
  const timber: Detail[] = [], round: Detail[] = [], soft: Detail[] = [], fruit: Detail[] = [], hoops: Detail[] = [];
  const P = z.ctx.P, wood = 0x99734f, bamboo = 0xc3a36d, tile = 0x596d70, red = 0xb64d3f;
  const add = (list: Detail[], color: number, ...part: Part) => list.push({part, color});
  const stone = (x: number, y: number, zz: number, sx: number, sy: number, sz: number) => add(timber, P.concrete, x, y, zz, sx, sy, sz);
  // Grounded stone terrace foundation + plank landing and railings seated solidly on the flat windmill plateau.
  stone(20, towerY - .26, 62.6, 4.9, .62, 4.4);
  for (let i = 0; i < 12; i++) add(timber, wood, 17.8 + i * .4, towerY + .10, 61.4, .38, .18, 2.2);
  for (const x of [17.8, 22.2]) for (const zz of [60.5, 61.4, 62.3]) {
    const bottom = Math.min(z.ground(x, zz), towerY - .15);
    add(timber, wood, x, (bottom + towerY + 1.1) / 2, zz, .18, towerY + 1.1 - bottom, .18);
    stone(x, towerY + .06, zz, .38, .12, .38);
  }
  for (const x of [17.8, 22.2]) for (const h of [.6, 1.05]) add(timber, wood, x, towerY + h, 61.4, .16, .16, 2);
  for (const x of [18.4, 21.6]) for (const h of [.6, 1.05]) add(timber, wood, x, towerY + h, 60.5, 1.2, .16, .16);

  // Close-set stone treads are embedded into the mound rather than floating above it.
  const stairStart = z.ground(20, 53.5) + .16;
  for (let i = 0; i < 19; i++) {
    const zz = 53.5 + i * .36;
    const top = stairStart + (towerY + .2 - stairStart) * i / 18;
    for (const dx of [-.48, .48]) {
      const thickness = Math.max(.36, top - z.ground(20 + dx, zz) + .12);
      stone(20 + dx, top - thickness / 2, zz, .94, thickness, .4);
    }
  }
  // Patchwork rubber tiles sit flush on open meadow grass under the slide and relocated swing set.
  const playAreas = [[19, 46, 6, 8], [swingX, swingZ, 5, 5]];
  for (const [cx, cz, width, depth] of playAreas) for (let ix = 0; ix < width; ix++) for (let iz = 0; iz < depth; iz++) {
    const x = cx + ix - width / 2 + .5, zz = cz + iz - depth / 2 + .5;
    add(soft, [0xb97762, 0x7eaaa0, 0xd2b578][(Math.floor(ix / 2) + Math.floor(iz / 2)) % 3], x, z.ground(x, zz) + .025, zz, .98, .05, .98);
  }
  for (const [x, zz] of [[17, 38], [9, 55], [-3, 70], [7, 76]]) {
    const bx = x + 1.85, by = z.ground(bx, zz), dx = x - 1.85, dy = z.ground(dx, zz);
    stone(bx, by + .1, zz, .85, .2, .85);
    add(round, tile, bx, by + .55, zz, .32, .85, .32);
    add(round, wood, bx, by + 1, zz, .38, .12, .38);
    add(soft, 0x303b38, bx, by + .85, zz - .325, .3, .14, .02);
    for (let k = 0; k < 10; k++) {
      const a = k * Math.PI / 5;
      add(timber, wood, bx + Math.sin(a) * .33, by + .52, zz + Math.cos(a) * .33, .09, .65, .09);
    }
    stone(dx, dy + .45, zz, .45, .9, .45);
    stone(dx, dy + .94, zz, .75, .18, .65);
    add(round, 0x536b69, dx, dy + 1.04, zz, .26, .04, .21);
    add(round, P.concrete, dx, dy + 1.15, zz + .2, .035, .35, .035);
    add(round, P.concrete, dx, dy + 1.3, zz + .1, .035, .22, .035, Math.PI / 2);
  }
  for (const [x, zz] of [[7, 35], [17, 41], [11, 49], [-1, 56], [7, 65], [-3, 77]]) stone(x, z.ground(x, zz) + .1, zz, .55, .2, .55);
  // Picnic clusters: woven bamboo baskets, handles, cups and checked cloths.
  const picnicSites = [[-23, 56], [-16, 73], [2, 43], [24, 70], [2, 60], [-23, 34]];
  for (const [x, zz] of picnicSites) {
    for (let ix = 0; ix < 6; ix++) for (let iz = 0; iz < 5; iz++) {
      const px = x + ix * .35, pz = zz + iz * .35;
      add(soft, (ix + iz) % 2 ? 0xe5d8b7 : 0x9cafa1, px, z.ground(px, pz) + .035, pz, .35, .04, .35);
    }
    const y = z.ground(x, zz);
    add(round, bamboo, x, y + .25, zz, .3, .45, .25);
    for (let k = 0; k < 5; k++) add(hoops, wood, x, y + .08 + k * .085, zz, .29, .25, .29, Math.PI / 2);
    add(hoops, bamboo, x, y + .54, zz, .28, .3, .28);
    for (const dx of [.7, 1]) add(round, 0xe8dfc8, x + dx, z.ground(x + dx, zz + .5) + .13, zz + .5, .09, .2, .09);
  }
  // Village kite stall and handcart, outside the timed route and bounce clearances.
  const kx = -1, kz = 48, ky = z.ground(kx, kz), cx = 12, cz = 40, cy = z.ground(cx, cz);
  for (const [x, y, zz, width] of [[kx, ky, kz, 2.8], [cx, cy, cz, 1.8]]) {
    add(timber, wood, x, y + .9, zz, width, .2, 1);
    zoneBoxes.push(
      {name: `park-stall-counter-${x}`, min: [x - width / 2, y + .8, zz - .5], max: [x + width / 2, y + 1.0, zz + .5], camera: false},
      {name: `park-stall-roof-${x}`, min: [x - width / 2, y + 2.74, zz - .75], max: [x + width / 2, y + 2.96, zz + .75], camera: true},
    );
    for (const side of [-1, 1]) {
      add(timber, wood, x + side * (width / 2 - .15), y + .45, zz, .15, .9, .8);
      add(timber, bamboo, x + side * (width / 2 - .15), y + 1.6, zz + .35, .12, 2.6, .12);
      const sx = x + side * (width / 2 - .15);
      zoneBoxes.push(
        {name: `park-stall-leg-${x}-${side}`, min: [sx - .08, y, zz - .4], max: [sx + .08, y + .9, zz + .4], camera: true},
        {name: `park-stall-post-${x}-${side}`, min: [sx - .07, y + .3, zz + .28], max: [sx + .07, y + 2.9, zz + .42], camera: true},
      );
    }
    for (let i = 0; i < 8; i++) add(timber, tile, x + (i - 3.5) * width / 8, y + 2.85, zz, width / 8 - .015, .16, 1.5, -.12);
  }
  for (let i = 0; i < 5; i++) {
    const x = kx - .95 + i * .47, y = ky + 1.8 + (i % 2) * .2;
    // Diamond kites with bamboo cross ribs and knotted tails, not hanging flags.
    add(soft, [0xc77a60, 0x74a6ad, 0xd9b65d][i % 3], x, y, kz + .25, .43, .43, .045, 0, Math.PI / 4);
    add(soft, bamboo, x, y, kz + .21, .035, .62, .03);
    add(soft, bamboo, x, y, kz + .21, .62, .035, .03);
    for (let k = 0; k < 3; k++) add(soft, red, x + Math.sin(k) * .05, y - .4 - k * .12, kz + .23, .1, .05, .04, 0, .4);
    add(round, bamboo, x, ky + 1.06, kz - .18, .1, .12, .1);
  }
  add(timber, red, cx, cy + .65, cz, 1.55, .6, .85);
  for (const x of [cx - .95, cx + .95]) {
    add(hoops, 0x514f46, x, cy + .38, cz, .34, .34, .34, 0, 0, Math.PI / 2);
    add(timber, wood, x, cy + .38, cz, .15, .6, .1);
    add(timber, wood, x, cy + .38, cz, .15, .1, .6);
  }
  for (const x of [cx - .6, cx + .6]) add(timber, wood, x, cy + .9, cz + .85, .12, .12, 1.1);
  add(round, bamboo, cx, cy + 1.2, cz, .28, .4, .28);
  for (let i = 0; i < 9; i++) {
    const x = cx + (i % 3 - 1) * .16, zz = cz + (Math.floor(i / 3) - 1) * .16;
    add(soft, bamboo, x, cy + 1.65, zz, .025, .9, .025);
    for (let k = 0; k < 4; k++) add(fruit, red, x, cy + 1.55 + k * .14, zz, .08, .08, .08);
  }
  const label = (text: string, x: number, y: number, zz: number, width: number) => {
    const map = tagTexture(T, (c, w, h) => {
      c.fillStyle = '#ead9b4'; c.fillRect(0, 0, w, h); c.strokeStyle = '#916c48'; c.lineWidth = 14; c.strokeRect(8, 8, w - 16, h - 16);
      c.fillStyle = '#633d2b'; c.font = `700 64px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2);
    });
    const board = mesh('park-stall-sign-fx', new T.BoxGeometry(width, .5, .08), 0xffffff, x, y, zz);
    board.material = z.toon(0xffffff, {map}); board.rotation.y = Math.PI;
  };
  label('风筝 5元', kx, ky + 2.52, kz - .55, 1.8);
  label('冰糖葫芦', cx, cy + 2.52, cz - .55, 1.5);
  // Distributed ground dressing gives the peripheral lawns a lived-in foreground.
  for (let iz = 0; iz < 15; iz++) for (let ix = 0; ix < 19; ix++) {
    const x = -28 + ix * 3 + z.rand(), zz = 32 + iz * 3 + z.rand();
    if (pathDistance(x, zz) < 2.6 || route.some(p => Math.hypot(x - p[0], zz - p[1]) < 2) || Math.hypot(x - 20, zz - 64) < 4) continue;
    for (let k = 0; k < 3; k++) {
      const px = x + k * .14, pz = zz + Math.sin(k) * .2;
      add(fruit, k === 0 ? P.gravel : 0xb6a276, px, z.ground(px, pz) + .035, pz, .08 + z.rand() * .06, .04, .07);
    }
  }
  const details = (name: string, geometry: any, items: Detail[]) => {
    const m = batch(name, geometry, 0xffffff, items.map(d => d.part)), color = new T.Color();
    items.forEach((d, i) => m.setColorAt(i, color.setHex(d.color).multiplyScalar(.95 + z.rand() * .1)));
  };
  details('park-solid-wood-stone', box, timber);
  details('park-solid-bamboo-metal', new T.CylinderGeometry(1, 1, 1, 10), round);
  details('park-cloth-kites-fx', box, soft);
  details('park-tanghulu-pebbles-fx', new T.IcosahedronGeometry(1, 1), fruit);
  details('park-basket-handles-wheels', new T.TorusGeometry(1, .1, 5, 12), hoops);
  const spots: [number, number, number][] = [];
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI * 2, r = 19 + z.rand() * 4, x = Math.cos(a) * r * 1.3, zz = 55 + Math.sin(a) * r;
    if ((x<1 || x>15 || zz>43) && pathDistance(x, zz) > 3 && x > -29 && x < 29 && Math.hypot(x - 20, zz - 64) > 5 && route.every(p => Math.hypot(x - p[0], zz - p[1]) > 3) && mushroomSites.every(p => Math.hypot(x - p[0], zz - p[1]) > 3)) spots.push([x, zz, .8 + z.rand() * .5]);
  }
  const parkNativeTrees = getNativeTreeSpots('park');
  root.add(trees(z, spots, [0x5db84d, 0x78cb54, 0x4aa85c]));
  root.add(tufts(z, 5000, {min: [-29, 31], max: [30, 79]}, (x, zz) => (x>=6.7 && x<=13.3 && zz<40) || pathDistance(x, zz) < 2.45
    || playAreas.some(([cx, cz, w, d]) => Math.abs(x - cx) < w / 2 + .32 && Math.abs(zz - cz) < d / 2 + .32)
    || (Math.abs(x - 20) < 1.35 && zz > 53 && zz < 63)
    || Math.hypot(x + 18.5, zz - 65.0) < 2.65
    || spots.some(([tx, tz, ts]) => Math.hypot(x - tx, zz - tz) < Math.max(0.80, ts * 0.58 + 0.38))
    || parkNativeTrees.some(([tx, tz, r]) => Math.hypot(x - tx, zz - tz) < r)
    || mushroomSites.some(([mx, mz]) => Math.hypot(x - mx, zz - mz) < 1.05)
    || picnicSites.some(([px, pz]) => x > px - .35 && x < px + 2.1 && zz > pz - .35 && zz < pz + 1.9)));
  const homes: [number, number][] = [[-10, 45], [8, 50], [-18, 66], [24, 44], [-4, 72], [14, 72]];
  const updateCritters = critterField(z, root, 'park', homes);
  let clock = 0, started = 0, lastRing = 0, target = 0, hasPrevious = false;
  let px = 0, py = 0, pz = 0;
  let swingAngle = 0, swingVel = 0, ridingSwing = false, swingRideTime = 0, swingStarted = false, lastBoxAngle = 0;
  let seatLocalX = 0, dismountCooldown = 0, moveHoldTime = 0, moveReleasedSinceMount = false;
  const highlight = () => rings.forEach((r, i) => { r.mesh.material.emissive.setHex(i === target ? 0xffbf49 : 0x000000); r.mesh.material.emissiveIntensity = i === target ? .85 : 0; });
  highlight();
  const life = plazaLife(z, root, [4.2, 36.8], [19.5, 33.5], zoneBoxes);
  return {root, boxes: zoneBoxes, update: (t, dt, player) => {
    life(t, dt, player);
    updateCritters(t, dt, player);
    const step = Math.max(0, dt); clock += step;
    const sdt = Math.min(step, 0.05);
    if (dismountCooldown > 0) dismountCooldown = Math.max(0, dismountCooldown - sdt);
    const [x, y, zz] = player.position;
    // Interactive damped pendulum swing physics:
    // 1. Landing on the seat locks the slime cleanly onto the plank (zero sliding/clipping).
    // 2. Waits 1.0s calmly, then swings smoothly while carrying the slime & tilted PBF ridePlane in exact lockstep.
    // 3. Only dismounts when the player actively operates (Space jump, right-click dash, or deliberate WASD input).
    const prevSeatZ = swingZ - seatRadius * Math.sin(swingAngle);
    const prevSeatTopY = pivotY - seatRadius * Math.cos(swingAngle);
    const activeMove = !!player.hasMoveInput;
    const activeJump = player.velocity[1] > 1.2;
    const activeDash = !!player.isDashing;

    if (!ridingSwing) {
      const canMount = dismountCooldown <= 0 && !player.clinging && !activeJump && !activeDash
        && Math.abs(x - swingX) < 0.84
        && Math.abs(zz - prevSeatZ) < 0.46
        && y >= prevSeatTopY - 0.24 && y <= prevSeatTopY + 0.28;
      if (canMount) {
        ridingSwing = true;
        seatLocalX = Math.max(-0.52, Math.min(0.52, x - swingX));
        swingRideTime = 0;
        swingStarted = false;
        moveHoldTime = 0;
        moveReleasedSinceMount = !activeMove;
        player.mood('Happy', 0.6);
      }
    } else {
      // Only leave the swing when the player actively jumps, dashes, clings, or gives deliberate WASD input
      let wantDismount = activeJump || activeDash || player.clinging;
      if (!wantDismount) {
        if (activeMove) {
          moveHoldTime += sdt;
          if (moveReleasedSinceMount || moveHoldTime >= 0.22) wantDismount = true;
        } else {
          moveReleasedSinceMount = true;
          moveHoldTime = 0;
        }
      }
      if (wantDismount) {
        ridingSwing = false;
        dismountCooldown = 0.45;
        swingRideTime = 0;
        swingStarted = false;
        player.clearRide?.();
        if (activeJump && Math.abs(swingVel) > 0.35) {
          const tangZ = -swingVel * seatRadius * Math.cos(swingAngle);
          const tangY = swingVel * seatRadius * Math.sin(swingAngle);
          player.launch([player.velocity[0], Math.max(player.velocity[1], 7.2) + Math.max(0, tangY * 0.45), player.velocity[2] + tangZ * 1.15]);
          player.mood('Happy', 1.0);
        }
      }
    }

    if (ridingSwing) {
      swingRideTime += sdt;
      if (swingRideTime < 1.0) {
        // Hold steady for 1.0s after mounting the seat before starting to swing
        const acc = -(9.8 / ropeLen) * Math.sin(swingAngle) - 6.0 * swingVel;
        swingVel += acc * sdt;
        swingAngle = Math.max(-0.58, Math.min(0.58, swingAngle + swingVel * sdt));
      } else {
        if (!swingStarted) {
          swingStarted = true;
          swingVel = -1.45;
          player.mood('Happy', 1.1);
        }
        const targetAmp = 0.50;
        const omega2 = 9.8 / ropeLen;
        const energy = 0.5 * swingVel * swingVel + omega2 * (1 - Math.cos(swingAngle));
        const targetEnergy = omega2 * (1 - Math.cos(targetAmp));
        const autoPump = (energy < targetEnergy ? 1.55 : -0.45) * Math.tanh(swingVel * 2.4);
        const acc = -omega2 * Math.sin(swingAngle) - 0.14 * swingVel + autoPump;
        swingVel += acc * sdt;
        swingAngle = Math.max(-0.62, Math.min(0.62, swingAngle + swingVel * sdt));
      }
    } else {
      const breeze = Math.sin(t * 1.35) * 0.04;
      const acc = -(9.8 / ropeLen) * Math.sin(swingAngle) - 0.85 * swingVel + breeze;
      swingVel += acc * sdt;
      swingAngle = Math.max(-0.62, Math.min(0.62, swingAngle + swingVel * sdt));
    }

    const nextSeatZ = swingZ - seatRadius * Math.sin(swingAngle);
    const nextSeatTopY = pivotY - seatRadius * Math.cos(swingAngle);
    const seatNormal: [number, number, number] = [0, Math.cos(swingAngle), Math.sin(swingAngle)];
    swingPivot.rotation.x = swingAngle;
    // Keep the seat collider synchronized with the swinging wooden plank
    swingSeatBox.min[1] = nextSeatTopY - 0.18;
    swingSeatBox.max[1] = nextSeatTopY;
    swingSeatBox.min[2] = nextSeatZ - 0.38;
    swingSeatBox.max[2] = nextSeatZ + 0.38;
    if (Math.abs(swingAngle - lastBoxAngle) > 0.0015) {
      lastBoxAngle = swingAngle;
      player.refreshBoxes?.();
    }
    if (ridingSwing) {
      // Lock slime position & tilted PBF ridePlane cleanly onto the swinging plank surface (zero clipping, zero drift!)
      const seatPos: [number, number, number] = [swingX + seatLocalX, nextSeatTopY, nextSeatZ];
      const plane = {point: [swingX, nextSeatTopY, nextSeatZ] as [number, number, number], normal: seatNormal};
      if (player.seatAt) player.seatAt(seatPos, plane);
      else player.carry?.([seatPos[0] - x, nextSeatTopY - prevSeatTopY, nextSeatZ - prevSeatZ], nextSeatTopY);
    }
    for (const m of mushrooms) {
      m.pulse = Math.max(0, m.pulse - step);
      if (m.pulse === 0 && y >= m.top - .35 && y <= m.top + .55 && Math.hypot(x - m.x, zz - m.z) <= m.radius + .15 && player.velocity[1] <= .8) {
        // Sky-high ~5x launch velocity (compensates for SlimeCharacter variable jump deceleration)
        player.launch([player.velocity[0] * 1.08, 23.5, player.velocity[2] * 1.08]); player.mood('Happy', 1.4); m.pulse = .30;
      }
      const squash = Math.sin(Math.PI * m.pulse / .30);
      m.cap.scale.set(1 + .18 * squash, 1 - .42 * squash, 1 + .18 * squash);
    }
    const onStart = Math.hypot(x + 12, zz - 33) < 1.25 && Math.abs(y - startY - .09) < .3;
    start.material.emissive.setHex(onStart ? 0x80dfad : 0x000000); start.material.emissiveIntensity = .65;
    if (target > 0 && clock - lastRing >= 60) { target = 0; highlight(); player.toast('环形跑酷已重置 · 回到第一个亮环'); }
    if (hasPrevious) {
      const r = rings[target], c = r.mesh.position;
      const before = (px - c.x) * r.nx + (pz - c.z) * r.nz, after = (x - c.x) * r.nx + (zz - c.z) * r.nz;
      if ((before < 0 && after >= 0) || (before > 0 && after <= 0)) {
        const fraction = before / (before - after), ix = px + (x - px) * fraction - c.x, iz = pz + (zz - pz) * fraction - c.z;
        const iy = py + (y - py) * fraction + .3 - c.y;
        if (Math.hypot(ix * r.nz - iz * r.nx, iy) < 1.1) {
          const crossedAt = clock - step + step * fraction;
          if (target === 0) { started = crossedAt; player.toast('环形跑酷开始！追随亮环'); }
          lastRing = crossedAt; target++;
          if (target === rings.length) {
            const elapsed = Math.max(1, Math.round((crossedAt - started) * 1000)), best = z.life.records['park-rings'];
            const record = !Number.isFinite(best) || elapsed < best;
            if (record) { z.life.records['park-rings'] = elapsed; z.save(); }
            player.toast(`完成！${(elapsed / 1000).toFixed(2)} 秒${record ? ' · 新纪录！' : ''}`); player.mood('Happy'); target = 0;
          }
          highlight();
        }
      }
    }
    px = x; py = y; pz = zz; hasPrevious = true;
  }};
};
