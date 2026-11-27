import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWorld} from '../src/slime/world';
import {bakeHeightField} from '../src/slime/height-field';
import {SlimeSolver} from '../src/slime/solver';
import {idlePose} from '../src/slime/types';
import {BUILD_ITEMS, propCollisionParts} from '../src/home/build-catalog';
import {plazaBoxes, portalSlots, quayPavilion} from '../src/home/layout';
import {sampleOceanWaveAt} from '../src/home/render/fft-ocean';
import {bakeIslandSDFData} from '../src/world/island-coast';
import {calibratePortalColors, PortalParticleField} from '../src/home/portal-vfx';
import {propStructures} from '../src/world/linqi/prop-structures';

test('OBB 旋转盒在 support、moveCapsule、projectPoint、cast 与 wallHit 下均精确贴合局部 6 面', () => {
  const yaw = Math.PI / 4; // 45° rotated wall: length 4m along local X, thin 0.4m along local Z
  const wall = {name: 'rot-wall', min: [-2, 0, -.2] as [number, number, number], max: [2, 2, .2] as [number, number, number], yaw, camera: true};
  const world = createWorld({indexBoxes: true, boxes: [wall], surfaces: [{min: [-10, -10], max: [10, 10], height: 0}]});

  // World point on the rotated wall top (local x=1.2, z=0 -> world (0.8485, -0.8485))
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const onTopX = 1.2 * c, onTopZ = -1.2 * s;
  assert.equal(world.support(onTopX, onTopZ, 2.0), 2);

  // World point in the empty AABB corner (local x=0, z=0.8 -> world (0.565, 0.565)) must NOT be blocked
  const cornerX = 0.8 * s, cornerZ = 0.8 * c;
  assert.equal(world.support(cornerX, cornerZ, 2.0), 0);
  const freeCast = world.cast([cornerX - 0.1, 1.0, cornerZ], [cornerX + 0.1, 1.0, cornerZ], 0.02);
  assert.equal(freeCast, null);

  // Ray straight through wall center along local +Z must hit at distance ~0.2m from center
  const a: [number, number, number] = [s * 1.2, 1.0, c * 1.2];
  const b: [number, number, number] = [-s * 1.2, 1.0, -c * 1.2];
  const hit = world.cast(a, b, 0.02);
  assert.ok(hit, 'ray hits rotated OBB');
  const distFromCenter = Math.hypot(hit!.point[0], hit!.point[2]);
  assert.ok(Math.abs(distFromCenter - 0.22) < 0.04, 'exact face distance: ' + distFromCenter);

  // wallHit returns exact rotated outward normal (local +Z -> world [sin(yaw), 0, cos(yaw)])
  const wh = world.wall([s * 0.55, 0.2, c * 0.55], [-s, -c], 0.6);
  assert.ok(wh, 'wallHit detects rotated OBB face');
  assert.ok(Math.abs(wh!.normal[0] - s) < 1e-3 && Math.abs(wh!.normal[2] - c) < 1e-3, 'outward normal matches yaw');

  // Capsule walking into rotated wall stops cleanly at face + radius
  const moved = world.moveCapsule([s * 0.8, 0.1, c * 0.8], [-s * 1.0, 0, -c * 1.0], 0.22, 0.52);
  const localZAfter = moved.position[0] * s + moved.position[2] * c;
  assert.ok(localZAfter >= 0.40 && localZAfter <= 0.44, 'capsule stopped cleanly at 0.20 + 0.22: ' + localZAfter);

  // Particle near rotated face is pushed out cleanly along local normal
  const pt: [number, number, number] = [s * 0.24, 1.0, c * 0.24];
  world.projectPoint(pt, 0.022);
  const pLocalZ = pt[0] * s + pt[2] * c;
  assert.ok(pLocalZ >= 0.29, 'particle kept skin + radius off rotated OBB: ' + pLocalZ);
});

test('HeightField.pushOut 消除 0.38–0.45m 死区且扩大逃逸半径避免粒子陷入实心立方体', () => {
  const quad = (a: number[], b: number[], c: number[], d: number[]) => [...a, ...b, ...c, ...a, ...c, ...d];
  const tris = [
    ...quad([-4, 0, -4], [4, 0, -4], [4, 0, 4], [-4, 0, 4]),
    // Solid 1m cube at [0..1, 0..1.5, 0..1]
    ...quad([0, 1.5, 0], [0, 1.5, 1], [1, 1.5, 1], [1, 1.5, 0]),
    ...quad([0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]),
  ];
  const hf = bakeHeightField(tris, {x0: -4, z0: -4, size: 8, cell: 0.1, ground: () => 0});
  const world = createWorld({boxes: [], surfaces: [], height: hf});

  // Particle at 0.41m below cube top (previously in 0.38..0.45 deadzone) and 0.35m deep inside cube
  const p: [number, number, number] = [0.35, 1.09, 0.5];
  world.projectPoint(p, 0.022);
  assert.ok(p[0] <= 0.01 || p[0] >= 0.99 || p[1] >= 1.5, 'particle escaped deadzone & deep interior: ' + JSON.stringify(p));
});

