import test from 'node:test';
import assert from 'node:assert/strict';
import {newStamp,press,peel,chooseStamp,repairStamp,stepStamp,sealStations,sealCorner} from '../src/templates/jan01-seal';

test('印匣两处落款均可揭纸，缺角可保留或补印；触发顺序与不同帧长兼容',()=>{
  for(let seed=1;seed<=40;seed++){
    const s=newStamp();chooseStamp(s,1);peel(s);assert.equal(s.phase,'trial');
    s.pinned=!!(seed&1);press(s);assert.equal(s.phase,'trial-proof');
    peel(s);assert.equal(s.phase,'choose');assert.equal(s.pinned,false);
    const station=1+(seed%2);chooseStamp(s,station);assert.equal(s.station,station);
    const before=sealStations[station],corner=sealCorner(station);assert.ok(Math.hypot(before[0]-corner[0],before[2]-corner[2])<1.1);
    s.pinned=(seed%3)===0;press(s);const firstFull=s.printed;
    if(!s.printed&&seed%2){repairStamp(s);assert.equal(s.phase,'stamp');s.pinned=true;press(s);}
    assert.equal(s.clean,firstFull);peel(s);
    for(let i=0;i<500;i++)stepStamp(s,1/(30+seed));
    assert.equal(s.phase,'done');assert.equal(s.lift,1);
  }
});
