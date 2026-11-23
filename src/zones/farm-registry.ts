import {CROP_META, CROPS, ITEMS, type PlantStyle} from '../life/catalog';
import {
  applyElementAttackToPlot,
  applyWarmBoost,
  harvestEnhanced,
  pollinatePlot,
  type ElementAttackOutcome,
} from '../life/cultivation';
import {burnWeeds, growth, phase, plant, water} from '../life/farming';
import {addItem, ensureHome, type LifeData} from '../life/state';
import {addHomeXp, recordHomeAction} from '../life/unlocks';
import type {SwingAreaEvent} from '../slime/combat';
import type {Vec} from '../slime/types';
import type {Interactable, PlayerHandle} from './types';

export interface FarmPlotSpec {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw?: number;
  /** Width (X) and depth (Z) of the soil surface in metres. */
  width: number;
  depth: number;
  rows: number;
  cols: number;
  /** Height offset above y for the soil visual plane (terrace plots use 0.1, raised beds embed inside rim). */
  soilOffsetY?: number;
  /** True when the bed already renders its own recessed soil box (avoids coplanar Z-fighting). */
  hasOwnSoil?: boolean;
  /** Prevents random weeds when watered (e.g. Stone Courtyard Bed). */
  noWeeds?: boolean;
  /** Extra harvest yield per crop (e.g. Large Fertile Bed). */
  extraYield?: number;
  /** Optional parent Three.js group; defaults to registry root. */
  parent?: any;
}

export interface FarmRegistryHost {
  T: any;
  scene: any;
  life: LifeData;
  toon: (color: number, opts?: any) => any;
  save: () => void;
  dayKey: () => string;
  openSeedPicker?: (plotId: string, onPick: (seedId: string) => void) => void;
  onSaveChange?: () => void;
}

interface SharedGeos {
  leafyBody: any;
  leafyAccent: any;
  tallBody: any;
  tallAccent: any;
  vineBody: any;
  vineAccent: any;
  bushBody: any;
  bushAccent: any;
  flowerBody: any;
  flowerAccent: any;
  rootBody: any;
  rootAccent: any;
  weed: any;
}

interface LivePlotVisual {
  spec: FarmPlotSpec;
  group: any;
  soilMesh: any | null;
  bodyMesh: any;
  accentMesh: any;
  weedMesh: any;
  currentStyle: PlantStyle;
  interactable: Interactable;
  key: string;
}

const SOIL_DRY = 0x8b6b4a;
const SOIL_WET = 0x5c4430;
const EL_TAGS = ['💧喜水', '🍃喜风', '🔥喜火', '⚡喜雷', '🌑喜暗', '🪨喜物'] as const;

function createSharedGeos(T: any): SharedGeos {
  return {
    // 1. Leafy rosette (cabbage, mint, tea, broccoli, dewleaf)
    leafyBody: new T.DodecahedronGeometry(0.22, 0).scale(1.15, 0.72, 1.15).translate(0, 0.16, 0),
    leafyAccent: new T.IcosahedronGeometry(0.14, 0).translate(0, 0.24, 0),
    // 2. Tall stalk + head (wheat, rice, corn, sunflower, ginkgo)
    tallBody: new T.CylinderGeometry(0.045, 0.075, 0.72, 6).translate(0, 0.36, 0),
    tallAccent: new T.CylinderGeometry(0.16, 0.14, 0.10, 8).rotateX(Math.PI * 0.38).translate(0, 0.72, 0.05),
    // 3. Spreading vine + ground melon/berry (watermelon, pumpkin, cucumber, strawberry)
    vineBody: new T.ConeGeometry(0.26, 0.24, 6).translate(0, 0.12, 0),
    vineAccent: new T.DodecahedronGeometry(0.18, 0).scale(1.15, 0.85, 1.15).translate(0.12, 0.14, 0.10),
    // 4. Fruiting bush (chili, tomato, eggplant, blueberry, grape, coffee, cacao)
    bushBody: new T.DodecahedronGeometry(0.21, 0).scale(1.0, 1.25, 1.0).translate(0, 0.24, 0),
    bushAccent: new T.SphereGeometry(0.085, 7, 6).translate(0.13, 0.26, 0.10),
    // 5. Upright stem + blooming blossom (rose, lavender, nightbloom, lotus, wisteria, starlight)
    flowerBody: new T.CylinderGeometry(0.032, 0.045, 0.48, 5).translate(0, 0.24, 0),
    flowerAccent: new T.OctahedronGeometry(0.16, 0).scale(1.1, 0.75, 1.1).translate(0, 0.50, 0),
    // 6. Root plume / mushroom cap (radish, carrot, potato, onion, mushroom)
    rootBody: new T.ConeGeometry(0.15, 0.36, 5).translate(0, 0.24, 0),
    rootAccent: new T.SphereGeometry(0.13, 8, 6).scale(1.05, 0.78, 1.05).translate(0, 0.09, 0),
    weed: new T.ConeGeometry(0.07, 0.34, 4).translate(0, 0.17, 0),
  };
}

