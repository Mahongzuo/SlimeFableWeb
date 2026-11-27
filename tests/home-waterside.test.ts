import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {trees} from '../src/zones/kit';
import {propCollisionParts} from '../src/home/build-catalog';
import {createWorld} from '../src/slime/world';
import {freshLife,observeFish} from '../src/life/state';
import {WaterFish,lotusPond} from '../src/home/water-fish';

test('树干末端嵌入中心树冠，晴天与强风均留有连接余量',()=>{
  const zone={T,ground:()=>1.2,rand:()=>.4,ctx:{U:{uTime:{value:1}}},toon:()=>new T.MeshBasicMaterial({side:T.DoubleSide})};
  for(const size of [.8,1,3.2]){
    const group=trees(zone as any,[[2,7,size]]);
    group.updateMatrixWorld(true);
    const ray=new T.Raycaster(new T.Vector3(2,1.3,7),new T.Vector3(0,1,0));
    const casts=(name:string)=>ray.intersectObject(group.getObjectByName(name)!).filter((h:any)=>h.instanceId===0);
    const trunk=casts('tree-trunks'),crown=casts('tree-foliage');
    assert.ok(trunk.length&&crown.length);
    assert.ok(trunk[0].distance>crown[0].distance+.15*size);
  }
});

test('旋转月洞门保留中央通道，侧墙有射线碰撞；廊桥桥面随拱升高',()=>{
  const floor={min:[-50,-50] as [number,number],max:[50,50] as [number,number],height:0};
  for(const yaw of [0,.63,Math.PI/2]){
    const p={id:'gate',itemId:'build-moon-gate',x:7,y:0,z:9,scale:1.4,yaw};
    const world=createWorld({indexBoxes:true,boxes:propCollisionParts(p),surfaces:[floor]});
    const local=(x:number,z:number):[number,number,number]=>[7+x*Math.cos(yaw)+z*Math.sin(yaw),.58,9-x*Math.sin(yaw)+z*Math.cos(yaw)];
    assert.equal(world.cast(local(0,-1),local(0,1)),null);
    assert.ok(world.cast(local(1.5,-1),local(1.5,1)));
    const start=local(0,-1),end=local(0,1);start[1]=.12;
    const move=world.moveCapsule(start,[end[0]-start[0],0,end[2]-start[2]]);
    assert.ok(Math.hypot(move.position[0]-end[0],move.position[2]-end[2])<.12);
  }
  const bridge=propCollisionParts({id:'bridge',itemId:'build-covered-bridge',x:0,y:0,z:0,scale:1,yaw:0});
  const world=createWorld({boxes:bridge,surfaces:[floor]});
  assert.ok(world.support(0,0,.6)!>world.support(2.7,0,.3)!+.23);
  assert.equal(world.cast([0,1,-.50],[0,1,.50]),null);
});

test('接触鱼才登记图鉴，反复遇见保留首次日期、贝壳和背包',()=>{
  const life=freshLife(),scene=new T.Scene(),fish=new WaterFish(scene,id=>observeFish(life,id));
  fish.update(0,null);
  const koi=scene.getObjectByName('fish-koi')!;
  fish.update(0,[koi.position.x,koi.position.y+2,koi.position.z]);assert.deepEqual(life.dex,{});
  fish.update(0,[koi.position.x,-.57,koi.position.z]);
  const entry={...life.dex['fish-koi']};
  assert.ok(entry.first>0);assert.equal(entry.n,0);
  fish.update(0,[koi.position.x,-.57,koi.position.z]);
  assert.deepEqual(life.dex['fish-koi'],entry);assert.deepEqual(life.bag,{});assert.equal(life.coins,0);
});

test('扩建荷塘的可见鱼群和圆形水域随地块增减',()=>{
  const tile={id:'test-pond',gx:12,gz:12,theme:'jiangnan' as const,unlockedAt:1};
  const pond=lotusPond(tile)!;assert.ok(pond);
  const {x,z,radius,level}=pond;
  const world=createWorld({boxes:[],surfaces:[],fluids:[{min:[x-radius,z-radius],max:[x+radius,z+radius],circle:true,level}]});
  assert.equal(world.fluid(x,z),level);assert.equal(world.fluid(x+radius*.9,z+radius*.9),null);
  const scene=new T.Scene(),fish=new WaterFish(scene,()=>{}),initial=scene.children.length;
  fish.sync([tile]);fish.sync([tile]);fish.update(12,null);
  assert.equal(scene.children.length,initial+3);
  for(const body of scene.children.slice(initial)){
    assert.equal(world.fluid(body.position.x,body.position.z),level);
    assert.ok(body.position.y<level&&body.position.y>level-.18);
  }
  fish.sync([]);assert.equal(scene.children.length,initial);
});
