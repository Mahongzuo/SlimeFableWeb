import * as THREE from 'three';
import type {ZoneContext} from '../../zones/types';
import {climateMaterial} from '../climate-material';
import {getFoliageAtlas} from './foliage-atlas';

function makeRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

/**
 * Builds a Meadow-inspired volumetric broadleaf tree canopy:
 * - Multi-lobe organic inner crown core (eliminates hollow card cross-sections, UV-mapped into opaque Q0 leaf core)
 * - 32 arched leaf-sprig cluster cards distributed around the lobes with sphere-projected transferred normals
 * - Rich vertical canopy AO (deep cool-green underside -> sunlit warm-gold upper crown dabs)
 *
 * Strictly preserves:
 * - position, normal, uv, color attributes (compatible with forest.ts treehouse canopy using pineLeafMat alphaTest)
 * - Lower crown core covering (0, ~2.26, 0) while trunk rises to y = 3.05 (satisfies tests/home-waterside.test.ts)
 */
export function buildBroadleafCanopyGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  const norm: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];

  const rand = makeRng(71203);
  const centerY = 3.46;
  const radX = 1.72;
  const radY = 1.28;

  const pushCrownVertex = (vx: number, vy: number, vz: number, uu: number, vv: number, aoScale = 1.0) => {
    pos.push(vx, vy, vz);
    // Sphere-projected transferred normal with soft skyward wrap so sunlight rolls volumetrically across the crown
    const nx = vx / radX;
    const ny = (vy - (centerY - 0.36)) / radY + 0.24;
    const nz = vz / radX;
    const inv = 1 / Math.max(0.001, Math.hypot(nx, ny, nz));
    norm.push(nx * inv, ny * inv, nz * inv);
    uv.push(uu, vv);
    const distNorm = Math.min(1, Math.hypot(vx / radX, (vy - centerY) / radY, vz / radX));
    const heightAO = Math.max(0, Math.min(1, (vy - (centerY - radY)) / (radY * 2)));
    // Meadow-style deeper underside shade + bright sunlit upper crown
    const ao = Math.min(1.14, (0.46 + 0.28 * distNorm + 0.34 * Math.pow(heightAO, 1.15)) * aoScale);
    col.push(ao, ao, ao);
  };

  // 1. Multi-lobe soft volumetric inner canopy core (UV mapped strictly inside opaque Q0 center [0.21..0.29, 0.71..0.79])
  const lobes: {cx: number; cy: number; cz: number; rx: number; ry: number; rz: number}[] = [
    {cx: 0.00, cy: 3.32, cz: 0.00, rx: 1.24, ry: 1.04, rz: 1.24}, // central core reaches down to y = 2.28 over trunk
    {cx: 0.68, cy: 3.52, cz: 0.36, rx: 0.88, ry: 0.72, rz: 0.84},
    {cx: -0.64, cy: 3.44, cz: 0.42, rx: 0.86, ry: 0.70, rz: 0.82},
    {cx: 0.04, cy: 3.60, cz: -0.68, rx: 0.90, ry: 0.74, rz: 0.84},
  ];
  const baseBlob = new THREE.IcosahedronGeometry(1, 1);
  const bPos = baseBlob.attributes.position;
  for (let l = 0; l < lobes.length; l++) {
    const lb = lobes[l];
    const tmp: THREE.Vector3[] = [];
    for (let i = 0; i < bPos.count; i++) {
      const ox = bPos.getX(i), oy = bPos.getY(i), oz = bPos.getZ(i);
      // Gentle organic lumpiness on lobe surface
      const lump = 0.94 + 0.10 * Math.sin(ox * 3.1 + l * 1.7) * Math.cos(oz * 2.9 - oy * 2.3);
      tmp.push(new THREE.Vector3(
        lb.cx + ox * lb.rx * lump,
        lb.cy + oy * lb.ry * lump,
        lb.cz + oz * lb.rz * lump,
      ));
    }
    const idx = baseBlob.index;
    const emitIdx = (k: number) => {
      const v = tmp[k];
      const uu = 0.25 + Math.sin(v.x * 2.1 + v.z * 1.7) * 0.032;
      const vv = 0.75 + Math.cos(v.y * 2.3 - v.x * 1.5) * 0.032;
      pushCrownVertex(v.x, v.y, v.z, uu, vv, 0.90);
    };
    if (idx) {
      for (let i = 0; i < idx.count; i++) emitIdx(idx.getX(i));
    } else {
      for (let i = 0; i < tmp.length; i++) emitIdx(i);
    }
  }
  baseBlob.dispose();

  // 2. Curved exterior leaf-sprig cards giving airy meadow silhouette & sunlit outer leaf dabs
  const addCard = (cx: number, cy: number, cz: number, size: number, yaw: number, pitch: number, roll: number, u0 = 0.01, v0 = 0.51, u1 = 0.49, v1 = 0.99) => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll));
    const h = size * 0.5;
    const corners: [number, number, number, number, number][] = [
      [-h, -h, -h * 0.16, u0, v0],
      [h, -h, -h * 0.16, u1, v0],
      [h, h, -h * 0.16, u1, v1],
      [-h, h, -h * 0.16, u0, v1],
    ];
    const wPts = corners.map(([lx, ly, lz, uu, vv]) => {
      const v = new THREE.Vector3(lx, ly, lz).applyQuaternion(q);
      v.x += cx;
      v.y += cy;
      v.z += cz;
      return {v, uu, vv};
    });
    const emit = (pt: {v: THREE.Vector3; uu: number; vv: number}) => {
      pushCrownVertex(pt.v.x, pt.v.y, pt.v.z, pt.uu, pt.vv, 1.04);
    };
    emit(wPts[0]); emit(wPts[1]); emit(wPts[2]);
    emit(wPts[0]); emit(wPts[2]); emit(wPts[3]);
  };

  // Lower-core horizontal foliage skirt directly over trunk entry + sunlit top cap
  addCard(0, 2.34, 0, 1.58, 0.3, Math.PI * 0.48, 0.1);
  addCard(0, 4.46, 0, 1.65, 1.1, Math.PI * 0.46, 0.2);

  // 32 golden-spiral distributed leaf-cluster cards clothing the volumetric crown
  const cards = 32;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < cards; i++) {
    const t = (i + 0.5) / cards;
    const yUnit = 1 - 2 * t;
    const ringR = Math.sqrt(Math.max(0, 1 - yUnit * yUnit));
    const phi = i * golden;
    const shell = 0.72 + rand() * 0.36;
    const cx = Math.cos(phi) * ringR * radX * shell;
    const cy = centerY + yUnit * radY * shell;
    const cz = Math.sin(phi) * ringR * radX * shell;
    const cardSize = 1.15 + rand() * 0.52;
    addCard(cx, cy, cz, cardSize, phi + (rand() - 0.5) * 0.9, (rand() - 0.5) * 1.2, (rand() - 0.5) * 0.9);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
}