function geoPairFor(geos: SharedGeos, style: PlantStyle): [any, any] {
  switch (style) {
    case 'tall': return [geos.tallBody, geos.tallAccent];
    case 'vine': return [geos.vineBody, geos.vineAccent];
    case 'bush': return [geos.bushBody, geos.bushAccent];
    case 'flower': return [geos.flowerBody, geos.flowerAccent];
    case 'root': return [geos.rootBody, geos.rootAccent];
    default: return [geos.leafyBody, geos.leafyAccent];
  }
}

/**
 * Unified farm plot manager for both built-in terrace plots and player-placed raised farm beds.
 * Handles 6 distinct 3D plant visuals, Seed Picker planting, and 6-element slash combat reactions.
 */
export class FarmRegistry {
  readonly root: any;
  private geos: SharedGeos;
  private plots = new Map<string, LivePlotVisual>();
  private player: PlayerHandle | null = null;
  private acc = 0;
  private m4: any;
  private q: any;
  private eul: any;
  private col: any;
  private vPos: any;
  private vScale: any;

  constructor(private host: FarmRegistryHost) {
    const T = host.T;
    this.root = new T.Group();
    this.root.name = 'farm-registry-root';
    host.scene.add(this.root);
    this.geos = createSharedGeos(T);
    this.m4 = new T.Matrix4();
    this.q = new T.Quaternion();
    this.eul = new T.Euler();
    this.col = new T.Color();
    this.vPos = new T.Vector3();
    this.vScale = new T.Vector3();
  }

  getInteractables(): Interactable[] {
    return [...this.plots.values()].map(p => p.interactable);
  }

  getPlotCount(): number {
    return this.plots.size;
  }

  /** Plant a chosen seed into a specific plot, applying water & active sprinkler charge. */
  plantSeed(plotId: string, seedId: string): boolean {
    const live = this.plots.get(plotId);
    if (!live) return false;
    const t = Date.now();
    if (!plant(this.host.life, plotId, seedId, t)) return false;
    const home = ensureHome(this.host.life);
    home.lastSeed = seedId;
    water(this.host.life, plotId, t, this.player?.element ?? 1, () => 1);
    if (home.sprinklerChargedUntil > t && this.host.life.plots[plotId]) {
      this.host.life.plots[plotId]!.watered = Math.max(this.host.life.plots[plotId]!.watered, home.sprinklerChargedUntil);
    }
    this.host.save();
    live.key = '';
    this.draw(live);
    this.player?.mood('Happy');
    const item = ITEMS[CROPS[seedId]?.crop ?? seedId];
    this.player?.toast(`🌱 种下了 ${item?.icon ?? ''} ${item?.name ?? seedId}`, 2200);
    this.host.onSaveChange?.();
    return true;
  }

