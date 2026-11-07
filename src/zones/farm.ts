import {inland, LAKE, pathDistance, TERRACE, lakeEdge} from '../world/map';
import {fence, signpost, trees, tufts} from './kit';
import type {ZoneBuilder} from './types';
import {farmLoop, type PlotSpot} from './farm-loop';
import {critterField} from './critter-field';

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
  const soil = z.toon(0x8b6b4a), plots: PlotSpot[] = [];
  for (let k = 1; k <= 3; k++) for (let r = 0; r < 3; r++) {
    const x = TERRACE.first - (k - .5) * TERRACE.width, zz = 8 + r * 6, plot = new T.Mesh(new T.BoxGeometry(7, .16, 4), soil); plot.name = 'farm-plot';
    const y = inland(x, zz) + .02; plot.position.set(x, y, zz); plot.receiveShadow = true; root.add(plot); plots.push({id: `farm-${k}-${r}`, x, z: zz, y: y + .08});
  }
  // market stall: buying station + seed stand (simple boxes until the farm card dresses it)
  const stall = {x: -35, z: -8}, wood = z.toon(0xb08a5f), awning = z.toon(0xe8735a);
  for (const dx of [0, 3]) { const counter = new T.Mesh(new T.BoxGeometry(2.2, .9, .8), wood); counter.position.set(stall.x + dx, inland(stall.x + dx, stall.z) + .45, stall.z); counter.castShadow = true; counter.name = 'stall-counter'; root.add(counter);
    const roof = new T.Mesh(new T.BoxGeometry(2.6, .12, 1.6), awning); roof.position.set(stall.x + dx, inland(stall.x + dx, stall.z) + 2.1, stall.z + .2); roof.rotation.x = -.2; roof.castShadow = true; roof.userData.walkThrough = true; root.add(roof); }
  const update = farmLoop(z, root, plots, {x: stall.x, z: stall.z + 1.4});
  root.add(fence(z, [[-31, -29], [-31, -6], ], 0xe9dfc9));
  root.add(tufts(z, 700, {min: [-105, -30], max: [-31, 29]}, (x, zz) => pathDistance(x, zz) < 2.4));
  const bugs = critterField(z, root, 'farm', plots.map(p => [p.x + 2, p.z - 1.4] as [number, number]));
  return {root, update: (t, dt, p) => { update(t, dt, p); bugs(t, dt, p); }};
};
