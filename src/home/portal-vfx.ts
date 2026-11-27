import * as THREE from 'three';
import type {PortalSlot} from './layout';

export const PORTAL_ARCH_W = 0.94;
export const PORTAL_ARCH_H = 2.7;
export const PORTAL_BASE = 0.22;
export const PORTAL_STEP_TOP = PORTAL_BASE + 0.06;

/**
 * Calibrates a gate's 2-color palette into daylight-readable HDR colors:
 * - deep cosmic interior core (provides strong contrast even in bright midday sunlight)
 * - saturated jewel-toned plasma midtone
 * - luminous HDR rim accent (drives real HomePostProcess RGB bloom)
 */
export function calibratePortalColors(hexA: string, hexB: string) {
  const cA = new THREE.Color(hexA);
  const cB = new THREE.Color(hexB);
  const hslA = {h: 0, s: 0, l: 0};
  const hslB = {h: 0, s: 0, l: 0};
  cA.getHSL(hslA);
  cB.getHSL(hslB);

  const core = new THREE.Color().setHSL(
    hslB.h,
    Math.min(0.95, Math.max(0.60, hslB.s * 1.5 + 0.22)),
    0.062,
  );
  const mid = new THREE.Color().setHSL(
    hslA.h,
    Math.min(0.98, Math.max(0.72, hslA.s * 1.58 + 0.26)),
    Math.min(0.56, Math.max(0.42, hslA.l * 1.06)),
  );
  // Subtle hue shift towards luminous cyan/gold highlight for prismatic rim richness
  const rim = new THREE.Color().setHSL(
    (hslA.h + 0.04) % 1,
    Math.min(1.0, Math.max(0.78, hslA.s * 1.45 + 0.3)),
    0.68,
  );
  return {core, mid, rim};
}

const MEMBRANE_VERT = /* glsl */ `
varying vec2 vLocalPos;
varying vec3 vViewLocal;
varying vec4 vScreenPos;

void main() {
  vLocalPos = position.xy;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  // Camera vector in portal local space for true 3D interior parallax
  vec3 camLocal = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
  vViewLocal = normalize(camLocal - position);
  vec4 clip = projectionMatrix * viewMatrix * worldPos;
  vScreenPos = clip;
  gl_Position = clip;
}`;

