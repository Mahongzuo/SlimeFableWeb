import {rng} from '../templates/random';
import {inland, LAKE, pathDistance, TERRACE, ZONES, lakeEdge, type ZoneId} from '../world/map';
import {fence, signpost, trees, tufts} from './kit';
import type {Interactable, PlayerHandle, ZoneBuild, ZoneBuilder, ZoneContext} from './types';
import type {LifeData} from '../life/state';
/**
 * Starter content for each Home zone. Cards replace these builders one by one (tasks/cards/1107-1x-*);
 * the contract stays the same: build under `root`, sit on `ground`, register interactions.
 */
const park: ZoneBuilder = z => {
  const {T} = z, root = new T.Group();
  root.add(signpost(z, 15, 33.5, Math.PI, '风车公园', '往北 · 镜湖'));
  const spots: [number, number, number][] = [];
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, r = 19 + z.rand() * 4; const x = 0 + Math.cos(a) * r * 1.3, zz = 55 + Math.sin(a) * r; if (pathDistance(x, zz) > 3 && x > -29 && x < 30) spots.push([x, zz, .8 + z.rand() * .5]); }
  root.add(trees(z, spots, [0x7fb35f, 0x9cc46a, 0x6aa65c]));
  root.add(tufts(z, 900, {min: [-29, 31], max: [30, 79]}, (x, zz) => pathDistance(x, zz) < 2.4));
  return {root};
};
const lake: ZoneBuilder = z => {
  const {T} = z, root = new T.Group(), [cx, cz] = LAKE.center;
  const water = new T.Mesh(new T.CircleGeometry(1, 64).rotateX(-Math.PI / 2), z.ctx.mats.flat(0x5fb3b0, {transparent: true, opacity: .78, depthWrite: false}));
  water.name = 'lake-water'; water.scale.set(LAKE.rx * 1.08, 1, LAKE.rz * 1.08); water.position.set(cx, LAKE.level, cz); root.add(water);
  // pier from the south shore
  const deckY = LAKE.level + .55, pier = new T.Group(); pier.name = 'pier';
  const deck = new T.Mesh(new T.BoxGeometry(2.2, .18, 12), z.toon(0xb08a5f)); deck.position.set(cx, deckY, cz - LAKE.rz + 4.5); deck.castShadow = deck.receiveShadow = true; pier.add(deck);
  for (const dx of [-1, 1]) for (let k = 0; k < 5; k++) { const p = new T.Mesh(new T.CylinderGeometry(.11, .11, 2.2, 6), z.toon(0x7a5a3f)); p.position.set(cx + dx * 1.05, deckY - .9, cz - LAKE.rz - 1 + k * 2.8); pier.add(p); }
  root.add(pier);
  z.interact({id: 'fish-pier', position: [cx, deckY, cz - LAKE.rz + 10], radius: 1.8, prompt: () => ({title: '钓鱼点', sub: '钓鱼玩法正在施工'}), act: () => {}});
  root.add(signpost(z, cx + 3.5, cz - LAKE.rz - 4, Math.PI, '镜湖', '码头尽头可以钓鱼'));
  const spots: [number, number, number][] = [];
  for (let i = 0; i < 40; i++) { const x = -28 + z.rand() * 57, zz = 82 + z.rand() * 58; if (lakeEdge(x, zz) > 1.35 && pathDistance(x, zz) > 3) spots.push([x, zz, .8 + z.rand() * .6]); }
  root.add(trees(z, spots));
  return {root};
};
const farm: ZoneBuilder = z => {
  const {T} = z, root = new T.Group(), stone = z.toon(0xb9ad97);
  // retaining walls between terraces; a 4 m gap where the path climbs
  for (let k = 0; k < TERRACE.count; k++) {
    const x = TERRACE.first - k * TERRACE.width, lo = k * TERRACE.rise, hi = (k + 1) * TERRACE.rise;
    let gz = 0, best = Infinity; for (let zz = -30; zz <= 30; zz += .25) { const d = pathDistance(x + .5, zz); if (d < best) { best = d; gz = zz; } }
    for (const [z0, z1] of [[-30.5, gz - 2.2], [gz + 2.2, 30]] as const) {
      const bottom = lo - .2, top = hi + .12, wall = new T.Mesh(new T.BoxGeometry(1, top - bottom, z1 - z0), stone); wall.name = 'terrace-wall';
      wall.position.set(x + .5, (bottom + top) / 2, (z0 + z1) / 2); wall.castShadow = wall.receiveShadow = true; root.add(wall);
    }
  }
  root.add(signpost(z, -33, 8, -Math.PI / 2, '梯田农场', '播种 · 浇水 · 收获'));
  const soil = z.toon(0x8b6b4a);
  for (let k = 1; k <= 3; k++) for (let r = 0; r < 3; r++) {
    const x = TERRACE.first - (k - .5) * TERRACE.width, zz = 8 + r * 6, plot = new T.Mesh(new T.BoxGeometry(7, .16, 4), soil); plot.name = 'farm-plot';
    plot.position.set(x, inland(x, zz) + .02, zz); plot.receiveShadow = true; root.add(plot);
  }
  root.add(fence(z, [[-31, -29], [-31, -6], ], 0xe9dfc9));
  root.add(tufts(z, 700, {min: [-105, -30], max: [-31, 29]}, (x, zz) => pathDistance(x, zz) < 2.4));
  return {root};
};
const forest: ZoneBuilder = z => {
  const {T} = z, root = new T.Group(), spots: [number, number, number][] = [];
  for (let i = 0; i < 260; i++) { const x = -104 + z.rand() * 72, zz = 32 + z.rand() * 108; if (pathDistance(x, zz) > 3.2) spots.push([x, zz, .9 + z.rand() * .9]); }
  root.add(trees(z, spots, [0x3f7a4c, 0x4f8a50, 0x5d9656, 0x356b45]));
  root.add(signpost(z, -33, 53, -Math.PI / 2, '松果林', '轻手轻脚，小动物会躲'));
  root.add(tufts(z, 1200, {min: [-105, 31], max: [-31, 141]}, (x, zz) => pathDistance(x, zz) < 2.4, [0x6e9e5a, 0xd9c26b, 0xc98fb8, 0xffffff]));
  return {root};
};
export const zoneBuilders: Partial<Record<ZoneId, ZoneBuilder>> = {park, lake, farm, forest};

export interface BuiltZones {roots: any[]; interactables: Interactable[]; updates: ((t: number, dt: number, p: PlayerHandle) => void)[]}
export function buildZones(ctx: any, life: LifeData, save: () => void): BuiltZones {
  const T = ctx.THREE, out: BuiltZones = {roots: [], interactables: [], updates: []};
  for (const rect of ZONES) {
    const build = zoneBuilders[rect.id]; if (!build) continue;
    const z: ZoneContext = {ctx, T, rect, ground: inland, rand: rng('zone-' + rect.id).next, toon: (c, o) => ctx.mats.toon(c, o), interact: i => out.interactables.push(i), life, save};
    const b: ZoneBuild = build(z); b.root.name = 'zone-' + rect.id; ctx.scene.add(b.root); out.roots.push(b.root);
    if (b.update) out.updates.push(b.update);
  }
  return out;
}
