/**
 * Shared geometry + shader kit for the six-element combat VFX.
 *
 * Each element owns one physical "form language" that both its normal attacks (attack-forms.ts)
 * and its skills (skill-vfx.ts) are built from, so no two elements share a silhouette:
 * - Water    : volumetric liquid tubes and sheets (StreamTube + water shader)
 * - Wind     : near-invisible hairline crescents and helical tapes (wind shader)
 * - Fire     : noise-displaced, eroding explosion blobs and flame cones (fire shader)
 * - Volt     : jagged plasma strips (owned by slash-vfx / skill-vfx, untouched here)
 * - Dark     : dimensional rift slits and void shells (rift + void shaders)
 * - Physical : solid, self-lit faceted stone (rock shader, opaque, depth-writing)
 *
 * Materials are pooled instead of disposed, so shader programs stay compiled between attacks.
 */

export type Rgb = readonly [number, number, number];

export const KIT_NOISE = /* glsl */ `
float kHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float kNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(kHash(i), kHash(i + vec2(1.0, 0.0)), f.x), mix(kHash(i + vec2(0.0, 1.0)), kHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float kHash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123); }
float kNoise3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(kHash3(i), kHash3(i + vec3(1.0, 0.0, 0.0)), f.x);
  float b = mix(kHash3(i + vec3(0.0, 1.0, 0.0)), kHash3(i + vec3(1.0, 1.0, 0.0)), f.x);
  float c = mix(kHash3(i + vec3(0.0, 0.0, 1.0)), kHash3(i + vec3(1.0, 0.0, 1.0)), f.x);
  float d = mix(kHash3(i + vec3(0.0, 1.0, 1.0)), kHash3(i + vec3(1.0, 1.0, 1.0)), f.x);
  return mix(mix(a, b, f.y), mix(c, d, f.y), f.z);
}
float kFbm3(vec3 p) {
  return kNoise3(p) * 0.58 + kNoise3(p * 2.07 + vec3(5.2, 1.3, 8.1)) * 0.29 + kNoise3(p * 4.21 + vec3(2.7, 9.4, 3.3)) * 0.13;
}
`;

