import * as THREE from 'three';
import type {ZoneContext} from '../../zones/types';
import {climateMaterial} from '../climate-material';
import {sampleInlandGrassColor, sampleTerrainRoadWeight} from '../../world/terrain-mesh';
import {MeadowSurface, triangleGround, FIELD_GLSL, meadowViewDistance, CANDIDATES_PER_METRE, CELL_METRES, type MeadowArea} from './meadow-field';
import {EXPANSION_THEMES, expansionGroundAt, expansionSurfaceWeights, slotForTile} from '../../world/expansion';
import {rng} from '../../templates/random';
import {LAKE, lakeEdge, pathDistance} from '../../world/map';
import type {ExpandedTile} from '../../life/state';
import {surfaceClimate} from '../climate-material';
import {MEADOW_WIND_GLSL} from './meadow-motion';
import {bloomSuitability, habitats, preserveCover, type FieldFlower} from './preserve-habitat';
import {approachWear} from '../preserve-trails';
import {preserveHeight, type PreserveRect} from '../../world/expansion';

/** Maximum simultaneous oriented grass/flower exclusion rectangles synced to the GPU. */
export const MAX_GRASS_EXCLUSIONS = 48;

export interface GrassExcludeBox {
  x: number;
  z: number;
  hx: number;
  hz: number;
  yaw?: number;
}

const exclRects: THREE.Vector4[] = Array.from({length: MAX_GRASS_EXCLUSIONS}, () => new THREE.Vector4(0, 0, 0, 0));
const exclRots: THREE.Vector2[] = Array.from({length: MAX_GRASS_EXCLUSIONS}, () => new THREE.Vector2(1, 0));
const exclCount = {value: 0};
let activeExclusions: GrassExcludeBox[] = [];

/** Shared GPU uniforms consumed by every meadow grass & wildflower shader across all home zones. */
export const grassExclusionUniforms = {
  uGrassExclRect: {value: exclRects},
  uGrassExclRot: {value: exclRots},
  uGrassExclCount: exclCount,
};

/**
 * Updates the real-time GPU exclusion mask for grass and wildflowers (farm beds, buildings, planters).
 * Changes take effect on the very next rendered frame without rebuilding any geometry.
 */
export function updateGrassExclusions(boxes: GrassExcludeBox[]): void {
  const n = Math.min(boxes.length, MAX_GRASS_EXCLUSIONS);
  activeExclusions = boxes.slice(0, n).map(b => ({
    x: b.x,
    z: b.z,
    hx: Math.max(0.05, b.hx),
    hz: Math.max(0.05, b.hz),
    yaw: b.yaw ?? 0,
  }));
  for (let i = 0; i < n; i++) {
    const b = activeExclusions[i];
    exclRects[i].set(b.x, b.z, b.hx, b.hz);
    const y = b.yaw ?? 0;
    exclRots[i].set(Math.cos(y), Math.sin(y));
  }
  for (let i = n; i < MAX_GRASS_EXCLUSIONS; i++) {
    exclRects[i].set(0, 0, 0, 0);
    exclRots[i].set(1, 0);
  }
  exclCount.value = n;
}

/** Returns a shallow copy of the active exclusion rectangles (for debugging & tests). */
export function getActiveGrassExclusions(): readonly GrassExcludeBox[] {
  return activeExclusions;
}

/** CPU mirror of the GPU OBB exclusion test (Three.js Y-rotation inverse transform). */
export function isPointGrassExcluded(x: number, z: number, boxes: readonly GrassExcludeBox[] = activeExclusions): boolean {
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    const dx = x - b.x;
    const dz = z - b.z;
    const yaw = b.yaw ?? 0;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const lx = dx * c - dz * s;
    const lz = dx * s + dz * c;
    if (Math.abs(lx) <= b.hx && Math.abs(lz) <= b.hz) return true;
  }
  return false;
}

type FlowerSpecies = FieldFlower;

interface FlowerGeoBuilder {
  pos: number[];
  norm: number[];
  col: number[];
  uv: number[];
}

function pushTri(
  b: FlowerGeoBuilder,
  a: [number, number, number],
  bPt: [number, number, number],
  c: [number, number, number],
  col: [number, number, number],
  tipH: number,
) {
  const ux = bPt[0] - a[0], uy = bPt[1] - a[1], uz = bPt[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz);
  if (len > 1e-5) { nx /= len; ny /= len; nz /= len; } else { nx = 0; ny = 1; nz = 0; }
  // Bias normal gently skyward so small blossoms catch soft sunlight cleanly from all angles
  ny = Math.max(0.35, ny * 0.72 + 0.45);
  const inv = 1 / Math.hypot(nx, ny, nz);
  nx *= inv; ny *= inv; nz *= inv;
  for (const p of [a, bPt, c]) {
    b.pos.push(p[0], p[1], p[2]);
    b.norm.push(nx, ny, nz);
    b.col.push(col[0], col[1], col[2]);
    b.uv.push(0.5, Math.min(1, Math.max(0, p[1] / Math.max(tipH, 0.05))));
  }
}

function addStemAndLeaves(b: FlowerGeoBuilder, height: number, lean: number) {
  const stemCol: [number, number, number] = [0.24, 0.48, 0.18];
  const leafCol: [number, number, number] = [0.30, 0.56, 0.22];
  const segs = 3;
  const hw = 0.0085;
  for (let s = 0; s < segs; s++) {
    const t0 = s / segs, t1 = (s + 1) / segs;
    const y0 = t0 * height, y1 = t1 * height;
    const x0 = lean * t0 * t0, x1 = lean * t1 * t1;
    // Crossed ribbon stem so it reads cleanly from every azimuth
    for (const [dx, dz] of [[hw, 0], [0, hw]] as const) {
      pushTri(b, [x0 - dx, y0, -dz], [x0 + dx, y0, dz], [x1 + dx * 0.75, y1, dz * 0.75], stemCol, height);
      pushTri(b, [x0 - dx, y0, -dz], [x1 + dx * 0.75, y1, dz * 0.75], [x1 - dx * 0.75, y1, -dz * 0.75], stemCol, height);
    }
  }
  // Twin basal meadow leaves arching outward
  for (let side = -1; side <= 1; side += 2) {
    const yBase = height * 0.22;
    const xBase = lean * 0.05;
    const lLen = 0.095;
    const lW = 0.024;
    const mid: [number, number, number] = [xBase + side * lLen * 0.55, yBase + 0.036, side * 0.022];
    const tip: [number, number, number] = [xBase + side * lLen, yBase + 0.024, side * 0.038];
    const r0: [number, number, number] = [xBase, yBase, -lW * 0.4];
    const r1: [number, number, number] = [xBase, yBase, lW * 0.4];
    const m0: [number, number, number] = [mid[0], mid[1], mid[2] - lW];
    const m1: [number, number, number] = [mid[0], mid[1], mid[2] + lW];
    pushTri(b, r0, r1, m1, leafCol, height);
    pushTri(b, r0, m1, m0, leafCol, height);
    pushTri(b, m0, m1, tip, leafCol, height);
  }
}

