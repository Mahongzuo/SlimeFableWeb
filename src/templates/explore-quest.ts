import type {Box, Vec} from '../slime/types';
import type {LevelSpec, SlotKind} from '../../content/levels/types';
import type {Layout, Lot, Prop, Spot} from './types';
import {rng, Rng} from './random';
/**
 * explore-quest v1: a walled district (44 × 26 m) — start plaza, main lane with two rows of houses split by
 * alleys, back yards, and a far plaza. Actors and items are placed into the slot kinds the spec asks for.
 * Pure data; geometry comes later from a theme kit.
 */
const X0 = -22, X1 = 22, Z0 = -13, Z1 = 13, LANE = 3.5, ROW_X0 = -11.5, ROW_X1 = 12.5;
export function generateExplore(spec: LevelSpec): Layout {
  const r = rng(spec.seed), lots: Lot[] = [], props: Prop[] = [], spots: Record<string, Spot> = {};
  let pid = 0;
  const prop = (kind: Prop['kind'], x: number, z: number, w: number, d: number, h: number, solid = true, extra: Partial<Prop> = {}): Prop => { const p: Prop = {id: kind + '-' + pid++, kind, x, z, y: 0, w, d, h, rot: 0, solid, ...extra}; props.push(p); return p; };
  // perimeter walls
  prop('fence', 0, Z0 - .2, X1 - X0 + .8, .4, 1.6); prop('fence', 0, Z1 + .2, X1 - X0 + .8, .4, 1.6);
  prop('fence', X0 - .2, 0, .4, Z1 - Z0, 1.6); prop('fence', X1 + .2, 0, .4, Z1 - Z0, 1.6);
  // two rows of houses facing the lane, each split by one or two alleys
  const alleys: {x: number; side: 1 | -1}[] = [], rowFar: Record<number, number> = {};
  for (const side of [1, -1] as const) {
    const depth = r.range(5, 6.5), near = side * LANE, far = side * (LANE + depth); rowFar[side] = LANE + depth;
    const widths: number[] = []; let x = ROW_X0;
    while (x < ROW_X1 - .5) { let w = r.range(3.6, 5.4); if (ROW_X1 - (x + w) < 3) w = ROW_X1 - x; widths.push(w); x += w; }
    const gaps = new Set<number>(); const want = widths.length > 4 ? 2 : 1;
    while (gaps.size < want) gaps.add(r.int(1, widths.length - 2));
    x = ROW_X0;
    widths.forEach((w, i) => {
      const gap = gaps.has(i);
      if (gap) { alleys.push({x: x + w / 2, side}); x += w; return; }
      lots.push({id: `row${side > 0 ? 'N' : 'S'}-${i}`, min: [x + .05, Math.min(near, far)], max: [x + w - .05, Math.max(near, far)], height: r.range(4.2, 6.4), roof: r.chance(.75) ? 'gable' : 'flat', ridgeAlongX: true, style: r.int(0, 3), door: {x: x + w / 2, z: near, facing: [0, 0, -side]}});
      x += w;
    });
  }
  // start plaza: print shop (north), a low roof reached from a crate stack (south), benches
  lots.push({id: 'shop', min: [-20.5, 5.5], max: [-14, 12.5], height: 5, roof: 'gable', ridgeAlongX: true, style: 9, door: {x: -17.25, z: 5.5, facing: [0, 0, -1]}});
  lots.push({id: 'low', min: [-20.5, -12.5], max: [-15.6, -7.2], height: 1.9, roof: 'flat', ridgeAlongX: true, style: 8});
  prop('crate-stack', -14.9, -8.3, 1.1, 1.1, .9);
  prop('press', -15.1, 4.7, 1.3, .9, 1.15);
  prop('bench', -18.5, -3.6, 1.8, .5, .45); prop('bench', -14.5, 3.4, 1.8, .5, .45, true, {rot: 0});
  // far plaza: cabinet against the north wall, two split pads far apart (the body can only press one)
  prop('cabinet', 19.6, 11.9, 1.6, .7, 1.7);
  const padA: Spot = {id: 'pad-a', x: 17.6, y: 0, z: 8.4, kind: 'pad'}, padB: Spot = {id: 'pad-b', x: 17.6, y: 0, z: -8.6, kind: 'pad'};
  prop('pad', padA.x, padA.z, 1.1, 1.1, .05, false); prop('pad', padB.x, padB.z, 1.1, 1.1, .05, false);
  // lamps along the lane, crates in yards and plazas
  for (let x = -9; x <= 11; x += 6.5) { prop('lamp', x, LANE - .45, .22, .22, 3.3); prop('lamp', x + 3.2, -LANE + .45, .22, .22, 3.3); }
  const yardCells: [number, number][] = [];
  for (const side of [1, -1]) for (let i = 0; i < 7; i++) yardCells.push([r.range(ROW_X0 + 1, ROW_X1 - 1), side * r.range(10.8, 12.2)]);
  for (const [x, z] of yardCells.slice(0, 6)) r.chance(.5) ? prop('crate', x, z, .9, .9, .9) : prop('barrel', x, z, .7, .7, 1);
  // hidden nook: a dead end in the north-east yard closed by two crate stacks
  const nook: Vec = [11.6, 0, 11.9];
  prop('crate-stack', 10.2, 11.9, 1.1, 1.1, 1.3); prop('crate-stack', 11.6, 10.3, 1.4, 1.1, 1.3);
  // ---- slot candidates (ground points, or roof / cabinet / nook)
  // halfway between the back of the row and the perimeter wall, whatever depth the row was given
  const yardLine = (side: number) => side * (rowFar[side] + (Z1 - rowFar[side]) * r.range(.4, .6));
  const cands: Record<SlotKind, Spot[]> = {
    'plaza-a': [{id: '', x: -17.25, y: 0, z: 4.2, kind: 'plaza-a', facing: Math.PI}],
    'plaza-b': [[15.5, 2.2], [20.5, -2.5], [15, -4.6], [20.8, 4.3]].map(([x, z]) => ({id: '', x, y: 0, z, kind: 'plaza-b'})),
    lane: [-8, -3, 2, 7, 11].map(x => ({id: '', x: x + r.range(-1, 1), y: 0, z: r.range(-1.6, 1.6), kind: 'lane'})),
    alley: alleys.map(a => ({id: '', x: a.x, y: 0, z: a.side * (LANE + 2.6), kind: 'alley'})),
    yard: [1, -1, 1, -1, 1, -1].map((s, i) => ({id: '', x: ROW_X0 + 2 + i * 3.4 + r.range(-.6, .6), y: 0, z: yardLine(s), kind: 'yard'})),
    roof: [{id: '', x: -18, y: 1.9, z: -9.8, kind: 'roof'}],
    cabinet: [{id: '', x: 19.6, y: 0, z: 10.9, kind: 'cabinet'}],
    hidden: [{id: '', x: nook[0], y: 0, z: nook[2], kind: 'hidden'}],
  };
  const taken: Spot[] = [];
  const place = (id: string, kind: SlotKind) => {
    const list = cands[kind];
    const free = list.filter(c => taken.every(t => Math.hypot(t.x - c.x, t.z - c.z) > 2.2));
    const c = (free.length ? free : list)[Math.floor(r.next() * (free.length || list.length))];
    const s: Spot = {...c, id}; taken.push(s); spots[id] = s;
  };
  for (const [id, a] of Object.entries(spec.actors)) place(id, a.slot);
  for (const [id, it] of Object.entries(spec.items)) place(id, it.slot);
  // loose crates and barrels never sit on a target
  for (let i = props.length - 1; i >= 0; i--) { const p = props[i]; if ((p.kind === 'crate' || p.kind === 'barrel') && taken.some(t => Math.hypot(t.x - p.x, t.z - p.z) < 1.2)) props.splice(i, 1); }
  // signs on a few house fronts
  const signs = spec.signs ?? [];
  lots.filter(l => l.door && l.id.startsWith('row')).slice(0, signs.length).forEach((l, i) => { const f = l.door!.facing[2]; prop('sign', l.door!.x, l.door!.z + f * .08, 1.6, .08, .5, false, {y: 2.6, text: signs[i], rot: f > 0 ? 0 : Math.PI}); });
  const boxes: Box[] = [
    ...lots.map(l => ({name: 'lot:' + l.id, min: [l.min[0], 0, l.min[1]] as Vec, max: [l.max[0], l.height, l.max[1]] as Vec, camera: true})),
    ...props.filter(p => p.solid).map(p => ({name: 'prop:' + p.id, min: [p.x - p.w / 2, p.y, p.z - p.d / 2] as Vec, max: [p.x + p.w / 2, p.y + p.h, p.z + p.d / 2] as Vec, camera: p.h > 1.2})),
  ];
  const cab = spec.items && Object.entries(spec.items).find(([, it]) => it.slot === 'cabinet')?.[0];
  return {seed: spec.seed, bounds: {min: [X0, Z0], max: [X1, Z1]}, spawn: [-18, 0, 0], spawnYaw: -Math.PI / 2, lots, props, boxes, spots, pads: cab ? {a: padA, b: padB, reward: cab} : undefined};
}
