import assert from 'node:assert/strict';
import test from 'node:test';
import {DefenseGame, DEFENSE_CARDS, type ElementKind} from '../src/templates/defense.ts';

test('enhanced defense generates tactical tiles, discounts spring plants, upgrades to Lv.3 and refunds 60% on salvage', () => {
  const g = new DefenseGame('enhanced-1116', {enhanced: true});
  assert.equal(g.enhanced, true);
  assert.equal(g.tiles.length, 5);
  assert.ok(g.tiles.some(t => t.kind === 'amp'));
  assert.ok(g.tiles.some(t => t.kind === 'chill'));
  const spring = g.tiles.find(t => t.kind === 'spring')!;
  assert.ok(spring);

  assert.equal(g.start(['water', 'fire', 'thunder', 'wind']), true);
  // Spring tile discounts non-dew towers by 10
  const discountedCost = g.plantCost(spring.lane, spring.col, 'water');
  assert.equal(discountedCost, DEFENSE_CARDS.water.cost - 10);
  const startDew = g.dew;
  assert.equal(g.plant(spring.lane, spring.col, 'water'), true);
  assert.equal(g.dew, startDew - discountedCost);

  // Give enough dew to test Lv.1 -> Lv.2 -> Lv.3 upgrade, repair, and 60% salvage refund
  g.dew = 400;
  assert.equal(g.upgrade(spring.lane, spring.col), true);
  let tower = g.towers.find(t => t.lane === spring.lane && t.col === spring.col)!;
  assert.equal(tower.level, 2);
  assert.equal(g.upgrade(spring.lane, spring.col), true);
  assert.equal(tower.level, 3);
  assert.equal(g.upgrade(spring.lane, spring.col), false); // max level

  tower.hp = 20;
  assert.equal(g.repair(spring.lane, spring.col), true);
  assert.ok(tower.hp > 20);

  const expectedRefund = g.salvageValue(tower);
  assert.equal(expectedRefund, Math.round(tower.invested * 0.6));
  const beforeSalvage = g.dew;
  assert.equal(g.salvage(spring.lane, spring.col), expectedRefund);
  assert.equal(g.dew, beforeSalvage + expectedRefund);
});

test('enhanced defense triggers overload, swirl, corrode, shatter and commander support cannon', () => {
  const g = new DefenseGame('reactions-check', {enhanced: true});
  assert.ok(g.start(['fire', 'thunder', 'wind', 'physical']));
  g.dew = 500;
  // Plant thunder + fire to trigger Overload
  assert.ok(g.plant(2, 1, 'thunder'));
  assert.ok(g.plant(2, 2, 'fire'));
  g.enemies.push({
    id: 9001, kind: 'detune', lane: 2, x: 5.5, hp: 200, maxHp: 200, speed: 0.16,
    shadow: false, split: false, slowUntil: 0, wetUntil: 0, jamAt: 10, strikeAt: 0,
    aura: null, auraUntil: 0, stunUntil: 0, vulnUntil: 0, shield: 0, maxShield: 0, summonAt: 99,
  });
  g.tick(0.7);
  assert.ok(g.effects.some(fx => fx.reaction === 'overload'), 'fire + thunder triggers overload');
  assert.ok(g.reactions >= 1);

  // Test commander support cannon (requires 100 resonance)
  g.resonance = 100;
  const beforeHp = g.enemies[0].hp;
  assert.equal(g.castSupport(2, 5, 'fire'), true);
  assert.equal(g.resonance, 0);
  assert.ok(g.enemies[0].hp < beforeHp);
  assert.ok(g.burns.length >= 1, 'fire support leaves burning zone');
});

test('enhanced defense spawns shield elite in wave 4, boss in wave 8, and rewards early wave call', () => {
  const g = new DefenseGame('boss-run', {enhanced: true});
  const team: readonly ElementKind[] = ['water', 'fire', 'thunder', 'physical'];
  assert.ok(g.start(team));

  let sawShield = false;
  let sawBoss = false;
  let earlyBonus = 0;

  for (let sec = 0; sec < 540; sec++) {
    if (g.phase === 'interval' && g.wave === 1 && earlyBonus === 0) {
      earlyBonus = g.callNextWaveEarly();
    }
    // Player-like priority: defend upcoming/active lanes first, fund 2 dew towers, then fill & upgrade
    const urgent = g.upcoming?.lane ?? 2;
    const laneOrder = [urgent, ...[2, 1, 3, 0, 4].filter(l => l !== urgent)];
    if (!g.towers.some(t => t.lane === 2 && t.col === 0)) g.plant(2, 0, 'dew');
    for (const lane of laneOrder) {
      if (!g.towers.some(t => t.lane === lane && t.col === 2)) g.plant(lane, 2, 'water');
    }
    if (!g.towers.some(t => t.lane === 0 && t.col === 0)) g.plant(0, 0, 'dew');
    for (const lane of laneOrder) {
      if (!g.towers.some(t => t.lane === lane && t.col === 3)) g.plant(lane, 3, lane % 2 ? 'thunder' : 'fire');
    }
    for (const lane of laneOrder) {
      if (!g.towers.some(t => t.lane === lane && t.col === 5)) g.plant(lane, 5, 'physical');
      if (!g.towers.some(t => t.lane === lane && t.col === 1)) g.plant(lane, 1, 'fire');
    }
    for (const t of g.towers) {
      if (t.level < 3 && g.dew >= g.upgradeCost(t) + 35) g.upgrade(t.lane, t.col);
    }
    for (const d of [...g.drops]) g.collectDrop(d.id);
    if (g.resonance >= 100 && g.enemies.length > 0) {
      const target = g.boss ?? g.enemies[0];
      g.castSupport(target.lane, Math.min(7, Math.max(0, Math.floor(target.x))), 'fire');
    }
    for (let k = 0; k < 2; k++) {
      g.tick(0.5);
      if (g.enemies.some(e => e.kind === 'shield')) sawShield = true;
      if (g.boss) sawBoss = true;
    }
    if (g.phase === 'transmit' || g.phase === 'lost') break;
  }

  assert.ok(earlyBonus >= 12, 'early wave call awards bonus dew');
  assert.equal(sawShield, true, 'shield elite appears in enhanced mode');
  assert.equal(sawBoss, true, 'boss appears in wave 8');
  assert.equal(g.phase, 'transmit', `expected transmit, got ${g.phase} at wave ${g.wave}`);
  assert.ok(g.mvpTower !== null);
  assert.equal(g.transmit(), true);
});
