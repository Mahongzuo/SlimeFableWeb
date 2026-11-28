import {architectureIds, landscapeAssetUrl} from './architecture-assets';
import {propStructures} from '../world/linqi/prop-structures';
import {climateMaterial} from './climate-material';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {isRanchModel, makeRanchAnimator, ranchModelUrl, type RanchPose} from './ranch-models';

interface CachedAsset {
  scene: any;
  animations: any[];
  size: [number, number, number];
  minY: number;
  center?: [number, number];
}

const cache = new Map<string, CachedAsset>();
const loading = new Map<string, Promise<CachedAsset | null>>();
const queue: {id: string; resolve: (v: CachedAsset | null) => void}[] = [];
const animalUsers=new Map<string,number>();
function releaseAnimalAsset(id:string){
  if(animalUsers.has(id))return;
  const entry=cache.get(id);if(!entry)return;
  cache.delete(id);loading.delete(id);
  const resources=new Set<{dispose:()=>void}>();
  entry.scene.traverse((o:any)=>{
    if(!o.isMesh)return;resources.add(o.geometry);
    for(const mat of Array.isArray(o.material)?o.material:[o.material]){
      resources.add(mat);for(const prop of Object.values(mat))if((prop as any)?.isTexture)resources.add(prop as any);
    }
    if(o.skeleton)resources.add(o.skeleton);
  });
  for(const resource of resources)resource.dispose();
}
const activeMixers = new Set<{mixer: any; root: any; speed: number; animator?: ReturnType<typeof makeRanchAnimator>}>();
let activeLoads = 0;
let sharedLoader: GLTFLoader | null = null;

// Recessed foundations support solid buildings on sloping ground. The top sits
// inside the floor, and open bridges, stilt houses and gate passages stay clear.
const foundations: Record<string, [number, number, number, number]> = {
  'build-teahall': [4.62, 3.05, 0, -.33], 'build-huizhou': [4.64, 3.10, 0, -.08],
  'build-thatch': [4.16, 3.08, 0, 0], 'pack-greenhouse': [4.36, 3.55, 0, .13],
  'watermill': [3.32, 2.50, -.40, -.15], 'build-red-pagoda': [3.05, 3.05, 0, 0],
  'pack-pavilion': [3.12, 2.95, 0, .02], 'pack-windmill': [2.56, 2.56, 0, 0],
};

function addFoundation(T: any, id: string, root: any, floor: number) {
  const dimensions = foundations[id];
  if (!dimensions) return;
  const [width, depth, x, z] = dimensions;
  const geometry = id === 'pack-windmill'
    ? new T.CylinderGeometry(width / 2, width * .53, 1.18, 8)
    : new T.BoxGeometry(width, 1.18, depth);
  const stone = new T.MeshStandardMaterial({color: 0x98958c, roughness: .94});
  climateMaterial(stone, 'structure');
  const skirt = new T.Mesh(geometry, stone);
  skirt.name = `${id}-foundation-skirt`;
  skirt.position.set(x, floor - .58, z);
  root.add(skirt);
}

