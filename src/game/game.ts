import {dailyLocations,SHARD_SHELLS,SHARD_COUNT,GATE_SHELLS} from './home-rewards';
import {seasonNames,weatherNames,weatherMode} from '../home/climate';
import {SlimeCharacter} from '../slime/character';
import type {SwingAreaEvent} from '../slime/combat';
import type {FluidVolume,GroundSurface} from '../slime/world';
import {type Box,Vec} from '../slime/types';
import {houseLot} from '../home/ninglu-layout';
import {Homestead,HOUSE} from '../home/homestead';
import {BiomePreserves} from '../home/biome-preserves';
import {CompanionPanel} from '../ui/companion-panel';
import {SportsPark} from '../home/sports-park';
import {SportsSession} from '../home/sports-session';
import {bindSportSite} from '../world/expansion';
import {advanceRescue} from '../life/companion-care';
import {HomeOrchard} from '../home/orchard';
import {buildHomeWorld} from '../world/home-world';
import {inland, WORLD} from '../world/map';
import {buildCoastalCollisionSurfaces, buildOceanFluidVolumes} from '../world/island-coast';
import {buildExpansionSurface, computeExpandedBounds} from '../world/expansion';
import {OceanAdventure} from '../home/ocean-adventure';
import type {BuiltZones} from '../zones';
import {FarmRegistry} from '../zones/farm-registry';
import {LifeUI} from '../ui/life-ui';
import {BuildUI} from '../ui/build-ui';
import {HomeBuilder} from '../home/builder';
import {ensureHome, type ExpandedTile} from '../life/state';
import {Graphics, PRESET_NAMES} from './graphics';
import type {Interactable, PlayerHandle} from '../zones/types';
import {homeSpawn, plazaCenter, portalSlots, spawnYaw} from '../home/layout';
import {TimePortal} from '../home/portals';
import {PortalParticleField} from '../home/portal-vfx';
import {Lectern, Shards} from '../home/props';
import {WaterFish,lotusPond} from '../home/water-fish';
import {SimPondEcosystem} from '../home/simpond-ai';
import {ITEMS} from '../life/catalog';
import {observeFish} from '../life/state';
import {SeaFX} from '../home/sea-fx';
import {GameUI} from '../ui/game-ui';
import {progressId} from '../../content/daily-modes';
import {gatesFor, gateContains, defaultEntry, gateTitle, gateSummary, journeyFor} from './mode-gates';
import {Save} from './save';
import {Showing, resolveShowing} from './schedule';
import {DayId, dayLabel, realToday} from './calendar';
import {days} from '../../content/registry';

type State = 'loading' | 'title' | 'play' | 'pause' | 'book' | 'guide' | 'door' | 'build' | 'shop' | 'sky';
const TITLE_CAM = {pos: [-12, 10, 33] as Vec, target: [8, 1.25, 15] as Vec};

function localDayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Home = 凝露港. Owns the state machine; the slime, harbour, home builder and UI only talk through here. */
export class Game {
  state: State = 'loading'; private panelFrom: State = 'play'; private ui: GameUI; readonly slime: SlimeCharacter; private save = new Save();
  private showing!: Showing; private portals: TimePortal[]; private portalParticles!: PortalParticleField; private lectern: Lectern; private shards: Shards; private fx: SeaFX;
  private zones!: BuiltZones; private graphics!: Graphics; private life: LifeUI; private buildUI!: BuildUI; readonly builder!: HomeBuilder; readonly farmRegistry!: FarmRegistry;
  private focus: {kind: 'portal'; portal: TimePortal} | {kind: 'lectern'} | {kind: 'spot'; spot: Interactable} | null = null;
  private nativeFluids:FluidVolume[];
  readonly cottage:Homestead;
  readonly preserves:BiomePreserves;
  readonly companions:CompanionPanel;
  readonly sportsPark:SportsPark;
  readonly sports:SportsSession;
  private guideFromCompanions=false;
  private careAt=0;
  private carePlayed=0;
  private lastPlayable=false;
  private lastCareSave=0;
  private currentExpansions: ExpandedTile[] = [];
  private coastalSurfaces: GroundSurface[] = [];
  private oceanBuoyancy = true;
  private oceanAdventure!: OceanAdventure;
  private fish:WaterFish;
  private pondLife:SimPondEcosystem;
  private waterImpact=0;
  private shardLayoutDirty=false;
  readonly orchard: HomeOrchard;
  private builderBoxes: Box[] = [];
  private orchardBoxes: Box[] = [];
  private hudTimer = 0; private doorLatch = new Set<number>(); private T: any;

