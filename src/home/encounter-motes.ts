import {
  BufferAttribute, BufferGeometry, CanvasTexture, Color, Points, PointsMaterial, SRGBColorSpace,
} from 'three';
import type { RanchTier } from '../life/ranch';

const colors = { common: 0xf5c283, rare: 0x98e3c7, legendary: 0xffcf65 };
const counts = { common: 2, rare: 3, legendary: 4 };

export function makeMoteTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
  glow.addColorStop(0, 'rgba(255,249,218,1)');
  glow.addColorStop(.19, 'rgba(255,246,212,.9)');
  glow.addColorStop(.45, 'rgba(255,235,194,.32)');
  glow.addColorStop(1, 'rgba(255,230,175,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0,0,64,64);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function makeEncounterMotes(tier: RanchTier, size: number, phase: number, map: CanvasTexture) {
  const count = counts[tier];
  const geometry = new BufferGeometry();
  const positions = new BufferAttribute(new Float32Array(count * 3), 3);
  geometry.setAttribute('position', positions);
  const material = new PointsMaterial({ color: new Color(colors[tier]), map, size: .12 + size * .045,
    opacity: .82, transparent: true, depthWrite: false, depthTest: true, toneMapped: false });
  const points = new Points(geometry, material);
  points.name = 'wild-encounter-motes';
  points.frustumCulled = false;
  points.layers.set(1);
  let opacity = material.opacity;
  return {
    points,
    update(time: number, dt: number, distance: number) {
      const t = time + phase;
      // Visible across the clearing, then dissolve before the player reaches the animal.
      const target = .84 * Math.min(1, Math.max(0, (distance - 2.65) / 2.5));
      opacity += (target - opacity) * (1 - Math.exp(-6 * dt));
      material.opacity = opacity;
      points.visible = opacity > .012;
      for (let i = 0; i < count; i++) {
        const k = t * (.62 + i * .095) + 2.4 * i;
        positions.setXYZ(i, (i % 2 ? -1 : 1) * size * (.25 + .10 * Math.sin(k)),
          size * (.48 + .12 * i) + .07 * Math.sin(1.3 * k), -size * (.24 + .12 * Math.cos(.83 * k + i)));
      }
      positions.needsUpdate = true;
    },
    dispose() { points.removeFromParent(); geometry.dispose(); material.dispose(); },
  };
}

