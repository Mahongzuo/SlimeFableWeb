import {clamp, smooth, type Vec} from './types';

/**
 * UE USlimePathSwordComponent exact authoring parameters (converted cm -> m, Z-up -> Y-up).
 */
export const SLASH_CONFIG = {
  hiltRadius: 0.36,
  heightOffset: 0.28,
  bladeLength: 1.24,
  bladeTiltY: 0.18,
  swingHalfAngleDeg: 100,
  diagonalPitchDeg: 42,
  normalScale: 0.85,
  finisherScale: 1.30,
  lingerSeconds: 0.35,
  segments: 36,
} as const;

export interface ElementSlashStyle {
  id: number;
  name: string;
  main: [number, number, number];
  core: [number, number, number];
  edge: [number, number, number];
  particle: number;
  /** 0=water ripple, 1=wind razor, 2=fire flame, 3=lightning jag, 4=dark void, 5=physical gleam */
  pattern: number;
  lift: number;
}

export const ELEMENT_SLASH_STYLES: readonly ElementSlashStyle[] = [
  // 0 Water: rich azure water crescent + ice-white foam core + deep cobalt splash rim
  {id: 0, name: '水', main: [0.18, 0.56, 0.96], core: [0.85, 0.97, 1.0], edge: [0.06, 0.30, 0.78], particle: 0x66c2ff, pattern: 0, lift: 0.3},
  // 1 Wind: crisp emerald blade + pale mint-white inner wind streak
  {id: 1, name: '风', main: [0.16, 0.78, 0.48], core: [0.88, 1.0, 0.92], edge: [0.06, 0.45, 0.28], particle: 0x7ef0a8, pattern: 1, lift: 1.4},
  // 2 Fire: blazing orange-gold blade + incandescent yellow-white core + crimson scorch rim
  {id: 2, name: '火', main: [0.98, 0.42, 0.08], core: [1.0, 0.95, 0.62], edge: [0.78, 0.12, 0.04], particle: 0xff8c2b, pattern: 2, lift: 1.8},
  // 3 Lightning: electric violet arc + dazzling white-lavender plasma vein
  {id: 3, name: '雷', main: [0.56, 0.28, 0.98], core: [0.96, 0.92, 1.0], edge: [0.28, 0.08, 0.72], particle: 0xc9a8ff, pattern: 3, lift: 0.6},
  // 4 Dark: abyssal ink void core + haunted violet-silver eroded edge
  {id: 4, name: '暗', main: [0.10, 0.08, 0.16], core: [0.68, 0.48, 0.95], edge: [0.04, 0.03, 0.07], particle: 0x4b3b66, pattern: 4, lift: 0.9},
  // 5 Physical: warm gilded steel-white sword qi + bronze-gold trail edge
  {id: 5, name: '物', main: [0.92, 0.78, 0.46], core: [1.0, 0.99, 0.92], edge: [0.55, 0.42, 0.24], particle: 0xf4dca0, pattern: 5, lift: 0.2},
];

export interface SwingTrajectory {
  startYawDeg: number;
  endYawDeg: number;
  startPitchDeg: number;
  endPitchDeg: number;
  scale: number;
  isFinisher: boolean;
}

/** Exact port of UE USlimePathSwordComponent::PlaySwing 4-hit combo swing angles. */
export function computeSwingTrajectory(comboIndex: number): SwingTrajectory {
  const half = SLASH_CONFIG.swingHalfAngleDeg;
  const diag = SLASH_CONFIG.diagonalPitchDeg;
  switch (comboIndex) {
    case 1: // 2nd hit: left -> right
      return {startYawDeg: -half, endYawDeg: half, startPitchDeg: 0, endPitchDeg: 0, scale: SLASH_CONFIG.normalScale, isFinisher: false};
    case 2: // 3rd hit: upper-right -> lower-left
      return {startYawDeg: half, endYawDeg: -half, startPitchDeg: diag, endPitchDeg: -diag, scale: SLASH_CONFIG.normalScale, isFinisher: false};
    case 3: // 4th hit finisher: lower-left -> upper-right (1.25x scale)
      return {startYawDeg: -half, endYawDeg: half, startPitchDeg: -diag, endPitchDeg: diag, scale: SLASH_CONFIG.finisherScale, isFinisher: true};
    default: // 1st hit: right -> left
      return {startYawDeg: half, endYawDeg: -half, startPitchDeg: 0, endPitchDeg: 0, scale: SLASH_CONFIG.normalScale, isFinisher: false};
  }
}

