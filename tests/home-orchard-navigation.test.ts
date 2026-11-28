import assert from 'node:assert/strict';
import test from 'node:test';
import {orchardRoutes, gardenSite, ownedGardenAt, plantingSpots, type GardenPoint} from '../src/home/orchard-navigation.ts';
import {freshLife, ensureHome, type ExpandedTile} from '../src/life/state.ts';
import {makeExpansionSlot} from '../src/world/expansion.ts';
import {createWorld} from '../src/slime/world.ts';
import type {Box} from '../src/slime/types.ts';

const slot=makeExpansionSlot(0,2);
const tile:ExpandedTile={id:slot.id,gx:0,gz:2,theme:'meadow',unlockedAt:0};
const center:GardenPoint=[(slot.min[0]+slot.max[0])/2,(slot.min[1]+slot.max[1])/2];
const X=(v:number)=>center[0]+v, Z=(v:number)=>center[1]+v;
const newHome=()=>{const home=ensureHome(freshLife());home.expansions.push(tile);return home;};
const flat=()=>0, dry=()=>null;

test('only purchased expansions accept the whole grown crown; water, steep banks, roads, existing trees, buildings and beds reject planting',()=>{
  const home=newHome();
  assert.equal(ownedGardenAt([],X(0),Z(0)),null);
  assert.equal(ownedGardenAt(home.expansions,X(0),Z(0))?.tile.id,tile.id);
  assert.equal(ownedGardenAt(home.expansions,10,0),null);
  home.paving.push({x:X(5),z:Z(0),finish:'stone'});
  home.placed.push({id:'bed',itemId:'farm-bed-wood',x:X(-10),y:0,z:Z(0),yaw:Math.PI/4,scale:1});
  const box:Box={name:'angled fence',min:[X(-.1),0,Z(-2)],max:[X(.1),.9,Z(2)],yaw:.3};
  const site=gardenSite(tile,slot,home,[{x:X(0),z:Z(8),radius:2}],flat,dry,[box]);
  assert.match(site.reason(slot.min[0]+.1,Z(0),2),/地块/);
  assert.match(site.reason(X(5),Z(0),2),/铺/);
  assert.match(site.reason(X(-10),Z(0),2),/木框/);
  assert.match(site.reason(X(0),Z(0),2),/障碍/);
  assert.match(site.reason(X(0),Z(6),2),/树冠/);
  assert.equal(site.reason(X(9),Z(4),2),'');
  assert.match(gardenSite({...tile,theme:'farmland'},slot,home,[],flat,dry,[]).reason(X(0),Z(4),2),/小径/);
  assert.match(gardenSite(tile,slot,home,[],flat,()=>.9,[]).reason(X(8),Z(2),2),/水面/);
  assert.match(gardenSite(tile,slot,home,[],x=>x, dry,[]).reason(X(8),Z(2),2),/坡/);
});

test('physical route reaches the far side of a pond and rotated fence without crossing water or solid capsule clearance',()=>{
  const home=newHome();
  const fence:Box={name:'orchard-fence',min:[X(-.22),-.1,Z(0)],max:[X(.22),1.2,Z(8)],yaw:.27};
  const water=(x:number,z:number)=>Math.hypot(x-X(0),z-Z(-2))<3.5?.2:null;
  const site=gardenSite(tile,slot,home,[],flat,water,[fence]);
  const from:GardenPoint=[X(-7),Z(0)], goal:GardenPoint=[X(7),Z(0)];
  const path=orchardRoutes(slot,from,site)(goal);
  assert.ok(path&&path.length>=2);
  const world=createWorld({boxes:[fence],surfaces:[{min:slot.min,max:slot.max,height:0}]});
  let p=from;
  for(const q of path){
    const count=Math.ceil(Math.hypot(q[0]-p[0],q[1]-p[1])/.10);
    for(let i=1;i<=count;i++){
      const t=(i-1)/count,x=p[0]+(q[0]-p[0])*t,z=p[1]+(q[1]-p[1])*t;
      const dx=(q[0]-p[0])/count,dz=(q[1]-p[1])/count;
      assert.equal(water(x+dx,z+dz),null);
      const moved=world.moveCapsule([x,0,z],[dx,0,dz],.27,.56).position;
      assert.ok(Math.hypot(moved[0]-x-dx,moved[2]-z-dz)<.035);
    }
    p=q;
  }
  assert.deepEqual(p,goal);
});

test('batch preview caps inventory and excludes unreachable sites; adjoining grown crowns stay clear',()=>{
  const home=newHome(),from:GardenPoint=[X(-12),Z(2)];
  const wall:Box={name:'closed fence',min:[X(-.2),0,slot.min[1]],max:[X(.2),1.3,slot.max[1]]};
  const site=gardenSite(tile,slot,home,[],flat,dry,[wall]);
  const path=orchardRoutes(slot,from,site);
  assert.equal(path([X(5),Z(5)]),null);
  const candidates=plantingSpots(slot,from,2.4,6,(x,z)=>!site.reason(x,z,2.4),p=>!!path(p));
  assert.equal(candidates.length,6);
  assert.ok(candidates.every(p=>p[0]<X(0)));
  candidates.forEach((a,i)=>candidates.slice(i+1).forEach(b=>assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])>=4.8)));
});
