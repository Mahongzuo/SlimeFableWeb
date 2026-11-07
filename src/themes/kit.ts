import type {Stage, StageLook} from '../level/stage';
import type {Layout} from '../templates/types';
import type {LevelSpec} from '../../content/levels/types';
/** Moving parts a level script drives after the kit has built the static scene. */
export interface KitHandles {cabinet?: {open(k: number): void}; pads: Record<string, {press(k: number): void}>}
/** A theme turns pure layout data into meshes. One kit per era × region, reused by every level that names it. */
export interface ThemeKit {id: string; look: StageLook; build(stage: Stage, layout: Layout, spec: LevelSpec): KitHandles}
export interface Palette {ground: string; lane: string; plaza: string; yard: string; walls: string[]; roof: string; trim: string; door: string; glass: string; wood: string; metal: string; brick: string; accent: string; lamp: string}
