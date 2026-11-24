import test from 'node:test';
import assert from 'node:assert/strict';
import {ArenaEncounter,rpgConfigFor,rpgDays,type Arena} from '../src/templates/january-rpg';
import {alongStroke,fitSpan} from '../src/templates/january-layout';
import {modeById} from '../content/daily-modes';
import {gatesFor,defaultEntry} from '../src/game/mode-gates';
import {days} from '../content/registry';

test('全年 366 天各有四个独立故事入口且保留全部原章节',()=>{
  assert.equal(rpgDays.length,366);
  for(const day of rpgDays){
    const gates=gatesFor(days[day]);
    const ids=gates.slice(2).map(defaultEntry);
    assert.deepEqual(ids,['defense','match','skirmish','rpg'].map(kind=>day==='1021'&&kind==='rpg'?'1021-rpg-cn-jinchuan-2025':day+'-'+kind),day);
    assert.equal(new Set(ids.map(id=>modeById(id!)!.storyId)).size,4,day);
  }
  assert.equal(Object.values(days).filter(d=>d.day.startsWith('01')).flatMap(d=>d.chapters.filter(c=>c.status==='web')).length,62);
  assert.equal(Object.values(days).filter(d=>d.day.startsWith('02')).flatMap(d=>d.chapters.filter(c=>c.status==='web')).length,58);
  assert.equal(Object.values(days).filter(d=>d.day.startsWith('03')).flatMap(d=>d.chapters.filter(c=>c.status==='web')).length,62);
  assert.equal(Object.values(days).filter(d=>d.day.startsWith('04')).flatMap(d=>d.chapters.filter(c=>c.status==='web')).length,60);
  assert.equal(Object.values(days).filter(d=>d.day.startsWith('05')).flatMap(d=>d.chapters.filter(c=>c.status==='web')).length,62);
  assert.equal(Object.values(days).filter(d=>d.day.startsWith('06')).flatMap(d=>d.chapters.filter(c=>c.status==='web')).length,60);
  assert.equal(Object.values(days).filter(d=>d.day.startsWith('07')).flatMap(d=>d.chapters.filter(c=>c.status==='web')).length,62);
  assert.equal(Object.values(days).filter(d=>d.day.startsWith('09')).flatMap(d=>d.chapters.filter(c=>c.status==='web')).length,60);
  assert.equal(Object.values(days).filter(d=>d.day.startsWith('11')).flatMap(d=>d.chapters.filter(c=>c.status==='web')).length,34);
  assert.equal(Object.values(days).filter(d=>d.day.startsWith('12')).flatMap(d=>d.chapters.filter(c=>c.status==='web')).length,31);
});
test('月度 RPG 两条路线、40 个种子都能通过，各场的封锁时机和重试进度有效',()=>{
  for(const day of rpgDays){
    const cfg=rpgConfigFor(day);
    for(let i=0;i<40;i++)for(const branch of [0,1]){
      const b=new ArenaEncounter(cfg.arena,'practice-'+i,cfg);
      assert.equal(b.interact(b.layout.end),false);
      assert.ok(b.interact(b.layout.warm));assert.ok(b.interact(b.layout.branches[branch]));
      for(let n=0;n<3;n++){
        b.advance(b.duration*.5,[b.blocked,0,b.z],false,false);
        if(b.phase!=='lost')b.advance(b.duration*.5,[0,0,20],false,false);
      }
      assert.equal(b.phase,'lost');b.retry();assert.equal(b.health,3);
      while(b.phase==='duel'){
        const body={guard:true,airborne:true,dashing:true};
        assert.equal(b.strike(b.safeSpot,body),false);
        b.advance(b.duration*.77,b.safeSpot,false,false);
        assert.equal(b.strike([b.blocked*3,0,b.z],body),false);
        assert.ok(b.strike(b.safeSpot,body));
      }
      assert.equal(b.phase,'finale');assert.ok(b.interact(b.layout.end));assert.equal(b.phase,'curtain');
    }
  }
  for(const arena of ['ice','stage','field'] as Arena[]){
    const b=new ArenaEncounter(arena,'compat-seed');
    assert.ok(b.rules.routes.length===2);
  }
});
test('折线跨拐角按距离取样，桥两端按实际标高贴合',()=>{
  const road={points:[[0,0],[0,2],[3,2]] as [number,number][],width:1};
  assert.deepEqual(alongStroke(road,3),[1,2]);assert.deepEqual(alongStroke(road,10),[3,2]);
  const bridge=fitSpan([0,0],[0,4],(_x,z)=>z/4);
  assert.equal(bridge.base,.5);assert.equal(bridge.slope,.25);
});
