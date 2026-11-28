import type {SkillDef} from './skills';
import type {ParticleSpawnOpts, SkillEffectCallbacks} from './skill-vfx';
import type {Vec} from './types';
import {
  DUST_PALETTE, StreamTube, VOID_PALETTE, crescentGeo, helixRibbonGeo, rockGeo, shardGeo, stoneBoxGeo, stoneFist,
  type Rgb, type VfxKit,
} from './vfx-kit';

/**
 * Skill bodies for Water, Wind, Fire, Dark and Physical, built from the same form language as their normal
 * attacks (see vfx-kit.ts) but each with a mechanic no other skill has:
 *
 *   Water    E 水牢泡  bubble shot that cages the target        R 回澜    rising ring wall pushed outward      Q 沧海穹  dome + geyser + downpour
 *   Wind     E 疾风步  helix slipstream dash                    R 龙卷    tape-wound tornado that pulls        Q 岚刃回旋 three saw blades fly out and return
 *   Fire     E 爆炎弹  lobbed blast with a mushroom cloud       R 龙息    sustained cone of flame              Q 熔火喷发 eruption that rains lava bombs
 *   Dark     E 影袭    ground rift that runs in and bites       R 蚀渊    black-hole field ringed with rifts   Q 千裂    seven cuts, a beat, then space shatters
 *   Physical E 崩岩拳  stone fist punching out of the ground    R 裂地脊  spine of spikes marching forward     Q 陨岳    falling crag, crater and upturned slabs
 *
 * Volt lives in skill-vfx.ts and is left as it was.
 */
export interface SkillHost {
  T: any;
  kit: VfxKit;
  root: any;
  now(): number;
  emit(o: ParticleSpawnOpts): void;
  burst(center: Vec, element: number, count: number, radius: number, speed: number, lift?: number, shape?: number): void;
  /** Timed effect. `update` receives normalised t, dt and age in seconds; it is not called before `delay` has passed. */
  fx(life: number, update: (t: number, dt: number, age: number) => void, dispose?: () => void, delay?: number): void;
  mesh(geo: any, mat: any, order?: number, parent?: any): any;
  /** Sustained elemental ground sigil; the caller parents and positions it. */
  rune(radius: number, element: number): any;
  /** Dark normal-blended ground pool; the caller parents and positions it. */
  shadow(radius: number, color: Rgb): any;
  shockRing(center: Vec, radius: number, element: number, life?: number): void;
  machRing(pos: Vec, forward: Vec, scale: number, life?: number): void;
}

const rand = Math.random;
const TAU = Math.PI * 2;
const sat = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number, p = 3) => 1 - Math.pow(1 - sat(x), p);
const easeIn = (x: number, p = 2) => Math.pow(sat(x), p);
const backOut = (x: number) => {
  const y = sat(x) - 1;
  return 1 + 2.70158 * y * y * y + 1.70158 * y * y;
};

const W_FOAM: Rgb = [1.2, 1.5, 1.6];
const W_MID: Rgb = [0.1, 0.55, 1.0];
const EMBER: Rgb = [2.4, 0.95, 0.16];
const CHAR: Rgb = [0.05, 0.02, 0.015];
const VOIDC: Rgb = [2.0, 0.55, 2.2];
const ABYSS: Rgb = [0.02, 0.006, 0.05];
const GOLD: Rgb = [2.2, 1.5, 0.4];
const SOIL: Rgb = [0.07, 0.05, 0.035];
const DUSTC: Rgb = [0.85, 0.76, 0.60];
const DUSTD: Rgb = [0.5, 0.45, 0.36];
/** Obsidian claws and shards for Dark: the stone shader repainted black with magenta veins. */
const OBSIDIAN = {shade: [0.02, 0.008, 0.05], base: [0.09, 0.035, 0.20], light: [0.40, 0.16, 0.70], glowColor: [2.2, 0.5, 2.0]} as const;
/** Basalt crust over live magma for Fire's lava bombs. */
const BASALT = {shade: [0.05, 0.02, 0.02], base: [0.16, 0.07, 0.05], light: [0.42, 0.20, 0.12], glowColor: [2.6, 1.1, 0.2]} as const;

function stage(h: SkillHost, at: Vec, yaw = 0) {
  const g = new h.T.Group();
  g.position.set(at[0], at[1], at[2]);
  g.rotation.y = yaw;
  h.root.add(g);
  return g;
}

function groundY(cb: SkillEffectCallbacks, x: number, z: number, fallback: number) {
  return cb.sampleTerrain(x, z) ?? fallback;
}

/** Ground decal. Ripples (0) and dust rings (4) sweep once; the others stamp in, hold and fade. */
function decal(h: SkillHost, mode: 0 | 1 | 2 | 3 | 4 | 5, at: Vec, radius: number, color: Rgb, dark: Rgb, life: number, delay = 0, o: {sx?: number; sz?: number; yaw?: number; lift?: number} = {}) {
  const mat = h.kit.ground(mode, color, dark);
  const m = h.mesh(h.kit.unit('disc'), mat, 22);
  m.position.set(at[0], at[1] + (o.lift ?? 0.06), at[2]);
  m.scale.set(radius * (o.sx ?? 1), 1, radius * (o.sz ?? 1));
  m.rotation.y = o.yaw ?? 0;
  m.visible = false;
  const sweep = mode === 0 || mode === 4;
  h.fx(life, t => {
    m.visible = true;
    mat.uniforms.uTime.value = h.now();
    mat.uniforms.uProgress.value = sweep ? t : mode === 5 ? t : easeOut(t / 0.3, 2);
    mat.uniforms.uFade.value = sweep ? 1 : mode === 5 ? Math.min(1, t / 0.1) * (1 - easeIn((t - 0.9) / 0.1)) : 1 - easeIn((t - 0.6) / 0.4, 1.5);
  }, () => h.kit.release(m), delay);
}

/** Eroding noise blob: fire by default, void-flame or dust when repainted. */
function blast(h: SkillHost, at: Vec, R: number, life: number, o: {palette?: readonly Rgb[]; hot?: number; rise?: number; alpha?: number; delay?: number; drift?: Vec} = {}) {
  const mat = h.kit.fire({displace: 0.55, freq: 1.5, rise: 1.4, hot: o.hot ?? 0.42, palette: o.palette, alpha: o.alpha});
  const m = h.mesh(h.kit.unit('blob'), mat, 25);
  m.rotation.set(rand() * 6, rand() * 6, rand() * 6);
  m.visible = false;
  h.fx(life, t => {
    m.visible = true;
    m.scale.setScalar(R * (0.30 + 0.70 * backOut(t / 0.22)) * (1 + 0.28 * t));
    m.position.set(at[0] + (o.drift?.[0] ?? 0) * t, at[1] + R * (o.rise ?? 0.4) * t, at[2] + (o.drift?.[2] ?? 0) * t);
    mat.uniforms.uTime.value = h.now();
    mat.uniforms.uProgress.value = easeIn((t - 0.15) / 0.85, 1.35);
  }, () => h.kit.release(m), o.delay ?? 0);
}

function dust(h: SkillHost, at: Vec, R: number, life = 0.6, delay = 0) {
  blast(h, at, R, life, {palette: DUST_PALETTE, hot: 0.30, rise: 0.7, alpha: 0.85, delay});
}

/** Ground-rooted flame pillar: a flipped cone whose mouth stays on the floor while the tip climbs. */
function pillar(h: SkillHost, at: Vec, rad: number, height: number, life: number, delay = 0, hot = 0.50) {
  const mat = h.kit.fire({displace: 0.34, freq: 2.0, rise: 4.0, hot, taper: -0.55, flowDir: [0, -1, 0]});
  const m = h.mesh(h.kit.unit('cone'), mat, 24);
  m.rotation.x = Math.PI;
  m.visible = false;
  h.fx(life, t => {
    m.visible = true;
    const grow = Math.max(0.05, easeOut(t / 0.25, 2.4));
    m.scale.set(rad * (0.7 + 0.3 * grow), height * grow, rad * (0.7 + 0.3 * grow));
    m.position.set(at[0], at[1] + height * grow, at[2]);
    m.rotation.y += 0.12;
    mat.uniforms.uTime.value = h.now();
    mat.uniforms.uProgress.value = easeIn((t - 0.4) / 0.6, 1.3);
  }, () => h.kit.release(m), delay);
}

