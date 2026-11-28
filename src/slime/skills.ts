/**
 * 6-Element Anime ARPG Skill System & 11 UE Elemental Reactions.
 * Pure simulation logic (zero Three.js imports) so combat levels & unit tests share identical rules.
 */

export type SkillSlot = 'E' | 'R' | 'Q';

export type SkillArchetype =
  | 'projectile'
  | 'ring'
  | 'dome'
  | 'dash'
  | 'vortex'
  | 'boomerang'
  | 'breath'
  | 'eruption'
  | 'bolt'
  | 'chain'
  | 'storm'
  | 'creep'
  | 'field'
  | 'rend'
  | 'fist'
  | 'fissure'
  | 'leap_slam'
  // Retired archetypes, kept so older callers and saved references still type-check and still cast something.
  | 'sweep'
  | 'meteor'
  | 'slam'
  | 'wave';

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
  {element: 0, role: '潮汐控场法师', style: '水牢禁锢 + 回澜推波 + 沧海倾覆'},
  {element: 1, role: '高速游击刺客', style: '疾风穿身 + 龙卷聚怪 + 岚刃回旋'},
  {element: 2, role: '爆破元素法师', style: '爆炎轰击 + 龙息扫射 + 熔火喷发'},
  {element: 3, role: '链式雷电法师', style: '定点落雷 + 连锁闪电 + 万钧雷狱'},
  {element: 4, role: '蚀界咒术师', style: '影袭咬合 + 蚀渊牵引 + 千裂碎空'},
  {element: 5, role: '重装破韧战士', style: '岩拳破地 + 裂地石脊 + 陨岳砸落'},
];

/**
 * Each element's three skills use three different mechanics, and no mechanic is shared between elements:
 * shot / ring / dome, dash / vortex / returning blades, lobbed blast / sustained cone / eruption with fallout,
 * strike / chain / caged storm, ground-runner / pulling field / delayed shatter, uppercut / marching line / leap.
 */
