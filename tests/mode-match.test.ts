import {beginEncore} from '../src/templates/mode-match';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoard,hint,swap,shuffle,HOLE,COIN,RAINBOW,specialKind,colour,legalMoves} from '../src/templates/mode-match';

for(const day of ['1123','0101','0815']){
 test(day+' 40 种棋盘均可在步数内从真实交换到终场',()=>{
   for(let n=0;n<40;n++){
     const board=createBoard(day,'qa-'+n);const first=JSON.stringify(board);
     assert.equal(swap(board,0,63),null);assert.equal(JSON.stringify(board),first);
     assert.deepEqual(board,createBoard(day,'qa-'+n));
     while(board.stage<3&&board.moves){
       const untouched=structuredClone(board),move=hint(board);assert.ok(move);
       assert.deepEqual(board,untouched);
       assert.ok(legalMoves(board).some(([a,b])=>a===move[0]&&b===move[1]));
       const animated=structuredClone(board);
       assert.ok(swap(board,...move));assert.ok(swap(animated,...move,true));assert.deepEqual(board,animated);
     }
     assert.equal(board.stage,3,day+' seed '+n);
   }
 });
}
test('船闸开区、无效交换、洗牌和落币',()=>{
 const canal=createBoard('0815','daily');
 const original=canal.cells.filter(i=>i===HOLE).length;
 swap(canal,...hint(canal)!);
 assert.equal(canal.stage,1);assert.ok(canal.cells.filter(i=>i===HOLE).length<original);
 const board=createBoard('0101','coin');
 const initial=board.cells.indexOf(-2);
 assert.ok(swap(board,initial,initial+1));shuffle(board);
 assert.equal(board.cells.indexOf(-2),initial+1);
});