/** Solid liquid beads thrown ballistically from a point. */
function beads(h: SkillHost, at: Vec, count: number, speed: number, up: number, life = 0.6) {
  const g = stage(h, at);
  const mat = h.kit.water({flow: 0, rep: 2, crest: 2});
  const drops: {m: any; vx: number; vy: number; vz: number; s: number}[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + rand() * 0.4;
    const k = speed * (0.55 + rand() * 0.6);
    drops.push({m: h.mesh(h.kit.unit('sphere'), mat, 26, g), vx: Math.cos(a) * k, vy: up * (0.6 + rand() * 0.7), vz: Math.sin(a) * k, s: 0.05 + rand() * 0.07});
  }
  h.fx(life, (t, dt) => {
    for (const d of drops) {
      d.vy -= 11 * dt;
      d.m.position.x += d.vx * dt;
      d.m.position.y += d.vy * dt;
      d.m.position.z += d.vz * dt;
      const s = d.s * (1 - easeIn((t - 0.55) / 0.45, 2));
      d.m.scale.set(s, s * (1 + Math.min(0.9, Math.abs(d.vy) * 0.12)), s);
    }
  }, () => h.kit.release(g));
}

/**
 * A tear in space on two crossed quads. Timing is relative to `life`: hairline drawn, torn open, held, sealed.
 * `yaw` turns the slit about the vertical, `roll` tilts it; `gape` scales how far it opens.
 */
function rift(h: SkillHost, at: Vec, len: number, roll: number, yaw: number, life: number, gape = 1, delay = 0) {
  const mat = h.kit.rift();
  const holder = stage(h, at);
  holder.rotation.order = 'YZX';
  holder.rotation.set(0, yaw, roll);
  const a = h.mesh(h.kit.unit('plane'), mat, 25, holder);
  a.scale.set(len, len * 0.5, 1);
  const b = h.mesh(h.kit.unit('plane'), mat, 25, holder);
  b.rotation.x = Math.PI * 0.5;
  b.scale.set(len, len * 0.5, 1);
  holder.visible = false;
  h.fx(life, t => {
    holder.visible = true;
    const u = mat.uniforms;
    u.uTime.value = h.now();
    u.uDraw.value = easeOut(t / 0.16, 2) * 1.04;
    u.uOpen.value = gape * (t < 0.16 ? 0 : t < 0.42 ? backOut((t - 0.16) / 0.26) : 1 - easeIn((t - 0.62) / 0.38, 2));
    u.uFade.value = t > 0.86 ? 1 - (t - 0.86) / 0.14 : 1;
  }, () => h.kit.release(holder), delay);
}

// ================================================================ WATER

/** E projectile body: a wobbling soap bubble around a core of water, orbited by three small bubbles. */
export function waterOrb(h: SkillHost) {
  const T = h.T;
  const group = new T.Group();
  const shellMat = h.kit.bubble();
  const shell = h.mesh(h.kit.unit('sphere'), shellMat, 25, group);
  shell.scale.setScalar(0.36);
  const coreMat = h.kit.water({flow: 2.5, rep: 2, crest: 2});
  const core = h.mesh(h.kit.unit('sphere'), coreMat, 24, group);
  core.scale.setScalar(0.19);
  const sats = new T.Group();
  for (let k = 0; k < 3; k++) {
    const s = h.mesh(h.kit.unit('sphere'), shellMat, 25, sats);
    const a = (k / 3) * TAU;
    s.position.set(Math.cos(a) * 0.44, (k - 1) * 0.11, Math.sin(a) * 0.44);
    s.scale.setScalar(0.085);
  }
  group.add(sats);
  const step = (dt: number, age: number) => {
    shellMat.uniforms.uTime.value = h.now();
    coreMat.uniforms.uTime.value = h.now();
    const w = 1 + Math.sin(age * 20) * 0.10;
    shell.scale.set(0.36 * w, 0.36 / Math.sqrt(w), 0.36 * w);
    sats.rotation.y += dt * 7.5;
    sats.rotation.z += dt * 3.8;
  };
  return {group, step};
}

/** E impact: the bubble swells into a water prison laced with two racing currents, then bursts into a crown. */
export function waterPrison(h: SkillHost, pos: Vec, floorY: number, def: SkillDef) {
  const T = h.T;
  const R = Math.min(1.35, def.radius * 0.8);
  const center: Vec = [pos[0], Math.max(pos[1], floorY + R * 0.75), pos[2]];
  const g = stage(h, center);
  const shellMat = h.kit.bubble();
  const shell = h.mesh(h.kit.unit('sphere'), shellMat, 25, g);
  const loops = [0, 1].map(k => {
    const tube = new StreamTube(T, 30, 7);
    const mat = h.kit.water({flow: 9, rep: 8});
    const mesh = h.mesh(tube.geo, mat, 24, g);
    return {tube, mat, mesh, tilt: k === 0 ? 0.55 : -0.7, dir: k === 0 ? 1 : -1};
  });
  const hold = 0.55;
  let popped = false;
  h.fx(0.72, (_t, _dt, age) => {
    shellMat.uniforms.uTime.value = h.now();
    if (age < hold) {
      shell.scale.setScalar(R * backOut(age / 0.16) * (1 + Math.sin(age * 26) * 0.03));
      const girth = Math.min(1, age / 0.12);
      for (const l of loops) {
        l.mat.uniforms.uTime.value = h.now();
        const spin = age * 10 * l.dir;
        l.tube.update(0, 1, (s, o) => {
          const a = s * TAU * 0.82 + spin;
          const r = R * 0.70;
          o[0] = Math.cos(a) * r;
          o[1] = Math.sin(a) * r * Math.sin(l.tilt);
          o[2] = Math.sin(a) * r * Math.cos(l.tilt);
        }, u => 0.085 * girth * Math.sqrt(Math.max(0, Math.sin(Math.min(1, u * 1.05) * Math.PI))) * (0.5 + 0.7 * u));
      }
    } else {
      const p = (age - hold) / 0.17;
      shell.scale.setScalar(R * (1 + p * 0.5));
      shellMat.uniforms.uAlpha.value = Math.max(0, 1 - p);
      for (const l of loops) l.mesh.visible = false;
      if (!popped) {
        popped = true;
        beads(h, center, 14, 3.6, 4.6);
        decal(h, 0, [center[0], floorY, center[2]], def.radius * 1.2, W_FOAM, W_MID, 0.6);
        h.burst(center, 0, 56, 0.4, 4.6, 2.2);
      }
    }
  }, () => h.kit.release(g));
}

/** R 回澜: a standing ring of water with a curling lip rolls outward from the caster and shoves everything back. */
export function waterRing(h: SkillHost, origin: Vec, def: SkillDef, cb: SkillEffectCallbacks) {
  const T = h.T;
  const R = def.radius;
  const g = stage(h, origin);
  const lip = [[1.0, 0], [1.02, 0.35], [1.05, 0.7], [1.065, 0.95], [1.03, 1.08], [0.985, 1.0]].map(p => new T.Vector2(p[0], p[1]));
  const wallGeo = new T.LatheGeometry(lip, 64);
  const mat1 = h.kit.water({mode: 1, flow: 3.2, rep: 16, crest: 0.70});
  const wall = h.mesh(wallGeo, mat1, 25, g);
  const mat2 = h.kit.water({mode: 1, flow: 4.5, rep: 11, crest: 0.62});
  const inner = h.mesh(wallGeo, mat2, 24, g);
  decal(h, 0, origin, R * 1.3, W_FOAM, W_MID, 0.7);
  let hit = false, acc = 0;
  h.fx(0.68, (t, dt) => {
    const r1 = 0.5 + (R - 0.5) * easeOut(t, 2.2);
    const h1 = 1.35 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.6);
    wall.scale.set(r1, Math.max(0.02, h1), r1);
    const t2 = Math.max(0, t - 0.14) / 0.86;
    const r2 = 0.4 + (R * 0.8 - 0.4) * easeOut(t2, 2.0);
    inner.scale.set(r2, Math.max(0.02, 0.75 * Math.pow(Math.sin(Math.PI * Math.min(1, t2 * 1.15)), 0.6)), r2);
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    mat1.uniforms.uTime.value = h.now();
    mat1.uniforms.uAlpha.value = fade;
    mat2.uniforms.uTime.value = h.now();
    mat2.uniforms.uAlpha.value = fade;
    acc += dt * 240 * (1 - t);
    while (acc >= 1) {
      acc -= 1;
      const a = rand() * TAU;
      h.emit({
        x: origin[0] + Math.cos(a) * r1 * 1.05, y: origin[1] + h1 * (0.6 + rand() * 0.5), z: origin[2] + Math.sin(a) * r1 * 1.05,
        vx: Math.cos(a) * (2.4 + rand() * 2.4), vy: 1.4 + rand() * 2.6, vz: Math.sin(a) * (2.4 + rand() * 2.4),
        life: 0.4 + rand() * 0.4, size: 0.06 + rand() * 0.11, element: 0, shape: rand() < 0.3 ? 2 : 5, drag: 1.2, ay: -9.5, intensity: 1.2,
      });
    }
    if (!hit && t >= 0.16) {
      hit = true;
      cb.onSpawnBurst(origin, def.element, 24, 4.0);
      cb.onSkillHitArea(origin, def, false);
    }
  }, () => h.kit.release(g));
}

