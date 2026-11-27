import * as T from 'three';
import {seasonExhibit} from './season-entry';
import {Stage} from './stage';
import {levels} from '../../content/levels/registry';
import type {SolsticeSpec} from '../../content/levels/types';
import {generateSolstice, validateSolstice, medalFor, modeHint} from '../templates/solstice';
import {biomeLooks, buildSolsticeWorld} from '../themes/solstice';
import {SlimeCharacter} from '../slime/character';
import {elements as slimeElements} from '../slime/elements';
import type {Box, Vec} from '../slime/types';
import {LevelUI} from '../ui/level-ui';
import {Save} from '../game/save';
import {applyLevelQuality} from '../game/graphics';
import {dayLabel} from '../game/calendar';

const id = new URLSearchParams(location.search).get('id') ?? '';
const spec = levels[id] as SolsticeSpec;
if (!spec || spec.template !== 'solstice') {
  document.body.innerHTML = `<p style="font:16px sans-serif;padding:40px">找不到十二月关卡 ${id}。<a href="./">回到港口</a></p>`;
  throw new Error('unknown solstice level ' + id);
}

const layout = generateSolstice(spec);
const check = validateSolstice(layout);
if (!check.ok) throw new Error(check.errors.join(' / '));

const [day, year] = id.split('-');
const stage = new Stage(biomeLooks[spec.biome]);
const worldArt = buildSolsticeWorld(stage, spec, layout);
const save = new Save();
const exhibit=seasonExhibit(id);

// Reserve dynamic collision box for the split-bridge rainbow planks (moved up into place when both pads hold)
const boxes: Box[] = layout.boxes.map(b => ({name: b.name, min: [...b.min] as Vec, max: [...b.max] as Vec}));
let bridgeBoxRef: Box | null = null;
if (layout.split) {
  const bRef: Box = {
    name: layout.split.bridgeBox.name,
    min: [layout.split.bridgeBox.min[0], -30, layout.split.bridgeBox.min[2]],
    max: [layout.split.bridgeBox.max[0], -29.5, layout.split.bridgeBox.max[2]],
  };
  bridgeBoxRef = bRef;
  boxes.push(bRef);
}

const worldDef = {
  boxes,
  surfaces: [],
  bounds: layout.bounds,
};

type Phase = 'intro' | 'play' | 'pause' | 'finale' | 'done';
let phase: Phase = 'intro';
let elapsed = 0;
let finaleT = -1;
let bridgeOpen = false;
let bridgeOpenK = 0;
let padAK = 0;
let padBK = 0;
let padCooldown = 0;
let boostTimer = 0;
let lastSafe: Vec = [...layout.spawn];
const doneNodes: boolean[] = [false, false, false];
const collectedStars: boolean[] = layout.stars.map(() => false);
const clonePins: {a: boolean; b: boolean} = {a: false, b: false};

const ui = new LevelUI(
  {
    start,
    resume,
    restart: () => location.reload(),
    home: () => (location.href = './?from=' + encodeURIComponent(id)),
  },
  `${dayLabel(day)} · ${year}`,
);

// Stylish translucent winter HUD accents
const style = document.createElement('style');
style.textContent = `
#game-ui .quest .branch b{white-space:nowrap;flex-shrink:0;margin-left:8px}
#game-ui .sol-pill{position:absolute;right:20px;top:72px;display:flex;gap:10px;align-items:center;font:600 13px/1.4 var(--sans);background:rgba(16,28,46,.78);color:#f7f1dd;padding:7px 13px;border-radius:999px;border:1px solid rgba(255,230,165,.35);backdrop-filter:blur(8px);pointer-events:none}
#game-ui .sol-pill b{color:#ffd166;font-weight:700}
#game-ui .sol-quick{position:absolute;bottom:86px;left:50%;transform:translateX(-50%);display:flex;gap:8px;pointer-events:auto;z-index:12}
#game-ui .sol-quick button{border:1px solid rgba(255,235,180,.55);background:rgba(18,34,54,.88);color:#fff6dc;padding:8px 15px;border-radius:999px;font:600 13px/1.3 var(--sans);cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.28);backdrop-filter:blur(6px)}
#game-ui .sol-quick button:hover{background:rgba(32,58,88,.95)}
#game-ui .sol-quick:empty{display:none}
`;
document.head.appendChild(style);