function plain(seed='rules'){
 const b=createBoard('0101',seed);
 // The sixth colour is reserved for each hand-constructed match.
 b.cells=Array.from({length:64},(_,i)=>((i%8)+2*(i>>3))%5);
 b.targets=[63];return b;
}
function pattern(squares:number[],source:number,to:number){
 const b=plain();
 for(const i of squares)b.cells[i]=5;
 [b.cells[source],b.cells[to]]=[b.cells[to],b.cells[source]];
 const r=swap(b,source,to,true);assert.ok(r);
 return r.cascades[0];
}
test('三连、主动四连的两个方向、L 与 T 型、五连及六连',()=>{
 assert.deepEqual(pattern([26,27,28],35,27).created,[]);
 assert.deepEqual(pattern([26,27,28,29],36,28).created,[{at:28,value:17}]);
 assert.deepEqual(pattern([10,18,26,34],27,26).created,[{at:26,value:11}]);
 for(const shape of [[25,26,27,35,43],[25,26,27,34,42]]){
   const corner=shape[3]-8;
   assert.deepEqual(pattern(shape,corner-8,corner).created,[{at:corner,value:23}]);
 }
 for(const shape of [[25,26,27,28,29],[25,26,27,28,29,30]]){
   assert.deepEqual(pattern(shape,35,27).created,[{at:27,value:RAINBOW}]);
 }
});
test('普通与有色特效必须实际连色；无效交换保持完整棋盘',()=>{
 for(const value of [11,17,23]){
   const b=plain();b.cells[27]=value;
   const old=structuredClone(b);
   assert.equal(swap(b,27,28),null);assert.deepEqual(b,old);
   assert.ok(!legalMoves(b).some(([a,c])=>a===27&&c===28));
   b.cells[18]=5;b.cells[20]=5;
   const active=swap(b,27,19,true)!;
   const effect=active.cascades[0],hit=new Set(active.groups[0]);
   if(value===11){assert.deepEqual(effect.sweepRows,[2]);assert.equal(hit.size,8);}
   if(value===17){assert.deepEqual(effect.sweepCols,[3]);assert.equal(hit.size,10);}
   if(value===23){
     assert.deepEqual(effect.blasts,[19]);assert.equal(hit.size,13);
     for(const i of hit)assert.ok(Math.abs((i>>3)-2)+Math.abs(i%8-3)<=2);
   }
 }
});
test('普通棋自己连成三枚时，只激活实际命中的特效',()=>{
 const b=plain();b.cells[27]=11;b.cells[19]=4;b.cells[26]=4;b.cells[28]=4;
 const r=swap(b,19,27,true)!;assert.deepEqual(r.cascades[0].sweepRows,[]);
 assert.ok(!r.groups[0].includes(19));
});
test('双条纹开十字，线爆清连续四排，双爆清 5×5',()=>{
 for(const [a,c,rows,cols] of [[6,7,[3],[4]],[12,14,[3],[4]],[7,13,[3],[4]],
   [8,19,[2,3,4,5],[]],[18,14,[],[3,4,5,6]]] as const){
   const b=plain();b.cells[27]=a;b.cells[28]=c;
   const r=swap(b,27,28,true)!;assert.deepEqual(r.cascades[0].sweepRows,rows);assert.deepEqual(r.cascades[0].sweepCols,cols);
   assert.equal(r.groups[0].length,rows.length===1?15:32);
 }
 const b=plain();b.cells[27]=19;b.cells[28]=21;
 const r=swap(b,27,28,true)!;assert.deepEqual(r.cascades[0].blasts,[28]);assert.equal(r.groups[0].length,25);
});
test('虹彩不参与普通配色，换普通棋只收该色，双虹清所有凝露并保护洞与硬币',()=>{
 assert.equal(colour(RAINBOW),-1);
 const b=plain();b.cells[27]=RAINBOW;b.cells[28]=2;b.cells[10]=HOLE;b.cells[11]=COIN;
 const r=swap(b,27,28,true)!;const frame=r.frames[0],hits=r.groups[0];
 assert.deepEqual(new Set(hits),new Set(frame.flatMap((v,i)=>v===2||v===RAINBOW?[i]:[])));
 const c=plain();c.cells[27]=c.cells[28]=RAINBOW;c.cells[10]=HOLE;c.cells[11]=COIN;
 const all=swap(c,27,28,true)!;
 assert.equal(all.groups[0].length,62);assert.ok(!all.groups[0].includes(10)&&!all.groups[0].includes(11));
 assert.equal(all.cascades[0].after[10],HOLE);assert.ok(all.cascades[0].after.includes(COIN));
});
test('虹彩加条纹时同色棋按种子生成横或竖，虹彩加爆芯则同时爆炸',()=>{
 for(const value of [6,18]){
   const b=plain('prism');b.cells[27]=RAINBOW;b.cells[28]=value;
   const same=structuredClone(b);const result=swap(b,27,28,true)!;
   assert.deepEqual(swap(same,27,28,true),result);assert.deepEqual(same,b);
   const frame=result.frames[0],wave=result.cascades[0];assert.deepEqual(wave.rainbows,[28]);
   const affected=frame.flatMap((v,i)=>colour(v)===0?[i]:[]);
   if(value===18){assert.deepEqual(new Set(wave.blasts),new Set(affected));}
   else{
     assert.ok(affected.every(i=>['row','column'].includes(specialKind(frame[i]))));
     assert.ok(wave.sweepRows.length&&wave.sweepCols.length);
     assert.deepEqual(new Set(wave.sweepRows),new Set(affected.filter(i=>specialKind(frame[i])==='row').map(i=>i>>3)));
     assert.deepEqual(new Set(wave.sweepCols),new Set(affected.filter(i=>specialKind(frame[i])==='column').map(i=>i%8)));
   }
 }
});
test('连续击中特效，竖线命中爆芯后菱形又击中横线',()=>{
 const b=plain();b.cells[27]=17;b.cells[18]=5;b.cells[20]=5;
 b.cells[43]=18;b.cells[44]=6;b.cells[45]=COIN;
 const result=swap(b,27,19,true)!;
 assert.deepEqual(result.cascades[0].sweepCols,[3]);assert.deepEqual(result.cascades[0].blasts,[43]);
 assert.deepEqual(result.cascades[0].sweepRows,[5]);assert.ok(!result.groups[0].includes(45));
});

