import {AttackFormSystem} from './attack-forms';
import {clamp, smooth, type Vec} from './types';

/**
 * Six-element high-precision anime multi-hit slash VFX.
 *
 * Architecture inspired by open-source cel-erosion slash pipelines
 * (AlphinAlbukhari/Godot-Sword-Slash-with-Visual-Shader, reeboolabs/reeboo-stylized-vfx-free,
 *  Hovl Studio / Gabriel Aguiar / Wuthering Waves / Genshin Impact):
 * - 64-segment geometrically tip-tapered scythe ribbon (zero blunt polygon end-caps)
 * - Layer 1 (NormalBlending): fwidth-antialiased hard cel-stepped multi-tone blade body +
 *   Voronoi cellular cutouts/flames/rifts + dark ink outline for razor daylight contrast (zero blurry cloud!)
 * - Layer 2 (AdditiveBlending): strictly razor-thin (3%-5%) HDR leading edge spine, burn-wire &
 *   anisotropic brush streaks so post-process bloom only kisses the cutting edge, never washing out the body
 * - Wind (1) & Volt (3) preserve their praised razor hollow hairlines & 30 Hz stepped plasma bolts
 *
 * Only Volt and Wind still swing this ribbon. Water, Fire, Dark and Physical attack with bodies of their own
 * (liquid tubes, eroding blasts, rifts, solid stone) built in attack-forms.ts; Wind adds flying crescents on top.
 */
/** Elements whose normal attacks are drawn entirely by AttackFormSystem instead of the swept ribbon. */
const FORM_ONLY: readonly boolean[] = [true, false, true, false, true, true];
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
  segments: 64,
} as const;

export interface ElementSlashStyle {
  id: number;
  name: string;
  main: [number, number, number];
  core: [number, number, number];
  edge: [number, number, number];
  /** Deep ink outline / shadow band colour (Normal-blended for crisp daylight contrast). */
  ink: [number, number, number];
  /** Secondary accent tint (seafoam, golden inner fire, magenta rift, steel sheen). */
  accent: [number, number, number];
  particle: number;
  /** 0=water cel wave, 1=wind vacuum hairlines, 2=fire cel flame, 3=volt plasma jag, 4=dark ink rift, 5=physical steel qi */
  pattern: number;
  lift: number;
  /** Head ease exponent. Higher values make the sweep land almost instantly. */
  snap: number;
  /** Multiplier on the post-swing linger. */
  lingerMul: number;
  /** Ribbon width multiplier. */
  widthMul: number;
  /** Ribbon radius multiplier. */
  scaleMul: number;
  /** Opacity of Layer 1 cel-shaded body. */
  backAlpha: number;
  /** Finisher ground ring lifetime in seconds. */
  ringLife: number;
}

