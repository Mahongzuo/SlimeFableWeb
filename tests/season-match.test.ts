import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoard,hint,swap} from '../src/templates/mode-match';
import {machineContact,machineGoals,matchMachines} from '../src/templates/season-match';
for(const day of Object.keys(matchMachines))test(day+' 专属棋盘能以普通交换走通四十个种子',()=>{
 for(let seed=0;seed<40;seed++){
   const b=createBoard(day,'season-'+seed);
   while(b.stage<3&&b.moves){const move=hint(b);assert.ok(move);assert.ok(swap(b,...move));}
   assert.equal(b.stage,3,day+'/'+seed);if(day==='1201')assert.ok(b.branch===1||b.branch===2);
 }
});
test('船首卸载互锁、雷达轴向和铁路双进路',()=>{
 const b={day:'1127',stage:1,targets:[26,37],branch:0};
 const touch=(...cells:number[])=>machineContact(b,new Set(cells),[cells],[],[]);
 touch(37);assert.deepEqual(b.targets,[26,37]);touch(26,37);assert.deepEqual(b.targets,[37]);
 b.day='1128';b.targets=[26,37];touch(18,26,34);assert.deepEqual(b.targets,[26,37]);touch(25,26,27);assert.deepEqual(b.targets,[37]);
 for(const i of [26,37]){b.day='1201';b.targets=[26,37];b.branch=0;touch(i);assert.equal(b.branch,i===26?1:2);}
 assert.notDeepEqual(machineGoals('1201',2,1),machineGoals('1201',2,2));
});
