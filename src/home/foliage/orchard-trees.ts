import * as THREE from 'three';
import {hashSeed, rng, type Rng} from '../../templates/random';
import type {TreeSpecies, TreeStage} from '../../life/orchard';
import {climateMaterial} from '../climate-material';

const TAU = Math.PI * 2;
type Lobe = [number, number, number, number, number?];
const v = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const green: Record<TreeSpecies, [number, number]> = {
  oak: [0x548144, 0x9cab51], poplar: [0x658b4b, 0xa4b85d], apple: [0x689346, 0xadc15c],
  pear: [0x508447, 0xb7cb68], peach: [0x718b49, 0xbec768], willow: [0x567f55, 0xb6c971],
  ginkgo: [0x9b9f42, 0xd9c961],
};

/** Meadow's broad oak tiers, poplar spine and low six-lobed apple crown. */
function crownLobes(species: TreeSpecies, r: Rng): Lobe[] {
  const lobes: Lobe[] = [];
  if (species === 'oak') {
    lobes.push([0, 6, 0, 2.5]);
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8 + r.next() * .5, d = r.range(1.9, 2.7);
      lobes.push([Math.cos(a) * d, r.range(4.4, 5.8), Math.sin(a) * d, r.range(1.35, 1.95)]);
    }
    for (let i = 0; i < 5; i++) {
      const a = r.next() * TAU, d = r.range(.6, 1.6);
      lobes.push([Math.cos(a) * d, r.range(6.6, 8), Math.sin(a) * d, r.range(1.25, 1.8)]);
    }
  } else if (species === 'poplar') {
    for (let i = 0; i < 10; i++) {
      const t = i / 9, radius = 1.22 * Math.sin(t ** .62 * Math.PI * .93 + .16) + .22;
      lobes.push([r.range(-.28, .28), 2.4 + 9 * t, r.range(-.28, .28), radius * r.range(.92, 1.1), 1.35]);
    }
    for (let i = 0; i < 14; i++) {
      const t = r.next(), a = r.next() * TAU, d = .825 * Math.sin(t ** .62 * Math.PI * .9 + .18);
      lobes.push([Math.cos(a) * d, 2.2 + t * 8.3, Math.sin(a) * d, r.range(.5, .8)]);
    }
  } else {
    lobes.push([0, 3.1, 0, 1.35]);
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6 + r.next();
      lobes.push([Math.cos(a) * 1.15, r.range(2.6, 3.3), Math.sin(a) * 1.15, r.range(.75, 1.05)]);
    }
    for (let i = 0; i < 3; i++) {
      const a = r.next() * TAU;
      lobes.push([Math.cos(a) * .6, r.range(3.7, 4.2), Math.sin(a) * .6, r.range(.7, 1)]);
    }
    for (const b of lobes) {
      if (species === 'pear') { b[0] *= .80; b[2] *= .80; b[1] *= 1.20; b[4] = 1.18; }
      if (species === 'peach') { b[0] *= 1.30; b[2] *= 1.30; b[1] = 2.6 + (b[1] - 3) * .82; b[4] = .82; }
      if (species === 'ginkgo') { b[0] *= 1.32; b[2] *= 1.32; b[1] = 3.6 + (b[1] - 2.6) * 1.85; }
      if (species === 'willow') { b[0] *= 1.72; b[2] *= 1.72; b[1] += 1.2; b[3] *= 1.13; b[4] = .8; }
    }
  }
  return lobes;
}

class MeshData {
  positions: number[] = [];
  normals: number[] = [];
  colors: number[] = [];
  indices: number[] = [];
  vertex(p: THREE.Vector3, n: THREE.Vector3, c: THREE.Color) {
    const i = this.positions.length / 3;
    this.positions.push(p.x, p.y, p.z);
    this.normals.push(n.x, n.y, n.z);
    this.colors.push(c.r, c.g, c.b);
    return i;
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    g.setIndex(this.indices);
    g.computeBoundingSphere();
    return g;
  }
}