function finalizeFlowerGeo(b: FlowerGeoBuilder): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.norm, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
  return geo;
}

function buildDaisyGeometry(): THREE.BufferGeometry {
  const b: FlowerGeoBuilder = {pos: [], norm: [], col: [], uv: []};
  const h = 0.30, lean = 0.04;
  addStemAndLeaves(b, h, lean);
  const cx = lean, cy = h, cz = 0;
  const petalCol: [number, number, number] = [0.98, 0.97, 0.93];
  const centerCol: [number, number, number] = [0.98, 0.78, 0.16];
  const petals = 11;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const dx = Math.cos(a), dz = Math.sin(a);
    const px = -dz, pz = dx;
    const r0 = 0.024, r1 = 0.088, w = 0.017;
    const lift = 0.016 + (i % 2) * 0.006;
    const pA: [number, number, number] = [cx + dx * r0 - px * w * 0.6, cy, cz + dz * r0 - pz * w * 0.6];
    const pB: [number, number, number] = [cx + dx * r0 + px * w * 0.6, cy, cz + dz * r0 + pz * w * 0.6];
    const pC: [number, number, number] = [cx + dx * (r1 * 0.72) + px * w, cy + lift * 0.7, cz + dz * (r1 * 0.72) + pz * w];
    const pD: [number, number, number] = [cx + dx * (r1 * 0.72) - px * w, cy + lift * 0.7, cz + dz * (r1 * 0.72) - pz * w];
    const pTip: [number, number, number] = [cx + dx * r1, cy + lift, cz + dz * r1];
    pushTri(b, pA, pB, pC, petalCol, h + 0.04);
    pushTri(b, pA, pC, pD, petalCol, h + 0.04);
    pushTri(b, pD, pC, pTip, petalCol, h + 0.04);
  }
  // Golden domed heart
  const domeR = 0.030, domeH = 0.022;
  const apex: [number, number, number] = [cx, cy + domeH, cz];
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2, a1 = ((i + 1) / 8) * Math.PI * 2;
    pushTri(b,
      [cx + Math.cos(a0) * domeR, cy + 0.004, cz + Math.sin(a0) * domeR],
      [cx + Math.cos(a1) * domeR, cy + 0.004, cz + Math.sin(a1) * domeR],
      apex, centerCol, h + 0.04);
  }
  return finalizeFlowerGeo(b);
}

function buildPoppyGeometry(): THREE.BufferGeometry {
  const b: FlowerGeoBuilder = {pos: [], norm: [], col: [], uv: []};
  const h = 0.36, lean = 0.055;
  addStemAndLeaves(b, h, lean);
  const cx = lean, cy = h, cz = 0;
  const outerCol: [number, number, number] = [0.92, 0.24, 0.16];
  const innerCol: [number, number, number] = [0.98, 0.38, 0.22];
  const heartCol: [number, number, number] = [0.14, 0.10, 0.12];
  // 2-layer cupped silken petals
  for (const layer of [0, 1]) {
    const count = 4;
    const r = layer === 0 ? 0.095 : 0.072;
    const lift = layer === 0 ? 0.046 : 0.056;
    const col = layer === 0 ? outerCol : innerCol;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + layer * (Math.PI / 4);
      const aL = a - 0.54, aR = a + 0.54;
      const root: [number, number, number] = [cx, cy, cz];
      const pL: [number, number, number] = [cx + Math.cos(aL) * r, cy + lift, cz + Math.sin(aL) * r];
      const pM: [number, number, number] = [cx + Math.cos(a) * (r * 1.12), cy + lift * 1.12, cz + Math.sin(a) * (r * 1.12)];
      const pR: [number, number, number] = [cx + Math.cos(aR) * r, cy + lift, cz + Math.sin(aR) * r];
      pushTri(b, root, pL, pM, col, h + 0.07);
      pushTri(b, root, pM, pR, col, h + 0.07);
    }
  }
  const apex: [number, number, number] = [cx, cy + 0.028, cz];
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2, a1 = ((i + 1) / 6) * Math.PI * 2;
    pushTri(b,
      [cx + Math.cos(a0) * 0.026, cy + 0.008, cz + Math.sin(a0) * 0.026],
      [cx + Math.cos(a1) * 0.026, cy + 0.008, cz + Math.sin(a1) * 0.026],
      apex, heartCol, h + 0.07);
  }
  return finalizeFlowerGeo(b);
}

function buildLupinGeometry(): THREE.BufferGeometry {
  const b: FlowerGeoBuilder = {pos: [], norm: [], col: [], uv: []};
  const h = 0.44, lean = 0.032;
  addStemAndLeaves(b, h, lean);
  // Spiral tiered lavender-violet blossom spire (5 whorls tapering to sunlit lilac tip)
  const whorls = 6;
  for (let w = 0; w < whorls; w++) {
    const t = w / (whorls - 1);
    const y = h * (0.48 + 0.52 * t);
    const x = lean * (0.48 + 0.52 * t) * (0.48 + 0.52 * t);
    const rad = 0.056 * (1 - 0.58 * t);
    const florets = w < 4 ? 5 : 4;
    const col: [number, number, number] = [
      0.56 + 0.30 * t,
      0.34 + 0.36 * t,
      0.86 + 0.12 * t,
    ];
    for (let f = 0; f < florets; f++) {
      const a = (f / florets) * Math.PI * 2 + w * 0.72;
      const dx = Math.cos(a), dz = Math.sin(a);
      const px = -dz, pz = dx;
      const base: [number, number, number] = [x + dx * 0.012, y, dz * 0.012];
      const sideA: [number, number, number] = [x + dx * rad * 0.65 - px * rad * 0.42, y + 0.022, dz * rad * 0.65 - pz * rad * 0.42];
      const sideB: [number, number, number] = [x + dx * rad * 0.65 + px * rad * 0.42, y + 0.022, dz * rad * 0.65 + pz * rad * 0.42];
      const tip: [number, number, number] = [x + dx * rad * 1.12, y + 0.036, dz * rad * 1.12];
      pushTri(b, base, sideA, tip, col, h + 0.05);
      pushTri(b, base, tip, sideB, col, h + 0.05);
    }
  }
  return finalizeFlowerGeo(b);
}

