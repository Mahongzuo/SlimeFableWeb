import {ELEMENT_SLASH_STYLES} from './slash-vfx';
import type {SkillDef} from './skills';
import type {Vec} from './types';

export interface SkillEffectCallbacks {
  getTargetPositions: () => Vec[];
  castWall?: (from:Vec,to:Vec)=>Vec|undefined;
  blocked?: (from:Vec,to:Vec)=>boolean;
  sampleTerrain: (x: number, z: number) => number | null;
  onSkillHitArea: (center: Vec, def: SkillDef, isBurst?: boolean) => void;
  onSpawnBurst: (pos: Vec, element: number, count?: number, spread?: number) => void;
}

interface ActiveProjectile {
  def: SkillDef;
  pos: Vec;
  vel: Vec;
  age: number;
  maxAge: number;
  mesh: any;
  isWave: boolean;
  aimed: boolean;
}

interface ActiveTimedFx {
  age: number;
  life: number;
  update: (t: number, dt: number) => void;
  dispose: () => void;
}

const EL_HEX = [0x3da8ff, 0x3be085, 0xff6b1a, 0x9b66ff, 0x3e2466, 0xf2c96b] as const;
const EL_CORE = [0xd6f6ff, 0xd8ffea, 0xfff0a8, 0xf0e4ff, 0xc299ff, 0xfffbe6] as const;

/**
 * 3D Anime-ARPG Skill VFX & active spell entity manager (Projectiles, Bolts, Chains,
 * Tornado Vortices, Bubble Domes, Magic Domains, Meteors, Sword-Qi Waves, and Quake Slams).
 */
export class SkillVfxSystem {
  private T: any;
  readonly root: any;
  private projectiles: ActiveProjectile[] = [];
  private fxList: ActiveTimedFx[] = [];

  constructor(private ctx: {THREE: any; scene: any}) {
    this.T = ctx.THREE;
    this.root = new this.T.Group();
    this.root.name = 'slime-skill-vfx';
    ctx.scene.add(this.root);
  }

  get activeCount(): number {
    return this.projectiles.length + this.fxList.length;
  }

  private prepMesh(m: any, order = 22) {
    m.layers.set(1);
    m.renderOrder = order;
    return m;
  }

  private makeRing(inner: number, outer: number, hex: number, opacity = 0.85) {
    const T = this.T;
    const m = new T.Mesh(
      new T.RingGeometry(inner, outer, 36).rotateX(-Math.PI / 2),
      new T.MeshBasicMaterial({color: hex, transparent: true, opacity, side: T.DoubleSide, depthWrite: false}),
    );
    return this.prepMesh(m);
  }

