import type {VoxelBlockData, VoxelShape} from '../life/state';
import type {Box} from '../slime/types';
import {VOXEL_ITEMS} from './voxel-catalog';

/**
 * Pure-data Chunk Greedy Mesher, 3D AABB Collision Box Merger, and Enclosed Pasture Fence Detector.
 * Guarantees ZERO interior coplanar faces (zero Z-fighting) and minimal dynamic collision boxes
 * so SlimeCharacter's existing sim.worker.ts handles large player-built voxel structures smoothly.
 */
export const VOXEL_CHUNK_SIZE = 16;

export const voxelKey = (x: number, y: number, z: number) => `${x},${y},${z}`;
export const chunkCoords = (x: number, z: number): [number, number] => [
  Math.floor(x / VOXEL_CHUNK_SIZE),
  Math.floor(z / VOXEL_CHUNK_SIZE),
];
export const chunkKey = (cx: number, cz: number) => `${cx},${cz}`;

export interface GreedyQuad {
  axis: 0 | 1 | 2;
  sign: -1 | 1;
  /** World-space quad corner coordinates [x, y, z] in counter-clockwise winding order. */
  corners: [[number, number, number], [number, number, number], [number, number, number], [number, number, number]];
  normal: [number, number, number];
  blockId: string;
  color: number;
  materialKey: string;
  uSpan: number;
  vSpan: number;
}

export interface ChunkMeshBucket {
  materialKey: string;
  blockId: string;
  positions: number[];
  normals: number[];
  colors: number[];
  uvs: number[];
  indices: number[];
  quadCount: number;
}

function isOpaqueCube(b: VoxelBlockData | undefined): boolean {
  if (!b) return false;
  const def = VOXEL_ITEMS[b.blockId];
  if (!def) return false;
  const shape = b.shape ?? def.defaultShape;
  return shape === 'cube' && def.opaqueCube;
}

function resolveColor(b: VoxelBlockData): number {
  if (typeof b.tint === 'number') return b.tint;
  return VOXEL_ITEMS[b.blockId]?.color ?? 0xcccccc;
}

function materialBucketKey(b: VoxelBlockData): string {
  const def = VOXEL_ITEMS[b.blockId];
  if (!def) return 'structure:opaque';
  if (def.emissive) return `emissive:${def.id}`;
  if (def.transparent) return `trans:${def.id}`;
  if (def.metalness && def.metalness > 0.2) return `metal:${def.id}`;
  return `${def.climateSurface}:opaque`;
}

/**
 * Generates non-overlapping face-culled Greedy Quads for all opaque cubes in a block map.
 * Every adjacent opaque pair shares a culled boundary, eliminating all coplanar Z-fighting.
 */
