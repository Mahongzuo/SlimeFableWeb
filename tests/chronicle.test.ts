import test from 'node:test';
import assert from 'node:assert/strict';
import {chronicleLevels} from '../content/chronicle';
import {days} from '../content/registry';
import {levels} from '../content/levels/registry';
import {modesFor} from '../content/daily-modes';
import {defaultEntry, gateContains, gatesFor, journeyFor} from '../src/game/mode-gates';
import {
  chronicleMedal,
  createChronicleState,
  generateChronicle,
  stepChronicle,
  validateChronicle,
} from '../src/templates/chronicle';
import type {ShotView} from '../src/slime/types';

test('已焕新月份全部日期严格达成 1 号门中国 / 2 号门海外，岁月拾光零重复', () => {
  assert.ok(chronicleLevels.length >= 91);
  const allIds = new Set<string>();
  const allSouvenirs = new Set<string>();
  const refreshedMonths = new Set(chronicleLevels.map(c => Number(c.id.slice(0, 2))));
  const monthLens: Record<number, number> = {1: 31, 2: 29, 3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31};
  for (const m of refreshedMonths) {
    for (let d = 1; d <= monthLens[m]; d++) {
      const day = String(m).padStart(2, '0') + String(d).padStart(2, '0');
      const entry = days[day];
      assert.ok(entry, day);
      const webChapters = entry.chapters.filter(c => c.status === 'web');
      assert.ok(webChapters.length >= 2, `${day} must have >=2 web chapters`);
      const gates = gatesFor(entry);
      assert.ok(gates[0]?.type === 'story' && gates[1]?.type === 'story', `${day} missing story gates`);
    }
  }
  for (const spec of chronicleLevels) {
    const day = spec.id.slice(0, 4);
    assert.ok(!allIds.has(spec.id), `duplicate id ${spec.id}`);
    allIds.add(spec.id);
    assert.ok(!allSouvenirs.has(spec.souvenir), `duplicate souvenir ${spec.souvenir}`);
    allSouvenirs.add(spec.souvenir);
    assert.ok(/^https:\/\//.test(spec.source), spec.id);
    assert.equal(levels[spec.id], spec);
    assert.equal(spec.slot, spec.region === 'cn' ? 1 : 2, spec.id);
    const entry = days[day];
    assert.ok(entry, day);
    const webChapters = entry.chapters.filter(c => c.status === 'web');
    assert.ok(webChapters.length >= 2, day);
    const gates = gatesFor(entry);
    const targetGate = gates[spec.slot - 1];
    assert.ok(targetGate?.type === 'story', spec.id);
    assert.equal(gateContains(targetGate, spec.id), true, spec.id);
    if (spec.slot === 1) assert.equal(defaultEntry(gates[0]), spec.id, spec.id);
    assert.deepEqual(journeyFor(spec.id), {day, path: 'level.html?id=' + spec.id});

    // Zero duplicate fact or souvenir against the day's 3-6 fixed modes
    const modeFacts = new Set(modesFor(day).map(m => m.fact));
    const modeSouvenirs = new Set(modesFor(day).map(m => m.souvenir));
    assert.ok(!modeFacts.has(spec.fact), `${spec.id} duplicates mode fact`);
    assert.ok(!modeSouvenirs.has(spec.souvenir), `${spec.id} duplicates mode souvenir`);
  }
});

test('所有岁月拾光关卡在 40 个随机种子下均通过布局校验与完整玩法通关仿真', () => {
  for (const spec of chronicleLevels) {
    for (let s = 0; s < 40; s++) {
      const layout = generateChronicle(spec, `${spec.id}-seed-${s}`);
      const check = validateChronicle(spec, layout);
      assert.equal(check.ok, true, `${spec.id} seed ${s}: ${check.errors.join('; ')}`);

      // Simulate complete playthrough for all 4 modes
      const state = createChronicleState(layout);
      if (spec.mode === 'relay') {
        // Shoot clone onto far-bank pad to open bridge
        const activeShot: ShotView = {id: 1, phase: 'active', center: [...layout.pads[0]], count: 16, element: spec.element};
        const rBridge = stepChronicle(spec, layout, state, {position: [0, 0, 5], element: spec.element, spread: 0, shots: [activeShot]}, false);
        assert.equal(state.bridgeOpen, true, `${spec.id} bridge did not open`);
        assert.equal(rBridge.bridgeChanged, true);

        // Wrong element is rejected cleanly
        const wrongEl = (layout.devices[0].element + 2) % 6;
        const rWrong = stepChronicle(spec, layout, state, {position: [...layout.devices[0].pos], element: wrongEl, spread: 0, shots: [activeShot]}, true);
        assert.equal(rWrong.wrongElement, layout.devices[0].element);
        assert.equal(state.devicesDone[0], false);

        // Activate both devices with matching elements
        for (const dev of layout.devices) {
          const rDev = stepChronicle(spec, layout, state, {position: [...dev.pos], element: dev.element, spread: 0, shots: []}, true);
          assert.equal(rDev.activatedDevice, dev.id);
        }
        assert.equal(state.readyForFinale, true);
      }

      // Collect all relics
      for (const p of layout.pickups) {
        stepChronicle(spec, layout, state, {position: [p.pos[0], p.pos[1] - 0.3, p.pos[2]], element: spec.element, spread: 0, shots: []}, false);
      }
      assert.equal(state.collected.every(Boolean), true, `${spec.id} relics not all collected`);
      assert.equal(state.notesUnlocked, 3, `${spec.id} notesUnlocked`);
      assert.equal(state.readyForFinale, true, `${spec.id} readyForFinale`);

      // Trigger finale at finish plinth
      const rEnd = stepChronicle(spec, layout, state, {position: [...layout.finish.pos], element: spec.element, spread: 0, shots: []}, true);
      assert.equal(rEnd.finaleTriggered, true, `${spec.id} finale`);
      assert.equal(chronicleMedal(spec, spec.medals.gold - 1), 3);
      assert.equal(chronicleMedal(spec, spec.medals.silver - 1), 2);
      assert.equal(chronicleMedal(spec, spec.medals.silver + 30), 1);
    }
  }
});
