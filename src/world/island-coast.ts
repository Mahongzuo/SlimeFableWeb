import coastalFeet from '../home/coast-rock-supports.json';
import {MarineModels} from '../home/marine-models';
import * as THREE from 'three';
import type {ExpandedTile} from '../life/state';
import type {Box} from '../slime/types';
import type {FluidVolume, GroundSurface} from '../slime/world';
import {inland, WORLD} from './map';
import {preserveRects,preserveHeight,type PreserveRect,expansionGroundAt, expansionHeight, expansionSegments, slotForTile, type ExpansionSlot} from './expansion';
import {SEA_LEVEL} from '../home/layout';
import {riverCenter} from '../home/waterway';
import {climateMaterial} from '../home/climate-material';
import {getTerrainSplatTextures} from '../home/render/terrain-splat';
import {sampleInlandGrassColor} from './terrain-mesh';

export interface TerritoryRect {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  biome?: string;
  slot?: ExpansionSlot;
  theme?: ExpandedTile['theme'];
}

export interface IslandSDFData {
  texture: THREE.DataTexture;
  bounds: THREE.Vector4; // (minX, minZ, invSpanX, invSpanZ)
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  size: number;
  data: Float32Array;
}

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Build territory rectangles for base Home WORLD plus every unlocked infinite expansion tile. */
export function collectTerritoryRects(expansions: ExpandedTile[] = []): TerritoryRect[] {
  const rects: TerritoryRect[] = [
    {minX: WORLD.min[0], minZ: WORLD.min[1], maxX: WORLD.max[0], maxZ: WORLD.max[1]},
  ];
  for (const tile of expansions) {
    const slot = slotForTile(tile);
    if (!slot) continue;
    rects.push({
      minX: slot.min[0],
      minZ: slot.min[1],
      maxX: slot.max[0],
      maxZ: slot.max[1],
      slot,
      theme: tile.theme,
    });
  }
  return rects.concat(preserveRects(expansions));
}

/** Exact signed distance to the union of owned rectangular territory tiles (< 0 inside, > 0 outside). */
export function territoryBoxSDF(x: number, z: number, rects: TerritoryRect[]): number {
  let best = Infinity;
  for (const r of rects) {
    const cx = (r.minX + r.maxX) * 0.5;
    const cz = (r.minZ + r.maxZ) * 0.5;
    const hx = (r.maxX - r.minX) * 0.5;
    const hz = (r.maxZ - r.minZ) * 0.5;
    const dx = Math.abs(x - cx) - hx;
    const dz = Math.abs(z - cz) - hz;
    const out = Math.hypot(Math.max(dx, 0), Math.max(dz, 0));
    const inn = Math.min(Math.max(dx, dz), 0);
    const d = out + inn;
    if (d < best) best = d;
  }
  return best;
}

/** Organic coastal headland/cove extension (metres outside the owned territory rectangle). */
export function coastExtensionAt(x: number, z: number): number {
  // South harbor river mouth opens smoothly into the bay at x ≈ riverCenter(-31), z ≈ -31
  const mouthX = riverCenter(-31);
  const mouthDist = Math.hypot((x - mouthX) * 0.9, Math.max(0, z + 31) * 1.4 + Math.max(0, -31 - z) * 0.35);
  const mouthPinch = smoothstep(3.8, 13.5, mouthDist);
  const wave =
    10.5 +
    4.6 * Math.sin(x * 0.043 + z * 0.031 + 0.7) +
    2.9 * Math.cos(x * 0.097 - z * 0.078 + 1.4) +
    1.5 * Math.sin(x * 0.21 + z * 0.17);
  return Math.max(2.2, wave) * (0.12 + 0.88 * mouthPinch);
}

/**
 * Beach vs. layered limestone cliff weight (0 = rugged cliff like reference image 1, 1 = sandy cove).
 * South harbor bay & east cove lean sandy; west, southwest & north headlands showcase sculpted layered limestone cliffs.
 */
export function coastBeachWeight(x: number, z: number): number {
  const southBay = (1 - smoothstep(-28, 12, z)) * smoothstep(-45, 5, x);
  const eastCove = smoothstep(18, 34, x) * smoothstep(-10, 25, z) * (1 - smoothstep(55, 110, z));
  const noise = 0.5 + 0.5 * Math.sin(x * 0.068 - z * 0.055 + 1.1);
  return Math.max(0, Math.min(1, southBay * 0.85 + eastCove * 0.72 + (noise - 0.5) * 0.22));
}

/** Pure elevation function for the coastal shelf & seabed outside owned land (dBox > 0). */
export function coastalHeightAt(x: number, z: number, edgeY: number, dBox: number): number {
  const ext = coastExtensionAt(x, z);
  const beach = coastBeachWeight(x, z);
  const mouthX = riverCenter(-31);
  const inMouth = (1 - smoothstep(3.2, 8.5, Math.abs(x - mouthX))) * (1 - smoothstep(-30, -48, z)) * smoothstep(-27, -31.5, z);

  // River mouth smoothly continues the canal bed (-1.65 m) into the bay seabed
  if (inMouth > 0.01) {
    const channelBed = -1.65 - 0.14 * dBox;
    const normalH = coastalProfile(x, z, edgeY, dBox, ext, beach);
    return normalH + (channelBed - normalH) * inMouth;
  }
  return coastalProfile(x, z, edgeY, dBox, ext, beach);
}

/** Offshore depth in metres beyond the home shoreline. Each shelf joins with zero end slope. */
export function offshoreDepth(distance: number): number {
  if (distance < 100) return 14.5 + .5 * smoothstep(64,100,distance);
  if (distance < 1000) return 15 + 105 * smoothstep(100,1000,distance);
  if (distance < 3000) return 120 + 730 * smoothstep(1000,3000,distance);
  return 850 + 1150 * smoothstep(3000,5000,distance);
}

