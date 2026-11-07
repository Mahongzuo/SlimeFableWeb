import {inland, LAKE, pathDistance, TERRACE, lakeEdge} from '../world/map';
import {fence, signpost, trees, tufts} from './kit';
import type {ZoneBuilder} from './types';
import {critterField} from './critter-field';
import {fishingSpot} from './fishing-spot';

/** lake zone (starter content; see tasks/cards). */
export const lake: ZoneBuilder = z => {
  const {T} = z, root = new T.Group(), [cx, cz] = LAKE.center;
  const water = new T.Mesh(new T.CircleGeometry(1, 64).rotateX(-Math.PI / 2), z.ctx.mats.flat(0x5fb3b0, {transparent: true, opacity: .78, depthWrite: false}));
  water.name = 'lake-water'; water.scale.set(LAKE.rx * 1.08, 1, LAKE.rz * 1.08); water.position.set(cx, LAKE.level, cz); root.add(water);
  // pier from the south shore
  const deckY = LAKE.level + .55, pier = new T.Group(); pier.name = 'pier';
  const deck = new T.Mesh(new T.BoxGeometry(2.2, .18, 12), z.toon(0xb08a5f)); deck.position.set(cx, deckY, cz - LAKE.rz + 4.5); deck.castShadow = deck.receiveShadow = true; pier.add(deck);
  for (const dx of [-1, 1]) for (let k = 0; k < 5; k++) { const p = new T.Mesh(new T.CylinderGeometry(.11, .11, 2.2, 6), z.toon(0x7a5a3f)); p.position.set(cx + dx * 1.05, deckY - .9, cz - LAKE.rz - 1 + k * 2.8); pier.add(p); }
  root.add(pier);
  const fish = fishingSpot(z, 'fish-pier', [cx, deckY, cz - LAKE.rz + 10], [0, 1], 'lake');
  root.add(signpost(z, cx + 3.5, cz - LAKE.rz - 4, Math.PI, '镜湖', '码头尽头可以钓鱼'));
  const spots: [number, number, number][] = [];
  for (let i = 0; i < 40; i++) { const x = -28 + z.rand() * 57, zz = 82 + z.rand() * 58; if (lakeEdge(x, zz) > 1.35 && pathDistance(x, zz) > 3) spots.push([x, zz, .8 + z.rand() * .6]); }
  root.add(trees(z, spots));
  const critters = critterField(z, root, 'lake', [[-22, 110], [24, 106], [-12, 128], [16, 126], [-24, 98], [26, 120]]);
  return {root, update: (t, dt, p) => { fish(t, dt, p); critters(t, dt, p); }};
};
