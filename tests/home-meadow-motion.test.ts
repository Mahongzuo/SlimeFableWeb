import test from 'node:test';
import assert from 'node:assert/strict';
import {MeadowMotion} from '../src/home/foliage/meadow-motion';

function actor() {
  return {position:[3, 2, 5], velocity:[0, 0, 0], mode:'play', grounded:true, swimming:false, spread:0};
}

test('原地站立维持一次接地，脚印按实际移步留下，停步后回弹', () => {
  const motion = new MeadowMotion(), slime = actor(), dt = 1/60;
  for (let i=0;i<120;i++) motion.updateContact(dt,slime,2);
  assert.equal(motion.foot.w,.48);
  assert.ok(motion.trail.every(p=>p.w===0));
  slime.grounded=false;slime.velocity[1]=-.23;
  motion.updateContact(dt,slime,2);
  assert.equal(motion.foot.w,.48);
  slime.grounded=true;
  slime.position[0]+=.25;
  motion.updateContact(dt,slime,2);
  assert.equal(motion.trail[0].x,3);
  assert.ok(motion.trail[0].w>0);
  slime.spread=1;
  for(let i=0;i<120;i++)motion.updateContact(dt,slime,2);
  assert.equal(motion.foot.w,1.01);
  assert.ok(motion.trail.every(p=>p.w===0));
});

test('长椅、载具、跳起和水面均解除压草，落回草地才恢复', () => {
  const motion=new MeadowMotion(), slime=actor(), dt=1/60;
  motion.updateContact(dt,slime,2);
  for (const y of [2.64,3.04]) {
    motion.updateContact(dt,{...slime,position:[3,y,5]},2);
    assert.equal(motion.foot.w,0);
  }
  motion.updateContact(dt,slime,2);
  motion.updateContact(dt,{...slime,grounded:false,velocity:[0,5,0]},2);
  assert.equal(motion.foot.w,0);
  motion.updateContact(dt,{...slime,ridePlane:{}},2);
  assert.equal(motion.foot.w,0);
  motion.updateContact(dt,{...slime,swimming:true},2);
  assert.equal(motion.foot.w,0);
  motion.updateContact(dt,slime,null);
  assert.equal(motion.foot.w,0);
  motion.updateContact(dt,slime,2);
  assert.equal(motion.foot.w,.48);
});

test('换天气及长时间运行后风相位连续，极端输入受限', () => {
  const motion=new MeadowMotion(), dt=1/60;
  motion.advanceWind(7200,.29);
  for(const input of [8,8,-3,0,1,8]) {
    for(let i=0;i<300;i++) {
      const before=motion.phase.value;
      motion.advanceWind(dt,input);
      assert.ok(motion.wind.value>=0 && motion.wind.value<=.8);
      const speed=(motion.phase.value-before)/dt;
      assert.ok(speed>=.72-1e-9 && speed<=1.056+1e-9);
    }
  }
});
