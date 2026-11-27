import './defense.css';
import {
  DefenseGame, DEFENSE_CARDS, ELEMENT_KINDS, ENEMY_NAMES, SUPPORT_INFO, TILE_LABELS, WAVES,
  type DefenseTower, type ElementKind, type ReactionTag, type TowerKind,
} from '../templates/defense';
import {createDefenseScene, defenseCellWorld} from '../themes/defense';
import {CombatAudio} from './combat-audio';
import {FloatingTextPool, JuiceController} from './combat-juice';
import {session} from './mode-session';
import {Save} from '../game/save';
import {applyLevelQuality} from '../game/graphics';

const {spec} = session;
const game = new DefenseGame(session.seed, {enhanced: true});
const audio = new CombatAudio();
const juice = new JuiceController();
const floats = new FloatingTextPool(36);
const scene = createDefenseScene(onCell, {
  tiles: game.tiles,
  onHover,
  onCollectDrop: id => {
    const got = game.collectDrop(id);
    if (got > 0) {
      audio.playDewPickup();
      notice('✨ 拾取凝露结晶 +' + got + ' 露');
      refreshTools();
    }
  },
});
applyLevelQuality(scene.stage, scene.actor, new Save().data.quality);

const hud = document.createElement('main');
hud.id = 'defense-desk';
document.body.append(hud);

const symbols: Record<TowerKind, string> = {water: '◉', wind: '彡', fire: '♨', thunder: 'ϟ', dark: '◐', physical: '◇', dew: '✧'};
const reactionLabels: Record<ReactionTag, [string, string]> = {
  vaporize: ['🔥💧 蒸发!', '#ffaa63'],
  chain: ['⚡💧 感电链!', '#b9a6ff'],
  swirl: ['🍃 扩散!', '#95f5ce'],
  overload: ['🔥⚡ 超载!', '#ff6e9c'],
  corrode: ['🌑 侵蚀易伤!', '#d89bff'],
  shatter: ['🪨 破甲重击!', '#ffe082'],
  push: ['💨 击退', '#aef5d2'],
  focus: ['👁 聚焦', '#e0b8ff'],
};
function portrait(kind: TowerKind) {
  return '<span class="tower-portrait ' + kind + '" aria-hidden="true"><i></i><em>' + symbols[kind] + '</em></span>';
}

const loadout = new Set<ElementKind>(['water', 'thunder', 'fire', 'physical']);
type Tool = TowerKind | 'tape' | 'remove' | 'support';
let tool: Tool = 'water';
let supportEl: ElementKind = 'fire';
let speed = 1;
let paused = false, finished = false, clock = 0, wonAt = 0, lastPanel = '', lastUi = '', messageUntil = 0;
let cursor: {lane: number; col: number} = {lane: 2, col: 2};
let inspectTower: {lane: number; col: number} | null = null;
let hoverTile: {lane: number; col: number} | null = null;
let seenFxId = 0, seenWave = 0;
const rowLabels = ['一', '二', '三', '四', '五'];

