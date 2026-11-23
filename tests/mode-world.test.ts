import test from 'node:test';
import assert from 'node:assert/strict';
import {generateLayout, observationPoint, receiverAim, sweptImpact, lamps, phaseCanHit} from '../src/templates/mode-world';
import {createWorld} from '../src/slime/world';
import {SlimeSolver} from '../src/slime/solver';
import {idlePose} from '../src/slime/types';
import type {Vec, ShotView} from '../src/slime/types';

const shot=(center:Vec,phase:ShotView['phase']):ShotView=>({center,phase,id:1,radius:.16,age:0,mergeProgress:0});
for(const kind of ['shot','trial'] as const)for(const day of ['1123','0101','0815']) test(day+' '+kind+' 双路线、可达平台、分身落点与遮挡各 40 种子',()=>{
 const variants=new Set<string>();
 for(let i=0;i<40;i++){
  const seed='qa-mode-'+i, l=generateLayout(day,seed,kind), world=createWorld(l.world);
  assert.deepEqual(l,generateLayout(day,seed,kind));
  variants.add(JSON.stringify([l.stations,l.pads,l.targets]));
  for(const path of [l.mainPath,l.sidePath]){
   assert.deepEqual(path[0],l.spawn);assert.deepEqual(path.at(-1),l.end);
   for(let j=1;j<path.length;j++)for(let k=0;k<=30;k++){
    const a=path[j-1],b=path[j],f=k/30;
    assert.notEqual(world.support(a[0]*(1-f)+b[0]*f,a[2]*(1-f)+b[2]*f),null,day+' path '+j);
   }
  }
  for(const station of l.stations){
   const [x,y,z]=station.at;const ground=world.support(x,z,y);
   assert.ok(ground!==null&&Math.abs(ground-y)<.18,station.label);
  }
  if(l.story==='life'){
   const roof=l.world.boxes[1];const x=l.stations[1].at[0],z=roof.max[2]+.6;
   assert.ok(world.moveCapsule([x,0,z],[0,0,-1.2],.24,.57).squeezed);
   assert.ok(!world.moveCapsule([x,0,z],[0,0,-1.2],.24,.23).squeezed);
   const wall=l.world.boxes[0];assert.equal(world.wall([l.stations[0].at[0],0,wall.max[2]+.21],[0,-1],.4)?.top,1.6);
  }
  if(l.story==='ink')assert.notEqual(world.fluid(0,1.85),null);
  if(l.story==='memorial'){assert.equal(world.support(0,0),null);assert.equal(l.targets.length,0);}
  for(const [j,p] of l.pads.entries()){
   assert.equal(lamps(l,[shot(p,'active')])[j],true);
   assert.equal(lamps(l,[shot(p,'flying'),shot(p,'returning')])[j],false);
   assert.equal(lamps(l,[shot([p[0]+1.8,p[1],p[2]],'active')])[j],false);
  }
  // Cast straight through a full-height wall in each real layout, with a target both behind and in front.
  const wall=l.world.boxes.find(b=>b.max[1]-b.min[1]>.8)!;
  const y=(wall.min[1]+wall.max[1])/2,z=(wall.min[2]+wall.max[2])/2;
  const from:Vec=[wall.min[0]-1,y,z],to:Vec=[wall.max[0]+1,y,z],front:Vec=[from[0]+.48,y,z];
  assert.equal(sweptImpact(from,to,to,to,.14,world),null);
  assert.notEqual(sweptImpact(from,to,front,front,.14,world),null);
  assert.equal(sweptImpact(from,to,[front[0],y+2,z],[front[0],y+1.8,z],.22,world),null);
  for(let j=0;j<l.targets.length;j++)assert.notDeepEqual(observationPoint(l,j,0),observationPoint(l,j,1));
 }
 assert.ok(variants.size>=36);
});
test('只有发射途中的分身会击中，落地或召回不能连刷伤害',()=>{
 const at:Vec=[0,1,0];
 assert.ok(phaseCanHit(shot(at,'flying'),shot(at,'active')));
 assert.ok(!phaseCanHit(shot(at,'active'),shot(at,'active')));
 assert.ok(!phaseCanHit(shot(at,'returning'),shot(at,'flying')));
});
test('接收场两条馈线每条 40 种子均能由原版求解器实际落台',()=>{
 for(let seed=0;seed<40;seed++){
  const l=generateLayout('0815','native-'+seed,'shot');
  for(const [i,target] of l.pads.entries()){
   const foot=l.stations[0].at;
   const dx=target[0]-foot[0],dz=target[2]-foot[2],d=Math.hypot(dx,dz);
   const forward:Vec=[dx/d,0,dz/d],solver=new SlimeSolver(foot,createWorld(l.world));
   solver.launch(receiverAim(target),forward);
   for(let j=0;j<85&&solver.shots[0].phase!=='active';j++){
    solver.step(1/60,{anchor:foot,velocity:[0,0,0],forward,dt:1/60,quality:'balanced',commands:[],
      grounded:true,recalling:false,impact:0,spread:0,pose:idlePose(),generation:1});
   }
   assert.equal(lamps(l,solver.views())[i],true,'seed '+seed+' pad '+i);
  }
 }
});
