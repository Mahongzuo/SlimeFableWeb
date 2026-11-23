/**
 * 6-Element Anime ARPG Skill System & 11 UE Elemental Reactions.
 * Pure simulation logic (zero Three.js imports) so combat levels & unit tests share identical rules.
 */

export type SkillSlot = 'E' | 'R' | 'Q';

export type SkillArchetype =
  | 'projectile'
  | 'sweep'
  | 'dome'
  | 'dash'
  | 'vortex'
  | 'bolt'
  | 'chain'
  | 'storm'
  | 'field'
  | 'meteor'
  | 'slam'
  | 'wave'
  | 'leap_slam';

export interface SkillDef {
  slot: SkillSlot;
  element: number;
  name: string;
  shortName: string;
  icon: string;
  archetype: SkillArchetype;
  damage: number;
  cooldown: number;
  energyCost: number;
  energyGain: number;
  range: number;
  radius: number;
  dashDist?: number;
  projectileSpeed?: number;
  duration?: number;
  multiHits?: number;
  chainCount?: number;
  knockback?: number;
  desc: string;
}

export const ELEMENT_SWITCH_COOLDOWN = 1.0;
export const MAX_SKILL_ENERGY = 100;
export const PASSIVE_ENERGY_PER_SEC = 5.0;

export const ELEMENT_ROLES: readonly {element: number; role: string; style: string}[] = [
  {element: 0, role: '中程控场法师', style: '水泡远程 + 大弧潮汐 + 水穹爆发'},
  {element: 1, role: '高速近战刺客', style: '疾风突刺 + 聚怪旋风 + 飓风贯穿'},
  {element: 2, role: '爆破元素法师', style: '熔岩火球 + 烈焰冲锋 + 怒炎火柱'},
  {element: 3, role: '链式雷电法师', style: '定点天雷 + 弹射电链 + 万钧雷域'},
  {element: 4, role: '咒术领域召唤', style: '追踪暗球 + 黑洞领域 + 陨暗星石'},
  {element: 5, role: '重装破韧战士', style: '重锤破防 + 裂地剑气 + 天崩砸地'},
];

