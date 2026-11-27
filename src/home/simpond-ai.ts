import * as THREE from 'three';
import {inland, LAKE} from '../world/map';
import {riverCenter, riverLevel} from './waterway';
import {SEA_LEVEL} from './layout';
import {spawnSimPondActor, type SimPondActorHandle, type SimPondSpeciesId} from './simpond-assets';

// ============================================================================
// 1. PURE DETERMINISTIC AI STATE MACHINES (100% unit-testable without WebGL)
// ============================================================================

export type FrogState = 'sit' | 'croak' | 'hop' | 'swim' | 'float';
export type NewtState = 'rest' | 'walk' | 'swim' | 'court';
export type FishFsmState = 'cruise' | 'school' | 'surface_feed' | 'flee_dart' | 'idle_hover';
export type SkaterState = 'drift' | 'stroke_burst' | 'whirl' | 'scatter';
export type DragonflyState = 'patrol' | 'hover' | 'dart' | 'perch';
export type ShoreCritterState = 'forage' | 'scuttle' | 'freeze' | 'flee_water';

export interface ThreatSample {
  x: number;
  y: number;
  z: number;
  speed: number;
  /** 0 = normal dome, 1 = flattened sneaking slime (quieter) */
  spread: number;
}

export interface AmphibianAgent {
  kind: 'frog' | 'newt';
  state: FrogState | NewtState;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  timer: number;
  /** Bank anchor (land) and pond/river escape point (water). */
  bankX: number;
  bankZ: number;
  waterX: number;
  waterZ: number;
  waterLevel: number;
  inWater: boolean;
  hopProgress: number;
  /** Latched swim target so fleeing/returning frogs never flip target every frame. */
  swimTx?: number;
  swimTz?: number;
}

/** Smoothly steps an angle along the shortest arc to eliminate 180-degree yaw snapping/twitching. */
function stepAngle(current: number, target: number, maxDelta: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxDelta) return current + diff;
  return current + Math.sign(diff) * maxDelta;
}

export function createAmphibianAgent(
  kind: 'frog' | 'newt',
  bankX: number,
  bankZ: number,
  waterX: number,
  waterZ: number,
  waterLevel: number,
  groundY: number,
): AmphibianAgent {
  return {
    kind,
    state: kind === 'frog' ? 'sit' : 'rest',
    x: bankX,
    y: groundY,
    z: bankZ,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: Math.atan2(waterX - bankX, waterZ - bankZ),
    timer: 1.2,
    bankX,
    bankZ,
    waterX,
    waterZ,
    waterLevel,
    inWater: false,
    hopProgress: 0,
  };
}

/**
 * Advances a frog (`sit | croak | hop | swim | float`) or newt (`rest | walk | swim | court`)
 * finite state machine across shoreline land and water.
 */