export function buildGreedyCubeQuads(blocks: VoxelBlockData[], allLookup?: Map<string, VoxelBlockData>): GreedyQuad[] {
  const map = allLookup ?? new Map<string, VoxelBlockData>(blocks.map(b => [voxelKey(b.x, b.y, b.z), b]));
  const cubes = blocks.filter(b => isOpaqueCube(b));
  if (!cubes.length) return [];

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const b of cubes) {
    if (b.x < minX) minX = b.x; if (b.x > maxX) maxX = b.x;
    if (b.y < minY) minY = b.y; if (b.y > maxY) maxY = b.y;
    if (b.z < minZ) minZ = b.z; if (b.z > maxZ) maxZ = b.z;
  }

  const mins = [minX, minY, minZ];
  const maxs = [maxX, maxY, maxZ];
  const quads: GreedyQuad[] = [];

  for (let axis = 0 as 0 | 1 | 2; axis < 3; axis = (axis + 1) as 0 | 1 | 2) {
    const uAxis = ((axis + 1) % 3) as 0 | 1 | 2;
    const vAxis = ((axis + 2) % 3) as 0 | 1 | 2;
    const uMin = mins[uAxis], uLen = maxs[uAxis] - uMin + 1;
    const vMin = mins[vAxis], vLen = maxs[vAxis] - vMin + 1;

    for (const sign of [-1, 1] as const) {
      for (let slice = mins[axis]; slice <= maxs[axis]; slice++) {
        // Build 2D mask of exposed faces on this slice
        const mask: ( {key: string; blockId: string; color: number; materialKey: string} | null )[] = new Array(uLen * vLen).fill(null);
        let anyFace = false;
        const coord = [0, 0, 0];
        const neighbor = [0, 0, 0];

        for (let v = 0; v < vLen; v++) {
          for (let u = 0; u < uLen; u++) {
            coord[axis] = slice;
            coord[uAxis] = uMin + u;
            coord[vAxis] = vMin + v;
            const cur = map.get(voxelKey(coord[0], coord[1], coord[2]));
            if (!isOpaqueCube(cur)) continue;

            neighbor[0] = coord[0]; neighbor[1] = coord[1]; neighbor[2] = coord[2];
            neighbor[axis] += sign;
            if (isOpaqueCube(map.get(voxelKey(neighbor[0], neighbor[1], neighbor[2])))) continue;

            const color = resolveColor(cur!);
            const mKey = materialBucketKey(cur!);
            mask[v * uLen + u] = {key: `${mKey}#${color}`, blockId: cur!.blockId, color, materialKey: mKey};
            anyFace = true;
          }
        }
        if (!anyFace) continue;

        // 2D greedy rectangle merge
        for (let v = 0; v < vLen; v++) {
          for (let u = 0; u < uLen; ) {
            const cell = mask[v * uLen + u];
            if (!cell) { u++; continue; }

            let w = 1;
            while (u + w < uLen && mask[v * uLen + (u + w)]?.key === cell.key) w++;

            let h = 1;
            outer: while (v + h < vLen) {
              for (let k = 0; k < w; k++) {
                if (mask[(v + h) * uLen + (u + k)]?.key !== cell.key) break outer;
              }
              h++;
            }

            // Emit quad at slice plane
            const plane = slice + (sign > 0 ? 1 : 0);
            const pt = (du: number, dv: number): [number, number, number] => {
              const p: [number, number, number] = [0, 0, 0];
              p[axis] = plane;
              p[uAxis] = uMin + u + du;
              p[vAxis] = vMin + v + dv;
              return p;
            };
            const p00 = pt(0, 0), p10 = pt(w, 0), p11 = pt(w, h), p01 = pt(0, h);
            const normal: [number, number, number] = [0, 0, 0];
            normal[axis] = sign;

            // Ensure outward CCW winding matching the cross product (uAxis × vAxis = +axis)
            const corners: GreedyQuad['corners'] = sign > 0 ? [p00, p10, p11, p01] : [p00, p01, p11, p10];
            quads.push({axis, sign, corners, normal, blockId: cell.blockId, color: cell.color, materialKey: cell.materialKey, uSpan: w, vSpan: h});

            for (let dv = 0; dv < h; dv++) {
              for (let du = 0; du < w; du++) mask[(v + dv) * uLen + (u + du)] = null;
            }
            u += w;
          }
        }
      }
    }
  }

  return quads;
}

function pushQuad(
  bucket: ChunkMeshBucket,
  c0: [number, number, number],
  c1: [number, number, number],
  c2: [number, number, number],
  c3: [number, number, number],
  normal: [number, number, number],
  hex: number,
  uSpan = 1,
  vSpan = 1,
) {
  const base = bucket.positions.length / 3;
  const r = ((hex >> 16) & 255) / 255;
  const g = ((hex >> 8) & 255) / 255;
  const b = (hex & 255) / 255;
  // Subtle directional shading baked into vertex color for crisp storybook readability
  const shade = normal[1] > 0.5 ? 1.0 : normal[1] < -0.5 ? 0.78 : Math.abs(normal[0]) > 0.5 ? 0.90 : 0.95;
  for (const p of [c0, c1, c2, c3]) {
    bucket.positions.push(p[0], p[1], p[2]);
    bucket.normals.push(normal[0], normal[1], normal[2]);
    bucket.colors.push(r * shade, g * shade, b * shade);
  }
  bucket.uvs.push(0, 0, uSpan, 0, uSpan, vSpan, 0, vSpan);
  bucket.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  bucket.quadCount++;
}

