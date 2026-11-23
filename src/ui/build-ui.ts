import {BUILD_CATALOG, HOME_PRESETS, type BuildCategory} from '../home/build-catalog';
import {ensureHome, type ExpansionThemeId, type LifeData} from '../life/state';
import {isBuildItemUnlocked, isPresetUnlocked, nextLevelXp} from '../life/unlocks';
import {buySeed, shopSeedList} from '../life/cultivation';
import {CROP_META, CROPS, ITEMS, type CropCategory} from '../life/catalog';
import {
  computeDynamicFrontier,
  EXPANSION_COST_CAP,
  EXPANSION_THEME_LIST,
  expansionCost,
  resolveExpansionSlot,
} from '../world/expansion';

export interface BuildUIHandlers {
  selectItem(id: string): void;
  toggleDemolish(): void;
  applyPreset(id: string): void;
  setExpandMode(on: boolean): void;
  selectFrontierSlot(slotId: string): void;
  selectExpansionTheme(theme: ExpansionThemeId): void;
  toggleSandboxFreeExpand(): void;
  confirmExpand(): void;
  exit(): void;
}

export interface BuildUIState {
  selectedId: string;
  demolish: boolean;
  expandMode: boolean;
  selectedSlotId: string | null;
  selectedTheme: ExpansionThemeId;
  frontierFocus?: [number, number];
}

type DockTab = BuildCategory | 'preset' | 'expand';

const CATS: [DockTab, string][] = [
  ['farm', '🌱 农田'],
  ['house', '🏡 建筑'],
  ['plant', '🌿 庭院植物'],
  ['facility', '⛲ 设施'],
  ['preset', '✨ 景组'],
  ['expand', '🗺️ 扩建领土'],
];

const SHOP_CATS: [CropCategory | 'all', string][] = [
  ['all', '全部'],
  ['veg', '蔬果'],
  ['fruit', '瓜果'],
  ['grain', '谷茶'],
  ['flower', '花卉'],
  ['special', '元素特产'],
];

const EL_BADGES = ['💧水', '🍃风', '🔥火', '⚡雷', '🌑暗', '🪨物'] as const;

/** Storybook-styled bottom build dock + DreamWorld territory expansion bar + UE Seed Shop & Seed Picker. */
export class BuildUI {
  readonly root: HTMLElement;
  private dock: HTMLElement;
  private shopEl: HTMLElement;
  private tab: DockTab = 'farm';
  private open = false;
  private shopOpen = false;
  private shopCat: CropCategory | 'all' = 'all';
  private lastLife: LifeData | null = null;
  private state: BuildUIState = {
    selectedId: '',
    demolish: false,
    expandMode: false,
    selectedSlotId: null,
    selectedTheme: 'farmland',
  };

