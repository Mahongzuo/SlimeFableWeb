/**
 * 凝露港's hill houses, rebuilt as Zhe-Min coastal village houses on the original lots (platform and stone walls stay).
 * The bundle builds each Japanese house body into an unmerged `jp-house-body` group (scripts/localize-harbor.mjs);
 * we drop it and put a Chinese house of the same footprint and eave height in its place, before collision is baked.
 * Styles: granite-and-plaster house with stepped 马头墙 gables, or a red-brick 古厝 with a swallowtail (燕尾) ridge.
 */
type Lot = {id: string; w: number; d: number; floors: number; door?: boolean; lit?: boolean; frameInfo?: {eaveY: number}};
const C = {granite: 0xb8b1a3, graniteDark: 0x9c9586, plaster: 0xf0ebdf, brick: 0xb65a40, brickDark: 0x96452f, tile: 0x5d6266, tileDark: 0x464b4f,
  ridge: 0x3f4447, wood: 0x7a4a2c, woodDark: 0x5a341f, paper: 0xf4ead2, red: 0xc8392b, gold: 0xe8c15a, lattice: 0x6b4a33};

/** Collect boxes per colour, then merge each colour into one mesh (keeps draw calls low). */
class Batch {
  private parts = new Map<number, number[][]>(); private T: any; private m = (): any => new this.T.Matrix4();
  constructor(private ctx: any) { this.T = ctx.THREE; }
  box(color: number, sx: number, sy: number, sz: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
    const T = this.T, g = new T.BoxGeometry(sx, sy, sz).toNonIndexed(), m = this.m().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(1, 1, 1));
    g.applyMatrix4(m); const list = this.parts.get(color) ?? []; list.push(Array.from(g.attributes.position.array as Float32Array), Array.from(g.attributes.normal.array as Float32Array)); this.parts.set(color, list); g.dispose();
  }
  build(parent: any, name: string, emissive: Record<number, number> = {}) {
    const T = this.T;
    for (const [color, list] of this.parts) {
      const pos: number[] = [], nor: number[] = []; for (let i = 0; i < list.length; i += 2) { pos.push(...list[i]); nor.push(...list[i + 1]); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
      const mesh = new T.Mesh(g, this.ctx.mats.toon(color, emissive[color] ? {emissive: color, emissiveIntensity: emissive[color]} : {})); mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh);
    }
  }
}

export function buildChineseHouses(ctx: any) {
  const lots: {lot: Lot; group: any}[] = (globalThis as any).__harborLots ?? [];
  for (const {lot, group} of lots) {
    const body = group.getObjectByName('jp-house-body'); if (body) group.remove(body);
    const house = new ctx.THREE.Group(); house.name = 'cn-house-' + lot.id; group.add(house);
    (lot.id === 'H2' ? brickHouse : stoneHouse)(ctx, house, lot);
  }
  return lots.length;
}

/** Shared shell: plinth, walls, roof along x with tiles, eaves at the original height. Returns key heights. */
function shell(b: Batch, lot: Lot, wall: number, trim: number, stoneBand: boolean) {
  const l = lot.w, c = lot.d, eave = lot.frameInfo?.eaveY ?? (lot.floors === 2 ? 4.87 : 2.62), plinth = .34;
  b.box(C.granite, l + .14, plinth, c + .14, 0, plinth / 2, 0);
  b.box(wall, l, eave - plinth, c, 0, plinth + (eave - plinth) / 2, 0);
  if (stoneBand) { b.box(C.granite, l + .03, .9, c + .03, 0, plinth + .45, 0); for (let y = plinth + .3; y < plinth + .9; y += .3) b.box(C.graniteDark, l + .05, .025, c + .05, 0, y, 0); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let y = plinth; y < eave - .1; y += .42) b.box(trim, .26, .2, .26, sx * (l / 2 - .1), y + .1, sz * (c / 2 - .1)); // corner quoins
  if (lot.floors === 2) b.box(trim, l + .06, .12, c + .06, 0, eave / 2 + .2, 0);
  // gable roof, ridge along x
  const over = .45, half = c / 2 + over, rise = Math.min(1.25, half * .52), ang = Math.atan2(rise, half), slope = Math.hypot(half, rise);
  for (const s of [-1, 1]) {
    b.box(C.tile, l + .5, .1, slope, 0, eave + rise / 2, s * half / 2, s * ang, 0, 0);
    for (let x = -l / 2 - .2; x <= l / 2 + .2; x += .22) b.box(C.tileDark, .07, .06, slope, x, eave + rise / 2 + .07, s * half / 2, s * ang, 0, 0);
    b.box(C.ridge, l + .5, .12, .14, 0, eave + .02, s * half, 0, 0, 0); // drip edge
  }
  b.box(C.ridge, l + .2, .2, .26, 0, eave + rise + .08, 0);
  return {l, c, eave, rise, plinth};
}