function buildButtercupGeometry(): THREE.BufferGeometry {
  const b: FlowerGeoBuilder = {pos: [], norm: [], col: [], uv: []};
  const h = 0.27, lean = 0.035;
  addStemAndLeaves(b, h, lean);
  const cx = lean, cy = h, cz = 0;
  const petalCol: [number, number, number] = [1.0, 0.86, 0.18];
  const centerCol: [number, number, number] = [0.92, 0.56, 0.08];
  const petals = 5;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const aL = a - 0.44, aR = a + 0.44;
    const r = 0.068;
    const root: [number, number, number] = [cx, cy, cz];
    const pL: [number, number, number] = [cx + Math.cos(aL) * r, cy + 0.032, cz + Math.sin(aL) * r];
    const pM: [number, number, number] = [cx + Math.cos(a) * (r * 1.15), cy + 0.038, cz + Math.sin(a) * (r * 1.15)];
    const pR: [number, number, number] = [cx + Math.cos(aR) * r, cy + 0.032, cz + Math.sin(aR) * r];
    pushTri(b, root, pL, pM, petalCol, h + 0.05);
    pushTri(b, root, pM, pR, petalCol, h + 0.05);
  }
  const apex: [number, number, number] = [cx, cy + 0.020, cz];
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2, a1 = ((i + 1) / 6) * Math.PI * 2;
    pushTri(b,
      [cx + Math.cos(a0) * 0.020, cy + 0.005, cz + Math.sin(a0) * 0.020],
      [cx + Math.cos(a1) * 0.020, cy + 0.005, cz + Math.sin(a1) * 0.020],
      apex, centerCol, h + 0.05);
  }
  return finalizeFlowerGeo(b);
}

function preserveFlower(kind:'oat'|'iris'|'gentian'){
  const b:FlowerGeoBuilder={pos:[],norm:[],uv:[],col:[]};
  const h=kind==='oat'?.66:kind==='iris'?.49:.24, lean=.047;
  addStemAndLeaves(b,h,lean);
  if(kind==='oat'){
    for(let i=0;i<10;i++){
      const a=i*2.4,y=h*(.52+.044*i),r=.11-i*.006,dx=Math.cos(a),dz=Math.sin(a);
      const x=lean*(y/h)**2;
      pushTri(b,[x-.004,y,0],[x+.004,y,0],[x+r*dx,y+.049,r*dz],[.59,.65,.25],h);
      pushTri(b,[x+r*dx-.016,y+.05,r*dz],[x+r*dx+.016,y+.05,r*dz],
        [x+1.4*r*dx,y-.025,r*dz*1.4],[.91,.72,.30],h);
    }
  }else{
    const iris=kind==='iris', petals=iris?6:5;
    for(let i=0;i<petals;i++){
      const a=i*2*Math.PI/petals,dx=Math.cos(a),dz=Math.sin(a),fall=iris&&i%2===0;
      const w=iris?.038:.027,r=fall?.106:iris?.054:.052;
      const mid=h+(fall?.005:.036),tip=h+(fall?-.048:iris?.099:.066);
      const left:[number,number,number]=[lean+dx*r*.65-dz*w,mid,dz*r*.65+dx*w];
      const right:[number,number,number]=[lean+dx*r*.65+dz*w,mid,dz*r*.65-dx*w];
      pushTri(b,[lean,h-.022,0],left,right,iris?[.74,.59,.94]:[.29,.48,.95],tip);
      pushTri(b,left,right,[lean+r*dx,tip,r*dz],iris?[.43,.29,.78]:[.16,.27,.83],h+.1);
      if(fall)pushTri(b,[lean,h+.001,0],[left[0]*.4+lean*.6,mid+.003,left[2]*.4],[lean+dx*r*.79,mid+.003,dz*r*.79],[1,.78,.24],h);
    }
  }
  return finalizeFlowerGeo(b);
}
let sharedFlowerGeos: Record<FlowerSpecies, THREE.BufferGeometry> | null = null;
function getFlowerGeometries(): Record<FlowerSpecies, THREE.BufferGeometry> {
  if (!sharedFlowerGeos) {
    sharedFlowerGeos = {
      daisy: buildDaisyGeometry(),
      poppy: buildPoppyGeometry(),
      lupin: buildLupinGeometry(),
      buttercup: buildButtercupGeometry(),
      oat:preserveFlower('oat'),iris:preserveFlower('iris'),gentian:preserveFlower('gentian'),
    };
  }
  return sharedFlowerGeos;
}

