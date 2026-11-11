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
export type RunnerSegment = 'hutong' | 'roofs' | 'avenue' | 'bridge' | 'toll' | 'deck' | 'tunnel' | 'arrival';
export interface RunnerSpec {
  id: string; template: 'runner'; theme: string; seed: string; title: string; intro: string; outro: string;
  segments: RunnerSegment[];
  /** What the pickups are called, and how many the course carries. */
  pickup: {name: string; count: number; look?: 'flag' | 'ribbon'};
  /** Banner text per segment as the slime enters it. */
  segmentNames: Partial<Record<RunnerSegment, string>>;
  finish: {label: string; done: string; kind?: 'flag' | 'ribbon'};
  souvenir: string; signs?: string[];
}
/** Low-gravity landing; all values are game tuning, not a physical reconstruction. */
export interface LanderSpec {
  id: string; template: 'lander'; theme: 'space'; seed: string;
  title: string; intro: string; outro: string; souvenir: string; hiddenSouvenir: string;
  gravityScale: number; descentSeconds: number;
  battery: {capacity: number; shadowDrain: number; sunCharge: number; jetCost: number};
  sunlight: {period: number; radius: number; travel: number};
  medals: {gold: number; silver: number};
  science: [string, string, string];
}
export const defineLander = (spec: LanderSpec) => spec;
/** Flyby distances, masses and timing are fictional game units. */
export interface FlybyBody {
  id: string; name: string; position: [number, number]; radius: number; mass: number; color: string;
}
export interface FlybyPhoto {
  id: string; name: string; body: string; center: [number, number]; radius: number;
}
export interface FlybySpec {
  id: string; template: 'flyby'; theme: 'space'; seed: string;
  title: string; intro: string; outro: string; souvenir: string; hiddenSouvenir: string;
  spawn: [number, number]; velocity: [number, number]; bodies: FlybyBody[]; photos: FlybyPhoto[];
  rings: {body: string; inner: number; outer: number; gap: [number, number]};
  titan: string; encounterRadius: number; escapeRadius: number; timeLimit: number;
  medals: {gold: number; silver: number};
  hidden: {position: [number, number]; radius: number};
}
export const defineFlyby = (spec: FlybySpec) => spec;
export type AnyLevel = LevelSpec | RunnerSpec | LanderSpec | FlybySpec;
export const defineRunner = (spec: RunnerSpec) => spec;
