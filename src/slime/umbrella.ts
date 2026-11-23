import {elements} from './elements';
import {clamp, mix, smooth, type ShotView, type Vec} from './types';

/**
 * UE USlimeUmbrellaComponent port (metres, Y-up).
 * Parameters mirror UE defaults:
 *  - FallSpeed = 180 cm/s -> 1.8 m/s
 *  - BrakeSeconds = 0.28 s
 *  - GlideAirControl = 0.65
 *  - OpenSeconds = 0.28 s, CloseSeconds = 0.22 s
 *  - CanopyRadiusRatio = 1.2 (shared by main body & returning mini-slime shots)
 *  - ShotOpenHeight = 120 cm -> 1.2 m
 */
export const UMBRELLA = {
  fallSpeed: 1.8,
  brakeSeconds: 0.28,
  glideAirControl: 0.65,
  openSeconds: 0.28,
  closeSeconds: 0.22,
  canopyRadiusRatio: 1.2,
  shotOpenHeight: 1.2,
  shotFollowSpeed: 4.2,
  shotFallSpeed: 1.8,
  shotMaxFallSpeed: 2.6,
};

/** Pure state machine so physics and tests can run without Three.js. */
export class UmbrellaLogic {
  open = false;
  openAmount = 0;
  private brakeStart = -1;
  private brakeInitialSpeed = UMBRELLA.fallSpeed;

  canUse(grounded: boolean, clinging: boolean, swimming: boolean): boolean {
    return !grounded && !clinging && !swimming;
  }

  toggle(grounded: boolean, clinging: boolean, swimming: boolean, jumps: number, maxJumps = 2): boolean {
    if (!this.canUse(grounded, clinging, swimming)) return false;
    if (!this.open && jumps < maxJumps) return false;
    if (this.open) {
      this.cancel();
    } else {
      this.open = true;
      this.brakeStart = -1;
    }
    return true;
  }

  cancel(immediate = false) {
    this.open = false;
    this.brakeStart = -1;
    if (immediate) this.openAmount = 0;
  }

  /** Step open/close animation and arm braking once downward fall begins. */
  step(dt: number, now: number, vy: number, grounded: boolean, clinging: boolean, swimming: boolean) {
    if (this.open && !this.canUse(grounded, clinging, swimming)) this.cancel();
    if (this.open && vy <= 0 && this.brakeStart < 0) {
      this.brakeStart = now;
      this.brakeInitialSpeed = Math.max(UMBRELLA.fallSpeed, -vy);
    }
    const rate = 1 / Math.max(this.open ? UMBRELLA.openSeconds : UMBRELLA.closeSeconds, 0.01);
    const target = this.open ? 1 : 0;
    this.openAmount = this.openAmount < target
      ? Math.min(target, this.openAmount + rate * dt)
      : Math.max(target, this.openAmount - rate * dt);
  }

  /** Clamps downward speed smoothly over BrakeSeconds without adding upward lift. */
  limitFallVelocity(vy: number, now: number): number {
    if (!this.open || vy >= 0 || this.brakeStart < 0) return vy;
    const t = clamp((now - this.brakeStart) / Math.max(UMBRELLA.brakeSeconds, 0.01), 0, 1);
    const limit = mix(this.brakeInitialSpeed, Math.max(UMBRELLA.fallSpeed, 0.3), smooth(t));
    return Math.max(vy, -limit);
  }
}

interface UmbrellaRig {
  root: any;
  canopy: any;
  ribs: any[];
  trim: any;
  matCanopy: any;
  matAccent: any;
  element: number;
  amount: number;
}

const ELEMENT_PALETTE: {canopy: number; accent: number; pole: number; opacity: number; emissive: number}[] = [
  {canopy: 0x62c7f2, accent: 0xdff7ff, pole: 0x5c7c8c, opacity: 0.86, emissive: 0x164a66}, // 水
  {canopy: 0x6ee3b5, accent: 0xeafff4, pole: 0x5d7a64, opacity: 0.88, emissive: 0x16523b}, // 风
  {canopy: 0xf27052, accent: 0xffe29a, pole: 0x733a2c, opacity: 0.94, emissive: 0x661e0c}, // 火
  {canopy: 0x9b7eff, accent: 0xe9dcff, pole: 0x4f4478, opacity: 0.88, emissive: 0x321c70}, // 雷
  {canopy: 0x434873, accent: 0xb6b8ff, pole: 0x2a2c44, opacity: 0.92, emissive: 0x1c1e3b}, // 暗
  {canopy: 0xf2bd63, accent: 0xfff5d6, pole: 0x85663e, opacity: 0.90, emissive: 0x573b10}, // 物
];

