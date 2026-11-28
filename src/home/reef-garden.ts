import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {voyageNoise} from '../life/voyage';
import {SEA_LEVEL} from './layout';
import {MarineModels} from './marine-models';

/** Tapered, forked colonies. The source kit supplies rocks and algae but no coral mesh. */
function coralGeometry(kind: number) {
  const limbs: T.BufferGeometry[] = [];
  const base = new T.Color([0xa85749, 0xa87642, 0x956d86][kind]);
  const tip = new T.Color([0xedaf91, 0xe2bd78, 0xe0bad3][kind]);
  let branch = 0;
  function grow(start: T.Vector3, direction: T.Vector3, length: number, radius: number, depth: number) {
    const id = ++branch, end = start.clone().addScaledVector(direction, length);
    const stem = new T.CylinderGeometry(depth ? radius*.65 : radius*.21, radius, length+radius*.32, 7, 3);
    const verts = stem.attributes.position;
    for (let v=0; v<verts.count; v++) {
      const u = verts.getY(v)/length + .5, bend = Math.sin(Math.PI*u);
      verts.setX(v, verts.getX(v) + bend*length*.15*Math.sin(id));
      verts.setZ(v, verts.getZ(v) + bend*length*.19*Math.cos(id));
    }
    stem.computeVertexNormals();
    stem.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), direction));
    stem.translate((start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2);
    const colors: number[] = [], c = new T.Color();
    for (let i = 0; i < stem.attributes.position.count; i++) {
      c.copy(base).lerp(tip, Math.min(.96, stem.attributes.position.getY(i) * .85));
      colors.push(c.r, c.g, c.b);
    }
    stem.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    limbs.push(stem);
    if (!depth) return;
    for (const side of [-1, 1]) {
      const angle = kind === 0 ? 0 : id * 2.399;
      const spread = side * (.43 + voyageNoise(kind, id, side) * .68);
      const next = direction.clone().multiplyScalar(.70).add(new T.Vector3(spread * Math.cos(angle), .33, spread * Math.sin(angle) + .16 * Math.sin(id))).normalize();
      grow(end, next, length * (.64 + .22*voyageNoise(id,side,kind)), radius * .7, depth - 1);
    }
  }
  for (let k = 0; k < 3; k++) {
    const a = k * 2.399, dir = new T.Vector3(.5 * Math.cos(a), 1, .38 * Math.sin(a)).normalize();
    grow(new T.Vector3(.09 * Math.cos(a), 0, .09 * Math.sin(a)), dir, .31 + .04 * k, .062, 4);
  }
  const geo = mergeGeometries(limbs)!;
  limbs.forEach(g => g.dispose());
  return geo;
}

type Batch = {mesh: T.InstancedMesh; size: number; foot:T.Vector3[]};
export class ReefGarden {
  readonly root = new T.Group();
  private clock = {value: 0};
  private batches: Batch[] = [];
  private resources = new Set<{dispose(): void}>();
  private key = '';
  private started = false;
  private closed = false;
  constructor(private models: MarineModels) { this.root.name = 'water-pro-seabed'; }

  private add(name: string, geo: T.BufferGeometry, mat: T.Material, capacity: number) {
    const mesh = new T.InstancedMesh(geo, mat, capacity);
    mesh.count = 0;
    mesh.name = name;
    mesh.layers.set(1);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.resources.add(geo);
    this.resources.add(mesh);
    this.root.add(mesh);
    const foot:T.Vector3[]=[];
    if(this.batches.length<7){
      const pos=geo.getAttribute('position');geo.computeBoundingBox();
      const upper=geo.boundingBox!.max.y*.28;
      // Keep the lowest contact in each part of the footprint to bound streaming cost.
      const contacts=new Map<string,T.Vector3>();
      for(let j=0;j<pos.count;j++){
        const p=new T.Vector3().fromBufferAttribute(pos,j);if(p.y>upper)continue;
        const key=Math.floor(6*p.x)+','+Math.floor(6*p.z),previous=contacts.get(key);
        if(!previous || p.y<previous.y)contacts.set(key,p);
      }
      foot.push(...contacts.values());
    }
    this.batches.push({mesh, size: 0,foot});
  }

