import supports from './island-supports.json';
import profiles from './island-rock-profiles.json';
import * as T from 'three';
import {getTerrainSplatTextures} from './render/terrain-splat';
import {voyageNoise} from '../life/voyage';
import type {MarineModels, IslandSpecimen} from './marine-models';
import {SEA_LEVEL} from './layout';
import {offshoreDepth} from '../world/island-coast';
import type {GroundSurface, FluidVolume} from '../slime/world';
import type {Vec} from '../slime/types';

const CELL = 384,
  PATCH = 80,
  STEPS = 80;
type Height = (x: number, z: number) => number;
type Rect = [number, number, number, number];
export interface SeaIsland {
  x: number;
  z: number;
  r: number;
  kind: number;
  phase: number;
}
export function islandAt(seed: number, gx: number, gz: number): SeaIsland {
  const n = (salt: number) => voyageNoise(seed ^ salt, gx, gz);
  return {
    x: gx * CELL + 16 * Math.round(6 + 12 * n(1)),
    z: gz * CELL + 16 * Math.round(6 + 12 * n(2)),
    r: 15 + 21 * n(3),
    kind: Math.floor(n(4) * 3),
    phase: n(5) * 6.28,
  };
}
export function islandBed(i: SeaIsland, x: number, z: number) {
  const dx = (x - i.x) / i.r,
    dz = (z - i.z) / i.r,
    a = Math.atan2(dz, dx) + i.phase;
  const r = Math.hypot(dx * (i.kind === 0 ? 0.76 : 1), dz) / (1 + 0.12 * Math.sin(3 * a) + 0.08 * Math.cos(5 * a));
  let h = (1 - r) * (i.kind === 1 ? 7 : 3.6);
  if (i.kind === 2) h = Math.min(h, (r - 0.41) * 7 + Math.sin(a) * 0.42);
  if (i.kind === 1) h += Math.max(0, 1 - r) * 2 * Math.sin(a * 2) * Math.min(r * 4, 1);
  if (i.kind === 1) {
    for (let j = 0; j < 3; j++) {
      const angle = i.phase + j * 1.76,
        dist = Math.hypot(dx - 0.46 * Math.cos(angle), dz - 0.46 * Math.sin(angle));
      const u = Math.max(0,Math.min(1,(dist-.115)/(.34+j*.045)));
      h += (1-u*u*(3-2*u))*(5.8-j*.85);
    }
  }
  // Wind-shaped inland sand fades to zero at the intertidal contour.
  if (h > .45) h += Math.min(1,(h-.45)*.7)*(.21*Math.sin(7*dx+2*dz+i.phase)+.16*Math.sin(5*dz-3*dx));
  return SEA_LEVEL + Math.max(-14.5, h - Math.max(0, r - 1.15) * 8);
}
interface Tile {
  island: SeaIsland;
  mesh: T.Group;
  solid: GroundSurface;
  ground:Height;
  outcrops?: ReturnType<typeof outcropSurfaces>;
}
/** World-seeded rocky headlands alternating with open landing beaches. */
export function islandScenery(i: SeaIsland, seed: number, height: Height) {
  const placements: IslandSpecimen[] = [];
  const n = (k: number) => voyageNoise(seed ^ i.x, i.z, k);
  function place(name: string, x: number, z: number, size: number, yaw: number, sink: number) {
    const support = supports[name as keyof typeof supports];
    const rock = name.startsWith('outcrop'), c = Math.cos(yaw), s = Math.sin(yaw);
    for (let attempt=0; attempt<6; attempt++) {
      const a=yaw+attempt*2.4, radius=attempt*size*.09;
      const px=x+Math.cos(a)*radius, pz=z+Math.sin(a)*radius;
      const xx=i.x+px, zz=i.z+pz, center=height(xx,zz), d=size*.32;
      const slopeX=rock ? T.MathUtils.clamp((height(xx+d,zz)-height(xx-d,zz))/(2*d),-.34,.34) : 0;
      const slopeZ=rock ? T.MathUtils.clamp((height(xx,zz+d)-height(xx,zz-d))/(2*d),-.34,.34) : 0;
      let y=center;
      for (const [u,v] of support.rim) {
        const dx=size*(c*u+s*v), dz=size*(c*v-s*u);
        y=Math.min(y,height(xx+dx,zz+dz)-slopeX*dx-slopeZ*dz);
      }
      y-=Math.min(.025,sink*size);
      if (rock && center-y>size*support.height*.46) continue;
      placements.push({name,x:px,z:pz,y,size,yaw,slopeX,slopeZ});
      return;
    }
  }
  const headlands = 2 + Math.floor(3*n(0)), start = n(1)*Math.PI*2;
  for (let c = 0; c < headlands; c++) {
    const key = 20 + c*90;
    const angle = start + Math.PI*2*(c + .36*n(key))/headlands;
    for (let j = 0; j < 3 + Math.floor(3*n(key+1)); j++) {
      const k = key+4+j*8, a = angle + (n(k)-.5)*.76;
      const radius = i.r * (.67 + .34*n(k+1));
      const x = Math.cos(a)*radius*(i.kind === 0 ? 1.22 : 1), z = Math.sin(a)*radius;
      const width = (j === 0 ? .36 : .14+.16*n(k+2))*i.r;
      // Reject steep spires and fully submerged outcrops.
      const y = height(x+i.x,z+i.z);
      if (y < SEA_LEVEL-.65 || Math.abs(height(x+i.x+width*.35,z+i.z)-y) > width*.54) continue;
      place('outcrop'+Math.floor(n(k+3)*6),x,z,width,n(k+4)*6.283,.055);
    }
  }
  if (i.kind === 1) {
    for (let j=0; j<3; j++) {
      const a=i.phase+j*1.76, x=i.r*.46*Math.cos(a), z=i.r*.46*Math.sin(a);
      const size=i.r*(.36+.10*n(640+j));
      place('outcrop'+[1,4,5][j], x, z, size, n(650+j)*6.283, .115);
    }
  }
  const trees = Math.round(2 + i.r*i.r/115 + n(999)*3);
  let planted = 0;
  for (let j = 0; j < 100 && planted < trees; j++) {
    const k = 1000+j*12, a = n(k)*Math.PI*2, r = i.r*Math.sqrt(n(k+1))*.85;
    const x = Math.cos(a)*r, z = Math.sin(a)*r, y = height(i.x+x,i.z+z);
    if (y < SEA_LEVEL+.52 || Math.hypot(height(i.x+x+1,i.z+z)-y,height(i.x+x,i.z+z+1)-y)>.63) continue;
    if (placements.some(p => Math.hypot(p.x-x,p.z-z) < (p.name.startsWith('outcrop') ? p.size*.55 : 2.75))) continue;
    place('palm'+Math.floor(4*n(k+2)),x,z,4.2+3.8*n(k+3),n(k+4)*6.283,.025);
    planted++;
  }
  for (let j=0; j<trees*3; j++) {
    const k=2600+j*7, a=n(k)*6.283, r=i.r*Math.sqrt(n(k+1))*.72;
    const x=Math.cos(a)*r, z=Math.sin(a)*r;
    if (height(i.x+x,i.z+z) < SEA_LEVEL+.4 || placements.some(p => p.name.startsWith('outcrop') && Math.hypot(x-p.x,z-p.z)<p.size*.48)) continue;
    place('shrub'+Math.floor(3*n(k+2)),x,z,.65+1.25*n(k+3),n(k+4)*6.283,.03);
  }
  return placements;
}
// Sample the imported rock silhouettes in their authored orientation. Each small
// collision patch includes adjacent rocks so overlapping patches agree on their shared area.
function outcropSurfaces(i: SeaIsland, layout: IslandSpecimen[], height: Height) {
  const rocks = layout.filter(p => p.name.startsWith('outcrop')).map(p => ({
    ...p, cos: Math.cos(p.yaw), sin: Math.sin(p.yaw), profile: profiles.heights[Number(p.name.slice(7))],
  }));
  const n = profiles.resolution;
  function top(x: number,z: number, floor = height(x,z)) {
    for (const p of rocks) {
      const dx = (x-i.x-p.x)/p.size, dz = (z-i.z-p.z)/p.size;
      const u = (.5 + p.cos*dx - p.sin*dz)*(n-1), v = (.5 + p.sin*dx + p.cos*dz)*(n-1);
      if (u<0 || v<0 || u>=n-1 || v>=n-1) continue;
      const col=Math.floor(u), row=Math.floor(v), tx=u-col, tz=v-row;
      const at=(j:number) => p.profile[j]<0 ? floor : p.y + p.size*(p.profile[j]/1000 + dx*(p.slopeX ?? 0)+dz*(p.slopeZ ?? 0));
      const j=row*n+col;
      floor=Math.max(floor, (at(j)*(1-tx)+at(j+1)*tx)*(1-tz)+(at(j+n)*(1-tx)+at(j+n+1)*tx)*tz);
    }
    return floor;
  }
  const patches = rocks.map(p => {
    const r = Math.ceil(p.size*.72)+1, cx = Math.round(i.x+p.x), cz = Math.round(i.z+p.z);
    const steps = 4*r, values: number[] = [];
    for (let iz=0; iz<=steps; iz++) for (let ix=0; ix<=steps; ix++) values.push(top(cx-r+ix*.5, cz-r+iz*.5));
    const patch: GroundSurface = {height:0, min:[cx-r,cz-r], max:[cx+r,cz+r], grid:{width:steps+1,height:steps+1,values}};
    return patch;
  });
  return {patches, top};
}
function buildTile(i: SeaIsland, seed: number, height: Height, near: boolean, sandMat: T.MeshStandardMaterial, models?: MarineModels): Tile {
  const root = new T.Group();
  root.position.set(i.x, 0, i.z);
  root.name = ['voyage-sandbar', 'voyage-cape', 'voyage-atoll'][i.kind];
  const steps = STEPS;
  root.userData.near = near;
  const span = PATCH,
    geo = new T.PlaneGeometry(span * 2, span * 2, steps, steps);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position,
    colors: number[] = [],
    values: number[] = [];
  const sand = new T.Color(0xfffcf2),
    stone = new T.Color(0xa3876c),
    grass = new T.Color(0xf7efdd),
    reef = new T.Color(0xafb9a5);
  for (let j = 0; j < p.count; j++) {
    const x = p.getX(j),
      z = p.getZ(j),
      h = height(x + i.x, z + i.z);
    values.push(h);
    p.setY(j, h);
    const c = sand.clone();
    if (h < SEA_LEVEL) c.lerp(reef, Math.min(1, (SEA_LEVEL - h) * 0.3));
    else if (i.kind === 1) {
      const slope = Math.hypot(height(i.x+x+1,i.z+z)-h, height(i.x+x,i.z+z+1)-h);
      c.lerp(stone, Math.min(.92,Math.max(0,slope-.22)*1.15+Math.max(0,h-6)*.09));
    } else c.lerp(grass, Math.min(1, Math.max(0, h - SEA_LEVEL - .8) * .65));
    c.multiplyScalar(0.98 + 0.035 * Math.sin(x * 1.6 + z));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  stitchEdges(geo, steps, steps, [i.x - span, i.z - span, i.x + span, i.z + span], height);
  const position = geo.attributes.position, uv = geo.attributes.uv;
  for (let k=0; k<position.count; k++) uv.setXY(k,(position.getX(k)+i.x)*.21,(position.getZ(k)+i.z)*.21);
  const ground = new T.Mesh(geo, sandMat);
  ground.layers.set(1);
  ground.receiveShadow = true;
  root.add(ground);
  const groundAt: Height = (x,z) => {
    const u=(x-i.x+span)*steps/(2*span), v=(z-i.z+span)*steps/(2*span);
    const col=Math.floor(u), row=Math.floor(v);
    if (col<0 || row<0 || col>=steps || row>=steps) return height(x,z);
    const j=row*(steps+1)+col, tx=u-col, tz=v-row;
    const a=values[j], b=values[j+1], c=values[j+steps+1], d=values[j+steps+2];
    return tx+tz<=1 ? a+(b-a)*tx+(c-a)*tz : d+(c-d)*(1-tx)+(b-d)*(1-tz);
  };
  const layout = models ? islandScenery(i,seed,groundAt) : [];
  const decor = models?.island(root, near ? layout : layout.filter(p => !p.name.startsWith('shrub')));
  root.userData.decor = decor;
  root.userData.resources = decor ? [geo,decor] : [geo];
  return {
    island: i,
    mesh: root,
    ground:groundAt,
    outcrops: near && layout.length ? outcropSurfaces(i,layout,groundAt) : undefined,
    solid: {
      min: [i.x - span, i.z - span],
      max: [i.x + span, i.z + span],
      height: 0,
      grid: {width: steps + 1, height: steps + 1, values},
    },
  };
}
/** Split a cell along a neighbouring mesh boundary. The shoreline and mountain own their interiors. */
function subtract(rect: Rect, hole?: Rect): Rect[] {
  if (!hole) return [rect];
  const [x, z, X, Z] = rect;
  const l = Math.max(x, hole[0]),
    b = Math.max(z, hole[1]),
    r = Math.min(X, hole[2]),
    t = Math.min(Z, hole[3]);
  if (l >= r || b >= t) return [rect];
  return (
    [
      [x, z, l, Z],
      [r, z, X, Z],
      [l, z, r, b],
      [l, t, r, Z],
    ] as Rect[]
  ).filter((q) => q[0] < q[2] && q[1] < q[3]);
}

function mountain(i: SeaIsland, x: number, z: number, base: number) {
  const d = Math.hypot(x-i.x,z-i.z);
  if (d >= PATCH) return base;
  const t = Math.min(1, Math.max(0, (d - i.r * 1.6) / (PATCH - i.r * 1.6)));
  const peak = islandBed(i, x, z);
  return peak + (base - peak) * t * t * (3 - 2 * t);
}

/** Stitch adaptive interiors to a one-metre perimeter shared by neighbouring cells. */
function stitchEdges(geo: T.BufferGeometry, nx: number, nz: number, rect: Rect, height: Height) {
  const [x, z, X, Z] = rect,
    cx = (x + X) / 2,
    cz = (z + Z) / 2;
  const pos = Array.from(geo.attributes.position.array as Float32Array),
    uv = Array.from(geo.attributes.uv.array as Float32Array);
  const color = geo.attributes.color ? Array.from(geo.attributes.color.array as Float32Array) : undefined;
  const indices: number[] = [];
  function vertex(xx: number, zz: number, source: number) {
    const id = pos.length / 3;
    pos.push(xx - cx, height(xx, zz), zz - cz);
    uv.push((xx - x) / (X - x), 1 - (zz - z) / (Z - z));
    if (color) color.push(color[source * 3], color[source * 3 + 1], color[source * 3 + 2]);
    return id;
  }
  function side(loop: number[], from: number, to: number, edge: boolean) {
    loop.push(from);
    if (!edge) return;
    const ax = pos[3 * from] + cx,
      az = pos[3 * from + 2] + cz,
      bx = pos[3 * to] + cx,
      bz = pos[3 * to + 2] + cz;
    const horizontal = Math.abs(bx - ax) > Math.abs(bz - az),
      lo = horizontal ? ax : az,
      hi = horizontal ? bx : bz;
    const sign = Math.sign(hi - lo);
    for (
      let k = sign > 0 ? Math.floor(lo + 1e-4) + 1 : Math.ceil(lo - 1e-4) - 1;
      sign * (hi - k) > 1e-4;
      k += sign
    )
      loop.push(vertex(horizontal ? k : ax, horizontal ? az : k, from));
  }
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i,
        b = a + 1,
        c = a + nx + 1,
        d = c + 1;
      if (i && j && i < nx - 1 && j < nz - 1) {
        indices.push(a, c, b, b, c, d);
        continue;
      }
      const loop: number[] = [];
      side(loop, a, c, i === 0);
      side(loop, c, d, j === nz - 1);
      side(loop, d, b, i === nx - 1);
      side(loop, b, a, j === 0);
      const center = vertex(x + ((X - x) * (i + 0.5)) / nx, z + ((Z - z) * (j + 0.5)) / nz, a);
      loop.forEach((v, k) => indices.push(center, v, loop[(k + 1) % loop.length]));
    }
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  if (color) geo.setAttribute('color', new T.Float32BufferAttribute(color, 3));
  geo.deleteAttribute('normal');
  geo.setIndex(indices);
  geo.computeVertexNormals();
}
interface BedPatch {
  mesh: T.Mesh;
  solid: GroundSurface;
}
function bedPatch(rect: Rect, height: Height, material: T.Material, step: number): BedPatch {
  const [x, z, X, Z] = rect,
    nx = Math.ceil((X - x) / step),
    nz = Math.ceil((Z - z) / step);
  const geo = new T.PlaneGeometry(X - x, Z - z, nx, nz).rotateX(-Math.PI / 2);
  const p = geo.attributes.position,
    values: number[] = [];
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) {
      const y = height(x + ((X - x) * i) / nx, z + ((Z - z) * j) / nz);
      p.setY(j * (nx + 1) + i, y);
      values.push(y);
    }
  stitchEdges(geo, nx, nz, rect, height);
  const uv = geo.attributes.uv;
  for (let k = 0; k < uv.count; k++)
    uv.setXY(
      k,
      (geo.attributes.position.getX(k) + (x + X) / 2) * 0.28,
      (geo.attributes.position.getZ(k) + (z + Z) / 2) * 0.28,
    );
  const mesh = new T.Mesh(geo, material);
  mesh.position.set((x + X) / 2, 0, (z + Z) / 2);
  mesh.name = 'voyage-seabed';
  mesh.layers.set(1);
  return {mesh, solid: {min: [x, z], max: [X, Z], height: 0, grid: {width: nx + 1, height: nz + 1, values}}};
}

