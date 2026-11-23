import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILD_ITEMS, buildPropCollisionBox} from '../src/home/build-catalog';
import {createWorld} from '../src/slime/world';
import {
  ELEMENT_ROLES,
  ELEMENT_SWITCH_COOLDOWN,
  MAX_SKILL_ENERGY,
  resolveElementReaction,
  SKILL_KITS,
  SkillRuntime,
} from '../src/slime/skills';
import {Combat} from '../src/slime/combat';
import {
  buildExpansionSurface,
  computeDynamicFrontier,
  computeExpandedBounds,
  EXPANSION_COST_CAP,
  expansionCost,
  expansionHeight,
  isInsideHomeTerritory,
  makeExpansionSlot,
  resolveExpansionSlot,
  tileKey,
} from '../src/world/expansion';
import type {ExpandedTile} from '../src/life/state';

test('Raised farm beds are solid with exact 1:1 outer-wall collision preventing horizontal clipping', () => {
  for (const id of ['farm-bed-wood', 'farm-bed-stone', 'farm-bed-large']) {
    const def = BUILD_ITEMS[id];
    assert.equal(def.solid, true, `${id} must be solid`);
    const box = buildPropCollisionBox({id: 'p1', itemId: id, x: 0, z: 48, y: 0, yaw: 0, scale: 1});
    assert.ok(box !== null);
    assert.ok(Math.abs(box!.max[0] - def.width * 0.5) < 0.01);
    assert.ok(Math.abs(box!.max[2] - (48 + def.depth * 0.5)) < 0.01);
    assert.ok(box!.max[1] >= 0.35, 'bed rim height must exceed 0.32m capsule auto-step so side walls block clipping');

    // Moving horizontally into the bed wall from outside must be blocked before entering the bed interior
    const world = createWorld({boxes: [box!], surfaces: [{min: [-20, 20], max: [20, 70], height: 0}]});
    const moved = world.moveCapsule([0, 0, 48 + def.depth * 0.5 + 0.5], [0, 0, -1.2], 0.22, 0.52);
    assert.ok(moved.squeezed, 'walking into raised bed wall must register collision');
    assert.ok(moved.position[2] >= 48 + def.depth * 0.5 + 0.18, 'slime must not clip inside farm bed wall');

    // Jumping onto the bed top must be supported cleanly
    const sup = world.support(0, 48, 0.35);
    assert.ok(sup !== null && sup >= 0.34, 'slime jumping onto bed must stand on top');
  }
});

test('ARPG SkillRuntime enforces 1.0s global element-switch cooldown, 18 skills, energy & cooldowns', () => {
  assert.equal(SKILL_KITS.length, 6);
  assert.equal(ELEMENT_ROLES.length, 6);
  for (let el = 0; el < 6; el++) {
    assert.ok(SKILL_KITS[el].E && SKILL_KITS[el].R && SKILL_KITS[el].Q);
    assert.equal(SKILL_KITS[el].Q.energyCost, MAX_SKILL_ENERGY);
  }

  const rt = new SkillRuntime();
  // Switching 0 -> 2 succeeds and starts 1.0s cooldown
  const sw1 = rt.trySwitchElement(0, 2);
  assert.equal(sw1.ok, true);
  assert.equal(sw1.changed, true);
  assert.equal(rt.switchCd, ELEMENT_SWITCH_COOLDOWN);

  // Switching immediately again 2 -> 3 is blocked!
  const sw2 = rt.trySwitchElement(2, 3);
  assert.equal(sw2.ok, false);
  assert.ok(sw2.remaining > 0.9);

  // After 1.05s, switching succeeds again
  rt.step(1.05);
  const sw3 = rt.trySwitchElement(2, 3);
  assert.equal(sw3.ok, true);

  // Casting Q consumes 100 energy and starts Q cooldown
  const qDef = rt.cast(3, 'Q');
  assert.ok(qDef !== null);
  assert.equal(rt.energy, 0);
  assert.equal(rt.canCast(3, 'Q').ok, false);

  // Casting E works independently, grants partial energy, and goes on CD
  const eDef = rt.cast(3, 'E');
  assert.ok(eDef !== null);
  assert.ok(rt.energy > 0);
  assert.equal(rt.canCast(3, 'E').reason, 'cd');
});

