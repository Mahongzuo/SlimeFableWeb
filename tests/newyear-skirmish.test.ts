import test from 'node:test';
import assert from 'node:assert/strict';
import {NewyearReception,newyearRelayMaps} from '../src/templates/newyear-skirmish';
import type {Vec} from '../src/slime/types';
for(const day of Object.keys(newyearRelayMaps))test(day+' 分身实投、双侧路径与四十种子',()=>{
 for(let seed=0;seed<40;seed++)for(const first of [1,2]){
   const g=new NewyearReception(day,String(seed)),shots:{phase:string;center:Vec}[]=[];
   const a:Vec=[first===1?-2.14:2.14,0,.31],b:Vec=[-a[0],0,.31],second=3-first;
   const land=(i:number,p:Vec)=>{assert.ok(g.cast(i,p),g.hint);assert.equal(g.update(.04,p,shots),-1);
     shots.push({phase:'active',center:g.pads[i]});assert.equal(g.update(.04,p,shots),i);};
   const wait=(q:()=>boolean,p:Vec)=>{for(let j=0;j<350&&!q();j++)g.update(.05,p,shots,true);assert.ok(q(),g.instruction);};
   land(0,[0,0,6]);g.retry();assert.ok(g.done.has(0));
   land(first,a);
   {assert.equal(g.cast(second,b),false);g.retry();shots.length=0;assert.ok(!g.done.has(first));land(first,a);}
   for(let i=0;i<g.trail;i++){
     if(g.leg?.flat){g.update(.05,g.mark,shots,false);assert.equal(g.steps,i);}
     wait(()=>g.steps>i,g.mark);
     if(g.route&&i===0&&g.trail>1){
       shots.length=0;g.update(.05,g.mark,shots,true);
       assert.equal(g.steps,1);assert.ok(!g.held);land(first,a);
     }
   }
   if(day==='0104'&&!g.trail)wait(()=>g.ready,g.mark);
   if(g.needsToken){
     wait(()=>g.canCollect,day==='0105'||g.route?g.mark:a);g.recall();shots.length=0;g.update(.05,a,shots);assert.ok(g.token);
     if(day==='0103'||g.route?.charge)wait(()=>g.ready,g.mark);
   }
   if(g.route?.charge){g.update(.15,b,shots,true);assert.equal(g.fill,1);}
   land(second,b);land(3,[0,0,-3.55]);assert.equal(g.done.size,4);
 }
});