hud.innerHTML = `
<header class="df-header">
  <div class="df-mast"><span class="df-stamp" aria-hidden="true">⌁</span><div><small>1974.11.16　/　阿雷西博</small><h1>守住发往星团的信</h1></div></div>
  <div class="df-meters" hidden>
    <span>凝露<strong data-dew></strong></span>
    <span>家园<strong data-hp></strong></span>
    <span>波次<strong data-wave></strong></span>
  </div>
  <div class="df-ctrl" hidden>
    <button class="df-quiet" data-early hidden>⚡ 提前迎敌</button>
    <button class="df-quiet" data-speed title="切换 1× / 2× 战斗速度">1×</button>
    <button class="df-quiet" data-mute title="开关音效">${audio.muted ? '🔇' : '🔊'}</button>
    <button class="df-quiet" data-pause>暂停</button>
  </div>
</header>
<div class="df-boss-bar" hidden>
  <div class="df-boss-meta"><b>👾 失谐母体 · 信号风暴首领</b><span data-boss-hp></span></div>
  <div class="df-boss-track"><i data-boss-fill></i><em data-boss-shield></em></div>
</div>
<div class="df-lanes" aria-hidden="true">${rowLabels.map((_, i) => '<span>' + (i + 1) + '</span>').join('')}</div>
<section class="df-panel" aria-label="值班台"></section>
<aside class="df-inspector" hidden aria-label="塔位详情"></aside>
<div class="df-tile-tip" hidden></div>
<div class="df-radio" role="status" hidden></div>
<div class="df-console" hidden>
  <div class="df-status"><span data-incoming></span><span data-bits></span></div>
  <div class="df-wave-bar"><i data-wave-prog></i></div>
  <div class="df-tools" role="group" aria-label="部署工具"></div>
</div>`;

function at<E extends HTMLElement = HTMLElement>(sel: string) { return hud.querySelector<E>(sel)!; }
const panel = at('.df-panel'), consoleBar = at('.df-console'), meters = at('.df-meters'), ctrlBar = at('.df-ctrl');
const bossBar = at('.df-boss-bar'), inspector = at('.df-inspector'), tileTip = at('.df-tile-tip');
const earlyBtn = at<HTMLButtonElement>('[data-early]'), speedBtn = at<HTMLButtonElement>('[data-speed]'), muteBtn = at<HTMLButtonElement>('[data-mute]');
const radio = at('.df-radio'), laneTags = Array.from(hud.querySelectorAll<HTMLElement>('.df-lanes span'));
const canvas = scene.stage.renderer.domElement as HTMLCanvasElement;
canvas.tabIndex = 0;
canvas.setAttribute('aria-label', '五路八列防线。方向键选格，回车部署。');

function notice(s: string) { radio.textContent = s; messageUntil = performance.now() + 2600; radio.hidden = false; }

function lineup() {
  const choices = ELEMENT_KINDS.map(k =>
    `<button type="button" data-pick="${k}" aria-pressed="${loadout.has(k)}">${portrait(k)}<span><b>${DEFENSE_CARDS[k].name}</b><small>${DEFENSE_CARDS[k].role}</small></span></button>`
  ).join('');
  panel.innerHTML = `<div class="df-brief"><div class="df-paper-label">发信站 · 进阶值班任务</div><h2>编一支守台小队</h2><p>1,679 个二进制位即将从阿雷西博发往 M13。巧用<strong>战术地形格</strong>、<strong>Lv.3 觉醒升级</strong>、<strong>六元素反应</strong>与<strong>主角支援炮</strong>，击退包含谐振盾体与终局母体的 8 波干扰！</p><div class="df-choice-title"><b>选 4 种元素塔</b><span data-count></span></div><div class="df-lineup">${choices}</div><p class="df-dew-note">${portrait('dew')}<span>自带产露塔图纸（Lv.3 附带十字攻速光环）。点击已建塔可升级、修理或拆解返露 60%。</span></p><div class="df-actions"><button class="df-primary" data-start>开始值班　→</button><button data-home>回港</button></div></div>`;
  syncPicks();
}
function syncPicks() {
  at('[data-count]').textContent = loadout.size + ' / 4';
  for (const b of Array.from(panel.querySelectorAll<HTMLButtonElement>('[data-pick]'))) {
    b.setAttribute('aria-pressed', String(loadout.has(b.dataset.pick as ElementKind)));
  }
  at<HTMLButtonElement>('[data-start]').disabled = loadout.size !== 4 || !scene.actor.ready;
}

