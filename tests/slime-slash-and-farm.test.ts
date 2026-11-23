import test from 'node:test';
import assert from 'node:assert/strict';
import {Combat, type SwingAreaEvent, type SwingStartEvent} from '../src/slime/combat';
import {computeSwingTrajectory, ELEMENT_SLASH_STYLES, SLASH_CONFIG} from '../src/slime/slash-vfx';
import {CROP_LIST, CROP_META, CROPS, ITEMS} from '../src/life/catalog';
import {addItem, ensureHome, freshLife} from '../src/life/state';
import {plant, water} from '../src/life/farming';
import {applyElementAttackToPlot, harvestEnhanced, shopSeedList} from '../src/life/cultivation';
import {BUILD_ITEMS, canPlaceProp} from '../src/home/build-catalog';
import {
  buildExpansionSurface,
  computeExpandedBounds,
  computeFrontierSlots,
  EXPANSION_SLOT_MAP,
  EXPANSION_SLOTS,
  expansionCost,
  expansionHeight,
  isInsideHomeTerritory,
} from '../src/world/expansion';
import {inland} from '../src/world/map';
import {createWorld} from '../src/slime/world';

test('UE 6-element slash VFX defines distinct styles for all 6 elements and exact UE 4-hit combo swing angles', () => {
  assert.equal(ELEMENT_SLASH_STYLES.length, 6);
  const patterns = new Set(ELEMENT_SLASH_STYLES.map(s => s.pattern));
  assert.equal(patterns.size, 6);

  const t0 = computeSwingTrajectory(0);
  const t1 = computeSwingTrajectory(1);
  const t2 = computeSwingTrajectory(2);
  const t3 = computeSwingTrajectory(3);
  assert.equal(t0.startYawDeg, SLASH_CONFIG.swingHalfAngleDeg);
  assert.equal(t0.endYawDeg, -SLASH_CONFIG.swingHalfAngleDeg);
  assert.equal(t1.startYawDeg, -SLASH_CONFIG.swingHalfAngleDeg);
  assert.equal(t2.startPitchDeg, SLASH_CONFIG.diagonalPitchDeg);
  assert.equal(t2.endPitchDeg, -SLASH_CONFIG.diagonalPitchDeg);
  assert.equal(t3.isFinisher, true);
  assert.ok(t3.scale > t0.scale);
});

test('Combat dispatches onSwingStart immediately and onSwingArea once during hit window', () => {
  const combat = new Combat([]);
  const starts: SwingStartEvent[] = [];
  const areas: SwingAreaEvent[] = [];
  combat.onSwingStart = e => starts.push(e);
  combat.onSwingArea = e => areas.push(e);

  combat.attack(2, [0, 0, -1]); // Fire hit 1
  assert.equal(starts.length, 1);
  assert.equal(starts[0].element, 2);
  assert.equal(starts[0].comboIndex, 0);

  for (let i = 0; i < 30; i++) {
    combat.update(0.02, [0, 0, 0], i * 0.02, () => {});
  }
  assert.equal(areas.length, 1);
  assert.equal(areas[0].element, 2);
  assert.equal(areas[0].isFinisher, false);
});

test('UE 32-crop catalog registers >= 30 crops with full metadata and categorized shop listing', () => {
  assert.ok(CROP_LIST.length >= 30);
  for (const [id] of CROP_LIST) {
    const seedId = `seed-${id}`;
    assert.ok(CROPS[seedId], `missing CROPS[${seedId}]`);
    assert.ok(CROP_META[seedId], `missing CROP_META[${seedId}]`);
    assert.equal(ITEMS[seedId]?.kind, 'seed');
    assert.equal(ITEMS[`crop-${id}`]?.kind, 'crop');
  }
  const life = freshLife();
  const shop = shopSeedList(life, '2026-11-23');
  assert.ok(shop.length >= 25);
});

