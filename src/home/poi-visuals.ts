import type {SpawnedPackModel} from './model-pack';
import {climateMaterial} from './climate-material';

/**
 * Clean, zero-Z-fighting procedural 3D models for all interactive Home POIs & farm beds.
 * Every adjacent box/cylinder has strictly separated bounds so no coplanar faces ever overlap.
 */
export function buildProceduralFacility(T: any, kind: string): SpawnedPackModel {
  const group = new T.Group();
  group.name = `home-${kind}`;
  const mat = (color: number, roughness = 0.82, extra: Record<string, any> = {}, climate = true) => {
    const m = new T.MeshStandardMaterial({color, roughness, ...extra});
    if (climate && !extra.transparent && !extra.emissive) climateMaterial(m, 'structure');
    return m;
  };
  const stone = mat(0xcfc8b8, 0.88);
  const darkStone = mat(0x7e8782, 0.88);
  const wood = mat(0x966b44, 0.82);
  const darkWood = mat(0x6b4a2e, 0.85);
  const tile = mat(0x4f665f, 0.78);
  const red = mat(0xa63f32, 0.72);
  const cream = mat(0xf0e9d9, 0.86);
  const waterMat = mat(0x52c7e8, 0.22, {metalness: 0.1, emissive: 0x164a63, emissiveIntensity: 0.35}, false);
  const gold = mat(0xe6b85c, 0.35, {metalness: 0.35, emissive: 0x5a3e0d, emissiveIntensity: 0.25}, false);

  const add = (geo: any, m: any, x: number, y: number, z: number, name?: string) => {
    const mesh = new T.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (name) mesh.name = name;
    group.add(mesh);
    return mesh;
  };

  if (kind === 'procedural-farm-wood' || kind === 'procedural-farm-stone' || kind === 'procedural-farm-large') {
    const isStone = kind === 'procedural-farm-stone';
    const isLarge = kind === 'procedural-farm-large';
    const w = isLarge ? 4.8 : isStone ? 3.4 : 2.6;
    const d = isLarge ? 2.9 : isStone ? 2.3 : 1.9;
    const h = isStone ? 0.36 : 0.32;
    const t = isStone ? 0.16 : 0.12;
    const rimMat = isStone ? mat(0xb8b2a6, 0.88) : mat(isLarge ? 0x7d5836 : 0x996d46, 0.82);
    const postMat = isStone ? mat(0x969084, 0.86) : darkWood;
    const wallH = h + 0.06, wallY = wallH * 0.5 - 0.06, innerD = d - t * 2;
    add(new T.BoxGeometry(w, wallH, t), rimMat, 0, wallY, d * 0.5 - t * 0.5);
    add(new T.BoxGeometry(w, wallH, t), rimMat, 0, wallY, -d * 0.5 + t * 0.5);
    add(new T.BoxGeometry(t, wallH, innerD), rimMat, -w * 0.5 + t * 0.5, wallY, 0);
    add(new T.BoxGeometry(t, wallH, innerD), rimMat, w * 0.5 - t * 0.5, wallY, 0);
    const capSize = t + 0.05, capH = wallH + 0.04;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      add(new T.BoxGeometry(capSize, capH, capSize), postMat, sx * (w * 0.5 - t * 0.45), capH * 0.5 - 0.06, sz * (d * 0.5 - t * 0.45));
    }
    const baseSoil = add(new T.BoxGeometry(w - t * 2 - 0.02, Math.max(0.08, h - 0.08), d - t * 2 - 0.02), mat(0x5c4430, 0.96), 0, (h - 0.08) * 0.5 - 0.02, 0);
    baseSoil.castShadow = false;
    return {group, dispose: () => group.removeFromParent()};
  }

  if (kind === 'procedural-fountain') {
    add(new T.CylinderGeometry(0.82, 0.92, 0.42, 16), stone, 0, 0.21, 0);
    add(new T.CylinderGeometry(0.68, 0.68, 0.06, 16), waterMat, 0, 0.45, 0);
    add(new T.CylinderGeometry(0.18, 0.24, 0.72, 12), stone, 0, 0.84, 0);
    add(new T.OctahedronGeometry(0.24, 0), waterMat, 0, 1.42, 0, 'spin-crystal');
  } else if (kind === 'procedural-pedestal') {
    add(new T.BoxGeometry(1.1, 0.24, 1.1), stone, 0, 0.12, 0);
    add(new T.CylinderGeometry(0.32, 0.38, 0.80, 8), stone, 0, 0.64, 0);
    add(new T.BoxGeometry(0.86, 0.12, 0.86), wood, 0, 1.10, 0);
    add(new T.OctahedronGeometry(0.22, 1), gold, 0, 1.46, 0, 'spin-crystal');
  } else if (kind === 'procedural-keg') {
    // Artisan Fermentation Keg on wooden cradle
    add(new T.BoxGeometry(0.95, 0.16, 0.95), darkWood, 0, 0.08, 0);
    add(new T.CylinderGeometry(0.46, 0.42, 0.96, 14), wood, 0, 0.64, 0);
    add(new T.TorusGeometry(0.46, 0.035, 6, 16).rotateX(Math.PI / 2), darkStone, 0, 0.36, 0);
    add(new T.TorusGeometry(0.47, 0.035, 6, 16).rotateX(Math.PI / 2), darkStone, 0, 0.92, 0);
    add(new T.CylinderGeometry(0.12, 0.14, 0.12, 10), gold, 0, 1.18, 0, 'spin-crystal');
  } else if (kind === 'procedural-kiln') {
    // Storybook Brick Baking Kiln & Smoker
    add(new T.BoxGeometry(2.1, 0.72, 1.65), stone, 0, 0.36, 0);
    add(new T.SphereGeometry(0.82, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xb85d40, 0.85), -0.18, 0.72, 0);
    add(new T.BoxGeometry(0.48, 0.44, 0.12), mat(0xff8c3a, 0.3, {emissive: 0xff6b22, emissiveIntensity: 0.95}, false), -0.18, 0.95, 0.78);
    add(new T.CylinderGeometry(0.20, 0.24, 1.1, 10), darkStone, 0.68, 1.27, -0.35);
    add(new T.CylinderGeometry(0.28, 0.24, 0.12, 10), tile, 0.68, 1.88, -0.35);
  } else if (kind === 'procedural-beehive') {
    // Tiered Wooden Beehive with pitched tile roof
    for (const sx of [-0.36, 0.36]) for (const sz of [-0.36, 0.36]) {
      add(new T.BoxGeometry(0.10, 0.34, 0.10), darkWood, sx, 0.17, sz);
    }
    add(new T.BoxGeometry(0.92, 0.52, 0.92), mat(0xd8a852, 0.82), 0, 0.60, 0);
    add(new T.BoxGeometry(0.98, 0.08, 0.98), darkWood, 0, 0.90, 0);
    add(new T.ConeGeometry(0.76, 0.38, 4).rotateY(Math.PI / 4), tile, 0, 1.13, 0);
    add(new T.OctahedronGeometry(0.12, 0), gold, 0, 1.46, 0, 'spin-crystal');
  } else if (kind === 'procedural-preserver') {
    // Glazed Celadon Aging Jar on stone stand
    add(new T.CylinderGeometry(0.62, 0.68, 0.20, 14), stone, 0, 0.10, 0);
    add(new T.CylinderGeometry(0.44, 0.50, 0.76, 14), mat(0x74a395, 0.35, {metalness: 0.12}), 0, 0.58, 0);
    add(new T.CylinderGeometry(0.48, 0.48, 0.10, 14), darkWood, 0, 1.01, 0);
    add(new T.SphereGeometry(0.11, 8, 8), gold, 0, 1.14, 0, 'spin-crystal');
  } else if (kind === 'procedural-loom') {
    // Wooden Textile Loom with colored silk warp
    add(new T.BoxGeometry(1.75, 0.14, 1.15), darkWood, 0, 0.07, 0);
    for (const sx of [-0.76, 0.76]) add(new T.BoxGeometry(0.14, 1.38, 0.16), wood, sx, 0.83, -0.35);
    add(new T.BoxGeometry(1.66, 0.14, 0.18), darkWood, 0, 1.56, -0.35);
    add(new T.BoxGeometry(1.24, 0.06, 0.82), mat(0xe3b8c8, 0.7), 0, 0.76, 0.06);
  } else if (kind === 'procedural-hotspring') {
    // Steaming Stone Hot Spring Basin (separated rim walls + lower water sheet, zero overlap!)
    const w = 3.4, d = 3.0, t = 0.38, h = 0.56;
    add(new T.BoxGeometry(w, h, t), darkStone, 0, h * 0.5, d * 0.5 - t * 0.5);
    add(new T.BoxGeometry(w, h, t), darkStone, 0, h * 0.5, -d * 0.5 + t * 0.5);
    add(new T.BoxGeometry(t, h, d - t * 2), darkStone, -w * 0.5 + t * 0.5, h * 0.5, 0);
    add(new T.BoxGeometry(t, h, d - t * 2), darkStone, w * 0.5 - t * 0.5, h * 0.5, 0);
    add(new T.BoxGeometry(w - t * 2 - 0.04, 0.16, d - t * 2 - 0.04), mat(0x63d6e8, 0.15, {emissive: 0x26798f, emissiveIntensity: 0.45}, false), 0, 0.38, 0);
    // Bamboo spout rock
    add(new T.DodecahedronGeometry(0.42, 0), stone, -1.25, 0.65, -1.05);
    add(new T.CylinderGeometry(0.06, 0.07, 0.72, 8).rotateZ(-Math.PI / 3), mat(0x6ea655, 0.75), -0.95, 0.78, -0.85);
  } else if (kind === 'procedural-observatory') {
    // Astronomical Observatory Dome & Brass Telescope
    add(new T.CylinderGeometry(1.18, 1.28, 0.32, 16), stone, 0, 0.16, 0);
    add(new T.CylinderGeometry(1.02, 1.08, 1.65, 16), cream, 0, 1.15, 0);
    add(new T.SphereGeometry(1.04, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), mat(0x4b6a7a, 0.42, {metalness: 0.28}), 0, 1.98, 0);
    const tube = add(new T.CylinderGeometry(0.14, 0.19, 1.45, 10), gold, 0.52, 2.55, 0.45);
    tube.rotation.set(0.55, 0, -0.62);
    add(new T.OctahedronGeometry(0.18, 0), mat(0xa8f5ff, 0.2, {emissive: 0x56c7e6, emissiveIntensity: 0.9}, false), 0, 3.16, 0, 'spin-crystal');
  } else if (kind === 'procedural-glider-tower') {
    // Hot Air Balloon Launch Platform
    add(new T.CylinderGeometry(1.18, 1.26, 0.28, 14), wood, 0, 0.14, 0);
    for (const ang of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      add(new T.CylinderGeometry(0.04, 0.04, 1.5, 6), darkWood, Math.cos(ang) * 0.62, 1.03, Math.sin(ang) * 0.62);
    }
    add(new T.SphereGeometry(1.02, 16, 12), red, 0, 2.72, 0);
    add(new T.TorusGeometry(0.95, 0.07, 6, 16).rotateX(Math.PI / 2), gold, 0, 2.72, 0);
    add(new T.SphereGeometry(0.24, 10, 8), mat(0xffa43b, 0.3, {emissive: 0xff7b22, emissiveIntensity: 1.0}, false), 0, 1.52, 0, 'spin-crystal');
  } else if (kind === 'procedural-waystone') {
    // Fast-travel Wind Chime Pillar
    add(new T.BoxGeometry(0.92, 0.24, 0.92), stone, 0, 0.12, 0);
    add(new T.CylinderGeometry(0.14, 0.18, 1.92, 10), red, 0, 1.20, 0);
    add(new T.BoxGeometry(1.06, 0.12, 0.22), darkWood, 0, 2.18, 0);
    add(new T.ConeGeometry(0.24, 0.34, 8), mat(0x7be0c3, 0.25, {emissive: 0x39a88e, emissiveIntensity: 0.85}, false), 0, 1.82, 0, 'spin-crystal');
  } else if (kind === 'procedural-museum') {
    // Time Museum Courtyard Pavilion Altar
    add(new T.BoxGeometry(2.4, 0.28, 1.9), stone, 0, 0.14, 0);
    for (const sx of [-0.95, 0.95]) for (const sz of [-0.72, 0.72]) {
      add(new T.CylinderGeometry(0.09, 0.10, 1.48, 8), red, sx, 1.02, sz);
    }
    add(new T.BoxGeometry(2.55, 0.14, 2.05), darkWood, 0, 1.83, 0);
    add(new T.ConeGeometry(1.75, 0.56, 4).rotateY(Math.PI / 4), tile, 0, 2.18, 0);
    add(new T.OctahedronGeometry(0.28, 1), gold, 0, 1.06, 0, 'spin-crystal');
  } else if (kind === 'procedural-coop') {
    // Cozy Small-Animal Coop
    add(new T.BoxGeometry(2.9, 0.20, 2.3), darkWood, 0, 0.10, 0);
    add(new T.BoxGeometry(2.5, 1.25, 1.95), cream, 0, 0.825, 0);
    add(new T.BoxGeometry(0.68, 0.78, 0.08), darkWood, 0, 0.59, 0.99);
    add(new T.ConeGeometry(2.05, 0.82, 4).rotateY(Math.PI / 4), tile, 0, 1.86, 0);
  } else if (kind === 'procedural-barn') {
    // Open-sided Deer & Spirit Animal Barn
    add(new T.BoxGeometry(4.1, 0.22, 3.1), stone, 0, 0.11, 0);
    for (const sx of [-1.85, 1.85]) for (const sz of [-1.35, 1.35]) {
      add(new T.BoxGeometry(0.22, 1.92, 0.22), darkWood, sx, 1.18, sz);
    }
    add(new T.BoxGeometry(3.5, 1.65, 0.20), wood, 0, 1.04, -1.35);
    add(new T.BoxGeometry(4.35, 0.16, 3.35), darkWood, 0, 2.22, 0);
    add(new T.ConeGeometry(2.95, 0.95, 4).rotateY(Math.PI / 4), red, 0, 2.78, 0);
  } else if (kind === 'procedural-fishpond') {
    // Ecological Fish Pond (separated stone embankment + depressed water plane)
    const w = 3.6, d = 3.0, t = 0.34, h = 0.46;
    add(new T.BoxGeometry(w, h, t), stone, 0, h * 0.5, d * 0.5 - t * 0.5);
    add(new T.BoxGeometry(w, h, t), stone, 0, h * 0.5, -d * 0.5 + t * 0.5);
    add(new T.BoxGeometry(t, h, d - t * 2), stone, -w * 0.5 + t * 0.5, h * 0.5, 0);
    add(new T.BoxGeometry(t, h, d - t * 2), stone, w * 0.5 - t * 0.5, h * 0.5, 0);
    add(new T.BoxGeometry(w - t * 2 - 0.04, 0.14, d - t * 2 - 0.04), waterMat, 0, 0.32, 0);
    add(new T.BoxGeometry(0.55, 0.52, 0.42), wood, -1.3, 0.58, 1.15);
  } else {
    // procedural-flowerbed
    add(new T.BoxGeometry(2.2, 0.36, 1.4), wood, 0, 0.18, 0);
    add(new T.BoxGeometry(1.96, 0.08, 1.16), mat(0x6b4e35, 0.95), 0, 0.40, 0);
    const colors = [0xff8fab, 0xffd166, 0xa8dadc, 0xc77dff, 0xff9f1c];
    for (let i = 0; i < 10; i++) {
      const fx = -0.78 + (i % 5) * 0.39, fz = i < 5 ? -0.30 : 0.30;
      add(new T.CylinderGeometry(0.02, 0.025, 0.20, 5), mat(0x5c9e54, 0.85), fx, 0.54, fz);
      add(new T.DodecahedronGeometry(0.11, 0), mat(colors[i % colors.length], 0.5), fx, 0.70, fz);
    }
  }
  return {group, dispose: () => group.removeFromParent()};
}
