import {changeShells} from './shell-wallet';
import {extraFish, lures, speciesById} from './fish-species';
import {addItem, ensureHome, record, type LifeData} from './state';
import {hasBuff} from './cooking';
import {isMuseumHallRestored} from './museum';

/**
 * Ecological & Stardew-inspired Fishing v2.
 * Supports 4 waters ('lake' | 'harbor' | 'canal' | 'waterfall'), 28 species including 4 seasonal legendaries,
 * 5 fish swimming AI behaviors, rod/bobber upgrades, and in-reel underwater Treasure Chests!
 * Preserves 100% backward compatibility with classic tension-mode tests.
 */
export type FishSpot = 'lake' | 'harbor' | 'canal' | 'waterfall' | 'reef' | 'offshore';
export type FishBehavior = 'smooth' | 'sinker' | 'floater' | 'dart' | 'legend';

export interface FishRow {
  fish: string;
  spots: FishSpot[];
  weight: number;
  size: [number, number];
  fight: number;
  behavior?: FishBehavior;
  hours?: [number, number];
  seasons?: number[];
  rain?: boolean;
  snow?: boolean;
  rare?: boolean;
  legendary?: boolean;
  history?: boolean;
}

export const FISH_TABLE: FishRow[] = [
  // Original 10 fish (exact weights/spots/conditions preserved!)
  {fish: 'fish-crucian', spots: ['lake', 'canal'], weight: 30, size: [8, 22], fight: .2, behavior: 'smooth'},
  {fish: 'fish-carp', spots: ['lake', 'canal'], weight: 18, size: [25, 60], fight: .45, behavior: 'smooth'},
  {fish: 'fish-goby', spots: ['harbor', 'canal'], weight: 30, size: [5, 12], fight: .15, behavior: 'smooth'},
  {fish: 'fish-mackerel', spots: ['harbor'], weight: 20, size: [20, 38], fight: .4, behavior: 'floater'},
  {fish: 'fish-perch', spots: ['lake', 'harbor'], weight: 14, size: [18, 45], fight: .5, behavior: 'dart'},
  {fish: 'fish-catfish', spots: ['lake', 'waterfall'], weight: 10, size: [30, 80], fight: .6, behavior: 'sinker', hours: [18, 4]},
  {fish: 'fish-eel', spots: ['lake', 'harbor', 'canal'], weight: 6, size: [40, 90], fight: .7, behavior: 'sinker', rain: true},
  {fish: 'fish-golden-trout', spots: ['lake', 'waterfall'], weight: 3, size: [30, 55], fight: .8, behavior: 'dart', hours: [5, 8], rare: true},
  {fish: 'fish-rainbow-trout', spots: ['lake', 'waterfall'], weight: 3, size: [25, 50], fight: .75, behavior: 'floater', rain: true, rare: true},
  {fish: 'fish-history', spots: ['lake', 'harbor', 'canal', 'waterfall'], weight: 2, size: [19, 21], fight: .9, behavior: 'legend', history: true, rare: true},
  // 14 Expanded Ecological & Seasonal Fish
  {fish: 'fish-loach', spots: ['canal', 'waterfall'], weight: 24, size: [9, 18], fight: .22, behavior: 'sinker'},
  {fish: 'fish-bitterling', spots: ['canal', 'lake'], weight: 18, size: [6, 12], fight: .25, behavior: 'floater', seasons: [0, 1]},
  {fish: 'fish-mandarin', spots: ['canal', 'lake'], weight: 10, size: [22, 46], fight: .58, behavior: 'dart', seasons: [0, 2]},
  {fish: 'fish-sweetfish', spots: ['waterfall', 'canal'], weight: 14, size: [15, 30], fight: .48, behavior: 'floater', seasons: [0, 1]},
  {fish: 'fish-river-crab', spots: ['canal', 'lake'], weight: 11, size: [10, 18], fight: .42, behavior: 'sinker', seasons: [2]},
  {fish: 'fish-sea-bream', spots: ['harbor'], weight: 12, size: [28, 55], fight: .55, behavior: 'dart'},
  {fish: 'fish-flying-fish', spots: ['harbor'], weight: 12, size: [20, 36], fight: .52, behavior: 'floater', seasons: [1]},
  {fish: 'fish-squid', spots: ['harbor'], weight: 10, size: [24, 48], fight: .62, behavior: 'sinker', hours: [19, 5]},
  {fish: 'fish-salmon', spots: ['waterfall', 'harbor'], weight: 10, size: [42, 85], fight: .68, behavior: 'dart', seasons: [2]},
  {fish: 'fish-lantern-fish', spots: ['harbor', 'lake'], weight: 6, size: [14, 28], fight: .64, behavior: 'floater', hours: [20, 4], rare: true},
  {fish: 'fish-jade-carp', spots: ['lake', 'canal'], weight: 4, size: [35, 72], fight: .72, behavior: 'smooth', rare: true},
  {fish: 'fish-moon-jelly', spots: ['harbor'], weight: 5, size: [16, 32], fight: .56, behavior: 'floater', hours: [19, 5], rare: true},
  {fish: 'fish-silver-herring', spots: ['harbor'], weight: 16, size: [18, 32], fight: .38, behavior: 'smooth', seasons: [3]},
  {fish: 'fish-snow-char', spots: ['waterfall', 'lake'], weight: 5, size: [28, 58], fight: .74, behavior: 'dart', seasons: [3], snow: true, rare: true},
  // 4 Seasonal Legendary Fish Kings
  {fish: 'fish-spring-koi', spots: ['canal', 'lake'], weight: 2, size: [65, 110], fight: .88, behavior: 'legend', seasons: [0], rare: true, legendary: true},
  {fish: 'fish-summer-marlin', spots: ['harbor'], weight: 2, size: [110, 195], fight: .92, behavior: 'legend', seasons: [1], rare: true, legendary: true},
  {fish: 'fish-autumn-sturgeon', spots: ['lake'], weight: 2, size: [95, 170], fight: .90, behavior: 'legend', seasons: [2], rare: true, legendary: true},
  {fish: 'fish-winter-icefish', spots: ['waterfall', 'lake'], weight: 2, size: [55, 92], fight: .88, behavior: 'legend', seasons: [3], rare: true, legendary: true},
  ...extraFish.map((s):FishRow=>({fish:s.id,spots:[s.water],weight:s.rarity==='mythic'?1:s.rarity==='rare'?5:12,
    size:[s.min,s.max],fight:Math.min(.94,.27+s.max/340), rare:s.rarity==='rare'||s.rarity==='mythic',
    behavior:s.shape==='cat'||s.shape==='flounder'?'sinker':s.shape==='ribbon'?'floater':'dart'})),
];

