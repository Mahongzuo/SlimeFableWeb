import test from 'node:test';
import assert from 'node:assert/strict';
import {days} from '../content/registry';
import {levels} from '../content/levels/registry';
import {novemberLevels} from '../content/november';
import {course, timedWindow, aligned, logicResult} from '../src/templates/almanac';

test('all 30 November dates open registered Web chapters',()=>{
 let total=0;
 for(let n=1;n<=30;n++){const day='11'+String(n).padStart(2,'0');assert.ok(days[day].chapters.length);
  for(const chapter of days[day].chapters){assert.equal(chapter.status,'web');assert.equal(levels[chapter.id]?.template,chapter.template);total++;}}
 assert.equal(total,34);assert.equal(novemberLevels.length,28);
});
test('every November tabletop target is accessible and distinct over 40 seeds',()=>{
 for(const spec of novemberLevels)for(let n=0;n<40;n++){
  const places=course(spec.id+n);assert.deepEqual(places,course(spec.id+n));
  for(const [i,[x,z]] of places.entries()){assert.ok(Math.hypot(x/9.85,z/8.1)<1);
   if(i)assert.ok(Math.hypot(x-places[i-1][0],z-places[i-1][1])>2);}
 }
});
test('timing targets and all three logic gates have solutions',()=>{
 for(const [i,goal] of [.69,.34,.77].entries()){
  assert.ok(Array.from({length:360},(_,n)=>timedWindow(n/60,1.35+i*.26)).some(v=>aligned(v,goal,.115)));
  const outputs=[false,true].flatMap(a=>[false,true].map(b=>logicResult(i,a,b)));
  assert.ok(outputs.includes(true)&&outputs.includes(false));
 }
});
