import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureHome, freshLife, type VoxelBlockData} from '../src/life/state';
import {ITEMS, RECIPES} from '../src/life/catalog';
import {
  ARTISAN_RECIPES,
  boostMachineWithElement,
  collectMachine,
  detectNearbyHoney,
  sellItem,
  startBeehiveCycle,
  startMachine,
} from '../src/life/artisan';
import {eatFood, getActiveBuffs, hasBuff} from '../src/life/cooking';
import {donateToMuseum, isMuseumHallRestored, museumSummary} from '../src/life/museum';
import {
  buildChunkGeometryData,
  buildGreedyCubeQuads,
  detectFencedPastures,
  hasCoplanarOverlap,
  mergeVoxelCollisionBoxes,
  voxelKey,
} from '../src/home/voxel-mesher';
import {BUILTIN_VOXEL_BLUEPRINTS, VOXEL_CATALOG, voxelUnitPrice} from '../src/home/voxel-catalog';
import {
  adoptRanchAnimal,
  careForAnimal,
  collectAnimalProduct,
  generateDailyEncounters,
  interactWildEncounter,
  ranchCapacity,
  toggleAnimalFollow,
} from '../src/life/ranch';
import {FishingSession, fishingBonuses, landCatch, pickFish, upgradeFishingRod} from '../src/life/fishing';
import {collectFishPond, fulfillPondWish, POND_GROW_INTERVAL_MS, stepFishPond, stockFishPond} from '../src/life/fishpond';
import {claimDriftBottle, getDailyHistoryBlessing} from '../src/life/daily-history-link';
import {rng} from '../src/templates/random';

test('Phase 1: Artisan machines process crops into 2.5-4x goods, boost with elements, and detect nearby floral honey', () => {
  const life = freshLife();
  const home = ensureHome(life);
  life.bag['crop-wheat'] = 4;
  life.bag['crop-tea'] = 2;
  const t0 = 1_000_000;

  // Watermill flour + preferred Water(0) boost => gold star!
  const started = startMachine(life, 'mill-1', 'mill-flour', t0);
  assert.equal(started.ok, true);
  assert.equal(life.bag['crop-wheat'], 2);

  const b1 = boostMachineWithElement(life, 'mill-1', 0, t0 + 1000);
  assert.equal(b1.ok, true);
  assert.equal(b1.goldStar, true);
  assert.ok(b1.progress > 0.35);

  const col = collectMachine(life, 'mill-1', t0 + 5 * 60_000);
  assert.equal(col.ok, true);
  assert.equal(col.outputId, 'art-flour');
  assert.equal(col.goldStar, true);
  assert.ok((col.bonusCoins ?? 0) > 0);
  assert.equal(life.bag['art-flour'], 2);

  // Beehive detects Starlight flower planted in nearby farm bed within 9.5m
  home.placed.push({id: 'bed-1', itemId: 'farm-bed-wood', x: 10, y: 0, z: 50, yaw: 0, scale: 1});
  life.plots['home-plot-bed-1'] = {crop: 'seed-starlight', planted: t0, watered: t0, grown: 0};
  const hive = {id: 'hive-1', itemId: 'poi-beehive', x: 14, y: 0, z: 52, yaw: 0, scale: 1};
  assert.equal(detectNearbyHoney(life, hive), 'art-star-honey');
  const hStart = startBeehiveCycle(life, hive, t0);
  assert.equal(hStart.ok, true);
  assert.equal(hStart.honeyId, 'art-star-honey');

  // Selling artisan item earns full market price
  const beforeCoins = life.coins;
  const sold = sellItem(life, 'art-flour', 2);
  assert.equal(sold.ok, true);
  assert.equal(sold.earned, ITEMS['art-flour'].price * 2);
  assert.equal(life.coins, beforeCoins + sold.earned);

  // Expanded recipes & food buffs
  assert.ok(RECIPES.length >= 24);
  assert.ok(ARTISAN_RECIPES.length >= 18);
  life.bag['food-lotus-porridge'] = 1;
  const ate = eatFood(life, 'food-lotus-porridge', t0);
  assert.equal(ate.ok, true);
  assert.equal(hasBuff(life, 'fishing_bar', t0 + 10_000), true);
  assert.equal(getActiveBuffs(life, t0 + 20 * 60_000).length, 0);
});

