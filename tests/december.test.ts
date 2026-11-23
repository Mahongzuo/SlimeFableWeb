import test from 'node:test';
import assert from 'node:assert/strict';
import {decemberDays, decemberLevels} from '../content/december';
import {days} from '../content/registry';
import {levels} from '../content/levels/registry';
import {generateSolstice, validateSolstice, medalFor, modeHint} from '../src/templates/solstice';

test('December covers all 31 days (1201-1231) with unique ids and registered entries', () => {
  assert.equal(decemberLevels.length, 31);
  assert.equal(decemberDays.length, 31);
  const seen = new Set<string>();
  for (let d = 1; d <= 31; d++) {
    const dayId = '12' + String(d).padStart(2, '0');
    const dayMeta = decemberDays.find(x => x.day === dayId);
    assert.ok(dayMeta, `missing day ${dayId}`);
    assert.equal(days[dayId]?.day, dayId, `day ${dayId} not registered in content/registry`);
    const ch = dayMeta.chapters[0];
    assert.ok(ch, `day ${dayId} has no chapter`);
    assert.equal(ch.status, 'web');
    assert.equal(ch.template, 'solstice');
    assert.ok(!seen.has(ch.id), `duplicate chapter id ${ch.id}`);
    seen.add(ch.id);
    assert.ok(levels[ch.id], `level ${ch.id} not registered in content/levels/registry`);
  }
});

test('every December level generates a valid 3D Solstice layout with 3 nodes, 8 stars and safe bounds', () => {
  const biomes = new Set<string>();
  const monuments = new Set<string>();
  const modes = new Set<string>();
  for (const spec of decemberLevels) {
    biomes.add(spec.biome);
    monuments.add(spec.monument);
    modes.add(spec.mode);
    const layout = generateSolstice(spec);
    const check = validateSolstice(layout);
    assert.equal(check.ok, true, `${spec.id} layout invalid: ${check.errors.join(', ')}`);
    assert.equal(layout.nodes.length, 3);
    assert.equal(layout.stars.length, 8);
    assert.ok(layout.boxes.length === layout.platforms.length);
    assert.ok(modeHint(spec.mode).length > 8);
  }
  assert.equal(biomes.size, 6, 'all 6 biomes should be represented');
  assert.ok(monuments.size >= 10, 'rich variety of hero monuments should be represented');
  assert.equal(modes.size, 4, 'all 4 gameplay archetypes should be represented');
});

test('solemn December day (1213) uses sanctuary biome and solemn tone', () => {
  const d1213 = decemberLevels.find(s => s.id.startsWith('1213-'));
  assert.ok(d1213);
  assert.equal(d1213.tone, 'solemn');
  assert.equal(d1213.biome, 'sanctuary');
});

test('medal grading respects gold, silver and bronze thresholds', () => {
  const spec = decemberLevels[0];
  assert.equal(medalFor(spec, spec.medals.gold - 1), '金牌');
  assert.equal(medalFor(spec, spec.medals.gold), '金牌');
  assert.equal(medalFor(spec, spec.medals.gold + 5), '银牌');
  assert.equal(medalFor(spec, spec.medals.silver + 10), '铜牌');
});