/** Q 沧海穹: a water dome closes over the area, a geyser strikes its ceiling and comes back down as a cloudburst. */
export function waterDome(h: SkillHost, origin: Vec, def: SkillDef, cb: SkillEffectCallbacks) {
  const T = h.T;
  const R = def.radius;
  const g = stage(h, [origin[0], origin[1] + 0.04, origin[2]]);
  const domeMat = h.kit.bubble();
  const dome = h.mesh(new T.SphereGeometry(1, 36, 20, 0, TAU, 0, Math.PI * 0.52), domeMat, 24, g);
  const pool = h.rune(R * 1.06, 0);
  pool.position.y = 0.04;
  g.add(pool);
  const geyser = new StreamTube(T, 20, 10);
  const geyserMat = h.kit.water({flow: 9, rep: 3});
  h.mesh(geyser.geo, geyserMat, 25, g);
  const top = R * 0.72 * 0.97;
  let burst = false, rainAcc = 0, bubbleAcc = 0, puddles = 0;
  h.fx(1.3, (t, dt, age) => {
    const expand = easeOut(t / 0.28, 2);
    const curR = 0.45 + (R - 0.45) * expand;
    dome.scale.set(curR, curR * 0.72, curR);
    const fade = t < 0.74 ? 1 : (1 - t) / 0.26;
    domeMat.uniforms.uAlpha.value = fade;
    domeMat.uniforms.uTime.value = h.now();
    pool.material.uniforms.uProgress.value = fade * 0.9;
    pool.material.uniforms.uTime.value = h.now();

    const head = Math.max(0.03, easeOut(t / 0.30, 2.2));
    const tail = Math.min(head - 0.02, easeIn((t - 0.40) / 0.3, 1.5));
    const girth = Math.min(1, (head - tail) / 0.25);
    geyserMat.uniforms.uTime.value = h.now();
    geyser.update(Math.max(0, tail), head, (s, o) => { o[0] = Math.sin(s * 5 + age * 8) * 0.05; o[1] = 0.02 + s * top; o[2] = Math.cos(s * 4 + age * 7) * 0.05; },
      u => 0.34 * (1 - 0.45 * u) * girth * Math.sqrt(Math.min(1, u / 0.08)) * (1 + 0.9 * Math.exp(-(((u - 0.92) / 0.08) ** 2))) * (u > 0.96 ? Math.sqrt(Math.max(0, 1 - ((u - 0.96) / 0.04) ** 2)) : 1));

    if (t < 0.30) {
      bubbleAcc += dt * 90;
      while (bubbleAcc >= 1) {
        bubbleAcc -= 1;
        const a = rand() * TAU, d = Math.sqrt(rand()) * curR * 0.9;
        h.emit({x: origin[0] + Math.cos(a) * d, y: origin[1] + 0.1, z: origin[2] + Math.sin(a) * d, vx: 0, vy: 1.4 + rand() * 2.2, vz: 0, life: 0.5 + rand() * 0.4, size: 0.07 + rand() * 0.12, element: 0, shape: 2, drag: 1.5, ay: 0.9, intensity: 1.15});
      }
    } else if (t < 0.86) {
      // The downpour: drops are born on the dome's inner ceiling and fall straight down.
      rainAcc += dt * 190;
      while (rainAcc >= 1) {
        rainAcc -= 1;
        const a = rand() * TAU, d = Math.sqrt(rand()) * R * 0.92;
        const ceil = Math.sqrt(Math.max(0.02, 1 - (d / R) ** 2)) * R * 0.72;
        h.emit({x: origin[0] + Math.cos(a) * d, y: origin[1] + ceil, z: origin[2] + Math.sin(a) * d, vx: 0, vy: -(5 + rand() * 4), vz: 0, life: Math.min(0.6, ceil / 7 + 0.08), size: 0.06 + rand() * 0.09, element: 0, shape: 5, drag: 0.2, ay: -9, intensity: 1.3});
      }
      if (puddles < 8 && t > 0.34 + puddles * 0.055) {
        puddles++;
        const a = rand() * TAU, d = (0.25 + rand() * 0.65) * R;
        decal(h, 0, [origin[0] + Math.cos(a) * d, origin[1], origin[2] + Math.sin(a) * d], 0.75, W_FOAM, W_MID, 0.45);
      }
    }
    if (!burst && t >= 0.30) {
      burst = true;
      h.shockRing(origin, R * 1.28, 0, 0.52);
      beads(h, [origin[0], origin[1] + top, origin[2]], 16, 4.2, 1.5, 0.7);
      h.burst(origin, 0, 100, R * 0.42, 5.4, 2.6, 2);
      cb.onSpawnBurst(origin, def.element, 30, 4.5);
      cb.onSkillHitArea(origin, def, true);
    }
  }, () => h.kit.release(g));
}

// ================================================================ WIND

/** Free-flying hairline crescent used by dash exits. */
function gust(h: SkillHost, at: Vec, yaw: number, roll: number, reach: number, size: number, life = 0.34, delay = 0) {
  const T = h.T;
  const g = stage(h, at, yaw);
  const holder = new T.Group();
  holder.rotation.z = roll;
  g.add(holder);
  const mat = h.kit.wind({lines: 3, flow: 5.5, body: 0.2});
  const m = h.mesh(crescentGeo(T, size, size * 0.38, 2.5, 28, size * 0.05), mat, 26, holder);
  m.rotation.x = -0.42;
  g.visible = false;
  h.fx(life, t => {
    g.visible = true;
    const fly = easeOut(t, 2.2);
    holder.position.z = reach * fly;
    m.scale.setScalar(0.78 + 0.5 * fly);
    mat.uniforms.uTime.value = h.now();
    mat.uniforms.uAlpha.value = Math.pow(1 - t, 1.2) * Math.min(1, t / 0.08);
  }, () => h.kit.release(g), delay);
}

/** E 疾风步: three streamlines twist tight around the dash line and converge on the exit point. */
export function windDash(h: SkillHost, start: Vec, end: Vec) {
  const T = h.T;
  const dx = end[0] - start[0], dz = end[2] - start[2];
  const len = Math.max(0.8, Math.hypot(dx, dz));
  const yaw = Math.atan2(dx, dz);
  const fwd: Vec = [dx / len, 0, dz / len];
  const g = stage(h, [start[0], start[1] + 0.42, start[2]], yaw);
  const spin = new T.Group();
  g.add(spin);
  const mats: any[] = [];
  for (let k = 0; k < 3; k++) {
    const mat = h.kit.wind({lines: 2, flow: 7.5, body: 0.3});
    mats.push(mat);
    h.mesh(helixRibbonGeo(T, {turns: 1.4, height: len, r0: 0.50, r1: 0.12, width: 0.25, phase: k * TAU / 3, segs: 40}).rotateX(Math.PI / 2), mat, 25, spin);
  }
  const coreMat = h.kit.flash([1.2, 1.9, 1.5], 1, 0.4);
  h.mesh(new T.BoxGeometry(0.035, 0.035, len).translate(0, 0, len / 2), coreMat, 26, g);
  h.machRing([start[0] + dx * 0.25, start[1] + 0.42, start[2] + dz * 0.25], fwd, 1.0, 0.26);
  h.machRing([start[0] + dx * 0.7, start[1] + 0.42, start[2] + dz * 0.7], fwd, 1.25, 0.32);
  gust(h, [end[0], end[1] + 0.42, end[2]], yaw, 0.62, 1.3, 0.9, 0.3, 0.05);
  gust(h, [end[0], end[1] + 0.42, end[2]], yaw, -0.62, 1.3, 0.9, 0.3, 0.08);

  const rx = -fwd[2], rz = fwd[0];
  for (let i = 0; i < 64; i++) {
    const f = rand(), side = (rand() - 0.5) * 0.55;
    h.emit({
      x: start[0] + dx * f + rx * side, y: start[1] + 0.16 + rand() * 0.52, z: start[2] + dz * f + rz * side,
      vx: -fwd[0] * (2.2 + rand() * 3.6) + rx * side * 2.8, vy: 0.5 + rand() * 1.8, vz: -fwd[2] * (2.2 + rand() * 3.6) + rz * side * 2.8,
      life: 0.3 + rand() * 0.36, size: 0.05 + rand() * 0.075, element: 1, shape: i % 3 === 0 ? 1 : 6, drag: 2.6, ay: 1.2,
      swirl: (rand() < 0.5 ? -1 : 1) * 7.5, spin: 15, ax: end[0], az: end[2], intensity: 1.15,
    });
  }
  h.burst(end, 1, 44, 0.55, 4.0);
  h.fx(0.5, (t, dt) => {
    spin.rotation.z += dt * 18;
    spin.scale.set(1 + 0.6 * t, 1 + 0.6 * t, 1);
    for (const mat of mats) {
      mat.uniforms.uTime.value = h.now();
      // Holds at full strength for the first third: the dash itself is over in a blink, the slipstream is what is seen.
      mat.uniforms.uAlpha.value = Math.min(1, (1 - t) * 1.5);
    }
    coreMat.uniforms.uAlpha.value = Math.pow(1 - t, 2.5);
  }, () => h.kit.release(g));
}

