/** Day ids are 'MMDD' strings, year-less, 366 of them (0229 included). */
export type DayId = string;
const lengths = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const pad = (n: number) => String(n).padStart(2, '0');
export const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
export function isValidDay(id: string) {
  if (!/^\d{4}$/.test(id)) return false;
  const m = Number(id.slice(0, 2)), d = Number(id.slice(2));
  return m >= 1 && m <= 12 && d >= 1 && d <= lengths[m - 1];
}
export const dayIdOf = (date: Date): DayId => pad(date.getMonth() + 1) + pad(date.getDate());
export const month = (id: DayId) => Number(id.slice(0, 2));
export const date = (id: DayId) => Number(id.slice(2));
export const dayLabel = (id: DayId) => `${month(id)}月${date(id)}日`;
export const monthLength = (m: number) => lengths[m - 1];
export function shiftDay(id: DayId, delta: number): DayId {
  const d = new Date(2024, month(id) - 1, date(id) + delta); // 2024 is a leap year, so 0229 survives
  return dayIdOf(d);
}
/** The player's real local date; `?date=MMDD` overrides it for testing. */
export function realToday(now = new Date()): {id: DayId; year: number; weekday: string} {
  let id = dayIdOf(now);
  try { const q = new URLSearchParams(location.search).get('date'); if (q && isValidDay(q)) id = q; } catch {}
  return {id, year: now.getFullYear(), weekday: weekdays[now.getDay()]};
}
