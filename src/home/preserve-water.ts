import {preserveHeight,type PreserveRect} from '../world/expansion';
import {trailX} from './preserve-trails';

export const wetlandLevel=.18;
const swimmers=new Set(['mute-swan','great-crested-grebe']);
export function waterBirdAnchor(r:PreserveRect,slug:string,x:number,z:number){
  if(r.biome!=='marsh')return {x,z};
  let best=Infinity,site={x,z};
  const target=swimmers.has(slug)?.39:.14;
  for(let dz=-10;dz<=10;dz++)for(let dx=-10;dx<=10;dx++){
    const xx=x+dx,zz=z+dz;
    let worst=0;
    for(let j=0;j<12;j++){
      const phase=Math.PI*j/6,px=xx+Math.sin(phase)*2.8,pz=zz+Math.cos(phase)*1.65;
      const depth=wetlandLevel-preserveHeight(r,px,pz);
      worst=Math.max(worst,Math.abs(target-depth)+Math.max(0,1.9-Math.abs(px-trailX(r,pz))));
    }
    const score=worst+.003*Math.hypot(dx,dz);
    if(score<best){best=score;site={x:xx,z:zz};}
  }
  return site;
}
export function animalWaterHeight(r:PreserveRect,slug:string,x:number,z:number,size:number,time:number){
  const ground=preserveHeight(r,x,z);
  const depth=r.biome==='marsh'||r.biome==='bamboo'?wetlandLevel-ground:0;
  const swim=swimmers.has(slug)&&depth>.11;
  const draft=size*(slug==='mute-swan'?.24:.17);
  const y=swim?Math.max(ground,wetlandLevel-draft+.016*Math.sin(time*1.75)):ground;
  return {y,swim,wet:depth>.025};
}
