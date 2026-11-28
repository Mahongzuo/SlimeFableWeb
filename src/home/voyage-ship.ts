import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {spawnPackModel, type SpawnedPackModel} from './model-pack';
import {voyageNoise} from '../life/voyage';

const hullRows = [
  [-4.25, 0.86],
  [-3.7, 1.24],
  [-2.65, 1.47],
  [-1, 1.58],
  [1.35, 1.5],
  [2.9, 1.16],
  [4.15, 0.54],
  [4.9, 0.04],
];
const hullSection = [
  [-1, 1.18],
  [-1.01, 0.98],
  [-0.98, 0.81],
  [-0.84, 0.16],
  [-0.51, -0.47],
  [0, -0.72],
  [0.51, -0.47],
  [0.84, 0.16],
  [0.98, 0.81],
  [1.01, 0.98],
  [1, 1.18],
];

export const HELM_Z = -2.14;

// The deck planks follow the strakes; the raised stern is a single walkable step.
export function walkableDeck(x: number, z: number) {
  if (z < -4 || z > 4.1) return false;
  const row = hullRows.findIndex(([end]) => end >= z);
  const [a, wa] = hullRows[row - 1], [b, wb] = hullRows[row];
  const width = wa + (wb - wa) * (z - a) / (b - a);
  if (Math.abs(x) > width * .965 - .21) return false;
  if (Math.hypot(x, z - .45) < .32) return false; // mast
  if (Math.abs(x) < .54 && Math.abs(z - HELM_Z) < .22) return false;
  // Gun carriages and the barrels above them extend to either rail.
  return Math.abs(x) < .61 || (Math.abs(z + .4) >= .42 && Math.abs(z - 1.22) >= .42);
}

export function deckHeight(x: number, z: number) {
  return Math.abs(x) <= 1.14 && Math.abs(z + 3.2) <= .825 ? 1.27 : .96;
}

// Signed distance to the ship's horizontal section at capsule shoulder height.
// The end faces close the bow and stern. Positive distances are outside the timber.
export function hullContact(x: number, footY: number, z: number) {
  const lift = Math.max(0, (Math.abs(z) - 2) * .095);
  const shoulder = footY + .42 - lift;
  if (shoulder < -.72 || footY > 1.45 + lift) return null;
  const section = hullSection;
  let width = 1;
  for (let i = 6; i < section.length; i++) {
    const [f, h] = section[i], [pf, ph] = section[i - 1];
    if (shoulder <= h) { width = pf + (f - pf) * (shoulder - ph) / (h - ph); break; }
  }
  let distance = hullRows[0][0] - z, nx = 0, nz = -1;
  const bow = z - hullRows[hullRows.length - 1][0];
  if (bow > distance) { distance = bow; nz = 1; }
  for (let i = 1; i < hullRows.length; i++) {
    const [a, wa] = hullRows[i - 1], [b, wb] = hullRows[i];
    const slope = (wb - wa) * width / (b - a);
    const length = Math.hypot(1, slope);
    const d = (Math.abs(x) - wa * width - slope * (z - a)) / length;
    if (d > distance) { distance = d; nx = (x < 0 ? -1 : 1) / length; nz = -slope / length; }
  }
  return {distance, nx, nz, keel: lift - .72};
}

function painted(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}

function ensign(seed: number, rival: boolean) {
  return painted(384, 240, (c) => {
    const roll = (n: number) => voyageNoise(seed, n);
    c.fillStyle = rival ? '#923e48' : ['#146e74', '#21588a', '#65508d', '#15756a'][Math.floor(roll(1) * 4)];
    c.fillRect(0, 0, 384, 240);
    c.strokeStyle = '#f4ca79';
    c.lineWidth = 5;
    c.strokeRect(10, 10, 364, 220);
    c.fillStyle = '#f4ca79';
    for (let i = 0; i < 9; i++) {
      const x = 28 + i * 41;
      for (const y of [32, 208]) {
        c.beginPath();
        c.moveTo(x, y - 5);
        c.lineTo(x + 6, y);
        c.lineTo(x, y + 5);
        c.lineTo(x - 6, y);
        c.fill();
      }
    }
    c.fillStyle = rival ? '#fff1cf' : '#a8f6d8';
    c.beginPath();
    if (rival) {
      c.moveTo(130, 77);
      c.lineTo(192, 113);
      c.lineTo(254, 77);
      c.lineTo(211, 160);
      c.lineTo(173, 160);
    } else {
      c.moveTo(112, 154);
      c.bezierCurveTo(109, 116, 143, 99, 150, 85);
      c.quadraticCurveTo(176, 95, 188, 64);
      c.bezierCurveTo(197, 103, 224, 82, 239, 109);
      c.bezierCurveTo(300, 192, 125, 198, 112, 154);
    }
    c.closePath();
    c.fill();
    if (!rival) {
      c.fillStyle = '#193e48';
      for (const x of [164, 214]) {
        c.beginPath();
        c.ellipse(x, 136, 5, 6 + roll(2) * 5, 0, 0, Math.PI * 2);
        c.fill();
      }
      c.strokeStyle = '#193e48';
      c.lineWidth = 4;
      c.beginPath();
      c.arc(189, 146, 8, 0, Math.PI);
      c.stroke();
      c.fillStyle = '#fff7d3';
      c.beginPath();
      c.ellipse(154, 111, 12, 4, -0.5, 0, Math.PI * 2);
      c.fill();
      if (roll(3) > 0.5) {
        c.strokeStyle = '#f5d58c';
        c.beginPath();
        c.moveTo(30, 173);
        c.quadraticCurveTo(56, 151, 85, 172);
        c.stroke();
      }
    }
  });
}

