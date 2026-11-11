import test from 'node:test';
import assert from 'node:assert/strict';
import {generateExplore} from '../src/templates/explore-quest';
import {validateLayout} from '../src/templates/validate';
import {levels} from '../content/levels/registry';
import type {LevelSpec} from '../content/levels/types';
import {generateRunner, validateRunner} from '../src/templates/runner';
test('every registered level generates a reachable layout', () => {
  // other templates are checked by their own test files
  for (const spec of Object.values(levels)) { if (spec.template !== 'runner' && spec.template !== 'explore-quest') continue; const v = spec.template === 'runner' ? validateRunner(generateRunner(spec as any)) : validateLayout(generateExplore(spec as LevelSpec)); assert.ok(v.ok, spec.id + ': ' + v.errors.join('; ')); }
});
test('explore-quest stays solvable across 40 seeds', () => {
  const base = levels['0815-1920'] as LevelSpec;
  for (let i = 0; i < 40; i++) { const v = validateLayout(generateExplore({...base, seed: 'probe-' + i})); assert.ok(v.ok, `seed probe-${i}: ` + v.errors.join('; ')); }
});
test('same seed, same layout; the validator catches a walled-off target', () => {
  const spec = levels['0815-1920'], a = generateExplore(spec), b = generateExplore(spec);
  assert.deepEqual(a, b);
  const broken = {...a, boxes: [...a.boxes, {name: 'trap', min: [a.spots.draft1.x - 1.5, 0, a.spots.draft1.z - 1.5] as [number, number, number], max: [a.spots.draft1.x + 1.5, 4, a.spots.draft1.z + 1.5] as [number, number, number]}]};
  assert.equal(validateLayout(broken).ok, false);
});
