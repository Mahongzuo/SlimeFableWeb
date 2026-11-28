import * as THREE from 'three';

export interface FoliageAtlasBundle {
  map: THREE.Texture;
}

let cachedAtlas: FoliageAtlasBundle | null = null;

function makeRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

/**
 * Generates a 1024x1024 procedural foliage alpha-cutout atlas:
 * - Q0 [0..0.5, 0.5..1]: Broadleaf tree sprig clusters
 * - Q1 [0.5..1, 0.5..1]: Pine needle bough fans
 * - Q2 [0..0.5, 0..0.5]: Graceful Jiangnan bamboo leaf fronds
 *
 * Uses alpha-bleed dilation (green RGB painted into transparent texels) so mipmaps never get dark halos.
 */
export function getFoliageAtlas(): FoliageAtlasBundle {
  if (cachedAtlas) return cachedAtlas;

  if (typeof document === 'undefined') {
    const tex = new THREE.DataTexture(new Uint8Array([140, 185, 110, 255]), 1, 1, THREE.RGBAFormat);
    tex.needsUpdate = true;
    cachedAtlas = {map: tex};
    return cachedAtlas;
  }

  const S = 1024;
  const H = S / 2;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, S, S);

  const rand = makeRng(20261126);

  // Helper: draw one pointed botanical leaf
  const drawLeaf = (cx: number, cy: number, len: number, wid: number, angle: number, col: string, vein: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(len * 0.28, -wid, len * 0.72, -wid * 0.78, len, 0);
    ctx.bezierCurveTo(len * 0.72, wid * 0.78, len * 0.28, wid, 0, 0);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = vein;
    ctx.lineWidth = Math.max(1.2, wid * 0.14);
    ctx.beginPath();
    ctx.moveTo(len * 0.08, 0);
    ctx.lineTo(len * 0.86, 0);
    ctx.stroke();
    ctx.restore();
  };

  // --- Quadrant 0 (Top-Left in canvas => UV x:[0..0.5], y:[0.5..1]): Broadleaf Canopy Cluster ---
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, H, H);
  ctx.clip();
  // Soft woody twig skeleton
  ctx.strokeStyle = '#5c4b36';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(H * 0.5, H * 0.92);
  ctx.quadraticCurveTo(H * 0.48, H * 0.55, H * 0.5, H * 0.16);
  ctx.stroke();
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + (rand() - 0.5) * 0.35;
    const rad = Math.pow(rand(), 0.62) * H * 0.34;
    const lx = H * 0.5 + Math.cos(a) * rad;
    const ly = H * 0.5 + Math.sin(a) * rad;
    const len = 54 + rand() * 44;
    const wid = 20 + rand() * 14;
    const luma = 0.72 + (rad / (H * 0.36)) * 0.34 + (rand() - 0.5) * 0.14;
    const r = Math.min(255, Math.round(138 * luma));
    const g = Math.min(255, Math.round(188 * luma));
    const b = Math.min(255, Math.round(112 * luma));
    drawLeaf(lx, ly, len, wid, a + (rand() - 0.5) * 0.5, `rgb(${r},${g},${b})`, `rgba(${Math.min(255, r + 26)},${Math.min(255, g + 26)},${Math.min(255, b + 14)},0.55)`);
  }
  ctx.restore();

  // --- Quadrant 1 (Top-Right in canvas => UV x:[0.5..1], y:[0.5..1]): Pine Needle Boughs ---
  ctx.save();
  ctx.translate(H, 0);
  ctx.beginPath();
  ctx.rect(0, 0, H, H);
  ctx.clip();
  ctx.strokeStyle = '#554130';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(H * 0.5, H * 0.94);
  ctx.lineTo(H * 0.5, H * 0.18);
  ctx.stroke();
  for (let bough = 0; bough < 11; bough++) {
    const t = bough / 10;
    const bx = H * 0.5 + (rand() - 0.5) * 24;
    const by = H * (0.82 - t * 0.64);
    for (const side of [-1, 1]) {
      const baseAng = side * (0.35 + (1 - t) * 0.55) - Math.PI * 0.5;
      const spread = 120 * (0.55 + (1 - t) * 0.55);
      const ex = bx + Math.cos(baseAng) * spread;
      const ey = by + Math.sin(baseAng) * spread;
      ctx.strokeStyle = '#5f4935';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      for (let n = 0; n < 34; n++) {
        const nt = n / 33;
        const nx = bx + (ex - bx) * nt;
        const ny = by + (ey - by) * nt;
        const nAng = baseAng + (rand() - 0.5) * 1.45;
        const nLen = 28 + rand() * 32;
        const shade = 0.72 + nt * 0.34 + (rand() - 0.5) * 0.12;
        ctx.strokeStyle = `rgb(${Math.round(92 * shade)},${Math.round(145 * shade)},${Math.round(104 * shade)})`;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(nx + Math.cos(nAng) * nLen, ny + Math.sin(nAng) * nLen);
        ctx.stroke();
      }
    }
  }
  ctx.restore();

  // --- Quadrant 2 (Bottom-Left in canvas => UV x:[0..0.5], y:[0..0.5]): Bamboo Leaf Fronds ---
  ctx.save();
  ctx.translate(0, H);
  ctx.beginPath();
  ctx.rect(0, 0, H, H);
  ctx.clip();
  ctx.strokeStyle = '#6c7c46';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(H * 0.08, H * 0.25);
  ctx.quadraticCurveTo(H * 0.45, H * 0.28, H * 0.88, H * 0.62);
  ctx.stroke();
  for (let cluster = 0; cluster < 9; cluster++) {
    const t = 0.14 + (cluster / 8) * 0.76;
    const cx = H * (0.08 + t * 0.80);
    const cy = H * (0.25 + t * t * 0.36);
    const leavesInFan = 5 + Math.floor(rand() * 3);
    for (let k = 0; k < leavesInFan; k++) {
      const fanAng = 0.45 + (k / (leavesInFan - 1) - 0.5) * 1.25 + (rand() - 0.5) * 0.18;
      const len = 95 + rand() * 68;
      const wid = 9.5 + rand() * 5.0;
      const sh = 0.76 + (1 - Math.abs(k / leavesInFan - 0.5)) * 0.28 + (rand() - 0.5) * 0.12;
      drawLeaf(
        cx,
        cy,
        len,
        wid,
        fanAng,
        `rgb(${Math.round(126 * sh)},${Math.round(176 * sh)},${Math.round(98 * sh)})`,
        `rgba(${Math.round(170 * sh)},${Math.round(212 * sh)},${Math.round(128 * sh)},0.65)`,
      );
    }
  }
  ctx.restore();

  // RGB color dilation into alpha==0 pixels to prevent black mipmap fringes
  const img = ctx.getImageData(0, 0, S, S);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) {
      d[i] = 112;
      d[i + 1] = 158;
      d[i + 2] = 92;
    }
  }
  ctx.putImageData(img, 0, 0);

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  map.needsUpdate = true;
  cachedAtlas = {map};
  return cachedAtlas;
}