/** R 龙卷: a tornado wound from air tapes — five wide outer bands and three tight counter-turning inner ones. */
export function windTornado(h: SkillHost, origin: Vec, def: SkillDef, cb: SkillEffectCallbacks) {
  const T = h.T;
  const R = def.radius;
  const g = stage(h, [origin[0], origin[1] + 0.06, origin[2]]);
  const disc = h.rune(R * 0.98, 1);
  g.add(disc);
  const outer = new T.Group(), inner = new T.Group();
  g.add(outer, inner);
  const outerMats: any[] = [], innerMats: any[] = [];
  for (let k = 0; k < 5; k++) {
    const mat = h.kit.wind({lines: 3, flow: 5, body: 0.16});
    outerMats.push(mat);
    h.mesh(helixRibbonGeo(T, {turns: 1.5, height: 3.4, r0: 0.32, r1: R * 0.5, width: 0.44, flare: 1.7, phase: k * TAU / 5}), mat, 25, outer);
  }
  for (let k = 0; k < 3; k++) {
    const mat = h.kit.wind({lines: 2, flow: 8, body: 0.3, main: [0.6, 1.5, 1.05]});
    innerMats.push(mat);
    h.mesh(helixRibbonGeo(T, {turns: 2.2, height: 2.7, r0: 0.14, r1: R * 0.22, width: 0.26, flare: 1.3, phase: k * TAU / 3}), mat, 26, inner);
  }
  const total = def.multiHits ?? 3;
  let hits = 0, acc = 0;
  h.fx(def.duration ?? 1.4, (t, dt, age) => {
    const fade = t > 0.76 ? (1 - t) / 0.24 : Math.min(1, t / 0.12);
    disc.material.uniforms.uProgress.value = fade * 0.9;
    disc.material.uniforms.uTime.value = h.now() * 2.2;
    outer.rotation.y -= dt * 8.5;
    inner.rotation.y += dt * 13;
    const grow = easeOut(t / 0.18, 2);
    outer.scale.set(0.6 + 0.4 * grow, grow, 0.6 + 0.4 * grow);
    inner.scale.set(1, grow, 1);
    g.rotation.z = Math.sin(age * 5) * 0.05;
    g.rotation.x = Math.cos(age * 4.2) * 0.04;
    for (const m of outerMats) { m.uniforms.uTime.value = h.now(); m.uniforms.uAlpha.value = fade * 0.9; }
    for (const m of innerMats) { m.uniforms.uTime.value = h.now(); m.uniforms.uAlpha.value = fade; }
    acc += dt * 230;
    while (acc >= 1 && t < 0.88) {
      acc -= 1;
      const a = rand() * TAU, r = 0.28 + rand() * R * 0.55, tan = 4.6 + rand() * 2.8;
      h.emit({
        x: origin[0] + Math.cos(a) * r, y: origin[1] + 0.08 + rand() * 0.35, z: origin[2] + Math.sin(a) * r,
        vx: -Math.sin(a) * tan + Math.cos(a) * 0.65, vy: 2.3 + rand() * 2.5, vz: Math.cos(a) * tan + Math.sin(a) * 0.65,
        life: 0.46 + rand() * 0.4, size: 0.05 + rand() * 0.095, element: 1, shape: rand() < 0.68 ? 6 : 1, drag: 1.4, ay: 1.8,
        swirl: 9, pull: 1.1, ax: origin[0], az: origin[2], spin: 16, intensity: 1.18,
      });
    }
    if (hits < Math.min(total, Math.floor(t * total) + 1)) {
      hits++;
      h.shockRing(origin, R * 1.08, 1, 0.34);
      cb.onSpawnBurst(origin, def.element, 12, 3.0);
      cb.onSkillHitArea(origin, def, false);
    }
  }, () => h.kit.release(g));
}

/** Q 岚刃回旋: three spinning double-crescent saws fan out, hang at full reach, then curve back to the caster. */
export function windBoomerang(h: SkillHost, origin: Vec, fwd: Vec, def: SkillDef, cb: SkillEffectCallbacks) {
  const T = h.T;
  // Fifteen cuts in all, but the fan spreads them out: a single target is usually clipped three or four times.
  const perHit = {...def, damage: Math.round(def.damage * 0.26)};
  h.machRing([origin[0] + fwd[0] * 0.4, origin[1] + 0.45, origin[2] + fwd[2] * 0.4], fwd, 1.5, 0.3);
  h.burst([origin[0] + fwd[0] * 0.5, origin[1], origin[2] + fwd[2] * 0.5], 1, 40, 0.4, 4.5);
  for (const k of [-1, 0, 1]) {
    const ang = k * 0.45;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const dir: Vec = [fwd[0] * ca + fwd[2] * sa, 0, -fwd[0] * sa + fwd[2] * ca];
    const side: Vec = [-dir[2], 0, dir[0]];
    let reach = def.range;
    const far: Vec = [origin[0] + dir[0] * reach, origin[1] + 0.5, origin[2] + dir[2] * reach];
    const wall = cb.castWall?.([origin[0], origin[1] + 0.5, origin[2]], far);
    if (wall) reach = Math.max(1, Math.hypot(wall[0] - origin[0], wall[2] - origin[2]) - 0.5);

    // Banked like thrown chakrams (the middle one leans back toward the caster), so the spinning face is
    // visible from behind and from the side instead of collapsing to a flat line.
    const holder = stage(h, [origin[0], origin[1] + 0.5, origin[2]]);
    holder.rotation.order = 'YXZ';
    holder.rotation.set(k === 0 ? -0.8 : -0.3, Math.atan2(dir[0], dir[2]), k * 0.85);
    const spinner = new T.Group();
    holder.add(spinner);
    const mat = h.kit.wind({lines: 4, flow: 8, body: 0.36, main: [0.42, 1.45, 0.95]});
    const geo = crescentGeo(T, 1.4, 0.52, 2.9, 32, 0.1);
    h.mesh(geo, mat, 26, spinner);
    h.mesh(geo, mat, 26, spinner).rotation.y = Math.PI;
    const hubMat = h.kit.flash([1.3, 2.0, 1.6], 1, 1.6);
    h.mesh(h.kit.unit('sphere'), hubMat, 27, spinner).scale.setScalar(0.2);

    const marks = [0.14, 0.28, 0.40, 0.72, 0.86];
    let next = 0, acc = 0, y = origin[1] + 0.5;
    h.fx(1.3, (t, dt) => {
      let px: number, pz: number, lift = 0;
      if (t < 0.5) {
        const s = easeOut(t / 0.40, 2.2);
        px = origin[0] + dir[0] * reach * s;
        pz = origin[2] + dir[2] * reach * s;
      } else {
        const s = easeIn((t - 0.5) / 0.46, 1.8);
        const arc = Math.sin(Math.PI * s);
        px = origin[0] + dir[0] * reach * (1 - s) + side[0] * arc * 1.7 * k;
        pz = origin[2] + dir[2] * reach * (1 - s) + side[2] * arc * 1.7 * k;
        if (k === 0) lift = arc * 0.9;
      }
      const ground = cb.sampleTerrain(px, pz);
      if (ground !== null) y += (ground + 1.15 - y) * Math.min(1, dt * 10);
      holder.position.set(px, y + lift, pz);
      spinner.rotation.y += dt * 26;
      spinner.scale.setScalar(Math.min(1, 0.35 + t * 7) * (1 - easeIn((t - 0.94) / 0.06)));
      mat.uniforms.uTime.value = h.now();
      mat.uniforms.uAlpha.value = t > 0.92 ? (1 - t) / 0.08 : 1;
      hubMat.uniforms.uAlpha.value = mat.uniforms.uAlpha.value;
      acc += dt * 70;
      while (acc >= 1) {
        acc -= 1;
        const a = rand() * TAU;
        h.emit({
          x: px + Math.cos(a) * 0.9, y: y + lift + (rand() - 0.5) * 0.2, z: pz + Math.sin(a) * 0.9,
          vx: -Math.sin(a) * 5, vy: 0.4 + rand(), vz: Math.cos(a) * 5, life: 0.25 + rand() * 0.25, size: 0.05 + rand() * 0.08,
          element: 1, shape: rand() < 0.7 ? 6 : 1, drag: 2.4, ay: 0.8, swirl: 8, ax: px, az: pz, spin: 16, intensity: 1.2,
        });
      }
      while (next < marks.length && t >= marks[next]) {
        next++;
        const p: Vec = [px, ground ?? origin[1], pz];
        cb.onSpawnBurst(p, def.element, 8, 2.2);
        cb.onSkillHitArea(p, perHit, false);
      }
    }, () => h.kit.release(holder));
  }
}

