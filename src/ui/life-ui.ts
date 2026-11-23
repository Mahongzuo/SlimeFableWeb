import {ensureHome, type LifeData} from '../life/state';
import {ITEMS, type ItemKind} from '../life/catalog';
import {ensureDailyHomeTasks, nextLevelXp} from '../life/unlocks';
import {evaluateHabitats} from '../life/habitat';
import {packThumbUrl} from '../home/model-pack';

/** Small DOM pieces for the casual loops + Home Journal & Habitat Visitors book (classes live in ui.css). */
export class LifeUI {
  private root: HTMLElement; private coins: HTMLElement; private fish: HTMLElement;
  private dexTab: 'home' | 'dex' = 'home';
  private currentLife: LifeData | null = null;
  private currentDayKey = new Date().toISOString().slice(0, 10);

  constructor() {
    this.root = document.createElement('div'); this.root.id = 'life-ui';
    this.root.innerHTML = `<div class="coins card grain">🐚 <b>0</b><small>贝壳</small></div>
      <div class="dex card grain hidden"></div>
      <div class="fishing card grain hidden"><div class="fish-title">甩竿…</div><div class="fish-meter"><i class="green"></i><i class="needle"></i></div><div class="fish-progress"><i></i></div><div class="fish-help"></div></div>`;
    document.body.appendChild(this.root);
    this.coins = this.root.querySelector('.coins b')!; this.fish = this.root.querySelector('.fishing')!;
    this.root.addEventListener('click', e => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-dextab]');
      if (!t || !this.currentLife) return;
      this.dexTab = t.dataset.dextab as 'home' | 'dex';
      this.renderDex();
    });
  }

  show(on: boolean) { this.root.classList.toggle('hidden', !on); if (!on) this.dex(null); }
  get dexOpen() { return !this.root.querySelector('.dex')!.classList.contains('hidden'); }

  /** Collection book + bag + Home Journal & Habitat Visitors. */
  dex(life: LifeData | null, dayKey?: string) {
    this.currentLife = life;
    if (dayKey) this.currentDayKey = dayKey;
    const el = this.root.querySelector('.dex') as HTMLElement;
    el.classList.toggle('hidden', !life);
    if (!life) return;
    this.renderDex();
  }

  private renderDex() {
    const life = this.currentLife;
    if (!life) return;
    const el = this.root.querySelector('.dex') as HTMLElement;
    const home = ensureHome(life);
    const nextXp = nextLevelXp(home.level);
    const tasks = ensureDailyHomeTasks(life, this.currentDayKey);
    const habitats = evaluateHabitats(life);
    const metCount = habitats.filter(h => !!home.visitors[h.species.id]).length;

    const header = `<header>
      <div class="dex-tabs">
        <button class="d-tab ${this.dexTab === 'home' ? 'on' : ''}" data-dextab="home">🏡 家园手账 &amp; 来客</button>
        <button class="d-tab ${this.dexTab === 'dex' ? 'on' : ''}" data-dextab="dex">📖 农鱼图鉴 &amp; 背包</button>
      </div>
      <span>Lv.${home.level} · 🐚 ${life.coins} · <span class="key">B</span> 合上</span>
    </header>`;

    if (this.dexTab === 'home') {
      const pct = nextXp ? Math.min(100, Math.round((home.xp / nextXp) * 100)) : 100;
      const journal = `<section class="home-journal">
        <div class="lv-bar">
          <div><strong>家园繁荣度 · Lv.${home.level}</strong><small>${nextXp ? `距 Lv.${home.level + 1} 还差 ${Math.max(0, nextXp - home.xp)} 繁荣（解锁更多建筑与预设）` : '已达满级 · 全部蓝图已解锁！'}</small></div>
          <div class="bar-track"><i style="width:${pct}%"></i></div>
        </div>
        <h3>今日家园手账 <small>全部完成额外奖励 20 🐚 + 30 繁荣 · 按 <span class="key">V</span> 开启建造</small></h3>
        <div class="task-list">${tasks.map(t => `<div class="task-row ${t.done ? 'done' : ''}">
          <span>${t.done ? '✓' : '◆'} ${t.title}</span>
          <b>${t.progress} / ${t.target} · +${t.rewardCoins}🐚</b>
        </div>`).join('')}</div>
      </section>`;

      const habSec = `<section>
        <h3>栖地来访小动物 <small>已结识 ${metCount} / ${habitats.length} · 摆放对应建筑与植物即可吸引它们漫步家园</small></h3>
        <div class="habitat-grid">${habitats.map(h => {
          const rec = home.visitors[h.species.id];
          const stateText = rec ? `已到访 ×${rec.count}${rec.fed ? ` · 投喂 ${rec.fed}` : ''}` : h.ready ? '✨ 正在家园漫步！快去找它按 F' : h.species.requirementText;
          return `<div class="hab-card ${rec ? 'met' : h.ready ? 'ready' : ''}">
            <img src="${packThumbUrl(h.species.asset)}" alt="${h.species.name}" loading="lazy"/>
            <div>
              <b>${h.species.icon} ${h.species.name}</b>
              <small>${stateText}</small>
              <div class="hab-checks">${h.checks.map(c => `<i class="${c.met ? 'ok' : ''}">${c.met ? '✓' : '○'} ${c.label}</i>`).join('')}</div>
            </div>
          </div>`;
        }).join('')}</div>
      </section>`;

      el.innerHTML = header + journal + habSec;
      return;
    }

    const sections: [ItemKind, string, string][] = [
      ['crop', '收成与稀缺花卉', '在梯田里种出来（火暖阳 / 风授粉可变异）'],
      ['fish', '鱼', '镜湖码头和湖边都能钓'],
      ['critter', '野外小动物', '摊开身体（C）悄悄靠近'],
    ];
    const found = (k: ItemKind) => Object.values(ITEMS).filter(i => i.kind === k && life.dex[i.id]).length;
    const all = (k: ItemKind) => Object.values(ITEMS).filter(i => i.kind === k).length;
    el.innerHTML = header + sections.map(([k, title, hint]) => `<section><h3>${title} <small>${found(k)} / ${all(k)} · ${hint}</small></h3><div class="grid">${Object.values(ITEMS).filter(i => i.kind === k).map(i => {
      const e = life.dex[i.id], n = life.bag[i.id] ?? 0;
      return e ? `<div class="cell" title="${i.desc}"><b>${i.icon}</b><span>${i.name}</span><small>${k === 'fish' && e.best ? `最大 ${e.best} cm` : `×${e.n}`}${n ? ` · 背包 ${n}` : ''}</small></div>` : `<div class="cell unknown"><b>？</b><span>？？？</span><small>&nbsp;</small></div>`;
    }).join('')}</div></section>`).join('') + (() => {
      const bag = Object.entries(life.bag).filter(([id]) => ITEMS[id]?.kind === 'seed' || ITEMS[id]?.kind === 'bait' || ITEMS[id]?.kind === 'food');
      return bag.length ? `<section><h3>背包</h3><div class="grid">${bag.map(([id, n]) => `<div class="cell"><b>${ITEMS[id].icon}</b><span>${ITEMS[id].name}</span><small>×${n}</small></div>`).join('')}</div></section>` : '';
    })();
  }

  refresh(life: LifeData) {
    const t = String(life.coins);
    if (this.coins.textContent !== t) {
      this.coins.textContent = t;
      this.coins.parentElement!.classList.remove('bump');
      void (this.coins.parentElement as HTMLElement).offsetWidth;
      this.coins.parentElement!.classList.add('bump');
    }
  }

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
