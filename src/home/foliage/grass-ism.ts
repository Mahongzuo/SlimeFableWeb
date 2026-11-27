import * as THREE from 'three';
import type {ZoneContext} from '../../zones/types';
import {climateMaterial} from '../climate-material';
import {sampleInlandGrassColor} from '../../world/terrain-mesh';

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

const GLSL_EXCL_HELPER = `
uniform vec4 uGrassExclRect[${MAX_GRASS_EXCLUSIONS}];
uniform vec2 uGrassExclRot[${MAX_GRASS_EXCLUSIONS}];
uniform int uGrassExclCount;

float grassExclusionKeep(vec2 wp) {
  float keep = 1.0;
  for (int i = 0; i < ${MAX_GRASS_EXCLUSIONS}; i++) {
    if (i >= uGrassExclCount) break;
    vec4 r = uGrassExclRect[i];
    vec2 rot = uGrassExclRot[i];
    vec2 d = wp - r.xy;
    float lx = d.x * rot.x - d.y * rot.y;
    float lz = d.x * rot.y + d.y * rot.x;
    float ox = abs(lx) - r.z;
    float oz = abs(lz) - r.w;
    float outside = max(ox, oz);
    if (outside <= 0.0) return 0.0;
    keep = min(keep, smoothstep(0.0, 0.22, outside));
  }
  return keep;
}
`;

/**
 * Builds a lush painterly stylized grass clump geometry (BotW / Genshin / Meadow inspired):
 * - 9 fuller, gently bellied, gracefully arching blades per tuft (low filler + mid + tall sweeping hero blades)
 * - 4 vertical segments per blade for smooth quadratic wind bending
 * - Encodes lateral side in UV.x (0 = left, 1 = right, 0.5 = tip) & height fraction in UV.y (0 = root, 1 = tip)
 */
function buildStylizedClumpGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  const norm: number[] = [];
  const uv: number[] = [];

  const blades = 9;
  const bladeHeights = [0.22, 0.31, 0.40, 0.25, 0.35, 0.44, 0.23, 0.33, 0.38];
  const bladeWidths = [0.056, 0.050, 0.045, 0.054, 0.048, 0.043, 0.055, 0.049, 0.046];

  for (let b = 0; b < blades; b++) {
    const golden = b * 2.3999632 + 0.35;
    const rad = b < 3 ? 0.035 + b * 0.032 : 0.085 + ((b * 19) % 5) * 0.036;
    const ox = Math.cos(golden) * rad;
    const oz = Math.sin(golden) * rad;
    const height = bladeHeights[b];
    const halfW = bladeWidths[b];
    const arch = 0.12 + (b % 3) * 0.055;

    const leanAng = golden + ((b % 2) ? 0.25 : -0.25);
    const dx = Math.cos(leanAng);
    const dz = Math.sin(leanAng);
    const px = -dz;
    const pz = dx;

    const tiers = [
      {t: 0.00, w: 0.92, lean: 0.00},
      {t: 0.28, w: 1.00, lean: 0.12},
      {t: 0.58, w: 0.74, lean: 0.38},
      {t: 0.82, w: 0.38, lean: 0.72},
    ];

    const pts: [number, number, number][][] = [];
    for (const tr of tiers) {
      const y = height * tr.t;
      const l = arch * tr.lean;
      const w = halfW * tr.w;
      const cx = ox + dx * l;
      const cz = oz + dz * l;
      pts.push([
        [cx - px * w, y, cz - pz * w],
        [cx + px * w, y, cz + pz * w],
      ]);
    }
    const tipPt: [number, number, number] = [ox + dx * arch, height, oz + dz * arch];

    const pushV = (p: [number, number, number], t: number, uSide: number) => {
      pos.push(p[0], p[1], p[2]);
      const nx = dx * (0.16 * t);
      const nz = dz * (0.16 * t);
      const ny = 1.0;
      const inv = 1 / Math.hypot(nx, ny, nz);
      norm.push(nx * inv, ny * inv, nz * inv);
      uv.push(uSide, t);
    };

    const emitQuad = (i0: number, i1: number, t0: number, t1: number) => {
      const a = pts[i0][0], b0 = pts[i0][1], c = pts[i1][0], d = pts[i1][1];
      pushV(a, t0, 0.0); pushV(b0, t0, 1.0); pushV(d, t1, 1.0);
      pushV(a, t0, 0.0); pushV(d, t1, 1.0); pushV(c, t1, 0.0);
    };

    emitQuad(0, 1, 0.00, 0.28);
    emitQuad(1, 2, 0.28, 0.58);
    emitQuad(2, 3, 0.58, 0.82);

    pushV(pts[3][0], 0.82, 0.0);
    pushV(pts[3][1], 0.82, 1.0);
    pushV(tipPt, 1.0, 0.5);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}

