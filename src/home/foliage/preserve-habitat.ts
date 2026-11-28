import {preserveHeight, type PreserveRect} from '../../world/expansion';
import {pathEdge} from '../preserve-trails';
import {DoubleSide, type Material} from 'three';

/** Needle sprigs occupy a small fraction of their texture. Preserve their coverage in lower mips. */
export function prepareCanopyMaterial(asset:string,material:Material){
  if(asset==='redwood-tree'&&material.name==='Redwood_Needles'){
    material.alphaTest=.14;material.side=DoubleSide;
  }
}

export type FieldFlower = 'daisy'|'lupin'|'buttercup'|'poppy'|'oat'|'iris'|'gentian';
export interface Habitat {
  tint:number; ground:[number,number]; blade:[number,number]; bloom:FieldFlower[]; flowerScale:number; drifts:number;
}
export const habitats:Record<string,Habitat> = {
  trail:{tint:0xa2bd6a,ground:[0x869c61,0xaab67b],blade:[.88,1.12],bloom:['daisy','oat','buttercup'],flowerScale:.83,drifts:2200},
  redwoods:{tint:0x86aa63,ground:[0x697752,0x94ac70],blade:[.65,1.55],bloom:['daisy','buttercup'],flowerScale:.62,drifts:1900},
  prairie:{tint:0xb3c65c,ground:[0xb5ae69,0xa7c574],blade:[1.24,1.06],bloom:['oat','buttercup','daisy'],flowerScale:1.03,drifts:4200},
  marsh:{tint:0x93b96e,ground:[0x687f63,0xa9bb76],blade:[1.19,1.44],bloom:['iris','lupin','buttercup'],flowerScale:.91,drifts:3200},
  bamboo:{tint:0x87b275,ground:[0x779477,0xa0b678],blade:[.77,.85],bloom:['daisy','iris'],flowerScale:.73,drifts:2100},
  alpine:{tint:0xa6b991,ground:[0x839789,0xb6bf91],blade:[.68,1.16],bloom:['gentian','buttercup','daisy'],flowerScale:.86,drifts:4300},
};

const smooth=(lo:number,hi:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-lo)/(hi-lo)));return t*t*(3-2*t);};
export function habitatPatch(x:number,z:number){
  // Large connected drifts, broken at the edges by smaller pockets.
  return .5+.24*Math.sin(.23*x+1.5*Math.sin(.13*z))+.18*Math.cos(.29*z-.12*x)+.08*Math.sin(.83*x+.44*z);
}
export function preserveCover(r:PreserveRect,x:number,z:number){
  const cx=(r.minX+r.maxX)/2, cz=(r.minZ+r.maxZ)/2;
  const verge=smooth(-.08,.60,pathEdge(r,x,z));
  if(r.biome==='trail')return verge*(.75+.25*habitatPatch(x,z));
  const plots=Math.min(...[-11,11].map(dx=>Math.max(Math.abs(x-cx-dx)-4.15,Math.abs(z-r.minZ-8)-3.05)));
  const clear=verge*smooth(.10,.95,plots);
  if(!clear)return 0;
  const y=preserveHeight(r,x,z),patch=habitatPatch(x,z);
  switch(r.biome){
    case 'marsh':return clear*smooth(.14,.36,y)*(.71+.29*patch);
    case 'bamboo':return clear*smooth(.18,.41,y)*(.68+.32*patch);
    case 'alpine':return clear*(1-.94*smooth(5.3,7.3,y))*(.69+.31*patch);
    case 'redwoods':return clear*(.49+.50*patch);
    default:return clear*(.78+.22*patch);
  }
}

export function bloomSuitability(r:PreserveRect,x:number,z:number) {
  const y=preserveHeight(r,x,z), patch=habitatPatch(x,z);
  if(r.biome==='marsh')return (1-smooth(.38,.83,y))*.76+.24*patch;
  if(r.biome==='alpine')return (1-smooth(4.8,6.6,y))*(.28+.72*patch);
  if(r.biome==='redwoods')return smooth(.32,.84,patch);
  return .25+.75*patch;
}
