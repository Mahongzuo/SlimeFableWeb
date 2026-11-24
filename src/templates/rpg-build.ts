/**
 * Pure-logic RPG build system for Sekigahara (Gate 6):
 * - 6 Sekigahara Battle Relics (3-choice draft × 2 checkpoints)
 * - Dynamic Style Rank tracker (D → C → B → A → S → SS)
 * - Dew Gourd healing potions & Poise (stagger) formulas
 */

import {rng} from './random';

export type RelicId = 'tide' | 'blaze' | 'thunder' | 'gale' | 'stone' | 'void';

export interface RelicDef {
  id: RelicId;
  name: string;
  icon: string;
  color: string;
  tag: string;
  desc: string;
}

export const RELIC_POOL: readonly RelicDef[] = [
  {
    id: 'tide', name: '潮涌战印', icon: '💧', color: '#6cb7f5', tag: '续航 · 蒸发',
    desc: '水系与蒸发/感电伤害 +35%，每次触发元素反应回复 6 点生命',
  },
  {
    id: 'blaze', name: '烈焰战印', icon: '🔥', color: '#ff8a52', tag: '爆发 · 处决',
    desc: '对失衡破韧敌人伤害额外 +40%，火伤与超载伤害 +30%',
  },
  {
    id: 'thunder', name: '疾雷战印', icon: '⚡', color: '#c49bff', tag: '闪避 · 天雷',
    desc: '完美闪避触发天雷反击（额外 28 雷伤与高额削韧），并回复 25 元素能量',
  },
  {
    id: 'gale', name: '朔风战印', icon: '🍃', color: '#78e8b4', tag: '机动 · 回能',
    desc: '闪避冷却 -35%，连击与技能获取能量 +60%，攻击速度节奏更紧凑',
  },
  {
    id: 'stone', name: '磐岩战印', icon: '🪨', color: '#ebd083', tag: '护盾 · 破韧',
    desc: '生命上限 +30、立刻获得 28 点护盾（处决自动刷新），全攻击削韧 +45%',
  },
  {
    id: 'void', name: '幽影战印', icon: '🌑', color: '#b588e8', tag: '易伤 · 无双',
    desc: '对带元素附着的敌人伤害 +30%，击杀或破韧后 5 秒内全伤害 +35%',
  },
];

export function relicById(id: RelicId): RelicDef {
  return RELIC_POOL.find(r => r.id === id) ?? RELIC_POOL[0];
}

export interface RpgBuildSnapshot {
  relics: RelicId[];
  potions: number;
  maxPotions: number;
  shield: number;
  maxHealth: number;
  frenzyUntil: number;
}

export class RpgBuild {
  relics: RelicId[] = [];
  potions = 2;
  maxPotions = 3;
  shield = 0;
  maxHealth = 100;
  frenzyUntil = -Infinity;

  has(id: RelicId): boolean {
    return this.relics.includes(id);
  }

  /** Offer 3 distinct unowned relics deterministically by seed + round. */
  draftChoices(seed: string, round: number): RelicDef[] {
    const avail = RELIC_POOL.filter(r => !this.has(r.id));
    const rand = rng(`${seed}-relic-${round}`);
    const copy = [...avail];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = rand.int(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, 3);
  }

  pick(id: RelicId): {healBonus: number; shieldGain: number} {
    if (this.has(id)) return {healBonus: 0, shieldGain: 0};
    this.relics.push(id);
    if (id === 'stone') {
      this.maxHealth += 30;
      this.shield = Math.max(this.shield, 28);
      return {healBonus: 30, shieldGain: 28};
    }
    return {healBonus: 12, shieldGain: 0};
  }

  addPotion(n = 1): boolean {
    if (this.potions >= this.maxPotions) return false;
    this.potions = Math.min(this.maxPotions, this.potions + n);
    return true;
  }

  usePotion(currentLife: number): {used: boolean; nextLife: number; healed: number} {
    if (this.potions <= 0 || currentLife >= this.maxHealth) {
      return {used: false, nextLife: currentLife, healed: 0};
    }
    this.potions--;
    const heal = 36;
    const nextLife = Math.min(this.maxHealth, currentLife + heal);
    return {used: true, nextLife, healed: nextLife - currentLife};
  }

  /** Absorb incoming damage with Stone shield first, returning remaining HP loss. */
  absorbDamage(raw: number): {hpLoss: number; absorbed: number} {
    if (this.shield <= 0) return {hpLoss: raw, absorbed: 0};
    const absorbed = Math.min(this.shield, raw);
    this.shield = Math.max(0, this.shield - absorbed);
    return {hpLoss: raw - absorbed, absorbed};
  }

  onBreakOrKill(now: number) {
    if (this.has('void')) this.frenzyUntil = Math.max(this.frenzyUntil, now + 5);
  }

  onExecute(now: number): {heal: number; shieldRefreshed: boolean} {
    this.onBreakOrKill(now);
    let shieldRefreshed = false;
    if (this.has('stone')) {
      this.shield = Math.max(this.shield, 28);
      shieldRefreshed = true;
    }
    return {heal: 14, shieldRefreshed};
  }

  dodgeCooldownScale(): number {
    return this.has('gale') ? 0.65 : 1.0;
  }

  energyGainScale(styleRank: StyleRank): number {
    let m = this.has('gale') ? 1.6 : 1.0;
    if (styleRank === 'A' || styleRank === 'S' || styleRank === 'SS') m *= 1.25;
    return m;
  }