export function stepAmphibianFsm(
  a: AmphibianAgent,
  dt: number,
  threat: ThreatSample | null,
  sampleGround: (x: number, z: number) => number,
  rand: () => number,
): {anim: string; timeScale: number} {
  const cdt = Math.min(dt, 0.05);
  a.timer -= cdt;

  const distThreat = threat ? Math.hypot(a.x - threat.x, a.z - threat.z) : Infinity;
  const detectRange = threat ? (a.kind === 'frog' ? 3.8 : 2.9) * (1 - 0.55 * threat.spread) * (0.7 + 0.12 * Math.min(threat.speed, 6)) : 0;
  const startled = threat !== null && distThreat < detectRange;

  if (a.kind === 'frog') {
    if (startled && !a.inWater && a.state !== 'hop') {
      // Strong ballistic splash leap straight into the water!
      const dx = a.waterX - a.x, dz = a.waterZ - a.z;
      const len = Math.hypot(dx, dz) || 1;
      a.yaw = Math.atan2(dx, dz);
      a.vx = (dx / len) * 3.3;
      a.vz = (dz / len) * 3.3;
      a.vy = 2.95;
      a.state = 'hop';
      a.timer = 0.85;
      a.hopProgress = 0;
      a.swimTx = undefined;
      a.swimTz = undefined;
    }

    if (a.state === 'hop') {
      a.x += a.vx * cdt;
      a.z += a.vz * cdt;
      a.vy -= 8.8 * cdt;
      a.y += a.vy * cdt;
      const gy = sampleGround(a.x, a.z);
      const reachedWater = gy < a.waterLevel - 0.06 && a.y <= a.waterLevel;
      if (reachedWater) {
        a.y = a.waterLevel - 0.05;
        a.vy = 0;
        a.inWater = true;
        a.state = 'swim';
        a.timer = 1.6 + rand() * 1.4;
        a.swimTx = startled && threat ? a.waterX + Math.max(-2.2, Math.min(2.2, (a.x - threat.x) * 0.5)) : a.waterX + (rand() - 0.5) * 1.6;
        a.swimTz = startled && threat ? a.waterZ + Math.max(-2.2, Math.min(2.2, (a.z - threat.z) * 0.5)) : a.waterZ + (rand() - 0.5) * 1.6;
      } else if (a.y <= gy) {
        a.y = gy;
        a.vx = a.vy = a.vz = 0;
        a.inWater = false;
        a.state = 'sit';
        a.timer = 1.8 + rand() * 2.6;
      }
      return {anim: 'hop', timeScale: 1.35};
    }

    if (a.state === 'swim') {
      // Latch a stable swim destination so arrival never overshoots or causes 180-deg yaw oscillation
      if (a.swimTx === undefined || a.swimTz === undefined) {
        if (startled && threat) {
          a.swimTx = a.waterX + Math.max(-2.0, Math.min(2.0, (a.x - threat.x) * 0.5));
          a.swimTz = a.waterZ + Math.max(-2.0, Math.min(2.0, (a.z - threat.z) * 0.5));
        } else {
          a.swimTx = a.bankX;
          a.swimTz = a.bankZ;
        }
      }
      const dx = a.swimTx - a.x, dz = a.swimTz - a.z;
      const dist = Math.hypot(dx, dz);
      const spd = startled ? 1.50 : 0.82;
      if (dist > 0.28) {
        const targetYaw = Math.atan2(dx, dz);
        a.yaw = stepAngle(a.yaw, targetYaw, 5.2 * cdt);
        const move = Math.min(dist - 0.24, spd * cdt);
        a.x += (dx / dist) * move;
        a.z += (dz / dist) * move;
      }
      const gy = sampleGround(a.x, a.z);
      a.y = Math.max(gy + 0.02, a.waterLevel - 0.06);
      const nearBank = !startled && Math.hypot(a.x - a.bankX, a.z - a.bankZ) < 1.8 && gy >= a.waterLevel - 0.09;
      if (nearBank) {
        a.inWater = false;
        a.y = gy;
        a.state = 'sit';
        a.timer = 2.4 + rand() * 2.8;
        a.swimTx = a.swimTz = undefined;
      } else if (dist <= 0.30 || (a.timer <= 0 && !startled)) {
        // Settle peacefully into float instead of oscillating back and forth over the target point
        a.state = 'float';
        a.timer = 2.6 + rand() * 2.8;
        a.swimTx = a.swimTz = undefined;
      }
      return {anim: 'swim', timeScale: startled ? 1.4 : 0.95};
    }

    if (a.state === 'float') {
      a.y = a.waterLevel - 0.04;
      if (startled && threat) {
        a.state = 'swim';
        a.timer = 1.8;
        a.swimTx = a.waterX + Math.max(-2.2, Math.min(2.2, (a.x - threat.x) * 0.6));
        a.swimTz = a.waterZ + Math.max(-2.2, Math.min(2.2, (a.z - threat.z) * 0.6));
      } else if (a.timer <= 0) {
        a.state = 'swim'; // head back smoothly toward shore
        a.timer = 2.6 + rand() * 1.6;
        a.swimTx = a.bankX;
        a.swimTz = a.bankZ;
      }
      return {anim: 'float', timeScale: 0.85};
    }

    if (a.state === 'croak') {
      if (a.timer <= 0) {
        a.state = 'sit';
        a.timer = 2.0 + rand() * 2.6;
      }
      return {anim: 'croak', timeScale: 0.92};
    }

    // state === 'sit'
    a.y = sampleGround(a.x, a.z);
    if (a.timer <= 0) {
      const r = rand();
      if (r < 0.46) {
        a.state = 'croak';
        a.timer = 1.4 + rand() * 0.9;
      } else {
        // Short patrol hop around bank or into water
        const toWater = r > 0.80;
        const tx = toWater ? a.waterX : a.bankX + (rand() - 0.5) * 2.4;
        const tz = toWater ? a.waterZ : a.bankZ + (rand() - 0.5) * 2.4;
        const dx = tx - a.x, dz = tz - a.z;
        const len = Math.hypot(dx, dz);
        if (len > 0.35) {
          a.yaw = Math.atan2(dx, dz);
          const hopSpd = Math.min(1.85, Math.max(0.85, len * 0.9));
          a.vx = (dx / len) * hopSpd;
          a.vz = (dz / len) * hopSpd;
          a.vy = 1.95;
          a.state = 'hop';
          a.timer = 0.65;
        } else {
          a.timer = 1.8 + rand() * 2.0;
        }
      }
    }
    return {anim: 'sit', timeScale: 0.9};
  }

  // ---- Smooth Newt FSM: rest | walk | swim | court ----
  if (startled && a.state !== 'swim') {
    const dx = a.waterX - a.x, dz = a.waterZ - a.z;
    const len = Math.hypot(dx, dz) || 1;
    a.yaw = Math.atan2(dx, dz);
    a.vx = (dx / len) * 1.1;
    a.vz = (dz / len) * 1.1;
    a.state = a.inWater ? 'swim' : 'walk';
    a.timer = 1.8;
  }

  if (a.state === 'swim') {
    const tx = startled ? a.waterX : (a.timer < 0.8 ? a.bankX : a.waterX + Math.cos(a.timer * 1.4) * 1.4);
    const tz = startled ? a.waterZ : (a.timer < 0.8 ? a.bankZ : a.waterZ + Math.sin(a.timer * 1.4) * 1.4);
    const dx = tx - a.x, dz = tz - a.z;
    const len = Math.hypot(dx, dz) || 1;
    a.yaw = Math.atan2(dx, dz);
    const spd = startled ? 1.15 : 0.62;
    a.x += (dx / len) * spd * cdt;
    a.z += (dz / len) * spd * cdt;
    const gy = sampleGround(a.x, a.z);
    if (gy >= a.waterLevel - 0.04 && !startled) {
      a.inWater = false;
      a.y = gy;
      a.state = 'walk';
      a.timer = 1.6 + rand() * 1.4;
    } else {
      a.inWater = true;
      a.y = Math.max(gy + 0.05, a.waterLevel - 0.16);
      if (a.timer <= 0 && !startled) {
        a.state = 'court';
        a.timer = 1.8 + rand() * 1.6;
      }
    }
    return {anim: 'swim', timeScale: startled ? 1.5 : 1.0};
  }

  if (a.state === 'walk') {
    a.x += a.vx * cdt;
    a.z += a.vz * cdt;
    const gy = sampleGround(a.x, a.z);
    if (gy < a.waterLevel - 0.06) {
      a.inWater = true;
      a.y = a.waterLevel - 0.14;
      a.state = 'swim';
      a.timer = 2.4 + rand() * 2.0;
    } else {
      a.y = gy;
      if (a.timer <= 0) {
        a.state = rand() < 0.35 ? 'court' : 'rest';
        a.timer = 1.8 + rand() * 2.2;
      }
    }
    return {anim: 'walk', timeScale: startled ? 1.55 : 1.0};
  }

  if (a.state === 'court') {
    a.yaw += Math.sin(a.timer * 3.5) * cdt * 0.8;
    if (a.timer <= 0) {
      a.state = a.inWater ? 'swim' : 'rest';
      a.timer = 1.6 + rand() * 2.0;
    }
    return {anim: 'court', timeScale: 1.0};
  }

  // state === 'rest'
  a.y = sampleGround(a.x, a.z);
  if (a.timer <= 0) {
    const goWater = rand() < 0.45;
    const tx = goWater ? a.waterX : a.bankX + (rand() - 0.5) * 2.0;
    const tz = goWater ? a.waterZ : a.bankZ + (rand() - 0.5) * 2.0;
    const dx = tx - a.x, dz = tz - a.z;
    const len = Math.hypot(dx, dz) || 1;
    a.yaw = Math.atan2(dx, dz);
    a.vx = (dx / len) * 0.48;
    a.vz = (dz / len) * 0.48;
    a.state = 'walk';
    a.timer = 1.6 + rand() * 1.8;
  }
  return {anim: 'rest', timeScale: 0.9};
}

