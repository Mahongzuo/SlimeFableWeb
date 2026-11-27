import test from 'node:test';
import assert from 'node:assert/strict';
import {YearendReception,yearendRelayMaps} from '../src/templates/yearend-skirmish';
import type {Vec} from '../src/slime/types';
for(const day of Object.keys(yearendRelayMaps))test(day+' 双侧起手、真实落环与四十种子',()=>{
 for(let seed=0;seed<40;seed++)for(const first of [1,2]){
   const g=new YearendReception(day,String(seed)),shots:{phase:string;center:Vec}[]=[];
   const start:Vec=[first===1?-2.17:2.17,0,.31],other:Vec=[-start[0],0,.31],second=3-first;
   const land=(i:number,p:Vec)=>{assert.ok(g.cast(i,p),g.hint);assert.equal(g.update(.04,p,shots),-1);
     shots.push({phase:'active',center:g.pads[i]});assert.equal(g.update(.04,p,shots),i);};
   const wait=(q:()=>boolean,p:Vec)=>{for(let j=0;j<350&&!q();j++)g.update(.05,p,shots);assert.ok(q());};
   land(0,[0,0,6]);g.retry();assert.ok(g.done.has(0));
   if(day==='1219')wait(()=>first===1?g.signal<.23:g.signal>.73,start);
   land(first,start);
   if(day!=='1219'){assert.equal(g.cast(second,other),false);g.recall();shots.length=0;g.update(.05,start,shots);assert.ok(!g.done.has(first));land(first,start);}
   if(day==='1217'){g.update(.05,g.hook,shots);g.update(.05,g.hook,shots);assert.equal(g.hooks,2);}
   if(day==='1220'){wait(()=>g.ready,g.alignmentSpot);}
   if(day==='1221')g.update(.05,[0,0,-.25],shots);
   if(day==='1218'||day==='1221'){wait(()=>g.ready,day==='1218'?start:[0,0,-.25]);g.recall();shots.length=0;g.update(.05,start,shots);assert.ok(g.token);}
   if(day==='1219')wait(()=>second===1?g.signal<.24:g.signal>.76,other);
   land(second,other);land(3,[0,0,-3.4]);assert.equal(g.done.size,4);
 }
});