export function trophySize(id:string) {
  const row=FISH_TABLE.find(r=>r.fish===id);
  return speciesById.get(id)?.trophy ?? (row ? Math.ceil(row.size[1]-(row.size[1]-row.size[0])*.13) : Infinity);
}
export function lifetimeCatches(life:LifeData) {
  return FISH_TABLE.reduce((sum,r)=>sum+(life.dex[r.fish]?.n??0),0);
}
export function equippedLure(life:LifeData) {
  const index=ensureHome(life).fishing?.lure??0;
  return lures[index]?.count<=lifetimeCatches(life)?index:0;
}
export const ROD_TIERS = [
  {tier: 1, name: '江南青竹竿', price: 0, barBonus: 0, treasureChance: 0.22, desc: '轻便好上手的基础钓竿。'},
  {tier: 2, name: '碳素元素竿', price: 65, barBonus: 0.06, treasureChance: 0.34, desc: '收线更快，发现宝箱的几率提高。'},
  {tier: 3, name: '沧溟星轨竿', price: 145, barBonus: 0.12, treasureChance: 0.48, desc: '收线最快，有更大机会发现沉船宝箱。'},
] as const;

export const TREASURE_LOOT_TABLE = [
  'relic-bronze-bell',
  'relic-celadon-shard',
  'relic-compass',
  'relic-scroll',
  'relic-astrolabe',
  'prod-pearl',
  'seed-starlight',
  'seed-lotus',
  'bait-chronicle',
  'bait-element',
];

const inHours = (h: number, [a, b]: [number, number]) => a <= b ? h >= a && h < b : h >= a || h < b;

export interface FishEnv {
  lure?:number;
  hour: number;
  raining: boolean;
  historyDay: boolean;
  season?: number;
  snowing?: boolean;
}

