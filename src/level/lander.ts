import * as THREE from 'three';
import {Stage} from './stage';
import {levels} from '../../content/levels/registry';
import type {LanderSpec} from '../../content/levels/types';
import {LANDER_SHOTS, generateLander, validateLander, inSunlight, batteryAfter, landingBounce, batteryMedal} from '../templates/lander';
import {spaceLook, buildLanderSpace} from '../themes/space';
import {bakeRegion} from '../world/bake';
import {SlimeCharacter} from '../slime/character';
import {LevelUI} from '../ui/level-ui';
import {Save} from '../game/save';
import {applyLevelQuality} from '../game/graphics';
import type {Vec} from '../slime/types';

const id = new URLSearchParams(location.search).get('id') ?? '';
const spec = levels[id] as LanderSpec, layout = generateLander(spec), check = validateLander(layout);
if (!check.ok) throw new Error(check.errors.join('; '));
const stage = new Stage(spaceLook), save = new Save(), art = buildLanderSpace(stage, layout, spec);
const t = layout.terrain;
const baked = bakeRegion({THREE, scene: stage.scene}, {root: art.root, x0: t.x0, z0: t.z0, w: (t.width - 1) * t.cell, h: (t.depth - 1) * t.cell, ground: () => null, classify: () => 'filled'});
if (!baked.height) throw new Error('彗星碰撞烘焙失败');
const world = {boxes: [], surfaces: [], height: baked.height, bounds: layout.bounds};
type State = 'intro' | 'play' | 'pause' | 'transmit' | 'done' | 'failed';
let state: State = 'intro', pausedFrom: 'play' | 'transmit' = 'play';
let elapsed = 0, simulation = 0, battery = spec.battery.capacity, bounces = 0, firstLanding = false;
let impact = -1, reveal = 0, jet = 0, jetCooldown = 0, transmission = 0, hud = 0, interact = false, hidden = false;
const collected = [false, false, false];
const ui = new LevelUI({start, resume, restart: () => location.reload(), home: () => location.href = './?from=' + encodeURIComponent(id)}, '11月12日 · 2014');
const ctx = {THREE, renderer: stage.renderer, scene: stage.scene, camera: stage.camera, sun: stage.sun, controls: stage.controls};
const slime = new SlimeCharacter(ctx, {world, spawn: layout.spawn, gravityScale: spec.gravityScale, ui: false, trainingTargets: [], title: spec.title,
  onToast: text => { if (state === 'play') ui.toast(text); },
  onReady: () => { if (state === 'intro') showIntro(); },
  // The shared attach probe reaches slightly farther than the subsequent climb probe.
  // Seat the body on the detected ice face before its first climb step, using the existing hook.
  onCling: attached => {
    const c = slime.cling;
    if (attached && c) { slime.position[0] = c.point[0] + c.normal[0] * .26; slime.position[2] = c.point[2] + c.normal[2] * .26; }
  },
  onLand: speed => { if (state === 'play') impact = speed; },
}).attach();
ui.bindCharacter(slime);
applyLevelQuality(stage, slime, save.data.quality);
// Battery is local to this runtime; existing level UI and other chapters stay unchanged.
const batteryUI = document.createElement('div'); batteryUI.className = 'card grain';
batteryUI.style.cssText = 'position:absolute;right:20px;top:90px;width:230px;padding:14px;pointer-events:none';
batteryUI.innerHTML = '<div data-battery-label></div><progress aria-label="着陆器电池" max="100" value="100" style="width:100%;height:14px;accent-color:#e8c27a"></progress><small data-flight></small>';
ui.root.querySelector('.hud')!.appendChild(batteryUI);
const batteryLabel = batteryUI.querySelector('[data-battery-label]')!, batteryBar = batteryUI.querySelector('progress')!, flightLabel = batteryUI.querySelector('[data-flight]')!;
batteryBar.max = spec.battery.capacity;
const cameraPosition = new THREE.Vector3(), cameraTarget = new THREE.Vector3(), projected = new THREE.Vector3();
const shots = LANDER_SHOTS;
stage.camera.position.fromArray(shots.opening.position); stage.camera.lookAt(...shots.opening.target);
function showIntro() { ui.intro(spec.title, spec.intro, ['WASD 微调下降 · C 摊开吸收冲击', '空格低重力跳跃 · 朝冰崖持续移动即可贴墙上爬', '3 切换火属性 · 空格短促喷气（消耗电池）', '追随金色阳光，站在三个平台上按 F 展开太阳能板', '到 Abydos 按 F 回传数据；背面的鸭形岩石藏着纪念品'], slime.ready); }
showIntro();
function start() {
  if (state !== 'intro' || !slime.ready) return;
  slime.play(); slime.grounded = false; slime.yaw = -Math.PI / 2; slime.arm = 5.2; slime.pitch = .45;
  state = 'play'; ui.panel(null); ui.showHud(true); save.add('visited', id);
  ui.banner('2014 · 67P 彗星', '从罗塞塔号分离 · 对准 Agilkia'); updateHud();
}
function pause() {
  if (state !== 'play' && state !== 'transmit') return;
  pausedFrom = state; state = 'pause'; interact = false; slime.pause(); ui.showHud(false); ui.panelPause();
}
function resume() {
  if (state !== 'pause') return;
  state = pausedFrom; ui.panel(null); ui.showHud(true);
  if (state === 'play') slime.play();
}
function fail() {
  state = 'failed'; slime.pause(); ui.showHud(false);
  ui.panel('<div class="overlay"><div class="pause card grain"><h2>电池进入休眠</h2><p>下一次先追随金色阳光补充电量，再展开太阳能板；按住 C 能减少着陆反弹。</p><div class="stack"><button class="btn primary" data-act="restart">重新着陆</button><button class="btn ghost" data-act="home">回到港口</button></div></div></div>');
}
function complete() {
  state = 'done'; slime.pause(); ui.showHud(false);
  const records = save.data.life.records, medal = batteryMedal(spec, battery), ms = Math.round(elapsed * 1000);
  records[id + '-battery'] = Math.max(records[id + '-battery'] ?? 0, Math.round(battery * 100));
  records[id + '-medal'] = Math.max(records[id + '-medal'] ?? 0, medal);
  records[id + '-time'] = Math.min(records[id + '-time'] ?? Infinity, ms);
  records[id + '-science'] = 3;
  if (!bounces) records[id + '-no-bounce'] = 1;
  save.add('completed', id); save.add('souvenirs', id); save.write();
  const result = `${['', '铜', '银', '金'][medal]}牌 · 剩余电池 ${battery.toFixed(0)}% · 用时 ${elapsed.toFixed(1)}秒 · ${bounces ? `反弹 ${bounces} 次` : '一次也不弹挑战达成'}${hidden ? ' · 鸭形岩石已收集' : ''}`;
  ui.banner('数据已传回地球', result); ui.complete(spec.title, spec.outro + '\n' + result, spec.souvenir, true);
  const stack = ui.root.querySelector('.complete .stack');
  if (stack) { const button = document.createElement('button'); button.className = 'btn'; button.dataset.act = 'restart'; button.textContent = '再次着陆 · 挑战奖牌与鸭形岩石'; stack.appendChild(button); }
}
function near(p: Vec, radius: number) { return slime.grounded && Math.hypot(slime.position[0] - p[0], slime.position[2] - p[2]) < radius && Math.abs(slime.position[1] - p[1]) < .55; }
function prompt(position: Vec, title: string, sub: string) {
  projected.set(position[0], position[1] + 1.2, position[2]).project(stage.camera);
  ui.prompt({x: Math.max(180, Math.min(innerWidth - 180, (projected.x * .5 + .5) * innerWidth)), y: Math.max(180, Math.min(innerHeight - 100, (-projected.y * .5 + .5) * innerHeight)), title, sub});
}
function objectives() {
  ui.prompt(null);
  const p = slime.position;
  if (!hidden && Math.hypot(p[0]-layout.hidden.position[0],p[2]-layout.hidden.position[2]) < 2 && p[1] < 2) {
    hidden = true; save.add('souvenirs', id + '-duck-rock'); save.data.life.records[id + '-duck-rock'] = 1; save.write();
    ui.toast('发现隐藏纪念品：' + spec.hiddenSouvenir); art.duck.scale.setScalar(.75);
  }
  for (let i=0;i<3;i++) if (!collected[i] && near(layout.platforms[i].position, layout.platforms[i].radius)) {
    const sunny = inSunlight(spec, layout, p, elapsed);
    prompt(layout.platforms[i].position, sunny ? '展开太阳能板 · 收集数据' : '等待阳光移过来', sunny ? spec.science[i] : '光柱下的细圈内可以充电；阴影里无法采集');
    if (interact && sunny) { collected[i] = true; ui.banner('科学数据 ' + collected.filter(Boolean).length + ' / 3', spec.science[i]); slime.setMood('Happy'); }
  }
  if (near(layout.abydos.position, layout.abydos.radius)) {
    const all = collected.every(Boolean);
    prompt(layout.abydos.position, all ? '连接罗塞塔号 · 回传数据' : '还需要三份科学数据', all ? 'Abydos 位于悬崖阴影里，回传需要 8 秒' : `已收集 ${collected.filter(Boolean).length} / 3`);
    if (interact && all) { state = 'transmit'; transmission = 0; slime.pause(); ui.prompt(null); ui.banner('Abydos · 罗塞塔号正在过顶', '建立数据链路'); }
  }
  interact = false;
}
function updateHud() {
  const sunny = inSunlight(spec, layout, slime.position, elapsed), count = collected.filter(Boolean).length;
  ui.quest({title: spec.title, branch: !firstLanding ? '对准 Agilkia · 按住 C 缓冲' : count < 3 ? '追随阳光 · 平台上按 F 收集数据' : '进入 Abydos 阴影 · 按 F 回传', count, total: 3, complete: false, index: count, branches: 4,
    side: {title: hidden ? '鸭形岩石已找到' : '寻找彗星背面的鸭形岩石', done: hidden}});
  batteryLabel.textContent = `电池 ${battery.toFixed(0)}% · ${sunny ? '阳光充电' : '阴影耗电'}`; batteryBar.value = battery;
  flightLabel.textContent = `${elapsed.toFixed(0)} 秒 · 反弹 ${bounces} 次 · ${slime.cling ? '冰崖贴墙中' : slime.spread > .5 ? '摊开缓冲' : 'C 摊开 / 火属性空格喷气'}`;
  ui.hud(false);
}
// Capture jet input before the character can also turn it into a normal double jump.
addEventListener('keydown', e => {
  if (e.code === 'Enter' && state === 'intro') start();
  if (e.code === 'Escape' && (state === 'play' || state === 'transmit')) { e.stopImmediatePropagation(); pause(); return; }
  if (state !== 'play') return;
  if (e.code === 'KeyF' && !e.repeat) { e.preventDefault(); interact = true; }
  if (e.code === 'KeyT' && !slime.cling) { e.stopImmediatePropagation(); e.preventDefault(); ui.toast('重新挑战请在暂停菜单选择“重新开始”'); }
  if (e.code === 'Space' && slime.element === 2) {
    e.preventDefault(); e.stopImmediatePropagation();
    if (!e.repeat && jetCooldown <= 0 && battery >= spec.battery.jetCost) {
      battery -= spec.battery.jetCost; jet = .28; jetCooldown = .8; slime.cling = null; slime.grounded = false;
      slime.velocity[1] = Math.min(6.2, Math.max(0, slime.velocity[1]) + 3.4);
    }
  }
}, true);
ui.root.addEventListener('click', e => { if ((e.target as HTMLElement).closest('[data-act="pause"]')) pause(); }, true);
addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
const timer = new THREE.Clock();
/** Optional dt is for deterministic QA, never a teleport or completion shortcut. */
function step(forcedDt?: number) {
  const dt = Math.max(0, Math.min(typeof forcedDt === 'number' ? forcedDt : timer.getDelta(), .05));
  simulation += dt;
  if (state === 'play' && slime.mode !== 'play') pause();
  if (state === 'play') {
    elapsed += dt; jet = Math.max(0,jet-dt); jetCooldown = Math.max(0,jetCooldown-dt);
    // The shared character only spreads on ground. Prepare its existing public spread for airborne absorption here.
    if (!slime.grounded && slime.keys.has('KeyC')) slime.spread = Math.min(1, slime.spread + dt / .45 + dt / .7);
    if (!firstLanding) {
      const terminal = layout.spawn[1] / spec.descentSeconds;
      if (slime.position[1] > 2) slime.velocity[1] = Math.max(-terminal,slime.velocity[1]);
      else if (slime.velocity[1] < 0) slime.velocity[1] = Math.min(slime.velocity[1],-3.5);
      slime.position[0] = Math.max(-3,Math.min(3,slime.position[0])); slime.position[2] = Math.max(-3,Math.min(3,slime.position[2]));
    }
  }
  slime.update(simulation,dt);
  if (state === 'play') {
    if (impact >= 0) {
      const rebound = landingBounce(impact,slime.spread); impact = -1;
      if (!firstLanding) { firstLanding = true; reveal = 6; ui.banner('鱼叉没有发射！', rebound ? '低重力把你弹了起来 · 按住 C 吸收下一次冲击' : '你用摊开的身体吸收了冲击 · 无反弹挑战继续'); }
      if (rebound) { bounces++; slime.velocity[1] = rebound; slime.grounded = false; slime.position[1] += .06; }
    }
    battery = batteryAfter(spec,battery,inSunlight(spec,layout,slime.position,elapsed),dt);
    if (!battery) fail(); else objectives();
    reveal = Math.max(0,reveal-dt);
  } else if (state === 'transmit') {
    elapsed += dt; transmission += dt; battery = batteryAfter(spec,battery,false,dt);
    if (!battery) fail(); else if (transmission >= 8) complete();
  }
  const transmissionProgress = state === 'transmit' || state === 'done' || (state === 'pause' && pausedFrom === 'transmit') ? Math.min(1,transmission / 8) : -1;
  art.update(elapsed,slime.position,slime.spread,collected,jet>0,transmissionProgress);
  if (state === 'play' && (!firstLanding || reveal > 0)) {
    cameraPosition.set(slime.position[0]-16,Math.max(14,slime.position[1]+5),slime.position[2]+35); cameraTarget.set(20,Math.max(10,slime.position[1]*.4),-28);
    stage.camera.position.lerp(cameraPosition,1-Math.exp(-dt*3)); stage.camera.lookAt(cameraTarget);
  } else if (transmissionProgress >= 0) {
    cameraPosition.fromArray(shots.finale.position); cameraTarget.set(55,12,-3); stage.camera.position.lerp(cameraPosition,1-Math.exp(-dt*2)); stage.camera.lookAt(cameraTarget);
  }
  hud -= dt; if (hud <= 0 && (state === 'play' || state === 'transmit')) { hud = .12; updateHud(); }
  stage.render(dt,slime);
}
stage.renderer.setAnimationLoop(() => step());
(window as any).__slime = slime;
(window as any).__level = {spec, layout, check, step, stage, shots, stats: () => ({state, elapsed, battery, bounces, collected: [...collected], hidden, transmission, baked: {meshes: baked.meshes, triangles: baked.triangles}})};
export {};
