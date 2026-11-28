import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/examples/jsm/utils/SkeletonUtils.js';

export type SimPondMotionKind = 'skinned' | 'swim' | 'scuttle' | 'dragonfly' | 'skater' | 'snail';

export type SimPondSpeciesId =
  | 'common-frog'
  | 'smooth-newt'
  | 'koi-kohaku'
  | 'koi-showa'
  | 'goldfish-comet'
  | 'golden-orfe'
  | 'perch'
  | 'bluegill'
  | 'madai'
  | 'kurodai'
  | 'aji'
  | 'saba'
  | 'kasago'
  | 'suzuki'
  | 'dragonfly-emperor'
  | 'dragonfly-darter'
  | 'water-strider'
  | 'whirligig-beetle'
  | 'shore-crab'
  | 'hermit-crab'
  | 'crayfish-signal'
  | 'pond-snail';

export interface SimPondSpeciesSpec {
  id: SimPondSpeciesId;
  file: string;
  /** Target longest horizontal dimension in metres at scale=1. */
  length: number;
  /** Source GLB head axis before normalizing to Three.js +Z forward. */
  forwardAxis: '+z' | '+x';
  motion: SimPondMotionKind;
  /** True when the model's fin alpha uses glTF BLEND and benefits from alphaTest cutout. */
  alphaCutout?: boolean;
  /** Optional wing texture filename for insect species. */
  wingTexture?: string;
}

export const SIMPOND_SPECIES: Record<SimPondSpeciesId, SimPondSpeciesSpec> = {
  'common-frog': {id: 'common-frog', file: 'common-frog.glb', length: 0.34, forwardAxis: '+z', motion: 'skinned'},
  'smooth-newt': {id: 'smooth-newt', file: 'smooth-newt.glb', length: 0.36, forwardAxis: '+z', motion: 'skinned'},
  'koi-kohaku': {id: 'koi-kohaku', file: 'koi-kohaku_lo.glb', length: 0.62, forwardAxis: '+z', motion: 'swim'},
  'koi-showa': {id: 'koi-showa', file: 'koi-showa_lo.glb', length: 0.62, forwardAxis: '+z', motion: 'swim'},
  'goldfish-comet': {id: 'goldfish-comet', file: 'goldfish-comet_lo.glb', length: 0.44, forwardAxis: '+z', motion: 'swim'},
  'golden-orfe': {id: 'golden-orfe', file: 'golden-orfe_lo.glb', length: 0.48, forwardAxis: '+z', motion: 'swim'},
  'perch': {id: 'perch', file: 'perch_lo.glb', length: 0.42, forwardAxis: '+z', motion: 'swim'},
  'bluegill': {id: 'bluegill', file: 'bluegill_lo.glb', length: 0.38, forwardAxis: '+z', motion: 'swim'},
  'madai': {id: 'madai', file: 'madai_lo.glb', length: 0.62, forwardAxis: '+x', motion: 'swim', alphaCutout: true},
  'kurodai': {id: 'kurodai', file: 'kurodai_lo.glb', length: 0.56, forwardAxis: '+x', motion: 'swim', alphaCutout: true},
  'aji': {id: 'aji', file: 'aji_lo.glb', length: 0.44, forwardAxis: '+x', motion: 'swim', alphaCutout: true},
  'saba': {id: 'saba', file: 'saba_lo.glb', length: 0.50, forwardAxis: '+x', motion: 'swim', alphaCutout: true},
  'kasago': {id: 'kasago', file: 'kasago_lo.glb', length: 0.48, forwardAxis: '+x', motion: 'swim', alphaCutout: true},
  'suzuki': {id: 'suzuki', file: 'suzuki_lo.glb', length: 0.72, forwardAxis: '+x', motion: 'swim', alphaCutout: true},
  'dragonfly-emperor': {id: 'dragonfly-emperor', file: 'dragonfly-emperor-body_lo.glb', length: 0.28, forwardAxis: '+z', motion: 'dragonfly', wingTexture: 'dragonfly-wings.webp'},
  'dragonfly-darter': {id: 'dragonfly-darter', file: 'dragonfly-darter-body_lo.glb', length: 0.24, forwardAxis: '+z', motion: 'dragonfly', wingTexture: 'damselfly-wings.webp'},
  'water-strider': {id: 'water-strider', file: 'water-strider_lo.glb', length: 0.22, forwardAxis: '+z', motion: 'skater'},
  'whirligig-beetle': {id: 'whirligig-beetle', file: 'whirligig-beetle_lo.glb', length: 0.16, forwardAxis: '+z', motion: 'skater'},
  'shore-crab': {id: 'shore-crab', file: 'shore-crab_lo.glb', length: 0.30, forwardAxis: '+z', motion: 'scuttle'},
  'hermit-crab': {id: 'hermit-crab', file: 'hermit-crab_lo.glb', length: 0.26, forwardAxis: '+z', motion: 'scuttle'},
  'crayfish-signal': {id: 'crayfish-signal', file: 'crayfish-signal_lo.glb', length: 0.30, forwardAxis: '+z', motion: 'scuttle'},
  'pond-snail': {id: 'pond-snail', file: 'pond-snail_lo.glb', length: 0.18, forwardAxis: '+z', motion: 'snail'},
};