  /** Spawns the full 3D visual & gameplay hitbox behavior for any of the 18 ARPG skills. */
  triggerSkill(def: SkillDef, origin: Vec, forward: Vec, cb: SkillEffectCallbacks, aimPoint?:Vec, dashEnd?:Vec) {
    const fl = Math.hypot(forward[0], forward[2]) || 1;
    const fx = forward[0] / fl, fz = forward[2] / fl;
    const elHex = EL_HEX[def.element] ?? 0xffffff;
    const coreHex = EL_CORE[def.element] ?? 0xffffff;

    if (def.archetype === 'projectile' || def.archetype === 'wave') {
      if(cb.castWall){
        const muzzle:Vec=[origin[0]+fx*.65,origin[1]+.52,origin[2]+fz*.65];
        const wall=cb.castWall([origin[0],origin[1]+.52,origin[2]],muzzle);
        if(wall){cb.onSpawnBurst(wall,def.element,12,1.8);return;}
      }
      this.spawnProjectile(def, origin, [fx, 0, fz], elHex, coreHex, def.archetype === 'wave', aimPoint);
      cb.onSpawnBurst([origin[0] + fx * 0.6, origin[1] + 0.45, origin[2] + fz * 0.6], def.element, 10, 1.8);
      return;
    }

    if (def.archetype === 'sweep') {
      // Water R: 270° giant tidal sweep + double expanding water rings
      this.spawnShockRing(origin, 0.7, def.radius * 1.15, elHex, 0.48);
      this.spawnShockRing([origin[0], origin[1] + 0.28, origin[2]], 0.5, def.radius, coreHex, 0.40);
      cb.onSpawnBurst(origin, def.element, 26, 4.2);
      cb.onSkillHitArea(origin, def, false);
      return;
    }

    if (def.archetype === 'dome') {
      // Water Q: Giant translucent crystal bubble dome + rising bubble swarm
      this.spawnBubbleDome(origin, def, elHex, coreHex, cb);
      return;
    }

    if (def.archetype === 'dash') {
      // Wind E/Q & Fire R: vibrant dash trail ribbons + endpoint cross-burst
      const dist = def.dashDist ?? 4.0;
      const endPos: Vec = dashEnd ?? [origin[0] + fx * dist, origin[1], origin[2] + fz * dist];
      this.spawnDashRibbon(origin, endPos, elHex, coreHex, def.slot === 'Q');
      cb.onSpawnBurst(origin, def.element, 14, 2.5);
      cb.onSpawnBurst(endPos, def.element, def.slot === 'Q' ? 32 : 18, def.slot === 'Q' ? 4.4 : 3.0);
      if (def.slot === 'Q') {
        this.spawnShockRing(endPos, 0.6, def.radius * 1.25, elHex, 0.55);
        this.spawnShockRing([endPos[0], endPos[1] + 0.35, endPos[2]], 0.4, def.radius, coreHex, 0.45);
      }
      const mid: Vec = [(origin[0] + endPos[0]) * 0.5, origin[1], (origin[2] + endPos[2]) * 0.5];
      cb.onSkillHitArea(mid, def, def.slot === 'Q');
      cb.onSkillHitArea(endPos, def, def.slot === 'Q');
      return;
    }

    if (def.archetype === 'vortex') {
      // Wind R: multi-ring spinning emerald tornado
      this.spawnWindVortex(origin, def, elHex, coreHex, cb);
      return;
    }

    if (def.archetype === 'bolt') {
      // Lightning E: targeted sky bolt in front of slime (snaps to nearest target in front if present)
      const aimPos = aimPoint ?? this.findAimPoint(origin, [fx, 0, fz], def.range * 0.65, cb);
      this.spawnLightningBolt(aimPos, 9.5, elHex, coreHex);
      this.spawnShockRing(aimPos, 0.4, def.radius * 1.1, elHex, 0.42);
      cb.onSpawnBurst(aimPos, def.element, 22, 3.4);
      cb.onSkillHitArea(aimPos, def, false);
      return;
    }

    if (def.archetype === 'chain') {
      // Lightning R: bouncing electric arc chain across nearby targets
      this.spawnChainLightning(origin, [fx, 0, fz], def, elHex, coreHex, cb, aimPoint);
      return;
    }

    if (def.archetype === 'storm') {
      // Fire Q (Magma Pillars) & Lightning Q (5-Bolt Thunder Domain)
      const center: Vec = aimPoint ? [...aimPoint] : [origin[0] + fx * def.range, origin[1], origin[2] + fz * def.range];
      const ty = cb.sampleTerrain(center[0], center[2]);
      if (!aimPoint && ty !== null) center[1] = ty;
      this.spawnElementStorm(center, def, elHex, coreHex, cb);
      return;
    }

    if (def.archetype === 'field') {
      // Dark R: Abyssal rotating magic circle + rising dark void wisps ticking over 4s
      const center: Vec = aimPoint ? [...aimPoint] : [origin[0] + fx * def.range, origin[1], origin[2] + fz * def.range];
      const ty = cb.sampleTerrain(center[0], center[2]);
      if (!aimPoint && ty !== null) center[1] = ty;
      this.spawnDarkField(center, def, elHex, coreHex, cb);
      return;
    }

    if (def.archetype === 'meteor') {
      // Dark Q: Giant falling obsidian-violet meteor crashing from the sky
      const target = aimPoint ?? this.findAimPoint(origin, [fx, 0, fz], def.range, cb);
      this.spawnDarkMeteor(target, def, elHex, coreHex, cb);
      return;
    }

    if (def.archetype === 'slam' || def.archetype === 'leap_slam') {
      // Physical E (Heavy Slam) & Q (Skybreaker Quake)
      const impact: Vec = aimPoint ? [...aimPoint] : [origin[0] + fx * (def.range * 0.65), origin[1], origin[2] + fz * (def.range * 0.65)];
      const ty = cb.sampleTerrain(impact[0], impact[2]);
      if (!aimPoint && ty !== null) impact[1] = ty;
      this.spawnPhysicalQuake(impact, def, elHex, coreHex, def.archetype === 'leap_slam');
      cb.onSpawnBurst(impact, def.element, def.archetype === 'leap_slam' ? 36 : 20, def.archetype === 'leap_slam' ? 4.8 : 3.2);
      cb.onSkillHitArea(impact, def, def.archetype === 'leap_slam');
    }
  }

  private findAimPoint(origin: Vec, forward: Vec, dist: number, cb: SkillEffectCallbacks): Vec {
    const targets = cb.getTargetPositions();
    let best: Vec | null = null;
    let bestScore = Infinity;
    for (const tp of targets) {
      const dx = tp[0] - origin[0], dz = tp[2] - origin[2];
      const d = Math.hypot(dx, dz);
      if (d > dist + 3.5 || d < 0.4 || cb.blocked?.(origin,tp)) continue;
      const dot = (dx * forward[0] + dz * forward[2]) / d;
      if (dot > 0.35 && d < bestScore) {
        bestScore = d;
        best = [...tp];
      }
    }
    if (best) return best;
    const x = origin[0] + forward[0] * dist;
    const z = origin[2] + forward[2] * dist;
    const y = cb.sampleTerrain(x, z) ?? origin[1];
    return [x, y, z];
  }

