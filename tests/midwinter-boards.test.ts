import test from 'node:test';
import assert from 'node:assert/strict';
import {JanuaryDefense} from '../src/templates/january-defense';
import {DefenseControl} from '../src/templates/season-defense';
import {createBoard,hint,swap} from '../src/templates/mode-match';
import {machineContact,machineGoals} from '../src/templates/season-match';
import {instruments,InstrumentPlay} from '../src/templates/season-instruments';
import {midControls,type MidDay} from '../src/templates/midwinter-defense';

for(const day of Object.keys(midControls) as MidDay[]){
 test(day+' 六轮迁塔经过四十个独立种子和中段重试',()=>{
   for(let seed=0;seed<40;seed++){
     const g=new JanuaryDefense(day,'midwinter-'+seed);
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
     const b=createBoard(day,'midwinter-'+seed);
     while(b.moves&&b.stage<3){
       let m=hint(b);assert.ok(m);
       if(b.stage===1&&!b.branch&&['1212','1213','1216'].includes(day)){
         m=day==='1212'?(seed%2?[45,44]:[18,19]):seed%2?[37,36]:day==='1216'?[26,34]:[26,27];
       }
       assert.ok(swap(b,...m));
     }
     assert.equal(b.stage,3,day+'/'+seed);
     if(['1212','1213','1216'].includes(day))assert.equal(b.branch,seed%2?2:1);
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
test('五种机关按蓄水、水位、标记、底片和同路线双目标分别改变真实来流',()=>{
 const p=(route:number,distance:number)=>({route,distance,work:4,speed:1,connected:false,slow:0,lit:false});
 const water=new DefenseControl('1212'),a=p(0,2),b=p(0,4);water.beam(0,'water',a);water.operate([a,b],()=>10);assert.equal(a.work,2);assert.equal(b.work,4);
 const aperture=new DefenseControl('1213');aperture.operate([a,p(0,9)],()=>10);assert.equal(a.work,0);
 const land=new DefenseControl('1214');land.beam(1,'wind',b);land.operate([b],()=>10);assert.equal(b.distance,1.6);
 const picture=new DefenseControl('1215'),x=p(0,1),y=p(0,2);picture.operate([x,y],()=>10);assert.ok(y.lit);assert.equal(picture.reserve,1);
 picture.tick(4);picture.operate([x,y],()=>10);assert.equal(picture.reserve,0);assert.equal(x.work,0);
 const time=new DefenseControl('1216'),c=p(0,2),d=p(0,5),other=p(1,9);time.operate([c,other,d],()=>10);assert.equal(c.distance,d.distance);assert.equal(other.work,4);
});
test('页签改变末段配色，空弧切换目标数，海空邮以独立收件格接收',()=>{
 assert.equal(machineGoals('1213',2,1).length,2);assert.equal(machineGoals('1213',2,2).length,1);
 const cells=Array(64).fill(1),coast={day:'1212',stage:2,branch:1,targets:[17,46]};
 machineContact(coast,new Set([17]),[],[],[],[],cells);assert.equal(coast.targets.length,2);coast.branch=2;
 machineContact(coast,new Set([17]),[],[],[],[],cells);assert.deepEqual(coast.targets,[46]);
 const mail={day:'1215',stage:1,targets:[25,29,43]};cells[43]=5;machineContact(mail,new Set([43]),[],[],[],[],cells);assert.deepEqual(mail.targets,[25,29]);
});


test('回到本轮应归还失败试拍的底片，避免重复计入正式成绩',()=>{
 const g=new JanuaryDefense('1215','rewind'),c=g.control!;
 g.start();g.tick(.05);g.operate();assert.equal(c.reserve,1);assert.equal(c.hits,1);
 while(g.phase==='wave')g.tick(.04);
 assert.ok(g.retryCorner());assert.equal(c.reserve,0);assert.equal(c.hits,0);assert.equal(c.count,0);
});
