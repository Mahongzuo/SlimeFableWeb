import test from 'node:test';
import assert from 'node:assert/strict';
import {freshLife,ensureHome} from '../src/life/state';
import {DAY,RESCUE_MS,advanceRescue,buyRation,claimStarter,feedNow,growth,initializeCare,mealState,petAsset,settleMeals} from '../src/life/companion-care';
import {capacityProgress,changeShells,initializeWallet} from '../src/life/shell-wallet';
import {adoptRanchAnimal,toggleAnimalFollow} from '../src/life/ranch';
import {cottageData,placeFurniture} from '../src/home/homestead';
import {preserveLayout,preserveRects,preserveHeight,computeDynamicFrontier} from '../src/world/expansion';
import {inland} from '../src/world/map';
import {starterIds} from '../src/life/companion-catalog';
const then=1700000000000;
test('new wallet counts actual earnings, never grants or housing refunds, and capacity is permanent',()=>{
 const life=freshLife();initializeWallet(life);
 changeShells(life,40,'grant');changeShells(life,82,'refund');assert.equal(capacityProgress(life).total,1);
 let prev=0;for(const [amount,slots] of [[100,2],[350,3],[900,5],[2200,8],[5000,12]]){
   changeShells(life,amount-prev,'earn');changeShells(life,-(amount-prev),'spend');assert.equal(capacityProgress(life).total,slots);prev=amount;
 }
});
test('defer then claim all ten choices once; fed juvenile to adult at 240 hours, even after reload',()=>{
 for(const id of starterIds){const life=freshLife();ensureHome(life).ranch!.starter='later';
   assert.ok(claimStarter(life,id,then));assert.equal(claimStarter(life,id,then),false);
   const pet=life.home!.ranch!.animals[0];assert.equal(growth(pet,then),.2);assert.ok(Math.abs(growth(pet,then+DAY*5)-.85)<1e-10);
   assert.equal(growth(pet,then+DAY*10),1.5);assert.equal(petAsset(pet,then+DAY*10),id==='ranch-chick'?'ranch-hen':id==='ranch-duckling'?'ranch-pekin-duck':id);
 }
});
test('individual meals settle offline; informed, foreground grace survives reload; rescue or memorial is final',()=>{
 const life=freshLife();initializeWallet(life);changeShells(life,30,'grant');claimStarter(life,starterIds[1],then);
 const pet=life.home!.ranch!.animals[0];
 assert.ok(buyRation(life,pet.id,then));assert.equal(buyRation(life,pet.id,then),false);assert.equal(life.coins,27);
 settleMeals(life,then+3*DAY);assert.equal(pet.care!.reserve,0);assert.equal(mealState(pet,then+3*DAY),'饱足');
 assert.equal(mealState(pet,then+4*DAY),'饥饿');assert.deepEqual(advanceRescue(life,then+10*DAY,RESCUE_MS*10),[pet.id]);
 pet.care!.notified=true;advanceRescue(life,then+10*DAY,RESCUE_MS/2);
 const saved=structuredClone(life);advanceRescue(saved,then+20*DAY,0);assert.equal(saved.home!.ranch!.animals[0].care!.rescueMs,RESCUE_MS/2);
 assert.ok(buyRation(saved,pet.id,then+20*DAY));assert.equal(saved.home!.ranch!.animals[0].care!.rescueMs,0);
 advanceRescue(life,then+10*DAY,RESCUE_MS/2);assert.equal(life.home!.ranch!.animals.length,0);
 assert.equal(life.home!.ranch!.memorials?.[0].name,pet.name);assert.equal(claimStarter(life,starterIds[1],then),false);
});
test('legacy pets retain IDs, get fresh meals and adult size, with protected capacity',()=>{
 const life=freshLife();life.coins=34;
 const ranch=ensureHome(life).ranch!;
 for(let i=0;i<7;i++)ranch.animals.push({id:'old'+i,speciesId:'ranch-hare',name:'兔'+i,adoptedAt:0,affection:80,mood:60,following:true});
 initializeCare(life,then);assert.equal(capacityProgress(life).total,7);assert.equal(life.earnedShells,34);
 assert.equal(ranch.animals.filter(a=>a.following).length,1);assert.equal(growth(ranch.animals[3],then),1.5);assert.equal(mealState(ranch.animals[0],then),'饱足');
});
test('switch companions preserves original station; placement checks door, other furnishings, funds and reload',()=>{
 const life=freshLife();claimStarter(life,starterIds[0],then);changeShells(life,110,'earn');
 const second=adoptRanchAnimal(life,starterIds[1]);assert.ok(second.ok);const pet=life.home!.ranch!.animals[0];pet.station=[-85,198];
 toggleAnimalFollow(life,second.animal!.id);assert.equal(pet.following,false);assert.deepEqual(pet.station,[-85,198]);
 const balance=life.coins;assert.equal(placeFurniture(life,'chair',0,3,0),false);assert.equal(life.coins,balance);
 cottageData(life);assert.equal(placeFurniture(life,'chair',-3.8,-2.65,0),false);
 assert.ok(placeFurniture(life,'chair',5,-4.5,1));assert.equal(structuredClone(life).cottage?.furniture.at(-1)?.turn,1);
});
test('two walkable plot sites per preserve survive a legacy purchase in its original slot',()=>{
 const old=[{id:'tile_-2_3',gx:-2,gz:3,theme:'farmland' as const,unlockedAt:1}];
 const zones=preserveLayout(old);assert.equal(zones.length,5);assert.ok(zones.every(z=>z.slot.gz>=4));
 assert.ok(computeDynamicFrontier(old,[-80,220],100).every(s=>!zones.some(z=>z.slot.gx===s.gx&&z.slot.gz===s.gz)));
 for(const r of preserveRects([]).filter(r=>r.biome==='trail')){
  const x=(r.minX+r.maxX)/2;assert.equal(preserveHeight(r,x,142),inland(x,142));assert.equal(preserveHeight(r,x,182),.65);
 }
});