  private spawnProjectile(def: SkillDef, origin: Vec, forward: Vec, elHex: number, coreHex: number, isWave: boolean, aimPoint?:Vec) {
    const T = this.T;
    const g = new T.Group();
    if (isWave) {
      // Giant golden-white vertical crescent sword-qi wave
      const arc = new T.Mesh(
        new T.TorusGeometry(0.95, 0.14, 8, 24, Math.PI * 0.85),
        new T.MeshBasicMaterial({color: coreHex, transparent: true, opacity: 0.95, side: T.DoubleSide, depthWrite: false}),
      );
      arc.rotation.z = -Math.PI * 0.425;
      const aura = new T.Mesh(
        new T.TorusGeometry(0.98, 0.24, 8, 24, Math.PI * 0.9),
        new T.MeshBasicMaterial({color: elHex, transparent: true, opacity: 0.65, side: T.DoubleSide, depthWrite: false}),
      );
      aura.rotation.z = -Math.PI * 0.45;
      g.add(this.prepMesh(aura), this.prepMesh(arc, 23));
      g.rotation.y = Math.atan2(forward[0], forward[2]) + Math.PI * 0.5;
    } else {
      // Elemental magic orb (Water bubble / Fire lava ball / Dark void sphere)
      const rad = def.element === 2 ? 0.32 : 0.28;
      const core = new T.Mesh(
        new T.IcosahedronGeometry(rad * 0.72, 1),
        new T.MeshBasicMaterial({color: coreHex, transparent: true, opacity: 0.96}),
      );
      const shell = new T.Mesh(
        new T.SphereGeometry(rad * 1.18, 14, 12),
        new T.MeshBasicMaterial({color: elHex, transparent: true, opacity: def.element === 0 ? 0.58 : 0.75, depthWrite: false}),
      );
      const halo = new T.Mesh(
        new T.TorusGeometry(rad * 1.55, 0.045, 6, 20),
        new T.MeshBasicMaterial({color: coreHex, transparent: true, opacity: 0.85, depthWrite: false}),
      );
      halo.name = 'orb-halo';
      g.add(this.prepMesh(shell), this.prepMesh(core, 23), this.prepMesh(halo, 24));
    }

    const start: Vec = [origin[0] + forward[0] * 0.65, origin[1] + 0.52, origin[2] + forward[2] * 0.65];
    g.position.set(start[0], start[1], start[2]);
    this.root.add(g);

    const speed = def.projectileSpeed ?? 14;
    this.projectiles.push({
      def,
      pos: start,
      vel: [forward[0]*speed, aimPoint ? speed*(aimPoint[1]+.52-start[1])/Math.max(.4,Math.hypot(aimPoint[0]-start[0],aimPoint[2]-start[2])) : 0, forward[2]*speed],
      age: 0,
      maxAge: Math.max(0.55, def.range / speed),
      mesh: g,
      isWave, aimed: !!aimPoint,
    });
  }

  private spawnShockRing(center: Vec, startR: number, endR: number, hex: number, life = 0.45) {
    const ring = this.makeRing(0.76, 1.0, hex, 0.9);
    ring.position.set(center[0], center[1] + 0.10, center[2]);
    ring.scale.set(startR, 1, startR);
    this.root.add(ring);
    this.fxList.push({
      age: 0,
      life,
      update: (t) => {
        const e = 1 - (1 - t) * (1 - t);
        const r = startR + (endR - startR) * e;
        ring.scale.set(r, 1, r);
        ring.material.opacity = (1 - t) * 0.9;
      },
      dispose: () => {
        ring.removeFromParent();
        ring.geometry.dispose();
        ring.material.dispose();
      },
    });
  }

