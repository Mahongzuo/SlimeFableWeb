import {createWorld, type WorldDefinition} from '../slime/world';
import type {HeightFieldData} from '../slime/height-field';
import {harborDefinition} from '../home/harbor-world';
import {bakeHarborCollision} from '../home/harbor-collision';
import {SEA_LEVEL} from '../home/layout';
import {spawnPackModel} from '../home/model-pack';
import {buildZones, type BuiltZones} from '../zones';
import {bakeRegion} from './bake';
import {buildChineseHouses} from '../home/chinese-houses';
import type {LifeData} from '../life/state';
import type {ZoneContext} from '../zones/types';
import {buildInlandGround} from './terrain-mesh';
import {inland, inlandSurfaces, LAKE, lakeFluid, WORLD, ZONES} from './map';

/** Subtle DreamWorld scenic anchors placed outside buildable lawns so the world feels cohesive out of the box. */
function addDreamWorldLandmarks(ctx: any) {
  const T = ctx.THREE;
  const g = new T.Group();
  g.name = 'dreamworld-scenic-anchors';
  const spots: {asset: string; x: number; z: number; y?: number; yaw: number; width: number; outline?: boolean}[] = [
    // Mirror Lake waterside willow + lilies + shore stones (Jiangnan waterlane vibe)
    {asset: 'nature-willow', x: -16, z: 96, yaw: 0.4, width: 4.2, outline: false},
    {asset: 'waterside-lily', x: -8, z: 103, y: LAKE.level, yaw: 0.6, width: 1.8, outline: false},
    {asset: 'waterside-reeds', x: -13, z: 99, y: LAKE.level, yaw: 0.2, width: 2.1, outline: false},
    {asset: 'waterside-shore-stones', x: 18, z: 97, yaw: -0.5, width: 2.6, outline: false},
    // Park meadow moon-gate welcome arch
    {asset: 'build-moon-gate', x: 8, z: 42, yaw: -0.35, width: 3.4, outline: true},
    // Farm terrace ornamental bamboo & bonsai beside entrance
    {asset: 'nature-bamboo', x: -35, z: 12, yaw: 0.5, width: 2.4, outline: false},
    {asset: 'nature-wisteria', x: -35, z: -8, yaw: 1.2, width: 3.4, outline: false},
  ];
  for (const s of spots) {
    const spawned = spawnPackModel(T, s.asset, s.width, {castShadow: s.width > 2.5, outline: s.outline});
    const y = s.y ?? inland(s.x, s.z);
    spawned.group.position.set(s.x, y, s.z);
    spawned.group.rotation.y = s.yaw;
    g.add(spawned.group);
  }
  ctx.scene.add(g);
}

/**
 * Build the whole Home: harbour (already in the scene) + new land + zone scenery, then bake collision:
 * the harbour tile as before, one more 0.1 m tile per zone that has solid props, analytic ground everywhere.
 */
export function buildHomeWorld(
  ctx: any,
  life: LifeData,
  save: () => void,
  extra: Pick<ZoneContext, 'hud' | 'historyDay' | 'openSeedShop' | 'openSeedPicker' | 'farmRegistry' | 'dayKey'> = {},
): {world: WorldDefinition; zones: BuiltZones} {
  const started = performance.now();
  buildChineseHouses(ctx);
  buildInlandGround(ctx);
  const zones = buildZones(ctx, life, save, extra);
  addDreamWorldLandmarks(ctx);
  const base: WorldDefinition = {
    ...harborDefinition, boxes: [], water: ctx.puddles,
    surfaces: [...harborDefinition.surfaces, ...inlandSurfaces()],
    fluids: [{min: [-10, -30], max: [30, 10], level: SEA_LEVEL, sink: .14}, lakeFluid],
    bounds: {min: [WORLD.min[0] - 1, -9, WORLD.min[1] - 1], max: [WORLD.max[0] + 1, 40, WORLD.max[1] + 1]},
  };
  const world = bakeHarborCollision(ctx, base), terrain = createWorld({...base, boxes: []}).terrain, heights: HeightFieldData[] = [];
  for (const root of zones.roots) {
    const rect = ZONES.find(z => 'zone-' + z.id === root.name)!;
    const r = bakeRegion(ctx, {root, x0: rect.min[0] - .5, z0: rect.min[1] - .5, w: rect.max[0] - rect.min[0] + 1, h: rect.max[1] - rect.min[1] + 1, ground: terrain, fluids: base.fluids, classify: () => 'solid'});
    if (r.height) heights.push(r.height);
    console.info(`[Slime collision] ${root.name}: ${r.meshes} meshes, ${r.triangles} triangles`);
  }
  console.info(`[Home] world built in ${(performance.now() - started).toFixed(0)} ms, ${heights.length} zone tiles`);
  return {world: {...world, heights}, zones};
}