const BASE_URL = '/models/simpond/';

/** Shared live sky-lighting uniforms updated each frame by garden-stage.ts for SimPond creature readability. */
export const simpondLighting = {
  daylight: {value: 1.0},
  sunDir: {value: new THREE.Vector3(0.4, 0.7, 0.5)},
};

/**
 * Normalizes realistic glTF PBR materials from SimPond so they harmonize with SlimeFable's stylized
 * lighting and NEVER turn pitch-black at night:
 * - Forces metalness = 0 & removes metalnessMap (fixes glTF 2.0 default metallicFactor=1.0 on frog/newt)
 * - Clamps roughness to organic matte-satin [0.46, 0.78]
 * - Lifts envMapIntensity and softly brightens dark-calibrated realistic albedo textures
 */
export function normalizeSimPondMaterial(cm: THREE.MeshStandardMaterial, spec: SimPondSpeciesSpec): void {
  if (spec.alphaCutout) {
    cm.alphaTest = 0.35;
    cm.transparent = false;
    cm.depthWrite = true;
    cm.side = THREE.DoubleSide;
  }
  cm.metalness = 0.0;
  cm.metalnessMap = null;
  if (cm.roughness !== undefined) {
    cm.roughness = Math.min(Math.max(cm.roughness ?? 0.60, 0.46), 0.78);
  }
  cm.envMapIntensity = 1.25;
  if (cm.color) {
    cm.color.multiplyScalar(1.16);
    cm.color.r = Math.min(cm.color.r, 1.35);
    cm.color.g = Math.min(cm.color.g, 1.35);
    cm.color.b = Math.min(cm.color.b, 1.35);
  }
}

interface CachedSimPondAsset {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  size: [number, number, number];
  minY: number;
  center: [number, number, number];
}

const assetCache = new Map<SimPondSpeciesId, CachedSimPondAsset>();
const assetLoading = new Map<SimPondSpeciesId, Promise<CachedSimPondAsset | null>>();
const wingTexCache = new Map<string, THREE.Texture>();
let sharedLoader: GLTFLoader | null = null;
let sharedTexLoader: THREE.TextureLoader | null = null;
let loadQueue: {id: SimPondSpeciesId; resolve: (v: CachedSimPondAsset | null) => void}[] = [];
let activeLoads = 0;

function canFetchInBrowser(): boolean {
  return typeof window !== 'undefined' && typeof fetch === 'function';
}

function getWingTexture(file: string): THREE.Texture | null {
  if (!canFetchInBrowser()) return null;
  const hit = wingTexCache.get(file);
  if (hit) return hit;
  sharedTexLoader ??= new THREE.TextureLoader();
  const tex = sharedTexLoader.load(`${BASE_URL}${file}`);
  tex.colorSpace = THREE.SRGBColorSpace;
  wingTexCache.set(file, tex);
  return tex;
}

