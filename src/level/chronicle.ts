import './chronicle.css';
import * as T from 'three';
import {levels} from '../../content/levels/registry';
import type {ChronicleSpec} from '../../content/levels/types';
import {Stage} from './stage';
import {Save} from '../game/save';
import {applyLevelQuality} from '../game/graphics';
import {dayIdOf, dayLabel} from '../game/calendar';
import {SlimeCharacter} from '../slime/character';
import {LevelUI} from '../ui/level-ui';
import {
  CHRONICLE_MODE_NAMES,
  ELEMENT_LABELS,
  chronicleMedal,
  createChronicleState,
  generateChronicle,
  stepChronicle,
  validateChronicle,
} from '../templates/chronicle';
import {buildChronicleScene, chronicleLook} from '../themes/chronicle';

const id = new URLSearchParams(location.search).get('id') ?? '';
const raw = levels[id];
if (!raw || raw.template !== 'chronicle') {
  document.body.innerHTML = `<p style="font:16px sans-serif;padding:40px">找不到岁月拾光关卡 ${id}。<a href="./">回到凝露港</a></p>`;
  throw new Error('unknown chronicle level ' + id);
}
const spec = raw as ChronicleSpec;
const [day, year] = id.split('-');
const layout = generateChronicle(spec);
const check = validateChronicle(spec, layout);
if (!check.ok) console.warn('[chronicle] layout check:', check.errors);

const stage = new Stage(chronicleLook(spec));
const art = buildChronicleScene(stage, spec, layout);
const state = createChronicleState(layout);
const save = new Save();

type Phase = 'intro' | 'play' | 'pause' | 'finale' | 'done';
let phase: Phase = 'intro';
let time = 0;
let elapsed = 0;
let finaleT = -1;
let finishSec = 0;
let noteHideAt = 0;
let windCd = 0;
let lastShotAt = -1;
let audio: AudioContext | null = null;

document.title = `${spec.title} · 史莱姆寓言`;
const gateLabel = spec.slot === 1 ? '1 号门 · 中国历史' : '2 号门 · 海外历史';
const ui = new LevelUI(
  {start: () => start(), resume: () => resume(), restart: () => location.reload(), home: () => goHome()},
  `${dayLabel(day)} · ${year}　${gateLabel}`,
);
const ctx = {
  THREE: T,
  renderer: stage.renderer,
  scene: stage.scene,
  camera: stage.camera,
  sun: stage.sun,
  controls: stage.controls,
};
const slime = new SlimeCharacter(ctx, {
  world: layout.world,
  spawn: [...layout.spawn],
  ui: false,
  trainingTargets: [],
  title: spec.title,
  onToast: () => {},
  onReady: () => {
    if (phase === 'intro') showIntro();
  },
}).attach();
ui.bindCharacter(slime);
applyLevelQuality(stage, slime, save.data.quality);
slime.forward = [0, 0, -1];

// Floating story note ribbon & timer badge inside LevelUI HUD
const hudRoot = ui.root.querySelector('.hud') as HTMLElement;
const ribbon = document.createElement('div');
ribbon.className = 'chronicle-ribbon';
ribbon.innerHTML = '<small></small><span></span>';
document.body.appendChild(ribbon);

const clockEl = document.createElement('div');
clockEl.className = 'chronicle-clock';
clockEl.hidden = spec.tone === 'solemn';
hudRoot.appendChild(clockEl);

// Quick helper bar for relay clone shot / interact (also works seamlessly with keyboard)
const helper = document.createElement('div');
helper.className = 'chronicle-helper';
helper.hidden = true;
if (spec.mode === 'relay') {
  const bShoot = document.createElement('button');
  bShoot.textContent = 'G · 投射分身至铜盘';
  bShoot.onclick = () => { shootPad(); bShoot.blur(); };
  helper.appendChild(bShoot);
}
if (spec.mode === 'parkour') {
  const bSpread = document.createElement('button');
  bSpread.textContent = '按住 C 摊开钻过低门 · 空格跳跃';
  bSpread.onclick = () => bSpread.blur();
  helper.appendChild(bSpread);
}
if (spec.mode === 'glide') {
  const bGlide = document.createElement('button');
  bGlide.textContent = '二段跳按空格撑滑翔伞 · 也可走左侧步道';
  bGlide.onclick = () => bGlide.blur();
  helper.appendChild(bGlide);
}
if (spec.mode === 'relay' || spec.mode === 'gather') {
  const bAct = document.createElement('button');
  bAct.textContent = 'F · 互动 / 点亮';
  bAct.onclick = () => { handleInteract(); bAct.blur(); };
  helper.appendChild(bAct);
}
hudRoot.appendChild(helper);

