import * as T from 'three';
import type {ChronicleSpec} from '../../content/levels/types';
import type {Stage} from '../level/stage';
import type {Vec} from '../slime/types';

export interface LandmarkHandle {
  group: T.Group;
  height: number;
  focus: T.Vector3;
  update(time: number, finaleT: number, ready: boolean): void;
}

const mat = (stage: Stage, color: string, emissive = false) => {
  if (emissive) return new T.MeshBasicMaterial({color});
  if (typeof (stage as any).toon === 'function') return (stage as any).toon(color);
  return new T.MeshStandardMaterial({color, roughness: 0.65, metalness: 0.1});
};

const addMesh = (
  parent: T.Object3D,
  geo: T.BufferGeometry,
  material: T.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  name = 'landmark-part',
) => {
  const m = new T.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.name = name;
  m.castShadow = !name.includes('fx');
  m.receiveShadow = !name.includes('fx');
  parent.add(m);
  return m;
};

export function buildChronicleLandmark(stage: Stage, spec: ChronicleSpec, pos: Vec): LandmarkHandle {
  const group = new T.Group();
  group.position.set(pos[0], pos[1], pos[2]);
  stage.scene.add(group);

  const [primary, accent] = spec.palette;
  const stone = mat(stage, '#d8d2c5');
  const darkStone = mat(stage, '#525864');
  const wood = mat(stage, '#7d4e34');
  const gold = mat(stage, '#f0be59');
  const mainMat = mat(stage, primary);
  const accentMat = mat(stage, accent);
  const glowMat = mat(stage, accent, true);
  const warmGlow = mat(stage, '#ffe394', true);
  const waterMat = mat(stage, '#79d0e8', true);

  // Clean stepped monument base (strictly separated Y tiers: 0..0.42 and 0.42..0.78)
  addMesh(group, new T.BoxGeometry(6.4, 0.42, 4.4), darkStone, 0, 0.21, 0);
  addMesh(group, new T.BoxGeometry(5.4, 0.36, 3.6), stone, 0, 0.6, 0);

  const animParts: T.Object3D[] = [];
  const fxParticles: T.Mesh[] = [];
  let height = 7.2;

  // Shared subtle celebratory star/lantern orbs around the monument (hidden/subtle until finale)
  const orbGeo = new T.OctahedronGeometry(0.22, 0);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const orb = addMesh(group, orbGeo, i % 2 ? warmGlow : glowMat, Math.cos(a) * 3.1, 1.4 + (i % 3) * 0.8, Math.sin(a) * 2.2, 0, 0, 0, 'landmark-fx');
    orb.scale.setScalar(0.01);
    fxParticles.push(orb);
  }

  const kind = spec.landmark;
  const y0 = 0.78;

  if (kind === 'rocket-pad') {
    height = 10.5;
    // Steel service gantry left & right with horizontal trusses
    for (const sx of [-2.05, 2.05]) {
      addMesh(group, new T.BoxGeometry(0.46, 8.4, 0.46), darkStone, sx, y0 + 4.2, -0.5);
    }
    for (let k = 0; k < 4; k++) {
      addMesh(group, new T.BoxGeometry(3.6, 0.24, 0.34), mainMat, 0, y0 + 1.8 + k * 2.0, -0.5);
    }
    // Swing arms
    const armL = addMesh(group, new T.BoxGeometry(1.5, 0.22, 0.28), accentMat, -1.0, y0 + 5.6, 0.05);
    const armR = addMesh(group, new T.BoxGeometry(1.5, 0.22, 0.28), accentMat, 1.0, y0 + 5.6, 0.05);
    // Rocket stack (animated upward on finale!)
    const rocket = new T.Group();
    rocket.position.set(0, y0, 0.35);
    group.add(rocket);
    addMesh(rocket, new T.CylinderGeometry(0.46, 0.52, 5.4, 14), mat(stage, '#f4f6f8'), 0, 3.1, 0);
    addMesh(rocket, new T.CylinderGeometry(0.5, 0.5, 0.72, 14), mainMat, 0, 4.9, 0);
    addMesh(rocket, new T.ConeGeometry(0.46, 1.45, 14), accentMat, 0, 6.52, 0);
    addMesh(rocket, new T.CylinderGeometry(0.05, 0.05, 0.9, 8), gold, 0, 7.65, 0);
    for (let b = 0; b < 4; b++) {
      const ba = (b * Math.PI) / 2 + Math.PI / 4;
      addMesh(rocket, new T.CylinderGeometry(0.2, 0.24, 2.5, 10), mat(stage, '#e6ecf2'), Math.cos(ba) * 0.72, 1.55, Math.sin(ba) * 0.72);
      addMesh(rocket, new T.ConeGeometry(0.2, 0.55, 10), accentMat, Math.cos(ba) * 0.72, 3.08, Math.sin(ba) * 0.72);
    }
    const flame = addMesh(rocket, new T.ConeGeometry(0.68, 2.2, 12), warmGlow, 0, -0.7, 0, Math.PI, 0, 0, 'rocket-flame-fx');
    flame.scale.setScalar(0.01);
    animParts.push(rocket, flame, armL, armR);
  } else if (kind === 'tea-pavilion') {
    height = 7.6;
    // Traditional wooden tea pavilion with double eaves & central steaming copper cauldron
    for (const [cx, cz] of [[-1.8, -1.1], [1.8, -1.1], [-1.8, 1.1], [1.8, 1.1]]) {
      addMesh(group, new T.CylinderGeometry(0.16, 0.18, 3.4, 10), wood, cx, y0 + 1.7, cz);
    }
    // Lower tiered roof
    addMesh(group, new T.ConeGeometry(3.55, 1.15, 4), mainMat, 0, y0 + 3.95, 0, 0, Math.PI / 4, 0);
    // Upper pavilion drum & top roof
    addMesh(group, new T.BoxGeometry(2.3, 0.85, 1.7), mat(stage, '#f2e8d5'), 0, y0 + 4.85, 0);
    addMesh(group, new T.ConeGeometry(2.45, 1.05, 4), darkStone, 0, y0 + 5.75, 0, 0, Math.PI / 4, 0);
    addMesh(group, new T.SphereGeometry(0.24, 12, 8), gold, 0, y0 + 6.42, 0);
    // Tea roasting cauldron & hearth glow
    addMesh(group, new T.CylinderGeometry(0.75, 0.62, 0.75, 14), darkStone, 0, y0 + 0.38, 0);
    const teaHearth = addMesh(group, new T.CylinderGeometry(0.58, 0.58, 0.14, 14), warmGlow, 0, y0 + 0.82, 0, 0, 0, 0, 'tea-hearth-fx');
    // Rising aroma ribbons
    const aroma = new T.Group();
    aroma.position.set(0, y0 + 1.2, 0);
    group.add(aroma);
    for (let i = 0; i < 4; i++) {
      addMesh(aroma, new T.TorusGeometry(0.45 + i * 0.18, 0.055, 8, 20), glowMat, 0, i * 0.52, 0, Math.PI / 2, 0, 0, 'tea-steam-fx');
    }
    animParts.push(aroma, teaHearth);
  } else if (kind === 'nature-monument') {
    height = 8.8;
    // Yosemite-style twin granite peaks, giant sequoia pines & cascading waterfall!
    addMesh(group, new T.CylinderGeometry(0.95, 1.85, 6.2, 7), mat(stage, '#9da4ab'), -1.1, y0 + 3.1, -0.35);
    addMesh(group, new T.CylinderGeometry(0.65, 1.55, 4.9, 7), mat(stage, '#b4bcc2'), 1.35, y0 + 2.45, -0.2);
    // Snow/granite cap
    addMesh(group, new T.ConeGeometry(0.95, 1.2, 7), mat(stage, '#eef3f5'), -1.1, y0 + 6.8, -0.35);
    // Waterfall cascade between the two peaks (offset forward +0.72 so never coplanar!)
    const falls = addMesh(group, new T.BoxGeometry(0.78, 4.4, 0.18), waterMat, 0.15, y0 + 2.25, 0.72, 0, 0, 0, 'waterfall-fx');
    // Giant sequoias flanking the valley
    for (const [tx, tz, sc] of [[-2.45, 0.85, 1.05], [2.45, 0.8, 0.92]]) {
      addMesh(group, new T.CylinderGeometry(0.18 * sc, 0.26 * sc, 1.7 * sc, 8), wood, tx, y0 + 0.85 * sc, tz);
      addMesh(group, new T.ConeGeometry(0.88 * sc, 2.2 * sc, 8), mainMat, tx, y0 + 2.5 * sc, tz);
      addMesh(group, new T.ConeGeometry(0.66 * sc, 1.8 * sc, 8), accentMat, tx, y0 + 3.7 * sc, tz);
    }
    // Rainbow mist arch (appears on finale!)
    const rainbow = addMesh(group, new T.TorusGeometry(2.6, 0.12, 8, 28, Math.PI), warmGlow, 0.1, y0 + 2.1, 1.05, 0, 0, 0, 'rainbow-fx');
    rainbow.scale.setScalar(0.01);
    animParts.push(falls, rainbow);
  } else if (kind === 'ship-berth') {
    height = 7.8;
    // Tall exploration sailing ship perched in tranquil berth with glowing masthead lantern
    const ship = new T.Group();
    ship.position.set(0, y0 + 0.4, 0);
    group.add(ship);
    addMesh(ship, new T.BoxGeometry(4.2, 1.0, 1.6), wood, 0, 0.5, 0);
    addMesh(ship, new T.BoxGeometry(1.1, 0.65, 1.4), darkStone, -1.6, 1.32, 0);
    addMesh(ship, new T.ConeGeometry(0.82, 1.4, 4), wood, 2.75, 0.62, 0, 0, Math.PI / 4, -Math.PI / 2);
    // Two masts & billowing sails
    for (const [mx, mh] of [[-0.5, 5.2], [1.1, 4.4]]) {
      addMesh(ship, new T.CylinderGeometry(0.09, 0.12, mh, 8), wood, mx, 1.0 + mh / 2, 0);
      addMesh(ship, new T.BoxGeometry(0.14, mh * 0.52, 2.1), mat(stage, '#f4efe2'), mx + 0.22, 1.2 + mh * 0.54, 0);
    }
    const beacon = addMesh(ship, new T.OctahedronGeometry(0.34, 0), warmGlow, -0.5, 6.55, 0, 0, 0, 0, 'ship-beacon-fx');
    animParts.push(ship, beacon);
  } else if (kind === 'armillary') {
    height = 7.4;
    addMesh(group, new T.CylinderGeometry(0.42, 0.68, 2.1, 12), darkStone, 0, y0 + 1.05, 0);
    const r1 = addMesh(group, new T.TorusGeometry(2.1, 0.11, 10, 32), gold, 0, y0 + 3.7, 0);
    const r2 = addMesh(group, new T.TorusGeometry(1.65, 0.09, 10, 28), mainMat, 0, y0 + 3.7, 0, Math.PI / 3, 0, 0);
    const r3 = addMesh(group, new T.TorusGeometry(1.2, 0.08, 10, 24), accentMat, 0, y0 + 3.7, 0, 0, Math.PI / 4, Math.PI / 3);
    const core = addMesh(group, new T.SphereGeometry(0.36, 14, 10), warmGlow, 0, y0 + 3.7, 0, 0, 0, 0, 'armillary-core-fx');
    animParts.push(r1, r2, r3, core);
  } else if (kind === 'scroll-press') {
    height = 6.8;
    const leftRoller = addMesh(group, new T.CylinderGeometry(0.24, 0.24, 3.8, 12), wood, -2.1, y0 + 2.4, 0);
    const rightRoller = addMesh(group, new T.CylinderGeometry(0.24, 0.24, 3.8, 12), wood, 2.1, y0 + 2.4, 0);
    const paper = addMesh(group, new T.BoxGeometry(3.8, 3.1, 0.16), mat(stage, '#f5ebd3'), 0, y0 + 2.4, 0);
    const seal = addMesh(group, new T.BoxGeometry(0.9, 0.9, 0.12), accentMat, 0, y0 + 2.4, 0.18);
    animParts.push(paper, seal, leftRoller, rightRoller);
  } else if (kind === 'arch-bridge') {
    height = 7.0;
    for (const sx of [-2.2, 2.2]) addMesh(group, new T.BoxGeometry(0.62, 4.6, 0.9), mainMat, sx, y0 + 2.3, 0);
    addMesh(group, new T.BoxGeometry(5.6, 0.36, 1.3), stone, 0, y0 + 1.5, 0);
    addMesh(group, new T.TorusGeometry(2.2, 0.16, 8, 24, Math.PI), accentMat, 0, y0 + 1.7, 0);
    const crown = addMesh(group, new T.OctahedronGeometry(0.38, 0), warmGlow, 0, y0 + 4.35, 0, 0, 0, 0, 'bridge-crown-fx');
    animParts.push(crown);
  } else if (kind === 'bell-chime') {
    height = 7.2;
    for (const sx of [-2.0, 2.0]) addMesh(group, new T.CylinderGeometry(0.18, 0.22, 4.4, 10), wood, sx, y0 + 2.2, 0);
    addMesh(group, new T.BoxGeometry(4.8, 0.34, 0.42), mainMat, 0, y0 + 4.5, 0);
    const bells = new T.Group();
    bells.position.set(0, y0 + 4.3, 0);
    group.add(bells);
    for (let i = -2; i <= 2; i++) {
      const sz = 0.38 + (2 - Math.abs(i)) * 0.14;
      addMesh(bells, new T.CylinderGeometry(sz * 0.45, sz * 0.72, 1.15 + (2 - Math.abs(i)) * 0.22, 10), gold, i * 0.82, -1.1, 0);
    }
    const wave = addMesh(group, new T.TorusGeometry(1.5, 0.08, 8, 28), warmGlow, 0, y0 + 2.9, 0.4, 0, 0, 0, 'bell-wave-fx');
    wave.scale.setScalar(0.01);
    animParts.push(bells, wave);
  } else if (kind === 'locomotive') {
    height = 6.2;
    const train = new T.Group();
    train.position.set(0, y0, 0);
    group.add(train);
    addMesh(train, new T.BoxGeometry(4.6, 1.4, 1.65), mainMat, 0, 1.15, 0);
    addMesh(train, new T.CylinderGeometry(0.68, 0.68, 2.8, 14), darkStone, 0.7, 1.95, 0, 0, 0, Math.PI / 2);
    addMesh(train, new T.BoxGeometry(1.5, 2.2, 1.72), accentMat, -1.35, 1.9, 0);
    addMesh(train, new T.CylinderGeometry(0.24, 0.18, 0.9, 10), darkStone, 1.6, 2.9, 0);
    const lamp = addMesh(train, new T.SphereGeometry(0.26, 10, 8), warmGlow, 2.38, 1.95, 0, 0, 0, 0, 'train-lamp-fx');
    animParts.push(train, lamp);
  } else if (kind === 'radio-dish') {
    height = 7.8;
    addMesh(group, new T.CylinderGeometry(0.48, 0.82, 2.4, 12), darkStone, 0, y0 + 1.2, 0);
    const dish = new T.Group();
    dish.position.set(0, y0 + 2.6, 0);
    group.add(dish);
    addMesh(dish, new T.CylinderGeometry(2.5, 0.45, 0.85, 20), mat(stage, '#eef3f7'), 0, 0.4, 0);
    addMesh(dish, new T.CylinderGeometry(0.08, 0.08, 2.2, 8), accentMat, 0, 1.6, 0);
    const beam = addMesh(dish, new T.CylinderGeometry(0.24, 0.08, 5.2, 12), glowMat, 0, 4.4, 0, 0, 0, 0, 'dish-beam-fx');
    beam.scale.set(0.01, 0.01, 0.01);
    animParts.push(dish, beam);
  } else if (kind === 'kiln-pagoda') {
    height = 8.4;
    for (let t = 0; t < 4; t++) {
      const w = 2.6 - t * 0.42;
      addMesh(group, new T.BoxGeometry(w, 1.15, w), t % 2 ? mat(stage, '#f4efe6') : mainMat, 0, y0 + 0.6 + t * 1.55, 0);
      addMesh(group, new T.ConeGeometry(w * 0.95, 0.62, 4), darkStone, 0, y0 + 1.38 + t * 1.55, 0, 0, Math.PI / 4, 0);
    }
    const spire = addMesh(group, new T.OctahedronGeometry(0.35, 0), warmGlow, 0, y0 + 6.9, 0, 0, 0, 0, 'pagoda-spire-fx');
    animParts.push(spire);
  } else {
    // 'cinema-stage'
    height = 6.8;
    addMesh(group, new T.BoxGeometry(5.0, 3.8, 0.45), darkStone, 0, y0 + 2.2, -0.5);
    const screen = addMesh(group, new T.BoxGeometry(4.1, 2.8, 0.14), mat(stage, '#f8f2e2'), 0, y0 + 2.3, -0.18);
    const curtainL = addMesh(group, new T.BoxGeometry(1.1, 3.4, 0.28), mainMat, -1.9, y0 + 2.2, 0.16);
    const curtainR = addMesh(group, new T.BoxGeometry(1.1, 3.4, 0.28), mainMat, 1.9, y0 + 2.2, 0.16);
    animParts.push(screen, curtainL, curtainR);
  }

  const focus = new T.Vector3(pos[0], pos[1] + height * 0.48, pos[2]);

  function update(time: number, finaleT: number, ready: boolean) {
    const active = finaleT >= 0;
    const f = Math.max(0, finaleT);

    // Subtle celebratory aura orbs during finale
    fxParticles.forEach((orb, i) => {
      const a = (i / fxParticles.length) * Math.PI * 2 + time * 0.7;
      if (active) {
        const lift = Math.min(1, f * 0.65);
        orb.scale.setScalar(0.6 + 0.4 * Math.sin(time * 4 + i));
        orb.position.set(Math.cos(a) * (2.6 + lift * 1.4), 1.4 + (i % 4) * 1.1 + lift * 2.4 + Math.sin(time * 2.5 + i) * 0.25, Math.sin(a) * (2.0 + lift));
      } else if (ready) {
        orb.scale.setScalar(0.35 + 0.15 * Math.sin(time * 3 + i));
        orb.position.set(Math.cos(a) * 2.7, 1.2 + (i % 3) * 0.5, Math.sin(a) * 2.1);
      } else {
        orb.scale.setScalar(0.01);
      }
    });

    if (kind === 'rocket-pad') {
      const [rocket, flame, armL, armR] = animParts;
      if (active) {
        const lift = Math.max(0, f - 0.5);
        rocket.position.y = y0 + lift * lift * 1.9;
        flame.scale.set(1 + Math.sin(time * 28) * 0.14, 1.1 + Math.min(1.4, f * 0.8), 1 + Math.cos(time * 28) * 0.14);
        armL.rotation.z = Math.min(0.75, f * 0.8);
        armR.rotation.z = -Math.min(0.75, f * 0.8);
      }
    } else if (kind === 'tea-pavilion') {
      const [aroma] = animParts;
      aroma.rotation.y = time * (active ? 1.8 : 0.45);
      aroma.position.y = y0 + 1.25 + (active ? Math.min(1.6, f * 0.55) : Math.sin(time * 1.6) * 0.12);
    } else if (kind === 'nature-monument') {
      const [falls, rainbow] = animParts;
      falls.scale.x = 1 + Math.sin(time * 4.5) * 0.06;
      if (active) rainbow.scale.setScalar(Math.min(1.15, 0.15 + f * 0.55));
    } else if (kind === 'ship-berth') {
      const [ship, beacon] = animParts;
      ship.rotation.z = Math.sin(time * 1.1) * 0.045;
      ship.position.y = y0 + 0.4 + Math.sin(time * 1.4) * 0.07;
      beacon.rotation.y = time * 1.4;
      beacon.scale.setScalar(active ? 1.45 + Math.sin(time * 6) * 0.2 : 1.0);
    } else if (kind === 'armillary') {
      const [r1, r2, r3] = animParts;
      const spd = active ? 1.9 : 0.35;
      r1.rotation.y = time * spd;
      r2.rotation.x = Math.PI / 3 + time * spd * 0.8;
      r3.rotation.z = Math.PI / 3 - time * spd * 1.1;
    } else if (kind === 'scroll-press') {
      const [paper, seal, leftR, rightR] = animParts;
      const spread = active ? Math.min(1.22, 1 + f * 0.15) : 1;
      paper.scale.x = spread;
      leftR.position.x = -2.1 * spread;
      rightR.position.x = 2.1 * spread;
      seal.rotation.z = active ? Math.sin(f * 3) * 0.12 : 0;
    } else if (kind === 'bell-chime') {
      const [bells, wave] = animParts;
      bells.rotation.x = active ? Math.sin(time * 7) * Math.exp(-f * 0.5) * 0.18 : Math.sin(time) * 0.02;
      if (active) {
        const s = 0.6 + ((f * 1.1) % 1.8) * 1.4;
        wave.scale.setScalar(s);
      }
    } else if (kind === 'radio-dish') {
      const [dish, beam] = animParts;
      dish.rotation.x = active ? -0.25 + Math.sin(f * 0.9) * 0.1 : -0.22 + Math.sin(time * 0.5) * 0.06;
      if (active) beam.scale.set(1.2, Math.min(2.2, f * 0.9), 1.2);
    } else if (kind === 'cinema-stage') {
      const [, curL, curR] = animParts;
      if (active) {
        const open = Math.min(0.85, f * 0.45);
        curL.position.x = -1.9 - open;
        curR.position.x = 1.9 + open;
      }
    } else if (animParts[0]) {
      animParts[0].rotation.y = time * (active ? 1.6 : 0.4);
    }
  }

  return {group, height, focus, update};
}
