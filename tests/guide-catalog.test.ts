import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILTIN_GUIDE_SECTIONS, getGuideSections, registerGuideSection} from '../src/ui/guide-catalog';

test('Guide catalog covers all core gameplay modules and supports dynamic runtime extension', () => {
  const base = getGuideSections();
  assert.ok(base.length >= 6);
  const ids = new Set(base.map(s => s.id));
  for (const required of ['movement', 'combat', 'farming', 'building', 'ecology', 'portals']) {
    assert.ok(ids.has(required), `missing guide section ${required}`);
  }
  for (const s of BUILTIN_GUIDE_SECTIONS) {
    assert.ok(s.cards.length >= 2, `section ${s.id} should explain multiple mechanics`);
  }

  // Dynamic extension: a future ARPG dungeon module registers itself without touching GameUI
  registerGuideSection({
    id: 'test-future-dungeon',
    order: 25,
    icon: '🏰',
    title: '未来 ARPG 秘境副本',
    badge: '扩展测试',
    subtitle: '动态注册的新玩法说明。',
    cards: [{icon: '🐉', title: '元素 Boss 机制', summary: '利用 11 种元素反应击破护盾。'}],
  });
  const extended = getGuideSections();
  assert.equal(extended.length, base.length + 1);
  const idxCombat = extended.findIndex(s => s.id === 'combat');
  const idxDungeon = extended.findIndex(s => s.id === 'test-future-dungeon');
  const idxFarming = extended.findIndex(s => s.id === 'farming');
  assert.ok(idxCombat < idxDungeon && idxDungeon < idxFarming, 'sections must remain sorted by order');
});
