import test from 'node:test';
import assert from 'node:assert/strict';
import {WinterReception,winterRelayMaps} from '../src/templates/winter-skirmish';
import type {Vec} from '../src/slime/types';
for(const day of Object.keys(winterRelayMaps))test(day+' 分身实际落环、阶段恢复与 40 种子双路线',()=>{
 for(let seed=0;seed<40;seed++)for(const alternate of [false,true]){
   const c=new WinterReception(day,String(seed)),shots:{phase:string;center:Vec}[]=[];
   function land(i:number,pos:Vec){
     assert.ok(c.cast(i,pos),day+' '+i+' '+c.hint);assert.equal(c.update(.04,pos,shots),-1);
     shots.push({phase:'active',center:c.pads[i]});assert.equal(c.update(.04,pos,shots),i);
   }
   land(0,[0,0,6]);c.retry();assert.ok(c.done.has(0));
   const first=day==='1209'&&alternate?2:1,other=3-first,p:Vec=[alternate&&day!=='1211'?1.8:-1.8,0,.1];
   const wait=(fn:()=>boolean)=>{for(let i=0;i<550&&!fn();i++)c.update(.035,p,shots);assert.ok(fn());};
   const window=(i:number)=>day!=='1209'||(i===1?c.sweep<.52:c.sweep>.48);
   wait(()=>window(first));land(first,p);
   if(day==='1207'||day==='1210'){assert.equal(c.cast(other,p),false);wait(()=>c.open);c.recall();shots.length=0;c.update(.04,p,shots);assert.ok(c.aligned);}
   if(day==='1208'){assert.equal(c.cast(other,p),false);wait(()=>c.open);}
   if(day==='1211'){assert.equal(c.cast(other,p),false);c.update(.12,[2,0,-1],shots);assert.equal(c.crossing,1);}
   wait(()=>window(other));land(other,p);land(3,[0,0,-3.6]);assert.equal(c.done.size,4);
 }
});
