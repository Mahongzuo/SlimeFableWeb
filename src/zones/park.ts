import {pathDistance} from '../world/map';
import {signpost, trees, tufts} from './kit';
import type {ZoneBuilder} from './types';
import {critterField} from './critter-field';

/** Windmill playground; all moving decoration is excluded from the static bake. */
export const park: ZoneBuilder = z => {
  const {T} = z, root = new T.Group();
  const mesh = (name: string, geometry: any, color: number, x: number, y: number, zz: number, parent = root) => {
    const m = new T.Mesh(geometry, z.toon(color));
    m.name = name; m.position.set(x, y, zz); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  };
  // Batch repeated parts by geometry/material, including benches, masonry and ladders.
  type Part = [number, number, number, number, number, number, number?, number?];
  const batch = (name: string, geometry: any, color: number, parts: Part[], parent = root) => {
    const m = new T.InstancedMesh(geometry, z.toon(color), parts.length), dummy = new T.Object3D();
    m.name = name;
    parts.forEach(([x, y, zz, sx, sy, sz, rx = 0, rz = 0], i) => {
      dummy.position.set(x, y, zz); dummy.scale.set(sx, sy, sz); dummy.rotation.set(rx, 0, rz);
      dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
    });
    m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  };
  const box = new T.BoxGeometry(1, 1, 1);
  root.add(signpost(z, 16, 34, Math.PI, '风车公园', '蘑菇弹跳 · 环形跑酷'));

  const towerY = z.ground(20, 64);
  mesh('windmill-stone-tower', new T.CylinderGeometry(1.25, 2, 5, 10), 0xdccdb3, 20, towerY + 2.5, 64);
  mesh('windmill-roof', new T.ConeGeometry(1.85, 2, 10), 0xc27664, 20, towerY + 6, 64);
  const bands: Part[] = [];
  for (let i = 0; i < 5; i++) { const r = 2 - i * .15; bands.push([20, towerY + i + .12, 64, r, .16, r]); }
  batch('windmill-stone-courses', new T.CylinderGeometry(1, 1, 1, 10), 0xb9ad97, bands);
  const blades = new T.Group(); blades.name = 'windmill-blades-fx'; blades.position.set(20, towerY + 4.4, 62.45); root.add(blades);
  batch('windmill-sails-fx', box, 0xffe5a4, [[0, 1.65, 0, .65, 2.8, .12], [1.65, 0, 0, 2.8, .65, .12], [0, -1.65, 0, .65, 2.8, .12], [-1.65, 0, 0, 2.8, .65, .12]], blades);
  mesh('windmill-hub-fx', new T.SphereGeometry(.3, 8, 6), 0x805d46, 0, 0, -.12, blades);

  const mushroomSites = [[-18, 40, .65], [-18, 49, .9], [-12, 44, 1.15], [-6, 48, 1.4], [-3, 55, .8]];
  const stems: Part[] = [];
  const mushrooms = mushroomSites.map(([x, zz, h], i) => {
    const y = z.ground(x, zz), radius = 1.35;
    stems.push([x, y + h / 2, zz, .42, h, .42]);
    const cap = mesh(`bounce-mushroom-cap-${i}`, new T.SphereGeometry(radius, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), [0xe78388, 0xf3bd59, 0x8faddb, 0x9fc96a, 0xc998cf][i], x, y + h, zz);
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
  batch('slide-walkable-ramp', box, 0x81c8c1, [[19, (sy + 2 + endY) / 2, 46.85, 1.5, .16, Math.hypot(4.3, drop), slope]]);
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
    for (const dx of [-.85, .85]) benchParts.push([x + dx, y + .25, zz, .16, .5, .55]);
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
  const spots: [number, number, number][] = [];
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI * 2, r = 19 + z.rand() * 4, x = Math.cos(a) * r * 1.3, zz = 55 + Math.sin(a) * r;
    if (pathDistance(x, zz) > 3 && x > -29 && x < 29 && Math.hypot(x - 20, zz - 64) > 5 && route.every(p => Math.hypot(x - p[0], zz - p[1]) > 3) && mushroomSites.every(p => Math.hypot(x - p[0], zz - p[1]) > 3)) spots.push([x, zz, .8 + z.rand() * .5]);
  }
  root.add(trees(z, spots, [0x7fb35f, 0x9cc46a, 0x6aa65c]));
  root.add(tufts(z, 5000, {min: [-29, 31], max: [30, 79]}, (x, zz) => pathDistance(x, zz) < 2.4));
  const homes: [number, number][] = [[-10, 45], [8, 50], [-18, 66], [24, 44], [-4, 72], [14, 72]];
  const updateCritters = critterField(z, root, 'park', homes);
  let clock = 0, started = 0, lastRing = 0, target = 0, hasPrevious = false;
  let px = 0, py = 0, pz = 0;
  const highlight = () => rings.forEach((r, i) => { r.mesh.material.emissive.setHex(i === target ? 0xffbf49 : 0x000000); r.mesh.material.emissiveIntensity = i === target ? .85 : 0; });
  highlight();
  return {root, update: (t, dt, player) => {
    updateCritters(t, dt, player);
    const step = Math.max(0, dt); clock += step; blades.rotation.z += step * Math.PI * 2 * .6;
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
