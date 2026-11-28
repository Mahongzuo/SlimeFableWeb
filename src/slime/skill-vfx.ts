import {
  darkCreep, darkFieldRifts, darkRend, fireBreath, fireEruption, fireExplosion, fireball, rockFissure, rockFist, rockMeteor,
  waterDome, waterOrb, waterPrison, waterRing, windBoomerang, windDash, windTornado, type SkillHost,
} from './skill-forms';
import type {SkillDef} from './skills';
import type {Vec} from './types';
import {VfxKit} from './vfx-kit';

export interface SkillEffectCallbacks {
  getTargetPositions: () => Vec[];
  castWall?: (from: Vec, to: Vec) => Vec | undefined;
  blocked?: (from: Vec, to: Vec) => boolean;
  sampleTerrain: (x: number, z: number) => number | null;
  onSkillHitArea: (center: Vec, def: SkillDef, isBurst?: boolean) => void;
  onSpawnBurst: (pos: Vec, element: number, count?: number, spread?: number) => void;
}

interface ActiveProjectile {
  def: SkillDef;
  pos: Vec;
  vel: Vec;
  age: number;
  maxAge: number;
  mesh: any;
  aimed: boolean;
  trailAcc: number;
  onStep?: (dt: number, age: number) => void;
}

interface ActiveTimedFx {
  age: number;
  life: number;
  /** Normalised progress, frame dt and age in seconds. Not called while age is still negative (delayed start). */
  update: (t: number, dt: number, age: number) => void;
  dispose: () => void;
}

// Element palettes: [coreHDR, midHDR, edgeHDR]
const EL_PAL: readonly (readonly [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]])[] = [
  [[1.40, 2.00, 2.25], [0.18, 0.86, 1.82], [0.05, 0.34, 1.08]], // 0 Water: ice-foam -> azure -> deep cobalt
  [[1.55, 2.15, 1.80], [0.34, 1.62, 0.96], [0.10, 0.72, 0.48]], // 1 Wind: mint-white -> luminous emerald -> jade
  [[2.45, 2.10, 1.05], [2.05, 0.64, 0.10], [1.18, 0.12, 0.02]], // 2 Fire: incandescent -> molten flame -> crimson ember
  [[2.10, 2.05, 2.55], [0.98, 0.50, 2.25], [0.42, 0.14, 1.32]], // 3 Volt: blinding white-blue -> plasma violet -> indigo
  [[1.75, 1.08, 2.30], [0.72, 0.22, 1.48], [0.16, 0.04, 0.44]], // 4 Dark: amethyst-magenta -> void violet -> obsidian abyss
  [[2.25, 2.10, 1.52], [1.72, 1.32, 0.48], [0.92, 0.62, 0.20]], // 5 Physical: sunlit steel -> champagne gold -> earth bronze
];

const EL_HEX = [0x38b2ff, 0x45eb9a, 0xff6214, 0x9b66ff, 0x8a3ef0, 0xf2c96b] as const;
const EL_CORE = [0xe0f8ff, 0xe2fff0, 0xfff2a6, 0xf2eeff, 0xe5b8ff, 0xfffce8] as const;

const NIAGARA_MAX = 2800;

const NIAGARA_VERT = /* glsl */ `
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
  float dist = max(0.75, -mv.z);
  gl_PointSize = clamp(aSize * (345.0 / dist), 1.5, 72.0);
}
`;

/**
 * 9 element-tailored point-sprite silhouettes:
 * 0: soft mote  1: 4-pt anime star  2: iridescent soap bubble  3: electric plasma diamond
 * 4: abyssal void ring  5: water teardrop  6: spinning wind leaf sliver  7: pointed flame tongue  8: faceted rock chip
 */
const NIAGARA_FRAG = /* glsl */ `
precision highp float;
varying vec3 vColor;
varying float vAlpha;
varying float vShape;
varying float vRot;
void main() {
  if (vAlpha <= 0.004) discard;
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float cs = cos(vRot), sn = sin(vRot);
  vec2 q = vec2(cs * p.x - sn * p.y, sn * p.x + cs * p.y);

  float m = 0.0;
  vec3 col = vColor;
  if (vShape < 0.5) {
    float halo = exp(-r * r * 4.8) * (1.0 - smoothstep(0.72, 1.0, r));
    float hot = exp(-r * r * 20.0);
    m = halo * 0.78 + hot * 0.65;
    col = mix(vColor, vColor * 1.45 + vec3(0.35), hot);
  } else if (vShape < 1.5) {
    float ax = abs(p.x), ay = abs(p.y);
    float crossArm = exp(-ax * 14.0) * exp(-ay * 2.5) + exp(-ay * 14.0) * exp(-ax * 2.5);
    float core = exp(-r * r * 18.0);
    m = clamp(crossArm * 0.76 + core * 0.95, 0.0, 1.0) * (1.0 - smoothstep(0.78, 1.0, r));
    col = mix(vColor, vec3(1.5), core * 0.68);
  } else if (vShape < 2.5) {
    float rim = exp(-pow((r - 0.74) * 10.0, 2.0));
    float spec = exp(-dot(p - vec2(-0.30, -0.32), p - vec2(-0.30, -0.32)) * 30.0);
    float fill = (1.0 - r * r) * 0.14;
    m = clamp(rim * 0.88 + spec * 0.96 + fill, 0.0, 1.0) * (1.0 - smoothstep(0.88, 1.0, r));
    col = mix(vColor, vec3(1.55, 1.75, 1.95), spec * 0.85 + rim * 0.28);
  } else if (vShape < 3.5) {
    float d = abs(q.x) * 1.0 + abs(q.y) * 3.4;
    float spark = (1.0 - smoothstep(0.45, 0.98, d));
    float hot = exp(-r * r * 26.0);
    m = clamp(spark * 0.90 + hot, 0.0, 1.0);
    col = mix(vColor, vec3(1.75, 1.72, 2.15), hot * 0.80);
  } else if (vShape < 4.5) {
    float edge = exp(-pow((r - 0.58) * 7.8, 2.0));
    float mist = exp(-r * r * 3.6) * 0.34;
    m = clamp(edge * 0.90 + mist, 0.0, 1.0) * (1.0 - smoothstep(0.82, 1.0, r));
  } else if (vShape < 5.5) {
    float y = p.y;
    float w = y > 0.18 ? sqrt(max(0.0, 1.0 - pow((y - 0.18) / 0.76, 2.0))) * 0.58 : 0.58 * clamp((y + 0.94) / 1.12, 0.0, 1.0);
    float body = (1.0 - smoothstep(w - 0.14, w, abs(p.x))) * step(-0.94, y) * step(y, 0.94);
    float spec = exp(-dot(p - vec2(-0.16, 0.34), p - vec2(-0.16, 0.34)) * 30.0);
    m = clamp(body * 0.74 + spec * 0.92, 0.0, 1.0);
    col = mix(vColor * 1.15, vec3(1.55, 1.80, 2.0), spec * 0.82);
  } else if (vShape < 6.5) {
    float d = length(vec2(q.x * 0.85, q.y * 3.5));
    float vein = exp(-q.y * q.y * 130.0) * exp(-q.x * q.x * 1.5);
    m = (1.0 - smoothstep(0.48, 0.94, d)) * 0.78 + vein * 0.62;
    col = mix(vColor * 1.2, vec3(1.55, 1.75, 1.60), vein * 0.52);
  } else if (vShape < 7.5) {
    float y = -p.y;
    float w = y < -0.18 ? sqrt(max(0.0, 1.0 - pow((y + 0.18) / 0.76, 2.0))) * 0.56 : 0.56 * clamp((0.94 - y) / 1.12, 0.0, 1.0);
    float body = (1.0 - smoothstep(w - 0.18, w, abs(p.x))) * step(-0.94, y) * step(y, 0.94);
    float hot = exp(-dot(p - vec2(0.0, 0.32), p - vec2(0.0, 0.32)) * 9.5);
    m = clamp(body * 0.84 + hot * 0.65, 0.0, 1.0);
    col = mix(vColor * 1.25, vec3(2.1, 1.85, 1.1), hot * 0.72);
  } else {
    float d = max(abs(q.x) * 0.866 + abs(q.y) * 0.5, abs(q.y));
    m = 1.0 - smoothstep(0.50, 0.62, d);
    col = vColor * (0.58 + 0.56 * step(0.0, q.x + q.y * 0.55));
  }

  float a = clamp(m * vAlpha, 0.0, 1.0);
  if (a < 0.008) discard;
  gl_FragColor = vec4(col * a, a);
}
`;

