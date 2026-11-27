import assert from 'node:assert/strict';
import test from 'node:test';
import {winterChapters,WinterRun,type Point} from '../src/templates/winter-chapters';
for(const id of Object.keys(winterChapters))test(id+' 两条路线与局部重试跨四十种相位均可通关',()=>{
  for(let seed=0;seed<40;seed++){
    const s=new WinterRun(id,seed,8),a=s.spec.sites,dt=1/(32+seed),side=seed%2;
    const tick=(p:Point,f=true,up=false)=>s.tick(dt,...p,Number(f),up,true);
    const act=(p=s.goal,up=false)=>s.act(...p,up);
    const until=(p:Point,cond:()=>boolean,f=true)=>{for(let n=0;n<2300&&!cond();n++)tick(p,f);assert.ok(cond());};
    act([-4,2]);assert.equal(s.step,0);assert.ok(s.errors>0);
    for(const p of s.collectibles)tick(p,true,true);
    if(s.spec.pin)tick(s.spec.pin);
    switch(s.story){
      case 'lecture':for(const i of [side,1-side]){act(a[i]);tick(s.goal);act();}break;
      case 'jovian':for(let i=0;i<2;i++){tick(a[i]);until(a[i],()=>s.window);act();}break;
      case 'relay':for(const p of a){tick(p);act();}break;
      case 'recovery':for(let i=0;i<4;i++){const p=a[(side+i)%2];tick(p);act(p);}break;
      case 'street':for(const i of [side,1-side])until(a[i],()=>!!(s.mask&(1<<i)));break;
      case 'mouse':act();act();tick(a[2+side]);act(a[2+side]);break;
      case 'sorghum':tick(a[side]);act(a[side]);act(s.goal,true);break;
      case 'medal':for(const p of a){until(p,()=>Math.abs(s.medalX-s.target)<.13,false);until(p,()=>s.plateStill);tick(p);act(p);}break;
      case 'harbor':for(const i of [side,1-side]){tick(a[i]);until(a[i],()=>s.highWater);act(a[i]);}break;
      case 'atlas':for(const i of [side,1-side]){act(a[i]);tick(a[2+i]);act(a[2+i]);}break;
    }
    assert.ok(s.ready,s.story+' '+s.step);act();while(s.end<1.8)tick(s.spec.finish);assert.equal(s.marks.size,8);
  }
});
