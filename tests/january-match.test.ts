import test from 'node:test';
import assert from 'node:assert/strict';
import {januaryMatches,pressContact} from '../src/templates/january-match';
import {beginEncore,createBoard,hint,HOLE,swap} from '../src/templates/mode-match';

test('云窗、伞索和落点使用不同的重力通道',()=>{
  const layouts=januaryMatches['0114']!.tableaux;
  assert.equal(new Set(layouts.map(t=>t.mask.join(''))).size,3);
  for(const stage of layouts){
    assert.equal(stage.mask.length,8);
    for(const row of stage.mask)assert.equal(row.length,8);
    for(const target of stage.targets)assert.equal(stage.mask[target>>3][target%8],'.');
  }
});

test('给墨必须经过纵线，压辊必须经过横线，十字扫过可同时推进',()=>{
  const h=[[17,18,19]],v=[[10,18,26]];
  assert.equal(pressContact(18,true,h,[],[]),false);
  assert.equal(pressContact(18,true,v,[],[]),true);
  assert.equal(pressContact(18,false,v,[],[]),false);
  assert.equal(pressContact(18,false,h,[],[]),true);
  assert.equal(pressContact(18,true,[],[2],[2]),true);
  assert.equal(pressContact(18,false,[],[2],[2]),true);
  assert.equal(pressContact(19,true,[],[],[2]),false);
});

test('伞索与印辊均可通过玩家合成的特效完成双目标复玩',()=>{
  for(const day of ['0114','0131']){
    const board=createBoard(day,'specials');
    if(day==='0114')swap(board,...hint(board)!);
    assert.equal(board.targets.length,2);
    const stage=board.stage;
    // On the probe, two adjacent rainbow pieces clear the full pair of cords.
    // On the press, two stripes exchanged into the intersection sweep the two marked axes.
    const intersection=(board.targets[1] & ~7)+(board.targets[0]%8);
    board.cells[intersection]=day==='0114'?24:6;
    board.cells[intersection-1]=day==='0114'?24:12;
    assert.ok(swap(board,intersection-1,intersection)?.advanced);
    assert.equal(board.stage,stage+1);
  }
});

test('全年 364 天月度三消棋盘掩码与目标均合法，每关四十个种子真实交换通关且可加演',()=>{
  const allDays=['0101',...Object.keys(januaryMatches).sort()];
  assert.equal(allDays.length,364);
  for(const day of Object.keys(januaryMatches)){
    const layouts=januaryMatches[day]!.tableaux;
    assert.equal(new Set(layouts.map(t=>t.mask.join(''))).size,3,day);
    for(const stage of layouts){
      assert.equal(stage.mask.length,8,day);
      for(const row of stage.mask)assert.equal(row.length,8,day);
      for(const target of stage.targets)assert.equal(stage.mask[target>>3][target%8],'.',day);
    }
  }
  for(const day of allDays){
    for(let i=0;i<40;i++){
      const seed=i?'practice-'+i:day+'-match-v1';
      const board=createBoard(day,seed);
      assert.deepEqual(board,createBoard(day,seed));
      while(board.stage<3&&board.moves){
        for(const target of board.targets)assert.notEqual(board.cells[target],HOLE);
        const m=hint(board);assert.ok(m);assert.ok(swap(board,...m));
      }
      assert.equal(board.stage,3,day+'/'+seed);
      const moves=board.moves;
      beginEncore(board,'replay');
      assert.equal(board.moves,moves+3);
      const pair=hint(board);assert.ok(pair);assert.ok(swap(board,...pair));
    }
  }
});
