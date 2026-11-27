import test from 'node:test';
import assert from 'node:assert/strict';
import {DefenseControl,type DefenseDay} from '../src/templates/season-defense';
import {JanuaryDefense} from '../src/templates/january-defense';

const dates:DefenseDay[]=['1202','1203','1204','1205','1206'];
for(const day of dates)test(day+' 轮次恢复与机关在四十个可达场次上工作',()=>{
 for(let seed=0;seed<40;seed++){
   const play=new JanuaryDefense(day,'december-'+seed);
   for(let wave=0;wave<6;wave++){
     const index=2*Math.floor(wave/2);
     for(let i=0;i<6;i++)play.deploy(i,'remove');
     if(wave===2){
       play.start();while(play.phase==='wave')play.tick(.04);
       assert.equal(play.phase,'lost');assert.ok(play.retryCorner());
     }
     play.deploy(index,'water');play.deploy(index+1,'wind');play.start();
     let clock=0;
     while(play.phase==='wave'&&clock++<1800){play.tick(.04);if(clock%111===0)play.operate();}
     assert.notEqual(play.phase,'lost',day+'/'+wave+'/'+seed);
   }
   assert.ok(play.finish());
 }
});
test('接力、洞口交替、近远灯带、缓存、对接五种中段有不同作用条件',()=>{
 const packet=(route:number,distance:number,slow=0)=>({route,distance,slow,work:3,speed:1,connected:false,lit:false});
 const relay=new DefenseControl('1202'),p=packet(0,3);relay.active=2;relay.linked=true;
 relay.beam(0,'wind',p);assert.equal(relay.beam(1,'water',p),2);assert.equal(relay.beam(2,'water',p),0);
 const train=new DefenseControl('1203'),east=packet(1,2),west=packet(0,2);train.operate([east,west],()=>10);
 assert.equal(east.slow,0);assert.ok(west.slow>3);
 const light=new DefenseControl('1204'),far=packet(0,8),near=packet(0,2);light.focus=1;light.operate([near,far],()=>10);
 assert.equal(near.lit,false);assert.equal(far.lit,true);
 const queue=new DefenseControl('1205'),one=packet(0,1),two=packet(1,4);
 queue.beam(0,'wind',one);queue.operate([one,two],()=>10);assert.equal(one.work,0);assert.equal(two.work,3);assert.equal(queue.reserve,0);
 const grab=new DefenseControl('1206'),still=packet(0,4,2),early=packet(0,1,1),rolling=packet(1,7);
 grab.operate([early,still,rolling],()=>10);assert.equal(still.work,0);assert.equal(early.work,3);assert.equal(rolling.work,3);
});
