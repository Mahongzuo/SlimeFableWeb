import {dailyModes} from '../../content/daily-modes';
import {days} from '../../content/registry';
import {gateContains,gatesFor} from './mode-gates';
import {ZONES} from '../world/map';
import {slotForTile} from '../world/expansion';
import type {ExpandedTile} from '../life/state';
import type {CollisionWorld} from '../slime/world';
import type {ShardSpot} from '../home/layout';

export const SHARD_COUNT=12, SHARD_SHELLS=3, GATE_SHELLS=8;
export const beijingDay=(now=Date.now())=>new Date(now+8*3600000).toISOString().slice(0,10);
export interface DailySpot extends ShardSpot {area:string;y:number}
export interface HomeDaily {date:string;gates:number[];lastWin?:string;shards:string[];spots:DailySpot[]}
export function completedGate(id:string){
  const mode=dailyModes.find(m=>m.saveId===id);
  const day=days[mode?.day??id.split('-')[0]];
  if(!day)return 0;
  return 1+gatesFor(day).findIndex(g=>gateContains(g,mode?.id??id));
}
function seeded(key:string){
  let seed=5381;
  for(const c of key)seed=(Math.imul(seed,33)^c.charCodeAt(0))>>>0;
  return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}
/** Keep found pieces and existing accessible locations stable across reloads and expansion edits. */
export function dailyLocations(daily:HomeDaily,tiles:ExpandedTile[],world:CollisionWorld){
  const extra=tiles.map(slotForTile).filter(s=>!!s).sort((a,b)=>a.id.localeCompare(b.id));
  const areas=[...ZONES,...extra];
  const spots:DailySpot[]=[];
  function clearHeight(x:number,z:number){
    const y=world.support(x,z),ground=world.terrain(x,z),water=world.fluid(x,z);
    if(y===null||ground===null||Math.abs(y-ground)>.38||(water!==null&&water>ground+.06))return null;
    for(const [dx,dz] of [[.42,0],[-.42,0],[0,.42],[0,-.42]]){
      const side=world.support(x+dx,z+dz);if(side===null||Math.abs(y-side)>.34)return null;
    }
    return y;
  }
  for(let i=0;i<SHARD_COUNT;i++){
    const id='piece-'+(i+1),rng=seeded(daily.date+'-'+id);
    const area=i>=10&&extra.length?extra[Math.floor(rng()*extra.length)]:ZONES[i%ZONES.length];
    const old=daily.spots.find(p=>p.id===id);
    if(old&&(daily.shards.includes(id)||(old.area===area.id&&clearHeight(old.x,old.z)!==null))){spots.push(old);continue;}
    // A densely built lot can run out of free ground. Try the other connected regions as well.
    for(const region of [area,...areas.filter(a=>a.id!==area.id)]){
      let spot:DailySpot|undefined;
      for(let n=0;n<140;n++){
        const x=region.min[0]+2+rng()*(region.max[0]-region.min[0]-4);
        const z=region.min[1]+2+rng()*(region.max[1]-region.min[1]-4);
        const y=clearHeight(x,z);
        if(y===null||spots.some(s=>Math.hypot(s.x-x,s.z-z)<2))continue;
        spot={id,x,z,y,area:region.id,hint:region.name};break;
      }
      if(spot){spots.push(spot);break;}
    }
  }
  return spots;
}
