import * as THREE from 'three';
import {PhysicalAtmosphere} from './atmosphere';
import {DynamicIBL} from './ibl';
import {createHomeMaterialFactory} from './pbr-materials';
import {clampRenderParams, type HomeRenderParams} from './params';
import {CALIBRATED_PARAMS} from './calibrated-params';
import {PerfHud} from './perf-hud';
import {createWaterShared, WATER_LAYER, type WaterShared} from './water-surface';
import {StaticBatcher} from './static-batch';

export interface HomePassPlugin {
  resize?(w: number, h: number): void;
  dispose?(): void;
}

export interface OceanRenderHook extends HomePassPlugin {
  readonly causticsMap?: THREE.Texture;
  mesh: THREE.Mesh;
  update(renderer: THREE.WebGLRenderer, time: number, dt: number, windSpeed: number, sunDir: THREE.Vector3, params: HomeRenderParams): void;
  setQuality(fftSize: number, cascades: number): void;
  sampleWave?(x: number, z: number, time?: number): {height: number; seaLevel: number; normal: [number, number, number]};
  isOceanAt?(x: number, z: number): boolean;
}

export interface CloudRenderHook extends HomePassPlugin {
  /** Upper-hemisphere cloud panorama: rgb in-scatter, a = sky transmittance. */
  readonly texture: THREE.Texture;
  readonly enabled: boolean;
  update(
    renderer: THREE.WebGLRenderer,
    camPos: THREE.Vector3,
    sunDir: THREE.Vector3,
    time: number,
    cloudAmount: number,
    wind: number,
    fog: number,
    storminess: number,
    daylight: number,
    params: HomeRenderParams,
  ): void;
  setMode(mode: 'off' | 'analytic' | 'volumetric',steps?:number): void;
  invalidate?(): void;
}

export interface PostProcessHook extends HomePassPlugin {
  render(args: {
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    hdrColor: THREE.Texture;
    causticsMap?: THREE.Texture;
    hdrDepth: THREE.Texture;
    cloudsTex: THREE.Texture | null;
    skyViewTex: THREE.Texture;
    sunDir: THREE.Vector3;
    daylight: number;
    fogDensity: number;
    rain: number;
    time: number;
    seaLevel?: number;
    waveNormal?: [number, number, number];
    overcast?: number;
    fade: number;
    params: HomeRenderParams;
    gtaoEnabled: boolean;
    shaftsEnabled: boolean;
    resolvedTarget: THREE.WebGLRenderTarget;
  }): void;
}

export interface WaterEntry {
  mesh: THREE.Mesh;
  level: number;
}

const FULLSCREEN_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const BLIT_SRGB_FRAG = `
precision highp float;
uniform sampler2D tColor;
uniform vec2 uTexel;
uniform float uSharpen;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tColor, vUv).rgb;
  if (uSharpen > 0.001) {
    // Contrast-limited sharpen after a scaled-down scene render
    vec3 n = texture2D(tColor, vUv + vec2(0.0, uTexel.y)).rgb;
    vec3 s = texture2D(tColor, vUv - vec2(0.0, uTexel.y)).rgb;
    vec3 e = texture2D(tColor, vUv + vec2(uTexel.x, 0.0)).rgb;
    vec3 w = texture2D(tColor, vUv - vec2(uTexel.x, 0.0)).rgb;
    vec3 lo = min(c, min(min(n, s), min(e, w)));
    vec3 hi = max(c, max(max(n, s), max(e, w)));
    c = clamp(c + (4.0 * c - n - s - e - w) * uSharpen * 0.25, lo, hi);
  }
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

const FALLBACK_RESOLVE_FRAG = `
precision highp float;
uniform sampler2D tColor;
uniform float uExposure;
uniform float uFade;
uniform float uSaturation;
varying vec2 vUv;

// Neutral AgX-like filmic curve for clean display-referred linear output before sRGB encode
vec3 agxCurve(vec3 x) {
  const mat3 M1 = mat3(
    0.842479062253094, 0.0423282422610123, 0.0423756549057051,
    0.0784335999999992, 0.878468636469772, 0.0784336,
    0.0792237451477643, 0.0791661274605434, 0.879142973793104
  );
  const mat3 M2 = mat3(
    1.19687900512017, -0.0528968517574562, -0.0529716355144438,
    -0.0980208811401368, 1.15190312990417, -0.0980434501171241,
    -0.0990297440797205, -0.0989611768448433, 1.15107367264116
  );
  vec3 v = max(M1 * x, vec3(1e-6));
  v = clamp((log2(v) + 12.47393) / (4.026069 + 12.47393), 0.0, 1.0);
  vec3 v2 = v * v;
  vec3 v4 = v2 * v2;
  vec3 poly = 15.5 * v4 * v2 - 40.14 * v4 * v + 31.96 * v4 - 6.868 * v2 * v + 0.4298 * v2 + 0.1191 * v - 0.00232;
  return clamp(M2 * poly, 0.0, 1.0);
}

void main() {
  vec3 col = texture2D(tColor, vUv).rgb * uExposure;
  col = agxCurve(max(col, vec3(0.0)));
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uSaturation);
  col = mix(vec3(0.78, 0.86, 0.90), col, uFade);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

// The slime shades in display range; the mirror is linear HDR, so it is drawn through a Reinhard round trip
const ACTOR_RANGE_FRAG = `
precision highp float;
uniform sampler2D tColor;
uniform float uExposure;
uniform float uInverse;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tColor, vUv);
  vec3 rgb = uInverse > 0.5
    ? min(c.rgb, vec3(0.985)) / (1.0 - min(c.rgb, vec3(0.985))) / uExposure
    : c.rgb * uExposure / (1.0 + c.rgb * uExposure);
  gl_FragColor = vec4(rgb, c.a);
}`;

