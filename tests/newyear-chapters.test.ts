import assert from 'node:assert/strict';
import test from 'node:test';
import {NewyearRun,newyearChapters} from '../src/templates/newyear-chapters';
import {JanweekRun,isJanweek} from '../src/templates/janweek-chapters';
import {levels} from '../content/levels/registry';
import {atlasCourse} from '../src/templates/atlas';
import {generateChronicle} from '../src/templates/chronicle';
type Point=[number,number];
for(const id of Object.keys(newyearChapters).filter(id=>!isJanweek(id)))test(id+' 四十个起始相位、两侧次序、错误校验与手动收尾',()=>{
 const chapter=levels[id],n=chapter.template==='chronicle'?generateChronicle(chapter).pickups.length:chapter.template==='atlas'?atlasCourse(chapter).gates.length:0;
 for(let seed=0;seed<40;seed++)for(const chosen of [0,1]){
   const s=new NewyearRun(id,seed,n),a=s.sites,op=1-chosen;let spread=0,air=false,pin=false,el=0;
   const tick=(p:Point,dt=.025)=>s.tick(dt,...p,spread,air,pin);
   const wait=(p:Point,condition:()=>boolean)=>{for(let i=0;i<1000&&!condition();i++)tick(p);assert.ok(condition(),id+' '+s.step);};
   const act=(p:Point)=>{tick(p);s.act(...p,air,el);};
   s.act(6,6,false,0);assert.equal(s.step,0);assert.ok(s.errors);
   if(s.spec.pin){pin=true;tick(s.spec.pin);}
   const collect=s.story==='classroom'||chosen===0;
   if(collect){air=true;for(const p of s.collectibles.slice(0,n))tick(p);air=false;assert.equal(s.marks.size,n);}
   const gauge=(i:number)=>{spread=0;act(a[i]);spread=1;wait(a[i],()=>s.matched);act(a[i]);};
   const jump=(p:Point)=>{spread=0;air=true;act(p);air=false;};
   switch(s.story){
   case 'slides':el=4;act(a[chosen]);assert.equal(s.mask,0);el=chosen;act(a[chosen]);el=op;act(a[op]);spread=1;wait(a[2],()=>s.inFocus);act(a[2]);break;
   case 'flyby':act(a[chosen]);spread=1;wait(a[chosen],()=>s.window(chosen));act(a[chosen]);spread=0;wait(a[op],()=>s.window(op));jump(a[op]);break;
   case 'lamps':el=0;act(a[chosen]);assert.equal(s.step,1);el=4;act(a[chosen]);act(a[2]);pin=false;tick(a[2]);break;
   case 'classroom':gauge(chosen);gauge(op);break;
   case 'typewood':spread=1;act(a[chosen]);jump(a[2+chosen]);tick(a[2+op]);spread=1;act(a[op]);break;
   case 'courtyard':act(a[0]);assert.equal(s.step,0);el=3;act(a[0]);spread=1;act(a[chosen+2]);el=2;act(a[1]);assert.equal(s.step,2);
     spread=0;tick(s.inkPoint);assert.equal(s.count,0);spread=1;tick(s.inkPoint);el=3;act(a[1]);assert.equal(s.step,2);el=2;act(a[1]);break;
   case 'lift':for(const i of [chosen,op]){spread=i?0:1;wait(a[i],()=>s.window(i));air=!!i;act(a[i]);air=false;}break;
   case 'lever':gauge(chosen);gauge(op);jump(a[2]);break;
   case 'strand':act(a[chosen]);jump(a[2+chosen]);spread=1;tick([0,-.68]);act(a[2+op]);act(a[op]);break;
   }
   assert.ok(s.ready,JSON.stringify({id,seed,chosen,step:s.step}));assert.equal(s.chosen,chosen);assert.equal(s.end,-1);
   s.act(6,6,false,el);assert.equal(s.end,-1);act(s.spec.finish);tick(s.spec.finish,1.95);assert.ok(s.end>=1.85);
 }
});

