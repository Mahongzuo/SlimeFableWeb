import {DayMeta} from '../../content/types';
import {days} from '../../content/registry';
import {DayId, realToday} from './calendar';
/** Which day the harbour shows. Today if it has content; otherwise an archive day, so the doors are never empty. */
export interface Showing {today: DayId; shown: DayMeta; isToday: boolean; chosen: boolean}
export const allDays = () => Object.keys(days).sort();
export function featuredArchive(today: DayId): DayMeta {
  const ids = allDays();
  const after = ids.find(id => id > today) ?? ids[0];
  return days[after];
}
export function resolveShowing(selected: DayId | null): Showing {
  const today = realToday().id;
  if (selected && days[selected]) return {today, shown: days[selected], isToday: selected === today, chosen: selected !== today};
  if (days[today]) return {today, shown: days[today], isToday: true, chosen: false};
  return {today, shown: featuredArchive(today), isToday: false, chosen: false};
}
export const dayFor = (id: DayId): DayMeta | null => days[id] ?? null;
