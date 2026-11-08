import {createWorld, type WorldDefinition} from '../slime/world';
import type {HeightFieldData} from '../slime/height-field';
import {harborDefinition} from '../home/harbor-world';
import {bakeHarborCollision} from '../home/harbor-collision';
import {SEA_LEVEL} from '../home/layout';
import {buildZones, type BuiltZones} from '../zones';
import {bakeRegion} from './bake';
import {buildChineseHouses} from '../home/chinese-houses';
import type {LifeData} from '../life/state';
import type {ZoneContext} from '../zones/types';
import {buildInlandGround} from './terrain-mesh';
import {inlandSurfaces, lakeFluid, WORLD, ZONES} from './map';
/**
 * Build the whole Home: harbour (already in the scene) + new land + zone scenery, then bake collision:
 * the harbour tile as before, one more 0.1 m tile per zone that has solid props, analytic ground everywhere.
 */
export function buildHomeWorld(ctx: any, life: LifeData, save: () => void, extra: Pick<ZoneContext, 'hud' | 'historyDay'> = {}): {world: WorldDefinition; zones: BuiltZones} {
  const started = performance.now();
  buildChineseHouses(ctx);
  buildInlandGround(ctx);
  const zones = buildZones(ctx, life, save, extra);
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
