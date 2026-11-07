import test from 'node:test';
import assert from 'node:assert/strict';
import {QuestRunner} from '../src/game/quest';
import {levels} from '../content/levels/registry';
test('main branches advance in order; out-of-order targets are refused', () => {
  const q = new QuestRunner(levels['0815-1920']), events: string[] = [];
  q.onChange = (_, e) => events.push(e);
  assert.equal(q.hit('editor'), false, 'cannot print before the drafts');
  assert.equal(q.hit('draft1'), true); assert.equal(q.hit('draft1'), false, 'counted once');
  assert.equal(q.view().count, 1);
  q.hit('draft2'); q.hit('draft3');
  assert.equal(q.view().branch, '把稿子交给陈编开印');
  assert.ok(q.wants('editor')); assert.ok(!q.wants('worker1'));
  q.hit('editor'); q.hit('worker1'); q.hit('worker2'); q.hit('worker3');
  assert.ok(q.complete); assert.deepEqual(events, ['progress', 'progress', 'branch', 'branch', 'progress', 'progress', 'complete']);
});
test('side quest counts at any time and never blocks completion', () => {
  const q = new QuestRunner(levels['0815-1920']); let side = 0;
  q.onChange = (_, e) => { if (e === 'side') side++; };
  assert.ok(q.wants('copy')); assert.equal(q.hit('copy'), true); assert.equal(side, 1); assert.ok(q.sideComplete);
  for (const t of ['draft1', 'draft2', 'draft3', 'editor', 'worker1', 'worker2', 'worker3']) q.hit(t);
  assert.ok(q.complete);
});