function pumpQueue() {
  while (activeLoads < 3 && loadQueue.length) {
    const {id, resolve} = loadQueue.shift()!;
    activeLoads++;
    const spec = SIMPOND_SPECIES[id];
    sharedLoader ??= new GLTFLoader();
    sharedLoader.loadAsync(`${BASE_URL}${spec.file}`).then(gltf => {
      const root = gltf.scene;
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      const sizeVec = new THREE.Vector3();
      const centerVec = new THREE.Vector3();
      box.getSize(sizeVec);
      box.getCenter(centerVec);
      const entry: CachedSimPondAsset = {
        scene: root,
        animations: gltf.animations ?? [],
        size: [Math.max(sizeVec.x, 1e-3), Math.max(sizeVec.y, 1e-3), Math.max(sizeVec.z, 1e-3)],
        minY: Number.isFinite(box.min.y) ? box.min.y : 0,
        center: [centerVec.x, centerVec.y, centerVec.z],
      };
      assetCache.set(id, entry);
      resolve(entry);
    }).catch(err => {
      console.warn(`[SimPondAssets] failed to load ${spec.file}`, err);
      resolve(null);
    }).finally(() => {
      activeLoads--;
      pumpQueue();
    });
  }
}

export function loadSimPondAsset(id: SimPondSpeciesId): Promise<CachedSimPondAsset | null> {
  if (!canFetchInBrowser()) return Promise.resolve(null);
  const hit = assetCache.get(id);
  if (hit) return Promise.resolve(hit);
  const inflight = assetLoading.get(id);
  if (inflight) return inflight;
  const p = new Promise<CachedSimPondAsset | null>(resolve => loadQueue.push({id, resolve}));
  assetLoading.set(id, p);
  pumpQueue();
  return p;
}

/**
 * Injects SimPond-style travelling spine-wave swimming / crustacean scuttle wiggle (when applicable)
 * AND stylized night moonlight fill + soft Fresnel rim lighting on ALL SimPond creatures so they
 * remain luminous and readable at night instead of crushing to black silhouettes.
 */
function attachProceduralMotionShader(
  mat: THREE.MeshStandardMaterial,
  motion: SimPondMotionKind,
  forwardAxis: '+z' | '+x',
  uniforms: {uSwimPhase: {value: number}; uSwimAmp: {value: number}},
) {
  const hasVertMotion = motion === 'swim' || motion === 'scuttle' || motion === 'skater';
  const isX = forwardAxis === '+x';
  mat.onBeforeCompile = (shader: any) => {
    shader.uniforms.uSimPondDaylight = simpondLighting.daylight;
    if (hasVertMotion) {
      shader.uniforms.uSwimPhase = uniforms.uSwimPhase;
      shader.uniforms.uSwimAmp = uniforms.uSwimAmp;
      shader.vertexShader =
        `uniform float uSwimPhase, uSwimAmp;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          motion === 'swim'
            ? `#include <begin_vertex>
               {
                 // Spine axis normalized roughly in [-1, 1]; head stays calm, caudal tail whips
                 float spine = ${isX ? 'position.x' : 'position.z'};
                 float tailMask = clamp(0.45 - spine * 0.62, 0.0, 1.35);
                 float wave = sin(uSwimPhase - spine * 4.4) * uSwimAmp * (0.14 + 0.86 * tailMask * tailMask);
                 ${isX ? 'transformed.z += wave;' : 'transformed.x += wave;'}
               }`
            : `#include <begin_vertex>
               {
                 float legMask = smoothstep(0.08, 0.45, length(position.xz));
                 float wiggle = sin(uSwimPhase + position.x * 9.0 + position.z * 7.0) * uSwimAmp * legMask;
                 transformed.y += abs(wiggle) * 0.55;
                 transformed.z += wiggle * 0.35;
               }`,
        );
    }
    shader.fragmentShader =
      `uniform float uSimPondDaylight;\n` +
      shader.fragmentShader.replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        // Stylized moonlight bounce + cool-silver Fresnel rim at night (zero effect in full daylight)
        float spNight = 1.0 - smoothstep(0.08, 0.56, uSimPondDaylight);
        if (spNight > 0.005) {
          vec3 spV = normalize(vViewPosition);
          vec3 spN = normalize(normal);
          float spRim = pow(1.0 - max(dot(spN, spV), 0.0), 2.2);
          float spUp = clamp(spN.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 moonFill = diffuseColor.rgb * vec3(0.11, 0.16, 0.25) * (0.55 + 0.45 * spUp);
          vec3 moonRim = mix(vec3(0.16, 0.26, 0.42), diffuseColor.rgb * vec3(0.45, 0.62, 0.85), 0.45) * spRim * 0.22;
          reflectedLight.indirectDiffuse += (moonFill + moonRim) * spNight;
        }`,
      );
  };
  mat.customProgramCacheKey = () => `simpond-${hasVertMotion ? motion : 'lit'}-${forwardAxis}-v2`;
  mat.needsUpdate = true;
}

