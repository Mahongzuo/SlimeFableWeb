import * as T from 'three';
import type {Vec} from '../slime/types';
import type {Stage} from './stage';
import {LAYER} from './stage';
import {elements} from '../slime/elements';

export type PropKind = 'barrel' | 'bell' | 'supply';

export interface TacticalProp {
  id: number;
  kind: PropKind;
  ship: 'home' | 'courier';
  localPos: Vec;
  radius: number;
  intact: boolean;
  mesh: T.Group;
  ringAge: number;
}

interface ActivePool {
  kind: 'water' | 'dark';
  pos: Vec;
  radius: number;
  life: number;
  maxLife: number;
  tickAt: number;
  mesh: T.Mesh;
}

interface ArcBolt {
  line: T.Line;
  life: number;
  maxLife: number;
}

interface ExplosionFx {
  mesh: T.Mesh;
  ring: T.Mesh;
  age: number;
  maxAge: number;
}

export interface PropTriggerResult {
  prop: TacticalProp;
  worldPos: Vec;
}

/**
 * 5th-gate Skirmish tactical layer:
 * - Interactive powder barrels (AOE blast), ship bells (stun nearby foes), supply casks (heal + energy)
 * - 6-element clone burst effects (water puddles, lightning arcs, dark DoT clouds)
 * - 3D waypoint light beacon so players never get lost across the two multi-deck ships
 */
export class SkirmishTacticalLayer {
  readonly props: TacticalProp[] = [];
  private pools: ActivePool[] = [];
  private arcs: ArcBolt[] = [];
  private blasts: ExplosionFx[] = [];
  private courierGroup: T.Object3D | null;
  private beaconGroup: T.Group;
  private beaconBeam: T.Mesh;
  private beaconRing: T.Mesh;
  private beaconTarget: Vec | null = null;
  private beaconLabel = '';
  private worldVec = new T.Vector3();

  constructor(private stage: Stage) {
    this.courierGroup = stage.scene.getObjectByName('Blue flag records ship') ?? null;

    // 3D objective waypoint beacon (NO_OUTLINE, additive-feel translucent shaft + spinning halo)
    this.beaconGroup = new T.Group();
    this.beaconGroup.visible = false;
    this.beaconGroup.name = 'skirmish-waypoint-beacon';
    const beamMat = new T.MeshBasicMaterial({
      color: '#ffd98a', transparent: true, opacity: 0.24, depthWrite: false, side: T.DoubleSide,
    });
    this.beaconBeam = new T.Mesh(new T.CylinderGeometry(0.16, 0.42, 4.4, 16, 1, true), beamMat);
    this.beaconBeam.position.y = 2.25;
    this.beaconBeam.layers.set(LAYER.NO_OUTLINE);
    const ringMat = new T.MeshBasicMaterial({
      color: '#ffe9a8', transparent: true, opacity: 0.72, depthWrite: false,
    });
    this.beaconRing = new T.Mesh(new T.TorusGeometry(0.68, 0.055, 8, 32), ringMat);
    this.beaconRing.rotation.x = Math.PI / 2;
    this.beaconRing.position.y = 0.08;
    this.beaconRing.layers.set(LAYER.NO_OUTLINE);
    this.beaconGroup.add(this.beaconBeam, this.beaconRing);
    stage.scene.add(this.beaconGroup);

    // Populate tactical shootable props on both ships (clear of all test sightlines & walk seams)
    const specs: Array<{kind: PropKind; ship: 'home' | 'courier'; pos: Vec}> = [
      // Home ship: front deck powder barrel near first sailor, stern supply barrel
      {kind: 'barrel', ship: 'home', pos: [-2.15, 0, -2.55]},
      {kind: 'barrel', ship: 'home', pos: [1.85, 0, -3.45]},
      {kind: 'supply', ship: 'home', pos: [-3.25, 0, 3.85]},
      {kind: 'bell', ship: 'home', pos: [3.2, 2.1, 6.85]},
      // Courier ship: upper stern barrel near gunner, lower hold barrel & supply, guardian flanks
      {kind: 'barrel', ship: 'courier', pos: [19.4, 2.1, 7.65]},
      {kind: 'barrel', ship: 'courier', pos: [18.4, -2.45, -5.85]},
      {kind: 'supply', ship: 'courier', pos: [16.2, -2.45, -3.45]},
      {kind: 'barrel', ship: 'courier', pos: [15.9, 0, -0.55]},
      {kind: 'barrel', ship: 'courier', pos: [17.7, 0, 3.75]},
      {kind: 'bell', ship: 'courier', pos: [15.85, 0, 2.65]},
      {kind: 'supply', ship: 'courier', pos: [21.3, 0, -2.85]},
    ];
    specs.forEach((s, idx) => this.addProp(idx + 1, s.kind, s.ship, s.pos));
  }

