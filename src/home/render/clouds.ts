import * as THREE from 'three';
import type {HomeRenderParams} from './params';
import type {CloudRenderHook} from './pipeline';

const FULLSCREEN_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const CLOUDS_FRAG = `
precision highp float;
varying vec2 vUv;

uniform sampler2D tSkyView;
uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform float uTime;
uniform float uCloudAmount;
uniform float uStorminess;
uniform float uDaylight;
uniform float uCloudDensity;
uniform float uSilverLining;
uniform float uMode; // 0 = off, 1 = analytic, 2 = volumetric raymarch

const float PI = 3.14159265359;

vec2 dirToSkyUV(vec3 d) {
  float azim = atan(d.x, d.z);
  float u = azim / (2.0 * PI) + 0.5;
  float lat = asin(clamp(d.y, -1.0, 1.0));
  float s = lat >= 0.0 ? 1.0 : -1.0;
  float v = 0.5 + 0.5 * s * sqrt(abs(lat) / (PI * 0.5));
  return vec2(fract(u), clamp(v, 0.002, 0.998));
}

float hash31(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x),
        mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
        mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y),
    f.z
  );
}

float fbmCloud(vec3 p) {
  float v = 0.52 * noise3(p);
  v += 0.28 * noise3(p * 2.07 + vec3(7.1, -3.2, 5.4));
  v += 0.14 * noise3(p * 4.21 - vec3(2.3, 4.1, -1.9));
  v += 0.06 * noise3(p * 8.33);
  return v;
}

float hgPhase(float cosTheta, float g) {
  float g2 = g * g;
  return (1.0 - g2) / (4.0 * PI * pow(max(1.0 + g2 - 2.0 * g * cosTheta, 0.001), 1.5));
}

float cloudDensityAt(vec3 pos, float coverage) {
  float hNorm = clamp((pos.y - 1100.0) / 1400.0, 0.0, 1.0);
  // Cumulus height profile: flat bottom, billowing anvil top
  float hProfile = smoothstep(0.0, 0.20, hNorm) * smoothstep(1.0, 0.42, hNorm);
  if (hProfile <= 0.001) return 0.0;
  vec3 windOffset = vec3(uTime * 14.0, 0.0, uTime * 6.5);
  vec3 q = (pos + windOffset) * 0.00048;
  float base = fbmCloud(q);
  float detail = noise3(q * 3.8 - vec3(uTime * 0.02, 0.0, 0.0));
  float shaped = base - (1.0 - coverage) * 0.72 - detail * 0.16 * (1.0 - base);
  return max(0.0, shaped) * hProfile * uCloudDensity * 0.0042;
}

void main() {
  if (uMode < 0.5) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // Panorama texel -> view direction (u: azimuth, v: sqrt-latitude over the upper hemisphere)
  float azim = (vUv.x - 0.5) * 2.0 * PI;
  float lat = vUv.y * vUv.y * PI * 0.5;
  vec3 rd = vec3(sin(azim) * cos(lat), sin(lat), cos(azim) * cos(lat));

  if (rd.y < 0.015) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec3 sunDir = normalize(uSunDir);
  float cosTheta = dot(rd, sunDir);
  float phase = mix(hgPhase(cosTheta, -0.28), hgPhase(cosTheta, 0.74), 0.72);
  float silver = pow(max(cosTheta, 0.0), 10.0) * uSilverLining * 0.45;

  // Crisp luminous sunlit clouds (pure warm-white tops + airy sky-blue undersides like Genshin / WuWa)
  vec3 skyAmb = texture2D(tSkyView, dirToSkyUV(vec3(rd.x, max(rd.y, 0.18), rd.z))).rgb;
  vec3 sunWarm = mix(vec3(1.0, 0.42, 0.16), vec3(1.0, 0.98, 0.93), smoothstep(-0.02, 0.28, sunDir.y));
  vec3 directLight = sunWarm * (4.4 + 2.4 * uSilverLining) * (1.0 - 0.48 * uStorminess) * uDaylight;
  vec3 ambientLight = (skyAmb * vec3(0.70, 0.84, 1.04) + vec3(0.015, 0.024, 0.042) * (1.0 - uDaylight)) * (1.0 - 0.30 * uStorminess);

  float coverage = clamp(uCloudAmount, 0.05, 0.96);

  if (uMode < 1.5) {
    // Fast analytic single-slab cloud layer for Medium preset
    float tMid = (1650.0 - uCamPos.y) / max(rd.y, 0.04);
    vec3 p = uCamPos + rd * min(tMid, 24000.0);
    float d = cloudDensityAt(p, coverage) * 750.0;
    float horizonFade = smoothstep(0.015, 0.16, rd.y);
    float od = d * horizonFade;
    float trans = exp(-od);
    float powder = 1.0 - exp(-od * 2.2);
    vec3 col = (directLight * (phase * 1.4 + silver) * powder + ambientLight) * (1.0 - trans);
    gl_FragColor = vec4(col, trans);
    return;
  }

  // Full volumetric raymarching through slab y in [1100m, 2500m]
  float tMin = max(0.0, (1100.0 - uCamPos.y) / rd.y);
  float tMax = min(26000.0, (2500.0 - uCamPos.y) / rd.y);
  if (tMax <= tMin) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  const int STEPS = 20;
  float stepLen = (tMax - tMin) / float(STEPS);
  // Interleaved gradient noise jitter removes slice banding cleanly
  float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float t = tMin + stepLen * jitter;

  vec3 accum = vec3(0.0);
  float trans = 1.0;
  float horizonFade = smoothstep(0.015, 0.14, rd.y);

  for (int i = 0; i < STEPS; i++) {
    vec3 p = uCamPos + rd * t;
    float dens = cloudDensityAt(p, coverage);
    if (dens > 1e-5) {
      // 3-step light march toward sun for self-shadowed dark cloud bellies & sunlit silver tops
      float sunOD = 0.0;
      float lStep = 220.0;
      for (int s = 1; s <= 3; s++) {
        vec3 lp = p + sunDir * (float(s) * lStep);
        sunOD += cloudDensityAt(lp, coverage) * lStep;
      }
      float beer = exp(-sunOD * 1.25);
      float multiScatter = exp(-sunOD * 0.32) * 0.42;
      float powder = 1.0 - exp(-dens * stepLen * 2.4);
      float lightE = max(beer, multiScatter) * (0.45 + 0.55 * powder);

      float hFrac = clamp((p.y - 1100.0) / 1400.0, 0.0, 1.0);
      vec3 scat = directLight * lightE * (phase * 1.65 + silver) + ambientLight * (0.55 + 0.55 * hFrac);

      float stepTrans = exp(-dens * stepLen * horizonFade);
      accum += trans * scat * (1.0 - stepTrans);
      trans *= stepTrans;
      if (trans < 0.02) break;
    }
    t += stepLen;
  }

  // Blend distant clouds softly into horizon atmosphere
  float distFade = exp(-tMin * 0.000045);
  accum *= distFade;
  trans = mix(1.0, trans, distFade);

  gl_FragColor = vec4(accum, trans);
}`;