function toolsBar() {
  supportEl = game.loadout[0] ?? 'water';
  at('.df-tools').innerHTML = ([...game.loadout, 'dew'] as TowerKind[]).map(k =>
    `<button data-tool="${k}" title="${DEFENSE_CARDS[k].role}｜Lv.3：${DEFENSE_CARDS[k].lv3}">${portrait(k)}<span>${DEFENSE_CARDS[k].name}</span><small>${DEFENSE_CARDS[k].cost} 露</small></button>`
  ).join('') +
    `<button data-tool="support" class="df-support-btn" title="共鸣满 100% 时由主角发射 3×3 元素支援炮（点按钮可切换元素）"><i aria-hidden="true">☄</i><span data-sup-name>支援炮</span><small data-sup-pct>0%</small></button>` +
    `<button data-tool="tape" title="清除整行干扰并让同路攻击塔立刻齐射"><i aria-hidden="true">▦</i><span>校准纸带</span><small></small></button>` +
    `<button data-tool="remove" title="拆解塔位并返还 60% 总投入凝露"><i aria-hidden="true">♻</i><span>拆解返露</span><small>返 60%</small></button>`;
  refreshTools();
}

function syncPreview() {
  if (tool === 'support') scene.setPreview('support', supportEl);
  else if (tool === 'tape') scene.setPreview('tape');
  else if (tool === 'remove') scene.setPreview('remove');
  else scene.setPreview('plant', tool);
}

function refreshTools() {
  for (const b of Array.from(hud.querySelectorAll<HTMLButtonElement>('[data-tool]'))) {
    const k = b.dataset.tool as Tool;
    b.setAttribute('aria-pressed', String(tool === k));
    if (k === 'support') {
      const ready = game.resonance >= 100;
      b.classList.toggle('df-ready', ready);
      b.classList.toggle('df-short', !ready);
      b.querySelector('[data-sup-name]')!.textContent = SUPPORT_INFO[supportEl].name.slice(0, 4);
      b.querySelector('[data-sup-pct]')!.textContent = ready ? '就绪! 点格' : Math.floor(game.resonance) + '%';
    } else if (k === 'tape') {
      b.querySelector('small')!.textContent = '剩 ' + game.tapes + ' 张';
      b.disabled = game.tapes === 0;
    } else if (k !== 'remove') {
      b.classList.toggle('df-short', DEFENSE_CARDS[k].cost > game.dew);
    }
  }
  syncPreview();
}

function closeInspector() {
  inspectTower = null;
  inspector.hidden = true;
  scene.select(-1, -1);
}

function renderInspector(t: DefenseTower) {
  const card = DEFENSE_CARDS[t.kind];
  const upCost = game.upgradeCost(t);
  const repCost = game.repairCost(t);
  const refund = game.salvageValue(t);
  const pos = scene.cellScreen(t.lane, t.col);
  inspector.hidden = false;
  inspector.style.left = Math.max(132, Math.min(innerWidth - 132, pos.x)) + 'px';
  inspector.style.top = Math.max(110, Math.min(innerHeight - 190, pos.y - 34)) + 'px';
  inspector.innerHTML = `
    <div class="df-insp-head">
      ${portrait(t.kind)}
      <div><b>${card.name} · Lv.${t.level}</b><small>耐久 ${Math.ceil(t.hp)}/${t.maxHp} · 累计伤害 ${t.totalDamage}</small></div>
      <button type="button" class="df-insp-x" data-insp-close aria-label="关闭">×</button>
    </div>
    <p class="df-insp-tip">${t.level < 3 ? 'Lv.3 觉醒：' + card.lv3 : '★ 已达满级觉醒状态'}</p>
    <div class="df-insp-acts">
      ${t.level < 3 ? `<button type="button" data-insp-up ${game.dew < upCost ? 'disabled' : ''}>⬆ 升至 Lv.${t.level + 1}（${upCost} 露）</button>` : '<span class="df-max-tag">★ MAX</span>'}
      ${repCost > 0 ? `<button type="button" data-insp-rep ${game.dew < repCost ? 'disabled' : ''}>🔧 修理（${repCost} 露）</button>` : ''}
      <button type="button" class="df-insp-sell" data-insp-sell>♻ 拆解 +${refund} 露</button>
    </div>`;
}

