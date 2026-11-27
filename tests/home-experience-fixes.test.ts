import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWorld} from '../src/slime/world';
import {bakeHeightField} from '../src/slime/height-field';
import {SlimeSolver} from '../src/slime/solver';
import {SurfaceBuilder} from '../src/slime/surface';
import {idlePose, type Box, type Vec} from '../src/slime/types';
import {SKILL_KITS} from '../src/slime/skills';
import {SkillVfxSystem} from '../src/slime/skill-vfx';
import {propCollisionParts} from '../src/home/build-catalog';

test('简化后的月洞墙单 OBB 碰撞与零分配 Marching Cubes 表面求解高效流畅', () => {
  const boxes: Box[] = [];
  const addWall = (x: number, z: number, yaw: number, length: number, wallIdx: number) => {
    const w = length + .16, d = .36;
    boxes.push({name: `quay-wall-${wallIdx}`, min: [x - w / 2, 0, z - d / 2], max: [x + w / 2, 1.98, z + d / 2], yaw, camera: true});
  };
  addWall(20.6, 12.2, -1.13, 3.75, 0);
  addWall(21.45, 17.3, -Math.PI / 2, 4.35, 1);
  addWall(20.45, 22.6, -1.99, 3.6, 2);

  const world = createWorld({indexBoxes: true, boxes, surfaces: [{min: [-30, -30], max: [40, 40], height: 0}]});
  assert.ok(Math.abs((world.support(21.45, 17.3, 2.05) ?? 0) - 1.98) < 1e-4, 'wall top is y=1.98');
  assert.ok(world.wall([21.0, 0.2, 17.3], [1, 0], 0.6) !== null, 'garden wall remains climbable');

  const solver = new SlimeSolver([21.45, 1.98, 17.3], world);
  const surface = new SurfaceBuilder();
  const input = {
    anchor: [21.45, 1.98, 17.3] as Vec, velocity: [0, 0, 0] as Vec, forward: [0, 0, -1] as Vec,
    spread: 0, grounded: true, recalling: false, impact: 0, pose: idlePose(),
    dt: 1 / 60, quality: 'high' as const, commands: [], cling: null, generation: 0,
    shapeBlend: 1, jumpStretch: 0, airBounce: 0, glideAmount: 0,
  };
  const flat = createWorld({boxes: [], surfaces: [{min: [-30, -30], max: [40, 40], height: 0}]});
  const flatSolver = new SlimeSolver([0, 0, 0], flat);
  const flatSurface = new SurfaceBuilder();
  const flatInput = {...input, anchor: [0, 0, 0] as Vec};
  for (let i = 0; i < 6; i++) {
    flatSolver.step(1 / 60, flatInput); flatSurface.build(flatSolver, 'high');
    solver.step(1 / 60, input); surface.build(solver, 'high');
  }
  const tf0 = performance.now();
  for (let i = 0; i < 12; i++) { flatSolver.step(1 / 60, flatInput); flatSurface.build(flatSolver, 'high'); }
  const flatAvgMs = (performance.now() - tf0) / 12;

  const t0 = performance.now();
  let verts = 0;
  let overflowCount = 0;
  for (let i = 0; i < 12; i++) {
    solver.step(1 / 60, input);
    const frame = surface.build(solver, 'high');
    verts = frame.count;
    if (frame.overflow) overflowCount++;
  }
  const avgMs = (performance.now() - t0) / 12;
  assert.ok(verts > 500, 'fluid mesh generated on wall top: ' + verts);
  assert.equal(overflowCount, 0, 'no vertex overflow rebuilds on wall top');
  assert.ok(avgMs <= Math.max(flatAvgMs * 1.6, 25), `simplified wall sim+mesh (${avgMs.toFixed(2)}ms) should stay close to flat ground (${flatAvgMs.toFixed(2)}ms)`);
});

