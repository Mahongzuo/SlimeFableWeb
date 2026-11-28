import test from 'node:test';
import assert from 'node:assert/strict';
import {houseColliders,housePoint,HOUSE,canFurnish} from '../src/home/ninglu-layout';
import {createWorld} from '../src/slime/world';
import {preserveRects,preserveHeight} from '../src/world/expansion';
import {approachWear,trailX,makeBoardwalk,makeTrailFence} from '../src/home/preserve-trails';
import {animalWaterHeight,waterBirdAnchor,wetlandLevel} from '../src/home/preserve-water';
import {preserveCover} from '../src/home/foliage/preserve-habitat';
import {freshLife} from '../src/life/state';
import {slopedWaterLevel} from '../src/zones/lake-water';
import {cottageData} from '../src/home/homestead';

test('slime capsule can walk through moon gate, into ten rooms, upstairs and downstairs',()=>{
 const world=createWorld({indexBoxes:true,boxes:houseColliders(),surfaces:[]});
 const gallery=[[0,6.5],[0,-2.52]],stairs=[...gallery,[-.895,-2.70],[-.895,-8.54],[.90,-8.54],[.90,-2.58]];
 function walk(steps:number[][],height:number){
   let p=housePoint(0,10.42);
   for(const [x,z] of steps){
     const t=housePoint(x,z);
     for(let i=0;i<300;i++){
       const dx=t[0]-p[0],dz=t[2]-p[2],dist=Math.hypot(dx,dz);
       if(dist<.027)break;
       const stride=Math.min(.045,dist)/dist;
       p=world.moveCapsule(p,[dx*stride,0,dz*stride],.27,.56).position;
       p[1]=world.support(p[0],p[2],p[1],true)??0;
     }
     assert.ok(Math.hypot(t[0]-p[0],t[2]-p[2])<.03,'blocked at '+p+' toward '+t);
   }
   assert.ok(Math.abs(p[1]-HOUSE.y-HOUSE.scale*height)<.09,'floor '+p);
 }
 for(const x of [-7.95,-4.05,4.05,7.95]){
   walk([...gallery,[x,-2.52],[x,-4.95]],.10);
   walk([...stairs,[x,-2.58],[x,-4.95]],3.38);
 }
 for(const x of [-8,8])walk([[0,6.52],[x,6.52],[x,4.29]],.10);
 walk([...stairs,[.90,-8.54],[-.895,-8.54],[-.895,-2.59],[0,-2.59],[0,10.42]],0);
});
test('moving into the new residence preserves furniture and keeps the gallery and stairs clear',()=>{
 const life=freshLife();
 life.cottage={plants:[],furniture:[{id:'original',kind:'bed',x:0,z:0,turn:0}]};
 assert.equal(cottageData(life).furniture[0].stored,true);
 assert.deepEqual(cottageData(life),structuredClone(life.cottage));
 assert.equal(canFurnish(0,-3,.72,.72),false);
});
test('trail ground and grass share bends across seams, slats only span the wet banks',()=>{
 const rects=preserveRects([]),trail=rects.filter(r=>r.biome==='trail'&&r.minX>0);
 assert.ok(trail.length===2);
 assert.equal(approachWear(trailX(trail[0],142),142),1);
 assert.ok(approachWear(trailX(trail[0],141.5),141.5)>.99);
 for(const r of trail){
   for(let z=r.minZ;z<r.maxZ;z+=.75){
     const x=trailX(r,z);assert.equal(preserveCover(r,x,z),0);
     assert.ok(preserveCover(r,x+3.3,z)>.45);
   }
   assert.ok(makeTrailFence(r).boxes.length>10);
 }
 assert.equal(trailX(trail[0],trail[0].maxZ),trailX(trail[1],trail[1].minZ));
 const marsh=rects.find(r=>r.biome==='marsh')!;
 const boards=makeBoardwalk(marsh).boxes;assert.ok(boards.length>10);
 for(const b of boards)assert.ok(preserveHeight(marsh,(b.min[0]+b.max[0])/2,(b.min[2]+b.max[2])/2)<.39);
});
test('heron wades on bed, swimming birds displace water on open paths clear of boardwalk',()=>{
 const r=preserveRects([]).find(r=>r.biome==='marsh')!,cx=(r.minX+r.maxX)/2,cz=(r.minZ+r.maxZ)/2;
 for(const [i,slug] of ['grey-heron','great-crested-grebe','mute-swan'].entries()){
   const anchor=waterBirdAnchor(r,slug,cx-5+i*4.3,cz+2*(i%2?1:-1));
   for(let p=0;p<6.29;p+=.15){
     const x=anchor.x+2.8*Math.sin(p),z=anchor.z+1.65*Math.cos(p),motion=animalWaterHeight(r,slug,x,z,1,p);
     assert.ok(motion.wet && motion.y<wetlandLevel);
     assert.equal(motion.swim,i>0);
     assert.ok(Math.abs(x-trailX(r,z))>1.55);
     if(!i)assert.equal(motion.y,preserveHeight(r,x,z));
   }
 }
});

test('the forest creek samples the drawn slope and excludes its dry margins',()=>{
  const sample=slopedWaterLevel([0,.1,0, 0,.3,2, 2,.5,0, 2,.7,2],[0,1,2,1,3,2]);
  assert.ok(Math.abs(sample(.5,.5)!-.25)<1e-8);
  assert.ok(Math.abs(sample(1.6,1.6)!-.58)<1e-8);
  assert.equal(sample(2.01,1),undefined);
  assert.equal(sample(22,2),undefined);
});
