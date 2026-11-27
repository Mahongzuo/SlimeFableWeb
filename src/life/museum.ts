import {ITEMS} from './catalog';
import {ensureHome, takeItem, type LifeData} from './state';
import {addHomeXp} from './unlocks';

/**
 * 凝露港 · 时光博物苑 (Stardew Community Center equivalent, fused with SlimeFable's 366-day History!).
 * 6 thematic halls combining crops, artisan goods, rare fish, ranch products, voxel craft & history souvenirs.
 * Restoring each hall permanently upgrades Home gameplay.
 */
export type MuseumHallId = 'farming' | 'fishing' | 'ranch' | 'craft' | 'astronomy' | 'history';

export interface MuseumSlot {
  id: string;
  label: string;
  /** Either an itemId from ITEMS (consumed on donation) or a milestone check. */
  itemId?: string;
  count?: number;
  milestone?: {
    kind: 'voxels' | 'souvenirs' | 'species' | 'treasures' | 'expansions' | 'visitors';
    target: number;
    hint: string;
  };
}

export interface MuseumHallDef {
  id: MuseumHallId;
  name: string;
  icon: string;
  subtitle: string;
  rewardTitle: string;
  rewardDesc: string;
  rewardCoins: number;
  slots: MuseumSlot[];
}

export const MUSEUM_HALLS: MuseumHallDef[] = [
  {
    id: 'farming',
    name: '神农农耕馆',
    icon: '🌾',
    subtitle: '汇集江南田园四季作物与手工加工结晶',
    rewardTitle: '四季温室恒温祝福',
    rewardDesc: '全部农田作物永久 +25% 生长速度，稀有种子全天候供应。',
    rewardCoins: 60,
    slots: [
      {id: 'farm-flour', label: '水磨精面粉 ×2', itemId: 'art-flour', count: 2},
      {id: 'farm-tea', label: '明前龙井新茶 ×1', itemId: 'art-longjing-tea', count: 1},
      {id: 'farm-wine', label: '水晶陈酿果酒 ×1', itemId: 'art-grape-wine', count: 1},
      {id: 'farm-honey', label: '任意花蜜（百花/青莲/星露）', itemId: 'art-wild-honey', count: 1},
    ],
  },
  {
    id: 'fishing',
    name: '沧溟渔猎馆',
    icon: '🐟',
    subtitle: '珍藏水巷、镜湖、溪涧与海岬的珍稀渔获',
    rewardTitle: '沧溟渔神祝福',
    rewardDesc: '垂钓捕鱼绿框永久加宽 +15%，水底宝箱刷新率提升。',
    rewardCoins: 75,
    slots: [
      {id: 'fish-smoked', label: '果木熏鱼 ×1', itemId: 'art-smoked-fish', count: 1},
      {id: 'fish-caviar', label: '琥珀鱼子酱 ×1', itemId: 'art-caviar', count: 1},
      {id: 'fish-mandarin', label: '桃花鳜 ×1', itemId: 'fish-mandarin', count: 1},
      {id: 'fish-treasure', label: '打捞 3 次水底宝箱', milestone: {kind: 'treasures', target: 3, hint: '在垂钓拉锯时将绿框覆盖水底宝箱'}},
    ],
  },
  {
    id: 'ranch',
    name: '山海百兽馆',
    icon: '🦌',
    subtitle: '记录在凝露港偶遇并安家的生灵伙伴',
    rewardTitle: '生态保育光环',
    rewardDesc: '稀兽野外遭遇概率翻倍，已收养牧场动物每日心情自动满值。',
    rewardCoins: 80,
    slots: [
      {id: 'ranch-cheese', label: '牧场手工奶酪 ×1', itemId: 'art-cheese', count: 1},
      {id: 'ranch-cloth', label: '云绒锦缎 ×1', itemId: 'art-silk-cloth', count: 1},
      {id: 'ranch-species', label: '结识 3 种稀有生态物种', milestone: {kind: 'species', target: 3, hint: '野外追踪驯服稀有动物，或吸引栖地来客'}},
      {id: 'ranch-spring', label: '温泉暖露 ×1', itemId: 'prod-spring-dew', count: 1},
    ],
  },
  {
    id: 'craft',
    name: '鲁班营造馆',
    icon: '🧱',
    subtitle: '致敬榫卯营造技艺与自由空间创造',
    rewardTitle: '大师营造工坊',
    rewardDesc: '解锁体素建筑全色系染色与 0 贝壳基础木石积木。',
    rewardCoins: 65,
    slots: [
      {id: 'craft-voxels', label: '亲手搭建 24 块轻体素积木', milestone: {kind: 'voxels', target: 24, hint: '按 V 切到「积木」页签自由搭建亭台围栏'}},
      {id: 'craft-expand', label: '开垦 2 块新家园领土', milestone: {kind: 'expansions', target: 2, hint: '按 V 切到「扩建」页签开垦相邻边疆'}},
      {id: 'craft-sourdough', label: '柴火乡间面包 ×2', itemId: 'art-sourdough', count: 2},
    ],
  },
  {
    id: 'astronomy',
    name: '观象授时馆',
    icon: '🔭',
    subtitle: '顺应江南四时气象与潮汐星轨',
    rewardTitle: '天时星轨祝福',
    rewardDesc: '观星台与漂流瓶每日额外赠礼，农田遇雨自动双倍保水。',
    rewardCoins: 75,
    slots: [
      {id: 'astro-astrolabe', label: '黄铜浑仪环或古罗盘', itemId: 'relic-compass', count: 1},
      {id: 'astro-scroll', label: '漆匣星图残卷', itemId: 'relic-scroll', count: 1},
      {id: 'astro-star-tea', label: '星露冷萃茶 ×1', itemId: 'art-starlight-tea', count: 1},
    ],
  },
  {
    id: 'history',
    name: '岁月史海馆',
    icon: '📜',
    subtitle: '把每日历史上的今天化作港湾永恒记忆',
    rewardTitle: '历史商船常驻靠港',
    rewardDesc: '解锁全部历史主题体素方块，每日委托报酬额外 +25%。',
    rewardCoins: 100,
    slots: [
      {id: 'hist-souv-5', label: '收集 5 件历史关卡纪念品', milestone: {kind: 'souvenirs', target: 5, hint: '通过凝露港 1–6 号时光门通关历史关卡'}},
      {id: 'hist-souv-15', label: '收集 15 件历史关卡纪念品', milestone: {kind: 'souvenirs', target: 15, hint: '探索不同日期的每日史事关卡'}},
      {id: 'hist-celadon', label: '秘色青瓷片 ×1', itemId: 'relic-celadon-shard', count: 1},
      {id: 'hist-bell', label: '古铜编钟残片 ×1', itemId: 'relic-bronze-bell', count: 1},
    ],
  },
];

