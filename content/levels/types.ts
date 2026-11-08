import type {Template} from '../types';
/** What a level asks the template for. Story facts live here; geometry is generated from `seed`. */
export type ObjectiveType = 'collect' | 'talk' | 'reach';
export interface Objective {type: ObjectiveType; label: string; targets: string[]}
export interface ActorSpec {name: string; slot: SlotKind; lines: string[]; done?: string; lock?: {element: number; hint: string}}
export interface ItemSpec {name: string; slot: SlotKind}
/**
 * Slot kinds the explore-quest template knows how to place:
 * plaza-a: the shopfront on the start plaza · plaza-b: the far plaza · lane: along the main street ·
 * alley: down a side alley · yard: the back yards · roof: on a low roof reached from a crate stack ·
 * cabinet: behind the two split pads (needs a launched clone) · hidden: a dead end behind crates.
 */
export type SlotKind = 'plaza-a' | 'plaza-b' | 'lane' | 'alley' | 'yard' | 'roof' | 'cabinet' | 'hidden';
export interface LevelSpec {
  id: string; template: Template; theme: string; seed: string;
  title: string; intro: string; outro: string;
  actors: Record<string, ActorSpec>; items: Record<string, ItemSpec>;
  quest: {main: {title: string; branches: Objective[]}; side?: {title: string; objective: Objective; souvenir: string}};
  signs?: string[];
}
export const defineLevel = (spec: LevelSpec) => spec;

/** Runner chapters: a linear dash through themed segments, picking things up, to a finish line. Geometry from `seed`. */
export type RunnerSegment = 'hutong' | 'roofs' | 'avenue' | 'bridge';
export interface RunnerSpec {
  id: string; template: 'runner'; theme: string; seed: string; title: string; intro: string; outro: string;
  segments: RunnerSegment[];
  /** What the pickups are called, and how many the course carries. */
  pickup: {name: string; count: number};
  /** Banner text per segment as the slime enters it. */
  segmentNames: Record<RunnerSegment, string>;
  finish: {label: string; done: string};
  souvenir: string; signs?: string[];
}
export type AnyLevel = LevelSpec | RunnerSpec;
export const defineRunner = (spec: RunnerSpec) => spec;
