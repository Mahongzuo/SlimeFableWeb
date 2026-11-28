import type {MarineModels} from './marine-models';
import * as THREE from 'three';
import {SEA_LEVEL} from './layout';
import type {ExpandedTile} from '../life/state';
import {coastalSeabedHeightAt, collectTerritoryRects, territoryBoxSDF} from '../world/island-coast';
import {spawnSimPondActor, type SimPondActorHandle, type SimPondSpeciesId} from './simpond-assets';

export type MarineZoneId = 'shallow' | 'twilight' | 'abyss';
export type MarineSpeciesId =
  | 'clownfish'
  | 'blue-tang'
  | 'sea-turtle'
  | 'moon-jelly'
  | 'manta-ray'
  | 'reef-squid'
  | 'lantern-fish'
  | 'abyss-jelly'
  | 'oarfish';

export interface MarineSpeciesDef {
  id: MarineSpeciesId;
  name: string;
  zone: MarineZoneId;
  minDepth: number;
  maxDepth: number;
  speed: number;
  scale: [number, number];
  glow?: boolean;
}

export const MARINE_ZONES: Record<MarineZoneId, {label: string; minDepth: number; maxDepth: number}> = {
  shallow: {label: '阳光浅海', minDepth: 0.4, maxDepth: 3.6},
  twilight: {label: '珊瑚中层', minDepth: 3.6, maxDepth: 8.0},
  abyss: {label: '幽蓝深海', minDepth: 8.0, maxDepth: 16.0},
};

export const MARINE_SPECIES: MarineSpeciesDef[] = [
  {id: 'clownfish', name: '珊瑚小丑鱼', zone: 'shallow', minDepth: 0.5, maxDepth: 4.0, speed: 1.55, scale: [0.55, 0.85]},
  {id: 'blue-tang', name: '碧波蓝倒吊', zone: 'shallow', minDepth: 0.6, maxDepth: 4.5, speed: 1.75, scale: [0.65, 0.95]},
  {id: 'sea-turtle', name: '悠游绿海龟', zone: 'shallow', minDepth: 1.0, maxDepth: 6.2, speed: 1.15, scale: [0.95, 1.35]},
  {id: 'moon-jelly', name: '荧光海月水母', zone: 'twilight', minDepth: 2.6, maxDepth: 9.2, speed: 0.55, scale: [0.85, 1.25], glow: true},
  {id: 'manta-ray', name: '云翼蝠鲼', zone: 'twilight', minDepth: 3.2, maxDepth: 10.5, speed: 1.35, scale: [1.15, 1.65]},
  {id: 'reef-squid', name: '流光海鱿', zone: 'twilight', minDepth: 4.0, maxDepth: 11.5, speed: 1.45, scale: [0.85, 1.15], glow: true},
  {id: 'lantern-fish', name: '深海灯笼鱼', zone: 'abyss', minDepth: 6.5, maxDepth: 16.0, speed: 1.05, scale: [0.95, 1.35], glow: true},
  {id: 'abyss-jelly', name: '幽蓝巨水母', zone: 'abyss', minDepth: 7.2, maxDepth: 16.0, speed: 0.45, scale: [1.25, 1.80], glow: true},
  {id: 'oarfish', name: '银带深海鱼', zone: 'abyss', minDepth: 8.0, maxDepth: 16.0, speed: 1.25, scale: [1.15, 1.55], glow: true},
];

/** Classifies underwater depth (metres below SEA_LEVEL) into an ecological stratum. */
export function marineZoneForDepth(depth: number): {id: MarineZoneId; label: string; candidates: MarineSpeciesDef[]} {
  const d = Math.max(0, depth);
  const id: MarineZoneId = d < 3.6 ? 'shallow' : d < 8.0 ? 'twilight' : 'abyss';
  const candidates = MARINE_SPECIES.filter(s => d >= s.minDepth - 0.6 && d <= s.maxDepth + 1.0);
  return {
    id,
    label: MARINE_ZONES[id].label,
    candidates: candidates.length ? candidates : MARINE_SPECIES.filter(s => s.zone === id),
  };
}

