import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {days} from '../content/registry';
import {levels} from '../content/levels/registry';
import {octoberLevels} from '../content/october';
import {FOLIO, folioBoxes, folioMedal, folioWorld, inWindow, nearStation, onPedestal, ritePulse, touchesLight} from '../src/templates/folio';
import {Kit, LANDMARKS, buildLandmark} from '../src/themes/folio-landmarks';

test('October 2–31 open registered folio chapters; 1001 keeps its existing chapters', () => {
  assert.equal(octoberLevels.length, 30);
  for (let n = 2; n <= 31; n++) {
    const day = '10' + String(n).padStart(2, '0'), chapters = days[day].chapters;
    assert.ok(chapters.length >= 1, day);
    const own = chapters.filter(c => c.template === 'folio');
    assert.equal(own.length, 1, day);
    assert.equal(own[0].status, 'web'); assert.equal(levels[own[0].id]?.template, 'folio'); assert.equal(own[0].steps.length, 4);
  }
  const first = days['1001'].chapters; assert.equal(first.length, 5); assert.ok(first.some(c => c.id === '1001-1949'));
  assert.ok(first.every(c => c.template !== 'folio'));
});

test('every October landmark builds, has a focus, and keeps its finale data', () => {
  const m = new T.MeshBasicMaterial(), mats = {toon: m, glow: m, lamp: m, lit: m, glass: m};
  for (const spec of octoberLevels) {
    assert.ok(LANDMARKS.includes(spec.landmark as any), spec.landmark);
    const root = new T.Group(), kit = new Kit(mats, spec.id), lm = buildLandmark(kit, root, spec.landmark); kit.flush();
    let meshes = 0; root.traverse((o: any) => { if (o.isMesh) meshes++; });
    assert.ok(meshes > 0 && meshes < 12, spec.landmark + ' draws ' + meshes);
    assert.ok(lm.height > 2 && lm.focus.every(Number.isFinite), spec.landmark);
    if (spec.motion === 'kick') assert.ok(lm.kick, spec.landmark);
    if (spec.motion === 'spin') assert.ok(lm.spinners.length, spec.landmark);
    assert.ok(spec.fact.length > 8 && spec.source.length > 4, spec.id);
  }
});

test('the causeway route is walkable: stations, steps and lights', () => {
  const world = folioWorld(), boxes = folioBoxes(), cw = FOLIO.causeway;
  assert.ok(world.fluids?.[0] && world.fluids[0].level > FOLIO.poolFloor);
  for (const [x, z] of FOLIO.stations) {
    assert.ok(z > cw.min[1] && z < cw.max[1]);
    assert.ok(nearStation([x > 0 ? x - 1.5 : x + 1.5, FOLIO.stationTop, z], FOLIO.stations.findIndex(s => s[1] === z)));
  }
  let top = 0; for (const s of FOLIO.steps) { assert.ok(s.top - top <= .32, 'step rise'); top = s.top; }
  assert.ok(FOLIO.pedestal.top - top > .46, 'pedestal needs a climb');
  assert.ok(onPedestal([0, FOLIO.pedestal.top, -28])); assert.ok(!onPedestal([0, .9, -24]));
  const ground = (x: number, z: number) => Math.max(0, ...boxes.filter(b => x >= b.min[0] && x <= b.max[0] && z >= b.min[2] && z <= b.max[2]).map(b => b.max[1]));
  for (const l of FOLIO.lights) assert.ok(touchesLight([l[0], ground(l[0], l[2]), l[2]], l), 'light ' + l.join(','));
});

test('every rite window opens within five seconds and medals are tiered', () => {
  for (let i = 0; i < 3; i++) {
    assert.ok(Array.from({length: 300}, (_, n) => n / 60).some(t => inWindow(t, i)), 'station ' + i);
    assert.ok(Math.min(...Array.from({length: 300}, (_, n) => ritePulse(n / 60, i))) > -.2);
  }
  const spec = octoberLevels[0];
  assert.equal(folioMedal(spec, 60), 3); assert.equal(folioMedal(spec, 100), 2); assert.equal(folioMedal(spec, 200), 1);
});
