import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILD_ITEMS, buildPropCollisionBox, canPlaceProp, HOME_PRESETS} from '../src/home/build-catalog';
import {ensureHome, freshLife} from '../src/life/state';
import {addHomeXp, ensureDailyHomeTasks, isBuildItemUnlocked, recordHomeAction} from '../src/life/unlocks';
import {evaluateHabitats, recordVisitorInteraction} from '../src/life/habitat';
import {applyWarmBoost, buySeed, chargeHomeSprinkler, dailySpecialSeed, harvestEnhanced, pollinatePlot, shopSeedList} from '../src/life/cultivation';
import {growth, plant, water} from '../src/life/farming';

test('home placement rules protect Time Plaza, handle water props, block overlaps and generate solid boxes', () => {
  const thatch = BUILD_ITEMS['build-thatch'];
  const lily = BUILD_ITEMS['waterside-lily'];
  assert.equal(canPlaceProp(thatch, 4, 18, 1, [], 0, null).ok, false); // Time Plaza no-build
  assert.equal(canPlaceProp(thatch, 2, 114, 1, [], -2.0, -0.45).ok, false); // Deep water rejected for house
  assert.equal(canPlaceProp(lily, 2, 114, 1, [], -2.0, -0.45).ok, true); // Water-allowed lily accepted
  assert.equal(canPlaceProp(thatch, 12, 55, 1, [], 0.3, null).ok, true);

  const placed = [{id: 'p1', itemId: 'build-thatch', x: 12, z: 55, y: 0.3, yaw: 0, scale: 1}];
  assert.equal(canPlaceProp(thatch, 12.5, 55.2, 1, placed, 0.3, null).ok, false); // Overlap blocked
  const box = buildPropCollisionBox(placed[0]);
  assert.ok(box && box.max[1] > box.min[1] + 2);
  assert.equal(buildPropCollisionBox({id: 'p2', itemId: 'waterside-lily', x: 2, z: 114, y: -0.45, yaw: 0, scale: 1}), null);
  assert.ok(HOME_PRESETS.length >= 3);
});

test('elemental cultivation: fire warmth speeds growth, wind pollination mutates, lightning sprinkler auto-waters', () => {
  const life = freshLife();
  life.coins = 100;
  const shop = shopSeedList(life, '2026-11-23');
  assert.ok(shop.some(s => s.id === dailySpecialSeed('2026-11-23') && s.special));
  assert.equal(buySeed(life, 'seed-radish', 2).ok, true);

  const t0 = 1_000_000;
  assert.equal(plant(life, 'farm-1-0', 'seed-radish', t0), true);
  assert.equal(plant(life, 'farm-1-1', 'seed-radish', t0), true);
  water(life, 'farm-1-0', t0, 1, () => 1);
  water(life, 'farm-1-1', t0, 1, () => 1);
  assert.equal(applyWarmBoost(life, 'farm-1-1', t0), true);

  const gNormal = growth(life.plots['farm-1-0']!, t0 + 90_000);
  const gWarm = growth(life.plots['farm-1-1']!, t0 + 90_000);
  assert.ok(gWarm > gNormal * 1.3, `warm ${gWarm} should exceed normal ${gNormal} by ~35%`);

  const pol = pollinatePlot(life, 'farm-1-1', t0 + 90_000, () => 0.1);
  assert.deepEqual(pol, {ok: true, rare: true});

  const wateredCount = chargeHomeSprinkler(life, t0 + 90_000);
  assert.equal(wateredCount, 2);
  assert.ok(ensureHome(life).sprinklerChargedUntil > t0 + 10 * 3600_000);

  const harv = harvestEnhanced(life, 'farm-1-1', t0 + 200_000, () => 0.5);
  assert.ok(harv && harv.rare && harv.bonusCoins > 0);
});

test('DreamWorld habitat rules attract visitors and daily home tasks level up unlocks', () => {
  const life = freshLife();
  const home = ensureHome(life);
  home.placed.push(
    {id: 'a', itemId: 'pack-pavilion', x: 0, z: 50, y: 0, yaw: 0, scale: 1},
    {id: 'b', itemId: 'nature-bamboo', x: 3, z: 50, y: 0, yaw: 0, scale: 1},
    {id: 'c', itemId: 'nature-bamboo', x: -3, z: 50, y: 0, yaw: 0, scale: 1},
    {id: 'd', itemId: 'waterside-lily', x: 0, z: 100, y: 0, yaw: 0, scale: 1},
    {id: 'e', itemId: 'waterside-reeds', x: 2, z: 100, y: 0, yaw: 0, scale: 1},
  );
  const evals = evaluateHabitats(life);
  assert.equal(evals.find(x => x.species.id === 'visitor-red-panda')?.ready, true);
  assert.equal(evals.find(x => x.species.id === 'visitor-frog')?.ready, true);
  assert.equal(evals.find(x => x.species.id === 'visitor-gull')?.ready, false);

  const vRes = recordVisitorInteraction(life, 'visitor-red-panda', '2026-11-23', true);
  assert.equal(vRes.firstVisit, true);
  assert.ok(vRes.giftedSeed);

  const tasks = ensureDailyHomeTasks(life, '2026-11-23');
  assert.equal(tasks.length, 3);
  assert.equal(isBuildItemUnlocked(life, 'build-huizhou'), false);
  const xpRes = addHomeXp(life, 45);
  assert.equal(xpRes.leveledUp, true);
  assert.equal(xpRes.newLevel, 2);
  assert.equal(isBuildItemUnlocked(life, 'build-huizhou'), true);

  const ev = recordHomeAction(life, '2026-11-23', tasks[0].kind, tasks[0].target);
  assert.equal(ev.completedTasks.length, 1);
});
