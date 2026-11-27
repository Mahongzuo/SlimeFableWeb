import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  bakeIslandSDFData,
  buildCoastalCollisionSurfaces,
  buildOceanFluidVolumes,
  coastalHeightAt,
  coastalSeabedHeightAt,
  coastExtensionAt,
  collectTerritoryRects,
  territoryBoxSDF,
} from '../src/world/island-coast';
import {inland, WORLD} from '../src/world/map';
import {createWorld} from '../src/slime/world';
import {marineZoneForDepth, pickSpeciesForDepth} from '../src/home/ocean-life';
import {stockhamButterflyIndices} from '../src/home/render/fft-ocean';
import {buildBroadleafCanopyGeometry, buildPineBoughGeometry} from '../src/home/foliage/tree-ism';
import {hueDeltaDeg, lmStep, oklchToSrgb, srgbToOklch} from '../src/home/render/oklch';
import {clampRenderParams, DEFAULT_RENDER_PARAMS} from '../src/home/render/params';
import {SEA_LEVEL} from '../src/home/layout';
import {riverCenter} from '../src/home/waterway';

test('Dynamic Island SDF cleanly separates interior land, organic shoreline, river mouth and expanded tiles', () => {
  const baseSDF = bakeIslandSDFData([], 128);
  assert.equal(baseSDF.size, 128);
  assert.equal(baseSDF.data.length, 128 * 128 * 4);

  const sample = (sdf: ReturnType<typeof bakeIslandSDFData>, x: number, z: number) => {
    const u = Math.max(0, Math.min(1, (x - sdf.minX) * sdf.bounds.z));
    const v = Math.max(0, Math.min(1, (z - sdf.minZ) * sdf.bounds.w));
    const i = Math.round(u * (sdf.size - 1));
    const j = Math.round(v * (sdf.size - 1));
    const k = (i + j * sdf.size) * 4;
    return {shore: sdf.data[k], bedY: sdf.data[k + 1], dBox: sdf.data[k + 2], hint: sdf.data[k + 3]};
  };

  // Plaza center (10, 17) is well inland (dBox < 0, shore < 0)
  const plaza = sample(baseSDF, 10, 17);
  assert.ok(plaza.dBox < -15, `plaza must be inside base land, got dBox=${plaza.dBox}`);
  assert.ok(plaza.shore < -20, `plaza must be inside organic shoreline, got shore=${plaza.shore}`);

  // Deep ocean far outside base island has positive SDF & submerged seabed well below SEA_LEVEL
  const deepWest = sample(baseSDF, WORLD.min[0] - 60, 40);
  assert.ok(deepWest.dBox > 50);
  assert.ok(deepWest.shore > 30);
  assert.ok(deepWest.bedY < SEA_LEVEL - 8, `deep ocean seabed should descend below -8m, got ${deepWest.bedY}`);

  // South harbor river mouth remains navigable underwater channel
  const mouthX = riverCenter(-31);
  const mouth = sample(baseSDF, mouthX, -35);
  assert.ok(mouth.bedY < SEA_LEVEL - 0.8, `harbor river mouth must stay underwater, got ${mouth.bedY}`);

  // Boundary continuity: coastalHeightAt matches inland() exactly at dBox = 0 (zero step / zero Z-fighting)
  for (const [bx, bz] of [[WORLD.max[0], 50], [WORLD.min[0], 60], [-40, WORLD.max[1]]] as const) {
    const edgeY = inland(bx, bz);
    const coast0 = coastalHeightAt(bx, bz, edgeY, 0);
    assert.ok(Math.abs(coast0 - edgeY) < 0.001, `coastal rim seam mismatch at (${bx},${bz}): ${coast0} vs ${edgeY}`);
    assert.ok(coastExtensionAt(bx, bz) >= 2.0);
  }

  // Unlocking an infinite northern expansion tile dynamically pushes territory SDF outward
  const expanded = [{id: 'tile_0_2', gx: 0, gz: 2, theme: 'coast' as const, unlockedAt: 1}];
  const expRects = collectTerritoryRects(expanded);
  assert.ok(territoryBoxSDF(0, 160, collectTerritoryRects([])) > 15);
  assert.ok(territoryBoxSDF(0, 160, expRects) < -10, 'unlocked tile (0,2) must become inland territory');
});

