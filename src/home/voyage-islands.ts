import * as T from 'three';
import {voyageNoise} from '../life/voyage';
import {spawnPackModel, type SpawnedPackModel} from './model-pack';
import {SEA_LEVEL} from './layout';
import type {GroundSurface, FluidVolume} from '../slime/world';
import type {Vec} from '../slime/types';

const CELL = 192,
  STEPS = 40;
export interface SeaIsland {
  x: number;
  z: number;
  r: number;
  kind: number;
  phase: number;
}
export function islandAt(seed: number, gx: number, gz: number): SeaIsland {
  const n = (salt: number) => voyageNoise(seed ^ salt, gx, gz);
  return {
    x: (gx + 0.37 + 0.26 * n(1)) * CELL,
    z: (gz + 0.37 + 0.26 * n(2)) * CELL,
    r: 16 + 10 * n(3),
    kind: Math.floor(n(4) * 3),
    phase: n(5) * 6.28,
  };
}
export function islandBed(i: SeaIsland, x: number, z: number) {
  const dx = (x - i.x) / i.r,
    dz = (z - i.z) / i.r,
    a = Math.atan2(dz, dx) + i.phase;
  const r =
    Math.hypot(dx * (i.kind === 0 ? 0.76 : 1), dz) / (1 + 0.12 * Math.sin(3 * a) + 0.08 * Math.cos(5 * a));
  let h = (1 - r) * (i.kind === 1 ? 7 : 3.6);
  if (i.kind === 2) h = Math.min(h, (r - 0.41) * 7 + Math.sin(a) * 0.42);
  if (i.kind === 1) h += Math.max(0, 1 - r) * 2 * Math.sin(a * 2) * Math.min(r * 4, 1);
  if (i.kind === 1) {
    for (let j = 0; j < 3; j++) {
      const angle = i.phase + j * 1.76,
        dist = Math.hypot(dx - 0.46 * Math.cos(angle), dz - 0.46 * Math.sin(angle));
      h += (1 - Math.min(1, dist / (0.24 + j * 0.045))) ** 1.4 * (9 - j * 1.7);
    }
  }
  return SEA_LEVEL + Math.max(-14.5, h - Math.max(0, r - 1.15) * 8);
}
interface Tile {
  island: SeaIsland;
  mesh: T.Group;
  solid: GroundSurface;
}
function buildTile(i: SeaIsland, scenery: boolean): Tile {
  const root = new T.Group();
  root.position.set(i.x, 0, i.z);
  root.name = ['voyage-sandbar', 'voyage-cape', 'voyage-atoll'][i.kind];
  const span = i.r * 2.7,
    geo = new T.PlaneGeometry(span * 2, span * 2, STEPS, STEPS);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position,
    colors: number[] = [],
    values: number[] = [];
  const sand = new T.Color(0xeac48c),
    stone = new T.Color(0x747d79),
    grass = new T.Color(0x769c61),
    reef = new T.Color(0x64a49b);
  for (let j = 0; j < p.count; j++) {
    const x = p.getX(j),
      z = p.getZ(j),
      h = islandBed(i, x + i.x, z + i.z);
    values.push(h);
    p.setY(j, h);
    const c = sand.clone();
    if (h < SEA_LEVEL) c.lerp(reef, Math.min(1, (SEA_LEVEL - h) * 0.3));
    else c.lerp(i.kind === 1 ? stone : grass, Math.min(1, Math.max(0, h - SEA_LEVEL - 0.8) * 0.9));
    c.multiplyScalar(0.98 + 0.035 * Math.sin(x * 1.6 + z));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new T.Mesh(geo, new T.MeshStandardMaterial({vertexColors: true, roughness: 1}));
  ground.layers.set(1);
  ground.receiveShadow = true;
  root.add(ground);
  const decor: SpawnedPackModel[] = [];
  if (scenery) {
    const clusterCount = i.kind === 1 ? 3 : 5;
    for (let j = 0; j < clusterCount; j++) {
      const angle = i.phase + j * 2.4,
        radius = i.r * (0.53 + 0.16 * Math.sin(j));
      const x = Math.cos(angle) * radius,
        z = Math.sin(angle) * radius,
        y = islandBed(i, i.x + x, i.z + z);
      if (y < SEA_LEVEL + 0.2) continue;
      const plant = spawnPackModel(T, 'nature-palm', 3.7 + 1.8 * Math.cos(angle), {outline: false});
      plant.group.position.set(x, y - 0.12, z);
      plant.group.rotation.y = angle;
      root.add(plant.group);
      decor.push(plant);
      const fringe = spawnPackModel(T, j % 2 ? 'nature-fern' : 'tidal-rocks', 2.8, {outline: false});
      fringe.group.position.set(x + 1, islandBed(i, i.x + x + 1, i.z + z + 1) - 0.1, z + 1);
      root.add(fringe.group);
      decor.push(fringe);
    }
  }
  root.userData.resources = [geo, ground.material, ...decor];
  return {
    island: i,
    mesh: root,
    solid: {
      min: [i.x - span, i.z - span],
      max: [i.x + span, i.z + span],
      height: 0,
      grid: {width: STEPS + 1, height: STEPS + 1, values},
    },
  };
}
export class VoyageIslands {
  private tiles = new Map<string, Tile>();
  private floor = new T.Mesh(
    new T.PlaneGeometry(2600, 2600).rotateX(-Math.PI / 2),
    new T.MeshStandardMaterial({color: 0x68a096, roughness: 1}),
  );
  private cell = '';
  center: [number, number] = [0, 0];
  constructor(
    private scene: T.Scene,
    private scenery = true,
  ) {
    this.floor.name = 'voyage-deep-seabed';
    this.floor.layers.set(1);
    this.floor.position.y = SEA_LEVEL - 14.85;
  }
  sync(x: number, z: number, seed: number, coast: (x: number, z: number) => number) {
    const gx = Math.floor(x / CELL),
      gz = Math.floor(z / CELL),
      key = gx + ',' + gz;
    if (this.cell === key) return false;
    this.cell = key;
    this.center = [(gx + 0.5) * CELL, (gz + 0.5) * CELL];
    this.floor.position.x = this.center[0];
    this.floor.position.z = this.center[1];
    if (!this.floor.parent) this.scene.add(this.floor);
    const keep = new Set<string>();
    for (let a = gx - 1; a <= gx + 1; a++)
      for (let b = gz - 1; b <= gz + 1; b++) {
        const k = a + ',' + b,
          i = islandAt(seed, a, b);
        if (coast(i.x, i.z) < 135) continue;
        keep.add(k);
        if (this.tiles.has(k)) continue;
        const tile = buildTile(i, this.scenery);
        this.tiles.set(k, tile);
        this.scene.add(tile.mesh);
      }
    for (const [k, tile] of this.tiles)
      if (!keep.has(k)) {
        this.remove(tile);
        this.tiles.delete(k);
      }
    return true;
  }
  private remove(t: Tile) {
    t.mesh.removeFromParent();
    for (const item of t.mesh.userData.resources) item.dispose();
  }
  dispose() {
    this.clear();
    this.floor.geometry.dispose();
    this.floor.material.dispose();
  }
  clear() {
    this.floor.removeFromParent();
    this.tiles.forEach((tile) => this.remove(tile));
    this.tiles.clear();
    this.cell = '';
  }
  bed(x: number, z: number, base: number) {
    for (const {island: i, solid: s} of this.tiles.values())
      if (x >= s.min[0] && x <= s.max[0] && z >= s.min[1] && z <= s.max[1])
        base = Math.max(base, islandBed(i, x, z));
    return base;
  }
  extend(surfaces: GroundSurface[], fluids: FluidVolume[], bounds: {min: Vec; max: Vec}, buoyant: boolean) {
    if (!this.cell) return;
    const [cx, cz] = this.center,
      r = CELL * 1.6,
      x0 = cx - r,
      x1 = cx + r,
      z0 = cz - r,
      z1 = cz + r;
    const [hx, , hz] = bounds.min,
      [ex, , ez] = bounds.max;
    // Surround the existing home collision with disjoint deep-ocean strips.
    for (const [l, b, h, t] of [
      [x0, z0, Math.min(x1, hx), z1],
      [Math.max(x0, ex), z0, x1, z1],
      [Math.max(x0, hx), z0, Math.min(x1, ex), Math.min(hz, z1)],
      [Math.max(x0, hx), Math.max(ez, z0), Math.min(x1, ex), z1],
    ]) {
      if (l >= h || b >= t) continue;
      const min: [number, number] = [l, b],
        max: [number, number] = [h, t];
      surfaces.push({min, max, height: SEA_LEVEL - 14.5});
      if (buoyant) fluids.push({min, max, level: SEA_LEVEL, sink: 0.14});
    }
    for (const t of this.tiles.values()) surfaces.push(t.solid);
    bounds.min[0] = Math.min(hx, x0);
    bounds.min[2] = Math.min(hz, z0);
    bounds.max[0] = Math.max(ex, x1);
    bounds.max[2] = Math.max(ez, z1);
  }
}