function chime(freq: number, dur = 0.35, gainVal = 0.055) {
  if (!audio || audio.state !== 'running') return;
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = spec.tone === 'solemn' ? 'sine' : 'triangle';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0005, t);
  gain.gain.exponentialRampToValueAtTime(gainVal, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  osc.connect(gain).connect(audio.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function showNote(idx: number) {
  const text = spec.storyNotes[idx];
  if (!text) return;
  ribbon.hidden = false;
  (ribbon.querySelector('small') as HTMLElement).textContent = `史事微笺 ${idx + 1} / 3 · ${year} 年`;
  (ribbon.querySelector('span') as HTMLElement).textContent = text;
  ribbon.classList.add('show');
  noteHideAt = time + 6.5;
}

function modeSteps(): string[] {
  if (spec.mode === 'parkour') {
    return [
      `沿主题长廊轻快前行，空格越过矮栏、按 C 摊开钻过低门`,
      `收集沿途 ${layout.pickups.length} 枚「${spec.relicName}」解锁三段史事微笺`,
      `抵达终点高台：${spec.finaleLabel}`,
    ];
  }
  if (spec.mode === 'gather') {
    return [
      `在立体庭院中寻访 ${layout.pickups.length} 枚「${spec.relicName}」`,
      `每收集信物自动浮现当天史事微笺`,
      `收齐后登上中央主台按 F：${spec.finaleLabel}`,
    ];
  }
  if (spec.mode === 'relay') {
    const e1 = ELEMENT_LABELS[spec.element];
    const e2 = ELEMENT_LABELS[(spec.element + 1) % 6];
    return [
      `按 G 投射分身压住对岸铜盘，升起过河木桥`,
      `过桥后依次切 ${e1} / ${e2} 属性（数字键 1–6）按 F 点亮两座共鸣柱`,
      `登上终点主台按 F：${spec.finaleLabel}`,
    ];
  }
  return [
    `从观景高台起跳，二段跳再按空格撑开滑翔伞掠过全景（左侧有保底步道）`,
    `穿过风环收集 ${layout.pickups.length} 枚「${spec.relicName}」，边飞边读三段史事微笺`,
    `降落终点高台：${spec.finaleLabel}`,
  ];
}

function showIntro() {
  const steps = modeSteps();
  const rec = save.data.life.records;
  const best = rec[id + '-ms'];
  if (best) {
    const med = ['', '铜牌', '银牌', '金牌'][rec[id + '-medal'] ?? 0] ?? '';
    steps.push(`个人最佳 ${(best / 1000).toFixed(1)} 秒${med ? ' · ' + med : ''} · 信物 ${rec[id + '-relics'] ?? 0}/${layout.pickups.length}`);
  }
  ui.intro(spec.title, `${spec.intro}（${CHRONICLE_MODE_NAMES[spec.mode]}）`, steps, slime.ready);
  const row = ui.root.querySelector('.intro .row');
  if (row && !row.querySelector('.chronicle-source-link')) {
    const a = document.createElement('a');
    a.className = 'chronicle-source-link';
    a.href = spec.source;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = '查阅权威史料 ↗';
    row.appendChild(a);
  }
}

function currentGoalText(): string {
  const got = state.collected.filter(Boolean).length;
  const total = layout.pickups.length;
  if (spec.mode === 'relay') {
    if (!state.bridgeOpen) return '按 G 投射分身压住对岸铜盘升起木桥';
    const done = state.devicesDone.filter(Boolean).length;
    if (done < 2) {
      const nextDev = layout.devices.find((_, i) => !state.devicesDone[i])!;
      return `切 ${ELEMENT_LABELS[nextDev.element]} 属性（键 ${nextDev.element + 1}）靠近共鸣柱按 F（${done}/2）`;
    }
    return `登上终点主台按 F · ${spec.finaleLabel}`;
  }
  if (spec.mode === 'gather' && !state.readyForFinale) {
    return `寻访「${spec.relicName}」（${got} / ${total}）`;
  }
  if (state.readyForFinale) {
    return spec.mode === 'gather' ? `前往主台按 F · ${spec.finaleLabel}` : `抵达主台 · ${spec.finaleLabel}`;
  }
  return `收集「${spec.relicName}」`;
}

function refreshQuest() {
  const got = state.collected.filter(Boolean).length;
  const total = layout.pickups.length;
  ui.quest({
    title: spec.title,
    branch: currentGoalText(),
    count: got,
    total,
    complete: false,
    index: state.notesUnlocked + (phase === 'finale' || phase === 'done' ? 1 : 0),
    branches: 4,
    side: {title: `${spec.relicName} ${got} / ${total}`, done: got >= total},
  } as any);
}

function shootPad() {
  if (phase !== 'play' || spec.mode !== 'relay' || !layout.pads.length || time - lastShotAt < 0.4) return;
  lastShotAt = time;
  slime.launch([...layout.pads[0]]);
  slime.setMood('Spit', 0.35);
}

function start() {
  if (!slime.ready || phase !== 'intro') return;
  try {
    audio ??= new AudioContext();
    void audio.resume().catch(() => {});
  } catch {}
  save.add('visited', id);
  ui.panel(null);
  slime.play();
  slime.yaw = layout.spawnYaw;
  phase = 'play';
  ui.showHud(true);
  helper.hidden = false;
  refreshQuest();
  ui.banner(`${dayLabel(day)} · ${year}`, spec.title);
}

function resume() {
  if (phase === 'done') { location.reload(); return; }
  ui.panel(null);
  slime.play();
  phase = 'play';
  ui.showHud(true);
  helper.hidden = false;
  refreshQuest();
}

function goHome() {
  save.data.selectedDay = dayIdOf(new Date()) === day ? null : day;
  save.write();
  location.assign('./?from=' + encodeURIComponent(id) + '&date=' + day);
}

function beginFinale() {
  if (phase === 'finale' || phase === 'done') return;
  phase = 'finale';
  finaleT = 0;
  finishSec = elapsed;
  state.triggeredFinale = true;
  state.notesUnlocked = 3;
  slime.pause();
  ui.showHud(false);
  helper.hidden = true;
  ribbon.classList.remove('show');
  ribbon.hidden = true;
  ui.prompt(null);
  slime.setMood('Happy', 2.4, 80);
  if (spec.tone === 'solemn') {
    chime(196, 2.2, 0.05);
    setTimeout(() => chime(293.66, 1.8, 0.04), 320);
  } else {
    chime(392, 0.45);
    setTimeout(() => chime(523.25, 0.55), 160);
    setTimeout(() => chime(659.25, 0.9), 340);
  }
  ui.banner(`${dayLabel(day)} · ${year}`, spec.finaleLabel);
}

function completeLevel() {
  phase = 'done';
  const got = state.collected.filter(Boolean).length;
  const total = layout.pickups.length;
  const medal = chronicleMedal(spec, finishSec);
  const ms = Math.max(1, Math.round(finishSec * 1000));
  const rec = save.data.life.records;
  rec[id + '-ms'] = Math.min(rec[id + '-ms'] || Infinity, ms);
  rec[id + '-medal'] = Math.max(rec[id + '-medal'] || 0, medal);
  rec[id + '-relics'] = Math.max(rec[id + '-relics'] || 0, got);
  if (got >= total) rec[id + '-full'] = 1;
  save.add('completed', id);
  save.add('souvenirs', id);
  save.write();

  const medalStr = spec.tone === 'solemn' ? '静谧巡礼完成' : ['', '铜牌', '银牌', '金牌'][medal];
  const summary = `${spec.outro}　用时 ${finishSec.toFixed(1)} 秒 · ${medalStr} · ${spec.relicName} ${got} / ${total}。`;
  ui.complete(spec.title, summary, spec.souvenir, true);
  const stack = ui.root.querySelector('.complete .stack');
  if (stack) {
    const replay = document.createElement('button');
    replay.className = 'btn';
    replay.textContent = '再游一遍';
    replay.onclick = () => location.reload();
    stack.appendChild(replay);
    const link = document.createElement('a');
    link.className = 'chronicle-source-link';
    link.style.marginTop = '6px';
    link.href = spec.source;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = '查看权威历史出处 ↗';
    stack.appendChild(link);
  }
}

function handleInteract() {
  if (phase !== 'play') return;
  const res = stepChronicle(
    spec,
    layout,
    state,
    {
      position: slime.position,
      element: slime.element,
      spread: slime.spread,
      shots: slime.latest?.shots ?? [],
    },
    true,
  );
  if (res.wrongElement !== null) {
    ui.toast(`请先按数字键 ${res.wrongElement + 1} 切换为「${ELEMENT_LABELS[res.wrongElement]}」属性`, 2400);
    slime.setMood('Hurt', 0.4, 40);
  } else if (res.activatedDevice >= 0) {
    chime(523.25 + res.activatedDevice * 110, 0.45);
    slime.setMood('Happy', 0.8, 60);
    ui.toast(`${layout.devices[res.activatedDevice].label} 已点亮！`, 2200);
    if (res.newNoteIdx >= 0) showNote(res.newNoteIdx);
    refreshQuest();
  } else if (res.finaleTriggered) {
    beginFinale();
  } else {
    ui.toast(currentGoalText(), 2000);
  }
}

addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'Enter' && phase === 'intro') { start(); return; }
  if (phase !== 'play' || e.repeat) return;
  if (e.code === 'KeyF') handleInteract();
  if (e.code === 'KeyG' && spec.mode === 'relay') shootPad();
});