// ---- Fish School Boids + Flee-Dart FSM ----

export interface FishBoidAgent {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  state: FishFsmState;
  timer: number;
  depthOffset: number;
  targetDepth: number;
  cruiseSpeed: number;
}

export function stepFishBoidFsm(
  fish: FishBoidAgent,
  peers: readonly FishBoidAgent[],
  dt: number,
  home: {cx: number; cz: number; rx: number; rz: number; waterLevel: number; baseDepth: number},
  threat: ThreatSample | null,
  rand: () => number,
): {swimFreq: number; swimAmp: number} {
  const cdt = Math.min(dt, 0.05);
  fish.timer -= cdt;

  const dThreat = threat ? Math.hypot(fish.x - threat.x, fish.z - threat.z) : Infinity;
  const nearWaterThreat = threat !== null && threat.y < home.waterLevel + 0.65 && dThreat < (2.4 + threat.speed * 0.25);

  if (nearWaterThreat && fish.state !== 'flee_dart') {
    fish.state = 'flee_dart';
    fish.timer = 0.85 + rand() * 0.55;
  } else if (fish.timer <= 0) {
    if (fish.state === 'flee_dart') {
      fish.state = 'school';
      fish.timer = 2.4 + rand() * 2.2;
    } else {
      const r = rand();
      fish.state = r < 0.42 ? 'school' : r < 0.72 ? 'cruise' : r < 0.88 ? 'surface_feed' : 'idle_hover';
      fish.timer = 2.0 + rand() * 3.0;
    }
  }

  // Boids steering forces
  let ax = 0, az = 0;
  let sepX = 0, sepZ = 0, aliX = 0, aliZ = 0, cohX = 0, cohZ = 0, nCount = 0;
  for (const other of peers) {
    if (other === fish) continue;
    const dx = fish.x - other.x, dz = fish.z - other.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.01 && d < 2.8) {
      if (d < 0.72) { sepX += (dx / d) * (0.72 - d) * 3.2; sepZ += (dz / d) * (0.72 - d) * 3.2; }
      aliX += other.vx; aliZ += other.vz;
      cohX += other.x; cohZ += other.z;
      nCount++;
    }
  }
  if (nCount > 0) {
    const wSchool = fish.state === 'school' ? 1.0 : 0.45;
    ax += sepX + (aliX / nCount - fish.vx) * 0.55 * wSchool + (cohX / nCount - fish.x) * 0.35 * wSchool;
    az += sepZ + (aliZ / nCount - fish.vz) * 0.55 * wSchool + (cohZ / nCount - fish.z) * 0.35 * wSchool;
  }

  // Soft elliptical tether inside pond / river reach
  const nx = (fish.x - home.cx) / Math.max(home.rx, 0.5);
  const nz = (fish.z - home.cz) / Math.max(home.rz, 0.5);
  const r2 = nx * nx + nz * nz;
  if (r2 > 0.72) {
    const pull = (r2 - 0.72) * 3.4;
    ax -= nx * pull;
    az -= nz * pull;
  }

  // Subtle orbital flow so schools circulate gracefully
  ax += -nz * 0.42;
  az += nx * 0.42;

  if (fish.state === 'flee_dart' && threat) {
    const fx = fish.x - threat.x, fz = fish.z - threat.z;
    const fl = Math.hypot(fx, fz) || 1;
    ax += (fx / fl) * 6.5;
    az += (fz / fl) * 6.5;
  }

  const targetSpeed =
    fish.state === 'flee_dart' ? fish.cruiseSpeed * 2.55
    : fish.state === 'idle_hover' ? fish.cruiseSpeed * 0.22
    : fish.state === 'surface_feed' ? fish.cruiseSpeed * 0.58
    : fish.cruiseSpeed;

  fish.vx += ax * cdt;
  fish.vz += az * cdt;
  const spd = Math.hypot(fish.vx, fish.vz) || 0.01;
  const blendSpd = spd + (targetSpeed - spd) * Math.min(1, cdt * 4.5);
  fish.vx = (fish.vx / spd) * blendSpd;
  fish.vz = (fish.vz / spd) * blendSpd;

  fish.x += fish.vx * cdt;
  fish.z += fish.vz * cdt;
  fish.yaw = Math.atan2(fish.vx, fish.vz);

  fish.targetDepth =
    fish.state === 'surface_feed' ? Math.max(0.08, home.baseDepth * 0.45)
    : fish.state === 'flee_dart' ? home.baseDepth * 1.45
    : home.baseDepth;
  fish.depthOffset += (fish.targetDepth - fish.depthOffset) * Math.min(1, cdt * 2.8);
  fish.y = home.waterLevel - fish.depthOffset;

  return {
    swimFreq: fish.state === 'flee_dart' ? 16.5 : fish.state === 'idle_hover' ? 3.8 : 7.8,
    swimAmp: fish.state === 'flee_dart' ? 0.24 : fish.state === 'idle_hover' ? 0.08 : 0.14,
  };
}