function onHover(lane: number, col: number) {
  if (lane < 0 || col < 0 || !['wave', 'interval'].includes(game.phase)) {
    hoverTile = null;
    tileTip.hidden = true;
    return;
  }
  hoverTile = {lane, col};
  const mod = game.tileAt(lane, col);
  const tower = game.towers.find(t => t.lane === lane && t.col === col);
  if (!mod && !tower) {
    tileTip.hidden = true;
    return;
  }
  const parts: string[] = [];
  if (mod) parts.push(`${TILE_LABELS[mod.kind].name}：${TILE_LABELS[mod.kind].desc}`);
  if (tower) parts.push(`${DEFENSE_CARDS[tower.kind].name} Lv.${tower.level}（点选可升级/修理/拆解）`);
  tileTip.textContent = parts.join(' ｜ ');
  tileTip.hidden = false;
}

function onCell(lane: number, col: number) {
  if (paused || !['wave', 'interval'].includes(game.phase)) return;
  cursor = {lane, col};
  const tower = game.towers.find(t => t.lane === lane && t.col === col);

  if (tool === 'support') {
    if (game.castSupport(lane, col, supportEl)) {
      const idx = ELEMENT_KINDS.indexOf(supportEl);
      scene.actor.setElement(Math.max(0, idx), true);
      scene.actor.setMood('Happy', 0.9, 85);
      audio.playSupportCast(Math.max(0, idx));
      juice.addShake(0.42);
      notice(`☄ 主角释放「${SUPPORT_INFO[supportEl].name}」！`);
      tool = game.loadout[0];
      closeInspector();
    } else {
      notice('共鸣能量尚未充满（当前 ' + Math.floor(game.resonance) + '%）');
    }
    refreshTools();
    return;
  }

  if (tool === 'tape') {
    if (game.useTape(lane)) {
      audio.playTapeSweep();
      juice.addShake(0.28);
      notice('第' + rowLabels[lane] + '路已校准，塔群齐射！');
    }
    if (game.tapes === 0) tool = game.loadout[0];
    closeInspector();
    refreshTools();
    return;
  }

  if (tool === 'remove') {
    const refund = game.salvage(lane, col);
    if (refund > 0) {
      audio.playSalvage();
      floats.spawn(defenseCellWorld(lane, col + .5, .75), `+${refund} 露`, 'dew');
      notice(`已拆解塔位，返还 ${refund} 点凝露`);
    } else {
      notice('这里没有可拆解的塔');
    }
    closeInspector();
    refreshTools();
    return;
  }

  // Clicking an existing tower opens its upgrade/repair/salvage floating inspector!
  if (tower) {
    inspectTower = {lane, col};
    scene.select(lane, col);
    renderInspector(tower);
    return;
  }

  closeInspector();
  scene.select(lane, col);
  const cost = game.plantCost(lane, col, tool);
  if (game.plant(lane, col, tool)) {
    audio.playPlant(tool);
    if (cost < DEFENSE_CARDS[tool].cost) notice('泉眼减费！仅消耗 ' + cost + ' 露');
  } else {
    notice(game.dew < cost ? '凝露不足，还差 ' + (cost - game.dew) + ' 点' : '干扰体正在经过这个格位');
  }
  refreshTools();
}

function setTool(kind: Tool) {
  if (kind === 'support') {
    if (tool === 'support') {
      const idx = (game.loadout.indexOf(supportEl) + 1) % game.loadout.length;
      supportEl = game.loadout[idx];
    }
    tool = 'support';
    closeInspector();
    refreshTools();
    notice(`${SUPPORT_INFO[supportEl].name}：${SUPPORT_INFO[supportEl].desc}（再点按钮切换元素）`);
    return;
  }
  tool = kind;
  closeInspector();
  refreshTools();
  notice(
    kind === 'tape' ? '选择一路，清除干扰并立刻齐射' :
    kind === 'remove' ? '点选要拆解的塔，返还 60% 凝露' :
    DEFENSE_CARDS[kind].role + ' · 点空格部署，点已建塔升级'
  );
}

