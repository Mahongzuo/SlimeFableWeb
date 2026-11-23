import {BUILD_ITEMS} from '../home/build-catalog';
import {EXPANSION_THEMES, slotForTile} from '../world/expansion';
import {ensureHome, type LifeData, type PlacedProp} from './state';

export interface HabitatSpecies {
  id: string;
  name: string;
  asset: string;
  icon: string;
  size: number;
  favoriteCrop: string;
  requirementText: string;
  giftSeed: string;
  /** Evaluates whether the player's current placed props attract this species and returns a home anchor. */
  match: (placed: PlacedProp[]) => {ready: boolean; anchor?: [number, number]; checks: {label: string; met: boolean}[]};
}

function hasTag(p: PlacedProp, tag: string): boolean {
  return !!BUILD_ITEMS[p.itemId]?.tags.includes(tag);
}

function findTagNear(placed: PlacedProp[], anchor: PlacedProp, tag: string, maxDist: number): PlacedProp[] {
  return placed.filter(p => p.id !== anchor.id && hasTag(p, tag) && Math.hypot(p.x - anchor.x, p.z - anchor.z) <= maxDist);
}

export const HABITAT_SPECIES: HabitatSpecies[] = [
  {
    id: 'visitor-frog', name: '青莲池蛙', asset: 'waterside-frog', icon: '🐸', size: 0.45,
    favoriteCrop: 'crop-radish', requirementText: '摆放「睡莲丛」+「水边芦苇」', giftSeed: 'seed-lotus',
    match(placed) {
      const lilies = placed.filter(p => hasTag(p, 'lily'));
      const reeds = placed.filter(p => hasTag(p, 'reeds'));
      const pair = lilies.find(l => reeds.some(r => Math.hypot(l.x - r.x, l.z - r.z) <= 14));
      return {
        ready: !!pair,
        anchor: pair ? [pair.x + 0.9, pair.z + 0.9] : undefined,
        checks: [{label: '睡莲丛', met: lilies.length > 0}, {label: '水边芦苇', met: reeds.length > 0}],
      };
    },
  },
  {
    id: 'visitor-kingfisher', name: '碧羽翠鸟', asset: 'waterside-kingfisher', icon: '🐦', size: 0.50,
    favoriteCrop: 'crop-strawberry', requirementText: '摆放「水岸垂柳」+ 水景植物（睡莲/芦苇）', giftSeed: 'seed-wisteria',
    match(placed) {
      const willows = placed.filter(p => p.itemId === 'nature-willow');
      const waters = placed.filter(p => hasTag(p, 'lily') || hasTag(p, 'reeds') || hasTag(p, 'water'));
      const hit = willows.find(w => waters.some(p => p.id !== w.id && Math.hypot(w.x - p.x, w.z - p.z) <= 16));
      return {
        ready: !!hit,
        anchor: hit ? [hit.x + 1.5, hit.z - 1.2] : undefined,
        checks: [{label: '水岸垂柳', met: willows.length > 0}, {label: '水景植物/建筑', met: waters.length > 1}],
      };
    },
  },
  {
    id: 'visitor-red-panda', name: '绒尾小熊猫', asset: 'pack-red-panda', icon: '🦊', size: 0.78,
    favoriteCrop: 'crop-strawberry', requirementText: '摆放「翠竹丛」×2 +「湖畔凉亭」或「月洞门」', giftSeed: 'seed-ginkgo',
    match(placed) {
      const pavilions = placed.filter(p => hasTag(p, 'pavilion'));
      const bamboos = placed.filter(p => hasTag(p, 'bamboo'));
      const hit = pavilions.find(pv => findTagNear(placed, pv, 'bamboo', 18).length >= 2);
      return {
        ready: !!hit,
        anchor: hit ? [hit.x + 2.2, hit.z + 1.6] : undefined,
        checks: [{label: '凉亭或月洞门', met: pavilions.length > 0}, {label: '附近翠竹 ×2', met: bamboos.length >= 2}],
      };
    },
  },
  {
    id: 'visitor-deer', name: '林间梅花鹿', asset: 'fauna-deer', icon: '🦌', size: 1.35,
    favoriteCrop: 'crop-corn', requirementText: '摆放「牧场木棚」+ 任意树木 ×2', giftSeed: 'seed-sunflower',
    match(placed) {
      const shelters = placed.filter(p => p.itemId === 'pasture-shelter');
      const trees = placed.filter(p => hasTag(p, 'tree'));
      const hit = shelters.find(sh => findTagNear(placed, sh, 'tree', 22).length >= 2);
      return {
        ready: !!hit,
        anchor: hit ? [hit.x + 2.6, hit.z + 2.0] : undefined,
        checks: [{label: '牧场木棚', met: shelters.length > 0}, {label: '周围树木 ×2', met: trees.length >= 2}],
      };
    },
  },
  {
    id: 'visitor-hare', name: '草甸野兔', asset: 'meadow-hare', icon: '🐇', size: 0.55,
    favoriteCrop: 'crop-radish', requirementText: '摆放「茅草小屋」或「培育花圃」', giftSeed: 'seed-radish',
    match(placed) {
      const spot = placed.find(p => p.itemId === 'build-thatch' || p.itemId === 'facility-flowerbed' || hasTag(p, 'pasture'));
      return {
        ready: !!spot,
        anchor: spot ? [spot.x - 1.9, spot.z + 1.8] : undefined,
        checks: [{label: '茅草小屋 / 培育花圃', met: !!spot}],
      };
    },
  },
  {
    id: 'visitor-fox', name: '紫藤赤狐', asset: 'pack-fox', icon: '🦊', size: 0.86,
    favoriteCrop: 'crop-tomato', requirementText: '摆放「紫藤花树」+「临水茶馆」或「玻璃温室」', giftSeed: 'seed-starlight',
    match(placed) {
      const wisteria = placed.filter(p => hasTag(p, 'wisteria') || hasTag(p, 'flower'));
      const cozy = placed.filter(p => p.itemId === 'build-teahall' || p.itemId === 'pack-greenhouse');
      const hit = cozy.find(c => wisteria.some(w => Math.hypot(w.x - c.x, w.z - c.z) <= 20));
      return {
        ready: !!hit,
        anchor: hit ? [hit.x - 2.4, hit.z + 2.1] : undefined,
        checks: [{label: '紫藤/花圃', met: wisteria.length > 0}, {label: '茶馆或温室', met: cozy.length > 0}],
      };
    },
  },
  {
    id: 'visitor-capybara', name: '悠闲水豚', asset: 'fauna-capybara', icon: '🦫', size: 0.92,
    favoriteCrop: 'crop-pumpkin', requirementText: '摆放「临水茶馆」或「水岸吊脚楼」+「元素洒水泉」', giftSeed: 'seed-pumpkin',
    match(placed) {
      const springs = placed.filter(p => p.itemId === 'facility-sprinkler' || hasTag(p, 'water'));
      const tea = placed.filter(p => p.itemId === 'build-teahall' || p.itemId === 'waterside-stilt-house');
      const hit = tea.find(t => springs.some(s => s.id !== t.id && Math.hypot(s.x - t.x, s.z - t.z) <= 24));
      return {
        ready: !!hit,
        anchor: hit ? [hit.x + 2.5, hit.z - 2.0] : undefined,
        checks: [{label: '茶馆/吊脚楼', met: tea.length > 0}, {label: '洒水泉/水景', met: springs.length > 0}],
      };
    },
  },
  {
    id: 'visitor-dipper', name: '白喉河乌', asset: 'dipper', icon: '🐧', size: 0.52,
    favoriteCrop: 'crop-corn', requirementText: '摆放「溪畔水磨坊」', giftSeed: 'seed-lotus',
    match(placed) {
      const mill = placed.find(p => hasTag(p, 'watermill'));
      return {
        ready: !!mill,
        anchor: mill ? [mill.x + 2.2, mill.z + 1.8] : undefined,
        checks: [{label: '溪畔水磨坊', met: !!mill}],
      };
    },
  },
  {
    id: 'visitor-gull', name: '海岬海鸥', asset: 'sea-gull', icon: '🕊️', size: 0.65,
    favoriteCrop: 'fish-goby', requirementText: '摆放「海岬灯塔」', giftSeed: 'seed-starlight',
    match(placed) {
      const lh = placed.find(p => hasTag(p, 'lighthouse'));
      return {
        ready: !!lh,
        anchor: lh ? [lh.x + 2.4, lh.z + 2.4] : undefined,
        checks: [{label: '海岬灯塔', met: !!lh}],
      };
    },
  },
  {
    id: 'visitor-crab', name: '潮池岸蟹', asset: 'shore-crab', icon: '🦀', size: 0.48,
    favoriteCrop: 'crop-radish', requirementText: '摆放「潮池礁石」', giftSeed: 'seed-lotus',
    match(placed) {
      const rock = placed.find(p => hasTag(p, 'tidal'));
      return {
        ready: !!rock,
        anchor: rock ? [rock.x - 1.6, rock.z + 1.5] : undefined,
        checks: [{label: '潮池礁石', met: !!rock}],
      };
    },
  },
];

