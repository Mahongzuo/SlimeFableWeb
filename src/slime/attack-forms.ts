import type {Vec} from './types';
import {
  DUST_PALETTE, StreamTube, VfxKit, crescentGeo, helixRibbonGeo, rockGeo, shardGeo, stoneBoxGeo, streamProfile,
  type Rgb,
} from './vfx-kit';

/**
 * Bespoke normal-attack forms. Volt keeps the swept plasma ribbon in slash-vfx.ts; every other element
 * attacks with a body of its own instead of a recoloured arc:
 *
 *   Water    "流"  liquid tubes   : jet -> serpent whip -> twin-helix geyser -> triple arcing wave crash
 *   Fire     "炸"  eroding blasts : jab burst -> rolling triple blast -> flame pillar -> ring-of-fire nova
 *   Dark     "蚀"  rifts in space : single tear -> triple claw marks -> cross tear -> collapsing void shell
 *   Physical "重"  solid stone    : rock fist -> hook -> erupting pillar -> falling hammer block
 *   Wind     "疾"  (adds to ribbon): crescents that leave the blade and fly -> rising helix cyclone
 *
 * Everything is authored in the attacker's local frame: +Z forward, +Y up, origin at the slime's feet.
 */
export interface FormParticle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number;
  size: number;
  shape: number;
  grav: number;
  drag?: number;
  swirl?: number;
  spin?: number;
  flicker?: number;
  from: readonly [number, number, number];
  to: readonly [number, number, number];
}

type Step = (age: number, dt: number) => void;

interface FormInstance {
  anchor: any;
  age: number;
  life: number;
  follow: number;
  steps: Step[];
  cy: number;
  sy: number;
}

const rand = Math.random;
const sat = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number, p = 3) => 1 - Math.pow(1 - sat(x), p);
const easeIn = (x: number, p = 2) => Math.pow(sat(x), p);
const backOut = (x: number) => {
  const y = sat(x) - 1;
  return 1 + 2.70158 * y * y * y + 1.70158 * y * y;
};

// Particle sprite shapes owned by slash-vfx.ts: 0 glow, 1 star, 2 droplet, 3 leaf, 4 ember, 5 volt, 6 void wisp, 7 rock chip.
const WATER = {core: [0.92, 0.99, 1.0], main: [0.06, 0.56, 0.98], accent: [0.42, 0.95, 1.0]} as const;
const WIND = {core: [0.95, 1.0, 0.97], main: [0.52, 1.0, 0.78], accent: [0.82, 1.0, 0.66]} as const;
const FIRE = {core: [1.0, 0.94, 0.58], main: [0.98, 0.36, 0.03], edge: [0.78, 0.07, 0.01], accent: [1.0, 0.76, 0.12]} as const;
const DARK = {core: [0.96, 0.78, 1.0], main: [0.38, 0.12, 0.68], accent: [0.98, 0.22, 0.68]} as const;
const ROCK = {core: [1.0, 0.99, 0.94], main: [0.92, 0.74, 0.36], edge: [0.56, 0.38, 0.14]} as const;

export class AttackFormSystem {
  private kit: VfxKit;
  private list: FormInstance[] = [];
  private clock = 0;

  constructor(private T: any, private root: any, private emit: (p: FormParticle) => void) {
    this.kit = new VfxKit(T);
  }

  get active(): number {
    return this.list.length;
  }

  /** Plays the element's form for one combo step. Returns false for elements that have none (Volt). */
  play(element: number, comboIndex: number, origin: Vec, forward: Vec, duration: number): boolean {
    if (element === 3 || element < 0 || element > 5) return false;
    const fl = Math.hypot(forward[0], forward[2]) || 1;
    const yaw = Math.atan2(forward[0] / fl, forward[2] / fl);
    const anchor = new this.T.Group();
    anchor.position.set(origin[0], origin[1], origin[2]);
    anchor.rotation.y = yaw;
    const inst: FormInstance = {anchor, age: 0, life: duration + 0.45, follow: duration, steps: [], cy: Math.cos(yaw), sy: Math.sin(yaw)};
    const combo = ((comboIndex % 4) + 4) % 4;
    if (element === 0) this.water(inst, combo, duration);
    else if (element === 1) this.wind(inst, combo, duration);
    else if (element === 2) this.fire(inst, combo, duration);
    else if (element === 4) this.dark(inst, combo, duration);
    else this.physical(inst, combo, duration);
    this.root.add(anchor);
    this.list.push(inst);
    for (const step of inst.steps) step(0, 0);
    return true;
  }

