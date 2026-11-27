import {ITEMS} from './catalog';
import {addItem, ensureHome, record, takeItem, type FishPondState, type LifeData} from './state';
import {FISH_TABLE} from './fishing';

/**
 * Ecological Fish Pond system (Stardew-inspired):
 * Stock any caught fish into a placed `poi-fishpond` -> fish breed over time,
 * ask for a wish item to expand capacity (3 -> 5 -> 7 -> 10), and produce daily Roe + rare Pearls/Relics!
 */
export const POND_GROW_INTERVAL_MS = 10 * 60_000; // 10 min real-time per fish birth (offline friendly)
const CAPACITY_STEPS = [3, 5, 7, 10];

const WISH_ITEMS = ['crop-lotus', 'crop-wheat', 'art-flour', 'crop-dewleaf', 'art-wild-honey', 'crop-starlight'];

function pickWish(fishId: string, cap: number): {item: string; count: number} {
  let h = cap * 31;
  for (const ch of fishId) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return {item: WISH_ITEMS[h % WISH_ITEMS.length], count: cap >= 7 ? 2 : 1};
}

export function stockFishPond(life: LifeData, pondId: string, fishId: string, now = Date.now()): {ok: boolean; reason?: string} {
  const def = ITEMS[fishId];
  if (!def || def.kind !== 'fish') return {ok: false, reason: '只能投放活鱼'};
  const home = ensureHome(life);
  const ponds = home.fishing!.ponds;
  const existing = ponds[pondId];
  if (existing) {
    if (existing.fishId !== fishId) return {ok: false, reason: '鱼塘里已经养了别的鱼种'};
    if (existing.count >= existing.capacity) return {ok: false, reason: '鱼塘已达当前容量上限'};
    if (!takeItem(life, fishId, 1)) return {ok: false, reason: '背包里没有这条鱼'};
    existing.count++;
    return {ok: true};
  }
  if (!takeItem(life, fishId, 1)) return {ok: false, reason: '背包里没有这条鱼'};
  const wish = pickWish(fishId, 3);
  ponds[pondId] = {
    fishId,
    count: 1,
    capacity: 3,
    lastGrowAt: now,
    wishItem: wish.item,
    wishCount: wish.count,
  };
  return {ok: true};
}

/** Advances offline fish reproduction in a pond. */
export function stepFishPond(pond: FishPondState, now = Date.now()): number {
  if (pond.count >= pond.capacity) {
    pond.lastGrowAt = now;
    return 0;
  }
  const elapsed = Math.max(0, now - pond.lastGrowAt);
  const births = Math.min(pond.capacity - pond.count, Math.floor(elapsed / POND_GROW_INTERVAL_MS));
  if (births > 0) {
    pond.count += births;
    pond.lastGrowAt += births * POND_GROW_INTERVAL_MS;
  }
  return births;
}

/** Fulfills the fish school's wish to expand capacity (3 -> 5 -> 7 -> 10). */
export function fulfillPondWish(life: LifeData, pondId: string): {ok: boolean; newCapacity: number; reason?: string} {
  const pond = ensureHome(life).fishing!.ponds[pondId];
  if (!pond) return {ok: false, newCapacity: 0, reason: '鱼塘是空的'};
  const idx = CAPACITY_STEPS.indexOf(pond.capacity);
  if (idx < 0 || idx >= CAPACITY_STEPS.length - 1) return {ok: false, newCapacity: pond.capacity, reason: '鱼塘已扩容至满级（10 条）'};
  if (!pond.wishItem || !takeItem(life, pond.wishItem, pond.wishCount ?? 1)) {
    return {ok: false, newCapacity: pond.capacity, reason: `缺少鱼群心愿物品：${ITEMS[pond.wishItem ?? '']?.name ?? '物资'} ×${pond.wishCount ?? 1}`};
  }
  pond.capacity = CAPACITY_STEPS[idx + 1];
  if (idx + 1 < CAPACITY_STEPS.length - 1) {
    const next = pickWish(pond.fishId, pond.capacity);
    pond.wishItem = next.item;
    pond.wishCount = next.count;
  } else {
    pond.wishItem = undefined;
    pond.wishCount = undefined;
  }
  return {ok: true, newCapacity: pond.capacity};
}

/** Collects daily Fish Roe (+ bonus Pearl or Historical Relic for rare/legendary/history fish!). */
export function collectFishPond(
  life: LifeData,
  pondId: string,
  dayKey: string,
  now = Date.now(),
): {ok: boolean; rewards: {id: string; count: number}[]; reason?: string} {
  const pond = ensureHome(life).fishing!.ponds[pondId];
  if (!pond || pond.count <= 0) return {ok: false, rewards: [], reason: '鱼塘里还没有放鱼'};
  stepFishPond(pond, now);
  if (pond.lastCollectDay === dayKey) return {ok: false, rewards: [], reason: '今天已经收获过鱼籽啦，明天再来'};

  pond.lastCollectDay = dayKey;
  const roeCount = pond.count >= 7 ? 3 : pond.count >= 4 ? 2 : 1;
  const rewards: {id: string; count: number}[] = [{id: 'prod-roe', count: roeCount}];
  addItem(life, 'prod-roe', roeCount);
  record(life, 'prod-roe', roeCount);

  const row = FISH_TABLE.find(f => f.fish === pond.fishId);
  if (row?.history) {
    rewards.push({id: 'relic-jade-seal', count: 1});
    addItem(life, 'relic-jade-seal', 1);
    record(life, 'relic-jade-seal', 1);
  } else if (row?.rare && pond.count >= 3) {
    rewards.push({id: 'prod-pearl', count: 1});
    addItem(life, 'prod-pearl', 1);
    record(life, 'prod-pearl', 1);
  }
  return {ok: true, rewards};
}