export const ELEMENT_SLASH_STYLES: readonly ElementSlashStyle[] = [
  // 0 Water: crisp ukiyo-e / Genshin 3-tone cobalt -> cerulean -> pure white seafoam crest + Voronoi bubble cutouts
  {id: 0, name: '水', main: [0.06, 0.56, 0.98], core: [0.92, 0.99, 1.0], edge: [0.02, 0.24, 0.72], ink: [0.01, 0.08, 0.26], accent: [0.42, 0.95, 1.0], particle: 0x7fd8ff, pattern: 0, lift: 0, snap: 2.0, lingerMul: 1.22, widthMul: 1.12, scaleMul: 1.0, backAlpha: 0.92, ringLife: 0.56},
  // 1 Wind: praised pale jade vacuum hairlines, nearly transparent body
  {id: 1, name: '风', main: [0.52, 1.0, 0.78], core: [0.95, 1.0, 0.97], edge: [0.18, 0.70, 0.52], ink: [0.06, 0.26, 0.20], accent: [0.82, 1.0, 0.66], particle: 0xb8ffd8, pattern: 1, lift: 1.2, snap: 3.0, lingerMul: 0.65, widthMul: 0.55, scaleMul: 1.1, backAlpha: 0.16, ringLife: 0.42},
  // 2 Fire: crisp 4-tone cel flame (obsidian ink -> scarlet -> vermilion -> razor gold core), zero blurry cloud
  {id: 2, name: '火', main: [0.98, 0.36, 0.03], core: [1.0, 0.94, 0.58], edge: [0.78, 0.07, 0.01], ink: [0.16, 0.015, 0.01], accent: [1.0, 0.76, 0.12], particle: 0xff8a2a, pattern: 2, lift: 3.2, snap: 2.5, lingerMul: 1.0, widthMul: 1.12, scaleMul: 1.0, backAlpha: 0.95, ringLife: 0.50},
  // 3 Volt: praised instantaneous stepped white-violet bolts
  {id: 3, name: '雷', main: [0.62, 0.36, 1.0], core: [0.92, 0.94, 1.0], edge: [0.32, 0.10, 0.86], ink: [0.08, 0.03, 0.24], accent: [0.52, 0.86, 1.0], particle: 0xd8c4ff, pattern: 3, lift: 0.4, snap: 7.0, lingerMul: 0.45, widthMul: 0.72, scaleMul: 1.04, backAlpha: 0.28, ringLife: 0.30},
  // 4 Dark: crisp torn obsidian ink blade + razor crimson-magenta/amethyst dimensional rift fracture
  {id: 4, name: '暗', main: [0.38, 0.12, 0.68], core: [0.96, 0.78, 1.0], edge: [0.14, 0.03, 0.28], ink: [0.012, 0.004, 0.028], accent: [0.98, 0.22, 0.68], particle: 0x9a6ad8, pattern: 4, lift: 0.5, snap: 1.8, lingerMul: 1.45, widthMul: 1.18, scaleMul: 0.98, backAlpha: 0.96, ringLife: 0.58},
  // 5 Physical: hard-edged steel-bronze ink outline + brushed champagne-gold cel body + razor silver specular
  {id: 5, name: '物', main: [0.92, 0.74, 0.36], core: [1.0, 0.99, 0.94], edge: [0.56, 0.38, 0.14], ink: [0.14, 0.10, 0.06], accent: [0.84, 0.94, 1.0], particle: 0xf6dca0, pattern: 5, lift: 0, snap: 3.8, lingerMul: 0.78, widthMul: 0.84, scaleMul: 1.0, backAlpha: 0.90, ringLife: 0.48},
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

function baseTrajectory(comboIndex: number): SwingTrajectory {
  const half = SLASH_CONFIG.swingHalfAngleDeg;
  const diag = SLASH_CONFIG.diagonalPitchDeg;
  switch (comboIndex) {
    case 1:
      return {
        startYawDeg: -half, endYawDeg: half, startPitchDeg: -14, endPitchDeg: 18,
        scale: SLASH_CONFIG.normalScale * 1.04, isFinisher: false, widthScale: 0.92,
        secondary: {startYawDeg: -half + 12, endYawDeg: half + 10, startPitchDeg: -6, endPitchDeg: 26, scale: SLASH_CONFIG.normalScale * 1.15, widthScale: 0.54, delay: 0.028, yOffset: 0.10},
      };
    case 2:
      return {
        startYawDeg: half + 4, endYawDeg: -half + 4, startPitchDeg: diag, endPitchDeg: -diag,
        scale: SLASH_CONFIG.normalScale * 1.10, isFinisher: false, widthScale: 0.96,
        secondary: {startYawDeg: -half + 6, endYawDeg: half - 4, startPitchDeg: diag - 6, endPitchDeg: -diag + 6, scale: SLASH_CONFIG.normalScale * 1.06, widthScale: 0.80, delay: 0.032, yOffset: 0.04},
      };
    case 3:
      return {
        startYawDeg: -124, endYawDeg: 124, startPitchDeg: -30, endPitchDeg: 32,
        scale: SLASH_CONFIG.finisherScale, isFinisher: true, widthScale: 1.18,
        secondary: {startYawDeg: -116, endYawDeg: 132, startPitchDeg: -16, endPitchDeg: 24, scale: SLASH_CONFIG.finisherScale * 1.18, widthScale: 0.56, delay: 0.022, yOffset: 0.16},
      };
    default:
      return {
        startYawDeg: half, endYawDeg: -half, startPitchDeg: 10, endPitchDeg: -8,
        scale: SLASH_CONFIG.normalScale, isFinisher: false, widthScale: 0.82,
      };
  }
}

/**
 * Distinct 4-hit combo trajectories.
 * - Without `element`, returns the canonical base 4-hit angles (preserving baseline tests).
 * - With `element`, returns each element's bespoke 4-hit silhouette & choreography.
 */
export function computeSwingTrajectory(comboIndex: number, element?: number): SwingTrajectory {
  const base = baseTrajectory(comboIndex);
  if (element === undefined) return base;
  const el = clamp(Math.floor(element), 0, ELEMENT_SLASH_STYLES.length - 1);
  const st = ELEMENT_SLASH_STYLES[el];
  const n = SLASH_CONFIG.normalScale * st.scaleMul;
  const f = SLASH_CONFIG.finisherScale * st.scaleMul;
  const w = st.widthMul;

  switch (el) {
    case 0: // WATER: undulating fluid whips -> rising fountain -> overhead crashing tsunami + ground splash
      switch (comboIndex) {
        case 1:
          return {
            startYawDeg: -112, endYawDeg: 108, startPitchDeg: -8, endPitchDeg: 14,
            scale: n * 1.08, isFinisher: false, widthScale: 0.96 * w,
            secondary: {startYawDeg: -102, endYawDeg: 118, startPitchDeg: 4, endPitchDeg: -8, scale: n * 1.18, widthScale: 0.56 * w, delay: 0.036, yOffset: 0.14},
          };
        case 2:
          return {
            startYawDeg: -42, endYawDeg: 46, startPitchDeg: -38, endPitchDeg: 52,
            scale: n * 1.12, isFinisher: false, widthScale: 0.92 * w,
            secondary: {startYawDeg: 42, endYawDeg: -46, startPitchDeg: -30, endPitchDeg: 46, scale: n * 1.06, widthScale: 0.66 * w, delay: 0.034, yOffset: 0.12},
          };
        case 3:
          return {
            startYawDeg: -14, endYawDeg: 16, startPitchDeg: 68, endPitchDeg: -36,
            scale: f * 1.06, isFinisher: true, widthScale: 1.08 * w,
            secondary: {startYawDeg: -136, endYawDeg: 136, startPitchDeg: -6, endPitchDeg: -6, scale: f * 1.16, widthScale: 0.88 * w, delay: 0.032, yOffset: -0.10},
          };
        default:
          return {
            startYawDeg: 92, endYawDeg: -82, startPitchDeg: -12, endPitchDeg: 10,
            scale: n * 1.02, isFinisher: false, widthScale: 0.86 * w,
            secondary: {startYawDeg: 82, endYawDeg: -90, startPitchDeg: -4, endPitchDeg: 16, scale: n * 1.12, widthScale: 0.44 * w, delay: 0.032, yOffset: 0.08},
          };
      }

    case 1: // WIND: ultra-thin multi-blade assassin combo -> X-scissor -> rising cyclone -> 310° counter-spin
      switch (comboIndex) {
        case 1:
          return {
            startYawDeg: -98, endYawDeg: 102, startPitchDeg: 12, endPitchDeg: -12,
            scale: n * 1.06, isFinisher: false, widthScale: 0.86 * w,
            secondary: {startYawDeg: 98, endYawDeg: -102, startPitchDeg: -12, endPitchDeg: 12, scale: n * 1.12, widthScale: 0.72 * w, delay: 0.014, yOffset: 0.14},
          };
        case 2:
          return {
            startYawDeg: -136, endYawDeg: 136, startPitchDeg: -22, endPitchDeg: 38,
            scale: n * 1.14, isFinisher: false, widthScale: 0.84 * w,
            secondary: {startYawDeg: -128, endYawDeg: 144, startPitchDeg: -6, endPitchDeg: 44, scale: n * 1.24, widthScale: 0.62 * w, delay: 0.020, yOffset: 0.30},
          };
        case 3:
          return {
            startYawDeg: -156, endYawDeg: 156, startPitchDeg: 0, endPitchDeg: 22,
            scale: f * 1.06, isFinisher: true, widthScale: 0.96 * w,
            secondary: {startYawDeg: 156, endYawDeg: -156, startPitchDeg: 24, endPitchDeg: -4, scale: f * 1.22, widthScale: 0.70 * w, delay: 0.016, yOffset: 0.26},
          };
        default:
          return {
            startYawDeg: 78, endYawDeg: -80, startPitchDeg: 6, endPitchDeg: -4,
            scale: n * 1.04, isFinisher: false, widthScale: 0.80 * w,
            secondary: {startYawDeg: 66, endYawDeg: -90, startPitchDeg: 14, endPitchDeg: 4, scale: n * 1.18, widthScale: 0.60 * w, delay: 0.016, yOffset: 0.15},
          };
      }

    case 2: // FIRE: heavy aggressive upward flame hooks -> molten cleave -> volcanic uppercut -> inferno crown
      switch (comboIndex) {
        case 1:
          return {
            startYawDeg: -108, endYawDeg: 96, startPitchDeg: -18, endPitchDeg: 24,
            scale: n * 1.08, isFinisher: false, widthScale: 1.02 * w,
            secondary: {startYawDeg: -96, endYawDeg: 108, startPitchDeg: -6, endPitchDeg: 34, scale: n * 1.16, widthScale: 0.64 * w, delay: 0.034, yOffset: 0.18},
          };
        case 2:
          return {
            startYawDeg: -50, endYawDeg: 34, startPitchDeg: -44, endPitchDeg: 58,
            scale: n * 1.12, isFinisher: false, widthScale: 1.04 * w,
            secondary: {startYawDeg: 44, endYawDeg: -40, startPitchDeg: -34, endPitchDeg: 48, scale: n * 1.10, widthScale: 0.72 * w, delay: 0.030, yOffset: 0.20},
          };
        case 3:
          return {
            startYawDeg: -138, endYawDeg: 138, startPitchDeg: 6, endPitchDeg: 12,
            scale: f * 1.08, isFinisher: true, widthScale: 1.16 * w,
            secondary: {startYawDeg: -112, endYawDeg: 112, startPitchDeg: -16, endPitchDeg: 48, scale: f * 1.16, widthScale: 0.72 * w, delay: 0.026, yOffset: 0.28},
          };
        default:
          return {
            startYawDeg: 86, endYawDeg: -72, startPitchDeg: -8, endPitchDeg: 20,
            scale: n * 1.02, isFinisher: false, widthScale: 0.92 * w,
          };
      }

    case 3: // VOLT: instantaneous needle draw -> simultaneous X-voltage -> dual-tier arc -> 300° plasma discharge
      switch (comboIndex) {
        case 1:
          return {
            startYawDeg: 88, endYawDeg: -88, startPitchDeg: 32, endPitchDeg: -28,
            scale: n * 1.08, isFinisher: false, widthScale: 0.92 * w,
            secondary: {startYawDeg: -88, endYawDeg: 88, startPitchDeg: 28, endPitchDeg: -32, scale: n * 1.08, widthScale: 0.86 * w, delay: 0, yOffset: 0.04},
          };
        case 2:
          return {
            startYawDeg: -72, endYawDeg: 72, startPitchDeg: -36, endPitchDeg: 44,
            scale: n * 1.12, isFinisher: false, widthScale: 0.94 * w,
            secondary: {startYawDeg: -66, endYawDeg: 78, startPitchDeg: -22, endPitchDeg: 52, scale: n * 1.18, widthScale: 0.68 * w, delay: 0.008, yOffset: 0.30},
          };
        case 3:
          return {
            startYawDeg: -152, endYawDeg: 152, startPitchDeg: 0, endPitchDeg: 0,
            scale: f * 1.08, isFinisher: true, widthScale: 1.08 * w,
            secondary: {startYawDeg: -122, endYawDeg: 122, startPitchDeg: 38, endPitchDeg: -38, scale: f * 1.12, widthScale: 0.82 * w, delay: 0, yOffset: 0.16},
          };
        default:
          return {
            startYawDeg: 52, endYawDeg: -56, startPitchDeg: 12, endPitchDeg: -10,
            scale: n * 1.14, isFinisher: false, widthScale: 0.82 * w,
            secondary: {startYawDeg: -26, endYawDeg: 42, startPitchDeg: -16, endPitchDeg: 18, scale: n * 1.04, widthScale: 0.60 * w, delay: 0, yOffset: 0.10},
          };
      }

    case 4: // DARK: viscous creeping claw -> eerie lagged echo -> dimensional X-tear -> eclipse halo
      switch (comboIndex) {
        case 1:
          return {
            startYawDeg: -94, endYawDeg: 104, startPitchDeg: 16, endPitchDeg: -18,
            scale: n * 1.06, isFinisher: false, widthScale: 0.98 * w,
            secondary: {startYawDeg: -82, endYawDeg: 112, startPitchDeg: 24, endPitchDeg: -10, scale: n * 1.16, widthScale: 0.68 * w, delay: 0.056, yOffset: 0.18},
          };
        case 2:
          return {
            startYawDeg: 84, endYawDeg: -84, startPitchDeg: 48, endPitchDeg: -42,
            scale: n * 1.10, isFinisher: false, widthScale: 1.02 * w,
            secondary: {startYawDeg: -84, endYawDeg: 84, startPitchDeg: 42, endPitchDeg: -48, scale: n * 1.08, widthScale: 0.86 * w, delay: 0.048, yOffset: 0.06},
          };
        case 3:
          return {
            startYawDeg: -132, endYawDeg: 132, startPitchDeg: -18, endPitchDeg: 18,
            scale: f * 1.04, isFinisher: true, widthScale: 1.14 * w,
            secondary: {startYawDeg: 132, endYawDeg: -132, startPitchDeg: 28, endPitchDeg: -28, scale: f * 1.14, widthScale: 0.72 * w, delay: 0.044, yOffset: 0.24},
          };
        default:
          return {
            startYawDeg: 96, endYawDeg: -76, startPitchDeg: -14, endPitchDeg: 6,
            scale: n * 1.02, isFinisher: false, widthScale: 0.92 * w,
          };
      }

    default: // PHYSICAL: crisp diagonal chop -> heavy horizontal bash -> vertical uppercut -> overhead hammer slam + shockwave
      switch (comboIndex) {
        case 1:
          return {
            startYawDeg: -106, endYawDeg: 106, startPitchDeg: -6, endPitchDeg: 8,
            scale: n * 1.08, isFinisher: false, widthScale: 0.96 * w,
            secondary: {startYawDeg: -96, endYawDeg: 114, startPitchDeg: 0, endPitchDeg: 12, scale: n * 1.22, widthScale: 0.44 * w, delay: 0.020, yOffset: 0.06},
          };
        case 2:
          return {
            startYawDeg: -24, endYawDeg: 24, startPitchDeg: -48, endPitchDeg: 62,
            scale: n * 1.14, isFinisher: false, widthScale: 0.94 * w,
            secondary: {startYawDeg: -18, endYawDeg: 28, startPitchDeg: -38, endPitchDeg: 68, scale: n * 1.20, widthScale: 0.50 * w, delay: 0.018, yOffset: 0.14},
          };
        case 3:
          return {
            startYawDeg: -16, endYawDeg: 16, startPitchDeg: 74, endPitchDeg: -42,
            scale: f * 1.10, isFinisher: true, widthScale: 1.10 * w,
            secondary: {startYawDeg: -134, endYawDeg: 134, startPitchDeg: -4, endPitchDeg: -4, scale: f * 1.20, widthScale: 0.72 * w, delay: 0.024, yOffset: -0.10},
          };
        default:
          return {
            startYawDeg: 70, endYawDeg: -66, startPitchDeg: 24, endPitchDeg: -20,
            scale: n * 1.02, isFinisher: false, widthScale: 0.86 * w,
          };
      }
  }
}

const NOISE_GLSL = /* glsl */ `
float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
vec2 hash22(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
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
float fbm3(vec2 p) {
  return vnoise(p) * 0.56 + vnoise(p * 2.07 + vec2(7.3, 11.9)) * 0.29 + vnoise(p * 4.31 + vec2(19.1, 3.7)) * 0.15;
}
// Returns vec2(F1 cell center dist, F2-F1 crisp Voronoi edge dist)
vec2 voronoi2(vec2 p) {
  vec2 n = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash22(n + g);
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; }
      else if (d < d2) { d2 = d; }
    }
  }
  return vec2(sqrt(d1), sqrt(d2) - sqrt(d1));
}
// Resolution-independent hard anime cel transition (zero muddy feathering, zero jagged aliasing)
float celStep(float edge, float val) {
  float w = max(fwidth(val) * 1.35, 0.014);
  return smoothstep(edge - w, edge + w, val);
}
float band(float x, float c, float w) {
  return exp(-pow((x - c) * w, 2.0));
}
`;

/** Ribbon vertex shader: element-specific world-space deformation of the blade band. */
const SLASH_VERT = /* glsl */ `
uniform float uPattern;
uniform float uTime;
uniform float uProgress;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  float u = uv.x, v = uv.y;
  if (uPattern < 0.5) {
    // Water: crisp rolling wave crest undulation
    p.y += sin(u * 15.0 - uTime * 11.0) * 0.055 * v;
  } else if (uPattern > 1.5 && uPattern < 2.5) {
    // Fire: outer flame tips lift briskly upward with thermal buoyancy
    p.y += v * v * (0.04 + 0.22 * uProgress) * (0.35 + 0.65 * (1.0 - u));
  } else if (uPattern > 3.5 && uPattern < 4.5) {
    // Dark: viscous obsidian ink trails slightly downward
    p.y -= v * uProgress * uProgress * 0.12;
  }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const PLAIN_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Layer 1 (NormalBlending): High-precision hard-edged Cel Anime Blade Body.
 * Renders razor-crisp multi-tone vector silhouettes with ink outlines & Voronoi cutouts
 * for Water (0), Fire (2), Dark (4) and Physical (5) so they NEVER blur out over bright sand/daylight.
 * Wind (1) and Volt (3) stay ultra-minimal here so their crisp hollow additive lines dominate.
 */
const BACKING_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uMain;
uniform vec3 uCore;
uniform vec3 uInk;
uniform vec3 uEdge;
uniform vec3 uAccent;
uniform float uPattern;
uniform float uProgress;
uniform float uFade;
uniform float uTime;
uniform float uBackAlpha;
${NOISE_GLSL}

void main() {
  float u = vUv.x;
  float v = vUv.y;
  // Crisp scythe tip & tail envelope
  float tipMask = 1.0 - celStep(0.965, u + (1.0 - v) * 0.14);
  float tailCut = mix(0.02, 0.56, uProgress * uProgress);
  float arch = sin(clamp(u, 0.0, 1.0) * 3.14159265);
  float innerBase = mix(0.68, 0.16, pow(max(arch, 1e-4), 0.70));

  if (uPattern < 0.5) {
    // 0 WATER: Ukiyo-e / Genshin crisp 3-tone wave blade + Voronoi foam holes + ink rim
    float wave = sin(u * 20.0 - uTime * 11.0) * 0.032 + sin(u * 35.0 - uTime * 17.0) * 0.014;
    float outerEdge = 0.94 + wave;
    float innerEdge = innerBase + sin(u * 14.0 - uTime * 8.0) * 0.045 + uProgress * 0.24 * (1.0 - u);
    float bodyDist = min(outerEdge - v, v - innerEdge);
    float mask = celStep(0.0, bodyDist) * tipMask * celStep(tailCut, u + v * 0.22);

    // Sharp Voronoi cellular seafoam bubble cutouts through the trailing body
    vec2 vor = voronoi2(vec2(u * 14.0 - uTime * 6.5, v * 5.2));
    float holeZone = (1.0 - celStep(0.76, v)) * (1.0 - celStep(0.78, u));
    float hole = (1.0 - celStep(0.24 + uProgress * 0.28, vor.x)) * holeZone;
    mask *= (1.0 - hole);
    if (mask < 0.02) discard;

    // 3 hard cel color bands: deep cobalt ink edge -> cerulean tide -> crisp white foam crest
    float jet = vnoise(vec2(u * 6.0 - uTime * 12.0, v * 26.0));
    float midBand = celStep(0.38, v + (jet - 0.5) * 0.14);
    float foamBand = celStep(outerEdge - 0.115 - (jet - 0.5) * 0.035, v);
    float holeRim = (1.0 - celStep(0.32 + uProgress * 0.28, vor.x)) * holeZone;
    float outline = 1.0 - celStep(0.032, bodyDist);

    vec3 col = mix(uEdge, uMain, midBand);
    col = mix(col, uAccent, celStep(0.72, jet) * 0.55 * midBand);
    col = mix(col, uCore, clamp(foamBand + holeRim * 0.85, 0.0, 1.0));
    col = mix(col, uInk, outline * 0.82);

    float alpha = mask * uFade * uBackAlpha;
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.95));
  } else if (uPattern < 1.5 || (uPattern > 2.5 && uPattern < 3.5)) {
    // 1 WIND & 3 VOLT: keep minimal subtle backing so their praised razor additive lines dominate cleanly
    float outerMask = 1.0 - smoothstep(0.90, 0.98, v);
    float innerMask = smoothstep(innerBase, innerBase + 0.22, v);
    float shape = (1.0 - smoothstep(0.86, 1.0, u)) * smoothstep(0.0, 0.30, u) * innerMask * outerMask;
    float alpha = shape * uFade * uBackAlpha * 0.72;
    if (alpha < 0.02) discard;
    vec3 col = mix(uInk, uEdge * 0.65, smoothstep(0.45, 0.92, v) * 0.55);
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.45));
  } else if (uPattern < 2.5) {
    // 2 FIRE: Wuthering Waves / Demon Slayer RAZOR CEL FLAME — zero cloudy blur!
    // Polar UV-warped aggressive flame tongues using high-freq ridge + Voronoi cells
    float scrollU = u * 11.5 - uTime * 7.2;
    vec2 vor = voronoi2(vec2(scrollU * 0.95, v * 4.2 - uTime * 2.2));
    float saw = abs(fract(scrollU * 0.65 + (vor.x - 0.5) * 0.45) - 0.5) * 2.0;
    float tongue = saw * 0.14 + (1.0 - vor.x) * 0.12;
    float outerEdge = clamp(0.80 + tongue * (0.45 + 0.55 * sin(u * 3.14159)), 0.72, 0.985);

    // Sharp jagged inner erosion eating away from tail -> tip into crisp detached flame shards
    float erodeField = (1.0 - vor.x) * 0.62 + vnoise(vec2(u * 18.0 - uTime * 11.0, v * 12.0)) * 0.38;
    float erodeVal = (v - innerBase) * 1.15 + (erodeField - 0.5) * 0.44 - uProgress * 0.56 + u * 0.22;
    float outerDist = outerEdge - v;
    float shapeField = min(outerDist * 2.2, erodeVal);
    float mask = celStep(0.0, shapeField) * tipMask * celStep(tailCut * 0.85, u + v * 0.18);
    if (mask < 0.02) discard;

    // 4 crisp anime cel color bands (charred obsidian outline -> crimson -> molten orange -> gold core)
    float outline = 1.0 - celStep(0.065, shapeField);
    float midFlame = celStep(0.18, shapeField + (v - 0.5) * 0.25);
    float hotGold = celStep(0.68, v + (erodeField - 0.5) * 0.18) * celStep(0.16, shapeField);
    float streak = celStep(0.68, vnoise(vec2(u * 5.0 - uTime * 10.0, v * 24.0)));

    vec3 col = mix(uEdge, uMain, midFlame);
    col = mix(col, uAccent, clamp(hotGold + streak * 0.45 * midFlame, 0.0, 1.0));
    col = mix(col, uCore, celStep(outerEdge - 0.065, v) * celStep(0.22, u));
    col = mix(col, uInk, outline * 0.92);

    float alpha = mask * uFade * uBackAlpha;
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.96));
  } else if (uPattern < 4.5) {
    // 4 DARK: Acheron / Havoc RAZOR TORN OBSIDIAN INK BLADE + geometric neon rift fracture
    vec2 vor = voronoi2(vec2(u * 10.0 - uTime * 3.8, v * 4.6));
    float jag = (0.5 - vor.y) * 0.16 + (vnoise(vec2(u * 22.0 - uTime * 6.0, v * 8.0)) - 0.5) * 0.08;
    float outerEdge = 0.93 + jag * 0.55;
    float erodeVal = (v - innerBase) + jag * 0.65 - uProgress * 0.42 + u * 0.18;
    float shapeField = min(outerEdge - v, erodeVal);
    float mask = celStep(0.0, shapeField) * tipMask * celStep(tailCut * 0.75, u + v * 0.16);
    if (mask < 0.02) discard;

    // Jagged dimensional rift splitting the center of the black blade
    float seg = u * 18.0;
    float rZig = mix(hash21(vec2(floor(seg), 11.0)), hash21(vec2(floor(seg) + 1.0, 11.0)), fract(seg)) - 0.5;
    float riftY = 0.70 + rZig * 0.14;
    float riftCrack = 1.0 - celStep(0.026, abs(v - riftY));
    float outerRim = 1.0 - celStep(0.045, shapeField);
    float innerVein = (1.0 - celStep(0.065, vor.y)) * celStep(0.32, v);

    vec3 col = uInk;
    col = mix(col, uEdge * 1.15, outerRim * 0.85 + innerVein * 0.45);
    col = mix(col, uAccent, riftCrack * 0.95);
    col = mix(col, uCore, 1.0 - celStep(0.011, abs(v - riftY)));

    float alpha = mask * uFade * uBackAlpha;
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.97));
  } else {
    // 5 PHYSICAL: Crisp hard-edged metallic champagne-gold & bronze-steel crescent + brushed speed lines
    float outerEdge = 0.945;
    float chip = vnoise(vec2(u * 20.0, v * 7.0));
    float innerEdge = innerBase + uProgress * 0.34 * (1.0 - u) + (chip - 0.5) * 0.08 * uProgress;
    float bodyDist = min(outerEdge - v, v - innerEdge);
    float mask = celStep(0.0, bodyDist) * tipMask * celStep(tailCut, u + v * 0.20);
    if (mask < 0.02) discard;

    // Anisotropic brushed-steel grain + sweeping metallic specular cut
    float brush = vnoise(vec2(u * 4.5 - uTime * 14.0, v * 34.0));
    float brushBand = celStep(0.56, brush);
    float outline = 1.0 - celStep(0.028, bodyDist);
    float bevel = celStep(0.62, v);
    float sweepPos = uProgress * 1.65 - 0.25;
    float sheen = celStep(0.86, 1.0 - abs(u - sweepPos - (v - 0.72) * 0.35) * 1.6);

    vec3 col = mix(uEdge, uMain, bevel * 0.78 + brushBand * 0.22);
    col = mix(col, uAccent, celStep(0.78, v) * 0.55 + sheen * 0.65);
    col = mix(col, uCore, celStep(0.885, v));
    col = mix(col, uInk, outline * 0.88);

    float alpha = mask * uFade * uBackAlpha;
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.94));
  }
}
`;

/**
 * Layer 2 (AdditiveBlending HDR):
 * - For Water (0), Fire (2), Dark (4), Physical (5): strictly razor-thin (3%-5%) cutting spine,
 *   glowing erosion edge-wire & crisp glint lines (NEVER a broad blurry bloom cloud!).
 * - For Wind (1) & Volt (3): preserves their praised sharp vacuum hairlines & 30 Hz stepped bolts.
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
  float tipTap = 1.0 - smoothstep(0.88, 1.0, u);
  float tailTap = smoothstep(0.0, 0.26, u);
  float arch = sin(clamp(u, 0.0, 1.0) * 3.14159265);
  float innerCut = mix(0.64, 0.16, pow(max(arch, 1e-4), 0.72));
  float innerFade = smoothstep(innerCut, innerCut + 0.18, v);
  float n2 = vnoise(vec2(u * 26.0 - uTime * 18.0, v * 9.5));

  if (uPattern < 0.5) {
    // 0 WATER: razor-thin glowing seafoam crest + fine sparkling water-jet hairlines
    float wave = sin(u * 20.0 - uTime * 11.0) * 0.032 + sin(u * 35.0 - uTime * 17.0) * 0.014;
    float crestY = 0.915 + wave;
    float crestSpine = band(v, crestY, 44.0) * tipTap * tailTap;
    float jetLine1 = band(v, 0.74 + wave * 0.7, 38.0) * celStep(0.42, fract(u * 6.0 - uTime * 8.0)) * 0.55;
    float jetLine2 = band(v, 0.56 - wave * 0.5, 36.0) * celStep(0.55, fract(u * 8.0 - uTime * 10.0 + 0.3)) * 0.35;
    float a = (crestSpine + (jetLine1 + jetLine2) * tipTap * tailTap) * uFade;
    if (a < 0.015) discard;
    vec3 col = mix(uAccent * 1.1, uCore * 1.35, clamp(crestSpine, 0.0, 1.0));
    gl_FragColor = vec4(col * a, clamp(a, 0.0, 0.90));
  } else if (uPattern < 1.5) {
    // 1 WIND: praised hollow vacuum hairlines with travelling dash breaks
    float l1 = band(v, 0.93, 34.0) * smoothstep(0.05, 0.35, u);
    float l2 = band(v, 0.76, 30.0) * smoothstep(0.18, 0.48, u) * (1.0 - smoothstep(0.80, 0.95, u));
    float l3 = band(v, 0.58, 28.0) * smoothstep(0.32, 0.60, u) * (1.0 - smoothstep(0.70, 0.88, u));
    float l4 = band(v, 0.42, 26.0) * smoothstep(0.45, 0.70, u) * (1.0 - smoothstep(0.62, 0.80, u));
    float dash = step(0.28, fract(u * 7.0 - uTime * 9.0 + v * 3.0));
    float lines = l1 + (l2 * 0.8 + l3 * 0.6 + l4 * 0.45) * dash;
    float haze = smoothstep(innerCut, 0.95, v) * 0.08 * (0.5 + 0.5 * n2);
    float env = tipTap * tailTap * innerFade * (1.0 - smoothstep(0.96, 1.0, v));
    float erode = smoothstep(uProgress * 0.80 - u * 0.44 - 0.05, uProgress * 0.80 - u * 0.44 + 0.10, fbm2(vec2(u * 10.5 - uTime * 9.0, v * 4.8)));
    float a = env * (lines + haze) * erode * uFade;
    if (a < 0.015) discard;
    vec3 col = mix(uMain * 1.1, uCore * 1.4, clamp(l1 * 1.2, 0.0, 1.0)) + uAccent * 0.25 * l2;
    gl_FragColor = vec4(col * a, clamp(a, 0.0, 1.0));
  } else if (uPattern < 2.5) {
    // 2 FIRE: ONLY razor leading flame wire + crisp Voronoi burn-edge glint (NEVER a wide bloom cloud!)
    float scrollU = u * 11.5 - uTime * 7.2;
    vec2 vor = voronoi2(vec2(scrollU * 0.95, v * 4.2 - uTime * 2.2));
    float saw = abs(fract(scrollU * 0.65 + (vor.x - 0.5) * 0.45) - 0.5) * 2.0;
    float outerEdge = clamp(0.80 + (saw * 0.14 + (1.0 - vor.x) * 0.12) * (0.45 + 0.55 * sin(u * 3.14159)), 0.72, 0.985);
    float erodeField = (1.0 - vor.x) * 0.62 + vnoise(vec2(u * 18.0 - uTime * 11.0, v * 12.0)) * 0.38;
    float erodeVal = (v - innerCut) * 1.15 + (erodeField - 0.5) * 0.44 - uProgress * 0.56 + u * 0.22;
    float burnWire = exp(-abs(erodeVal - 0.04) * 34.0) * celStep(0.0, outerEdge - v) * 0.72;
    float razorTip = band(v, outerEdge - 0.035, 38.0) * tipTap * tailTap;
    float sparks = celStep(0.955, hash21(floor(vec2(u * 70.0 - uTime * 14.0, v * 22.0)))) * celStep(0.0, erodeVal);
    float a = (razorTip * 0.85 + burnWire * 0.65 + sparks) * uFade;
    if (a < 0.015) discard;
    vec3 col = mix(uAccent * 1.2, uCore * 1.35, clamp(razorTip + sparks, 0.0, 1.0));
    gl_FragColor = vec4(col * a, clamp(a, 0.0, 0.88));
  } else if (uPattern < 3.5) {
    // 3 VOLT: praised 30 Hz stepped plasma arcs + strobe
    float ts = floor(uTime * 30.0);
    float seg = u * 16.0;
    float i0 = floor(seg);
    float fr = fract(seg);
    float zig = mix(hash21(vec2(i0, ts)), hash21(vec2(i0 + 1.0, ts)), fr) - 0.5;
    float zig2 = mix(hash21(vec2(i0, ts + 17.0)), hash21(vec2(i0 + 1.0, ts + 17.0)), fr) - 0.5;
    float b1 = 1.0 - smoothstep(0.008, 0.038, abs(v - (0.80 + zig * 0.16)));
    float b1g = band(v, 0.80 + zig * 0.16, 10.0) * 0.42;
    float b2 = 1.0 - smoothstep(0.006, 0.028, abs(v - (0.55 + zig2 * 0.20)));
    float strobe = 0.55 + 0.45 * step(0.35, hash21(vec2(ts, 3.1)));
    float haze = smoothstep(innerCut, 0.95, v) * 0.10 * (0.5 + 0.5 * n2);
    float env = tipTap * tailTap * innerFade * (1.0 - smoothstep(0.95, 1.0, v));
    float a = env * (haze + b1 + b1g + b2 * 0.7) * strobe * uFade;
    if (a < 0.015) discard;
    vec3 col = mix(uMain * 1.3, uCore * 1.8, clamp(b1 + b2 * 0.7, 0.0, 1.0)) + uAccent * b1g * 0.6;
    gl_FragColor = vec4(col * a, clamp(a, 0.0, 1.0));
  } else if (uPattern < 4.5) {
    // 4 DARK: razor neon dimensional rift filament + pinpoint void stars over the solid black Layer 1 blade
    float seg = u * 18.0;
    float rZig = mix(hash21(vec2(floor(seg), 11.0)), hash21(vec2(floor(seg) + 1.0, 11.0)), fract(seg)) - 0.5;
    float riftY = 0.70 + rZig * 0.14;
    float rift = 1.0 - smoothstep(0.004, 0.020, abs(v - riftY));
    float riftGlow = band(v, riftY, 22.0) * 0.52;
    float edgeWire = band(v, 0.92, 40.0) * 0.65;
    float stars = step(0.985, hash21(floor(vec2(u * 90.0 - uTime * 6.0, v * 26.0)))) * step(innerCut, v);
    float a = (rift + riftGlow + edgeWire + stars) * tipTap * tailTap * uFade;
    if (a < 0.015) discard;
    vec3 col = mix(uAccent * 1.35, uCore * 1.65, clamp(rift + stars, 0.0, 1.0));
    gl_FragColor = vec4(col * a, clamp(a, 0.0, 0.92));
  } else {
    // 5 PHYSICAL: razor silver-white outer steel edge + crisp sweeping metallic glint
    float spine = band(v, 0.925, 50.0) * tipTap * tailTap;
    float ridge = band(v, 0.72, 42.0) * celStep(0.55, vnoise(vec2(u * 5.0 - uTime * 14.0, v * 32.0))) * 0.45 * tipTap * tailTap;
    float sweepPos = uProgress * 1.65 - 0.25;
    float sheen = exp(-pow((u - sweepPos - (v - 0.72) * 0.35) * 10.0, 2.0)) * step(innerCut, v) * step(v, 0.95) * 0.55;
    float a = (spine * 0.95 + ridge + sheen) * uFade;
    if (a < 0.015) discard;
    vec3 col = mix(uAccent * 1.15, uCore * 1.55, clamp(spine + sheen, 0.0, 1.0));
    gl_FragColor = vec4(col * a, clamp(a, 0.0, 0.92));
  }
}
`;

/** Element-specific impact glint flashed ahead of the slime at the peak of each swing. */
const GLINT_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uMain;
uniform vec3 uCore;
uniform vec3 uAccent;
uniform float uProgress;
uniform float uPattern;
uniform float uTime;
float hash11(float n) { return fract(sin(n * 127.1) * 43758.5453); }
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float ang = atan(p.y, p.x);
  float pr = clamp(uProgress, 0.0, 1.0);
  float env = sin(pr * 3.14159265);
  float shape = 0.0;
  float hot = 0.0;
  if (uPattern < 0.5) {
    float ringR = 0.22 + 0.55 * pr;
    float ring = exp(-pow((r - ringR) * 24.0, 2.0));
    float spikes = pow(abs(cos(ang * 5.0 + 1.3)), 14.0) * smoothstep(ringR - 0.04, ringR + 0.16, r) * (1.0 - smoothstep(ringR + 0.16, ringR + 0.32, r));
    hot = exp(-r * r * 36.0) * (1.0 - pr);
    shape = ring * 0.85 + spikes * 0.95 + hot;
  } else if (uPattern < 1.5) {
    float l1 = exp(-abs(p.y - 0.06) * 60.0) * exp(-abs(p.x) * 1.6);
    float l2 = exp(-abs(p.y + 0.12) * 80.0) * exp(-abs(p.x + 0.2) * 2.4) * 0.6;
    hot = exp(-r * r * 40.0) * 0.6;
    shape = l1 + l2 + hot;
  } else if (uPattern < 2.5) {
    // Crisp 6-point fiery star flare (replaced soft bloom blob!)
    float rays = pow(abs(cos(ang * 3.0)), 14.0) * exp(-r * 3.8);
    float horiz = exp(-abs(p.y) * 28.0) * exp(-abs(p.x) * 2.4);
    hot = exp(-r * r * 32.0);
    shape = rays * 0.95 + horiz * 0.75 + hot;
  } else if (uPattern < 3.5) {
    float ts = floor(uTime * 30.0);
    float arms = 0.0;
    for (int k = 0; k < 5; k++) {
      float fk = float(k);
      float a = hash11(fk + ts * 3.7) * 6.2831853;
      float len = 0.5 + 0.5 * hash11(fk * 7.1 + ts);
      vec2 d = vec2(cos(a), sin(a));
      float along = dot(p, d);
      float perp = abs(dot(p, vec2(-d.y, d.x)) + sin(along * 30.0 + ts) * 0.03);
      arms += exp(-perp * 70.0) * step(0.0, along) * (1.0 - smoothstep(len * 0.6, len, along));
    }
    hot = exp(-r * r * 36.0);
    shape = arms + hot * 1.3;
  } else if (uPattern < 4.5) {
    float ringR = 0.9 - 0.7 * pr;
    float ring = exp(-pow((r - ringR) * 24.0, 2.0));
    float slash = exp(-abs(p.y - p.x * 0.35) * 44.0) * exp(-abs(p.x) * 2.0);
    shape = ring + slash * 0.9;
    env = sqrt(max(env, 0.0));
  } else {
    float horiz = exp(-abs(p.y) * 34.0) * exp(-abs(p.x) * 1.9);
    float vert = exp(-abs(p.x) * 34.0) * exp(-abs(p.y) * 3.0);
    float diag = (exp(-abs(p.x - p.y) * 30.0) + exp(-abs(p.x + p.y) * 30.0)) * exp(-r * 5.0) * 0.45;
    hot = exp(-r * r * 32.0);
    shape = horiz + vert + diag + hot * 1.2;
  }
  float a = clamp(shape, 0.0, 1.4) * env * env;
  if (a < 0.015) discard;
  vec3 col = mix(uMain * 1.25 + uAccent * 0.35, uCore * 1.65, clamp(hot + shape * 0.25, 0.0, 1.0));
  gl_FragColor = vec4(col * a, clamp(a, 0.0, 1.0));
}
`;

/** Finisher ground ring: shader drives the radius so each element can expand, spiral or implode. */
const RING_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uMain;
uniform vec3 uCore;
uniform float uProgress;
uniform float uPattern;
uniform float uTime;
${NOISE_GLSL}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float ang = atan(p.y, p.x);
  float pr = clamp(uProgress, 0.0, 1.0);
  float e = 1.0 - (1.0 - pr) * (1.0 - pr);
  float fade = (1.0 - pr) * (1.0 - pr * 0.4);
  float R = mix(0.12, 0.86, e);
  float m = 0.0;
  float core = 0.0;
  if (uPattern < 0.5) {
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      float rr = R - fk * 0.14;
      if (rr > 0.02) m += exp(-pow((r - rr) * (46.0 - fk * 8.0), 2.0)) * (1.0 - fk * 0.28);
    }
    core = exp(-pow((r - R) * 76.0, 2.0));
  } else if (uPattern < 1.5) {
    float sp = sin(ang * 3.0 + r * 14.0 - uTime * 9.0);
    float arms = smoothstep(0.75, 1.0, sp) * smoothstep(0.1, R, r) * (1.0 - smoothstep(R, R + 0.08, r));
    float rim = exp(-pow((r - R) * 36.0, 2.0)) * 0.6;
    m = arms * 0.9 + rim;
    core = rim;
  } else if (uPattern < 2.5) {
    // Crisp jagged flame blast perimeter (no mushy fog ring)
    float saw = abs(fract((ang + 3.14159) / 6.28318 * 12.0 + uTime * 1.4) - 0.5) * 2.0;
    float rr = R + (saw - 0.5) * 0.11;
    float rim = 1.0 - smoothstep(0.008, 0.028, abs(r - rr));
    float innerRim = exp(-pow((r - (rr - 0.06)) * 28.0, 2.0)) * 0.45;
    m = rim + innerRim;
    core = rim;
  } else if (uPattern < 3.5) {
    float ts = floor(uTime * 30.0);
    float seg = (ang + 3.14159265) / 6.2831853 * 24.0;
    float i0 = floor(seg);
    float i1 = mod(i0 + 1.0, 24.0);
    float jag = (mix(hash21(vec2(i0, ts)), hash21(vec2(i1, ts)), fract(seg)) - 0.5) * 0.11;
    float rim = 1.0 - smoothstep(0.004, 0.022, abs(r - (R + jag)));
    float rimGlow = exp(-pow((r - (R + jag)) * 18.0, 2.0)) * 0.36;
    float spokes = step(0.92, hash21(vec2(floor(ang * 14.0), ts + 5.0))) * smoothstep(R * 0.3, R, r) * (1.0 - smoothstep(R, R + 0.02, r));
    m = (rim + rimGlow + spokes * 0.8) * (0.65 + 0.35 * step(0.3, hash21(vec2(ts, 1.0))));
    core = rim;
  } else if (uPattern < 4.5) {
    float Rd = mix(0.92, 0.10, e);
    float rim = exp(-pow((r - Rd) * 26.0, 2.0));
    float tendr = smoothstep(0.76, 1.0, sin(ang * 7.0 + r * 9.0 + uTime * 4.0)) * smoothstep(Rd, Rd + 0.25, r) * (1.0 - smoothstep(Rd + 0.25, 0.98, r)) * 0.65;
    m = rim + tendr;
    core = rim * 0.6;
    fade = 1.0 - pr * pr;
  } else {
    float sectors = 11.0;
    float sa = (ang + 3.14159265) / 6.2831853 * sectors;
    float sid = floor(sa);
    float ca = (sid + 0.5 + (hash21(vec2(sid, 2.0)) - 0.5) * 0.6) / sectors * 6.2831853 - 3.14159265 + sin(r * 18.0 + sid) * 0.04;
    float dist = abs(ang - ca) * r;
    float crack = (1.0 - smoothstep(0.004, 0.018, dist)) * step(r, R * 1.05) * smoothstep(0.08, 0.2, r);
    float dust = exp(-pow((r - R) * 16.0, 2.0)) * 0.48;
    m = crack + dust;
    core = crack;
    fade = 1.0 - pr;
  }
  float alpha = m * fade * 0.92;
  if (alpha < 0.01) discard;
  vec3 col = mix(uMain * 1.35, uCore * 1.65, clamp(core, 0.0, 1.0));
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

/** Volt-only jagged plasma filament ribbons that follow the blade and re-roll every 1/30 s. */
const BOLT_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uMain;
uniform vec3 uCore;
uniform float uFade;
void main() {
  float d = abs(vUv.y - 0.5) * 2.0;
  float core = exp(-d * d * 18.0);
  float glow = exp(-d * d * 3.0) * 0.5;
  float tap = smoothstep(0.0, 0.08, vUv.x) * (1.0 - smoothstep(0.9, 1.0, vUv.x));
  float a = (core + glow) * tap * uFade;
  if (a < 0.01) discard;
  vec3 col = mix(uMain * 1.4, uCore * 2.0, core);
  gl_FragColor = vec4(col * a, a);
}
`;

