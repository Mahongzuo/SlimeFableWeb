import type {ChronicleMode, ChronicleSpec} from '../../content/levels/types';
import type {Box, ShotView, Vec} from '../slime/types';
import type {WorldDefinition} from '../slime/world';
import {rng} from './random';

export type SurfaceRole = 'main' | 'walkway' | 'plaza' | 'basin' | 'terrace';
export interface ChronicleSurface {
  min: [number, number];
  max: [number, number];
  height: number;
  role: SurfaceRole;
}
export type ChronicleBoxKind =
  | 'step' | 'hurdle' | 'lowbar' | 'bridge' | 'plinth' | 'tower' | 'pillar' | 'terrace' | 'wall';
export interface ChronicleBox extends Box {
  kind: ChronicleBoxKind;
  walkable: boolean;
}
export interface ChroniclePickup {
  id: number;
  pos: Vec;
  noteIdx: number;
}
export interface ChronicleDevice {
  id: number;
  pos: Vec;
  element: number;
  label: string;
}
export interface ChronicleWindRing {
  id: number;
  pos: Vec;
  radius: number;
  lift: number;
}
export interface ChronicleLayout {
  seed: string;
  mode: ChronicleMode;
  spawn: Vec;
  spawnYaw: number;
  surfaces: ChronicleSurface[];
  boxes: ChronicleBox[];
  fluids: {min: [number, number]; max: [number, number]; level: number; sink: number}[];
  pickups: ChroniclePickup[];
  pads: Vec[];
  devices: ChronicleDevice[];
  windRings: ChronicleWindRing[];
  bridgeIndex: number;
  finish: {pos: Vec; radius: number};
  landmarkPos: Vec;
  route: Vec[];
  bounds: {min: Vec; max: Vec};
  world: WorldDefinition;
}

export const CHRONICLE_MODE_NAMES: Record<ChronicleMode, string> = {
  parkour: '轻跑酷 · 追光冲线',
  gather: '庭院搜集 · 史物寻踪',
  relay: '分身连线 · 机关共鸣',
  glide: '乘风巡礼 · 滑翔俯瞰',
};
export const ELEMENT_LABELS = ['水', '风', '火', '雷', '暗', '物'] as const;