function pushBox(
  bucket: ChunkMeshBucket,
  x0: number, y0: number, z0: number,
  x1: number, y1: number, z1: number,
  hex: number,
) {
  // +Y
  pushQuad(bucket, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], hex, x1 - x0, z1 - z0);
  // -Y
  pushQuad(bucket, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], hex, x1 - x0, z1 - z0);
  // +Z
  pushQuad(bucket, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], hex, x1 - x0, y1 - y0);
  // -Z
  pushQuad(bucket, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], hex, x1 - x0, y1 - y0);
  // +X
  pushQuad(bucket, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], hex, z1 - z0, y1 - y0);
  // -X
  pushQuad(bucket, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], hex, z1 - z0, y1 - y0);
}

/** Rotates local [lx, lz] in [0,1]x[0,1] by rot*90deg around (0.5, 0.5). */
function rotXZ(lx: number, lz: number, rot: number): [number, number] {
  const r = ((rot % 4) + 4) % 4;
  if (r === 1) return [1 - lz, lx];
  if (r === 2) return [1 - lx, 1 - lz];
  if (r === 3) return [lz, 1 - lx];
  return [lx, lz];
}

function pushRotatedBox(
  bucket: ChunkMeshBucket,
  bx: number, by: number, bz: number,
  lx0: number, ly0: number, lz0: number,
  lx1: number, ly1: number, lz1: number,
  rot: number,
  hex: number,
) {
  const [ax, az] = rotXZ(lx0, lz0, rot);
  const [cx, cz] = rotXZ(lx1, lz1, rot);
  const x0 = bx + Math.min(ax, cx), x1 = bx + Math.max(ax, cx);
  const z0 = bz + Math.min(az, cz), z1 = bz + Math.max(az, cz);
  pushBox(bucket, x0, by + ly0, z0, x1, by + ly1, z1, hex);
}

/**
 * Builds complete render buckets for a chunk (Greedy-meshed cubes + clean non-overlapping specialty shapes).
 */
