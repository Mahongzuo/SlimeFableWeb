import type {Box, Vec} from '../slime/types';
import type {SolsticeMode, SolsticeSpec} from '../../content/levels/types';
import {rng} from './random';

export interface PlatformDef {
  id: string;
  x: number;
  y: number; // top surface height
  z: number;
  w: number;
  d: number;
  thickness: number;
  kind: 'plaza' | 'bridge' | 'island' | 'stage' | 'step' | 'ring-deck';
  accent?: boolean;
}

export interface NodeDef {
  index: number;
  label: string;
  element: number; // 0..5
  pos: Vec;
  radius: number;
  kind: 'element' | 'ring' | 'split';
}

export interface JumpPadDef {
  pos: Vec;
  target: Vec;
  boostY: number;
}

export interface SplitPairDef {
  a: Vec;
  b: Vec;
  bridgeBox: Box;
  bridgePos: Vec;
  bridgeSize: [number, number, number];
}

export interface StarDef {
  id: number;
  pos: Vec;
}

export interface SolsticeLayout {
  seed: string;
  mode: SolsticeMode;
  spawn: Vec;
  spawnYaw: number;
  monumentPos: Vec;
  altarPos: Vec;
  platforms: PlatformDef[];
  boxes: Box[];
  nodes: NodeDef[];
  pads: JumpPadDef[];
  split: SplitPairDef | null;
  stars: StarDef[];
  bounds: {min: Vec; max: Vec};
}

const toBox = (p: PlatformDef): Box => ({
  name: p.id,
  min: [p.x - p.w / 2, p.y - p.thickness, p.z - p.d / 2],
  max: [p.x + p.w / 2, p.y, p.z + p.d / 2],
});

function addStairRun(
  platforms: PlatformDef[],
  idPrefix: string,
  from: Vec,
  to: Vec,
  steps: number,
  width: number,
) {
  for (let i = 1; i <= steps; i++) {
    const t = i / (steps + 1);
    const x = from[0] + (to[0] - from[0]) * t;
    const y = from[1] + (to[1] - from[1]) * t;
    const z = from[2] + (to[2] - from[2]) * t;
    const dx = (to[0] - from[0]) / (steps + 1);
    const dz = (to[2] - from[2]) / (steps + 1);
    const w = Math.max(width + 0.7, Math.abs(dx) * 1.65);
    const d = Math.max(width + 0.7, Math.abs(dz) * 1.65);
    platforms.push({
      id: `${idPrefix}-${i}`,
      x,
      y,
      z,
      w,
      d,
      thickness: Math.max(0.7, y + 1.2),
      kind: 'step',
    });
  }
}

