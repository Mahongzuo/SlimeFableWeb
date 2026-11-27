import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Originals of batched meshes move here: no camera renders it, so they keep their place in the graph. */
export const BATCHED_LAYER = 7;

const SAFE_MATERIALS = new Set(['MeshStandardMaterial', 'MeshPhysicalMaterial', 'MeshLambertMaterial', 'MeshPhongMaterial', 'MeshToonMaterial', 'MeshBasicMaterial']);
/** Interactive or animated props that must stay individual meshes. */
const DYNAMIC_NAMES = /(^|[-_\s/:])(water|portal|shard|pickup|fish|marine|boat|door|lectern|slime|fx|steam|smoke|flag|sail|bird|critter|windmill|ghost|preview|highlight)s?($|[-_\s/:\d])/i;
const MAX_VERTS = 4000;
const CELL = 24;
const SCAN_INTERVAL = 1;

interface Member {
  mesh: THREE.Mesh;
  mask: number;
  matrix: Float32Array;
}

interface Batch {
  mesh: THREE.Mesh;
  root: THREE.Object3D;
  members: Member[];
}

/**
 * Merges still, small, opaque meshes per (zone, material, render flags, 24 m cell) into one draw.
 * A mesh qualifies after two scans without moving. If a batched original later moves, is hidden,
 * changes material or leaves the scene, its batch dissolves and the originals take over again.
 */
export class StaticBatcher {
  enabled = true;
  readonly batches: Batch[] = [];
  private seen = new WeakMap<THREE.Mesh, Float32Array>();
  private batched = new WeakSet<THREE.Mesh>();
  private dynamic = new WeakSet<THREE.Mesh>();
  private scanIn = 3;
  private tmpInv = new THREE.Matrix4();
  private tmpM = new THREE.Matrix4();
  private tmpV = new THREE.Vector3();

  constructor(private scene: THREE.Scene, private roots: RegExp = /^zone-/) {}

  get drawSavings() {
    let n = 0;
    for (const b of this.batches) n += b.members.length - 1;
    return n;
  }

  update(dt: number) {
    if (!this.enabled || (this.scanIn -= dt) > 0) return;
    this.scanIn = SCAN_INTERVAL;
    this.validate();
    for (const root of this.scene.children) if (this.roots.test(root.name)) this.collect(root);
  }

  /** Restores every original (used when disabling or for A/B checks). */
  clear() {
    while (this.batches.length) this.dissolve(this.batches[this.batches.length - 1]);
  }

  private validate() {
    for (let i = this.batches.length - 1; i >= 0; i--) {
      const b = this.batches[i];
      let broken: Member | null = null;
      for (const m of b.members) {
        if (!sameMatrix(m.mesh.matrixWorld, m.matrix) || !visibleUnder(m.mesh, b.root) || m.mesh.layers.mask !== 1 << BATCHED_LAYER || m.mesh.material !== b.mesh.material) {
          broken = m;
          break;
        }
      }
      if (broken) {
        this.dynamic.add(broken.mesh);
        this.dissolve(b);
      }
    }
  }

  private dissolve(b: Batch) {
    for (const m of b.members) {
      if (m.mesh.layers.mask === 1 << BATCHED_LAYER) m.mesh.layers.mask = m.mask;
      this.batched.delete(m.mesh);
      delete m.mesh.userData.staticBatched;
      this.seen.delete(m.mesh);
    }
    b.mesh.removeFromParent();
    b.mesh.geometry.dispose();
    this.batches.splice(this.batches.indexOf(b), 1);
  }