  update(dt: number, followOrigin?: Vec) {
    this.clock += dt;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const inst = this.list[i];
      inst.age += dt;
      if (inst.age >= inst.life) {
        this.kit.release(inst.anchor);
        this.list.splice(i, 1);
        continue;
      }
      if (followOrigin && inst.age <= inst.follow) inst.anchor.position.set(followOrigin[0], followOrigin[1], followOrigin[2]);
      for (const step of inst.steps) step(inst.age, dt);
    }
  }

  reset() {
    for (const inst of this.list) this.kit.release(inst.anchor);
    this.list.length = 0;
  }

  dispose() {
    this.reset();
    this.kit.dispose();
  }

  // ---------------------------------------------------------------- shared building blocks

  private mesh(inst: FormInstance, geo: any, mat: any, order = 25, parent?: any) {
    const m = new this.T.Mesh(geo, mat);
    m.layers.set(1);
    m.renderOrder = order;
    m.frustumCulled = false;
    (parent ?? inst.anchor).add(m);
    return m;
  }

  /** Emit a pooled sprite from local-space position and velocity. */
  private puff(inst: FormInstance, l: [number, number, number], v: [number, number, number], rest: Omit<FormParticle, 'x' | 'y' | 'z' | 'vx' | 'vy' | 'vz'>) {
    const a = inst.anchor.position;
    this.emit({
      x: a.x + l[0] * inst.cy + l[2] * inst.sy,
      y: a.y + l[1],
      z: a.z - l[0] * inst.sy + l[2] * inst.cy,
      vx: v[0] * inst.cy + v[2] * inst.sy,
      vy: v[1],
      vz: -v[0] * inst.sy + v[2] * inst.cy,
      ...rest,
    });
  }

  private decal(inst: FormInstance, mode: 0 | 1 | 2 | 3 | 4 | 5, radius: number, x: number, z: number, color: Rgb, dark: Rgb, t0: number, life: number, lift = 0.05) {
    const mat = this.kit.ground(mode, color, dark);
    const m = this.mesh(inst, this.kit.unit('disc'), mat, 22);
    m.position.set(x, lift, z);
    m.scale.set(radius, 1, radius);
    m.visible = false;
    inst.life = Math.max(inst.life, t0 + life + 0.02);
    inst.steps.push(age => {
      const t = (age - t0) / life;
      m.visible = t >= 0 && t < 1;
      if (!m.visible) return;
      mat.uniforms.uTime.value = this.clock;
      mat.uniforms.uProgress.value = mode === 0 || mode === 4 ? t : easeOut(t / 0.45, 2);
      mat.uniforms.uFade.value = mode === 0 || mode === 4 ? 1 : 1 - easeIn((t - 0.55) / 0.45, 1.5);
    });
  }

  /** Eroding noise blob: the base of every fire burst, and (repainted) of dust clouds. */
  private blast(inst: FormInstance, at: [number, number, number], R: number, t0: number, life: number, o: {palette?: readonly Rgb[]; hot?: number; rise?: number; alpha?: number; onStart?: () => void} = {}) {
    const mat = this.kit.fire({displace: 0.55, freq: 1.5, rise: 1.4, hot: o.hot ?? 0.42, palette: o.palette, alpha: o.alpha});
    const m = this.mesh(inst, this.kit.unit('blob'), mat, 25);
    m.visible = false;
    m.rotation.set(rand() * 6, rand() * 6, rand() * 6);
    inst.life = Math.max(inst.life, t0 + life + 0.02);
    let started = false;
    inst.steps.push(age => {
      const t = (age - t0) / life;
      m.visible = t >= 0 && t < 1;
      if (!m.visible) return;
      if (!started) { started = true; o.onStart?.(); }
      const s = R * (0.30 + 0.70 * backOut(t / 0.22)) * (1 + 0.28 * t);
      m.scale.setScalar(s);
      m.position.set(at[0], at[1] + R * (o.rise ?? 0.4) * t, at[2]);
      mat.uniforms.uTime.value = this.clock;
      mat.uniforms.uProgress.value = easeIn((t - 0.15) / 0.85, 1.35);
    });
  }

  // ---------------------------------------------------------------- 0 WATER

  /** Solid liquid beads thrown from an impact, plus fine spray. */
  private splash(inst: FormInstance, at: [number, number, number], count: number, speed: number, dir: [number, number, number], spread = 1) {
    const born = inst.age;
    const life = 0.5;
    const mat = this.kit.water({flow: 0, rep: 2, crest: 2});
    const drops: {m: any; vx: number; vy: number; vz: number; s: number}[] = [];
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const lat = speed * 0.55 * spread * (0.3 + rand() * 0.7);
      const k = speed * (0.35 + rand() * 0.75);
      const m = this.mesh(inst, this.kit.unit('sphere'), mat, 26);
      m.position.set(at[0], at[1], at[2]);
      drops.push({m, vx: dir[0] * k + Math.cos(a) * lat, vy: dir[1] * k + 1.2 + rand() * 2.2, vz: dir[2] * k + Math.sin(a) * lat, s: 0.035 + rand() * 0.06});
    }
    for (let i = 0; i < count * 2; i++) {
      const a = rand() * Math.PI * 2;
      const lat = speed * 0.7 * spread * rand();
      const k = speed * (0.3 + rand() * 0.9);
      this.puff(inst, at, [dir[0] * k + Math.cos(a) * lat, dir[1] * k + 1 + rand() * 2.6, dir[2] * k + Math.sin(a) * lat], {
        life: 0.4 + rand() * 0.35, size: i % 4 === 0 ? 1.3 + rand() * 0.6 : 0.7 + rand() * 0.6, shape: i % 4 === 0 ? 0 : 2,
        grav: i % 4 === 0 ? -1.5 : -11, drag: i % 4 === 0 ? 3 : 0.9, from: WATER.core, to: WATER.main,
      });
    }
    inst.life = Math.max(inst.life, born + life + 0.02);
    inst.steps.push((age, dt) => {
      const t = (age - born) / life;
      for (const d of drops) {
        d.m.visible = t < 1;
        if (t >= 1) continue;
        d.vy -= 10.5 * dt;
        d.m.position.x += d.vx * dt;
        d.m.position.y += d.vy * dt;
        d.m.position.z += d.vz * dt;
        const stretch = 1 + Math.min(0.9, Math.abs(d.vy) * 0.12);
        const s = d.s * (1 - easeIn((t - 0.5) / 0.5, 2));
        d.m.scale.set(s, s * stretch, s);
      }
    });
  }

  private water(inst: FormInstance, combo: number, dur: number) {
    const T = this.T;
    const hit = dur * 0.45;
    const stream = (segs: number, flow: number, rep: number) => {
      const tube = new StreamTube(T, segs, 8);
      const mat = this.kit.water({flow, rep});
      this.mesh(inst, tube.geo, mat, 25);
      return {tube, mat};
    };

    if (combo === 0) {
      // 水枪: a pressurised jet that punches straight out, then drains from the tail.
      inst.life = dur + 0.30;
      const {tube, mat} = stream(24, 6.0, 4);
      const L = 1.7;
      const prof = streamProfile(0.105, 0.8);
      let splashed = false;
      inst.steps.push(age => {
        mat.uniforms.uTime.value = this.clock;
        const head = Math.max(0.03, easeOut(age / hit, 3));
        const tail = Math.min(head - 0.02, easeIn((age - hit * 0.9) / (inst.life - hit * 0.9), 1.6));
        const girth = Math.min(1, (head - tail) / 0.25);
        const wob = age * 16;
        tube.update(Math.max(0, tail), head, (s, o) => {
          o[0] = Math.sin(s * 5 + wob) * 0.035 * s;
          o[1] = 0.34 + Math.sin(s * 7 - wob) * 0.03 * s;
          o[2] = 0.22 + s * L;
        }, u => prof(u) * girth);
        if (!splashed && age >= hit) {
          splashed = true;
          this.splash(inst, [0, 0.34, 0.22 + L], 9, 3.4, [0, 0.2, 1], 0.9);
        }
      });
    } else if (combo === 1) {
      // 水蛇: a serpent of water whips across the front, undulating as it goes.
      inst.life = dur + 0.34;
      const {tube, mat} = stream(30, 6.5, 6);
      const R = 1.42;
      const sweep = hit * 1.3;
      const prof = streamProfile(0.092, 1.05);
      let acc = 0;
      inst.steps.push((age, dt) => {
        mat.uniforms.uTime.value = this.clock;
        const head = Math.max(0.03, easeOut(age / sweep, 2.2));
        const drain = easeIn((age - sweep) / (inst.life - sweep), 1.5);
        const tail = Math.min(head - 0.02, Math.max(head - 0.64, drain));
        const girth = Math.min(1, (head - tail) / 0.22);
        const path = (s: number, o: number[]) => {
          const th = (-82 + 164 * s) * Math.PI / 180;
          o[0] = Math.sin(th) * R;
          o[1] = 0.36 + Math.sin(s * 9.5 - age * 14) * 0.13 * (0.4 + 0.6 * s);
          o[2] = 0.10 + Math.cos(th) * R * 0.95;
        };
        tube.update(Math.max(0, tail), head, path, u => prof(u) * girth);
        if (age < sweep) {
          acc += dt * 70;
          const o = [0, 0, 0];
          path(head, o);
          while (acc >= 1) {
            acc -= 1;
            this.puff(inst, [o[0], o[1], o[2]], [(rand() - 0.5) * 1.5, 1 + rand() * 2, (rand() - 0.5) * 1.5], {
              life: 0.35 + rand() * 0.3, size: 0.7 + rand() * 0.6, shape: 2, grav: -10, drag: 1, from: WATER.core, to: WATER.main,
            });
          }
        }
      });
    } else if (combo === 2) {
      // 涌泉: a column erupts under the target while two streams wind up around it.
      inst.life = dur + 0.40;
      const z0 = 1.1;
      const col = stream(18, 7.0, 3);
      const colProf = (u: number) => 0.17 * (1 - 0.6 * u) * Math.sqrt(Math.min(1, u / 0.1)) * (1 + 0.7 * Math.exp(-(((u - 0.9) / 0.09) ** 2))) * (u > 0.95 ? Math.sqrt(Math.max(0, 1 - ((u - 0.95) / 0.05) ** 2)) : 1);
      const helices = [0, 1].map(k => ({...stream(30, 7.5, 7), k}));
      const helixProf = streamProfile(0.07, 0.9);
      let crowned = false;
      this.decal(inst, 0, 1.0, 0, z0, [1.2, 1.5, 1.6], [0.1, 0.55, 1.0], hit * 0.4, 0.5);
      inst.steps.push(age => {
        const head = Math.max(0.03, easeOut(age / hit, 2.5));
        const tail = Math.min(head - 0.02, easeIn((age - hit * 1.35) / (inst.life - hit * 1.35), 1.4));
        const girth = Math.min(1, (head - tail) / 0.25);
        col.mat.uniforms.uTime.value = this.clock;
        col.tube.update(Math.max(0, tail), head, (s, o) => {
          o[0] = Math.sin(s * 6 + age * 9) * 0.03;
          o[1] = 0.02 + s * 1.75;
          o[2] = z0;
        }, u => colProf(u) * girth);
        for (const h of helices) {
          h.mat.uniforms.uTime.value = this.clock;
          h.tube.update(Math.max(0, tail), head, (s, o) => {
            const a = h.k * Math.PI + s * 2.1 * Math.PI * 2 + age * 3;
            const r = 0.36 * (1 - 0.3 * s);
            o[0] = Math.cos(a) * r;
            o[1] = 0.05 + s * 1.9;
            o[2] = z0 + Math.sin(a) * r;
          }, u => helixProf(u) * girth);
        }
        if (!crowned && age >= hit) {
          crowned = true;
          this.splash(inst, [0, 1.8, z0], 12, 2.4, [0, 0.9, 0], 1.5);
        }
      });
    } else {
      // 浪砸: three streams vault overhead and crash down together into a crown of water.
      inst.life = dur + 0.55;
      const zl = 1.75;
      const streams = [-1, 0, 1].map(k => ({...stream(26, 6.0, 5), k, prof: streamProfile(k === 0 ? 0.14 : 0.10, 0.85)}));
      const burst = stream(14, 8.0, 2);
      burst.tube.geo.setDrawRange(0, 0);
      let landed = false;
      this.decal(inst, 0, 1.75, 0, zl, [1.2, 1.5, 1.6], [0.1, 0.55, 1.0], hit, 0.55);
      inst.steps.push(age => {
        for (const st of streams) {
          st.mat.uniforms.uTime.value = this.clock;
          const local = age - Math.abs(st.k) * 0.025;
          const head = Math.max(0.03, easeIn(local / hit, 1.5));
          const tail = Math.min(head - 0.02, Math.max(head - 0.72, easeIn((local - hit) / 0.24, 1.3)));
          const girth = Math.min(1, (head - tail) / 0.22);
          const arch = st.k === 0 ? 1.5 : 1.22;
          st.tube.update(Math.max(0, tail), head, (s, o) => {
            o[0] = st.k * 0.55 * s;
            o[1] = 0.45 * (1 - s) + 0.06 * s + arch * 4 * s * (1 - s);
            o[2] = 0.10 + (zl - 0.10) * s;
          }, u => st.prof(u) * girth);
        }
        if (!landed && age >= hit) {
          landed = true;
          this.splash(inst, [0, 0.12, zl], 16, 3.0, [0, 1, 0], 1.8);
        }
        const bt = (age - hit) / 0.42;
        if (bt > 0 && bt < 1) {
          burst.tube.geo.setDrawRange(0, Infinity);
          burst.mat.uniforms.uTime.value = this.clock;
          const h = 1.15 * Math.sin(Math.PI * Math.pow(bt, 0.7));
          burst.tube.update(0, 1, (s, o) => { o[0] = 0; o[1] = 0.02 + s * Math.max(0.05, h); o[2] = zl; },
            u => 0.26 * (1 - 0.55 * u) * (1 - bt * 0.5) * (u > 0.9 ? Math.sqrt(Math.max(0, 1 - ((u - 0.9) / 0.1) ** 2)) : 1));
        } else burst.tube.geo.setDrawRange(0, 0);
      });
    }
  }

  // ---------------------------------------------------------------- 1 WIND (in addition to the hairline ribbon)

  private wind(inst: FormInstance, combo: number, dur: number) {
    const T = this.T;
    const hit = dur * 0.45;
    const crescent = (roll: number, t0: number, o: {y0?: number; rise?: number; reach?: number; size?: number; x?: number; pitch?: number} = {}) => {
      const size = o.size ?? 1;
      const mat = this.kit.wind({lines: 3, flow: 5.5, body: 0.2});
      const holder = new T.Group();
      holder.rotation.z = roll;
      inst.anchor.add(holder);
      const m = this.mesh(inst, crescentGeo(T, 1.0 * size, 0.38 * size, 2.5, 28, 0.05 * size), mat, 26, holder);
      // Leading edge lifted, so a flat blade still shows its face to a camera behind and above the slime.
      m.rotation.x = o.pitch ?? -0.42;
      const life = 0.34;
      holder.visible = false;
      inst.life = Math.max(inst.life, t0 + life + 0.02);
      inst.steps.push(age => {
        const t = (age - t0) / life;
        holder.visible = t >= 0 && t < 1;
        if (!holder.visible) return;
        const fly = easeOut(t, 2.2);
        holder.position.set(o.x ?? 0, (o.y0 ?? 0.38) + (o.rise ?? 0) * fly, 0.85 + (o.reach ?? 1.9) * fly);
        m.scale.setScalar(0.78 + 0.5 * fly);
        mat.uniforms.uTime.value = this.clock;
        mat.uniforms.uAlpha.value = Math.pow(1 - t, 1.2) * Math.min(1, t / 0.08);
      });
    };
    const leaves = (count: number, y: number) => {
      for (let i = 0; i < count; i++) {
        this.puff(inst, [(rand() - 0.5) * 0.9, y + (rand() - 0.5) * 0.4, 1.0 + rand() * 0.5], [(rand() - 0.5) * 2, 0.3 + rand(), 4 + rand() * 4], {
          life: 0.3 + rand() * 0.25, size: 0.7 + rand() * 0.6, shape: i % 3 === 0 ? 1 : 3, grav: 0.6, drag: 2.4,
          swirl: (rand() < 0.5 ? -1 : 1) * 6, spin: 12, from: WIND.core, to: WIND.accent,
        });
      }
    };

    if (combo === 0) {
      crescent(0.2, hit * 0.7);
      leaves(6, 0.4);
    } else if (combo === 1) {
      crescent(0.62, hit * 0.6);
      crescent(-0.62, hit * 0.6 + 0.035);
      leaves(8, 0.45);
    } else if (combo === 2) {
      crescent(Math.PI * 0.5, hit * 0.6, {rise: 0.9, reach: 1.5, y0: 0.5, pitch: 0});
      crescent(Math.PI * 0.5, hit * 0.6 + 0.05, {rise: 0.55, reach: 1.1, y0: 0.4, size: 0.7, pitch: 0});
      leaves(8, 0.8);
    } else {
      // Finisher: three tapes wind up around the slime into a short-lived cyclone.
      const t0 = hit * 0.5, life = 0.52;
      const holder = new T.Group();
      holder.position.y = 0.05;
      inst.anchor.add(holder);
      const mats: any[] = [];
      for (let k = 0; k < 3; k++) {
        const mat = this.kit.wind({lines: 2, flow: 6.5, body: 0.2});
        mats.push(mat);
        this.mesh(inst, helixRibbonGeo(T, {turns: 1.25, height: 1.9, r0: 0.45, r1: 1.35, width: 0.28, phase: k * Math.PI * 2 / 3, flare: 1.4}), mat, 26, holder);
      }
      holder.visible = false;
      inst.life = Math.max(inst.life, t0 + life + 0.02);
      let spun = false;
      inst.steps.push((age, dt) => {
        const t = (age - t0) / life;
        holder.visible = t >= 0 && t < 1;
        if (!holder.visible) return;
        holder.rotation.y -= dt * 13;
        const grow = easeOut(t / 0.4, 2);
        holder.scale.set(0.5 + 0.5 * grow, 0.35 + 0.65 * grow, 0.5 + 0.5 * grow);
        for (const mat of mats) {
          mat.uniforms.uTime.value = this.clock;
          mat.uniforms.uAlpha.value = Math.min(1, t / 0.1) * Math.pow(1 - t, 1.1);
        }
        if (!spun) {
          spun = true;
          for (let i = 0; i < 18; i++) {
            const a = (i / 18) * Math.PI * 2;
            const r = 0.5 + rand() * 0.7;
            this.puff(inst, [Math.cos(a) * r, 0.15 + rand() * 0.5, Math.sin(a) * r], [-Math.sin(a) * 4.5, 1.6 + rand() * 1.6, Math.cos(a) * 4.5], {
              life: 0.5 + rand() * 0.3, size: 0.8 + rand() * 0.6, shape: i % 3 === 0 ? 1 : 3, grav: 0.8, drag: 1.5, swirl: 6, spin: 16, from: WIND.core, to: WIND.accent,
            });
          }
        }
      });
    }
  }

  // ---------------------------------------------------------------- 2 FIRE

  private sparks(inst: FormInstance, at: [number, number, number], count: number, speed: number, bias: [number, number, number] = [0, 0, 0]) {
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2, e = (rand() - 0.3) * 1.3;
      const k = speed * (0.4 + rand() * 0.9);
      const v: [number, number, number] = [Math.cos(a) * Math.cos(e) * k + bias[0], Math.sin(e) * k + 1 + bias[1], Math.sin(a) * Math.cos(e) * k + bias[2]];
      if (i % 3 === 0) this.puff(inst, at, v, {life: 0.2 + rand() * 0.22, size: 0.6 + rand() * 0.5, shape: 1, grav: -3, drag: 2.6, from: FIRE.core, to: FIRE.accent});
      else this.puff(inst, at, [v[0] * 0.5, v[1] * 0.6 + 0.8, v[2] * 0.5], {life: 0.45 + rand() * 0.45, size: 0.9 + rand() * 0.8, shape: 4, grav: 3.2, drag: 2.2, flicker: 1, from: FIRE.core, to: FIRE.edge});
    }
  }

  /** Open flame cone whose apex sits at `from`; `up` flips it into a ground-rooted pillar. */
  private flame(inst: FormInstance, from: [number, number, number], len: number, rad: number, t0: number, life: number, up = false) {
    const mat = up
      ? this.kit.fire({displace: 0.34, freq: 2.0, rise: 4.0, hot: 0.50, taper: -0.55, flowDir: [0, -1, 0]})
      : this.kit.fire({displace: 0.30, freq: 2.2, rise: 3.6, hot: 0.52, taper: 0.55, flowDir: [0, 1, 0]});
    const m = this.mesh(inst, this.kit.unit('cone'), mat, 24);
    if (up) m.rotation.x = Math.PI;
    else m.rotation.x = Math.PI * 0.5;
    m.visible = false;
    inst.life = Math.max(inst.life, t0 + life + 0.02);
    inst.steps.push(age => {
      const t = (age - t0) / life;
      m.visible = t >= 0 && t < 1;
      if (!m.visible) return;
      const grow = Math.max(0.05, easeOut(t / 0.3, 2.4));
      m.scale.set(rad * (0.7 + 0.3 * grow), len * grow, rad * (0.7 + 0.3 * grow));
      // The pillar's mouth stays on the ground: the flipped cone hangs from its apex.
      if (up) m.position.set(from[0], from[1] + len * grow, from[2]);
      else m.position.set(from[0], from[1], from[2]);
      mat.uniforms.uTime.value = this.clock;
      mat.uniforms.uProgress.value = easeIn((t - 0.35) / 0.65, 1.3);
    });
  }

  private fire(inst: FormInstance, combo: number, dur: number) {
    const T = this.T;
    const hit = dur * 0.45;
    if (combo === 0) {
      // 爆拳: a short flame lance ends in a compact detonation.
      this.flame(inst, [0, 0.36, 0.3], 1.0, 0.30, hit * 0.3, 0.28);
      const at: [number, number, number] = [0, 0.38, 1.2];
      this.blast(inst, at, 0.42, hit * 0.8, 0.42, {onStart: () => this.sparks(inst, at, 12, 3.4, [0, 0, 2])});
    } else if (combo === 1) {
      // 连爆: three detonations roll across the front one after another.
      for (let i = 0; i < 3; i++) {
        const th = (-50 + 50 * i) * Math.PI / 180;
        const at: [number, number, number] = [Math.sin(th) * 1.2, 0.40, 0.05 + Math.cos(th) * 1.2];
        this.blast(inst, at, i === 1 ? 0.40 : 0.33, hit * (0.5 + 0.32 * i), 0.38, {onStart: () => this.sparks(inst, at, 8, 3.0)});
      }
    } else if (combo === 2) {
      // 升焰: a flame pillar tears upward from under the target.
      const z0 = 1.15;
      this.flame(inst, [0, 0, z0], 2.2, 0.42, hit * 0.55, 0.46, true);
      const at: [number, number, number] = [0, 0.30, z0];
      this.blast(inst, at, 0.36, hit * 0.55, 0.36, {rise: 1.4, onStart: () => this.sparks(inst, at, 14, 2.2, [0, 4, 0])});
    } else {
      // 焰爆: a ring of fire rolls outward while spouts erupt around the slime, which stays visible in the eye.
      const t0 = hit * 0.7;
      this.decal(inst, 1, 2.0, 0, 0, [2.4, 0.95, 0.16], [0.05, 0.02, 0.015], t0, 0.75);
      const ringMat = this.kit.fire({displace: 0.30, freq: 2.4, rise: 2.2, hot: 0.55});
      const ring = this.mesh(inst, new T.TorusGeometry(1, 0.2, 10, 44).rotateX(Math.PI / 2), ringMat, 24);
      ring.position.y = 0.24;
      ring.visible = false;
      const ringLife = 0.44;
      inst.life = Math.max(inst.life, t0 + ringLife + 0.02);
      let burst = false;
      inst.steps.push(age => {
        const t = (age - t0) / ringLife;
        ring.visible = t >= 0 && t < 1;
        if (!ring.visible) return;
        const s = 0.35 + 1.4 * easeOut(t, 2.4);
        ring.scale.set(s, 1 + 0.6 * (1 - t), s);
        ringMat.uniforms.uTime.value = this.clock;
        ringMat.uniforms.uProgress.value = easeIn((t - 0.3) / 0.7, 1.4);
        if (!burst) {
          burst = true;
          this.sparks(inst, [0, 0.3, 0], 26, 4.2, [0, 2.5, 0]);
        }
      });
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + 0.3;
        this.flame(inst, [Math.cos(a) * 1.3, 0, Math.sin(a) * 1.3], 1.25 + (k % 3) * 0.2, 0.27, t0 + 0.05 + (k % 4) * 0.018, 0.42, true);
      }
    }
  }

  // ---------------------------------------------------------------- 4 DARK

  /**
   * A tear in space: two crossed quads sharing the slit axis so it holds up from any camera pitch.
   * `gape` scales how far it opens; `yaw` turns a standing rift to face along a radius.
   */
  private rift(inst: FormInstance, at: [number, number, number], len: number, roll: number, t0: number, life: number, gape = 1, yaw = 0) {
    const T = this.T;
    const mat = this.kit.rift();
    const holder = new T.Group();
    holder.position.set(at[0], at[1], at[2]);
    holder.rotation.order = 'YZX';
    holder.rotation.set(0, yaw, roll);
    inst.anchor.add(holder);
    const a = this.mesh(inst, this.kit.unit('plane'), mat, 25, holder);
    a.scale.set(len, len * 0.5, 1);
    const b = this.mesh(inst, this.kit.unit('plane'), mat, 25, holder);
    b.rotation.x = Math.PI * 0.5;
    b.scale.set(len, len * 0.5, 1);
    holder.visible = false;
    inst.life = Math.max(inst.life, t0 + life + 0.02);
    let torn = false;
    inst.steps.push(age => {
      const t = (age - t0) / life;
      holder.visible = t >= 0 && t < 1;
      if (!holder.visible) return;
      const u = mat.uniforms;
      u.uTime.value = this.clock;
      u.uDraw.value = easeOut(t / 0.16, 2) * 1.04;
      u.uOpen.value = gape * (t < 0.16 ? 0 : t < 0.42 ? backOut((t - 0.16) / 0.26) : 1 - easeIn((t - 0.62) / 0.38, 2));
      u.uFade.value = t > 0.86 ? 1 - (t - 0.86) / 0.14 : 1;
      if (!torn && t >= 0.16) {
        torn = true;
        const cr = Math.cos(roll), sr = Math.sin(roll), cyw = Math.cos(yaw), syw = Math.sin(yaw);
        for (let i = 0; i < 10; i++) {
          // Along the slit axis, expressed in the attacker's frame.
          const s = (rand() - 0.5) * len * 0.9;
          const p: [number, number, number] = [at[0] + cr * cyw * s, at[1] + sr * s, at[2] - cr * syw * s];
          if (i % 3 === 0) {
            const dir = s < 0 ? -1 : 1;
            this.puff(inst, p, [cr * cyw * dir * 3.5, sr * dir * 3.5, -cr * syw * dir * 3.5], {life: 0.22 + rand() * 0.2, size: 0.6 + rand() * 0.5, shape: 1, grav: 0, drag: 3, from: DARK.core, to: DARK.accent});
          } else {
            const a2 = rand() * Math.PI * 2, r = 0.5 + rand() * 0.5;
            const q: [number, number, number] = [p[0] + Math.cos(a2) * r, p[1] + Math.sin(a2) * r * 0.7, p[2] + (rand() - 0.5) * 0.5];
            this.puff(inst, q, [(p[0] - q[0]) * 2.6, (p[1] - q[1]) * 2.6, (p[2] - q[2]) * 2.6], {life: 0.45 + rand() * 0.3, size: 0.9 + rand() * 0.7, shape: 6, grav: 0.2, drag: 0.8, from: DARK.accent, to: DARK.main});
          }
        }
      }
    });
  }

  private dark(inst: FormInstance, combo: number, dur: number) {
    const hit = dur * 0.45;
    if (combo === 0) {
      // 一线裂: space is cut once, hangs open, and seals.
      this.rift(inst, [0, 0.42, 1.15], 2.1, 0.17, hit * 0.3, 0.55);
    } else if (combo === 1) {
      // 爪痕: three parallel tears, like a claw dragged through the air.
      const roll = -0.9;
      for (let i = 0; i < 3; i++) {
        const off = (i - 1) * 0.25;
        this.rift(inst, [-Math.sin(roll) * off, 0.5 + Math.cos(roll) * off, 1.15], i === 1 ? 1.95 : 1.6, roll, hit * 0.25 + i * 0.035, 0.5, 0.5);
      }
    } else if (combo === 2) {
      // 十字裂: two tears cross and open together.
      this.rift(inst, [0, 0.62, 1.15], 2.3, 0.785, hit * 0.25, 0.58, 0.8);
      this.rift(inst, [0, 0.62, 1.17], 2.3, -0.785, hit * 0.25 + 0.06, 0.58, 0.8);
    } else {
      // 蚀界: a hollow void shell swells around the slime and collapses; rifts stand up along its rim.
      const t0 = hit * 0.5, life = 0.62;
      this.decal(inst, 2, 2.3, 0, 0, [2.0, 0.55, 2.2], [0.02, 0.006, 0.05], t0, 0.8);
      const shellMat = this.kit.voidShell({center: 0.10, pow: 1.5});
      const shell = this.mesh(inst, this.kit.unit('sphere'), shellMat, 24);
      shell.position.y = 0.35;
      const flashMat = this.kit.flash([1.9, 0.7, 2.3], 0);
      const flash = this.mesh(inst, this.kit.unit('sphere'), flashMat, 26);
      flash.position.y = 0.35;
      shell.visible = false;
      inst.life = Math.max(inst.life, t0 + life + 0.02);
      let pulled = false;
      inst.steps.push(age => {
        const t = (age - t0) / life;
        shell.visible = t >= 0 && t < 1;
        flash.visible = shell.visible;
        if (!shell.visible) return;
        const collapse = easeIn((t - 0.72) / 0.22, 2.4);
        shell.scale.setScalar(Math.max(0.03, (0.3 + 1.65 * easeOut(t / 0.34, 2.6)) * (1 - collapse)));
        shellMat.uniforms.uTime.value = this.clock;
        shellMat.uniforms.uAlpha.value = Math.min(1, t / 0.08);
        const pop = sat((t - 0.90) / 0.10);
        flashMat.uniforms.uAlpha.value = t > 0.90 ? (1 - pop) * 1.2 : 0;
        flash.scale.setScalar(0.25 + pop * 1.1);
        if (!pulled) {
          pulled = true;
          for (let i = 0; i < 30; i++) {
            const a = (i / 30) * Math.PI * 2, r = 2.1 + rand() * 0.6;
            this.puff(inst, [Math.cos(a) * r, 0.2 + rand() * 0.7, Math.sin(a) * r], [-Math.cos(a) * 3.6 - Math.sin(a) * 1.5, 0.3, -Math.sin(a) * 3.6 + Math.cos(a) * 1.5], {
              life: 0.5 + rand() * 0.25, size: 1.0 + rand() * 0.7, shape: i % 3 === 0 ? 1 : 6, grav: 0.2, drag: 0.9, from: DARK.accent, to: DARK.main,
            });
          }
        }
      });
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 0.26;
        this.rift(inst, [Math.sin(a) * 1.5, 0.75, Math.cos(a) * 1.5], 1.35, Math.PI * 0.5, t0 + 0.06 + k * 0.022, 0.5, 0.5, a);
      }
    }
  }

  // ---------------------------------------------------------------- 5 PHYSICAL

  /** Stone gauntlet facing +Z: palm block, four knuckles, a thumb and two forearm boulders. */
  private fist(inst: FormInstance, size: number, mat: any) {
    const T = this.T;
    const g = new T.Group();
    inst.anchor.add(g);
    this.mesh(inst, stoneBoxGeo(T, size, size * 0.82, size * 0.95, 3), mat, 20, g);
    for (let k = 0; k < 4; k++) {
      const kn = this.mesh(inst, stoneBoxGeo(T, size * 0.25, size * 0.30, size * 0.36, 5 + k, 0.2), mat, 20, g);
      kn.position.set((k - 1.5) * size * 0.25, size * 0.17, size * 0.50);
    }
    const thumb = this.mesh(inst, stoneBoxGeo(T, size * 0.28, size * 0.30, size * 0.5, 11), mat, 20, g);
    thumb.position.set(size * 0.52, -size * 0.10, size * 0.16);
    const arm1 = this.mesh(inst, rockGeo(T, size * 0.38, 7), mat, 20, g);
    arm1.position.z = -size * 0.78;
    const arm2 = this.mesh(inst, rockGeo(T, size * 0.28, 9), mat, 20, g);
    arm2.position.z = -size * 1.32;
    // Speed lines trail behind the knuckles and stretch with velocity.
    const lineMat = this.kit.flash([1.7, 1.45, 0.95], 0, 0.4);
    const lineGeo = new T.BoxGeometry(0.016, 0.016, 1).translate(0, 0, -0.5);
    const lines: any[] = [];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const l = this.mesh(inst, lineGeo, lineMat, 26, g);
      l.position.set(Math.cos(a) * size * 0.62, Math.sin(a) * size * 0.5, -size * 0.2);
      lines.push(l);
    }
    const setSpeed = (v: number) => {
      lineMat.uniforms.uAlpha.value = sat(v / 9) * 0.9;
      for (const l of lines) l.scale.z = 0.2 + Math.min(1.4, v * 0.1);
    };
    return {g, setSpeed};
  }

  /** Vertical air-pressure ring left hanging where a heavy blow stops dead. */
  private pressure(inst: FormInstance, at: [number, number, number], R: number, t0: number, yaw = 0) {
    const mat = this.kit.flash([1.6, 1.4, 1.0], 0, 0.5);
    const m = this.mesh(inst, this.kit.unit('torus'), mat, 26);
    m.position.set(at[0], at[1], at[2]);
    m.rotation.y = yaw;
    m.visible = false;
    const life = 0.24;
    inst.life = Math.max(inst.life, t0 + life + 0.02);
    inst.steps.push(age => {
      const t = (age - t0) / life;
      m.visible = t >= 0 && t < 1;
      if (!m.visible) return;
      m.scale.setScalar(R * (0.2 + 0.8 * easeOut(t, 3)));
      mat.uniforms.uAlpha.value = (1 - t) * 0.9;
    });
  }

  private chips(inst: FormInstance, at: [number, number, number], count: number, speed: number, up = 3) {
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const k = speed * (0.4 + rand() * 0.8);
      if (i % 4 === 0) this.puff(inst, at, [Math.cos(a) * k * 1.4, 0.5 + rand(), Math.sin(a) * k * 1.4], {life: 0.16 + rand() * 0.12, size: 0.9, shape: 1, grav: 0, drag: 6, from: ROCK.core, to: ROCK.main});
      else this.puff(inst, at, [Math.cos(a) * k, up * (0.5 + rand() * 0.8), Math.sin(a) * k], {life: 0.5 + rand() * 0.3, size: 0.7 + rand() * 0.8, shape: 7, grav: -13, drag: 0.6, spin: 9, from: ROCK.main, to: ROCK.edge});
    }
  }

  private dust(inst: FormInstance, at: [number, number, number], R: number, t0: number, life = 0.5) {
    this.blast(inst, at, R, t0, life, {palette: DUST_PALETTE, hot: 0.30, rise: 0.7, alpha: 0.85});
  }

  private physical(inst: FormInstance, combo: number, dur: number) {
    const T = this.T;
    const hit = dur * 0.45;
    const gold: Rgb = [2.2, 1.5, 0.4];
    const soil: Rgb = [0.07, 0.05, 0.035];

    if (combo === 0) {
      // 岩拳: a stone fist cocks back, slams out and stops dead on a ring of displaced air.
      inst.life = hit + 0.42;
      const mat = this.kit.rock({glow: 0.5});
      const {g, setSpeed} = this.fist(inst, 0.60, mat);
      let prevZ = 0.42, struck = false;
      this.pressure(inst, [0, 0.46, 1.70], 1.0, hit);
      this.dust(inst, [0, 0.42, 1.68], 0.30, hit, 0.4);
      inst.steps.push((age, dt) => {
        const wind = hit * 0.28;
        const z = age < wind ? 0.42 - 0.16 * easeOut(age / wind, 2) : 0.26 + 1.09 * easeOut((age - wind) / (hit - wind), 4);
        g.position.set(0, 0.46, z);
        setSpeed(dt > 0 ? Math.abs(z - prevZ) / dt : 0);
        prevZ = z;
        const out = easeIn((age - hit - 0.10) / 0.28, 1.4);
        mat.uniforms.uDissolve.value = out * 1.05;
        g.scale.setScalar(age < 0.05 ? 0.4 + 12 * age : 1);
        if (!struck && age >= hit) {
          struck = true;
          this.chips(inst, [0, 0.46, 1.68], 12, 2.8, 2.2);
        }
      });
    } else if (combo === 1) {
      // 横扫: the fist comes round in a heavy hook.
      inst.life = hit + 0.48;
      const mat = this.kit.rock({glow: 0.5});
      const {g, setSpeed} = this.fist(inst, 0.62, mat);
      const R = 1.25;
      let prev = 85, struck = false;
      const end = hit * 1.15;
      inst.steps.push((age, dt) => {
        const wind = hit * 0.3;
        const k = age < wind ? 0 : easeOut((age - wind) / (end - wind), 2.6);
        const deg = 85 - 140 * k + (age < wind ? 8 * easeOut(age / wind, 2) : 0);
        const th = deg * Math.PI / 180;
        g.position.set(Math.sin(th) * R, 0.46, 0.10 + Math.cos(th) * R * 0.92);
        g.rotation.y = Math.atan2(-Math.cos(th), Math.sin(th));
        setSpeed(dt > 0 ? Math.abs(deg - prev) * Math.PI / 180 * R / dt : 0);
        prev = deg;
        mat.uniforms.uDissolve.value = easeIn((age - end - 0.08) / 0.28, 1.4) * 1.05;
        g.scale.setScalar(age < 0.05 ? 0.4 + 12 * age : 1);
        if (!struck && age >= end) {
          struck = true;
          const p: [number, number, number] = [Math.sin(th) * R, 0.46, 0.10 + Math.cos(th) * R * 0.92];
          this.chips(inst, p, 12, 2.6, 2.2);
        }
      });
      const thEnd = -55 * Math.PI / 180;
      this.dust(inst, [Math.sin(thEnd) * R * 1.15, 0.36, 0.10 + Math.cos(thEnd) * R * 1.05], 0.28, end, 0.42);
    } else if (combo === 2) {
      // 上挑: a stone column erupts from the ground, leaning into the target.
      inst.life = hit + 0.58;
      const z0 = 1.15;
      const mat = this.kit.rock({glow: 0.75});
      const holder = new T.Group();
      holder.position.set(0, 0, z0);
      inst.anchor.add(holder);
      const main = this.mesh(inst, shardGeo(T, 0.34, 1.9, 6, 4, 0.7), mat, 20, holder);
      main.rotation.x = 0.24;
      const sides: any[] = [];
      for (let k = 0; k < 3; k++) {
        const a = k * 2.1 + 0.6;
        const s = this.mesh(inst, shardGeo(T, 0.16, 0.7 + k * 0.16, 5, 13 + k), mat, 20, holder);
        s.position.set(Math.cos(a) * 0.36, 0, Math.sin(a) * 0.30);
        s.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
        sides.push(s);
      }
      this.decal(inst, 3, 0.95, 0, z0, gold, soil, hit * 0.35, 0.7);
      this.dust(inst, [0, 0.2, z0], 0.36, hit * 0.4, 0.5);
      let struck = false;
      inst.steps.push(age => {
        const rise = backOut((age - hit * 0.35) / (hit * 0.65));
        main.scale.set(1, Math.max(0.02, age < hit * 0.35 ? 0.02 : rise), 1);
        for (let k = 0; k < sides.length; k++) sides[k].scale.setScalar(Math.max(0.02, backOut((age - hit * 0.45 - k * 0.02) / (hit * 0.5))));
        mat.uniforms.uDissolve.value = easeIn((age - hit - 0.22) / 0.34, 1.3) * 1.05;
        if (!struck && age >= hit * 0.6) {
          struck = true;
          this.chips(inst, [0, 0.3, z0], 14, 2.2, 5);
        }
      });
    } else {
      // 砸地: a hammer block drops out of the air and buckles the ground into a ring of upturned slabs.
      inst.life = hit + 0.72;
      const z0 = 1.3;
      const mat = this.kit.rock({glow: 0.6});
      const shardMat = this.kit.rock({glow: 0.85});
      const block = this.mesh(inst, stoneBoxGeo(T, 0.95, 0.80, 0.95, 21, 0.14, 0.15), mat, 20);
      const band = this.mesh(inst, stoneBoxGeo(T, 1.04, 0.2, 1.04, 23, 0.06, 0.1), shardMat, 20, block);
      band.position.y = -0.16;
      const fall = hit * 0.2;
      const shards: {m: any; delay: number}[] = [];
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + 0.2;
        const m = this.mesh(inst, shardGeo(T, 0.20 + (k % 3) * 0.04, 0.62 + (k % 3) * 0.2, 5, 30 + k, 0.4), shardMat, 20);
        m.position.set(Math.cos(a) * 0.98, 0, z0 + Math.sin(a) * 0.98);
        m.rotation.set(Math.sin(a) * 0.5, a, -Math.cos(a) * 0.5);
        m.scale.setScalar(0.02);
        shards.push({m, delay: (k % 4) * 0.015});
      }
      this.decal(inst, 3, 2.0, 0, z0, gold, soil, hit, 0.7);
      this.decal(inst, 4, 2.6, 0, z0, [0.85, 0.76, 0.60], [0.5, 0.45, 0.36], hit, 0.45, 0.07);
      this.dust(inst, [0.55, 0.2, z0 + 0.2], 0.38, hit, 0.55);
      this.dust(inst, [-0.5, 0.2, z0 - 0.3], 0.34, hit + 0.03, 0.55);
      let struck = false;
      inst.steps.push(age => {
        const drop = easeIn((age - fall) / (hit - fall), 2.2);
        const squash = age >= hit ? Math.exp(-(age - hit) * 14) * 0.22 : 0;
        block.position.set(0, 2.6 - 2.2 * drop - squash * 0.3, z0);
        block.scale.set((1 + squash * 0.6) * Math.min(1, 0.3 + age * 9), (1 - squash) * Math.min(1, 0.3 + age * 9), (1 + squash * 0.6) * Math.min(1, 0.3 + age * 9));
        block.rotation.y = 0.3 + (1 - drop) * 0.5;
        mat.uniforms.uDissolve.value = easeIn((age - hit - 0.20) / 0.34, 1.3) * 1.05;
        shardMat.uniforms.uDissolve.value = easeIn((age - hit - 0.36) / 0.34, 1.3) * 1.05;
        for (const s of shards) s.m.scale.setScalar(Math.max(0.02, backOut((age - hit - s.delay) / 0.13)));
        if (!struck && age >= hit) {
          struck = true;
          this.chips(inst, [0, 0.15, z0], 24, 3.6, 4.5);
        }
      });
    }
  }
}
