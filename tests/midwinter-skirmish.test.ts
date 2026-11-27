import test from 'node:test';
import assert from 'node:assert/strict';
import {MidwinterReception,midwinterRelayMaps} from '../src/templates/midwinter-skirmish';
import type {Vec} from '../src/slime/types';
for(const day of Object.keys(midwinterRelayMaps))test(day+' 接力场两条路线、分身落环与 40 个种子',()=>{
 for(let seed=0;seed<40;seed++)for(const alternate of [false,true]){
   const g=new MidwinterReception(day,String(seed)),shots:{phase:string;center:Vec}[]=[];
   const land=(idx:number,actor:Vec)=>{
     assert.ok(g.cast(idx,actor),g.hint);assert.equal(g.update(.04,actor,shots),-1);
     shots.push({phase:'active',center:g.pads[idx]});assert.equal(g.update(.04,actor,shots),idx);
   };
   const first=alternate&&day!=='1214'?2:1,second=3-first;
   const start:Vec=[first===1?-2.4:2.4,0,.15],end:Vec=[-start[0],0,.15];
   const wait=(goal:()=>boolean,p:Vec)=>{for(let i=0;!goal()&&i<550;i++)g.update(.041,p,shots);assert.ok(goal());};
   land(0,[0,0,6]);g.retry();assert.ok(g.done.has(0));
   if(day==='1213')wait(()=>g.sweep<.44,start);
   land(first,start);
   if(day==='1212'||day==='1214'||day==='1215'){
     g.recall();shots.length=0;g.update(.04,start,shots);assert.ok(!g.done.has(first));land(first,start);
   }
   if(day==='1212'||day==='1214'){
     assert.equal(g.cast(second,end),false);wait(()=>g.readyToRecall,start);g.recall();shots.length=0;g.update(.04,start,shots);assert.ok(g.ticket);
   }
   if(day==='1216'){assert.equal(g.cast(second,end),false);g.update(.04,g.checkpoint,shots);g.update(.04,g.checkpoint,shots);assert.equal(g.socket,2);}
   if(day==='1213')wait(()=>g.sweep>.61,end);
   land(second,end);
   if(day==='1215'){assert.equal(g.cast(3,[0,0,-3.5]),false);g.update(.04,[0,0,-2.1],shots);assert.ok(g.seam);}
   land(3,[0,0,-3.5]);assert.equal(g.done.size,4);
 }
});
