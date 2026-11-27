import {clamp, smooth, type Vec} from './types';

/**
 * Stylized Anime Multi-Hit Slash VFX Parameters (inspired by Wuthering Waves / NTE / Genshin):
 * - Dual-layer high-contrast rendering (Normal-blended deep elemental ink backing + Additive HDR razor core)
 * - Dynamic UV noise erosion with glowing burn edge & chromatic highlight split
 * - 4 distinct combo silhouettes: fast crescent -> twin-echo uppercut -> X-cross twin slash -> 248° spiral finisher
 * - Crisp anime 4-point impact cross glints & pooled Niagara-style elemental sparks
 */
export const SLASH_CONFIG = {
  hiltRadius: 0.34,
  heightOffset: 0.30,
  bladeLength: 1.28,
  bladeTiltY: 0.19,
  swingHalfAngleDeg: 96,
  diagonalPitchDeg: 42,
  normalScale: 0.88,
  finisherScale: 1.38,
  lingerSeconds: 0.36,
  segments: 40,
} as const;

export interface ElementSlashStyle {
  id: number;
  name: string;
  main: [number, number, number];
  core: [number, number, number];
  edge: [number, number, number];
  /** Deep high-saturation ink backing color (Normal-blended under HDR core for razor daylight contrast). */
  ink: [number, number, number];
  /** Chromatic split / secondary accent tint along razor edge. */
  accent: [number, number, number];
  particle: number;
  /** 0=water ripple, 1=wind razor, 2=fire flame, 3=lightning jag, 4=dark void, 5=physical gleam */
  pattern: number;
  lift: number;
}

export const ELEMENT_SLASH_STYLES: readonly ElementSlashStyle[] = [
  // 0 Water: deep cobalt ink backing + vivid cyan-azure ribbon + razor ice-white leading edge
  {id: 0, name: '水', main: [0.10, 0.62, 1.0], core: [0.88, 0.98, 1.0], edge: [0.04, 0.28, 0.82], ink: [0.02, 0.12, 0.34], accent: [0.28, 0.96, 0.92], particle: 0x66d2ff, pattern: 0, lift: 0.35},
  // 1 Wind: deep pine-teal backing + luminous emerald vacuum lines + crisp mint-gold spark edge
  {id: 1, name: '风', main: [0.12, 0.84, 0.54], core: [0.90, 1.0, 0.94], edge: [0.04, 0.44, 0.30], ink: [0.03, 0.20, 0.16], accent: [0.68, 1.0, 0.46], particle: 0x7ef5b4, pattern: 1, lift: 1.45},
  // 2 Fire: charred crimson-obsidian backing + molten orange-gold flame + incandescent white-yellow edge
  {id: 2, name: '火', main: [1.0, 0.38, 0.06], core: [1.0, 0.96, 0.68], edge: [0.82, 0.10, 0.02], ink: [0.24, 0.03, 0.02], accent: [1.0, 0.78, 0.18], particle: 0xff9232, pattern: 2, lift: 1.9},
  // 3 Lightning: abyssal indigo backing + vivid electric violet + white-magenta plasma vein
  {id: 3, name: '雷', main: [0.58, 0.26, 1.0], core: [0.98, 0.93, 1.0], edge: [0.30, 0.08, 0.82], ink: [0.10, 0.03, 0.26], accent: [0.46, 0.88, 1.0], particle: 0xd0a8ff, pattern: 3, lift: 0.65},
  // 4 Dark: obsidian void ink backing + haunted amethyst tear + spectral silver-violet rim
  {id: 4, name: '暗', main: [0.32, 0.14, 0.58], core: [0.88, 0.72, 1.0], edge: [0.12, 0.04, 0.24], ink: [0.02, 0.01, 0.05], accent: [0.92, 0.36, 0.82], particle: 0x8e62cc, pattern: 4, lift: 0.95},
  // 5 Physical: deep steel-bronze backing + gleaming champagne-gold sword qi + razor silver-white spine
  {id: 5, name: '物', main: [0.96, 0.76, 0.38], core: [1.0, 0.99, 0.94], edge: [0.58, 0.38, 0.14], ink: [0.16, 0.12, 0.08], accent: [0.76, 0.90, 1.0], particle: 0xf8e0a4, pattern: 5, lift: 0.25},
];

export interface SwingTrajectory {
  startYawDeg: number;
  endYawDeg: number;
  startPitchDeg: number;
  endPitchDeg: number;
  scale: number;
  isFinisher: boolean;
  /** Ribbon width multiplier (slimmer on fast 1st hit, wider on finisher). */
  widthScale?: number;
  /** Optional paired secondary arc for anime multi-hit combo silhouettes (echo, X-cross, outer shock arc). */
  secondary?: {
    startYawDeg: number;
    endYawDeg: number;
    startPitchDeg: number;
    endPitchDeg: number;
    scale: number;
    widthScale: number;
    delay: number;
    yOffset: number;
  };
}