const edges = [[0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3], [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7]];

/** One continuous surface-net hull across the lobes. Normals also orient the leaves and hanging fruit. */
function crownHull(lobes: Lobe[], cell: number, spec: TreeSpecies) {
  const mesh = new MeshData(), lo = v(Infinity, Infinity, Infinity), hi = v(-Infinity, -Infinity, -Infinity);
  for (const [x, y, z, radius, sy = 1] of lobes) {
    lo.min(v(x - radius, y - radius * sy, z - radius));
    hi.max(v(x + radius, y + radius * sy, z + radius));
  }
  lo.addScalar(-.8); hi.addScalar(.8);
  const nx = Math.ceil((hi.x - lo.x) / cell) + 1, ny = Math.ceil((hi.y - lo.y) / cell) + 1, nz = Math.ceil((hi.z - lo.z) / cell) + 1;
  const total = nx * ny * nz, field = new Float32Array(total), ids = new Int32Array(total).fill(-1);
  const plane = nx * ny, offsets = [0, 1, nx, nx + 1, plane, plane + 1, plane + nx, plane + nx + 1];
  const blend = spec === 'oak' ? .55 : .36;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = lo.x + cell * i, y = lo.y + cell * j, z = lo.z + cell * k;
    let dist = Infinity;
    for (const [bx, by, bz, radius, sy = 1] of lobes) {
      const dx = x - bx, dy = (y - by) / sy, dz = z - bz;
      const next = Math.sqrt(dx * dx + dy * dy + dz * dz) - radius;
      const overlap = Math.max(0, blend - Math.abs(dist - next)) / blend;
      dist = Math.min(dist, next) - .25 * blend * overlap * overlap;
    }
    field[i + nx * j + plane * k] = dist + .085 * Math.sin(x * 2.7 + z) * Math.cos(y * 2.3 + z * .9) + .045 * Math.sin(x * 4.1 - y - z * 2.4);
  }
  const lowTint = new THREE.Color(green[spec][0]), highTint = new THREE.Color(green[spec][1]);
  const samples = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const o = i + j * nx + k * plane;
    let mask = 0;
    offsets.forEach((offset, c) => { samples[c] = field[o + offset]; if (samples[c] < 0) mask |= 1 << c; });
    if (!mask || mask === 255) continue;
    const p = v(), n = v(); let hits = 0;
    for (const [a, b] of edges) {
      if ((samples[a] < 0) === (samples[b] < 0)) continue;
      const t = samples[a] / (samples[a] - samples[b]);
      p.x += (a & 1) * (1 - t) + (b & 1) * t;
      p.y += ((a >> 1) & 1) * (1 - t) + ((b >> 1) & 1) * t;
      p.z += (a >> 2) * (1 - t) + (b >> 2) * t;
      hits++;
    }
    for (let c = 0; c < 8; c++) {
      n.x += (c & 1 ? 1 : -1) * samples[c]; n.y += (c & 2 ? 1 : -1) * samples[c]; n.z += (c & 4 ? 1 : -1) * samples[c];
    }
    p.multiplyScalar(cell / hits).add(lo).add(v(i * cell, j * cell, k * cell)); n.normalize();
    const hue = THREE.MathUtils.clamp((p.y - lo.y) / (hi.y - lo.y) * .7 + .1 * Math.sin(p.x + p.z * 2), 0, 1);
    ids[o] = mesh.vertex(p, n, lowTint.clone().lerp(highTint, hue));
  }
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) mesh.indices.push(a, c, b, a, d, c);
    else mesh.indices.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const o = i + j * nx + k * plane, inside = field[o] < 0;
    if (inside !== (field[o + 1] < 0)) quad(ids[o - nx - plane], ids[o - plane], ids[o], ids[o - nx], !inside);
    if (inside !== (field[o + nx] < 0)) quad(ids[o - 1 - plane], ids[o - 1], ids[o], ids[o - plane], !inside);
    if (inside !== (field[o + plane] < 0)) quad(ids[o - 1 - nx], ids[o - nx], ids[o], ids[o - 1], !inside);
  }
  return mesh;
}