export interface SimPondActorHandle {
  readonly group: THREE.Group;
  readonly species: SimPondSpeciesId;
  readonly ready: boolean;
  /** Crossfade skeletal animation clip by name (e.g. 'sit', 'croak', 'hop', 'swim', 'float', 'walk', 'rest', 'court'). */
  setAnim(name: string, fadeSec?: number, timeScale?: number): void;
  /** Advance procedural swim phase or skeletal AnimationMixer. */
  update(dt: number, swimFreq?: number, swimAmp?: number): void;
  dispose(): void;
}

export function spawnSimPondActor(
  id: SimPondSpeciesId,
  opts: {
    scale?: number;
    layer?: number;
    castShadow?: boolean;
    groundOnFeet?: boolean;
    onReady?: (handle: SimPondActorHandle) => void;
  } = {},
): SimPondActorHandle {
  const spec = SIMPOND_SPECIES[id];
  const group = new THREE.Group();
  group.name = `simpond-${id}`;
  group.userData.walkThrough = true;

  const uniforms = {
    uSwimPhase: {value: Math.random() * Math.PI * 2},
    uSwimAmp: {value: spec.motion === 'swim' ? 0.14 : 0.04},
  };

  let isReady = false;
  let disposed = false;
  let mixer: THREE.AnimationMixer | null = null;
  const actions: Record<string, THREE.AnimationAction> = {};
  let currentClip = '';
  let pendingClip = '';
  let pendingFade = 0.18;
  let pendingTimeScale = 1;
  const wingPivots: {piv: THREE.Group; side: number; phase: number}[] = [];

  const handle: SimPondActorHandle = {
    group,
    species: id,
    get ready() { return isReady; },
    setAnim(name: string, fadeSec = 0.18, timeScale = 1) {
      pendingClip = name;
      pendingFade = fadeSec;
      pendingTimeScale = timeScale;
      if (!mixer || !actions[name]) return;
      const next = actions[name];
      next.timeScale = timeScale;
      if (currentClip === name) return;
      const prev = actions[currentClip];
      next.reset().setEffectiveWeight(1).play();
      if (prev && fadeSec > 0) prev.crossFadeTo(next, fadeSec, false);
      else if (prev) prev.stop();
      currentClip = name;
    },
    update(dt: number, swimFreq = 6.0, swimAmp = 0.14) {
      const clamped = Math.min(dt, 0.05);
      if (mixer) mixer.update(clamped);
      uniforms.uSwimPhase.value += clamped * swimFreq;
      uniforms.uSwimAmp.value = swimAmp;
      if (wingPivots.length) {
        const ph = uniforms.uSwimPhase.value;
        for (const w of wingPivots) {
          w.piv.rotation.z = w.side * (Math.sin(ph + w.phase) * swimAmp + 0.12);
        }
      }
    },
    dispose() {
      disposed = true;
      if (mixer) {
        mixer.stopAllAction();
        mixer = null;
      }
      group.removeFromParent();
    },
  };

  void loadSimPondAsset(id).then(entry => {
    if (disposed || !entry) return;
    const isSkinned = spec.motion === 'skinned' && entry.animations.length > 0;
    const instance = isSkinned ? (cloneSkeleton(entry.scene) as THREE.Group) : entry.scene.clone(true);

    const maxHoriz = Math.max(entry.size[0], entry.size[2], 1e-3);
    const targetLen = spec.length * (opts.scale ?? 1);
    const s = targetLen / maxHoriz;

    const holder = new THREE.Group();
    if (spec.forwardAxis === '+x') holder.rotation.y = -Math.PI / 2;
    instance.scale.setScalar(s);
    if (opts.groundOnFeet) {
      instance.position.set(-entry.center[0] * s, -entry.minY * s, -entry.center[2] * s);
    } else {
      instance.position.set(-entry.center[0] * s, -entry.center[1] * s, -entry.center[2] * s);
    }

    const layer = opts.layer ?? 1;
    instance.traverse((node: any) => {
      if (!node.isMesh) return;
      node.layers.set(layer);
      node.castShadow = opts.castShadow ?? false;
      node.receiveShadow = true;
      node.frustumCulled = true;
      const srcMats = Array.isArray(node.material) ? node.material : [node.material];
      const clonedMats = srcMats.map((m: THREE.Material) => {
        const cm = m.clone() as THREE.MeshStandardMaterial;
        normalizeSimPondMaterial(cm, spec);
        attachProceduralMotionShader(cm, spec.motion, spec.forwardAxis, uniforms);
        return cm;
      });
      node.material = Array.isArray(node.material) ? clonedMats : clonedMats[0];
    });

    holder.add(instance);

    // Attach 4 veined translucent wings to dragonfly body GLBs
    if (spec.motion === 'dragonfly') {
      const tex = spec.wingTexture ? getWingTexture(spec.wingTexture) : null;
      const wMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: tex ?? undefined,
        transparent: true,
        opacity: tex ? 0.88 : 0.62,
        alphaTest: 0.08,
        roughness: 0.35,
        metalness: 0.02,
        envMapIntensity: 1.25,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const span = targetLen * 0.62;
      const chord = targetLen * 0.18;
      const foreGeo = new THREE.PlaneGeometry(span, chord).rotateX(-Math.PI / 2).translate(span * 0.5, 0, 0);
      const hindGeo = new THREE.PlaneGeometry(span * 0.90, chord * 1.1).rotateX(-Math.PI / 2).translate(span * 0.45, 0, 0);
      for (const side of [-1, 1]) {
        for (const [geo, dz, phase] of [[foreGeo, targetLen * 0.14, 0], [hindGeo, targetLen * 0.04, 1.3]] as const) {
          const piv = new THREE.Group();
          piv.position.set(side * targetLen * 0.04, targetLen * 0.06, dz);
          const mesh = new THREE.Mesh(geo, wMat);
          if (side < 0) mesh.scale.x = -1;
          mesh.layers.set(layer);
          piv.add(mesh);
          holder.add(piv);
          wingPivots.push({piv, side, phase});
        }
      }
    }

    group.add(holder);

    if (isSkinned) {
      mixer = new THREE.AnimationMixer(instance);
      for (const clip of entry.animations) {
        const act = mixer.clipAction(clip);
        actions[clip.name] = act;
      }
      const initial = (pendingClip && actions[pendingClip]) ? pendingClip : (entry.animations[0]?.name ?? '');
      if (initial) {
        actions[initial].timeScale = pendingTimeScale;
        actions[initial].play();
        currentClip = initial;
      }
    }

    isReady = true;
    opts.onReady?.(handle);
  });

  return handle;
}
