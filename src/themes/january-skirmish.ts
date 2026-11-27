import * as T from 'three';
import type {Stage,StageLook} from '../level/stage';
import {Kit} from './folio-landmarks';
import {bakeRegion} from '../world/bake';
import type {WorldDefinition} from '../slime/world';
import type {Course,FloorTile} from '../templates/january-skirmish';
import {bayWater, launchBoat} from './jan01-skirmish';
import {floorAt} from '../templates/january-skirmish';

export function skirmishLook(c: Course): StageLook {
  return {
    skyTop: c.sky[0], skyHorizon: c.sky[1],
    fog: [29, 95], sun: '#fff0c9', sunIntensity: 2.4, hemiSky: '#e7f5ff', hemiGround: '#9a846f', ink: '#394551', wash: '#ede6d7',
  };
}
function floorTexture(c: Course, t: FloorTile) {
  const canvas = document.createElement('canvas'); canvas.width = 192; canvas.height = 220;
  const g = canvas.getContext('2d')!;
  const sport = c.style === 'sport' || c.style === 'court';
  const air = c.style === 'air' || c.style === 'maritime';
  g.fillStyle = sport ? (Math.abs(t.z) > t.depth ? '#4b826b' : c.floor) : c.floor;
  g.fillRect(0, 0, 192, 220);
  if (sport) {
    g.fillStyle = '#e3e8cd'; g.fillRect(0, 110, 192, 3);
    const row = Math.round(1.5 - t.z / t.depth);
    if (c.day === '0114' && t.x === 0 && row % 2 === 0) {g.font = 'bold 28px sans-serif'; g.textAlign = 'center'; g.fillText(row === 0 ? '20' : '10', 96, 102);}
    if (t.x !== 0) for (let j = 0; j < 5; j++) g.fillRect(t.x < 0 ? 12 : 161, j * 44, 18, 2);
  } else {
    for (let j = 0; j < 10; j++) {
      g.fillStyle = air ? '#00000024' : '#00000028'; g.fillRect(0, j * 22, 192, 2);
      g.fillStyle = air ? '#ffffff1e' : '#d2d6cd'; g.fillRect(8, j * 22 + 10, 2, 2); g.fillRect(182, j * 22 + 10, 2, 2);
    }
    if (!air) {g.fillStyle = c.accent; g.fillRect(6, 0, 3, 220); g.fillRect(183, 0, 3, 220);}
  }
  return canvas;
}
function makeDeck(stage: Stage, c: Course) {
  const deck = new T.Group(); deck.name = 'course-walkable'; stage.scene.add(deck);
  const top: number[] = [], uv: number[] = [], sides: number[] = [], indices: number[] = [], sideIndices: number[] = [];
  const atlas = document.createElement('canvas'); atlas.width = 192 * 4; atlas.height = 220 * Math.ceil(c.tiles.length / 4);
  const ctx = atlas.getContext('2d')!;
  const wet = c.style === 'air' || c.style === 'maritime';
  const floatTile = c.day==='0101' ? c.tiles.find(t=>t.x<0 && t.z<0 && t.z>-t.depth) : undefined;
  for (const [index, t] of c.tiles.entries()) {
    if(t===floatTile)continue;
    const left = t.x - t.width / 2, right = t.x + t.width / 2, near = t.z + t.depth / 2, far = t.z - t.depth / 2;
    const col = index % 4, row = Math.floor(index / 4), a = col / 4, b = (col + 1) / 4, d = 1 - row * 220 / atlas.height, e = 1 - (row + 1) * 220 / atlas.height;
    ctx.drawImage(floorTexture(c, t), col * 192, row * 220);
    const n = top.length / 3;
    top.push(left, t.near, near, right, t.near, near, left, t.far, far, right, t.far, far);
    uv.push(a, e, b, e, a, d, b, d); indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    const skirt = (p0: number[], p1: number[], probeX: number, probeZ: number) => {
      const below = floorAt(c, probeX, probeZ); if (below !== null && below >= (p0[1] + p1[1]) * 0.5 - 0.01) return;
      const low = below ?? (wet ? -0.55 : -0.30), i = sides.length / 3;
      sides.push(...p0, ...p1, p0[0], low, p0[2], p1[0], low, p1[2]); sideIndices.push(i, i + 2, i + 1, i + 1, i + 2, i + 3);
    };
    skirt([left, t.near, near], [left, t.far, far], left - 0.02, t.z);
    skirt([right, t.far, far], [right, t.near, near], right + 0.02, t.z);
    skirt([right, t.near, near], [left, t.near, near], t.x, near + 0.02);
    skirt([left, t.far, far], [right, t.far, far], t.x, far - 0.02);
  }
  const geo = new T.BufferGeometry(), sideGeo = new T.BufferGeometry(), map = new T.CanvasTexture(atlas); map.colorSpace = T.SRGBColorSpace;
  geo.setAttribute('position', new T.Float32BufferAttribute(top, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(indices); geo.computeVertexNormals();
  stage.add(new T.Mesh(geo, stage.toon('#ffffff', {map})), deck);
  sideGeo.setAttribute('position', new T.Float32BufferAttribute(sides, 3)); sideGeo.setIndex(sideIndices); sideGeo.computeVertexNormals();
  stage.add(new T.Mesh(sideGeo, stage.toon(wet ? '#785a4c' : '#576f79', {side: T.DoubleSide})));
  const baked = bakeRegion(stage, {root: deck, x0: -7, z0: -11, w: 14, h: 22, ground: () => null, classify: () => 'solid'});
  const world: WorldDefinition = {boxes: [], surfaces: [], height: baked.height ?? undefined, bounds: {min: [-9, -4, -12], max: [9, 12, 12]}};
  if (wet) world.fluids = [{min: [-9, -12], max: [9, 12], level: -0.56, sink: 0.14}];
  let float:T.Mesh|null=null;
  if(floatTile){
    const t=floatTile, material=stage.toon('#ffffff',{map:new T.CanvasTexture(floorTexture(c,t))});material.map.colorSpace=T.SRGBColorSpace;
    const wood=stage.toon('#75563f');
    float = new T.Mesh(new T.BoxGeometry(t.width-.045,.28,t.depth-.055),[wood,wood,material,wood,wood,wood]);
    float.name='tampa-floating-landing';float.position.set(t.x,-.14,t.z);stage.add(float);
    world.boxes.push({name:"floating-landing",min:[t.x-t.width/2,-.28,t.z-t.depth/2],max:[t.x+t.width/2,0,t.z+t.depth/2]});
  }
  return {world, float};
}
function bannerBoard(k: Kit, root: T.Group, stage: Stage, c: Course, y: number, z: number) {
  const board = k.group(root, 0, y, z);
  k.box(board, '#334b56', 0, 0, 0, 6.3, 2.25, 0.4);
  k.box(board, '#ab8f60', 0, -1.15, 0, 6.5, 0.15, 0.5);
  for (const x of [-2.1, 2.1]) k.cyl(root, '#53645a', x, y * 0.5, z, 0.18, y);
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 144; const g = canvas.getContext('2d')!;
  const tex = new T.CanvasTexture(canvas); tex.colorSpace = T.SRGBColorSpace;
  const panel = new T.Mesh(new T.PlaneGeometry(5.8, 1.72), stage.toon('#ffffff', {map: tex})); panel.position.set(0, 0, 0.225); board.add(panel);
  let shown = '';
  return (finish: number) => {
    const label = finish > 0 ? c.banner[1] : c.banner[0];
    if (label === shown) return;
    shown = label;
    g.fillStyle = '#233b42'; g.fillRect(0, 0, 512, 144); g.textAlign = 'center'; g.fillStyle = '#f3d688';
    g.font = 'bold ' + (finish && label.length < 12 ? '68' : '30') + 'px sans-serif';
    g.fillText(label, 256, 88); tex.needsUpdate = true;
  };
}
function buildAirfield(k: Kit, root: T.Group, stage: Stage, c: Course) {
  const fly = c.day==='0101' ? launchBoat(k,root,stage) : null;
  const hull = k.group(root, 6, -0.16, -6), prop = k.group(hull, 0, 0.99, -1.75);
  if(!fly){
  k.ball(hull, '#996444', 0, 0.5, 0, 0.52, 0.48, 1.9); k.ball(hull, '#535550', 0, 0.89, -1.18, 0.38, 0.38, 0.55);
  for (const y of [0.82, 1.87]) k.ball(hull, '#f3d196', 0, y, 0.02, 2.95, 0.08, 0.71);
  for (const x of [-2.16, -1.1, 1.1, 2.16]) {
    k.beam(hull, '#5a493e', [x, 0.83, -0.3], [x, 1.85, 0.29], 0.045); k.beam(hull, '#5a493e', [x, 0.83, 0.29], [x, 1.85, -0.30], 0.04);
  }
  k.ball(hull, '#eabf79', 0, 1.04, 1.53, 1.06, 0.065, 0.42); k.ball(hull, '#ae5b41', 0, 1.29, 1.60, 0.08, 0.55, 0.45);
  for (const x of [-1.12, 1.12]) {k.ball(hull, '#916449', x, 0.13, 0.22, 0.20, 0.15, 1); k.beam(hull, '#66513d', [x, 0.22, 0.21], [x, 0.8, 0.21], 0.05);}
  k.ball(prop, '#c45739', 0, 0, 0, 0.12, 0.8, 0.055); k.cyl(prop, '#f4d08f', 0, 0, 0, 0.11, 0.23);
  }
  if(fly){
    for(const z of [3.6,6.9])for(const x of [-1.28,1.28]){
      k.cyl(root,'#725643',x,1.48,z,.085,2.97);
      k.beam(root,'#906d50',[x,2.35,z],[0,3.6,z],.087);
    }
    for(const x of [-.72,.72])k.put('box',root,'toon','#805f4f',x,3.22,5.25,1.68,.11,3.74,0,0,x<0?.46:-.46);
    for(const z of [3.85,5.05,6.4])k.beam(root,'#d1ae7d',[-1.29,2.85,z],[1.29,2.85,z],.072);
    for(const z of [-3.4,-.4,2.4]){
      k.ball(root,'#d69c59',-4.4,-.33,z,.31,.17,.35);k.ball(root,'#f6d9aa',-4.4,-.22,z,.24,.07,.26);
      k.beam(root,'#94775a',[-4.35,-.14,z],[-4.06,.12,z+.28],.027);
    }
    for(const x of [-3.72,-3.05,3.85])for(let i=0;i<4;i++)k.ring(root,'#bca07b',x,.045+i*.047,5.6,.24+.012*i,Math.PI/2);
  }
  for (const x of [1.52, 4.08]) for (const z of [-3.55, -0.6, 2.35]) k.cyl(root, '#805f49', x, 1.72, z, 0.075, 4.3);
  for (const x of [1.52, 4.08]) k.beam(root, '#614a3b', [x, 3.84, -3.8], [x, 3.84, 2.6], 0.10);
  for (const x of [2.04, 3.56]) k.put('box', root, 'toon', '#a85f46', x, 4.12, -0.6, 1.62, 0.13, 6.55, 0, 0, x < 2.8 ? 0.32 : -0.32);
  for (const z of [-6, -3, 0, 3, 6]) for (const x of [-4.22, 4.22]) {
    k.cyl(root, '#856447', x, -0.12, z, 0.15, 1.37); k.cyl(root, '#bcb295', x, 0.34, z, 0.17, 0.18);
    if (z < 6 && fly){
      for(let j=0;j<4;j++){
        const a=j/4,b=(j+1)/4;
        k.beam(root,'#b9a47f',[x,.45-.46*a*(1-a),z+3*a],[x,.45-.46*b*(1-b),z+3*b],.029);
      }
    }else if(z<6)k.beam(root, '#c9b48e', [x, 0.45, z], [x, 0.45, z + 3], 0.027);
  }
  for (let i = 0; i < 5; i++) {
    const x = -3.85 + (i % 2) * 0.51, z = 4.15 + Math.floor(i / 2) * 0.58;
    k.box(root, '#af8256', x, 0.24, z, 0.46, 0.47, 0.5); k.box(root, '#6e604d', x, 0.26, z + 0.26, 0.36, 0.045, 0.026);
  }
  for (let j = 0; j < 5; j++) {
    const x = -17 + j * 8, z = -26 - (j % 2) * 3;
    k.rock(root, '#bac09c', x, -0.78, z, 5.5, 1.8, 4.1, j * 0.61);
    k.rock(root, '#83a27d', x + 0.68, 0.20, z - 0.6, 4.2, 1.05, 2.9, j * 0.61);
  }
  for (const x of [-14, -6, 11, 16]) for (let j = 0; j < 3; j++) {
    const z = -25 - j * 1.7, xx = x + j * 0.78; k.beam(root, '#976c4b', [xx, 0.44, z], [xx + 0.34, 3.9, z], 0.13);
    for (let a = 0; a < 6; a++) k.put('ball', root, 'toon', '#57846c', xx + 0.34 + Math.sin(a) * 0.85, 3.86, z + Math.cos(a) * 0.85, 0.28, 0.13, 1.18, -0.25, a, 0);
  }
  for (let i = 0; i < 7; i++) {
    const x = -22 + i * 2.46, z = -22 - (i % 2) * 1.4;
    k.box(root, '#d9be98', x, 1.25, z, 1.83, 2.46, 2.05); k.cone(root, '#b66d50', x, 2.72, z, 1.55, 1.05);
    k.box(root, '#608080', x, 1.49, z + 1.04, 0.58, 0.79, 0.055);
  }
  k.taper(root, '#e8d7ad', -14, 2.48, -25, 0.74, 4.2); k.cyl(root, '#b6674b', -14, 4.7, -25, 0.52, 0.47); k.cone(root, '#557c7e', -14, 5.12, -25, 0.78, 0.55);
  const water = new T.Mesh(new T.PlaneGeometry(150, 150), fly ? bayWater(stage) : stage.toon(c.day === '0111' ? '#2c4f6b' : '#66aca9')); water.rotation.x = -Math.PI / 2; water.position.y = -0.56; stage.scene.add(water);
  for (let i = 0; i < 28; i++) {const x = (i % 2 ? 1 : -1) * (5.5 + i % 8 * 1.65), z = i % 13 * 2 - 14; k.ball(root, '#c1ded3', x, -0.548, z, 0.45 + 0.1 * (i % 3), 0.02, 0.06);}
  const updateBanner = c.day === '0101' ? null : bannerBoard(k, root, stage, c, 4.8, -14.5);
  return (time: number, finish: number) => {
    if(fly){fly(time,finish);return;}
    prop.rotation.z = time * (finish ? 25 : 7); hull.rotation.y = -0.45;
    hull.position.set(7.2 + finish * 2.1, -0.16 + Math.max(0, finish - 0.6) * 1.2, -6 - finish * 3);
    hull.rotation.x = -Math.min(0.20, finish * 0.13);
    updateBanner?.(finish);
  };
}
function buildStadium(k: Kit, root: T.Group, stage: Stage, c: Course) {
  const grounds = new T.Mesh(new T.PlaneGeometry(160, 160), stage.toon(c.style === 'court' ? '#6d8a9c' : '#86a383'));
  grounds.rotation.x = -Math.PI / 2; grounds.position.y = -0.34; stage.scene.add(grounds);
  for (let j = 0; j < 13; j++) {
    const x = -16 + 2.7 * j, z = -21 - (j % 3) * 0.7;
    k.box(root, '#7d9789', x, 0.55, z, 2.54, 1.78, 1.1); k.ball(root, '#91ab88', x, 2.45, z - 2.7, 1.9, 2.25, 1.6);
  }
  for (const side of [-1, 1]) {
    for (let j = 0; j < 4; j++) for (let bay = 0; bay < 11; bay++) {
      const x = side * (7.2 + j * 0.75), z = -10 + bay * 1.91; k.box(root, '#bfaf94', x, 0.30 + j * 0.45, z, 0.72, 0.50, 1.89);
      for (let seat = 0; seat < 4; seat++) k.ball(root, ['#db9761', '#88aebe', '#365776', '#cb7863'][(bay + j + seat) % 4], x, 0.77 + j * 0.45, z - 0.63 + seat * 0.42, 0.14, 0.22, 0.14);
    }
    for (const z of [-9, 8]) {k.beam(root, '#637887', [side * 9.5, 0, z], [side * 9.5, 6, z], 0.09); k.box(root, '#e4e3c0', side * 9.5, 5.9, z, 1.25, 0.56, 0.22);}
  }
  for (const x of [-1.65, 1.65]) k.beam(root, '#f0bf54', [x, 2.5, -9.9], [x, 5.65, -9.9], 0.09);
  k.beam(root, '#f0bf54', [-1.65, 2.5, -9.9], [1.65, 2.5, -9.9], 0.09); k.cyl(root, '#e9a845', 0, 1.25, -9.9, 0.12, 2.5);
  const updateBanner = bannerBoard(k, root, stage, c, 5.1, -14);
  return (_time: number, finish: number) => updateBanner(finish);
}
function buildFacade(k: Kit, root: T.Group, stage: Stage, course: Course) {
  const plaza = new T.Mesh(new T.PlaneGeometry(155, 155), stage.toon('#b6afa0')); plaza.rotation.x = -Math.PI / 2; plaza.position.y = -0.35; stage.scene.add(plaza);
  for (let i = 0; i < 18; i++) {
    const x = -24 + (i % 9) * 5.8, z = -20 - 9 * Math.floor(i / 9), height = 2.65 + i % 3;
    k.box(root, '#cfc2ab', x, height * 0.5 - 0.34, z, 5.45, height, 3.1); k.box(root, '#706f74', x, height - 0.04, z, 5.6, 0.65, 3.2);
    for (let col = 0; col < 4; col++) k.box(root, '#758693', x - 1.9 + col * 1.25, height * 0.6, z + 1.59, 0.55, 0.95, 0.09);
  }
  const palette = ['#4d9cc0', '#d8973b', '#7aaf77', '#c75147'];
  for (const side of [-1, 1]) for (let j = 0; j < 4; j++) {
    const x = side * (5 + j * 0.15), z = -8 + j * 4;
    k.cyl(root, '#b9bdad', x, 2.35, z, 0.13, 5.4);
    k.beam(root, '#e5dec9', [x, 0.15, z], [x, 4.8, z + 3.85], 0.075); k.beam(root, '#d1d0bb', [x, 4.8, z], [x, 0.15, z + 3.85], 0.075);
    k.beam(root, '#859396', [x, 4.7, z], [x, 4.7, z + 3.87], 0.12);
  }
  const signals: T.MeshBasicMaterial[] = [];
  for (let i = 0; i < 4; i++) {
    const p = k.group(root, -4.2 + i * 2.75, 0, -9); const h = 4.1 + i * 0.63;
    k.beam(p, palette[i], [0, -0.3, 0], [0, h, 0], 0.24); k.beam(p, palette[i], [0, h, 0], [1.1, h, 0], 0.23);
    k.ball(p, palette[i], 0, h, 0, 0.25); k.box(p, '#ece5cc', 0.7, h, 0, 0.16, 0.61, 0.6);
    k.beam(p, palette[i], [1.1, h, 0], [1.1, h, -1.4], 0.21);
    const signal = new T.MeshBasicMaterial({color: '#68675e'}); signals.push(signal);
    const bulb = new T.Mesh(new T.SphereGeometry(0.30, 12, 8), signal); bulb.position.set(0, h, 0.16); p.add(bulb);
  }
  for (let i = 0; i < 7; i++) {
    const x = -7.6 + i * 2.25;
    k.box(root, '#8699a1', x, 2.65, -12, 2.18, 5.7, 1.9); k.box(root, '#465d70', x, 3, -10.98, 1.85, 2.45, 0.11);
    k.beam(root, '#d3d5c6', [x - 0.9, 1.78, -10.86], [x + 0.9, 4.2, -10.86], 0.068);
  }
  for (let i = 0; i < 13; i++) {
    const z = 3.45 - i * 0.52, h = floorAt(course, 2.8, z) ?? 0;
    if (i % 2 === 0) k.ring(root, '#c5d4d0', 2.8, h + 0.74, z, 1.25);
    for (const x of [1.63, 3.97]) {
      k.beam(root, '#cb6650', [x, h, z], [x, h + 0.7, z], 0.035);
      if (i < 12) k.beam(root, '#d76547', [x, h + 0.7, z], [x, (floorAt(course, 2.8, z - 0.52) ?? 0) + 0.7, z - 0.52], 0.052);
    }
  }
  return (_time: number, finish: number) => {signals.forEach((material, i) => material.color.set(finish > 0.15 + i * 0.28 ? palette[i] : '#68675e'));};
}
function buildSpace(k: Kit, root: T.Group, stage: Stage, c: Course) {
  const base = new T.Mesh(new T.PlaneGeometry(160, 160), stage.toon(c.day === '0104' || c.day === '0106' || c.day === '0115' ? '#9c6c50' : '#253147'));
  base.rotation.x = -Math.PI / 2; base.position.y = -0.35; stage.scene.add(base);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    k.rock(root, '#58677d', Math.cos(a) * 15, 0.2, -10 + Math.sin(a) * 10, 2.4, 1.2 + (i % 3) * 0.5, 2.2, i * 0.4);
  }
  const rig = k.group(root, 0, 5.2, -10.5);
  k.ring(rig, c.accent, 0, 0, 0, 2.1);
  for (const s of [-1, 1]) k.box(rig, '#3d6f96', s * 3.1, 0, 0, 2.5, 0.14, 1.1);
  k.ball(rig, '#f3d997', 0, 0, 0, 0.65);
  const updateBanner = bannerBoard(k, root, stage, c, 4.9, -15.2);
  return (time: number, finish: number) => {
    rig.rotation.z = Math.sin(time * 0.8) * 0.14 + finish * 0.9;
    rig.position.y = 5.2 + Math.sin(time * 1.3) * 0.18 + Math.min(1.1, finish * 0.5);
    updateBanner(finish);
  };
}
function buildWorkshop(k: Kit, root: T.Group, stage: Stage, c: Course) {
  const floor = new T.Mesh(new T.PlaneGeometry(160, 160), stage.toon('#9e9280'));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.35; stage.scene.add(floor);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const z = -9 + i * 4.2;
      k.box(root, '#826b56', side * 6.5, 2.0, z, 1.3, 4.1, 2.6);
      k.box(root, '#e5d4b2', side * 5.8, 2.3, z, 0.08, 1.5, 1.6);
    }
  }
  const wheel = k.group(root, 0, 4.9, -10.4);
  k.ring(wheel, c.accent, 0, 0, 0, 1.45);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    k.beam(wheel, '#d9c293', [0, 0, 0], [Math.cos(a) * 1.42, Math.sin(a) * 1.42, 0], 0.07);
  }
  const updateBanner = bannerBoard(k, root, stage, c, 5.1, -14.8);
  return (time: number, finish: number) => {
    wheel.rotation.z = time * 0.45 + finish * 2.4;
    updateBanner(finish);
  };
}