function coastalProfile(x: number, z: number, edgeY: number, dBox: number, ext: number, beach: number): number {
  const t = dBox / Math.max(ext, 1.0);
  // Smooth C1-continuous walkable coastal ramp everywhere into the sea (no harsh drop-off or sharp border crease!)
  // Slightly firmer coastal headlands where beach < 0.5, gentler wide sandy beaches where beach >= 0.5.
  const ease = smoothstep(0.0, 1.0, t);
  const headlandRamp =
    edgeY + (SEA_LEVEL - 0.62 - edgeY) * smoothstep(0.06, 0.96, t) +
    0.10 * Math.sin(t * Math.PI * 3.0 + Math.sin(x * 0.22 + z * 0.19)) * smoothstep(0.25, 0.55, t) * (1 - smoothstep(0.70, 0.98, t));
  const beachRamp = edgeY + (SEA_LEVEL - 0.56 - edgeY) * ease;

  let y = headlandRamp + (beachRamp - headlandRamp) * (0.35 + 0.65 * beach);

  // Beyond shoreline (t > 0.80): gentle shallow turquoise reef shelf (0..26m) then pelagic slope to -14.5m
  if (t > 0.78) {
    const seaDist = Math.max(0, dBox - ext * 0.85);
    const reefUndulation =
      0.42 * Math.sin(x * 0.085 + z * 0.065) * Math.cos(x * 0.048 - z * 0.105) +
      0.20 * Math.sin(x * 0.21 - z * 0.17);
    const shelf = SEA_LEVEL - 0.68 - 2.6 * smoothstep(0, 24, seaDist) + reefUndulation * (1 - smoothstep(18, 42, seaDist));
    const deep = SEA_LEVEL - offshoreDepth(dBox - ext);
    const targetSea = shelf + (deep - shelf) * smoothstep(20, 64, seaDist);
    const blend = smoothstep(0.78, 1.18, t);
    y = y + (targetSea - y) * blend;
  }
  return y;
}

/** Evaluates terrain elevation at any point inside owned territory (base WORLD or unlocked tile). */
function ownedHeightAt(x: number, z: number, rects: TerritoryRect[]): number {
  if (x >= WORLD.min[0] && x <= WORLD.max[0] && z >= WORLD.min[1] && z <= WORLD.max[1]) {
    return inland(x, z);
  }
  for (let i = 1; i < rects.length; i++) {
    const r = rects[i];
    if(r.biome && x>=r.minX && x<=r.maxX && z>=r.minZ && z<=r.maxZ)return preserveHeight(r as PreserveRect,x,z);
    if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ && r.slot && r.theme) {
      return expansionHeight(x, z, r.slot, r.theme);
    }
  }
  // Nearest boundary clamp
  let bestD = Infinity;
  let bestH = 0;
  for (const r of rects) {
    const cx = Math.max(r.minX, Math.min(r.maxX, x));
    const cz = Math.max(r.minZ, Math.min(r.maxZ, z));
    const d = Math.hypot(x - cx, z - cz);
    if (d < bestD) {
      bestD = d;
      bestH = r.biome ? preserveHeight(r as PreserveRect,cx,cz) : r.slot && r.theme ? expansionHeight(cx, cz, r.slot, r.theme) : inland(cx, cz);
    }
  }
  return bestH;
}

/** Continuous island + coastal slope + deep seabed height at any world (x, z). */
export function coastalSeabedHeightAt(x: number, z: number, expansions: ExpandedTile[] = []): number {
  const rects = collectTerritoryRects(expansions);
  return combinedHeightWithRects(x, z, rects);
}

export function combinedHeightWithRects(x: number, z: number, rects: TerritoryRect[]): number {
  const dBox = territoryBoxSDF(x, z, rects);
  if (dBox <= 0) return ownedHeightAt(x, z, rects);
  if (dBox > 100) return SEA_LEVEL - offshoreDepth(dBox-coastExtensionAt(x,z));
  const edgeY = ownedHeightAt(x, z, rects);
  return coastalHeightAt(x, z, edgeY, dBox);
}

/**
 * Builds 4 non-overlapping exterior GroundSurface strips strictly outside base WORLD so the slime
 * walks smoothly down every coastal slope into the sea and onto the deep seabed without ever falling through.
 * Append unlocked expansion surfaces AFTER these so expanded land tiles take exact priority.
 */
export function buildCoastalCollisionSurfaces(expansions: ExpandedTile[] = [], pad = 76): GroundSurface[] {
  const rects = collectTerritoryRects(expansions);
  let minX = WORLD.min[0], minZ = WORLD.min[1], maxX = WORLD.max[0], maxZ = WORLD.max[1];
  for (const r of rects) {
    if (r.minX < minX) minX = r.minX;
    if (r.minZ < minZ) minZ = r.minZ;
    if (r.maxX > maxX) maxX = r.maxX;
    if (r.maxZ > maxZ) maxZ = r.maxZ;
  }
  const oMinX = minX - pad, oMaxX = maxX + pad, oMinZ = minZ - pad, oMaxZ = maxZ + pad;
  const wMinX = WORLD.min[0], wMaxX = WORLD.max[0], wMinZ = WORLD.min[1], wMaxZ = WORLD.max[1];

  const makeStrip = (x0: number, z0: number, x1: number, z1: number, step = 2): GroundSurface => {
    const segX = Math.max(4, Math.round((x1 - x0) / step));
    const segZ = Math.max(4, Math.round((z1 - z0) / step));
    const w = segX + 1, h = segZ + 1;
    const values: number[] = new Array(w * h);
    for (let j = 0; j < h; j++) {
      const z = z0 + ((z1 - z0) * j) / segZ;
      for (let i = 0; i < w; i++) {
        const x = x0 + ((x1 - x0) * i) / segX;
        values[i + j * w] = combinedHeightWithRects(x, z, rects);
      }
    }
    return {min: [x0, z0], max: [x1, z1], height: 0, grid: {width: w, height: h, values}};
  };

  // Four strips tiling the entire exterior ring around WORLD with zero overlap onto WORLD:
  // South full-width, North full-width, West middle, East middle.
  return [
    makeStrip(oMinX, oMinZ, oMaxX, wMinZ, 2),
    makeStrip(oMinX, wMaxZ, oMaxX, oMaxZ, 2),
    makeStrip(oMinX, wMinZ, wMinX, wMaxZ, 2),
    makeStrip(wMaxX, wMinZ, oMaxX, wMaxZ, 2),
  ];
}