/**
 * 3D procedural UE-style elemental umbrella renderer (supports main body id=0 + up to 5 returning mini-slimes).
 * Uses the scene's shared Three.js namespace; no external skeletal asset needed.
 */
export class SlimeUmbrellaView {
  private rigs = new Map<number, UmbrellaRig>();
  private T: any;

  constructor(private ctx: any) {
    this.T = ctx.THREE;
  }

  private buildRig(element: number): UmbrellaRig {
    const T = this.T;
    const pal = ELEMENT_PALETTE[clamp(element, 0, 5)] ?? ELEMENT_PALETTE[0];
    const root = new T.Group();
    root.name = 'SlimeUmbrella';

    const matPole = new T.MeshStandardMaterial({color: pal.pole, roughness: 0.55, metalness: 0.15});
    const matAccent = new T.MeshStandardMaterial({color: pal.accent, roughness: 0.35, metalness: 0.1, emissive: pal.emissive, emissiveIntensity: 0.28});
    const matCanopy = new T.MeshStandardMaterial({
      color: pal.canopy, roughness: 0.32, metalness: 0.05,
      emissive: pal.emissive, emissiveIntensity: 0.22,
      transparent: true, opacity: pal.opacity, side: T.DoubleSide,
    });

    // Pole & curved handle (base at y = 0 where it meets top of slime)
    const pole = new T.Mesh(new T.CylinderGeometry(0.014, 0.016, 0.56, 8), matPole);
    pole.position.y = 0.26;
    pole.castShadow = true;
    root.add(pole);

    const finial = new T.Mesh(new T.SphereGeometry(0.036, 10, 8), matAccent);
    finial.position.y = 0.565;
    root.add(finial);

    const canopy = new T.Group();
    canopy.position.y = 0.52;
    root.add(canopy);

    // 8-petal domed umbrella canopy built around articulated ribs
    const ribs: any[] = [];
    const petals = 8;
    const petalGeo = new T.ConeGeometry(0.24, 0.52, 4, 1, true);
    petalGeo.rotateX(Math.PI * 0.5);
    petalGeo.translate(0, 0, 0.25);
    const ribGeo = new T.CylinderGeometry(0.007, 0.009, 0.50, 6);
    ribGeo.rotateX(Math.PI * 0.5);
    ribGeo.translate(0, 0, 0.25);

    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;
      const pivot = new T.Group();
      pivot.rotation.y = a;

      const rib = new T.Mesh(ribGeo, matPole);
      rib.position.y = -0.01;
      pivot.add(rib);

      const panel = new T.Mesh(
        new T.CircleGeometry(0.50, 3, -Math.PI / petals, (Math.PI * 2) / petals),
        matCanopy,
      );
      panel.rotation.x = -Math.PI / 2;
      panel.rotation.z = Math.PI / 2;
      panel.castShadow = true;
      pivot.add(panel);

      const tip = new T.Mesh(new T.SphereGeometry(0.018, 6, 6), matAccent);
      tip.position.set(0, -0.02, 0.495);
      pivot.add(tip);

      canopy.add(pivot);
      ribs.push(pivot);
    }

    // Soft glowing dome cap + scalloped edge ring
    const crown = new T.Mesh(
      new T.SphereGeometry(0.50, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.36),
      matCanopy,
    );
    crown.position.y = -0.355;
    crown.castShadow = true;
    canopy.add(crown);

    const trim = new T.Mesh(new T.TorusGeometry(0.475, 0.014, 6, 24), matAccent);
    trim.rotation.x = Math.PI / 2;
    trim.position.y = -0.14;
    canopy.add(trim);

