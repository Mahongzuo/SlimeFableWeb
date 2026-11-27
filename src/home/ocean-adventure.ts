import * as THREE from 'three';
import {SEA_LEVEL} from './layout';
import {beijingSky} from './climate';
import {OceanLifeSystem, marineZoneForDepth} from './ocean-life';
import {
  coastExtensionAt,
  coastalSeabedHeightAt,
  collectTerritoryRects,
  territoryBoxSDF,
} from '../world/island-coast';
import {FishingSession, fishingBonuses, landCatch} from '../life/fishing';
import {ITEMS} from '../life/catalog';
import {takeItem, type ExpandedTile, type LifeData} from '../life/state';
import type {LifeUI} from '../ui/life-ui';
import type {SlimeCharacter} from '../slime/character';
import {
  sailingLog,
  depart,
  buyRounds,
  sightEnemy,
  fireBroadside,
  endEncounter,
  inBroadside,
  finishVoyage,
  type Voyage,
} from '../life/voyage';
import {VoyageShip} from './voyage-ship';
import {VoyageIslands} from './voyage-islands';
import {VoyageSea} from './voyage-sea';
import {DOCK, VoyageControls} from './voyage-controls';

export type OceanMode = 'idle' | 'boat' | 'fishing' | 'diving';

const DEEP_SEA_THRESHOLD = 1.55; // Metres of water depth where boat summon unlocks
const DIVE_MIN_WATER_DEPTH = 0.85; // Metres of ocean depth where boat-free diving unlocks

const BEHAVIOR_LABELS = {
  smooth: '平稳游动',
  sinker: '沉底猛坠',
  floater: '跃水浮游',
  dart: '高频突刺',
  legend: '鱼王狂暴！',
} as const;

export interface OceanAdventureDeps {
  refreshOceanWorld: () => void;
  ctx: any;
  slime: SlimeCharacter;
  life: LifeData;
  lifeUI: LifeUI;
  save: () => void;
  toast: (text: string, ms?: number) => void;
  getExpansions: () => ExpandedTile[];
  isHistoryDay: () => boolean;
  isPlaying: () => boolean;
  setOceanSurfaceBuoyancy: (enabled: boolean) => void;
}

/** Owns boarding, broadside encounters and the transition between deck and free swimming. */
export class OceanAdventure {
  mode: OceanMode = 'idle';
  readonly marineLife: OceanLifeSystem;

  private boatGroup: THREE.Group;
  readonly islands: VoyageIslands;
  private ship = new VoyageShip();
  private rival = new VoyageShip(true);
  private sea: VoyageSea;
  private controls: VoyageControls;
  private saveClock = 0;
  private restoreCamera = {arm: 2.6, pitch: 0.23};
  private onPageHide = () => {
    if (this.run) this.deps.save();
  };
  private get run() {
    return this.deps.life.sailing?.run;
  }
  private boatPos = new THREE.Vector3();
  private boatYaw = 0;
  private boatSpeed = 0;
  private boatActive = false;

  // Boat fishing state (uses the full FishingSession engine + 3D bamboo rod + concentric bobber ripples!)
  private session: FishingSession | null = null;
  private bob: THREE.Group;
  private rodGroup: THREE.Group;
  private ripples: THREE.Mesh[] = [];
  private line: THREE.Line;
  private reelHeld = false;
  private fishT0 = 0;
  private fishCloseIn = 0;

  private inDeepWater = false;
  private canDiveFree = false;
  private currentDepth = 0;
  private currentWaterColumn = 0;
  private lastWaveTime = 0;

  // Reusable vectors & key state
  private keys = new Set<string>();
  private keyDownFn: (e: KeyboardEvent) => void;
  private keyUpFn: (e: KeyboardEvent) => void;
  private ptrDownFn: (e: PointerEvent) => void;
  private ptrUpFn: () => void;

