import './ui.css';
import type {SlimeCharacter} from '../slime/character';
import {mountSlimeHud} from './slime-hud';
import type {QuestView} from '../game/quest';
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]!));
export interface LevelHandlers {start(): void; resume(): void; restart(): void; home(): void;}
/** In-level HUD and cards. Shares ui.css with the harbour so both read as one game. */
export class LevelUI {
  readonly root: HTMLElement; private toastTimer = 0; private speechTimer = 0; private h: LevelHandlers;
  constructor(h: LevelHandlers, private kicker: string) {
    this.h = h; const root = this.root = document.createElement('div'); root.id = 'game-ui';
    root.innerHTML = `<div class="hud hidden"><div class="quest card grain"></div>
      <div class="hud-buttons"><button class="icon-btn" data-act="pause"><span class="key">Esc</span>暂停</button></div>
      <div class="crosshair hidden"><i></i><i></i><i></i><i></i></div></div><div class="prompt card hidden"></div><div class="speech card hidden"></div><div class="banner-layer"></div><div class="toast card"></div><div class="layer-panel"></div>`;
    document.body.appendChild(root);
    root.addEventListener('click', e => {
      const t = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null; if (!t) return;
      const a = t.dataset.act; if (a === 'start') this.h.start(); else if (a === 'resume') this.h.resume(); else if (a === 'restart') this.h.restart(); else if (a === 'home') this.h.home(); else if (a === 'pause') { this.actor?.pause(); this.showHud(false); this.panelPause(); }
    });
  }
  private $(s: string) { return this.root.querySelector(s) as HTMLElement; }
  panel(html: string | null) {
    const panel = this.$('.layer-panel');
    panel.innerHTML = html ?? '';
    if (html) panel.querySelector<HTMLButtonElement>('button.primary:not(:disabled)')?.focus({preventScroll:true});
  }
  intro(title: string, intro: string, steps: string[], ready: boolean) {
    this.panel(`<div class="overlay"><div class="intro card grain"><div class="kicker">${esc(this.kicker)}</div><h2>${esc(title)}</h2><p>${esc(intro)}</p>
      <ol>${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      <div class="row" style="justify-content:flex-start"><button class="btn primary" data-act="start" ${ready ? '' : 'disabled'}>${ready ? '出发' : '史莱姆正在醒来…'}<span class="key">Enter</span></button><button class="btn ghost small" data-act="home">回到港口</button></div></div></div>`);
  }
  panelPause() { this.panel(`<div class="overlay"><div class="pause card grain"><h2>暂停一下</h2><p>这一年还在等你。</p><div class="stack"><button class="btn primary" data-act="resume">继续游玩</button><button class="btn" data-act="restart">重新开始这一关</button><button class="btn ghost small" data-act="home">回到港口</button></div></div></div>`); }
  complete(title: string, outro: string, souvenir: string | null, got: boolean) {
    this.panel(`<div class="overlay"><div class="pause complete card grain"><div class="seal">完成</div><h2>${esc(title)}</h2><p>${esc(outro)}</p>
      ${souvenir ? `<p style="margin-top:-8px"><span class="chip ${got ? 'stamp' : 'mute'}">✦ ${got ? '纪念品已收进史书：' + esc(souvenir) : '这一关还藏着纪念品：' + esc(souvenir)}</span></p>` : ''}
      <div class="stack"><button class="btn primary" data-act="home">回到港口</button>${got ? '' : '<button class="btn" data-act="resume">再找找纪念品</button>'}</div></div></div>`);
  }
  showHud(on: boolean) { this.$('.hud').classList.toggle('hidden', !on); if (on) this.hud(this.actor?.aiming ?? false); else { this.characterHud?.update(false); this.prompt(null); this.speech(null); } }
  quest(v: QuestView) {
    this.$('.quest').innerHTML = `<div class="kicker">${esc(this.kicker)}</div><h3><span>◆</span>${esc(v.title)}</h3>
      <div class="branch"><span>${esc(v.branch)}</span>${v.total > 1 ? `<b>${v.count} / ${v.total}</b>` : ''}</div>
      ${v.side ? `<div class="side ${v.side.done ? 'done' : ''}">${v.side.done ? '✓' : '✦'} 支线 · ${esc(v.side.title)}</div>` : ''}
      <div class="steps">${Array.from({length: v.branches}, (_, i) => `<i class="${i < v.index ? 'on' : ''}"></i>`).join('')}</div>`;
  }
  private actor?: SlimeCharacter;
  private characterHud?: ReturnType<typeof mountSlimeHud>;
  bindCharacter(actor: SlimeCharacter) {
    this.actor = actor;
    this.characterHud = mountSlimeHud(actor, undefined, this.$('.hud'));
  }
  hud(aiming: boolean) {
    const active = this.actor?.mode === 'play';
    this.characterHud?.update(active);
    this.$('.crosshair').classList.toggle('hidden', !active || !aiming);
  }
  banner(small: string, text: string) { const el = document.createElement('div'); el.className = 'banner card grain'; el.innerHTML = `<small>${esc(small)}</small><strong>${esc(text)}</strong>`; this.$('.banner-layer').replaceChildren(el); }
  prompt(p: {x: number; y: number; title: string; sub: string} | null) {
    const el = this.$('.prompt'); if (!p) { el.classList.add('hidden'); el.dataset.key = ''; return; }
    const key = p.title + p.sub; if (el.dataset.key !== key) { el.innerHTML = `<span class="key">F</span><div><strong>${esc(p.title)}</strong><small>${esc(p.sub)}</small></div>`; el.dataset.key = key; el.classList.remove('hidden'); }
    el.style.left = p.x + 'px'; el.style.top = (p.y - 14) + 'px';
  }
  speech(s: {x: number; y: number; name: string; text: string} | null, ms = 3200) {
    const el = this.$('.speech'); if (!s) { el.classList.add('hidden'); return; }
    el.innerHTML = `<b>${esc(s.name)}</b>${esc(s.text)}`; el.classList.remove('hidden'); this.placeSpeech(s.x, s.y);
    clearTimeout(this.speechTimer); this.speechTimer = window.setTimeout(() => el.classList.add('hidden'), ms);
  }
  placeSpeech(x: number, y: number) { const el = this.$('.speech'); el.style.left = x + 'px'; el.style.top = (y - 12) + 'px'; }
  get speaking() { return !this.$('.speech').classList.contains('hidden'); }
  toast(text: string, ms = 2600) { const el = this.$('.toast'); el.textContent = text; el.classList.add('show'); clearTimeout(this.toastTimer); this.toastTimer = window.setTimeout(() => el.classList.remove('show'), ms); }
}
