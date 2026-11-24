import test from 'node:test';
import assert from 'node:assert/strict';
import {collectedMemories, modeById, modeKinds} from '../content/daily-modes';
import {days} from '../content/registry';
import {defaultEntry, gatesFor, gateContains, journeyFor} from '../src/game/mode-gates';
import {januaryMatches} from '../src/templates/january-match';

test('十月每一天的四扇实体门对应三件中国史事和一件海外史事', () => {
  const keepsakes = new Set<string>();
  const saves = new Set<string>();
  const boardSequences = new Set<string>();
  for (let n = 1; n <= 31; n++) {
    const day = '10' + String(n).padStart(2, '0');
    assert.equal(days[day].chapters.filter(chapter => chapter.status === 'web').length, 1);
    const ids = gatesFor(days[day]).slice(2).map(defaultEntry);
    assert.deepEqual(ids, modeKinds.map(kind => day==='1021' && kind==='rpg' ? '1021-rpg-cn-jinchuan-2025' : day + '-' + kind));
    const stories = ids.map(id => modeById(id!)!);
    assert.deepEqual(stories.map(story => story.region).sort(), ['中国', '中国', '中国', '海外'], day);
    assert.equal(new Set(stories.map(story => story.source)).size, 4, day);
    for (const story of stories) {
      assert.ok(story.fact.replaceAll(' ', '').startsWith(story.year + '年10月' + n + '日'), story.id);
      assert.equal(story.playPath, 'level.html?id=' + story.id);
      keepsakes.add(story.souvenir);
      saves.add(story.saveId);
    }
    const match = januaryMatches[day];
    boardSequences.add(JSON.stringify(match.tableaux));
  }
  assert.equal(keepsakes.size, 124);
  assert.equal(saves.size, 124);
  assert.equal(boardSequences.size, 31);
});

test('十月二十一日六号门两个故事独立出发、回港和收藏', () => {
  const gate = gatesFor(days['1021'])[5];
  assert.ok(gate?.type === 'mode');
  const main = gate.challenge!;
  const old = modeById('1021-rpg')!;
  assert.equal(old.title, '关原雾阵');
  assert.equal(old.souvenir, '关原阵旗拓印');
  assert.equal(old.saveId, '1021-rpg-sekigahara');
  assert.equal(defaultEntry(gate), '1021-rpg-cn-jinchuan-2025');
  assert.deepEqual(gate.additional?.map(m => m.id), [old.id]);
  for (const entry of [old, main]) {
    assert.equal(gateContains(gate, entry.id), true);
    assert.deepEqual(journeyFor(entry.id), {day:'1021', path:'level.html?id='+entry.id});
    assert.deepEqual(collectedMemories([entry.saveId]).map(group => group[0].title), [entry.title]);
  }
  assert.equal(collectedMemories([old.saveId, main.saveId]).length, 2);
  assert.equal(modeById('1021-skirmish')?.saveId, '1021-skirmish-trafalgar');
});