  constructor(private deps: OceanAdventureDeps) {
    const {ctx} = deps;
    this.marineLife = new OceanLifeSystem(ctx.scene, (sp) => {
      deps.toast(`🌊 发现${sp.name}（${marineZoneForDepth(this.currentDepth).label}）`, 2600);
      deps.slime.setMood('Happy', 1.1, 65);
    });

    this.boatGroup = this.ship.group;
    ctx.scene.add(this.ship.group, this.rival.group);
    this.islands = new VoyageIslands(ctx.scene);
    this.sea = new VoyageSea(ctx.scene, (x, z, size) => ctx.ocean?.voyageWake?.impact(x, z, size));
    this.controls = new VoyageControls(
      (id) => this.action(id),
      (id, down) => this.touch(id, down),
    );
    window.addEventListener('pagehide', this.onPageHide);

    // Fishing bobber & line for boat angling
    this.bob = new THREE.Group();
    this.bob.name = 'boat-fishing-float';
    this.bob.visible = false;
    const bobTop = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), ctx.mats.toon(0xe0453a));
    bobTop.position.y = 0.05;
    const bobLow = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      ctx.mats.toon(0xffffff),
    );
    this.bob.add(bobTop, bobLow);
    this.bob.layers.set(1);
    ctx.scene.add(this.bob);

    // 3D bamboo fishing rod + concentric expanding water ripples around bobber (Pine & Parcel look!)
    this.rodGroup = new THREE.Group();
    this.rodGroup.name = 'boat-fishing-rod';
    this.rodGroup.visible = false;
    const rodShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.032, 2.35, 7),
      ctx.mats.toon(0x9a7048),
    );
    rodShaft.position.set(0, 1.15, 0);
    const rodGrip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.042, 0.34, 7),
      ctx.mats.toon(0x4c3728),
    );
    rodGrip.position.set(0, 0.16, 0);
    this.rodGroup.add(rodShaft, rodGrip);
    this.rodGroup.traverse((m: any) => {
      if (m.isMesh) {
        m.castShadow = true;
        m.layers.set(1);
      }
    });
    ctx.scene.add(this.rodGroup);

    for (let i = 0; i < 2; i++) {
      const rMesh = new THREE.Mesh(
        new THREE.RingGeometry(0.88, 1.0, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.75,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      rMesh.visible = false;
      rMesh.layers.set(1);
      rMesh.renderOrder = 6;
      ctx.scene.add(rMesh);
      this.ripples.push(rMesh);
    }

    this.line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({color: 0x2f2a24}),
    );
    this.line.name = 'boat-fishing-line';
    this.line.visible = false;
    this.line.frustumCulled = false;
    this.line.layers.set(1);
    ctx.scene.add(this.line);

    this.keyDownFn = (e: KeyboardEvent) => this.onKeyDown(e);
    this.keyUpFn = (e: KeyboardEvent) => this.onKeyUp(e);
    this.ptrDownFn = (e: PointerEvent) => {
      if (this.mode === 'fishing' && this.session?.phase === 'reel' && e.button === 0) this.reelHeld = true;
    };
    this.ptrUpFn = () => {
      this.reelHeld = false;
    };
    window.addEventListener('keydown', this.keyDownFn, true);
    window.addEventListener('keyup', this.keyUpFn);
    window.addEventListener('pointerdown', this.ptrDownFn);
    window.addEventListener('pointerup', this.ptrUpFn);
  }

  syncExpansions(expansions: ExpandedTile[]) {
    this.marineLife.buildPresetEcosystem(expansions);
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return;
    if (!this.deps.isPlaying()) return;
    if (!this.controls.el.hidden && (e.code === 'F1' || (e.code === 'Escape' && this.controls.helpOpen))) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) this.controls.toggleHelp();
      return;
    }
    if (this.controls.helpOpen) {
      if (
        !['Tab', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'End', 'Home', 'Enter', 'Space'].includes(
          e.code,
        )
      )
        e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    if (this.mode === 'idle' && this.atDock() && e.code === 'KeyP') {
      if (!e.repeat) this.action('buy');
      return;
    }
    if (this.mode === 'boat' && e.code === 'KeyH') {
      if (!e.repeat) this.action('land');
      return;
    }
    this.keys.add(e.code);
    if (this.mode === 'boat' && ['KeyQ', 'KeyE', 'Space', 'KeyC', 'KeyF', 'KeyT', 'KeyV'].includes(e.code)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat) return;
      const acts = {KeyQ: 'port', KeyE: 'starboard', Space: 'leave', KeyC: 'dive', KeyF: 'fish'} as Record<
        string,
        string
      >;
      if (acts[e.code]) this.action(acts[e.code]);
      return;
    }
    if (this.mode === 'idle' && e.code === 'KeyH' && this.atDock()) {
      e.preventDefault();
      if (!e.repeat) this.action('launch');
      return;
    }
    if (this.mode === 'idle' && this.nearBoat() && e.code === 'KeyF') {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) this.board();
      return;
    }
    if (this.mode === 'fishing' && ['KeyF', 'Escape'].includes(e.code)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
    if (this.mode === 'fishing') {
      if (e.code === 'KeyF' && !e.repeat) {
        if (this.session?.phase === 'bite') this.session.hook();
        this.reelHeld = true;
      }
      if (e.code === 'Escape' && !e.repeat) {
        this.stopBoatFishing('收竿了');
      }
      return;
    }

    if (this.mode === 'idle') {
      if (e.code === 'KeyF' && !e.repeat && this.inDeepWater) {
        e.preventDefault();
        this.summonBoat();
      } else if (e.code === 'KeyC' && !e.repeat && this.canDiveFree) {
        e.preventDefault();
        this.startDiving(false);
      }
      return;
    }

    if (this.mode === 'diving') {
      if (e.code === 'KeyF' && !e.repeat && this.currentDepth < 2.2) {
        e.preventDefault();
        this.exitDiving(true);
      }
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.code);
    if (e.code === 'KeyF') this.reelHeld = false;
  }

  private sampleWave(x: number, z: number, t = this.lastWaveTime) {
    const ocean = this.deps.ctx.ocean;
    if (ocean?.sampleWave) return ocean.sampleWave(x, z, t);
    return {
      height: 0,
      dx: 0,
      dz: 0,
      normal: [0, 1, 0] as [number, number, number],
      velocityY: 0,
      seaLevel: SEA_LEVEL,
    };
  }

  private waveHeightAt(x: number, z: number, t = this.lastWaveTime) {
    return SEA_LEVEL + this.sampleWave(x, z, t).height;
  }

  private atDock() {
    const [x, , z] = this.deps.slime.position;
    return Math.hypot(x - DOCK.x, z - DOCK.z) < 4.8;
  }
  private nearBoat() {
    const [x, , z] = this.deps.slime.position;
    return this.boatActive && Math.hypot(x - this.boatPos.x, z - this.boatPos.z) < 6.5;
  }
  private coast(x: number, z: number) {
    return Math.max(
      0,
      territoryBoxSDF(x, z, collectTerritoryRects(this.deps.getExpansions())) - coastExtensionAt(x, z),
    );
  }
  private bed(x: number, z: number) {
    return this.islands.bed(x, z, coastalSeabedHeightAt(x, z, this.deps.getExpansions()));
  }
  private berth() {
    const x = DOCK.x;
    let z = -50;
    while (this.coast(x, z) < 12 || this.bed(x, z) > SEA_LEVEL - 1.4) z -= 6;
    return {x, z};
  }
  private touch(id: string, down: boolean) {
    if (id === 'clear') {
      this.keys.clear();
      this.deps.slime.keys.clear();
      this.reelHeld = false;
      return;
    }
    if (this.controls.helpOpen || !this.deps.isPlaying()) return;
    if (id === 'hook') {
      if (down && this.session?.phase === 'bite') this.session.hook();
      this.reelHeld = down;
      return;
    }
    if (down) this.keys.add(id);
    else this.keys.delete(id);
    if (this.mode === 'idle' || this.mode === 'diving') {
      if (down) this.deps.slime.keys.add(id);
      else this.deps.slime.keys.delete(id);
    }
  }
  private action(id: string) {
    if (!this.deps.isPlaying() || this.controls.helpOpen) return;
    const run = this.run;
    if (id === 'buy' && this.atDock() && !run) {
      const ok = buyRounds(this.deps.life);
      this.deps.toast(ok ? '补给装船 · 炮弹 +6' : '需要 6 贝壳，额外弹药上限 24 发');
      if (ok) {
        this.deps.save();
        this.deps.lifeUI.refresh(this.deps.life);
      }
      return;
    }
    if (id === 'launch' && this.atDock() && !run) {
      const berth = this.berth();
      this.begin(berth.x, berth.z, Math.PI);
      return;
    }
    if (id === 'summon') {
      this.summonBoat();
      return;
    }
    if (id === 'board' && this.nearBoat()) {
      this.board();
      return;
    }
    if (id === 'surface') {
      this.exitDiving(this.nearBoat());
      return;
    }
    if (id === 'cancel') {
      this.stopBoatFishing();
      return;
    }
    if (id === 'dive' && !run?.enemy && (this.mode === 'boat' || this.canDiveFree)) {
      this.startDiving(this.mode === 'boat');
      return;
    }
    if (this.mode !== 'boat' || !run) return;
    if (id === 'port' || id === 'starboard') {
      this.fire(run, id === 'port' ? 1 : -1);
      return;
    }
    if (run.enemy) {
      this.deps.toast('先驶离敌船或赢得遭遇战');
      return;
    }
    if (id === 'fish') this.startBoatFishing();
    if (id === 'leave') this.leaveBoat();
    if (id === 'land' && this.canLand(run)) this.returnHome(true);
  }
  private canLand(run: Voyage) {
    const p = this.berth();
    return Math.hypot(run.x - p.x, run.z - p.z) < 32;
  }
  private board() {
    if (!this.run) return;
    const {slime} = this.deps;
    if (this.mode === 'diving') this.exitDiving(true);
    this.mode = 'boat';
    slime.submerged = false;
    slime.swimming = false;
    slime.inputLock = true;
    slime.umbrella.cancel(true);
    slime.cling = null;
    slime.velocity = [0, 0, 0];
    slime.arm = 9.7;
    slime.pitch = 0.32;
    slime.yaw = this.boatYaw + Math.PI + 0.47;
  }
  private begin(x: number, z: number, yaw: number) {
    depart(this.deps.life, x, z, yaw);
    this.restoreVoyage();
    this.deps.save();
    this.deps.toast('史莱姆号启航 · W 扬帆，A / D 掌舵，F1 查看航海手册');
  }
  restoreVoyage() {
    const run = this.run;
    if (!run) return;
    this.restoreCamera = {arm: this.deps.slime.arm, pitch: this.deps.slime.pitch};
    this.boatPos.set(run.x, SEA_LEVEL, run.z);
    this.boatYaw = run.yaw;
    this.boatSpeed = 0;
    this.ship.setFlag(sailingLog(this.deps.life).flag);
    this.rival.setFlag(run.seed);
    document.body.classList.add('sailing-voyage');
    this.boatActive = this.boatGroup.visible = true;
    this.syncSea(run.x, run.z);
    this.deps.slime.teleport([run.x, this.waveHeightAt(run.x, run.z) + 1.25, run.z]);
    this.board();
  }
  summonBoat() {
    if (this.run) {
      if (this.nearBoat()) this.board();
      return;
    }
    if (!this.inDeepWater) return;
    const s = this.deps.slime;
    this.begin(s.position[0], s.position[2], s.yaw + Math.PI);
  }
  private syncSea(x: number, z: number) {
    if (this.islands.sync(x, z, sailingLog(this.deps.life).waters, (a, b) => this.coast(a, b)))
      this.deps.refreshOceanWorld();
  }
  private normalCamera() {
    this.deps.slime.arm = this.restoreCamera.arm;
    this.deps.slime.pitch = this.restoreCamera.pitch;
  }
  private returnHome(safe: boolean) {
    const {slime, life} = this.deps;
    const payout = finishVoyage(life, safe);
    document.body.classList.remove('sailing-voyage');
    this.boatActive = this.ship.group.visible = this.rival.group.visible = false;
    this.mode = 'idle';
    this.sea.reset();
    this.deps.ctx.ocean?.endVoyageWake();
    this.islands.clear();
    this.deps.setOceanSurfaceBuoyancy(true);
    slime.inputLock = slime.submerged = slime.swimming = false;
    this.normalCamera();
    this.keys.clear();
    slime.teleport([DOCK.x, (slime.world.support(DOCK.x, DOCK.z) ?? 0) + 0.1, DOCK.z]);
    this.deps.save();
    this.deps.lifeUI.refresh(life);
    this.deps.toast(
      safe ? '已靠港卸货 · 贝壳 +' + payout : '船员已撤回柳岸钓台 · 鱼获已保住，本趟货箱和余弹遗失',
      4800,
    );
  }
  leaveBoat() {
    const {slime, toast} = this.deps;
    if (this.run?.enemy) return;
    this.normalCamera();
    this.boatSpeed = 0;
    if (this.mode === 'fishing') this.stopBoatFishing();
    this.mode = 'idle';
    slime.submerged = false;
    slime.inputLock = false;
    // Place slime cleanly beside the boat on the current wave surface
    const sideX = -Math.cos(this.boatYaw) * 2.3;
    const sideZ = Math.sin(this.boatYaw) * 2.3;
    const wx = this.boatPos.x + sideX,
      wz = this.boatPos.z + sideZ;
    slime.position = [wx, this.waveHeightAt(wx, wz) - 0.1, wz];
    slime.velocity = [0, 0.8, 0];
    slime.grounded = true;
    slime.swimming = true;
    slime.setSurfaceJumpLock(0.25);
    toast('已离船入水 · 按 C 可直接下潜，靠近船梯按 F 登船', 2400);
  }

  startDiving(fromBoat = this.mode === 'boat') {
    const {slime, toast, setOceanSurfaceBuoyancy} = this.deps;
    if (this.run?.enemy) return;
    if (fromBoat) {
      this.normalCamera();
      this.boatSpeed = 0;
    }
    if (this.mode === 'fishing') this.stopBoatFishing();
    this.mode = 'diving';
    slime.inputLock = false;
    slime.submerged = true;
    setOceanSurfaceBuoyancy(false);
    let sx: number, sz: number, startY: number;
    if (fromBoat && this.boatActive) {
      // Enter water right beside the moored skiff
      const dx = -Math.cos(this.boatYaw) * 2.3;
      const dz = Math.sin(this.boatYaw) * 2.3;
      sx = this.boatPos.x + dx;
      sz = this.boatPos.z + dz;
      const bedY = this.bed(sx, sz);
      startY = Math.max(bedY + 0.45, this.waveHeightAt(sx, sz) - 1.05);
      slime.velocity = [0, -1.8, 0];
    } else {
      // Seamless boat-free dive directly from current ocean swimming position
      sx = slime.position[0];
      sz = slime.position[2];
      const bedY = this.bed(sx, sz);
      const surfY = this.waveHeightAt(sx, sz);
      startY = Math.max(bedY + 0.28, Math.min(slime.position[1] - 0.3, surfY - 0.52));
      slime.velocity = [slime.velocity[0] * 0.65, -2.5, slime.velocity[2] * 0.65];
    }
    slime.position = [sx, startY, sz];
    slime.grounded = false;
    slime.swimming = true;
    slime.jumps = 0;
    slime.umbrella.cancel(true);
    slime.setMood('Surprised', 0.9, 65);
    toast('🫧 潜入水下！WASD 游动 · 空格上浮 · C/Shift 下潜 · 松手悬停', 3600);
  }

  exitDiving(preferBoardBoat = false) {
    const {slime, toast, setOceanSurfaceBuoyancy} = this.deps;
    slime.submerged = false;
    setOceanSurfaceBuoyancy(true);
    const nearBoat =
      this.boatActive &&
      Math.hypot(slime.position[0] - this.boatPos.x, slime.position[2] - this.boatPos.z) < 5.5;
    if (preferBoardBoat && nearBoat) {
      this.mode = 'boat';
      slime.arm = 9.7;
      slime.pitch = 0.32;
      slime.yaw = this.boatYaw + Math.PI + 0.47;
      slime.inputLock = true;
      slime.velocity = [0, 0, 0];
      slime.setMood('Happy', 0.9, 60);
      toast('⛵ 已回到海舟甲板', 2000);
    } else {
      this.mode = 'idle';
      slime.inputLock = false;
      const surfY = this.waveHeightAt(slime.position[0], slime.position[2]);
      slime.position[1] = Math.max(slime.position[1], surfY - 0.1);
      slime.velocity[1] = 0.35;
      slime.grounded = true;
      slime.swimming = true;
      slime.setSurfaceJumpLock(0.28);
      toast('🌊 已浮出海面', 1800);
    }
  }

  private pickBestBait(historyDay: boolean): string | null {
    const bag = this.deps.life.bag;
    if (historyDay && (bag['bait-chronicle'] ?? 0) > 0) return 'bait-chronicle';
    if ((bag['bait-element'] ?? 0) > 0) return 'bait-element';
    if ((bag['bait-glow'] ?? 0) > 0) return 'bait-glow';
    if ((bag['bait-worm'] ?? 0) > 0) return 'bait-worm';
    return null;
  }

  startBoatFishing() {
    if (this.session || this.mode !== 'boat' || this.run?.enemy) return;
    this.boatSpeed = 0;
    const {life, isHistoryDay, ctx} = this.deps;
    const historyDay = isHistoryDay();
    const bait = this.pickBestBait(historyDay);
    if (bait) {
      takeItem(life, bait);
      this.deps.save();
    }
    const sky = beijingSky(Date.now());
    const hour = new Date().getHours();
    const raining = (ctx.weather?.rain ?? 0) > 0.3;
    const snowing = (ctx.weather?.snow ?? 0) > 0.3;
    const bonus = fishingBonuses(life);
    this.session = new FishingSession(
      'harbor',
      {hour, raining, snowing, season: sky.season, historyDay},
      Math.random,
      bait,
      {
        mode: 'stardew',
        rodTier: bonus.rodTier,
        barBonus: bonus.barBonus,
        treasureChance: 0.28 + bonus.treasureBonus,
      },
    );
    this.mode = 'fishing';
    this.deps.slime.yaw = this.boatYaw + Math.PI * 0.5;
    this.deps.slime.arm = 5.2;
    this.reelHeld = false;
    this.fishT0 = 0;
    this.fishCloseIn = 0;
    this.bob.visible = true;
    this.rodGroup.visible = true;
    this.line.visible = true;
  }

  private stopBoatFishing(msg?: string) {
    this.session = null;
    this.bob.visible = false;
    this.rodGroup.visible = false;
    this.line.visible = false;
    for (const r of this.ripples) r.visible = false;
    this.deps.lifeUI.fishing(null);
    if (this.mode === 'fishing') {
      this.mode = this.boatActive ? 'boat' : 'idle';
      if (this.boatActive) this.board();
    }
    if (msg) this.deps.toast(msg, 2000);
  }

  private fire(run: Voyage, side: 1 | -1) {
    const target = run.enemy && {...run.enemy};
    const result = fireBroadside(run, side);
    if (result === 'empty' || result === 'loading') {
      this.deps.toast(result === 'empty' ? '弹仓已空 · 满帆拉开距离可脱离' : '船员正在装填');
      return;
    }
    const rx = Math.cos(run.yaw) * side,
      rz = -Math.sin(run.yaw) * side;
    const hit = result === 'hit' || result === 'won';
    this.sea.shoot(
      run.x + rx * 1.9,
      run.z + rz * 1.9,
      hit && target ? target.x : run.x + rx * 45,
      hit && target ? target.z : run.z + rz * 45,
    );
    if (result === 'won') this.deps.toast('敌船降帆！货箱已装船 · 靠港可兑换 ' + run.cargo + ' 贝壳');
    this.deps.save();
  }
  private fight(run: Voyage, dt: number) {
    const e = run.enemy;
    if (!e) return;
    const dx = run.x - e.x,
      dz = run.z - e.z,
      range = Math.hypot(dx, dz);
    if (range > 100) {
      endEncounter(run, false);
      this.deps.toast('已甩开敌船 · 原路返港安全');
      this.deps.save();
      return;
    }
    const bearing = Math.atan2(dx, dz),
      side = run.cleared % 2 ? -1 : 1;
    const desired = bearing + side * (range > 33 ? 0.38 : run.cleared < 2 ? 1.5 : 1.95);
    const diff = Math.atan2(Math.sin(desired - e.yaw), Math.cos(desired - e.yaw));
    e.yaw += Math.sign(diff) * Math.min(Math.abs(diff), dt * Math.min(1.35, 0.5 + run.cleared * 0.12));
    const speed = range > 45 ? 10 : 4 + Math.min(5, run.cleared);
    const nx = e.x + Math.sin(e.yaw) * speed * dt,
      nz = e.z + Math.cos(e.yaw) * speed * dt;
    if (this.bed(nx, nz) < SEA_LEVEL - 1.25) {
      e.x = nx;
      e.z = nz;
      this.sea.wake(1, nx, nz, e.yaw, speed, dt);
      this.deps.ctx.ocean?.setVoyageHull(1, nx, nz, e.yaw, speed);
    } else e.yaw += dt * 1.6;
    if (e.aim) {
      e.aim.remaining -= dt;
      if (e.aim.remaining <= 0) {
        const hit = Math.hypot(run.x - e.aim.x, run.z - e.aim.z) < 4.5;
        if (hit) run.hp--;
        e.aim = null;
        e.reload = Math.max(2.5, 5.6 - run.cleared * 0.35);
        if (run.hp <= 0) {
          this.returnHome(false);
          return;
        }
        if (hit) this.deps.toast('船体中弹 · 剩余耐久 ' + run.hp + '/6');
        this.deps.save();
      }
    } else if ((e.reload -= dt) <= 0 && range < 63) {
      e.aim = {x: run.x, z: run.z, remaining: 1.8};
      this.sea.shoot(e.x, e.z, run.x, run.z, 1.8);
    }
  }
  private rockHull(group: THREE.Group, x: number, z: number, yaw: number, t: number) {
    const fx = Math.sin(yaw),
      fz = Math.cos(yaw),
      wave = (a: number, b: number) => this.waveHeightAt(x + fx * a + fz * b, z + fz * a - fx * b, t);
    const bow = wave(3.9, 0),
      stern = wave(-3.7, 0),
      port = wave(0, 1.35),
      starboard = wave(0, -1.35);
    group.position.set(x, (bow + stern + port + starboard) * 0.25, z);
    group.rotation.set(Math.atan2(stern - bow, 7.6), yaw, Math.atan2(port - starboard, 2.7), 'YXZ');
  }
  update(t: number, dt: number) {
    this.lastWaveTime = t;
    const {slime, life} = this.deps,
      playing = this.deps.isPlaying(),
      exp = this.deps.getExpansions();
    this.marineLife.update(t, dt, playing ? slime.position : null, this.mode === 'diving', exp);
    if (!playing) {
      this.controls.hide();
      this.keys.clear();
      this.reelHeld = false;
      return;
    }
    if (this.controls.helpOpen) return;
    const [px, py, pz] = slime.position,
      bed = this.bed(px, pz),
      surface = this.waveHeightAt(px, pz, t);
    const ocean = territoryBoxSDF(px, pz, collectTerritoryRects(exp)) > 0.5;
    this.currentWaterColumn = Math.max(0, surface - bed);
    this.currentDepth = Math.max(0, surface - py);
    this.canDiveFree =
      ocean && this.currentWaterColumn >= DIVE_MIN_WATER_DEPTH && (slime.swimming || py <= surface + 0.18);
    this.inDeepWater = this.canDiveFree && this.currentWaterColumn >= DEEP_SEA_THRESHOLD;
    const run = this.run;
    if (run && this.boatActive) {
      if (this.mode === 'boat') this.updateBoatControl(run, dt);
      const onDeck = this.mode === 'boat' || this.mode === 'fishing';
      this.syncSea(onDeck ? run.x : px, onDeck ? run.z : pz);
      this.rockHull(this.ship.group, run.x, run.z, run.yaw, t);
      if (onDeck) this.keepSlimeOnBoat(t);
      run.reload[0]=Math.max(0,run.reload[0]-dt);
      run.reload[1]=Math.max(0,run.reload[1]-dt);
      if (this.mode === 'boat') {
        if (sightEnemy(run, this.coast(run.x, run.z), (x, z) => this.bed(x, z) < SEA_LEVEL - 2)) {
          this.deps.toast('野兔发现敌帆！转动船身，炮位亮起时开火', 3600);
          this.deps.save();
        }

        this.fight(run, dt);
        if (!this.run) return;
      }
      const e = run.enemy,
        wind = 2 + 8 * (this.deps.ctx.weather?.wind ?? 0.4);
      this.rival.group.visible = !!e;
      if (e) {
        this.rockHull(this.rival.group, e.x, e.z, e.yaw, t);
        this.rival.animate(t, dt, 5, e.yaw, wind, null, false, run.reload);
      }
      this.ship.animate(
        t,
        dt,
        this.boatSpeed,
        run.yaw,
        wind,
        e ? Math.atan2(e.x - run.x, e.z - run.z) - run.yaw : null,
        this.session?.phase === 'bite',
        run.reload,
      );
      this.deps.ctx.ocean?.setVoyageHull(0, run.x, run.z, run.yaw, this.boatSpeed);
      if (!e) this.deps.ctx.ocean?.voyageWake?.hideHull(1);
      this.sea.wake(0, run.x, run.z, run.yaw, this.boatSpeed, dt);
      this.sea.update(t, dt, run.x, run.z, run.yaw, (x, z) => this.waveHeightAt(x, z, t), e?.aim ?? null);
      if ((this.saveClock += dt) >= 2) {
        this.saveClock = 0;
        this.deps.save();
      }
    }
    if (this.mode === 'boat' && run) {
      const e = run.enemy;
      const label = (side: 1 | -1) =>
        (side === 1 ? '左舷 Q' : '右舷 E') +
        (run.reload[side === 1 ? 0 : 1] > 0 ? ' · 装填' : inBroadside(run, side) ? ' · 可命中' : '');
      const berth = this.berth(),
        a = Math.atan2(berth.x - run.x, berth.z - run.z) - run.yaw;
      const dir =
        Math.abs(Math.sin(a)) < 0.27
          ? Math.cos(a) > 0
            ? '正前'
            : '正后'
          : (Math.sin(a) > 0 ? '左' : '右') + (Math.cos(a) > 0 ? '前' : '后');
      const nav = e
        ? '第 ' + (run.cleared+1) + ' 波 · 敌船 ' + e.hp + ' 耐久 · ' + (e.aim ? '避开橙色落点！' : '转舷迎战')
        : '返港 ' + dir + ' ' + Math.round(Math.hypot(berth.x - run.x, berth.z - run.z)) + 'm';
      const info =
        '史莱姆号 · 船况 ' + run.hp + '/6 · 弹 ' + run.ammo + ' · 货箱 ' + run.cargo + ' 贝壳 · ' + nav;
      const acts = ['KeyA', 'KeyW', 'KeyS', 'KeyD', 'port', 'starboard'];
      if (!e) {
        acts.push('fish', 'dive', 'leave');
        if (this.canLand(run)) acts.push('land');
      }
      this.controls.show(info, acts, label(1), label(-1));
      return;
    }
    if (this.mode === 'fishing') {
      this.updateBoatFishing(t, dt);
      this.controls.show('船钓 · 浮漂一沉就提竿，按住或松开追鱼', ['hook', 'cancel']);
      return;
    }
    if (this.mode === 'diving') {
      this.updateDivingControl(t, dt, bed, surface);
      const acts = ['KeyA', 'KeyW', 'KeyS', 'KeyD', 'Space', 'KeyC'];
      if (this.currentDepth < 2.2) acts.push('surface');
      this.controls.show(
        marineZoneForDepth(this.currentDepth).label + ' · 深度 ' + this.currentDepth.toFixed(1) + 'm',
        acts,
      );
      return;
    }
    if (this.nearBoat()) {
      this.controls.show('史莱姆号 · 舷侧船梯', [
        'board',
        ...(this.canDiveFree ? ['dive'] : []),
        'KeyA',
        'KeyW',
        'KeyS',
        'KeyD',
      ]);
      return;
    }
    if (!run && this.atDock()) {
      this.controls.show(
        '柳岸钓台 · 史莱姆号 · 弹药 ' + (12 + (life.sailing?.reserve ?? 0)) + ' 发 · 贝壳 ' + life.coins,
        ['buy', 'launch'],
      );
      return;
    }
    if (run || this.canDiveFree) {
      const ids = run ? ['KeyA', 'KeyW', 'KeyS', 'KeyD'] : [];
      if (this.canDiveFree) ids.push('dive');
      if (!run && this.inDeepWater) ids.push('summon');
      this.controls.show(
        run ? '回船梯 · ' + Math.round(Math.hypot(px - run.x, pz - run.z)) + 'm' : '开放海域 · 可自由下潜',
        ids,
      );
      return;
    }
    this.controls.hide();
  }
  private seat = new THREE.Vector3();
  private keepSlimeOnBoat(_t: number) {
    const {slime} = this.deps;
    if (this.mode === 'fishing') this.seat.set(-1.12, 0.98, -1.63);
    else this.seat.set(0.05, 1.29, -2.68);
    this.boatGroup.localToWorld(this.seat);
    slime.position = [this.seat.x, this.seat.y, this.seat.z];
    slime.velocity = [0, 0, 0];
    slime.grounded = true;
    slime.swimming = false;
    slime.forward = [Math.sin(this.boatYaw), 0, Math.cos(this.boatYaw)];
  }
  private updateBoatControl(run: Voyage, dt: number) {
    const fwd = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS'));
    const turn = Number(this.keys.has('KeyA')) - Number(this.keys.has('KeyD'));
    const dy = turn * 1.08 * dt;
    run.yaw += dy;
    this.boatYaw = run.yaw;
    this.deps.slime.yaw += dy;
    const depth = SEA_LEVEL - this.bed(run.x, run.z);
    const target = fwd * (fwd < 0 ? 4 : Math.min(24, Math.max(5, depth * 2.8)));
    this.boatSpeed += (target - this.boatSpeed) * (1 - Math.exp(-dt * (fwd ? 1.1 : 2.6)));
    const fx = Math.sin(run.yaw),
      fz = Math.cos(run.yaw);
    const nx = run.x + fx * this.boatSpeed * dt,
      nz = run.z + fz * this.boatSpeed * dt;
    const end = this.boatSpeed < 0 ? -3.7 : 4.1;
    if (this.bed(nx + fx * end, nz + fz * end) < SEA_LEVEL - 0.88 && this.bed(nx, nz) < SEA_LEVEL - 0.88) {
      run.x = nx;
      run.z = nz;
    } else this.boatSpeed = 0;
    this.boatPos.set(run.x, SEA_LEVEL, run.z);
  }

  private updateDivingControl(_t: number, dt: number, bedY: number, surfaceY: number) {
    const {slime} = this.deps;
    slime.jumps = 0;
    slime.umbrella.cancel(true);
    slime.swimming = true;
    slime.submerged = true;

    const ascend = this.keys.has('Space');
    const descend = this.keys.has('KeyC') || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const desiredVy = ascend ? 3.8 : descend ? -3.8 : 0.0;
    // Neutral-buoyancy 3D swimming (SlimeCharacter gravity is disabled while submerged)
    slime.velocity[1] += (desiredVy - slime.velocity[1]) * (1 - Math.exp(-dt * 9.5));
    slime.position[1] = Math.max(bedY + 0.04, Math.min(surfaceY - 0.16, slime.position[1]));

    // Auto-surface cleanly onto the waves when ascending up to the waterline OR swimming onto shallow sand
    if ((ascend && slime.position[1] >= surfaceY - 0.26) || surfaceY - bedY < 0.42) {
      this.exitDiving(false);
    }
  }

  private updateBoatFishing(t: number, dt: number) {
    const s = this.session;
    if (!s) return;
    const {slime, life, lifeUI, save} = this.deps;
    s.update(dt, this.reelHeld);
    this.fishT0 += dt;

    const fx = -Math.cos(this.boatYaw),
      fz = Math.sin(this.boatYaw);
    const cast = Math.min(1, this.fishT0 / 0.55);
    const bx = slime.position[0] + fx * 5.2 * cast;
    const bz = slime.position[2] + fz * 5.2 * cast;
    const dip = s.phase === 'bite' ? -0.14 : s.phase === 'reel' ? -0.06 + Math.sin(t * 28) * 0.04 : 0;
    const bobWaveY = this.waveHeightAt(bx, bz, t);
    this.bob.position.set(bx, bobWaveY + 0.03 + dip + (1 - cast) * Math.sin(cast * Math.PI) * 1.6, bz);

    const flex = s.phase === 'reel' ? 0.34 + Math.sin(t * 18) * 0.08 : s.phase === 'bite' ? 0.25 : 0.08;
    this.rodGroup.position.set(
      slime.position[0] + fx * 0.25,
      slime.position[1] + 0.3,
      slime.position[2] + fz * 0.25,
    );
    this.rodGroup.rotation.set(0, this.boatYaw - Math.PI / 2, 0);
    this.rodGroup.rotateX(0.92 + flex);
    this.rodGroup.updateMatrixWorld(true);
    const tipWorld = new THREE.Vector3(0, 2.32, 0).applyMatrix4(this.rodGroup.matrixWorld);

    const attr = this.line.geometry.attributes.position as THREE.BufferAttribute;
    attr.setXYZ(0, tipWorld.x, tipWorld.y, tipWorld.z);
    attr.setXYZ(1, this.bob.position.x, this.bob.position.y + 0.08, this.bob.position.z);
    attr.needsUpdate = true;

    const landed = cast >= 0.96;
    const rippleRate = s.phase === 'bite' || s.phase === 'reel' ? 1.55 : 0.65;
    for (let i = 0; i < this.ripples.length; i++) {
      const rMesh = this.ripples[i];
      rMesh.visible = landed;
      if (landed) {
        const ph = (t * rippleRate + i * 0.5) % 1;
        const rad = 0.16 + ph * (s.phase === 'bite' || s.phase === 'reel' ? 1.25 : 0.92);
        rMesh.position.set(this.bob.position.x, bobWaveY + 0.04, this.bob.position.z);
        rMesh.scale.setScalar(rad);
        (rMesh.material as THREE.MeshBasicMaterial).opacity = (1 - ph) * (1 - ph) * 0.8;
      }
    }

    const help =
      '<span class="key">F</span> / 左键 按住右移绿框追住🐟，松开左滑 · 覆盖 🎁 捞海底宝箱 · <span class="key">Esc</span> 收竿';
    if (s.phase === 'cast' || s.phase === 'wait') {
      lifeUI.fishing({
        title: s.misses ? '海鱼试探了一下…再等等' : '海舟抛竿中，等鱼咬钩…',
        help: '浮漂一沉，立刻按 <span class="key">F</span> 提竿！',
      });
    } else if (s.phase === 'bite') {
      lifeUI.fishing({title: '咬钩了！快按 F！', help: '大鱼上钩的瞬间！'});
      slime.setMood('Surprised', 0.3, 70);
    } else if (s.phase === 'reel') {
      const green: [number, number] = [s.barPos, s.barPos + s.barSize];
      const onFish = s.fishPos >= green[0] - 0.02 && s.fishPos <= green[1] + 0.02;
      lifeUI.fishing({
        title: `海上溜鱼 · ${BEHAVIOR_LABELS[s.behavior]}${s.treasure?.claimed ? ' · 🎁宝箱到手！' : s.treasure?.active ? ' · 发现海底宝箱🎁！' : ''}`,
        help,
        tension: s.fishPos,
        progress: s.progress,
        green,
        alarm: !onFish,
        stardew: true,
        treasure: s.treasure
          ? {pos: s.treasure.pos, progress: s.treasure.progress, claimed: s.treasure.claimed}
          : undefined,
      });
    } else if (!this.fishCloseIn) {
      this.fishCloseIn = 1.8;
      if (s.phase === 'caught') {
        const c = s.result()!;
        const treasureId = s.claimedTreasureId();
        const first = landCatch(life, c, treasureId);
        const item = ITEMS[c.fish];
        const trDef = treasureId ? ITEMS[treasureId] : null;
        save();
        lifeUI.refresh(life);
        slime.setMood('Happy', 1.4, 70);
        lifeUI.fishing({
          title: `🎉 海钓收获 ${item.icon}${item.name} · ${c.size} cm${first ? ' · 图鉴新增！' : ''}${trDef ? ` + 🎁${trDef.icon}${trDef.name}` : ''}`,
          help: item.desc,
        });
      } else {
        lifeUI.fishing({title: '海鱼挣脱游走了…', help: '按住 F/左键 让绿框紧跟🐟图标！'});
        slime.setMood('Hurt', 0.8, 65);
      }
    } else if ((this.fishCloseIn -= dt) <= 0) {
      this.stopBoatFishing();
    }
  }

  dispose() {
    window.removeEventListener('keydown', this.keyDownFn, true);
    window.removeEventListener('pagehide', this.onPageHide);
    window.removeEventListener('keyup', this.keyUpFn);
    window.removeEventListener('pointerdown', this.ptrDownFn);
    window.removeEventListener('pointerup', this.ptrUpFn);
    this.deps.ctx.ocean?.endVoyageWake();
    this.controls.dispose();
    this.islands.dispose();
    this.ship.dispose();
    this.rival.dispose();
    this.sea.dispose();
    this.marineLife.dispose();
    this.boatGroup.removeFromParent();
    this.bob.removeFromParent();
    this.rodGroup.removeFromParent();
    for (const r of this.ripples) r.removeFromParent();
    this.line.removeFromParent();
  }
}