const MEMBRANE_FRAG = /* glsl */ `
precision highp float;
uniform float uTime, uOpen, uHover, uHasOpaque;
uniform vec3 uCore, uMid, uRim;
uniform sampler2D tOpaqueColor;

varying vec2 vLocalPos;
varying vec3 vViewLocal;
varying vec4 vScreenPos;

const float ARCH_W = ${PORTAL_ARCH_W.toFixed(3)};
const float ARCH_SPRING = ${(PORTAL_BASE + PORTAL_ARCH_H).toFixed(3)};
const float STEP_TOP = ${PORTAL_STEP_TOP.toFixed(3)};
const float CENTER_Y = 1.92;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float s = 0.0, amp = 0.5;
  mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    s += vnoise(p) * amp;
    p = rot * p * 2.03 + vec2(13.7, 7.3);
    amp *= 0.5;
  }
  return s;
}

// Exact signed distance to the arched doorway interior (< 0 inside, 0 on boundary)
float archSDF(vec2 p) {
  vec2 rc = vec2(0.0, (STEP_TOP + ARCH_SPRING) * 0.5);
  vec2 rh = vec2(ARCH_W, (ARCH_SPRING - STEP_TOP) * 0.5);
  vec2 d = abs(p - rc) - rh;
  float rectD = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  float capD = length(p - vec2(0.0, ARCH_SPRING)) - ARCH_W;
  return min(rectD, capD);
}

// Procedural parallax starlight layer
float starLayer(vec2 uv, float scale, float t) {
  vec2 g = uv * scale;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash21(id);
  if (h < 0.78) return 0.0;
  vec2 off = vec2(fract(h * 17.3) - 0.5, fract(h * 31.7) - 0.5) * 0.58;
  float dist = length(f - off);
  float twinkle = 0.55 + 0.45 * sin(t * (2.2 + h * 4.0) + h * 40.0);
  return smoothstep(0.11, 0.01, dist) * twinkle;
}

vec3 iridescence(float phase) {
  return 0.5 + 0.5 * cos(6.2831853 * (phase + vec3(0.0, 0.33, 0.67)));
}

// C-infinity continuous 2D rotation — eliminates atan() -PI/+PI branch-cut horizontal seams completely!
vec2 rot2(vec2 p, float a) {
  float c = cos(a), s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

void main() {
  float sdf = archSDF(vLocalPos);
  float edgeDist = max(0.0, -sdf);
  float speed = 1.0 + 0.65 * uHover;
  float t = uTime * speed;

  // Tangent-space parallax ray offset (3 virtual depth planes for true 3D window illusion)
  vec2 pShift = vViewLocal.xy / max(abs(vViewLocal.z), 0.42);
  vec2 base = (vLocalPos - vec2(0.0, CENTER_Y)) * vec2(1.0, 0.72);
  vec2 uv0 = base + pShift * 0.18;
  vec2 uv1 = base + pShift * 0.52;
  vec2 uv2 = base + pShift * 1.15;

  // 1. Deep parallax abyssal nebula + drifting starfield (depth layer 2)
  float nebula = fbm(uv2 * 2.4 + vec2(cos(t * 0.18), sin(t * 0.14)) * 0.6);
  vec3 cosmos = mix(uCore * 0.42, uCore * 1.65 + uMid * 0.26, nebula);
  float stars = starLayer(uv2 + vec2(t * 0.025, -t * 0.018), 7.5, t)
              + starLayer(uv1 - vec2(t * 0.04, t * 0.025), 5.0, t * 1.3) * 0.78;
  cosmos += mix(uRim, vec3(1.0, 0.98, 0.92), 0.50) * stars * (1.55 + 0.80 * uHover);

  // 2. Seamless logarithmic dual-spiral domain-warped vortex (pure Cartesian rotation, ZERO atan seam!)
  float r0 = length(uv0) + 0.08;
  vec2 swirl0 = rot2(uv0, log(r0) * 3.35 - t * 1.15);
  float warp = fbm(swirl0 * 2.55 + vec2(cos(t * 0.32), sin(t * 0.27)) * 0.55);
  vec2 warped0 = rot2(swirl0, (warp - 0.5) * 1.85);
  float streamA = smoothstep(0.32, 0.74, fbm(warped0 * 3.10 + vec2(0.0, -t * 0.42)));

  float r1 = length(uv1) + 0.10;
  vec2 swirl1 = rot2(uv1, -log(r1) * 2.55 + t * 0.74);
  float streamB = smoothstep(0.36, 0.78, fbm(swirl1 * 2.65 + vec2(warp * 1.35, -t * 0.34)));

  // Crisp glowing filaments inside the dark cosmos
  float filament = pow(max(1e-4, clamp(streamA * 0.76 + streamB * 0.56, 0.0, 1.0)), 1.55);
  vec3 vortexCol = mix(cosmos, uMid * 1.34, streamA * 0.72);
  vortexCol += uRim * filament * (0.86 + 0.60 * uHover);

  // Inner focal time-core pulse + subtle holographic thin-film shimmer
  float coreGlow = exp(-r0 * 3.4) * (0.62 + 0.28 * sin(t * 2.4 - r0 * 5.5));
  float ndv = clamp(abs(vViewLocal.z), 0.0, 1.0);
  vec3 film = iridescence(ndv * 1.8 + warp * 0.9 + uTime * 0.08);
  vortexCol += mix(uRim, vec3(1.0, 0.97, 0.90), 0.36) * coreGlow * (0.78 + 0.65 * uHover);
  vortexCol += film * filament * (1.0 - ndv) * 0.30;

  // 3. Blazing HDR Event Horizon Rim along the exact stone arch contour (periodic Cartesian sampling, zero seam!)
  vec2 rimDir = normalize(vec2(vLocalPos.x, (vLocalPos.y - CENTER_Y) * 0.72) + vec2(1e-4));
  vec2 rimRot = rot2(rimDir, -t * 0.42);
  float rimNoise = fbm(rimRot * 2.8 + vec2(edgeDist * 7.5 - t * 0.65, edgeDist * 4.2));
  float rimTight = exp(-edgeDist * 28.0);
  float rimWisp = exp(-edgeDist * 9.0) * smoothstep(0.30, 0.76, rimNoise);
  float rimStrength = (rimTight * 1.15 + rimWisp * 0.80) * (1.05 + 0.60 * uHover);
  // Output > 1.25 linear HDR so HomePostProcess extracts crisp colored RGB bloom without night whiteout
  vec3 rimCol = mix(uMid * 1.60, uRim * 2.15 + vec3(0.24), clamp(rimTight + 0.30 * uHover, 0.0, 1.0));
  vec3 col = vortexCol + rimCol * rimStrength;

  // 4. Subtle gravitational-lens screen-space refraction confined strictly to the outer arch edge
  float innerAlpha = smoothstep(0.0, 0.058, edgeDist);
  float bottomFade = smoothstep(0.0, 0.075, vLocalPos.y - STEP_TOP);
  if (uHasOpaque > 0.5) {
    vec2 suv = vScreenPos.xy / vScreenPos.w * 0.5 + 0.5;
    vec2 lensOff = normalize(base + vec2(1e-4)) * (0.011 * rimWisp * (1.0 + 0.45 * uHover));
    vec3 bg = texture2D(tOpaqueColor, clamp(suv + lensOff, vec2(0.002), vec2(0.998))).rgb;
    float veil = smoothstep(0.015, 0.095, edgeDist);
    col = mix(bg * 0.65 + rimCol * rimTight * 1.15, col, mix(0.35, 1.0, veil));
  }

  // Softly compress peak linear radiance so dusk/night auto-exposure preserves vivid color
  col = min(col, vec3(2.65));

  // Opening iris wipe when a gate turns on/off
  float iris = smoothstep(0.0, 0.35, uOpen * 1.35 - r0 * 0.45);
  float alpha = clamp((0.97 + 0.025 * uHover) * innerAlpha * bottomFade * uOpen * iris, 0.0, 0.995);
  gl_FragColor = vec4(max(col, vec3(0.0)), alpha);
}`;

