import {BUILD_CATALOG, BUILD_ITEMS, HOME_PRESETS} from '../home/build-catalog';
import {ensureHome, type DailyHomeTask, type DailyHomeTaskKind, type LifeData} from './state';

/** Home level XP thresholds (Lv.1 -> Lv.10). */
export const HOME_LEVEL_XP = [0, 0, 40, 100, 180, 280, 400, 550, 730, 940, 1200];
export const MAX_HOME_LEVEL = 10;

export function levelForXp(xp: number): number {
  let lv = 1;
  for (let i = 2; i <= MAX_HOME_LEVEL; i++) {
    if (xp >= HOME_LEVEL_XP[i]) lv = i;
  }
  return lv;
}

export function nextLevelXp(level: number): number | null {
  return level < MAX_HOME_LEVEL ? HOME_LEVEL_XP[level + 1] : null;
}

export interface XpGainResult {
  leveledUp: boolean;
  newLevel: number;
  newlyUnlocked: string[];
}

export function addHomeXp(life: LifeData, amount: number): XpGainResult {
  const home = ensureHome(life);
  const oldLevel = levelForXp(home.xp);
  home.xp = Math.max(0, home.xp + Math.round(amount));
  const newLevel = levelForXp(home.xp);
  home.level = newLevel;
  const newlyUnlocked: string[] = [];
  if (newLevel > oldLevel) {
    for (const item of BUILD_CATALOG) {
      if (item.unlockLevel > oldLevel && item.unlockLevel <= newLevel) {
        if (!home.unlocks.includes(item.id)) home.unlocks.push(item.id);
        newlyUnlocked.push(item.name);
      }
    }
    for (const p of HOME_PRESETS) {
      if (p.unlockLevel > oldLevel && p.unlockLevel <= newLevel) {
        newlyUnlocked.push(`预设「${p.name}」`);
      }
    }
  }
  return {leveledUp: newLevel > oldLevel, newLevel, newlyUnlocked};
}

export function isBuildItemUnlocked(life: LifeData, itemId: string): boolean {
  const def = BUILD_ITEMS[itemId];
  if (!def) return false;
  const home = ensureHome(life);
  const lv = Math.max(home.level, levelForXp(home.xp));
  return lv >= def.unlockLevel || home.unlocks.includes(itemId);
}

export function isPresetUnlocked(life: LifeData, presetId: string): boolean {
  const p = HOME_PRESETS.find(x => x.id === presetId);
  if (!p) return false;
  const home = ensureHome(life);
  const lv = Math.max(home.level, levelForXp(home.xp));
  return lv >= p.unlockLevel;
}

export function grantStarterHomeFunds(life: LifeData): boolean {
  if (life.records['home-starter-grant']) return false;
  life.records['home-starter-grant'] = 1;
  life.coins += 40;
  return true;
}

function hashDay(dayKey: string): number {
  let h = 2166136261;
  for (let i = 0; i < dayKey.length; i++) h = Math.imul(h ^ dayKey.charCodeAt(i), 16777619);
  return h >>> 0;
}

const TASK_POOL: Omit<DailyHomeTask, 'id' | 'progress' | 'done'>[] = [
  {kind: 'water', title: '给梯田作物浇水 2 次', target: 2, rewardCoins: 10, rewardXp: 18},
  {kind: 'element', title: '施展水/火/风/雷元素培育作物或洒水泉 1 次', target: 1, rewardCoins: 12, rewardXp: 20},
  {kind: 'build', title: '在家园中摆放 1 件建筑或庭院植物', target: 1, rewardCoins: 14, rewardXp: 24},
  {kind: 'visit', title: '观察或投喂 1 位来访的栖地小动物', target: 1, rewardCoins: 14, rewardXp: 22},
  {kind: 'harvest', title: '在梯田收获 1 块成熟作物', target: 1, rewardCoins: 12, rewardXp: 20},
];

export function ensureDailyHomeTasks(life: LifeData, dayKey: string): DailyHomeTask[] {
  const home = ensureHome(life);
  if (home.daily && home.daily.day === dayKey && home.daily.tasks.length === 3) {
    return home.daily.tasks;
  }
  const seed = hashDay(dayKey);
  const picked: DailyHomeTask[] = [];
  const used = new Set<number>();
  // Always ensure at least one build or farm task
  for (let k = 0; k < 3; k++) {
    let idx = (seed + k * 7) % TASK_POOL.length;
    while (used.has(idx)) idx = (idx + 1) % TASK_POOL.length;
    used.add(idx);
    const t = TASK_POOL[idx];
    picked.push({...t, id: `${dayKey}-${t.kind}-${idx}`, progress: 0, done: false});
  }
  home.daily = {day: dayKey, tasks: picked, claimedBonus: false};
  return picked;
}

export interface TaskProgressEvent {
  completedTasks: DailyHomeTask[];
  allDoneBonus: boolean;
  xpResult: XpGainResult;
}

export function recordHomeAction(life: LifeData, dayKey: string, kind: DailyHomeTaskKind, amount = 1): TaskProgressEvent {
  const tasks = ensureDailyHomeTasks(life, dayKey);
  const home = ensureHome(life);
  const completedTasks: DailyHomeTask[] = [];
  let totalXp = 0;
  for (const t of tasks) {
    if (t.done || t.kind !== kind) continue;
    t.progress = Math.min(t.target, t.progress + amount);
    if (t.progress >= t.target) {
      t.done = true;
      life.coins += t.rewardCoins;
      totalXp += t.rewardXp;
      completedTasks.push(t);
    }
  }
  let allDoneBonus = false;
  if (!home.daily!.claimedBonus && tasks.every(t => t.done)) {
    home.daily!.claimedBonus = true;
    life.coins += 20;
    totalXp += 30;
    allDoneBonus = true;
  }
  const xpResult = totalXp > 0 ? addHomeXp(life, totalXp) : {leveledUp: false, newLevel: home.level, newlyUnlocked: []};
  return {completedTasks, allDoneBonus, xpResult};
}
