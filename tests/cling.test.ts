import test from 'node:test';
import assert from 'node:assert/strict';
import {bakeHeightField} from '../src/slime/height-field';
import {createWorld} from '../src/slime/world';
import {CLING, stepCling, tryAttach, type ClingState} from '../src/slime/cling';
import type {Vec} from '../src/slime/types';
const quad = (a: number[], b: number[], c: number[], d: number[]) => [...a, ...b, ...c, ...a, ...c, ...d];
const block = (x0: number, x1: number, z0: number, z1: number, y1: number) => [
  ...quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]),
  ...quad([x0, 0, z0], [x0, y1, z0], [x1, y1, z0], [x1, 0, z0]), ...quad([x0, 0, z1], [x1, 0, z1], [x1, y1, z1], [x0, y1, z1]),
  ...quad([x0, 0, z0], [x0, 0, z1], [x0, y1, z1], [x0, y1, z0]), ...quad([x1, 0, z0], [x1, y1, z0], [x1, y1, z1], [x1, 0, z1]),
];
const tris = [...quad([-8, 0, -8], [8, 0, -8], [8, 0, 8], [-8, 0, 8]), ...block(1, 3, -1, 1, 1.5), ...block(-3, -2.8, -1, 1, .3)];
const hf = createWorld({boxes: [], surfaces: [], height: bakeHeightField(tris, {x0: -8, z0: -8, size: 16, cell: .1, clearance: .75})});
const boxes = createWorld({boxes: [{min: [1, 0, -1], max: [3, 1.5, 1]}], surfaces: [{min: [-8, -8], max: [8, 8], height: 0}]});
const run = (world: typeof hf, s: ClingState, p: Vec, move: [number, number], secs: number) => {
  let state: ClingState | null = s, pos = p, event = 'none';
  for (let t = 0; t < secs && state; t += 1 / 60) {const r = stepCling(world, state, pos, {move, jump: false, detach: false}, 1 / 60); state = r.state; pos = r.position; if (r.event !== 'none') event = r.event}
  return {state, pos, event};
};
for (const [name, world] of [['height field', hf], ['box colliders', boxes]] as const) {
  test(`${name}: attach to a tall wall, climb, mantle onto the top`, () => {
    const s = tryAttach(world, [.74, 0, 0], [1, 0]);
    assert.ok(s, 'attached');
    assert.ok(s!.normal[0] < -.9, 'normal faces the slime: ' + s!.normal);
    assert.ok(Math.abs(s!.top - 1.5) < .12, 'top ' + s!.top);
    const r = run(world, s!, [.74, 0, 0], [1, 0], 4);
    assert.equal(r.event, 'mantle');
    assert.ok(r.pos[0] > 1.1 && Math.abs(r.pos[1] - 1.5) < .1, 'standing on top: ' + r.pos);
  });
  test(`${name}: strafing keeps the body on the wall; no input slides slowly`, () => {
    const s = tryAttach(world, [.74, .6, 0], [1, 0])!;
    const r = run(world, s, [.74, .6, 0], [0, 1], .5);
    assert.ok(r.state && r.pos[2] > .3 && Math.abs(r.pos[0] - (1 - CLING.radius)) < .12, 'strafed along: ' + r.pos);
    const slide = run(world, s, [.74, .6, 0], [0, 0], .5);
    assert.ok(slide.state && slide.pos[1] < .6 && slide.pos[1] > .45, 'slow slide: ' + slide.pos[1]);
  });
}
test('outer corner: strafing past the edge wraps onto the side face', () => {
  const s = tryAttach(hf, [.74, .6, .7], [1, 0])!;
  const r = run(hf, s, [.74, .6, .7], [0, 1], 1);
  assert.ok(r.state && r.state.normal[2] > .9, 'now on the +z face: ' + r.state?.normal);
});
test('low obstacles are stepped over, not climbed', () => {
  assert.equal(tryAttach(hf, [-2.2, 0, 0], [-1, 0]), null);
});
test('wall jump pushes away and up; sliding to the floor lets go', () => {
  const s = tryAttach(hf, [.74, .3, 0], [1, 0])!;
  const j = stepCling(hf, s, [.74, .3, 0], {move: [0, 0], jump: true, detach: false}, 1 / 60);
  assert.equal(j.event, 'jump'); assert.ok(j.velocity[0] < -3 && j.velocity[1] > 4);
  const down = run(hf, s, [.74, .3, 0], [-1, 0], 1);
  assert.equal(down.event, 'floor'); assert.ok(Math.abs(down.pos[1]) < .02);
});
test('grazing a corner slides round it instead of sticking', () => {
  const p = hf.moveCapsule([0, 0, 1.12], [4, 0, 0], .22, .5).position;
  assert.ok(p[0] > 3.5 && p[2] > 1.15, 'slid past the block edge: ' + p);
});
