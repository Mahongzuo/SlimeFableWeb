import test from 'node:test';
import assert from 'node:assert/strict';
import {WinterVoyage,winterVoyages,type WinterDay} from '../src/templates/winter-voyage';
import {rpgConfigFor} from '../src/templates/january-rpg';
import type {Vec} from '../src/slime/types';

for(const day of Object.keys(winterVoyages) as WinterDay[])test(day+' 两条路线各走 40 种子，逐段交接并手动收尾',()=>{
 for(let seed=0;seed<40;seed++)for(const route of [0,1]){
   const b=new WinterVoyage(day,String(seed),rpgConfigFor(day)),body={guard:!!route,airborne:!route,dashing:false};
   b.interact(b.layout.warm);b.interact(b.layout.branches[route]);
   for(let i=0;i<3;i++){
     if(i===1){for(let n=0;n<3;n++)b.strike([0,0,8],body);assert.equal(b.phase,'lost');b.retry();assert.equal(b.round,1);}
     b.strike(b.source,body);assert.ok(b.engaged);
     if(day==='1210'||day==='1211'||day==='1208')assert.equal(b.strike(b.safeSpot,body),false);
     const a=b.source,target=b.safeSpot;
     for(let j=0;j<=80;j++)b.advance(.08,a.map((v,k)=>v+(target[k]-v)*j/80) as Vec,!!route,false);
     for(let j=0;j<60;j++)b.advance(.04,target,!!route,false);
     for(let j=0;b.wind>.4&&j<300;j++)b.advance(.04,target,!!route,false);
     assert.equal(b.strike(target,body),true,day+': '+b.message);assert.equal(b.round,i+1);
   }
   assert.equal(b.phase,'finale');assert.equal(b.interact(b.layout.end),true);assert.equal(b.phase,'curtain');
 }
});
