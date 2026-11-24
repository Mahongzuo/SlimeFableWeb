import * as T from 'three';
import {bakeRegion} from '../world/bake';
import type {Stage,StageLook} from '../level/stage';
import type {WorldDefinition} from '../slime/world';
import {arenaLayout,type Arena,type ArenaEncounter,type RpgDayConfig} from '../templates/january-rpg';
import {alongStroke,fitSpan} from '../templates/january-layout';

export function arenaLook(arena: Arena, config?: RpgDayConfig): StageLook {
  const skyTop = config?.sky[0] ?? (arena === 'stage' ? '#30213b' : arena === 'ice' ? '#607ca9' : '#416f96');
  const skyHorizon = config?.sky[1] ?? (arena === 'stage' ? '#a87856' : arena === 'ice' ? '#edcfc2' : '#ffdcba');
  return {
    skyTop, skyHorizon,
    sun: '#fff0d2', sunIntensity: 2.4, hemiSky: '#fff2da', hemiGround: '#81839c', ink: '#293951', wash: '#f0dfca', fog: [38, 100],
  };
}

function paintedSurface(arena: Arena, config?: RpgDayConfig) {
  const visual = config?.visual ?? arena;
  const c = document.createElement('canvas'); c.width = 768; c.height = 1152;
  const g = c.getContext('2d')!;
  g.fillStyle = config?.floor ?? (arena === 'ice' ? '#c9ebee' : arena === 'field' ? '#40794e' : '#ac7453');
  g.fillRect(0, 0, c.width, c.height);
  if (visual === 'stage') {
    for (let i = 0; i < 28; i++) {
      g.fillStyle = i % 3 === 0 ? '#986548' : '#ba8660'; g.fillRect(i * 28, 0, 27, 1152);
      for (let j = 0; j < 8; j++) {g.fillStyle = '#785339'; g.fillRect(i * 28, (j * 170 + i * 63) % 1152, 27, 1);}
    }
  } else if (visual === 'ice') {
    for (const [y, col] of [[365, '#36649d'], [576, '#be655a'], [788, '#36649d']] as const) {g.fillStyle = col; g.fillRect(0, y, 768, 7);}
    g.strokeStyle = '#ae5551'; g.lineWidth = 4;
    for (const [x, y, r] of [[384, 576, 87], [190, 225, 61], [578, 225, 61], [190, 925, 61], [578, 925, 61]]) {
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
    }
    for (let i = 0; i < 150; i++) {const x = (i * 307) % 768, y = (i * 91) % 1152; g.strokeStyle = '#b5d9e0'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 5, y + 11, x + 16, y + 20); g.stroke();}
  } else if (visual === 'field' || visual === 'court') {
    for (let i = 0; i < 11; i++) {
      const y = 75 + i * 100;
      g.fillStyle = i % 2 ? '#ffffff12' : '#00000010'; g.fillRect(0, y, 768, 99);
      g.fillStyle = '#f0edd2'; g.fillRect(0, y, 768, 3);
      if (visual === 'field') {
        g.font = 'bold 26px Georgia'; g.fillText(String(10 * Math.min(i, 10 - i)), 35, y + 34);
        for (const x of [285, 483]) for (let j = 1; j < 5; j++) g.fillRect(x, y + 20 * j, 15, 2);
      }
    }
    g.fillStyle = visual === 'field' ? '#ceb88c' : '#ffffff26'; g.fillRect(0, 0, 768, 63); g.fillRect(0, 1080, 768, 72);
  } else if (visual === 'cosmos') {
    g.strokeStyle = '#9dd8e838'; g.lineWidth = 2;
    for (let r = 80; r <= 480; r += 80) {g.beginPath(); g.arc(384, 480, r, 0, Math.PI * 2); g.stroke();}
    for (let i = 0; i < 16; i++) {g.beginPath(); g.moveTo(i * 50, 0); g.lineTo(i * 50, 1152); g.stroke();}
  } else if (visual === 'atelier') {
    g.strokeStyle = '#3b332c28'; g.lineWidth = 2;
    for (let y = 64; y < 1152; y += 96) {g.beginPath(); g.moveTo(32, y); g.lineTo(736, y); g.stroke();}
    for (let x = 96; x < 768; x += 192) {g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1152); g.stroke();}
  } else {
    // expedition
    g.strokeStyle = '#ffffff2b'; g.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      g.beginPath(); g.moveTo(0, i * 96); g.quadraticCurveTo(384, i * 96 + (i % 2 ? 32 : -32), 768, i * 96); g.stroke();
    }
  }
  const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace; return map;
}

