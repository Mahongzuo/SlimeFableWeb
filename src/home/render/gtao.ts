import * as THREE from 'three';

const FULLSCREEN_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

/**
 * Ground-Truth Ambient Occlusion (Jimenez et al. 2016) at half resolution.
 * Integrates horizon angles along 2 rotated slices x 4 steps per side; normals are rebuilt from depth.
 */
const GTAO_FRAG = `
precision highp float;
#include <packing>
varying vec2 vUv;

uniform sampler2D tDepth;
uniform mat4 uInvProj;
uniform vec2 uRes;
uniform vec2 uDepthTexel;
uniform float uNear;
uniform float uFar;
uniform float uRadius;
uniform float uIntensity;

const float PI = 3.14159265359;

vec3 reconstructViewPos(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  vec4 clip = vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  vec4 view = uInvProj * clip;
  return view.xyz / view.w;
}

// Picks the smaller-depth-step neighbour on each axis so silhouettes do not smear normals.
vec3 reconstructNormal(vec2 uv, vec3 P) {
  vec3 pr = reconstructViewPos(uv + vec2(uDepthTexel.x, 0.0)) - P;
  vec3 pl = P - reconstructViewPos(uv - vec2(uDepthTexel.x, 0.0));
  vec3 pu = reconstructViewPos(uv + vec2(0.0, uDepthTexel.y)) - P;
  vec3 pd = P - reconstructViewPos(uv - vec2(0.0, uDepthTexel.y));
  vec3 dx = abs(pr.z) < abs(pl.z) ? pr : pl;
  vec3 dy = abs(pu.z) < abs(pd.z) ? pu : pd;
  return normalize(cross(dx, dy));
}

float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

void main() {
  float d0 = texture2D(tDepth, vUv).x;
  if (d0 >= 0.9992) {
    gl_FragColor = vec4(1.0);
    return;
  }
  vec3 P = reconstructViewPos(vUv);
  float viewZ = -P.z;
  // Fade GTAO beyond 120m so distant ocean/cliffs stay clean
  float distFade = 1.0 - smoothstep(65.0, 130.0, viewZ);
  if (distFade <= 0.01) {
    gl_FragColor = vec4(1.0);
    return;
  }

  vec3 N = reconstructNormal(vUv, P);
  vec3 V = normalize(-P);

  // Project world radius to screen pixels
  float pxRadius = clamp((uRadius * uRes.y * 0.45) / max(viewZ, 0.4), 3.0, 42.0);
  float noise = ign(gl_FragCoord.xy);
  float jitter = ign(gl_FragCoord.xy + vec2(17.3, 31.7));

  float visibility = 0.0;
  const int SLICES = 2;
  const int STEPS = 4;

  for (int s = 0; s < SLICES; s++) {
    float phi = (float(s) + noise) * (PI / float(SLICES));
    vec2 omega = vec2(cos(phi), sin(phi));
    vec3 dir = vec3(omega, 0.0);
    vec3 orthoDir = dir - dot(dir, V) * V;
    vec3 axis = normalize(cross(orthoDir, V));
    vec3 projN = N - axis * dot(N, axis);
    float projLen = max(length(projN), 1e-4);
    float cosN = clamp(dot(projN / projLen, V), -1.0, 1.0);
    float sgnN = sign(dot(orthoDir, projN));
    float nAng = sgnN * acos(cosN);

    float h1 = -1.0;
    float h2 = -1.0;

    for (int st = 1; st <= STEPS; st++) {
      float frac = (float(st) - 0.5 + jitter * 0.5) / float(STEPS);
      vec2 off = (omega * pxRadius * frac * frac) / uRes;

      vec2 uv1 = clamp(vUv + off, vec2(0.002), vec2(0.998));
      vec3 dP1 = reconstructViewPos(uv1) - P;
      float l1 = length(dP1);
      float fall1 = clamp(1.0 - (l1 / uRadius) * (l1 / uRadius), 0.0, 1.0);
      float c1 = dot(dP1 / max(l1, 1e-4), V);
      h1 = max(h1, mix(-1.0, c1, fall1));

      vec2 uv2 = clamp(vUv - off, vec2(0.002), vec2(0.998));
      vec3 dP2 = reconstructViewPos(uv2) - P;
      float l2 = length(dP2);
      float fall2 = clamp(1.0 - (l2 / uRadius) * (l2 / uRadius), 0.0, 1.0);
      float c2 = dot(dP2 / max(l2, 1e-4), V);
      h2 = max(h2, mix(-1.0, c2, fall2));
    }

    float a1 = nAng + max(-acos(clamp(h2, -1.0, 1.0)) - nAng, -PI * 0.5);
    float a2 = nAng + min(acos(clamp(h1, -1.0, 1.0)) - nAng, PI * 0.5);

    float int1 = 0.25 * (-cos(2.0 * a1 - nAng) + cosN + 2.0 * a1 * sin(nAng));
    float int2 = 0.25 * (-cos(2.0 * a2 - nAng) + cosN + 2.0 * a2 * sin(nAng));
    visibility += projLen * (int1 + int2);
  }

  float ao = clamp(visibility / float(SLICES), 0.0, 1.0);
  ao = pow(ao, uIntensity);
  ao = mix(1.0, ao, distFade);
  gl_FragColor = vec4(ao, ao, ao, 1.0);
}`;