export interface HabitatEvaluation {
  species: HabitatSpecies;
  ready: boolean;
  anchor?: [number, number];
  checks: {label: string; met: boolean}[];
}

export function evaluateHabitats(life: LifeData): HabitatEvaluation[] {
  const home = ensureHome(life);
  // Include natural ecology anchors generated on unlocked expansion territories
  const combined: PlacedProp[] = [...home.placed];
  for (const tile of home.expansions) {
    const slot = slotForTile(tile);
    const theme = EXPANSION_THEMES[tile.theme];
    if (!slot || !theme) continue;
    theme.naturalProps.forEach((np, i) => {
      const x = slot.min[0] + (slot.max[0] - slot.min[0]) * np.u;
      const z = slot.min[1] + (slot.max[1] - slot.min[1]) * np.v;
      combined.push({id: `exp-nat-${tile.id}-${i}`, itemId: np.asset, x, z, y: 0, yaw: np.yaw, scale: 1});
    });
  }
  return HABITAT_SPECIES.map(species => ({species, ...species.match(combined)}));
}

export function recordVisitorInteraction(
  life: LifeData,
  speciesId: string,
  dayKey: string,
  fed: boolean,
): {firstVisit: boolean; giftedSeed: string | null} {
  const home = ensureHome(life);
  const existing = home.visitors[speciesId];
  const firstVisit = !existing;
  if (!existing) {
    home.visitors[speciesId] = {count: 1, first: Date.now(), fed: fed ? 1 : 0};
  } else {
    existing.count++;
    if (fed) existing.fed++;
  }
  const sp = HABITAT_SPECIES.find(s => s.id === speciesId);
  let giftedSeed: string | null = null;
  if (sp && (firstVisit || (fed && home.visitors[speciesId].lastGiftDay !== dayKey))) {
    home.visitors[speciesId].lastGiftDay = dayKey;
    giftedSeed = sp.giftSeed;
  }
  return {firstVisit, giftedSeed};
}
