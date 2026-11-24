import assert from 'node:assert/strict';
import test from 'node:test';
import {GroundCameraHeight} from '../src/slime/camera-follow';

test('阶梯接地视点用实际帧时间，稳定后停住，传送立即复位',()=>{
 const readings:number[]=[];
 for(const hz of [30,60,120]){
  const filter=new GroundCameraHeight(),dt=1/hz;
  assert.equal(filter.update(0,dt,true),0);
  let previous=0;
  for(let frame=0;frame<hz;frame++){
   const current=filter.update(.18,dt,true);
   assert.ok(current>=previous&&current<=.18);
   if(frame===hz/6-1)readings.push(current);
   previous=current;
  }
  assert.ok(previous>.17999);
  filter.reset();assert.equal(filter.update(-9,dt,true),-9);
 }
 assert.ok(Math.max(...readings)-Math.min(...readings)<1e-9);
});

test('空中与攀墙视点实时跟随，只消退离开台阶前的残余高度差',()=>{
 const filter=new GroundCameraHeight(),dt=1/120;
 filter.update(0,dt,true);
 const last=filter.update(.18,dt,true);
 const first=filter.update(.24,dt,false);
 assert.ok(first-last>=.06&&first-last<.09);
 filter.reset();filter.update(2.2,dt,true);
 assert.equal(filter.update(2.33,dt,false),2.33);
 assert.equal(filter.update(2.46,dt,false),2.46);
});