/** Surface-area weighting keeps the shoulder and underside detailed as well as the treetop. */
function surfaceSampler(data: MeshData, r: Rng) {
  const triCount = data.indices.length / 3, cumulative = new Float32Array(triCount);
  const a = v(), b = v(), c = v(); let total = 0;
  for (let i = 0; i < triCount; i++) {
    a.fromArray(data.positions, data.indices[i * 3] * 3);
    b.fromArray(data.positions, data.indices[i * 3 + 1] * 3).sub(a);
    c.fromArray(data.positions, data.indices[i * 3 + 2] * 3).sub(a);
    cumulative[i] = total += b.cross(c).length();
  }
  return () => {
    const pick = r.next() * total; let lo = 0, hi = triCount - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] < pick) lo = mid + 1; else hi = mid;
    }
    let u = r.next(), w = r.next();
    if (u + w > 1) { u = 1 - u; w = 1 - w; }
    const p = v(), n = v();
    [1 - u - w, u, w].forEach((weight, j) => {
      const i = data.indices[lo * 3 + j] * 3;
      p.addScaledVector(a.fromArray(data.positions, i), weight);
      n.addScaledVector(b.fromArray(data.normals, i), weight);
    });
    return {p, n: n.normalize()};
  };
}

function leaf(data: MeshData, base: THREE.Vector3, dir: THREE.Vector3, normal: THREE.Vector3, width: number, length: number, color: THREE.Color, fan = false) {
  const side = dir.clone().cross(normal).normalize(), first = data.positions.length / 3;
  const profile = fan ? [[0, 0], [.65, .55], [1, .84], [.94, 1]] : [[0, 0], [.84, .25], [1, .53], [.66, .79], [0, 1]];
  for (const [w, t] of profile) for (const sign of [-1, 1]) {
    data.vertex(base.clone().addScaledVector(dir, t * length).addScaledVector(side, sign * w * width).addScaledVector(normal, Math.sin(t * Math.PI) * width * .21), normal, color);
  }
  for (let j = 0; j < profile.length - 1; j++) {
    const i = first + j * 2;
    if (j > 0) data.indices.push(i, i + 1, i + 2);
    if (fan || j < profile.length - 2) data.indices.push(i + 1, i + 3, i + 2);
  }
}

function twig(data: MeshData, points: THREE.Vector3[], from: number, to: number, shade: number, sides = 8) {
  const curve = new THREE.CatmullRomCurve3(points), steps = points.length * 2, first = data.positions.length / 3;
  const color = new THREE.Color(shade), centers = curve.getPoints(steps);
  for (let j = 0; j <= steps; j++) {
    const t = j / steps, dir = centers[Math.min(steps, j + 1)].clone().sub(centers[Math.max(0, j - 1)]).normalize();
    const ref = Math.abs(dir.x) > .88 ? v(0, 0, 1) : v(1, 0, 0);
    const tangent = dir.clone().cross(ref).normalize(), normal = tangent.clone().cross(dir).normalize();
    for (let s = 0; s < sides; s++) {
      const angle = TAU * s / sides;
      const radial = normal.clone().multiplyScalar(Math.cos(angle)).addScaledVector(tangent, Math.sin(angle));
      const radius = THREE.MathUtils.lerp(from, to, t) + from * .28 * Math.exp(-t * 11);
      data.vertex(centers[j].clone().addScaledVector(radial, radius), radial, color.clone().multiplyScalar(.9 + .12 * (s % 3)));
    }
    if (j === 0) continue;
    for (let s = 0; s < sides; s++) {
      const a = first + (j - 1) * sides + s, b = first + (j - 1) * sides + (s + 1) % sides;
      data.indices.push(a, b, a + sides, b, b + sides, a + sides);
    }
  }
}