export function generateSolstice(spec: SolsticeSpec): SolsticeLayout {
  const random = rng(spec.id + ':' + spec.mode);
  const platforms: PlatformDef[] = [];
  const pads: JumpPadDef[] = [];
  const nodes: NodeDef[] = [];
  const stars: StarDef[] = [];
  let split: SplitPairDef | null = null;

  const spawn: Vec = [0, 0.4, 16.2];
  const spawnYaw = 0;

  // Start terrace (postcard view directly facing the monument at origin)
  platforms.push({
    id: 'start-plaza',
    x: 0,
    y: 0.4,
    z: 16.0,
    w: 9.0,
    d: 7.0,
    thickness: 2.4,
    kind: 'plaza',
  });

  // Central Monument Stage
  const stageY = spec.mode === 'ascend' ? 4.2 : 1.0;
  const monumentPos: Vec = [0, stageY, -2.5];
  const altarPos: Vec = [0, stageY, 2.2];
  platforms.push({
    id: 'monument-stage',
    x: 0,
    y: stageY,
    z: -1.5,
    w: 11.4,
    d: 11.4,
    thickness: stageY + 2.4,
    kind: 'stage',
    accent: true,
  });

  // Main grand approach bridge from start to center (lowered in ascend mode to base ring)
  if (spec.mode !== 'ascend') {
    platforms.push({
      id: 'grand-bridge',
      x: 0,
      y: 0.65,
      z: 8.4,
      w: 5.4,
      d: 9.2,
      thickness: 1.4,
      kind: 'bridge',
    });
  } else {
    platforms.push({
      id: 'base-bridge',
      x: 0,
      y: 0.5,
      z: 9.8,
      w: 5.6,
      d: 6.8,
      thickness: 1.4,
      kind: 'bridge',
    });
    platforms.push({
      id: 'base-court',
      x: 0,
      y: 0.6,
      z: 5.2,
      w: 7.2,
      d: 4.2,
      thickness: 1.8,
      kind: 'plaza',
    });
  }

  const jitter = (s: number) => random.range(-s, s);

  if (spec.mode === 'resonance') {
    const spots: [number, number, number][] = [
      [-13.5, 1.35, 3.5 + jitter(1.1)],
      [0 + jitter(1.2), 2.35, -14.8],
      [13.5, 1.75, 3.0 + jitter(1.1)],
    ];
    spots.forEach(([x, y, z], i) => {
      platforms.push({
        id: `island-${i}`,
        x,
        y,
        z,
        w: 7.4,
        d: 7.4,
        thickness: y + 2.4,
        kind: 'island',
        accent: true,
      });
      nodes.push({
        index: i,
        label: spec.stops[i],
        element: spec.elements[i],
        pos: [x, y, z],
        radius: 2.3,
        kind: 'element',
      });
    });
    addStairRun(platforms, 'st-w', [-5.2, 1.0, 1.0], [-10.0, 1.35, 2.8], 3, 3.2);
    addStairRun(platforms, 'st-n', [0, 1.0, -7.2], [spots[1][0], 2.35, -11.2], 4, 3.4);
    addStairRun(platforms, 'st-e', [5.2, 1.0, 0.8], [10.0, 1.75, 2.4], 3, 3.2);
    // Express jump pads back & across
    pads.push(
      {pos: [-11.0, 1.35, 5.4], target: [0, 1.0, 2.2], boostY: 9.2},
      {pos: [11.0, 1.75, 5.2], target: [0, 1.0, 2.2], boostY: 9.5},
      {pos: [0, 1.0, -6.2], target: [spots[1][0], 2.35, -13.2], boostY: 10.4},
    );
    const starSpots: Vec[] = [
      [0, 1.4, 9.2],
      [-7.8, 1.9, 1.8],
      [-15.6, 2.2, spots[0][2] - 2.0],
      [-7.4, 2.6, -7.8],
      [spots[1][0], 3.3, -17.3],
      [7.4, 2.6, -7.6],
      [15.6, 2.6, spots[2][2] - 2.0],
      [7.8, 2.2, 1.6],
    ];
    starSpots.forEach((pos, id) => stars.push({id, pos}));
  } else if (spec.mode === 'split-bridge') {
    // West island (node 0), North gated sanctuary (node 1 unlocked by split pads), East elevated island (node 2)
    const p0: Vec = [-13.0, 1.2, 5.0 + jitter(0.8)];
    const p1: Vec = [0, 2.2, -16.2];
    const p2: Vec = [13.0, 1.6, 4.6 + jitter(0.8)];
    [p0, p1, p2].forEach((p, i) => {
      platforms.push({
        id: `split-island-${i}`,
        x: p[0],
        y: p[1],
        z: p[2],
        w: 7.6,
        d: 7.6,
        thickness: p[1] + 2.4,
        kind: 'island',
        accent: true,
      });
      nodes.push({
        index: i,
        label: spec.stops[i],
        element: spec.elements[i],
        pos: p,
        radius: 2.35,
        kind: i === 1 ? 'split' : 'element',
      });
    });
    addStairRun(platforms, 'sb-w', [-5.2, 1.0, 2.4], [p0[0] + 3.4, p0[1], p0[2] - 0.6], 3, 3.2);
    addStairRun(platforms, 'sb-e', [5.2, 1.0, 2.2], [p2[0] - 3.4, p2[1], p2[2] - 0.6], 3, 3.2);

    // Split pressure pads on the northern edge of the central stage; holding both materializes the rainbow light bridge!
    const padA: Vec = [-2.6, 1.0, -5.8];
    const padB: Vec = [2.6, 1.0, -5.8];
    const bridgePos: Vec = [0, 1.55, -9.8];
    const bridgeSize: [number, number, number] = [4.4, 0.55, 6.4];
    split = {
      a: padA,
      b: padB,
      bridgePos,
      bridgeSize,
      bridgeBox: {
        name: 'split-rainbow-bridge',
        min: [bridgePos[0] - bridgeSize[0] / 2, bridgePos[1] - bridgeSize[1], bridgePos[2] - bridgeSize[2] / 2],
        max: [bridgePos[0] + bridgeSize[0] / 2, bridgePos[1], bridgePos[2] + bridgeSize[2] / 2],
      },
    };
    // Also a step up from bridge to north island
    platforms.push({
      id: 'north-lip',
      x: 0,
      y: 1.9,
      z: -12.6,
      w: 4.8,
      d: 2.4,
      thickness: 2.6,
      kind: 'step',
    });
    pads.push(
      {pos: [p0[0] + 2.4, p0[1], p0[2] + 1.8], target: [0, 1.0, 2.2], boostY: 9.2},
      {pos: [p2[0] - 2.4, p2[1], p2[2] + 1.8], target: [0, 1.0, 2.2], boostY: 9.5},
      {pos: [0, p1[1], p1[2] + 2.8], target: [0, 1.0, -2.0], boostY: 9.5},
    );
    const starSpots: Vec[] = [
      [0, 1.4, 9.6],
      [-8.5, 1.9, 3.8],
      [p0[0] - 2.2, p0[1] + 0.9, p0[2] - 1.5],
      [-2.6, 1.9, -5.8],
      [2.6, 1.9, -5.8],
      [0, 2.6, -10.2],
      [0, p1[1] + 1.0, p1[2] - 2.4],
      [p2[0] + 2.0, p2[1] + 0.9, p2[2] - 1.5],
    ];
    starSpots.forEach((pos, id) => stars.push({id, pos}));
  } else if (spec.mode === 'glide-dash') {
    // Sweeping elevated ice/light track ringing the central monument with 3 luminous speed gates
    const trackY = 1.0;
    const loopPoints: [number, number][] = [
      [-11.5, 8.5],
      [-14.8, -1.5],
      [-10.2, -12.5],
      [0.0, -15.6],
      [10.2, -12.5],
      [14.8, -1.5],
      [11.5, 8.5],
    ];
    loopPoints.forEach(([x, z], i) => {
      platforms.push({
        id: `track-node-${i}`,
        x,
        y: trackY,
        z,
        w: 6.4,
        d: 6.4,
        thickness: 2.2,
        kind: 'ring-deck',
        accent: i === 1 || i === 3 || i === 5,
      });
    });
    // Connect track segments cleanly
    const pairs: [Vec, Vec][] = [
      [[0, 0.65, 9.5], [-11.5, trackY, 8.5]],
      [[-11.5, trackY, 8.5], [-14.8, trackY, -1.5]],
      [[-14.8, trackY, -1.5], [-10.2, trackY, -12.5]],
      [[-10.2, trackY, -12.5], [0, trackY, -15.6]],
      [[0, trackY, -15.6], [10.2, trackY, -12.5]],
      [[10.2, trackY, -12.5], [14.8, trackY, -1.5]],
      [[14.8, trackY, -1.5], [11.5, trackY, 8.5]],
      [[11.5, trackY, 8.5], [0, 0.65, 9.5]],
    ];
    pairs.forEach(([a, b], i) => addStairRun(platforms, `trk-${i}`, a, b, 3, 4.4));

    const ringIndices = [1, 3, 5];
    ringIndices.forEach((idx, i) => {
      const [x, z] = loopPoints[idx];
      nodes.push({
        index: i,
        label: spec.stops[i],
        element: spec.elements[i],
        pos: [x, trackY, z],
        radius: 3.1,
        kind: 'ring',
      });
    });
    // Speed-boost jump pads launching onto the central monument stage
    pads.push(
      {pos: [-11.5, trackY, 8.5], target: [-14.8, trackY, -1.5], boostY: 6.8},
      {pos: [11.5, trackY, 8.5], target: [0, 1.0, 2.2], boostY: 9.0},
      {pos: [0, trackY, -12.8], target: [0, 1.0, -4.5], boostY: 9.5},
    );
    const starSpots: Vec[] = [
      [-6.2, 1.8, 9.0],
      [-14.8, 1.9, 3.2],
      [-13.0, 1.9, -7.2],
      [-5.2, 1.9, -14.5],
      [5.2, 1.9, -14.5],
      [13.0, 1.9, -7.2],
      [14.8, 1.9, 3.2],
      [6.2, 1.8, 9.0],
    ];
    starSpots.forEach((pos, id) => stars.push({id, pos}));
  } else {
    // 'ascend': Spiral tiered floating terraces climbing around the towering central monument (y = 1.4 -> 2.7 -> 4.0 -> stage 4.2)
    const tiers: [number, number, number][] = [
      [-11.8, 1.4, 5.2],
      [-10.2, 2.7, -9.8],
      [10.8, 3.8, -8.8],
    ];
    tiers.forEach(([x, y, z], i) => {
      platforms.push({
        id: `tier-${i}`,
        x,
        y,
        z,
        w: 7.4,
        d: 7.4,
        thickness: y + 2.4,
        kind: 'island',
        accent: true,
      });
      nodes.push({
        index: i,
        label: spec.stops[i],
        element: spec.elements[i],
        pos: [x, y, z],
        radius: 2.35,
        kind: 'element',
      });
    });
    // Spiral connecting staircases + wind pads
    addStairRun(platforms, 'asc-0', [-2.8, 0.6, 5.2], [-8.6, 1.4, 5.2], 3, 3.2);
    addStairRun(platforms, 'asc-1', [-11.8, 1.4, 1.5], [-10.6, 2.7, -6.2], 5, 3.2);
    addStairRun(platforms, 'asc-2', [-6.6, 2.7, -10.8], [7.2, 3.8, -9.8], 6, 3.4);
    addStairRun(platforms, 'asc-3', [9.0, 3.8, -5.4], [4.6, 4.2, -1.6], 3, 3.4);
    // Secondary return walkway from stage down to south plaza
    platforms.push({
      id: 'east-balcony',
      x: 10.6,
      y: 2.6,
      z: 4.8,
      w: 5.8,
      d: 5.8,
      thickness: 4.4,
      kind: 'island',
    });
    addStairRun(platforms, 'asc-down', [10.6, 2.6, 1.8], [10.8, 3.8, -5.2], 4, 3.0);
    addStairRun(platforms, 'asc-back', [2.8, 0.6, 5.2], [8.0, 2.6, 4.8], 4, 3.0);

    pads.push(
      {pos: [-11.8, 1.4, 2.4], target: [-10.2, 2.7, -8.0], boostY: 10.8},
      {pos: [-7.2, 2.7, -9.8], target: [8.8, 3.8, -8.8], boostY: 11.4},
      {pos: [8.8, 3.8, -6.2], target: [0, 4.2, 1.5], boostY: 9.8},
      {pos: [0, 0.6, 5.2], target: [0, 4.2, 2.2], boostY: 12.6},
    );
    const starSpots: Vec[] = [
      [-6.0, 1.8, 5.2],
      [-13.8, 2.4, 5.2],
      [-11.2, 3.1, -2.4],
      [-12.2, 3.7, -11.5],
      [0.0, 4.1, -10.4],
      [12.8, 4.8, -10.5],
      [10.6, 3.6, 4.8],
      [0.0, 5.2, -6.4],
    ];
    starSpots.forEach((pos, id) => stars.push({id, pos}));
  }

  const boxes = platforms.map(toBox);
  return {
    seed: spec.id,
    mode: spec.mode,
    spawn,
    spawnYaw,
    monumentPos,
    altarPos,
    platforms,
    boxes,
    nodes,
    pads,
    split,
    stars,
    bounds: {min: [-24, -10, -24], max: [24, 28, 24]},
  };
}