/** Picks a species weighted toward the slime's exact current depth below the water surface. */
export function pickSpeciesForDepth(depth: number, rand: () => number): MarineSpeciesDef {
  const {candidates} = marineZoneForDepth(depth);
  let total = 0;
  const weights = candidates.map(s => {
    const mid = (s.minDepth + s.maxDepth) * 0.5;
    const half = Math.max(1, (s.maxDepth - s.minDepth) * 0.5);
    const closeness = Math.max(0.15, 1 - Math.abs(depth - mid) / (half * 1.4));
    total += closeness;
    return closeness;
  });
  let r = rand() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

interface MarineActor {
  species: MarineSpeciesDef;
  group: THREE.Group;
  tail?: THREE.Object3D;
  leftWing?: THREE.Object3D;
  rightWing?: THREE.Object3D;
  bell?: THREE.Object3D;
  simpond?: SimPondActorHandle;
  sourceFish?: ReturnType<MarineModels['fish']>;
  fleeBoost?: number;
  centerX: number;
  centerZ: number;
  baseY: number;
  radius: number;
  phase: number;
  dir: number;
  scale: number;
  procedural: boolean;
}

const MARINE_FISH_GLB: Partial<Record<MarineSpeciesId, readonly SimPondSpeciesId[]>> = {
  'clownfish': ['madai', 'kasago', 'aji'],
  'blue-tang': ['kurodai', 'saba', 'suzuki'],
};
let marineFishVariantIdx = 0;

function makeRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

/** Builds charming stylized multi-part 3D marine creatures (zero external assets required). */
function buildCreatureMesh(species: MarineSpeciesDef): {
  group: THREE.Group;
  tail?: THREE.Object3D;
  leftWing?: THREE.Object3D;
  rightWing?: THREE.Object3D;
  bell?: THREE.Object3D;
} {
  const g = new THREE.Group();
  g.name = `marine-${species.id}`;
  g.userData.walkThrough = true;

  const mat = (hex: number, opts: {emissive?: number; emissiveIntensity?: number; transparent?: boolean; opacity?: number; roughness?: number} = {}) =>
    new THREE.MeshStandardMaterial({
      color: hex,
      roughness: opts.roughness ?? 0.45,
      metalness: 0.04,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 0,
      transparent: !!opts.transparent,
      opacity: opts.opacity ?? 1,
      depthWrite: !opts.transparent,
    });

  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, parent: THREE.Object3D = g) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.layers.set(1);
    // Translucent sea life draws before the water surfaces so the refraction copy contains it
    if ((m as THREE.MeshStandardMaterial).transparent) mesh.renderOrder = -30;
    parent.add(mesh);
    return mesh;
  };

  if (species.id === 'clownfish' || species.id === 'blue-tang') {
    const isClown = species.id === 'clownfish';
    const bodyCol = isClown ? 0xff7836 : 0x2d7ef7;
    const accentCol = isClown ? 0xfff6e8 : 0xffdb4d;
    const body = add(new THREE.SphereGeometry(0.24, 12, 8), mat(bodyCol));
    body.scale.set(0.55, 0.78, 1.35);
    // Decorative stripe or yellow dorsal accent
    const band = add(new THREE.SphereGeometry(0.245, 10, 8), mat(accentCol), 0, isClown ? 0 : 0.08, isClown ? 0.02 : -0.05);
    band.scale.set(isClown ? 0.58 : 0.30, isClown ? 0.80 : 0.55, isClown ? 0.34 : 0.85);
    const tail = new THREE.Group();
    tail.position.set(0, 0, -0.30);
    g.add(tail);
    const fin = add(new THREE.ConeGeometry(0.16, 0.28, 4), mat(isClown ? 0xff924c : 0xffdb4d), 0, 0, -0.10, tail);
    fin.rotation.x = Math.PI / 2;
    fin.scale.set(0.32, 1, 1);
    for (const s of [-1, 1]) {
      add(new THREE.SphereGeometry(0.032, 6, 6), mat(0x162229), s * 0.10, 0.05, 0.20);
    }
    return {group: g, tail};
  }

  if (species.id === 'sea-turtle') {
    const shell = add(new THREE.SphereGeometry(0.42, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), mat(0x3f7f62, {roughness: 0.55}));
    shell.scale.set(0.92, 0.55, 1.15);
    const belly = add(new THREE.SphereGeometry(0.38, 10, 6), mat(0xd8cf9c), 0, -0.02, 0);
    belly.scale.set(0.88, 0.20, 1.08);
    const head = add(new THREE.SphereGeometry(0.14, 10, 8), mat(0x6da17e), 0, 0.04, 0.52);
    head.scale.set(0.85, 0.80, 1.18);
    for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.026, 6, 6), mat(0x142024), s * 0.08, 0.08, 0.60);
    const makeFlipper = (side: number) => {
      const piv = new THREE.Group();
      piv.position.set(side * 0.34, 0.02, 0.16);
      const blade = add(new THREE.BoxGeometry(0.46, 0.05, 0.18), mat(0x5c9674), side * 0.20, 0, -0.04, piv);
      blade.rotation.y = -side * 0.32;
      g.add(piv);
      return piv;
    };
    const leftWing = makeFlipper(-1);
    const rightWing = makeFlipper(1);
    // Rear flippers
    for (const s of [-1, 1]) {
      const rear = add(new THREE.BoxGeometry(0.22, 0.04, 0.12), mat(0x5c9674), s * 0.20, -0.02, -0.44);
      rear.rotation.y = s * 0.45;
    }
    return {group: g, leftWing, rightWing};
  }

  if (species.id === 'moon-jelly' || species.id === 'abyss-jelly') {
    const abyss = species.id === 'abyss-jelly';
    const bellCol = abyss ? 0x57d4ff : 0xbde8ff;
    const emiCol = abyss ? 0x1ea7ff : 0x6fd8ff;
    const bell = new THREE.Group();
    g.add(bell);
    const dome = add(
      new THREE.SphereGeometry(0.36, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
      mat(bellCol, {emissive: emiCol, emissiveIntensity: abyss ? 1.15 : 0.65, transparent: true, opacity: 0.76, roughness: 0.2}),
      0, 0, 0, bell,
    );
    (dome.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    dome.scale.y = 0.78;
    add(
      new THREE.SphereGeometry(0.18, 10, 8),
      mat(abyss ? 0xb47dff : 0xffc6e0, {emissive: abyss ? 0x8944ff : 0xff8bc4, emissiveIntensity: 0.9, transparent: true, opacity: 0.82}),
      0, 0.04, 0, bell,
    );
    const tentMat = mat(abyss ? 0x88e6ff : 0xdbf4ff, {emissive: emiCol, emissiveIntensity: 0.65, transparent: true, opacity: 0.65});
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      add(new THREE.CylinderGeometry(0.014, 0.004, abyss ? 0.95 : 0.65, 5), tentMat, Math.cos(a) * 0.16, -(abyss ? 0.46 : 0.30), Math.sin(a) * 0.16, g);
    }
    return {group: g, bell};
  }

  if (species.id === 'manta-ray') {
    const dark = mat(0x284966, {roughness: 0.4});
    const pale = mat(0xcfe4ee, {roughness: 0.5});
    const torso = add(new THREE.SphereGeometry(0.36, 12, 8), dark);
    torso.scale.set(1.0, 0.24, 1.45);
    const belly = add(new THREE.SphereGeometry(0.30, 10, 6), pale, 0, -0.05, 0.02);
    belly.scale.set(0.95, 0.16, 1.3);
    const makeWing = (side: number) => {
      const piv = new THREE.Group();
      piv.position.set(side * 0.25, 0, 0.05);
      const wing = add(new THREE.ConeGeometry(0.45, 0.95, 4), dark, side * 0.42, 0, -0.04, piv);
      wing.rotation.z = side * -Math.PI / 2;
      wing.scale.set(0.20, 1.0, 1.15);
      g.add(piv);
      return piv;
    };
    const leftWing = makeWing(-1);
    const rightWing = makeWing(1);
    const tail = new THREE.Group();
    tail.position.set(0, 0, -0.48);
    g.add(tail);
    const whip = add(new THREE.CylinderGeometry(0.025, 0.005, 0.85, 6), dark, 0, 0, -0.40, tail);
    whip.rotation.x = Math.PI / 2;
    return {group: g, tail, leftWing, rightWing};
  }

  if (species.id === 'reef-squid') {
    const mantle = add(new THREE.ConeGeometry(0.16, 0.56, 10), mat(0xd888b8, {emissive: 0x6a2e68, emissiveIntensity: 0.55}), 0, 0, -0.10);
    mantle.rotation.x = -Math.PI / 2;
    const fin = add(new THREE.ConeGeometry(0.22, 0.22, 4), mat(0xf2a8d2, {emissive: 0x803875, emissiveIntensity: 0.45}), 0, 0, -0.32);
    fin.rotation.x = -Math.PI / 2;
    fin.scale.set(1.2, 1.0, 0.22);
    const tail = new THREE.Group();
    tail.position.set(0, 0, 0.16);
    g.add(tail);
    const armMat = mat(0xf0b2d6, {emissive: 0x6a3266, emissiveIntensity: 0.5});
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const arm = add(new THREE.CylinderGeometry(0.018, 0.006, 0.42, 5), armMat, Math.cos(a) * 0.06, Math.sin(a) * 0.06, 0.20, tail);
      arm.rotation.x = Math.PI / 2;
    }
    return {group: g, tail};
  }

  if (species.id === 'oarfish') {
    const body = add(new THREE.BoxGeometry(0.10, 0.24, 1.45), mat(0xb8dcff, {emissive: 0x3b86cc, emissiveIntensity: 0.65, roughness: 0.22}));
    const crest = add(new THREE.BoxGeometry(0.04, 0.14, 1.38), mat(0xff6b7a, {emissive: 0xe63950, emissiveIntensity: 0.85}), 0, 0.16, -0.02);
    void body; void crest;
    const tail = new THREE.Group();
    tail.position.set(0, 0, -0.72);
    g.add(tail);
    add(new THREE.BoxGeometry(0.06, 0.18, 0.72), mat(0xa8d4ff, {emissive: 0x3578bd, emissiveIntensity: 0.65}), 0, 0, -0.34, tail);
    return {group: g, tail};
  }

  // Deep-sea bioluminescent lantern-fish
  const body = add(new THREE.SphereGeometry(0.24, 12, 8), mat(0x1f3557, {emissive: 0x10284c, emissiveIntensity: 0.55}));
  body.scale.set(0.75, 0.85, 1.25);
  // Glowing stalk + golden lure orb!
  const stalk = add(new THREE.CylinderGeometry(0.012, 0.012, 0.30, 5), mat(0x4a7ea8), 0, 0.20, 0.28);
  stalk.rotation.x = 0.65;
  add(new THREE.SphereGeometry(0.065, 10, 8), mat(0xfff08a, {emissive: 0xffd24d, emissiveIntensity: 2.2}), 0, 0.26, 0.42);
  // Bioluminescent flank spots
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      add(new THREE.SphereGeometry(0.026, 6, 6), mat(0x5ef2ff, {emissive: 0x35d9ff, emissiveIntensity: 1.8}), s * 0.17, -0.02, 0.12 - k * 0.12);
    }
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0, -0.28);
  g.add(tail);
  const fin = add(new THREE.ConeGeometry(0.15, 0.26, 4), mat(0x3a6e99, {emissive: 0x1e4a73, emissiveIntensity: 0.6}), 0, 0, -0.10, tail);
  fin.rotation.x = Math.PI / 2;
  fin.scale.set(0.28, 1, 1);
  return {group: g, tail};
}