  private qualifies(o: THREE.Object3D): o is THREE.Mesh {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (m as any).isInstancedMesh || (m as any).isSkinnedMesh || (m as any).isBatchedMesh) return false;
    if (this.batched.has(m) || this.dynamic.has(m) || m.userData.staticBatch) return false;
    if (Array.isArray(m.material) || m.morphTargetInfluences || m.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) return false;
    const mat = m.material as THREE.Material;
    if (!SAFE_MATERIALS.has(mat.type) || mat.transparent || /windy/.test(mat.customProgramCacheKey())) return false;
    const g = m.geometry;
    const pos = g.attributes.position;
    if (!pos || pos.count > MAX_VERTS || Object.keys(g.morphAttributes).length) return false;
    for (let n: THREE.Object3D | null = m; n; n = n.parent) if (DYNAMIC_NAMES.test(n.name)) return false;
    return true;
  }

  private collect(root: THREE.Object3D) {
    const groups = new Map<string, THREE.Mesh[]>();
    root.traverse(o => {
      if (!this.qualifies(o) || !visibleUnder(o, root)) return;
      const prev = this.seen.get(o);
      if (!prev || !sameMatrix(o.matrixWorld, prev)) {
        // First sighting, or it moved since the last scan: wait for it to settle
        this.seen.set(o, new Float32Array(o.matrixWorld.elements));
        return;
      }
      const g = o.geometry;
      o.getWorldPosition(this.tmpV);
      const cell = `${Math.floor(this.tmpV.x / CELL)},${Math.floor(this.tmpV.z / CELL)}`;
      const attrs = Object.keys(g.attributes)
        .sort()
        .map(k => {
          const a = g.attributes[k] as THREE.BufferAttribute;
          return `${k}:${a.itemSize}:${a.array.constructor.name}:${a.normalized ? 1 : 0}`;
        })
        .join(',');
      const key = [(o.material as THREE.Material).uuid, o.layers.mask, o.castShadow ? 1 : 0, o.receiveShadow ? 1 : 0, o.renderOrder, o.frustumCulled ? 1 : 0, cell, attrs].join('|');
      let list = groups.get(key);
      if (!list) groups.set(key, (list = []));
      list.push(o);
    });
    root.updateWorldMatrix(true, false);
    this.tmpInv.copy(root.matrixWorld).invert();
    for (const list of groups.values()) if (list.length >= 3) this.build(root, list);
  }

  private build(root: THREE.Object3D, list: THREE.Mesh[]) {
    const geos: THREE.BufferGeometry[] = [];
    for (const m of list) {
      let g = m.geometry.clone();
      if (!g.index) {
        const n = g.attributes.position.count;
        const idx = n > 65535 ? new Uint32Array(n) : new Uint16Array(n);
        for (let i = 0; i < n; i++) idx[i] = i;
        g.setIndex(new THREE.BufferAttribute(idx, 1));
      }
      g.clearGroups();
      this.tmpM.multiplyMatrices(this.tmpInv, m.matrixWorld);
      g.applyMatrix4(this.tmpM);
      if (this.tmpM.determinant() < 0) g = flipWinding(g);
      geos.push(g);
    }
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) {
      for (const m of list) this.dynamic.add(m);
      return;
    }
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    const first = list[0];
    const mesh = new THREE.Mesh(merged, first.material);
    mesh.name = `static-batch:${first.name || first.parent?.name || 'mesh'}`;
    mesh.layers.mask = first.layers.mask;
    mesh.castShadow = first.castShadow;
    mesh.receiveShadow = first.receiveShadow;
    mesh.renderOrder = first.renderOrder;
    mesh.frustumCulled = first.frustumCulled;
    mesh.matrixAutoUpdate = false;
    mesh.userData.staticBatch = true;
    root.add(mesh);
    mesh.updateMatrixWorld(true);
    const members: Member[] = list.map(m => {
      const member = {mesh: m, mask: m.layers.mask, matrix: new Float32Array(m.matrixWorld.elements)};
      m.layers.mask = 1 << BATCHED_LAYER;
      m.userData.staticBatched = true;
      this.batched.add(m);
      return member;
    });
    this.batches.push({mesh, root, members});
  }
}

function sameMatrix(m: THREE.Matrix4, e: Float32Array) {
  const a = m.elements;
  for (let i = 0; i < 16; i++) if (Math.abs(a[i] - e[i]) > 1e-5) return false;
  return true;
}

/** Visible relative to its zone root, and still attached under it. */
function visibleUnder(o: THREE.Object3D, root: THREE.Object3D) {
  for (let n: THREE.Object3D | null = o; n; n = n.parent) {
    if (n === root) return true;
    if (!n.visible) return false;
  }
  return false;
}

function flipWinding(g: THREE.BufferGeometry) {
  const idx = g.index!;
  for (let i = 0; i < idx.count; i += 3) {
    const b = idx.getX(i + 1);
    idx.setX(i + 1, idx.getX(i + 2));
    idx.setX(i + 2, b);
  }
  return g;
}
