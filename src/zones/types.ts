import type {Box, Vec} from '../slime/types';
import type {ZoneRect} from '../world/map';
import type {LifeData} from '../life/state';
import type {LifeUI} from '../ui/life-ui';
import type {FarmRegistry} from './farm-registry';
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
  /** Loop UI (fishing meter, coins); absent in tests. */ hud?: LifeUI;
  /** True when today has a playable history level (the history fish bites). */ historyDay?: () => boolean;
  /** Opens the interactive seed selection & daily special shop modal. */ openSeedShop?: () => void;
  /** Opens the UE-style seed picker for an empty farm plot. */ openSeedPicker?: (plotId: string, onPick: (seedId: string) => void) => void;
  /** Shared farm plot registry (terrace + player-placed raised beds). */ farmRegistry?: FarmRegistry;
  /** Current local YYYY-MM-DD key for daily home journal & special seed rotation. */ dayKey?: () => string;
}
/** What zone code may do to / read from the slime at runtime (passed to `update`). */
export interface PlayerHandle {
  position: Readonly<Vec>; velocity: Readonly<Vec>; grounded: boolean; swimming: boolean; clinging: boolean;
  /** 0 水 1 风 2 火 3 雷 4 暗 5 物 */ element: number; /** 0..1, C held = flattened/sneaking */ spread: number;
  /** True while the player is actively holding WASD movement input. */ hasMoveInput?: boolean;
  /** True while a right-click home dash is active. */ isDashing?: boolean;
  /** Set the slime's velocity (bounce pads, launchers). */ launch: (v: Vec) => void;
  /** Carry the slime along with a moving platform/seat without interrupting jump or walk-off. */
  carry?: (delta: Vec, surfaceY?: number) => void;
  /** Lock slime seamlessly onto a moving/tilted seat surface (zero drift, zero PBF clipping). */
  seatAt?: (pos: Vec, plane: {point: Vec; normal: Vec}) => void;
  /** Release seat lock when the player actively dismounts. */
  clearRide?: () => void;
  /** Re-index mutated dynamic solid boxes (e.g. swinging seat collider). */
  refreshBoxes?: () => void;
  toast: (text: string, ms?: number) => void;
  mood: (m: 'Happy' | 'Surprised' | 'Hurt' | 'Squash', seconds?: number) => void;
  /** Freeze movement input (minigames). */ lock: (on: boolean) => void;
}
/**
 * A zone's scene graph lives under `root` (named `zone-<id>`). Every visible mesh under it is baked as solid,
 * except names matching NEVER_SOLID (leaf, foliage, grass, flower, crop, water, fx…) or `userData.walkThrough`.
 */
export interface ZoneBuild {root: any; spots?: Record<string, Vec>; boxes?: Box[]; update?: (t: number, dt: number, player: PlayerHandle) => void}
export type ZoneBuilder = (z: ZoneContext) => ZoneBuild;
