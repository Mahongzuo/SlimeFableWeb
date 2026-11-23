import {BUILD_CATALOG, BUILD_ITEMS, HOME_PRESETS, buildPropCollisionBox, canPlaceProp, type BuildItemDef} from './build-catalog';
import {spawnPackModel, updatePackAnimations, type SpawnedPackModel} from './model-pack';
import {FrontierRenderer} from './frontier';
import {addItem, ensureHome, type ExpandedTile, type ExpansionThemeId, type LifeData, type PlacedProp} from '../life/state';
import {addHomeXp, grantStarterHomeFunds, isBuildItemUnlocked, isPresetUnlocked, recordHomeAction} from '../life/unlocks';
import {evaluateHabitats, recordVisitorInteraction, type HabitatEvaluation} from '../life/habitat';
import {chargeHomeSprinkler} from '../life/cultivation';
import {ITEMS} from '../life/catalog';
import {
  computeDynamicFrontier,
  computeExpandedBounds,
  EXPANSION_THEMES,
  expansionCost,
  resolveExpansionSlot,
} from '../world/expansion';
import {days} from '../../content/registry';
import type {Box, Vec} from '../slime/types';
import type {Interactable, PlayerHandle} from '../zones/types';
import type {FarmRegistry} from '../zones/farm-registry';

export interface HomeBuilderHost {
  ctx: any;
  life: LifeData;
  souvenirs: () => string[];
  dayKey: () => string;
  ground: (x: number, z: number) => number | null;
  fluid: (x: number, z: number) => number | null;
  syncCollision: (boxes: Box[]) => void;
  syncExpansions?: (expansions: ExpandedTile[]) => void;
  farmRegistry?: FarmRegistry;
  save: () => void;
  toast: (text: string, ms?: number) => void;
  onChange?: () => void;
}

interface LiveProp {
  data: PlacedProp;
  model: SpawnedPackModel;
  badge?: any;
  disposeFarmPlot?: () => void;
}

interface LiveVisitor {
  speciesId: string;
  evalData: HabitatEvaluation;
  model: SpawnedPackModel;
  anchor: [number, number];
  pos: [number, number];
  target: [number, number];
  yaw: number;
  wait: number;
}

function buildProceduralFacility(T: any, kind: string): SpawnedPackModel {
  const group = new T.Group();
  group.name = `home-${kind}`;
  const stone = new T.MeshStandardMaterial({color: 0xd6cfc0, roughness: 0.85});
  const wood = new T.MeshStandardMaterial({color: 0x996d46, roughness: 0.8});
  const waterMat = new T.MeshStandardMaterial({color: 0x52c7e8, roughness: 0.25, metalness: 0.1, emissive: 0x164a63, emissiveIntensity: 0.35});
  const gold = new T.MeshStandardMaterial({color: 0xe6b85c, roughness: 0.35, metalness: 0.35, emissive: 0x5a3e0d, emissiveIntensity: 0.25});

  if (kind === 'procedural-farm-wood' || kind === 'procedural-farm-stone' || kind === 'procedural-farm-large') {
    const isStone = kind === 'procedural-farm-stone';
    const isLarge = kind === 'procedural-farm-large';
    const w = isLarge ? 4.8 : isStone ? 3.4 : 2.6;
    const d = isLarge ? 2.9 : isStone ? 2.3 : 1.9;
    const h = isStone ? 0.36 : 0.32;
    const t = isStone ? 0.16 : 0.12;
    const rimMat = isStone
      ? new T.MeshStandardMaterial({color: 0xb8b2a6, roughness: 0.88})
      : new T.MeshStandardMaterial({color: isLarge ? 0x7d5836 : 0x996d46, roughness: 0.82});
    const postMat = new T.MeshStandardMaterial({color: isStone ? 0x969084 : 0x6e4a2d, roughness: 0.86});

    // 4 non-overlapping perimeter beams (extended -0.06 into ground so slopes never show floating gaps)
    const wallH = h + 0.06;
    const wallY = wallH * 0.5 - 0.06;
    const front = new T.Mesh(new T.BoxGeometry(w, wallH, t), rimMat);
    front.position.set(0, wallY, d * 0.5 - t * 0.5);
    const back = new T.Mesh(new T.BoxGeometry(w, wallH, t), rimMat);
    back.position.set(0, wallY, -d * 0.5 + t * 0.5);
    const innerD = d - t * 2;
    const left = new T.Mesh(new T.BoxGeometry(t, wallH, innerD), rimMat);
    left.position.set(-w * 0.5 + t * 0.5, wallY, 0);
    const right = new T.Mesh(new T.BoxGeometry(t, wallH, innerD), rimMat);
    right.position.set(w * 0.5 - t * 0.5, wallY, 0);
    for (const m of [front, back, left, right]) { m.castShadow = true; m.receiveShadow = true; group.add(m); }

    // 4 subtle corner caps standing 0.04m proud of the rim (offset outside beam edges to avoid coplanar overlap)
    const capSize = t + 0.05;
    const capH = wallH + 0.04;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const post = new T.Mesh(new T.BoxGeometry(capSize, capH, capSize), postMat);
        post.position.set(sx * (w * 0.5 - t * 0.45), capH * 0.5 - 0.06, sz * (d * 0.5 - t * 0.45));
        post.castShadow = true;
        group.add(post);
      }
    }

    // Recessed sub-soil fill sitting well BELOW FarmRegistry's dynamic soil plane (no Z-fighting!)
    const baseSoil = new T.Mesh(
      new T.BoxGeometry(w - t * 2 - 0.02, Math.max(0.08, h - 0.08), d - t * 2 - 0.02),
      new T.MeshStandardMaterial({color: 0x5c4430, roughness: 0.96}),
    );
    baseSoil.position.set(0, (h - 0.08) * 0.5 - 0.02, 0);
    baseSoil.receiveShadow = true;
    group.add(baseSoil);
    return {group, dispose: () => group.removeFromParent()};
  }

  if (kind === 'procedural-fountain') {
    const basin = new T.Mesh(new T.CylinderGeometry(0.82, 0.92, 0.42, 16), stone);
    basin.position.y = 0.21; basin.castShadow = true; basin.receiveShadow = true;
    const pool = new T.Mesh(new T.CylinderGeometry(0.68, 0.68, 0.08, 16), waterMat);
    pool.position.y = 0.38;
    const pillar = new T.Mesh(new T.CylinderGeometry(0.18, 0.24, 0.95, 12), stone);
    pillar.position.y = 0.68; pillar.castShadow = true;
    const crystal = new T.Mesh(new T.OctahedronGeometry(0.24, 0), waterMat);
    crystal.position.y = 1.32; crystal.name = 'spin-crystal';
    group.add(basin, pool, pillar, crystal);
  } else if (kind === 'procedural-pedestal') {
    const base = new T.Mesh(new T.BoxGeometry(1.1, 0.24, 1.1), stone);
    base.position.y = 0.12; base.castShadow = true; base.receiveShadow = true;
    const col = new T.Mesh(new T.CylinderGeometry(0.32, 0.38, 0.82, 8), stone);
    col.position.y = 0.65; col.castShadow = true;
    const top = new T.Mesh(new T.BoxGeometry(0.86, 0.12, 0.86), wood);
    top.position.y = 1.10; top.castShadow = true;
    const orb = new T.Mesh(new T.OctahedronGeometry(0.22, 1), gold);
    orb.position.y = 1.46; orb.name = 'spin-crystal';
    group.add(base, col, top, orb);
  } else {
    const box = new T.Mesh(new T.BoxGeometry(2.2, 0.36, 1.4), wood);
    box.position.y = 0.18; box.castShadow = true; box.receiveShadow = true;
    const soil = new T.Mesh(new T.BoxGeometry(1.96, 0.12, 1.16), new T.MeshStandardMaterial({color: 0x6b4e35, roughness: 0.95}));
    soil.position.y = 0.34;
    group.add(box, soil);
    const colors = [0xff8fab, 0xffd166, 0xa8dadc, 0xc77dff, 0xff9f1c];
    for (let i = 0; i < 10; i++) {
      const fx = -0.78 + (i % 5) * 0.39, fz = i < 5 ? -0.30 : 0.30;
      const stem = new T.Mesh(new T.CylinderGeometry(0.02, 0.025, 0.24, 5), new T.MeshStandardMaterial({color: 0x5c9e54, roughness: 0.85}));
      stem.position.set(fx, 0.48, fz);
      const bloom = new T.Mesh(new T.DodecahedronGeometry(0.11, 0), new T.MeshStandardMaterial({color: colors[i % colors.length], roughness: 0.5}));
      bloom.position.set(fx, 0.64, fz);
      group.add(stem, bloom);
    }
  }
  return {group, dispose: () => group.removeFromParent()};
}

