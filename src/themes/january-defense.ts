import * as T from 'three';
import {Kit} from './folio-landmarks';
import {Stage} from '../level/stage';
import {bakeRegion} from '../world/bake';
import {SlimeCharacter} from '../slime/character';
import {rng} from '../templates/random';
import {sample,measure,type DefenseTheme,type JanuaryDefense,type Point} from '../templates/january-defense';

// Each diorama stages a non-combat service or navigation flow; moving models reflect defence progress.
const colors: Record<DefenseTheme, [string,string,string,string,string,string]> = {
  parade: ['#90b6a1', '#f7ddbb', '#b8c497', '#efd1a9', '#a54654', '#f4ba78'],
  station: ['#7295ad', '#e4cfc1', '#92a4a0', '#ddd4b4', '#31746d', '#f4aa58'],
  eclipse: ['#182440', '#8e7a91', '#4b5b71', '#7d8188', '#eb926e', '#f6c48d'],
  harbor: ['#5389ab', '#e8dfd0', '#4f899c', '#98c7cc', '#d47c4a', '#f4c76e'],
  lunar: ['#172038', '#68738f', '#6d737f', '#9da5b0', '#e3ad5b', '#f7d188'],
  workshop: ['#6d8895', '#f1dbc0', '#b7a98d', '#e5d6b7', '#9b5544', '#ebb463'],
  ice: ['#243f69', '#b6d5eb', '#7ca7c7', '#c7e3f4', '#4ec0d8', '#ffe194'],
  airship: ['#5c8eb8', '#f8e0c2', '#89aa93', '#dce4d2', '#c85c48', '#f5c068'],
  rail: ['#567689', '#e5d4be', '#8e8e85', '#d4ccb8', '#b05b46', '#f2bd6b'],
  orbital: ['#1c2b47', '#8695b3', '#495a70', '#879cb0', '#4da6c8', '#f4c574'],
  ocean: ['#234a66', '#9cc2cf', '#5d8a87', '#b4d1cc', '#d6994d', '#f5cd78'],
};
type Group = T.Group;
function greenhouse(k: Kit, g: Group, x: number, z: number) {
  k.box(g, '#6c8d76', x, 0.68, z, 3.4, 1.36, 1.8);
  for (let i = 0; i < 5; i++) {
    const cx = x - 1.35 + i * 0.67;
    k.box(g, '#c1e4ce', cx, 0.9, z + 0.93, 0.54, 0.69, 0.05);
    k.beam(g, '#ebddaa', [cx, 1.36, z + 0.9], [cx, 2.15, z], 0.05);
    k.beam(g, '#ebddaa', [cx, 2.15, z], [cx, 1.36, z - 0.9], 0.05);
  }
  k.beam(g, '#e8c58d', [x - 1.7, 2.15, z], [x + 1.7, 2.15, z], 0.08);
}
function roses(k: Kit, g: Group, x: number, y: number, z: number, n: number) {
  const r = rng(String(x) + ':' + z + ':' + n);
  for (let i = 0; i < n; i++) {
    const dx = r.range(-0.65, 0.65), dy = r.range(0, 0.28), dz = r.range(-0.28, 0.28);
    k.ball(g, i % 4 === 0 ? '#ffe3a2' : i % 3 ? '#b44e60' : '#ec8a81', x + dx, y + dy, z + dz, 0.14, 0.11, 0.14);
  }
}
function carriage(k: Kit, g: Group) {
  k.box(g, '#89513c', 0, 0.57, 0, 1.8, 0.2, 0.8); k.box(g, '#587c56', 0, 0.8, 0, 1.65, 0.34, 0.81);
  for (const x of [-0.63, 0.63]) for (const z of [-0.49, 0.49]) {
    k.ring(g, '#593b31', x, 0.33, z, 0.3); k.ball(g, '#bb8f53', x, 0.33, z, 0.08);
    for (let n = 0; n < 3; n++) {
      const a = n * Math.PI / 3, dx = 0.26 * Math.cos(a), dy = 0.26 * Math.sin(a);
      k.beam(g, '#b78b5c', [x - dx, 0.33 - dy, z], [x + dx, 0.33 + dy, z], 0.018);
    }
  }
  roses(k, g, 0, 0.98, 0, 34); k.box(g, '#c18f65', 0.78, 1.07, 0, 0.25, 0.54, 0.68);
  k.ball(g, '#85563f', 1.75, 0.76, 0, 0.48, 0.27, 0.19); k.ball(g, '#966244', 2.1, 1.05, 0, 0.19, 0.3, 0.13);
  for (const x of [1.5, 1.96]) for (const z of [-0.13, 0.13]) k.beam(g, '#694234', [x, 0.68, z], [x + 0.05, 0.09, z], 0.055);
  k.beam(g, '#a87c52', [0.8, 0.65, 0], [1.64, 0.68, 0], 0.05);
}
function train(k: Kit, g: Group) {
  for (let i = 0; i < 2; i++) {
    const x = i * 3.05;
    k.box(g, '#e3e3d6', x, 0.83, 0, 2.86, 0.87, 0.98); k.box(g, '#344e59', x, 0.34, 0, 2.5, 0.16, 0.73);
    k.box(g, '#51898a', x, 0.65, 0.504, 2.84, 0.1, 0.04);
    for (let j = 0; j < 5; j++) k.box(g, '#355967', x - 1.08 + j * 0.51, 0.98, 0.507, 0.36, 0.28, 0.045);
    for (const dx of [-0.87, 0.87]) k.ball(g, '#3b4247', x + dx, 0.23, 0.33, 0.21, 0.21, 0.12);
  }
  k.ball(g, '#ebe6d6', 4.46, 0.72, 0, 0.83, 0.54, 0.50);
  k.ball(g, '#345563', 4.56, 0.97, 0.02, 0.5, 0.23, 0.41);
}
function telescope(k: Kit, g: Group, x: number, z: number) {
  for (let j = 0; j < 3; j++) {
    const a = j * 2 * Math.PI / 3;
    k.beam(g, '#b2a691', [x, 0.94, z], [x + 0.46 * Math.cos(a), 0.08, z + 0.46 * Math.sin(a)], 0.052);
  }
  k.beam(g, '#374352', [x - 0.3, 1.03, z + 0.22], [x + 0.42, 1.49, z - 0.26], 0.185);
  k.ball(g, '#9bcee2', x + 0.43, 1.5, z - 0.27, 0.135); k.ball(g, '#dc6d60', x - 0.46, 0.83, z + 0.19, 0.08);
}
function ferry(k: Kit, g: Group, x: number, z: number, accent: string) {
  k.box(g, '#f0eadb', x, 0.46, z, 2.6, 0.48, 0.88);
  k.box(g, accent, x, 0.24, z, 2.4, 0.2, 0.78);
  k.box(g, '#4b6c7a', x + 0.2, 0.82, z, 1.4, 0.32, 0.68);
  k.cyl(g, '#e4b75e', x - 0.55, 1.05, z, 0.14, 0.46);
  for (let j = 0; j < 4; j++) k.box(g, '#9bd4de', x - 0.3 + j * 0.34, 0.84, z + 0.35, 0.22, 0.14, 0.03);
}
function landerCraft(k: Kit, g: Group) {
  k.box(g, '#d8a64c', 0, 0.95, 0, 1.12, 0.76, 1.12);
  k.cyl(g, '#c5cbd1', 0, 1.48, 0, 0.42, 0.22);
  k.ball(g, '#f0e2c2', 0.48, 1.58, 0, 0.35, 0.14, 0.35);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    k.beam(g, '#9fa8b2', [Math.cos(a) * 0.5, 0.65, Math.sin(a) * 0.5], [Math.cos(a) * 1.05, 0.06, Math.sin(a) * 1.05], 0.05);
    k.cyl(g, '#d4b880', Math.cos(a) * 1.08, 0.05, Math.sin(a) * 1.08, 0.18, 0.06);
  }
  for (const s of [-1, 1]) k.box(g, '#395d84', s * 1.4, 1.05, 0, 1.4, 0.06, 0.62);
}
function balloonCraft(k: Kit, g: Group) {
  k.ball(g, '#d86e54', 0, 2.35, 0, 1.05, 1.24, 1.05);
  k.ring(g, '#f4d58d', 0, 2.35, 0, 1.08, Math.PI / 2);
  k.box(g, '#a6764c', 0, 0.62, 0, 0.64, 0.48, 0.64);
  for (const sx of [-0.26, 0.26]) for (const sz of [-0.26, 0.26]) {
    k.beam(g, '#d9c39b', [sx, 0.86, sz], [sx * 1.7, 1.45, sz * 1.7], 0.022);
  }
}
function orbitalCraft(k: Kit, g: Group) {
  for (const s of [-1, 1]) {
    k.ball(g, s < 0 ? '#7fa5b8' : '#c6985e', s * 1.05, 1.0, 0, 0.56, 0.52, 0.52);
    k.cyl(g, '#cfd4d8', s * 0.42, 1.0, 0, 0.22, 0.42);
    k.box(g, '#3e6f99', s * 1.05, 1.0, 1.25, 0.72, 0.05, 1.55);
    k.box(g, '#3e6f99', s * 1.05, 1.0, -1.25, 0.72, 0.05, 1.55);
  }
  k.ring(g, '#f2ca77', 0, 1.0, 0, 0.36);
}
function bathyscaphe(k: Kit, g: Group) {
  k.ball(g, '#d9d7c5', 0, 1.02, 0, 2.1, 0.44, 0.56);
  k.box(g, '#c75a45', -0.95, 1.38, 0, 0.42, 0.44, 0.24);
  k.ball(g, '#4b6878', 0.15, 0.46, 0, 0.38, 0.38, 0.38);
  k.ball(g, '#ffe39b', 0.51, 0.46, 0, 0.12, 0.12, 0.12);
}
function workshopCart(k: Kit, g: Group, accent: string) {
  k.box(g, '#8c5d41', 0, 0.52, 0, 1.9, 0.24, 0.95);
  k.box(g, accent, 0, 0.88, 0, 1.45, 0.46, 0.76);
  k.cyl(g, '#d6b479', 0.48, 1.18, 0, 0.26, 0.14);
  for (const x of [-0.66, 0.66]) for (const z of [-0.52, 0.52]) k.ring(g, '#4f4038', x, 0.28, z, 0.24);
}
function boardTexture(game: JanuaryDefense) {
  const theme = game.map.theme;
  const p = game.map.palette ?? colors[theme];
  const canvas = document.createElement('canvas'); canvas.width = 1344; canvas.height = 840;
  const g = canvas.getContext('2d')!, r = rng(theme + '-' + game.map.sectors.join('-'));
  const u = (x: number) => (x + 10) / 20 * canvas.width, v = (z: number) => (z + 6.25) / 12.5 * canvas.height;
  g.fillStyle = p[2]; g.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 8200; i++) {
    g.fillStyle = i % 2 ? '#fff4cf12' : '#151a2512';
    g.fillRect(r.next() * canvas.width, r.next() * canvas.height, r.range(1, 4), 1);
  }
  if (theme === 'station' || theme === 'rail') {
    g.strokeStyle = '#d7d6c555'; g.lineWidth = 1.5;
    for (let i = 0; i < 23; i++) {g.beginPath(); g.moveTo(u(-10 + i * 0.93), 0); g.lineTo(u(-10 + i * 0.93), canvas.height); g.stroke();}
    for (let i = 0; i < 15; i++) {g.beginPath(); g.moveTo(0, v(-6.2 + i * 0.9)); g.lineTo(canvas.width, v(-6.2 + i * 0.9)); g.stroke();}
    for (const z of [-4.23, 4.28]) {
      g.fillStyle = '#debe78'; g.fillRect(0, v(z), canvas.width, 6);
      for (let i = 0; i < 95; i++) {g.fillStyle = '#f2dc91'; g.fillRect(i * 15, v(z) + 9, 7, 4);}
    }
  } else if (theme === 'parade') {
    for (const [x, z] of [[-8.8, 1], [-1.6, 3.9], [5.6, -4.8], [-8.8, -4.7], [8.1, 3.7]]) {
      g.fillStyle = '#779568'; g.beginPath(); g.roundRect(u(x) - 38, v(z) - 20, 98, 40, 15); g.fill();
      for (let j = 0; j < 52; j++) {g.fillStyle = j % 3 ? '#da9c75' : '#b75565'; g.fillRect(u(x) + r.range(-33, 53), v(z) + r.range(-16, 16), 3, 3);}
    }
    g.beginPath(); cartRoute.forEach(([x, z], i) => i ? g.lineTo(u(x), v(z)) : g.moveTo(u(x), v(z)));
    g.lineJoin = 'round'; g.strokeStyle = '#c9b398'; g.lineWidth = 94; g.stroke();
    g.strokeStyle = '#e5cfac'; g.lineWidth = 78; g.stroke();
  } else if (theme === 'harbor' || theme === 'ocean' || theme === 'ice') {
    g.strokeStyle = theme === 'ice' ? '#eef8ff44' : '#dff5f538'; g.lineWidth = 2;
    for (let i = 0; i < 120; i++) {
      const x = r.range(0, canvas.width), y = r.range(0, canvas.height);
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 18, y - 5, x + 36, y); g.stroke();
    }
  } else if (theme === 'workshop') {
    g.strokeStyle = '#5e4c3a28'; g.lineWidth = 2;
    for (let i = 0; i < 18; i++) {const y = i * 48; g.beginPath(); g.moveTo(0, y); g.lineTo(canvas.width, y); g.stroke();}
  } else if (theme === 'orbital') {
    g.strokeStyle = '#9dd4e826'; g.lineWidth = 1.5;
    for (let i = 0; i < 24; i++) {const x = i * 58; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, canvas.height); g.stroke();}
    for (let i = 0; i < 15; i++) {const y = i * 58; g.beginPath(); g.moveTo(0, y); g.lineTo(canvas.width, y); g.stroke();}
  } else {
    for (let i = 0; i < 420; i++) {
      const x = r.range(0, canvas.width), y = r.range(0, canvas.height); g.strokeStyle = '#acabb23b'; g.lineWidth = 1 + r.range(0, 2);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 7, y - 2); g.lineTo(x + 14, y + 1); g.stroke();
    }
  }
  for (const path of game.map.routes) {
    g.beginPath(); path.forEach(([x, z], i) => i ? g.lineTo(u(x), v(z)) : g.moveTo(u(x), v(z)));
    g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = p[3]; g.lineWidth = game.map.flow === 'alternate' ? 68 : 48; g.stroke();
    g.strokeStyle = theme === 'eclipse' || theme === 'lunar' || theme === 'orbital' ? '#e5c99f' : '#f6e5bc';
    g.lineWidth = 3; g.setLineDash([10, 11]); g.stroke(); g.setLineDash([]);
  }
  for (let i = 0; i < 6; i++) {
    const [x, z] = game.map.pads[i]; g.fillStyle = '#354b4e'; g.beginPath(); g.arc(u(x), v(z), 31, 0, Math.PI * 2); g.fill();
    g.lineWidth = 3; g.strokeStyle = p[5]; g.stroke(); g.fillStyle = '#fff2bd'; g.font = 'bold 27px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), u(x), v(z));
  }
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = 4; return texture;
}

