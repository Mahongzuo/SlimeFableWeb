import test from 'node:test';
import assert from 'node:assert/strict';
import {fleetWorld,fleetDynamicBoxes,fleetPoints} from '../src/themes/battle-fleet';
import {createWorld} from '../src/slime/world';
import type {Vec} from '../src/slime/types';

function build(bridged:boolean,journal:boolean,offset?:[number,number]){
 const fixed=fleetWorld();
 return createWorld({...fixed,boxes:[...fixed.boxes,...fleetDynamicBoxes({bridged,journal},offset)]});
}
test('upper and lower companionways have real floors only after the winch, while the middle needs the journal',()=>{
 for(const [bridged,journal] of [[false,false],[true,false],[true,true]]){
  const world=build(bridged,journal);
  for(const [key,enabled] of [['upper',bridged],['lower',bridged],['shortcut',journal]] as const){
   const [,y,z]=fleetPoints[key];
   const left:Vec=[4.85,y+.51,z],right:Vec=[15.42,y+.51,z];
   assert.equal(world.cast(left,right,.04)===null,enabled,key+' aperture');
   assert.equal(world.support(10.3,z,y),enabled?y:null,key+' floor');
   if(enabled)for(const x of [5.245,5.255,14.69,14.845,14.855]){
    assert.equal(world.support(x,z,y),y,key+' seam at '+x);
   }
  }
 }
});
test('the physical records ship moves from sea to berth and does not leave an invisible hull behind',()=>{
 const dock=build(true,false),sailing=build(false,false,[6,-12]);
 const a:Vec=[21.07,1.12,4.23],b:Vec=[21.07,1.12,5.44];
 assert.ok(dock.cast(a,b),'archive wall docked');
 assert.equal(sailing.cast(a,b),null,'empty sea before arrival');
 assert.ok(sailing.cast([a[0]+6,a[1],a[2]-12],[b[0]+6,b[1],b[2]-12]));
});
test('both briefing tables are reachable and the guardian can be shot from the archive entrance',()=>{
 const w=build(true,true),guard=fleetPoints.guardian;
 assert.equal(w.cast([18.74,.77,1.58],[guard[0],guard[1]+.75,guard[2]],.12),null);
 assert.equal(w.support(1.55,4.25,1),.61);
 assert.equal(w.support(19.55,.93,1),.47);
});

test('the awakened figurehead raises all gangways until it falls, including the unlatched shortcut',()=>{
 const fixed=fleetWorld();
 for(const guardianDead of [false,true]){
  const gates=fleetDynamicBoxes({bridged:true,journal:true,chart:true,guardianDead});
  const world=createWorld({...fixed,boxes:[...fixed.boxes,...gates]});
  for(const end of [fleetPoints.upper,fleetPoints.lower,fleetPoints.shortcut]){
   const [,y,z]=end;
   assert.equal(world.cast([4.8,y+.5,z],[15.4,y+.5,z],.04)===null,guardianDead);
  }
 }
});
