import test from 'node:test';
import assert from 'node:assert/strict';
import {JanuaryDefense} from '../src/templates/january-defense';
import {DefenseControl} from '../src/templates/season-defense';
import {createBoard,hint,swap,legalMoves} from '../src/templates/mode-match';
import {machineContact,machineGoals} from '../src/templates/season-match';
import {instruments,InstrumentPlay} from '../src/templates/season-instruments';
import {monthendControls,type MonthendDay} from '../src/templates/monthend-defense';

for(const day of Object.keys(monthendControls) as MonthendDay[]){
 test(day+' 六轮迁塔经过四十个独立种子和中段重试',()=>{
   for(let seed=0;seed<40;seed++){
     const g=new JanuaryDefense(day,'monthend-'+seed);
     for(let wave=0;wave<6;wave++){
       for(let i=0;i<6;i++)g.deploy(i,'remove');
       if(wave===2){g.start();while(g.phase==='wave')g.tick(.04);assert.equal(g.phase,'lost');assert.ok(g.retryCorner());}
       const first=2*Math.floor(wave/2);g.deploy(first,'water');g.deploy(first+1,'wind');g.start();
       for(let n=0;n<1850&&g.phase==='wave';n++){g.tick(.04);if(n%109===0)g.operate();}
       assert.notEqual(g.phase,'lost',day+'/'+seed+'/'+wave);
     }
     assert.ok(g.finish());
   }
 });
 test(day+' 棋盘在四十个种子上可推演并完成两门收尾',()=>{
   for(let seed=0;seed<40;seed++){
     const b=createBoard(day,'monthend-'+seed);
     while(b.moves&&b.stage<3){
       let m=hint(b);assert.ok(m);
       if(b.stage===1&&!b.branch&&['1223','1225','1226','1230','1231'].includes(day)){
         m=seed%2?[37,36]:[26,27];
       }
       assert.ok(swap(b,...m));
     }
     assert.equal(b.stage,3,day+'/'+seed);
     if(['1223','1225','1226','1230','1231'].includes(day))assert.equal(b.branch,seed%2?2:1);
     for(const gate of ['defense','match']){
       const plate=new InstrumentPlay(instruments[day+'-'+gate],seed);
       if(plate.spec.type==='catch')while(Math.abs(plate.cursor-plate.spec.points[0][0])<30)plate.tick(.03);
       plate.act(-100,-100);assert.equal(plate.index,0);
       while(!plate.done){const [x,y]=plate.spec.points[plate.index]??[0,0];
         if(plate.spec.type==='catch')while(Math.abs(plate.cursor-x)>19)plate.tick(.026);
         if(plate.spec.type==='register')plate.nudge(-plate.dx,-plate.dy);
         plate.act(x,y);}
       plate.tick(1.4);assert.equal(plate.settled,1);
     }
   }
 });
}


test('观礼票对旗色，竹节按余量出篮，浮标只后移窗内水花',()=>{
 const p=(id:number,distance=3)=>({id,distance,route:0,speed:1,slow:0,lit:false,work:4,connected:false});
 const tickets=new DefenseControl('1222'),blue=p(0),gold=p(1);tickets.operate([blue,gold],()=>10);assert.equal(blue.work,0);assert.equal(gold.work,4);
 const bear=new DefenseControl('1223'),b=p(0),c=p(1);bear.beam(0,'water',b);bear.operate([b,c],()=>10);assert.equal(b.work,0);assert.equal(c.work,4);assert.equal(bear.reserve,0);
 const buoy=new DefenseControl('1224'),near=p(0,3),far=p(1,7);buoy.focus=1;buoy.operate([near,far],()=>10);assert.equal(near.distance,3);assert.ok(far.distance<5);
});
test('两路驿站、站序交件、两侧灯窗与山坡邮戳根据在途目标决定交付',()=>{
 const p=(id:number,distance:number)=>({id,distance,route:0,speed:1,slow:0,lit:false,work:4,connected:false});
 const relay=new DefenseControl('1225'),r=p(0,3),s=p(1,4);relay.operate([r,p(2,1)],()=>10);assert.equal(r.work,4);
 relay.tick(4);relay.operate([r,s],()=>10);assert.equal(r.work+s.work,0);
 const bags=new DefenseControl('1226'),a=p(0,3),b=p(1,2);bags.operate([b],()=>10);assert.equal(bags.hits,0);
 bags.tick(4);bags.operate([a,b],()=>10);assert.equal(a.work,0);assert.equal(bags.reserve,1);bags.tick(4);bags.operate([b],()=>10);assert.equal(b.work,0);
 const light=new DefenseControl('1227'),near=p(0,3.5),far=p(1,6.6);light.operate([near,far],()=>10);assert.equal(near.work,0);assert.equal(far.work,4);
 light.tick(4);light.operate([far],()=>10);assert.equal(far.work,0);
 const post=new DefenseControl('1228'),front=p(0,6),rear=p(1,2);post.beam(0,'wind',front);post.operate([front],()=>10);assert.equal(front.work,4);
 post.tick(4);post.operate([front,rear],()=>10);assert.equal(front.work,0);assert.ok(rear.lit);
});
test('玉兰两岸不同、温标回温、磁浮承点距正确才入站',()=>{
 const p=(id:number,distance:number)=>({id,distance,route:0,speed:1,slow:0,lit:false,work:4,connected:false});
 const bridge=new DefenseControl('1229'),a=p(0,1);bridge.operate([a],()=>10);bridge.tick(4);bridge.operate([a],()=>10);assert.equal(a.work,4);
 bridge.tick(4);bridge.focus=1;bridge.operate([a],()=>10);assert.equal(a.work,0);
 const clip=new DefenseControl('1230'),b=p(0,3);b.slow=1;clip.beam(0,'wind',b);clip.operate([b],()=>10);assert.equal(b.work,4);
 clip.tick(4);b.slow=0;clip.operate([b],()=>10);assert.equal(b.work,0);
 const mag=new DefenseControl('1231'),f=p(1,8),r=p(0,3);mag.operate([f,r],()=>10);assert.equal(f.work,4);
 mag.tick(4);r.distance=6;mag.operate([f,r],()=>10);assert.equal(f.distance,r.distance);assert.equal(f.work+r.work,0);
});
test('提前点艏舱、错色压山脊和暖窗都不会消耗锁点',()=>{
 const liner={day:'1224',stage:1,targets:[25,29,43]};machineContact(liner,new Set([43]),[[42,43,44]],[],[]);assert.deepEqual(liner.targets,[25,29,43]);
 const relief={day:'1229',stage:1,targets:[43]};const cells=Array(64).fill(3);machineContact(relief,new Set([43]),[],[],[],[],cells);assert.deepEqual(relief.targets,[43]);
 cells[43]=5;machineContact(relief,new Set([43]),[],[],[],[],cells);assert.deepEqual(relief.targets,[]);
 assert.notDeepEqual(machineGoals('1231',2,1),machineGoals('1231',2,2));
});
test('光伏面未接上下一步时重置本层，随后可继续取光',()=>{
 const b=createBoard('1228','trip-light');assert.ok(swap(b,...hint(b)!));assert.equal(b.stage,1);assert.ok(swap(b,26,27));assert.deepEqual(b.targets,[37]);
 const m=legalMoves(b).find(pair=>{const probe=structuredClone(b);swap(probe,...pair);return probe.stage===1&&probe.targets.length===2;});assert.ok(m);assert.ok(swap(b,...m));
 assert.equal(b.levelHold,undefined);while(b.stage===1&&b.moves)assert.ok(swap(b,...hint(b)!));assert.equal(b.stage,2);
});
