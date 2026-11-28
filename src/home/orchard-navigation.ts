import {slotForTile, EXPANSION_THEMES, expansionSurfaceWeights, type ExpansionSlot} from '../world/expansion';
import type {ExpandedTile, HomeBuildState} from '../life/state';
import {BUILD_ITEMS} from './build-catalog';
import type {Box} from '../slime/types';

export type GardenPoint = [number, number];
export interface TreeFootprint {x: number; z: number; radius: number}

export function ownedGardenAt(tiles: ExpandedTile[], x: number, z: number) {
  for (const tile of tiles) {
    const slot = slotForTile(tile);
    if (slot && inside(slot, x, z, 0)) return {tile, slot};
  }
  return null;
}

function inside(slot: ExpansionSlot, x: number, z: number, inset: number) {
  return x >= slot.min[0] + inset && x < slot.max[0] - inset &&
    z >= slot.min[1] + inset && z < slot.max[1] - inset;
}

function hitsRect(x: number, z: number, radius: number, cx: number, cz: number, hx: number, hz: number, yaw = 0) {
  const dx = x - cx, dz = z - cz, cos = Math.cos(yaw), sin = Math.sin(yaw);
  const ox = Math.max(0, Math.abs(dx*cos - dz*sin) - hx);
  const oz = Math.max(0, Math.abs(dx*sin + dz*cos) - hz);
  return ox*ox + oz*oz < radius*radius;
}

/** Only obstacles on this plot enter the walking grid. Distant home architecture is excluded once per plan. */
export function gardenSite(
  tile: ExpandedTile, slot: ExpansionSlot, home: HomeBuildState, trees: TreeFootprint[],
  ground: (x: number, z: number) => number | null, fluid: (x: number, z: number) => number | null, boxes: Box[],
) {
  const w = slot.max[0] - slot.min[0], h = slot.max[1] - slot.min[1];
  const cx = slot.min[0] + w/2, cz = slot.min[1] + h/2;
  const nearby = boxes.filter(b => {
    const bx = (b.min[0]+b.max[0])/2, bz = (b.min[2]+b.max[2])/2;
    const reach = Math.hypot(b.max[0]-b.min[0], b.max[2]-b.min[2])/2 + 3;
    return Math.abs(bx-cx) <= w/2+reach && Math.abs(bz-cz) <= h/2+reach;
  });
  const blocked = (x: number, z: number, y: number, radius: number) => nearby.some(b => {
    if (b.max[1] <= y+.07 || b.min[1] > y+1.2) return false;
    return hitsRect(x,z,radius,(b.min[0]+b.max[0])/2,(b.min[2]+b.max[2])/2,
      (b.max[0]-b.min[0])/2,(b.max[2]-b.min[2])/2,b.yaw);
  });
  function wet(x: number, z: number, y: number) {
    const level = fluid(x,z);
    return level !== null && y < level + .025;
  }
  function walkable(x: number, z: number, radius=.48) {
    const y = ground(x,z);
    if(y===null || !inside(slot,x,z,radius) || wet(x,z,y) || blocked(x,z,y,radius))return false;
    // Leave room for the body to round a waypoint along the waterline.
    for(const [dx,dz] of [[radius,0],[-radius,0],[0,radius],[0,-radius]]) {
      const wx=x+dx,wz=z+dz,level=fluid(wx,wz);
      if(level!==null && (ground(wx,wz)??-Infinity)<level+.025)return false;
    }
    return true;
  }
  function reason(x: number, z: number, radius: number) {
    if (!inside(slot,x,z,radius)) return '树冠超出当前扩建地块';
    const y = ground(x,z);
    if (y === null || wet(x,z,y)) return '水面无法扎根';
    for (const [dx,dz] of [[.6,0],[-.6,0],[0,.6],[0,-.6]]) {
      const sy = ground(x+dx,z+dz);
      if (sy === null || wet(x+dx,z+dz,sy)) return '树根离水边太近';
      if (Math.abs(y-sy) > .34) return '这段坡地太陡';
    }
    if (expansionSurfaceWeights(x,z,slot,tile.theme).road > .02) return '给地块小径留出通道';
    if (home.paving.some(p => hitsRect(x,z,.5,p.x,p.z,1,1))) return '此处已铺路或铺设种植带';
    for (const p of home.placed) {
      const def = BUILD_ITEMS[p.itemId];
      if (def && hitsRect(x,z,radius,p.x,p.z,def.width*p.scale/2,def.depth*p.scale/2,p.yaw))
        return '离' + def.name + '太近';
    }
    if (blocked(x,z,y,Math.max(.6,radius*.6))) return '此处有建筑或障碍';
    for (const p of EXPANSION_THEMES[tile.theme].naturalProps) {
      if (Math.hypot(x-slot.min[0]-w*p.u,z-slot.min[1]-h*p.v) < p.width*.46 + radius)
        return '给原生植物和景物留些空间';
    }
    if (trees.some(p => Math.hypot(x-p.x,z-p.z) < p.radius+radius)) return '成年树冠间距不足';
    return '';
  }
  return {walkable,reason,ground};
}