const SLASH_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SLASH_FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec3 uMain;
uniform vec3 uCore;
uniform vec3 uEdge;
uniform float uPattern;
uniform float uFade;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

void main() {
  // u: 0 at trailing tail -> 1 at leading blade tip; v: 0 at inner hilt -> 1 at outer blade edge
  float u = vUv.x;
  float v = vUv.y;

  // Tapered crescent envelope: sharp leading tip, broad glowing body, wispy fading tail
  float headMask = 1.0 - smoothstep(0.88, 1.0, u);
  float tailMask = smoothstep(0.0, 0.45, u);
  float innerFade = smoothstep(0.0, 0.34, v);
  float outerFade = 1.0 - smoothstep(0.86, 1.0, v);
  float baseShape = tailMask * headMask * innerFade * outerFade;

  float n1 = noise(vec2(u * 9.0 - uTime * 7.0, v * 5.0));
  float n2 = noise(vec2(u * 20.0 - uTime * 13.0, v * 10.0));
  float streak = 0.0;
  float coreMask = smoothstep(0.55, 0.90, v) * smoothstep(0.28, 0.94, u) * headMask;
  float alphaMod = 1.0;

  if (uPattern < 0.5) {
    // 0 WATER: liquid ripple crests + bright seafoam ridge
    float wave = sin(u * 26.0 - v * 9.0 - uTime * 14.0) * 0.5 + 0.5;
    streak = smoothstep(0.35, 0.85, wave * 0.6 + n1 * 0.55);
    coreMask = max(coreMask, smoothstep(0.76, 0.93, v) * (0.65 + 0.35 * wave) * tailMask * headMask);
    alphaMod = 0.72 + 0.35 * n1;
  } else if (uPattern < 1.5) {
    // 1 WIND: crisp layered speed-ribbons
    float band1 = exp(-pow((v - 0.82) * 10.0, 2.0));
    float band2 = exp(-pow((v - 0.54) * 12.0, 2.0)) * 0.75;
    float band3 = exp(-pow((v - 0.30) * 14.0, 2.0)) * 0.4;
    streak = clamp(band1 + band2 + band3, 0.0, 1.0);
    coreMask = band1 * smoothstep(0.15, 0.9, u) * headMask;
    alphaMod = 0.45 + 0.75 * streak;
  } else if (uPattern < 2.5) {
    // 2 FIRE: eroded licking flames along outer edge + molten inner ribbon
    float flameErode = smoothstep(0.25, 0.82, n1 * 0.65 + n2 * 0.35 + (v - 0.3) * 0.55);
    streak = flameErode;
    coreMask = smoothstep(0.62, 0.91, v) * (0.6 + 0.4 * n2) * smoothstep(0.2, 0.92, u) * headMask;
    alphaMod = mix(0.55, 1.15, flameErode);
  } else if (uPattern < 3.5) {
    // 3 LIGHTNING: jagged high-frequency electric arcs
    float bolt = abs(v - (0.68 + (n2 - 0.5) * 0.32 * sin(u * 28.0 + uTime * 35.0)));
    float arcLine = 1.0 - smoothstep(0.02, 0.14, bolt);
    float flicker = 0.75 + 0.25 * sin(uTime * 75.0 + u * 18.0);
    streak = arcLine * flicker;
    coreMask = max(coreMask * 0.8, arcLine * tailMask * headMask);
    alphaMod = (0.6 + 0.65 * arcLine) * flicker;
  } else if (uPattern < 4.5) {
    // 4 DARK: deep ink slash with glowing ghostly violet rim
    float voidEdge = smoothstep(0.68, 0.94, v) * (0.5 + 0.5 * n1);
    float darkBody = smoothstep(0.15, 0.75, n1 * 0.7 + n2 * 0.3);
    streak = voidEdge;
    coreMask = voidEdge * tailMask * headMask;
    alphaMod = 0.78 + 0.30 * darkBody;
  } else {
    // 5 PHYSICAL: razor-clean sword qi with sharp specular spine
    float spine = exp(-pow((v - 0.78) * 9.0, 2.0));
    streak = spine;
    coreMask = max(coreMask * 0.85, spine * smoothstep(0.12, 0.95, u) * headMask);
    alphaMod = 0.75 + 0.35 * spine;
  }

  vec3 col = mix(uEdge, uMain, smoothstep(0.15, 0.75, v) * (0.65 + 0.35 * streak));
  col = mix(col, uCore, clamp(coreMask * 1.15, 0.0, 1.0));
  // Subtle bright highlight right at the blade tip
  col = mix(col, uCore, smoothstep(0.80, 0.96, u) * smoothstep(0.45, 0.9, v) * 0.7);

  float alpha = clamp(baseShape * alphaMod * uFade * 1.35, 0.0, 0.95);
  if (alpha < 0.015) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

const RING_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const RING_FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec3 uMain;
uniform vec3 uCore;
uniform float uProgress;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float band = smoothstep(0.62, 0.84, r) * (1.0 - smoothstep(0.84, 1.0, r));
  float core = smoothstep(0.76, 0.84, r) * (1.0 - smoothstep(0.84, 0.92, r));
  float fade = (1.0 - uProgress) * (1.0 - uProgress);
  vec3 col = mix(uMain, uCore, core);
  float alpha = band * fade * 0.88;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

interface SlashSlot {
  active: boolean;
  element: number;
  origin: Vec;
  forward: Vec;
  traj: SwingTrajectory;
  duration: number;
  elapsed: number;
  linger: number;
  spawnAcc: number;
  mesh: any;
  positions: Float32Array;
  mat: any;
  ringMesh: any;
  ringMat: any;
  ringActive: boolean;
  ringElapsed: number;
}

interface DebrisParticle {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  size: number;
  spin: number;
  color: number;
  lift: number;
}

const SLOT_COUNT = 3;
const PARTICLE_COUNT = 96;

/**
 * 3D 6-element sword-slash ribbon + shockwave + pooled elemental debris VFX.
 * Attached to layer 1 so it renders crisply on screen without distorting inside slime refraction.
 */
export class SlashVfxSystem {
  private T: any;
  private root: any;
  private slots: SlashSlot[] = [];
  private nextSlot = 0;
  private particles: DebrisParticle[] = [];
  private particleMesh: any;
  private m4: any;
  private q: any;
  private eul: any;
  private vPos: any;
  private vScale: any;
  private col: any;
  private activeCount = 0;

  constructor(private ctx: {THREE: any; scene: any}) {
    this.T = ctx.THREE;
    this.root = new this.T.Group();
    this.root.name = 'slime-slash-vfx';
    ctx.scene.add(this.root);

    this.m4 = new this.T.Matrix4();
    this.q = new this.T.Quaternion();
    this.eul = new this.T.Euler();
    this.vPos = new this.T.Vector3();
    this.vScale = new this.T.Vector3();
    this.col = new this.T.Color();

    const segs = SLASH_CONFIG.segments;
    for (let s = 0; s < SLOT_COUNT; s++) {
      const vertCount = (segs + 1) * 2;
      const positions = new Float32Array(vertCount * 3);
      const uvs = new Float32Array(vertCount * 2);
      const indices: number[] = [];
      for (let i = 0; i <= segs; i++) {
        const u = i / segs;
        uvs[i * 4 + 0] = u;
        uvs[i * 4 + 1] = 0;
        uvs[i * 4 + 2] = u;
        uvs[i * 4 + 3] = 1;
        if (i < segs) {
          const a = i * 2;
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const geo = new this.T.BufferGeometry();
      geo.setAttribute('position', new this.T.BufferAttribute(positions, 3).setUsage(this.T.DynamicDrawUsage));
      geo.setAttribute('uv', new this.T.BufferAttribute(uvs, 2));
      geo.setIndex(indices);

      const mat = new this.T.ShaderMaterial({
        vertexShader: SLASH_VERT,
        fragmentShader: SLASH_FRAG,
        transparent: true,
        depthWrite: false,
        side: this.T.DoubleSide,
        uniforms: {
          uMain: {value: new this.T.Vector3(0.2, 0.55, 0.95)},
          uCore: {value: new this.T.Vector3(0.9, 0.98, 1.0)},
          uEdge: {value: new this.T.Vector3(0.05, 0.25, 0.75)},
          uPattern: {value: 0},
          uFade: {value: 1},
          uTime: {value: 0},
        },
      });
      const mesh = new this.T.Mesh(geo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.renderOrder = 25;
      mesh.layers.set(1);
      this.root.add(mesh);

      const ringMat = new this.T.ShaderMaterial({
        vertexShader: RING_VERT,
        fragmentShader: RING_FRAG,
        transparent: true,
        depthWrite: false,
        side: this.T.DoubleSide,
        uniforms: {
          uMain: {value: new this.T.Vector3(1, 0.5, 0.1)},
          uCore: {value: new this.T.Vector3(1, 0.95, 0.7)},
          uProgress: {value: 0},
        },
      });
      const ringGeo = new this.T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
      const ringMesh = new this.T.Mesh(ringGeo, ringMat);
      ringMesh.visible = false;
      ringMesh.renderOrder = 24;
      ringMesh.layers.set(1);
      this.root.add(ringMesh);

      this.slots.push({
        active: false,
        element: 0,
        origin: [0, 0, 0],
        forward: [0, 0, -1],
        traj: computeSwingTrajectory(0),
        duration: 0.22,
        elapsed: 0,
        linger: 0,
        spawnAcc: 0,
        mesh,
        positions,
        mat,
        ringMesh,
        ringMat,
        ringActive: false,
        ringElapsed: 0,
      });
    }

    // Pooled elemental debris sparks
    const pGeo = new this.T.OctahedronGeometry(0.055, 0);
    const pMat = new this.T.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.92, depthWrite: false});
    this.particleMesh = new this.T.InstancedMesh(pGeo, pMat, PARTICLE_COUNT);
    this.particleMesh.count = 0;
    this.particleMesh.frustumCulled = false;
    this.particleMesh.renderOrder = 26;
    this.particleMesh.layers.set(1);
    this.root.add(this.particleMesh);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push({alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 0.4, size: 1, spin: 0, color: 0xffffff, lift: 0});
    }
  }

  get activeSwings(): number {
    return this.activeCount;
  }

  playSwing(element: number, comboIndex: number, origin: Vec, forward: Vec, durationSeconds: number) {
    const el = clamp(Math.floor(element), 0, ELEMENT_SLASH_STYLES.length - 1);
    const style = ELEMENT_SLASH_STYLES[el];
    const traj = computeSwingTrajectory(comboIndex);

    const slot = this.slots[this.nextSlot];
    this.nextSlot = (this.nextSlot + 1) % SLOT_COUNT;

    const fl = Math.hypot(forward[0], forward[2]) || 1;
    slot.active = true;
    slot.element = el;
    slot.origin = [...origin];
    slot.forward = [forward[0] / fl, 0, forward[2] / fl];
    slot.traj = traj;
    slot.duration = clamp(durationSeconds, 0.16, 0.42);
    slot.elapsed = 0;
    slot.linger = SLASH_CONFIG.lingerSeconds;
    slot.spawnAcc = 0;

    slot.mat.uniforms.uMain.value.set(...style.main);
    slot.mat.uniforms.uCore.value.set(...style.core);
    slot.mat.uniforms.uEdge.value.set(...style.edge);
    slot.mat.uniforms.uPattern.value = style.pattern;
    slot.mat.uniforms.uFade.value = 1;
    slot.mesh.visible = true;

    if (traj.isFinisher) {
      slot.ringActive = true;
      slot.ringElapsed = 0;
      slot.ringMat.uniforms.uMain.value.set(...style.main);
      slot.ringMat.uniforms.uCore.value.set(...style.core);
      slot.ringMat.uniforms.uProgress.value = 0;
      slot.ringMesh.position.set(origin[0], origin[1] + 0.08, origin[2]);
      slot.ringMesh.scale.set(0.8, 1, 0.8);
      slot.ringMesh.visible = true;
    }

    // Immediate opening spark burst
    this.emitTipParticles(slot, 0.08, traj.isFinisher ? 12 : 6);
    this.rebuildRibbon(slot, 0, 0.08);
  }

  /** Spawn an elemental burst at a world point (used for crop reactions/destruction & target hits). */
  spawnBurst(position: Vec, element: number, count = 16, spread = 2.4) {
    const style = ELEMENT_SLASH_STYLES[clamp(Math.floor(element), 0, ELEMENT_SLASH_STYLES.length - 1)];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = (0.4 + Math.random() * 0.9) * spread;
      this.allocParticle(
        position[0] + (Math.random() - 0.5) * 0.35,
        position[1] + 0.25 + Math.random() * 0.35,
        position[2] + (Math.random() - 0.5) * 0.35,
        Math.cos(a) * spd,
        1.2 + Math.random() * 2.2 + style.lift * 0.4,
        Math.sin(a) * spd,
        0.32 + Math.random() * 0.30,
        0.9 + Math.random() * 0.9,
        style.particle,
        style.lift,
      );
    }
  }

  reset() {
    for (const s of this.slots) {
      s.active = false;
      s.ringActive = false;
      s.mesh.visible = false;
      s.ringMesh.visible = false;
    }
    for (const p of this.particles) p.alive = false;
    this.particleMesh.count = 0;
    this.activeCount = 0;
  }

  update(dt: number, time: number, followOrigin?: Vec) {
    let active = 0;
    for (const s of this.slots) {
      if (s.ringActive) {
        s.ringElapsed += dt;
        const p = s.ringElapsed / 0.36;
        if (p >= 1) {
          s.ringActive = false;
          s.ringMesh.visible = false;
        } else {
          const eased = 1 - (1 - p) * (1 - p);
          const scale = 0.7 + eased * 3.8;
          s.ringMesh.scale.set(scale, 1, scale);
          s.ringMat.uniforms.uProgress.value = p;
        }
      }
      if (!s.active) continue;
      active++;
      s.elapsed += dt;
      s.mat.uniforms.uTime.value = time;

      if (followOrigin && s.elapsed <= s.duration) {
        // Keep active slash anchored to the lunging slime, matching UE SwingRoot
        s.origin[0] = followOrigin[0];
        s.origin[1] = followOrigin[1];
        s.origin[2] = followOrigin[2];
      }

      const total = s.duration + s.linger;
      if (s.elapsed >= total) {
        s.active = false;
        s.mesh.visible = false;
        continue;
      }

      const rawHead = clamp(s.elapsed / s.duration, 0, 1);
      const headAlpha = smooth(rawHead);
      const tailDelay = s.duration * 0.30;
      const rawTail = clamp((s.elapsed - tailDelay) / (total - tailDelay), 0, 1);
      const tailAlpha = rawTail * rawTail;

      const fade = s.elapsed <= s.duration
        ? 1.0
        : 1.0 - smooth((s.elapsed - s.duration) / Math.max(s.linger, 0.01));
      s.mat.uniforms.uFade.value = fade;

      if (s.elapsed <= s.duration) {
        s.spawnAcc += dt * (s.traj.isFinisher ? 75 : 46);
        const emitN = Math.floor(s.spawnAcc);
        if (emitN > 0) {
          s.spawnAcc -= emitN;
          this.emitTipParticles(s, headAlpha, Math.min(emitN, 5));
        }
      }

      this.rebuildRibbon(s, tailAlpha, Math.max(tailAlpha + 0.04, headAlpha));
    }
    this.activeCount = active;

    // Step debris particles
    let live = 0;
    for (const p of this.particles) {
      if (!p.alive) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.alive = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vx *= Math.exp(-dt * 2.8);
      p.vz *= Math.exp(-dt * 2.8);
      p.vy += (p.lift - 4.8) * dt;
      const t = p.age / p.life;
      const sc = p.size * (1 - t * t);
      this.vPos.set(p.x, p.y, p.z);
      this.eul.set(p.age * p.spin, p.age * p.spin * 1.3, p.age * 4);
      this.q.setFromEuler(this.eul);
      this.vScale.set(sc, sc * 1.4, sc);
      this.m4.compose(this.vPos, this.q, this.vScale);
      this.particleMesh.setMatrixAt(live, this.m4);
      this.particleMesh.setColorAt(live, this.col.setHex(p.color));
      live++;
    }
    this.particleMesh.count = live;
    if (live > 0) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private sampleBlade(slot: SlashSlot, alpha: number): {inner: Vec; outer: Vec; tangent: Vec} {
    const yawRad = ((slot.traj.startYawDeg + (slot.traj.endYawDeg - slot.traj.startYawDeg) * alpha) * Math.PI) / 180;
    const pitchRad = ((slot.traj.startPitchDeg + (slot.traj.endPitchDeg - slot.traj.startPitchDeg) * alpha) * Math.PI) / 180;
    const sc = slot.traj.scale;
    const fx = slot.forward[0], fz = slot.forward[2];
    // Right vector in Three.js Y-up: cross(forward, up) = (-fz, 0, fx)
    const rx = -fz, rz = fx;
    const cy = Math.cos(yawRad), sy = Math.sin(yawRad);
    const cp = Math.cos(pitchRad), sp = Math.sin(pitchRad);

    // Direction along blade in world space
    const horizX = fx * cy + rx * sy;
    const horizZ = fz * cy + rz * sy;
    const dx = horizX * cp;
    const dy = sp;
    const dz = horizZ * cp;

    // Tangent direction of the swing for particle launch
    const yawDir = slot.traj.endYawDeg >= slot.traj.startYawDeg ? 1 : -1;
    const tx = (-fx * sy + rx * cy) * yawDir;
    const tz = (-fz * sy + rz * cy) * yawDir;

    const px = slot.origin[0];
    const py = slot.origin[1] + SLASH_CONFIG.heightOffset;
    const pz = slot.origin[2];

    const innerR = SLASH_CONFIG.hiltRadius * sc;
    const outerR = (SLASH_CONFIG.hiltRadius + SLASH_CONFIG.bladeLength) * sc;
    const tilt = SLASH_CONFIG.bladeTiltY * sc;

    return {
      inner: [px + dx * innerR, py + dy * innerR - tilt * 0.45, pz + dz * innerR],
      outer: [px + dx * outerR, py + dy * outerR + tilt * 0.75, pz + dz * outerR],
      tangent: [tx, 0.25, tz],
    };
  }

  private rebuildRibbon(slot: SlashSlot, tailAlpha: number, headAlpha: number) {
    const segs = SLASH_CONFIG.segments;
    const pos = slot.positions;
    const span = Math.max(0.02, headAlpha - tailAlpha);
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const a = clamp(tailAlpha + span * u, 0, 1);
      const sample = this.sampleBlade(slot, a);
      const base = i * 6;
      pos[base + 0] = sample.inner[0];
      pos[base + 1] = sample.inner[1];
      pos[base + 2] = sample.inner[2];
      pos[base + 3] = sample.outer[0];
      pos[base + 4] = sample.outer[1];
      pos[base + 5] = sample.outer[2];
    }
    slot.mesh.geometry.attributes.position.needsUpdate = true;
  }

  private emitTipParticles(slot: SlashSlot, alpha: number, count: number) {
    const style = ELEMENT_SLASH_STYLES[slot.element];
    const sample = this.sampleBlade(slot, clamp(alpha, 0, 1));
    for (let i = 0; i < count; i++) {
      const f = 0.55 + Math.random() * 0.45;
      const x = sample.inner[0] + (sample.outer[0] - sample.inner[0]) * f;
      const y = sample.inner[1] + (sample.outer[1] - sample.inner[1]) * f;
      const z = sample.inner[2] + (sample.outer[2] - sample.inner[2]) * f;
      const spd = 1.4 + Math.random() * 2.2;
      this.allocParticle(
        x + (Math.random() - 0.5) * 0.14,
        y + (Math.random() - 0.5) * 0.12,
        z + (Math.random() - 0.5) * 0.14,
        sample.tangent[0] * spd + (Math.random() - 0.5) * 1.1,
        0.5 + Math.random() * 1.4 + style.lift * 0.3,
        sample.tangent[2] * spd + (Math.random() - 0.5) * 1.1,
        0.24 + Math.random() * 0.24,
        0.7 + Math.random() * 0.85,
        style.particle,
        style.lift,
      );
    }
  }

  private allocParticle(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    life: number,
    size: number,
    color: number,
    lift: number,
  ) {
    let slot = this.particles.find(p => !p.alive);
    if (!slot) {
      // Reuse oldest particle
      slot = this.particles[0];
      for (const p of this.particles) if (p.age > slot.age) slot = p;
    }
    slot.alive = true;
    slot.x = x;
    slot.y = y;
    slot.z = z;
    slot.vx = vx;
    slot.vy = vy;
    slot.vz = vz;
    slot.age = 0;
    slot.life = life;
    slot.size = size;
    slot.spin = 4 + Math.random() * 9;
    slot.color = color;
    slot.lift = lift;
  }

  dispose() {
    this.root.removeFromParent();
    for (const s of this.slots) {
      s.mesh.geometry.dispose();
      s.mat.dispose();
      s.ringMesh.geometry.dispose();
      s.ringMat.dispose();
    }
    this.particleMesh.geometry.dispose();
    this.particleMesh.material.dispose();
  }
}
