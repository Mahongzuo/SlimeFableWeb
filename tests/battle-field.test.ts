import test from 'node:test';
import assert from 'node:assert/strict';
import {Line3,Vector3} from 'three';
import {fieldWorld,fieldHeight,fieldPoints} from '../src/themes/battle-field.ts';
import {createBattleRig} from '../src/themes/battle-rig.ts';
import {createWorld} from '../src/slime/world.ts';

test('low meadow and high standard each link the fork to the commander over continuous walkable terrain',()=>{
  const world=createWorld(fieldWorld());
  assert.equal(fieldHeight(fieldPoints.right[0],fieldPoints.right[2]),1.8);
  assert.equal(fieldPoints.left[1],0);
  for(const turn of [fieldPoints.left,fieldPoints.right]){
    const route=[fieldPoints.spawn,fieldPoints.first,fieldPoints.fork,turn,fieldPoints.bossGate,fieldPoints.boss];
    let p:[number,number,number]=[...route[0]];
    for(const to of route.slice(1)){
      const [ox,,oz]=p,dx=(to[0]-ox)/120,dz=(to[2]-oz)/120;
      for(let frame=0;frame<120;frame++){
        const step=world.moveCapsule(p,[dx,0,dz]);assert.equal(step.squeezed,false);
        const [x,,z]=step.position,y=world.support(x,z,p[1]);
        assert.ok(y!==null&&Math.abs(y-p[1])<.08);assert.ok(Math.abs(y-fieldHeight(x,z))<.00001);p=[x,y,z];
      }
      assert.ok(Math.hypot(p[0]-to[0],p[1]-to[1],p[2]-to[2])<.00001);
    }
  }
});

test('reverse sweep, driving thrust and boarding leap cross the player only in their active animation windows',()=>{
  for(const [variant,kind,range,start,end] of [['captain','follow',1.48,.56,.82],['light','thrust',1.52,.48,.75],['boarder','thrust',1,.43,.72]] as const){
    const rig=createBattleRig(variant==='boarder',variant);
    assert.ok(rig.attack(kind));let closest=4,first=4,last=0;
    for(let frame=0;frame<150;frame++){
      const dt=1/60,f=rig.update(dt,0);
      assert.equal(f.release,false);
      if(!f.sweep)continue;
      const p=new Vector3(0,.28,range),blade=new Line3(f.bladeBase,f.bladeTip);
      closest=Math.min(closest,blade.closestPointToPoint(p,true,new Vector3()).distanceTo(p));
      first=Math.min(first,frame*dt+f.sweepStart*dt);last=Math.max(last,frame*dt+f.sweepEnd*dt);
    }
    assert.ok(closest<.32);assert.ok(Math.abs(first-start)<1e-5);assert.ok(Math.abs(last-end)<1e-5);
  }
});

test('commander drops to a knee, holds recovery, and only then accepts another attack',()=>{
  const rig=createBattleRig(false,'captain');rig.setEnraged(true);
  assert.ok(rig.attack('sweep'));rig.update(1.17,0);
  const hip=rig.root.getObjectByName('Hips');
  assert.ok(rig.stagger(1.1));assert.equal(rig.stagger(),false);assert.equal(rig.attack('follow'),false);
  for(let i=0;i<60;i++)assert.equal(rig.update(1/60,0).phase,'recover');
  assert.ok(hip.position.y<.37);
  for(let i=0;i<9;i++)rig.update(1/60,0);
  assert.ok(rig.attack('follow'));
});

// A head-on shot and camera ray meet the sculpted face; an elevated sightline
// and the physical approaches on either flank remain clear.
test('shared rock hull blocks the centre and both routes can skirt it',()=>{
  const world=createWorld(fieldWorld());
  for(const camera of [false,true]){
    const hit=world.cast([.04,.82,-8.3],[.04,.82,-13],.04,camera);
    assert.ok(hit&&hit.point[2]<-9.2&&hit.point[2]>-10.2);
    assert.equal(world.cast([.04,2.15,-8.3],[.04,2.15,-13],.02,camera),null);
    for(const x of [-1.45,1.45])assert.equal(world.cast([x,2,-8.3],[x,2,-13],.04,camera),null);
  }
  let p:[number,number,number]=[0,0,-8.2];
  for(let i=0;i<60;i++)p=world.moveCapsule(p,[0,0,-.075]).position;
  assert.ok(p[2]>-9.7&&p[2]<-8.2);
});
