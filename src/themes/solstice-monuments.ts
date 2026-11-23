import * as T from 'three';
import {LAYER, type Stage} from '../level/stage';
import type {SolsticeMonument} from '../../content/levels/types';

export interface MonumentHandle {
  group: any;
  coreY: number;
  update(time: number, dt: number, charge: number, finaleT: number): void;
}

const TAU = Math.PI * 2;

function addMesh(parent: any, geo: any, mat: any, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, outline = true) {
  const m = new T.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  if (outline) {
    m.castShadow = true;
    m.receiveShadow = true;
  } else {
    m.layers.set(LAYER.NO_OUTLINE);
  }
  parent.add(m);
  return m;
}

export function buildMonument(
  stage: Stage,
  kind: SolsticeMonument,
  palette: [string, string],
): MonumentHandle {
  const group = new T.Group();
  const [primary, accent] = palette;
  const matPrimary = stage.toon(primary);
  const matAccent = stage.toon(accent, {emissive: accent, emissiveIntensity: 0.25});
  const matGold = stage.toon('#f3c76b', {emissive: '#d89b32', emissiveIntensity: 0.2});
  const matCream = stage.toon('#f2ead8');
  const matSteel = stage.toon('#4c5e6b');
  const matGlow = new T.MeshBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: T.AdditiveBlending,
    side: T.DoubleSide,
  });

  // Sculpted stepped plinth common to all monuments
  addMesh(group, new T.CylinderGeometry(2.6, 3.1, 0.5, 12), matSteel, 0, 0.25, 0);
  addMesh(group, new T.CylinderGeometry(2.15, 2.45, 0.42, 12), matCream, 0, 0.71, 0);
  const plinthRing = addMesh(group, new T.TorusGeometry(2.35, 0.08, 10, 48), matGlow, 0, 0.94, 0, Math.PI / 2, 0, 0, false);

  // Orbiting charge halo rings (light up progressively as nodes 1..3 activate)
  const haloRings: any[] = [];
  for (let i = 0; i < 3; i++) {
    const r = addMesh(
      group,
      new T.TorusGeometry(2.7 + i * 0.55, 0.045, 8, 56),
      new T.MeshBasicMaterial({
        color: i === 1 ? '#ffffff' : accent,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
      0,
      3.5 + i * 0.5,
      0,
      Math.PI / 2 + (i - 1) * 0.22,
      0,
      0,
      false,
    );
    haloRings.push(r);
  }

  const coreGlow = stage.glow(accent, 4.2, 0.55);
  coreGlow.position.set(0, 4.0, 0);
  group.add(coreGlow);

  // Monument-specific hero sculpture & updater
  let coreY = 4.2;
  let customUpdate: (time: number, dt: number, charge: number, finaleT: number) => void = () => {};

  if (kind === 'biplane') {
    // Wright Flyer style dual-wing biplane on wooden launch rail
    addMesh(group, new T.BoxGeometry(0.45, 0.18, 5.4), matSteel, 0, 1.05, 0);
    const plane = new T.Group();
    plane.position.set(0, 2.5, 0);
    group.add(plane);
    // Upper and lower canvas wings with subtle camber
    addMesh(plane, new T.BoxGeometry(6.2, 0.12, 1.35), matCream, 0, 0.95, 0);
    addMesh(plane, new T.BoxGeometry(6.2, 0.12, 1.35), matCream, 0, -0.2, 0);
    // Struts
    for (const sx of [-2.4, -1.0, 1.0, 2.4]) {
      for (const sz of [-0.45, 0.45]) {
        addMesh(plane, new T.CylinderGeometry(0.035, 0.035, 1.15, 6), matGold, sx, 0.37, sz);
      }
    }
    // Tail & front elevator
    addMesh(plane, new T.BoxGeometry(1.8, 0.09, 0.6), matAccent, 0, 0.15, 1.75);
    addMesh(plane, new T.BoxGeometry(0.1, 0.95, 0.7), matAccent, -0.35, 0.35, -1.7);
    addMesh(plane, new T.BoxGeometry(0.1, 0.95, 0.7), matAccent, 0.35, 0.35, -1.7);
    addMesh(plane, new T.BoxGeometry(0.65, 0.42, 0.9), matPrimary, 0, 0.05, 0.15);
    // Twin spinning propellers
    const props: any[] = [];
    for (const sx of [-1.15, 1.15]) {
      const p = new T.Group();
      p.position.set(sx, 0.35, -0.78);
      addMesh(p, new T.BoxGeometry(1.25, 0.13, 0.05), matGold, 0, 0, 0);
      addMesh(p, new T.BoxGeometry(0.13, 1.25, 0.05), matGold, 0, 0, 0);
      plane.add(p);
      props.push(p);
    }
    const trail = addMesh(plane, new T.ConeGeometry(0.6, 3.8, 12, 1, true), matGlow, 0, 0.3, -2.6, Math.PI / 2, 0, 0, false);
    coreY = 3.2;
    customUpdate = (t, _dt, charge, f) => {
      const spin = 2.5 + charge * 6 + (f >= 0 ? 18 : 0);
      props.forEach((p, i) => (p.rotation.z = t * spin * (i ? -1 : 1)));
      if (f >= 0) {
        const rise = Math.min(1, f / 3.2);
        const angle = f * 0.95;
        const r = 4.6 * Math.sin(rise * Math.PI * 0.5);
        plane.position.set(Math.sin(angle) * r, 2.5 + rise * 5.2 + Math.sin(f * 3) * 0.3, Math.cos(angle) * r - r);
        plane.rotation.set(-0.18 * rise, angle + Math.PI / 2, -0.24 * rise);
        trail.visible = true;
      } else {
        plane.position.set(0, 2.5 + Math.sin(t * 1.8) * 0.16, 0);
        plane.rotation.set(Math.sin(t * 1.1) * 0.04, Math.sin(t * 0.5) * 0.12, Math.cos(t * 1.3) * 0.04);
        trail.visible = charge > 0.6;
      }
    };
  } else if (kind === 'earthrise') {
    // Sculpted lunar horizon arc + rising sapphire-emerald Earth with glowing atmosphere
    addMesh(group, new T.SphereGeometry(2.4, 24, 14, 0, TAU, 0, Math.PI * 0.42), stage.toon('#9fa8b5'), 0, 0.35, 0);
    // Lunar craters on rim
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.4;
      addMesh(group, new T.TorusGeometry(0.28, 0.07, 6, 14), stage.toon('#7d8794'), Math.cos(a) * 1.5, 2.1, Math.sin(a) * 1.5, Math.PI / 2, 0, 0);
    }
    const earthGroup = new T.Group();
    earthGroup.position.set(0, 4.1, 0);
    group.add(earthGroup);
    const earth = addMesh(earthGroup, new T.IcosahedronGeometry(1.55, 2), stage.toon('#2d7dd2', {emissive: '#1b4965', emissiveIntensity: 0.35}));
    // Continents & cloud wisps wrapped as stylized patches
    for (let i = 0; i < 9; i++) {
      const a = i * 1.25;
      const phi = (i % 3 - 1) * 0.55;
      addMesh(
        earth,
        new T.IcosahedronGeometry(0.42 + (i % 3) * 0.12, 1),
        stage.toon(i % 2 ? '#52b788' : '#f8f9fa'),
        Math.cos(a) * Math.cos(phi) * 1.32,
        Math.sin(phi) * 1.32,
        Math.sin(a) * Math.cos(phi) * 1.32,
      );
    }
    const atmo = addMesh(
      earthGroup,
      new T.SphereGeometry(1.82, 24, 16),
      new T.MeshBasicMaterial({color: '#72efdd', transparent: true, opacity: 0.25, depthWrite: false, blending: T.AdditiveBlending}),
      0,
      0,
      0,
      0,
      0,
      0,
      false,
    );
    const orbitSat = new T.Group();
    earthGroup.add(orbitSat);
    addMesh(orbitSat, new T.OctahedronGeometry(0.24, 0), matGold, 2.45, 0, 0);
    addMesh(orbitSat, new T.BoxGeometry(0.08, 0.08, 1.3), matAccent, 2.45, 0, 0);
    coreY = 4.5;
    customUpdate = (t, _dt, charge, f) => {
      earth.rotation.y = t * (0.35 + charge * 0.4);
      orbitSat.rotation.y = t * (0.9 + charge * 1.2);
      orbitSat.rotation.z = 0.35;
      const lift = f >= 0 ? Math.min(1, f / 3.4) * 3.1 : charge * 0.7;
      earthGroup.position.y = 3.6 + lift + Math.sin(t * 1.5) * 0.15;
      atmo.scale.setScalar(1 + Math.sin(t * 2.4) * 0.04 + (f >= 0 ? 0.16 : 0));
    };
  } else if (kind === 'telescope') {
    // 18-segment golden hexagonal honeycomb mirror (JWST / space observatory aesthetic)
    addMesh(group, new T.CylinderGeometry(0.32, 0.55, 2.8, 10), matSteel, 0, 2.1, 0);
    // 5-layer silver sunshield kite below
    const shield = new T.Group();
    shield.position.set(0, 2.8, 0);
    group.add(shield);
    for (let s = 0; s < 3; s++) {
      addMesh(shield, new T.CylinderGeometry(2.6 - s * 0.18, 2.6 - s * 0.18, 0.04, 4), stage.toon(s === 0 ? '#d8e2dc' : '#b8c4d4'), 0, s * 0.14, 0, 0, Math.PI / 4);
    }
    const mirrorPivot = new T.Group();
    mirrorPivot.position.set(0, 4.9, 0);
    group.add(mirrorPivot);
    const hexGeo = new T.CylinderGeometry(0.46, 0.46, 0.11, 6);
    const petals: {mesh: any; bx: number; by: number}[] = [];
    // Center + 2 concentric rings of golden hex mirrors
    const coords: [number, number][] = [[0, 0]];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      coords.push([Math.cos(a) * 0.86, Math.sin(a) * 0.86]);
      coords.push([Math.cos(a) * 1.72, Math.sin(a) * 1.72]);
      const mid = a + Math.PI / 6;
      coords.push([Math.cos(mid) * 1.49, Math.sin(mid) * 1.49]);
    }
    coords.forEach(([cx, cy], idx) => {
      const m = addMesh(mirrorPivot, hexGeo, idx === 0 ? matSteel : matGold, cx, cy, 0, Math.PI / 2, 0, 0);
      petals.push({mesh: m, bx: cx, by: cy});
    });
    // Tripod boom & secondary mirror
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU - Math.PI / 2;
      addMesh(mirrorPivot, new T.CylinderGeometry(0.04, 0.04, 2.5, 6), matSteel, Math.cos(a) * 0.9, Math.sin(a) * 0.9, 1.15, 0.72, 0, a + Math.PI / 2);
    }
    addMesh(mirrorPivot, new T.OctahedronGeometry(0.32, 0), matAccent, 0, 0, 2.2);
    const starBeam = addMesh(mirrorPivot, new T.CylinderGeometry(0.15, 1.9, 18, 20, 1, true), matGlow, 0, 0, 11.2, Math.PI / 2, 0, 0, false);
    coreY = 4.9;
    customUpdate = (t, _dt, charge, f) => {
      const unfold = f >= 0 ? 1 : 0.65 + charge * 0.35;
      petals.forEach((p, idx) => {
        const spread = idx === 0 ? 1 : unfold;
        p.mesh.position.set(p.bx * spread, p.by * spread, (1 - spread) * 0.45);
      });
      mirrorPivot.rotation.y = Math.sin(t * 0.45) * 0.38;
      mirrorPivot.rotation.x = -0.35 - (f >= 0 ? Math.min(0.45, f * 0.14) : 0);
      starBeam.visible = charge > 0.6 || f >= 0;
      starBeam.material.opacity = f >= 0 ? 0.52 + Math.sin(t * 8) * 0.12 : 0.22;
    };
  } else if (kind === 'reactor') {
    // Nested counter-rotating brass & neon gyroscopic rings around a levitating crystalline core
    addMesh(group, new T.CylinderGeometry(1.2, 1.6, 1.1, 8), matSteel, 0, 1.4, 0);
    const core = addMesh(group, new T.OctahedronGeometry(0.95, 1), matAccent, 0, 4.2, 0);
    const rings: any[] = [];
    for (let i = 0; i < 3; i++) {
      const rg = new T.Group();
      rg.position.set(0, 4.2, 0);
      addMesh(rg, new T.TorusGeometry(1.55 + i * 0.48, 0.09, 10, 42), i === 1 ? matGold : matPrimary);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU;
        addMesh(rg, new T.SphereGeometry(0.14, 10, 8), matAccent, Math.cos(a) * (1.55 + i * 0.48), Math.sin(a) * (1.55 + i * 0.48), 0);
      }
      group.add(rg);
      rings.push(rg);
    }
    const pillar = addMesh(group, new T.CylinderGeometry(0.35, 0.95, 22, 16, 1, true), matGlow, 0, 14, 0, 0, 0, 0, false);
    coreY = 4.3;
    customUpdate = (t, _dt, charge, f) => {
      const spd = 0.6 + charge * 1.4 + (f >= 0 ? 4.2 : 0);
      rings[0].rotation.set(t * spd, t * spd * 0.7, 0);
      rings[1].rotation.set(-t * spd * 0.85, 0, t * spd * 1.1);
      rings[2].rotation.set(0, t * spd * 0.9, -t * spd * 0.65);
      core.rotation.y = -t * spd * 1.2;
      core.position.y = 4.2 + Math.sin(t * 2.5) * 0.22;
      core.scale.setScalar(1 + (f >= 0 ? 0.32 + Math.sin(t * 10) * 0.08 : charge * 0.14));
      pillar.visible = charge > 0.65 || f >= 0;
      pillar.material.opacity = f >= 0 ? 0.58 : 0.2;
    };
  } else if (kind === 'cinema') {
    // Classic grand golden projector / symphony arch with twin spinning reels & luminous fan screen
    addMesh(group, new T.BoxGeometry(1.6, 1.5, 1.3), matPrimary, 0, 2.2, 0);
    addMesh(group, new T.CylinderGeometry(0.32, 0.44, 0.9, 14), matGold, 0, 2.35, 0.95, Math.PI / 2);
    const reels: any[] = [];
    for (const dz of [-0.6, 0.55]) {
      const reel = new T.Group();
      reel.position.set(0, 3.65, dz);
      addMesh(reel, new T.TorusGeometry(0.78, 0.09, 8, 24), matGold, 0, 0, 0, 0, Math.PI / 2);
      for (let k = 0; k < 4; k++) {
        addMesh(reel, new T.BoxGeometry(0.06, 1.45, 0.09), matCream, 0, 0, 0, (k * Math.PI) / 4);
      }
      group.add(reel);
      reels.push(reel);
    }
    // Luminous theatrical arch & fan projection cone
    addMesh(group, new T.TorusGeometry(3.2, 0.16, 10, 40, Math.PI), matGold, 0, 1.0, -0.5);
    const cone = addMesh(group, new T.ConeGeometry(2.6, 6.2, 20, 1, true), matGlow, 0, 3.2, 4.0, -Math.PI / 2, 0, 0, false);
    // Floating golden musical notes / film frames
    const floaters: any[] = [];
    for (let i = 0; i < 6; i++) {
      const m = addMesh(group, new T.BoxGeometry(0.55, 0.4, 0.08), matAccent, 0, 4.5, 0);
      floaters.push(m);
    }
    coreY = 3.8;
    customUpdate = (t, _dt, charge, f) => {
      const spd = 1.1 + charge * 2.8 + (f >= 0 ? 5.0 : 0);
      reels.forEach(r => (r.rotation.x = t * spd));
      cone.material.opacity = f >= 0 ? 0.48 + Math.sin(t * 9) * 0.08 : 0.18 + charge * 0.2;
      floaters.forEach((m, i) => {
        const a = t * (0.7 + charge * 0.7) + (i / 6) * TAU;
        const r = 2.6 + (f >= 0 ? 1.1 : 0);
        m.position.set(Math.cos(a) * r, 3.8 + Math.sin(t * 2 + i) * 0.8 + (f >= 0 ? 1.0 : 0), Math.sin(a) * r);
        m.rotation.y = -a;
      });
    };
  } else if (kind === 'lighthouse') {
    // Striped polar lighthouse / trans-Atlantic radio beacon with rotating sweeping light beams
    for (let s = 0; s < 5; s++) {
      const rBot = 1.3 - s * 0.13;
      const rTop = 1.18 - s * 0.13;
      addMesh(group, new T.CylinderGeometry(rTop, rBot, 1.05, 14), s % 2 === 0 ? matCream : matPrimary, 0, 1.45 + s * 1.02, 0);
    }
    addMesh(group, new T.CylinderGeometry(1.05, 0.9, 0.22, 16), matSteel, 0, 6.6, 0);
    addMesh(group, new T.CylinderGeometry(0.68, 0.68, 1.0, 14), matAccent, 0, 7.2, 0);
    addMesh(group, new T.ConeGeometry(0.92, 0.95, 14), matGold, 0, 8.15, 0);
    const rotor = new T.Group();
    rotor.position.set(0, 7.2, 0);
    group.add(rotor);
    addMesh(rotor, new T.ConeGeometry(1.7, 13.5, 16, 1, true), matGlow, 0, 0, 7.2, -Math.PI / 2, 0, 0, false);
    addMesh(rotor, new T.ConeGeometry(1.7, 13.5, 16, 1, true), matGlow, 0, 0, -7.2, Math.PI / 2, 0, 0, false);
    const wave = addMesh(group, new T.TorusGeometry(1.2, 0.07, 8, 40), matGlow, 0, 7.2, 0, Math.PI / 2, 0, 0, false);
    coreY = 6.8;
    customUpdate = (t, _dt, charge, f) => {
      rotor.rotation.y = t * (0.7 + charge * 1.1 + (f >= 0 ? 1.8 : 0));
      const p = (t * (0.65 + (f >= 0 ? 0.9 : 0))) % 1;
      wave.scale.setScalar(1 + p * (f >= 0 ? 9.0 : 4.5));
      wave.material.opacity = (1 - p) * (f >= 0 ? 0.72 : 0.38);
    };
  } else if (kind === 'ship') {
    // Stylized three-masted tall explorer ship (HMS Beagle / icebreaker) riding sculpted waves
    const hull = new T.Group();
    hull.position.set(0, 1.8, 0);
    group.add(hull);
    addMesh(hull, new T.BoxGeometry(1.9, 1.0, 4.8), matPrimary, 0, 0, 0);
    addMesh(hull, new T.ConeGeometry(1.32, 1.8, 4), matPrimary, 0, 0, 3.25, Math.PI / 2, Math.PI / 4, 0);
    addMesh(hull, new T.BoxGeometry(2.02, 0.24, 4.9), matGold, 0, 0.45, 0);
    // Three masts & billowing sails
    for (const [mz, mh, sw] of [[-1.4, 3.8, 1.7], [0.1, 4.7, 2.2], [1.6, 3.6, 1.6]] as [number, number, number][]) {
      addMesh(hull, new T.CylinderGeometry(0.07, 0.1, mh, 8), matGold, 0, mh / 2 + 0.3, mz);
      addMesh(hull, new T.BoxGeometry(sw, mh * 0.42, 0.1), matCream, 0, mh * 0.56 + 0.3, mz + 0.18, 0.14);
      addMesh(hull, new T.BoxGeometry(sw * 0.75, mh * 0.28, 0.09), matAccent, 0, mh * 0.88 + 0.1, mz + 0.14, 0.12);
    }
    const wake = addMesh(group, new T.TorusGeometry(2.8, 0.12, 8, 44), matGlow, 0, 1.2, 0, Math.PI / 2, 0, 0, false);
    coreY = 4.2;
    customUpdate = (t, _dt, charge, f) => {
      hull.rotation.z = Math.sin(t * 1.4) * 0.08;
      hull.rotation.x = Math.cos(t * 1.1) * 0.05;
      hull.position.y = 1.85 + Math.sin(t * 1.9) * 0.16 + (f >= 0 ? Math.min(1.6, f * 0.5) : 0);
      hull.rotation.y = f >= 0 ? f * 0.45 : Math.sin(t * 0.4) * 0.16;
      wake.scale.setScalar(1 + Math.sin(t * 2.5) * 0.08 + charge * 0.2);
    };
  } else if (kind === 'chronometer') {
    // Grand gilt armillary sphere / solstice sundial / golden lotus clockwork
    addMesh(group, new T.CylinderGeometry(0.38, 0.68, 2.4, 12), matGold, 0, 2.1, 0);
    const arm = new T.Group();
    arm.position.set(0, 4.5, 0);
    group.add(arm);
    const outer = addMesh(arm, new T.TorusGeometry(2.15, 0.1, 10, 48), matGold);
    const mid = addMesh(arm, new T.TorusGeometry(1.72, 0.09, 10, 44), matAccent);
    const inner = addMesh(arm, new T.TorusGeometry(1.25, 0.08, 10, 40), matCream);
    const sunCore = addMesh(arm, new T.OctahedronGeometry(0.65, 1), matGold);
    // 12 zodiac / clock rays around outer ring
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      addMesh(outer, new T.ConeGeometry(0.14, 0.55, 6), matAccent, Math.cos(a) * 2.45, Math.sin(a) * 2.45, 0, 0, 0, a - Math.PI / 2);
    }
    coreY = 4.6;
    customUpdate = (t, _dt, charge, f) => {
      const spd = 0.35 + charge * 0.9 + (f >= 0 ? 2.4 : 0);
      outer.rotation.y = t * spd;
      mid.rotation.set(t * spd * 0.8, t * spd * 0.5, 0);
      inner.rotation.set(-t * spd * 1.1, 0, t * spd * 0.7);
      sunCore.rotation.y = -t * 1.5;
      sunCore.scale.setScalar(1 + Math.sin(t * 3) * 0.08 + (f >= 0 ? 0.35 : 0));
    };
  } else if (kind === 'tree') {
    // Luminous crystalline solstice evergreen with spiral fairy lights & floating apex star
    addMesh(group, new T.CylinderGeometry(0.35, 0.52, 1.5, 10), stage.toon('#6c4a34'), 0, 1.6, 0);
    const tiers: any[] = [];
    for (let i = 0; i < 4; i++) {
      const cone = addMesh(
        group,
        new T.ConeGeometry(2.35 - i * 0.46, 2.05 - i * 0.16, 8),
        stage.toon(i % 2 === 0 ? primary : '#2d7a6e'),
        0,
        2.75 + i * 1.25,
        0,
        0,
        i * 0.35,
      );
      tiers.push(cone);
    }
    // Spiral ornament beads
    const spiral = new T.Group();
    group.add(spiral);
    for (let i = 0; i < 24; i++) {
      const u = i / 23;
      const r = (1 - u) * 2.15 + 0.18;
      const a = u * TAU * 3.2;
      addMesh(spiral, new T.SphereGeometry(0.13, 8, 8), i % 2 ? matAccent : matGold, Math.cos(a) * r, 2.0 + u * 5.2, Math.sin(a) * r);
    }
    const star = addMesh(group, new T.OctahedronGeometry(0.55, 0), matGold, 0, 7.85, 0);
    coreY = 5.4;
    customUpdate = (t, _dt, charge, f) => {
      spiral.rotation.y = t * (0.4 + charge * 0.8 + (f >= 0 ? 1.8 : 0));
      star.rotation.y = -t * 1.6;
      star.position.y = 7.85 + Math.sin(t * 2.4) * 0.15;
      star.scale.setScalar(1 + (f >= 0 ? 0.45 + Math.sin(t * 7) * 0.12 : charge * 0.15));
      tiers.forEach((c, i) => (c.rotation.y = i * 0.35 + Math.sin(t * 0.7 + i) * 0.05));
    };
  } else if (kind === 'helix') {
    // Double-helix crystalline tower (radium luminescence & Feynman nanotechnology)
    const helix = new T.Group();
    helix.position.set(0, 1.3, 0);
    group.add(helix);
    for (let i = 0; i < 16; i++) {
      const y = i * 0.42;
      const a = i * 0.52;
      const r = 1.25;
      addMesh(helix, new T.SphereGeometry(0.22, 10, 8), matAccent, Math.cos(a) * r, y, Math.sin(a) * r);
      addMesh(helix, new T.SphereGeometry(0.22, 10, 8), matGold, -Math.cos(a) * r, y, -Math.sin(a) * r);
      if (i % 2 === 0) {
        addMesh(helix, new T.CylinderGeometry(0.05, 0.05, r * 2, 6), matCream, 0, y, 0, 0, -a, Math.PI / 2);
      }
    }
    const orb = addMesh(group, new T.OctahedronGeometry(0.65, 1), matAccent, 0, 8.4, 0);
    coreY = 4.9;
    customUpdate = (t, _dt, charge, f) => {
      helix.rotation.y = t * (0.55 + charge * 1.2 + (f >= 0 ? 2.5 : 0));
      orb.rotation.y = -t * 2;
      orb.position.y = 8.4 + Math.sin(t * 2.8) * 0.22;
      orb.scale.setScalar(1 + (f >= 0 ? 0.4 : charge * 0.15));
    };
  } else {
    // 'compass' (Antarctic Peace Beacon & Solemn Peace Sanctuary Obelisk with gentle orbiting lanterns)
    addMesh(group, new T.CylinderGeometry(0.32, 0.85, 5.2, 4), matCream, 0, 3.6, 0, 0, Math.PI / 4);
    addMesh(group, new T.OctahedronGeometry(0.65, 0), matAccent, 0, 6.75, 0);
    // Compass rose star at base
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      addMesh(group, new T.ConeGeometry(0.22, i % 2 === 0 ? 1.5 : 0.95, 4), i % 2 === 0 ? matGold : matPrimary, Math.cos(a) * 1.9, 1.05, Math.sin(a) * 1.9, Math.PI / 2, 0, -a - Math.PI / 2);
    }
    const lanterns = new T.Group();
    group.add(lanterns);
    const items: any[] = [];
    for (let i = 0; i < 8; i++) {
      const l = addMesh(lanterns, new T.OctahedronGeometry(0.24, 0), matAccent, 0, 0, 0);
      items.push(l);
    }
    coreY = 5.0;
    customUpdate = (t, _dt, charge, f) => {
      lanterns.rotation.y = t * (0.35 + charge * 0.4);
      items.forEach((l, i) => {
        const a = (i / 8) * TAU;
        const lift = f >= 0 ? Math.min(4.5, f * 0.9) : 0;
        l.position.set(Math.cos(a) * (2.3 + lift * 0.25), 2.8 + (i % 3) * 0.7 + Math.sin(t * 1.8 + i) * 0.25 + lift, Math.sin(a) * (2.3 + lift * 0.25));
      });
    };
  }

  function update(time: number, dt: number, charge: number, finaleT: number) {
    plinthRing.rotation.z = time * 0.4;
    plinthRing.material.opacity = 0.35 + charge * 0.45 + (finaleT >= 0 ? 0.2 : 0);
    coreGlow.scale.setScalar(3.6 + charge * 2.2 + (finaleT >= 0 ? 3.5 + Math.sin(time * 6) * 0.7 : 0));
    haloRings.forEach((r, i) => {
      const active = charge * 3 > i || finaleT >= 0;
      r.rotation.z = time * (0.4 + i * 0.25) * (i % 2 ? -1 : 1);
      r.rotation.x = Math.PI / 2 + Math.sin(time * 0.6 + i) * 0.25;
      r.material.opacity = active ? (finaleT >= 0 ? 0.78 : 0.48) : 0.08;
      r.scale.setScalar(active ? 1 + (finaleT >= 0 ? 0.25 : 0) : 0.85);
    });
    customUpdate(time, dt, charge, finaleT);
  }

  return {group, coreY, update};
}