test('Fire attack burns non-fire crops, accelerates fire-loving Chili, and triggers Steam after Water', () => {
  const life = freshLife();
  const now = 1_000_000;
  addItem(life, 'seed-radish', 2);
  addItem(life, 'seed-chili', 2);

  // 1. Fire destroys non-fire Radish in 1 hit
  plant(life, 'p1', 'seed-radish', now);
  const burn = applyElementAttackToPlot(life, 'p1', 2, now + 500, false, () => 0.5);
  assert.equal(burn.kind, 'burned');
  assert.equal(burn.destroyed, true);
  assert.equal(life.plots['p1'], null);

  // 2. Fire accelerates fire-loving Chili instead of burning it
  plant(life, 'p2', 'seed-chili', now);
  const warm = applyElementAttackToPlot(life, 'p2', 2, now + 500, false, () => 0.5);
  assert.equal(warm.kind, 'warmed');
  assert.equal(warm.destroyed, false);
  assert.equal(life.plots['p2']?.warmBoost, true);

  // 3. Water -> Fire within 8s triggers Steam Greenhouse instead of burning Radish
  plant(life, 'p3', 'seed-radish', now);
  const wet = applyElementAttackToPlot(life, 'p3', 0, now + 500, false, () => 0.5);
  assert.equal(wet.kind, 'watered');
  const steam = applyElementAttackToPlot(life, 'p3', 2, now + 2000, false, () => 0.5);
  assert.equal(steam.kind, 'steam');
  assert.equal(steam.destroyed, false);
  assert.ok((life.plots['p3']?.steamUntil ?? 0) > now + 2000);
});

test('Water attack washes away water-sensitive Chili, soaked non-water crops, or finisher slams', () => {
  const life = freshLife();
  const now = 2_000_000;
  addItem(life, 'seed-chili', 1);
  addItem(life, 'seed-radish', 2);

  // 1. Water-sensitive Chili gets washed away immediately
  plant(life, 'c1', 'seed-chili', now);
  const washChili = applyElementAttackToPlot(life, 'c1', 0, now + 100, false, () => 0.5);
  assert.equal(washChili.kind, 'washed');
  assert.equal(washChili.destroyed, true);
  assert.equal(life.plots['c1'], null);

  // 2. Finisher water wave destroys normal crop
  plant(life, 'c2', 'seed-radish', now);
  const washFin = applyElementAttackToPlot(life, 'c2', 0, now + 100, true, () => 0.5);
  assert.equal(washFin.kind, 'washed');
  assert.equal(washFin.destroyed, true);
  assert.equal(life.plots['c2'], null);
});

test('Lightning zaps dry non-lightning crops, but electro-ripens recently watered crops into rare variants', () => {
  const life = freshLife();
  const now = 3_000_000;
  addItem(life, 'seed-carrot', 2);

  plant(life, 'l1', 'seed-carrot', now);
  const zap = applyElementAttackToPlot(life, 'l1', 3, now + 100, false, () => 0.5);
  assert.equal(zap.kind, 'zapped');
  assert.equal(zap.destroyed, true);
  assert.equal(life.plots['l1'], null);

  plant(life, 'l2', 'seed-carrot', now);
  applyElementAttackToPlot(life, 'l2', 0, now + 100, false, () => 0.5);
  const electro = applyElementAttackToPlot(life, 'l2', 3, now + 1000, false, () => 0.5);
  assert.equal(electro.kind, 'electro_ripe');
  assert.equal(electro.destroyed, false);
  assert.equal(life.plots['l2']?.variant, 'rare');
});

