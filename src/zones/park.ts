import {SANS, tagTexture} from '../home/paper';
import {pathDistance} from '../world/map';
import {signpost, trees, tufts} from './kit';
import type {ZoneBuilder} from './types';
import {critterField} from './critter-field';
import {plazaLife} from './plaza-life';

/** Windmill playground; all moving decoration is excluded from the static bake. */
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
  const stems: Part[] = [];
  const mushrooms = mushroomSites.map(([x, zz, h], i) => {
    const y = z.ground(x, zz), radius = 1.35;
    stems.push([x, y + h / 2, zz, .42, h, .42]);
    const cap = mesh(`bounce-mushroom-cap-${i}`, new T.SphereGeometry(radius, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), [0xbd8c74, 0xc7ac72, 0x8fa9a3, 0x9eae7f, 0xb39b9a][i], x, y + h, zz);
    cap.scale.y = .32;
    return {x, z: zz, top: y + h + radius * .32, radius, cap, pulse: 0};
  });
  batch('mushroom-stems', new T.CylinderGeometry(1, 1.2, 1, 8), 0xffe9bf, stems);

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
  const sy = z.ground(19, 44), slideParts: Part[] = [[19, sy + 2, 44, 2, .2, 1.5], [18.3, sy + 1, 44, .15, 2, .15], [19.7, sy + 1, 44, .15, 2, .15]];
  for (let i = 0; i < 8; i++) slideParts.push([19, sy + .15 + i * .25, 43.3, 1.4, .12, .24]);
  batch('slide-ladder-platform', box, 0xe4bc76, slideParts);
  const endY = z.ground(19, 49) + .12, drop = sy + 2 - endY, slope = Math.atan2(drop, 4.3);
  batch('slide-walkable-ramp', box, 0x82a296, [[19, (sy + 2 + endY) / 2, 46.85, 1.5, .16, Math.hypot(4.3, drop), slope]]);
  const swingY = z.ground(-8, 65), swing: Part[] = [];
  for (const x of [-10, -6]) for (const side of [-1, 1]) swing.push([x, swingY + 1.6, 65 + side * .7, .18, 3.5, .18, side * .4]);
  swing.push([-8, swingY + 3.2, 65, 4.5, .22, .22]);
  batch('swing-frame', box, 0xa77c59, swing);
  batch('swing-rope-fx', box, 0xe8d7ab, [[-8.65, swingY + 2, 65, .05, 2.4, .05], [-7.35, swingY + 2, 65, .05, 2.4, .05]]);
  batch('swing-seat', box, 0xdf947b, [[-8, swingY + .8, 65, 1.6, .16, .65]]);

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
  // Plank landing, solid railings and a south-facing mill door with a blue-tile hood.
  for (let i = 0; i < 12; i++) add(timber, wood, 17.8 + i * .4, towerY + .08, 61.4, .38, .24, 2.2);
  for (const x of [17.8, 22.2]) for (const zz of [60.5, 61.4, 62.3]) {
    const bottom = z.ground(x, zz);
    add(timber, wood, x, (bottom + towerY + 1.1) / 2, zz, .18, towerY + 1.1 - bottom, .18);
    stone(x, bottom + .08, zz, .4, .16, .4);
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
  // Patchwork rubber tiles sit flush enough to leave the existing landing heights intact.
  const playAreas = [[19, 46, 6, 8], [-8, 65, 6, 5]];
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
    for (const side of [-1, 1]) {
      add(timber, wood, x + side * (width / 2 - .15), y + .45, zz, .15, .9, .8);
      add(timber, bamboo, x + side * (width / 2 - .15), y + 1.6, zz + .35, .12, 2.6, .12);
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
  root.add(trees(z, spots, [0x8ba17a, 0xa6b58b, 0x839b73]));
  root.add(tufts(z, 5000, {min: [-29, 31], max: [30, 79]}, (x, zz) => (x>=6.7 && x<=13.3 && zz<40) || pathDistance(x, zz) < 2.4
    || playAreas.some(([cx, cz, w, d]) => Math.abs(x - cx) < w / 2 + .2 && Math.abs(zz - cz) < d / 2 + .2)
    || (Math.abs(x - 20) < 1.2 && zz > 53 && zz < 63)
    || picnicSites.some(([px, pz]) => x > px - .3 && x < px + 2 && zz > pz - .3 && zz < pz + 1.8)));
  const homes: [number, number][] = [[-10, 45], [8, 50], [-18, 66], [24, 44], [-4, 72], [14, 72]];
  const updateCritters = critterField(z, root, 'park', homes);
  let clock = 0, started = 0, lastRing = 0, target = 0, hasPrevious = false;
  let px = 0, py = 0, pz = 0;
  const highlight = () => rings.forEach((r, i) => { r.mesh.material.emissive.setHex(i === target ? 0xffbf49 : 0x000000); r.mesh.material.emissiveIntensity = i === target ? .85 : 0; });
  highlight();
  const life = plazaLife(z, root, [4.2, 36.8], [19.5, 33.5]);
  return {root, update: (t, dt, player) => {
    life(t, dt, player);
    updateCritters(t, dt, player);
    const step = Math.max(0, dt); clock += step;
    const [x, y, zz] = player.position;
    for (const m of mushrooms) {
      m.pulse = Math.max(0, m.pulse - step);
      if (m.pulse === 0 && Math.abs(y - m.top) <= .25 && Math.hypot(x - m.x, zz - m.z) <= m.radius && player.velocity[1] <= 0) {
        player.launch([player.velocity[0], 9.5, player.velocity[2]]); player.mood('Happy'); m.pulse = .25;
      }
      m.cap.scale.y = .32 * (1 - .35 * Math.sin(Math.PI * m.pulse / .25));
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
