import type {MarineModels} from './marine-models';
import {ReefGarden} from './reef-garden';
import * as THREE from 'three';
import {SEA_LEVEL} from './layout';
import {OceanLifeSystem, marineZoneForDepth} from './ocean-life';
import {
  coastExtensionAt,
  combinedHeightWithRects,
  coastalSeabedHeightAt,
  collectTerritoryRects,
  territoryBoxSDF,
} from '../world/island-coast';
import {HarborAngling} from './angling';
import {type ExpandedTile, type LifeData} from '../life/state';
import type {LifeUI} from '../ui/life-ui';
import type {SlimeCharacter} from '../slime/character';
import {
  approachSailingSpeed,
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
import {VoyageShip, hullContact, walkableDeck, deckHeight, HELM_Z} from './voyage-ship';
import {VoyageIslands} from './voyage-islands';
import {VoyageSea} from './voyage-sea';
import {DOCK, VoyageControls} from './voyage-controls';

export type OceanMode = 'idle' | 'deck' | 'boat' | 'fishing' | 'diving';

const DEEP_SEA_THRESHOLD = 1.55; // Metres of water depth where boat summon unlocks
const DIVE_MIN_WATER_DEPTH = 0.85; // Metres of ocean depth where boat-free diving unlocks

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
  private reef: ReefGarden;
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
  private deckFoot = new THREE.Vector3();
  private deckHeading = 0;
  private deckWalkSpeed = 0;
  get companionDeck(){return this.onBoard ? this.boatGroup : null;}
  private get onBoard() { return this.mode === 'deck' || this.mode === 'boat' || this.mode === 'fishing'; }
  private nearHelm() { return Math.hypot(this.deckFoot.x, this.deckFoot.z - HELM_Z) <= 1.05; }
  private boatActive = false;

  readonly angling: HarborAngling;
  private inDeepWater = false;
  private canDiveFree = false;
  private currentDepth = 0;
  private currentWaterColumn = 0;
  private lastWaveTime = 0;

  // Reusable vectors & key state
  private keys = new Set<string>();
  private keyDownFn: (e: KeyboardEvent) => void;
  private keyUpFn: (e: KeyboardEvent) => void;

  constructor(private deps: OceanAdventureDeps) {
    const {ctx} = deps;
    const models: MarineModels = ctx.islandCoast.marineModels;
    this.reef = new ReefGarden(models);
    ctx.scene.add(this.reef.root);
    this.marineLife = new OceanLifeSystem(ctx.scene, models, (sp) => {
      deps.toast(`🌊 发现${sp.name}（${marineZoneForDepth(this.currentDepth).label}）`, 2600);
      deps.slime.setMood('Happy', 1.1, 65);
    });

    this.boatGroup = this.ship.group;
    ctx.scene.add(this.ship.group, this.rival.group);
    this.islands = new VoyageIslands(ctx.scene, true, models);
    this.sea = new VoyageSea(ctx.scene, models, (x, z) => this.openWaterDepth(x, z) >= 1.15, (x, z, size) => ctx.ocean?.voyageWake?.impact(x, z, size));
    this.controls = new VoyageControls(
      (id) => this.action(id),
      (id, down) => this.touch(id, down),
      (active) => deps.slime.setMenuPointer('voyage', active),
    );
    window.addEventListener('pagehide', this.onPageHide);

    this.angling = ctx.angling = new HarborAngling(deps);

    this.keyDownFn = (e: KeyboardEvent) => this.onKeyDown(e);
    this.keyUpFn = (e: KeyboardEvent) => this.onKeyUp(e);
    window.addEventListener('keydown', this.keyDownFn, true);
    window.addEventListener('keyup', this.keyUpFn);
  }

  syncExpansions(expansions: ExpandedTile[]) {
    this.reef.invalidate();
    this.islands.clear();
    this.deps.ctx.ocean?.setOffshoreIslands([]);
    this.marineLife.buildPresetEcosystem(expansions);
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return;
    if (!this.deps.isPlaying() || this.angling.active) return;
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
    if (this.onBoard && e.code === 'KeyH') {
      if (!e.repeat) this.action('land');
      return;
    }
    this.keys.add(e.code);
    if (this.mode === 'deck' || this.mode === 'boat') {
      const actions: Record<string, string> = {
        KeyF: 'helm', KeyR: 'fish', Space: 'leave', KeyC: 'dive',
        KeyQ: 'port', KeyE: 'starboard',
      };
      if (actions[e.code] || e.code === 'KeyT' || e.code === 'KeyV') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!e.repeat && actions[e.code]) this.action(actions[e.code]);
        return;
      }
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
  private nearBoat(atWater?: boolean) {
    if (!this.boatActive || !(atWater ?? this.atWater())) return false;
    const p = this.boatGroup.worldToLocal(this.contactPoint.fromArray(this.deps.slime.position));
    return Math.abs(p.z) < 2.0 && Math.abs(p.x) <= 3.25 && p.y >= -2.2 && p.y < 1.5;
  }
  private openWaterDepth(x: number, z: number) {
    if (this.deps.ctx.ocean?.isOceanAt(x, z) === false) return 0;
    const solid = this.deps.slime.world.support(x, z, Infinity, true);
    return SEA_LEVEL - Math.max(this.bed(x, z), solid ?? -Infinity);
  }
  private atWater() {
    const [x, y, z] = this.deps.slime.position;
    return this.openWaterDepth(x, z) > .12 && y <= this.waveHeightAt(x, z) + .65;
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
      return;
    }
    if (this.controls.helpOpen || !this.deps.isPlaying()) return;
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
    if (id === 'board' && !this.onBoard && this.nearBoat()) {
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
    if (id === 'helm') {
      if (this.mode === 'boat') {
        this.standOnDeck(.05, -2.68);
      } else if (this.mode === 'deck' && this.nearHelm()) {
        this.mode = 'boat';
        this.deps.slime.arm = 9.7;
        this.deps.slime.pitch = .32;
        this.deps.slime.yaw = this.boatYaw + Math.PI + .47;
        this.keepSlimeOnBoat();
      }
      return;
    }
    if (id === 'dive' && !run?.enemy && (this.onBoard || this.canDiveFree)) {
      this.startDiving(this.onBoard);
      return;
    }
    if ((this.mode !== 'deck' && this.mode !== 'boat') || !run) return;
    if (id === 'port' || id === 'starboard') {
      if (this.mode === 'boat') this.fire(run, id === 'port' ? 1 : -1);
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
  private standOnDeck(x: number, z: number) {
    this.mode = 'deck';
    this.deckWalkSpeed = 0;
    this.deckFoot.set(x, deckHeight(x, z), z);
    this.deps.slime.arm = 4.2;
    this.keepSlimeOnBoat();
  }
  private board(fromDock = false) {
    if (!this.run) return;
    const {slime} = this.deps;
    if (this.mode === 'diving') this.deps.setOceanSurfaceBuoyancy(true);
    const side = this.boatGroup.worldToLocal(this.contactPoint.fromArray(slime.position)).x < 0 ? -1 : 1;
    slime.submerged = slime.swimming = false;
    slime.inputLock = true;
    slime.umbrella.cancel(true);
    slime.cling = null;
    if (fromDock) slime.yaw = this.boatYaw;
    this.deckHeading = Math.PI + slime.yaw - this.boatYaw;
    this.standOnDeck(fromDock ? .36 : side * 1.05, fromDock ? -.72 : .25);
  }
  private begin(x: number, z: number, yaw: number) {
    depart(this.deps.life, x, z, yaw);
    this.restoreVoyage();
    this.deps.save();
    this.deps.toast('已登上史莱姆号 · 走到船尾舵轮旁按 F 掌舵');
  }
  /** A saved hull may now lie on a procedural island. Move only stranded hulls to adjacent water. */
  private refloat(hull: {x: number; z: number; yaw: number}) {
    const clear = (x: number,z: number) => [-3.7,0,4.1].every(offset =>
      this.bed(x+Math.sin(hull.yaw)*offset,z+Math.cos(hull.yaw)*offset)<SEA_LEVEL-.88);
    if (clear(hull.x,hull.z)) return false;
    for(let radius=4;radius<=192;radius+=4) {
      for(let step=0;step<16;step++) {
        const angle=hull.yaw+step*Math.PI/8;
        const x=hull.x+Math.sin(angle)*radius,z=hull.z+Math.cos(angle)*radius;
        if(clear(x,z)){hull.x=x;hull.z=z;return true;}
      }
    }
    return false;
  }
  restoreVoyage() {
    const run = this.run;
    if (!run) return;
    this.restoreCamera = {arm: this.deps.slime.arm, pitch: this.deps.slime.pitch};
    this.syncSea(run.x, run.z);
    const moved=this.refloat(run);
    const rivalMoved=run.enemy ? this.refloat(run.enemy) : false;
    if(moved || rivalMoved){
      this.syncSea(run.x,run.z);
      this.deps.save();
    }
    this.boatPos.set(run.x, SEA_LEVEL, run.z);
    this.boatYaw = run.yaw;
    this.boatSpeed = 0;
    this.ship.setFlag(sailingLog(this.deps.life).flag);
    this.rival.setFlag(run.seed);
    document.body.classList.add('sailing-voyage');
    this.boatActive = this.boatGroup.visible = true;
    this.deps.slime.teleport([run.x, this.waveHeightAt(run.x, run.z) + 1.25, run.z]);
    this.rockHull(this.ship.group, run.x, run.z, run.yaw, this.lastWaveTime);
    this.board(true);
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
    const distance = this.coast(x,z);
    if (!this.islands.offshore && distance < 50) return;
    const rects = collectTerritoryRects(this.deps.getExpansions());
    const sdf = this.deps.ctx.islandCoast.sdf;
    const left = Math.floor(sdf.minX) | 1, back = Math.floor(sdf.minZ) | 1;
    if (this.islands.sync(x,z,sailingLog(this.deps.life).waters,
      (a,b)=>territoryBoxSDF(a,b,rects)-coastExtensionAt(a,b),
      (a,b)=>combinedHeightWithRects(a,b,rects),
      [left,back,left+2*Math.ceil((sdf.maxX-left)/2),back+2*Math.ceil((sdf.maxZ-back)/2)])) {
      this.reef.invalidate();
      this.deps.ctx.ocean?.setOffshoreIslands(this.islands.shores);
      this.deps.refreshOceanWorld();
    }
  }
  private normalCamera() {
    this.deps.slime.arm = this.restoreCamera.arm;
    this.deps.slime.pitch = this.restoreCamera.pitch;
  }
  private returnHome(safe: boolean) {
    const {slime, life} = this.deps;
    if(this.angling.active)this.angling.stop();
    const payout = finishVoyage(life, safe);
    document.body.classList.remove('sailing-voyage');
    this.boatActive = this.ship.group.visible = this.rival.group.visible = false;
    this.mode = 'idle';
    this.sea.reset();
    this.deps.ctx.ocean?.endVoyageWake();
    this.reef.invalidate();
    this.islands.clear();
    this.deps.ctx.ocean?.setOffshoreIslands([]);
    this.deps.setOceanSurfaceBuoyancy(true);
    slime.releaseDeck();
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
    if (this.mode === 'fishing') this.stopBoatFishing();
    this.mode = 'idle';
    slime.submerged = false;
    slime.inputLock = false;
    slime.releaseDeck();
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
    toast('已离船入水', 1600);
  }

  startDiving(fromBoat = this.onBoard) {
    const {slime, toast, setOceanSurfaceBuoyancy} = this.deps;
    if (this.run?.enemy) return;
    if (fromBoat) this.normalCamera();
    if (this.mode === 'fishing') this.stopBoatFishing();
    this.mode = 'diving';
    slime.inputLock = false;
    slime.releaseDeck();
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
    if (preferBoardBoat && this.nearBoat()) {
      this.board();
      slime.setMood('Happy', 0.9, 60);
      toast('⛵ 已回到海舟甲板', 2000);
    } else {
      slime.submerged = false;
      setOceanSurfaceBuoyancy(true);
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

  startBoatFishing() {
    if (this.angling.active || !this.onBoard || this.run?.enemy) return;
    this.mode='fishing';
    this.controls.hide();
    this.angling.start({
      onBoat:true, hull:this.boatGroup,
      direction:[-Math.cos(this.boatYaw),Math.sin(this.boatYaw)],
      spot:(x,z)=>this.islands.shores.some(i=>Math.hypot(i.x-x,i.z-z)<i.r+55)?'reef':
        this.coast(x,z)>290 || this.openWaterDepth(x,z)>38?'offshore':'harbor',
      wet:(x,z)=>{
        const local=this.boatGroup.worldToLocal(new THREE.Vector3(x,this.boatPos.y,z));
        return !(Math.abs(local.x)<1.55 && Math.abs(local.z)<3.75) && this.openWaterDepth(x,z)>.25;
      },
      level:(x,z)=>this.waveHeightAt(x,z),
      returnPort:()=>{if(this.run && this.canLand(this.run))this.returnHome(true);},
      exit:()=>{if(this.mode==='fishing'){if(this.boatActive)this.standOnDeck(-1.12,-1.63);else this.mode='idle';}},
    });
  }

  private stopBoatFishing(msg?:string) {
    this.angling.stop();if(msg)this.deps.toast(msg,2000);
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
    this.islands.update(t, this.deps.ctx.U?.uGrassDensity?.value ?? 1);
    const {slime, life} = this.deps,
      playing = this.deps.isPlaying(),
      exp = this.deps.getExpansions();
    this.marineLife.update(t, dt, playing ? slime.position : null, this.mode === 'diving', exp);
    if (!playing) {
      this.controls.hide();
      this.keys.clear();
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
    if (!run || !this.boatActive) this.syncSea(px,pz);
    let inWater = false;
    if (run && this.boatActive) {
      const onDeck = this.onBoard;
      this.syncSea(onDeck ? run.x : px, onDeck ? run.z : pz);
      inWater = !onDeck && this.atWater();
      if (!onDeck) this.resolveHullContact(inWater);
      document.body.classList.toggle('sailing-voyage', onDeck || inWater);
      run.reload[0]=Math.max(0,run.reload[0]-dt);
      run.reload[1]=Math.max(0,run.reload[1]-dt);
      if (this.onBoard) {
        if (sightEnemy(run, this.coast(run.x, run.z), (x, z) => this.bed(x, z) < SEA_LEVEL - 2)) {
          if(this.mode==='fishing')this.stopBoatFishing();
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
        this.angling.session?.phase === 'bite',
        run.reload,
      );
      this.deps.ctx.ocean?.setVoyageHull(0, run.x, run.z, run.yaw, this.boatSpeed);
      if (!e) this.deps.ctx.ocean?.voyageWake?.hideHull(1);
      this.sea.wake(0, run.x, run.z, run.yaw, this.boatSpeed, dt);
      this.sea.update(t, dt, run.x, run.z, run.yaw, (x, z) => this.waveHeightAt(x, z, t), onDeck || inWater, e?.aim ?? null);
      if ((this.saveClock += dt) >= 2) {
        this.saveClock = 0;
        this.deps.save();
      }
    }
    this.reef.update(t, px, py, pz, sailingLog(life).waters, this.deps.ctx.U?.uGrassDensity?.value ?? 1,
      (x,z) => this.deps.ctx.ocean?.isOceanAt(x,z) === false ? Infinity : (this.deps.ctx.islandCoast.surfaceAt(x,z) ?? this.islands.renderedBed(x,z) ?? this.bed(x,z)));
    if (this.mode === 'deck' && run) {
      const actions = ['KeyW', 'KeyS', 'KeyA', 'KeyD'];
      if (this.nearHelm()) actions.push('helm');
      if (!run.enemy) {
        actions.push('fish', 'dive', 'leave');
        if (this.canLand(run)) actions.push('land');
      }
      const info = this.nearHelm() ? '船尾舵轮 · 按 F 掌舵' : '甲板 · 走到船尾的舵轮旁掌舵';
      this.controls.show(info, actions, '', '', 'deck');
      return;
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
        '史莱姆号 · ' + Math.abs(this.boatSpeed).toFixed(1) + ' m/s · 船况 ' + run.hp + '/6 · 弹 ' + run.ammo + ' · 货箱 ' + run.cargo + ' 贝壳 · ' + nav;
      const acts = ['KeyA', 'KeyW', 'KeyS', 'KeyD', 'helm', 'port', 'starboard'];
      if (!e) {
        acts.push('fish', 'dive', 'leave');
        if (this.canLand(run)) acts.push('land');
      }
      this.controls.show(info, acts, label(1), label(-1));
      return;
    }
    if (this.mode === 'fishing') {
      if(run?.enemy)this.stopBoatFishing();
      this.controls.hide();
      return;
    }
    if (this.mode === 'diving') {
      this.updateDivingControl(t, dt, bed, surface);
      if (this.mode !== 'diving') { this.controls.hide(); return; }
      const acts = ['KeyA', 'KeyW', 'KeyS', 'KeyD', 'Space', 'KeyC'];
      if (this.currentDepth < 2.2) acts.push('surface');
      this.controls.show(
        marineZoneForDepth(this.currentDepth).label + ' · 深度 ' + this.currentDepth.toFixed(1) + 'm',
        acts,
      );
      return;
    }
    if (this.nearBoat(inWater)) {
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
    if (run ? inWater : this.canDiveFree && this.atWater()) {
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
  private contactPoint = new THREE.Vector3();
  private hullNormal = new THREE.Vector3();

  // Move the support before input, camera and worker sampling for this frame.
  prepareHull(t: number, dt: number) {
    const run = this.run;
    if (!run || !this.boatActive || !this.deps.isPlaying() || this.controls.helpOpen) return;
    this.lastWaveTime = t;
    if (this.mode === 'boat' || this.boatSpeed !== 0) this.updateBoatControl(run, dt);
    this.rockHull(this.ship.group, run.x, run.z, run.yaw, t);
    if (this.mode === 'deck') this.walkDeck(dt);
    if (this.onBoard) this.keepSlimeOnBoat();
  }

  private resolveHullContact(inWater: boolean) {
    const slime = this.deps.slime, [x, y, z] = slime.position;
    if (Math.hypot(x - this.boatPos.x, z - this.boatPos.z) > 6) return;
    const p = this.boatGroup.worldToLocal(this.contactPoint.set(x, y, z));
    const c = hullContact(p.x, p.y, p.z);
    if (!c || c.distance > .38) return;
    const normal = this.hullNormal.set(c.nx, 0, c.nz).applyQuaternion(this.boatGroup.quaternion);
    const inward = slime.velocity[0] * normal.x + slime.velocity[2] * normal.z;
    const swimmingIntoLadder = Math.abs(p.z) <= .7 && p.y > -.58 &&
      (inward < -.12 || this.keys.has('Space')) && inWater;
    if (swimmingIntoLadder || (p.y >= .91 && c.distance <= 0 && slime.velocity[1] <= 0)) {
      this.board();
      return;
    }
    const push = .23 - c.distance;
    if (push <= 0) return;
    if (p.y < c.keel && p.y + .42 - c.keel < push) {
      p.y = c.keel - .42;
      slime.velocity[1] = Math.min(0, slime.velocity[1]);
    } else {
      p.x += c.nx * push;
      p.z += c.nz * push;
      if (inward < 0) {
        slime.velocity[0] -= normal.x * inward;
        slime.velocity[2] -= normal.z * inward;
      }
    }
    this.boatGroup.localToWorld(p);
    slime.position = [p.x, p.y, p.z];
  }

  private walkDeck(dt: number) {
    const side = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
    const ahead = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS'));
    const length = Math.hypot(side, ahead);
    this.deckWalkSpeed = 0;
    if (!length || dt <= 0) return;
    const angle = this.deps.slime.yaw - this.boatYaw;
    const dx = (Math.cos(angle) * side - Math.sin(angle) * ahead) / length;
    const dz = (-Math.sin(angle) * side - Math.cos(angle) * ahead) / length;
    const p = this.deckFoot, step = 2.55 * Math.min(dt, .05);
    const oldX = p.x, oldZ = p.z;
    // Resolve each axis independently so walking into the rail or mast slides along it.
    if (walkableDeck(p.x + dx * step, p.z)) p.x += dx * step;
    if (walkableDeck(p.x, p.z + dz * step)) p.z += dz * step;
    p.y = deckHeight(p.x, p.z);
    this.deckWalkSpeed = Math.hypot(p.x - oldX, p.z - oldZ) / dt;
    if (this.deckWalkSpeed > 0) this.deckHeading = Math.atan2(p.x - oldX, p.z - oldZ);
  }

  private keepSlimeOnBoat() {
    const {slime} = this.deps;
    if (this.mode === 'fishing') this.seat.set(-1.12, 0.98, -1.63);
    else if (this.mode === 'deck') this.seat.copy(this.deckFoot);
    else this.seat.set(0.05, 1.29, -2.68);
    this.boatGroup.localToWorld(this.seat);
    this.hullNormal.set(0, 1, 0).applyQuaternion(this.boatGroup.quaternion);
    slime.attachDeck([this.seat.x, this.seat.y, this.seat.z], [this.hullNormal.x, this.hullNormal.y, this.hullNormal.z]);
    slime.grounded = true;
    slime.swimming = false;
    const heading = this.boatYaw + (this.mode === 'deck' ? this.deckHeading : 0);
    slime.forward = [Math.sin(heading), 0, Math.cos(heading)];
    const speed = this.mode === 'deck' ? this.deckWalkSpeed : 0;
    slime.velocity = [slime.forward[0] * speed, 0, slime.forward[2] * speed];
  }
  private updateBoatControl(run: Voyage, dt: number) {
    const steering = this.mode === 'boat';
    const fwd = steering ? Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS')) : 0;
    const turn = steering ? Number(this.keys.has('KeyA')) - Number(this.keys.has('KeyD')) : 0;
    const dy = turn * 1.08 * dt;
    run.yaw += dy;
    this.boatYaw = run.yaw;
    this.deps.slime.yaw += dy;
    const depth = SEA_LEVEL - this.bed(run.x, run.z);
    const target = fwd * (fwd < 0 ? 4 : Math.min(24, Math.max(5, depth * 2.8)));
    this.boatSpeed = approachSailingSpeed(this.boatSpeed, target, dt);
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

  dispose() {
    window.removeEventListener('keydown', this.keyDownFn, true);
    window.removeEventListener('pagehide', this.onPageHide);
    window.removeEventListener('keyup', this.keyUpFn);
    this.deps.ctx.ocean?.endVoyageWake();
    this.controls.dispose();
    this.islands.dispose();
    this.ship.dispose();
    this.rival.dispose();
    this.sea.dispose();
    this.marineLife.dispose();
    this.reef.dispose();
    this.boatGroup.removeFromParent();
    this.angling.dispose();
  }
}
