import * as THREE from 'three';
import type {ZoneContext} from '../../zones/types';
import {inland, LAKE, lakeEdge, pathDistance, WORLD} from '../../world/map';
import {riverDistance} from '../waterway';
import {createLeafCardMaterial} from './tree-ism';
import {climateMaterial} from '../climate-material';

function makeRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

/** Graceful slightly-arched segmented bamboo culm (1 ISM for all stalks across the island!). */
function buildBambooCulmGeometry(): THREE.BufferGeometry {
  const segs = 7;
  const h = 6.2;
  const geo = new THREE.CylinderGeometry(0.028, 0.062, h, 6, segs, false);
  geo.translate(0, h * 0.5, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = y / h;
    // Gentle graceful arch toward +X (matching sunset silhouetted bamboo in reference image 2!)
    const arch = t * t * 0.65;
    // Subtle bamboo node bulge at regular intervals
    const node = 1 + 0.14 * Math.exp(-Math.pow(((y % 0.85) - 0.42) * 14, 2));
    pos.setXYZ(i, x * node + arch, y, z * node);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Feathered drooping bamboo leaf crown using Quadrant 2 (UV [0..0.5, 0..0.5]) of the foliage atlas. */
function buildBambooFrondGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  const norm: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];

  // 7 drooping bamboo sprays arrayed along the upper half of the arched culm
  const sprays: [number, number, number, number, number][] = [
    [0.14, 3.1, 0.0, 0.2, 1.35],
    [0.24, 3.8, 0.0, 2.3, 1.45],
    [0.34, 4.4, 0.0, 4.2, 1.55],
    [0.44, 5.0, 0.0, 1.1, 1.50],
    [0.52, 5.5, 0.0, 3.4, 1.45],
    [0.60, 5.9, 0.0, 5.4, 1.40],
    [0.65, 6.2, 0.0, 0.4, 1.30],
  ];

  for (const [cx, cy, cz, yaw, size] of sprays) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.32, yaw, 0.18));
    const hw = size * 0.55;
    const hh = size * 0.45;
    const u0 = 0.01, v0 = 0.01, u1 = 0.49, v1 = 0.49;
    const pts = [
      [0, -hh, 0, u0, v0],
      [hw * 2, -hh, 0, u1, v0],
      [hw * 2, hh, 0, u1, v1],
      [0, hh, 0, u0, v1],
    ].map(([lx, ly, lz, uu, vv]) => {
      const v = new THREE.Vector3(lx, ly, lz).applyQuaternion(q);
      v.x += cx;
      v.y += cy;
      v.z += cz;
      return {v, uu, vv};
    });

    const emit = (pt: {v: THREE.Vector3; uu: number; vv: number}) => {
      pos.push(pt.v.x, pt.v.y, pt.v.z);
      const n = new THREE.Vector3((pt.v.x - cx) * 0.35, 0.85, (pt.v.z - cz) * 0.35).normalize();
      norm.push(n.x, n.y, n.z);
      uv.push(pt.uu, pt.vv);
      const ao = 0.62 + 0.38 * ((pt.v.y - 2.8) / 3.8);
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

/** Coastal cliff-rim & understory fern cluster using Quadrant 3 (UV [0.5..1, 0..0.5]). */
function buildFernClusterGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  const norm: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  const u0 = 0.51, v0 = 0.01, u1 = 0.99, v1 = 0.49;

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.68, a, 0));
    const hw = 0.48, hh = 0.72;
    const pts = [
      [-hw, 0, 0, u0, v0],
      [hw, 0, 0, u1, v0],
      [hw, hh, 0, u1, v1],
      [-hw, hh, 0, u0, v1],
    ].map(([lx, ly, lz, uu, vv]) => {
      const v = new THREE.Vector3(lx, ly, lz).applyQuaternion(q);
      return {v, uu, vv};
    });
    const emit = (pt: {v: THREE.Vector3; uu: number; vv: number}) => {
      pos.push(pt.v.x, pt.v.y, pt.v.z);
      norm.push(0, 1, 0);
      uv.push(pt.uu, pt.vv);
      const ao = 0.58 + 0.42 * Math.min(1, pt.v.y / 0.55);
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

/**
 * Builds island-wide coastal bamboo groves & cliff-rim ferns in just 3 ISM draw calls!
 * Directly delivers the iconic bamboo-on-coastal-cliff silhouettes from reference images 1 & 2.
 */
export function buildCoastalBambooAndFernsISM(z: ZoneContext): THREE.Group {
  const {T} = z;
  const group = new T.Group();
  group.name = 'coastal-bamboo-foliage';
  const rand = makeRng(90421);

  // Curated coastal cliff groves (avoiding portals, paths, lake pier & south harbor boat channel)
  const groveCenters: [number, number, number, number][] = [
    [-24, -22, 7.5, 42],  // Harbor southwest headland (iconic sunset silhouette!)
    [25, -20, 6.5, 36],   // Harbor southeast bamboo cliff
    [26, 46, 6.5, 34],    // East park cliff grove
    [25, 118, 7.0, 38],   // East lake promontory
    [-18, 137, 8.0, 42],  // North lake cliff
    [-98, 128, 9.0, 48],  // Northwest pine-bamboo headland
    [-101, 56, 8.0, 44],  // West forest cliff
    [-99, -18, 7.5, 36],  // Southwest terrace headland
  ];

  const stalks: [number, number, number, number, number][] = [];
  for (const [gx, gz, rad, count] of groveCenters) {
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * rad;
      const x = Math.max(WORLD.min[0] + 1.5, Math.min(WORLD.max[0] - 1.5, gx + Math.cos(a) * r));
      const zz = Math.max(WORLD.min[1] + 1.5, Math.min(WORLD.max[1] - 1.5, gz + Math.sin(a) * r));
      if (pathDistance(x, zz) < 3.0 || lakeEdge(x, zz) < 1.25 || riverDistance(x, zz) < 4.5) continue;
      if (Math.hypot(x - 10, zz - 17) < 13.5) continue; // Keep book plaza open
      const y = inland(x, zz);
      if (y < -0.1) continue;
      stalks.push([x, y, zz, rand() * Math.PI * 2, 0.85 + rand() * 0.62]);
    }
  }

  const culmGeo = buildBambooCulmGeometry();
  const frondGeo = buildBambooFrondGeometry();

  // Culm material with wind sway synced to frond material
  const culmMat = new THREE.MeshStandardMaterial({
    color: 0x6c8848,
    roughness: 0.56,
    metalness: 0.02,
    envMapIntensity: 0.85,
  });
  const U = z.ctx.U;
  culmMat.onBeforeCompile = (shader: any) => {
    shader.uniforms.uTime = U.uTime;
    shader.uniforms.uWind = U.uWind ?? {value: 0.5};
    shader.vertexShader =
      'uniform float uTime, uWind;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = instanceMatrix[3].xyz;
        #else
          vec3 ip = vec3(0.0);
        #endif
        float bt = max(position.y / 6.2, 0.0);
        float sway = sin(uTime * 1.45 + dot(ip.xz, vec2(0.18, 0.14))) * bt * bt * (0.18 + 0.36 * uWind);
        transformed.x += sway;
        transformed.z += cos(uTime * 1.15 + ip.z * 0.2) * bt * bt * (0.10 + 0.22 * uWind);`,
      );
  };
  culmMat.customProgramCacheKey = () => 'aaa-bamboo-culm-v1';
  climateMaterial(culmMat, 'structure');

  const frondMat = createLeafCardMaterial(z, 0.13, true);

  const culmsMesh = new T.InstancedMesh(culmGeo, culmMat, Math.max(1, stalks.length));
  culmsMesh.name = 'bamboo-stalks-foliage';
  const frondsMesh = new T.InstancedMesh(frondGeo, frondMat, Math.max(1, stalks.length));
  frondsMesh.name = 'bamboo-leaves-foliage';

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const col = new THREE.Color();

  stalks.forEach(([x, y, zz, yaw, s], i) => {
    e.set((rand() - 0.5) * 0.08, yaw, (rand() - 0.5) * 0.08);
    q.setFromEuler(e);
    m.compose(p.set(x, y - 0.08, zz), q, sc.set(s * 0.9, s, s * 0.9));
    culmsMesh.setMatrixAt(i, m);
    frondsMesh.setMatrixAt(i, m);
    col.setHex(0x52b84a).offsetHSL((rand() - 0.5) * 0.025, 0.06, (rand() - 0.5) * 0.08);
    frondsMesh.setColorAt(i, col);
    col.setHex(0x5ea844).offsetHSL(0, 0, (rand() - 0.5) * 0.08);
    culmsMesh.setColorAt(i, col);
  });
  culmsMesh.count = frondsMesh.count = stalks.length;
  culmsMesh.castShadow = frondsMesh.castShadow = true;
  culmsMesh.receiveShadow = frondsMesh.receiveShadow = true;
  culmsMesh.instanceMatrix.needsUpdate = frondsMesh.instanceMatrix.needsUpdate = true;
  if (culmsMesh.instanceColor) culmsMesh.instanceColor.needsUpdate = true;
  if (frondsMesh.instanceColor) frondsMesh.instanceColor.needsUpdate = true;
  group.add(culmsMesh, frondsMesh);

  // Coastal cliff-rim & grove understory ferns (1 ISM draw call)
  const fernSpots: [number, number, number, number, number][] = [];
  for (let i = 0; i < 420; i++) {
    const x = WORLD.min[0] + 1 + rand() * (WORLD.max[0] - WORLD.min[0] - 2);
    const zz = WORLD.min[1] + 1 + rand() * (WORLD.max[1] - WORLD.min[1] - 2);
    const edgeDist = Math.min(x - WORLD.min[0], WORLD.max[0] - x, zz - WORLD.min[1], WORLD.max[1] - zz);
    // Concentrate along coastal cliff edges & bamboo groves
    if (edgeDist > 8.5 && !groveCenters.some(([gx, gz, rad]) => Math.hypot(x - gx, zz - gz) < rad + 2)) continue;
    if (pathDistance(x, zz) < 2.6 || lakeEdge(x, zz) < 1.2 || riverDistance(x, zz) < 4.5 || Math.hypot(x - 10, zz - 17) < 12) continue;
    const y = inland(x, zz);
    if (y < -0.1) continue;
    fernSpots.push([x, y, zz, rand() * Math.PI * 2, 0.75 + rand() * 0.75]);
  }

  if (fernSpots.length > 0) {
    const fernGeo = buildFernClusterGeometry();
    const fernMat = createLeafCardMaterial(z, 0.08);
    const ferns = new T.InstancedMesh(fernGeo, fernMat, fernSpots.length);
    ferns.name = 'coastal-ferns-foliage';
    fernSpots.forEach(([x, y, zz, yaw, s], i) => {
      e.set(0, yaw, 0);
      q.setFromEuler(e);
      m.compose(p.set(x, y - 0.02, zz), q, sc.set(s, s, s));
      ferns.setMatrixAt(i, m);
      ferns.setColorAt(i, col.setHex(0x5f944f).offsetHSL((rand() - 0.5) * 0.02, 0.04, (rand() - 0.5) * 0.08));
    });
    ferns.receiveShadow = true;
    ferns.instanceMatrix.needsUpdate = true;
    if (ferns.instanceColor) ferns.instanceColor.needsUpdate = true;
    group.add(ferns);
  }

  return group;
}