const hudEl = ui.root.querySelector('.hud')!;
const pill = document.createElement('div');
pill.className = 'sol-pill';
hudEl.appendChild(pill);
const quickBar = document.createElement('div');
quickBar.className = 'sol-quick';
hudEl.appendChild(quickBar);

const ctx = {THREE: T, renderer: stage.renderer, scene: stage.scene, camera: stage.camera, sun: stage.sun, controls: stage.controls};
const slime = new SlimeCharacter(ctx, {
  world: worldDef,
  spawn: layout.spawn,
  ui: false,
  trainingTargets: [],
  title: spec.title,
  onToast: () => {},
  onReady: () => {
    if (phase === 'intro') start();
  },
}).attach();
ui.bindCharacter(slime);
applyLevelQuality(stage, slime, save.data.quality);

// Opening postcard camera: framed from south terrace gazing directly across the glowing bridge to the hero monument & aurora
const introCamPos = new T.Vector3(0, layout.monumentPos[1] + 5.8, 24.5);
const introLook = new T.Vector3(0, layout.monumentPos[1] + 2.8, -2.5);
stage.camera.position.copy(introCamPos);
stage.camera.lookAt(introLook);

function showIntro() {
  const best = save.data.life.records[id + '-ms'];
  const steps = [
    modeHint(spec.mode),
    `依次点亮：${spec.stops.join(' → ')}`,
    `在中央圣台亲手触发「${spec.finale}」；集齐 8 颗流光星尘赢取「${spec.souvenir}」。`,
  ];
  if (best) steps.push(`最佳纪录 ${(best / 1000).toFixed(1)} 秒 · 金牌目标 ${spec.medals.gold} 秒`);
  ui.intro(spec.title, spec.fact, steps, slime.ready);
  exhibit.preview(ui.root.querySelector('.intro .row'));
}

function updateQuestHud() {
  const doneCount = doneNodes.filter(Boolean).length;
  const starCount = collectedStars.filter(Boolean).length;
  const nextIdx = doneNodes.findIndex(d => !d);
  let branch = '';
  if (nextIdx >= 0) {
    const n = layout.nodes[nextIdx];
    const el = slimeElements[n.element];
    if (n.kind === 'ring') {
      branch = `穿越「${n.label}」星环（按 C 滑行 · ${n.element + 1} ${el.name}）`;
    } else if (n.kind === 'split' && !bridgeOpen) {
      branch = `双板召唤光桥 → 点亮「${n.label}」（${n.element + 1} ${el.name}）`;
    } else {
      branch = `切至 ${n.element + 1} · ${el.name}属性，点亮「${n.label}」`;
    }
  } else {
    branch = `前往中央圣台，按 F 触发「${spec.finale}」`;
  }
  ui.quest({
    title: spec.title,
    branch,
    count: doneCount,
    total: 3,
    complete: doneCount === 3,
    index: doneCount,
    branches: 4,
    side: {title: `流光星尘 ${starCount} / ${layout.stars.length}（${spec.souvenir}）`, done: starCount === layout.stars.length},
  });
}

function start() {
  if (!slime.ready || phase !== 'intro') return;
  phase = 'play';
  ui.panel(null);
  slime.play();
  slime.yaw = layout.spawnYaw;
  ui.showHud(true);
  updateQuestHud();
  setTimeout(() => ui.banner(`${dayLabel(day)} · ${year}`, spec.title), 320);
}

function resume() {
  if (phase === 'done') {
    location.reload();
    return;
  }
  phase = 'play';
  ui.panel(null);
  slime.play();
  ui.showHud(true);
}

function activateNode(i: number) {
  if (doneNodes[i]) return;
  doneNodes[i] = true;
  const n = layout.nodes[i];
  lastSafe = [n.pos[0], n.pos[1] + 0.1, n.pos[2]];
  worldArt.triggerNodeBurst(i);
  slime.setMood('Happy', 1.1, 75);
  const count = doneNodes.filter(Boolean).length;
  ui.toast(`✦ 点亮「${n.label}」(${count} / 3)`, 2800);
  if (count === 3) {
    ui.banner('星能已满', `回到中央圣台，按 F 触发「${spec.finale}」`);
  }
  updateQuestHud();
}

function triggerFinale() {
  if (phase !== 'play' || !doneNodes.every(Boolean)) return;
  exhibit.finish(startFinale);
}
function startFinale(){
  phase = 'finale';
  finaleT = 0;
  slime.pause();
  slime.setMood('Happy', 5.0, 90);
  ui.showHud(false);
  ui.prompt(null);
  quickBar.replaceChildren();
  ui.banner(`${dayLabel(day)} · ${year}`, spec.finale);
}

