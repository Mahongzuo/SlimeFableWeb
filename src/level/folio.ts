import './folio.css';
import * as T from 'three';
import {Stage} from './stage';
import {levels} from '../../content/levels/registry';
import type {FolioSpec} from '../../content/levels/types';
import {FOLIO, RITE_ELEMENT, RITE_HINT, RITE_NAME, MEDAL_NAME, folioMedal, folioWorld, inWindow, nearStation, onPedestal, touchesLight} from '../templates/folio';
import {buildFolio, folioLook} from '../themes/folio';
import {SlimeCharacter} from '../slime/character';
import {LevelUI} from '../ui/level-ui';
import {Save} from '../game/save';
import {applyLevelQuality} from '../game/graphics';
import {dayLabel} from '../game/calendar';
const id = new URLSearchParams(location.search).get('id') ?? '';
const spec = levels[id] as FolioSpec;
if (!spec || spec.template !== 'folio') { document.body.innerHTML = `<p style="font:16px sans-serif;padding:40px">找不到关卡 ${id}。<a href="./">回到港口</a></p>`; throw new Error('unknown folio level ' + id); }
const [day, year] = id.split('-');
const stage = new Stage(folioLook(spec)), save = new Save(), art = buildFolio(stage, spec);
type Phase = 'intro' | 'play' | 'pause' | 'finale' | 'done';
let phase: Phase = 'intro', time = 0, elapsed = 0, misses = 0, dips = 0, wet = false, finaleT = -1, seconds = 0;
const view = {active: 0, done: [false, false, false], taken: FOLIO.lights.map(() => false), ready: false, finale: -1, camera: stage.camera};
const need = RITE_ELEMENT[spec.rite];
const ui = new LevelUI({start: () => start(), resume: () => resume(), restart: () => location.reload(), home: () => goHome()}, `${dayLabel(day)} · ${year}`);
const ctx = {THREE: T, renderer: stage.renderer, scene: stage.scene, camera: stage.camera, sun: stage.sun, controls: stage.controls};
const slime = new SlimeCharacter(ctx, {world: folioWorld(), spawn: [FOLIO.spawn[0], .6, FOLIO.spawn[2]], ui: false, trainingTargets: [], title: spec.title, onToast: () => {}, onReady: () => { if (phase === 'intro') showIntro(); }}).attach();
ui.bindCharacter(slime);
applyLevelQuality(stage, slime, save.data.quality);
const hud = ui.root.querySelector('.hud')!, clockLabel = document.createElement('div'); clockLabel.className = 'folio-clock'; hud.appendChild(clockLabel);
const rite = document.createElement('div'); rite.className = 'folio-rite'; hud.appendChild(rite);
const records = save.data.life.records;
function showIntro() {
  const steps = [...spec.stops.map(s => `${s}　·　${RITE_NAME[spec.rite]}`), '攀上石台，' + spec.finale];
  const best = records[id + '-time-ms'], medal = records[id + '-medal'];
  if (best) steps.push(`个人纪录 ${(best / 1000).toFixed(1)} 秒 · ${MEDAL_NAME[medal] ?? ''} · 银杏灯 ${records[id + '-lights'] ?? 0} / ${FOLIO.lights.length}`);
  ui.intro(spec.title, spec.intro, steps, slime.ready);
}
const stepText = () => view.ready ? '攀上尽头的石台，按 F：' + spec.finale : `${spec.stops[view.active]}　·　${RITE_NAME[spec.rite]}`;
function refresh() {
  ui.quest({title: spec.title, branch: stepText(), count: view.taken.filter(Boolean).length, total: FOLIO.lights.length, complete: false, index: view.done.filter(Boolean).length + (phase === 'finale' ? 1 : 0), branches: 4,
    side: {title: `银杏灯 ${view.taken.filter(Boolean).length} / ${FOLIO.lights.length}`, done: view.taken.every(Boolean)}} as any);
  rite.textContent = view.ready ? '' : RITE_HINT[spec.rite]; rite.hidden = view.ready || phase !== 'play';
}
function start() { if (!slime.ready || phase !== 'intro') return; ui.panel(null); slime.play(); slime.yaw = 0; phase = 'play'; ui.showHud(true); refresh(); setTimeout(() => ui.banner(`${dayLabel(day)} · ${year}`, spec.title), 300); }
function resume() { if (phase === 'done') { location.reload(); return; } ui.panel(null); slime.play(); phase = 'play'; ui.showHud(true); refresh(); }
function goHome() { location.href = './?from=' + encodeURIComponent(id); }
function perform() {
  if (phase !== 'play') return;
  const p = slime.position;
  if (view.ready) { if (onPedestal(p)) beginFinale(); return; }
  const i = view.active; if (!nearStation(p, i)) return;
  if (slime.element !== need) { ui.toast(RITE_HINT[spec.rite], 3200); slime.setMood('Hurt', .7, 50); return; }
  if (!inWindow(time, i)) { misses++; art.miss(i); ui.toast('差一点 · 等光环与金环重合再按 F', 1800); slime.setMood('Hurt', .5, 40); return; }
  view.done[i] = true; art.stationBurst(i); slime.setMood('Happy', 1, 70);
  if (i < 2) { view.active = i + 1; ui.banner(`${RITE_NAME[spec.rite]}　${i + 1} / 3`, spec.stops[i]); }
  else { view.ready = true; ui.banner('三处都亮了', '去石桥尽头的石台'); }
  refresh();
}
function beginFinale() {
  phase = 'finale'; finaleT = 0; slime.pause(); ui.showHud(false); ui.prompt(null);
  seconds = elapsed; setTimeout(() => ui.banner(`${dayLabel(day)} · ${year}`, spec.finale), 900);
}
function finish() {
  phase = 'done';
  const medal = folioMedal(spec, seconds), lights = view.taken.filter(Boolean).length, ms = Math.round(seconds * 1000);
  records[id + '-time-ms'] = Math.min(records[id + '-time-ms'] || Infinity, ms);
  records[id + '-medal'] = Math.max(records[id + '-medal'] || 0, medal);
  records[id + '-lights'] = Math.max(records[id + '-lights'] || 0, lights);
  if (!dips) records[id + '-dry'] = 1;
  if (!misses) records[id + '-flawless'] = 1;
  if (lights === FOLIO.lights.length) save.add('souvenirs', id);
  save.add('completed', id); save.write();
  const extra = `　用时 ${seconds.toFixed(1)} 秒 · ${MEDAL_NAME[medal]} · 银杏灯 ${lights} / ${FOLIO.lights.length}${misses ? '' : ' · 三处一次成功'}${dips ? '' : ' · 滴水未沾'}。`;
  ui.complete(spec.title, spec.outro + extra, spec.souvenir, save.data.souvenirs.includes(id));
  const again = ui.root.querySelector<HTMLButtonElement>('.complete [data-act="resume"]');
  if (again) again.textContent = '再走一遍 · 收齐银杏灯';
  else { const b = document.createElement('button'); b.className = 'btn'; b.textContent = '再走一遍 · 挑战金牌'; b.onclick = () => location.reload(); ui.root.querySelector('.complete .stack')?.appendChild(b); }
}
addEventListener('keydown', e => {
  if (e.code === 'Enter' && phase === 'intro') start();
  if (e.code === 'KeyF' && !e.repeat) perform();
});
const project = (x: number, y: number, z: number) => { const v = new T.Vector3(x, y, z).project(stage.camera); return v.z > 1 ? null : {x: (v.x * .5 + .5) * innerWidth, y: (-v.y * .5 + .5) * innerHeight}; };
const eye = new T.Vector3(), look = new T.Vector3(), aim = new T.Vector3(), tracked = new T.Vector3();
stage.camera.position.set(9, 7, 33); look.set(0, 1.5, 14); stage.camera.lookAt(look);
let hudTimer = 0;
function step(delta: number) {
  const dt = Math.min(Math.max(delta, 0), .05); time += dt;
  slime.update(time, dt);
  if (phase === 'play' && slime.mode !== 'play') { phase = 'pause'; ui.showHud(false); ui.panelPause(); }
  const p = slime.position;
  if (phase === 'play') {
    elapsed += dt;
    FOLIO.lights.forEach((l, i) => { if (!view.taken[i] && touchesLight(p, l)) { view.taken[i] = true; art.lightBurst(i); slime.setMood('Happy', .6, 40); ui.toast(`银杏灯 ${view.taken.filter(Boolean).length} / ${FOLIO.lights.length}`); refresh(); } });
    const inWater = p[1] < -.12; if (inWater && !wet) dips++; wet = inWater;
    let prompt: {x: number; y: number; title: string; sub: string} | null = null;
    if (view.ready) { if (onPedestal(p)) { const at = project(art.pedestal.x, art.pedestal.y + 1.6, art.pedestal.z); if (at) prompt = {...at, title: 'F　' + spec.finale, sub: '三处已亮'}; } }
    else if (nearStation(p, view.active)) { const [x, z] = FOLIO.stations[view.active], at = project(x, 3, z);
      if (at) prompt = {...at, title: `F　${RITE_NAME[spec.rite]}`, sub: slime.element === need ? '光环与金环重合时按下' : RITE_HINT[spec.rite].split('，')[0]}; }
    ui.prompt(prompt);
    const s = Math.floor(elapsed); if (clockLabel.dataset.s !== String(s)) { clockLabel.dataset.s = String(s); clockLabel.textContent = `${s} 秒　·　金牌 ${spec.medals.gold} 秒`; }
    hudTimer -= dt; if (hudTimer <= 0) { hudTimer = .15; ui.hud(slime.aiming); }
  }
  if (phase === 'finale' || phase === 'done') {
    finaleT += dt;
    if (phase === 'finale' && finaleT >= 8.5) finish();
    art.track(tracked);
    const f = Math.min(finaleT, 12), R = Math.max(24, art.height * 2) + f * .6, a = .5 - f * .06;
    const high = tracked.y > art.focus.y + 6;
    aim.copy(art.focus).lerp(tracked, high ? 1 : .5); if (high) aim.y += 4;
    eye.set(art.focus.x + Math.sin(a) * R, art.focus.y + 1.5 + f * .3 + (high ? (tracked.y - art.focus.y) * .65 : 0), art.focus.z + Math.cos(a) * R);
    const k = 1 - Math.exp(-dt * 1.6); stage.camera.position.lerp(eye, k); look.lerp(aim, high ? 1 - Math.exp(-dt * 5) : k); stage.camera.lookAt(look);
  } else if (phase === 'intro') { look.set(0, 1.5, 14); stage.camera.position.lerp(eye.set(9 + Math.sin(time * .1) * 1.5, 7, 33), .02); stage.camera.lookAt(look); }
  view.finale = phase === 'finale' || phase === 'done' ? finaleT : -1;
  art.update(time, dt, view);
  stage.render(dt, slime);
}
const clock = new T.Clock(); stage.renderer.setAnimationLoop(() => step(clock.getDelta()));
showIntro();
(window as any).__slime = slime;
(window as any).__level = {spec, stage, step, view, art, get phase() { return phase; }, get time() { return time; }, finale: () => { view.done = [true, true, true]; view.ready = true; beginFinale(); }};
