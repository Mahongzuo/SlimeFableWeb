import {companionSpecies,starterIds} from './companion-catalog';
import {newCare,feedNow} from './companion-care';
import {capacityProgress} from './shell-wallet';
import {changeShells} from './shell-wallet';
import {ITEMS} from './catalog';
import {hasBuff} from './cooking';
import {isMuseumHallRestored} from './museum';
import {addItem, ensureHome, record, takeItem, type AdoptedAnimal, type LifeData} from './state';
import {addHomeXp} from './unlocks';
import type {DetectedPasturePen} from '../home/voxel-mesher';
import {rng} from '../templates/random';

export type RanchTier = 'common' | 'rare' | 'legendary';
export type HousingKind = 'coop' | 'barn' | 'pasture';

export interface RanchSpeciesDef {
  id: string;
  name: string;
  icon: string;
  tier: RanchTier;
  housing: HousingKind;
  /** Local animated field-guide model and thumbnail. */
  asset: string;
  size: number;
  favoriteItem: string;
  productId: string;
  bonusProductId?: string;
  adoptCost: number;
  /** Preferred element (0 Water, 1 Wind, 2 Fire, 3 Lightning, 4 Dark, 5 Physical) that calms/charms in wild encounters. */
  resonateElement: number;
  /** Encounter conditions (seasons 0..3, weather modes, nightOnly, historyOnly). */
  zones: ('park' | 'farm' | 'lake' | 'forest' | 'harbor')[];
  seasons?: number[];
  weathers?: string[];
  nightOnly?: boolean;
  historyOnly?: boolean;
  shyness: number;
  desc: string;
}