const DENSITY_NEAR = 14;
const DENSITY_FAR = 62;
const FAR_DENSITY = 0.3;

/** Fraction of a chunk's clumps kept at a given camera distance (before the preset density). */
export function grassDensityAt(dist: number) {
  const t = Math.min(1, Math.max(0, (dist - DENSITY_NEAR) / (DENSITY_FAR - DENSITY_NEAR)));
  return 1 + (FAR_DENSITY - 1) * t * t * (3 - 2 * t);
}

/** Deterministic 2D hash in [0, 1) for Voronoi meadow clump centers. */
function hash2(ix: number, iz: number, salt: number): number {
  const n = Math.sin(ix * 127.1 + iz * 311.7 + salt * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

/** Nearest Voronoi clump center within a 1.75m meadow cell (meadow-inspired organic clumping). */
function nearestClumpHeart(x: number, z: number): [number, number] {
  const cell = 1.75;
  const cx = Math.floor(x / cell);
  const cz = Math.floor(z / cell);
  let bestD = Infinity;
  let bx = x;
  let bz = z;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const gx = cx + dx;
      const gz = cz + dz;
      const hx = (gx + 0.18 + 0.64 * hash2(gx, gz, 1)) * cell;
      const hz = (gz + 0.18 + 0.64 * hash2(gx, gz, 2)) * cell;
      const d = (hx - x) * (hx - x) + (hz - z) * (hz - z);
      if (d < bestD) {
        bestD = d;
        bx = hx;
        bz = hz;
      }
    }
  }
  return [bx, bz];
}

/**
 * Stylized Meadow Grass Shader (BotW / Ghibli / Meadow techniques):
 * 1. Unflipped terrain-transferred upward normals (zero dark backfaces)
 * 2. Real-time GPU oriented-box exclusion mask (farm beds, buildings, planters stay 100% weed-free!)
 * 3. Downward-look pitch-back & view-space widening (blades stay lush even from steep overhead angles)
 * 4. Folded-blade left/right micro-shading (~7%) + 10% warm straw-gold / 10% cool-emerald blade variety
 * 5. Coherent rolling wind waves + interactive slime trampling + backlit tip translucency
 */
