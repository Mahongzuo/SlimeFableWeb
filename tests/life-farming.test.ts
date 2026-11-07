import test from 'node:test';
import assert from 'node:assert/strict';
import {freshLife} from '../src/life/state';
import {burnWeeds, growth, harvest, phase, plant, water, WATER_MS, WITHER_MS} from '../src/life/farming';
import {CROPS} from '../src/life/catalog';
const MIN = 60_000, never = () => .99, always = () => 0;
const setup = (seed = 'seed-corn') => { const life = freshLife(); life.bag[seed] = 1; assert.ok(plant(life, 'farm-1-0', seed, 0)); return life; };
test('a crop needs seeds and an empty plot', () => {
  const life = freshLife(); assert.equal(plant(life, 'farm-1-0', 'seed-corn', 0), false);
  life.bag['seed-corn'] = 2; assert.ok(plant(life, 'farm-1-0', 'seed-corn', 0)); assert.equal(plant(life, 'farm-1-0', 'seed-corn', 0), false); assert.equal(life.bag['seed-corn'], 1);
});
test('crops grow only while the soil is wet', () => {
  const life = setup('seed-pumpkin'), p = life.plots['farm-1-0']!;
  assert.equal(growth(p, 30 * MIN), 0, 'never watered');
  water(life, 'farm-1-0', 30 * MIN, 1, never);
  const g10 = growth(p, 40 * MIN), g60 = growth(p, 90 * MIN);
  assert.ok(Math.abs(g10 - WATER_MS / CROPS['seed-pumpkin'].growMs) < 1e-6 && g60 === g10, `stops after ${WATER_MS / MIN} min: ${g10} ${g60}`);
  water(life, 'farm-1-0', 100 * MIN, 1, never); assert.ok(growth(p, 110 * MIN) > g10, 'a second watering carries on');
});
test('water element keeps the soil wet twice as long', () => {
  const a = setup('seed-pumpkin'), b = setup('seed-pumpkin');
  water(a, 'farm-1-0', 0, 1, never); water(b, 'farm-1-0', 0, 0, never);
  assert.ok(Math.abs(growth(b.plots['farm-1-0']!, 60 * MIN) - 2 * growth(a.plots['farm-1-0']!, 60 * MIN)) < 1e-6);
});
test('weeds halve growth until fire burns them', () => {
  const life = setup('seed-pumpkin'), p = life.plots['farm-1-0']!;
  water(life, 'farm-1-0', 0, 1, always); assert.ok(p.weeds);
  assert.ok(Math.abs(growth(p, 4 * MIN) - 2 * MIN / CROPS['seed-pumpkin'].growMs) < 1e-6);
  assert.ok(burnWeeds(life, 'farm-1-0', 4 * MIN)); assert.ok(Math.abs(growth(p, 6 * MIN) - 4 * MIN / CROPS['seed-pumpkin'].growMs) < 1e-6);
});
test('ripe crops harvest into the bag and dex; neglected ones wither', () => {
  const life = setup('seed-radish');
  water(life, 'farm-1-0', 0, 0, never); assert.equal(phase(life.plots['farm-1-0'], .5 * MIN), 'sprout');
  assert.equal(phase(life.plots['farm-1-0'], 4 * MIN), 'ripe'); assert.equal(harvest(life, 'farm-1-0', 1 * MIN, never), null);
  const got = harvest(life, 'farm-1-0', 5 * MIN, never)!; assert.equal(got.item, 'crop-radish'); assert.equal(life.bag['crop-radish'], 3); assert.equal(life.dex['crop-radish'].n, 1);
  assert.equal(phase(life.plots['farm-1-0'], 6 * MIN), 'empty');
  const late = setup('seed-radish'); water(late, 'farm-1-0', 0, 0, never);
  assert.equal(phase(late.plots['farm-1-0'], 3 * MIN + WITHER_MS + MIN), 'withered');
});
