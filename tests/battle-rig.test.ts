import assert from 'node:assert/strict';
import test from 'node:test';
import {Line3,Vector3} from 'three';
import {createBattleRig} from '../src/themes/battle-rig.ts';

test('canvas rig emits one projectile from its animated palm at each frame rate',()=>{
  for(const fps of [20,30,60,144]){
    const rig=createBattleRig(true);
    assert.ok(rig.mesh.isSkinnedMesh);
    assert.ok([...rig.mesh.geometry.attributes.skinWeight.array].some(w=>w>0&&w<1));
    assert.ok(rig.attack());assert.equal(rig.attack(),false);
    let releases=0;
    for(let i=0;i<fps*2;i++){
      const frame=rig.update(1/fps,0);
      if(frame.release){
        releases++;
        assert.ok((i+1)/fps>=.8-1e-5&&(i+1)/fps<=.8+1/fps+1e-5);
        const palm=rig.root.getObjectByName('HandR').localToWorld(new Vector3(0,-.087,.022));
        assert.ok(frame.muzzle.distanceTo(palm)<.00001);
      }
      assert.equal(frame.sweep,false);
    }
    assert.equal(releases,1);
    assert.ok(rig.attack());
  }
});

test('banner physically crosses a slime at combat range, both hands grip the pole and the tip plants',()=>{
  for(const fps of [20,60,144]){
    const rig=createBattleRig(false);
    rig.root.position.set(2.1,.76,-2);rig.root.rotation.y=.82;rig.update(0,0);
    rig.attack();
    const center=rig.root.localToWorld(new Vector3(0,.28,1.7));
    const pole=rig.root.getObjectByName('Pole');
    let closest=4, planted=false, swings=0;
    for(let i=0;i<fps*2.4;i++){
      const f=rig.update(1/fps,0);
      for(const [side,z] of [['L',-.09],['R',.065]] as const){
        const grip=pole.localToWorld(new Vector3(0,0,z));
        const hand=rig.root.getObjectByName('Hand'+side).getWorldPosition(new Vector3());
        assert.ok(grip.distanceTo(hand)<.019);
      }
      // Test the shaft and its butt against the padded breastplate in bone space.
      const chest=rig.root.getObjectByName('Flinch');
      for(let z=-.155;z<1.73;z+=.07){
        const p=chest.worldToLocal(pole.localToWorld(new Vector3(0,0,z)));
        if(p.y>-.22&&p.y<.16)assert.ok((p.x/.31)**2+(p.z/.204)**2>1);
      }
      if(f.sweep){
        swings++;
        const closestOnBlade=new Line3(f.bladeBase,f.bladeTip).closestPointToPoint(center,true,new Vector3());
        closest=Math.min(closest,closestOnBlade.distanceTo(center));
      }
      if(f.phase==='recover'&&f.bladeTip.y<rig.root.position.y)planted=true;
      assert.ok(f.bladeTip.y>=rig.root.position.y-.035);
      assert.equal(f.release,false);
    }
    assert.ok(swings>=4);assert.ok(closest<.3);assert.ok(planted);
  }
});

test('fallen garments settle at ground height; reset restores the live skeleton and its next attack',()=>{
  for(const ship of [false,true]){
    const rig=createBattleRig(ship);
    rig.attack();rig.update(.24,0);rig.defeat();
    assert.equal(rig.attack(),false);
    for(let i=0;i<60;i++)assert.equal(rig.update(1/60,0).phase,'down');
    rig.root.updateMatrixWorld(true);
    const p=new Vector3();let low=3,high=0;
    for(let i=0;i<rig.mesh.geometry.attributes.position.count;i++){
      rig.mesh.getVertexPosition(i,p);
      low=Math.min(low,p.y);high=Math.max(high,p.y);
    }
    assert.ok(low>-.009&&low<.02&&high<.70,JSON.stringify({ship,low,high}));
    rig.reset();assert.equal(rig.update(0,0).phase,'approach');assert.ok(rig.attack());
  }
});
