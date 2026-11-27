import assert from 'node:assert/strict';
import test from 'node:test';
import {DecemberRun,exhibits,type Spot} from '../src/templates/december-chapters';

for(const id of Object.keys(exhibits))test(id+' 展室的两条走法、收藏及结尾覆盖四十种相位',()=>{
  for(let seed=0;seed<40;seed++){
    const s=new DecemberRun(id,seed),dt=1/(30+seed),sites=s.spec.sites;
    const tick=(p:Spot,squash=true,up=false,pin=true)=>s.tick(dt,...p,Number(squash),up,pin);
    const act=(p=s.goal,up=false)=>s.action(...p,up),land=(p:Spot)=>{tick(p,true,true);tick(p,true,false);};
    s.action(-4,2,false);assert.equal(s.errors,1);
    for(const p of s.collectibles)land(p);
    assert.equal(s.marks.size,8);
    if(s.spec.pin)tick(s.spec.pin);
    const side=seed%2;
    switch(s.story){
      case 'mail':land(sites[side]);act();land(sites[1-side]);act();break;
      case 'archive':tick(sites[0]);tick([0,2]);assert.equal(s.step,0);tick(sites[0]);tick(sites[1]);act(sites[2+side]);act();break;
      case 'lens':act();act();tick(s.goal,false);act();assert.equal(s.step,2);tick(s.goal);act();break;
      case 'message':act();act();tick(s.goal);act();break;
      case 'lantern':tick(sites[side]);act(sites[side]);act();break;
      case 'rover':tick(sites[0]);tick(sites[1]);act(sites[2+side]);break;
      case 'bridge':act(sites[side*2]);tick(s.goal);act();act();tick(s.goal);act();break;
      case 'drum':act(sites[side]);act();land(sites[2]);for(const point of sites.slice(3))tick(point);break;
      case 'falls':tick(s.goal);act();act(s.goal,false);assert.equal(s.step,1);act(s.goal,true);break;
      case 'foil':tick(sites[0]);act();for(let j=0;j<3;j++)tick([sites[j][0],(j+seed)%2?.42:-.62]);tick(sites[2],false);act();assert.equal(s.notes.length,3);break;
    }
    assert.ok(s.ready,s.story+' '+s.step);
    if(s.story==='message')land(s.spec.finish);else act();
    while(s.end<1.86)tick(s.spec.finish);
    assert.ok(s.end>=1.86);
  }
});
