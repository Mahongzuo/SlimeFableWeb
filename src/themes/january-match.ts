import * as T from 'three';
import type {Stage} from '../level/stage';
import type {JanuaryBoardTheme} from '../templates/january-match';
import {rng} from '../templates/random';
import {Kit} from './folio-landmarks';

export interface JanuaryMatchScene {
  destination: (n: number) => T.Vector3;
  update: (time: number, progress: number, finale: number) => void;
  passed: () => boolean;
  contacts?: (ink: boolean, roller: boolean) => void;
}

// Procedural tabletop dioramas for January 4th-gate match levels.
export function buildJanuaryMatch(stage: Stage, theme: JanuaryBoardTheme, day = '0114'): JanuaryMatchScene {
  const clay = stage.toon('white'), light = new T.MeshBasicMaterial({color: 0xffffff});
  const kit = new Kit({toon: clay, glow: light, lamp: light, lit: clay, glass: clay}, theme + '-' + day);
  const root = kit.group(stage.scene, 0, 0, -1.35);
  root.name = 'januaryMatchLandmark';
  const model =
    theme === 'titan' ? descent(kit, root, stage) :
    theme === 'press' ? printRoom(kit, root) :
    theme === 'stage' ? stageTable(kit, root, day) :
    theme === 'aurora' ? auroraTable(kit, root, stage, day) :
    theme === 'coast' ? coastTable(kit, root, day) :
    theme === 'music' ? musicTable(kit, root, day) :
    theme === 'craft' ? craftTable(kit, root, day) :
    atelierPrint(kit, root, day);
  kit.flush();
  return {...model, passed: () => true};
}

function descent(k: Kit, root: T.Group, stage: Stage) {
  const random = rng('huygens-site'), surface = k.group(root);
  for (let j = 0; j < 7; j++) {
    const x = (j - 3) * 1.04;
    k.rock(surface, j % 2 ? '#995739' : '#b8794c', x, 0.14, -2.25 - random.next() * 0.32, 0.97, 0.44 + random.next() * 0.72, 0.65);
  }
  for (let j = 0; j < 37; j++) {
    const a = random.next() * Math.PI * 2, r = 0.62 + random.next() * 2.25, sz = 0.052 + 0.13 * random.next();
    k.rock(surface, j % 2 ? '#bf855c' : '#e5b780', Math.cos(a) * r, 0.05, Math.sin(a) * r * 0.44, sz * 1.4, sz * 0.62, sz, random.next() * 5);
  }
  const probe = k.group(root, 0, 1.85, 0);
  k.taper(probe, '#7c594d', 0, 0, 0, 0.48, 0.18, true);
  k.cyl(probe, '#ce9858', 0, 0.12, 0, 0.43, 0.16);
  k.cyl(probe, '#c1c5bb', 0, 0.235, 0, 0.35, 0.07);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const x = Math.cos(a) * 0.32, z = Math.sin(a) * 0.32;
    k.box(probe, '#775549', x, 0.22, z, 0.12, 0.095, 0.1, a);
    k.beam(probe, '#e2cfb4', [x, 0.21, z], [x * 1.31, 0.30, z * 1.31], 0.019);
  }
  k.cyl(probe, '#6a736e', 0, 0.37, 0.10, 0.035, 0.23);
  const chute = k.group(probe);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    const cloth = new T.Mesh(new T.SphereGeometry(0.91, 3, 6, a, Math.PI / 6, 0, 1.36),
      stage.toon(i % 2 ? '#f3d6a8' : '#ad5f49', {side: T.DoubleSide}));
    cloth.position.y = 1.13; cloth.scale.y = 0.55; chute.add(cloth);
    k.beam(chute, '#cdbb9a', [-0.29 * Math.cos(a), 0.18, 0.29 * Math.sin(a)],
      [-0.89 * Math.cos(a), 1.23, 0.89 * Math.sin(a)], 0.009);
  }
  return {
    destination: () => probe.getWorldPosition(new T.Vector3()),
    update(time: number, progress: number, finale: number) {
      const landed = progress >= 1;
      const goal = 0.14 + 1.55 * (1 - progress);
      probe.position.y += (goal - probe.position.y) * 0.065;
      probe.rotation.z = landed ? 0 : Math.sin(time * 1.2) * 0.055;
      chute.scale.y = landed ? Math.max(0.07, 1 - finale * 1.5) : 1;
      chute.rotation.z = landed ? Math.min(0.48, finale * 0.42) : Math.sin(time * 1.1) * 0.045;
      chute.position.x = landed ? -Math.min(1, finale) * 1.36 : 0;
    },
  };
}