export function generateChronicle(spec: ChronicleSpec, seedOverride?: string): ChronicleLayout {
  const seed = seedOverride ?? spec.id;
  const r = rng(seed);
  const surfaces: ChronicleSurface[] = [];
  const boxes: ChronicleBox[] = [];
  const fluids: ChronicleLayout['fluids'] = [];
  const pickups: ChroniclePickup[] = [];
  const pads: Vec[] = [];
  const devices: ChronicleDevice[] = [];
  const windRings: ChronicleWindRing[] = [];
  const route: Vec[] = [];
  let bridgeIndex = -1;
  let spawn: Vec = [0, 0.05, 16];
  let finish: {pos: Vec; radius: number} = {pos: [0, 0.36, -16], radius: 2.2};
  let landmarkPos: Vec = [0, 0.36, -22];
  let bounds: {min: Vec; max: Vec} = {min: [-20, -4, -36], max: [20, 26, 26]};

  const addSurf = (x0: number, z0: number, x1: number, z1: number, height: number, role: SurfaceRole) => {
    surfaces.push({min: [x0, z0], max: [x1, z1], height, role});
  };
  const addBox = (name: string, min: Vec, max: Vec, kind: ChronicleBoxKind, walkable = false) => {
    boxes.push({name, min, max, kind, walkable});
  };

  if (spec.mode === 'parkour') {
    // Straight scenic promenade from z = +24 to z = -34 (~58m), strictly partitioned non-overlapping surfaces.
    spawn = [0, 0.05, 22];
    route.push([0, 0, 22]);
    // Start plaza: z [14, 26]
    addSurf(-7, 14, 7, 26, 0, 'plaza');
    // Main promenade: z [-22, 14], walkway centered x [-3.4, 3.4], side verges partitioned cleanly
    addSurf(-3.4, -22, 3.4, 14, 0, 'walkway');
    addSurf(-8.5, -22, -3.4, 14, 0.08, 'main');
    addSurf(3.4, -22, 8.5, 14, 0.08, 'main');
    // Finish plaza: z [-38, -22]
    addSurf(-8.5, -38, 8.5, -22, 0, 'plaza');

    // Stepped ascent to finish plinth (each step <= 0.18m so zero-friction smooth run-up)
    addBox('finish-step-1', [-3.6, 0, -24.2], [3.6, 0.18, -22.6], 'step', true);
    addBox('finish-plinth', [-4.4, 0, -30.2], [4.4, 0.36, -24.2], 'plinth', true);
    finish = {pos: [0, 0.36, -26.8], radius: 2.3};
    landmarkPos = [0, 0.36, -33.2];

    // 3 light parkour obstacles spaced cleanly: hurdle 1, lowbar (C-spread or hop around), hurdle 2
    const zObs = [8, -2, -12];
    const laneShift = r.pick([-0.8, 0, 0.8]);
    // Hurdle 1 (height 0.46m -> easy single jump)
    addBox('hurdle-1', [-2.6, 0, zObs[0] - 0.25], [2.6, 0.46, zObs[0] + 0.25], 'hurdle', true);
    // Low gate arch (bottom at y = 0.48m, side pillars at x = ±2.8) -> C spread glides cleanly under!
    addBox('lowbar-l', [-3.1, 0, zObs[1] - 0.28], [-2.5, 1.9, zObs[1] + 0.28], 'pillar', false);
    addBox('lowbar-r', [2.5, 0, zObs[1] - 0.28], [3.1, 1.9, zObs[1] + 0.28], 'pillar', false);
    addBox('lowbar-beam', [-2.5, 0.56, zObs[1] - 0.22], [2.5, 1.35, zObs[1] + 0.22], 'lowbar', false);
    // Hurdle 2 (height 0.52m)
    addBox('hurdle-2', [-2.6, 0, zObs[2] - 0.25], [2.6, 0.52, zObs[2] + 0.25], 'hurdle', true);

    // 8 relics distributed along the promenade in gentle S-curve
    const zSpots = [16, 11.5, 5, 1.5, -5.5, -9, -15.5, -19.5];
    zSpots.forEach((z, idx) => {
      const x = Math.max(-2.1, Math.min(2.1, Math.sin(idx * 0.95 + laneShift) * 1.65));
      const y = idx === 2 ? 0.88 : 0.62;
      pickups.push({id: idx, pos: [x, y, z], noteIdx: idx < 3 ? 0 : idx < 6 ? 1 : 2});
      route.push([x, 0, z]);
    });
    route.push([0, 0.18, -23.4], [0, 0.36, -26.8]);
    bounds = {min: [-12, -3, -44], max: [12, 22, 30]};
  } else if (spec.mode === 'gather') {
    // 28×28m open courtyard with stepped side terraces and shallow reflective canal (non-overlapping XZ).
    spawn = [0, 0.05, 11.5];
    route.push([0, 0, 11.5]);
    // South apron z [4, 15]
    addSurf(-13, 4, 13, 15, 0, 'plaza');
    // Middle band z [-4, 4]: west terrace [-13,-5], center court [-5,5], east canal basin [5,10], east bank [10,13]
    addSurf(-13, -4, -5, 4, 0.28, 'terrace');
    addSurf(-5, -4, 5, 4, 0, 'main');
    addSurf(5, -4, 10, 4, -0.45, 'basin');
    addSurf(10, -4, 13, 4, 0, 'main');
    fluids.push({min: [5, -4], max: [10, 4], level: -0.18, sink: 0.16});
    // North monument apron z [-17, -4]
    addSurf(-13, -17, 13, -4, 0, 'plaza');

    // Walkable bridge across east canal (strictly above water level -0.18, top at +0.16)
    addBox('canal-bridge', [4.8, -0.02, -1.2], [10.2, 0.16, 1.2], 'bridge', true);
    // Low stone terrace stair on west side (height 0.28 -> 0.56)
    addBox('west-terrace-top', [-11.5, 0.28, -2.5], [-6.8, 0.56, 2.5], 'terrace', true);
    // Low arch gate on north-west courtyard leading to a tucked relic (C-spread or walk around)
    addBox('nw-arch-l', [-8.4, 0, -9.2], [-7.9, 1.8, -8.7], 'pillar', false);
    addBox('nw-arch-r', [-4.9, 0, -9.2], [-4.4, 1.8, -8.7], 'pillar', false);
    addBox('nw-arch-beam', [-7.9, 0.58, -9.15], [-4.9, 1.35, -8.75], 'lowbar', false);

    // Finish plinth in north center
    addBox('finish-step', [-3.2, 0, -9.2], [3.2, 0.18, -7.8], 'step', true);
    addBox('finish-plinth', [-4.0, 0, -14.2], [4.0, 0.36, -9.2], 'plinth', true);
    finish = {pos: [0, 0.36, -11.4], radius: 2.3};
    landmarkPos = [0, 0.36, -15.6];

    // 5 relics placed at distinct scenic landmarks around the courtyard
    const jitter = r.range(-0.45, 0.45);
    const spots: Vec[] = [
      [-3.5 + jitter, 0.62, 7.2],      // south-west entry lantern
      [-9.1, 1.18, 0.0 + jitter],      // west upper terrace
      [7.5, 0.78, 0.0],                // middle of east canal bridge
      [11.2, 0.62, -2.4 + jitter],     // east bank willow
      [-6.4, 0.62, -11.2],             // north-west behind arch
    ];
    spots.forEach((pos, id) => {
      pickups.push({id, pos, noteIdx: id === 0 ? 0 : id < 3 ? 1 : 2});
      route.push([pos[0], Math.max(0, pos[1] - 0.6), pos[2]]);
    });
    route.push([0, 0.18, -8.5], [0, 0.36, -11.4]);
    bounds = {min: [-16, -3, -24], max: [16, 22, 20]};
  } else if (spec.mode === 'relay') {
    // Split-bank workshop/valley with clone drawbridge + 2 element resonance devices.
    spawn = [0, 0.05, 12];
    route.push([0, 0, 12]);
    // Near bank: z [4, 16]
    addSurf(-10, 4, 10, 16, 0, 'plaza');
    // River/gorge basin: z [-2, 4] (6m wide -> clone pad at z = -3.4 is ~7.4m from near bank edge, super comfortable!)
    addSurf(-10, -2, 10, 4, -0.45, 'basin');
    fluids.push({min: [-10, -2], max: [10, 4], level: -0.18, sink: 0.16});
    // Far bank: z [-22, -2]
    addSurf(-10, -22, 10, -2, 0, 'plaza');

    // Dynamic drawbridge (index 0 in boxes so actor.syncBox(0) raises/lowers it seamlessly)
    bridgeIndex = boxes.length;
    addBox('relay-bridge', [-1.8, -3.6, -2.05], [1.8, -3.4, 4.05], 'bridge', true);

    // Clone pressure pad on far bank (visible directly across the water!)
    const padSide = r.chance(0.5) ? 1 : -1;
    const padPos: Vec = [padSide * 3.1, 0, -3.2];
    pads.push(padPos);

    // 2 element resonance devices on far bank (left & right)
    const altEl = (spec.element + 1) % 6;
    devices.push(
      {id: 0, pos: [-4.4, 0, -7.8], element: spec.element, label: `${ELEMENT_LABELS[spec.element]}韵共鸣柱`},
      {id: 1, pos: [4.4, 0, -7.8], element: altEl, label: `${ELEMENT_LABELS[altEl]}韵校准台`},
    );

    // Finish plinth
    addBox('finish-step', [-3.0, 0, -13.2], [3.0, 0.18, -11.8], 'step', true);
    addBox('finish-plinth', [-4.0, 0, -18.2], [4.0, 0.36, -13.2], 'plinth', true);
    finish = {pos: [0, 0.36, -15.4], radius: 2.3};
    landmarkPos = [0, 0.36, -20.2];

    // 4 relics: 1 on near bank, 1 on bridge center (after raised), 2 near devices
    const relaySpots: Vec[] = [
      [-padSide * 2.6, 0.62, 7.6],
      [0, 0.72, 1.0],
      [-4.4, 0.62, -5.2],
      [4.4, 0.62, -5.2],
    ];
    relaySpots.forEach((pos, id) => {
      pickups.push({id, pos, noteIdx: id === 0 ? 0 : id < 3 ? 1 : 2});
    });
    route.push([0, 0, 5], [0, 0.06, 1], [0, 0, -3], [-4.4, 0, -7.8], [4.4, 0, -7.8], [0, 0.18, -12.5], [0, 0.36, -15.4]);
    bounds = {min: [-14, -4, -28], max: [14, 22, 22]};
  } else {
    // 'glide': Scenic overlook platform (y = 5.4m) gliding over tranquil waters/valley to finish island,
    // with a zero-penalty stepped side promenade so the player can NEVER soft-lock!
    spawn = [0, 5.48, 22];
    route.push([0, 5.4, 22]);
    // High overlook cliff/deck base: z [17, 27]
    addSurf(-8, 17, 8, 27, 0, 'main');
    addBox('overlook-deck', [-4.8, 0, 18.2], [4.8, 5.4, 25.4], 'tower', true);
    // Gentle side stairs descending from overlook along west side (fallback walkway!)
    for (let i = 0; i < 6; i++) {
      const top = 5.4 - (i + 1) * 0.9;
      addBox(`glide-stair-${i}`, [-7.4, 0, 17.6 - i * 3.0], [-5.0, Math.max(0.2, top), 20.6 - i * 3.0], 'step', true);
    }
    // Scenic water bay between z [-16, 17], flanked by west fallback walkway x [-8.2, -4.8]
    addSurf(-8.2, -16, -4.8, 17, 0.12, 'walkway');
    addSurf(-4.8, -16, 8.2, 17, -0.45, 'basin');
    fluids.push({min: [-4.8, -16], max: [8.2, 17], level: -0.18, sink: 0.16});
    // Finish sanctuary island: z [-34, -16]
    addSurf(-9.5, -34, 9.5, -16, 0, 'plaza');

    addBox('finish-step', [-3.4, 0, -19.2], [3.4, 0.18, -17.6], 'step', true);
    addBox('finish-plinth', [-4.4, 0, -25.2], [4.4, 0.36, -19.2], 'plinth', true);
    finish = {pos: [0, 0.36, -22.0], radius: 2.5};
    landmarkPos = [0, 0.36, -29.2];

    // 2 updraft wind rings along the glide path
    const sway = r.range(-0.9, 0.9);
    windRings.push(
      {id: 0, pos: [sway, 4.2, 7.5], radius: 2.3, lift: 5.2},
      {id: 1, pos: [-sway, 3.0, -5.0], radius: 2.3, lift: 4.8},
    );

    // 6 aerial + landing beacons along the scenic glide arc
    const glideSpots: Vec[] = [
      [0, 5.9, 16.5],
      [sway * 0.8, 4.6, 10.5],
      [sway, 4.1, 4.0],
      [-sway * 0.5, 3.3, -2.0],
      [-sway, 2.5, -8.5],
      [0, 1.2, -15.0],
    ];
    glideSpots.forEach((pos, id) => {
      pickups.push({id, pos, noteIdx: id < 2 ? 0 : id < 4 ? 1 : 2});
      route.push(pos);
    });
    route.push([0, 0.36, -22.0]);
    bounds = {min: [-14, -4, -38], max: [14, 24, 30]};
  }

  const world: WorldDefinition = {
    boxes,
    surfaces: surfaces.map(({min, max, height}) => ({min, max, height})),
    fluids: fluids.length ? fluids : undefined,
    bounds,
  };

  return {
    seed,
    mode: spec.mode,
    spawn,
    spawnYaw: 0,
    surfaces,
    boxes,
    fluids,
    pickups,
    pads,
    devices,
    windRings,
    bridgeIndex,
    finish,
    landmarkPos,
    route,
    bounds,
    world,
  };
}

