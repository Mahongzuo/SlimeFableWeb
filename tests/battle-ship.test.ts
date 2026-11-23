import test from 'node:test';
import assert from 'node:assert/strict';
import {shipWorld} from '../src/themes/battle-ship';
import {createWorld} from '../src/slime/world';
import type {Vec} from '../src/slime/types';

const world=createWorld(shipWorld());
/** Follow the same capsule sweep, gravity and foot-height support acquisition as the native character. */
function walk(start:Vec,path:[number,number][],visit?:(p:Vec)=>void):Vec {
 let p=start,vy=0;
 for(const [x,z] of path) {
  for(let tick=0;tick<900;tick++){
   const dx=x-p[0],dz=z-p[2],dist=Math.hypot(dx,dz);
   if(dist<.012)break;
   const stride=Math.min(.047,dist);
   const next=world.moveCapsule(p,[dx/dist*stride,0,dz/dist*stride],.22,.52).position;
   const floor=world.support(next[0],next[2],p[1]);vy-=20.5/60;next[1]+=vy/60;
   if(floor!==null&&vy<=0&&next[1]<=floor+.04&&p[1]>=floor-.38){next[1]=floor;vy=0;}
   p=next;visit?.(p);
  }
  assert.ok(Math.hypot(p[0]-x,p[2]-z)<.02,'blocked en route to '+[x,z]+' at '+p);
 }
 return p;
}
test('both companionways link the quarterdeck to the main deck',()=>{
 for(const s of [-1,1]){
  const top=walk([0,0,4],[[0,.48],[4.22*s,.48],[4.22*s,6.88],[0,7.18]]);
  assert.equal(top[1],2.1);
  const foot=walk(top,[[-4.22*s,7.18],[-4.22*s,.48],[0,.48]]);
  assert.equal(foot[1],0);
 }
});
test('the cargo passage crosses under the actual main deck from one hatch to the other',()=>{
 for(const s of [-1,1]){
  const low=walk([0,0,4],[[0,.30],[4.22*s,.30],[4.22*s,-5.65],[0,-5.65]]);
  assert.equal(low[1],-2.45);
  const high=walk(low,[[-4.22*s,-5.65],[-4.22*s,.30],[0,.30]]);
  assert.equal(high[1],0);
 }
});
test('sights, enemy shots and camera respect each deck, mast, side windows and cargo',()=>{
 const cast=(a:Vec,b:Vec,cam=false)=>world.cast(a,b,.035,cam);
 for(const cam of [false,true]){
  assert.ok(cast([-.45,-1.2,-5.6],[-.45,2,-5.6],cam));
  assert.ok(cast([-1,.65,4],[-1,.65,-3],cam));
  assert.ok(cast([1,-.25,-6.8],[6,-.25,-6.8],cam));
  assert.equal(cast([4.22,-1.45,-5.9],[7.5,-1.45,-5.9],cam),null);
 }
 assert.ok(cast([-2,.55,3],[-2,.55,-2]));
 assert.equal(cast([0,.6,3.8],[0,.75,-3]),null);
 assert.equal(cast([1.7,2.84,6.68],[.75,.85,-3]),null);
 assert.ok(cast([1,.8,8.4],[1,3,8.4]));
});

