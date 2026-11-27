import test from 'node:test';
import assert from 'node:assert/strict';
import {JanuaryDefense} from '../src/templates/january-defense';
import {defenseControls} from '../src/templates/season-defense';

for(const day of Object.keys(defenseControls))test(day+' 迁塔、轮次恢复与专属机关覆盖四十个种子',()=>{
 for(let seed=0;seed<40;seed++){
   const game=new JanuaryDefense(day,'season-'+seed),control=game.control!;
   game.start();while(game.phase==='wave')game.tick(.05);
   assert.equal(game.phase,'lost');assert.ok(game.retryCorner());
   for(let w=0;w<6;w++){
     for(let i=0;i<6;i++)game.deploy(i,'remove');
     const pad=2*Math.floor(w/2);game.deploy(pad,'water');game.deploy(pad+1,'wind');
     assert.ok(game.start());let tick=0;
     while(game.phase as string==='wave'&&tick++<1600){game.tick(.04);if(tick%111===0)game.operate();}
     assert.notEqual(game.phase,'lost',day+'/'+seed+'/'+w);
   }
   assert.equal(game.phase,'finale');assert.ok(control.count>0);
   assert.ok(game.finish());
 }
});
