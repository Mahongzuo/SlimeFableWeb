import * as T from 'three';
import { speciesById } from '../life/fish-species';

// Height, half-width, tail fork and location of the deepest cross-section.
const profiles: Record<string, number[]> = {
  carp: [0.18, 0.115, 0.11, 0.43],
  torpedo: [0.13, 0.1, 0.13, 0.46],
  silver: [0.2, 0.105, 0.12, 0.33],
  bighead: [0.22, 0.14, 0.1, 0.26],
  jaw: [0.137, 0.086, 0.14, 0.38],
  disc: [0.3, 0.095, 0.1, 0.44],
  longfin: [0.11, 0.1, 0.06, 0.31],
  cat: [0.125, 0.16, 0.09, 0.24],
  pike: [0.1, 0.085, 0.14, 0.6],
  tench: [0.2, 0.14, 0.075, 0.47],
  highfin: [0.235, 0.11, 0.12, 0.39],
  pacu: [0.29, 0.13, 0.105, 0.39],
  croaker: [0.17, 0.095, 0.13, 0.37],
  ribbon: [0.056, 0.03, 0.015, 0.25],
  diamond: [0.3, 0.065, 0.14, 0.48],
  flounder: [0.055, 0.235, 0.09, 0.42],
  turbot: [0.063, 0.3, 0.08, 0.46],
  grouper: [0.215, 0.145, 0.1, 0.32],
  tuna: [0.18, 0.16, 0.18, 0.43],
  bonito: [0.165, 0.135, 0.16, 0.42],
  dorado: [0.205, 0.1, 0.16, 0.27],
  sword: [0.125, 0.11, 0.18, 0.44],
  lion: [0.195, 0.14, 0.095, 0.35],
  jack: [0.14, 0.085, 0.15, 0.44],
};
let sharedGeometry: Promise<any[]> | undefined;
async function referenceModel(url: string) {
  const read = async (path: string) => {
    const response = await fetch(new URL(path, document.baseURI));
    if (!response.ok) throw Error(path);
    return response.json();
  };
  sharedGeometry ??= read('ocean/fish/geometry.json').catch((e) => {
    sharedGeometry = undefined;
    throw e;
  });
  const [model, all] = await Promise.all([read(url), sharedGeometry]);
  const used = new Set<string>();
  function collect(o: any) {
    if (o.geometry) used.add(o.geometry);
    o.children?.forEach(collect);
  }
  collect(model.object);
  model.geometries = all!.filter((g) => used.has(g.uuid));
  return new T.ObjectLoader().parse(model);
}
export function disposeFish(g: T.Object3D) {
  const materials = new Set<T.Material>(),
    geometries = new Set<T.BufferGeometry>();
  g.traverse((o) => {
    if (o instanceof T.Mesh) {
      geometries.add(o.geometry);
      for (const m of ([] as T.Material[]).concat(o.material)) materials.add(m);
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  g.removeFromParent();
}
export function anglingFish(id: string, star: boolean) {
  const spec = speciesById.get(id),
    root = new T.Group();
  root.name = id;
  const oldColors: Record<string, [string, string]> = {
    'golden-trout': ['#b89939', '#f6d264'],
    'rainbow-trout': ['#5a8b7d', '#dc958f'],
    mandarin: ['#897739', '#d4a552'],
    'jade-carp': ['#328071', '#a9d49c'],
    'spring-koi': ['#bb5638', '#f2d599'],
    'silver-herring': ['#5794a8', '#cfdee5'],
    'winter-icefish': ['#9dc8d7', '#d3e0e8'],
    salmon: ['#647879', '#c6a48a'],
    'summer-marlin': ['#354f78', '#a5d7da'],
  };
  const colorsOld = oldColors[id.slice(5)] ?? ['#588697', '#dbe6b9'];
  const shape =
    spec?.shape ??
    (/catfish|loach/.test(id)
      ? 'cat'
      : /eel/.test(id)
        ? 'ribbon'
        : /marlin/.test(id)
          ? 'sword'
          : /carp|koi/.test(id)
            ? 'carp'
            : 'torpedo');
  const [h, w, fork, peak] = profiles[shape] ?? profiles.carp;
  const base = new T.Color(spec?.color ?? colorsOld[0]),
    accent = new T.Color(spec?.accent ?? colorsOld[1]);
  const bodyMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.43, metalness: 0.13 });
  if (star) {
    bodyMat.emissive.set(0x97d7ff);
    bodyMat.emissiveIntensity = 0.32;
  }
  const v: number[] = [],
    colors: number[] = [],
    idx: number[] = [];
  const taper = (u: number) =>
    u < peak
      ? Math.sin((Math.PI * 0.5 * u) / peak) ** 0.53
      : Math.max(0, Math.cos(Math.PI * 0.5 * ((u - peak) / (1 - peak)))) ** 1.14;
  for (let i = 0; i <= 26; i++) {
    const u = i / 26,
      q = taper(u);
    for (let j = 0; j <= 24; j++) {
      const a = (j * Math.PI) / 12,
        y = Math.sin(a),
        z = Math.cos(a);
      v.push(0.5 - u, h * q * y, w * q * z);
      const bar = Math.sin(36 * u + 1.8 * y),
        speck = Math.sin(55 * u + 6 * z) * Math.cos(13 * y + 9 * z);
      const mark =
        spec?.pattern === 'spots'
          ? speck > 0.47
          : spec?.pattern === 'bars'
            ? bar > 0.28
            : spec?.pattern === 'stripes'
              ? Math.sin(y * 16 + 4 * u) > 0.55
              : false;
      const c = base.clone().lerp(accent, mark ? 0.85 : 0.13 + (0.5 * (1 - y)) / 2);
      colors.push(c.r, c.g, c.b);
      if (i < 26 && j < 24) {
        const k = i * 25 + j;
        idx.push(k, k + 26, k + 25, k, k + 1, k + 26);
      }
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(v, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  root.add(new T.Mesh(geo, bodyMat));
  const finMat = new T.MeshStandardMaterial({ color: accent, roughness: 0.54, side: T.DoubleSide });
  const fin = (points: number[]) => {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(points, 3));
    g.computeVertexNormals();
    root.add(new T.Mesh(g, finMat));
  };
  const finStart = shape === 'pike' ? -0.23 : 0.12;
  fin([finStart, h * 0.72, 0, finStart - 0.09, h * (shape === 'highfin' ? 2.55 : 1.6), 0, -0.33, h * 0.38, 0]);
  for (const sign of [-1, 1]) {
    fin([-0.41, 0, 0, -0.68, sign * fork * 1.55, 0, -0.56, 0, 0]);
    fin([
      0.19,
      0,
      sign * w * 0.8,
      -0.03,
      -h * 0.48,
      sign * w * (shape === 'lion' ? 3 : 1.8),
      0.05,
      -h * 0.35,
      sign * w,
    ]);
    if (shape === 'flounder' || shape === 'turbot')
      fin([0.35, 0, sign * w * 0.4, 0, 0, sign * w * 1.28, -0.43, 0, sign * w * 0.3]);
  }
  const addRod = (a: T.Vector3, b: T.Vector3, r: number, color: T.Color) => {
    const delta = b.clone().sub(a);
    const m = new T.Mesh(
      new T.CylinderGeometry(0.001, r, delta.length(), 6),
      new T.MeshStandardMaterial({ color }),
    );
    m.position.copy(a).lerp(b, 0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
    root.add(m);
  };
  if (shape === 'sword' || shape === 'pike' || shape === 'jaw')
    addRod(
      new T.Vector3(0.39, -0.01, 0),
      new T.Vector3(shape === 'sword' ? 0.91 : 0.61, 0.01, 0),
      w * 0.52,
      base,
    );
  if (['tuna', 'bonito', 'jack', 'sword'].includes(shape)) {
    for (let j = 0; j < 5; j++)
      for (const side of [-1, 1]) {
        const x = -0.19 - j * 0.052,
          y = h * taper(0.5 - x) * side;
        fin([x, y, 0, x - 0.024, y + side * (0.046 - j * 0.005), 0, x - 0.048, y * 0.94, 0]);
      }
  }
  if (shape === 'longfin' || shape === 'ribbon' || shape === 'dorado') {
    for (let j = 0; j < 15; j++) {
      const x = 0.34 - j * 0.049,
        edge = h * taper(0.5 - x),
        next = h * taper(0.549 - x);
      fin([
        x,
        edge * 0.94,
        0,
        x - 0.049,
        next * 0.94,
        0,
        x - 0.048,
        next + 0.032 + (shape === 'dorado' ? 0.05 : 0),
        0,
      ]);
      fin([
        x,
        edge * 0.94,
        0,
        x - 0.048,
        next + 0.032 + (shape === 'dorado' ? 0.05 : 0),
        0,
        x,
        edge + 0.039 + (shape === 'dorado' ? 0.05 : 0),
        0,
      ]);
    }
  }
  if (shape === 'lion')
    for (let i = 0; i < 11; i++) {
      const x = 0.27 - i * 0.052;
      addRod(
        new T.Vector3(x, h * 0.4, 0),
        new T.Vector3(x - 0.085, h * (1.45 + 0.45 * Math.sin(i * 0.32)), 0),
        0.018,
        accent,
      );
    }
  for (const side of [-1, 1]) {
    const flat = shape === 'flounder' || shape === 'turbot';
    const eye = new T.Mesh(new T.SphereGeometry(0.024, 10, 8), new T.MeshStandardMaterial({ color: 0x191f20 }));
    eye.position.set(
      0.34 + (flat ? side * 0.045 : 0),
      flat ? h * 0.81 : h * 0.29,
      flat ? w * 0.19 : side * w * taper(0.16) * 0.91,
    );
    root.add(eye);
    if (shape === 'lion')
      for (let j = 0; j < 7; j++) {
        const a = 0.45 + j * 0.28,
          tip = new T.Vector3(
            0.09 - 0.28 * Math.cos(a),
            -0.12 + 0.16 * Math.sin(a),
            side * (0.24 + 0.22 * Math.sin(a)),
          );
        addRod(new T.Vector3(0.17, -0.03, side * w * 0.5), tip, 0.012, accent);
        fin([0.18, -0.02, side * w * 0.5, tip.x, tip.y, tip.z, tip.x - 0.025, tip.y - 0.03, tip.z * 0.85]);
      }
    if (shape === 'cat' || shape === 'tench')
      for (let n = 0; n < 2; n++)
        addRod(
          new T.Vector3(0.39, -0.018, side * w * 0.48),
          new T.Vector3(0.48 - n * 0.07, -0.038 - n * 0.035, side * w * (1.65 + n * 0.3)),
          0.009,
          base,
        );
  }
  if (['fish-squid', 'fish-moon-jelly', 'fish-river-crab'].includes(id)) {
    for (const part of [...root.children]) disposeFish(part);
    const crab = id === 'fish-river-crab',
      jelly = id === 'fish-moon-jelly';
    const mat = new T.MeshStandardMaterial({
      color: crab ? 0xb45f42 : jelly ? 0xd0adff : 0xd69baf,
      roughness: 0.42,
      transparent: jelly,
      opacity: jelly ? 0.72 : 1,
    });
    const body = new T.Mesh(new T.SphereGeometry(1, 18, 12), mat);
    body.scale.set(
      crab ? 0.29 : jelly ? 0.28 : 0.38,
      crab ? 0.11 : jelly ? 0.2 : 0.13,
      crab ? 0.26 : jelly ? 0.28 : 0.13,
    );
    root.add(body);
    for (let j = 0; j < (crab ? 8 : 10); j++) {
      const a = (j * Math.PI * 2) / (crab ? 8 : 10),
        x = Math.cos(a),
        z = Math.sin(a);
      const from = new T.Vector3(crab || jelly ? x * 0.18 : -0.2, -0.02, z * 0.11),
        mid = new T.Vector3(crab || jelly ? x * 0.32 : -0.38, -0.06, z * 0.21);
      const end = new T.Vector3(
        crab ? x * 0.4 : jelly ? x * 0.24 : -0.65,
        crab ? -0.14 : jelly ? -0.38 : -0.13,
        z * (crab ? 0.41 : 0.21),
      );
      addRod(from, mid, 0.045, mat.color);
      addRod(mid, end, 0.029, mat.color);
    }
  }
  if (spec?.id.startsWith('fish-cove-') && spec.portrait) {
    const url = spec.portrait.replace('.png', '.json');
    void referenceModel(url)
      .then((object) => {
        if (!root.parent) {
          disposeFish(object);
          return;
        }
        const box = new T.Box3().setFromObject(object),
          size = box.getSize(new T.Vector3()),
          center = box.getCenter(new T.Vector3());
        const scale = 1 / Math.max(size.x, size.y, size.z);
        object.position.addScaledVector(center, -scale);
        object.scale.multiplyScalar(scale);
        const fallback = [...root.children];
        for (const child of fallback) disposeFish(child);
        root.add(object);
        object.traverse((o) => {
          o.layers.set(1);
          if (star && o instanceof T.Mesh && o.material instanceof T.MeshStandardMaterial) {
            o.material.emissive.lerp(new T.Color(0x94d4ff), 0.6);
            o.material.emissiveIntensity = Math.max(0.35, o.material.emissiveIntensity);
          }
        });
      })
      .catch((e) => console.warn('鱼获模型', e));
  }
  root.traverse((o) => o.layers.set(1));
  return root;
}
