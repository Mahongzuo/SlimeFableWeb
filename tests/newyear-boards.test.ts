import test from 'node:test';
import * as T from 'three';
import {Kit} from '../src/themes/folio-landmarks';
import {buildNewyearMatch} from '../src/themes/newyear-match';
import assert from 'node:assert/strict';
import {JanuaryDefense} from '../src/templates/january-defense';
import {DefenseControl} from '../src/templates/season-defense';
import {beginEncore,createBoard,hint,swap} from '../src/templates/mode-match';
import {machineContact,machineGoals,machineAxis} from '../src/templates/season-match';
import {instruments,InstrumentPlay} from '../src/templates/season-instruments';
import {januaryMatches} from '../src/templates/january-match';
import {newyearCell,newyearTone} from '../src/templates/newyear-match';
import {newyearControls,januaryPacketCount,type NewyearDay} from '../src/templates/newyear-defense';

const branchMoves:Record<string,[number,number][]>= {'0103':[[18,19],[21,20]],'0104':[[18,19],[21,20]],'0107':[[26,27],[29,28]],'0110':[[18,19],[45,44]]};
for(const day of Object.keys(newyearControls) as NewyearDay[]){
 test(day+' 六轮迁塔经过四十个独立种子和中段重试',()=>{
   for(let seed=0;seed<40;seed++){
     const g=new JanuaryDefense(day,'newyear-'+seed);
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
   for(let seed=0;seed<40;seed++)for(const route of branchMoves[day]?[-1,0,1]:[-1]){
     const b=createBoard(day,seed?'practice-'+seed:day+'-match-v1');
     while(b.moves&&b.stage<3){
       let m=hint(b);assert.ok(m);
       if(b.stage===1&&!b.branch&&route>=0)m=branchMoves[day][route];
       assert.ok(swap(b,...m));
     }
     assert.equal(b.stage,3,day+'/'+seed);
     if(route>=0)assert.equal(b.branch,route+1);
     beginEncore(b,'replay');
     const encore=hint(b);assert.ok(encore);assert.ok(swap(b,...encore));
     for(const gate of day==='0107'?['match']:['defense','match']){
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



test('双港交替送客，中继必须先标记并在两道铜线之间接收',()=>{
 const ticket=(id:number,distance:number)=>({id,distance,route:0,speed:1,slow:0,lit:false,work:3,connected:false});
 const harbor=new DefenseControl('0102'),blue=ticket(0,2),blueAgain=ticket(2,3),copper=ticket(1,2);
 harbor.operate([blue],()=>10);harbor.tick(5);harbor.operate([blueAgain],()=>10);
 assert.equal(blue.work,0);assert.equal(blueAgain.work,3);harbor.tick(5);harbor.operate([blueAgain,copper],()=>10);assert.equal(copper.work,0);
 const moon=new DefenseControl('0103'),untagged=ticket(0,4),early=ticket(1,2),ready=ticket(2,6),late=ticket(3,8);
 for(const p of [early,ready,late])moon.beam(1,'wind',p);
 moon.operate([untagged,early,ready,late],()=>10);assert.deepEqual([untagged.work,early.work,ready.work,late.work],[3,3,0,3]);
});
test('触读页要一张凸点配一张空白，冰巷选位决定领走的罩色',()=>{
 const ticket=(id:number)=>({id,distance:4,route:0,speed:1,slow:0,lit:false,work:3,connected:false});
 const print=new DefenseControl('0104'),left=ticket(0),right=ticket(1);print.beam(0,'water',left);
 print.operate([left],()=>10);assert.equal(left.work,3);print.tick(5);print.operate([left,right],()=>10);assert.equal(left.work+right.work,0);
 const lamps=new DefenseControl('0105'),cool=ticket(0),warm=ticket(1);lamps.focus=3;
 lamps.operate([cool,warm],()=>10);assert.equal(cool.work,3);assert.equal(warm.work,0);
 lamps.tick(5);lamps.focus=2;lamps.operate([cool],()=>10);assert.equal(cool.work,0);
});
test('旧棋面和步数保留，回声先后、极光镜像、藤架和转角方向各自生效',()=>{
 for(const day of Object.keys(newyearControls) as NewyearDay[]){
   const game=createBoard(day,'layout'),original=januaryMatches[day]!;assert.equal(game.moves,original.moves);
   original.tableaux.forEach((stage,j)=>{assert.deepEqual(machineGoals(day,j),stage.targets);
     for(let i=0;i<64;i++)assert.equal(newyearCell(day,j,i%8,i>>3),stage.mask[i>>3][i%8]==='.');});
 }
 const echo={day:'0102',stage:2,targets:machineGoals('0102',2)};
 const [near,far]=echo.targets;machineContact(echo,new Set([far]),[],[],[far%8]);assert.deepEqual(echo.targets,[near,far]);
 machineContact(echo,new Set([near]),[],[near>>3],[]);machineContact(echo,new Set([far]),[],[],[far%8]);assert.deepEqual(echo.targets,[]);
 assert.equal(newyearTone('0103',2,0,1),1);assert.equal(newyearTone('0103',2,0,2),3);
 assert.equal(machineAxis('0104',2,0,1),'row');assert.equal(machineAxis('0104',2,0,2),'column');
 assert.equal(machineAxis('0105',1,0),'row');assert.equal(machineAxis('0105',2,0),'column');
});

test('转角厂房两片立面的楼板、窗玻璃和顶线实际网格没有共面重叠',()=>{
 const scene=new T.Group(),mat=new T.MeshBasicMaterial();
 const kit=new Kit({toon:mat,lit:mat,glass:mat,glow:mat,lamp:mat},'corner-seam');
 buildNewyearMatch(kit,scene,'0105');kit.flush();scene.updateMatrixWorld(true);
 const corner=scene.children.find(node=>node.children.filter(c=>c instanceof T.Group).length===2)!;
 const bands=corner.children.filter(c=>c instanceof T.Group).map(face=>{
   const bounds:T.Box3[]=[];
   for(const mesh of face.children)if(mesh instanceof T.InstancedMesh){
     const shape=mesh.geometry;shape.computeBoundingBox();
     for(let i=0;i<mesh.count;i++){const instance=new T.Matrix4();mesh.getMatrixAt(i,instance);
       bounds.push(shape.boundingBox!.clone().applyMatrix4(face.matrix.clone().multiply(instance)));}
   }
   return bounds;
 });
 assert.equal(bands.length,2);assert.ok(bands.every(face=>face.length>=65));
 const overlap=(a:number,b:number,c:number,d:number)=>Math.min(b,d)-Math.max(a,c);
 for(const left of bands[0])for(const right of bands[1]){
   if(Math.abs(left.max.y-right.max.y)>1e-5)continue;
   assert.ok(overlap(left.min.x,left.max.x,right.min.x,right.max.x)<1e-5||
     overlap(left.min.z,left.max.z,right.min.z,right.max.z)<1e-5);
 }
});


test('州图快慢窗、白崖风标、孔卡配色、三信号顺序和车站风井由实物条件驱动',()=>{
 const packet=(id:number,distance:number)=>({id,distance,route:0,speed:1,slow:0,lit:false,work:3,connected:false});
 const track=[{total:10}],size=()=>track[0].total;
 const press=(g:DefenseControl,packets:ReturnType<typeof packet>[])=>{g.tick(5);g.operate(packets,size);};
 const waiting=new DefenseControl('0106'),quick=packet(0,3),slow=packet(1,7),early=packet(3,3);
 assert.equal(januaryPacketCount(waiting.day,waiting,[quick,slow,early],track),2);
 assert.ok(waiting.release(0,2,14)!.speed>waiting.release(0,2,15)!.speed);
 press(waiting,[quick,slow,early]);assert.deepEqual([quick.work,slow.work,early.work],[0,0,3]);

 const balloon=new DefenseControl('0107'),incoming=packet(0,4.9),later=packet(1,6.3),late=packet(2,8.5);
 for(const p of [incoming,later,late])balloon.beam(2,'wind',p);
 press(balloon,[incoming,later,late]);assert.deepEqual([incoming.work,later.work,late.work],[0,3,3]);
 balloon.focus=1;press(balloon,[later,late]);assert.deepEqual([later.work,late.work],[0,3]);

 const tabulator=new DefenseControl('0108'),marked=packet(0,2),wrong=packet(2,5),rust=packet(3,4);
 for(const p of [marked,rust])tabulator.beam(2,'water',p);
 press(tabulator,[marked,wrong]);assert.equal(marked.work,3);
 press(tabulator,[marked,wrong,rust]);assert.deepEqual([marked.work,wrong.work,rust.work],[0,3,0]);

 const mixer=new DefenseControl('0109'),music=packet(0,3),call=packet(1,2),browser=packet(2,4);
 press(mixer,[browser,call]);assert.equal(mixer.reserve,0);
 press(mixer,[browser,call,music]);assert.equal(mixer.reserve,1);assert.deepEqual([music.work,call.work,browser.work],[0,3,3]);
 press(mixer,[browser,call]);press(mixer,[browser]);assert.equal(mixer.reserve,0);assert.equal(mixer.hits,3);

 const vent=new DefenseControl('0110'),rear=packet(0,7),leading=packet(1,3),unmarked=packet(2,3);
 for(const p of [rear,leading])vent.beam(3,'wind',p);
 press(vent,[rear,leading,unmarked]);assert.equal(leading.work,0);assert.equal(unmarked.work,3);
 vent.focus=3;press(vent,[rear,unmarked]);assert.equal(rear.work,0);
});

test('海湾与纸带须按方向和次序，琴箱响弦分色，两座分支棋盘可横竖切换',()=>{
 const coast={day:'0106',stage:1,targets:machineGoals('0106',1)};
 const [west,east]=coast.targets;
 machineContact(coast,new Set([east]),[],[],[east%8]);assert.deepEqual(coast.targets,[west,east]);
 machineContact(coast,new Set([west]),[],[],[west%8]);assert.deepEqual(coast.targets,[west,east]);
 machineContact(coast,new Set([west]),[],[west>>3],[]);assert.deepEqual(coast.targets,[east]);
 machineContact(coast,new Set([east]),[],[],[east%8]);assert.deepEqual(coast.targets,[]);
 for(const day of ['0107','0110'] as const){assert.equal(machineAxis(day,2,0,1),'row');assert.equal(machineAxis(day,2,0,2),'column');}
 assert.equal(newyearTone('0108',1,0),5);assert.equal(newyearTone('0108',1,1),1);
 assert.equal(machineAxis('0109',1,0),'row');assert.equal(machineAxis('0109',2,0),'column');
});