export interface MuseumContext {
  souvenirCount: number;
}

export function milestoneValue(life: LifeData, kind: NonNullable<MuseumSlot['milestone']>['kind'], ctx: MuseumContext): number {
  const home = ensureHome(life);
  switch (kind) {
    case 'voxels': return home.voxels?.length ?? 0;
    case 'souvenirs': return ctx.souvenirCount;
    case 'species': return (home.ranch?.discovered.length ?? 0) + Object.keys(home.visitors).length;
    case 'treasures': return home.fishing?.treasuresFound ?? 0;
    case 'expansions': return home.expansions.length;
    case 'visitors': return Object.keys(home.visitors).length;
  }
}

export function isSlotDonated(life: LifeData, hallId: MuseumHallId, slotId: string): boolean {
  const home = ensureHome(life);
  return !!home.museum?.[hallId]?.includes(slotId);
}

export function isMuseumHallRestored(life: LifeData, hallId: MuseumHallId): boolean {
  const hall = MUSEUM_HALLS.find(h => h.id === hallId);
  if (!hall) return false;
  const done = ensureHome(life).museum?.[hallId] ?? [];
  return hall.slots.every(s => done.includes(s.id));
}

export function canDonateSlot(life: LifeData, hallId: MuseumHallId, slotId: string, ctx: MuseumContext): boolean {
  if (isSlotDonated(life, hallId, slotId)) return false;
  const hall = MUSEUM_HALLS.find(h => h.id === hallId);
  const slot = hall?.slots.find(s => s.id === slotId);
  if (!slot) return false;
  if (slot.milestone) {
    return milestoneValue(life, slot.milestone.kind, ctx) >= slot.milestone.target;
  }
  if (slot.itemId) {
    // Allow any honey variant for the honey slot, or compass/astrolabe for astronomy
    if (slot.id === 'farm-honey') {
      return (life.bag['art-wild-honey'] ?? 0) >= 1 || (life.bag['art-lotus-honey'] ?? 0) >= 1 || (life.bag['art-star-honey'] ?? 0) >= 1;
    }
    if (slot.id === 'astro-astrolabe') {
      return (life.bag['relic-compass'] ?? 0) >= 1 || (life.bag['relic-astrolabe'] ?? 0) >= 1;
    }
    return (life.bag[slot.itemId] ?? 0) >= (slot.count ?? 1);
  }
  return false;
}

