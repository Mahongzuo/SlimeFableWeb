import * as THREE from 'three';

export interface TerrainSplatTextures {
  flagstoneAlbedo: THREE.CanvasTexture;
  flagstoneNormal: THREE.CanvasTexture;
  turfAlbedo: THREE.CanvasTexture;
  turfNormal: THREE.CanvasTexture;
  sandAlbedo: THREE.CanvasTexture;
  sandNormal: THREE.CanvasTexture;
}

let cachedTextures: TerrainSplatTextures | null = null;

function hash2(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

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

function buildNormalTexture(heights: Float32Array, size: number, strength: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  for (let j = 0; j < size; j++) {
    const jm = (j - 1 + size) % size, jp = (j + 1) % size;
    for (let i = 0; i < size; i++) {
      const im = (i - 1 + size) % size, ip = (i + 1) % size;
      const dx = (heights[ip + j * size] - heights[im + j * size]) * strength;
      const dy = (heights[i + jp * size] - heights[i + jm * size]) * strength;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const p = (i + j * size) * 4;
      img.data[p] = Math.round(127.5 * (1 - dx * inv));
      img.data[p + 1] = Math.round(127.5 * (1 - dy * inv));
      img.data[p + 2] = Math.round(255 * inv);
      img.data[p + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Generates seamless tileable Pine & Parcel-style PBR terrain splat maps:
 * 1) Hand-laid irregular Voronoi limestone flagstones (albedo + height-in-alpha + beveled normal)
 * 2) Lush painterly meadow turf with subtle brushed blades & tiny clover flecks
 * 3) Warm speckled coastal beach sand with soft wind ripples
 */
export function getTerrainSplatTextures(): TerrainSplatTextures | null {
  if (typeof document === 'undefined') return null;
  if (cachedTextures) return cachedTextures;

  const size = 256;

  // --- 1. Hand-laid Irregular Voronoi Flagstones ---
  const cells = 7;
  const ptsX = new Float32Array(cells * cells);
  const ptsY = new Float32Array(cells * cells);
  const cellTint = new Float32Array(cells * cells);
  for (let cy = 0; cy < cells; cy++) {
    for (let cx = 0; cx < cells; cx++) {
      const id = cx + cy * cells;
      ptsX[id] = cx + 0.18 + hash2(cx, cy, 13) * 0.64;
      ptsY[id] = cy + 0.18 + hash2(cx, cy, 29) * 0.64;
      cellTint[id] = hash2(cx, cy, 53);
    }
  }

  const flagCanvas = document.createElement('canvas');
  flagCanvas.width = flagCanvas.height = size;
  const fg = flagCanvas.getContext('2d')!;
  const fImg = fg.createImageData(size, size);
  const flagH = new Float32Array(size * size);

  const stonePalette: [number, number, number][] = [
    [224, 214, 190], // warm cream limestone
    [211, 200, 174], // sandy flagstone
    [232, 223, 202], // bright sun-bleached cobble
    [198, 191, 172], // weathered sage limestone
    [218, 204, 178], // warm ochre-cream
  ];

  for (let j = 0; j < size; j++) {
    const v = j / size;
    const py = v * cells;
    const cy0 = Math.floor(py);
    for (let i = 0; i < size; i++) {
      const u = i / size;
      const px = u * cells;
      const cx0 = Math.floor(px);

      let d1 = 1e9, d2 = 1e9;
      let bestId = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const nx = ((cx0 + ox) % cells + cells) % cells;
          const ny = ((cy0 + oy) % cells + cells) % cells;
          const id = nx + ny * cells;
          let dx = ptsX[id] - px;
          let dy = ptsY[id] - py;
          if (dx > cells * 0.5) dx -= cells; else if (dx < -cells * 0.5) dx += cells;
          if (dy > cells * 0.5) dy -= cells; else if (dy < -cells * 0.5) dy += cells;
          const d = Math.hypot(dx, dy);
          if (d < d1) {
            d2 = d1;
            d1 = d;
            bestId = id;
          } else if (d < d2) {
            d2 = d;
          }
        }
      }

      // Edge distance between nearest two Voronoi cells defines mortar seam & stone bevel!
      const wobble = (tileNoise(u, v, 16, 71) - 0.5) * 0.028;
      const edge = Math.max(0, (d2 - d1) + wobble);
      const mortar = Math.min(1, Math.max(0, (edge - 0.032) / 0.068));
      const bevel = mortar * mortar * (3 - 2 * mortar);
      const grain = tileNoise(u, v, 24, 97) * 0.55 + tileNoise(u, v, 48, 131) * 0.45;
      const h = bevel * (0.72 + 0.16 * grain + 0.12 * cellTint[bestId]);
      flagH[i + j * size] = h;

      const pal = stonePalette[Math.floor(cellTint[bestId] * stonePalette.length) % stonePalette.length];
      const shade = 0.92 + 0.16 * grain;
      // Soft sunlit mossy olive-sand mortar between flagstones (Pine & Parcel harmony, never harsh black cracks)
      const mR = 148 + grain * 22;
      const mG = 152 + grain * 24;
      const mB = 118 + grain * 18;
      const sR = Math.min(255, pal[0] * shade);
      const sG = Math.min(255, pal[1] * shade);
      const sB = Math.min(255, pal[2] * shade);

      const p = (i + j * size) * 4;
      fImg.data[p] = Math.round(mR + (sR - mR) * bevel);
      fImg.data[p + 1] = Math.round(mG + (sG - mG) * bevel);
      fImg.data[p + 2] = Math.round(mB + (sB - mB) * bevel);
      // Pack stone height in alpha for organic height-blended path edges
      fImg.data[p + 3] = Math.round(Math.min(255, Math.max(0, h * 255)));
    }
  }
  fg.putImageData(fImg, 0, 0);
  const flagstoneAlbedo = new THREE.CanvasTexture(flagCanvas);
  flagstoneAlbedo.colorSpace = THREE.SRGBColorSpace;
  flagstoneAlbedo.wrapS = flagstoneAlbedo.wrapT = THREE.RepeatWrapping;
  flagstoneAlbedo.anisotropy = 8;
  const flagstoneNormal = buildNormalTexture(flagH, size, 3.6);

  // --- 2. Painterly Meadow Turf & Micro-Clover ---
  const turfCanvas = document.createElement('canvas');
  turfCanvas.width = turfCanvas.height = size;
  const tg = turfCanvas.getContext('2d')!;
  const tImg = tg.createImageData(size, size);
  const turfH = new Float32Array(size * size);

  for (let j = 0; j < size; j++) {
    const v = j / size;
    for (let i = 0; i < size; i++) {
      const u = i / size;
      const broad = tileNoise(u, v, 6, 17);
      const tufts = tileNoise(u, v, 18, 43);
      const blades = tileNoise(u, v, 40, 89);
      const fine = tileNoise(u, v, 72, 157);
      const h = 0.40 * tufts + 0.38 * blades + 0.22 * fine;
      turfH[i + j * size] = h;

      // Neutral-centered painterly modulation around white (0.86..1.14) so vertex colors remain true & luminous!
      const warmSun = Math.max(0, broad - 0.52) * 0.45;
      const val = 0.86 + 0.24 * h;
      let r = Math.min(255, Math.round((val + warmSun * 0.16) * 238));
      let gCol = Math.min(255, Math.round((val + warmSun * 0.12) * 246));
      let b = Math.min(255, Math.round((val - warmSun * 0.14) * 232));

      // Tiny pale clover/daisy flecks scattered subtly across the meadow
      const clover = hash2(Math.floor(u * 44), Math.floor(v * 44), 211);
      if (clover > 0.968 && blades > 0.55) {
        r = Math.min(255, r + 28);
        gCol = Math.min(255, gCol + 26);
        b = Math.min(255, b + 16);
      }

      const p = (i + j * size) * 4;
      tImg.data[p] = r;
      tImg.data[p + 1] = gCol;
      tImg.data[p + 2] = b;
      tImg.data[p + 3] = 255;
    }
  }
  tg.putImageData(tImg, 0, 0);
  const turfAlbedo = new THREE.CanvasTexture(turfCanvas);
  turfAlbedo.colorSpace = THREE.SRGBColorSpace;
  turfAlbedo.wrapS = turfAlbedo.wrapT = THREE.RepeatWrapping;
  turfAlbedo.anisotropy = 8;
  const turfNormal = buildNormalTexture(turfH, size, 1.8);

  // --- 3. Warm Speckled Coastal Beach Sand with Ripples ---
  const sandCanvas = document.createElement('canvas');
  sandCanvas.width = sandCanvas.height = size;
  const sg = sandCanvas.getContext('2d')!;
  const sImg = sg.createImageData(size, size);
  const sandH = new Float32Array(size * size);

  for (let j = 0; j < size; j++) {
    const v = j / size;
    for (let i = 0; i < size; i++) {
      const u = i / size;
      const ripple = 0.5 + 0.5 * Math.sin((u * 6 + v * 3) * Math.PI * 2 + tileNoise(u, v, 8, 101) * 2.2);
      const pebble = tileNoise(u, v, 28, 173);
      const grain = tileNoise(u, v, 64, 227);
      const h = 0.35 * ripple + 0.35 * pebble + 0.30 * grain;
      sandH[i + j * size] = h;

      const shade = 0.90 + 0.16 * h;
      let r = Math.min(255, Math.round(238 * shade));
      let gCol = Math.min(255, Math.round(224 * shade));
      let b = Math.min(255, Math.round(186 * shade));
      // Subtle mineral & shell speckles in sand (like Pine & Parcel beach!)
      const speck = hash2(i, j, 307);
      if (speck > 0.96) { r -= 32; gCol -= 34; b -= 30; }
      else if (speck < 0.025) { r = Math.min(255, r + 18); gCol = Math.min(255, gCol + 16); b = Math.min(255, b + 14); }

      const p = (i + j * size) * 4;
      sImg.data[p] = r;
      sImg.data[p + 1] = gCol;
      sImg.data[p + 2] = b;
      sImg.data[p + 3] = 255;
    }
  }
  sg.putImageData(sImg, 0, 0);
  const sandAlbedo = new THREE.CanvasTexture(sandCanvas);
  sandAlbedo.colorSpace = THREE.SRGBColorSpace;
  sandAlbedo.wrapS = sandAlbedo.wrapT = THREE.RepeatWrapping;
  sandAlbedo.anisotropy = 8;
  const sandNormal = buildNormalTexture(sandH, size, 1.45);

  cachedTextures = {
    flagstoneAlbedo,
    flagstoneNormal,
    turfAlbedo,
    turfNormal,
    sandAlbedo,
    sandNormal,
  };
  return cachedTextures;
}
