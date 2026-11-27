import test from 'node:test';
import assert from 'node:assert/strict';
import {workshops} from '../content/turning-season';
import {Workshop,outlet} from '../src/templates/turning-season';
import {instruments,InstrumentPlay} from '../src/templates/season-instruments';
import {days} from '../content/registry';
import {gatesFor,gateContains} from '../src/game/mode-gates';

for(const [id,design] of Object.entries(workshops))test(id+' 的工作台可通关、可接续',()=>{
  for(let seed=0;seed<40;seed++){
    const s=new Workshop(design.kind),dt=1/(30+seed);
    s.tick(dt,-3,2,s.needsPin,false);
    if(s.needsPin){assert.equal(s.step,1);s.tick(dt,0,0,false,false);s.operate(...s.target);assert.equal(s.step,1);s.tick(dt,0,0,true,false);}
    if(s.kind==='shadow'){s.operate(3,2.5);assert.equal(s.errors,1);s.operate(...s.target);s.operate(...s.target);}
    if(s.kind==='spring'){s.operate(...outlet);assert.equal(s.errors,1);s.operate(-1.95,-.3);s.operate(-1.95,-.3);s.operate(1.95,-.3);s.operate(...outlet);}
    if(s.kind==='tea'){s.operate(...s.target);while(s.step<4)s.tick(dt,...s.target,false,false);s.tick(dt,...s.target,false,true);}
    if(s.kind==='dove'){for(let i=0;i<4/dt&&s.step<4;i++)s.tick(dt,...s.target,true,false);s.operate(...outlet);}
    if(s.kind==='press'){s.operate(...s.target);s.operate(...s.target);s.operate(...s.target);s.operate(...s.target);
      s.tick(dt,3,1,true,false);assert.equal(s.progress,0);
      for(let x=-3;x<3.15;x+=.1)s.tick(dt,x,1.05,true,false);}
    assert.equal(s.finishing,true);assert.ok(s.target.every(Number.isFinite));for(let t=0;t<2.55;t+=dt)s.tick(dt,0,0,true,false);assert.equal(s.done,true);
  }
});
for(const [id,spec] of Object.entries(instruments))test(id+' 机关四十种入场相位均能完成',()=>{
  const day=id.slice(0,4),gates=gatesFor(days[day]);assert.ok(gates.slice(1).some(g=>gateContains(g,id)));
  for(let i=0;i<40;i++){
    const play=new InstrumentPlay(spec,i),dt=1/(32+i);
    if(spec.type==='register'){play.act();assert.equal(play.errors,1);while(play.dx)play.nudge(-Math.sign(play.dx),0);while(play.dy)play.nudge(0,-Math.sign(play.dy));play.act();}
    if(spec.type==='trace'||spec.type==='release'){play.act(0,0);assert.equal(play.index,0);for(const p of spec.points){if(spec.type==='trace')play.move(...p);else play.act(...p);}}
    if(spec.type==='catch'||spec.type==='rally')for(let t=0;t<35&&!play.done;t+=dt){
      if(spec.type==='rally')play.move(0,play.ballY);
      else if(Math.abs(play.cursor-spec.points[play.index][0])<14)play.act();
      play.tick(dt);
    }
    assert.equal(play.done,true);
  }
});