/**
 * Manages both:
 * 1) Resident marine schools around the coastal shelf.
 * 2) Procedural depth-based marine creature spawning around the slime whenever diving underwater!
 */
export class OceanLifeSystem {
  readonly root: THREE.Group;
  private presetActors: MarineActor[] = [];
  private proceduralActors: MarineActor[] = [];
  private discovered = new Set<MarineSpeciesId>();
  private spawnRng = makeRng(40913);
  private spawnCooldown = 0;

  constructor(
    private scene: THREE.Scene,
    private models: MarineModels,
    private onDiscover?: (species: MarineSpeciesDef) => void,
  ) {
    this.root = new THREE.Group();
    this.root.name = 'ocean-marine-life';
    this.scene.add(this.root);
    this.buildPresetEcosystem([]);
  }

  get discoveredCount(): number {
    return this.discovered.size;
  }

  get activeCreatureCount(): number {
    return this.presetActors.length + this.proceduralActors.length;
  }

  /** Rebuilds resident marine schools around the current territory. */
  buildPresetEcosystem(expansions: ExpandedTile[] = []) {
    // Release the previous residents before rebuilding their territory.
    for (const a of this.presetActors) { a.sourceFish?.dispose(); a.simpond?.dispose(); a.group.removeFromParent(); }
    this.presetActors = [];

    const rects = collectTerritoryRects(expansions);
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (const r of rects) {
      minX = Math.min(minX, r.minX); minZ = Math.min(minZ, r.minZ);
      maxX = Math.max(maxX, r.maxX); maxZ = Math.max(maxZ, r.maxZ);
    }
    const pad = 62;
    const rand = makeRng(77123);

    // Preset resident marine creatures around the coastal reef & outer drop-off
    const presetPlan: MarineSpeciesId[] = [
      'clownfish', 'clownfish', 'clownfish', 'clownfish', 'clownfish',
      'blue-tang', 'blue-tang', 'blue-tang', 'blue-tang', 'blue-tang',
      'sea-turtle', 'sea-turtle', 'sea-turtle', 'sea-turtle',
      'moon-jelly', 'moon-jelly', 'moon-jelly', 'moon-jelly', 'moon-jelly', 'moon-jelly',
      'manta-ray', 'manta-ray', 'manta-ray', 'manta-ray',
      'lantern-fish', 'lantern-fish', 'lantern-fish', 'lantern-fish',
    ];

    for (const spId of presetPlan) {
      const species = MARINE_SPECIES.find(s => s.id === spId)!;
      for (let tries = 0; tries < 80; tries++) {
        const x = minX - pad + rand() * (maxX - minX + pad * 2);
        const z = minZ - pad + rand() * (maxZ - minZ + pad * 2);
        const dBox = territoryBoxSDF(x, z, rects);
        if (dBox < 10) continue;
        const bedY = coastalSeabedHeightAt(x, z, expansions);
        const waterDepth = SEA_LEVEL - bedY;
        if (waterDepth < species.minDepth + 0.45) continue;
        const targetDepth = Math.min(waterDepth - 0.45, species.minDepth + rand() * Math.max(0.5, Math.min(waterDepth - 0.5, species.maxDepth) - species.minDepth));
        const y = SEA_LEVEL - targetDepth;
        this.spawnActor(species, x, y, z, 2.2 + rand() * 3.8, rand() * Math.PI * 2, false, rand);
        break;
      }
    }
  }

