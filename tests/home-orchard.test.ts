import test from 'node:test';
import assert from 'node:assert/strict';
import {TREE_SPECIES, NATIVE_ORCHARD, allOrchardTrees, buySapling, fruitReady, harvestTree, plantTree, treeStage, type TreeSpecies} from '../src/life/orchard';
import {ensureHome, freshLife} from '../src/life/state';
import {ITEMS} from '../src/life/catalog';
import {makeExpansionSlot} from '../src/world/expansion';
import {inland, pathDistance, TERRACE} from '../src/world/map';
import {createOrchardTree, orchardGeometry} from '../src/home/foliage/orchard-trees';

const minute = 60_000;
const tile = makeExpansionSlot(-3, -1);
const x = tile.min[0] + 11, z = tile.min[1] + 11;

test('种子铺与栽苗在成功时分别结算，重复栽种及未购领土不会扣树苗', () => {
  const life = freshLife();
  life.coins = 40;
  for (const invalid of [0, -1, .5, Infinity, 6]) assert.equal(buySapling(life, 'apple', invalid), false);
  assert.equal(life.coins, 40);
  assert.equal(buySapling(life, 'apple', 5), true);
  assert.equal(life.coins, 0);
  assert.equal(plantTree(life, 'apple', tile.id, x, z, 0), null);
  ensureHome(life).expansions.push({id: tile.id, gx: tile.gx, gz: tile.gz, theme: 'meadow', unlockedAt: 0});
  assert.equal(plantTree(life, 'apple', tile.id, tile.min[0] - 1, z, 0), null);
  assert.ok(plantTree(life, 'apple', tile.id, x, z, 0));
  assert.equal(plantTree(life, 'apple', tile.id, x + 2, z, 0), null);
  assert.equal(life.bag['sapling-apple'], 4);
  assert.equal(ensureHome(life).trees.length, 1);
});

test('树龄按真实时钟跨档恢复，采果与再结果不会重复入袋', () => {
  const life = freshLife();
  ensureHome(life).expansions.push({id: tile.id, gx: tile.gx, gz: tile.gz, theme: 'meadow', unlockedAt: 0});
  life.bag['sapling-pear'] = 1;
  const tree = plantTree(life, 'pear', tile.id, x, z, 0)!;
  assert.equal(treeStage(tree, 3 * minute - 1), 'sapling');
  assert.equal(treeStage(tree, 3 * minute), 'young');
  assert.equal(treeStage(tree, 15 * minute), 'adult');
  assert.equal(harvestTree(life, tree.id, 20 * minute - 1), null);
  const restored = JSON.parse(JSON.stringify(life));
  assert.equal(fruitReady(allOrchardTrees(restored).find(t => t.id === tree.id)!, 20 * minute), true);
  assert.deepEqual(harvestTree(restored, tree.id, 20 * minute), {item: 'orchard-pear', n: 3});
  assert.equal(harvestTree(restored, tree.id, 20 * minute), null);
  assert.equal(harvestTree(restored, tree.id, 35 * minute - 1), null);
  assert.ok(harvestTree(restored, tree.id, 35 * minute));
  assert.equal(restored.bag['orchard-pear'], 6);
  assert.equal(restored.dex['orchard-pear'].n, 2);
});

test('天然苹果园的位置避开田埂和田块，天然采收与玩家种的树分别保存', () => {
  const old = freshLife();
  delete (old.home as any).trees;
  delete (old.home as any).nativeTreeHarvests;
  ensureHome(old);
  for (const tree of NATIVE_ORCHARD) {
    assert.ok(pathDistance(tree.x, tree.z) > 3);
    for (let k = 0; k < TERRACE.count; k++) assert.ok(Math.abs(tree.x - (TERRACE.first - k * TERRACE.width)) > 2);
    assert.ok(Math.abs(inland(tree.x, tree.z) - inland(tree.x + .3, tree.z + .3)) < .2);
    assert.equal(treeStage(tree, 0), 'adult');
  }
  const id = NATIVE_ORCHARD[0].id;
  assert.ok(harvestTree(old, id, 10_000));
  const restored = JSON.parse(JSON.stringify(old));
  assert.equal(harvestTree(restored, id, 10_001), null);
  assert.ok(harvestTree(restored, id, 10_000 + 15 * minute));
  assert.deepEqual(ensureHome(old).trees, []);
  assert.equal(fruitReady(NATIVE_ORCHARD[0], 0), true);
});

test('七种树共享稳定树形，每种的冠形变体不同，树根埋入地面且果实仅在成熟时显示', () => {
  const ctx = {};
  for (const [key, info] of Object.entries(TREE_SPECIES)) {
    const species = key as TreeSpecies;
    assert.equal(ITEMS[info.saplingId].price, info.price);
    const a = orchardGeometry(species, 0), b = orchardGeometry(species, 1);
    assert.equal(orchardGeometry(species, 0), a);
    assert.notDeepEqual(a.canopy.attributes.position.array.slice(0, 15), b.canopy.attributes.position.array.slice(0, 15));
    a.trunk.computeBoundingBox();
    assert.ok(a.trunk.boundingBox!.min.y < -.1);
    assert.ok(a.canopy.attributes.position.count > 1500);
    const tree = createOrchardTree(ctx, species, key);
    tree.update('sapling', true);
    const fruit = tree.group.getObjectByName('orchard-fruit');
    assert.equal(!!fruit, !!info.fruitId);
    assert.equal(fruit?.visible ?? false, false);
    tree.update('adult', true);
    assert.equal(fruit?.visible ?? false, !!info.fruitId);
    tree.dispose();
  }
});
