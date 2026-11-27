import * as THREE from 'three';
import type {HomeRenderParams} from './params';

const FULLSCREEN_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

/**
 * Shared atmospheric scattering constants & helpers (Hillaire, EGSR 2020 / UE5 SkyAtmosphere).
 * Units are kilometres from Earth's centre: planet radius 6360 km, top of atmosphere 6460 km.
 */
const ATMO_COMMON = `
const float PI = 3.14159265359;
const float R_PLANET = 6360.0;
const float R_ATMO = 6460.0;
const float H_RAYLEIGH = 8.0;
const float H_MIE = 1.2;

uniform float uRayleighScale;
uniform float uMieScale;
uniform float uMieG;
uniform float uOzoneScale;

vec3 rayleighScattering() {
  return vec3(5.802e-3, 13.558e-3, 33.1e-3) * uRayleighScale;
}
vec3 mieScattering() {
  return vec3(3.996e-3) * uMieScale;
}
vec3 mieExtinction() {
  return vec3(4.40e-3) * uMieScale;
}
vec3 ozoneAbsorption() {
  return vec3(0.650e-3, 1.881e-3, 0.085e-3) * uOzoneScale;
}

float raySphereIntersectNearest(vec3 ro, vec3 rd, float rad) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - rad * rad;
  float disc = b * b - c;
  if (disc < 0.0) return -1.0;
  float s = sqrt(disc);
  float t0 = -b - s;
  float t1 = -b + s;
  if (t1 < 0.0) return -1.0;
  return t0 > 0.0 ? t0 : t1;
}

void sampleMedium(float h, out vec3 scatR, out vec3 scatM, out vec3 ext) {
  float dR = exp(-max(h, 0.0) / H_RAYLEIGH);
  float dM = exp(-max(h, 0.0) / H_MIE);
  float dO = max(0.0, 1.0 - abs(h - 25.0) / 15.0);
  scatR = rayleighScattering() * dR;
  scatM = mieScattering() * dM;
  ext = scatR + mieExtinction() * dM + ozoneAbsorption() * dO;
}

float rayleighPhase(float cosTheta) {
  return 3.0 / (16.0 * PI) * (1.0 + cosTheta * cosTheta);
}

float miePhase(float cosTheta, float g) {
  float g2 = g * g;
  float denom = max(1.0 + g2 - 2.0 * g * cosTheta, 0.0001);
  return (1.0 - g2) / (4.0 * PI * pow(denom, 1.5));
}

vec2 transmittanceUV(float r, float mu) {
  float H = sqrt(max(0.0, R_ATMO * R_ATMO - R_PLANET * R_PLANET));
  float rho = sqrt(max(0.0, r * r - R_PLANET * R_PLANET));
  float dMin = R_ATMO - r;
  float dMax = rho + H;
  float disc = r * r * (mu * mu - 1.0) + R_ATMO * R_ATMO;
  float d = max(0.0, -r * mu + sqrt(max(0.0, disc)));
  float u = clamp((d - dMin) / max(dMax - dMin, 1e-4), 0.0, 1.0);
  float v = clamp(rho / max(H, 1e-4), 0.0, 1.0);
  return vec2(u, v);
}
`;

const TRANSMITTANCE_FRAG = `
precision highp float;
varying vec2 vUv;
${ATMO_COMMON}
void main() {
  float H = sqrt(R_ATMO * R_ATMO - R_PLANET * R_PLANET);
  float rho = H * vUv.y;
  float r = sqrt(rho * rho + R_PLANET * R_PLANET);
  float dMin = R_ATMO - r;
  float dMax = rho + H;
  float d = dMin + vUv.x * (dMax - dMin);
  float mu = d == 0.0 ? 1.0 : (H * H - rho * rho - d * d) / (2.0 * r * d);
  mu = clamp(mu, -1.0, 1.0);

  vec3 pos = vec3(0.0, r, 0.0);
  vec3 dir = vec3(sqrt(max(0.0, 1.0 - mu * mu)), mu, 0.0);
  float tMax = raySphereIntersectNearest(pos, dir, R_ATMO);
  const int STEPS = 32;
  float dt = max(tMax, 0.0) / float(STEPS);
  vec3 od = vec3(0.0);
  for (int i = 0; i < STEPS; i++) {
    vec3 p = pos + dir * ((float(i) + 0.5) * dt);
    float h = length(p) - R_PLANET;
    vec3 sR, sM, ext;
    sampleMedium(h, sR, sM, ext);
    od += ext * dt;
  }
  gl_FragColor = vec4(exp(-od), 1.0);
}`;

