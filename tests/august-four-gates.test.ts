import test from 'node:test';
import assert from 'node:assert/strict';
import {collectedMemories, modeById, modeKinds} from '../content/daily-modes';
import {days} from '../content/registry';
import {defaultEntry, gatesFor} from '../src/game/mode-gates';
import {januaryMatches} from '../src/templates/january-match';

test('八月每一天的四扇实体门对应三件中国史事和一件海外史事', () => {
  const keepsakes = new Set<string>();
  const saves = new Set<string>();
  const boardSequences = new Set<string>();
  for (let n = 1; n <= 31; n++) {
    const day = '08' + String(n).padStart(2, '0');
    assert.equal(days[day].chapters.filter(chapter => chapter.status === 'web').length, 2);
    const ids = gatesFor(days[day]).slice(2).map(defaultEntry);
    assert.deepEqual(ids, modeKinds.map(kind => day + '-' + kind));
    const stories = ids.map(id => modeById(id!)!);
    assert.deepEqual(stories.map(story => story.region).sort(), ['中国', '中国', '中国', '海外'], day);
    assert.equal(new Set(stories.map(story => story.source)).size, 4, day);
    for (const story of stories) {
      assert.ok(story.fact.replaceAll(' ', '').startsWith(story.year + '年8月' + n + '日'), story.id);
      assert.equal(story.playPath, 'level.html?id=' + story.id);
      keepsakes.add(story.souvenir);
      saves.add(story.saveId);
    }
    const match = januaryMatches[day];
    if (day === '0815') assert.equal(match, undefined);
    else boardSequences.add(JSON.stringify(match.tableaux));
  }
  assert.equal(keepsakes.size, 124);
  assert.equal(saves.size, 124);
  assert.equal(boardSequences.size, 30);
});

test('八月十五日保留原运河通航票与更早的和平纪念收藏', () => {
  const canal = modeById('0815-match')!;
  assert.equal(canal.saveId, '0815-match-panama-canal');
  assert.equal(canal.souvenir, '安康号通航票');
  assert.deepEqual(collectedMemories(['0815-match', canal.saveId]).map(group => group[0].storyId).sort(),
    ['nanjing-memorial', 'panama-canal']);
});