export function pickFish(spot: FishSpot, env: FishEnv, bait: string | null, rand: () => number): {fish: string; size: number} {
  const rows = FISH_TABLE.filter(r =>
    r.spots.includes(spot) &&
    (!r.hours || inHours(env.hour, r.hours)) &&
    (!r.rain || env.raining) &&
    (!r.snow || !!env.snowing) &&
    (!r.seasons || env.season === undefined || r.seasons.includes(env.season)) &&
    (!r.history || env.historyDay),
  );
  const w = (r: FishRow) => {
    const phases=speciesById.get(r.fish)?.phases;
    const phase=env.hour<5 || env.hour>=20?'starlight':env.hour<9?'dawn':env.hour<16?'midday':'golden';
    let mul = phases && !phases.includes(phase) ? .28 : 1;
    if(env.raining && speciesById.get(r.fish)?.rainBonus) mul *= 1.45;
    if(r.rare) mul *= lures[env.lure??0]?.rare??1;
    if (r.rare && bait === 'bait-glow') mul *= 3;
    if (r.rare && bait === 'bait-element') mul *= 2.2;
    if (r.history && bait === 'bait-chronicle') mul *= 5;
    if (r.legendary && (bait === 'bait-element' || bait === 'bait-chronicle')) mul *= 2.5;
    return r.weight * mul;
  };
  const total = rows.reduce((s, r) => s + w(r), 0);
  let x = rand() * total, row = rows[rows.length - 1];
  for (const r of rows) { x -= w(r); if (x < 0) { row = r; break; } }
  return {fish: row.fish, size: Math.round(row.size[0] + rand() * (row.size[1] - row.size[0]))};
}

export type FishPhase = 'cast' | 'wait' | 'bite' | 'reel' | 'caught' | 'escaped';
export const GREEN: [number, number] = [.25, .8];

export interface FishingSessionOptions {
  /** 'classic' preserves original tension needle physics (default for legacy tests); 'stardew' enables dynamic chasing bar + AI + treasure! */
  mode?: 'classic' | 'stardew' | 'angling';
  rodTier?: number;
  barBonus?: number;
  treasureChance?: number;
}

export interface FishingTreasure {
  active: boolean;
  pos: number;
  progress: number;
  claimed: boolean;
  rewardId: string;
}

/** One cast, from the throw to a fish in the bag (or not). Drive it with update(dt, reeling) and hook(). */
export class FishingSession {
  phase: FishPhase = 'cast';
  timer = .6;
  misses = 0;
  tension = .3;
  progress = 0;
  readonly catch: {fish: string; size: number};
  readonly behavior: FishBehavior;
  readonly mode: 'classic' | 'stardew' | 'angling';

  // Stardew chasing-bar state (0..1 vertical/horizontal track)
  fishPos = 0.45;
  fishTarget = 0.5;
  barPos = 0.35;
  barVel = 0;
  barSize = 0.28;
  treasure: FishingTreasure | null = null;

  private settled=false;
  private attraction=1;
  readonly starlight:boolean;
  settle(life:LifeData) {
    if(this.settled || this.phase!=='caught') return false;
    this.settled=true;
    landCatch(life,this.catch,this.claimedTreasureId());
    if(this.starlight) life.dex[this.catch.fish].starlight=true;
    return true;
  }
  private fight: number;
  private surge = 0;
  private aiTimer = 0.5;
  private fishVel = 0;

  constructor(
    readonly spot: FishSpot,
    env: FishEnv,
    private rand: () => number,
    bait: string | null = null,
    opts: FishingSessionOptions = {},
  ) {
    this.mode = opts.mode ?? 'classic';
    this.catch = pickFish(spot, env, bait, rand);
    this.starlight=this.mode==='angling' && rand()<.025;
    this.attraction=lures[env.lure??0]?.attraction??1;
    const row = FISH_TABLE.find(r => r.fish === this.catch.fish)!;
    this.fight = row.fight;
    this.behavior = row.behavior ?? 'smooth';

    const rod = ROD_TIERS.find(t => t.tier === (opts.rodTier ?? 1)) ?? ROD_TIERS[0];
    this.barSize = Math.min(0.48, 0.28 + rod.barBonus + (opts.barBonus ?? 0) + (bait === 'bait-element' ? 0.04 : 0));

    // Roll underwater treasure chest in stardew mode
    if (this.mode !== 'classic') {
      const chance = (opts.treasureChance ?? rod.treasureChance) + (bait === 'bait-element' || bait === 'bait-chronicle' ? 0.16 : 0);
      if (rand() < chance) {
        const rewardId = TREASURE_LOOT_TABLE[Math.floor(rand() * TREASURE_LOOT_TABLE.length)];
        this.treasure = {
          active: true,
          pos: 0.15 + rand() * 0.70,
          progress: 0,
          claimed: false,
          rewardId,
        };
      }
    }
  }

