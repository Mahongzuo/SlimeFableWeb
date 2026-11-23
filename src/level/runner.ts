import * as THREE from 'three';
import {Stage} from './stage';
import {levels} from '../../content/levels/registry';
import type {RunnerSpec} from '../../content/levels/types';
import {generateRunner, validateRunner} from '../templates/runner';
import {beipingKit, type RunnerKit} from '../themes/beiping';
import {sfKit} from '../themes/sf1936';
import {bakeRegion} from '../world/bake';
import {SlimeCharacter} from '../slime/character';
import type {Vec} from '../slime/types';
import {LevelUI} from '../ui/level-ui';
import {Save} from '../game/save';
import {applyLevelQuality} from '../game/graphics';
import {dayLabel} from '../game/calendar';
/** Runner chapters: dash along the course, gather the pickups, reach the finish. Time is kept as a personal best. */
const id = new URLSearchParams(location.search).get('id') ?? '';
const spec = levels[id] as RunnerSpec;
const kits: Record<string, RunnerKit> = {'beiping-1949': beipingKit, 'sf-1936': sfKit};
const layout = generateRunner(spec), check = validateRunner(layout);
if (!check.ok) console.warn('[runner] course check failed', check.errors);
const kit = kits[spec.theme] ?? beipingKit, stage = new Stage(kit.look), save = new Save();
kit.build(stage, layout, spec);
const [day, year] = id.split('-');
// ---- collision: bake what the theme built (people, walls, roofs…) into a 0.1 m height field
const end = layout.bounds.max[0];
const baked = bakeRegion({THREE, scene: stage.scene}, {x0: -4, z0: -14, w: end + 8, h: 28, ground: () => null, classify: () => 'solid'});
const fluids = layout.water.map(w => ({...w, sink: .14}));
const world = {boxes: [], surfaces: [{min: [-10, -20] as [number, number], max: [end + 10, 20] as [number, number], height: -5.5}], height: baked.height ?? undefined, fluids, bounds: layout.bounds};
// ---- pickups: little paper flags on sticks
const flagTex = (() => { const c = document.createElement('canvas'); c.width = 96; c.height = 64; const g = c.getContext('2d')!; g.fillStyle = '#d8322a'; g.fillRect(0, 0, 96, 64); g.fillStyle = '#f7d24a';
  const star = (x: number, y: number, r: number, rot = 0) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .4 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
  star(16, 16, 9.6); for (const [x, y] of [[32, 6.4], [38.4, 12.8], [38.4, 22.4], [32, 28.8]]) star(x, y, 3.2, Math.atan2(16 - y, 16 - x) + Math.PI / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
interface Pick {g: THREE.Group; base: number; taken: boolean; fade: number}
const picks: Pick[] = layout.pickups.map(p => {
  const g = new THREE.Group(); g.position.set(p[0], p[1], p[2]); g.name = 'pickup-fx';
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .5, 5), stage.toon('#7a5a3f')); stick.position.y = .05; g.add(stick);
  if (spec.pickup.look === 'ribbon') { const cols = ['#e0453a', '#f2c14e', '#3f7fc0', '#ffffff']; for (let k = 0; k < 3; k++) { const rb = new THREE.Mesh(new THREE.TorusGeometry(.14, .025, 6, 16, Math.PI * 1.6), stage.toon(cols[(k + Math.round(p[0])) % cols.length])); rb.position.set(0, .15 + k * .07, 0); rb.rotation.set(k, k * 1.3, 0); g.add(rb); } }
  else { const flag = new THREE.Mesh(new THREE.PlaneGeometry(.36, .24), stage.toon('#ffffff', {map: flagTex, side: THREE.DoubleSide})); flag.position.set(.19, .2, 0); g.add(flag); }
  g.add(stage.glow('#f2c14e', .9, .45)); stage.scene.add(g); return {g, base: p[1], taken: false, fade: 1};
});
// ---- finish: the flag on the pole rises when the slime reaches the plinth
const pole = layout.pieces.find(p => p.kind === 'pole')!, ribbonFinish = spec.finish.kind === 'ribbon';
const big = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), stage.toon('#ffffff', {map: flagTex, side: THREE.DoubleSide}));
big.position.set(pole.max[0] + 1.2, pole.min[1] + 1.2, 0); big.rotation.y = -Math.PI / 2; big.name = 'finish-flag-fx'; big.visible = !ribbonFinish; stage.scene.add(big);
// ribbon finish: two halves of a red ribbon between the posts fall apart when cut
const halves = ribbonFinish ? [-1, 1].map(s => { const m = new THREE.Mesh(new THREE.BoxGeometry(.05, .16, 3.1), stage.toon('#d8322a')); m.geometry.translate(0, 0, -s * 1.55); m.position.set((pole.min[0] + pole.max[0]) / 2, 1.3, s * 3.1); m.name = 'finish-ribbon-fx'; stage.scene.add(m); return {m, s}; }) : [];
let raise = 0, raising = false;
// ---- slime, ui
const ui = new LevelUI({start: () => start(), resume: () => resume(), restart: () => location.reload(), home: () => goHome()}, `${dayLabel(day)} · ${year}`);
const ctx = {THREE, renderer: stage.renderer, scene: stage.scene, camera: stage.camera, sun: stage.sun, controls: stage.controls};
type State = 'intro' | 'play' | 'pause' | 'done'; let state: State = 'intro';
const slime = new SlimeCharacter(ctx, {world, spawn: layout.spawn, ui: false, trainingTargets: [], title: spec.title, onToast: () => {}, onReady: () => { if (state === 'intro') showIntro(); }}).attach();
ui.bindCharacter(slime);
applyLevelQuality(stage, slime, save.data.quality);
(window as any).__slime = slime; (window as any).__level = {spec, layout, check};
stage.camera.position.set(-6, 5, 8); stage.camera.lookAt(6, 1.5, 0);
const segName = (k: string) => (spec.segmentNames as any)[k] ?? k;
const steps = [...new Set(spec.segments.map(segName))].concat(`沿途收集${spec.pickup.name} 0/${spec.pickup.count}`, spec.finish.label);
const showIntro = () => ui.intro(spec.title, spec.intro, steps, slime.ready); showIntro();
let got = 0, seg = -1, clock = 0;
const best = () => save.data.life.records['runner-' + spec.id];
const view = () => ({title: spec.title, branch: `${spec.pickup.name} · ${fmt(clock)}${best() ? ` · 最好 ${fmt(best() / 1000)}` : ''}`, count: got, total: spec.pickup.count, complete: false, index: Math.max(0, seg), branches: spec.segments.length});
const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
function start() { if (!slime.ready || state !== 'intro') return; ui.panel(null); slime.play(); slime.yaw = layout.spawnYaw; state = 'play'; ui.showHud(true); ui.quest(view()); }
function resume() { ui.panel(null); slime.play(); state = 'play'; ui.showHud(true); }
function goHome() { location.href = './?from=' + encodeURIComponent(spec.id); }
function finish() {
  state = 'done'; raising = true; slime.setMood('Happy', 3, 90);
  const ms = Math.round(clock * 1000), prev = best(), record = !prev || ms < prev;
  if (record) save.data.life.records['runner-' + spec.id] = ms;
  save.add('completed', spec.id); const allFlags = got >= spec.pickup.count; if (allFlags) save.add('souvenirs', spec.id); save.write();
  ui.banner(spec.finish.done, `${fmt(clock)}${record ? ' · 新纪录' : ''} · ${spec.pickup.name} ${got}/${spec.pickup.count}`);
  setTimeout(() => { slime.pause(); ui.showHud(false); ui.complete(spec.title, spec.outro, spec.souvenir, allFlags); }, 4200);
}
addEventListener('keydown', e => { if (e.code === 'Enter' && state === 'intro') start(); });
const timer = new THREE.Clock(); let t = 0, hud = 0;
const loop = () => {
  const dt = Math.min(timer.getDelta(), .05); t += dt;
  slime.update(t, dt);
  if (state === 'play' && slime.mode !== 'play') { state = 'pause'; ui.showHud(false); ui.panelPause(); }
  const p = slime.position;
  if (state === 'play') {
    clock += dt;
    const s = layout.segments.findIndex(q => p[0] >= q.x0 && p[0] < q.x1);
    if (s > seg) { seg = s; ui.banner(`${dayLabel(day)} · ${year}`, segName(layout.segments[s].kind)); }
    if (Math.hypot(p[0] - layout.finish.x, p[2] - layout.finish.z) < layout.finish.r && p[1] > layout.finish.y - .3) finish();
  }
  for (const k of picks) {
    if (k.taken) { if (k.fade > 0) { k.fade = Math.max(0, k.fade - dt * 3); k.g.position.y += dt * 2.5; k.g.scale.setScalar(.2 + k.fade); if (!k.fade) k.g.visible = false; } continue; }
    k.g.position.y = k.base + Math.sin(t * 2.4 + k.base * 3 + k.g.position.x) * .08; k.g.rotation.y = Math.sin(t * 1.5 + k.g.position.x) * .6;
    if (state === 'play' && Math.hypot(p[0] - k.g.position.x, p[2] - k.g.position.z) < .9 && Math.abs(p[1] + .3 - k.base) < 1.1) { k.taken = true; got++; slime.setMood('Happy', .6, 50); ui.quest(view()); if (got === spec.pickup.count) ui.toast(`${spec.pickup.name}全部收齐了！`, 2600); }
  }
  if (raising) { raise = Math.min(1, raise + dt / 4); if (ribbonFinish) for (const h of halves) { h.m.rotation.x = -h.s * Math.min(1.4, raise * 4); h.m.position.y = 1.3 - raise * .2; } else big.position.y = pole.min[1] + 1.2 + raise * (pole.max[1] - pole.min[1] - 2.2); }
  big.rotation.x = Math.sin(t * 2.2) * .05;
  hud -= dt; if (hud <= 0 && state === 'play') { hud = .1; ui.quest(view()); ui.hud(slime.aiming); }
  stage.render(dt, slime);
};
stage.renderer.setAnimationLoop(loop);
(window as any).__level.step = loop; // QA: drive frames when the tab is hidden
export {};