/**
 * Builds a tiered pine-needle bough spray cluster using Quadrant 1 of the foliage atlas.
 */
export function buildPineBoughGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  const norm: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];

  const cards = 6;
  for (let i = 0; i < cards; i++) {
    const a = (i / cards) * Math.PI * 2 + 0.2;
    const tilt = 0.28 + (i % 2) * 0.14;
    const r = 0.35;
    const cx = Math.cos(a) * r;
    const cz = Math.sin(a) * r;
    const cy = (i % 2) * 0.14;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI * 0.5 - tilt, a, 0));
    const hw = 0.95, hh = 0.95;
    const u0 = 0.51, v0 = 0.51, u1 = 0.99, v1 = 0.99;
    const pts = [
      [-hw, -hh, 0, u0, v0],
      [hw, -hh, 0, u1, v0],
      [hw, hh, 0, u1, v1],
      [-hw, hh, 0, u0, v1],
    ].map(([lx, ly, lz, uu, vv]) => {
      const v = new THREE.Vector3(lx, ly, lz).applyQuaternion(q);
      v.x += cx;
      v.y += cy;
      v.z += cz;
      return {v, uu, vv};
    });

    const emit = (pt: {v: THREE.Vector3; uu: number; vv: number}) => {
      pos.push(pt.v.x, pt.v.y, pt.v.z);
      const n = new THREE.Vector3(pt.v.x * 0.45, 0.88, pt.v.z * 0.45).normalize();
      norm.push(n.x, n.y, n.z);
      uv.push(pt.uu, pt.vv);
      const ao = 0.65 + 0.35 * Math.min(1, Math.hypot(pt.v.x, pt.v.z) / 1.1);
      col.push(ao, ao, ao);
    };
    emit(pts[0]); emit(pts[1]); emit(pts[2]);
    emit(pts[0]); emit(pts[2]); emit(pts[3]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
}