export function buildChunkGeometryData(
  chunkBlocks: VoxelBlockData[],
  allLookup: Map<string, VoxelBlockData>,
): ChunkMeshBucket[] {
  const buckets = new Map<string, ChunkMeshBucket>();
  const getBucket = (mKey: string, blockId: string) => {
    let b = buckets.get(mKey);
    if (!b) {
      b = {materialKey: mKey, blockId, positions: [], normals: [], colors: [], uvs: [], indices: [], quadCount: 0};
      buckets.set(mKey, b);
    }
    return b;
  };

  // 1. Greedy-meshed opaque cubes
  const quads = buildGreedyCubeQuads(chunkBlocks, allLookup);
  for (const q of quads) {
    const bucket = getBucket(q.materialKey, q.blockId);
    pushQuad(bucket, q.corners[0], q.corners[1], q.corners[2], q.corners[3], q.normal, q.color, q.uSpan, q.vSpan);
  }

  // 2. Specialty architectural shapes (all strictly inset/separated so zero coplanar faces ever occur)
  for (const b of chunkBlocks) {
    if (isOpaqueCube(b)) continue;
    const def = VOXEL_ITEMS[b.blockId];
    if (!def) continue;
    const shape: VoxelShape = b.shape ?? def.defaultShape;
    const hex = resolveColor(b);
    const accent = def.accentColor ?? hex;
    const rot = b.rot ?? 0;
    const bucket = getBucket(materialBucketKey(b), b.blockId);
    const {x, y, z} = b;

    if (shape === 'cube') {
      // Translucent cube (e.g. glass): cull adjacent same-block faces to avoid internal overlap
      const faces: [number, number, number, [number, number, number], [number, number, number], [number, number, number], [number, number, number]][] = [
        [0, 1, 0, [x, y + 1, z + 1], [x + 1, y + 1, z + 1], [x + 1, y + 1, z], [x, y + 1, z]],
        [0, -1, 0, [x, y, z], [x + 1, y, z], [x + 1, y, z + 1], [x, y, z + 1]],
        [0, 0, 1, [x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]],
        [0, 0, -1, [x + 1, y, z], [x, y, z], [x, y + 1, z], [x + 1, y + 1, z]],
        [1, 0, 0, [x + 1, y, z + 1], [x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1]],
        [-1, 0, 0, [x, y, z], [x, y, z + 1], [x, y + 1, z + 1], [x, y + 1, z]],
      ];
      for (const [nx, ny, nz, c0, c1, c2, c3] of faces) {
        const nb = allLookup.get(voxelKey(x + nx, y + ny, z + nz));
        if (nb && (isOpaqueCube(nb) || nb.blockId === b.blockId)) continue;
        pushQuad(bucket, c0, c1, c2, c3, [nx, ny, nz], hex);
      }
    } else if (shape === 'slab') {
      pushBox(bucket, x, y, z, x + 1, y + 0.5, z + 1, hex);
      if (def.isBounce) {
        // Raised spring pad top cap (strictly above 0.50 -> 0.58, inset 0.12)
        pushBox(bucket, x + 0.12, y + 0.50, z + 0.12, x + 0.88, y + 0.58, z + 0.88, accent);
      }
    } else if (shape === 'stairs') {
      // Lower full-width tread (0..0.5) + upper half-depth step (0.5..1.0), non-overlapping in Y!
      pushRotatedBox(bucket, x, y, z, 0, 0, 0, 1, 0.5, 1, rot, hex);
      pushRotatedBox(bucket, x, y, z, 0, 0.5, 0, 1, 1.0, 0.5, rot, accent);
    } else if (shape === 'slope') {
      // Stepped Jiangnan tiled roof slope (3 neat terraced eaves, zero coplanar overlap)
      pushRotatedBox(bucket, x, y, z, 0, 0, 0, 1, 0.34, 1, rot, hex);
      pushRotatedBox(bucket, x, y, z, 0, 0.34, 0, 1, 0.67, 0.67, rot, hex);
      pushRotatedBox(bucket, x, y, z, 0, 0.67, 0, 1, 1.0, 0.34, rot, accent);
    } else if (shape === 'pillar') {
      // Centered column with base plinth and top capital (strictly separated Y ranges)
      pushBox(bucket, x + 0.24, y, z + 0.24, x + 0.76, y + 0.12, z + 0.76, accent);
      pushBox(bucket, x + 0.32, y + 0.12, z + 0.32, x + 0.68, y + 0.88, z + 0.68, hex);
      pushBox(bucket, x + 0.24, y + 0.88, z + 0.24, x + 0.76, y + 1.0, z + 0.76, accent);
    } else if (shape === 'fence') {
      // Central post + auto-connecting rails to adjacent fence or solid blocks (no overlap with post!)
      pushBox(bucket, x + 0.40, y, z + 0.40, x + 0.60, y + 0.92, z + 0.60, hex);
      const connects = (nx: number, nz: number) => {
        const nb = allLookup.get(voxelKey(x + nx, y, z + nz));
        if (!nb) return false;
        const nd = VOXEL_ITEMS[nb.blockId];
        return !!(nd?.isFence || nd?.opaqueCube);
      };
      if (connects(1, 0)) {
        pushBox(bucket, x + 0.60, y + 0.28, z + 0.45, x + 1.0, y + 0.40, z + 0.55, accent);
        pushBox(bucket, x + 0.60, y + 0.64, z + 0.45, x + 1.0, y + 0.76, z + 0.55, accent);
      }
      if (connects(-1, 0)) {
        pushBox(bucket, x, y + 0.28, z + 0.45, x + 0.40, y + 0.40, z + 0.55, accent);
        pushBox(bucket, x, y + 0.64, z + 0.45, x + 0.40, y + 0.76, z + 0.55, accent);
      }
      if (connects(0, 1)) {
        pushBox(bucket, x + 0.45, y + 0.28, z + 0.60, x + 0.55, y + 0.40, z + 1.0, accent);
        pushBox(bucket, x + 0.45, y + 0.64, z + 0.60, x + 0.55, y + 0.76, z + 1.0, accent);
      }
      if (connects(0, -1)) {
        pushBox(bucket, x + 0.45, y + 0.28, z, x + 0.55, y + 0.40, z + 0.40, accent);
        pushBox(bucket, x + 0.45, y + 0.64, z, x + 0.55, y + 0.76, z + 0.40, accent);
      }
    } else if (shape === 'lantern') {
      // Hanging warm storybook paper lantern
      pushBox(bucket, x + 0.30, y + 0.14, z + 0.30, x + 0.70, y + 0.22, z + 0.70, accent);
      pushBox(bucket, x + 0.26, y + 0.22, z + 0.26, x + 0.74, y + 0.76, z + 0.74, hex);
      pushBox(bucket, x + 0.30, y + 0.76, z + 0.30, x + 0.70, y + 0.84, z + 0.70, accent);
    } else if (shape === 'water') {
      // Recessed shallow canal water surface (y+0.02..y+0.78), culling adjacent water sides
      pushQuad(bucket, [x, y + 0.78, z + 1], [x + 1, y + 0.78, z + 1], [x + 1, y + 0.78, z], [x, y + 0.78, z], [0, 1, 0], hex);
      const nbW = (dx: number, dz: number) => allLookup.get(voxelKey(x + dx, y, z + dz))?.blockId === b.blockId;
      if (!nbW(0, 1)) pushQuad(bucket, [x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 0.78, z + 1], [x, y + 0.78, z + 1], [0, 0, 1], hex);
      if (!nbW(0, -1)) pushQuad(bucket, [x + 1, y, z], [x, y, z], [x, y + 0.78, z], [x + 1, y + 0.78, z], [0, 0, -1], hex);
      if (!nbW(1, 0)) pushQuad(bucket, [x + 1, y, z + 1], [x + 1, y, z], [x + 1, y + 0.78, z], [x + 1, y + 0.78, z + 1], [1, 0, 0], hex);
      if (!nbW(-1, 0)) pushQuad(bucket, [x, y, z], [x, y, z + 1], [x, y + 0.78, z + 1], [x, y + 0.78, z], [-1, 0, 0], hex);
    }
  }

  return [...buckets.values()];
}

