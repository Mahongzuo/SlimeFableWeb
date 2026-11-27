import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {days} from '../content/registry';
import {gatesFor} from '../src/game/mode-gates';
import {guideFor,endingHelp} from '../content/gate-help';
import {touchHelpFor} from '../content/winter-help';
import {newyearChapters} from '../src/templates/newyear-chapters';
import {monthendChapters} from '../src/templates/monthend-chapters';
import {yearendChapters} from '../src/templates/yearend-chapters';
import {instruments} from '../src/templates/season-instruments';

const ledger=readFileSync(new URL('../docs/six-gate-polish.md',import.meta.url),'utf8');
const registered=[...ledger.matchAll(/^\| \[(\d+) 月 (\d+) 日\].+?6\/6/gm)].map(([,m,d])=>m.padStart(2,'0')+d.padStart(2,'0'));
test('台账中完成的每扇门均有实际分步解法和失败补救',()=>{
 assert.ok(registered.includes('0101')&&registered.includes('1211'));
 for(const day of registered){
  const portals=gatesFor(days[day]);assert.equal(portals.length,6);
  for(const gate of portals){
    assert.ok(gate,day);
    const entries=gate.type==='story'?[...gate.stories,...gate.archive]:[gate.challenge,...gate.additional??[]];
    for(const entry of entries){
      assert.ok(entry,day);
      const guide=guideFor(entry.id);assert.ok(guide,entry.id);
      assert.ok(guide.title&&guide.steps.length>=3&&guide.steps.every(step=>step.trim().length>=4),entry.id);
      assert.ok(guide.repair.length>=12,entry.id);
      if(instruments[entry.id])assert.ok(endingHelp(entry.id).includes(instruments[entry.id].note));
    }
  }
 }
});

test('海峡风袋在场景内放绳后可直接领奖',()=>{
 const guide=guideFor('0107-defense');
 assert.match(guide?.steps.at(-1)??'',/点一次「放下着陆绳」。.*领取纪念品/);
 assert.equal(endingHelp('0107-defense'),'');
});
test('跨年六门从专属机关读取走法，并指明触屏操作',()=>{
 for(const [id,chapter] of Object.entries({...yearendChapters,...monthendChapters,...newyearChapters})){
  const guide=guideFor(id);
  assert.deepEqual(guide?.steps,[...chapter.tasks.map(task=>task[1]),chapter.finishHelp],id);
  assert.equal(guide?.repair,chapter.repair,id);
  if(newyearChapters[id])assert.equal(guide?.optional,newyearChapters[id].optional,id);
 }
 for(const day of ['0102','0103','0104','0105','0106','0107','0108','0109','0110',...Array.from({length:15},(_,i)=>String(1217+i))]){
  const ids=gatesFor(days[day]).flatMap(g=>!g?[]:g.type==='story'?g.stories.map(s=>s.id):[g.challenge?.id]);
  assert.equal(ids.length,day==='0102'?7:6);
  for(const id of ids){
   assert.ok(id);
   assert.ok((guideFor(id)?.steps.length??0)>=3,id);
   assert.ok(touchHelpFor(id).length>=15,id);
   if(instruments[id])assert.ok(endingHelp(id).includes(instruments[id].note),id);
  }
 }
});