  constructor(private app: any) {
    const ctx = app.ctx; this.T = ctx.THREE;
    const climate=app.director;
    climate.mode=weatherMode(this.save.data.homeWeather);
    climate.setTime(this.save.data.homeClockMinute);
    this.ui = new GameUI({
      openSky:()=>this.openSky(),getTime:()=>climate.minute,
      setTime:minute=>{climate.setTime(minute);this.save.data.homeClockMinute=climate.minute;this.save.write();},
      weather: mode => {climate.mode=mode; this.save.data.homeWeather=mode;this.save.write();},
      getWeather: () => climate.mode,
      start: () => this.start(), resume: () => this.resume(), pause: () => this.pauseGame(), openBook: () => this.openBook(), openGuide: () => this.openGuide(), openDex: () => this.toggleDex(), closePanel: () => this.closePanel(true),
      showDay: id => this.showDay(id), showToday: () => this.showDay(null), respawn: () => this.respawn(), quality: q => { this.graphics.set(q); this.save.data.quality = q; this.save.write(); },
      toTitle: () => this.toTitle(), go: id => this.go(id),
      toggleBuild: () => this.toggleBuildMode(),
      openOrchard: () => {
        if (this.orchardPlaying()) {
          this.orchard.update(0, true);
          this.orchard.open();
        }
      },
      interact: () => this.useFocusedSpot(),
      onQuickMenuChange: open => this.slime.setMenuPointer('quickMenu', open),
    });
    ctx.camera.position.fromArray(TITLE_CAM.pos); ctx.controls.target.fromArray(TITLE_CAM.target); ctx.controls.update();
    // plaza pieces exist before the bake so their meshes become part of the height field
    this.portals = portalSlots.map(s => new TimePortal(ctx, s));
    this.portalParticles = new PortalParticleField(portalSlots);
    ctx.scene.add(this.portalParticles.points);
    this.lectern = new Lectern(ctx);
    this.life = new LifeUI(); this.life.show(false);
    this.farmRegistry = new FarmRegistry({
      T: ctx.THREE,
      scene: ctx.scene,
      life: this.save.data.life,
      toon: (c, o) => ctx.mats.toon(c, o),
      save: () => this.save.write(),
      dayKey: () => localDayKey(),
      openSeedPicker: (_plotId, onPick) => this.openSeedPicker(onPick),
      onSaveChange: () => this.life.refresh(this.save.data.life),
    });
    const home = buildHomeWorld(ctx, this.save.data.life, () => this.save.write(), {
      hud: this.life,
      historyDay: () => this.showing?.isToday && this.showing.shown.chapters.some(c => c.status === 'web'),
      openSeedShop: () => this.openSeedShop(),
      openSeedPicker: (_plotId, onPick) => this.openSeedPicker(onPick),
      farmRegistry: this.farmRegistry,
      dayKey: () => localDayKey(),
    }), world = home.world;
    this.zones = home.zones;
    this.cottage=new Homestead(ctx,this.save.data.life);
    world.boxes.push(...this.cottage.boxes);
    home.footprints.push({id:'native-personal-cottage',itemId:'build-huizhou',x:HOUSE.x,y:HOUSE.y,z:HOUSE.z-.12*HOUSE.scale,yaw:0,scale:1,nativeFootprint:houseLot});
    this.preserves=new BiomePreserves(ctx,this.save.data.life,()=>this.save.write(),s=>this.ui.toast(s,3500));
    // Keep only inland river/lake fluids as base; outer ocean fluids are dynamically composed with expansions & diving
    this.sportsPark=new SportsPark(ctx,this.save.data.life,c=>this.sports.open(c));
    world.boxes.push(...this.sportsPark.boxes);home.footprints.push(...this.sportsPark.footprints);
    this.nativeFluids=(world.fluids??[]).filter(f=>f.min[0]>=WORLD.min[0]-1&&f.max[0]<=WORLD.max[0]+1&&f.min[1]>=WORLD.min[1]-1&&f.max[1]<=WORLD.max[1]+1);
    this.fx = new SeaFX(ctx);
    this.fish=new WaterFish(ctx.scene,id=>{
      if(!observeFish(this.save.data.life,id))return;
      this.save.write();this.life.refresh(this.save.data.life);
      this.ui.toast(`发现${ITEMS[id].name} · 已收入农鱼图鉴（B）`,3000);
    });
    this.fish.sync(ensureHome(this.save.data.life).expansions);
    this.pondLife = new SimPondEcosystem(ctx.scene);
    // 3 ARPG elemental training dummies at the open park lawn for testing E/R/Q skills & 11 reactions
    const trainingTargets: Vec[] = [
      [10.2, inland(10.2, 48.0), 48.0],
      [13.0, inland(13.0, 48.8), 48.8],
      [11.5, inland(11.5, 51.4), 51.4],
    ];
    this.slime = new SlimeCharacter(ctx, {
      world, spawn: homeSpawn, ui: false, trainingTargets, showCollisionBoxes: false, title: '凝露港', homeDash: true,
      onToast: text => this.ui.toast(text, 2200),
      onReady: () => this.ready(),
      onLand: (speed, swimming) => { if (swimming && speed > 1.2) this.waterImpact=speed; },
      onElementAttack: ev => this.handleElementAttack(ev),
    }).attach();
    ctx.pipeline.waterBed=(x:number,z:number)=>this.slime.world.terrain(x,z)??inland(x,z);
    this.slime.arm=4.8;
    this.slime.oceanWaveSampler=(x,z,t)=>ctx.ocean?.isOceanAt?.(x,z)?ctx.ocean.sampleWave(x,z,t):null;
    this.ui.bindCharacter(this.slime);
    ctx.reflectActor=(renderer:any,camera:any,target:any)=>{
      if(this.slime.running)this.slime.renderer.renderReflection(renderer,camera,target);
    };
    this.sports=new SportsSession({ctx,slime:this.slime,life:this.save.data.life,day:localDayKey,
      save:()=>{this.save.write();this.life.refresh(this.save.data.life);},
      splash:(x,z,y)=>this.fx.splash([x,y,z],2.5,y)});
    this.save.write();
    ctx.rainSurface=(x:number,z:number)=>{
      const world=this.slime.world;
      const solid=world.support(x,z,Infinity,true)??ctx.groundY(x,z);
      const water=world.fluid(x,z);
      if(water!==null && water>solid+.008){
        const wave=ctx.ocean?.isOceanAt?.(x,z)?ctx.ocean.sampleWave(x,z):null;
        return {height:wave?wave.seaLevel+wave.height:water,water:true};
      }
      return {height:ctx.grassField.rainHeight(x,z,solid),water:false};
    };
    ctx.rainBody=()=>{
      const s=this.slime, frame=s.latest;
      if(!s.running || !frame?.count || frame.generation!==s.generation || !frame.centers[0])return null;
      const g=s.renderer.geometry;
      return {positions:g.attributes.position.array, clusters:g.attributes.cluster.array,
        count:g.drawRange.count,center:frame.centers[0],radii:frame.radii[0],offset:s.surfaceOffset(),generation:s.generation};
    };

    this.buildUI = new BuildUI({
      openOrchardHelp: () => this.openGuide('orchard'),
      setTool: tool => this.builder.setTool(tool),
      restore: redo => this.builder.restore(redo),
      transform: scale => this.builder.transform(scale),
      selectItem: id => this.builder.selectItem(id),
      toggleDemolish: () => this.builder.setDemolish(!this.builder.demolishMode),
      applyPreset: id => this.builder.applyPreset(id),
      setExpandMode: on => this.builder.setExpandMode(on),
      selectFrontierSlot: id => this.builder.selectFrontierSlot(id),
      selectExpansionTheme: th => this.builder.selectExpansionTheme(th),
      toggleSandboxFreeExpand: () => this.builder.toggleSandboxFreeExpand(),
      confirmExpand: () => this.builder.confirmExpand(),
      setVoxelMode: on => this.builder.setVoxelMode(on),
      selectVoxelBlock: id => this.builder.selectVoxelBlock(id),
      setVoxelTint: hex => this.builder.setVoxelTint(hex),
      selectVoxelBlueprint: id => this.builder.selectVoxelBlueprint(id),
      saveVoxelBlueprint: () => this.builder.saveCurrentVoxelBlueprint(),
      exit: () => this.toggleBuildMode(false),
    });

    this.builder = new HomeBuilder({
      ctx,
      life: this.save.data.life,
      nativeFootprints: home.footprints,
      souvenirs: () => this.save.data.souvenirs,
      dayKey: () => localDayKey(),
      mmdd: () => this.showing?.shown?.day ?? realToday().id,
      env: () => ({
        season: this.app.director.sky.season,
        weather: this.app.director.target,
        hour: new Date().getHours(),
        historyDay: !!(this.showing?.isToday && this.showing.shown.chapters.some(c => c.status === 'web')),
      }),
      ground: (x, z) => this.slime.world.terrain(x, z),
      fluid: (x, z) => this.slime.world.fluid(x, z),
      syncCollision: boxes => {this.builderBoxes = boxes; this.syncHomeBoxes();},
      syncExpansions: exps => this.syncExpansions(exps),
      farmRegistry: this.farmRegistry,
      openMuseum: () => this.life.openTab('museum', this.save.data.life, localDayKey(), this.lifeUIContext()),
      teleport: pos => this.slime.teleport(pos),
      onFloatText: (pos, text, color) => this.slime.spawnFloatingText(pos, text, color, 1.1),
      save: () => this.save.write(),
      toast: (t, ms) => this.ui.toast(t, ms),
      onChange: () => {
        this.buildUI.show(this.builder.active, this.save.data.life, this.builderUIState());
        this.life.refresh(this.save.data.life);
      },
    });

    this.orchard = new HomeOrchard({
      ctx, slime: this.slime, life: this.save.data.life,
      openHelp: () => this.openGuide('orchard'),
      save: () => { this.save.write(); this.life.refresh(this.save.data.life); },
      toast: (msg, ms) => this.ui.toast(msg, ms),
      onBoxes: boxes => {
        this.orchardBoxes = boxes;
        this.syncHomeBoxes();
        this.builder.syncGrassExclusionMask();
      },
    });
    ctx.anglingHour=()=>this.app.director.minute===null ? new Date(Date.now()+8*3600000).getUTCHours() : Math.floor(this.app.director.minute/60);
    ctx.anglingSupport=(x:number,z:number)=>this.slime.world.support(x,z,Infinity,true);
    this.player = this.makePlayer();
    this.oceanAdventure = new OceanAdventure({
      ctx,
      slime: this.slime,
      life: this.save.data.life,
      lifeUI: this.life,
      save: () => this.save.write(),
      toast: (msg, ms) => this.ui.toast(msg, ms),
      getExpansions: () => this.currentExpansions,
      isHistoryDay: () => !!(this.showing?.isToday && this.showing.shown.chapters.some(c => c.status === 'web')),
      isPlaying: () => this.state === 'play',
      refreshOceanWorld: () => this.applyDynamicWorld(),
      setOceanSurfaceBuoyancy: enabled => {
        this.oceanBuoyancy = enabled;
        this.applyDynamicWorld();
      },
    });
    const near=()=>Math.hypot(this.slime.position[0]-HOUSE.x,this.slime.position[2]-HOUSE.z)<9;
    this.companions=new CompanionPanel({life:this.save.data.life,biomes:this.preserves,ranch:this.builder.ranch,near,
      help:()=>{this.guideFromCompanions=true;this.openGuide('companions');},
      position:()=>this.slime.position,change:()=>{this.save.write();this.builder.ranch.sync();this.life.refresh(this.save.data.life);},
      furniture:()=>{this.cottage.sync();this.syncHomeBoxes();},toast:s=>this.ui.toast(s,3500),lock:on=>{this.slime.setMenuPointer('quickMenu',on);this.slime.inputLock=on||!!this.oceanAdventure.companionDeck;if(on)this.slime.keys.clear();}});
    window.addEventListener('home-companions',()=>{this.life.dex(null);this.companions.open();});
    document.addEventListener('visibilitychange',()=>{this.lastPlayable=false;if(document.hidden)this.flushPetTime();});
    window.addEventListener('pagehide',()=>this.flushPetTime());
    (window as any).__ocean = this.oceanAdventure;
    this.graphics = new Graphics(ctx, this.slime, this.zones.roots); this.graphics.set(this.save.data.quality);
    this.graphics.onAutoChange = p => this.ui.toast(`画面有点吃力，已自动调到「${PRESET_NAMES[p]}」画质 · 暂停菜单里可以改`, 3600);
    (window as any).__graphics = this.graphics;
    window.__slime = this.slime; (window as any).__game = this;
    this.shards=new Shards(ctx);this.refreshShards();
    this.shards.onCollect=(spot,n)=>{
      if(!this.save.collectShard(spot.id))return;
      this.slime.setMood('Happy',1,70);this.life.refresh(this.save.data.life);
      this.ui.toast(`✦ 今日碎片 ${n}/${SHARD_COUNT} · ${spot.hint} · 贝壳 +${SHARD_SHELLS}`);
    };
    const query = new URLSearchParams(location.search);
    const linkedDay = query.get('date') ?? query.get('from')?.split('-')[0];
    this.applyShowing(linkedDay && days[linkedDay] ? linkedDay : this.save.data.selectedDay);
    ctx.onUpdate((t: number, dt: number) => this.update(t, dt)); ctx.renderSlime = (pass: any) => this.slime.render(pass);
    window.addEventListener('keydown', e => this.key(e));
  }

