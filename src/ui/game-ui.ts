import {historyDetails} from './battle-history';
import './ui.css';
import {PRESET_NAMES, type QualitySetting} from '../game/graphics';
import {ChapterMeta, DayMeta, statusNames, templateNames} from '../../content/types';
import {days} from '../../content/registry';
import {DayId, dayLabel, month, monthLength, isValidDay} from '../game/calendar';
import {gatesFor,gateTitle,gatePalette,modePalette,pilotChoices,type Gate,type ModeGate} from '../game/mode-gates';
import {collectedMemories,progressId,imprintShapes,modeNames,type ModeKind} from '../../content/daily-modes';
import {elements} from '../slime/elements';
import type {SlimeCharacter} from '../slime/character';
import {mountSlimeHud} from './slime-hud';
import {getGuideSections} from './guide-catalog';
export interface UIHandlers {
  start(): void; resume(): void; pause(): void; openBook(): void; openGuide?(): void; closePanel(): void; showDay(id: DayId): void; showToday(): void;
  respawn(): void; quality(q: QualitySetting): void; toTitle(): void; go(id: string): void;
  toggleBuild?: () => void; toggleShape?: () => void;
}
export interface TitleInfo {ready: boolean; todayId: DayId; year: number; weekday: string; shown: DayMeta; isToday: boolean; quality: QualitySetting; preset?: string}
export interface HudInfo {day: string; sub: string; objective: string; shards: number; total: number; element: number; aiming: boolean; aimReady?: boolean; aimRecoil?: boolean; bodyShape?: 'dome' | 'ball'; umbrella?: boolean; building?: boolean}
export interface BookInfo {todayId: DayId; shownId: DayId; souvenirs: string[]; visited: string[]; completed: string[]; imprintOrder?:number}
const slimeMark = `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M7 50C7 30 17 12 32 12s25 18 25 38c0 4-3 6-7 6H14c-4 0-7-2-7-6z" style="fill:var(--accent)" stroke="#2f2a24" stroke-width="3.5"/><ellipse cx="24" cy="38" rx="3.3" ry="4.3" fill="#2f2a24"/><ellipse cx="40" cy="38" rx="3.3" ry="4.3" fill="#2f2a24"/><path d="M27 45q5 4 10 0" stroke="#2f2a24" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M17 26c2-5 6-9 11-10" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".85"/></svg>`;
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]!));
const statusChip = (c: ChapterMeta) => `<span class="chip ${c.status === 'web' ? 'sea' : c.status === 'ue' ? 'stamp' : 'mute'}">${statusNames[c.status]}</span>`;
function depart(id:string,completed:string[]){
  return `<button class="btn depart" data-act="go" data-id="${esc(id)}">${completed.includes(progressId(id))?'再去一次':'出发'}<span aria-hidden="true">→</span></button>`;
}
function doorFooter(primary = '') {
  return `<footer class="door-actions"><div class="door-secondary"><button class="btn ghost small" data-act="resume">回到港口</button><button class="btn ghost small" data-act="book">打开史书</button></div>${primary}</footer>`;
}
function imprintMarks(order:number|undefined) {
  const shapes=imprintShapes(order);
  if (!shapes.length) return '';
  return `<div class="imprint-marks" role="img" aria-label="取印顺序：${shapes.join('、')}">${shapes.map(shape=>
    `<i data-shape="${shape}" aria-hidden="true">${shape}</i>`).join('')}</div>`;
}
function pilotList(kind:ModeKind,completed:string[]){
  return `<div class="pilot-list">${pilotChoices(kind).map(m=>`<div><span><strong>${dayLabel(m.day)}</strong> · ${esc(m.title)}</span>${depart(m.id,completed)}</div>`).join('')}</div>`;
}
function extraChallenges(g:ModeGate,completed:string[]){
  if(!g.additional?.length)return '';
  return `<div class="pilot-list">${g.additional.map(m=>`<div><span>额外挑战 · <strong>${esc(m.title)}</strong></span>${depart(m.id,completed)}</div>`).join('')}</div>`;
}
function modeListing(g:ModeGate,completed:string[]){
  const m=g.challenge;
  return `<article class="mode-entry" style="--mode-color:${modePalette[g.kind][0]}">
    <div><small>${modeNames[g.kind]}</small><h4>${m?esc(m.title):'选择试玩日期'}</h4></div>
    ${m?`<p>${esc(m.fact)}</p>${historyDetails(m)}<p>${esc(m.goal)}</p><div class="meta">${completed.includes(m.saveId)?'<span class="chip sea">已通关</span>':''}${depart(m.id,completed)}</div>`:
      `<details><summary>查看开放日期</summary>${pilotList(g.kind,completed)}</details>`}
    ${extraChallenges(g,completed)}
  </article>`;
}
export class GameUI {
  readonly root: HTMLElement; private toastTimer = 0; private bookState = {tab: 'archive', month: 8, selected: '0815' as DayId};
  private guideSectionId = 'movement';
  private info: BookInfo | null = null; private hudEl: HTMLElement; private promptEl: HTMLElement; private keysEl: HTMLElement; private keysTimer = 0;
  constructor(private h: UIHandlers) {
    const root = this.root = document.createElement('div'); root.id = 'game-ui';
    root.innerHTML = `<div class="layer-title"></div><div class="hud hidden">
      <div class="hud-day"><div class="day-pill card"><div class="mini-stamp" id="stamp-day">4</div><div><strong id="hud-day"></strong><small id="hud-sub"></small></div></div>
        <div class="objective card"><span class="diamond">◆</span><span id="hud-objective"></span></div>
        <div class="shards card">✦ 时光碎片 <b id="hud-shards">0</b><span id="hud-total"></span></div></div>
      <div class="hud-buttons"><button class="icon-btn" data-act="build"><span class="key">V</span>建造</button><button class="icon-btn" data-act="shape"><span class="key">8</span><span id="hud-shape">钟型</span></button><button class="icon-btn" data-act="book"><span class="key">J</span>史书</button><button class="icon-btn" data-act="pause"><span class="key">Esc</span>暂停</button></div>
      <div class="keys card"><span class="k"><span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span></span><span>移动 · <span class="key">Shift</span> 冲刺</span>
        <span class="k"><span class="key">空格</span></span><span>两段跳 · 空中再按撑伞</span><span class="k"><span class="key">E</span><span class="key">R</span><span class="key">Q</span></span><span>属性战技 / 连携 / 元素爆发</span>
        <span class="k"><span class="key">F</span></span><span>互动 / 种植 · <span class="key">左键</span> 四段连击</span>
        <span class="k"><span class="key">G</span>/<span class="key">右键</span></span><span>瞄准 + <span class="key">左键</span> 发射 · <span class="key">X</span> 收回</span><span class="k"><span class="key">8</span> / <span class="key">C</span> / <span class="key">V</span></span><span>钟型 / 摊开 / 建造扩建</span></div>
      <div class="crosshair hidden"><i></i><i></i><i></i><i></i></div></div>
      <div class="prompt card hidden"></div><div class="toast card"></div><div class="layer-panel"></div>`;
    document.body.appendChild(root);
    this.hudEl = this.$('.hud'); this.promptEl = this.$('.prompt'); this.keysEl = this.$('.keys');
    root.addEventListener('click', e => {
      const t = (e.target as HTMLElement).closest('[data-act],[data-guide-sec],[data-guide-nav],[data-day],[data-tab],[data-month]') as HTMLElement | null; if (!t) return;
      if (t.dataset.guideSec) { this.guide(t.dataset.guideSec); return; }
      if (t.dataset.guideNav) {
        const secs = getGuideSections();
        const cur = Math.max(0, secs.findIndex(s => s.id === this.guideSectionId));
        const next = (cur + Number(t.dataset.guideNav) + secs.length) % secs.length;
        this.guide(secs[next].id);
        return;
      }
      if (t.dataset.tab) { this.bookState.tab = t.dataset.tab; this.renderBook(); return; }
      if (t.dataset.month) { const next = ((this.bookState.month - 1 + Number(t.dataset.month) + 12) % 12) + 1;
        this.bookState.month = next;
        const date = Math.min(Number(this.bookState.selected.slice(2)), monthLength(next));
        this.bookState.selected = String(next).padStart(2,'0') + String(date).padStart(2,'0');
        this.renderBook(); return; }
      if (t.dataset.day) { this.bookState.selected = t.dataset.day; this.renderBook(); return; }
      const act = t.dataset.act;
      if (act === 'start') this.h.start(); else if (act === 'resume') this.h.resume(); else if (act === 'book') this.h.openBook();
      else if (act === 'guide') this.h.openGuide?.();
      else if (act === 'build') this.h.toggleBuild?.(); else if (act === 'shape') this.h.toggleShape?.();
      else if (act === 'pause') this.h.pause(); else if (act === 'close') this.h.closePanel(); else if (act === 'respawn') this.h.respawn(); else if (act === 'title') this.h.toTitle();
      else if (act === 'show') this.h.showDay(this.bookState.selected); else if (act === 'today') { this.h.showToday(); } else if (act === 'go' && t.dataset.id) this.h.go(t.dataset.id);
    });
    root.addEventListener('change', e => { const t = e.target as HTMLSelectElement; if (t.dataset.quality !== undefined) this.h.quality(t.value as QualitySetting); });
  }
  private $(s: string) { return this.root.querySelector(s) as HTMLElement; }
  title(info: TitleInfo | null) {
    const layer = this.$('.layer-title');
    if (!info) { layer.innerHTML = ''; return; }
    const [m, d] = [month(info.todayId), Number(info.todayId.slice(2))];
    const shown = info.shown, chapters = shown.chapters.filter(c=>c.status==='web');
    const line = `${dayLabel(shown.day)}展出 <b>${chapters.length}</b> 个历史故事。左侧进故事，右侧选固定玩法。`;
    layer.innerHTML = `<section class="screen-title"><div class="title-col">
      <div class="postmark"><div><small>凝露港</small><b>${String(m).padStart(2, '0')}·${String(d).padStart(2, '0')}</b><small>${info.year} ${info.weekday}</small></div></div>
      <div class="kicker">Slime Fable · 历史上的今天</div>
      <h1>${slimeMark}史莱姆寓言</h1><p class="tagline">一小团果冻，穿过每一个“今天”。</p>
      <div class="today-card card grain"><h3>今天的档案</h3><p>${line}</p><div class="years">${chapters.map(c => `<span class="year-chip"><i style="background:${c.palette[0]}"></i>${c.year}</span>`).join('')}</div></div>
      <div class="title-actions"><button class="btn primary" data-act="start" ${info.ready ? '' : 'disabled'}>${info.ready ? '进入港口' : '史莱姆正在醒来…'}<span class="key">Enter</span></button><button class="btn" data-act="guide">📖 玩法教程</button><button class="btn" data-act="book">打开史书<span class="key">J</span></button></div>
      <div class="title-foot"><label>画质 <select data-quality>${(['auto', 'low', 'medium', 'high', 'ultra'] as QualitySetting[]).map(q => `<option value="${q}" ${info.quality === q ? 'selected' : ''}>${PRESET_NAMES[q]}</option>`).join('')}</select></label><span>键鼠游玩 · 建议使用 Chrome / Edge</span></div>
    </div></section>`;
  }
  showHud(on: boolean) { this.hudEl.classList.toggle('hidden', !on); if (on) { this.keysEl.classList.remove('dim'); clearTimeout(this.keysTimer); this.keysTimer = window.setTimeout(() => this.keysEl.classList.add('dim'), 12000); } else this.prompt(null); }
  hud(s: HudInfo) {
    this.$('#hud-day').textContent = s.day; this.$('#hud-sub').textContent = s.sub; this.$('#hud-objective').textContent = s.objective;
    this.$('#hud-shards').textContent = String(s.shards); this.$('#hud-total').textContent = ' / ' + s.total;
    this.root.style.setProperty('--accent', elements[s.element].color);
    if (s.bodyShape) this.$('#hud-shape').textContent = s.bodyShape === 'dome' ? '钟型' : '圆球';
    this.setCrosshair(s.aiming, s.aimReady !== false, !!s.aimRecoil);
  }
  setCrosshair(aiming: boolean, ready: boolean, recoil: boolean) {
    const ch = this.$('.crosshair');
    ch.classList.toggle('hidden', !aiming);
    ch.classList.toggle('blocked', !ready);
    ch.classList.toggle('recoil', recoil);
  }
  private characterHud?: ReturnType<typeof mountSlimeHud>;
  bindCharacter(actor: SlimeCharacter) { this.characterHud = mountSlimeHud(actor, undefined, this.hudEl); }
  updateCharacterHud() { this.characterHud?.update(true); }
  stampDay(text: string) { this.$('#stamp-day').textContent = text; }
  prompt(p: {x: number; y: number; title: string; sub: string} | null) {
    if (!p) { this.promptEl.classList.add('hidden'); this.promptEl.dataset.key = ''; return; }
    const key = p.title + p.sub;
    if (this.promptEl.dataset.key !== key) { this.promptEl.innerHTML = `<span class="key">F</span><div><strong>${esc(p.title)}</strong><small>${esc(p.sub)}</small></div>`; this.promptEl.dataset.key = key; this.promptEl.classList.remove('hidden'); }
    this.promptEl.style.left = p.x + 'px'; this.promptEl.style.top = (p.y - 14) + 'px';
  }
  toast(text: string, ms = 2600) { const el = this.$('.toast'); el.textContent = text; el.classList.add('show'); clearTimeout(this.toastTimer); this.toastTimer = window.setTimeout(() => el.classList.remove('show'), ms); }
  panel(html: string | null) {
    this.$('.layer-panel').innerHTML = html ?? '';
    if (html) this.showHud(false);
  }
  pause(quality: QualitySetting, preset = '') {
    this.panel(`<div class="overlay"><div class="pause card grain"><h2>暂停一下</h2><p>港口一直都在。</p><div class="stack">
      <button class="btn primary" data-act="resume">继续游玩</button><button class="btn" data-act="guide">📖 玩法教程</button><button class="btn" data-act="book">打开史书<span class="key">J</span></button>
      <button class="btn" data-act="respawn">回到广场</button>
      <div class="row" style="margin:4px 0">画质 <select data-quality style="pointer-events:auto;font:700 13px var(--sans);border:1.5px solid var(--ink);border-radius:999px;padding:6px 12px;background:var(--paper)">${(['auto', 'low', 'medium', 'high', 'ultra'] as QualitySetting[]).map(q => `<option value="${q}" ${quality === q ? 'selected' : ''}>${PRESET_NAMES[q]}</option>`).join('')}</select>${preset ? `<small style="margin-left:8px;color:var(--ink-3)">当前 ${preset}</small>` : ''}</div>
      <button class="btn ghost small" data-act="title">返回标题</button></div></div></div>`);
  }
  /** Extensible, data-driven tutorial modal rendered directly from `getGuideSections()`. */
  guide(sectionId?: string) {
    const sections = getGuideSections();
    if (!sections.length) return;
    if (sectionId && sections.some(s => s.id === sectionId)) this.guideSectionId = sectionId;
    else if (!sections.some(s => s.id === this.guideSectionId)) this.guideSectionId = sections[0].id;
    const idx = Math.max(0, sections.findIndex(s => s.id === this.guideSectionId));
    const sec = sections[idx];

    const navHtml = sections.map(s => `
      <button class="g-nav-item ${s.id === sec.id ? 'on' : ''}" data-guide-sec="${esc(s.id)}">
        <span class="g-ico">${s.icon}</span>
        <span class="g-label"><b>${esc(s.title)}</b>${s.badge ? `<small>${esc(s.badge)}</small>` : ''}</span>
      </button>
    `).join('');

    const keysHtml = sec.keybinds?.length
      ? `<div class="g-keys">${sec.keybinds.map(kb =>
          `<div class="g-kb"><span class="g-kbs">${kb.keys.map(k => `<span class="key">${esc(k)}</span>`).join('')}</span><em>${esc(kb.label)}</em></div>`,
        ).join('')}</div>`
      : '';

    const cardsHtml = `<div class="g-cards">${sec.cards.map(c => `
      <article class="g-card">
        <div class="g-card-head">
          <h4><span>${c.icon}</span>${esc(c.title)}</h4>
          ${c.tag ? `<span class="chip sea">${esc(c.tag)}</span>` : ''}
        </div>
        <p>${esc(c.summary)}</p>
        ${c.bullets?.length ? `<ul>${c.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
      </article>
    `).join('')}</div>`;

    const tipHtml = sec.tip ? `<div class="g-tip">💡 ${esc(sec.tip)}</div>` : '';

    this.panel(`<div class="overlay"><div class="guide-modal card grain">
      <aside class="g-side">
        <div class="g-side-head">
          <span class="kicker">SLIME FABLE GUIDE</span>
          <h3>📖 玩法教程</h3>
          <small>共 ${sections.length} 大玩法模块</small>
        </div>
        <nav class="g-nav">${navHtml}</nav>
      </aside>
      <section class="g-main">
        <header class="g-main-head">
          <div>
            <h2><span>${sec.icon}</span>${esc(sec.title)}</h2>
            <p>${esc(sec.subtitle)}</p>
          </div>
          <button class="close g-close" data-act="close" aria-label="关闭教程">✕</button>
        </header>
        <div class="g-scroll">
          ${keysHtml}
          ${cardsHtml}
          ${tipHtml}
        </div>
        <footer class="g-foot">
          <span class="g-page-num">第 ${idx + 1} / ${sections.length} 章</span>
          <div class="g-foot-acts">
            <button class="btn small" data-guide-nav="-1">◀ 上一章</button>
            <button class="btn small" data-guide-nav="1">下一章 ▶</button>
            <button class="btn small primary" data-act="close">我学会了</button>
          </div>
        </footer>
      </section>
    </div></div>`);
  }
  book(info: BookInfo) { this.info = info; this.bookState.selected = info.shownId; this.bookState.month = month(info.shownId); this.renderBook(); }
  private renderBook() {
    const info = this.info!, st = this.bookState;
    const tabs = `<div class="tabs">${[['archive', '档案'], ['souvenir', '纪念品'], ['controls', '操作']].map(([k, n]) => `<button class="tab ${st.tab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div><button class="close" data-act="close" aria-label="合上史书">✕</button>`;
    let left = '', right = '';
    if (st.tab === 'archive') {
      const m = st.month, len = monthLength(m), mm = String(m).padStart(2, '0');
      const cells = Array.from({length: len}, (_, i) => { const id = mm + String(i + 1).padStart(2, '0'); return `<button data-day="${id}" class="${days[id] ? 'has' : ''} ${id === info.todayId ? 'today' : ''} ${id === st.selected ? 'sel' : ''}">${i + 1}</button>`; }).join('');
      const sel = days[st.selected], shown = st.selected === info.shownId;
      left = `<div class="page"><h2>史书</h2><p class="sub">每一天，都有一扇或几扇门开着。</p>
        <div class="month-head"><button class="arrow" data-month="-1" aria-label="上个月">◀</button><b>${m} 月</b><button class="arrow" data-month="1" aria-label="下个月">▶</button></div>
        <div class="cal">${cells}</div>
        <div class="day-summary card"><div><strong>${dayLabel(st.selected)}</strong><small>${sel ? `${sel.chapters.filter(c=>c.status==="web").length} 个可玩故事 · ${sel.theme}` : '档案整理中'}${st.selected === info.todayId ? ' · 今天' : ''}</small></div>
        ${sel ? (shown ? '<span class="chip sea">港口正在展出</span>' : '<button class="btn small primary" data-act="show">在港口展出</button>') : (info.shownId !== info.todayId && st.selected === info.todayId ? '' : '')}</div>
        <div class="row" style="justify-content:flex-start;margin-top:12px"><button class="btn small ghost" data-act="today">回到今天</button></div></div>`;
      const gates=sel?gatesFor(sel):[];
      const archive=gates.flatMap(g=>g?.type==='story'?g.archive:[]);
      const modes = gates.filter((g):g is ModeGate=>g?.type==='mode');
      right = `<div class="page day-entries">${sel ? `<h2>${dayLabel(st.selected)}</h2><h3>历史故事</h3>${sel.chapters.map(c => `<div class="chapter"><div class="yr">${c.year}<small>${templateNames[c.template]}</small></div><div><h4>${esc(c.event)}</h4><p>主线：${esc(c.quest)}</p><div class="meta">${statusChip(c)}<span class="chip">✦ ${esc(c.souvenir)}</span>${info.completed.includes(c.id) ? '<span class="chip sea">已通关</span>' : info.visited.includes(c.id) ? '<span class="chip mute">已拜访</span>' : ''}${c.status==='web'?depart(c.id,info.completed):''}</div></div></div>`).join('')}
        <h3>固定玩法</h3>${modes.map(g=>modeListing(g,info.completed)).join('')}${archive.length?'<h3>往期挑战</h3>'+archive.map(m=>modeListing({type:'mode',kind:m.kind,challenge:m,day:m.day},info.completed)).join(''):''}` : '<div class="empty">这一天的档案还在整理。</div>'}</div>`;
    } else if (st.tab === 'souvenir') {
      const all = Object.values(days).flatMap(d => d.chapters).filter(c=>c.status==='web');
      const memories=collectedMemories(info.souvenirs);
      const storyCount=all.filter(c=>info.souvenirs.includes(c.id)).length;
      left = `<div class="page" style="grid-column:1/3"><h2>纪念品</h2><p class="sub">已收藏 ${storyCount} 件故事纪念品 · ${memories.length} 张历史纪念卡</p>
        ${Array.from(memories.values(), modes => {
          const first = modes[0];
          const marks = modes.some(m=>m.id==='0101-trial') ? imprintMarks(info.imprintOrder) : '';
          const notes = modes.map(m=>`<p><b>${modeNames[m.kind]}</b> · ${esc(m.memory)}</p>`).join('');
          return `<article class="memory-slip"><small>${first.year} 年 ${dayLabel(first.day)}</small><h3>${esc(first.souvenir)}</h3>${marks}${notes}<p>${esc(first.fact)} <a href="${esc(first.source)}" target="_blank" rel="noopener">史料</a></p>${historyDetails(first)}</article>`;
        }).join('')}
        <div class="souvenirs">${all.map(c => { const got = info.souvenirs.includes(c.id); return `<div class="souvenir ${got ? 'got' : ''}"><div class="seal">${got ? '✦' : '?'}</div><b>${got ? esc(c.souvenir) : '尚未获得'}</b><small>${dayLabel(c.day)} · ${c.year}</small></div>`; }).join('')}</div></div>`;
    } else {
      const rows: [string, string][] = [['<span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span>', '移动；按住 <span class="key">Shift</span> 冲刺'], ['<span class="key">空格</span>', '两段跳；二段跳后在空中再按展开/收起滑翔伞'], ['<span class="key">8</span>', '切换史莱姆形态：UE 钟型果冻 / 经典圆球'], ['朝墙走', '贴住墙面：推向墙往上爬，拉开往下滑，左右横移；爬到顶自动翻上去'], ['<span class="key">空格</span> / <span class="key">T</span>', '贴墙时：蹬墙跳 / 松手落下'], ['<span class="key">F</span>', '互动：翻开史书、进入时光门、种田、观察/投喂来访小动物'], ['<span class="key">V</span>', '开启 / 退出家园自由建造模式（Q/E 旋转，R 缩放，左键摆放，右键拆除）'], ['<span class="key">J</span>', '打开 / 合上史书'], ['<span class="key">B</span>', '图鉴、背包、栖地来客与家园成长手账'], ['公园门口', '凝露小厨：切火属性（3）用收成做料理；委托板：每天三个委托，交货换贝壳'], ['<span class="key">F</span>（地块 / 码头）', '种田：水属性浇水翻倍、火属性烧草催暖、风属性授粉变异、雷属性充能洒水泉；钓鱼：甩竿收线'], ['<span class="key">1</span>–<span class="key">6</span>', '切换水、风、火、雷、暗、物（同步切换滑翔伞造型与培育效果）'], ['<span class="key">G</span> / <span class="key">右键</span> + <span class="key">左键</span>', '过肩瞄准并炮弹发射分身（40m 射程，最多 5 团）'], ['<span class="key">X</span>', '按住收回分身（高空回程自动撑小伞）'], ['<span class="key">C</span>', '按住摊开身体，钻低矮缝隙'], ['<span class="key">左键</span>', '四段连击'], ['<span class="key">滚轮</span>', '镜头远近'], ['<span class="key">T</span>', '卡住时回到出生点'], ['<span class="key">Esc</span>', '暂停']];
      left = `<div class="page" style="grid-column:1/3"><h2>操作</h2><p class="sub">鼠标转动镜头；港口里可按住右键拖动。10 月 21 日战斗中点右键闪避，无鼠标锁定时按住中键转动视角。</p><div class="controls-list">${rows.map(([k, v]) => `<span class="k">${k}</span><span>${v}</span>`).join('')}</div></div>`;
    }
    this.panel(`<div class="overlay"><div class="book grain">${tabs}${left}${right}</div></div>`);
  }
  singleDeparture() {
    const primary = this.root.querySelector<HTMLButtonElement>('.door-actions [data-act="go"]');
    if (primary) return primary;
    const departures = this.root.querySelectorAll<HTMLButtonElement>('.door [data-act="go"]');
    return departures.length === 1 ? departures[0] : null;
  }
  gate(g:Gate, slot:number, completed:string[]){
    if(g.type==='story'&&g.stories.length===1&&!g.archive.length){this.door(g.stories[0],slot,completed.includes(g.stories[0].id));return;}
    if(g.type==='story'&&!g.stories.length&&g.archive.length===1){
      const only=g.archive[0];this.gate({type:'mode',kind:only.kind,day:only.day,challenge:only},slot,completed);return;
    }
    const palette=gatePalette(g);
    const m=g.type==='mode'?g.challenge:undefined;
    let body:string;
    let primary = '';
    if(g.type==='story'){
      body=`<h2>${g.archive.length?'选择故事或往期挑战':'选择故事年份'}</h2><div class="pilot-list">${g.stories.map(c=>`<div><span><strong>${c.year}</strong> · ${esc(c.quest)}</span>${depart(c.id,completed)}</div>`).join('')}${g.archive.map(m=>`<div><span><strong>${m.year}</strong> · ${esc(m.title)}</span>${depart(m.id,completed)}</div>`).join('')}</div>`;
    }else if(m){
      body=`<div class="kicker">${m.year} 年 ${dayLabel(m.day)}</div><h2>${esc(m.title)}</h2><p>${esc(m.fact)}</p>${historyDetails(m)}<div class="quest">${esc(m.goal)}</div><p>${esc(m.choice)}</p><span class="chip">✦ ${esc(m.souvenir)}</span>${extraChallenges(g,completed)}`;
      primary = depart(m.id,completed);
    }else{
      const choices = pilotChoices(g.kind);
      const only = choices.length === 1 ? choices[0] : undefined;
      body=`<h2>选择试玩日期</h2><p>${dayLabel(g.day)}的这项挑战尚未开放。</p>${only?`<div class="quest">${dayLabel(only.day)} · ${esc(only.title)}</div>`:pilotList(g.kind,completed)}`;
      if (only) primary = depart(only.id,completed);
    }
    this.panel(`<div class="overlay"><div class="door card gate-preview" style="--a:${palette[0]};--b:${palette[1]}"><div class="door-band"><small>第 ${slot} 扇门</small><b>${esc(gateTitle(g))}</b></div><div class="door-body"><div class="door-content">${body}</div>${doorFooter(primary)}</div></div></div>`);
    this.singleDeparture()?.focus({preventScroll:true});
  }
  door(c: ChapterMeta, slot: number, completed = false) {
    const playable = c.status === 'web';
    this.panel(`<div class="overlay"><div class="door card" style="--a:${c.palette[0]};--b:${c.palette[1]}"><div class="door-band"><small>第 ${slot} 扇门</small><b>${c.year}</b></div>
      <div class="door-body"><div class="door-content"><div class="kicker">时光门 · ${dayLabel(c.day)} · ${templateNames[c.template]}</div><h2>${esc(c.event)}</h2>
      <div class="quest"><span>◆</span> 主线：${esc(c.quest)}</div><ol>${c.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      <div class="meta">${statusChip(c)}<span class="chip">✦ 纪念品：${esc(c.souvenir)}</span></div>
      ${playable ? '' : '<p class="door-note">这扇门后面的关卡还在 Web 版制作中，按日历上架后就能从这里出发。现在可以先在港口里找找时光碎片。</p>'}
      </div>${doorFooter(playable ? depart(c.id,completed ? [c.id] : []) : '')}</div></div></div>`);
    this.singleDeparture()?.focus({preventScroll:true});
  }
}
export {isValidDay};