export class VoyageIslands {
  private tiles = new Map<string, Tile>();
  private patches = new Map<string, BedPatch[]>();
  private floorMat = new T.MeshStandardMaterial({color: 0xd4d5cb, roughness: 0.93});
  private cell = '';
  private seed?: number;
  private sandMat = new T.MeshStandardMaterial({vertexColors: true, roughness: .94});
  private density = -1;
  update(_time: number, density: number) {
    if (this.density === density) return;
    this.density = density;
    for (const t of this.tiles.values()) t.mesh.userData.decor?.setDensity(density);
  }
  center: [number, number] = [0, 0];
  constructor(
    private scene: T.Scene,
    scenery = true,
    private models?: MarineModels,
  ) {
    const splat = scenery ? getTerrainSplatTextures() : null;
    if (models) {
      const load = (file: string) => {
        const texture = new T.TextureLoader().load(new URL('ocean/models/'+file, document.baseURI).href);
        texture.wrapS = texture.wrapT = T.RepeatWrapping;
        texture.anisotropy = 4;
        return texture;
      };
      this.sandMat.map = load('island-sand.jpg');
      this.sandMat.map.colorSpace = T.SRGBColorSpace;
      this.sandMat.normalMap = load('island-normal.jpg');
      this.sandMat.normalScale.setScalar(.56);
    }
    if (splat) {
      this.floorMat.map = splat.sandAlbedo;
      this.floorMat.normalMap = splat.sandNormal;
      this.floorMat.normalScale.setScalar(0.48);
    }
  }
  get offshore() {
    return !!this.cell;
  }
  get shores() {
    return Array.from(this.tiles.values(), (t) => t.island);
  }

