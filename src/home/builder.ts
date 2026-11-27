import {BuildHistory} from './build-history';
import {groundTile} from './jiangnan';
import {updateGrassExclusions, type GrassExcludeBox} from './foliage/grass-ism';
import {nativeLane, quayPavilion} from './layout';
import {isInsideHomeTerritory} from '../world/expansion';
import type {GroundFinish} from '../life/state';
import {isInPlazaNoBuild} from './build-catalog';
export type BuildTool = 'place' | 'move' | GroundFinish;
import {BUILD_CATALOG, BUILD_ITEMS, HOME_PRESETS, propCollisionParts, canPlaceProp, type BuildItemDef} from './build-catalog';
import {buildProceduralFacility} from './poi-visuals';
import {spawnPackModel, updatePackAnimations, type SpawnedPackModel} from './model-pack';
import {FrontierRenderer} from './frontier';
import {VoxelEngine} from './voxel-engine';
import {BUILTIN_VOXEL_BLUEPRINTS, VOXEL_ITEMS} from './voxel-catalog';
import {RanchRuntime} from './ranch-runtime';
import {addItem, ensureHome, type ExpandedTile, type ExpansionThemeId, type LifeData, type PlacedProp} from '../life/state';
import {addHomeXp, grantStarterHomeFunds, isBuildItemUnlocked, isPresetUnlocked, recordHomeAction} from '../life/unlocks';
import {evaluateHabitats, recordVisitorInteraction, type HabitatEvaluation} from '../life/habitat';
import {chargeHomeSprinkler} from '../life/cultivation';
import {
  MACHINE_NAMES,
  PROP_TO_MACHINE,
  availableArtisanRecipes,
  boostMachineWithElement,
  collectMachine,
  detectNearbyHoney,
  isMachineReady,
  machineProgress,
  startBeehiveCycle,
  startMachine,
} from '../life/artisan';
import {collectFishPond, fulfillPondWish, stepFishPond, stockFishPond} from '../life/fishpond';
import {claimDriftBottle, getDailyHistoryBlessing, maxDailyDriftBottles} from '../life/daily-history-link';
import {type EncounterEnv, generateDailyEncounters, RANCH_SPECIES_MAP} from '../life/ranch';
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
  nativeFootprints?: PlacedProp[];
  souvenirs: () => string[];
  dayKey: () => string;
  mmdd?: () => string;
  env?: () => EncounterEnv;
  ground: (x: number, z: number) => number | null;
  fluid: (x: number, z: number) => number | null;
  syncCollision: (boxes: Box[]) => void;
  syncExpansions?: (expansions: ExpandedTile[]) => void;
  farmRegistry?: FarmRegistry;
  openMuseum?: () => void;
  teleport?: (pos: Vec) => void;
  onFloatText?: (pos: Vec, text: string, color: string) => void;
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

function souvenirNameById(id: string): string {
  for (const d of Object.values(days)) {
    const c = d.chapters.find(ch => ch.id === id);
    if (c) return `${c.year} · ${c.souvenir}`;
  }
  return id;
}

/**
 * Owns player-built structures/POIs, Storybook Voxel-Craft engine, Ranch & Wild Encounter runtime,
 * live habitat visitors, dynamic collision synchronization, and V-key Build Mode.
 */
export class HomeBuilder {
  active = false;
  selectedItemId: string = BUILD_CATALOG[0].id;
  demolishMode = false;
  expandMode = false;
  voxelMode = false;
  selectedVoxelId = 'vx-plaster';
  voxelRot = 0;
  voxelTint: number | null = null;
  voxelBlueprintId = '';
  selectedSlotId: string | null = null;
  selectedTheme: ExpansionThemeId = 'farmland';
  previewYaw = 0;
  previewScaleIdx = 1;
  readonly frontier: FrontierRenderer;
  readonly voxels: VoxelEngine;
  readonly ranch: RanchRuntime;

  private lastFrontierFocus: [number, number] = [-30, 142];
  private readonly scales = [0.85, 1.0, 1.2];
  private root: any;
  private props = new Map<string, LiveProp>();
  private visitors = new Map<string, LiveVisitor>();
  private ghostGroup: any;
  private ghostRing: any;
  readonly history = new BuildHistory();
  tool: BuildTool = 'place';
  presetId = '';
  private movingId = '';
  private tiles: SpawnedPackModel[] = [];
  private groupPreview: SpawnedPackModel[] = [];
  private surfacePreview: SpawnedPackModel | null = null;
  private surfaceKey = '';
  private pointerHit = true;
  private ghostPos: Vec = [0, 0, 48];
  private ghostValid = false;
  private ghostReason = '';
  private ghostMesh: SpawnedPackModel | null = null;
  private ghostAssetKey = '';
  private lastVoxelCell: [number, number, number] | null = null;
  private bounceCooldown = 0;

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

    this.voxels = new VoxelEngine({
      ctx: host.ctx,
      life: host.life,
      ground: host.ground,
      souvenirs: host.souvenirs,
    });