// ---- Water Surface Skater FSM (Water Strider & Whirligig Beetle) ----

export interface SkaterAgent {
  kind: 'water-strider' | 'whirligig-beetle';
  state: SkaterState;
  x: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  timer: number;
  cx: number;
  cz: number;
  radius: number;
  waterLevel: number;
}

export function stepSkaterFsm(
  s: SkaterAgent,
  dt: number,
  threat: ThreatSample | null,
  rand: () => number,
): {swimFreq: number; swimAmp: number} {
  const cdt = Math.min(dt, 0.05);
  s.timer -= cdt;

  const dThreat = threat ? Math.hypot(s.x - threat.x, s.z - threat.z) : Infinity;
  if (threat && dThreat < 2.4 && s.state !== 'scatter') {
    const dx = s.x - threat.x, dz = s.z - threat.z;
    const len = Math.hypot(dx, dz) || 1;
    s.vx = (dx / len) * 2.8;
    s.vz = (dz / len) * 2.8;
    s.yaw = Math.atan2(s.vx, s.vz);
    s.state = 'scatter';
    s.timer = 0.65;
  } else if (s.timer <= 0) {
    if (s.kind === 'whirligig-beetle' && rand() < 0.65) {
      s.state = 'whirl';
      s.timer = 1.4 + rand() * 1.8;
    } else if (s.state === 'drift' || s.state === 'scatter') {
      // Impulse stroke toward inner zone
      const toC = Math.hypot(s.x - s.cx, s.z - s.cz) > s.radius;
      const ang = toC ? Math.atan2(s.cx - s.x, s.cz - s.z) + (rand() - 0.5) * 0.8 : rand() * Math.PI * 2;
      const imp = s.kind === 'water-strider' ? 1.75 : 1.35;
      s.vx = Math.sin(ang) * imp;
      s.vz = Math.cos(ang) * imp;
      s.yaw = ang;
      s.state = 'stroke_burst';
      s.timer = 0.25;
    } else {
      s.state = 'drift';
      s.timer = 0.7 + rand() * 1.2;
    }
  }

  if (s.state === 'whirl') {
    s.yaw += cdt * 4.8;
    s.vx = Math.sin(s.yaw) * 1.15;
    s.vz = Math.cos(s.yaw) * 1.15;
  } else {
    // Exponential hydro drag during coasting
    const drag = Math.exp(-cdt * (s.state === 'stroke_burst' ? 1.2 : 3.2));
    s.vx *= drag;
    s.vz *= drag;
  }

  s.x += s.vx * cdt;
  s.z += s.vz * cdt;
  const distC = Math.hypot(s.x - s.cx, s.z - s.cz);
  if (distC > s.radius * 1.25) {
    const k = (s.radius * 1.25) / distC;
    s.x = s.cx + (s.x - s.cx) * k;
    s.z = s.cz + (s.z - s.cz) * k;
  }
  return {
    swimFreq: s.state === 'stroke_burst' || s.state === 'scatter' ? 22 : 9,
    swimAmp: s.state === 'drift' ? 0.02 : 0.08,
  };
}

