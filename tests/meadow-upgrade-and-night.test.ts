import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  updateGrassExclusions,
  getActiveGrassExclusions,
  isPointGrassExcluded,
  grassExclusionUniforms,
  MAX_GRASS_EXCLUSIONS,
  createChunkedGrassISM,
} from '../src/home/foliage/grass-ism';
import {buildBroadleafCanopyGeometry} from '../src/home/foliage/tree-ism';
import {AtmosphereMotes} from '../src/home/foliage/atmosphere-motes';
import {sampleTerrainRoadWeight} from '../src/world/terrain-mesh';
import {
  normalizeSimPondMaterial,
  SIMPOND_SPECIES,
  simpondLighting,
} from '../src/home/simpond-assets';

test('动态田垄/建筑禁草遮罩：支持轴对齐与旋转 OBB 并同步 GPU uniform', () => {
  updateGrassExclusions([
    {x: 12.0, z: 33.0, hx: 1.8, hz: 1.2, yaw: 0},
    {x: -5.0, z: 42.0, hx: 2.0, hz: 0.8, yaw: Math.PI / 2},
  ]);

  assert.equal(grassExclusionUniforms.uGrassExclCount.value, 2);
  assert.equal(getActiveGrassExclusions().length, 2);

  // Axis-aligned farm bed
  assert.equal(isPointGrassExcluded(12.0, 33.0), true);
  assert.equal(isPointGrassExcluded(13.6, 34.0), true);
  assert.equal(isPointGrassExcluded(14.5, 33.0), false);

  // 90-degree rotated farm bed: hx=2.0 now spans along Z, hz=0.8 spans along X
  assert.equal(isPointGrassExcluded(-5.0, 43.8), true);
  assert.equal(isPointGrassExcluded(-3.6, 42.0), false);
  assert.equal(isPointGrassExcluded(-5.5, 42.0), true);

  // Cap at MAX_GRASS_EXCLUSIONS
  const many = Array.from({length: MAX_GRASS_EXCLUSIONS + 10}, (_, i) => ({
    x: i * 5,
    z: 0,
    hx: 1,
    hz: 1,
  }));
  updateGrassExclusions(many);
  assert.equal(grassExclusionUniforms.uGrassExclCount.value, MAX_GRASS_EXCLUSIONS);

  // Reset cleanly
  updateGrassExclusions([]);
  assert.equal(grassExclusionUniforms.uGrassExclCount.value, 0);
});

test('跨区道路拼接：harbor/park 交界 z=30 处石板路连续过渡无断头', () => {
  const wHarbor = sampleTerrainRoadWeight(8.6, 29.0);
  const wSeam = sampleTerrainRoadWeight(9.0, 30.0);
  const wPark = sampleTerrainRoadWeight(9.8, 32.0);
  assert.ok(wHarbor > 0.7, `expected road weight in harbor > 0.7, got ${wHarbor}`);
  assert.ok(wSeam > 0.7, `expected road weight on z=30 seam > 0.7, got ${wSeam}`);
  assert.ok(wPark > 0.7, `expected road weight in south park > 0.7, got ${wPark}`);
  // Spawn quay center should not get road splat
  assert.equal(sampleTerrainRoadWeight(10.0, 17.0), 0);
});

test('草地与 4 种 3D 野花簇均正确生成并带有效边界球与顶点属性', () => {
  let seed = 12345;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const mockZone = {
    T: THREE,
    ground: () => 0,
    rand,
    ctx: {U: {uTime: {value: 0}, uGrassDensity: {value: 1}}},
    toon: () => new THREE.MeshStandardMaterial(),
  };
  const group = createChunkedGrassISM(
    mockZone as any,
    1800,
    {min: [-20, 32], max: [20, 72]},
    () => false,
  );
  const names = group.children.map((c: any) => c.name);
  assert.ok(names.includes('grass-blades'), 'should have primary grass-blades chunk');
  assert.ok(names.includes('grass-flowers'), 'should have daisy wildflowers');
  assert.ok(
    names.some((n: string) => n === 'grass-flowers-poppy' || n === 'grass-flowers-lupin' || n === 'grass-flowers-buttercup'),
    'should spawn multiple 3D wildflower species',
  );
  for (const child of group.children) {
    const im = child as THREE.InstancedMesh;
    assert.ok(im.geometry.attributes.position.count > 0);
    assert.ok(im.geometry.attributes.normal.count > 0);
    assert.ok(im.geometry.attributes.uv.count > 0);
  }
});

test('体积阔叶树冠几何保留完整属性且下缘覆盖树干顶端以下', () => {
  const geo = buildBroadleafCanopyGeometry();
  assert.ok(geo.attributes.position.count > 400, 'volumetric crown + cards should have rich geometry');
  assert.ok(geo.attributes.normal, 'needs normal');
  assert.ok(geo.attributes.uv, 'needs uv for foliage atlas alphaTest');
  assert.ok(geo.attributes.color, 'needs vertex AO color');
  geo.computeBoundingBox();
  assert.ok(geo.boundingBox!.min.y < 2.45, 'lower crown must enclose trunk below y=3.05');
  assert.ok(geo.boundingBox!.max.y > 4.2, 'upper crown must rise above y=4.2');
});

test('SimPond 生物材质规范化彻底消除默认 metalness=1 夜间发黑问题', () => {
  const dummyTex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  for (const id of ['common-frog', 'smooth-newt', 'shore-crab', 'koi-kohaku', 'madai'] as const) {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.5, 0.5, 0.5),
      metalness: 1.0,
      metalnessMap: dummyTex,
      roughness: 0.95,
      envMapIntensity: 0.6,
    });
    normalizeSimPondMaterial(mat, SIMPOND_SPECIES[id]);
    assert.equal(mat.metalness, 0.0, `${id} must force metalness=0`);
    assert.equal(mat.metalnessMap, null, `${id} must clear metalnessMap`);
    assert.ok(mat.roughness >= 0.46 && mat.roughness <= 0.78, `${id} roughness out of range: ${mat.roughness}`);
    assert.ok(mat.envMapIntensity >= 1.2, `${id} envMapIntensity should be lifted`);
    assert.ok(mat.color.r > 0.55, `${id} albedo should receive gentle stylized lift`);
  }
  assert.equal(typeof simpondLighting.daylight.value, 'number');
});

test('飘浮花尘/夜萤粒子在晴朗可见，大雨/大雪自动淡出隐藏', () => {
  const motes = new AtmosphereMotes(64);
  const sunDir = new THREE.Vector3(0.4, 0.7, 0.5).normalize();
  const sunCol = new THREE.Color(0xfff1d5);
  const camPos = new THREE.Vector3(10, 2, 20);
  motes.update(1.5, 1.0, sunDir, sunCol, 0.3, 0.0, 0.0, camPos);
  assert.equal(motes.points.visible, true);
  motes.update(2.0, 1.0, sunDir, sunCol, 0.3, 0.85, 0.0, camPos);
  assert.equal(motes.points.visible, false);
  motes.dispose();
});