test('自然掉落的四连沿自己的线向，交叉的两条线只生成一个爆芯',()=>{
 for(const [seed,moves,step,anchor,value] of [
   [1,[[18,19],[27,35]],1,21,8],
   [49,[[26,27],[34,35]],1,34,12],
   [24,[[18,26],[27,35],[42,43],[19,20],[44,45]],2,21,23]
 ] as const){
   const b=createBoard('0815','nat-'+seed);
   let result=null;
   for(const [from,to] of moves)result=swap(b,from,to,true);
   assert.ok(result);assert.deepEqual(result.cascades[step].created,[{at:anchor,value}]);
   const frame=result.frames[step],tone=colour(value),kind=specialKind(value);
   if(kind==='blast'){
     assert.ok(result.groups[step].some(i=>[i,i-1,i+1,i-8,i+8].every(h=>colour(frame[h])===tone)));
   }else{
     const stride=kind==='row'?1:8;
     assert.ok(result.groups[step].some(i=>[0,1,2,3].every(n=>colour(frame[i+n*stride])===tone)));
   }
 }
});

test('真实下落轨迹重建每次连锁，尊重两闸之间的空位',()=>{
 const b=createBoard('0815','waterlines');
 while(b.moves&&b.stage<3){
   const r=swap(b,...hint(b)!,true)!;
   for(const [index,c] of r.cascades.entries()){
     const before=r.frames[index];
     for(const fall of c.falls){
       assert.ok(fall.rows>0&&fall.rows<9);
       assert.notEqual(c.after[fall.to],HOLE);
       if(fall.spawn)continue;
       const original=fall.to-fall.rows*8;
       const expected=c.created.find(piece=>piece.at===original)?.value??before[original];
       assert.equal(c.after[fall.to],expected);
       for(let j=original;j<=fall.to;j+=8)assert.notEqual(before[j],HOLE);
     }
     if(index+1<r.frames.length)assert.deepEqual(c.after,r.frames[index+1]);
   }
 }
});

test('后两枚硬币必须对准零钱盘，步数用完会停止交换',()=>{
 const b=createBoard('0101','alignment');
 swap(b,...hint(b)!);
 assert.equal(b.stage,1);assert.notEqual(b.cells.indexOf(-2)%8,b.targets[0]%8);
 b.moves=0;
 assert.equal(hint(b),null);assert.equal(swap(b,0,1),null);
});

test('特效生成规则不会挡住起始零钱槽的预设落币路径',()=>{
 for(const n of [77,96,109,134,156]){
   const b=createBoard('0101','stress-'+n);
   while(b.moves&&b.stage<3)assert.ok(swap(b,...hint(b)!));
   assert.equal(b.stage,3);
 }
});

test('保留的两枚分身在换幕和洗牌后仍可用',()=>{
 const b=createBoard('1123','keep-clones');
 const first=hint(b)!;
 swap(b,...first);
 assert.equal(b.stage,1);
 const next=hint(b)!;
 const copy={...b,cells:[...b.cells],targets:[...b.targets]};
 const r=swap(copy,...next)!;
 const used=new Set(r.groups.flat());
 const safe=b.cells.map((v,i)=>({v,i})).filter(({v,i})=>v>=0&&!used.has(i)&&!next.includes(i));
 for(const {i} of safe.slice(0,2))b.cells[i]+=6;
 swap(b,...next);
 assert.equal(b.stage,2);
 const count=b.cells.filter(v=>v>=6).length;
 assert.ok(count>=2);shuffle(b);assert.equal(b.cells.filter(v=>v>=6).length,count);
});


test('加演继承剩余步数和分数；提示不消耗道具，每局最多额外七步',()=>{
 for(const day of ['0101','0815','1123']){
   const b=createBoard(day,'qa-0');
   while(b.stage<3)swap(b,...hint(b)!);
   const left=b.moves,score=b.score;
   beginEncore(b,'bonus-0');beginEncore(b,'again');
   assert.equal(b.moves,left+3);assert.equal(b.score,score);
   let turns=0;
   while(b.moves){
     const before=structuredClone(b),pair=hint(b);
     assert.deepEqual(b,before);assert.ok(pair);
     const result=swap(b,...pair);assert.ok(result);turns++;
     assert.ok(turns<=left+7);assert.ok(b.bonus!.drops<=2);
   }
   assert.equal(b.stage,3);assert.ok(b.score>score);assert.equal(hint(b),null);
 }
});