export const SKILL_KITS: readonly Record<SkillSlot, SkillDef>[] = [
  // 0: WATER — 潮汐控场法师
  {
    E: {
      slot: 'E', element: 0, name: '水牢泡', shortName: '水牢', icon: '🫧', archetype: 'projectile',
      damage: 20, cooldown: 6, energyCost: 0, energyGain: 18, range: 16, radius: 1.6, projectileSpeed: 16,
      desc: '吐出一颗鼓胀的大水泡，命中后把目标裹进水牢，随后炸成一圈水冠并强附着「水」。',
    },
    R: {
      slot: 'R', element: 0, name: '回澜', shortName: '回澜', icon: '🌊', archetype: 'ring',
      damage: 28, cooldown: 9, energyCost: 0, energyGain: 24, range: 0, radius: 3.4, knockback: 4.5,
      desc: '以自身为圆心掀起一圈立起的水墙向外推开，击退四周敌人并大范围挂水。',
    },
    Q: {
      slot: 'Q', element: 0, name: '沧海穹', shortName: '沧海', icon: '💠', archetype: 'dome',
      damage: 54, cooldown: 16, energyCost: 100, energyGain: 0, range: 0, radius: 4.8, duration: 1.1,
      desc: '元素爆发：水幕穹顶罩住四周，中心涌泉冲上穹顶，再化作暴雨倾盆砸落！',
    },
  },
  // 1: WIND — 高速游击刺客
  {
    E: {
      slot: 'E', element: 1, name: '疾风步', shortName: '疾风', icon: '💨', archetype: 'dash',
      damage: 18, cooldown: 5, energyCost: 0, energyGain: 18, range: 4.6, radius: 1.5, dashDist: 4.5,
      desc: '化作一缕螺旋气流瞬间前掠 4.5m，穿过路径上的敌人并留下风切。',
    },
    R: {
      slot: 'R', element: 1, name: '龙卷', shortName: '龙卷', icon: '🌪️', archetype: 'vortex',
      damage: 26, cooldown: 9, energyCost: 0, energyGain: 24, range: 0, radius: 3.8, duration: 1.4, multiHits: 3,
      desc: '在脚下卷起一道由气流带拧成的龙卷，把附近目标吸向中心并连续风切 3 次。',
    },
    Q: {
      slot: 'Q', element: 1, name: '岚刃回旋', shortName: '岚刃', icon: '🪃', archetype: 'boomerang',
      damage: 50, cooldown: 15, energyCost: 100, energyGain: 0, range: 7.2, radius: 1.5,
      desc: '元素爆发：掷出三道旋转的巨型岚刃，扇形飞出后折返归来，去程回程各切割一轮！',
    },
  },
  // 2: FIRE — 爆破元素法师
  {
    E: {
      slot: 'E', element: 2, name: '爆炎弹', shortName: '爆炎', icon: '💥', archetype: 'projectile',
      damage: 24, cooldown: 6, energyCost: 0, energyGain: 18, range: 15, radius: 2.4, projectileSpeed: 15,
      desc: '掷出一团翻滚的爆炎，命中后炸成蘑菇状火云并在地面留下焦痕。',
    },
    R: {
      slot: 'R', element: 2, name: '龙息', shortName: '龙息', icon: '🐉', archetype: 'breath',
      damage: 30, cooldown: 10, energyCost: 0, energyGain: 24, range: 5.5, radius: 1.7, duration: 0.7, multiHits: 4,
      desc: '向前方喷吐锥形烈焰约 0.7 秒，锥内所有敌人被连续灼烧 4 次。',
    },
    Q: {
      slot: 'Q', element: 2, name: '熔火喷发', shortName: '喷发', icon: '🌋', archetype: 'eruption',
      damage: 60, cooldown: 16, energyCost: 100, energyGain: 0, range: 0, radius: 5.0, duration: 1.5, multiHits: 6,
      desc: '元素爆发：脚下地面崩裂喷出熔岩火柱，再抛出六枚熔岩弹砸落四周二次爆炸！',
    },
  },
  // 3: LIGHTNING — 链式雷电法师
  {
    E: {
      slot: 'E', element: 3, name: '落雷', shortName: '落雷', icon: '⚡', archetype: 'bolt',
      damage: 24, cooldown: 6, energyCost: 0, energyGain: 18, range: 7.5, radius: 2.2,
      desc: '在前方落点召下一道紫白天雷直劈而下，瞬间高额雷伤。',
    },
    R: {
      slot: 'R', element: 3, name: '连锁闪电', shortName: '电链', icon: '⛓️', archetype: 'chain',
      damage: 24, cooldown: 9, energyCost: 0, energyGain: 24, range: 7.5, radius: 4.8, chainCount: 4,
      desc: '放出在敌人之间弹跳的闪电链（最多 4 个目标），瞬间挂满感电。',
    },
    Q: {
      slot: 'Q', element: 3, name: '万钧雷狱', shortName: '雷狱', icon: '🌩️', archetype: 'storm',
      damage: 62, cooldown: 16, energyCost: 100, energyGain: 0, range: 3.0, radius: 5.2, duration: 1.6, multiHits: 5,
      desc: '元素爆发：雷云压顶、雷柱成笼，在牢笼之内连续劈下 5 道天雷！',
    },
  },
  // 4: DARK — 蚀界咒术师
  {
    E: {
      slot: 'E', element: 4, name: '影袭', shortName: '影袭', icon: '🌘', archetype: 'creep',
      damage: 22, cooldown: 7, energyCost: 0, energyGain: 18, range: 9, radius: 1.9,
      desc: '一道暗影裂痕贴地疾行到目标脚下，黑曜暗爪破土合拢咬住目标。',
    },
    R: {
      slot: 'R', element: 4, name: '蚀渊', shortName: '蚀渊', icon: '🕳️', archetype: 'field',
      damage: 14, cooldown: 10, energyCost: 0, energyGain: 24, range: 3.6, radius: 3.4, duration: 4.0, multiHits: 5,
      desc: '在前方张开持续 4 秒、被次元裂隙环绕的黑洞领域，把敌人拖向中心并持续侵蚀。',
    },
    Q: {
      slot: 'Q', element: 4, name: '千裂', shortName: '千裂', icon: '✴️', archetype: 'rend',
      damage: 64, cooldown: 17, energyCost: 100, energyGain: 0, range: 4.2, radius: 4.4, duration: 1.25, multiHits: 7,
      desc: '元素爆发：在目标区域接连划出七道次元裂痕，停顿一拍后整片空间碎裂！',
    },
  },
  // 5: PHYSICAL — 重装破韧战士
  {
    E: {
      slot: 'E', element: 5, name: '崩岩拳', shortName: '岩拳', icon: '👊', archetype: 'fist',
      damage: 28, cooldown: 6, energyCost: 0, energyGain: 20, range: 2.6, radius: 2.5, knockback: 6.0,
      desc: '一只岩石巨拳从前方地面破土上勾，超高击飞并触发破韧重击。',
    },
    R: {
      slot: 'R', element: 5, name: '裂地脊', shortName: '石脊', icon: '⛰️', archetype: 'fissure',
      damage: 34, cooldown: 9, energyCost: 0, energyGain: 24, range: 10, radius: 1.2, multiHits: 7,
      desc: '一拳砸地，七根石刺沿直线依次破土隆起约 10 米，逐段贯穿路径上的敌人。',
    },
    Q: {
      slot: 'Q', element: 5, name: '陨岳', shortName: '陨岳', icon: '☄️', archetype: 'leap_slam',
      damage: 66, cooldown: 16, energyCost: 100, energyGain: 0, range: 3.0, radius: 5.0, knockback: 8.5,
      desc: '元素爆发：高高跃起，裹着一座山岩重重砸落，地面塌成陨坑并掀起两圈石板与尘浪！',
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