export function validateSolstice(layout: SolsticeLayout): {ok: boolean; errors: string[]} {
  const errors: string[] = [];
  if (layout.nodes.length !== 3) errors.push(`节点数量应为 3，实际 ${layout.nodes.length}`);
  if (layout.stars.length !== 8) errors.push(`星尘数量应为 8，实际 ${layout.stars.length}`);
  if (layout.platforms.length < 5) errors.push('平台数量不足');
  if (layout.mode === 'split-bridge' && !layout.split) errors.push('分身模式缺少双联踏板');
  const inside = (p: Vec) =>
    p[0] >= layout.bounds.min[0] &&
    p[0] <= layout.bounds.max[0] &&
    p[1] >= layout.bounds.min[1] &&
    p[1] <= layout.bounds.max[1] &&
    p[2] >= layout.bounds.min[2] &&
    p[2] <= layout.bounds.max[2];
  if (!inside(layout.spawn)) errors.push('出生点越界');
  if (!inside(layout.altarPos)) errors.push('祭坛点越界');
  for (const n of layout.nodes) {
    if (!inside(n.pos)) errors.push(`节点 ${n.label} 越界`);
    if (n.element < 0 || n.element > 5) errors.push(`节点 ${n.label} 元素编号无效`);
  }
  for (const s of layout.stars) if (!inside(s.pos)) errors.push(`星尘 ${s.id} 越界`);
  return {ok: errors.length === 0, errors};
}

export function medalFor(spec: SolsticeSpec, elapsedSeconds: number): '金牌' | '银牌' | '铜牌' {
  if (elapsedSeconds <= spec.medals.gold) return '金牌';
  if (elapsedSeconds <= spec.medals.silver) return '银牌';
  return '铜牌';
}

export function modeHint(mode: SolsticeMode): string {
  switch (mode) {
    case 'resonance':
      return '切换对应元素属性（1–6 键），依次点亮三座共鸣祭坛。';
    case 'split-bridge':
      return '按住 G 瞄准并左键发射分身（或靠近踏板按 F 留影），同时压住两块踏板召出彩虹光桥。';
    case 'glide-dash':
      return '按住 C 摊开高速滑行，依次穿越三道流光星环门并冲向中央圣台。';
    case 'ascend':
      return '借风流跳垫与螺旋星阶逐层攀升，点亮三座高空信标并登顶中央地标。';
  }
}