const MULTISCATTER_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tTransmittance;
${ATMO_COMMON}
void main() {
  float cosSun = vUv.x * 2.0 - 1.0;
  float r = R_PLANET + clamp(vUv.y, 0.0, 1.0) * (R_ATMO - R_PLANET);
  vec3 sunDir = normalize(vec3(sqrt(max(0.0, 1.0 - cosSun * cosSun)), cosSun, 0.0));
  vec3 pos = vec3(0.0, r, 0.0);

  const int DIRS = 32;
  const int STEPS = 14;
  vec3 lumSum = vec3(0.0);
  vec3 fmsSum = vec3(0.0);
  float goldenAngle = 2.39996323;
  float isoPhase = 1.0 / (4.0 * PI);

  for (int d = 0; d < DIRS; d++) {
    float y = 1.0 - (float(d) + 0.5) * (2.0 / float(DIRS));
    float rad = sqrt(max(0.0, 1.0 - y * y));
    float phi = float(d) * goldenAngle;
    vec3 rd = vec3(cos(phi) * rad, y, sin(phi) * rad);

    float tAtmo = raySphereIntersectNearest(pos, rd, R_ATMO);
    float tGround = raySphereIntersectNearest(pos, rd, R_PLANET);
    float tMax = tGround > 0.0 ? min(tAtmo, tGround) : tAtmo;
    float dt = max(tMax, 0.0) / float(STEPS);

    vec3 throughput = vec3(1.0);
    vec3 lum = vec3(0.0);
    vec3 fms = vec3(0.0);
    for (int i = 0; i < STEPS; i++) {
      vec3 p = pos + rd * ((float(i) + 0.5) * dt);
      float pr = length(p);
      float h = pr - R_PLANET;
      vec3 sR, sM, ext;
      sampleMedium(h, sR, sM, ext);
      vec3 scat = sR + sM;
      vec3 stepT = exp(-ext * dt);

      vec3 up = p / pr;
      float sunMu = dot(up, sunDir);
      vec3 transSun = texture2D(tTransmittance, transmittanceUV(pr, sunMu)).rgb;
      float planetBlock = raySphereIntersectNearest(p, sunDir, R_PLANET) > 0.0 ? 0.0 : 1.0;

      vec3 sInt = (scat - scat * stepT) / max(ext, vec3(1e-6));
      lum += throughput * transSun * planetBlock * isoPhase * sInt;
      fms += throughput * isoPhase * sInt;
      throughput *= stepT;
    }
    if (tGround > 0.0) {
      vec3 p = pos + rd * tGround;
      vec3 up = normalize(p);
      float ndl = max(0.0, dot(up, sunDir));
      vec3 transSun = texture2D(tTransmittance, transmittanceUV(R_PLANET + 0.01, dot(up, sunDir))).rgb;
      lum += throughput * transSun * (vec3(0.08, 0.14, 0.19) / PI) * ndl;
    }
    lumSum += lum;
    fmsSum += fms;
  }
  vec3 L2 = lumSum * (4.0 * PI / float(DIRS));
  vec3 fms = fmsSum * (4.0 * PI / float(DIRS));
  vec3 psi = L2 / max(vec3(0.05), vec3(1.0) - fms);
  gl_FragColor = vec4(psi, 1.0);
}`;

const SKYVIEW_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tTransmittance;
uniform sampler2D tMultiScatter;
uniform vec3 uSunDir;
uniform float uSkyScale;
uniform float uCloudStorm;
${ATMO_COMMON}
void main() {
  float azim = (vUv.x - 0.5) * 2.0 * PI;
  float v = vUv.y;
  float lat;
  if (v < 0.5) {
    float c = 1.0 - 2.0 * v;
    lat = -c * c * (PI * 0.5);
  } else {
    float c = 2.0 * v - 1.0;
    lat = c * c * (PI * 0.5);
  }
  float cosLat = cos(lat);
  vec3 rd = normalize(vec3(cosLat * sin(azim), sin(lat), cosLat * cos(azim)));

  // View position slightly above sea level (0.2 km keeps horizon band smooth)
  float r0 = R_PLANET + 0.2;
  vec3 pos = vec3(0.0, r0, 0.0);
  float tAtmo = raySphereIntersectNearest(pos, rd, R_ATMO);
  float tGround = raySphereIntersectNearest(pos, rd, R_PLANET);
  float tMax = tGround > 0.0 ? min(tAtmo, tGround) : tAtmo;

  vec3 sunDir = normalize(uSunDir);
  float cosTheta = dot(rd, sunDir);
  float pR = rayleighPhase(cosTheta);
  float pM = miePhase(cosTheta, uMieG);

  const int STEPS = 28;
  vec3 lum = vec3(0.0);
  vec3 throughput = vec3(1.0);
  float tPrev = 0.0;
  for (int i = 0; i < STEPS; i++) {
    float frac = (float(i) + 0.5) / float(STEPS);
    float tCurr = frac * frac * tMax;
    float dt = tCurr - tPrev;
    tPrev = tCurr;
    vec3 p = pos + rd * tCurr;
    float pr = length(p);
    float h = pr - R_PLANET;
    vec3 sR, sM, ext;
    sampleMedium(h, sR, sM, ext);
    vec3 stepT = exp(-ext * dt);

    vec3 up = p / pr;
    float sunMu = dot(up, sunDir);
    vec3 transSun = texture2D(tTransmittance, transmittanceUV(pr, sunMu)).rgb;
    float shadow = raySphereIntersectNearest(p, sunDir, R_PLANET) > 0.0 ? 0.0 : 1.0;
    vec2 msUV = vec2(sunMu * 0.5 + 0.5, clamp(h / (R_ATMO - R_PLANET), 0.0, 1.0));
    vec3 ms = texture2D(tMultiScatter, msUV).rgb;

    vec3 scatter = (sR * pR + sM * pM) * transSun * shadow + (sR + sM) * ms;
    vec3 sInt = (scatter - scatter * stepT) / max(ext, vec3(1e-6));
    lum += throughput * sInt;
    throughput *= stepT;
  }

  // Solar irradiance in linear HDR units + stylized crisp azure sky gradient (anime daylight clarity)
  vec3 sky = lum * 15.0 * uSkyScale;
  float skyLum = dot(sky, vec3(0.2126, 0.7152, 0.0722));
  // Vivid cerulean zenith fading cleanly into luminous sky-aqua horizon (lets white clouds pop!)
  float clearDay = smoothstep(0.02, 0.28, sunDir.y) * (1.0 - uCloudStorm * 0.85);
  float elev = smoothstep(0.02, 0.50, max(rd.y, 0.0));
  vec3 animeSky = mix(vec3(0.72, 0.96, 1.18), vec3(0.18, 0.56, 1.32), elev) * max(skyLum, 0.55);
  sky = mix(sky, animeSky, clearDay * 0.62);
  // Soft overcast desaturation when storm/rain/cloud cover is heavy
  float luma = dot(sky, vec3(0.2126, 0.7152, 0.0722));
  sky = mix(sky, vec3(luma) * vec3(0.90, 0.96, 1.03), uCloudStorm * 0.52);
  gl_FragColor = vec4(max(sky, vec3(0.0)), 1.0);
}`;