export function buildJanuaryDefense(game: JanuaryDefense) {
  const theme = game.map.theme, p = game.map.palette ?? colors[theme];
  const night = theme === 'eclipse' || theme === 'lunar' || theme === 'orbital' || theme === 'ice';
  const stage = new Stage({
    skyTop: p[0], skyHorizon: p[1], fog: [38, 94], sun: night ? '#e4ae9f' : '#fff0ce', sunIntensity: 1.75,
    hemiSky: '#d7e5ec', hemiGround: p[2], ink: '#30444a', wash: p[1],
  });
  const root = new T.Group(); root.name = 'january-defense-diorama'; stage.scene.add(root);
  const material = stage.toon('#ffffff'), kit = new Kit({toon: material, lit: material, lamp: material, glow: material, glass: material}, theme);
  const floorMat = stage.toon('#ffffff', {map: boardTexture(game)});
  const floor = new T.Mesh(new T.BoxGeometry(20, 0.54, 12.5), [material, material, floorMat, material, material, material]);
  floor.name = 'board'; floor.position.y = -0.27; floor.receiveShadow = true; root.add(floor);
  const baked = bakeRegion(stage, {x0: -10, z0: -6.25, w: 20, h: 12.5, ground: () => null, classify: () => 'solid', root: floor});
  const spawn: [number, number, number] = [-6, 0.02, 3.5];
  const actor = new SlimeCharacter(stage, {spawn, world: {boxes: [], surfaces: [], height: baked.height ?? undefined}, input: false, ui: false, trainingTargets: [], onToast: () => {}}).attach();
  const backdrop = kit.group(root), mover = kit.group(root), gateLeft = kit.group(root), gateRight = kit.group(root);
  let paintMoon: ((fraction: number) => void) | undefined;
  kit.box(backdrop, p[2], 0, -1.33, -12, 120, 1, 110);
  const r = rng(theme + '-' + game.map.finale);
  for (let i = 0; i < 18; i++) {
    const x = -46 + i * 5.2, z = -20 - r.range(0, 10), h = r.range(2, 7);
    if (theme === 'station' || theme === 'workshop' || theme === 'rail') {
      kit.box(backdrop, i % 2 ? '#728b94' : '#97aab0', x, h / 2, z, 3.6, h, 2.4);
      for (let j = 0; j < 3; j++) kit.box(backdrop, '#ddcdb0', x - 0.85 + j * 0.85, h * 0.65, z + 1.24, 0.42, 0.3, 0.055);
    } else kit.rock(backdrop, i % 2 ? p[2] : p[0], x, -0.5, z, 6.5, h, 5.4, r.next());
  }
  if (theme === 'parade') {
    greenhouse(kit, root, -6.4, -4.9); greenhouse(kit, root, -1.9, -5.2);
    for (let n = 0; n < 9; n++) {
      const x = -15 + n * 3.8, z = -10.4 + (n % 2) * 0.5, h = 1.6 + (n % 3) * 0.22;
      kit.box(backdrop, n % 2 ? '#c88f73' : '#d4b98c', x, h * 0.5 - 0.6, z, 3.28, h, 2.4);
      kit.put('box', backdrop, 'toon', '#9c6858', x, h - 0.26, z + 0.61, 3.52, 0.16, 1.45, 0.34);
      kit.put('box', backdrop, 'toon', '#ac7561', x, h - 0.26, z - 0.61, 3.52, 0.16, 1.45, -0.34);
      for (let j = 0; j < 3; j++) kit.box(backdrop, '#57756f', x - 1 + j * 0.86, h * 0.58 - 0.45, z + 1.23, 0.53, 0.49, 0.055);
    }
    for (let n = 0; n < 12; n++) {
      const x = -14 + n * 2.6, z = -7.2 - Math.sin(n) * 0.42;
      kit.cyl(backdrop, '#80634e', x, 0.11, z, 0.10, 1.65);
      kit.ball(backdrop, n % 3 ? '#7c9e72' : '#a6ab6e', x, 1.2, z, 0.88, 1.06, 0.83);
    }
    for (const x of [-8.3, -0.75, 7.7]) {
      kit.box(root, '#ad795d', x, 1.13, 3.3, 0.14, 2.26, 0.14);
      kit.beam(root, '#795944', [x, 2.2, 3.3], [x + 0.43, 2.2, 3.3], 0.065); kit.ball(root, '#f0d494', x + 0.41, 2.01, 3.3, 0.16);
    }
    for (let n = 0; n < 10; n++) {
      const angle = n * Math.PI / 9, x = 4 + 1.38 * Math.cos(angle), y = 1.46 + 1.3 * Math.sin(angle);
      kit.ball(root, '#557654', x, y, 2.54, 0.36, 0.34, 0.27); roses(kit, root, x, y + 0.04, 2.64, 5);
    }
    for (const s of [-1, 1]) kit.cyl(root, '#a87b5b', 4 + 1.38 * s, 0.73, 2.54, 0.14, 1.46);
    gateLeft.position.set(2.62, 0, 2.54); gateRight.position.set(5.38, 0, 2.54);
    for (const [g, s] of [[gateLeft, 1], [gateRight, -1]] as const) {
      kit.box(g, '#a6735a', 0.62 * s, 0.61, 0, 1.23, 0.1, 0.12);
      for (let i = 0; i < 4; i++) kit.box(g, '#dbb58a', s * (0.16 + 0.3 * i), 0.53, 0, 0.12, 0.93, 0.15);
    }
    carriage(kit, mover);
  } else if (theme === 'station' || theme === 'rail') {
    kit.box(backdrop, '#809a98', 0, 0.72, -8.2, 18.6, 2.9, 1.5);
    kit.box(backdrop, '#d1cab5', 0, 2.27, -8.15, 19.1, 0.21, 1.94);
    for (let n = 0; n < 15; n++) {
      const x = -8.4 + n * 1.22;
      kit.box(backdrop, '#536e7c', x, 1.2, -7.42, 1.05, 1.08, 0.08);
      kit.beam(backdrop, '#b1c6be', [x - 0.46, 0.68, -7.35], [x + 0.45, 1.72, -7.35], 0.035);
    }
    for (const x of [-8.1, -4.9, 4.9, 8.1]) {
      kit.box(root, '#b98960', x, 0.32, 3.61, 1.3, 0.11, 0.39); kit.box(root, '#bd946e', x, 0.56, 3.43, 1.3, 0.42, 0.09);
      for (const dx of [-0.42, 0.42]) kit.box(root, '#59676a', x + dx, 0.15, 3.61, 0.09, 0.29, 0.28);
    }
    for (const z of [-4.55, 4.8]) {
      kit.box(root, '#546e72', 0, 0.02, z, 19, 0.07, 0.09);
      for (const x of [-8, -4, 0, 4, 8]) kit.box(root, '#68848a', x, 0.06, z, 0.18, 0.09, 1);
    }
    for (const x of [-7.5, -4, 3.7, 7.2]) {
      kit.box(root, '#527076', x, 1.32, -4.8, 0.14, 2.6, 0.2); kit.box(root, '#d4cfb6', x, 2.66, -4.8, 3.1, 0.15, 1.6);
      kit.box(root, '#355860', x, 1.86, -4.48, 1.13, 0.53, 0.19);
      for (let d = 0; d < 5; d++) kit.box(root, '#edc77d', x - 0.39 + d * 0.19, 1.88, -4.36, 0.1, 0.19, 0.045);
    }
    if (theme === 'rail') {
      for (const x of [-5.2, 5.2]) {
        kit.box(root, '#9c9282', x, 2.1, -6.2, 1.2, 4.2, 0.9);
        kit.beam(root, '#697278', [x, 3.8, -6.2], [0, 2.2, -6.2], 0.06);
      }
    }
    for (const x of [-1.32, 0, 1.32]) {kit.box(root, '#5a8082', x, 0.37, 3.84, 0.36, 0.75, 0.95); kit.box(root, '#edb77b', x, 0.77, 3.62, 0.25, 0.035, 0.25);}
    train(kit, mover);
  } else if (theme === 'eclipse') {
    for (const [x, z] of [[-5, 1.55], [0.2, 1.55], [5.2, 1.55]]) telescope(kit, root, x, z);
    for (let i = 0; i < 35; i++) kit.rock(root, i % 2 ? '#617480' : '#536472', r.range(-9, 9), 0.04, r.range(-6, -5.48), r.range(0.2, 0.55), r.range(0.18, 0.63), r.range(0.25, 0.6), r.next() * 3);
    const globe = new T.SphereGeometry(1.08, 44, 28), vertices = globe.attributes.position;
    const shades = new T.Float32BufferAttribute(new Float32Array(vertices.count * 3), 3);
    globe.setAttribute('color', shades);
    const moonMaterial = new T.MeshBasicMaterial({vertexColors: true});
    const moon = new T.Mesh(globe, moonMaterial); mover.add(moon);
    const pale = new T.Color('#f0dbad'), copper = new T.Color('#bd725f'), ink = new T.Color();
    let lastStep = -1;
    paintMoon = (fraction: number) => {
      const step = Math.round(fraction * 40); if (lastStep === step) return; lastStep = step;
      const center = step / 40 * 4.8 - 2.4;
      for (let i = 0; i < vertices.count; i++) {
        const x = vertices.getX(i), y = vertices.getY(i);
        const shade = T.MathUtils.clamp((1.6 - Math.hypot(x - center, y * 0.65)) / 0.44, 0, 1);
        const mottling = 0.92 + 0.08 * Math.cos(8 * x + 2 * Math.sin(5 * y));
        ink.copy(pale).lerp(copper, shade).multiplyScalar(mottling);
        shades.setXYZ(i, ink.r, ink.g, ink.b);
      }
      shades.needsUpdate = true;
    };
    for (let n = 0; n < 56; n++) kit.ball(backdrop, '#fff0db', r.range(-38, 38), r.range(5, 19), r.range(-28, -19), r.range(0.025, 0.067));
  } else if (theme === 'harbor') {
    for (const x of [-8.2, 8.2]) {
      kit.box(root, '#8a6b52', x, 0.55, -5.2, 2.8, 1.1, 1.5);
      kit.cyl(root, '#d8cfb8', x, 1.9, -5.2, 0.42, 2.2);
      kit.ball(root, '#f7d176', x, 3.15, -5.2, 0.32);
    }
    for (let i = 0; i < 6; i++) kit.cyl(root, '#5e5045', -7.5 + i * 3, 0.34, 4.8, 0.14, 0.68);
    ferry(kit, mover, -1.6, 0, p[4]); ferry(kit, mover, 1.8, -1.1, '#3d7486');
  } else if (theme === 'lunar') {
    for (let i = 0; i < 16; i++) kit.ring(root, '#7c8492', r.range(-8.5, 8.5), 0.06, r.range(-5.8, -4.6), r.range(0.35, 0.85), Math.PI / 2);
    for (const x of [-6.5, 6.5]) {
      kit.cyl(root, '#8f98a6', x, 0.9, -5.4, 0.12, 1.8);
      kit.ball(root, '#d9d3c3', x, 1.9, -5.4, 0.72, 0.25, 0.72);
    }
    for (let n = 0; n < 48; n++) kit.ball(backdrop, '#fff2dc', r.range(-38, 38), r.range(5, 19), r.range(-28, -19), r.range(0.025, 0.06));
    landerCraft(kit, mover);
  } else if (theme === 'ice') {
    for (let i = 0; i < 7; i++) {
      const x = -7.8 + i * 2.6, h = 1.6 + (i % 3) * 0.65;
      kit.box(root, i % 2 ? '#bce6f8' : '#96d0eb', x, h / 2, -5.3, 1.5, h, 0.9);
      kit.ball(root, '#ffe498', x, h * 0.52, -4.82, 0.22);
    }
    for (const s of [-1, 1]) kit.box(root, '#a6dcf2', 4 + s * 1.45, 1.4, 3.1, 0.45, 2.8, 0.45);
    kit.box(root, '#d2f0fc', 4, 2.95, 3.1, 3.4, 0.45, 0.55);
    workshopCart(kit, mover, '#7fd6ee');
  } else if (theme === 'airship') {
    for (const x of [-7.8, 7.8]) {
      kit.cyl(root, '#9f7d5b', x, 1.4, -5.1, 0.1, 2.8);
      kit.cone(root, '#d8664e', x + 0.5, 2.55, -5.1, 0.24, 0.9);
    }
    for (let i = 0; i < 6; i++) kit.ball(backdrop, '#f6efe4', -26 + i * 10, 7 + (i % 2) * 2.2, -22, 2.8, 1.1, 1.8);
    balloonCraft(kit, mover);
  } else if (theme === 'orbital') {
    for (let i = 0; i < 5; i++) {
      const x = -7 + i * 3.5;
      kit.box(root, '#394f63', x, 1.15, -5.4, 1.9, 2.2, 0.65);
      kit.box(root, p[5], x, 1.35, -5.04, 1.45, 1.05, 0.06);
    }
    for (let n = 0; n < 44; n++) kit.ball(backdrop, '#e8f1ff', r.range(-36, 36), r.range(4, 18), r.range(-26, -18), r.range(0.025, 0.06));
    orbitalCraft(kit, mover);
  } else if (theme === 'ocean') {
    for (let i = 0; i < 8; i++) kit.rock(root, i % 2 ? '#597478' : '#718d82', -8.2 + i * 2.35, 0.55, -5.6, 1.4, 1.1 + (i % 3) * 0.45, 1.1, i * 0.7);
    for (const x of [-6, 0, 6]) {
      kit.cyl(root, '#8f694b', x, 0.6, 4.7, 0.12, 1.2);
      kit.box(root, '#b9936a', x, 1.25, 4.7, 1.2, 0.12, 0.45);
    }
    bathyscaphe(kit, mover);
  } else {
    // workshop
    for (let i = 0; i < 5; i++) {
      const x = -7.2 + i * 3.6;
      kit.box(root, '#8c694e', x, 1.0, -5.4, 2.4, 2.0, 1.1);
      kit.box(root, '#efe2c2', x, 1.25, -4.82, 1.8, 0.9, 0.06);
    }
    for (const x of [-6.8, 6.8]) {
      kit.cyl(root, '#5e4b3d', x, 1.3, 4.3, 0.11, 2.6);
      kit.ball(root, '#f4d180', x, 2.55, 4.3, 0.24);
    }
    workshopCart(kit, mover, p[4]);
  }
  const towerGroups = game.map.pads.map(([x, z]) => {
    const base = kit.group(root, x, 0, z); kit.taper(base, '#426365', 0, 0.2, 0, 0.31, 0.38); kit.cyl(base, '#ecdbb8', 0, 0.43, 0, 0.22, 0.08);
    const water = kit.group(base), wind = kit.group(base);
    kit.ball(water, '#81d6e6', 0, 0.72, 0, 0.28, 0.33, 0.28); kit.ring(water, '#e8f7ed', 0, 0.77, 0, 0.29, Math.PI * 0.5);
    kit.cyl(wind, '#b38651', 0, 0.65, 0, 0.07, 0.5);
    for (let j = 0; j < 3; j++) {const a = j * 2.094; kit.ball(wind, '#c7e69c', Math.cos(a) * 0.22, 0.95 + Math.sin(a) * 0.22, 0, 0.16, 0.13, 0.09);}
    return {base, water, wind};
  });
  kit.flush();
  const dotMat = stage.toon('#ffffff'), tokens = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), dotMat, 64);
  const bodies = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), dotMat, 32);
  const rays = new T.InstancedMesh(new T.CylinderGeometry(1, 1, 1, 6), dotMat, 6);
  for (const batch of [tokens, bodies, rays]) {batch.count = 0; batch.frustumCulled = false; root.add(batch);}
  const dummy = new T.Object3D(), color = new T.Color(), up = new T.Vector3(0, 1, 0), dir = new T.Vector3();
  function stamp(batch: T.InstancedMesh, c: string, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const index = batch.count++; dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    batch.setMatrixAt(index, dummy.matrix); batch.setColorAt(index, color.set(c));
  }
  const cart = measure(cartRoute);
  const pathP: Point = [0, 0], ahead: Point = [0, 0];
  let actionTime = -5, finalTime = 0, t = 0;
  function react(kind: InstallationAction) {
    actionTime = t; actor.setElement(kind === 'wind' ? 1 : 0, true); actor.setMood('Happy', 0.62);
  }
  const camera = stage.camera as T.PerspectiveCamera;
  let view: 'play' | 'low' | 'far' = 'play';
  function resize() {
    const portrait = innerHeight > innerWidth;
    const distance = Math.max(1, 1.52 / (innerWidth / innerHeight));
    camera.fov = 39; camera.position.set((view === 'low' ? 7 : 2.7) * distance, (view === 'low' ? 5.4 : view === 'far' ? 18 : 12.5) * distance, (view === 'far' ? 21 : 18) * distance);
    camera.lookAt(0, portrait ? 0.15 : 0.55, -0.65); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    stage.scene.fog.near = camera.position.length() + 18; stage.scene.fog.far = camera.position.length() + 92;
  }
  function screen(index: number) {const [x, z] = game.map.pads[index]; dir.set(x, 0.32, z).project(camera); return {x: (dir.x + 1) * innerWidth / 2, y: (1 - dir.y) * innerHeight / 2};}
  function update(dt: number) {
    t += dt; if (game.phase === 'won') finalTime += dt;
    const anim = 1 - Math.min(1, (t - actionTime) / 0.63);
    actor.spread = Math.max(0, anim) * 0.94; actor.forward[0] = 0.45; actor.forward[2] = -0.89; actor.update(t, dt);
    const within = game.phase === 'wave' ? (game.released - game.packets.length * 0.5) / game.size : game.phase === 'interval' ? 1 : 0;
    const fraction = game.phase === 'finale' || game.phase === 'won' ? 1 : Math.min(1, Math.max(0, (game.wave + within) / 6));
    if (theme === 'parade') {
      const u = cart.total * (game.phase === 'won' ? 0.87 + 0.13 * Math.min(1, finalTime / 2) : 0.87 * fraction);
      sample(cart, u, pathP); sample(cart, u + 0.08, ahead);
      mover.position.set(pathP[0], 0, pathP[1]); if (u < cart.total - 0.08) mover.rotation.y = -Math.atan2(ahead[1] - pathP[1], ahead[0] - pathP[0]);
      gateLeft.rotation.y = Math.min(1, finalTime * 1.4) * 1.46; gateRight.rotation.y = -gateLeft.rotation.y;
    } else if (theme === 'station' || theme === 'rail') {
      mover.position.set(-3 + Math.sin(fraction * Math.PI * 3) * 4 + Math.min(13, finalTime * 4), 0, -5.53);
    } else if (theme === 'eclipse') {
      mover.position.set(-7 + fraction * 14, 3.0 + Math.sin(fraction * Math.PI) * 0.95, -6.9); paintMoon?.(fraction);
    } else if (theme === 'lunar' || theme === 'airship') {
      const height = theme === 'lunar' ? 3.2 - fraction * 2.95 - Math.min(0.25, finalTime * 0.3) : 1.1 + Math.sin(fraction * Math.PI) * 1.6 + Math.min(2.4, finalTime * 1.1);
      mover.position.set(-6 + fraction * 12, Math.max(0, height), -5.8);
      mover.rotation.z = Math.sin(t * 1.5) * 0.06;
    } else if (theme === 'orbital') {
      mover.position.set(-4.5 + fraction * 9, 2.2 + Math.sin(t * 1.6) * 0.18, -6.2);
      mover.rotation.y = Math.sin(t * 0.7) * 0.2 + Math.min(Math.PI, finalTime * 0.8);
    } else {
      mover.position.set(-6.5 + fraction * 13 + Math.min(2.5, finalTime * 1.5), 0.1 + Math.sin(t * 2.2) * 0.06, -5.45);
    }
    tokens.count = bodies.count = rays.count = 0;
    for (const packet of game.packets) {
      const {x, z} = packet, bob = 0.07 * Math.sin(t * 4 + packet.id);
      if (theme === 'station' || game.map.flow === 'alternate') {
        stamp(bodies, packet.connected ? '#86bd91' : packet.id % 2 ? p[4] : '#497e95', x, 0.26 + bob, z, 0.25, 0.48, 0.22);
        stamp(tokens, '#edd0aa', x, 0.62 + bob, z, 0.14, 0.14, 0.14); stamp(bodies, '#d6ad62', x + 0.23, 0.15, z, 0.16, 0.23, 0.18);
      } else if (theme === 'parade' || theme === 'workshop' || theme === 'ice') {
        stamp(tokens, p[4], x, 0.58 + bob, z, 0.23, 0.23, 0.23);
        stamp(tokens, p[5], x + 0.15, 0.72 + bob, z, 0.16, 0.14, 0.13);
      } else {
        stamp(tokens, '#ced3de', x, 0.72 + bob, z, 0.52, 0.23, 0.27); stamp(tokens, p[5], x - 0.27, 0.82 + bob, z, 0.22, 0.18, 0.17);
      }
    }
    for (let i = 0; i < towerGroups.length; i++) {
      const g = towerGroups[i], tower = game.towers[i]; g.base.visible = !!tower; if (!tower) continue;
      g.water.visible = tower.kind === 'water'; g.wind.visible = !g.water.visible; g.wind.rotation.z = Math.sin(t * 4) * 0.1;
      if (tower.flash <= 0) continue;
      const [x, z] = game.map.pads[i], [ax, az] = tower.aim; dir.set(ax - x, -0.25, az - z);
      const len = dir.length(), j = rays.count++; dummy.position.set((x + ax) / 2, 0.68, (z + az) / 2);
      dummy.scale.set(0.032, len, 0.032); dummy.quaternion.setFromUnitVectors(up, dir.normalize()); dummy.updateMatrix();
      rays.setMatrixAt(j, dummy.matrix); rays.setColorAt(j, color.set(tower.kind === 'water' ? '#80e7ef' : '#d4ed87'));
    }
    for (const batch of [tokens, bodies, rays]) {batch.instanceMatrix.needsUpdate = true; if (batch.instanceColor) batch.instanceColor.needsUpdate = true;}
  }
  addEventListener('resize', resize); resize();
  return {
    stage, actor, update, screen, react, setView(v: typeof view) {view = v; resize();},
    dispose() {removeEventListener('resize', resize); actor.dispose();},
    collision: {triangles: baked.triangles, meshCount: baked.meshes},
  };
}
type InstallationAction = 'water' | 'wind' | 'remove' | 'assist';
const cartRoute: Point[] = [[-7, 1], [-3, 1], [-3, -0.48], [1, -0.48], [1, 2], [4, 2], [4, 4.6]];