  sync(
    x: number,
    z: number,
    seed: number,
    coast: Height,
    base: Height = (a, b) => SEA_LEVEL - offshoreDepth(coast(a, b)),
    home?: Rect,
  ) {
    const gx = Math.floor(x / CELL),
      gz = Math.floor(z / CELL),
      key = seed + ':' + gx + ',' + gz;
    const distance = coast(x, z);
    if (distance < (this.offshore ? 30 : 50)) {
      if (!this.offshore) return false;
      this.clear();
      return true;
    }
    if (key === this.cell) return false;
    if (seed !== this.seed) this.clear();
    this.seed = seed;
    this.cell = key;
    this.density = -1;
    this.center = [(gx + 0.5) * CELL, (gz + 0.5) * CELL];
    const keep = new Set<string>();
    for (let a = gx - 2; a <= gx + 2; a++)
      for (let b = gz - 2; b <= gz + 2; b++) {
        const id = a + ',' + b,
          i = islandAt(seed, a, b),
          shore = coast(i.x, i.z);
        // Sparse outer waters, with at least one candidate per cell in the first discovery belt.
        const present = shore >= 350 && (shore <= 900 || voyageNoise(seed ^ 711, a, b) > 0.48);
        const islandRect: Rect = [i.x - PATCH, i.z - PATCH, i.x + PATCH, i.z + PATCH];
        const hasIsland =
          present && (!home || subtract(islandRect, home)[0]?.every((v, k) => v === islandRect[k]));
        const near = Math.max(Math.abs(gx - a), Math.abs(gz - b)) < 2;
        const previous = this.tiles.get(id);
        if (hasIsland && (!previous || previous.mesh.userData.near !== near)) {
          if (previous) this.remove(previous);
          const tile = buildTile(
            i,
            seed,
            (xx, zz) => mountain(i, xx, zz, base(xx, zz)),
            near, this.sandMat, this.models,
          );
          this.tiles.set(id, tile);
          this.scene.add(tile.mesh);
        }
        const patchKey = id + (near ? '/near' : '/far');
        keep.add(id);
        keep.add(patchKey);
        if (this.patches.has(patchKey)) continue;
        const rect: Rect = [a * CELL, b * CELL, (a + 1) * CELL, (b + 1) * CELL];
        const parts = subtract(rect, home).flatMap((q) => subtract(q, hasIsland ? islandRect : undefined));
        const patches = parts.map(q => bedPatch(q, base, this.floorMat, near ? 12 : 24));
        this.patches.set(patchKey, patches);
        for (const p of patches) this.scene.add(p.mesh);
      }
    for (const [id, t] of this.tiles)
      if (!keep.has(id)) {
        this.remove(t);
        this.tiles.delete(id);
      }
    for (const [id, parts] of this.patches)
      if (!keep.has(id)) {
        this.drop(parts);
        this.patches.delete(id);
      }
    return true;
  }
  private drop(parts: BedPatch[]) {
    for (const p of parts) {
      p.mesh.removeFromParent();
      p.mesh.geometry.dispose();
    }
  }
  private remove(t: Tile) {
    t.mesh.removeFromParent();
    for (const r of t.mesh.userData.resources) r.dispose();
  }
  clear() {
    this.tiles.forEach((t) => this.remove(t));
    this.tiles.clear();
    this.patches.forEach((p) => this.drop(p));
    this.patches.clear();
    this.cell = '';
  }
  dispose() {
    this.clear();
    this.floorMat.dispose();
    this.sandMat.map?.dispose();
    this.sandMat.normalMap?.dispose();
    this.sandMat.dispose();
  }
  bed(x: number, z: number, base: number) {
    const tile = this.tiles.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL));
    if (!tile) return base;
    const y = tile.ground(x,z);
    return tile.outcrops?.top(x,z,y) ?? y;
  }
  renderedBed(x:number,z:number) {
    const id=Math.floor(x/CELL)+','+Math.floor(z/CELL),tile=this.tiles.get(id);
    if(tile && Math.abs(x-tile.island.x)<PATCH && Math.abs(z-tile.island.z)<PATCH){
      const ground=tile.ground(x,z);return tile.outcrops?.top(x,z,ground)??ground;
    }
    const patches=this.patches.get(id+'/near')??this.patches.get(id+'/far')??[];
    for(const {solid:p} of patches){
      if(x<p.min[0]||z<p.min[1]||x>=p.max[0]||z>=p.max[1])continue;
      const g=p.grid!,u=(x-p.min[0])/(p.max[0]-p.min[0])*(g.width-1),v=(z-p.min[1])/(p.max[1]-p.min[1])*(g.height-1);
      const ix=Math.floor(u),iz=Math.floor(v),j=iz*g.width+ix,tx=u-ix,tz=v-iz;
      const b=g.values[j+1],c=g.values[j+g.width];
      return tx+tz<=1?g.values[j]*(1-tx-tz)+b*tx+c*tz:g.values[j+g.width+1]*(tx+tz-1)+b*(1-tz)+c*(1-tx);
    }
    return undefined;
  }
  extend(surfaces: GroundSurface[], fluids: FluidVolume[], bounds: {min: Vec; max: Vec}, buoyant: boolean) {
    if (!this.offshore) return;
    const [cx, cz] = this.center,
      r = CELL * 1.5;
    const rect: Rect = [cx - r, cz - r, cx + r, cz + r];
    for (const [id, parts] of this.patches)
      if (id.endsWith('/near')) for (const p of parts) surfaces.push(p.solid);
    for (const t of this.tiles.values()) if (t.mesh.userData.near) surfaces.push(t.solid, ...(t.outcrops?.patches ?? []));
    if (buoyant)
      for (const [x, z, X, Z] of subtract(rect, [bounds.min[0], bounds.min[2], bounds.max[0], bounds.max[2]])) {
        fluids.push({min: [x, z], max: [X, Z], level: SEA_LEVEL, sink: 0.14});
      }
    bounds.min = [Math.min(bounds.min[0], rect[0]), SEA_LEVEL - 2006, Math.min(bounds.min[2], rect[1])];
    bounds.max = [Math.max(bounds.max[0], rect[2]), bounds.max[1], Math.max(bounds.max[2], rect[3])];
  }
}
