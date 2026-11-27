import {climateMaterial} from './climate-material';
import {isInPlazaNoBuild} from './build-catalog';
import {isInsideHomeTerritory} from '../world/expansion';
import {ensureHome, type LifeData, type VoxelBlockData, type VoxelBlueprint, type VoxelShape} from '../life/state';
import {VOXEL_ITEMS, isVoxelUnlocked, voxelUnitPrice} from './voxel-catalog';
import {
  buildChunkGeometryData,
  chunkCoords,
  chunkKey,
  detectFencedPastures,
  mergeVoxelCollisionBoxes,
  voxelKey,
  type DetectedPasturePen,
} from './voxel-mesher';
import type {Box} from '../slime/types';

export interface VoxelEngineHost {
  ctx: any;
  life: LifeData;
  ground: (x: number, z: number) => number | null;
  souvenirs: () => string[];
}

export const VOXEL_MAX_Y = 22;
export const VOXEL_MIN_Y = -2;

/**
 * Three.js runtime for Storybook Voxel-Craft:
 * - Chunked Greedy-meshed geometry with climateMaterial (seasons, rain wet, snow cover).
 * - Automatic 3D AABB collision merging + bounce pad detection + fenced pasture recognition.
 * - Raycast face-normal snapping for Minecraft-style stacking, bridging & Shift line-dragging.
 */
export class VoxelEngine {
  readonly root: any;
  private T: any;
  private chunkGroups = new Map<string, any>();
  private materialCache = new Map<string, any>();
  private lookup = new Map<string, VoxelBlockData>();
  private cachedBoxes: Box[] = [];
  private cachedPens: DetectedPasturePen[] = [];
  private bounceCells: {x: number; y: number; z: number}[] = [];
  private previewMesh: any;

  constructor(private host: VoxelEngineHost) {
    this.T = host.ctx.THREE;
    this.root = new this.T.Group();
    this.root.name = 'home-voxel-world';
    host.ctx.scene.add(this.root);

    this.previewMesh = new this.T.Mesh(
      new this.T.BoxGeometry(1.02, 1.02, 1.02),
      new this.T.MeshBasicMaterial({color: 0x3ba886, wireframe: true, transparent: true, opacity: 0.9}),
    );
    this.previewMesh.visible = false;
    this.previewMesh.layers.set(1);
    this.root.add(this.previewMesh);

    this.rebuildAll();
  }

  get collisionBoxes(): Box[] { return this.cachedBoxes; }
  get fencedPastures(): DetectedPasturePen[] { return this.cachedPens; }
  get bouncePads(): readonly {x: number; y: number; z: number}[] { return this.bounceCells; }

