import {climateMaterial} from './climate-material';
import {gatePalette, type Gate} from '../game/mode-gates';
import {Vec} from '../slime/types';
import {PortalSlot, pillarOffset} from './layout';
import {
  calibratePortalColors,
  createPortalArchRibbons,
  createPortalFloorAura,
  createPortalMembraneMaterial,
  PORTAL_ARCH_H,
  PORTAL_ARCH_W,
  PORTAL_BASE,
  PORTAL_STEP_TOP,
  type PortalVfxUniforms,
} from './portal-vfx';

/** Three chapter arches and three mode arches, all facing the lectern. */
export class TimePortal {
  readonly group: any;
  gate: Gate | null = null;
  hover = 0;
  private open = 0;
  private disc: any;
  private ribbon: any;
  private floorAura: any;
  private uniforms: PortalVfxUniforms;
  private keystone: any;
  private keystoneGems: any[] = [];
  private lamps: any[] = [];
  private emblemGroup: any = null;
  private emblemHalo: any = null;
  private glow: any;
  private T: any;
  private tokens: any[] = [];

  get openLevel() { return this.open; }
  get rimColor() { return this.uniforms.uRim.value; }

  constructor(private ctx: any, readonly slot: PortalSlot) {
    const T = this.T = ctx.THREE, toon = ctx.mats.toon;
    const g = this.group = new T.Group();
    g.name = `time-portal-${slot.slot}`;
    g.userData.skipHeightBake = true;
    g.position.fromArray(slot.position);
    g.rotation.y = slot.yaw;

    const stone = toon(0xc2cac1, {roughness: 0.78});
    const dark = toon(0x6d7f7b, {roughness: 0.82});
    const timber = toon(0x6a4b38, {roughness: 0.76});
    const bronze = new T.MeshStandardMaterial({color: 0xc9a362, roughness: 0.34, metalness: 0.58});

    // Non-overlapping stacked geometry so zero faces are coplanar (prevents Z-fighting flicker).
    const plinth = new T.Mesh(new T.CylinderGeometry(1.5, 1.62, PORTAL_BASE, 32), dark);
    plinth.position.y = PORTAL_BASE / 2;
    g.add(plinth);
    const top = new T.Mesh(new T.CylinderGeometry(1.32, 1.38, .06, 32), stone);
    top.position.y = PORTAL_BASE + .03;
    g.add(top);

    const stepTop = PORTAL_STEP_TOP;
    const footH = .16, capH = .14, capCenterY = PORTAL_BASE + PORTAL_ARCH_H;
    const pillarBottom = stepTop + footH;
    const pillarTop = capCenterY - capH / 2;
    const pillarH = pillarTop - pillarBottom;
    for (const side of [-1, 1]) {
      const px = side * pillarOffset;
      const foot = new T.Mesh(new T.BoxGeometry(.54, footH, .54), dark);
      foot.position.set(px, stepTop + footH / 2, 0);
      g.add(foot);
      // Bronze collar seated cleanly above foot & below cap (zero coplanar overlap)
      const baseCollar = new T.Mesh(new T.BoxGeometry(.44, .05, .44), bronze);
      baseCollar.position.set(px, pillarBottom + .025, 0);
      g.add(baseCollar);
      const p = new T.Mesh(new T.BoxGeometry(.36, pillarH - .10, .36), timber);
      p.position.set(px, pillarBottom + .05 + (pillarH - .10) / 2, 0);
      g.add(p);
      const topCollar = new T.Mesh(new T.BoxGeometry(.44, .05, .44), bronze);
      topCollar.position.set(px, pillarTop - .025, 0);
      g.add(topCollar);
      const cap = new T.Mesh(new T.BoxGeometry(.54, capH, .54), dark);
      cap.position.set(px, capCenterY, 0);
      g.add(cap);
    }

    const arch = new T.Mesh(new T.TorusGeometry(pillarOffset, .2, 12, 36, Math.PI), stone);
    arch.position.y = PORTAL_BASE + PORTAL_ARCH_H;
    g.add(arch);

    // Keystone depth (0.58) clears beam depth (0.44) front & back so no coplanar faces flicker.
    this.keystone = new T.Mesh(new T.BoxGeometry(.46, .5, .58), toon(0xd4c7ab));
    this.keystone.position.y = PORTAL_BASE + PORTAL_ARCH_H + pillarOffset;
    g.add(this.keystone);
    // Inset luminous crystal rune gems on front & back of keystone (strictly clear of z = ±0.29)
    const gemGeo = new T.OctahedronGeometry(.11, 0);
    for (const zs of [-1, 1]) {
      const gemMat = new T.MeshStandardMaterial({
        color: 0xffffff, emissive: 0x7ff2e2, emissiveIntensity: 2.2, roughness: 0.15, metalness: 0.25,
      });
      const gem = new T.Mesh(gemGeo, gemMat);
      gem.scale.set(0.85, 1.35, 0.35);
      gem.position.set(0, PORTAL_BASE + PORTAL_ARCH_H + pillarOffset, zs * 0.335);
      gem.layers.set(1);
      g.add(gem);
      this.keystoneGems.push(gem);
    }

    // One solid curved roof with a continuous ridge and lifted eaves.
    const profile = new T.Shape();
    profile.moveTo(-1.70, .04); profile.quadraticCurveTo(-1.15, -.17, 0, .24);
    profile.quadraticCurveTo(1.15, -.17, 1.70, .04); profile.lineTo(1.70, .16);
    profile.quadraticCurveTo(1.12, .03, 0, .43); profile.quadraticCurveTo(-1.12, .03, -1.70, .16); profile.closePath();
    const roof = new T.Mesh(new T.ExtrudeGeometry(profile, {depth: .96, bevelEnabled: false}), toon(0x4a6660));
    climateMaterial(roof.material, 'structure');
    roof.position.set(0, 4.11, -.48);
    g.add(roof);
    const beam = new T.Mesh(new T.BoxGeometry(2.68, .20, .44), timber);
    beam.position.set(0, 4.00, 0);
    g.add(beam);

    // Warm HDR glowing eaves lanterns with bronze caps & gentle wind sway
    for (const side of [-1, 1]) {
      const piv = new T.Group();
      piv.position.set(side * 1.39, 4.02, .09);
      const cord = new T.Mesh(new T.CylinderGeometry(.014, .014, .12, 6), bronze);
      cord.position.y = -.06;
      const capTop = new T.Mesh(new T.CylinderGeometry(.08, .10, .04, 10), bronze);
      capTop.position.y = -.13;
      const lamp = new T.Mesh(
        new T.SphereGeometry(.14, 12, 8),
        new T.MeshStandardMaterial({
          color: 0xffd79a, emissive: 0xff9a3c, emissiveIntensity: 1.55, roughness: 0.42,
        }),
      );
      lamp.scale.y = 1.24;
      lamp.position.y = -.28;
      const capBot = new T.Mesh(new T.CylinderGeometry(.07, .05, .04, 10), bronze);
      capBot.position.y = -.44;
      piv.add(cord, capTop, lamp, capBot);
      g.add(piv);
      this.lamps.push(piv);
    }

    g.traverse((m: any) => {
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
    });

    // ---- UE-Style Multi-Layer HDR Portal VFX ----
    const shape = new T.Shape();
    shape.moveTo(-PORTAL_ARCH_W, stepTop);
    shape.lineTo(PORTAL_ARCH_W, stepTop);
    shape.lineTo(PORTAL_ARCH_W, PORTAL_BASE + PORTAL_ARCH_H);
    shape.absarc(0, PORTAL_BASE + PORTAL_ARCH_H, PORTAL_ARCH_W, 0, Math.PI, false);
    shape.lineTo(-PORTAL_ARCH_W, stepTop);

    const opaqueTex = ctx.pipeline?.water?.tOpaqueColor?.value ?? null;
    const {material: discMat, uniforms} = createPortalMembraneMaterial(opaqueTex);
    this.uniforms = uniforms;
    this.disc = new T.Mesh(new T.ShapeGeometry(shape, 32), discMat);
    this.disc.name = 'fx-portal-membrane';
    this.disc.layers.set(1);
    this.disc.renderOrder = 5;
    g.add(this.disc);

    this.ribbon = createPortalArchRibbons(this.uniforms);
    g.add(this.ribbon);

    this.floorAura = createPortalFloorAura(this.uniforms);
    g.add(this.floorAura);

    this.glow = ctx.mats.glowSprite(0xffffff, 3.4, 0);
    this.glow.position.set(0, PORTAL_BASE + 1.75, .08);
    g.add(this.glow);

    this.addEmblem(g);
    ctx.scene.add(g);
  }

