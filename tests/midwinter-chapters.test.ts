import assert from 'node:assert/strict';
import test from 'node:test';
import {midwinterChapters,MidwinterRun,type Point} from '../src/templates/midwinter-chapters';
for(const id of Object.keys(midwinterChapters))test(id+' · 四十种相位、双路线及原处补做',()=>{
 for(let seed=0;seed<40;seed++){
  const s=new MidwinterRun(id,seed,8),a=s.spec.sites,dt=1/(32+seed),side=seed%2;
  const tick=(p:Point,f=true,up=false)=>s.tick(dt,...p,Number(f),up,true);
  const act=(p=s.goal,up=false)=>s.act(...p,up);
  const until=(p:Point,cond:()=>boolean,f=true)=>{for(let n=0;n<2600&&!cond();n++)tick(p,f);assert.ok(cond(),s.story+' '+s.step);};
  act([-4,2]);assert.equal(s.step,0);assert.equal(s.errors,s.quiet?0:1);
  for(const p of s.collectibles)tick(p,true,true);
  if(s.spec.pin)tick(s.spec.pin);
  switch(s.story){
   case 'press':case 'bell':for(const i of [side,1-side]){act(a[i]);if(s.story==='press')until(s.roller,()=>s.proof===1);tick(s.goal);act();}break;
   case 'radio':tick(a[side],false,true);act(a[side],true);tick(a[side]);act(a[side]);for(let i=0;i<3;i++){until(a[2],()=>s.pulse&&s.beat!==s.lastBeat);act();}break;
   case 'garden':until(a[side],()=>s.step===1);act();break;
   case 'ridge':for(const i of [side,1-side]){until(a[i],()=>s.fogOpen,i===0);tick(a[i],i===0,i===1);if(!s.fogOpen)until(a[i],()=>s.fogOpen,i===0);act(a[i],i===1);}break;
   case 'sign':tick(a[side]);tick(a[1-side]);assert.equal(s.step,1);
    for(let n=0;n<=20;n++)tick([a[side][0]+(a[1-side][0]-a[side][0])*n/20,-.52]);
    act();break;
   case 'tent':case 'twins':for(const i of [side,1-side]){until(a[i],()=>s.aligned(i));tick(a[i]);if(!s.aligned(i))until(a[i],()=>s.aligned(i));act(a[i]);}break;
   case 'dynamo':act(a[side]);until(a[side],()=>s.synced,false);tick(a[side]);act(a[side]);tick(s.goal);act();break;
   case 'letter':for(const i of [side,1-side]){tick(a[i],i===0,i===1);act(a[i],i===1);act(a[2]);}tick(s.goal);act();break;
  }
  assert.ok(s.ready,id+' step '+s.step);act();while(s.end<1.8)tick(s.spec.finish);assert.equal(s.marks.size,s.quiet?0:8);
  assert.equal(s.chosen,side);
 }
});