  private spawnDashRibbon(start: Vec, end: Vec, elHex: number, coreHex: number, isUlt: boolean) {
    const T = this.T;
    const dx = end[0] - start[0], dz = end[2] - start[2];
    const len = Math.max(0.5, Math.hypot(dx, dz));
    const width = isUlt ? 1.5 : 0.85;
    const g = new T.Group();
    const strip = new T.Mesh(
      new T.PlaneGeometry(width, len).rotateX(-Math.PI / 2),
      new T.MeshBasicMaterial({color: elHex, transparent: true, opacity: 0.82, side: T.DoubleSide, depthWrite: false}),
    );
    const core = new T.Mesh(
      new T.PlaneGeometry(width * 0.4, len).rotateX(-Math.PI / 2),
      new T.MeshBasicMaterial({color: coreHex, transparent: true, opacity: 0.92, side: T.DoubleSide, depthWrite: false}),
    );
    core.position.y = 0.04;
    g.add(this.prepMesh(strip), this.prepMesh(core, 23));
    g.position.set((start[0] + end[0]) * 0.5, start[1] + 0.34, (start[2] + end[2]) * 0.5);
    g.rotation.y = Math.atan2(dx, dz);
    this.root.add(g);

    this.fxList.push({
      age: 0,
      life: isUlt ? 0.52 : 0.38,
      update: (t) => {
        const s = 1 - t * 0.45;
        g.scale.set(s, 1, 1);
        strip.material.opacity = (1 - t) * 0.82;
        core.material.opacity = (1 - t) * 0.92;
      },
      dispose: () => {
        g.removeFromParent();
        strip.geometry.dispose(); strip.material.dispose();
        core.geometry.dispose(); core.material.dispose();
      },
    });
  }

  private spawnBubbleDome(origin: Vec, def: SkillDef, elHex: number, coreHex: number, cb: SkillEffectCallbacks) {
    const T = this.T;
    const g = new T.Group();
    g.position.set(origin[0], origin[1] + 0.05, origin[2]);

    const domeGeo = new T.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const domeMat = new T.MeshBasicMaterial({color: elHex, transparent: true, opacity: 0.42, side: T.DoubleSide, depthWrite: false});
    const dome = this.prepMesh(new T.Mesh(domeGeo, domeMat));
    const rim = this.makeRing(0.88, 1.04, coreHex, 0.92);
    rim.position.y = 0.06;
    g.add(dome, rim);

    // 18 rising iridescent bubbles inside the dome
    const bubbles: {m: any; x: number; z: number; spd: number; r: number}[] = [];
    const bGeo = new T.SphereGeometry(0.18, 10, 8);
    const bMat = new T.MeshBasicMaterial({color: coreHex, transparent: true, opacity: 0.78, depthWrite: false});
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + (i % 3) * 0.3;
      const d = 0.6 + ((i * 37) % 100) / 100 * (def.radius * 0.82);
      const bm = this.prepMesh(new T.Mesh(bGeo, bMat), 24);
      const sc = 0.6 + (i % 4) * 0.35;
      bm.scale.setScalar(sc);
      bm.position.set(Math.cos(a) * d, 0.2, Math.sin(a) * d);
      g.add(bm);
      bubbles.push({m: bm, x: Math.cos(a) * d, z: Math.sin(a) * d, spd: 1.8 + (i % 5) * 0.55, r: sc});
    }
    this.root.add(g);

