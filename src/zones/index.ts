import {rng} from '../templates/random';
import {inland, ZONES, type ZoneId} from '../world/map';
import {park} from './park';
import {lake} from './lake';
import {farm} from './farm';
import {forest} from './forest';
import {harbor} from './harbor';
import type {Box} from '../slime/types';
import type {Interactable, PlayerHandle, ZoneBuild, ZoneBuilder, ZoneContext} from './types';
import type {LifeData} from '../life/state';
/** Zone builders live one per file (park.ts, lake.ts, farm.ts, forest.ts); the contract is in types.ts. */
export const zoneBuilders: Partial<Record<ZoneId, ZoneBuilder>> = {harbor, park, lake, farm, forest};

export interface BuiltZones {roots: any[]; boxes: Box[]; interactables: Interactable[]; updates: ((t: number, dt: number, p: PlayerHandle) => void)[]}
export function buildZones(
  ctx: any,
  life: LifeData,
  save: () => void,
  extra: Pick<ZoneContext, 'hud' | 'historyDay' | 'openSeedShop' | 'openSeedPicker' | 'farmRegistry' | 'dayKey'> = {},
): BuiltZones {
  const T = ctx.THREE, out: BuiltZones = {roots: [], boxes: [], interactables: [], updates: []};
  for (const rect of ZONES) {
    const build = zoneBuilders[rect.id]; if (!build) continue;
    const z: ZoneContext = {ctx, T, rect, ground: inland, rand: rng('zone-' + rect.id).next, toon: (c, o) => ctx.mats.toon(c, o), interact: i => out.interactables.push(i), life, save, ...extra};
    const b: ZoneBuild = build(z); b.root.name = 'zone-' + rect.id; ctx.scene.add(b.root); out.roots.push(b.root);
    if (b.boxes?.length) out.boxes.push(...b.boxes);
    if (b.update) out.updates.push(b.update);
  }
  return out;
}
