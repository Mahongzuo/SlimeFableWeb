import test from 'node:test';
import assert from 'node:assert/strict';
import {Raycaster, Scene, Vector3} from 'three';
import {VoyageIslands} from '../src/home/voyage-islands';
import {SEA_LEVEL} from '../src/home/layout';
import {offshoreDepth} from '../src/world/island-coast';
import {createWorld, type WorldDefinition} from '../src/slime/world';

test('continental shelf endpoints and basin depth cap', () => {
  for (const [d, y] of [
    [100, 15],
    [1000, 120],
    [3000, 850],
    [5000, 2000],
    [12000, 2000],
  ])
    assert.equal(offshoreDepth(d), y);
  for (let d = 1; d < 5100; d += 5) assert.ok(offshoreDepth(d) >= offshoreDepth(d - 1));
});
test('shore hysteresis uses swimmer position and releases all seabed and island meshes', () => {
  const scene = new Scene(),
    islands = new VoyageIslands(scene, false);
  const coast = (x: number, z: number) => Math.hypot(x, z);
  const bed = (x: number, z: number) => SEA_LEVEL - offshoreDepth(coast(x, z));
  const sync = (d: number) => islands.sync(d, 0, 841, coast, bed);
  assert.equal(sync(49.9), false);
  assert.equal(scene.children.length, 0);
  assert.ok(sync(50));
  assert.ok(islands.shores.some((i) => coast(i.x, i.z) >= 350 && coast(i.x, i.z) <= 900));
  const recorded = islands.shores;
  sync(39);
  assert.ok(islands.offshore);
  sync(29);
  assert.equal(scene.children.length, 0);
  sync(50);
  assert.deepEqual(islands.shores, recorded);
  islands.dispose();
  assert.equal(scene.children.length, 0);
});
test('moving deep-water collision and stitched ground stay under a diver at cell boundaries', () => {
  const scene = new Scene(),
    islands = new VoyageIslands(scene, false),
    ray = new Raycaster();
  ray.layers.enable(1);
  const coast = (x: number, z: number) => Math.hypot(x, z);
  const bed = (x: number, z: number) => SEA_LEVEL - offshoreDepth(coast(x, z));
  for (const [x, z] of [
    [384, 650],
    [900, -768],
    [3072, 865],
    [-5376, 768],
  ]) {
    islands.sync(x, z, 841, coast, bed);
    const def: WorldDefinition = {
      boxes: [],
      surfaces: [],
      fluids: [],
      bounds: {min: [-100, -24, -100], max: [100, 65, 100]},
    };
    islands.extend(def.surfaces, def.fluids!, def.bounds!, true);
    const world = createWorld(def);
    scene.updateMatrixWorld(true);
    for (const delta of [-0.02, 0.02]) {
      const xx = x + delta,
        zz = z + 0.03,
        expected = islands.bed(xx, zz, bed(xx, zz));
      ray.set(new Vector3(xx, 50, zz), new Vector3(0, -1, 0));
      const hits = ray.intersectObjects(scene.children, true);
      assert.ok(hits.length);
      assert.ok(Math.abs(hits[0].point.y - expected) < 0.6);
      assert.ok(Math.abs(world.terrain(xx, zz)! - expected) < 0.6);
      assert.ok(def.bounds!.min[1] < expected);
    }
  }
  islands.dispose();
});
