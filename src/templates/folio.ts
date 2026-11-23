import type {Box, Vec} from '../slime/types';
import type {FluidVolume, GroundSurface, WorldDefinition} from '../slime/world';
import type {FolioRite, FolioSpec} from '../../content/levels/types';
/** The October causeway, in metres. The slime walks toward -Z; the landmark island sits beyond the plinth. */
export const FOLIO = {
  spawn: [0, 0, 23] as Vec,
  causeway: {min: [-2.4, -21] as [number, number], max: [2.4, 27] as [number, number]},
  pad: {min: [-4.5, 19] as [number, number], max: [4.5, 28] as [number, number]},
  waterLevel: -.16, poolFloor: -1.1,
  /** Rite devices stand on raised stone platforms; the slime stands within `reach` of the device. */
  stations: [[-2.6, 13], [2.6, 1], [-2.6, -11]] as [number, number][], stationTop: .3, reach: 2.3,
  steles: [{x: 1.9, z: 7, top: 1.9}, {x: -1.9, z: -5, top: 1.9}],
  /** Three walkable steps, then a pedestal the slime has to climb. */
  steps: [{min: [-5, -25], max: [5, -21], top: .3}, {min: [-4.5, -29], max: [4.5, -23], top: .6}, {min: [-4, -33], max: [4, -25], top: .9}] as {min: [number, number]; max: [number, number]; top: number}[],
  pedestal: {min: [-1.6, -29.5] as [number, number], max: [1.6, -26.5] as [number, number], top: 2.5},
  lights: [[0, .55, 17.5], [1.9, 2.45, 7], [-1.5, .55, 4.2], [-1.9, 2.45, -5], [.4, .55, -16.5], [3.4, 1.45, -31]] as Vec[],
  island: [0, -47] as [number, number],
  bounds: {min: [-30, -6, -40] as Vec, max: [30, 40, 34] as Vec},
};
export const RITE_ELEMENT: Record<FolioRite, number> = {moon: 0, wind: 1, lamp: 2, arc: 3};
export const RITE_NAME: Record<FolioRite, string> = {lamp: '点灯', arc: '接弧', wind: '转风', moon: '映月'};
export const RITE_HINT: Record<FolioRite, string> = {
  lamp: '切到火属性（按 3），在光环与金环重合时按 F 点亮灯笼。',
  arc: '切到雷属性（按 4），在光环与金环重合时按 F 接通光弧。',
  wind: '切到风属性（按 2），在光环与金环重合时按 F 吹转叶轮。',
  moon: '切到水属性（按 1），在光环与金环重合时按 F 让月池涨潮。',
};
const box = (name: string, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Box => ({name, min: [x0, y0, z0], max: [x1, y1, z1], camera: y1 - y0 > 1});
export function folioBoxes(): Box[] {
  const out: Box[] = [];
  FOLIO.stations.forEach(([x, z], i) => out.push(box('station-' + i, Math.min(x, 0) - 2.2, Math.max(x, 0) + 2.2, -1.2, FOLIO.stationTop, z - 2.6, z + 2.6)));
  FOLIO.steles.forEach((s, i) => out.push(box('stele-' + i, s.x - .5, s.x + .5, -1.2, s.top, s.z - .6, s.z + .6)));
  FOLIO.steps.forEach((s, i) => out.push(box('step-' + i, s.min[0], s.max[0], -1.2, s.top, s.min[1], s.max[1])));
  const p = FOLIO.pedestal; out.push(box('pedestal', p.min[0], p.max[0], -1.2, p.top, p.min[1], p.max[1]));
  return out;
}
export function folioWorld(): WorldDefinition {
  const surfaces: GroundSurface[] = [
    {min: [-60, -80], max: [60, 60], height: FOLIO.poolFloor},
    {min: FOLIO.causeway.min, max: FOLIO.causeway.max, height: 0},
    {min: FOLIO.pad.min, max: FOLIO.pad.max, height: 0},
  ];
  const fluids: FluidVolume[] = [{min: [-60, -80], max: [60, 60], level: FOLIO.waterLevel, sink: .14}];
  return {boxes: folioBoxes(), surfaces, fluids, bounds: FOLIO.bounds};
}
/** Station i's pulse ring: 0..1 scale relative to the gold target ring at 1. Later stations pulse faster. */
export const ritePulse = (time: number, station: number) => .5 + .62 * Math.sin(time * (1.7 + station * .45));
export const RITE_TOLERANCE = .11;
export const inWindow = (time: number, station: number) => Math.abs(ritePulse(time, station) - 1) <= RITE_TOLERANCE;
export const nearStation = (p: Vec, i: number) => {const [x, z] = FOLIO.stations[i]; return Math.hypot(p[0] - x, p[2] - z) < FOLIO.reach && p[1] > -.1;};
export const onPedestal = (p: Vec) => {const s = FOLIO.pedestal; return p[0] > s.min[0] - .2 && p[0] < s.max[0] + .2 && p[2] > s.min[1] - .2 && p[2] < s.max[1] + .2 && p[1] > s.top - .25;};
export const touchesLight = (p: Vec, light: Vec) => Math.hypot(p[0] - light[0], p[2] - light[2]) < .85 && Math.abs(p[1] + .45 - light[1]) < 1;
/** 3 gold, 2 silver, 1 bronze. */
export const folioMedal = (spec: Pick<FolioSpec, 'medals'>, seconds: number) => seconds <= spec.medals.gold ? 3 : seconds <= spec.medals.silver ? 2 : 1;
export const MEDAL_NAME = ['', '铜牌', '银牌', '金牌'];
