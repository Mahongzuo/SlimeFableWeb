import {changeShells} from './shell-wallet';
import {ITEMS, RECIPES, RESIDENT_FISH} from './catalog';
import {rng} from '../templates/random';
import {takeItem, type LifeData, type RequestState} from './state';
/**
 * The 委托板: three requests a day from the harbour folk, the same for everyone on the same date.
 * Rewards pay half again over the shop price, plus a tip, so delivering beats selling.
 */
const POOL = [...Object.values(ITEMS).filter(i => i.kind === 'crop' || (i.kind === 'fish' && !RESIDENT_FISH.has(i.id))).map(i => i.id), ...RECIPES.map(r => r.id)];
const RARE = new Set(['fish-golden-trout', 'fish-rainbow-trout', 'fish-history', 'fish-eel']);
const WHO = ['码头的阿海叔', '渔社的林阿姨', '候船室的小卖部', '凝露小学的孩子们', '灯塔看守老周', '汤圆岛来的游客', '茶水摊的阿婆', '渡轮船长'];
export function dailyRequests(day: string): RequestState[] {
  const r = rng('requests-' + day), picked: RequestState[] = [], used = new Set<string>();
  while (picked.length < 3) {
    const item = r.pick(POOL.filter(id => !RARE.has(id))); if (used.has(item)) continue; used.add(item);
    const count = ITEMS[item].kind === 'food' ? 1 : r.int(1, ITEMS[item].kind === 'fish' ? 2 : 4);
    picked.push({id: `${day}-${picked.length}`, item, count, reward: Math.round(ITEMS[item].price * count * 1.5) + 5, done: false});
  }
  return picked;
}
export const requester = (req: RequestState) => WHO[Math.abs([...req.id].reduce((h, c) => h * 31 + c.charCodeAt(0), 7)) % WHO.length];
/** Today's list, regenerated when the date changes (finished ones stay finished for the day). */
export function today(life: LifeData, day: string) {
  if (life.requests?.day !== day) life.requests = {day, list: dailyRequests(day)};
  return life.requests.list;
}
export function deliver(life: LifeData, day: string, id: string): {ok: boolean; reward?: number} {
  const req = today(life, day).find(q => q.id === id); if (!req || req.done || (life.bag[req.item] ?? 0) < req.count) return {ok: false};
  takeItem(life, req.item, req.count); req.done = true; changeShells(life, req.reward, 'earn'); return {ok: true, reward: req.reward};
}