const RIBBON_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const RIBBON_FRAG = /* glsl */ `
precision highp float;
uniform float uTime, uOpen, uHover;
uniform vec3 uMid, uRim;
varying vec2 vUv;

float hash21(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.5);
  return fract(p.x * p.y);
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

void main() {
  // vUv.x = arc progress 0..1 around arch; vUv.y = ribbon width 0..1
  float t = uTime * (1.2 + 0.8 * uHover);
  float across = clamp(1.0 - abs(vUv.y * 2.0 - 1.0), 0.0, 1.0);
  float n1 = vnoise(vec2(vUv.x * 12.0 - t * 1.6, vUv.y * 3.0 + sin(vUv.x * 6.283 + t)));
  float n2 = vnoise(vec2(vUv.x * 24.0 + t * 1.1, vUv.y * 5.0 - t * 0.5));
  float wisp = smoothstep(0.28, 0.82, n1 * 0.65 + n2 * 0.35) * pow(max(across, 1e-4), 1.35);
  float ends = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
  vec3 col = mix(uMid, uRim, smoothstep(0.35, 0.9, wisp + 0.25 * uHover)) * (1.8 + 1.1 * uHover);
  float a = wisp * ends * uOpen * (0.58 + 0.32 * uHover);
  gl_FragColor = vec4(col, a);
}`;