  private spawnActor(
    species: MarineSpeciesDef,
    x: number,
    y: number,
    z: number,
    radius: number,
    phase: number,
    procedural: boolean,
    rand: () => number,
  ) {
    const useSource = species.id === 'blue-tang' && rand() < .55;
    const built = useSource ? {group: new THREE.Group()} : buildCreatureMesh(species);
    const scale = species.scale[0] + rand() * (species.scale[1] - species.scale[0]);
    built.group.scale.setScalar(scale);
    built.group.position.set(x, y, z);
    // Stream in CC0 SimPond Fish Kit GLBs with GPU spine-wave swim shader for reef fish species
    let simpond: SimPondActorHandle | undefined;
    const glbVariants = MARINE_FISH_GLB[species.id];
    const sourceFish = useSource ? this.models.fish(built.group, .85, rand()) : undefined;
    if (!useSource && glbVariants?.length) {
      const modelId = glbVariants[marineFishVariantIdx++ % glbVariants.length];
      const fallbackChildren = [...built.group.children];
      simpond = spawnSimPondActor(modelId, {
        scale: 1.35,
        layer: 1,
        groundOnFeet: false,
        onReady: () => {
          for (const ch of fallbackChildren) ch.visible = false;
        },
      });
      built.group.add(simpond.group);
    }
    this.root.add(built.group);
    const actor: MarineActor = {
      species,
      ...built,
      simpond, sourceFish,
      fleeBoost: 0,
      centerX: x,
      centerZ: z,
      baseY: y,
      radius,
      phase,
      dir: rand() > 0.5 ? 1 : -1,
      scale,
      procedural,
    };
    if (procedural) this.proceduralActors.push(actor);
    else this.presetActors.push(actor);
  }