  registerPlot(spec: FarmPlotSpec): () => void {
    if (this.plots.has(spec.id)) this.unregisterPlot(spec.id);
    const T = this.host.T;
    const group = new T.Group();
    group.name = 'crop-' + spec.id;
    group.position.set(spec.x, spec.y + (spec.soilOffsetY ?? 0.1), spec.z);
    group.rotation.y = spec.yaw ?? 0;
    (spec.parent ?? this.root).add(group);

    let soilMesh: any | null = null;
    if (!spec.hasOwnSoil) {
      soilMesh = new T.Mesh(
        new T.PlaneGeometry(spec.width, spec.depth).rotateX(-Math.PI / 2),
        this.host.toon(SOIL_DRY, {noCache: true}),
      );
      soilMesh.name = 'crop-soil-tint';
      soilMesh.position.y = 0.004;
      group.add(soilMesh);
    }

    const cap = Math.max(1, spec.rows * spec.cols);
    const [bGeo, aGeo] = geoPairFor(this.geos, 'leafy');
    const bodyMesh = new T.InstancedMesh(bGeo, this.host.toon(0xffffff), cap);
    const accentMesh = new T.InstancedMesh(aGeo, this.host.toon(0xffffff), cap);
    const weedMesh = new T.InstancedMesh(this.geos.weed, this.host.toon(0x6b8f3a), Math.min(10, cap));
    for (const m of [bodyMesh, accentMesh, weedMesh]) {
      m.count = 0;
      m.castShadow = true;
      m.userData.walkThrough = true;
      group.add(m);
    }

    const interactRadius = Math.max(2.3, Math.hypot(spec.width, spec.depth) * 0.52);
    const interactable: Interactable = {
      id: spec.id,
      position: [spec.x, spec.y, spec.z],
      radius: interactRadius,
      prompt: () => this.buildPrompt(spec),
      act: () => this.actOnPlot(spec),
    };

    const live: LivePlotVisual = {
      spec,
      group,
      soilMesh,
      bodyMesh,
      accentMesh,
      weedMesh,
      currentStyle: 'leafy',
      interactable,
      key: '',
    };
    this.plots.set(spec.id, live);
    this.draw(live);
    return () => this.unregisterPlot(spec.id);
  }

  unregisterPlot(id: string) {
    const live = this.plots.get(id);
    if (!live) return;
    live.group.removeFromParent();
    if (live.soilMesh) {
      live.soilMesh.geometry?.dispose?.();
      live.soilMesh.material?.dispose?.();
    }
    this.plots.delete(id);
  }

  /** Called when the slime swings an elemental combo attack; returns count of plots affected. */
  hitArea(
    ev: SwingAreaEvent,
    now: number,
    onReaction?: (plotPos: Vec, outcome: ElementAttackOutcome) => void,
  ): number {
    let hitCount = 0;
    const fLen = Math.hypot(ev.forward[0], ev.forward[2]) || 1;
    const fx = ev.forward[0] / fLen, fz = ev.forward[2] / fLen;
    const reach = ev.range + 0.95;

    for (const live of this.plots.values()) {
      const s = live.spec;
      if (Math.abs(s.y - ev.origin[1]) > 2.2) continue;
      // Check closest point on the rotated plot rectangle to the slime
      const dx = ev.origin[0] - s.x, dz = ev.origin[2] - s.z;
      const yaw = s.yaw ?? 0;
      const cy = Math.cos(-yaw), sy = Math.sin(-yaw);
      const lx = dx * cy - dz * sy, lz = dx * sy + dz * cy;
      const hw = s.width * 0.5, hd = s.depth * 0.5;
      const cx = Math.max(-hw, Math.min(hw, lx));
      const cz = Math.max(-hd, Math.min(hd, lz));
      // Transform closest point back to world
      const wcy = Math.cos(yaw), wsy = Math.sin(yaw);
      const worldClosestX = s.x + cx * wcy - cz * wsy;
      const worldClosestZ = s.z + cx * wsy + cz * wcy;

      const toX = worldClosestX - ev.origin[0];
      const toZ = worldClosestZ - ev.origin[2];
      const dist = Math.hypot(toX, toZ);
      const along = toX * fx + toZ * fz;
      const side = Math.abs(toX * fz - toZ * fx);

      const inHit = dist <= 0.85
        || (ev.exec === 'AoE' && dist <= ev.radius + 1.2)
        || (along > -0.45 && along <= reach && side <= Math.max(ev.radius + 0.85, reach * 0.78));
      if (!inHit) continue;

      const outcome = applyElementAttackToPlot(this.host.life, s.id, ev.element, now, ev.isFinisher, Math.random);
      if (!outcome.changed) continue;
      hitCount++;
      live.key = '';
      this.draw(live);
      if (!outcome.destroyed) {
        recordHomeAction(this.host.life, this.host.dayKey(), 'element', 1);
      }
      onReaction?.([s.x, s.y + (s.soilOffsetY ?? 0.1), s.z], outcome);
    }

    if (hitCount > 0) {
      this.host.save();
      this.host.onSaveChange?.();
    }
    return hitCount;
  }

