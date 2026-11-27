import {days} from '../../content/registry';
import {ITEMS} from './catalog';
import {isMuseumHallRestored} from './museum';
import {addItem, ensureHome, record, type LifeData} from './state';
import {rng} from '../templates/random';

/**
 * Daily History ↔ Home Linkage:
 * Reads today's "History Today" chapters from content/registry.ts to compute:
 * 1) A thematic Home Blessing (e.g., Space Day -> Observatory bonus, Heritage Day -> Artisan speed, Nature Day -> Rare wildlife).
 * 2) Daily Tide Drift Bottles washed ashore at the Harbor Lighthouse with historical notes & rare gifts.
 */
export type HistoryThemeKind = 'cosmos' | 'heritage' | 'nature' | 'engineering';

export interface DailyHistoryBlessing {
  theme: HistoryThemeKind;
  title: string;
  icon: string;
  desc: string;
  featuredYear?: number;
  featuredTitle?: string;
}

export function getDailyHistoryBlessing(mmdd: string): DailyHistoryBlessing {
  const day = days[mmdd];
  const text = day
    ? day.chapters.map(c => `${c.event} ${c.quest} ${c.souvenir}`).join(' ')
    : '';
  const lead = day?.chapters[0];

  if (/航天|卫星|飞船|火星|月球|火箭|太空|星|望远镜|行星|彗星|宇宙/.test(text)) {
    return {
      theme: 'cosmos', icon: '🚀', title: '星辰探索日祝福',
      desc: '受今日航天/天文史事感召：观星台必得星露馈赠，夜行稀兽更易现身！',
      featuredYear: lead?.year, featuredTitle: lead?.event,
    };
  }
  if (/茶|非遗|诗|词|画|博物|故宫|敦煌|曲|剧|书|印|文|琴|瓷/.test(text)) {
    return {
      theme: 'heritage', icon: '🏮', title: '文脉非遗日祝福',
      desc: '受今日人文/非遗史事感召：炒茶坊与酿造桶产出更易触发金标，敦煌九色鹿影偶现凝露港！',
      featuredYear: lead?.year, featuredTitle: lead?.event,
    };
  }
  if (/海|湖|山|公园|自然|动物|森林|生态|植物|生物|保护|极/.test(text)) {
    return {
      theme: 'nature', icon: '🌿', title: '山海博物日祝福',
      desc: '受今日自然/生态史事感召：野外稀兽与珍稀鱼种活跃度提升！',
      featuredYear: lead?.year, featuredTitle: lead?.event,
    };
  }
  return {
    theme: 'engineering', icon: '⚙️', title: '巧匠筑梦日祝福',
    desc: '受今日科技/工程史事感召：水磨坊与积木建造获额外繁荣经验，漂流瓶常夹带古董遗物！',
    featuredYear: lead?.year, featuredTitle: lead?.event,
  };
}

const DRIFT_REWARDS = [
  'relic-bronze-bell',
  'relic-celadon-shard',
  'relic-compass',
  'relic-scroll',
  'relic-astrolabe',
  'seed-starlight',
  'seed-lotus',
  'bait-chronicle',
  'bait-element',
];

export function maxDailyDriftBottles(life: LifeData): number {
  return isMuseumHallRestored(life, 'astronomy') ? 2 : 1;
}

/** Claims a tide drift bottle at the Harbor Lighthouse / Pier, gifting a historical mini-note & rare item. */
export function claimDriftBottle(
  life: LifeData,
  dayKey: string,
  mmdd: string,
): {ok: boolean; rewardId?: string; note?: string; remaining: number} {
  const home = ensureHome(life);
  const max = maxDailyDriftBottles(life);
  if (home.driftBottles?.day !== dayKey) {
    home.driftBottles = {day: dayKey, claimed: 0, notes: []};
  }
  if (home.driftBottles.claimed >= max) {
    return {ok: false, remaining: 0};
  }
  const idx = home.driftBottles.claimed;
  const r = rng(`drift-${dayKey}-${idx}`);
  const rewardId = DRIFT_REWARDS[Math.floor(r.next() * DRIFT_REWARDS.length)];
  const day = days[mmdd];
  const ch = day?.chapters[idx % Math.max(1, day.chapters.length)];
  const note = ch
    ? `【${ch.year}年 · 潮汐漂流笺】${ch.event} — ${ch.quest.slice(0, 72)}${ch.quest.length > 72 ? '…' : ''}`
    : '【岁月漂流笺】海潮从远方送来了一枚时光信物。';

  home.driftBottles.claimed++;
  home.driftBottles.notes.push(note);
  addItem(life, rewardId, 1);
  if (ITEMS[rewardId]?.kind === 'relic') record(life, rewardId, 1);
  return {ok: true, rewardId, note, remaining: max - home.driftBottles.claimed};
}
