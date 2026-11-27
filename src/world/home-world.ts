import {buildGardenRegions} from '../home/garden-regions';
import {riverCenter,riverLevel} from '../home/waterway';
import {createWorld, type WorldDefinition} from '../slime/world';
import type {HeightFieldData} from '../slime/height-field';
import {plazaBoxes, SEA_LEVEL} from '../home/layout';
import {buildZones, type BuiltZones} from '../zones';
import {bakeRegion} from './bake';
import {buildQuay} from '../home/jiangnan';
import {ensureHome,type LifeData,type PlacedProp} from '../life/state';
import {settleLegacyGarden} from '../home/build-catalog';
import type {ZoneContext} from '../zones/types';
import {buildInlandGround} from './terrain-mesh';
import {buildCoastalCollisionSurfaces, buildCoastalReefBoxes, buildOceanFluidVolumes} from './island-coast';
import {inland, inlandSurfaces, LAKE, lakeFluid, WORLD, ZONES} from './map';

export function buildHomeWorld(
  ctx: any,
  life: LifeData,
  save: () => void,
  extra: Pick<ZoneContext, 'hud' | 'historyDay' | 'openSeedShop' | 'openSeedPicker' | 'farmRegistry' | 'dayKey'> = {},
): {world: WorldDefinition; zones: BuiltZones; footprints: PlacedProp[]} {
  const started = performance.now();
  if(settleLegacyGarden(ensureHome(life)))save();
  buildInlandGround(ctx);
  const quayBoxes=buildQuay(ctx);
  const zones = buildZones(ctx, life, save, extra);
  const {boxes,footprints}=buildGardenRegions(ctx,zones.roots,life.home?.placed??[]);
  boxes.push(...quayBoxes, ...plazaBoxes(), ...zones.boxes, ...buildCoastalReefBoxes(ensureHome(life).expansions));
  const coastalPad = 76;
  const base: WorldDefinition = {
    indexBoxes:true,boxes, water: ctx.puddles,
    surfaces:[...inlandSurfaces(), ...buildCoastalCollisionSurfaces([], coastalPad)],
    fluids:[...Array.from({length:54},(_,i)=>{const z=i-31,x=riverCenter(Math.min(z,18)),w=z<18?4:Math.max(.15,4-(z-18));
      return {min:[x-w,z] as [number,number],max:[x+w,z+1] as [number,number],level:riverLevel,sink:.14};}),lakeFluid,...buildOceanFluidVolumes([], coastalPad)],
    bounds: {min: [WORLD.min[0] - 72, -24, WORLD.min[1] - 72], max: [WORLD.max[0] + 72, 65, WORLD.max[1] + 72]},
  };
  const terrain = createWorld({...base, boxes: []}).terrain, heights: HeightFieldData[] = [];
  for (const root of zones.roots) {
    const rect = ZONES.find(z => 'zone-' + z.id === root.name)!;
    const r = bakeRegion(ctx, {root:rect.id==='harbor'?ctx.scene:root, x0: rect.min[0] - .5, z0: rect.min[1] - .5, w: rect.max[0] - rect.min[0] + 1, h: rect.max[1] - rect.min[1] + 1, ground: terrain, fluids: base.fluids, classify: (_m,path) => rect.id!=='harbor' || /time-portal|props-book-quay|history-lectern|fishing-pier/.test(path) ? 'solid' : null});
    if (r.height) heights.push(r.height);
    console.info(`[Slime collision] ${root.name}: ${r.meshes} meshes, ${r.triangles} triangles`);
  }
  console.info(`[Home] world built in ${(performance.now() - started).toFixed(0)} ms, ${heights.length} zone tiles`);
  return {world: {...base, heights}, zones, footprints};
}