const SPARK_VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
attribute float aAlpha;
attribute float aShape;
attribute float aRot;
varying vec3 vColor;
varying float vAlpha;
varying float vShape;
varying float vRot;
void main() {
  vColor = aColor;
  vAlpha = aAlpha;
  vShape = aShape;
  vRot = aRot;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aSize * (320.0 / max(0.75, -mv.z)), 1.5, 52.0);
}
`;

/** Point sprite shapes: 0 glow, 1 star, 2 droplet, 3 leaf sliver, 4 ember tongue, 5 volt spark, 6 void wisp, 7 rock chip. */
const SPARK_FRAG = /* glsl */ `
precision highp float;
varying vec3 vColor;
varying float vAlpha;
varying float vShape;
varying float vRot;
void main() {
  if (vAlpha <= 0.005) discard;
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float c = cos(vRot), s = sin(vRot);
  vec2 q = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  float m = 0.0;
  vec3 col = vColor;
  if (vShape < 0.5) {
    float glow = exp(-r * r * 5.2) * (1.0 - smoothstep(0.7, 1.0, r));
    float hot = exp(-r * r * 20.0);
    m = glow * 0.8 + hot * 0.7;
    col = mix(vColor * 1.35, vColor * 1.9 + vec3(0.45), hot);
  } else if (vShape < 1.5) {
    float crossArm = exp(-abs(p.x) * 15.0) * exp(-abs(p.y) * 2.6) + exp(-abs(p.y) * 15.0) * exp(-abs(p.x) * 2.6);
    float hot = exp(-r * r * 20.0);
    m = clamp(crossArm * 0.78 + hot, 0.0, 1.0);
    col = mix(vColor * 1.4, vec3(1.6), hot * 0.6);
  } else if (vShape < 2.5) {
    float y = p.y;
    float w = y > 0.2 ? sqrt(max(0.0, 1.0 - pow((y - 0.2) / 0.75, 2.0))) * 0.6 : 0.6 * clamp((y + 0.95) / 1.15, 0.0, 1.0);
    float body = (1.0 - smoothstep(w - 0.14, w, abs(p.x))) * step(-0.95, y) * step(y, 0.95);
    float spec = exp(-dot(p - vec2(-0.18, 0.35), p - vec2(-0.18, 0.35)) * 30.0);
    m = clamp(body * 0.7 + spec * 0.9, 0.0, 1.0);
    col = mix(vColor * 1.2, vec3(1.5, 1.7, 1.9), spec * 0.8);
  } else if (vShape < 3.5) {
    float d = length(vec2(q.x * 0.9, q.y * 3.4));
    float vein = exp(-q.y * q.y * 140.0) * exp(-q.x * q.x * 1.6);
    m = (1.0 - smoothstep(0.5, 0.95, d)) * 0.75 + vein * 0.6;
    col = mix(vColor * 1.25, vec3(1.5), vein * 0.5);
  } else if (vShape < 4.5) {
    float y = -p.y;
    float w = y < -0.2 ? sqrt(max(0.0, 1.0 - pow((y + 0.2) / 0.75, 2.0))) * 0.55 : 0.55 * clamp((0.95 - y) / 1.15, 0.0, 1.0);
    float body = (1.0 - smoothstep(w - 0.14, w, abs(p.x))) * step(-0.95, y) * step(y, 0.95);
    float hot = exp(-dot(p - vec2(0.0, 0.35), p - vec2(0.0, 0.35)) * 12.0);
    m = clamp(body * 0.85 + hot * 0.55, 0.0, 1.0);
    col = mix(vColor * 1.25, vec3(1.85, 1.65, 1.0), hot * 0.65);
  } else if (vShape < 5.5) {
    float d = abs(q.x) * 1.0 + abs(q.y) * 4.0;
    float hot = exp(-r * r * 30.0);
    m = clamp((1.0 - smoothstep(0.5, 1.0, d)) + hot, 0.0, 1.0);
    col = mix(vColor * 1.5, vec3(1.8, 1.8, 2.2), hot * 0.8 + (1.0 - smoothstep(0.0, 0.5, d)) * 0.4);
  } else if (vShape < 6.5) {
    float edge = exp(-pow((r - 0.56) * 9.0, 2.0));
    float mist = exp(-r * r * 5.0) * 0.28;
    m = clamp(edge * 0.90 + mist, 0.0, 1.0) * (1.0 - smoothstep(0.8, 1.0, r));
  } else {
    float d = max(abs(q.x) * 0.866 + abs(q.y) * 0.5, abs(q.y));
    m = 1.0 - smoothstep(0.52, 0.60, d);
    col = vColor * (0.55 + 0.55 * step(0.0, q.x + q.y * 0.6));
  }
  float a = clamp(m * vAlpha, 0.0, 1.0);
  if (a < 0.008) discard;
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
  ringLife: number;
  boltMesh: any;
  boltMat: any;
  boltGeo: any;
  boltPos: Float32Array;
}