// ---- Dragonfly Aerial Patrol / Hover / Dart / Perch FSM ----

export interface DragonflyAgent {
  kind: 'dragonfly-emperor' | 'dragonfly-darter';
  state: DragonflyState;
  x: number;
  y: number;
  z: number;
  yaw: number;
  timer: number;
  cx: number;
  cz: number;
  radius: number;
  baseY: number;
  tx: number;
  ty: number;
  tz: number;
}

export function stepDragonflyFsm(
  d: DragonflyAgent,
  dt: number,
  threat: ThreatSample | null,
  rand: () => number,
): {wingFreq: number; wingAmp: number} {
  const cdt = Math.min(dt, 0.05);
  d.timer -= cdt;

  const dThreat = threat ? Math.hypot(d.x - threat.x, d.z - threat.z) : Infinity;
  if (threat && dThreat < 2.2 && d.state !== 'dart') {
    const fx = d.x - threat.x, fz = d.z - threat.z;
    const fl = Math.hypot(fx, fz) || 1;
    d.tx = d.x + (fx / fl) * 3.5;
    d.ty = d.baseY + 0.9 + rand() * 0.5;
    d.tz = d.z + (fz / fl) * 3.5;
    d.state = 'dart';
    d.timer = 0.75;
  } else if (d.timer <= 0) {
    const r = rand();
    if (d.state === 'patrol' || d.state === 'dart') {
      d.state = r < 0.65 ? 'hover' : 'perch';
      d.timer = d.state === 'hover' ? 1.1 + rand() * 1.4 : 1.8 + rand() * 2.0;
    } else {
      const ang = rand() * Math.PI * 2;
      const rad = (0.3 + rand() * 0.7) * d.radius;
      d.tx = d.cx + Math.cos(ang) * rad;
      d.tz = d.cz + Math.sin(ang) * rad;
      d.ty = d.baseY + 0.45 + rand() * 0.85;
      d.state = r < 0.35 ? 'dart' : 'patrol';
      d.timer = d.state === 'dart' ? 0.65 + rand() * 0.5 : 1.8 + rand() * 2.0;
    }
  }

  if (d.state === 'patrol' || d.state === 'dart') {
    const dx = d.tx - d.x, dy = d.ty - d.y, dz = d.tz - d.z;
    const dist = Math.hypot(dx, dy, dz) || 1;
    const spd = d.state === 'dart' ? 4.6 : 2.1;
    const step = Math.min(dist, spd * cdt);
    d.x += (dx / dist) * step;
    d.y += (dy / dist) * step;
    d.z += (dz / dist) * step;
    if (Math.hypot(dx, dz) > 0.05) d.yaw = Math.atan2(dx, dz);
    if (dist < 0.2) d.timer = Math.min(d.timer, 0.05);
  } else if (d.state === 'hover') {
    d.y += Math.sin(d.timer * 8) * cdt * 0.14;
  } else {
    // perch gently near reed/lily level
    d.y += (d.baseY + 0.18 - d.y) * Math.min(1, cdt * 4);
  }

  return {
    wingFreq: d.state === 'perch' ? 4 : d.state === 'dart' ? 54 : 38,
    wingAmp: d.state === 'perch' ? 0.06 : d.state === 'hover' ? 0.58 : 0.72,
  };
}

// ---- Shore & Benthic Crustaceans / Molluscs FSM ----

export interface ShoreCritterAgent {
  kind: 'shore-crab' | 'hermit-crab' | 'crayfish-signal' | 'pond-snail';
  state: ShoreCritterState;
  x: number;
  y: number;
  z: number;
  yaw: number;
  moveDirX: number;
  moveDirZ: number;
  timer: number;
  homeX: number;
  homeZ: number;
  waterX: number;
  waterZ: number;
  radius: number;
}

