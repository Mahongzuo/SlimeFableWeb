import assert from 'node:assert/strict';
import test from 'node:test';
import {SecondRun,iceAnchors,paperCreases,secondIds,scopeMarks,passes,stations} from '../src/templates/season-second';

for(const id of secondIds)test(id+' 次章保留中段检查点，四十个练习相位均可完成',()=>{
  for(let seed=0;seed<40;seed++){
    const r=new SecondRun(id,seed),dt=1/(30+seed);
    switch(r.kind){
      case 0:
        r.tick(dt,0,1,0,true,false);
        r.tick(dt,...paperCreases[0],1,true,false);
        for(let n=0;n<=80;n++)r.tick(dt,-1.85+3.55*n/80,-.72,1,true,false);
        r.tick(dt,1.7,1.18,1,false,false);r.act(1.7,1.18,false);assert.equal(r.step,2);
        r.tick(dt,1.7,1.18,1,true,false);r.act(1.7,1.18,false);break;
      case 1:
        r.act(0,0,false);
        for(const p of scopeMarks){r.tick(dt,...p,1,false,false);r.act(...p,false);}break;
      case 2:
        r.act(0,1.62,false);
        for(let t=0;t<12&&r.rolling;t+=dt)r.tick(dt,-3.8,1.62,0,false,false);
        assert.equal(r.errors,1);r.act(0,1.62,false);
        for(let t=0;t<26&&!r.approach;t+=dt)r.tick(dt,r.ball[0],1.62,1,false,false);break;
      case 3:
        for(let i=0;i<3;i++){
          const p=passes[i];while(!r.canPass)r.tick(dt,...p,0,false,false);r.act(...p,i===1);
          while(r.flight>0)r.tick(dt,...p,0,false,false);
        }break;
      case 4:
        r.tick(dt,...iceAnchors[0],0,true,false);
        for(const p of stations){r.tick(dt,...p,1,false,false);r.act(...p,false);
          r.tick(dt,...p,1,true,false);r.act(...p,false);}break;
    }
    assert.ok(r.approach);for(const p of r.marks)r.tick(dt,...p,0,false,true);
    assert.equal(r.finds.size,r.kind===4?8:3);
  }
});
