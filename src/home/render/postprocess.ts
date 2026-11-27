import * as THREE from 'three';
import {GTAOPass} from './gtao';
import type {PostProcessHook} from './pipeline';

const FULLSCREEN_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

/**
 * Pass 1: HDR Composite of Multi-Bounce GTAO + Volumetric Clouds + Height-Exponential Volumetric Fog
 * + Mie Sun Inscattering & Aerial Perspective into litHdrRT.
 */
const COMPOSITE_HDR_FRAG = `
precision highp float;
#include <packing>
varying vec2 vUv;

uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tGTAO;
uniform sampler2D tClouds;
uniform sampler2D tSkyView;
uniform mat4 uInvProj;
uniform mat4 uCamWorld;
uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform float uNear;
uniform float uFar;
uniform float uDaylight;
uniform float uFogDensity;
uniform float uFogHeightFalloff;
uniform float uFogInscatter;
uniform float uUseGTAO;
uniform float uUseClouds;
uniform float uUseShafts;
uniform float uSeaLevel;
uniform float uTime;
uniform float uUnderwater;
uniform float uCamDepth;

const float PI = 3.14159265359;

float causticsPattern(vec2 p, float t) {
  vec2 p1 = p * 0.55 + vec2(t * 0.24, -t * 0.19);
  vec2 p2 = p * 0.82 - vec2(t * 0.17, t * 0.26);
  float c1 = sin(p1.x + sin(p1.y * 1.3 + t * 0.6)) * cos(p1.y - cos(p1.x * 1.1));
  float c2 = sin(p2.x * 1.2 - cos(p2.y)) * cos(p2.y * 1.1 + sin(p2.x - t * 0.5));
  float v = 1.0 - abs(c1 + c2) * 0.5;
  return pow(clamp(v, 0.0, 1.0), 4.0);
}

vec2 dirToSkyUV(vec3 d) {
  float azim = atan(d.x, d.z);
  float u = azim / (2.0 * PI) + 0.5;
  float lat = asin(clamp(d.y, -1.0, 1.0));
  float s = lat >= 0.0 ? 1.0 : -1.0;
  float v = 0.5 + 0.5 * s * sqrt(abs(lat) / (PI * 0.5));
  return vec2(fract(u), clamp(v, 0.002, 0.998));
}

// Jimenez 2016 Multi-Bounce Albedo AO approximation
vec3 multiBounceAO(float ao, vec3 albedo) {
  vec3 a = 2.0404 * albedo - 0.3324;
  vec3 b = -4.7951 * albedo + 0.6417;
  vec3 c = 2.7552 * albedo + 0.6903;
  return max(vec3(ao), ((ao * a + b) * ao + c) * ao);
}

void main() {
  // Subtle underwater optical refraction ripple when camera is submerged
  vec2 sampleUv = vUv;
  if (uUnderwater > 0.01) {
    vec2 ripple = vec2(
      sin(vUv.y * 22.0 + uTime * 2.1) * 0.0022,
      cos(vUv.x * 18.0 - uTime * 1.7) * 0.0018
    ) * uUnderwater;
    sampleUv = clamp(vUv + ripple, vec2(0.001), vec2(0.999));
  }

  vec3 col = texture2D(tColor, sampleUv).rgb;
  float rawDepth = texture2D(tDepth, sampleUv).x;

  vec4 ndc = vec4(sampleUv * 2.0 - 1.0, rawDepth * 2.0 - 1.0, 1.0);
  vec4 viewPos = uInvProj * ndc;
  viewPos.xyz /= viewPos.w;
  vec3 worldPos = (uCamWorld * vec4(viewPos.xyz, 1.0)).xyz;
  vec3 rayVec = worldPos - uCamPos;
  float dist = length(rayVec);
  vec3 rd = rayVec / max(dist, 1e-4);

  bool isSky = rawDepth >= 0.9996;

  // 1. Multi-bounce GTAO on opaque geometry (clean and subtle)
  if (!isSky && uUseGTAO > 0.5) {
    float ao = texture2D(tGTAO, sampleUv).r;
    vec3 approxAlbedo = clamp(col / max(col + vec3(0.45), vec3(0.01)), 0.08, 0.95);
    col *= multiBounceAO(ao, approxAlbedo);
  }

  // 2. Volumetric clouds composited cleanly on sky pixels (only above water)
  if (isSky && uUseClouds > 0.5 && uUnderwater < 0.5) {
    vec4 cloud = texture2D(tClouds, sampleUv);
    col = col * cloud.a + cloud.rgb;
  }

  vec3 sunDir = normalize(uSunDir);

  // 3. Clean stylized atmospheric perspective above water (crisp near/mid-ground, airy distant horizon!)
  if (!isSky && uUnderwater < 0.99) {
    float hFall = max(uFogHeightFalloff, 0.008);
    // The whole island (0..180m) stays crisp; haze only builds towards the sea horizon
    float effDist = max(0.0, dist - 180.0);
    float y0 = max(uCamPos.y + 4.0, 0.0);
    float dy = rd.y * effDist;
    float expInt = abs(dy * hFall) < 1e-3
      ? exp(-y0 * hFall)
      : exp(-y0 * hFall) * (1.0 - exp(-dy * hFall)) / (dy * hFall);
    float opticalDepth = uFogDensity * effDist * max(expInt, 0.0);
    // Smooth distance aerial perspective far out on the ocean horizon
    float horizonAerial = smoothstep(680.0, 2700.0, dist) * 1.15;
    // Cap land/tree fog gracefully so stylized silhouettes always read cleanly and evenly
    float landCap = mix(0.32, 0.96, smoothstep(180.0, 900.0, dist));
    float fogAmount = min(clamp(1.0 - exp(-(opticalDepth + horizonAerial)), 0.0, 0.98), landCap);

    vec3 horizonDir = normalize(vec3(rd.x, max(rd.y, 0.05), rd.z));
    vec3 fogBase = texture2D(tSkyView, dirToSkyUV(horizonDir)).rgb;
    fogBase += vec3(0.014, 0.026, 0.046) * (1.0 - smoothstep(0.02, 0.35, uDaylight));

    float cosTheta = max(dot(rd, sunDir), 0.0);
    vec3 sunTint = mix(vec3(1.0, 0.48, 0.20), vec3(1.0, 0.94, 0.82), smoothstep(0.0, 0.32, max(sunDir.y, 0.0)));
    float mieGlow = pow(cosTheta, 7.0) * uFogInscatter * smoothstep(-0.04, 0.10, sunDir.y) * uDaylight;
    vec3 fogCol = fogBase + sunTint * (mieGlow * 0.35);
    col = mix(col, fogCol, fogAmount * (1.0 - uUnderwater));
  }

  // 4. Underwater HDR Post-Processing: spectral absorption, animated seabed caustics, volumetric sun shafts & plankton bokeh!
  if (uUnderwater > 0.001) {
    float uwDist = isSky ? 55.0 : dist;
    float depthFrac = clamp(uCamDepth / 14.0, 0.0, 1.0);
    // Spectral water tint transitions smoothly from sunlit turquoise-aqua shallows to luminous abyssal cobalt
    vec3 shallowFog = vec3(0.06, 0.44, 0.56) * (0.20 + 0.80 * uDaylight);
    vec3 deepFog = vec3(0.012, 0.075, 0.19) * (0.22 + 0.78 * uDaylight);
    vec3 uwFogCol = mix(shallowFog, deepFog, smoothstep(0.0, 0.85, depthFrac));

    // Projected animated solar caustics on submerged seabed/reefs/creatures
    if (!isSky && worldPos.y < uSeaLevel - 0.05) {
      float subDepth = max(0.0, uSeaLevel - worldPos.y);
      float caustFade = exp(-subDepth * 0.14) * exp(-uwDist * 0.045) * smoothstep(-0.05, 0.2, sunDir.y) * uDaylight;
      float c = causticsPattern(worldPos.xz + sunDir.xz * subDepth * 0.35, uTime);
      col += vec3(0.24, 0.68, 0.72) * c * caustFade * 0.58 * uUnderwater;
    }

    // Beer-Lambert underwater color absorption (reds attenuate rapidly, cyan/blue carry far)
    vec3 absorb = mix(vec3(0.11, 0.036, 0.018), vec3(0.16, 0.062, 0.032), depthFrac);
    vec3 trans = exp(-uwDist * absorb);
    vec3 uwCol = col * trans + uwFogCol * (1.0 - trans);

    // Volumetric underwater god-rays streaming down from the sunlit water surface
    float upBias = smoothstep(-0.25, 0.85, rd.y);
    float sunAlign = pow(max(dot(rd, normalize(vec3(sunDir.x, max(sunDir.y, 0.35), sunDir.z))), 0.0), 4.0);
    float rayAngle = atan(rd.x, rd.z) * 7.0 + rd.y * 4.0;
    float rayBands = pow(0.5 + 0.5 * sin(rayAngle + uTime * 0.45) * cos(rayAngle * 1.7 - uTime * 0.32), 2.0);
    float rayFade = exp(-uCamDepth * 0.12) * uDaylight * smoothstep(-0.04, 0.15, sunDir.y);
    uwCol += vec3(0.18, 0.62, 0.70) * rayBands * (0.24 * upBias + 0.55 * sunAlign) * rayFade * 0.52;

    // Gentle floating luminescent underwater plankton motes
    vec2 moteGrid = floor((sampleUv * vec2(18.0, 11.0)) + vec2(sin(uTime * 0.22) * 0.8, -uTime * 0.18));
    vec2 moteF = fract((sampleUv * vec2(18.0, 11.0)) + vec2(sin(uTime * 0.22) * 0.8, -uTime * 0.18));
    float moteHash = fract(sin(dot(moteGrid, vec2(127.1, 311.7))) * 43758.5453);
    float mote = step(0.84, moteHash) * smoothstep(0.16, 0.0, length(moteF - vec2(0.5 + 0.25 * sin(moteHash * 20.0 + uTime))));
    vec3 moteTint = mix(vec3(0.55, 0.92, 0.98), vec3(0.35, 0.85, 1.0), depthFrac);
    uwCol += moteTint * mote * (0.14 + 0.18 * depthFrac);

    // Soft underwater depth vignette
    float uwVig = smoothstep(0.45, 1.25, length((vUv - 0.5) * 1.45));
    uwCol *= 1.0 - uwVig * (0.18 + 0.16 * depthFrac);

    col = mix(col, uwCol, uUnderwater);
  }

  gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
}`;

