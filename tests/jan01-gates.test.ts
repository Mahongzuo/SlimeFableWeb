import test from 'node:test';
import assert from 'node:assert/strict';
import {days} from '../content/registry';
import {jan01Chapters} from '../content/jan01-chapters';
import {modeById,progressId} from '../content/daily-modes';
import {levels} from '../content/levels/registry';
import {gatesFor,gateContains,journeyFor} from '../src/game/mode-gates';
import {Save} from '../src/game/save';

test('元旦六个手工场景沿用入口、首胜与原有的收藏',()=>{
  const ids=['0101-1864','0101-1823','0101-defense','0101-match','0101-skirmish','0101-rpg'];
  const gates=gatesFor(days['0101']);
  const souvenirs=['0101-shot','0101-trial','0101-match'];
  let stored=JSON.stringify({v:1,selectedDay:'0101',completed:[ids[0]],souvenirs});
  const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>stored,setItem:(_:string,v:string)=>{stored=v;}}});
  try{
    const save=new Save(), start=save.data.life.coins;
    for(const [i,id] of ids.entries()){
      assert.ok(gateContains(gates[i],id));assert.equal(journeyFor(id)?.path,'level.html?id='+id);
      if(i<2)assert.equal(levels[id],jan01Chapters[i]);
      else assert.ok(modeById(id)?.saveId.startsWith(id+'-'));
      save.add('completed',progressId(id));save.add('souvenirs',progressId(id));
    }
    for(const id of ids)save.add('completed',progressId(id));
    const reread=new Save();
    assert.equal(reread.data.life.coins,start+48);
    assert.deepEqual(reread.daily().gates,[1,2,3,4,5,6]);
    for(const key of souvenirs)assert.ok(reread.data.souvenirs.includes(key));
    for(const id of ['0101-shot','0101-trial'])assert.ok(gateContains(gates[1],id));
  } finally {
    if(original)Object.defineProperty(globalThis,'localStorage',original);else Reflect.deleteProperty(globalThis,'localStorage');
  }
});
