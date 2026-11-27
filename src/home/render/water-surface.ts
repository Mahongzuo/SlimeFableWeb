import * as THREE from 'three';

/** Water meshes live on their own layer: the main camera draws them, the reflection camera never does. */
export const WATER_LAYER = 6;

/** Linear sRGB -> OKLab (Ottosson). Band colours are mixed in OKLab so hue stays clean between stops. */
export function linearToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export interface WaterBand {
  /** sRGB hex colours from the shallowest to the deepest stop. */
  colors: [number, number, number, number];
  /** Vertical depths (m) where the band reaches the 2nd, 3rd and 4th colour. */
  stops: [number, number, number];
}

/** Clear island sea: sunlit sand, turquoise shelf, sky-blue reef drop, deep ultramarine. */
export const SEA_BAND: WaterBand = {colors: [0x9fd8c4, 0x2fb7b4, 0x1f7fb8, 0x0d2f6e], stops: [1.4, 6.5, 22]};
/** Lake and river: shallower, warmer jade so pebbles and koi read through it. */
export const LAKE_BAND: WaterBand = {colors: [0xb9d8b0, 0x5cb8a4, 0x2f8b93, 0x1c5466], stops: [0.5, 1.8, 4.5]};
/** Puddles: barely tinted. */
export const PUDDLE_BAND: WaterBand = {colors: [0xa9b4ac, 0x8fa6a2, 0x7c9a9a, 0x6a8a8e], stops: [0.05, 0.2, 0.6]};

export function bandUniforms(band: WaterBand) {
  const c = new THREE.Color();
  const labs = band.colors.map(hex => {
    c.setHex(hex); // three converts hex from sRGB into the linear working space
    return new THREE.Vector3(...linearToOklab(c.r, c.g, c.b));
  });
  return {
    uBandLab: {value: labs},
    uBandStops: {value: new THREE.Vector3(...band.stops)},
  };
}

/** Uniform objects shared by every water material; HomeRenderPipeline writes them once per frame. */
export function createWaterShared() {
  return {
    tOpaqueColor: {value: null as THREE.Texture | null},
    tOpaqueDepth: {value: null as THREE.Texture | null},
    tPlanarRefl: {value: null as THREE.Texture | null},
    uReflMatrix: {value: new THREE.Matrix4()},
    uReflPlaneY: {value: -1e4},
    uUsePlanar: {value: 0},
    tSkyView: {value: null as THREE.Texture | null},
    tCloudPano: {value: null as THREE.Texture | null},
    uUseClouds: {value: 0},
    tWaterNormal0: {value: null as THREE.Texture | null},
    tWaterNormal1: {value: null as THREE.Texture | null},
    tFoam: {value: bakeFoamTexture()},
    uProj: {value: new THREE.Matrix4()},
    uInvProj: {value: new THREE.Matrix4()},
    uSunDir: {value: new THREE.Vector3(0.4, 0.7, 0.5)},
    uSunColor: {value: new THREE.Color(0xfff1d5)},
    uDaylight: {value: 1},
    uStorm: {value: 0},
    uNear: {value: 0.14},
    uFar: {value: 3200},
    uWaterTime: {value: 0},
    uSSR: {value: 1},
  };
}
export type WaterShared = ReturnType<typeof createWaterShared>;

/**
 * Organic tileable multi-scale foam & noise texture (512², mipmapped):
 * - R: domain-warped soft airy seafoam clouds + delicate scattered micro-bubbles (ZERO hard Voronoi net!)
 * - G: seamless soft low-frequency fbm (breaks up shoreline bands & drives drifting cloud shadows)
 * - B: crisp high-frequency foam fizz specks for close-up surf breakup
 */