function createGrassMaterial(z: ZoneContext): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.0,
    side: THREE.DoubleSide,
    envMapIntensity: 0.85,
  });

  const U = z.ctx.U;
  mat.onBeforeCompile = (shader: any) => {
    shader.uniforms.uTime = U.uTime;
    shader.uniforms.uWind = U.uWind ?? {value: 0.5};
    shader.uniforms.uSunDir = U.uSunDir ?? {value: new THREE.Vector3(0.4, 0.7, 0.5)};
    shader.uniforms.uSunColor = U.uSunColor ?? {value: new THREE.Color(0xfff1d5)};
    shader.uniforms.uSlimePos = U.uSlimePos ?? {value: new THREE.Vector4(0, -99, 0, 0.6)};
    shader.uniforms.uGrassAlbedoScale = U.uGrassAlbedoScale ?? {value: 1.0};
    shader.uniforms.uGrassSssStrength = U.uGrassSssStrength ?? {value: 1.0};
    shader.uniforms.uGrassDensity = U.uGrassDensity ?? {value: 1.0};
    shader.uniforms.uGrassExclRect = grassExclusionUniforms.uGrassExclRect;
    shader.uniforms.uGrassExclRot = grassExclusionUniforms.uGrassExclRot;
    shader.uniforms.uGrassExclCount = grassExclusionUniforms.uGrassExclCount;

    shader.vertexShader =
      `uniform float uTime, uWind, uGrassDensity;
       attribute float aRank;
       uniform vec4 uSlimePos;
       ${GLSL_EXCL_HELPER}
       varying float vTip;
       varying float vSide;
       varying float vWindCrest;
       varying float vVariety;
       varying vec3 vGrassWorld;
       varying vec3 vUpNormalView;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vTip = uv.y;
        vSide = (uv.x - 0.5) * 2.0;
        #ifdef USE_INSTANCING
          vec3 instPos = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #else
          vec3 instPos = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #endif
        vVariety = fract(sin(dot(floor(instPos.xz * 3.7), vec2(127.1, 311.7))) * 43758.5453);

        // Real-time GPU exclusion for farm beds, raised planters, and solid structures
        float exclKeep = grassExclusionKeep(instPos.xz);

        // Smooth distance scale fade into terrain (no popping)
        float camDist = length(instPos.xz - cameraPosition.xz);
        float distFade = (1.0 - smoothstep(54.0, 102.0, camDist)) * exclKeep;
        #ifdef USE_INSTANCING
          float dens = uGrassDensity * mix(1.0, ${FAR_DENSITY.toFixed(2)}, smoothstep(${DENSITY_NEAR.toFixed(1)}, ${DENSITY_FAR.toFixed(1)}, camDist));
          float keep = 1.0 - smoothstep(dens - 0.06, dens, aRank);
          transformed.xz *= mix(1.0, 1.32, smoothstep(${DENSITY_NEAR.toFixed(1)}, ${DENSITY_FAR.toFixed(1)}, camDist));
          distFade *= keep;
        #endif
        if (distFade <= 0.002) {
          transformed = vec3(0.0, -40.0, 0.0);
        } else {
          transformed *= distFade;
        }

        // Coherent rolling Ghibli/BotW/Meadow wind wave field across the island
        float bend = vTip * vTip;
        float waveCoord = dot(instPos.xz, vec2(0.13, 0.095)) - uTime * (1.35 + uWind * 1.15);
        float macroWave = sin(waveCoord) * 0.5 + 0.5;
        float microWave = sin(waveCoord * 2.35 + instPos.x * 0.28 - instPos.z * 0.21) * 0.5 + 0.5;
        float combinedWave = macroWave * 0.72 + microWave * 0.28;
        vWindCrest = smoothstep(0.42, 0.92, combinedWave);

        float sway = (combinedWave - 0.32) * (0.14 + 0.28 * uWind) * bend * step(0.005, distFade);
        float flutter = sin(uTime * 3.4 + dot(instPos.xz, vec2(0.7, 0.5))) * 0.025 * bend * step(0.005, distFade);
        transformed.x += sway * 0.88 + flutter;
        transformed.z += sway * 0.52 + flutter * 0.6;
        transformed.y -= abs(sway) * 0.26;

        // Interactive bending away from the slime
        vec2 toBlade = instPos.xz - uSlimePos.xz;
        float dSlime = length(toBlade);
        float pushRad = uSlimePos.w + 0.62;
        if (distFade > 0.005 && dSlime < pushRad && abs(instPos.y - uSlimePos.y) < 1.35) {
          float push = (1.0 - dSlime / pushRad);
          vec2 pushDir = toBlade / max(dSlime, 0.01);
          transformed.xz += pushDir * push * push * 0.48 * vTip;
          transformed.y *= 1.0 - push * 0.45 * vTip;
        }

        #ifdef USE_INSTANCING
          vec4 wPos = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
        #else
          vec4 wPos = modelMatrix * vec4(transformed, 1.0);
        #endif

        // Meadow-inspired downward-look pitch-back + view-space widening so blades never thin out from above
        if (distFade > 0.005) {
          vec3 toCam = cameraPosition - instPos;
          float camLen = max(length(toCam), 0.01);
          float lookDown = smoothstep(0.28, 0.86, toCam.y / camLen);
          vec2 awayCamXZ = -toCam.xz / max(length(toCam.xz), 0.01);
          wPos.xz += awayCamXZ * (lookDown * 0.055 * vTip * distFade);
          vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
          float widen = (1.0 - vTip * 0.62) * (0.018 + lookDown * 0.014) * (1.0 - smoothstep(14.0, 50.0, camDist)) * distFade;
          wPos.xyz += camRight * (vSide * widen);
        }
        vGrassWorld = wPos.xyz;

        // Clean terrain-transferred upward normal in view space (NEVER inverted on backface!)
        vec3 worldUpN = normalize(vec3(sway * 0.45, 1.0, sway * 0.30));
        vUpNormalView = normalize((viewMatrix * vec4(worldUpN, 0.0)).xyz);`,
      ).replace(
        '#include <project_vertex>',
        `vec4 mvPosition = viewMatrix * vec4(vGrassWorld, 1.0);
         gl_Position = projectionMatrix * mvPosition;`,
      );

    shader.fragmentShader =
      `uniform vec3 uSunDir, uSunColor;
       uniform float uGrassAlbedoScale, uGrassSssStrength;
       varying float vTip;
       varying float vSide;
       varying float vWindCrest;
       varying float vVariety;
       varying vec3 vGrassWorld;
       varying vec3 vUpNormalView;\n` +
      shader.fragmentShader
        .replace(
          '#include <normal_fragment_begin>',
          `// Stylized terrain-transferred normal: ALWAYS points softly skyward on BOTH sides (zero black backfaces!)
          vec3 normal = normalize(vUpNormalView);
          vec3 nonPerturbedNormal = normal;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          // Match terrain turf micro-variation & canopy AO right at the root (vTip = 0) so grass sits grounded
          float turfA = sin(vGrassWorld.x * 1.45 + sin(vGrassWorld.z * 1.25)) * cos(vGrassWorld.z * 1.38 - vGrassWorld.x * 0.72);
          float turfB = sin(vGrassWorld.x * 5.8 + vGrassWorld.z * 4.9) * cos(vGrassWorld.x * 4.3 - vGrassWorld.z * 6.1);
          vec3 rootCol = diffuseColor.rgb * (0.94 + 0.08 * turfA + 0.04 * turfB);
          // Warm sunlit sage-chartreuse tip gradient + broad meadow color patches
          float meadowPatch = 0.5 + 0.5 * sin(vGrassWorld.x * 0.095 + sin(vGrassWorld.z * 0.08) * 1.8) * cos(vGrassWorld.z * 0.105);
          vec3 tipCol = mix(rootCol * vec3(1.08, 1.12, 0.84), rootCol * vec3(1.18, 1.14, 0.76), meadowPatch);
          // Meadow-style species tint variety: 10% warm straw-gold tips, 10% deeper cool-emerald tips
          float straw = smoothstep(0.88, 0.96, vVariety);
          float emerald = smoothstep(0.12, 0.04, vVariety);
          tipCol = mix(tipCol, tipCol * vec3(1.18, 1.04, 0.72), straw * 0.72);
          tipCol = mix(tipCol, tipCol * vec3(0.84, 1.05, 0.96), emerald * 0.65);
          // Folded-blade subtle left/right crease shading (~7%) for crisp painterly volume
          float foldShade = 1.0 + vSide * 0.072 * (0.35 + 0.65 * vTip);
          float rootAO = mix(0.83, 1.0, smoothstep(0.0, 0.42, vTip));
          float grad = smoothstep(0.08, 0.94, vTip);
          diffuseColor.rgb = mix(rootCol, tipCol, grad) * rootAO * foldShade * mix(1.0, uGrassAlbedoScale, 0.42 * grad);`,
        )
        .replace(
          '#include <lights_fragment_end>',
          `#include <lights_fragment_end>
          // Rolling Ghibli/BotW sunlit wind-wave sheen + soft backlit tip translucency
          vec3 gV = normalize(cameraPosition - vGrassWorld);
          vec3 gL = normalize(uSunDir);
          float sunVis = smoothstep(-0.04, 0.10, gL.y);
          float back = pow(max(dot(gV, -gL), 0.0), 2.4);
          float sheen = vWindCrest * smoothstep(0.25, 0.95, vTip) * (0.35 + 0.65 * max(gL.y, 0.0));
          vec3 sssTint = mix(vec3(0.58, 0.80, 0.32), vec3(1.0, 0.78, 0.36), smoothstep(0.28, 0.02, gL.y));
          vec3 waveTint = vec3(0.52, 0.68, 0.30);
          reflectedLight.directDiffuse += (sssTint * (back * 0.55 + 0.10 * max(gL.y, 0.0)) * vTip * vTip + waveTint * sheen * 0.42) * uSunColor * uGrassSssStrength * sunVis;`,
        );
  };
  mat.customProgramCacheKey = () => 'stylized-meadow-grass-ism-v5';
  climateMaterial(mat, 'terrain');
  return mat;
}

