import test from 'node:test';
import assert from 'node:assert/strict';
import {atlasLevels} from '../content/atlas';
import {days} from '../content/registry';
import {levels} from '../content/levels/registry';
import {monthLength} from '../src/game/calendar';
import {atlasCourse,freshRun,hop,tick} from '../src/templates/atlas';

test('366 calendar dates open the correct Web chapter, including leap day and the original August 15',()=>{
  assert.ok(atlasLevels.length>0);assert.equal(new Set(atlasLevels.map(s=>s.id.slice(0,4))).size,atlasLevels.length);
  assert.equal(Object.keys(days).length,366);
  for(let m=1;m<=12;m++)for(let n=1;n<=monthLength(m);n++){
    const day=String(m).padStart(2,'0')+String(n).padStart(2,'0');
    const chapters=days[day].chapters.filter(c=>c.status==='web');
    assert.ok(chapters.length,day);
    for(const c of chapters){assert.equal(c.day,day);assert.equal(levels[c.id]?.template,c.template,c.id);}
  }
  assert.equal(days['0815'].chapters.length,6);assert.equal(levels['0815-1920'].template,'explore-quest');
  assert.equal(levels['0229-1792'].template,'atlas');
});
test('normal lane changes, jumps and folding collect every crystal on every historical route',()=>{
  for(const spec of atlasLevels){
    assert.match(spec.source,/^https:\/\//);const course=atlasCourse(spec);
    assert.deepEqual(course,atlasCourse(spec));const run=freshRun();
    let result;
    for(let step=0;step<3200&&result!=='finish';step++){
      const g=course.gates[run.index];
      if(g){
        const distance=g.distance-run.distance;
        run.lane=run.collected.has(run.index)?g.sign==='fork'?1:g.lane:g.jewelLane;
        run.flat=g.sign==='fold';if(g.sign==='leap'&&distance<course.speed*.44&&distance>course.speed*.38&&run.jump===0)hop(run);
      }
      result=tick(run,course,1/60,false);
    }
    assert.equal(result,'finish',spec.id);assert.equal(run.collected.size,course.gates.length,spec.id);assert.equal(run.retries,0,spec.id);
  }
});
test('missing a gate rewinds to a playable position and keeps already collected crystals',()=>{
  const c=atlasCourse(atlasLevels[0]),g=c.gates[0],r=freshRun();
  g.sign='leap';g.lane=0;r.distance=g.distance-.04;r.collected.add(0);
  assert.equal(tick(r,c,1/30,false),'retry');assert.equal(r.index,0);assert.equal(r.retries,1);
  assert.ok(r.distance<g.distance-4);assert.ok(r.collected.has(0));
});
