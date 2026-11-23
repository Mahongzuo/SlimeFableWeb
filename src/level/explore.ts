import * as THREE from 'three';
import {Stage} from './stage';
import {levels} from '../../content/levels/registry';
import type {LevelSpec} from '../../content/levels/types';
import {themes, fallbackTheme} from '../themes';
import {generateExplore} from '../templates/explore-quest';
import {validateLayout} from '../templates/validate';
import {SlimeCharacter} from '../slime/character';
import type {Vec} from '../slime/types';
import {QuestRunner} from '../game/quest';
import {LevelUI} from '../ui/level-ui';
import {Save} from '../game/save';
import {applyLevelQuality} from '../game/graphics';
import {dayLabel} from '../game/calendar';
const SERIF = '"Noto Serif SC","Source Han Serif SC","Songti SC","STSong","SimSun",serif';
const id = new URLSearchParams(location.search).get('id') ?? '';
const spec = levels[id] as LevelSpec;
if (!spec) { document.body.innerHTML = `<p style="font:16px sans-serif;padding:40px">找不到关卡 ${id}。<a href="./">回到港口</a></p>`; throw new Error('unknown level ' + id); }
const layout = generateExplore(spec), check = validateLayout(layout);
if (!check.ok) console.warn('[level] layout check failed', check.errors);
const kit = themes[spec.theme] ?? fallbackTheme, stage = new Stage(kit.look), handles = kit.build(stage, layout, spec), save = new Save();
const [day, year] = id.split('-');
type State = 'intro' | 'play' | 'pause' | 'done';
let state: State = 'intro';
// ---- actors and items (owned by the level, not the theme)
const tag = (text: string) => { const c = document.createElement('canvas'); c.width = 256; c.height = 72; const g = c.getContext('2d')!; g.fillStyle = 'rgba(247,241,227,.95)'; g.strokeStyle = '#2f2a24'; g.lineWidth = 5; g.beginPath(); g.roundRect(4, 4, 248, 64, 20); g.fill(); g.stroke(); g.fillStyle = '#2f2a24'; g.font = `800 34px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 38); const s = new THREE.Sprite(new THREE.SpriteMaterial({map: new THREE.CanvasTexture(c), depthWrite: false, transparent: true})); s.scale.set(1.3, .37, 1); s.layers.set(1); return s; };
const coats = ['#3f5f7a', '#7a5a3f', '#5d7a4a', '#6b4f6b', '#8a6f4a'];
interface Actor {id: string; name: string; group: any; mark: any; spot: Vec; line: number; head: any}
const actors: Actor[] = Object.entries(spec.actors).map(([aid, a], i) => {
  const s = layout.spots[aid], g = new THREE.Group(); g.position.set(s.x, s.y, s.z); g.rotation.y = s.facing ?? 0;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.24, .55, 6, 14), stage.toon(coats[i % coats.length])); body.position.y = .55;
  const head = new THREE.Mesh(new THREE.SphereGeometry(.2, 18, 12), stage.toon('#e8c9a6')); head.position.y = 1.22;
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(.24, .26, .1, 18), stage.toon('#3a3430')); hat.position.y = 1.38;
  stage.add(body, g); stage.add(head, g); stage.add(hat, g);
  const name = tag(a.name); name.position.y = 1.85; g.add(name);
  const mark = stage.glow('#f2c14e', .7, .9); mark.position.y = 2.25; g.add(mark);
  stage.scene.add(g); return {id: aid, name: a.name, group: g, mark, spot: [s.x, s.y, s.z], line: 0, head};
});
interface Item {id: string; group: any; base: number; taken: boolean; hidden: boolean; fade: number}
const items: Item[] = Object.entries(spec.items).map(([iid, it]) => {
  const s = layout.spots[iid], g = new THREE.Group(); g.position.set(s.x, s.y + .55, s.z);
  if (it.slot === 'hidden' || iid === 'copy') { const frame = new THREE.Mesh(new THREE.BoxGeometry(.5, .66, .05), stage.toon('#6b4a2f')); const paper = new THREE.Mesh(new THREE.PlaneGeometry(.42, .58), stage.toon('#f4ecd8')); paper.position.z = .03; const band = new THREE.Mesh(new THREE.PlaneGeometry(.42, .1), stage.toon('#b8483a')); band.position.set(0, .2, .031); g.add(frame, paper, band); }
  else for (let k = 0; k < 3; k++) { const sheet = new THREE.Mesh(new THREE.BoxGeometry(.42, .02, .56), stage.toon(k === 2 ? '#fbf6ea' : '#efe6d2')); sheet.position.y = k * .025; sheet.rotation.y = (k - 1) * .12; g.add(sheet); }
  g.add(stage.glow('#f7d77a', 1.2, .55)); stage.scene.add(g);
  const hidden = it.slot === 'cabinet'; g.visible = !hidden;
  return {id: iid, group: g, base: s.y + .55, taken: false, hidden, fade: 1};
});
// ---- slime, quest, ui
const world = {boxes: layout.boxes, surfaces: [{min: [-40, -40] as [number, number], max: [40, 40] as [number, number], height: 0}], bounds: {min: [-26, -6, -17] as Vec, max: [26, 30, 17] as Vec}};
const quest = new QuestRunner(spec);
const ui = new LevelUI({
  start: () => start(), resume: () => resume(), restart: () => location.reload(), home: () => goHome(),
}, `${dayLabel(day)} · ${year}`);
const ctx = {THREE, renderer: stage.renderer, scene: stage.scene, camera: stage.camera, sun: stage.sun, controls: stage.controls};
const slime = new SlimeCharacter(ctx, {world, spawn: layout.spawn, ui: false, trainingTargets: [], title: spec.title, onToast: () => {}, onReady: () => { if (state === 'intro') showIntro(); }}).attach();
ui.bindCharacter(slime);
applyLevelQuality(stage, slime, save.data.quality);
(window as any).__slime = slime; (window as any).__level = {spec, layout, quest, check};
stage.camera.position.set(-27.5, 8.5, 8); stage.camera.lookAt(-15, 1, 0);
const steps = spec.quest.main.branches.map(b => b.label + (b.targets.length > 1 ? ` 0/${b.targets.length}` : ''));
const showIntro = () => ui.intro(spec.title, spec.intro, steps, slime.ready);
showIntro();
ui.quest(quest.view());
quest.onChange = (v, e) => {
  ui.quest(v);
  if (e === 'progress') ui.toast(`${v.branch} ${v.count} / ${v.total}`);
  if (e === 'branch') ui.banner('新目标', v.branch);
  if (e === 'side') { save.add('souvenirs', spec.id); ui.toast(`✦ 找到纪念品：${spec.quest.side?.souvenir}`, 3600); }
  if (e === 'complete') { save.add('completed', spec.id); ui.banner('章节完成', spec.quest.main.title); setTimeout(() => finish(), 1600); }
};
function start() { if (!slime.ready || state !== 'intro') return; ui.panel(null); slime.play(); slime.yaw = layout.spawnYaw; state = 'play'; ui.showHud(true); setTimeout(() => ui.banner(`${dayLabel(day)} · ${year}`, spec.quest.main.title), 400); }
function resume() { ui.panel(null); slime.play(); state = 'play'; ui.showHud(true); }
function finish() { state = 'done'; slime.pause(); ui.showHud(false); ui.complete(spec.title, spec.outro, spec.quest.side?.souvenir ?? null, quest.sideComplete); }
function goHome() { location.href = './?from=' + encodeURIComponent(spec.id); }
// ---- interaction
let focus: Actor | null = null, cabinetOpen = 0, opened = false, padK = {a: 0, b: 0};
const screen = (p: Vec, lift: number) => { const v = new THREE.Vector3(p[0], p[1] + lift, p[2]).project(stage.camera); return v.z > 1 ? null : {x: (v.x * .5 + .5) * innerWidth, y: (-v.y * .5 + .5) * innerHeight}; };
function talk(a: Actor) {
  const s = spec.actors[a.id], at = screen(a.spot, 2.1);
  if (quest.wants(a.id)) {
    if (s.lock && slime.element !== s.lock.element) { ui.toast(s.lock.hint, 3200); slime.setMood('Hurt', .8, 60); return; }
    quest.hit(a.id); slime.setMood('Happy', 1, 70);
    if (at) ui.speech({...at, name: a.name, text: s.done ?? '谢谢你。'});
  } else {
    const text = quest.handled(a.id) && s.done ? s.done : s.lines[a.line++ % s.lines.length];
    if (at) ui.speech({...at, name: a.name, text});
  }
}
addEventListener('keydown', e => {
  if (e.code === 'Enter' && state === 'intro') start();
  if (e.code === 'KeyF' && !e.repeat && state === 'play' && focus) talk(focus);
});
const clock = new THREE.Clock(); let t = 0, hudTimer = 0;
const loop = () => {
  const dt = Math.min(clock.getDelta(), .05); t += dt;
  slime.update(t, dt);
  if (state === 'play' && slime.mode !== 'play') { state = 'pause'; ui.showHud(false); ui.panelPause(); }
  const p = slime.position;
  for (const a of actors) { a.mark.visible = quest.wants(a.id); a.mark.position.y = 2.25 + Math.sin(t * 3) * .06; const dx = p[0] - a.spot[0], dz = p[2] - a.spot[2]; if (Math.hypot(dx, dz) < 4) a.group.rotation.y += (Math.atan2(dx, dz) - a.group.rotation.y) * Math.min(1, dt * 4); }
  for (const it of items) {
    if (it.taken) { if (it.fade > 0) { it.fade = Math.max(0, it.fade - dt * 2.5); it.group.position.y += dt * 2; it.group.scale.setScalar(.3 + it.fade); if (!it.fade) it.group.visible = false; } continue; }
    if (!it.group.visible) continue;
    it.group.position.y = it.base + Math.sin(t * 2 + it.base) * .07; it.group.rotation.y = t * 1.2;
    if (state === 'play' && quest.wants(it.id) && Math.hypot(p[0] - it.group.position.x, p[2] - it.group.position.z) < .95 && Math.abs(p[1] - (it.base - .55)) < 1.2) { it.taken = true; quest.hit(it.id); slime.setMood('Happy', .8, 60); }
  }
  // split pads: the body presses one, a launched clone has to hold the other
  if (layout.pads) {
    const shots = (slime.latest?.shots ?? []).filter(s => s.phase === 'active');
    const pressed = (s: {x: number; z: number}) => Math.hypot(p[0] - s.x, p[2] - s.z) < .8 || shots.some(c => Math.hypot(c.center[0] - s.x, c.center[2] - s.z) < .75);
    padK.a += ((pressed(layout.pads.a) ? 1 : 0) - padK.a) * Math.min(1, dt * 10); padK.b += ((pressed(layout.pads.b) ? 1 : 0) - padK.b) * Math.min(1, dt * 10);
    handles.pads.a?.press(padK.a); handles.pads.b?.press(padK.b);
    if (!opened && padK.a > .8 && padK.b > .8) { opened = true; ui.banner('机关', '柜门打开了'); const it = items.find(i => i.id === layout.pads!.reward); if (it) it.group.visible = true; }
    cabinetOpen += ((opened ? 1 : 0) - cabinetOpen) * Math.min(1, dt * 3); handles.cabinet?.open(cabinetOpen);
    if (state === 'play' && !opened && (padK.a > .8) !== (padK.b > .8) && !(window as any).__padHint) { (window as any).__padHint = 1; ui.toast('两块踏板要同时压住 · 按住 G 瞄准，左键发射分身去压另一块', 4200); }
  }
  // nearest talkable actor
  focus = null; let best = 2.1;
  if (state === 'play') for (const a of actors) { const d = Math.hypot(p[0] - a.spot[0], p[2] - a.spot[2]); if (d < best) { best = d; focus = a; } }
  if (focus) { const at = screen(focus.spot, 2.1); ui.prompt(at && !ui.speaking ? {...at, title: `和${focus.name}说话`, sub: quest.wants(focus.id) ? quest.view().branch : '聊两句'} : null); if (at && ui.speaking) ui.placeSpeech(at.x, at.y); } else ui.prompt(null);
  hudTimer -= dt; if (hudTimer <= 0) { hudTimer = .15; ui.hud(slime.aiming); }
  stage.render(dt, slime);
};
stage.renderer.setAnimationLoop(loop);
(window as any).__level.step = loop; // QA: drive frames when the tab is hidden
