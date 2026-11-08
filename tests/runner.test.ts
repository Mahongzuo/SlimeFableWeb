import test from 'node:test';
import assert from 'node:assert/strict';
import {generateRunner, validateRunner} from '../src/templates/runner';
import spec from '../content/levels/1001-1949';
test('1001-1949 course: four segments in order, 28 pickups, finish at the flag plinth', () => {
  const l = generateRunner(spec);
  assert.deepEqual(l.segments.map(s => s.kind), ['hutong', 'roofs', 'avenue', 'bridge']);
  assert.equal(l.pickups.length, 28); assert.ok(l.finish.x > l.segments[3].x0);
  assert.ok(l.water.length === 1);
});
test('every runner seed is clearable with single walking jumps', () => {
  for (let i = 0; i < 40; i++) { const v = validateRunner(generateRunner({...spec, seed: 'probe-' + i})); assert.ok(v.ok, `probe-${i}: ${v.errors.join('; ')}`); }
});