test('Phase 1: Time Museum 6-hall donation restores halls and unlocks permanent world perks', () => {
  const life = freshLife();
  const home = ensureHome(life);
  // Restore Lu Ban Craft Hall: 24 voxels + 2 expansions + 2 sourdough
  home.voxels = Array.from({length: 24}, (_, i) => ({x: i, y: 0, z: 45, blockId: 'vx-plaster'}));
  home.expansions.push(
    {id: 'tile_0_2', gx: 0, gz: 2, theme: 'farmland', unlockedAt: 1},
    {id: 'tile_0_3', gx: 0, gz: 3, theme: 'jiangnan', unlockedAt: 2},
  );
  life.bag['art-sourdough'] = 2;

  const ctx = {souvenirCount: 6};
  assert.equal(isMuseumHallRestored(life, 'craft'), false);
  assert.equal(voxelUnitPrice(life, 'vx-plaster'), 1);

  assert.equal(donateToMuseum(life, 'craft', 'craft-voxels', ctx).ok, true);
  assert.equal(donateToMuseum(life, 'craft', 'craft-expand', ctx).ok, true);
  const last = donateToMuseum(life, 'craft', 'craft-sourdough', ctx);
  assert.equal(last.ok, true);
  assert.equal(last.hallRestored, true);
  assert.equal(isMuseumHallRestored(life, 'craft'), true);
  // Craft Hall restoration perk: basic 1-shell blocks become FREE!
  assert.equal(voxelUnitPrice(life, 'vx-plaster'), 0);

  const sum = museumSummary(life, ctx);
  assert.equal(sum.restoredHalls, 1);
  assert.equal(sum.totalHalls, 6);
});

test('Phase 2: Voxel Greedy Mesher eliminates interior faces (0 coplanar Z-fighting), merges 3D collision boxes, and detects closed fence pastures', () => {
  // Build a solid 10x4x1 plaster wall (40 cubes)
  const wall: VoxelBlockData[] = [];
  for (let x = 0; x < 10; x++) {
    for (let y = 0; y < 4; y++) {
      wall.push({x, y, z: 50, blockId: 'vx-plaster', shape: 'cube'});
    }
  }
  const quads = buildGreedyCubeQuads(wall);
  // 40 cubes greedy-meshed into an exact 6-face rectangular prism (6 quads instead of 240)!
  assert.equal(quads.length, 6, `expected 6 merged quads, got ${quads.length}`);
  assert.equal(hasCoplanarOverlap(quads), false, 'Greedy mesher must produce ZERO coplanar overlap');

  // 3D AABB collision merger must compress all 40 cubes into 1 single collision Box!
  const boxes = mergeVoxelCollisionBoxes(wall);
  assert.equal(boxes.length, 1);
  assert.deepEqual(boxes[0].min, [0, 0, 50]);
  assert.deepEqual(boxes[0].max, [10, 4, 51]);

  // Verify specialty architectural shapes build cleanly without NaN
  const mixed: VoxelBlockData[] = [
    ...wall,
    {x: 0, y: 4, z: 50, blockId: 'vx-tile-roof', shape: 'slope', rot: 1},
    {x: 1, y: 4, z: 50, blockId: 'vx-stone-step', shape: 'stairs', rot: 2},
    {x: 2, y: 4, z: 50, blockId: 'vx-pillar-red', shape: 'pillar'},
    {x: 3, y: 4, z: 50, blockId: 'vx-lantern', shape: 'lantern'},
    {x: 4, y: 4, z: 50, blockId: 'vx-canal', shape: 'water'},
    {x: 5, y: 4, z: 50, blockId: 'vx-bounce', shape: 'slab'},
  ];
  const lookup = new Map(mixed.map(b => [voxelKey(b.x, b.y, b.z), b]));
  const buckets = buildChunkGeometryData(mixed, lookup);
  assert.ok(buckets.length >= 3);
  for (const b of buckets) {
    assert.ok(b.positions.every(Number.isFinite));
    assert.ok(b.indices.length % 3 === 0);
  }

  // Built-in Pasture Pen blueprint (7x7 fence ring => 5x5 = 25 interior cells) must be auto-detected!
  const penBp = BUILTIN_VOXEL_BLUEPRINTS.find(b => b.id === 'bp-pasture-pen')!;
  const penBlocks: VoxelBlockData[] = penBp.blocks.map(b => ({...b, x: b.x + 20, z: b.z + 60}));
  const pens = detectFencedPastures(penBlocks);
  assert.equal(pens.length, 1);
  assert.equal(pens[0].area, 25);
  assert.ok(pens[0].capacityBonus >= 3);
  assert.ok(VOXEL_CATALOG.length >= 24);
});