test('Stockham radix-2 auto-sort IFFT matches exact 1D inverse DFT to floating-point precision', () => {
  const N = 16;
  const stages = Math.log2(N);
  // Deterministic complex input spectrum
  let aRe = Array.from({length: N}, (_, k) => Math.sin(k * 1.7 + 0.3));
  let aIm = Array.from({length: N}, (_, k) => Math.cos(k * 2.3 - 0.5));

  // Reference exact IDFT: X[n] = sum_k x[k] * exp(+i * 2*pi * k * n / N)
  const refRe = new Array(N).fill(0);
  const refIm = new Array(N).fill(0);
  for (let n = 0; n < N; n++) {
    for (let k = 0; k < N; k++) {
      const ang = (2 * Math.PI * k * n) / N;
      refRe[n] += aRe[k] * Math.cos(ang) - aIm[k] * Math.sin(ang);
      refIm[n] += aRe[k] * Math.sin(ang) + aIm[k] * Math.cos(ang);
    }
  }

  // Run Stockham ping-pong stages matching src/home/render/fft-ocean.ts shader logic
  for (let s = 0; s < stages; s++) {
    const nextRe = new Array(N).fill(0);
    const nextIm = new Array(N).fill(0);
    for (let k = 0; k < N; k++) {
      const {p, q, angle, sign} = stockhamButterflyIndices(k, s, N);
      const wr = Math.cos(angle);
      const wi = Math.sin(angle);
      const bRe = wr * aRe[q] - wi * aIm[q];
      const bIm = wr * aIm[q] + wi * aRe[q];
      nextRe[k] = aRe[p] + sign * bRe;
      nextIm[k] = aIm[p] + sign * bIm;
    }
    aRe = nextRe;
    aIm = nextIm;
  }

  for (let n = 0; n < N; n++) {
    assert.ok(Math.abs(aRe[n] - refRe[n]) < 1e-10, `IFFT Re mismatch at ${n}: ${aRe[n]} vs ${refRe[n]}`);
    assert.ok(Math.abs(aIm[n] - refIm[n]) < 1e-10, `IFFT Im mismatch at ${n}: ${aIm[n]} vs ${refIm[n]}`);
  }
});

test('AAA ISM foliage geometries have finite unit normals, valid UVs and sphere-projected canopy lighting', () => {
  for (const geo of [buildBroadleafCanopyGeometry(), buildPineBoughGeometry()]) {
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    const uv = geo.attributes.uv;
    assert.ok(pos.count >= 36, 'foliage cluster should contain multiple leaf cards');
    for (let i = 0; i < pos.count; i++) {
      const len = Math.hypot(norm.getX(i), norm.getY(i), norm.getZ(i));
      assert.ok(Number.isFinite(pos.getX(i)) && Number.isFinite(pos.getY(i)) && Number.isFinite(pos.getZ(i)));
      assert.ok(Math.abs(len - 1) < 1e-3, `normal at ${i} not unit length: ${len}`);
      assert.ok(uv.getX(i) >= 0 && uv.getX(i) <= 1 && uv.getY(i) >= 0 && uv.getY(i) <= 1);
    }
    geo.dispose();
  }
});

