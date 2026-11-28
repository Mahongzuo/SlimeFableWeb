import {OCEAN_CAUSTICS_GLSL} from './ocean-light';
import {islandBed, type SeaIsland} from '../voyage-islands';
import {VoyageWake, WAKE_SAMPLE, voyageChop} from './voyage-wake';
import * as THREE from 'three';
import {SEA_LEVEL} from '../layout';
import type {HomeRenderParams} from './params';
import type {OceanRenderHook} from './pipeline';
import type {IslandSDFData} from '../../world/island-coast';
import {bandUniforms, SEA_BAND, WATER_COMMON_GLSL, WATER_LAYER, type WaterShared} from './water-surface';

export interface OceanWaveSample {
  /** Vertical wave displacement relative to SEA_LEVEL (metres). */
  height: number;
  /** Horizontal Gerstner surge displacement (metres). */
  dx: number;
  dz: number;
  /** Unit surface normal [nx, ny, nz] matching the rendered ocean wave slope. */
  normal: [number, number, number];
  /** Vertical wave velocity d(height)/dt (m/s). */
  velocityY: number;
  /** Base sea level (metres). */
  seaLevel: number;
}

/**
 * Shared 6-component directional Gerstner swell spectrum evaluated identically in OCEAN_VERT (GPU)
 * and sampleOceanWaveAt (CPU) so the slime, skiff boat, fishing bobber & camera waterline track
 * the rendered waves within < 3 cm with zero GPU readback stalls.
 * Tuple: [dirX, dirZ, wavelength(m), amplitude(m), steepness, speedMult].
 */
export const OCEAN_GERSTNER_WAVES: readonly [number, number, number, number, number, number][] = [
  [ 0.84,  0.54, 46.0, 0.145, 0.34, 1.00],
  [-0.42,  0.91, 31.0, 0.105, 0.30, 1.04],
  [ 0.96, -0.28, 22.0, 0.072, 0.28, 1.08],
  [-0.78, -0.62, 16.5, 0.048, 0.24, 1.12],
  [ 0.25, -0.97, 11.8, 0.032, 0.22, 1.16],
  [-0.92,  0.39,  8.4, 0.045, 0.24, 1.20],
  [ 0.78,  0.63,  4.7, 0.067, 0.30, 1.03],
  [ 0.91, -0.41,  2.3, 0.031, 0.25, 0.96],
];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstepCPU = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Bilinear sample of IslandSDFData channel R (signed distance offshore in metres) and B (dBox). */
export function sampleIslandSDFCPU(sdf: IslandSDFData | null, x: number, z: number): {shoreDist: number; dBox: number} {
  if (!sdf) return {shoreDist: 120, dBox: 120};
  const u = (x - sdf.minX) * sdf.bounds.z;
  const v = (z - sdf.minZ) * sdf.bounds.w;
  if (u <= 0.002 || u >= 0.998 || v <= 0.002 || v >= 0.998) return {shoreDist: 120, dBox: 120};
  const n = sdf.size;
  const gx = u * (n - 1), gz = v * (n - 1);
  const i0 = Math.max(0, Math.min(n - 2, Math.floor(gx)));
  const j0 = Math.max(0, Math.min(n - 2, Math.floor(gz)));
  const tx = gx - i0, tz = gz - j0;
  const at = (i: number, j: number, ch: number) => sdf.data[(i + j * n) * 4 + ch];
  const lerp2 = (ch: number) =>
    (at(i0, j0, ch) * (1 - tx) + at(i0 + 1, j0, ch) * tx) * (1 - tz) +
    (at(i0, j0 + 1, ch) * (1 - tx) + at(i0 + 1, j0 + 1, ch) * tx) * tz;
  return {shoreDist: lerp2(0), dBox: lerp2(2)};
}

function evalGerstnerRaw(x: number, z: number, time: number, windScale: number, shoreDamp: number) {
  const g = 9.81;
  const ampScale = windScale * (0.18 + 0.82 * shoreDamp);
  const horizScale = windScale * shoreDamp * 0.85;
  let dx = 0, dy = 0, dz = 0, dhdx = 0, dhdz = 0, vy = 0;
  for (let i = 0; i < OCEAN_GERSTNER_WAVES.length; i++) {
    const [wx, wz, L, baseAmp, steep, spd] = OCEAN_GERSTNER_WAVES[i];
    const k = (2 * Math.PI) / L;
    const omega = Math.sqrt(g * k) * spd;
    const amp = baseAmp * ampScale;
    const hAmp = baseAmp * steep * horizScale;
    const phase = k * (wx * x + wz * z) - omega * time;
    const s = Math.sin(phase);
    const c = Math.cos(phase);
    dx -= wx * hAmp * s;
    dz -= wz * hAmp * s;
    dy += amp * c;
    // Partial derivatives of height w.r.t. x, z and t
    dhdx -= wx * k * amp * s;
    dhdz -= wz * k * amp * s;
    vy += amp * omega * s;
  }
  return {dx, dy, dz, dhdx, dhdz, vy};
}

/** Pure CPU wave height, surface normal & vertical velocity matching the GPU ocean vertex shader. */
export function sampleOceanWaveAt(
  x: number,
  z: number,
  time: number,
  windNorm = 0.5,
  sdf: IslandSDFData | null = null,
  sailing = false,
  islandDistance = Infinity,
): OceanWaveSample {
  const {shoreDist} = sampleIslandSDFCPU(sdf, x, z);
  const shoreDamp = smoothstepCPU(-0.5, 16.0, Math.min(shoreDist,islandDistance));
  const windScale = 0.72 + 0.52 * clamp01(windNorm);
  // One-step fixed-point inversion compensates for horizontal Gerstner crest shift
  const p0 = evalGerstnerRaw(x, z, time, windScale, shoreDamp);
  const p1 = evalGerstnerRaw(x - p0.dx, z - p0.dz, time, windScale, shoreDamp);
  if(sailing){
    const chop=voyageChop(x,z,time), amount=windScale*(.20+.80*shoreDamp);
    p1.dy+=chop.height*amount;p1.dhdx+=chop.slopeX*amount;p1.dhdz+=chop.slopeZ*amount;p1.vy+=chop.velocity*amount;
  }
  const invLen = 1 / Math.hypot(p1.dhdx, 1, p1.dhdz);
  return {
    height: p1.dy,
    dx: p1.dx,
    dz: p1.dz,
    normal: [-p1.dhdx * invLen, invLen, -p1.dhdz * invLen],
    velocityY: p1.vy,
    seaLevel: SEA_LEVEL,
  };
}

const GERSTNER_GLSL = OCEAN_GERSTNER_WAVES.map(
  ([wx, wz, L, amp, steep, spd], i) => {
    const k = (2 * Math.PI) / L;
    const omega = Math.sqrt(9.81 * k) * spd;
    return `  {
    float k = ${k.toFixed(6)}, om = ${omega.toFixed(6)};
    float a = ${(amp).toFixed(5)} * ampScale;
    float ha = ${(amp * steep).toFixed(5)} * horizScale;
    vec2 dir = vec2(${wx.toFixed(4)}, ${wz.toFixed(4)});
    float ph = k * dot(dir, p) - om * t;
    float s = sin(ph), c = cos(ph);
    gDisp.xz -= dir * (ha * s);
    gDisp.y += a * c;
    gSlope -= dir * (k * a * s);
  }`;
  },
).join('\n');

const FULLSCREEN_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

/**
 * Pure Stockham radix-2 auto-sort IFFT index formula (also unit-tested in TypeScript).
 * Stage s in [0..log2(N)-1], stride = 1 << s, block = stride * 2.
 */