/** Distinct 4-hit anime combo trajectories (fast slash -> twin-echo uppercut -> X-cross -> 248° spiral finisher). */
export function computeSwingTrajectory(comboIndex: number): SwingTrajectory {
  const half = SLASH_CONFIG.swingHalfAngleDeg;
  const diag = SLASH_CONFIG.diagonalPitchDeg;
  switch (comboIndex) {
    case 1: // 2nd hit: left -> right crisp upward reverse slash + thin trailing echo arc
      return {
        startYawDeg: -half,
        endYawDeg: half,
        startPitchDeg: -14,
        endPitchDeg: 18,
        scale: SLASH_CONFIG.normalScale * 1.04,
        isFinisher: false,
        widthScale: 0.92,
        secondary: {
          startYawDeg: -half + 12,
          endYawDeg: half + 10,
          startPitchDeg: -6,
          endPitchDeg: 26,
          scale: SLASH_CONFIG.normalScale * 1.15,
          widthScale: 0.54,
          delay: 0.028,
          yOffset: 0.10,
        },
      };
    case 2: // 3rd hit: diagonal cleave + instantaneous X-cross counter-slash
      return {
        startYawDeg: half + 4,
        endYawDeg: -half + 4,
        startPitchDeg: diag,
        endPitchDeg: -diag,
        scale: SLASH_CONFIG.normalScale * 1.10,
        isFinisher: false,
        widthScale: 0.96,
        secondary: {
          startYawDeg: -half + 6,
          endYawDeg: half - 4,
          startPitchDeg: diag - 6,
          endPitchDeg: -diag + 6,
          scale: SLASH_CONFIG.normalScale * 1.06,
          widthScale: 0.80,
          delay: 0.032,
          yOffset: 0.04,
        },
      };
    case 3: // 4th hit finisher: sweeping 248-deg spiral heavy crescent + wide outer wind-shear arc
      return {
        startYawDeg: -124,
        endYawDeg: 124,
        startPitchDeg: -30,
        endPitchDeg: 32,
        scale: SLASH_CONFIG.finisherScale,
        isFinisher: true,
        widthScale: 1.18,
        secondary: {
          startYawDeg: -116,
          endYawDeg: 132,
          startPitchDeg: -16,
          endPitchDeg: 24,
          scale: SLASH_CONFIG.finisherScale * 1.18,
          widthScale: 0.56,
          delay: 0.022,
          yOffset: 0.16,
        },
      };
    default: // 1st hit: razor-fast right -> left crescent cut
      return {
        startYawDeg: half,
        endYawDeg: -half,
        startPitchDeg: 10,
        endPitchDeg: -8,
        scale: SLASH_CONFIG.normalScale,
        isFinisher: false,
        widthScale: 0.82,
      };
  }
}

const SLASH_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const NOISE_GLSL = /* glsl */ `
float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
float fbm2(vec2 p) {
  return vnoise(p) * 0.65 + vnoise(p * 2.13 + vec2(7.3, 11.9)) * 0.35;
}
`;

/**
 * Layer 1 (Normal-blended): Deep high-saturation elemental ink silhouette backing.
 * Gives crisp anime cel-contrast even over bright sunlit grass and turquoise water!
 */
const BACKING_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uInk;
uniform vec3 uEdge;
uniform float uPattern;
uniform float uProgress;
uniform float uFade;
uniform float uTime;
${NOISE_GLSL}