  constructor(private h: BuildUIHandlers) {
    this.root = document.createElement('div');
    this.root.id = 'build-ui';
    this.root.innerHTML = `<div class="build-dock card grain hidden"></div><div class="seed-shop-wrap hidden"></div>`;
    document.body.appendChild(this.root);
    this.dock = this.root.querySelector('.build-dock')!;
    this.shopEl = this.root.querySelector('.seed-shop-wrap')!;

    this.dock.addEventListener('click', e => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act],[data-cat],[data-item],[data-preset],[data-slot],[data-theme]');
      if (!btn) return;
      if (btn.dataset.cat) {
        const nextTab = btn.dataset.cat as DockTab;
        this.tab = nextTab;
        if (nextTab === 'expand') this.h.setExpandMode(true);
        else if (this.state.expandMode) this.h.setExpandMode(false);
        this.render();
        return;
      }
      if (btn.dataset.item) { this.h.selectItem(btn.dataset.item); return; }
      if (btn.dataset.preset) { this.h.applyPreset(btn.dataset.preset); return; }
      if (btn.dataset.slot) { this.h.selectFrontierSlot(btn.dataset.slot); return; }
      if (btn.dataset.theme) { this.h.selectExpansionTheme(btn.dataset.theme as ExpansionThemeId); return; }
      if (btn.dataset.act === 'demolish') this.h.toggleDemolish();
      else if (btn.dataset.act === 'confirm-expand') this.h.confirmExpand();
      else if (btn.dataset.act === 'sandbox-expand') this.h.toggleSandboxFreeExpand();
      else if (btn.dataset.act === 'exit') this.h.exit();
    });
  }

  get isShopOpen() { return this.shopOpen; }

  show(on: boolean, life?: LifeData, nextState?: Partial<BuildUIState>) {
    this.open = on;
    if (life) this.lastLife = life;
    if (nextState) {
      this.state = {...this.state, ...nextState};
      if (nextState.expandMode) this.tab = 'expand';
    }
    this.dock.classList.toggle('hidden', !on);
    if (on) this.render();
  }

  render() {
    if (!this.open || !this.lastLife) return;
    const life = this.lastLife;
    const home = ensureHome(life);
    const nextXp = nextLevelXp(home.level);
    const tabs = CATS.map(([k, label]) =>
      `<button class="b-tab ${this.tab === k ? 'on' : ''}" data-cat="${k}">${label}</button>`,
    ).join('');

    let bodyHtml = '';
    if (this.tab === 'expand') {
      const focus = this.state.frontierFocus ?? [-30, 142];
      const frontier = computeDynamicFrontier(home.expansions, focus, 8);
      const sandboxOn = !!home.sandboxFreeExpand;
      const cost = expansionCost(home.expansions.length, sandboxOn);
      const selSlot = (this.state.selectedSlotId ? resolveExpansionSlot(this.state.selectedSlotId) : null) ?? frontier[0] ?? null;
      const slotsHtml = frontier.map(s =>
        `<button class="b-slot ${selSlot?.id === s.id ? 'sel' : ''}" data-slot="${s.id}"><b>${s.name}</b><small>${Math.round(s.max[0] - s.min[0])}×${Math.round(s.max[1] - s.min[1])}m</small></button>`,
      ).join('');
      const themesHtml = EXPANSION_THEME_LIST.map(th =>
        `<button class="b-theme ${this.state.selectedTheme === th.id ? 'sel' : ''}" data-theme="${th.id}" title="${th.desc}">
          <span>${th.icon} <b>${th.name}</b></span>
          <small>${th.desc}</small>
        </button>`,
      ).join('');
      const canAfford = life.coins >= cost;
      bodyHtml = `
        <div class="b-expand-wrap">
          <div class="b-expand-col">
            <div class="b-subhead">1. 点击地图绿色虚线边疆（已开垦 ${home.expansions.length} 块 · 无限蔓延，平移镜头刷新周边）</div>
            <div class="b-slot-row">${slotsHtml}</div>
          </div>
          <div class="b-expand-col">
            <div class="b-subhead">2. 选择地貌主题（任意接缝 0 闪烁，天然风物可吸引来客）</div>
            <div class="b-theme-row">${themesHtml}</div>
          </div>
          <div class="b-expand-cta">
            <div class="b-exp-summary">
              <b>${selSlot ? selSlot.name : '移动镜头选择边疆'}</b>
              <small>${sandboxOn ? '🏖️ 自由沙盒模式：免费无限开垦' : cost === 0 ? '🎁 首块免费 · 后续封顶 50🐚' : `开垦费用：🐚 ${cost}（封顶 ${EXPANSION_COST_CAP}🐚）`}</small>
            </div>
            <button class="btn primary" data-act="confirm-expand" ${!selSlot || !canAfford ? 'disabled' : ''}>
              ${!selSlot ? '请选择边疆' : cost === 0 ? '免费开垦此地' : `开垦领土 · 🐚 ${cost}`}
            </button>
            <button class="btn small ${sandboxOn ? 'primary' : ''}" data-act="sandbox-expand" title="切换零消耗自由无限扩建模式">
              ${sandboxOn ? '🏖️ 自由沙盒：已开' : '🏖️ 自由沙盒：关'}
            </button>
          </div>
        </div>`;
    } else if (this.tab === 'preset') {
      bodyHtml = `<div class="b-strip">${HOME_PRESETS.map(p => {
        const unlocked = isPresetUnlocked(life, p.id);
        return `<button class="b-preset ${unlocked ? '' : 'locked'}" data-preset="${p.id}">
          <strong>${p.name}</strong>
          <small>${p.subtitle}</small>
          <span class="b-price">${unlocked ? `🐚 ${p.discountPrice} 一键铺设` : `🔒 Lv.${p.unlockLevel} 解锁`}</span>
        </button>`;
      }).join('')}</div>`;
    } else {
      const list = BUILD_CATALOG.filter(i => i.category === this.tab);
      bodyHtml = `<div class="b-strip">${list.map(item => {
        const unlocked = isBuildItemUnlocked(life, item.id);
        const sel = !this.state.demolish && !this.state.expandMode && this.state.selectedId === item.id;
        const preview = item.thumb
          ? `<img src="${item.thumb}" alt="${item.name}" loading="lazy"/>`
          : `<span class="b-emoji">${item.icon}</span>`;
        const animalTag = item.attracts?.length
          ? `<span class="b-attract" title="吸引来客：${item.attracts.join('、')}">🐾 ${item.attracts[0]}</span>`
          : '';
        return `<button class="b-card ${sel ? 'sel' : ''} ${unlocked ? '' : 'locked'}" data-item="${item.id}" title="${item.desc}">
          ${animalTag}
          <div class="b-thumb">${preview}</div>
          <b>${item.name}</b>
          <small>${unlocked ? `🐚 ${item.price}` : `🔒 Lv.${item.unlockLevel}`}</small>
        </button>`;
      }).join('')}</div>`;
    }

    const footText = this.tab === 'expand'
      ? 'WASD 平移镜头 · 右键旋转 · 滚轮缩放 · 点击绿色虚线边疆地块并选好主题即可无缝扩建家园！'
      : 'WASD 平移镜头 · 右键旋转 · 滚轮远近 · <b>Q / E</b> 旋转物件 · <b>R</b> 切换缩放 · 左键摆放（农田放好即可种 32 种作物）';

    this.dock.innerHTML = `
      <div class="b-head">
        <div class="b-title">
          <strong>家园建造</strong>
          <span class="chip sea">Lv.${home.level}${nextXp ? ` · ${home.xp}/${nextXp} 繁荣` : ' · MAX'}</span>
          <span class="chip">🐚 ${life.coins}</span>
          <span class="chip mute">已建 ${home.placed.length} · 扩建 ${home.expansions.length}</span>
        </div>
        <div class="b-tabs">${tabs}</div>
        <div class="b-actions">
          <button class="btn small ${this.state.demolish ? 'primary' : ''}" data-act="demolish">${this.state.demolish ? '拆除中（点击回收）' : '拆除'}</button>
          <button class="btn small" data-act="exit">完成 <span class="key">V</span></button>
        </div>
      </div>
      ${bodyHtml}
      <div class="b-foot">${footText}</div>
    `;
  }

  /** Upgraded categorized Seed Shop supporting all 32 UE crops. */
  openSeedShop(life: LifeData, dayKey: string, onBought: (msg: string) => void, onClose: () => void) {
    this.shopOpen = true;
    this.shopEl.classList.remove('hidden');
    const draw = () => {
      const all = shopSeedList(life, dayKey);
      const filtered = this.shopCat === 'all' ? all : all.filter(s => s.category === this.shopCat);
      const catTabs = SHOP_CATS.map(([k, label]) =>
        `<button class="b-tab ${this.shopCat === k ? 'on' : ''}" data-scat="${k}">${label}</button>`,
      ).join('');
      this.shopEl.innerHTML = `<div class="overlay"><div class="seed-shop card grain">
        <header>
          <div><h2>🌱 家园种子铺（UE 作物大全）</h2><small>32 种作物各带元素偏好 · 火/水/雷攻击刀光会触发烧毁、冲毁、蒸汽或催熟反应</small></div>
          <div class="row"><span>🐚 ${life.coins}</span><button class="btn small" data-sclose>关上</button></div>
        </header>
        <div class="b-tabs shop-tabs">${catTabs}</div>
        <div class="seed-grid">${filtered.map(s => {
          const def = ITEMS[s.id];
          const owned = life.bag[s.id] ?? 0;
          const elTag = EL_BADGES[s.preferredElement] ?? '💧水';
          return `<div class="seed-item ${s.special ? 'special' : ''}">
            <div class="s-top">
              <b>${s.icon} ${s.name}</b>
              <span class="s-tags">
                <span class="chip mute">${elTag}</span>
                ${s.waterSensitive ? '<span class="chip warn">怕涝</span>' : ''}
                ${s.special ? '<span class="chip stamp">特供</span>' : ''}
              </span>
            </div>
            <small>${s.growMin}分钟成熟 · 售价 🐚${ITEMS[CROPS[s.id].crop]?.price ?? 0}${owned ? ` · 背包 ${owned}` : ''}</small>
            <div class="s-buy-row">
              <button class="btn small primary" data-buy="${s.id}" data-qty="1" ${life.coins < s.price ? 'disabled' : ''}>买1 · 🐚${s.price}</button>
              <button class="btn small" data-buy="${s.id}" data-qty="5" ${life.coins < s.price * 5 ? 'disabled' : ''}>买5 · 🐚${s.price * 5}</button>
            </div>
          </div>`;
        }).join('')}</div>
      </div></div>`;
    };
    draw();
    this.shopEl.onclick = (e: Event) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-buy],[data-sclose],[data-scat]');
      if (!t) return;
      if (t.dataset.scat) {
        this.shopCat = t.dataset.scat as CropCategory | 'all';
        draw();
        return;
      }
      if (t.dataset.sclose !== undefined) {
        this.closeSeedShop();
        onClose();
        return;
      }
      if (t.dataset.buy) {
        const qty = Number(t.dataset.qty ?? 1) || 1;
        const res = buySeed(life, t.dataset.buy, qty);
        if (res.ok) {
          onBought(`购入 ${ITEMS[t.dataset.buy].name} ×${qty} 🌱`);
          draw();
        }
      }
    };
  }

  /** UE USlimeSeedPickerWidget port: pick any seed from bag when interacting with an empty farm plot. */
  openSeedPicker(life: LifeData, onPick: (seedId: string) => void, onClose: () => void) {
    this.shopOpen = true;
    this.shopEl.classList.remove('hidden');
    const home = ensureHome(life);
    const ownedSeeds = Object.keys(life.bag)
      .filter(id => !!CROPS[id] && (life.bag[id] ?? 0) > 0)
      .sort((a, b) => CROPS[a].growMs - CROPS[b].growMs);
    const lastSeed = home.lastSeed && (life.bag[home.lastSeed] ?? 0) > 0 ? home.lastSeed : null;

    this.shopEl.innerHTML = `<div class="overlay"><div class="seed-shop seed-picker card grain">
      <header>
        <div><h2>🌱 选择要种下的作物</h2><small>点击任意种子直接种下并浇水 · 记住每种作物的喜元素与怕涝特性</small></div>
        <div class="row">
          ${lastSeed ? `<button class="btn small primary" data-pick="${lastSeed}">⚡ 再种${ITEMS[lastSeed].icon}${ITEMS[lastSeed].name}</button>` : ''}
          <button class="btn small" data-sclose>取消</button>
        </div>
      </header>
      <div class="seed-grid">${ownedSeeds.map(id => {
        const def = ITEMS[id];
        const crop = CROPS[id];
        const meta = CROP_META[id];
        const elTag = EL_BADGES[meta?.preferredElement ?? 0];
        return `<button class="seed-item seed-pick-btn" data-pick="${id}">
          <div class="s-top">
            <b>${def.icon} ${def.name}</b>
            <span class="s-tags">
              <span class="chip mute">${elTag}</span>
              ${meta?.waterSensitive ? '<span class="chip warn">怕涝</span>' : ''}
              <span class="chip sea">×${life.bag[id]}</span>
            </span>
          </div>
          <small>${Math.round(crop.growMs / 60_000)} 分钟成熟 · 收获 ${crop.yield[0]}~${crop.yield[1]} 个</small>
        </button>`;
      }).join('')}</div>
    </div></div>`;

    this.shopEl.onclick = (e: Event) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-pick],[data-sclose]');
      if (!t) return;
      if (t.dataset.sclose !== undefined) {
        this.closeSeedShop();
        onClose();
        return;
      }
      if (t.dataset.pick) {
        const chosen = t.dataset.pick;
        this.closeSeedShop();
        onPick(chosen);
        onClose();
      }
    };
  }

  closeSeedShop() {
    if (!this.shopOpen) return;
    this.shopOpen = false;
    this.shopEl.classList.add('hidden');
    this.shopEl.innerHTML = '';
  }
}
