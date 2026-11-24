import test from 'node:test';
import assert from 'node:assert/strict';
import {modesFor, modeKinds} from '../content/daily-modes';
import {days} from '../content/registry';
import {gatesFor, defaultEntry} from '../src/game/mode-gates';

test('六月每天三件中国史事和一件海外史事，按门独立收藏', () => {
  const saveIds = new Set<string>();
  const souvenirs = new Set<string>();
  for (let n = 1; n <= 30; n++) {
    const day = '06' + String(n).padStart(2, '0');
    const entry = days[day];
    const modes = modesFor(day);
    assert.equal(entry.chapters.filter(c => c.status === 'web').length, 2, day);
    assert.deepEqual(modes.map(m => m.kind), modeKinds, day);
    assert.deepEqual(gatesFor(entry).slice(2).map(defaultEntry), modes.map(m => m.id), day);
    assert.deepEqual(modes.map(m => m.region).sort(), ['中国','中国','中国','海外'], day);
    assert.equal(new Set(modes.map(m => m.source)).size, 4, day);
    for (const m of modes) {
      assert.ok(m.fact.startsWith(m.year + '年6月' + n + '日，'), m.id);
      assert.ok(m.storyId.startsWith(m.region === '中国' ? 'cn-' : 'intl-'), m.id);
      assert.equal(m.playPath, 'level.html?id=' + m.id);
      saveIds.add(m.saveId);
      souvenirs.add(m.souvenir);
    }
  }
  assert.equal(saveIds.size, 120);
  assert.equal(souvenirs.size, 120);
});
