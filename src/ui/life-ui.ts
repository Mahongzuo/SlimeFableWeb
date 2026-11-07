import type {LifeData} from '../life/state';
import {ITEMS, type ItemKind} from '../life/catalog';
/** Small DOM pieces for the casual loops, in the same storybook style as game-ui (classes live in ui.css). */
export class LifeUI {
  private root: HTMLElement; private coins: HTMLElement; private fish: HTMLElement;
  constructor() {
    this.root = document.createElement('div'); this.root.id = 'life-ui';
    this.root.innerHTML = `<div class="coins card grain">🐚 <b>0</b><small>贝壳</small></div>
      <div class="dex card grain hidden"></div>
      <div class="fishing card grain hidden"><div class="fish-title">甩竿…</div><div class="fish-meter"><i class="green"></i><i class="needle"></i></div><div class="fish-progress"><i></i></div><div class="fish-help"></div></div>`;
    document.body.appendChild(this.root);
    this.coins = this.root.querySelector('.coins b')!; this.fish = this.root.querySelector('.fishing')!;
  }
  show(on: boolean) { this.root.classList.toggle('hidden', !on); if (!on) this.dex(null); }
  get dexOpen() { return !this.root.querySelector('.dex')!.classList.contains('hidden'); }
  /** Collection book + bag: everything caught, grown or cooked; unknown entries stay as silhouettes. */
  dex(life: LifeData | null) {
    const el = this.root.querySelector('.dex') as HTMLElement; el.classList.toggle('hidden', !life); if (!life) return;
    const sections: [ItemKind, string, string][] = [['crop', '收成', '在梯田里种出来'], ['fish', '鱼', '镜湖码头和湖边都能钓'], ['critter', '小动物', '摊开身体（C）悄悄靠近']];
    const found = (k: ItemKind) => Object.values(ITEMS).filter(i => i.kind === k && life.dex[i.id]).length, all = (k: ItemKind) => Object.values(ITEMS).filter(i => i.kind === k).length;
    el.innerHTML = `<header><h2>图鉴</h2><span>🐚 ${life.coins} · <span class="key">B</span> 合上</span></header>` + sections.map(([k, title, hint]) => `<section><h3>${title} <small>${found(k)} / ${all(k)} · ${hint}</small></h3><div class="grid">${Object.values(ITEMS).filter(i => i.kind === k).map(i => {
      const e = life.dex[i.id], n = life.bag[i.id] ?? 0;
      return e ? `<div class="cell" title="${i.desc}"><b>${i.icon}</b><span>${i.name}</span><small>${k === 'fish' && e.best ? `最大 ${e.best} cm` : `×${e.n}`}${n ? ` · 背包 ${n}` : ''}</small></div>` : `<div class="cell unknown"><b>？</b><span>？？？</span><small>&nbsp;</small></div>`;
    }).join('')}</div></section>`).join('') + (() => { const seeds = Object.entries(life.bag).filter(([id]) => ITEMS[id]?.kind === 'seed' || ITEMS[id]?.kind === 'bait' || ITEMS[id]?.kind === 'food'); return seeds.length ? `<section><h3>背包</h3><div class="grid">${seeds.map(([id, n]) => `<div class="cell"><b>${ITEMS[id].icon}</b><span>${ITEMS[id].name}</span><small>×${n}</small></div>`).join('')}</div></section>` : ''; })();
  }
  refresh(life: LifeData) { const t = String(life.coins); if (this.coins.textContent !== t) { this.coins.textContent = t; this.coins.parentElement!.classList.remove('bump'); void (this.coins.parentElement as HTMLElement).offsetWidth; this.coins.parentElement!.classList.add('bump'); } }
  fishing(state: {title: string; help: string; tension?: number; progress?: number; green?: [number, number]; alarm?: boolean} | null) {
    this.fish.classList.toggle('hidden', !state); if (!state) return;
    (this.fish.querySelector('.fish-title') as HTMLElement).textContent = state.title;
    (this.fish.querySelector('.fish-help') as HTMLElement).innerHTML = state.help;
    const meter = this.fish.querySelector('.fish-meter') as HTMLElement, reel = state.tension !== undefined;
    meter.style.visibility = reel ? 'visible' : 'hidden'; (this.fish.querySelector('.fish-progress') as HTMLElement).style.visibility = reel ? 'visible' : 'hidden';
    if (!reel) return;
    const g = state.green ?? [.25, .8], green = meter.querySelector('.green') as HTMLElement;
    green.style.left = g[0] * 100 + '%'; green.style.width = (g[1] - g[0]) * 100 + '%';
    (meter.querySelector('.needle') as HTMLElement).style.left = Math.min(100, state.tension! * 100) + '%';
    meter.classList.toggle('alarm', !!state.alarm);
    (this.fish.querySelector('.fish-progress i') as HTMLElement).style.width = Math.min(100, (state.progress ?? 0) * 100) + '%';
  }
}
