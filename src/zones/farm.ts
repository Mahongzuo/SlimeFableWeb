import {inland, pathDistance, TERRACE} from '../world/map';
import {fence, signpost, tufts} from './kit';
import type {ZoneBuilder} from './types';
import {farmLoop, type PlotSpot} from './farm-loop';
import {critterField} from './critter-field';

/** farm zone (starter content; see tasks/cards). */
export const farm: ZoneBuilder = z => {
  const {T} = z, root = new T.Group();
  // Repeated solid details share a draw call; all dimensions are in metres.
  type Block = {position: number[]; size: number[]; color: number; rz: number; rx: number};
  const batches = new Map<string, Block[]>();
  const block = (name: string, color: number, x: number, y: number, zz: number, w: number, h: number, d: number, rz = 0, rx = 0) => {
    if (!batches.has(name)) batches.set(name, []);
    batches.get(name)!.push({position: [x, y, zz], size: [w, h, d], color, rz, rx});
  };
  const wood = 0xa77a4e, trim = 0xf4e7cc, straw = 0xd9b65e;
  // Preserve the original wall envelope and the exact path openings.
  for (let k = 0; k < TERRACE.count; k++) {
    const x = TERRACE.first - k * TERRACE.width, lo = k * TERRACE.rise, hi = (k + 1) * TERRACE.rise;
    let gz = 0, best = Infinity; for (let zz = -30; zz <= 30; zz += .25) { const d = pathDistance(x + .5, zz); if (d < best) { best = d; gz = zz; } }
    for (const [z0, z1] of [[-30.5, gz - 2.2], [gz + 2.2, 30]] as const) {
      const bottom = lo - .2, top = hi + .12;
      let y = bottom;
      for (let row = 0; row < 4; row++) {
        const h = row === 3 ? top - y : (top - bottom) * (.22 + z.rand() * .06);
        let zz = z0;
        while (zz < z1) {
          const length = Math.min(z1 - zz, .65 + z.rand() * .7);
          const depth = zz === z0 ? 1 : .88 + z.rand() * .12;
          block('terrace-wall', [0xb9ad97, 0xa89c89, 0xc7baa3, 0xb1a48f][Math.floor(z.rand() * 4)],
            x + depth / 2, y + h / 2, zz + length / 2, depth, h, length);
          zz += length;
        }
        y += h;
      }
    }
    // Follow the lowered path terrain, rather than the taller wall cap.
    // Five full-depth steps bridge the actual terrain discontinuity.
    const low = inland(x + 2.5, gz), high = inland(x - .05, gz);
    for (let step = 0; step < 5; step++) {
      const top = low + (high - low) * (step + 1) / 5;
      block('terrace-stairs', 0xc4b8a1, x + 2.25 - step * .5, (low - .15 + top) / 2, gz,
        .5, top - low + .15, 4.4);
    }
  }
  root.add(signpost(z, -33, 8, -Math.PI / 2, '梯田农场', '播种 · 浇水 · 收获'));
  const soil = z.toon(0x8b6b4a), plots: PlotSpot[] = [];
  for (let k = 1; k <= 3; k++) for (let r = 0; r < 3; r++) {
    const x = TERRACE.first - (k - .5) * TERRACE.width, zz = 8 + r * 6, plot = new T.Mesh(new T.BoxGeometry(7, .16, 4), soil); plot.name = 'farm-plot';
    const y = inland(x, zz) + .02; plot.position.set(x, y, zz); plot.receiveShadow = true; root.add(plot); plots.push({id: `farm-${k}-${r}`, x, z: zz, y: y + .08});
  }
  // Low bed frames leave the original crop coordinates and heights intact.
  for (const p of plots) {
    for (const side of [-1, 1]) {
      block('plot-frame', wood, p.x, p.y + .075, p.z + side * 2.1, 7.4, .15, .2);
      block('plot-frame', wood, p.x + side * 3.6, p.y + .075, p.z, .2, .15, 4);
    }
  }
  // Short fence runs behind the beds; the paths and harvesting sides stay open.
  for (let k = 1; k <= TERRACE.count; k++) {
    const x = TERRACE.first - (k - .5) * TERRACE.width;
    root.add(fence(z, [[x - 4, 25], [x + 4, 25]], trim, .55));
    const zz = 23, y = inland(x, zz);
    block('scarecrow-timber', wood, x, y + 1, zz, .12, 2, .12);
    block('scarecrow-shirt', k % 2 ? 0xbd7155 : 0x729c92, x, y + 1.35, zz, .55, .65, .3);
    block('scarecrow-shirt', 0xbd7155, x, y + 1.55, zz, 1.5, .18, .2, -.08);
    block('scarecrow-head', straw, x, y + 1.92, zz, .38, .38, .35);
    block('scarecrow-hat', wood, x, y + 2.13, zz, .75, .08, .65);
    block('scarecrow-hat', straw, x, y + 2.25, zz, .4, .22, .38);
    for (const dx of [-.09, .09]) block('scarecrow-eyes', 0x40362e, x + dx, y + 1.96, zz + .181, .045, .045, .02);
  }
  // Fourth terrace barn: an open south doorway, white timber and climbable gable roof.
  const bx = -77, bz = 15, by = inland(bx, bz);
  block('barn-wall', 0xb65040, bx - 2.7, by + 1.5, bz, .2, 3, 6);
  block('barn-wall', 0xb65040, bx + 2.7, by + 1.5, bz, .2, 3, 6);
  block('barn-wall', 0xb65040, bx, by + 1.5, bz - 3, 5.6, 3, .2);
  for (const side of [-1, 1]) {
    block('barn-wall', 0xb65040, bx + side * 1.95, by + 1.5, bz + 3, 1.7, 3, .2);
    block('barn-trim', trim, bx + side * 1.1, by + 1.4, bz + 3.13, .13, 2.8, .15);
    for (const dz of [-3, 3]) block('barn-trim', trim, bx + side * 2.72, by + 1.5, bz + dz, .18, 3, .18);
    block('barn-roof', 0x655c51, bx + side * 1.45, by + 3.7, bz, 3.25, .16, 6.6, -side * Math.atan2(1.4, 2.9));
    // Doors fold outward along the side of the opening.
    block('barn-door', 0x963e34, bx + side * 1.28, by + 1.3, bz + 3.65, .13, 2.6, 1.3);
    block('barn-trim', trim, bx + side * 1.28, by + .12, bz + 3.65, .16, .12, 1.3);
  }
  block('barn-trim', trim, bx, by + 2.85, bz + 3.12, 2.3, .18, .2);
  // Solid triangular gables beneath the roof.
  const shape = new T.Shape(); shape.moveTo(-2.7, 0); shape.lineTo(2.7, 0); shape.lineTo(0, 1.3); shape.closePath();
  for (const dz of [-3, 2.9]) {
    const gable = new T.Mesh(new T.ExtrudeGeometry(shape, {depth: .1, bevelEnabled: false}), z.toon(0xb65040));
    gable.name = 'barn-gable'; gable.position.set(bx, by + 3, bz + dz); gable.castShadow = true; root.add(gable);
  }
  for (let i = 0; i < 5; i++) {
    const x = bx - 1.6 + (i % 2) * 1.2, y = by + .35 + Math.floor(i / 2) * .65;
    block('barn-hay', straw, x, y, bz - 1.8, 1.1, .65, 1.2);
    block('barn-hay-binding', wood, x, y, bz - 1.8, .08, .67, 1.22);
  }
  for (let i = 0; i < 12; i++) {
    const height = (i + 1) * .25;
    block('barn-roof-stairs', wood, bx + 3.2, by + height / 2, bz + 3.2 - i * .45, .8, height, .45);
  }
  // Small wheelbarrow beside the barn.
  const cx = -80, cz = 21, cy = inland(cx, cz);
  block('cart-bed', wood, cx, cy + .5, cz, 1.1, .12, 1.4);
  for (const side of [-1, 1]) {
    block('cart-sides', wood, cx + side * .53, cy + .75, cz, .1, .5, 1.4);
    block('cart-handles', wood, cx + side * .4, cy + .5, cz + 1, .08, .08, 1.2);
    block('cart-legs', wood, cx + side * .4, cy + .22, cz + .45, .1, .45, .1);
  }
  block('cart-sides', wood, cx, cy + .75, cz - .65, 1.1, .5, .1);
  const wheel = new T.Mesh(new T.CylinderGeometry(.36, .36, .18, 12), z.toon(0x51483c));
  wheel.name = 'cart-wheel'; wheel.rotation.z = Math.PI / 2; wheel.position.set(cx, cy + .36, cz - .8); root.add(wheel);
  // Stone ring is solid; the inset water is explicitly excluded from baking.
  const wx = -58, wz = -12, wy = inland(wx, wz);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 12; i++) {
    const angle = (i + row * .5) * Math.PI / 6;
    const stone = new T.Mesh(new T.BoxGeometry(.5, .3, .32), z.toon(row % 2 ? 0xb9ad97 : 0xc7baa3));
    stone.name = 'well-stone'; stone.position.set(wx + Math.sin(angle) * .95, wy + .15 + row * .3, wz + Math.cos(angle) * .95); stone.rotation.y = angle; root.add(stone);
  }
  const water = new T.Mesh(new T.CircleGeometry(.78, 24), z.toon(0x629fa7));
  water.name = 'well-water'; water.rotation.x = -Math.PI / 2; water.position.set(wx, wy + .35, wz); root.add(water);
  for (const side of [-1, 1]) block('well-post', wood, wx + side * 1.2, wy + 1.2, wz, .15, 2.4, .15);
  block('well-beam', wood, wx, wy + 2.4, wz, 2.6, .18, .2);
  // Copper weathercock swivels as one non-solid assembly.
  const vx = -79, vz = 10, vy = inland(vx, vz);
  block('weathervane-pole', wood, vx, vy + 2, vz, .12, 4, .12);
  const rooster = new T.Group(); rooster.name = 'weathercock-fx'; rooster.position.set(vx, vy + 4.15, vz); root.add(rooster);
  for (const [x, y, w, h, color] of [[0, 0, .65, .4, 0xc39347], [.32, .3, .25, .3, 0xc39347], [.36, .5, .22, .12, 0xb64c3c], [.53, .3, .22, .1, 0xe3b453], [-.42, .2, .35, .48, 0x6c8c79]]) {
    const part = new T.Mesh(new T.BoxGeometry(w, h, .12), z.toon(color)); part.name = 'rooster-fx'; part.position.set(x, y, 0); rooster.add(part);
  }
  const stall = {x: -35, z: -8};
  for (const dx of [0, 3]) {
    const x = stall.x + dx, y = inland(x, stall.z);
    block('stall-counter', wood, x, y + .9, stall.z, 2.2, .16, .9);
    for (const sx of [-.95, .95]) for (const dz of [-.35, .65]) block('stall-post', wood, x + sx, y + 1.1, stall.z + dz, .12, 2.2, .12);
    for (let i = 0; i < 8; i++) block('stall-front', wood, x - .96 + i * .275, y + .45, stall.z + .43, .24, .75, .08);
    for (let i = 0; i < 6; i++) block('stall-awning-fx', i % 2 ? trim : dx ? 0x7f9e70 : 0xe8735a,
      x - 1.083 + i * .433, y + 2.2, stall.z + .2, .434, .12, 1.6, 0, -.2);
    const sign = signpost(z, x, stall.z, 0, dx ? '种子铺' : '收购站');
    // Reuse the shared canvas sign, hanging just the board under the canopy.
    const board = sign.children[sign.children.length - 1]; sign.remove(board); board.position.set(x, y + 1.7, stall.z + .85); root.add(board);
    for (let i = 0; i < 3; i++) block('stall-goods', dx ? straw : 0x8d9e58, x - .65 + i * .65, y + 1.08, stall.z, .45, .22, .5);
  }
  for (const [name, blocks] of batches) {
    const mesh = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), z.toon(0xffffff), blocks.length);
    mesh.name = name; mesh.castShadow = mesh.receiveShadow = true;
    const matrix = new T.Matrix4(), rotation = new T.Quaternion();
    blocks.forEach((b, i) => {
      rotation.setFromEuler(new T.Euler(b.rx, 0, b.rz));
      matrix.compose(new T.Vector3(...b.position), rotation, new T.Vector3(...b.size));
      mesh.setMatrixAt(i, matrix); mesh.setColorAt(i, new T.Color(b.color));
    });
    root.add(mesh);
  }
  const update = farmLoop(z, root, plots, {x: stall.x, z: stall.z + 1.4});
  root.add(fence(z, [[-31, -29], [-31, -6], ], 0xe9dfc9));
  root.add(tufts(z, 700, {min: [-105, -30], max: [-31, 29]}, (x, zz) => pathDistance(x, zz) < 2.4));
  const bugs = critterField(z, root, 'farm', plots.map(p => [p.x + 2, p.z - 1.4] as [number, number]));
  return {root, update: (t, dt, p) => { update(t, dt, p); bugs(t, dt, p); rooster.rotation.y = .35 + Math.sin(t * .22) * .6; }};
};