export function stockhamButterflyIndices(k: number, stage: number, N: number): {p: number; q: number; angle: number; sign: number} {
  const stride = 1 << stage;
  const block = stride << 1;
  const kMod = k % stride;
  const group = Math.floor(k / block);
  const p = group * stride + kMod;
  const q = p + (N >> 1);
  const angle = (2 * Math.PI * kMod) / block;
  const sign = k % block < stride ? 1 : -1;
  return {p, q, angle, sign};
}

/** Deterministic Box-Muller Gaussian RNG for reproducible JONSWAP initial wave spectrum. */
function makeGaussian(seed: number) {
  let s = seed | 0;
  const next = () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return ((s >>> 0) + 1) / 4294967297;
  };
  return (): [number, number] => {
    const u1 = Math.max(1e-6, next());
    const u2 = next();
    const r = Math.sqrt(-2 * Math.log(u1));
    return [r * Math.cos(2 * Math.PI * u2), r * Math.sin(2 * Math.PI * u2)];
  };
}

/**
 * Generates JONSWAP + directional spreading initial complex spectrum H0(k) and H0*(-k)
 * packed into RGBA Float/HalfFloat texture (RG = H0(k), BA = conj(H0(-k))).
 */
function buildJONSWAPSpectrum(N: number, patchLength: number, windSpeed: number, windAngle: number, seed: number): Float32Array {
  const g = 9.81;
  const fetch = 110000;
  const u10 = Math.max(3.5, windSpeed);
  const alpha = 0.076 * Math.pow((u10 * u10) / (fetch * g), 0.22);
  const omegaP = 22 * Math.pow((g * g) / (u10 * fetch), 1 / 3);
  const wx = Math.cos(windAngle);
  const wz = Math.sin(windAngle);
  const dk = (2 * Math.PI) / patchLength;
  const gauss = makeGaussian(seed);

  const rawRe = new Float32Array(N * N);
  const rawIm = new Float32Array(N * N);

  for (let j = 0; j < N; j++) {
    const kz = (j < N / 2 ? j : j - N) * dk;
    for (let i = 0; i < N; i++) {
      const kx = (i < N / 2 ? i : i - N) * dk;
      const k = Math.hypot(kx, kz);
      const idx = i + j * N;
      if (k < 1e-4) {
        rawRe[idx] = 0;
        rawIm[idx] = 0;
        continue;
      }
      const omega = Math.sqrt(g * k);
      const sigma = omega <= omegaP ? 0.07 : 0.09;
      const rPeak = Math.exp(-0.5 * Math.pow((omega - omegaP) / (sigma * omegaP), 2));
      const jonswap =
        ((alpha * g * g) / Math.pow(omega, 5)) *
        Math.exp(-1.25 * Math.pow(omegaP / omega, 4)) *
        Math.pow(3.3, rPeak);

      // Directional spreading + capillary high-k damping
      const kDotW = (kx * wx + kz * wz) / k;
      const dirSpread = Math.max(0.06, Math.pow(Math.max(0, kDotW * 0.5 + 0.5), 3.0));
      const smallCap = Math.exp(-k * k * 0.018);
      // Convert S(omega) -> 2D wave-number spectrum amplitude * sqrt(dk^2), scaled for calm-to-breezy island seas
      const dOmegaDk = 0.5 * Math.sqrt(g / k);
      const energy = Math.max(0, jonswap * dOmegaDk * (1 / k) * dirSpread * smallCap);
      const amp = Math.sqrt(0.5 * energy) * dk * 0.44;

      const [gr, gi] = gauss();
      rawRe[idx] = gr * amp;
      rawIm[idx] = gi * amp;
    }
  }

  const out = new Float32Array(N * N * 4);
  for (let j = 0; j < N; j++) {
    const mj = (N - j) % N;
    for (let i = 0; i < N; i++) {
      const mi = (N - i) % N;
      const idx = i + j * N;
      const midx = mi + mj * N;
      out[idx * 4] = rawRe[idx];
      out[idx * 4 + 1] = rawIm[idx];
      out[idx * 4 + 2] = rawRe[midx];
      out[idx * 4 + 3] = -rawIm[midx];
    }
  }
  return out;
}

const TIME_EVOLVE_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tH0;
uniform float uTime;
uniform float uN;
uniform float uPatchLength;
layout(location = 0) out highp vec4 oYX; // (Hy, Hdx)
layout(location = 1) out highp vec4 oZ;  // (Hdz, 0)

const float PI = 3.14159265359;
const float G = 9.81;