const KIT_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vObj;
varying vec3 vWorld;
varying vec3 vNormalV;
varying vec3 vViewPos;
uniform float uTime;
uniform float uSeed;
#ifdef KIT_DISPLACE
uniform float uDisp;
uniform float uFreq;
uniform float uRise;
uniform vec3 uFlowDir;
#endif
${KIT_NOISE}
void main() {
  vUv = uv;
  vec3 p = position;
#ifdef KIT_DISPLACE
  float n = kFbm3(position * uFreq - uFlowDir * (uTime * uRise) + vec3(uSeed, uSeed * 0.37, uSeed * 1.7));
  p += normal * (n - 0.40) * uDisp;
#endif
  vObj = p;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  vec4 mv = viewMatrix * w;
  vViewPos = -mv.xyz;
  vNormalV = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG_HEAD = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec3 vObj;
varying vec3 vWorld;
varying vec3 vNormalV;
varying vec3 vViewPos;
uniform float uTime;
uniform float uSeed;
${KIT_NOISE}
`;

/** Liquid body: cel-banded deep core, bright refracting rim, drifting caustic streaks and a foaming head/crest. */
const WATER_FRAG = /* glsl */ `${FRAG_HEAD}
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uFoam;
uniform float uAlpha;
uniform float uFlow;
uniform float uRep;
uniform float uMode; // 0 tube (flows along u, foams at the head), 1 sheet (flows up v, foams at the crest)
uniform float uCrest;
void main() {
  vec3 N = normalize(vNormalV);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vViewPos);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float along = uMode < 0.5 ? vUv.x : vUv.y;
  vec2 fuv = uMode < 0.5 ? vec2(vUv.x * uRep - uTime * uFlow, vUv.y * 5.0) : vec2(vUv.x * uRep, vUv.y * 3.0 - uTime * uFlow);
  float n = kNoise(fuv + uSeed);
  float n2 = kNoise(fuv * 2.3 + 7.0 + uSeed);
  float body = (1.0 - ndv) + (n - 0.5) * 0.30;
  vec3 col = mix(uDeep, uMid, smoothstep(0.20, 0.26, body));
  col = mix(col, uFoam, smoothstep(0.60, 0.66, body));
  float streak = smoothstep(0.70, 0.76, n2) * smoothstep(0.25, 0.65, ndv);
  col = mix(col, uFoam, streak * 0.55);
  vec3 H = normalize(normalize(vec3(0.3, 0.9, 0.4)) + V);
  col += uFoam * smoothstep(0.90, 0.94, dot(N, H)) * 0.8;
  float crest = smoothstep(uCrest, uCrest + 0.10, along + (n - 0.5) * 0.18);
  col = mix(col, uFoam * 1.12, crest);
  float a = uAlpha * mix(0.74, 1.0, max(smoothstep(0.5, 0.7, body), crest));
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a);
}
`;

/**
 * Explosion / flame body. Heat drives a hard 5-step cel ramp and the same field erodes the mesh:
 * uProgress 0 -> 1 burns the shape from a white-hot ball down to ragged crimson shreds and smoke.
 */
const FIRE_FRAG = /* glsl */ `${FRAG_HEAD}
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform vec3 uC4;
uniform float uProgress;
uniform float uAlpha;
uniform float uTaper; // >0 cools toward uv.y = 1, <0 cools toward uv.y = 0
uniform float uHot;
uniform float uFreq;
uniform float uRise;
uniform vec3 uFlowDir;
void main() {
  vec3 N = normalize(vNormalV);
  vec3 V = normalize(vViewPos);
  float ndv = abs(dot(N, V));
  float n = kFbm3(vObj * uFreq * 1.6 - uFlowDir * (uTime * uRise * 1.5) + vec3(uSeed * 2.3, uSeed, uSeed * 0.61));
  float axial = uTaper >= 0.0 ? vUv.y : 1.0 - vUv.y;
  float heat = uHot + ndv * 0.55 + n * 0.75 - 0.55 - uProgress * 1.05 - axial * abs(uTaper);
  if (heat < 0.0) discard;
  vec3 col = uC4;
  col = mix(col, uC3, smoothstep(0.10, 0.125, heat));
  col = mix(col, uC2, smoothstep(0.27, 0.295, heat));
  col = mix(col, uC1, smoothstep(0.46, 0.485, heat));
  col = mix(col, uC0, smoothstep(0.68, 0.705, heat));
  float a = smoothstep(0.0, 0.045, heat) * uAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a);
}
`;

/**
 * Dimensional rift on a quad: a jagged hairline is drawn tip to tip (uDraw), then tears open (uOpen) into an
 * almond-shaped starfield void with a razor HDR rim. x runs along the slit, y across it.
 */
const RIFT_FRAG = /* glsl */ `${FRAG_HEAD}
uniform vec3 uColor;
uniform vec3 uCore;
uniform float uDraw;
uniform float uOpen;
uniform float uFade;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float xr = vUv.x;
  float drawn = 1.0 - smoothstep(uDraw - 0.03, uDraw + 0.005, xr);
  if (drawn < 0.01) discard;
  float cy = (kNoise(vec2(p.x * 4.0 + uSeed, uSeed)) - 0.5) * 0.16 + (kNoise(vec2(p.x * 15.0 + uSeed, 3.0)) - 0.5) * 0.06;
  float prof = pow(max(0.0, 1.0 - p.x * p.x), 0.75);
  float jag = 0.75 + 0.5 * kNoise(vec2(p.x * 9.0 + uSeed * 3.0, uTime * 2.5));
  float halfW = prof * (0.014 + uOpen * 0.42 * jag);
  float d = abs(p.y - cy) - halfW;
  float aa = max(fwidth(d), 0.004);
  float inside = 1.0 - smoothstep(-aa, aa, d);
  float rimW = 0.022 + 0.035 * uOpen;
  float rim = exp(-pow(d / rimW, 2.0)) * prof;
  float haze = exp(-max(d, 0.0) * 7.0) * 0.38 * prof * (0.4 + 0.6 * uOpen);
  vec2 sp = floor((p + cy) * vec2(22.0, 13.0) + uSeed);
  float sh = kHash(sp);
  float star = step(0.955, sh) * (0.45 + 0.55 * sin(uTime * 8.0 + sh * 60.0));
  float neb = kNoise(p * vec2(3.0, 5.0) + vec2(uTime * 0.35, uSeed));
  vec3 voidCol = vec3(0.012, 0.004, 0.032) + uColor * 0.20 * neb + vec3(1.5, 1.2, 2.0) * star;
  vec3 col = mix(uColor * 0.55, voidCol, inside);
  col = mix(col, uCore, clamp(rim, 0.0, 1.0));
  float a = max(inside * 0.97, max(rim, haze)) * drawn * uFade;
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a);
}
`;

/** Hollow void shell: near-transparent or pitch-black centre (uCenter), hard violet Fresnel rim, drifting stars. */
const VOID_FRAG = /* glsl */ `${FRAG_HEAD}
uniform vec3 uColor;
uniform vec3 uCore;
uniform float uAlpha;
uniform float uCenter;
uniform float uPow;
void main() {
  vec3 N = normalize(vNormalV);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vViewPos);
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), uPow);
  float n = kNoise3(vObj * 3.2 + vec3(uSeed, uTime * 0.6, 0.0));
  float f = fres + (n - 0.5) * 0.16;
  vec3 col = vec3(0.012, 0.004, 0.032);
  col = mix(col, uColor, smoothstep(0.46, 0.52, f));
  col = mix(col, uCore, smoothstep(0.80, 0.85, f));
  vec3 cell = floor(normalize(vObj) * 9.0 + uSeed);
  float sh = kHash3(cell);
  col += vec3(1.4, 1.1, 1.9) * step(0.94, sh) * (0.5 + 0.5 * sin(uTime * 7.0 + sh * 50.0)) * (1.0 - smoothstep(0.3, 0.6, f));
  float a = uAlpha * mix(uCenter, 1.0, smoothstep(0.22, 0.62, f));
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a);
}
`;

/** Wind: an almost invisible body carried by a razor leading edge and a few flowing vacuum hairlines. */
const WIND_FRAG = /* glsl */ `${FRAG_HEAD}
uniform vec3 uMain;
uniform vec3 uCore;
uniform float uAlpha;
uniform float uFlow;
uniform float uLines;
uniform float uBody;
void main() {
  float u = vUv.x, v = vUv.y;
  float tip = pow(max(0.0, sin(u * 3.14159265)), 0.55);
  float edge = smoothstep(0.84, 0.965, v);
  float warp = kNoise(vec2(u * 5.0 - uTime * uFlow, v * 3.0 + uSeed)) * 1.7;
  float hair = pow(max(0.0, sin(v * uLines * 3.14159265 + warp)), 16.0) * smoothstep(0.06, 0.40, v);
  float gust = smoothstep(0.55, 0.9, kNoise(vec2(u * 11.0 - uTime * uFlow * 2.2, v * 26.0 + uSeed)));
  // Premultiplied output: the hairlines add light, while the tinted body also covers what is behind it,
  // so the gust keeps its colour on sunlit ground instead of washing out to white.
  float line = (edge + hair * 0.62) * tip * uAlpha;
  float body = clamp(uBody * (0.5 + 2.6 * v * v) + gust * 0.16 * v + hair * 0.22, 0.0, 0.85) * tip * uAlpha;
  if (line + body < 0.01) discard;
  vec3 col = uMain * 0.6 * body + mix(uMain, uCore, 0.7) * line;
  gl_FragColor = vec4(col, clamp(body + line * 0.45, 0.0, 0.92));
}
`;

/**
 * Solid stone. Lit by a fixed key light from flat derivative normals so it reads the same in every scene,
 * with 3 hard tones, glowing mineral veins and a noise dissolve instead of alpha fading.
 */
const ROCK_FRAG = /* glsl */ `${FRAG_HEAD}
uniform vec3 uShade;
uniform vec3 uBase;
uniform vec3 uLight;
uniform vec3 uGlow;
uniform float uGlowAmt;
uniform float uDissolve;
uniform float uVein;
void main() {
  float grain = kFbm3(vObj * 5.5 + uSeed);
  if (grain < uDissolve) discard;
  vec3 N = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  float l = dot(N, normalize(vec3(0.42, 0.82, 0.38)));
  vec3 col = mix(uShade, uBase, smoothstep(-0.12, -0.08, l));
  col = mix(col, uLight, smoothstep(0.40, 0.44, l));
  col *= 0.90 + grain * 0.20;
  float vein = 1.0 - smoothstep(0.0, 0.045, abs(kFbm3(vObj * uVein + uSeed * 1.9) - 0.5));
  float burn = 1.0 - smoothstep(uDissolve, uDissolve + 0.07, grain);
  col = mix(col, uGlow, clamp(vein * uGlowAmt + burn * step(0.001, uDissolve), 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}
`;

/** Thin-film soap bubble: iridescent Fresnel rim, clear centre, one hard specular glint. */
const BUBBLE_FRAG = /* glsl */ `${FRAG_HEAD}
uniform vec3 uColor;
uniform vec3 uCore;
uniform float uAlpha;
void main() {
  vec3 N = normalize(vNormalV);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vViewPos);
  float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);
  float fresnel = pow(1.0 - ndv, 3.0);
  float film = sin(vObj.y * 12.0 + vObj.x * 7.0 - uTime * 4.2) * 0.5 + 0.5;
  vec3 irid = mix(uColor * 0.75, vec3(0.28, 0.96, 1.25), film * 0.55);
  irid = mix(irid, vec3(0.62, 0.52, 1.15), pow(film, 3.0) * 0.32);
  irid = mix(irid, uCore * 0.82, fresnel * 0.75);
  float spec = pow(max(0.0, dot(reflect(-normalize(vec3(0.4, 0.85, 0.35)), N), V)), 26.0) * 0.85;
  float alpha = (0.02 + fresnel * 0.60 + spec * 0.55) * uAlpha;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(irid * (0.65 + fresnel * 0.75) + uCore * spec * 0.75, clamp(alpha, 0.0, 0.8));
}
`;

/** Soft additive energy ball, brightest where the surface faces the camera. */
const FLASH_FRAG = /* glsl */ `${FRAG_HEAD}
uniform vec3 uColor;
uniform float uAlpha;
uniform float uPow;
void main() {
  float ndv = abs(dot(normalize(vNormalV), normalize(vViewPos)));
  float a = pow(ndv, uPow) * uAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor * a, a);
}
`;

/**
 * Ground decals on a unit disc.
 * 0 water ripples, 1 scorch + ember cracks, 2 void star-crack, 3 stone fracture, 4 dust pressure ring, 5 cast telegraph.
 */
const GROUND_FRAG = /* glsl */ `${FRAG_HEAD}
uniform vec3 uColor;
uniform vec3 uDark;
uniform float uProgress;
uniform float uFade;
uniform float uMode;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float ang = atan(p.y, p.x);
  vec3 col = uColor;
  float a = 0.0;
  if (uMode < 0.5) {
    float R = mix(0.15, 0.93, 1.0 - pow(1.0 - uProgress, 2.2));
    float m = 0.0;
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      float rr = R * (1.0 - fk * 0.27);
      float wob = sin(ang * (7.0 + fk * 3.0) + uSeed + uTime * 5.0) * 0.012;
      m += (1.0 - smoothstep(0.0, 0.032 - fk * 0.007, abs(r - rr - wob))) * (1.0 - fk * 0.3);
    }
    float film = (1.0 - smoothstep(R * 0.3, R, r)) * 0.20;
    col = mix(uDark, uColor, clamp(m, 0.0, 1.0));
    a = clamp(m + film, 0.0, 1.0) * (1.0 - uProgress);
  } else if (uMode < 1.5) {
    float n = kNoise(p * 5.0 + uSeed);
    float n2 = kNoise(p * 13.0 + uSeed * 2.0);
    float edge = 0.78 + (n - 0.5) * 0.34;
    float burnt = 1.0 - smoothstep(edge - 0.12, edge, r);
    float cracks = (1.0 - smoothstep(0.0, 0.07, abs(n2 - 0.5))) * burnt * (1.0 - smoothstep(0.15, 1.0, r * 0.6 + uProgress));
    float rim = exp(-pow((r - edge) * 13.0, 2.0)) * (1.0 - uProgress);
    col = mix(uDark, uColor, clamp(cracks * 1.3 + rim, 0.0, 1.0));
    a = clamp(burnt * 0.74 + rim, 0.0, 1.0);
  } else if (uMode < 3.5) {
    float sectors = uMode < 2.5 ? 9.0 : 11.0;
    float sa = (ang + 3.14159265) / 6.2831853 * sectors;
    float sid = floor(sa);
    float ca = (sid + 0.5 + (kHash(vec2(sid, uSeed)) - 0.5) * 0.6) / sectors * 6.2831853 - 3.14159265;
    float dist = abs((ang - ca) * r + (kNoise(vec2(r * 13.0, sid + uSeed)) - 0.5) * 0.05);
    float reach = clamp(uProgress * 3.2, 0.0, 1.0) * (0.55 + 0.42 * kHash(vec2(sid, 7.0 + uSeed)));
    float line = (1.0 - smoothstep(0.007, 0.026, dist)) * step(r, reach) * smoothstep(0.03, 0.10, r);
    if (uMode < 2.5) {
      float pool = (1.0 - smoothstep(0.10, 0.80, r)) * 0.62;
      col = mix(uDark, uColor, line);
      a = max(line, pool);
    } else {
      float ringCrack = (1.0 - smoothstep(0.006, 0.022, abs(r - 0.50 - (kNoise(vec2(ang * 5.0, uSeed)) - 0.5) * 0.10))) * step(0.5, reach + 0.2);
      float pit = (1.0 - smoothstep(0.0, 0.42, r)) * 0.55;
      float crack = max(line, ringCrack * 0.8);
      col = mix(uDark, uColor, crack * (1.0 - smoothstep(0.0, 0.6, uProgress)));
      a = clamp(crack * 0.92 + pit, 0.0, 0.94);
    }
  } else if (uMode < 4.5) {
    float R = mix(0.20, 0.95, 1.0 - pow(1.0 - uProgress, 2.6));
    float ring = exp(-pow((r - R) * (8.0 + uProgress * 5.0), 2.0));
    float n = kNoise(vec2(ang * 6.0 + uSeed, r * 5.0 - uTime));
    a = ring * (0.35 + 0.55 * n) * (1.0 - uProgress);
  } else {
    float ring = 1.0 - smoothstep(0.0, 0.022, abs(r - 0.94));
    float grow = uProgress * 0.94;
    float front = 1.0 - smoothstep(0.0, 0.03, abs(r - grow));
    float fill = (1.0 - smoothstep(grow - 0.02, grow, r)) * 0.20;
    float ticks = step(0.55, fract(ang * 12.0 / 6.2831853 + uTime * 0.6)) * (1.0 - smoothstep(0.0, 0.03, abs(r - 0.84)));
    col = mix(uDark, uColor, clamp(ring + front + ticks, 0.0, 1.0));
    a = clamp(ring + front * 0.8 + fill + ticks * 0.6, 0.0, 1.0);
  }
  a *= uFade;
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a);
}
`;

function hash3(x: number, y: number, z: number, seed: number) {
  const s = Math.sin(Math.round(x * 257) * 12.9898 + Math.round(y * 257) * 78.233 + Math.round(z * 257) * 37.719 + seed * 19.19) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Dynamic tube swept along a parametric path. `update` rebuilds the visible span [tail, head] every frame,
 * so a stream can shoot out, snake, and then drain away from its tail.
 */
export class StreamTube {
  readonly geo: any;
  private pos: Float32Array;
  private nor: Float32Array;
  private centers: Float32Array;
  private tmp = [0, 0, 0];

  constructor(T: any, readonly segs = 26, readonly sides = 8) {
    const count = (segs + 1) * (sides + 1);
    this.pos = new Float32Array(count * 3);
    this.nor = new Float32Array(count * 3);
    this.centers = new Float32Array((segs + 1) * 3);
    const uv = new Float32Array(count * 2);
    const idx: number[] = [];
    for (let i = 0; i <= segs; i++) {
      for (let j = 0; j <= sides; j++) {
        const k = i * (sides + 1) + j;
        uv[k * 2] = i / segs;
        uv[k * 2 + 1] = j / sides;
        this.nor[k * 3 + 1] = 1;
        if (i < segs && j < sides) {
          const b = k + sides + 1;
          // Wound so the outside of the tube is the front face (ring angle runs from the normal toward tangent x normal).
          idx.push(k, k + 1, b, k + 1, b + 1, b);
        }
      }
    }
    this.geo = new T.BufferGeometry();
    this.geo.setAttribute('position', new T.BufferAttribute(this.pos, 3).setUsage(T.DynamicDrawUsage));
    this.geo.setAttribute('normal', new T.BufferAttribute(this.nor, 3).setUsage(T.DynamicDrawUsage));
    this.geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    this.geo.setIndex(idx);
  }

  /** `path(s, out)` writes the centreline at s in [0,1]; `radius(u)` is the tube radius at u in [0,1] of the visible span. */
  update(tail: number, head: number, path: (s: number, out: number[]) => void, radius: (u: number) => number) {
    const {segs, sides, centers, pos, nor, tmp} = this;
    const span = Math.max(1e-4, head - tail);
    for (let i = 0; i <= segs; i++) {
      path(tail + span * (i / segs), tmp);
      centers[i * 3] = tmp[0];
      centers[i * 3 + 1] = tmp[1];
      centers[i * 3 + 2] = tmp[2];
    }
    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i <= segs; i++) {
      const a = Math.max(0, i - 1) * 3, b = Math.min(segs, i + 1) * 3;
      let tx = centers[b] - centers[a], ty = centers[b + 1] - centers[a + 1], tz = centers[b + 2] - centers[a + 2];
      const tl = Math.hypot(tx, ty, tz);
      if (tl > 1e-6) { tx /= tl; ty /= tl; tz /= tl; } else { tx = 0; ty = 0; tz = 1; }
      if (i === 0) {
        // Seed the frame from whichever world axis is least parallel to the first tangent.
        const ux = Math.abs(ty) < 0.9 ? 0 : 1, uy = Math.abs(ty) < 0.9 ? 1 : 0;
        nx = uy * tz; ny = -ux * tz; nz = ux * ty - uy * tx;
      }
      // Parallel transport: project the previous normal off the new tangent, so the tube never twists or flips.
      const d = nx * tx + ny * ty + nz * tz;
      nx -= tx * d; ny -= ty * d; nz -= tz * d;
      const nl = Math.hypot(nx, ny, nz);
      if (nl > 1e-6) { nx /= nl; ny /= nl; nz /= nl; } else { nx = 1; ny = 0; nz = 0; }
      const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
      const r = Math.max(0, radius(i / segs));
      const cx = centers[i * 3], cy = centers[i * 3 + 1], cz = centers[i * 3 + 2];
      for (let j = 0; j <= sides; j++) {
        const ang = (j / sides) * Math.PI * 2;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const ox = nx * ca + bx * sa, oy = ny * ca + by * sa, oz = nz * ca + bz * sa;
        const k = (i * (sides + 1) + j) * 3;
        pos[k] = cx + ox * r; pos[k + 1] = cy + oy * r; pos[k + 2] = cz + oz * r;
        nor[k] = ox; nor[k + 1] = oy; nor[k + 2] = oz;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.normal.needsUpdate = true;
  }
}

/** Rounded head, long body and a pinched tail: the default silhouette of a water jet. */
export function streamProfile(base: number, bulb = 0.6) {
  return (u: number) => {
    const tailIn = Math.min(1, u / 0.16);
    const cap = u > 0.94 ? Math.sqrt(Math.max(0, 1 - ((u - 0.94) / 0.06) ** 2)) : 1;
    const head = Math.exp(-(((u - 0.90) / 0.09) ** 2)) * bulb;
    return base * (0.45 + 0.55 * u + head) * Math.sqrt(tailIn) * cap;
  };
}

/**
 * Ridged crescent blade lying in the XZ plane with its convex edge leading toward +Z.
 * The apex sits near the origin so the mesh can simply be translated along its flight path.
 */
export function crescentGeo(T: any, radius: number, width: number, arc: number, segs = 28, ridge = 0.06) {
  const pos = new Float32Array((segs + 1) * 9);
  const uv = new Float32Array((segs + 1) * 6);
  const idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const th = (u - 0.5) * arc;
    const taper = Math.pow(Math.max(0, Math.sin(u * Math.PI)), 0.62);
    const w = width * taper;
    const sx = Math.sin(th), cz = Math.cos(th);
    const o = i * 9;
    const rIn = radius - w, rMid = radius - w * 0.40;
    pos[o] = sx * rIn; pos[o + 1] = 0; pos[o + 2] = cz * rIn - radius + width * 0.5;
    pos[o + 3] = sx * rMid; pos[o + 4] = ridge * taper; pos[o + 5] = cz * rMid - radius + width * 0.5;
    pos[o + 6] = sx * radius; pos[o + 7] = 0; pos[o + 8] = cz * radius - radius + width * 0.5;
    uv[i * 6] = u; uv[i * 6 + 1] = 0;
    uv[i * 6 + 2] = u; uv[i * 6 + 3] = 0.6;
    uv[i * 6 + 4] = u; uv[i * 6 + 5] = 1;
    if (i < segs) {
      const a = i * 3;
      idx.push(a, a + 1, a + 3, a + 1, a + 4, a + 3, a + 1, a + 2, a + 4, a + 2, a + 5, a + 4);
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** Upright tape wound around the Y axis; several of these make a cyclone that is all streamline and no wall. */
export function helixRibbonGeo(T: any, o: {turns: number; height: number; r0: number; r1: number; width: number; segs?: number; phase?: number; flare?: number}) {
  const segs = o.segs ?? 48;
  const pos = new Float32Array((segs + 1) * 6);
  const uv = new Float32Array((segs + 1) * 4);
  const idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const s = i / segs;
    const a = (o.phase ?? 0) + s * o.turns * Math.PI * 2;
    const r = o.r0 + (o.r1 - o.r0) * Math.pow(s, o.flare ?? 1);
    const w = o.width * Math.pow(Math.max(0, Math.sin(s * Math.PI)), 0.5) * (0.55 + 0.45 * s);
    const y = s * o.height;
    const k = i * 6;
    pos[k] = Math.cos(a) * r; pos[k + 1] = y - w * 0.5; pos[k + 2] = Math.sin(a) * r;
    pos[k + 3] = Math.cos(a) * r * 1.06; pos[k + 4] = y + w * 0.5; pos[k + 5] = Math.sin(a) * r * 1.06;
    uv[i * 4] = s; uv[i * 4 + 1] = 0;
    uv[i * 4 + 2] = s; uv[i * 4 + 3] = 1;
    if (i < segs) {
      const v = i * 2;
      idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function jitter(geo: any, amount: number, seed: number) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + (hash3(x, y, z, seed) - 0.5) * amount;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Faceted boulder. Duplicated face vertices are displaced by a position hash, so the mesh stays watertight. */
export function rockGeo(T: any, radius: number, seed = 1, detail = 1, squash: readonly [number, number, number] = [1, 1, 1]) {
  const geo = jitter(new T.IcosahedronGeometry(radius, detail), 0.46, seed);
  geo.scale(squash[0], squash[1], squash[2]);
  return geo;
}

/** Hewn stone block: a box pulled slightly toward a sphere and roughened. */
export function stoneBoxGeo(T: any, w: number, h: number, d: number, seed = 1, rough = 0.16, round = 0.22) {
  const geo = new T.BoxGeometry(w, h, d, 2, 2, 2);
  const p = geo.attributes.position;
  const rad = Math.hypot(w, h, d) * 0.5;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const l = Math.hypot(x, y, z) || 1;
    const pull = 1 - round * Math.max(0, l / rad - 0.55);
    p.setXYZ(i, x * pull, y * pull, z * pull);
  }
  return jitter(geo, rough, seed);
}

/** Crystal / stone spike rising from y = 0: a narrow foot, a swollen belly and an off-centre apex. */
export function shardGeo(T: any, baseR: number, height: number, sides = 5, seed = 1, belly = 0.30) {
  const ring = (y: number, r: number, salt: number) => {
    const pts: number[][] = [];
    for (let j = 0; j < sides; j++) {
      const a = (j / sides) * Math.PI * 2 + hash3(j, salt, 0, seed) * 0.5;
      const rr = r * (0.78 + hash3(j, salt, 1, seed) * 0.44);
      pts.push([Math.cos(a) * rr, y, Math.sin(a) * rr]);
    }
    return pts;
  };
  const foot = ring(0, baseR * 0.72, 1);
  const mid = ring(height * belly, baseR, 2);
  const apex = [(hash3(3, 1, 4, seed) - 0.5) * baseR * 0.7, height, (hash3(1, 5, 9, seed) - 0.5) * baseR * 0.7];
  const pos: number[] = [];
  const uv: number[] = [];
  const tri = (a: number[], b: number[], c: number[]) => {
    for (const v of [a, b, c]) {
      pos.push(v[0], v[1], v[2]);
      uv.push(0.5, v[1] / height);
    }
  };
  for (let j = 0; j < sides; j++) {
    const k = (j + 1) % sides;
    tri(foot[j], mid[j], foot[k]);
    tri(foot[k], mid[j], mid[k]);
    tri(mid[j], apex, mid[k]);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('uv', new T.BufferAttribute(new Float32Array(uv), 2));
  geo.computeVertexNormals();
  return geo;
}

/** Stone gauntlet facing +Z: palm block, four knuckles, a thumb and a forearm of boulders trailing along -Z. */
export function stoneFist(T: any, size: number, mat: any, forearm = 2) {
  const g = new T.Group();
  g.add(new T.Mesh(stoneBoxGeo(T, size, size * 0.82, size * 0.95, 3), mat));
  for (let k = 0; k < 4; k++) {
    const kn = new T.Mesh(stoneBoxGeo(T, size * 0.25, size * 0.30, size * 0.36, 5 + k, 0.2), mat);
    kn.position.set((k - 1.5) * size * 0.25, size * 0.17, size * 0.50);
    g.add(kn);
  }
  const thumb = new T.Mesh(stoneBoxGeo(T, size * 0.28, size * 0.30, size * 0.5, 11), mat);
  thumb.position.set(size * 0.52, -size * 0.10, size * 0.16);
  g.add(thumb);
  for (let k = 0; k < forearm; k++) {
    const arm = new T.Mesh(rockGeo(T, size * (0.40 - Math.min(k, 2) * 0.04), 7 + k * 2), mat);
    arm.position.z = -size * (0.78 + k * 0.56);
    g.add(arm);
  }
  return g;
}

export interface WaterOpts {alpha?: number; flow?: number; rep?: number; mode?: 0 | 1; crest?: number; seed?: number; deep?: Rgb; mid?: Rgb; foam?: Rgb}
export interface FireOpts {displace?: number; freq?: number; rise?: number; hot?: number; taper?: number; seed?: number; alpha?: number; flowDir?: Rgb; palette?: readonly Rgb[]}
export interface RockOpts {seed?: number; glow?: number; vein?: number; shade?: Rgb; base?: Rgb; light?: Rgb; glowColor?: Rgb}

export const FIRE_PALETTE: readonly Rgb[] = [[2.6, 2.3, 1.5], [2.5, 1.55, 0.32], [2.1, 0.62, 0.06], [0.95, 0.10, 0.02], [0.09, 0.05, 0.05]];
/** Fire shader repainted as void-flame for Dark bursts. */
export const VOID_PALETTE: readonly Rgb[] = [[2.3, 1.7, 2.6], [1.75, 0.45, 1.9], [0.62, 0.12, 1.25], [0.16, 0.03, 0.42], [0.02, 0.008, 0.05]];
/** Fire shader repainted as churning dust for Physical impacts. */
export const DUST_PALETTE: readonly Rgb[] = [[1.25, 1.15, 0.95], [1.0, 0.88, 0.66], [0.78, 0.66, 0.48], [0.52, 0.44, 0.33], [0.30, 0.26, 0.21]];

/** Material factory + pool. Call `release(object)` when an effect ends; call `dispose()` with the owning system. */
export class VfxKit {
  private pools = new Map<string, any[]>();
  private made = new Set<any>();
  private sharedGeos = new Map<string, any>();

  constructor(readonly T: any) {}

  private take(key: string, make: () => any) {
    const mat = this.pools.get(key)?.pop() ?? make();
    mat.userData.kitKey = key;
    this.made.add(mat);
    return mat;
  }

  private shader(frag: string, uniforms: Record<string, any>, o: {additive?: boolean; premultiplied?: boolean; opaque?: boolean; decal?: boolean; displace?: boolean} = {}) {
    const T = this.T;
    const blend = o.premultiplied
      ? {blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor}
      : {blending: o.additive ? T.AdditiveBlending : T.NormalBlending};
    return new T.ShaderMaterial({
      ...blend,
      vertexShader: KIT_VERT,
      fragmentShader: frag,
      transparent: !o.opaque,
      depthWrite: !!o.opaque,
      side: T.DoubleSide,
      defines: o.displace ? {KIT_DISPLACE: ''} : {},
      polygonOffset: !!o.decal,
      polygonOffsetFactor: o.decal ? -2 : 0,
      polygonOffsetUnits: o.decal ? -4 : 0,
      uniforms: {uTime: {value: 0}, uSeed: {value: 0}, ...uniforms},
    });
  }

  private v3(c: Rgb) {
    return new this.T.Vector3(c[0], c[1], c[2]);
  }

  /** Unit geometries reused by every effect; `release` leaves them alone. */
  unit(kind: 'blob' | 'sphere' | 'plane' | 'disc' | 'cone' | 'torus') {
    let geo = this.sharedGeos.get(kind);
    if (!geo) {
      const T = this.T;
      if (kind === 'blob') geo = new T.IcosahedronGeometry(1, 5);
      else if (kind === 'sphere') geo = new T.SphereGeometry(1, 28, 20);
      else if (kind === 'plane') geo = new T.PlaneGeometry(1, 1);
      else if (kind === 'disc') geo = new T.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
      else if (kind === 'torus') geo = new T.TorusGeometry(1, 0.045, 6, 36);
      // Open flame cone: apex at the origin, mouth 1 unit along +Y, uv.y = 0 at the apex.
      else geo = new T.CylinderGeometry(1, 0.04, 1, 22, 8, true).translate(0, 0.5, 0);
      geo.userData.shared = true;
      this.sharedGeos.set(kind, geo);
    }
    return geo;
  }

  water(o: WaterOpts = {}) {
    const m = this.take('water', () => this.shader(WATER_FRAG, {
      uDeep: {value: this.v3([0, 0, 0])}, uMid: {value: this.v3([0, 0, 0])}, uFoam: {value: this.v3([0, 0, 0])},
      uAlpha: {value: 1}, uFlow: {value: 3}, uRep: {value: 5}, uMode: {value: 0}, uCrest: {value: 0.82},
    }));
    const u = m.uniforms;
    u.uDeep.value.set(...(o.deep ?? [0.02, 0.22, 0.70]));
    u.uMid.value.set(...(o.mid ?? [0.10, 0.66, 1.10]));
    u.uFoam.value.set(...(o.foam ?? [1.22, 1.50, 1.62]));
    u.uAlpha.value = o.alpha ?? 1;
    u.uFlow.value = o.flow ?? 3.2;
    u.uRep.value = o.rep ?? 5;
    u.uMode.value = o.mode ?? 0;
    u.uCrest.value = o.crest ?? 0.84;
    u.uSeed.value = o.seed ?? Math.random() * 20;
    return m;
  }

  fire(o: FireOpts = {}) {
    const displaced = (o.displace ?? 0.5) > 0;
    const m = this.take(displaced ? 'fire-d' : 'fire', () => this.shader(FIRE_FRAG, {
      uC0: {value: this.v3([0, 0, 0])}, uC1: {value: this.v3([0, 0, 0])}, uC2: {value: this.v3([0, 0, 0])},
      uC3: {value: this.v3([0, 0, 0])}, uC4: {value: this.v3([0, 0, 0])},
      uProgress: {value: 0}, uAlpha: {value: 1}, uTaper: {value: 0}, uHot: {value: 0.35},
      uFreq: {value: 1.6}, uRise: {value: 1.2}, uDisp: {value: 0.5}, uFlowDir: {value: this.v3([0, 1, 0])},
    }, {displace: displaced}));
    const u = m.uniforms;
    const pal = o.palette ?? FIRE_PALETTE;
    u.uC0.value.set(...pal[0]); u.uC1.value.set(...pal[1]); u.uC2.value.set(...pal[2]);
    u.uC3.value.set(...pal[3]); u.uC4.value.set(...pal[4]);
    u.uProgress.value = 0;
    u.uAlpha.value = o.alpha ?? 1;
    u.uTaper.value = o.taper ?? 0;
    u.uHot.value = o.hot ?? 0.35;
    u.uFreq.value = o.freq ?? 1.6;
    u.uRise.value = o.rise ?? 1.2;
    u.uDisp.value = o.displace ?? 0.5;
    u.uFlowDir.value.set(...(o.flowDir ?? [0, 1, 0]));
    u.uSeed.value = o.seed ?? Math.random() * 20;
    return m;
  }

  rift(seed = Math.random() * 20, color: Rgb = [1.45, 0.20, 1.05], core: Rgb = [2.5, 1.9, 2.7]) {
    const m = this.take('rift', () => this.shader(RIFT_FRAG, {
      uColor: {value: this.v3([0, 0, 0])}, uCore: {value: this.v3([0, 0, 0])},
      uDraw: {value: 0}, uOpen: {value: 0}, uFade: {value: 1},
    }));
    const u = m.uniforms;
    u.uColor.value.set(...color);
    u.uCore.value.set(...core);
    u.uDraw.value = 0; u.uOpen.value = 0; u.uFade.value = 1;
    u.uSeed.value = seed;
    return m;
  }

  voidShell(o: {center?: number; pow?: number; alpha?: number; color?: Rgb; core?: Rgb; seed?: number} = {}) {
    const m = this.take('void', () => this.shader(VOID_FRAG, {
      uColor: {value: this.v3([0, 0, 0])}, uCore: {value: this.v3([0, 0, 0])},
      uAlpha: {value: 1}, uCenter: {value: 0.2}, uPow: {value: 1.6},
    }));
    const u = m.uniforms;
    u.uColor.value.set(...(o.color ?? [0.62, 0.14, 1.25]));
    u.uCore.value.set(...(o.core ?? [2.2, 1.3, 2.6]));
    u.uAlpha.value = o.alpha ?? 1;
    u.uCenter.value = o.center ?? 0.2;
    u.uPow.value = o.pow ?? 1.6;
    u.uSeed.value = o.seed ?? Math.random() * 20;
    return m;
  }

  wind(o: {alpha?: number; flow?: number; lines?: number; body?: number; main?: Rgb; core?: Rgb; seed?: number} = {}) {
    const m = this.take('wind', () => this.shader(WIND_FRAG, {
      uMain: {value: this.v3([0, 0, 0])}, uCore: {value: this.v3([0, 0, 0])},
      uAlpha: {value: 1}, uFlow: {value: 3}, uLines: {value: 4}, uBody: {value: 0.1},
    }, {premultiplied: true}));
    const u = m.uniforms;
    u.uMain.value.set(...(o.main ?? [0.36, 1.25, 0.82]));
    u.uCore.value.set(...(o.core ?? [1.45, 1.9, 1.65]));
    u.uAlpha.value = o.alpha ?? 1;
    u.uFlow.value = o.flow ?? 3;
    u.uLines.value = o.lines ?? 4;
    u.uBody.value = o.body ?? 0.1;
    u.uSeed.value = o.seed ?? Math.random() * 20;
    return m;
  }

  rock(o: RockOpts = {}) {
    const m = this.take('rock', () => this.shader(ROCK_FRAG, {
      uShade: {value: this.v3([0, 0, 0])}, uBase: {value: this.v3([0, 0, 0])}, uLight: {value: this.v3([0, 0, 0])},
      uGlow: {value: this.v3([0, 0, 0])}, uGlowAmt: {value: 0.6}, uDissolve: {value: 0}, uVein: {value: 2.4},
    }, {opaque: true}));
    const u = m.uniforms;
    // Deep umber to ochre: dark enough to stand apart from pale paving and sunlit grass once the scene is exposed.
    u.uShade.value.set(...(o.shade ?? [0.070, 0.042, 0.032]));
    u.uBase.value.set(...(o.base ?? [0.235, 0.145, 0.078]));
    u.uLight.value.set(...(o.light ?? [0.56, 0.37, 0.17]));
    u.uGlow.value.set(...(o.glowColor ?? [2.3, 1.55, 0.42]));
    u.uGlowAmt.value = o.glow ?? 0.6;
    u.uVein.value = o.vein ?? 2.4;
    u.uDissolve.value = 0;
    u.uSeed.value = o.seed ?? Math.random() * 20;
    return m;
  }

  flash(color: Rgb, alpha = 1, pow = 2.2) {
    const m = this.take('flash', () => this.shader(FLASH_FRAG, {
      uColor: {value: this.v3([0, 0, 0])}, uAlpha: {value: 1}, uPow: {value: 2.2},
    }, {additive: true}));
    m.uniforms.uColor.value.set(...color);
    m.uniforms.uAlpha.value = alpha;
    m.uniforms.uPow.value = pow;
    return m;
  }

  bubble(o: {alpha?: number; color?: Rgb; core?: Rgb} = {}) {
    const m = this.take('bubble', () => this.shader(BUBBLE_FRAG, {
      uColor: {value: this.v3([0, 0, 0])}, uCore: {value: this.v3([0, 0, 0])}, uAlpha: {value: 1},
    }, {additive: true}));
    m.uniforms.uColor.value.set(...(o.color ?? [0.18, 0.86, 1.82]));
    m.uniforms.uCore.value.set(...(o.core ?? [1.40, 2.00, 2.25]));
    m.uniforms.uAlpha.value = o.alpha ?? 1;
    return m;
  }

  /** 0 water ripples, 1 scorch, 2 void star-crack, 3 stone fracture, 4 dust ring, 5 telegraph. */
  ground(mode: 0 | 1 | 2 | 3 | 4 | 5, color: Rgb, dark: Rgb, seed = Math.random() * 20) {
    const m = this.take('ground', () => this.shader(GROUND_FRAG, {
      uColor: {value: this.v3([0, 0, 0])}, uDark: {value: this.v3([0, 0, 0])},
      uProgress: {value: 0}, uFade: {value: 1}, uMode: {value: 0},
    }, {decal: true}));
    const u = m.uniforms;
    u.uColor.value.set(...color);
    u.uDark.value.set(...dark);
    u.uProgress.value = 0; u.uFade.value = 1;
    u.uMode.value = mode;
    u.uSeed.value = seed;
    return m;
  }

  /** Detach an effect subtree, free its own geometry and return its materials to the pool. */
  release(obj: any) {
    obj.removeFromParent();
    const seen = new Set<any>();
    obj.traverse((n: any) => {
      if (n.geometry && !n.geometry.userData?.shared) n.geometry.dispose();
      const mats = Array.isArray(n.material) ? n.material : n.material ? [n.material] : [];
      for (const m of mats) {
        if (seen.has(m)) continue;
        seen.add(m);
        const key = m.userData?.kitKey;
        if (key && this.made.has(m)) {
          let pool = this.pools.get(key);
          if (!pool) this.pools.set(key, pool = []);
          if (!pool.includes(m)) pool.push(m);
        } else m.dispose?.();
      }
    });
  }

  dispose() {
    for (const m of this.made) m.dispose();
    this.made.clear();
    this.pools.clear();
    for (const g of this.sharedGeos.values()) g.dispose();
    this.sharedGeos.clear();
  }
}
