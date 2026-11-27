import {climateMaterial} from './climate-material';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

interface CachedAsset {
  scene: any;
  animations: any[];
  size: [number, number, number];
  minY: number;
}

const BASE_PATH = '/models/dreamworld/';
const cache = new Map<string, CachedAsset>();
const loading = new Map<string, Promise<CachedAsset | null>>();
const queue: {id: string; resolve: (v: CachedAsset | null) => void}[] = [];
const activeMixers = new Set<{mixer: any; root: any; speed: number}>();
let activeLoads = 0;
let sharedLoader: GLTFLoader | null = null;

const GROUNDED_BUILDINGS = new Set([
  'build-teahall',
  'build-huizhou',
  'build-thatch',
  'pack-pavilion',
  'pack-windmill',
  'pack-greenhouse',
  'watermill',
  'build-red-pagoda',
]);

/**
 * Seals structural roof-to-wall air gaps in specific DreamWorld GLBs and adds a recessed
 * stone foundation skirt under solid buildings so no building ever looks disassembled or floating on slopes.
 */
function patchBuildingStructure(T: any, id: string, root: any, box: any) {
  if (!GROUNDED_BUILDINGS.has(id)) return;
  const makeMat = (hex: number, roughness = 0.86) => {
    const m = new T.MeshStandardMaterial({color: hex, roughness, metalness: 0.02});
    climateMaterial(m, 'structure');
    return m;
  };

  // 1. Seal build-teahall wall-to-roof open gap (walls stop at y=2.57 while hipped roof starts at y=2.74)
  if (id === 'build-teahall') {
    const plaster = makeMat(0xcbbda5, 0.88);
    const timber = makeMat(0x7c5d4e, 0.82);
    const roofDark = makeMat(0x4b6b73, 0.78);
    // Upper wall frieze closing the open gap cleanly into the roof cavity
    const frieze = new T.Mesh(new T.BoxGeometry(4.66, 0.36, 2.62), plaster);
    frieze.position.set(0, 2.68, -0.70);
    // Continuous timber eave beam & front veranda header tying all 4 columns cleanly to the eaves
    const beam = new T.Mesh(new T.BoxGeometry(4.84, 0.16, 2.74), timber);
    beam.position.set(0, 2.75, -0.70);
    const porchBeam = new T.Mesh(new T.BoxGeometry(5.16, 0.18, 0.24), timber);
    porchBeam.position.set(0, 2.74, 1.56);
    for (const sx of [-2.34, 2.34]) {
      const sideTie = new T.Mesh(new T.BoxGeometry(0.22, 0.18, 1.12), timber);
      sideTie.position.set(sx, 2.74, 1.05);
      root.add(sideTie);
    }
    // Solid inner roof soffit/ridge backing so no sky leaks between roof panels
    const soffit = new T.Mesh(new T.BoxGeometry(5.10, 0.14, 3.80), roofDark);
    soffit.position.set(0, 2.86, -0.02);
    root.add(frieze, beam, porchBeam, soffit);
  } else if (id === 'pack-pavilion') {
    const timber = makeMat(0x7b5642, 0.82);
    const collar = new T.Mesh(new T.BoxGeometry(3.38, 0.22, 2.94), timber);
    collar.position.set(0, 2.80, 0);
    root.add(collar);
  }

  // 2. Grounded stone foundation skirt extending downward (-1.15m..+0.015m, inset 0.04m to prevent Z-fighting)
  const size = new T.Vector3();
  const center = new T.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const skirtH = 1.18;
  const stoneMat = makeMat(0x9ca49c, 0.90);
  let skirt: any;
  if (id === 'pack-windmill') {
    const r = Math.max(0.8, Math.min(size.x, size.z) * 0.46);
    skirt = new T.Mesh(new T.CylinderGeometry(r, r * 1.08, skirtH, 16), stoneMat);
    skirt.position.set(center.x, box.min.y - skirtH * 0.5 + 0.02, center.z);
  } else {
    const w = Math.max(0.6, size.x * 0.91);
    const d = Math.max(0.6, size.z * 0.88);
    skirt = new T.Mesh(new T.BoxGeometry(w, skirtH, d), stoneMat);
    skirt.position.set(center.x, box.min.y - skirtH * 0.5 + 0.02, center.z);
  }
  skirt.name = `${id}-foundation-skirt`;
  root.add(skirt);
}