  private addProp(id: number, kind: PropKind, ship: 'home' | 'courier', pos: Vec) {
    const g = new T.Group();
    g.position.set(pos[0], pos[1], pos[2]);
    g.name = `skirmish-prop-${kind}-${id}`;
    if (kind === 'barrel') {
      const body = new T.Mesh(
        new T.CylinderGeometry(0.28, 0.30, 0.78, 12),
        this.stage.toon('#b93a2e', {emissive: '#5a160f', emissiveIntensity: 0.25}),
      );
      body.position.y = 0.40;
      body.castShadow = true;
      const band1 = new T.Mesh(new T.TorusGeometry(0.295, 0.028, 6, 16), this.stage.toon('#2d3338'));
      band1.rotation.x = Math.PI / 2;
      band1.position.y = 0.22;
      const band2 = band1.clone();
      band2.position.y = 0.58;
      const glow = new T.Mesh(
        new T.OctahedronGeometry(0.11, 0),
        new T.MeshBasicMaterial({color: '#ff9642'}),
      );
      glow.position.y = 0.92;
      glow.layers.set(LAYER.NO_OUTLINE);
      g.add(body, band1, band2, glow);
    } else if (kind === 'bell') {
      const post = new T.Mesh(new T.CylinderGeometry(0.04, 0.05, 1.32, 8), this.stage.toon('#5d473a'));
      post.position.y = 0.66;
      const arm = new T.Mesh(new T.BoxGeometry(0.46, 0.06, 0.06), this.stage.toon('#5d473a'));
      arm.position.set(0.16, 1.24, 0);
      const bell = new T.Mesh(
        new T.ConeGeometry(0.20, 0.34, 12),
        this.stage.toon('#eab95d', {emissive: '#75531a', emissiveIntensity: 0.3}),
      );
      bell.position.set(0.32, 1.04, 0);
      bell.castShadow = true;
      g.add(post, arm, bell);
    } else {
      const body = new T.Mesh(
        new T.CylinderGeometry(0.26, 0.28, 0.66, 12),
        this.stage.toon('#3d8c78', {emissive: '#1e5b4c', emissiveIntensity: 0.35}),
      );
      body.position.y = 0.34;
      body.castShadow = true;
      const cross = new T.Mesh(new T.OctahedronGeometry(0.13, 0), new T.MeshBasicMaterial({color: '#9bffcf'}));
      cross.position.y = 0.86;
      cross.layers.set(LAYER.NO_OUTLINE);
      g.add(body, cross);
    }
    const parent = ship === 'courier' && this.courierGroup ? this.courierGroup : this.stage.scene;
    parent.add(g);
    this.props.push({
      id, kind, ship, localPos: [...pos], radius: kind === 'bell' ? 0.68 : 0.62,
      intact: true, mesh: g, ringAge: 0,
    });
  }

  propWorldPos(p: TacticalProp): Vec {
    p.mesh.getWorldPosition(this.worldVec);
    return [this.worldVec.x, this.worldVec.y + 0.45, this.worldVec.z];
  }

  /** Check whether a player clone impact/burst hits any intact prop (barrel / bell / supply). */
  checkImpact(point: Vec, hitRadius = 0.92): PropTriggerResult[] {
    const hit: PropTriggerResult[] = [];
    for (const p of this.props) {
      if (!p.intact) continue;
      const wp = this.propWorldPos(p);
      const d = Math.hypot(point[0] - wp[0], (point[1] - wp[1]) * 0.85, point[2] - wp[2]);
      if (d <= p.radius + hitRadius) {
        if (p.kind === 'bell') {
          if (p.ringAge > 0) continue; // brief cooldown on bell
          p.ringAge = 4.0;
        } else {
          p.intact = false;
          p.mesh.visible = false;
        }
        if (p.kind === 'barrel') this.spawnBlast(wp, '#ff7b3b', 4.4);
        else if (p.kind === 'bell') this.spawnBlast(wp, '#ffe285', 4.8);
        else this.spawnBlast(wp, '#8bf7c0', 1.8);
        hit.push({prop: p, worldPos: wp});
      }
    }
    return hit;
  }

