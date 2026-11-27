import assert from 'node:assert/strict';
import test from 'node:test';
import {yearendChapters,YearendRun,type Point} from '../src/templates/yearend-chapters';
for(const id of Object.keys(yearendChapters))test(id+' 两种路线、局部纠错及40种起始相位',()=>{
 for(let seed=0;seed<40;seed++){
  const s=new YearendRun(id,seed,8),a=s.spec.sites,dt=1/(38+seed),side=seed%2;
  const tick=(p:Point,flat=true,air=false)=>s.tick(dt,...p,Number(flat),air,true);
  const act=(p=s.goal,air=false)=>s.act(...p,air);
  const until=(p:Point,cond:()=>boolean,flat=true)=>{for(let j=0;j<2200&&!cond();j++)tick(p,flat);assert.ok(cond(),id+' wait '+s.step);};
  act([-4,2]);assert.equal(s.step,0);assert.equal(s.errors,1);for(const p of s.collectibles)tick(p,true,true);
  if(s.spec.pin)tick(s.spec.pin);
  switch(s.story){
   case 'boat':act(a[side]);for(let n=0;n<4;n++)tick(s.goal,n<2);break;
   case 'flyer':for(const i of [side,1-side]){tick(a[i],i===0,i===1);until(a[i],()=>s.wind,i===0);act(a[i],i===1);}break;
   case 'locks':act(a[side]);for(let n=0;n<2;n++){const up=s.water<s.targetWater;until(s.goal,()=>s.onLevel,up);act();}break;
   case 'broadcast':for(const i of [side,1-side]){tick(a[i]);until(a[i],()=>s.inGroove(i));act(a[i]);}until(s.goal,()=>s.overhead);act();break;
   case 'balance':until(s.goal,()=>s.zero);act();for(const i of [side,1-side]){act(a[i]);act();}break;
   case 'clock':case 'compass':case 'lotus':
    for(const i of [side,1-side]){const p=s.story==='compass'?s.arcSite(i):a[i];tick(p,i===0,i===1);until(p,()=>s.signal(i),i===0);act(p,i===1);
     if(s.story==='lotus'){tick(s.goal);tick(s.goal);}}
    if(s.story==='clock'){until(s.goal,()=>s.signal(2));act();}
    if(s.story==='compass'){tick(s.goal);act();}break;
   case 'bulbs':
    for(const pair of [[side,2+side],[1-side,3-side]]){tick(a[4]);act(a[4]);for(const i of pair)act(a[i]);}break;
   case 'earthrise':act(a[side]);tick(s.goal);until(s.goal,()=>Math.abs(s.horizon)<.34);act();until(s.goal,()=>s.framed,false);act(s.goal,true);break;
  }
  assert.ok(s.ready,id+' incomplete step '+s.step);assert.equal(s.chosen,side);act();while(s.end<1.8)tick(s.spec.finish);
  assert.equal(s.marks.size,8);
 }
});

test('海架卡槽在弹跳时保留已瞄准的光弧',()=>{
 const s=new YearendRun('1221-2000',21,8),p=s.arcSite(1);
 s.tick(.04,...p,0,false,false);
 for(let i=0;i<8;i++)s.tick(.04,p[0]+.37,p[1],0,true,false);
 s.act(p[0]+.37,p[1],true);assert.equal(s.mask,2);
});
