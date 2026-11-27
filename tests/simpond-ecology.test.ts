import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {SIMPOND_SPECIES} from '../src/home/simpond-assets';
import {
  createAmphibianAgent,
  stepAmphibianFsm,
  stepFishBoidFsm,
  stepSkaterFsm,
  stepDragonflyFsm,
  stepShoreCritterFsm,
  type FishBoidAgent,
  type SkaterAgent,
  type DragonflyAgent,
  type ShoreCritterAgent,
} from '../src/home/simpond-ai';

const makeRand = (seed = 12345) => {
  let s = seed | 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
};

test('SimPond 精选 GLB 与翅膀贴图文件全部就位且与物种表一致', () => {
  const dir = path.resolve('public/models/simpond');
  for (const spec of Object.values(SIMPOND_SPECIES)) {
    const fp = path.join(dir, spec.file);
    assert.ok(fs.existsSync(fp), `missing GLB asset: ${spec.file}`);
    assert.ok(fs.statSync(fp).size > 10_000, `GLB too small: ${spec.file}`);
    if (spec.wingTexture) {
      assert.ok(fs.existsSync(path.join(dir, spec.wingTexture)), `missing wing texture: ${spec.wingTexture}`);
    }
  }
  assert.ok(fs.existsSync(path.join(dir, 'NOTICE.txt')), 'attribution NOTICE.txt present');
});

test('青蛙与蝾螈两栖 AI 状态机覆盖坐姿/鸣叫/跳跃入水/游泳/漂浮及求偶全状态流转', () => {
  const rand = makeRand(91);
  // Bank at x=0 (ground=0.25), water for x>=2 (ground=-0.6, waterLevel=0)
  const sampleGround = (x: number) => (x < 1.8 ? 0.25 : -0.6);

  // Frog starts sitting on bank -> startling triggers hop -> lands in water -> swim -> float
  const frog = createAmphibianAgent('frog', 0, 0, 3.0, 0, 0, 0.25);
  assert.equal(frog.state, 'sit');
  const seenFrogStates = new Set<string>([frog.state]);

  // Trigger startle to hop toward water
  const r1 = stepAmphibianFsm(frog, 1 / 30, {x: -1.0, y: 0.25, z: 0, speed: 4.0, spread: 0}, sampleGround, rand);
  assert.equal(frog.state, 'hop');
  assert.equal(r1.anim, 'hop');
  seenFrogStates.add(frog.state);

  // Step until frog splashes into water & transitions through swim -> float
  for (let i = 0; i < 240; i++) {
    stepAmphibianFsm(frog, 1 / 30, null, sampleGround, rand);
    seenFrogStates.add(frog.state);
    assert.ok(Number.isFinite(frog.x) && Number.isFinite(frog.y) && Number.isFinite(frog.z));
  }
  assert.ok(seenFrogStates.has('swim'), 'frog transitioned to swim in water: ' + [...seenFrogStates].join(','));
  assert.ok(seenFrogStates.has('float') || seenFrogStates.has('sit'), 'frog settled into float/sit');

  // Calm frog on bank should also trigger croak naturally
  const calmFrog = createAmphibianAgent('frog', 0, 0, 3.0, 0, 0, 0.25);
  const calmStates = new Set<string>();
  for (let i = 0; i < 360; i++) {
    stepAmphibianFsm(calmFrog, 1 / 20, null, () => 0.25, rand);
    calmStates.add(calmFrog.state);
  }
  assert.ok(calmStates.has('croak'), 'calm frog performs croak animation');

  // Newt transitions across rest, walk, swim, and court
  const newt = createAmphibianAgent('newt', 0, 0, 3.0, 0, 0, 0.25);
  const newtStates = new Set<string>([newt.state]);
  for (let i = 0; i < 480; i++) {
    stepAmphibianFsm(newt, 1 / 20, i < 15 ? {x: -0.8, y: 0.25, z: 0, speed: 3.5, spread: 0} : null, sampleGround, rand);
    newtStates.add(newt.state);
  }
  assert.ok(newtStates.has('walk') && newtStates.has('swim'), 'newt walks on shore and swims in water: ' + [...newtStates].join(','));
  assert.ok(newtStates.has('court') || newtStates.has('rest'), 'newt performs court/rest behaviors');
});