const BILATERAL_FRAG = `
precision highp float;
#include <packing>
varying vec2 vUv;
uniform sampler2D tAO;
uniform sampler2D tDepth;
uniform vec2 uDir;
uniform float uNear;
uniform float uFar;

float linZ(vec2 uv) {
  return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, uNear, uFar);
}

void main() {
  float c0 = texture2D(tAO, vUv).r;
  float z0 = linZ(vUv);
  float sum = c0 * 0.28;
  float wSum = 0.28;
  const float weights[3] = float[3](0.22, 0.10, 0.04);
  for (int i = 1; i <= 3; i++) {
    float fi = float(i);
    for (int s = -1; s <= 1; s += 2) {
      vec2 uv = clamp(vUv + uDir * fi * float(s), vec2(0.002), vec2(0.998));
      float z = linZ(uv);
      float depthW = exp(-abs(z - z0) / max(0.25, z0 * 0.06));
      float w = weights[i - 1] * depthW;
      sum += texture2D(tAO, uv).r * w;
      wSum += w;
    }
  }
  float ao = sum / max(wSum, 1e-4);
  gl_FragColor = vec4(ao, ao, ao, 1.0);
}`;

export class GTAOPass {
  private rawRT: THREE.WebGLRenderTarget;
  private blurRT: THREE.WebGLRenderTarget;
  private outRT: THREE.WebGLRenderTarget;
  private gtaoMat: THREE.ShaderMaterial;
  private blurMat: THREE.ShaderMaterial;
  private quadScene: THREE.Scene;
  private quadCam: THREE.OrthographicCamera;
  private quadMesh: THREE.Mesh;

  constructor() {
    const opts = {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    };
    this.rawRT = new THREE.WebGLRenderTarget(1, 1, opts);
    this.blurRT = new THREE.WebGLRenderTarget(1, 1, opts);
    this.outRT = new THREE.WebGLRenderTarget(1, 1, opts);

    this.gtaoMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: GTAO_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tDepth: {value: null},
        uInvProj: {value: new THREE.Matrix4()},
        uRes: {value: new THREE.Vector2(1, 1)},
        uDepthTexel: {value: new THREE.Vector2(1, 1)},
        uNear: {value: 0.14},
        uFar: {value: 3200},
        uRadius: {value: 1.45},
        uIntensity: {value: 0.72},
      },
    });

    this.blurMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: BILATERAL_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tAO: {value: null},
        tDepth: {value: null},
        uDir: {value: new THREE.Vector2(1, 0)},
        uNear: {value: 0.14},
        uFar: {value: 3200},
      },
    });

    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.gtaoMat);
    this.quadMesh.frustumCulled = false;
    this.quadScene.add(this.quadMesh);
  }

  get texture(): THREE.Texture {
    return this.outRT.texture;
  }

  resize(w: number, h: number) {
    const hw = Math.max(1, Math.floor(w * 0.5));
    const hh = Math.max(1, Math.floor(h * 0.5));
    this.rawRT.setSize(hw, hh);
    this.blurRT.setSize(hw, hh);
    this.outRT.setSize(hw, hh);
    this.gtaoMat.uniforms.uRes.value.set(hw, hh);
    this.gtaoMat.uniforms.uDepthTexel.value.set(1 / Math.max(1, w), 1 / Math.max(1, h));
  }

  render(
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    depthTex: THREE.Texture,
    radius: number,
    intensity: number,
  ) {
    const prevRT = renderer.getRenderTarget();

    // 1. Raw GTAO
    const u = this.gtaoMat.uniforms;
    u.tDepth.value = depthTex;
    u.uInvProj.value.copy(camera.projectionMatrixInverse);
    u.uNear.value = camera.near;
    u.uFar.value = camera.far;
    u.uRadius.value = radius;
    u.uIntensity.value = intensity;
    this.quadMesh.material = this.gtaoMat;
    renderer.setRenderTarget(this.rawRT);
    renderer.render(this.quadScene, this.quadCam);

    // 2. Bilateral horizontal blur
    const bu = this.blurMat.uniforms;
    bu.tDepth.value = depthTex;
    bu.uNear.value = camera.near;
    bu.uFar.value = camera.far;
    bu.tAO.value = this.rawRT.texture;
    bu.uDir.value.set(1 / Math.max(1, this.rawRT.width), 0);
    this.quadMesh.material = this.blurMat;
    renderer.setRenderTarget(this.blurRT);
    renderer.render(this.quadScene, this.quadCam);

    // 3. Bilateral vertical blur
    bu.tAO.value = this.blurRT.texture;
    bu.uDir.value.set(0, 1 / Math.max(1, this.rawRT.height));
    renderer.setRenderTarget(this.outRT);
    renderer.render(this.quadScene, this.quadCam);

    renderer.setRenderTarget(prevRT);
  }

  dispose() {
    this.rawRT.dispose();
    this.blurRT.dispose();
    this.outRT.dispose();
    this.gtaoMat.dispose();
    this.blurMat.dispose();
    this.quadMesh.geometry.dispose();
  }
}