function souvenirNameById(id: string): string {
  for (const d of Object.values(days)) {
    const c = d.chapters.find(ch => ch.id === id);
    if (c) return `${c.year} · ${c.souvenir}`;
  }
  return id;
}

/**
 * Owns player-built DreamWorld structures/plants, live habitat visitors,
 * dynamic collision synchronization, and the interactive V-key Build Mode camera & Ghost preview.
 */
export class HomeBuilder {
  active = false;
  selectedItemId: string = BUILD_CATALOG[0].id;
  demolishMode = false;
  expandMode = false;
  selectedSlotId: string | null = null;
  selectedTheme: ExpansionThemeId = 'farmland';
  previewYaw = 0;
  previewScaleIdx = 1;
  readonly frontier: FrontierRenderer;
  private lastFrontierFocus: [number, number] = [-30, 142];
  private readonly scales = [0.85, 1.0, 1.2];
  private root: any;
  private props = new Map<string, LiveProp>();
  private visitors = new Map<string, LiveVisitor>();
  private ghostGroup: any;
  private ghostRing: any;
  private ghostMatOk: any;
  private ghostMatBad: any;
  private ghostPos: Vec = [0, 0, 48];
  private ghostValid = false;
  private ghostReason = '';
  private ghostMesh: SpawnedPackModel | null = null;
  private ghostAssetKey = '';

  // Build-mode orbit camera state
  private camFocus: Vec = [0, 0, 48];
  private camYaw = 0.35;
  private camPitch = 0.72;
  private camDist = 20;
  private keys = new Set<string>();
  private dragging = false;
  private raycaster: any;
  private pointerNDC: any;
  private T: any;
  private savedCam: {pos: any; target: any; fov: number} | null = null;
  private listeners: {target: EventTarget; type: string; fn: EventListener}[] = [];