/**
 * Builds ocean FluidVolume slabs covering every exterior region outside owned territory so the slime
 * floats naturally once it walks into sea-level water (and never floods inland lake/dry tiles).
 */
export function buildOceanFluidVolumes(expansions: ExpandedTile[] = [], pad = 76): FluidVolume[] {
  const rects = collectTerritoryRects(expansions);
  let minX = WORLD.min[0], minZ = WORLD.min[1], maxX = WORLD.max[0], maxZ = WORLD.max[1];
  for (const r of rects) {
    if (r.minX < minX) minX = r.minX;
    if (r.minZ < minZ) minZ = r.minZ;
    if (r.maxX > maxX) maxX = r.maxX;
    if (r.maxZ > maxZ) maxZ = r.maxZ;
  }
  const oMinX = minX - pad, oMaxX = maxX + pad, oMinZ = minZ - pad, oMaxZ = maxZ + pad;

  // Exact rectangular decomposition outside all owned rects:
  // Outer 4 bounding slabs around the union AABB + coarse unoccupied pockets inside union AABB.
  const out: FluidVolume[] = [
    {min: [oMinX, oMinZ], max: [oMaxX, minZ], level: SEA_LEVEL, sink: 0.14},
    {min: [oMinX, maxZ], max: [oMaxX, oMaxZ], level: SEA_LEVEL, sink: 0.14},
    {min: [oMinX, minZ], max: [minX, maxZ], level: SEA_LEVEL, sink: 0.14},
    {min: [maxX, minZ], max: [oMaxX, maxZ], level: SEA_LEVEL, sink: 0.14},
  ];
  // If expansions make the union non-rectangular, add ocean fluids for non-owned 20m pockets inside AABB.
  if (rects.length > 1) {
    const step = 20;
    for (let z = minZ; z < maxZ; z += step) {
      const z1 = Math.min(maxZ, z + step);
      for (let x = minX; x < maxX; x += step) {
        const x1 = Math.min(maxX, x + step);
        const overlapsOwned = rects.some(r => x < r.maxX && x1 > r.minX && z < r.maxZ && z1 > r.minZ);
        if (!overlapsOwned) {
          out.push({min: [x, z], max: [x1, z1], level: SEA_LEVEL, sink: 0.14});
        }
      }
    }
  }
  return out;
}

