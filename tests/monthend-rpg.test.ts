import test from 'node:test';
import assert from 'node:assert/strict';
import {MonthendVoyage,monthendVoyages,type MonthendDay} from '../src/templates/monthend-voyage';
import {rpgConfigFor} from '../src/templates/january-rpg';
for(const day of Object.keys(monthendVoyages) as MonthendDay[])test(day+' 展件三段、局部回退和四十种子',()=>{
 for(let seed=0;seed<40;seed++)for(const route of [0,1]){
   const g=new MonthendVoyage(day,String(seed),rpgConfigFor(day)),body={guard:!!route,airborne:!route,dashing:false};
   g.interact(g.layout.warm);g.interact(g.layout.branches[route]);
   for(let i=0;i<3;i++){
     if(i===1){for(let j=0;j<3;j++)g.strike([0,0,8],body);assert.equal(g.phase,'lost');g.retry();assert.equal(g.round,1);}
     g.strike(g.source,body);assert.ok(g.engaged);assert.equal(g.strike(g.safeSpot,body),false);
     if(g.trail){g.advance(.05,g.middle,false,false);g.advance(.05,g.middle,false,false);}
     else{
       if(g.pulses)for(let j=0;j<240&&!g.window;j++)g.advance(.04,g.middle,false,false);
       if(day==='1229'||day==='1231')for(let j=0;j<26;j++)g.advance(.05,g.middle,true,false);
       for(let j=0;j<g.turns&&g.fill<1;j++)g.strike(g.middle,body);
     }
     assert.equal(g.fill,1);assert.equal(g.strike(g.safeSpot,body),true,g.hint);
   }
   assert.equal(g.phase,'finale');g.interact(g.layout.end);assert.equal(g.phase,'curtain');
 }
});