function pause(value: boolean) {
  paused = value;
  lastPanel = '';
  if (value) {
    closeInspector();
    audio.pause();
  } else {
    audio.resume();
  }
  drawPanel();
}

function drawPanel() {
  const state = paused ? 'pause' : game.phase;
  const play = state === 'wave' || state === 'interval';
  const token = play ? 'battle' : state;
  if (lastPanel === token) return;
  lastPanel = token;
  panel.dataset.state = state;
  hud.dataset.state = token;
  panel.hidden = play || state === 'won';
  ctrlBar.hidden = !play;
  consoleBar.hidden = !play;
  meters.hidden = !play;
  at('.df-lanes').hidden = !play;
  if (!play) { bossBar.hidden = true; closeInspector(); tileTip.hidden = true; }
  if (state === 'setup') { lineup(); return; }
  if (play) return;
  radio.hidden = true;
  if (state === 'pause') {
    panel.innerHTML = '<div class="df-brief"><div class="df-paper-label">发信站</div><h2>值班暂停</h2><p>点击空格建塔，点击已建塔可升至 Lv.3 解锁觉醒特效；共鸣满 100% 可由史莱姆主角发射 3×3 元素支援炮；善用 1×/2× 倍速与提前迎敌抢占凝露节奏。</p><div class="df-actions"><button class="df-primary" data-resume>继续值班　→</button><button data-home>回港</button></div></div>';
  }
  if (state === 'lost') {
    panel.innerHTML = '<div class="df-brief"><div class="df-paper-label">信道中断</div><h2>控制室失守</h2><p>防线在第 ' + game.wave + ' 波被突破。建议利用<strong>信号增幅格</strong>升满主力塔，并在第 4/8 波针对盾体与母体打出破甲、超载或蒸发反应。</p><div class="df-actions"><button class="df-primary" data-retry>重新选塔　→</button><button data-home>回港</button></div></div>';
  }
  if (state === 'transmit') {
    const mvp = game.mvpTower;
    const mvpText = mvp ? `${DEFENSE_CARDS[mvp.kind].name} Lv.${mvp.level}（${mvp.totalDamage} 伤害）` : '全队协防';
    const badges = [
      game.leaks === 0 ? '🏆 零漏怪完美值守' : `守住防线（剩余耐久 ${game.integrity}/3）`,
      game.tapes === 2 ? '📜 未用校准纸带' : null,
      game.reactions >= 10 ? `⚡ 元素大师（${game.reactions} 次反应）` : null,
    ].filter(Boolean).join(' · ');
    panel.innerHTML = `<div class="df-brief"><div class="df-paper-label">23 列 × 73 行　/　码流就绪</div><h2>最后一下，交给你。</h2><p>失谐母体与八波干扰已全部清零。1,679 个零和一排成了一幅图，里面有人的轮廓，也有我们在太阳系的位置。</p><div class="df-report"><div><span>击退干扰体</span><b>${game.kills}</b></div><div><span>元素反应</span><b>${game.reactions} 次</b></div><div><span>MVP 守塔</span><b>${mvpText}</b></div></div><p class="df-badges">${badges}</p><button class="df-primary" data-send>发往 M13　↗</button></div>`;
  }
  const primary = panel.querySelector<HTMLButtonElement>('.df-primary');
  primary?.focus({preventScroll: true});
}

let autoStarted = false;
function beginDefense() {
  if (!game.start([...loadout])) return;
  autoStarted = true;
  session.start();
  audio.startAmbient('defense');
  audio.playWaveHorn(false);
  tool = game.loadout[0];
  toolsBar();
  scene.select(-1, -1);
  drawPanel();
  canvas.focus({preventScroll: true});
}