/** Pure CPU SDF + seabed heightfield baker (testable in Node without WebGL). */
export function bakeIslandSDFData(expansions: ExpandedTile[] = [], size = 256): IslandSDFData {
  const rects = collectTerritoryRects(expansions);
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const r of rects) {
    if (r.minX < minX) minX = r.minX;
    if (r.minZ < minZ) minZ = r.minZ;
    if (r.maxX > maxX) maxX = r.maxX;
    if (r.maxZ > maxZ) maxZ = r.maxZ;
  }
  const pad = 92;
  minX -= pad;
  minZ -= pad;
  maxX += pad;
  maxZ += pad;
  const spanX = maxX - minX;
  const spanZ = maxZ - minZ;

  const data = new Float32Array(size * size * 4);
  const mouthX = riverCenter(-31);

  for (let j = 0; j < size; j++) {
    const z = minZ + (j / (size - 1)) * spanZ;
    for (let i = 0; i < size; i++) {
      const x = minX + (i / (size - 1)) * spanX;
      const dBox = territoryBoxSDF(x, z, rects);
      const ext = coastExtensionAt(x, z);
      const signedShore = dBox - ext;
      const beach = coastBeachWeight(x, z);

      let bedY: number;
      if (dBox <= 0) {
        bedY = ownedHeightAt(x, z, rects);
      } else {
        const edgeY = ownedHeightAt(x, z, rects);
        bedY = coastalHeightAt(x, z, edgeY, dBox);
      }

      // River mouth mask (1 inside south ocean mouth, 0 elsewhere; never encroaches z > -30.8)
      const mouthMask =
        z < -30.8
          ? (1 - smoothstep(3.5, 9.0, Math.abs(x - mouthX))) * (1 - smoothstep(-31, -55, z))
          : 0;

      const idx = (i + j * size) * 4;
      data[idx] = signedShore; // R: signed distance to organic shoreline (m)
      data[idx + 1] = bedY;    // G: terrain/seabed height (m)
      data[idx + 2] = dBox;    // B: exact box distance to owned land (m; < 0 inland!)
      data[idx + 3] = Math.max(beach * 0.5, mouthMask); // A: beach/mouth hint
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return {
    texture,
    bounds: new THREE.Vector4(minX, minZ, 1 / spanX, 1 / spanZ),
    minX,
    minZ,
    maxX,
    maxZ,
    size,
    data,
  };
}

/**
 * Renders the sculpted coastal limestone cliffs, sandy beaches, submerged turquoise seabed shelf,
 * and instanced underwater/coastal reef boulders around base WORLD + any unlocked infinite tiles.
 * Guarantees zero coplanar overlap with inland ground tiles.
 */
export class IslandCoastSystem {
  readonly root: THREE.Group;
  sdf: IslandSDFData;
  private coastMesh: THREE.Mesh | null = null;
  readonly marineModels = new MarineModels();
  private reefs = new THREE.Group();
  private pebbleMesh: THREE.InstancedMesh | null = null;
  private reedStalkMesh: THREE.InstancedMesh | null = null;
  private reedHeadMesh: THREE.InstancedMesh | null = null;
  private coastMat: THREE.MeshStandardMaterial;
  private pebbleMat: THREE.MeshStandardMaterial;
  private reedMat: THREE.MeshStandardMaterial;
  private reedHeadMat: THREE.MeshStandardMaterial;
  private listeners: ((sdf: IslandSDFData) => void)[] = [];

  constructor(private ctx: any, initialExpansions: ExpandedTile[] = []) {
    const T = ctx.THREE;
    this.root = new T.Group();
    this.root.name = 'island-coast-system';

    this.coastMat = ctx.mats.toon(0xffffff, {noCache: true, roughness: 0.90, metalness: 0.01});
    this.coastMat.vertexColors = true;
    climateMaterial(this.coastMat, 'terrain');
    this.patchCoastMaterial(this.coastMat, true);

    this.pebbleMat = ctx.mats.toon(0xffffff, {noCache: true, roughness: 0.80, metalness: 0.02});
    climateMaterial(this.pebbleMat, 'structure');
    this.reedMat = ctx.mats.toon(0x5da44c, {noCache: true, roughness: 0.78, metalness: 0.0});
    this.reedHeadMat = ctx.mats.toon(0x6e472c, {noCache: true, roughness: 0.85, metalness: 0.0});

    this.sdf = bakeIslandSDFData(initialExpansions, 256);
    this.rebuildGeometry(initialExpansions);
    ctx.scene.add(this.root);
  }

  onSDFChange(fn: (sdf: IslandSDFData) => void) {
    this.listeners.push(fn);
    fn(this.sdf);
  }

  syncExpansions(expansions: ExpandedTile[]) {
    this.sdf.texture.dispose();
    this.sdf = bakeIslandSDFData(expansions, 256);
    this.rebuildGeometry(expansions);
    for (const fn of this.listeners) fn(this.sdf);
  }

  /** Shares the exact same PBR meadow turf + beach sand splat textures as inland-ground for a 100% invisible border! */
  private patchCoastMaterial(mat: THREE.MeshStandardMaterial, useSandAttr: boolean) {
    const prev = mat.onBeforeCompile;
    const key = mat.customProgramCacheKey();
    const splat = getTerrainSplatTextures();
    const ctx = this.ctx;
    mat.onBeforeCompile = function (shader: any, renderer: any) {
      prev.call(this, shader, renderer);
      shader.uniforms.uCoastTime = ctx?.U?.uTime ?? {value: 0};
      if (splat) {
        shader.uniforms.uTurfMap = {value: splat.turfAlbedo};
        shader.uniforms.uTurfNorm = {value: splat.turfNormal};
        shader.uniforms.uSandMap = {value: splat.sandAlbedo};
        shader.uniforms.uSandNorm = {value: splat.sandNormal};
      }
      shader.vertexShader =
        (useSandAttr ? 'attribute float aCoastSand;\nvarying float vCoastSand;\n' : '') +
        'varying vec3 vCoastWorld; varying vec3 vCoastNormal;\n' +
        shader.vertexShader.replace(
          '#include <project_vertex>',
          `#include <project_vertex>
          vec4 cPos = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            cPos = instanceMatrix * cPos;
          #endif
          vCoastWorld = (modelMatrix * cPos).xyz;
          vCoastNormal = normalize(mat3(modelMatrix) * normal);
          ${useSandAttr ? 'vCoastSand = aCoastSand;' : ''}`,
        );
      shader.fragmentShader =
        (splat ? 'uniform sampler2D uTurfMap, uTurfNorm, uSandMap, uSandNorm;\n' : '') +
        (useSandAttr ? 'varying float vCoastSand;\n' : '') +
        'uniform float uCoastTime;\nvarying vec3 vCoastWorld; varying vec3 vCoastNormal;\n' +
        shader.fragmentShader
          .replace(
            '#include <color_fragment>',
            `#include <color_fragment>
            // Identical world-space turf & sand splat textures + canopy AO as inland-ground (zero seam at dBox = 0!)
            ${splat && useSandAttr ? `
            vec3 turfTex = texture2D(uTurfMap, vCoastWorld.xz * 0.28).rgb;
            vec3 sandTex = texture2D(uSandMap, vCoastWorld.xz * 0.25).rgb;
            // At dBox <= 0 (vCoastSand = 0), formula is BIT-FOR-BIT identical to inland-ground!
            float sandAmt = clamp(vCoastSand, 0.0, 1.0);
            float grassAmt = (1.0 - sandAmt) * smoothstep(-0.65, -0.20, vCoastWorld.y);
            vec3 meadowCol = diffuseColor.rgb * mix(vec3(1.0), turfTex * 1.05, 0.86) * mix(0.88, 1.0, sandAmt);
            diffuseColor.rgb = mix(diffuseColor.rgb, meadowCol, grassAmt);
            diffuseColor.rgb = mix(diffuseColor.rgb, sandTex, sandAmt * 0.84);
            ` : ''}
            // 3D world-space stratified coastal rock (Ultra-Water technique: zero vertical texture stretching!)
            float steep = 1.0 - smoothstep(0.45, 0.80, vCoastNormal.y);
            float strata = 0.5 + 0.5 * sin(vCoastWorld.y * 4.2 + sin(vCoastWorld.x * 0.35 + vCoastWorld.z * 0.30) * 1.4);
            float cracks = 0.5 + 0.5 * sin(vCoastWorld.x * 1.9 - vCoastWorld.z * 1.5 + vCoastWorld.y * 2.1 + strata * 2.0);
            vec3 rockLight = vec3(0.76, 0.76, 0.72);
            vec3 rockDark = vec3(0.38, 0.40, 0.39);
            vec3 cliffCol = mix(rockDark, rockLight, strata * 0.70 + cracks * 0.30);
            diffuseColor.rgb = mix(diffuseColor.rgb, cliffCol, steep * 0.82);
            // Wet tidal swash band ONLY near actual sea level (-0.38m..-0.08m), NEVER darkening dry border grass at y >= 0!
            float wetZone = 1.0 - smoothstep(-0.52, -0.08, vCoastWorld.y);
            diffuseColor.rgb *= mix(1.0, 0.72, wetZone * 0.70);
            float coastFresh = 0.0;
            ${splat && useSandAttr ? `
            // Swash: each wave runs up the sand and slides back on the ocean surf period, leaving a glossy film
            float swashPh = fract(uCoastTime * 0.16 + dot(vCoastWorld.xz, vec2(0.021, 0.013)));
            float runUp = -0.36 + 0.24 * sin(swashPh * 3.14159) * (0.5 + 0.5 * sandAmt);
            coastFresh = (1.0 - smoothstep(runUp - 0.03, runUp + 0.015, vCoastWorld.y)) * smoothstep(-0.62, -0.36, vCoastWorld.y) * sandAmt;
            diffuseColor.rgb *= 1.0 - 0.16 * coastFresh;
            diffuseColor.rgb += vec3(0.20, 0.22, 0.21) * exp(-pow((vCoastWorld.y - runUp) * 55.0, 2.0)) * sandAmt * step(0.12, swashPh) * (1.0 - swashPh);
            ` : ''}`,
          )
          .replace(
            '#include <normal_fragment_maps>',
            `#include <normal_fragment_maps>
            ${splat && useSandAttr ? `
            // Match inland-ground 3D turf normal at dBox=0 + Ultra-Water meandering beach sand ripples!
            vec3 ctN = texture2D(uTurfNorm, vCoastWorld.xz * 0.28).xyz * 2.0 - 1.0;
            vec3 csN = texture2D(uSandNorm, vCoastWorld.xz * 0.25).xyz * 2.0 - 1.0;
            float ripPh = (vCoastWorld.x * 3.8 + vCoastWorld.z * 2.1) + sin(vCoastWorld.x * 0.55 - vCoastWorld.z * 0.48) * 2.2;
            vec2 ripSlope = vec2(cos(ripPh), sin(ripPh) * 0.55) * 0.16 * clamp(vCoastSand, 0.0, 1.0) * smoothstep(-1.8, -0.2, vCoastWorld.y);
            vec2 cSlope = mix(ctN.xy * 0.22, csN.xy * 0.34 + ripSlope, clamp(vCoastSand, 0.0, 1.0));
            vec3 cwP = normalize(vec3(cSlope.x, 1.0, cSlope.y));
            vec3 cvP = normalize((viewMatrix * vec4(cwP, 0.0)).xyz);
            normal = normalize(mix(normal, cvP, 0.65 * smoothstep(0.45, 0.85, vCoastNormal.y)));
            ` : ''}`,
          )
          .replace(
            '#include <roughnessmap_fragment>',
            `#include <roughnessmap_fragment>
            float tidalWet = 1.0 - smoothstep(-0.50, -0.08, vCoastWorld.y);
            roughnessFactor = mix(roughnessFactor, 0.24, tidalWet * smoothstep(-1.1, -0.52, vCoastWorld.y));
            roughnessFactor = mix(roughnessFactor, 0.07, coastFresh);`,
          );
    };
    mat.customProgramCacheKey = () => key + (useSandAttr ? '-island-coast-splat-v5' : '-island-reef-v5');
    mat.needsUpdate = true;
  }

  private rebuildGeometry(expansions: ExpandedTile[]) {
    if (this.coastMesh) {
      this.coastMesh.removeFromParent();
      this.coastMesh.geometry.dispose();
      this.coastMesh = null;
    }
    this.releaseReefs();
    for (const m of [this.pebbleMesh, this.reedStalkMesh, this.reedHeadMesh]) {
      if (m) { m.removeFromParent(); m.geometry.dispose(); }
    }
    this.pebbleMesh = this.reedStalkMesh = this.reedHeadMesh = null;

    const rects = collectTerritoryRects(expansions);
    const {minX, minZ, maxX, maxZ} = this.sdf;

    // Build an exterior coastal + seabed mesh with exact boundary alignment, matched inland grass vertex color,
    // organic noise-perturbed grass-to-sand blend, and analytic smooth normals so ZERO straight border seam exists!
    const step = 2.0;
    // Put every owned boundary on an actual grid line. Individual quads can then be
    // discarded by their centre, including the internal seams of adjacent purchases.
    const axis=(lo:number,hi:number,dim:'X'|'Z')=>{
      const values=new Set<number>();
      for(let v=Math.floor(lo);v<=Math.ceil(hi)+step;v+=step)values.add(v);
      for(const r of rects){
        const start=r['min'+dim as 'minX'|'minZ'], end=r['max'+dim as 'maxX'|'maxZ'];
        const n=r.slot?expansionSegments(start,end,dim==='X'?0:1):Math.round(end-start);
        for(let i=0;i<=n;i++)values.add(start+(end-start)*i/n);
      }
      return [...values].sort((a,b)=>a-b);
    };
    const xs=axis(minX,maxX,'X'), zs=axis(minZ,maxZ,'Z');
    const cols=xs.length-1,rows=zs.length-1;
    const vertCount = (cols + 1) * (rows + 1);
    const verts = new Float32Array(vertCount * 3);
    const normals = new Float32Array(vertCount * 3);
    const colors = new Float32Array(vertCount * 3);
    const sandWeights = new Float32Array(vertCount);


    const cSand = new THREE.Color(0xe6d6ac);
    const cRock = new THREE.Color(0x9ca6a0);
    const cSeabed = new THREE.Color(0x98c9ba);
    const cDeepBed = new THREE.Color(0x16394c);
    const tmp = new THREE.Color();
    const tint = new THREE.Color();

    for (let j = 0; j <= rows; j++) {
      const z = zs[j];
      for (let i = 0; i <= cols; i++) {
        const x = xs[i];
        const idx = i + j * (cols + 1);
        const dBox = territoryBoxSDF(x, z, rects);
        if(dBox < -0.001)continue; // no exterior face uses a strictly interior vertex
        let y: number;
        if (dBox <= 0) {
          const r=rects.find(r=>r.slot && x>=r.minX && x<=r.maxX && z>=r.minZ && z<=r.maxZ);
          y=r?.slot&&r.theme?expansionGroundAt(x,z,r.slot,r.theme):ownedHeightAt(x,z,rects);
        } else {
          const edgeY = ownedHeightAt(x, z, rects);
          y = coastalHeightAt(x, z, edgeY, dBox);
        }
        verts[idx * 3] = x;
        verts[idx * 3 + 1] = y;
        verts[idx * 3 + 2] = z;

        // Analytic continuous normal from the un-tucked combined heightfield eliminates any lighting crease at dBox = 0!
        const eps = 0.65;
        const hx0 = combinedHeightWithRects(x - eps, z, rects);
        const hx1 = combinedHeightWithRects(x + eps, z, rects);
        const hz0 = combinedHeightWithRects(x, z - eps, rects);
        const hz1 = combinedHeightWithRects(x, z + eps, rects);
        const nx = hx0 - hx1;
        const ny = 2 * eps;
        const nz = hz0 - hz1;
        const invN = 1 / Math.hypot(nx, ny, nz);
        normals[idx * 3] = nx * invN;
        normals[idx * 3 + 1] = ny * invN;
        normals[idx * 3 + 2] = nz * invN;

        const ext = coastExtensionAt(x, z);
        const beach = coastBeachWeight(x, z);
        // Organic noise-perturbed grass-to-sand transition so shoreline tint never follows a straight box edge!
        const edgeJitter = 0.14 * Math.sin(x * 0.19 + z * 0.15) + 0.08 * Math.cos(x * 0.41 - z * 0.33);
        const t = Math.max(0, dBox) / Math.max(ext, 1);

        // Start from exact inland grass color at dBox <= 0, keeping pure meadow grass well past dBox=0 before blending into sand
        sampleInlandGrassColor(x, z, tmp, tint);
        let sandAttr = 0;
        if (y > SEA_LEVEL + 0.10) {
          const sandMix = Math.max(0, Math.min(1, smoothstep(0.32 + edgeJitter, 0.86 + edgeJitter, t) * (0.62 + 0.38 * beach)));
          sandAttr = sandMix;
          tmp.lerp(cSand, sandMix);
          tmp.lerp(cRock, (1 - beach) * smoothstep(0.50, 0.88, t) * 0.38);
        } else {
          sandAttr = 1.0;
          const depth = Math.max(0, SEA_LEVEL - y);
          tmp.copy(cSand).lerp(cSeabed, smoothstep(0.2, 2.4, depth)).lerp(cDeepBed, smoothstep(2.6, 12.0, depth));
        }
        sandWeights[idx] = sandAttr;
        colors[idx * 3] = tmp.r;
        colors[idx * 3 + 1] = tmp.g;
        colors[idx * 3 + 2] = tmp.b;
      }
    }

    const indices: number[] = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = i + j * (cols + 1);
        const b = a + 1;
        const c = a + (cols + 1);
        const d = c + 1;
        // Skip any quad fully inside owned land (zero overlap with inland-ground or expanded tiles!)
        const cx=(xs[i]+xs[i+1])*.5, cz=(zs[j]+zs[j+1])*.5;
        if(rects.some(r=>cx>r.minX&&cx<r.maxX&&cz>r.minZ&&cz<r.maxZ))continue;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aCoastSand', new THREE.BufferAttribute(sandWeights, 1));
    geo.setIndex(indices);

    this.coastMesh = new THREE.Mesh(geo, this.coastMat);
    this.coastMesh.name = 'island-coastal-shelf';
    this.coastMesh.receiveShadow = true;
    this.coastMesh.castShadow = true;
    this.coastMesh.layers.set(1);
    this.root.add(this.coastMesh);

    // Scatter sculpted submerged & wave-washed coastal reef boulders + Pine & Parcel-style beach pebbles & cattails!
    this.buildCoastalReefs(rects);
    this.buildShorelineDressing(rects);
  }

  /**
   * Pine & Parcel-style shoreline craft dressing:
   * - Clustered smooth flattened beach pebbles & river cobbles breaking up the grass-to-sand transition
   * - Slender lakeside/coastal cattails & reeds dotting the damp shoreline margin
   */
  private buildShorelineDressing(rects: TerritoryRect[]) {
    const {minX, minZ, maxX, maxZ} = this.sdf;
    const mouthX = riverCenter(-31);
    let seed = 31947;
    const rand = () => ((seed = (Math.imul(1664525, seed) + 1013904223) | 0) >>> 0) / 4294967296;

    const pebbles: [number, number, number, number, number, number, number, number][] = [];
    const reeds: [number, number, number, number, number][] = [];

    // Cluster pebbles naturally along the shoreline sand & grass-to-sand border (~620 cobbles & pebbles)
    let clusters = 0;
    for (let tries = 0; tries < 2800 && clusters < 150 && pebbles.length < 620; tries++) {
      const cx = minX + 24 + rand() * (maxX - minX - 48);
      const cz = minZ + 24 + rand() * (maxZ - minZ - 48);
      const dBox = territoryBoxSDF(cx, cz, rects);
      if (dBox < 0.2 || dBox > 18) continue;
      if (cz < -26 && cz > -58 && Math.abs(cx - mouthX) < 8.5) continue;
      const bedY = combinedHeightWithRects(cx, cz, rects);
      if (bedY < SEA_LEVEL - 0.15 || bedY > 1.35) continue;
      clusters++;

      const countInCluster = 3 + Math.floor(rand() * 5);
      for (let k = 0; k < countInCluster && pebbles.length < 620; k++) {
        const ang = rand() * Math.PI * 2;
        const dist = k === 0 ? 0 : 0.25 + rand() * 1.55;
        const px = cx + Math.cos(ang) * dist;
        const pz = cz + Math.sin(ang) * dist;
        const py = combinedHeightWithRects(px, pz, rects);
        if (py < SEA_LEVEL - 0.18 || py > 1.45) continue;
        const sx = k === 0 ? 0.34 + rand() * 0.44 : 0.13 + rand() * 0.26;
        const sy = sx * (0.34 + rand() * 0.22);
        const sz = sx * (0.72 + rand() * 0.48);
        pebbles.push([px, py + sy * 0.25, pz, sx, sy, sz, rand() * Math.PI * 2, rand()]);
      }

      // Add a small clump of cattail reeds beside ~45% of shoreline cobble clusters
      if (rand() < 0.45 && reeds.length < 240 && bedY > SEA_LEVEL - 0.08 && bedY < 0.65) {
        const rCount = 3 + Math.floor(rand() * 4);
        for (let r = 0; r < rCount && reeds.length < 240; r++) {
          const rx = cx + (rand() - 0.5) * 1.3;
          const rz = cz + (rand() - 0.5) * 1.3;
          const ry = combinedHeightWithRects(rx, rz, rects);
          if (ry < SEA_LEVEL - 0.10 || ry > 0.72) continue;
          reeds.push([rx, ry, rz, 0.75 + rand() * 0.55, rand() * Math.PI * 2]);
        }
      }
    }

    const dummy = new THREE.Object3D();
    const col = new THREE.Color();

    if (pebbles.length) {
      // Smooth river-worn flattened beach cobbles (Pine & Parcel look, zero faceted polygons!)
      const pebGeo = new THREE.SphereGeometry(1, 10, 7);
      const pos = pebGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
        const smoothN = 1 + 0.06 * Math.sin(vx * 2.4 + vz * 2.1);
        pos.setXYZ(i, vx * smoothN, vy * smoothN, vz * smoothN);
      }
      pebGeo.computeVertexNormals();

      const pm = new THREE.InstancedMesh(pebGeo, this.pebbleMat, pebbles.length);
      pm.name = 'shoreline-pebbles';
      pm.castShadow = true;
      pm.receiveShadow = true;
      pm.layers.set(1);
      const pebPalette = [0xcabca5, 0xd8ccb4, 0xb2b0a2, 0xc0b49e, 0x9fa399];
      pebbles.forEach(([x, y, z, sx, sy, sz, yaw, rnd], i) => {
        dummy.position.set(x, y, z);
        dummy.rotation.set((rnd - 0.5) * 0.2, yaw, (rnd - 0.5) * 0.2);
        dummy.scale.set(sx, sy, sz);
        dummy.updateMatrix();
        pm.setMatrixAt(i, dummy.matrix);
        col.setHex(pebPalette[i % pebPalette.length]).offsetHSL(0, 0, (rnd - 0.5) * 0.08);
        pm.setColorAt(i, col);
      });
      pm.instanceMatrix.needsUpdate = true;
      if (pm.instanceColor) pm.instanceColor.needsUpdate = true;
      this.pebbleMesh = pm;
      this.root.add(pm);
    }

    if (reeds.length) {
      const stalkGeo = new THREE.CylinderGeometry(0.015, 0.026, 0.95, 5);
      stalkGeo.translate(0, 0.475, 0);
      const headGeo = new THREE.CapsuleGeometry(0.036, 0.14, 4, 6);
      headGeo.translate(0, 0.84, 0);

      const sm = new THREE.InstancedMesh(stalkGeo, this.reedMat, reeds.length);
      const hm = new THREE.InstancedMesh(headGeo, this.reedHeadMat, reeds.length);
      sm.name = 'shoreline-reeds-stalk';
      hm.name = 'shoreline-reeds-cattail';
      sm.castShadow = hm.castShadow = true;
      sm.receiveShadow = hm.receiveShadow = true;
      sm.layers.set(1); hm.layers.set(1);
      reeds.forEach(([x, y, z, s, yaw], i) => {
        dummy.position.set(x, y - 0.04, z);
        dummy.rotation.set((rand() - 0.5) * 0.22, yaw, (rand() - 0.5) * 0.22);
        dummy.scale.set(s * 0.85, s, s * 0.85);
        dummy.updateMatrix();
        sm.setMatrixAt(i, dummy.matrix);
        hm.setMatrixAt(i, dummy.matrix);
      });
      sm.instanceMatrix.needsUpdate = true;
      hm.instanceMatrix.needsUpdate = true;
      this.reedStalkMesh = sm;
      this.reedHeadMesh = hm;
      this.root.add(sm, hm);
    }
  }

  private releaseReefs() {
    this.reefs.removeFromParent();
    for (const mesh of this.reefs.children as THREE.InstancedMesh[]) {
      mesh.geometry.dispose();
      mesh.dispose();
    }
    this.reefs.clear();
  }

  surfaceAt(x:number,z:number) {
    const position=this.coastMesh?.geometry.attributes.position;
    if(!position)return undefined;
    const minX=position.getX(0),minZ=position.getZ(0);
    const cols=Math.ceil((this.sdf.maxX-minX)/2),rows=Math.ceil((this.sdf.maxZ-minZ)/2);
    const u=(x-minX)/2,v=(z-minZ)/2,col=Math.floor(u),row=Math.floor(v);
    if(col<0 || row<0 || col>=cols || row>=rows)return undefined;
    const j=row*(cols+1)+col,tx=u-col,tz=v-row;
    const b=position.getY(j+1),c=position.getY(j+cols+1);
    return tx+tz<=1?position.getY(j)*(1-tx-tz)+b*tx+c*tz:position.getY(j+cols+2)*(tx+tz-1)+b*(1-tz)+c*(1-tx);
  }

  private buildCoastalReefs(rects: TerritoryRect[]) {
    const {minX, minZ, maxX, maxZ} = this.sdf;
    const poses = computeCoastalReefPosesForRects(rects, minX, minZ, maxX, maxZ);
    const group = this.reefs = new THREE.Group();
    group.name = 'island-coastal-reefs';
    this.root.add(group);
    void this.marineModels.load('rocks').then(asset => {
      if (!group.parent) return;
      asset.scene.updateMatrixWorld(true);
      const variants: THREE.Mesh[] = [];
      asset.scene.traverse(node => { if (node instanceof THREE.Mesh) variants.push(node); });
      const dummy = new THREE.Object3D();
      variants.forEach((rock, variant) => {
        const sites = poses.filter((_,i) => i % variants.length === variant);
        if (!sites.length) return;
        const geo = rock.geometry.clone().applyMatrix4(rock.matrixWorld);
        geo.computeBoundingBox();
        const box = geo.boundingBox!, mid = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
        geo.translate(-mid.x, -mid.y, -mid.z).scale(2/size.x, 2/size.y, 2/size.z);
        const batch = new THREE.InstancedMesh(geo, rock.material, sites.length);
        batch.name = 'shore-reef-' + variant;
        batch.layers.set(1);
        batch.castShadow = batch.receiveShadow = true;
        sites.forEach((r, j) => {
          dummy.position.set(r.x,r.y,r.z);
          dummy.rotation.y = r.yaw;
          dummy.scale.set(r.sx,r.sy*.60,r.sz);
          dummy.updateMatrix();
          batch.setMatrixAt(j,dummy.matrix);
        });
        batch.computeBoundingSphere();
        group.add(batch);
      });
    }).catch(e => console.warn('Coastal rocks:',e));
  }

  dispose() {
    this.sdf.texture.dispose();
    this.coastMesh?.geometry.dispose();
    this.releaseReefs();
    this.marineModels.dispose();
    this.pebbleMesh?.geometry.dispose();
    this.reedStalkMesh?.geometry.dispose();
    this.reedHeadMesh?.geometry.dispose();
    this.coastMat.dispose();
    this.pebbleMat.dispose();
    this.reedMat.dispose();
    this.reedHeadMat.dispose();
    this.root.removeFromParent();
  }
}

