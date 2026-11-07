import {SlimeCharacter} from '../slime/character';
import {Vec, distance} from '../slime/types';
import {buildHomeWorld} from '../world/home-world';
import type {BuiltZones} from '../zones';
import {LifeUI} from '../ui/life-ui';
import type {Interactable, PlayerHandle} from '../zones/types';
import {HarborWater} from '../home/harbor-water';
import {homeSpawn, plazaCenter, portalSlots, SEA_LEVEL, shardSpots, spawnYaw} from '../home/layout';
import {TimePortal} from '../home/portals';
import {Lectern, Shards} from '../home/props';
import {SeaFX} from '../home/sea-fx';
import {GameUI} from '../ui/game-ui';
import {Save} from './save';
import {Showing, resolveShowing} from './schedule';
import {DayId, dayLabel, realToday} from './calendar';
import {days} from '../../content/registry';
type State = 'loading' | 'title' | 'play' | 'pause' | 'book' | 'door';
const TITLE_CAM = {pos: [-8, 6.8, 35] as Vec, target: [6, 1.9, 20] as Vec};
/** Home = 晴雨港. Owns the state machine; the slime, harbour and UI only talk through here. */
export class Game {
  state: State = 'loading'; private panelFrom: State = 'play'; private ui: GameUI; readonly slime: SlimeCharacter; private save = new Save();
  private showing!: Showing; private portals: TimePortal[]; private lectern: Lectern; private shards: Shards; private fx: SeaFX; private puddles: HarborWater;
  private zones!: BuiltZones; private life: LifeUI; private focus: {kind: 'portal'; portal: TimePortal} | {kind: 'lectern'} | {kind: 'spot'; spot: Interactable} | null = null; private hudTimer = 0; private doorLatch = new Set<number>(); private T: any;
  constructor(private app: any) {
    const ctx = app.ctx; this.T = ctx.THREE;
    this.ui = new GameUI({
      start: () => this.start(), resume: () => this.resume(), pause: () => this.pauseGame(), openBook: () => this.openBook(), closePanel: () => this.closePanel(true),
      showDay: id => this.showDay(id), showToday: () => this.showDay(null), respawn: () => this.respawn(), quality: q => { this.slime.quality = q; this.save.data.quality = q; this.save.write(); },
      toTitle: () => this.toTitle(), element: i => this.slime.setElement(i), go: id => this.go(id),
    });
    ctx.camera.position.fromArray(TITLE_CAM.pos); ctx.controls.target.fromArray(TITLE_CAM.target); ctx.controls.update();
    // plaza pieces exist before the bake so their meshes become part of the height field
    this.portals = portalSlots.map(s => new TimePortal(ctx, s));
    this.lectern = new Lectern(ctx);
    this.life = new LifeUI(); this.life.show(false);
    const home = buildHomeWorld(ctx, this.save.data.life, () => this.save.write(), {hud: this.life, historyDay: () => this.showing?.isToday && this.showing.shown.chapters.some(c => c.status === 'web')}), world = home.world; this.zones = home.zones;
    this.fx = new SeaFX(ctx);
    this.slime = new SlimeCharacter(ctx, {world, spawn: homeSpawn, ui: false, trainingTargets: [], showCollisionBoxes: false, title: '晴雨港',
      onToast: () => {}, onReady: () => this.ready(),
      onLand: (speed, swimming) => { if (swimming && speed > 1.2) this.fx.splash(this.slime.position, speed); }}).attach();
    this.slime.quality = this.save.data.quality; this.player = this.makePlayer();
    window.__slime = this.slime; (window as any).__game = this;
    this.puddles = new HarborWater(ctx, this.slime);
    this.shards = new Shards(ctx, this.save.data.shards);
    this.shards.onCollect = (spot, n) => { this.save.add('shards', spot.id); this.slime.setMood('Happy', 1, 70); this.ui.toast(n === shardSpots.length ? `✦ 12 枚时光碎片全部找齐了！` : `✦ 时光碎片 ${n} / ${shardSpots.length} · ${spot.hint}`); };
    this.applyShowing(); this.titleScreen();
    ctx.onUpdate((t: number, dt: number) => this.update(t, dt)); ctx.renderSlime = (pass: any) => this.slime.render(pass);
    window.addEventListener('keydown', e => this.key(e));
  }
  private info() { const today = realToday(); return {ready: this.slime.ready, todayId: today.id, year: today.year, weekday: today.weekday, shown: this.showing.shown, isToday: this.showing.isToday, quality: this.save.data.quality}; }
  private ready() { if (this.state === 'loading') { this.state = 'title'; this.titleScreen(); } }
  private titleScreen() { this.ui.title(this.info()); }
  private applyShowing() {
    this.showing = resolveShowing(this.save.data.selectedDay);
    this.portals.forEach((p, i) => p.setChapter(this.showing.shown.chapters[i] ?? null, this.save.data.visited.includes(this.showing.shown.chapters[i]?.id ?? '')));
    this.ui.stampDay(String(Number(this.showing.today.slice(2))));
  }
  private start() {
    if (!this.slime.ready || (this.state !== 'title' && this.state !== 'loading')) return;
    this.ui.title(null); this.ui.panel(null); this.slime.play(); this.slime.yaw = spawnYaw; this.state = 'play'; this.ui.showHud(true); this.life.show(true); this.refreshHud();
    if (this.returnFrom) {
      const portal = this.portals.find(p => p.chapter?.id === this.returnFrom);
      if (portal) { const fx = Math.sin(portal.slot.yaw), fz = Math.cos(portal.slot.yaw); this.slime.teleport([portal.slot.position[0] + fx * 2.3, 0, portal.slot.position[2] + fz * 2.3]); this.slime.yaw = Math.atan2(-fx, -fz); this.doorLatch.add(portal.slot.slot); }
      const done = this.save.data.completed.includes(this.returnFrom);
      setTimeout(() => this.ui.toast(done ? '回到晴雨港 · 这扇门的故事已经写进史书' : '回到晴雨港', 3600), 500);
      this.returnFrom = null; history.replaceState(null, '', location.pathname);
      this.applyShowing();
    } else if (this.save.add('seenHints', 'start')) setTimeout(() => this.ui.toast('欢迎回到晴雨港 · 走近史书或时光门，按 F 看看', 4200), 600);
  }
  private resume() { if (this.state === 'title' || this.state === 'loading') { this.ui.panel(null); this.state = 'title'; return; } this.ui.panel(null); this.slime.play(); this.state = 'play'; this.ui.showHud(true); }
  private pauseGame() { if (this.state !== 'play') return; this.state = 'pause'; this.slime.pause(); this.ui.pause(this.save.data.quality); }
  private openBook() {
    if (this.state === 'book') { this.closePanel(true); return; }
    if (this.state === 'door') this.stepOutOfDoor();
    this.panelFrom = this.state === 'title' || this.state === 'loading' ? 'title' : 'play';
    this.state = 'book'; if (this.slime.mode === 'play') this.slime.pause();
    this.ui.book({todayId: this.showing.today, shownId: this.showing.shown.day, souvenirs: this.save.data.souvenirs, visited: this.save.data.visited, completed: this.save.data.completed});
  }
  /** byGesture: a click or key that may re-acquire pointer lock; Escape cannot, so it lands on the pause card instead. */
  private closePanel(byGesture: boolean) {
    if (this.state !== 'book' && this.state !== 'door' && this.state !== 'pause') return;
    if (this.state === 'door') this.stepOutOfDoor();
    if (this.panelFrom === 'title' && this.state === 'book') { this.state = 'title'; this.ui.panel(null); this.titleScreen(); return; }
    if (byGesture) this.resume(); else { this.state = 'pause'; this.ui.pause(this.save.data.quality); }
  }
  private respawn() { this.slime.reset(); this.slime.yaw = spawnYaw; this.resume(); }
  private toTitle() { this.state = 'title'; this.ui.panel(null); this.ui.showHud(false); this.life.show(false); this.slime.observe(); this.app.ctx.camera.position.fromArray(TITLE_CAM.pos); this.app.ctx.controls.target.fromArray(TITLE_CAM.target); this.app.ctx.controls.update(); this.titleScreen(); }
  private showDay(id: DayId | null) {
    const today = realToday().id;
    this.save.data.selectedDay = id && id !== today && days[id] ? id : null; this.save.write(); this.applyShowing();
    this.ui.toast(this.showing.isToday ? '港口回到了今天' : `港口正在展出 ${dayLabel(this.showing.shown.day)}`);
    if (this.state === 'book') this.ui.book({todayId: this.showing.today, shownId: this.showing.shown.day, souvenirs: this.save.data.souvenirs, visited: this.save.data.visited, completed: this.save.data.completed});
  }
  private openDoor(portal: TimePortal) {
    const c = portal.chapter; if (!c) return;
    this.state = 'door'; this.panelFrom = 'play'; this.slime.pause(); this.focusPortal = portal;
    if (this.save.add('visited', c.id)) portal.setChapter(c, true);
    this.ui.prompt(null); this.ui.door(c, portal.slot.slot, this.save.data.completed.includes(c.id));
  }
  private focusPortal: TimePortal | null = null;
  /** Leave through a time portal: the level is its own page (see 11/7 plan). */
  private go(id: string) { this.ui.toast('穿过时光门…'); setTimeout(() => { location.href = 'level.html?id=' + encodeURIComponent(id); }, 250); }
  /** Coming back from a level: stand in front of the door it was entered from. */
  private returnFrom = new URLSearchParams(location.search).get('from');
  private stepOutOfDoor() {
    const p = this.focusPortal; if (!p) return; this.focusPortal = null;
    const fx = Math.sin(p.slot.yaw), fz = Math.cos(p.slot.yaw), at = p.local(this.slime.position);
    if (Math.abs(at[0]) < 1.2 && at[2] < 1.6) { this.slime.teleport([p.slot.position[0] + fx * 2.3, 0, p.slot.position[2] + fz * 2.3]); this.slime.yaw = Math.atan2(-fx, -fz); }
    this.doorLatch.add(p.slot.slot);
  }
  private key(e: KeyboardEvent) {
    if (e.code === 'KeyB' && !e.repeat && this.state === 'play') { this.life.dex(this.life.dexOpen ? null : this.save.data.life); return; }
    if (e.code === 'Escape' && this.life.dexOpen) { this.life.dex(null); }
    if (e.code === 'Enter' && this.state === 'title') { this.start(); return; }
    if (e.code === 'KeyJ' && !e.repeat && ['play', 'book', 'title', 'pause'].includes(this.state)) { e.preventDefault(); if (this.state === 'pause') { this.state = 'play'; } this.openBook(); return; }
    if (e.code === 'KeyF' && !e.repeat) {
      if (this.state === 'door') { const c = this.focusPortal?.chapter; if (c?.status === 'web') this.go(c.id); else this.closePanel(true); return; }
      if (this.state === 'play' && this.focus) { if (this.focus.kind === 'lectern') this.openBook(); else if (this.focus.kind === 'spot') this.focus.spot.act(); else this.openDoor(this.focus.portal); }
      return;
    }
    if (e.code === 'Escape' && (this.state === 'book' || this.state === 'door')) { this.closePanel(false); }
  }
  private update(t: number, dt: number) {
    const s = this.slime;
    s.update(t, dt); this.puddles.update(dt); this.fx.update(dt, s); this.lectern.update(t);
    for (const p of this.portals) { p.hover += ((this.focus?.kind === 'portal' && this.focus.portal === p ? 1 : 0) - p.hover) * (1 - Math.exp(-dt * 8)); p.update(t, dt); }
    if (this.state === 'play' && s.mode !== 'play') { this.state = 'pause'; this.ui.pause(this.save.data.quality); }
    this.shards.update(t, dt, this.state === 'play' ? s.position : [0, -99, 0]);
    for (const u of this.zones.updates) u(t, dt, this.player);
    this.followSun();
    if (this.state !== 'play') return;
    if (s.swimming && this.save.add('seenHints', 'swim')) this.ui.toast('漂起来了！水属性游得最快 · 东边的船坡和浮码头可以上岸', 4200);
    this.interact();
    this.hudTimer -= dt; if (this.hudTimer <= 0) { this.hudTimer = .2; this.refreshHud(); }
  }
  private interact() {
    const p = this.slime.position; let best: typeof this.focus = null, score = Infinity;
    for (const portal of this.portals) {
      if (!portal.chapter) continue;
      const l = portal.local(p);
      if (Math.abs(l[0]) < .8 && l[2] > -.5 && l[2] < .3 && p[1] < 1.6) { if (!this.doorLatch.has(portal.slot.slot)) { this.openDoor(portal); return; } }
      else if (Math.abs(l[0]) > 1.4 || l[2] > 1.2 || l[2] < -1.2) this.doorLatch.delete(portal.slot.slot);
      if (Math.abs(l[0]) < 1.6 && l[2] > -.6 && l[2] < 3 && l[2] < score) { score = l[2]; best = {kind: 'portal', portal}; }
    }
    const dl = Math.hypot(p[0] - plazaCenter[0], p[2] - plazaCenter[2]);
    if (dl < 2 && dl < score) best = {kind: 'lectern'};
    let spotPrompt: {title: string; sub: string} | null = null;
    if (!best) for (const spot of this.zones.interactables) { const d = Math.hypot(p[0] - spot.position[0], p[2] - spot.position[2]); if (d < spot.radius && Math.abs(p[1] - spot.position[1]) < 2 && d < score) { const pr = spot.prompt(); if (pr) { score = d; best = {kind: 'spot', spot}; spotPrompt = pr; } } }
    this.focus = best;
    if (!best) { this.ui.prompt(null); return; }
    const anchor = best.kind === 'lectern' ? new this.T.Vector3(plazaCenter[0], 1.95, plazaCenter[2]) : best.kind === 'spot' ? new this.T.Vector3(best.spot.position[0], best.spot.position[1] + 1.2, best.spot.position[2]) : new this.T.Vector3(best.portal.slot.position[0], 3.05, best.portal.slot.position[2]);
    const v = anchor.project(this.app.ctx.camera);
    if (v.z > 1) { this.ui.prompt(null); return; }
    const x = (v.x * .5 + .5) * innerWidth, y = (-v.y * .5 + .5) * innerHeight;
    if (best.kind === 'lectern') this.ui.prompt({x, y, title: '翻开史书', sub: `今天是 ${dayLabel(this.showing.today)}`});
    else if (best.kind === 'spot') this.ui.prompt({x, y, ...spotPrompt!});
    else { const c = best.portal.chapter!; this.ui.prompt({x, y, title: `走进 ${c.year}`, sub: c.event.length > 16 ? c.event.slice(0, 15) + '…' : c.event}); }
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
      launch: v => { s.cling = null; s.velocity = [...v]; s.grounded = false; s.jumps = 1; },
      toast: (text, ms) => ui.toast(text, ms), mood: (m, sec = .8) => s.setMood(m as any, sec, 70), lock: on => { s.inputLock = on; },
    };
  }
  private refreshHud() {
    this.life.refresh(this.save.data.life);
    const today = realToday(), sh = this.showing, n = this.shards.count, total = shardSpots.length;
    const visitedToday = sh.shown.chapters.some(c => this.save.data.visited.includes(c.id));
    const objective = !visitedToday ? '走近一扇时光门，按 F 看看门后是哪一年' : n < total ? `在港口里找时光碎片 · 屋顶、水面和防波堤上都有` : '碎片都找齐了 · 换一天的档案看看？按 J';
    this.ui.hud({day: `${dayLabel(today.id)} · ${today.weekday}`, sub: sh.isToday ? `今天开着 ${sh.shown.chapters.length} 扇门` : `今日档案整理中 · 港口展出 ${dayLabel(sh.shown.day)}`, objective, shards: n, total, element: this.slime.element, aiming: this.slime.aiming});
  }
}
