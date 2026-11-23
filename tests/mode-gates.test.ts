import test from 'node:test';
import assert from 'node:assert/strict';
import {collectedMemories,dailyModes,modeKinds,modesFor,progressId} from '../content/daily-modes';
import {days} from '../content/registry';
import {defaultEntry,gatesFor,gateContains,journeyFor,pilotChoices} from '../src/game/mode-gates';

test('644 个可玩章节仍可直达且拥有唯一的左侧回港门',()=>{
  let count=0;
  for(const day of Object.values(days)){
    const gates=gatesFor(day);
    assert.equal(gates.length,6);
    for(const c of day.chapters){
      const returns=gates.map((g,i)=>gateContains(g,c.id)?i+1:0).filter(Boolean);
      if(c.status==='web'){
        assert.equal(returns.length,1,c.id);
        assert.ok(returns[0]<=3,c.id);
        assert.deepEqual(journeyFor(c.id),{day:c.day,path:'level.html?id='+c.id});
        count++;
      }else{
        assert.equal(returns.length,0,c.id);
        assert.equal(journeyFor(c.id),undefined,c.id);
      }
    }
  }
  assert.equal(count,644);
});
test('11月12日第三扇门明确选择后三个年份',()=>{
  const gates=gatesFor(days['1112']);
  for(let i=0;i<2;i++)assert.equal(defaultEntry(gates[i]),days['1112'].chapters[i].id);
  assert.equal(defaultEntry(gates[2]),undefined);
  assert.ok(gates[2]?.type==='story');
  assert.deepEqual(gates[2].stories.map(c=>c.id),days['1112'].chapters.slice(2).map(c=>c.id));
});
test('三个试玩日的三扇门分别呈现三件史事，拥有独立的收藏和进度',()=>{
  for(const day of ['0101','0815','1123']){
    const events=modesFor(day);
    assert.equal(events.length,3);
    for(const key of ['storyId','fact','source','souvenir','saveId'] as const){
      assert.equal(new Set(events.map(m=>m[key])).size,3,day+' '+key);
    }
    assert.equal(collectedMemories(events.map(m=>m.saveId)).length,3);
    for(const m of events)assert.equal(progressId(m.id),m.saveId);
  }
});
test('旧试玩纪念品保存原史实，新题材独立记通关',()=>{
  const keys=['0101-match','0101-shot','0101-trial'];
  const archive=collectedMemories(keys);
  assert.equal(archive.length,1);
  assert.equal(archive[0].length,3);
  assert.ok(archive[0].every(note=>note.year===1864));
  assert.ok(!keys.includes(progressId('0101-match')));
  assert.equal(progressId('0101-trial'),'0101-trial');
  assert.deepEqual(collectedMemories([...keys,progressId('0101-match')]).map(records=>records[0].year).sort(),[1864,2002]);
  assert.equal(progressId('0101-1864'),'0101-1864');
});
test('三个模式固定在右侧，未开放日期只能明确选择试玩日',()=>{
  for(const day of Object.values(days)){
    const gates=gatesFor(day);
    for(const [i,kind] of modeKinds.entries()){
      const g=gates[i+3];assert.ok(g?.type==='mode');assert.equal(g.kind,kind);
      const m=dailyModes.find(s=>s.day===day.day&&s.kind===kind);
      assert.equal(defaultEntry(g),m?.id);
      if(m){assert.equal(gateContains(g,m.id),true);assert.equal(journeyFor(m.id)?.path,m.playPath);}
      else assert.deepEqual(pilotChoices(kind).map(p=>p.day).sort(),kind==='match'?['0101','0815','1123']:['1021']);
    }
  }
});


test('往期投射与试炼从第三门和史书保留原直链与唯一的回港门位',()=>{
  for(const day of ['0101','0815','1123']){
    const gates=gatesFor(days[day]),third=gates[2];assert.ok(third?.type==='story');
    assert.deepEqual(third.archive.map(m=>m.id),[day+'-shot',day+'-trial']);
    for(const m of third.archive){
      assert.equal(journeyFor(m.id)?.path,m.playPath);
      assert.deepEqual(gates.flatMap((g,i)=>gateContains(g,m.id)?[i+1]:[]),[3]);
    }
    assert.equal(defaultEntry(third),undefined);
  }
});
