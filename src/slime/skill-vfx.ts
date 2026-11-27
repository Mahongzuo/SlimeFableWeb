import type {SkillDef} from './skills';
import type {Vec} from './types';

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
  isWave: boolean;
  aimed: boolean;
  trailAcc: number;
}

interface ActiveTimedFx {
  age: number;
  life: number;
  update: (t: number, dt: number) => void;
  dispose: () => void;
}

// Element palettes: [coreHDR, midHDR, edgeHDR] — crisp HDR saturation for real bloom without harsh outlines
const EL_PAL: readonly (readonly [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]])[] = [
  [[1.35, 1.95, 2.20], [0.22, 0.88, 1.75], [0.08, 0.36, 1.05]], // 0 Water: ice-foam -> azure -> cobalt
  [[1.45, 2.10, 1.65], [0.24, 1.48, 0.82], [0.08, 0.65, 0.42]], // 1 Wind: mint-white -> emerald -> jade
  [[2.35, 2.05, 1.15], [1.95, 0.68, 0.14], [1.15, 0.16, 0.04]], // 2 Fire: incandescent -> flame -> crimson ember
  [[1.95, 1.75, 2.45], [0.92, 0.46, 2.15], [0.42, 0.14, 1.25]], // 3 Volt: plasma-white -> violet -> indigo
  [[1.65, 1.12, 2.25], [0.68, 0.24, 1.38], [0.18, 0.06, 0.42]], // 4 Dark: lilac-star -> void-violet -> abyss
  [[2.20, 2.05, 1.48], [1.65, 1.28, 0.46], [0.95, 0.64, 0.18]], // 5 Physical: sunlit-white -> gold -> bronze
];

const EL_HEX = [0x3da8ff, 0x3be085, 0xff6b1a, 0x9b66ff, 0x7b42d6, 0xf2c96b] as const;
const EL_CORE = [0xd6f6ff, 0xd8ffea, 0xfff0a8, 0xf0e4ff, 0xd8b4ff, 0xfffbe6] as const;

const NIAGARA_MAX = 2600;

const NIAGARA_VERT = `
attribute vec3 aColor;
attribute float aSize;
attribute float aAlpha;
attribute float aShape;
varying vec3 vColor;
varying float vAlpha;
varying float vShape;
void main() {
  vColor = aColor;
  vAlpha = aAlpha;
  vShape = aShape;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = max(0.75, -mv.z);
  gl_PointSize = clamp(aSize * (340.0 / dist), 1.5, 68.0);
}
`;

const NIAGARA_FRAG = `
precision highp float;
varying vec3 vColor;
varying float vAlpha;
varying float vShape;
void main() {
  if (vAlpha <= 0.004) discard;
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;

  float m = 0.0;
  vec3 col = vColor;
  if (vShape < 0.5) {
    // 0: Soft glowing ember/mote with hot pinpoint center
    float halo = exp(-r * r * 4.8) * (1.0 - smoothstep(0.72, 1.0, r));
    float hot = exp(-r * r * 20.0);
    m = halo * 0.78 + hot * 0.65;
    col = mix(vColor, vColor * 1.45 + vec3(0.35), hot);
  } else if (vShape < 1.5) {
    // 1: Crisp 4-point anime star sparkle / glint
    float ax = abs(p.x), ay = abs(p.y);
    float crossArm = exp(-ax * 13.0) * exp(-ay * 2.6) + exp(-ay * 13.0) * exp(-ax * 2.6);
    float core = exp(-r * r * 16.0);
    m = clamp(crossArm * 0.72 + core * 0.95, 0.0, 1.0) * (1.0 - smoothstep(0.75, 1.0, r));
    col = mix(vColor, vec3(1.4), core * 0.65);
  } else if (vShape < 2.5) {
    // 2: Iridescent hollow water bubble ring + upper-left specular glint
    float rim = exp(-pow((r - 0.74) * 9.5, 2.0));
    float spec = exp(-dot(p - vec2(-0.30, -0.32), p - vec2(-0.30, -0.32)) * 28.0);
    float fill = (1.0 - r * r) * 0.14;
    m = clamp(rim * 0.85 + spec * 0.95 + fill, 0.0, 1.0) * (1.0 - smoothstep(0.88, 1.0, r));
    col = mix(vColor, vec3(1.5, 1.7, 1.85), spec * 0.8 + rim * 0.25);
  } else if (vShape < 3.5) {
    // 3: Electric plasma diamond spark
    float d = abs(p.x) * 1.15 + abs(p.y) * 1.15;
    float spark = exp(-d * 5.2) * (1.0 - smoothstep(0.7, 1.0, d));
    float hot = exp(-r * r * 24.0);
    m = clamp(spark * 0.85 + hot, 0.0, 1.0);
    col = mix(vColor, vec3(1.6, 1.45, 2.0), hot * 0.75);
  } else {
    // 4: Abyssal wisp ring with bright glowing violet edge
    float edge = exp(-pow((r - 0.56) * 7.0, 2.0));
    float mist = exp(-r * r * 3.8) * 0.45;
    m = clamp(edge * 0.85 + mist, 0.0, 1.0) * (1.0 - smoothstep(0.8, 1.0, r));
  }

  float a = clamp(m * vAlpha, 0.0, 1.0);
  if (a < 0.008) discard;
  gl_FragColor = vec4(col * a, a);
}
`;