const NOISE_GLSL = /* glsl */ `
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
vec2 hash22(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
float fbm2(vec2 p) { return vnoise(p) * 0.65 + vnoise(p * 2.13 + vec2(7.3, 11.9)) * 0.35; }
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
float celStep(float edge, float val) {
  float w = max(fwidth(val) * 1.35, 0.015);
  return smoothstep(edge - w, edge + w, val);
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
 * Element-specific ground shockwaves (uMode=0) and sustained elemental fields/arrays (uMode=1).
 * Every element has its own unmistakable geometric language — zero shared generic hex rings.
 */
const WAVE_RING_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uColor;
uniform vec3 uCore;
uniform float uProgress;
uniform float uTime;
uniform float uMode;
uniform float uElement;
${NOISE_GLSL}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float ang = atan(p.y, p.x);

  if (uMode < 0.5) {
    float pr = clamp(uProgress, 0.0, 1.0);
    float e = 1.0 - (1.0 - pr) * (1.0 - pr);
    float R = mix(0.12, 0.90, e);
    float fade = (1.0 - pr) * (1.0 - pr * 0.42);
    float m = 0.0;
    float core = 0.0;

    if (uElement < 0.5) {
      // Water: triple concentric fluid ripples + wave crest shimmer
      for (int k = 0; k < 3; k++) {
        float fk = float(k);
        float rr = R - fk * 0.14;
        if (rr > 0.02) {
          float rip = sin(ang * (8.0 + fk * 4.0) + uTime * 7.0) * 0.012;
          m += exp(-pow((r - (rr + rip)) * (42.0 - fk * 8.0), 2.0)) * (1.0 - fk * 0.26);
        }
      }
      core = exp(-pow((r - R) * 68.0, 2.0));
    } else if (uElement < 1.5) {
      // Wind: 3-arm spinning spiral gale + thin outer vacuum rim
      float sp = sin(ang * 3.0 + r * 14.0 - uTime * 10.0);
      float arms = smoothstep(0.72, 1.0, sp) * smoothstep(0.08, R, r) * (1.0 - smoothstep(R, R + 0.08, r));
      float rim = exp(-pow((r - R) * 38.0, 2.0)) * 0.75;
      m = arms * 0.92 + rim;
      core = rim;
    } else if (uElement < 2.5) {
      // Fire: ragged flame-licked blast ring + glowing scorch center
      float n = fbm2(vec2(ang * 4.5, uTime * 5.0 + r * 3.0));
      float rr = R + (n - 0.5) * 0.12;
      float rim = exp(-pow((r - rr) * 20.0, 2.0));
      float scorch = (1.0 - smoothstep(0.0, R * 0.92, r)) * (0.18 + 0.24 * n);
      m = rim + scorch;
      core = exp(-pow((r - rr) * 48.0, 2.0));
    } else if (uElement < 3.5) {
      // Volt: 30 Hz continuous angular jagged lightning perimeter + radial discharge spokes
      float ts = floor(uTime * 30.0);
      float seg = (ang + 3.14159265) / 6.2831853 * 24.0;
      float i0 = floor(seg);
      float i1 = mod(i0 + 1.0, 24.0);
      float jag = (mix(hash21(vec2(i0, ts)), hash21(vec2(i1, ts)), fract(seg)) - 0.5) * 0.11;
      float rim = 1.0 - smoothstep(0.004, 0.022, abs(r - (R + jag)));
      float rimGlow = exp(-pow((r - (R + jag)) * 18.0, 2.0)) * 0.35;
      float spokes = step(0.91, hash21(vec2(floor(ang * 16.0), ts + 5.0))) * smoothstep(R * 0.22, R, r) * (1.0 - smoothstep(R, R + 0.03, r));
      float strobe = 0.65 + 0.35 * step(0.3, hash21(vec2(ts, 1.0)));
      m = (rim + rimGlow + spokes * 0.85) * strobe;
      core = rim;
    } else if (uElement < 4.5) {
      // Dark: imploding gravitational pulse with inward tendrils
      float Rd = mix(0.92, 0.12, e);
      float rim = exp(-pow((r - Rd) * 22.0, 2.0));
      float tend = smoothstep(0.68, 1.0, sin(ang * 7.0 + r * 10.0 + uTime * 4.5))
        * smoothstep(Rd, Rd + 0.28, r) * (1.0 - smoothstep(Rd + 0.28, 0.98, r)) * 0.65;
      m = rim + tend;
      core = rim * 0.55;
      fade = 1.0 - pr * pr;
    } else {
      // Physical: 11 radial earth-fracture cracks + kinetic dust compression wave
      float sectors = 11.0;
      float sa = (ang + 3.14159265) / 6.2831853 * sectors;
      float sid = floor(sa);
      float ca = (sid + 0.5 + (hash21(vec2(sid, 2.0)) - 0.5) * 0.55) / sectors * 6.2831853 - 3.14159265 + sin(r * 19.0 + sid) * 0.04;
      float dist = abs(ang - ca) * r;
      float crack = (1.0 - smoothstep(0.004, 0.020, dist)) * step(r, R * 1.04) * smoothstep(0.06, 0.20, r);
      float dust = exp(-pow((r - R) * 14.0, 2.0)) * 0.62;
      m = crack * 1.1 + dust;
      core = crack;
      fade = 1.0 - pr;
    }

    float a = clamp(m * fade, 0.0, 0.95);
    if (a < 0.01) discard;
    vec3 col = mix(uColor, uCore, clamp(core * 1.1, 0.0, 1.0));
    gl_FragColor = vec4(col * a, a);
  } else {
    float fade = uProgress;
    float m = 0.0;
    float core = 0.0;

    if (uElement < 0.5) {
      // Water Q: shimmering caustic interference pool + concentric wave rings
      float c1 = sin(p.x * 16.0 + uTime * 3.2) * cos(p.y * 16.0 - uTime * 2.6);
      float c2 = sin((p.x + p.y) * 12.0 - uTime * 4.0) * cos((p.x - p.y) * 12.0 + uTime * 2.8);
      float caust = pow(clamp(0.5 + 0.5 * (c1 * 0.55 + c2 * 0.45), 0.0, 1.0), 3.2) * (1.0 - smoothstep(0.65, 0.96, r));
      float r1 = exp(-abs(r - 0.92) * 52.0);
      float r2 = exp(-abs(r - (0.68 + 0.02 * sin(ang * 6.0 + uTime * 3.0))) * 44.0) * 0.72;
      float r3 = exp(-abs(r - 0.36) * 40.0) * 0.55;
      m = (caust * 0.62 + r1 + r2 + r3) * fade;
      core = r1 + caust * 0.5;
    } else if (uElement < 1.5) {
      // Wind R: triple-spiral cyclone streamlines + dashed outer wind compass
      float a1 = ang - uTime * 4.6;
      float sp1 = pow(max(0.0, sin(a1 * 3.0 + r * 14.0)), 6.0) * smoothstep(0.12, 0.35, r) * (1.0 - smoothstep(0.76, 0.96, r));
      float sp2 = pow(max(0.0, sin(a1 * 6.0 + r * 10.0 + 1.2)), 8.0) * smoothstep(0.28, 0.50, r) * (1.0 - smoothstep(0.84, 0.98, r)) * 0.6;
      float rim = exp(-abs(r - 0.92) * 56.0) * step(0.32, fract(ang * 3.82 - uTime * 2.4));
      float eye = exp(-abs(r - 0.22) * 42.0) * 0.75;
      m = (sp1 * 0.95 + sp2 + rim + eye) * fade;
      core = rim + eye + sp1 * 0.45;
    } else if (uElement < 2.5) {
      // Fire Q: volcanic caldera fissures + solar flame triangles
      float a1 = ang + uTime * 0.85;
      float magma = pow(max(0.0, 1.0 - abs(fbm2(p * 4.8 + vec2(uTime * 0.3, -uTime * 0.25)) - 0.5) * 6.5), 2.2) * (1.0 - smoothstep(0.60, 0.94, r));
      float rim = exp(-abs(r - 0.90) * 46.0);
      float teeth = exp(-abs(r - (0.72 + 0.14 * abs(sin(a1 * 4.0)))) * 40.0) * 0.90;
      float heat = exp(-r * r * 3.8) * 0.32 * (0.75 + 0.25 * sin(uTime * 9.0));
      m = (magma * 0.95 + rim + teeth + heat) * fade;
      core = magma + rim * 0.85 + teeth * 0.5;
    } else if (uElement < 3.5) {
      // Volt Q: crisp Tesla octagon with interpolated continuous 30 Hz crackling lightning perimeter + 8 nodes
      float ts = floor(uTime * 30.0);
      float oct = cos(mod(ang + 3.14159265, 0.785398) - 0.392699);
      float rOct = 0.82 / max(0.75, oct);
      float seg = (ang + 3.14159265) / 6.2831853 * 32.0;
      float i0 = floor(seg);
      float i1 = mod(i0 + 1.0, 32.0);
      float jag = (mix(hash21(vec2(i0, ts)), hash21(vec2(i1, ts)), fract(seg)) - 0.5) * 0.075;
      float perim = 1.0 - smoothstep(0.004, 0.022, abs(r - (rOct + jag)));
      float perimGlow = exp(-pow((r - (rOct + jag)) * 20.0, 2.0)) * 0.42;
      float inner = exp(-abs(r - 0.42) * 56.0) * (0.65 + 0.35 * step(0.4, hash21(vec2(ts, 2.0))));
      float nodes = exp(-abs(r - 0.86) * 20.0) * smoothstep(0.94, 0.995, cos(ang * 8.0));
      float spokeAng = mod(ang + 0.392699, 0.785398) - 0.392699;
      float spokeZig = (mix(hash21(vec2(floor(r * 14.0), ts)), hash21(vec2(floor(r * 14.0) + 1.0, ts)), fract(r * 14.0)) - 0.5) * 0.07;
      float arcs = (1.0 - smoothstep(0.004, 0.018, abs(spokeAng * r - spokeZig))) * smoothstep(0.42, 0.86, r) * (1.0 - smoothstep(0.86, 0.90, r)) * 0.85;
      m = (perim + perimGlow + inner * 0.75 + nodes * 1.1 + arcs) * fade;
      core = perim + nodes + arcs;
    } else if (uElement < 4.5) {
      // Dark R / Q: arcane eclipse sigil + counter-rotating hexagram + inward void pull
      float a1 = ang + uTime * 1.2;
      float a2 = ang - uTime * 2.0;
      float rOut = exp(-abs(r - 0.92) * 56.0);
      float hex = exp(-abs(r - (0.64 + 0.09 * cos(a1 * 6.0))) * 50.0) * 0.88;
      float ticks = exp(-abs(r - 0.80) * 28.0) * smoothstep(0.68, 0.96, abs(cos(a2 * 12.0)));
      float pull = pow(max(0.0, sin(ang * 9.0 - r * 10.0 + uTime * 4.0)), 6.0) * smoothstep(0.18, 0.88, r) * 0.55;
      float horizon = exp(-abs(r - 0.28) * 34.0) * 0.95;
      m = (rOut + hex + ticks * 0.78 + pull + horizon) * fade;
      core = rOut + horizon + ticks * 0.5;
    } else {
      // Physical: golden seismic fracture ring + geometric crest
      float sectors = 8.0;
      float crack = (1.0 - smoothstep(0.008, 0.030, abs(sin(ang * sectors * 0.5)) * r)) * smoothstep(0.14, 0.30, r) * (1.0 - smoothstep(0.84, 0.94, r));
      float rOut = exp(-abs(r - 0.90) * 48.0);
      float rIn = exp(-abs(r - 0.48) * 48.0) * 0.75;
      m = (crack * 0.9 + rOut + rIn) * fade;
      core = rOut + crack * 0.6;
    }

    float a = clamp(m, 0.0, 0.94);
    if (a < 0.01) discard;
    vec3 col = mix(uColor, uCore, clamp(core, 0.0, 1.0));
    gl_FragColor = vec4(col * a, a);
  }
}
`;