vec2 cmul(vec2 a, vec2 b) {
  return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

void main() {
  vec2 coord = floor(vUv * uN);
  float kx = (coord.x < uN * 0.5 ? coord.x : coord.x - uN) * (2.0 * PI / uPatchLength);
  float kz = (coord.y < uN * 0.5 ? coord.y : coord.y - uN) * (2.0 * PI / uPatchLength);
  float k = length(vec2(kx, kz));
  float omega = sqrt(G * max(k, 1e-4));

  vec4 h0 = texture2D(tH0, vUv);
  float phase = omega * uTime;
  float c = cos(phase);
  float s = sin(phase);
  vec2 expPos = vec2(c, s);
  vec2 expNeg = vec2(c, -s);
  vec2 h = cmul(h0.xy, expPos) + cmul(h0.zw, expNeg);

  // Horizontal choppy displacement spectra: Dx = -i * (kx/k) * h, Dz = -i * (kz/k) * h
  // -i * (a + ib) = (b, -a)
  float invK = k > 1e-4 ? 1.0 / k : 0.0;
  vec2 ih = vec2(h.y, -h.x);
  oYX = vec4(h, ih * (kx * invK));
  oZ = vec4(ih * (kz * invK), 0.0, 0.0);
}`;

const STOCKHAM_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tInputA;
uniform sampler2D tInputB;
uniform float uN;
uniform float uStride;
uniform float uAxis; // 0 = horizontal, 1 = vertical
layout(location = 0) out highp vec4 oA;
layout(location = 1) out highp vec4 oB;

const float PI = 3.14159265359;

vec2 cmul(vec2 a, vec2 b) {
  return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

void main() {
  vec2 coord = floor(vUv * uN);
  float k = uAxis < 0.5 ? coord.x : coord.y;
  float block = uStride * 2.0;
  float kMod = mod(k, uStride);
  float group = floor(k / block);
  float p = group * uStride + kMod;
  float q = p + uN * 0.5;

  vec2 uvP = uAxis < 0.5 ? vec2((p + 0.5) / uN, vUv.y) : vec2(vUv.x, (p + 0.5) / uN);
  vec2 uvQ = uAxis < 0.5 ? vec2((q + 0.5) / uN, vUv.y) : vec2(vUv.x, (q + 0.5) / uN);

  float angle = 2.0 * PI * kMod / block;
  vec2 w = vec2(cos(angle), sin(angle));
  float sgn = mod(k, block) < uStride ? 1.0 : -1.0;

  // Both spectra (YX and Z) share the butterfly; each MRT output carries one
  vec4 a = texture2D(tInputA, uvP);
  vec4 b = texture2D(tInputA, uvQ);
  oA = vec4(a.xy + sgn * cmul(w, b.xy), a.zw + sgn * cmul(w, b.zw));
  a = texture2D(tInputB, uvP);
  b = texture2D(tInputB, uvQ);
  oB = vec4(a.xy + sgn * cmul(w, b.xy), a.zw + sgn * cmul(w, b.zw));
}`;

const ASSEMBLE_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tDispYX;
uniform sampler2D tDispZ;
uniform float uN;
uniform float uPatchLength;
uniform float uChoppiness;
layout(location = 0) out highp vec4 oDisp;   // (dx, dy, dz, J)
layout(location = 1) out highp vec4 oNormal; // (nx, nz, steepness, foam)

vec3 sampleDisp(vec2 uv) {
  vec4 yx = texture2D(tDispYX, fract(uv));
  vec4 z0 = texture2D(tDispZ, fract(uv));
  return vec3(yx.z * uChoppiness, yx.x, z0.x * uChoppiness);
}

void main() {
  float texel = 1.0 / uN;
  float worldStep = uPatchLength * texel;
  vec3 c = sampleDisp(vUv);
  vec3 px = sampleDisp(vUv + vec2(texel, 0.0));
  vec3 mx = sampleDisp(vUv - vec2(texel, 0.0));
  vec3 pz = sampleDisp(vUv + vec2(0.0, texel));
  vec3 mz = sampleDisp(vUv - vec2(0.0, texel));

  vec3 dX = (px - mx) / (2.0 * worldStep);
  vec3 dZ = (pz - mz) / (2.0 * worldStep);

  float jxx = 1.0 + dX.x;
  float jzz = 1.0 + dZ.z;
  float jxz = dZ.x;
  float jzx = dX.z;
  float jacobian = jxx * jzz - jxz * jzx;

  oDisp = vec4(c, jacobian);
  vec3 tx = vec3(1.0 + dX.x, dX.y, dX.z);
  vec3 tz = vec3(dZ.x, dZ.y, 1.0 + dZ.z);
  vec3 n = normalize(cross(tz, tx));
  float foam = clamp(1.0 - jacobian * 1.15, 0.0, 1.0);
  oNormal = vec4(n.x, n.z, max(0.0, 1.0 - n.y), foam);
}`;

interface FFTCascade {
  size: number;
  patchLength: number;
  h0Tex: THREE.DataTexture;
  /** MRT ping-pong pair: textures[0] = YX spectrum, textures[1] = Z spectrum. */
  ping: THREE.WebGLRenderTarget;
  pong: THREE.WebGLRenderTarget;
  /** MRT output: textures[0] = displacement + Jacobian, textures[1] = normal + foam (mipmapped). */
  out: THREE.WebGLRenderTarget;
  lastWind: number;
}

// One table lookup per vertex / fragment. Each streamed 384 m cell has at most one island.
const OFFSHORE_GLSL = `
uniform vec4 uIslands[25];
uniform vec2 uIslandOrigin;
vec3 islandShelf(vec2 p){
  ivec2 cell=ivec2(floor(p/384.)-uIslandOrigin);
  if(any(lessThan(cell,ivec2(0))) || any(greaterThan(cell,ivec2(4))))return vec3(10000.,0.,0.);
  vec4 i=uIslands[cell.y*5+cell.x];
  if(i.z==0.)return vec3(10000.,0.,0.);
  vec2 v=(p-i.xy)/i.z;
  float kind=floor(i.w), a=atan(v.y,v.x)+fract(i.w)*8.;
  float r=length(v*vec2(kind==0.?.76:1.,1.))/(1.+.12*sin(3.*a)+.08*cos(5.*a));
  float h=(1.-r)*(kind==1.?7.:3.6);
  if(kind==2.)h=min(h,(r-.41)*7.+sin(a)*.42);
  float distanceToShore=-h*i.z/(kind==1.?7.:3.6);
  float d=length(p-i.xy);
  float shelfDepth=max(0.,min(14.5,-h+max(0.,r-1.15)*8.));
  // The island mounts blend into the regional seabed outside 1.6 radii.
  float column=mix(shelfDepth,48.,smoothstep(i.z*1.6,80.,d));
  return vec3(distanceToShore,column,1.-smoothstep(65.,80.,d));
}`;
const OCEAN_VERT = `
${WAKE_SAMPLE}
uniform vec3 uCamCenter;
uniform float uSeaLevel;
uniform float uTime;
uniform float uWindScale;
uniform float uUseFFT;
uniform float uCascades;
uniform float uChoppiness;
uniform sampler2D tDisp0;
uniform sampler2D tDisp1;
${OFFSHORE_GLSL}
uniform sampler2D tIslandSDF;
uniform vec4 uIslandBounds;
uniform float uL0;
uniform float uL1;

varying vec3 vWorldPos;
varying vec4 vScreenPos;
varying float vWaveCrest;
varying float vDist;
varying vec2 vSwellSlope;

void evalGerstnerSwell(vec2 p, float t, float windScale, float shoreDamp, out vec3 gDisp, out vec2 gSlope) {
  float ampScale = windScale * (0.18 + 0.82 * shoreDamp);
  float horizScale = windScale * shoreDamp * 0.85;
  gDisp = vec3(0.0);
  gSlope = vec2(0.0);
${GERSTNER_GLSL}
}

void main() {
  vec3 world = vec3(position.x + uCamCenter.x, uSeaLevel, position.z + uCamCenter.z);
  float dist = length(world.xz - cameraPosition.xz);
  vDist = dist;

  // Sample island SDF to damp waves smoothly as they enter shallow water & shore
  vec2 sdfUV = (world.xz - uIslandBounds.xy) * uIslandBounds.zw;
  float inBounds = step(0.002, sdfUV.x) * step(sdfUV.x, 0.998) * step(0.002, sdfUV.y) * step(sdfUV.y, 0.998);
  vec4 sdf = inBounds > 0.5 ? texture2D(tIslandSDF, sdfUV) : vec4(120.0, -15.0, 120.0, 0.0);
  sdf.x=min(sdf.x,islandShelf(world.xz).x);
  float shoreDamp = smoothstep(-0.5, 16.0, sdf.x);
  float farFade = 1.0 - smoothstep(450.0, 1800.0, dist);

  // Shared 6-wave directional Gerstner swell (100% synced with CPU buoyancy & boat/slime rocking)
  vec3 gDisp;
  vec2 gSlope;
  evalGerstnerSwell(world.xz, uTime, uWindScale, shoreDamp, gDisp, gSlope);
  gDisp *= farFade;
  gSlope *= farFade;

  // FFT provides sub-grid slope and breaking foam. Keep geometric crests on the buoyancy field.
  vec3 disp = gDisp;
  world += disp;
  if(uWakeOn>.5){
    float chop=voyageChopAt(world.xz,uTime).x*uWindScale*(.2+.8*shoreDamp)*farFade;
    disp.y+=chop;world.y+=chop+voyageHeight(voyageField(world.xz));
  }

  vWorldPos = world;
  vWaveCrest = disp.y;
  vSwellSlope = gSlope;
  vec4 clip = projectionMatrix * viewMatrix * vec4(world, 1.0);
  vScreenPos = clip;
  gl_Position = clip;
}`;

const OCEAN_FRAG = /* glsl */ `
${WAKE_SAMPLE}
precision highp float;
${WATER_COMMON_GLSL}
${OCEAN_CAUSTICS_GLSL}
uniform sampler2D tOceanFoam;
uniform sampler2D tNorm0;
uniform sampler2D tNorm1;
${OFFSHORE_GLSL}
uniform sampler2D tIslandSDF;
uniform vec4 uIslandBounds;
uniform vec3 uAbsorbRGB;
uniform float uScatterIntensity;
uniform float uFoamStrength;
uniform float uGlintStrength;
uniform float uTime;
uniform float uStorminess;
uniform float uSeaLevel;
uniform float uUseFFT;
uniform float uCascades;
uniform float uL0;
uniform float uL1;
uniform float uCloudCover;
uniform float uWindScale;

varying vec3 vWorldPos;
varying vec4 vScreenPos;
varying float vWaveCrest;
varying float vDist;
varying vec2 vSwellSlope;

void main() {
  // Island SDF: x = metres offshore, y = seabed height, z = owned-land box distance
  vec2 sdfUV = (vWorldPos.xz - uIslandBounds.xy) * uIslandBounds.zw;
  float inBounds = step(0.002, sdfUV.x) * step(sdfUV.x, 0.998) * step(0.002, sdfUV.y) * step(sdfUV.y, 0.998);
  vec4 sdf = inBounds > 0.5 ? texture2D(tIslandSDF, sdfUV) : vec4(120.0, -15.0, 120.0, 0.0);
  vec3 bathymetry=islandShelf(vWorldPos.xz);
  sdf.x=min(sdf.x,bathymetry.x);
  // Inland river and lake own their area; the sea never overlaps them
  if (inBounds > 0.5 && sdf.z < -0.15) discard;

  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uSunDir);
  float light = 0.085 + 0.915 * uDaylight;

  // Swell from Gerstner + FFT cascades; capillaries from mipmapped detail maps. Both settle with distance.
  vec2 slope = -vSwellSlope * 0.85;
  float crest = 0.0;
  if (uUseFFT > 0.5) {
    vec4 n0 = texture2D(tNorm0, vWorldPos.xz / uL0);
    slope += n0.xy * 0.55;
    crest = n0.w * 0.25;
    if (uCascades > 1.5) {
      float f1 = 1.0 - smoothstep(120.0, 420.0, vDist);
      vec4 n1 = texture2D(tNorm1, vWorldPos.xz / uL1);
      slope += n1.xy * 0.50 * f1;
      crest = max(crest, n1.w * 0.95 * f1);
    }
  } else {
    vec2 p = vWorldPos.xz;
    slope.x += 0.05 * cos(p.x * 0.21 + p.y * 0.14 + uTime * 1.4);
    slope.y += 0.04 * cos(p.y * 0.24 - p.x * 0.12 + uTime * 1.6);
  }
  float nearField = 1.0 - smoothstep(25.0, 220.0, vDist);
  slope += wDetailSlope(vWorldPos.xz * 0.7, vec2(0.6, 0.35), uTime) * (0.22 + 0.13 * uStorminess) * nearField;
  // Short travelling wavelets fill the space between the large swell and the capillary glints.
  slope += wDetailSlope(vWorldPos.xz * 2.8, vec2(-.16,.28), uTime * .8)
        * (.045 + .060 * uStorminess) * nearField;
  slope *= mix(0.55, 1.0, smoothstep(0.0, 10.0, sdf.x));
  slope /= 1.0 + vDist * 0.0025;
  vec4 wake = voyageField(vWorldPos.xz);
  if(uWakeOn>.5){
    vec3 shortWind=voyageChopAt(vWorldPos.xz,uTime);
    slope-=shortWind.yz*uWindScale*(.20+.80*smoothstep(-.5,16.,sdf.x))*(1.-smoothstep(250.,1200.,vDist));
    vec2 e=vec2(.27,0.);
    if(dot(wake,vec4(1.))>.002){
      slope-=vec2(voyageHeight(voyageField(vWorldPos.xz+e))-voyageHeight(voyageField(vWorldPos.xz-e)),
                  voyageHeight(voyageField(vWorldPos.xz+e.yx))-voyageHeight(voyageField(vWorldPos.xz-e.yx)))/(.54);
    }
  }
  {
    // Wind-aligned capillary ridges break the long sky reflection into short glints.
    vec2 wind=vec2(.85,.53),crossWind=vec2(-wind.y,wind.x);
    vec2 ripple=vec2(dot(vWorldPos.xz,wind),dot(vWorldPos.xz,crossWind));
    float lod=1.-smoothstep(.08,.45,max(fwidth(ripple.x),fwidth(ripple.y)));
    float modulation=2.8*sin(dot(vWorldPos.xz,vec2(.54,-1.13))+uTime*.87)+1.7*sin(ripple.y*2.3+uTime*.8);
    slope+=wind*(sin(ripple.x*9.1+ripple.y*1.8+modulation-uTime*3.6)+.47*sin(ripple.x*17.8-ripple.y*2.4-modulation-uTime*5.1))
             *(.026+.046*uStorminess)*lod*(1.-wake.g*.5);
  }
  float oceanRainSplash = 0.0;
  float oceanRainRing = 0.0;
  if (uRain > 0.01) {
    float rainLod = 1.0 - smoothstep(0.10, 0.44, max(fwidth(vWorldPos.x), fwidth(vWorldPos.z)));
    float rainFade = (1.0 - smoothstep(18.0, 72.0, vDist)) * rainLod;
    if (rainFade > 0.01) {
      float e = 0.048;
      float r0 = rainRings(vWorldPos.xz, uTime);
      vec2 rGrad = vec2(rainRings(vWorldPos.xz + vec2(e, 0.0), uTime) - r0, rainRings(vWorldPos.xz + vec2(0.0, e), uTime) - r0);
      slope += rGrad * 1.25 * uRain * rainFade;
      oceanRainRing = r0 * uRain * rainFade;
      oceanRainSplash = wRainSplash(vWorldPos.xz, uTime) * uRain * rainFade;
    }
  }
  vec3 N = normalize(vec3(slope.x, 1.0, slope.y));
  float meniscus=1.-smoothstep(uNear,uNear+.075,vScreenPos.w);
  N=normalize(N+meniscus*.63*vec3(V.x,0.,V.z));

  // Seen from below: Snell's window onto the sky, teal total internal reflection outside it
  if (!gl_FrontFacing) {
    float cosTheta = max(dot(-N, V), 0.0);
    float critical = sqrt(1.-1./(1.333*1.333));
    float snell = smoothstep(critical-.018,critical+.018,cosTheta);
    vec3 transmitted = refract(-V, -N, 1.333);
    vec3 skyDir = length(transmitted) > .001 ? normalize(transmitted) : reflect(-V,-N);
    vec2 screen = vScreenPos.xy / vScreenPos.w * .5 + .5;
    vec2 margin = min(screen,1.-screen);
    float edge = smoothstep(0.,.04,min(margin.x,margin.y));
    vec2 lookup = clamp(screen + (mat3(viewMatrix)*N).xy*.024*edge,.001,.999);
    float objectDepth = texture2D(tOpaqueDepth,lookup).x;
    vec3 snellCol = wSky(skyDir) * (0.72 + 0.28 * uDaylight)
      + uSunColor * pow(max(dot(-V, L), 0.0), 16.0) * 1.6 * uDaylight * smoothstep(-0.04, 0.12, L.y);
    if(objectDepth<.999999 && objectDepth>gl_FragCoord.z) snellCol=texture2D(tOpaqueColor,lookup).rgb;
    vec3 reflected=reflect(-V,-N);
    vec3 vp=(viewMatrix*vec4(vWorldPos,1.)).xyz;
    vec4 bedHit=wTraceSSR(vp,mat3(viewMatrix)*reflected,gl_FragCoord.xy);
    float down=clamp(-reflected.y,0.,1.);
    vec3 tirCol=mix(vec3(.007,.052,.080),vec3(.045,.22,.23),down) * light;
    tirCol=mix(tirCol,bedHit.rgb*vec3(.32,.68,.74),bedHit.a*.7);
    float scatter=pow(max(0.,dot(N,normalize(L+vec3(.1,.28,.1)))),4.);
    tirCol+=uSunColor*vec3(.035,.11,.085)*scatter*(1.-uStorminess)*uDaylight;
    gl_FragColor = vec4(mix(tirCol, snellCol, snell), 0.92 * smoothstep(0.0, 1.2, sdf.x + 1.0));
    return;
  }

  float ndv = max(dot(N, V), 0.001);

  // Water depth: real opaque copy near the camera, analytic seabed from the SDF further out
  vec2 suv = vScreenPos.xy / vScreenPos.w * 0.5 + 0.5;
  float rawD = texture2D(tOpaqueDepth, suv).x;
  float waterZ = wLinearDepth(gl_FragCoord.z);
  float sceneZ = wLinearDepth(rawD);
  float hasBed = step(rawD, 0.999999) * step(waterZ, sceneZ);
  float thick = mix(1e3, sceneZ - waterZ, hasBed);
  float analytic = max(0.0, vWorldPos.y - sdf.y);
  float nearBlend = 1.0 - smoothstep(140.0, 360.0, vDist);
  float depth = mix(analytic, min(thick * clamp(V.y, 0.08, 1.0), (inBounds > .5 ? analytic + 4.0 : 2000.0)), hasBed * nearBlend);
  // A grazing screen ray can jump from the shelf silhouette to the distant seabed
  // in a single pixel. Use the local water column for the offshore colour gradient.
  // Shallow foreground hits still use the captured depth (hull, rocks, swimmers).
  float nearObject=(1.-smoothstep(.15,1.25,depth))*smoothstep(2.,6.,bathymetry.y);
  float shelfWeight=bathymetry.z*(1.-nearObject);
  depth=mix(depth,bathymetry.y,shelfWeight);
  float path = depth / clamp(V.y, 0.12, 1.0);

  // Refracted bed, guarded against pulling in objects above the surface
  vec2 edgeDist=min(suv,1.-suv);
  float edgeWeight=smoothstep(0.,.04,min(edgeDist.x,edgeDist.y));
  vec3 downRay=refract(-V,vec3(0.,1.,0.),1./1.333);
  vec3 shelfHit=vWorldPos+downRay*min(32.,bathymetry.y/max(.1,-downRay.y));
  vec4 projected=uProj*viewMatrix*vec4(shelfHit,1.);
  vec2 shelfUV=projected.xy/max(.001,projected.w)*.5+.5;
  vec2 shelfMargin=min(shelfUV,1.-shelfUV);
  vec2 entryUv=mix(suv,shelfUV,shelfWeight*edgeWeight*smoothstep(0.,.06,min(shelfMargin.x,shelfMargin.y)));
  vec2 ruv = clamp(entryUv + edgeWeight*(mat3(viewMatrix)*N).xy * min(0.03, 0.004 + depth * 0.004), vec2(0.002), vec2(0.998));
  if (wLinearDepth(texture2D(tOpaqueDepth, ruv).x) < waterZ) ruv = suv;
  vec3 bed = mix(wBand(0.0) * 0.45 * light, texture2D(tOpaqueColor, ruv).rgb, hasBed);

  float cloudSun = uUseClouds > .5 ? oceanSunTransmission(tCloudPano, vWorldPos, cameraPosition, L) : 1.;
  // Reconstruct the receiver at the refracted UV, so the net stays attached to the bed.
  float receiverDepth = texture2D(tOpaqueDepth, ruv).r;
  if (hasBed > 0.5 && receiverDepth < 0.999999) {
    vec4 receiverView = uInvProj * vec4(ruv * 2.0 - 1.0, receiverDepth * 2.0 - 1.0, 1.0);
    vec3 receiver = cameraPosition + transpose(mat3(viewMatrix)) * (receiverView.xyz / receiverView.w);
    float submersion = max(0., uSeaLevel - receiver.y);
    vec3 focus = oceanCaustics(receiver, L, uSeaLevel, uTime, uDaylight, uStorminess);
    bed = lightSeabed(bed, focus * mix(.22,1.,cloudSun), submersion, L.y);
  }

  // Beer absorption towards the depth band (OKLab stops: sand, turquoise shelf, reef blue, ultramarine)
  vec3 trans = exp(-uAbsorbRGB * path);
  vec3 body = wBand(depth) * light * (0.6 + 0.4 * max(L.y, 0.0)) * (1.0 - 0.35 * uStorminess);
  // Offshore troughs take their colour from sky irradiance. Backlit wave faces scatter green light.
  float pelagic=smoothstep(3.5,13.5,depth);
  float faceLight=pow(max(dot(V,normalize(vec3(-L.x,.18,-L.z))),0.),3.)
                 *smoothstep(-.09,.32,vWaveCrest)*(.45+.55*(1.-max(dot(N,L),0.)));
  // Group the broad swell into the same jade lights and blue shadows as the harbor water.
  float waveLight = smoothstep(-.12, .22, vWaveCrest + dot(vSwellSlope, L.xz) * .48);
  vec3 shelf = mix(vec3(.022,.24,.25), vec3(.065,.45,.36), waveLight);
  vec3 offshore = mix(vec3(.012,.089,.135), vec3(.029,.22,.235), waveLight);
  vec3 paintedBody = mix(shelf, offshore, pelagic) * light * (1.0 - .36 * uStorminess);
  body = mix(body, paintedBody, mix(.53,.85,pelagic));
  body += vec3(.022,.092,.073) * faceLight * uSunColor * light;
  body=mix(body,vec3(.067,.27,.24)*(.42+.65*light)+.036*uSunColor,wake.g*.76);
  // At the drop-off the sampled receiver may be the far basin rather than
  // local sand. Its silhouette should disappear into the water's scattering.
  bed=mix(bed,body,shelfWeight*smoothstep(2.,10.,depth));
  vec3 refr = bed * trans + body * (1.0 - trans);

  // Light through wave crests
  float back = pow(max(dot(V, -L + N * 0.45), 0.0), 3.5);
  float crestF = smoothstep(-0.04, 0.32, vWaveCrest) + 0.15 * (1.0 - ndv);
  refr += wBand(3.0) * uSunColor * (back * 0.7 + 0.12 * max(L.y, 0.0)) * crestF * uScatterIntensity * uDaylight * 0.6;

  // Reflection: shared mirror (island, boat, slime), then sky LUT + cloud panorama
  vec3 R = reflect(-V, N);
  vec3 refl = wSky(R) * (1.0 - 0.25 * uStorminess);
  vec4 hit=wTraceSSR((viewMatrix*vec4(vWorldPos,1.)).xyz,mat3(viewMatrix)*R,gl_FragCoord.xy);
  refl=mix(refl,hit.rgb,hit.a);
  vec4 planar = wPlanar(vWorldPos, uSeaLevel, N.xz * mix(0.012, 0.04, smoothstep(2.0, 40.0, vDist)));
  refl = mix(refl, planar.rgb, planar.a * (1.0 - smoothstep(160.0, 420.0, vDist)));
  float F = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
  float wakeRough=clamp(.58*wake.r+.25*wake.g,0.,.8);
  F *= 1.-wakeRough*.6;
  // Keep reflected clouds visible while allowing the local water palette to show at grazing angles.
  vec3 col = mix(refr, refl, F * .76);
  if(pelagic>.01){
    // Sky-facing facets pick up the horizon, opposing facets retain the deeper water colour.
    float facing=clamp(dot(N,normalize(vec3(-L.x,.32,-L.z))),0.,1.);
    col*=1.-pelagic*.32*(1.-facing);
    col+=vec3(.008,.038,.039)*pelagic*facing*light;
  }

  // Sun & moon reflection: broad sheen widening with distance, thresholded sparkles up close
  float rough = mix(0.045, 0.20, smoothstep(30.0, 900.0, vDist)) + uStorminess * 0.12;
  rough+=wakeRough*.22;
  float sparkleMask = (1.0 - smoothstep(60.0, 380.0, vDist)) * (1.0 - uStorminess);
  vec3 sheen = wSun(N, V, L, rough, sparkleMask) * uGlintStrength;
  col += sheen / (1.0 + sheen * .46);
  float nightMask = 1.0 - smoothstep(0.02, 0.34, uDaylight);
  if (nightMask > 0.01 && -L.y > -0.02) {
    vec3 moonL = normalize(-L);
    vec3 moonH = normalize(moonL + V);
    float mNdh = max(dot(N, moonH), 0.0);
    float mRough = rough + 0.035;
    float ma2 = mRough * mRough;
    float mDen = mNdh * mNdh * (ma2 - 1.0) + 1.0;
    float mD = ma2 / max(W_PI * mDen * mDen, 1e-5);
    float mSparkle = smoothstep(0.62, 1.0, pow(mNdh, 1100.0)) * (1.0 - smoothstep(60.0, 340.0, vDist)) * (1.0 - uStorminess * 0.85);
    float moonVis = smoothstep(-0.02, 0.08, moonL.y) * (1.0 - 0.75 * uStorminess) * nightMask;
    vec3 moonGlint = vec3(0.58, 0.74, 0.96) * (mD * 0.016 + mSparkle * 1.15) * moonVis;
    col += moonGlint / (1.0 + moonGlint * 0.6);
  }
  if (oceanRainSplash > 0.001 || oceanRainRing > 0.001) {
    vec3 splashCol = mix(vec3(0.18, 0.32, 0.48), vec3(0.76, 0.88, 0.94), uDaylight);
    col += splashCol * (oceanRainSplash * 0.78 + oceanRainRing * 0.24);
  }

  // Crisp high-frequency seafoam lace & tight organic shoreline surf (no stretched low-res white patches)
  vec2 fuvMid = vWorldPos.xz * 0.36;
  vec2 fuvFine = vWorldPos.xz * 1.20;
  vec3 foamA = texture2D(tFoam, fuvMid + vec2(uTime * 0.014, -uTime * 0.011)).rgb;
  vec3 foamB = texture2D(tFoam, mat2(0.82, 0.57, -0.57, 0.82) * fuvMid * 1.95 - vec2(uTime * 0.018, uTime * 0.013)).rgb;
  float microFizz = texture2D(tFoam, fuvFine + vec2(-uTime * 0.022, uTime * 0.016)).b;
  float microFade = 1.0 - smoothstep(18.0, 95.0, vDist);
  float wispy = foamA.r * 0.55 + foamB.r * 0.45;
  float fizz = mix(foamA.b * 0.5 + foamB.b * 0.5, microFizz, 0.55 * microFade);
  float soft = foamA.g;
  // High-resolution lace filaments from tOceanFoam at 4x finer world scale (2.1m & 1.05m tiles)
  vec2 laceUv = vWorldPos.xz * 0.48 + N.xz * 0.09;
  float lace0 = texture2D(tOceanFoam, laceUv + vec2(0.022, -0.016) * uTime).r;
  float lace1 = texture2D(tOceanFoam, mat2(0.8, 0.6, -0.6, 0.8) * laceUv * 1.92 - vec2(0.014, 0.019) * uTime).r;
  float filament = clamp(lace0 * 0.62 + lace1 * 0.54, 0.0, 1.0);
  float laceMask = smoothstep(0.30, 0.80, filament * 0.78 + fizz * 0.30);

  // Tight organic coastal surf zone (0.25..3.1m offshore, strongly broken up so no parallel stripes appear)
  float surfZone = 1.0 - smoothstep(0.25, 3.1, sdf.x);
  float surfBreak = smoothstep(0.26, 0.74, foamB.g * 0.6 + wispy * 0.5);
  float front = fract(sdf.x * 0.28 + uTime * 0.15 + (soft - 0.5) * 1.15);
  float crestBand = smoothstep(0.0, 0.055, front) * (1.0 - smoothstep(0.055, 0.20, front)) * surfBreak;
  float trailVeil = smoothstep(0.06, 0.16, front) * (1.0 - smoothstep(0.16, 0.40, front)) * 0.18 * surfBreak;
  float surf = (crestBand * smoothstep(0.24, 0.72, laceMask + crestBand * 0.16) + trailVeil * laceMask * smoothstep(0.42, 0.82, fizz)) * surfZone;
  float lap = 0.012 * sin(uTime * 1.5 + soft * 6.283);
  float edgeW = 1.0 - smoothstep(0.0, 0.10 + lap, depth);
  float thinLine = (1.0 - smoothstep(0.0, 0.024, depth)) * smoothstep(0.24, 0.66, laceMask + 0.18);
  float softVeil = edgeW * edgeW * laceMask * smoothstep(0.38, 0.82, wispy * 0.6 + fizz * 0.4) * 0.42;
  float contact = max(thinLine * 0.80, softVeil) * hasBed;

  // Offshore whitecaps driven by steep fine-scale crests & broken into crisp filaments (no large blurred blobs)
  float steepGate = smoothstep(0.20, 0.54, length(slope));
  float caps = smoothstep(0.76, 0.98, crest) * steepGate * laceMask * 0.36;
  float windCap = smoothstep(0.24, 0.44, vWaveCrest) * steepGate * (0.08 + 0.34 * uStorminess) * nearField * smoothstep(0.44, 0.84, filament);
  float foam = clamp((max(surf, contact * 1.05) + caps) * uFoamStrength * (0.48 + 0.68 * laceMask) + windCap, 0.0, 1.0)
    * (1.0 - smoothstep(140.0, 480.0, vDist));
  vec3 foamCol = mix(vec3(0.78, 0.88, 0.96), vec3(0.92, 0.97, 0.94), uDaylight) * light + uSunColor * max(L.y, 0.0) * 0.10 * uDaylight;
  col = mix(col, foamCol, foam * 0.82);
  if(wake.r+wake.g>.003){
    // Two scales of cellular edges and drifting noise make thin webs around clear bubble interiors.
    vec2 flow=vWorldPos.xz+vec2(.09,-.05)*uTime+slope*.17;
    flow+=vec2(sin(flow.y*.97+uTime*.29)+.47*sin(flow.x*2.3),
               cos(flow.x*.82+uTime*.21)+.35*sin(flow.y*2.6))*.42;
    vec2 large=texture2D(tFoam,flow*.094).rg;
    vec2 small=texture2D(tFoam,mat2(.78,.63,-.63,.78)*flow*.26+large.y*.035).rg;
    vec2 fine=texture2D(tFoam,flow*.58+small.y*.09).rg;
    float web=.34*large.r+.47*small.r+.19*fine.r;
    float threshold=mix(1.0,.14,clamp(wake.r*(.57+.77*large.g),0.,1.));
    float laceCover=smoothstep(threshold-.12,threshold+.14,web);
    float thickFoam=smoothstep(.73,1.,wake.r+small.y*.18)*(.32+.54*small.y);
    float coverage=clamp(max(laceCover,thickFoam)*smoothstep(.025,.28,wake.r),0.,.95);
    vec3 ambient=wSky(vec3(0.,1.,0.))*.20+vec3(.16,.22,.24)*light;
    vec3 sunFoam=uSunColor*(.12+.43*max(dot(N,L),0.))*uDaylight;
    vec3 froth=(ambient+sunFoam)*(.79+.21*web);
    col=mix(col,vec3(.12,.31,.29)*light,wake.g*.15);
    col=mix(col,froth,coverage);
  }

  col *= mix(.85, 1., cloudSun);

  float edgeAlpha = smoothstep(0.0, 0.08, max(mix(1.0, thick, hasBed), sdf.x * 0.15));
  gl_FragColor = vec4(col, max(edgeAlpha, foam * smoothstep(0.0, 0.015, thick)));
}`;

/** Builds a camera-following polar radial CDLOD mesh spanning r = 0..2800m (38k tris). */
function buildRadialOceanGeometry(angularSegs = 180, radialRings = 110, maxRadius = 2800): THREE.BufferGeometry {
  const verts: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r <= radialRings; r++) {
    const t = r / radialRings;
    // Exponential ring spacing: ultra-dense near camera/island (~0.6m), sweeping smoothly to 2800m horizon
    const rad = t === 0 ? 0 : Math.pow(t, 2.55) * maxRadius;
    for (let a = 0; a <= angularSegs; a++) {
      const ang = (a / angularSegs) * Math.PI * 2;
      verts.push(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
    }
  }

  const stride = angularSegs + 1;
  for (let r = 0; r < radialRings; r++) {
    for (let a = 0; a < angularSegs; a++) {
      const i0 = r * stride + a;
      const i1 = i0 + 1;
      const i2 = i0 + stride;
      const i3 = i2 + 1;
      indices.push(i0, i1, i2, i1, i3, i2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(indices);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), maxRadius * 1.2);
  return geo;
}

export class OceanSystem implements OceanRenderHook {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;

  private quadScene: THREE.Scene;
  private quadCam: THREE.OrthographicCamera;
  private quadMesh: THREE.Mesh;
  private evolveMat: THREE.ShaderMaterial;
  private stockhamMat: THREE.ShaderMaterial;
  private assembleMat: THREE.ShaderMaterial;
  private cascades: FFTCascade[] = [];
  voyageWake: VoyageWake | null = null;
  setVoyageHull(id:0|1,x:number,z:number,yaw:number,speed:number){
    this.voyageWake??=new VoyageWake(this.material.uniforms.tFoam.value);
    this.voyageWake.hull(id,x,z,yaw,speed);
  }
  endVoyageWake(){
    this.voyageWake?.dispose();this.voyageWake=null;
    this.material.uniforms.uWakeOn.value=0;this.material.uniforms.tVoyageWake.value=this.dummyTex;
  }
  private fftSize = 128;
  private activeCascades = 2;
  private supportsFloatRT = false;
  private readonly patchLengths = [180, 31];
  private dummyTex: THREE.DataTexture;
  private sdfData: IslandSDFData;
  private foamMap:THREE.Texture;
  readonly causticsMap: THREE.Texture;
  private lastTime = 0;
  private lastWindNorm = 0.5;

  constructor(
    renderer: THREE.WebGLRenderer,
    water: WaterShared,
    sdf: IslandSDFData,
    params: HomeRenderParams,
  ) {
    this.supportsFloatRT =
      renderer.capabilities.isWebGL2 &&
      (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));

    this.sdfData = sdf;
    this.dummyTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
    this.dummyTex.needsUpdate = true;

    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    // GLSL3 so each pass writes two MRT outputs: 16 draws per cascade instead of 32
    this.evolveMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: TIME_EVOLVE_FRAG,
      uniforms: {
        tH0: {value: null},
        uTime: {value: 0},
        uN: {value: 128},
        uPatchLength: {value: 180},
      },
      depthTest: false,
      depthWrite: false,
    });
    this.stockhamMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: STOCKHAM_FRAG,
      uniforms: {
        tInputA: {value: null},
        tInputB: {value: null},
        uN: {value: 128},
        uStride: {value: 1},
        uAxis: {value: 0},
      },
      depthTest: false,
      depthWrite: false,
    });
    this.assembleMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: ASSEMBLE_FRAG,
      uniforms: {
        tDispYX: {value: null},
        tDispZ: {value: null},
        uN: {value: 128},
        uPatchLength: {value: 180},
        uChoppiness: {value: params.oceanChoppiness},
      },
      depthTest: false,
      depthWrite: false,
    });
    this.quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.evolveMat);
    this.quadMesh.frustumCulled = false;
    this.quadScene.add(this.quadMesh);

    this.causticsMap = new THREE.TextureLoader().load(new URL('ocean/caustics.png', document.baseURI).href);
    this.causticsMap.wrapS = this.causticsMap.wrapT = THREE.RepeatWrapping;
    this.foamMap=new THREE.TextureLoader().load(new URL('ocean/foam.jpg',document.baseURI).href);
    this.foamMap.wrapS=this.foamMap.wrapT=THREE.RepeatWrapping;
    this.foamMap.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    this.material = new THREE.ShaderMaterial({
      vertexShader: OCEAN_VERT,
      fragmentShader: OCEAN_FRAG,
      // Main HDR alpha carries the remaining land grade through foreground transparency.
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      transparent: true,
      depthWrite: true,
      depthTest: true,
      side: THREE.DoubleSide,
      uniforms: {
        ...water,
        ...bandUniforms(SEA_BAND),
        tVoyageWake:{value:this.dummyTex},uWakeCenter:{value:new THREE.Vector2()},uWakeOn:{value:0},
        uCamCenter: {value: new THREE.Vector3()},
        uSeaLevel: {value: SEA_LEVEL},
        uTime: {value: 0},
        uWindScale: {value: 0.98},
        uUseFFT: {value: this.supportsFloatRT ? 1 : 0},
        uCascades: {value: this.activeCascades},
        uChoppiness: {value: params.oceanChoppiness},
        tDisp0: {value: this.dummyTex},
        tDisp1: {value: this.dummyTex},
        tNorm0: {value: this.dummyTex},
        tNorm1: {value: this.dummyTex},
        tIslandSDF: {value: sdf.texture},
        uIslands:{value:Array.from({length:25},()=>new THREE.Vector4(0,0,0,0))},uIslandOrigin:{value:new THREE.Vector2()},
        uIslandBounds: {value: sdf.bounds.clone()},
        uAbsorbRGB: {value: new THREE.Vector3(params.oceanAbsorbR, params.oceanAbsorbG, params.oceanAbsorbB)},
        uScatterIntensity: {value: params.oceanScatterIntensity},
        uFoamStrength: {value: params.oceanFoamStrength},
        uGlintStrength: {value: params.oceanGlintStrength},
        uStorminess: {value: 0}, tOceanFoam:{value:this.foamMap}, tCaustics:{value:this.causticsMap},
        uL0: {value: this.patchLengths[0]},
        uL1: {value: this.patchLengths[1]},
        uCloudCover: {value: 0.15},
      },
    });

    this.mesh = new THREE.Mesh(buildRadialOceanGeometry(), this.material);
    this.mesh.name = 'infinite-fft-ocean';
    this.mesh.frustumCulled = false;
    // Water layer: drawn by the main camera only, first among transparents (see HomeRenderPipeline)
    this.mesh.layers.set(WATER_LAYER);
    this.mesh.renderOrder = -20;

    if (this.supportsFloatRT) {
      this.rebuildCascades(this.fftSize, this.activeCascades);
    }
  }

  setIslandSDF(sdf: IslandSDFData) {
    this.sdfData = sdf;
    this.material.uniforms.tIslandSDF.value = sdf.texture;
    this.material.uniforms.uIslandBounds.value.copy(sdf.bounds);
  }

  /** Evaluates exact CPU wave height, surge & surface normal synced to the rendered Gerstner swell. */
  private offshore=new Map<string,SeaIsland>();
  setOffshoreIslands(islands:SeaIsland[]){
    this.offshore.clear();
    const u=this.material.uniforms;
    const slots=u.uIslands.value as THREE.Vector4[];
    slots.forEach(v=>v.set(0,0,0,0));
    if(!islands.length)return;
    const minX=Math.min(...islands.map(i=>Math.floor(i.x/384))), minZ=Math.min(...islands.map(i=>Math.floor(i.z/384)));
    u.uIslandOrigin.value.set(minX,minZ);
    for(const i of islands){
      const x=Math.floor(i.x/384),z=Math.floor(i.z/384);
      this.offshore.set(x+','+z,i);
      slots[(z-minZ)*5+x-minX].set(i.x,i.z,i.r,i.kind+i.phase/8);
    }
  }
  sampleWave(x: number, z: number, time = this.lastTime): OceanWaveSample {
    const i=this.offshore.get(Math.floor(x/384)+','+Math.floor(z/384));
    const shore=i?(SEA_LEVEL-islandBed(i,x,z))*i.r/(i.kind===1?7:3.6):Infinity;
    return sampleOceanWaveAt(x, z, time, this.lastWindNorm, this.sdfData, !!this.voyageWake, shore);
  }

  /** Returns true when world (x, z) lies in exterior ocean water (outside owned land rects). */
  isOceanAt(x: number, z: number): boolean {
    return sampleIslandSDFCPU(this.sdfData, x, z).dBox > -0.05;
  }

  setQuality(fftSize: number, cascades: number) {
    const clampedSize = fftSize >= 256 ? 256 : fftSize >= 128 ? 128 : 0;
    const clampedCascades = clampedSize === 0 ? 0 : Math.min(2, Math.max(1, cascades));
    if (clampedSize === this.fftSize && clampedCascades === this.activeCascades && this.cascades.length === clampedCascades) {
      return;
    }
    this.fftSize = clampedSize;
    this.activeCascades = clampedCascades;
    if (this.supportsFloatRT && clampedSize > 0) {
      this.rebuildCascades(clampedSize, clampedCascades);
    } else {
      this.disposeCascades();
      this.material.uniforms.uUseFFT.value = 0;
    }
  }

  private disposeCascades() {
    for (const c of this.cascades) {
      c.h0Tex.dispose();
      c.ping.dispose();
      c.pong.dispose();
      c.out.dispose();
    }
    this.cascades = [];
  }

  private rebuildCascades(N: number, count: number) {
    this.disposeCascades();
    const rtOpts = {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      depthBuffer: false,
      stencilBuffer: false,
    };
    const outOpts = {
      ...rtOpts,
      count: 2,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
    };

    for (let i = 0; i < count; i++) {
      const L = this.patchLengths[i];
      const spec = buildJONSWAPSpectrum(N, L, 11.0, 0.55 + i * 0.2, 419 + i * 977);
      const h0Tex = new THREE.DataTexture(spec, N, N, THREE.RGBAFormat, THREE.FloatType);
      h0Tex.minFilter = THREE.NearestFilter;
      h0Tex.magFilter = THREE.NearestFilter;
      h0Tex.needsUpdate = true;

      this.cascades.push({
        size: N,
        patchLength: L,
        h0Tex,
        ping: new THREE.WebGLRenderTarget(N, N, {...rtOpts, count: 2}),
        pong: new THREE.WebGLRenderTarget(N, N, {...rtOpts, count: 2}),
        out: new THREE.WebGLRenderTarget(N, N, outOpts),
        lastWind: 11.0,
      });
    }

    const u = this.material.uniforms;
    u.uUseFFT.value = count > 0 ? 1 : 0;
    u.uCascades.value = count;
    const c0 = this.cascades[0];
    const c1 = this.cascades[1] ?? c0;
    if (c0) {
      u.tDisp0.value = c0.out.textures[0];
      u.tNorm0.value = c0.out.textures[1];
      u.tDisp1.value = c1.out.textures[0];
      u.tNorm1.value = c1.out.textures[1];
    }
  }

  private runCascadeIFFT(renderer: THREE.WebGLRenderer, c: FFTCascade, time: number, choppiness: number) {
    const N = c.size;
    const stages = Math.round(Math.log2(N));

    // 1. Evolve H(k, t) -> MRT (Hy, Hdx) + (Hdz, 0)
    this.quadMesh.material = this.evolveMat;
    this.evolveMat.uniforms.tH0.value = c.h0Tex;
    this.evolveMat.uniforms.uTime.value = time;
    this.evolveMat.uniforms.uN.value = N;
    this.evolveMat.uniforms.uPatchLength.value = c.patchLength;
    renderer.setRenderTarget(c.ping);
    renderer.render(this.quadScene, this.quadCam);

    // 2. Horizontal + vertical Stockham IFFT on both spectra at once
    let a = c.ping;
    let b = c.pong;
    const su = this.stockhamMat.uniforms;
    this.quadMesh.material = this.stockhamMat;
    su.uN.value = N;
    for (let axis = 0; axis < 2; axis++) {
      su.uAxis.value = axis;
      for (let s = 0; s < stages; s++) {
        su.uStride.value = 1 << s;
        su.tInputA.value = a.textures[0];
        su.tInputB.value = a.textures[1];
        renderer.setRenderTarget(b);
        renderer.render(this.quadScene, this.quadCam);
        const tmp = a;
        a = b;
        b = tmp;
      }
    }

    // 3. Assemble displacement + central-difference normal & Jacobian foam (MRT, mipmapped)
    const au = this.assembleMat.uniforms;
    this.quadMesh.material = this.assembleMat;
    au.tDispYX.value = a.textures[0];
    au.tDispZ.value = a.textures[1];
    au.uN.value = N;
    au.uPatchLength.value = c.patchLength;
    au.uChoppiness.value = choppiness;
    renderer.setRenderTarget(c.out);
    renderer.render(this.quadScene, this.quadCam);
  }

  update(
    renderer: THREE.WebGLRenderer,
    time: number,
    _dt: number,
    windNorm: number,
    sunDir: THREE.Vector3,
    params: HomeRenderParams,
  ) {
    this.lastTime = time;
    this.lastWindNorm = windNorm;
    const u = this.material.uniforms;
    u.uTime.value = time;
    u.uWindScale.value = 0.72 + 0.52 * clamp01(windNorm);
    u.uSunDir.value.copy(sunDir);
    u.uAbsorbRGB.value.set(params.oceanAbsorbR, params.oceanAbsorbG, params.oceanAbsorbB);
    u.uScatterIntensity.value = params.oceanScatterIntensity;
    u.uChoppiness.value = params.oceanChoppiness;
    u.uFoamStrength.value = params.oceanFoamStrength;
    u.uGlintStrength.value = params.oceanGlintStrength;

    if(this.voyageWake){
      this.voyageWake.update(renderer,time,_dt);this.voyageWake.bind(u);
    }
    if (!this.cascades.length) return;

    const windSpeed = 7.0 + windNorm * 11.0;
    const prevRT = renderer.getRenderTarget();
    const prevAuto = renderer.autoClear;
    renderer.autoClear = false;

    for (let i = 0; i < this.cascades.length; i++) {
      const c = this.cascades[i];
      if (Math.abs(c.lastWind - windSpeed) > 2.2) {
        c.lastWind = windSpeed;
        const spec = buildJONSWAPSpectrum(c.size, c.patchLength, windSpeed, 0.55 + i * 0.2, 419 + i * 977);
        (c.h0Tex.image.data as Float32Array).set(spec);
        c.h0Tex.needsUpdate = true;
      }
      this.runCascadeIFFT(renderer, c, time * 0.92, params.oceanChoppiness);
    }

    renderer.setRenderTarget(prevRT);
    renderer.autoClear = prevAuto;
  }

  syncCameraAndEnv(camera: THREE.PerspectiveCamera, sunColor: THREE.Color, daylight: number, storminess: number, cloudCover: number) {
    // Snap radial grid center to 4m increments to eliminate vertex swimming as camera glides
    const snap = 4.0;
    const u = this.material.uniforms;
    u.uCamCenter.value.set(
      Math.round(camera.position.x / snap) * snap,
      0,
      Math.round(camera.position.z / snap) * snap,
    );
    u.uSunColor.value.copy(sunColor);
    u.uDaylight.value = daylight;
    u.uStorminess.value = storminess;
    u.uCloudCover.value = cloudCover;
  }

  dispose() {
    this.endVoyageWake();
    this.disposeCascades();
    this.causticsMap.dispose();
    this.foamMap.dispose();
    this.dummyTex.dispose();
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.evolveMat.dispose();
    this.stockhamMat.dispose();
    this.assembleMat.dispose();
    this.quadMesh.geometry.dispose();
    this.mesh.removeFromParent();
  }
}
