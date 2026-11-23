import test from 'node:test';
import assert from 'node:assert/strict';
import {Save} from '../src/game/save';
import {atlasLevels} from '../content/atlas';
import {octoberLevels} from '../content/october';
import {novemberLevels} from '../content/november';
import {decemberLevels} from '../content/december';
import {days} from '../content/registry';
import {levels} from '../content/levels/registry';
import {abilityLevels,mechanics} from '../content/ability';
import {abilityLayout,initialState,observe,operate,requestRecall,type Signals} from '../src/templates/ability';
import type {ShotView,Vec} from '../src/slime/types';

test('全年登记、历史存档 ID、双门排序与每月能力覆盖',()=>{
  assert.equal(Object.keys(days).length,366);assert.equal(Object.keys(levels).length,644);
  assert.equal(abilityLevels.length,274);
  const old=Object.values(levels).filter(s=>s.template!=='ability');
  assert.equal(old.length,370);
  for(const s of old)assert.ok(days[s.id.slice(0,4)].chapters.some(c=>c.id===s.id&&c.status==='web'));
  for(let month=1;month<=9;month++){
    const rows=abilityLevels.filter(s=>Number(s.id.slice(0,2))===month);
    assert.deepEqual(new Set(rows.map(s=>s.mode)),new Set(Object.keys(mechanics)));
  }
  assert.deepEqual(days['0815'].chapters.slice(0,2).map(c=>c.id),['0815-1920','0815-1985']);
  assert.equal(days['0815'].chapters.filter(c=>c.status==='ue').length,4);
});

test('旧版 370 个存档 ID 经读取、完成新关、写回和再读仍然逐一对应',()=>{
 const legacy=[...atlasLevels,...octoberLevels,...novemberLevels,...decemberLevels].map(s=>s.id);
 legacy.push('0815-1920','1001-1949','1112-1866','1112-1936','1112-1954','1112-1980','1112-2014','1116-1974');
 const ids=[...new Set(legacy)];assert.equal(ids.length,370);
 let encoded=JSON.stringify({v:1,visited:ids,completed:ids,souvenirs:ids,selectedDay:'0815'});
 const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 try{
   Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>encoded,setItem:(_:string,v:string)=>{encoded=v}}});
   const save=new Save();save.add('completed','0815-1985');const roundTrip=new Save();
   for(const id of ids){assert.ok(levels[id],id);assert.ok(roundTrip.data.completed.includes(id)&&roundTrip.data.souvenirs.includes(id),id);}
   assert.equal(roundTrip.data.completed.length,371);assert.equal(roundTrip.data.selectedDay,'0815');
 }finally{if(old)Object.defineProperty(globalThis,'localStorage',old);else Reflect.deleteProperty(globalThis,'localStorage');}
});
const shot=(center:Vec,phase:ShotView['phase']='active',id=1):ShotView=>({center,phase,id,radius:.16,age:0,mergeProgress:0});
for(const s of abilityLevels)test(s.id+' '+s.mode+' 正向与缺失能力',()=>{
 const [first,second,...extra]=days[s.id.slice(0,4)].chapters.filter(c=>c.status==='web');
 assert.equal(extra.length,0);assert.equal(second.id,s.id);assert.notEqual(first.year,second.year);assert.notEqual(first.event,second.event);
 assert.match(s.source,/^https:\/\//);assert.equal(levels[s.id],s);
 const l=abilityLayout(s),p=initialState();
 const a:Signals={position:l.end,element:s.element,spread:0,swimming:false,clinging:false,shots:[],hits:0,hitElement:-1,combo:-1};
 const tick=()=>observe(s,l,p,a),press=()=>operate(s,l,p,a);
 tick();assert.equal(press(),false);assert.equal(p.ready,false);
 switch(s.mode){
 case 'relay':
   for(const invalid of [shot(l.pads[0],'flying'),shot(l.first)]){a.shots=[invalid];tick();assert.equal(p.contact[0],false);}
   a.position=l.spawn;a.shots=[shot(l.pads[0])];tick();a.position=l.end;tick();assert.equal(p.step,1);
   a.shots=[];tick();assert.equal(p.step,0);
   a.position=l.spawn;a.shots=[shot(l.pads[0])];tick();a.position=l.end;tick();
   a.element=(s.element+1)%6;press();assert.equal(p.step,1);a.element=s.element;press();assert.equal(p.step,2);
   a.shots=[];tick();assert.equal(p.ready,false);
   a.shots=[shot(l.pads[0])];tick();requestRecall(p,a);a.shots=[];tick();break;
 case 'combo':
   a.combo=0;a.hitElement=s.element;tick();assert.equal(p.step,0);
   a.hits++;a.hitElement=(s.element+1)%6;tick();assert.equal(p.step,0);
   a.hits++;a.hitElement=s.element;tick();a.combo=1;tick();assert.equal(p.ready,false);
   a.hits++;tick();break;
 case 'climb':
   a.position=l.end;press();assert.equal(p.ready,false);
   a.clinging=true;tick();a.clinging=false;a.element=(s.element+1)%6;press();assert.equal(p.ready,false);
   a.element=s.element;press();break;
 case 'circuit':
   a.position=l.first;press();assert.equal(p.step,0);
   a.element=(s.element+1)%6;press();a.position=l.end;a.spread=1;press();assert.equal(p.ready,false);
   a.element=s.element;a.spread=0;press();assert.equal(p.ready,false);a.spread=1;press();break;
 case 'tide':
   a.position=l.first;a.element=0;press();assert.equal(p.step,0);a.element=1;press();
   a.position=l.buoy[0];a.element=0;tick();assert.equal(p.step,1);a.swimming=true;a.element=2;tick();assert.equal(p.step,1);
   a.element=0;tick();a.position=l.buoy[1];tick();a.position=l.end;press();break;
 case 'duet':
   a.shots=[shot(l.pads[0]),shot(l.pads[1],'returning',2)];for(const v of l.marks){a.position=v;tick();}
   assert.equal(p.flowers,0);a.shots[1]=shot(l.pads[1],'active',2);for(const v of l.marks){a.position=v;tick();}break;
 }
 assert.equal(p.ready,true);a.position=l.spawn;assert.equal(press(),false);a.position=l.end;assert.equal(press(),true);
});
