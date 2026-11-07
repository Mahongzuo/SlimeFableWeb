import test from 'node:test';
import assert from 'node:assert/strict';
import {bakeHeightField} from '../src/slime/height-field';
import {createWorld} from '../src/slime/world';
const quad = (a: number[], b: number[], c: number[], d: number[]) => [...a, ...b, ...c, ...a, ...c, ...d];
const tris = [
  ...quad([-8, 0, -8], [8, 0, -8], [8, 0, 8], [-8, 0, 8]),            // ground
  ...quad([1, 0, -2], [1, 0, 2], [1, 2, 2], [1, 2, -2]),              // wall at x=1
  ...quad([-3, 2, -1], [-2, 2, -1], [-2, 2, 1], [-3, 2, 1]),          // overhead slab, 2 m clearance
  ...quad([3, .25, 3], [5, .25, 3], [5, .25, 5], [3, .25, 5]),        // a low step
];
const fluids = [{min: [-8, -14] as [number, number], max: [8, -9] as [number, number], level: -1.8, sink: .14}];
const height = bakeHeightField(tris, {x0: -16, z0: -16, size: 32, cell: .2, clearance: .75, fluids});
const world = createWorld({boxes: [], surfaces: [], fluids, height});
test('height field reads ground, wall tops and steps', () => {
  assert.ok(Math.abs(world.support(0, 0)! - 0) < .02);
  assert.ok(Math.abs(world.support(4, 4, .2)! - .25) < .02);
  assert.ok(world.support(1.05, 0, 5)! > 1.9);
});
test('walls block, overhead gaps let the body pass, low steps are climbed', () => {
  const blocked = world.moveCapsule([0, 0, 0], [2, 0, 0], .22, .5).position;
  assert.ok(blocked[0] < 1 - .15, 'stopped before the wall: ' + blocked[0]);
  const under = world.moveCapsule([-4, 0, 0], [3, 0, 0], .22, .5).position;
  assert.ok(under[0] > -1.1, 'passed under the slab: ' + under[0]);
  const step = world.moveCapsule([2.6, 0, 4], [1, 0, 0], .22, .5).position;
  assert.ok(step[0] > 3.5, 'stepped onto the low platform: ' + step[0]);
});
test('open water floats the body at the surface minus its sink depth', () => {
  assert.ok(Math.abs(world.support(0, -12)! - (-1.94)) < 1e-6);
  assert.equal(world.fluid(0, -12), -1.8);
});
test('camera and aim casts stop at walls', () => {
  const hit = world.cast([0, .5, 0], [3, .5, 0], .05);
  assert.ok(hit && hit.point[0] < 1.1 && hit.point[0] > .7);
});
test('particles keep a skin of clearance from walls so the surface does not sink in', () => {
  const p: [number, number, number] = [.97, .1, 0];
  world.projectPoint(p, .022);
  assert.ok(p[0] <= .93 + 1e-6, 'pushed back from the wall: ' + p[0]);
  const inside: [number, number, number] = [1.1, .3, 0];
  world.projectPoint(inside, .022);
  assert.ok(inside[0] < 1 || inside[0] > 1.2, 'left the wall column: ' + inside[0]);
  const open: [number, number, number] = [-.5, .1, 0];
  world.projectPoint(open, .022);
  assert.ok(Math.abs(open[0] + .5) < 1e-9, 'untouched in the open');
});
test('box colliders keep the same skin at their sides and only the radius on top', () => {
  const boxed = createWorld({boxes: [{name: 'crate', min: [0, 0, 0], max: [1, 1, 1]}], surfaces: [{min: [-5, -5], max: [5, 5], height: 0}]});
  const side: [number, number, number] = [-.03, .5, .5]; boxed.projectPoint(side, .022);
  assert.ok(side[0] <= -.09 + 1e-6, 'kept 7 cm + radius off the side: ' + side[0]);
  const top: [number, number, number] = [.5, 1.01, .5]; boxed.projectPoint(top, .022);
  assert.ok(Math.abs(top[1] - 1.022) < 1e-6, 'rests on top at its radius: ' + top[1]);
});
