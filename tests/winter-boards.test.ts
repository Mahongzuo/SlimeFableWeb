import test from 'node:test';
import assert from 'node:assert/strict';
import {JanuaryDefense} from '../src/templates/january-defense';
import {DefenseControl} from '../src/templates/season-defense';
import {createBoard,hint,swap} from '../src/templates/mode-match';
import {machineContact} from '../src/templates/season-match';
import {instruments,InstrumentPlay} from '../src/templates/season-instruments';
import {winterControls,type WinterDay} from '../src/templates/winter-defense';

for(const day of Object.keys(winterControls) as WinterDay[]){
 test(day+' 真实塔位可完成四十场六波防守及弯道局部恢复',()=>{
   for(let seed=0;seed<40;seed++){
     const g=new JanuaryDefense(day,'winter-'+seed);
     for(let wave=0;wave<6;wave++){
       for(let i=0;i<6;i++)g.deploy(i,'remove');
       if(wave===2){g.start();while(g.phase==='wave')g.tick(.035);
         assert.equal(g.phase,'lost');assert.ok(g.retryCorner());}
       const pad=2*Math.floor(wave/2);
       g.deploy(pad,'water');g.deploy(pad+1,'wind');g.start();
       for(let frame=0;g.phase==='wave'&&frame<2200;frame++){g.tick(.035);if(frame%131===0)g.operate();}
       assert.notEqual(g.phase,'lost',day+'/'+seed+'/'+wave);
     }
     assert.ok(g.finish());
   }
 });
 test(day+' 四十张棋盘以相邻交换过三段并能完成收尾',()=>{
   for(let seed=0;seed<40;seed++){
     const board=createBoard(day,'winter-'+seed);while(board.stage<3&&board.moves){
       const step=hint(board);assert.ok(step);assert.ok(swap(board,...step));}
     assert.equal(board.stage,3,day+'/'+seed);
     for(const gate of ['match','defense']){
       const plate=new InstrumentPlay(instruments[day+'-'+gate],seed),initial=plate.index;
       if(plate.spec.type==='catch')while(Math.abs(plate.cursor-plate.spec.points[0][0])<=30)plate.tick(.03);
       plate.act(-100,-100);assert.equal(plate.index,initial);
       while(!plate.done){const [x,y]=plate.spec.points[plate.index]??[0,0];
         if(plate.spec.type==='catch')while(Math.abs(plate.cursor-x)>18)plate.tick(.028);
         if(plate.spec.type==='register')plate.nudge(-plate.dx,-plate.dy);
         plate.act(x,y);}
       assert.ok(plate.done);plate.tick(1.5);assert.equal(plate.settled,1);
     }
   }
 });
}
test('双发交班、双级盘与归航书箱锁住次序，展册色签与桥侧线各自验证',()=>{
 for(const day of ['1207','1209','1211']){
   const b={day,stage:1,targets:[26,37]};
   machineContact(b,new Set([36,37,38]),[[36,37,38]],[],[]);assert.deepEqual(b.targets,[26,37]);
   machineContact(b,new Set([18,26,34]),[[18,26,34]],[],[]);assert.deepEqual(b.targets,day==='1211'?[45]:[37]);
 }
 const book={day:'1210',stage:1,targets:[34,21]},cells=Array(64).fill(0),row=[33,34,35];
 machineContact(book,new Set(row),[row],[],[],row,cells);assert.deepEqual(book.targets,[34,21]);
 cells[34]=1;machineContact(book,new Set(row),[row],[],[],row,cells);assert.deepEqual(book.targets,[21]);
 const bridge={day:'1208',stage:1,targets:[26,37],branch:0};
 machineContact(bridge,new Set([37]),[],[],[],[37,36]);assert.equal(bridge.branch,2);
});
test('云签优先级、坡段前后、两塔引航、天区交替与云层邻接均影响活跃目标',()=>{
 const packet=(route:number,distance:number)=>({route,distance,slow:0,work:4,speed:1,connected:false,lit:false});
 const relay=new DefenseControl('1207'),first=packet(0,3),second=packet(0,7);
 relay.beam(0,'wind',first);relay.beam(0,'wind',second);relay.operate([first,second],()=>10);assert.equal(first.work,4);assert.equal(second.work,0);
 const snow=new DefenseControl('1208'),late=packet(0,9);snow.operate([first,late],()=>10);assert.equal(first.slow,3.5);assert.equal(late.slow,0);
 const flight=new DefenseControl('1209'),mist=packet(0,4);flight.operate([mist],()=>10);assert.equal(flight.beam(0,'water',mist),0);flight.beam(1,'wind',mist);assert.equal(flight.beam(0,'water',mist),4);
 const star=new DefenseControl('1210'),north=packet(1,2),south=packet(0,2);star.operate([north,south],()=>10);assert.equal(north.lit,true);assert.equal(south.lit,false);
 const weather=new DefenseControl('1211'),a=packet(0,3),b=packet(0,6);weather.operate([a,b],()=>10);assert.equal(b.lit,false);
 assert.equal(weather.beam(0,'wind',a,[a,b]),1);assert.equal(b.lit,true);
});


test('两层星轨可交叉同开，书箱载重让未入架的稿夹真实下落一行',()=>{
 const orbit={day:'1209',stage:1,targets:[26,37]},a=[18,26,34],b=[36,37,38];
 machineContact(orbit,new Set([...a,...b]),[a,b],[],[]);assert.deepEqual(orbit.targets,[]);
 const suitcase={day:'1211',stage:1,targets:[26,37],branch:0};
 machineContact(suitcase,new Set(a),[a],[],[]);assert.equal(suitcase.branch,1);assert.deepEqual(suitcase.targets,[45]);
 machineContact(suitcase,new Set(b),[b],[],[]);assert.deepEqual(suitcase.targets,[45]);
 const bottom=[44,45,46];machineContact(suitcase,new Set(bottom),[bottom],[],[]);assert.deepEqual(suitcase.targets,[]);
});
