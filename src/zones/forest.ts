import {inland, LAKE, pathDistance, TERRACE, lakeEdge} from '../world/map';
import {fence, signpost, trees, tufts} from './kit';
import type {ZoneBuilder} from './types';
import {critterField} from './critter-field';

/** forest zone (starter content; see tasks/cards). */
export const forest: ZoneBuilder = z => {
  const {T} = z, root = new T.Group(), spots: [number, number, number][] = [];
  for (let i = 0; i < 260; i++) { const x = -104 + z.rand() * 72, zz = 32 + z.rand() * 108; if (pathDistance(x, zz) > 3.2) spots.push([x, zz, .9 + z.rand() * .9]); }
  root.add(trees(z, spots, [0x3f7a4c, 0x4f8a50, 0x5d9656, 0x356b45]));
  root.add(signpost(z, -33, 53, -Math.PI / 2, '松果林', '轻手轻脚，小动物会躲'));
  root.add(tufts(z, 1200, {min: [-105, 31], max: [-31, 141]}, (x, zz) => pathDistance(x, zz) < 2.4, [0x6e9e5a, 0xd9c26b, 0xc98fb8, 0xffffff]));
  const homes: [number, number][] = [];
  for (let i = 0; i < 28; i++) { const x = -100 + z.rand() * 64, zz = 36 + z.rand() * 100; homes.push([x, zz]); }
  return {root, update: critterField(z, root, 'forest', homes)};
};