  private info() { const today = realToday(); return {ready: this.slime.ready, todayId: today.id, year: today.year, weekday: today.weekday, shown: this.showing.shown, isToday: this.showing.isToday, quality: this.save.data.quality}; }
  private ready() { if (this.state === 'loading') { this.start(); } }
  private titleScreen() { this.ui.title(this.info()); }
  private applyShowing(selected = this.save.data.selectedDay) {
    this.showing = resolveShowing(selected);
    const gates = gatesFor(this.showing.shown);
    this.portals.forEach((p, i) => {
      const g = gates[i];
      const complete = g?.type === 'story' ? g.stories.every(c => this.save.data.completed.includes(c.id)) && g.archive.every(m=>this.save.data.completed.includes(m.saveId)) :
        !!g?.challenge && this.save.data.completed.includes(g.challenge.saveId);
      p.setGate(g, complete);
    });
    this.ui.stampDay(String(Number(this.showing.today.slice(2))));
  }

  private openSky(){
    this.ui.setQuickMenu(false);
    if(this.state==='sky'){this.resume();return;}
    if(this.state!=='play')return;
    this.life.dex(null);
    this.state='sky';this.slime.pause();this.ui.skyPanel();
  }
  private toggleDex() {
    if (this.state !== 'play') return;
    this.ui.setQuickMenu(false);
    this.life.dex(this.life.dexOpen ? null : this.save.data.life, localDayKey(), this.lifeUIContext());
  }
  private refreshShards(){
    const daily=this.save.daily();
    const spots=dailyLocations(daily,this.save.data.life.home?.expansions??[],this.slime.world);
    daily.spots=spots;this.shards.arrange(spots,daily.shards);this.shardLayoutDirty=false;this.save.write();
  }

