import test from 'node:test';
import assert from 'node:assert/strict';
import {rng} from '../src/templates/random';
import {CRITTER_KINDS, spawnCritter, stepCritter, awake, type Stalker} from '../src/life/critters';
import {ITEMS} from '../src/life/catalog';
const rabbit = CRITTER_KINDS.find(k => k.id === 'critter-rabbit')!;
const approach = (speed: number, spread: number) => {
  const c = spawnCritter(rabbit, [0, 0]), r = rng('c').next, s: Stalker = {pos: [-12, 0], speed, spread};
  for (let t = 0; t < 30; t += 1 / 30) { const dx = c.pos[0] - s.pos[0], dz = c.pos[1] - s.pos[1], d = Math.hypot(dx, dz); s.pos = [s.pos[0] + dx / d * speed / 30, s.pos[1] + dz / d * speed / 30]; if (stepCritter(c, s, 1 / 30, r) === 'caught') return true; }
  return false;
};
test('every critter kind is in the catalog', () => { for (const k of CRITTER_KINDS) assert.ok(ITEMS[k.id], k.id); });
test('rushing at a rabbit scares it off; sneaking flat catches it', () => {
  assert.equal(approach(3.2, 0), false);
  assert.equal(approach(1.4, 1), true);
});
test('a dash pounce still catches a fleeing critter at close range', () => {
  const c = spawnCritter(rabbit, [0, 0]); c.mood = 'flee';
  assert.equal(stepCritter(c, {pos: [.5, 0], speed: 6.3, spread: 0}, 1 / 30, () => .5), 'caught');
  assert.equal(stepCritter(spawnCritter(rabbit, [0, 0]), {pos: [5, 0], speed: 0, spread: 0}, 1 / 30, () => .5), null);
});
test('night and day critters keep their hours', () => {
  const ff = CRITTER_KINDS.find(k => k.id === 'critter-firefly')!;
  assert.equal(awake(ff, 22), true); assert.equal(awake(ff, 12), false); assert.equal(awake(rabbit, 12), true);
});