  markAllDirty() {
    for (const live of this.plots.values()) live.key = '';
  }

  update(dt: number, player: PlayerHandle) {
    this.player = player;
    this.acc -= dt;
    if (this.acc > 0) return;
    this.acc = 0.35;
    for (const live of this.plots.values()) this.draw(live);
  }

  private seedsInBag(): string[] {
    return Object.keys(this.host.life.bag)
      .filter(id => !!CROPS[id] && (this.host.life.bag[id] ?? 0) > 0)
      .sort((a, b) => CROPS[a].growMs - CROPS[b].growMs);
  }

  private giftStarterSeeds() {
    if (this.host.life.records['gift-seeds']) return;
    this.host.life.records['gift-seeds'] = 1;
    addItem(this.host.life, 'seed-radish', 3);
    addItem(this.host.life, 'seed-tomato', 2);
    addItem(this.host.life, 'seed-chili', 2);
    addItem(this.host.life, 'seed-mint', 2);
    addItem(this.host.life, 'seed-lotus', 1);
    this.host.save();
    this.player?.toast('农场送你萝卜、番茄、火辣椒、薄荷与青莲种子 🌱', 3800);
  }

  private buildPrompt(spec: FarmPlotSpec): {title: string; sub: string} {
    const t = Date.now();
    const s = this.host.life.plots[spec.id];
    const ph = phase(s, t);
    const cropDef = s && CROPS[s.crop] ? ITEMS[CROPS[s.crop].crop] : null;
    const name = cropDef?.name ?? '';
    const meta = s ? CROP_META[s.crop] : null;
    const affinityTag = meta ? `${EL_TAGS[meta.preferredElement]}${meta.waterSensitive ? '·怕涝' : ''}` : '';

    if (ph === 'empty') {
      const list = this.seedsInBag();
      if (!list.length) {
        return {
          title: this.host.life.records['gift-seeds'] ? '没有种子了' : '领取新手种子',
          sub: this.host.life.records['gift-seeds'] ? '去农场入口的种子铺挑选 32 种 UE 作物种子' : '第一次来，农场送你 5 种入门种子',
        };
      }
      if (this.host.openSeedPicker) {
        return {
          title: '选择作物种植',
          sub: `背包有 ${list.length} 种种子 · 支持 6 属性刀光交互（火烧/水冲/雷催熟）`,
        };
      }
      return {
        title: `种下${ITEMS[list[0]].name}`,
        sub: `背包里还有 ${this.host.life.bag[list[0]]} 包 · 长成要 ${CROPS[list[0]].growMs / 60000} 分钟`,
      };
    }
    if (ph === 'ripe') {
      if (!s!.pollinated && this.player?.element === 1) {
        return {title: `风属性授粉 · ${name}`, sub: '吹拂花穗，有概率催生金色变异果实（售价大幅提升）'};
      }
      return {
        title: `收获${s!.variant === 'rare' ? '✨ 金色' : ''}${name}`,
        sub: s!.variant === 'rare'
          ? '稀有变异丰收！额外产量 + 贝壳奖励'
          : `${affinityTag} · 熟透了！（提示：左键火/水挥砍会烧毁或冲毁非喜属性作物）`,
      };
    }
    if (ph === 'withered') return {title: '清理枯苗', sub: '放太久了，按交互键或物属性一刀斩清'};
    if (this.player?.element === 2 && (s!.weeds || !s!.warmBoost)) {
      return {title: s!.weeds ? '火属性烧草并催暖' : `火属性暖阳加速 · ${name}`, sub: '温和照料：除草并 +35% 速度（左键火刀挥砍会直接烧毁非喜火作物！）'};
    }
    if (this.player?.element === 1 && !s!.pollinated) {
      return {title: `风属性授粉 · ${name}`, sub: '吹散花粉，有概率培育出金色稀有变异植株'};
    }
    const wet = t < s!.watered;
    const pct = Math.round(growth(s!, t) * 100);
    const tags = [
      affinityTag,
      s!.steamUntil && t < s!.steamUntil ? '♨️蒸汽温室' : '',
      s!.warmBoost ? '☀️暖阳' : '',
      (s!.fertility ?? 0) >= 0.5 ? '🌑高肥力' : '',
      s!.variant === 'rare' ? '✨金色变异' : '',
      s!.weeds ? '🌿有杂草' : '',
    ].filter(Boolean).join(' · ');
    return {
      title: wet ? `${name} · ${pct}%` : `给${name}浇水`,
      sub: wet
        ? `土还湿着 · ${tags}`
        : `${affinityTag} · ${this.player?.element === 0 ? '水属性浇水湿润翻倍' : '只有土是湿的时候作物才会长'}`,
    };
  }