// ================================================================ FIRE

/** E projectile body: a rolling fire blob dragging a flame tail that tapers to a point behind it. */
export function fireball(h: SkillHost) {
  const T = h.T;
  const group = new T.Group();
  const ballMat = h.kit.fire({displace: 0.5, freq: 1.8, rise: 2.5, hot: 0.62});
  const ball = h.mesh(h.kit.unit('blob'), ballMat, 25, group);
  ball.scale.setScalar(0.3);
  const tailMat = h.kit.fire({displace: 0.3, freq: 2.2, rise: 5, hot: 0.5, taper: -0.6, flowDir: [0, -1, 0]});
  const tail = h.mesh(h.kit.unit('cone'), tailMat, 24, group);
  tail.rotation.x = Math.PI * 0.5;
  tail.position.z = -1.15;
  tail.scale.set(0.34, 1.15, 0.34);
  const step = (dt: number) => {
    ballMat.uniforms.uTime.value = h.now();
    tailMat.uniforms.uTime.value = h.now();
    ball.rotation.x += dt * 6.5;
    ball.rotation.z += dt * 4.8;
  };
  return {group, step};
}

/** E impact: a main detonation, satellite bursts, a rising mushroom cap of smoke and a scorch mark. */
export function fireExplosion(h: SkillHost, pos: Vec, floorY: number, def: SkillDef) {
  const R = def.radius;
  const flashMat = h.kit.flash([2.6, 2.0, 1.0], 1, 1.4);
  const flash = h.mesh(h.kit.unit('sphere'), flashMat, 27);
  flash.position.set(pos[0], pos[1], pos[2]);
  h.fx(0.16, t => {
    flash.scale.setScalar(R * (0.3 + 0.9 * easeOut(t, 2)));
    flashMat.uniforms.uAlpha.value = 1 - t;
  }, () => h.kit.release(flash));
  blast(h, pos, R * 0.8, 0.62, {hot: 0.5});
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1 + rand();
    blast(h, [pos[0] + Math.cos(a) * R * 0.5, pos[1] + 0.1, pos[2] + Math.sin(a) * R * 0.5], R * 0.42, 0.5, {delay: 0.04 + k * 0.03});
  }
  // Mushroom: a column of smoke punches up and a cap rolls out on top of it.
  blast(h, [pos[0], pos[1] + R * 0.35, pos[2]], R * 0.42, 0.9, {hot: 0.16, rise: 3.2, delay: 0.10, alpha: 0.9});
  blast(h, [pos[0], pos[1] + R * 0.9, pos[2]], R * 0.62, 0.95, {hot: 0.10, rise: 1.6, delay: 0.20, alpha: 0.9});
  decal(h, 1, [pos[0], floorY, pos[2]], R * 1.1, EMBER, CHAR, 1.6);
  h.burst(pos, 2, 80, 0.5, 5.2, 2.2);
}

/** R 龙息: a cone of fire held on the enemy; everything inside it burns on every tick. */
export function fireBreath(h: SkillHost, origin: Vec, fwd: Vec, def: SkillDef, cb: SkillEffectCallbacks) {
  const T = h.T;
  const len = def.range, rad = def.radius;
  const dur = def.duration ?? 0.7, ticks = def.multiHits ?? 4;
  const mouth: Vec = [origin[0] + fwd[0] * 0.35, origin[1] + 0.4, origin[2] + fwd[2] * 0.35];
  const aim = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(fwd[0], 0.03, fwd[2]).normalize());
  const outerMat = h.kit.fire({displace: 0.26, freq: 2.6, rise: 5.5, hot: 0.50, taper: 0.5});
  const outer = h.mesh(h.kit.unit('cone'), outerMat, 24);
  const innerMat = h.kit.fire({displace: 0.20, freq: 3.0, rise: 7.5, hot: 0.74, taper: 0.62});
  const inner = h.mesh(h.kit.unit('cone'), innerMat, 25);
  for (const m of [outer, inner]) {
    m.position.set(mouth[0], mouth[1], mouth[2]);
    m.quaternion.copy(aim);
  }
  const mid: Vec = [origin[0] + fwd[0] * len * 0.55, groundY(cb, origin[0] + fwd[0] * len * 0.55, origin[2] + fwd[2] * len * 0.55, origin[1]), origin[2] + fwd[2] * len * 0.55];
  decal(h, 1, mid, 1, EMBER, CHAR, dur + 1.1, 0.12, {sx: rad * 0.85, sz: len * 0.5, yaw: Math.atan2(fwd[0], fwd[2])});
  const per = {...def, radius: 0.35, damage: Math.max(1, Math.round(def.damage / ticks * 1.25))};
  const total = dur + 0.22;
  const rx = -fwd[2], rz = fwd[0];
  let fired = 0, acc = 0;
  h.fx(total, (_t, dt, age) => {
    const grow = easeOut(age / 0.16, 2);
    const end = sat((age - dur) / 0.22);
    const flick = 1 + 0.06 * Math.sin(age * 40);
    outer.scale.set(rad * (0.75 + 0.25 * grow) * flick, len * grow, rad * (0.75 + 0.25 * grow) * flick);
    inner.scale.set(rad * 0.5, len * 0.82 * grow, rad * 0.5);
    outerMat.uniforms.uTime.value = h.now();
    outerMat.uniforms.uProgress.value = 0.05 + 0.95 * easeIn(end, 1.2);
    innerMat.uniforms.uTime.value = h.now();
    innerMat.uniforms.uProgress.value = 0.05 + 0.95 * easeIn(end, 1.2);
    if (age < dur) {
      acc += dt * 170;
      while (acc >= 1) {
        acc -= 1;
        const d = rand() * len * 0.3, sp = 7 + rand() * 5, sw = (rand() - 0.5) * 2 * rad / len * sp * 1.1;
        h.emit({
          x: mouth[0] + fwd[0] * d, y: mouth[1] + (rand() - 0.5) * 0.2, z: mouth[2] + fwd[2] * d,
          vx: fwd[0] * sp + rx * sw, vy: (rand() - 0.35) * 2.2, vz: fwd[2] * sp + rz * sw,
          life: 0.35 + rand() * 0.3, size: 0.06 + rand() * 0.11, element: 2, shape: rand() < 0.25 ? 1 : 7, drag: 1.3, ay: 2.6, intensity: 1.35,
        });
      }
    }
    while (fired < ticks && age >= dur * (0.12 + 0.76 * fired / Math.max(1, ticks - 1))) {
      let any = false;
      for (const tp of cb.getTargetPositions()) {
        const tx = tp[0] - origin[0], tz = tp[2] - origin[2];
        const along = tx * fwd[0] + tz * fwd[2], lateral = Math.abs(tx * fwd[2] - tz * fwd[0]);
        if (along < 0.2 || along > len + 0.5 || lateral > 0.55 + rad * along / len || cb.blocked?.(origin, tp)) continue;
        any = true;
        cb.onSkillHitArea([...tp], per, false);
      }
      // With nobody in the cone the first tick still scorches the ground so crops and props react.
      if (!any && fired === 0) {
        for (const f of [0.35, 0.75]) {
          const px = origin[0] + fwd[0] * len * f, pz = origin[2] + fwd[2] * len * f;
          cb.onSkillHitArea([px, groundY(cb, px, pz, origin[1]), pz], {...per, radius: rad * (0.4 + 0.5 * f)}, false);
        }
      }
      fired++;
    }
  }, () => { h.kit.release(outer); h.kit.release(inner); });
  cb.onSpawnBurst(mouth, def.element, 14, 2.6);
}