test('OKLCH roundtrip accuracy and Levenberg-Marquardt least-squares solver convergence', () => {
  const samples: [number, number, number][] = [
    [0.12, 0.45, 0.78],
    [0.85, 0.52, 0.21],
    [0.36, 0.62, 0.28],
    [0.92, 0.94, 0.90],
  ];
  for (const [r, g, b] of samples) {
    const lch = srgbToOklch(r, g, b);
    const [r2, g2, b2] = oklchToSrgb(lch.L, lch.C, lch.h);
    assert.ok(Math.abs(r - r2) < 1e-4 && Math.abs(g - g2) < 1e-4 && Math.abs(b - b2) < 1e-4);
  }
  assert.equal(hueDeltaDeg(355, 5), -10);
  assert.equal(hueDeltaDeg(5, 355), 10);

  // Verify LM solver minimizes nonlinear 2D objective f(x, y) = [x - 0.7, y^2 - 0.25]
  let theta = [0.1, 0.9];
  const bounds: [number, number][] = [[0, 2], [0, 2]];
  for (let it = 0; it < 15; it++) {
    const r = [theta[0] - 0.7, theta[1] * theta[1] - 0.25];
    const J = [[1, 0], [0, 2 * theta[1]]];
    theta = lmStep(theta, r, J, 0.05, bounds);
  }
  assert.ok(Math.abs(theta[0] - 0.7) < 1e-4 && Math.abs(theta[1] - 0.5) < 1e-4);

  // Render param clamping stays strictly within physical limits
  const clamped = clampRenderParams({rayleighScale: 99, exposureBias: -99, oceanAbsorbR: NaN});
  assert.equal(clamped.rayleighScale, 2.2);
  assert.equal(clamped.exposureBias, -1.2);
  assert.equal(clamped.oceanAbsorbR, DEFAULT_RENDER_PARAMS.oceanAbsorbR);
});

test('Coastal collision surfaces provide seamless walkable slope into sea & deep seabed without drops', () => {
  const surfaces = buildCoastalCollisionSurfaces([], 76);
  const fluids = buildOceanFluidVolumes([], 76);
  const world = createWorld({boxes: [], surfaces, fluids});

  // Walk smoothly off east coast (x=31..75, z=10): continuous height, no null floor, ocean fluid present
  let prev = coastalSeabedHeightAt(31, 10);
  for (let x = 32; x <= 75; x += 2) {
    const h = world.terrain(x, 10);
    assert.ok(h !== null && Number.isFinite(h), `missing coastal collision at x=${x}`);
    assert.ok(Math.abs(h - prev) < 2.2, `abrupt drop at x=${x}: ${prev} -> ${h}`);
    prev = h;
  }
  assert.equal(world.fluid(55, 10), SEA_LEVEL);
  // Deep ocean seabed reaches dive depth (< -4m)
  assert.ok(world.terrain(75, 10)! < SEA_LEVEL - 4.0);
});

test('Depth-based procedural marine life zones classify shallow, twilight, and abyss strata accurately', () => {
  assert.equal(marineZoneForDepth(1.5).id, 'shallow');
  assert.equal(marineZoneForDepth(5.5).id, 'twilight');
  assert.equal(marineZoneForDepth(11.0).id, 'abyss');

  let s = 12345;
  const rand = () => ((s = (Math.imul(1664525, s) + 1013904223) | 0) >>> 0) / 4294967296;
  for (let i = 0; i < 20; i++) {
    const shallowSp = pickSpeciesForDepth(1.4, rand);
    assert.ok(shallowSp.minDepth <= 2.4, `unexpected deep species at 1.4m: ${shallowSp.id}`);
    const abyssSp = pickSpeciesForDepth(12.0, rand);
    assert.ok(abyssSp.maxDepth >= 10.5, `unexpected shallow species at 12m: ${abyssSp.id}`);
  }
});

test('Windmill hill forms a flat solid plateau under the windmill and front terrace', () => {
  const center = inland(20, 64);
  assert.ok(center > 3.0, `windmill plateau height should be > 3m, got ${center}`);
  for (const [x, z] of [[17.8, 61.5], [22.2, 61.5], [17.8, 66.2], [22.2, 66.2], [20, 60.5]] as const) {
    const h = inland(x, z);
    assert.ok(Math.abs(h - center) < 0.08, `windmill hilltop not flat at (${x},${z}): ${h} vs ${center}`);
  }
});
