import assert from 'node:assert/strict';
import test from 'node:test';
import {MonthendRun,monthendChapters,type Point} from '../src/templates/monthend-chapters';
for(const id of Object.keys(monthendChapters))test(id+' 两种路线、原处补做与四十种起始相位',()=>{
 for(let seed=0;seed<40;seed++){
  const s=new MonthendRun(id,seed,8),a=s.spec.sites,side=seed%2,dt=1/(37+seed);
  const tick=(p:Point=s.goal,flat=true,up=false)=>s.tick(dt,...p,Number(flat),up,true);
  const act=(p:Point=s.goal,up=false)=>s.act(...p,up);
  const until=(p:Point,ok:()=>boolean,flat=true)=>{for(let i=0;i<2200&&!ok();i++)tick(p,flat);assert.ok(ok(),id+' step '+s.step);};
  act([-4,2]);assert.equal(s.errors,1);assert.equal(s.step,0);for(const p of s.collectibles)tick(p,true,true);
  if(s.spec.pin)tick(s.spec.pin);
  switch(s.story){
   case 'rubbing':tick(a[side]);act(a[side]);tick();tick();break;
   case 'concert':act(a[side]);until(s.goal,()=>s.meter>.73);act();
    for(const i of [side,1-side]){tick(a[i],false);until(a[i],()=>s.signal(i),false);act(a[i]);}break;
   case 'arch':for(const i of [side,1-side,side,1-side]){tick(a[i]);act(a[i]);}break;
   case 'contacts':case 'layers':for(const i of [side,1-side]){act(a[i]);tick(s.aimPoint);act(s.aimPoint);}if(s.story==='contacts')act();break;
   case 'mirrors':for(const i of [side,1-side]){act(a[i]);until(a[i],()=>s.spotJoined,true);act(a[i]);}
    until(a[2],()=>s.focused);act();break;
   case 'galaxy':for(const i of [side,1-side]){act(a[i]);tick(s.rulerPoint(i));act(s.rulerPoint(i));}act(s.goal,true);break;
   case 'binding':case 'archive':for(const i of [side,1-side]){act(a[i]);tick();if(s.story==='archive')until(s.goal,()=>s.signal(i));act();}
    if(s.story==='binding'){tick(a[2]);tick(a[3]);}else tick(s.goal,false);act();break;
   case 'dispatch':for(const i of [side,1-side]){act(a[i]);tick();until(s.goal,()=>Math.cos(s.t*1.49)>.40);act();}break;
   case 'phonics':act(a[side]);tick();act();act(s.goal,true);break;
   case 'cabinet':case 'sketch':for(const i of [side,1-side]){tick(a[i],i===0||s.story==='cabinet',i===1);if(s.story==='cabinet')until(a[i],()=>s.hold>.68);act(a[i],i===1);act(a[2]);}tick();act();break;
   case 'aqueduct':act(a[side]);for(let i=0;i<2;i++){until(s.goal,()=>s.inBand,s.meter<s.targetMark);act();}break;
   case 'stagePhoto':case 'station':case 'studio':for(const i of [side,1-side]){const flat=s.story!=='stagePhoto'||i===0;tick(a[i],flat);until(a[i],()=>s.signal(i),flat);act(a[i],i===1);}
    if(s.story==='studio')act();break;
   case 'projector':act(a[side]);tick();act();tick(s.goal,false);act();tick();act();break;
   case 'lattice':act(a[side]);for(let i=0;i<4;i++)tick(s.goal,i<2);act();break;
   case 'countdown':act(a[side]);for(let i=0;i<3;i++){until(s.goal,()=>s.inBand,i===2);act();}break;
  }
  assert.ok(s.ready,id+' incomplete '+s.step);assert.equal(s.chosen,side);act();while(s.end<1.8)tick(s.spec.finish);assert.equal(s.marks.size,8);
 }
});