test('Phase 3: Wild rare animal encounters unlock ranch adoption, voxel fenced pens add capacity, and daily care yields products', () => {
  const life = freshLife();
  life.coins = 200;
  const spots = generateDailyEncounters(life, '2026-11-25', {season: 2, weather: 'mist', hour: 21, historyDay: true});
  assert.ok(spots.length >= 3);

  // Befriend the rare/legendary species using stealth + favorite item
  life.bag['crop-nightbloom'] = 2;
  const tame = interactWildEncounter(life, 'enc-test-snowfox', 'ranch-snow-fox', {
    sneaking: true,
    element: 4,
    feedFavorite: true,
  });
  assert.equal(tame.tamed, true);
  assert.equal(tame.firstDiscovery, true);
  assert.equal(life.bag['prod-star-fur'], 1);

  // Voxel pen adds real ranch capacity
  const pens = [{id: 'pen-1', center: [20, 60] as [number, number], y: 0, area: 25, capacityBonus: 3}];
  const cap = ranchCapacity(life, pens);
  assert.equal(cap.total, 5); // base 2 + voxel pen 3

  const adopt = adoptRanchAnimal(life, 'ranch-snow-fox', '小雪团', pens);
  assert.equal(adopt.ok, true);
  const petId = adopt.animal!.id;

  const care = careForAnimal(life, petId, '2026-11-25', true);
  assert.equal(care.ok, true);
  assert.equal(care.fed, true);
  assert.equal(care.petted, true);

  const prod = collectAnimalProduct(life, petId, '2026-11-25');
  assert.equal(prod.ok, true);
  assert.equal(prod.items[0].id, 'prod-star-fur');
  // Second collection same day blocked
  assert.equal(collectAnimalProduct(life, petId, '2026-11-25').ok, false);

  assert.equal(toggleAnimalFollow(life, petId), true);
});

test('Phase 4: Stardew fishing chasing-bar + treasure chest, fish ponds, rod upgrades & daily history drift bottles', () => {
  const life = freshLife();
  life.coins = 250;

  // Rod upgrades 1 -> 2 -> 3
  assert.equal(upgradeFishingRod(life).tier, 2);
  assert.equal(upgradeFishingRod(life).tier, 3);
  assert.ok(fishingBonuses(life).rodTier === 3);

  // Seasonal legendaries appear in their matching season & spot
  const r = rng('season-legend').next;
  let winterKing = 0;
  for (let i = 0; i < 600; i++) {
    const c = pickFish('waterfall', {hour: 12, raining: false, snowing: true, season: 3, historyDay: true}, 'bait-element', r);
    if (c.fish === 'fish-winter-icefish') winterKing++;
  }
  assert.ok(winterKing > 0, 'Winter Icefish King should be catchable at waterfall in winter');

  // Stardew chasing-bar simulation: actively chasing fishPos lands the catch & treasure!
  const s = new FishingSession(
    'lake',
    {hour: 12, raining: false, season: 0, historyDay: true},
    rng('stardew-play').next,
    'bait-element',
    {mode: 'stardew', rodTier: 3, treasureChance: 1.0},
  );
  assert.ok(s.treasure?.active);
  for (let t = 0; t < 90 && s.phase !== 'caught' && s.phase !== 'escaped'; t += 1 / 30) {
    if (s.phase === 'bite') s.hook();
    const barCenter = s.barPos + s.barSize * 0.5;
    s.update(1 / 30, barCenter < s.fishPos);
  }
  assert.equal(s.phase, 'caught');
  const first = landCatch(life, s.result()!, s.treasure!.rewardId);
  assert.equal(first, true);
  assert.equal(ensureHome(life).fishing!.treasuresFound, 1);

  // Ecological Fish Pond: stock, offline reproduce, wish expand, collect roe + pearl
  life.bag['fish-golden-trout'] = 1;
  const t0 = 5_000_000;
  assert.equal(stockFishPond(life, 'pond-1', 'fish-golden-trout', t0).ok, true);
  const pond = ensureHome(life).fishing!.ponds['pond-1'];
  assert.equal(stepFishPond(pond, t0 + POND_GROW_INTERVAL_MS * 2), 2);
  assert.equal(pond.count, 3);
  life.bag[pond.wishItem!] = pond.wishCount!;
  const exp = fulfillPondWish(life, 'pond-1');
  assert.equal(exp.ok, true);
  assert.equal(exp.newCapacity, 5);
  const harvest = collectFishPond(life, 'pond-1', '2026-11-25', t0 + POND_GROW_INTERVAL_MS * 2);
  assert.equal(harvest.ok, true);
  assert.ok(harvest.rewards.some(x => x.id === 'prod-roe'));
  assert.ok(harvest.rewards.some(x => x.id === 'prod-pearl'));

  // Daily History Linkage & Tide Drift Bottles
  const blessing = getDailyHistoryBlessing('1015'); // Shenzhou-5 space day!
  assert.equal(blessing.theme, 'cosmos');
  const bottle = claimDriftBottle(life, '2026-11-25', '1015');
  assert.equal(bottle.ok, true);
  assert.ok(bottle.rewardId && ITEMS[bottle.rewardId]);
  assert.ok(bottle.note && bottle.note.includes('漂流笺'));
});