void main() {
  float u = vUv.x;
  float v = vUv.y;

  // Tapered anime scythe/crescent envelope: needle-sharp leading tip, sweeping wide body, eroded tail
  float tipTap = 1.0 - smoothstep(0.84, 1.0, u);
  float tailTap = smoothstep(0.0, 0.36, u);
  float curveWidth = sin(clamp(u, 0.0, 1.0) * 3.14159265);
  float innerCut = mix(0.54, 0.14, pow(max(curveWidth, 1e-4), 0.72));
  float innerMask = smoothstep(innerCut, innerCut + 0.24, v);
  float outerMask = 1.0 - smoothstep(0.92, 1.0, v);
  float shape = tipTap * tailTap * innerMask * outerMask;

  // Dynamic UV noise erosion sweeping from tail -> tip over swing lifetime
  float nFast = fbm2(vec2(u * 11.0 - uTime * 9.5, v * 5.2));
  float erodeThreshold = uProgress * 0.82 - u * 0.42 - (v - 0.5) * 0.22;
  float erodeMask = smoothstep(erodeThreshold - 0.06, erodeThreshold + 0.12, nFast);

  // Subtle stylized streaks carved through the dark ink body
  float streakCut = smoothstep(0.18, 0.62, vnoise(vec2(u * 18.0 - uTime * 14.0, v * 3.5)) + v * 0.45);
  float alpha = shape * erodeMask * streakCut * uFade * (uPattern > 3.5 && uPattern < 4.5 ? 0.86 : 0.64);
  if (alpha < 0.02) discard;

  vec3 col = mix(uInk, uEdge * 0.72, smoothstep(0.45, 0.92, v) * 0.65);
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.88));
}
`;

/**
 * Layer 2 (Additive-blended HDR): Razor anime blade core + element-specific speed lines +
 * UV erosion glowing burn border + subtle chromatic split along outer blade rim.
 */
const SLASH_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uMain;
uniform vec3 uCore;
uniform vec3 uEdge;
uniform vec3 uAccent;
uniform float uPattern;
uniform float uProgress;
uniform float uFade;
uniform float uTime;
${NOISE_GLSL}

void main() {
  float u = vUv.x;
  float v = vUv.y;

  float tipTap = 1.0 - smoothstep(0.90, 1.0, u);
  float tailTap = smoothstep(0.0, 0.34, u);
  float arch = sin(clamp(u, 0.0, 1.0) * 3.14159265);
  float innerCut = mix(0.60, 0.18, pow(max(arch, 1e-4), 0.75));
  float innerFade = smoothstep(innerCut, innerCut + 0.22, v);
  float outerFade = 1.0 - smoothstep(0.93, 1.0, v);
  float envelope = tipTap * tailTap * innerFade * outerFade;

  float n1 = fbm2(vec2(u * 10.5 - uTime * 9.0, v * 4.8));
  float n2 = vnoise(vec2(u * 26.0 - uTime * 18.0, v * 9.5));

  // Dynamic UV erosion with high-contrast glowing burn edge (Wuthering Waves / Genshin style)
  float erodeCut = uProgress * 0.86 - u * 0.44 - smoothstep(0.76, 0.96, v) * 0.28;
  float erode = smoothstep(erodeCut - 0.05, erodeCut + 0.10, n1);
  float burnEdge = smoothstep(erodeCut - 0.04, erodeCut + 0.04, n1) * (1.0 - smoothstep(erodeCut + 0.04, erodeCut + 0.16, n1));

  // Razor-thin outer leading blade spine (strictly narrow so slash never blurs into a white banana!)
  float razorSpine = exp(-pow((v - 0.895) * 26.0, 2.0)) * smoothstep(0.14, 0.94, u) * tipTap;
  float chromaRim = exp(-pow((v - 0.825) * 18.0, 2.0)) * smoothstep(0.18, 0.90, u) * tipTap;

  // High-speed longitudinal anime brush strokes
  float speedLines = smoothstep(0.36, 0.82, vnoise(vec2(u * 22.0 - uTime * 16.0, v * 2.2)));
  float patternEnergy = 0.0;
  float coreBoost = razorSpine;

  if (uPattern < 0.5) {
    // 0 WATER: fluid ribbon streaks + crisp seafoam crest + droplet cutouts
    float wave = sin(u * 30.0 - v * 12.0 - uTime * 16.0) * 0.5 + 0.5;
    patternEnergy = smoothstep(0.30, 0.80, wave * 0.55 + n1 * 0.55) * speedLines;
    coreBoost = max(coreBoost, exp(-pow((v - 0.87 - (wave - 0.5) * 0.05) * 22.0, 2.0)) * tailTap * tipTap);
  } else if (uPattern < 1.5) {
    // 1 WIND: three razor-crisp cel vacuum speed ribbons
    float b1 = exp(-pow((v - 0.89) * 26.0, 2.0));
    float b2 = exp(-pow((v - 0.66) * 20.0, 2.0)) * 0.72;
    float b3 = exp(-pow((v - 0.44) * 18.0, 2.0)) * 0.42;
    patternEnergy = clamp(b1 + b2 + b3, 0.0, 1.0) * (0.55 + 0.45 * speedLines);
    coreBoost = max(coreBoost, b1 * 1.15 * smoothstep(0.12, 0.92, u) * tipTap);
  } else if (uPattern < 2.5) {
    // 2 FIRE: aggressive licking flame tongues + incandescent molten edge
    float flame = smoothstep(0.28, 0.78, n1 * 0.62 + n2 * 0.38 + (v - 0.42) * 0.52);
    patternEnergy = flame;
    burnEdge *= 1.55;
    coreBoost = max(coreBoost, exp(-pow((v - 0.88) * 20.0, 2.0)) * (0.65 + 0.35 * n2) * tailTap * tipTap);
  } else if (uPattern < 3.5) {
    // 3 LIGHTNING: sharp jagged electric plasma arc + crackling secondary filament
    float zig = (n2 - 0.5) * 0.24 * sin(u * 34.0 + uTime * 42.0);
    float mainBolt = 1.0 - smoothstep(0.012, 0.068, abs(v - (0.76 + zig)));
    float subBolt = 1.0 - smoothstep(0.010, 0.055, abs(v - (0.52 - zig * 0.85)));
    float flicker = 0.78 + 0.22 * sin(uTime * 80.0 + u * 22.0);
    patternEnergy = clamp(mainBolt + subBolt * 0.65, 0.0, 1.0) * flicker;
    coreBoost = max(coreBoost, mainBolt * tailTap * tipTap * 1.25);
  } else if (uPattern < 4.5) {
    // 4 DARK: eerie violet-silver dimensional rift veins over dark ink backing
    float rift = exp(-pow((v - 0.88) * 22.0, 2.0)) + exp(-pow((v - 0.56 + (n1 - 0.5) * 0.14) * 18.0, 2.0)) * 0.62;
    patternEnergy = clamp(rift * (0.65 + 0.45 * n2), 0.0, 1.0);
    coreBoost = max(coreBoost, exp(-pow((v - 0.90) * 28.0, 2.0)) * tailTap * tipTap * 1.1);
  } else {
    // 5 PHYSICAL: razor anime sword-qi with gilded dual specular ridges
    float ridge1 = exp(-pow((v - 0.89) * 26.0, 2.0));
    float ridge2 = exp(-pow((v - 0.64) * 18.0, 2.0)) * 0.52;
    patternEnergy = clamp((ridge1 + ridge2) * (0.6 + 0.4 * speedLines), 0.0, 1.0);
    coreBoost = max(coreBoost, ridge1 * 1.2 * smoothstep(0.10, 0.95, u) * tipTap);
  }

  // Vivid saturated mid-body -> chromatic edge accent -> ultra-thin blazing white-hot razor core
  vec3 bodyCol = mix(uEdge, uMain * 1.28, smoothstep(0.24, 0.82, v) * (0.52 + 0.48 * patternEnergy));
  bodyCol += uAccent * (chromaRim * 0.65 + burnEdge * 0.95);
  vec3 finalCol = mix(bodyCol, uCore * 1.45, clamp(coreBoost * 0.95 + smoothstep(0.84, 0.97, u) * razorSpine * 0.8, 0.0, 1.0));

  float alpha = envelope * erode * (0.38 + 0.62 * patternEnergy + razorSpine * 0.7 + burnEdge * 0.5) * uFade;
  if (alpha < 0.015) discard;
  gl_FragColor = vec4(finalCol * alpha, clamp(alpha, 0.0, 1.0));
}
`;