const SKYDOME_VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SKYDOME_FRAG = `
precision highp float;
varying vec3 vDir;
uniform sampler2D tSkyView;
uniform sampler2D tTransmittance;
uniform vec3 uSunDir;
uniform float uDaylight;
uniform float uTwilight;
uniform float uCloudAmount;
uniform float uStorminess;
uniform float uDrift;
uniform float uSkyScale;
uniform float uSunIlluminance;
uniform sampler2D tCloudPano;
uniform float uUseClouds;

const float PI = 3.14159265359;

vec2 dirToSkyUV(vec3 d) {
  float azim = atan(d.x, d.z);
  float u = azim / (2.0 * PI) + 0.5;
  float lat = asin(clamp(d.y, -1.0, 1.0));
  float s = lat >= 0.0 ? 1.0 : -1.0;
  float v = 0.5 + 0.5 * s * sqrt(abs(lat) / (PI * 0.5));
  return vec2(fract(u), clamp(v, 0.002, 0.998));
}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec3 d = normalize(vDir);
  vec3 sunDir = normalize(uSunDir);
  vec3 sky = texture2D(tSkyView, dirToSkyUV(d)).rgb;

  // Starfield + moonlight takeover at night (physically scaled for HDR auto-exposure)
  float nightMask = 1.0 - smoothstep(0.02, 0.32, uDaylight);
  vec3 nightSky = mix(vec3(0.018, 0.032, 0.058), vec3(0.003, 0.008, 0.024), smoothstep(-0.05, 0.65, d.y));
  if (nightMask > 0.01 && d.y > 0.0) {
    vec2 starGrid = vec2(atan(d.z, d.x), asin(clamp(d.y, -1.0, 1.0))) * 145.0;
    vec2 cid = floor(starGrid);
    vec2 f = fract(starGrid) - 0.5;
    float h = hash21(cid);
    float star = step(0.985, h) * (1.0 - smoothstep(0.05, 0.24, length(f))) * (0.4 + 0.6 * hash21(cid + 19.3));
    nightSky += vec3(0.62, 0.76, 1.0) * star * smoothstep(0.04, 0.35, d.y) * (1.0 - uCloudAmount * 0.85) * 0.55;
    // Moon disc opposite the sun
    float moonDot = dot(d, -sunDir);
    float moonDisc = smoothstep(0.99945, 0.99975, moonDot);
    float moonHalo = pow(max(moonDot, 0.0), 48.0) * 0.08;
    nightSky += vec3(0.65, 0.78, 0.96) * (moonDisc * 2.2 + moonHalo) * (1.0 - uStorminess * 0.7);
  }
  sky += nightSky * nightMask;

  // Physical solar disc + golden sunset corona above horizon
  float sunDot = dot(d, sunDir);
  if (d.y > -0.04 && uDaylight > 0.01) {
    float sunDisc = smoothstep(0.99955, 0.99985, sunDot);
    float corona = pow(max(sunDot, 0.0), 220.0) * 0.55 + pow(max(sunDot, 0.0), 28.0) * 0.06;
    vec3 sunTint = mix(vec3(1.0, 0.42, 0.14), vec3(1.0, 0.95, 0.86), smoothstep(0.0, 0.32, max(sunDir.y, 0.0)));
    float vis = (1.0 - uStorminess * 0.85) * smoothstep(-0.04, 0.03, d.y);
    sky += sunTint * (sunDisc * 22.0 + corona * uSunIlluminance * 0.35) * vis * uDaylight;
  }

  // Cached cloud panorama (VolumetricClouds); the dome carries clouds into the main view and the mirror alike
  if (uUseClouds > 0.5 && d.y > 0.0) {
    vec2 cuv = vec2(fract(atan(d.x, d.z) / (2.0 * PI) + 0.5), sqrt(clamp(asin(d.y) / (PI * 0.5), 0.0, 1.0)));
    vec4 cloud = texture2D(tCloudPano, clamp(cuv, vec2(0.0, 0.001), vec2(1.0, 0.999)));
    sky = sky * cloud.a + cloud.rgb;
  }

  gl_FragColor = vec4(max(sky, vec3(0.0)), 1.0);
}`;