export const SKILL_KITS: readonly Record<SkillSlot, SkillDef>[] = [
  // 0: WATER — 中程控场法师
  {
    E: {
      slot: 'E', element: 0, name: '水泡弹', shortName: '水泡', icon: '🫧', archetype: 'projectile',
      damage: 20, cooldown: 6, energyCost: 0, energyGain: 18, range: 16, radius: 1.6, projectileSpeed: 16,
      desc: '发射晶莹高速水泡球，命中炸开水花并强附着「水」。',
    },
    R: {
      slot: 'R', element: 0, name: '潮汐鞭扫', shortName: '潮鞭', icon: '🌊', archetype: 'sweep',
      damage: 28, cooldown: 9, energyCost: 0, energyGain: 24, range: 3.4, radius: 3.2, knockback: 4.5,
      desc: '270° 大幅流体水浪横扫，击退周围敌人并大范围挂水。',
    },
    Q: {
      slot: 'Q', element: 0, name: '苍穹泡泡爆', shortName: '泡爆', icon: '💠', archetype: 'dome',
      damage: 54, cooldown: 16, energyCost: 100, energyGain: 0, range: 0, radius: 4.8, duration: 1.1,
      desc: '元素爆发：张开巨型透明水幕穹顶并引爆漫天泡泡雨！',
    },
  },
  // 1: WIND — 高速近战刺客
  {
    E: {
      slot: 'E', element: 1, name: '疾风突进', shortName: '疾突', icon: '💨', archetype: 'dash',
      damage: 18, cooldown: 5, energyCost: 0, energyGain: 18, range: 4.6, radius: 1.5, dashDist: 4.5,
      desc: '化作青色风带瞬间前冲 4.5m，穿透路径敌人并触发扩散。',
    },
    R: {
      slot: 'R', element: 1, name: '风刃回旋', shortName: '旋风', icon: '🌀', archetype: 'vortex',
      damage: 26, cooldown: 9, energyCost: 0, energyGain: 24, range: 0, radius: 3.8, duration: 1.4, multiHits: 3,
      desc: '以自身为中心卷起翠绿龙卷，牵引附近目标持续风切。',
    },
    Q: {
      slot: 'Q', element: 1, name: '翠啸飓风斩', shortName: '飓斩', icon: '🌪️', archetype: 'dash',
      damage: 50, cooldown: 15, energyCost: 100, energyGain: 0, range: 7.2, radius: 2.8, dashDist: 6.8,
      desc: '元素爆发：超远高速贯穿冲刺并在终点绽放十字风暴裂空！',
    },
  },
  // 2: FIRE — 爆破元素法师
  {
    E: {
      slot: 'E', element: 2, name: '熔岩火球', shortName: '火球', icon: '🔥', archetype: 'projectile',
      damage: 24, cooldown: 6, energyCost: 0, energyGain: 18, range: 15, radius: 2.4, projectileSpeed: 15,
      desc: '投掷炙热熔岩火球，命中引发炽烈火环爆破与灼烧。',
    },
    R: {
      slot: 'R', element: 2, name: '烈焰突袭', shortName: '焰突', icon: '☄️', archetype: 'dash',
      damage: 30, cooldown: 10, energyCost: 0, energyGain: 24, range: 4.2, radius: 2.0, dashDist: 3.8,
      desc: '裹挟炽焰猛冲 3.8m，沿途留下火星并引爆火焰冲击。',
    },
    Q: {
      slot: 'Q', element: 2, name: '岩浆怒炎阵', shortName: '怒炎', icon: '🌋', archetype: 'storm',
      damage: 60, cooldown: 16, energyCost: 100, energyGain: 0, range: 0, radius: 5.0, duration: 1.4, multiHits: 3,
      desc: '元素爆发：展开炽金熔岩法阵，升起冲天火柱与流星余烬雨！',
    },
  },
  // 3: LIGHTNING — 链式雷电法师
  {
    E: {
      slot: 'E', element: 3, name: '落雷天罚', shortName: '落雷', icon: '⚡', archetype: 'bolt',
      damage: 24, cooldown: 6, energyCost: 0, energyGain: 18, range: 7.5, radius: 2.2,
      desc: '在前方落点召唤紫色天雷柱直劈而下，瞬间高额雷伤。',
    },
    R: {
      slot: 'R', element: 3, name: '链式电弧', shortName: '电链', icon: '⛓️', archetype: 'chain',
      damage: 24, cooldown: 9, energyCost: 0, energyGain: 24, range: 7.5, radius: 4.8, chainCount: 4,
      desc: '释放高压跳跃闪电链（最多弹射 4 个目标），瞬间挂满感电。',
    },
    Q: {
      slot: 'Q', element: 3, name: '雷霆万钧域', shortName: '万钧', icon: '🌩️', archetype: 'storm',
      damage: 62, cooldown: 16, energyCost: 100, energyGain: 0, range: 3.0, radius: 5.2, duration: 1.6, multiHits: 5,
      desc: '元素爆发：展开巨型雷电法阵，连续劈下 5 道天雷轰鸣！',
    },
  },
  // 4: DARK — 咒术领域召唤
  {
    E: {
      slot: 'E', element: 4, name: '虚空暗弹', shortName: '暗弹', icon: '🟣', archetype: 'projectile',
      damage: 22, cooldown: 7, energyCost: 0, energyGain: 18, range: 14, radius: 2.1, projectileSpeed: 11.5,
      desc: '发射缓慢追踪的黑紫重力法球，命中爆发暗影侵蚀。',
    },
    R: {
      slot: 'R', element: 4, name: '深渊暗雾域', shortName: '暗域', icon: '🌑', archetype: 'field',
      damage: 14, cooldown: 10, energyCost: 0, energyGain: 24, range: 3.6, radius: 3.4, duration: 4.0, multiHits: 5,
      desc: '在前方展开持续 4s 的墨紫黑洞领域，持续造成暗伤与牵引。',
    },
    Q: {
      slot: 'Q', element: 4, name: '陨暗星石砸', shortName: '陨石', icon: '☄️', archetype: 'meteor',
      damage: 64, cooldown: 17, energyCost: 100, energyGain: 0, range: 4.2, radius: 4.6, duration: 1.1,
      desc: '元素爆发：从高空召唤巨型暗影陨石轰砸大地，震裂空间！',
    },
  },
  // 5: PHYSICAL — 重装破韧战士
  {
    E: {
      slot: 'E', element: 5, name: '重锤震击', shortName: '重锤', icon: '🔨', archetype: 'slam',
      damage: 28, cooldown: 6, energyCost: 0, energyGain: 20, range: 2.6, radius: 2.5, knockback: 6.0,
      desc: '全身蓄力猛砸前方地面，超高击飞并触发破韧重击。',
    },
    R: {
      slot: 'R', element: 5, name: '裂地剑气劈', shortName: '剑气', icon: '⚔️', archetype: 'wave',
      damage: 34, cooldown: 9, energyCost: 0, energyGain: 24, range: 12, radius: 2.0, projectileSpeed: 18,
      desc: '挥出一道高速穿透前进的金白巨型月牙剑气波！',
    },
    Q: {
      slot: 'Q', element: 5, name: '天崩巨锤砸', shortName: '天崩', icon: '💥', archetype: 'leap_slam',
      damage: 66, cooldown: 16, energyCost: 100, energyGain: 0, range: 3.0, radius: 5.0, knockback: 8.5,
      desc: '元素爆发：高跃蓄力重砸大地，掀起金色环形地震波与碎石！',
    },
  },
];

