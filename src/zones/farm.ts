import {inland, LAKE, pathDistance, TERRACE, lakeEdge} from '../world/map';
import {fence, signpost, trees, tufts} from './kit';
import type {ZoneBuilder} from './types';

/** farm zone (starter content; see tasks/cards). */
export const farm: ZoneBuilder = z => {
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
