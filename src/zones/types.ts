import type {Vec} from '../slime/types';
import type {ZoneRect} from '../world/map';
import type {LifeData} from '../life/state';
/** Something the player can press F at. The nearest one in range gets the prompt. */
export interface Interactable {id: string; position: Vec; radius: number; prompt: () => {title: string; sub: string} | null; act: () => void}
/** What a zone builder gets: the shared THREE context, its rectangle, the ground, and seeded randomness. */
export interface ZoneContext {
  ctx: any; T: any; rect: ZoneRect;
  /** Walkable ground height (analytic terrain) at x,z. Put props on it. */
  ground: (x: number, z: number) => number;
  /** Seeded 0..1 random, stable across reloads. */
  rand: () => number;
  /** Cached toon material (same look as the harbour). */
  toon: (color: number, opts?: any) => any;
  /** Register an F-interaction. */
  interact: (i: Interactable) => void;
  /** Persistent casual-play state; call `save()` after changing it. */
  life: LifeData; save: () => void;
}
/** What zone code may do to / read from the slime at runtime (passed to `update`). */
export interface PlayerHandle {
  position: Readonly<Vec>; velocity: Readonly<Vec>; grounded: boolean; swimming: boolean; clinging: boolean;
  /** 0 水 1 风 2 火 3 雷 4 暗 5 物 */ element: number; /** 0..1, C held = flattened/sneaking */ spread: number;
  /** Set the slime's velocity (bounce pads, launchers). */ launch: (v: Vec) => void;
  toast: (text: string, ms?: number) => void;
  mood: (m: 'Happy' | 'Surprised' | 'Hurt' | 'Squash', seconds?: number) => void;
  /** Freeze movement input (minigames). */ lock: (on: boolean) => void;
}
/**
 * A zone's scene graph lives under `root` (named `zone-<id>`). Every visible mesh under it is baked as solid,
 * except names matching NEVER_SOLID (leaf, foliage, grass, flower, crop, water, fx…) or `userData.walkThrough`.
 */
export interface ZoneBuild {root: any; spots?: Record<string, Vec>; update?: (t: number, dt: number, player: PlayerHandle) => void}
export type ZoneBuilder = (z: ZoneContext) => ZoneBuild;