function send() {
  if (!game.transmit()) return;
  audio.playTransmitVictory();
  session.recordWin({perfect: game.leaks === 0, untaped: game.tapes === 2});
  wonAt = performance.now();
  drawPanel();
}

hud.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!b || b.disabled) return;
  if (b.hasAttribute('data-home')) { session.home(); return; }
  if (b.dataset.pick) {
    const k = b.dataset.pick as ElementKind;
    if (loadout.has(k)) loadout.delete(k);
    else if (loadout.size < 4) loadout.add(k);
    else notice('先收回一张塔卡，再选它入队');
    syncPicks();
    return;
  }
  if (b.hasAttribute('data-start')) {
    beginDefense();
    return;
  }
  if (b.dataset.tool) { setTool(b.dataset.tool as Tool); return; }
  if (b.hasAttribute('data-speed')) {
    speed = speed === 1 ? 2 : 1;
    speedBtn.textContent = speed + '×';
    speedBtn.setAttribute('aria-pressed', String(speed === 2));
    notice(speed === 2 ? '已切换 2× 高速值班' : '已恢复 1× 常规速度');
    return;
  }
  if (b.hasAttribute('data-mute')) {
    const m = audio.toggleMute();
    muteBtn.textContent = m ? '🔇' : '🔊';
    return;
  }
  if (b.hasAttribute('data-early')) {
    const bonus = game.callNextWaveEarly();
    if (bonus > 0) {
      audio.playDewPickup();
      audio.playWaveHorn(game.wave === WAVES);
      notice(`⚡ 提前迎敌！奖励 +${bonus} 凝露 & +10% 共鸣`);
      refreshTools();
    }
    return;
  }
  if (b.hasAttribute('data-insp-close')) { closeInspector(); return; }
  if (b.hasAttribute('data-insp-up') && inspectTower) {
    if (game.upgrade(inspectTower.lane, inspectTower.col)) {
      const t = game.towers.find(x => x.lane === inspectTower!.lane && x.col === inspectTower!.col);
      if (t) {
        audio.playUpgrade(t.level);
        floats.spawn(defenseCellWorld(t.lane, t.col + .5, .95), `⬆ Lv.${t.level}!`, 'crit', '#ffe78a');
        notice(`${DEFENSE_CARDS[t.kind].name} 升级至 Lv.${t.level}` + (t.level === 3 ? ' · 觉醒特性已激活！' : ''));
        renderInspector(t);
      }
      refreshTools();
    }
    return;
  }
  if (b.hasAttribute('data-insp-rep') && inspectTower) {
    if (game.repair(inspectTower.lane, inspectTower.col)) {
      audio.playHealSip();
      const t = game.towers.find(x => x.lane === inspectTower!.lane && x.col === inspectTower!.col);
      if (t) {
        floats.spawn(defenseCellWorld(t.lane, t.col + .5, .9), '🔧 修复!', 'heal');
        renderInspector(t);
      }
      refreshTools();
    }
    return;
  }
  if (b.hasAttribute('data-insp-sell') && inspectTower) {
    const {lane, col} = inspectTower;
    const refund = game.salvage(lane, col);
    if (refund > 0) {
      audio.playSalvage();
      floats.spawn(defenseCellWorld(lane, col + .5, .8), `+${refund} 露`, 'dew');
      notice(`已拆解塔位，返还 ${refund} 凝露`);
    }
    closeInspector();
    refreshTools();
    return;
  }
  if (b.hasAttribute('data-pause')) pause(true);
  else if (b.hasAttribute('data-resume')) pause(false);
  else if (b.hasAttribute('data-send')) send();
  else if (b.hasAttribute('data-retry')) location.reload();
});