  constructor(private host: HomeBuilderHost) {
    this.T = host.ctx.THREE;
    this.root = new this.T.Group();
    this.root.name = 'home-builder-root';
    host.ctx.scene.add(this.root);

    this.raycaster = new this.T.Raycaster();
    this.pointerNDC = new this.T.Vector2(0, 0);
    this.ghostMatOk = new this.T.MeshBasicMaterial({color: 0x45c49e, transparent: true, opacity: 0.45, depthWrite: false});
    this.ghostMatBad = new this.T.MeshBasicMaterial({color: 0xe35d5b, transparent: true, opacity: 0.48, depthWrite: false});

    this.ghostGroup = new this.T.Group();
    this.ghostGroup.visible = false;
    this.ghostRing = new this.T.Mesh(
      new this.T.RingGeometry(0.88, 1.0, 36).rotateX(-Math.PI / 2),
      new this.T.MeshBasicMaterial({color: 0x45c49e, transparent: true, opacity: 0.85, side: this.T.DoubleSide, depthWrite: false}),
    );
    this.ghostRing.position.y = 0.06;
    this.ghostRing.layers.set(1);
    this.ghostGroup.add(this.ghostRing);
    this.root.add(this.ghostGroup);
    this.frontier = new FrontierRenderer(host.ctx);

    this.rebuildFromSave();
    this.bindEvents();
  }

  get currentScale() { return this.scales[this.previewScaleIdx]; }
  get currentGhostStatus() { return {valid: this.ghostValid, reason: this.ghostReason}; }

  private on(target: EventTarget, type: string, fn: (e: any) => void) {
    target.addEventListener(type, fn as EventListener);
    this.listeners.push({target, type, fn: fn as EventListener});
  }

