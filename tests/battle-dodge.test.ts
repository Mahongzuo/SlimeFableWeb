import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BattleDodge,dodgeDirection,boltContact} from '../src/templates/battle-dodge';
import {Combat} from '../src/slime/combat';
import {createWorld} from '../src/slime/world';
import {shipWorld} from '../src/themes/battle-ship';

test('dodge moves 2.2 metres at different rates, in camera-relative direction or backwards',()=>{
 for(const step of [.01,.016,.05]){
  const dodge=new BattleDodge();dodge.begin(3,[0,0,1]);let z=0;
  for(let t=3;t<3.6;t+=step)z+=dodge.motion(t,t+step)?.[2]??0;
  assert.ok(Math.abs(z-2.2)<1e-9);assert.equal(dodge.begin(4,[1,0,0]),false);
  assert.equal(dodge.begin(4.21,[1,0,0]),true);
 }
 assert.equal(dodgeDirection(new Set(),0,[0,0,-1])[2],1);
 assert.ok(Math.abs(dodgeDirection(new Set(['KeyW']),Math.PI/2,[0,0,-1])[0]+1)<1e-8);
 const world=createWorld(shipWorld()),dodge=new BattleDodge();dodge.begin(0,[0,0,-1]);
 const motion=dodge.motion(0,.42)!;const p=world.moveCapsule([-1,0,.7],motion,.22,.52).position;
 assert.ok(p[2]>-.28&&p[2]<.2,'mast stopped dash');
});
test('damage, immunity, perfect boundary, attack/dodge deduplication and reset',()=>{
 for(const [t,outcome] of [[.04,'hit'],[.06,'perfect'],[.18,'perfect'],[.181,'evaded'],[.30,'evaded'],[.31,'hit']] as const){
  const dodge=new BattleDodge();dodge.begin(1,[1,0,0]);assert.equal(dodge.contact(1+t,1),outcome);
  assert.equal(dodge.contact(1+t,1),'duplicate');
 }
 const dodge=new BattleDodge();dodge.begin(0,[1,0,0]);assert.equal(dodge.contact(.08,3),'perfect');
 assert.equal(dodge.contact(.11,4),'evaded');assert.equal(dodge.multiplier(3.09),1);
 dodge.clear();assert.equal(dodge.multiplier(.3),1);assert.equal(dodge.contact(.3,5),'hit');
});
test('only the first actual living target hit receives the counter across damage paths',()=>{
 const dodge=new BattleDodge(),combat=new Combat([[0,0,0],[1,0,0]],false);
 dodge.begin(0,[0,0,-1]);dodge.contact(.1,1);combat.nextHitMultiplier=()=>dodge.multiplier(.5);
 assert.equal(combat.hitTargetsInRadius([10,0,10],1,5,20,.2,()=>{}),0);
 const dmg:number[]=[];combat.hitTargetsInRadius([0,0,0],2,5,20,.5,(_,d)=>dmg.push(d));
 assert.deepEqual(dmg,[27,20]);assert.equal(dodge.multiplier(.51),1);
});
test('relative projectile sweep catches crossing paths and rejects misses',()=>{
 assert.equal(boltContact([-1,0,0],[1,0,0],.5),.25);
 assert.equal(boltContact([-1,.6,0],[1,.6,0],.5),null);
 assert.equal(boltContact([0,0,0],[0,0,0],.5),0);
});

