import type {Box, Vec} from '../slime/types';
/** Pure level geometry: no Three.js, so the validator and tests can run it in Node. Metres, Y up. */
export interface Lot {id: string; min: [number, number]; max: [number, number]; height: number; roof: 'gable' | 'flat'; ridgeAlongX: boolean; style: number; door?: {x: number; z: number; facing: Vec}}
export type PropKind = 'crate' | 'crate-stack' | 'barrel' | 'lamp' | 'bench' | 'sign' | 'fence' | 'cabinet' | 'pad' | 'press';
export interface Prop {id: string; kind: PropKind; x: number; z: number; y: number; w: number; d: number; h: number; rot: number; solid: boolean; text?: string}
export interface Spot {id: string; x: number; y: number; z: number; kind: string; facing?: number}
export interface Layout {
  seed: string; bounds: {min: [number, number]; max: [number, number]};
  spawn: Vec; spawnYaw: number;
  lots: Lot[]; props: Prop[]; boxes: Box[];
  /** Placed targets by actor / item id, plus the pads. */
  spots: Record<string, Spot>;
  pads?: {a: Spot; b: Spot; reward: string};
}