    this.ranch = new RanchRuntime({
      ctx: host.ctx,
      life: host.life,
      dayKey: host.dayKey,
      env: () => host.env?.() ?? {season: 0, weather: 'clear', hour: new Date().getHours(), historyDay: true},
      ground: host.ground,
      fluid: host.fluid,
      voxelPens: () => this.voxels.fencedPastures,
      save: host.save,
      toast: host.toast,
      onChange: host.onChange,
    });

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
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'ShiftLeft', 'ShiftRight', 'Backspace', 'Delete'].includes(e.code)) {
        this.keys.add(e.code);
      }
      if (!e.repeat && (e.ctrlKey || e.metaKey) && ['KeyZ', 'KeyY'].includes(e.code)) {
        e.preventDefault(); this.restore(e.shiftKey || e.code === 'KeyY'); return;
      }
      if (!e.repeat) {
        if (e.code === 'KeyQ') {
          if (this.voxelMode) { this.voxelRot = (this.voxelRot + 1) % 4; this.host.toast(`积木朝向：${this.voxelRot * 90}°`, 1000); }
          else this.previewYaw += Math.PI / 12;
        } else if (e.code === 'KeyE') {
          if (this.voxelMode) { this.voxelRot = (this.voxelRot + 3) % 4; this.host.toast(`积木朝向：${this.voxelRot * 90}°`, 1000); }
          else this.previewYaw -= Math.PI / 12;
        } else if (e.code === 'KeyR' && !this.voxelMode) {
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
        const rect = dom.getBoundingClientRect();
        this.pointerNDC.set((e.clientX - rect.left) / rect.width * 2 - 1, 1 - (e.clientY - rect.top) / rect.height * 2);
        if (this.expandMode) {
          this.raycaster.setFromCamera(this.pointerNDC, this.host.ctx.camera);
          const hitSlot = this.frontier.pickSlot(this.raycaster);
          if (hitSlot) this.selectFrontierSlot(hitSlot);
          return;
        }
        this.updatePointerWorld();
        if (this.voxelMode) {
          this.clickVoxel(e.shiftKey || e.altKey, e.altKey);
          return;
        }
        this.clickGround();
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
    this.history.clear();
    this.active = true;
    this.keys.clear();
    this.dragging = false;
    this.lastVoxelCell = null;
    const cam = this.host.ctx.camera;
    this.savedCam = {pos: cam.position.clone(), target: this.host.ctx.controls.target.clone(), fov: cam.fov};
    const startX = playerPos[0], startZ = Math.max(playerPos[2], 32);
    this.camFocus = [startX, this.host.ground(startX, startZ) ?? 0, startZ];
    this.ghostPos = [...this.camFocus];
    if (grantStarterHomeFunds(this.host.life)) {
      this.host.save();
      this.host.toast('欢迎开启家园建造！已发放 40 🐚 开垦启动金', 3800);
    }
    this.refreshGhostModel();
    this.ghostGroup.visible = !this.demolishMode && !this.expandMode && !this.voxelMode;
    this.frontier.setPreviewVisible(this.expandMode);
    this.voxels.setPreview(false);
    this.host.onChange?.();
  }

  exit() {
    if (!this.active) return;
    this.resetTool();
    this.history.clear();
    this.active = false;
    this.expandMode = false;
    this.voxelMode = false;
    this.keys.clear();
    this.dragging = false;
    this.ghostGroup.visible = false;
    this.frontier.setPreviewVisible(false);
    this.voxels.setPreview(false);
    if (this.savedCam) {
      this.host.ctx.camera.fov = this.savedCam.fov;
      this.host.ctx.camera.updateProjectionMatrix();
      this.savedCam = null;
    }
    this.host.onChange?.();
  }

  selectItem(itemId: string) {
    if (!BUILD_ITEMS[itemId]) return;
    this.resetTool();
    this.selectedItemId = itemId;
    this.demolishMode = false;
    this.expandMode = false;
    this.voxelMode = false;
    this.frontier.setPreviewVisible(false);
    this.voxels.setPreview(false);
    this.refreshGhostModel();
    if (this.active) this.ghostGroup.visible = true;
    this.host.onChange?.();
  }

  setVoxelMode(on: boolean) {
    this.resetTool();
    this.voxelMode = on;
    if (on) {
      this.expandMode = false;
      this.demolishMode = false;
      this.frontier.setPreviewVisible(false);
      this.ghostGroup.visible = false;
      this.lastVoxelCell = null;
    } else {
      this.voxels.setPreview(false);
    }
    this.host.onChange?.();
  }

  selectVoxelBlock(id: string) {
    if (!VOXEL_ITEMS[id]) return;
    this.voxelMode = true;
    this.expandMode = false;
    this.demolishMode = false;
    this.voxelBlueprintId = '';
    this.selectedVoxelId = id;
    this.frontier.setPreviewVisible(false);
    this.ghostGroup.visible = false;
    this.host.onChange?.();
  }

  setVoxelTint(hex: number | null) {
    this.voxelTint = hex;
    this.host.onChange?.();
  }

  selectVoxelBlueprint(id: string) {
    this.voxelMode = true;
    this.expandMode = false;
    this.demolishMode = false;
    this.voxelBlueprintId = this.voxelBlueprintId === id ? '' : id;
    this.frontier.setPreviewVisible(false);
    this.ghostGroup.visible = false;
    this.host.onChange?.();
  }

  saveCurrentVoxelBlueprint(name?: string) {
    const bp = this.voxels.saveSelectionBlueprint(name ?? '', this.camFocus[0], this.camFocus[2], 6);
    if (!bp) {
      this.host.toast('镜头中心 6 米内还没有积木可保存为蓝图', 2400);
      return;
    }
    this.host.save();
    this.host.toast(`🧱 已保存自定义蓝图「${bp.name}」（共 ${bp.blocks.length} 块积木）！`, 3000);
    this.host.onChange?.();
  }

  setDemolish(on: boolean) {
    this.resetTool();
    this.demolishMode = on;
    if (on) {
      this.expandMode = false;
      this.frontier.setPreviewVisible(false);
    }
    if (this.active) this.ghostGroup.visible = !on && !this.expandMode && !this.voxelMode;
    this.host.onChange?.();
  }

  setExpandMode(on: boolean) {
    this.resetTool();
    this.expandMode = on;
    if (on) {
      this.demolishMode = false;
      this.voxelMode = false;
      this.voxels.setPreview(false);
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
      this.ghostGroup.visible = !on && !this.demolishMode && !this.voxelMode;
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
        ? '🏖️ 已开启创意沙盒扩建：无限领土 0 贝壳自由开垦'
        : '🐚 已切回常规养成模式（攒贝壳开垦领土与采买 POI）',
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
    const avail = computeDynamicFrontier(home.expansions, [(targetSlot.min[0] + targetSlot.max[0]) * 0.5, (targetSlot.min[1] + targetSlot.max[1]) * 0.5], 24);
    const slot = avail.find(s => s.gx === targetSlot.gx && s.gz === targetSlot.gz);
    if (!slot) {
      this.host.toast('请先选择一块与当前已拥有领土相邻的边疆地块', 2400);
      return false;
    }
    const cost = expansionCost(home.expansions.length, !!home.sandboxFreeExpand);
    if (this.host.life.coins < cost) {
      this.host.toast(`贝壳不足：开垦「${slot.name}」需要 ${cost} 🐚（当前 ${this.host.life.coins} 🐚）`, 3200);
      return false;
    }
    const before = this.history.begin(this.host.life);
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
    this.finishEdit(before);
    const tDef = EXPANSION_THEMES[th];
    this.host.toast(
      xp.leveledUp
        ? `🎉 开垦成功！「${slot.name} · ${tDef.name}」已无缝并入（累计 ${home.expansions.length} 块），升至 Lv.${xp.newLevel}！`
        : `🗺️ 开垦成功！「${slot.name} · ${tDef.name}」已并入家园（累计 ${home.expansions.length} 块）！`,
      4200,
    );
    return true;
  }

  private clickVoxel(lineMode: boolean, eyedropper: boolean) {
    this.raycaster.setFromCamera(this.pointerNDC, this.host.ctx.camera);
    const pick = this.voxels.pickTarget(this.raycaster, this.pointerHit ? this.ghostPos : null, this.demolishMode);
    if (!pick) return;

    if (eyedropper && pick.hitBlock) {
      this.selectedVoxelId = pick.hitBlock.blockId;
      this.voxelTint = pick.hitBlock.tint ?? null;
      this.voxelBlueprintId = '';
      this.host.toast(`🎨 已吸取积木：${VOXEL_ITEMS[this.selectedVoxelId]?.name ?? this.selectedVoxelId}`, 1400);
      this.host.onChange?.();
      return;
    }

    if (this.demolishMode) {
      if (!pick.hitCell) { this.host.toast('请点击要拆除的积木', 1500); return; }
      const before = this.history.begin(this.host.life);
      const res = this.voxels.removeBlock(pick.hitCell[0], pick.hitCell[1], pick.hitCell[2]);
      if (res.ok) {
        this.finishEdit(before);
        if (res.refunded > 0) this.host.toast(`已拆除积木 · 返还 ${res.refunded} 🐚`, 1200);
      }
      return;
    }

    const [tx, ty, tz] = pick.placeCell;
    const before = this.history.begin(this.host.life);

    // Blueprint stamping
    if (this.voxelBlueprintId) {
      const home = ensureHome(this.host.life);
      const bp = [...BUILTIN_VOXEL_BLUEPRINTS, ...(home.voxelBlueprints ?? [])].find(b => b.id === this.voxelBlueprintId);
      if (!bp) return;
      const res = this.voxels.stampBlueprint(bp, tx, ty, tz, this.voxelRot);
      if (!res.ok) { this.host.toast(res.reason ?? '无法放置蓝图', 2400); return; }
      addHomeXp(this.host.life, Math.min(40, res.placed * 2));
      recordHomeAction(this.host.life, this.host.dayKey(), 'build', 1);
      this.voxelBlueprintId = '';
      this.finishEdit(before);
      const penMsg = this.voxels.fencedPastures.length ? ` · 已识别 ${this.voxels.fencedPastures.length} 座自建围栏牧场！` : '';
      this.host.toast(`🧱 已搭建蓝图「${bp.name}」（${res.placed} 块 · ${res.totalCost}🐚）${penMsg}`, 3200);
      return;
    }

    // Shift-click straight line wall/row placement from lastVoxelCell!
    const cells: [number, number, number][] = [];
    if (lineMode && this.lastVoxelCell && this.lastVoxelCell[1] === ty) {
      const [sx, , sz] = this.lastVoxelCell;
      const dx = tx - sx, dz = tz - sz;
      const steps = Math.min(16, Math.max(Math.abs(dx), Math.abs(dz)));
      for (let i = 1; i <= steps; i++) {
        cells.push([Math.round(sx + (dx * i) / steps), ty, Math.round(sz + (dz * i) / steps)]);
      }
    } else {
      cells.push([tx, ty, tz]);
    }

    let placed = 0;
    let lastReason = '';
    for (const [cx, cy, cz] of cells) {
      const res = this.voxels.placeBlock(cx, cy, cz, this.selectedVoxelId, undefined, this.voxelRot, this.voxelTint);
      if (res.ok) placed++;
      else lastReason = res.reason ?? lastReason;
    }
    if (!placed) {
      if (lastReason) this.host.toast(lastReason, 1800);
      return;
    }
    this.lastVoxelCell = [tx, ty, tz];
    addHomeXp(this.host.life, Math.min(15, placed * 2));
    recordHomeAction(this.host.life, this.host.dayKey(), 'build', 1);
    this.finishEdit(before);
    if (VOXEL_ITEMS[this.selectedVoxelId]?.isFence && this.voxels.fencedPastures.length) {
      this.host.toast(`🪵 栅栏已连通！当前已识别 ${this.voxels.fencedPastures.length} 座闭合围栏放牧圈`, 2400);
    }
  }

  private createVisual(def: BuildItemDef, phase = 0): SpawnedPackModel {
    if (def.asset.startsWith('procedural-')) return buildProceduralFacility(this.T, def.asset);
    return spawnPackModel(this.T, def.asset, Math.max(def.width, def.depth), {
      castShadow: def.solid || def.height > 1.8,
      outline: false,
      phaseOffset: phase,
    });
  }

  private refreshGhostModel() {
    const def = BUILD_ITEMS[this.selectedItemId];
    if (!def) return;
    if (this.ghostAssetKey === def.id && this.ghostMesh) return;
    if (this.ghostMesh) { this.ghostMesh.dispose(); this.ghostMesh = null; }
    this.ghostAssetKey = def.id;
    this.ghostMesh = this.createVisual(def);
    this.ghostGroup.add(this.ghostMesh.group);
  }

  private updatePointerWorld() {
    const cam = this.host.ctx.camera;
    this.raycaster.setFromCamera(this.pointerNDC, cam);
    const origin = this.raycaster.ray.origin;
    const dir = this.raycaster.ray.direction;
    this.pointerHit = false;
    if (dir.y > -0.02) return;
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
        this.pointerHit = true;
        hitY = this.host.ground(hitX, hitZ) ?? surf;
        break;
      }
      prevDiff = diff;
    }
    this.ghostPos = [Math.round(hitX * 4) / 4, hitY, Math.round(hitZ * 4) / 4];
  }

  private resetTool() {
    const live = this.props.get(this.movingId);
    if (live) live.model.group.visible = true;
    this.movingId = ''; this.presetId = ''; this.tool = 'place';
    for (const preview of this.groupPreview) preview.dispose();
    this.groupPreview = []; this.surfacePreview?.dispose(); this.surfacePreview = null; this.surfaceKey = '';
    if (this.ghostMesh) this.ghostMesh.group.visible = true;
  }

  setTool(tool: BuildTool) {
    this.resetTool(); this.tool = tool; this.demolishMode = this.expandMode = this.voxelMode = false;
    this.frontier.setPreviewVisible(false); this.voxels.setPreview(false); this.host.onChange?.();
  }

  transform(scale: boolean) {
    if (this.voxelMode) {
      this.voxelRot = (this.voxelRot + 1) % 4;
      this.host.toast(`积木旋转：${this.voxelRot * 90}°`, 1000);
      return;
    }
    if (scale) this.previewScaleIdx = (this.previewScaleIdx + 1) % this.scales.length;
    else this.previewYaw += Math.PI / 12;
  }

  restore(redo: boolean) {
    if (!this.active || !this.history.restore(this.host.life, redo)) return;
    this.resetTool(); this.rebuildFromSave(); this.host.save(); this.host.onChange?.();
  }

  applyPreset(id: string) {
    const preset = HOME_PRESETS.find(p => p.id === id);
    if (!preset || !isPresetUnlocked(this.host.life, id)) { this.host.toast('景组尚未解锁'); return; }
    this.setTool('place'); this.presetId = id; this.previewYaw = 0; this.previewScaleIdx = 1;
    for (const entry of preset.items) {
      const model = this.createVisual(BUILD_ITEMS[entry.itemId]);
      this.root.add(model.group); this.groupPreview.push(model);
    }
    this.host.onChange?.();
  }

  private propPlan() {
    const home = ensureHome(this.host.life);
    const preset = HOME_PRESETS.find(p => p.id === this.presetId);
    const entries = preset?.items ?? [{itemId: this.selectedItemId, dx: 0, dz: 0, yaw: 0, scale: 1}];
    const items: PlacedProp[] = [];
    const cost = this.movingId ? 0 : (preset?.discountPrice ?? BUILD_ITEMS[this.selectedItemId].price);
    let reason = cost > this.host.life.coins ? '贝壳不足' : '';
    if (!preset && !this.movingId && !isBuildItemUnlocked(this.host.life, this.selectedItemId)) reason = '物件尚未解锁';
    const existing = [...(this.host.nativeFootprints ?? []), ...home.placed.filter(p => p.id !== this.movingId)];
    for (const entry of entries) {
      const def = BUILD_ITEMS[entry.itemId], scale = (entry.scale ?? 1) * this.currentScale;
      const c = Math.cos(this.previewYaw), s = Math.sin(this.previewYaw);
      const x = this.ghostPos[0] + (entry.dx * c + entry.dz * s) * this.currentScale;
      const z = this.ghostPos[2] + (entry.dz * c - entry.dx * s) * this.currentScale;
      const ground = this.host.ground(x, z), fluid = this.host.fluid(x, z);
      const yaw = this.previewYaw + entry.yaw;
      const check = canPlaceProp(def, x, z, scale, existing, ground, fluid, home.expansions, yaw);
      if (!reason && !check.ok) reason = def.name + ' · ' + check.reason;
      if (!reason && !def.waterAllowed) {
        for (const side of [-.5, .5]) for (const end of [-.5, .5]) {
          const dx = side * def.width * scale, dz = end * def.depth * scale;
          const px = x + dx * Math.cos(yaw) + dz * Math.sin(yaw), pz = z - dx * Math.sin(yaw) + dz * Math.cos(yaw);
          const floor = this.host.ground(px, pz), water = this.host.fluid(px, pz);
          if (floor === null || (water !== null && floor < water - .08)) reason = def.name + ' · 地基需要连续陆地';
          else if (ground !== null && Math.abs(floor - ground) > .55) reason = def.name + ' · 地基高差太大';
        }
      }
      const y = def.waterAllowed && fluid !== null ? Math.max(ground ?? fluid, fluid) : ground ?? 0;
      const item = {id: this.movingId, itemId: def.id, x, y, z, yaw, scale};
      items.push(item); existing.push(item);
    }
    return {items, cost, reason};
  }

  private closestProp() {
    const [x, , z] = this.ghostPos;
    const hits = [...this.props.values()].filter(({data: p}) => {
      const d = BUILD_ITEMS[p.itemId], dx = x - p.x, dz = z - p.z, c = Math.cos(p.yaw), s = Math.sin(p.yaw);
      return Math.abs(dx * c - dz * s) <= d.width * p.scale / 2 + .18 && Math.abs(dx * s + dz * c) <= d.depth * p.scale / 2 + .18;
    });
    return hits.sort((a, b) => Math.hypot(a.data.x - x, a.data.z - z) - Math.hypot(b.data.x - x, b.data.z - z))[0];
  }

  private clickGround() {
    if (!this.pointerHit) return;
    const home = ensureHome(this.host.life);
    if (this.demolishMode) {
      const live = this.closestProp(), cell = this.cell();
      const tile = home.paving.find(t => t.x === cell.x && t.z === cell.z);
      if (!live && !tile) { this.host.toast('请点选自建物件或地面'); return; }
      const before = this.history.begin(this.host.life);
      if (live) {
        const p = live.data; this.unmount(p.id); home.placed.splice(home.placed.findIndex(q => q.id === p.id), 1);
        delete home.souvenirSlots[p.id]; delete this.host.life.plots['home-plot-' + p.id];
        if (home.machines) delete home.machines[p.id];
        if (home.fishing?.ponds) delete home.fishing.ponds[p.id];
        this.host.life.coins += p.paidShells ?? BUILD_ITEMS[p.itemId].price;
      } else { home.paving.splice(home.paving.indexOf(tile!), 1); this.syncTiles(); }
      this.finishEdit(before); return;
    }
    if (this.tool === 'move' && !this.movingId) {
      const live = this.closestProp(); if (!live) { this.host.toast('请点选要移动的自建物件'); return; }
      this.movingId = live.data.id; this.selectedItemId = live.data.itemId;
      this.previewYaw = live.data.yaw;
      const scale = live.data.scale;
      if (!this.scales.includes(scale)) this.scales.push(scale);
      this.previewScaleIdx = this.scales.indexOf(scale);
      live.model.group.visible = false; this.refreshGhostModel(); this.host.onChange?.(); return;
    }
    if (this.tool !== 'place' && this.tool !== 'move') {
      const {x, z, reason} = this.cell();
      if (reason) { this.host.toast(reason); return; }
      const before = this.history.begin(this.host.life);
      const tile = home.paving.find(t => t.x === x && t.z === z);
      if (tile) tile.finish = this.tool; else home.paving.push({x, z, finish: this.tool});
      this.syncTiles(); this.finishEdit(before); return;
    }
    const plan = this.propPlan();
    if (plan.reason) { this.host.toast(plan.reason); return; }
    const before = this.history.begin(this.host.life);
    this.host.life.coins -= plan.cost;
    const listTotal = plan.items.reduce((sum, item) => sum + BUILD_ITEMS[item.itemId].price, 0);
    let listSpent = 0, allocated = 0;
    for (const item of plan.items) {
      if (this.movingId) {
        this.unmount(this.movingId);
        const saved = home.placed.find(p => p.id === this.movingId)!;
        this.mountProp(Object.assign(saved, item));
      } else {
        listSpent += BUILD_ITEMS[item.itemId].price;
        const paid = Math.round(plan.cost * listSpent / Math.max(1, listTotal));
        item.paidShells = paid - allocated; allocated = paid;
        item.id = crypto.randomUUID(); home.placed.push(item);
        this.mountProp(item);
      }
    }
    if (!this.movingId) {
      addHomeXp(this.host.life, this.presetId ? 28 : BUILD_ITEMS[this.selectedItemId].category === 'house' ? 16 : 8);
      recordHomeAction(this.host.life, this.host.dayKey(), 'build', 1);
    }
    if (this.movingId || this.presetId) this.resetTool();
    this.finishEdit(before);
  }

  private finishEdit(before: ReturnType<BuildHistory['begin']>) {
    this.history.commit(this.host.life, before); this.syncAfterMutation();
  }

  private unmount(id: string) {
    const live = this.props.get(id);
    live?.disposeFarmPlot?.(); live?.model.dispose(); this.props.delete(id);
  }

  private cell() {
    const home = ensureHome(this.host.life), x = Math.round(this.ghostPos[0] / 2) * 2, z = Math.round(this.ghostPos[2] / 2) * 2;
    let reason = '';
    if (!isInsideHomeTerritory(x, z, home.expansions, 1.1)) reason = '超出领土';
    if (isInPlazaNoBuild(x, z, 1.42, false) || (x === nativeLane.x && z >= nativeLane.firstZ && z <= nativeLane.lastZ)) reason = '公共石埠与岸路';
    const heights: number[] = [];
    for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) {
      const y = this.host.ground(x + dx, z + dz), water = this.host.fluid(x + dx, z + dz);
      if (y === null || (water !== null && y < water - .05)) reason = '需要连续的陆地';
      else heights.push(y);
    }
    if (Math.max(...heights) - Math.min(...heights) > .7) reason = '坡差太大';
    if (home.paving.some(t => t.x === x && t.z === z && t.finish === this.tool)) reason = '已经铺设';
    return {x, z, reason};
  }

  private syncTiles() {
    for (const m of this.tiles) m.dispose();
    this.tiles = ensureHome(this.host.life).paving.map(t => {
      const m = groundTile(this.host.ctx, t.finish, t.x, t.z, (x, z) => this.host.ground(x, z) ?? 0);
      this.root.add(m.group); return m;
    });
    this.syncGrassExclusionMask();
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
        x: prop.x, y: prop.y, z: prop.z, yaw: prop.yaw,
        width: Math.max(1.1, (def.width - innerPad) * prop.scale),
        depth: Math.max(0.9, (def.depth - innerPad) * prop.scale),
        rows: def.farmBed.rows, cols: def.farmBed.cols,
        soilOffsetY: def.farmBed.soilOffsetY * prop.scale,
        noWeeds: def.farmBed.noWeeds, extraYield: def.farmBed.extraYield,
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
    this.voxels.rebuildAll();
    this.syncTiles();
    this.syncCollisionAndHabitats();
  }

  private syncAfterMutation() {
    this.syncCollisionAndHabitats();
    this.host.save();
    this.host.onChange?.();
  }

  private syncGrassExclusionMask() {
    const home = ensureHome(this.host.life);
    const exclusions: GrassExcludeBox[] = [];
    // 1. Highest priority: ALL farm beds (wood/stone/large) so crops never compete with wild meadow grass
    for (const p of home.placed) {
      const def = BUILD_ITEMS[p.itemId];
      if (!def?.farmBed) continue;
      exclusions.push({
        x: p.x,
        z: p.z,
        hx: def.width * p.scale * 0.5 + 0.34,
        hz: def.depth * p.scale * 0.5 + 0.34,
        yaw: p.yaw,
      });
    }
    // 2. Player-placed solid buildings / machines / facilities
    for (const p of home.placed) {
      const def = BUILD_ITEMS[p.itemId];
      if (!def || def.farmBed || !def.solid) continue;
      exclusions.push({
        x: p.x,
        z: p.z,
        hx: def.width * p.scale * 0.5 + 0.22,
        hz: def.depth * p.scale * 0.5 + 0.22,
        yaw: p.yaw,
      });
    }
    // 3. Player-placed paving tiles (stone & dirt paths suppress grass cleanly)
    for (const t of home.paving) {
      if (t.finish === 'border') continue;
      exclusions.push({x: t.x, z: t.z, hx: 1.06, hz: 1.06, yaw: 0});
    }
    // 4. Native architectural footprints (pavilion, teahouses, huts — skip trees/aquatic handled statically)
    if (this.host.nativeFootprints) {
      for (const p of this.host.nativeFootprints) {
        const def = BUILD_ITEMS[p.itemId];
        if (!def?.solid || def.id.startsWith('nature-') || def.id.startsWith('waterside-')) continue;
        exclusions.push({
          x: p.x,
          z: p.z,
          hx: def.width * p.scale * 0.5 + 0.20,
          hz: def.depth * p.scale * 0.5 + 0.20,
          yaw: p.yaw,
        });
      }
    }
    // 5. Player-placed ornamental trees (keep bark bases free of grass poking through)
    for (const p of home.placed) {
      const def = BUILD_ITEMS[p.itemId];
      if (!def || def.farmBed || def.solid) continue;
      if (!def.tags?.includes('tree') && !/willow|ginkgo|bamboo|wisteria|palm/.test(def.id)) continue;
      const r = Math.max(0.68, Math.min(1.15, def.width * p.scale * 0.24 + 0.24));
      exclusions.push({x: p.x, z: p.z, hx: r, hz: r, yaw: p.yaw});
    }
    updateGrassExclusions(exclusions);
  }

  private syncCollisionAndHabitats() {
    const home = ensureHome(this.host.life);
    // Note: quayPavilion is already registered in base world boxes by buildQuay() with its exact width scale.
    const boxes: Box[] = [];
    for (const p of home.placed) boxes.push(...propCollisionParts(p));
    boxes.push(...this.voxels.collisionBoxes);
    this.host.syncCollision(boxes);
    this.syncGrassExclusionMask();
    this.refreshVisitors();
    this.ranch.sync();
  }

  /** Elemental melee slashes or skills accelerate nearby Artisan POIs & heat Hot Springs! */
  handleElementAttack(ev: {origin: Vec; forward?: Vec; range?: number; radius: number; element: number}) {
    const home = ensureHome(this.host.life);
    const now = Date.now();
    const reach = (ev.range ?? 0) * 0.5;
    const cx = ev.origin[0] + (ev.forward?.[0] ?? 0) * reach;
    const cz = ev.origin[2] + (ev.forward?.[2] ?? 0) * reach;
    let changed = false;
    for (const prop of home.placed) {
      const d = Math.hypot(prop.x - cx, prop.z - cz);
      if (d > ev.radius + reach + 2.2) continue;
      if (PROP_TO_MACHINE[prop.itemId] && home.machines?.[prop.id]) {
        const res = boostMachineWithElement(this.host.life, prop.id, ev.element, now);
        if (res.ok) {
          changed = true;
          const pct = Math.round(res.progress * 100);
          this.host.onFloatText?.([prop.x, prop.y + 1.6, prop.z], res.goldStar ? `✨ 金标加速 ${pct}%` : `⚡ 加速 ${pct}%`, res.goldStar ? '#ffd166' : '#7ef0c4');
        }
      } else if (prop.itemId === 'poi-hotspring' && (ev.element === 2 || ev.element === 0)) {
        home.hotSpringUntil = now + 6 * 3600_000;
        changed = true;
        this.host.onFloatText?.([prop.x, prop.y + 1.4, prop.z], '♨️ 温泉已注满暖意！', '#ffae52');
      }
    }
    if (changed) {
      recordHomeAction(this.host.life, this.host.dayKey(), 'element', 1);
      this.host.save();
    }
  }

  /** Called each play frame to drive bounce-pad voxels & ranch pets following the slime. */
  stepPlayer(player: PlayerHandle, time: number, dt: number) {
    this.ranch.update(time, dt, player.position);
    this.bounceCooldown = Math.max(0, this.bounceCooldown - dt);
    if (this.bounceCooldown <= 0 && player.grounded) {
      const [px, py, pz] = player.position;
      for (const pad of this.voxels.bouncePads) {
        if (px >= pad.x - 0.15 && px <= pad.x + 1.15 && pz >= pad.z - 0.15 && pz <= pad.z + 1.15 && Math.abs(py - (pad.y + 0.58)) < 0.45) {
          this.bounceCooldown = 0.7;
          player.launch([player.velocity[0] * 1.1, 13.8, player.velocity[2] * 1.1]);
          player.mood('Surprised', 0.9);
          this.host.toast('🟢 弹跳起飞！空中连按空格可展开滑翔伞', 1800);
          break;
        }
      }
    }
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

  /** Dynamic interactables for all Living POIs, Artisan Machines, Fish Ponds, Ranch Pets & Encounters. */
  getInteractables(player: PlayerHandle): Interactable[] {
    const out: Interactable[] = [];
    const home = ensureHome(this.host.life);
    const now = Date.now();
    const dayKey = this.host.dayKey();
    const mmdd = this.host.mmdd?.() ?? `${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`;
    const waystones = home.placed.filter(p => p.itemId === 'poi-waystone');

    for (const prop of home.placed) {
      const machineKind = PROP_TO_MACHINE[prop.itemId];
      if (machineKind) {
        const meta = MACHINE_NAMES[machineKind];
        const slot = home.machines?.[prop.id];
        out.push({
          id: `home-machine-${prop.id}`,
          position: [prop.x, prop.y, prop.z],
          radius: 2.8,
          prompt: () => {
            if (slot) {
              const ready = isMachineReady(this.host.life, slot, now);
              const outItem = ITEMS[slot.outputId];
              if (ready) {
                return {title: `收取 ${outItem?.icon ?? '✨'}${outItem?.name ?? slot.outputId}×${slot.outputCount}${slot.goldStar ? ' ★金标' : ''}`, sub: `${meta.name}已完工！按 F 收取`};
              }
              const pct = Math.round(machineProgress(slot, now) * 100);
              return {title: `${meta.icon}${meta.name}加工中（${pct}%）`, sub: `正在制作${outItem?.name ?? ''} · 按 F 或挥砍元素加速（${meta.elementHint}）`};
            }
            if (machineKind === 'beehive') {
              const honey = ITEMS[detectNearbyHoney(this.host.life, prop)];
              return {title: `🐝 启动蜂箱采蜜（预计：${honey?.icon ?? '🍯'}${honey?.name ?? '野蜜'}）`, sub: '周围 9m 内种植青莲/星露花可酿出高价花蜜！'};
            }
            const craftable = availableArtisanRecipes(this.host.life, machineKind);
            if (!craftable.length) {
              return {title: `${meta.icon}${meta.name}（空闲）`, sub: `背包缺少原料 · ${meta.elementHint}`};
            }
            const best = craftable[0];
            return {title: `${meta.icon} 投入加工：${best.name}`, sub: `消耗 ${ITEMS[best.inputId]?.icon ?? ''}${ITEMS[best.inputId]?.name ?? ''}×${best.inputCount} → ${ITEMS[best.outputId]?.icon ?? ''}${ITEMS[best.outputId]?.name ?? ''}×${best.outputCount}`};
          },
          act: () => {
            const cur = home.machines?.[prop.id];
            if (cur) {
              if (isMachineReady(this.host.life, cur, now)) {
                const col = collectMachine(this.host.life, prop.id, now);
                if (col.ok) {
                  const def = ITEMS[col.outputId!];
                  addHomeXp(this.host.life, col.goldStar ? 22 : 14);
                  this.host.save();
                  player.mood('Happy', 1.2);
                  this.host.toast(`🎉 收获 ${def?.icon ?? ''}${def?.name ?? col.outputId}×${col.count}${col.goldStar ? `（★金标赏金 +${col.bonusCoins}🐚）` : ''}`, 3400);
                  this.host.onChange?.();
                }
                return;
              }
              const boost = boostMachineWithElement(this.host.life, prop.id, player.element, now);
              if (boost.ok) {
                recordHomeAction(this.host.life, dayKey, 'element', 1);
                this.host.save();
                player.mood('Happy', 0.8);
                this.host.toast(`${boost.goldStar ? '✨ 完美元素共鸣！已升级金标品质 · ' : '⚡ 元素加速成功 · '}进度 ${Math.round(boost.progress * 100)}%`, 2600);
              } else {
                this.host.toast('本批元素加速已达上限，静候片刻即可收获！', 2200);
              }
              return;
            }
            if (machineKind === 'beehive') {
              const res = startBeehiveCycle(this.host.life, prop, now);
              if (res.ok) {
                this.host.save();
                this.host.toast(`🐝 小蜜蜂出动啦！正在采撷${ITEMS[res.honeyId]?.name ?? '花蜜'}`, 2600);
              }
              return;
            }
            const craftable = availableArtisanRecipes(this.host.life, machineKind);
            if (!craftable.length) {
              this.host.toast(`${meta.name}需要对应作物、渔获或牧场原料（可在 B 键「工坊集市」查看配方）`, 3200);
              return;
            }
            const res = startMachine(this.host.life, prop.id, craftable[0].id, now);
            if (res.ok) {
              this.host.save();
              this.host.toast(`${meta.icon} 已开始「${craftable[0].name}」，再按 F 或挥砍元素可主动提速！`, 3000);
              this.host.onChange?.();
            }
          },
        });
      } else if (prop.itemId === 'poi-hotspring') {
        const warm = (home.hotSpringUntil ?? 0) > now;
        out.push({
          id: `home-hotspring-${prop.id}`,
          position: [prop.x, prop.y, prop.z],
          radius: 3.0,
          prompt: () => warm
            ? {title: '♨️ 泡露天温泉（暖意融融）', sub: '放松身心，水豚会自动来泡澡并产出双倍温泉暖露！'}
            : {title: '♨️ 露天温泉池（微凉）', sub: '切火属性(3)或水属性(1)按 F 注入热泉水'},
          act: () => {
            if (!warm && player.element !== 2 && player.element !== 0) {
              this.host.toast('切火属性(3)或水属性(1)即可为露天温泉注入热泉！', 2600);
              return;
            }
            home.hotSpringUntil = now + 6 * 3600_000;
            this.host.save();
            player.mood('Happy', 1.6);
            this.host.toast('♨️ 温泉水汽氤氲！水豚们闻讯而来，家园充满惬意暖意～', 3200);
          },
        });
      } else if (prop.itemId === 'poi-observatory') {
        const blessing = getDailyHistoryBlessing(mmdd);
        const claimed = home.lastStargazeDay === dayKey;
        out.push({
          id: `home-observatory-${prop.id}`,
          position: [prop.x, prop.y, prop.z],
          radius: 2.8,
          prompt: () => ({
            title: claimed ? '🔭 观星授时台 · 查看今日生态预报' : '🔭 观星授时台 · 每日观星领馈赠',
            sub: `${blessing.icon} ${blessing.title} · 按 F 查看今日稀兽出没方位`,
          }),
          act: () => {
            const spots = generateDailyEncounters(this.host.life, dayKey, this.host.env?.() ?? {season: 0, weather: 'clear', hour: new Date().getHours(), historyDay: true});
            const list = spots.map(s => `${RANCH_SPECIES_MAP[s.speciesId]?.icon ?? ''}${RANCH_SPECIES_MAP[s.speciesId]?.name ?? ''}(${s.zone})`).join('、');
            if (!claimed) {
              home.lastStargazeDay = dayKey;
              addItem(this.host.life, 'seed-starlight', 1);
              addHomeXp(this.host.life, 18);
              this.host.save();
              this.host.toast(`🔭 观星获赠 🌟星露荧光花种子 ×1！今日野外稀兽：${list || '已被你全部结识！'}`, 4800);
            } else {
              this.host.toast(`🔭 ${blessing.title} · 今日尚未结识的野外稀兽：${list || '已全部结识！'}`, 4400);
            }
            player.mood('Happy', 1.2);
          },
        });
      } else if (prop.itemId === 'poi-glider-tower') {
        out.push({
          id: `home-glider-${prop.id}`,
          position: [prop.x, prop.y, prop.z],
          radius: 2.8,
          prompt: () => ({title: '🎈 乘风热气球升空', sub: '按 F 直冲 24 米高空，连按空格展开滑翔伞俯瞰凝露港！'}),
          act: () => {
            player.launch([0, 19.5, 0]);
            player.mood('Surprised', 1.2);
            this.host.toast('🎈 热气球升空！在空中按空格展开滑翔伞自由翱翔！', 2800);
          },
        });
      } else if (prop.itemId === 'poi-waystone') {
        out.push({
          id: `home-waystone-${prop.id}`,
          position: [prop.x, prop.y, prop.z],
          radius: 2.4,
          prompt: () => waystones.length >= 2
            ? {title: '🎐 传送风铃柱（水泡快传）', sub: `已连通 ${waystones.length} 座风铃节点 · 按 F 传送至下一站`}
            : {title: '🎐 传送风铃柱', sub: '在远处扩建领土再放一座风铃柱即可双向传送！'},
          act: () => {
            if (waystones.length < 2) {
              this.host.toast('再摆放一座「传送风铃柱」即可跨区域快速水泡传送！', 2800);
              return;
            }
            const idx = waystones.findIndex(w => w.id === prop.id);
            const next = waystones[(idx + 1) % waystones.length];
            this.host.teleport?.([next.x + 1.6, next.y + 0.5, next.z + 1.6]);
            player.mood('Happy', 1.0);
            this.host.toast('🎐 清风传铃！已抵达下一座风铃节点', 2200);
          },
        });
      } else if (prop.itemId === 'poi-museum-altar') {
        out.push({
          id: `home-museum-${prop.id}`,
          position: [prop.x, prop.y, prop.z],
          radius: 2.8,
          prompt: () => ({title: '🏛️ 凝露港 · 时光博物苑', sub: '按 F 打开六大展厅捐献界面，修复永久家园奇迹！'}),
          act: () => this.host.openMuseum?.(),
        });
      } else if (prop.itemId === 'poi-fishpond') {
        const pond = home.fishing?.ponds[prop.id];
        out.push({
          id: `home-pond-${prop.id}`,
          position: [prop.x, prop.y, prop.z],
          radius: 3.0,
          prompt: () => {
            if (!pond) {
              const anyFish = Object.keys(this.host.life.bag).find(id => ITEMS[id]?.kind === 'fish' && (this.host.life.bag[id] ?? 0) > 0);
              return anyFish
                ? {title: `🐟 投放 ${ITEMS[anyFish].icon}${ITEMS[anyFish].name} 入池养殖`, sub: '活鱼会自动繁育并每日产出高价鲜鱼籽！'}
                : {title: '🐟 生态养殖鱼塘（空池）', sub: '先去水边钓一条活鱼，再回来按 F 投放养殖'};
            }
            stepFishPond(pond, now);
            const fishDef = ITEMS[pond.fishId];
            if (pond.lastCollectDay !== dayKey) {
              return {title: `🟠 收获鱼塘产出（${fishDef?.name ?? ''} ${pond.count}/${pond.capacity} 条）`, sub: '按 F 收取今日鲜鱼籽（稀有鱼额外产河珠/遗物！）'};
            }
            if (pond.wishItem && (this.host.life.bag[pond.wishItem] ?? 0) >= (pond.wishCount ?? 1)) {
              return {title: `✨ 满足鱼群心愿扩容（${ITEMS[pond.wishItem]?.name}×${pond.wishCount}）`, sub: `当前 ${pond.count}/${pond.capacity} 条 · 按 F 扩容鱼塘！`};
            }
            return {title: `🐟 ${fishDef?.name ?? ''}鱼塘（${pond.count}/${pond.capacity} 条）`, sub: pond.wishItem ? `鱼群心愿：${ITEMS[pond.wishItem]?.name ?? ''}×${pond.wishCount}（集齐可扩容）` : '已满级繁育中，明日继续收获鱼籽'};
          },
          act: () => {
            const pState = home.fishing?.ponds[prop.id];
            if (!pState) {
              const fishId = Object.keys(this.host.life.bag).find(id => ITEMS[id]?.kind === 'fish' && (this.host.life.bag[id] ?? 0) > 0);
              if (!fishId) { this.host.toast('背包里还没有活鱼，先去水巷或镜湖钓一条吧！', 2600); return; }
              const res = stockFishPond(this.host.life, prop.id, fishId, now);
              if (res.ok) {
                this.host.save();
                this.host.toast(`🐟 已将「${ITEMS[fishId].name}」放养进鱼塘！它会随时间自动繁育`, 3000);
                this.host.onChange?.();
              }
              return;
            }
            if (pState.lastCollectDay !== dayKey) {
              const col = collectFishPond(this.host.life, prop.id, dayKey, now);
              if (col.ok) {
                const txt = col.rewards.map(r => `${ITEMS[r.id]?.icon ?? ''}${ITEMS[r.id]?.name ?? r.id}×${r.count}`).join(' + ');
                this.host.save();
                player.mood('Happy', 1.2);
                this.host.toast(`🐟 鱼塘大丰收：${txt}！`, 3200);
                this.host.onChange?.();
                return;
              }
            }
            if (pState.wishItem && (this.host.life.bag[pState.wishItem] ?? 0) >= (pState.wishCount ?? 1)) {
              const exp = fulfillPondWish(this.host.life, prop.id);
              if (exp.ok) {
                this.host.save();
                player.mood('Happy', 1.3);
                this.host.toast(`🎉 鱼群很开心！鱼塘已扩容至 ${exp.newCapacity} 条！`, 3200);
                this.host.onChange?.();
                return;
              }
            }
            this.host.toast(pState.wishItem ? `鱼群想要 ${ITEMS[pState.wishItem]?.name}×${pState.wishCount} 来扩大水域` : '鱼儿正悠闲游动，明天再来收获鱼籽吧！', 2800);
          },
        });
      } else if (prop.itemId === 'build-lighthouse') {
        const claimed = home.driftBottles?.day === dayKey ? home.driftBottles.claimed : 0;
        const maxB = maxDailyDriftBottles(this.host.life);
        out.push({
          id: `home-lighthouse-${prop.id}`,
          position: [prop.x, prop.y, prop.z],
          radius: 3.2,
          prompt: () => claimed < maxB
            ? {title: `🍾 拾取潮汐历史漂流瓶（${claimed}/${maxB}）`, sub: '海潮冲来一枚岁月漂流瓶，内藏史事微笺与珍稀宝物！'}
            : {title: '🗼 海岬灯塔（今日漂流瓶已拾取）', sub: '明天潮汐涨落时再来灯塔下看看吧'},
          act: () => {
            const res = claimDriftBottle(this.host.life, dayKey, mmdd);
            if (!res.ok) { this.host.toast('今天的潮汐漂流瓶已经全部捡完啦，明天再来！', 2400); return; }
            const rItem = ITEMS[res.rewardId!];
            this.host.save();
            player.mood('Happy', 1.4);
            this.host.toast(`🍾 获得 ${rItem?.icon ?? '🎁'}${rItem?.name ?? ''}！${res.note}`, 5200);
            this.host.onChange?.();
          },
        });
      } else if (prop.itemId === 'facility-sprinkler') {
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
            const ev = recordHomeAction(this.host.life, dayKey, 'element', 1);
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
          const res = recordVisitorInteraction(this.host.life, sp.id, dayKey, fed);
          const xp = addHomeXp(this.host.life, fed ? 18 : 10);
          const ev = recordHomeAction(this.host.life, dayKey, 'visit', 1);
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

    // Add wild encounters & adopted ranch pets
    out.push(...this.ranch.getInteractables(player));

    return out;
  }

  update(time: number, dt: number) {
    updatePackAnimations(dt);

    for (const live of this.props.values()) {
      const crystal = live.model.group.getObjectByName('spin-crystal');
      if (crystal) {
        const running = !!ensureHome(this.host.life).machines?.[live.data.id];
        crystal.rotation.y = time * (running ? 3.8 : 1.4);
      }
    }

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

    this.updatePointerWorld();

    // Voxel mode preview
    if (this.voxelMode) {
      this.ghostGroup.visible = false;
      this.raycaster.setFromCamera(this.pointerNDC, cam);
      const pick = this.voxels.pickTarget(this.raycaster, this.pointerHit ? this.ghostPos : null, this.demolishMode);
      if (pick) {
        if (this.demolishMode) {
          this.voxels.setPreview(!!pick.hitCell, pick.hitCell ?? pick.placeCell, true, true);
          this.ghostValid = !!pick.hitCell;
          this.ghostReason = pick.hitCell ? '' : '请指向要拆除的积木';
        } else if (this.voxelBlueprintId) {
          this.voxels.setPreview(true, pick.placeCell, true, false);
          this.ghostValid = true;
          this.ghostReason = '';
        } else {
          const check = this.voxels.canPlaceAt(pick.placeCell[0], pick.placeCell[1], pick.placeCell[2], this.selectedVoxelId);
          this.voxels.setPreview(true, pick.placeCell, check.ok, false);
          this.ghostValid = check.ok;
          this.ghostReason = check.reason ?? '';
        }
      } else {
        this.voxels.setPreview(false);
        this.ghostValid = false;
        this.ghostReason = '';
      }
      return;
    }

    this.voxels.setPreview(false);
    const show = !this.demolishMode && !this.expandMode && this.pointerHit;
    this.ghostGroup.visible = show;
    this.ghostReason = '';
    if (this.surfacePreview) this.surfacePreview.group.visible = show;
    for (const m of this.groupPreview) m.group.visible = show;
    if (!show) return;
    let [x, y, z] = this.ghostPos;
    const painting = this.tool !== 'place' && this.tool !== 'move';
    const selecting = this.tool === 'move' && !this.movingId;
    if (this.ghostMesh) this.ghostMesh.group.visible = !this.presetId && !painting && !selecting;
    let radius = 1;
    if (painting) {
      const cell = this.cell(); x = cell.x; z = cell.z; y = this.host.ground(x, z) ?? 0;
      this.ghostReason = cell.reason;
      const key = [this.tool, x, z, cell.reason].join('/');
      if (this.surfaceKey !== key) {
        this.surfacePreview?.dispose(); this.surfacePreview = null; this.surfaceKey = key;
        if (!cell.reason) {
          this.surfacePreview = groundTile(this.host.ctx, this.tool as GroundFinish, x, z, (xx, zz) => this.host.ground(xx, zz) ?? 0);
          this.root.add(this.surfacePreview.group);
        }
      }
    } else if (selecting) { this.ghostReason = '点选要移动的物件'; }
    else {
      const plan = this.propPlan();
      this.ghostReason = plan.reason;
      if (this.presetId) {
        plan.items.forEach((p, i) => { const g = this.groupPreview[i].group; g.position.set(p.x, p.y, p.z); g.rotation.y = p.yaw; g.scale.setScalar(p.scale); });
      } else {
        const p = plan.items[0]; y = p.y;
        const def = BUILD_ITEMS[p.itemId]; radius = Math.max(def.width, def.depth) * .55;
      }
    }
    this.ghostValid = !this.ghostReason;
    this.ghostGroup.position.set(x, y, z); this.ghostGroup.rotation.y = this.previewYaw;
    this.ghostGroup.scale.setScalar(painting ? 1 : this.currentScale);
    this.ghostRing.scale.set(radius, 1, radius);
    this.ghostRing.material.color.setHex(this.ghostValid || selecting ? 0x39806d : 0xcb5944);
  }

  dispose() {
    for (const {target, type, fn} of this.listeners) target.removeEventListener(type, fn);
    for (const live of this.props.values()) {
      live.disposeFarmPlot?.();
      live.model.dispose();
    }
    for (const v of this.visitors.values()) v.model.dispose();
    this.voxels.dispose();
    this.ranch.dispose();
    this.frontier.dispose();
    this.ghostMesh?.dispose();
    this.root.removeFromParent();
  }
}
