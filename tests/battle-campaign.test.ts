import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceMission,newMission,type Trigger} from '../src/templates/battle-mission';
import {SkillRuntime} from '../src/slime/skills';

for(const route of ['upper','lower'] as const){
 test(route+' boarding requires a chart, guardian and home delivery',()=>{
  let p=newMission(true);
  const trigger=(event:Trigger)=>{p=advanceMission(p,event);};
  trigger('table');trigger('firstDown');
  assert.equal(p.step,'winch');
  trigger('chart');trigger('guardianDown');trigger('table');
  assert.equal(p.step,'winch');
  trigger('winch');trigger(route);
  assert.equal(p.route,route);
  if(route==='lower')trigger('log');
  trigger('chart');trigger('table');
  assert.equal(p.step,'guardian');
  const checkpoint={...p};
  trigger('guardianDown');
  assert.equal(p.step,'return');
  assert.equal(checkpoint.step,'guardian');
  assert.equal(p.journal,route==='lower');
  trigger('table');
  assert.equal(p.step,'complete');
  assert.equal(advanceMission(p,'table'),p);
 });
}
test('a later side trip can open the locked hatch until delivery',()=>{
 let p=newMission(true);
 for(const event of ['table','firstDown','winch','upper','chart','guardianDown','log'] as const)p=advanceMission(p,event);
 assert.deepEqual(p,{step:'return',route:'upper',journal:true,reward:null});
 assert.equal(advanceMission(p,'log'),p);
});
test('field reward is a single choice before the commander can end the battle',()=>{
 for(const reward of ['heal','power'] as const){
  let p=newMission(false);
  for(const action of ['firstDown','fork','pairDown',reward] as const)p=advanceMission(p,action);
  assert.equal(p.reward,reward);
  for(const action of ['heal','power','pairDown','captainDown'] as const)assert.equal(advanceMission(p,action),p);
  p=advanceMission(p,'gate');
  assert.equal(advanceMission(p,'captainDown').step,'complete');
 }
});
test('retry restores the same energy, switch delay and per-element cooldowns on every attempt',()=>{
 const kit=new SkillRuntime();
 kit.cast(0,'Q');kit.trySwitchElement(0,2);kit.cast(2,'E');kit.step(.2);
 const checkpoint=kit.checkpoint();
 for(let i=0;i<2;i++){
  kit.step(20);kit.cast(3,'R');kit.restore(checkpoint);
  assert.deepEqual(kit.checkpoint(),checkpoint);
  assert.equal(kit.canCast(2,'E').ok,false);
  assert.equal(kit.canCast(3,'R').ok,true);
  assert.equal(kit.canCast(2,'Q').reason,'energy');
 }
});