// Razor-fine shader-driven ground wave / rune ring (replaces chunky flat RingGeometry!)
const WAVE_RING_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const WAVE_RING_FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec3 uColor;
uniform vec3 uCore;
uniform float uProgress;
uniform float uTime;
uniform float uMode; // 0 = expanding shockwave, 1 = rotating arcane rune circle
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float ang = atan(p.y, p.x);

  if (uMode < 0.5) {
    // Delicate thin wave crest + trailing inner shimmer
    float e = 1.0 - (1.0 - uProgress) * (1.0 - uProgress);
    float targetR = mix(0.14, 0.94, e);
    float ripple = sin(ang * 8.0 + uTime * 7.0) * 0.012 + sin(ang * 14.0 - uTime * 5.0) * 0.007;
    float d = abs(r - (targetR + ripple));
    float thinRim = exp(-d * 42.0);
    float innerTail = smoothstep(targetR - 0.16, targetR, r) * (1.0 - smoothstep(targetR, targetR + 0.04, r)) * 0.35;
    float fade = (1.0 - uProgress) * (1.0 - uProgress * 0.45);
    float m = (thinRim + innerTail) * fade;
    if (m < 0.01) discard;
    vec3 col = mix(uColor, uCore, clamp(thinRim * 1.15, 0.0, 1.0));
    gl_FragColor = vec4(col * m, clamp(m, 0.0, 0.92));
  } else {
    // Intricate thin rotating arcane magic sigil (concentric hairline circles + star ticks)
    float fade = uProgress;
    float a1 = ang + uTime * 1.3;
    float a2 = ang - uTime * 2.1;
    float rOut = exp(-abs(r - 0.92) * 58.0);
    float rMid = exp(-abs(r - 0.72) * 62.0) * (0.55 + 0.45 * sin(a1 * 12.0));
    float rIn = exp(-abs(r - 0.40) * 56.0);
    float ticks = exp(-abs(r - 0.82) * 28.0) * smoothstep(0.65, 0.96, abs(cos(a2 * 12.0)));
    float hex = exp(-abs(r - (0.64 + 0.075 * cos(a1 * 6.0))) * 52.0) * 0.82;
    float glow = exp(-r * r * 5.5) * 0.22;
    float m = clamp((rOut + rMid * 0.85 + rIn * 0.72 + ticks * 0.78 + hex + glow) * fade, 0.0, 1.0);
    if (m < 0.01) discard;
    vec3 col = mix(uColor, uCore, clamp(rOut + rIn + ticks * 0.6, 0.0, 1.0));
    gl_FragColor = vec4(col * m, clamp(m * 0.92, 0.0, 0.92));
  }
}
`;

// Thin-film iridescent Fresnel bubble dome shader (crystal-clear center, delicate rainbow rim)
const BUBBLE_DOME_VERT = `
varying vec3 vNormalV;
varying vec3 vViewPos;
varying vec3 vLocal;
void main() {
  vLocal = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = -mv.xyz;
  vNormalV = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
`;

const BUBBLE_DOME_FRAG = `
precision highp float;
varying vec3 vNormalV;
varying vec3 vViewPos;
varying vec3 vLocal;
uniform vec3 uColor;
uniform vec3 uCore;
uniform float uAlpha;
uniform float uTime;
void main() {
  vec3 N = normalize(vNormalV);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vViewPos);
  float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);
  float fresnel = pow(1.0 - ndv, 2.8);
  // Subtle soap-film rainbow shimmer along the dome surface
  float film = sin(vLocal.y * 12.0 + vLocal.x * 6.0 - uTime * 3.8) * 0.5 + 0.5;
  vec3 irid = mix(uColor, vec3(0.75, 1.45, 1.85), film * 0.55);
  irid = mix(irid, uCore, fresnel * 0.85);
  float caustics = pow(0.5 + 0.5 * sin(vLocal.x * 16.0 + uTime * 4.5) * cos(vLocal.z * 16.0 - uTime * 3.2), 4.0) * 0.25;
  float alpha = (0.045 + fresnel * 0.72 + caustics * fresnel) * uAlpha;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(irid * (0.7 + fresnel * 1.15), clamp(alpha, 0.0, 0.85));
}
`;

interface ParticleSpawnOpts {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number;
  size: number;
  element: number;
  shape?: number; // 0 soft, 1 star, 2 bubble, 3 spark, 4 void
  drag?: number;
  ay?: number;
  swirl?: number;
  pull?: number;
  ax?: number;
  az?: number;
  intensity?: number;
}

/**
 * Niagara-style GPU Particle + Fine Shader 3D Skill VFX System.
 * Zero heavy primitive outlines: relies on 2,600 HDR additive GPU particles,
 * vortex curl physics, fractal lightning forks, Fresnel soap-bubble domes,
 * and delicate rotating rune/shockwave shaders.
 */
export class SkillVfxSystem {
  private T: any;
  readonly root: any;
  private projectiles: ActiveProjectile[] = [];
  private fxList: ActiveTimedFx[] = [];
  private time = 0;

  // Flat typed-array Niagara particle pool (zero per-frame GC)
  private pPos = new Float32Array(NIAGARA_MAX * 3);
  private pCol = new Float32Array(NIAGARA_MAX * 3);
  private pSize = new Float32Array(NIAGARA_MAX);
  private pAlpha = new Float32Array(NIAGARA_MAX);
  private pShape = new Float32Array(NIAGARA_MAX);

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
    this.pGeo = new T.BufferGeometry();
    this.pGeo.setAttribute('position', new T.BufferAttribute(this.pPos, 3).setUsage(T.DynamicDrawUsage));
    this.pGeo.setAttribute('aColor', new T.BufferAttribute(this.pCol, 3).setUsage(T.DynamicDrawUsage));
    this.pGeo.setAttribute('aSize', new T.BufferAttribute(this.pSize, 1).setUsage(T.DynamicDrawUsage));
    this.pGeo.setAttribute('aAlpha', new T.BufferAttribute(this.pAlpha, 1).setUsage(T.DynamicDrawUsage));
    this.pGeo.setAttribute('aShape', new T.BufferAttribute(this.pShape, 1).setUsage(T.DynamicDrawUsage));
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
    this.pAlpha[i] = 0.01;
  }

  private defaultShape(el: number, idx: number): number {
    if (el === 0) return idx % 3 === 0 ? 2 : idx % 5 === 0 ? 1 : 0; // Water: bubbles + glints + mist
    if (el === 1) return idx % 2 === 0 ? 1 : 0; // Wind: star glints + airy motes
    if (el === 2) return idx % 4 === 0 ? 1 : 0; // Fire: soft hot embers + sparks
    if (el === 3) return idx % 2 === 0 ? 3 : 1; // Volt: diamond electric sparks + glints
    if (el === 4) return idx % 3 === 0 ? 4 : 1; // Dark: void wisps + star dust
    return idx % 2 === 0 ? 1 : 0; // Physical: gilded star sparkles + fine dust
  }

  private emitRadialBurst(center: Vec, element: number, count: number, radius: number, speed: number, lift = 1.6, shape?: number) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const elev = (Math.random() - 0.18) * 1.1;
      const sp = speed * (0.45 + Math.random() * 0.85);
      const r0 = Math.random() * radius * 0.25;
      this.emit({
        x: center[0] + Math.cos(a) * r0,
        y: center[1] + 0.18 + Math.random() * 0.32,
        z: center[2] + Math.sin(a) * r0,
        vx: Math.cos(a) * Math.cos(elev) * sp,
        vy: Math.sin(elev) * sp * 0.7 + lift * (0.4 + Math.random() * 0.8),
        vz: Math.sin(a) * Math.cos(elev) * sp,
        life: 0.34 + Math.random() * 0.44,
        size: 0.055 + Math.random() * 0.11,
        element,
        shape: shape ?? this.defaultShape(element, i),
        drag: 3.1 + Math.random() * 1.8,
        ay: element === 2 || element === 1 ? 1.4 : element === 0 ? -3.6 : -2.2,
        intensity: 1.05 + Math.random() * 0.45,
      });
    }
  }

  private makeShaderDisc(radius: number, element: number, mode: 0 | 1) {
    const T = this.T;
    const pal = EL_PAL[element] ?? EL_PAL[0];
    const geo = new T.PlaneGeometry(radius * 2, radius * 2).rotateX(-Math.PI / 2);
    const mat = new T.ShaderMaterial({
      vertexShader: WAVE_RING_VERT,
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
      },
    });
    return this.prepMesh(new T.Mesh(geo, mat), 23);
  }

  /** Niagara-style crisp forward dash burst & elemental wake for Home exploration right-click dash. */
  spawnHomeDashFx(origin: Vec, dir: Vec, element: number) {
    const fl = Math.hypot(dir[0], dir[2]) || 1;
    const fx = dir[0] / fl, fz = dir[2] / fl;
    const rx = -fz, rz = fx;
    this.spawnShockRing(origin, 0.25, 1.35, element, 0.30);
    for (let i = 0; i < 42; i++) {
      const side = (Math.random() - 0.5) * 0.65;
      const back = Math.random() * 0.45;
      const sp = 1.6 + Math.random() * 3.8;
      this.emit({
        x: origin[0] + rx * side - fx * back,
        y: origin[1] + 0.14 + Math.random() * 0.36,
        z: origin[2] + rz * side - fz * back,
        vx: -fx * sp + rx * (side * 2.2),
        vy: 0.4 + Math.random() * 1.4,
        vz: -fz * sp + rz * (side * 2.2),
        life: 0.26 + Math.random() * 0.32,
        size: 0.045 + Math.random() * 0.085,
        element,
        shape: this.defaultShape(element, i),
        drag: 4.0,
        ay: element === 2 || element === 1 ? 1.2 : -1.0,
        intensity: 1.15,
      });
    }
  }

  /** Spawns the full 3D visual & gameplay hitbox behavior for any of the 18 ARPG skills. */
  triggerSkill(def: SkillDef, origin: Vec, forward: Vec, cb: SkillEffectCallbacks, aimPoint?: Vec, dashEnd?: Vec) {
    const fl = Math.hypot(forward[0], forward[2]) || 1;
    const fx = forward[0] / fl, fz = forward[2] / fl;

    if (def.archetype === 'projectile' || def.archetype === 'wave') {
      if (cb.castWall) {
        const muzzle: Vec = [origin[0] + fx * .65, origin[1] + .52, origin[2] + fz * .65];
        const wall = cb.castWall([origin[0], origin[1] + .52, origin[2]], muzzle);
        if (wall) {
          this.emitRadialBurst(wall, def.element, 28, 0.4, 3.2);
          cb.onSpawnBurst(wall, def.element, 12, 1.8);
          return;
        }
      }
      this.spawnProjectile(def, origin, [fx, 0, fz], def.archetype === 'wave', aimPoint);
      this.emitRadialBurst([origin[0] + fx * 0.55, origin[1] + 0.35, origin[2] + fz * 0.55], def.element, 22, 0.35, 3.0);
      cb.onSpawnBurst([origin[0] + fx * 0.6, origin[1] + 0.45, origin[2] + fz * 0.6], def.element, 10, 1.8);
      return;
    }

    if (def.archetype === 'sweep') {
      // Water R: shimmering thin water wave rings + spiraling hydro spray & iridescent bubbles
      this.spawnShockRing(origin, 0.55, def.radius * 1.18, def.element, 0.50);
      this.spawnShockRing([origin[0], origin[1] + 0.22, origin[2]], 0.35, def.radius * 0.92, def.element, 0.40);
      for (let i = 0; i < 110; i++) {
        const a = (i / 110) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
        const r = 0.4 + Math.random() * def.radius * 0.45;
        this.emit({
          x: origin[0] + Math.cos(a) * r,
          y: origin[1] + 0.16 + Math.random() * 0.45,
          z: origin[2] + Math.sin(a) * r,
          vx: Math.cos(a) * (3.5 + Math.random() * 3.8) - Math.sin(a) * 3.2,
          vy: 1.2 + Math.random() * 2.8,
          vz: Math.sin(a) * (3.5 + Math.random() * 3.8) + Math.cos(a) * 3.2,
          life: 0.42 + Math.random() * 0.45,
          size: 0.06 + Math.random() * 0.12,
          element: def.element,
          shape: i % 3 === 0 ? 2 : i % 5 === 0 ? 1 : 0,
          drag: 2.6,
          ay: -4.2,
          swirl: 3.5,
          ax: origin[0],
          az: origin[2],
          intensity: 1.2,
        });
      }
      cb.onSpawnBurst(origin, def.element, 24, 4.0);
      cb.onSkillHitArea(origin, def, false);
      return;
    }

    if (def.archetype === 'dome') {
      this.spawnBubbleDome(origin, def, cb);
      return;
    }

    if (def.archetype === 'dash') {
      const dist = def.dashDist ?? 4.0;
      const endPos: Vec = dashEnd ?? [origin[0] + fx * dist, origin[1], origin[2] + fz * dist];
      this.spawnDashRibbon(origin, endPos, def.element, def.slot === 'Q');
      this.emitRadialBurst(origin, def.element, 32, 0.4, 3.6);
      this.emitRadialBurst(endPos, def.element, def.slot === 'Q' ? 95 : 54, 0.65, def.slot === 'Q' ? 6.2 : 4.2);
      cb.onSpawnBurst(origin, def.element, 14, 2.5);
      cb.onSpawnBurst(endPos, def.element, def.slot === 'Q' ? 32 : 18, def.slot === 'Q' ? 4.4 : 3.0);
      if (def.slot === 'Q') {
        this.spawnShockRing(endPos, 0.45, def.radius * 1.25, def.element, 0.56);
        this.spawnShockRing([endPos[0], endPos[1] + 0.25, endPos[2]], 0.30, def.radius * 0.95, def.element, 0.44);
      }
      const mid: Vec = [(origin[0] + endPos[0]) * 0.5, origin[1], (origin[2] + endPos[2]) * 0.5];
      cb.onSkillHitArea(mid, def, def.slot === 'Q');
      cb.onSkillHitArea(endPos, def, def.slot === 'Q');
      return;
    }

    if (def.archetype === 'vortex') {
      this.spawnWindVortex(origin, def, cb);
      return;
    }

    if (def.archetype === 'bolt') {
      const aimPos = aimPoint ?? this.findAimPoint(origin, [fx, 0, fz], def.range * 0.65, cb);
      this.spawnLightningBolt(aimPos, 9.8, def.element);
      this.spawnShockRing(aimPos, 0.3, def.radius * 1.15, def.element, 0.42);
      this.emitRadialBurst(aimPos, def.element, 75, 0.5, 5.4, 2.2, 3);
      cb.onSpawnBurst(aimPos, def.element, 22, 3.4);
      cb.onSkillHitArea(aimPos, def, false);
      return;
    }

    if (def.archetype === 'chain') {
      this.spawnChainLightning(origin, [fx, 0, fz], def, cb, aimPoint);
      return;
    }

    if (def.archetype === 'storm') {
      const center: Vec = aimPoint ? [...aimPoint] : [origin[0] + fx * def.range, origin[1], origin[2] + fz * def.range];
      const ty = cb.sampleTerrain(center[0], center[2]);
      if (!aimPoint && ty !== null) center[1] = ty;
      this.spawnElementStorm(center, def, cb);
      return;
    }

    if (def.archetype === 'field') {
      const center: Vec = aimPoint ? [...aimPoint] : [origin[0] + fx * def.range, origin[1], origin[2] + fz * def.range];
      const ty = cb.sampleTerrain(center[0], center[2]);
      if (!aimPoint && ty !== null) center[1] = ty;
      this.spawnDarkField(center, def, cb);
      return;
    }

    if (def.archetype === 'meteor') {
      const target = aimPoint ?? this.findAimPoint(origin, [fx, 0, fz], def.range, cb);
      this.spawnDarkMeteor(target, def, cb);
      return;
    }

    if (def.archetype === 'slam' || def.archetype === 'leap_slam') {
      const impact: Vec = aimPoint ? [...aimPoint] : [origin[0] + fx * (def.range * 0.65), origin[1], origin[2] + fz * (def.range * 0.65)];
      const ty = cb.sampleTerrain(impact[0], impact[2]);
      if (!aimPoint && ty !== null) impact[1] = ty;
      this.spawnPhysicalQuake(impact, def, def.archetype === 'leap_slam');
      cb.onSpawnBurst(impact, def.element, def.archetype === 'leap_slam' ? 36 : 20, def.archetype === 'leap_slam' ? 4.8 : 3.2);
      cb.onSkillHitArea(impact, def, def.archetype === 'leap_slam');
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

  private spawnProjectile(def: SkillDef, origin: Vec, forward: Vec, isWave: boolean, aimPoint?: Vec) {
    const T = this.T;
    const g = new T.Group();
    const elHex = EL_HEX[def.element] ?? 0xffffff;
    const coreHex = EL_CORE[def.element] ?? 0xffffff;

    if (isWave) {
      // Sleek razor-thin golden crescent sword-qi arc (additive fine energy blade, zero chunky torus!)
      const bladeGeo = new T.TorusGeometry(0.76, 0.036, 8, 32, Math.PI * 0.78);
      const blade = new T.Mesh(
        bladeGeo,
        new T.MeshBasicMaterial({color: coreHex, transparent: true, opacity: 0.96, blending: T.AdditiveBlending, depthWrite: false}),
      );
      blade.rotation.z = -Math.PI * 0.39;
      const glow = new T.Mesh(
        new T.TorusGeometry(0.77, 0.085, 8, 32, Math.PI * 0.84),
        new T.MeshBasicMaterial({color: elHex, transparent: true, opacity: 0.42, blending: T.AdditiveBlending, depthWrite: false}),
      );
      glow.rotation.z = -Math.PI * 0.42;
      g.add(this.prepMesh(glow, 24), this.prepMesh(blade, 25));
      g.rotation.y = Math.atan2(forward[0], forward[2]) + Math.PI * 0.5;
    } else {
      // Compact luminous pinpoint energy nucleus (Niagara particle wake provides the rich visual silhouette!)
      const core = new T.Mesh(
        new T.SphereGeometry(0.115, 14, 10),
        new T.MeshBasicMaterial({color: coreHex, transparent: true, opacity: 0.98, blending: T.AdditiveBlending, depthWrite: false}),
      );
      const aura = new T.Mesh(
        new T.SphereGeometry(0.22, 16, 12),
        new T.MeshBasicMaterial({color: elHex, transparent: true, opacity: 0.38, blending: T.AdditiveBlending, depthWrite: false}),
      );
      g.add(this.prepMesh(aura, 24), this.prepMesh(core, 25));
    }

    const start: Vec = [origin[0] + forward[0] * 0.62, origin[1] + 0.50, origin[2] + forward[2] * 0.62];
    g.position.set(start[0], start[1], start[2]);
    this.root.add(g);

    const speed = def.projectileSpeed ?? 14;
    this.projectiles.push({
      def,
      pos: start,
      vel: [
        forward[0] * speed,
        aimPoint ? speed * (aimPoint[1] + .52 - start[1]) / Math.max(.4, Math.hypot(aimPoint[0] - start[0], aimPoint[2] - start[2])) : 0,
        forward[2] * speed,
      ],
      age: 0,
      maxAge: Math.max(0.55, def.range / speed),
      mesh: g,
      isWave,
      aimed: !!aimPoint,
      trailAcc: 0,
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

  private spawnDashRibbon(start: Vec, end: Vec, element: number, isUlt: boolean) {
    const dx = end[0] - start[0], dz = end[2] - start[2];
    const len = Math.max(0.5, Math.hypot(dx, dz));
    const fx = dx / len, fz = dz / len;
    const rx = -fz, rz = fx;
    const count = isUlt ? 110 : 62;
    for (let i = 0; i < count; i++) {
      const f = Math.random();
      const spread = (Math.random() - 0.5) * (isUlt ? 0.95 : 0.52);
      const px = start[0] + dx * f + rx * spread;
      const pz = start[2] + dz * f + rz * spread;
      const py = start[1] + 0.16 + Math.random() * (isUlt ? 0.85 : 0.48);
      this.emit({
        x: px, y: py, z: pz,
        vx: -fx * (1.5 + Math.random() * 3.2) + rx * (spread * 2.5),
        vy: 0.4 + Math.random() * 1.9,
        vz: -fz * (1.5 + Math.random() * 3.2) + rz * (spread * 2.5),
        life: 0.30 + Math.random() * 0.42,
        size: 0.045 + Math.random() * (isUlt ? 0.11 : 0.08),
        element,
        shape: this.defaultShape(element, i),
        drag: 3.4,
        ay: element === 2 || element === 1 ? 1.5 : -0.8,
        intensity: isUlt ? 1.35 : 1.1,
      });
    }
  }

  private spawnBubbleDome(origin: Vec, def: SkillDef, cb: SkillEffectCallbacks) {
    const T = this.T;
    const pal = EL_PAL[def.element] ?? EL_PAL[0];
    const g = new T.Group();
    g.position.set(origin[0], origin[1] + 0.04, origin[2]);

    // Crystal-clear thin-film iridescent Fresnel dome (NO opaque blue shell!)
    const domeGeo = new T.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const domeMat = new T.ShaderMaterial({
      vertexShader: BUBBLE_DOME_VERT,
      fragmentShader: BUBBLE_DOME_FRAG,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      side: T.DoubleSide,
      uniforms: {
        uColor: {value: new T.Vector3(...pal[1])},
        uCore: {value: new T.Vector3(...pal[0])},
        uAlpha: {value: 1},
        uTime: {value: 0},
      },
    });
    const dome = this.prepMesh(new T.Mesh(domeGeo, domeMat), 24);
    const rune = this.makeShaderDisc(def.radius * 1.05, def.element, 1);
    rune.position.y = 0.04;
    g.add(dome, rune);
    this.root.add(g);

    let burstFired = false;
    let bubbleAcc = 0;
    this.fxList.push({
      age: 0,
      life: 1.25,
      update: (t, dt) => {
        const expand = Math.min(1, t / 0.30);
        const eased = 1 - (1 - expand) * (1 - expand);
        const curR = 0.45 + (def.radius - 0.45) * eased;
        dome.scale.set(curR, curR * 0.72, curR);
        const fade = t < 0.72 ? 1 : (1 - t) / 0.28;
        domeMat.uniforms.uAlpha.value = fade;
        domeMat.uniforms.uTime.value = this.time;
        rune.material.uniforms.uProgress.value = fade * 0.85;
        rune.material.uniforms.uTime.value = this.time;

        // Continuously rise dozens of delicate iridescent ring bubbles & mist motes inside the dome
        bubbleAcc += dt * 115;
        while (bubbleAcc >= 1 && t < 0.85) {
          bubbleAcc -= 1;
          const a = Math.random() * Math.PI * 2;
          const d = Math.sqrt(Math.random()) * curR * 0.92;
          this.emit({
            x: origin[0] + Math.cos(a) * d,
            y: origin[1] + 0.10 + Math.random() * 0.25,
            z: origin[2] + Math.sin(a) * d,
            vx: -Math.sin(a) * 0.7 + (Math.random() - 0.5) * 0.4,
            vy: 1.3 + Math.random() * 2.1,
            vz: Math.cos(a) * 0.7 + (Math.random() - 0.5) * 0.4,
            life: 0.48 + Math.random() * 0.45,
            size: 0.06 + Math.random() * 0.13,
            element: def.element,
            shape: Math.random() < 0.65 ? 2 : 1,
            drag: 1.5,
            ay: 0.8,
            swirl: 1.6,
            ax: origin[0],
            az: origin[2],
            intensity: 1.15,
          });
        }
        if (!burstFired && t >= 0.30) {
          burstFired = true;
          this.spawnShockRing(origin, 0.5, def.radius * 1.25, def.element, 0.48);
          this.emitRadialBurst(origin, def.element, 95, def.radius * 0.4, 5.2, 2.4, 2);
          cb.onSpawnBurst(origin, def.element, 30, 4.5);
          cb.onSkillHitArea(origin, def, true);
        }
      },
      dispose: () => {
        g.removeFromParent();
        domeGeo.dispose(); domeMat.dispose();
        rune.geometry.dispose(); rune.material.dispose();
      },
    });
  }

  private spawnWindVortex(origin: Vec, def: SkillDef, cb: SkillEffectCallbacks) {
    const rune = this.makeShaderDisc(def.radius * 0.95, def.element, 1);
    rune.position.set(origin[0], origin[1] + 0.08, origin[2]);
    this.root.add(rune);

    let hits = 0;
    let spawnAcc = 0;
    const totalHits = def.multiHits ?? 3;
    this.fxList.push({
      age: 0,
      life: def.duration ?? 1.4,
      update: (t, dt) => {
        const fade = t > 0.75 ? (1 - t) / 0.25 : Math.min(1, t / 0.12);
        rune.material.uniforms.uProgress.value = fade * 0.85;
        rune.material.uniforms.uTime.value = this.time * 2.2;

        // 240 particles/sec swirling in a fine emerald tornado helix
        spawnAcc += dt * 240;
        while (spawnAcc >= 1 && t < 0.88) {
          spawnAcc -= 1;
          const a = Math.random() * Math.PI * 2;
          const r = 0.28 + Math.random() * (def.radius * 0.52);
          const tanSpd = 4.2 + Math.random() * 2.8;
          this.emit({
            x: origin[0] + Math.cos(a) * r,
            y: origin[1] + 0.08 + Math.random() * 0.35,
            z: origin[2] + Math.sin(a) * r,
            vx: -Math.sin(a) * tanSpd + Math.cos(a) * 0.65,
            vy: 2.2 + Math.random() * 2.4,
            vz: Math.cos(a) * tanSpd + Math.sin(a) * 0.65,
            life: 0.48 + Math.random() * 0.42,
            size: 0.045 + Math.random() * 0.095,
            element: def.element,
            shape: Math.random() < 0.48 ? 1 : 0,
            drag: 1.4,
            ay: 1.8,
            swirl: 8.5,
            pull: -1.1, // gently widens upward into a funnel
            ax: origin[0],
            az: origin[2],
            intensity: 1.15,
          });
        }

        const expected = Math.floor(t * totalHits) + 1;
        if (hits < Math.min(totalHits, expected)) {
          hits++;
          this.spawnShockRing(origin, 0.3, def.radius * 1.05, def.element, 0.34);
          cb.onSpawnBurst(origin, def.element, 12, 3.0);
          cb.onSkillHitArea(origin, def, false);
        }
      },
      dispose: () => {
        rune.removeFromParent();
        rune.geometry.dispose();
        rune.material.dispose();
      },
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
        a[1] + (b[1] - a[1]) * f + (Math.random() - 0.5) * j * 0.65,
        a[2] + (b[2] - a[2]) * f + (Math.random() - 0.5) * j,
      ));
    }
    return pts;
  }

  private spawnLightningBolt(target: Vec, height: number, element: number) {
    const T = this.T;
    const elHex = EL_HEX[element] ?? 0x9b66ff;
    const coreHex = EL_CORE[element] ?? 0xf0e4ff;
    const g = new T.Group();
    const disposables: {geo: any; mat: any}[] = [];

    const top: Vec = [target[0] + (Math.random() - 0.5) * 0.7, target[1] + height, target[2] + (Math.random() - 0.5) * 0.7];
    // Main jagged white-hot bolt + 2 offset parallel aura arcs + 3 branching sub-forks (zero fat cylinder!)
    const mainPts = this.buildJaggedPoints(top, target, 16, 0.68);
    const makeArc = (pts: any[], hex: number, opacity: number, order: number) => {
      const geo = new T.BufferGeometry().setFromPoints(pts);
      const mat = new T.LineBasicMaterial({color: hex, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false});
      g.add(this.prepMesh(new T.Line(geo, mat), order));
      disposables.push({geo, mat});
    };
    makeArc(mainPts, coreHex, 1.0, 27);
    makeArc(this.buildJaggedPoints(top, target, 14, 0.92), elHex, 0.85, 26);

    // 3 branching electric forks shooting off mid-bolt
    for (let f = 0; f < 3; f++) {
      const idx = 4 + f * 3;
      const p = mainPts[Math.min(mainPts.length - 2, idx)];
      const ang = Math.random() * Math.PI * 2;
      const reach = 0.8 + Math.random() * 1.1;
      const forkEnd: Vec = [p.x + Math.cos(ang) * reach, Math.max(target[1] + 0.2, p.y - 1.5 - Math.random() * 1.6), p.z + Math.sin(ang) * reach];
      makeArc(this.buildJaggedPoints([p.x, p.y, p.z], forkEnd, 7, 0.36), f === 0 ? coreHex : elHex, 0.78, 26);
    }

    // Emit crisp electric sparks along the entire bolt column
    for (let i = 0; i < 36; i++) {
      const p = mainPts[Math.floor(Math.random() * mainPts.length)];
      this.emit({
        x: p.x, y: p.y, z: p.z,
        vx: (Math.random() - 0.5) * 3.8,
        vy: (Math.random() - 0.4) * 2.5,
        vz: (Math.random() - 0.5) * 3.8,
        life: 0.22 + Math.random() * 0.28,
        size: 0.04 + Math.random() * 0.08,
        element,
        shape: 3,
        drag: 4.5,
        intensity: 1.4,
      });
    }

    this.root.add(g);
    this.fxList.push({
      age: 0,
      life: 0.34,
      update: (t) => {
        const flicker = Math.sin(t * 68) > -0.35 ? 1 : 0.28;
        const fade = (1 - t) * flicker;
        for (const d of disposables) d.mat.opacity = fade;
      },
      dispose: () => {
        g.removeFromParent();
        for (const d of disposables) { d.geo.dispose(); d.mat.dispose(); }
      },
    });
  }

  private spawnChainLightning(origin: Vec, forward: Vec, def: SkillDef, cb: SkillEffectCallbacks, aimPoint?: Vec) {
    const T = this.T;
    const elHex = EL_HEX[def.element] ?? 0x9b66ff;
    const coreHex = EL_CORE[def.element] ?? 0xf0e4ff;
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
      this.emitRadialBurst(hitPos, def.element, 42, 0.4, 4.4, 1.8, 3);
      cb.onSpawnBurst(hitPos, def.element, 12, 2.2);
      cb.onSkillHitArea(hitPos, {...def, radius: 1.6}, false);
      cur = hitPos;
    }

    if (chainPts.length === 1) {
      const end: Vec = [origin[0] + forward[0] * 5.2, origin[1] + 0.45, origin[2] + forward[2] * 5.2];
      chainPts.push(end);
      this.emitRadialBurst(end, def.element, 55, 0.45, 4.8, 1.8, 3);
      cb.onSpawnBurst(end, def.element, 16, 2.6);
      if (!cb.blocked?.(origin, end)) cb.onSkillHitArea(end, {...def, radius: 2.2}, false);
    }

    const g = new T.Group();
    const disposables: {geo: any; mat: any}[] = [];
    for (let i = 0; i < chainPts.length - 1; i++) {
      const a = chainPts[i], b = chainPts[i + 1];
      const p1 = this.buildJaggedPoints(a, b, 10, 0.34);
      const p2 = this.buildJaggedPoints(a, b, 9, 0.52);
      for (const [pts, hex, op] of [[p1, coreHex, 1.0], [p2, elHex, 0.8]] as const) {
        const geo = new T.BufferGeometry().setFromPoints(pts);
        const mat = new T.LineBasicMaterial({color: hex, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false});
        g.add(this.prepMesh(new T.Line(geo, mat), 27));
        disposables.push({geo, mat});
      }
      // Fine electric sparks trailing along the arc segment
      for (let s = 0; s < 14; s++) {
        const p = p1[Math.floor(Math.random() * p1.length)];
        this.emit({
          x: p.x, y: p.y, z: p.z,
          vx: (Math.random() - 0.5) * 3.0,
          vy: 0.6 + Math.random() * 2.0,
          vz: (Math.random() - 0.5) * 3.0,
          life: 0.24 + Math.random() * 0.24,
          size: 0.04 + Math.random() * 0.07,
          element: def.element,
          shape: 3,
          drag: 4.0,
          intensity: 1.35,
        });
      }
    }
    this.root.add(g);
    this.spawnShockRing(chainPts[chainPts.length - 1], 0.25, 1.9, def.element, 0.34);

    this.fxList.push({
      age: 0,
      life: 0.38,
      update: (t) => {
        const op = (1 - t) * (Math.sin(t * 62) > -0.35 ? 1 : 0.32);
        for (const d of disposables) d.mat.opacity = op;
      },
      dispose: () => {
        g.removeFromParent();
        for (const d of disposables) { d.geo.dispose(); d.mat.dispose(); }
      },
    });
  }

  private spawnElementStorm(center: Vec, def: SkillDef, cb: SkillEffectCallbacks) {
    const rune = this.makeShaderDisc(def.radius * 1.05, def.element, 1);
    rune.position.set(center[0], center[1] + 0.08, center[2]);
    this.root.add(rune);

    const isFire = def.element === 2;
    const totalStrikes = def.multiHits ?? 4;
    let struck = 0;
    let ambientAcc = 0;

    this.fxList.push({
      age: 0,
      life: def.duration ?? 1.55,
      update: (t, dt) => {
        const fade = t > 0.78 ? (1 - t) / 0.22 : Math.min(1, t / 0.10);
        rune.material.uniforms.uProgress.value = fade * 0.92;
        rune.material.uniforms.uTime.value = this.time * 1.6;

        // Rising ambient embers / crackling plasma sparks inside the magic array
        ambientAcc += dt * 95;
        while (ambientAcc >= 1 && t < 0.88) {
          ambientAcc -= 1;
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * def.radius * 0.95;
          this.emit({
            x: center[0] + Math.cos(a) * r,
            y: center[1] + 0.08,
            z: center[2] + Math.sin(a) * r,
            vx: -Math.sin(a) * 1.1,
            vy: 1.8 + Math.random() * 2.6,
            vz: Math.cos(a) * 1.1,
            life: 0.40 + Math.random() * 0.45,
            size: 0.045 + Math.random() * 0.085,
            element: def.element,
            shape: isFire ? (Math.random() < 0.25 ? 1 : 0) : 3,
            drag: 1.6,
            ay: isFire ? 2.2 : 0.6,
            swirl: 2.5,
            ax: center[0],
            az: center[2],
            intensity: 1.25,
          });
        }

        const want = Math.floor(t * totalStrikes) + 1;
        if (struck < Math.min(totalStrikes, want)) {
          const idx = struck++;
          const ang = (idx / totalStrikes) * Math.PI * 2 + 0.4;
          const dist = idx === 0 ? 0 : def.radius * 0.52;
          const sx = center[0] + Math.cos(ang) * dist;
          const sz = center[2] + Math.sin(ang) * dist;
          const sy = cb.sampleTerrain(sx, sz) ?? center[1];
          const spot: Vec = [sx, sy, sz];
          if (isFire) {
            this.spawnFirePlume(spot, def.element);
          } else {
            this.spawnLightningBolt(spot, 10.5, def.element);
          }
          this.spawnShockRing(spot, 0.35, 2.5, def.element, 0.38);
          this.emitRadialBurst(spot, def.element, 55, 0.45, 4.8, 2.6);
          cb.onSpawnBurst(spot, def.element, 18, 3.6);
          cb.onSkillHitArea(spot, {...def, radius: def.radius * 0.62, damage: Math.round(def.damage / totalStrikes * 1.4)}, idx === 0);
        }
      },
      dispose: () => {
        rune.removeFromParent();
        rune.geometry.dispose();
        rune.material.dispose();
      },
    });
  }

  /** Niagara helical roaring flame & ember plume (replaces chunky solid CylinderGeometry fire pillar!). */
  private spawnFirePlume(spot: Vec, element: number) {
    let emitAcc = 0;
    this.fxList.push({
      age: 0,
      life: 0.52,
      update: (t, dt) => {
        emitAcc += dt * 320 * (1 - t * 0.7);
        while (emitAcc >= 1) {
          emitAcc -= 1;
          const a = Math.random() * Math.PI * 2;
          const r = 0.08 + Math.random() * 0.52;
          const hotCore = r < 0.24;
          this.emit({
            x: spot[0] + Math.cos(a) * r,
            y: spot[1] + 0.08 + Math.random() * 0.45,
            z: spot[2] + Math.sin(a) * r,
            vx: -Math.sin(a) * 2.6 + Math.cos(a) * 0.9,
            vy: 4.8 + Math.random() * 4.5,
            vz: Math.cos(a) * 2.6 + Math.sin(a) * 0.9,
            life: 0.34 + Math.random() * 0.42,
            size: hotCore ? 0.09 + Math.random() * 0.12 : 0.045 + Math.random() * 0.08,
            element,
            shape: hotCore ? 0 : (Math.random() < 0.35 ? 1 : 0),
            drag: 1.8,
            ay: 3.4,
            swirl: 6.2,
            pull: 0.8,
            ax: spot[0],
            az: spot[2],
            intensity: hotCore ? 1.55 : 1.15,
          });
        }
      },
      dispose: () => {},
    });
  }

  private spawnDarkField(center: Vec, def: SkillDef, cb: SkillEffectCallbacks) {
    const T = this.T;
    const g = new T.Group();
    g.position.set(center[0], center[1] + 0.08, center[2]);
    const rune = this.makeShaderDisc(def.radius * 1.05, def.element, 1);
    const singularity = this.prepMesh(new T.Mesh(
      new T.OctahedronGeometry(0.18, 1),
      new T.MeshBasicMaterial({color: EL_CORE[def.element], transparent: true, opacity: 0.92, blending: T.AdditiveBlending, depthWrite: false}),
    ), 25);
    singularity.position.y = 0.65;
    g.add(rune, singularity);
    this.root.add(g);

    let ticks = 0;
    let wispAcc = 0;
    const totalTicks = def.multiHits ?? 5;
    this.fxList.push({
      age: 0,
      life: def.duration ?? 4.0,
      update: (t, dt) => {
        singularity.rotation.y += dt * 4.5;
        singularity.rotation.x += dt * 2.2;
        singularity.position.y = 0.62 + Math.sin(t * 16) * 0.10;
        const fade = t > 0.82 ? (1 - t) / 0.18 : Math.min(1, t / 0.08);
        rune.material.uniforms.uProgress.value = fade * 0.95;
        rune.material.uniforms.uTime.value = this.time * 1.3;
        singularity.material.opacity = 0.92 * fade;

        // Inward-spiraling abyssal star-dust & void wisps
        wispAcc += dt * 115;
        while (wispAcc >= 1 && t < 0.92) {
          wispAcc -= 1;
          const a = Math.random() * Math.PI * 2;
          const r = 0.45 + Math.random() * (def.radius * 0.95);
          this.emit({
            x: center[0] + Math.cos(a) * r,
            y: center[1] + 0.08 + Math.random() * 0.35,
            z: center[2] + Math.sin(a) * r,
            vx: -Math.cos(a) * 1.5 - Math.sin(a) * 2.2,
            vy: 0.9 + Math.random() * 1.6,
            vz: -Math.sin(a) * 1.5 + Math.cos(a) * 2.2,
            life: 0.55 + Math.random() * 0.50,
            size: 0.05 + Math.random() * 0.095,
            element: def.element,
            shape: Math.random() < 0.55 ? 4 : 1,
            drag: 1.5,
            ay: 0.5,
            swirl: 4.5,
            pull: 2.8,
            ax: center[0],
            az: center[2],
            intensity: 1.2,
          });
        }

        const want = Math.floor(t * totalTicks) + 1;
        if (ticks < Math.min(totalTicks, want)) {
          ticks++;
          this.spawnShockRing(center, 0.25, def.radius * 0.95, def.element, 0.38);
          cb.onSpawnBurst(center, def.element, 10, 2.5);
          cb.onSkillHitArea(center, def, false);
        }
      },
      dispose: () => {
        g.removeFromParent();
        rune.geometry.dispose(); rune.material.dispose();
        singularity.geometry.dispose(); singularity.material.dispose();
      },
    });
  }

  private spawnDarkMeteor(target: Vec, def: SkillDef, cb: SkillEffectCallbacks) {
    const T = this.T;
    const rune = this.makeShaderDisc(def.radius * 1.02, def.element, 1);
    rune.position.set(target[0], target[1] + 0.08, target[2]);
    this.root.add(rune);

    // Compact obsidian-crystal star core (surrounded by rich blazing violet comet tail particles!)
    const meteor = new T.Group();
    const rock = this.prepMesh(new T.Mesh(
      new T.IcosahedronGeometry(0.46, 1),
      new T.MeshStandardMaterial({color: 0x1a0d30, emissive: EL_HEX[def.element], emissiveIntensity: 1.6, roughness: 0.35, metalness: 0.3}),
    ), 25);
    const core = this.prepMesh(new T.Mesh(
      new T.SphereGeometry(0.62, 16, 12),
      new T.MeshBasicMaterial({color: EL_HEX[def.element], transparent: true, opacity: 0.42, blending: T.AdditiveBlending, depthWrite: false}),
    ), 26);
    meteor.add(rock, core);
    const startPos: Vec = [target[0] - 2.8, target[1] + 10.5, target[2] - 2.2];
    meteor.position.set(...startPos);
    this.root.add(meteor);

    let impacted = false;
    let tailAcc = 0;
    this.fxList.push({
      age: 0,
      life: 1.15,
      update: (t, dt) => {
        rock.rotation.x += dt * 5.0;
        rock.rotation.y += dt * 7.0;
        rune.material.uniforms.uTime.value = this.time * 2.4;
        const fallT = Math.min(1, t / 0.46);
        const easeFall = fallT * fallT;
        if (!impacted) {
          const mx = startPos[0] + (target[0] - startPos[0]) * easeFall;
          const my = startPos[1] + (target[1] + 0.45 - startPos[1]) * easeFall;
          const mz = startPos[2] + (target[2] - startPos[2]) * easeFall;
          meteor.position.set(mx, my, mz);
          // Blazing dense comet-tail particle stream
          tailAcc += dt * 280;
          while (tailAcc >= 1) {
            tailAcc -= 1;
            this.emit({
              x: mx + (Math.random() - 0.5) * 0.45,
              y: my + (Math.random() - 0.5) * 0.45,
              z: mz + (Math.random() - 0.5) * 0.45,
              vx: (Math.random() - 0.5) * 1.8 - 0.8,
              vy: 2.2 + Math.random() * 2.8,
              vz: (Math.random() - 0.5) * 1.8 - 0.6,
              life: 0.30 + Math.random() * 0.38,
              size: 0.055 + Math.random() * 0.12,
              element: def.element,
              shape: Math.random() < 0.45 ? 1 : 4,
              drag: 2.2,
              intensity: 1.4,
            });
          }
          if (fallT >= 1) {
            impacted = true;
            meteor.visible = false;
            this.spawnShockRing(target, 0.4, def.radius * 1.35, def.element, 0.58);
            this.spawnShockRing([target[0], target[1] + 0.22, target[2]], 0.25, def.radius * 1.0, def.element, 0.44);
            this.emitRadialBurst(target, def.element, 140, 0.65, 6.8, 3.0);
            cb.onSpawnBurst(target, def.element, 36, 5.2);
            cb.onSkillHitArea(target, def, true);
          }
        }
        rune.material.uniforms.uProgress.value = impacted ? Math.max(0, (1 - (t - 0.46) / 0.54) * 0.9) : 0.92;
      },
      dispose: () => {
        rune.removeFromParent(); rune.geometry.dispose(); rune.material.dispose();
        meteor.removeFromParent(); rock.geometry.dispose(); rock.material.dispose();
        core.geometry.dispose(); core.material.dispose();
      },
    });
  }

  private spawnPhysicalQuake(center: Vec, def: SkillDef, isUlt: boolean) {
    this.spawnShockRing(center, 0.35, def.radius * (isUlt ? 1.32 : 1.05), def.element, isUlt ? 0.58 : 0.42);
    this.spawnShockRing([center[0], center[1] + 0.20, center[2]], 0.20, def.radius * 0.88, def.element, isUlt ? 0.46 : 0.32);

    // Fountain of gilded star sparks & radial golden dust
    this.emitRadialBurst(center, def.element, isUlt ? 130 : 68, def.radius * 0.35, isUlt ? 6.4 : 4.4, isUlt ? 3.4 : 2.2);

    // Slender crystalline gilded energy lances (fine sharp faceted prisms instead of clunky thick cones!)
    const T = this.T;
    const g = new T.Group();
    g.position.set(center[0], center[1], center[2]);
    const count = isUlt ? 12 : 6;
    const lanceGeo = new T.ConeGeometry(isUlt ? 0.085 : 0.065, isUlt ? 1.35 : 0.88, 4).translate(0, isUlt ? 0.67 : 0.44, 0);
    const lanceMat = new T.MeshBasicMaterial({
      color: EL_CORE[def.element],
      transparent: true,
      opacity: 0.92,
      blending: T.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const dist = def.radius * (isUlt ? 0.62 : 0.54);
      const sp = this.prepMesh(new T.Mesh(lanceGeo, lanceMat), 25);
      sp.position.set(Math.cos(a) * dist, 0, Math.sin(a) * dist);
      sp.rotation.z = -Math.cos(a) * 0.36;
      sp.rotation.x = Math.sin(a) * 0.36;
      g.add(sp);
    }
    this.root.add(g);

    this.fxList.push({
      age: 0,
      life: isUlt ? 0.64 : 0.44,
      update: (t) => {
        const rise = Math.min(1, t / 0.14);
        const fade = t > 0.45 ? 1 - (t - 0.45) / 0.55 : 1;
        g.scale.set(1, Math.max(0.01, rise * (0.4 + 0.6 * fade)), 1);
        lanceMat.opacity = 0.92 * fade;
      },
      dispose: () => {
        g.removeFromParent();
        lanceGeo.dispose();
        lanceMat.dispose();
      },
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
      let vy = (this.pVelY[i] + this.pAy[i] * dt) * drag;
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

      // Smooth Niagara color-over-life gradient (incandescent core -> vivid mid -> rich trailing edge)
      const pal = EL_PAL[this.pEl[i]] ?? EL_PAL[0];
      const c0 = t < 0.35 ? pal[0] : pal[1];
      const c1 = t < 0.35 ? pal[1] : pal[2];
      const f = t < 0.35 ? t / 0.35 : (t - 0.35) / 0.65;
      const inten = this.pIntensity[i];
      this.pCol[i * 3] = (c0[0] + (c1[0] - c0[0]) * f) * inten;
      this.pCol[i * 3 + 1] = (c0[1] + (c1[1] - c0[1]) * f) * inten;
      this.pCol[i * 3 + 2] = (c0[2] + (c1[2] - c0[2]) * f) * inten;

      // Crisp birth pop + graceful long taper-out
      const fadeIn = Math.min(1, t / 0.12);
      const fadeOut = (1 - t) * (1 - t);
      this.pAlpha[i] = fadeIn * fadeOut;
      this.pSize[i] = this.pBaseSize[i] * (0.45 + 0.75 * fadeIn) * (1 - 0.55 * t);
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
    }
  }

  update(dt: number, cb: SkillEffectCallbacks) {
    this.time += dt;
    // 1. Step active projectiles & emit continuous helical Niagara trails
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

      // Continuous helical fine trail particles behind every projectile & sword-qi wave
      p.trailAcc += dt * (p.isWave ? 170 : 135);
      while (p.trailAcc >= 1) {
        p.trailAcc -= 1;
        const a = this.time * 18 + Math.random() * Math.PI * 2;
        const rad = p.isWave ? 0.55 * (Math.random() - 0.5) : 0.14;
        this.emit({
          x: p.pos[0] + Math.cos(a) * rad,
          y: p.pos[1] + Math.sin(a) * rad,
          z: p.pos[2] + (Math.random() - 0.5) * 0.16,
          vx: -p.vel[0] * 0.12 + (Math.random() - 0.5) * 1.2,
          vy: (p.def.element === 2 ? 0.9 : 0.25) + (Math.random() - 0.5) * 0.9,
          vz: -p.vel[2] * 0.12 + (Math.random() - 0.5) * 1.2,
          life: 0.26 + Math.random() * 0.30,
          size: 0.04 + Math.random() * 0.075,
          element: p.def.element,
          shape: this.defaultShape(p.def.element, Math.floor(Math.random() * 6)),
          drag: 3.4,
          ay: p.def.element === 2 ? 1.4 : -0.6,
          intensity: 1.2,
        });
      }

      let hitTarget = false;
      for (const tp of targets) {
        const heightGap = cb.castWall ? tp[1] + .52 - p.pos[1] : 0;
        if (Math.hypot(tp[0] - p.pos[0], heightGap, tp[2] - p.pos[2]) < (p.isWave ? 1.5 : 1.05)) {
          hitTarget = true;
          break;
        }
      }
      if (wall || hitTarget || p.age >= p.maxAge) {
        this.spawnShockRing(p.pos, 0.25, p.def.radius, p.def.element, 0.38);
        this.emitRadialBurst(p.pos, p.def.element, 58, 0.45, 4.4, 1.8);
        cb.onSpawnBurst(p.pos, p.def.element, 20, 3.2);
        if (!wall) cb.onSkillHitArea(p.pos, p.def, false);
        p.mesh.removeFromParent();
        p.mesh.traverse((n: any) => { n.geometry?.dispose?.(); n.material?.dispose?.(); });
        this.projectiles.splice(i, 1);
      }
    }

    // 2. Step timed 3D effects
    for (let i = this.fxList.length - 1; i >= 0; i--) {
      const fx = this.fxList[i];
      fx.age += dt;
      const t = Math.min(1, fx.age / fx.life);
      fx.update(t, dt);
      if (fx.age >= fx.life) {
        fx.dispose();
        this.fxList.splice(i, 1);
      }
    }

    // 3. Step GPU Niagara particle pool
    this.stepParticles(dt);
  }

  reset() {
    for (const p of this.projectiles) {
      p.mesh.removeFromParent();
      p.mesh.traverse((n: any) => { n.geometry?.dispose?.(); n.material?.dispose?.(); });
    }
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
    this.pGeo.dispose();
    this.pMat.dispose();
    this.root.removeFromParent();
  }
}