export function validateChronicle(spec: ChronicleSpec, layout: ChronicleLayout): {ok: boolean; errors: string[]} {
  const errors: string[] = [];
  // 1. Strict non-overlapping XZ surfaces check (prevents ground Z-fighting structurally)
  for (let i = 0; i < layout.surfaces.length; i++) {
    const a = layout.surfaces[i];
    if (a.max[0] <= a.min[0] || a.max[1] <= a.min[1]) errors.push(`surface ${i} degenerate`);
    for (let j = i + 1; j < layout.surfaces.length; j++) {
      const b = layout.surfaces[j];
      const ox = Math.min(a.max[0], b.max[0]) - Math.max(a.min[0], b.min[0]);
      const oz = Math.min(a.max[1], b.max[1]) - Math.max(a.min[1], b.min[1]);
      if (ox > 0.001 && oz > 0.001) errors.push(`surfaces ${i} & ${j} overlap in XZ (${ox.toFixed(2)}x${oz.toFixed(2)})`);
    }
  }
  // 2. Pickups inside bounds and clear of solid pillars/walls
  for (const p of layout.pickups) {
    if (
      p.pos[0] < layout.bounds.min[0] || p.pos[0] > layout.bounds.max[0] ||
      p.pos[2] < layout.bounds.min[2] || p.pos[2] > layout.bounds.max[2]
    ) {
      errors.push(`pickup ${p.id} out of bounds`);
    }
    for (const b of layout.boxes) {
      if (b.walkable || b.kind === 'bridge' || b.kind === 'lowbar') continue;
      if (
        p.pos[0] > b.min[0] - 0.3 && p.pos[0] < b.max[0] + 0.3 &&
        p.pos[1] > b.min[1] - 0.3 && p.pos[1] < b.max[1] + 0.3 &&
        p.pos[2] > b.min[2] - 0.3 && p.pos[2] < b.max[2] + 0.3
      ) {
        errors.push(`pickup ${p.id} inside solid ${b.name}`);
      }
    }
  }
  // 3. Mode-specific physical feasibility
  if (spec.mode === 'relay') {
    if (layout.bridgeIndex < 0 || !layout.pads.length) errors.push('relay missing bridge or pad');
    else {
      const pad = layout.pads[0];
      const distFromNearBank = Math.hypot(pad[0], pad[2] - 4);
      if (distFromNearBank < 3.0 || distFromNearBank > 10.5) errors.push(`relay pad distance ${distFromNearBank.toFixed(2)} out of clone range`);
    }
    if (layout.devices.length !== 2) errors.push('relay must have 2 devices');
  }
  if (spec.mode === 'glide') {
    if (layout.spawn[1] - layout.finish.pos[1] < 4.5) errors.push('glide drop too shallow');
    if (layout.windRings.length < 2) errors.push('glide needs at least 2 wind rings');
  }
  if (spec.mode === 'gather' && layout.pickups.length < 5) errors.push('gather needs 5 pickups');
  if (spec.mode === 'parkour' && layout.pickups.length < 6) errors.push('parkour needs >=6 pickups');
  if (spec.storyNotes.length !== 3 || spec.storyNotes.some(n => n.trim().length < 6)) {
    errors.push('storyNotes must contain 3 readable notes');
  }
  return {ok: errors.length === 0, errors};
}