  private addEmblem(parent: any) {
    const T = this.T, slot = this.slot.slot;
    if (slot < 3) return;
    const group = new T.Group();
    group.name = 'fx-mode-symbol';
    group.userData.walkThrough = true;
    group.position.set(0, 2.08, .28);
    parent.add(group);
    this.emblemGroup = group;

    // Delicate luminous gilded halo framing the floating mode emblem
    const halo = new T.Mesh(
      new T.TorusGeometry(.56, .018, 8, 36),
      new T.MeshStandardMaterial({
        color: 0xffe4a8, emissive: 0xffc864, emissiveIntensity: 1.5, roughness: 0.25, metalness: 0.65,
      }),
    );
    halo.position.z = -.04;
    halo.layers.set(1);
    halo.renderOrder = 7;
    group.add(halo);
    this.emblemHalo = halo;

    const mesh = (shape: any, color: string, x: number, y: number, z = 0, root = group, emissiveScale = 0.65) => {
      const mat = new T.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: emissiveScale,
        roughness: 0.24,
        metalness: 0.22,
      });
      const m = new T.Mesh(shape, mat);
      m.layers.set(1);
      m.renderOrder = 7;
      m.position.set(x, y, z);
      root.add(m);
      return m;
    };

    if (slot === 3) {
      for (const [x, y, colour] of [[-.32, -.10, '#6ce6ad'], [0, .19, '#a8ffd0'], [.32, -.10, '#58d6b8']] as const) {
        mesh(new T.CylinderGeometry(.19, .23, .11, 14), '#f2cf7e', x, y - .14, .05, group, 0.5);
        const jelly = mesh(new T.SphereGeometry(.17, 16, 12), colour, x, y, .05, group, 0.85);
        jelly.scale.y = .85;
        for (const dx of [-.06, .06]) mesh(new T.SphereGeometry(.018, 6, 5), '#173832', x + dx, y + .015, .218, group, 0.0);
      }
    } else if (slot === 4) {
      this.tokens = [
        mesh(new T.SphereGeometry(.18, 16, 12), '#5cf0d0', -.44, 0, .04, group, 0.9),
        mesh(new T.OctahedronGeometry(.23), '#ffe68c', 0, 0, .04, group, 1.05),
        mesh(new T.BoxGeometry(.28, .28, .24), '#ff8678', .44, 0, .04, group, 0.9),
      ];
    } else if (slot === 5) {
      const base = mesh(new T.SphereGeometry(.23, 16, 12), '#ffd98a', -.44, -.12, .04, group, 0.85);
      base.scale.y = .76;
      this.tokens = [mesh(new T.SphereGeometry(.12, 14, 10), '#ffb866', 0, 0, .06, group, 1.25)];
      for (let i = 1; i <= 5; i++) {
        const t = i / 6;
        mesh(new T.SphereGeometry(.024, 8, 6), '#fff4c8', -.43 + t * .92, .56 * Math.sin(t * Math.PI) - .12, .04, group, 1.3);
      }
    } else {
      const shield = new T.Shape();
      shield.moveTo(-.36, .32); shield.lineTo(.36, .32); shield.lineTo(.29, -.07);
      shield.quadraticCurveTo(.19, -.29, 0, -.43); shield.quadraticCurveTo(-.19, -.29, -.29, -.07);
      shield.closePath();
      mesh(new T.ExtrudeGeometry(shield, {depth: .08, bevelEnabled: false}), '#f2c87e', 0, 0, 0, group, 0.55);
      const gem = mesh(new T.OctahedronGeometry(.19), '#4be8d8', 0, 0, .18, group, 1.25);
      gem.scale.set(.8, 1.25, .38);
    }
  }

  setGate(gate: Gate | null, _complete: boolean) {
    this.gate = gate;
    const T = this.T;
    if (!gate) {
      this.keystone.material = this.ctx.mats.toon(0xb9ad97);
      this.glow.material.opacity = 0;
      for (const gem of this.keystoneGems) gem.visible = false;
      return;
    }
    const palette = gatePalette(gate);
    const {core, mid, rim} = calibratePortalColors(palette[0], palette[1]);
    this.uniforms.uCore.value.copy(core);
    this.uniforms.uMid.value.copy(mid);
    this.uniforms.uRim.value.copy(rim);
    this.keystone.material = this.ctx.mats.toon(new T.Color(palette[0]).getHex());
    for (const gem of this.keystoneGems) {
      gem.visible = true;
      gem.material.color.copy(rim);
      gem.material.emissive.copy(mid);
    }
    if (this.emblemHalo) {
      this.emblemHalo.material.emissive.copy(rim);
    }
    this.glow.material.color.copy(rim);
  }

  /** Local coordinates of a world point: x across the door, z through it. */
  local(p: Vec): Vec {
    const dx = p[0] - this.slot.position[0], dz = p[2] - this.slot.position[2], c = Math.cos(this.slot.yaw), s = Math.sin(this.slot.yaw);
    return [dx * c - dz * s, p[1], dx * s + dz * c];
  }

  update(t: number, dt: number) {
    const target = this.gate ? 1 : 0;
    const phaseOff = this.slot.slot * 1.13;

    // Subtle lantern wind sway
    for (let i = 0; i < this.lamps.length; i++) {
      this.lamps[i].rotation.z = Math.sin(t * 1.65 + phaseOff + i * 1.4) * 0.065;
    }

    if (this.emblemGroup) {
      this.emblemGroup.position.y = 2.08 + Math.sin(t * 1.9 + phaseOff) * 0.055;
      if (this.emblemHalo) {
        this.emblemHalo.rotation.z = t * (0.45 + 0.55 * this.hover);
        this.emblemHalo.material.emissiveIntensity = 1.35 + 0.95 * this.hover;
      }
    }

    if (this.slot.slot === 4) {
      const phase = (t * .42) % 1;
      const drop = Math.max(0, 1 - phase / .25);
      const merge = Math.min(1, Math.max(0, (phase - .55) / .25));
      this.tokens.forEach((m, i) => {
        m.position.x = (i - 1) * (.52 - .40 * merge);
        m.position.y = .50 * drop;
        m.rotation.y = t * 1.2 + i;
        m.scale.setScalar(phase < .74 ? 1 : Math.max(0, (.94 - phase) / .2));
      });
    } else if (this.slot.slot === 5) {
      const flight = (1 - Math.cos(t * 2.6)) / 2, ball = this.tokens[0];
      ball.position.set(-.43 + flight * .92, .56 * Math.sin(flight * Math.PI) - .12, .06);
    }

    this.open += (target - this.open) * (1 - Math.exp(-dt * 3));
    this.uniforms.uTime.value = t;
    this.uniforms.uOpen.value = this.open;
    this.uniforms.uHover.value = this.hover;

    const opaqueTex = this.ctx.pipeline?.water?.tOpaqueColor?.value ?? null;
    if (opaqueTex && this.uniforms.tOpaqueColor.value !== opaqueTex) {
      this.uniforms.tOpaqueColor.value = opaqueTex;
      this.uniforms.uHasOpaque.value = 1;
    }

    const vis = this.open > .01;
    this.disc.visible = vis;
    this.ribbon.visible = vis;
    this.floorAura.visible = vis;
    for (const gem of this.keystoneGems) {
      if (gem.visible) gem.material.emissiveIntensity = (1.8 + 1.4 * this.hover) * this.open;
    }
    this.glow.material.opacity = this.open * (.26 + .22 * this.hover);
  }
}
