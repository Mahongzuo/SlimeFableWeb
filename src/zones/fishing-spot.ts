import {lakeEdge,LAKE} from '../world/map';
import {riverDistance,riverLevel} from '../home/waterway';
import {waterNames} from '../life/fish-species';
import type {FishSpot} from '../life/fishing';
import type {Vec} from '../slime/types';
import type {PlayerHandle,ZoneContext} from './types';

/** Register the shore entrance; both piers and the ship use the home encounter. */
export function fishingSpot(z:ZoneContext,id:string,stand:Vec,toward:[number,number],spot:FishSpot) {
  const level=spot==='lake'?LAKE.level:riverLevel;
  z.interact({id,position:stand,radius:2.2,
    prompt:()=>z.ctx.angling?.active?null:{title:waterNames[spot]+'垂钓',sub:'F 选点抛竿 · 浮漂下沉时提竿'},
    act:()=>z.ctx.angling?.start({direction:toward,spot:()=>spot,level:()=>level,
      wet:(x:number,zz:number)=>(spot==='lake'?lakeEdge(x,zz)<1:riverDistance(x,zz)<2.8)
        && Math.max(z.ground(x,zz),z.ctx.anglingSupport?.(x,zz)??-Infinity)<level-.04}),
  });
  return (_t:number,_dt:number,_p:PlayerHandle)=>{};
}