    root.traverse((m: any) => {
      if (m.isMesh) m.layers.set(1);
    });
    this.ctx.scene.add(root);
    return {root, canopy, ribs, trim, matCanopy, matAccent, element, amount: 0};
  }

  private applyElement(rig: UmbrellaRig, element: number) {
    if (rig.element === element) return;
    rig.element = element;
    const pal = ELEMENT_PALETTE[clamp(element, 0, 5)] ?? ELEMENT_PALETTE[0];
    rig.matCanopy.color.setHex(pal.canopy);
    rig.matCanopy.emissive.setHex(pal.emissive);
    rig.matCanopy.opacity = pal.opacity;
    rig.matAccent.color.setHex(pal.accent);
    rig.matAccent.emissive.setHex(pal.emissive);
    // Keep slight tint coherence with element palette
    if (elements[element]) rig.matCanopy.color.lerp(new this.T.Color(elements[element].color), 0.25);
  }

  private updateOne(id: number, wanted: boolean, base: Vec, radius: number, velocity: Vec, element: number, dt: number, time: number, forcedAmount?: number) {
    let rig = this.rigs.get(id);
    if (forcedAmount !== undefined) {
      if (forcedAmount <= 0.001) {
        if (rig) rig.root.visible = false;
        return;
      }
      if (!rig) { rig = this.buildRig(element); this.rigs.set(id, rig); }
      rig.amount = forcedAmount;
    } else {
      const rate = 1 / Math.max(wanted ? UMBRELLA.openSeconds : UMBRELLA.closeSeconds, 0.01);
      const prev = rig?.amount ?? 0;
      const next = wanted ? Math.min(1, prev + rate * dt) : Math.max(0, prev - rate * dt);
      if (next <= 0.001) {
        if (rig) { rig.amount = 0; rig.root.visible = false; }
        return;
      }
      if (!rig) { rig = this.buildRig(element); this.rigs.set(id, rig); }
      rig.amount = next;
    }

    this.applyElement(rig, element);
    rig.root.visible = true;
    const eased = smooth(rig.amount);
    const sway = rig.amount >= 0.99 ? Math.sin(time * 3.4 + id * 1.1) * 0.045 : 0;

    // UE canopy reference radius is 0.50 m; scale = radius * CanopyRadiusRatio / 0.50
    const worldScale = (Math.max(radius, 0.08) * UMBRELLA.canopyRadiusRatio) / 0.5;
    rig.root.position.set(base[0], base[1], base[2]);
    rig.root.scale.setScalar(worldScale * mix(0.45, 1, eased));

    // Tilt subtly into velocity (max ±10 deg, matching UE Tilt clamp)
    const tiltX = clamp(velocity[2] / 24, -0.175, 0.175) + sway * 0.6;
    const tiltZ = clamp(-velocity[0] / 24, -0.175, 0.175) + Math.cos(time * 2.7 + id) * sway;
    rig.root.rotation.set(tiltX, time * 0.25 + id * 0.7, tiltZ);

    // Articulate ribs from folded down (+1.18 rad) to open (+0.28 rad)
    const ribAngle = mix(1.18, 0.26, eased);
    for (const pivot of rig.ribs) pivot.rotation.x = ribAngle;
    const canopySpread = mix(0.24, 1, eased);
    rig.canopy.scale.set(canopySpread, mix(1.25, 1, eased), canopySpread);
    rig.trim.visible = eased > 0.45;
  }

  update(
    dt: number,
    time: number,
    element: number,
    bodyOpen: boolean,
    bodyAmount: number,
    bodyBase: Vec,
    bodyRadius: number,
    bodyVelocity: Vec,
    shots: ShotView[],
  ) {
    const alive = new Set<number>([0]);
    this.updateOne(0, bodyOpen, bodyBase, bodyRadius, bodyVelocity, element, dt, time, bodyAmount);
    for (const s of shots) {
      alive.add(s.id);
      this.updateOne(
        s.id,
        !!s.umbrella,
        [s.center[0], s.center[1] + s.radius * 0.65, s.center[2]],
        s.radius,
        [0, 0, 0],
        element,
        dt,
        time,
      );
    }
    for (const [id, rig] of this.rigs) {
      if (!alive.has(id)) {
        this.disposeRig(rig);
        this.rigs.delete(id);
      }
    }
  }

  reset() {
    for (const rig of this.rigs.values()) rig.root.visible = false;
  }

  private disposeRig(rig: UmbrellaRig) {
    rig.root.removeFromParent();
    const geos = new Set<any>(), mats = new Set<any>();
    rig.root.traverse((m: any) => {
      if (m.isMesh) { geos.add(m.geometry); mats.add(m.material); }
    });
    for (const g of geos) g.dispose();
    for (const m of mats) m.dispose();
  }

  dispose() {
    for (const rig of this.rigs.values()) this.disposeRig(rig);
    this.rigs.clear();
  }
}
