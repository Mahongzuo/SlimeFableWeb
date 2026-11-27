import test from 'node:test';
import assert from 'node:assert/strict';
import {MonthendReception,monthendRelayMaps} from '../src/templates/monthend-skirmish';
import type {Vec} from '../src/slime/types';
for(const day of Object.keys(monthendRelayMaps))test(day+' 分身实投、双侧路径与四十种子',()=>{
 for(let seed=0;seed<40;seed++)for(const first of [1,2]){
   const g=new MonthendReception(day,String(seed)),shots:{phase:string;center:Vec}[]=[];
   const a:Vec=[first===1?-2.14:2.14,0,.31],b:Vec=[-a[0],0,.31],second=3-first;
   const land=(i:number,p:Vec)=>{assert.ok(g.cast(i,p),g.hint);assert.equal(g.update(.04,p,shots),-1);
     shots.push({phase:'active',center:g.pads[i]});assert.equal(g.update(.04,p,shots),i);};
   const wait=(q:()=>boolean,p:Vec)=>{for(let j=0;j<350&&!q();j++)g.update(.05,p,shots);assert.ok(q());};
   land(0,[0,0,6]);g.retry();assert.ok(g.done.has(0));
   if(day==='1229')wait(()=>first===1?g.signal<.22:g.signal>.75,a);
   land(first,a);
   if(day!=='1229'){assert.equal(g.cast(second,b),false);g.retry();shots.length=0;assert.ok(!g.done.has(first));land(first,a);}
   for(let i=0;i<g.trail;i++)g.update(.05,g.mark,shots);
   if(day==='1224'||day==='1228')wait(()=>g.ready,g.mark);
   if(g.needsToken){
     wait(()=>g.canCollect,day==='1230'?g.mark:a);g.recall();shots.length=0;g.update(.05,a,shots);assert.ok(g.token);
     if(day==='1226')wait(()=>g.ready,g.mark);
   }
   if(day==='1229')wait(()=>second===1?g.signal<.22:g.signal>.75,b);
   land(second,b);land(3,[0,0,-3.55]);assert.equal(g.done.size,4);
 }
});