  private actOnPlot(spec: FarmPlotSpec) {
    const live = this.plots.get(spec.id);
    if (!live) return;
    const t = Date.now();
    const s = this.host.life.plots[spec.id];
    const ph = phase(s, t);

    if (ph === 'empty') {
      const list = this.seedsInBag();
      if (!list.length) {
        this.giftStarterSeeds();
        return;
      }
      if (this.host.openSeedPicker) {
        this.host.openSeedPicker(spec.id, seedId => this.plantSeed(spec.id, seedId));
        return;
      }
      this.plantSeed(spec.id, list[0]);
      return;
    }

    if (ph === 'ripe' && !s!.pollinated && this.player?.element === 1) {
      const res = pollinatePlot(this.host.life, spec.id, t, Math.random);
      recordHomeAction(this.host.life, this.host.dayKey(), 'element', 1);
      this.player?.toast(res.rare ? '🍃✨ 风属性授粉成功！催生出金色稀有变异植株！' : '🍃 风拂过花田完成了授粉，下次再试试变异吧', 3000);
      if (res.rare) this.player?.mood('Happy', 1.2);
    } else if (ph === 'ripe' || ph === 'withered') {
      const r = harvestEnhanced(this.host.life, spec.id, t, Math.random, spec.extraYield ?? 0);
      if (r && r.n) {
        addHomeXp(this.host.life, r.rare ? 16 : 8);
        const ev = recordHomeAction(this.host.life, this.host.dayKey(), 'harvest', 1);
        this.player?.toast(
          `${r.rare ? '✨ 金色丰收！' : '收获 '}${ITEMS[r.item].icon} ${ITEMS[r.item].name} ×${r.n}${r.bonusCoins ? ` +${r.bonusCoins} 🐚` : ''}${ev.completedTasks.length ? ' · 手账完成！' : ''}`,
          3200,
        );
        this.player?.mood('Happy', 1.2);
      }
    } else if (this.player?.element === 2 && (s!.weeds || !s!.warmBoost)) {
      if (s!.weeds) burnWeeds(this.host.life, spec.id, t);
      applyWarmBoost(this.host.life, spec.id, t);
      recordHomeAction(this.host.life, this.host.dayKey(), 'element', 1);
      this.player?.toast('🔥☀️ 火属性暖阳已激活，成长速度 +35%！', 2800);
    } else if (this.player?.element === 1 && !s!.pollinated) {
      const res = pollinatePlot(this.host.life, spec.id, t, Math.random);
      recordHomeAction(this.host.life, this.host.dayKey(), 'element', 1);
      this.player?.toast(res.rare ? '🍃✨ 授粉成功！植株泛起金色星光（变异）！' : '🍃 已用微风授粉', 2800);
    } else if (t >= s!.watered) {
      water(this.host.life, spec.id, t, this.player?.element ?? 1, spec.noWeeds ? () => 1 : Math.random);
      recordHomeAction(this.host.life, this.host.dayKey(), 'water', 1);
      if (this.player?.element === 0) recordHomeAction(this.host.life, this.host.dayKey(), 'element', 1);
      this.player?.toast(this.player?.element === 0 ? '💧 水属性浇透了（湿润翻倍）' : '💧 浇好水了');
    }
    this.host.save();
    live.key = '';
    this.draw(live);
    this.host.onSaveChange?.();
  }

