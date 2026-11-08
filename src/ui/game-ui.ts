import './ui.css';
import {ChapterMeta, DayMeta, statusNames, templateNames} from '../../content/types';
import {days} from '../../content/registry';
import {DayId, dayLabel, month, monthLength, isValidDay} from '../game/calendar';
import {elements} from '../slime/elements';
export interface UIHandlers {
  start(): void; resume(): void; pause(): void; openBook(): void; closePanel(): void; showDay(id: DayId): void; showToday(): void;
  respawn(): void; quality(q: 'high' | 'balanced'): void; toTitle(): void; element(i: number): void; go(id: string): void;
}
export interface TitleInfo {ready: boolean; todayId: DayId; year: number; weekday: string; shown: DayMeta; isToday: boolean; quality: 'high' | 'balanced'}
export interface HudInfo {day: string; sub: string; objective: string; shards: number; total: number; element: number; aiming: boolean}
export interface BookInfo {todayId: DayId; shownId: DayId; souvenirs: string[]; visited: string[]; completed: string[]}
const slimeMark = `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M7 50C7 30 17 12 32 12s25 18 25 38c0 4-3 6-7 6H14c-4 0-7-2-7-6z" style="fill:var(--accent)" stroke="#2f2a24" stroke-width="3.5"/><ellipse cx="24" cy="38" rx="3.3" ry="4.3" fill="#2f2a24"/><ellipse cx="40" cy="38" rx="3.3" ry="4.3" fill="#2f2a24"/><path d="M27 45q5 4 10 0" stroke="#2f2a24" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M17 26c2-5 6-9 11-10" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".85"/></svg>`;
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]!));
const statusChip = (c: ChapterMeta) => `<span class="chip ${c.status === 'web' ? 'sea' : c.status === 'ue' ? 'stamp' : 'mute'}">${statusNames[c.status]}</span>`;
export class GameUI {
  readonly root: HTMLElement; private toastTimer = 0; private bookState = {tab: 'archive', month: 8, selected: '0815' as DayId};
  private info: BookInfo | null = null; private hudEl: HTMLElement; private promptEl: HTMLElement; private keysEl: HTMLElement; private keysTimer = 0;
  constructor(private h: UIHandlers) {
    const root = this.root = document.createElement('div'); root.id = 'game-ui';
    root.innerHTML = `<div class="layer-title"></div><div class="hud hidden">
      <div class="hud-day"><div class="day-pill card"><div class="mini-stamp" id="stamp-day">4</div><div><strong id="hud-day"></strong><small id="hud-sub"></small></div></div>
        <div class="objective card"><span class="diamond">◆</span><span id="hud-objective"></span></div>
        <div class="shards card">✦ 时光碎片 <b id="hud-shards">0</b><span id="hud-total"></span></div></div>
      <div class="hud-buttons"><button class="icon-btn" data-act="book"><span class="key">J</span>史书</button><button class="icon-btn" data-act="pause"><span class="key">Esc</span>暂停</button></div>
      <div class="elements card">${elements.map((e, i) => `<button class="el" data-el="${i}" style="--c:${e.color}" aria-label="${e.name}属性"><i></i><kbd>${i + 1}</kbd><span>${e.name}</span></button>`).join('')}</div>
      <div class="keys card"><span class="k"><span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span></span><span>移动 · <span class="key">Shift</span> 冲刺</span>
        <span class="k"><span class="key">空格</span></span><span>两段跳 · 贴墙时蹬墙跳</span><span class="k"><span class="key">F</span></span><span>互动 / 进入时光门</span>
        <span class="k"><span class="key">G</span>+<span class="key">左键</span></span><span>发射分身 · <span class="key">X</span> 收回</span><span class="k"><span class="key">C</span></span><span>摊开身体</span></div>
      <div class="crosshair hidden"></div></div>
      <div class="prompt card hidden"></div><div class="toast card"></div><div class="layer-panel"></div>`;
    document.body.appendChild(root);
    this.hudEl = this.$('.hud'); this.promptEl = this.$('.prompt'); this.keysEl = this.$('.keys');
    root.addEventListener('click', e => {
      const t = (e.target as HTMLElement).closest('[data-act],[data-el],[data-day],[data-tab],[data-month]') as HTMLElement | null; if (!t) return;
      if (t.dataset.el) { this.h.element(Number(t.dataset.el)); return; }
      if (t.dataset.tab) { this.bookState.tab = t.dataset.tab; this.renderBook(); return; }
      if (t.dataset.month) { this.bookState.month = ((this.bookState.month - 1 + Number(t.dataset.month) + 12) % 12) + 1; this.renderBook(); return; }
      if (t.dataset.day) { this.bookState.selected = t.dataset.day; this.renderBook(); return; }
      const act = t.dataset.act;
      if (act === 'start') this.h.start(); else if (act === 'resume') this.h.resume(); else if (act === 'book') this.h.openBook();
      else if (act === 'pause') this.h.pause(); else if (act === 'close') this.h.closePanel(); else if (act === 'respawn') this.h.respawn(); else if (act === 'title') this.h.toTitle();
      else if (act === 'show') this.h.showDay(this.bookState.selected); else if (act === 'today') { this.h.showToday(); } else if (act === 'go' && t.dataset.id) this.h.go(t.dataset.id);
    });
    root.addEventListener('change', e => { const t = e.target as HTMLSelectElement; if (t.dataset.quality !== undefined) this.h.quality(t.value as 'high' | 'balanced'); });
  }
  private $(s: string) { return this.root.querySelector(s) as HTMLElement; }
  title(info: TitleInfo | null) {
    const layer = this.$('.layer-title');
    if (!info) { layer.innerHTML = ''; return; }
    const [m, d] = [month(info.todayId), Number(info.todayId.slice(2))];
    const shown = info.shown, chapters = shown.chapters;
    const line = info.isToday ? `今天港口开着 <b>${chapters.length}</b> 扇时光门。` : `${dayLabel(info.todayId)}的档案还在整理。港口正在展出 <b>${dayLabel(shown.day)}</b> 的 ${chapters.length} 扇时光门。`;
    layer.innerHTML = `<section class="screen-title"><div class="title-col">
      <div class="postmark"><div><small>凝露港</small><b>${String(m).padStart(2, '0')}·${String(d).padStart(2, '0')}</b><small>${info.year} ${info.weekday}</small></div></div>
      <div class="kicker">Slime Fable · 历史上的今天</div>
      <h1>${slimeMark}史莱姆寓言</h1><p class="tagline">一小团果冻，穿过每一个“今天”。</p>
      <div class="today-card card grain"><h3>今天的档案</h3><p>${line}</p><div class="years">${chapters.map(c => `<span class="year-chip"><i style="background:${c.palette[0]}"></i>${c.year}</span>`).join('')}</div></div>
      <div class="title-actions"><button class="btn primary" data-act="start" ${info.ready ? '' : 'disabled'}>${info.ready ? '进入港口' : '史莱姆正在醒来…'}<span class="key">Enter</span></button><button class="btn" data-act="book">打开史书<span class="key">J</span></button></div>
      <div class="title-foot"><label>画质 <select data-quality><option value="high" ${info.quality === 'high' ? 'selected' : ''}>高</option><option value="balanced" ${info.quality === 'balanced' ? 'selected' : ''}>平衡</option></select></label><span>键鼠游玩 · 建议使用 Chrome / Edge</span></div>
    </div></section>`;
  }
  showHud(on: boolean) { this.hudEl.classList.toggle('hidden', !on); if (on) { this.keysEl.classList.remove('dim'); clearTimeout(this.keysTimer); this.keysTimer = window.setTimeout(() => this.keysEl.classList.add('dim'), 12000); } else this.prompt(null); }
  hud(s: HudInfo) {
    this.$('#hud-day').textContent = s.day; this.$('#hud-sub').textContent = s.sub; this.$('#hud-objective').textContent = s.objective;
    this.$('#hud-shards').textContent = String(s.shards); this.$('#hud-total').textContent = ' / ' + s.total;
    this.root.style.setProperty('--accent', elements[s.element].color);
    this.root.querySelectorAll<HTMLElement>('.el').forEach(b => b.classList.toggle('active', Number(b.dataset.el) === s.element));
    this.$('.crosshair').classList.toggle('hidden', !s.aiming);
  }
  stampDay(text: string) { this.$('#stamp-day').textContent = text; }
  prompt(p: {x: number; y: number; title: string; sub: string} | null) {
    if (!p) { this.promptEl.classList.add('hidden'); this.promptEl.dataset.key = ''; return; }
    const key = p.title + p.sub;
    if (this.promptEl.dataset.key !== key) { this.promptEl.innerHTML = `<span class="key">F</span><div><strong>${esc(p.title)}</strong><small>${esc(p.sub)}</small></div>`; this.promptEl.dataset.key = key; this.promptEl.classList.remove('hidden'); }
    this.promptEl.style.left = p.x + 'px'; this.promptEl.style.top = (p.y - 14) + 'px';
  }
  toast(text: string, ms = 2600) { const el = this.$('.toast'); el.textContent = text; el.classList.add('show'); clearTimeout(this.toastTimer); this.toastTimer = window.setTimeout(() => el.classList.remove('show'), ms); }
  panel(html: string | null) { this.$('.layer-panel').innerHTML = html ?? ''; }
  pause(quality: 'high' | 'balanced') {
    this.panel(`<div class="overlay"><div class="pause card grain"><h2>暂停一下</h2><p>港口一直都在。</p><div class="stack">
      <button class="btn primary" data-act="resume">继续游玩</button><button class="btn" data-act="book">打开史书<span class="key">J</span></button>
      <button class="btn" data-act="respawn">回到广场</button>
      <div class="row" style="margin:4px 0">画质 <select data-quality style="pointer-events:auto;font:700 13px var(--sans);border:1.5px solid var(--ink);border-radius:999px;padding:6px 12px;background:var(--paper)"><option value="high" ${quality === 'high' ? 'selected' : ''}>高</option><option value="balanced" ${quality === 'balanced' ? 'selected' : ''}>平衡</option></select></div>
      <button class="btn ghost small" data-act="title">返回标题</button></div></div></div>`);
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
        <div class="day-summary card"><div><strong>${dayLabel(st.selected)}</strong><small>${sel ? `${sel.chapters.length} 个故事 · ${sel.theme}` : '档案整理中'}${st.selected === info.todayId ? ' · 今天' : ''}</small></div>
        ${sel ? (shown ? '<span class="chip sea">港口正在展出</span>' : '<button class="btn small primary" data-act="show">在港口展出</button>') : (info.shownId !== info.todayId && st.selected === info.todayId ? '' : '')}</div>
        <div class="row" style="justify-content:flex-start;margin-top:12px"><button class="btn small ghost" data-act="today">回到今天</button></div></div>`;
      right = `<div class="page">${sel ? `<h2>${dayLabel(st.selected)}</h2><p class="sub">按顺序对应港口的 1–${sel.chapters.length} 号时光门</p>${sel.chapters.map(c => `<div class="chapter"><div class="yr">${c.year}<small>${templateNames[c.template]}</small></div><div><h4>${esc(c.event)}</h4><p>主线：${esc(c.quest)}</p><div class="meta">${statusChip(c)}<span class="chip">✦ ${esc(c.souvenir)}</span>${info.completed.includes(c.id) ? '<span class="chip sea">已通关</span>' : info.visited.includes(c.id) ? '<span class="chip mute">已拜访</span>' : ''}</div></div></div>`).join('')}`
        : `<div class="empty"><b>这一天的档案还在整理。</b>已经收录：${Object.keys(days).sort().map(dayLabel).join('、')}。<br>新的日子会按日历提前上架。</div>`}</div>`;
    } else if (st.tab === 'souvenir') {
      const all = Object.values(days).flatMap(d => d.chapters);
      left = `<div class="page" style="grid-column:1/3"><h2>纪念品</h2><p class="sub">每扇门后面都藏着一件纪念品，找到就收进这里。已收集 ${info.souvenirs.length} / ${all.length}</p>
        <div class="souvenirs">${all.map(c => { const got = info.souvenirs.includes(c.id); return `<div class="souvenir ${got ? 'got' : ''}"><div class="seal">${got ? '✦' : '?'}</div><b>${got ? esc(c.souvenir) : '尚未获得'}</b><small>${dayLabel(c.day)} · ${c.year}</small></div>`; }).join('')}</div></div>`;
    } else {
      const rows: [string, string][] = [['<span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span>', '移动；按住 <span class="key">Shift</span> 冲刺'], ['<span class="key">空格</span>', '两段跳；漂在水里也能起跳'], ['朝墙走', '贴住墙面：推向墙往上爬，拉开往下滑，左右横移；爬到顶自动翻上去'], ['<span class="key">空格</span> / <span class="key">T</span>', '贴墙时：蹬墙跳 / 松手落下'], ['<span class="key">F</span>', '互动：翻开史书、进入时光门'], ['<span class="key">J</span>', '打开 / 合上史书'], ['<span class="key">B</span>', '图鉴与背包：收成、鱼、小动物'], ['公园门口', '凝露小厨：切火属性（3）用收成做料理；委托板：每天三个委托，交货换贝壳'], ['<span class="key">F</span>（地块 / 码头）', '种田：种下、浇水（水属性翻倍）、火属性烧杂草、收获；钓鱼：甩竿、咬钩、按住收线'], ['<span class="key">1</span>–<span class="key">6</span>', '切换水、风、火、雷、暗、物；水属性游得最快'], ['<span class="key">G</span>+<span class="key">左键</span>', '瞄准并发射分身（最多 5 团）'], ['<span class="key">X</span>', '按住收回分身'], ['<span class="key">C</span>', '按住摊开身体，钻低矮缝隙'], ['<span class="key">左键</span>', '四段连击'], ['<span class="key">滚轮</span>', '镜头远近'], ['<span class="key">T</span>', '卡住时回到出生点'], ['<span class="key">Esc</span>', '暂停']];
      left = `<div class="page" style="grid-column:1/3"><h2>操作</h2><p class="sub">鼠标转动镜头；不支持鼠标锁定时按住右键拖动。</p><div class="controls-list">${rows.map(([k, v]) => `<span class="k">${k}</span><span>${v}</span>`).join('')}</div></div>`;
    }
    this.panel(`<div class="overlay"><div class="book grain">${tabs}${left}${right}</div></div>`);
  }
  door(c: ChapterMeta, slot: number, completed = false) {
    const playable = c.status === 'web';
    this.panel(`<div class="overlay"><div class="door card" style="--a:${c.palette[0]};--b:${c.palette[1]}"><div class="door-band"><small>第 ${slot} 扇门</small><b>${c.year}</b></div>
      <div class="door-body"><div class="kicker">时光门 · ${dayLabel(c.day)} · ${templateNames[c.template]}</div><h2>${esc(c.event)}</h2>
      <div class="quest"><span>◆</span> 主线：${esc(c.quest)}</div><ol>${c.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      <div class="meta">${statusChip(c)}<span class="chip">✦ 纪念品：${esc(c.souvenir)}</span></div>
      ${playable ? '' : '<p class="door-note">这扇门后面的关卡还在 Web 版制作中，按日历上架后就能从这里出发。现在可以先在港口里找找时光碎片。</p>'}
      <div class="row" style="justify-content:flex-start">${playable ? `<button class="btn primary" data-act="go" data-id="${c.id}">${completed ? '再去一次' : '出发'}<span class="key">F</span></button><button class="btn small" data-act="resume">回到港口</button>` : '<button class="btn primary" data-act="resume">回到港口<span class="key">F</span></button>'}<button class="btn ghost small" data-act="book">在史书里看这一天</button></div></div></div></div>`);
  }
}
export {isValidDay};