for(const id of Object.keys(newyearChapters).filter(isJanweek))test(id+' 四十种子双路线，错误操作保留局部进度',()=>{
 const chapter=levels[id],n=chapter.template==='chronicle'?generateChronicle(chapter).pickups.length:chapter.template==='atlas'?atlasCourse(chapter).gates.length:0;
 for(let seed=0;seed<40;seed++)for(const chosen of [0,1]){
   const run=new JanweekRun(id,seed,n),a=run.sites,other=1-chosen;
   let spread=0,air=false,element=0,pin=false;
   const tick=(p:Point,dt=.025)=>run.tick(dt,...p,spread,air,pin,element);
   const at=(p:Point)=>{tick(p);run.act(...p,air,element);};
   const wait=(p:Point,when:()=>boolean)=>{for(let i=0;i<650&&!when();i++)tick(p);assert.ok(when(),id+' '+run.step);};
   const jump=(p:Point)=>{spread=0;air=true;at(p);air=false;};
   const steady=(p:Point)=>{spread=1;wait(p,()=>run.onMark);at(p);};
   run.act(6,6,false,element);assert.equal(run.step,0);
   if(run.spec.requiredMarks){
     assert.equal(n,5);
     pin=true;tick(run.spec.pin!);assert.equal(run.step,0);
     air=true;for(const p of run.collectibles.slice(0,n))tick(p);air=false;
     assert.equal(run.marks.size,n);
   }
   if(run.spec.pin){pin=true;tick(run.spec.pin);assert.equal(run.step,1);}
   switch(run.lastStory){
    case 'translation':
      assert.equal(run.marks.size,0);
      assert.deepEqual(run.goal,a[0]);assert.deepEqual(run.alternative,a[1]);
      at(run.spec.finish);assert.equal(run.step,0);
      at(a[chosen]);assert.equal(run.mask,1<<chosen);assert.equal(run.step,1);
      assert.deepEqual(run.goal,a[other]);assert.equal(run.alternative,undefined);
      assert.match(run.hint[0],/1\/2$/);
      at(a[chosen]);assert.equal(run.step,1);
      at(a[other]);assert.equal(run.mask,3);assert.deepEqual(run.goal,run.spec.finish);
      assert.equal(run.marks.size,0);break;
    case 'telegraph':
      steady(a[chosen]);spread=1;at(a[2]);assert.equal(run.mask,1<<chosen);steady(a[other]);jump(a[2]);break;
    case 'ferry':
      spread=1;at(a[chosen]);assert.equal(run.count,1);
      jump(a[2+other]);assert.equal(run.step,1);jump(a[2+chosen]);spread=1;
      wait(a[4],()=>run.aligned);at(a[4]);break;
    case 'survey':
      at(a[chosen]);assert.equal(run.checks,1);assert.equal(run.step,0);element=1;at(a[chosen]);
      spread=1;tick(a[2+chosen]);assert.equal(run.count,0);element=0;
      tick(a[2+chosen]);assert.equal(run.count,1);tick(a[2+other]);at(a[4]);break;
    case 'inkstone':
      spread=1;at(a[chosen]);steady(a[2]);jump(a[chosen]);assert.equal(run.step,2);jump(a[other]);break;
    case 'islands':
      at(a[chosen]);spread=1;at(a[2+chosen]);assert.equal(run.step,2);jump(a[2+other]);break;
    case 'lobster':
      spread=1;wait(a[chosen],()=>run.scan(chosen));at(a[chosen]);assert.equal(run.count,1);spread=0;
      at(a[2]);assert.equal(run.step,2);wait(a[other],()=>run.scan(other));jump(a[other]);at(a[2]);break;
    case 'silverplate':
      at(a[chosen]);assert.equal(run.step,1);steady(a[chosen]);element=4;
      at(a[2]);assert.equal(run.step,2);element=0;at(a[2]);break;
    case 'dispatch':
      at(a[chosen]);assert.equal(run.checks,1);element=2+chosen;at(a[chosen]);element=2+other;at(a[other]);
      assert.equal(run.mask,3);steady(a[2]);break;
    case 'penny':
      at(a[chosen]);steady(a[2]);jump(a[other]);assert.equal(run.step,2);jump(a[chosen]);break;
   }
   assert.ok(run.ready,id+' '+seed+' '+chosen);assert.equal(run.chosen,chosen);assert.equal(run.end,-1);
   at([8,8]);assert.equal(run.end,-1);at(run.spec.finish);tick(run.spec.finish,1.95);assert.ok(run.end>=1.85);
 }
});