/** A one-metre grid per batch handles fences and pond detours; diagonal edges must clear both corners. */
export function orchardRoutes(slot: ExpansionSlot, from: GardenPoint, site: Pick<ReturnType<typeof gardenSite>,'ground'|'walkable'>) {
  const x0=Math.ceil(slot.min[0]), z0=Math.ceil(slot.min[1]);
  const w=Math.ceil(slot.max[0])-x0, h=Math.ceil(slot.max[1])-z0;
  const path = new Int32Array(w*h).fill(-1), pass=new Int8Array(w*h).fill(-1);
  const heights = new Float32Array(w*h);
  const index=(x:number,z:number)=>z*w+x;
  const available=(x:number,z:number)=>{
    if (x<0||x>=w||z<0||z>=h) return false;
    const k=index(x,z);
    if(pass[k]<0) {
      const gx=x0+x,gz=z0+z;
      pass[k]=site.walkable(gx,gz)?1:0;
      heights[k]=site.ground(gx,gz)??0;
    }
    return pass[k]===1;
  };
  function connection(a:GardenPoint,b:GardenPoint) {
    const d=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const steps=Math.max(1,Math.ceil(d/.45));let prev=site.ground(...a);
    for(let i=1;i<=steps;i++) {
      const x=a[0]+(b[0]-a[0])*i/steps,z=a[1]+(b[1]-a[1])*i/steps,y=site.ground(x,z);
      if(y===null||prev===null||Math.abs(y-prev)>.32||!site.walkable(x,z))return false;
      prev=y;
    }
    return true;
  }
  const startOptions: GardenPoint[]=[];
  const sx=Math.round(from[0])-x0,sz=Math.round(from[1])-z0;
  for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++) if(available(sx+i,sz+j))startOptions.push([sx+i,sz+j]);
  startOptions.sort((a,b)=>Math.hypot(x0+a[0]-from[0],z0+a[1]-from[1])-Math.hypot(x0+b[0]-from[0],z0+b[1]-from[1]));
  const start=startOptions.find(([x,z])=>connection(from,[x+x0,z+z0]));
  const queue:number[]=[];
  if(start){const k=index(...start);path[k]=k;queue.push(k);}
  const dirs:GardenPoint[]=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
  for(let i=0;i<queue.length;i++) {
    const k=queue[i],x=k%w,z=Math.floor(k/w);
    for(const [dx,dz] of dirs){
      const nx=x+dx,nz=z+dz;
      if(!available(nx,nz))continue;
      const n=index(nx,nz);
      if(path[n]>=0||Math.abs(heights[n]-heights[k])>.40)continue;
      if(dx&&dz&&(!available(nx,z)||!available(x,nz)))continue;
      if(!site.walkable(x0+x+dx*.5,z0+z+dz*.5))continue;
      path[n]=k;queue.push(n);
    }
  }
  return (target:GardenPoint):GardenPoint[]|null=>{
    const x=Math.round(target[0])-x0,z=Math.round(target[1])-z0;
    if(!available(x,z))return null;
    let k=index(x,z);
    if(path[k]<0||!connection([x+x0,z+z0],target))return null;
    const turns:GardenPoint[]=[[...target]];
    let nextDir=-Infinity;
    while(path[k]!==k) {
      const parent=path[k],dir=k-parent;
      if(dir!==nextDir){turns.push([k%w+x0,Math.floor(k/w)+z0]);nextDir=dir;}
      k=parent;
    }
    turns.push([k%w+x0,Math.floor(k/w)+z0]);
    const result:GardenPoint[]=[];let anchor:GardenPoint=from;
    for(let i=turns.length-1;i>=0;){
      let chosen=i;
      while(chosen>0 && connection(anchor,turns[chosen-1]))chosen--;
      if(Math.hypot(turns[chosen][0]-anchor[0],turns[chosen][1]-anchor[1])>.10)result.push(turns[chosen]);
      anchor=turns[chosen];i=chosen-1;
    }
    return result;
  };
}

export function plantingSpots(slot: ExpansionSlot, from: GardenPoint, radius: number, count: number,
  valid: (x:number,z:number)=>boolean, reachable: (point:GardenPoint)=>boolean) {
  const points:GardenPoint[]=[];
  const candidates:GardenPoint[]=[];
  const spacing=Math.max(radius*2+.6,3);
  for(let z=slot.min[1]+radius+1,row=0;z<slot.max[1]-radius;z+=spacing,row++) {
    for(let x=slot.min[0]+radius+1+(row%2)*spacing/2;x<slot.max[0]-radius;x+=spacing) {
      if(valid(x,z))candidates.push([x,z]);
    }
  }
  candidates.sort((a,b)=>Math.hypot(a[0]-from[0],a[1]-from[1])-Math.hypot(b[0]-from[0],b[1]-from[1]));
  for(const p of candidates){
    if(points.length>=count)break;
    if(reachable(p))points.push(p);
  }
  return points;
}