export type ReactionKind =
  | 'Vaporize'
  | 'ElectroCharge'
  | 'MistSpread'
  | 'Overload'
  | 'Combustion'
  | 'Cinder'
  | 'LightningSwirl'
  | 'VoidShock'
  | 'MurkTide'
  | 'DarkSwirl'
  | 'BreakPoise';

export interface ReactionResult {
  kind: ReactionKind;
  label: string;
  color: string;
  extraDamage: number;
  multiplier: number;
  aoeRadius: number;
  consumeAura: boolean;
}

/** Exact port of UE SlimeCombat::FillDefaultReactions (11 elemental reactions). */
export function resolveElementReaction(auraEl: number | null, triggerEl: number): ReactionResult | null {
  if (auraEl === null || auraEl < 0 || auraEl === triggerEl) return null;
  // Physical striking any elemental aura triggers BreakPoise
  if (triggerEl === 5) {
    return {kind: 'BreakPoise', label: '🪨 破韧重击!', color: '#f5d06e', extraDamage: 12, multiplier: 1.2, aoeRadius: 0, consumeAura: false};
  }
  const pair = (a: number, b: number) => (auraEl === a && triggerEl === b) || (auraEl === b && triggerEl === a);
  if (pair(0, 2)) {
    return {kind: 'Vaporize', label: '🔥💧 蒸发 ×1.5!', color: '#ff8a4c', extraDamage: 22, multiplier: 1.5, aoeRadius: 0, consumeAura: true};
  }
  if (pair(0, 3)) {
    return {kind: 'ElectroCharge', label: '⚡💧 感电!', color: '#9b8aff', extraDamage: 16, multiplier: 1.15, aoeRadius: 2.2, consumeAura: false};
  }
  if (pair(0, 1)) {
    return {kind: 'MistSpread', label: '🍃💧 雾散!', color: '#6ef0d0', extraDamage: 10, multiplier: 1.1, aoeRadius: 2.6, consumeAura: false};
  }
  if (pair(2, 3)) {
    return {kind: 'Overload', label: '🔥⚡ 超载剧爆!', color: '#ff5c8a', extraDamage: 28, multiplier: 1.35, aoeRadius: 2.6, consumeAura: true};
  }
  if (pair(2, 1)) {
    return {kind: 'Combustion', label: '🍃🔥 烈焰扩散!', color: '#ff9b3d', extraDamage: 14, multiplier: 1.15, aoeRadius: 2.8, consumeAura: false};
  }
  if (pair(2, 4)) {
    return {kind: 'Cinder', label: '🌑🔥 余烬灼烧!', color: '#d96699', extraDamage: 14, multiplier: 1.2, aoeRadius: 0, consumeAura: true};
  }
  if (pair(3, 1)) {
    return {kind: 'LightningSwirl', label: '🍃⚡ 雷扩散!', color: '#b99eff', extraDamage: 18, multiplier: 1.2, aoeRadius: 2.6, consumeAura: true};
  }
  if (pair(3, 4)) {
    return {kind: 'VoidShock', label: '🌑⚡ 虚空震击!', color: '#9c66ff', extraDamage: 16, multiplier: 1.2, aoeRadius: 0, consumeAura: true};
  }
  if (pair(4, 0)) {
    return {kind: 'MurkTide', label: '🌑💧 墨潮侵蚀!', color: '#6c82c4', extraDamage: 12, multiplier: 1.15, aoeRadius: 2.2, consumeAura: true};
  }
  if (pair(4, 1)) {
    return {kind: 'DarkSwirl', label: '🍃🌑 暗扩散!', color: '#9f82cc', extraDamage: 16, multiplier: 1.2, aoeRadius: 2.4, consumeAura: true};
  }
  return null;
}

export interface SkillHudSlot {
  slot: SkillSlot;
  name: string;
  shortName: string;
  icon: string;
  cd: number;
  maxCd: number;
  energyCost: number;
  ready: boolean;
}