window.addEventListener('keydown', e => {
  if (!['wave', 'interval'].includes(game.phase)) return;
  if (e.code === 'Escape') {
    e.preventDefault();
    if (inspectTower) closeInspector();
    else pause(!paused);
    return;
  }
  if (paused) return;
  if (e.code === 'KeyF' && !e.repeat) {
    speed = speed === 1 ? 2 : 1;
    speedBtn.textContent = speed + '×';
    speedBtn.setAttribute('aria-pressed', String(speed === 2));
    return;
  }
  if (e.code === 'KeyQ' && !e.repeat) { setTool('support'); return; }
  if (/^Digit[1-5]$/.test(e.code)) {
    const idx = Number(e.code.slice(5)) - 1;
    const list: TowerKind[] = [...game.loadout, 'dew'];
    if (list[idx]) setTool(list[idx]);
    return;
  }
  if (document.activeElement !== canvas) return;
  const dirs: Record<string, [number, number]> = {ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0]};
  if (dirs[e.key]) {
    e.preventDefault();
    const [dy, dx] = dirs[e.key];
    cursor = {lane: Math.max(0, Math.min(4, cursor.lane + dy)), col: Math.max(0, Math.min(7, cursor.col + dx))};
    scene.select(cursor.lane, cursor.col);
    canvas.setAttribute('aria-label', rowLabels[cursor.lane] + '路，第' + (cursor.col + 1) + '格');
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onCell(cursor.lane, cursor.col);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && ['wave', 'interval'].includes(game.phase)) pause(true);
});

function placeLabels() {
  for (let i = 0; i < laneTags.length; i++) {
    const pos = scene.cellScreen(i, -.54);
    laneTags[i].style.left = pos.x + 'px';
    laneTags[i].style.top = pos.y + 'px';
    laneTags[i].textContent = String(i + 1);
  }
}
window.addEventListener('resize', () => { placeLabels(); if (inspectTower) closeInspector(); });

function processFxFeedback() {
  if (game.wave > seenWave && game.phase === 'wave') {
    seenWave = game.wave;
    if (seenWave > 1) {
      audio.playWaveHorn(seenWave === WAVES);
      if (seenWave === 4) notice('⚠ 第 4 波：谐振盾体登场！用破甲、超载或暗束瓦解护盾');
      else if (seenWave === WAVES) notice('🚨 最终波：失谐母体降临！全力协防并活用校准纸带与支援炮！');
    }
  }
  for (const fx of game.effects) {
    if (fx.id <= seenFxId) continue;
    seenFxId = fx.id;
    if (fx.kind === 'shot' && fx.element) {
      audio.playTowerShot(fx.element);
    } else if (fx.kind === 'hit' && fx.lane >= 0) {
      const pos = defenseCellWorld(fx.lane, fx.x, .75);
      if (fx.reaction) {
        audio.playReaction(fx.reaction);
        const [label, color] = reactionLabels[fx.reaction];
        floats.spawn([pos[0], pos[1] + .28, pos[2]], label, 'reaction', color);
        if (fx.reaction === 'vaporize' || fx.reaction === 'overload' || fx.reaction === 'shatter') {
          juice.addShake(0.14);
        }
      }
      if (fx.amount && fx.amount > 0) {
        floats.spawn(pos, '-' + fx.amount, fx.reaction === 'vaporize' || fx.reaction === 'overload' ? 'crit' : 'damage');
      }
    } else if (fx.kind === 'shieldBreak' && fx.lane >= 0) {
      audio.playPoiseBreak();
      juice.addShake(0.24);
      floats.spawn(defenseCellWorld(fx.lane, fx.x, 1.05), '🛡 护盾击破!', 'break');
    } else if (fx.kind === 'bossPulse' && fx.lane >= 0) {
      audio.playWaveHorn(true);
      juice.addShake(0.28);
      floats.spawn(defenseCellWorld(fx.lane, fx.x, 1.25), '⚡ 电磁脉冲干扰!', 'break');
    } else if (fx.kind === 'dew' && fx.lane >= 0 && fx.amount) {
      floats.spawn(defenseCellWorld(fx.lane, fx.x, .85), `+${fx.amount} 露`, 'dew');
    } else if (fx.kind === 'leak') {
      audio.playLeakAlarm();
      juice.addShake(0.45);
      notice('⚠ 干扰突破防线！家园信号完整度 -1');
    }
  }
}