/** Crisp anime 4-point diamond impact star glint flashed at the peak of each swing. */
const GLINT_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uMain;
uniform vec3 uCore;
uniform vec3 uAccent;
uniform float uProgress;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  // Asymmetric razor 4-point star (long horizontal slash flare + vertical needle)
  float horiz = exp(-abs(p.y) * 24.0) * exp(-abs(p.x) * 2.1);
  float vert = exp(-abs(p.x) * 26.0) * exp(-abs(p.y) * 3.4);
  float diag = (exp(-abs(p.x - p.y) * 22.0) + exp(-abs(p.x + p.y) * 22.0)) * exp(-r * 5.2) * 0.45;
  float core = exp(-r * r * 26.0);
  float env = sin(clamp(uProgress, 0.0, 1.0) * 3.14159265);
  float shape = clamp(horiz + vert + diag + core * 1.2, 0.0, 1.5);
  float a = shape * env * env;
  if (a < 0.015) discard;
  vec3 col = mix(uMain * 1.35 + uAccent * 0.35, uCore * 1.9, clamp(core + horiz * 0.55, 0.0, 1.0));
  gl_FragColor = vec4(col * a, clamp(a, 0.0, 1.0));
}
`;

const RING_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const RING_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uMain;
uniform vec3 uCore;
uniform float uProgress;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float band = exp(-abs(r - 0.84) * 36.0);
  float inner = exp(-abs(r - 0.62) * 44.0) * 0.45;
  float core = exp(-abs(r - 0.84) * 68.0);
  float fade = (1.0 - uProgress) * (1.0 - uProgress);
  vec3 col = mix(uMain * 1.45, uCore * 1.85, core);
  float alpha = (band + inner) * fade * 0.92;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

const SPARK_VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
attribute float aAlpha;
attribute float aStar;
varying vec3 vColor;
varying float vAlpha;
varying float vStar;
void main() {
  vColor = aColor;
  vAlpha = aAlpha;
  vStar = aStar;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aSize * (320.0 / max(0.75, -mv.z)), 1.5, 48.0);
}
`;

const SPARK_FRAG = /* glsl */ `
precision highp float;
varying vec3 vColor;
varying float vAlpha;
varying float vStar;
void main() {
  if (vAlpha <= 0.005) discard;
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float glow = exp(-r * r * 5.2) * (1.0 - smoothstep(0.7, 1.0, r));
  float hot = exp(-r * r * 20.0);
  float crossArm = exp(-abs(p.x) * 15.0) * exp(-abs(p.y) * 2.6) + exp(-abs(p.y) * 15.0) * exp(-abs(p.x) * 2.6);
  float m = mix(glow * 0.8 + hot * 0.7, clamp(crossArm * 0.78 + hot, 0.0, 1.0), vStar);
  float a = clamp(m * vAlpha, 0.0, 1.0);
  if (a < 0.008) discard;
  vec3 col = mix(vColor * 1.35, vColor * 1.9 + vec3(0.45), hot);
  gl_FragColor = vec4(col * a, a);
}
`;

interface RibbonPair {
  geo: any;
  positions: Float32Array;
  backingMesh: any;
  backingMat: any;
  coreMesh: any;
  coreMat: any;
}

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
  primary: RibbonPair;
  secondary: RibbonPair;
  glintMesh: any;
  glintMat: any;
  glintActive: boolean;
  glintElapsed: number;
  glintDuration: number;
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

const SLOT_COUNT = 4;
const PARTICLE_COUNT = 360;

/**
 * 3D 6-element anime multi-hit sword-slash system (dark ink backing + HDR eroded razor +
 * combo-specific secondary arcs + 4-point impact cross glints + pooled sparks).
 * Attached to layer 1 so it renders crisply on screen without distorting inside slime refraction.
 */
