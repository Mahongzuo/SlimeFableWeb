import test from 'node:test';
import assert from 'node:assert/strict';
import {YearendVoyage,yearendVoyages,type YearendDay} from '../src/templates/yearend-voyage';
import {rpgConfigFor} from '../src/templates/january-rpg';
import type {Vec} from '../src/slime/types';
for(const day of Object.keys(yearendVoyages) as YearendDay[])test(day+' 两条观展路线、局部回退、四十种子',()=>{
 for(let seed=0;seed<40;seed++)for(const route of [0,1]){
   const g=new YearendVoyage(day,String(seed),rpgConfigFor(day)),body={guard:!!route,airborne:!route,dashing:false};
   g.interact(g.layout.warm);g.interact(g.layout.branches[route]);
   for(let i=0;i<3;i++){
     if(i===1){for(let j=0;j<3;j++)g.strike([0,0,8],body);assert.equal(g.phase,'lost');g.retry();assert.equal(g.round,1);}
     g.strike(g.source,body);assert.ok(g.engaged);
     if(day!=='1219'){assert.equal(g.strike(g.safeSpot,body),false);g.advance(.04,g.middle,!!route,false);}
     if(day==='1218'||day==='1220')g.strike(g.middle,body);
     if(day==='1221'){const a=g.middle,e=g.safeSpot;for(let j=0;j<=60;j++)g.advance(.05,a.map((v,k)=>v+(e[k]-v)*j/60) as Vec,!!route,false);}
     if(day==='1219')for(let j=0;j<200&&(route?g.fill<.91:Math.abs(g.wave-.5)>.10);j++)g.advance(.04,g.safeSpot,!!route,false);
     assert.equal(g.strike(g.safeSpot,body),true,g.hint);
   }
   assert.equal(g.phase,'finale');g.interact(g.layout.end);assert.equal(g.phase,'curtain');
 }
});
