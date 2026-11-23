import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Combat,isSelfSkill,skillAimStatus,stopAtMeleeTarget} from '../src/slime/combat';
import {SkillVfxSystem,type SkillEffectCallbacks} from '../src/slime/skill-vfx';
import {SKILL_KITS} from '../src/slime/skills';
import {createWorld} from '../src/slime/world';
import type {Vec} from '../src/slime/types';

const origin:Vec=[0,0,0];
const wallWorld=createWorld({boxes:[{name:'screen',min:[-.2,0,2],max:[.2,4,2.2]}],surfaces:[]});
const blocked=(a:Vec,b:Vec)=>!!wallWorld.cast([a[0],a[1]+.4,a[2]],[b[0],b[1]+.4,b[2]],.01);
function simulation(targets:Vec[],wall=false) {
  const hits:Vec[]=[];
  const vfx=new SkillVfxSystem({THREE,scene:new THREE.Scene()});
  const cb:SkillEffectCallbacks={getTargetPositions:()=>targets,sampleTerrain:()=>0,onSpawnBurst:()=>{},
    onSkillHitArea:p=>hits.push([...p]),blocked:wall?blocked:undefined,
    castWall:wall?(a,b)=>wallWorld.cast(a,b,.055)?.point:undefined};
  return {hits,vfx,cb};
}
test('RPG reticle uses equipped skill reach, occlusion and point-blank burst definitions',()=>{
  assert.equal(skillAimStatus(origin,[0,0,3],SKILL_KITS[5].E,()=>false),'far');
  assert.equal(skillAimStatus(origin,[0,0,3],SKILL_KITS[3].E,()=>false),'ready');
  assert.equal(skillAimStatus(origin,[0,0,3],SKILL_KITS[3].E,blocked),'blocked');
  for(const d of [SKILL_KITS[0].R,SKILL_KITS[0].Q,SKILL_KITS[1].R,SKILL_KITS[2].Q])assert.ok(isSelfSkill(d));
  assert.equal(isSelfSkill(SKILL_KITS[3].Q),false);
});
test('lightning on selected farther opponent and chain ordered from selected opponent',()=>{
  const nearer:Vec=[1,0,1],chosen:Vec=[2,0,2];
  const {hits,cb,vfx}=simulation([nearer,chosen]);
  vfx.triggerSkill(SKILL_KITS[3].E,origin,[1,0,1],cb,chosen);
  assert.deepEqual(hits,[chosen]);hits.length=0;
  vfx.triggerSkill(SKILL_KITS[3].R,origin,[1,0,1],cb,chosen);
  assert.deepEqual(hits,[chosen,nearer]);vfx.dispose();
});
test('cast-time projectile travels to previous position; wall stops impact and blast damage',()=>{
  const target:Vec=[0,0,3],{hits,vfx,cb}=simulation([target]);
  vfx.triggerSkill(SKILL_KITS[0].E,origin,[0,0,1],cb,[...target]);
  target[0]=4;
  for(let i=0;i<32;i++)vfx.update(.05,cb);
  assert.equal(hits.length,1);assert.equal(hits[0][0],0);vfx.dispose();
  const cover=simulation([[0,0,3]],true);
  cover.vfx.triggerSkill(SKILL_KITS[0].E,origin,[0,0,1],cover.cb);
  for(let i=0;i<32;i++)cover.vfx.update(.05,cover.cb);
  assert.deepEqual(cover.hits,[]);cover.vfx.dispose();
  const combat=new Combat([[0,0,3]],false);combat.blocked=blocked;
  assert.equal(combat.hitTargetsInRadius(origin,4,0,10,1,()=>{},true),0);
});
test('locked melee respects contact spacing, tangential and retreat movement and re-aims queued swipes',()=>{
  const t:Vec=[0,0,-.8],forward:Vec=[.1,0,-.3],retreat:Vec=[0,0,.3];
  stopAtMeleeTarget(forward,origin,t);
  assert.equal(forward[0],.1);assert.ok(Math.abs(forward[2]+.08)<1e-8);
  stopAtMeleeTarget(retreat,origin,t);assert.deepEqual(retreat,[0,0,.3]);
  const c=new Combat([[0,0,-1]],false);
  c.attack(0,[0,0,-1]);c.nextSwingDirection=()=>[1,0,0];
  for(let i=0;i<120&&c.index===0;i++){
    c.attack(0,[0,0,-1]);
    c.update(.015,origin,i*.015,()=>{});
  }
  assert.equal(c.index,1);assert.deepEqual(c.direction,[1,0,0]);
});