export interface CoastalReefPose {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  yaw: number;
  shade: number;
}

function computeCoastalReefPosesForRects(
  rects: TerritoryRect[],
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
): CoastalReefPose[] {
  const poses: CoastalReefPose[] = [];
  const cache=new Map<number,Map<number,number>>();
  const corner=(x:number,z:number)=>{
    let row=cache.get(z);if(!row){row=new Map();cache.set(z,row);}
    let h=row.get(x);if(h===undefined){h=combinedHeightWithRects(x,z,rects);row.set(x,h);}
    return h;
  };
  let seed = 88421;
  const rand = () => ((seed = (Math.imul(1664525, seed) + 1013904223) | 0) >>> 0) / 4294967296;
  const mouthX = riverCenter(-31);

  for (let tries = 0; tries < 2400 && poses.length < 180; tries++) {
    const x = minX + 18 + rand() * (maxX - minX - 36);
    const z = minZ + 18 + rand() * (maxZ - minZ - 36);
    const dBox = territoryBoxSDF(x, z, rects);
    if (dBox < 3.5) continue;
    // Keep south harbor boat channel clear
    if (z < -26 && z > -65 && Math.abs(x - mouthX) < 9.5) continue;
    const ext = coastExtensionAt(x, z);
    const shoreDist = dBox - ext;
    if (shoreDist < -2.5 || shoreDist > 26.0) continue;

    const edgeY = ownedHeightAt(x, z, rects);
    const bedY = coastalHeightAt(x, z, edgeY, dBox);
    if (bedY < -4.2 || bedY > 1.2) continue;

    const sx = 1.1 + rand() * 3.4;
    const sy = sx * (0.42 + rand() * 0.45);
    const sz = sx * (0.65 + rand() * 0.65);
    // Submerged shallow reef boulders sit slightly proud of seabed so turquoise water shows them clearly
    const yaw=rand()*Math.PI*2;
    let y=bedY+sy*.18;
    for(const [u,h,v] of coastalFeet[poses.length%coastalFeet.length]){
      const px=x+sx*u*Math.cos(yaw)+sz*v*Math.sin(yaw),pz=z+sz*v*Math.cos(yaw)-sx*u*Math.sin(yaw);
      const ix=2*Math.floor((px-1)/2)+1,iz=2*Math.floor((pz-1)/2)+1,tx=(px-ix)/2,tz=(pz-iz)/2;
      const b=corner(ix+2,iz),c=corner(ix,iz+2);
      const floor=tx+tz<=1?corner(ix,iz)*(1-tx-tz)+b*tx+c*tz:
        corner(ix+2,iz+2)*(tx+tz-1)+b*(1-tz)+c*(1-tx);
      y=Math.min(y,floor-sy*.60*h-.018);
    }
    poses.push({x, y, z, sx, sy, sz, yaw, shade: 0.72 + rand() * 0.32});
  }
  return poses;
}

