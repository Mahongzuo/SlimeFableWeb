import assert from 'node:assert/strict';
import test from 'node:test';
import {BookRun,bookLayout,bridgeX,foldAngle,leftX,paperBlocks,ribbon,type Reader} from '../src/templates/jan01-book';
import type {Vec} from '../src/slime/types';

const reader=(position:Vec, more:Partial<Reader>={}):Reader=>({position,clinging:false,gliding:false,grounded:true,...more});
test('四十种风相位的两条折页路线，书脊、压花、书签和本页回退',()=>{
  for(let n=0;n<40;n++){
    const layout=bookLayout('book-'+n);
    assert.deepEqual(layout,bookLayout('book-'+n));
    // Each rear edge meets the front of the following folded leaf; its tallest
    // crease is within an ordinary wall mantle. The far landing spans both lanes.
    const left=paperBlocks.slice(2,5);
    for(const [i,b] of left.entries()){
      assert.ok(Math.abs(b.x-leftX)<b.width/2);
      if(i>0){
        assert.ok(Math.abs(left[i-1].z-left[i-1].depth/2-b.z-b.depth/2)<.001);
        assert.ok(b.top-left[i-1].top<1);
      }
    }
    const lee=layout.flowers[0],air=layout.flowers[1];
    assert.ok(Math.abs(lee[0]-leftX)<.8&&Math.abs(air[0]-bridgeX)<.8);
    assert.ok(Array.from({length:60},(_,i)=>foldAngle(i/10,layout.windPhase)).some(a=>a>.4));
    for(const lane of ['fold','wind'] as const){
      const run=new BookRun(layout);
      run.read(reader([0,1.24,1]),.05);
      assert.equal(run.page,0,'landing alone cannot substitute for climbing');
      run.read(reader([0,.8,2.48],{clinging:true,grounded:false}),.05);
      run.read(reader([0,1.24,1]),.05);
      assert.equal(run.page,1);
      run.read(reader([0,-1.81,-1]),.05);
      assert.equal(run.page,1);assert.equal(run.fallen,1);
      run.read(reader([0,1,-6]),.05);assert.equal(run.page,1);
      run.read(lane==='fold'?reader(lee):reader(air,{gliding:true,grounded:false}),.05);
      assert.equal(run.flowers,lane==='fold'?1:2);
      run.read(reader([0,1,-6]),.05);assert.equal(run.page,2);
      run.read(reader(ribbon,{grounded:false}),.05);assert.equal(run.press,0);
      for(let i=0;i<25;i++)run.read(reader(ribbon),.05);
      assert.equal(run.page,3);
    }
  }
});