function printRoom(k: Kit, root: T.Group) {
  const brass = '#bd9156', wood = '#935b43', iron = '#40534d', paper = '#ead9ae', red = '#9e4137';
  root.position.x = -0.32;
  k.box(root, wood, 0, 0.52, 0, 4.45, 0.96, 1.82);
  k.box(root, '#553f35', 0, 1.03, 0, 4.55, 0.12, 1.94);
  for (const x of [-1.05, 1.05]) {
    k.box(root, '#614232', x, 0.60, 0.929, 1.88, 0.57, 0.025);
    k.box(root, '#a76b4e', x, 0.60, 0.953, 1.77, 0.48, 0.021);
    for (const side of [-1, 1]) k.beam(root, brass, [x + side * 0.16, 0.56, 0.97], [x + side * 0.16, 0.52, 1.035], 0.019);
    k.beam(root, brass, [x - 0.16, 0.52, 1.035], [x + 0.16, 0.52, 1.035], 0.021);
  }
  for (const x of [-1.9, 1.9]) {
    k.box(root, wood, x, 1.81, -0.56, 0.26, 1.45, 0.35);
    k.box(root, brass, x, 1.38, -0.56, 0.335, 0.1, 0.405);
  }
  k.box(root, iron, 0, 2.56, -0.56, 4.10, 0.24, 0.42);
  k.box(root, brass, 0, 2.71, -0.56, 3.78, 0.07, 0.33);
  const axle = k.group(root, 0, 1.66, -0.03, 0, 0, Math.PI / 2);
  k.cyl(axle, iron, 0, 0, 0, 0.21, 2.67);
  for (const end of [-1, 1]) k.cyl(axle, brass, 0, end * 1.40, 0, 0.235, 0.125);
  const wheel = k.group(root, -1.68, 1.67, 0.09, 0, Math.PI / 2);
  k.ring(wheel, iron, 0, 0, 0, 0.44);
  for (let j = 0; j < 5; j++) {const a = j * Math.PI * 0.4; k.beam(wheel, brass, [0, 0, 0], [Math.cos(a) * 0.43, Math.sin(a) * 0.43, 0], 0.022);}
  k.beam(wheel, wood, [0, 0.43, 0.01], [0, 0.43, 0.26], 0.046);
  const carrier = k.group(root, 0, 1.19, 0.21);
  k.box(carrier, brass, 0, -0.015, 0, 2.95, 0.085, 1.30);
  k.box(carrier, paper, 0, 0.045, 0, 2.74, 0.03, 1.16);
  const inkings: T.Group[] = [];
  for (let j = 0; j < 3; j++) {
    const strokes = k.group(carrier, (j - 1) * 0.72, 0.07, 0);
    inkings.push(strokes);
    for (let i = 0; i < 10; i++) {
      const a = (i - 4.5) * 0.26, b = a + 0.26;
      k.beam(strokes, red, [Math.sin(a) * 0.29, 0, Math.cos(a) * 0.34], [Math.sin(b) * 0.29, 0, Math.cos(b) * 0.34], 0.035);
    }
  }
  for (let i = 0; i < 3; i++) {
    k.cyl(root, iron, -1.70, 1.13, 0.52 - i * 0.39, 0.13, 0.14);
    k.cyl(root, i === 1 ? red : '#392f38', -1.70, 1.205, 0.52 - i * 0.39, 0.1, 0.016);
  }
  const tag = document.createElement('canvas'); tag.width = 384; tag.height = 110;
  const pen = tag.getContext('2d')!; pen.fillStyle = '#29443e'; pen.fillRect(0, 0, 384, 110);
  pen.strokeStyle = '#d5b579'; pen.lineWidth = 4; pen.strokeRect(6, 6, 372, 98);
  pen.fillStyle = '#f3db9d'; pen.textAlign = 'center'; pen.font = 'bold 45px Georgia,serif';
  pen.fillText('№ 22406', 192, 69);
  const texture = new T.CanvasTexture(tag); texture.colorSpace = T.SRGBColorSpace;
  const plate = new T.Mesh(new T.PlaneGeometry(1.24, 0.355), new T.MeshBasicMaterial({map: texture}));
  plate.position.set(-0.48, 2.55, -0.332); root.add(plate);
  const reservoir = k.group(root, -1.70, 1.22, 0.13);
  k.cyl(reservoir, '#913b33', 0, 0, 0, 0.088, 0.19);
  let roll = 0;
  let inkReady = false, rollerReady = false;
  return {
    contacts(ink: boolean, roller: boolean) {inkReady = ink; rollerReady = roller;},
    destination: (n: number) => new T.Vector3((n - 1) * 0.72, 1.42, -1.03),
    update(time: number, progress: number, finale: number) {
      roll += (progress - roll) * 0.055;
      wheel.rotation.z = roll * 8 + (rollerReady ? 0.85 : 0) + 0.02 * Math.sin(time);
      carrier.position.z = 0.18 + 0.42 * roll + (rollerReady ? 0.12 : 0);
      reservoir.scale.y = inkReady ? 1 : 0.12;
      carrier.rotation.x = -Math.min(1, finale * 0.85) * 0.90;
      inkings.forEach((s, i) => s.visible = progress * 3 >= i + 1 - 0.001);
    },
  };
}