export const RANCH_SPECIES: RanchSpeciesDef[] = [
  {
    id: 'ranch-hare', name: '草甸野兔', icon: '🐇', tier: 'common', housing: 'coop',
    asset: 'ranch-hare', size: 0.56, favoriteItem: 'crop-carrot', productId: 'prod-wool', adoptCost: 18,
    resonateElement: 1, zones: ['park', 'farm'], shyness: 0.45,
    desc: '温顺活泼的田园野兔，每日梳理可得云朵软绒。',
  },
  {
    id: 'ranch-pheasant', name: '红腹锦鸡', icon: '🦚', tier: 'common', housing: 'coop',
    asset: 'ranch-pheasant', size: 1.02, favoriteItem: 'crop-wheat', productId: 'prod-egg', bonusProductId: 'prod-feather', adoptCost: 22,
    resonateElement: 2, zones: ['farm', 'forest'], shyness: 0.5,
    desc: '羽色绚丽的林缘珍禽，在牧舍安家后每日产下金纹灵蛋。',
  },
  {
    id: 'ranch-deer', name: '林间梅花鹿', icon: '🦌', tier: 'common', housing: 'barn',
    asset: 'ranch-deer', size: 1.32, favoriteItem: 'crop-corn', productId: 'prod-milk', bonusProductId: 'prod-truffle', adoptCost: 34,
    resonateElement: 1, zones: ['forest', 'park'], shyness: 0.65,
    desc: '爱在银杏林缘漫步的梅花鹿，每日馈赠牧场鲜乳。',
  },
  {
    id: 'ranch-capybara', name: '悠闲水豚', icon: '🦫', tier: 'common', housing: 'barn',
    asset: 'ranch-capybara', size: 0.92, favoriteItem: 'crop-pumpkin', productId: 'prod-spring-dew', adoptCost: 36,
    resonateElement: 0, zones: ['lake', 'harbor'], shyness: 0.15,
    desc: '情绪极其稳定的水边哲人，有露天温泉时会自动来泡澡产温泉暖露！',
  },
  {
    id: 'ranch-red-panda', name: '绒尾小熊猫', icon: '🦝', tier: 'rare', housing: 'barn',
    asset: 'ranch-red-panda', size: 0.80, favoriteItem: 'crop-strawberry', productId: 'prod-bamboo-dew', bonusProductId: 'prod-wool', adoptCost: 44,
    resonateElement: 1, zones: ['forest', 'park'], shyness: 0.55,
    desc: '竹林小院里的毛绒萌物，每日收集清甜的竹心清露。',
  },
  {
    id: 'ranch-fox', name: '紫藤赤狐', icon: '🦊', tier: 'rare', housing: 'barn',
    asset: 'ranch-fox', size: 0.88, favoriteItem: 'crop-tomato', productId: 'prod-truffle', adoptCost: 46,
    resonateElement: 2, zones: ['forest', 'park'], shyness: 0.72,
    desc: '机敏优雅的赤狐，亲密度高时会帮你从树根下刨出林间黑松露！',
  },
  {
    id: 'ranch-otter', name: '溪涧水獭', icon: '🦦', tier: 'rare', housing: 'coop',
    asset: 'ranch-otter', size: 0.88, favoriteItem: 'fish-crucian', productId: 'prod-pearl', adoptCost: 42,
    resonateElement: 0, zones: ['lake', 'harbor'], weathers: ['rain', 'rainbow', 'clear'], shyness: 0.5,
    desc: '爱在水巷与镜湖浅滩翻找石子的水獭，常衔来晶莹镜湖河珠。',
  },
  {
    id: 'ranch-crane', name: '丹顶仙鹤', icon: '🦢', tier: 'rare', housing: 'pasture',
    asset: 'ranch-crane', size: 1.14, favoriteItem: 'fish-carp', productId: 'prod-feather', adoptCost: 52,
    resonateElement: 1, zones: ['lake'], weathers: ['rainbow', 'mist', 'clear'], shyness: 0.75,
    desc: '雨后彩虹或薄雾时降临镜湖的仙鹤，赐予七彩灵羽。',
  },
  {
    id: 'ranch-snow-fox', name: '月影雪狐', icon: '❄️', tier: 'legendary', housing: 'barn',
    asset: 'ranch-snow-fox', size: 0.90, favoriteItem: 'crop-nightbloom', productId: 'prod-star-fur', bonusProductId: 'prod-truffle', adoptCost: 68,
    resonateElement: 4, zones: ['forest', 'lake'], weathers: ['snow', 'mist', 'cloudy'], nightOnly: true, shyness: 0.85,
    desc: '【传说稀兽】夜幕或薄雾落雪时偶现的银白灵狐，产出稀世星光狐绒。',
  },
  {
    id: 'ranch-white-deer', name: '霜角白鹿', icon: '👑', tier: 'legendary', housing: 'barn',
    asset: 'ranch-white-deer', size: 1.44, favoriteItem: 'crop-starlight', productId: 'prod-milk', bonusProductId: 'prod-star-fur', adoptCost: 76,
    resonateElement: 3, zones: ['forest', 'park'], seasons: [2, 3, 0], weathers: ['mist', 'snow', 'rainbow'], shyness: 0.9,
    desc: '【传说稀兽】自带星辉微光的祥瑞白鹿，收集星露荧光花即可上前亲近结识。',
  },
  {
    id: 'ranch-nine-deer', name: '敦煌九色鹿影', icon: '🌟', tier: 'legendary', housing: 'pasture',
    asset: 'ranch-nine-deer', size: 1.48, favoriteItem: 'art-longjing-tea', productId: 'prod-star-fur', bonusProductId: 'prod-pearl', adoptCost: 88,
    resonateElement: 1, zones: ['park', 'lake'], historyOnly: true, shyness: 0.82,
    desc: '【史事秘境传说】只在「历史上的今天」主题日偶现的壁画灵兽，见证岁月拾光。',
  },
  ...companionSpecies,
];

export const RANCH_SPECIES_MAP: Record<string, RanchSpeciesDef> = Object.fromEntries(RANCH_SPECIES.map(s => [s.id, s]));

export interface EncounterEnv {
  season: number;
  weather: string;
  hour: number;
  historyDay: boolean;
}

export interface WildEncounterSpot {
  id: string;
  speciesId: string;
  zone: 'park' | 'farm' | 'lake' | 'forest' | 'harbor';
  x: number;
  z: number;
}

const ZONE_ENCOUNTER_ANCHORS: Record<WildEncounterSpot['zone'], [number, number][]> = {
  park: [[4, 52], [14, 62], [-8, 66]],
  farm: [[-48, 38], [-58, 56], [-42, 68]],
  lake: [[-12, 102], [12, 106], [-22, 118]],
  forest: [[-76, 86], [-86, 108], [-68, 122]],
  harbor: [[18, -6], [-18, 22]],
};

