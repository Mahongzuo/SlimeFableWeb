import test from 'node:test';
import assert from 'node:assert/strict';
import {relayMaps,RelayCourse} from '../src/templates/season-skirmish';
import type {Vec} from '../src/slime/types';

for(const day of Object.keys(relayMaps))test(day+' physical relay, local recovery and alternate phases over 40 seeds',()=>{
 for(let seed=0;seed<40;seed++){
  const c=new RelayCourse(day,String(seed));const active=new Set<number>();
  const west:Vec=[-2,0,-.2],east:Vec=[2,0,-.2],end:Vec=[0,0,-3];
  const tick=(p:Vec,seconds=.04)=>c.update(seconds,p,[...active].map(i=>({phase:'active',center:c.pads[i]})));
  function shot(i:number,p:Vec){assert.ok(c.cast(i,p),c.hint);assert.equal(tick(p),-1);active.add(i);assert.equal(tick(p),i);}
  function recall(){c.recall();active.clear();tick(west);}
  function waitFor(rule:()=>boolean){for(let n=0;n<200&&!rule();n++)tick(west);assert.ok(rule());}
  assert.ok(!c.cast(3,end));shot(0,[0,0,6]);c.retry();assert.ok(c.done.has(0));
  if(c.spec.kind==='arcs'){
   assert.ok(!c.cast(1,west));if(seed%2){shot(2,west);shot(1,east);}else{shot(1,east);shot(2,west);}
  }else if(c.spec.kind==='shadow'){
   waitFor(()=>c.sweep>.75);assert.ok(!c.cast(1,west));waitFor(()=>c.sweep<.26);shot(1,west);
   assert.ok(!c.cast(2,east));waitFor(()=>c.sweep>.72);shot(2,east);
  }else{
   shot(1,west);
   if(c.spec.kind==='brake'){recall();assert.ok(!c.done.has(1));shot(1,west);waitFor(()=>c.brake>.70);recall();assert.ok(c.braked);}
   if(c.spec.kind==='relay'){recall();assert.ok(!c.done.has(1));shot(1,west);assert.ok(!c.cast(2,west));}
   if(c.spec.kind==='ticket'){assert.ok(!c.cast(2,east));recall();assert.ok(c.carrying);assert.ok(!c.cast(2,west));}
   shot(2,east);
  }
  assert.ok(!c.cast(3,[0,0,1]));shot(3,end);
  assert.deepEqual([...c.done].sort(),[0,1,2,3]);assert.ok(!c.cast(3,end));
 }
});
