import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FISH_TABLE,
  FishingSession,
  landCatch,
  lifetimeCatches,
  equippedLure,
  pickFish,
  trophySize,
  type FishSpot,
} from '../src/life/fishing';
import { ITEMS } from '../src/life/catalog';
import { freshLife, ensureHome } from '../src/life/state';
import { rng } from '../src/templates/random';
import { islandBed, islandAt, islandScenery } from '../src/home/voyage-islands';
import support from '../src/home/island-supports.json';

test('all 64 distinct journal entries can be rolled from a real fishing habitat', () => {
  const seen = new Set<string>(),
    random = rng('six-waters').next;
  for (const spot of ['lake', 'canal', 'waterfall', 'harbor', 'reef', 'offshore'] as FishSpot[])
    for (const hour of [0, 6, 13, 20])
      for (const season of [0, 1, 2, 3]) {
        const env = { hour, season, raining: true, snowing: season === 3, historyDay: true };
        for (let i = 0; i < 750; i++) seen.add(pickFish(spot, env, null, random).fish);
      }
  assert.equal(FISH_TABLE.length, 64);
  assert.equal(seen.size, 64);
  for (const id of seen) {
    assert.equal(ITEMS[id].kind, 'fish');
    assert.ok(Number.isFinite(trophySize(id)));
  }
});
test('new tackle preserves legacy records and settles a landed fish exactly once', () => {
  const life = freshLife();
  landCatch(life, { fish: 'fish-carp', size: 60 });
  const old = { ...life.dex['fish-carp'] };
  ensureHome(life).fishing!.lure = 2;
  assert.equal(equippedLure(life), 0);
  assert.ok(old.best! >= trophySize('fish-carp'));
  const s = new FishingSession('reef', { hour: 10, raining: false, historyDay: false }, () => 0.01, null, {
    mode: 'angling',
  });
  assert.equal(s.settle(life), false);
  for (let i = 0; i < 3600 && s.phase !== 'caught'; i++) {
    if (s.phase === 'bite') s.hook();
    s.update(1 / 60, s.tension < 0.6, s.fishPos > 0.5 ? -1 : 1);
  }
  assert.equal(s.phase, 'caught');
  assert.equal(s.settle(life), true);
  assert.equal(s.settle(life), false);
  assert.equal(life.dex[s.catch.fish].starlight, true);
  assert.equal(lifetimeCatches(life), 2);
  assert.deepEqual(life.dex['fish-carp'], old);
  landCatch(life, s.catch);
  landCatch(life, s.catch);
  assert.equal(equippedLure(life), 2);
  const failed = new FishingSession('lake', { hour: 10, raining: false, historyDay: false }, () => 0.5, null, {
    mode: 'angling',
  });
  for (let i = 0; i < 500; i++) {
    if (failed.phase === 'bite') failed.hook();
    failed.update(0.033, true);
  }
  assert.equal(failed.phase, 'escaped');
  assert.equal(failed.settle(life), false);
});
test('tree and rock cut edges contact the actual two-metre mesh triangles across all three island shapes', () => {
  const kinds = new Set<number>(),
    variants = new Set<string>();
  for (let seed = 301; seed <= 320; seed++) {
    const i = islandAt(seed, -2, -1);
    kinds.add(i.kind);
    const at = (x: number, z: number) => {
      const xx = Math.floor(x / 2) * 2,
        zz = Math.floor(z / 2) * 2,
        u = (x - xx) / 2,
        v = (z - zz) / 2;
      const a = islandBed(i, xx, zz),
        b = islandBed(i, xx + 2, zz),
        c = islandBed(i, xx, zz + 2),
        d = islandBed(i, xx + 2, zz + 2);
      return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
    };
    const sites = islandScenery(i, seed, at);
    assert.deepEqual(sites, islandScenery(i, seed, at));
    for (const p of sites) {
      if (p.name.startsWith('shrub')) continue;
      variants.add(p.name);
      for (const [u, v] of support[p.name as keyof typeof support].rim) {
        const dx = p.size * (u * Math.cos(p.yaw) + v * Math.sin(p.yaw)),
          dz = p.size * (v * Math.cos(p.yaw) - u * Math.sin(p.yaw));
        const gap = p.y + (p.slopeX ?? 0) * dx + (p.slopeZ ?? 0) * dz - at(i.x + p.x + dx, i.z + p.z + dz);
        assert.ok(gap <= (p.name.startsWith('palm') ? 0.02 : 0.05), p.name + ' ' + gap);
      }
    }
  }
  assert.equal(kinds.size, 3);
  assert.equal(variants.size, 10);
});

test('every new fish has finite upper and lower contours in the catch camera', async () => {
  const { anglingFish, disposeFish } = await import('../src/home/angling-fish');
  const { extraFish } = await import('../src/life/fish-species');
  for (const s of extraFish.filter((s) => !s.id.startsWith('fish-cove-'))) {
    const model = anglingFish(s.id, false);
    model.traverse((node: any) => {
      if (!node.isMesh) return;
      node.geometry.computeBoundingSphere();
      assert.ok(Number.isFinite(node.geometry.boundingSphere.radius), s.id);
    });
    disposeFish(model);
  }
});
