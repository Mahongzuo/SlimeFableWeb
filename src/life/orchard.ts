import {changeShells} from './shell-wallet';
import {slotForTile} from '../world/expansion';
import {addItem, ensureHome, record, takeItem, type LifeData} from './state';

export type TreeSpecies = 'apple' | 'pear' | 'peach' | 'oak' | 'poplar' | 'willow' | 'ginkgo';
export type TreeStage = 'sapling' | 'young' | 'adult';
export interface OrchardTree {
  id: string;
  species: TreeSpecies;
  tileId: string;
  x: number;
  z: number;
  plantedAt: number;
  harvestedAt?: number;
}

interface TreeSpec {
  name: string; icon: string; crownRadius: number; trunkRadius: number;
  price: number; saplingId: string; fruitId?: string; fruitName?: string;
}
export const TREE_SPECIES: Record<TreeSpecies, TreeSpec> = {
  apple: {name: '苹果树', icon: '🍎', crownRadius: 2.4, trunkRadius: .24, price: 8, saplingId: 'sapling-apple', fruitId: 'orchard-apple', fruitName: '苹果'},
  pear: {name: '梨树', icon: '🍐', crownRadius: 2.1, trunkRadius: .22, price: 10, saplingId: 'sapling-pear', fruitId: 'orchard-pear', fruitName: '香梨'},
  peach: {name: '桃树', icon: '🍑', crownRadius: 2.5, trunkRadius: .22, price: 10, saplingId: 'sapling-peach', fruitId: 'orchard-peach', fruitName: '水蜜桃'},
  oak: {name: '橡树', icon: '🌳', crownRadius: 4.6, trunkRadius: .54, price: 8, saplingId: 'sapling-oak'},
  poplar: {name: '杨树', icon: '🌿', crownRadius: 1.8, trunkRadius: .32, price: 6, saplingId: 'sapling-poplar'},
  willow: {name: '垂柳', icon: '🌱', crownRadius: 3.5, trunkRadius: .38, price: 9, saplingId: 'sapling-willow'},
  ginkgo: {name: '银杏', icon: '🍂', crownRadius: 2.8, trunkRadius: .32, price: 10, saplingId: 'sapling-ginkgo'},
};

/** Stable IDs on the westernmost terrace, beyond the crop beds and the barn courtyard. */
export const NATIVE_ORCHARD: readonly OrchardTree[] = [[-91, 5], [-98, 7], [-93, 13], [-100, 15]].map(([x, z], i) => ({
  id: 'terrace-apple-' + i, species: 'apple', tileId: 'native-farm', x, z, plantedAt: -20 * 60_000,
}));

export function treeStage(tree: OrchardTree, now: number): TreeStage {
  const age = now - tree.plantedAt;
  if (age < 3 * 60_000) return 'sapling';
  if (age < 15 * 60_000) return 'young';
  return 'adult';
}

export function fruitReady(tree: OrchardTree, now: number): boolean {
  return !!TREE_SPECIES[tree.species].fruitId && now >= tree.plantedAt + 20 * 60_000 &&
    (tree.harvestedAt === undefined || now >= tree.harvestedAt + 15 * 60_000);
}

export function allOrchardTrees(life: LifeData): OrchardTree[] {
  const home = life.home ?? ensureHome(life);
  return [...NATIVE_ORCHARD.map(tree => ({...tree, harvestedAt: home.nativeTreeHarvests?.[tree.id]})), ...(home.trees ?? [])];
}

export function buySapling(life: LifeData, species: TreeSpecies, count: number): boolean {
  const spec = TREE_SPECIES[species];
  if (!spec || !Number.isSafeInteger(count) || count <= 0 || count * spec.price > life.coins) return false;
  changeShells(life, -(count * spec.price), 'spend');
  addItem(life, spec.saplingId, count);
  return true;
}

/** Scene validation (water, buildings and navigation) happens immediately before this transaction. */
export function plantTree(life: LifeData, species: TreeSpecies, tileId: string, x: number, z: number, now: number): OrchardTree | null {
  const spec = TREE_SPECIES[species], home = ensureHome(life);
  if (!spec || ![x, z, now].every(Number.isFinite)) return null;
  const tile = home.expansions.find(t => t.id === tileId);
  const slot = tile && slotForTile(tile);
  if (!slot || x < slot.min[0] || z < slot.min[1] || x >= slot.max[0] || z >= slot.max[1]) return null;
  if (allOrchardTrees(life).some(t => Math.hypot(x - t.x, z - t.z) < spec.crownRadius + TREE_SPECIES[t.species].crownRadius)) return null;
  if (!takeItem(life, spec.saplingId, 1)) return null;
  const tree: OrchardTree = {id: crypto.randomUUID(), species, tileId, x, z, plantedAt: now};
  home.trees.push(tree);
  return tree;
}

export function harvestTree(life: LifeData, id: string, now: number): {item: string; n: number} | null {
  const home = ensureHome(life);
  const planted = home.trees.find(t => t.id === id);
  const native = NATIVE_ORCHARD.find(t => t.id === id);
  const tree = planted ?? (native && {...native, harvestedAt: home.nativeTreeHarvests[id]});
  if (!tree || !Number.isFinite(now) || !fruitReady(tree, now)) return null;
  if (planted) planted.harvestedAt = now;
  else home.nativeTreeHarvests[id] = now;
  const item = TREE_SPECIES[tree.species].fruitId!, n = 3;
  addItem(life, item, n);
  record(life, item);
  return {item, n};
}