const PANO_W = 3072;
const PANO_H = 768;
const SLICES = 12;

/**
 * Clouds are raymarched into a camera-centred upper-hemisphere panorama, one horizontal slice per frame.
 * The sky dome, ocean, inland water and IBL sample it, so clouds cost the same at any screen resolution
 * and also appear in reflections.
 */
export class VolumetricClouds implements CloudRenderHook {
  private rt: THREE.WebGLRenderTarget;
  private quadScene: THREE.Scene;
  private quadCam: THREE.OrthographicCamera;
  private mat: THREE.ShaderMaterial;
  private mode: 'off' | 'analytic' | 'volumetric' = 'volumetric';
  private slice = 0;
  private full = true;
  private lastAmount = -1;
  private lastSun = new THREE.Vector3();

  constructor(skyViewTex: THREE.Texture) {
    this.rt = new THREE.WebGLRenderTarget(PANO_W, PANO_H, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.RepeatWrapping,
      depthBuffer: false,
      stencilBuffer: false,
    });
    this.mat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: CLOUDS_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tSkyView: {value: skyViewTex},
        uCamPos: {value: new THREE.Vector3()},
        uSunDir: {value: new THREE.Vector3(0.4, 0.7, 0.5)},
        uTime: {value: 0},
        uCloudAmount: {value: 0.25},
        uStorminess: {value: 0},
        uDaylight: {value: 1},
        uCloudDensity: {value: 0.85},
        uSilverLining: {value: 0.85},
        uMode: {value: 2},
      },
    });
    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    quad.frustumCulled = false;
    this.quadScene.add(quad);
  }

  get texture(): THREE.Texture {
    return this.rt.texture;
  }

  get enabled() {
    return this.mode !== 'off';
  }

  setMode(mode: 'off' | 'analytic' | 'volumetric') {
    if (mode !== this.mode) this.full = true;
    this.mode = mode;
    this.mat.uniforms.uMode.value = mode === 'volumetric' ? 2 : mode === 'analytic' ? 1 : 0;
  }

  /** Re-render the whole panorama next frame (weather jumps, camera teleports). */
  invalidate() {
    this.full = true;
  }

  update(
    renderer: THREE.WebGLRenderer,
    camPos: THREE.Vector3,
    sunDir: THREE.Vector3,
    time: number,
    cloudAmount: number,
    storminess: number,
    daylight: number,
    params: HomeRenderParams,
  ) {
    if (this.mode === 'off' && !this.full) return;
    const u = this.mat.uniforms;
    const amount = Math.max(0.02, Math.min(0.98, cloudAmount + params.cloudCoverageBias));
    if (Math.abs(amount - this.lastAmount) > 0.08 || this.lastSun.dot(sunDir) < 0.995) this.full = true;
    u.uCamPos.value.copy(camPos);
    u.uSunDir.value.copy(sunDir);
    u.uTime.value = time;
    u.uCloudAmount.value = amount;
    u.uStorminess.value = storminess;
    u.uDaylight.value = daylight;
    u.uCloudDensity.value = params.cloudDensity;
    u.uSilverLining.value = params.cloudSilverLining;
    u.uMode.value = this.mode === 'volumetric' ? 2 : this.mode === 'analytic' ? 1 : 0;

    const rows = PANO_H / SLICES;
    if (this.full) {
      this.rt.scissorTest = false;
      this.full = false;
      this.lastAmount = amount;
      this.lastSun.copy(sunDir);
    } else {
      this.rt.scissor.set(0, this.slice * rows, PANO_W, rows);
      this.rt.scissorTest = true;
      this.slice = (this.slice + 1) % SLICES;
      if (this.slice === 0) {
        this.lastAmount = amount;
        this.lastSun.copy(sunDir);
      }
    }
    const prevRT = renderer.getRenderTarget();
    renderer.setRenderTarget(this.rt);
    renderer.render(this.quadScene, this.quadCam);
    renderer.setRenderTarget(prevRT);
    this.rt.scissorTest = false;
  }

  dispose() {
    this.rt.dispose();
    this.mat.dispose();
  }
}