  /** Reset all props (e.g. when restoring a checkpoint on defeat). */
  resetProps() {
    for (const p of this.props) {
      p.intact = true;
      p.ringAge = 0;
      p.mesh.visible = true;
    }
    this.clearEffects();
  }

  spawnBlast(pos: Vec, color: string, maxRadius: number) {
    const sphere = new T.Mesh(
      new T.SphereGeometry(0.55, 14, 10),
      new T.MeshBasicMaterial({color, transparent: true, opacity: 0.75, depthWrite: false}),
    );
    sphere.position.set(pos[0], pos[1], pos[2]);
    sphere.layers.set(LAYER.NO_OUTLINE);
    const ring = new T.Mesh(
      new T.TorusGeometry(1, 0.08, 8, 32),
      new T.MeshBasicMaterial({color: '#fff2c2', transparent: true, opacity: 0.9, depthWrite: false}),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(pos[0], pos[1] - 0.15, pos[2]);
    ring.layers.set(LAYER.NO_OUTLINE);
    ring.userData.maxRadius = maxRadius;
    this.stage.scene.add(sphere, ring);
    this.blasts.push({mesh: sphere, ring, age: 0, maxAge: 0.48});
  }

  spawnLightningArc(from: Vec, to: Vec, color = '#d6b6ff') {
    const pts: number[] = [];
    const segs = 7;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const jitter = i > 0 && i < segs ? 0.24 : 0;
      pts.push(
        from[0] + (to[0] - from[0]) * t + (Math.random() - 0.5) * jitter,
        from[1] + (to[1] - from[1]) * t + (Math.random() - 0.5) * jitter,
        from[2] + (to[2] - from[2]) * t + (Math.random() - 0.5) * jitter,
      );
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
    const mat = new T.LineBasicMaterial({color, transparent: true, opacity: 0.95});
    const line = new T.Line(geo, mat);
    line.layers.set(LAYER.NO_OUTLINE);
    this.stage.scene.add(line);
    this.arcs.push({line, life: 0.32, maxLife: 0.32});
  }

  spawnElementPool(kind: 'water' | 'dark', pos: Vec) {
    if (this.pools.length >= 6) {
      const old = this.pools.shift()!;
      old.mesh.removeFromParent();
      old.mesh.geometry.dispose();
      (old.mesh.material as T.Material).dispose();
    }
    const radius = kind === 'water' ? 2.1 : 2.3;
    const mat = new T.MeshBasicMaterial({
      color: kind === 'water' ? elements[0].rim : elements[4].rim,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const mesh = new T.Mesh(new T.CircleGeometry(radius, 24), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos[0], pos[1] + 0.045, pos[2]);
    mesh.layers.set(LAYER.NO_OUTLINE);
    this.stage.scene.add(mesh);
    this.pools.push({
      kind,
      pos: [pos[0], pos[1], pos[2]],
      radius,
      life: kind === 'water' ? 6.0 : 3.2,
      maxLife: kind === 'water' ? 6.0 : 3.2,
      tickAt: 0.5,
      mesh,
    });
  }

  hasWaterNear(pos: Vec, extraRadius = 0.8): boolean {
    return this.pools.some(
      p => p.kind === 'water' && Math.hypot(p.pos[0] - pos[0], p.pos[2] - pos[2]) <= p.radius + extraRadius && Math.abs(p.pos[1] - pos[1]) < 1.2,
    );
  }

  setWaypoint(pos: Vec | null, label = '', color = '#ffd98a') {
    this.beaconTarget = pos ? [...pos] : null;
    this.beaconLabel = label;
    this.beaconGroup.visible = pos !== null;
    if (pos) {
      this.beaconGroup.position.set(pos[0], pos[1], pos[2]);
      (this.beaconBeam.material as T.MeshBasicMaterial).color.set(color);
      (this.beaconRing.material as T.MeshBasicMaterial).color.set(color);
    }
  }

  waypointInfo(playerPos: Vec): {label: string; distance: number} | null {
    if (!this.beaconTarget) return null;
    const d = Math.hypot(
      this.beaconTarget[0] - playerPos[0],
      this.beaconTarget[1] - playerPos[1],
      this.beaconTarget[2] - playerPos[2],
    );
    return {label: this.beaconLabel, distance: d};
  }

  update(
    dt: number,
    time: number,
    onDarkTick?: (pos: Vec, radius: number) => void,
  ) {
    for (const p of this.props) {
      if (!p.intact) continue;
      if (p.ringAge > 0) {
        p.ringAge = Math.max(0, p.ringAge - dt);
        p.mesh.rotation.z = p.ringAge > 3.2 ? Math.sin(time * 32) * 0.16 : 0;
      } else {
        p.mesh.rotation.z = 0;
      }
      const gem = p.mesh.children[p.mesh.children.length - 1];
      if (gem && p.kind !== 'bell') {
        gem.rotation.y = time * 2.2 + p.id;
        gem.position.y = (p.kind === 'barrel' ? 0.92 : 0.86) + Math.sin(time * 3.5 + p.id) * 0.05;
      }
    }

    if (this.beaconGroup.visible) {
      this.beaconRing.rotation.z = time * 1.8;
      const pulse = 1 + 0.12 * Math.sin(time * 4.2);
      this.beaconRing.scale.set(pulse, pulse, 1);
      (this.beaconBeam.material as T.MeshBasicMaterial).opacity = 0.18 + 0.08 * Math.sin(time * 3.2);
    }

    for (let i = this.pools.length - 1; i >= 0; i--) {
      const pl = this.pools[i];
      pl.life -= dt;
      if (pl.kind === 'dark') {
        pl.tickAt -= dt;
        if (pl.tickAt <= 0) {
          pl.tickAt = 0.65;
          onDarkTick?.(pl.pos, pl.radius);
        }
      }
      const fade = Math.min(1, pl.life / 0.8);
      (pl.mesh.material as T.MeshBasicMaterial).opacity = 0.34 * fade;
      if (pl.life <= 0) {
        pl.mesh.removeFromParent();
        pl.mesh.geometry.dispose();
        (pl.mesh.material as T.Material).dispose();
        this.pools.splice(i, 1);
      }
    }

    for (let i = this.arcs.length - 1; i >= 0; i--) {
      const a = this.arcs[i];
      a.life -= dt;
      (a.line.material as T.LineBasicMaterial).opacity = Math.max(0, a.life / a.maxLife);
      if (a.life <= 0) {
        a.line.removeFromParent();
        a.line.geometry.dispose();
        (a.line.material as T.Material).dispose();
        this.arcs.splice(i, 1);
      }
    }

    for (let i = this.blasts.length - 1; i >= 0; i--) {
      const b = this.blasts[i];
      b.age += dt;
      const u = Math.min(1, b.age / b.maxAge);
      const maxR = (b.ring.userData.maxRadius as number) || 3.5;
      const spread = 1 - (1 - u) * (1 - u);
      b.mesh.scale.setScalar(0.5 + spread * maxR * 0.65);
      (b.mesh.material as T.MeshBasicMaterial).opacity = (1 - u) * 0.65;
      b.ring.scale.setScalar(0.25 + spread * maxR);
      (b.ring.material as T.MeshBasicMaterial).opacity = (1 - u) * 0.9;
      if (u >= 1) {
        b.mesh.removeFromParent();
        b.ring.removeFromParent();
        b.mesh.geometry.dispose();
        b.ring.geometry.dispose();
        (b.mesh.material as T.Material).dispose();
        (b.ring.material as T.Material).dispose();
        this.blasts.splice(i, 1);
      }
    }
  }

  clearEffects() {
    for (const p of this.pools) { p.mesh.removeFromParent(); p.mesh.geometry.dispose(); (p.mesh.material as T.Material).dispose(); }
    for (const a of this.arcs) { a.line.removeFromParent(); a.line.geometry.dispose(); (a.line.material as T.Material).dispose(); }
    for (const b of this.blasts) { b.mesh.removeFromParent(); b.ring.removeFromParent(); b.mesh.geometry.dispose(); b.ring.geometry.dispose(); (b.mesh.material as T.Material).dispose(); (b.ring.material as T.Material).dispose(); }
    this.pools.length = 0;
    this.arcs.length = 0;
    this.blasts.length = 0;
  }
}

/** Determine whether a shot struck an enemy's weakpoint (head or figurehead's exposed sail knot). */
export function isWeakpointHit(
  enemyKind: string,
  enemyPos: Vec,
  hitPoint: Vec,
  exposed: boolean,
): boolean {
  const dy = hitPoint[1] - enemyPos[1];
  if (enemyKind === 'guardian') return exposed && dy >= 0.72 && dy <= 1.55;
  return dy >= 1.18;
}
