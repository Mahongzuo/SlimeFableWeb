import * as THREE from 'three';

let microNormalTex: THREE.CanvasTexture | null = null;
let microRoughTex: THREE.CanvasTexture | null = null;

function hash2(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Smooth periodic value noise for seamless tileable micro-surface maps. */
function tileNoise(u: number, v: number, freq: number, seed: number): number {
  const x = u * freq, y = v * freq;
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
  const x0 = ((xi % freq) + freq) % freq, x1 = (x0 + 1) % freq;
  const y0 = ((yi % freq) + freq) % freq, y1 = (y0 + 1) % freq;
  const a = hash2(x0, y0, seed), b = hash2(x1, y0, seed);
  const c = hash2(x0, y1, seed), d = hash2(x1, y1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

export function getMicroSurfaceMaps(): {normalMap: THREE.CanvasTexture | null; roughnessMap: THREE.CanvasTexture | null} {
  if (typeof document === 'undefined') return {normalMap: null, roughnessMap: null};
  if (microNormalTex && microRoughTex) return {normalMap: microNormalTex, roughnessMap: microRoughTex};

  const size = 128;
  const heights = new Float32Array(size * size);
  for (let j = 0; j < size; j++) {
    const v = j / size;
    for (let i = 0; i < size; i++) {
      const u = i / size;
      const h =
        0.52 * tileNoise(u, v, 8, 11) +
        0.30 * tileNoise(u, v, 16, 37) +
        0.18 * tileNoise(u, v, 32, 73);
      heights[i + j * size] = h;
    }
  }

  const nc = document.createElement('canvas');
  nc.width = nc.height = size;
  const ng = nc.getContext('2d')!;
  const nImg = ng.createImageData(size, size);

  const rc = document.createElement('canvas');
  rc.width = rc.height = size;
  const rg = rc.getContext('2d')!;
  const rImg = rg.createImageData(size, size);

  for (let j = 0; j < size; j++) {
    const jm = (j - 1 + size) % size, jp = (j + 1) % size;
    for (let i = 0; i < size; i++) {
      const im = (i - 1 + size) % size, ip = (i + 1) % size;
      const dx = (heights[ip + j * size] - heights[im + j * size]) * 1.4;
      const dy = (heights[i + jp * size] - heights[i + jm * size]) * 1.4;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const p = (i + j * size) * 4;
      nImg.data[p] = Math.round(127.5 * (1 - dx * inv));
      nImg.data[p + 1] = Math.round(127.5 * (1 - dy * inv));
      nImg.data[p + 2] = Math.round(255 * inv);
      nImg.data[p + 3] = 255;

      const rv = Math.round(178 + heights[i + j * size] * 62);
      rImg.data[p] = rImg.data[p + 1] = rImg.data[p + 2] = rv;
      rImg.data[p + 3] = 255;
    }
  }
  ng.putImageData(nImg, 0, 0);
  rg.putImageData(rImg, 0, 0);

  microNormalTex = new THREE.CanvasTexture(nc);
  microNormalTex.wrapS = microNormalTex.wrapT = THREE.RepeatWrapping;
  microNormalTex.repeat.set(2, 2);

  microRoughTex = new THREE.CanvasTexture(rc);
  microRoughTex.wrapS = microRoughTex.wrapT = THREE.RepeatWrapping;
  microRoughTex.repeat.set(2, 2);

  return {normalMap: microNormalTex, roughnessMap: microRoughTex};
}

export interface HomeMaterialOptions {
  emissive?: number | string;
  emissiveIntensity?: number;
  map?: THREE.Texture | null;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
  vertexColors?: boolean;
  depthWrite?: boolean;
  roughness?: number;
  metalness?: number;
  noCache?: boolean;
}

/**
 * Stylized-PBR material factory replacing MeshToonMaterial inside the Home island.
 * Preserves the exact signature of ctx.mats.toon(color, opts) so all zones and props upgrade seamlessly.
 */
export function createHomeMaterialFactory() {
  const cache = new Map<string, THREE.MeshStandardMaterial>();
  const {normalMap, roughnessMap} = getMicroSurfaceMaps();

  return (color: number | string, options: HomeMaterialOptions = {}): THREE.MeshStandardMaterial => {
    const {noCache, ...opts} = options;
    const key = opts.map || noCache ? null : JSON.stringify([color, opts]);
    if (key && cache.has(key)) return cache.get(key)!;

    const useMicro = !opts.map && !opts.transparent && !opts.emissive;
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.72,
      metalness: opts.metalness ?? 0.02,
      envMapIntensity: 1.08,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 1.0,
      map: opts.map ?? null,
      normalMap: useMicro ? normalMap : null,
      normalScale: useMicro ? new THREE.Vector2(0.18, 0.18) : new THREE.Vector2(1, 1),
      roughnessMap: useMicro ? roughnessMap : null,
      transparent: !!opts.transparent,
      opacity: opts.opacity ?? 1.0,
      side: opts.side ?? THREE.FrontSide,
      vertexColors: !!opts.vertexColors,
      depthWrite: opts.depthWrite ?? !opts.transparent,
    });
    if (key) cache.set(key, mat);
    return mat;
  };
}