export interface CombatHudSnapshot {
  element: number;
  role: string;
  switchCd: number;
  switchMax: number;
  energy: number;
  maxEnergy: number;
  skills: SkillHudSlot[];
}

/** Stateful ARPG skill cooldown, energy & 1.0s element-switch cooldown manager. */
export interface SkillCheckpoint { energy:number; switchCd:number; cooldowns:[string,number][] }
export class SkillRuntime {
  checkpoint():SkillCheckpoint {
    return {energy:this.energy,switchCd:this.switchCd,cooldowns:Array.from(this.cds)};
  }
  restore(checkpoint:SkillCheckpoint) {
    this.energy=checkpoint.energy;
    this.switchCd=checkpoint.switchCd;
    this.cds=new Map(checkpoint.cooldowns);
  }
  private cds = new Map<string, number>();
  switchCd = 0;
  energy = MAX_SKILL_ENERGY; // Start full so players can test Elemental Burst immediately

  private key(el: number, slot: SkillSlot) {
    return `${el}-${slot}`;
  }

  getCooldown(el: number, slot: SkillSlot): number {
    return Math.max(0, this.cds.get(this.key(el, slot)) ?? 0);
  }

  /** Enforces 1.0s global cooldown between different-element switches. */
  trySwitchElement(currentEl: number, targetEl: number): {ok: boolean; changed: boolean; remaining: number} {
    if (targetEl === currentEl) return {ok: true, changed: false, remaining: this.switchCd};
    if (this.switchCd > 0.001) return {ok: false, changed: false, remaining: this.switchCd};
    this.switchCd = ELEMENT_SWITCH_COOLDOWN;
    return {ok: true, changed: true, remaining: 0};
  }

  canCast(el: number, slot: SkillSlot): {ok: boolean; reason?: 'cd' | 'energy'; cdLeft: number; def: SkillDef} {
    const def = SKILL_KITS[el]?.[slot] ?? SKILL_KITS[0][slot];
    const cdLeft = this.getCooldown(el, slot);
    if (cdLeft > 0.01) return {ok: false, reason: 'cd', cdLeft, def};
    if (def.energyCost > 0 && this.energy + 0.01 < def.energyCost) {
      return {ok: false, reason: 'energy', cdLeft: 0, def};
    }
    return {ok: true, cdLeft: 0, def};
  }

  cast(el: number, slot: SkillSlot): SkillDef | null {
    const check = this.canCast(el, slot);
    if (!check.ok) return null;
    const def = check.def;
    this.cds.set(this.key(el, slot), def.cooldown);
    if (def.energyCost > 0) this.energy = Math.max(0, this.energy - def.energyCost);
    else if (def.energyGain > 0) this.addEnergy(def.energyGain * 0.5);
    return def;
  }

  addEnergy(amount: number) {
    this.energy = Math.min(MAX_SKILL_ENERGY, Math.max(0, this.energy + amount));
  }

  step(dt: number) {
    if (this.switchCd > 0) this.switchCd = Math.max(0, this.switchCd - dt);
    for (const [k, v] of this.cds) {
      const next = v - dt;
      if (next <= 0) this.cds.delete(k);
      else this.cds.set(k, next);
    }
    if (this.energy < MAX_SKILL_ENERGY) {
      this.energy = Math.min(MAX_SKILL_ENERGY, this.energy + PASSIVE_ENERGY_PER_SEC * dt);
    }
  }

  reset() {
    this.cds.clear();
    this.switchCd = 0;
    this.energy = MAX_SKILL_ENERGY;
  }

  snapshot(el: number): CombatHudSnapshot {
    const kit = SKILL_KITS[el] ?? SKILL_KITS[0];
    const slots: SkillSlot[] = ['E', 'R', 'Q'];
    return {
      element: el,
      role: ELEMENT_ROLES[el]?.role ?? '',
      switchCd: this.switchCd,
      switchMax: ELEMENT_SWITCH_COOLDOWN,
      energy: this.energy,
      maxEnergy: MAX_SKILL_ENERGY,
      skills: slots.map(slot => {
        const d = kit[slot];
        const cd = this.getCooldown(el, slot);
        return {
          slot,
          name: d.name,
          shortName: d.shortName,
          icon: d.icon,
          cd,
          maxCd: d.cooldown,
          energyCost: d.energyCost,
          ready: cd <= 0.01 && (d.energyCost <= 0 || this.energy + 0.01 >= d.energyCost),
        };
      }),
    };
  }
}
