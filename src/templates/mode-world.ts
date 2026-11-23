// Playable topology and stage machinery are fictional. Historical text is supplied by the daily card.
import {rng} from './random';
import type {Box,Vec,ShotView} from '../slime/types';
import type {WorldDefinition,CollisionWorld,GroundSurface} from '../slime/world';

export interface Station {label:string;at:Vec}
export type Story='ceres'|'tiros'|'wow'|'life'|'ink'|'memorial';
export const worldStory=(day:string,kind:string):Story=>kind==='shot'?(day==='0101'?'ceres':day==='1123'?'tiros':'wow'):(day==='0101'?'ink':day==='1123'?'life':'memorial');
export interface Layout {
 day:string; story:Story; world:WorldDefinition; spawn:Vec; end:Vec; pads:Vec[]; stations:Station[];
 targets:Vec[]; latch:Vec; side:number; sidePath:Vec[]; mainPath:Vec[];
}
const slab=(x:number,z:number,w:number,d:number,y=0):GroundSurface=>({min:[x-w/2,z-d/2],max:[x+w/2,z+d/2],height:y});
const solid=(name:string,x:number,z:number,w:number,d:number,bottom:number,top:number):Box=>({name,min:[x-w/2,bottom,z-d/2],max:[x+w/2,top,z+d/2]});
export function generateLayout(day:string,seed:string,kind:'shot'|'trial'='trial'):Layout{
 const r=rng(seed),side=r.chance(.5)?1:-1,deck=side*r.range(2.8,3.4),z=r.range(-.45,.45);
 const spawn:Vec=[0,0,5.25],end:Vec=[0,0,-5.15],world:WorldDefinition={surfaces:[],boxes:[],bounds:{min:[-7,-4,-8],max:[7,10,8]}};
 const story=worldStory(day,kind);
 const l:Layout={day,story,world,spawn,end,side,pads:[],stations:[],targets:[],latch:[0,0,-2],mainPath:[],sidePath:[]};
 const station=(label:string,at:Vec)=>l.stations.push({label,at});
 if(story==='ceres'){
   world.surfaces.push(slab(0,0,8.6,12.8));
   world.boxes.push(solid('望远镜支座',deck*.40,1.55,.7,1.30,0,1.13));
   station('西侧目镜',[-deck,0,2.72]);station('子午仪',[0,0,.12]);station('东侧目镜',[deck,0,-2.42]);
   l.targets=l.stations.map(({at:[x,,z0]},i)=>[x*.68,1.35+i*.12,z0-1.5+z*.34]);
   // The middle meridian instrument periodically masks the moving point. A slight sidestep within the sight ring changes the line.
   world.boxes.push(solid('子午仪标尺',.08*side,-.86,.12,.12,0,1.38));
   l.mainPath=[spawn,...l.stations.map(s=>s.at),end];l.sidePath=[spawn,[-deck,0,1.25],[-deck,0,-3.4],end];
 }else if(story==='tiros'){
   world.surfaces.push(slab(0,0,10.4,12.8));
   world.boxes.push(solid('高空观测台',deck,-.65,2.35,5,0,1.26),solid('遥测机柜',-deck*.97,-.65,1.05,.45,0,1.32));
   station('观测台',[deck,1.26,-.7]);l.pads=[[-1.05*side,0,3.48]];
   l.targets=[[-deck,1.12,-2.1+z],[0,1.55,-1.26],[deck,2.04,-2.8]];
   l.mainPath=[spawn,[-deck*.53,0,2.8],[-deck*.53,0,-2.9],end];
   l.sidePath=[spawn,[deck,0,2.6],l.stations[0].at,[deck,0,-3.9],end];
 }else if(story==='wow'){
   world.surfaces.push(slab(0,0,10.7,12.8));world.boxes.push(solid('电缆配线箱',-deck,1.3,.92,.62,0,.94));
   l.pads=[[deck,0,-1.42+z*.25],[-deck,0,-2.23+z*.25]];station('馈线台',[0,0,.45]);
   l.mainPath=[spawn,[deck*.42,0,2.4],l.stations[0].at,end];
   l.sidePath=[spawn,[-deck*.48,0,1.7],[-deck*.48,0,-2.9],end];
 }else if(story==='life'){
   world.surfaces.push(slab(0,0,11,13));
   world.boxes.push(solid('摄影架',deck,-.2,2,7.4,0,1.6),
     solid('轮转机检修槽',-deck,z,2.2,2.2,.28,1.3),
     solid('墨辊护板',.55*side,-.6,.36,2.2,0,1.6));
   l.latch=[-deck,0,-2.45];
   station('水坝取景框',[deck,1.6,-1.4]);station('滚筒下方',[-deck,0,z]);
   l.mainPath=[spawn,[-deck,0,3.5],[-deck,0,z],l.latch,end];
   l.sidePath=[spawn,[deck,0,4.3],[deck,1.6,2.7],l.stations[0].at,[deck,1.6,-3.7],end];
 }else if(day==='0101'){
   world.surfaces.push(slab(0,0,11,13,-.45),slab(-3.5,0,4,13),slab(3.5,0,4,13),
    slab(0,4.95,3.1,3.1),slab(0,-5.05,3.1,2.9));
   world.fluids=[{min:[-1.5,-3.59],max:[1.5,3.39],level:-.23,sink:.16}];
   world.boxes.push(solid('石拱桥',0,z,3.5,1.2,-.14,.08),
    solid('晾纸阁',deck,-2.8,1.8,1.8,0,1.2),solid('画屏',-deck,z-.35,.23,2.1,0,1.55));
   station('印坊的方印',[-deck,0,2.7]);station('水院的圆印',[0,-.39,1.85]);station('晾纸阁的长印',[deck,1.2,-2.8]);
   l.mainPath=[spawn,[-deck,0,3],[-4.8*side,0,-2.5],[-deck,0,-5],end];
   l.sidePath=[spawn,[deck,0,3],[deck,0,z],[0,.08,z],[-deck*.66,0,z],[-2.15*side,0,-5],end];
 }else{
   // Both paths leave and rejoin the entry court. The left path rises gradually; the right overlooks the pool.
   world.surfaces.push(slab(0,5,11,3),slab(0,-5,11,3),
    slab(-deck,0,2.8,7.2),slab(deck,0,2.8,7.2));
   const ramp=slab(-deck,0,2.8,6,.24);ramp.slope=[0,-.04];world.surfaces.push(ramp);
   world.boxes.push(solid('远灯望台',deck,0,2.1,3.7,0,1.15));
   station('缓坡廊灯',[-deck,.13,-.35]);station('高处灯台',[deck,1.15,-.74]);
   l.mainPath=[spawn,[-deck,0,4],l.stations[0].at,[-deck,0,-4.25],end];
   l.sidePath=[spawn,[deck,0,3.3],[deck,1.15,1.45],l.stations[1].at,[deck,0,-4.25],end];
 }
 return l;
}
export function near(a:Vec,b:Vec,r=1.05){return Math.hypot(a[0]-b[0],a[2]-b[2])<r&&Math.abs(a[1]-b[1])<.72;}
/** Aim the flying clone's centre at the height where its collision skin first touches the receiver. */
export function receiverAim([x,y,z]:Vec):Vec{return [x,y+.082,z];}
export function lamps(l:Layout,shots:ShotView[]){return l.pads.map(p=>shots.some(s=>s.phase==='active'&&near(s.center,p,.78)));}
export function observationPoint(l:Layout,i:number,time:number):Vec{
 const [x,y,z]=l.targets[i];
 return l.story==='ceres'?[x+.38*Math.sin(time*.7+i),y+.18*Math.sin(time*.55),z+.20*Math.cos(time*.52+i)]
  :[x+.56*Math.sin(time*.6+i),y+.10*Math.sin(time*.8+i),z+.19*Math.cos(time*.52+i)];
}
// Moving sphere interception in the projectile's relative frame; compare the first contact with world occlusion.
export function sweptImpact(from:Vec,to:Vec,oldTarget:Vec,newTarget:Vec,radius:number,world:CollisionWorld){
 const start=from.map((v,i)=>v-oldTarget[i]) as Vec;
 const delta=to.map((v,i)=>v-from[i]-(newTarget[i]-oldTarget[i])) as Vec;
 const dot=(a:Vec,b:Vec)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 const a=dot(delta,delta),b=dot(start,delta),c=dot(start,start)-radius*radius;
 let t=0;
 if(c>0){const disc=b*b-a*c;if(a<1e-9||disc<0)return null;t=(-b-Math.sqrt(disc))/a;if(t<0||t>1)return null;}
 const obstacle=world.cast(from,to,.045);
 return obstacle&&obstacle.t<=t?null:t;
}
export function phaseCanHit(before:ShotView,after:ShotView){
 return (before.phase==='flying'||before.phase==='separating')&&(after.phase==='flying'||after.phase==='active');
}