export function stepShoreCritterFsm(
  c: ShoreCritterAgent,
  dt: number,
  threat: ThreatSample | null,
  sampleGround: (x: number, z: number) => number,
  rand: () => number,
): {scuttleFreq: number; scuttleAmp: number} {
  const cdt = Math.min(dt, 0.05);
  c.timer -= cdt;

  const dThreat = threat ? Math.hypot(c.x - threat.x, c.z - threat.z) : Infinity;
  const scared = threat !== null && dThreat < (c.kind === 'pond-snail' ? 1.5 : 3.0) * (1 - 0.5 * threat.spread);

  if (scared && c.state !== 'freeze' && c.state !== 'flee_water') {
    if (c.kind === 'hermit-crab' || c.kind === 'pond-snail') {
      c.state = 'freeze';
      c.timer = 1.6 + rand() * 1.0;
    } else {
      const dx = c.waterX - c.x, dz = c.waterZ - c.z;
      const len = Math.hypot(dx, dz) || 1;
      c.moveDirX = dx / len;
      c.moveDirZ = dz / len;
      c.state = 'flee_water';
      c.timer = 1.25 + rand() * 0.6;
    }
  } else if (c.timer <= 0) {
    if (c.state === 'freeze' || c.state === 'flee_water') {
      c.state = 'forage';
      c.timer = 1.6 + rand() * 2.0;
    } else if (c.state === 'forage') {
      const far = Math.hypot(c.x - c.homeX, c.z - c.homeZ) > c.radius;
      const ang = far ? Math.atan2(c.homeX - c.x, c.homeZ - c.z) : rand() * Math.PI * 2;
      c.moveDirX = Math.sin(ang);
      c.moveDirZ = Math.cos(ang);
      c.state = 'scuttle';
      c.timer = 1.1 + rand() * 1.8;
    } else {
      c.state = 'forage';
      c.timer = 1.4 + rand() * 2.2;
    }
  }

  const speed =
    c.state === 'freeze' ? 0
    : c.state === 'forage' ? (c.kind === 'pond-snail' ? 0.06 : 0.14)
    : c.state === 'flee_water' ? (c.kind === 'shore-crab' ? 1.85 : 1.55)
    : (c.kind === 'pond-snail' ? 0.11 : c.kind === 'hermit-crab' ? 0.34 : 0.72);

  if (speed > 0) {
    c.x += c.moveDirX * speed * cdt;
    c.z += c.moveDirZ * speed * cdt;
    const moveYaw = Math.atan2(c.moveDirX, c.moveDirZ);
    // Shore crabs walk sideways (facing 90 degrees from movement direction)
    c.yaw = c.kind === 'shore-crab' ? moveYaw + Math.PI / 2 : moveYaw;
  }
  c.y = sampleGround(c.x, c.z);

  return {
    scuttleFreq: c.state === 'flee_water' ? 24 : c.state === 'scuttle' ? 13 : 3,
    scuttleAmp: c.state === 'freeze' ? 0 : c.state === 'flee_water' ? 0.09 : c.state === 'scuttle' ? 0.05 : 0.015,
  };
}

// ============================================================================
// 2. HOME WORLD ECOSYSTEM RUNTIME (Mirror Lake, River Banks, Sandy Coast)
// ============================================================================

function makeRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

export class SimPondEcosystem {
  readonly root: THREE.Group;
  private amphibians: {agent: AmphibianAgent; handle: SimPondActorHandle}[] = [];
  private skaters: {agent: SkaterAgent; handle: SimPondActorHandle}[] = [];
  private dragonflies: {agent: DragonflyAgent; handle: SimPondActorHandle}[] = [];
  private shoreCritters: {agent: ShoreCritterAgent; handle: SimPondActorHandle}[] = [];
  private rand = makeRng(20261127);

  constructor(private scene: THREE.Scene) {
    this.root = new THREE.Group();
    this.root.name = 'simpond-ecosystem';
    this.root.userData.walkThrough = true;
    this.scene.add(this.root);
    this.populate();
  }

  get creatureCount(): number {
    return this.amphibians.length + this.skaters.length + this.dragonflies.length + this.shoreCritters.length;
  }

