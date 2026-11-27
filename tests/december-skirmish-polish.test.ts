import assert from 'node:assert/strict';
import test from 'node:test';
import {decemberRelayMaps,DecemberReception} from '../src/templates/december-skirmish';
import type {Vec} from '../src/slime/types';
for(const day of Object.keys(decemberRelayMaps))test(day+' physical clock, pose or relay route across 40 starts',()=>{
 for(let seed=0;seed<40;seed++){
  const c=new DecemberReception(day,'profile-'+seed),active=new Set<number>();
  const west:Vec=[-2,0,.5],east:Vec=[2,.01,.5],last:Vec=[0,0,-3];
  const tick=(p:Vec=west)=>c.update(.04,p,[...active].map(i=>({phase:'active',center:c.pads[i]})));
  const wait=(fn:()=>boolean)=>{for(let i=0;i<650&&!fn();i++)tick();assert.ok(fn());};
  function cast(i:number,p:Vec){assert.ok(c.cast(i,p),c.hint);assert.equal(tick(p),-1);active.add(i);assert.equal(tick(p),i);}
  function recall(){c.recall();active.clear();tick();}
  cast(0,[0,0,6]);assert.ok(!c.cast(3,last));c.retry();assert.ok(c.done.has(0));
  if(day==='1202'){cast(1,west);assert.ok(!c.cast(2,east));recall();assert.ok(!c.done.has(1));cast(1,west);wait(()=>c.crossing===1);cast(2,east);}
  if(day==='1203'){wait(()=>!c.windowAt(1));assert.ok(!c.cast(1,west));wait(()=>c.windowAt(1));cast(1,west);
   wait(()=>!c.done.has(1));recall();wait(()=>c.windowAt(1));cast(1,west);wait(()=>c.windowAt(2));cast(2,east);}
  if(day==='1204'){cast(1,west);assert.ok(!c.cast(2,east));recall();cast(2,east);}
  if(day==='1205'){const a=seed%2?2:1,b=3-a;cast(a,a===1?east:west);assert.ok(!c.cast(b,b===1?east:west));recall();
   const p:Vec=[...(b===1?east:west)];assert.ok(!c.cast(b,p));p[1]=.42;cast(b,p);}
  if(day==='1206'){const a=seed%2?2:1,b=3-a;cast(a,a===1?west:east);assert.ok(!c.cast(b,b===1?west:east));
   for(let j=0;j<3&&c.nextLamp<3;j++)tick(c.lamp);assert.equal(c.nextLamp,3);cast(b,b===1?west:east);}
  assert.ok(!c.cast(3,[0,0,1]));cast(3,last);assert.deepEqual([...c.done].sort(),[0,1,2,3]);
 }
});