interface DebrisParticle {
  alive: boolean;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  age: number;
  life: number;
  size: number;
  shape: number;
  grav: number;
  drag: number;
  swirl: number;
  rot: number;
  spin: number;
  flicker: number;
  r0: number; g0: number; b0: number;
  r1: number; g1: number; b1: number;
}

interface ParticleSpec {
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

const SLOT_COUNT = 4;
const PARTICLE_COUNT = 420;
const BOLT_SEGS = 22;

const rand = Math.random;
function hash2(a: number, b: number) {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * 3D six-element anime multi-hit sword-slash system:
 * 64-seg tip-tapered scythe ribbon + Normal-blended hard-edged Cel body + razor HDR additive rim,
 * element-specific combo silhouettes, glints, finisher ground rings, volt filaments & pooled particles.
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
  private pShape = new Float32Array(PARTICLE_COUNT);
  private pRot = new Float32Array(PARTICLE_COUNT);
  private activeCount = 0;
  private clock = 0;
  private forms: AttackFormSystem;

  constructor(private ctx: {THREE: any; scene: any}) {
    this.T = ctx.THREE;
    this.root = new this.T.Group();
    this.root.name = 'slime-slash-vfx';
    ctx.scene.add(this.root);
    this.forms = new AttackFormSystem(this.T, this.root, p => this.spawn(p));

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
          uMain: {value: new this.T.Vector3(0.06, 0.56, 0.98)},
          uCore: {value: new this.T.Vector3(0.92, 0.99, 1.0)},
          uInk: {value: new this.T.Vector3(0.01, 0.08, 0.26)},
          uEdge: {value: new this.T.Vector3(0.02, 0.24, 0.72)},
          uAccent: {value: new this.T.Vector3(0.42, 0.95, 1.0)},
          uPattern: {value: 0},
          uProgress: {value: 0},
          uFade: {value: 1},
          uTime: {value: 0},
          uBackAlpha: {value: 0.92},
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
          uMain: {value: new this.T.Vector3(0.06, 0.56, 0.98)},
          uCore: {value: new this.T.Vector3(0.92, 0.99, 1.0)},
          uEdge: {value: new this.T.Vector3(0.02, 0.24, 0.72)},
          uAccent: {value: new this.T.Vector3(0.42, 0.95, 1.0)},
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
        vertexShader: PLAIN_VERT,
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
          uPattern: {value: 0},
          uTime: {value: 0},
        },
      });
      const glintMesh = new this.T.Mesh(glintGeo, glintMat);
      glintMesh.visible = false;
      glintMesh.frustumCulled = false;
      glintMesh.renderOrder = 26;
      glintMesh.layers.set(1);
      this.root.add(glintMesh);

      const ringMat = new this.T.ShaderMaterial({
        vertexShader: PLAIN_VERT,
        fragmentShader: RING_FRAG,
        transparent: true,
        depthWrite: false,
        blending: this.T.AdditiveBlending,
        side: this.T.DoubleSide,
        uniforms: {
          uMain: {value: new this.T.Vector3(1, 0.5, 0.1)},
          uCore: {value: new this.T.Vector3(1, 0.95, 0.7)},
          uProgress: {value: 0},
          uPattern: {value: 0},
          uTime: {value: 0},
        },
      });
      const ringMesh = new this.T.Mesh(ringGeo, ringMat);
      ringMesh.visible = false;
      ringMesh.renderOrder = 23;
      ringMesh.layers.set(1);
      this.root.add(ringMesh);

      const boltVerts = 2 * (BOLT_SEGS + 1) * 2;
      const boltPos = new Float32Array(boltVerts * 3);
      const boltUv = new Float32Array(boltVerts * 2);
      const boltIdx: number[] = [];
      for (let k = 0; k < 2; k++) {
        const base = k * (BOLT_SEGS + 1) * 2;
        for (let i = 0; i <= BOLT_SEGS; i++) {
          const u = i / BOLT_SEGS;
          boltUv[(base + i * 2) * 2] = u;
          boltUv[(base + i * 2) * 2 + 1] = 0;
          boltUv[(base + i * 2 + 1) * 2] = u;
          boltUv[(base + i * 2 + 1) * 2 + 1] = 1;
          if (i < BOLT_SEGS) {
            const a = base + i * 2;
            boltIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
          }
        }
      }
      const boltGeo = new this.T.BufferGeometry();
      boltGeo.setAttribute('position', new this.T.BufferAttribute(boltPos, 3).setUsage(this.T.DynamicDrawUsage));
      boltGeo.setAttribute('uv', new this.T.BufferAttribute(boltUv, 2));
      boltGeo.setIndex(boltIdx);
      const boltMat = new this.T.ShaderMaterial({
        vertexShader: PLAIN_VERT,
        fragmentShader: BOLT_FRAG,
        transparent: true,
        depthWrite: false,
        blending: this.T.AdditiveBlending,
        side: this.T.DoubleSide,
        uniforms: {
          uMain: {value: new this.T.Vector3(0.62, 0.36, 1.0)},
          uCore: {value: new this.T.Vector3(0.92, 0.94, 1.0)},
          uFade: {value: 0},
        },
      });
      const boltMesh = new this.T.Mesh(boltGeo, boltMat);
      boltMesh.visible = false;
      boltMesh.frustumCulled = false;
      boltMesh.renderOrder = 26;
      boltMesh.layers.set(1);
      this.root.add(boltMesh);

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
        ringLife: 0.4,
        boltMesh,
        boltMat,
        boltGeo,
        boltPos,
      });
    }

    const pGeo = new this.T.BufferGeometry();
    pGeo.setAttribute('position', new this.T.BufferAttribute(this.pPos, 3).setUsage(this.T.DynamicDrawUsage));
    pGeo.setAttribute('aColor', new this.T.BufferAttribute(this.pCol, 3).setUsage(this.T.DynamicDrawUsage));
    pGeo.setAttribute('aSize', new this.T.BufferAttribute(this.pSize, 1).setUsage(this.T.DynamicDrawUsage));
    pGeo.setAttribute('aAlpha', new this.T.BufferAttribute(this.pAlpha, 1).setUsage(this.T.DynamicDrawUsage));
    pGeo.setAttribute('aShape', new this.T.BufferAttribute(this.pShape, 1).setUsage(this.T.DynamicDrawUsage));
    pGeo.setAttribute('aRot', new this.T.BufferAttribute(this.pRot, 1).setUsage(this.T.DynamicDrawUsage));
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
      this.particles.push({
        alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 0.4, size: 1, shape: 0,
        grav: -4, drag: 3, swirl: 0, rot: 0, spin: 0, flicker: 0, r0: 1, g0: 1, b0: 1, r1: 1, g1: 1, b1: 1,
      });
    }
  }

  get activeSwings(): number {
    return this.activeCount + this.forms.active;
  }

  private applyStyleToPair(pair: RibbonPair, style: ElementSlashStyle) {
    pair.backingMat.uniforms.uMain.value.set(...style.main);
    pair.backingMat.uniforms.uCore.value.set(...style.core);
    pair.backingMat.uniforms.uInk.value.set(...style.ink);
    pair.backingMat.uniforms.uEdge.value.set(...style.edge);
    pair.backingMat.uniforms.uAccent.value.set(...style.accent);
    pair.backingMat.uniforms.uPattern.value = style.pattern;
    pair.backingMat.uniforms.uProgress.value = 0;
    pair.backingMat.uniforms.uFade.value = 1;
    pair.backingMat.uniforms.uBackAlpha.value = style.backAlpha;

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
    if (FORM_ONLY[el]) {
      this.forms.play(el, comboIndex, origin, forward, clamp(durationSeconds, 0.16, 0.42));
      return;
    }
    const style = ELEMENT_SLASH_STYLES[el];
    const traj = computeSwingTrajectory(comboIndex, el);

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
    slot.linger = SLASH_CONFIG.lingerSeconds * style.lingerMul * (traj.isFinisher ? 1.18 : 1);
    slot.spawnAcc = 0;

    this.applyStyleToPair(slot.primary, style);
    slot.primary.backingMesh.visible = true;
    slot.primary.coreMesh.visible = true;
    if (traj.secondary) this.applyStyleToPair(slot.secondary, style);
    slot.secondary.backingMesh.visible = false;
    slot.secondary.coreMesh.visible = false;

    slot.boltMat.uniforms.uMain.value.set(...style.main);
    slot.boltMat.uniforms.uCore.value.set(...style.core);
    slot.boltMat.uniforms.uFade.value = 0;
    slot.boltMesh.visible = el === 3;

    slot.glintActive = true;
    slot.glintElapsed = 0;
    const glintBase = traj.isFinisher ? 0.24 : comboIndex === 2 ? 0.20 : 0.14;
    slot.glintDuration = el === 3 ? glintBase * 0.6 : el === 4 ? glintBase * 1.6 : el === 0 ? glintBase * 1.4 : glintBase;
    slot.glintMat.uniforms.uMain.value.set(...style.main);
    slot.glintMat.uniforms.uCore.value.set(...style.core);
    slot.glintMat.uniforms.uAccent.value.set(...style.accent);
    slot.glintMat.uniforms.uPattern.value = style.pattern;
    slot.glintMat.uniforms.uProgress.value = 0;
    const glintR = (SLASH_CONFIG.hiltRadius + SLASH_CONFIG.bladeLength * 0.78) * traj.scale;
    const gx = origin[0] + slot.forward[0] * glintR;
    const gy = origin[1] + SLASH_CONFIG.heightOffset + (traj.isFinisher ? 0.34 : 0.16);
    const gz = origin[2] + slot.forward[2] * glintR;
    slot.glintMesh.position.set(gx, gy, gz);
    const glintYaw = Math.atan2(slot.forward[0], slot.forward[2]);
    const glintRoll = el === 1 ? (comboIndex === 2 ? 0.7 : 0.08) : comboIndex === 2 ? 0.78 : traj.isFinisher ? -0.35 : 0.18;
    slot.glintMesh.rotation.set(0, glintYaw, glintRoll);
    const gScale = traj.isFinisher ? 2.15 : comboIndex === 2 ? 1.55 : 1.05;
    const gAspect = el === 1 ? [2.1, 0.7] : el === 0 || el === 4 ? [1.1, 1.1] : [1.35, 0.88];
    slot.glintMesh.scale.set(gScale * gAspect[0], gScale * gAspect[1], 1);
    slot.glintMesh.visible = true;

    if (traj.isFinisher) {
      slot.ringActive = true;
      slot.ringElapsed = 0;
      slot.ringLife = style.ringLife;
      slot.ringMat.uniforms.uMain.value.set(...style.main);
      slot.ringMat.uniforms.uCore.value.set(...style.core);
      slot.ringMat.uniforms.uPattern.value = style.pattern;
      slot.ringMat.uniforms.uProgress.value = 0;
      slot.ringMesh.position.set(origin[0], origin[1] + 0.08, origin[2]);
      const ringScale = el === 4 ? 4.6 : el === 5 ? 4.4 : 5.0;
      slot.ringMesh.scale.set(ringScale, 1, ringScale);
      slot.ringMesh.visible = true;
      this.emitFinisherSignature(slot);
    }

    this.emitTipParticles(slot, 0.08, traj.isFinisher ? 14 : 7);
    this.rebuildRibbon(slot, slot.primary, 0, 0.08, false);
    if (el === 1) this.forms.play(el, comboIndex, origin, forward, slot.duration);
  }

  /** Spawn an element-flavoured burst at a world point (crop reactions, destruction and target hits). */
  spawnBurst(position: Vec, element: number, count = 16, spread = 2.4) {
    const el = clamp(Math.floor(element), 0, ELEMENT_SLASH_STYLES.length - 1);
    const st = ELEMENT_SLASH_STYLES[el];
    const px = position[0], py = position[1] + 0.25, pz = position[2];
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const spd = (0.4 + rand() * 0.9) * spread;
      const jx = px + (rand() - 0.5) * 0.3, jy = py + rand() * 0.3, jz = pz + (rand() - 0.5) * 0.3;
      switch (el) {
        case 0:
          this.spawn({x: jx, y: jy, z: jz, vx: ca * spd * 0.8, vy: 2.6 + rand() * 2.6, vz: sa * spd * 0.8, life: 0.5 + rand() * 0.35, size: 0.8 + rand() * 0.7, shape: i % 4 === 0 ? 0 : 2, grav: -11, drag: 0.8, from: st.core, to: st.main});
          break;
        case 1:
          this.spawn({x: jx, y: jy, z: jz, vx: ca * spd * 1.3, vy: 0.6 + rand() * 1.2, vz: sa * spd * 1.3, life: 0.35 + rand() * 0.3, size: 0.8 + rand() * 0.6, shape: i % 3 === 0 ? 1 : 3, grav: 0.8, drag: 3.0, swirl: 7 * (rand() < 0.5 ? -1 : 1), spin: 14, from: st.core, to: st.accent});
          break;
        case 2:
          this.spawn({x: jx, y: jy, z: jz, vx: ca * spd * 0.6, vy: 1.4 + rand() * 2.0, vz: sa * spd * 0.6, life: 0.45 + rand() * 0.45, size: 0.8 + rand() * 0.8, shape: i % 4 === 0 ? 1 : 4, grav: 3.4, drag: 2.4, flicker: 1, from: st.core, to: st.edge});
          break;
        case 3:
          this.spawn({x: jx, y: jy, z: jz, vx: ca * spd * 2.4, vy: (rand() - 0.3) * 4, vz: sa * spd * 2.4, life: 0.12 + rand() * 0.16, size: 0.7 + rand() * 0.6, shape: 5, grav: 0, drag: 8, flicker: 2, from: st.core, to: st.accent});
          break;
        case 4: {
          const rr = 0.6 + rand() * 0.6 * spread * 0.4;
          this.spawn({x: px + ca * rr, y: py + (rand() - 0.2) * 0.6, z: pz + sa * rr, vx: -ca * rr * 2.2, vy: 0.2, vz: -sa * rr * 2.2, life: 0.42 + rand() * 0.3, size: 0.9 + rand() * 0.8, shape: i % 3 === 0 ? 1 : 6, grav: 0.3, drag: 1.4, from: st.accent, to: st.main});
          break;
        }
        default:
          if (i % 3 === 0) this.spawn({x: jx, y: jy, z: jz, vx: ca * spd * 1.5, vy: 0.4 + rand(), vz: sa * spd * 1.5, life: 0.16 + rand() * 0.12, size: 1.0, shape: 1, grav: 0, drag: 6, from: st.core, to: st.main});
          else this.spawn({x: jx, y: jy - 0.1, z: jz, vx: ca * spd, vy: 2.0 + rand() * 2.6, vz: sa * spd, life: 0.5 + rand() * 0.3, size: 0.7 + rand() * 0.7, shape: 7, grav: -13, drag: 0.6, spin: 9, from: st.main, to: st.edge});
      }
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
      s.boltMesh.visible = false;
    }
    this.forms.reset();
    for (const p of this.particles) p.alive = false;
    this.pAlpha.fill(0);
    this.particleMesh.visible = false;
    this.particleMesh.geometry.setDrawRange(0, 0);
    this.activeCount = 0;
  }

  update(dt: number, time = 0, followOrigin?: Vec) {
    this.clock += dt;
    const t = time || this.clock;
    let active = 0;
    for (const s of this.slots) {
      if (s.ringActive) {
        s.ringElapsed += dt;
        const p = s.ringElapsed / s.ringLife;
        if (p >= 1) {
          s.ringActive = false;
          s.ringMesh.visible = false;
        } else {
          s.ringMat.uniforms.uProgress.value = p;
          s.ringMat.uniforms.uTime.value = t;
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
          s.glintMat.uniforms.uTime.value = t;
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
        s.boltMesh.visible = false;
        continue;
      }

      const style = ELEMENT_SLASH_STYLES[s.element];
      const rawHead = clamp(s.elapsed / s.duration, 0, 1);
      const headAlpha = 1 - Math.pow(1 - rawHead, style.snap);
      const tailDelay = s.duration * (s.element === 3 ? 0.5 : 0.24);
      const rawTail = clamp((s.elapsed - tailDelay) / (total - tailDelay), 0, 1);
      const tailAlpha = rawTail * rawTail;
      const lifeProgress = clamp(s.elapsed / total, 0, 1);

      const fade = s.elapsed <= s.duration
        ? 1.0
        : 1.0 - smooth((s.elapsed - s.duration) / Math.max(s.linger, 0.01));

      s.primary.backingMat.uniforms.uTime.value = t;
      s.primary.backingMat.uniforms.uProgress.value = lifeProgress;
      s.primary.backingMat.uniforms.uFade.value = fade;
      s.primary.coreMat.uniforms.uTime.value = t;
      s.primary.coreMat.uniforms.uProgress.value = lifeProgress;
      s.primary.coreMat.uniforms.uFade.value = fade;

      this.rebuildRibbon(s, s.primary, tailAlpha, Math.max(tailAlpha + 0.04, headAlpha), false);

      const sec = s.traj.secondary;
      if (sec) {
        const secElapsed = s.elapsed - sec.delay;
        const secTotal = s.duration + s.linger * 0.92;
        if (secElapsed >= 0 && secElapsed < secTotal) {
          const sHead = 1 - Math.pow(1 - clamp(secElapsed / s.duration, 0, 1), Math.max(1.4, style.snap - 0.1));
          const sTailDelay = s.duration * 0.26;
          const sTailRaw = clamp((secElapsed - sTailDelay) / (secTotal - sTailDelay), 0, 1);
          const sTail = sTailRaw * sTailRaw;
          const sProg = clamp(secElapsed / secTotal, 0, 1);
          const sFade = secElapsed <= s.duration ? 0.92 : 0.92 * (1 - smooth((secElapsed - s.duration) / Math.max(s.linger * 0.92, 0.01)));
          s.secondary.backingMesh.visible = true;
          s.secondary.coreMesh.visible = true;
          s.secondary.backingMat.uniforms.uTime.value = t + 0.3;
          s.secondary.backingMat.uniforms.uProgress.value = sProg;
          s.secondary.backingMat.uniforms.uFade.value = sFade * 0.85;
          s.secondary.coreMat.uniforms.uTime.value = t + 0.3;
          s.secondary.coreMat.uniforms.uProgress.value = sProg;
          s.secondary.coreMat.uniforms.uFade.value = sFade;
          this.rebuildRibbon(s, s.secondary, sTail, Math.max(sTail + 0.04, sHead), true);
        } else {
          s.secondary.backingMesh.visible = false;
          s.secondary.coreMesh.visible = false;
        }
      }

      if (s.element === 3) this.rebuildBolts(s, tailAlpha, Math.max(tailAlpha + 0.04, headAlpha), fade, t);

      if (s.elapsed <= s.duration) {
        const rate = (s.traj.isFinisher ? 86 : 52) * (s.element === 3 ? 1.5 : s.element === 1 ? 1.2 : 1);
        s.spawnAcc += dt * rate;
        const emitN = Math.floor(s.spawnAcc);
        if (emitN > 0) {
          s.spawnAcc -= emitN;
          this.emitTipParticles(s, headAlpha, Math.min(emitN, 6));
        }
      }
    }
    this.activeCount = active;
    this.forms.update(dt, followOrigin);
    this.stepParticles(dt, t);
  }

  private stepParticles(dt: number, time: number) {
    let live = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.alive) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.alive = false;
        continue;
      }
      const damp = Math.exp(-dt * p.drag);
      p.vx *= damp;
      p.vz *= damp;
      p.vy = p.vy * Math.exp(-dt * p.drag * 0.35) + p.grav * dt;
      if (p.swirl !== 0) {
        const ang = p.swirl * dt;
        const c = Math.cos(ang), s = Math.sin(ang);
        const vx = p.vx * c - p.vz * s;
        p.vz = p.vx * s + p.vz * c;
        p.vx = vx;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.rot += p.spin * dt;
      const t = p.age / p.life;
      const fadeIn = Math.min(1, t / 0.1);
      const fadeOut = (1 - t) * (1 - t);
      let flick = 1;
      if (p.flicker === 1) flick = 0.65 + 0.35 * Math.sin(p.age * 42 + i * 1.7);
      else if (p.flicker === 2) flick = hash2(i, Math.floor(time * 30)) > 0.3 ? 1 : 0.15;
      this.pPos[live * 3] = p.x;
      this.pPos[live * 3 + 1] = p.y;
      this.pPos[live * 3 + 2] = p.z;
      this.pCol[live * 3] = p.r0 + (p.r1 - p.r0) * t;
      this.pCol[live * 3 + 1] = p.g0 + (p.g1 - p.g0) * t;
      this.pCol[live * 3 + 2] = p.b0 + (p.b1 - p.b0) * t;
      const shrink = p.shape === 6 ? 1 + 0.5 * t : 1 - 0.5 * t;
      this.pSize[live] = (0.042 + p.size * 0.052) * (0.55 + 0.6 * fadeIn) * shrink;
      this.pAlpha[live] = fadeIn * fadeOut * 0.95 * flick;
      this.pShape[live] = p.shape;
      this.pRot[live] = p.rot;
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
      g.attributes.aShape.needsUpdate = true;
      g.attributes.aRot.needsUpdate = true;
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

  /**
   * 64-segment geometrically tip-tapered scythe ribbon:
   * pinches inner vertex smoothly into outer edge at both leading tip (u -> 1) and tail (u -> 0),
   * eliminating blunt rectangular end-caps completely!
   */
  private rebuildRibbon(slot: SlashSlot, pair: RibbonPair, tailAlpha: number, headAlpha: number, useSecondary: boolean) {
    const segs = SLASH_CONFIG.segments;
    const pos = pair.positions;
    const span = Math.max(0.02, headAlpha - tailAlpha);
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const a = clamp(tailAlpha + span * u, 0, 1);
      const sample = this.sampleBlade(slot, a, useSecondary);
      // Analytic scythe width envelope: sharp needle point at u=1, graceful curved tail at u=0
      const tipPinch = Math.pow(clamp((1 - u) / 0.24, 0, 1), 0.52);
      const tailPinch = Math.pow(clamp(u / 0.20, 0, 1), 0.55);
      const widthFrac = 0.03 + 0.97 * tipPinch * tailPinch;
      const ix = sample.outer[0] + (sample.inner[0] - sample.outer[0]) * widthFrac;
      const iy = sample.outer[1] + (sample.inner[1] - sample.outer[1]) * widthFrac;
      const iz = sample.outer[2] + (sample.inner[2] - sample.outer[2]) * widthFrac;
      const base = i * 6;
      pos[base + 0] = ix;
      pos[base + 1] = iy;
      pos[base + 2] = iz;
      pos[base + 3] = sample.outer[0];
      pos[base + 4] = sample.outer[1];
      pos[base + 5] = sample.outer[2];
    }
    pair.geo.attributes.position.needsUpdate = true;
  }

  /** Volt: rebuild two angular plasma filaments along the blade, re-rolled 30 times per second. */
  private rebuildBolts(slot: SlashSlot, tailAlpha: number, headAlpha: number, fade: number, time: number) {
    const pos = slot.boltPos;
    const span = Math.max(0.02, headAlpha - tailAlpha);
    const seed = Math.floor(time * 30);
    for (let k = 0; k < 2; k++) {
      const base = k * (BOLT_SEGS + 1) * 2;
      const along = k === 0 ? 0.82 : 0.6;
      const width = k === 0 ? 0.055 : 0.04;
      for (let i = 0; i <= BOLT_SEGS; i++) {
        const u = i / BOLT_SEGS;
        const sample = this.sampleBlade(slot, clamp(tailAlpha + span * u, 0, 1), false);
        const env = Math.sin(u * Math.PI);
        const jr = (hash2(i + k * 31, seed) - 0.5) * 0.34 * env;
        const jy = (hash2(i * 1.7 + k * 13, seed + 7) - 0.5) * 0.26 * env;
        const f = along + jr;
        const cx = sample.inner[0] + (sample.outer[0] - sample.inner[0]) * f;
        const cyy = sample.inner[1] + (sample.outer[1] - sample.inner[1]) * f + jy;
        const cz = sample.inner[2] + (sample.outer[2] - sample.inner[2]) * f;
        let wx = 0, wy = width, wz = 0;
        if (k === 1) {
          const rx = sample.outer[0] - sample.inner[0], rz = sample.outer[2] - sample.inner[2];
          const rl = Math.hypot(rx, rz) || 1;
          wx = (rx / rl) * width;
          wy = 0;
          wz = (rz / rl) * width;
        }
        const o = (base + i * 2) * 3;
        pos[o] = cx - wx; pos[o + 1] = cyy - wy; pos[o + 2] = cz - wz;
        pos[o + 3] = cx + wx; pos[o + 4] = cyy + wy; pos[o + 5] = cz + wz;
      }
    }
    slot.boltGeo.attributes.position.needsUpdate = true;
    const strobe = hash2(seed, 5.3) > 0.25 ? 1 : 0.2;
    slot.boltMat.uniforms.uFade.value = fade * strobe;
    slot.boltMesh.visible = true;
  }

  /** Element signature burst on the finisher (4th hit). */
  private emitFinisherSignature(slot: SlashSlot) {
    const st = ELEMENT_SLASH_STYLES[slot.element];
    const [ox, oy, oz] = slot.origin;
    switch (slot.element) {
      case 0:
        for (let i = 0; i < 34; i++) {
          const a = (i / 34) * Math.PI * 2 + rand() * 0.15;
          const r = 1.0 + rand() * 0.4;
          this.spawn({x: ox + Math.cos(a) * r, y: oy + 0.15, z: oz + Math.sin(a) * r, vx: Math.cos(a) * 1.4, vy: 3.6 + rand() * 2.4, vz: Math.sin(a) * 1.4, life: 0.6 + rand() * 0.3, size: 0.9 + rand() * 0.8, shape: 2, grav: -12, drag: 0.6, from: st.core, to: st.main});
        }
        break;
      case 1:
        for (let i = 0; i < 30; i++) {
          const a = (i / 30) * Math.PI * 2;
          const r = 0.5 + rand() * 0.8;
          this.spawn({x: ox + Math.cos(a) * r, y: oy + 0.2 + rand() * 0.6, z: oz + Math.sin(a) * r, vx: -Math.sin(a) * 4.5, vy: 1.4 + rand() * 1.2, vz: Math.cos(a) * 4.5, life: 0.5 + rand() * 0.3, size: 0.9 + rand() * 0.6, shape: 3, grav: 0.8, drag: 1.6, swirl: 6, spin: 16, from: st.core, to: st.accent});
        }
        break;
      case 2:
        for (let i = 0; i < 36; i++) {
          const a = rand() * Math.PI * 2;
          const r = rand() * 1.4;
          this.spawn({x: ox + Math.cos(a) * r, y: oy + 0.1, z: oz + Math.sin(a) * r, vx: Math.cos(a) * 0.8, vy: 2.6 + rand() * 3.2, vz: Math.sin(a) * 0.8, life: 0.6 + rand() * 0.5, size: 1.0 + rand() * 0.9, shape: 4, grav: 3.0, drag: 1.8, flicker: 1, from: st.core, to: st.edge});
        }
        break;
      case 3:
        for (let i = 0; i < 30; i++) {
          const a = rand() * Math.PI * 2;
          this.spawn({x: ox, y: oy + 0.2, z: oz, vx: Math.cos(a) * (6 + rand() * 6), vy: rand() * 2, vz: Math.sin(a) * (6 + rand() * 6), life: 0.14 + rand() * 0.14, size: 0.9 + rand() * 0.6, shape: 5, grav: 0, drag: 7, flicker: 2, spin: 0, from: st.core, to: st.accent});
        }
        break;
      case 4:
        for (let i = 0; i < 32; i++) {
          const a = (i / 32) * Math.PI * 2;
          const r = 2.0 + rand() * 0.5;
          this.spawn({x: ox + Math.cos(a) * r, y: oy + 0.2 + rand() * 0.5, z: oz + Math.sin(a) * r, vx: -Math.cos(a) * 4.2 - Math.sin(a) * 1.5, vy: 0.3, vz: -Math.sin(a) * 4.2 + Math.cos(a) * 1.5, life: 0.5 + rand() * 0.2, size: 1.0 + rand() * 0.7, shape: i % 3 === 0 ? 1 : 6, grav: 0.2, drag: 0.9, from: st.accent, to: st.main});
        }
        break;
      default:
        for (let i = 0; i < 26; i++) {
          const a = rand() * Math.PI * 2;
          const sp = 2 + rand() * 3;
          this.spawn({x: ox + Math.cos(a) * 0.6, y: oy + 0.08, z: oz + Math.sin(a) * 0.6, vx: Math.cos(a) * sp, vy: 3 + rand() * 3, vz: Math.sin(a) * sp, life: 0.55 + rand() * 0.3, size: 0.8 + rand() * 0.9, shape: 7, grav: -14, drag: 0.5, spin: 10, from: st.main, to: st.edge});
        }
    }
  }

  private emitTipParticles(slot: SlashSlot, alpha: number, count: number) {
    const st = ELEMENT_SLASH_STYLES[slot.element];
    const sample = this.sampleBlade(slot, clamp(alpha, 0, 1), false);
    const [tx, , tz] = sample.tangent;
    for (let i = 0; i < count; i++) {
      const f = 0.55 + rand() * 0.45;
      const x = sample.inner[0] + (sample.outer[0] - sample.inner[0]) * f + (rand() - 0.5) * 0.12;
      const y = sample.inner[1] + (sample.outer[1] - sample.inner[1]) * f + (rand() - 0.5) * 0.10;
      const z = sample.inner[2] + (sample.outer[2] - sample.inner[2]) * f + (rand() - 0.5) * 0.12;
      const ox = x - slot.origin[0], oz = z - slot.origin[2];
      const ol = Math.hypot(ox, oz) || 1;
      const nx = ox / ol, nz = oz / ol;
      switch (slot.element) {
        case 0: {
          const spd = 2.0 + rand() * 2.6;
          if (i % 4 === 3) this.spawn({x, y, z, vx: tx * spd * 0.4, vy: 0.3, vz: tz * spd * 0.4, life: 0.4 + rand() * 0.2, size: 1.4 + rand() * 0.7, shape: 0, grav: -1, drag: 3, from: st.accent, to: st.main});
          else this.spawn({x, y, z, vx: tx * spd + nx * 0.8, vy: 1.0 + rand() * 2.2, vz: tz * spd + nz * 0.8, life: 0.45 + rand() * 0.35, size: 0.8 + rand() * 0.6, shape: 2, grav: -10, drag: 1.0, from: st.core, to: st.main});
          break;
        }
        case 1: {
          const spd = 3.5 + rand() * 3;
          this.spawn({x, y, z, vx: tx * spd, vy: 0.3 + rand() * 0.8, vz: tz * spd, life: 0.3 + rand() * 0.22, size: 0.7 + rand() * 0.6, shape: i % 3 === 0 ? 1 : 3, grav: 0.6, drag: 2.6, swirl: (rand() < 0.5 ? -1 : 1) * (5 + rand() * 4), spin: 10 + rand() * 8, from: st.core, to: st.accent});
          break;
        }
        case 2: {
          if (i % 4 === 0) {
            const spd = 3 + rand() * 3;
            this.spawn({x, y, z, vx: tx * spd + (rand() - 0.5), vy: 1 + rand() * 2, vz: tz * spd + (rand() - 0.5), life: 0.22 + rand() * 0.2, size: 0.6 + rand() * 0.4, shape: 1, grav: -2, drag: 3, from: st.core, to: st.accent});
          } else {
            const spd = 1.0 + rand() * 1.6;
            this.spawn({x, y, z, vx: tx * spd, vy: 1.2 + rand() * 1.8, vz: tz * spd, life: 0.45 + rand() * 0.4, size: 0.9 + rand() * 0.8, shape: 4, grav: 3.2, drag: 2.2, flicker: 1, from: st.core, to: st.edge});
          }
          break;
        }
        case 3: {
          const a = rand() * Math.PI * 2;
          const spd = 4 + rand() * 5;
          this.spawn({x, y, z, vx: Math.cos(a) * spd, vy: (rand() - 0.4) * spd * 0.6, vz: Math.sin(a) * spd, life: 0.12 + rand() * 0.14, size: 0.7 + rand() * 0.6, shape: 5, grav: 0, drag: 8, flicker: 2, spin: 0, from: st.core, to: st.accent});
          break;
        }
        case 4: {
          const pull = 1.2 + rand() * 0.6;
          this.spawn({x, y, z, vx: -ox * pull - tx * 0.5, vy: 0.4 + rand() * 0.4, vz: -oz * pull - tz * 0.5, life: 0.6 + rand() * 0.4, size: 0.9 + rand() * 0.8, shape: i % 3 === 0 ? 0 : 6, grav: 0.3, drag: 0.8, from: st.accent, to: st.main});
          break;
        }
        default: {
          if (i % 5 < 3) {
            const spd = 2.2 + rand() * 2.0;
            this.spawn({x, y, z, vx: tx * spd, vy: 0.3 + rand() * 0.6, vz: tz * spd, life: 0.18 + rand() * 0.14, size: 0.7 + rand() * 0.5, shape: 1, grav: -1, drag: 4.5, from: st.core, to: st.main});
          } else {
            this.spawn({x, y, z, vx: tx * 1.4 + nx * 1.2, vy: 1.5 + rand() * 2, vz: tz * 1.4 + nz * 1.2, life: 0.5 + rand() * 0.3, size: 0.6 + rand() * 0.6, shape: 7, grav: -11, drag: 0.6, spin: 9, from: st.main, to: st.edge});
          }
        }
      }
    }
  }

  private spawn(o: ParticleSpec) {
    let slot = this.particles.find(p => !p.alive);
    if (!slot) {
      slot = this.particles[0];
      for (const p of this.particles) if (p.age / p.life > slot.age / slot.life) slot = p;
    }
    slot.alive = true;
    slot.x = o.x; slot.y = o.y; slot.z = o.z;
    slot.vx = o.vx; slot.vy = o.vy; slot.vz = o.vz;
    slot.age = 0;
    slot.life = Math.max(0.05, o.life);
    slot.size = o.size;
    slot.shape = o.shape;
    slot.grav = o.grav;
    slot.drag = o.drag ?? 3;
    slot.swirl = o.swirl ?? 0;
    slot.rot = rand() * Math.PI * 2;
    slot.spin = o.spin ?? 0;
    slot.flicker = o.flicker ?? 0;
    slot.r0 = o.from[0]; slot.g0 = o.from[1]; slot.b0 = o.from[2];
    slot.r1 = o.to[0]; slot.g1 = o.to[1]; slot.b1 = o.to[2];
  }

  dispose() {
    this.forms.dispose();
    this.activeCount = 0;
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
      s.boltGeo.dispose();
      s.boltMat.dispose();
    }
    this.particleMesh.geometry.dispose();
    this.particleMesh.material.dispose();
  }
}