/**
 * Generates deterministic daily wild encounter spots influenced by season, weather, hour,
 * food buff (`rare_encounter`), and restored Ranch Museum Hall!
 */
export function generateDailyEncounters(
  life: LifeData,
  dayKey: string,
  env: EncounterEnv,
  now = Date.now(),
): WildEncounterSpot[] {
  const home = ensureHome(life);
  const ranch = home.ranch!;
  if (ranch.encounterDay !== dayKey) {
    ranch.encounterDay = dayKey;
    ranch.claimedEncounters = [];
  }

  const rareBoost = (hasBuff(life, 'rare_encounter', now) ? 2 : 1) * (isMuseumHallRestored(life, 'ranch') ? 2 : 1);
  const rand = rng(`encounter-${dayKey}-${env.season}-${env.weather}`);
  const isNight = env.hour < 6 || env.hour >= 19;

  const eligible = RANCH_SPECIES.filter(sp => {
    if (!sp.zones.length) return false;
    if (sp.seasons && !sp.seasons.includes(env.season)) return false;
    if (sp.weathers && !sp.weathers.includes(env.weather)) return false;
    if (sp.nightOnly && !isNight) return false;
    if (sp.historyOnly && !env.historyDay) return false;
    return true;
  });
  const pool = eligible.length ? eligible : RANCH_SPECIES.filter(s => s.tier === 'common');

  const count = rareBoost >= 2 ? 4 : 3;
  const spots: WildEncounterSpot[] = [];
  const usedSpecies = new Set<string>();

  for (let i = 0; i < count; i++) {
    const weighted = pool
      .filter(s => !usedSpecies.has(s.id))
      .map(s => ({
        s,
        w: s.tier === 'common' ? 30 : s.tier === 'rare' ? 14 * rareBoost : 6 * rareBoost,
      }));
    if (!weighted.length) break;
    const total = weighted.reduce((sum, x) => sum + x.w, 0);
    let pick = rand.next() * total;
    let chosen = weighted[weighted.length - 1].s;
    for (const entry of weighted) {
      pick -= entry.w;
      if (pick <= 0) { chosen = entry.s; break; }
    }
    usedSpecies.add(chosen.id);
    const zone = chosen.zones[Math.floor(rand.next() * chosen.zones.length)];
    const anchors = ZONE_ENCOUNTER_ANCHORS[zone];
    const [ax, az] = anchors[Math.floor(rand.next() * anchors.length)];
    const id = `enc-${dayKey}-${i}-${chosen.id}`;
    if (ranch.claimedEncounters.includes(id)) continue;
    spots.push({id, speciesId: chosen.id, zone, x: ax + (rand.next() - 0.5) * 3, z: az + (rand.next() - 0.5) * 3});
  }
  return spots;
}

/** Returns a concise player-facing acquisition hint for any ranch favorite collectible item. */
export function describeItemSource(itemId: string): string {
  const def = ITEMS[itemId];
  if (!def) return '探索家园收集';
  if (itemId === 'crop-starlight') return '在种子商店或观星台获取种子，在田垄种植收获';
  if (itemId === 'crop-nightbloom') return '在种子商店购买夜光花种子，在梯田或种植床种植收获';
  if (def.kind === 'crop') return `在梯田或自建种植床种下「${def.name}种子」收获`;
  if (def.kind === 'fish') return '在水巷钓台或镜湖码头垂钓获得';
  if (def.kind === 'artisan') return '在建造模式摆放对应工坊设施加工获得';
  if (def.kind === 'food') return '在凝露小厨灶台烹饪获得';
  return '探索家园收集获得';
}

/**
 * Interactive taming action for a wild encounter:
 * No sneaking/flattening required — players simply bring 1 unit of the species' favorite collectible item!
 * Keeps optional `sneaking` / `element` fields on `opts` for backwards test compatibility.
 */
