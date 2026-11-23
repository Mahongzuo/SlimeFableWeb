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
export type LandmarkPoint = [number, number, number];
export interface LandmarkLeg {
  action: 'walk' | 'climb' | 'jump' | 'slide';
  end: LandmarkPoint; prompt: string;
}
export interface PixelBoardSpec {
  rows: string[];
  sections: {name: string; end: number; color: string}[];
}
export interface LandmarkSpec {
  id: string; template: 'landmark'; theme: 'arecibo-1974'; seed: string;
  title: string; intro: string; outro: string; souvenir: string;
  spawn: LandmarkPoint; route: LandmarkLeg[]; board: PixelBoardSpec; medals: {gold: number; silver: number};
}
export interface AlmanacSpec {
  id:string; template:'almanac'; title:string; fact:string; theme:string;
  activity:'align'|'dock'|'observe'|'beat'|'hover'|'aux'|'logic'|'drive'|'kick'|'tide'|'pong';
  stops:[string,string,string]; souvenir:string; finale:string;
}
export type SolsticeBiome = 'aurora' | 'cosmos' | 'lantern' | 'clockwork' | 'ocean' | 'sanctuary';
export type SolsticeMonument = 'biplane' | 'earthrise' | 'telescope' | 'reactor' | 'cinema' | 'lighthouse' | 'ship' | 'chronometer' | 'tree' | 'helix' | 'compass';
export type SolsticeMode = 'resonance' | 'split-bridge' | 'glide-dash' | 'ascend';
export interface SolsticeSpec {
  id: string; template: 'solstice'; title: string; fact: string; outro: string;
  biome: SolsticeBiome; monument: SolsticeMonument; mode: SolsticeMode;
  elements: [number, number, number]; stops: [string, string, string];
  souvenir: string; finale: string; palette: [string, string];
  tone: 'bright' | 'solemn'; medals: {gold: number; silver: number};
}
/** October autumn-night causeway: three element rites, then the day's landmark performs its finale. */
export type FolioRite = 'lamp' | 'arc' | 'wind' | 'moon';
export type FolioMotion = 'lift' | 'spin' | 'turn' | 'orbit' | 'surface' | 'sail' | 'glow' | 'broadcast' | 'flare' | 'fly' | 'kick' | 'pulse' | 'notes';
export interface FolioSpec {
  id: string; template: 'folio'; title: string; fact: string; source: string; intro: string; outro: string;
  rite: FolioRite; landmark: string; motion: FolioMotion; stops: [string, string, string]; finale: string;
  souvenir: string; palette: [string, string]; medals: {gold: number; silver: number};
}
export type AtlasKind = 'orbit' | 'score' | 'race' | 'atelier' | 'span' | 'field' | 'ink' | 'signal' | 'flight';
export interface AtlasSpec {
  id:string; template:'atlas'; kind:AtlasKind; title:string; fact:string; source:string; souvenir:string;
}
export type AbilityMode='relay'|'circuit'|'combo'|'climb'|'tide'|'duet';
export type AbilityKind=AtlasKind|'memorial';
export interface AbilitySpec {id:string;template:'ability';kind:AbilityKind;mode:AbilityMode;element:number;title:string;fact:string;source:string;souvenir:string}
export type AnyLevel = AbilitySpec | LevelSpec | RunnerSpec | LanderSpec | FlybySpec | LandmarkSpec | AlmanacSpec | SolsticeSpec | FolioSpec | AtlasSpec;
export const defineRunner = (spec: RunnerSpec) => spec;
