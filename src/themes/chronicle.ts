import * as T from 'three';
import type {ChronicleSpec, ChronicleTheme} from '../../content/levels/types';
import type {Stage, StageLook} from '../level/stage';
import type {ChronicleLayout, ChronicleState} from '../templates/chronicle';
import {ELEMENT_LABELS} from '../templates/chronicle';
import {elements as slimeElements} from '../slime/elements';
import {rng} from '../templates/random';
import {buildChronicleLandmark, type LandmarkHandle} from './chronicle-landmarks';

interface ThemeColors {
  look: StageLook;
  ground: string;
  walkway: string;
  plaza: string;
  basin: string;
  terrace: string;
  wall: string;
  roof: string;
  foliageA: string;
  foliageB: string;
  water: string;
  distant: string;
}

const THEMES: Record<ChronicleTheme, ThemeColors> = {
  jiangnan: {
    look: {skyTop: '#4c7ea1', skyHorizon: '#d9e7df', fog: [42, 138], sun: '#fff4da', sunIntensity: 2.05, hemiSky: '#eef7f4', hemiGround: '#5f6f68', ink: '#243038', wash: '#dce6e1'},
    ground: '#cfd6c9', walkway: '#ded8ca', plaza: '#e4dfd2', basin: '#557577', terrace: '#b8c7b0',
    wall: '#f2efe6', roof: '#3c4957', foliageA: '#5f9a6e', foliageB: '#85b67c', water: '#58a8b5', distant: '#7c949c',
  },
  academy: {
    look: {skyTop: '#56758f', skyHorizon: '#e8dec8', fog: [44, 140], sun: '#ffeed0', sunIntensity: 2.0, hemiSky: '#f7f1e3', hemiGround: '#6b6054', ink: '#29272b', wash: '#e4dbc9'},
    ground: '#c7c2b2', walkway: '#dbd4c3', plaza: '#e2d9c5', basin: '#5a6f75', terrace: '#b9b49f',
    wall: '#9b968d', roof: '#444b54', foliageA: '#4e7c5a', foliageB: '#d9a44b', water: '#629ca8', distant: '#869099',
  },
  terraces: {
    look: {skyTop: '#4e8ea6', skyHorizon: '#d9ebd9', fog: [44, 145], sun: '#fff5d6', sunIntensity: 2.15, hemiSky: '#e8f7eb', hemiGround: '#4a6b4f', ink: '#1f332c', wash: '#d6e8dc'},
    ground: '#7cae67', walkway: '#d7cdb6', plaza: '#dfd4be', basin: '#477a78', terrace: '#699e57',
    wall: '#efe7d6', roof: '#5b4a3e', foliageA: '#4c8c4a', foliageB: '#7dbb5f', water: '#56b1b8', distant: '#6c998b',
  },
  'palace-wall': {
    look: {skyTop: '#3e628c', skyHorizon: '#efd6b8', fog: [44, 145], sun: '#ffe9c2', sunIntensity: 2.1, hemiSky: '#fff2de', hemiGround: '#6e5245', ink: '#2b2024', wash: '#e8d4bc'},
    ground: '#cfc6b5', walkway: '#e0d6c2', plaza: '#e7decb', basin: '#4d6f7c', terrace: '#c0b29e',
    wall: '#a83c32', roof: '#d4a03a', foliageA: '#487551', foliageB: '#e0ad48', water: '#5897ab', distant: '#7c788a',
  },
  frontier: {
    look: {skyTop: '#3d6d9e', skyHorizon: '#edc99b', fog: [46, 150], sun: '#ffe8ba', sunIntensity: 2.2, hemiSky: '#fff1d9', hemiGround: '#826148', ink: '#30241e', wash: '#ebd5b7'},
    ground: '#d5b48c', walkway: '#e2caa7', plaza: '#e8d4b5', basin: '#577a82', terrace: '#c79f73',
    wall: '#c99768', roof: '#6b4c39', foliageA: '#7a9456', foliageB: '#d9a648', water: '#5fa4b0', distant: '#a6876f',
  },
  'modern-port': {
    look: {skyTop: '#456f96', skyHorizon: '#d7e3eb', fog: [44, 142], sun: '#fff3da', sunIntensity: 2.05, hemiSky: '#eef5fa', hemiGround: '#546370', ink: '#202b36', wash: '#d7e0e6'},
    ground: '#b8bec2', walkway: '#d2d6d8', plaza: '#dbdfe0', basin: '#3b647d', terrace: '#9fa9b0',
    wall: '#a65749', roof: '#48596b', foliageA: '#5c8c64', foliageB: '#7fa872', water: '#4692b3', distant: '#768c9e',
  },
  aerospace: {
    look: {skyTop: '#1e3963', skyHorizon: '#e5b887', fog: [48, 155], sun: '#ffe9bf', sunIntensity: 2.2, hemiSky: '#dce8f7', hemiGround: '#5c5559', ink: '#182436', wash: '#d9d5d8'},
    ground: '#cfc0a8', walkway: '#d9dee3', plaza: '#e3e7eb', basin: '#3d637d', terrace: '#b8c1c9',
    wall: '#e6ebf0', roof: '#3b577a', foliageA: '#6b8f64', foliageB: '#90a672', water: '#4c94b5', distant: '#80879c',
  },
  'overseas-classic': {
    look: {skyTop: '#3d6f9c', skyHorizon: '#d9e8e6', fog: [44, 148], sun: '#fff3d6', sunIntensity: 2.05, hemiSky: '#eaf4f5', hemiGround: '#4d615c', ink: '#1e2c36', wash: '#d6e3e3'},
    ground: '#8fb082', walkway: '#d9d3c5', plaza: '#e3ddd0', basin: '#3f6e80', terrace: '#7c9c72',
    wall: '#d8cfc0', roof: '#4c5f70', foliageA: '#3f7852', foliageB: '#5c9463', water: '#4d9eb5', distant: '#6b8594',
  },
};