const FLOW_MESH_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uColor;
uniform vec3 uCore;
uniform vec3 uEdge;
uniform float uTime;
uniform float uAlpha;
uniform float uStyle; // 0 water wave, 1 wind funnel/ribbon, 2 fire plume/trail, 3 volt bolt strip, 4 dark accretion/rift, 5 physical sword-qi
${NOISE_GLSL}

void main() {
  float u = vUv.x, v = vUv.y;
  float a = 0.0;
  vec3 col = uColor;

  if (uStyle < 0.5) {
    // 0: Water sweeping tidal ribbon (crisp cel-stepped wave + Voronoi foam cutouts + razor white crest)
    float arch = sin(clamp(u, 0.0, 1.0) * 3.14159265);
    float crest = 0.88 + sin(u * 18.0 - uTime * 12.0) * 0.04;
    float inner = 0.16 * (1.0 - arch) + 0.08;
    float body = celStep(0.0, min(crest - v, v - inner)) * celStep(0.04, arch);
    vec2 vor = voronoi2(vec2(u * 15.0 - uTime * 9.0, v * 5.0));
    float hole = (1.0 - celStep(0.28, vor.x)) * (1.0 - celStep(crest - 0.14, v));
    float foam = celStep(crest - 0.11, v);
    float jet = celStep(0.60, vnoise(vec2(u * 6.0 - uTime * 11.0, v * 22.0)));
    a = body * (1.0 - hole * 0.88) * (0.68 + 0.32 * foam);
    col = mix(uEdge * 1.1, uColor * 1.15, celStep(0.42, v));
    col = mix(col, uCore * 1.25, clamp(foam + jet * 0.35, 0.0, 1.0));
  } else if (uStyle < 1.5) {
    // 1: Wind translucent vacuum streak ribbon / cyclone funnel
    float s1 = exp(-pow((fract(v * 3.0 + u * 2.2 - uTime * 2.8) - 0.5) * 14.0, 2.0));
    float s2 = exp(-pow((fract(v * 6.0 - u * 1.5 - uTime * 3.6) - 0.5) * 18.0, 2.0)) * 0.65;
    float endFade = smoothstep(0.0, 0.16, v) * (1.0 - smoothstep(0.76, 1.0, v));
    a = (s1 + s2 + 0.08) * endFade;
    col = mix(uColor, uCore * 1.35, clamp(s1 * 0.9, 0.0, 1.0));
  } else if (uStyle < 2.5) {
    // 2: Fire crisp cel-stepped flame tongues (sharp Voronoi licks + crimson/orange/gold bands, zero blurry tube!)
    vec2 vor = voronoi2(vec2(u * 7.5 + v * 1.4, v * 4.8 - uTime * 6.5));
    float n2 = vnoise(vec2(u * 16.0, v * 10.0 - uTime * 11.0));
    float flameField = (1.0 - vor.x) * 0.68 + n2 * 0.32 - v * 0.72;
    float mask = celStep(0.10, flameField) * celStep(0.04, v) * (1.0 - celStep(0.95, v));
    float midBand = celStep(0.26, flameField);
    float hotCore = celStep(0.46, flameField);
    a = mask * 0.92;
    col = mix(uEdge * 1.2, uColor * 1.1, midBand);
    col = mix(col, uCore * 1.15, hotCore);
  } else if (uStyle < 3.5) {
    // 3: Volt thick 3D jagged plasma bolt strip
    float d = abs(v - 0.5) * 2.0;
    float core = exp(-d * d * 18.0);
    float glow = exp(-d * d * 2.8) * 0.58;
    float tap = smoothstep(0.0, 0.05, u) * (1.0 - smoothstep(0.95, 1.0, u));
    a = (core + glow) * tap;
    col = mix(uColor * 1.35, uCore * 2.0, core);
  } else if (uStyle < 4.5) {
    // 4: Dark razor-edged gravitational accretion ring / rift streaks
    float d = abs(v - 0.5) * 2.0;
    float streak = celStep(0.32, sin(u * 25.1327 - uTime * 9.0 + vnoise(vec2(u * 12.0, uTime * 2.2)) * 3.2) * 0.5 + 0.5);
    float core = 1.0 - celStep(0.24, d);
    float outerBand = (1.0 - celStep(0.78, d)) * streak * 0.75;
    a = max(core, outerBand);
    col = mix(uColor * 1.15, uCore * 1.45, core);
  } else {
    // 5: Physical razor cel-stepped crescent sword-qi blade
    float arch = sin(clamp(u, 0.0, 1.0) * 3.14159265);
    float inner = mix(0.68, 0.14, arch);
    float outer = 0.94;
    float body = celStep(0.0, min(outer - v, v - inner)) * celStep(0.04, arch);
    float brush = celStep(0.58, vnoise(vec2(u * 5.0 - uTime * 12.0, v * 30.0)));
    float spine = celStep(0.87, v) * body;
    float sheen = celStep(0.82, 1.0 - abs(u - fract(uTime * 2.4)) * 2.4) * body;
    a = body * 0.92;
    col = mix(uEdge * 1.1, uColor * 1.15, celStep(0.52, v) * 0.8 + brush * 0.2);
    col = mix(col, uCore * 1.45, clamp(spine + sheen * 0.75, 0.0, 1.0));
  }

  float fa = clamp(a * uAlpha, 0.0, 1.0);
  if (fa < 0.01) discard;
  gl_FragColor = vec4(col * fa, fa);
}
`;

/** Dark normal-blended obsidian shadow pool / event-horizon backing for Dark & Physical cracks. */
const DARK_DISC_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uTime;
uniform float uMode; // 0 dark abyss pool, 1 physical crack shadow
${NOISE_GLSL}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float ang = atan(p.y, p.x);
  if (uMode < 0.5) {
    float n = fbm2(p * 3.8 + vec2(uTime * 0.5, -uTime * 0.4));
    float pool = (1.0 - smoothstep(0.45, 0.96, r + (n - 0.5) * 0.18));
    float a = pool * 0.78 * uAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  } else {
    float sectors = 11.0;
    float sa = (ang + 3.14159265) / 6.2831853 * sectors;
    float sid = floor(sa);
    float ca = (sid + 0.5 + (hash21(vec2(sid, 2.0)) - 0.5) * 0.55) / sectors * 6.2831853 - 3.14159265 + sin(r * 19.0 + sid) * 0.04;
    float dist = abs(ang - ca) * r;
    float crack = (1.0 - smoothstep(0.008, 0.032, dist)) * smoothstep(0.05, 0.16, r) * (1.0 - smoothstep(0.84, 0.96, r));
    float pit = (1.0 - smoothstep(0.0, 0.36, r)) * 0.65;
    float a = clamp(crack + pit, 0.0, 0.85) * uAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }
}
`;

export interface ParticleSpawnOpts {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number;
  size: number;
  element: number;
  shape?: number;
  drag?: number;
  ay?: number;
  swirl?: number;
  pull?: number;
  ax?: number;
  az?: number;
  intensity?: number;
  spin?: number;
}

/**
 * Six-element skill VFX: shared Niagara-style particle pool, projectiles, timed effects and the hit dispatch.
 * The bodies of the Water / Wind / Fire / Dark / Physical skills live in skill-forms.ts and are built from the
 * per-element form language in vfx-kit.ts; Volt's plasma strips (bolt, chain, thunder cage) stay here.
 */
export class SkillVfxSystem {
  private T: any;
  readonly root: any;
  private projectiles: ActiveProjectile[] = [];
  private fxList: ActiveTimedFx[] = [];
  private time = 0;
  private kit: VfxKit;
  private host: SkillHost;

  private pPos = new Float32Array(NIAGARA_MAX * 3);
  private pCol = new Float32Array(NIAGARA_MAX * 3);
  private pSize = new Float32Array(NIAGARA_MAX);
  private pAlpha = new Float32Array(NIAGARA_MAX);
  private pShape = new Float32Array(NIAGARA_MAX);
  private pRot = new Float32Array(NIAGARA_MAX);

  private pVelX = new Float32Array(NIAGARA_MAX);
  private pVelY = new Float32Array(NIAGARA_MAX);
  private pVelZ = new Float32Array(NIAGARA_MAX);
  private pAge = new Float32Array(NIAGARA_MAX);
  private pLife = new Float32Array(NIAGARA_MAX);
  private pBaseSize = new Float32Array(NIAGARA_MAX);
  private pEl = new Uint8Array(NIAGARA_MAX);
  private pDrag = new Float32Array(NIAGARA_MAX);
  private pAy = new Float32Array(NIAGARA_MAX);
  private pSwirl = new Float32Array(NIAGARA_MAX);
  private pPull = new Float32Array(NIAGARA_MAX);
  private pAx = new Float32Array(NIAGARA_MAX);
  private pAz = new Float32Array(NIAGARA_MAX);
  private pIntensity = new Float32Array(NIAGARA_MAX);
  private pSpin = new Float32Array(NIAGARA_MAX);
  private pCursor = 0;
  private pAliveCount = 0;

  private pGeo: any;
  private pMat: any;
  private pPoints: any;

