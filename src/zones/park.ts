import {inland, LAKE, pathDistance, TERRACE, lakeEdge} from '../world/map';
import {fence, signpost, trees, tufts} from './kit';
import type {ZoneBuilder} from './types';

/** park zone (starter content; see tasks/cards). */
export const park: ZoneBuilder = z => {
  const {T} = z, root = new T.Group();
  root.add(signpost(z, 15, 33.5, Math.PI, '风车公园', '往北 · 镜湖'));
  const spots: [number, number, number][] = [];
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, r = 19 + z.rand() * 4; const x = 0 + Math.cos(a) * r * 1.3, zz = 55 + Math.sin(a) * r; if (pathDistance(x, zz) > 3 && x > -29 && x < 30) spots.push([x, zz, .8 + z.rand() * .5]); }
  root.add(trees(z, spots, [0x7fb35f, 0x9cc46a, 0x6aa65c]));
  root.add(tufts(z, 900, {min: [-29, 31], max: [30, 79]}, (x, zz) => pathDistance(x, zz) < 2.4));
  return {root};
};