  private populate() {
    const [lx, lz] = LAKE.center;

    // 1. Skeletal-animated Common Frogs around Mirror Lake banks & Harbor River edge
    const frogSpots: [number, number, number, number, number][] = [
      [lx - LAKE.rx * 1.06, lz - 6, lx - LAKE.rx * 0.72, lz - 5, LAKE.level],
      [lx + LAKE.rx * 1.05, lz - 4, lx + LAKE.rx * 0.72, lz - 3, LAKE.level],
      [lx - LAKE.rx * 0.92, lz + 9, lx - LAKE.rx * 0.58, lz + 7, LAKE.level],
      [lx + LAKE.rx * 0.96, lz + 10, lx + LAKE.rx * 0.62, lz + 8, LAKE.level],
      [riverCenter(4) - 4.4, 4, riverCenter(4) - 1.5, 4, riverLevel],
      [riverCenter(-9) + 4.3, -9, riverCenter(-9) + 1.4, -9, riverLevel],
    ];
    for (const [bx, bz, wx, wz, wl] of frogSpots) {
      const gy = inland(bx, bz);
      const agent = createAmphibianAgent('frog', bx, bz, wx, wz, wl, gy);
      agent.timer = 0.5 + this.rand() * 2.0;
      const handle = spawnSimPondActor('common-frog', {scale: 0.95 + this.rand() * 0.25, groundOnFeet: true, castShadow: true});
      handle.group.position.set(bx, gy, bz);
      this.root.add(handle.group);
      this.amphibians.push({agent, handle});
    }

    // 2. Skeletal-animated Smooth Newts along Mirror Lake shallows & shaded brook banks
    const newtSpots: [number, number, number, number, number][] = [
      [lx - LAKE.rx * 1.04, lz + 2, lx - LAKE.rx * 0.74, lz + 2, LAKE.level],
      [lx + LAKE.rx * 1.02, lz + 4, lx + LAKE.rx * 0.72, lz + 4, LAKE.level],
      [riverCenter(-3) - 4.2, -3, riverCenter(-3) - 1.6, -3, riverLevel],
      [riverCenter(-15) + 4.0, -15, riverCenter(-15) + 1.4, -15, riverLevel],
    ];
    for (const [bx, bz, wx, wz, wl] of newtSpots) {
      const gy = inland(bx, bz);
      const agent = createAmphibianAgent('newt', bx, bz, wx, wz, wl, gy);
      agent.timer = 0.4 + this.rand() * 2.2;
      const handle = spawnSimPondActor('smooth-newt', {scale: 1.0 + this.rand() * 0.22, groundOnFeet: true, castShadow: false});
      handle.group.position.set(bx, gy, bz);
      this.root.add(handle.group);
      this.amphibians.push({agent, handle});
    }

    // 3. Water Striders & Whirligig Beetles skimming Mirror Lake & Harbor River
    const skaterSpecs: ['water-strider' | 'whirligig-beetle', number, number, number, number][] = [
      ['water-strider', lx - 6.5, lz - 4, 3.6, LAKE.level],
      ['water-strider', lx + 5.5, lz - 3, 3.6, LAKE.level],
      ['water-strider', lx - 2.0, lz + 6, 3.8, LAKE.level],
      ['whirligig-beetle', lx + 4.0, lz + 5, 3.2, LAKE.level],
      ['water-strider', riverCenter(1), 1, 2.2, riverLevel],
      ['whirligig-beetle', riverCenter(-8), -8, 2.2, riverLevel],
    ];
    for (const [kind, cx, cz, radius, wl] of skaterSpecs) {
      const agent: SkaterAgent = {
        kind, state: 'drift', x: cx, z: cz, vx: 0, vz: 0, yaw: this.rand() * Math.PI * 2,
        timer: 0.3 + this.rand() * 1.0, cx, cz, radius, waterLevel: wl,
      };
      const handle = spawnSimPondActor(kind, {scale: 1.15, groundOnFeet: false});
      handle.group.position.set(cx, wl + 0.02, cz);
      this.root.add(handle.group);
      this.skaters.push({agent, handle});
    }

    // 4. Emperor & Darter Dragonflies patrolling & hovering over Mirror Lake and Canal
    const dfSpecs: ['dragonfly-emperor' | 'dragonfly-darter', number, number, number, number][] = [
      ['dragonfly-emperor', lx - 7, lz - 3, 6.5, LAKE.level + 0.3],
      ['dragonfly-emperor', lx + 6, lz + 4, 6.5, LAKE.level + 0.3],
      ['dragonfly-darter', lx, lz + 10, 5.5, LAKE.level + 0.3],
      ['dragonfly-emperor', riverCenter(2), 2, 5.5, riverLevel + 0.35],
      ['dragonfly-darter', riverCenter(-11), -11, 5.0, riverLevel + 0.35],
    ];
    for (const [kind, cx, cz, radius, baseY] of dfSpecs) {
      const agent: DragonflyAgent = {
        kind, state: 'patrol', x: cx, y: baseY + 0.8, z: cz, yaw: this.rand() * Math.PI * 2,
        timer: 0.5 + this.rand() * 1.5, cx, cz, radius, baseY, tx: cx + 2, ty: baseY + 0.8, tz: cz + 1,
      };
      const handle = spawnSimPondActor(kind, {scale: 1.18, groundOnFeet: false});
      handle.group.position.set(cx, baseY + 0.8, cz);
      this.root.add(handle.group);
      this.dragonflies.push({agent, handle});
    }

    // 5. Shore Crabs & Hermit Crabs on sandy beaches + Signal Crayfish & Pond Snails by Mirror Lake
    const shoreSpecs: [ShoreCritterAgent['kind'], number, number, number, number, number][] = [
      ['shore-crab', 28.5, 6.0, 34.0, 6.0, 2.8],
      ['shore-crab', 28.8, 16.5, 34.5, 16.5, 2.8],
      ['shore-crab', 27.6, 25.0, 33.5, 25.0, 2.8],
      ['hermit-crab', 26.8, -5.0, 33.0, -5.0, 2.5],
      ['hermit-crab', 16.0, -28.5, 16.0, -34.5, 2.6],
      ['shore-crab', 6.5, -28.2, 6.5, -34.5, 2.6],
      ['crayfish-signal', lx - LAKE.rx * 0.92, lz - 2, lx - LAKE.rx * 0.55, lz - 2, 2.0],
      ['crayfish-signal', lx + LAKE.rx * 0.92, lz + 1, lx + LAKE.rx * 0.55, lz + 1, 2.0],
      ['pond-snail', lx - LAKE.rx * 1.06, lz + 6, lx - LAKE.rx * 0.85, lz + 6, 1.4],
      ['pond-snail', riverCenter(6) - 4.0, 6, riverCenter(6) - 2.2, 6, 1.4],
    ];
    for (const [kind, hx, hz, wx, wz, radius] of shoreSpecs) {
      const gy = Math.max(SEA_LEVEL - 0.12, inland(hx, hz));
      const agent: ShoreCritterAgent = {
        kind, state: 'forage', x: hx, y: gy, z: hz, yaw: this.rand() * Math.PI * 2,
        moveDirX: 1, moveDirZ: 0, timer: 0.6 + this.rand() * 1.8, homeX: hx, homeZ: hz, waterX: wx, waterZ: wz, radius,
      };
      const handle = spawnSimPondActor(kind, {scale: 1.05 + this.rand() * 0.2, groundOnFeet: true, castShadow: true});
      handle.group.position.set(hx, gy, hz);
      this.root.add(handle.group);
      this.shoreCritters.push({agent, handle});
    }
  }