export function buildArena(stage: Stage, arena: Arena, config?: RpgDayConfig) {
  const visual = config?.visual ?? arena;
  const root = new T.Group(); root.name = 'january-arena'; stage.scene.add(root);
  const block = new T.BoxGeometry(1, 1, 1), ball = new T.SphereGeometry(1, 14, 10), rod = new T.CylinderGeometry(1, 1, 1, 10);
  function mesh(geo: T.BufferGeometry, color: string, x: number, y: number, z: number, w: number, h: number, d: number, parent: T.Object3D = root) {
    const m = new T.Mesh(geo, stage.toon(color)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
  }
  const prop = (color: string, x: number, y: number, z: number, w: number, h: number, d: number, parent: T.Object3D = root) => mesh(block, color, x, y, z, w, h, d, parent);
  const ground = new T.Mesh(new T.BoxGeometry(13, 0.34, 24), stage.toon('#ffffff', {map: paintedSurface(arena, config)}));
  ground.position.y = -0.17; ground.receiveShadow = true; ground.name = 'walk-base'; root.add(ground);
  const instanceData: {x: number; y: number; z: number; w: number; h: number; d: number; c: string}[] = [];
  function box(c: string, x: number, y: number, z: number, w: number, h: number, d: number) {instanceData.push({c, x, y, z, w, h, d});}
  const curtains: T.Group[] = [], weights: T.Mesh[] = [];

  // Stage-mode arenas always provide the elevated catwalk steps + deck + ramp for the right branch.
  if (arena === 'stage') {
    for (let i = 0; i < 6; i++) {
      const h = (i + 1) * 1.16 / 6;
      prop('#a88157', 3.45, h / 2, 4.9 - i * 0.43, 1.85, h, 0.43).name = 'walk-step';
    }
    const edge = 4.9 - 5.5 * 0.43, far = -1.55;
    prop('#965f43', 3.45, 1.04, (edge + far) / 2, 1.85, 0.24, edge - far).name = 'walk-deck';
    const join = fitSpan([3.45, far], [3.45, far - 3.4], (_x, z) => z === far ? 1.16 : 0);
    const ramp = prop('#9d7455', 3.45, join.base - 0.08, far - 1.7, 1.85, 0.16, join.length);
    ramp.rotation.x = join.pitch; ramp.name = 'walk-ramp';
  }

  if (visual === 'stage') {
    for (const sign of [-1, 1]) {
      box('#503c35', sign * 6.52, 2.2, 0, 0.32, 4.4, 23.8);
      for (let i = 0; i < 5; i++) box('#9e7344', sign * 6.22, 3.1, 8 - i * 4, 0.26, 6.2, 0.38);
      for (let i = 0; i < 7; i++) box('#dfb56a', sign * 5.9, 4.0, -9.8 + i * 0.15, 0.3, 0.28, 0.12);
      const c = new T.Group(); c.position.set(sign * 2.35, 0, -10.3); root.add(c); curtains.push(c);
      for (let i = 0; i < 7; i++) mesh(rod, i % 2 ? '#9e3548' : '#b94450', (i - 3) * 0.64, 2.15, 0, 0.54, 4.3, 0.32, c);
      box('#cc9d50', sign * 4.98, 2.5, -10.25, 0.6, 5, 0.7);
      const weight = prop('#50545a', sign * 2.55, 2.8, -6.5, 0.47, 0.8, 0.45); weights.push(weight);
      box('#49414a', sign * 2.55, 3.2, -6.6, 0.045, 3.9, 0.045);
    }
    box('#c99854', 0, 4.95, -10.25, 10.5, 0.55, 0.72);
    for (let i = 0; i < 4; i++) box('#524345', 0, 5.1, -7 + i * 3.7, 12.6, 0.23, 0.22);
  } else if (visual === 'ice' || visual === 'field' || visual === 'court') {
    const blue = visual === 'ice';
    for (const side of [-1, 1]) {
      for (let row = 0; row < 3; row++) {
        box(blue ? '#91a3b1' : '#a37c64', side * (8.4 + row * 1.1), 0.45 + row * 0.63, 0, 1.05, 0.68, 25);
        const path = {points: [[side * (8.4 + row * 1.1), -11], [side * (8.4 + row * 1.1), 11]] as [number, number][], width: 1};
        for (let j = 0; j < 23; j++) {
          if ((j + row) % 7 === 0) continue;
          const [x, z] = alongStroke(path, j * 0.98); const y = 1.06 + row * 0.63;
          box(['#395870', '#b97950', '#e7ca9c', '#627278'][(j * 13 + row * 3) % 4], x, y, z, 0.42, 0.47, 0.46);
          box('#a87d66', x, y + 0.32, z, 0.25, 0.18, 0.23);
          if (blue) box('#536579', x, y + 0.44, z, 0.28, 0.085, 0.26);
        }
      }
      if (blue) {box('#ece3cb', side * 6.57, 0.45, 0, 0.13, 0.9, 24); box('#ac4f43', side * 6.57, 0.92, 0, 0.17, 0.075, 24);}
      for (const z of [-9, 7]) {
        box('#56616b', side * 8, 3.15, z, 0.17, 6.3, 0.17);
        box('#474f59', side * 8, 6.55, z, 1.7, 0.65, 0.45);
        for (let j = 0; j < 4; j++) box('#ffdd89', side * 8 - 0.58 + j * 0.38, 6.57, z + 0.27, 0.26, 0.4, 0.1);
      }
    }
    for (const x of [-2.1, 2.1]) box('#45565b', x, 2, -11.1, 0.19, 4, 0.22);
    for (let j = 0; j < 20; j++) {
      const x = -27 + j * 2.7, h = 2.4 + ((j * 17) % 9) * 0.55, z = -22 - (j % 3) * 2;
      box(blue ? '#8199ab' : '#867b72', x, h / 2 - 0.4, z, 2.55, h, 3.4);
      box(blue ? '#c6d7d6' : '#a48d75', x, h - 0.33, z, 2.65, 0.18, 3.55);
      for (let k = 0; k < 3; k++) box('#e6c993', x - 0.62 + k * 0.59, h * 0.7, z + 1.76, 0.27, 0.38, 0.07);
    }
    for (const x of [-4.1, 4.1]) {box('#646865', x, 0.64, -12.8, 3.4, 1.28, 0.9); box('#d9c9a7', x, 1.32, -12.8, 3.56, 0.12, 1);}
    if (blue) {
      for (const x of [-2.1, 2.1]) box('#be4d4b', x, 0.71, -8.5, 0.12, 1.42, 0.12);
      box('#be4d4b', 0, 1.48, -8.5, 4.32, 0.12, 0.12);
      for (let j = 0; j < 16; j++) box('#e4e0ce', -2 + j * 0.27, 0.69, -9.03, 0.035, 1.38, 0.035);
    } else {
      box('#d5ad43', 0, 1.42, -9.9, 0.22, 2.84, 0.22); box('#e5bf56', 0, 2.94, -9.9, 4.9, 0.16, 0.16);
      for (const x of [-2.37, 2.37]) box('#ecc752', x, 4.32, -9.9, 0.14, 2.62, 0.14);
    }
  } else if (visual === 'cosmos') {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const z = -9 + i * 3.6;
        box('#3b4c6b', side * 7.2, 1.4 + (i % 2) * 0.8, z, 0.5, 2.8 + (i % 2) * 1.4, 0.5);
        box(config?.coat ?? '#70c4d8', side * 7.2, 3.0 + (i % 2) * 0.8, z, 0.68, 0.35, 0.68);
      }
    }
    for (let i = 0; i < 14; i++) {
      const a = i * Math.PI / 13;
      box('#85c4d6', Math.cos(a) * 6.5, 1.8 + Math.sin(a) * 4.2, -11.5, 0.7, 0.45, 0.45);
    }
    for (const x of [-2.1, 2.1]) box('#4f647d', x, 2.2, -11.1, 0.22, 4.4, 0.22);
  } else if (visual === 'atelier') {
    for (const side of [-1, 1]) {
      box('#7d614b', side * 6.8, 1.9, 0, 0.42, 3.8, 23.6);
      for (let i = 0; i < 5; i++) {
        const z = -8 + i * 4;
        box('#efe1c0', side * 6.52, 2.2, z, 0.12, 2.1, 2.4);
        box('#b88952', side * 6.46, 3.3, z, 0.18, 0.14, 2.55);
      }
    }
    for (const x of [-2.4, 2.4]) box('#8c6848', x, 2.3, -11.2, 0.36, 4.6, 0.36);
    box('#c99d56', 0, 5.88, -11.2, 6.4, 0.34, 0.44);
  } else {
    // expedition
    for (const side of [-1, 1]) {
      for (let i = 0; i < 8; i++) {
        const z = -10 + i * 3, h = 1.6 + ((i * 7) % 4) * 0.85;
        box(i % 2 ? '#6d7f88' : '#8d8578', side * 7.8, h / 2, z, 2.2, h, 2.6);
      }
    }
    for (const x of [-2.4, 2.4]) box('#7c5b44', x, 2.3, -11.2, 0.32, 4.6, 0.32);
    box('#c79b54', 0, 5.88, -11.2, 6.2, 0.34, 0.42);
  }

  const scenery = new T.InstancedMesh(block, stage.toon('#fff'), instanceData.length), dummy = new T.Object3D(), color = new T.Color();
  instanceData.forEach((o, i) => {dummy.position.set(o.x, o.y, o.z); dummy.scale.set(o.w, o.h, o.d); dummy.updateMatrix(); scenery.setMatrixAt(i, dummy.matrix); scenery.setColorAt(i, color.set(o.c));});
  scenery.castShadow = true; scenery.receiveShadow = true; root.add(scenery);
  const rival = new T.Group(); root.add(rival);
  const coat = config?.coat ?? (arena === 'stage' ? '#ce9d4e' : arena === 'ice' ? '#bf574d' : '#705d8b');
  mesh(ball, coat, 0, 0.85, 0, 0.62, 0.76, 0.45, rival);
  mesh(ball, arena === 'stage' ? '#e9c59b' : '#edf0cf', 0, 1.66, 0, 0.42, 0.39, 0.4, rival);
  for (const side of [-1, 1]) {
    prop('#332f3e', side * 0.15, 1.69, 0.37, 0.09, 0.085, 0.05, rival);
    mesh(ball, coat, side * 0.57, 0.87, 0.09, 0.28, 0.24, 0.26, rival);
    prop('#48495b', side * 0.27, 0.18, 0.1, 0.33, 0.36, 0.44, rival);
  }
  const hoop = new T.TorusGeometry(0.64, 0.07, 8, 30);
  const sign = document.createElement('canvas'); sign.width = 640; sign.height = 192;
  const ink = sign.getContext('2d')!, display = new T.CanvasTexture(sign); display.colorSpace = T.SRGBColorSpace;
  const signMesh = new T.Mesh(new T.PlaneGeometry(5.3, 1.6), stage.toon('#ffffff', {map: display}));
  signMesh.position.set(0, visual === 'stage' ? 6.1 : 4.85, -11); root.add(signMesh);
  const lamp = mesh(ball, '#f9ae52', 0, 2, -8.5, 0.18, 0.18, 0.18); lamp.visible = false;
  let previousCaption = '';
  function caption(label: string, score: string) {
    if (previousCaption === label + score) return;
    previousCaption = label + score; ink.fillStyle = '#27383e'; ink.fillRect(0, 0, 640, 192);
    ink.strokeStyle = '#c49d67'; ink.lineWidth = 9; ink.strokeRect(5, 5, 630, 182);
    ink.textAlign = 'center'; ink.fillStyle = '#f8dfac'; ink.font = '28px serif'; ink.fillText(label, 320, 56);
    ink.font = 'bold ' + (score.length > 9 ? '48' : '70') + 'px Georgia'; ink.fillText(score, 320, 145); display.needsUpdate = true;
  }
  const arms = [-1, 1].map(side => {
    const pivot = new T.Group(); pivot.position.set(side * 0.42, 1.13, 0); rival.add(pivot);
    const end = arena === 'stage' ? 1.05 : 0.72;
    const lever = prop(arena === 'ice' ? '#8e6752' : coat, side * end / 2, 0, 0.19, end, 0.14, 0.16, pivot);
    lever.rotation.z = side * 0.2; return pivot;
  });
  const marker = (c: string) => {const m = new T.Mesh(hoop, stage.toon(c, {emissive: c, emissiveIntensity: 0.18})); root.add(m); return m;};
  const marks = [marker('#56dfbf'), marker('#ffd06c')], target = marker('#91ffd5');
  const layout = arenaLayout(arena);
  const puck = mesh(ball, arena === 'ice' ? '#353749' : '#b3764e', 0, 0.19, -4, 0.21, 0.13, 0.2);
  const collision = bakeRegion(stage, {root, x0: -7, z0: -12.5, w: 14, h: 25, ground: () => null, classify: m => m.name.startsWith('walk-') ? 'filled' : null});
  const world: WorldDefinition = {boxes: [], surfaces: [], height: collision.height ?? undefined, bounds: {min: [-6.2, -2, -11.5], max: [6.2, 10, 11.5]}};
  let shotAge = 1; const shotFrom = new T.Vector3();
  return {
    world, meshCount: instanceData.length, shot(x: number, z: number) {shotAge = 0; shotFrom.set(x, 0.28, z);},
    update(battle: ArenaEncounter, t: number, dt: number, finale: number) {
      const lane = battle.blocked, duel = battle.phase === 'duel', phase = battle.cue;
      const lean = phase === 'strike' ? 1 : phase === 'open' ? 0.85 : 0.28;
      rival.position.set(lane * (arena === 'stage' ? 0.74 : 2.25) * lean, 0.08 + Math.sin(t * 3) * 0.045, battle.z - 1.65);
      rival.rotation.z = lane * (phase === 'strike' ? -0.35 : Math.sin(t * 2) * 0.04);
      arms.forEach((a, i) => {a.rotation.z = (i ? 1 : -1) * (arena === 'stage' ? lean * 1.55 : lean * 0.7);});
      lamp.visible = visual === 'ice' && (shotAge < 1 || finale > 0);
      if (config) {
        caption(finale ? config.board[1] : config.board[0], finale ? config.board[2] : `${Math.min(battle.round, battle.rules.rounds)} / ${battle.rules.rounds}`);
      } else {
        if (arena === 'field') caption(finale ? '第二节得分 · 华盛顿' : '推进线', finale ? '35' : String(battle.round * 10) + ' YD');
        if (arena === 'ice') caption(finale ? '冬季经典赛 · 决胜射门' : '露天冰场', finale ? '2 — 1' : String(battle.round) + ' / 3');
        if (arena === 'stage') caption('科斯坦齐剧院', finale ? '大幕开启' : 'ATTO  III');
      }
      for (const [i, m] of marks.entries()) {m.visible = battle.phase === 'route'; const p = layout.branches[i]; m.position.set(p[0], p[1] + 0.82, p[2]);}
      const p = battle.phase === 'warmup' ? layout.warm : battle.phase === 'finale' ? layout.end : battle.safeSpot;
      target.visible = duel || battle.phase === 'warmup' || battle.phase === 'finale'; target.position.set(p[0], p[1] + 0.83 + 0.09 * Math.sin(t * 3), p[2]); target.rotation.y = 0.2 * Math.sin(t);
      weights.forEach((w, i) => w.position.y = 2.65 + (i ? 1 : -1) * lane * lean * 0.92);
      curtains.forEach((c, i) => c.position.x = (i ? 1 : -1) * (2.35 + Math.min(1, finale / 1.5) * 3.85));
      if (shotAge < 1) {shotAge = Math.min(1, shotAge + dt * 1.75); puck.visible = true; puck.position.set(shotFrom.x * (1 - shotAge), 0.25 + Math.sin(shotAge * Math.PI) * 1.2, shotFrom.z + (-8.8 - shotFrom.z) * shotAge);}
      else {puck.visible = duel && arena !== 'stage'; puck.position.set(p[0], 0.15, p[2]);}
    },
  };
}