  private async load() {
    const names = ['rocks', 'seaweed', 'seaweed_tall', 'grass'];
    const assets = await Promise.all(names.map(n => this.models.load(n)));
    if (this.closed) return;
    assets.forEach((asset, id) => {
      asset.scene.updateMatrixWorld(true);
      asset.scene.traverse(node => {
        if (!(node instanceof T.Mesh)) return;
        const geo = node.geometry.clone().applyMatrix4(node.matrixWorld);
        geo.computeBoundingBox();
        const b = geo.boundingBox!, size = b.getSize(new T.Vector3()), mid = b.getCenter(new T.Vector3());
        const unit = 1 / (id ? size.y : Math.max(size.x, size.z));
        geo.translate(-mid.x, -b.min.y, -mid.z).scale(unit, unit, unit);
        const mat = (node.material as T.MeshStandardMaterial).clone();
        mat.metalness = .02;
        mat.roughness = Math.max(.7, mat.roughness);
        if (id) {
          mat.side = T.DoubleSide;
          mat.onBeforeCompile = shader => {
            shader.uniforms.reefTime = this.clock;
            shader.vertexShader = 'uniform float reefTime;\n' + shader.vertexShader.replace('#include <begin_vertex>',
              '#include <begin_vertex>\n transformed.x += .12*position.y*position.y*sin(reefTime*1.3 + instanceMatrix[3].x*.47 + position.y);');
          };
        }
        this.resources.add(mat);
        this.add(id ? names[id] : node.name, geo, mat, 256);
      });
    });
    const coralMat = new T.MeshStandardMaterial({vertexColors: true, roughness: .94});
    this.resources.add(coralMat);
    for (let i = 0; i < 3; i++) this.add('coral-' + i, coralGeometry(i), coralMat, 128);
    this.invalidate();
  }
  invalidate() { this.key = ''; }
  update(t: number, x: number, y: number, z: number, seed: number, density: number, bed: (x: number,z: number)=>number) {
    this.clock.value = t;
    if (!this.started) {
      this.started = true;
      void this.load().catch(e => { console.warn('Ocean reef:', e); });
    }
    if (!this.batches.length) return;
    const cell = 12, gx = Math.floor(x / cell), gz = Math.floor(z / cell), level = Math.floor(y / 16);
    const key = [gx,gz,level,seed,density].join('/');
    if (key === this.key) return;
    this.key = key;
    for (const b of this.batches) b.size = 0;
    const obj = new T.Object3D();
    for (let a = gx - 3; a <= gx + 3; a++) for (let b = gz - 3; b <= gz + 3; b++) {
      const salt = Math.imul(a,7919) ^ Math.imul(b,104729);
      const n = (k: number) => voyageNoise(seed, salt, k);
      const cx = (a + .15 + .7*n(0))*cell, cz = (b + .15 + .7*n(1))*cell;
      for (let j = 0; j < 9; j++) {
        const k = 10 + j*11;
        if (n(k) > .27 + density*.73) continue;
        const px = cx + (n(k+1)-.5)*9, pz = cz + (n(k+2)-.5)*9;
        const floor = bed(px,pz), depth = SEA_LEVEL-floor;
        if (depth < .75 || Math.abs(floor - level*16) > 85) continue;
        const rock = j < 4, coral = j >= 7;
        if (!rock && (depth > (coral ? 27 : 35) || n(7) < (coral ? .48 : .18))) continue;
        const slopeX = bed(px+.5,pz)-floor, slopeZ = bed(px,pz+.5)-floor;
        if (!Number.isFinite(slopeX+slopeZ) || Math.hypot(slopeX,slopeZ) > .55) continue;
        const id = rock ? Math.floor(n(k+3)*7) : coral ? 10+Math.floor(n(k+3)*3) : (n(k+3)<.17?9:n(k+4)<.5?7:8);
        const batch = this.batches[id];
        if (batch.size >= batch.mesh.instanceMatrix.count) continue;
        const scale = Math.min(depth*.63, rock ? .55+2.4*n(k+5)**2 : .32+1.2*n(k+5));
        obj.position.set(px, floor - (rock ? .10 : .045)*scale, pz);
        obj.rotation.set(Math.atan(2*slopeZ)*-.55,n(k+6)*Math.PI*2,Math.atan(2*slopeX)*.55,'ZXY');
        obj.scale.setScalar(scale); obj.updateMatrix();
        if(rock){
          const m=obj.matrix.elements;let y=floor;
          for(const p of batch.foot){
            const dx=m[0]*p.x+m[4]*p.y+m[8]*p.z,dz=m[2]*p.x+m[6]*p.y+m[10]*p.z;
            y=Math.min(y,bed(px+dx,pz+dz)-(m[1]*p.x+m[5]*p.y+m[9]*p.z));
          }
          m[13]=y-.015;
        }
        batch.mesh.setMatrixAt(batch.size++,obj.matrix);
      }
    }
    for (const b of this.batches) {
      b.mesh.count = b.size;
      b.mesh.visible = b.size > 0;
      b.mesh.instanceMatrix.needsUpdate = true;
      b.mesh.computeBoundingSphere();
    }
  }
  dispose() {
    this.closed = true;
    this.root.removeFromParent();
    for (const r of this.resources) r.dispose();
    this.resources.clear();
  }
}
