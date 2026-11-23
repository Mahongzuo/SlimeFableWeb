import {DayMeta} from './types';
import {day0815} from './days/0815';
import {day1001} from './days/1001';
import {day1112} from './days/1112';
import {day1116} from './days/1116';
import {novemberDays} from './november';
import {decemberDays} from './december';
import {octoberDays} from './october';
import {abilityChapters} from './ability';
import {atlasDays} from './atlas';
/** Generated later by scripts; hand-maintained while the catalogue is small. */
export const days: Record<string, DayMeta> = {[day0815.day]: day0815, [day1001.day]: day1001, [day1112.day]: day1112, [day1116.day]: day1116};
for (const day of novemberDays) days[day.day]=day;
for (const day of decemberDays) days[day.day] = day;
for (const day of octoberDays) if (!days[day.day]) days[day.day] = day;
for (const day of atlasDays) days[day.day] = day;
for (const c of abilityChapters) {
  const day=days[c.day], others=day.chapters.filter(ch=>ch.id!==c.id);
  if(day.chapters.some(ch=>ch.id===c.id&&ch.status==='web'))throw Error('重复 Web 章节 '+c.id);
  days[c.day]={...day,chapters:[...others.filter(ch=>ch.status==='web'),c,...others.filter(ch=>ch.status!=='web')]};
}