/**
 * 3D Greedy AABB Merger: compresses adjacent solid voxel cells into minimal collision Boxes
 * for SlimeCharacter's `setDynamicBoxes`. A 10x4 wall of 40 voxels becomes 1 Box!
 */
export function mergeVoxelCollisionBoxes(blocks: VoxelBlockData[]): Box[] {
  const boxes: Box[] = [];
  const fullCubes = new Set<string>();
  const coords: [number, number, number][] = [];

  for (const b of blocks) {
    const def = VOXEL_ITEMS[b.blockId];
    if (!def || !def.solid) continue;
    const shape: VoxelShape = b.shape ?? def.defaultShape;
    if (shape === 'cube' && !def.isBounce) {
      const k = voxelKey(b.x, b.y, b.z);
      if (!fullCubes.has(k)) {
        fullCubes.add(k);
        coords.push([b.x, b.y, b.z]);
      }
    } else if (shape === 'slab') {
      boxes.push({
        name: def.isBounce ? `voxel-bounce-${b.x}_${b.y}_${b.z}` : `voxel-slab-${b.x}_${b.y}_${b.z}`,
        min: [b.x, b.y, b.z],
        max: [b.x + 1, b.y + (def.isBounce ? 0.58 : 0.5), b.z + 1],
        camera: false,
      });
    } else if (shape === 'stairs' || shape === 'slope') {
      const rot = b.rot ?? 0;
      const [ax, az] = rotXZ(0, 0, rot);
      const [cx, cz] = rotXZ(1, 0.5, rot);
      boxes.push(
        {name: `voxel-step-lo-${b.x}_${b.y}_${b.z}`, min: [b.x, b.y, b.z], max: [b.x + 1, b.y + 0.5, b.z + 1], camera: false},
        {name: `voxel-step-hi-${b.x}_${b.y}_${b.z}`, min: [b.x + Math.min(ax, cx), b.y + 0.5, b.z + Math.min(az, cz)], max: [b.x + Math.max(ax, cx), b.y + 1, b.z + Math.max(az, cz)], camera: true},
      );
    } else if (shape === 'pillar') {
      boxes.push({name: `voxel-pillar-${b.x}_${b.y}_${b.z}`, min: [b.x + 0.24, b.y, b.z + 0.24], max: [b.x + 0.76, b.y + 1, b.z + 0.76], camera: true});
    } else if (shape === 'fence') {
      boxes.push({name: `voxel-fence-${b.x}_${b.y}_${b.z}`, min: [b.x + 0.15, b.y, b.z + 0.15], max: [b.x + 0.85, b.y + 0.95, b.z + 0.85], camera: false});
    }
  }

  // Sort deterministically (Y -> Z -> X) for greedy 3D cuboid merge
  coords.sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[0] - b[0]);
  const visited = new Set<string>();

  for (const [x0, y0, z0] of coords) {
    const startKey = voxelKey(x0, y0, z0);
    if (visited.has(startKey)) continue;

    // Expand along +X
    let dx = 1;
    while (fullCubes.has(voxelKey(x0 + dx, y0, z0)) && !visited.has(voxelKey(x0 + dx, y0, z0))) dx++;

    // Expand along +Z
    let dz = 1;
    expandZ: while (true) {
      for (let x = x0; x < x0 + dx; x++) {
        const k = voxelKey(x, y0, z0 + dz);
        if (!fullCubes.has(k) || visited.has(k)) break expandZ;
      }
      dz++;
    }

    // Expand along +Y
    let dy = 1;
    expandY: while (true) {
      for (let z = z0; z < z0 + dz; z++) {
        for (let x = x0; x < x0 + dx; x++) {
          const k = voxelKey(x, y0 + dy, z);
          if (!fullCubes.has(k) || visited.has(k)) break expandY;
        }
      }
      dy++;
    }

    for (let y = y0; y < y0 + dy; y++) {
      for (let z = z0; z < z0 + dz; z++) {
        for (let x = x0; x < x0 + dx; x++) visited.add(voxelKey(x, y, z));
      }
    }

    boxes.push({
      name: `voxel-merged-${x0}_${y0}_${z0}`,
      min: [x0, y0, z0],
      max: [x0 + dx, y0 + dy, z0 + dz],
      camera: dy >= 2 || (dx >= 2 && dz >= 2),
    });
  }

  return boxes;
}