/** Pass 2a: Extract center-weighted log2 luminance into 64x64 RT for Auto Exposure. */
const LOG_LUMA_INIT_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tHdr;
void main() {
  vec3 c = texture2D(tHdr, vUv).rgb;
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // Weight ground/landscape strongly so bright sky never drags the sunlit island dark!
  vec2 d = vUv - vec2(0.5, 0.36);
  float w = exp(-dot(d, d) * 3.0) * (vUv.y > 0.64 ? 0.24 : 1.0);
  float logL = log2(clamp(luma, 0.004, 10.0));
  gl_FragColor = vec4(logL * w, w, luma, 1.0);
}`;

/** Pass 2b: 4x4 box downsample for log-luminance chain. */
const DOWNSAMPLE_4X_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tIn;
uniform vec2 uTexel;
void main() {
  vec4 s = vec4(0.0);
  for (float y = -1.5; y <= 1.5; y += 1.0) {
    for (float x = -1.5; x <= 1.5; x += 1.0) {
      s += texture2D(tIn, clamp(vUv + vec2(x, y) * uTexel, vec2(0.001), vec2(0.999)));
    }
  }
  gl_FragColor = s * 0.0625;
}`;

/** Pass 2c: Temporal eye-adaptation smoothing in 1x1 RT. */
const ADAPT_EXPOSURE_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tCurr;
uniform sampler2D tPrev;
uniform float uDt;
uniform float uInstant;
void main() {
  vec4 curr = texture2D(tCurr, vec2(0.5));
  float avgLogL = curr.r / max(curr.g, 1e-4);
  float currL = clamp(exp2(avgLogL), 0.004, 16.0);
  float prevL = texture2D(tPrev, vec2(0.5)).r;
  if (uInstant > 0.5 || !(prevL > 1e-5 && prevL < 1e4)) {
    gl_FragColor = vec4(currL, currL, currL, 1.0);
    return;
  }
  float tau = currL > prevL ? 1.1 : 1.8;
  float adapted = prevL + (currL - prevL) * (1.0 - exp(-uDt / tau));
  gl_FragColor = vec4(adapted, currL, 0.0, 1.0);
}`;

/** Pass 3a: Extract exposed log-luminance + soft RGB bloom highlights at 128x72. */
const LOCAL_LUMA_EXTRACT_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tHdr;
uniform sampler2D tExposure;
uniform float uTargetKey;
uniform float uBias;
void main() {
  float avgL = max(texture2D(tExposure, vec2(0.5)).r, 0.02);
  float evMult = clamp((uTargetKey / avgL) * exp2(uBias), 0.30, 5.5);
  vec3 c = texture2D(tHdr, vUv).rgb * evMult;
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float logL = log2(max(luma, 1e-4));
  // Soft-knee HDR bloom extract for sun rim, sunlit clouds, ocean glints & luminous accents (protects blue sky!)
  float knee = 0.40;
  float thresh = 1.28;
  float soft = clamp(luma - thresh + knee, 0.0, 2.0 * knee);
  soft = (soft * soft) / (4.0 * knee + 1e-4);
  float contrib = max(soft, luma - thresh) / max(luma, 1e-4);
  vec3 bloom = min(c * contrib, vec3(3.5));
  gl_FragColor = vec4(bloom, logL);
}`;