  constructor(private ctx: {THREE: any; scene: any}) {
    this.T = ctx.THREE;
    this.root = new this.T.Group();
    this.root.name = 'slime-skill-vfx';
    ctx.scene.add(this.root);

    const T = this.T;
    this.kit = new VfxKit(T);
    this.host = {
      T,
      kit: this.kit,
      root: this.root,
      now: () => this.time,
      emit: o => this.emit(o),
      burst: (c, el, count, radius, speed, lift, shape) => this.emitRadialBurst(c, el, count, radius, speed, lift, shape),
      fx: (life, update, dispose, delay = 0) => {
        this.fxList.push({age: -delay, life, update, dispose: dispose ?? (() => {})});
      },
      mesh: (geo, mat, order = 24, parent) => {
        const m = this.prepMesh(new T.Mesh(geo, mat), order);
        m.frustumCulled = false;
        (parent ?? this.root).add(m);
        return m;
      },
      rune: (radius, element) => this.makeShaderDisc(radius, element, 1),
      shadow: (radius, color) => this.makeDarkBackingDisc(radius, 0, [color[0], color[1], color[2]]),
      shockRing: (c, radius, el, life) => this.spawnShockRing(c, 0.3, radius, el, life),
      machRing: (pos, fwd, scale, life) => this.spawnMachRing(pos, fwd, scale, 1, life),
    };
    this.pGeo = new T.BufferGeometry();
    this.pGeo.setAttribute('position', new T.BufferAttribute(this.pPos, 3).setUsage(T.DynamicDrawUsage));
    this.pGeo.setAttribute('aColor', new T.BufferAttribute(this.pCol, 3).setUsage(T.DynamicDrawUsage));
    this.pGeo.setAttribute('aSize', new T.BufferAttribute(this.pSize, 1).setUsage(T.DynamicDrawUsage));
    this.pGeo.setAttribute('aAlpha', new T.BufferAttribute(this.pAlpha, 1).setUsage(T.DynamicDrawUsage));
    this.pGeo.setAttribute('aShape', new T.BufferAttribute(this.pShape, 1).setUsage(T.DynamicDrawUsage));
    this.pGeo.setAttribute('aRot', new T.BufferAttribute(this.pRot, 1).setUsage(T.DynamicDrawUsage));
    this.pGeo.setDrawRange(0, 0);

    this.pMat = new T.ShaderMaterial({
      vertexShader: NIAGARA_VERT,
      fragmentShader: NIAGARA_FRAG,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
    });
    this.pPoints = new T.Points(this.pGeo, this.pMat);
    this.pPoints.name = 'slime-niagara-particles';
    this.pPoints.frustumCulled = false;
    this.pPoints.layers.set(1);
    this.pPoints.renderOrder = 28;
    this.root.add(this.pPoints);
  }

  get activeCount(): number {
    return this.projectiles.length + this.fxList.length + (this.pAliveCount > 0 ? 1 : 0);
  }

  private prepMesh(m: any, order = 24) {
    m.layers.set(1);
    m.renderOrder = order;
    return m;
  }

  /** Kit materials go back to their pool (keeping shader programs compiled); everything else is disposed. */
  private disposeGroup(g: any) {
    this.kit.release(g);
  }

  private emit(o: ParticleSpawnOpts) {
    const i = this.pCursor;
    this.pCursor = (this.pCursor + 1) % NIAGARA_MAX;
    this.pPos[i * 3] = o.x;
    this.pPos[i * 3 + 1] = o.y;
    this.pPos[i * 3 + 2] = o.z;
    this.pVelX[i] = o.vx;
    this.pVelY[i] = o.vy;
    this.pVelZ[i] = o.vz;
    this.pAge[i] = 0;
    this.pLife[i] = Math.max(0.06, o.life);
    this.pBaseSize[i] = o.size;
    this.pEl[i] = Math.min(5, Math.max(0, o.element));
    this.pShape[i] = o.shape ?? 0;
    this.pDrag[i] = o.drag ?? 2.4;
    this.pAy[i] = o.ay ?? 0;
    this.pSwirl[i] = o.swirl ?? 0;
    this.pPull[i] = o.pull ?? 0;
    this.pAx[i] = o.ax ?? o.x;
    this.pAz[i] = o.az ?? o.z;
    this.pIntensity[i] = o.intensity ?? 1.0;
    this.pRot[i] = Math.random() * Math.PI * 2;
    this.pSpin[i] = o.spin ?? 0;
    this.pAlpha[i] = 0.01;
  }

  private defaultShape(el: number, idx: number): number {
    if (el === 0) return idx % 3 === 0 ? 2 : idx % 3 === 1 ? 5 : 0; // Water: bubbles + teardrops + mist
    if (el === 1) return idx % 3 === 0 ? 1 : 6; // Wind: leaf slivers + crisp glints
    if (el === 2) return idx % 4 === 0 ? 1 : 7; // Fire: pointed flame tongues + sparks
    if (el === 3) return idx % 3 === 0 ? 1 : 3; // Volt: electric plasma diamonds + glints
    if (el === 4) return idx % 3 === 0 ? 1 : 4; // Dark: abyssal void wisps + starlight
    return idx % 3 === 0 ? 1 : 8; // Physical: faceted rock chips + steel glints
  }