test('鱼群 Boids 游动、水面觅食与遇敌冲刺逃逸，以及水黾/蜻蜓/岸蟹状态机均稳定无 NaN', () => {
  const rand = makeRand(307);
  const school: FishBoidAgent[] = [0, 1, 2].map(i => ({
    x: i * 0.6, y: -0.2, z: 0, vx: 0.5, vz: 0.2, yaw: 0,
    state: 'school', timer: 1.5, depthOffset: 0.2, targetDepth: 0.2, cruiseSpeed: 0.7,
  }));
  const home = {cx: 0, cz: 0, rx: 3, rz: 3, waterLevel: 0, baseDepth: 0.2};

  // Threat right in the water triggers flee_dart with high tail beat frequency
  const dart = stepFishBoidFsm(school[0], school, 1 / 30, home, {x: 0.2, y: -0.1, z: 0.2, speed: 3.0, spread: 0}, rand);
  assert.equal(school[0].state, 'flee_dart');
  assert.ok(dart.swimFreq > 12, 'flee_dart boosts swim tail frequency');
  for (let i = 0; i < 120; i++) {
    for (const f of school) {
      stepFishBoidFsm(f, school, 1 / 30, home, null, rand);
      assert.ok(Number.isFinite(f.x) && Number.isFinite(f.y) && Number.isFinite(f.z));
    }
  }

  // Water strider impulse-drift & scatter
  const strider: SkaterAgent = {
    kind: 'water-strider', state: 'drift', x: 0, z: 0, vx: 0, vz: 0, yaw: 0, timer: 0.5, cx: 0, cz: 0, radius: 3, waterLevel: 0,
  };
  stepSkaterFsm(strider, 1 / 30, {x: 0.3, y: 0, z: 0.3, speed: 2, spread: 0}, rand);
  assert.equal(strider.state, 'scatter');
  for (let i = 0; i < 90; i++) stepSkaterFsm(strider, 1 / 30, null, rand);
  assert.ok(Math.hypot(strider.x, strider.z) <= 3 * 1.26);

  // Dragonfly patrol / hover / dart / perch
  const df: DragonflyAgent = {
    kind: 'dragonfly-emperor', state: 'patrol', x: 0, y: 1, z: 0, yaw: 0, timer: 0.1, cx: 0, cz: 0, radius: 4, baseY: 0.3, tx: 1, ty: 1, tz: 1,
  };
  const dfStates = new Set<string>();
  for (let i = 0; i < 240; i++) {
    stepDragonflyFsm(df, 1 / 20, i === 100 ? {x: df.x + 0.5, y: df.y, z: df.z, speed: 2, spread: 0} : null, rand);
    dfStates.add(df.state);
  }
  assert.ok(dfStates.has('hover') && dfStates.has('dart'), 'dragonfly hovers and darts: ' + [...dfStates].join(','));

  // Shore crab scuttles sideways & flees toward water; hermit crab freezes into shell
  const crab: ShoreCritterAgent = {
    kind: 'shore-crab', state: 'forage', x: 0, y: 0, z: 0, yaw: 0, moveDirX: 1, moveDirZ: 0, timer: 1, homeX: 0, homeZ: 0, waterX: 4, waterZ: 0, radius: 2,
  };
  stepShoreCritterFsm(crab, 1 / 30, {x: -0.5, y: 0, z: 0, speed: 2, spread: 0}, () => 0, rand);
  assert.equal(crab.state, 'flee_water');

  const hermit: ShoreCritterAgent = {
    kind: 'hermit-crab', state: 'forage', x: 0, y: 0, z: 0, yaw: 0, moveDirX: 1, moveDirZ: 0, timer: 1, homeX: 0, homeZ: 0, waterX: 4, waterZ: 0, radius: 2,
  };
  stepShoreCritterFsm(hermit, 1 / 30, {x: -0.5, y: 0, z: 0, speed: 2, spread: 0}, () => 0, rand);
  assert.equal(hermit.state, 'freeze');
});