const SOLEMN_LOOK: StageLook = {
  skyTop: '#24384d', skyHorizon: '#a7bcc4', fog: [42, 148], sun: '#f2e4cc', sunIntensity: 1.65,
  hemiSky: '#d2dfe6', hemiGround: '#4a5a66', ink: '#1e2b36', wash: '#ccd7db',
};

export function chronicleLook(spec: ChronicleSpec): StageLook {
  return spec.tone === 'solemn' ? SOLEMN_LOOK : THEMES[spec.theme].look;
}

const BASE_GEOS = {
  box: new T.BoxGeometry(1, 1, 1),
  cyl: new T.CylinderGeometry(1, 1, 1, 10),
  cone: new T.ConeGeometry(1, 1, 7),
  sphere: new T.SphereGeometry(1, 12, 8),
  oct: new T.OctahedronGeometry(1, 0),
};
type GeoKey = keyof typeof BASE_GEOS;

function jitterHex(hex: string, delta: number) {
  const c = new T.Color(hex);
  const hsl = {h: 0, s: 0, l: 0};
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0.05, Math.min(0.96, hsl.l + delta)));
  return c;
}

class BatchKit {
  private buckets = new Map<string, {geo: GeoKey; lit: boolean; fx: boolean; mats: T.Matrix4[]; cols: T.Color[]}>();
  private helper = new T.Object3D();
  add(geo: GeoKey, hex: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0, lit = false, fx = false, jitter = 0) {
    const key = `${geo}:${lit ? 1 : 0}:${fx ? 1 : 0}`;
    let b = this.buckets.get(key);
    if (!b) { b = {geo, lit, fx, mats: [], cols: []}; this.buckets.set(key, b); }
    this.helper.position.set(x, y, z);
    this.helper.rotation.set(rx, ry, rz);
    this.helper.scale.set(sx, sy, sz);
    this.helper.updateMatrix();
    b.mats.push(this.helper.matrix.clone());
    b.cols.push(jitter ? jitterHex(hex, jitter) : new T.Color(hex));
  }
  flush(parent: T.Object3D, stdMat: T.Material, litMat: T.Material) {
    for (const b of this.buckets.values()) {
      const mesh = new T.InstancedMesh(BASE_GEOS[b.geo], b.lit ? litMat : stdMat, b.mats.length);
      mesh.name = b.fx ? 'scenery-fx' : 'scenery-solid';
      for (let i = 0; i < b.mats.length; i++) {
        mesh.setMatrixAt(i, b.mats[i]);
        mesh.setColorAt(i, b.cols[i]);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = !b.lit && !b.fx;
      mesh.receiveShadow = !b.lit && !b.fx;
      parent.add(mesh);
    }
    this.buckets.clear();
  }
}

function makeMat(stage: Stage, color: string, basic = false) {
  if (basic) return new T.MeshBasicMaterial({color});
  if (typeof (stage as any).toon === 'function') return (stage as any).toon(color);
  return new T.MeshStandardMaterial({color, roughness: 0.72, metalness: 0.06});
}

function makePlaqueMesh(title: string, yearStr: string, accent: string): T.Mesh | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#252a34';
  g.fillRect(0, 0, 512, 160);
  g.strokeStyle = accent;
  g.lineWidth = 8;
  g.strokeRect(10, 10, 492, 140);
  g.fillStyle = accent;
  g.font = 'bold 34px "Microsoft YaHei", sans-serif';
  g.textAlign = 'center';
  g.fillText(yearStr, 256, 56);
  g.fillStyle = '#faf6eb';
  g.font = 'bold 42px "Microsoft YaHei", sans-serif';
  g.fillText(title.slice(0, 12), 256, 118);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  return new T.Mesh(new T.PlaneGeometry(3.4, 1.05), new T.MeshBasicMaterial({map: tex}));
}