  private emitRadialBurst(center: Vec, element: number, count: number, radius: number, speed: number, lift = 1.6, shape?: number) {
    const isDark = element === 4;
    const isVolt = element === 3;
    const isWater = element === 0;
    const isFire = element === 2;
    const isWind = element === 1;
    const isPhys = element === 5;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const elev = (Math.random() - 0.18) * 1.1;
      const sp = speed * (0.45 + Math.random() * 0.85) * (isVolt ? 1.55 : isPhys ? 0.95 : 1.0);
      const r0 = isDark ? (0.45 + Math.random() * Math.max(0.9, radius * 1.8)) : Math.random() * radius * 0.25;
      const vx = isDark ? (-Math.cos(a) * sp * 0.72 - Math.sin(a) * 1.8) : Math.cos(a) * Math.cos(elev) * sp;
      const vz = isDark ? (-Math.sin(a) * sp * 0.72 + Math.cos(a) * 1.8) : Math.sin(a) * Math.cos(elev) * sp;
      const vy = isWater ? (2.4 + Math.random() * 2.8)
        : isFire ? (1.4 + Math.random() * 2.6 + lift * 0.5)
        : isVolt ? ((Math.random() - 0.35) * sp * 0.6)
        : isPhys ? (2.2 + Math.random() * 3.2)
        : Math.sin(elev) * sp * 0.65 + lift * (0.4 + Math.random() * 0.7);
      this.emit({
        x: center[0] + Math.cos(a) * r0,
        y: center[1] + 0.18 + Math.random() * 0.34,
        z: center[2] + Math.sin(a) * r0,
        vx, vy, vz,
        life: isVolt ? (0.16 + Math.random() * 0.18) : (0.36 + Math.random() * 0.44),
        size: 0.055 + Math.random() * 0.11,
        element,
        shape: shape ?? this.defaultShape(element, i),
        drag: isVolt ? 6.8 : isWater || isPhys ? 1.1 : 2.8 + Math.random() * 1.4,
        ay: isFire ? 3.2 : isWind ? 1.1 : isWater ? -9.5 : isPhys ? -12.5 : isDark ? 0.4 : 0,
        swirl: isWind ? (Math.random() < 0.5 ? -6.5 : 6.5) : isDark ? 3.8 : 0,
        pull: isDark ? 3.2 : 0,
        ax: center[0],
        az: center[2],
        spin: isWind ? 14 : isPhys ? 9 : 0,
        intensity: isVolt ? 1.45 : 1.1 + Math.random() * 0.4,
      });
    }
  }

  private makeShaderDisc(radius: number, element: number, mode: 0 | 1) {
    const T = this.T;
    const pal = EL_PAL[element] ?? EL_PAL[0];
    const geo = new T.PlaneGeometry(radius * 2, radius * 2).rotateX(-Math.PI / 2);
    const mat = new T.ShaderMaterial({
      vertexShader: PLAIN_VERT,
      fragmentShader: WAVE_RING_FRAG,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      side: T.DoubleSide,
      uniforms: {
        uColor: {value: new T.Vector3(...pal[1])},
        uCore: {value: new T.Vector3(...pal[0])},
        uProgress: {value: 0},
        uTime: {value: 0},
        uMode: {value: mode},
        uElement: {value: element},
      },
    });
    return this.prepMesh(new T.Mesh(geo, mat), 23);
  }

  private makeDarkBackingDisc(radius: number, mode: 0 | 1, color: [number, number, number] = [0.03, 0.01, 0.08]) {
    const T = this.T;
    const geo = new T.PlaneGeometry(radius * 2, radius * 2).rotateX(-Math.PI / 2);
    const mat = new T.ShaderMaterial({
      vertexShader: PLAIN_VERT,
      fragmentShader: DARK_DISC_FRAG,
      transparent: true,
      depthWrite: false,
      blending: T.NormalBlending,
      side: T.DoubleSide,
      uniforms: {
        uColor: {value: new T.Vector3(...color)},
        uAlpha: {value: 1},
        uTime: {value: 0},
        uMode: {value: mode},
      },
    });
    return this.prepMesh(new T.Mesh(geo, mat), 22);
  }

  private makeFlowMaterial(element: number, style: number, alpha = 1.0) {
    const T = this.T;
    const pal = EL_PAL[element] ?? EL_PAL[0];
    return new T.ShaderMaterial({
      vertexShader: PLAIN_VERT,
      fragmentShader: FLOW_MESH_FRAG,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      side: T.DoubleSide,
      uniforms: {
        uColor: {value: new T.Vector3(...pal[1])},
        uCore: {value: new T.Vector3(...pal[0])},
        uEdge: {value: new T.Vector3(...pal[2])},
        uTime: {value: this.time},
        uAlpha: {value: alpha},
        uStyle: {value: style},
      },
    });
  }

  /** Build a 3D crossed-ribbon strip mesh along a polyline so lightning arcs have real glowing width in WebGL. */
  private makeBoltStripMesh(points: any[], width: number, element: number, order = 26) {
    const T = this.T;
    const segs = points.length - 1;
    const vertsPerStrip = points.length * 2;
    const pos = new Float32Array(vertsPerStrip * 2 * 3);
    const uv = new Float32Array(vertsPerStrip * 2 * 2);
    const idx: number[] = [];

    for (let strip = 0; strip < 2; strip++) {
      const vBase = strip * vertsPerStrip;
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const prev = points[Math.max(0, i - 1)];
        const next = points[Math.min(points.length - 1, i + 1)];
        const tx = next.x - prev.x, ty = next.y - prev.y, tz = next.z - prev.z;
        const tl = Math.hypot(tx, ty, tz) || 1;
        const dx = tx / tl, dy = ty / tl, dz = tz / tl;
        // Reference vector not parallel to tangent
        const rx = Math.abs(dy) < 0.9 ? 0 : 1;
        const ry = Math.abs(dy) < 0.9 ? 1 : 0;
        const rz = 0;
        // First perpendicular u1 = cross(d, ref)
        let u1x = dy * rz - dz * ry;
        let u1y = dz * rx - dx * rz;
        let u1z = dx * ry - dy * rx;
        const u1l = Math.hypot(u1x, u1y, u1z) || 1;
        u1x /= u1l; u1y /= u1l; u1z /= u1l;
        // Second perpendicular u2 = cross(d, u1)
        const u2x = dy * u1z - dz * u1y;
        const u2y = dz * u1x - dx * u1z;
        const u2z = dx * u1y - dy * u1x;

        const wx = (strip === 0 ? u1x : u2x) * width;
        const wy = (strip === 0 ? u1y : u2y) * width;
        const wz = (strip === 0 ? u1z : u2z) * width;

        const u = i / Math.max(1, segs);
        const o0 = (vBase + i * 2) * 3;
        pos[o0] = p.x - wx; pos[o0 + 1] = p.y - wy; pos[o0 + 2] = p.z - wz;
        pos[o0 + 3] = p.x + wx; pos[o0 + 4] = p.y + wy; pos[o0 + 5] = p.z + wz;

        const uv0 = (vBase + i * 2) * 2;
        uv[uv0] = u; uv[uv0 + 1] = 0;
        uv[uv0 + 2] = u; uv[uv0 + 3] = 1;
        if (i < segs) {
          const a = vBase + i * 2;
          idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const mat = this.makeFlowMaterial(element, 3, 1.0);
    return this.prepMesh(new T.Mesh(geo, mat), order);
  }

  /** Element-specific Home exploration right-click dash burst & wake. */
  spawnHomeDashFx(origin: Vec, dir: Vec, element: number) {
    const el = Math.min(5, Math.max(0, Math.floor(element)));
    const fl = Math.hypot(dir[0], dir[2]) || 1;
    const fx = dir[0] / fl, fz = dir[2] / fl;
    const rx = -fz, rz = fx;
    this.spawnShockRing(origin, 0.25, 1.45, el, el === 3 ? 0.22 : 0.34);

    if (el === 1) {
      // Wind: tilted Mach-cone air ring right behind the dash
      this.spawnMachRing([origin[0] + fx * 0.25, origin[1] + 0.42, origin[2] + fz * 0.25], [fx, 0, fz], 1.15, el, 0.28);
    } else if (el === 3) {
      // Volt: snapping horizontal lightning filament wake
      const back: Vec = [origin[0] - fx * 1.4, origin[1] + 0.38, origin[2] - fz * 1.4];
      const front: Vec = [origin[0] + fx * 0.4, origin[1] + 0.38, origin[2] + fz * 0.4];
      const strip = this.makeBoltStripMesh(this.buildJaggedPoints(back, front, 9, 0.28), 0.045, el, 26);
      this.root.add(strip);
      this.fxList.push({
        age: 0, life: 0.22,
        update: (t) => { strip.material.uniforms.uAlpha.value = (1 - t) * (Math.sin(t * 70) > -0.3 ? 1 : 0.25); },
        dispose: () => { strip.removeFromParent(); strip.geometry.dispose(); strip.material.dispose(); },
      });
    }

    for (let i = 0; i < 42; i++) {
      const side = (Math.random() - 0.5) * 0.65;
      const back = Math.random() * 0.50;
      const sp = (el === 3 ? 3.2 : 1.6) + Math.random() * 3.6;
      this.emit({
        x: origin[0] + rx * side - fx * back,
        y: origin[1] + 0.14 + Math.random() * 0.36,
        z: origin[2] + rz * side - fz * back,
        vx: -fx * sp + rx * (side * 2.2),
        vy: el === 0 || el === 5 ? (1.4 + Math.random() * 2.0) : el === 2 ? (1.2 + Math.random() * 1.8) : (0.3 + Math.random() * 1.2),
        vz: -fz * sp + rz * (side * 2.2),
        life: el === 3 ? (0.14 + Math.random() * 0.16) : (0.28 + Math.random() * 0.32),
        size: 0.048 + Math.random() * 0.088,
        element: el,
        shape: this.defaultShape(el, i),
        drag: el === 3 ? 6.2 : el === 0 || el === 5 ? 1.4 : 3.4,
        ay: el === 2 ? 2.8 : el === 1 ? 0.9 : el === 0 ? -7.5 : el === 5 ? -10.5 : 0.2,
        swirl: el === 1 ? 7.0 : el === 4 ? 3.5 : 0,
        pull: el === 4 ? 2.4 : 0,
        ax: origin[0],
        az: origin[2],
        spin: el === 1 ? 14 : el === 5 ? 9 : 0,
        intensity: 1.18,
      });
    }
  }

  /** Spawns the full 3D visual & gameplay hitbox behavior for any of the 18 ARPG skills. */
  triggerSkill(def: SkillDef, origin: Vec, forward: Vec, cb: SkillEffectCallbacks, aimPoint?: Vec, dashEnd?: Vec) {
    const fl = Math.hypot(forward[0], forward[2]) || 1;
    const fx = forward[0] / fl, fz = forward[2] / fl;
    const fwd: Vec = [fx, 0, fz];
    const h = this.host;
    /** The locked target when one was passed in, otherwise the ground point `dist` ahead. */
    const ahead = (dist: number): Vec => {
      if (aimPoint) return [...aimPoint];
      const x = origin[0] + fx * dist, z = origin[2] + fz * dist;
      return [x, cb.sampleTerrain(x, z) ?? origin[1], z];
    };

    switch (def.archetype) {
      case 'projectile':
      case 'wave': {
        if (cb.castWall) {
          const muzzle: Vec = [origin[0] + fx * .65, origin[1] + .52, origin[2] + fz * .65];
          const wall = cb.castWall([origin[0], origin[1] + .52, origin[2]], muzzle);
          if (wall) {
            this.emitRadialBurst(wall, def.element, 28, 0.4, 3.2);
            cb.onSpawnBurst(wall, def.element, 12, 1.8);
            return;
          }
        }
        this.spawnProjectile(def, origin, fwd, aimPoint);
        this.emitRadialBurst([origin[0] + fx * 0.55, origin[1] + 0.35, origin[2] + fz * 0.55], def.element, 24, 0.35, 3.0);
        cb.onSpawnBurst([origin[0] + fx * 0.6, origin[1] + 0.45, origin[2] + fz * 0.6], def.element, 10, 1.8);
        return;
      }
      case 'ring':
      case 'sweep':
        waterRing(h, origin, def, cb);
        return;
      case 'dome':
        waterDome(h, origin, def, cb);
        return;
      case 'dash': {
        const dist = def.dashDist ?? 4.0;
        const end: Vec = dashEnd ?? [origin[0] + fx * dist, origin[1], origin[2] + fz * dist];
        windDash(h, origin, end);
        cb.onSpawnBurst(origin, def.element, 14, 2.5);
        cb.onSpawnBurst(end, def.element, 18, 3.0);
        cb.onSkillHitArea([(origin[0] + end[0]) * 0.5, origin[1], (origin[2] + end[2]) * 0.5], def, false);
        cb.onSkillHitArea(end, def, false);
        return;
      }
      case 'vortex':
        windTornado(h, origin, def, cb);
        return;
      case 'boomerang':
        windBoomerang(h, origin, fwd, def, cb);
        return;
      case 'breath':
        fireBreath(h, origin, fwd, def, cb);
        return;
      case 'eruption':
        fireEruption(h, def.range > 0 ? ahead(def.range) : [...origin], def, cb);
        return;
      case 'bolt': {
        const aimPos = aimPoint ?? this.findAimPoint(origin, fwd, def.range * 0.65, cb);
        this.spawnLightningBolt(aimPos, 10.2, def.element);
        this.spawnShockRing(aimPos, 0.3, def.radius * 1.18, def.element, 0.36);
        this.emitRadialBurst(aimPos, def.element, 78, 0.5, 5.8, 1.4, 3);
        cb.onSpawnBurst(aimPos, def.element, 22, 3.4);
        cb.onSkillHitArea(aimPos, def, false);
        return;
      }
      case 'chain':
        this.spawnChainLightning(origin, fwd, def, cb, aimPoint);
        return;
      case 'storm':
        this.spawnThunderCage(ahead(def.range), def, cb);
        return;
      case 'creep': {
        let target = aimPoint ? [...aimPoint] as Vec : this.findAimPoint(origin, fwd, Math.min(def.range, 5.5), cb);
        const wall = cb.castWall?.([origin[0], origin[1] + .4, origin[2]], [target[0], target[1] + .4, target[2]]);
        if (wall) target = [wall[0] - fx * .3, cb.sampleTerrain(wall[0], wall[2]) ?? origin[1], wall[2] - fz * .3];
        darkCreep(h, origin, target, def, cb);
        return;
      }
      case 'field': {
        const center = ahead(def.range);
        this.spawnDarkField(center, def, cb);
        darkFieldRifts(h, center, def);
        return;
      }
      case 'rend':
      case 'meteor':
        darkRend(h, aimPoint ? [...aimPoint] : this.findAimPoint(origin, fwd, def.range, cb), def, cb);
        return;
      case 'fist':
      case 'slam':
        rockFist(h, ahead(def.range * 0.65), fwd, def, cb);
        return;
      case 'fissure':
        rockFissure(h, origin, fwd, def, cb);
        return;
      case 'leap_slam':
        rockMeteor(h, ahead(def.range * 0.65), def, cb);
        return;
    }
  }

  private findAimPoint(origin: Vec, forward: Vec, dist: number, cb: SkillEffectCallbacks): Vec {
    const targets = cb.getTargetPositions();
    let best: Vec | null = null;
    let bestScore = Infinity;
    for (const tp of targets) {
      const dx = tp[0] - origin[0], dz = tp[2] - origin[2];
      const d = Math.hypot(dx, dz);
      if (d > dist + 3.5 || d < 0.4 || cb.blocked?.(origin, tp)) continue;
      const dot = (dx * forward[0] + dz * forward[2]) / d;
      if (dot > 0.35 && d < bestScore) {
        bestScore = d;
        best = [...tp];
      }
    }
    if (best) return best;
    const x = origin[0] + forward[0] * dist;
    const z = origin[2] + forward[2] * dist;
    const y = cb.sampleTerrain(x, z) ?? origin[1];
    return [x, y, z];
  }

  /** Projectile bodies come from skill-forms: Water's caged bubble (default) and Fire's rolling blast. */
  private spawnProjectile(def: SkillDef, origin: Vec, forward: Vec, aimPoint?: Vec) {
    const body = def.element === 2 ? fireball(this.host) : waterOrb(this.host);
    const g = body.group;
    g.rotation.y = Math.atan2(forward[0], forward[2]);
    const start: Vec = [origin[0] + forward[0] * 0.62, origin[1] + 0.50, origin[2] + forward[2] * 0.62];
    g.position.set(start[0], start[1], start[2]);
    this.root.add(g);

    const speed = def.projectileSpeed ?? 14;
    const aimDist = aimPoint ? Math.hypot(aimPoint[0] - start[0], aimPoint[2] - start[2]) : 0;
    this.projectiles.push({
      def,
      pos: start,
      vel: [
        forward[0] * speed,
        aimPoint ? speed * (aimPoint[1] + .52 - start[1]) / Math.max(.4, aimDist) : 0,
        forward[2] * speed,
      ],
      age: 0,
      // A locked shot bursts where the target stood at cast time; a free shot flies its full range.
      maxAge: aimPoint ? Math.max(0.06, aimDist / speed) : Math.max(0.55, def.range / speed),
      mesh: g,
      aimed: !!aimPoint,
      trailAcc: 0,
      onStep: body.step,
    });
  }

  private spawnShockRing(center: Vec, _startR: number, endR: number, element: number, life = 0.45) {
    const disc = this.makeShaderDisc(endR, element, 0);
    disc.position.set(center[0], center[1] + 0.07, center[2]);
    this.root.add(disc);
    this.fxList.push({
      age: 0,
      life,
      update: (t) => {
        disc.material.uniforms.uProgress.value = t;
        disc.material.uniforms.uTime.value = this.time;
      },
      dispose: () => {
        disc.removeFromParent();
        disc.geometry.dispose();
        disc.material.dispose();
      },
    });
  }

  /** Tilted expanding air-pressure Mach ring perpendicular to a dash vector (Wind). */
  private spawnMachRing(pos: Vec, forward: Vec, maxScale: number, element: number, life = 0.32) {
    const T = this.T;
    const pal = EL_PAL[element] ?? EL_PAL[1];
    const geo = new T.PlaneGeometry(maxScale * 2, maxScale * 2);
    const mat = new T.ShaderMaterial({
      vertexShader: PLAIN_VERT,
      fragmentShader: WAVE_RING_FRAG,
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      uniforms: {
        uColor: {value: new T.Vector3(...pal[1])},
        uCore: {value: new T.Vector3(...pal[0])},
        uProgress: {value: 0},
        uTime: {value: this.time},
        uMode: {value: 0},
        uElement: {value: 1},
      },
    });
    const ring = this.prepMesh(new T.Mesh(geo, mat), 25);
    ring.position.set(pos[0], pos[1], pos[2]);
    ring.rotation.y = Math.atan2(forward[0], forward[2]);
    this.root.add(ring);
    this.fxList.push({
      age: 0, life,
      update: (t) => {
        mat.uniforms.uProgress.value = t;
        mat.uniforms.uTime.value = this.time;
      },
      dispose: () => { ring.removeFromParent(); geo.dispose(); mat.dispose(); },
    });
  }

  private buildJaggedPoints(a: Vec, b: Vec, steps: number, jitter: number) {
    const T = this.T;
    const pts: any[] = [];
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const env = Math.sin(f * Math.PI);
      const j = i === 0 || i === steps ? 0 : jitter * env;
      pts.push(new T.Vector3(
        a[0] + (b[0] - a[0]) * f + (Math.random() - 0.5) * j,
        a[1] + (b[1] - a[1]) * f + (Math.random() - 0.5) * j * 0.55,
        a[2] + (b[2] - a[2]) * f + (Math.random() - 0.5) * j,
      ));
    }
    return pts;
  }

  /** Volt E & Q strike: thick 3D crossed plasma ribbon main bolt + 2 offset arcs + 4 branching forks + sky flash! */
  private spawnLightningBolt(target: Vec, height: number, element: number) {
    const T = this.T;
    const g = new T.Group();
    const mats: any[] = [];

    const top: Vec = [target[0] + (Math.random() - 0.5) * 0.8, target[1] + height, target[2] + (Math.random() - 0.5) * 0.8];
    const mainPts = this.buildJaggedPoints(top, target, 18, 0.78);
    const mainBolt = this.makeBoltStripMesh(mainPts, 0.14, element, 27);
    const coronaBolt = this.makeBoltStripMesh(this.buildJaggedPoints(top, target, 14, 1.05), 0.08, element, 26);
    g.add(mainBolt, coronaBolt);
    mats.push(mainBolt.material, coronaBolt.material);

    // 4 jagged branching sub-forks shooting off the main column
    for (let f = 0; f < 4; f++) {
      const idx = 3 + f * 3;
      const p = mainPts[Math.min(mainPts.length - 2, idx)];
      const ang = Math.random() * Math.PI * 2;
      const reach = 0.9 + Math.random() * 1.4;
      const forkEnd: Vec = [p.x + Math.cos(ang) * reach, Math.max(target[1] + 0.15, p.y - 1.6 - Math.random() * 1.9), p.z + Math.sin(ang) * reach];
      const fork = this.makeBoltStripMesh(this.buildJaggedPoints([p.x, p.y, p.z], forkEnd, 7, 0.42), 0.055, element, 26);
      g.add(fork);
      mats.push(fork.material);
    }

    // Impact tight pinpoint core flash (not a bulky translucent ball!)
    const flashMat = new T.MeshBasicMaterial({color: EL_CORE[element], transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false});
    const flash = this.prepMesh(new T.Mesh(new T.OctahedronGeometry(0.18, 0), flashMat), 27);
    flash.position.set(target[0], target[1] + 0.25, target[2]);
    g.add(flash);

    // Crisp electric diamond sparks along the entire bolt column
    for (let i = 0; i < 42; i++) {
      const p = mainPts[Math.floor(Math.random() * mainPts.length)];
      this.emit({
        x: p.x, y: p.y, z: p.z,
        vx: (Math.random() - 0.5) * 5.2,
        vy: (Math.random() - 0.4) * 3.0,
        vz: (Math.random() - 0.5) * 5.2,
        life: 0.16 + Math.random() * 0.20,
        size: 0.045 + Math.random() * 0.085,
        element,
        shape: 3,
        drag: 6.2,
        intensity: 1.5,
      });
    }

    this.root.add(g);
    this.fxList.push({
      age: 0,
      life: 0.34,
      update: (t) => {
        const flicker = Math.sin(t * 78) > -0.35 ? 1 : 0.24;
        const fade = (1 - t) * flicker;
        for (const m of mats) m.uniforms.uAlpha.value = fade;
        flashMat.opacity = Math.max(0, (1 - t * 2.5) * 0.95);
        flash.scale.setScalar(1 + t * 1.4);
      },
      dispose: () => this.disposeGroup(g),
    });
  }

  /** Volt R (`连锁闪电`): thick 3D jagged plasma strips chaining across targets + electric flash orbs at every node! */
  private spawnChainLightning(origin: Vec, forward: Vec, def: SkillDef, cb: SkillEffectCallbacks, aimPoint?: Vec) {
    const T = this.T;
    const targets = cb.getTargetPositions();
    const chainPts: Vec[] = [[origin[0], origin[1] + 0.42, origin[2]]];
    const used = new Set<number>();
    let cur = origin;
    const maxLinks = def.chainCount ?? 4;

    for (let k = 0; k < maxLinks; k++) {
      let bestIdx = -1;
      let bestDist = k === 0 ? def.range : def.radius;
      for (let i = 0; i < targets.length; i++) {
        if (used.has(i) || cb.blocked?.(cur, targets[i])) continue;
        const d = Math.hypot(targets[i][0] - cur[0], targets[i][2] - cur[2]);
        if (k === 0 && aimPoint && targets[i].every((v, j) => v === aimPoint[j]) && d <= def.range) { bestIdx = i; break; }
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      if (bestIdx < 0) break;
      used.add(bestIdx);
      const hitPos = targets[bestIdx];
      chainPts.push([hitPos[0], hitPos[1] + 0.55, hitPos[2]]);
      this.emitRadialBurst(hitPos, def.element, 42, 0.4, 4.8, 1.2, 3);
      cb.onSpawnBurst(hitPos, def.element, 12, 2.2);
      cb.onSkillHitArea(hitPos, {...def, radius: 1.6}, false);
      cur = hitPos;
    }

    if (chainPts.length === 1) {
      const end: Vec = [origin[0] + forward[0] * 5.2, origin[1] + 0.45, origin[2] + forward[2] * 5.2];
      chainPts.push(end);
      this.emitRadialBurst(end, def.element, 55, 0.45, 5.2, 1.2, 3);
      cb.onSpawnBurst(end, def.element, 16, 2.6);
      if (!cb.blocked?.(origin, end)) cb.onSkillHitArea(end, {...def, radius: 2.2}, false);
    }

    const g = new T.Group();
    const mats: any[] = [];
    const nodeMats: any[] = [];
    for (let i = 0; i < chainPts.length - 1; i++) {
      const a = chainPts[i], b = chainPts[i + 1];
      const p1 = this.buildJaggedPoints(a, b, 11, 0.36);
      const p2 = this.buildJaggedPoints(a, b, 10, 0.56);
      const s1 = this.makeBoltStripMesh(p1, 0.085, def.element, 27);
      const s2 = this.makeBoltStripMesh(p2, 0.048, def.element, 26);
      g.add(s1, s2);
      mats.push(s1.material, s2.material);

      const nMat = new T.MeshBasicMaterial({color: EL_CORE[3], transparent: true, opacity: 0.92, blending: T.AdditiveBlending, depthWrite: false});
      const node = this.prepMesh(new T.Mesh(new T.SphereGeometry(0.24, 12, 10), nMat), 27);
      node.position.set(b[0], b[1], b[2]);
      g.add(node);
      nodeMats.push(nMat);

      for (let s = 0; s < 16; s++) {
        const p = p1[Math.floor(Math.random() * p1.length)];
        this.emit({
          x: p.x, y: p.y, z: p.z,
          vx: (Math.random() - 0.5) * 4.2,
          vy: 0.4 + Math.random() * 2.0,
          vz: (Math.random() - 0.5) * 4.2,
          life: 0.16 + Math.random() * 0.18,
          size: 0.045 + Math.random() * 0.075,
          element: def.element,
          shape: 3,
          drag: 5.8,
          intensity: 1.45,
        });
      }
    }
    this.root.add(g);
    this.spawnShockRing(chainPts[chainPts.length - 1], 0.25, 2.0, def.element, 0.32);

    this.fxList.push({
      age: 0,
      life: 0.38,
      update: (t) => {
        const op = (1 - t) * (Math.sin(t * 72) > -0.35 ? 1 : 0.28);
        for (const m of mats) m.uniforms.uAlpha.value = op;
        for (const nm of nodeMats) nm.opacity = op * 0.9;
      },
      dispose: () => this.disposeGroup(g),
    });
  }

  /** Volt Q (`万钧雷狱`): a thundercloud closes overhead, a cage of standing bolts rings the area, then the strikes fall inside it. */
  private spawnThunderCage(center: Vec, def: SkillDef, cb: SkillEffectCallbacks) {
    const T = this.T;
    const R = def.radius;
    const cloudY = 5.4;
    const rune = this.makeShaderDisc(R * 1.06, def.element, 1);
    rune.position.set(center[0], center[1] + 0.08, center[2]);
    this.root.add(rune);
    const cloud = this.makeDarkBackingDisc(R * 1.18, 0, [0.07, 0.055, 0.15]);
    cloud.position.set(center[0], center[1] + cloudY, center[2]);
    cloud.renderOrder = 23;
    this.root.add(cloud);

    // Cage bars: two pre-rolled jagged strips each, swapped at ~20 Hz so they crackle without rebuilding geometry.
    const cage = new T.Group();
    const bars: any[][] = [];
    const barCount = 8;
    for (let k = 0; k < barCount; k++) {
      const a = (k / barCount) * Math.PI * 2 + 0.2;
      const bx = center[0] + Math.cos(a) * R * 0.94, bz = center[2] + Math.sin(a) * R * 0.94;
      const by = cb.sampleTerrain(bx, bz) ?? center[1];
      const pair = [0, 1].map(() => this.makeBoltStripMesh(this.buildJaggedPoints([bx, center[1] + cloudY, bz], [bx, by, bz], 12, 0.5), 0.075, def.element, 26));
      cage.add(pair[0], pair[1]);
      bars.push(pair);
    }
    this.root.add(cage);

    const totalStrikes = def.multiHits ?? 4;
    let struck = 0;
    let ambientAcc = 0;
    let lastSpot: Vec | null = null;

    this.fxList.push({
      age: 0,
      life: def.duration ?? 1.55,
      update: (t, dt) => {
        const fade = t > 0.78 ? (1 - t) / 0.22 : Math.min(1, t / 0.10);
        rune.material.uniforms.uProgress.value = fade * 0.94;
        rune.material.uniforms.uTime.value = this.time * 2.0;
        cloud.material.uniforms.uAlpha.value = fade * 1.1;
        cloud.material.uniforms.uTime.value = this.time * 2.5;
        const frame = Math.floor(this.time * 20);
        for (let k = 0; k < bars.length; k++) {
          const on = (frame + k) % 2;
          const dim = (frame * 7 + k * 3) % 5 === 0 ? 0.25 : 0.85;
          bars[k][0].visible = on === 0;
          bars[k][1].visible = on === 1;
          for (const bar of bars[k]) bar.material.uniforms.uAlpha.value = fade * dim;
        }

        ambientAcc += dt * 105;
        while (ambientAcc >= 1 && t < 0.88) {
          ambientAcc -= 1;
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * R * 0.95;
          this.emit({
            x: center[0] + Math.cos(a) * r,
            y: center[1] + 0.08,
            z: center[2] + Math.sin(a) * r,
            vx: -Math.sin(a) * 2.6,
            vy: 0.8 + Math.random() * 2.2,
            vz: Math.cos(a) * 2.6,
            life: 0.18 + Math.random() * 0.22,
            size: 0.05 + Math.random() * 0.09,
            element: def.element,
            shape: 3,
            drag: 4.8,
            ay: 0.4,
            ax: center[0],
            az: center[2],
            intensity: 1.3,
          });
        }

        const want = Math.floor(t * totalStrikes) + 1;
        if (struck < Math.min(totalStrikes, want)) {
          const idx = struck++;
          const ang = (idx / totalStrikes) * Math.PI * 2 + 0.4;
          const dist = idx === 0 ? 0 : R * 0.54;
          const sx = center[0] + Math.cos(ang) * dist;
          const sz = center[2] + Math.sin(ang) * dist;
          const sy = cb.sampleTerrain(sx, sz) ?? center[1];
          const spot: Vec = [sx, sy, sz];
          this.spawnLightningBolt(spot, cloudY + center[1] - sy, def.element);
          if (lastSpot) {
            // Arc-bridge leaping across the cage between consecutive strikes.
            const bridge = this.makeBoltStripMesh(
              this.buildJaggedPoints([lastSpot[0], lastSpot[1] + 0.65, lastSpot[2]], [spot[0], spot[1] + 0.65, spot[2]], 10, 0.45),
              0.065, def.element, 26,
            );
            this.root.add(bridge);
            this.fxList.push({
              age: 0, life: 0.28,
              update: (bt) => { bridge.material.uniforms.uAlpha.value = (1 - bt) * (Math.sin(bt * 70) > -0.3 ? 1 : 0.2); },
              dispose: () => { bridge.removeFromParent(); bridge.geometry.dispose(); bridge.material.dispose(); },
            });
          }
          lastSpot = spot;
          this.spawnShockRing(spot, 0.35, 2.6, def.element, 0.32);
          this.emitRadialBurst(spot, def.element, 58, 0.45, 5.0, 2.6);
          cb.onSpawnBurst(spot, def.element, 18, 3.6);
          cb.onSkillHitArea(spot, {...def, radius: R * 0.62, damage: Math.round(def.damage / totalStrikes * 1.4)}, idx === 0);
        }
      },
      dispose: () => {
        for (const disc of [rune, cloud]) {
          disc.removeFromParent();
          disc.geometry.dispose();
          disc.material.dispose();
        }
        this.disposeGroup(cage);
      },
    });
  }

  /** Dark R (`蚀渊`): normal-blended obsidian pool + eclipse sigil + hovering black hole & tilted accretion disc! */
  private spawnDarkField(center: Vec, def: SkillDef, cb: SkillEffectCallbacks) {
    const T = this.T;
    const g = new T.Group();
    g.position.set(center[0], center[1] + 0.06, center[2]);

    const shadowPool = this.makeDarkBackingDisc(def.radius * 1.04, 0, [0.025, 0.008, 0.06]);
    const rune = this.makeShaderDisc(def.radius * 1.06, 4, 1);
    rune.position.y = 0.03;

    // Hovering obsidian event-horizon black hole + glowing accretion ring
    const bhGroup = new T.Group();
    bhGroup.position.y = 0.78;
    const bhMat = new T.MeshBasicMaterial({color: 0x04010a, transparent: true, opacity: 0.96});
    const bhCore = this.prepMesh(new T.Mesh(new T.SphereGeometry(0.32, 20, 16), bhMat), 25);
    const accMat = this.makeFlowMaterial(4, 4, 1.0);
    const accRing = this.prepMesh(new T.Mesh(new T.RingGeometry(0.34, 0.88, 36), accMat), 26);
    accRing.rotation.x = Math.PI * 0.38;
    const accRing2 = this.prepMesh(new T.Mesh(new T.RingGeometry(0.38, 0.72, 32), accMat), 26);
    accRing2.rotation.x = -Math.PI * 0.32;
    accRing2.rotation.y = 1.1;
    bhGroup.add(bhCore, accRing, accRing2);

    g.add(shadowPool, rune, bhGroup);
    this.root.add(g);

    let ticks = 0;
    let wispAcc = 0;
    const totalTicks = def.multiHits ?? 5;
    this.fxList.push({
      age: 0,
      life: def.duration ?? 4.0,
      update: (t, dt) => {
        const fade = t > 0.82 ? (1 - t) / 0.18 : Math.min(1, t / 0.08);
        shadowPool.material.uniforms.uAlpha.value = fade;
        shadowPool.material.uniforms.uTime.value = this.time;
        rune.material.uniforms.uProgress.value = fade * 0.95;
        rune.material.uniforms.uTime.value = this.time * 1.3;
        accMat.uniforms.uTime.value = this.time * 1.6;
        accMat.uniforms.uAlpha.value = fade;
        bhMat.opacity = 0.96 * fade;
        accRing.rotation.z += dt * 4.8;
        accRing2.rotation.z -= dt * 3.6;
        bhGroup.position.y = 0.76 + Math.sin(t * 14) * 0.10;
        bhGroup.scale.setScalar(0.85 + 0.18 * Math.sin(t * 22));

        wispAcc += dt * 125;
        while (wispAcc >= 1 && t < 0.92) {
          wispAcc -= 1;
          const a = Math.random() * Math.PI * 2;
          const r = 0.55 + Math.random() * (def.radius * 0.95);
          this.emit({
            x: center[0] + Math.cos(a) * r,
            y: center[1] + 0.10 + Math.random() * 0.38,
            z: center[2] + Math.sin(a) * r,
            vx: -Math.cos(a) * 1.8 - Math.sin(a) * 2.4,
            vy: 0.75 + Math.random() * 1.4,
            vz: -Math.sin(a) * 1.8 + Math.cos(a) * 2.4,
            life: 0.55 + Math.random() * 0.50,
            size: 0.055 + Math.random() * 0.10,
            element: 4,
            shape: Math.random() < 0.60 ? 4 : 1,
            drag: 1.4,
            ay: 0.4,
            swirl: 5.0,
            pull: 3.4,
            ax: center[0],
            az: center[2],
            intensity: 1.25,
          });
        }

        const want = Math.floor(t * totalTicks) + 1;
        if (ticks < Math.min(totalTicks, want)) {
          ticks++;
          this.spawnShockRing(center, 0.25, def.radius * 0.98, 4, 0.42);
          cb.onSpawnBurst(center, def.element, 10, 2.5);
          cb.onSkillHitArea(center, def, false);
        }
      },
      dispose: () => this.disposeGroup(g),
    });
  }

  private stepParticles(dt: number) {
    let alive = 0;
    for (let i = 0; i < NIAGARA_MAX; i++) {
      const life = this.pLife[i];
      if (life <= 0) continue;
      const age = this.pAge[i] + dt;
      if (age >= life) {
        this.pLife[i] = 0;
        this.pAlpha[i] = 0;
        continue;
      }
      this.pAge[i] = age;
      alive++;
      const t = age / life;
      const drag = Math.exp(-this.pDrag[i] * dt);
      let vx = this.pVelX[i] * drag;
      let vy = (this.pVelY[i] + this.pAy[i] * dt) * Math.exp(-this.pDrag[i] * 0.35 * dt);
      let vz = this.pVelZ[i] * drag;

      let x = this.pPos[i * 3];
      let y = this.pPos[i * 3 + 1];
      let z = this.pPos[i * 3 + 2];

      const swirl = this.pSwirl[i];
      const pull = this.pPull[i];
      if (swirl !== 0 || pull !== 0) {
        const dx = x - this.pAx[i];
        const dz = z - this.pAz[i];
        const d = Math.hypot(dx, dz) + 0.05;
        const nx = dx / d, nz = dz / d;
        vx += (-nz * swirl - nx * pull) * dt;
        vz += (nx * swirl - nz * pull) * dt;
      }

      x += vx * dt;
      y += vy * dt;
      z += vz * dt;
      this.pVelX[i] = vx; this.pVelY[i] = vy; this.pVelZ[i] = vz;
      this.pPos[i * 3] = x; this.pPos[i * 3 + 1] = y; this.pPos[i * 3 + 2] = z;
      if (this.pSpin[i] !== 0) this.pRot[i] += this.pSpin[i] * dt;

      const pal = EL_PAL[this.pEl[i]] ?? EL_PAL[0];
      const c0 = t < 0.35 ? pal[0] : pal[1];
      const c1 = t < 0.35 ? pal[1] : pal[2];
      const f = t < 0.35 ? t / 0.35 : (t - 0.35) / 0.65;
      const inten = this.pIntensity[i];
      this.pCol[i * 3] = (c0[0] + (c1[0] - c0[0]) * f) * inten;
      this.pCol[i * 3 + 1] = (c0[1] + (c1[1] - c0[1]) * f) * inten;
      this.pCol[i * 3 + 2] = (c0[2] + (c1[2] - c0[2]) * f) * inten;

      const fadeIn = Math.min(1, t / 0.10);
      const fadeOut = (1 - t) * (1 - t);
      this.pAlpha[i] = fadeIn * fadeOut;
      const shape = this.pShape[i];
      const scaleCurve = shape > 3.5 && shape < 4.5 ? (1 + 0.45 * t) : (1 - 0.52 * t);
      this.pSize[i] = this.pBaseSize[i] * (0.48 + 0.72 * fadeIn) * scaleCurve;
    }

    this.pAliveCount = alive;
    this.pPoints.visible = alive > 0;
    if (alive > 0) {
      this.pGeo.setDrawRange(0, NIAGARA_MAX);
      this.pGeo.attributes.position.needsUpdate = true;
      this.pGeo.attributes.aColor.needsUpdate = true;
      this.pGeo.attributes.aSize.needsUpdate = true;
      this.pGeo.attributes.aAlpha.needsUpdate = true;
      this.pGeo.attributes.aShape.needsUpdate = true;
      this.pGeo.attributes.aRot.needsUpdate = true;
    }
  }

  update(dt: number, cb: SkillEffectCallbacks) {
    this.time += dt;
    const targets = cb.getTargetPositions();
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const from: Vec = [...p.pos];
      p.age += dt;
      p.pos[0] += p.vel[0] * dt;
      p.pos[2] += p.vel[2] * dt;
      p.pos[1] += p.vel[1] * dt;
      const ty = cb.sampleTerrain(p.pos[0], p.pos[2]);
      if (!p.aimed && ty !== null) p.pos[1] = Math.max(ty + 0.42, p.pos[1] + (ty + 0.48 - p.pos[1]) * Math.min(1, dt * 8));
      const wall = cb.castWall?.(from, p.pos);
      if (wall) p.pos = wall;
      p.mesh.position.set(p.pos[0], p.pos[1], p.pos[2]);
      p.onStep?.(dt, p.age);

      // Element-distinct projectile trail wake
      const el = p.def.element;
      p.trailAcc += dt * 140;
      while (p.trailAcc >= 1) {
        p.trailAcc -= 1;
        const a = this.time * 18 + Math.random() * Math.PI * 2;
        const rad = el === 4 ? (0.36 + Math.random() * 0.24) : 0.18;
        this.emit({
          x: p.pos[0] + Math.cos(a) * rad,
          y: p.pos[1] + Math.sin(a) * rad,
          z: p.pos[2] + (Math.random() - 0.5) * 0.18,
          vx: el === 4 ? (-Math.cos(a) * 1.4) : (-p.vel[0] * 0.12 + (Math.random() - 0.5) * 1.2),
          vy: el === 2 ? (1.4 + Math.random() * 1.2) : el === 5 ? (1.2 + Math.random() * 1.6) : (0.25 + (Math.random() - 0.5) * 0.8),
          vz: el === 4 ? (-Math.sin(a) * 1.4) : (-p.vel[2] * 0.12 + (Math.random() - 0.5) * 1.2),
          life: 0.28 + Math.random() * 0.30,
          size: 0.045 + Math.random() * 0.08,
          element: el,
          shape: this.defaultShape(el, Math.floor(Math.random() * 6)),
          drag: el === 0 || el === 5 ? 1.4 : 3.2,
          ay: el === 2 ? 2.6 : el === 0 ? -5.5 : el === 5 ? -9.5 : 0.2,
          pull: el === 4 ? 2.6 : 0,
          swirl: el === 4 ? 3.5 : 0,
          ax: p.pos[0],
          az: p.pos[2],
          spin: el === 5 ? 9 : 0,
          intensity: 1.22,
        });
      }

      let hitTarget = false;
      for (const tp of targets) {
        const heightGap = cb.castWall ? tp[1] + .52 - p.pos[1] : 0;
        if (Math.hypot(tp[0] - p.pos[0], heightGap, tp[2] - p.pos[2]) < 1.05) {
          hitTarget = true;
          break;
        }
      }
      if (wall || hitTarget || p.age >= p.maxAge) {
        const floor = cb.sampleTerrain(p.pos[0], p.pos[2]) ?? p.pos[1] - 0.5;
        if (p.def.element === 2) fireExplosion(this.host, [...p.pos], floor, p.def);
        else if (p.def.element === 0) {
          waterPrison(this.host, [...p.pos], floor, p.def);
          this.emitRadialBurst(p.pos, 0, 30, 0.4, 3.6, 1.6);
        } else {
          this.spawnShockRing(p.pos, 0.25, p.def.radius, p.def.element, 0.42);
          this.emitRadialBurst(p.pos, p.def.element, 64, 0.48, 4.6, 1.8);
        }
        cb.onSpawnBurst(p.pos, p.def.element, 20, 3.2);
        if (!wall) cb.onSkillHitArea(p.pos, p.def, false);
        this.disposeGroup(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    for (let i = this.fxList.length - 1; i >= 0; i--) {
      const fx = this.fxList[i];
      fx.age += dt;
      if (fx.age < 0) continue;
      const t = Math.min(1, fx.age / fx.life);
      fx.update(t, dt, fx.age);
      if (fx.age >= fx.life) {
        fx.dispose();
        this.fxList.splice(i, 1);
      }
    }

    this.stepParticles(dt);
  }

  reset() {
    for (const p of this.projectiles) this.disposeGroup(p.mesh);
    this.projectiles.length = 0;
    for (const fx of this.fxList) fx.dispose();
    this.fxList.length = 0;
    this.pLife.fill(0);
    this.pAlpha.fill(0);
    this.pAliveCount = 0;
    this.pPoints.visible = false;
  }

  dispose() {
    this.reset();
    this.kit.dispose();
    this.pGeo.dispose();
    this.pMat.dispose();
    this.root.removeFromParent();
  }
}
