import type {Vec} from '../slime/types';
export const sealStations:Vec[]=[[-2.8,.09,.25],[.75,.09,1.55],[3.2,.09,-1.45]];
export const hiddenImprint:Vec=[-5.62,.16,2.30];
export function sealCorner(i:number):Vec{const [x,y,z]=sealStations[i];return [x+.84,y+.02,z+.52];}
export type StampPhase='trial'|'trial-proof'|'choose'|'stamp'|'proof'|'lifting'|'done';
export function newStamp(){return {phase:'trial' as StampPhase,station:0,pinned:false,printed:false,clean:false,hidden:false,strikes:0,lift:0,trialLift:0,pressure:0};}
export type Stamp=ReturnType<typeof newStamp>;
export function press(s:Stamp){if(s.phase!=='trial'&&s.phase!=='stamp')return;
  s.printed=s.pinned;s.pressure=1;
  if(s.phase==='trial')s.phase='trial-proof';else{s.strikes++;s.clean=s.printed&&s.strikes===1;s.phase='proof';}
}
export function peel(s:Stamp){if(s.phase==='trial-proof'){s.phase='choose';s.pinned=false;}
  else if(s.phase==='proof'){s.phase='lifting';s.lift=0;}}
export function chooseStamp(s:Stamp,station:number){if(s.phase!=='choose'||(station!==1&&station!==2))return;s.station=station;s.pinned=false;s.phase='stamp';}
export function repairStamp(s:Stamp){if(s.phase==='proof'&&!s.printed){s.phase='stamp';s.pinned=false;}}
export function stepStamp(s:Stamp,dt:number){
  s.pressure=Math.max(0,s.pressure-dt*1.8);
  if(s.phase!=='trial'&&s.phase!=='trial-proof')s.trialLift=Math.min(1,s.trialLift+dt/.95);
  if(s.phase==='lifting'){s.lift=Math.min(1,s.lift+dt/2.4);if(s.lift===1)s.phase='done';}
}
