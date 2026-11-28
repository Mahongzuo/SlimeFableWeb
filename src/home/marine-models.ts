import * as T from 'three';
import {GLTFLoader, type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface IslandSpecimen {name: string; x: number; y: number; z: number; yaw: number; size: number; slopeX?: number; slopeZ?: number}

/** One set of geometry and textures per harbour. Individual schools and streamed islands borrow it. */
export class MarineModels {
  private loader = new GLTFLoader();
  private cache = new Map<string, Promise<GLTF>>();
  private owned = new Set<{dispose(): void}>();
  private closed = false;

  load(name: string): Promise<GLTF> {
    const cached = this.cache.get(name);
    if (cached) return cached;
    const pending: Promise<GLTF> = this.loader.loadAsync(new URL('ocean/models/' + name + '.glb', document.baseURI).href).then(asset => {
        const resources = new Set<{dispose(): void}>();
        asset.scene.traverse(node => {
          if (!(node instanceof T.Mesh)) return;
          node.layers.set(1);
          node.castShadow = node.receiveShadow = true;
          resources.add(node.geometry);
          for (const mat of Array.isArray(node.material) ? node.material : [node.material]) {
            resources.add(mat);
            for (const item of Object.values(mat)) if (item instanceof T.Texture) resources.add(item as T.Texture);
            if (mat.transparent) {
              mat.transparent = false;
              mat.alphaTest = .32;
              mat.depthWrite = true;
              mat.side = T.DoubleSide;
            }
          }
        });
        for (const r of resources) {
          if (this.closed) r.dispose(); else this.owned.add(r);
        }
        return asset;
      }).catch(error => { this.cache.delete(name); throw error; });
    this.cache.set(name, pending);
    return pending;
  }

  island(parent: T.Group, placements: IslandSpecimen[]) {
    const root = new T.Group();
    root.name = 'water-pro-island-grove';
    parent.add(root);
    let closed = false, density = 1;
    const batches: T.InstancedMesh[] = [];
    const applyDensity = () => {
      for (const mesh of batches) {
        mesh.count = mesh.name.startsWith('shrub') ? Math.ceil(mesh.instanceMatrix.count * density) : mesh.instanceMatrix.count;
      }
    };
    void this.load('island-specimens').then(asset => {
      if (closed || this.closed) return;
      asset.scene.updateMatrixWorld(true);
      const pose = new T.Object3D(), matrix = new T.Matrix4();
      for (const name of new Set(placements.map(p => p.name))) {
        const group = placements.filter(p => p.name === name);
        asset.scene.getObjectByName(name)?.traverse(node => {
          if (!(node instanceof T.Mesh)) return;
          const mesh = new T.InstancedMesh(node.geometry, node.material, group.length);
          mesh.layers.set(1);
          mesh.name = name;
          mesh.castShadow = mesh.receiveShadow = true;
          group.forEach((p, j) => {
            pose.position.set(p.x,p.y,p.z);
            pose.scale.setScalar(p.size);
            pose.rotation.y = p.yaw;
            pose.updateMatrix();
            const m = pose.matrix.elements;
            m[1] += (p.slopeX ?? 0)*m[0]+(p.slopeZ ?? 0)*m[2];
            m[9] += (p.slopeX ?? 0)*m[8]+(p.slopeZ ?? 0)*m[10];
            mesh.setMatrixAt(j, matrix.multiplyMatrices(pose.matrix, node.matrixWorld));
          });
          mesh.computeBoundingSphere();
          root.add(mesh);
          batches.push(mesh);
        });
      }
      applyDensity();
    }).catch(e => console.warn('Island models:', e));
    return {
      setDensity(value: number) { density = Math.max(0, Math.min(1, value)); applyDensity(); },
      dispose() { closed = true; root.removeFromParent(); for (const mesh of batches) mesh.dispose(); },
    };
  }

  fish(parent: T.Group, scale: number, phase: number) {
    let root: T.Object3D | undefined, mixer: T.AnimationMixer | undefined, removed = false;
    void this.load('fish').then(asset => {
      if (removed || this.closed) return;
      root = cloneSkeleton(asset.scene);
      root.name = 'water-pro-fish';
      root.scale.setScalar(scale);
      root.rotation.y = Math.PI / 4; // The demo's 225° correction uses a -Z look-at; our actors swim along +Z.
      parent.add(root);
      mixer = new T.AnimationMixer(root);
      const action = mixer.clipAction(asset.animations[0]);
      action.play();
      action.time = phase * action.getClip().duration;
    }).catch(e => console.warn('Ocean fish:', e));
    return {
      update(dt: number) { mixer?.update(dt); },
      dispose() {
        removed = true;
        if (root) {
          mixer?.stopAllAction();
          mixer?.uncacheRoot(root);
          root.traverse(node => { if (node instanceof T.SkinnedMesh) node.skeleton.dispose(); });
          root.removeFromParent();
        }
      },
    };
  }

  dispose() {
    this.closed = true;
    for (const r of this.owned) r.dispose();
    this.owned.clear();
    this.cache.clear();
  }
}