  private getMaterial(materialKey: string, blockId: string) {
    const cached = this.materialCache.get(materialKey);
    if (cached) return cached;
    const T = this.T;
    const def = VOXEL_ITEMS[blockId];
    let mat: any;
    if (materialKey.startsWith('emissive:') && def) {
      mat = new T.MeshStandardMaterial({
        vertexColors: true,
        roughness: def.roughness,
        emissive: def.emissive ?? 0xffb347,
        emissiveIntensity: def.emissiveIntensity ?? 0.85,
      });
    } else if (materialKey.startsWith('trans:') && def) {
      mat = new T.MeshStandardMaterial({
        vertexColors: true,
        roughness: def.roughness,
        metalness: def.metalness ?? 0.08,
        transparent: true,
        opacity: def.opacity ?? 0.55,
        depthWrite: false,
      });
    } else if (materialKey.startsWith('metal:') && def) {
      mat = new T.MeshStandardMaterial({
        vertexColors: true,
        roughness: def.roughness,
        metalness: def.metalness ?? 0.4,
      });
      climateMaterial(mat, 'structure');
    } else {
      const surface = materialKey.startsWith('leaves:') ? 'leaves' : 'structure';
      mat = new T.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.86,
        metalness: 0.02,
      });
      climateMaterial(mat, surface);
    }
    this.materialCache.set(materialKey, mat);
    return mat;
  }

  rebuildAll() {
    for (const g of this.chunkGroups.values()) {
      this.disposeChunkGroup(g);
    }
    this.chunkGroups.clear();
    this.lookup.clear();
    this.bounceCells = [];

    const voxels = ensureHome(this.host.life).voxels ?? [];
    const dirtyChunks = new Set<string>();
    for (const b of voxels) {
      this.lookup.set(voxelKey(b.x, b.y, b.z), b);
      const [cx, cz] = chunkCoords(b.x, b.z);
      dirtyChunks.add(chunkKey(cx, cz));
      if (VOXEL_ITEMS[b.blockId]?.isBounce) this.bounceCells.push({x: b.x, y: b.y, z: b.z});
    }
    for (const ck of dirtyChunks) this.rebuildChunkKey(ck);
    this.recomputeDerived(voxels);
  }

  private disposeChunkGroup(g: any) {
    g.traverse((o: any) => {
      if (o.isMesh && o.geometry) o.geometry.dispose();
    });
    g.removeFromParent();
  }

  private rebuildChunkKey(ck: string) {
    const old = this.chunkGroups.get(ck);
    if (old) { this.disposeChunkGroup(old); this.chunkGroups.delete(ck); }
    const [cxStr, czStr] = ck.split(',');
    const cx = Number(cxStr), cz = Number(czStr);
    const chunkBlocks: VoxelBlockData[] = [];
    for (const b of this.lookup.values()) {
      const [bx, bz] = chunkCoords(b.x, b.z);
      if (bx === cx && bz === cz) chunkBlocks.push(b);
    }
    if (!chunkBlocks.length) return;

    const buckets = buildChunkGeometryData(chunkBlocks, this.lookup);
    const T = this.T;
    const group = new T.Group();
    group.name = `voxel-chunk-${ck}`;
    for (const bucket of buckets) {
      if (!bucket.indices.length) continue;
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(bucket.positions, 3));
      geo.setAttribute('normal', new T.Float32BufferAttribute(bucket.normals, 3));
      geo.setAttribute('color', new T.Float32BufferAttribute(bucket.colors, 3));
      geo.setAttribute('uv', new T.Float32BufferAttribute(bucket.uvs, 2));
      geo.setIndex(bucket.indices);
      const mat = this.getMaterial(bucket.materialKey, bucket.blockId);
      const mesh = new T.Mesh(geo, mat);
      mesh.castShadow = !bucket.materialKey.startsWith('trans:');
      mesh.receiveShadow = true;
      mesh.userData.voxelChunk = ck;
      group.add(mesh);
    }
    this.root.add(group);
    this.chunkGroups.set(ck, group);
  }

  private recomputeDerived(voxels: VoxelBlockData[]) {
    this.cachedBoxes = mergeVoxelCollisionBoxes(voxels);
    this.cachedPens = detectFencedPastures(voxels);
    this.bounceCells = voxels
      .filter(b => VOXEL_ITEMS[b.blockId]?.isBounce)
      .map(b => ({x: b.x, y: b.y, z: b.z}));
  }

  private rebuildAround(x: number, z: number) {
    const keys = new Set<string>();
    for (const dx of [-1, 0, 1]) {
      for (const dz of [-1, 0, 1]) {
        const [cx, cz] = chunkCoords(x + dx, z + dz);
        keys.add(chunkKey(cx, cz));
      }
    }
    for (const ck of keys) this.rebuildChunkKey(ck);
    this.recomputeDerived(ensureHome(this.host.life).voxels ?? []);
  }

  /** Raycasts against existing voxel chunks first (for stacking/bridging), falling back to terrain ground. */
  pickTarget(raycaster: any, fallbackGroundPos: [number, number, number] | null, demolish: boolean): {
    placeCell: [number, number, number];
    hitCell: [number, number, number] | null;
    hitBlock: VoxelBlockData | null;
  } | null {
    const meshes: any[] = [];
    for (const g of this.chunkGroups.values()) {
      g.traverse((o: any) => { if (o.isMesh) meshes.push(o); });
    }
    if (meshes.length) {
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length) {
        const hit = hits[0];
        const n = hit.face?.normal ?? {x: 0, y: 1, z: 0};
        // Step slightly inward to find hit cell, and slightly outward to find adjacent place cell
        const inX = Math.floor(hit.point.x - n.x * 0.05);
        const inY = Math.floor(hit.point.y - n.y * 0.05);
        const inZ = Math.floor(hit.point.z - n.z * 0.05);
        const hitBlock = this.lookup.get(voxelKey(inX, inY, inZ)) ?? null;
        if (demolish && hitBlock) {
          return {placeCell: [inX, inY, inZ], hitCell: [inX, inY, inZ], hitBlock};
        }
        const outX = Math.floor(hit.point.x + n.x * 0.05);
        const outY = Math.floor(hit.point.y + n.y * 0.05);
        const outZ = Math.floor(hit.point.z + n.z * 0.05);
        return {placeCell: [outX, outY, outZ], hitCell: hitBlock ? [inX, inY, inZ] : null, hitBlock};
      }
    }
    if (!fallbackGroundPos) return null;
    const gx = Math.floor(fallbackGroundPos[0]);
    const gz = Math.floor(fallbackGroundPos[2]);
    const gy = Math.floor((this.host.ground(gx + 0.5, gz + 0.5) ?? fallbackGroundPos[1]) + 0.05);
    const existing = this.lookup.get(voxelKey(gx, gy, gz)) ?? null;
    return {placeCell: [gx, existing && !demolish ? gy + 1 : gy, gz], hitCell: existing ? [gx, gy, gz] : null, hitBlock: existing};
  }

  canPlaceAt(x: number, y: number, z: number, blockId: string): {ok: boolean; reason?: string} {
    const def = VOXEL_ITEMS[blockId];
    if (!def) return {ok: false, reason: '未知积木类型'};
    if (!isVoxelUnlocked(this.host.life, blockId, this.host.souvenirs().length)) {
      return {ok: false, reason: def.unlockHint ?? '尚未解锁该积木'};
    }
    if (y < VOXEL_MIN_Y || y > VOXEL_MAX_Y) return {ok: false, reason: `建造高度限制在 ${VOXEL_MIN_Y}~${VOXEL_MAX_Y} 米`};
    const home = ensureHome(this.host.life);
    if (!isInsideHomeTerritory(x + 0.5, z + 0.5, home.expansions, 0.5)) {
      return {ok: false, reason: '超出家园领土边界（可先开垦相邻领土）'};
    }
    if (isInPlazaNoBuild(x + 0.5, z + 0.5, 0.7)) {
      return {ok: false, reason: '时光门广场与史书台不可堆放积木'};
    }
    if (this.lookup.has(voxelKey(x, y, z))) {
      return {ok: false, reason: '该格已有积木'};
    }
    const price = voxelUnitPrice(this.host.life, blockId);
    if (this.host.life.coins < price) {
      return {ok: false, reason: `贝壳不足（需要 ${price} 🐚）`};
    }
    return {ok: true};
  }

  placeBlock(x: number, y: number, z: number, blockId: string, shape?: VoxelShape, rot = 0, tint?: number | null): {ok: boolean; reason?: string; cost: number} {
    const check = this.canPlaceAt(x, y, z, blockId);
    if (!check.ok) return {ok: false, reason: check.reason, cost: 0};
    const def = VOXEL_ITEMS[blockId]!;
    const cost = voxelUnitPrice(this.host.life, blockId);
    this.host.life.coins -= cost;
    const data: VoxelBlockData = {
      x, y, z, blockId,
      shape: shape ?? def.defaultShape,
      rot: ((rot % 4) + 4) % 4,
      ...(typeof tint === 'number' ? {tint} : {}),
      paidShells: cost,
    };
    const home = ensureHome(this.host.life);
    home.voxels ??= [];
    home.voxels.push(data);
    this.lookup.set(voxelKey(x, y, z), data);
    this.rebuildAround(x, z);
    return {ok: true, cost};
  }

  removeBlock(x: number, y: number, z: number): {ok: boolean; refunded: number} {
    const k = voxelKey(x, y, z);
    const existing = this.lookup.get(k);
    if (!existing) return {ok: false, refunded: 0};
    const home = ensureHome(this.host.life);
    home.voxels ??= [];
    const idx = home.voxels.findIndex(b => b.x === x && b.y === y && b.z === z);
    if (idx >= 0) home.voxels.splice(idx, 1);
    this.lookup.delete(k);
    const refunded = existing.paidShells ?? VOXEL_ITEMS[existing.blockId]?.price ?? 0;
    this.host.life.coins += refunded;
    this.rebuildAround(x, z);
    return {ok: true, refunded};
  }

  /** Stamps an entire VoxelBlueprint anchored at (ax, ay, az) with quarter-turn yaw rotation. */
  stampBlueprint(bp: VoxelBlueprint, ax: number, ay: number, az: number, rot = 0): {ok: boolean; placed: number; totalCost: number; reason?: string} {
    const home = ensureHome(this.host.life);
    const r = ((rot % 4) + 4) % 4;
    const rotOffset = (dx: number, dz: number): [number, number] => {
      if (r === 1) return [-dz, dx];
      if (r === 2) return [-dx, -dz];
      if (r === 3) return [dz, -dx];
      return [dx, dz];
    };
    const plan: {x: number; y: number; z: number; block: Omit<VoxelBlockData, 'paidShells'>; cost: number}[] = [];
    let totalCost = 0;
    for (const b of bp.blocks) {
      const [rx, rz] = rotOffset(b.x, b.z);
      const tx = ax + rx, ty = ay + b.y, tz = az + rz;
      if (ty < VOXEL_MIN_Y || ty > VOXEL_MAX_Y) return {ok: false, placed: 0, totalCost: 0, reason: '蓝图超出高度限制'};
      if (!isInsideHomeTerritory(tx + 0.5, tz + 0.5, home.expansions, 0.5)) return {ok: false, placed: 0, totalCost: 0, reason: '蓝图超出领土边界'};
      if (isInPlazaNoBuild(tx + 0.5, tz + 0.5, 0.7)) return {ok: false, placed: 0, totalCost: 0, reason: '蓝图与时光门广场重叠'};
      if (this.lookup.has(voxelKey(tx, ty, tz))) continue;
      const cost = voxelUnitPrice(this.host.life, b.blockId);
      totalCost += cost;
      plan.push({x: tx, y: ty, z: tz, block: b, cost});
    }
    if (!plan.length) return {ok: false, placed: 0, totalCost: 0, reason: '目标位置已存在积木'};
    if (this.host.life.coins < totalCost) return {ok: false, placed: 0, totalCost, reason: `贝壳不足（整套蓝图需 ${totalCost} 🐚）`};

    this.host.life.coins -= totalCost;
    home.voxels ??= [];
    const dirtyChunks = new Set<string>();
    for (const item of plan) {
      const data: VoxelBlockData = {
        x: item.x, y: item.y, z: item.z,
        blockId: item.block.blockId,
        shape: item.block.shape,
        rot: (((item.block.rot ?? 0) + r) % 4 + 4) % 4,
        ...(typeof item.block.tint === 'number' ? {tint: item.block.tint} : {}),
        paidShells: item.cost,
      };
      home.voxels.push(data);
      this.lookup.set(voxelKey(data.x, data.y, data.z), data);
      for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) {
        const [cx, cz] = chunkCoords(data.x + dx, data.z + dz);
        dirtyChunks.add(chunkKey(cx, cz));
      }
    }
    for (const ck of dirtyChunks) this.rebuildChunkKey(ck);
    this.recomputeDerived(home.voxels);
    return {ok: true, placed: plan.length, totalCost};
  }

  /** Captures nearby player voxel blocks around a focus point into a reusable custom blueprint! */
  saveSelectionBlueprint(name: string, cx: number, cz: number, radius = 6): VoxelBlueprint | null {
    const home = ensureHome(this.host.life);
    const near = (home.voxels ?? []).filter(b => Math.abs(b.x - cx) <= radius && Math.abs(b.z - cz) <= radius);
    if (!near.length) return null;
    const minY = Math.min(...near.map(b => b.y));
    const ax = Math.round(cx), az = Math.round(cz);
    const bp: VoxelBlueprint = {
      id: `custom-${Date.now().toString(36)}`,
      name: name.trim() || `自建蓝图 ${(home.voxelBlueprints?.length ?? 0) + 1}`,
      createdAt: Date.now(),
      blocks: near.map(b => ({
        x: b.x - ax, y: b.y - minY, z: b.z - az,
        blockId: b.blockId, shape: b.shape, rot: b.rot, tint: b.tint,
      })),
    };
    home.voxelBlueprints ??= [];
    home.voxelBlueprints.push(bp);
    return bp;
  }

  setPreview(visible: boolean, cell?: [number, number, number], valid = true, demolish = false) {
    this.previewMesh.visible = visible;
    if (!visible || !cell) return;
    this.previewMesh.position.set(cell[0] + 0.5, cell[1] + 0.5, cell[2] + 0.5);
    this.previewMesh.material.color.setHex(demolish ? 0xe05844 : valid ? 0x3ba886 : 0xcb5944);
  }

  dispose() {
    for (const g of this.chunkGroups.values()) this.disposeChunkGroup(g);
    this.chunkGroups.clear();
    for (const m of this.materialCache.values()) m.dispose();
    this.materialCache.clear();
    this.previewMesh.geometry.dispose();
    this.previewMesh.material.dispose();
    this.root.removeFromParent();
  }
}
