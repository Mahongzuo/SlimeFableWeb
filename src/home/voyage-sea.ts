import type {MarineModels} from './marine-models';
import {spawnPackModel, type SpawnedPackModel} from './model-pack';
import * as T from 'three';

type Wave = (x: number, z: number) => number;
interface Foam {
  x: number;
  z: number;
  vx: number;
  vz: number;
  lift: number;
  age: number;
  life: number;
  size: number;
  yaw: number;
}
interface Shot {
  x: number;
  z: number;
  toX: number;
  toZ: number;
  age: number;
  duration: number;
}
export class VoyageSea {
  readonly root = new T.Group();
  private foam: Foam[] = [];
  private shots: Shot[] = [];
  private foamMaterial = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    vertexShader: `varying vec2 vPatch; varying vec2 vSea;
      void main(){vPatch=uv*2.-1.;vec4 pos=instanceMatrix*vec4(position,1.);vSea=pos.xz;
      gl_Position=projectionMatrix*modelViewMatrix*pos;}`,
    fragmentShader: `varying vec2 vPatch;varying vec2 vSea;
      float hash(vec2 p){return fract(sin(dot(p,vec2(87.3,191.7)))*4375.17);}
      float noise(vec2 p){vec2 i=floor(p),u=fract(p);u=u*u*(3.-2.*u);
        return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+1.),u.x),u.y);}
      void main(){float n=noise(vSea*9.)*.6+noise(vSea*23.)*.4;
        float r=length(vPatch);float a=(1.-smoothstep(.45,1.,r))*smoothstep(.27,.72,n);
        if(a<.02)discard;gl_FragColor=vec4(mix(vec3(.22,.49,.5),vec3(.71,.83,.75),n),a*.63);}`,
  });
  private foamMesh = new T.InstancedMesh(
    new T.PlaneGeometry(2, 2).rotateX(-Math.PI / 2),
    this.foamMaterial,
    360,
  );
  private shotMesh = new T.InstancedMesh(
    new T.SphereGeometry(0.21, 8, 6),
    new T.MeshStandardMaterial({color: 0x392f35, emissive: 0xe59c46, emissiveIntensity: 0.6}),
    16,
  );
  private marker = new T.Mesh(
    new T.RingGeometry(2.4, 2.7, 36).rotateX(-Math.PI / 2),
    new T.MeshBasicMaterial({
      color: 0xff9950,
      side: T.DoubleSide,
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
    }),
  );
  private dummy = new T.Object3D();
  private gulls: T.Group[] = [];
  private fish: T.Group[] = [];
  private leaps: {x: number; z: number; dx: number; dz: number; age: number}[] = [];
  private stamps = [0, 0];
  private birds: SpawnedPackModel[] = [];
  private swimmers: ReturnType<MarineModels['fish']>[] = [];
  private fishClock = 2;
  constructor(
    scene: T.Scene, models: MarineModels,
    private hasFishDepth: (x: number, z: number) => boolean,
    private waterImpact: (x: number, z: number, size: number) => void,
  ) {
    this.root.name = 'voyage-surface-life';
    scene.add(this.root);
    this.root.add(this.foamMesh, this.shotMesh, this.marker);
    this.foamMesh.count = this.shotMesh.count = 0;
    this.foamMesh.frustumCulled = this.shotMesh.frustumCulled = false;
    for (let i = 0; i < 4; i++) {
      const bird = spawnPackModel(T,'sea-gull',1.65,{outline:false, clip:'Fly', phaseOffset:i*.23, onLoaded:g => g.visible=true});
      bird.group.visible = false;
      this.root.add(bird.group);
      this.gulls.push(bird.group);
      this.birds.push(bird);
    }
    for (let i=0; i<3; i++) {
      const g = new T.Group();
      this.swimmers.push(models.fish(g,.85,i*.31));
      this.root.add(g);
      this.fish.push(g);
      g.visible=false;
    }
    this.root.traverse((o) => o.layers.set(1));
    this.root.visible = false;
  }
  private puff(
    x: number,
    z: number,
    vx: number,
    vz: number,
    lift: number,
    life: number,
    size: number,
    yaw = 0,
  ) {
    if (this.foam.length === 360) this.foam.shift();
    this.foam.push({x, z, vx, vz, lift, life, size, age: 0, yaw});
  }
  splash(x: number, z: number, scale = 1) {
    this.waterImpact(x, z, scale);
    for (let i = 0; i < 12; i++) {
      const a = i * 2.4;
      this.puff(
        x,
        z,
        Math.cos(a) * scale * 2,
        Math.sin(a) * scale * 2,
        scale * (0.3 + (i % 4) * 0.2),
        0.6 + (i % 3) * 0.2,
        0.12 + scale * 0.09,
        a,
      );
    }
  }
  wake(id: number, x: number, z: number, yaw: number, speed: number, dt: number) {
    this.stamps[id] += Math.abs(speed) * dt;
    if (this.stamps[id] < 0.68 || Math.abs(speed) < 0.25) return;
    this.stamps[id] = 0;
    const fx = Math.sin(yaw),
      fz = Math.cos(yaw),
      intensity = Math.min(1, Math.abs(speed) / 18);
    for (const side of [-1, 1]) {
      const rx = fz * side,
        rz = -fx * side;
      this.puff(
        x + fx * 2.9 + rx,
        z + fz * 2.9 + rz,
        rx * 2.6 - fx,
        rz * 2.6 - fz,
        0.23 + intensity * 0.94,
        0.55,
        0.19,
        yaw,
      );
    }
  }
  shoot(x: number, z: number, toX: number, toZ: number, duration = 0.42) {
    this.shots.push({x, z, toX, toZ, age: 0, duration});
    if (this.shots.length > 16) this.shots.shift();
  }
  update(
    t: number,
    dt: number,
    x: number,
    z: number,
    yaw: number,
    wave: Wave,
    allowLeaps: boolean,
    aim: {x: number; z: number} | null,
  ) {
    this.root.visible = true;
    this.marker.visible = !!aim;
    if (aim) this.marker.position.set(aim.x, wave(aim.x, aim.z) + 0.18, aim.z);
    let count = 0;
    for (const f of this.foam) {
      f.age += dt;
      if (f.age >= f.life) continue;
      const u = f.age / f.life;
      f.x += f.vx * dt;
      f.z += f.vz * dt;
      this.dummy.position.set(f.x, wave(f.x, f.z) + 0.055 + 4 * u * (1 - u) * f.lift, f.z);
      this.dummy.rotation.set(f.lift ? 0.38 : 0, f.yaw, 0);
      const size = f.size * (1 - u * u);
      this.dummy.scale.set(size * (1 + u), size * (f.lift ? 0.76 : 0.14), size * (f.lift ? 1 : 2.7));
      this.dummy.updateMatrix();
      this.foamMesh.setMatrixAt(count++, this.dummy.matrix);
    }
    this.foam = this.foam.filter((f) => f.age < f.life);
    this.foamMesh.count = count;
    this.foamMesh.instanceMatrix.needsUpdate = true;
    count = 0;
    for (const s of this.shots) {
      s.age += dt;
      const u = Math.min(1, s.age / s.duration);
      const px = s.x + (s.toX - s.x) * u,
        pz = s.z + (s.toZ - s.z) * u;
      this.dummy.position.set(px, wave(px, pz) + 1.3 * (1 - u) + 7 * u * (1 - u), pz);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.shotMesh.setMatrixAt(count++, this.dummy.matrix);
      if (u === 1) this.splash(px, pz, 0.9);
    }
    this.shots = this.shots.filter((s) => s.age < s.duration);
    this.shotMesh.count = count;
    this.shotMesh.instanceMatrix.needsUpdate = true;
    for (const [i, g] of this.gulls.entries()) {
      const a = t * (0.2 + i * 0.024) + i * 1.8,
        r = 11 + 8 * Math.sin(0.11 * t + i) + i * 2;
      g.position.set(x + r * Math.cos(a), 4.6 + 2.3 * Math.sin(t * 0.22 + i) + i * 0.6, z + r * Math.sin(a));
      g.rotation.y = -a;
      g.rotation.z = .12*Math.sin(a);
    }
    if (!allowLeaps) {
      if (this.leaps.length) {
        this.leaps = [];
        this.fish.forEach(g => { g.visible = false; });
      }
      return;
    }
    this.fishClock -= dt;
    if (this.fishClock <= 0) {
      this.fishClock = 7.5;
      this.fish.forEach(g => { g.visible = false; });
      this.leaps = this.fish.map((_, i) => ({
        x: x + Math.sin(yaw) * 13 + Math.cos(yaw) * (7 + i * 1.8),
        z: z + Math.cos(yaw) * 13 - Math.sin(yaw) * (7 + i * 1.8),
        dx: -Math.cos(yaw) * 6,
        dz: Math.sin(yaw) * 6,
        age: -i * 0.22,
      })).filter(f => {
        // Include the nose and tail beyond the 6 m flight, and both sides of the fish.
        for (let step = -1; step <= 13; step++) {
          for (const side of [-.4, 0, .4]) {
            const px = f.x + f.dx * step / 12 - f.dz * side / 6;
            const pz = f.z + f.dz * step / 12 + f.dx * side / 6;
            if (!this.hasFishDepth(px, pz)) return false;
          }
        }
        return true;
      });
    }
    this.leaps.forEach((f, i) => {
      const was = f.age;
      f.age += dt;
      const g = this.fish[i];
      g.visible = f.age >= 0 && f.age < 1;
      if (was <= 0 && f.age > 0) this.splash(f.x, f.z, 0.5);
      if (was < 1 && f.age >= 1) this.splash(f.x + f.dx, f.z + f.dz, 0.75);
      if (!g.visible) return;
      this.swimmers[i].update(dt);
      const px = f.x + f.dx * f.age,
        pz = f.z + f.dz * f.age;
      g.position.set(px, wave(px, pz) + 8 * f.age * (1 - f.age), pz);
      g.rotation.order = 'YXZ';
      g.rotation.set(-Math.atan2(8 - 16 * f.age, 6), Math.atan2(f.dx, f.dz), 0);
    });
  }
  reset() {
    this.foam = [];
    this.shots = [];
    this.leaps = [];
    this.fish.forEach((g) => (g.visible = false));
    this.root.visible = false;
  }
  dispose() {
    for (const bird of this.birds) bird.dispose();
    for (const fish of this.swimmers) fish.dispose();
    const resources = new Set<{dispose: () => void}>();
    this.root.traverse((o) => {
      if (o instanceof T.Mesh) {
        resources.add(o.geometry);
        resources.add(o.material);
      }
    });
    resources.forEach((r) => r.dispose());
    this.root.removeFromParent();
  }
}