test('Dark fertilizes plots for +1 bonus yield & placeable farm beds are registered cleanly', () => {
  const life = freshLife();
  const now = 4_000_000;
  addItem(life, 'seed-radish', 1);
  plant(life, 'd1', 'seed-radish', now);
  water(life, 'd1', now, 0, () => 1);
  const fert = applyElementAttackToPlot(life, 'd1', 4, now + 200, false, () => 0.5);
  assert.equal(fert.kind, 'fertilized');
  assert.ok((life.plots['d1']?.fertility ?? 0) >= 0.5);

  const ripeTime = now + 5 * 60_000;
  const h = harvestEnhanced(life, 'd1', ripeTime, () => 0, 1); // +1 fertile +1 large bed
  assert.ok(h !== null);
  assert.equal(h!.n, CROPS['seed-radish'].yield[0] + 2);

  assert.equal(BUILD_ITEMS['farm-bed-wood']?.farmBed?.rows, 2);
  assert.equal(BUILD_ITEMS['farm-bed-stone']?.farmBed?.noWeeds, true);
  assert.equal(BUILD_ITEMS['farm-bed-large']?.farmBed?.extraYield, 1);
});

test('DreamWorld territory expansion propagates frontier slots cleanly and prices first expansion free', () => {
  assert.equal(EXPANSION_SLOTS.length, 12);
  assert.equal(expansionCost(0), 0);
  assert.equal(expansionCost(1), 20);
  assert.equal(expansionCost(2), 35);

  const initial = computeFrontierSlots([]);
  assert.equal(initial.some(s => s.gx === -1 && s.gz === 2), true);
  assert.equal(initial.some(s => s.gx === -1 && s.gz === 3), false);

  const afterUnlock = computeFrontierSlots([{id: 'exp-n-c', gx: -1, gz: 2, theme: 'farmland', unlockedAt: 1}]);
  assert.equal(afterUnlock.some(s => s.gx === -1 && s.gz === 2), false);
  assert.equal(afterUnlock.some(s => s.gx === -1 && s.gz === 3), true);
});

test('Expansion height guarantees zero vertical step along base WORLD seam and between adjacent tiles of different themes', () => {
  const slotW = EXPANSION_SLOT_MAP['exp-n-w'];
  const slotC = EXPANSION_SLOT_MAP['exp-n-c'];

  for (let x = slotW.min[0]; x <= slotW.max[0]; x += 5) {
    const hBase = inland(x, 142);
    const hExp = expansionHeight(x, 142, slotW, 'farmland');
    assert.ok(Math.abs(hBase - hExp) < 0.001, `base seam mismatch at x=${x}: ${hBase} vs ${hExp}`);
  }

  for (let z = 142; z <= 182; z += 4) {
    const h1 = expansionHeight(-66, z, slotW, 'farmland');
    const h2 = expansionHeight(-66, z, slotC, 'meadow');
    assert.ok(Math.abs(h1 - h2) < 0.001, `tile seam mismatch at z=${z}: ${h1} vs ${h2}`);
  }
});

test('Unlocking an expansion tile extends buildable territory, CollisionWorld terrain, and bounds', () => {
  const bed = BUILD_ITEMS['farm-bed-wood'];
  assert.equal(canPlaceProp(bed, -46, 162, 1, [], 0.7, null, []).ok, false);

  const life = freshLife();
  const tile = {id: 'exp-n-c', gx: -1, gz: 1, theme: 'farmland' as const, unlockedAt: 100};
  ensureHome(life).expansions.push(tile);

  assert.equal(isInsideHomeTerritory(-46, 162, life.home!.expansions), true);
  assert.equal(canPlaceProp(bed, -46, 162, 1, [], 0.7, null, life.home!.expansions).ok, true);

  const surf = buildExpansionSurface(tile)!;
  const world = createWorld({boxes: [], surfaces: [surf], bounds: computeExpandedBounds(life.home!.expansions)});
  const ty = world.terrain(-46, 162);
  assert.ok(ty !== null);
  assert.ok(Math.abs(ty! - expansionHeight(-46, 162, EXPANSION_SLOT_MAP['exp-n-c'], 'farmland')) < 0.02);
  assert.ok(world.definition.bounds!.max[2] >= 182);
});