/** Q 熔火喷发: the ground under the caster splits, a lava column goes up and six lava bombs come down around it. */
export function fireEruption(h: SkillHost, center: Vec, def: SkillDef, cb: SkillEffectCallbacks) {
  const T = h.T;
  const R = def.radius;
  const bombs = def.multiHits ?? 6;
  const life = def.duration ?? 1.5;
  const g = stage(h, center);
  const scorch = h.shadow(R * 1.02, [0.14, 0.025, 0.01]);
  scorch.position.y = 0.055;
  const rune = h.rune(R * 1.06, 2);
  rune.position.y = 0.08;
  g.add(scorch, rune);
  let erupted = false, acc = 0;
  h.fx(life, (t, dt) => {
    const fade = t > 0.8 ? (1 - t) / 0.2 : Math.min(1, t / 0.08);
    rune.material.uniforms.uProgress.value = fade * 0.94;
    rune.material.uniforms.uTime.value = h.now() * 1.4;
    scorch.material.uniforms.uAlpha.value = fade * 0.82;
    scorch.material.uniforms.uTime.value = h.now();
    acc += dt * 95;
    while (acc >= 1 && t < 0.85) {
      acc -= 1;
      const a = rand() * TAU, r = Math.sqrt(rand()) * R * 0.95;
      h.emit({x: center[0] + Math.cos(a) * r, y: center[1] + 0.08, z: center[2] + Math.sin(a) * r, vx: -Math.sin(a) * 1.1, vy: 2.2 + rand() * 3, vz: Math.cos(a) * 1.1, life: 0.45 + rand() * 0.48, size: 0.05 + rand() * 0.09, element: 2, shape: rand() < 0.25 ? 1 : 7, drag: 1.5, ay: 3.2, swirl: 2.5, ax: center[0], az: center[2], intensity: 1.3});
    }
    if (!erupted && t * life >= 0.12) {
      erupted = true;
      pillar(h, center, 1.15, 5.4, 0.95, 0, 0.52);
      pillar(h, center, 0.6, 6.4, 0.85, 0.03, 0.74);
      blast(h, [center[0], center[1] + 0.7, center[2]], 1.5, 0.7, {hot: 0.5});
      h.shockRing(center, R * 0.9, 2, 0.5);
      h.burst(center, 2, 110, 0.6, 6.4, 3.4);
      cb.onSpawnBurst(center, def.element, 30, 4.6);
      cb.onSkillHitArea(center, {...def, radius: R * 0.5, damage: Math.round(def.damage * 0.55)}, true);
    }
  }, () => h.kit.release(g));

  const bombDef = {...def, radius: R * 0.42, damage: Math.round(def.damage * 0.3)};
  for (let k = 0; k < bombs; k++) {
    const a = (k / bombs) * TAU + 0.5 + (rand() - 0.5) * 0.4;
    const d = R * (0.52 + rand() * 0.34);
    const lx = center[0] + Math.cos(a) * d, lz = center[2] + Math.sin(a) * d;
    const land: Vec = [lx, groundY(cb, lx, lz, center[1]), lz];
    const flight = 0.72 + rand() * 0.22;
    const apex = 4.2 + rand() * 1.4;
    const bg = stage(h, [center[0], center[1] + 1, center[2]]);
    const rockMat = h.kit.rock({...BASALT, glow: 1.0, vein: 3.2});
    const rock = h.mesh(rockGeo(T, 0.24, 50 + k), rockMat, 20, bg);
    const haloMat = h.kit.fire({displace: 0.5, freq: 2.2, rise: 3, hot: 0.55});
    const halo = h.mesh(h.kit.unit('blob'), haloMat, 25, bg);
    halo.scale.setScalar(0.34);
    bg.visible = false;
    let tAcc = 0, landed = false;
    h.fx(flight + 0.02, (t, dt) => {
      bg.visible = true;
      const u = Math.min(1, t * (flight + 0.02) / flight);
      const px = center[0] + (land[0] - center[0]) * u, pz = center[2] + (land[2] - center[2]) * u;
      const py = center[1] + 1 + (land[1] - center[1] - 1) * u + apex * 4 * u * (1 - u);
      bg.position.set(px, py, pz);
      rock.rotation.x += dt * 9;
      rock.rotation.z += dt * 6;
      haloMat.uniforms.uTime.value = h.now();
      haloMat.uniforms.uProgress.value = 0.25;
      tAcc += dt * 90;
      while (tAcc >= 1) {
        tAcc -= 1;
        h.emit({x: px + (rand() - 0.5) * 0.2, y: py + (rand() - 0.5) * 0.2, z: pz + (rand() - 0.5) * 0.2, vx: (rand() - 0.5), vy: 0.6 + rand(), vz: (rand() - 0.5), life: 0.3 + rand() * 0.3, size: 0.06 + rand() * 0.1, element: 2, shape: 7, drag: 2, ay: 2.4, intensity: 1.4});
      }
      if (!landed && u >= 1) {
        landed = true;
        bg.visible = false;
        blast(h, [land[0], land[1] + 0.4, land[2]], 1.1, 0.5, {hot: 0.46});
        decal(h, 1, land, 1.35, EMBER, CHAR, 1.2);
        h.burst(land, 2, 36, 0.4, 4.4, 2.2);
        cb.onSpawnBurst(land, def.element, 12, 3);
        cb.onSkillHitArea(land, bombDef, false);
      }
    }, () => h.kit.release(bg), 0.16 + k * 0.045);
  }
}

// ================================================================ DARK

/** E 影袭: a rift runs along the ground to the target, then obsidian claws break through and snap shut on it. */
export function darkCreep(h: SkillHost, origin: Vec, target: Vec, def: SkillDef, cb: SkillEffectCallbacks) {
  const T = h.T;
  const dx = target[0] - origin[0], dz = target[2] - origin[2];
  const L = Math.max(0.8, Math.hypot(dx, dz));
  const fx = dx / L, fz = dz / L;
  const N = 24, W = 0.55;
  const pos = new Float32Array((N + 1) * 6), uv = new Float32Array((N + 1) * 4);
  const idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const x = origin[0] + dx * s, z = origin[2] + dz * s;
    const y = groundY(cb, x, z, origin[1] + (target[1] - origin[1]) * s) + 0.07;
    pos.set([x + fz * W, y, z - fx * W, x - fz * W, y, z + fx * W], i * 6);
    uv.set([s, 0, s, 1], i * 4);
    if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const trailMat = h.kit.rift(rand() * 20, [1.5, 0.25, 1.2]);
  const trail = h.mesh(geo, trailMat, 23);
  const travel = Math.min(0.38, Math.max(0.16, L / 26));
  let acc = 0;
  h.fx(travel + 0.7, (_t, dt, age) => {
    const u = trailMat.uniforms;
    const run = sat(age / travel);
    u.uTime.value = h.now();
    u.uDraw.value = run * 1.04;
    u.uOpen.value = 0.34 * (age < travel ? 0.6 + 0.4 * Math.sin(age * 40) : 1 - easeIn((age - travel - 0.2) / 0.5));
    u.uFade.value = 1 - easeIn((age - travel - 0.45) / 0.25);
    if (age < travel) {
      acc += dt * 120;
      const hx = origin[0] + dx * run, hz = origin[2] + dz * run;
      while (acc >= 1) {
        acc -= 1;
        h.emit({x: hx + (rand() - 0.5) * 0.5, y: groundY(cb, hx, hz, origin[1]) + 0.1, z: hz + (rand() - 0.5) * 0.5, vx: -fx * 2, vy: 0.8 + rand() * 1.6, vz: -fz * 2, life: 0.35 + rand() * 0.3, size: 0.05 + rand() * 0.09, element: 4, shape: rand() < 0.6 ? 4 : 1, drag: 2, ay: 0.5, intensity: 1.3});
      }
    }
  }, () => h.kit.release(trail));

  const Rm = Math.min(1.25, def.radius * 0.62);
  const g = stage(h, target);
  const clawMat = h.kit.rock({...OBSIDIAN, glow: 0.9, vein: 3.0});
  const claws: {m: any; axis: any}[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + 0.3;
    const m = h.mesh(shardGeo(T, 0.21, 1.5 + (k % 2) * 0.25, 4, 60 + k, 0.24), clawMat, 20, g);
    m.position.set(Math.cos(a) * Rm, 0, Math.sin(a) * Rm);
    // Tilt axis = up x inward, so a positive angle leans the claw toward the centre.
    claws.push({m, axis: new T.Vector3(-Math.sin(a), 0, Math.cos(a))});
    m.scale.setScalar(0.02);
  }
  g.visible = false;
  let bitten = false;
  h.fx(0.8, (_t, _dt, age) => {
    g.visible = true;
    const rise = backOut(age / 0.13);
    const snap = 0.30 + 0.62 * easeOut((age - 0.15) / 0.07, 3);
    for (const c of claws) {
      c.m.scale.set(1, Math.max(0.02, rise), 1);
      c.m.quaternion.setFromAxisAngle(c.axis, snap);
    }
    clawMat.uniforms.uDissolve.value = easeIn((age - 0.48) / 0.3, 1.3) * 1.05;
    if (!bitten && age >= 0.19) {
      bitten = true;
      // Kept small and cool so the closing claws stay readable through it.
      blast(h, [target[0], target[1] + 0.5, target[2]], 0.55, 0.45, {palette: VOID_PALETTE, hot: 0.2});
      decal(h, 2, target, def.radius * 1.1, VOIDC, ABYSS, 1.1);
      h.burst(target, 4, 56, def.radius * 0.6, 5.2, 1.8);
      cb.onSpawnBurst(target, def.element, 20, 3.2);
      cb.onSkillHitArea(target, def, false);
    }
  }, () => h.kit.release(g), travel);
}

/** R 蚀渊 dressing: rifts stand up one after another around the rim of the black-hole field. */
export function darkFieldRifts(h: SkillHost, center: Vec, def: SkillDef) {
  const life = def.duration ?? 4;
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU + 0.4;
    const delay = 0.1 + k * 0.12;
    rift(h, [center[0] + Math.sin(a) * def.radius * 0.9, center[1] + 1.05, center[2] + Math.cos(a) * def.radius * 0.9], 2.0, Math.PI * 0.5, a, life - delay - 0.05, 0.45, delay);
  }
}