const FLOOR_AURA_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FLOOR_AURA_FRAG = /* glsl */ `
precision highp float;
uniform float uTime, uOpen, uHover;
uniform vec3 uMid, uRim;
varying vec2 vUv;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float a = atan(p.y, p.x);
  float t = uTime * (0.85 + 0.55 * uHover);

  // Expanding concentric threshold pulse + astrolabe rune dial ticks
  float pulse = fract(r * 2.6 - t * 0.45);
  float ring = smoothstep(0.0, 0.12, pulse) * (1.0 - smoothstep(0.12, 0.42, pulse));
  float outerRing = exp(-abs(r - 0.76) * 34.0);
  float innerRing = exp(-abs(r - 0.52) * 38.0);
  float ticks = smoothstep(0.76, 0.94, cos((a + t * 0.22) * 12.0)) * smoothstep(0.50, 0.56, r) * (1.0 - smoothstep(0.72, 0.78, r));
  float glow = (1.0 - smoothstep(0.0, 0.95, r)) * 0.45;

  float energy = (glow + ring * 0.38 * (1.0 - r) + (outerRing + innerRing * 0.75 + ticks * 0.65) * 0.72) * (0.75 + 0.65 * uHover);
  vec3 col = mix(uMid, uRim, clamp(outerRing + ticks * 0.6, 0.0, 1.0)) * (1.4 + 0.9 * uHover);
  gl_FragColor = vec4(col, clamp(energy * uOpen * 0.65, 0.0, 0.9));
}`;

export interface PortalVfxUniforms {
  uTime: {value: number};
  uOpen: {value: number};
  uHover: {value: number};
  uHasOpaque: {value: number};
  uCore: {value: THREE.Color};
  uMid: {value: THREE.Color};
  uRim: {value: THREE.Color};
  tOpaqueColor: {value: THREE.Texture | null};
}