  /**
   * Animates all marine creatures and—when diving—procedurally spawns & recycles
   * depth-appropriate creatures within a ring around the slime's current water depth.
   */
  update(t: number, dt: number, slimePos: readonly [number, number, number] | null, isDiving: boolean, expansions: ExpandedTile[] = []) {
    if (isDiving && slimePos) {
      const slimeDepth = Math.max(0.4, SEA_LEVEL - slimePos[1]);
      // Recycle procedural creatures that drifted too far or no longer belong to this depth band
      for (let i = this.proceduralActors.length - 1; i >= 0; i--) {
        const a = this.proceduralActors[i];
        const dist = Math.hypot(a.group.position.x - slimePos[0], a.group.position.z - slimePos[2]);
        const dDepth = Math.abs((SEA_LEVEL - a.baseY) - slimeDepth);
        if (dist > 25 || dDepth > 5.5) {
          a.sourceFish?.dispose(); a.simpond?.dispose();
          a.group.removeFromParent();
          this.proceduralActors.splice(i, 1);
        }
      }

      // Procedurally spawn depth-appropriate marine creatures around the slime
      this.spawnCooldown -= dt;
      const targetCount = 16;
      if (this.proceduralActors.length < targetCount && this.spawnCooldown <= 0) {
        this.spawnCooldown = 0.22;
        const rand = this.spawnRng;
        for (let tries = 0; tries < 10; tries++) {
          const ang = rand() * Math.PI * 2;
          const dist = 5.0 + rand() * 13.0;
          const sx = slimePos[0] + Math.cos(ang) * dist;
          const sz = slimePos[2] + Math.sin(ang) * dist;
          const bedY = coastalSeabedHeightAt(sx, sz, expansions);
          const colDepth = SEA_LEVEL - bedY;
          if (colDepth < 1.1) continue;
          const desiredDepth = Math.max(0.65, Math.min(colDepth - 0.55, slimeDepth + (rand() - 0.5) * 3.4));
          const species = pickSpeciesForDepth(desiredDepth, rand);
          const sy = SEA_LEVEL - desiredDepth;
          this.spawnActor(species, sx, sy, sz, 1.8 + rand() * 3.2, rand() * Math.PI * 2, true, rand);
          break;
        }
      }
    } else if (this.proceduralActors.length > 0) {
      // Clean up temporary dive-ring spawns once back on surface
      for (const a of this.proceduralActors) { a.sourceFish?.dispose(); a.simpond?.dispose(); a.group.removeFromParent(); }
      this.proceduralActors = [];
    }

    const animateList = (list: MarineActor[]) => {
      for (const a of list) {
        // Reactive flee-dart burst when the diving slime gets close to schooling fish
        const prox = slimePos ? Math.hypot(a.group.position.x - slimePos[0], a.group.position.y - slimePos[1], a.group.position.z - slimePos[2]) : Infinity;
        if (isDiving && prox < 3.2) a.fleeBoost = Math.min(1.6, (a.fleeBoost ?? 0) + dt * 3.5);
        else a.fleeBoost = Math.max(0, (a.fleeBoost ?? 0) - dt * 1.4);
        const speedMult = 1 + (a.fleeBoost ?? 0);
        a.sourceFish?.update(dt * speedMult);
        a.phase += dt * (a.species.speed / Math.max(1.5, a.radius)) * a.dir * (speedMult - 1);

        const omega = (a.species.speed / Math.max(1.5, a.radius)) * a.dir;
        const ang = t * omega + a.phase;
        const x = a.centerX + Math.cos(ang) * a.radius;
        const z = a.centerZ + Math.sin(ang) * a.radius;
        const isJelly = a.species.id === 'moon-jelly' || a.species.id === 'abyss-jelly';
        const bob = isJelly ? Math.sin(t * 1.9 + a.phase) * 0.42 : Math.sin(t * 1.3 + a.phase) * 0.22;
        const y = Math.min(SEA_LEVEL - 0.55, a.baseY + bob);
        a.group.position.set(x, y, z);

        if (isJelly) {
          const pulse = 1 + 0.16 * Math.sin(t * 2.6 + a.phase);
          if (a.bell) a.bell.scale.set(pulse, 1 / Math.sqrt(pulse), pulse);
          a.group.rotation.y = ang * 0.25;
        } else {
          const dx = -Math.sin(ang) * omega;
          const dz = Math.cos(ang) * omega;
          a.group.rotation.y = Math.atan2(dx, dz);
          if (a.tail) a.tail.rotation.y = Math.sin(t * (5.5 + a.species.speed * 2.0) * speedMult + a.phase) * 0.45;
          if (a.leftWing && a.rightWing) {
            const flap = Math.sin(t * (a.species.id === 'manta-ray' ? 2.4 : 3.2) + a.phase) * 0.42;
            a.leftWing.rotation.z = flap;
            a.rightWing.rotation.z = -flap;
          }
          if (a.simpond) {
            a.simpond.update(dt, (6.5 + a.species.speed * 2.2) * speedMult, 0.13 + (a.fleeBoost ?? 0) * 0.08);
          }
        }

        // Proximity discovery while diving
        if (isDiving && slimePos && !this.discovered.has(a.species.id)) {
          const d3 = Math.hypot(slimePos[0] - x, slimePos[1] - y, slimePos[2] - z);
          if (d3 < 2.6) {
            this.discovered.add(a.species.id);
            this.onDiscover?.(a.species);
          }
        }
      }
    };

    animateList(this.presetActors);
    animateList(this.proceduralActors);
  }

  dispose() {
    for (const a of [...this.presetActors, ...this.proceduralActors]) { a.sourceFish?.dispose(); a.simpond?.dispose(); a.group.removeFromParent(); }
    this.root.removeFromParent();
  }
}
