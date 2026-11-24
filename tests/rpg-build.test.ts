import assert from 'node:assert/strict';
import test from 'node:test';
import {RpgBuild, StyleTracker, computePoiseDamage} from '../src/templates/rpg-build.ts';
import {isWeakpointHit} from '../src/level/skirmish-fx.ts';

test('RpgBuild drafts 3 unique unowned relics, applies stone shield & executes, and preserves checkpoints', () => {
  const build = new RpgBuild();
  const first = build.draftChoices('sekigahara-1021', 1);
  assert.equal(first.length, 3);
  assert.equal(new Set(first.map(r => r.id)).size, 3);

  const stoneGain = build.pick('stone');
  assert.equal(build.maxHealth, 130);
  assert.equal(stoneGain.shieldGain, 28);
  assert.equal(build.shield, 28);

  // Shield absorbs damage before HP
  const hit1 = build.absorbDamage(20);
  assert.deepEqual(hit1, {hpLoss: 0, absorbed: 20});
  assert.equal(build.shield, 8);
  const hit2 = build.absorbDamage(18);
  assert.deepEqual(hit2, {hpLoss: 10, absorbed: 8});

  // Execute refreshes stone shield and heals
  const exec = build.onExecute(12);
  assert.equal(exec.shieldRefreshed, true);
  assert.equal(build.shield, 28);

  // Potion consumption and cap
  assert.equal(build.addPotion(1), true);
  assert.equal(build.potions, 3);
  assert.equal(build.addPotion(1), false);
  const sip = build.usePotion(80);
  assert.equal(sip.used, true);
  assert.equal(sip.nextLife, 116);
  assert.equal(build.potions, 2);

  // Checkpoint snapshot & restore
  const snap = build.snapshot();
  build.pick('void');
  build.usePotion(50);
  build.restore(snap);
  assert.deepEqual(build.relics, ['stone']);
  assert.equal(build.potions, 2);

  // Second draft excludes already-owned relics
  const second = build.draftChoices('sekigahara-1021', 2);
  assert.equal(second.length, 3);
  assert.ok(!second.some(r => r.id === 'stone'));
});

test('StyleTracker climbs D->SS faster with element variety, drops on hurt, and scales RPG damage', () => {
  const style = new StyleTracker();
  const build = new RpgBuild();
  build.pick('blaze');
  build.pick('void');

  assert.equal(style.rank, 'D');
  for (let i = 0; i < 8; i++) {
    style.registerHit(i % 4, i % 2 === 1, i % 3 === 0);
  }
  assert.ok(style.tier >= 3, `expected >= A rank, got ${style.rank}`);
  style.registerEvent('execute');
  assert.ok(style.rank === 'S' || style.rank === 'SS');

  build.onBreakOrKill(10);
  const mult = build.damageMultiplier({
    element: 2,
    reactionKind: 'Overload',
    targetHasAura: true,
    targetBroken: true,
    now: 12,
    styleRank: style.rank,
  });
  assert.ok(mult > 3.0, 'stacked blaze + void + frenzy + S/SS style yields massive burst');

  const prevScore = style.score;
  style.onPlayerHurt();
  assert.equal(style.combo, 0);
  assert.ok(style.score < prevScore);
});

test('poise damage favors physical & heavy reactions; weakpoint detection matches head and exposed figurehead', () => {
  const normalWater = computePoiseDamage(20, 0, undefined, 1);
  const physBreak = computePoiseDamage(20, 5, 'BreakPoise', 1.45);
  assert.ok(physBreak > normalWater * 4);

  assert.equal(isWeakpointHit('sailor', [0, 0, 0], [0, 1.35, 0], false), true);
  assert.equal(isWeakpointHit('sailor', [0, 0, 0], [0, 0.65, 0], false), false);
  assert.equal(isWeakpointHit('guardian', [0, 0, 0], [0, 1.05, 0], true), true);
  assert.equal(isWeakpointHit('guardian', [0, 0, 0], [0, 1.05, 0], false), false);
});