export class PhysicalAtmosphere {
  readonly transmittanceRT: THREE.WebGLRenderTarget;
  readonly multiScatterRT: THREE.WebGLRenderTarget;
  readonly skyViewRT: THREE.WebGLRenderTarget;
  readonly skyDome: THREE.Mesh;
  readonly skyDomeMat: THREE.ShaderMaterial;

  private quadScene: THREE.Scene;
  private quadCam: THREE.OrthographicCamera;
  private quadMesh: THREE.Mesh;
  private transMat: THREE.ShaderMaterial;
  private msMat: THREE.ShaderMaterial;
  private skyViewMat: THREE.ShaderMaterial;

  private dirtyLUTs = true;
  private lastSun = new THREE.Vector3(0, -1, 0);
  private lastStorm = -1;
  private lastScale = -1;
  private lastParamsHash = '';

  constructor(params: HomeRenderParams) {
    const rtOpts = {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false,
    };
    this.transmittanceRT = new THREE.WebGLRenderTarget(256, 64, rtOpts);
    this.multiScatterRT = new THREE.WebGLRenderTarget(32, 32, rtOpts);
    this.skyViewRT = new THREE.WebGLRenderTarget(192, 108, {
      ...rtOpts,
      wrapS: THREE.RepeatWrapping,
    });

    const sharedUniforms = {
      uRayleighScale: {value: params.rayleighScale},
      uMieScale: {value: params.mieScale},
      uMieG: {value: params.mieAnisotropy},
      uOzoneScale: {value: params.ozoneScale},
    };

    this.transMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: TRANSMITTANCE_FRAG,
      uniforms: {...sharedUniforms},
      depthTest: false,
      depthWrite: false,
    });

    this.msMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: MULTISCATTER_FRAG,
      uniforms: {
        ...sharedUniforms,
        tTransmittance: {value: this.transmittanceRT.texture},
      },
      depthTest: false,
      depthWrite: false,
    });

    this.skyViewMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: SKYVIEW_FRAG,
      uniforms: {
        ...sharedUniforms,
        tTransmittance: {value: this.transmittanceRT.texture},
        tMultiScatter: {value: this.multiScatterRT.texture},
        uSunDir: {value: new THREE.Vector3(0.4, 0.7, 0.5).normalize()},
        uSkyScale: {value: params.skyLuminanceScale},
        uCloudStorm: {value: 0},
      },
      depthTest: false,
      depthWrite: false,
    });

    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.transMat);
    this.quadMesh.frustumCulled = false;
    this.quadScene.add(this.quadMesh);

    this.skyDomeMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      fog: false,
      vertexShader: SKYDOME_VERT,
      fragmentShader: SKYDOME_FRAG,
      uniforms: {
        tSkyView: {value: this.skyViewRT.texture},
        tTransmittance: {value: this.transmittanceRT.texture},
        uSunDir: {value: new THREE.Vector3(0.4, 0.7, 0.5).normalize()},
        uDaylight: {value: 1},
        uTwilight: {value: 0},
        uCloudAmount: {value: 0.15},
        uStorminess: {value: 0},
        uDrift: {value: 0},
        uSkyScale: {value: params.skyLuminanceScale},
        uSunIlluminance: {value: params.sunIlluminance},
        tCloudPano: {value: null},
        uUseClouds: {value: 0},
      },
    });

    this.skyDome = new THREE.Mesh(new THREE.SphereGeometry(2900, 40, 20), this.skyDomeMat);
    this.skyDome.name = 'physical-sky-dome';
    this.skyDome.layers.set(1);
    this.skyDome.renderOrder = -100;
    this.skyDome.frustumCulled = false;
  }

  /** Syncs atmosphere parameters and regenerates LUTs only when needed. Returns true if SkyView changed. */
  update(
    renderer: THREE.WebGLRenderer,
    sunDir: THREE.Vector3,
    daylight: number,
    twilight: number,
    cloudAmount: number,
    storminess: number,
    drift: number,
    params: HomeRenderParams,
  ): boolean {
    const hash = `${params.rayleighScale.toFixed(3)}|${params.mieScale.toFixed(3)}|${params.mieAnisotropy.toFixed(3)}|${params.ozoneScale.toFixed(3)}`;
    if (hash !== this.lastParamsHash) {
      this.lastParamsHash = hash;
      this.dirtyLUTs = true;
      for (const m of [this.transMat, this.msMat, this.skyViewMat]) {
        m.uniforms.uRayleighScale.value = params.rayleighScale;
        m.uniforms.uMieScale.value = params.mieScale;
        m.uniforms.uMieG.value = params.mieAnisotropy;
        m.uniforms.uOzoneScale.value = params.ozoneScale;
      }
    }

    const u = this.skyDomeMat.uniforms;
    u.uSunDir.value.copy(sunDir);
    u.uDaylight.value = daylight;
    u.uTwilight.value = twilight;
    u.uCloudAmount.value = cloudAmount;
    u.uStorminess.value = storminess;
    u.uDrift.value = drift;
    u.uSkyScale.value = params.skyLuminanceScale;
    u.uSunIlluminance.value = params.sunIlluminance;

    const sunChanged = this.lastSun.dot(sunDir) < 0.99995;
    const stormChanged = Math.abs(this.lastStorm - storminess) > 0.008;
    const scaleChanged = Math.abs(this.lastScale - params.skyLuminanceScale) > 0.008;
    if (!this.dirtyLUTs && !sunChanged && !stormChanged && !scaleChanged) return false;

    const prevTarget = renderer.getRenderTarget();
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    if (this.dirtyLUTs) {
      this.quadMesh.material = this.transMat;
      renderer.setRenderTarget(this.transmittanceRT);
      renderer.render(this.quadScene, this.quadCam);

      this.quadMesh.material = this.msMat;
      renderer.setRenderTarget(this.multiScatterRT);
      renderer.render(this.quadScene, this.quadCam);
      this.dirtyLUTs = false;
    }

    this.skyViewMat.uniforms.uSunDir.value.copy(sunDir);
    this.skyViewMat.uniforms.uSkyScale.value = params.skyLuminanceScale;
    this.skyViewMat.uniforms.uCloudStorm.value = storminess;
    this.quadMesh.material = this.skyViewMat;
    renderer.setRenderTarget(this.skyViewRT);
    renderer.render(this.quadScene, this.quadCam);

    renderer.setRenderTarget(prevTarget);
    renderer.autoClear = prevAutoClear;

    this.lastSun.copy(sunDir);
    this.lastStorm = storminess;
    this.lastScale = params.skyLuminanceScale;
    return true;
  }

  /** Analytical approximation of transmitted sunlight color for DirectionalLight. */
  computeSunColor(sunDir: THREE.Vector3, daylight: number, out: THREE.Color): THREE.Color {
    const elev = Math.max(0.0, sunDir.y);
    // Optical airmass approximation (Kasten & Young)
    const airmass = 1.0 / (Math.max(elev, 0.03) + 0.15 * Math.pow(Math.max(elev * 57.2958, 0.5) + 3.885, -1.253));
    const tR = Math.exp(-0.088 * airmass);
    const tG = Math.exp(-0.185 * airmass);
    const tB = Math.exp(-0.39 * airmass);
    const maxC = Math.max(tR, tG, tB, 0.001);
    const dayCol = out.setRGB(tR / maxC, tG / maxC, tB / maxC);
    // Blend to cool moonlit blue-silver at night
    const moonR = 0.52, moonG = 0.68, moonB = 0.95;
    dayCol.r = moonR + (dayCol.r - moonR) * daylight;
    dayCol.g = moonG + (dayCol.g - moonG) * daylight;
    dayCol.b = moonB + (dayCol.b - moonB) * daylight;
    return dayCol;
  }

  dispose() {
    this.transmittanceRT.dispose();
    this.multiScatterRT.dispose();
    this.skyViewRT.dispose();
    this.skyDome.geometry.dispose();
    this.skyDomeMat.dispose();
    this.transMat.dispose();
    this.msMat.dispose();
    this.skyViewMat.dispose();
    this.quadMesh.geometry.dispose();
  }
}