function stageTable(k: Kit, root: T.Group, day: string) {
  root.position.x = -0.25;
  k.box(root, '#7c5540', 0, 0.38, 0, 4.4, 0.76, 1.9);
  k.box(root, '#cda468', 0, 0.8, 0, 4.5, 0.08, 1.98);
  for (let i = 0; i < 4; i++) {
    const x = -1.75 + i * 1.16;
    k.cyl(root, '#dfd0b4', x, 1.85, -0.68, 0.13, 2.1);
  }
  k.box(root, '#9f7653', 0, 2.95, -0.68, 4.2, 0.24, 0.48);
  const steps = k.group(root, 0, 0.86, 0.1);
  for (let i = 0; i < 3; i++) k.box(steps, i % 2 ? '#b88560' : '#9c684b', 0, i * 0.22, -i * 0.28, 3.1 - i * 0.4, 0.2, 0.32);
  const crest = k.group(root, 0, 1.85, -0.15);
  k.box(crest, day === '0116' ? '#b8424d' : '#3e6d6c', 0, 0, 0, 1.65, 0.96, 0.12);
  k.ring(crest, '#f0cc7a', 0, 0, 0.08, 0.36);
  const lamps = [-1.2, 0, 1.2].map(x => {
    const g = k.group(root, x, 0.92, 0.78);
    k.ball(g, '#ffe08f', 0, 0, 0, 0.14);
    return g;
  });
  return {
    destination: (n: number) => new T.Vector3((n - 1) * 1.1, 1.5, -1.2),
    update(time: number, progress: number, finale: number) {
      crest.position.y = 1.65 + progress * 0.48 + Math.sin(time * 1.8) * 0.04;
      crest.rotation.y = Math.sin(time * 0.9) * 0.12 + Math.min(Math.PI * 2, finale * 1.2);
      lamps.forEach((l, i) => l.scale.setScalar(progress * 3 >= i + 0.5 ? 1.25 : 0.65));
    },
  };
}

