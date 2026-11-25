import test from 'node:test';
import assert from 'node:assert/strict';
import {BuildHistory} from '../src/home/build-history';
import {BUILD_ITEMS, canPlaceProp, settleLegacyGarden, propCollisionParts, isInPlazaNoBuild} from '../src/home/build-catalog';
import {portalSlots} from '../src/home/layout';
import {freshLife,ensureHome} from '../src/life/state';

test('旧家园缺少铺地字段仍保留农床，撤销拆除同步恢复农作物与贝壳',()=>{
  const life=freshLife();
  Reflect.deleteProperty(life.home!,'paving');
  const bed={id:'kept', itemId:'farm-bed-wood',x:8,y:.1,z:46,yaw:0,scale:1};
  life.home!.placed.push(bed);
  assert.deepEqual(ensureHome(life).paving,[]);
  life.plots['home-plot-kept']={crop:'seed-radish',planted:1,grown:0,watered:1};
  const history=new BuildHistory(),before=history.begin(life);
  delete life.plots['home-plot-kept'];life.coins+=8;life.home!.placed=[];
  history.commit(life,before);
  assert.ok(history.restore(life,false));
  assert.equal(life.plots['home-plot-kept']?.crop,'seed-radish');
  assert.deepEqual(life.home!.placed,[bed]);assert.equal(life.coins,0);
  assert.ok(history.restore(life,true));assert.equal(life.coins,8);assert.deepEqual(life.home!.placed,[]);
  history.clear();assert.equal(history.canUndo,false);
});

test('六门与公共岸路占地有保护，旋转的长桥按完整占地判交',()=>{
  for(const p of portalSlots)assert.ok(isInPlazaNoBuild(p.position[0],p.position[2],1));
  assert.ok(isInPlazaNoBuild(8,34,.5));assert.equal(isInPlazaNoBuild(8,36,1,false),false);
  const bridge=BUILD_ITEMS['build-covered-bridge'];
  const placed=[{id:'bridge',itemId:bridge.id,x:0,z:60,y:0,yaw:0,scale:1}];
  assert.equal(canPlaceProp(bridge,0,64,1,placed,0,null,[],0).ok,true);
  assert.equal(canPlaceProp(bridge,0,64,1,placed,0,null,[],Math.PI/2).ok,false);
});

test('原生和自建凉亭都允许从柱间通行，屋顶及台基提供支撑',()=>{
  const parts=propCollisionParts({id:'test',itemId:'pack-pavilion',x:3,z:29,y:0,yaw:0,scale:1});
  assert.ok(parts.some(b=>b.name?.endsWith('roof')));
  assert.ok(parts.some(b=>b.name?.endsWith('floor')));
  assert.ok(!parts.some(b=>b.min[0]<=3&&b.max[0]>=3&&b.min[2]<=29&&b.max[2]>=29&&b.min[1]<=.5&&b.max[1]>=.5));
});

test('旧港河床中的农床迁到岸上一次，作物键和设施状态仍指向它',()=>{
  const life=freshLife(),home=ensureHome(life);
  const bed={id:'legacy',itemId:'farm-bed-wood',x:-6.4,y:2,z:-7,yaw:.7,scale:1};
  home.placed.push(bed);home.souvenirSlots.legacy='kept';life.plots['home-plot-legacy']={crop:'seed-radish',planted:1,grown:0,watered:1};
  assert.equal(settleLegacyGarden(home),true);
  assert.equal(home.placed[0],bed);assert.ok(bed.y>-.45);assert.ok(Math.hypot(bed.x+6.4,bed.z+7)>2);
  assert.equal(home.souvenirSlots.legacy,'kept');assert.equal(life.plots['home-plot-legacy'].crop,'seed-radish');
  const copy=structuredClone(bed);assert.equal(settleLegacyGarden(home),false);assert.deepEqual(bed,copy);
});
