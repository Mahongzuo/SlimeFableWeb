import test from 'node:test';
import assert from 'node:assert/strict';
import {JanuaryDefense} from '../src/templates/january-defense';

test('花车过弯的一团花粉追车尾，及时拦截恢复花色，失守只重试当前轮',()=>{
  const g=new JanuaryDefense('0101','turn');
  for(let i=0;i<2;i++){
    g.deploy(0,'water');g.deploy(1,'wind');g.start();
    while(g.phase==='wave')g.tick(1/30);
  }
  g.start();assert.equal(g.routeFor(0),0);assert.equal(g.routeFor(1),1);
  while(g.errors===0)g.tick(1/30);
  const stain=g.pollen;assert.ok(stain>0);
  g.deploy(2,'water');g.deploy(0,'remove');g.deploy(3,'wind');
  while(g.pollen>=stain && g.phase==='wave')g.tick(1/30);
  assert.ok(g.pollen<stain);
  while(g.phase==='wave')g.tick(1/30);
  g.deploy(1,'remove');g.deploy(2,'remove');g.deploy(3,'remove');
  const saved=g.plates.length;
  g.start();while(g.phase==='wave')g.tick(1/30);
  assert.equal(g.phase,'lost');assert.ok(g.retryCorner());assert.equal(g.plates.length,saved);
  g.start();assert.equal(g.wave,saved);assert.equal(g.retries,1);
});
