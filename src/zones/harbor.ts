import {riverLevel} from '../home/waterway';
import {fishingSpot} from './fishing-spot';
import {signpost} from './kit';
import type {ZoneBuilder} from './types';

export const harbor: ZoneBuilder = z => {
  const {T} = z, root = new T.Group();
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
    root.add(signpost(z,x-2.15*toward,zz+1.2,Math.PI/2*toward,label,'钓鱼 · 靠近木台按 F'));
    return fishingSpot(z,id,[x,floor,zz],[toward,0],'harbor');
  }
  const willow = landing('fish-harbor-pier',-11.1,8,1,'柳岸钓台');
  const creek = landing('fish-harbor-pontoon',-2.5,-16,-1,'南溪浅湾');
  return {root, update(t,dt,player) {willow(t,dt,player);creek(t,dt,player);}};
};