export function bakeFoamTexture(size = 512): THREE.DataTexture {
  let seed = 7193;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) | 0) >>> 0) / 4294967296;
  const lattice = (period: number) => Array.from({length: period * period}, rnd);
  const samplePeriodic = (vals: number[], p: number, u: number, v: number) => {
    const x = ((u % 1) + 1) % 1 * p;
    const y = ((v % 1) + 1) % 1 * p;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const at = (a: number, b: number) => vals[((b % p) + p) % p * p + ((a % p) + p) % p];
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return a + (b - a) * sy;
  };
  const octSoft = [4, 8, 16, 32].map(p => ({p, v: lattice(p)}));
  const octWarpX = [6, 12].map(p => ({p, v: lattice(p)}));
  const octWarpY = [6, 12].map(p => ({p, v: lattice(p)}));
  const octFizz = [24, 48, 96].map(p => ({p, v: lattice(p)}));
  const fbm = (octs: {p: number; v: number[]}[], u: number, v: number) => {
    let sum = 0, amp = 0.5, norm = 0;
    for (const o of octs) {
      sum += samplePeriodic(o.v, o.p, u, v) * amp;
      norm += amp;
      amp *= 0.5;
    }
    return sum / norm;
  };

  const data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const u = i / size, v = j / size;
      const soft = fbm(octSoft, u, v);
      const wx = (fbm(octWarpX, u, v) - 0.5) * 0.14;
      const wy = (fbm(octWarpY, u, v) - 0.5) * 0.14;
      const cloud = fbm(octSoft, u + wx, v + wy);
      const fizz = fbm(octFizz, u + wx * 0.6, v - wy * 0.6);
      // Organic airy foam puffs + subtle mottled bubbles (no polygonal cell walls!)
      const foamSoft = Math.min(1, Math.max(0, (cloud * 0.68 + fizz * 0.42 - 0.12) * 1.18));
      const k = (j * size + i) * 4;
      data[k] = Math.round(foamSoft * 255);
      data[k + 1] = Math.round(soft * 255);
      data[k + 2] = Math.round(fizz * 255);
      data[k + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/** Shared declarations + helpers. Every water fragment shader starts with this chunk. */
export const WATER_COMMON_GLSL = /* glsl */ `
uniform sampler2D tOpaqueColor;
uniform sampler2D tOpaqueDepth;
uniform sampler2D tPlanarRefl;
uniform mat4 uReflMatrix;
uniform float uReflPlaneY;
uniform float uUsePlanar;
uniform sampler2D tSkyView;
uniform sampler2D tCloudPano;
uniform float uUseClouds;
uniform sampler2D tWaterNormal0;
uniform sampler2D tWaterNormal1;
uniform sampler2D tFoam;
uniform mat4 uProj;
uniform mat4 uInvProj;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uDaylight;
uniform float uStorm;
uniform float uNear;
uniform float uFar;
uniform float uWaterTime;
uniform float uSSR;
uniform vec3 uBandLab[4];
uniform vec3 uBandStops;

const float W_PI = 3.14159265359;

vec2 wSkyUV(vec3 d) {
  float u = atan(d.x, d.z) / (2.0 * W_PI) + 0.5;
  float lat = asin(clamp(d.y, -1.0, 1.0));
  float s = lat >= 0.0 ? 1.0 : -1.0;
  float v = 0.5 + 0.5 * s * sqrt(abs(lat) / (W_PI * 0.5));
  return vec2(fract(u), clamp(v, 0.002, 0.998));
}

vec2 wCloudUV(vec3 d) {
  float u = atan(d.x, d.z) / (2.0 * W_PI) + 0.5;
  float v = sqrt(clamp(asin(clamp(d.y, 0.0, 1.0)) / (W_PI * 0.5), 0.0, 1.0));
  return vec2(fract(u), clamp(v, 0.001, 0.999));
}

/** Sky radiance (LUT + cached cloud panorama) for a reflected direction. */
vec3 wSky(vec3 R) {
  vec3 d = normalize(vec3(R.x, max(R.y, 0.015), R.z));
  vec3 sky = texture2D(tSkyView, wSkyUV(d)).rgb;
  if (uUseClouds > 0.5) {
    vec4 c = texture2D(tCloudPano, wCloudUV(d));
    sky = sky * c.a + c.rgb;
  }
  sky += vec3(0.010, 0.022, 0.046) * (1.0 - smoothstep(0.02, 0.35, uDaylight));
  return sky;
}

float wLinearDepth(float d) {
  return uNear * uFar / (uFar - d * (uFar - uNear));
}

vec3 wOklabToLinear(vec3 lab) {
  float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  float l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  return max(vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ), vec3(0.0));
}

/** Depth colour band interpolated in OKLab. */
vec3 wBand(float depth) {
  vec3 lab = mix(uBandLab[0], uBandLab[1], smoothstep(0.0, uBandStops.x, depth));
  lab = mix(lab, uBandLab[2], smoothstep(uBandStops.x, uBandStops.y, depth));
  lab = mix(lab, uBandLab[3], smoothstep(uBandStops.y, uBandStops.z, depth));
  return wOklabToLinear(lab);
}

float wIgn(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

/** Two detail normal maps, mipmapped, so distant water settles instead of shimmering. */
vec2 wDetailSlope(vec2 p, vec2 flow, float t) {
  vec2 a = texture2D(tWaterNormal0, p * 0.23 + flow * t * 0.30).xy * 2.0 - 1.0;
  vec2 b = texture2D(tWaterNormal1, mat2(0.78, 0.626, -0.626, 0.78) * p * 0.41 - flow * t * 0.19 + vec2(t * 0.011, -t * 0.007)).xy * 2.0 - 1.0;
  return a * 0.6 + b * 0.4;
}

/** Sun reflection: broad sheen plus thresholded star sparkles that feed bloom without flooding it. */
vec3 wSun(vec3 N, vec3 V, vec3 L, float rough, float sparkleMask) {
  if (L.y < -0.04) return vec3(0.0);
  vec3 H = normalize(L + V);
  float ndh = max(dot(N, H), 0.0);
  float a2 = rough * rough;
  float den = ndh * ndh * (a2 - 1.0) + 1.0;
  float D = a2 / max(W_PI * den * den, 1e-5);
  float sparkle = smoothstep(0.55, 1.0, pow(ndh, 1400.0)) * sparkleMask;
  float vis = smoothstep(-0.04, 0.05, L.y) * (1.0 - 0.8 * uStorm) * uDaylight;
  return uSunColor * (D * 0.05 + sparkle * 9.0) * vis;
}

/** Screen-space reflection against the opaque copy; returns rgb + confidence. */
vec4 wTraceSSR(vec3 vp, vec3 vr, vec2 jitterSeed) {
  if (uSSR < 0.5 || vr.z > 0.35) return vec4(0.0);
  float maxDist = 48.0;
  if (vr.z > 0.0) maxDist = min(maxDist, (-uNear * 1.5 - vp.z) / vr.z);
  vec3 endP = vp + vr * maxDist;
  vec4 h0 = uProj * vec4(vp, 1.0);
  vec4 h1 = uProj * vec4(endP, 1.0);
  vec2 s0 = h0.xy / h0.w * 0.5 + 0.5;
  vec2 s1 = h1.xy / h1.w * 0.5 + 0.5;
  float k0 = 1.0 / h0.w, k1 = 1.0 / h1.w;
  float z0 = vp.z * k0, z1 = endP.z * k1;
  float jitter = wIgn(jitterSeed);
  const int STEPS = 18;
  for (int i = 0; i < STEPS; i++) {
    float t = (float(i) + jitter) / float(STEPS);
    t *= t;
    vec2 uv = mix(s0, s1, t);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) break;
    float rayZ = mix(z0, z1, t) / mix(k0, k1, t);
    float sceneD = texture2D(tOpaqueDepth, uv).x;
    if (sceneD >= 0.9999) continue;
    float sceneZ = -wLinearDepth(sceneD);
    float diff = sceneZ - rayZ;
    if (diff > 0.0 && diff < 0.5 + 0.05 * -rayZ) {
      vec2 e = smoothstep(0.0, 0.08, uv) * smoothstep(1.0, 0.92, uv);
      float conf = e.x * e.y * (1.0 - t * t);
      return vec4(texture2D(tOpaqueColor, uv).rgb, conf);
    }
  }
  return vec4(0.0);
}

/** Planar reflection sample when this surface sits on the shared mirror plane. */
vec4 wPlanar(vec3 worldPos, float level, vec2 distort) {
  if (uUsePlanar < 0.5 || abs(uReflPlaneY - level) > 0.12) return vec4(0.0);
  vec4 rc = uReflMatrix * vec4(worldPos, 1.0);
  if (rc.w <= 0.001) return vec4(0.0);
  vec2 uv = rc.xy / rc.w + distort;
  float inUv = smoothstep(0.0, 0.05, uv.x) * smoothstep(1.0, 0.95, uv.x) * smoothstep(0.0, 0.05, uv.y) * smoothstep(1.0, 0.95, uv.y);
  // The mirror is cleared to alpha 0: uncovered texels (clipped sky) fall back to wSky
  vec4 p = texture2D(tPlanarRefl, clamp(uv, vec2(0.003), vec2(0.997)));
  return vec4(p.rgb / max(p.a, 1e-3), inUv * p.a);
}
`;

const INLAND_VERT = /* glsl */ `
varying vec3 vWorld;
varying vec4 vClip;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vClip = projectionMatrix * viewMatrix * w;
  gl_Position = vClip;
}`;

const INLAND_FRAG = /* glsl */ `
precision highp float;
${WATER_COMMON_GLSL}
uniform vec4 contacts[8];
uniform float uLevel;
uniform vec2 uFlow;
uniform float uCalm;
uniform float uWind;
uniform float uRain;
uniform vec3 uAbsorb;
uniform float uMinRefl;
uniform float uShoreFoam;
uniform float uWet;
uniform vec4 uPuddleEll[4];
uniform vec2 uPuddleRot[4];
varying vec3 vWorld;
varying vec4 vClip;

// 0 at a puddle's centre, 1 at its nominal ellipse rim (the drawn outline wobbles out to ~1.16)
float puddleRadius(vec2 p) {
  float r = 9.0;
  for (int i = 0; i < 4; i++) {
    vec4 e = uPuddleEll[i];
    if (e.z <= 0.0) continue;
    vec2 d = p - e.xy;
    vec2 cs = uPuddleRot[i];
    vec2 l = vec2(d.x * cs.x - d.y * cs.y, d.x * cs.y + d.y * cs.x);
    r = min(r, length(l / e.zw));
  }
  return r;
}

// Sparse, delicate two-layer raindrop ripples (only ~32% cells active per cycle — zero trypophobia clustering!)
float rainRingLayer(vec2 p, float t, float scale, float seedOff) {
  vec2 sp = p * scale;
  vec2 cell = floor(sp);
  vec2 f = fract(sp) - 0.5;
  float h = fract(sin(dot(cell, vec2(127.1, 311.7)) + seedOff) * 43758.5453);
  float cycle = floor(t * 0.62 + h * 7.0);
  float activeH = fract(sin(dot(cell + cycle * 1.73, vec2(269.5, 183.3)) + seedOff) * 29713.173);
  if (activeH > 0.34) return 0.0;
  float life = fract(t * 0.62 + h * 7.0);
  vec2 o = (vec2(fract(activeH * 17.3), fract(activeH * 31.7)) - 0.5) * 0.44;
  float r = length(f - o);
  float rad = life * 0.34;
  float ring = exp(-pow((r - rad) * 34.0, 2.0)) * smoothstep(0.0, 0.08, life) * pow(1.0 - life, 1.5);
  return ring;
}

float rainRings(vec2 p, float t) {
  vec2 pRot = mat2(0.80, -0.60, 0.60, 0.80) * p;
  return rainRingLayer(p, t, 0.72, 1.3) + rainRingLayer(pRot + vec2(3.7, 1.9), t * 0.88, 0.52, 9.7) * 0.72;
}

void main() {
  vec3 toCam = cameraPosition - vWorld;
  float dist = length(toCam);
  vec3 V = toCam / dist;
  vec3 L = normalize(uSunDir);

  // Surface slope: detail maps along the flow, entry ripples, rain rings. Calm water keeps a still mirror.
  float t = uWaterTime;
  float amp = mix(0.05, 0.26, uWind) * (1.0 - 0.75 * uCalm) + 0.05 * uRain;
  vec2 slope = wDetailSlope(vWorld.xz, uFlow, t) * amp;
  if (length(uFlow) > 0.4) {
    vec2 along = normalize(uFlow);
    vec2 streakUV = vec2(dot(vWorld.xz, vec2(along.y, -along.x)) * 1.6, dot(vWorld.xz, along) * 0.22 - t * 0.9);
    slope += (texture2D(tFoam, streakUV * 0.09).g - 0.5) * 0.10 * vec2(along.y, -along.x);
  }
  for (int i = 0; i < 8; i++) {
    float age = t - contacts[i].z;
    if (age >= 0.0 && age < 1.8) {
      vec2 dp = vWorld.xz - contacts[i].xy;
      float r = length(dp);
      float front = r - 0.21 - age * 1.42;
      float band = exp(-front * front * 36.0) * exp(-age * 1.8);
      slope += dp / max(0.015, r) * cos(front * 19.0) * band * contacts[i].w;
    }
  }
  if (uRain > 0.01) {
    float rainFade = 1.0 - smoothstep(14.0, 38.0, dist);
    if (rainFade > 0.01) {
      float e = 0.045;
      float c0 = rainRings(vWorld.xz, t);
      slope += vec2(rainRings(vWorld.xz + vec2(e, 0.0), t) - c0, rainRings(vWorld.xz + vec2(0.0, e), t) - c0) * 0.58 * uRain * rainFade;
    }
  }
  slope /= 1.0 + dist * 0.025;
  vec3 N = normalize(vec3(slope.x, 1.0, slope.y));
  float ndv = max(dot(N, V), 0.001);

  // Thickness from the opaque copy, then a refracted bed sample that never pulls in foreground objects.
  vec2 suv = vClip.xy / vClip.w * 0.5 + 0.5;
  float waterZ = wLinearDepth(gl_FragCoord.z);
  float sceneZ = wLinearDepth(texture2D(tOpaqueDepth, suv).x);
  float thick = max(0.0, sceneZ - waterZ);
  float vdepth = thick * clamp(V.y, 0.12, 1.0);
  vec2 ruv = clamp(suv + N.xz * min(0.035, 0.004 + vdepth * 0.02), vec2(0.002), vec2(0.998));
  if (wLinearDepth(texture2D(tOpaqueDepth, ruv).x) < waterZ) ruv = suv;
  vec3 bed = texture2D(tOpaqueColor, ruv).rgb;

  float light = 0.20 + 0.80 * uDaylight;
  vec3 trans = exp(-uAbsorb * thick);
  vec3 body = wBand(vdepth) * light * (0.55 + 0.45 * max(L.y, 0.0));
  vec3 refr = bed * trans * mix(vec3(1.0), wBand(0.0) * 1.15, 0.25) + body * (1.0 - trans);

  // Puddles (uWet >= 0): standing water breaks into patches as it dries; a damp darkened rim surrounds it.
  float cover = 1.0;
  float standing = 1.0;
  float minRefl = uMinRefl;
  if (uWet >= 0.0) {
    float n = texture2D(tFoam, vWorld.xz * 0.045).g * 0.7 + texture2D(tFoam, vWorld.xz * 0.21).g * 0.3;
    // shallow rims dry first, so the outline is organic rather than the shape's hard edge
    float rim = smoothstep(0.5, 0.84, puddleRadius(vWorld.xz));
    float level = n + uWet * 0.75 - 0.6 - rim * 0.85;
    cover = smoothstep(0.0, 0.05, level);
    standing = cover;
    float damp = smoothstep(-0.1, 0.0, level);
    refr = bed * mix(1.0, 0.7, max(damp * 0.7, cover));
    minRefl = uMinRefl * cover;
    cover = max(cover, damp * 0.85);
  }

  // Reflection: shared mirror plane when this surface is on it, otherwise SSR, otherwise sky.
  vec3 R = reflect(-V, N);
  vec3 refl = wSky(R);
  vec4 planar = wPlanar(vWorld, uLevel, N.xz * 0.035);
  if (planar.a > 0.0) {
    refl = mix(refl, planar.rgb, planar.a);
  } else {
    vec3 vp = (viewMatrix * vec4(vWorld, 1.0)).xyz;
    vec3 vr = normalize((viewMatrix * vec4(R, 0.0)).xyz);
    vec4 ssr = wTraceSSR(vp, vr, gl_FragCoord.xy);
    refl = mix(refl, ssr.rgb, ssr.a);
  }
  float F = max(minRefl, 0.02 + 0.98 * pow(1.0 - ndv, 5.0));
  // thin film over stone: the sky only takes over towards grazing, so puddles read as wet stone from above
  if (uWet >= 0.0) F *= mix(0.3, 1.0, smoothstep(0.55, 0.9, 1.0 - ndv));
  F *= standing;
  vec3 col = mix(refr, refl, F);

  col += wSun(N, V, L, mix(0.03, 0.10, uWind), 1.0 - uCalm * 0.6) * standing;

  // Delicate, organic shoreline meniscus + soft airy water froth (zero polygonal Voronoi net!)
  if (uShoreFoam > 0.0) {
    vec2 driftA = vWorld.xz * 0.22 + uFlow * t * 0.035 + vec2(t * 0.012, -t * 0.009);
    vec2 driftB = mat2(0.80, -0.60, 0.60, 0.80) * vWorld.xz * 0.42 - uFlow * t * 0.02;
    vec3 fA = texture2D(tFoam, driftA).rgb;
    vec3 fB = texture2D(tFoam, driftB).rgb;
    float wispy = fA.r * 0.58 + fB.r * 0.42;
    float fizz = fA.b * 0.5 + fB.b * 0.5;
    float lap = 0.018 * sin(t * 1.35 + fA.g * 6.283);
    float thinRim = (1.0 - smoothstep(0.0, 0.034 + lap * 0.4, vdepth)) * smoothstep(0.28, 0.68, wispy + 0.20);
    float softBand = (1.0 - smoothstep(0.0, uShoreFoam * 1.15 + lap, vdepth));
    float softMist = softBand * softBand * smoothstep(0.46, 0.84, wispy * 0.72 + fizz * 0.42) * 0.44;
    float foam = clamp(max(thinRim * 0.62, softMist), 0.0, 0.72);
    col = mix(col, vec3(0.92, 0.96, 0.96) * light, foam * 0.52);
  }

  float alpha = uWet >= 0.0 ? cover * smoothstep(0.0, 0.004, thick) : smoothstep(0.0, 0.035, thick);
  gl_FragColor = vec4(col, alpha);
}`;

export interface InlandWaterOptions {
  band?: WaterBand;
  flow?: [number, number];
  /** 0 = wind-blown, 1 = still mirror. */
  calm?: number;
  absorb?: [number, number, number];
  minReflect?: number;
  shoreFoam?: number;
  /** Standing puddle: `uWet` (0 dry .. 1 soaked) breaks it into patches and darkens the stone. */
  puddle?: boolean;
  /** Puddle ellipses (same layout as `ctx.puddles`), used to dry the rims first. */
  patches?: {x: number; z: number; rx: number; rz: number; rot: number}[];
}

export function createInlandWaterMaterial(
  shared: WaterShared,
  climate: {uWind: {value: number}; uRain: {value: number}},
  contacts: THREE.Vector4[],
  opts: InlandWaterOptions = {},
) {
  const flow = opts.flow ?? [0.28, 0.16];
  const puddleEll = Array.from({length: 4}, () => new THREE.Vector4());
  const puddleRot = Array.from({length: 4}, () => new THREE.Vector2(1, 0));
  (opts.patches ?? []).slice(0, 4).forEach((p, i) => {
    puddleEll[i].set(p.x, p.z, p.rx, p.rz);
    puddleRot[i].set(Math.cos(p.rot), Math.sin(p.rot));
  });
  return new THREE.ShaderMaterial({
    name: 'InlandWater',
    vertexShader: INLAND_VERT,
    fragmentShader: INLAND_FRAG,
    transparent: true,
    depthWrite: true,
    depthTest: true,
    fog: false,
    uniforms: {
      ...shared,
      ...bandUniforms(opts.band ?? LAKE_BAND),
      contacts: {value: contacts},
      uLevel: {value: 0},
      uFlow: {value: new THREE.Vector2(flow[0], flow[1])},
      uCalm: {value: opts.calm ?? 0.5},
      uWind: climate.uWind,
      uRain: climate.uRain,
      uAbsorb: {value: new THREE.Vector3(...(opts.absorb ?? [0.55, 0.16, 0.12]))},
      uMinRefl: {value: opts.minReflect ?? 0.04},
      uShoreFoam: {value: opts.shoreFoam ?? 0.12},
      uWet: {value: opts.puddle ? 1 : -1},
      uPuddleEll: {value: puddleEll},
      uPuddleRot: {value: puddleRot},
    },
  });
}