  private toWait() { this.phase = 'wait'; this.timer = (1.8 + this.rand() * 5.2)/this.attraction; }

  hook() {
    if (this.phase !== 'bite') return false;
    this.phase = 'reel';
    this.tension = .35;
    this.progress = this.mode === 'stardew' ? 0.28 : 0;
    this.fishPos = 0.48;
    this.barPos = Math.max(0, this.fishPos - this.barSize * 0.5);
    this.barVel = 0;
    return true;
  }

  update(dt: number, reeling: boolean, lean=0) {
    if (this.phase === 'caught' || this.phase === 'escaped') return;
    if (this.phase !== 'reel') {
      this.timer -= dt; if (this.timer > 0) return;
      if (this.phase === 'cast') this.toWait();
      else if (this.phase === 'wait') { this.phase = 'bite'; this.timer = .95; }
      else if (++this.misses >= 3) this.phase = 'escaped'; else this.toWait();
      return;
    }

    if(this.mode==='angling') {
      this.aiTimer-=dt;
      if(this.aiTimer<=0){this.fishTarget=this.rand();this.aiTimer=.65+this.rand()*1.35;}
      this.fishPos+=(this.fishTarget-this.fishPos)*(1-Math.exp(-dt*3));
      const run=(this.fishPos-.5)*2, counter=Math.max(0,-run*lean);
      this.tension=Math.max(0,this.tension+dt*((reeling?.39:-.46)+Math.abs(run)*this.fight*.35-counter*.23));
      if(this.tension>=1){this.phase='escaped';return;}
      if(reeling && this.tension>.14) this.progress+=dt*(.17+this.barSize*.18+counter*.10);
      else if(this.tension<.12) this.progress-=dt*.12;
      if(this.progress<-.25){this.phase='escaped';return;}
      if(this.treasure && !this.treasure.claimed && this.tension>.26 && this.tension<.72){
        this.treasure.progress+=dt*.28;if(this.treasure.progress>=1)this.treasure.claimed=true;
      }
      if(this.progress>=1)this.phase='caught';
      return;
    }
    if (this.mode === 'stardew') {
      this.stepStardewReel(dt, reeling);
      return;
    }

    // Classic tension-needle mode (100% preserved for legacy tests)
    this.surge -= dt; if (this.surge <= 0) this.surge = .4 + this.rand() * 1.2;
    const pull = this.surge < .35 ? this.fight * 1.1 : this.fight * .15;
    this.tension = Math.max(0, this.tension + ((reeling ? .55 : -.7) + pull) * dt);
    if (this.tension >= 1) { this.phase = 'escaped'; return; }
    if (this.tension >= GREEN[0] && this.tension <= GREEN[1]) this.progress += dt * (reeling ? .28 : .1) * (1.2 - this.fight * .6);
    if (this.progress >= 1) this.phase = 'caught';
  }