  private draw(v: LivePlotVisual) {
    const s = this.host.life.plots[v.spec.id];
    const t = Date.now();
    const ph = phase(s, t);
    const g = s ? growth(s, t) : 0;
    const wet = !!s && t < s.watered;
    const steam = !!s?.steamUntil && t < s.steamUntil;
    const key = `${ph}|${s?.crop}|${Math.round(g * 20)}|${wet}|${s?.weeds}|${s?.warmBoost}|${steam}|${s?.variant}`;
    if (key === v.key) return;
    v.key = key;

    if (v.soilMesh) {
      (v.soilMesh.material as any).color.setHex(wet ? SOIL_WET : SOIL_DRY);
    }

    v.bodyMesh.count = v.accentMesh.count = v.weedMesh.count = 0;
    if (!s) return;

    const meta = CROP_META[s.crop];
    const style: PlantStyle = meta?.plantStyle ?? 'leafy';
    if (style !== v.currentStyle) {
      const [bGeo, aGeo] = geoPairFor(this.geos, style);
      v.bodyMesh.geometry = bGeo;
      v.accentMesh.geometry = aGeo;
      v.currentStyle = style;
    }

    const bodyHex = meta?.bodyColor ?? 0x6fae4f;
    const accentHex = s.variant === 'rare' ? 0xffe066 : (meta?.accentColor ?? 0xffffff);
    const dead = ph === 'withered';
    const scaleH = 0.26 + 0.92 * g;
    const scaleW = 0.55 + 0.62 * g;
    const showAccent = ph === 'ripe' || s.variant === 'rare' || (style === 'flower' && g > 0.45) || (style === 'root' && g > 0.35);

    const rows = v.spec.rows;
    const cols = v.spec.cols;
    const usableW = Math.max(0.6, v.spec.width - 0.85);
    const usableD = Math.max(0.5, v.spec.depth - 0.75);
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++, idx++) {
        const u = cols > 1 ? c / (cols - 1) - 0.5 : 0;
        const w = rows > 1 ? r / (rows - 1) - 0.5 : 0;
        const px = u * usableW;
        const pz = w * usableD;
        const rot = ((r * 7 + c * 13) % 10) * 0.62;
        this.eul.set(0, rot, 0);
        this.q.setFromEuler(this.eul);
        this.vPos.set(px, 0, pz);
        this.vScale.set(scaleW, scaleH, scaleW);
        this.m4.compose(this.vPos, this.q, this.vScale);
        v.bodyMesh.setMatrixAt(idx, this.m4);
        const leafCol = dead ? 0x8a7a55 : steam ? 0x82d67a : s.warmBoost ? 0x7cb852 : bodyHex;
        v.bodyMesh.setColorAt(idx, this.col.setHex(leafCol));

        if (showAccent) {
          const fScale = ph === 'ripe' ? (s.variant === 'rare' ? 1.28 : 1.0) : 0.62;
          this.vPos.set(px, 0, pz);
          this.vScale.set(fScale * scaleW, fScale * scaleH, fScale * scaleW);
          this.m4.compose(this.vPos, this.q, this.vScale);
          v.accentMesh.setMatrixAt(v.accentMesh.count, this.m4);
          v.accentMesh.setColorAt(v.accentMesh.count++, this.col.setHex(dead ? 0x73634a : accentHex));
        }
      }
    }
    v.bodyMesh.count = idx;

    if (s.weeds) {
      const wn = Math.min(8, rows * cols);
      for (let k = 0; k < wn; k++) {
        const rx = ((k * 37 % 100) / 100 - 0.5) * usableW;
        const rz = ((k * 61 % 100) / 100 - 0.5) * usableD;
        this.q.identity();
        this.vPos.set(rx, 0, rz);
        this.vScale.set(1, 1, 1);
        this.m4.compose(this.vPos, this.q, this.vScale);
        v.weedMesh.setMatrixAt(v.weedMesh.count++, this.m4);
      }
    }

    for (const m of [v.bodyMesh, v.accentMesh, v.weedMesh]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }

  dispose() {
    this.root.removeFromParent();
    for (const live of this.plots.values()) {
      if (live.soilMesh) {
        live.soilMesh.geometry?.dispose?.();
        live.soilMesh.material?.dispose?.();
      }
    }
    this.plots.clear();
  }
}