function finishLevel() {
  phase = 'done';
  const ms = Math.round(elapsed * 1000);
  const medal = medalFor(spec, elapsed);
  const stars = collectedStars.filter(Boolean).length;
  const allStars = stars === layout.stars.length;
  const current=exhibit.enabled?new Save():save;
  const rec = current.data.life.records;
  rec[id + '-ms'] = Math.min(rec[id + '-ms'] || Infinity, ms);
  rec[id + '-stars'] = Math.max(rec[id + '-stars'] || 0, stars);
  if (allStars) current.add('souvenirs', id);
  current.add('completed', id);
  current.write();

  const summary = `${spec.outro}　用时 ${elapsed.toFixed(1)} 秒（${medal}） · 星尘 ${stars} / ${layout.stars.length}。`;
  ui.complete(spec.title, summary, spec.souvenir, current.data.souvenirs.includes(id));
  const replay = ui.root.querySelector<HTMLButtonElement>('.complete [data-act="resume"]');
  if (replay) replay.textContent = allStars ? '再玩一次 · 刷新金牌纪录' : '再玩一次 · 集齐全部星尘';
}

function screenPos(p: Vec, lift: number) {
  const v = new T.Vector3(p[0], p[1] + lift, p[2]).project(stage.camera);
  return v.z > 1 || v.z < -1 ? null : {x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight};
}

function handleContextAction() {
  if (phase !== 'play') return;
  const p = slime.position;
  // 1. Central altar finale trigger
  if (doneNodes.every(Boolean) && Math.hypot(p[0] - layout.altarPos[0], p[2] - layout.altarPos[2]) < 3.4) {
    triggerFinale();
    return;
  }
  // 2. Quick clone-pin on split pressure pads (also supports G + Left Click real launch!)
  if (layout.split && !bridgeOpen) {
    const dA = Math.hypot(p[0] - layout.split.a[0], p[2] - layout.split.a[2]);
    const dB = Math.hypot(p[0] - layout.split.b[0], p[2] - layout.split.b[2]);
    if (dA < 2.2 && !clonePins.a) {
      clonePins.a = true;
      slime.launch([layout.split.a[0], layout.split.a[1] + 0.3, layout.split.a[2]]);
      ui.toast('分身已留守左板，快去踩另一块踏板！', 2800);
      return;
    }
    if (dB < 2.2 && !clonePins.b) {
      clonePins.b = true;
      slime.launch([layout.split.b[0], layout.split.b[1] + 0.3, layout.split.b[2]]);
      ui.toast('分身已留守右板，快去踩另一块踏板！', 2800);
      return;
    }
  }
  // 3. Auto-match element if standing right beside an unlit node
  for (const n of layout.nodes) {
    if (!doneNodes[n.index] && Math.hypot(p[0] - n.pos[0], p[2] - n.pos[2]) < n.radius + 1.2) {
      slime.setElement(n.element);
      activateNode(n.index);
      return;
    }
  }
}

addEventListener('keydown', e => {
  if (e.code === 'Enter' && phase === 'intro') start();
  if (e.code === 'KeyF' && !e.repeat && phase === 'play') handleContextAction();
});

const clock = new T.Clock();
let time = 0;
let hudTick = 0;
let lastQuickKey = '';
const camTarget = new T.Vector3();
const camEye = new T.Vector3();