/** Organic tapered trunk with 4 fluted root buttresses and top cap solidly penetrating into canopy core (y = 3.05). */
function buildGnarledTrunkGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.13, 0.28, 3.05, 12, 7, false);
  geo.translate(0, 3.05 * 0.5, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = y / 3.05;
    const ang = Math.atan2(z, x);
    // 4-lobe organic root buttress flare near ground (keeps center axis intact for raycast tests!)
    const rootT = Math.pow(Math.max(0, 1 - t * 3.1), 2);
    const buttress = 1 + rootT * (0.42 + 0.32 * (0.5 + 0.5 * Math.cos(ang * 4.0 + 0.4)));
    const bendX = Math.sin(t * Math.PI) * 0.065;
    const bendZ = Math.cos(t * Math.PI * 0.8) * 0.042 * t;
    pos.setXYZ(i, x * buttress + bendX, y, z * buttress + bendZ);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Shared alpha-cutout volumetric foliage material with wind flutter + meadow sunlit crown dabs + backlit rim + climate seasons. */
export function createLeafCardMaterial(z: ZoneContext, swayAmount = 0.06, evergreen = false): THREE.MeshStandardMaterial {
  const {map} = getFoliageAtlas();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map,
    vertexColors: true,
    alphaTest: 0.36,
    side: THREE.DoubleSide,
    roughness: 0.74,
    metalness: 0.0,
    envMapIntensity: 0.96,
  });

  const U = z.ctx.U;
  mat.onBeforeCompile = (shader: any) => {
    shader.uniforms.uTime = U.uTime;
    shader.uniforms.uWind = U.uWind ?? {value: 0.5};
    shader.uniforms.uSunDir = U.uSunDir ?? {value: new THREE.Vector3(0.4, 0.7, 0.5)};
    shader.uniforms.uSunColor = U.uSunColor ?? {value: new THREE.Color(0xfff1d5)};
    shader.uniforms.uGrassSssStrength = U.uGrassSssStrength ?? {value: 0.82};

    shader.vertexShader =
      `uniform float uTime, uWind;
       varying vec3 vLeafWorld;
       varying float vLeafHeight;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 instP = instanceMatrix[3].xyz;
        #else
          vec3 instP = vec3(0.0);
        #endif
        float h = max(position.y, 0.0);
        vLeafHeight = clamp((position.y - 2.1) / 2.5, 0.0, 1.0);
        float ph = dot(instP.xz, vec2(0.31, 0.23)) + dot(position.xz, vec2(1.9, 1.4));
        float mainSway = sin(uTime * 1.45 + dot(instP.xz, vec2(0.18, 0.14))) * 0.65;
        float flutter = sin(uTime * 3.8 + ph) * 0.35;
        float amp = ${swayAmount.toFixed(3)} * (0.45 + uWind * 0.95);
        transformed.x += (mainSway * h * 0.25 + flutter) * amp;
        transformed.z += (cos(uTime * 1.2 + ph * 0.5) * h * 0.18 + flutter * 0.7) * amp;
        #ifdef USE_INSTANCING
          vLeafWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vLeafWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif`,
      );

    shader.fragmentShader =
      `uniform vec3 uSunDir, uSunColor;
       uniform float uGrassSssStrength;
       varying vec3 vLeafWorld;
       varying float vLeafHeight;\n` +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          // Meadow-inspired vertical crown tint: cool-deep shade underneath, warm sunlit lime-gold dabs at top
          vec3 underShade = diffuseColor.rgb * vec3(0.76, 0.84, 0.88);
          vec3 topSunlit = diffuseColor.rgb * vec3(1.12, 1.10, 0.84);
          diffuseColor.rgb = mix(underShade, topSunlit, smoothstep(0.10, 0.90, vLeafHeight));`,
        )
        .replace(
          '#include <lights_fragment_end>',
          `#include <lights_fragment_end>
          // Backlit foliage translucency + sunlit golden rim light
          vec3 lV = normalize(cameraPosition - vLeafWorld);
          vec3 lL = normalize(uSunDir);
          float sunVis = smoothstep(-0.04, 0.10, lL.y);
          float back = pow(max(dot(lV, -lL), 0.0), 2.8);
          float rim = pow(1.0 - max(dot(normalize(normal), normalize(vViewPosition)), 0.0), 2.2) * vLeafHeight;
          float trans = back * 0.78 + 0.15 * max(lL.y, 0.0) + rim * 0.32;
          reflectedLight.directDiffuse += diffuseColor.rgb * vec3(1.18, 1.24, 0.62) * uSunColor * trans * 0.52 * uGrassSssStrength * sunVis;`,
        );
  };
  mat.customProgramCacheKey = () => `meadow-vol-leaf-v2-${swayAmount}-${evergreen ? 'ev' : 'dec'}`;
  if (!evergreen) climateMaterial(mat, 'leaves');
  else climateMaterial(mat, 'structure');
  return mat;
}

let sharedCanopyGeo: THREE.BufferGeometry | null = null;
let sharedTrunkGeo: THREE.BufferGeometry | null = null;
let sharedPineGeo: THREE.BufferGeometry | null = null;

/**
 * Drop-in volumetric ISM replacement for kit.ts:trees().
 * Renders ALL broadleaf trees in a zone in just 2 draw calls (tree-trunks + tree-foliage).
 */
export function createBroadleafTreesISM(
  z: ZoneContext,
  spots: [number, number, number][],
  colors = [0x5d9452, 0x6ea65a, 0x4b824d],
) {
  const {T} = z;
  const g = new T.Group();
  g.name = 'trees';
  const n = spots.length;

  sharedTrunkGeo ??= buildGnarledTrunkGeometry();
  sharedCanopyGeo ??= buildBroadleafCanopyGeometry();

  const trunkMat = z.toon(0x6d523a);
  const leafMat = createLeafCardMaterial(z, 0.055);

  const trunk = new T.InstancedMesh(sharedTrunkGeo, trunkMat, n);
  trunk.name = 'tree-trunks';
  const crown = new T.InstancedMesh(sharedCanopyGeo, leafMat, n);
  crown.name = 'tree-foliage';

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const c = new THREE.Color();
  const p = new THREE.Vector3();
  const sc = new THREE.Vector3();

  spots.forEach(([x, zz, s], i) => {
    const y = z.ground(x, zz);
    const yaw = z.rand() * Math.PI * 2;
    e.set(0, yaw, 0);
    q.setFromEuler(e);
    m.compose(p.set(x, y, zz), q, sc.set(s, s, s));
    trunk.setMatrixAt(i, m);
    crown.setMatrixAt(i, m);
    const base = colors[i % colors.length];
    crown.setColorAt(i, c.setHex(base).offsetHSL((z.rand() - 0.5) * 0.028, 0.04, (z.rand() - 0.5) * 0.07));
  });

  trunk.instanceMatrix.needsUpdate = true;
  crown.instanceMatrix.needsUpdate = true;
  if (crown.instanceColor) crown.instanceColor.needsUpdate = true;

  for (const mesh of [trunk, crown]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  return g;
}

export function getSharedPineBoughGeometry(): THREE.BufferGeometry {
  sharedPineGeo ??= buildPineBoughGeometry();
  return sharedPineGeo;
}
