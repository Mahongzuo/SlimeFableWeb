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
        assert.ok(returns[0]<=2,c.id);
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
test('11月12日第二扇门可选四个后续年份',()=>{
  const gates=gatesFor(days['1112']);
  assert.equal(defaultEntry(gates[0]),days['1112'].chapters[0].id);
  assert.equal(defaultEntry(gates[1]),undefined);
  assert.ok(gates[1]?.type==='story');
  assert.deepEqual(gates[1].stories.map(c=>c.id),days['1112'].chapters.slice(1).map(c=>c.id));
});
test('三个试玩日的三扇门分别呈现三件史事，拥有独立的收藏和进度',()=>{
  for(const day of ['0101','0815','1123']){
    const events=modesFor(day);
    const count=6;
    assert.equal(events.length,count);
    for(const key of ['storyId','fact','source','souvenir','saveId'] as const){
      assert.equal(new Set(events.map(m=>m[key])).size,count,day+' '+key);
    }
    assert.equal(collectedMemories(events.map(m=>m.saveId)).length,count);
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
test('四个模式固定在三至六号门，未开放日期只能明确选择试玩日',()=>{
  const openDays=[
    ...Array.from({length:31},(_,i)=>'01'+String(i+1).padStart(2,'0')),
    ...Array.from({length:29},(_,i)=>'02'+String(i+1).padStart(2,'0')),
    ...Array.from({length:31},(_,i)=>'03'+String(i+1).padStart(2,'0')),
    ...Array.from({length:30},(_,i)=>'04'+String(i+1).padStart(2,'0')),
    ...Array.from({length:31},(_,i)=>'05'+String(i+1).padStart(2,'0')),
    ...Array.from({length:30},(_,i)=>'06'+String(i+1).padStart(2,'0')),
    ...Array.from({length:31},(_,i)=>'07'+String(i+1).padStart(2,'0')),
    ...Array.from({length:31},(_,i)=>'08'+String(i+1).padStart(2,'0')),
    ...Array.from({length:30},(_,i)=>'09'+String(i+1).padStart(2,'0')),
    ...Array.from({length:31},(_,i)=>'10'+String(i+1).padStart(2,'0')),
    ...Array.from({length:30},(_,i)=>'11'+String(i+1).padStart(2,'0')),
    ...Array.from({length:31},(_,i)=>'12'+String(i+1).padStart(2,'0')),
  ];
  assert.equal(openDays.length,366);
  for(const day of Object.values(days)){
    const gates=gatesFor(day);
    for(const [i,kind] of modeKinds.entries()){
      const g=gates[i+2];assert.ok(g?.type==='mode');assert.equal(g.kind,kind);
      const m=dailyModes.find(s=>s.day===day.day&&s.kind===kind&&!s.additional);
      assert.ok(m,day.day+'-'+kind);
      assert.equal(defaultEntry(g),m.id);
      assert.equal(gateContains(g,m.id),true);
      assert.equal(journeyFor(m.id)?.path,m.playPath);
    }
  }
});


test('往期投射与试炼从第二门和史书保留原直链与唯一的回港门位',()=>{
  for(const day of ['0101','0815','1123']){
    const gates=gatesFor(days[day]),third=gates[1];assert.ok(third?.type==='story');
    assert.deepEqual(third.archive.map(m=>m.id),[day+'-shot',day+'-trial']);
    for(const m of third.archive){
      assert.equal(journeyFor(m.id)?.path,m.playPath);
      assert.deepEqual(gates.flatMap((g,i)=>gateContains(g,m.id)?[i+1]:[]),[2]);
    }
    assert.equal(defaultEntry(third),undefined);
  }
});