/** Pass 3b: Wide separable Gaussian blur for both bloom & regional low-frequency brightness map. */
const GAUSS_BLUR_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tIn;
uniform vec2 uDir;
void main() {
  const float w[5] = float[5](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
  vec4 acc = texture2D(tIn, vUv) * w[0];
  for (int i = 1; i < 5; i++) {
    vec2 off = uDir * float(i) * 1.75;
    acc += texture2D(tIn, clamp(vUv + off, vec2(0.002), vec2(0.998))) * w[i];
    acc += texture2D(tIn, clamp(vUv - off, vec2(0.002), vec2(0.998))) * w[i];
  }
  gl_FragColor = acc;
}`;

/**
 * Pass 4: Crisp Stylized Anime/Open-World Tone Mapping (Genshin / Wuthering Waves inspired):
 * - Airy HDR RGB Bloom on sun, clouds & ocean sparkle
 * - Vibrant ACES-stylized Filmic curve (clean whites & vivid greens/blues without AgX pastel washout)
 * - Subtle warm-sun / cool-shadow split toning, vibrance & crisp micro-clarity
 */
const FINAL_TONEMAP_FRAG = `
precision highp float;
varying vec2 vUv;

uniform sampler2D tHdr;
uniform sampler2D tExposure;
uniform sampler2D tLocalLuma;
uniform float uTargetKey;
uniform float uBias;
uniform float uShadowBoost;
uniform float uHighlightCompress;
uniform float uSaturation;
uniform float uFade;

// Crisp stylized Filmic / Narkowicz ACES curve with clean highlight roll-off and rich chroma retention
vec3 stylizedFilmic(vec3 x) {
  // Subtle matrix pre-lift keeps sky blue & meadow green vivid through the shoulder
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  float avgL = max(texture2D(tExposure, vec2(0.5)).r, 0.02);
  float evMult = clamp((uTargetKey / avgL) * exp2(uBias), 0.30, 5.5);

  vec3 col = texture2D(tHdr, vUv).rgb * evMult;

  // Regional Local Exposure + airy RGB Bloom packed in tLocalLuma (rgb = bloom, a = localLogL)
  vec4 localSample = texture2D(tLocalLuma, vUv);
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  float logL = log2(max(luma, 1e-4));
  float localLogL = localSample.a;
  float detail = logL - localLogL;

  // Gentle shadow lift + light highlight recovery + subtle crisp micro-clarity (+8% detail contrast)
  float midLog = log2(max(uTargetKey, 0.08));
  float delta = localLogL - midLog;
  float compressedDelta = delta >= 0.0
    ? delta * (1.0 - uHighlightCompress)
    : delta * (1.0 - uShadowBoost);
  float targetLogL = midLog + compressedDelta + detail * 1.08;
  float localGain = clamp(exp2(targetLogL - logL), 0.42, 3.0);
  col *= localGain;

  // Airy luminous HDR Bloom (sun rim, cloud silver lining, water sparkles, glowing shards/portals)
  col += localSample.rgb * 0.22;

  // Crisp Stylized Filmic tone mapping -> linear [0..1] display-referred
  col = stylizedFilmic(max(col, vec3(0.0)) * 1.12);

  // Subtle Genshin/WuWa split-tone: clean cool-azure shadow clarity + warm sunlit highlight glow
  float l0 = dot(col, vec3(0.2126, 0.7152, 0.0722));
  vec3 shadowTint = vec3(0.95, 0.99, 1.06);
  vec3 highTint = vec3(1.03, 1.01, 0.97);
  col *= mix(shadowTint, highTint, smoothstep(0.12, 0.75, l0));

  // Smart vibrance + saturation (enriches midtone colors while protecting clean whites)
  float maxC = max(col.r, max(col.g, col.b));
  float minC = min(col.r, min(col.g, col.b));
  float curSat = (maxC - minC) / max(maxC, 1e-4);
  float vib = (uSaturation - 1.0) * (1.0 - curSat * 0.45);
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, 1.0 + vib);

  // Clean crisp contrast lift (prevents dusty/washed shadows)
  col = clamp((col - 0.5) * 1.04 + 0.515, 0.0, 1.0);

  // Minimal airy edge framing (no dark muddy vignette)
  float vig = smoothstep(0.82, 1.55, length((vUv - 0.5) * 1.45));
  col *= 1.0 - vig * 0.04;

  // Fade-in transition from pale sky mist
  col = mix(vec3(0.84, 0.92, 0.98), col, uFade);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export class HomePostProcess implements PostProcessHook {
  private gtao = new GTAOPass();
  private litHdrRT: THREE.WebGLRenderTarget;
  private lum64RT: THREE.WebGLRenderTarget;
  private lum16RT: THREE.WebGLRenderTarget;
  private lum4RT: THREE.WebGLRenderTarget;
  private lum1RT: THREE.WebGLRenderTarget;
  private adaptRT: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
  private adaptIdx = 0;
  private localRT: THREE.WebGLRenderTarget;
  private localBlurRT: THREE.WebGLRenderTarget;

  private compositeMat: THREE.ShaderMaterial;
  private logInitMat: THREE.ShaderMaterial;
  private downMat: THREE.ShaderMaterial;
  private adaptMat: THREE.ShaderMaterial;
  private localExtractMat: THREE.ShaderMaterial;
  private gaussMat: THREE.ShaderMaterial;
  private finalMat: THREE.ShaderMaterial;

  private quadScene: THREE.Scene;
  private quadCam: THREE.OrthographicCamera;
  private quadMesh: THREE.Mesh;
  private dummyTex: THREE.DataTexture;

  /** Set true in automated calibration captures to snap auto-exposure instantaneously. */
  instantExposure = false;

  constructor() {
    const opts = {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    };
    this.litHdrRT = new THREE.WebGLRenderTarget(1, 1, opts);
    this.lum64RT = new THREE.WebGLRenderTarget(64, 64, opts);
    this.lum16RT = new THREE.WebGLRenderTarget(16, 16, opts);
    this.lum4RT = new THREE.WebGLRenderTarget(4, 4, opts);
    this.lum1RT = new THREE.WebGLRenderTarget(1, 1, opts);
    this.adaptRT = [new THREE.WebGLRenderTarget(1, 1, opts), new THREE.WebGLRenderTarget(1, 1, opts)];
    this.localRT = new THREE.WebGLRenderTarget(128, 72, opts);
    this.localBlurRT = new THREE.WebGLRenderTarget(128, 72, opts);

    this.dummyTex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
    this.dummyTex.needsUpdate = true;

    this.compositeMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: COMPOSITE_HDR_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tColor: {value: null},
        tDepth: {value: null},
        tGTAO: {value: this.dummyTex},
        tClouds: {value: this.dummyTex},
        tSkyView: {value: null},
        uInvProj: {value: new THREE.Matrix4()},
        uCamWorld: {value: new THREE.Matrix4()},
        uCamPos: {value: new THREE.Vector3()},
        uSunDir: {value: new THREE.Vector3(0.4, 0.7, 0.5)},
        uNear: {value: 0.14},
        uFar: {value: 3200},
        uDaylight: {value: 1},
        uFogDensity: {value: 0.001},
        uFogHeightFalloff: {value: 0.032},
        uFogInscatter: {value: 0.52},
        uUseGTAO: {value: 1},
        uUseClouds: {value: 1},
        uUseShafts: {value: 1},
        uSeaLevel: {value: -0.38},
        uTime: {value: 0},
        uUnderwater: {value: 0},
        uCamDepth: {value: 0},
      },
    });

    this.logInitMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: LOG_LUMA_INIT_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {tHdr: {value: null}},
    });
    this.downMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: DOWNSAMPLE_4X_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {tIn: {value: null}, uTexel: {value: new THREE.Vector2(1 / 64, 1 / 64)}},
    });
    this.adaptMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: ADAPT_EXPOSURE_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {tCurr: {value: null}, tPrev: {value: null}, uDt: {value: 1 / 60}, uInstant: {value: 0}},
    });
    this.localExtractMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: LOCAL_LUMA_EXTRACT_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {tHdr: {value: null}, tExposure: {value: null}, uTargetKey: {value: 0.24}, uBias: {value: 0}},
    });
    this.gaussMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: GAUSS_BLUR_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {tIn: {value: null}, uDir: {value: new THREE.Vector2(1 / 128, 0)}},
    });
    this.finalMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: FINAL_TONEMAP_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tHdr: {value: null},
        tExposure: {value: null},
        tLocalLuma: {value: null},
        uTargetKey: {value: 0.24},
        uBias: {value: 0},
        uShadowBoost: {value: 0.28},
        uHighlightCompress: {value: 0.34},
        uSaturation: {value: 1.06},
        uFade: {value: 1},
      },
    });

    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.compositeMat);
    this.quadMesh.frustumCulled = false;
    this.quadScene.add(this.quadMesh);
  }

  resize(w: number, h: number) {
    this.litHdrRT.setSize(Math.max(1, w), Math.max(1, h));
    this.gtao.resize(w, h);
  }

  render(args: Parameters<PostProcessHook['render']>[0]) {
    const {
      renderer, camera, hdrColor, hdrDepth, cloudsTex, skyViewTex,
      sunDir, daylight, fogDensity, time, fade, params, gtaoEnabled, shaftsEnabled, resolvedTarget,
    } = args;

    const prevRT = renderer.getRenderTarget();

    // 1. GTAO (normals reconstructed from depth)
    const runGTAO = gtaoEnabled && params.gtaoIntensity > 0.01;
    if (runGTAO) {
      this.gtao.render(renderer, camera, hdrDepth, params.gtaoRadius, params.gtaoIntensity);
    }

    // 2. HDR Composite (GTAO + Clouds + Height-Exponential Volumetric Fog + Aerial Perspective)
    const cu = this.compositeMat.uniforms;
    cu.tColor.value = hdrColor;
    cu.tDepth.value = hdrDepth;
    cu.tGTAO.value = runGTAO ? this.gtao.texture : this.dummyTex;
    cu.tClouds.value = cloudsTex ?? this.dummyTex;
    cu.tSkyView.value = skyViewTex;
    cu.uInvProj.value.copy(camera.projectionMatrixInverse);
    cu.uCamWorld.value.copy(camera.matrixWorld);
    cu.uCamPos.value.copy(camera.position);
    cu.uSunDir.value.copy(sunDir);
    cu.uNear.value = camera.near;
    cu.uFar.value = camera.far;
    cu.uDaylight.value = daylight;
    cu.uFogDensity.value = fogDensity;
    cu.uFogHeightFalloff.value = params.fogHeightFalloff;
    cu.uFogInscatter.value = params.fogInscatterStrength;
    cu.uUseGTAO.value = runGTAO ? 1 : 0;
    cu.uUseClouds.value = cloudsTex ? 1 : 0;
    cu.uUseShafts.value = shaftsEnabled ? 1 : 0;
    cu.uTime.value = time;
    const seaLevel = args.seaLevel ?? -0.38;
    const camSub = Math.max(0, seaLevel - camera.position.y);
    const uwBlend = Math.max(0, Math.min(1, (seaLevel - 0.02 - camera.position.y) / 0.22));
    cu.uSeaLevel.value = seaLevel;
    cu.uUnderwater.value = uwBlend;
    cu.uCamDepth.value = camSub;
    this.quadMesh.material = this.compositeMat;
    renderer.setRenderTarget(this.litHdrRT);
    renderer.render(this.quadScene, this.quadCam);

    // 3. GPU Auto Exposure: 64 -> 16 -> 4 -> 1 log-luminance pyramid + temporal adaptation
    this.logInitMat.uniforms.tHdr.value = this.litHdrRT.texture;
    this.quadMesh.material = this.logInitMat;
    renderer.setRenderTarget(this.lum64RT);
    renderer.render(this.quadScene, this.quadCam);

    this.quadMesh.material = this.downMat;
    this.downMat.uniforms.tIn.value = this.lum64RT.texture;
    this.downMat.uniforms.uTexel.value.set(1 / 64, 1 / 64);
    renderer.setRenderTarget(this.lum16RT);
    renderer.render(this.quadScene, this.quadCam);

    this.downMat.uniforms.tIn.value = this.lum16RT.texture;
    this.downMat.uniforms.uTexel.value.set(1 / 16, 1 / 16);
    renderer.setRenderTarget(this.lum4RT);
    renderer.render(this.quadScene, this.quadCam);

    this.downMat.uniforms.tIn.value = this.lum4RT.texture;
    this.downMat.uniforms.uTexel.value.set(1 / 4, 1 / 4);
    renderer.setRenderTarget(this.lum1RT);
    renderer.render(this.quadScene, this.quadCam);

    const prevAdapt = this.adaptRT[this.adaptIdx];
    const nextAdapt = this.adaptRT[1 - this.adaptIdx];
    this.adaptMat.uniforms.tCurr.value = this.lum1RT.texture;
    this.adaptMat.uniforms.tPrev.value = prevAdapt.texture;
    this.adaptMat.uniforms.uDt.value = 1 / 60;
    this.adaptMat.uniforms.uInstant.value = this.instantExposure || time < 0.08 ? 1 : 0;
    this.quadMesh.material = this.adaptMat;
    renderer.setRenderTarget(nextAdapt);
    renderer.render(this.quadScene, this.quadCam);
    this.adaptIdx = 1 - this.adaptIdx;

    // 4. Local Tone Mapping low-frequency luminance pyramid (128x72 + 2-pass wide Gaussian blur)
    this.localExtractMat.uniforms.tHdr.value = this.litHdrRT.texture;
    this.localExtractMat.uniforms.tExposure.value = nextAdapt.texture;
    this.localExtractMat.uniforms.uTargetKey.value = params.exposureTarget;
    this.localExtractMat.uniforms.uBias.value = params.exposureBias;
    this.quadMesh.material = this.localExtractMat;
    renderer.setRenderTarget(this.localRT);
    renderer.render(this.quadScene, this.quadCam);

    this.quadMesh.material = this.gaussMat;
    this.gaussMat.uniforms.tIn.value = this.localRT.texture;
    this.gaussMat.uniforms.uDir.value.set(1 / 128, 0);
    renderer.setRenderTarget(this.localBlurRT);
    renderer.render(this.quadScene, this.quadCam);

    this.gaussMat.uniforms.tIn.value = this.localBlurRT.texture;
    this.gaussMat.uniforms.uDir.value.set(0, 1 / 72);
    renderer.setRenderTarget(this.localRT);
    renderer.render(this.quadScene, this.quadCam);

    // 5. Final Local Exposure + AgX Filmic -> linear display-referred resolvedTarget
    const fu = this.finalMat.uniforms;
    fu.tHdr.value = this.litHdrRT.texture;
    fu.tExposure.value = nextAdapt.texture;
    fu.tLocalLuma.value = this.localRT.texture;
    fu.uTargetKey.value = params.exposureTarget;
    fu.uBias.value = params.exposureBias;
    fu.uShadowBoost.value = params.localShadowBoost;
    fu.uHighlightCompress.value = params.localHighlightCompress;
    fu.uSaturation.value = params.saturation;
    fu.uFade.value = fade;
    this.quadMesh.material = this.finalMat;
    renderer.setRenderTarget(resolvedTarget);
    renderer.render(this.quadScene, this.quadCam);

    renderer.setRenderTarget(prevRT);
  }

  dispose() {
    this.gtao.dispose();
    this.litHdrRT.dispose();
    this.lum64RT.dispose();
    this.lum16RT.dispose();
    this.lum4RT.dispose();
    this.lum1RT.dispose();
    this.adaptRT[0].dispose();
    this.adaptRT[1].dispose();
    this.localRT.dispose();
    this.localBlurRT.dispose();
    this.dummyTex.dispose();
    this.compositeMat.dispose();
    this.logInitMat.dispose();
    this.downMat.dispose();
    this.adaptMat.dispose();
    this.localExtractMat.dispose();
    this.gaussMat.dispose();
    this.finalMat.dispose();
    this.quadMesh.geometry.dispose();
  }
}