function makeTrunk(species: TreeSpecies, lobes: Lobe[], r: Rng) {
  const data = new MeshData(), tall = species === 'oak', narrow = species === 'poplar';
  const h = narrow ? 7 : tall ? 5.6 : species === 'ginkgo' || species === 'willow' ? 4.4 : species === 'peach' ? 2.25 : 3.0;
  const radius = tall ? .45 : narrow ? .27 : species === 'willow' ? .32 : .19;
  const bendX = r.range(-.2, .2), bendZ = r.range(-.2, .2);
  const center = (t: number) => v(bendX * t * t * h * .35 + .04 * Math.sin(t * 3), t * h - .22, bendZ * t * t * h * .35);
  const bark = species === 'poplar' ? 0x91795c : species === 'peach' ? 0x795645 : 0x765a43;
  twig(data, [center(0), center(.35), center(.72), center(1)], radius, radius * .41, bark, 12);
  for (let i = 0; i < 5; i++) {
    const a = i * TAU / 5 + r.next(), ray = v(Math.cos(a), 0, Math.sin(a));
    twig(data, [v(0, .28, 0), ray.clone().multiplyScalar(radius * 1.35), ray.clone().multiplyScalar(radius * 2.5).setY(-.19)], .44 * radius, radius * .1, bark, 6);
  }
  if (!narrow) for (const b of lobes.slice(1, tall ? 8 : 7)) {
    const start = center(r.range(.50, .72)), end = v(b[0], b[1], b[2]);
    twig(data, [start, start.clone().lerp(end, .48).add(v(0, -.2, 0)), end], radius * .40, radius * .11, bark);
  }
  return data.geometry();
}

function addFruit(data: MeshData, origin: THREE.Vector3, species: TreeSpecies, r: Rng) {
  const pear = species === 'pear', peach = species === 'peach';
  const profile = pear ? [[.02, -.17], [.11, -.14], [.16, -.04], [.14, .045], [.067, .15], [.056, .21], [.018, .22]] :
    [[.02, -.14], [.10, -.142], [.157, -.06], [.164, .035], [.145, .105], [.077, .14], [.014, .115]];
  const tint = new THREE.Color(pear ? 0xd2bc65 : peach ? 0xf3a17e : 0xd75538);
  const blush = new THREE.Color(pear ? 0xacc060 : peach ? 0xe87578 : 0xf38143), spin = r.next() * TAU;
  const start = data.positions.length / 3, sides = 12;
  profile.forEach(([radius, h], row) => {
    for (let i = 0; i < sides; i++) {
      const a = i * TAU / sides;
      const lobe = peach ? 1 - .15 * Math.exp(-Math.pow(Math.sin(a) / .20, 2)) : 1 + .045 * Math.cos(5 * a);
      const normal = v(Math.cos(a), (row / (profile.length - 1) - .5) * 1.65, Math.sin(a)).normalize();
      data.vertex(origin.clone().add(v(Math.cos(a) * radius * lobe, h, Math.sin(a) * radius * lobe)), normal,
        tint.clone().lerp(blush, .5 + .5 * Math.cos(a + spin)));
      if (row === 0) continue;
      const lo = start + (row - 1) * sides + i, next = start + (row - 1) * sides + (i + 1) % sides;
      data.indices.push(lo, lo + sides, next, next, lo + sides, next + sides);
    }
  });
  const tip = origin.clone().add(v(.03, pear ? .31 : .235, .018));
  twig(data, [origin.clone().add(v(0, pear ? .20 : .10, 0)), tip], .016, .010, 0x604b31, 4);
}

