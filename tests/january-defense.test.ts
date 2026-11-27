import test from 'node:test';
import assert from 'node:assert/strict';
import {JanuaryDefense,defenseMaps,measure,sample} from '../src/templates/january-defense';

function wave(game:JanuaryDefense) {
  assert.equal(game.start(),true);
  for(let t=0;t<5000&&game.phase==='wave';t++)game.tick(1/60);
  assert.notEqual(game.phase,'wave','波次应在有限时间内结算');
}
function arrange(game:JanuaryDefense,sector:number) {
  for(let i=0;i<6;i++)game.deploy(i,'remove');
  assert.ok(game.deploy(sector*2,'water'));
  assert.ok(game.deploy(sector*2+1,'wind'));
}
for(const day of Object.keys(defenseMaps)){
  test(day+' · 四十个种子可通过迁塔零损收尾',()=>{
    for(let seed=0;seed<40;seed++){
      const game=new JanuaryDefense(day,day+'-'+seed);
      assert.equal(game.finish(),false);
      for(let w=0;w<6;w++){
        arrange(game,Math.floor(w/2));
        if (game.parade && w>0 && w%2===0) game.deploy(w-1,'water');
        wave(game);
        assert.notEqual(game.phase,'lost','seed '+seed+' wave '+w);
      }
      assert.equal(game.phase,'finale');assert.equal(game.plates.length,6);
      assert.equal(game.served,57);assert.ok(game.plates.every(Boolean));
      if(game.parade){assert.equal(game.finish(),false);assert.ok(game.castWheel());game.secureWheel(false);assert.equal(game.finish(),false);game.secureWheel(true);}
      assert.ok(game.finish());assert.equal(game.finish(),false);assert.equal(game.start(),false);
    }
  });
  test(day+' · 无人布防会失败，已失败的波次不能触发终场',()=>{
    const game=new JanuaryDefense(day,'no-build');
    wave(game);assert.equal(game.phase,'lost');assert.ok(game.errors>=5);
    assert.equal(game.start(),false);assert.equal(game.finish(),false);
  });
}
test('部署上限、迁塔、支援冷却及区间采样',()=>{
  const g=new JanuaryDefense('0101','s');
  for(let i=0;i<3;i++)assert.ok(g.deploy(i,'water'));
  assert.equal(g.deploy(3,'water'),false);assert.ok(g.deploy(0,'remove'));assert.ok(g.deploy(3,'wind'));
  assert.equal(g.assist(),false);g.start();g.tick(1/60);
  assert.ok(g.assist());assert.equal(g.assist(),false);
  const arc=measure([[0,0],[3,0],[3,4]]);
  assert.deepEqual(sample(arc,6,[0,0]),[3,3]);assert.deepEqual(sample(arc,12,[0,0]),[3,4]);
});
test('春运末班有反向接驳，观测曝光随实际漏入云团变化',()=>{
  const station=new JanuaryDefense('0114','station');station.wave=4;
  assert.deepEqual([0,1,2,3].map(i=>station.routeFor(i)),[1,2,2,1]);
  const eclipse=new JanuaryDefense('0131','partial');
  eclipse.start();
  while(eclipse.errors<1)eclipse.tick(1/60);
  arrange(eclipse,0);
  while(eclipse.phase==='wave')eclipse.tick(1/60);
  assert.equal(eclipse.phase,'interval');assert.equal(eclipse.plates[0],false);
});
