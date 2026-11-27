import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {Voyage,type VoyageDay} from '../src/templates/december-voyage';
import {rpgConfigFor} from '../src/templates/january-rpg';
import type {Vec} from '../src/slime/types';

const days:VoyageDay[]=['1202','1203','1204','1205','1206'];
for(const day of days)describe(day+' 三段操作',()=>{
  it('40 个种子，两条能力分支，失误从本段重试',()=>{
    for(let seed=0;seed<40;seed++)for(const branch of [0,1]){
      const g=new Voyage(day,String(seed),rpgConfigFor(day));
      const body={guard:!!branch,airborne:!branch,dashing:!branch};
      g.interact(g.layout.warm);g.interact(g.layout.branches[branch]);
      for(let i=0;i<3;i++){
        const start=g.source,end=g.safeSpot;
        if(i===1){for(let j=0;j<3;j++)g.strike([0,0,8],body);assert.equal(g.phase,'lost');g.retry();assert.equal(g.round,i);}
        if(day==='1202')for(let j=0;j<30;j++)g.advance(.04,start,true,false);
        if(day==='1204')while(g.wind>.4)g.advance(.04,start,false,false);
        if(day==='1206'){
          const orbit=(angle:number):Vec=>[start[0]+1.3*Math.cos(angle),0,start[2]+1.3*Math.sin(angle)];
          for(let j=0;j<10;j++){g.advance(.04,orbit(0),false,false);g.advance(.04,orbit(.18),false,false);}
          assert.ok(g.fill<.1,'来回轻蹭一只棘齿不能把吊绳收满');
          for(let j=0;j<40;j++)g.advance(.04,orbit(j/10),false,false);
        }
        g.strike(start,body);assert.equal(g.engaged,true);
        if(day==='1203'){
          g.advance(.04,end,!!branch,false);assert.equal(g.fill,0,'直接到终点会留下未曝光的底片');
          for(let j=0;j<=40;j++){const p=start.map((v,k)=>v+(end[k]-v)*j/40) as Vec;g.advance(.04,p,!!branch,false);}
        }
        if(day==='1202')while(g.wind>.5)g.advance(.04,end,!!branch,false);
        assert.equal(g.strike(end,body),true);
      }
      assert.equal(g.phase,'finale');assert.equal(g.interact(g.layout.end),true);assert.equal(g.phase,'curtain');
    }
  });
});
