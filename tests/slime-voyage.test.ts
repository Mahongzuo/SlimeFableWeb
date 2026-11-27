import {test} from 'node:test';
import assert from 'node:assert/strict';
import {freshLife} from '../src/life/state';
import {
  buyRounds,
  depart,
  endEncounter,
  finishVoyage,
  fireBroadside,
  seaInterval,
  sightEnemy,
} from '../src/life/voyage';
import {islandAt, islandBed, VoyageIslands} from '../src/home/voyage-islands';
import {Scene} from 'three';
import {createWorld, type WorldDefinition} from '../src/slime/world';
import {SEA_LEVEL} from '../src/home/layout';

test('departure inventory survives boarding and reload, and shells buy four packs at most', () => {
  const life = freshLife();
  assert.equal(buyRounds(life), false);
  life.coins = 40;
  for (let i = 0; i < 4; i++) assert.ok(buyRounds(life));
  assert.equal(buyRounds(life), false);
  const v = depart(life, 10, 30, 0, 42);
  assert.equal(v.ammo, 36);
  assert.equal(buyRounds(life), false);
  v.ammo = 14;
  const restored = JSON.parse(JSON.stringify(life));
  assert.equal(depart(restored, 0, 0, 0).ammo, 14);
  assert.equal(restored.sailing.flag, life.sailing!.flag);
  assert.equal(life.coins, 16);
  finishVoyage(life, true);
  assert.equal(life.sailing!.reserve, 14);
  assert.equal(depart(life, 0, 0, 0).ammo, 26);
  finishVoyage(life, false);
  assert.equal(life.sailing!.reserve, 0);
});
test('300 and 2000 metre thresholds count new outward distance; occupied shallows defer a single encounter', () => {
  assert.equal(seaInterval(0), 300);
  assert.equal(seaInterval(0.999999), 2000);
  const v = depart(freshLife(), 0, 0, 0, 8);
  for (const threshold of [300, 2000]) {
    v.threshold = threshold;
    v.farthest = 0;
    assert.equal(
      sightEnemy(v, threshold - 0.01, () => true),
      false,
    );
    assert.equal(
      sightEnemy(v, threshold, () => false),
      false,
    );
    assert.equal(
      sightEnemy(v, threshold, () => true),
      true,
    );
    assert.equal(
      sightEnemy(v, threshold + 80, () => true),
      false,
    );
    endEncounter(v, false);
    assert.equal(v.cargo, 0);
    assert.ok(v.threshold >= threshold + 80 + 300);
    assert.equal(
      sightEnemy(v, threshold - 1, () => true),
      false,
    );
  }
});
test('12 rounds pay for nine hits, three misses and exactly two victories; only docking cashes out', () => {
  const life = freshLife(),
    v = depart(life, 0, 0, 0);
  let hits = 0;
  for (let wave = 0; wave < 2; wave++) {
    assert.ok(sightEnemy(v, v.threshold, () => true));
    Object.assign(v.enemy!, {x: 20, z: 0});
    for (let m = 0; m <= wave; m++) {
      v.reload[1] = 0;
      assert.equal(fireBroadside(v, -1), 'miss');
    }
    while (v.enemy) {
      v.reload[0] = 0;
      fireBroadside(v, 1);
      hits++;
    }
  }
  assert.equal(v.ammo, 0);
  assert.equal(fireBroadside(v, 1), 'empty');
  assert.equal(hits, 9);
  assert.equal(v.cargo, 15);
  assert.equal(finishVoyage(life, true), 15);
  assert.equal(finishVoyage(life, true), 0);
  assert.equal(life.coins, 15);
  const next = depart(life, 0, 0, 0);
  next.cargo = 6;
  life.bag['fish-sea-bream'] = 1;
  finishVoyage(life, false);
  assert.equal(life.bag['fish-sea-bream'], 1);
  assert.equal(life.coins, 15);
  assert.equal(depart(life, 0, 0, 0).ammo, 12);
});
test('streamed island collision agrees with land and shallow shelf and rebuilds identically on return', () => {
  const sea = new VoyageIslands(new Scene(), false),
    seed = 307,
    seen = new Set<number>();
  for (let gx = 5; gx < 48 && seen.size < 3; gx++) {
    const i = islandAt(seed, gx, -4);
    if (seen.has(i.kind)) continue;
    seen.add(i.kind);
    sea.sync(i.x, i.z, seed, () => 500);
    const def: WorldDefinition = {
      boxes: [],
      surfaces: [],
      fluids: [],
      bounds: {min: [-180, -24, -110], max: [105, 65, 215]},
    };
    sea.extend(def.surfaces, def.fluids!, def.bounds!, true);
    const world = createWorld(def);
    let land = false,
      shallow = false;
    for (let step = -20; step <= 20; step++) {
      const x = i.x + (step * i.r) / 14,
        z = i.z + 0.2;
      const y = world.terrain(x, z)!;
      assert.ok(Math.abs(y - islandBed(i, x, z)) < 0.85);
      land ||= y > SEA_LEVEL + 0.25;
      shallow ||= y < SEA_LEVEL && y > SEA_LEVEL - 2;
      assert.equal(world.fluid(x, z), SEA_LEVEL);
    }
    assert.ok(land && shallow);
    sea.clear();
    sea.sync(i.x, i.z, seed, () => 500);
    assert.equal(sea.bed(i.x, i.z, -99), islandBed(i, i.x, i.z));
  }
  assert.equal(seen.size, 3);
  sea.clear();
});

test('wind-sea buoyancy and normal track the same phase and ease towards the shore',async()=>{
  const {sampleOceanWaveAt}=await import('../src/home/render/fft-ocean');
  const {voyageChop}=await import('../src/home/render/voyage-wake');
  const x=80,z=-300,t=2.8, eps=.001,c=voyageChop(x,z,t);
  assert.ok(Math.abs((voyageChop(x+eps,z,t).height-voyageChop(x-eps,z,t).height)/(2*eps)-c.slopeX)<1e-5);
  const w=sampleOceanWaveAt(x,z,t,.5,null,true),base=sampleOceanWaveAt(x,z,t,.5);
  assert.ok(Math.abs(w.height-base.height-.98*c.height)<1e-7);assert.ok(Math.abs(Math.hypot(...w.normal)-1)<1e-6);
});