/** Shared wildflower material with wind sway, slime trampling, distance fade, and real-time GPU exclusion mask. */
function createWildflowerMaterial(z: ZoneContext, surface: MeadowSurface): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.70,
    metalness: 0.0,
    side: THREE.DoubleSide,
    envMapIntensity: 0.95,
  });
  const U = z.ctx.U;
  mat.onBeforeCompile = (shader: any) => {
    shader.uniforms.uMeadowPhase = U.uMeadowPhase ?? {value: 0};
    shader.uniforms.uMeadowWind = U.uMeadowWind ?? {value: .29};
    shader.uniforms.uSlimePos = U.uSlimePos ?? {value: new THREE.Vector4(0,0,0,0)};
    shader.uniforms.uSunDir = U.uSunDir ?? {value: new THREE.Vector3(0.4, 0.7, 0.5)};
    shader.uniforms.uSunColor = U.uSunColor ?? {value: new THREE.Color(0xfff1d5)};
    shader.uniforms.uMeadowField = {value:surface.texture};
    shader.uniforms.uFieldRect = {value:new THREE.Vector4(...surface.area.min,...surface.area.max)};
    shader.vertexShader =
      `${MEADOW_WIND_GLSL}
       uniform vec4 uSlimePos;
       ${FIELD_GLSL}
       varying float vFlowerTip;
       varying vec3 vFlowerWorld;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vFlowerTip = uv.y;
        #ifdef USE_INSTANCING
          vec3 fInst = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #else
          vec3 fInst = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #endif
        float exclKeep = smoothstep(.22,.75,meadowSample(fInst.xz).w);
        float camDist = length(fInst.xz - cameraPosition.xz);
        float fade = (1.0 - smoothstep(46.0, 82.0, camDist)) * exclKeep;
        if (fade <= 0.002) {
          transformed = vec3(0.0, -40.0, 0.0);
        } else {
          transformed *= fade;
          float bend = vFlowerTip * vFlowerTip;
          // Limit wind travel relative to this stem's height, including its instance scale.
          float sw = meadowWave(fInst.xz) * (.17 * uMeadowWind) * max(0.,transformed.y) * bend;
          vec2 offset = vec2(.84,.54) * sw;
          vec2 toF = fInst.xz - uSlimePos.xz;
          float dS = length(toF);
          float pR = uSlimePos.w + 0.55;
          if (uSlimePos.w > 0.0 && dS < pR && abs(fInst.y - uSlimePos.y) < 1.35) {
            float push = 1.0 - dS / pR;
            offset *= 1. - smoothstep(.15,.80,push);
            offset += (toF / max(dS, 0.01)) * push * push * 0.40 * vFlowerTip;
            transformed.y *= 1.0 - push * 0.42 * vFlowerTip;
          }
          #ifdef USE_INSTANCING
          transformed.xz += vec2(dot(offset,normalize(instanceMatrix[0].xz)),dot(offset,normalize(instanceMatrix[2].xz)));
          #endif
        }
        #ifdef USE_INSTANCING
          vFlowerWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vFlowerWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif`,
      );

    shader.fragmentShader =
      `uniform vec3 uSunDir, uSunColor;
       varying float vFlowerTip;
       varying vec3 vFlowerWorld;\n` +
      shader.fragmentShader.replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        // Soft sunlit petal translucency so blossoms stay cheerful & luminous
        vec3 fV = normalize(cameraPosition - vFlowerWorld);
        vec3 fL = normalize(uSunDir);
        float sunVis = smoothstep(-0.04, 0.12, fL.y);
        float back = pow(max(dot(fV, -fL), 0.0), 2.5);
        reflectedLight.directDiffuse += diffuseColor.rgb * (0.14 + 0.48 * back) * smoothstep(0.45, 0.95, vFlowerTip) * uSunColor * sunVis;`,
      );
  };
  mat.customProgramCacheKey = () => 'meadow-wildflower-3d-v2';
  climateMaterial(mat, 'terrain');
  return mat;
}


// Meadow's near field carries three fine curved leaves per root. The six distance bands share
// a ranked candidate texture; every 8 m cell is rotated/reflected independently.
const DENSITY_NEAR = 5.4;
const DENSITY_FAR = 96;
const BAND_END = [7,14,24,40,64,104];
const BAND_DENSITY = [176,65,32,15,8,4];
const BAND_SEGMENTS = [5,3,2,2,1,1];
export function grassDensityAt(distance:number) {
  return Math.min(1,Math.pow(DENSITY_NEAR/Math.max(DENSITY_NEAR,Math.min(DENSITY_FAR,distance)),1.3));
}

let pattern:THREE.DataTexture;
function grassPattern(){
  if(pattern)return pattern;
  const random=rng('meadow-4711').next, n=CANDIDATES_PER_METRE*CELL_METRES**2;
  const data=new Float32Array(n*4);
  const hearts=Array.from({length:46},()=>[random()*8,random()*8]);
  for(let i=0;i<n;i++){
    let x=random()*8,z=random()*8;
    const tall=random()<.27;
    if(tall){
      let best=Infinity,dx=0,dz=0;
      for(const heart of hearts){
        const ax=heart[0]-x,az=heart[1]-z;
        const tx=ax-Math.round(ax/8)*8,tz=az-Math.round(az/8)*8,d=tx*tx+tz*tz;
        if(d<best){best=d;dx=tx;dz=tz;}
      }
      const pull=.34+.2*random();
      x=(x+dx*pull+8)%8;z=(z+dz*pull+8)%8;
    }
    data.set([x,z,random(),(tall?1:0)+random()*.96],i*4);
  }
  pattern=new THREE.DataTexture(data,128,n/128,THREE.RGBAFormat,THREE.FloatType);
  pattern.needsUpdate=true;
  return pattern;
}

function bladeShape(segments:number){
  const pos:number[]=[],normal:number[]=[],uv:number[]=[],blade:number[]=[],indices:number[]=[];
  for(let b=0;b<3;b++){
    const start=blade.length;
    for(let i=0;i<segments;i++)for(const side of [-1,1]){
      const t=i/segments;
      pos.push(side,t,0); normal.push(0,1,0); uv.push((side+1)/2,t); blade.push(b);
    }
    pos.push(0,1,0);normal.push(0,1,0);uv.push(.5,1);blade.push(b);
    for(let i=0;i<segments-1;i++){
      const k=start+i*2; indices.push(k,k+1,k+2,k+1,k+3,k+2);
    }
    const end=start+(segments-1)*2;indices.push(end,end+1,end+2);
  }
  const geo=new THREE.InstancedBufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geo.setAttribute('aRank',new THREE.Float32BufferAttribute(blade,1));
  geo.setIndex(indices);geo.instanceCount=0;
  return geo;
}

function grassBand(z:ZoneContext, surface:MeadowSurface, band:number, tint:THREE.Color, blade:[number,number],approachTint?:THREE.Color) {
  const geo=bladeShape(BAND_SEGMENTS[band]);
  const rows=Math.max(1,Math.ceil(surface.cells.length/32));
  const data=new Float32Array(32*rows*4);
  const cells=new THREE.DataTexture(data,32,rows,THREE.RGBAFormat,THREE.FloatType);
  cells.needsUpdate=true;
  const U=z.ctx.U;
  const uniforms={
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.lights),
    uMeadowPhase:U.uMeadowPhase??{value:0}, uMeadowWind:U.uMeadowWind??{value:.29},
    uSlimePos:U.uSlimePos??{value:new THREE.Vector4(0,-999,0,0)},
    uTrail:U.uMeadowTrail??{value:Array.from({length:4},()=>new THREE.Vector4(0,-999,0,0))},
    uSunDir:U.uSunDir??{value:new THREE.Vector3(.4,.8,.2)},uSunColor:U.uSunColor??{value:new THREE.Color(0xfff1cd)},
    uBudget:{value:1},uQuality:U.uGrassDensity??{value:1},uTint:{value:tint},uEntranceTint:{value:approachTint??tint},
    uBlade:{value:new THREE.Vector2(...blade)},
    uMeadowField:{value:surface.texture}, uFieldRect:{value:new THREE.Vector4(...surface.area.min,...surface.area.max)},
    uPattern:{value:grassPattern()},uCells:{value:cells},uAlbedo:U.uGrassAlbedoScale??{value:1},
    uSeason:surfaceClimate.season,uSnow:surfaceClimate.snow,uWet:surfaceClimate.wet,
  };
  const mat=new THREE.ShaderMaterial({uniforms,side:THREE.DoubleSide,lights:true,
    vertexShader:`
      ${FIELD_GLSL}
      ${MEADOW_WIND_GLSL}
      #include <shadowmap_pars_vertex>
      attribute float aRank;
      uniform sampler2D uPattern,uCells;
      uniform vec4 uSlimePos,uTrail[4]; uniform vec3 uTint,uEntranceTint,uSunDir,uSunColor;
      uniform float uQuality,uAlbedo,uSeason,uSnow,uWet;uniform int uBudget;
      uniform vec2 uBlade;
      varying vec3 vColor;
      void main(){
        int ci=gl_InstanceID/uBudget, id=gl_InstanceID-ci*uBudget;
        vec4 cell=texelFetch(uCells,ivec2(ci%32,ci/32),0);
        vec4 p=texelFetch(uPattern,ivec2(id%128,id/128),0);
        vec2 o=p.xy;
        if(fract(cell.z*7.)>.5)o.x=8.-o.x;
        if(fract(cell.z*13.)>.5)o=vec2(8.-o.y,o.x);
        float seed=fract(p.z+aRank*.381+cell.z);
        vec2 wild=vec2(cos(seed*31.),sin(seed*31.));
        vec2 root=cell.xy+o+wild*(.025+.055*seed);
        vec4 field=meadowSample(root);
        float camD=length(root-cameraPosition.xz);
        float nearD=min(camD,length(root-uSlimePos.xz));
        float keep=pow(5.4/max(5.4,nearD),1.30)*mix(.50,1.,uQuality);
        float rank=float(id)/11264.;
        float grow=clamp((keep*1.15-rank)/max(.15*keep,.0001),0.,1.)*field.y*field.z*smoothstep(.23,.72,field.w);
        if(grow<.04){gl_Position=vec4(2.,2.,2.,1.);vColor=vec3(0.);return;}
        float tall=step(1.,p.w), t=position.y;
        float h=mix(mix(.19,.37,fract(p.w)),mix(.42,.73,fract(p.w)),tall)*grow;
        float pressure=0., totalWeight=0.;
        vec2 awaySum=vec2(0.);
        for(int j=0;j<5;j++){
          vec4 actor=uSlimePos;if(j>0)actor=uTrail[j-1];
          vec2 away=root-actor.xz;float distanceToBody=length(away),radius=actor.w+.13;
          if(actor.w>0. && distanceToBody<radius && abs(field.x-actor.y)<.72){
            float press=1.-smoothstep(.05,radius,distanceToBody);
            pressure=max(pressure,press);
            awaySum+=away/max(.06,distanceToBody)*press;
            totalWeight+=press;
          }
        }
        float wind=uMeadowWind*(1.-smoothstep(.08,.80,pressure));
        float gust=(.5+.5*meadowWave(root))*wind;
        vec2 lean=wild*(.18+.24*tall)+vec2(.84,.54)*(.24*gust);
        lean+=.85*pressure*awaySum/max(.001,totalWeight);
        h*=uBlade.x*(1.-.24*pressure);
        lean/=max(1.,length(lean));
        vec2 eye=cameraPosition.xz-root;eye/=max(.001,length(eye));
        vec2 right=vec2(-eye.y,eye.x);
        float yaw=(seed-.5)*.9;
        right=mat2(cos(yaw),sin(yaw),-sin(yaw),cos(yaw))*right;
        float width=mix(.011,.020,seed)*min(4.6,pow(1./max(.008,keep),.58));
        vec3 wp=vec3(root.x,field.x-.018,root.y);
        wp.xz+=lean*h*t*t+right*position.x*width*uBlade.y*pow(1.-t,.72);
        wp.y+=h*t*(1.-.33*dot(lean,lean)*t);
        gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);
        #if defined(USE_SHADOWMAP) && NUM_DIR_LIGHT_SHADOWS > 0
          vDirectionalShadowCoord[0]=directionalShadowMatrix[0]*vec4(wp+vec3(0.,.055,0.),1.);
        #endif
        float colorBand=.5+.5*sin(root.x*.17+.8*sin(root.y*.12))*cos(root.y*.15);
        vec3 col=mix(uEntranceTint,uTint,smoothstep(142.,157.,root.y))*mix(vec3(.53,.62,.71),vec3(1.06,.93,.70),colorBand);
        col=mix(col,col*vec3(1.45,1.13,.73),step(.85,seed)*.61+tall*.16);
        col*=mix(.42,.85,smoothstep(.05,.36,t))*mix(1.,1.35,smoothstep(.53,.74,t));
        col*=1.+position.x*.055;
        float day=smoothstep(-.06,.40,uSunDir.y);
        vec3 nightGrass=vec3(.052,.088,.135)*(0.82+0.35*t);
        col*=mix(nightGrass,vec3(.75,.89,.83)+uSunColor*.18,day);
        col+=col*vec3(.51,.44,.14)*t*t*gust*day;
        if(uSeason>1.5)col*=uSeason>2.5?vec3(.84,.95,1.01):vec3(1.12,1.04,.78);
        col=mix(col,vec3(.70,.80,.85),uSnow*(.2+.55*t));
        vColor=col*(1.-uWet*.15)*mix(1.,uAlbedo,.38);
      }`,
    fragmentShader:`
    #include <packing>
    #if defined(USE_SHADOWMAP) && NUM_DIR_LIGHT_SHADOWS > 0
      uniform sampler2D directionalShadowMap[NUM_DIR_LIGHT_SHADOWS];
      varying vec4 vDirectionalShadowCoord[NUM_DIR_LIGHT_SHADOWS];
    #endif
    varying vec3 vColor;void main(){
      vec3 shade=vec3(1.);
      #if defined(USE_SHADOWMAP) && NUM_DIR_LIGHT_SHADOWS > 0
        vec3 sc=vDirectionalShadowCoord[0].xyz/vDirectionalShadowCoord[0].w;
        if(all(greaterThanEqual(sc,vec3(0.)))&&all(lessThanEqual(sc,vec3(1.)))){
          float light=step(sc.z-.0006,unpackRGBAToDepth(texture2D(directionalShadowMap[0],sc.xy)));
          shade=mix(vec3(.45,.56,.67),vec3(1.),light);
        }
      #endif
      gl_FragColor=vec4(vColor*shade,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const mesh=new THREE.Mesh(geo,mat);
  mesh.name=band===0?'grass-blades':'grass-blades-lod-'+band;
  mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.userData.cullDistance = 104;
  mesh.userData.walkThrough=true;mesh.layers.set(3);
  let lastOrder='';
  return {mesh, update(visible:THREE.Vector3[],quality:number){
    const budget=Math.round(64*BAND_DENSITY[band]*(.5+.5*quality));
    uniforms.uBudget.value=budget;
    geo.instanceCount=budget*visible.length;
    mesh.visible=geo.instanceCount>0;
    const order=visible.map(c=>c.x+','+c.z).join(';');
    if(order===lastOrder)return;
    lastOrder=order;
    visible.forEach((c,i)=>{
      const h=Math.sin(c.x*17.21+c.z*83.84)*41849.73;
      data.set([c.x-4,c.z-4,h-Math.floor(h),0],4*i);
    });
    cells.needsUpdate=true;
  }, dispose(){geo.dispose();mat.dispose();cells.dispose();}};
}


type FlowerPose=[number,number,number,number,number];
const flowers:FlowerSpecies[]=['daisy','poppy','lupin','buttercup'];
const farHeads=new Map<FlowerSpecies,THREE.BufferGeometry>();
function distantFlower(kind:FlowerSpecies) {
  const cached=farHeads.get(kind);
  if(cached)return cached;
  const b:FlowerGeoBuilder={pos:[],norm:[],uv:[],col:[]};
  const h=({oat:.60,iris:.49,gentian:.26,lupin:.40,daisy:.32,buttercup:.29,poppy:.37})[kind];
  const tint=({daisy:[.94,.92,.78],poppy:[.94,.22,.12],lupin:[.62,.41,.88],buttercup:[.96,.72,.12],iris:[.63,.46,.9],gentian:[.21,.35,.88],oat:[.85,.71,.32]} as const)[kind];
  const color:[number,number,number]=[...tint];
  pushTri(b,[-.009,0,0],[.009,0,0],[.025,h,0],[.25,.47,.17],h);
  for(let i=0;i<5;i++){
    const a=i*Math.PI*.4,c=(i+1)*Math.PI*.4,tip=kind==='lupin'?.13:.035;
    pushTri(b,[.025,h+tip,0],[.025+.07*Math.cos(a),h,.07*Math.sin(a)],[.025+.07*Math.cos(c),h,.07*Math.sin(c)],color,h);
  }
  const geo=finalizeFlowerGeo(b);
  farHeads.set(kind,geo);return geo;
}

function scatterFlowers(z:ZoneContext,surface:MeadowSurface,count:number,theme:string,group:THREE.Group,rect?:PreserveRect){
  const area=surface.area, ground=surface.sample.bind(surface);
  const seed=rng('flowers-'+area.min.join('/')+theme).next;
  const palette=habitats[theme]?.bloom??flowers;
  const sets:FlowerPose[][]=palette.map(()=>[]);
  const coverage=(x:number,zz:number)=>x>=area.min[0]&&x<area.max[0]&&zz>=area.min[1]&&zz<area.max[1]&&ground(x,zz,1)>.39;
  const density=theme==='park'?1.35:theme==='forest'||theme==='lake'?.60:1;
  const clusters=Math.max(8,Math.round(count*.006*density));
  const drift=(cx:number,cz:number,major:number)=>{
    const heading=seed()*Math.PI, length=1.7+seed()*2.8, width=.64+seed()*1.15;
    const minor=(major+1+Math.floor(seed()*(palette.length-1)))%palette.length;
    const num=Math.round((28+seed()*45)*density);
    for(let j=0;j<num;j++){
      const a=seed()*Math.PI*2, radial=Math.pow(seed(),.70);
      const ax=Math.cos(a)*radial*length,az=Math.sin(a)*radial*width;
      const x=cx+ax*Math.cos(heading)-az*Math.sin(heading),zz=cz+ax*Math.sin(heading)+az*Math.cos(heading);
      if(!coverage(x,zz))continue;
      const size=(1.46+seed()*.66)*(habitats[theme]?.flowerScale??(theme==='lake'?.72:1));
      sets[seed()<.77?major:minor].push([x,ground(x,zz)-.012,zz,seed()*Math.PI*2,size]);
    }
  };
  for(let n=0;n<clusters;n++) {
    let picked:[number,number]|undefined;
    for(let tries=0;tries<30;tries++){
      const x=area.min[0]+seed()*(area.max[0]-area.min[0]), zz=area.min[1]+seed()*(area.max[1]-area.min[1]);
      if(!coverage(x,zz))continue;
      if(rect&&seed()>bloomSuitability(rect,x,zz))continue;
      picked=[x,zz];
      if(theme!=='park'||n%3===0||pathDistance(x,zz)<7.8)break;
    }
    if(picked)drift(...picked,n%palette.length);
  }
  if(rect?.biome==='marsh'||rect?.biome==='bamboo'){
    // Walk a few cross-sections out of the basin, planting short drifts along its actual bank.
    const middle=(rect.minX+rect.maxX)*.5;
    for(let zz=rect.minZ+5;zz<rect.maxZ-3;zz+=3.7+seed()*1.8)for(const side of [-1,1]){
      let leftWater=false;
      for(let d=1;d<(rect.maxX-rect.minX)*.5-1;d+=.65){
        const x=middle+side*d,y=ground(x,zz);
        if(y<.21)leftWater=true;
        if(!leftWater||y<.34||!coverage(x,zz))continue;
        drift(x,zz,rect.biome==='marsh'?(seed()<.75?0:1):1);break;
      }
    }
  }
  const nearMat=createWildflowerMaterial(z,surface),farMat=nearMat;
  const bundles=sets.map((list,i)=>{
    const make=(far:boolean)=>{
      const mesh=new THREE.InstancedMesh(far?distantFlower(palette[i]):getFlowerGeometries()[palette[i]],far?farMat:nearMat,list.length);
      mesh.name=(i||rect?'grass-flowers-'+palette[i]:'grass-flowers')+(far?'-far':'');
      mesh.frustumCulled=false;mesh.userData.walkThrough=true;mesh.userData.meadowManaged=true;
      mesh.count=0;mesh.layers.set(3);group.add(mesh);
      return mesh;
    };
    return {list,near:make(false),far:make(true)};
  });
  let lastX=Infinity,lastZ=Infinity,lastQ=-1;
  const matrix=new THREE.Matrix4();
  return {total:sets.reduce((n,l)=>n+l.length,0),
    update(p:THREE.Vector3,q:number){
      if(Math.hypot(p.x-lastX,p.z-lastZ)<1.5&&q===lastQ)return;
      lastX=p.x;lastZ=p.z;lastQ=q;
      const limit=meadowViewDistance(q);
      for(const {list,near,far} of bundles){
        near.count=0;far.count=0;
        for(let i=0;i<list.length;i++){
          const [x,y,zz,a,s]=list[i],d=Math.hypot(p.x-x,p.z-zz);
          if(d>limit|| (d>18 && i%5>Math.round(4*q)))continue;
          const target=d<12+12*q?near:far;
          matrix.makeRotationY(a);matrix.multiplyScalar(s);matrix.elements[15]=1;matrix.setPosition(x,y,zz);
          target.setMatrixAt(target.count++,matrix);
        }
        for(const mesh of [near,far]){mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;}
      }
    },
    dispose(){nearMat.dispose();for(const {near,far} of bundles){near.dispose();far.dispose();}}
  };
}

interface FieldHandle {
  surface:MeadowSurface;group:THREE.Group;count:number;
  update(camera:THREE.Camera,frustum:THREE.Frustum,actor:THREE.Vector4,q:number):number;
  dispose():void;
}

function makeField(z:ZoneContext, count:number, area:MeadowArea,
    ground:(x:number,z:number)=>number, cover:(x:number,z:number)=>number, theme:string,tint:THREE.Color, withFlowers:boolean, rect?:PreserveRect):FieldHandle{
  const surface=new MeadowSurface(area,ground,cover);
  const group=new THREE.Group();group.name='grass-tufts';group.userData.walkThrough=true;
  const entrance=theme==='trail'?new THREE.Color():undefined;
  if(entrance)sampleInlandGrassColor((area.min[0]+area.max[0])/2<0?-68:0,111,entrance,new THREE.Color());
  const bands=BAND_END.map((_,i)=>grassBand(z,surface,i,tint,habitats[theme]?.blade??[1,1],entrance));
  for(const band of bands)group.add(band.mesh);
  const bloom=withFlowers?scatterFlowers(z,surface,count,theme,group,rect):null;
  const visible=BAND_END.map(()=>[] as THREE.Vector3[]);
  const sphere=new THREE.Sphere(new THREE.Vector3(),7.2);
  group.userData.theme=theme;group.userData.candidatesPerSquareMetre=CANDIDATES_PER_METRE;
  group.userData.flowerCount=bloom?.total??0;group.userData.cells=surface.cells.length;
  return {group,surface,count:bloom?.total??0,
    update(camera,frustum,actor,q){
      const cam=camera.position,limit=meadowViewDistance(q);
      if(rect){
        const outside=(x:number,z:number)=>x<rect.minX-limit-8||x>rect.maxX+limit+8||z<rect.minZ-limit-8||z>rect.maxZ+limit+8;
        group.visible=!(outside(cam.x,cam.z)&&outside(actor.x,actor.z));
        if(!group.visible){group.userData.activeTufts=0;return 0;}
      }
      let instances=0;
      for(const list of visible)list.length=0;
      for(const c of surface.cells){
        sphere.center.copy(c);
        if(!frustum.intersectsSphere(sphere))continue;
        const dist=Math.min(Math.hypot(c.x-cam.x,c.z-cam.z),Math.hypot(c.x-actor.x,c.z-actor.z));
        if(dist>limit+3)continue;
        const band=BAND_END.findIndex(v=>dist<v);
        if(band>=0)visible[band].push(c);
      }
      bands.forEach((b,i)=>{b.update(visible[i],q);instances+=b.mesh.geometry.instanceCount;});
      bloom?.update(cam,q);
      group.userData.activeTufts=instances;
      return instances;
    },
    dispose(){surface.texture.dispose();for(const b of bands)b.dispose();bloom?.dispose();group.removeFromParent();}
  };
}

/** Shared service for the five native fields and the currently owned frontier. */
export class HomeMeadows {
  private native:FieldHandle[]=[];
  private frontier=new Map<string,FieldHandle>();
  private expansions:ExpandedTile[]=[];
  private boxes:readonly GrassExcludeBox[]=[];
  private frustum=new THREE.Frustum();
  private vp=new THREE.Matrix4();
  readonly stats={fields:0,expansions:0,cells:0,flowerCount:0,activeTufts:0,contactRadius:0,range:0};
  constructor(private ctx:any){}
  private surfaceAt(x: number, z: number): MeadowSurface | undefined {
    const contains = (field: FieldHandle) => {
      const {min,max} = field.surface.area;
      return x >= min[0] && x < max[0] && z >= min[1] && z < max[1];
    };
    for (const field of this.frontier.values()) if (contains(field)) return field.surface;
    return this.native.find(contains)?.surface;
  }
  groundAt(x: number, z: number): number | null {
    return this.surfaceAt(x,z)?.sample(x,z) ?? null;
  }
  rainHeight(x:number, z:number, solid:number):number {
    const surface=this.surfaceAt(x,z);
    if(!surface)return solid;
    const ground=surface.sample(x,z);
    if(Math.abs(ground-solid)>.07)return solid;
    // Dense blades intercept a fraction of the drops above the soil; bare and paved patches stay at grade.
    const cover=surface.sample(x,z,1)*surface.sample(x,z,3);
    const patch=.5+.5*Math.sin(x*8.7+z*2.3)*Math.cos(z*7.1);
    return Math.max(solid,ground)+cover*patch*.34;
  }
  register(field:FieldHandle){this.native.push(field);}
  addPreserve(r:PreserveRect,parent:THREE.Group,ground=(x:number,z:number)=>preserveHeight(r,x,z),cover=(x:number,z:number)=>preserveCover(r,x,z),margin=0){
    const h=habitats[r.biome],zone={ctx:this.ctx,T:this.ctx.THREE} as ZoneContext;
    const field=makeField(zone,h.drifts,{min:[r.minX-margin,r.minZ],max:[r.maxX+margin,r.maxZ]},
      ground,cover,r.biome,new THREE.Color(h.tint),true,r);
    field.group.name='preserve-meadow-'+r.biome;
    parent.add(field.group);this.register(field);field.surface.setExclusions(this.boxes);
    return ()=>{this.native.splice(this.native.indexOf(field),1);field.dispose();};
  }
  syncExclusions(boxes:readonly GrassExcludeBox[]){
    this.boxes=boxes;
    const coastalEdges:GrassExcludeBox[]=[];
    for(const tile of this.expansions){
      const slot=slotForTile(tile);
      if(slot)coastalEdges.push({x:(slot.min[0]+slot.max[0])/2,z:(slot.min[1]+slot.max[1])/2,
        hx:(slot.max[0]-slot.min[0])/2-.35,hz:(slot.max[1]-slot.min[1])/2-.35});
    }
    for(const f of this.native)f.surface.setExclusions(coastalEdges.length?[...boxes,...coastalEdges]:boxes);
    for(const f of this.frontier.values())f.surface.setExclusions(boxes);
  }
  syncExpansions(expansions:ExpandedTile[]){
    this.expansions=expansions;
    const keys=new Set(expansions.map(t=>t.id+':'+t.theme));
    for(const [key,field] of this.frontier)if(!keys.has(key)){field.dispose();this.frontier.delete(key);}
    for(const tile of expansions){
      const key=tile.id+':'+tile.theme,slot=slotForTile(tile);if(this.frontier.has(key)||!slot)continue;
      const def=EXPANSION_THEMES[tile.theme],ctx=this.ctx;
      const cx=(slot.min[0]+slot.max[0])/2,cz=(slot.min[1]+slot.max[1])/2;
      const w=slot.max[0]-slot.min[0],h=slot.max[1]-slot.min[1];
      const obstacles=def.naturalProps.map(p=>[slot.min[0]+p.u*w,slot.min[1]+p.v*h,Math.min(1,p.width*.21)]);
      const cover=(x:number,z:number)=>{
        const s=expansionSurfaceWeights(x,z,slot,tile.theme);
        if(tile.theme==='jiangnan'&&Math.hypot(x-cx,z-cz)<Math.min(w,h)*.20+.32)return 0;
        if(obstacles.some(([tx,tz,r])=>Math.hypot(tx-x,tz-z)<r))return 0;
        return (1-s.road)*(1-s.sand)*(1-s.pond);
      };
      const zone={ctx,T:ctx.THREE} as ZoneContext;
      const f=makeField(zone,1800,slot,(x,z)=>expansionGroundAt(x,z,slot,tile.theme),cover,tile.theme,new THREE.Color(def.grassHex).multiplyScalar(.80),true);
      f.group.name='grass-expansion-'+tile.id;ctx.scene.add(f.group);
      this.frontier.set(key,f);
    }
    this.syncExclusions(this.boxes);
  }
  update(camera:THREE.Camera, actor:THREE.Vector4,q:number){
    camera.updateMatrixWorld();
    this.frustum.setFromProjectionMatrix(this.vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    const s=this.stats;
    s.fields=0;s.expansions=this.frontier.size;s.cells=0;s.activeTufts=0;s.flowerCount=0;
    s.contactRadius=actor.w;s.range=meadowViewDistance(q);
    const visit=(f:FieldHandle)=>{
      s.fields++;s.cells+=f.surface.cells.length;s.flowerCount+=f.count;
      s.activeTufts+=f.update(camera,this.frustum,actor,q);
    };
    this.native.forEach(visit);this.frontier.forEach(visit);
  }
}

export function createChunkedGrassISM(z:ZoneContext,count:number,area:MeadowArea,
  avoid:(x:number,zz:number)=>boolean,colors=[0x6fb84d,0xffe066,0xffb3c6,0xffffff]){
  const theme=z.rect?.id??'park';
  const tint=new THREE.Color(),temp=new THREE.Color();
  sampleInlandGrassColor((area.min[0]+area.max[0])/2,(area.min[1]+area.max[1])/2,tint,temp);
  const cover=(x:number,zz:number)=>{
    if(avoid(x,zz))return 0;
    const road=Math.max(sampleTerrainRoadWeight(x,zz),approachWear(x,zz));
    const shoreline=theme==='lake'?Math.min(1,Math.max(0,(lakeEdge(x,zz)-1.12)*5)):1;
    return (1-road)*shoreline*(theme==='lake'?.75:1);
  };
  const field=makeField(z,count,area,triangleGround(z.ground),cover,theme,tint,colors.length>1);
  z.ctx.grassField?.register(field);
  return field.group;
}