test('树木不可攀爬但保留实心阻挡（含 GLB 树干与 HeightField 树干），建筑保持可攀爬且坡屋顶无高空悬空', () => {
  // 1. Placed / native tree props (nature-willow, pack-ginkgo)
  const willowBoxes = propCollisionParts({id: 't-willow', itemId: 'nature-willow', x: 0, y: 0, z: 0, yaw: 0, scale: 1});
  const ginkgoBoxes = propCollisionParts({id: 't-ginkgo', itemId: 'pack-ginkgo', x: 6, y: 0, z: 0, yaw: 0, scale: 1});
  assert.ok(willowBoxes.length > 0 && willowBoxes.every(b => b.climbable === false), 'willow trunk is non-climbable');
  assert.ok(ginkgoBoxes.length > 0 && ginkgoBoxes.every(b => b.climbable === false), 'ginkgo trunk is non-climbable');

  const treeWorld = createWorld({indexBoxes: true, boxes: [...willowBoxes, ...ginkgoBoxes], surfaces: [{min: [-10, -10], max: [20, 20], height: 0}]});
  // Solid blocking still works
  const walkIntoWillow = treeWorld.moveCapsule([-0.8, 0, 0], [1.2, 0, 0], 0.27, 0.56);
  assert.ok(walkIntoWillow.squeezed && walkIntoWillow.position[0] < 0.05, 'willow trunk still blocks walking');
  // Wall cling returns null
  assert.equal(treeWorld.wall([-0.55, 0.2, 0], [1, 0], 0.65), null, 'cannot wall-climb willow');
  assert.equal(treeWorld.wall([5.35, 0.2, 0], [1, 0], 0.75), null, 'cannot wall-climb ginkgo');

  // 2. Baked HeightField tree trunk with noCling mask
  const quad = (a: number[], b: number[], c: number[], d: number[]) => [...a, ...b, ...c, ...a, ...c, ...d];
  const trunkTris = [
    ...quad([-0.3, 3.0, -0.3], [-0.3, 3.0, 0.3], [0.3, 3.0, 0.3], [0.3, 3.0, -0.3]),
    ...quad([-0.3, 0, -0.3], [0.3, 0, -0.3], [0.3, 3.0, -0.3], [-0.3, 3.0, -0.3]),
    ...quad([-0.3, 0, 0.3], [-0.3, 3.0, 0.3], [0.3, 3.0, 0.3], [0.3, 0, 0.3]),
  ];
  const noClingFlags = new Array(trunkTris.length / 9).fill(1);
  const hf = bakeHeightField(trunkTris, {x0: -2, z0: -2, size: 4, cell: 0.1, ground: () => 0, noCling: noClingFlags});
  const hfWorld = createWorld({boxes: [], surfaces: [{min: [-5, -5], max: [5, 5], height: 0}], height: hf});
  const walkIntoHfTrunk = hfWorld.moveCapsule([-0.8, 0, 0], [1.0, 0, 0], 0.25, 0.56);
  assert.ok(walkIntoHfTrunk.squeezed && walkIntoHfTrunk.position[0] < 0, 'HeightField tree trunk blocks walking');
  assert.equal(hfWorld.wall([-0.6, 0.2, 0], [1, 0], 0.6), null, 'HeightField tree trunk rejects wall-cling');

  // 3. Buildings stay climbable AND sloped roofs step down cleanly at eaves (no midair hovering!)
  for (const id of ['build-thatch', 'pack-pavilion', 'build-teahall', 'watermill', 'build-huizhou'] as const) {
    const bBoxes = propCollisionParts({id: 'b-' + id, itemId: id, x: 0, y: 0, z: 0, yaw: 0, scale: 1});
    assert.ok(bBoxes.every(b => b.climbable !== false), `${id} remains climbable`);
    const bWorld = createWorld({indexBoxes: true, boxes: bBoxes, surfaces: [{min: [-10, -10], max: [10, 10], height: 0}]});
    const centerTop = bWorld.support(0, 0, 10) ?? 0;
    const eaveTop = bWorld.support(1.75, 1.35, 10) ?? 0;
    assert.ok(centerTop > eaveTop + 0.35, `${id} roof steps down at eaves (center=${centerTop.toFixed(2)}, eave=${eaveTop.toFixed(2)})`);
  }
});

test('Niagara 风格全六属性 18 个技能与家园右键冲刺特效可正常发射、更新与释放且无 NaN', () => {
  const scene = new THREE.Scene();
  const vfx = new SkillVfxSystem({THREE, scene});
  const hits: string[] = [];
  const cb = {
    getTargetPositions: (): Vec[] => [[0, 0, -3], [2, 0, -4]],
    sampleTerrain: () => 0,
    onSkillHitArea: (_c: Vec, def: any) => { hits.push(def.id); },
    onSpawnBurst: () => {},
  };

  vfx.spawnHomeDashFx([0, 0, 0], [0, 0, -1], 0);
  for (const kit of SKILL_KITS) {
    for (const def of Object.values(kit)) {
      vfx.triggerSkill(def, [0, 0, 0], [0, 0, -1], cb);
    }
  }
  assert.ok(vfx.activeCount > 0, 'VFX active after triggering skills');

  for (let i = 0; i < 60; i++) {
    vfx.update(1 / 30, cb);
  }
  assert.ok(hits.length > 0, 'skill hit callbacks fired');

  const pts = vfx.root.getObjectByName('slime-niagara-particles') as THREE.Points;
  assert.ok(pts && pts.isPoints, 'unified GPU Niagara Points system exists');
  const posAttr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < 300; i++) {
    assert.ok(Number.isFinite(posAttr.array[i]), 'particle coordinates remain finite');
  }
  vfx.dispose();
  assert.equal(vfx.activeCount, 0);
});

test('家园右键冲刺细步长防穿模：面向薄墙冲刺停在墙前且不掉入地下', () => {
  const thinWall: Box = {name: 'thin-wall', min: [-3, 0, -1.2], max: [3, 2.2, -1.0], camera: true};
  const world = createWorld({indexBoxes: true, boxes: [thinWall], surfaces: [{min: [-10, -10], max: [10, 10], height: 0}]});

  // Emulate the exact sub-stepped dash loop from SlimeCharacter.movement
  let cur: Vec = [0, 0, 0];
  const dx = 0, dz = -1, capR = .23, capH = .52;
  let blocked = false;
  for (let frame = 0; frame < 12 && !blocked; frame++) {
    const totalDist = 17.5 * (1 - 0.55 * (frame / 12)) * (1 / 60);
    const subSteps = Math.max(1, Math.ceil(totalDist / .06));
    const stepDist = totalDist / subSteps;
    for (let s = 0; s < subSteps; s++) {
      const hit = world.cast([cur[0], cur[1] + .26, cur[2]], [cur[0] + dx * (stepDist + capR + .04), cur[1] + .26, cur[2] + dz * (stepDist + capR + .04)], .16);
      if (hit && hit.t < .65) { blocked = true; break; }
      const moved = world.moveCapsule(cur, [dx * stepDist, 0, dz * stepDist], capR, capH);
      cur[0] = moved.position[0]; cur[2] = moved.position[2];
      const sup = world.support(cur[0], cur[2], cur[1] + .36, false);
      if (sup !== null && cur[1] < sup) cur[1] = sup;
    }
  }
  assert.ok(blocked, 'dash halted cleanly at thin wall');
  assert.ok(cur[2] > -1.0, `slime stayed strictly in front of wall z=-1.0, got z=${cur[2].toFixed(3)}`);
  assert.ok(cur[1] >= 0, `slime never fell below ground y=0, got y=${cur[1].toFixed(3)}`);
});