function auroraTable(k: Kit, root: T.Group, stage: Stage, day: string) {
  k.box(root, '#394b5e', 0, 0.32, 0, 4.5, 0.64, 1.85);
  for (let i = 0; i < 7; i++) k.rock(root, i % 2 ? '#596d82' : '#435568', -1.8 + i * 0.6, 0.72, -0.58, 0.58, 0.35 + (i % 3) * 0.22, 0.45);
  const wings = k.group(root, 0, 1.65, -0.15);
  const leftW = k.group(wings, -0.35, 0, 0), rightW = k.group(wings, 0.35, 0, 0);
  const col = day === '0117' ? '#e5925c' : day === '0120' ? '#e4be6c' : '#6be3b5';
  for (let i = 0; i < 5; i++) {
    k.box(leftW, i % 2 ? col : '#9ee5d2', -0.25 - i * 0.26, i * 0.14, 0, 0.22, 0.75 + i * 0.12, 0.08);
    k.box(rightW, i % 2 ? col : '#9ee5d2', 0.25 + i * 0.26, i * 0.14, 0, 0.22, 0.75 + i * 0.12, 0.08);
  }
  const core = new T.Mesh(new T.OctahedronGeometry(0.28, 0), stage.toon('#fff1b8'));
  core.position.set(0, 1.65, -0.15); root.add(core);
  return {
    destination: () => core.getWorldPosition(new T.Vector3()),
    update(time: number, progress: number, finale: number) {
      const spread = 0.25 + progress * 0.65 + Math.min(0.35, finale * 0.25);
      leftW.rotation.z = spread * 0.38 + Math.sin(time * 2) * 0.05;
      rightW.rotation.z = -spread * 0.38 - Math.sin(time * 2) * 0.05;
      core.rotation.y = time * 1.4;
      core.scale.setScalar(0.85 + progress * 0.45);
    },
  };
}

function coastTable(k: Kit, root: T.Group, day: string) {
  k.box(root, '#4a7f91', 0, 0.36, 0, 4.6, 0.72, 1.95);
  k.box(root, '#c7b088', 0, 0.75, 0, 4.7, 0.08, 2.02);
  const leftLand = k.group(root, -1.4, 0.92, 0);
  const rightLand = k.group(root, 1.4, 0.92, 0);
  k.box(leftLand, '#8ea97d', 0, 0, 0, 1.35, 0.28, 1.3);
  k.box(rightLand, '#a49b76', 0, 0, 0, 1.35, 0.28, 1.3);
  const span = k.group(root, 0, 1.25, 0);
  k.box(span, day === '0122' ? '#637682' : '#c99b5e', 0, 0, 0, 2.5, 0.14, 0.48);
  for (let i = -2; i <= 2; i++) k.beam(span, '#e5cf9d', [i * 0.5, 0.07, -0.22], [i * 0.5, 0.46, 0], 0.025);
  return {
    destination: (n: number) => new T.Vector3((n - 1) * 0.9, 1.25, -1.25),
    update(time: number, progress: number, finale: number) {
      const join = Math.min(1, progress + finale * 0.2);
      leftLand.position.x = -1.45 + join * 0.45;
      rightLand.position.x = 1.45 - join * 0.45;
      span.position.y = 1.45 - join * 0.34 + Math.sin(time * 2) * 0.02;
    },
  };
}

