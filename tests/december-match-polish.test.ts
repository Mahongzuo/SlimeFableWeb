import test from 'node:test';
import * as T from 'three';
import {Kit} from '../src/themes/folio-landmarks';
import {tunnelPortal} from '../src/themes/december-defense';
import assert from 'node:assert/strict';
import {createBoard,hint,swap,legalMoves} from '../src/templates/mode-match';
import {machineContact,crateTone} from '../src/templates/season-match';
for(const day of ['1202','1203','1204','1205','1206'])test(day+' 四十种相邻交换通关',()=>{
 for(let seed=0;seed<40;seed++){
   const b=createBoard(day,'december-'+seed);
   while(b.stage<3&&b.moves){const choice=hint(b);assert.ok(choice);assert.ok(swap(b,...choice));}
   assert.equal(b.stage,3,day+'/'+seed);
 }
});
test('志愿驿站的需求卡同时检查颜色与送达格，先送暖包可走第二条配送线',()=>{
 const b={day:'1205',stage:1,targets:[26,37],branch:0};
 const colors=Array(64).fill(1),right=[29,37,45];
 machineContact(b,new Set(right),[right],[],[],[37,36],colors);assert.deepEqual(b.targets,[26,37]);
 colors[37]=crateTone(1,1);machineContact(b,new Set(right),[right],[],[],[37,36],colors);
 assert.equal(b.branch,2);assert.deepEqual(b.targets,[26]);
});
test('月面发射台半解后空走一步会在本段重新锁回两脚',()=>{
 for(let seed=0;seed<20;seed++){
   const b=createBoard('1203','lock-'+seed);
   while(b.stage===0)swap(b,...hint(b)!);
   for(const m of legalMoves(b)){
     const half=structuredClone(b);swap(half,...m);
     if(half.stage!==1||half.targets.length!==1)continue;
     for(const n of legalMoves(half)){
       const fail=structuredClone(half);swap(fail,...n);
       if(fail.stage===1&&fail.targets.length===2){assert.equal(fail.levelHold,undefined);return;}
     }
   }
 }
 assert.fail('没有找到放开一边后未跟上的局部复位');
});

test('拱券中线可通车，接缝两旁的射线均只穿过前后两层外表面',()=>{
 const m=new T.MeshBasicMaterial(),root=new T.Group(),radius=.78;
 const kit=new Kit({toon:m,lit:m,lamp:m,glass:m,glow:m},'section');
 tunnelPortal(kit,root,0,0,radius,'#aa9878');kit.flush();root.updateMatrixWorld(true);
 const direction=new T.Vector3(1,0,0);
 const strikes=(y:number,z:number)=>new T.Raycaster(new T.Vector3(-2,y,z),direction).intersectObject(root,true);
 assert.equal(strikes(.52,0).length,0);
 for(let i=1;i<14;i++)for(const offset of [-.015,.015]){
   const a=i*Math.PI/14+offset;
   const points=strikes(.94+(radius+.16)*Math.sin(a),(radius+.16)*Math.cos(a)).map(hit=>hit.point.x);
   assert.equal(points.length,2,'接缝 '+i+' / '+offset);
   assert.ok(Math.abs(points[0]+.535)<1e-5&&Math.abs(points[1]-.535)<1e-5);
 }
});
