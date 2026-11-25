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
      const entry: CachedAsset = {
        scene: root,
        animations: gltf.animations ?? [],
        size: [Math.max(sizeVec.x, 0.1), Math.max(sizeVec.y, 0.1), Math.max(sizeVec.z, 0.1)],
        minY: Number.isFinite(box.min.y) ? box.min.y : 0,
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