let previous = performance.now();
function frame(now: number) {
  const realDt = Math.min(.25, Math.max(0, (now - previous) / 1000));
  previous = now;
  const simDt = paused ? 0 : realDt * speed;
  if (!paused) {
    clock += realDt;
    game.tick(simDt);
    processFxFeedback();
  }
  juice.step(realDt);
  juice.applyShake(scene.stage.camera);
  scene.update(game, clock, paused ? 0 : realDt);
  juice.restoreShake(scene.stage.camera);
  floats.update(realDt, scene.stage.camera);
  drawPanel();

  if (game.phase === 'setup') {
    if (!autoStarted && scene.actor.ready && loadout.size === 4) {
      beginDefense();
    } else {
      const startBtn = panel.querySelector<HTMLButtonElement>('[data-start]');
      if (startBtn) startBtn.disabled = loadout.size !== 4 || !scene.actor.ready;
    }
  }
  if (!paused && (game.phase === 'wave' || game.phase === 'interval')) {
    const next = game.upcoming;
    const hint = game.phase === 'interval'
      ? '整备 ' + Math.ceil(game.nextWaveIn) + ' 秒（可提前迎敌）'
      : next ? '第' + rowLabels[next.lane] + '路 · ' + ENEMY_NAMES[next.kind] + '　' + Math.ceil(next.inSeconds) + '秒后' : '清除场上干扰';
    const boss = game.boss;
    bossBar.hidden = !boss;
    if (boss) {
      at('[data-boss-hp]').textContent = `${Math.ceil(boss.hp)} / ${boss.maxHp}` + (boss.shield > 0 ? `  🛡 ${Math.ceil(boss.shield)}` : '');
      at('[data-boss-fill]').style.width = Math.max(0, Math.min(100, boss.hp / boss.maxHp * 100)).toFixed(1) + '%';
      at('[data-boss-shield]').style.width = boss.maxShield > 0 ? Math.max(0, Math.min(100, boss.shield / boss.maxShield * 100)).toFixed(1) + '%' : '0%';
    }
    earlyBtn.hidden = game.phase !== 'interval';
    const stamp = [game.dew, game.integrity, game.wave, Math.floor(game.resonance), hint, game.decodedBits, game.tapes].join('/');
    if (stamp !== lastUi) {
      at('[data-dew]').textContent = String(game.dew);
      at('[data-hp]').textContent = game.integrity + ' / 3';
      at('[data-wave]').textContent = game.wave + ' / ' + WAVES;
      at('[data-incoming]').textContent = hint;
      at('[data-bits]').textContent = game.decodedBits.toLocaleString('en-US') + ' / 1,679 位';
      at('[data-wave-prog]').style.width = Math.round((game.clearedWaves / WAVES) * 100) + '%';
      refreshTools();
      placeLabels();
      if (inspectTower) {
        const t = game.towers.find(x => x.lane === inspectTower!.lane && x.col === inspectTower!.col);
        if (t) renderInspector(t); else closeInspector();
      }
      lastUi = stamp;
    }
  }
  if (!radio.hidden && performance.now() > messageUntil) radio.hidden = true;
  if (game.phase === 'won' && !finished && now - wonAt >= 3000) {
    finished = true;
    session.finish();
  }
}
drawPanel();
scene.stage.renderer.setAnimationLoop(frame);
Object.assign(window, {
  __slime: scene.actor,
  __level: {spec, game, cellScreen: scene.cellScreen, get phase() { return game.phase; }, get hover() { return hoverTile; }},
});