export function createPortalMembraneMaterial(opaqueTex: THREE.Texture | null): {
  material: THREE.ShaderMaterial;
  uniforms: PortalVfxUniforms;
} {
  const uniforms: PortalVfxUniforms = {
    uTime: {value: 0},
    uOpen: {value: 0},
    uHover: {value: 0},
    uHasOpaque: {value: opaqueTex ? 1 : 0},
    uCore: {value: new THREE.Color('#0a1c26')},
    uMid: {value: new THREE.Color('#34b8a8')},
    uRim: {value: new THREE.Color('#9ff7ef')},
    tOpaqueColor: {value: opaqueTex},
  };
  const material = new THREE.ShaderMaterial({
    uniforms: uniforms as any,
    vertexShader: MEMBRANE_VERT,
    fragmentShader: MEMBRANE_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return {material, uniforms};
}

/** Builds a non-overlapping curved 3D energy ribbon hugging the inside of the stone arch. */
export function createPortalArchRibbons(uniforms: PortalVfxUniforms): THREE.Mesh {
  const r = PORTAL_ARCH_W - 0.04;
  const springY = PORTAL_BASE + PORTAL_ARCH_H;
  const pts: [number, number][] = [];
  // Left leg up -> semicircular arch -> right leg down
  const legSegs = 10;
  for (let i = 0; i < legSegs; i++) {
    const f = i / legSegs;
    pts.push([-r, PORTAL_STEP_TOP + f * (springY - PORTAL_STEP_TOP)]);
  }
  const arcSegs = 24;
  for (let i = 0; i <= arcSegs; i++) {
    const ang = Math.PI - (i / arcSegs) * Math.PI;
    pts.push([Math.cos(ang) * r, springY + Math.sin(ang) * r]);
  }
  for (let i = 1; i <= legSegs; i++) {
    const f = i / legSegs;
    pts.push([r, springY - f * (springY - PORTAL_STEP_TOP)]);
  }

  // Two symmetric ribbon strips offset cleanly along Z (±0.08..±0.20) so they never touch z=0 membrane or stone arch
  const verts: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let vBase = 0;
  for (const zSign of [-1, 1]) {
    const zNear = zSign * 0.06;
    const zFar = zSign * 0.21;
    for (let i = 0; i < pts.length; i++) {
      const [px, py] = pts[i];
      const u = i / (pts.length - 1);
      verts.push(px, py, zNear, px, py, zFar);
      uvs.push(u, 0, u, 1);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = vBase + i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    vBase += pts.length * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: uniforms.uTime,
      uOpen: uniforms.uOpen,
      uHover: uniforms.uHover,
      uMid: uniforms.uMid,
      uRim: uniforms.uRim,
    },
    vertexShader: RIBBON_VERT,
    fragmentShader: RIBBON_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'fx-portal-arch-ribbon';
  mesh.layers.set(1);
  mesh.renderOrder = 6;
  return mesh;
}

/** Ground rune threshold caustic pool resting cleanly over the plinth step (zero Z-fighting). */
export function createPortalFloorAura(uniforms: PortalVfxUniforms): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(2.55, 2.55).rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: uniforms.uTime,
      uOpen: uniforms.uOpen,
      uHover: uniforms.uHover,
      uMid: uniforms.uMid,
      uRim: uniforms.uRim,
    },
    vertexShader: FLOOR_AURA_VERT,
    fragmentShader: FLOOR_AURA_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'fx-portal-floor-aura';
  mesh.position.y = PORTAL_STEP_TOP + 0.012;
  mesh.layers.set(1);
  mesh.renderOrder = 4;
  return mesh;
}

const PARTICLE_VERT = /* glsl */ `
attribute float aSlot;
attribute vec4 aSeed; // x: phase0, y: speed, z: angle/offset, w: kind (<0.5 vortex, >=0.5 rising spark)

uniform float uTime;
uniform vec3 uSlotPos[6];
uniform float uSlotYaw[6];
uniform vec3 uSlotCol[6];
uniform float uSlotOpen[6];
uniform float uSlotHover[6];

varying vec3 vColor;
varying float vAlpha;

void main() {
  int idx = int(clamp(floor(aSlot + 0.5), 0.0, 5.0));
  vec3 origin = uSlotPos[idx];
  float yaw = uSlotYaw[idx];
  vec3 col = uSlotCol[idx];
  float openAmt = uSlotOpen[idx];
  float hover = uSlotHover[idx];

  float spd = aSeed.y * (1.0 + 0.65 * hover);
  float life = fract(aSeed.x + uTime * spd);
  vec3 localP;
  float alpha = sin(life * 3.14159265) * openAmt;

  if (aSeed.w < 0.5) {
    // Type 0: Spiral inward along the arch into the central dimensional vortex
    float r = mix(1.02, 0.06, pow(max(life, 1e-4), 0.78));
    float ang = aSeed.z + life * 4.4;
    localP = vec3(
      cos(ang) * r * 0.90,
      1.86 + sin(ang) * r * 1.28,
      sin(life * 6.2831 + aSeed.z) * 0.24 * (1.0 - life * 0.6)
    );
    localP.y = max(${PORTAL_STEP_TOP.toFixed(2)} + 0.08, localP.y);
  } else {
    // Type 1: Luminous time-embers rising gently from the threshold & pillars
    float side = (aSeed.z - 0.5) * 1.75;
    localP = vec3(
      side + sin(uTime * 1.5 + aSeed.x * 20.0) * 0.16,
      ${PORTAL_STEP_TOP.toFixed(2)} + 0.08 + life * 3.35,
      cos(uTime * 1.3 + aSeed.z * 14.0) * 0.34
    );
  }

  float c = cos(yaw), s = sin(yaw);
  vec3 worldP = origin + vec3(localP.x * c + localP.z * s, localP.y, -localP.x * s + localP.z * c);

  vec4 mv = modelViewMatrix * vec4(worldP, 1.0);
  gl_Position = projectionMatrix * mv;
  float sizeScale = aSeed.w < 0.5 ? mix(1.25, 0.55, life) : (0.65 + 0.55 * sin(life * 3.14159));
  gl_PointSize = clamp((36.0 * sizeScale * (1.0 + 0.32 * hover)) / max(1.0, -mv.z), 1.5, 16.0) * step(0.02, openAmt);

  vColor = col * (2.1 + 1.1 * hover);
  vAlpha = alpha * (0.85 + 0.15 * hover);
}`;

const PARTICLE_FRAG = /* glsl */ `
precision highp float;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  float core = exp(-r2 * 5.2);
  float halo = (1.0 - r2) * 0.42;
  vec3 c = mix(vColor, vec3(1.0, 0.99, 0.95) * 2.2, core * 0.65);
  gl_FragColor = vec4(c, (core + halo) * vAlpha);
}`;

/**
 * Single-draw-call GPU particle field driving vortex motes & rising sparks for all 6 Home portals.
 */
export class PortalParticleField {
  readonly points: THREE.Points;
  readonly material: THREE.ShaderMaterial;
  readonly particleCount: number;
  private uniforms: any;

  constructor(slots: PortalSlot[], perPortal = 44) {
    const count = Math.min(6, slots.length) * perPortal;
    this.particleCount = count;
    const positions = new Float32Array(count * 3);
    const slotAttr = new Float32Array(count);
    const seedAttr = new Float32Array(count * 4);

    let rng = 918273;
    const rand = () => ((rng = (Math.imul(1664525, rng) + 1013904223) | 0) >>> 0) / 4294967296;

    for (let s = 0; s < Math.min(6, slots.length); s++) {
      const origin = slots[s].position;
      for (let i = 0; i < perPortal; i++) {
        const k = s * perPortal + i;
        positions[k * 3] = origin[0];
        positions[k * 3 + 1] = origin[1] + 1.8;
        positions[k * 3 + 2] = origin[2];
        slotAttr[k] = s;
        const isSpark = i >= perPortal * 0.55 ? 1 : 0;
        seedAttr[k * 4] = rand();
        seedAttr[k * 4 + 1] = isSpark ? 0.16 + rand() * 0.18 : 0.22 + rand() * 0.24;
        seedAttr[k * 4 + 2] = isSpark ? rand() : rand() * Math.PI * 2;
        seedAttr[k * 4 + 3] = isSpark;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSlot', new THREE.BufferAttribute(slotAttr, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seedAttr, 4));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(10, 2, 17), 18);

    const slotPos = Array.from({length: 6}, (_, i) =>
      slots[i] ? new THREE.Vector3(...slots[i].position) : new THREE.Vector3(),
    );
    const slotYaw = Array.from({length: 6}, (_, i) => slots[i]?.yaw ?? 0);
    const slotCol = Array.from({length: 6}, () => new THREE.Color('#7ff2e2'));
    const slotOpen = [0, 0, 0, 0, 0, 0];
    const slotHover = [0, 0, 0, 0, 0, 0];

    this.uniforms = {
      uTime: {value: 0},
      uSlotPos: {value: slotPos},
      uSlotYaw: {value: slotYaw},
      uSlotCol: {value: slotCol},
      uSlotOpen: {value: slotOpen},
      uSlotHover: {value: slotHover},
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.name = 'fx-portal-particles';
    this.points.layers.set(1);
    this.points.renderOrder = 7;
    this.points.frustumCulled = false;
  }

  sync(time: number, portals: {openLevel: number; hover: number; rimColor: THREE.Color}[]) {
    this.uniforms.uTime.value = time;
    for (let i = 0; i < Math.min(6, portals.length); i++) {
      this.uniforms.uSlotOpen.value[i] = portals[i].openLevel;
      this.uniforms.uSlotHover.value[i] = portals[i].hover;
      this.uniforms.uSlotCol.value[i].copy(portals[i].rimColor);
    }
  }

  dispose() {
    this.points.removeFromParent();
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