export interface DetectedPasturePen {
  id: string;
  center: [number, number];
  y: number;
  area: number;
  capacityBonus: number;
}

/**
 * Flood-fill detector that recognizes player-built enclosed voxel fence rings (9..400 cells)
 * as authentic ranch pastures where adopted animals can roam!
 */
export function detectFencedPastures(blocks: VoxelBlockData[]): DetectedPasturePen[] {
  const byLayer = new Map<number, Set<string>>();
  const boundsByLayer = new Map<number, {minX: number; maxX: number; minZ: number; maxZ: number}>();

  for (const b of blocks) {
    const def = VOXEL_ITEMS[b.blockId];
    if (!def || (!def.isFence && !def.opaqueCube)) continue;
    let set = byLayer.get(b.y);
    if (!set) { set = new Set(); byLayer.set(b.y, set); }
    set.add(`${b.x},${b.z}`);
    const bd = boundsByLayer.get(b.y) ?? {minX: b.x, maxX: b.x, minZ: b.z, maxZ: b.z};
    bd.minX = Math.min(bd.minX, b.x); bd.maxX = Math.max(bd.maxX, b.x);
    bd.minZ = Math.min(bd.minZ, b.z); bd.maxZ = Math.max(bd.maxZ, b.z);
    boundsByLayer.set(b.y, bd);
  }

  const pens: DetectedPasturePen[] = [];
  for (const [layerY, walls] of byLayer) {
    // Only consider layers that actually contain at least 8 fence blocks
    const fenceCount = blocks.filter(b => b.y === layerY && VOXEL_ITEMS[b.blockId]?.isFence).length;
    if (fenceCount < 8) continue;

    const bd = boundsByLayer.get(layerY)!;
    if (bd.maxX - bd.minX < 2 || bd.maxZ - bd.minZ < 2 || (bd.maxX - bd.minX) > 36 || (bd.maxZ - bd.minZ) > 36) continue;

    const minX = bd.minX - 1, maxX = bd.maxX + 1, minZ = bd.minZ - 1, maxZ = bd.maxZ + 1;
    const outside = new Set<string>();
    const queue: [number, number][] = [[minX, minZ]];
    outside.add(`${minX},${minZ}`);

    // Flood-fill outside the bounding box
    while (queue.length) {
      const [cx, cz] = queue.shift()!;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, nz = cz + dz;
        if (nx < minX || nx > maxX || nz < minZ || nz > maxZ) continue;
        const k = `${nx},${nz}`;
        if (outside.has(k) || walls.has(k)) continue;
        outside.add(k);
        queue.push([nx, nz]);
      }
    }

    // Group remaining interior cells into connected enclosed pens
    const seenInside = new Set<string>();
    for (let x = bd.minX + 1; x < bd.maxX; x++) {
      for (let z = bd.minZ + 1; z < bd.maxZ; z++) {
        const k = `${x},${z}`;
        if (walls.has(k) || outside.has(k) || seenInside.has(k)) continue;
        const region: [number, number][] = [];
        const q: [number, number][] = [[x, z]];
        seenInside.add(k);
        while (q.length) {
          const [cx, cz] = q.shift()!;
          region.push([cx, cz]);
          for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx, nz = cz + dz;
            const nk = `${nx},${nz}`;
            if (walls.has(nk) || outside.has(nk) || seenInside.has(nk)) continue;
            seenInside.add(nk);
            q.push([nx, nz]);
          }
        }
        if (region.length >= 9 && region.length <= 400) {
          const sx = region.reduce((s, p) => s + p[0], 0) / region.length + 0.5;
          const sz = region.reduce((s, p) => s + p[1], 0) / region.length + 0.5;
          pens.push({
            id: `voxel-pen-${layerY}-${Math.round(sx)}_${Math.round(sz)}`,
            center: [sx, sz],
            y: layerY,
            area: region.length,
            capacityBonus: Math.min(6, Math.max(2, Math.floor(region.length / 8))),
          });
        }
      }
    }
  }
  return pens;
}

/**
 * Pure geometric regression check verifying no two generated GreedyQuads share the exact same
 * plane & overlapping 2D footprint (catches Z-fighting regressions in unit tests).
 */
export function hasCoplanarOverlap(quads: GreedyQuad[]): boolean {
  const byPlane = new Map<string, {u0: number; u1: number; v0: number; v1: number}[]>();
  for (const q of quads) {
    const uAxis = (q.axis + 1) % 3;
    const vAxis = (q.axis + 2) % 3;
    const plane = q.corners[0][q.axis];
    const us = q.corners.map(c => c[uAxis]);
    const vs = q.corners.map(c => c[vAxis]);
    const rect = {u0: Math.min(...us), u1: Math.max(...us), v0: Math.min(...vs), v1: Math.max(...vs)};
    const key = `${q.axis}:${plane.toFixed(3)}`;
    const list = byPlane.get(key) ?? [];
    for (const o of list) {
      if (rect.u0 < o.u1 - 1e-4 && rect.u1 > o.u0 + 1e-4 && rect.v0 < o.v1 - 1e-4 && rect.v1 > o.v0 + 1e-4) {
        return true;
      }
    }
    list.push(rect);
    byPlane.set(key, list);
  }
  return false;
}