  private stepStardewReel(dt: number, reeling: boolean) {
    // 1. Update fish swimming AI according to its personality
    this.aiTimer -= dt;
    if (this.aiTimer <= 0) {
      if (this.behavior === 'smooth') {
        this.aiTimer = 0.9 + this.rand() * 1.1;
        this.fishTarget = Math.max(0.08, Math.min(0.92, this.fishPos + (this.rand() - 0.5) * 0.35));
      } else if (this.behavior === 'sinker') {
        this.aiTimer = 0.7 + this.rand() * 0.9;
        this.fishTarget = this.rand() < 0.65 ? 0.08 + this.rand() * 0.28 : 0.45 + this.rand() * 0.40;
      } else if (this.behavior === 'floater') {
        this.aiTimer = 0.7 + this.rand() * 0.9;
        this.fishTarget = this.rand() < 0.65 ? 0.62 + this.rand() * 0.30 : 0.15 + this.rand() * 0.35;
      } else if (this.behavior === 'dart') {
        this.aiTimer = 0.42 + this.rand() * 0.55;
        this.fishTarget = 0.08 + this.rand() * 0.84;
      } else {
        // legend
        this.aiTimer = 0.34 + this.rand() * 0.48;
        this.fishTarget = 0.06 + this.rand() * 0.88;
      }
    }

    const fishAccel = 1.2 + this.fight * 2.4;
    const desiredVel = Math.max(-0.95, Math.min(0.95, (this.fishTarget - this.fishPos) * (2.2 + this.fight * 2.0)));
    this.fishVel += (desiredVel - this.fishVel) * Math.min(1, dt * fishAccel * 2.2);
    this.fishPos = Math.max(0.04, Math.min(0.96, this.fishPos + this.fishVel * dt));

    // 2. Update player catch bar with buoyant acceleration & soft bottom bounce
    const accel = reeling ? 1.85 : -1.65;
    this.barVel = Math.max(-1.1, Math.min(1.1, this.barVel + accel * dt));
    this.barPos += this.barVel * dt;
    const maxBar = 1 - this.barSize;
    if (this.barPos < 0) { this.barPos = 0; this.barVel = Math.abs(this.barVel) * 0.25; }
    else if (this.barPos > maxBar) { this.barPos = maxBar; this.barVel = 0; }

    // 3. Check overlap with fish & optional treasure chest
    const barEnd = this.barPos + this.barSize;
    const onFish = this.fishPos >= this.barPos - 0.02 && this.fishPos <= barEnd + 0.02;
    this.tension = this.fishPos; // expose fishPos for unified HUD compatibility

    const gainRate = (0.24 - this.fight * 0.06);
    const drainRate = (0.14 + this.fight * 0.08);
    if (onFish) {
      this.progress = Math.min(1, this.progress + gainRate * dt);
    } else {
      // Slightly gentler drain when player is actively going for the treasure chest!
      const goingForTreasure = !!(this.treasure?.active && !this.treasure.claimed && this.treasure.pos >= this.barPos && this.treasure.pos <= barEnd);
      this.progress = Math.max(0, this.progress - (goingForTreasure ? drainRate * 0.45 : drainRate) * dt);
    }

    if (this.treasure?.active && !this.treasure.claimed) {
      const onTreasure = this.treasure.pos >= this.barPos - 0.02 && this.treasure.pos <= barEnd + 0.02;
      if (onTreasure) {
        this.treasure.progress = Math.min(1, this.treasure.progress + 0.55 * dt);
        if (this.treasure.progress >= 1) this.treasure.claimed = true;
      } else {
        this.treasure.progress = Math.max(0, this.treasure.progress - 0.15 * dt);
      }
    }

    if (this.progress >= 1) this.phase = 'caught';
    else if (this.progress <= 0) this.phase = 'escaped';
  }

  result() { return this.phase === 'caught' ? this.catch : null; }
  claimedTreasureId() { return this.phase === 'caught' && this.treasure?.claimed ? this.treasure.rewardId : null; }
}

/** Upgrades player's fishing rod tier (1 -> 2 -> 3). */
export function upgradeFishingRod(life: LifeData): {ok: boolean; tier: number; reason?: string} {
  const home = ensureHome(life);
  const f = home.fishing!;
  const next = ROD_TIERS.find(r => r.tier === f.rodTier + 1);
  if (!next) return {ok: false, tier: f.rodTier, reason: '已拥有最高级钓竿'};
  if (life.coins < next.price) return {ok: false, tier: f.rodTier, reason: `贝壳不足（升级「${next.name}」需要 ${next.price} 🐚）`};
  changeShells(life, -(next.price), 'spend');
  f.rodTier = next.tier;
  return {ok: true, tier: f.rodTier};
}

/** Computes Stardew session bonuses from rod, buffs, and restored Fishing Museum Hall. */
export function fishingBonuses(life: LifeData, now = Date.now()): {rodTier: number; barBonus: number; treasureBonus: number} {
  const home = ensureHome(life);
  let barBonus = 0;
  let treasureBonus = 0;
  if (hasBuff(life, 'fishing_bar', now)) { barBonus += 0.08; treasureBonus += 0.12; }
  if (isMuseumHallRestored(life, 'fishing')) { barBonus += 0.06; treasureBonus += 0.10; }
  return {rodTier: home.fishing?.rodTier ?? 1, barBonus, treasureBonus};
}

/** Put the catch in the bag; true the first time this fish is caught. Also records any claimed underwater treasure! */
export function landCatch(life: LifeData, c: {fish: string; size: number}, treasureId?: string | null) {
  addItem(life, c.fish);
  if (treasureId) {
    addItem(life, treasureId, 1);
    record(life, treasureId, 1);
    const home = ensureHome(life);
    home.fishing!.treasuresFound = (home.fishing!.treasuresFound ?? 0) + 1;
  }
  return record(life, c.fish, c.size);
}