function pump(T: any) {
  while (activeLoads < 2 && queue.length) {
    const {id, resolve} = queue.shift()!;
    activeLoads++;
    sharedLoader ??= new GLTFLoader();
    sharedLoader.loadAsync(`${BASE_PATH}${id}.glb`).then(gltf => {
      const root = gltf.scene;
      if (!id.startsWith('fauna-')) {
        const plant=/^(nature-|pack-ginkgo|waterside-reeds|waterside-lily)/.test(id);
        root.traverse((node:any)=>{
          if (!node.isMesh) return;
          for (const material of [].concat(node.material)) climateMaterial(material,plant?'leaves':'structure');
        });
      }
      root.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(root);
      const sizeVec = new T.Vector3();
      box.getSize(sizeVec);
      const origMinY = Number.isFinite(box.min.y) ? box.min.y : 0;
      patchBuildingStructure(T, id, root, box);
      const entry: CachedAsset = {
        scene: root,
        animations: gltf.animations ?? [],
        size: [Math.max(sizeVec.x, 0.1), Math.max(sizeVec.y, 0.1), Math.max(sizeVec.z, 0.1)],
        minY: origMinY,
      };
      cache.set(id, entry);
      resolve(entry);
    }).catch(err => {
      console.warn(`[ModelPack] failed to load ${id}.glb`, err);
      resolve(null);
    }).finally(() => {
      activeLoads--;
      pump(T);
    });
  }
}

export function loadPackAsset(T: any, id: string): Promise<CachedAsset | null> {
  const hit = cache.get(id);
  if (hit) return Promise.resolve(hit);
  const inflight = loading.get(id);
  if (inflight) return inflight;
  const p = new Promise<CachedAsset | null>(resolve => queue.push({id, resolve}));
  loading.set(id, p);
  pump(T);
  return p;
}

export interface SpawnedPackModel {
  group: any;
  dispose: () => void;
  setMotion?: (walking: boolean) => void;
}

/**
 * Instantiates a DreamWorld GLB scaled uniformly to `targetWidth` metres and grounded at local y = 0.
 * Returns a group immediately (populating asynchronously if still loading) so world build never blocks.
 */
export function spawnPackModel(
  T: any,
  assetId: string,
  targetWidth: number,
  opts: {castShadow?: boolean; outline?: boolean; phaseOffset?: number; onLoaded?: (group: any) => void} = {},
): SpawnedPackModel {
  const group = new T.Group();
  group.name = `dw-${assetId}`;
  let disposed = false;
  let mixerEntry: {mixer: any; root: any; speed: number; actions?: Record<string, any>} | null = null;
  const api: SpawnedPackModel = {
    group,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      if (mixerEntry) {
        mixerEntry.mixer.stopAllAction();
        mixerEntry.mixer.uncacheRoot(mixerEntry.root);
        activeMixers.delete(mixerEntry);
        mixerEntry = null;
      }
      group.removeFromParent();
    },
    setMotion: (walking: boolean) => {
      if (!mixerEntry?.actions) return;
      const {Walk, Idle} = mixerEntry.actions;
      if (Walk && Idle) {
        Walk.setEffectiveWeight(walking ? 1 : 0);
        Idle.setEffectiveWeight(walking ? 0 : 1);
      }
    },
  };

  // Subtle lightweight placeholder while GLB streams in
  const placeholder = new T.Mesh(
    new T.CylinderGeometry(targetWidth * 0.28, targetWidth * 0.34, 0.2, 8),
    new T.MeshStandardMaterial({color: 0xd9d2c0, transparent: true, opacity: 0.45, roughness: 0.9}),
  );
  placeholder.position.y = 0.1;
  placeholder.layers.set(1);
  group.add(placeholder);

  void loadPackAsset(T, assetId).then(entry => {
    placeholder.removeFromParent();
    placeholder.geometry.dispose();
    placeholder.material.dispose();
    if (disposed || !entry) return;

    const clone = entry.scene.clone(true);
    const maxHoriz = Math.max(entry.size[0], entry.size[2], 0.1);
    const uniformScale = targetWidth / maxHoriz;
    clone.scale.setScalar(uniformScale);
    clone.position.y = -entry.minY * uniformScale;

    const layer = opts.outline === false ? 1 : 0;
    clone.traverse((node: any) => {
      if (!node.isMesh) return;
      node.castShadow = opts.castShadow !== false;
      node.receiveShadow = true;
      node.layers.set(layer);
    });
    group.add(clone);

    if (entry.animations.length) {
      const mixer = new T.AnimationMixer(clone);
      const actions: Record<string, any> = {};
      for (const clip of entry.animations) {
        const key = String(clip.name).split('_')[0];
        const act = mixer.clipAction(clip);
        actions[key] = act;
        act.play();
        if (key === 'Walk') act.setEffectiveWeight(0);
        if (key === 'Idle' || key === 'Crouch') {
          act.time = ((opts.phaseOffset ?? Math.random()) % 1) * Math.max(clip.duration, 0.1);
        }
      }
      mixerEntry = {mixer, root: clone, speed: 1, actions};
      activeMixers.add(mixerEntry);
    }
    opts.onLoaded?.(group);
  });

  return api;
}

export function updatePackAnimations(dt: number) {
  if (!activeMixers.size) return;
  const clamped = Math.min(dt, 0.05);
  for (const m of activeMixers) m.mixer.update(clamped * m.speed);
}

export const packThumbUrl = (assetId: string) => `${BASE_PATH}${assetId}.png`;
