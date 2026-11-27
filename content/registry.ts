import {DayMeta} from './types';
import {jan01Day} from './jan01-chapters';
import {day0815} from './days/0815';
import {day1001} from './days/1001';
import {day1112} from './days/1112';
import {day1116} from './days/1116';
import {novemberDays} from './november';
import {decemberDays} from './december';
import {octoberDays} from './october';
import {abilityChapters} from './ability';
import {atlasDays} from './atlas';
import {chronicleEntries} from './chronicle';
/** Existing Chinese-history non-filler chapters promoted to Gate 1 while keeping their original IDs and saves. */
const gate1Preferred = new Set([
  '0104-1951',
  '0116-1885',
  '0308-1958',
  '0310-1924',
  '0319-1939',
  '0320-1881',
]);
/** Generated later by scripts; hand-maintained while the catalogue is small. */
export const days: Record<string, DayMeta> = {[day0815.day]: day0815, [day1001.day]: day1001, [day1112.day]: day1112, [day1116.day]: day1116};
for (const day of novemberDays) days[day.day] = day;
for (const day of decemberDays) days[day.day] = day;
for (const day of octoberDays) if (!days[day.day]) days[day.day] = day;
for (const day of atlasDays) days[day.day] = day;
days[jan01Day.day] = jan01Day;
for (const c of abilityChapters) {
  const day = days[c.day] ?? {day: c.day, theme: c.quest, chapters: []};
  const others = day.chapters.filter(ch => ch.id !== c.id);
  if (day.chapters.some(ch => ch.id === c.id && ch.status === 'web')) throw Error('重复 Web 章节 ' + c.id);
  days[c.day] = {...day, chapters: [...others.filter(ch => ch.status === 'web'), c, ...others.filter(ch => ch.status !== 'web')]};
}
for (const {slot, chapter} of chronicleEntries) {
  const day = days[chapter.day] ?? {day: chapter.day, theme: chapter.quest, chapters: []};
  const others = day.chapters.filter(ch => ch.id !== chapter.id);
  if (day.chapters.some(ch => ch.id === chapter.id && ch.status === 'web')) throw Error('重复 Web 章节 ' + chapter.id);
  const web = others.filter(ch => ch.status === 'web'), rest = others.filter(ch => ch.status !== 'web');
  days[chapter.day] = {
    ...day,
    theme: slot === 1 ? chapter.quest : day.theme,
    chapters: slot === 1 ? [chapter, ...web, ...rest] : [...web, chapter, ...rest],
  };
}
for (const id of gate1Preferred) {
  const dayKey = id.slice(0, 4), day = days[dayKey];
  if (!day) continue;
  const preferred = day.chapters.find(ch => ch.id === id && ch.status === 'web');
  if (!preferred) continue;
  const others = day.chapters.filter(ch => ch.id !== id);
  const web = others.filter(ch => ch.status === 'web'), rest = others.filter(ch => ch.status !== 'web');
  days[dayKey] = {...day, theme: preferred.quest, chapters: [preferred, ...web, ...rest]};
}