interface TreeGeometry {trunk: THREE.BufferGeometry; canopy: THREE.BufferGeometry; fruit: THREE.BufferGeometry | null}
const shapes = new Map<string, TreeGeometry>();
const sprouts = new Map<TreeSpecies, Omit<TreeGeometry, 'fruit'>>();

function sproutGeometry(species: TreeSpecies) {
  const cached = sprouts.get(species);
  if (cached) return cached;
  const r = rng('sprout-' + species), stem = new MeshData(), leaves = new MeshData();
  const height = species === 'poplar' || species === 'oak' ? .77 : .63;
  const lean = r.range(.055, .11), top = v(lean, height, 0);
  twig(stem, [v(0, -.065, 0), v(-.018, height * .45, .014), top], .030, .009, 0x7d7042, 7);
  for (let i = 0; i < 8; i++) {
    const fraction = .26 + .088 * i, a = i * 2.40 + r.range(-.22, .22);
    const origin = v(lean * fraction ** 2, height * fraction, 0);
    const radial = v(Math.cos(a), .48, Math.sin(a)).normalize();
    const size = (.22 + .10 * Math.sin(fraction * Math.PI)) * r.range(.80, 1.08);
    const n = v(-radial.x * .34, 1, -radial.z * .34).normalize();
    const tip = origin.clone().addScaledVector(radial, .045);
    twig(stem, [origin, tip], .009, .005, 0x70904a, 5);
    leaf(leaves, tip, radial, n, size * (species === 'willow' ? .16 : .38), size,
      new THREE.Color(green[species][1]).lerp(new THREE.Color(0xbadf69), r.range(.24, .7)), species === 'ginkgo');
  }
  const shape = {trunk: stem.geometry(), canopy: leaves.geometry()};
  sprouts.set(species, shape);
  return shape;
}

export function orchardGeometry(species: TreeSpecies, variant: 0 | 1): TreeGeometry {
  const key = species + variant, cached = shapes.get(key);
  if (cached) return cached;
  const r = rng('meadow-orchard-' + key), lobes = crownLobes(species, r);
  const hull = crownHull(lobes, species === 'oak' ? .48 : species === 'poplar' ? .38 : .27, species);
  const sample = surfaceSampler(hull, r), fruitData = new MeshData();
  const fruiting = species === 'apple' || species === 'pear' || species === 'peach';
  const count = species === 'oak' ? 700 : species === 'poplar' ? 540 : 420;
  const color = new THREE.Color(), low = new THREE.Color(green[species][0]), high = new THREE.Color(green[species][1]);
  for (let i = 0; i < count; i++) {
    const {p, n} = sample(), direction = v(r.next() - .5, r.next() - .7, r.next() - .5);
    direction.addScaledVector(n, -direction.dot(n)).normalize().addScaledVector(n, r.range(.25, 1.1)).normalize();
    color.copy(low).lerp(high, r.range(.27, 1)).multiplyScalar(.95 + .09 * n.y);
    const size = r.range(.32, .56) * (species === 'oak' ? 1.28 : 1);
    leaf(hull, p.clone().addScaledVector(direction, -.18 * size), direction, n, size * (species === 'willow' ? .14 : .36), size, color, species === 'ginkgo');
  }
  if (species === 'willow') {
    for (let i = 0; i < 135; i++) {
      const {p, n} = sample();
      if (n.y > .25 || Math.hypot(p.x, p.z) < 1.45) continue;
      const length = r.range(1.15, 2.6), down = v(n.x * .23, -1, n.z * .23).normalize();
      for (let j = 0; j < 8; j++) {
        const t = j / 8, tip = p.clone().addScaledVector(down, length * t);
        const dir = v((j % 2 ? .45 : -.45) + n.x * .45, -.9, n.z * .4).normalize();
        leaf(hull, tip, dir, n, .065, length * .24, color.copy(low).lerp(high, .36 + .6 * t));
      }
    }
  }
  if (fruiting) {
    let grown = 0;
    for (let i = 0; i < 260 && grown < 22; i++) {
      const {p, n} = sample();
      if (n.y > .18 || Math.hypot(p.x, p.z) < .85) continue;
      addFruit(fruitData, p.addScaledVector(n, .12).add(v(0, -.1, 0)), species, r);
      grown++;
    }
  }
  const model = {trunk: makeTrunk(species, lobes, r), canopy: hull.geometry(), fruit: fruiting ? fruitData.geometry() : null};
  shapes.set(key, model);
  return model;
}

