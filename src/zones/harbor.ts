import {riverDistance, riverLevel} from '../home/waterway';
import {gardenRoads, getNativeTreeSpots} from '../home/garden-regions';
import {coastalSeabedHeightAt} from '../world/island-coast';
import {SEA_LEVEL} from '../home/layout';
import {fishingSpot} from './fishing-spot';
import {signpost, tufts} from './kit';
import {buildCoastalBambooISM} from '../home/foliage/bamboo-ism';
import type {ZoneBuilder} from './types';

export const harbor: ZoneBuilder = z => {
  const {T} = z, root = new T.Group();
  const harborTrees = getNativeTreeSpots('harbor');
  // Coastal meadows on harbor hills & banks, spilling organically across x=31 onto the grassy coast rim!
  const coastalCtx = {...z, ground: (x: number, zz: number) => coastalSeabedHeightAt(x, zz)};
  root.add(
    tufts(
      coastalCtx,
      4100,
      {min: [-30, -34], max: [36, 30]},
      (x, zz) => {
        const gy = coastalSeabedHeightAt(x, zz);
        const jitter = 0.22 * Math.sin(x * 0.45 + zz * 0.35);
        const onRoad =
          !!gardenRoads.typeAt(x, zz) ||
          !!gardenRoads.typeAt(x + 0.45, zz) ||
          !!gardenRoads.typeAt(x - 0.45, zz) ||
          !!gardenRoads.typeAt(x, zz + 0.45) ||
          !!gardenRoads.typeAt(x, zz - 0.45);
        const onPlanter =
          (Math.abs(x - 2.2) < 2.05 && Math.abs(zz - 11.3) < 1.1) ||
          (Math.abs(x - 2.2) < 1.65 && Math.abs(zz - 23.6) < 0.9) ||
          (Math.abs(x - 22.7) < 1.45 && Math.abs(zz - 12.8) < 0.9) ||
          (Math.abs(x - 22.4) < 1.55 && Math.abs(zz - 29.5) < 0.9) ||
          Math.hypot(x - 3, zz - 29) < 2.45;
        const onTree = harborTrees.some(([tx, tz, r]) => Math.hypot(x - tx, zz - tz) < r);
        return (
          Math.hypot(x - 10, zz - 17) < 10.6 ||
          riverDistance(x, zz) < 4.7 ||
          onRoad ||
          onPlanter ||
          onTree ||
          gy < SEA_LEVEL + 0.46 + jitter
        );
      },
      [0x6fb84d, 0xffe066, 0xffb8cc, 0xffffff],
    ),
  );
  root.add(buildCoastalBambooISM(z));
  function landing(id: string, x: number, zz: number, toward: number, label: string) {
    const floor = Math.max(riverLevel + .35, z.ground(x, zz) + .08);
    const pier = new T.Group();
    pier.name = 'fishing-pier';
    root.add(pier);
    function timber(geometry: any, color: number, dx: number, y: number, dz: number) {
      const mesh = new T.Mesh(geometry, z.toon(color));
      mesh.position.set(x + dx * toward, y, zz + dz);
      mesh.castShadow = mesh.receiveShadow = true;
      pier.add(mesh);
      return mesh;
    }
    const plank = new T.BoxGeometry(.29, .13, 1.66);
    for (let i = 0; i < 10; i++) timber(plank, i % 3 ? 0x967a58 : 0xa88b66, (i - 4) * .30, floor - .065, 0);
    const post = new T.CylinderGeometry(.095, .12, 1.65, 9);
    for (const dx of [-.97, 1.38]) for (const dz of [-.78, .78]) {
      timber(post,0x76624e,dx,floor - .36,dz);
      timber(new T.TorusGeometry(.113, .024, 5, 10), 0xb6a07d, dx, floor + .30, dz).rotation.x = Math.PI / 2;
    }
    root.add(signpost(z,x-2.15*toward,zz+1.2,Math.PI/2*toward,label,id==='fish-harbor-pier'?'F 钓鱼 · H 史莱姆号启航':'钓鱼 · 靠近木台按 F'));
    return fishingSpot(z,id,[x,floor,zz],[toward,0],id==='fish-harbor-pier'?'canal':'waterfall');
  }
  const willow = landing('fish-harbor-pier',-11.1,8,1,'柳岸钓台');
  const creek = landing('fish-harbor-pontoon',-2.5,-16,-1,'南溪浅湾');
  return {root, update(t,dt,player) {willow(t,dt,player);creek(t,dt,player);}};
};