export class VoyageShip {
  readonly group = new T.Group();
  readonly crew: SpawnedPackModel[] = [];
  readonly flag: T.Mesh<T.PlaneGeometry, T.MeshStandardMaterial>;
  private flagRoot = new T.Group();
  private flagBase: Float32Array;
  private heading = 0;
  private flagSeed = -1;
  private canvasCloth: T.MeshStandardMaterial;
  private owned = new Set<T.Material>();
  private textures: T.Texture[] = [];
  constructor(readonly rival = false) {
    this.group.name = rival ? 'voyage-enemy-ship' : 'voyage-slime-ship';
    const material = (color: number) => {
      const m = new T.MeshStandardMaterial({color, roughness: 0.83, flatShading: true, side: T.DoubleSide});
      this.owned.add(m);
      return m;
    };
    const wood = material(0x885530),
      oak = material(0xc28c53),
      teal = material(rival ? 0x89414a : 0x247c78);
    const brass = material(0xe5be73),
      iron = material(0x35464d),
      rope = material(0x5c4435),
      ivory = material(0xffe7b1);
    this.canvasCloth = ivory;
    ivory.flatShading = false;
    const grain = painted(256, 64, (c) => {
      c.fillStyle = '#e1be93';
      c.fillRect(0, 0, 256, 64);
      for (let j = 0; j < 98; j++) {
        const y = voyageNoise(95, j) * 64;
        c.strokeStyle = j % 3 ? '#98714545' : '#fff2cc64';
        c.lineWidth = 0.45 + voyageNoise(51, j);
        c.beginPath();
        c.moveTo(0, y);
        c.bezierCurveTo(68, y + 1, 134, y - 2, 256, y + 0.6);
        c.stroke();
      }
    });
    wood.map = oak.map = grain;
    this.textures.push(grain);
    const put = (geo: T.BufferGeometry, mat: T.Material | T.Material[], x = 0, y = 0, z = 0) => {
      const m = new T.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = m.receiveShadow = true;
      m.layers.set(1);
      this.group.add(m);
      return m;
    };
    const beam = (a: number[], b: number[], r: number, mat: T.Material) => {
      const start = new T.Vector3(...a),
        end = new T.Vector3(...b),
        d = end.clone().sub(start);
      const m = put(new T.CylinderGeometry(r, r, d.length(), 7), mat);
      m.position.copy(start).lerp(end, 0.5);
      m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
      return m;
    };
    // Each adjoining strake shares its edge with the next. Deck planks are separate non-overlapping strips.
    const rows = hullRows;
    const shell = new T.BufferGeometry(),
      points: number[] = [],
      indices: number[] = [];
    for (const [z, w] of rows) {
      const lift = Math.max(0, (Math.abs(z) - 2) * 0.095);
      for (const [f, y] of hullSection)
        points.push(f * w, y + lift, z);
    }
    for (let j = 0; j < rows.length - 1; j++)
      for (let k = 0; k < 10; k++) {
        const a = j * 11 + k,
          b = a + 11;
        shell.addGroup(indices.length, 6, k === 0 || k === 9 ? 0 : k === 1 || k === 8 ? 1 : 2);
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    // Closed transoms use triangles sharing the longitudinal skin vertices.
    for (const j of [0, rows.length - 1])
      for (let k = 1; k < 10; k++) {
        shell.addGroup(indices.length, 3, 2);
        indices.push(j * 11, j * 11 + k, j * 11 + k + 1);
      }
    shell.setAttribute('position', new T.Float32BufferAttribute(points, 3));
    const hullUV:number[]=[];
    for(const [z] of rows)for(let k=0;k<11;k++)hullUV.push((z+4.25)/9.15,k/10);
    shell.setAttribute('uv',new T.Float32BufferAttribute(hullUV,2));
    // Group indices by finish so the whole hull needs just three draw calls.
    const byFinish:number[][]=[[],[],[]];
    for(const g of shell.groups)byFinish[g.materialIndex??0].push(...indices.slice(g.start,g.start+g.count));
    shell.clearGroups();let start=0;
    byFinish.forEach((list,id)=>{shell.addGroup(start,list.length,id);start+=list.length;});
    shell.setIndex(byFinish.flat());
    shell.computeVertexNormals();
    put(shell, [teal, brass, wood]);
    for (let i = 0; i < rows.length - 1; i++) {
      const [z, w] = rows[i],
        [nz, nw] = rows[i + 1];
      for (let n = 0; n < 4; n++) {
        const t = n / 4,
          u = (n + 1) / 4 - 0.008,
          z0 = z + (nz - z) * t,
          z1 = z + (nz - z) * u,
          w0 = (w + (nw - w) * t) * 0.965,
          w1 = (w + (nw - w) * u) * 0.965;
        const deck = new T.BufferGeometry();
        deck.setAttribute(
          'position',
          new T.Float32BufferAttribute([-w0, 0.96, z0, w0, 0.96, z0, -w1, 0.96, z1, w1, 0.96, z1], 3),
        );
        deck.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));
        deck.setIndex([0, 2, 1, 1, 2, 3]);
        deck.computeVertexNormals();
        put(deck, oak);
      }
    }
    put(new T.BoxGeometry(2.28, 0.3, 1.65), teal, 0, 1.12, -3.2);
    beam([0, 0.97, 0.45], [0, 5.68, 0.45], 0.105, wood);
    beam([-2, 4.63, 0.45], [2, 4.63, 0.45], 0.065, wood);
    for (const side of [-1, 1]) {
      if (!rival) {
        for (const z of [-.35, .35]) beam([side * 1.58, -.36, z], [side * 1.67, 1.2, z], .032, rope);
        for (let i = 0; i < 5; i++) {
          const x = side * (1.59 + .018 * i), y = -.21 + .30 * i;
          beam([x, y, -.35], [x, y, .35], .045, oak);
        }
      }
      beam([side * 1.36, 1.19, -2.2], [0, 5.25, 0.45], 0.023, rope);
      beam([side * 1.34, 1.19, 1.8], [0, 5.25, 0.45], 0.023, rope);
      for (let j = 0; j < rows.length - 1; j++) {
        const [z, w] = rows[j],
          [nz, nw] = rows[j + 1],
          lift = (v: number) => Math.max(0, Math.abs(v) - 2) * 0.095;
        for (const [h, f, r, m] of [
          [0.48, 0.92, 0.035, oak],
          [1.17, 1, 0.046, brass],
        ] as const)
          beam([side * w * f, h + lift(z), z], [side * nw * f, h + lift(nz), nz], r, m);
      }
      for (const z of [-3.6, -2.85, -2.2]) {
        beam([side * 1.13, 1.15, z], [side * 1.13, 1.65, z], 0.045, brass);
      }
      beam([side * 1.13, 1.65, -3.7], [side * 1.13, 1.65, -2.15], 0.065, wood);
      for (let j = 1; j < 8; j++) {
        const u = j / 9,
          z = -2.2 + 2.65 * u,
          h = 1.19 + 4.06 * u;
        beam([side * 1.36 * (1 - u), h, z], [side * 1.34 * (1 - u), h, z + 0.73 * (1 - u)], 0.013, rope);
      }
      beam([side * 1.34, 1.19, -1.47], [0, 5.25, 0.45], 0.023, rope);
      for (const z of [-0.4, 1.22]) {
        put(new T.BoxGeometry(0.49, 0.32, 0.42), wood, side, 1.13, z);
        beam([side * 0.88, 1.38, z], [side * 1.85, 1.47, z], 0.143, iron);
        beam([side * 1.76, 1.46, z], [side * 1.85, 1.47, z], 0.164, brass);
        beam([side * 1.852, 1.47, z], [side * 1.86, 1.471, z], 0.107, iron);
      }
    }
    beam([0, 5.25, 0.45], [0, 1.43, 4.84], 0.022, rope);
    const sail = new T.PlaneGeometry(3.75, 2.18, 14, 8),
      v = sail.attributes.position;
    for (let i = 0; i < v.count; i++) {
      const x = v.getX(i),
        y = v.getY(i);
      v.setXYZ(
        i,
        x * (0.91 + 0.09 * y),
        y + 0.11 * (x / 1.88) ** 2,
        0.5 * Math.cos(x * 0.73) * Math.cos(y * 1.28),
      );
    }
    sail.computeVertexNormals();
    put(sail, ivory, 0, 3.46, 0.48);
    // The flying jib curves off the centreline, keeping the water ahead visible from the helm.
    beam([0, 1.16, 3.8], [0, 1.97, 5.85], 0.087, wood);
    beam([0, 5.4, 0.45], [0, 1.97, 5.85], 0.019, rope);
    const jib = new T.BufferGeometry(),
      verts: number[] = [],
      uv: number[] = [],
      ix: number[] = [];
    for (let j = 0; j <= 10; j++)
      for (let k = 0; k <= 10; k++) {
        const u = k / 10,
          v = j / 10;
        verts.push(
          0.36 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v) + 0.22 * v,
          1.83 + (1 - u) * 2.93 * v,
          0.96 + u * 4.45,
        );
        uv.push(u, v);
        if (j < 10 && k < 10) {
          const n = j * 11 + k;
          ix.push(n, n + 1, n + 11, n + 1, n + 12, n + 11);
        }
      }
    jib.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
    jib.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    jib.setIndex(ix);
    jib.computeVertexNormals();
    put(jib, material(rival ? 0xb88773 : 0xe1c496));
    const lamp = material(0xffda87);
    lamp.emissive.setHex(0xffa343);
    lamp.emissiveIntensity = 0.65;
    for (const side of [-1, 1]) {
      put(new T.CylinderGeometry(0.14, 0.11, 0.27, 6), lamp, side, 1.87, -3.67);
      put(new T.ConeGeometry(0.19, 0.19, 6), brass, side, 2.09, -3.67);
    }
    const helm = put(new T.TorusGeometry(0.32, 0.045, 8, 20), brass, 0, 1.68, HELM_Z);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 4;
      beam(
        [-0.4 * Math.cos(a), 1.68 - 0.4 * Math.sin(a), -2.14],
        [0.4 * Math.cos(a), 1.68 + 0.4 * Math.sin(a), -2.14],
        0.028,
        wood,
      );
    }
    helm.name = 'voyage-helm';
    const jewel = put(new T.OctahedronGeometry(0.31), brass, 0, 1.52, 4.36);
    jewel.scale.set(0.75, 1.35, 1);
    if (!rival) {
      const name = painted(384, 96, (c) => {
        c.fillStyle = '#195a59';
        c.fillRect(0, 0, 384, 96);
        c.fillStyle = '#ffe3a4';
        c.font = 'bold 60px serif';
        c.textAlign = 'center';
        c.fillText('史莱姆号', 192, 70);
      });
      const m = material(0xffffff);
      m.map = name;
      this.textures.push(name);
      put(new T.BoxGeometry(1.48, 0.38, 0.07), m, 0, 1.19, -4.29);
      for (const [id, x, z, size] of [
        ['ranch-hare', 0, 2.85, 0.83],
        ['ranch-red-panda', 0.72, 2.05, 0.86],
        ['ranch-capybara', -0.69, -1.4, 1.05],
      ] as const) {
        const pet = spawnPackModel(T, id, size, {outline: false});
        this.crew.push(pet);
        pet.group.position.set(x, deckHeight(x, z), z);
        this.group.add(pet.group);
      }
      for (const z of [-1.4, -0.78]) beam([-1.58, 1.22, z], [-1.7, -0.05, z], 0.037, wood);
      for (const y of [0.12, 0.46, 0.8]) beam([-1.68, y, -1.42], [-1.68, y, -0.77], 0.033, brass);
    }
    const flagMat = material(0xffffff);
    const geo = new T.PlaneGeometry(1.9, 1.01, 16, 6);
    geo.translate(0.95, -0.505, 0);
    this.flagBase = new Float32Array(geo.attributes.position.array);
    this.flag = new T.Mesh(geo, flagMat);
    this.flag.name = 'voyage-wind-flag';
    this.flag.layers.set(1);
    this.flagRoot.position.set(0, 5.67, 0.45);
    this.flagRoot.add(this.flag);
    this.group.add(this.flagRoot);
    // Bake planks, stanchions and rigging in ship-local coordinates. The flag and animal rigs keep moving.
    const batches=new Map<T.Material,T.BufferGeometry[]>();
    for(const part of [...this.group.children]){
      if(!(part instanceof T.Mesh)||Array.isArray(part.material))continue;
      part.updateMatrix();
      const geometry=part.geometry.index?part.geometry.toNonIndexed():part.geometry.clone();
      geometry.applyMatrix4(part.matrix);
      const list=batches.get(part.material)??[];list.push(geometry);batches.set(part.material,list);
      part.geometry.dispose();part.removeFromParent();
    }
    for(const [mat,parts] of batches){
      const combined=mergeGeometries(parts)!;put(combined,mat);parts.forEach(geometry=>geometry.dispose());
    }
    this.group.visible = false;
  }
  setFlag(seed: number) {
    if (seed === this.flagSeed) return;
    this.flagSeed = seed;
    this.flag.material.map?.dispose();
    this.flag.material.map = ensign(seed, this.rival);
    this.flag.material.needsUpdate = true;
    const emblem = this.flag.material.map.image;
    this.canvasCloth.map?.dispose();
    this.canvasCloth.map = painted(512, 320, (c) => {
      c.fillStyle = '#ede0bc';
      c.fillRect(0, 0, 512, 320);
      for (let x = 0; x <= 512; x += 64) {
        c.fillStyle = '#ad997b';
        c.fillRect(x, 0, 1.5, 320);
        c.fillStyle = '#fff1cc';
        c.fillRect(x + 2, 0, 1, 320);
      }
      c.strokeStyle = '#b39468';
      c.lineWidth = 7;
      c.strokeRect(5, 6, 502, 308);
      c.save();
      c.beginPath();
      c.ellipse(256, 160, 67, 73, 0, 0, Math.PI * 2);
      c.clip();
      c.drawImage(emblem, 92, 49, 193, 153, 186, 87, 140, 145);
      c.restore();
    });
    this.canvasCloth.needsUpdate = true;
  }
  animate(
    t: number,
    dt: number,
    speed: number,
    yaw: number,
    wind: number,
    bearing: number | null,
    bite: boolean,
    reload: number[],
  ) {
    const wx = Math.cos(0.55) * wind - Math.sin(yaw) * speed,
      wz = Math.sin(0.55) * wind - Math.cos(yaw) * speed;
    const target = -Math.atan2(wz, wx) - yaw; // local +X rotated around Y points towards (cos a, -sin a)
    this.heading +=
      Math.atan2(Math.sin(target - this.heading), Math.cos(target - this.heading)) *
      (1 - Math.exp(-dt * 3.2));
    this.flagRoot.rotation.y = this.heading;
    const strength = Math.min(1, Math.hypot(wx, wz) / 18),
      p = this.flag.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = this.flagBase[i * 3],
        y = this.flagBase[i * 3 + 1],
        u = x / 1.9;
      p.setXYZ(
        i,
        x * (0.68 + 0.32 * strength),
        y - u * (1 - strength) * 0.49,
        u * (0.11 + 0.17 * strength) * Math.sin(8 * u - 4.5 * t + y * 0.8) +
          u * 0.06 * Math.sin(14 * u - 6 * t),
      );
    }
    p.needsUpdate = true;
    this.flag.geometry.computeVertexNormals();
    if (!this.crew.length) return;
    this.crew[0].group.rotation.y = bearing ?? Math.sin(t * 0.55) * 0.48;
    const panda = this.crew[1].group,
      side = reload[0] >= reload[1] ? 1 : -1;
    panda.rotation.y = side * 1.3;
    panda.position.x += (side * 0.8 - panda.position.x) * Math.min(1, dt * 4);
    panda.rotation.z = 0.13 * Math.sin(Math.min(1.65, Math.max(...reload)) * 8);
    this.crew[2].group.rotation.x = bite ? 0.31 : 0.045 * Math.sin(t * 1.4);
  }
  dispose() {
    for (const pet of this.crew) pet.dispose();
    this.group.traverse((o) => {
      if (o instanceof T.Mesh) o.geometry.dispose();
    });
    this.flag.material.map?.dispose();
    this.canvasCloth.map?.dispose();
    this.textures.forEach((t) => t.dispose());
    this.owned.forEach((m) => m.dispose());
    this.group.removeFromParent();
  }
}