function musicTable(k: Kit, root: T.Group, day: string) {
  k.box(root, '#7c5442', 0, 0.4, 0, 4.3, 0.8, 1.85);
  const body = k.group(root, 0, 1.5, -0.15);
  if (day === '0111') {
    k.box(body, '#ecece5', 0, 0.2, 0, 1.1, 1.65, 0.24);
    k.ring(body, '#74a8b8', 0, -0.12, 0.14, 0.34);
    k.ball(body, '#f2c86e', 0, -0.12, 0.14, 0.14);
  } else {
    k.ball(body, '#c88c52', -0.45, 0, 0, 0.72, 0.82, 0.26);
    k.ball(body, '#3f3028', -0.45, 0.04, 0.24, 0.24, 0.24, 0.05);
    k.box(body, '#6b4735', 0.85, 0.12, 0, 1.75, 0.24, 0.14);
    for (let i = 0; i < 4; i++) k.beam(body, '#f4df9e', [-0.75, -0.08 + i * 0.06, 0.27], [1.65, 0.06 + i * 0.05, 0.11], 0.012);
  }
  return {
    destination: () => body.getWorldPosition(new T.Vector3()),
    update(time: number, progress: number, finale: number) {
      body.rotation.y = Math.sin(time * 1.4) * 0.18 + Math.min(Math.PI * 2, finale * 1.5);
      body.position.y = 1.45 + progress * 0.28 + Math.sin(time * 3) * 0.03;
    },
  };
}

function craftTable(k: Kit, root: T.Group, day: string) {
  k.box(root, '#787e84', 0, 0.38, 0, 4.3, 0.76, 1.85);
  const piece = k.group(root, 0, 1.38, -0.1);
  if (day === '0115') {
    k.taper(piece, '#9ad7e5', 0, 0, 0, 0.62, 1.25, true);
    k.ring(piece, '#eef7f7', 0, 0.62, 0, 0.62, Math.PI / 2);
  } else {
    for (let i = 0; i < 3; i++) {
      k.box(piece, i % 2 ? '#c5a57a' : '#8ea2a8', (i - 1) * 0.85, i * 0.24, 0, 0.78, 0.9 + i * 0.28, 0.68);
      k.box(piece, '#f6de9b', (i - 1) * 0.85, i * 0.24 + 0.1, 0.36, 0.56, 0.22, 0.03);
    }
  }
  return {
    destination: () => piece.getWorldPosition(new T.Vector3()),
    update(time: number, progress: number, finale: number) {
      piece.rotation.y = progress * 0.7 + Math.sin(time) * 0.12 + finale * 0.8;
      piece.scale.y = 0.75 + progress * 0.32;
    },
  };
}

function atelierPrint(k: Kit, root: T.Group, day: string) {
  root.position.x = -0.25;
  k.box(root, '#8f6349', 0, 0.45, 0, 4.35, 0.9, 1.82);
  k.box(root, '#dfd2b2', 0, 0.95, 0, 3.6, 0.08, 1.48);
  const frame = k.group(root, 0, 1.65, -0.35);
  k.box(frame, '#58483c', 0, 0, 0, 2.75, 1.35, 0.12);
  k.box(frame, '#f0e2c2', 0, 0, 0.07, 2.45, 1.1, 0.04);
  const ribbon = k.group(frame, 0, 0, 0.11);
  const tint = day === '0119' ? '#4f9bb0' : day === '0104' ? '#5e8c66' : '#b24f42';
  for (let i = 0; i < 3; i++) k.box(ribbon, i === 1 ? '#d8a64d' : tint, (i - 1) * 0.65, 0, 0, 0.36, 0.76, 0.04);
  let inkReady = false, rollerReady = false;
  return {
    contacts(ink: boolean, roller: boolean) {inkReady = ink; rollerReady = roller;},
    destination: (n: number) => new T.Vector3((n - 1) * 0.68, 1.5, -1.2),
    update(time: number, progress: number, finale: number) {
      frame.rotation.x = -0.15 + Math.min(0.45, finale * 0.4) + (rollerReady ? 0.08 : 0);
      ribbon.scale.y = 0.25 + progress * 0.75 + (inkReady ? 0.12 : 0);
      ribbon.rotation.z = Math.sin(time * 1.3) * 0.04;
    },
  };
}