function pump(T: any) {
  while (activeLoads < 2 && queue.length) {
    const {id, resolve} = queue.shift()!;
    activeLoads++;
    sharedLoader ??= new GLTFLoader();
    const animal = isRanchModel(id);
    sharedLoader.loadAsync(animal ? ranchModelUrl(id, 'glb') : landscapeAssetUrl(id, 'glb')).then(gltf => {
      const root = gltf.scene;
      if (!animal && !id.startsWith('fauna-')) {
        const plant=/^(nature-|pack-ginkgo|waterside-reeds|waterside-lily)/.test(id);
        root.traverse((node:any)=>{
          if (!node.isMesh) return;
          for (const material of [].concat(node.material)) climateMaterial(material,plant?'leaves':'structure');
        });
      }
      // Wings in bind pose may be fully spread. Size and ground from the standing pose.
      const idle = animal && gltf.animations.find(clip => /^(idle|survey)$/i.test(clip.name));
      const sample = idle ? new T.AnimationMixer(root) : undefined;
      if (sample) { sample.clipAction(idle).play(); sample.update(0); }
      root.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(root, animal);
      sample?.stopAllAction();
      sample?.uncacheRoot(root);
      const sizeVec = new T.Vector3();
      box.getSize(sizeVec);
      const origMinY = Number.isFinite(box.min.y) ? box.min.y : 0;
      addFoundation(T, id, root, origMinY);
      const entry: CachedAsset = {
        scene: root,
        animations: gltf.animations ?? [],
        size: [Math.max(sizeVec.x, 0.1), Math.max(sizeVec.y, 0.1), Math.max(sizeVec.z, 0.1)],
        minY: origMinY,
        center: animal ? [(box.min.x + box.max.x) / 2, (box.min.z + box.max.z) / 2] : undefined,
      };
      cache.set(id, entry);
      resolve(entry);
    }).catch(err => {
      console.warn(`[ModelPack] failed to load ${id}.glb`, err);
      resolve(null);
    }).finally(() => {
      loading.delete(id);
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
  setPose?: (pose: RanchPose) => void;
}

/**
 * Instantiates a DreamWorld GLB scaled uniformly to `targetWidth` metres and grounded at local y = 0.
 * Returns a group immediately (populating asynchronously if still loading) so world build never blocks.
 */
export function spawnPackModel(
  T: any,
  assetId: string,
  targetWidth: number,
  opts: {clip?: string; castShadow?: boolean; outline?: boolean; placeholder?:boolean; phaseOffset?: number; onLoaded?: (group: any) => void; onError?:()=>void} = {},
): SpawnedPackModel {
  const group = new T.Group();
  group.name = `dw-${assetId}`;
  let disposed = false;
  const animal = isRanchModel(assetId);
  if(animal)animalUsers.set(assetId,(animalUsers.get(assetId)??0)+1);
  let pose: RanchPose = 'idle';
  let mixerEntry: {mixer: any; root: any; speed: number; actions?: Record<string, any>; animator?: ReturnType<typeof makeRanchAnimator>} | null = null;
  const api: SpawnedPackModel = {
    group,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      if (mixerEntry) {
        mixerEntry.mixer.stopAllAction();
        mixerEntry.mixer.uncacheRoot(mixerEntry.root);
        activeMixers.delete(mixerEntry);
        if (animal) {
          const skeletons = new Set<any>();
          mixerEntry.root.traverse((node: any) => { if (node.isSkinnedMesh) skeletons.add(node.skeleton); });
          for (const skeleton of skeletons) skeleton.dispose();
        }
        mixerEntry = null;
      }
      group.removeFromParent();
      if(animal){const left=(animalUsers.get(assetId)??1)-1;if(left)animalUsers.set(assetId,left);else{animalUsers.delete(assetId);releaseAnimalAsset(assetId);}}
    },
    setPose: (next: RanchPose) => { pose = next; mixerEntry?.animator?.setPose(next); },
    setMotion: (walking: boolean) => {
      if (animal) { api.setPose!(walking ? 'walk' : 'idle'); return; }
      if (!mixerEntry?.actions) return;
      const {Walk, Idle} = mixerEntry.actions;
      if (Walk && Idle) {
        Walk.setEffectiveWeight(walking ? 1 : 0);
        Idle.setEffectiveWeight(walking ? 0 : 1);
      }
    },
  };

  // Subtle lightweight placeholder while GLB streams in
  const placeholder = opts.placeholder===false?null:new T.Mesh(
    new T.CylinderGeometry(targetWidth * 0.28, targetWidth * 0.34, 0.2, 8),
    new T.MeshStandardMaterial({color: 0xd9d2c0, transparent: true, opacity: 0.45, roughness: 0.9}),
  );
  if(placeholder){placeholder.position.y = 0.1;placeholder.layers.set(1);group.add(placeholder);}

  void loadPackAsset(T, assetId).then(entry => {
    placeholder?.removeFromParent();
    placeholder?.geometry.dispose();
    placeholder?.material.dispose();
    if (disposed || !entry) {if(animal)releaseAnimalAsset(assetId);if(!disposed)opts.onError?.();return;}

    const clone = animal ? cloneSkeleton(entry.scene) : entry.scene.clone(true);
    const maxHoriz = architectureIds.has(assetId) ? propStructures[assetId].span : Math.max(entry.size[0], entry.size[2], 0.1);
    const uniformScale = targetWidth / maxHoriz;
    clone.scale.setScalar(uniformScale);
    clone.position.y = -entry.minY * uniformScale;
    if (entry.center) {
      clone.position.x = -entry.center[0] * uniformScale;
      clone.position.z = -entry.center[1] * uniformScale;
    }

    const layer = opts.outline === false ? 1 : 0;
    clone.traverse((node: any) => {
      if (!node.isMesh) return;
      node.castShadow = opts.castShadow !== false;
      node.receiveShadow = true;
      node.layers.set(layer);
    });
    group.add(clone);

    if (animal && entry.animations.length) {
      const mixer = new T.AnimationMixer(clone);
      const animator = makeRanchAnimator(clone, entry.animations, mixer, opts.phaseOffset ?? Math.random());
      animator.setPose(pose);
      animator.update(0);
      mixerEntry = {mixer, root: clone, speed: 1, animator};
      activeMixers.add(mixerEntry);
    } else if (entry.animations.length) {
      const mixer = new T.AnimationMixer(clone);
      const actions: Record<string, any> = {};
      for (const clip of entry.animations) {
        const key = String(clip.name).split('_')[0];
        if (opts.clip && key !== opts.clip) continue;
        const act = mixer.clipAction(clip);
        actions[key] = act;
        act.play();
        if (key === 'Walk') act.setEffectiveWeight(0);
        if (opts.clip || key === 'Idle' || key === 'Crouch') {
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
  for (const m of activeMixers) {
    if (m.animator) m.animator.update(clamped * m.speed);
    else m.mixer.update(clamped * m.speed);
  }
}

export const packThumbUrl = (assetId: string) => isRanchModel(assetId) ? ranchModelUrl(assetId, 'png') : landscapeAssetUrl(assetId, 'png');