/** Q 千裂: seven hairline cuts are laid through the area one by one; a beat later they all tear open and space shatters. */
export function darkRend(h: SkillHost, center: Vec, def: SkillDef, cb: SkillEffectCallbacks) {
  const T = h.T;
  const R = def.radius;
  const cuts = def.multiHits ?? 7;
  const gap = 0.075;
  const shatter = cuts * gap + 0.24;
  const life = shatter + 0.5;

  const pool = h.shadow(R * 1.05, [0.02, 0.006, 0.05]);
  pool.position.set(center[0], center[1] + 0.055, center[2]);
  h.root.add(pool);
  h.fx(life + 0.4, t => {
    pool.material.uniforms.uAlpha.value = Math.min(1, t / 0.1) * (1 - easeIn((t - 0.7) / 0.3));
    pool.material.uniforms.uTime.value = h.now();
  }, () => h.kit.release(pool));

  const chip = {...def, radius: R * 0.7, damage: Math.max(1, Math.round(def.damage * 0.08))};
  for (let k = 0; k < cuts; k++) {
    const yaw = rand() * Math.PI, roll = (rand() - 0.5) * 2.2;
    const len = R * (1.6 + rand() * 0.6);
    const at: Vec = [center[0] + (rand() - 0.5) * R * 0.6, center[1] + 0.6 + rand() * 1.1, center[2] + (rand() - 0.5) * R * 0.6];
    const mat = h.kit.rift(rand() * 20, k % 2 ? [1.45, 0.2, 1.05] : [0.75, 0.3, 1.9]);
    const holder = stage(h, at);
    holder.rotation.order = 'YZX';
    holder.rotation.set(0, yaw, roll);
    const a = h.mesh(h.kit.unit('plane'), mat, 25, holder);
    a.scale.set(len, len * 0.42, 1);
    const b = h.mesh(h.kit.unit('plane'), mat, 25, holder);
    b.rotation.x = Math.PI * 0.5;
    b.scale.set(len, len * 0.42, 1);
    holder.visible = false;
    const tear = shatter - k * gap;
    let cut = false;
    h.fx(life - k * gap, (_t, _dt, age) => {
      holder.visible = true;
      const u = mat.uniforms;
      const s = age - tear;
      u.uTime.value = h.now();
      u.uDraw.value = easeOut(age / 0.07, 2) * 1.04;
      u.uOpen.value = s < 0 ? 0.035 : 0.9 * backOut(s / 0.09) * (1 - easeIn((s - 0.16) / 0.3, 1.6));
      u.uFade.value = s > 0.3 ? Math.max(0, 1 - (s - 0.3) / 0.16) : 1;
      if (!cut) {
        cut = true;
        const cr = Math.cos(roll), sr = Math.sin(roll), cyw = Math.cos(yaw), syw = Math.sin(yaw);
        for (let i = 0; i < 9; i++) {
          const d = (rand() - 0.5) * len * 0.9;
          h.emit({x: at[0] + cr * cyw * d, y: at[1] + sr * d, z: at[2] - cr * syw * d, vx: (rand() - 0.5) * 2, vy: (rand() - 0.5) * 2, vz: (rand() - 0.5) * 2, life: 0.2 + rand() * 0.25, size: 0.05 + rand() * 0.07, element: 4, shape: 1, drag: 3, intensity: 1.6});
        }
        if (k % 2 === 1 && k < 6) cb.onSkillHitArea(center, chip, false);
      }
    }, () => h.kit.release(holder), k * gap);
  }

  // The break: void-flame core, an expanding hollow shell and shards of "broken space" thrown outward.
  const g = stage(h, [center[0], center[1] + 0.9, center[2]]);
  const shellMat = h.kit.voidShell({center: 0.12, pow: 1.4});
  const shell = h.mesh(h.kit.unit('sphere'), shellMat, 24, g);
  const flashMat = h.kit.flash([2.0, 0.9, 2.4], 1, 1.4);
  const flash = h.mesh(h.kit.unit('sphere'), flashMat, 27, g);
  const glassMat = h.kit.rock({...OBSIDIAN, glow: 1.0, vein: 4});
  const shards: {m: any; v: Vec; spin: Vec}[] = [];
  for (let i = 0; i < 18; i++) {
    const s = 0.22 + rand() * 0.36;
    const tri = new T.BufferGeometry();
    tri.setAttribute('position', new T.BufferAttribute(new Float32Array([-s, -s * 0.5, 0, s, -s * 0.3, 0.03, (rand() - 0.5) * s, s, -0.03]), 3));
    tri.setAttribute('uv', new T.BufferAttribute(new Float32Array([0, 0, 1, 0, 0.5, 1]), 2));
    tri.computeVertexNormals();
    const m = h.mesh(tri, glassMat, 20, g);
    const a = rand() * TAU, e = (rand() - 0.25) * 1.2, sp = 4 + rand() * 6;
    m.rotation.set(rand() * 6, rand() * 6, rand() * 6);
    shards.push({m, v: [Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + 1.5, Math.sin(a) * Math.cos(e) * sp], spin: [(rand() - 0.5) * 14, (rand() - 0.5) * 14, (rand() - 0.5) * 14]});
  }
  g.visible = false;
  let broke = false;
  h.fx(0.75, (t, dt) => {
    g.visible = true;
    shell.scale.setScalar(0.4 + (R - 0.4) * easeOut(t / 0.45, 2.4));
    shellMat.uniforms.uTime.value = h.now();
    shellMat.uniforms.uAlpha.value = 1 - easeIn((t - 0.3) / 0.5, 1.4);
    flash.scale.setScalar(R * (0.2 + 0.5 * easeOut(t / 0.2, 2)));
    flashMat.uniforms.uAlpha.value = Math.max(0, 1 - t / 0.22);
    glassMat.uniforms.uDissolve.value = easeIn((t - 0.5) / 0.5, 1.3) * 1.05;
    for (const s of shards) {
      s.v[1] -= 7 * dt;
      s.m.position.x += s.v[0] * dt;
      s.m.position.y += s.v[1] * dt;
      s.m.position.z += s.v[2] * dt;
      s.m.rotation.x += s.spin[0] * dt;
      s.m.rotation.y += s.spin[1] * dt;
    }
    if (!broke) {
      broke = true;
      blast(h, [center[0], center[1] + 0.9, center[2]], R * 0.5, 0.6, {palette: VOID_PALETTE, hot: 0.52});
      decal(h, 2, center, R * 1.15, VOIDC, ABYSS, 1.3);
      h.shockRing(center, R * 1.38, 4, 0.6);
      h.burst(center, 4, 140, R * 0.65, 6.8, 2.8);
      cb.onSpawnBurst(center, def.element, 36, 5.2);
      cb.onSkillHitArea(center, {...def, damage: Math.round(def.damage * 0.76)}, true);
    }
  }, () => h.kit.release(g), shatter);
}

// ================================================================ PHYSICAL

function prep(group: any) {
  group.traverse((n: any) => {
    n.layers.set(1);
    n.frustumCulled = false;
  });
  return group;
}

/** Ring of spikes around a point; returns a setter driven by the caller's own timeline. */
function spikeRing(h: SkillHost, parent: any, count: number, radius: number, height: number, lean: number, mat: any, seed: number) {
  const T = h.T;
  const items: {m: any; delay: number}[] = [];
  for (let k = 0; k < count; k++) {
    const a = (k / count) * TAU + seed * 0.37;
    const m = h.mesh(shardGeo(T, height * (0.20 + (k % 3) * 0.03), height * (0.8 + (k % 3) * 0.22), 5, seed + k, 0.4), mat, 20, parent);
    m.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    // Lean outward: rotate about the tangent so the tip moves away from the centre.
    m.quaternion.setFromAxisAngle(new T.Vector3(Math.sin(a), 0, -Math.cos(a)), lean);
    m.scale.setScalar(0.02);
    items.push({m, delay: (k % 4) * 0.014});
  }
  return (age: number) => {
    for (const s of items) s.m.scale.setScalar(Math.max(0.02, backOut((age - s.delay) / 0.13)));
  };
}

