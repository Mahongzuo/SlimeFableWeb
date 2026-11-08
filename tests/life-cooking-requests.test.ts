import test from 'node:test';
import assert from 'node:assert/strict';
import {freshLife} from '../src/life/state';
import {cook, cookable, nearest, FIRE} from '../src/life/cooking';
import {dailyRequests, deliver, today} from '../src/life/requests';
import {ITEMS} from '../src/life/catalog';
test('cooking needs fire and the ingredients, and logs the dish', () => {
  const life = freshLife(); life.bag['crop-corn'] = 2;
  assert.deepEqual(cook(life, 'food-corn-roast', 0), {ok: false, reason: 'fire'});
  assert.deepEqual(cookable(life).map(r => r.id), ['food-corn-roast']);
  const r = cook(life, 'food-corn-roast', FIRE); assert.ok(r.ok && r.first);
  assert.equal(life.bag['crop-corn'], undefined); assert.equal(life.bag['food-corn-roast'], 1);
  assert.equal(cook(life, 'food-corn-roast', FIRE).reason, 'ingredients');
  life.bag['crop-strawberry'] = 2; assert.equal(nearest(life).missing, 1);
});
test('three daily requests, same for the same day, all from the catalog', () => {
  const a = dailyRequests('2026-11-08'), b = dailyRequests('2026-11-08'), c = dailyRequests('2026-11-09');
  assert.deepEqual(a, b); assert.notDeepEqual(a, c); assert.equal(a.length, 3);
  for (const q of a) { assert.ok(ITEMS[q.item]); assert.ok(q.reward > ITEMS[q.item].price * q.count); }
});
test('delivering pays once and needs the goods; a new day brings new requests', () => {
  const life = freshLife(), [q] = today(life, '2026-11-08');
  assert.equal(deliver(life, '2026-11-08', q.id).ok, false);
  life.bag[q.item] = q.count; const r = deliver(life, '2026-11-08', q.id);
  assert.ok(r.ok); assert.equal(life.coins, q.reward); assert.equal(deliver(life, '2026-11-08', q.id).ok, false);
  assert.notEqual(today(life, '2026-11-09')[0].id, q.id);
});