export function buildSkirmishScene(stage: Stage, c: Course) {
  const {world,float} = makeDeck(stage, c), root = new T.Group(); stage.scene.add(root);
  const toon = stage.toon('#ffffff'), lamp = stage.toon('#ffffff', {emissive: '#f6d19a', emissiveIntensity: 0.2});
  const kit = new Kit({toon, glow: lamp, lit: toon, lamp, glass: toon}, c.day);
  const animate =
    c.style === 'air' || c.style === 'maritime' ? buildAirfield(kit, root, stage, c) :
    c.style === 'sport' || c.style === 'court' ? buildStadium(kit, root, stage, c) :
    c.style === 'facade' ? buildFacade(kit, root, stage, c) :
    c.style === 'space' ? buildSpace(kit, root, stage, c) :
    buildWorkshop(kit, root, stage, c);
  const targets = c.anchors.map((_, i) => {
    const p = kit.group(root), col = i === 0 ? '#e4be66' : c.accent;
    if (c.day==='0101' && i===3) {
      kit.cyl(p,'#76543d',0,.59,0,.07,1.18);
      kit.beam(p,'#9d7647',[0,1.18,0],[.52,1.18,0],.052);
      kit.taper(p,'#be8f45',.44,.93,0,.24,.35);
      kit.ring(p,'#edc875',.44,.765,0,.25,Math.PI/2);
      kit.ball(p,'#6b5342',.44,.71,0,.075);
    } else if (c.style === 'air' || c.style === 'maritime') {
      kit.cyl(p, '#576d70', 0, 0.55, 0, 0.075, 1.08); kit.ball(p, col, 0, 0.83, 0, 0.45, 0.2, 0.24); kit.cone(p, '#f1dcad', 0.35, 0.85, 0, 0.18, 0.36);
    } else if (c.style === 'sport' || c.style === 'court') {
      kit.ball(p, '#648e97', 0, 0.46, 0, 0.38, 0.49, 0.30); kit.ball(p, col, 0, 0.98, 0, 0.37, 0.32, 0.33); kit.box(p, '#ecce96', 0, 0.91, 0.30, 0.42, 0.13, 0.08); kit.ball(p, '#975937', 0.3, 0.49, 0.18, 0.18, 0.11, 0.11);
    } else {
      kit.cyl(p, col, 0, 0.43, 0, 0.24, 0.75); kit.ring(p, '#eacc79', 0, 0.81, 0, 0.38); kit.beam(p, '#544b47', [-0.30, 0.81, 0], [0.30, 0.81, 0], 0.035);
    }
    return p;
  });
  const terminal = kit.group(root, ...c.end); kit.ring(terminal, '#f4be4c', 0, 0.07, 0, 0.69, Math.PI / 2); kit.cyl(terminal, '#b98952', 0, 0.28, -0.76, 0.16, 0.56);
  kit.ball(terminal, '#f5ce70', 0, 0.66, -0.76, 0.24);
  const latch = kit.group(root, ...c.pad); kit.ring(latch, '#54bcab', 0, 0.09, 0, 0.43, Math.PI / 2);
  kit.flush();
  return {world, float, targets, latch, animate};
}