const materials = new WeakMap<object, {bark: THREE.MeshStandardMaterial; leaves: THREE.MeshStandardMaterial}>();
function orchardMaterials(ctx: any) {
  const cached = materials.get(ctx);
  if (cached) return cached;
  const bark = climateMaterial(new THREE.MeshStandardMaterial({vertexColors: true, roughness: .91, side: THREE.DoubleSide}), 'structure');
  const leaves = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .84, side: THREE.DoubleSide});
  leaves.onBeforeCompile = shader => {
    shader.uniforms.orchardTime = ctx.U?.uTime ?? {value: 0};
    shader.uniforms.orchardWind = ctx.U?.uWind ?? {value: .5};
    shader.vertexShader = 'uniform float orchardTime, orchardWind;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float phase = dot(modelMatrix[3].xz, vec2(.7,.9));
      float bend = pow(max(0.,position.y*.12),2.) * (.28 + orchardWind*.72);
      transformed.xz += vec2(.8,.35) * bend * (sin(orchardTime*1.15+phase)*.17 + sin(orchardTime*.55+phase)*.10);
      transformed += normal * (.009 + .012*orchardWind) * sin(orchardTime*2.1+position.x*3.1+position.z*2.2+phase);`);
  };
  leaves.customProgramCacheKey = () => 'orchard-leaf-wind-v1';
  climateMaterial(leaves, 'leaves');
  const mats = {bark, leaves}; materials.set(ctx, mats);
  return mats;
}

/** Geometry and climate materials are shared across trees; the scene owns each placed tree's transform. */
export function createOrchardTree(ctx: any, species: TreeSpecies, id: string) {
  const variant = (hashSeed(id) & 1) as 0 | 1, shape = orchardGeometry(species, variant);
  const mat = orchardMaterials(ctx), group = new THREE.Group(), model = new THREE.Group();
  group.name = 'orchard-tree-' + id;
  model.rotation.y = (hashSeed('yaw-' + id) / 0x100000000) * TAU;
  const bark = new THREE.Mesh(shape.trunk, mat.bark), crown = new THREE.Mesh(shape.canopy, mat.leaves);
  bark.name = 'orchard-trunk'; crown.name = 'orchard-leaves';
  model.add(bark, crown);
  const fruit = shape.fruit ? new THREE.Mesh(shape.fruit, mat.bark) : null;
  if (fruit) { fruit.name = 'orchard-fruit'; model.add(fruit); }
  group.add(model);
  model.traverse(mesh => { if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } });
  const update = (stage: TreeStage, ripe: boolean) => {
    const sprout = stage === 'sapling', renderShape = sprout ? sproutGeometry(species) : shape;
    bark.geometry = renderShape.trunk;
    crown.geometry = renderShape.canopy;
    const tall = species === 'oak' || species === 'poplar';
    model.scale.setScalar(stage === 'young' ? (tall ? .36 : .5) : 1);
    crown.scale.setScalar(stage === 'young' ? .86 : 1);
    // Keep the shrinking juvenile crown attached to its leader.
    crown.position.y = (1 - crown.scale.y) * (tall ? 4.3 : 2.7);
    if (fruit) fruit.visible = ripe && stage === 'adult';
    group.userData.treeStage = stage;
  };
  update('adult', false);
  return {group, update, dispose() { group.removeFromParent(); group.clear(); }};
}
