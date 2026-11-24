import test from 'node:test';
import assert from 'node:assert/strict';
import {Combat} from '../src/slime/combat';
import {SlimeSolver} from '../src/slime/solver';
import {createWorld} from '../src/slime/world';
import {idlePose,solveCannonLaunch,type FrameInput,type Vec} from '../src/slime/types';

test('五号门首次命中移动敌人立即爆裂释放名额；撞桅杆保留分身，旧玩法仍可回收',()=>{
 const muzzle:Vec=[0,.75,-.6],aim:Vec=[0,.75,-5];
 const launch=solveCannonLaunch(muzzle,aim)!;
 for(const [burstOnEnemy,mast] of [[true,false],[true,true],[false,false]]){
  const world=createWorld({surfaces:[{min:[-10,-10],max:[10,10],height:0}],
   boxes:mast?[{name:'mast',min:[-.3,0,-3],max:[.3,3,-2.6]}]:[]});
  const solver=new SlimeSolver([0,0,0],world);
  const input:FrameInput={anchor:[0,0,0],forward:[0,0,-1],velocity:[0,0,0],spread:0,
   grounded:true,recalling:false,impact:0,pose:idlePose(),dt:1/60,quality:'balanced',commands:[],
   generation:0,battleTargets:[{id:7,radius:.52,center:[4,.75,-5]}]};
  const projectile={muzzle,start:muzzle,target:aim,gravity:9.8,element:3,burstOnEnemy,...launch};
  solver.launch(aim,input.forward,projectile);
  for(let i=0;i<36;i++){
   if(i===14)input.battleTargets![0].center=[0,.75,-5];
   solver.step(1/60,input);
  }
  const events=solver.takeImpacts();assert.equal(events.length,1);
  assert.equal(events[0].shotId,1);assert.equal(events[0].element,3);
  assert.equal(events[0].targetId,mast?null:7);
  assert.ok(mast?events[0].point[2]>=-2.6:events[0].point[2]<-4);
  const burst=burstOnEnemy&&!mast;
  assert.equal(solver.views().length,burst?0:1);
  if(burst)assert.ok(solver.particles.every(p=>p.group===0));
  else{
   assert.equal(solver.views()[0].phase,'active');
   if(mast){
    solver.shots[0].age=8;
    solver.step(1/60,input);
    assert.equal(solver.views()[0].phase,'active');
   }
   input.recalling=true;solver.step(1/60,input);
   assert.equal(solver.views()[0].phase,'returning');
  }
  assert.deepEqual(solver.takeImpacts(),[]);
  for(let i=0;i<(burst?5:4);i++)assert.ok(solver.launch(aim,input.forward,projectile));
  assert.equal(solver.launch(aim,input.forward,projectile),false);
  // Manual recall before contact prevents both an impact and an explosion.
  input.recalling=true;solver.step(1/60,input);
  assert.ok(solver.views().every(s=>s.phase==='returning'||s.phase==='merging'));
  assert.deepEqual(solver.takeImpacts(),[]);
 }
});

test('战斗敌人阵亡保持，训练目标仍可复活；同一战斗目标共用元素结算',()=>{
 for(const respawn of [true,false]){
  const combat=new Combat([[0,0,0]],respawn),target=combat.targets[0];
  combat.applyHitToTarget(target,20,0,0,()=>{});
  combat.applyHitToTarget(target,100,2,1,(_target,damage,_element,reaction)=>{
   assert.equal(reaction?.kind,'Vaporize');assert.equal(damage,172);
  });
  assert.equal(target.health,0);
  combat.update(1/60,[0,0,0],5,()=>{});
  assert.equal(target.health,respawn?target.maxHealth:0);
 }
});
