import {WorldDefinition, createWorld} from '../slime/world';
import {bakeRegion} from '../world/bake';
/** Only these scene branches are solid: ground, buildings, props, moored boats, and the home plaza pieces. */
const SOLID = /landscape|buildings|warehouse|waitingRoom|whDoor|props|vending|lighthouse|tetrapod|house|base|boats|cruiser|time-portal|history-lectern/;
/** Hollow shells: count their columns as solid to the top, so decks are walkable and piles have no leg gaps. */
const FILLED = /boats|cruiser|tetrapod/;
/**
 * Bake every solid triangle in the harbour once, at load, into a 0.1 m height field (see slime/height-field.ts).
 * The worker then answers every collision query with array lookups instead of scanning triangles.
 * Boats bob by about 0.15 m around their moorings; their baked decks are a static approximation.
 */
export function bakeHarborCollision(ctx: any, base: WorldDefinition): WorldDefinition {
  const started = performance.now();
  // start every land column at the walkable ground, not at the underside of the quay slab
  const terrain = createWorld({...base, boxes: []}).terrain;
  const r = bakeRegion(ctx, {x0: -32, z0: -32, w: 64, h: 64, fluids: base.fluids, ground: terrain,
    classify: (_m, path) => /^zone-|\/zone-/.test(path) ? null : FILLED.test(path) ? 'filled' : SOLID.test(path) ? 'solid' : null});
  console.info(`[Slime collision] harbour: ${r.meshes} meshes, ${r.triangles} triangles in ${(performance.now() - started).toFixed(0)} ms`);
  return {...base, boxes: base.boxes.filter(b => b.name.startsWith('training')), triangles: undefined, height: r.height ?? undefined};
}