  private builderUIState() {
    return {
      selectedId: this.builder.selectedItemId,
      tool: this.builder.tool, presetId: this.builder.presetId,
      canUndo: this.builder.history.canUndo, canRedo: this.builder.history.canRedo,
      demolish: this.builder.demolishMode,
      expandMode: this.builder.expandMode,
      voxelMode: this.builder.voxelMode,
      selectedVoxelId: this.builder.selectedVoxelId,
      voxelTint: this.builder.voxelTint,
      voxelBlueprintId: this.builder.voxelBlueprintId,
      souvenirCount: this.save.data.souvenirs.length,
      selectedSlotId: this.builder.selectedSlotId,
      selectedTheme: this.builder.selectedTheme,
      frontierFocus: this.builder.frontierFocus,
    };
  }

  private lifeUIContext() {
    return {
      souvenirCount: this.save.data.souvenirs.length,
      mmdd: this.showing?.shown?.day ?? realToday().id,
      voxelPens: this.builder.voxels.fencedPastures,
      onMutate: () => {
        this.builder.ranch.sync();
        this.save.write();
        this.life.refresh(this.save.data.life);
      },
      toast: (msg: string, ms?: number) => this.ui.toast(msg, ms),
    };
  }

  private syncHomeBoxes() {
    this.slime.setDynamicBoxes([...this.builderBoxes, ...this.orchardBoxes,...this.cottage.furnitureBoxes,...this.preserves.boxes]);
    this.shardLayoutDirty = true;
  }

  private orchardPlaying() {
    return !this.sports?.active && this.state === 'play' && !this.life.dexOpen && !this.ui.quickMenuOpen &&
      this.oceanAdventure?.mode === 'idle' && !this.oceanAdventure.angling.active;
  }

  private useFocusedSpot() {
    if (!this.orchardPlaying() || this.orchard.action() || !this.focus) return;
    if (this.focus.kind === 'lectern') this.openBook();
    else if (this.focus.kind === 'spot') this.focus.spot.act();
    else this.openDoor(this.focus.portal);
  }

  private syncExpansions(expansions: ExpandedTile[]) {
    this.currentExpansions = expansions;
    this.preserves?.sync();
    if(this.preserves)this.syncHomeBoxes();
    this.coastalSurfaces = buildCoastalCollisionSurfaces(expansions, 96);
    this.fish.sync(expansions);
    this.oceanAdventure?.syncExpansions(expansions);
    bindSportSite(expansions,this.save.data.life.sports?.site);
    // Build undo restores a cloned tile array, so rebind before baking its coast and previews.
    if(this.builder && expansions!==this.currentExpansions)
      this.builder.frontier.sync(expansions,this.builder.selectedTheme);
    this.applyDynamicWorld();
    this.shardLayoutDirty=true;
  }

  private applyDynamicWorld() {
    const expansions = this.currentExpansions;
    if(!this.coastalSurfaces.length)this.coastalSurfaces=buildCoastalCollisionSurfaces(expansions,96);
    const surfaces = [...this.coastalSurfaces];
    const fluids: FluidVolume[] = [...this.nativeFluids];
    for (const tile of expansions) {
      const pond=lotusPond(tile);
      if(pond)fluids.push({min:[pond.x-pond.radius,pond.z-pond.radius],max:[pond.x+pond.radius,pond.z+pond.radius],level:pond.level,circle:true,sink:.12});
      const s = buildExpansionSurface(tile);
      if (s) surfaces.push(s);
    }
    if (this.oceanBuoyancy) {
      fluids.push(...buildOceanFluidVolumes(expansions, 76));
    }
    const bounds=computeExpandedBounds(expansions);
    if(this.preserves){
      surfaces.push(...this.preserves.surfaces);
      fluids.unshift(...this.preserves.fluids);
      for(const r of this.preserves.rects)bounds.max[2]=Math.max(bounds.max[2],r.maxZ+55);
    }
    this.oceanAdventure?.islands.extend(surfaces,fluids,bounds,this.oceanBuoyancy);
    surfaces.push(...this.sportsPark.surfaces);fluids.unshift(...this.sportsPark.fluids);
    bounds.max[0]=Math.max(bounds.max[0],this.sportsPark.courts[4].x+116);
    this.slime.setDynamicSurfaces(surfaces, bounds, fluids);
  }

  private handleElementAttack(ev: SwingAreaEvent) {
    this.farmRegistry.hitArea(ev, Date.now(), (pos, outcome) => {
      this.slime.slashVfx.spawnBurst(pos, ev.element, outcome.destroyed ? 24 : 14, outcome.destroyed ? 3.2 : 2.2);
      this.slime.spawnFloatingText(pos, outcome.label, outcome.color, 1.15);
      if (outcome.destroyed) {
        this.slime.setMood('Wicked', 0.65, 55);
      } else if (outcome.rare) {
        this.slime.setMood('Happy', 0.9, 60);
      }
    });
    this.builder.handleElementAttack(ev);
  }

  private toggleBuildMode(force?: boolean) {
    const want = force ?? (this.state !== 'build');
    if (want) {
      if (this.state !== 'play' && this.state !== 'pause') return;
      this.state = 'build';
      this.ui.panel(null);
      this.ui.prompt(null);
      this.life.dex(null);
      this.slime.pause();
      this.ui.showHud(false);
      this.builder.enter(this.slime.position);
      this.buildUI.show(true, this.save.data.life, this.builderUIState());
    } else if (this.state === 'build') {
      this.builder.exit();
      this.buildUI.show(false);
      this.resume();
    }
  }