const project = (x: number, y: number, z: number) => {
  const v = new T.Vector3(x, y, z).project(stage.camera);
  return v.z > 1 ? null : {x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight};
};

// Opening postcard camera frames the landmark right from frame 1
const eye = new T.Vector3();
const look = new T.Vector3();
const aim = new T.Vector3();
stage.camera.position.set(layout.spawn[0] + 6.5, layout.spawn[1] + 5.8, layout.spawn[2] + 9.5);
look.set(layout.landmarkPos[0], layout.landmarkPos[1] + 2.4, (layout.spawn[2] + layout.landmarkPos[2]) * 0.45);
stage.camera.lookAt(look);

let hudTimer = 0;
function step(rawDelta: number) {
  const dt = Math.min(Math.max(rawDelta, 0), 0.05);
  time += dt;
  slime.update(time, dt);

  if (phase === 'play' && slime.mode !== 'play') {
    phase = 'pause';
    ui.showHud(false);
    helper.hidden = true;
    ribbon.classList.remove('show');
    ui.panelPause();
  }

  if (phase === 'play') {
    elapsed += dt;
    windCd = Math.max(0, windCd - dt);

    // Updraft wind rings boost glide playfully
    if (spec.mode === 'glide' && windCd <= 0) {
      const p = slime.position;
      for (const w of layout.windRings) {
        if (Math.hypot(p[0] - w.pos[0], p[2] - w.pos[2]) <= w.radius && Math.abs(p[1] - w.pos[1]) <= 2.2) {
          slime.velocity[1] = Math.max(slime.velocity[1], w.lift);
          windCd = 0.65;
          chime(587.33, 0.25, 0.04);
          break;
        }
      }
    }

    // Soft fall rescue (zero punishment, keeps lightweight flow smooth)
    const p = slime.position;
    if (p[1] < -2.4 || p[0] < layout.bounds.min[0] - 1 || p[0] > layout.bounds.max[0] + 1 || p[2] < layout.bounds.min[2] - 1 || p[2] > layout.bounds.max[2] + 1) {
      slime.teleport([...layout.spawn]);
      slime.velocity = [0, 0, 0];
    }

    const res = stepChronicle(
      spec,
      layout,
      state,
      {
        position: slime.position,
        element: slime.element,
        spread: slime.spread,
        shots: slime.latest?.shots ?? [],
      },
      false,
    );

    if (res.bridgeChanged && layout.bridgeIndex >= 0) {
      const box = layout.boxes[layout.bridgeIndex];
      box.min[1] = state.bridgeOpen ? -0.16 : -3.6;
      box.max[1] = state.bridgeOpen ? 0.06 : -3.4;
      slime.syncBox(layout.bridgeIndex);
      if (state.bridgeOpen) {
        chime(440, 0.4);
        ui.toast('木桥升起了！快过岸点亮共鸣柱', 2400);
      }
      refreshQuest();
    }
    if (res.pickedIds.length) {
      chime(440 + state.collected.filter(Boolean).length * 42, 0.26, 0.045);
      slime.setMood('Happy', 0.55, 45);
      const got = state.collected.filter(Boolean).length;
      if (got === layout.pickups.length) ui.toast(`${spec.relicName}已全部收齐！`, 2400);
      refreshQuest();
    }
    if (res.newNoteIdx >= 0) {
      showNote(res.newNoteIdx);
      refreshQuest();
    }
    if (res.finaleTriggered) {
      beginFinale();
    }

    if (time > noteHideAt) ribbon.classList.remove('show');

    // Contextual F prompt near devices or finish plinth
    let prompt: {x: number; y: number; title: string; sub: string} | null = null;
    if (spec.mode === 'relay') {
      for (let i = 0; i < layout.devices.length; i++) {
        if (state.devicesDone[i]) continue;
        const dev = layout.devices[i];
        if (Math.hypot(p[0] - dev.pos[0], p[2] - dev.pos[2]) < 2.2) {
          const at = project(dev.pos[0], dev.pos[1] + 2.4, dev.pos[2]);
          if (at) {
            prompt = {
              ...at,
              title: dev.label,
              sub: slime.element === dev.element ? '按 F 点亮' : `按数字键 ${dev.element + 1} 切换${ELEMENT_LABELS[dev.element]}属性`,
            };
          }
          break;
        }
      }
    }
    if (!prompt && state.readyForFinale && Math.hypot(p[0] - layout.finish.pos[0], p[2] - layout.finish.pos[2]) <= layout.finish.radius + 0.8) {
      const at = project(layout.finish.pos[0], layout.finish.pos[1] + 1.9, layout.finish.pos[2]);
      if (at) prompt = {...at, title: spec.finaleLabel, sub: '按 F 触发终场高光'};
    }
    ui.prompt(prompt);

    if (!clockEl.hidden) {
      const s = Math.floor(elapsed);
      if (clockEl.dataset.s !== String(s)) {
        clockEl.dataset.s = String(s);
        clockEl.textContent = `${s} 秒 · 金牌 ${spec.medals.gold} 秒`;
      }
    }
    hudTimer -= dt;
    if (hudTimer <= 0) {
      hudTimer = 0.14;
      ui.hud(slime.aiming);
    }
  } else if (phase === 'intro') {
    eye.set(layout.spawn[0] + 6.5 + Math.sin(time * 0.25) * 1.4, layout.spawn[1] + 5.6, layout.spawn[2] + 9.2);
    aim.set(layout.landmarkPos[0], layout.landmarkPos[1] + 2.4, (layout.spawn[2] + layout.landmarkPos[2]) * 0.45);
    stage.camera.position.lerp(eye, 0.05);
    look.lerp(aim, 0.05);
    stage.camera.lookAt(look);
  } else if (phase === 'finale' || phase === 'done') {
    finaleT += dt;
    if (phase === 'finale' && finaleT >= 4.2) completeLevel();
    const f = Math.min(finaleT, 8);
    const angle = 0.45 - f * 0.09;
    const dist = Math.max(13.5, art.landmark.height * 1.65);
    eye.set(
      art.landmark.focus.x + Math.sin(angle) * dist,
      art.landmark.focus.y + 2.4 + f * 0.25,
      art.landmark.focus.z + Math.cos(angle) * dist,
    );
    const k = 1 - Math.exp(-dt * 2.2);
    stage.camera.position.lerp(eye, k);
    look.lerp(art.landmark.focus, k);
    stage.camera.lookAt(look);
  }

  art.update(time, dt, state, phase === 'finale' || phase === 'done' ? finaleT : -1);
  stage.render(dt, slime);
}

const clock = new T.Clock();
stage.renderer.setAnimationLoop(() => step(clock.getDelta()));
showIntro();

(window as any).__slime = slime;
(window as any).__level = {
  spec,
  layout,
  state,
  stage,
  step,
  get phase() { return phase; },
  triggerFinale: () => {
    state.readyForFinale = true;
    beginFinale();
  },
};
