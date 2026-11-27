import test from 'node:test';
import assert from 'node:assert/strict';
import {JanuaryDefense} from '../src/templates/january-defense';
import {DefenseControl} from '../src/templates/season-defense';
import {createBoard,hint,swap,legalMoves} from '../src/templates/mode-match';
import {machineContact,machineGoals} from '../src/templates/season-match';
import {instruments,InstrumentPlay} from '../src/templates/season-instruments';
import {yearendControls,type YearendDay} from '../src/templates/yearend-defense';

for(const day of Object.keys(yearendControls) as YearendDay[]){
 test(day+' 六轮迁塔经过四十个独立种子和中段重试',()=>{
   for(let seed=0;seed<40;seed++){
     const g=new JanuaryDefense(day,'yearend-'+seed);
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
     const b=createBoard(day,'yearend-'+seed);
     while(b.moves&&b.stage<3){
       let m=hint(b);assert.ok(m);
       if(b.stage===1&&!b.branch&&['1218','1220'].includes(day)){
         m=seed%2?[37,36]:[26,27];
       }
       assert.ok(swap(b,...m));
     }
     assert.equal(b.stage,3,day+'/'+seed);
     if(['1218','1220'].includes(day))assert.equal(b.branch,seed%2?2:1);
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

test('两跳、湿纸、双方文本、按章分站及净空曝光都作用在在途目标上',()=>{
 const pkt=(id:number,distance:number)=>({id,route:0,distance,work:4,speed:1,connected:false,slow:0,lit:false});
 const d=(day:'1217'|'1218'|'1219'|'1220'|'1221')=>new DefenseControl(day);
 const echo=d('1217'),a=pkt(0,2),b=pkt(1,8);echo.operate([a,b],()=>10);assert.ok(a.lit);assert.equal(b.work,4);
 echo.tick(4);a.distance=6;echo.operate([a,b],()=>10);assert.equal(a.work,0);assert.equal(b.work,4);
 const press=d('1218'),paper=pkt(1,2);press.beam(0,'water',paper);press.operate([paper],()=>10);
 assert.ok(paper.slow>3);assert.ok(press.beam(1,'wind',paper)>0);
 const exchange=d('1219'),blue=pkt(0,2),gold=pkt(1,2);exchange.operate([blue],()=>10);assert.equal(exchange.reserve,1);
 exchange.tick(4);exchange.operate([pkt(2,4)],()=>10);assert.equal(exchange.hits,1);exchange.tick(4);exchange.operate([gold],()=>10);assert.equal(exchange.reserve,0);
 const mail=d('1220'),other=pkt(2,2),station=pkt(4,4);mail.focus=3;mail.operate([other,station],()=>10);assert.equal(station.work,0);assert.equal(other.work,4);
 const cam=d('1221'),sample=pkt(1,3),cloud=pkt(2,4);cam.beam(1,'wind',sample);cam.operate([sample,cloud],()=>10);assert.equal(sample.work,4);
 cam.tick(4);cloud.distance=6;cam.operate([sample,cloud],()=>10);assert.equal(sample.work,0);
});
test('未校时的分轮和未松开的外铰保持上锁，两岸分送改变末段进水口',()=>{
 assert.notDeepEqual(machineGoals('1220',2,1),machineGoals('1220',2,2));
 const clock={day:'1219',stage:1,targets:[26,37]};machineContact(clock,new Set([37]),[[36,37,38]],[],[]);assert.deepEqual(clock.targets,[26,37]);
 const wing={day:'1221',stage:1,targets:[25,29,43]};machineContact(wing,new Set([43]),[[42,43,44]],[],[]);assert.deepEqual(wing.targets,[25,29,43]);
 const archive={day:'1218',stage:1,targets:[26,37]},cells=Array(64).fill(2);machineContact(archive,new Set([26]),[],[],[],[],cells);
 assert.equal(archive.targets.length,2);cells[26]=5;machineContact(archive,new Set([26]),[],[],[],[],cells);assert.deepEqual(archive.targets,[37]);
});

test('已亮晶条若在下一次有效交换中没有接上，原层重开且可就地完成',()=>{
 const b=createBoard('1217','missed-crystal');assert.ok(swap(b,...hint(b)!));assert.equal(b.stage,1);
 assert.ok(swap(b,26,27));assert.deepEqual(b.targets,[37]);
 const miss=legalMoves(b).find(pair=>{
   const probe=structuredClone(b);swap(probe,...pair);return probe.stage===1&&probe.targets.length===2;
 });
 assert.ok(miss);assert.ok(swap(b,...miss));assert.deepEqual(b.targets,[26,37]);assert.equal(b.levelHold,undefined);
 while(b.stage===1&&b.moves)assert.ok(swap(b,...hint(b)!));assert.equal(b.stage,2);
});