  update(dt: number, slimePos: readonly [number, number, number] | null, slimeVel: readonly [number, number, number] | null, spread = 0) {
    const threat: ThreatSample | null = slimePos
      ? {x: slimePos[0], y: slimePos[1], z: slimePos[2], speed: slimeVel ? Math.hypot(slimeVel[0], slimeVel[2]) : 0, spread}
      : null;

    const withinRange = (x: number, z: number) => !threat || Math.hypot(x - threat.x, z - threat.z) < 62;

    for (const {agent, handle} of this.amphibians) {
      if (!withinRange(agent.x, agent.z)) continue;
      const {anim, timeScale} = stepAmphibianFsm(agent, dt, threat, inland, this.rand);
      handle.setAnim(anim, 0.22, timeScale);
      handle.update(dt);
      handle.group.position.set(agent.x, agent.y, agent.z);
      handle.group.rotation.y = stepAngle(handle.group.rotation.y, agent.yaw, Math.min(dt, 0.05) * 6.5);
      // Gentle throat/body breathing pulse during croak (slow & subtle, zero high-frequency jitter)
      const croakPulse = agent.state === 'croak' ? 1 + (0.5 - 0.5 * Math.cos(agent.timer * 5.2)) * 0.035 : 1;
      handle.group.scale.set(croakPulse, 1 + (croakPulse - 1) * 0.5, croakPulse);
    }

    for (const {agent, handle} of this.skaters) {
      if (!withinRange(agent.x, agent.z)) continue;
      const {swimFreq, swimAmp} = stepSkaterFsm(agent, dt, threat, this.rand);
      handle.update(dt, swimFreq, swimAmp);
      handle.group.position.set(agent.x, agent.waterLevel + 0.025, agent.z);
      handle.group.rotation.y = agent.yaw;
    }

    for (const {agent, handle} of this.dragonflies) {
      if (!withinRange(agent.x, agent.z)) continue;
      const {wingFreq, wingAmp} = stepDragonflyFsm(agent, dt, threat, this.rand);
      handle.update(dt, wingFreq, wingAmp);
      handle.group.position.set(agent.x, agent.y, agent.z);
      handle.group.rotation.y = agent.yaw;
      handle.group.rotation.x = agent.state === 'dart' ? 0.22 : agent.state === 'patrol' ? 0.08 : 0;
    }

    for (const {agent, handle} of this.shoreCritters) {
      if (!withinRange(agent.x, agent.z)) continue;
      const {scuttleFreq, scuttleAmp} = stepShoreCritterFsm(agent, dt, threat, (x, z) => Math.max(SEA_LEVEL - 0.14, inland(x, z)), this.rand);
      handle.update(dt, scuttleFreq, scuttleAmp);
      handle.group.position.set(agent.x, agent.y, agent.z);
      handle.group.rotation.y = agent.yaw;
    }
  }

  dispose() {
    for (const {handle} of this.amphibians) handle.dispose();
    for (const {handle} of this.skaters) handle.dispose();
    for (const {handle} of this.dragonflies) handle.dispose();
    for (const {handle} of this.shoreCritters) handle.dispose();
    this.root.removeFromParent();
  }
}
