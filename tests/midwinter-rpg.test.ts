import test from 'node:test';
import assert from 'node:assert/strict';
import {MidwinterVoyage,midwinterVoyages,type MidwinterDay} from '../src/templates/midwinter-voyage';
import {rpgConfigFor} from '../src/templates/january-rpg';
import type {Vec} from '../src/slime/types';
for(const day of Object.keys(midwinterVoyages) as MidwinterDay[])test(day+' 三道工序、左右路线、局部重试及四十种子',()=>{
 for(let seed=0;seed<40;seed++)for(const route of [0,1]){
   const g=new MidwinterVoyage(day,String(seed),rpgConfigFor(day)),body={guard:!!route,airborne:!route,dashing:false};
   g.interact(g.layout.warm);g.interact(g.layout.branches[route]);
   for(let i=0;i<3;i++){
     if(i===1){for(let j=0;j<3;j++)g.strike([0,0,8],body);assert.equal(g.phase,'lost');g.retry();assert.equal(g.round,1);}
     g.strike(g.source,body);assert.ok(g.engaged);
     if(day==='1212'||day==='1213'||day==='1216')assert.equal(g.strike(g.safeSpot,body),false);
     if(day==='1212'){const a=g.source,e=g.safeSpot;for(let j=0;j<=60;j++)g.advance(.04,a.map((v,k)=>v+(e[k]-v)*j/60) as Vec,!!route,false);}
     if(day==='1213'){for(const p of [g.middle,g.source,g.middle])g.advance(.04,p,false,false);}
     if(day==='1214'){for(let j=1;j<=i;j++)g.strike(g.source,body);assert.equal(g.steps,i+1);}
     if(day==='1215'){for(let j=0;j<240&&(route?g.fill<.91:g.wave<.72);j++)g.advance(.04,g.safeSpot,!!route,false);}
     if(day==='1216')g.advance(.05,g.middle,false,false);
     assert.equal(g.strike(g.safeSpot,body),true,g.hint);assert.equal(g.round,i+1);
   }
   assert.equal(g.phase,'finale');g.interact(g.layout.end);assert.equal(g.phase,'curtain');
 }
});