    let burstFired = false;
    this.fxList.push({
      age: 0,
      life: 1.15,
      update: (t, dt) => {
        const expand = Math.min(1, t / 0.35);
        const eased = 1 - (1 - expand) * (1 - expand);
        const curR = 0.6 + (def.radius - 0.6) * eased;
        dome.scale.set(curR, curR * 0.72, curR);
        rim.scale.set(curR, 1, curR);
        domeMat.opacity = t < 0.75 ? 0.38 : (1 - t) / 0.25 * 0.38;
        rim.material.opacity = t < 0.75 ? 0.92 : (1 - t) / 0.25 * 0.92;
        bMat.opacity = (1 - t) * 0.85;
        for (const b of bubbles) {
          b.m.position.y += b.spd * dt;
        }
        if (!burstFired && t >= 0.32) {
          burstFired = true;
          cb.onSpawnBurst(origin, def.element, 36, 4.8);
          cb.onSkillHitArea(origin, def, true);
        }
      },
      dispose: () => {
        g.removeFromParent();
        domeGeo.dispose(); domeMat.dispose();
        rim.geometry.dispose(); rim.material.dispose();
        bGeo.dispose(); bMat.dispose();
      },
    });
  }

  private spawnWindVortex(origin: Vec, def: SkillDef, elHex: number, coreHex: number, cb: SkillEffectCallbacks) {
    const T = this.T;
    const g = new T.Group();
    g.position.set(origin[0], origin[1] + 0.1, origin[2]);

    const rings: any[] = [];
    for (let i = 0; i < 4; i++) {
      const r = 0.9 + i * 0.62;
      const torus = this.prepMesh(new T.Mesh(
        new T.TorusGeometry(r, 0.08 + i * 0.015, 6, 28, Math.PI * 1.45),
        new T.MeshBasicMaterial({color: i % 2 === 0 ? elHex : coreHex, transparent: true, opacity: 0.85, depthWrite: false}),
      ));
      torus.rotation.x = Math.PI / 2;
      torus.position.y = 0.22 + i * 0.55;
      g.add(torus);
      rings.push(torus);
    }
    this.root.add(g);

    let hits = 0;
    const totalHits = def.multiHits ?? 3;
    this.fxList.push({
      age: 0,
      life: def.duration ?? 1.35,
      update: (t, dt) => {
        for (let i = 0; i < rings.length; i++) {
          rings[i].rotation.z += dt * (9 + i * 2.5);
          rings[i].material.opacity = (1 - t * t) * 0.86;
        }
        const expected = Math.floor(t * totalHits) + 1;
        if (hits < Math.min(totalHits, expected)) {
          hits++;
          cb.onSpawnBurst(origin, def.element, 12, 3.0);
          cb.onSkillHitArea(origin, def, false);
        }
      },
      dispose: () => {
        g.removeFromParent();
        for (const r of rings) { r.geometry.dispose(); r.material.dispose(); }
      },
    });
  }

  private spawnLightningBolt(target: Vec, height: number, elHex: number, coreHex: number) {
    const T = this.T;
    const g = new T.Group();
    const pts: any[] = [];
    const segs = 10;
    for (let i = 0; i <= segs; i++) {
      const f = i / segs;
      const jitter = i === 0 || i === segs ? 0 : 0.42;
      pts.push(new T.Vector3(
        target[0] + (Math.random() - 0.5) * jitter,
        target[1] + height * (1 - f),
        target[2] + (Math.random() - 0.5) * jitter,
      ));
    }
    const lineGeo = new T.BufferGeometry().setFromPoints(pts);
    const lineMat = new T.LineBasicMaterial({color: coreHex, transparent: true, opacity: 1});
    const line = this.prepMesh(new T.Line(lineGeo, lineMat), 26);

    const beamGeo = new T.CylinderGeometry(0.14, 0.28, height, 8, 1, true);
    const beamMat = new T.MeshBasicMaterial({color: elHex, transparent: true, opacity: 0.65, side: T.DoubleSide, depthWrite: false});
    const beam = this.prepMesh(new T.Mesh(beamGeo, beamMat), 24);
    beam.position.set(target[0], target[1] + height * 0.5, target[2]);
    g.add(beam, line);
    this.root.add(g);

    this.fxList.push({
      age: 0,
      life: 0.34,
      update: (t) => {
        const flicker = Math.sin(t * 45) > -0.3 ? 1 : 0.35;
        beamMat.opacity = (1 - t) * 0.68 * flicker;
        lineMat.opacity = (1 - t) * flicker;
        beam.scale.set(1 - t * 0.6, 1, 1 - t * 0.6);
      },
      dispose: () => {
        g.removeFromParent();
        lineGeo.dispose(); lineMat.dispose();
        beamGeo.dispose(); beamMat.dispose();
      },
    });
  }

  private spawnChainLightning(origin: Vec, forward: Vec, def: SkillDef, elHex: number, coreHex: number, cb: SkillEffectCallbacks, aimPoint?:Vec) {
    const T = this.T;
    const targets = cb.getTargetPositions();
    const chainPts: Vec[] = [[origin[0], origin[1] + 0.42, origin[2]]];
    const used = new Set<number>();
    let cur = origin;
    const maxLinks = def.chainCount ?? 4;

    for (let k = 0; k < maxLinks; k++) {
      let bestIdx = -1;
      let bestDist = k === 0 ? def.range : def.radius;
      for (let i = 0; i < targets.length; i++) {
        if (used.has(i)||cb.blocked?.(cur,targets[i])) continue;
        const d = Math.hypot(targets[i][0] - cur[0], targets[i][2] - cur[2]);
        if (k===0 && aimPoint && targets[i].every((v,j)=>v===aimPoint[j]) && d<=def.range) { bestIdx=i; break; }
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      if (bestIdx < 0) break;
      used.add(bestIdx);
      const hitPos = targets[bestIdx];
      chainPts.push([hitPos[0], hitPos[1] + 0.55, hitPos[2]]);
      cb.onSpawnBurst(hitPos, def.element, 12, 2.2);
      cb.onSkillHitArea(hitPos, {...def, radius: 1.6}, false);
      cur = hitPos;
    }

    // If no combat target was nearby, arc forward so the player always sees crackling lightning!
    if (chainPts.length === 1) {
      const end: Vec = [origin[0] + forward[0] * 5.2, origin[1] + 0.45, origin[2] + forward[2] * 5.2];
      chainPts.push(end);
      cb.onSpawnBurst(end, def.element, 16, 2.6);
      if(!cb.blocked?.(origin,end)) cb.onSkillHitArea(end, {...def, radius: 2.2}, false);
    }

    const zigPts: any[] = [];
    for (let i = 0; i < chainPts.length - 1; i++) {
      const a = chainPts[i], b = chainPts[i + 1];
      const steps = 8;
      for (let s = 0; s <= steps; s++) {
        const f = s / steps;
        const j = s === 0 || s === steps ? 0 : 0.24;
        zigPts.push(new T.Vector3(
          a[0] + (b[0] - a[0]) * f + (Math.random() - 0.5) * j,
          a[1] + (b[1] - a[1]) * f + (Math.random() - 0.5) * j,
          a[2] + (b[2] - a[2]) * f + (Math.random() - 0.5) * j,
        ));
      }
    }
    const geo = new T.BufferGeometry().setFromPoints(zigPts);
    const mat = new T.LineBasicMaterial({color: coreHex, transparent: true, opacity: 1});
    const line = this.prepMesh(new T.Line(geo, mat), 26);
    this.root.add(line);
    this.spawnShockRing(chainPts[chainPts.length - 1], 0.3, 1.8, elHex, 0.32);

    this.fxList.push({
      age: 0,
      life: 0.38,
      update: (t) => { mat.opacity = (1 - t) * (Math.sin(t * 50) > -0.3 ? 1 : 0.4); },
      dispose: () => { line.removeFromParent(); geo.dispose(); mat.dispose(); },
    });
  }

  private spawnElementStorm(center: Vec, def: SkillDef, elHex: number, coreHex: number, cb: SkillEffectCallbacks) {
    const T = this.T;
    const g = new T.Group();
    g.position.set(center[0], center[1] + 0.12, center[2]);
    const outer = this.makeRing(def.radius * 0.88, def.radius, elHex, 0.85);
    const inner = this.makeRing(def.radius * 0.45, def.radius * 0.54, coreHex, 0.78);
    g.add(outer, inner);
    this.root.add(g);

    const isFire = def.element === 2;
    const totalStrikes = def.multiHits ?? 4;
    let struck = 0;

    this.fxList.push({
      age: 0,
      life: def.duration ?? 1.5,
      update: (t, dt) => {
        outer.rotation.z += dt * 1.6;
        inner.rotation.z -= dt * 2.4;
        const fade = t > 0.78 ? (1 - t) / 0.22 : 1;
        outer.material.opacity = 0.85 * fade;
        inner.material.opacity = 0.78 * fade;

        const want = Math.floor(t * totalStrikes) + 1;
        if (struck < Math.min(totalStrikes, want)) {
          const idx = struck++;
          const ang = (idx / totalStrikes) * Math.PI * 2 + 0.4;
          const dist = idx === 0 ? 0 : def.radius * 0.52;
          const sx = center[0] + Math.cos(ang) * dist;
          const sz = center[2] + Math.sin(ang) * dist;
          const sy = cb.sampleTerrain(sx, sz) ?? center[1];
          const spot: Vec = [sx, sy, sz];
          if (isFire) {
            this.spawnFirePillar(spot, elHex, coreHex);
          } else {
            this.spawnLightningBolt(spot, 10.5, elHex, coreHex);
          }
          this.spawnShockRing(spot, 0.4, 2.4, elHex, 0.36);
          cb.onSpawnBurst(spot, def.element, 18, 3.6);
          cb.onSkillHitArea(spot, {...def, radius: def.radius * 0.62, damage: Math.round(def.damage / totalStrikes * 1.4)}, idx === 0);
        }
      },
      dispose: () => {
        g.removeFromParent();
        outer.geometry.dispose(); outer.material.dispose();
        inner.geometry.dispose(); inner.material.dispose();
      },
    });
  }

  private spawnFirePillar(spot: Vec, elHex: number, coreHex: number) {
    const T = this.T;
    const g = new T.Group();
    g.position.set(spot[0], spot[1], spot[2]);
    const outer = this.prepMesh(new T.Mesh(
      new T.CylinderGeometry(0.65, 1.05, 4.8, 12, 1, true).translate(0, 2.4, 0),
      new T.MeshBasicMaterial({color: elHex, transparent: true, opacity: 0.76, side: T.DoubleSide, depthWrite: false}),
    ));
    const core = this.prepMesh(new T.Mesh(
      new T.CylinderGeometry(0.28, 0.55, 4.5, 10, 1, true).translate(0, 2.25, 0),
      new T.MeshBasicMaterial({color: coreHex, transparent: true, opacity: 0.9, side: T.DoubleSide, depthWrite: false}),
    ), 24);
    g.add(outer, core);
    this.root.add(g);

    this.fxList.push({
      age: 0,
      life: 0.52,
      update: (t, dt) => {
        g.rotation.y += dt * 7;
        const grow = Math.min(1, t / 0.22);
        const shrink = 1 - Math.max(0, (t - 0.45) / 0.55);
        g.scale.set(0.6 + 0.5 * shrink, grow * (0.4 + 0.6 * shrink), 0.6 + 0.5 * shrink);
        outer.material.opacity = 0.76 * shrink;
        core.material.opacity = 0.9 * shrink;
      },
      dispose: () => {
        g.removeFromParent();
        outer.geometry.dispose(); outer.material.dispose();
        core.geometry.dispose(); core.material.dispose();
      },
    });
  }

  private spawnDarkField(center: Vec, def: SkillDef, elHex: number, coreHex: number, cb: SkillEffectCallbacks) {
    const T = this.T;
    const g = new T.Group();
    g.position.set(center[0], center[1] + 0.12, center[2]);
    const disk = this.prepMesh(new T.Mesh(
      new T.CircleGeometry(def.radius, 32).rotateX(-Math.PI / 2),
      new T.MeshBasicMaterial({color: 0x180e2b, transparent: true, opacity: 0.62, side: T.DoubleSide, depthWrite: false}),
    ));
    const ring = this.makeRing(def.radius * 0.86, def.radius, coreHex, 0.88);
    ring.position.y = 0.03;
    const coreOrb = this.prepMesh(new T.Mesh(
      new T.OctahedronGeometry(0.42, 0),
      new T.MeshBasicMaterial({color: elHex, transparent: true, opacity: 0.88}),
    ), 24);
    coreOrb.position.y = 0.75;
    g.add(disk, ring, coreOrb);
    this.root.add(g);

    let ticks = 0;
    const totalTicks = def.multiHits ?? 5;
    this.fxList.push({
      age: 0,
      life: def.duration ?? 4.0,
      update: (t, dt) => {
        ring.rotation.z += dt * 2.2;
        coreOrb.rotation.y += dt * 4.5;
        coreOrb.position.y = 0.72 + Math.sin(t * 14) * 0.15;
        const fade = t > 0.82 ? (1 - t) / 0.18 : 1;
        disk.material.opacity = 0.62 * fade;
        ring.material.opacity = 0.88 * fade;
        coreOrb.material.opacity = 0.88 * fade;

        const want = Math.floor(t * totalTicks) + 1;
        if (ticks < Math.min(totalTicks, want)) {
          ticks++;
          cb.onSpawnBurst(center, def.element, 10, 2.5);
          cb.onSkillHitArea(center, def, false);
        }
      },
      dispose: () => {
        g.removeFromParent();
        disk.geometry.dispose(); disk.material.dispose();
        ring.geometry.dispose(); ring.material.dispose();
        coreOrb.geometry.dispose(); coreOrb.material.dispose();
      },
    });
  }

  private spawnDarkMeteor(target: Vec, def: SkillDef, elHex: number, coreHex: number, cb: SkillEffectCallbacks) {
    const T = this.T;
    const warn = this.makeRing(def.radius * 0.85, def.radius, coreHex, 0.85);
    warn.position.set(target[0], target[1] + 0.12, target[2]);
    this.root.add(warn);

    const meteor = new T.Group();
    const rock = this.prepMesh(new T.Mesh(
      new T.DodecahedronGeometry(1.15, 0),
      new T.MeshStandardMaterial({color: 0x261542, emissive: elHex, emissiveIntensity: 0.75, roughness: 0.6}),
    ), 25);
    const halo = this.prepMesh(new T.Mesh(
      new T.TorusGeometry(1.45, 0.12, 8, 24),
      new T.MeshBasicMaterial({color: coreHex, transparent: true, opacity: 0.88, depthWrite: false}),
    ), 26);
    meteor.add(rock, halo);
    const startPos: Vec = [target[0] - 2.6, target[1] + 10.5, target[2] - 2.0];
    meteor.position.set(...startPos);
    this.root.add(meteor);

    let impacted = false;
    this.fxList.push({
      age: 0,
      life: 1.05,
      update: (t, dt) => {
        rock.rotation.x += dt * 4.5;
        rock.rotation.y += dt * 6.0;
        halo.rotation.z -= dt * 7.0;
        const fallT = Math.min(1, t / 0.48);
        const easeFall = fallT * fallT;
        if (!impacted) {
          meteor.position.set(
            startPos[0] + (target[0] - startPos[0]) * easeFall,
            startPos[1] + (target[1] + 0.65 - startPos[1]) * easeFall,
            startPos[2] + (target[2] - startPos[2]) * easeFall,
          );
          if (fallT >= 1) {
            impacted = true;
            meteor.visible = false;
            this.spawnShockRing(target, 0.8, def.radius * 1.2, elHex, 0.52);
            this.spawnShockRing([target[0], target[1] + 0.25, target[2]], 0.5, def.radius * 0.95, coreHex, 0.42);
            cb.onSpawnBurst(target, def.element, 40, 5.2);
            cb.onSkillHitArea(target, def, true);
          }
        }
        warn.material.opacity = impacted ? Math.max(0, (1 - (t - 0.48) / 0.52) * 0.85) : 0.85;
      },
      dispose: () => {
        warn.removeFromParent(); warn.geometry.dispose(); warn.material.dispose();
        meteor.removeFromParent(); rock.geometry.dispose(); rock.material.dispose();
        halo.geometry.dispose(); halo.material.dispose();
      },
    });
  }

  private spawnPhysicalQuake(center: Vec, def: SkillDef, elHex: number, coreHex: number, isUlt: boolean) {
    this.spawnShockRing(center, 0.5, def.radius * (isUlt ? 1.25 : 1.0), elHex, isUlt ? 0.58 : 0.40);
    this.spawnShockRing([center[0], center[1] + 0.24, center[2]], 0.35, def.radius * 0.85, coreHex, isUlt ? 0.48 : 0.32);

    // Rising stone spikes ringing the quake impact
    const T = this.T;
    const g = new T.Group();
    g.position.set(center[0], center[1], center[2]);
    const count = isUlt ? 12 : 6;
    const spikeGeo = new T.ConeGeometry(isUlt ? 0.28 : 0.20, isUlt ? 1.35 : 0.85, 5).translate(0, isUlt ? 0.65 : 0.4, 0);
    const spikeMat = new T.MeshStandardMaterial({color: 0xb89c6e, emissive: 0x6b5224, emissiveIntensity: 0.35, roughness: 0.85});
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const dist = def.radius * (isUlt ? 0.68 : 0.6);
      const sp = this.prepMesh(new T.Mesh(spikeGeo, spikeMat), 22);
      sp.position.set(Math.cos(a) * dist, 0, Math.sin(a) * dist);
      sp.rotation.z = -Math.cos(a) * 0.28;
      sp.rotation.x = Math.sin(a) * 0.28;
      g.add(sp);
    }
    this.root.add(g);

    this.fxList.push({
      age: 0,
      life: isUlt ? 0.72 : 0.48,
      update: (t) => {
        const rise = Math.min(1, t / 0.16);
        const sink = t > 0.55 ? 1 - (t - 0.55) / 0.45 : 1;
        g.scale.set(1, Math.max(0.01, rise * sink), 1);
      },
      dispose: () => {
        g.removeFromParent();
        spikeGeo.dispose();
        spikeMat.dispose();
      },
    });
  }

  update(dt: number, cb: SkillEffectCallbacks) {
    // 1. Step active projectiles & waves
    const targets = cb.getTargetPositions();
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const from:Vec=[...p.pos];
      p.age += dt;
      p.pos[0] += p.vel[0] * dt;
      p.pos[2] += p.vel[2] * dt;
      p.pos[1] += p.vel[1] * dt;
      const ty = cb.sampleTerrain(p.pos[0], p.pos[2]);
      if (!p.aimed && ty !== null) p.pos[1] = Math.max(ty + 0.45, p.pos[1] + (ty + 0.5 - p.pos[1]) * Math.min(1, dt * 8));
      const wall = cb.castWall?.(from,p.pos);
      if(wall)p.pos=wall;
      p.mesh.position.set(p.pos[0], p.pos[1], p.pos[2]);
      const halo = p.mesh.getObjectByName('orb-halo');
      if (halo) { halo.rotation.x += dt * 7; halo.rotation.y += dt * 5; }

      let hitTarget = false;
      for (const tp of targets) {
        const heightGap = cb.castWall ? tp[1]+.52-p.pos[1] : 0;
        if (Math.hypot(tp[0] - p.pos[0], heightGap, tp[2] - p.pos[2]) < (p.isWave ? 1.5 : 1.05)) {
          hitTarget = true;
          break;
        }
      }
      if (wall || hitTarget || p.age >= p.maxAge) {
        const elHex = EL_HEX[p.def.element] ?? 0xffffff;
        this.spawnShockRing(p.pos, 0.35, p.def.radius, elHex, 0.36);
        cb.onSpawnBurst(p.pos, p.def.element, 20, 3.2);
        if (!wall) cb.onSkillHitArea(p.pos, p.def, false);
        p.mesh.removeFromParent();
        p.mesh.traverse((n: any) => { n.geometry?.dispose?.(); n.material?.dispose?.(); });
        this.projectiles.splice(i, 1);
      }
    }

    // 2. Step timed 3D effects
    for (let i = this.fxList.length - 1; i >= 0; i--) {
      const fx = this.fxList[i];
      fx.age += dt;
      const t = Math.min(1, fx.age / fx.life);
      fx.update(t, dt);
      if (fx.age >= fx.life) {
        fx.dispose();
        this.fxList.splice(i, 1);
      }
    }
  }

  reset() {
    for (const p of this.projectiles) {
      p.mesh.removeFromParent();
      p.mesh.traverse((n: any) => { n.geometry?.dispose?.(); n.material?.dispose?.(); });
    }
    this.projectiles.length = 0;
    for (const fx of this.fxList) fx.dispose();
    this.fxList.length = 0;
  }

  dispose() {
    this.reset();
    this.root.removeFromParent();
  }
}