/** Deterministic coastal & shallow-reef boulder poses shared verbatim by rendering and slime physics collision. */
export function computeCoastalReefPoses(expansions: ExpandedTile[] = []): CoastalReefPose[] {
  const rects = collectTerritoryRects(expansions);
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const r of rects) {
    if (r.minX < minX) minX = r.minX;
    if (r.minZ < minZ) minZ = r.minZ;
    if (r.maxX > maxX) maxX = r.maxX;
    if (r.maxZ > maxZ) maxZ = r.maxZ;
  }
  const pad = 92;
  return computeCoastalReefPosesForRects(rects, minX - pad, minZ - pad, maxX + pad, maxZ + pad);
}

/**
 * Generates oriented solid collision boxes for coastal & shallow reef boulders so the slime
 * bumps cleanly into shore rocks and can hop onto their flat stratified tops without clipping.
 */
export function buildCoastalReefBoxes(expansions: ExpandedTile[] = []): Box[] {
  const poses = computeCoastalReefPoses(expansions);
  const boxes: Box[] = [];
  for (let i = 0; i < poses.length; i++) {
    const r = poses[i];
    // The seven imported rocks share this normalized footprint and a 0.60 vertical half-extent.
    const hx = r.sx * 0.78;
    const hy = r.sy * 0.54;
    const hz = r.sz * 0.78;
    boxes.push({
      name: `coastal-reef-${i}`,
      min: [r.x - hx, r.y - hy, r.z - hz],
      max: [r.x + hx, r.y + hy, r.z + hz],
      yaw: r.yaw,
      camera: false,
      climbable: false,
    });
  }
  return boxes;
}