test('全部实心建筑与程序化 POI 均有精确 propStructures，六门与书埠凉亭碰撞开放通行', () => {
  for (const [id, def] of Object.entries(BUILD_ITEMS)) {
    if (!def.solid || def.farmBed) continue;
    assert.ok(propStructures[id], `solid item ${id} has calibrated propStructures`);
    const parts = propCollisionParts({id: 't-' + id, itemId: id, x: 10, y: 0, z: 20, yaw: 0.5, scale: 1});
    assert.ok(parts.length >= 1);
    for (const b of parts) assert.equal(b.yaw, 0.5, `${id} preserves exact OBB yaw`);
  }

  // Plaza 6 portals: doorway center is passable, pillars & roof are solid
  const pWorld = createWorld({indexBoxes: true, boxes: plazaBoxes(), surfaces: [{min: [-30, -30], max: [40, 40], height: 0}]});
  for (const slot of portalSlots) {
    const [x, , z] = slot.position;
    const fx = Math.sin(slot.yaw), fz = Math.cos(slot.yaw);
    const doorRay = pWorld.cast([x + fx * 1.2, 1.2, z + fz * 1.2], [x - fx * 1.2, 1.2, z - fz * 1.2], 0.05);
    assert.equal(doorRay, null, `portal ${slot.slot} central doorway stays passable`);
    const roofSup = pWorld.support(x, z, 4.6);
    assert.ok(roofSup !== null && roofSup > 4.2, `portal ${slot.slot} roof is solid`);
  }

  // Quay pavilion: solid roof/floor & passable center
  const pavDef = BUILD_ITEMS['pack-pavilion'];
  const pavBoxes = propCollisionParts({
    id: 'quay-pavilion', itemId: 'pack-pavilion',
    x: quayPavilion.x, y: 0, z: quayPavilion.z, yaw: 0,
    scale: quayPavilion.width / Math.max(pavDef.width, pavDef.depth),
  });
  const pavWorld = createWorld({indexBoxes: true, boxes: pavBoxes, surfaces: [{min: [-10, 10], max: [20, 40], height: 0}]});
  assert.ok(pavWorld.support(quayPavilion.x, quayPavilion.z, 0.5)! > 0.2);
  assert.equal(pavWorld.cast([quayPavilion.x - 0.3, 1.0, quayPavilion.z - 0.3], [quayPavilion.x + 0.3, 1.0, quayPavilion.z + 0.3]), null);
});

test('Gerstner 海浪采样满足近岸衰减、深海振幅与归一化法线，且驱动软体倾斜摇晃', () => {
  const sdf = bakeIslandSDFData([], 128);
  const wOpen0 = sampleOceanWaveAt(80, -70, 1.0, 0.6, sdf);
  const wOpen1 = sampleOceanWaveAt(80, -70, 2.5, 0.6, sdf);
  const nLen = Math.hypot(...wOpen0.normal);
  assert.ok(Math.abs(nLen - 1) < 1e-5, 'wave normal is unit length');
  assert.ok(wOpen0.normal[1] > 0.75, 'wave normal points predominantly upward');
  assert.ok(Math.abs(wOpen1.height - wOpen0.height) > 0.01, 'wave height evolves smoothly over time');

  // Compare wave RMS near shore vs open ocean
  let shoreSq = 0, openSq = 0;
  for (let i = 0; i < 20; i++) {
    const t = i * 0.4;
    shoreSq += sampleOceanWaveAt(31.5, 0, t, 0.6, sdf).height ** 2;
    openSq += sampleOceanWaveAt(95, 0, t, 0.6, sdf).height ** 2;
  }
  assert.ok(openSq > shoreSq * 2, 'waves damp significantly near shore compared to open sea');

  // SlimeSolver tilts particle lattice along waterNormal without trough pinning
  const oceanWorld = createWorld({
    boxes: [],
    surfaces: [{min: [-200, -200], max: [200, 200], height: -10}],
    fluids: [{min: [-200, -200], max: [200, 200], level: -0.38, sink: 0.14}],
  });
  const solver = new SlimeSolver([0, -0.78, 0], oceanWorld);
  for (let i = 0; i < 15; i++) {
    solver.step(1 / 60, {
      anchor: [0, -0.78, 0], velocity: [0, 0, 0], forward: [0, 0, -1],
      spread: 0, grounded: true, recalling: false, impact: 0, pose: idlePose(),
      dt: 1 / 60, quality: 'high', commands: [], generation: 0,
      waterNormal: [0.35, 0.9367, 0], waterWaveVelY: 0.3, submerged: false,
    });
  }
  // In a wave trough (-0.78 < flat -0.52), particles must follow the trough instead of pinning at -0.52!
  const avgY = solver.particles.reduce((s, p) => s + p.p[1], 0) / solver.particles.length;
  assert.ok(avgY < -0.50, 'floating particles ride down into wave trough without flat-plane pinning: ' + avgY);
});

test('传送门 HDR 调色与合批 GPU 粒子场正确构建', () => {
  const {core, mid, rim} = calibratePortalColors('#237767', '#49684a');
  const hslCore = {h: 0, s: 0, l: 0}, hslRim = {h: 0, s: 0, l: 0};
  core.getHSL(hslCore); rim.getHSL(hslRim);
  assert.ok(hslCore.l < 0.15, 'deep cosmic core preserves high contrast in bright daylight');
  assert.ok(hslRim.l > 0.65 && hslRim.s > 0.7, 'vivid rim ready for HDR bloom');
  assert.ok(mid.r + mid.g + mid.b > 0.5);

  const field = new PortalParticleField(portalSlots, 44);
  assert.equal(field.particleCount, 6 * 44);
  assert.equal(field.points.geometry.attributes.position.count, 6 * 44);
  field.sync(1.5, portalSlots.map(() => ({openLevel: 1, hover: 0.5, rimColor: new THREE.Color('#88ffee')})));
  field.dispose();
});
