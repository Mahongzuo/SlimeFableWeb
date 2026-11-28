import {capacityProgress, changeShells, initializeWallet} from './shell-wallet';
import {ensureHome, type AdoptedAnimal, type LifeData} from './state';
import {starterIds} from './companion-catalog';
import {RANCH_SPECIES_MAP} from './ranch';

export const DAY = 86400000;
export const RESCUE_MS = 30*60*1000;
export function initializeCare(life: LifeData, now = Date.now()) {
  initializeWallet(life);
  const ranch = ensureHome(life).ranch!;
  if (ranch.animals.some(a=>!a.care) && !ranch.starter) ranch.starter = 'claimed';
  let following = false;
  for (const a of ranch.animals) {
    a.care ??= {born:now-10*DAY,due:now+DAY,reserve:0,rescueMs:0,notified:false};
    if (a.following && following) a.following = false;
    following ||= !!a.following;
  }
  return ranch;
}
export function newCare(now: number, reserve = 0) {
  return {born:now,due:now+DAY,reserve,rescueMs:0,notified:false};
}
export function growth(a: AdoptedAnimal, now = Date.now()) {
  const t = a.care ? Math.max(0,Math.min(1,(now-a.care.born)/(10*DAY))) : 1;
  return .2 + 1.3*t*t*(3-2*t);
}
export function petAsset(a: AdoptedAnimal, now = Date.now()) {
  if (growth(a,now)>=1.5) {
    if (a.speciesId==='ranch-chick') return 'ranch-hen';
    if (a.speciesId==='ranch-duckling') return 'ranch-pekin-duck';
  }
  return a.speciesId;
}
export function claimStarter(life: LifeData,id: string,now = Date.now()) {
  const ranch = initializeCare(life,now), sp = RANCH_SPECIES_MAP[id];
  if (!starterIds.includes(id) || !sp || ranch.starter==='claimed' || ranch.animals.length>=capacityProgress(life).total) return false;
  ranch.starter='claimed';
  if (!ranch.discovered.includes(id)) ranch.discovered.push(id);
  ranch.animals.push({id:'first-'+now.toString(36),speciesId:id,name:sp.name,adoptedAt:now,affection:60,mood:100,following:true,care:newCare(now,2)});
  return true;
}
export function mealState(a: AdoptedAnimal,now=Date.now()) {
  if (!a.care || now<a.care.due) return '饱足';
  return now-a.care.due>=DAY?'濒危':'饥饿';
}
export function feedNow(a: AdoptedAnimal,now=Date.now()) {
  if (!a.care) return;
  a.care.due=now+DAY; a.care.notified=false; a.care.rescueMs=0; a.mood=100;
}
export function buyRation(life: LifeData,id:string,now=Date.now()) {
  settleMeals(life,now);
  const a=life.home?.ranch?.animals.find(a=>a.id===id);
  if (!a?.care || (mealState(a,now)==='饱足' && a.care.reserve>=3) || !changeShells(life,-3,'spend')) return false;
  if (mealState(a,now)==='饱足') a.care.reserve++;
  else feedNow(a,now);
  return true;
}
export function settleMeals(life:LifeData,now:number) {
  const ranch=initializeCare(life,now);
  for (const a of ranch.animals) {
    const c=a.care!;
    const used=Math.min(c.reserve,Math.max(0,1+Math.floor((now-c.due)/DAY)));
    c.due+=used*DAY; c.reserve-=used;
  }
  return ranch;
}
/** The UI explicitly acknowledges the list of named animals before playable time begins. */
export function advanceRescue(life:LifeData, now:number, playableMs:number) {
  const ranch=settleMeals(life,now);
  const pending:string[]=[];
  for (const a of [...ranch.animals]) {
    if (mealState(a,now)!=='濒危') continue;
    if (!a.care!.notified) { pending.push(a.id); continue; }
    a.care!.rescueMs+=Math.max(0,playableMs);
    if (a.care!.rescueMs<RESCUE_MS) continue;
    (ranch.memorials??=[]).push({id:a.id,name:a.name,speciesId:a.speciesId,at:now});
    ranch.animals.splice(ranch.animals.indexOf(a),1);
  }
  return pending;
}