  poiseDamageScale(): number {
    return this.has('stone') ? 1.45 : 1.0;
  }

  damageMultiplier(ctx: {
    element: number;
    reactionKind?: string;
    targetHasAura: boolean;
    targetBroken: boolean;
    now: number;
    styleRank: StyleRank;
  }): number {
    let m = 1.0;
    if (this.has('tide') && (ctx.element === 0 || ctx.reactionKind === 'Vaporize' || ctx.reactionKind === 'ElectroCharge')) {
      m *= 1.35;
    }
    if (this.has('blaze')) {
      if (ctx.element === 2 || ctx.reactionKind === 'Overload') m *= 1.3;
      if (ctx.targetBroken) m *= 1.4;
    }
    if (this.has('void')) {
      if (ctx.targetHasAura) m *= 1.3;
      if (ctx.now <= this.frenzyUntil) m *= 1.35;
    }
    if (ctx.styleRank === 'S') m *= 1.15;
    else if (ctx.styleRank === 'SS') m *= 1.25;
    return m;
  }

  snapshot(): RpgBuildSnapshot {
    return {
      relics: [...this.relics],
      potions: this.potions,
      maxPotions: this.maxPotions,
      shield: this.shield,
      maxHealth: this.maxHealth,
      frenzyUntil: this.frenzyUntil,
    };
  }

  restore(s: RpgBuildSnapshot) {
    this.relics = [...s.relics];
    this.potions = s.potions;
    this.maxPotions = s.maxPotions;
    this.shield = s.shield;
    this.maxHealth = s.maxHealth;
    this.frenzyUntil = s.frenzyUntil;
  }
}

export type StyleRank = 'D' | 'C' | 'B' | 'A' | 'S' | 'SS';
const RANK_ORDER: readonly StyleRank[] = ['D', 'C', 'B', 'A', 'S', 'SS'];
const RANK_THRESHOLDS = [0, 22, 48, 80, 118, 160];

export const STYLE_PERKS: Record<StyleRank, {title: string; color: string; perk: string}> = {
  D: {title: '初阵', color: '#a5b5b0', perk: '连击与切元素提升战意'},
  C: {title: '破竹', color: '#8ad4d8', perk: '渐入佳境'},
  B: {title: '疾风', color: '#8ef0a8', perk: '连招流畅'},
  A: {title: '烈势', color: '#ffd978', perk: '能量获取 +25%'},
  S: {title: '无双', color: '#ff9654', perk: '全伤 +15% · 回能 +25%'},
  SS: {title: '天下布武', color: '#ff5d8f', perk: '全伤 +25% · 回能 +25%'},
};

export class StyleTracker {
  score = 0;
  combo = 0;
  maxCombo = 0;
  peakRank: StyleRank = 'D';
  private lastElement = -1;
  private idle = 0;

  get rank(): StyleRank {
    for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
      if (this.score >= RANK_THRESHOLDS[i]) return RANK_ORDER[i];
    }
    return 'D';
  }

  get tier(): number {
    return RANK_ORDER.indexOf(this.rank);
  }

  get progress(): number {
    const t = this.tier;
    if (t >= RANK_ORDER.length - 1) return 1;
    const lo = RANK_THRESHOLDS[t], hi = RANK_THRESHOLDS[t + 1];
    return Math.max(0, Math.min(1, (this.score - lo) / (hi - lo)));
  }

  registerHit(element: number, hasReaction: boolean, isCrit = false): boolean {
    const prevTier = this.tier;
    const variety = this.lastElement >= 0 && this.lastElement !== element ? 1.4 : 1.0;
    this.lastElement = element;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.idle = 0;
    const base = 9 + (hasReaction ? 14 : 0) + (isCrit ? 8 : 0);
    this.score = Math.min(200, this.score + base * variety);
    this.updatePeak();
    return this.tier > prevTier;
  }

  registerEvent(kind: 'perfectDodge' | 'break' | 'execute' | 'drum'): boolean {
    const prevTier = this.tier;
    this.idle = 0;
    const gain = {perfectDodge: 24, break: 28, execute: 38, drum: 22}[kind];
    this.score = Math.min(200, this.score + gain);
    this.updatePeak();
    return this.tier > prevTier;
  }

  onPlayerHurt() {
    this.combo = 0;
    this.score = Math.max(0, this.score - 42);
  }

  step(dt: number) {
    if (this.score <= 0) return;
    this.idle += dt;
    if (this.idle > 3.6) {
      this.score = Math.max(0, this.score - dt * (11 + this.tier * 4));
      if (this.idle > 5.5) this.combo = 0;
    }
  }

  reset() {
    this.score = 0;
    this.combo = 0;
    this.lastElement = -1;
    this.idle = 0;
  }

  private updatePeak() {
    if (this.tier > RANK_ORDER.indexOf(this.peakRank)) {
      this.peakRank = this.rank;
    }
  }
}

/** Calculate poise damage dealt by an attack or elemental reaction. */
export function computePoiseDamage(
  rawDamage: number,
  element: number,
  reactionKind?: string,
  scale = 1,
): number {
  let base = rawDamage * 0.42;
  if (element === 5) base *= 1.55; // Physical breaks poise fastest
  if (reactionKind === 'BreakPoise') base += 28;
  else if (reactionKind === 'Overload') base += 24;
  else if (reactionKind === 'Vaporize' || reactionKind === 'ElectroCharge') base += 14;
  else if (reactionKind) base += 10;
  return Math.round(base * scale);
}
