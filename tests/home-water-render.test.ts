import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {stockhamButterflyIndices} from '../src/home/render/fft-ocean';
import {createInlandWaterMaterial, createWaterShared, LAKE_BAND, PUDDLE_BAND, SEA_BAND, WATER_COMMON_GLSL, WATER_LAYER} from '../src/home/render/water-surface';

const src = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('the home frame renders the scene at most three times: cloud slice, one shared mirror, main pass', () => {
  const pipeline = src('src/home/render/pipeline.ts');
  // mirror + main are the only whole-scene renders; the cloud panorama and post passes draw full-screen quads
  assert.equal(pipeline.match(/\.render\(this\.scene,/g)?.length, 2);
  for (const file of ['src/home/render/fft-ocean.ts', 'src/zones/lake-water.ts', 'src/home/render/water-surface.ts', 'src/home/render/clouds.ts']) {
    assert.doesNotMatch(src(file), /\.render\((this\.)?(ctx\.)?scene,/, file);
  }
  const report = new URL('../qa/evidence/home-perf-after.json', import.meta.url);
  if (existsSync(report)) {
    const views = JSON.parse(readFileSync(report, 'utf8')).views as Record<string, {sceneRendersMax: number; hitches: number}>;
    for (const [key, v] of Object.entries(views)) assert.ok(v.sceneRendersMax <= 3, `${key}: ${v.sceneRendersMax} scene passes`);
  }
});

test('all water shares one layer, one opaque copy and one mirror, with an un-premultiplied mirror lookup', () => {
  assert.equal(WATER_LAYER, 6);
  assert.match(WATER_COMMON_GLSL, /p\.rgb \/ max\(p\.a, 1e-3\)/);
  const shared = createWaterShared();
  const lake = createInlandWaterMaterial(shared, {uWind: {value: .5}, uRain: {value: 0}}, [], {band: LAKE_BAND});
  const puddle = createInlandWaterMaterial(shared, {uWind: {value: .5}, uRain: {value: 0}}, [], {
    band: PUDDLE_BAND, puddle: true, patches: [{x: 6.1, z: 15.4, rx: 1.25, rz: .55, rot: .3}],
  });
  for (const m of [lake, puddle]) {
    assert.equal(m.uniforms.tOpaqueColor, shared.tOpaqueColor);
    assert.equal(m.uniforms.tPlanarRefl, shared.tPlanarRefl);
    assert.equal(m.uniforms.uReflMatrix, shared.uReflMatrix);
    assert.ok(m.transparent);
  }
  assert.equal(lake.uniforms.uWet.value, -1);
  assert.equal(puddle.uniforms.uWet.value, 1);
  assert.deepEqual(puddle.uniforms.uPuddleEll.value[0].toArray(), [6.1, 15.4, 1.25, .55]);
  assert.equal(puddle.uniforms.uPuddleEll.value[1].z, 0);
  // depth bands run shallow -> deep without reordering
  for (const band of [SEA_BAND, LAKE_BAND, PUDDLE_BAND]) {
    assert.equal(band.colors.length, band.stops.length + 1);
    for (let i = 1; i < band.stops.length; i++) assert.ok(band.stops[i] > band.stops[i - 1]);
  }
});

test('Stockham butterflies pair every input exactly twice per stage', () => {
  const N = 128;
  for (let stage = 0; (1 << stage) < N; stage++) {
    const uses = new Map<string, number[]>();
    for (let k = 0; k < N; k++) {
      const {p, q, sign} = stockhamButterflyIndices(k, stage, N);
      assert.ok(p >= 0 && p < N / 2 && q === p + N / 2, `stage ${stage} k ${k}`);
      const key = `${p}`;
      uses.set(key, [...(uses.get(key) ?? []), sign]);
    }
    assert.equal(uses.size, N / 2);
    for (const signs of uses.values()) assert.deepEqual(signs.sort(), [-1, 1]);
  }
});

test('grass thins by instance rank and finishes before the distance fade-out', () => {
  const grass = src('src/home/foliage/grass-ism.ts');
  assert.match(grass, /attribute float aRank/);
  assert.match(grass, /userData\.cullDistance = 104/);
  const near = Number(grass.match(/const DENSITY_NEAR = ([\d.]+)/)?.[1]);
  const far = Number(grass.match(/const DENSITY_FAR = ([\d.]+)/)?.[1]);
  assert.ok(near > 0 && far > near && far < 102, 'thinning finishes before the 102 m fade-out');
});
