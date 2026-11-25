import test from 'node:test';
import assert from 'node:assert/strict';
import {Save} from '../src/game/save';
import {beijingDay,completedGate,dailyLocations,GATE_SHELLS,SHARD_SHELLS} from '../src/game/home-rewards';
import {days} from '../content/registry';
import {gatesFor} from '../src/game/mode-gates';
import {createWorld} from '../src/slime/world';
import {HomeClimate} from '../src/home/climate';
import {EXPANSION_SLOTS} from '../src/world/expansion';

test('each successful gate pays the construction wallet once even for previously completed chapters',()=>{
  const save=new Save();
  for(const [i,g] of gatesFor(days['1015']).entries()){
    assert.ok(g);
    const id=g.type==='mode'?g.challenge!.saveId:g.stories[0].id;
    assert.equal(completedGate(id),i+1);
    save.data.completed.push(id);
    save.add('completed',id);save.add('completed',id);
    assert.equal(save.data.life.coins,(i+1)*GATE_SHELLS);
  }
  save.add('completed','unknown');assert.equal(save.data.life.coins,6*GATE_SHELLS);
  save.data.homeDaily!.date='previous';save.add('completed',save.data.completed[0]);
  assert.equal(save.data.life.coins,7*GATE_SHELLS);
});
test('twelve daily locations scatter across home and claimed expansions, with persistent pickup identities',()=>{
  const world=createWorld({boxes:[],surfaces:[{height:0,min:[-500,-500],max:[500,500]}]});
  const save=new Save(),day=save.daily('2026-11-25');
  const initial=dailyLocations(day,[],world);
  assert.equal(initial.length,12);assert.equal(new Set(initial.map(s=>s.area)).size,5);
  day.spots=initial;assert.deepEqual(dailyLocations(day,[],world),initial);
  assert.ok(save.collectShard(initial[0].id,day.date));assert.ok(!save.collectShard(initial[0].id,day.date));
  assert.equal(save.data.life.coins,SHARD_SHELLS);
  const tile={...EXPANSION_SLOTS[0],theme:'meadow' as const,unlockedAt:0};
  const expanded=dailyLocations(day,[tile],world);assert.ok(expanded.some(p=>p.area===tile.id));
  assert.deepEqual(expanded.slice(0,10),initial.slice(0,10));
  const next=save.daily('2026-11-26');assert.notDeepEqual(dailyLocations(next,[],world),initial);
  assert.equal(next.shards.length,0);
});
test('fixed midnight and noon affect sunlight while the Beijing reward date and season keep advancing',()=>{
  const t=Date.parse('2026-11-30T23:59:59+08:00'),climate=new HomeClimate(t);
  climate.setTime(720);climate.update(3,t);assert.equal(climate.sky.daylight,1);
  climate.setTime(0);climate.update(4,t);assert.equal(climate.sky.daylight,0);
  climate.update(6,t+2000);assert.equal(climate.sky.date,beijingDay(t+2000));assert.equal(climate.sky.season,3);
  climate.setTime(null);assert.equal(climate.minute,null);
});
