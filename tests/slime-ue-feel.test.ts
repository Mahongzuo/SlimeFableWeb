import test from 'node:test';
import assert from 'node:assert/strict';
import {cannonPositionAt, idlePose, solveCannonLaunch, type FrameInput, type Vec} from '../src/slime/types';
import {UMBRELLA, UmbrellaLogic} from '../src/slime/umbrella';
import {SlimeSolver} from '../src/slime/solver';
import {SurfaceBuilder} from '../src/slime/surface';
import {flatWorld} from '../src/slime/world';

const makeInput = (overrides: Partial<FrameInput> = {}): FrameInput => ({
  anchor: [0, 0, 0],
  velocity: [0, 0, 0],
  forward: [0, 0, -1],
  spread: 0,
  grounded: true,
  recalling: false,
  impact: 0,
  pose: idlePose(),
  dt: 1 / 60,
  quality: 'high',
  commands: [],
  generation: 0,
  shapeBlend: 1,
  ...overrides,
});

test('UE analytic cannon solver hits 10m, 25m and 40m targets with high precision', () => {
  const start: Vec = [0, 0.35, 0];
  const targets: Vec[] = [
    [0, 0.35, -10],
    [12, 3.5, -22],
    [-18, 6.0, -35],
    [0, 12.0, -36],
  ];
  for (const target of targets) {
    const solved = solveCannonLaunch(start, target, 28, 36, 9.8);
    assert.ok(solved, `expected reachable solution for ${target}`);
    const end = cannonPositionAt(start, solved.velocity, 9.8, solved.flightTime);
    const err = Math.hypot(end[0] - target[0], end[1] - target[1], end[2] - target[2]);
    assert.ok(err < 0.01, `landing error ${err} too large`);
    assert.ok(solved.flightTime < 2.2, `low-arc flight time ${solved.flightTime} should be snappy`);
  }
});

test('UE umbrella deploys only after double-jump in mid-air and smoothly brakes fall speed to 1.8 m/s', () => {
  const u = new UmbrellaLogic();
  // Cannot deploy on ground or after only 1 jump
  assert.equal(u.toggle(true, false, false, 0, 2), false);
  assert.equal(u.toggle(false, false, false, 1, 2), false);
  // Deploys after 2nd jump in mid-air
  assert.equal(u.toggle(false, false, false, 2, 2), true);
  assert.equal(u.open, true);

  // Upward velocity is never reduced
  u.step(0.05, 1.0, 3.0, false, false, false);
  assert.equal(u.limitFallVelocity(3.0, 1.0), 3.0);

  // Falling arms smooth brake over 0.28s down to -1.8 m/s
  u.step(0.016, 1.2, -7.5, false, false, false);
  const mid = u.limitFallVelocity(-7.5, 1.2 + UMBRELLA.brakeSeconds * 0.5);
  assert.ok(mid < -UMBRELLA.fallSpeed && mid > -7.5, `mid brake ${mid} should interpolate`);
  const steady = u.limitFallVelocity(-7.5, 1.2 + UMBRELLA.brakeSeconds + 0.05);
  assert.ok(Math.abs(steady - (-UMBRELLA.fallSpeed)) < 0.02, `steady fall ${steady} should clamp to -1.8`);

  // Landing cancels umbrella
  u.step(0.016, 1.6, 0, true, false, false);
  assert.equal(u.open, false);
});

test('UE Dome (bell flare) produces a wider, lower bell silhouette than Ball without mesh overflow', () => {
  const measure = (shapeBlend: number) => {
    const s = new SlimeSolver([0, 0, 0], flatWorld);
    const b = new SurfaceBuilder();
    const inp = makeInput({shapeBlend});
    for (let i = 0; i < 90; i++) s.step(1 / 60, inp);
    const frame = b.build(s, 'high');
    assert.equal(frame.overflow, false);
    assert.ok(frame.count > 900);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < frame.count * 3; i += 3) {
      minX = Math.min(minX, frame.positions[i]);
      maxX = Math.max(maxX, frame.positions[i]);
      minY = Math.min(minY, frame.positions[i + 1]);
      maxY = Math.max(maxY, frame.positions[i + 1]);
    }
    return {width: maxX - minX, height: maxY - minY};
  };
  const dome = measure(1);
  const ball = measure(0);
  assert.ok(dome.width > ball.width * 1.15, `expected dome width ${dome.width} > ball ${ball.width}`);
  assert.ok(dome.height < ball.height * 0.92, `expected dome height ${dome.height} < ball ${ball.height}`);
});
