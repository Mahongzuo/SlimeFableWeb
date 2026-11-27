import assert from 'node:assert/strict';
import test from 'node:test';
import {Expedition,expeditionDays} from '../src/templates/season-rpg';
import {rpgConfigFor} from '../src/templates/january-rpg';
const body={guard:true,airborne:true,dashing:true};
for(const day of expeditionDays)test(day+' · 两种能力通过三段，失手保留本段工作',()=>{
  for(let seed=0;seed<40;seed++)for(const branch of [0,1]){
    const g=new Expedition(day,'watch-'+seed,rpgConfigFor(day));
    g.interact(g.layout.warm);g.interact(g.layout.branches[branch]);
    for(let leg=0;leg<3;leg++){
      if(day==='1127'||day==='1201'){
        for(let i=0;i<50;i++)g.advance(.04,g.sampleSpot,true,false);
        assert.equal(g.strike(g.sampleSpot,body),false);
        assert.ok(g.sampled||g.braced);
      }else if(day==='1130'){
        g.strike([-g.shoreX,0,g.z+1.65],body);assert.equal(g.depth,2);
        g.strike([g.shoreX,0,g.z+1.65],body);assert.ok(g.depth>=4);
      }
      if(leg===1){
        for(let i=0;i<3;i++)g.strike([6,0,9],body);
        assert.equal(g.phase,'lost');g.retry();assert.equal(g.round,leg);
      }
      for(let i=0;i<150;i++){g.advance(.04,g.safeSpot,true,false);if(g.fill>.9&&day!=='1128')break;if(day==='1128'&&g.tide<.6)break;}
      assert.ok(g.strike(g.safeSpot,body),g.message);
      assert.equal(g.round,leg+1);
    }
    assert.equal(g.phase,'finale');g.interact(g.finaleSpot);assert.equal(g.phase,'curtain');
  }
});
