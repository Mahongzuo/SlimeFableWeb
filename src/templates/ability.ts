import type {AbilitySpec} from '../../content/levels/types';
import type {Box,ShotView,Vec} from '../slime/types';
import type {WorldDefinition} from '../slime/world';
import {rng} from './random';

export function abilityLayout(s:AbilitySpec){
  const r=rng(s.id),dir=r.chance(.5)?1:-1;
  const spawn:Vec=[0,0,3],end:Vec=[0,0,-3.4],first:Vec=[0,0,2.7];
  const pads:Vec[]=[[dir*r.range(2.1,2.7),0,-2.7],[-dir*2.5,0,-2.45]];
  const marks:Vec[]=[[-1,0,.65],[0,0,-.65],[1,0,-1.3]];
  const buoy:Vec[]=[[dir*.8,-.22,.6],[-dir*.7,-.22,-1.6]];
  const target:Vec=[0,0,-1.2],boxes:Box[]=[];
  const bridge:Box={name:'检修桥',min:[-1,-4,-1.15],max:[1,-3.8,1.15]};
  const floor=(z1:number,z2:number,height:number)=>({min:[-5,z1] as [number,number],max:[5,z2] as [number,number],height});
  const world:WorldDefinition={boxes,surfaces:[floor(-5.8,5.8,0)],bounds:{min:[-6,-3,-7],max:[6,9,7]}};
  if(s.mode==='relay'){world.surfaces=[floor(-5.8,-1.1,0),floor(1.1,5.8,0)];boxes.push(bridge);}
  if(s.mode==='climb'){boxes.push({name:'攀爬台',min:[-1.7,-.1,-4.5],max:[1.7,1.8,-1]});end[1]=1.8;}
  if(s.mode==='tide'){world.surfaces=[floor(-5.8,-2.6,0),floor(1.4,5.8,0),floor(-2.6,1.4,-.25)];world.fluids=[{min:[-5,-2.6],max:[5,1.4],level:-.09,sink:.16}];}
  return {spawn,end,first,pads,marks,buoy,target,bridge,world};
}
export type Layout=ReturnType<typeof abilityLayout>;
export const close=(a:Vec,b:Vec,r=.93)=>Math.hypot(a[0]-b[0],a[2]-b[2])<r&&Math.abs(a[1]-b[1])<.62;
export interface Signals {position:Vec;element:number;spread:number;swimming:boolean;clinging:boolean;shots:ShotView[];hits:number;hitElement:number;combo:number}
export function initialState(){return {step:0,contact:[false,false],flowers:0,lastZ:3,lastHits:0,recall:false,climbed:false,ready:false};}
export type Puzzle=ReturnType<typeof initialState>;
export function observe(s:AbilitySpec,l:Layout,p:Puzzle,a:Signals){
  p.contact=l.pads.map(pad=>a.shots.some(shot=>shot.phase==='active'&&close(shot.center,pad,.76)));
  if(s.mode==='relay'){
    if(p.step===0&&p.contact[0]&&p.lastZ>-.98&&a.position[2]<=-.98&&Math.abs(a.position[0])<1.15)p.step=1;
    if(p.step===1&&!p.contact[0])p.step=0;
    if(p.step===2&&p.recall&&a.shots.length===0)p.ready=true;
  }else if(s.mode==='combo'&&a.hits>p.lastHits){
    if(a.hitElement===s.element){
      if(a.combo===0)p.step=1;
      else if(p.step===1&&a.combo===1)p.ready=true;
    }else p.step=0;
  }else if(s.mode==='climb'&&a.clinging&&a.position[1]>.55)p.climbed=true;
  else if(s.mode==='tide'&&p.step>=1&&p.step<=2&&a.swimming&&a.element===0&&close(a.position,l.buoy[p.step-1]))p.step++;
  else if(s.mode==='duet'&&p.contact.every(Boolean)){
    l.marks.forEach((v,i)=>{if(close(v,a.position,.72))p.flowers|=1<<i;});
    if(p.flowers===7)p.ready=true;
  }
  p.lastHits=a.hits;p.lastZ=a.position[2];
}
export function operate(s:AbilitySpec,l:Layout,p:Puzzle,a:Signals){
  if(p.ready)return close(a.position,l.end,1.45);
  const here=close(a.position,l.end,1.2);
  switch(s.mode){
    case 'relay':if(p.step===1&&p.contact[0]&&here&&a.element===s.element)p.step=2;break;
    case 'circuit':
      if(!p.step&&close(a.position,l.first)&&a.element===(s.element+1)%6)p.step=1;
      else if(p.step&&here&&a.spread>.72&&a.element===s.element)p.ready=true;
      break;
    case 'climb':if(p.climbed&&here&&a.element===s.element)p.ready=true;break;
    case 'tide':if(!p.step&&close(a.position,l.first)&&a.element===1)p.step=1;
      else if(p.step===3&&here&&a.element===0)p.ready=true;
  }
  return false;
}
export function requestRecall(p:Puzzle,a:Signals){if(p.step===2&&p.contact[0]&&a.shots.some(s=>s.phase==='active'))p.recall=true;}