export interface ChronicleSignals {
  position: Vec;
  element: number;
  spread: number;
  shots: ShotView[];
}

export interface ChronicleState {
  collected: boolean[];
  devicesDone: boolean[];
  bridgeOpen: boolean;
  notesUnlocked: number;
  readyForFinale: boolean;
  triggeredFinale: boolean;
}

export function createChronicleState(layout: ChronicleLayout): ChronicleState {
  return {
    collected: layout.pickups.map(() => false),
    devicesDone: layout.devices.map(() => false),
    bridgeOpen: layout.mode !== 'relay',
    notesUnlocked: 0,
    readyForFinale: layout.mode === 'parkour' || layout.mode === 'glide',
    triggeredFinale: false,
  };
}

export interface ChronicleStepResult {
  pickedIds: number[];
  newNoteIdx: number;
  activatedDevice: number;
  wrongElement: number | null;
  bridgeChanged: boolean;
  finaleTriggered: boolean;
}

const distXZ = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[2] - b[2]);

export function stepChronicle(
  spec: ChronicleSpec,
  layout: ChronicleLayout,
  state: ChronicleState,
  sig: ChronicleSignals,
  interact: boolean,
): ChronicleStepResult {
  const res: ChronicleStepResult = {
    pickedIds: [],
    newNoteIdx: -1,
    activatedDevice: -1,
    wrongElement: null,
    bridgeChanged: false,
    finaleTriggered: false,
  };
  if (state.triggeredFinale) return res;

  // 1. Collect nearby relics (generous magnetic pickup radius for breezy lightweight feel)
  const pickupR = layout.mode === 'glide' ? 2.15 : 1.35;
  const pickupY = layout.mode === 'glide' ? 2.25 : 1.45;
  for (let i = 0; i < layout.pickups.length; i++) {
    if (state.collected[i]) continue;
    const p = layout.pickups[i];
    if (distXZ(sig.position, p.pos) <= pickupR && Math.abs(sig.position[1] + 0.35 - p.pos[1]) <= pickupY) {
      state.collected[i] = true;
      res.pickedIds.push(i);
    }
  }

  // 2. Relay clone pad check (once opened, bridge latches open if player crosses or stays open while clone holds pad)
  if (layout.mode === 'relay' && layout.pads.length) {
    const pad = layout.pads[0];
    const cloneOnPad = sig.shots.some(s => s.phase === 'active' && distXZ(s.center, pad) < 1.15);
    const crossed = sig.position[2] < -1.6;
    const shouldOpen = cloneOnPad || crossed || state.devicesDone.some(Boolean);
    if (shouldOpen !== state.bridgeOpen) {
      state.bridgeOpen = shouldOpen;
      res.bridgeChanged = true;
    }
  }

  // 3. Device interaction for relay
  if (interact && layout.devices.length) {
    for (let i = 0; i < layout.devices.length; i++) {
      if (state.devicesDone[i]) continue;
      const dev = layout.devices[i];
      if (distXZ(sig.position, dev.pos) < 1.85 && Math.abs(sig.position[1] - dev.pos[1]) < 1.2) {
        if (sig.element === dev.element) {
          state.devicesDone[i] = true;
          res.activatedDevice = i;
        } else {
          res.wrongElement = dev.element;
        }
        break;
      }
    }
  }

  // 4. Progressive story notes (3 milestones across the run)
  const got = state.collected.filter(Boolean).length;
  const total = layout.pickups.length;
  let targetNotes = 0;
  if (layout.mode === 'relay') {
    if (state.bridgeOpen || got >= 1) targetNotes = 1;
    if (state.devicesDone[0] || state.devicesDone[1] || got >= 2) targetNotes = 2;
    if (state.devicesDone.every(Boolean)) targetNotes = 3;
  } else {
    if (got >= 1) targetNotes = 1;
    if (got >= Math.ceil(total * 0.5)) targetNotes = 2;
    if (got >= Math.max(total - 1, Math.ceil(total * 0.8))) targetNotes = 3;
    // Also unlock notes by forward progress in parkour/glide so players always read all 3 notes even if they skip relics!
    if (layout.mode === 'parkour' || layout.mode === 'glide') {
      const z0 = layout.spawn[2], z1 = layout.finish.pos[2];
      const prog = Math.max(0, Math.min(1, (z0 - sig.position[2]) / Math.max(1, z0 - z1)));
      if (prog >= 0.25) targetNotes = Math.max(targetNotes, 1);
      if (prog >= 0.58) targetNotes = Math.max(targetNotes, 2);
      if (prog >= 0.86) targetNotes = Math.max(targetNotes, 3);
    }
  }
  if (targetNotes > state.notesUnlocked) {
    state.notesUnlocked = targetNotes;
    res.newNoteIdx = targetNotes - 1;
  }

  // 5. Ready & finale trigger
  if (layout.mode === 'gather') state.readyForFinale = got >= total;
  else if (layout.mode === 'relay') state.readyForFinale = state.devicesDone.every(Boolean);
  else state.readyForFinale = true;

  const atFinish = distXZ(sig.position, layout.finish.pos) <= layout.finish.radius && Math.abs(sig.position[1] - layout.finish.pos[1]) < 1.35;
  if (state.readyForFinale && atFinish && (interact || layout.mode === 'parkour' || layout.mode === 'glide')) {
    state.triggeredFinale = true;
    state.notesUnlocked = 3;
    res.finaleTriggered = true;
  }

  return res;
}

export function chronicleMedal(spec: ChronicleSpec, seconds: number): 3 | 2 | 1 {
  if (seconds <= spec.medals.gold) return 3;
  if (seconds <= spec.medals.silver) return 2;
  return 1;
}