function doorway(b: Batch, z: number, x: number, h: number, w: number) {
  b.box(C.granite, w + .34, h + .22, .08, x, h / 2 + .34, z + .02); // stone frame
  for (const s of [-1, 1]) b.box(C.wood, w / 2 - .02, h, .06, x + s * w / 4, h / 2 + .34, z + .07);
  for (const s of [-1, 1]) { b.box(C.red, .16, h * .8, .02, x + s * (w / 2 + .1), h * .5 + .34, z + .08); b.box(C.gold, .03, .03, .022, x + s * (w / 4 - .08), h * .55 + .34, z + .105); } // couplets & knockers
  b.box(C.red, w * .7, .2, .02, x, h + .34 + .02, z + .08); // lintel banner (横批)
  b.box(C.red, .26, .26, .02, x, h * .62 + .34, z + .1, 0, 0, Math.PI / 4); // 福 diamond
  b.box(C.granite, w + .6, .1, .45, x, .35, z + .26); // step
}
function window(b: Batch, z: number, x: number, y: number, w: number, h: number, face = 1) {
  b.box(C.woodDark, w + .14, h + .14, .06, x, y, z + face * .03);
  b.box(C.paper, w, h, .04, x, y, z + face * .05);
  for (let i = 1; i < 4; i++) b.box(C.lattice, .03, h, .03, x - w / 2 + i * w / 4, y, z + face * .075);
  for (let i = 1; i < 3; i++) b.box(C.lattice, w, .03, .03, x, y - h / 2 + i * h / 3, z + face * .075);
}

/** Granite base, white plaster, grey tiles, stepped horse-head gables (马头墙) above both ends. */
function stoneHouse(ctx: any, g: any, lot: Lot) {
  const b = new Batch(ctx), {l, c, eave, rise} = shell(b, lot, C.plaster, C.granite, true);
  for (const sx of [-1, 1]) { // stepped firewalls, slightly proud of the roof
    const x = sx * (l / 2 + .06);
    for (const [zz, top] of [[0, eave + rise + .55], [c * .3, eave + rise * .55 + .45], [c * .52, eave + .5]] as const) for (const s of zz ? [-1, 1] : [1]) {
      const z = s * zz, span = zz ? c * .26 : c * .36;
      b.box(C.plaster, .24, top - eave + .3, span, x, eave - .15 + (top - eave + .3) / 2, z);
      b.box(C.tileDark, .4, .1, span + .12, x, top + .2, z); b.box(C.ridge, .14, .12, span + .2, x, top + .3, z);
    }
  }
  if (lot.door) doorway(b, c / 2, -l / 2 + 1.05, 1.95, 1.0);
  window(b, c / 2, l / 2 - .95, 1.55, .8, .7);
  window(b, -c / 2, 0, 1.55, .9, .7, -1);
  b.box(C.plaster, .5, .5, .03, l * .15, eave - .45, c / 2 + .02); // small vent tile
  b.build(g, 'cn-house-shell', {});
  lanterns(ctx, g, lot, c / 2, -l / 2 + 1.05, 1);
}

/** Red-brick 古厝: granite plinth & quoins, brick walls, swallowtail ridge flaring up at both ends. */
function brickHouse(ctx: any, g: any, lot: Lot) {
  const b = new Batch(ctx), {l, c, eave, rise} = shell(b, lot, C.brick, C.granite, false);
  for (let y = .5; y < eave; y += .28) b.box(C.brickDark, l + .02, .02, c + .02, 0, y, 0); // mortar courses
  const top = eave + rise + .2; // 燕尾脊: two flaring tails
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) b.box(C.ridge, .32, .14, .2, s * (l / 2 + .05 + k * .12), top + k * k * .035 + .02, 0, 0, 0, s * (.15 + k * .1));
  b.box(C.red, l * .55, .22, .03, 0, top - .2, .14); // ridge band
  if (lot.door) doorway(b, c / 2, 0, 2.0, 1.1);
  for (const s of [-1, 1]) { window(b, c / 2, s * (l / 2 - .8), 1.5, .7, .7); if (lot.floors === 2) window(b, c / 2, s * (l / 2 - .8), 3.6, .7, .7); }
  if (lot.floors === 2) { window(b, c / 2, 0, 3.6, .9, .75); b.box(C.granite, l * .6, .08, .5, 0, 2.9, c / 2 + .25); for (let x = -l * .3; x <= l * .3; x += .25) b.box(C.wood, .05, .6, .05, x, 3.2, c / 2 + .48); b.box(C.wood, l * .6, .05, .06, 0, 3.5, c / 2 + .48); } // balcony
  window(b, -c / 2, 0, 1.5, 1, .7, -1);
  b.build(g, 'cn-house-shell', {});
  lanterns(ctx, g, lot, c / 2, 0, 1.2);
}

/** A pair of red lanterns by the door, glowing a little (they light up more on the lit house). */
function lanterns(ctx: any, g: any, lot: Lot, z: number, x: number, spread: number) {
  const T = ctx.THREE, mat = ctx.mats.toon(C.red, {emissive: C.red, emissiveIntensity: lot.lit ? .9 : .45, noCache: true}), cap = ctx.mats.toon(C.gold);
  for (const s of [-1, 1]) {
    const ln = new T.Group(); ln.name = 'cn-lantern'; ln.position.set(x + s * spread * .75, 2.15, z + .32);
    const bulb = new T.Mesh(new T.SphereGeometry(.17, 12, 8), mat); bulb.scale.y = .85; ln.add(bulb);
    for (const y of [-.16, .16]) { const r = new T.Mesh(new T.CylinderGeometry(.09, .09, .05, 10), cap); r.position.y = y; ln.add(r); }
    const tassel = new T.Mesh(new T.CylinderGeometry(.02, .04, .18, 6), mat); tassel.position.y = -.28; ln.add(tassel);
    ln.traverse((m: any) => { if (m.isMesh) { m.castShadow = true; m.userData.walkThrough = true; } }); ln.userData.walkThrough = true; g.add(ln);
  }
}