export class SlashVfxSystem {
  private T: any;
  private root: any;
  private slots: SlashSlot[] = [];
  private nextSlot = 0;
  private particles: DebrisParticle[] = [];
  private particleMesh: any;
  private pPos = new Float32Array(PARTICLE_COUNT * 3);
  private pCol = new Float32Array(PARTICLE_COUNT * 3);
  private pSize = new Float32Array(PARTICLE_COUNT);
  private pAlpha = new Float32Array(PARTICLE_COUNT);
  private pStar = new Float32Array(PARTICLE_COUNT);
  private col: any;
  private activeCount = 0;

  constructor(private ctx: {THREE: any; scene: any}) {
    this.T = ctx.THREE;
    this.root = new this.T.Group();
    this.root.name = 'slime-slash-vfx';
    ctx.scene.add(this.root);

    this.col = new this.T.Color();

    const makeRibbonPair = (renderBase: number): RibbonPair => {
      const segs = SLASH_CONFIG.segments;
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

      const backingMat = new this.T.ShaderMaterial({
        vertexShader: SLASH_VERT,
        fragmentShader: BACKING_FRAG,
        transparent: true,
        depthWrite: false,
        blending: this.T.NormalBlending,
        side: this.T.DoubleSide,
        uniforms: {
          uInk: {value: new this.T.Vector3(0.02, 0.12, 0.34)},
          uEdge: {value: new this.T.Vector3(0.04, 0.28, 0.82)},
          uPattern: {value: 0},
          uProgress: {value: 0},
          uFade: {value: 1},
          uTime: {value: 0},
        },
      });
      const backingMesh = new this.T.Mesh(geo, backingMat);
      backingMesh.visible = false;
      backingMesh.frustumCulled = false;
      backingMesh.renderOrder = renderBase;
      backingMesh.layers.set(1);
      this.root.add(backingMesh);

      const coreMat = new this.T.ShaderMaterial({
        vertexShader: SLASH_VERT,
        fragmentShader: SLASH_FRAG,
        transparent: true,
        depthWrite: false,
        blending: this.T.AdditiveBlending,
        side: this.T.DoubleSide,
        uniforms: {
          uMain: {value: new this.T.Vector3(0.1, 0.62, 1.0)},
          uCore: {value: new this.T.Vector3(0.88, 0.98, 1.0)},
          uEdge: {value: new this.T.Vector3(0.04, 0.28, 0.82)},
          uAccent: {value: new this.T.Vector3(0.28, 0.96, 0.92)},
          uPattern: {value: 0},
          uProgress: {value: 0},
          uFade: {value: 1},
          uTime: {value: 0},
        },
      });
      const coreMesh = new this.T.Mesh(geo, coreMat);
      coreMesh.visible = false;
      coreMesh.frustumCulled = false;
      coreMesh.renderOrder = renderBase + 1;
      coreMesh.layers.set(1);
      this.root.add(coreMesh);

      return {geo, positions, backingMesh, backingMat, coreMesh, coreMat};
    };

    const glintGeo = new this.T.PlaneGeometry(1, 1);
    const ringGeo = new this.T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

    for (let s = 0; s < SLOT_COUNT; s++) {
      const primary = makeRibbonPair(24);
      const secondary = makeRibbonPair(24);

      const glintMat = new this.T.ShaderMaterial({
        vertexShader: SLASH_VERT,
        fragmentShader: GLINT_FRAG,
        transparent: true,
        depthWrite: false,
        blending: this.T.AdditiveBlending,
        side: this.T.DoubleSide,
        uniforms: {
          uMain: {value: new this.T.Vector3(0.2, 0.65, 1.0)},
          uCore: {value: new this.T.Vector3(1, 1, 1)},
          uAccent: {value: new this.T.Vector3(0.4, 0.95, 1.0)},
          uProgress: {value: 0},
        },
      });
      const glintMesh = new this.T.Mesh(glintGeo, glintMat);
      glintMesh.visible = false;
      glintMesh.frustumCulled = false;
      glintMesh.renderOrder = 26;
      glintMesh.layers.set(1);
      this.root.add(glintMesh);

      const ringMat = new this.T.ShaderMaterial({
        vertexShader: RING_VERT,
        fragmentShader: RING_FRAG,
        transparent: true,
        depthWrite: false,
        blending: this.T.AdditiveBlending,
        side: this.T.DoubleSide,
        uniforms: {
          uMain: {value: new this.T.Vector3(1, 0.5, 0.1)},
          uCore: {value: new this.T.Vector3(1, 0.95, 0.7)},
          uProgress: {value: 0},
        },
      });
      const ringMesh = new this.T.Mesh(ringGeo, ringMat);
      ringMesh.visible = false;
      ringMesh.renderOrder = 23;
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
        primary,
        secondary,
        glintMesh,
        glintMat,
        glintActive: false,
        glintElapsed: 0,
        glintDuration: 0.16,
        ringMesh,
        ringMat,
        ringActive: false,
        ringElapsed: 0,
      });
    }

    // Pooled Niagara-style HDR glowing elemental sparks & star glints
    const pGeo = new this.T.BufferGeometry();
    pGeo.setAttribute('position', new this.T.BufferAttribute(this.pPos, 3).setUsage(this.T.DynamicDrawUsage));
    pGeo.setAttribute('aColor', new this.T.BufferAttribute(this.pCol, 3).setUsage(this.T.DynamicDrawUsage));
    pGeo.setAttribute('aSize', new this.T.BufferAttribute(this.pSize, 1).setUsage(this.T.DynamicDrawUsage));
    pGeo.setAttribute('aAlpha', new this.T.BufferAttribute(this.pAlpha, 1).setUsage(this.T.DynamicDrawUsage));
    pGeo.setAttribute('aStar', new this.T.BufferAttribute(this.pStar, 1).setUsage(this.T.DynamicDrawUsage));
    pGeo.setDrawRange(0, 0);
    const pMat = new this.T.ShaderMaterial({
      vertexShader: SPARK_VERT,
      fragmentShader: SPARK_FRAG,
      transparent: true,
      depthWrite: false,
      blending: this.T.AdditiveBlending,
    });
    this.particleMesh = new this.T.Points(pGeo, pMat);
    this.particleMesh.visible = false;
    this.particleMesh.frustumCulled = false;
    this.particleMesh.renderOrder = 27;
    this.particleMesh.layers.set(1);
    this.root.add(this.particleMesh);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push({alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 0.4, size: 1, spin: 0, color: 0xffffff, lift: 0});
    }
  }

  get activeSwings(): number {
    return this.activeCount;
  }

  private applyStyleToPair(pair: RibbonPair, style: ElementSlashStyle) {
    pair.backingMat.uniforms.uInk.value.set(...style.ink);
    pair.backingMat.uniforms.uEdge.value.set(...style.edge);
    pair.backingMat.uniforms.uPattern.value = style.pattern;
    pair.backingMat.uniforms.uProgress.value = 0;
    pair.backingMat.uniforms.uFade.value = 1;

    pair.coreMat.uniforms.uMain.value.set(...style.main);
    pair.coreMat.uniforms.uCore.value.set(...style.core);
    pair.coreMat.uniforms.uEdge.value.set(...style.edge);
    pair.coreMat.uniforms.uAccent.value.set(...style.accent);
    pair.coreMat.uniforms.uPattern.value = style.pattern;
    pair.coreMat.uniforms.uProgress.value = 0;
    pair.coreMat.uniforms.uFade.value = 1;
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
    slot.linger = traj.isFinisher ? SLASH_CONFIG.lingerSeconds * 1.18 : SLASH_CONFIG.lingerSeconds;
    slot.spawnAcc = 0;

    this.applyStyleToPair(slot.primary, style);
    slot.primary.backingMesh.visible = true;
    slot.primary.coreMesh.visible = true;

    if (traj.secondary) {
      this.applyStyleToPair(slot.secondary, style);
      slot.secondary.backingMesh.visible = false;
      slot.secondary.coreMesh.visible = false;
    } else {
      slot.secondary.backingMesh.visible = false;
      slot.secondary.coreMesh.visible = false;
    }

    // Crisp anime 4-point impact cross glint positioned ahead of the slime along the slash arc
    slot.glintActive = true;
    slot.glintElapsed = 0;
    slot.glintDuration = traj.isFinisher ? 0.24 : comboIndex === 2 ? 0.20 : 0.14;
    slot.glintMat.uniforms.uMain.value.set(...style.main);
    slot.glintMat.uniforms.uCore.value.set(...style.core);
    slot.glintMat.uniforms.uAccent.value.set(...style.accent);
    slot.glintMat.uniforms.uProgress.value = 0;
    const glintR = (SLASH_CONFIG.hiltRadius + SLASH_CONFIG.bladeLength * 0.78) * traj.scale;
    const gx = origin[0] + slot.forward[0] * glintR;
    const gy = origin[1] + SLASH_CONFIG.heightOffset + (traj.isFinisher ? 0.34 : 0.16);
    const gz = origin[2] + slot.forward[2] * glintR;
    slot.glintMesh.position.set(gx, gy, gz);
    const glintYaw = Math.atan2(slot.forward[0], slot.forward[2]);
    const glintRoll = comboIndex === 2 ? 0.78 : traj.isFinisher ? -0.35 : 0.18;
    slot.glintMesh.rotation.set(0, glintYaw, glintRoll);
    const gScale = traj.isFinisher ? 2.15 : comboIndex === 2 ? 1.55 : 1.05;
    slot.glintMesh.scale.set(gScale * 1.35, gScale * 0.88, 1);
    slot.glintMesh.visible = true;

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
    this.emitTipParticles(slot, 0.08, traj.isFinisher ? 16 : 8);
    this.rebuildRibbon(slot, slot.primary, 0, 0.08, false);
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
      s.glintActive = false;
      s.primary.backingMesh.visible = false;
      s.primary.coreMesh.visible = false;
      s.secondary.backingMesh.visible = false;
      s.secondary.coreMesh.visible = false;
      s.glintMesh.visible = false;
      s.ringMesh.visible = false;
    }
    for (const p of this.particles) p.alive = false;
    this.pAlpha.fill(0);
    this.particleMesh.visible = false;
    this.particleMesh.geometry.setDrawRange(0, 0);
    this.activeCount = 0;
  }

  update(dt: number, time = 0, followOrigin?: Vec) {
    let active = 0;
    for (const s of this.slots) {
      if (s.ringActive) {
        s.ringElapsed += dt;
        const p = s.ringElapsed / 0.38;
        if (p >= 1) {
          s.ringActive = false;
          s.ringMesh.visible = false;
        } else {
          const eased = 1 - (1 - p) * (1 - p);
          const scale = 0.75 + eased * 4.2;
          s.ringMesh.scale.set(scale, 1, scale);
          s.ringMat.uniforms.uProgress.value = p;
        }
      }
      if (s.glintActive) {
        s.glintElapsed += dt;
        const gp = s.glintElapsed / s.glintDuration;
        if (gp >= 1) {
          s.glintActive = false;
          s.glintMesh.visible = false;
        } else {
          s.glintMat.uniforms.uProgress.value = gp;
        }
      }
      if (!s.active) continue;
      active++;
      s.elapsed += dt;

      if (followOrigin && s.elapsed <= s.duration) {
        s.origin[0] = followOrigin[0];
        s.origin[1] = followOrigin[1];
        s.origin[2] = followOrigin[2];
      }

      const total = s.duration + s.linger;
      if (s.elapsed >= total) {
        s.active = false;
        s.primary.backingMesh.visible = false;
        s.primary.coreMesh.visible = false;
        s.secondary.backingMesh.visible = false;
        s.secondary.coreMesh.visible = false;
        continue;
      }

      const rawHead = clamp(s.elapsed / s.duration, 0, 1);
      // Fast snap-in curve for anime slash velocity (fast launch, crisp hold)
      const headAlpha = 1 - Math.pow(1 - rawHead, 2.4);
      const tailDelay = s.duration * 0.24;
      const rawTail = clamp((s.elapsed - tailDelay) / (total - tailDelay), 0, 1);
      const tailAlpha = rawTail * rawTail;
      const lifeProgress = clamp(s.elapsed / total, 0, 1);

      const fade = s.elapsed <= s.duration
        ? 1.0
        : 1.0 - smooth((s.elapsed - s.duration) / Math.max(s.linger, 0.01));

      s.primary.backingMat.uniforms.uTime.value = time;
      s.primary.backingMat.uniforms.uProgress.value = lifeProgress;
      s.primary.backingMat.uniforms.uFade.value = fade;
      s.primary.coreMat.uniforms.uTime.value = time;
      s.primary.coreMat.uniforms.uProgress.value = lifeProgress;
      s.primary.coreMat.uniforms.uFade.value = fade;

      this.rebuildRibbon(s, s.primary, tailAlpha, Math.max(tailAlpha + 0.04, headAlpha), false);

      // Optional paired secondary combo arc (2nd hit echo, 3rd hit X-cross, 4th hit outer shock arc)
      const sec = s.traj.secondary;
      if (sec) {
        const secElapsed = s.elapsed - sec.delay;
        const secTotal = s.duration + s.linger * 0.92;
        if (secElapsed >= 0 && secElapsed < secTotal) {
          const sHead = 1 - Math.pow(1 - clamp(secElapsed / s.duration, 0, 1), 2.3);
          const sTailDelay = s.duration * 0.26;
          const sTailRaw = clamp((secElapsed - sTailDelay) / (secTotal - sTailDelay), 0, 1);
          const sTail = sTailRaw * sTailRaw;
          const sProg = clamp(secElapsed / secTotal, 0, 1);
          const sFade = secElapsed <= s.duration ? 0.92 : 0.92 * (1 - smooth((secElapsed - s.duration) / Math.max(s.linger * 0.92, 0.01)));
          s.secondary.backingMesh.visible = true;
          s.secondary.coreMesh.visible = true;
          s.secondary.backingMat.uniforms.uTime.value = time + 0.3;
          s.secondary.backingMat.uniforms.uProgress.value = sProg;
          s.secondary.backingMat.uniforms.uFade.value = sFade * 0.82;
          s.secondary.coreMat.uniforms.uTime.value = time + 0.3;
          s.secondary.coreMat.uniforms.uProgress.value = sProg;
          s.secondary.coreMat.uniforms.uFade.value = sFade;
          this.rebuildRibbon(s, s.secondary, sTail, Math.max(sTail + 0.04, sHead), true);
        } else {
          s.secondary.backingMesh.visible = false;
          s.secondary.coreMesh.visible = false;
        }
      }

      if (s.elapsed <= s.duration) {
        s.spawnAcc += dt * (s.traj.isFinisher ? 86 : 52);
        const emitN = Math.floor(s.spawnAcc);
        if (emitN > 0) {
          s.spawnAcc -= emitN;
          this.emitTipParticles(s, headAlpha, Math.min(emitN, 6));
        }
      }
    }
    this.activeCount = active;

    // Step Niagara-style glowing spark particles
    let live = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.alive) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.alive = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const damp = Math.exp(-dt * 3.1);
      p.vx *= damp;
      p.vz *= damp;
      p.vy += (p.lift - 4.4) * dt;
      const t = p.age / p.life;
      const fadeIn = Math.min(1, t / 0.12);
      const fadeOut = (1 - t) * (1 - t);
      this.pPos[live * 3] = p.x;
      this.pPos[live * 3 + 1] = p.y;
      this.pPos[live * 3 + 2] = p.z;
      this.col.setHex(p.color);
      this.pCol[live * 3] = this.col.r;
      this.pCol[live * 3 + 1] = this.col.g;
      this.pCol[live * 3 + 2] = this.col.b;
      this.pSize[live] = (0.042 + p.size * 0.052) * (0.55 + 0.6 * fadeIn) * (1 - 0.5 * t);
      this.pAlpha[live] = fadeIn * fadeOut * 0.95;
      this.pStar[live] = (i & 1) ? 1.0 : 0.0;
      live++;
    }
    this.particleMesh.visible = live > 0;
    this.particleMesh.geometry.setDrawRange(0, live);
    if (live > 0) {
      const g = this.particleMesh.geometry;
      g.attributes.position.needsUpdate = true;
      g.attributes.aColor.needsUpdate = true;
      g.attributes.aSize.needsUpdate = true;
      g.attributes.aAlpha.needsUpdate = true;
      g.attributes.aStar.needsUpdate = true;
    }
  }

  private sampleBlade(slot: SlashSlot, alpha: number, useSecondary = false): {inner: Vec; outer: Vec; tangent: Vec} {
    const src = useSecondary && slot.traj.secondary ? slot.traj.secondary : slot.traj;
    const yawRad = ((src.startYawDeg + (src.endYawDeg - src.startYawDeg) * alpha) * Math.PI) / 180;
    const pitchRad = ((src.startPitchDeg + (src.endPitchDeg - src.startPitchDeg) * alpha) * Math.PI) / 180;
    const sc = src.scale;
    const wScale = (useSecondary && slot.traj.secondary ? slot.traj.secondary.widthScale : slot.traj.widthScale) ?? 1.0;
    const yOff = useSecondary && slot.traj.secondary ? slot.traj.secondary.yOffset : 0;

    const fx = slot.forward[0], fz = slot.forward[2];
    const rx = -fz, rz = fx;
    const cy = Math.cos(yawRad), sy = Math.sin(yawRad);
    const cp = Math.cos(pitchRad), sp = Math.sin(pitchRad);

    const horizX = fx * cy + rx * sy;
    const horizZ = fz * cy + rz * sy;
    const dx = horizX * cp;
    const dy = sp;
    const dz = horizZ * cp;

    const yawDir = src.endYawDeg >= src.startYawDeg ? 1 : -1;
    const tx = (-fx * sy + rx * cy) * yawDir;
    const tz = (-fz * sy + rz * cy) * yawDir;

    const px = slot.origin[0];
    const py = slot.origin[1] + SLASH_CONFIG.heightOffset + yOff;
    const pz = slot.origin[2];

    const outerR = (SLASH_CONFIG.hiltRadius + SLASH_CONFIG.bladeLength) * sc;
    const bandWidth = SLASH_CONFIG.bladeLength * sc * wScale;
    const innerR = Math.max(0.18, outerR - bandWidth);
    const tilt = SLASH_CONFIG.bladeTiltY * sc;

    return {
      inner: [px + dx * innerR, py + dy * innerR - tilt * 0.42, pz + dz * innerR],
      outer: [px + dx * outerR, py + dy * outerR + tilt * 0.72, pz + dz * outerR],
      tangent: [tx, 0.25, tz],
    };
  }

  private rebuildRibbon(slot: SlashSlot, pair: RibbonPair, tailAlpha: number, headAlpha: number, useSecondary: boolean) {
    const segs = SLASH_CONFIG.segments;
    const pos = pair.positions;
    const span = Math.max(0.02, headAlpha - tailAlpha);
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const a = clamp(tailAlpha + span * u, 0, 1);
      const sample = this.sampleBlade(slot, a, useSecondary);
      const base = i * 6;
      pos[base + 0] = sample.inner[0];
      pos[base + 1] = sample.inner[1];
      pos[base + 2] = sample.inner[2];
      pos[base + 3] = sample.outer[0];
      pos[base + 4] = sample.outer[1];
      pos[base + 5] = sample.outer[2];
    }
    pair.geo.attributes.position.needsUpdate = true;
  }

  private emitTipParticles(slot: SlashSlot, alpha: number, count: number) {
    const style = ELEMENT_SLASH_STYLES[slot.element];
    const sample = this.sampleBlade(slot, clamp(alpha, 0, 1), false);
    for (let i = 0; i < count; i++) {
      const f = 0.62 + Math.random() * 0.38;
      const x = sample.inner[0] + (sample.outer[0] - sample.inner[0]) * f;
      const y = sample.inner[1] + (sample.outer[1] - sample.inner[1]) * f;
      const z = sample.inner[2] + (sample.outer[2] - sample.inner[2]) * f;
      const spd = 1.6 + Math.random() * 2.4;
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
      s.primary.geo.dispose();
      s.primary.backingMat.dispose();
      s.primary.coreMat.dispose();
      s.secondary.geo.dispose();
      s.secondary.backingMat.dispose();
      s.secondary.coreMat.dispose();
      s.glintMesh.geometry.dispose();
      s.glintMat.dispose();
      s.ringMesh.geometry.dispose();
      s.ringMat.dispose();
    }
    this.particleMesh.geometry.dispose();
    this.particleMesh.material.dispose();
  }
}