/** Layers the mirror camera draws: sky/no-outline (1) and size-filtered reflectables (4). */
const REFLECT_MASK = (1 << 1) | (1 << 4);
/** Surfaces within this height of the mirror plane use the planar reflection. */
const PLANAR_TOLERANCE = 0.12;
const SEA_LEVEL = -0.38;

/**
 * Home island frame graph. Whole-scene passes per frame: shadow map (when due), one shared mirror, main.
 * - The mirror plane belongs to the most prominent water surface; others fall back to SSR, then sky.
 * - Water draws first among transparents; its first draw blits the opaque colour+depth (MSAA resolve)
 *   into `opaqueCopy`, which every water shader samples for thickness, refraction and SSR.
 * - Clouds live in a cached panorama the sky dome samples, so they show up in reflections for free.
 * - Dynamic scene resolution (0.7–1.0) keeps GPU time inside the 60 Hz budget; the blit sharpens.
 */
export class HomeRenderPipeline {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly sun: THREE.DirectionalLight;
  readonly bounceLight: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly atmosphere: PhysicalAtmosphere;
  readonly ibl: DynamicIBL;
  readonly createMaterial: ReturnType<typeof createHomeMaterialFactory>;
  readonly params: HomeRenderParams;
  readonly perf: PerfHud;
  readonly water: WaterShared;
  readonly batcher: StaticBatcher;

  hdrTarget: THREE.WebGLRenderTarget;
  /** Resolved opaque colour + depth captured right before the first water surface draws. */
  opaqueCopy: THREE.WebGLRenderTarget;
  reflRT: THREE.WebGLRenderTarget;
  private actorRT: THREE.WebGLRenderTarget;
  private actorRangeMat: THREE.ShaderMaterial;
  resolvedTarget: THREE.WebGLRenderTarget;

  oceanHook: OceanRenderHook | null = null;
  cloudHook: CloudRenderHook | null = null;
  postHook: PostProcessHook | null = null;

  gtaoEnabled = true;
  shaftsEnabled = true;
  msaaSamples = 4;
  reflScale = 0.42;
  reflEvery = 1;
  time = 0;
  /** Current scene render scale; adjusted by the dynamic-resolution controller within [min, max]. */
  sceneScale = 1;
  dynamicRes = {enabled: true, min: 0.7, max: 1};

  private size = new THREE.Vector2();
  private quadScene: THREE.Scene;
  private quadCam: THREE.OrthographicCamera;
  private quadMesh: THREE.Mesh;
  private blitMat: THREE.ShaderMaterial;
  private fallbackResolveMat: THREE.ShaderMaterial;
  private sunTargetPos = new THREE.Vector3();
  private sunOffset = new THREE.Vector3();
  private tmpColor = new THREE.Color();
  private reflCam = new THREE.PerspectiveCamera();
  private reflMatrix = new THREE.Matrix4();
  private reflBias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  private reflPlane = new THREE.Plane();
  private clipVec = new THREE.Vector4();
  private qVec = new THREE.Vector4();
  private tmpPos = new THREE.Vector3();
  private tmpLook = new THREE.Vector3();
  private tmpUp = new THREE.Vector3();
  private tmpSphere = new THREE.Sphere();
  private frustum = new THREE.Frustum();
  private projView = new THREE.Matrix4();
  waterBed?: (x:number,z:number)=>number|null;
  private waters: WaterEntry[] = [];
  private frameId = 0;
  private capturedFrame = -1;
  private copyReady = false;
  private reflFrame = 0;
  private reflValid = false;
  private dynEma = 0;
  private dynCooldown = 2;
  private lastNow = 0;

  constructor() {
    this.params = clampRenderParams(CALIBRATED_PARAMS);

    const r = (this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
    }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    r.setSize(window.innerWidth, window.innerHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.NoToneMapping; // Managed explicitly in HDR post-process
    r.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(r.domElement);

    r.info.autoReset = false;
    const scene = (this.scene = new THREE.Scene());
    // World matrices are refreshed once per frame in render(), not once per pass
    scene.matrixWorldAutoUpdate = false;
    this.perf = new PerfHud(r, scene);
    (globalThis as any).__perf = this.perf;
    this.batcher = new StaticBatcher(scene);
    scene.fog = new THREE.FogExp2(0xbfd8e8, 0.0014);

    // Near 0.14 / Far 3200 gives rock-solid 24-bit depth precision for SlimeCharacter while showing full ocean horizon
    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.14, 3200);
    this.camera.layers.enable(1);
    this.camera.layers.enable(WATER_LAYER);

    const sun = (this.sun = new THREE.DirectionalLight(0xfff4df, this.params.sunIlluminance));
    sun.position.set(-28, 42, 22);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {left: -52, right: 52, top: 52, bottom: -52, near: 2, far: 160});
    sun.shadow.bias = -0.00035;
    sun.shadow.normalBias = 0.028;
    sun.shadow.camera.layers.enable(1);
    scene.add(sun, sun.target);

    // Opposite-side ground/ocean bounce light (no shadow map) for warm GI fill in shadow faces
    this.bounceLight = new THREE.DirectionalLight(0x9dc7d8, this.params.sunBounceIntensity);
    this.bounceLight.position.set(24, 14, -20);
    scene.add(this.bounceLight);

    this.hemi = new THREE.HemisphereLight(0xb8dcff, 0x4b6355, this.params.hemiIntensity);
    scene.add(this.hemi);
    // Lights must be visible to the mirror camera too (layer 1), or the mirror is unlit and every
    // material switches light-state programs between passes
    for (const l of [sun, this.bounceLight, this.hemi]) l.layers.enable(1);