test('11 UE elemental reactions trigger properly on CombatTarget auras', () => {
  const vap = resolveElementReaction(0, 2);
  assert.equal(vap?.kind, 'Vaporize');
  assert.equal(vap?.multiplier, 1.5);
  assert.equal(resolveElementReaction(0, 3)?.kind, 'ElectroCharge');
  assert.equal(resolveElementReaction(2, 3)?.kind, 'Overload');
  assert.equal(resolveElementReaction(2, 1)?.kind, 'Combustion');
  assert.equal(resolveElementReaction(3, 4)?.kind, 'VoidShock');
  assert.equal(resolveElementReaction(0, 5)?.kind, 'BreakPoise');

  const combat = new Combat([[0, 0, -2]]);
  const reactions: string[] = [];
  combat.hitTargetsInRadius([0, 0, -2], 2, 0, 10, 1.0, (_t, _d, _el, r) => { if (r) reactions.push(r.kind); });
  assert.equal(combat.targets[0].aura, 0);
  assert.equal(reactions.length, 0);

  // Hit with Fire while Water aura is active -> triggers Vaporize & consumes aura
  combat.hitTargetsInRadius([0, 0, -2], 2, 2, 20, 2.0, (_t, _d, _el, r) => { if (r) reactions.push(r.kind); });
  assert.deepEqual(reactions, ['Vaporize']);
  assert.equal(combat.targets[0].aura, null);
});

test('DreamWorld infinite dynamic grid expands 20+ tiles infinitely with capped cost, sandbox mode, and 0-step seams', () => {
  // Cost cap & sandbox toggle
  assert.equal(expansionCost(0, false), 0);
  assert.equal(expansionCost(1, false), 20);
  assert.equal(expansionCost(2, false), 35);
  assert.equal(expansionCost(3, false), EXPANSION_COST_CAP);
  assert.equal(expansionCost(99, false), EXPANSION_COST_CAP);
  assert.equal(expansionCost(99, true), 0);

  // Expand 22 consecutive tiles northward & westward (way beyond old 12-tile cap!)
  const expansions: ExpandedTile[] = [];
  let focus: [number, number] = [-46, 160];
  for (let i = 0; i < 22; i++) {
    const frontier = computeDynamicFrontier(expansions, focus, 8);
    assert.ok(frontier.length > 0, `step ${i} must always produce frontier slots`);
    const pick = frontier[0];
    expansions.push({id: pick.id, gx: pick.gx, gz: pick.gz, theme: i % 2 === 0 ? 'farmland' : 'jiangnan', unlockedAt: i});
    focus = [(pick.min[0] + pick.max[0]) * 0.5, (pick.min[1] + pick.max[1]) * 0.5 + 35];
  }
  assert.equal(expansions.length, 22);

  // Verify far northern tile (gx = -1, gz = 8) resolves cleanly, generates valid surface & seamless edge with gz = 7
  const slot7 = makeExpansionSlot(-1, 7);
  const slot8 = makeExpansionSlot(-1, 8);
  assert.equal(slot7.max[1], slot8.min[1]);
  for (let x = slot7.min[0]; x <= slot7.max[0]; x += 5) {
    const h7 = expansionHeight(x, slot7.max[1], slot7, 'meadow');
    const h8 = expansionHeight(x, slot8.min[1], slot8, 'coast');
    assert.ok(Math.abs(h7 - h8) < 0.001, `infinite seam mismatch at x=${x}`);
  }

  // Legacy Round 2 IDs still resolve cleanly alongside new tile_gx_gz IDs
  assert.ok(resolveExpansionSlot('exp-n-c') !== null);
  assert.ok(resolveExpansionSlot(tileKey(-4, 6)) !== null);

  const farTile: ExpandedTile = {id: tileKey(-1, 8), gx: -1, gz: 8, theme: 'farmland', unlockedAt: 1};
  const surf = buildExpansionSurface(farTile);
  assert.ok(surf !== null);
  assert.equal(isInsideHomeTerritory(-46, slot8.min[1] + 20, [farTile]), true);
  assert.ok(computeExpandedBounds([farTile]).max[2] >= slot8.max[1]);
});