export function interactWildEncounter(
  life: LifeData,
  encounterId: string,
  speciesId: string,
  opts: {sneaking?: boolean; element?: number; feedFavorite?: boolean} = {},
): {tamed: boolean; trustDelta: number; firstDiscovery: boolean; message: string; neededItem?: string} {
  const sp = RANCH_SPECIES_MAP[speciesId];
  if (!sp) return {tamed: false, trustDelta: 0, firstDiscovery: false, message: '未知物种'};

  if(life.home?.ranch?.claimedEncounters.includes(encounterId))
    return {tamed:false,trustDelta:0,firstDiscovery:false,message:'已经收下这次遭遇的赠礼。'};
  const favDef = ITEMS[sp.favoriteItem];
  const favLabel = `${favDef?.icon ?? ''}${favDef?.name ?? sp.favoriteItem}`;
  const hasFavInBag = (life.bag[sp.favoriteItem] ?? 0) > 0;
  const shouldFeed = opts.feedFavorite ?? hasFavInBag;

  if (!shouldFeed || !takeItem(life, sp.favoriteItem, 1)) {
    const source = describeItemSource(sp.favoriteItem);
    return {
      tamed: false,
      trustDelta: 0,
      firstDiscovery: false,
      neededItem: sp.favoriteItem,
      message: `${sp.icon}${sp.name}需要「${favLabel}×1」才能互动结识！（获取方式：${source}）`,
    };
  }

  const home = ensureHome(life);
  const ranch = home.ranch!;
  const firstDiscovery = !ranch.discovered.includes(speciesId);
  if (firstDiscovery) ranch.discovered.push(speciesId);
  if (!ranch.claimedEncounters.includes(encounterId)) ranch.claimedEncounters.push(encounterId);
  record(life, `critter-${speciesId.replace('ranch-', '')}`);
  addHomeXp(life, sp.tier === 'legendary' ? 45 : sp.tier === 'rare' ? 28 : 16);
  // Gift 1 unit of its signature product on first successful wild befriend!
  addItem(life, sp.productId, 1);
  return {
    tamed: true,
    trustDelta: 100,
    firstDiscovery,
    message: `${sp.icon} 赠送${favLabel}成功！已结识${sp.name}并解锁牧场收养，获赠 ${ITEMS[sp.productId]?.icon ?? ''}${ITEMS[sp.productId]?.name ?? '礼物'}！`,
  };
}

/** Economic progress controls slots. Physical housing remains available for stationing animals. */
export function ranchCapacity(life: LifeData, voxelPens: DetectedPasturePen[] = []): {
  total: number;
  base: number;
  buildings: number;
  voxelFenceBonus: number;
} {
  const home = ensureHome(life);
  // Housing counts remain available to older journal extensions.
  let buildings = 0;
  for (const p of home.placed) {
    if (p.itemId === 'poi-coop') buildings += 4;
    else if (p.itemId === 'poi-barn') buildings += 6;
  }
  const voxelFenceBonus = voxelPens.reduce((sum, pen) => sum + pen.capacityBonus, 0);
  return {total: capacityProgress(life).total, base: 1, buildings, voxelFenceBonus};
}

export function adoptRanchAnimal(
  life: LifeData,
  speciesId: string,
  customName?: string,
  voxelPens: DetectedPasturePen[] = [],
): {ok: boolean; animal?: AdoptedAnimal; reason?: string} {
  const sp = RANCH_SPECIES_MAP[speciesId];
  if (!sp) return {ok: false, reason: '未知物种'};
  const home = ensureHome(life);
  const ranch = home.ranch!;
  // Common species can also be unlocked if already visited via Habitat system
  const unlocked = starterIds.includes(speciesId) || ranch.discovered.includes(speciesId) ||
    (sp.tier === 'common' && Object.keys(home.visitors).some(v => v.includes(speciesId.replace('ranch-', ''))));
  if (!unlocked) return {ok: false, reason: '需先在野外遭遇并结识该物种后才能收养'};

  const cap = ranchCapacity(life, voxelPens);
  if (ranch.animals.length >= cap.total) {
    return {ok: false, reason: `牧场已满（${ranch.animals.length}/${cap.total}），${capacityProgress(life).hint}。`};
  }
  if (life.coins < sp.adoptCost) {
    return {ok: false, reason: `贝壳不足（收养需要 ${sp.adoptCost} 🐚）`};
  }
  changeShells(life, -(sp.adoptCost), 'spend');
  const animal: AdoptedAnimal = {
    id: `pet-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    speciesId,
    name: customName?.trim() || `${sp.name}#${ranch.animals.length + 1}`,
    adoptedAt: Date.now(),
    affection: 60,
    mood: 85,
    care: newCare(Date.now()),
  };
  ranch.animals.push(animal);
  if (!ranch.discovered.includes(speciesId)) ranch.discovered.push(speciesId);
  addHomeXp(life, 20);
  return {ok: true, animal};
}

