import {ensureHome, type LifeData} from '../life/state';
import {ITEMS, RECIPES, type ItemKind} from '../life/catalog';
import {ensureDailyHomeTasks, nextLevelXp} from '../life/unlocks';
import {evaluateHabitats} from '../life/habitat';
import {packThumbUrl} from '../home/model-pack';
import {donateToMuseum, museumSummary, type MuseumHallId} from '../life/museum';
import {RANCH_SPECIES, adoptRanchAnimal, animalHearts, ranchCapacity} from '../life/ranch';
import {ARTISAN_RECIPES, MACHINE_NAMES, sellItem} from '../life/artisan';
import {FOOD_BUFFS, eatFood, getActiveBuffs} from '../life/cooking';
import {ROD_TIERS, upgradeFishingRod} from '../life/fishing';
import {getDailyHistoryBlessing} from '../life/daily-history-link';
import type {DetectedPasturePen} from '../home/voxel-mesher';

export type JournalTab = 'home' | 'museum' | 'ranch' | 'artisan' | 'dex';

export interface LifeUIContext {
  souvenirCount: number;
  mmdd: string;
  voxelPens: DetectedPasturePen[];
  onMutate: () => void;
  toast: (msg: string, ms?: number) => void;
}

/** Storybook HUD for Coins, Stardew Fishing Meter, and 5-Tab Home Journal (Tasks/Museum/Ranch/Market/Dex). */
export class LifeUI {
  private root: HTMLElement;
  private coins: HTMLElement;
  private fish: HTMLElement;
  private dexTab: JournalTab = 'home';
  private currentLife: LifeData | null = null;
  private currentDayKey = new Date().toISOString().slice(0, 10);
  private ctxInfo: LifeUIContext = {
    souvenirCount: 0,
    mmdd: `${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`,
    voxelPens: [],
    onMutate: () => {},
    toast: () => {},
  };

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'life-ui';
    this.root.innerHTML = `<div class="coins card grain">🐚 <b>0</b><small>贝壳</small></div>
      <div class="dex card grain hidden"></div>
      <div class="fishing card grain hidden"><div class="fish-title">甩竿…</div><div class="fish-meter"><i class="green"></i><i class="needle"></i><span class="fish-marker hidden">🐟</span><span class="fish-treasure hidden">🎁</span></div><div class="fish-progress"><i></i></div><div class="fish-help"></div></div>`;
    document.body.appendChild(this.root);
    this.coins = this.root.querySelector('.coins b')!;
    this.fish = this.root.querySelector('.fishing')!;
    this.root.addEventListener('click', e => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-dextab],[data-donate],[data-adopt],[data-sell],[data-eat],[data-upgraderod],[data-buybait]');
      if (!t || !this.currentLife) return;
      const life = this.currentLife;
      if (t.dataset.dextab) {
        this.dexTab = t.dataset.dextab as JournalTab;
        this.renderDex();
        return;
      }
      if (t.dataset.donate) {
        const [hallId, slotId] = t.dataset.donate.split(':');
        const res = donateToMuseum(life, hallId as MuseumHallId, slotId, {souvenirCount: this.ctxInfo.souvenirCount});
        if (res.ok) {
          this.ctxInfo.toast(res.hallRestored ? `🎉 展厅全面修复！获得 ${res.rewardCoins} 🐚 与永久港湾奇迹祝福！` : `✦ 捐献成功！获赠 ${res.rewardCoins} 🐚 与繁荣经验`, 3800);
          this.ctxInfo.onMutate();
          this.refresh(life);
          this.renderDex();
        }
        return;
      }
      if (t.dataset.adopt) {
        const res = adoptRanchAnimal(life, t.dataset.adopt, undefined, this.ctxInfo.voxelPens);
        if (res.ok && res.animal) {
          this.ctxInfo.toast(`🐾 欢迎新伙伴「${res.animal.name}」入住牧场！快去牧场找它抚摸收获吧`, 3400);
          this.ctxInfo.onMutate();
          this.refresh(life);
          this.renderDex();
        } else if (res.reason) {
          this.ctxInfo.toast(res.reason, 3000);
        }
        return;
      }
      if (t.dataset.sell) {
        const qty = Number(t.dataset.qty ?? 1) || 1;
        const res = sellItem(life, t.dataset.sell, qty);
        if (res.ok) {
          this.ctxInfo.toast(`🐚 售出 ${ITEMS[t.dataset.sell]?.name ?? ''} ×${qty}，赚得 ${res.earned} 🐚`, 2200);
          this.ctxInfo.onMutate();
          this.refresh(life);
          this.renderDex();
        }
        return;
      }
      if (t.dataset.eat) {
        const res = eatFood(life, t.dataset.eat);
        if (res.ok && res.buff) {
          this.ctxInfo.toast(`🍽️ 享用了美食！获得 15 分钟祝福：${res.buff.label}`, 3200);
          this.ctxInfo.onMutate();
          this.renderDex();
        }
        return;
      }
      if (t.dataset.upgraderod !== undefined) {
        const res = upgradeFishingRod(life);
        if (res.ok) {
          const rod = ROD_TIERS.find(r => r.tier === res.tier);
          this.ctxInfo.toast(`🎣 钓竿已升级为「${rod?.name}」！`, 3200);
          this.ctxInfo.onMutate();
          this.refresh(life);
          this.renderDex();
        } else if (res.reason) {
          this.ctxInfo.toast(res.reason, 2600);
        }
        return;
      }
      if (t.dataset.buybait) {
        const bait = ITEMS[t.dataset.buybait];
        if (bait && life.coins >= bait.price * 3) {
          life.coins -= bait.price * 3;
          life.bag[bait.id] = (life.bag[bait.id] ?? 0) + 3;
          this.ctxInfo.toast(`🪱 购入 ${bait.icon}${bait.name} ×3`, 2000);
          this.ctxInfo.onMutate();
          this.refresh(life);
          this.renderDex();
        } else {
          this.ctxInfo.toast('贝壳不足', 1800);
        }
      }
    });
  }

  show(on: boolean) { this.root.classList.toggle('hidden', !on); if (!on) this.dex(null); }
  get dexOpen() { return !this.root.querySelector('.dex')!.classList.contains('hidden'); }

  openTab(tab: JournalTab, life: LifeData, dayKey?: string, ctx?: Partial<LifeUIContext>) {
    this.dexTab = tab;
    this.dex(life, dayKey, ctx);
  }

  dex(life: LifeData | null, dayKey?: string, ctx?: Partial<LifeUIContext>) {
    this.currentLife = life;
    if (dayKey) this.currentDayKey = dayKey;
    if (ctx) this.ctxInfo = {...this.ctxInfo, ...ctx};
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
    const buffs = getActiveBuffs(life);

    const header = `<header>
      <div class="dex-tabs">
        <button class="d-tab ${this.dexTab === 'home' ? 'on' : ''}" data-dextab="home">🏡 手账 &amp; 来客</button>
        <button class="d-tab ${this.dexTab === 'museum' ? 'on' : ''}" data-dextab="museum">🏛️ 时光博物苑</button>
        <button class="d-tab ${this.dexTab === 'ranch' ? 'on' : ''}" data-dextab="ranch">🦌 稀兽 &amp; 牧场</button>
        <button class="d-tab ${this.dexTab === 'artisan' ? 'on' : ''}" data-dextab="artisan">🍳 工坊集市</button>
        <button class="d-tab ${this.dexTab === 'dex' ? 'on' : ''}" data-dextab="dex">📖 全图鉴</button>
      </div>
      <span>Lv.${home.level} · 🐚 ${life.coins} · <span class="key">B</span> 合上</span>
    </header>`;

    if (this.dexTab === 'home') {
      const tasks = ensureDailyHomeTasks(life, this.currentDayKey);
      const habitats = evaluateHabitats(life);
      const metCount = habitats.filter(h => !!home.visitors[h.species.id]).length;
      const pct = nextXp ? Math.min(100, Math.round((home.xp / nextXp) * 100)) : 100;
      const blessing = getDailyHistoryBlessing(this.ctxInfo.mmdd);
      const buffHtml = buffs.length
        ? `<div class="buff-strip">${buffs.map(b => `<span class="buff-pill">${b.label} · 余 ${Math.max(1, Math.ceil((b.until - Date.now()) / 60_000))}m</span>`).join('')}</div>`
        : '';

      const journal = `<section class="home-journal">
        <div class="blessing-card">
          <b>${blessing.icon} 今日史事风物祝福 · ${blessing.title}${blessing.featuredYear ? `（${blessing.featuredYear} · ${blessing.featuredTitle}）` : ''}</b>
          ${blessing.desc}
        </div>
        ${buffHtml}
        <div class="lv-bar">
          <div><strong>家园繁荣度 · Lv.${home.level}</strong><small>${nextXp ? `距 Lv.${home.level + 1} 还差 ${Math.max(0, nextXp - home.xp)} 繁荣` : '已达满级 · 全部蓝图已解锁！'}</small></div>
          <div class="bar-track"><i style="width:${pct}%"></i></div>
        </div>
        <h3>今日家园手账 <small>全完成额外奖 20🐚 + 30 繁荣 · 按 <span class="key">V</span> 开启工坊与积木建造</small></h3>
        <div class="task-list">${tasks.map(t => `<div class="task-row ${t.done ? 'done' : ''}">
          <span>${t.done ? '✓' : '◆'} ${t.title}</span>
          <b>${t.progress} / ${t.target} · +${t.rewardCoins}🐚</b>
        </div>`).join('')}</div>
      </section>`;

      const habSec = `<section>
        <h3>栖地来访小动物 <small>已结识 ${metCount} / ${habitats.length}</small></h3>
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

    if (this.dexTab === 'museum') {
      const sum = museumSummary(life, {souvenirCount: this.ctxInfo.souvenirCount});
      el.innerHTML = header + `<section>
        <h3>凝露港 · 时光博物苑 <small>已修复 ${sum.restoredHalls}/${sum.totalHalls} 座展厅 · 累计捐献 ${sum.donatedSlots}/${sum.totalSlots} 项 · 修复展厅永久强化全港玩法</small></h3>
        <div class="museum-grid">${sum.halls.map(h => `<div class="museum-hall ${h.restored ? 'done' : ''}">
          <header><b>${h.hall.icon} ${h.hall.name}</b><span class="chip ${h.restored ? 'sea' : 'mute'}">${h.restored ? '✓ 已修复' : `${h.doneCount}/${h.hall.slots.length}`}</span></header>
          <small>${h.hall.subtitle}</small>
          <div class="museum-slots">${h.slots.map(s => `<div class="museum-slot ${s.done ? 'ok' : ''}">
            <span>${s.done ? '✓' : s.itemIcon} ${s.slot.label}</span>
            ${s.done ? '<b>已入藏</b>' : s.canDonate
              ? `<button class="btn small primary" data-donate="${h.hall.id}:${s.slot.id}">捐献</button>`
              : `<small>${s.progress}</small>`}
          </div>`).join('')}</div>
          <div class="hall-reward">🎁 修复奖励：${h.hall.rewardTitle} — ${h.hall.rewardDesc}</div>
        </div>`).join('')}</div>
      </section>`;
      return;
    }

    if (this.dexTab === 'ranch') {
      const ranch = home.ranch!;
      const cap = ranchCapacity(life, this.ctxInfo.voxelPens);
      const ownedHtml = ranch.animals.length
        ? `<div class="market-grid">${ranch.animals.map(a => {
            const sp = RANCH_SPECIES.find(s => s.id === a.speciesId);
            const prod = sp ? ITEMS[sp.productId] : null;
            return `<div class="market-card">
              <div class="m-row"><b>${sp?.icon ?? '🐾'} ${a.name}</b><span>❤️ ${animalHearts(a)}/5</span></div>
              <small>心情 ${a.mood}% · 每日产出 ${prod?.icon ?? ''}${prod?.name ?? ''}${a.following ? ' · 👣跟随中' : ''}</small>
            </div>`;
          }).join('')}</div>`
        : `<p style="font-size:13px;color:var(--ink-2)">还没有收养动物。先去家园野外寻找发光光环的稀兽，按 C 潜行靠近或投喂喜爱食物结识它们，即可在此收养！</p>`;

      const speciesHtml = `<div class="habitat-grid">${RANCH_SPECIES.map(sp => {
        const unlocked = ranch.discovered.includes(sp.id) || (sp.tier === 'common' && Object.keys(home.visitors).some(v => v.includes(sp.id.replace('ranch-', ''))));
        const prod = ITEMS[sp.productId];
        const fav = ITEMS[sp.favoriteItem];
        return `<div class="hab-card ${unlocked ? 'met' : ''}">
          <img src="${packThumbUrl(sp.asset)}" alt="${sp.name}" loading="lazy"/>
          <div>
            <b>${sp.icon} ${sp.name} ${sp.tier === 'legendary' ? '★传说' : sp.tier === 'rare' ? '◆稀有' : ''}</b>
            <small>产出：${prod?.icon ?? ''}${prod?.name ?? ''} · 喜食：${fav?.name ?? ''}</small>
            ${unlocked
              ? `<button class="btn small primary" data-adopt="${sp.id}" ${life.coins < sp.adoptCost || ranch.animals.length >= cap.total ? 'disabled' : ''}>收养入住 · 🐚${sp.adoptCost}</button>`
              : `<small style="color:var(--stamp)">野外遭遇解锁（${sp.zones.join('/')}）</small>`}
          </div>
        </div>`;
      }).join('')}</div>`;

      el.innerHTML = header + `<section>
        <div class="ranch-bar">
          <span>🏡 牧场容量：<b>${ranch.animals.length} / ${cap.total}</b></span>
          <span>基础 ${cap.base} + 牧舍/鹿苑 ${cap.buildings} + 🧱自建围栏牧场 +${cap.voxelFenceBonus}（识别 ${this.ctxInfo.voxelPens.length} 圈）</span>
        </div>
        <h3>我的牧场伙伴 <small>靠近动物按 F 收获产物、轻抚喂食或让它跟随你散步</small></h3>
        ${ownedHtml}
        <h3>生态物种与收养名录 <small>已野外结识 ${ranch.discovered.length} / ${RANCH_SPECIES.length}</small></h3>
        ${speciesHtml}
      </section>`;
      return;
    }

    if (this.dexTab === 'artisan') {
      const rodTier = home.fishing?.rodTier ?? 1;
      const curRod = ROD_TIERS.find(r => r.tier === rodTier) ?? ROD_TIERS[0];
      const nextRod = ROD_TIERS.find(r => r.tier === rodTier + 1);
      const sellable = Object.entries(life.bag)
        .filter(([id, n]) => n > 0 && ITEMS[id] && ITEMS[id].price > 0 && !['seed', 'bait', 'critter'].includes(ITEMS[id].kind))
        .sort((a, b) => ITEMS[b[0]].price - ITEMS[a[0]].price);

      const marketHtml = sellable.length
        ? `<div class="market-grid">${sellable.map(([id, n]) => {
            const it = ITEMS[id];
            const isFood = it.kind === 'food' && !!FOOD_BUFFS[id];
            return `<div class="market-card">
              <div class="m-row"><b>${it.icon} ${it.name} ×${n}</b><span>🐚${it.price}</span></div>
              <div class="m-row">
                <button class="btn small" data-sell="${id}" data-qty="1">卖1</button>
                ${n > 1 ? `<button class="btn small" data-sell="${id}" data-qty="${n}">全卖(${it.price * n}🐚)</button>` : ''}
                ${isFood ? `<button class="btn small primary" data-eat="${id}">🍽️ 食用</button>` : ''}
              </div>
            </div>`;
          }).join('')}</div>`
        : `<p style="font-size:13px;color:var(--ink-2)">背包暂无可售农产、手工制品或料理。先去收菜、钓鱼或启动工坊 POI 吧！</p>`;

      const recipePreview = ARTISAN_RECIPES.slice(0, 12).map(r =>
        `<div class="task-row"><span>${MACHINE_NAMES[r.machine].icon} ${r.name}（${ITEMS[r.inputId]?.name}×${r.inputCount}）</span><b>→ ${ITEMS[r.outputId]?.icon}${ITEMS[r.outputId]?.name} · 🐚${ITEMS[r.outputId]?.price}</b></div>`,
      ).join('');

      el.innerHTML = header + `<section>
        <h3>🎣 钓具升级与特种鱼饵</h3>
        <div class="ranch-bar">
          <span>当前钓竿：<b>${curRod.name}</b>（${curRod.desc}）</span>
          ${nextRod ? `<button class="btn small primary" data-upgraderod ${life.coins < nextRod.price ? 'disabled' : ''}>升级 ${nextRod.name} · 🐚${nextRod.price}</button>` : '<span class="chip sea">已满级</span>'}
          <button class="btn small" data-buybait="bait-element">买元素香饵×3 · 🐚24</button>
          <button class="btn small" data-buybait="bait-chronicle">买年轮饵×3 · 🐚36</button>
        </div>
        <h3>🧺 港湾集市 &amp; 享用料理 Buff <small>食用料理可获 15 分钟强力生活祝福；手工制品售价是原产的 2.5~4 倍</small></h3>
        ${marketHtml}
        <h3>⚙️ 手工工坊核心配方速查 <small>共 ${ARTISAN_RECIPES.length} 种工坊加工 + ${RECIPES.length} 道料理</small></h3>
        <div class="task-list">${recipePreview}</div>
      </section>`;
      return;
    }

    const sections: [ItemKind, string, string][] = [
      ['crop', '收成与稀缺花卉', '梯田与自建农田培育（支持元素刀光反应）'],
      ['artisan', '手工工坊制品', '水磨坊 / 茶坊 / 酿造桶 / 窑炉 / 蜂箱 / 腌渍缸 / 织布机'],
      ['animal_product', '牧场与鱼塘产出', '收养动物每日馈赠与生态鱼塘鱼籽'],
      ['fish', '生态鱼类与四季鱼王', '水巷 / 镜湖 / 溪涧 / 海岬四大水域（共 28 种）'],
      ['relic', '历史打捞遗物', '水底宝箱与灯塔漂流瓶所得，可捐入时光博物苑'],
      ['critter', '野外小动物与稀兽', '摊开潜行（C）或野外遭遇结识'],
    ];
    const found = (k: ItemKind) => Object.values(ITEMS).filter(i => i.kind === k && life.dex[i.id]).length;
    const all = (k: ItemKind) => Object.values(ITEMS).filter(i => i.kind === k).length;
    el.innerHTML = header + sections.map(([k, title, hint]) => `<section><h3>${title} <small>${found(k)} / ${all(k)} · ${hint}</small></h3><div class="grid">${Object.values(ITEMS).filter(i => i.kind === k).map(i => {
      const e = life.dex[i.id], n = life.bag[i.id] ?? 0;
      return e ? `<div class="cell" title="${i.desc}"><b>${i.icon}</b><span>${i.name}</span><small>${k === 'fish' && e.best ? `最大 ${e.best} cm` : `×${e.n}`}${n ? ` · 背包 ${n}` : ''}</small></div>` : `<div class="cell unknown"><b>？</b><span>？？？</span><small>&nbsp;</small></div>`;
    }).join('')}</div></section>`).join('');
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

  fishing(state: {
    title: string;
    help: string;
    tension?: number;
    progress?: number;
    green?: [number, number];
    alarm?: boolean;
    stardew?: boolean;
    treasure?: {pos: number; progress: number; claimed: boolean};
  } | null) {
    this.fish.classList.toggle('hidden', !state); if (!state) return;
    (this.fish.querySelector('.fish-title') as HTMLElement).textContent = state.title;
    (this.fish.querySelector('.fish-help') as HTMLElement).innerHTML = state.help;
    const meter = this.fish.querySelector('.fish-meter') as HTMLElement, reel = state.tension !== undefined;
    meter.style.visibility = reel ? 'visible' : 'hidden';
    (this.fish.querySelector('.fish-progress') as HTMLElement).style.visibility = reel ? 'visible' : 'hidden';
    if (!reel) return;
    const g = state.green ?? [.25, .8], green = meter.querySelector('.green') as HTMLElement;
    green.style.left = g[0] * 100 + '%'; green.style.width = (g[1] - g[0]) * 100 + '%';
    const needle = meter.querySelector('.needle') as HTMLElement;
    const fishMark = meter.querySelector('.fish-marker') as HTMLElement;
    const trMark = meter.querySelector('.fish-treasure') as HTMLElement;
    if (state.stardew) {
      needle.style.display = 'none';
      fishMark.classList.remove('hidden');
      fishMark.style.left = Math.min(98, Math.max(2, state.tension! * 100)) + '%';
      if (state.treasure) {
        trMark.classList.remove('hidden');
        trMark.style.left = Math.min(96, Math.max(4, state.treasure.pos * 100)) + '%';
        trMark.classList.toggle('got', state.treasure.claimed);
        trMark.textContent = state.treasure.claimed ? '✨' : '🎁';
      } else {
        trMark.classList.add('hidden');
      }
    } else {
      needle.style.display = '';
      fishMark.classList.add('hidden');
      trMark.classList.add('hidden');
      needle.style.left = Math.min(100, state.tension! * 100) + '%';
    }
    meter.classList.toggle('alarm', !!state.alarm);
    (this.fish.querySelector('.fish-progress i') as HTMLElement).style.width = Math.min(100, (state.progress ?? 0) * 100) + '%';
  }
}
