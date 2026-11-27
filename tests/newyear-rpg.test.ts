import test from 'node:test';
import assert from 'node:assert/strict';
import {newyearVoyages,NewyearVoyage,type NewyearDay} from '../src/templates/newyear-voyage';
import {rpgConfigFor} from '../src/templates/january-rpg';
for(const day of Object.keys(newyearVoyages) as NewyearDay[])test('一月'+day+' 四十种子、双路线、就地挽回',()=>{
 for(let i=0;i<40;i++)for(const branch of [0,1]){
  const b=new NewyearVoyage(day,'seed'+i,rpgConfigFor(day)),body={guard:true,airborne:false,dashing:false};
  b.interact(b.layout.warm);b.interact(b.layout.branches[branch]);b.strike(b.source,body);
  for(let n=0;n<3;n++){
   if(day!=='0102'&&n===1){for(let j=0;j<3;j++)b.strike([0,0,8.1],body);assert.equal(b.phase,'lost');b.retry();assert.equal(b.round,1);}
   if(!b.engaged)b.strike(b.source,body);
   if(day==='0102'){
     if(!b.fill)b.advance(.04,b.middle,false,false);
     if(n===0){while(Math.abs(b.kickX)<2.12)b.advance(.05,b.safeSpot,false,false);assert.equal(b.strike(b.safeSpot,body),false);assert.equal(b.wide,1);assert.equal(b.health,3);assert.equal(b.engaged,true);}
     for(let k=0;k<330&&(Math.abs(b.kickX)>.63||b.shot&&b.shot.age<.83);k++)b.advance(.04,b.safeSpot,false,false);
   }else if(day==='0103'){
     if(branch){b.advance(.05,b.middle,false,false);assert.equal(b.steps,0);b.syncAnchor([{phase:'active',center:b.anchorSpot}]);}
     for(let k=0;k<3;k++)b.advance(.05,b.middle,!branch,false);
   }else if(day==='0104'){
     for(let k=0;k<180&&!b.fill;k++)b.advance(.05,b.middle,true,false);
     for(let k=0;k<330&&!b.windReady;k++)b.advance(.04,b.safeSpot,false,false);
   }else if(b.passage){
     for(let j=0;j<b.passage.points.length;j++){
       const point=b.middle,mode=b.nextCapture?.mode;
       if(mode==='jump'||mode==='flat'){b.advance(.045,point,false,false);assert.equal(b.steps,j);}
       if(mode==='jump')point[1]=.62;
       for(let k=0;k<340&&b.steps<=j;k++)b.advance(.045,point,mode==='flat',false);
       assert.ok(b.steps>j,b.hint);
     }
     for(let k=0;k<330&&!b.windReady;k++)b.advance(.04,b.safeSpot,false,false);
   }else{
     for(let k=0;k<340&&b.displacement<.96;k++)b.advance(.04,b.middle,true,false);
     b.strike(b.middle,body);
   }
   assert.equal(b.fill,1);assert.ok(b.strike(b.safeSpot,body),b.hint);
  }
  assert.equal(b.phase,'finale');b.interact(b.layout.end);assert.equal(b.phase,'curtain');
 }
});