    this.atmosphere = new PhysicalAtmosphere(this.params);
    scene.add(this.atmosphere.skyDome);

    this.ibl = new DynamicIBL(r, this.atmosphere);
    this.createMaterial = createHomeMaterialFactory();

    const baseOpts = {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    };
    const urlMsaa = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('msaa') : null;
    if (urlMsaa !== null) this.msaaSamples = Math.max(0, Math.min(8, Number(urlMsaa) | 0));
    this.hdrTarget = new THREE.WebGLRenderTarget(1, 1, {...baseOpts, samples: this.msaaSamples});
    this.hdrTarget.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);

    this.opaqueCopy = new THREE.WebGLRenderTarget(1, 1, {...baseOpts, stencilBuffer: false});
    this.opaqueCopy.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);

    // Shared mirror: mipmapped so rough water can blur it; cleared to alpha 0 so uncovered texels fall back to sky
    this.reflRT = new THREE.WebGLRenderTarget(1, 1, {
      ...baseOpts,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
    });
    this.reflCam.layers.mask = REFLECT_MASK;
    this.actorRT = new THREE.WebGLRenderTarget(1, 1, {...baseOpts, depthBuffer: true, stencilBuffer: false});
    this.actorRangeMat = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: ACTOR_RANGE_FRAG,
      uniforms: {tColor: {value: null}, uExposure: {value: 0.72}, uInverse: {value: 0}},
    });

    // Display-referred linear output (0..1) passed to screen blit & SlimeCharacter
    this.resolvedTarget = new THREE.WebGLRenderTarget(1, 1, {...baseOpts, depthBuffer: false, stencilBuffer: false});

    const w = (this.water = createWaterShared());
    w.tOpaqueColor.value = this.opaqueCopy.texture;
    w.tOpaqueDepth.value = this.opaqueCopy.depthTexture;
    w.tPlanarRefl.value = this.reflRT.texture;
    w.tSkyView.value = this.atmosphere.skyViewRT.texture;

    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.blitMat = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: BLIT_SRGB_FRAG,
      uniforms: {tColor: {value: this.resolvedTarget.texture}, uTexel: {value: new THREE.Vector2(1, 1)}, uSharpen: {value: 0}},
    });
    this.fallbackResolveMat = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: FALLBACK_RESOLVE_FRAG,
      uniforms: {
        tColor: {value: this.hdrTarget.texture},
        uExposure: {value: 0.72},
        uFade: {value: 1},
        uSaturation: {value: this.params.saturation},
      },
    });
    this.quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.blitMat);
    this.quadMesh.frustumCulled = false;
    this.quadScene.add(this.quadMesh);

    (globalThis as any).__harborRT = this.hdrTarget;
    (globalThis as any).__pipeline = this;
    if (typeof location !== 'undefined') {
      const q = new URLSearchParams(location.search);
      if (q.get('dynres') === '0') this.dynamicRes.enabled = false;
      if (q.get('batch') === '0') this.batcher.enabled = false;
      const st = q.get('shadowtype');
      if (st === 'pcf') r.shadowMap.type = THREE.PCFShadowMap;
      if (st === 'off') r.shadowMap.enabled = false;
    }

    window.addEventListener('resize', () => {
      r.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  /** Helper sprite matching Stage.glow() used by SeaFX steam, lanterns and time shards. */
  glow(color: number | string, scale = 1, opacity = 0.6) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 28);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.42, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(c),
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        fog: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    s.scale.setScalar(scale);
    s.layers.set(1);
    return s;
  }

  /** Water surfaces announce themselves so the pipeline can pick the mirror plane. */
  registerWater(mesh: THREE.Mesh, level: number): WaterEntry {
    const entry = {mesh, level};
    this.waters.push(entry);
    return entry;
  }

  inlandWaterLevel(x:number,z:number,normal?:[number,number,number]):number|undefined {
    let highest:number|undefined;
    for(const {mesh,level} of this.waters){
      const sample=mesh.userData.levelAt;
      const h=sample?sample(x,z):mesh.userData.containsWater?.(x,z)?level:undefined;
      if(h===undefined || h<=(highest??-Infinity) || (this.waterBed?.(x,z)??Infinity)>=h-.002)continue;
      highest=h;
      if(normal){
        const nx=sample?(h-(sample(x+.035,z)??h))/.035:0,nz=sample?(h-(sample(x,z+.035)??h))/.035:0;
        const len=Math.hypot(nx,1,nz);normal[0]=nx/len;normal[1]=1/len;normal[2]=nz/len;
      }
    }
    return highest;
  }

  unregisterWater(entry: WaterEntry) {
    const i = this.waters.indexOf(entry);
    if (i >= 0) this.waters.splice(i, 1);
  }

  /**
   * Called from the first water mesh's onBeforeRender inside the main pass: resolves the opaque
   * colour and depth drawn so far into `opaqueCopy` without leaving the render call.
   */
  private drawOceanActor?: () => void;
  captureOpaque(renderer: THREE.WebGLRenderer) {
    if (this.capturedFrame === this.frameId || renderer.getRenderTarget() !== this.hdrTarget) return;
    this.capturedFrame = this.frameId;
    const props = renderer.properties as any;
    const src = props.get(this.hdrTarget);
    const dst = props.get(this.opaqueCopy);
    const readFb = src.__webglMultisampledFramebuffer ?? src.__webglFramebuffer;
    if (!readFb || !dst.__webglFramebuffer) return;
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const state = renderer.state as any;
    const w = this.hdrTarget.width, h = this.hdrTarget.height;
    // Bind through three's state cache so its later MSAA resolve still binds what it expects
    const copy = () => {
      state.bindFramebuffer(gl.READ_FRAMEBUFFER, readFb);
      state.bindFramebuffer(gl.DRAW_FRAMEBUFFER, dst.__webglFramebuffer);
      gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, gl.NEAREST);
      state.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      state.bindFramebuffer(gl.DRAW_FRAMEBUFFER, readFb);
    };
    copy();
    if (this.drawOceanActor) {
      this.drawOceanActor();
      this.drawOceanActor = undefined;
      copy();
    }
  }

  applyQuality(opts: {
    msaa: number;
    oceanFFT: number;
    oceanCascades: number;
    clouds: 'off' | 'analytic' | 'volumetric';
    gtao: boolean;
    volumetricShafts: boolean;
    reflScale?: number;
    reflEvery?: number;
    ssr?: boolean;
    minScale?: number;
  }) {
    this.gtaoEnabled = opts.gtao;
    this.shaftsEnabled = opts.volumetricShafts;
    const urlMsaa = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('msaa') : null;
    const msaa = urlMsaa !== null ? Math.max(0, Math.min(8, Number(urlMsaa) | 0)) : opts.msaa;
    if (this.hdrTarget.samples !== msaa) {
      this.msaaSamples = msaa;
      this.hdrTarget.samples = msaa;
      this.hdrTarget.dispose();
    }
    if (opts.reflScale !== undefined && opts.reflScale !== this.reflScale) {
      this.reflScale = opts.reflScale;
      this.size.set(0, 0);
      this.forceResize = true;
    }
    if (opts.reflEvery !== undefined) this.reflEvery = Math.max(1, opts.reflEvery);
    if (opts.ssr !== undefined) this.water.uSSR.value = opts.ssr ? 1 : 0;
    if (opts.minScale !== undefined) this.dynamicRes.min = opts.minScale;
    this.oceanHook?.setQuality(opts.oceanFFT, opts.oceanCascades);
    this.cloudHook?.setMode(opts.clouds,opts.oceanFFT>=256 ? 32 : 16);
  }
  private forceResize = false;

  updateAtmosphereAndLights(args: {
    sunDir: THREE.Vector3;
    daylight: number;
    twilight: number;
    cloud: number;
    storminess: number;
    drift: number;
    wind: number;
    dt: number;
    focusPos: THREE.Vector3;
  }) {
    const {sunDir, daylight, twilight, cloud, storminess, drift, wind, dt, focusPos} = args;
    const p = this.params;

    const skyUpdated = this.atmosphere.update(
      this.renderer,
      sunDir,
      daylight,
      twilight,
      cloud,
      storminess,
      drift,
      p,
    );
    this.ibl.update(this.renderer, this.scene, sunDir, daylight, storminess, skyUpdated);
    (this.scene as any).environmentIntensity = p.envIntensity * (0.26 + 0.74 * daylight);

    // Shadow-casting sun light follows the focus area with texel snapping to prevent shadow shimmer
    const lightDir = this.sunOffset;
    lightDir.copy(sunDir).multiplyScalar(sunDir.y < 0 ? -1 : 1);
    lightDir.y = Math.max(0.18, lightDir.y);
    lightDir.normalize();
    // Other systems place the sun at focus + offset (55 m along the light direction)
    const ud = this.sun.userData as {offset?: THREE.Vector3};
    (ud.offset ??= new THREE.Vector3()).copy(lightDir).multiplyScalar(55);

    const snap = 2.0;
    this.sunTargetPos.set(Math.round(focusPos.x / snap) * snap, 0, Math.round(focusPos.z / snap) * snap);
    this.sun.target.position.copy(this.sunTargetPos);
    this.sun.position.copy(this.sunTargetPos).addScaledVector(lightDir, 68);
    this.sun.target.updateMatrixWorld();

    this.atmosphere.computeSunColor(sunDir, daylight, this.sun.color);
    // Keep midday sunlight crisp warm-white (avoid overly dim yellow cast at mid-elevation)
    if (sunDir.y > 0.16) {
      this.sun.color.lerp(this.tmpColor.setHex(0xfffaf0), Math.min(0.45, (sunDir.y - 0.16) * 1.1));
    }
    const elevAtten = Math.min(1, Math.max(0.18, (sunDir.y + 0.14) / 0.42));
    const dayInt = p.sunIlluminance * elevAtten * (1 - 0.52 * storminess);
    const nightInt = 0.36 * (1 - 0.45 * storminess);
    this.sun.intensity = nightInt + (dayInt - nightInt) * daylight;

    // Opposite ocean/sky bounce light for luminous cool-filled shadows
    this.bounceLight.position.set(-lightDir.x * 40, 22, -lightDir.z * 40);
    this.bounceLight.color.setRGB(
      0.56 + 0.34 * twilight,
      0.82 - 0.10 * twilight,
      1.0 - 0.22 * twilight,
    );
    this.bounceLight.intensity = p.sunBounceIntensity * (0.14 + 0.86 * daylight) * (1 - 0.32 * storminess);

    this.hemi.color.setHex(daylight > 0.2 ? 0x82ceff : 0x2c4f82).lerp(this.tmpColor.setHex(0xffc088), twilight * 0.42);
    this.hemi.groundColor.setHex(daylight > 0.2 ? 0x6c8f78 : 0x122238);
    this.hemi.intensity = p.hemiIntensity * (0.28 + 0.72 * daylight);

    this.atmosphere.skyDome.position.copy(this.camera.position);

    // Step GPU FFT ocean simulation before main render
    if (this.oceanHook) {
      this.oceanHook.update(this.renderer, this.time + dt, dt, wind, sunDir, p);
    }
  }

  private ensureTargetSizes() {
    const r = this.renderer;
    r.getDrawingBufferSize(this.size);
    const fw = Math.max(1, this.size.x);
    const fh = Math.max(1, this.size.y);
    const w = Math.max(1, Math.round(fw * this.sceneScale));
    const h = Math.max(1, Math.round(fh * this.sceneScale));
    if (this.forceResize || this.hdrTarget.width !== w || this.hdrTarget.height !== h) {
      this.forceResize = false;
      // Recreate immutable WebGL2 DepthTextures explicitly so MSAA resolve FBO attachments
      // never retain stale dimensions across dynamic-resolution resizes.
      this.hdrTarget.depthTexture?.dispose();
      this.hdrTarget.depthTexture = new THREE.DepthTexture(w, h, THREE.UnsignedIntType);
      this.hdrTarget.setSize(w, h);
      this.opaqueCopy.depthTexture?.dispose();
      this.opaqueCopy.depthTexture = new THREE.DepthTexture(w, h, THREE.UnsignedIntType);
      this.opaqueCopy.setSize(w, h);
      this.water.tOpaqueDepth.value = this.opaqueCopy.depthTexture;
      this.resolvedTarget.setSize(w, h);
      this.reflRT.setSize(Math.max(1, Math.round(fw * this.reflScale)), Math.max(1, Math.round(fh * this.reflScale)));
      this.reflValid = false;
      this.copyReady = false;
      this.postHook?.resize?.(w, h);
      (this.blitMat.uniforms.uTexel.value as THREE.Vector2).set(1 / w, 1 / h);
    }
    if (!this.copyReady) {
      // Allocate the copy's framebuffer up front so the in-pass blit has a destination
      r.initRenderTarget(this.opaqueCopy);
      this.copyReady = true;
    }
  }

  /** Keeps GPU frame time inside budget by stepping the scene resolution (sharpened on upscale). */
  private updateDynamicScale(dt: number) {
    const d = this.dynamicRes;
    if (!d.enabled) {
      if (this.sceneScale !== 1) this.sceneScale = 1;
      return;
    }
    if (!this.perf.enabled) this.perf.enable(false);
    const now = performance.now();
    const interval = this.lastNow ? now - this.lastNow : 16.7;
    this.lastNow = now;
    if (interval > 250) return;
    const gpu = this.perf.hasGpuTimer && this.perf.gpuFrameMs > 0;
    const sample = gpu ? this.perf.gpuFrameMs : interval;
    // ~0.5 s memory: a resize reallocates the 4K targets (one long frame), so camera-cut spikes must not trigger it
    this.dynEma = this.dynEma ? this.dynEma + (sample - this.dynEma) * 0.035 : sample;
    this.dynCooldown -= dt;
    if (this.dynCooldown > 0) return;
    const s = this.sceneScale;
    const high = gpu ? 14.5 : 19;
    if (this.dynEma > high && s > d.min + 1e-3) {
      this.sceneScale = Math.max(d.min, Math.round((s - 0.1) * 10) / 10);
      this.dynCooldown = 1.2;
    } else if (s < d.max - 1e-3) {
      const next = Math.min(d.max, Math.round((s + 0.1) * 10) / 10);
      const predicted = this.dynEma * (next * next) / (s * s);
      if (gpu ? predicted < 12.5 : this.dynEma < 17.4) {
        this.sceneScale = next;
        this.dynCooldown = gpu ? 3 : 8;
      }
    }
  }

  /**
   * Streamed-in zones bring new materials. When the mesh count grows their programs are created up front;
   * with KHR_parallel_shader_compile the driver links them in the background, so the first frame that
   * sees them does not stall. (compileAsync is avoided: it polls programs of materials disposed meanwhile.)
   */
  private warmupTick(dt: number) {
    if ((this.warmupIn -= dt) > 0) return;
    this.warmupIn = 2;
    let meshes = 0;
    this.mirrorSkip.length = 0;
    this.detail.length = 0;
    this.scene.traverse(o => {
      if (!(o as THREE.Mesh).isMesh) return;
      meshes++;
      this.scanMirrorSkip(o as THREE.Mesh);
      this.scanDetail(o as THREE.Mesh);
    });
    if (this.detailHidden.length < this.detail.length) {
      this.detailHidden = new Uint8Array(this.detail.length * 2);
      this.detailPx = new Float32Array(this.detail.length * 2);
    } else this.detailHidden.fill(0);
    if (meshes === this.warmedMeshes) return;
    this.warmedMeshes = meshes;
    this.renderer.compile(this.scene, this.camera);
  }
  private warmupIn = 0.5;
  private warmedMeshes = 0;

  /**
   * Layer 1 is the shared no-outline layer, so it also carries seabed life, the submerged shelf and pebble
   * scatters. The mirror skips what lies wholly under its plane and tiny instanced scatter.
   */
  private mirrorSkip: {mesh: THREE.Mesh; top: number; tiny: boolean}[] = [];
  private scanMirrorSkip(m: THREE.Mesh) {
    if ((m.layers.mask & REFLECT_MASK) === 0 || m === this.atmosphere.skyDome || !m.visible) return;
    const g = m.geometry;
    if (!g?.attributes?.position) return;
    let tiny = false;
    if ((m as THREE.InstancedMesh).isInstancedMesh) {
      const im = m as THREE.InstancedMesh;
      if (!g.boundingSphere) g.computeBoundingSphere();
      tiny = !m.layers.isEnabled(4) && g.boundingSphere!.radius * im.matrixWorld.getMaxScaleOnAxis() < 0.35;
      if (!im.boundingBox) im.computeBoundingBox();
      this.tmpBox.copy(im.boundingBox!);
    } else {
      if (!g.boundingBox) g.computeBoundingBox();
      this.tmpBox.copy(g.boundingBox!);
    }
    this.tmpBox.applyMatrix4(m.matrixWorld);
    this.mirrorSkip.push({mesh: m, top: this.tmpBox.max.y, tiny});
  }
  private tmpBox = new THREE.Box3();
  private hiddenForMirror: THREE.Mesh[] = [];

  /**
   * Sub-pixel detail cull: props a few pixels across at 4K still cost a full draw each, so they are left out of
   * this frame's mirror and main passes (with hysteresis against flicker). Meshes may set
   * `userData.cullDistance` to drop out entirely beyond that distance (grass chunks with no clumps left).
   */
  private detail: {mesh: THREE.Mesh; c: THREE.Vector3; r: number; far: number}[] = [];
  private detailHidden = new Uint8Array(0);
  private detailPx = new Float32Array(0);
  private hiddenForDetail: THREE.Mesh[] = [];
  private scanDetail(m: THREE.Mesh) {
    if (!m.visible || !m.frustumCulled || m.layers.isEnabled(WATER_LAYER) || m === this.atmosphere.skyDome) return;
    const far = (m.userData.cullDistance as number | undefined) ?? 0;
    if ((m as THREE.InstancedMesh).isInstancedMesh && !far) return;
    const g = m.geometry;
    if (!g?.attributes?.position) return;
    const s = (m as THREE.InstancedMesh).isInstancedMesh ? (m as any).boundingSphere : (g.boundingSphere ?? (g.computeBoundingSphere(), g.boundingSphere));
    if (!s) return;
    const scale = (m as THREE.InstancedMesh).isInstancedMesh ? 1 : m.matrixWorld.getMaxScaleOnAxis();
    this.detail.push({mesh: m, c: s.center, r: s.radius * scale, far});
  }
  private cullDetail() {
    const cam = this.camera.position;
    const k = this.hdrTarget.height * 0.5 / Math.tan((this.camera.fov * Math.PI) / 360);
    const hidden = this.hiddenForDetail;
    const state = this.detailHidden;
    const p = this.tmpCenter;
    for (let i = 0; i < this.detail.length; i++) {
      const e = this.detail[i];
      const m = e.mesh;
      if (!m.visible) continue;
      if ((m as THREE.InstancedMesh).isInstancedMesh) p.copy(e.c);
      else p.copy(e.c).applyMatrix4(m.matrixWorld);
      const d = Math.max(0.1, p.distanceTo(cam) - e.r);
      let hide: boolean;
      if (e.far) {
        hide = d > e.far;
        this.detailPx[i] = 1e9;
      } else {
        const px = (e.r / d) * k;
        this.detailPx[i] = px;
        hide = state[i] ? px < 3.2 : px < 2.5;
      }
      state[i] = hide ? 1 : 0;
      if (hide) {
        m.visible = false;
        hidden.push(m);
      }
    }
  }
  private restoreDetail() {
    for (const m of this.hiddenForDetail) m.visible = true;
    this.hiddenForDetail.length = 0;
  }
  private tmpCenter = new THREE.Vector3();

  /** Picks the water surface that owns the mirror this frame: largest on screen, ocean by default. */
  private pickMirrorLevel(): number | null {
    const cam = this.camera;
    this.projView.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projView);
    let best: number | null = null;
    let bestScore = 0;
    const ocean = this.oceanHook?.mesh;
    if (ocean && ocean.visible && cam.position.y > SEA_LEVEL + 0.02) {
      best = SEA_LEVEL;
      bestScore = 0.5;
    }
    for (const e of this.waters) {
      if(e.mesh.userData.levelAt)continue;
      if (!isWorldVisible(e.mesh) || cam.position.y < e.level + 0.02) continue;
      const g = e.mesh.geometry;
      if (!g.boundingSphere) g.computeBoundingSphere();
      const sphere = this.tmpSphere.copy(g.boundingSphere!).applyMatrix4(e.mesh.matrixWorld);
      if (!this.frustum.intersectsSphere(sphere)) continue;
      const d = Math.max(1, sphere.center.distanceTo(cam.position) - sphere.radius * 0.5);
      const score = sphere.radius / d;
      if (score > bestScore) {
        bestScore = score;
        best = e.level;
      }
    }
    return best;
  }

  private renderMirror(level: number, reflectActor: ((renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, target: THREE.WebGLRenderTarget) => void) | null | undefined) {
    const r = this.renderer;
    const cam = this.camera;
    this.tmpPos.copy(cam.position);
    cam.getWorldDirection(this.tmpLook).add(this.tmpPos);
    this.tmpUp.set(0, 1, 0).applyQuaternion(cam.quaternion);

    const rc = this.reflCam;
    rc.fov = cam.fov;
    rc.aspect = cam.aspect;
    rc.near = cam.near;
    rc.far = cam.far;
    rc.updateProjectionMatrix();
    rc.position.set(this.tmpPos.x, 2 * level - this.tmpPos.y, this.tmpPos.z);
    rc.up.set(this.tmpUp.x, -this.tmpUp.y, this.tmpUp.z);
    rc.lookAt(this.tmpLook.x, 2 * level - this.tmpLook.y, this.tmpLook.z);
    rc.updateMatrixWorld();

    // Oblique near plane on the water plane (Lengyel): clips everything below without shader variants
    this.reflPlane.setFromNormalAndCoplanarPoint(this.tmpUp.set(0, 1, 0), this.tmpLook.set(0, level, 0));
    this.reflPlane.applyMatrix4(rc.matrixWorldInverse);
    const clip = this.clipVec.set(this.reflPlane.normal.x, this.reflPlane.normal.y, this.reflPlane.normal.z, this.reflPlane.constant);
    const pm = rc.projectionMatrix.elements;
    const q = this.qVec.set(
      (Math.sign(clip.x) + pm[8]) / pm[0],
      (Math.sign(clip.y) + pm[9]) / pm[5],
      -1,
      (1 + pm[10]) / pm[14],
    );
    clip.multiplyScalar(2 / clip.dot(q));
    pm[2] = clip.x;
    pm[6] = clip.y;
    pm[10] = clip.z + 1 - 0.003;
    pm[14] = clip.w;
    rc.projectionMatrixInverse.copy(rc.projectionMatrix).invert();

    const dome = this.atmosphere.skyDome;
    // The reflected sky is evaluated per wave normal in wSky(). Only reflected
    // objects belong in the planar map, whose alpha marks their coverage.
    const domeVisible = dome.visible;
    dome.visible = false;

    const shadowNeeds = r.shadowMap.needsUpdate;
    const shadowAuto = r.shadowMap.autoUpdate;
    r.shadowMap.autoUpdate = false;
    r.shadowMap.needsUpdate = false;

    const hidden = this.hiddenForMirror;
    for (const e of this.mirrorSkip) {
      if (e.mesh.visible && (e.tiny || e.top < level - 0.05)) {
        e.mesh.visible = false;
        hidden.push(e.mesh);
      }
    }
    // the mirror is a fraction of the screen, so props a few screen pixels wide vanish there first
    const mirrorPx = 3.5 / Math.max(0.2, this.reflScale);
    for (let i = 0; i < this.detail.length; i++) {
      const m = this.detail[i].mesh;
      if (m.visible && this.detailPx[i] < mirrorPx) {
        m.visible = false;
        hidden.push(m);
      }
    }

    this.perf.begin('reflect');
    r.setRenderTarget(this.reflRT);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(this.scene, rc);
    this.perf.end('reflect');
    for (const m of hidden) m.visible = true;
    hidden.length = 0;
    if (reflectActor) {
      const a = this.actorRT, m = this.actorRangeMat, rt = this.reflRT;
      if (a.width !== rt.width || a.height !== rt.height) a.setSize(rt.width, rt.height);
      m.uniforms.uExposure.value = Math.pow(2, this.params.exposureBias) * 0.72;
      this.quadMesh.material = m;
      m.uniforms.tColor.value = rt.texture;
      m.uniforms.uInverse.value = 0;
      r.setRenderTarget(a);
      r.render(this.quadScene, this.quadCam);
      r.clearDepth();
      // the actor draws its own scene on the default layer
      rc.layers.enableAll();
      reflectActor(r, rc, a);
      rc.layers.mask = REFLECT_MASK;
      m.uniforms.tColor.value = a.texture;
      m.uniforms.uInverse.value = 1;
      r.setRenderTarget(rt);
      r.render(this.quadScene, this.quadCam);
      this.quadMesh.material = this.blitMat;
    }

    r.shadowMap.autoUpdate = shadowAuto;
    r.shadowMap.needsUpdate = shadowNeeds;
    dome.visible = domeVisible;

    this.reflMatrix.copy(this.reflBias).multiply(rc.projectionMatrix).multiply(rc.matrixWorldInverse);
    this.water.uReflMatrix.value.copy(this.reflMatrix);
    this.water.uReflPlaneY.value = level;
    this.reflValid = true;
  }

  render(
    dt: number,
    env: {sunDir: THREE.Vector3; daylight: number; cloud: number; wind: number; fog: number; storminess: number; fogDensity: number; rain: number},
    slime?: {inOcean?: boolean; render(pass: {color: THREE.Texture; depth: THREE.Texture; time: number; target?: THREE.WebGLRenderTarget}): void},
    reflectActor?: ((renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, target: THREE.WebGLRenderTarget) => void) | null,
  ) {
    this.time += dt;
    this.frameId++;
    const r = this.renderer;
    this.updateDynamicScale(dt);
    this.ensureTargetSizes();

    const k = Math.min(1, this.time / 0.85);
    const fade = k * k * (3 - 2 * k);

    // Optional shadow throttling from Graphics preset
    const shadowTick = (globalThis as any).__shadowTick;
    if (typeof shadowTick === 'function') {
      r.shadowMap.autoUpdate = false;
      r.shadowMap.needsUpdate = !!shadowTick();
    } else {
      r.shadowMap.autoUpdate = true;
    }
    const perf = this.perf;
    perf.frameStart(r.shadowMap.autoUpdate || r.shadowMap.needsUpdate);

    const {x,y,z}=this.camera.position;
    const inlandNormal:[number,number,number]=[0,1,0];
    const inlandLevel=this.inlandWaterLevel(x,z,inlandNormal);
    // A pond can be shallower than the usual 14 cm near plane. Keep the bed in the
    // frustum when looking down, then restore outdoor precision on returning to land.
    const nearWater=inlandLevel!==undefined && y<inlandLevel+.12;
    const nearLimit=nearWater?THREE.MathUtils.clamp((y-(this.waterBed?.(x,z)??y-.5))*.35,.012,.14):.14;
    if(nearLimit<.14 ? Math.abs(this.camera.near-nearLimit)>.0005 : this.camera.near<.14){
      this.camera.near=nearLimit;
      this.camera.updateProjectionMatrix();
    }
    this.camera.updateMatrixWorld();
    this.scene.updateMatrixWorld();
    this.batcher.update(dt);
    this.warmupTick(dt);

    // Shared water uniforms
    const w = this.water;
    w.uProj.value.copy(this.camera.projectionMatrix);
    w.tCaustics.value = this.oceanHook?.causticsMap ?? null;
    w.uInvProj.value.copy(this.camera.projectionMatrixInverse);
    w.uNear.value = this.camera.near;
    w.uFar.value = this.camera.far;
    w.uSunDir.value.copy(env.sunDir);
    w.uSunColor.value.copy(this.sun.color);
    w.uDaylight.value = env.daylight;
    w.uStorm.value = env.storminess;
    w.uRain.value = env.rain;

    // 1. Cloud panorama slice (sampled by the sky dome, water and reflections)
    perf.begin('clouds');
    const domeU = (this.atmosphere.skyDome.material as THREE.ShaderMaterial).uniforms;
    if (this.cloudHook) {
      this.cloudHook.update(r, this.camera.position, env.sunDir, this.time, env.cloud, env.wind, env.fog, env.storminess, env.daylight, this.params);
      const on = this.cloudHook.enabled ? 1 : 0;
      domeU.tCloudPano.value = this.cloudHook.texture;
      domeU.uUseClouds.value = on;
      w.tCloudPano.value = this.cloudHook.texture;
      w.uUseClouds.value = on;
      this.ibl.setClouds(this.cloudHook.texture, !!on);
    } else {
      domeU.uUseClouds.value = 0;
      w.uUseClouds.value = 0;
    }
    perf.end('clouds');

    // 2. One shared mirror for the most prominent water plane
    this.cullDetail();
    const level = this.pickMirrorLevel();
    if (level === null) {
      w.uUsePlanar.value = 0;
      this.reflValid = false;
    } else {
      const due = this.frameId - this.reflFrame >= this.reflEvery;
      const moved = !this.reflValid || Math.abs(w.uReflPlaneY.value - level) > 1e-3;
      if (due || moved) {
        this.reflFrame = this.frameId;
        this.renderMirror(level, reflectActor);
      }
      w.uUsePlanar.value = 1;
    }

    // 3. Main HDR pass; the first water draw captures the opaque copy mid-pass
    let actorInScene = false;
    this.drawOceanActor = slime?.inOcean ? () => {
      slime.render({color: this.opaqueCopy.texture, depth: this.opaqueCopy.depthTexture!, time: this.time, target: this.hdrTarget});
      actorInScene = true;
    } : undefined;
    perf.begin('main');
    r.setRenderTarget(this.hdrTarget);
    r.setClearColor(0x000000, 1);
    r.clear();
    r.render(this.scene, this.camera);
    this.drawOceanActor = undefined;
    this.restoreDetail();
    perf.end('main');

    perf.begin('post');
    // 4. HDR post (GTAO from depth + fog + exposure + local tone mapping -> linear resolvedTarget)
    if (this.postHook) {
      const camWave =
        this.oceanHook?.sampleWave && this.oceanHook.isOceanAt?.(this.camera.position.x, this.camera.position.z)
          ? this.oceanHook.sampleWave(this.camera.position.x, this.camera.position.z, this.time)
          : null;
      this.postHook.render({
        renderer: r,
        camera: this.camera,
        hdrColor: this.hdrTarget.texture,
        causticsMap: this.oceanHook?.causticsMap,
        hdrDepth: this.hdrTarget.depthTexture!,
        cloudsTex: this.cloudHook?.enabled ? this.cloudHook.texture : null,
        skyViewTex: this.atmosphere.skyViewRT.texture,
        sunDir: env.sunDir,
        daylight: env.daylight,
        fogDensity: env.fogDensity,
        rain: env.rain,
        time: this.time,
        seaLevel: inlandLevel ?? (camWave ? camWave.seaLevel + camWave.height : SEA_LEVEL),
        waveNormal: inlandLevel!==undefined ? inlandNormal : camWave?.normal,
        overcast: env.storminess,
        fade,
        params: this.params,
        gtaoEnabled: this.gtaoEnabled,
        shaftsEnabled: this.shaftsEnabled,
        resolvedTarget: this.resolvedTarget,
      });
    } else {
      this.fallbackResolveMat.uniforms.tColor.value = this.hdrTarget.texture;
      this.fallbackResolveMat.uniforms.uExposure.value = Math.pow(2, this.params.exposureBias) * 0.72;
      this.fallbackResolveMat.uniforms.uFade.value = fade;
      this.fallbackResolveMat.uniforms.uSaturation.value = this.params.saturation;
      this.quadMesh.material = this.fallbackResolveMat;
      r.setRenderTarget(this.resolvedTarget);
      r.render(this.quadScene, this.quadCam);
    }

    // 5. Blit linear resolvedTarget to screen with sRGB encoding (sharpened when the scene was scaled down)
    this.blitMat.uniforms.tColor.value = this.resolvedTarget.texture;
    this.blitMat.uniforms.uSharpen.value = Math.min(0.6, (1 - this.sceneScale) * 1.6);
    this.quadMesh.material = this.blitMat;
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
    perf.end('post');

    // 6. SlimeCharacter on top, using the linear resolvedTarget + exact scene depth
    perf.begin('slime');
    if (!actorInScene) slime?.render({
      color: this.resolvedTarget.texture,
      depth: this.hdrTarget.depthTexture!,
      time: this.time,
    });
    perf.end('slime');
    perf.frameEnd();
  }

  dispose() {
    this.atmosphere.dispose();
    this.ibl.dispose();
    this.oceanHook?.dispose?.();
    this.cloudHook?.dispose?.();
    this.postHook?.dispose?.();
    this.hdrTarget.dispose();
    this.opaqueCopy.dispose();
    this.reflRT.dispose();
    this.resolvedTarget.dispose();
  }
}

function isWorldVisible(o: THREE.Object3D) {
  for (let n: THREE.Object3D | null = o; n; n = n.parent) if (!n.visible) return false;
  return true;
}