export function donateToMuseum(
  life: LifeData,
  hallId: MuseumHallId,
  slotId: string,
  ctx: MuseumContext,
): {ok: boolean; hallRestored: boolean; rewardCoins: number; reason?: string} {
  if (!canDonateSlot(life, hallId, slotId, ctx)) return {ok: false, hallRestored: false, rewardCoins: 0, reason: 'requirements'};
  const hall = MUSEUM_HALLS.find(h => h.id === hallId)!;
  const slot = hall.slots.find(s => s.id === slotId)!;

  if (slot.itemId) {
    if (slot.id === 'farm-honey') {
      const pick = ['art-wild-honey', 'art-lotus-honey', 'art-star-honey'].find(id => (life.bag[id] ?? 0) >= 1);
      if (!pick || !takeItem(life, pick, 1)) return {ok: false, hallRestored: false, rewardCoins: 0};
    } else if (slot.id === 'astro-astrolabe') {
      const pick = ['relic-compass', 'relic-astrolabe'].find(id => (life.bag[id] ?? 0) >= 1);
      if (!pick || !takeItem(life, pick, 1)) return {ok: false, hallRestored: false, rewardCoins: 0};
    } else if (!takeItem(life, slot.itemId, slot.count ?? 1)) {
      return {ok: false, hallRestored: false, rewardCoins: 0};
    }
  }

  const home = ensureHome(life);
  home.museum ??= {};
  home.museum[hallId] ??= [];
  home.museum[hallId].push(slotId);
  addHomeXp(life, 25);

  const hallRestored = isMuseumHallRestored(life, hallId);
  let rewardCoins = 12;
  if (hallRestored) {
    rewardCoins += hall.rewardCoins;
    addHomeXp(life, 60);
  }
  life.coins += rewardCoins;
  return {ok: true, hallRestored, rewardCoins};
}

export function museumSummary(life: LifeData, ctx: MuseumContext) {
  let totalSlots = 0;
  let donatedSlots = 0;
  let restoredHalls = 0;
  const halls = MUSEUM_HALLS.map(hall => {
    const doneIds = ensureHome(life).museum?.[hall.id] ?? [];
    totalSlots += hall.slots.length;
    donatedSlots += doneIds.length;
    const restored = hall.slots.every(s => doneIds.includes(s.id));
    if (restored) restoredHalls++;
    return {
      hall,
      restored,
      doneCount: doneIds.length,
      slots: hall.slots.map(s => ({
        slot: s,
        done: doneIds.includes(s.id),
        canDonate: canDonateSlot(life, hall.id, s.id, ctx),
        progress: s.milestone ? `${Math.min(s.milestone.target, milestoneValue(life, s.milestone.kind, ctx))}/${s.milestone.target}` : `${life.bag[s.itemId!] ?? 0}/${s.count ?? 1}`,
        itemIcon: s.itemId ? ITEMS[s.itemId]?.icon ?? '📦' : '✦',
      })),
    };
  });
  return {totalSlots, donatedSlots, restoredHalls, totalHalls: MUSEUM_HALLS.length, halls};
}