  private openSeedShop() {
    if (this.state !== 'play') return;
    this.ui.setQuickMenu(false);
    this.state = 'shop';
    this.slime.pause();
    this.ui.prompt(null);
    this.buildUI.openSeedShop(
      this.save.data.life,
      localDayKey(),
      msg => { this.save.write(); this.life.refresh(this.save.data.life); this.ui.toast(msg, 2200); },
      () => { if (this.state === 'shop') this.resume(); },
    );
  }

  private openSeedPicker(onPick: (seedId: string) => void) {
    if (this.state !== 'play') return;
    this.ui.setQuickMenu(false);
    this.state = 'shop';
    this.slime.pause();
    this.ui.prompt(null);
    this.buildUI.openSeedPicker(
      this.save.data.life,
      seedId => onPick(seedId),
      () => { if (this.state === 'shop') this.resume(); },
    );
  }

  private start() {
    if (!this.slime.ready || (this.state !== 'title' && this.state !== 'loading')) return;
    this.ui.title(null); this.ui.panel(null); this.slime.play(); this.slime.yaw = spawnYaw; this.slime.pitch = .10; this.state = 'play'; this.ui.showHud(true); this.life.show(true); this.refreshHud();
    if (this.returnFrom) {
      const origin = this.returnFrom;
      const portal = this.portals.find(p => gateContains(p.gate, origin));
      if (portal) { const fx = Math.sin(portal.slot.yaw), fz = Math.cos(portal.slot.yaw); this.slime.teleport([portal.slot.position[0] + fx * 2.3, 0, portal.slot.position[2] + fz * 2.3]); this.slime.yaw = Math.atan2(-fx, -fz); this.doorLatch.add(portal.slot.slot); }
      const done = this.save.data.completed.includes(progressId(this.returnFrom));
      const daily=this.save.daily(),won=daily.lastWin===progressId(origin);
      if(won){delete daily.lastWin;this.save.write();}
      const message=won?`今日首胜 · 贝壳 +${GATE_SHELLS} · 已通关 ${daily.gates.length}/6 扇门`:done?'回到凝露港 · 这扇门的故事已经写进史书':'回到凝露港';
      setTimeout(()=>this.ui.toast(message,3600),500);
      const returnDay = this.showing.shown.day;
      this.returnFrom = null; history.replaceState(null, '', location.pathname);
      this.applyShowing(returnDay);
    } else if(this.save.data.life.sailing?.run){this.oceanAdventure.restoreVoyage();}
    if(!this.save.data.life.home?.ranch?.starter && !this.save.data.life.sailing?.run)this.companions.open('starter');
    else if (this.save.add('seenHints', 'start')) setTimeout(() => this.ui.toast('临水书埠 · 西南柳岸钓台可乘史莱姆号出海，按 V 建造家园。', 4500), 600);
  }
  private flushPetTime(){
    if(this.carePlayed>0)advanceRescue(this.save.data.life,Date.now(),this.carePlayed);
    this.carePlayed=0;this.save.write();
  }
  private updatePets(now:number){
    const playable=this.orchardPlaying()&&!this.companions.visible&&!document.hidden;
    if(playable && this.lastPlayable)this.carePlayed+=Math.max(0,performance.now()-this.careAt);
    this.careAt=performance.now();this.lastPlayable=playable;
    if(now-this.lastCareSave<2000)return;
    this.lastCareSave=now;
    const life=this.save.data.life,animals=life.home?.ranch?.animals??[],before=animals.length;
    const tracked=animals.some(a=>a.care && (now>=a.care.due || a.care.notified));
    const ids=advanceRescue(life,now,this.carePlayed);this.carePlayed=0;
    if(tracked || before!==animals.length)this.save.write();
    if(before!==animals.length)this.ui.toast('有伙伴离世，名字已留在手账纪念册。',5000);
    if(ids.length&&playable)this.companions.open('rescue');
    this.builder.ranch.sync();
  }
  private resume() { if (this.state === 'door') this.stepOutOfDoor(); if (this.state === 'shop') this.buildUI.closeSeedShop(); if (this.state === 'title' || this.state === 'loading') { this.ui.panel(null); this.state = 'title'; return; } this.ui.panel(null); this.slime.play(); this.state = 'play'; this.ui.showHud(true); this.refreshHud(); }
  private pauseGame() { if (this.state !== 'play') return; this.state = 'pause'; this.slime.pause(); this.ui.pause(this.save.data.quality, PRESET_NAMES[this.graphics.preset]); }
  private openBook() {
    if (this.state === 'book') { this.closePanel(true); return; }
    if (this.state === 'door') this.stepOutOfDoor();
    if (this.state === 'build') { this.builder.exit(); this.buildUI.show(false); }
    this.panelFrom = this.state === 'title' || this.state === 'loading' ? 'title' : 'play';
    this.state = 'book'; if (this.slime.mode === 'play') this.slime.pause();
    this.ui.book({todayId: this.showing.today, shownId: this.showing.shown.day, souvenirs: this.save.data.souvenirs, visited: this.save.data.visited, completed: this.save.data.completed, imprintOrder: this.save.data.life.records['0101-trial-daily-imprint']});
  }
  private openGuide(section?: string) {
    this.ui.setQuickMenu(false);
    if (this.state === 'guide') { this.closePanel(true); return; }
    if (this.state === 'door') this.stepOutOfDoor();
    if (this.state === 'build') { this.builder.exit(); this.buildUI.show(false); }
    this.life.dex(null);
    this.ui.dismissKeysHint();
    if(this.sports?.active){this.sports.toggleHelp();return;}
    this.panelFrom = this.state === 'title' || this.state === 'loading' ? 'title' : this.state === 'pause' ? 'pause' : this.state === 'shop' ? 'shop' : 'play';
    if (this.panelFrom === 'shop') this.buildUI.setShopHelpOpen(true);
    this.state = 'guide';
    if (this.slime.mode === 'play') this.slime.pause();
    this.ui.guide(section ?? (this.orchard?.state.mode !== 'idle' || this.panelFrom === 'shop' ? 'orchard' : undefined));
  }
  /** byGesture: a click or key that may re-acquire pointer lock; Escape cannot, so it lands on the pause card instead. */
  private closePanel(byGesture: boolean) {
    if (this.state !== 'book' && this.state !== 'guide' && this.state !== 'door' && this.state !== 'pause') return;
    if (this.state === 'door') this.stepOutOfDoor();
    if (this.panelFrom === 'title' && (this.state === 'book' || this.state === 'guide')) { this.state = 'title'; this.ui.panel(null); this.titleScreen(); return; }
    if (this.state === 'guide') {
      if(this.guideFromCompanions){this.guideFromCompanions=false;this.resume();this.companions.resumeHelp();return;}
      if (this.panelFrom === 'shop') {
        this.state = 'shop'; this.ui.panel(null); this.buildUI.setShopHelpOpen(false); return;
      }
      if (this.panelFrom === 'pause') { this.state = 'pause'; this.ui.pause(this.save.data.quality, PRESET_NAMES[this.graphics.preset]); return; }
      this.resume();
      return;
    }
    if (byGesture) this.resume(); else { this.state = 'pause'; this.ui.pause(this.save.data.quality, PRESET_NAMES[this.graphics.preset]); }
  }
  private respawn() { this.slime.reset(); this.slime.yaw = spawnYaw; this.resume(); }
  private toTitle() { this.orchard.cancel(); if (this.state === 'build') { this.builder.exit(); this.buildUI.show(false); } this.ui.setQuickMenu(false); this.ui.setImmersive(false, false); this.ui.resetKeysHint(); this.state = 'title'; this.ui.panel(null); this.ui.showHud(false); this.life.show(false); this.slime.observe(); this.app.ctx.camera.position.fromArray(TITLE_CAM.pos); this.app.ctx.controls.target.fromArray(TITLE_CAM.target); this.app.ctx.controls.update(); this.titleScreen(); }
  private showDay(id: DayId | null) {
    const today = realToday().id;
    this.save.data.selectedDay = id && id !== today && days[id] ? id : null; this.save.write(); this.applyShowing();
    this.ui.toast(this.showing.isToday ? '港口回到了今天' : `港口正在展出 ${dayLabel(this.showing.shown.day)}`);
    if (this.state === 'book') this.ui.book({todayId: this.showing.today, shownId: this.showing.shown.day, souvenirs: this.save.data.souvenirs, visited: this.save.data.visited, completed: this.save.data.completed, imprintOrder: this.save.data.life.records['0101-trial-daily-imprint']});
  }
  private openDoor(portal: TimePortal) {
    const gate = portal.gate; if (!gate) return;
    // Single-destination playable portals launch straight into the level without an extra confirmation modal
    const directId =
      gate.type === 'story' && gate.stories.length === 1 && !gate.archive.length && gate.stories[0].status === 'web'
        ? gate.stories[0].id
        : gate.type === 'story' && !gate.stories.length && gate.archive.length === 1
          ? gate.archive[0].id
          : gate.type === 'mode' && gate.challenge && !gate.additional?.length
            ? gate.challenge.id
            : null;
    if (directId) {
      this.ui.prompt(null);
      this.go(directId);
      return;
    }
    this.state = 'door'; this.panelFrom = 'play'; this.slime.pause(); this.focusPortal = portal;
    const id = defaultEntry(gate);
    if (id) this.save.add('visited', progressId(id));
    this.ui.prompt(null); this.ui.gate(gate, portal.slot.slot, this.save.data.completed);
  }
  private focusPortal: TimePortal | null = null;
  private departing = false;
  private go(id: string) {
    const target = journeyFor(id);
    if (!target || this.departing) return;
    this.departing = true;
    this.save.add('visited', progressId(id));
    this.save.data.selectedDay = target.day === realToday().id ? null : target.day;
    this.save.write();
    this.ui.toast('穿过时光门…'); setTimeout(() => location.assign(target.path), 250);
  }
  /** Coming back from a level: stand in front of the door it was entered from. */
  private returnFrom = new URLSearchParams(location.search).get('from');
  private stepOutOfDoor() {
    const p = this.focusPortal; if (!p) return; this.focusPortal = null;
    const fx = Math.sin(p.slot.yaw), fz = Math.cos(p.slot.yaw), at = p.local(this.slime.position);
    if (Math.abs(at[0]) < 1.2 && at[2] < 1.6) { this.slime.teleport([p.slot.position[0] + fx * 2.3, 0, p.slot.position[2] + fz * 2.3]); this.slime.yaw = Math.atan2(-fx, -fz); }
    this.doorLatch.add(p.slot.slot);
  }
  private key(e: KeyboardEvent) {
    if(this.companions.visible){if(e.code==='F1'&&!e.repeat){e.preventDefault();this.companions.showHelp();}return;}
    if (e.code === 'F1' || e.key === 'F1') {
      e.preventDefault();
      if (!e.repeat && ['play', 'pause', 'title', 'guide', 'shop'].includes(this.state)) this.openGuide();
      return;
    }
    if (e.code === 'F2' || e.key === 'F2') {
      e.preventDefault();
      if (!e.repeat && this.state === 'play') {
        if (this.life.dexOpen) this.life.dex(null);
        this.ui.toggleQuickMenu();
      }
      return;
    }
    if (e.code === 'F3' || e.key === 'F3') {
      e.preventDefault();
      if (!e.repeat && this.state === 'play') {
        if (this.life.dexOpen) this.life.dex(null);
        this.ui.toggleImmersive();
      }
      return;
    }
    if (e.code === 'KeyV' && !e.repeat && (this.state === 'play' || this.state === 'build' || this.state === 'pause')) {
      e.preventDefault();
      this.ui.setQuickMenu(false);
      this.toggleBuildMode();
      return;
    }
    if((e.code==='Digit8'||e.code==='Numpad8')&&!e.repeat && !(e.target instanceof HTMLInputElement)){
      if(this.state==='play'||this.state==='sky'){e.preventDefault();this.openSky();return;}
    }
    if(e.code==='Escape' && this.state==='sky'){this.state='pause';this.ui.pause(this.save.data.quality,PRESET_NAMES[this.graphics.preset]);return;}
    if (e.code === 'KeyB' && !e.repeat && this.state === 'play') { this.toggleDex(); return; }
    if (e.code === 'Escape' && this.life.dexOpen) { this.life.dex(null); return; }
    if (e.code === 'Escape' && this.state === 'build') { this.toggleBuildMode(false); return; }
    if (e.code === 'Escape' && this.state === 'shop') { this.buildUI.closeSeedShop(); this.state = 'pause'; this.ui.pause(this.save.data.quality, PRESET_NAMES[this.graphics.preset]); return; }
    if (e.code === 'Enter' && this.state === 'title') { this.start(); return; }
    if (e.code === 'KeyJ' && !e.repeat && ['play', 'book', 'title', 'pause'].includes(this.state)) { e.preventDefault(); if (this.state === 'pause') { this.state = 'play'; } this.openBook(); return; }
    if (this.state === 'door' && (e.code === 'Enter' || e.code === 'KeyF') && !e.repeat) {
      // A focused secondary action or one row in a choice list keeps native Enter activation.
      if (e.code === 'Enter' && (e.target as HTMLElement | null)?.closest?.('button, summary, a')) return;
      const destination = this.ui.singleDeparture();
      if (destination) { e.preventDefault(); destination.click(); }
      return;
    }
    if (e.code === 'KeyF' && !e.repeat) {
      this.useFocusedSpot();
      return;
    }
    if (e.code === 'Escape' && (this.state === 'book' || this.state === 'guide' || this.state === 'door')) { this.closePanel(false); }
  }
  private update(t: number, dt: number) {
    const s = this.slime;
    this.oceanAdventure?.prepareHull(t, dt);
    this.orchard.update(dt, this.orchardPlaying());
    s.update(t, dt);
    if(this.waterImpact){
      const wSample=this.app.ctx.ocean?.isOceanAt?.(s.position[0],s.position[2])?this.app.ctx.ocean.sampleWave(s.position[0],s.position[2],t):null;
      const splashY=wSample?wSample.seaLevel+wSample.height:(s.world.fluid(s.position[0],s.position[2])??undefined);
    if(this.sports.active && this.state==='play'){
      s.update(t,dt);this.sports.update(dt);this.followSun();this.fx.update(dt,s);
      this.ui.prompt(null);this.ui.setCrosshair(false,true,false);return;
    }
      this.fx.splash(s.position,this.waterImpact,splashY);
      this.waterImpact=0;
    }
    this.fish.update(t,this.state==='play'?s.position:null);
    this.pondLife.update(dt, this.state==='play'?s.position:null, this.state==='play'?s.velocity:null, s.spread);
    this.oceanAdventure?.update(t, dt);
    this.cottage.update(s.position,dt);
    this.builder.ranch.deck=this.oceanAdventure.companionDeck;
    this.builder.ranch.interior=this.cottage.inside?this.cottage.interior:null;
    if(this.cottage.inside){
      const [x,y,z]=s.position;
      const cam=this.app.ctx.camera;
      cam.position.set(x+.46,y+2.82,z+1.50);
      cam.lookAt(x,y+.30,z);cam.updateMatrixWorld();
    }
    this.preserves.update(s.position,dt);this.updatePets(Date.now());
    this.fx.update(dt, s); this.lectern.update(t);
    this.builder.update(t, dt);
    if (this.state === 'play') this.builder.stepPlayer(this.player, t, dt);
    if(this.builder.active)this.buildUI.setStatus(this.builder.currentGhostStatus.reason);
    for (const p of this.portals) { p.hover += ((this.focus?.kind === 'portal' && this.focus.portal === p ? 1 : 0) - p.hover) * (1 - Math.exp(-dt * 8)); p.update(t, dt); }
    this.portalParticles.sync(t, this.portals);
    if (this.state === 'play' && s.mode !== 'play') { this.state = 'pause'; this.ui.pause(this.save.data.quality, PRESET_NAMES[this.graphics.preset]); }
    if(this.shardLayoutDirty || this.app.director.sky.date!==this.save.data.homeDaily?.date)this.refreshShards();
    this.shards.update(t, dt, this.state === 'play' ? s.position : [0, -99, 0]);
    for (const u of this.zones.updates) u(t, dt, this.player);
    this.farmRegistry.update(dt, this.player);
    this.graphics.update(dt, this.state === 'play');
    this.followSun();
    const climate=this.app.director;
    this.ui.setSkyStatus(climate.sky.date,seasonNames[climate.sky.season],weatherNames[climate.target as keyof typeof weatherNames]);
    if (this.state !== 'play') {
      this.oceanAdventure?.angling.stop();
      this.ui.setCrosshair(false, true, false);
      return;
    }
    // Zero-latency per-frame crosshair & ARPG combat HUD sync (1s switch CD + E/R/Q CD + Q energy ring)
    this.ui.setCrosshair(s.aiming, s.aimReady, s.aimRecoil > 0.25);
    this.ui.updateCharacterHud();
    if (s.swimming && this.save.add('seenHints', 'swim')) this.ui.toast('漂起来了！水属性游得最快 · 沿浅滩或廊桥旁的石岸可以上岸', 4200);
    if(this.oceanAdventure?.angling.active){this.ui.prompt(null);this.oceanAdventure.angling.update(t,dt);return;}
    if(this.companions.visible){this.ui.prompt(null);return;}
    if (this.orchard.state.mode === 'idle') this.interact();
    else { this.focus = null; this.ui.prompt(null); }
    this.hudTimer -= dt; if (this.hudTimer <= 0) { this.hudTimer = .2; this.refreshHud(); }
  }
  private interact() {
    const p = this.slime.position; let best: typeof this.focus = null, score = Infinity;
    for (const portal of this.portals) {
      if (!portal.gate) continue;
      const l = portal.local(p);
      if (Math.abs(l[0]) < .8 && l[2] > -.5 && l[2] < .3 && p[1] < 1.6) { if (!this.doorLatch.has(portal.slot.slot)) { this.openDoor(portal); return; } }
      else if (Math.abs(l[0]) > 1.4 || l[2] > 1.2 || l[2] < -1.2) this.doorLatch.delete(portal.slot.slot);
      if (Math.abs(l[0]) < 1.6 && l[2] > -.6 && l[2] < 3 && l[2] < score) { score = l[2]; best = {kind: 'portal', portal}; }
    }
    const dl = Math.hypot(p[0] - plazaCenter[0], p[2] - plazaCenter[2]);
    if (dl < 2 && dl < score) best = {kind: 'lectern'};
    let spotPrompt: {title: string; sub: string} | null = null;
    if (!best) {
      const allSpots = [
        ...this.sportsPark.spots,
        ...this.preserves.spots(),
        ...this.preserves.plots().map((p,i):Interactable=>({id:'natural-plot-'+i,position:[p.x,this.slime.world.terrain(p.x,p.z)??0,p.z],radius:3.4,
          prompt:()=>({title:p.name,sub:'按 F 选择植物与种植位置'}),act:()=>this.companions.openPlot(i)})),
        ...([[HOUSE.x,HOUSE.z+7.15,'凝露小院','pets'],[HOUSE.x+5.75,HOUSE.z+3.05,'布置房间','room'],[HOUSE.x-5.65,HOUSE.z+3.0,'宠物食槽','pets']] as const)
          .map(([x,z,title,page]):Interactable=>({id:title,position:[x,HOUSE.y,z],radius:1.95,prompt:()=>({title,sub:'按 F 打开 · 直接走过门槛可进屋'}),act:()=>this.companions.open(page)})),
        ...this.zones.interactables,
        ...this.farmRegistry.getInteractables(),
        ...this.builder.getInteractables(this.player),
      ];
      for (const spot of allSpots) {
        const d = Math.hypot(p[0] - spot.position[0], p[2] - spot.position[2]);
        if (d < spot.radius && Math.abs(p[1] - spot.position[1]) < 2.2 && d < score) {
          const pr = spot.prompt();
          if (pr) { score = d; best = {kind: 'spot', spot}; spotPrompt = pr; }
        }
      }
    }
    this.focus = best;
    if (!best) { this.ui.prompt(null); return; }
    // Lower interact prompt anchors to fit the short slime comfortably in the player's natural sightline
    const anchor = best.kind === 'lectern'
      ? new this.T.Vector3(plazaCenter[0], 1.45, plazaCenter[2])
      : best.kind === 'spot'
        ? new this.T.Vector3(best.spot.position[0], best.spot.position[1] + 0.95, best.spot.position[2])
        : new this.T.Vector3(best.portal.slot.position[0], 1.25, best.portal.slot.position[2]);
    const v = anchor.project(this.app.ctx.camera);
    if (v.z > 1) { this.ui.prompt(null); return; }
    const x = (v.x * .5 + .5) * innerWidth, y = (-v.y * .5 + .5) * innerHeight;
    if (best.kind === 'lectern') this.ui.prompt({x, y, title: '翻开史书', sub: `今天是 ${dayLabel(this.showing.today)}`});
    else if (best.kind === 'spot') this.ui.prompt({x, y, ...spotPrompt!});
    else { const gate = best.portal.gate!; this.ui.prompt({x, y, title: gateTitle(gate), sub: gateSummary(gate)}); }
  }
  /** The shadow camera covers 92 m; keep it centred on the slime (snapped to whole texels so shadows don't swim). */
  private followSun() {
    const sun = this.app.ctx.sun; if (!sun) return; const p = this.slime.position, step = 92 / 4096 * 8;
    const x = Math.round(p[0] / step) * step, z = Math.round(p[2] / step) * step;
    if (sun.userData.offset === undefined) { sun.userData.offset = sun.position.clone().sub(sun.target.position); }
    sun.target.position.set(x, 0, z); sun.position.copy(sun.target.position).add(sun.userData.offset); sun.target.updateMatrixWorld();
  }
  private player!: PlayerHandle;
  private makePlayer(): PlayerHandle {
    const s = this.slime, ui = this.ui;
    return {
      get position() { return s.position; }, get velocity() { return s.velocity; }, get grounded() { return s.grounded; }, get swimming() { return s.swimming; },
      get clinging() { return !!s.cling; }, get element() { return s.element; }, get spread() { return s.spread; },
      get hasMoveInput() { return s.keys.has('KeyW') || s.keys.has('KeyA') || s.keys.has('KeyS') || s.keys.has('KeyD'); },
      get isDashing() { return s.isDashing; },
      launch: v => { s.cling = null; s.ridePlane = null; s.umbrella.cancel(); s.velocity = [...v]; s.grounded = false; s.jumps = 1; },
      carry: (delta, surfaceY) => {
        s.position[0] += delta[0];
        s.position[2] += delta[2];
        if (surfaceY !== undefined) {
          s.position[1] = surfaceY;
          if (s.velocity[1] < 0) s.velocity[1] = 0;
          s.grounded = true;
          s.jumps = 0;
        } else {
          s.position[1] += delta[1];
        }
      },
      seatAt: (pos, plane) => {
        s.cling = null;
        s.umbrella.cancel();
        s.position[0] = pos[0];
        s.position[1] = pos[1];
        s.position[2] = pos[2];
        s.velocity[0] = 0;
        s.velocity[1] = 0;
        s.velocity[2] = 0;
        s.grounded = true;
        s.jumps = 0;
        s.ridePlane = {point: [...plane.point], normal: [...plane.normal]};
        s.renderer.setOffset(s.surfaceOffset());
      },
      clearRide: () => { s.ridePlane = null; },
      refreshBoxes: () => { s.world.refreshBoxes(); },
      toast: (text, ms) => ui.toast(text, ms), mood: (m, sec = .8) => s.setMood(m as any, sec, 70), lock: on => { s.inputLock = on; },
    };
  }
  private refreshHud() {
    this.life.refresh(this.save.data.life);
    const home = ensureHome(this.save.data.life);
    const today = realToday(), sh = this.showing, n = this.shards.count, total = SHARD_COUNT;
    const visitedToday = sh.shown.chapters.some(c => this.save.data.visited.includes(c.id));
    const objective = home.placed.length === 0
      ? `每门每日首胜 +${GATE_SHELLS} 贝壳 · 每枚时光碎片 +${SHARD_SHELLS} 贝壳`
      : !visitedToday
        ? '左侧历史故事，右侧固定玩法 · 按 B 查看今日家园手账与来客'
        : n < total
          ? `家园 Lv.${home.level} · 在港口找时光碎片或种田吸引小动物`
          : `家园 Lv.${home.level} · 碎片已集齐，继续扩建你的凝露家园`;
    this.ui.hud({
      day: `${dayLabel(today.id)} · ${today.weekday}`,
      sub: `展出 ${dayLabel(sh.shown.day)} · 家园 Lv.${home.level} · 今日首胜 ${this.save.data.homeDaily?.gates.length??0}/6`,
      objective, shards: n, total, element: this.slime.element,
      aiming: this.slime.aiming, aimReady: this.slime.aimReady, aimRecoil: this.slime.aimRecoil > 0.25,
      umbrella: this.slime.umbrellaOpen,
    });
  }
}