function step(rawDt: number) {
  const dt = Math.min(Math.max(rawDt, 0), 0.05);
  time += dt;

  if (phase === 'play') {
    elapsed += dt;
    padCooldown = Math.max(0, padCooldown - dt);
    boostTimer = Math.max(0, boostTimer - dt);

    // Extra glide speed when flattening (C) on glide-dash or boosted after speed rings
    if ((slime.spread > 0.35 && slime.grounded) || boostTimer > 0) {
      const mul = boostTimer > 0 ? 1.45 : spec.mode === 'glide-dash' ? 1.38 : 1.18;
      slime.velocity[0] *= Math.min(1.5, 1 + (mul - 1) * dt * 5);
      slime.velocity[2] *= Math.min(1.5, 1 + (mul - 1) * dt * 5);
    }

    slime.update(time, dt);
    if (slime.mode !== 'play') {
      phase = 'pause';
      ui.showHud(false);
      ui.panelPause();
    }

    const p = slime.position;
    // Gentle safety rescue if sliding off a floating island
    if (p[1] < -2.6) {
      slime.teleport([lastSafe[0], lastSafe[1] + 0.5, lastSafe[2]]);
      ui.toast('冬风把你温柔托回了浮岛', 2000);
    }

    // Wind jump pads
    if (padCooldown <= 0) {
      for (const pad of layout.pads) {
        if (Math.hypot(p[0] - pad.pos[0], p[2] - pad.pos[2]) < 1.35 && Math.abs(p[1] - pad.pos[1]) < 1.1) {
          const dx = pad.target[0] - pad.pos[0];
          const dz = pad.target[2] - pad.pos[2];
          const horiz = Math.hypot(dx, dz) || 1;
          const flight = 1.05;
          slime.velocity[0] = (dx / horiz) * Math.min(13, horiz / flight);
          slime.velocity[1] = pad.boostY;
          slime.velocity[2] = (dz / horiz) * Math.min(13, horiz / flight);
          slime.grounded = false;
          slime.jumps = 1;
          slime.setMood('Happy', 0.8, 65);
          padCooldown = 0.65;
          ui.toast('乘着冬风跃起！', 1200);
          break;
        }
      }
    }

    // Split-bridge twin pressure pads
    if (layout.split) {
      const shots = (slime.latest?.shots ?? []).filter(s => s.phase === 'active');
      const onPad = (pt: Vec, pinned: boolean) =>
        pinned ||
        (Math.hypot(p[0] - pt[0], p[2] - pt[2]) < 1.25 && Math.abs(p[1] - pt[1]) < 1.0) ||
        shots.some(s => Math.hypot(s.center[0] - pt[0], s.center[2] - pt[2]) < 1.25);
      const aHit = onPad(layout.split.a, clonePins.a);
      const bHit = onPad(layout.split.b, clonePins.b);
      padAK += ((aHit ? 1 : 0) - padAK) * Math.min(1, dt * 8);
      padBK += ((bHit ? 1 : 0) - padBK) * Math.min(1, dt * 8);
      if (!bridgeOpen && padAK > 0.72 && padBK > 0.72) {
        bridgeOpen = true;
        if (bridgeBoxRef) {
          bridgeBoxRef.min[1] = layout.split.bridgeBox.min[1];
          bridgeBoxRef.max[1] = layout.split.bridgeBox.max[1];
        }
        worldArt.triggerStarBurst(layout.split.bridgePos);
        ui.banner('双板共鸣', '彩虹光桥已展开！');
        updateQuestHud();
      }
      bridgeOpenK += ((bridgeOpen ? 1 : 0) - bridgeOpenK) * Math.min(1, dt * 2.8);
      worldArt.setSplitBridge(bridgeOpenK, padAK, padBK);
    }

    // Node resonance / speed ring triggers
    let promptSpec: {p: Vec; title: string; sub: string} | null = null;
    let quickHtml = '';
    for (const n of layout.nodes) {
      if (doneNodes[n.index]) continue;
      const dist = Math.hypot(p[0] - n.pos[0], p[2] - n.pos[2]);
      const dy = Math.abs(p[1] - n.pos[1]);
      if (dist < n.radius && dy < 2.2) {
        if (n.kind === 'ring') {
          boostTimer = 2.4;
          activateNode(n.index);
          if (slime.element === n.element) ui.toast(`✦ ${slimeElements[n.element].name}属性契合 · 极速流光加速！`, 2000);
        } else if (slime.element === n.element) {
          activateNode(n.index);
        } else {
          const el = slimeElements[n.element];
          promptSpec = {p: n.pos, title: `切至 ${el.name} 属性点亮「${n.label}」`, sub: `按 ${n.element + 1} 键或 F 键共振`};
          quickHtml = `<button data-quick="node">按 ${n.element + 1} / F · 切至${el.name}属性点亮</button>`;
        }
      }
    }

    // Split pad prompt
    if (!promptSpec && layout.split && !bridgeOpen) {
      const dA = Math.hypot(p[0] - layout.split.a[0], p[2] - layout.split.a[2]);
      const dB = Math.hypot(p[0] - layout.split.b[0], p[2] - layout.split.b[2]);
      if (dA < 2.0 && !clonePins.a) {
        promptSpec = {p: layout.split.a, title: '留下分身压住左板', sub: '按 F 留影，或按住 G + 左键发射分身'};
        quickHtml = `<button data-quick="pin">F · 留下分身压住左板</button>`;
      } else if (dB < 2.0 && !clonePins.b) {
        promptSpec = {p: layout.split.b, title: '留下分身压住右板', sub: '按 F 留影，或按住 G + 左键发射分身'};
        quickHtml = `<button data-quick="pin">F · 留下分身压住右板</button>`;
      }
    }

    // Central altar finale prompt
    if (!promptSpec && doneNodes.every(Boolean) && Math.hypot(p[0] - layout.altarPos[0], p[2] - layout.altarPos[2]) < 3.4) {
      promptSpec = {p: layout.altarPos, title: spec.finale, sub: '按 F 亲手触发历史高光时刻'};
      quickHtml = `<button data-quick="finale">F · 触发「${spec.finale}」</button>`;
    }

    if (promptSpec) {
      const at = screenPos(promptSpec.p, 1.9);
      ui.prompt(at ? {...at, title: promptSpec.title, sub: promptSpec.sub} : null);
    } else {
      ui.prompt(null);
    }

    if (quickHtml !== lastQuickKey) {
      lastQuickKey = quickHtml;
      quickBar.innerHTML = quickHtml;
      const btn = quickBar.querySelector('button');
      if (btn) btn.onclick = () => handleContextAction();
    }

    // Collect 8 floating stardust crystals
    layout.stars.forEach((s, idx) => {
      if (collectedStars[idx]) return;
      if (Math.hypot(p[0] - s.pos[0], p[2] - s.pos[2]) < 1.55 && Math.abs(p[1] - (s.pos[1] - 0.5)) < 1.8) {
        collectedStars[idx] = true;
        worldArt.triggerStarBurst(s.pos);
        slime.setMood('Happy', 0.65, 55);
        const total = collectedStars.filter(Boolean).length;
        if (total === layout.stars.length) {
          (exhibit.enabled?new Save():save).add('souvenirs', id);
          ui.toast(`✦ 集齐全部星尘！获得纪念品：${spec.souvenir}`, 3400);
        } else {
          ui.toast(`✦ 流光星尘 ${total} / ${layout.stars.length}`, 1500);
        }
        updateQuestHud();
      }
    });

    hudTick -= dt;
    if (hudTick <= 0) {
      hudTick = 0.14;
      ui.hud(slime.aiming);
      const stars = collectedStars.filter(Boolean).length;
      pill.innerHTML = `<span>用时 <b>${elapsed.toFixed(1)}s</b></span><span>星尘 <b>${stars}/${layout.stars.length}</b></span><span>金牌 ≤ ${spec.medals.gold}s</span>`;
    }
  } else if (phase === 'intro') {
    // Gentle panoramic orbit showcasing the entire winter wonderland before pressing Start
    slime.update(time, dt);
    const sway = Math.sin(time * 0.28) * 5.2;
    stage.camera.position.set(sway, layout.monumentPos[1] + 6.4 + Math.sin(time * 0.4) * 0.6, 24.0);
    stage.camera.lookAt(0, layout.monumentPos[1] + 2.8, -2.5);
  } else if (phase === 'finale') {
    finaleT += dt;
    slime.update(time, dt);
    // Grand sweeping cinematic orbit around the awakened hero monument
    const orbit = finaleT * 0.42;
    const rad = 16.5 + Math.min(7.5, finaleT * 1.4);
    camEye.set(
      layout.monumentPos[0] + Math.sin(orbit) * rad,
      layout.monumentPos[1] + 5.8 + Math.min(6.5, finaleT * 1.2),
      layout.monumentPos[2] + Math.cos(orbit) * rad,
    );
    camTarget.set(layout.monumentPos[0], layout.monumentPos[1] + 4.2, layout.monumentPos[2]);
    stage.camera.position.lerp(camEye, 1 - Math.exp(-dt * 3.2));
    stage.camera.lookAt(camTarget);
    if (finaleT >= 5.8) finishLevel();
  } else {
    slime.update(time, dt);
  }

  worldArt.update(time, dt, {
    slimePos: slime.position,
    doneNodes,
    collectedStars,
    allDone: doneNodes.every(Boolean),
    finaleT,
  });

  stage.render(dt, slime);
}

stage.renderer.setAnimationLoop(() => step(clock.getDelta()));
(window as any).__slime = slime;
(window as any).__level = {
  spec,
  layout,
  check,
  stage,
  step,
  start,
  activateNode,
  triggerFinale,
  get phase() {
    return phase;
  },
  get doneNodes() {
    return doneNodes;
  },
  get collectedStars() {
    return collectedStars;
  },
};