// ---------------------------------------------------------------------------
// 4 True 3D Meadow Wildflower Species (Daisy, Poppy, Lupin, Buttercup)
// ---------------------------------------------------------------------------

type FlowerSpecies = 'daisy' | 'poppy' | 'lupin' | 'buttercup';

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

let sharedFlowerGeos: Record<FlowerSpecies, THREE.BufferGeometry> | null = null;
function getFlowerGeometries(): Record<FlowerSpecies, THREE.BufferGeometry> {
  if (!sharedFlowerGeos) {
    sharedFlowerGeos = {
      daisy: buildDaisyGeometry(),
      poppy: buildPoppyGeometry(),
      lupin: buildLupinGeometry(),
      buttercup: buildButtercupGeometry(),
    };
  }
  return sharedFlowerGeos;
}

/** Shared wildflower material with wind sway, slime trampling, distance fade, and real-time GPU exclusion mask. */
function createWildflowerMaterial(z: ZoneContext): THREE.MeshStandardMaterial {
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
    shader.uniforms.uTime = U.uTime;
    shader.uniforms.uWind = U.uWind ?? {value: 0.5};
    shader.uniforms.uSlimePos = U.uSlimePos ?? {value: new THREE.Vector4(0, -99, 0, 0.6)};
    shader.uniforms.uSunDir = U.uSunDir ?? {value: new THREE.Vector3(0.4, 0.7, 0.5)};
    shader.uniforms.uSunColor = U.uSunColor ?? {value: new THREE.Color(0xfff1d5)};
    shader.uniforms.uGrassExclRect = grassExclusionUniforms.uGrassExclRect;
    shader.uniforms.uGrassExclRot = grassExclusionUniforms.uGrassExclRot;
    shader.uniforms.uGrassExclCount = grassExclusionUniforms.uGrassExclCount;

    shader.vertexShader =
      `uniform float uTime, uWind;
       uniform vec4 uSlimePos;
       ${GLSL_EXCL_HELPER}
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
        float exclKeep = grassExclusionKeep(fInst.xz);
        float camDist = length(fInst.xz - cameraPosition.xz);
        float fade = (1.0 - smoothstep(46.0, 82.0, camDist)) * exclKeep;
        if (fade <= 0.002) {
          transformed = vec3(0.0, -40.0, 0.0);
        } else {
          transformed *= fade;
          float bend = vFlowerTip * vFlowerTip;
          float wPh = dot(fInst.xz, vec2(0.14, 0.10)) - uTime * (1.45 + uWind * 1.15);
          float sw = (sin(wPh) * 0.7 + sin(wPh * 2.1 + fInst.x * 0.4) * 0.3) * (0.09 + 0.18 * uWind) * bend;
          transformed.x += sw * 0.85;
          transformed.z += sw * 0.55;
          vec2 toF = fInst.xz - uSlimePos.xz;
          float dS = length(toF);
          float pR = uSlimePos.w + 0.55;
          if (dS < pR && abs(fInst.y - uSlimePos.y) < 1.35) {
            float push = 1.0 - dS / pR;
            transformed.xz += (toF / max(dS, 0.01)) * push * push * 0.40 * vFlowerTip;
            transformed.y *= 1.0 - push * 0.42 * vFlowerTip;
          }
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
  mat.customProgramCacheKey = () => 'meadow-wildflower-3d-v1';
  climateMaterial(mat, 'terrain');
  return mat;
}

/**
 * Builds spatial 24m x 24m frustum-culled stylized meadow grass chunks + 4-species 3D wildflower drifts.
 * Uses Voronoi dual-tier clumping, seamless root terrain-matching, and GPU dynamic exclusion masks.
 */
export function createChunkedGrassISM(
  z: ZoneContext,
  count: number,
  area: {min: [number, number]; max: [number, number]},
  avoid: (x: number, z: number) => boolean,
  colors = [0x6fb84d, 0xffe066, 0xffb3c6, 0xffffff],
) {
  const {T} = z;
  const U = z.ctx.U;
  const g = new T.Group();
  g.name = 'grass-tufts';

  const clumpGeo = buildStylizedClumpGeometry();
  const grassMat = createGrassMaterial(z);

  const targetClumps = Math.round(count * 2.45);
  const CHUNK = 24;
  const buckets = new Map<string, [number, number, number, number, number, number][]>();

  let placed = 0;
  for (let tries = 0; placed < targetClumps && tries < targetClumps * 4; tries++) {
    let x = area.min[0] + z.rand() * (area.max[0] - area.min[0]);
    let zz = area.min[1] + z.rand() * (area.max[1] - area.min[1]);

    // Meadow dual-tier Voronoi clumping: 28% tall hero clumps pull gently toward clump hearts; 72% lush ground carpet
    const isTallTier = z.rand() < 0.28;
    if (isTallTier) {
      const [hx, hz] = nearestClumpHeart(x, zz);
      const pull = 0.26 + z.rand() * 0.34;
      x += (hx - x) * pull;
      zz += (hz - zz) * pull;
      if (x < area.min[0] || x > area.max[0] || zz < area.min[1] || zz > area.max[1]) continue;
    }

    if (avoid(x, zz)) continue;
    const y = z.ground(x, zz);
    const yaw = z.rand() * Math.PI * 2;
    const cluster = 0.5 + 0.5 * Math.sin(x * 0.22 + Math.sin(zz * 0.17) * 1.4) * Math.cos(zz * 0.19 - x * 0.08);
    const sx = isTallTier
      ? (0.96 + z.rand() * 0.50 + cluster * 0.24)
      : (0.82 + z.rand() * 0.46 + cluster * 0.20);
    const sy = isTallTier
      ? (0.98 + cluster * 0.46) * (0.92 + z.rand() * 0.34)
      : (0.58 + cluster * 0.38) * (0.80 + z.rand() * 0.34);

    const key = `${Math.floor(x / CHUNK)}_${Math.floor(zz / CHUNK)}`;
    let list = buckets.get(key);
    if (!list) {
      list = [];
      buckets.set(key, list);
    }
    list.push([x, y, zz, yaw, sx, sy]);
    placed++;
  }

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const c = new THREE.Color();
  const tint = new THREE.Color();
  const scaleV = new THREE.Vector3();
  const posV = new THREE.Vector3();

  let chunkIdx = 0;
  for (const list of buckets.values()) {
    const mesh = new T.InstancedMesh(clumpGeo, grassMat, list.length);
    mesh.name = chunkIdx === 0 ? 'grass-blades' : `grass-blades-${chunkIdx}`;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < list.length; i++) {
      const [x, y, zz, yaw, sx, sy] = list[i];
      e.set((z.rand() - 0.5) * 0.08, yaw, (z.rand() - 0.5) * 0.08);
      q.setFromEuler(e);
      posV.set(x, y - 0.012, zz);
      scaleV.set(sx, sy, sx);
      m.compose(posV, q, scaleV);
      mesh.setMatrixAt(i, m);
      sampleInlandGrassColor(x, zz, c, tint);
      c.offsetHSL((z.rand() - 0.5) * 0.014, (z.rand() - 0.5) * 0.035, (z.rand() - 0.5) * 0.028);
      mesh.setColorAt(i, c);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (zz < minZ) minZ = zz; if (zz > maxZ) maxZ = zz;
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    const cx = (minX + maxX) * 0.5, cy = (minY + maxY) * 0.5 + 0.35, cz = (minZ + maxZ) * 0.5;
    mesh.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(cx, cy, cz),
      Math.hypot(maxX - cx, maxY - cy + 1.0, maxZ - cz) + 1.5,
    );
    mesh.frustumCulled = true;
    const rank = new Float32Array(list.length);
    for (let i = 0; i < list.length; i++) rank[i] = (i + 0.5) / list.length;
    mesh.geometry = clumpGeo.clone();
    mesh.geometry.setAttribute('aRank', new THREE.InstancedBufferAttribute(rank, 1));
    const full = list.length;
    mesh.userData.cullDistance = 104;
    const center = mesh.boundingSphere.center, radius = mesh.boundingSphere.radius;
    const density = U.uGrassDensity;
    mesh.onBeforeRender = (_r: any, _s: any, camera: any) => {
      const p = camera.position;
      const near = Math.max(0, Math.hypot(p.x - center.x, p.z - center.z) - radius);
      if (near > 104) { mesh.count = 0; return; }
      mesh.count = Math.min(full, Math.ceil(full * (density?.value ?? 1) * grassDensityAt(near)) + 1);
    };
    g.add(mesh);
    chunkIdx++;
  }

  // 4-Species Natural Wildflower Drifts (daisy, poppy, lupin, buttercup)
  if (colors.length > 1) {
    const speciesList: FlowerSpecies[] = ['daisy', 'poppy', 'lupin', 'buttercup'];
    const speciesSpots: Record<FlowerSpecies, [number, number, number, number, number][]> = {
      daisy: [],
      poppy: [],
      lupin: [],
      buttercup: [],
    };
    const driftCount = Math.max(12, Math.min(72, Math.floor(count * 0.013)));
    for (let d = 0; d < driftCount; d++) {
      let cx = 0, cz = 0, found = false;
      for (let t = 0; t < 10; t++) {
        const tx = area.min[0] + z.rand() * (area.max[0] - area.min[0]);
        const tz = area.min[1] + z.rand() * (area.max[1] - area.min[1]);
        if (!avoid(tx, tz)) { cx = tx; cz = tz; found = true; break; }
      }
      if (!found) continue;
      const sp = speciesList[Math.floor(z.rand() * speciesList.length)];
      const clusterSize = 4 + Math.floor(z.rand() * 6);
      const driftRad = sp === 'lupin' ? 1.35 : 1.75;
      for (let k = 0; k < clusterSize; k++) {
        const ang = z.rand() * Math.PI * 2;
        const dist = Math.sqrt(z.rand()) * driftRad;
        const fx = cx + Math.cos(ang) * dist;
        const fz = cz + Math.sin(ang) * dist;
        if (fx < area.min[0] || fx > area.max[0] || fz < area.min[1] || fz > area.max[1]) continue;
        if (avoid(fx, fz)) continue;
        const fy = z.ground(fx, fz);
        const fyaw = z.rand() * Math.PI * 2;
        const fscale = 0.85 + z.rand() * 0.45;
        speciesSpots[sp].push([fx, fy, fz, fyaw, fscale]);
      }
    }

    const geos = getFlowerGeometries();
    const flowerMat = createWildflowerMaterial(z);
    for (const sp of speciesList) {
      const arr = speciesSpots[sp];
      if (!arr.length) continue;
      const flowers = new T.InstancedMesh(geos[sp], flowerMat, arr.length);
      flowers.name = sp === 'daisy' ? 'grass-flowers' : `grass-flowers-${sp}`;
      flowers.receiveShadow = true;
      flowers.castShadow = false;
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (let i = 0; i < arr.length; i++) {
        const [fx, fy, fz, fyaw, fs] = arr[i];
        e.set((z.rand() - 0.5) * 0.14, fyaw, (z.rand() - 0.5) * 0.14);
        q.setFromEuler(e);
        m.compose(posV.set(fx, fy - 0.01, fz), q, scaleV.set(fs, fs, fs));
        flowers.setMatrixAt(i, m);
        // Gentle per-flower natural warmth/brightness variation while preserving species vertex colors
        c.setRGB(0.94 + z.rand() * 0.12, 0.94 + z.rand() * 0.12, 0.92 + z.rand() * 0.14);
        flowers.setColorAt(i, c);
        if (fx < minX) minX = fx; if (fx > maxX) maxX = fx;
        if (fy < minY) minY = fy; if (fy > maxY) maxY = fy;
        if (fz < minZ) minZ = fz; if (fz > maxZ) maxZ = fz;
      }
      flowers.instanceMatrix.needsUpdate = true;
      if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
      const cx = (minX + maxX) * 0.5, cy = (minY + maxY) * 0.5 + 0.3, cz = (minZ + maxZ) * 0.5;
      flowers.boundingSphere = new THREE.Sphere(
        new THREE.Vector3(cx, cy, cz),
        Math.hypot(maxX - cx, maxY - cy + 1.0, maxZ - cz) + 1.5,
      );
      flowers.frustumCulled = true;
      flowers.userData.cullDistance = 84;
      g.add(flowers);
    }
  }

  return g;
}
