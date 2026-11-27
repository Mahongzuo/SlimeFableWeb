import assert from 'node:assert/strict';
import test from 'node:test';
import {ArenaEncounter,rpgConfigFor} from '../src/templates/january-rpg';

function start(seed:number,branch:number){
  const battle=new ArenaEncounter('ice','rink-'+seed,rpgConfigFor('0101'));
  battle.interact(battle.layout.warm);battle.interact(battle.layout.branches[branch]);
  return battle;
}
test('门将先跟随带球一侧，移刃后不再改向，射失在本轮重开',()=>{
  for(let seed=0;seed<40;seed++)for(const branch of [0,1]){
    const battle=start(seed,branch);
    for(let round=0;round<3;round++){
      const bait=round%2?-1:1;
      for(let i=0;i<15;i++)battle.advance(.08,[bait*2,0,battle.z],false,false);
      assert.equal(battle.keeperMotion,'edge');assert.equal(battle.blocked,bait);
      while(battle.cue!=='open')battle.advance(.05,battle.safeSpot,false,false);
      assert.equal(battle.blocked,bait);
      assert.ok(battle.strike(battle.safeSpot,{guard:false,airborne:false,dashing:false}));
      if(!round){battle.missedShot();assert.equal(battle.round,1);assert.equal(battle.errors,1);}
    }
    assert.equal(battle.phase,'finale');
  }
});
test('格挡在扑救时接住冰球，延长这一次的空门时间',()=>{
  const a=start(0,1),b=start(0,1);
  for(let i=0;i<32;i++){
    a.advance(.1,a.safeSpot,true,false);b.advance(.1,b.safeSpot,false,false);
  }
  assert.equal(a.cue,'open');assert.ok(a.clock<b.clock);
});