  private bindEvents() {
    const dom = this.host.ctx.renderer.domElement;
    this.on(window, 'keydown', e => {
      if (!this.active) return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'Backspace', 'Delete'].includes(e.code)) {
        this.keys.add(e.code);
      }
      if (!e.repeat) {
        if (e.code === 'KeyQ') this.previewYaw += Math.PI / 12;
        else if (e.code === 'KeyE') this.previewYaw -= Math.PI / 12;
        else if (e.code === 'KeyR') {
          this.previewScaleIdx = (this.previewScaleIdx + 1) % this.scales.length;
          this.host.toast(`缩放档位：${Math.round(this.currentScale * 100)}%`, 1400);
        }
      }
    });
    this.on(window, 'keyup', e => this.keys.delete(e.code));
    this.on(dom, 'pointermove', e => {
      if (!this.active) return;
      const rect = dom.getBoundingClientRect();
      this.pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      if (this.dragging) {
        this.camYaw -= e.movementX * 0.006;
        this.camPitch = Math.max(0.32, Math.min(1.28, this.camPitch + e.movementY * 0.005));
      } else if (this.expandMode) {
        this.raycaster.setFromCamera(this.pointerNDC, this.host.ctx.camera);
        this.frontier.setHoveredSlot(this.frontier.pickSlot(this.raycaster));
      } else {
        this.updatePointerWorld();
      }
    });
    this.on(dom, 'pointerdown', e => {
      if (!this.active) return;
      if (e.button === 2) {
        this.dragging = true;
        return;
      }
      if (e.button === 0) {
        if (this.expandMode) {
          this.raycaster.setFromCamera(this.pointerNDC, this.host.ctx.camera);
          const hitSlot = this.frontier.pickSlot(this.raycaster);
          if (hitSlot) this.selectFrontierSlot(hitSlot);
          return;
        }
        this.updatePointerWorld();
        if (this.demolishMode) this.tryDemolishAt(this.ghostPos[0], this.ghostPos[2]);
        else this.tryPlaceCurrent();
      }
    });
    this.on(window, 'pointerup', e => {
      if (e.button === 2) this.dragging = false;
    });
    this.on(dom, 'wheel', e => {
      if (!this.active) return;
      e.preventDefault();
      this.camDist = Math.max(8, Math.min(46, this.camDist + Math.sign(e.deltaY) * 2.2));
    });
  }

  enter(playerPos: Vec) {
    if (this.active) return;
    this.active = true;
    this.keys.clear();
    this.dragging = false;
    const cam = this.host.ctx.camera;
    this.savedCam = {pos: cam.position.clone(), target: this.host.ctx.controls.target.clone(), fov: cam.fov};
    // Start focus near player (or shift slightly outward if inside the Time Plaza)
    const startX = playerPos[0], startZ = Math.max(playerPos[2], 32);
    this.camFocus = [startX, this.host.ground(startX, startZ) ?? 0, startZ];
    this.ghostPos = [...this.camFocus];
    if (grantStarterHomeFunds(this.host.life)) {
      this.host.save();
      this.host.toast('欢迎开启家园建造！已发放 40 🐚 开垦启动金', 3800);
    }
    this.refreshGhostModel();
    this.ghostGroup.visible = !this.demolishMode && !this.expandMode;
    this.frontier.setPreviewVisible(this.expandMode);
    this.host.onChange?.();
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    this.expandMode = false;
    this.keys.clear();
    this.dragging = false;
    this.ghostGroup.visible = false;
    this.frontier.setPreviewVisible(false);
    if (this.savedCam) {
      this.host.ctx.camera.fov = this.savedCam.fov;
      this.host.ctx.camera.updateProjectionMatrix();
      this.savedCam = null;
    }
    this.host.onChange?.();
  }

  selectItem(itemId: string) {
    if (!BUILD_ITEMS[itemId]) return;
    this.selectedItemId = itemId;
    this.demolishMode = false;
    this.expandMode = false;
    this.frontier.setPreviewVisible(false);
    this.refreshGhostModel();
    if (this.active) this.ghostGroup.visible = true;
    this.host.onChange?.();
  }

  setDemolish(on: boolean) {
    this.demolishMode = on;
    if (on) {
      this.expandMode = false;
      this.frontier.setPreviewVisible(false);
    }
    if (this.active) this.ghostGroup.visible = !on && !this.expandMode;
    this.host.onChange?.();
  }

  setExpandMode(on: boolean) {
    this.expandMode = on;
    if (on) {
      this.demolishMode = false;
      const home = ensureHome(this.host.life);
      const focus: [number, number] = [this.camFocus[0], this.camFocus[2]];
      const avail = computeDynamicFrontier(home.expansions, focus, 8);
      if (!this.selectedSlotId || !avail.some(s => s.id === this.selectedSlotId)) {
        this.selectedSlotId = avail[0]?.id ?? null;
      }
      this.lastFrontierFocus = focus;
      this.frontier.sync(home.expansions, this.selectedTheme, focus);
      this.frontier.setSelectedSlot(this.selectedSlotId);
      if (this.selectedSlotId) this.focusOnSlot(this.selectedSlotId);
      this.camDist = Math.max(this.camDist, 36);
    }
    if (this.active) {
      this.ghostGroup.visible = !on && !this.demolishMode;
      this.frontier.setPreviewVisible(on);
    }
    this.host.onChange?.();
  }

  selectFrontierSlot(slotId: string) {
    const slot = resolveExpansionSlot(slotId);
    if (!slot) return;
    this.selectedSlotId = slot.id;
    this.frontier.setSelectedSlot(slot.id);
    this.focusOnSlot(slot.id);
    this.host.onChange?.();
  }

  selectExpansionTheme(theme: ExpansionThemeId) {
    this.selectedTheme = theme;
    const home = ensureHome(this.host.life);
    this.frontier.sync(home.expansions, theme, [this.camFocus[0], this.camFocus[2]]);
    this.frontier.setSelectedSlot(this.selectedSlotId);
    this.host.onChange?.();
  }

  toggleSandboxFreeExpand() {
    const home = ensureHome(this.host.life);
    home.sandboxFreeExpand = !home.sandboxFreeExpand;
    this.host.save();
    this.host.toast(
      home.sandboxFreeExpand
        ? '🏖️ 已开启自由沙盒扩建模式：无限领土 0 贝壳自由开垦！'
        : '🐚 已切回资源养成扩建模式（首块免费，后续封顶 50 🐚）',
      3000,
    );
    this.host.onChange?.();
  }

  get frontierFocus(): [number, number] {
    return [this.camFocus[0], this.camFocus[2]];
  }

  private focusOnSlot(slotId: string) {
    const slot = resolveExpansionSlot(slotId);
    if (!slot) return;
    const cx = (slot.min[0] + slot.max[0]) * 0.5;
    const cz = (slot.min[1] + slot.max[1]) * 0.5;
    this.camFocus = [cx, 1.0, cz];
  }

  confirmExpand(slotId?: string, theme?: ExpansionThemeId): boolean {
    const home = ensureHome(this.host.life);
    const id = slotId ?? this.selectedSlotId;
    const th = theme ?? this.selectedTheme;
    if (!id) {
      this.host.toast('请先移动镜头并选择一块绿色虚线边疆地块', 2400);
      return false;
    }
    const targetSlot = resolveExpansionSlot(id);
    if (!targetSlot) {
      this.host.toast('该区域不可开垦', 2000);
      return false;
    }
    // Check adjacency against the complete frontier around that target slot
    const avail = computeDynamicFrontier(home.expansions, [(targetSlot.min[0] + targetSlot.max[0]) * 0.5, (targetSlot.min[1] + targetSlot.max[1]) * 0.5], 24);
    const slot = avail.find(s => s.gx === targetSlot.gx && s.gz === targetSlot.gz);
    if (!slot) {
      this.host.toast('请先选择一块与当前已拥有领土相邻的边疆地块', 2400);
      return false;
    }
    const cost = expansionCost(home.expansions.length, !!home.sandboxFreeExpand);
    if (this.host.life.coins < cost) {
      this.host.toast(`贝壳不足：开垦「${slot.name}」需要 ${cost} 🐚（当前 ${this.host.life.coins} 🐚，也可开启自由沙盒模式）`, 3200);
      return false;
    }
    this.host.life.coins -= cost;
    home.expansions.push({
      id: slot.id,
      gx: slot.gx,
      gz: slot.gz,
      theme: th,
      unlockedAt: Date.now(),
    });
    const focus: [number, number] = [(slot.min[0] + slot.max[0]) * 0.5, (slot.min[1] + slot.max[1]) * 0.5];
    this.lastFrontierFocus = focus;
    this.frontier.sync(home.expansions, th, focus);
    this.host.syncExpansions?.(home.expansions);
    const nextAvail = computeDynamicFrontier(home.expansions, focus, 8);
    this.selectedSlotId = nextAvail[0]?.id ?? null;
    this.frontier.setSelectedSlot(this.selectedSlotId);
    const xp = addHomeXp(this.host.life, 36);
    recordHomeAction(this.host.life, this.host.dayKey(), 'build', 1);
    this.syncAfterMutation();
    const tDef = EXPANSION_THEMES[th];
    this.host.toast(
      xp.leveledUp
        ? `🎉 开垦成功！「${slot.name} · ${tDef.name}」已无缝并入（累计 ${home.expansions.length} 块），升至 Lv.${xp.newLevel}！`
        : `🗺️ 开垦成功！「${slot.name} · ${tDef.name}」已并入家园（累计 ${home.expansions.length} 块，可继续向外无限扩建）！`,
      4200,
    );
    return true;
  }

  private createVisual(def: BuildItemDef, phase = 0): SpawnedPackModel {
    if (def.asset.startsWith('procedural-')) return buildProceduralFacility(this.T, def.asset);
    return spawnPackModel(this.T, def.asset, Math.max(def.width, def.depth), {
      castShadow: def.solid || def.height > 1.8,
      outline: def.category === 'house',
      phaseOffset: phase,
    });
  }

  private refreshGhostModel() {
    const def = BUILD_ITEMS[this.selectedItemId];
    if (!def) return;
    if (this.ghostAssetKey === def.id && this.ghostMesh) return;
    if (this.ghostMesh) { this.ghostMesh.dispose(); this.ghostMesh = null; }
    this.ghostAssetKey = def.id;
    const applyTint = (g: any) => {
      g.traverse((n: any) => {
        if (!n.isMesh) return;
        n.castShadow = false;
        n.receiveShadow = false;
        n.layers.set(1);
        n.material = this.ghostValid ? this.ghostMatOk : this.ghostMatBad;
      });
    };
    this.ghostMesh = def.asset.startsWith('procedural-')
      ? buildProceduralFacility(this.T, def.asset)
      : spawnPackModel(this.T, def.asset, Math.max(def.width, def.depth), {castShadow: false, outline: false, onLoaded: applyTint});
    applyTint(this.ghostMesh.group);
    this.ghostGroup.add(this.ghostMesh.group);
  }

  private updatePointerWorld() {
    const cam = this.host.ctx.camera;
    this.raycaster.setFromCamera(this.pointerNDC, cam);
    const origin = this.raycaster.ray.origin;
    const dir = this.raycaster.ray.direction;
    if (Math.abs(dir.y) < 0.02) return;
    // Ray-march ground height for accurate placement across hills & terraces
    let hitX = origin.x + dir.x * 20, hitZ = origin.z + dir.z * 20, hitY = this.host.ground(hitX, hitZ) ?? 0;
    let prevDiff = origin.y - (this.host.ground(origin.x, origin.z) ?? 0);
    for (let t = 2; t <= 120; t += 1.0) {
      const px = origin.x + dir.x * t, py = origin.y + dir.y * t, pz = origin.z + dir.z * t;
      const gy = this.host.ground(px, pz);
      const fl = this.host.fluid(px, pz);
      const surf = gy === null ? fl : (fl !== null ? Math.max(gy, fl) : gy);
      if (surf === null) continue;
      const diff = py - surf;
      if (diff <= 0) {
        const frac = prevDiff > 0 ? prevDiff / (prevDiff - diff) : 1;
        const tt = t - 1 + frac;
        hitX = origin.x + dir.x * tt;
        hitZ = origin.z + dir.z * tt;
        hitY = this.host.ground(hitX, hitZ) ?? surf;
        break;
      }
      prevDiff = diff;
    }
    this.ghostPos = [Math.round(hitX * 4) / 4, hitY, Math.round(hitZ * 4) / 4];
  }

  private tryPlaceCurrent() {
    const def = BUILD_ITEMS[this.selectedItemId];
    if (!def) return;
    if (!isBuildItemUnlocked(this.host.life, def.id)) {
      this.host.toast(`需要家园 Lv.${def.unlockLevel} 解锁「${def.name}」`);
      return;
    }
    const home = ensureHome(this.host.life);
    const [x, gy, z] = this.ghostPos;
    const fl = this.host.fluid(x, z);
    const check = canPlaceProp(def, x, z, this.currentScale, home.placed, gy, fl, home.expansions);
    if (!check.ok) {
      this.host.toast(check.reason ?? '此处无法摆放');
      return;
    }
    if (this.host.life.coins < def.price) {
      this.host.toast(`贝壳不足：需要 ${def.price} 🐚（当前 ${this.host.life.coins} 🐚）`);
      return;
    }
    this.host.life.coins -= def.price;
    const y = def.waterAllowed && fl !== null && gy < fl ? fl : gy;
    const prop: PlacedProp = {
      id: `p-${Date.now().toString(36)}-${Math.floor(Math.random() * 999)}`,
      itemId: def.id, x, z, y, yaw: this.previewYaw, scale: this.currentScale,
    };
    home.placed.push(prop);
    this.mountProp(prop);
    const xpGain = addHomeXp(this.host.life, def.category === 'house' ? 16 : 8);
    const ev = recordHomeAction(this.host.life, this.host.dayKey(), 'build', 1);
    this.syncAfterMutation();
    let msg = `已摆放「${def.name}」`;
    if (xpGain.leveledUp || ev.xpResult.leveledUp) {
      const lv = Math.max(xpGain.newLevel, ev.xpResult.newLevel);
      const unlocked = [...xpGain.newlyUnlocked, ...ev.xpResult.newlyUnlocked];
      msg = `🎉 家园升到 Lv.${lv}！${unlocked.length ? '解锁：' + unlocked.slice(0, 3).join('、') : ''}`;
    } else if (ev.completedTasks.length) {
      msg += ` · 今日手账完成 +${ev.completedTasks[0].rewardCoins} 🐚`;
    }
    this.host.toast(msg, 3200);
  }

  applyPreset(presetId: string) {
    const preset = HOME_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    if (!isPresetUnlocked(this.host.life, preset.id)) {
      this.host.toast(`需要家园 Lv.${preset.unlockLevel} 解锁预设「${preset.name}」`);
      return;
    }
    if (this.host.life.coins < preset.discountPrice) {
      this.host.toast(`贝壳不足：套组优惠价 ${preset.discountPrice} 🐚（当前 ${this.host.life.coins} 🐚）`);
      return;
    }
    const home = ensureHome(this.host.life);
    const [cx, , cz] = this.camFocus;
    const toAdd: PlacedProp[] = [];
    for (const entry of preset.items) {
      const def = BUILD_ITEMS[entry.itemId];
      if (!def) continue;
      const x = cx + entry.dx, z = cz + entry.dz;
      const gy = this.host.ground(x, z);
      const fl = this.host.fluid(x, z);
      const scale = entry.scale ?? 1;
      const check = canPlaceProp(def, x, z, scale, [...home.placed, ...toAdd], gy, fl, home.expansions);
      if (!check.ok || gy === null) continue;
      const y = def.waterAllowed && fl !== null && gy < fl ? fl : gy;
      toAdd.push({
        id: `pr-${Date.now().toString(36)}-${Math.floor(Math.random() * 9999)}`,
        itemId: def.id, x, z, y, yaw: entry.yaw, scale,
      });
    }
    if (toAdd.length < 2) {
      this.host.toast('当前焦点空地太挤或靠近时光门，请用 WASD 移到镜湖/公园/农场开阔处再铺设预设', 3600);
      return;
    }
    this.host.life.coins -= preset.discountPrice;
    for (const p of toAdd) {
      home.placed.push(p);
      this.mountProp(p);
    }
    const xp = addHomeXp(this.host.life, 28);
    recordHomeAction(this.host.life, this.host.dayKey(), 'build', 1);
    this.syncAfterMutation();
    this.host.toast(
      xp.leveledUp
        ? `✨ 已铺设「${preset.name}」（${toAdd.length} 件）并升到家园 Lv.${xp.newLevel}！`
        : `✨ 已铺设「${preset.name}」（${toAdd.length} 件）· 看看有没有吸引新小动物来访！`,
      3800,
    );
  }

  private tryDemolishAt(x: number, z: number) {
    const home = ensureHome(this.host.life);
    let bestIdx = -1, bestDist = 3.2;
    for (let i = 0; i < home.placed.length; i++) {
      const p = home.placed[i];
      const def = BUILD_ITEMS[p.itemId];
      const r = def ? Math.max(def.width, def.depth) * p.scale * 0.55 : 1.5;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < Math.max(r, 1.8) && d < bestDist) { bestDist = d; bestIdx = i; }
    }
    if (bestIdx < 0) {
      this.host.toast('附近没有可拆除的自建物件', 1400);
      return;
    }
    const [removed] = home.placed.splice(bestIdx, 1);
    const live = this.props.get(removed.id);
    if (live) {
      live.disposeFarmPlot?.();
      live.model.dispose();
      this.props.delete(removed.id);
    }
    const def = BUILD_ITEMS[removed.itemId];
    if (def?.farmBed) {
      delete this.host.life.plots[`home-plot-${removed.id}`];
    }
    const refund = def ? def.price : 0;
    this.host.life.coins += refund;
    this.syncAfterMutation();
    this.host.toast(`已收回「${def?.name ?? removed.itemId}」，退还 ${refund} 🐚`, 2200);
  }

  private mountProp(prop: PlacedProp) {
    const def = BUILD_ITEMS[prop.itemId];
    if (!def) return;
    const model = this.createVisual(def, Math.random());
    model.group.position.set(prop.x, prop.y, prop.z);
    model.group.rotation.y = prop.yaw;
    model.group.scale.setScalar(prop.scale);
    this.root.add(model.group);
    let disposeFarmPlot: (() => void) | undefined;
    if (def.farmBed && this.host.farmRegistry) {
      const innerPad = def.id === 'farm-bed-stone' ? 0.34 : 0.26;
      disposeFarmPlot = this.host.farmRegistry.registerPlot({
        id: `home-plot-${prop.id}`,
        x: prop.x,
        y: prop.y,
        z: prop.z,
        yaw: prop.yaw,
        width: Math.max(1.1, (def.width - innerPad) * prop.scale),
        depth: Math.max(0.9, (def.depth - innerPad) * prop.scale),
        rows: def.farmBed.rows,
        cols: def.farmBed.cols,
        soilOffsetY: def.farmBed.soilOffsetY * prop.scale,
        noWeeds: def.farmBed.noWeeds,
        extraYield: def.farmBed.extraYield,
      });
    }
    this.props.set(prop.id, {data: prop, model, disposeFarmPlot});
  }

  rebuildFromSave() {
    for (const live of this.props.values()) {
      live.disposeFarmPlot?.();
      live.model.dispose();
    }
    this.props.clear();
    const home = ensureHome(this.host.life);
    this.frontier.sync(home.expansions, this.selectedTheme);
    this.host.syncExpansions?.(home.expansions);
    for (const p of home.placed) this.mountProp(p);
    this.syncCollisionAndHabitats();
  }

  private syncAfterMutation() {
    this.syncCollisionAndHabitats();
    this.host.save();
    this.host.onChange?.();
  }

  private syncCollisionAndHabitats() {
    const home = ensureHome(this.host.life);
    const boxes: Box[] = [];
    for (const p of home.placed) {
      const b = buildPropCollisionBox(p);
      if (b) boxes.push(b);
    }
    this.host.syncCollision(boxes);
    this.refreshVisitors();
  }

  private refreshVisitors() {
    const evals = evaluateHabitats(this.host.life);
    const wanted = new Set<string>();
    for (const ev of evals) {
      if (!ev.ready || !ev.anchor) continue;
      wanted.add(ev.species.id);
      if (!this.visitors.has(ev.species.id)) {
        const model = spawnPackModel(this.T, ev.species.asset, ev.species.size, {
          castShadow: false, outline: false, phaseOffset: Math.random(),
        });
        const [ax, az] = ev.anchor;
        const ay = this.host.ground(ax, az) ?? 0;
        model.group.position.set(ax, ay, az);
        this.root.add(model.group);
        this.visitors.set(ev.species.id, {
          speciesId: ev.species.id, evalData: ev, model,
          anchor: [ax, az], pos: [ax, az], target: [ax, az], yaw: Math.random() * Math.PI * 2, wait: 1.5,
        });
      }
    }
    for (const [id, v] of this.visitors) {
      if (!wanted.has(id)) {
        v.model.dispose();
        this.visitors.delete(id);
      }
    }
  }

  /** Dynamic interactables for placed facilities (sprinklers, souvenir pedestals) & live habitat visitors. */
  getInteractables(player: PlayerHandle): Interactable[] {
    const out: Interactable[] = [];
    const home = ensureHome(this.host.life);
    const now = Date.now();

    for (const prop of home.placed) {
      if (prop.itemId === 'facility-sprinkler') {
        const active = home.sprinklerChargedUntil > now;
        const hrs = Math.max(0, Math.ceil((home.sprinklerChargedUntil - now) / 3600_000));
        out.push({
          id: `home-sprinkler-${prop.id}`,
          position: [prop.x, prop.y, prop.z],
          radius: 2.6,
          prompt: () => player.element === 3
            ? {title: '雷属性充能洒水泉', sub: active ? `已充能（剩余约 ${hrs} 小时），再次充能刷新` : '充能后自动为梯田全部作物保水 12 小时'}
            : {title: active ? `元素洒水泉运转中（余 ${hrs}h）` : '元素洒水泉（未充能）', sub: '切雷属性（4）按 F 即可充能自动浇水'},
          act: () => {
            if (player.element !== 3) {
              this.host.toast('切到雷属性（按 4）就能给洒水泉充能！');
              return;
            }
            const watered = chargeHomeSprinkler(this.host.life, Date.now());
            const ev = recordHomeAction(this.host.life, this.host.dayKey(), 'element', 1);
            this.host.save();
            player.mood('Happy', 1.0);
            this.host.toast(`⚡ 洒水泉已满电！${watered > 0 ? `已自动浇透 ${watered} 块作物，` : ''}12 小时自动保水${ev.completedTasks.length ? ' · 今日手账完成！' : ''}`, 3600);
          },
        });
      } else if (prop.itemId === 'facility-pedestal') {
        out.push({
          id: `home-pedestal-${prop.id}`,
          position: [prop.x, prop.y, prop.z],
          radius: 2.4,
          prompt: () => {
            const current = home.souvenirSlots[prop.id];
            const owned = this.host.souvenirs();
            if (!owned.length) return {title: '史书纪念展台', sub: '通关任意历史关卡获得纪念品后，可在这里展出'};
            return {
              title: current ? `正在展出：${souvenirNameById(current)}` : '摆放历史纪念品',
              sub: `已收集 ${owned.length} 件纪念品 · 按 F 轮换展品`,
            };
          },
          act: () => {
            const owned = this.host.souvenirs();
            if (!owned.length) {
              this.host.toast('先去凝露港时光门通关任意历史关卡，拿回你的第一件纪念品吧！', 3200);
              return;
            }
            const cur = home.souvenirSlots[prop.id];
            const idx = cur ? (owned.indexOf(cur) + 1) % owned.length : 0;
            const next = owned[idx];
            home.souvenirSlots[prop.id] = next;
            this.host.save();
            player.mood('Happy', 0.9);
            this.host.toast(`✦ 展台已换上：${souvenirNameById(next)}`, 2800);
          },
        });
      }
    }

    for (const v of this.visitors.values()) {
      const sp = v.evalData.species;
      const fav = ITEMS[sp.favoriteCrop];
      const hasFav = (this.host.life.bag[sp.favoriteCrop] ?? 0) > 0;
      const y = this.host.ground(v.pos[0], v.pos[1]) ?? 0;
      out.push({
        id: `visitor-${sp.id}`,
        position: [v.pos[0], y, v.pos[1]],
        radius: 2.5,
        prompt: () => hasFav
          ? {title: `投喂${sp.icon}${sp.name}（${fav?.name ?? '零食'}）`, sub: '它会很开心，并回赠稀有种子与家园经验！'}
          : {title: `观察来客：${sp.icon}${sp.name}`, sub: `最爱吃${fav?.name ?? '自种作物'} · 按 F 记入栖地手账`},
        act: () => {
          let fed = false;
          if (hasFav) {
            this.host.life.bag[sp.favoriteCrop]--;
            if (this.host.life.bag[sp.favoriteCrop] <= 0) delete this.host.life.bag[sp.favoriteCrop];
            fed = true;
          }
          const res = recordVisitorInteraction(this.host.life, sp.id, this.host.dayKey(), fed);
          const xp = addHomeXp(this.host.life, fed ? 18 : 10);
          const ev = recordHomeAction(this.host.life, this.host.dayKey(), 'visit', 1);
          if (res.giftedSeed) addItem(this.host.life, res.giftedSeed, 1);
          this.host.save();
          player.mood('Happy', 1.1);
          const giftName = res.giftedSeed ? ITEMS[res.giftedSeed]?.name : null;
          const parts = [
            fed ? `${sp.icon}${sp.name}开心地吃掉了${fav?.name}！` : `已记录栖地来客 ${sp.icon}${sp.name}`,
          ];
          if (giftName) parts.push(`回赠 ${giftName} 🌱`);
          if (xp.leveledUp || ev.xpResult.leveledUp) parts.push(`家园升至 Lv.${Math.max(xp.newLevel, ev.xpResult.newLevel)}！`);
          this.host.toast(parts.join(' · '), 3600);
          this.host.onChange?.();
        },
      });
    }

    return out;
  }

  update(time: number, dt: number) {
    updatePackAnimations(dt);

    // Animate procedural facility crystals
    for (const live of this.props.values()) {
      const crystal = live.model.group.getObjectByName('spin-crystal');
      if (crystal) {
        crystal.rotation.y = time * 1.4;
        crystal.position.y = (live.data.itemId === 'facility-fountain' ? 1.32 : 1.44) + Math.sin(time * 2.5) * 0.05;
      }
    }

    // Gentle wandering for habitat visitors
    for (const v of this.visitors.values()) {
      const dx = v.target[0] - v.pos[0], dz = v.target[1] - v.pos[1];
      const dist = Math.hypot(dx, dz);
      if (dist > 0.12) {
        const step = Math.min(dist, 0.72 * dt);
        v.pos[0] += (dx / dist) * step;
        v.pos[1] += (dz / dist) * step;
        const targetYaw = Math.atan2(dx, dz);
        let diff = targetYaw - v.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        v.yaw += diff * Math.min(1, dt * 5);
        v.model.setMotion?.(true);
      } else {
        v.model.setMotion?.(false);
        v.wait -= dt;
        if (v.wait <= 0) {
          v.wait = 2.4 + Math.random() * 3.2;
          const ang = Math.random() * Math.PI * 2;
          const r = 0.8 + Math.random() * 2.6;
          v.target = [v.anchor[0] + Math.cos(ang) * r, v.anchor[1] + Math.sin(ang) * r];
        }
      }
      const gy = this.host.ground(v.pos[0], v.pos[1]) ?? 0;
      const fl = this.host.fluid(v.pos[0], v.pos[1]);
      const y = fl !== null && gy < fl ? fl : gy;
      v.model.group.position.set(v.pos[0], y, v.pos[1]);
      v.model.group.rotation.y = v.yaw;
    }

    if (!this.active) return;

    // Build mode orbit camera movement (auto-expands infinitely with unlocked territories!)
    const mx = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const mz = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    if (mx || mz) {
      const home = ensureHome(this.host.life);
      const b = computeExpandedBounds(home.expansions);
      const len = Math.hypot(mx, mz) || 1;
      const fx = -Math.sin(this.camYaw), fz = -Math.cos(this.camYaw);
      const rx = Math.cos(this.camYaw), rz = -Math.sin(this.camYaw);
      const panSpeed = this.camDist * 0.9 * dt;
      this.camFocus[0] = Math.max(b.min[0] - 55, Math.min(b.max[0] + 55, this.camFocus[0] + ((rx * mx + fx * mz) / len) * panSpeed));
      this.camFocus[2] = Math.max(b.min[2] - 20, Math.min(b.max[2] + 55, this.camFocus[2] + ((rz * mx + fz * mz) / len) * panSpeed));
      this.camFocus[1] = this.host.ground(this.camFocus[0], this.camFocus[2]) ?? 0.6;
      if (this.expandMode && Math.hypot(this.camFocus[0] - this.lastFrontierFocus[0], this.camFocus[2] - this.lastFrontierFocus[1]) > 18) {
        this.lastFrontierFocus = [this.camFocus[0], this.camFocus[2]];
        this.frontier.refreshFrontierAround(home.expansions, this.selectedTheme, this.lastFrontierFocus);
        this.host.onChange?.();
      }
    }

    const cam = this.host.ctx.camera;
    const cx = this.camFocus[0] + Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
    const cy = this.camFocus[1] + Math.sin(this.camPitch) * this.camDist;
    const cz = this.camFocus[2] + Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
    cam.position.set(cx, cy, cz);
    cam.lookAt(this.camFocus[0], this.camFocus[1] + 0.5, this.camFocus[2]);
    cam.updateMatrixWorld();

    // Update Ghost transform & validity color
    const def = BUILD_ITEMS[this.selectedItemId];
    if (def && !this.demolishMode && !this.expandMode) {
      const home = ensureHome(this.host.life);
      const [gx, gy, gz] = this.ghostPos;
      const fl = this.host.fluid(gx, gz);
      const check = canPlaceProp(def, gx, gz, this.currentScale, home.placed, gy, fl, home.expansions);
      const unlocked = isBuildItemUnlocked(this.host.life, def.id);
      const afford = this.host.life.coins >= def.price;
      this.ghostValid = check.ok && unlocked && afford;
      this.ghostReason = !unlocked ? `需 Lv.${def.unlockLevel}` : !afford ? `需 ${def.price} 🐚` : (check.reason ?? '');
      const y = def.waterAllowed && fl !== null && gy < fl ? fl : gy;
      this.ghostGroup.position.set(gx, y, gz);
      this.ghostGroup.rotation.y = this.previewYaw;
      this.ghostGroup.scale.setScalar(this.currentScale);
      const radius = Math.max(def.width, def.depth) * 0.52;
      this.ghostRing.scale.set(radius, radius, 1);
      this.ghostRing.material.color.setHex(this.ghostValid ? 0x45c49e : 0xe35d5b);
      if (this.ghostMesh) {
        const mat = this.ghostValid ? this.ghostMatOk : this.ghostMatBad;
        this.ghostMesh.group.traverse((n: any) => { if (n.isMesh) n.material = mat; });
      }
    }
  }

  dispose() {
    for (const {target, type, fn} of this.listeners) target.removeEventListener(type, fn);
    for (const live of this.props.values()) {
      live.disposeFarmPlot?.();
      live.model.dispose();
    }
    for (const v of this.visitors.values()) v.model.dispose();
    this.frontier.dispose();
    this.ghostMesh?.dispose();
    this.root.removeFromParent();
  }
}
