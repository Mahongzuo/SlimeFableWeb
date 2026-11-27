import test from 'node:test';
import assert from 'node:assert/strict';
import {FlightSignals,behindPier} from '../src/templates/jan01-skirmish';
import {buildCourse,floorAt,targetPoint,type Lane} from '../src/templates/january-skirmish';
import type {Vec} from '../src/slime/types';

test('两条码头路线各用 40 个种子完成投射、回收、放行，失手可就地重投',()=>{
  for(let seed=0;seed<40;seed++)for(const lane of [-1,1] as Lane[]){
    const c=buildCourse('0101',String(seed)), f=new FlightSignals();
    for(let i=0;i<4;i++){
      const t=targetPoint(c,i,1.4,false), landing:Vec=[t[0],floorAt(c,t[0],t[2])!,t[2]];
      assert.ok(f.cast(i,landing,landing,0));
      assert.equal(f.observe([],4),-1);assert.ok(f.open(i));
      assert.ok(f.cast(i,landing,landing,5));
      const shot={center:landing,phase:'active'};
      assert.equal(f.observe([{...shot,phase:'flying'}],5.3),-1);
      assert.equal(f.observe([shot],5.7),i);
      assert.ok(f.locked.has(i));
      if(i===0){assert.equal(f.open(1),false);f.recall();f.lastLane=lane;}
      assert.ok(f.verified.has(i));
    }
    assert.equal(f.verified.size,4);
    for(let x=-2.8;x<=2.81;x+=.08)assert.notEqual(floorAt(c,x,-2.66),null);
  }
  assert.ok(behindPier([-2,0,-.6],[2.8,1,-.6]));
  assert.equal(behindPier([2.6,1.05,-.6],[-2.8,0,-.6]),false);
});