export interface ChronicleSceneHandle {
  landmark: LandmarkHandle;
  update(time: number, dt: number, state: ChronicleState, finaleT: number): void;
}

export function buildChronicleScene(stage: Stage, spec: ChronicleSpec, layout: ChronicleLayout): ChronicleSceneHandle {
  const palette = THEMES[spec.theme];
  const [primary, accent] = spec.palette;
  const r = rng(spec.id + '-scene');
  const root = new T.Group();
  stage.scene.add(root);

  const stdInstanceMat = new T.MeshStandardMaterial({roughness: 0.74, metalness: 0.08});
  const litInstanceMat = new T.MeshBasicMaterial();
  const kit = new BatchKit();

  // 1. Strictly non-overlapping ground surfaces extruded downward by 0.55m
  const roleColor = {
    main: palette.ground,
    walkway: palette.walkway,
    plaza: palette.plaza,
    basin: palette.basin,
    terrace: palette.terrace,
  };
  for (const s of layout.surfaces) {
    const w = s.max[0] - s.min[0], d = s.max[1] - s.min[1];
    const cx = (s.min[0] + s.max[0]) / 2, cz = (s.min[1] + s.max[1]) / 2;
    const h = 0.55;
    kit.add('box', roleColor[s.role], cx, s.height - h / 2, cz, w, h, d, 0, 0, 0, false, false, r.range(-0.015, 0.015));
  }

  // 2. Water surfaces (strictly between basin floor -0.45 and banks 0.0, name contains 'water')
  for (const f of layout.fluids) {
    const w = f.max[0] - f.min[0], d = f.max[1] - f.min[1];
    const m = new T.Mesh(
      new T.PlaneGeometry(w - 0.02, d - 0.02),
      new T.MeshStandardMaterial({color: palette.water, roughness: 0.25, metalness: 0.15, transparent: true, opacity: 0.86}),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set((f.min[0] + f.max[0]) / 2, f.level, (f.min[1] + f.max[1]) / 2);
    m.name = 'water-fx';
    root.add(m);
  }

  // 3. Static layout boxes (every box drawn cleanly with zero coplanar overlap)
  let bridgeMesh: T.Mesh | null = null;
  layout.boxes.forEach((b, idx) => {
    const w = b.max[0] - b.min[0], h = b.max[1] - b.min[1], d = b.max[2] - b.min[2];
    const cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2, cz = (b.min[2] + b.max[2]) / 2;
    if (idx === layout.bridgeIndex) {
      bridgeMesh = new T.Mesh(new T.BoxGeometry(w, 0.22, d), makeMat(stage, '#b88352'));
      bridgeMesh.position.set(cx, -3.5, cz);
      bridgeMesh.castShadow = true;
      bridgeMesh.receiveShadow = true;
      root.add(bridgeMesh);
      return;
    }
    const color =
      b.kind === 'hurdle' ? primary :
      b.kind === 'lowbar' ? accent :
      b.kind === 'plinth' ? '#e8dfc9' :
      b.kind === 'step' ? '#d4cbb8' :
      b.kind === 'bridge' ? '#b07b4c' :
      b.kind === 'terrace' ? palette.terrace :
      b.kind === 'tower' ? palette.wall :
      palette.roof;
    kit.add('box', color, cx, cy, cz, w, h, d, 0, 0, 0, false, false, r.range(-0.02, 0.02));
  });

  // 4. Era plaque stand beside finish plinth (plaque plane offset +0.16m forward from stone backing -> zero Z-fighting)
  const plaqueX = layout.finish.pos[0] + (layout.mode === 'gather' ? 5.6 : -5.2);
  const plaqueZ = layout.finish.pos[2] + 1.4;
  kit.add('box', palette.roof, plaqueX, 1.3, plaqueZ, 3.8, 1.4, 0.24);
  kit.add('cyl', '#5b4a3e', plaqueX - 1.5, 0.65, plaqueZ, 0.14, 1.3, 0.14);
  kit.add('cyl', '#5b4a3e', plaqueX + 1.5, 0.65, plaqueZ, 0.14, 1.3, 0.14);
  const plaque = makePlaqueMesh(spec.title, spec.id.slice(5) + ' · ' + (spec.region === 'cn' ? '中国历史' : '世界历史'), accent);
  if (plaque) {
    plaque.position.set(plaqueX, 1.3, plaqueZ + 0.16);
    plaque.name = 'plaque-fx';
    root.add(plaque);
  }

  // 5. Perimeter theme architecture, foliage & life traces (InstancedMesh batched)
  const minZ = layout.bounds.min[2] + 6;
  const maxZ = layout.bounds.max[2] - 4;
  const sideX = layout.mode === 'gather' ? 14.5 : layout.mode === 'parkour' ? 9.8 : 11.5;
  for (let z = maxZ; z >= minZ; z -= 6.5) {
    for (const side of [-1, 1]) {
      const px = side * (sideX + r.range(0, 1.6));
      const pz = z + r.range(-1.2, 1.2);
      if (spec.theme === 'terraces') {
        // Stepped tea bushes + bamboo drying racks
        kit.add('box', palette.foliageA, px, 0.55, pz, 2.8, 1.1, 3.6, 0, 0, 0, false, false, r.range(-0.04, 0.04));
        kit.add('box', palette.foliageB, px + side * 1.9, 1.25, pz, 2.6, 2.5, 4.0, 0, 0, 0, false, false, r.range(-0.04, 0.04));
        if (Math.abs(Math.round(z)) % 13 < 7) {
          kit.add('cyl', '#8c6943', px - side * 1.7, 0.6, pz, 0.12, 1.2, 0.12);
          kit.add('cyl', '#d9b56c', px - side * 1.7, 1.26, pz, 0.52, 0.12, 0.52);
        }
      } else if (spec.theme === 'aerospace') {
        // Telemetry floodlight masts & grounded desert mesas
        kit.add('cyl', '#6c7a89', px, 2.4, pz, 0.16, 4.8, 0.16);
        kit.add('box', '#f5e1a4', px, 4.95, pz, 0.75, 0.35, 0.35, 0, 0, 0, true, true);
        kit.add('cone', '#bfa588', px + side * 2.5, 0.55, pz + 1.5, 1.9, 1.3, 1.6, 0, r.range(0, 3), 0, false, false, r.range(-0.04, 0.04));
      } else if (spec.theme === 'overseas-classic' && spec.landmark === 'nature-monument') {
        // Tall pine / sequoia trees & granite boulders
        const th = r.range(3.6, 5.8);
        kit.add('cyl', '#6e4a35', px, th * 0.25, pz, 0.24, th * 0.5, 0.24);
        kit.add('cone', palette.foliageA, px, th * 0.62, pz, 1.35, th * 0.55, 1.35, 0, r.range(0, 2), 0, false, false, r.range(-0.04, 0.04));
        kit.add('cone', palette.foliageB, px, th * 0.92, pz, 0.95, th * 0.42, 0.95, 0, r.range(0, 2), 0, false, false, r.range(-0.04, 0.04));
      } else {
        // Eaves courtyard houses / colonnades + trees + lanterns
        const bh = r.range(2.8, 4.4);
        kit.add('box', palette.wall, px + side * 1.5, bh / 2, pz, 3.2, bh, 4.2, 0, 0, 0, false, false, r.range(-0.04, 0.04));
        kit.add('box', palette.roof, px + side * 1.5, bh + 0.22, pz, 3.7, 0.44, 4.7, 0, 0, 0, false, false, r.range(-0.03, 0.03));
        // Warm street lantern post facing the walkway
        kit.add('cyl', '#54463d', px - side * 1.2, 1.3, pz, 0.09, 2.6, 0.09);
        kit.add('sphere', accent, px - side * 1.2, 2.75, pz, 0.26, 0.3, 0.26, 0, 0, 0, true, true);
        // Roadside foliage cluster
        kit.add('cyl', '#6e4e39', px - side * 0.5, 0.7, pz + 2.6, 0.14, 1.4, 0.14);
        kit.add('sphere', palette.foliageA, px - side * 0.5, 1.9, pz + 2.6, 1.05, 0.95, 1.05, 0, 0, 0, false, false, r.range(-0.04, 0.04));
      }
    }
  }

  // 6. Distant 65m+ skyline silhouettes (layer 3 background depth, all marked fx)
  for (let i = 0; i < 22; i++) {
    const ang = (i / 22) * Math.PI * 2;
    const dist = r.range(64, 92);
    const dx = Math.cos(ang) * dist;
    const dz = Math.sin(ang) * dist - 10;
    const mh = r.range(12, 28);
    const mw = r.range(14, 28);
    kit.add('cone', palette.distant, dx, mh * 0.45 - 2, dz, mw, mh, mw * 0.85, 0, r.range(0, 3), 0, false, true, r.range(-0.04, 0.04));
  }

  kit.flush(root, stdInstanceMat, litInstanceMat);

  // 7. Landmark monument behind finish plinth
  const landmark = buildChronicleLandmark(stage, spec, layout.landmarkPos);

  // 8. Interactive & animated gameplay objects: pickups, relay pad, devices, wind rings, finish ring
  const relicMeshes = layout.pickups.map(p => {
    const g = new T.Group();
    g.position.set(p.pos[0], p.pos[1], p.pos[2]);
    g.name = 'relic-fx';
    const gem = new T.Mesh(new T.OctahedronGeometry(0.36, 0), makeMat(stage, accent, true));
    const halo = new T.Mesh(new T.TorusGeometry(0.55, 0.05, 8, 20), makeMat(stage, '#fff2ba', true));
    halo.rotation.x = Math.PI / 2;
    const beam = new T.Mesh(
      new T.CylinderGeometry(0.14, 0.24, 2.2, 10, 1, true),
      new T.MeshBasicMaterial({color: accent, transparent: true, opacity: 0.24, side: T.DoubleSide}),
    );
    beam.position.y = 0.85;
    g.add(gem, halo, beam);
    root.add(g);
    return {group: g, baseY: p.pos[1], fade: 1};
  });

  const padMeshes = layout.pads.map(pad => {
    const g = new T.Group();
    g.position.set(pad[0], pad[1] + 0.04, pad[2]);
    const base = new T.Mesh(new T.CylinderGeometry(1.05, 1.18, 0.12, 18), makeMat(stage, '#b88547'));
    const ring = new T.Mesh(new T.TorusGeometry(1.12, 0.08, 8, 24), makeMat(stage, '#ffe48f', true));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.14;
    ring.name = 'pad-ring-fx';
    g.add(base, ring);
    root.add(g);
    return {group: g, ring};
  });

  const deviceMeshes = layout.devices.map(dev => {
    const col = slimeElements[dev.element]?.color ?? accent;
    const g = new T.Group();
    g.position.set(dev.pos[0], dev.pos[1], dev.pos[2]);
    const pillar = new T.Mesh(new T.CylinderGeometry(0.42, 0.56, 1.5, 12), makeMat(stage, '#5a6270'));
    pillar.position.y = 0.75;
    const orb = new T.Mesh(new T.OctahedronGeometry(0.42, 0), makeMat(stage, col, true));
    orb.position.y = 2.05;
    orb.name = 'device-orb-fx';
    const ring = new T.Mesh(new T.TorusGeometry(0.88, 0.06, 8, 22), makeMat(stage, col, true));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.12;
    ring.name = 'device-ring-fx';
    g.add(pillar, orb, ring);
    root.add(g);
    return {group: g, orb, ring, label: ELEMENT_LABELS[dev.element]};
  });

  const windMeshes = layout.windRings.map(w => {
    const g = new T.Group();
    g.position.set(w.pos[0], w.pos[1], w.pos[2]);
    g.name = 'wind-fx';
    const ring = new T.Mesh(new T.TorusGeometry(w.radius * 0.78, 0.1, 8, 26), makeMat(stage, '#9bf0de', true));
    const inner = new T.Mesh(new T.TorusGeometry(w.radius * 0.52, 0.06, 8, 20), makeMat(stage, '#ffffff', true));
    g.add(ring, inner);
    root.add(g);
    return g;
  });

  // Finish plinth beacon ring (strictly lifted +0.08m above plinth top so zero Z-fighting!)
  const finishRing = new T.Mesh(
    new T.TorusGeometry(1.75, 0.09, 8, 28),
    makeMat(stage, '#ffe07a', true),
  );
  finishRing.rotation.x = Math.PI / 2;
  finishRing.position.set(layout.finish.pos[0], layout.finish.pos[1] + 0.08, layout.finish.pos[2]);
  finishRing.name = 'finish-ring-fx';
  root.add(finishRing);

  function update(time: number, dt: number, state: ChronicleState, finaleT: number) {
    // Animate relics
    relicMeshes.forEach((rm, i) => {
      if (state.collected[i]) {
        if (rm.fade > 0) {
          rm.fade = Math.max(0, rm.fade - dt * 3.2);
          rm.group.position.y += dt * 2.2;
          rm.group.scale.setScalar(Math.max(0.001, rm.fade));
          if (rm.fade <= 0) rm.group.visible = false;
        }
        return;
      }
      rm.group.position.y = rm.baseY + Math.sin(time * 2.6 + i * 1.1) * 0.15;
      rm.group.rotation.y = time * 1.5 + i;
    });

    // Animate relay drawbridge smoothly
    if (bridgeMesh) {
      const targetY = state.bridgeOpen ? -0.05 : -3.5;
      bridgeMesh.position.y += (targetY - bridgeMesh.position.y) * Math.min(1, dt * 8);
    }
    padMeshes.forEach(pm => {
      pm.ring.scale.setScalar(state.bridgeOpen ? 1.16 : 0.94 + Math.sin(time * 3.5) * 0.08);
    });
    deviceMeshes.forEach((dm, i) => {
      const done = state.devicesDone[i];
      dm.orb.rotation.y = time * (done ? 3.2 : 1.0);
      dm.orb.position.y = 2.05 + (done ? 0.35 : Math.sin(time * 2.4 + i) * 0.1);
      dm.ring.scale.setScalar(done ? 1.25 : 0.95 + Math.sin(time * 3 + i) * 0.08);
    });
    windMeshes.forEach((wg, i) => {
      wg.rotation.z = time * (i % 2 ? 1.4 : -1.4);
      wg.position.y = layout.windRings[i].pos[1] + Math.sin(time * 2 + i) * 0.18;
    });
    finishRing.scale.setScalar(state.readyForFinale ? 1 + Math.sin(time * 3.5) * 0.07 : 0.72);
    landmark.update(time, finaleT, state.readyForFinale);
  }

  return {landmark, update};
}