/** E 崩岩拳: a stone fist the size of the slime's house punches up out of the ground and launches whatever stood there. */
export function rockFist(h: SkillHost, impact: Vec, fwd: Vec, def: SkillDef, cb: SkillEffectCallbacks) {
  const T = h.T;
  const g = stage(h, impact, Math.atan2(fwd[0], fwd[2]));
  const pivot = new T.Group();
  pivot.position.set(0, 0, -0.45);
  pivot.rotation.x = -0.95;
  g.add(pivot);
  const mat = h.kit.rock({glow: 0.8});
  const fist = prep(stoneFist(T, 1.0, mat, 4));
  pivot.add(fist);
  const ringMat = h.kit.flash([1.6, 1.4, 1.0], 0, 0.5);
  const ring = h.mesh(h.kit.unit('torus'), ringMat, 26, pivot);
  ring.position.z = 2.1;
  const shardMat = h.kit.rock({glow: 0.85});
  const pop = spikeRing(h, g, 5, 1.0, 0.7, 0.5, shardMat, 3);
  decal(h, 3, impact, def.radius * 0.95, GOLD, SOIL, 1.1);
  dust(h, [impact[0] + 0.5, impact[1] + 0.25, impact[2] + 0.3], 0.5, 0.6, 0.06);
  dust(h, [impact[0] - 0.5, impact[1] + 0.25, impact[2] - 0.2], 0.45, 0.6, 0.1);
  let hit = false;
  h.fx(0.95, (_t, _dt, age) => {
    fist.position.z = -1.9 + 2.9 * backOut(age / 0.16) - 0.7 * easeIn((age - 0.5) / 0.45, 1.6);
    const rp = sat((age - 0.1) / 0.26);
    ring.scale.setScalar(0.3 + 1.6 * easeOut(rp, 3));
    ringMat.uniforms.uAlpha.value = age > 0.1 ? (1 - rp) * 0.9 : 0;
    pop(age - 0.05);
    mat.uniforms.uDissolve.value = easeIn((age - 0.55) / 0.38, 1.3) * 1.05;
    shardMat.uniforms.uDissolve.value = easeIn((age - 0.6) / 0.33, 1.3) * 1.05;
    if (!hit && age >= 0.08) {
      hit = true;
      h.burst(impact, 5, 70, def.radius * 0.35, 4.5, 2.2);
      cb.onSpawnBurst(impact, def.element, 20, 3.2);
      cb.onSkillHitArea(impact, def, false);
    }
  }, () => h.kit.release(g));
}

/** R 裂地脊: one punch into the ground and a spine of stone spikes marches forward, each bigger than the last. */
export function rockFissure(h: SkillHost, origin: Vec, fwd: Vec, def: SkillDef, cb: SkillEffectCallbacks) {
  const T = h.T;
  const count = def.multiHits ?? 7;
  const first = 1.4;
  const stride = (def.range - first) / Math.max(1, count - 1);
  const yaw = Math.atan2(fwd[0], fwd[2]);
  const nodes: Vec[] = [];
  let prev = origin;
  for (let k = 0; k < count; k++) {
    const d = first + k * stride;
    const x = origin[0] + fwd[0] * d, z = origin[2] + fwd[2] * d;
    const p: Vec = [x, groundY(cb, x, z, origin[1]), z];
    if (cb.castWall?.([prev[0], prev[1] + 0.4, prev[2]], [p[0], p[1] + 0.4, p[2]]) || cb.blocked?.(origin, p)) break;
    nodes.push(p);
    prev = p;
  }
  if (!nodes.length) nodes.push([origin[0] + fwd[0] * 0.8, origin[1], origin[2] + fwd[2] * 0.8]);
  h.shockRing([origin[0] + fwd[0] * 0.6, origin[1], origin[2] + fwd[2] * 0.6], 1.3, 5, 0.36);
  const per = {...def, radius: 1.2, damage: Math.round(def.damage * 0.55)};
  nodes.forEach((p, k) => {
    const g = stage(h, p, yaw);
    const mat = h.kit.rock({glow: 0.85, seed: k * 3.1});
    const main = h.mesh(shardGeo(T, 0.30 + k * 0.025, 1.25 + k * 0.13, 5, 40 + k, 0.45), mat, 20, g);
    main.rotation.x = 0.32;
    const sides = [-1, 1].map(s => {
      const m = h.mesh(shardGeo(T, 0.17, 0.62 + (k % 3) * 0.1, 5, 70 + k * 2 + s), mat, 20, g);
      m.position.set(s * 0.42, 0, -0.1);
      m.rotation.set(0.2, 0, -s * 0.42);
      return m;
    });
    g.visible = false;
    let burst = false;
    h.fx(0.95, (_t, _dt, age) => {
      g.visible = true;
      main.scale.set(1, Math.max(0.02, backOut(age / 0.11)), 1);
      for (const s of sides) s.scale.setScalar(Math.max(0.02, backOut((age - 0.03) / 0.11)));
      mat.uniforms.uDissolve.value = easeIn((age - 0.55) / 0.38, 1.3) * 1.05;
      if (!burst) {
        burst = true;
        decal(h, 3, p, 1.05, GOLD, SOIL, 1.0);
        dust(h, [p[0], p[1] + 0.2, p[2]], 0.34, 0.5);
        h.burst(p, 5, 16, 0.3, 3.6, 2.6);
        cb.onSpawnBurst(p, def.element, 8, 2.2);
        cb.onSkillHitArea(p, per, false);
      }
    }, () => h.kit.release(g), 0.05 + k * 0.055);
  });
}

/** Q 陨岳: the slime leaps and a crag comes down with it — crater, two rings of upturned stone and a wall of dust. */
export function rockMeteor(h: SkillHost, impact: Vec, def: SkillDef, cb: SkillEffectCallbacks) {
  const T = h.T;
  const R = def.radius;
  const fall = 0.42;
  decal(h, 5, impact, R, GOLD, [0.5, 0.36, 0.12], fall + 0.05);
  const g = stage(h, impact);
  const cragMat = h.kit.rock({glow: 0.7, vein: 1.6});
  const crag = h.mesh(rockGeo(T, 1.35, 17, 2, [1, 1.25, 1]), cragMat, 20, g);
  const ringMat = h.kit.rock({glow: 0.9});
  const slabs: {m: any; delay: number}[] = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU + 0.2;
    const m = h.mesh(stoneBoxGeo(T, 0.95, 0.2, 0.7, 80 + k, 0.14, 0.1), ringMat, 20, g);
    m.position.set(Math.cos(a) * R * 0.40, 0.1, Math.sin(a) * R * 0.40);
    m.rotation.order = 'YXZ';
    m.rotation.set(0, -a + Math.PI * 0.5, 0);
    m.scale.setScalar(0.02);
    slabs.push({m, delay: (k % 3) * 0.02});
  }
  const pop = spikeRing(h, g, 12, R * 0.72, 1.25, 0.42, ringMat, 9);
  let landed = false, acc = 0;
  h.fx(1.55, (_t, dt, age) => {
    const drop = easeIn(age / fall, 2.2);
    const sink = age > fall ? 0.5 * easeOut((age - fall) / 0.12, 2) : 0;
    crag.position.y = 9.5 * (1 - drop) + 0.9 - sink;
    crag.rotation.y += dt * (age < fall ? 2.5 : 0);
    crag.scale.setScalar(Math.min(1, 0.4 + age * 4));
    if (age < fall) {
      acc += dt * 110;
      while (acc >= 1) {
        acc -= 1;
        h.emit({x: impact[0] + (rand() - 0.5) * 1.6, y: impact[1] + crag.position.y + 0.8 + rand(), z: impact[2] + (rand() - 0.5) * 1.6, vx: (rand() - 0.5) * 2, vy: 2 + rand() * 3, vz: (rand() - 0.5) * 2, life: 0.3 + rand() * 0.3, size: 0.06 + rand() * 0.1, element: 5, shape: rand() < 0.4 ? 1 : 8, drag: 2, spin: 9, intensity: 1.2});
      }
    } else {
      const since = age - fall;
      for (const s of slabs) {
        const up = backOut((since - s.delay) / 0.14);
        s.m.scale.setScalar(Math.max(0.02, up));
        // Local +Z points away from the impact, so a negative pitch throws the outer edge up.
        s.m.rotation.x = -0.95 * up;
      }
      pop(since - 0.07);
      cragMat.uniforms.uDissolve.value = easeIn((since - 0.55) / 0.5, 1.3) * 1.05;
      ringMat.uniforms.uDissolve.value = easeIn((since - 0.7) / 0.4, 1.3) * 1.05;
      if (!landed) {
        landed = true;
        decal(h, 3, impact, R * 1.1, GOLD, SOIL, 1.5);
        decal(h, 4, impact, R * 1.45, DUSTC, DUSTD, 0.6, 0, {lift: 0.08});
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * TAU + 0.5;
          dust(h, [impact[0] + Math.cos(a) * R * 0.55, impact[1] + 0.3, impact[2] + Math.sin(a) * R * 0.55], 0.7, 0.8, k * 0.02);
        }
        h.shockRing(impact, R * 1.34, 5, 0.66);
        h.burst(impact, 5, 135, R * 0.35, 6.4, 3.4);
        cb.onSpawnBurst(impact, def.element, 36, 4.8);
        cb.onSkillHitArea(impact, def, true);
      }
    }
  }, () => h.kit.release(g));
}