export function animalHearts(a: AdoptedAnimal): number {
  return Math.min(5, Math.floor(a.affection / 100));
}

export function careForAnimal(
  life: LifeData,
  animalId: string,
  dayKey: string,
  feedFavorite = false,
): {ok: boolean; affectionGain: number; fed: boolean; petted: boolean; message: string} {
  const home = ensureHome(life);
  const a = home.ranch?.animals.find(x => x.id === animalId);
  if (!a) return {ok: false, affectionGain: 0, fed: false, petted: false, message: '未找到该动物'};
  const sp = RANCH_SPECIES_MAP[a.speciesId];
  if (!sp) return {ok: false, affectionGain: 0, fed: false, petted: false, message: '物种信息缺失'};

  let gain = 0;
  let petted = false;
  let fed = false;

  if (a.lastPetDay !== dayKey) {
    a.lastPetDay = dayKey;
    gain += 25;
    a.mood = Math.min(100, a.mood + 20);
    petted = true;
  }
  if (feedFavorite && a.lastFedDay !== dayKey && takeItem(life, sp.favoriteItem, 1)) {
    feedNow(a);
    a.lastFedDay = dayKey;
    gain += 45;
    a.mood = 100;
    fed = true;
  }
  if (isMuseumHallRestored(life, 'ranch')) {
    a.mood = 100;
  }
  a.affection = Math.min(500, a.affection + gain);

  if (!petted && !fed) {
    return {ok: true, affectionGain: 0, fed: false, petted: false, message: `${sp.icon}${a.name}今天已经被照顾得很开心啦（❤️ ${animalHearts(a)}/5）`};
  }
  return {
    ok: true,
    affectionGain: gain,
    fed,
    petted,
    message: `${sp.icon}${a.name}${fed ? `吃掉了${ITEMS[sp.favoriteItem]?.name}` : '享受了你的轻抚'}！亲密度 +${gain}（❤️ ${animalHearts(a)}/5）`,
  };
}

export function collectAnimalProduct(
  life: LifeData,
  animalId: string,
  dayKey: string,
  now = Date.now(),
): {ok: boolean; items: {id: string; count: number}[]; reason?: string} {
  const home = ensureHome(life);
  const a = home.ranch?.animals.find(x => x.id === animalId);
  if (!a) return {ok: false, items: [], reason: 'missing'};
  const sp = RANCH_SPECIES_MAP[a.speciesId];
  if (!sp) return {ok: false, items: [], reason: 'missing'};
  if (a.lastProduceDay === dayKey) return {ok: false, items: [], reason: 'collected'};

  a.lastProduceDay = dayKey;
  const hearts = animalHearts(a);
  const baseQty = hearts >= 4 ? 2 : 1;
  const items: {id: string; count: number}[] = [{id: sp.productId, count: baseQty}];
  addItem(life, sp.productId, baseQty);
  record(life, sp.productId, baseQty);

  // High affection (>=3 hearts) or warm hot spring grants bonus rare product!
  const warmSpring = (home.hotSpringUntil ?? 0) > now;
  if (sp.bonusProductId && (hearts >= 3 || (a.speciesId === 'ranch-capybara' && warmSpring))) {
    items.push({id: sp.bonusProductId, count: 1});
    addItem(life, sp.bonusProductId, 1);
    record(life, sp.bonusProductId, 1);
  } else if (a.speciesId === 'ranch-capybara' && warmSpring) {
    // Extra hot-spring dew when capybara enjoys the heated hot spring!
    items[0].count += 1;
    addItem(life, sp.productId, 1);
  }

  return {ok: true, items};
}

export function toggleAnimalFollow(life: LifeData, animalId: string): boolean {
  const home = ensureHome(life);
  const a = home.ranch?.animals.find(x => x.id === animalId);
  if (!a) return false;
  const next = !a.following;
  for (const other of home.ranch!.animals) other.following = false;
  a.following = next;
  return a.following;
}
