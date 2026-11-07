import test from 'node:test';
import assert from 'node:assert/strict';
import {rng} from '../src/templates/random';
import {FishingSession, pickFish, landCatch} from '../src/life/fishing';
import {freshLife} from '../src/life/state';
import {ITEMS} from '../src/life/catalog';
const env = {hour: 12, raining: false, historyDay: false};
test('fish table is deterministic and only uses catalog fish', () => {
  const a = rng('f').next, b = rng('f').next;
  for (let i = 0; i < 50; i++) { const x = pickFish('lake', env, null, a), y = pickFish('lake', env, null, b); assert.deepEqual(x, y); assert.ok(ITEMS[x.fish]); }
});
test('the history fish only bites on history days; dawn trout only at dawn', () => {
  const r = rng('h').next; let history = 0, trout = 0;
  for (let i = 0; i < 2000; i++) { if (pickFish('lake', env, 'bait-glow', r).fish === 'fish-history') history++; if (pickFish('lake', env, 'bait-glow', r).fish === 'fish-golden-trout') trout++; }
  assert.equal(history, 0); assert.equal(trout, 0);
  for (let i = 0; i < 2000; i++) if (pickFish('lake', {hour: 6, raining: false, historyDay: true}, 'bait-glow', r).fish === 'fish-history') history++;
  assert.ok(history > 0);
});
const play = (s: FishingSession, ctrl: (s: FishingSession) => boolean) => { for (let t = 0; t < 120 && s.phase !== 'caught' && s.phase !== 'escaped'; t += 1 / 30) { if (s.phase === 'bite') s.hook(); s.update(1 / 30, ctrl(s)); } return s.phase; };
test('missing three bites loses the fish', () => {
  const s = new FishingSession('lake', env, rng('m').next);
  for (let t = 0; t < 60 && s.phase !== 'escaped'; t += 1 / 30) s.update(1 / 30, false);
  assert.equal(s.phase, 'escaped'); assert.equal(s.misses, 3);
});
test('holding reel snaps the line; keeping tension in the green lands the fish', () => {
  assert.equal(play(new FishingSession('lake', env, rng('a').next), () => true), 'escaped');
  for (const seed of ['b', 'c', 'd', 'e']) assert.equal(play(new FishingSession('harbor', env, rng(seed).next), s => s.tension < .5), 'caught', seed);
});
test('landing a catch fills the bag and keeps the biggest size', () => {
  const life = freshLife();
  assert.equal(landCatch(life, {fish: 'fish-carp', size: 30}), true); assert.equal(landCatch(life, {fish: 'fish-carp', size: 50}), false); landCatch(life, {fish: 'fish-carp', size: 40});
  assert.equal(life.bag['fish-carp'], 3); assert.equal(life.dex['fish-carp'].best, 50);
});
